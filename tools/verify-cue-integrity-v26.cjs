'use strict';
// Direct state comparison against pinned v25 product sources. Explicit immune
// phase fixtures and native CPU source-cue panels are not natural play/FPS QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const audit=require('./audit-object-projectiles-v24.cjs');
const {ROOT,source,sha,runtime}=audit,BASE='1beed909dfb7217f3b3eda98314dc539d0e3918e';
const FILES=['src/core.js','src/weapon-patterns.js','src/actors.js','src/boss-skills.js','src/projectiles.js','src/story-assets.js','src/media.js','src/render.js','src/app.js','src/storage.js'];
const TICKS=720,SAMPLE_EVERY=60,REPORT='docs/V26-COMBAT-COMPATIBILITY-20261031.json';
const hashes=ref=>Object.fromEntries(FILES.map(file=>[file,sha(source(file,ref))]));
function serialiseWorld(value,counter){
  // No revision, time, RNG, pool, resource, coordinate or event normalization.
  // emissionOrigins is the sole new presentation-only field in v26.
  return JSON.stringify(value,function(key,entry){if(key==='emissionOrigins'){if(counter)counter.removedFields++;return undefined;}return entry;});
}
function legalInput(n,index,phase){
  const s=Math.SQRT1_2,directions=[[1,0],[s,s],[0,1],[-s,s],[-1,0],[-s,-s],[0,-1],[s,-s]],focus=n%180<60;
  const direction=directions[(Math.floor(n/45)+index+phase)%directions.length],distance=focus?2:4;
  return {dx:direction[0]*distance,dy:direction[1]*distance,focus};
}
function phaseWorld(core,bossIndex,phase,difficulty,finalPractice){
  const run=core.createRun({campaign:true,campaignRevision:finalPractice?3:5,combatRevision:25,practiceBoss:true,bossIndex,finalPractice,difficulty,seed:4242,runId:`v26-compat-${bossIndex}-${phase}-${difficulty}-${finalPractice}`});
  const boundary=core.checkpoint(run);boundary.phase=phase;const w=core.restoreCheckpoint(boundary);
  w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
  assert.equal(w.stage,'boss');assert.equal(w.phase,phase);assert.equal(w.player.hp,w.player.maxHp);return w;
}
function compareCore(current,prior){
  const rows=[],counter={removedFields:0},selections=Array.from({length:35},(_,bossIndex)=>({bossIndex,finalPractice:false})).concat({bossIndex:11,finalPractice:true});
  let worldComparisons=0,checkpointComparisons=0;
  for(const selection of selections)for(const phase of [0,1,2])for(const difficulty of ['gentle','normal','hell']){
    const {bossIndex,finalPractice}=selection,w=phaseWorld(current,bossIndex,phase,difficulty,finalPractice),before=phaseWorld(prior,bossIndex,phase,difficulty,finalPractice);
    const label=[bossIndex,phase,difficulty,finalPractice],initialMetadata=counter.removedFields;let comparisons=0,peakBullets=0,peakHazards=0;
    function check(){
      assert.equal(serialiseWorld(w,counter),serialiseWorld(before),'simulation state differs after removing emissionOrigins only: '+label+' tick'+w.tick);worldComparisons++;comparisons++;
      assert.equal(JSON.stringify(current.checkpoint(w)),JSON.stringify(prior.checkpoint(before)),'raw checkpoint differs: '+label+' tick'+w.tick);checkpointComparisons++;
    }
    check();
    for(let n=0;n<TICKS;n++){
      const input=legalInput(n,bossIndex,phase);current.step(w,input);prior.step(before,input);
      assert.equal(w.stage,'boss','controlled immune phase left its checkpoint-selected stage');
      peakBullets=Math.max(peakBullets,w.bullets.length);peakHazards=Math.max(peakHazards,w.hazards.length);
      if((n+1)%SAMPLE_EVERY===0||n===TICKS-1)check();
    }
    rows.push({bossIndex,finalPractice,phase,difficulty,combatRevision:25,seed:4242,ticks:TICKS,endTick:w.tick,worldComparisons:comparisons,checkpointComparisons:comparisons,emissionOriginsFieldsRemovedAtSamples:counter.removedFields-initialMetadata,normalisedWorldSHA256:sha(serialiseWorld(w)),rawCheckpointSHA256:sha(JSON.stringify(current.checkpoint(w))),peakBullets,peakHazards,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,exact:true});
  }
  assert.equal(rows.length,324);assert.equal(worldComparisons,4212);assert.equal(checkpointComparisons,4212);assert(counter.removedFields>0,'the new presentation metadata must be exercised');
  return {rows,summary:{cases:rows.length,campaignCases:315,separateFinalPracticeCases:9,ticksPerCase:TICKS,pairedReplayTicks:rows.length*TICKS,engineStepCallsPerVersion:rows.length*TICKS,totalEngineStepCalls:rows.length*TICKS*2,worldComparisons,rawCheckpointComparisons:checkpointComparisons,emissionOriginsFieldsRemovedAtSamples:counter.removedFields,exactCases:rows.filter(row=>row.exact).length,failedCases:0}};
}
async function panels(current){
  const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]}));
  const priorCue=runtime();vm.runInContext(source('src/boss-skills.js',BASE).toString(),vm.createContext(priorCue),{filename:'pinned-v25-boss-skills.js'});
  const fullPaint=require('./audit-laser-pixels-v23.cjs').fullPaint,cache=new Map(),sources={},rows=[];
  const canvas=createCanvas(1440,1320),ctx=canvas.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const [column,bossIndex]of [21,24].entries()){
    const w=phaseWorld(current.HapilCore,bossIndex,0,'hell',false);for(let n=0;n<127;n++)current.HapilCore.step(w,legalInput(n,bossIndex,0));
    assert(w.boss.identityCasts.some(c=>c.emissionOrigins&&w.tick<c.activeAt));
    const images=await audit.imagesFor(current,bossIndex+1,cache,sources,priorCue);
    for(const [quality,low]of [false,true].entries()){
      const record={bossIndex,phase:0,difficulty:'hell',tick:w.tick,quality:low?'low':'high',worldSHA256:sha(JSON.stringify(w))};
      for(const [side,label,box]of [[0,'V25 cue',priorCue],[1,'V26 cue',current]]){
        const painted=fullPaint(box,images,w,low),metrics=painted.metrics.bossSkillsPresentation;
        assert.equal(painted.metrics.projectilePresentation.missingProjectileAssets,0);assert.equal(metrics.skillMissingAssets,0);
        if(side===1)assert(metrics.skillDetachedDraws>0,'actual complete scene must show detached warning');
        const x=column*720+side*360,y=quality*660;ctx.drawImage(painted.canvas,x,y+20);ctx.fillStyle='#eee';ctx.font='12px sans-serif';ctx.fillText(`${bossIndex===21?'Academy defense':'Workshop links'} ${label} ${low?'LOW':'HIGH'} tick127`,x+8,y+14);
        record[side?'current':'pinnedCueOnly']={pixelSHA256:sha(Buffer.from(painted.canvas.getContext('2d').getImageData(0,0,360,640).data)),bossSkills:metrics};
      }
      assert.notEqual(record.current.pixelSHA256,record.pinnedCueOnly.pixelSHA256);rows.push(record);
    }
  }
  const file='docs/v26-cue-integrity/academy-workshop-before-after.jpg',bytes=canvas.toBuffer('image/jpeg');assert(bytes.length<=1000000);
  fs.mkdirSync(path.dirname(path.join(ROOT,file)),{recursive:true});fs.writeFileSync(path.join(ROOT,file),bytes);
  return {scope:'Same actual current-core immune world at tick127 in both360x640DPR1 full-scene CPU renders. Only boss-skills.js is replaced with pinnedv25 for the comparison; actor/projectile/terrain/renderer sources stay current. Source-art warning position comparison, not human play or mobile/GPU/FPS validation.',cases:rows.length,proof:{path:file,bytes:bytes.length,width:canvas.width,height:canvas.height,sha256:sha(bytes)},sources,rows};
}
async function main(){
  const initial=hashes(),baselineHashes=hashes(BASE),current=runtime(),prior=runtime(BASE),comparison=compareCore(current.HapilCore,prior.HapilCore),visual=await panels(current);
  assert.deepEqual(hashes(),initial,'product sources changed during compatibility audit');
  const report={schema:1,date:'2026-10-31',capturedAt:new Date().toISOString(),baselineCommit:BASE,scope:'Checkpoint-selected deterministic combat-state compatibility fixture. All35campaign configurations×3phases×3difficulties plus separatefinalpractice×3phases×3difficulties. Explicit player immunity999999, automatic attack and skill rotation off. No human/natural campaign completion, ordinary-health clear, browser input, hardware GPU/mobile/FPS claim.',fixture:{combatRevision:25,seed:4242,autoAttack:false,skillRotation:false,playerInvulnerableUntil:999999,input:'Predetermined eight-direction cycle every45ticks, shifted by bossIndex+phase; focus first60of180ticks. Movement supplied at2px/focus or4px/normal per60Hz tick, no world-peeking input.',comparison:'Initial state and every60ticks through720; recursively omit ONLY emissionOrigins from world JSON. Checkpoint JSON compared raw without normalization.',normalisationRemovedFields:['emissionOrigins']},sourceHashes:initial,baselineSourceHashes:baselineHashes,auditToolSHA256:sha(source('tools/verify-cue-integrity-v26.cjs')),sourceHashGuardPassed:true,summary:comparison.summary,rows:comparison.rows,visual};
  fs.writeFileSync(path.join(ROOT,REPORT),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:REPORT,...comparison.summary,proof:visual.proof}));return report;
}
module.exports={BASE,TICKS,SAMPLE_EVERY,serialiseWorld,legalInput,phaseWorld,compareCore,panels,main};
if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
