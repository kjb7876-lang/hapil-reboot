'use strict';
// Controlled timing, density and phase observations. Invulnerable observation
// fixtures below are explicitly not natural progression or device benchmarks.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js');
const GATE='hell-overlap-lattice-v14',FAN='hell-overlap-fan-v14',ROTOR='hell-overlap-rotor-v14';
function fixture(index,phase=0,seed=813){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty:'hell',seed,runId:'hell-v14-fixture'});
 w.phase=phase;w.boss.phase=phase;w.boss.hp=1e9;w.autoAttack=false;w.skillRotation=false;
 return w;
}
function advance(w,tick,input={}){while(w.tick<tick)core.step(w,input);}
function snapshotState(w){return {tick:w.tick,rng:w.rngState,player:w.player,score:w.score,bullets:w.bullets,hazards:w.hazards,stats:w.stats};}

test('all12 bosses and all3 phases overlap real player-lane bullets, active rays, own signature and physical rotors',()=>{
 for(let index=0;index<12;index++)for(let phase=0;phase<3;phase++){
  const w=fixture(index,phase);w.player.invulnerableUntil=999999;
  let simultaneous=0,peakBullets=0,peakHazards=0;
  for(let tick=0;tick<1050;tick++){
   core.step(w,{});peakBullets=Math.max(peakBullets,w.bullets.length);peakHazards=Math.max(peakHazards,w.hazards.length);
   if(!w.hazards.some(h=>h.patternId===GATE&&h.phase==='active'))continue;
   const incoming=w.bullets.some(b=>b.patternId===FAN&&b.y>=450&&b.y<=614&&Math.hypot(b.vx,b.vy)>=198);
   const signature=w.bullets.some(b=>b.patternId===core.CAMPAIGN_SIGNATURES[index].id);
   const rotor=w.bullets.some(b=>b.patternId===ROTOR&&b.weaponMotion&&Number.isFinite(b.spinAngle)&&b.kind===(index<5?'boss-weapon':'hell-rotor'));
   if(incoming&&signature&&rotor)simultaneous++;
  }
  assert(simultaneous>=20,`${index}/${phase}: no genuine lower-lane overlap`);
  assert(peakBullets<=300,`${index}/${phase}: density regression`);assert(peakHazards<=10);
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
  assert.equal(w.boss.hellMechanicsRevision,15);assert(w.boss.skillReleases.length<=8);
  if(index>=5)assert(!w.bullets.some(b=>b.kind==='boss-weapon'),'new spells must not masquerade as a handheld weapon');
 }
});

test('HELL gate has108 harmless warning ticks, fixed geometry and96 genuinely damaging ticks',()=>{
 const observed=fixture(4,2);advance(observed,73);
 const source=observed.hazards.find(h=>h.patternId===GATE);assert(source);
 assert.equal(source.warningTicks,108);assert.equal(source.activeTicks,96);assert.equal(source.width,10);
 // Isolate one already-created capsule from the combined attack to test the
 // exact damage boundary with ordinary health and no immunity fixture.
 const w=fixture(4,2);w.stage='transition';w.boss=null;w.tick=source.born;w.hazards=[structuredClone(source)];w.bullets=[];
 w.player.x=source.x1;w.player.y=540;const coordinates=[source.x1,source.y1,source.x2,source.y2];
 while(w.tick<source.activeAt-1){core.step(w,{});assert.equal(w.player.hp,3);assert.equal(w.hazards[0].phase,'warning');}
 assert.deepEqual([w.hazards[0].x1,w.hazards[0].y1,w.hazards[0].x2,w.hazards[0].y2],coordinates);
 core.step(w,{});assert.equal(w.hazards[0].phase,'active');assert.equal(w.player.hp,2);assert.equal(w.stats.hits,1);
 assert.equal(w.hazards[0].fadeAt-w.hazards[0].activeAt,96);
});

test('every announced ray aperture is reachable with legal focus movement and unchanged HP',()=>{
 for(let index=0;index<12;index++)for(let phase=0;phase<3;phase++){
  const observed=fixture(index,phase);advance(observed,73);const cast=observed.boss.hellOverlap;
  const rays=observed.hazards.filter(h=>h.patternId===GATE);assert.equal(rays.length,2);
  assert.equal(cast.corridorHalfWidth,24);assert.equal(cast.laserActiveAt-rays[0].born,108);
  const w=fixture(index,phase);w.stage='transition';w.boss=null;w.tick=rays[0].born;w.hazards=rays.map(h=>structuredClone(h));w.bullets=[];
  w.player.x=rays[0].x1;w.player.y=540;
  while(w.tick<rays[0].fadeAt){
   const x=w.player.x;core.step(w,{dx:cast.corridorX-w.player.x,focus:true});assert(Math.abs(w.player.x-x)<=2.00000001);
  }
  assert.equal(w.player.hp,3);assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);
 }
});

test('saturated HELLatomic rotor pair never returns late or creates a fictitious release record',()=>{
 const w=fixture(0);w.player.invulnerableUntil=999999;advance(w,126);
 for(let i=0;i<core.CAPS.bullets;i++)w.bullets.push({id:-i,x:16,y:20,px:16,py:20,vx:0,vy:0,r:1,angle:0,age:0,ttl:100,ownerId:0});
 core.step(w,{});assert.equal(w.tick,127);assert.equal(w.boss.hellOverlap.pairReleaseTick,-1);
 assert(!w._deferred.some(group=>group.some(s=>s.patternId===ROTOR)));
 assert(!w.boss.skillReleases||!w.boss.skillReleases.some(r=>r.patternId===ROTOR));
 w.bullets.splice(0,100);advance(w,180);
 assert(!w.bullets.some(b=>b.patternId===ROTOR));assert(!w.boss.skillReleases.some(r=>r.patternId===ROTOR));
 assert(w.boss.skillReleases.every(r=>Number.isInteger(r.tick)&&r.tick<=w.tick));assert(w.boss.skillReleases.length<=8);
});

test('safe-phase HELL snapshots resume the same seeded concurrent combat without new save keys',()=>{
 const a=core.createRun({campaign:true,practiceBoss:true,bossIndex:11,difficulty:'hell',seed:42,runId:'v14-checkpoint'});
 const saved=core.checkpoint(a),b=core.restoreCheckpoint(saved);assert.equal(b.mechanicsRevision,15);assert.equal(saved.campaignRevision,3);
 assert(!Object.hasOwn(saved,'hellOverlap'));assert(!Object.hasOwn(saved,'skillReleases'));
 a.player.invulnerableUntil=999999;b.player.invulnerableUntil=999999;a.autoAttack=false;b.autoAttack=false;a.skillRotation=false;b.skillRotation=false;
 for(let t=0;t<650;t++){const input={dx:Math.sin(t*.017)*1.8,dy:Math.cos(t*.013)*.8,focus:true};core.step(a,input);core.step(b,input);assert.deepEqual(snapshotState(a),snapshotState(b));}
});
