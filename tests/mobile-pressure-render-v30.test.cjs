'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const r=require('../tools/review-mobile-render-v30.cjs'),BASE='f5bc56c9acaabef2ad653c3c63afd9982599ad54';
test('real active pressure retains complete source pixels and three-body runs stay direct at four mobile backing resolutions',async()=>{const rows=await r.matrix();assert.equal(rows.length,24);assert(rows.some(x=>x.cachedBodies===6));const short=rows.filter(x=>x.phase===0&&(x.index===0||x.index===33));assert.equal(short.length,8);for(const row of short){assert.equal(row.cachedBodies,0);assert.equal(row.cacheBytes,0);assert.equal(row.pixels.changedPixels,0);}});
test('actual revision30 tick421 shows all four committed copy emitters while the legacy presentation cap stays two',async()=>{
  const box=r.a.runtime(),scene=await r.fourCopyScene(box);assert.equal(scene.qualities.length,2);for(const row of scene.qualities)assert.equal(row.combatCopyDraws,4);
  // Presentation-only legacy-cap fixture: borrow the actual four actors, then
  // select the old revision to verify its two-copy cap remains unchanged.
  const w=r.world(box,0,2,421);w.combatRevision=29;const images=await r.a.imagesFor(box,0),f=r.fixture(box,images);try{assert.equal(f.draw(w).metrics.combatCopyDraws,2);}finally{f.close();}
});
test('cache changes with geometry, ownership, phase and backing resolution and is released on live/high/intro/destroy paths',async()=>{
  const box=r.a.runtime(),w=r.world(box,33,2),im=await r.a.imagesFor(box,34),f=r.fixture(box,im),g=r.fixture(box,im);
  function compare(){const a=f.draw(w),b=g.draw(r.direct(w));assert(r.difference(a.pixels,b.pixels).maxChannelDelta<=4);assert.equal(a.metrics.projectilePresentation.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);return a;}
  try{
    assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);for(let n=0;n<3;n++)compare();const allocated=box.allocated.length;for(let n=0;n<30;n++)assert.equal(compare().metrics.pressureLayerCache.frameHits,1);assert.equal(box.allocated.length,allocated);
    const h=w.hazards.find(h=>h.pressureCurtain);h.x1+=2;h.x2+=2;assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);h.paletteSlot=1-(h.paletteSlot||0);assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);h.modelActorId='baek-ion';h.sourceActorId='copied-baek-ion';assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);
    w.phase=1;assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);f.renderer.resize(360,640,1.5);g.renderer.resize(360,640,1.5);assert.equal(compare().metrics.pressureLayerCache.frameBuilds,1);
    const high=f.draw(w,false);assert.equal(high.metrics.pressureLayerCache.entries,0);assert(high.pixels.equals(g.draw(r.direct(w),false).pixels));
    f.draw(w);for(const h of w.hazards)if(h.pressureCurtain){h.phase='fade';h.progress=.3;}const fade=compare();assert.equal(fade.metrics.pressureLayerCache.entries,0);assert(fade.pixels.equals(g.draw(r.direct(w)).pixels));
    for(const h of w.hazards)if(h.pressureCurtain){h.phase='active';h.progress=.3;}f.draw(w);w.stage='bossIntro';assert.equal(f.draw(w).metrics.pressureLayerCache.entries,0);
    w.stage='boss';f.draw(w);const surfaces=box.allocated.filter(c=>c.width>1&&c.height>1);f.close();assert(surfaces.some(c=>c.width===1&&c.height===1),'destroy releases the cached surface');
  }finally{f.close();g.close();}
});
test('oversize and missing source assets do not retain an invisible pressure cache; source replacement invalidates it',async()=>{
  const box=r.a.runtime(),w=r.world(box,8),im=await r.a.imagesFor(box,8),f=r.fixture(box,im,720,1.5);
  try{const out=f.draw(w);assert.equal(out.metrics.pressureLayerCache.entries,0);assert.equal(out.metrics.projectilePresentation.cachedAssetLaserDraws,0);assert.equal(out.metrics.projectilePresentation.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);}finally{f.close();}
  const missing=r.fixture(box,{});try{const out=missing.draw(w);assert.equal(out.metrics.pressureLayerCache.entries,0);assert(out.metrics.projectilePresentation.missingProjectileAssets>0);}finally{missing.close();}
  const hit=r.fixture(box,im);try{hit.draw(w);const key=box.HapilProjectiles.assetKeysForEncounter(8)[0],saved=im[key];const replacement=r.createCanvas(saved.naturalWidth,saved.naturalHeight);replacement.getContext('2d').drawImage(saved,0,0);replacement.complete=true;replacement.naturalWidth=saved.naturalWidth;replacement.naturalHeight=saved.naturalHeight;im[key]=replacement;assert.equal(hit.draw(w).metrics.pressureLayerCache.frameHits,0);im[key]=saved;assert.equal(hit.draw(w).metrics.pressureLayerCache.frameHits,0);}finally{hit.close();}
});
test('high quality and all prior revisions retain baseline pixels when only the renderer is replaced',async()=>{
  const box=r.a.runtime(BASE),old=r.a.runtime(BASE);vm.runInContext(r.a.source('src/render.js').toString(),vm.createContext(box));const cache=new Map();
  for(const index of[0,8,33]){const im=await r.a.imagesFor(box,index>=12?index+1:index,cache,{},old),f=r.fixture(box,im),g=r.fixture(old,im);try{for(const revision of[21,25,27,28,29]){const w=r.world(old,index,0,300,revision);for(const low of[false,true]){const now=f.draw(w,low,false),prior=g.draw(w,low,false);assert(now.pixels.equals(prior.pixels),'legacy '+JSON.stringify({index,revision,low}));assert.equal(now.metrics.pressureLayerCache.entries,0);}}const w=r.world(old,index,0,300,29);w.combatRevision=30;assert(f.draw(w,false,false).pixels.equals(g.draw(w,false,false).pixels));}finally{f.close();g.close();}}
});
