'use strict';
// Core phase fixtures use ordinary HP/collision and no 777. Auto attack is
// deliberately disabled only to observe attack timing without phase removal.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),W=require('../src/weapon-patterns.js');
function fixture(i,difficulty){const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,difficulty,seed:813});w.autoAttack=false;w.skillRotation=false;return w;}
test('five bosses announce their own two shots, release on the real tick and bounce once in both difficulties',()=>{
 for(let i=0;i<5;i++)for(const difficulty of ['normal','gentle']){
  const w=fixture(i,difficulty),seen=new Map();let warningTicks=0,spawned=0;
  for(let n=0;n<500&&w.stage==='boss';n++){
   core.step(w,{});if(w.boss.weaponTelegraph)warningTicks++;
   for(const b of w.bullets.filter(b=>b.kind===W.KIND)){
    if(!seen.has(b.id)){seen.set(b.id,{bounces:0,firstVy:b.vy,lastVy:b.vy});spawned++;assert.equal(w.tick,127);assert.equal(w.boss.releaseTick,w.tick);assert.equal(w.boss.weaponTelegraph,false);assert.equal(b.ownerId,w.boss.id);assert.equal(b.r,11);assert.equal(b.halfLength,0);}
    const s=seen.get(b.id);if(b.bouncePoint)s.bounces++;if(b.bounceCount)s.lastVy=b.vy;
   }
  }
  assert.equal(warningTicks,54);assert.equal(spawned,2);assert.equal(seen.size,2);
  for(const s of seen.values()){assert.equal(s.bounces,1);assert(s.lastVy>s.firstVy);}
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 }
});
test('a full pool skips the whole warned pair, never later emits an unseen deferred throw',()=>{
 const w=fixture(0,'normal');for(let n=0;n<126;n++)core.step(w,{});
 w.bullets=Array.from({length:767},(_,id)=>({id:id+1000,x:180,y:20,px:180,py:20,r:1,halfLength:0,vx:0,vy:0,angle:0,age:0,ttl:30,grazed:false}));
 core.step(w,{});assert.equal(w.tick,127);assert.equal(w.bullets.length,767);assert.equal(w._deferred.length,0);assert.equal(w.stats.poolPressure,1);assert.equal(w.stats.droppedGroups,1);
 w.bullets.splice(0,10);core.step(w,{});assert(!w.bullets.some(b=>b.kind===W.KIND));assert.equal(w._deferred.length,0);
});
test('core collision follows the bent bounce path even when both chord endpoints miss',()=>{
 const w=fixture(0,'normal');w.player.x=344;w.player.y=540;w.player.invulnerableUntil=0;
 const spec=W.createPair(w,w.boss,0)[1];
 const b={id:999,x:300,y:540,px:300,py:540,vx:6000,vy:0,r:11,halfLength:0,angle:0,kind:W.KIND,age:0,ttl:4,grazed:false};W.initialize(b,spec,w);w.bullets=[b];
 core.step(w,{});assert.equal(w.stats.hits,1);assert.equal(w.player.hp,2);assert.equal(w.bullets.length,0);
});
test('odd-beat slow bullets actually speed up after their delay in the game core',()=>{
 for(const difficulty of ['normal','gentle'])for(const i of [0,2,3,4]){
  const w=fixture(i,difficulty);let target=null,startSpeed=0,observedAccelerated=false;
  for(let t=0;t<650&&w.stage==='boss';t++){
   core.step(w,{});if(!target){target=w.bullets.find(b=>b.rhythmAccelerate);if(target)startSpeed=Math.hypot(target.vx,target.vy);}
   else if(w.bullets.includes(target)&&target.age>1.2){assert(Math.hypot(target.vx,target.vy)>startSpeed);assert(Math.hypot(target.vx,target.vy)<=target.maxSpeed+1e-7);observedAccelerated=true;break;}
  }
  assert(target,`${i}/${difficulty} has slow-to-fast bullets`);assert(observedAccelerated,`${i}/${difficulty} accelerates within its lifetime`);
 }
});
test('Horn keeps its existing slow-to-fast acceleration instead of stacking the new beat transform',()=>{
 for(const difficulty of ['normal','gentle']){
  const w=fixture(1,difficulty);let target=null,initial=0,observed=false;
  for(let t=0;t<310&&w.stage==='boss';t++){
   core.step(w,{});
   if(!target){target=w.bullets.find(b=>b.kind==='orb'&&b.acceleration&&!b.rhythmAccelerate);if(target)initial=Math.hypot(target.vx,target.vy);}
   else if(w.bullets.includes(target)&&target.age>1.1){assert(Math.hypot(target.vx,target.vy)>initial);assert.equal(target.acceleration,18*(difficulty==='gentle'?.82:1));observed=true;break;}
  }
  assert(observed,`${difficulty} horn accelerating orb observed`);
 }
});
