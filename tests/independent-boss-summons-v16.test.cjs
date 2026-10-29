'use strict';
// Real normal-health gameplay input, no forced HP, invulnerability or enemy placement.
const test=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
test('each encounter naturally creates living support actors that take auto-shot damage, fire, and can be defeated',()=>{
 for(let i=0;i<12;i++){
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,difficulty:'normal',seed:813,runId:'independent-support-'+i});
  let created=false,damage=false,fire=false,ids=new Set();
  for(let t=0;t<900&&w.stage==='boss';t++){
   core.step(w,{});
   for(const e of w.enemies){if(e.summoned){created=true;ids.add(e.id);if(e.hp>0&&e.hp<e.maxHp)damage=true;}}
   if(w.bullets.some(b=>ids.has(b.ownerId)))fire=true;
  }
  assert(created,`${i}: no support actor`);assert(damage,`${i}: no real incoming player damage`);
  assert(fire,`${i}: no support-origin bullet`);assert(w.kills>0,`${i}: support actor never defeated`);
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 }
});

test('all five original signatures with live firing support retain a five-cycle focus-speed no-hit route',()=>{
 const base=require('../tools/natural-bot-policy.cjs'),factory=require('../tools/hell-forecast-policy.cjs');
 for(const difficulty of ['normal','gentle'])for(let i=0;i<5;i++){
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,difficulty,seed:813,runId:'v16-focus-route'});
  // Controlled phase fixture. Ordinary HP, damage and natural hit rules remain
  // unchanged. Automatic attack is disabled to observe five whole cycles.
  w.phase=2;w.phaseTime=0;w.boss.phase=2;w.autoAttack=false;w.skillRotation=false;
  const directions=base.directions.map(([x,y])=>[x/2,y/2]);
  const f=factory({route:'centre',y:580,beam:20,commit:4},{directions,linearMove:base.linearMove}),view={};
  let supports=0,fired=false;const initialHP=w.player.hp;
  for(let n=0;n<2100&&w.stage==='boss';n++){
   // QA-only shallow view selects the forecasting input policy; it never
   // changes live difficulty or game state. Only visible live hazards are used.
   Object.assign(view,w,{difficulty:'hell'});const k=f.move(view),x=w.player.x,y=w.player.y;
   core.step(w,{dx:directions[k][0],dy:directions[k][1],focus:true});
   assert(Math.hypot(w.player.x-x,w.player.y-y)<=2.0000001,'ordinary focus speed');
   supports=Math.max(supports,w.enemies.filter(e=>e.summoned).length);
   if(w.bullets.some(b=>w.enemies.some(e=>e.summoned&&e.id===b.ownerId)))fired=true;
  }
  assert.equal(w.tick,2100,`${difficulty}/${i}: stage ended`);assert.equal(w.player.hp,initialHP);
  assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);
  assert.equal(supports,2);assert(fired,`${difficulty}/${i}: no live support fire`);
 }
});
