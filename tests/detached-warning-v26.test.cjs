'use strict';
// Independent native CPU checks of real scheduled attacks and source-only cue
// placement. These fixtures do not claim browser/GPU/phone performance.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const a=require('../tools/audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const json=value=>JSON.parse(JSON.stringify(value));

function run(box,index,phase=0,difficulty='hell'){
  const C=box.HapilCore,initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:25,practiceBoss:true,bossIndex:index,phase,difficulty,seed:4242,runId:'detached-warning-independent'});
  const boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
  return w;
}
function firstPlan(box,index,phase=0,difficulty='hell'){
  const w=run(box,index,phase,difficulty);for(let n=0;n<180;n++){
    box.HapilCore.step(w,{});
    const p=(w._identityPlans||[]).find(p=>!p.cast.sourceActorId);
    if(p)return {w,p};
  }
  assert.fail('actual detached emitter did not schedule '+index);
}
function origins(p){return p.specs.map(s=>({x:s.x,y:s.y,angle:s.angle}));}
function checkClusters(record,raw,expected){
  assert.equal(record.detached,true,'detached cast must declare source-relative preview placement');
  assert(Array.isArray(record.emissionOrigins));assert.equal(record.emissionOrigins.length,expected);
  assert.equal(record.emissionOrigins.reduce((n,c)=>n+c.shotCount,0),raw.length,'every real shot is represented once');
  for(const c of record.emissionOrigins){assert([c.x,c.y,c.angle].every(Number.isFinite));assert(Number.isInteger(c.shotCount)&&c.shotCount>0);}
  for(const o of raw)assert(record.emissionOrigins.some(c=>Math.hypot(c.x-o.x,c.y-o.y)<=24),'preview cluster must cover true emission origin '+JSON.stringify(o));
  assert.equal(record.x,record.emissionOrigins[0].x);assert.equal(record.y,record.emissionOrigins[0].y);
}
function sourceOnly(ctx,onDraw=()=>{}){
  return new Proxy(ctx,{get(t,k){
    if(['fill','fillRect','stroke','strokeRect','arc','ellipse','fillText','strokeText'].includes(k))return()=>{throw Error('unexpected synthetic cue geometry '+k);};
    const f=t[k];if(k==='drawImage')return(...args)=>{onDraw(args);return f.apply(t,args);};return typeof f==='function'?f.bind(t):f;
  },set(t,k,v){t[k]=v;return true;}});
}
async function fixture(index){
  const box=a.runtime(),make=box.document.createElement;
  // Guard cached compound construction as well as the final live canvas.
  box.document.createElement=function(name){const c=make(name),get=c.getContext.bind(c);c.getContext=(...args)=>sourceOnly(get(...args));return c;};
  const group=index+1,im=await a.imagesFor(box,group),fx=box.HapilBossSkills.create(im),canvas=createCanvas(360,640),ctx=canvas.getContext('2d');
  function draw(w,low=false){ctx.clearRect(0,0,360,640);let draws=0;const before=JSON.stringify(w);fx.beginFrame();fx.draw(sourceOnly(ctx,()=>draws++),w,low);assert.equal(JSON.stringify(w),before,'presentation cannot mutate the simulation');return {metrics:json(fx.getMetrics()),pixels:Buffer.from(ctx.getImageData(0,0,360,640).data),draws};}
  return {box,fx,canvas,draw,close(){fx.destroy();}};
}
function warningWorld(w,p){const out=json(w);out.boss.action='recover';out.boss.skillReleases=[];out.boss.identityCasts=[json(p.cast)];return out;}

test('real academy/workshop plans pin exact frozen origins after route filtering and release only those trajectories',()=>{
  const box=a.runtime();let releases=0,filtered=0;
  for(const index of[21,24])for(const phase of[0,1,2])for(const difficulty of['gentle','normal','hell']){
    const w=run(box,index,phase,difficulty),seen=new Map(),born=new Set();
    for(let n=0;n<660;n++){
      box.HapilCore.step(w,{});
      for(const p of w._identityPlans||[]){
        assert(Array.isArray(p.cast.emissionOrigins),'detached main source needs explicit real origins');
        assert(Object.isFrozen(p.cast.emissionOrigins));assert(p.cast.emissionOrigins.every(Object.isFrozen));
        assert.deepEqual(json(p.cast.emissionOrigins),json(origins(p)),'warning must use surviving authored specs, not pre-filtered fan positions');
        if(p.specs.length<(difficulty==='hell'?7:difficulty==='normal'?5:3))filtered++;
        const previous=seen.get(p.cast.id);if(previous)assert.deepEqual(json(p.cast.emissionOrigins),previous);else seen.set(p.cast.id,json(p.cast.emissionOrigins));
      }
      for(const b of w.bullets){
        if(!b.identityCastId||born.has(b.id))continue;born.add(b.id);
        const committed=seen.get(b.identityCastId);assert(committed,'real shot cannot precede its warning');
        assert(committed.some(o=>o.x===b.px&&o.y===b.py&&Math.abs(o.angle-b.angle)<1e-9),'real shot moved away from its committed source');
        assert.equal(w.tick,b.identityActiveAt);releases++;
      }
    }
  }
  assert(releases>100,'actual volleys were exercised');assert(filtered>0,'route-filtered positions were exercised');
});

test('native source previews appear at the true academy turret and both workshop emitters with one live draw per volley',async()=>{
  for(const index of[21,24]){const f=await fixture(index);try{
    const {w,p}=firstPlan(f.box,index),raw=origins(p),out=warningWorld(w,p);
    for(const low of[false,true]){
      const result=f.draw(out,low),m=result.metrics;
      assert.equal(m.skillWarningDraws,1);assert.equal(m.skillSourceDraws,1);assert.equal(result.draws,1);
      assert.equal(m.representedCasts.length,1);checkClusters(m.representedCasts[0],raw,index===21?1:2);
      assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);
      for(const o of raw){let pixels=0;for(let y=Math.max(0,Math.floor(o.y)-24);y<=Math.min(639,Math.ceil(o.y)+24);y++)for(let x=Math.max(0,Math.floor(o.x)-24);x<=Math.min(359,Math.ceil(o.x)+24);x++)pixels+=result.pixels[(y*360+x)*4+3]>8;assert(pixels>0,'source pixels must surround the real emitter');}
      let falseBossPixels=0;for(let y=Math.floor(p.cast.y)-4;y<=Math.floor(p.cast.y)+4;y++)for(let x=Math.floor(p.cast.x)-4;x<=Math.floor(p.cast.x)+4;x++)falseBossPixels+=result.pixels[(y*360+x)*4+3]>8;
      assert.equal(falseBossPixels,0,'detached fan must not paint its warning over the old boss origin');
    }
  }finally{f.close();}}
});

test('all 54 warning frames reuse committed headings and bounded warmed composite caches without mutating worlds',async()=>{
  for(const index of[21,24]){const f=await fixture(index);try{
    const {w,p}=firstPlan(f.box,index),out=warningWorld(w,p);let allocationCount,locked;
    for(let age=0;age<54;age++){
      out.tick=p.cast.warningAt+age;
      // Changing aim and actor position cannot move a detached committed cast.
      out.player.x=40+(age%2)*280;out.boss.x=130+age;
      const current=f.draw(out,true),m=current.metrics;
      checkClusters(m.representedCasts[0],origins(p),index===21?1:2);
      const now=JSON.stringify(m.representedCasts[0].emissionOrigins);if(locked)assert.equal(now,locked,'locked cluster headings cannot follow later player aim');else locked=now;
      if(age>0)assert.equal(f.box.allocated.length,allocationCount,'progress/tick/player movement must not rebuild a committed source stamp');
      allocationCount=f.box.allocated.length;assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);
      const repeat=f.draw(out,true);assert(current.pixels.equals(repeat.pixels),'repeated paused frame is deterministic');
    }
  }finally{f.close();}}
});

test('four detached workshop volleys keep all eight real emitters inside the low4/high8 live image budget',async()=>{
  const f=await fixture(24);try{
    const {w,p}=firstPlan(f.box,24),out=warningWorld(w,p);
    out.boss.identityCasts=Array.from({length:4},(_,i)=>({...json(p.cast),id:'independent-workshop-'+i,emissionOrigins:json(p.cast.emissionOrigins)}));
    for(const low of[true,false]){
      const result=f.draw(out,low),m=result.metrics;assert.equal(m.skillWarningDraws,4);assert.equal(m.skillWarningCandidates,4);assert.equal(m.skillSourceDraws,4);assert.equal(result.draws,4);
      assert.equal(m.representedCasts.length,4);for(const r of m.representedCasts)checkClusters(r,origins(p),2);
      assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);
    }
  }finally{f.close();}
});

test('cancelled or elapsed detached casts never create ghost warnings or invented release accents',async()=>{
  const f=await fixture(24);try{
    const {w,p}=firstPlan(f.box,24);
    for(const patch of[{tick:p.cast.warningAt-1},{tick:p.cast.activeAt},{tick:p.cast.expireAt},{tick:p.cast.warningAt,cancelled:true}]){
      const out=warningWorld(w,p);out.tick=patch.tick;if(patch.cancelled)out.boss.identityCasts[0].cancelled=true;
      const result=f.draw(out,true),m=result.metrics;assert.equal(m.skillWarningDraws,0);assert.equal(m.representedCasts.length,0);assert.equal(m.representedReleases.length,0);assert.equal(result.draws,0);
    }
  }finally{f.close();}
});

test('successful real volleys reuse their committed emitter clusters for one finite release accent',async()=>{
  for(const index of[21,24]){const f=await fixture(index);try{
    const {w,p}=firstPlan(f.box,index),raw=json(p.cast.emissionOrigins);
    while(w.tick<p.cast.activeAt)f.box.HapilCore.step(w,{});
    const records=w.boss.skillReleases.filter(e=>e.identityCastId===p.cast.id);
    assert.equal(records.length,1,'one successful volley produces one actual release record');
    assert.deepEqual(json(records[0].emissionOrigins),raw,'release cannot reconstruct origins from the later actor position');
    assert.equal(records[0].tick,p.cast.activeAt);
    const out=json(w);out.boss.action='recover';out.boss.identityCasts=[];out.boss.skillReleases=json(records);
    for(const low of[false,true]){
      const result=f.draw(out,low),m=result.metrics;assert.equal(result.draws,1);assert.equal(m.representedReleases.length,1);
      checkClusters(m.representedReleases[0],origins(p),index===21?1:2);assert.equal(m.skillWarningDraws,0);
    }
    out.tick=records[0].tick+30;const ended=f.draw(out,true);assert.equal(ended.draws,0);assert.equal(ended.metrics.representedReleases.length,0);
  }finally{f.close();}}
});

test('only the two detached main-emitter encounters receive added preview metadata',()=>{
  const box=a.runtime();for(const index of[0,5,8,18,20,22,23,25,33,34]){
    const w=run(box,index);for(let n=0;n<240;n++){
      box.HapilCore.step(w,{});for(const p of w._identityPlans||[])assert.equal(p.cast.emissionOrigins,undefined,'unrelated source or copy metadata changed '+index);
    }
  }
});
