'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../tools/audit-object-projectiles-v24.cjs'),m=require('../tools/review-mobile-render-v30.cjs');
const BASE='509d1beb3a2bb6f4e75d880383fde28901ad5cdd';
test('current boss fans cache three wide bodies only, with bounded pixel rounding, memory and no warm surfaces',async()=>{
 const box=a.runtime(),direct=a.runtime(BASE),cache=new Map();let comparisons=0;
 for(const [index,wideCount]of[[8,2],[6,3],[11,2],[33,3]]){
  const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},direct),w=m.world(box,index,2,300,31),before=JSON.stringify(w),f=m.fixture(box,images),g=m.fixture(direct,images);
  assert.equal(w.hazards.filter(h=>h.bossWideLaser&&h.phase==='active').length,wideCount,'fixture must exercise its actual boss-origin wide run');
  try{for(const low of[true,false]){
   for(let n=0;n<3;n++){f.draw(w,low);g.draw(w,low);}const allocated=box.allocated.length,result=f.draw(w,low),reference=g.draw(w,low),pixels=m.difference(result.pixels,reference.pixels),metrics=result.metrics,p=metrics.projectilePresentation,eligible=low&&wideCount===3;
   assert.equal(box.allocated.length,allocated,'a warm frame cannot allocate another canvas');assert.equal(JSON.stringify(w),before,'renderer cannot change promised combat geometry');assert(pixels.maxChannelDelta<=4,'cached alpha composition may round at most four RGB levels');if(!eligible)assert(result.pixels.equals(reference.pixels),'two-body/high-quality paths keep direct pixels exact');
   assert.equal(p.missingProjectileAssets,0);assert.equal(p.assetLaserDraws,reference.metrics.projectilePresentation.assetLaserDraws);assert.equal(p.cachedAssetLaserDraws,eligible?wideCount:0);assert.equal(p.rasterAssetLaserDraws+p.cachedAssetLaserDraws,p.assetLaserDraws);assert.equal(metrics.pressureLayerCache.frameBuilds,0);assert.equal(metrics.pressureLayerCache.frameHits,eligible?1:0);assert.equal(metrics.pressureLayerCache.entries,eligible?1:0);assert.equal(metrics.pressureLayerCache.bytes,eligible?360*640*4:0);assert(metrics.pressureLayerCache.bytes<=4194304);assert(p.stampCacheBytes<=4194304);comparisons++;
  }}finally{f.close();g.close();}
 }
 assert.equal(comparisons,8);
});
