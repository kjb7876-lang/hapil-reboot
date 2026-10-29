'use strict';
// Explicit phase-combat fixtures, not natural campaign-clear or mobile GPU tests.
// The dodge test uses normal HP/collision, without 777 or invulnerability.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
function fixture(bossIndex,difficulty='normal'){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex,difficulty,seed:813,runId:'signature-fixture'});
 w.phase=2;w.phaseTime=0;w.boss.phase=2;w.autoAttack=false;w.skillRotation=false;
 return w;
}
function atTick(w,n){while(w.tick<n)core.step(w,{});return w;}
function sample(w){return JSON.stringify({tick:w.tick,boss:w.boss,bullets:w.bullets,hazards:w.hazards,stats:w.stats});}

test('five original signatures run from normal campaign phase 3 deterministically, with bounded density and readable recovery',()=>{
 assert.equal(new Set(core.CAMPAIGN_SIGNATURES.map(s=>s.id)).size,5);
 for(const difficulty of ['normal','gentle'])for(let bossIndex=0;bossIndex<5;bossIndex++){
  const a=fixture(bossIndex,difficulty),b=fixture(bossIndex,difficulty),id=core.CAMPAIGN_SIGNATURES[bossIndex].id;
  // Full-clock observation only: suppress fixture damage without hiding the
  // separate ordinary-HP dodge and negative-control tests below.
  a.player.invulnerableUntil=b.player.invulnerableUntil=999999;
  let releases=0,beams=0;
  for(let n=0;n<2100;n++){
   core.step(a,{});core.step(b,{});
   const fresh=a.bullets.filter(b=>Math.abs(b.age-1/60)<1e-8);
   const active=a.hazards.filter(h=>h.activeAt===a.tick);
   if(fresh.length||active.length){
    assert.equal(a.boss.releaseTick,a.tick,'actual release drives attack pose');releases++;
   }
   for(const bullet of a.bullets)assert.equal(bullet.patternId,id);
   for(const h of a.hazards){assert.equal(h.patternId,id);assert(h.warningTicks>=66);}
   beams+=active.length;
   if((a.tick-1)%420>=282)assert.equal(fresh.length,0,'recovery cannot add a bullet group');
   if(n%60===0)assert.equal(sample(a),sample(b));
  }
  assert(releases>5);if([0,2,4].includes(bossIndex))assert(beams>0);
  assert(a.stats.peakBullets<=100,`${id}/${difficulty}: ${a.stats.peakBullets}`);
  assert.equal(a.stats.poolPressure,0);assert.equal(a.stats.droppedGroups,0);assert.equal(a._deferred.length,0);
  assert.equal(a.boss.specialPatternId,id);assert(a.boss.specialPatternLabel);assert(a.boss.patternHint);
 }
});

test('all signatures have a collision-free moving route at ordinary focus speed over five cycles',()=>{
 for(const difficulty of ['normal','gentle'])for(let bossIndex=0;bossIndex<5;bossIndex++){
  const w=fixture(bossIndex,difficulty),hp=w.player.hp;
  // Readable, pre-planned route fixture using the real movement clamp, normal
  // health and collision. This proves a route exists; it is not a natural clear.
  // Slow bullets take roughly four seconds to reach the lower dodge area.
  for(let n=0;n<2100;n++){
   let cycle=Math.floor(n/420);
   // The prior pillar's slow embers cross the old lane briefly; begin the
   // next lateral move36 ticks into the new (longer) recovery/charge.
   if(bossIndex===2&&cycle>0&&n%420<36)cycle--;
   const target=bossIndex===2?(cycle%2?252:108):180+Math.sin(Math.floor(Math.max(0,n-258)/420)*.8)*100;
   const previousX=w.player.x;
   core.step(w,{dx:target-w.player.x,focus:true});
   assert(Math.abs(w.player.x-previousX)<=2.00000001,'ordinary focus-speed movement only');
  }
  assert.equal(w.player.hp,hp,`${bossIndex}/${difficulty}`);assert.equal(w.stats.hits,0);
  assert.equal(w.player.invulnerableUntil,0);assert.equal(w.stage,'boss');
 }
});

test('stationary centre is not a universal safe spot in any signature',()=>{
 for(const difficulty of ['normal','gentle'])for(let bossIndex=0;bossIndex<5;bossIndex++){
  const w=fixture(bossIndex,difficulty);
  for(let n=0;n<2100&&w.stage==='boss';n++)core.step(w,{});
  assert(w.stats.hits>0,`${bossIndex}/${difficulty}: holding centre must require a dodge`);
 }
});

test('Balrog commits five of seven pillar rays, warns first, then deals damage only at activation',()=>{
 const w=fixture(2);atTick(w,73);
 assert.equal(w.hazards.length,5);
 assert.deepEqual(w.hazards.map(h=>h.x1),[36,180,228,276,324]);
 assert(w.hazards.every(h=>h.warningTicks===78&&h.width===8));
 const ray=w.hazards[0],geometry=w.hazards.map(h=>[h.x1,h.y1,h.x2,h.y2]);
 w.player.x=36;
 while(w.tick<ray.activeAt-1){core.step(w,{});assert.equal(w.stats.hits,0);}
 assert.deepEqual(w.hazards.map(h=>[h.x1,h.y1,h.x2,h.y2]),geometry,'warning aim never tracks player');
 core.step(w,{});assert.equal(w.stats.hits,1);assert.equal(ray.phase,'active');assert.equal(w.boss.releaseTick,w.tick);
 atTick(w,199);assert.equal(w.bullets.length,0,'follow-up waits for all pillars to finish');
 atTick(w,205);assert(w.bullets.length>0);
});

test('Horn slow memory ring accelerates only after its announced delay and remains speed capped',()=>{
 const w=fixture(1);atTick(w,127);
 const bullet=w.bullets.find(b=>b.acceleration);assert(bullet);assert.equal(bullet.accelerateAt,1.15);
 while(bullet.age<1.1)core.step(w,{});
 assert(Math.abs(Math.hypot(bullet.vx,bullet.vy)-42)<1e-8);
 while(bullet.age<1.5)core.step(w,{});
 assert(Math.hypot(bullet.vx,bullet.vy)>42);assert(Math.hypot(bullet.vx,bullet.vy)<=112);
});
