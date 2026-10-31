'use strict';
// Independent source-pixel, geometry, clock and allocation gates. These are
// CPU render fixtures; they do not establish real-phone FPS or human clears.
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../tools/audit-laser-pixels-v23.cjs');
let fixture;
function prepared(){if(!fixture)fixture={box:audit.runtime(),baseline:audit.runtime(audit.BASE),cache:new Map(),sources:{}};return fixture;}
test('source laser detail materially improves original, sins, controller, late and paired beams in both quality levels while remaining inside committed geometry',async()=>{
 const{box,baseline,cache,sources}=prepared(),rows=[];for(const group of[0,1,2,11,17,20,30,34,35])for(const low of[false,true])for(const kind of['wide','diagonal'])rows.push((await audit.caseFor(box,baseline,group,kind,low,cache,sources,group===34?'baek-ion':null)).row);audit.gate(rows);assert.equal(rows.length,36);
});
test('actual immune phase3 core observations switch warning, active and harmless afterglow at exactly their committed clocks',async()=>{
 const{box,cache,sources}=prepared(),rows=await audit.actualClockReview(box,cache,sources);assert.equal(rows.length,32);assert(rows.filter(r=>r.phase==='warning').every(r=>r.assetLaserDraws===0));assert(rows.filter(r=>r.phase!=='warning').every(r=>r.assetLaserDraws===r.hazardCount));
});
test('paired Han Rian and Baek Ion beams retain independently warm and cool source colours in both palette slots and quality levels',async()=>{
 const{box,cache,sources}=prepared(),images=await audit.imagesFor(box,34,cache,sources),w=audit.world(34),fx=box.HapilProjectiles.create(images);
 try{for(const low of[false,true])for(const paletteSlot of[0,1])for(const sourceActorId of['han-rian','baek-ion']){const h=audit.geometry('wide',{sourceActorId,paletteSlot}),out=audit.paint(box,images,w,[h],low,fx),palette=box.HapilProjectiles.paletteFor(w,h),chroma=hex=>parseInt(hex.slice(1,3),16)-parseInt(hex.slice(5,7),16),minimumChroma=Math.min(Math.abs(chroma(palette.primary)),Math.abs(chroma(palette.secondary)))*.3;let sum=0,n=0;for(let y=220;y<540;y++)for(let x=75;x<145;x++){if(Math.abs(x+.5-110)<20)continue;const i=(y*360+x)*4;if(out.data[i+3]<100)continue;sum+=out.data[i]-out.data[i+2];n++;}assert(n>1000,'owned shoulder source pixels are visible');assert(Math.sign(chroma(palette.primary))*sum/n>minimumChroma,`${sourceActorId}/slot${paletteSlot}/${low}: actual pixels retain the owner warm/cool hue, including its intentionally off-white secondary role; red-blue=${sum/n},required magnitude=${minimumChroma}`);assert.equal(out.metrics.missingProjectileAssets,0);}
 }finally{fx.destroy();}
});
test('warm laser draws and forty-source saturation allocate no per-frame surfaces and release every cached canvas',async()=>{
 const{box,cache,sources}=prepared(),group=34,images=await audit.imagesFor(box,group,cache,sources),world=audit.world(group),fx=box.HapilProjectiles.create(images),first=box.allocated.length;
 try{const hs=Array.from({length:40},(_,i)=>audit.geometry(i%2?'horizontal':'diagonal',{id:i+1,sourceActorId:i%2?'han-rian':'baek-ion',paletteSlot:i%4<2?0:1}));
  for(const low of[false,true]){audit.paint(box,images,world,hs,low,fx);const count=box.allocated.length;for(let n=0;n<12;n++){world.tick++;world.time+=1/60;for(const h of hs)h.age+=1/60;const out=audit.paint(box,images,world,hs,low,fx);assert.equal(box.allocated.length,count,'flow must use cached source surfaces');assert.equal(out.metrics.missingProjectileAssets,0);assert.equal(out.metrics.assetLaserDraws,40);assert(out.metrics.stampCacheBytes<=4194304);assert(out.metrics.stampCacheEntries<=96);assert(out.metrics.beamFlowDraws<=(low?0:24),'high quality flow work has a fixed frame budget');assert(out.metrics.beamEmitterDraws<=(low?0:12),'emitter work has a fixed frame budget');assert.equal(out.metrics.beamFrameCacheBuilds,0,'steady-frame body/flow/emitter material cannot rebake');}}
 }finally{fx.destroy();assert(box.allocated.slice(first).every(c=>c.width===1&&c.height===1),'destroy releases all source, flow and emitter cache canvases');}
});
test('afterglow follows the retained fade fraction and never invents a visible damage warning or a missing-asset replacement',async()=>{
 const{box,cache,sources}=prepared(),group=0,im=await audit.imagesFor(box,group,cache,sources),w=audit.world(group),hs=[audit.geometry('narrow')];const sum=d=>{let total=0;for(let i=3;i<d.length;i+=4)total+=d[i];return total;};
 for(const low of[false,true]){const active=audit.paint(box,im,w,hs,low),start=audit.paint(box,im,w,[{...hs[0],phase:'fade',progress:0}],low),middle=audit.paint(box,im,w,[{...hs[0],phase:'fade',progress:.5}],low),end=audit.paint(box,im,w,[{...hs[0],phase:'fade',progress:1}],low),warning=audit.paint(box,im,w,[{...hs[0],phase:'warning'}],low);assert(sum(active.data)>sum(start.data));assert(sum(start.data)>sum(middle.data));assert.equal(sum(end.data),0);assert.equal(sum(warning.data),0);assert.equal(warning.metrics.assetLaserDraws,0);}
 const fx=box.HapilProjectiles.create({});try{const{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',audit.ROOT]})),ctx=createCanvas(360,640).getContext('2d');fx.beginFrame();assert.equal(fx.drawHazardBody(ctx,w,hs[0],false),false);assert.equal(sum(ctx.getImageData(0,0,360,640).data),0);assert.equal(fx.getMetrics().missingProjectileAssets,1);}finally{fx.destroy();}
});
