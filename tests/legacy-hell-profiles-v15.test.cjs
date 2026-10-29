'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
function sample(index){const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'profile-v15'});w.player.invulnerableUntil=999999;w.boss.hp=1e9;w.autoAttack=false;w.skillRotation=false;return w;}
// Controlled invulnerability is used solely to observe trajectories; this is not a natural clear.
test('all encounter-specific added fans differ in cadence or geometry while keeping real overlap',()=>{
 const profiles=[];
 for(let index=0;index<12;index++){
  const w=sample(index),seen=new Set(),births=[],first=new Map();let overlap=0;
  for(let t=0;t<320;t++){
   core.step(w,{});
   for(const b of w.bullets)if(b.patternId==='hell-overlap-fan-v14'&&!seen.has(b.id)){seen.add(b.id);births.push(w.tick);if(!first.has(w.tick))first.set(w.tick,b);}
   if(w.hazards.some(h=>h.patternId==='hell-overlap-lattice-v14'&&h.phase==='active')&&w.bullets.some(b=>b.patternId==='hell-overlap-rotor-v14')&&w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14'))overlap++;
  }
  assert(overlap>0);assert.equal(first.size,4);const b=[...first.values()][0];profiles.push(JSON.stringify({beats:[...first.keys()],count:births.filter(t=>t===births[0]).length,curve:b.curveRate||0,accel:b.acceleration||0,pause:!!b.pauseUntil}));
 }
 assert(new Set(profiles).size>=10,'encounter profiles must not collapse to a common pattern');
});
test('curve is fixed after release and paused fan resumes movement without changing collision identity',()=>{
 let w=sample(6),b;while(!b&&w.tick<180){core.step(w,{});b=w.bullets.find(x=>x.patternId==='hell-overlap-fan-v14'&&x.curveRate)}assert(b);let angle=b.angle,x=b.x,y=b.y;w.player.x=16;for(let t=0;t<20;t++)core.step(w,{});assert.notEqual(b.angle,angle);assert(Math.hypot(b.x-x,b.y-y)>0);
 w=sample(5);b=null;while(!b&&w.tick<210){core.step(w,{});b=w.bullets.find(x=>x.patternId==='hell-overlap-fan-v14'&&x.pauseUntil)}assert(b);while(b.age<b.pauseFrom)core.step(w,{});const id=b.id;core.step(w,{});x=b.x;y=b.y;for(let t=0;t<5;t++)core.step(w,{});assert.equal(b.x,x);assert.equal(b.y,y);assert.equal(b.id,id);while(b.age<b.pauseUntil+.04)core.step(w,{});assert(Math.hypot(b.x-x,b.y-y)>0);
});
