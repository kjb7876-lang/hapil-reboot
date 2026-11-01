'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const L=require('../src/boss-lasers-v28.js'),box={};vm.runInNewContext(cp.execFileSync('git',['show','a5982f2:src/boss-lasers-v28.js'],{encoding:'utf8'}),box);const Old=box.HapilBossLasersV28;
function world(index,phase=0,difficulty='normal',revision=31){return {combatRevision:revision,campaign:true,campaignRevision:5,stage:'boss',bossIndex:index,phase,difficulty,tick:228,boss:{id:19},player:{x:180,y:550,r:2}};}
const emitter={x:180,y:126,sourceActorId:'owned-emitter',modelActorId:'owned-model'};
function span(specs){const first=Math.min(...specs.map(s=>s.staggerTicks));return {damage:Math.max(...specs.map(s=>s.staggerTicks+s.activeTicks))-first,full:Math.max(...specs.map(s=>s.staggerTicks+s.activeTicks+s.fadeTicks))-first,deadline:Math.max(...specs.map(s=>s.warningTicks+s.staggerTicks+s.activeTicks+s.fadeTicks))};}
function pointSegment(x,y,r){const dx=r.x2-r.x1,dy=r.y2-r.y1,t=Math.max(0,Math.min(1,((x-r.x1)*dx+(y-r.y1)*dy)/(dx*dx+dy*dy)));return (x-r.x1-dx*t)**2+(y-r.y1-dy*t)**2;}

test('undefined and all historical selectors through30 retain exact capsules, ownership and clocks',()=>{
  for(const revision of[undefined,21,25,27,28,29,30])for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of['gentle','normal','hell']){
    const w=world(index,phase,difficulty,revision===undefined?30:revision),opts={escapeRoute:{x1:80,y1:260,x2:80,y2:614,halfWidth:24},playerRadius:2};if(revision===undefined)delete w.combatRevision;
    assert.equal(JSON.stringify(L.makeBarrage(w,emitter,1,opts)),JSON.stringify(Old.makeBarrage(w,emitter,1,opts)),[revision,index,phase,difficulty].join('/'));assert.equal(L.cadenceFor(w),Old.cadenceFor(w));
  }
});

test('31531phrases hold real rays for42..72ticks and sustain distinct staged damage for at least138ticks',()=>{
  assert(Object.isFrozen(L.spectacleProfiles)&&Object.isFrozen(L.spectacleLimits));assert.equal(L.spectacleProfiles.length,35);const timingSignatures=new Set(),modes=new Set();
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of['gentle','normal','hell']){
    const w=world(index,phase,difficulty),before=JSON.stringify([w,emitter]),specs=L.makeBarrage(w,emitter,1),cap=difficulty==='hell'?8:difficulty==='gentle'?4:6;assert.equal(specs.length,cap);assert.equal(JSON.stringify([w,emitter]),before);assert.deepEqual(specs,L.makeBarrage(w,emitter,1));
    const duration=span(specs);assert(duration.damage>=138&&duration.full>=150);assert(duration.deadline<=294);assert(228+duration.deadline<=522);assert(new Set(specs.map(s=>s.v31Stage)).size>=2);
    for(const s of specs){assert(s.v31Barrage);assert.equal(s.v31Phrase,L.spectacleProfiles[index].id+'-p'+phase);assert(s.v31Stage>=0&&s.v31Stage<s.v31StageCount&&s.v31StageCount<=3);assert.equal(s.warningTicks,difficulty==='gentle'?66:54);assert(s.activeTicks>=42&&s.activeTicks<=72);assert(s.fadeTicks>=12&&s.fadeTicks<=18);assert(s.staggerTicks>=0&&s.staggerTicks<=138);assert(s.width>=3.6&&s.width<=14.5);assert.equal(s.sourceActorId,emitter.sourceActorId);assert.equal(s.modelActorId,emitter.modelActorId);assert.equal(s.ownerId,19);assert.equal(s.sourcePhase,phase);assert(Math.abs(s.length-Math.hypot(s.x2-s.x,s.y2-s.y))<1e-8);modes.add(s.v28Mode);}
    if(phase===0&&difficulty==='normal')timingSignatures.add(JSON.stringify(specs.map(s=>[s.staggerTicks,s.activeTicks,s.fadeTicks,s.v31Stage])));
  }
  assert.equal(timingSignatures.size,35,'every boss has an actual different first-phase rhythm');assert.equal(modes.size,13);assert.equal(L.profileFor({...world(11),finalPractice:true}).index,34);
});

test('precommit clipped phrases preserve sources, meaningful finite lengths, safe routes and their long final holds',()=>{
  const routes=[80,180,280].map(x=>({x1:x,y1:260,x2:x,y2:614,halfWidth:24}));routes.push({x1:120,y1:520,x2:240,y2:520,halfWidth:24});let fitted=0,empty=0;
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of['gentle','normal','hell'])for(const route of routes){
    const w=world(index,phase,difficulty),old=Old.makeBarrage({...w,combatRevision:30},emitter,1,{escapeRoute:route,playerRadius:2}),specs=L.makeBarrage(w,emitter,1,{escapeRoute:route,playerRadius:2});
    if(!old.length){assert.equal(specs.length,0,'no generic source relocation or phantom safe ray');empty++;continue;}assert(specs.length>0);fitted++;
    assert(span(specs).damage>=138);assert(span(specs).full>=150);assert(new Set(specs.map(s=>s.v31Stage)).size>=2);
    for(const s of specs){
      assert(old.some(o=>o.x===s.x&&o.y===s.y&&o.x2===s.x2&&o.y2===s.y2&&o.angle===s.angle&&o.width>=s.width),'every source and finite path must be an actual surviving authored chain');assert(s.length>=Math.max(24,3*s.width)||s.v28Reflected&&s.v28Segment===0&&s.length>=12);
      const clearance=route.halfWidth+s.width/2+2;for(let n=0;n<=200;n++){const t=n/200;assert(pointSegment(s.x+(s.x2-s.x)*t,s.y+(s.y2-s.y)*t,route)>clearance*clearance);}
    }
  }
  assert.equal(fitted,1260);assert.equal(empty,0);
});

test('long reflected stages retain two honest wall legs with shared clocks and independent stage chain IDs',()=>{
  let chains=0;for(const index of[3,6,15,24,30,34])for(let phase=0;phase<3;phase++){
    const specs=L.makeBarrage(world(index,phase,'hell'),emitter,1);if(!specs.some(s=>s.v28Reflected))continue;const grouped=new Map();for(const s of specs){if(!grouped.has(s.chainId))grouped.set(s.chainId,[]);grouped.get(s.chainId).push(s);}
    for(const pair of grouped.values()){
      assert.equal(pair.length,2);const a=pair.find(s=>s.v28Segment===0),b=pair.find(s=>s.v28Segment===1);assert(a&&b);assert.equal(a.x2,b.x);assert.equal(a.y2,b.y);assert([8,352].includes(a.x2));assert(Math.abs(Math.cos(a.angle)+Math.cos(b.angle))<1e-8);assert(Math.abs(Math.sin(a.angle)-Math.sin(b.angle))<1e-8);
      for(const key of['warningTicks','staggerTicks','activeTicks','fadeTicks','width','v31Stage','v31StageCount','v31Phrase'])assert.equal(a[key],b[key]);chains++;
    }
  }assert(chains>=32);
});

test('piano rests, reticle snapshot and separate paired-owner programs survive longer spectacle',()=>{
  for(const index of[8,9,11,18]){const specs=L.makeBarrage(world(index,0,'hell'),emitter,0);assert(specs.every(s=>s.v28LaneIndex!==s.v28RestLane&&s.v28LaneIndex!==(s.v28RestLane+1)%s.v28KeyCount));assert(span(specs).damage>=138);}
  const w=world(4,1,'hell'),source={...emitter},specs=L.makeBarrage(w,source,2),locked=JSON.stringify(specs);w.player.x=24;w.player.y=280;source.x=312;assert.equal(JSON.stringify(specs),locked);assert.notEqual(JSON.stringify(L.makeBarrage(w,source,2)),locked);
  const a=L.makeBarrage(world(33,2,'hell'),{x:96,y:126,sourceActorId:'rian',modelActorId:'han-rian'},1),b=L.makeBarrage(world(33,2,'hell'),{x:264,y:126,sourceActorId:'ion',modelActorId:'baek-ion'},1);assert(a.every(s=>s.v28Mode==='fork'&&s.sourceActorId==='rian'&&s.modelActorId==='han-rian'));assert(b.every(s=>s.v28Mode==='parallel'&&s.sourceActorId==='ion'&&s.modelActorId==='baek-ion'));
});
