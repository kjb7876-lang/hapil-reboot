'use strict';
// Ordinary-health full-route CPU input replays. No immunity/777, phase skip,
// health, damage, RNG, timer or direct state modifications are used here.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'fixtures/revision5-natural-bot'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const {currentModuleSha256:validatedModules}=require('../tools/historic-replay-attestation-v25.cjs').validateHistoricalReplayAttestation('revision5-natural-bot',manifest);
assert.deepEqual(Object.keys(validatedModules).sort(),Object.keys(manifest.recordedModuleSha256).sort(),'candidate verification must retain every recorded module/policy/capture hash');
for(const [file,hash] of Object.entries(validatedModules))assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,'replay-validated simulation/policy/capture source changed: '+file);
assert.equal(manifest.campaignRevision,5);assert.equal(manifest.canonicalNarrativeSHA256,'e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa');assert.deepEqual(manifest.encounterIds,core.CAMPAIGN_BOSSES.map(e=>e.id));assert.equal(manifest.encounterIds.length,35);
assert.deepEqual(manifest.records.map(r=>`${r.difficulty}:${r.seed}`).sort(),['gentle:813','gentle:42','normal:813','normal:42','hell:813','hell:42'].sort());
const fields=['tick','stage','stageTime','wave','waveTime','phase','phaseTime','bossIndex','bossCount','bossId','bossName','campaignRevision','checkpointSerial','waveDuration','idCounter','rngState','player','boss','enemies','bullets','shots','hazards','memory','resonance','score','graze','kills','skills','stats','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze','protagonist','combatObjective','resultReason','samongAwakened'];
function state(w){const o={};for(const f of fields)o[f]=w[f];o.activeArbeliaSlowUntil=w.tick<(w.arbeliaSlowUntil||0)?w.arbeliaSlowUntil:null;return o;}
function move(c){const d=manifest.directions[Number(c)];assert(d,'invalid recorded direction '+c);return {dx:d[0],dy:d[1]};}
for(const expected of manifest.records)test(`ordinary-health revision-five complete route/save restoration: ${expected.difficulty}/${expected.seed}`,()=>{
 const raw=fs.readFileSync(path.join(dir,expected.file));assert.equal(sha(raw),expected.sha256);const moves=zlib.gunzipSync(raw).toString('ascii');assert.equal(moves.length,expected.tick);
 const w=core.createRun({campaign:true,campaignRevision:5,difficulty:expected.difficulty,seed:expected.seed,runId:expected.runId});assert.equal(w.practiceBoss,false);assert.equal(!!w.finalPractice,false);assert.equal(w.player.hp,w.player.maxHp);assert(w.autoAttack&&w.skillRotation);
 let serial=w.checkpointSerial,boundaries=0;const phases=new Set(),marks=[],seenBullets=new Set(),seenWarnings=new Set(),seenActive=new Set(),pairBulletActors=new Set(),pairLaserActors=new Set(),announced=new Map(),seenInvasion=new Set();let sawSamong=false;
 for(let tick=0;tick<moves.length;tick++){
  assert(!['won','lost'].includes(w.stage),'premature route end '+w.tick);core.step(w,move(moves[tick]));
  if(w.bossIndex>=18){
   assert.equal(w.protagonist,w.bossIndex>=21&&w.bossIndex<=29?'윤서하':'환도');
   if(w.stage==='boss'){
    const own=core.CAMPAIGN_SIGNATURES[w.bossIndex].id;assert(w.boss.linkTarget);assert.equal(w.boss.kind,core.CAMPAIGN_BOSSES[w.bossIndex].id);
    for(const b of w.bullets)if(b.patternId===own){assert.equal(b.ownerId,w.boss.id);seenBullets.add(w.bossIndex);if(w.bossIndex===33)pairBulletActors.add(b.sourceActorId);}
    for(const h of w.hazards)if(h.patternId===own){assert.equal(h.ownerId,w.boss.id);const shape=[h.x1,h.y1,h.x2,h.y2,h.width,h.activeAt,h.fadeAt];if(!announced.has(h.id))announced.set(h.id,shape);assert.deepEqual(shape,announced.get(h.id),'a warned path must remain locked');if(h.phase==='warning'){seenWarnings.add(w.bossIndex);assert(w.tick<h.activeAt);}if(h.phase==='active'){seenActive.add(w.bossIndex);assert(w.tick>=h.activeAt&&w.tick<h.fadeAt);}if(w.bossIndex===33)pairLaserActors.add(h.sourceActorId);}
    if(w.bossIndex===34&&w.phase===2){assert.equal(w.samongAwakened,true);sawSamong=true;}
   }
   for(const e of w.events)if(e.type==='defense-wave')seenInvasion.add(e.text||e.label||e.message||e.value||JSON.stringify(e));
  }
  if(w.checkpointSerial!==serial){serial=w.checkpointSerial;boundaries++;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);if(w.stage==='boss')phases.add(`${w.bossIndex}:${w.phase}`);const saved=store.validateCheckpoint(core.checkpoint(w));assert(saved,`invalid boundary ${serial}`);assert.equal(saved.campaignRevision,5);
   const original=structuredClone(w),restored=core.restoreCheckpoint(saved);for(let j=tick+1;j<Math.min(moves.length,tick+181);j++){const d=move(moves[j]),oldEvents=new Set(original.events),restoredEvents=new Set(restored.events);core.step(original,d);core.step(restored,d);assert.deepEqual(state(restored),state(original),`save boundary${serial} diverges after${j-tick} future actual inputs`);assert.deepEqual(restored.events.filter(e=>!restoredEvents.has(e)),original.events.filter(e=>!oldEvents.has(e)),'newly generated cues must match; consumed/history audio queues are intentionally not persisted');}
  }
 }
 assert.deepEqual([...phases].sort(),Array.from({length:35},(_,b)=>Array.from({length:3},(_,p)=>`${b}:${p}`)).flat().sort());for(const seen of [seenBullets,seenWarnings,seenActive])assert.deepEqual([...seen].sort((a,b)=>a-b),Array.from({length:17},(_,i)=>i+18),'every new scene executes its own bullets and announced/active rays naturally');
 assert.deepEqual([...pairBulletActors].sort(),['baek-ion','han-rian']);assert.deepEqual([...pairLaserActors].sort(),['baek-ion','han-rian']);assert.equal(seenInvasion.size,6);assert(sawSamong);
 assert.equal(w.stage,'won');assert.equal(w.bossIndex,34);assert.equal(w.bossCount,35);assert.equal(w.phase,2);assert.equal(w.checkpointSerial,208);assert.equal(boundaries,207);assert.equal(w.stats.phaseTicks.length,105);assert.equal(w.tick,expected.tick);assert.equal(w.player.hp,expected.hp);assert.equal(w.stats.hits,expected.hits);assert.equal(w.score,expected.score);assert.equal(w.kills,expected.killCount);assert.deepEqual(w.stats.phaseTicks,expected.phaseTicks);assert.deepEqual(marks,expected.marks);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 assert.equal(w.protagonist,'환도');assert.equal(w.samongAwakened,true);assert.match(w.resultReason,/몽세수호자/);assert.match(w.resultReason,/코어/);assert.match(w.resultReason,/명령/);assert.match(w.resultReason,/사이비/);assert.doesNotMatch(w.resultReason,/코어를 파괴|코어가 파괴|기억을 파괴|사몽역행|네오서울/);
});
