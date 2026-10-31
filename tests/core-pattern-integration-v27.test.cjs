'use strict';
// Deterministic, explicitly immune phase observations; not ordinary-health play.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js'),Patterns=require('../src/boss-patterns-v27.js');
function world(index,phase=0,difficulty='hell',revision,core=C){if(arguments.length<4)revision=27;const initial=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'v27-core-contract'}),s=core.checkpoint(initial);s.phase=phase;const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function json(v){return JSON.stringify(v);}

test('old undefined,21 and25 combat worlds remain exact against the pinned v26 core',()=>{
 const box={HapilWeaponPatterns:Weapon};vm.runInNewContext(cp.execFileSync('git',['show','3e5fc485f6006016de7bfa972a5b00683ee216ba:src/core.js'],{encoding:'utf8'}),box);const Old=box.HapilCore;
 for(const revision of [undefined,21,25])for(const index of [0,8,24])for(const phase of [0,2])for(const difficulty of ['normal','hell']){
  const current=world(index,phase,difficulty,revision),old=world(index,phase,difficulty,revision,Old);
  assert.equal(json(current),json(old));
  for(let n=0;n<420;n++){const input={dx:n%120<60?1:-1,dy:n%90<45?.2:-.2,focus:n%80<40};C.step(current,input);Old.step(old,input);if(n%60===0||n===419)assert.equal(json(current),json(old),[revision,index,phase,difficulty,n].join('/'));}
 }
});

test('all35 configurations and3phases use their owned27 mechanics with real locked warnings and bounded pools',()=>{
 let warnings=0,born=0,childCount=0,reflections=0;const modes=new Set(),sizes=new Set();
 for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++){
  const w=world(index,phase),plans=new Map(),seen=new Set();let actual=false;
  for(let tick=0;tick<840;tick++){
   C.step(w,{});assert(w.bullets.length<=C.CAPS.bullets);assert(w.hazards.length<=C.CAPS.hazards);assert((w._identityPlans||[]).length<=4);
   for(const p of w._identityPlans||[]){assert.equal(p.cast.activeAt-p.cast.warningAt,54);assert.equal(p.cast.escapeRoute,undefined,'dynamic paths do not promise straight-line corridor safety');assert(Object.isFrozen(p.cast.emissionOrigins));const serial=json(p);if(plans.has(p.cast.id))assert.equal(serial,plans.get(p.cast.id));else{plans.set(p.cast.id,serial);warnings++;}}
   for(const b of w.bullets){
    if(b.v27Pattern===Patterns.profiles[index].id)actual=true;
    if(b.v27Motion)modes.add(b.v27Motion);if(b.v27Pattern)sizes.add(b.r.toFixed(3));
    if(b.v27Reflections){assert.equal(b.v27Reflections,1);reflections++;}
    if(seen.has(b.id))continue;seen.add(b.id);born++;
    if(b.v27Child){childCount++;assert.equal(b.v27Generation,1);assert.equal(b.v27SplitDone,true);assert(w.bullets.some(parent=>parent.id===b.v27ParentId),'the child never silently replaces its parent');assert(b.vy>0);}
    else if(b.identityCastId){const p=JSON.parse(plans.get(b.identityCastId));assert.equal(w.tick,b.identityActiveAt);assert(p.specs.some(s=>s.x===b.px&&s.y===b.py&&Math.abs(s.angle-b.v27PreviousAngle)<1e-9),'initial cast heading/origin must remain locked until release');}
   }
  }
  assert(actual,index+'/'+phase+' must execute its own mechanics');
 }
 assert(warnings>100&&born>1000&&childCount>100&&reflections>100);for(const mode of ['curve','weave','mirror','split','pulse','comet','piano'])assert(modes.has(mode),mode+' never actually appeared');assert(sizes.size>20,'physical size variety must be substantive');
});

test('split child groups cannot exceed the live pool or create deferred stale attacks',()=>{
 const w=world(7,0),parent={id:++w.idCounter,x:80,y:160,px:80,py:160,vx:0,vy:80,r:6,kind:'orb',halfLength:0,angle:Math.PI/2,age:1.1,v27Age:1.1,ttl:6,v27Motion:'split',v27SplitAt:1,v27SplitCount:3,v27ChildSpeed:100,v27SplitSpread:.28,ownerId:w.boss.id,v27Pattern:Patterns.profiles[7].id,v27SplitDone:false,grazed:false};
 w.bullets.push(parent);while(w.bullets.length<C.CAPS.bullets)w.bullets.push({id:++w.idCounter,x:90,y:180,px:90,py:180,vx:0,vy:0,r:3,halfLength:0,angle:Math.PI/2,age:0,ttl:6,kind:'orb',grazed:false});
 C.step(w,{});assert.equal(w.bullets.length,C.CAPS.bullets);assert.equal(parent.v27SplitDone,true);assert(!w.bullets.some(b=>b.v27Child));assert.equal(w._deferred.length,0);assert(w.stats.droppedGroups>0);
});
