'use strict';
// Independent observed-engine tests. Quantitative density/rotor observation
// fixtures are immune; the disclosed-warning reaction test uses ordinary HP.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),policy=require('../tools/natural-bot-policy.cjs'),measurement=require('../tools/measure-hell-overlap-sim.cjs');
const GATE='hell-overlap-lattice-v14',FAN='hell-overlap-fan-v14',ROTOR='hell-overlap-rotor-v14';
test('HELL is measurably faster, denser and more continuous for all12 signatures rather than only relabelled',()=>{
 for(let index=0;index<12;index++){
  const normal=measurement.measure(index,'normal'),hell=measurement.measure(index,'hell');
  assert(hell.emittedBullets>normal.emittedBullets*1.5,`${index}: emission frequency`);
  assert(hell.meanBirthSpeed>normal.meanBirthSpeed*1.5,`${index}: emitted speed`);
  assert(hell.meanOccupiedCells>normal.meanOccupiedCells*1.15,`${index}: lower-lane occupied cells`);
  assert(hell.peakBullets>normal.peakBullets,`${index}: more simultaneous bodies`);
  assert(hell.activeBeamFrames>=480&&hell.activeBeamFrames>normal.activeBeamFrames);
  assert(hell.simultaneousFrames>=300&&hell.lowerFanSimultaneousFrames>=150,`${index}: live four-layer lower-lane overlap`);
  assert(hell.maxObservedSpeed<=450);assert(hell.peakBullets<=300);
  assert.equal(hell.poolPressure,0);assert.equal(hell.droppedGroups,0);
 }
});

test('all12 hardest phases can react only after the warning from an on-ray start with legal input and no immunity fixture',()=>{
 for(let index=0;index<12;index++)for(const seed of [813,42]){
  const initial=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty:'hell',seed,runId:'actual-overlap-ordinary-hp'}),s=core.checkpoint(initial);
  // Select a valid phase boundary before any attack exists. Hold its legal
  // initial on-ray position until a visible warning actually appears.
  s.phase=2;s.player.x=[180,112,248][(index+2)%3]-54;
  const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;
  assert.equal(w.player.hp,3);assert.equal(w.player.invulnerableUntil,0);
  while(w.tick<73)core.step(w,{});
  const first=w.hazards.find(h=>h.patternId===GATE);assert(first);assert.equal(w.player.x,first.x1);assert.equal(w.stats.hits,0);
  const fade=first.fadeAt;let lowerOverlap=0;
  while(w.tick<fade&&w.stage==='boss'){
   const previous={x:w.player.x,y:w.player.y},before=JSON.stringify(w),key=policy.move(w);assert.equal(JSON.stringify(w),before,'input policy cannot mutate simulation');
   const d=policy.directions[key];core.step(w,{dx:d[0],dy:d[1]});
   assert(Math.hypot(w.player.x-previous.x,w.player.y-previous.y)<=4.0000001,'only ordinary 240px/sec movement');
   for(const h of w.hazards)if(h.phase==='active'&&h.patternId===GATE)assert(core.geometry.hazardDistanceSquared(h,previous.x,previous.y,w.player.x,w.player.y)>(h.width/2+w.player.r)**2,'no beam crossing hidden by ordinary hit i-frames');
   const active=w.hazards.some(h=>h.patternId===GATE&&h.phase==='active'),fan=w.bullets.some(b=>b.patternId===FAN&&b.y>=450&&b.y<=614),signature=w.bullets.some(b=>b.patternId===core.CAMPAIGN_SIGNATURES[index].id),rotor=w.bullets.some(b=>b.patternId===ROTOR&&b.weaponMotion);
   if(active&&fan&&signature&&rotor)lowerOverlap++;
  }
  assert.equal(w.stage,'boss');assert(w.player.hp>=1&&w.player.hp<=3,`${index}/${seed}: legal reaction must remain survivable`);assert(lowerOverlap>=20,'the reaction route must retain actual concurrent hazards');
 }
});

test('the physical rotating layer of everyboss damages via its live swept-circle body, including the seven spell rotors',()=>{
 for(let index=0;index<12;index++){
  const w=measurement.fixture(index,2,'hell');let rotor=null;
  for(let t=0;t<600&&!rotor;t++){core.step(w,{});rotor=w.bullets.find(b=>b.patternId===ROTOR&&b.weaponMotion&&b.y>=290&&b.y<=590&&b.x>=24&&b.x<=336);}
  assert(rotor,`${index}: no physical rotor reaches player space`);assert.equal(rotor.bounceCount,1);assert.equal(rotor.kind,index<5?'boss-weapon':'hell-rotor');
  function isolated(offset){
   const x=structuredClone(w);x.stage='waves';x.waveTime=0;x.boss=null;x.bullets=[structuredClone(rotor)];x.hazards=[];x.enemies=[];x.shots=[];x.effects=[];x._deferred=[];x._warnings=[];x._delays=[];
   x.player.x=rotor.x+offset;x.player.y=rotor.y;x.player.hp=3;x.player.invulnerableUntil=0;return x;
  }
  // Deliberate one-projectile collision fixture; the concurrent route above
  // and full natural recordings are separate from this negative control.
  const hit=isolated(0),miss=isolated(rotor.x<180?25:-25);core.step(hit,{});core.step(miss,{});
  assert.equal(hit.player.hp,2);assert.equal(miss.player.hp,3);assert.equal(hit.stats.hits,w.stats.hits+1);assert.equal(miss.stats.hits,w.stats.hits);
 }
});
