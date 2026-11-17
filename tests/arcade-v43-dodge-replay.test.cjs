'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
const {directions,routes}=require('./fixtures/arcade-v43-dodge-routes.json');
// Fixed real input recordings complement the optimistic field-reachability
// audit. Aiming, shots, slowdown and obstacle destruction all follow this exact
// player trajectory. No invulnerability, bombs or evasion are injected.
// Representative regression routes only: they do not prove all player choices.
for(const route of routes)for(const difficulty of ['normal','hell'])test(`real dodge replay: ${route.name} / ${difficulty}${route.compact?' / mobile':''}`,()=>{
 const s=a.createRun({difficulty,compact:route.compact,seed:route.seed,segment:route.segment,distort:false});
 assert.equal(a.SEGMENTS[route.segment].name,route.name,'recording still addresses the intended pattern');
 s.bombs=0;let ticks=0;
 for(const [direction,count] of route.inputs){const [dx,dy]=directions[direction];assert(Math.hypot(dx,dy)<=4.01);
  for(let i=0;i<count;i++){
   // Keep the boss alive so the entire attack duration is exercised. This does
   // not modify the player, hazards, collision geometry or defense resources.
   if(s.stage==='card')s.boss.hp=s.boss.maxHp;
   a.step(s,{dx,dy});ticks++;
   assert.equal(s.hits,0,`hit at tick ${s.tick}`);assert.equal(s.autoBombs,0);assert.equal(s.distorts,0);assert.equal(s.bombsUsed,0);
   s.events.length=s.cancelled.length=s.pops.length=0;
  }
 }
 assert.equal(ticks,route.ticks);assert.notEqual(s.seg,route.segment,'survives to the next segment');
});
