'use strict';
// Native CPU full-scene raster timing. No browser, GPU or phone-FPS claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const a=require('./audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const {performance}=require('node:perf_hooks');
async function main(){
 const current=a.runtime(),prior=a.runtime(a.BASE),cache=new Map(),sources={},rows=[];
 const initial=a.sha(a.source('src/projectiles.js'));
 for(const group of[6,8,9]){
  const images=await a.imagesFor(current,group,cache,sources,prior);
  const w=a.coreWorld(current,2,'hell',21,group);
  while(w.tick<235)current.HapilCore.step(w,{});
  const immutable=JSON.stringify(w);
  for(const low of[false,true]){
   const row={group,tick:w.tick,quality:low?'low':'high',bullets:w.bullets.length,hazards:w.hazards.length};
   for(const [name,box]of[['baseline',prior],['current',current]]){
    const canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images);
    try{
     renderer.resize(360,640,1);
     for(let n=0;n<5;n++)renderer.draw(w,0,w.time,low);
     const samples=[];
     for(let n=0;n<25;n++){const t=performance.now();renderer.draw(w,0,w.time,low);samples.push(performance.now()-t);}
     samples.sort((x,y)=>x-y);const m=renderer.getMetrics().projectilePresentation;
     assert.equal(m.missingProjectileAssets,0);assert(m.stampCacheBytes<=4194304);
     assert.equal(m.stampCacheMisses,0);assert.equal(m.beamFrameCacheBuilds||0,0);
     row[name]={samples:25,p50Ms:samples[12],p95Ms:samples[23],maxMs:samples[24],cacheBytes:m.stampCacheBytes,sourceDraws:m.stampDraws};
    }finally{renderer.destroy();}
   }
   assert.equal(JSON.stringify(w),immutable);rows.push(row);
  }
 }
 assert.equal(a.sha(a.source('src/projectiles.js')),initial);
 const report={date:'2026-10-31',scope:'Native CPU360x640 DPR1 complete source scenes at one frozen immune practice snapshot;5warmups+25measured synchronous draws per row/runtime on a shared host. Not browser, GPU completion, sustained gameFPS or phone measurement.',baseline:a.BASE,projectileSHA256:initial,rows};
 fs.writeFileSync(path.join(a.ROOT,'docs/v24-qa/actual-scene-cpu-cost.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(rows));
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1});
