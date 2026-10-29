'use strict';
// Controlled phase fixtures only. The route checks use ordinary HP and real
// movement speed; no invulnerability or 777 is used in those checks.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
function fixture(index,difficulty){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty,seed:911,runId:'grid-fixture'});
 w.phase=1;w.phaseTime=7;w.boss.phase=1;w.autoAttack=false;w.skillRotation=false;
 w.player.y=540+(index%3-1)*12;
 return w;
}
function next(w,tick,input={}){while(w.tick<tick)core.step(w,input);}

test('each boss commits a four-ray # with one shared warning, exact positions and long enough reaction',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=fixture(index,difficulty);next(w,73);const h=w.hazards.filter(x=>x.patternId==='boss-grid-v1');
  assert.equal(h.length,4,`${index}/${difficulty}`);assert.equal(new Set(h.map(x=>x.castId)).size,1);
  const offset=((1+index)%3-1)*12, ys=[420+(index%3-1)*12,540+(index%3-1)*12];
  assert.deepEqual(h.slice(0,2).map(x=>x.x1),[108+offset,252+offset]);
  assert.deepEqual(h.slice(2).map(x=>x.y1),ys);
  assert(h.slice(0,2).every(x=>Math.abs(x.x1-x.x2)<1e-9&&x.y1===0&&x.y2>=640));
  assert(h.slice(2).every(x=>x.x1===0&&x.x2>=360&&Math.abs(x.y1-x.y2)<1e-9));
  assert(h.every(x=>x.warningTicks===(difficulty==='gentle'?108:96)));
  assert(h.every(x=>x.phase==='warning'&&x.activeAt===h[0].activeAt));
  assert(h.every(x=>x.fadeAt-x.activeAt===(difficulty==='gentle'?18:24)));
  assert(h.every(x=>x.width===[12,10,14,10,12][index]));
  assert.deepEqual(h.map(x=>x.paletteSlot),[0,0,1,1]);
  assert.equal(w.boss.specialPatternId,'boss-grid-v1');
  const lines=h.map(x=>[x.x1,x.y1,x.x2,x.y2,x.activeAt]);
  while(w.tick<h[0].activeAt-1){core.step(w,{});assert.equal(w.stats.hits,0);}
  assert.deepEqual(h.map(x=>[x.x1,x.y1,x.x2,x.y2,x.activeAt]),lines,'aim is fixed after warning');
  assert(h.every(x=>x.phase==='warning'));
  core.step(w,{});assert(h.every(x=>x.phase==='active'));assert.equal(w.stats.hits,1,'on-axis damage begins only at activation');
  assert.equal(w.boss.releaseTick,w.tick,'actual laser activation drives release pose');
 }
});

test('every grid has a reachable cell using ordinary focus movement and unmodified health',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=fixture(index,difficulty);next(w,73);const h=w.hazards.filter(x=>x.patternId==='boss-grid-v1'),hp=w.player.hp;
  const targetY=(h[2].y1+h[3].y1)/2;
  while(w.tick<h[0].expireAt){const previous=w.player.y;core.step(w,{dy:targetY-w.player.y,focus:true});assert(Math.abs(w.player.y-previous)<=2.00000001);}
  assert.equal(w.player.hp,hp,`${index}/${difficulty}`);assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 }
});

test('the grid cycle replaces ordinary emissions and preserves the other cycle and phase3 signature',()=>{
 for(let index=0;index<5;index++){
  const w=fixture(index,'normal');for(let i=0;i<419;i++){core.step(w,{});assert.equal(w.bullets.length,0,'no stacked grid-cycle bullet groups');}
  assert.equal(w.stats.droppedGroups,0);
  const normal=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:33});normal.phase=1;normal.boss.phase=1;normal.autoAttack=false;normal.skillRotation=false;
  for(let i=0;i<100;i++)core.step(normal,{});
  assert(!normal.hazards.some(h=>h.patternId==='boss-grid-v1'),'first phase-2 cycle remains the existing pattern');
  const signature=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:33});signature.phase=2;signature.boss.phase=2;signature.phaseTime=7;signature.autoAttack=false;signature.skillRotation=false;
  for(let i=0;i<60;i++)core.step(signature,{});
  assert(!signature.hazards.some(h=>h.patternId==='boss-grid-v1'),'phase-3 signature is retained');
 }
});
