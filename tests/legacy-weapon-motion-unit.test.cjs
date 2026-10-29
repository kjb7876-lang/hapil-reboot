'use strict';
// Pure deterministic fixtures: no claim about a natural playthrough or GPU.
const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../src/weapon-patterns.js'),DT=1/60;
function world(bossIndex=0,difficulty='normal'){return {campaign:true,stage:'boss',phase:0,phaseTime:1.8,difficulty,bossIndex,boss:{id:33,x:180,y:116}};}
function bullet(w,s){const factor=w.difficulty==='gentle'?.82:1;const b={x:s.x,y:s.y,px:s.x,py:s.y,vx:Math.cos(s.angle)*s.speed*factor,vy:Math.sin(s.angle)*s.speed*factor,r:s.r,halfLength:0,angle:s.angle,age:0};W.initialize(b,s,w);return b;}
function tick(b){b.px=b.x;b.py=b.y;W.advance(b,DT,360);b.age+=DT;}
test('weapon volleys contain exactly two symmetrical own-boss shots after a completed charge',()=>{
 for(let index=0;index<5;index++)for(const difficulty of ['normal','gentle']){
  const w=world(index,difficulty),s=W.createPair(w,w.boss,0);assert.equal(s.length,2);
  assert(s.every(x=>x.ownerId===w.boss.id&&x.kind===W.KIND&&x.r===11&&x.weaponMotion&&x.ttl===7.6));
  assert(s[0].x<w.boss.x&&s[1].x>w.boss.x);assert(s[0].angle>Math.PI/2&&s[1].angle<Math.PI/2);assert(s[0].spinRate<0&&s[1].spinRate>0);
  assert(W.shouldThrow(w,108,0));assert(!W.shouldThrow(w,107,0));assert(!W.shouldThrow(w,108,1));w.phase=1;assert(!W.shouldThrow(w,108,0));
 }
});
test('both shots bounce at their own wall once, remain within bounds, then accelerate downward with a speed cap',()=>{
 for(const difficulty of ['normal','gentle'])for(const x of [112,180,236]){
  const w=world(0,difficulty);w.boss.x=x;
  for(const spec of W.createPair(w,w.boss,0)){
   const b=bullet(w,spec),initialY=b.vy,initialSpin=b.spinAngle;let bounced=0,bounceTime=0,bounceY=0,after=[];
   for(let i=0;i<460&&b.y<700;i++){
    tick(b);assert(b.x>=b.r-1e-8&&b.x<=360-b.r+1e-8);
    if(b.bouncePoint){bounced++;bounceTime=b.age;bounceY=b.y;assert.equal(b.bounceCount,1);assert(Math.abs(b.bouncePoint.x-(spec.spinRate<0?b.r:360-b.r))<1e-8);assert(b.bouncePoint.fraction>=0&&b.bouncePoint.fraction<=1);}
    if(b.bounceCount)after.push(b.vy);
    assert(b.vy<=b.weaponMaxDownSpeed+1e-9);
   }
   assert.equal(bounced,1);assert(bounceTime>0&&bounceTime<2.3);assert(after.length>30);assert(after.at(-1)>after[0]);assert(after[0]>initialY);assert(b.y>bounceY);assert.notEqual(b.spinAngle,initialSpin);
  }
 }
});
test('spin is visual only: it never changes translational velocity or circular collision geometry',()=>{
 const w=world(),spec=W.createPair(w,w.boss,0)[0],a=bullet(w,spec),b=bullet(w,spec);a.spinRate=0;b.spinRate=13;
 for(let i=0;i<180;i++){tick(a);tick(b);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.vx,b.vx);assert.equal(a.vy,b.vy);assert.equal(a.angle,b.angle);assert.equal(a.r,b.r);}
 assert.notEqual(a.spinAngle,b.spinAngle);
});
test('bent wall path tests both temporally matched collision segments rather than only endpoint chord',()=>{
 // Deliberate swept-geometry stress fixture; speed here is not a game speed.
 const b={px:300,py:510,x:300,y:510,bouncePoint:{x:349,y:510,fraction:.5}};
 assert.equal(W.distanceSquared(b,344,510,344,510),0);
 assert.equal((b.px-344)**2,1936);
 const moving={px:300,py:500,x:300,y:520,bouncePoint:{x:349,y:510,fraction:.5}};
 assert.equal(W.distanceSquared(moving,344,500,344,520),0);
});
test('odd beat volleys become slow-to-fast once and preserve pre-existing authored acceleration',()=>{
 const w=world();w.phaseTime=421/60;const s=[{ownerId:33,speed:100,kind:'orb'},{ownerId:33,speed:70,acceleration:18,maxSpeed:120},{ownerId:44,speed:100},{ownerId:33,speed:130,weaponMotion:true}];
 W.prepareEmission(w,s);assert.equal(s[0].speed,55.00000000000001);assert.equal(s[0].acceleration,45);assert.equal(s[0].accelerateAt,.9);assert.equal(s[0].maxSpeed,140);assert.equal(s[1].speed,70);assert.equal(s[1].acceleration,18);assert.equal(s[2].speed,100);assert.equal(s[3].speed,130);
 W.prepareEmission(w,s);assert.equal(s[0].speed,55.00000000000001,'deferred retries do not repeatedly slow');
 w.phaseTime=1;const plain=[{ownerId:33,speed:100}];W.prepareEmission(w,plain);assert.equal(plain[0].speed,100);
 w.phaseTime=421/60;W.prepareEmission(w,plain);assert.equal(plain[0].speed,100,'an even-beat queued group cannot slow when drained in an odd beat');
});
