'use strict';
// Isolated deterministic timing/capacity fixtures, not human gameplay clears.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js'),Patterns=require('../src/boss-patterns-v27.js'),Lasers=require('../src/boss-lasers-v28.js'),Flow=require('../src/boss-flow-v29.js');
const BASE='f32a2b9c6e61730ae5bd1b411fc58897d1b677ec';
function load(source,internal=false){const box={HapilWeaponPatterns:Weapon,HapilBossPatternsV27:Patterns,HapilBossLasersV28:Lasers,HapilBossFlowV29:Flow};if(internal)source=source.replace('return Object.freeze({ W: W,','return Object.freeze({ _flowTest:{warning:warning,emit:emit,bossFlow:bossFlow,flowReserved:flowReserved}, W: W,');vm.runInNewContext(source,box);return box.HapilCore;}
const Private=load(fs.readFileSync(require.resolve('../src/core.js'),'utf8'),true),T=Private._flowTest;
function world(index=0,phase=0,difficulty='normal',revision=29,core=C){const first=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'flow29-core-contract'}),s=core.checkpoint(first);s.phase=phase;const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function filler(w){return {id:++w.idCounter,x:340,y:300,px:340,py:300,vx:0,vy:0,r:1,halfLength:0,angle:0,kind:'orb',age:0,ttl:12,ownerId:0,grazed:true};}
function advance(w,tick){while(w.tick<tick)C.step(w,{});}

test('29 is explicit, checkpoint-safe, and older revisions retain raw pinned28 simulation',()=>{
 assert.equal(C.FLOW_COMBAT_REVISION,29);assert.equal(C.LATEST_COMBAT_REVISION,29);const w=world(),s=C.checkpoint(w);assert.equal(s.combatRevision,29);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(s)),s);
 const Old=load(cp.execFileSync('git',['show',BASE+':src/core.js'],{encoding:'utf8'}));
 for(const revision of [undefined,21,25,27,28])for(const index of [0,8,33])for(const difficulty of ['normal','hell']){
  const a=world(index,2,difficulty,revision===undefined?28:revision),b=world(index,2,difficulty,revision===undefined?28:revision,Old);if(revision===undefined){delete a.combatRevision;delete b.combatRevision;}
  assert.equal(JSON.stringify(a),JSON.stringify(b));for(let n=0;n<240;n++){const input={dx:n%80<40?1:-1,dy:n%120<60?.2:-.2,focus:n%90<45};C.step(a,input);Old.step(b,input);if(n%60===0||n===239)assert.equal(JSON.stringify(a),JSON.stringify(b),[revision,index,difficulty,n].join('/'));}
 }
});

test('three complete pulses retain the actual warning-time bait point and fly straight after the player reverses',()=>{
 const targets=[];
 for(const side of [-1,1])for(const difficulty of ['gentle','normal','hell']){
  const w=world(0,2,difficulty),seen=new Set(),pulses=new Map();let snapshot,cast;
  for(let n=0;n<200;n++){
   C.step(w,{dx:(n<73?side:-side)*4});if(w.tick===73){snapshot={x:w.player.x,y:w.player.y};cast=w.boss.identityCasts.find(c=>c.v29Role==='aimed-stream');assert(cast);assert.equal(cast.warningAt,73);assert.deepEqual(Array.from(cast.v29PulseTicks),[127,139,151]);assert.equal(cast.targetSnapshot.x,snapshot.x);assert.equal(cast.targetSnapshot.y,snapshot.y);}
   for(const b of w.bullets.filter(b=>b.v29Role==='aimed-stream')){
    assert.equal(b.identityCastId,cast.id);assert.equal(b.v29TargetX,snapshot.x);assert.equal(b.v29TargetY,snapshot.y);assert.equal(b.v29AimSampleTick,73);assert.equal(b.v29MovementX,0);assert.equal(b.v29MovementY,0);assert.equal(b.v27Motion,'straight');assert.equal(b.sourcePhase,2);assert(!b.acceleration&&!b.curveRate&&!b.v27Reflect&&!b.v27SplitAt);
    assert(Math.abs((b.x-b.px)*b.vy-(b.y-b.py)*b.vx)<1e-6);if(seen.has(b.id))continue;seen.add(b.id);assert.equal(w.tick,127+b.v29PulseIndex*12);assert.equal(b.px,b.v29OriginX);assert.equal(b.py,b.v29OriginY);const p=pulses.get(b.v29PulseIndex)||[];p.push(b);pulses.set(b.v29PulseIndex,p);
   }
  }
  assert.equal(pulses.size,3);const count=difficulty==='gentle'?2:difficulty==='normal'?3:4;for(const p of pulses.values()){assert.equal(p.length,count);const aim=Math.atan2(snapshot.y-p[0].v29OriginY,snapshot.x-p[0].v29OriginX);assert(p.some(b=>Math.abs(b.angle-aim)<1e-9));}assert.equal(w.stats.droppedGroups,0);if(difficulty==='normal')targets.push(snapshot.x);
 }
 assert(targets[1]-targets[0]>200);
});

test('all future pulse slots are reserved before warning, and an unfit complete stream creates no cue or pool-pressure event',()=>{
 const w=world(0,2,'hell');advance(w,72);while(w.bullets.length<756)w.bullets.push(filler(w));C.step(w,{});assert.equal(T.flowReserved(w),12);const seen=new Set(),counts=[0,0,0];
 while(w.tick<151){C.step(w,{});assert(w.bullets.length+T.flowReserved(w)<=768);for(const b of w.bullets)if(b.v29Role==='aimed-stream'&&!seen.has(b.id)){seen.add(b.id);counts[b.v29PulseIndex]++;assert.equal(w.tick,b.identityActiveAt);}}
 assert.deepEqual(counts,[4,4,4]);assert.equal(T.flowReserved(w),0);
 const full=world(0,2,'hell');advance(full,72);while(full.bullets.length<757)full.bullets.push(filler(full));const ids=full.idCounter,dropped=full.stats.droppedGroups,pressure=full.stats.poolPressure;T.bossFlow(full,0,72);assert.equal(full._identityPlans.length,0);assert.equal((full.boss.identityCasts||[]).length,0);assert.equal(full.idCounter,ids);assert.equal(full.stats.droppedGroups,dropped);assert.equal(full.stats.poolPressure,pressure);
});

test('the conductor separates additional sources, permits no extra warning after420, and retains only curtain fade in final recovery',()=>{
 for(const index of [0,8,24,33,34])for(const difficulty of ['gentle','normal','hell']){
  const w=world(index,2,difficulty),casts=new Set(),roles=new Set();let priorBullets=new Set();
  for(let n=0;n<600;n++){
   C.step(w,{});const within=(Math.round(w.phaseTime*60)-1)%600;assert(w.hazards.length<=40);assert(w.hazards.filter(h=>h.laserBarrage).length<=12);assert((w.boss.combatCopies||[]).length<=2);
   for(const cast of w.boss.identityCasts||[])if(!casts.has(cast.id)){casts.add(cast.id);roles.add(cast.v29Role);assert([72,168,342,420].includes((cast.warningAt-1)%600));}
   for(const h of w.hazards){if(h.laserBarrage)assert.equal((h.born-1)%600,228);if(!h.pressureCurtain)assert((h.expireAt-1)%600<=526);if(within>=526)assert(h.pressureCurtain,'every other accepted beam finished its original clock before recovery');}
   if(within>=526){assert.equal(w.boss.action,'recover');for(const b of w.bullets)if(!priorBullets.has(b.id))assert(b.identityCastId||b.v27Child,'no fresh unpromised projectile in final recovery');}priorBullets=new Set(w.bullets.map(b=>b.id));
  }
  assert(roles.has('aimed-stream'));assert.equal(w.stats.droppedGroups,0);
 }
});

test('a filtered copy tries the other authored location before its one immutable warning',()=>{
 const w=world(0,0,'normal');advance(w,168);assert.equal((w.boss.combatCopies||[]).length,0);C.step(w,{});const copies=w.boss.combatCopies||[],casts=(w.boss.identityCasts||[]).filter(c=>c.v29Role==='copy-fixed');assert.equal(copies.length,1);assert.equal(casts.length,1);const c=copies[0],cast=casts[0];assert.equal(c.born,169);assert.equal(c.expireAt,529);assert.equal(cast.sourceActorId,c.sourceActorId);assert.equal(cast.x,c.x);assert.equal(cast.y,c.y);assert.equal(cast.activeAt,223);advance(w,224);assert.equal(c.releaseTick,223);assert.equal(c.action,'attack');advance(w,240);assert.equal(c.action,'recover');assert.equal((w.boss.skillReleases||[]).filter(r=>r.sourceActorId===c.sourceActorId).length,1);
});

test('late unsupported laser chains are rejected together before warning while earlier announced geometry keeps exact end clocks',()=>{
 const w=world(6,0,'normal');advance(w,229);const accepted=w.hazards.filter(h=>h.laserBarrage).map(h=>({id:h.id,shape:JSON.stringify(h),expireAt:h.expireAt}));assert(accepted.length);
 // The reflected chain would cross the final recovery deadline. Neither leg
 // may be admitted even when its finite geometry and local budgets are valid.
 w.phaseTime=480/60;const before=w.hazards.length,ids=w.idCounter,stats=JSON.stringify(w.stats),specs=[{x:10,y:80,x2:80,y2:170,width:4,warningTicks:54,staggerTicks:0,activeTicks:12,fadeTicks:8,ownerId:w.boss.id,laserBarrage:true,chainId:'late',v28Reflected:true,v28Segment:0},{x:80,y:170,x2:10,y2:260,width:4,warningTicks:54,staggerTicks:0,activeTicks:12,fadeTicks:8,ownerId:w.boss.id,laserBarrage:true,chainId:'late',v28Reflected:true,v28Segment:1}];
 assert.equal(T.warning(w,specs,54,'late-chain'),false);assert.equal(w.hazards.length,before);assert.equal(w.idCounter,ids);assert.equal(JSON.stringify(w.stats),stats);for(const old of accepted)assert.equal(JSON.stringify(w.hazards.find(h=>h.id===old.id)),old.shape);
 const generic=[{x:0,y:80,angle:Math.PI/2,width:4,ownerId:w.boss.id}];assert.equal(T.warning(w,generic,54,'late-generic'),false);assert.equal(w.hazards.length,before);
 w.phaseTime=300/60;const expires=new Map(accepted.map(h=>[h.id,h.expireAt]));while(w.tick<Math.max(...expires.values())){C.step(w,{});for(const [id,end]of expires)if(w.tick<end)assert(w.hazards.some(h=>h.id===id));else assert(!w.hazards.some(h=>h.id===id));}
});

test('a real boss defeat between pulses drains phase-transition promises and explicitly cancels terminal-victory promises',()=>{
 for(const phase of [0,2]){
  const w=world(33,phase,'hell');advance(w,127);const cast=w.boss.identityCasts.find(c=>c.v29Role==='aimed-stream'),snapshot=JSON.stringify(cast.targetSnapshot),clocks=JSON.stringify(cast.v29PulseTicks),seen=new Set(w.bullets.filter(b=>b.v29Role==='aimed-stream').map(b=>b.id)),counts=[seen.size,0,0],castIds=new Set((w.boss.identityCasts||[]).map(c=>c.id));assert.equal(counts[0],4);assert.equal(T.flowReserved(w),8);
  w.boss.hp=1;w.shots.push({id:++w.idCounter,x:w.boss.x,y:w.boss.y,px:w.boss.x,py:w.boss.y,vx:0,vy:0,r:2,kind:'basic',age:0,ttl:1,damage:100});C.step(w,{});assert.equal(w.tick,128);assert.equal(w.stage,phase===0?'transition':'won');assert.equal(T.flowReserved(w),phase===0?8:0);assert.equal(cast.cancelled,phase===0?undefined:true);
  while(w.tick<164){C.step(w,{});for(const c of w.boss.identityCasts||[])assert(castIds.has(c.id),'defeat cannot schedule a new warning');for(const b of w.bullets.filter(b=>b.v29Role==='aimed-stream'))if(!seen.has(b.id)){seen.add(b.id);counts[b.v29PulseIndex]++;assert.equal(w.tick,127+b.v29PulseIndex*12);assert.equal(b.identityCastId,cast.id);assert.equal(b.v29TargetX,cast.targetSnapshot.x);assert.equal(b.v29TargetY,cast.targetSnapshot.y);assert.equal(b.sourcePhase,phase);assert.equal(b.sourceActorId,cast.sourceActorId);assert.equal(b.modelActorId,cast.modelActorId);}}
  assert.deepEqual(counts,phase===0?[4,4,4]:[4,0,0]);assert.equal(w._identityPlans.length,0);assert.equal(T.flowReserved(w),0);assert.equal(cast.releaseTick,phase===0?151:127);assert.equal(JSON.stringify(cast.targetSnapshot),snapshot);assert.equal(JSON.stringify(cast.v29PulseTicks),clocks);const releases=w.boss.skillReleases.filter(r=>r.identityCastId===cast.id);assert.deepEqual(releases.map(r=>r.tick),phase===0?[127,139,151]:[127]);for(const r of releases){assert.equal(r.sourcePhase,phase);assert.equal(r.sourceActorId,cast.sourceActorId);assert.equal(r.modelActorId,cast.modelActorId);}assert.equal(w.stats.droppedGroups,0);if(phase===2)assert.equal(w.bullets.length,0,'normal terminal cleanup remains unchanged');
 }
});
