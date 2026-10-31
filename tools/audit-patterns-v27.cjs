'use strict';
// Independent CPU checks. Explicit immune phase observations are kept separate
// from ordinary-health legal-input attempts and are never called human play.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='3e5fc485f6006016de7bfa972a5b00683ee216ba';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const FILES=['src/core.js','src/boss-patterns-v27.js','src/weapon-patterns.js','src/projectiles.js','src/boss-skills.js','src/storage.js','src/app.js','src/render.js','src/actors.js','src/story-assets.js','src/media.js','index.html','styles.css','tools/audit-patterns-v27.cjs','tests/independent-patterns-v27.test.cjs','tools/probe-identities-v25-natural.cjs','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs'];
function hashes(){return Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));}
function pinnedCore(){const box={module:{exports:{}},require:name=>require(path.join(ROOT,'src',name))};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/core.js'],{cwd:ROOT,encoding:'utf8'}),box);return box.module.exports;}
function world(C,index=0,phase=0,difficulty='normal',revision=27,{immune=true}={}){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:`independent27-${index}-${phase}-${difficulty}`}),boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);assert.equal(w.stage,'boss');assert.equal(w.phase,phase);
  if(immune){w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;}
  return w;
}
function sentinel(w,patch={}){const b={id:++w.idCounter,x:90,y:180,px:90,py:180,vx:0,vy:90,r:4,halfLength:0,angle:Math.PI/2,kind:'orb',age:0,ttl:6.4,ownerId:w.boss.id,grazed:false,...patch};w.bullets.push(b);return b;}
function skillContinuity(C){
  const rows=[];
  for(const name of ['memory','counter','delay','ego']){
    const w=world(C),free=world(C),b=sentinel(w),before=sentinel(free);
    w.skillRotation=true;w.skills.delayReadyAt=1000;
    if(name==='memory')w.memory=24;
    if(name==='counter'){w.memory=68;w.resonance=30;w._lastGraze=w.tick;}
    if(name==='delay'){w.memory=60;w.skills.delayReadyAt=0;}
    if(name==='ego')w.resonance=90;
    const start={x:b.x,y:b.y,age:b.age};C.step(w,{});C.step(free,{});assert.equal(w.stats.casts[name],1,'fixture must activate the real '+name+' skill');w.skillRotation=false;
    for(let n=1;n<24;n++){C.step(w,{});C.step(free,{});assert(w.bullets.some(x=>x.id===b.id),'friendly '+name+' must preserve an existing enemy projectile ID');}
    const slowDistance=Math.hypot(b.x-start.x,b.y-start.y),freeDistance=Math.hypot(before.x-start.x,before.y-start.y);
    assert(slowDistance<freeDistance*.45,'real '+name+' movement must be substantially slower');assert(b.age<before.age*.45,'lifetime must slow with movement');
    rows.push({skill:name,observedTicks:24,sameEnemyBulletId:true,slowDistance,ordinaryDistance:freeDistance,movementRatio:slowDistance/freeDistance,logicalAge:b.age,ordinaryAge:before.age});
  }
  return rows;
}
function retirementContinuity(C){
  const w=world(C),b=sentinel(w,{x:180,y:320,px:180,py:320,vx:0,vy:12,age:6.399,ttl:6.4});C.step(w,{});
  assert(w.bullets.some(x=>x.id===b.id),'on-screen TTL may not abruptly delete a projectile');assert.equal(b.retiring,true,'expired visible projectile enters explicit retirement');
  const hp=w.player.hp;w.player.x=b.x;w.player.y=b.y;w.player.invulnerableUntil=0;C.step(w,{});assert.equal(w.player.hp,hp,'retiring projectile must be harmless');
  let fadeTicks=2;while(w.bullets.some(x=>x.id===b.id)&&fadeTicks<90){C.step(w,{});fadeTicks++;}
  assert(!w.bullets.some(x=>x.id===b.id),'finite retirement cannot accumulate immortal bodies');assert(fadeTicks>=12&&fadeTicks<=60,'retirement must remain visible briefly and finish promptly');
  const contact=world(C),c=sentinel(contact,{x:180,y:540,px:180,py:540,vx:0,vy:0});C.step(contact,{});assert(contact.bullets.some(x=>x.id===c.id),'normal i-frames must not silently erase a touching projectile');contact.player.invulnerableUntil=0;const startHP=contact.player.hp;C.step(contact,{});assert.equal(contact.player.hp,startHP-1);assert(!contact.bullets.some(x=>x.id===c.id),'an actual hit consumes its projectile');
  return {onScreenTTLRetained:true,retiringHarmless:true,finiteFadeTicks:fadeTicks,iframeContactRetained:true,actualHitConsumed:true};
}
function geometricDiversity(C){
  const P=require('../src/boss-patterns-v27.js'),keys=['x','y','angle','speed','r','kind','pauseFrom','pauseUntil','acceleration','accelerateAt','maxSpeed','v27TurnRate','v27TurnUntil','v27WaveRate','v27WavePhase','v27Reflect','v27SplitAt','v27SplitCount','v27SplitSpread','v27ChildSpeed','v27LaneIndex','v27RestLane'];
  const programs=new Map(),rows=[];let pianoVolleys=0;
  for(let index=0;index<35;index++){
    const phases=[];
    for(const phase of [0,1,2]){
      const w=world(C,index,phase,'hell'),beats=[];
      // Every source is pinned at the same location and every pilot at the
      // same target. Boss names, profile IDs and art keys cannot make these
      // signatures unique; only real geometry and flight clocks may do so.
      for(let beat=0;beat<3;beat++){
        const specs=P.makeVolley(w,{x:180,y:130},beat,{phase});assert(specs.length>0&&specs.length<=12);
        const lanes=specs.filter(s=>Number.isInteger(s.v27LaneIndex));if(lanes.length){pianoVolleys++;for(const s of lanes){assert.notEqual(s.v27LaneIndex,s.v27RestLane);assert.notEqual(s.v27LaneIndex,(s.v27RestLane+1)%12);}}
        beats.push(specs.map(s=>keys.map(k=>typeof s[k]==='number'?Math.round(s[k]*1e7)/1e7:s[k]===undefined?null:s[k])));
      }
      phases.push(JSON.stringify(beats));
    }
    assert(new Set(phases).size>=2,'a boss needs actual phase-specific geometry/rhythm '+index);
    const signature=JSON.stringify(phases);assert(!programs.has(signature),'two bosses share the same physical program '+index+'/'+programs.get(signature));programs.set(signature,index);
    rows.push({bossIndex:index,physicalProgramSHA256:sha(signature),distinctPhasePrograms:new Set(phases).size});
  }
  assert(pianoVolleys>0);return {bossConfigurations:35,uniquePhysicalPrograms:programs.size,minimumDistinctPhasePrograms:Math.min(...rows.map(r=>r.distinctPhasePrograms)),pianoVolleys,excludedFromSignature:['boss name','profile ID','asset/source key','identity role'],rows};
}
function phaseMatrix(C,{ticks=1800,bosses=Array.from({length:35},(_,i)=>i),phases=[0,1,2],difficulties=['gentle','normal','hell']}={}){
  const rows=[],allModes=new Set(),allRadii=new Set();let reflected=0,children=0,curved=0,piano=0;
  for(const index of bosses)for(const phase of phases)for(const difficulty of difficulties){
    const w=world(C,index,phase,difficulty),tracked=new Map(),seen=new Set(),splitParents=new Map();let maxBullets=0,maxWarnings=0,maxHazards=0,localCurves=0,localReflections=0,localChildren=0,localPiano=0;
    for(let n=0;n<ticks;n++){
      C.step(w,{});maxBullets=Math.max(maxBullets,w.bullets.length);maxWarnings=Math.max(maxWarnings,(w._identityPlans||[]).length);maxHazards=Math.max(maxHazards,w.hazards.length);
      assert(w.bullets.length<=C.CAPS.bullets&&w.hazards.length<=C.CAPS.hazards,'actual pools stay bounded');assert(maxWarnings<=4,'all committed warnings remain in the existing display budget');
      for(const b of w.bullets){
        assert([b.x,b.y,b.vx,b.vy,b.age,b.r,b.angle].every(Number.isFinite),'actual motion must remain finite');assert(b.r>0&&b.r<=32,'physical radius remains bounded');
        const old=tracked.get(b.id);
        if(b.v27Pattern){
          allModes.add(b.v27Motion||'linear');allRadii.add(Math.round(b.r*100)/100);
          if(old&&Math.abs(b.angle-old.angle)>.002&&!(b.v27BouncePoint)){localCurves++;curved++;}
          if(old&&old.vx*b.vx<0&&b.v27BouncePoint){localReflections++;reflected++;}
          if(!seen.has(b.id)&&b.v27ParentId!=null){
            localChildren++;children++;const family=splitParents.get(b.v27ParentId)||new Set();family.add(b.id);splitParents.set(b.v27ParentId,family);assert(family.size<=3,'one parent must never recursively multiply without bound');
            assert(b.py<420&&Math.hypot(b.px-w.player.x,b.py-w.player.y)>100,'new split children need visible lead distance from player');
          }
          if(b.v27LaneIndex!=null){assert.notEqual(b.v27LaneIndex,b.v27RestLane,'piano rest lane stays empty');localPiano++;piano++;}
        }
        seen.add(b.id);tracked.set(b.id,{x:b.x,y:b.y,vx:b.vx,vy:b.vy,angle:b.angle});
      }
    }
    assert.equal(w.stage,'boss','immune observation must remain in its selected phase');
    rows.push({bossIndex:index,phase,difficulty,ticks,peakBullets:maxBullets,peakHazards:maxHazards,maxPendingWarnings:maxWarnings,curveObservations:localCurves,reflectionObservations:localReflections,splitChildren:localChildren,pianoSamples:localPiano,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups});
  }
  return {rows,summary:{cases:rows.length,ticksPerCase:ticks,engineTicks:rows.length*ticks,peakBullets:Math.max(...rows.map(r=>r.peakBullets)),peakHazards:Math.max(...rows.map(r=>r.peakHazards)),modes:[...allModes].sort(),actualRadiusValues:[...allRadii].sort((a,b)=>a-b),curveObservations:curved,reflectionObservations:reflected,splitChildren:children,pianoSamples:piano,poolPressure:rows.reduce((n,r)=>n+r.poolPressure,0),droppedGroups:rows.reduce((n,r)=>n+r.droppedGroups,0)}};
}
function old25Exact(C,{ticks=360}={}){
  const prior=pinnedCore();let cases=0,comparisons=0;
  for(let index=0;index<35;index++)for(const phase of [0,1,2])for(const difficulty of ['gentle','normal','hell']){
    const w=world(C,index,phase,difficulty,25),old=world(prior,index,phase,difficulty,25);
    for(let n=0;n<ticks;n++){const input={dx:n%120<60?1:-1,dy:n%180<90?.5:-.5};C.step(w,input);prior.step(old,input);if(n%60===0||n===ticks-1){assert.equal(JSON.stringify(w),JSON.stringify(old),'old25 physical state changed '+[index,phase,difficulty,n]);assert.equal(JSON.stringify(C.checkpoint(w)),JSON.stringify(prior.checkpoint(old)));comparisons++;}}cases++;
  }
  return {cases,ticksPerCase:ticks,pairedTicks:cases*ticks,sampledWorldAndRawCheckpointComparisons:comparisons,normalisation:null,exact:true};
}
async function renderCacheAudit(){
  const a=require('./audit-object-projectiles-v24.cjs'),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]})),{performance}=require('node:perf_hooks'),rows=[];
  for(const index of [0,6,8,11,20,24,29,33,34]){
    const box=a.runtime(),C=box.HapilCore,w=world(C,index,2,'hell'),images=await a.imagesFor(box,index>=12?index+1:index),canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
    try{for(const at of [235,455,750]){while(w.tick<at)C.step(w,{});for(const low of [false,true]){
      const times=[];for(let n=0;n<6;n++){const start=performance.now();renderer.draw(w,0,w.time,low);times.push(performance.now()-start);}
      const m=renderer.getMetrics(),p=m.projectilePresentation,s=m.bossSkillsPresentation;assert.equal(p.missingProjectileAssets,0);assert.equal(s.skillMissingAssets,0);assert.equal(p.stampCacheMisses,0,'warmed real scene cannot thrash stamp cache');assert(p.stampCacheBytes<=4194304&&p.stampCacheEntries<=96);assert(s.skillCacheBytes<=2097152&&s.skillCacheEntries<=24);assert(s.skillSourceDraws<=(low?4:8));
      rows.push({bossIndex:index,tick:w.tick,quality:low?'low':'high',bullets:w.bullets.length,hazards:w.hazards.length,warmCacheMisses:p.stampCacheMisses,stampBytes:p.stampCacheBytes,stampEntries:p.stampCacheEntries,skillBytes:s.skillCacheBytes,skillEntries:s.skillCacheEntries,warmSynchronousDrawMs:times.slice(3)});
    }}}finally{renderer.destroy();}
  }
  return {scope:'Frozen360x640DPR1 native CPU full-scene synchronous command/draw samples. Not browser/GPU/physical-phone FPS or sustained real-time play.',summary:{cases:rows.length,maximumStampBytes:Math.max(...rows.map(r=>r.stampBytes)),maximumStampEntries:Math.max(...rows.map(r=>r.stampEntries)),maximumSkillBytes:Math.max(...rows.map(r=>r.skillBytes)),maximumSkillEntries:Math.max(...rows.map(r=>r.skillEntries)),warmCacheMisses:rows.reduce((n,r)=>n+r.warmCacheMisses,0),maximumWarmSynchronousDrawMs:Math.max(...rows.flatMap(r=>r.warmSynchronousDrawMs))},rows};
}
async function visualProofs(){
  const a=require('./audit-object-projectiles-v24.cjs'),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]})),os=require('node:os');
  const outputDirectory=path.join(ROOT,'docs/v27-pattern-review');fs.mkdirSync(outputDirectory,{recursive:true});
  const boxes=[];
  for(const selection of [{index:6,label:'MIRROR'},{index:7,label:'SPLIT'},{index:11,label:'PIANO'}]){
    const box=a.runtime(),C=box.HapilCore,w=world(C,selection.index,0,'hell'),images=await a.imagesFor(box,selection.index>=12?selection.index+1:selection.index),canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);boxes.push({...selection,box,C,w,canvas,renderer});
  }
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hapil-v27-review-')),pngs=[],gifRows=[];
  try{for(let frame=0;frame<24;frame++){
    const c=createCanvas(540,364),paint=c.getContext('2d');paint.fillStyle='#111722';paint.fillRect(0,0,540,364);
    const samples=[];
    for(const [column,record]of boxes.entries()){
      const target=180+frame*12;while(record.w.tick<target)record.C.step(record.w,{});
      record.renderer.draw(record.w,0,record.w.time,false);paint.drawImage(record.canvas,column*180,22,180,320);paint.fillStyle='#e8ecf4';paint.font='11px sans-serif';paint.fillText(`${record.label}  tick ${record.w.tick}`,column*180+5,15);
      samples.push({bossIndex:record.index,phase:0,tick:record.w.tick,bullets:record.w.bullets.length});
    }
    paint.fillStyle='#b2c0d2';paint.font='9px sans-serif';paint.fillText('CPU immune review | 12 ticks/frame | 200ms playback | not real-time FPS',6,357);
    const file=path.join(temp,String(frame).padStart(3,'0')+'.png');fs.writeFileSync(file,c.toBuffer('image/png'));pngs.push(file);gifRows.push({frame,samples});
  }
  const gifPath=path.join(outputDirectory,'mirror-split-piano.gif');
  cp.execFileSync('python',['-c','from PIL import Image\nimport sys\nims=[Image.open(p).convert("RGB").quantize(colors=96) for p in sys.argv[2:]]\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:],duration=200,loop=0,optimize=True)\n',gifPath,...pngs]);
  const gifBytes=fs.readFileSync(gifPath);assert(gifBytes.length<=2700000);
  return {scope:'Source-art-only CPU renders of3independent checkpoint-selected HELL worlds, explicit immunity and automatic attacks/skillrotation off. GIF samples12simulationticks/frame and plays200ms/frame; it is not real-time gameFPS or ordinary-health gameplay.',gif:{path:path.relative(ROOT,gifPath),bytes:gifBytes.length,width:540,height:364,sha256:sha(gifBytes),frameCount:24,playbackFrameMs:200,simulationTicksPerFrame:12,rows:gifRows}};
  }finally{for(const record of boxes)record.renderer.destroy();fs.rmSync(temp,{recursive:true,force:true});}
}
function naturalHealth(C,{bosses=Array.from({length:35},(_,i)=>i),difficulties=['gentle','normal','hell']}={}){
  const probe=require('./probe-identities-v25-natural.cjs'),base=require('./natural-bot-policy.cjs'),zlib=require('node:zlib'),box={HapilCore:C},inputDirectory=path.join(ROOT,'docs/v27-natural-inputs'),before=hashes(),records=[];let replayedTicks=0;
  for(const index of bosses)for(const difficulty of difficulties){
    const r=probe.attempt(box,{bossIndex:index,phase:2,difficulty,combatRevision:27},{limit:5000,inputDirectory});records.push(r);
    const bytes=fs.readFileSync(path.join(inputDirectory,path.basename(r.input.file))),moves=zlib.gunzipSync(bytes).toString('ascii'),w=probe.initial(box,r);assert.equal(sha(bytes),r.input.sha256);assert.equal(moves.length,r.ticks);
    for(const key of moves){assert(!['won','lost'].includes(w.stage));const direction=base.directions[Number(key)];assert(direction);C.step(w,{dx:direction[0],dy:direction[1]});replayedTicks++;}
    assert.deepEqual(probe.result(w),{stage:r.stage,ticks:r.ticks,hp:r.hp,hits:r.hits,score:r.score,phaseTicks:r.phaseTicks,peakBullets:r.peakBullets,poolPressure:r.poolPressure,droppedGroups:r.droppedGroups,resultReason:r.resultReason},'exact original ordinary-health input replay');
    console.log(JSON.stringify({bossIndex:index,difficulty,stage:r.stage,hp:r.hp,hits:r.hits,ticks:r.ticks,poolPressure:r.poolPressure,droppedGroups:r.droppedGroups}));
  }
  assert.deepEqual(hashes(),before,'sources changed during ordinary-health recording/replay');
  const report={schema:1,date:'2026-10-31',scope:'CPU isolated special-practice starts atphase3, ordinary selected-mode HP/damage, default automatic attack and skillrotation, legal nine-direction inputs only. No external immunity,777, altered HP/speed/damage/RNG/timer/phase after product practice checkpoint selection. Not human/full-story/browser/GPU/phoneFPS.',policy:'Existing public-current-threat forecast heuristic. It reads current bullets and announced hazards, emits ordinary directional inputs, never edits live state and does not inspect future boss emissions or RNG. Approximate forecasts do not establish perfect reaction performance for every new motion type.',policyConfig:probe.POLICY,directions:base.directions,sourceHashes:before,sourceHashGuardPassed:true,summary:{cases:records.length,won:records.filter(r=>r.stage==='won').length,lost:records.filter(r=>r.stage==='lost').length,unfinished:records.filter(r=>!['won','lost'].includes(r.stage)).length,recordedInputTicks:records.reduce((n,r)=>n+r.ticks,0),exactlyReplayedInputTicks:replayedTicks,poolPressure:records.reduce((n,r)=>n+r.poolPressure,0),droppedGroups:records.reduce((n,r)=>n+r.droppedGroups,0)},records};
  const output=path.join(ROOT,'docs/V27-NATURAL-HEALTH-20261031.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,summary:report.summary}));return report;
}
async function main(){
  const C=require('../src/core.js');if(process.argv.includes('--natural'))return naturalHealth(C);
  const before=hashes(),skills=skillContinuity(C),retirement=retirementContinuity(C),diversity=geometricDiversity(C),matrix=phaseMatrix(C,{ticks:Number(process.env.HAPIL_V27_QA_TICKS||1800)}),legacy=old25Exact(C),renderCache=await renderCacheAudit(),visual=await visualProofs();
  assert(matrix.summary.curveObservations>0&&matrix.summary.reflectionObservations>0&&matrix.summary.splitChildren>0&&matrix.summary.pianoSamples>0,'real trajectories must exercise all requested families');
  assert.deepEqual(hashes(),before,'source changed during independent audit');
  const report={schema:1,date:'2026-10-31',baseline:BASE,scope:'Native CPU deterministic immune phase observations, direct skill/retirement fixture checks and old25 exact comparisons. No ordinary-health/human/full-story/browser/GPU/phone FPS claim.',sourceHashes:before,sourceHashGuardPassed:true,skills,retirement,diversity,matrix,legacy,renderCache,visual};
  const output=path.join(ROOT,'docs/V27-INDEPENDENT-COMBAT-QA-20261031.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,summary:matrix.summary,legacy}));assert.equal(matrix.summary.poolPressure,0,'complete immune matrix must not exhaust attack pools');assert.equal(matrix.summary.droppedGroups,0,'complete immune matrix must not silently skip committed attacks');return report;
}
module.exports={ROOT,BASE,FILES,hashes,world,sentinel,skillContinuity,retirementContinuity,geometricDiversity,phaseMatrix,old25Exact,renderCacheAudit,visualProofs,naturalHealth,main};
if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
