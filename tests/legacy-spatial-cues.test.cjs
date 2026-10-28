'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');

function fixture(bossIndex,phase,difficulty='normal'){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex,difficulty,seed:4321});
 w.phase=phase;w.phaseTime=0;w.boss.phase=phase;w.boss.hp=1e9;
 // Pattern-observation fixture, not a natural progression or mobile test.
 w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
 return w;
}

test('Balrog floor-trace cue labels only real committed laser warnings',()=>{
 for(const difficulty of ['normal','gentle'])for(const phase of [0,2]){
  const w=fixture(2,phase,difficulty);
  assert.equal(w.hazards.length,0);
  while(!w.hazards.length&&w.tick<180)core.step(w,{});
  assert.equal(w.hazards.length,phase===0?3:5);
  for(const h of w.hazards){
   assert.equal(h.kind,'laser');assert.equal(h.phase,'warning');
   assert.equal(h.telegraphKind,'floor-scar');
   assert.equal(h.telegraphHint,'검빛이 켜지기 전, 바닥의 흔적을 읽으세요');
   assert.equal(h.activeAt,h.born+h.warningTicks);
   assert.equal(h.warningTicks,(phase===0?60:78)+(difficulty==='gentle'?12:0));
   assert.equal(h.fadeAt,h.activeAt+(difficulty==='gentle'?18:24));
   assert.equal(h.expireAt,h.fadeAt+15);
  }
 }
});

test('floor trace remains the same capsule when aim moves and activates at its original tick',()=>{
 const w=fixture(2,0);
 while(!w.hazards.length)core.step(w,{});
 const h=w.hazards[0],geometry=['x1','y1','x2','y2','width'].map(k=>h[k]),activeAt=h.activeAt;
 while(w.tick<activeAt-1){
  core.step(w,{dx:3,dy:-1});
  assert.equal(h.phase,'warning');
  assert.deepEqual(['x1','y1','x2','y2','width'].map(k=>h[k]),geometry);
 }
 core.step(w,{dx:-3,dy:1});assert.equal(w.tick,activeAt);assert.equal(h.phase,'active');
 assert.deepEqual(['x1','y1','x2','y2','width'].map(k=>h[k]),geometry);
});

test('other bosses retain their own warnings without inheriting a Balrog floor-trace label',()=>{
 for(const bossIndex of [0,1,3,4]){
  const w=fixture(bossIndex,1);let observed=false;
  for(let tick=0;tick<360;tick++){
   core.step(w,{});
   for(const h of w.hazards){observed=true;assert.equal(h.telegraphKind,undefined);assert.equal(h.telegraphHint,undefined);}
  }
  assert(observed,`boss ${bossIndex} warning was not exercised`);
 }
});
