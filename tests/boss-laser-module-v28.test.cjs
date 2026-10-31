'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const L=require('../src/boss-lasers-v28.js');
function world(index=0,phase=0,difficulty='normal'){
  return {combatRevision:28,campaign:true,stage:'boss',bossIndex:index,phase,difficulty,seed:4242,tick:72,boss:{id:19},player:{x:180,y:550}};
}
const emit={x:180,y:126};
function rows(index,phase=0,difficulty='normal',beat=0,patch={}){return L.makeBarrage({...world(index,phase,difficulty),...patch},emit,beat);}
function physical(specs){return JSON.stringify(specs.map(s=>[s.x,s.y,s.x2,s.y2,s.width,s.warningTicks,s.staggerTicks,s.activeTicks,s.fadeTicks,s.v28Reflected,s.v28LaneIndex,s.v28RestLane]));}
function close(a,b){assert(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);}

test('UMD exports 35 immutable laser motifs with genuinely different finite geometry and phase clocks',()=>{
  assert(Object.isFrozen(L)&&Object.isFrozen(L.profiles));assert.equal(L.profiles.length,35);
  const ids=new Set(),signatures=new Set();for(const p of L.profiles){
    assert(Object.isFrozen(p)&&Object.isFrozen(p.modes));ids.add(p.id);assert.equal(L.profileFor(world(p.index)),p);
    const a=physical(rows(p.index)),b=physical(rows(p.index,1)),c=physical(rows(p.index,2));
    assert(!signatures.has(a),'duplicate first-phase real ray composition '+p.index);signatures.add(a);
    assert.notEqual(a,b,'phase1 must visibly differ '+p.index);assert.notEqual(b,c,'phase2 must visibly differ '+p.index);
  }
  assert.equal(ids.size,35);assert.equal(signatures.size,35);assert.equal(L.profileFor({...world(11),finalPractice:true}).index,34);
  const box={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/boss-lasers-v28.js'),'utf8'),box);assert.equal(box.HapilBossLasersV28.profiles.length,35);
});

test('all 315 actual boss/phase/difficulty salvos keep bounded capsules, honest clocks, finite lifetimes and owner identity',()=>{
  let checked=0;for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell']){
    const w=world(index,phase,difficulty),source={...emit,sourceActorId:'own-emitter',modelActorId:index===33?'han-rian':'owner'},before=JSON.stringify([w,source]);
    const specs=L.makeBarrage(w,source,1),cap=difficulty==='hell'?8:difficulty==='gentle'?4:6;
    assert(specs.length>0&&specs.length<=cap);assert.deepEqual(specs,L.makeBarrage(w,source,1));assert.equal(JSON.stringify([w,source]),before);
    for(const s of specs){
      assert([s.x,s.y,s.x2,s.y2,s.angle,s.length,s.width,s.warningTicks,s.staggerTicks,s.activeTicks,s.fadeTicks].every(Number.isFinite));
      assert(s.x>=0&&s.x<=360&&s.x2>=0&&s.x2<=360&&s.y>=0&&s.y<=640&&s.y2>=0&&s.y2<=640);assert(s.length>=12);assert(s.width>=3.6&&s.width<=14.5);
      close(s.length,Math.hypot(s.x2-s.x,s.y2-s.y));close(s.angle,Math.atan2(s.y2-s.y,s.x2-s.x));
      assert.equal(s.warningTicks,difficulty==='gentle'?66:54);assert(s.staggerTicks>=0&&s.staggerTicks<=55);assert(s.activeTicks>=8&&s.activeTicks<=20);assert(s.fadeTicks>=8&&s.fadeTicks<=12);
      assert(s.warningTicks+s.staggerTicks+s.activeTicks+s.fadeTicks<L.cadenceFor(w),'next burst must not overlap an unexpired previous group');
      assert.equal(s.sourceActorId,source.sourceActorId);assert.equal(s.modelActorId,source.modelActorId);assert.equal(s.ownerId,19);assert.equal(s.sourcePhase,phase);assert.equal(s.kind,'laser');
    }
    checked++;
  }
  assert.equal(checked,315);
});

test('mirrors are two actual continuous finite capsules with exactly shared warning/active clocks and real reflected direction',()=>{
  let chains=0;for(const index of [3,6,15,24,30,34])for(const phase of [0,1,2]){
    const specs=rows(index,phase,'hell',1);if(!specs.some(s=>s.v28Reflected))continue;
    const groups=new Map();for(const s of specs){if(!groups.has(s.chainId))groups.set(s.chainId,[]);groups.get(s.chainId).push(s);}
    for(const pair of groups.values()){
      assert.equal(pair.length,2);const a=pair.find(s=>s.v28Segment===0),b=pair.find(s=>s.v28Segment===1);assert(a&&b&&a.v28Reflected&&b.v28Reflected);
      assert.equal(a.v28RayGroup,b.v28RayGroup);assert.equal(a.x2,b.x);assert.equal(a.y2,b.y);assert([L.bounds.left,L.bounds.right].includes(a.x2));
      assert.equal(a.warningTicks,b.warningTicks);assert.equal(a.staggerTicks,b.staggerTicks);assert.equal(a.activeTicks,b.activeTicks);assert.equal(a.fadeTicks,b.fadeTicks);assert.equal(a.width,b.width);
      close(Math.cos(b.angle),-Math.cos(a.angle));close(Math.sin(b.angle),Math.sin(a.angle));assert(a.length<680&&b.length<680,'both finite ends must be retained, not extended to the legacy680px beam');chains++;
    }
  }
  assert(chains>=12);
});

test('piano and arpeggio lasers leave two adjacent announced rests while their locked positions advance by beat',()=>{
  for(const index of [8,9,11,18])for(const difficulty of ['gentle','normal','hell']){
    const a=rows(index,0,difficulty,0),b=rows(index,0,difficulty,1),keys=a[0].v28KeyCount,rest=a[0].v28RestLane;
    assert(a.every(s=>Number.isInteger(s.v28LaneIndex)&&s.v28LaneIndex!==rest&&s.v28LaneIndex!==(rest+1)%keys));
    assert.notEqual(rest,b[0].v28RestLane);assert(new Set(a.map(s=>s.x)).size===a.length);assert(new Set(a.map(s=>s.staggerTicks)).size>1);
    const ordered=a.slice().sort((x,y)=>x.staggerTicks-y.staggerTicks);assert(ordered[ordered.length-1].staggerTicks-ordered[0].staggerTicks>=5);
  }
});

test('reticles sample pilot aim only at commit and cached ray specs never follow later pilot/caster movement',()=>{
  for(const index of [4,14,21,31]){
    const phase=index===4||index===21?1:0,w=world(index,phase),source={...emit},specs=L.makeBarrage(w,source,2),locked=JSON.stringify(specs);
    assert(specs.every(s=>s.v28Mode==='reticle'));w.player.x=30;w.player.y=280;source.x=312;source.y=190;
    assert.equal(JSON.stringify(specs),locked,'already committed target positions must remain plain immutable values');
    assert.notEqual(physical(L.makeBarrage(w,source,2)),physical(specs),'a later separate burst may sample a new target');
  }
});

test('actual paired casters keep separate own-emitter cross and shield programs; copies stay within the reduced budget',()=>{
  const w=world(33,2,'hell');
  const a=L.makeBarrage(w,{x:96,y:126,sourceActorId:'copy-rian',modelActorId:'han-rian'},0,{copy:true});
  const b=L.makeBarrage(w,{x:264,y:126,sourceActorId:'copy-ion',modelActorId:'baek-ion'},0,{copy:true});
  assert(a.length<=4&&b.length<=4);assert(a.every(s=>s.identityRole==='circuit-cross'&&s.modelActorId==='han-rian'&&s.sourceActorId==='copy-rian'&&s.v28Mode==='fork'));
  assert(b.every(s=>s.identityRole==='circuit-shield'&&s.modelActorId==='baek-ion'&&s.sourceActorId==='copy-ion'&&s.v28Mode==='parallel'));assert.notEqual(physical(a),physical(b));
  assert.deepEqual(L.makeBarrage({...w,bossIndex:-1},emit,0),[]);assert.deepEqual(L.makeBarrage(w,{x:NaN,y:126},0),[]);
});

test('finite crossfire clips before the reserved capsule without moving its source, aim or clocks',()=>{
  const w=world(2,1,'normal'),route={x1:120,y1:520,x2:240,y2:520,halfWidth:24},raw=L.makeBarrage(w,emit,0),before=JSON.stringify([w,route]);
  const fitted=L.makeBarrage(w,emit,0,{escapeRoute:route,playerRadius:2});
  assert(fitted.length>0);assert(fitted.some(s=>s.v28RouteClipped));assert(fitted.some(s=>Math.max(s.y,s.y2)>=260),'clipping must leave a meaningful pilot-region beam');
  for(const s of fitted){
    const original=raw.find(r=>r.chainId===s.chainId&&r.v28Segment===s.v28Segment);assert(original);assert.equal(s.x,original.x);assert.equal(s.y,original.y);assert.equal(s.angle,original.angle);
    for(const key of ['warningTicks','staggerTicks','activeTicks','fadeTicks','sourcePhase'])assert.equal(s[key],original[key]);
    assert(s.length>=Math.max(24,3*s.width));if(s.v28RouteClipped)assert(s.length<s.v28UnclippedLength);
    // Independent dense point sampling against the simple horizontal route:
    // the width/player capsule stays outside, including its endpoint caps.
    const clearance=route.halfWidth+s.width/2+2;
    for(let n=0;n<=1000;n++){const t=n/1000,x=s.x+(s.x2-s.x)*t,y=s.y+(s.y2-s.y)*t,rx=Math.max(route.x1-x,0,x-route.x2);assert(rx*rx+(y-route.y1)**2>clearance*clearance);}
  }
  assert.equal(JSON.stringify([w,route]),before);
  assert.deepEqual(L.makeBarrage({...w,_pressurePlan:{route,expireAt:900}},emit,0),fitted,'current protected route and explicit route use the same precommit geometry');
});

test('route-safe mirrors keep the full first wall leg and shorten only a meaningful reflected return',()=>{
  for(const [index,x]of [[3,280],[24,72]]){
    const w=world(index,0,'normal'),route={x1:x,y1:260,x2:x,y2:614,halfWidth:24},raw=L.makeBarrage(w,emit,0),fitted=L.makeBarrage(w,emit,0,{escapeRoute:route,playerRadius:2});
    assert(fitted.length>=2);assert.equal(fitted.length%2,0);let hasReturn=false;
    for(let i=0;i<fitted.length;i+=2){
      const first=fitted[i],last=fitted[i+1],oldFirst=raw.find(s=>s.chainId===first.chainId&&s.v28Segment===0),oldLast=raw.find(s=>s.chainId===last.chainId&&s.v28Segment===1);
      assert.deepEqual(first,oldFirst,'the first leg cannot pretend a protected-route edge is a physical wall');assert(oldLast);assert.equal(first.x2,last.x);assert.equal(first.y2,last.y);assert.equal(first.chainId,last.chainId);
      assert.equal(last.angle,oldLast.angle);assert(last.length>=Math.max(24,3*last.width));hasReturn=hasReturn||!!last.v28RouteClipped;
      const clearance=route.halfWidth+first.width/2+2;
      for(const s of [first,last])for(let n=0;n<=1000;n++){
        const t=n/1000,px=s.x+(s.x2-s.x)*t,py=s.y+(s.y2-s.y)*t,ry=Math.max(route.y1-py,0,py-route.y2);assert((px-x)**2+ry*ry>clearance*clearance);
      }
    }
    assert(hasReturn,'the formerly rejected full-map reflected return should survive as an honest finite capsule');
  }
});

test('the gentle three-note Pride chord opens outside its central reserved gate and still reaches the pilot region',()=>{
  const w=world(11,1,'gentle'),route={x1:252,y1:260,x2:252,y2:614,halfWidth:24},source={x:236,y:126};
  const raw=L.makeBarrage(w,source,0);assert.equal(raw.length,3);assert(Math.cos(raw[0].angle)<0&&Math.cos(raw[2].angle)>0,'outside notes diverge from their own left/right origins');
  const fitted=L.makeBarrage(w,source,0,{escapeRoute:route,playerRadius:2});assert(fitted.length>0);
  assert(fitted.some(s=>Math.max(s.y,s.y2)>=260&&Math.min(s.x,s.x2)<=344&&Math.max(s.x,s.x2)>=16),'a surviving ray must enter the actual pilot area, rather than leave only upper-screen glints');
});
