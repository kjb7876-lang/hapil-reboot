'use strict';
// Native source pixels, not a phone/GPU or human-play claim.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/story-assets.js');require('../src/projectiles.js');
const P=global.HapilProjectiles,registry=require('../tools/read-media-registry.cjs')();
function mass(bytes){let sum=0;for(let i=3;i<bytes.length;i+=4)sum+=bytes[i];return sum;}
async function fixture(){const previous=global.document,allocated=[],images={};global.document={createElement(){const c=createCanvas(1,1);allocated.push(c);return c;}};for(const key of P.assetKeysForEncounter(8))images[key]=await loadImage(path.join(__dirname,'..',registry[key]));const fx=P.create(images),c=createCanvas(128,128),ctx=c.getContext('2d');return {allocated,fx,c,ctx,close(){fx.destroy();global.document=previous;}};}
function draw(f,patch={},revision=27){const world={campaign:true,campaignRevision:5,bossIndex:8,combatRevision:revision,stage:'boss'},b={id:2,x:64,y:64,r:5,halfLength:0,kind:'orb',age:1,angle:.3,vx:0,vy:90,patternId:'asmodeus-phase-1',paletteSlot:0,...patch},before=JSON.stringify([world,b]);f.ctx.clearRect(0,0,128,128);f.fx.beginFrame();assert(f.fx.drawBullet(f.ctx,world,b,false));assert.equal(JSON.stringify([world,b]),before);return {data:Buffer.from(f.ctx.getImageData(0,0,128,128).data),metrics:f.fx.getMetrics()};}
test('retiring27 source body fades continuously while an active slowed body stays fully opaque',async()=>{
 const f=await fixture();try{
  const full=draw(f),slow=draw(f,{slowFactor:.14});assert(full.data.equals(slow.data),'strong slowdown never hides an active damage body');
  let previous=mass(full.data);for(const fraction of [0,.25,.5,.75,1]){const result=draw(f,{retiring:true,retireAge:.35*fraction,retireDuration:.35}),value=mass(result.data);assert(value<=previous);assert(Math.abs(value-mass(full.data)*(1-fraction))<=mass(full.data)*.025+4,'source alpha tracks the harmless retirement clock');previous=value;assert.equal(result.metrics.missingProjectileAssets,0);}
  assert.equal(previous,0,'expired harmless art reaches fully transparent before its core removes it');
 }finally{f.close();}
});
test('legacy source pixels ignore27 retirement metadata and warm fading does not allocate new surfaces',async()=>{
 const f=await fixture();try{
  const old=draw(f,{},25),oldWithFields=draw(f,{retiring:true,retireAge:.2,retireDuration:.35},25);assert(old.data.equals(oldWithFields.data));
  draw(f,{retiring:true,retireAge:.1,retireDuration:.35});const warm=f.allocated.length;
  for(let n=0;n<90;n++){const out=draw(f,{retiring:true,retireAge:(n%21)/60,retireDuration:.35});assert.equal(out.metrics.stampCacheMisses,0);assert(out.metrics.stampCacheBytes<=4194304&&out.metrics.stampCacheEntries<=96);}
  assert.equal(f.allocated.length,warm);
 }finally{f.close();}
});

test('28 laser gameplay retains the same harmless source-only bullet fade as27',async()=>{
 const f=await fixture();try{for(const fraction of [0,.25,.5,.75,1]){const patch={retiring:true,retireAge:.35*fraction,retireDuration:.35};assert(draw(f,patch,28).data.equals(draw(f,patch,27).data));}}finally{f.close();}
});
