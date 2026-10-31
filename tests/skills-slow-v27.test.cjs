'use strict';
// Explicit combat fixtures verify motion/lifetime contracts, not human clears.
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js');
function world(revision=27){const w=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:0,difficulty:'normal',seed:4242,runId:'slow27-fixture'});w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function bullet(w,patch={}){const b={id:++w.idCounter,x:100,y:220,px:100,py:220,vx:0,vy:120,r:3,halfLength:0,angle:Math.PI/2,kind:'orb',age:0,ttl:6.4,ownerId:w.boss.id,grazed:false,...patch};w.bullets.push(b);return b;}
function castState(w,name,start=0){w.stats.casts[name]=1;w.skills[name+'ReadyAt']=start+({memory:144,counter:180,delay:480,ego:1800}[name]);}

test('27 is explicit and skill time scale has a smooth six-tick onset and thirty-six-tick recovery',()=>{
 assert.equal(C.PATTERN_COMBAT_REVISION,27);assert.equal(C.LATEST_COMBAT_REVISION,28);assert.equal(C.BULLET_SLOW.factor,.14);
 for(const name of ['memory','counter','delay','ego']){const w=world(),duration=C.BULLET_SLOW.durations[name];castState(w,name,20);
  let previous=1;for(let age=0;age<=6;age++){w.tick=20+age;const f=C.bulletTimeScale(w);assert(f<=previous+1e-12&&f>=.14);previous=f;}assert.equal(previous,.14);
  w.tick=20+duration;assert.equal(C.bulletTimeScale(w),.14);previous=.14;
  for(let age=1;age<=36;age++){w.tick=20+duration+age;const f=C.bulletTimeScale(w);assert(f>=previous-1e-12&&f<=1);previous=f;}assert.equal(previous,1);
 }
 for(const revision of [undefined,21,25]){const w=world(revision===undefined?25:revision);if(revision===undefined)delete w.combatRevision;castState(w,'delay');w.tick=7;assert.equal(C.bulletTimeScale(w),1);}
});

test('each actual friendly skill retains existing enemy bullets while strongly slowing movement and logical lifetime',()=>{
 for(const name of ['memory','counter','delay','ego']){
  const w=world(),b=bullet(w);w.skillRotation=true;
  if(name==='memory')w.memory=24;
  if(name==='counter'){w.memory=8;w.resonance=30;w._lastGraze=0;}
  if(name==='delay'){w.memory=60;w.skills.delayReadyAt=0;}
  if(name==='ego')w.resonance=90;
  C.step(w,{});assert.equal(w.stats.casts[name],1,name+' was really cast');w.skillRotation=false;
  for(let tick=1;tick<24;tick++)C.step(w,{});
  assert(w.bullets.includes(b),name+' cannot erase its existing enemy bullet');assert(b.y-220<120*.4*.42,name+' must move substantially less than ordinary speed');
  assert(Math.abs((b.y-220)/120-b.age)<1e-9,'movement and lifetime use the same logical clock');assert.equal(b.retiring,undefined);
 }
});

test('slow motion also governs the thrown weapon and the Arbelia slow multiplier without consuming its lifetime early',()=>{
 const w=world(),b=bullet(w,{x:180,y:180,vx:130,vy:30,angle:Math.atan2(30,130),r:11,kind:'boss-weapon',weaponMotion:true});Weapon.initialize(b,{weaponMotion:true},w);castState(w,'delay');
 const x=b.x;for(let i=0;i<30;i++)C.step(w,{});assert(b.x-x<25);assert(b.age<.2);assert.equal(b.bounceCount,0);
 const arbelia=world(),a=bullet(arbelia);arbelia.arbeliaSlowUntil=100;castState(arbelia,'delay');for(let i=0;i<30;i++)C.step(arbelia,{});assert(a.age<b.age);assert(Math.abs((a.y-220)/120-a.age)<1e-9);
});

test('expiry inside the screen becomes a finite harmless visible retirement rather than an instant disappearance',()=>{
 const w=world(),b=bullet(w,{age:6.39,ttl:6.4,x:180,y:540,vx:0,vy:0});w.player.invulnerableUntil=0;const hp=w.player.hp;
 C.step(w,{});assert(w.bullets.includes(b));assert.equal(b.retiring,true);assert.equal(b.retireAge,0);assert.equal(b.retireDuration,.35);assert.equal(w.player.hp,hp,'retiring bodies are harmless from the first fade frame');
 for(let i=0;i<20;i++){C.step(w,{});assert(w.bullets.includes(b));assert.equal(w.player.hp,hp);}
 C.step(w,{});assert(!w.bullets.includes(b),'retirement cannot remain forever during a slow skill');
});

test('invulnerability contact no longer erases a pack; a real damage hit still consumes the touching bullet',()=>{
 const w=world(),b=bullet(w,{x:180,y:540,vx:0,vy:0});C.step(w,{});assert(w.bullets.includes(b));assert.equal(w.player.hp,3);
 w.player.invulnerableUntil=0;C.step(w,{});assert(!w.bullets.includes(b));assert.equal(w.player.hp,2);
 const old=world(25),legacy=bullet(old,{x:180,y:540,vx:0,vy:0});C.step(old,{});assert(!old.bullets.includes(legacy),'legacy25 contact behavior stays unchanged');
});

test('safe checkpoint restores the same active skill-slow clock using existing cast timers',()=>{
 const w=world(),snap=C.checkpoint(w);snap.tick=80;snap.skills.delayReadyAt=480;snap.stats.casts.delay=1;
 const a=C.restoreCheckpoint(snap),b=C.restoreCheckpoint(snap);assert.equal(C.bulletTimeScale(a),.14);assert.deepEqual(C.checkpoint(a),snap);
 for(let n=0;n<180;n++){const input={dx:n%90<45?1:-1,dy:0,focus:true};C.step(a,input);C.step(b,input);assert.deepEqual(a,b);}
});

test('reflection collision tests the two real capsule paths instead of an interior chord',()=>{
 const b={px:340,py:300,x:340,y:320,halfLength:0,angle:Math.atan2(10,-16),v27PreviousAngle:Math.atan2(10,16),v27BouncePoint:{x:356,y:310,fraction:.5}};
 assert.equal(C.geometry.projectileDistanceSquared(b,340,310,340,310),0,'old chord crosses the interior point');
 assert(C.geometry.patternDistanceSquared(b,340,310,340,310)>25,'actual reflected path misses the interior point');
 assert.equal(C.geometry.patternDistanceSquared(b,356,310,356,310),0,'actual wall contact remains a collision');
});
