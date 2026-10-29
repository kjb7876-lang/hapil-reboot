'use strict';
// CPU replays: ordinary HP, ordinary engine-generated i-frames after a hit,
// default auto attack/skills, and only ordinary directional inputs. No state,
// damage, RNG, HP, speed, 777, or invulnerability was altered by the bot.
// These are deterministic automated runs, not browser or human playtests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const dir=path.join(__dirname,'fixtures/natural-bot'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const [file,expected] of [['../src/core.js',manifest.recordedCoreSha256],['../src/weapon-patterns.js',manifest.recordedWeaponPatternsSha256]])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex'),expected,`recorded simulation module changed: ${file}`);
assert.deepEqual(manifest.bossIds,core.CAMPAIGN_BOSSES.map(b=>b.id));
assert.deepEqual(manifest.records.map(r=>`${r.difficulty}:${r.seed}`).sort(),['gentle:813','gentle:42','normal:813','normal:42','hell:813','hell:42'].sort());
const fields=['tick','stage','wave','phase','bossIndex','bossCount','campaignRevision','waveDuration','idCounter','rngState','player','boss','enemies','bullets','shots','hazards','memory','resonance','score','graze','kills','skills','stats','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze'];
function state(w){const o={};for(const key of fields)o[key]=w[key];return o;}
function move(c){const pair=manifest.directions[Number(c)];assert(pair,`bad recorded direction ${c}`);return {dx:pair[0],dy:pair[1]};}
for(const expected of manifest.records){
 test(`no-cheat natural CPU replay clears all twelve bosses and preserves checkpoint continuity: ${expected.difficulty}/${expected.seed}`,()=>{
  const raw=fs.readFileSync(path.join(dir,expected.file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),expected.sha256);
  const moves=zlib.gunzipSync(raw).toString('ascii');assert.equal(moves.length,expected.tick);
  const w=core.createRun({campaign:true,difficulty:expected.difficulty,seed:expected.seed,runId:expected.runId});
  assert.equal(w.practiceBoss,false);assert.equal(w.autoAttack,true);assert.equal(w.skillRotation,true);assert.equal(w.player.hp,w.player.maxHp);
  const phases=new Set(),marks=[],naturalWeapons=new Set(),naturalBounces=new Set(),naturalGridWarnings=new Set(),naturalGridActive=new Set(),sinSignatures=new Set();let serial=w.checkpointSerial;
  for(let tick=0;tick<moves.length;tick++){
   assert(!['won','lost'].includes(w.stage),`run ended early at ${w.tick}`);core.step(w,move(moves[tick]));
   if(w.stage==='boss'){
    for(const b of w.bullets){if(b.kind==='boss-weapon'){naturalWeapons.add(w.bossIndex);if(b.bounceCount===1)naturalBounces.add(w.bossIndex);}if(w.bossIndex>=5&&w.phase===2&&b.patternId===core.CAMPAIGN_SIGNATURES[w.bossIndex].id)sinSignatures.add(w.bossIndex);}
    for(const h of w.hazards){if(h.patternId==='boss-grid-v1'){if(h.phase==='warning')naturalGridWarnings.add(w.bossIndex);if(h.phase==='active')naturalGridActive.add(w.bossIndex);}if(w.bossIndex>=5&&w.phase===2&&h.patternId===core.CAMPAIGN_SIGNATURES[w.bossIndex].id)sinSignatures.add(w.bossIndex);}
   }
   if(w.checkpointSerial!==serial){
    serial=w.checkpointSerial;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);
    const snap=core.checkpoint(w),clean=store.validateCheckpoint(snap);assert(clean,`bad natural checkpoint ${serial}`);
    if(w.stage==='boss')phases.add(`${w.bossIndex}:${w.phase}`);
    // Every saved boundary is replayed from the validated saved format for
    // 180 real subsequent inputs. Compare live hazards, entities, resource
    // clocks, RNG and collision state, not only serialized field names.
    const original=structuredClone(w),restored=core.restoreCheckpoint(clean);
    for(let j=tick+1;j<Math.min(moves.length,tick+181);j++){
     const next=move(moves[j]);core.step(original,next);core.step(restored,next);
     assert.deepEqual(state(restored),state(original),`checkpoint ${serial} diverged after ${j-tick} ticks`);
    }
   }
  }
  const everyPhase=Array.from({length:core.CAMPAIGN_BOSSES.length},(_,b)=>Array.from({length:3},(_,p)=>`${b}:${p}`)).flat();
  assert.deepEqual([...phases].sort(),everyPhase.sort());
  for(const seen of [naturalWeapons,naturalBounces,naturalGridWarnings,naturalGridActive])assert.deepEqual([...seen].filter(i=>i<5).sort((a,b)=>a-b),[0,1,2,3,4],'all five published bosses still execute their requested pattern during normal progression');
  assert.deepEqual([...sinSignatures].sort((a,b)=>a-b),[5,6,7,8,9,10,11],'seven sins execute their own signatures during natural progression');
  assert.equal(w.stage,'won');assert.equal(w.bossIndex,core.CAMPAIGN_BOSSES.length-1);assert.equal(w.phase,2);
  assert.equal(w.tick,expected.tick);assert.equal(w.player.hp,expected.hp);assert.equal(w.stats.hits,expected.hits);
  assert.equal(w.score,expected.score);assert.equal(w.kills,expected.killCount);assert.equal(w.checkpointSerial,expected.checkpointCount);
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
  assert.deepEqual(w.stats.phaseTicks,expected.phaseTicks);assert.deepEqual(marks,expected.marks);
 });
}
