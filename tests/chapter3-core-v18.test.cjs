'use strict';
// Explicit boundary and attack observations. These controlled fixtures are
// separate from independent normal-health full-route input replays.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
function finalBoundary(index,revision,phase=2){
 const run=core.createRun({campaign:true,campaignRevision:revision,practiceBoss:true,bossIndex:index,seed:813,runId:'chapter3-boundary'});
 const cp=core.checkpoint(run);cp.phase=phase;cp.practiceBoss=false;return core.restoreCheckpoint(cp);
}
function finishCurrent(w){w.boss.hp=1;w.player.invulnerableUntil=999999;for(let n=0;n<360&&w.stage==='boss';n++)core.step(w,{});assert.notEqual(w.stage,'boss');}

test('revision four adds the six chronological controller-system scenes while old endpoints stay fixed',()=>{
 assert.equal(core.CAMPAIGN_REVISION,3);assert.equal(core.LATEST_CAMPAIGN_REVISION,4);
 assert.deepEqual([1,2,3,4].map(core.campaignBossCount),[3,5,12,18]);
 assert.equal(core.createRun({campaign:true}).campaignRevision,3);
 const scenes=core.CAMPAIGN_BOSSES.slice(12);assert.deepEqual(scenes.map(e=>e.sceneIds[0]),['u201','u202','u204','u205','u206','u203']);
 assert.deepEqual(scenes.flatMap(e=>e.storySteps),Array.from({length:17},(_,i)=>i+1));
 assert(scenes.every(e=>e.identityGroup==='controller-system'&&e.chapter===3));
 for(let i=12;i<18;i++){
  assert.throws(()=>core.createRun({campaign:true,campaignRevision:3,practiceBoss:true,bossIndex:i}));
  const w=core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:i});
  assert.equal(w.protagonist,'의목사 B');assert.equal(w.boss.healthLabel,'반복 연결');assert.equal(w.boss.linkTarget,true);assert.equal(w.boss.sealTarget,false);
 }
});

test('old chairman endpoint is retained; only explicit revision four reaches the missing-return bridge',()=>{
 const old=finalBoundary(11,3),next=finalBoundary(11,4);finishCurrent(old);finishCurrent(next);
 assert.equal(old.stage,'won');assert.equal(next.stage,'transition');assert.equal(next.nextEncounter,12);
 assert(Array.isArray(next.transitionNarrative));assert.match(next.transitionNarrative.join(' '),/미카엘라/);assert.match(next.transitionNarrative.join(' '),/캡슐/);assert.match(next.transitionNarrative.join(' '),/의목사 B/);
 assert.equal(next.transitionMinimum,12);
});

test('revision-four command links release the child and leave the memory door intact',()=>{
 const w=finalBoundary(17,4);finishCurrent(w);assert.equal(w.stage,'won');
 assert.match(w.resultReason,/기억의 문은 남아/);assert.match(w.resultReason,/연결만 끊어/);assert.match(w.resultReason,/남은 두 아이/);
 assert(!w.events.some(e=>e.type==='seal'));assert(w.events.some(e=>e.type==='disconnect'));
});

test('revision-four save limits admit all106 boundaries and54 phase records without widening old saves',()=>{
 const w=core.createRun({campaign:true,campaignRevision:4,seed:813}),cp=core.checkpoint(w);
 cp.checkpointSerial=106;cp.stats.phaseTicks=Array(54).fill(1200);assert(store.validateCheckpoint(cp));assert.equal(core.restoreCheckpoint(cp).checkpointSerial,106);
 cp.checkpointSerial=107;assert.equal(store.validateCheckpoint(cp),null);assert.throws(()=>core.restoreCheckpoint(cp));
 const old=core.checkpoint(core.createRun({campaign:true,campaignRevision:3,seed:813}));old.checkpointSerial=101;assert.equal(store.validateCheckpoint(old),null);assert.throws(()=>core.restoreCheckpoint(old));
 old.checkpointSerial=1;old.stats.phaseTicks=Array(37).fill(1200);assert.equal(store.validateCheckpoint(old),null);assert.throws(()=>core.restoreCheckpoint(old));
});

test('each new scene commits its laser path, emits its own bounded bullets and restores the same combat',()=>{
 for(let index=12;index<18;index++)for(const difficulty of ['normal','gentle','hell']){
  const a=core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'controller-pattern'}),b=core.restoreCheckpoint(core.checkpoint(a));
  a.autoAttack=b.autoAttack=false;a.player.invulnerableUntil=b.player.invulnerableUntil=999999;let sawActive=false,peak=0;
  if(difficulty==='hell')a._hellProtectedLane={x:112,halfWidth:24,cycle:99}; // prior encounter transient state must not leak across a save boundary
  for(let tick=0;tick<720;tick++){
   const input={dx:Math.sin(tick*.01),dy:Math.cos(tick*.013),focus:true};core.step(a,input);core.step(b,input);
   if(tick%60===0)assert.deepEqual({player:a.player,bullets:a.bullets,hazards:a.hazards,rng:a.rngState},{player:b.player,bullets:b.bullets,hazards:b.hazards,rng:b.rngState});
   sawActive ||= a.hazards.some(h=>h.phase==='active');peak=Math.max(peak,a.bullets.length);
   for(const projectile of a.bullets)assert.equal(projectile.patternId,core.CAMPAIGN_SIGNATURES[index].id);
  }
  assert(sawActive);assert(peak>0&&peak<=160);assert.equal(a.stats.poolPressure,0);assert.equal(a.stats.droppedGroups,0);
  assert.equal(a.enemies.length,0,'unsupported old summons must not appear');
 }
});
