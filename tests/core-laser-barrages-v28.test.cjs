'use strict';
// Explicit immune clock/geometry fixtures. These are not human/device clears.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js'),Patterns=require('../src/boss-patterns-v27.js'),Lasers=require('../src/boss-lasers-v28.js');
function world(index,phase=0,difficulty='hell',revision,core=C){if(arguments.length<4)revision=28;const first=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'laser28-core-contract'}),s=core.checkpoint(first);s.phase=phase;const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function shape(h){return JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.born,h.baseWarningTicks,h.staggerTicks,h.warningTicks,h.activeAt,h.fadeAt,h.expireAt,h.sourcePhase,h.sourceActorId,h.modelActorId,h.chainId,h.paletteSlot]);}

test('28 is a separate supported opt-in and retains its safe checkpoint selector',()=>{
 assert.equal(C.LASER_COMBAT_REVISION,28);assert.equal(C.LATEST_COMBAT_REVISION,28);const w=world(8),saved=C.checkpoint(w);assert.equal(saved.combatRevision,28);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(saved)),saved);
 for(const revision of [undefined,21,25,27]){const old=world(0,0,'normal',revision);assert.equal(old.combatRevision,revision);}
});

test('all older combat revisions remain exact against the pinned v27 core',()=>{
 const box={HapilWeaponPatterns:Weapon,HapilBossPatternsV27:Patterns};vm.runInNewContext(cp.execFileSync('git',['show','7c3acd7e154e08444236395eb316fb678bc01568:src/core.js'],{encoding:'utf8'}),box);const Old=box.HapilCore;
 for(const revision of [undefined,21,25,27])for(const index of [0,8,24,33])for(const phase of [0,2])for(const difficulty of ['normal','hell']){
  const current=world(index,phase,difficulty,revision),old=world(index,phase,difficulty,revision,Old);assert.equal(JSON.stringify(current),JSON.stringify(old));
  for(let n=0;n<420;n++){const input={dx:n%100<50?1:-1,dy:n%80<40?.2:-.2,focus:n%90<45};C.step(current,input);Old.step(old,input);if(n%60===0||n===419)assert.equal(JSON.stringify(current),JSON.stringify(old),[revision,index,phase,difficulty,n].join('/'));}
 }
});

test('real28 salvos retain finite endpoints, staggered clocks, whole reflected chains and per-pulse release records',()=>{
 let rays=0,reflections=0,staggered=0,stats=0;const modes=new Set();
 for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++){
  const w=world(index,phase),committed=new Map(),seen=new Set();let actual=0;
  for(let tick=0;tick<1080;tick++){
   C.step(w,{});assert(w.hazards.length<=40);const live=w.hazards.filter(h=>h.laserBarrage);assert(live.length<=12);
   for(const h of live){
    assert.equal(h.kind,'laser');assert(h.patternId.startsWith('barrage-'));assert.equal(h.v28Pattern,Lasers.profiles[index].id+'-p'+phase);assert.equal(h.sourcePhase,phase);modes.add(h.v28Mode);
    assert([h.x1,h.y1,h.x2,h.y2,h.width].every(Number.isFinite));assert(Math.hypot(h.x2-h.x1,h.y2-h.y1)>8);assert.equal(h.warningTicks,h.baseWarningTicks+h.staggerTicks);assert(h.warningTicks>=54);assert.equal(h.activeAt,h.born+h.warningTicks);assert(h.activeTicks>=8&&h.activeTicks<=20);assert(h.fadeTicks>=8&&h.fadeTicks<=12);
    const within=(h.born-1)%600;assert(within>=72&&within<=456);assert(within+h.warningTicks+h.activeTicks+h.fadeTicks<660,'a promise cannot overlap the next corridor selection');
    if(committed.has(h.id))assert.equal(shape(h),committed.get(h.id));else{committed.set(h.id,shape(h));rays++;actual++;if(h.staggerTicks)staggered++;}
    if(w.tick<h.activeAt)assert.equal(h.phase,'warning');else if(w.tick<h.fadeAt)assert.equal(h.phase,'active');else assert.equal(h.phase,'fade');
    if(h.v28Reflected){const pair=live.filter(x=>x.chainId===h.chainId);assert.equal(pair.length,2);const a=pair.find(x=>x.v28Segment===0),b=pair.find(x=>x.v28Segment===1);assert(a&&b);assert(Math.hypot(a.x2-b.x1,a.y2-b.y1)<1e-8);assert.equal(a.activeAt,b.activeAt);assert.equal(a.expireAt,b.expireAt);assert.equal(a.paletteSlot,b.paletteSlot);reflections++;}
    if(w.tick===h.activeAt){const release=w.boss.skillReleases.find(r=>r.tick===w.tick&&r.v28BarrageId===h.v28BarrageId&&r.v28RayGroup===h.v28RayGroup&&r.v28Segment===h.v28Segment);assert(release,'every actual pulse gets its own release');assert.equal(release.x,h.x1);assert.equal(release.y,h.y1);assert.equal(release.sourcePhase,phase);assert.equal(release.sourceActorId,h.sourceActorId);assert.equal(release.modelActorId,h.modelActorId);}
   }
  }
  assert(actual>0,index+'/'+phase+' never shows its owned laser motif');assert(w.boss.laserBarrageStats.attempts>=3);stats+=w.boss.laserBarrageStats.committed;
 }
 assert(rays>300&&reflections>20&&staggered>100&&stats>100);for(const mode of ['reflect','piano','sweep','cross','parallel','spokes','bars','reticle','stairs','relay','fork','triads'])assert(modes.has(mode),mode+' never actually commits');
});

test('capacity is resolved before warning and never drops promised new rays or queues a stale salvo',()=>{
 const w=world(0,0,'normal');while(w.tick<72)C.step(w,{});while(w.hazards.length<40)w.hazards.push({id:++w.idCounter,castId:0,ownerId:0,kind:'laser',x1:0,y1:0,x2:1,y2:1,width:1,phase:'warning',born:0,warningTicks:9000,activeAt:9000,fadeAt:9010,expireAt:9020,activeTicks:10,fadeTicks:10,progress:0,grazed:false});
 const dropped=w.stats.droppedGroups;C.step(w,{});assert.equal(w.boss.laserBarrageStats.skippedBudget,1);assert.equal(w.stats.droppedGroups,dropped);assert.equal(w.hazards.filter(h=>h.laserBarrage).length,0);assert.equal(w._deferred.length,0);
});
