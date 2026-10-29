'use strict';
// Actual retained hapil1 map pixels with native CPU Canvas. These are controlled
// presentation fixtures, not natural progress, browser/GPU, or mobile tests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/render.js');const API=global.HapilRenderer;
const raw=fs.readFileSync(path.resolve(__dirname,'../src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
let imagesPromise;
function sourceImages(){if(!imagesPromise)imagesPromise=(async()=>{const images={};for(const key of Object.keys(API.terrainContracts))images[key]=await loadImage(path.resolve(__dirname,'..',media[key]));return images;})();return imagesPromise;}
async function fixture(){
 const images=await sourceImages(),sourceSet=new Set(Object.values(images)),previous=global.document,allocated=[],paints=[];
 global.document={createElement(name){assert.equal(name,'canvas');const c=createCanvas(1,1);allocated.push(c);const cx=c.getContext('2d'),draw=cx.drawImage.bind(cx);cx.drawImage=function(...a){if(sourceSet.has(a[0]))paints.push(a);return draw(...a);};return c;}};
 const main=createCanvas(360,640);main.style={};const renderer=API.create(main,images);renderer.resize(360,640,1);
 return{images,main,renderer,allocated,paints,close(){renderer.destroy();global.document=previous;}};
}
function world(index,phase=0){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:142});w.phase=phase;w.phaseTime=5;w.time=5;w.stage='boss';
 // Map-only fixture: source actor/FX rendering is independently tested.
 w.boss=null;w.effects=[];w.enemies=[];w.bullets=[];w.shots=[];w.hazards=[];return w;
}
test('all fourteen exact source paintings retain manifest bytes and validate only their own encounter group',async()=>{
 const images=await sourceImages(),manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/HAPIL1-ASSET-SOURCES-V14-20261029.json'),'utf8')),maps=manifest.files.filter(e=>e.category==='map');
 assert.equal(maps.length,14);assert.equal(Object.keys(API.terrainContracts).length,14);
 for(const entry of maps){
  const bytes=fs.readFileSync(path.resolve(__dirname,'..',entry.file));assert.equal(bytes.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),entry.gitBlobSHA);
  const c=API.terrainContracts[entry.key];assert.deepEqual([c.width,c.height],entry.dimensions);assert(c.floor[0]>=0&&c.floor[1]>=0&&c.floor[0]+c.floor[2]<=c.width&&c.floor[1]+c.floor[3]<=c.height,'inspected source floor crop stays inside its own image');
 }
 for(let group=0;group<12;group++){
  const keys=API.terrainAssetKeysForEncounter(group);assert.equal(keys.length,group===9||group===11?2:1);assert.equal(API.invalidTerrainAsset(images,group),null);
  for(const key of keys){const bad={...images};delete bad[key];assert.equal(API.invalidTerrainAsset(bad,group),key);bad[key]={complete:true,naturalWidth:1,naturalHeight:1};assert.equal(API.invalidTerrainAsset(bad,group),key);}
 }
 assert.deepEqual(API.terrainAssetKeysForEncounter(0),['h14MapViolet'],'entry group never requires the other thirteen decoded maps');assert.equal(API.invalidTerrainAsset({},12),'terrain-encounter-unsupported');assert.equal(API.invalidTerrainAsset({},-1),null);
});
test('each boss and same-person phase variant uses its own scene with one bounded reusable portrait cache',async()=>{
 const f=await fixture();try{
  const expected=['h14MapViolet','h14MapHorn','h14MapBalrog','h14MapMask','h14MapLucifer','h14MapSloth','h14MapEnvy','h14MapGluttony','h14MapLust','h14MapGreed','h14MapWrath','h14MapPride'];
  for(let group=0;group<12;group++){
   f.renderer.draw(world(group),0,5,false);const m=f.renderer.getMetrics();assert.equal(m.sceneAsset,expected[group]);assert.equal(m.terrainStatus,'hapil1-source-portrait-composite');assert.equal(m.sceneCacheEntries,1);assert.equal(m.sceneCacheBytes,360*720*4);assert.equal(m.sceneForegroundDraws,0);assert.equal(m.sceneCollisionGeometry,false);
   assert.equal(f.allocated.length,3,'reuse the existing two work surfaces and one active portrait surface');
  }
  for(const [group,key] of [[9,'h14MapGreedSnow'],[11,'h14MapPrideCore']]){
   const approach=world(group,2);approach.stage='waves';approach.wave=2;approach.practiceBoss=false;f.renderer.draw(approach,0,5,false);
   assert.equal(f.renderer.getMetrics().sceneAsset,expected[group],'ordinary approach cannot enter the same-person followup scene before the adult fight');
   for(const stage of ['boss','transition','lost','won']){const followup=world(group,2);followup.stage=stage;f.renderer.draw(followup,0,5,false);assert.equal(f.renderer.getMetrics().sceneAsset,key);assert.equal(f.allocated.length,3);}
  }
 }finally{f.close();}
});
test('finite route scroll, camera anchoring, and repeated draws never recompose or allocate map surfaces per frame',async()=>{
 const f=await fixture();try{
  const w=world(5);w.stage='waves';w.practiceBoss=false;w.wave=0;w.waveTime=0;w.waveDuration=15;
  f.renderer.draw(w,0,5,false);const builds=f.renderer.getMetrics().sceneCacheBuilds,paints=f.paints.length,active=f.allocated[2];
  assert.equal(f.renderer.getMetrics().scrollY,0);assert.equal(paints,3,'base swatch, detailed swatch, and whole painting are sampled only while baking');
  for(const [wave,t,scroll] of [[0,7.5,80/6],[1,7.5,40],[2,15,80]]){w.wave=wave;w.waveTime=t;f.renderer.draw(w,0,5,true);assert(Math.abs(f.renderer.getMetrics().scrollY-scroll)<1e-8);}
  w.stage='boss';for(let n=0;n<40;n++)f.renderer.draw(w,0,n,n%2===0);
  assert.equal(f.renderer.getMetrics().scrollY,80);assert.equal(f.renderer.getMetrics().sceneCacheBuilds,builds);assert.equal(f.paints.length,paints);assert.equal(f.allocated.length,3);
  f.renderer.draw(world(9,2),0,5,false);assert.equal(f.allocated[2],active,'variant replaces the one active scene rather than retaining another map canvas');assert.equal(f.allocated.length,3);
  f.renderer.draw(null,0,5,false);assert.equal(active.width,1);assert.equal(active.height,1);assert.equal(f.renderer.getMetrics().sceneCacheEntries,0,'returning home releases the previous source scene');
 }finally{f.close();}
});
test('new terrain remains behind committed warnings and the player; first and Balrog approaches retain their existing route renderer',async()=>{
 const f=await fixture();try{
  for(const group of [0,2]){const w=world(group);w.stage='waves';w.practiceBoss=false;f.renderer.draw(w,0,5,false);assert.equal(f.renderer.getMetrics().sceneAsset,null);assert.equal(f.renderer.getMetrics().terrainStatus,'retained-v2');}
  const w=world(6),ctx=f.main.getContext('2d'),events=[],draw=ctx.drawImage.bind(ctx),dash=ctx.setLineDash.bind(ctx),arc=ctx.arc.bind(ctx);
  ctx.drawImage=function(...a){if(a[0].width===360&&a[0].height===720)events.push('scene');return draw(...a);};ctx.setLineDash=function(a){if(a[0]===7&&a[1]===7)events.push('warning');return dash(a);};ctx.arc=function(x,y,r,...a){if(x===w.player.x&&y===w.player.y&&r===w.player.r)events.push('hitpoint');return arc(x,y,r,...a);};
  w.hazards=[{id:1,phase:'warning',x1:250,y1:180,x2:250,y2:610,width:10,progress:.4}];const before=JSON.stringify({player:w.player,hazards:w.hazards});
  f.renderer.draw(w,0,5,false);assert(events.indexOf('scene')<events.indexOf('warning'));assert(events.indexOf('scene')<events.indexOf('hitpoint'));assert.equal(JSON.stringify({player:w.player,hazards:w.hazards}),before,'source scenery cannot change mechanics');
 }finally{f.close();}
});
