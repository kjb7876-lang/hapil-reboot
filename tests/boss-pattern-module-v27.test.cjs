'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/boss-patterns-v27.js');
function world(bossIndex=0,phase=0,difficulty='normal'){
  return {combatRevision:27,campaign:true,stage:'boss',bossIndex,phase,difficulty,seed:4242,boss:{id:19},player:{x:180,y:550}};
}
function specs(index,phase=0,difficulty='normal',beat=0,patch={}){
  return P.makeVolley({...world(index,phase,difficulty),...patch},{x:180,y:126},beat,{});
}
function physical(rows){return JSON.stringify(rows.map(s=>[s.x,s.y,s.angle,s.speed,s.r,s.kind,s.v27Motion,s.v27TurnRate,s.v27TurnUntil,s.v27WaveRate,s.v27Reflect,s.v27SplitAt,s.v27SplitCount,s.pauseFrom,s.pauseUntil,s.acceleration,s.accelerateAt,s.maxSpeed]));}
function bullet(s){const b={id:54,x:s.x,y:s.y,px:s.x,py:s.y,r:s.r,kind:s.kind,angle:s.angle,vx:Math.cos(s.angle)*s.speed,vy:Math.sin(s.angle)*s.speed,age:0,ownerId:s.ownerId,sourceActorId:s.sourceActorId,modelActorId:s.modelActorId,sourcePhase:s.sourcePhase,patternId:s.patternId,paletteSlot:s.paletteSlot,color:s.color,ttl:s.ttl};for(const key of ['acceleration','accelerateAt','maxSpeed','pauseFrom','pauseUntil'])if(s[key]!==undefined)b[key]=s[key];P.initialize(b,s);return b;}

test('35 frozen encounter motifs produce unique actual trajectories and phase changes instead of unique labels alone',()=>{
  assert.equal(P.profiles.length,35);assert(Object.isFrozen(P.profiles));
  const actual=new Set();
  for(const p of P.profiles){
    assert(Object.isFrozen(p)&&Object.isFrozen(p.modes));assert.equal(P.profileFor(world(p.index)),p);
    const rows=specs(p.index);assert(rows.length>0);const signature=physical(rows);assert(!actual.has(signature),'actual initial geometry/rhythm duplicates '+p.index);actual.add(signature);
    assert.notEqual(signature,physical(specs(p.index,1)),'phase1 unchanged '+p.index);
    assert.notEqual(physical(specs(p.index,1)),physical(specs(p.index,2)),'phase2 unchanged '+p.index);
  }
  assert.equal(actual.size,35);assert.equal(P.profileFor({...world(11),finalPractice:true}).index,34);
});

test('all difficulty/phase/copy volleys are bounded, source-owned, deterministic and committed without mutating world or later aim',()=>{
  let checks=0;
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell'])for(const copy of [false,true]){
    const w=world(index,phase,difficulty),emitter={x:52,y:166,sourceActorId:'copy-source',modelActorId:index===33?'baek-ion':'owner'},before=JSON.stringify([w,emitter]);
    const a=P.makeVolley(w,emitter,2,{copy}),b=P.makeVolley(w,emitter,2,{copy}),cap=copy?(difficulty==='hell'?6:difficulty==='gentle'?3:5):(difficulty==='hell'?12:difficulty==='gentle'?6:9);
    assert.deepEqual(a,b);assert(a.length>0&&a.length<=cap);assert.equal(JSON.stringify([w,emitter]),before);
    for(const s of a){
      assert([s.x,s.y,s.angle,s.speed,s.r,s.ttl].every(Number.isFinite));assert(s.x>=0&&s.x<=360&&s.y>=0&&s.y<=440);assert(s.speed>0&&s.speed<=272);assert(s.r>=2.7&&s.r<=11);
      assert.equal(s.sourceActorId,emitter.sourceActorId);assert.equal(s.modelActorId,emitter.modelActorId);assert.equal(s.ownerId,19);assert.equal(s.sourcePhase,phase);assert.equal(s._v27Prepared,true);assert.equal(s._hellPrepared,true);
    }
    checks++;
  }
  assert.equal(checks,630);
});

test('piano lanes have a moving adjacent two-key rest and distinct staggered drops',()=>{
  for(const index of [11,12,18,21])for(const difficulty of ['gentle','normal','hell']){
    const a=specs(index,0,difficulty,0),b=specs(index,0,difficulty,1);assert(a.length>=3&&b.length>=3);
    const lanes=difficulty==='hell'?12:difficulty==='gentle'?8:10,rest=a[0].v27RestLane;
    assert(a.every(s=>Number.isInteger(s.v27LaneIndex)&&s.v27LaneIndex!==rest&&s.v27LaneIndex!==(rest+1)%lanes));
    assert.notEqual(rest,b[0].v27RestLane);assert(new Set(a.map(s=>s.pauseUntil)).size>1);assert(new Set(a.map(s=>s.x)).size===a.length);
  }
});

test('the moving mirror makes one continuous wall reflection and preserves speed and piecewise collision point',()=>{
  const s=specs(6,0,'hell')[0],b=bullet({...s,x:7,y:110,angle:Math.PI-.4,speed:180});
  const beforeSpeed=Math.hypot(b.vx,b.vy);let reflected=false;
  for(let tick=0;tick<320;tick++){
    const start={x:b.x,y:b.y},oldVX=b.vx;P.advance(b,1/60,360);b.age+=1/60;b.v27Age=b.age;
    assert(b.v27Reflections<=1);if(b.v27BouncePoint){reflected=true;assert(oldVX<0&&b.vx>0);assert.equal(b.v27Reflections,1);assert(b.v27BouncePoint.fraction>=0&&b.v27BouncePoint.fraction<=1);assert(Math.abs(b.v27BouncePoint.x-b.r-1)<1e-10);assert(b.v27BouncePoint.y>=start.y);}
    assert(Math.abs(Math.hypot(b.vx,b.vy)-beforeSpeed)<1e-9);
  }
  assert(reflected);assert.equal(b.v27Reflections,1);
});

test('a mirrored long capsule reflects at its leading cap while its full damage body stays inside the wall',()=>{
  const source=specs(6,0,'hell')[0],b=bullet({...source,x:40,y:120,angle:Math.PI-.2,speed:180});b.halfLength=13;
  let reflected=false;
  for(let tick=0;tick<30;tick++){
    P.advance(b,1/60,360);b.age+=1/60;b.v27Age=b.age;
    if(b.v27BouncePoint){
      const lead=b.r+Math.abs(Math.cos(b.angle))*b.halfLength;
      assert(Math.abs(b.v27BouncePoint.x-(lead+1))<1e-9);assert(b.v27BouncePoint.x-lead>=1-1e-9);
      assert(b.x-lead>=1-1e-9);assert(b.vx>0);reflected=true;break;
    }
  }
  assert(reflected);
});

test('curved and wave motifs turn their real velocity without reading a later player position',()=>{
  for(const index of [0,4,19,25]){
    const source=specs(index)[0],a=bullet(source),b=bullet(source),initial={vx:a.vx,vy:a.vy};let peakTurn=0;
    for(let tick=0;tick<75;tick++){P.advance(a,1/60,360);P.advance(b,1/60,360);a.age+=1/60;b.age+=1/60;a.v27Age=a.age;b.v27Age=b.age;peakTurn=Math.max(peakTurn,Math.abs(a.vx-initial.vx)+Math.abs(a.vy-initial.vy));}
    assert.notEqual(a.angle,source.angle);assert.deepEqual(a,b);assert(peakTurn>5,'a wave can finish near its original heading while bending visibly in between');
  }
});

test('delayed splitting keeps its visible parent and creates bounded downward, own-source, nonrecursive daughters far from the player',()=>{
  const w=world(7,0,'hell'),s=P.makeVolley(w,{x:180,y:126,sourceActorId:'own-copy',modelActorId:'own-body'},0,{})[0],b=bullet(s);
  assert.equal(P.splitChildren(w,b),null);b.v27Age=b.v27SplitAt+.01;const before=JSON.stringify(b),children=P.splitChildren(w,b);
  assert.equal(JSON.stringify(b),before,'branch computation must never delete or shrink its parent');assert.equal(children.length,3);
  for(const c of children){assert.equal(c.v27ParentId,b.id);assert(c.v27Child&&c.v27SplitDone);assert.equal(c.v27Generation,1);assert.equal(c.ownerId,b.ownerId);assert.equal(c.sourceActorId,b.sourceActorId);assert.equal(c.modelActorId,b.modelActorId);assert.equal(c.sourcePhase,b.sourcePhase);assert(c.r<b.r&&Math.sin(c.angle)>0);assert.equal(P.splitChildren(w,bullet(c)),null);}
  const near={...b,y:490};assert.equal(P.splitChildren(w,near).length,0,'late near-player parent simply keeps travelling');
  const nearSide={...b,x:180,y:400};assert.equal(P.splitChildren({...w,player:{x:180,y:480}},nearSide),null);
  assert.deepEqual(P.splitChildren(w,{...b,v27Age:b.v27SplitAt+.81}),[]);
});

test('main-shot decoration changes size/rhythm immediately, stays idempotent and excludes legacy/weapon/child physics',()=>{
  const original={x:180,y:126,angle:Math.PI/2,speed:100,r:3.8,kind:'orb',ownerId:19},newShots=[{...original}];
  P.decorate(world(5),newShots);assert(newShots[0].v27Motion==='pulse');assert(newShots[0].r>original.r);assert(newShots[0].speed<original.speed);assert(newShots[0].pauseUntil>1);
  const once=JSON.stringify(newShots);P.decorate(world(5),newShots);assert.equal(JSON.stringify(newShots),once);
  for(const patch of [{combatRevision:25},{combatRevision:21},{campaign:false},{stage:'waves'}]){const s=[{...original}];P.decorate({...world(5),...patch},s);assert.deepEqual(s,[original]);}
  for(const patch of [{weaponMotion:true},{kind:'boss-weapon'},{kind:'hell-rotor'},{v27Child:true},{ownerId:7}]){const s=[{...original,...patch}],copy=JSON.stringify(s);P.decorate(world(5),s);assert.equal(JSON.stringify(s),copy);}
});

test('dense main rings branch only sparse large accents while dedicated split-jaw parents retain their authored count',()=>{
  const w=world(7,0,'hell'),ring=Array.from({length:36},(_,i)=>({x:180,y:126,angle:i*Math.PI/18,speed:150,r:3.8,kind:'orb',ownerId:19}));
  P.decorate(w,ring);const splitting=ring.filter(s=>s.v27SplitAt);assert.equal(splitting.length,6);
  assert(ring.every((s,i)=>s.v27Motion===(i%6===0?'split':'comet')));
  assert(ring.filter((s,i)=>i%6!==0).every(s=>s.v27SplitAt===undefined&&s.v27SplitCount===undefined),'ordinary bodies must not carry a fake split promise');
  const tiny=Array.from({length:12},()=>({x:180,y:126,angle:Math.PI/2,speed:150,r:2.8,kind:'needle',ownerId:19}));P.decorate(w,tiny);assert(tiny.every(s=>!s.v27SplitAt));
  for(const [difficulty,count]of [['gentle',2],['normal',3],['hell',4]]){
    const dedicated=specs(7,0,difficulty);assert.equal(dedicated.length,count);assert(dedicated.every(s=>s.v27SplitAt&&s.v27Motion==='split'));
  }
});
