'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
require('../src/boss-motion.js');
const motion=global.HapilBossMotion;

test('boss strike pose follows actual owned projectile and beam activation in all five encounters and phases',()=>{
 for(const difficulty of ['normal','gentle']) for(let bossIndex=0;bossIndex<5;bossIndex++) for(let phase=0;phase<3;phase++){
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex,difficulty,seed:100});
  // Explicit combat fixture: suppress player damage and attacks so the full
  // pattern can be observed; this is not a natural progression test.
  w.phase=phase;w.phaseTime=0;w.boss.phase=phase;w.boss.hp=1e9;w.player.invulnerableUntil=999999;w.autoAttack=false;w.skillRotation=false;
  let projectileReleases=0,beamActivations=0;
  for(let t=0;t<360;t++){
   core.step(w,{});
   const emitted=w.bullets.some(b=>b.ownerId===w.boss.id&&Math.abs(b.age-1/60)<1e-9);
   const activated=w.hazards.some(h=>h.ownerId===w.boss.id&&h.activeAt===w.tick&&h.phase==='active');
   if(emitted)projectileReleases++;
   if(activated)beamActivations++;
   if(emitted||activated){
    assert.equal(w.boss.releaseTick,w.tick,`${bossIndex}/${phase}/${difficulty}/${w.tick}`);
    assert.deepEqual(motion.sample(w,w.boss),{from:1,to:1,blend:1},`${bossIndex}/${phase}/${difficulty}/${w.tick}`);
   }
  }
  assert(projectileReleases>0,`${bossIndex}/${phase}/${difficulty}: no projectiles observed`);
  if((bossIndex!==2&&phase===1)||(bossIndex===2&&phase!==1))assert(beamActivations>0,`${bossIndex}/${phase}/${difficulty}: no active beam observed`);
 }
});

test('warning does not itself trigger a release pose',()=>{
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:0});
 w.phase=1;w.boss.phase=1;w.autoAttack=false;w.player.invulnerableUntil=99999;
 while(!w.hazards.length)core.step(w,{});
 assert.equal(w.hazards[0].phase,'warning');assert.equal(w.boss.releaseTick,-1);
});

test('a deferred group marks the actual emission tick instead of the saturated request tick',()=>{
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:0});
 w.autoAttack=false;w.player.invulnerableUntil=99999;
 for(let i=0;i<core.CAPS.bullets;i++)w.bullets.push({x:16,y:20,px:16,py:20,vx:0,vy:0,r:1,angle:0,age:0,ttl:100,ownerId:0});
 for(let i=0;i<109;i++)core.step(w,{});
 assert(w._deferred.length>0);assert.equal(w.boss.releaseTick,-1);
 w.bullets.splice(0,64);core.step(w,{});
 assert.equal(w.boss.releaseTick,w.tick);assert(w.bullets.some(b=>b.ownerId===w.boss.id));
 assert.deepEqual(motion.sample(w,w.boss),{from:1,to:1,blend:1});
});
