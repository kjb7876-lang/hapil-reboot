'use strict';
// Independent fixed-step combat observations. Grid timing/isolated collision
// fixtures do not claim a human or device playthrough. Damage, movement speed,
// HP and i-frames are unmodified after the explicitly selected start point.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
function phaseFixture(bossIndex,phase,difficulty='normal'){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex,difficulty,seed:811,runId:'independent-pattern-qa'});
 w.phase=phase;w.boss.phase=phase;w.phaseTime=0;w.autoAttack=false;w.skillRotation=false;return w;
}
function gridStart(index,difficulty='normal'){
 const w=phaseFixture(index,1,difficulty);
 // Put the phase clock immediately before an actual phase-1 odd-cycle grid.
 // This deliberately isolates the grid from prior attacks; it is not natural
 // progression. Subsequent state, movement and collision are real core logic.
 w.phaseTime=(420+72)/60;core.step(w,{});
 return w;
}
function grid(w){return w.hazards.filter(h=>h.patternId==='boss-grid-v1');}
const near=(a,b,eps=1e-7)=>Math.abs(a-b)<=eps;
test('every boss creates a committed # from two vertical and two horizontal lasers with explicit full warning',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=gridStart(index,difficulty),h=grid(w);assert.equal(h.length,4,`${index}/${difficulty}`);
  assert.equal(new Set(h.map(x=>x.castId)).size,1);assert(h.every(x=>x.ownerId===w.boss.id));
  const vertical=h.filter(x=>near(x.x1,x.x2)),horizontal=h.filter(x=>near(x.y1,x.y2));
  assert.equal(vertical.length,2);assert.equal(horizontal.length,2);
  assert(vertical.every(x=>near(x.y1,0)&&near(x.y2,680)));assert(horizontal.every(x=>near(x.x1,0)&&near(x.x2,680)));
  assert(vertical[1].x1-vertical[0].x1>=130);assert(horizontal[1].y1-horizontal[0].y1>=110);
  for(const line of h){assert.equal(line.phase,'warning');assert.equal(line.warningTicks,difficulty==='gentle'?108:96);assert.equal(line.activeAt-line.born,line.warningTicks);assert.equal(line.fadeAt-line.activeAt,difficulty==='gentle'?18:24);assert.equal(line.expireAt-line.fadeAt,15);}
 }
});
test('grid warning causes no damage and its first active tick damages exactly on the committed ray',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=gridStart(index,difficulty),lines=grid(w),line=lines.find(h=>near(h.x1,h.x2));assert(line);
  w.player.x=line.x1;w.player.y=300;const hp=w.player.hp,hits=w.stats.hits,geometry=lines.map(h=>[h.x1,h.y1,h.x2,h.y2,h.width]);
  while(w.tick<line.activeAt-1){core.step(w,{});assert.equal(w.player.hp,hp);assert.equal(w.stats.hits,hits);}
  assert.deepEqual(lines.map(h=>[h.x1,h.y1,h.x2,h.y2,h.width]),geometry);
  core.step(w,{});assert.equal(w.tick,line.activeAt);assert.equal(line.phase,'active');assert.equal(w.player.hp,hp-1);assert.equal(w.stats.hits,hits+1);assert.equal(w.boss.releaseTick,w.tick);
 }
});
test('normal HP and legal focus speed can escape the # intersection before activation',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=gridStart(index,difficulty),lines=grid(w),v=lines.find(h=>near(h.x1,h.x2)),h=lines.find(h=>near(h.y1,h.y2)&&h.y1>500);assert(v&&h);
  w.player.x=v.x1;w.player.y=h.y1;const hp=w.player.hp;let prevX=w.player.x,prevY=w.player.y;
  while(w.tick<lines[0].fadeAt){
   core.step(w,{dx:180-w.player.x,dy:480-w.player.y,focus:true});
   assert(Math.hypot(w.player.x-prevX,w.player.y-prevY)<=2.0000001,'only ordinary focus movement');
   prevX=w.player.x;prevY=w.player.y;assert.equal(w.player.hp,hp,`${index}/${difficulty}/${w.tick}`);
  }
  assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);
 }
});

test('both boss-owned rotating weapon shots bounce once then accelerate downward with bounded pools',()=>{
 // Observation fixture holds damage immunity and disables player attacks only
 // to keep a whole phase open. It does not establish a natural clear.
 let totalSamples=0;
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=phaseFixture(index,0,difficulty);w.player.x=180;w.player.y=614;w.player.invulnerableUntil=999999;
  const previous=new Map(),bounceIds=new Set(),acceleratedIds=new Set(),firstPair=[];let births=0;
  for(let n=0;n<1000;n++){
   core.step(w,{});
   const weapons=w.bullets.filter(b=>b.kind==='boss-weapon');
   const spawned=weapons.filter(b=>near(b.age,core.FIXED_DT));
   if(spawned.length){assert.equal(spawned.length,2,`${index}/${difficulty}: two at release`);births++;if(!firstPair.length)firstPair.push(...spawned.map(b=>b.id));assert.equal(w.boss.releaseTick,w.tick);}
   for(const b of weapons){
    totalSamples++;assert.equal(b.ownerId,w.boss.id);assert.equal(b.patternId,'boss-weapon-throw');assert.equal(b.r,11);assert.equal(b.halfLength,0);assert(b.bounceCount===0||b.bounceCount===1);assert(b.x>=b.r-1e-7&&b.x<=core.W-b.r+1e-7);
    const old=previous.get(b.id);
    if(old){
     assert.notEqual(b.spinAngle,old.spinAngle,'visual rotation advances independently');
     assert(b.bounceCount>=old.bounceCount,'bounce count never decreases');
     if(b.bouncePoint){
      assert.equal(old.bounceCount,0);assert.equal(b.bounceCount,1);assert(b.bouncePoint.fraction>=0&&b.bouncePoint.fraction<=1);
      assert(near(b.bouncePoint.x,b.r)||near(b.bouncePoint.x,core.W-b.r));
      assert(old.vx*b.vx<0,'side wall reverses horizontal travel');assert(b.vy>0,'after bounce weapon travels down');bounceIds.add(b.id);
     }else if(b.bounceCount===1){
      assert(b.vy>=old.vy-1e-9,'downward speed must not decrease after bounce');
      assert(b.vy<=b.weaponMaxDownSpeed+1e-9);if(b.vy>old.vy+1e-6)acceleratedIds.add(b.id);
     }
    }
    previous.set(b.id,{x:b.x,y:b.y,vx:b.vx,vy:b.vy,spinAngle:b.spinAngle,bounceCount:b.bounceCount});
   }
  }
  assert(births>=2,`${index}/${difficulty}: repeated pairs`);assert.equal(firstPair.length,2);
  for(const id of firstPair){assert(bounceIds.has(id),`${index}/${difficulty}/${id} did not reach a wall`);assert(acceleratedIds.has(id),`${index}/${difficulty}/${id} did not accelerate`);}
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);assert(w.stats.peakBullets<=core.CAPS.bullets);assert(w.hazards.length<=core.CAPS.hazards);
 }
 assert(totalSamples>=1000,`only ${totalSamples} weapon samples`);
});

test('rhythm volleys travel slowly first, then accelerate after their delay without changing heading',()=>{
 for(const difficulty of ['normal','gentle'])for(let index=0;index<5;index++){
  const w=phaseFixture(index,0,difficulty);w.phaseTime=(420+126)/60;w.player.x=180;w.player.y=614;
  core.step(w,{});
  const b=w.bullets.find(x=>x.ownerId===w.boss.id&&x.kind!=='boss-weapon'&&x.acceleration>0);assert(b,`${index}/${difficulty}: no accelerating rhythm volley`);
  const start=Math.hypot(b.vx,b.vy),angle=b.angle;assert(b.accelerateAt>=.65&&b.accelerateAt<=1);assert(start<b.maxSpeed);
  while(b.age<b.accelerateAt-1/60){core.step(w,{});assert(near(Math.hypot(b.vx,b.vy),start,1e-7));assert(near(b.angle,angle));}
  const ageAtAcceleration=b.age;while(w.bullets.includes(b)&&b.age<ageAtAcceleration+.45)core.step(w,{});
  assert(w.bullets.includes(b),`${index}/${difficulty}: bullet vanished before acceleration was measurable`);
  assert(Math.hypot(b.vx,b.vy)>start,`${index}/${difficulty}: speed did not increase`);assert(Math.hypot(b.vx,b.vy)<=b.maxSpeed+1e-7);assert(near(b.angle,angle));
 }
});
