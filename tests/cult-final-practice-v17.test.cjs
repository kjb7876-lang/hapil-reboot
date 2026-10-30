'use strict';
// Fixed boundary observations: controlled health/boss-HP test is not natural play.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
function make(){return core.createRun({campaign:true,practiceBoss:true,bossIndex:11,finalPractice:true,difficulty:'normal',seed:813,runId:'cult-practice-test'});}
test('the cult leader remains a separate practice for historical campaigns',()=>{
 assert.equal(core.createRun({campaign:true,campaignRevision:3}).bossCount,12);assert(!core.CAMPAIGN_BOSSES.slice(0,18).some(b=>b.id==='cult-leader'));assert.notEqual(core.CAMPAIGN_BOSSES[11].id,'cult-leader');
 assert.throws(()=>core.createRun({campaign:true,practiceBoss:false,bossIndex:11,finalPractice:true}));
 assert.throws(()=>core.createRun({campaign:true,practiceBoss:true,bossIndex:0,finalPractice:true}));
 const w=make();assert.equal(w.bossId,'cult-leader');assert.equal(w.boss.kind,'cult-leader');assert.equal(w.boss.artKey,'cultLeaderAtlas');assert.equal(w.boss.phaseRole,'samong-awakened');
 const s=core.checkpoint(w),restored=core.restoreCheckpoint(s);assert.equal(s.finalPractice,true);assert.equal(restored.finalPractice,true);assert.equal(restored.bossId,'cult-leader');
 const forged=structuredClone(s);forged.practiceBoss=false;assert.throws(()=>core.restoreCheckpoint(forged));
});
test('separate practice tells revival and awakening, preserves the core at its conclusion',()=>{
 const w=make();w.player.invulnerableUntil=999999;let narrative=null,phase1hp=0,roles=[];
 for(let n=0;n<10000&&w.stage!=='won';n++){
  if(w.stage==='boss') { if(!roles.includes(w.boss.phaseRole)){roles.push(w.boss.phaseRole);if(w.phase===1)phase1hp=w.player.hp;}w.boss.hp=1; }
  core.step(w,{});if(w.transitionNarrative)narrative=w.transitionNarrative.slice();
 }
 assert.deepEqual(roles,['samong-awakened','core-restored','authority-duel']);assert(narrative&&narrative.some(x=>x.includes('신경선'))&&narrative.some(x=>x.includes('사몽')));
 assert.equal(phase1hp,w.player.maxHp);assert.equal(w.stage,'won');assert.match(w.resultReason,/코어는 남기고/);assert.match(w.resultReason,/몽세수호자/);
});
test('separate leader attacks are bounded and have their own IDs and no other encounter reinforcements',()=>{
 const w=make();w.player.invulnerableUntil=999999;w.autoAttack=false;w.skillRotation=false;w.boss.hp=1e9;let found=false;
 for(let i=0;i<1000;i++){core.step(w,{});assert.equal(w.enemies.length,0);assert(w.bullets.length<=core.CAPS.bullets);if(w.bullets.some(b=>b.patternId==='cult-leader-phase-1'))found=true;}
 assert(found);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
});
