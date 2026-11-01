'use strict';
// Explicit immune engine fixtures verify admission and source contracts. They
// are not human/mobile-device clear or frame-rate measurements.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js'),Patterns=require('../src/boss-patterns-v27.js'),Lasers=require('../src/boss-lasers-v28.js'),Flow=require('../src/boss-flow-v29.js');
const BASE='f5bc56c9';
function load(source,internal=false){const box={HapilWeaponPatterns:Weapon,HapilBossPatternsV27:Patterns,HapilBossLasersV28:Lasers,HapilBossFlowV29:Flow};if(internal)source=source.replace('return Object.freeze({ W: W,','return Object.freeze({ _mobileTest:{spawnEnemy:spawnEnemy,summonBossAllies:summonBossAllies,bossFlow:bossFlow,flowReserved:flowReserved}, W: W,');vm.runInNewContext(source,box);return box.HapilCore;}
const T=load(fs.readFileSync(require.resolve('../src/core.js'),'utf8'),true)._mobileTest;
function world(index=0,phase=0,difficulty='hell',revision=30,core=C){const first=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'mobile30-core-contract'}),saved=core.checkpoint(first);saved.phase=phase;const w=core.restoreCheckpoint(saved);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function advance(w,tick){while(w.tick<tick)C.step(w,{});}
const permitted=index=>index<12||[18,19,20,29,30,33,34].includes(index);

test('30 is a separate supported selector with bounded copy limits and the same safe checkpoint schema',()=>{
 assert.equal(C.MOBILE_COMBAT_REVISION,30);assert.equal(C.LATEST_COMBAT_REVISION,31);assert.equal(C.MOBILE_BOSS_LIMITS.maxCopies,4);assert.equal(C.MOBILE_BOSS_LIMITS.copyTicks,360);assert.deepEqual(C.MOBILE_BOSS_LIMITS.copyX,[66,142,218,294]);const w=world(),saved=C.checkpoint(w);assert.equal(saved.combatRevision,30);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(saved)),saved);assert.deepEqual(Object.keys(saved),Object.keys(C.checkpoint(world(0,0,'hell',29))));
});

test('undefined and all five historical combat selectors remain raw exact against pinned29',()=>{
 const Old=load(cp.execFileSync('git',['show',BASE+':src/core.js'],{encoding:'utf8'}));
 for(const revision of [undefined,21,25,27,28,29])for(const index of [0,8,12,33])for(const difficulty of ['normal','hell']){
  const create=core=>{const w=world(index,2,difficulty,revision===undefined?21:revision,core);if(revision===undefined)delete w.combatRevision;return w;},a=create(C),b=create(Old);assert.equal(JSON.stringify(a),JSON.stringify(b));
  for(let n=0;n<300;n++){const input={dx:n%120<60?4:-4,dy:n%180<90?.5:-.5,focus:n%90<45};C.step(a,input);Old.step(b,input);if(n%60===0||n===299)assert.equal(JSON.stringify(a),JSON.stringify(b),[revision,index,difficulty,n].join('/'));}
 }
});

test('30 refuses every boss-stage ordinary enemy spawn before IDs, RNG, events or pool-pressure change',()=>{
 for(const index of [0,8,11,12,20,26,33,34]){
  const w=world(index),before=JSON.stringify([w.idCounter,w.rngState,w.events,w.stats,w.boss.artKey,w.boss.sealTarget,w.boss.linkTarget]);T.spawnEnemy(w,70,'scout',1);T.spawnEnemy(w,290,'turret',-1);T.summonBossAllies(w);assert.equal(w.enemies.length,0);assert.equal(JSON.stringify([w.idCounter,w.rngState,w.events,w.stats,w.boss.artKey,w.boss.sealTarget,w.boss.linkTarget]),before);
 }
 for(let index=0;index<12;index++)for(const difficulty of ['gentle','normal','hell']){const w=world(index,0,difficulty);for(let n=0;n<960;n++){C.step(w,{});assert.equal(w.enemies.length,0);}assert(!w.events.some(e=>e.type==='summon'));}
 const old=world(0,0,'normal',29);advance(old,240);assert.equal(old.enemies.length,2,'old29 still follows its original actual support summon');
});

test('ordinary enemies in the approach waves keep their original authored schedule',()=>{
 const worlds=[29,30].map(combatRevision=>{const w=C.createRun({campaign:true,campaignRevision:5,combatRevision,difficulty:'normal',seed:4242,runId:'mobile30-wave-contract'});w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;});
 for(let n=0;n<480;n++){for(const w of worlds)C.step(w,{});assert.equal(JSON.stringify(worlds[0].enemies),JSON.stringify(worlds[1].enemies));assert.equal(JSON.stringify(worlds[0].bullets),JSON.stringify(worlds[1].bullets));assert.equal(worlds[0].rngState,worlds[1].rngState);}assert(worlds[1].stats.peakEnemies>=3);
});

test('more existing attack slots belong to distinct real copies without doubling pellets or inventing nominal attack poses',()=>{
 for(const index of [0,6,8,20,29,33,34])for(const difficulty of ['gentle','normal','hell']){
  const w=world(index,2,difficulty),copies=new Map(),casts=new Map(),seen=new Set(),counts=new Map();let peak=0;
  for(let n=0;n<1200;n++){
   C.step(w,{});const live=w.boss.combatCopies||[];peak=Math.max(peak,live.length);assert(live.length<=4);assert.equal(new Set(live.map(c=>c.sourceActorId)).size,live.length);assert.equal(new Set(live.map(c=>c.destinationX)).size,live.length);
   for(const c of live){if(!copies.has(c.id)){copies.set(c.id,c);assert.equal(c.expireAt-c.born,360);assert(C.MOBILE_BOSS_LIMITS.copyX.includes(c.x));assert.equal(c.y,166);const promised=w.boss.identityCasts.find(cast=>cast.sourceActorId===c.sourceActorId&&cast.warningAt===c.born);assert(promised,'a visible copy requires an already accepted actual shot');assert.equal(promised.x,c.x);assert.equal(promised.y,c.y);}if(c.action==='attack')assert(w.tick-c.releaseTick>=0&&w.tick-c.releaseTick<12,'an attack pose must follow an actual successful release');}
   for(const cast of w.boss.identityCasts||[]){casts.set(cast.id,cast);assert(cast.sourceActorId&&cast.sourceActorId.startsWith('combat-copy-'),'new nonlaser slots use actual copies');assert([72,168,342,420].includes((cast.warningAt-1)%600));assert.equal(cast.activeAt-cast.warningAt,54);}
   for(const b of w.bullets)if(b.v29Role&&!seen.has(b.id)){seen.add(b.id);assert.equal(w.tick,b.identityActiveAt);assert(copies.has(b.sourceActorId));const key=b.identityWarningAt,old=counts.get(key)||0;counts.set(key,old+1);if(index===33){assert(['han-rian','baek-ion'].includes(b.modelActorId));assert.equal(b.modelActorId,copies.get(b.sourceActorId).modelActorId);}}
   for(const h of w.hazards.filter(h=>h.laserBarrage))assert(!String(h.sourceActorId||'').startsWith('combat-copy-'),'the owned laser retains its actual main caster');assert(w.bullets.length+T.flowReserved(w)<=768);
  }
  assert(copies.size>=4,'at least two actual copies per cycle across the observed phases');assert(casts.size>=4);for(const [warningAt,count]of counts){const slot=(warningAt-1)%600,max=slot===72?(difficulty==='hell'?12:difficulty==='normal'?9:6):(difficulty==='hell'?6:difficulty==='normal'?5:3);assert(count<=max,'existing pellet budgets are split by source, never multiplied');}assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);if(index===0&&difficulty==='hell')assert.equal(peak,4);
 }
});

test('protected scene actors never become copies, and a full reserved pool produces neither a copy nor a fake warning',()=>{
 for(let index=12;index<35;index++)if(!permitted(index)){const w=world(index,2);advance(w,600);assert.equal((w.boss.combatCopies||[]).length,0);assert((w.boss.identityCasts||[]).every(c=>!String(c.sourceActorId||'').startsWith('combat-copy-')));}
 const w=world();advance(w,72);while(w.bullets.length<757)w.bullets.push({id:++w.idCounter,x:340,y:300,px:340,py:300,vx:0,vy:0,r:1,halfLength:0,angle:0,kind:'orb',age:0,ttl:12,ownerId:0,grazed:true});const before=JSON.stringify([w.idCounter,w.stats,w.boss.combatCopies,w.boss.identityCasts]);T.bossFlow(w,0,72);assert.equal(JSON.stringify([w.idCounter,w.stats,w.boss.combatCopies,w.boss.identityCasts]),before);assert.equal(T.flowReserved(w),0);
});

function body(w,patch={}){const b={id:++w.idCounter,x:90,y:500,px:90,py:500,vx:0,vy:180,r:3,halfLength:0,angle:Math.PI/2,kind:'orb',age:1,ttl:.5,ownerId:w.boss.id,grazed:true,...patch};w.bullets.push(b);return b;}

test('an expired moving bullet keeps its own trajectory until its complete visual body leaves the padded arena',()=>{
 const w=world(),b=body(w,{halfLength:13,kind:'blade'}),limit=C.H+b.r+b.halfLength+104;let removed=false;
 for(let tick=1;tick<=180;tick++){C.step(w,{});assert.equal(b.x,90);assert.equal(b.vx,0);assert.equal(b.vy,180);assert.equal(b.retiring,undefined,'a normal moving body exits naturally instead of fading in front of the pilot');if(w.bullets.includes(b)){assert(b.y<=limit);assert.equal(b.v30OverdueTicks,tick);}else{assert(b.y>limit,'even a large prop must completely leave its conservative visual margin');removed=true;break;}}
 assert(removed);
 const old=world(0,0,'hell',29),legacy=body(old);C.step(old,{});assert.equal(legacy.retiring,true);assert.equal(legacy.retireDuration,.35);assert.equal(legacy.v30OverdueTicks,undefined);
});

test('moving grace lasts at most180 unscaled ticks under skill slowdown, followed by a finite harmless fade; stationary fallback starts immediately',()=>{
 for(const slow of [false,true]){
  const w=world(),b=body(w,{y:300,py:300,vy:2});if(slow){w.stats.casts.delay=1;w.skills.delayReadyAt=480;}
  for(let tick=1;tick<180;tick++){C.step(w,{});assert(w.bullets.includes(b));assert.equal(b.retiring,undefined);assert.equal(b.v30OverdueTicks,tick);}C.step(w,{});assert.equal(b.v30OverdueTicks,180);assert.equal(b.retiring,true);assert.equal(b.retireDuration,.8);assert.equal(b.retireAge,0);
  // Isolate this retiring body during the existing admission-rest interval,
  // so an unrelated active curtain cannot account for damage in this fixture.
  w.bullets=[b];w.hazards=[];w.enemies=[];w._identityPlans=[];w.phaseTime=527/60;w.player.x=b.x;w.player.y=b.y;w.player.invulnerableUntil=0;const hp=w.player.hp;for(let tick=1;tick<48;tick++){C.step(w,{});assert(w.bullets.includes(b));assert.equal(w.player.hp,hp,'retirement is harmless from its first faded frame');}C.step(w,{});assert(!w.bullets.includes(b));assert.equal(w.player.hp,hp);
 }
 const stationary=world(),still=body(stationary,{vy:0});C.step(stationary,{});assert.equal(still.v30OverdueTicks,1);assert.equal(still.retiring,true);assert.equal(still.retireDuration,.8);
});

test('a real phase defeat preserves remaining copy-stream promises and reaches a clean boundary after bounded bullet drain',()=>{
 const w=world();advance(w,127);const cast=w.boss.identityCasts.find(c=>c.v29Role==='aimed-stream'),seen=new Set(w.bullets.filter(b=>b.identityCastId===cast.id).map(b=>b.id)),counts=[seen.size,0,0];assert.equal(counts[0],4);w.boss.hp=1;w.shots.push({id:++w.idCounter,x:w.boss.x,y:w.boss.y,px:w.boss.x,py:w.boss.y,vx:0,vy:0,r:2,kind:'basic',age:0,ttl:1,damage:100});C.step(w,{});assert.equal(w.stage,'transition');assert.equal(T.flowReserved(w),8);
 const deathTick=w.tick;while(w.stage==='transition'&&w.tick<deathTick+1200){C.step(w,{});for(const b of w.bullets)if(b.identityCastId===cast.id&&!seen.has(b.id)){seen.add(b.id);counts[b.v29PulseIndex]++;assert.equal(w.tick,127+b.v29PulseIndex*12);assert.equal(b.sourceActorId,cast.sourceActorId);}}
 assert.deepEqual(counts,[4,4,4]);assert.equal(w.stage,'boss');assert.equal(w.phase,1);assert(w.tick<deathTick+1200);assert.equal(w._identityPlans.length,0);assert.equal(w.bullets.length,0);assert.equal(w.hazards.length,0);assert.equal(C.checkpoint(w).phase,1);assert.equal(C.checkpoint(w).combatRevision,30);assert.equal(w.stats.droppedGroups,0);
});
