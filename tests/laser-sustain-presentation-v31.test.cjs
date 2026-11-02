'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../tools/review-mobile-render-v30.cjs'),a=r.a,BASE='6afd61432c6b2334d44e8ab81db065241c9a67ac';
const {createCanvas}=r,json=r.json;
function noShapes(ctx){return new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('source-only laser cannot invent damage art '+k);};const f=t[k];return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});}
function distance(x,y,h){const dx=h.x2-h.x1,dy=h.y2-h.y1,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-h.x1)*dx+(y-h.y1)*dy)/d)):0;return Math.hypot(x-h.x1-t*dx,y-h.y1-t*dy);}
function measure(canvas,h){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let interior=0,solid=0,outside=0,chroma=0,coloured=0,alpha=0,maxAlpha=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,d=distance(x+.5,y+.5,h),v=data[i+3];alpha+=v;maxAlpha=Math.max(maxAlpha,v);if(d<h.width/2-.75){interior++;solid+=v>=100;}if(d>h.width/2+1.25&&v>1)outside++;if(v>=100){chroma+=data[i]-data[i+2];coloured++;}}return {coverage:solid/Math.max(1,interior),outside,meanRedMinusBlue:chroma/Math.max(1,coloured),alpha,maxAlpha};}
function ray(patch={}){return {id:1,x1:30,y1:50,x2:130,y2:110,width:12,phase:'active',progress:.3,activeAt:180,fadeAt:240,expireAt:258,laserBarrage:true,v31Barrage:true,v31Stage:1,v31StageCount:3,...patch};}

test('all previous beam selectors including30 retain exact source pixels and non-Lucifer full scenes',async()=>{
  const box=a.runtime(),old=a.runtime(BASE),cache=new Map();
  for(const group of[0,4,8,34]){const images=await a.imagesFor(box,group,cache,{},old),now=box.HapilProjectiles.create(images),prior=old.HapilProjectiles.create(images),c=createCanvas(160,160),ctx=c.getContext('2d');try{
    for(const revision of[undefined,21,25,27,28,29,30])for(const low of[false,true])for(const phase of['active','fade']){
      const h=ray({phase,sourceActorId:group===34?'copied-baek-ion':undefined,modelActorId:group===34?'baek-ion':undefined}),w=a.world(group,{combatRevision:revision,tick:210});ctx.clearRect(0,0,160,160);now.beginFrame();now.drawHazardBody(noShapes(ctx),w,h,low);const pixels=Buffer.from(ctx.getImageData(0,0,160,160).data);ctx.clearRect(0,0,160,160);prior.beginFrame();prior.drawHazardBody(noShapes(ctx),w,h,low);assert(pixels.equals(Buffer.from(ctx.getImageData(0,0,160,160).data)),JSON.stringify({group,revision,low,phase}));
    }
    for(const revision of[29,30])for(const low of[false,true]){const h=ray({phase:'warning',activeAt:211}),w=a.world(group,{combatRevision:revision,tick:210});ctx.clearRect(0,0,160,160);now.beginFrame();now.drawHazardWarningCue(ctx,w,h,low);const pixels=Buffer.from(ctx.getImageData(0,0,160,160).data);ctx.clearRect(0,0,160,160);prior.beginFrame();prior.drawHazardWarningCue(ctx,w,h,low);assert(pixels.equals(Buffer.from(ctx.getImageData(0,0,160,160).data)));}
  }finally{now.destroy();prior.destroy();}}
  for(const index of[0,8,33]){const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},old),now=r.fixture(box,images),prior=r.fixture(old,images);try{for(const revision of[29,30]){const w=r.world(old,index,0,300,revision);for(const low of[false,true])assert(now.draw(w,low).pixels.equals(prior.draw(w,low).pixels));}}finally{now.close();prior.close();}}
});

test('held31 source art covers complete finite capsules and true owner endpoints without generic filler',async()=>{
  const box=a.runtime(),cache=new Map();let checked=0;
  for(const row of[{group:0},{group:4},{group:8},{group:34,owner:'han-rian',key:'storyRianCross'},{group:34,owner:'baek-ion',key:'storyIonShield'}]){const images=await a.imagesFor(box,row.group,cache),fx=box.HapilProjectiles.create(images),c=createCanvas(160,160),ctx=c.getContext('2d');try{
    for(const length of[0,20,100])for(const width of[6,18])for(const angle of[0,.8])for(const low of[false,true])for(const paletteSlot of[0,1]){
      const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2,h=ray({x1:80-dx,y1:80-dy,x2:80+dx,y2:80+dy,width,paletteSlot,sourceActorId:row.owner?'copied-'+row.owner:undefined,modelActorId:row.owner}),w=a.world(row.group,{combatRevision:31,tick:210}),before=JSON.stringify([w,h]);ctx.clearRect(0,0,160,160);fx.beginFrame();assert(fx.drawHazardBody(noShapes(ctx),w,h,low));assert.equal(JSON.stringify([w,h]),before);const m=measure(c,h),p=fx.getMetrics();assert(m.coverage>=.97);assert.equal(m.outside,0);assert.equal(p.assetLaserDraws,1);assert.equal(p.missingProjectileAssets,0);assert(p.stampCacheBytes<=4194304&&p.stampCacheEntries<=96);
      if(length>=12){assert.equal(p.laserSpectacleDraws,1);assert.equal(p.laserEndcapDraws,1);const s=p.laserSpectacles[0];for(const k of['x1','y1','x2','y2','width'])assert.equal(s[k],h[k]);assert(s.clippedToCommittedCapsule&&s.steadyDamageBody);if(row.key)assert.equal(s.sourceKey,row.key);if(low)assert.equal(p.beamFlowDraws,0);}
      if(row.owner)assert((row.owner==='han-rian'?1:-1)*m.meanRedMinusBlue>3);checked++;
    }
    for(const segment of[0,1]){ctx.clearRect(0,0,160,160);fx.beginFrame();fx.drawHazardBody(ctx,a.world(row.group,{combatRevision:31,tick:210}),ray({v28Reflected:true,v28Segment:segment}),false);const p=fx.getMetrics();assert.equal(p.laserEndcapDraws,segment);assert.equal(p.laserJointDraws,segment);}
  }finally{fx.destroy();}}
  assert.equal(checked,240);
});

test('charge lasts24warningticks inside the same capsule and true-clock afterglow remains dim and expires',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,8),fx=box.HapilProjectiles.create(images),c=createCanvas(160,160),ctx=c.getContext('2d'),w=a.world(8,{combatRevision:31,tick:210});try{
    for(const low of[false,true])for(const remaining of[25,24,12,1,0,-1]){ctx.clearRect(0,0,160,160);fx.beginFrame();const h=ray({phase:'warning',activeAt:w.tick+remaining}),shown=fx.drawHazardWarningCue(noShapes(ctx),w,h,low),p=fx.getMetrics();assert.equal(shown,remaining>=1&&remaining<=24);assert.equal(p.assetLaserDraws,0);if(shown){assert.equal(p.imminentCues[0].windowTicks,24);assert.equal(p.imminentCues[0].x,h.x1);assert.equal(p.imminentCues[0].y,h.y1);assert.equal(p.laserChargeDraws,low?0:1);const m=measure(c,h);assert.equal(m.outside,0);assert(m.maxAlpha<=170);}}
    const sums=[];for(const progress of[0,.25,.75,1]){ctx.clearRect(0,0,160,160);fx.beginFrame();fx.drawHazardBody(noShapes(ctx),w,ray({phase:'fade',progress}),false);sums.push(measure(c,ray()).alpha);assert.equal(fx.getMetrics().laserAfterglowDraws,1);}assert(sums[0]>sums[1]&&sums[1]>sums[2]&&sums[2]>0);assert.equal(sums[3],0);
  }finally{fx.destroy();}
});

test('cosmetic budgets preserve every body and reuse the existing bounded warm source surfaces',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,0),fx=box.HapilProjectiles.create(images),c=createCanvas(160,160),ctx=c.getContext('2d'),w=a.world(0,{combatRevision:31,tick:210});try{for(const low of[false,true]){
    function draw(){ctx.clearRect(0,0,160,160);fx.beginFrame();for(let n=0;n<32;n++)fx.drawHazardBody(noShapes(ctx),w,ray({id:n,v31Stage:n%3}),low);for(let n=0;n<32;n++)fx.drawHazardWarningCue(noShapes(ctx),w,ray({id:100+n,phase:'warning',activeAt:234}),low);return {pixels:Buffer.from(ctx.getImageData(0,0,160,160).data),p:fx.getMetrics()};}
    for(let n=0;n<3;n++)draw();const allocated=box.allocated.length,one=draw(),two=draw();assert(one.pixels.equals(two.pixels));assert.equal(box.allocated.length,allocated);assert.equal(two.p.assetLaserDraws,32);assert.equal(two.p.laserSpectacleDraws,low?4:8);assert.equal(two.p.imminentCueDraws,low?4:8);assert.equal(two.p.stampCacheMisses,0);assert.equal(two.p.beamFrameCacheBuilds,0);assert(two.p.stampCacheBytes<=4194304&&two.p.stampCacheEntries<=96);
  }}finally{fx.destroy();}
});

test('actual31 fullscene carries four copies, precision and static mobile pressure cache without world mutation',async()=>{
  const box=a.runtime(),w=r.world(box,0,2,421,31),images=await a.imagesFor(box,0),f=r.fixture(box,images),before=JSON.stringify(w);try{for(let n=0;n<3;n++)f.draw(w,true);const allocated=box.allocated.length,out=f.draw(w,true),m=out.metrics;assert.equal(JSON.stringify(w),before);assert.equal(m.combatCopyDraws,4);assert.equal(m.playerFeedback.precise,true);assert.equal(m.playerFeedback.hitRadius,3);const wide=w.hazards.filter(h=>h.bossWideLaser&&h.phase==='active');assert(wide.length>0);assert.equal(m.pressureLayerCache.frameHits,wide.length>=3?1:0);assert.equal(m.projectilePresentation.cachedAssetLaserDraws,wide.length>=3?wide.length:0);assert(m.pressureLayerCache.bytes<=4194304);assert.equal(m.projectilePresentation.stampCacheMisses,0);assert.equal(m.projectilePresentation.beamFrameCacheBuilds,0);assert.equal(box.allocated.length,allocated);assert.equal(m.projectilePresentation.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);
    w.player.invulnerableUntil=0;w._lastGraze=w.tick;assert.equal(f.draw(w,true).metrics.playerFeedback.grazePulse,1);
  }finally{f.close();}
});
