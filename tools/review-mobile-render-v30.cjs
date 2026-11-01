'use strict';
// Real-core source-pixel/cache checks. Native CPU timings are not device FPS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const a=require('./audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const json=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function world(box,index=8,phase=0,tick=300,revision=30){
  const C=box.HapilCore,first=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'v30-pressure-source-review'}),snap=C.checkpoint(first);snap.phase=phase;
  const w=C.restoreCheckpoint(snap);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;while(w.tick<tick)C.step(w,{});return w;
}
function fixture(box,images,cssW=360,dpr=1){
  const canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images),ctx=canvas.getContext('2d');renderer.resize(cssW,cssW*640/360,dpr);
  return {canvas,renderer,draw(w,low=true,precise=true){renderer.draw(w,0,w.time,low,{precise});return {pixels:Buffer.from(ctx.getImageData(0,0,canvas.width,canvas.height).data),metrics:json(renderer.getMetrics())};},close(){renderer.destroy();}};
}
function direct(w){const out=json(w);for(const h of out.hazards)if(h.pressureCurtain&&h.phase==='active')h.age=0;return out;}
function eligiblePressureCount(w){let run=0;for(const h of w.hazards){if(h.pressureCurtain&&h.phase==='active'&&!Number.isFinite(h.age))run++;else{if(run>=4)return run;run=0;}}return run>=4?run:0;}
function difference(left,right){assert.equal(left.length,right.length);let changed=0,max=0,sum=0;for(let n=0;n<left.length;n+=4){let pixel=false;for(let k=0;k<4;k++){const d=Math.abs(left[n+k]-right[n+k]);if(d){pixel=true;max=Math.max(max,d);sum+=d;}}if(pixel)changed++;}return {changedPixels:changed,maxChannelDelta:max,totalChannelDelta:sum};}
function timedPair(cached,direct,world,directWorld){
  const rows={direct:[],cached:[]},draw={direct:()=>direct.renderer.draw(directWorld,0,directWorld.time,true,{precise:true}),cached:()=>cached.renderer.draw(world,0,world.time,true,{precise:true})};
  for(let n=0;n<8;n++){draw.direct();draw.cached();}
  for(let block=0;block<10;block++)for(const key of block%2?['cached','direct']:['direct','cached'])for(let n=0;n<6;n++){const t=performance.now();draw[key]();rows[key].push(performance.now()-t);}
  return Object.fromEntries(Object.entries(rows).map(([key,times])=>{times.sort((a,b)=>a-b);return [key,{frames:times.length,medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.floor(times.length*.95)]}];}));
}
function countDraws(f,w){
  const ctx=f.canvas.getContext('2d'),originals={},counts={drawImage:0,clip:0};
  for(const key of Object.keys(counts)){originals[key]=ctx[key];ctx[key]=function(...args){counts[key]++;return originals[key].apply(this,args);};}
  try{f.renderer.draw(w,0,w.time,true,{precise:true});}finally{for(const key of Object.keys(counts))ctx[key]=originals[key];}
  const m=f.renderer.getMetrics(),p=m.projectilePresentation;return {...counts,scope:'one warmed complete main-canvas frame; offscreen pressure build0',pressureFrameBuilds:m.pressureLayerCache.frameBuilds,pressureFrameHits:m.pressureLayerCache.frameHits,logicalLaserBodies:p.assetLaserDraws,rasterLaserBodies:p.rasterAssetLaserDraws,cachedLaserBodies:p.cachedAssetLaserDraws};
}
async function matrix(box=a.runtime()){
  const cache=new Map(),rows=[];
  for(const index of[0,8,33])for(const phase of[0,2]){
    const w=world(box,index,phase);assert.equal(w.combatRevision,30);const im=await a.imagesFor(box,index>=12?index+1:index,cache),bodyCount=w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length,eligibleBodies=eligiblePressureCount(w);
    const f=fixture(box,im),g=fixture(box,im),before=JSON.stringify(w);
    try{for(const cssW of[306,360])for(const dpr of[1,1.5]){
        f.renderer.resize(cssW,cssW*640/360,dpr);g.renderer.resize(cssW,cssW*640/360,dpr);
        const reference=g.draw(direct(w)),cold=f.draw(w);for(let n=0;n<3;n++)f.draw(w);const allocated=box.allocated.length,warm=f.draw(w),m=warm.metrics,p=m.projectilePresentation;
        const pixels=difference(warm.pixels,reference.pixels);assert(pixels.maxChannelDelta<=4,'only bounded alpha-composition rounding is allowed '+JSON.stringify({index,phase,cssW,dpr,pixels}));assert(cold.pixels.equals(warm.pixels));assert.equal(box.allocated.length,allocated);assert.equal(JSON.stringify(w),before);
        assert.equal(p.missingProjectileAssets,0);assert.equal(p.assetLaserDraws,bodyCount);assert.equal(p.cachedAssetLaserDraws,eligibleBodies);assert.equal(p.rasterAssetLaserDraws+p.cachedAssetLaserDraws,bodyCount);assert.equal(m.pressureLayerCache.frameHits,eligibleBodies?1:0);assert.equal(m.pressureLayerCache.frameBuilds,0);assert(m.pressureLayerCache.bytes<=4194304);assert.equal(m.pressureLayerCache.entries,eligibleBodies?1:0);if(!eligibleBodies)assert(warm.pixels.equals(reference.pixels),'short pressure runs retain exact direct pixels');
        rows.push({index,phase,tick:w.tick,cssW,dpr,pixels,bodyCount,eligibleBodies,cachedBodies:p.cachedAssetLaserDraws,rasterBodies:p.rasterAssetLaserDraws,cacheBytes:m.pressureLayerCache.bytes,missingAssets:p.missingProjectileAssets});
    }}finally{f.close();g.close();}
  }
  return rows;
}
async function fourCopyScene(box=a.runtime(),cache=new Map()){
  const w=world(box,0,2,421),copies=w.boss.combatCopies.filter(c=>w.tick>=c.born&&w.tick<c.expireAt),images=await a.imagesFor(box,0,cache),f=fixture(box,images),before=JSON.stringify(w),qualities=[];
  assert.equal(copies.length,4,'actual HELL phase2 tick421 owns four live firing copies');
  try{for(const low of[false,true]){
    const out=f.draw(w,low),m=out.metrics,samples=m.actorPresentation.lastCombatCopySamples;
    assert.equal(m.combatCopyDraws,4);assert.equal(m.actorPresentation.combatCopyDraws,4);assert.equal(m.actorPresentation.combatCopyMissingAssets,0);assert.equal(m.projectilePresentation.missingProjectileAssets,0);
    assert.deepEqual(samples.map(s=>({id:s.id,sourceActorId:s.sourceActorId,modelActorId:s.modelActorId,position:s.position})),json(copies.map(c=>({id:c.id,sourceActorId:c.sourceActorId,modelActorId:c.modelActorId||null,position:[c.x,c.y]}))));
    assert.equal(JSON.stringify(w),before);qualities.push({quality:low?'low':'high',combatCopyDraws:m.combatCopyDraws,samples});
  }}finally{f.close();}
  return {scope:'Actual immune HELL boss0 phase2 tick421 fullscene, attacks/skills disabled; all four live copies use their committed owned source and exact core positions in both qualities.',index:0,phase:2,tick:421,worldSHA256:sha(before),qualities};
}
async function main(){
  const reportPath=path.join(a.ROOT,'docs/V30-MOBILE-RENDER-REVIEW-20261101.json'),previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath)):null;
  const initialCandidate=previous&&(previous.initialCandidate||{scope:'Initial cache-all-active-pressure-runs candidate before the measured minimum-four-body cost threshold; historical probe only, not final product performance.',productSHA256:previous.productSHA256,toolSHA256:previous.toolSHA256,timings:previous.timings});
  const files=['src/render.js','src/projectiles.js','src/core.js','src/actors.js','src/boss-flow-v29.js','src/boss-patterns-v27.js'],hashes=()=>Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(path.join(a.ROOT,p)))])),initial=hashes(),toolSHA256=sha(fs.readFileSync(__filename)),box=a.runtime(),rows=await matrix(box),timings=[],cache=new Map(),actualFourCopyScene=await fourCopyScene(box,cache);
  for(const index of[0,8,33]){const w=world(box,index),d=direct(w),im=await a.imagesFor(box,index>=12?index+1:index,cache),f=fixture(box,im),g=fixture(box,im);try{timings.push({index,tick:w.tick,cacheEligible:eligiblePressureCount(w)>=4,scope:'same actual immune core30 snapshot; direct age0 is the identical static source frame with cache disabled; cached means final policy and falls back live for short runs; sixty draws per path in ten interleaved alternating-order blocks',...timedPair(f,g,w,d),directDraws:countDraws(g,d),cachedDraws:countDraws(f,w),metrics:json(f.renderer.getMetrics().pressureLayerCache)});}finally{f.close();g.close();}}
  assert.deepEqual(hashes(),initial);assert.equal(sha(fs.readFileSync(__filename)),toolSHA256);const report={schema:1,date:'2026-11-01',scope:'Native CPU same-source render comparison of actual immune HELL core30 pressure states, attacks/skills disabled. No attack bodies are reduced or hidden. Not phone/GPU FPS, human play or a complete campaign.',productSHA256:initial,toolSHA256,summary:{pixelCases:rows.length,maximumChannelDelta:Math.max(...rows.map(r=>r.pixels.maxChannelDelta)),maximumCacheBytes:Math.max(...rows.map(r=>r.cacheBytes)),missingAssets:rows.reduce((n,r)=>n+r.missingAssets,0),cacheByteLimit:4194304,minimumPressureBodies:4,actualFourCopyQualities:actualFourCopyScene.qualities.length},limits:['One contiguous active pressure run of at least4bodies only; shorter runs, ordinary lasers, warnings, fades, bullets and high quality still draw live.','A static transparent layer can round intermediate RGB by at most the measured few levels; capsule geometry, source material, opacity and final hitpoint remain unchanged.','Frames with hundreds of live bullets still issue a draw for each bullet. Shared-host native CPU results are not universal speedups; browser/device profiling is required for a phone FPS claim.'],rows,timings,actualFourCopyScene,initialCandidate};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({summary:report.summary,timings:timings.map(x=>({index:x.index,direct:x.direct,cached:x.cached,directDraws:x.directDraws,cachedDraws:x.cachedDraws}))})+'\n');return report;
}
module.exports={a,world,fixture,direct,difference,matrix,fourCopyScene,json,createCanvas};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
