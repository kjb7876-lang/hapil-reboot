'use strict';
// Full CPU replays of ordinary legal directional input. No fixtures, 777,
// immunity, health, damage, RNG, timers, phase skipping or direct state writes
// are used. These runs are automated, not human/browser/GPU/mobile tests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const root=path.join(__dirname,'..'),dir=path.join(__dirname,'fixtures/revision4-natural-bot'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const [file,expected] of Object.entries(manifest.replayValidatedModuleSha256||manifest.recordedModuleSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,`replay-validated module changed: ${file}`);
assert.equal(manifest.campaignRevision,4);assert.deepEqual(manifest.encounterIds,core.CAMPAIGN_BOSSES.slice(0,18).map(b=>b.id));assert.equal(manifest.encounterIds.length,18);
assert.deepEqual(manifest.records.map(r=>`${r.difficulty}:${r.seed}`).sort(),['gentle:813','gentle:42','normal:813','normal:42','hell:813','hell:42'].sort());
const fields=['tick','stage','stageTime','wave','waveTime','phase','phaseTime','bossIndex','bossCount','bossId','bossName','campaignRevision','checkpointSerial','waveDuration','idCounter','rngState','player','boss','enemies','bullets','shots','hazards','memory','resonance','score','graze','kills','skills','stats','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze','protagonist','combatObjective','resultReason'];
function state(w){const result={};for(const key of fields)result[key]=w[key];return result;}
function move(c){const pair=manifest.directions[Number(c)];assert(pair,`bad recorded direction ${c}`);return {dx:pair[0],dy:pair[1]};}
for(const expected of manifest.records)test(`ordinary-health natural revision-four CPU route and every saved boundary: ${expected.difficulty}/${expected.seed}`,()=>{
 const raw=fs.readFileSync(path.join(dir,expected.file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),expected.sha256);const moves=zlib.gunzipSync(raw).toString('ascii');assert.equal(moves.length,expected.tick);
 const w=core.createRun({campaign:true,campaignRevision:4,difficulty:expected.difficulty,seed:expected.seed,runId:expected.runId});assert.equal(w.practiceBoss,false);assert.equal(!!w.finalPractice,false);assert.equal(w.autoAttack,true);assert.equal(w.skillRotation,true);assert.equal(w.player.hp,w.player.maxHp);
 const phases=new Set(),marks=[],newWarnings=new Set(),newActive=new Set(),newProjectiles=new Set(),newDrones=new Set();let serial=w.checkpointSerial,boundaries=0;
 for(let tick=0;tick<moves.length;tick++){
  assert(!['won','lost'].includes(w.stage),`early end ${w.tick}`);core.step(w,move(moves[tick]));
  if(w.bossIndex>=12){
   for(const enemy of w.enemies)if(enemy.archetype==='chapter3-drone')newDrones.add(w.bossIndex);
   if(w.stage==='boss'){
    assert.equal(w.boss.linkTarget,true);assert.equal(w.boss.identityGroup,'controller-system');assert.equal(w.boss.healthLabel,'반복 연결');
    const id=core.CAMPAIGN_SIGNATURES[w.bossIndex].id;
    for(const bullet of w.bullets)if(bullet.patternId===id){assert.equal(bullet.ownerId,w.boss.id);newProjectiles.add(w.bossIndex);}
    for(const hazard of w.hazards)if(hazard.patternId===id){assert.equal(hazard.ownerId,w.boss.id);if(hazard.phase==='warning')newWarnings.add(w.bossIndex);if(hazard.phase==='active')newActive.add(w.bossIndex);}
   }
  }
  if(w.checkpointSerial!==serial){
   serial=w.checkpointSerial;boundaries++;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);const clean=store.validateCheckpoint(core.checkpoint(w));assert(clean,`invalid boundary ${serial}`);assert.equal(clean.campaignRevision,4);
   if(w.stage==='boss')phases.add(`${w.bossIndex}:${w.phase}`);
   // Actual serialized save restoration, followed by the next 180 already
   // recorded real inputs. Compare collisions, threats, RNG and resource clocks.
   const original=structuredClone(w),restored=core.restoreCheckpoint(clean);
   for(let j=tick+1;j<Math.min(moves.length,tick+181);j++){const next=move(moves[j]);core.step(original,next);core.step(restored,next);assert.deepEqual(state(restored),state(original),`boundary ${serial} diverged after ${j-tick} ticks`);}
  }
 }
 assert.deepEqual([...phases].sort(),Array.from({length:18},(_,b)=>Array.from({length:3},(_,p)=>`${b}:${p}`)).flat().sort());
 for(const seen of [newWarnings,newActive,newProjectiles,newDrones])assert.deepEqual([...seen].sort((a,b)=>a-b),[12,13,14,15,16,17],'all six scenes execute owned warnings, active rays, projectiles and drones in natural progression');
 assert.equal(w.stage,'won');assert.equal(w.bossIndex,17);assert.equal(w.phase,2);assert.equal(w.bossCount,18);assert.equal(w.checkpointSerial,106);assert.equal(boundaries,105);
 assert.equal(w.tick,expected.tick);assert.equal(w.player.hp,expected.hp);assert.equal(w.stats.hits,expected.hits);assert.equal(w.score,expected.score);assert.equal(w.kills,expected.killCount);assert.equal(w.checkpointSerial,expected.checkpointCount);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);assert.deepEqual(w.stats.phaseTicks,expected.phaseTicks);assert.deepEqual(marks,expected.marks);
 assert.match(w.resultReason,/되감는 연결|반복/);assert.equal(w.protagonist,'의목사 B');assert.match(w.resultReason,/첫째 아이/);assert.match(w.resultReason,/남은 두 아이/);assert.doesNotMatch(w.resultReason,/합일 코어를 파괴|기억을 파괴|환도는 몽세수호자로/);
});
