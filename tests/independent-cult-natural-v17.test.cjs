'use strict';
// Independent, normal-health CPU route through a separate final-boss practice.
// This is not a full canonical campaign clear or a human/device playtest.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),policy=require('../tools/natural-bot-policy.cjs');
function input(w){const d=policy.directions[policy.move(w)];return {dx:d[0],dy:d[1]};}
test('separate cult finale naturally reaches awakening and core-preserving conclusion in all difficulties',()=>{
 for(const difficulty of ['gentle','normal','hell'])for(const seed of [813,42]){
  const w=core.createRun({campaign:true,practiceBoss:true,finalPractice:true,bossIndex:11,difficulty,seed,runId:'independent-cult-'+difficulty+'-'+seed});
  assert.equal(w.boss.kind,'cult-leader');assert.equal(w.player.hp,w.player.maxHp);
  let narrative=false,observedPhases=new Set(),maxBullets=0,activeLasers=0,serial=w.checkpointSerial;
  for(let n=0;n<45000&&!['lost','won'].includes(w.stage);n++){
   if(w.stage==='boss')observedPhases.add(w.phase);if(w.transitionNarrative)narrative=true;
   core.step(w,input(w));maxBullets=Math.max(maxBullets,w.bullets.length);activeLasers+=w.hazards.filter(h=>h.phase==='active').length;
   if(w.checkpointSerial!==serial){
    serial=w.checkpointSerial;const cp=core.checkpoint(w);assert.equal(cp.finalPractice,true);assert.equal(cp.practiceBoss,true);
    const a=structuredClone(w),b=core.restoreCheckpoint(cp);assert.equal(b.boss.kind,'cult-leader');
    // Fixed harmless ordinary inputs still advance the full unmodified combat
    // and compare its seeded state from the exact phase boundary.
    for(let j=0;j<180;j++){const move={dx:0,dy:0};core.step(a,move);core.step(b,move);}
    for(const key of ['tick','rngState','stage','phase','player','boss','bullets','hazards','stats'])assert.deepEqual(a[key],b[key],`${difficulty}/${seed} restored ${key}`);
   }
  }
  assert.equal(w.stage,'won',`${difficulty}/${seed}: ${w.stage}`);assert.deepEqual([...observedPhases],[0,1,2]);assert(narrative);
  assert(w.resultReason.includes('코어는 남기고'));assert(w.resultReason.includes('몽세수호자'));
  assert(maxBullets>0);assert(activeLasers>0);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 }
});
