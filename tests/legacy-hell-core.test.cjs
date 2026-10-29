'use strict';
// Controlled combat/timing fixtures. No full-run or real-device claims here.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
function observe(seed,difficulty='hell'){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:0,difficulty,seed,runId:'seeded-hell-observation'});
 w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
 return w;
}
function signature(w){return {rngState:w.rngState,bullets:w.bullets.map(b=>[b.id,b.x,b.y,b.vx,b.vy,b.patternId]),hazards:w.hazards.map(h=>[h.x1,h.y1,h.x2,h.y2,h.activeAt,h.phase])};}
function defeatFinalPhase(index,revision){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,campaignRevision:revision,seed:19,runId:'fixture-seal-endpoint'});
 w.practiceBoss=false;w.phase=2;w.boss.phase=2;w.boss.hp=1;w.autoAttack=false;w.skillRotation=false;
 w.shots.push({id:5000,x:180,y:116,px:180,py:116,vx:0,vy:0,r:2,age:0,ttl:1,damage:10,kind:'basic'});
 core.step(w,{});return w;
}

test('HELL randomness is seeded, bounded per pair and unchanged by presentation spin',()=>{
 const a=observe(813),b=observe(813),other=observe(42),normal=observe(813,'normal');
 for(let t=0;t<127;t++){core.step(a,{});core.step(b,{});core.step(other,{});core.step(normal,{});}
 assert.deepEqual(signature(a),signature(b));assert.notDeepEqual(signature(a),signature(other));
 const weapons=a.bullets.filter(v=>v.weaponMotion),baseline=normal.bullets.filter(v=>v.weaponMotion);
 assert.equal(weapons.length,2);assert.equal(baseline.length,2);
 const factor=Math.hypot(weapons[0].vx,weapons[0].vy)/Math.hypot(baseline[0].vx,baseline[0].vy);
 assert(factor>=1.32&&factor<1.56);assert(Math.abs(weapons[0].vx+weapons[1].vx)<1e-9);
 assert.equal(a.player.maxHp,3);assert.deepEqual(core.CAPS,{bullets:768,shots:96,enemies:12,effects:96,hazards:40});
 weapons[0].spinAngle+=2;
 for(let t=127;t<250;t++){core.step(a,{});core.step(b,{});}
 assert.deepEqual(signature(a),signature(b),'visual spin must not alter seeded motion');
});

test('HELL emits its second rhythm only after an additional full charge',()=>{
 const w=observe(813);while(w.tick<181)core.step(w,{});
 assert.equal(w.boss.action,'charge');assert.equal(w.boss.actionProgress,0);
 assert(!w.bullets.some(b=>b.patternId==='hell-relay-v1'));
 while(w.tick<234)core.step(w,{});
 assert(!w.bullets.some(b=>b.patternId==='hell-relay-v1'));
 core.step(w,{});const relay=w.bullets.filter(b=>b.patternId==='hell-relay-v1');
 assert.equal(relay.length,6);assert.equal(w.boss.releaseTick,w.tick);
 assert(relay.every(b=>b.ownerId===w.boss.id));
});

test('new Horn route keeps fighting ordinary waves for45seconds then drains; old snapshots retain15seconds',()=>{
 for(const revision of [1,2,3]){
  const w=core.createRun({campaign:true,seed:9,campaignRevision:revision,runId:'route-timer-'+revision});
  const snapshot=core.checkpoint(w);snapshot.bossIndex=1;
  const restored=core.restoreCheckpoint(snapshot);restored.autoAttack=false;restored.skillRotation=false;restored.player.invulnerableUntil=999999;
  assert.equal(restored.waveDuration,revision===3?45:15);
  for(let t=0;t<(revision===3?2699:899);t++)core.step(restored,{});
  assert.equal(restored.stage,'waves','ordinary progression cannot be skipped by an empty battlefield');
  while(restored.stage==='waves'&&restored.tick<4000)core.step(restored,{});
  assert.equal(restored.stage,'bossIntro');assert(restored.tick>=(revision===3?2700:900));assert(restored.tick<4000);
  assert.equal(core.checkpoint(restored).campaignRevision,revision);
 }
});

test('legacy routes end at their own final boss, while new Lucifer clear shows an ordered15second bridge',()=>{
 for(const [revision,index] of [[1,2],[2,4]]){
  const w=defeatFinalPhase(index,revision);assert.equal(w.stage,'won');assert.equal(w.bossCount,index+1);assert(!w.transitionNarrative);
 }
 const w=defeatFinalPhase(4,3);assert.equal(w.stage,'transition');assert.equal(w.nextEncounter,5);assert.equal(w.transitionMinimum,15);
 assert.equal(w.transitionNarrative.length,5);assert.match(w.transitionNarrative[0],/병원/);assert.match(w.transitionNarrative[3],/72개의 트라우마/);assert.match(w.transitionNarrative[4],/의목사 자격/);
 while(w.stageTime<14.9)core.step(w,{});assert.equal(w.stage,'transition');assert.equal(core.skipBossIntro(w),false);
 while(w.stage==='transition')core.step(w,{});
 assert.equal(w.stage,'waves');assert.equal(w.bossIndex,5);assert.equal(w.transitionNarrative,null);assert.equal(core.checkpoint(w).campaignRevision,3);
});

test('seven sins preserve actual identities, shared memory forms and sealing semantics',()=>{
 assert.equal(core.CAMPAIGN_BOSSES.length,12);assert.equal(core.CAMPAIGN_SIGNATURES.length,12);
 assert.deepEqual(core.CAMPAIGN_BOSSES.slice(5).map(x=>x.id),['belphegor','leviathan','beelzebub','asmodeus','mammon','wrath','pride']);
 assert.notEqual(core.CAMPAIGN_BOSSES[4].id,core.CAMPAIGN_BOSSES[11].id);
 for(const index of [9,11]){
  const source=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:10});
  source.practiceBoss=false;const snapshot=core.checkpoint(source);snapshot.practiceBoss=false;snapshot.phase=2;
  const w=core.restoreCheckpoint(snapshot);assert.equal(w.boss.kind,index===9?'mammon':'pride');assert.equal(w.boss.sealTarget,true);assert.equal(w.boss.healthLabel,'봉인 저항');
  assert.equal(w.boss.presentationVariant,index===9?'child-memory':'cyborg-biobootloader');
  assert.equal(w.boss.artKey,index===9?'sinMammonChildAtlas':'sinPrideCyborgAtlas');
 }
 const final=defeatFinalPhase(11,3);assert.equal(final.stage,'won');assert.match(final.resultReason,/봉인 조사 구간/);assert(!/합일 코어|J의 인장|루시퍼/.test(final.resultReason));
 const old=core.checkpoint(core.createRun({campaign:true,campaignRevision:2}));old.difficulty='hell';assert.throws(()=>core.restoreCheckpoint(old),/Invalid campaign checkpoint/);
});
