'use strict';
// Source-image object roles, native CPU raster only. This does not certify
// browser/mobile performance or natural-health play.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/story-assets.js');require('../src/projectiles.js');
const API=global.HapilProjectiles,media=require('../tools/read-media-registry.cjs')();
async function fixture(groups=[6,8,9]){const previous=global.document,allocated=[],images={};global.document={createElement(){const c=createCanvas(1,1);allocated.push(c);return c;}};for(const key of [...new Set(groups.flatMap(i=>API.assetKeysForEncounter(i)))])images[key]=await loadImage(path.join(__dirname,'..',media[key]));const c=createCanvas(96,96),ctx=c.getContext('2d'),fx=API.create(images);return{allocated,images,c,ctx,fx,close(){fx.destroy();global.document=previous;}};}
function bullet(patch={}){return{id:7,x:48,y:48,r:4.2,halfLength:0,kind:'orb',age:.2,angle:0,vx:70,vy:0,...patch};}
function paint(f,group,b,low){f.ctx.clearRect(0,0,96,96);let draws=0;const w={campaign:true,campaignRevision:5,bossIndex:group,stage:'boss'},before=JSON.stringify([w,b]);const sourceOnly=new Proxy(f.ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('Geometric projectile '+k)};const v=t[k];if(k==='drawImage')return(...a)=>{draws++;return v.apply(t,a)};return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}});f.fx.beginFrame();assert(f.fx.drawBullet(sourceOnly,w,b,low));assert.equal(JSON.stringify([w,b]),before);return{pixels:Buffer.from(f.ctx.getImageData(0,0,96,96).data),metrics:f.fx.getMetrics(),draws};}
test('all three independent Lust props are mandatory and never requested by another encounter',async()=>{const f=await fixture();try{const keys=['h24LustHeel','h24LustLipstick','h24LustBrokenHeart'];for(const key of keys){assert(API.assetKeysForEncounter(8).includes(key));assert(!API.assetKeysForEncounter(6).includes(key));const missing={...f.images};delete missing[key];assert.equal(API.invalidAssetForEncounter(missing,8),key);missing[key]={complete:true,naturalWidth:255,naturalHeight:256};assert.equal(API.invalidAssetForEncounter(missing,8),key);}assert.equal(API.invalidAssetForEncounter(f.images,8),null);}finally{f.close();}});
test('actual existing pattern roles select one complete independent prop, with stable source colours in both qualities',async()=>{const f=await fixture();try{const cases=[
 [8,bullet({patternId:'pressure-woven-petals-v21'}),'lust-broken-heart','h24LustBrokenHeart'],
 [8,bullet({patternId:'asmodeus-phase-2',paletteSlot:1}),'lust-broken-heart','h24LustBrokenHeart'],
 [8,bullet({patternId:'asmodeus-phase-1',paletteSlot:0}),'lust-heel','h24LustHeel'],
 [8,bullet({patternId:'asmodeus-string-curtain',paletteSlot:1}),'lust-lipstick','h24LustLipstick'],
 [8,bullet({kind:'needle',halfLength:7}),'lust-lipstick','h24LustLipstick'],
 [8,bullet({kind:'hell-rotor',r:11,spinRate:-2.6,spinAngle:.4,paletteSlot:0}),'lust-heel','h24LustHeel'],
 [8,bullet({kind:'hell-rotor',r:11,spinRate:2.6,spinAngle:.4,paletteSlot:0}),'lust-lipstick','h24LustLipstick'],
 [6,bullet(),'envy-mirror-shard','h14SkillEnvy'],[9,bullet({sourcePhase:2}),'greed-coin-saw','h14SkillGreed']];
 const pictures=new Map();for(const [group,b,variant,key]of cases){let high;for(const low of[false,true]){const result=paint(f,group,b,low);assert.equal(result.draws,1,'independent props have no old mixed-object overlay');assert.deepEqual(result.metrics.projectileVariantDraws,{[variant]:1});assert.deepEqual(result.metrics.projectileVariantSourceKeys,{[key]:1});assert.equal(result.metrics.missingProjectileAssets,0);if(group===8||group===6){assert(result.metrics.maxOwnedObjectPixels<=(b.r<=6?48:100),'named whole prop stays within its explicit rotated-object budget');assert(result.metrics.legacyMaxVisualOutset<=4);}else assert(result.metrics.maxVisualOutset<=4);if(low)assert.deepEqual(result.pixels,high,'quality never substitutes the actual danger prop');else high=result.pixels;}pictures.set(variant,high);}
 assert.notDeepEqual(pictures.get('lust-heel'),pictures.get('lust-lipstick'));assert.notDeepEqual(pictures.get('lust-lipstick'),pictures.get('lust-broken-heart'));
 // Material contrast is sampled at actual large-throw size, without asserting
 // exact processor-dependent antialias bytes or painting primitive backing.
 const lip=paint(f,8,bullet({kind:'hell-rotor',r:11,spinRate:2.6,spinAngle:0}),false).pixels;let red=0,gold=0;for(let i=0;i<lip.length;i+=4)if(lip[i+3]>=180){red+=lip[i]>lip[i+1]*1.35&&lip[i]>lip[i+2]*1.3;gold+=lip[i]>110&&lip[i+1]>55&&lip[i+1]>lip[i+2]*1.3;}assert(red>=4&&gold>=4,'retained lipstick has both red tip and gold casing');
 }finally{f.close();}});
test('variant choice is independent of age, bounce direction and redraws; warmed caches stay bounded and release all surfaces',async()=>{const f=await fixture([8]);try{const left=bullet({kind:'hell-rotor',r:11,spinRate:-2.6,spinAngle:.4,paletteSlot:0}),right=bullet({...left,spinRate:2.6});for(const b of[left,right])paint(f,8,b,false);const allocated=f.allocated.length;for(let n=0;n<120;n++)for(const b of[left,right]){const out=paint(f,8,{...b,age:n/10,vx:n%2?-120:120,bounceCount:n%2},n%2===1);assert.equal(Object.keys(out.metrics.projectileVariantDraws)[0],b.spinRate<0?'lust-heel':'lust-lipstick');assert(out.metrics.stampCacheBytes<=4194304&&out.metrics.stampCacheEntries<=96);assert.equal(out.metrics.stampCacheMisses,0);}assert.equal(f.allocated.length,allocated,'no per-frame canvas creation after the two source props are cached');f.fx.destroy();assert(f.allocated.every(c=>c.width===1&&c.height===1));}finally{f.close();}});
test('lipstick aim rotation keeps the complete source alpha before uniform object fitting',async()=>{const f=await fixture([8]);try{
 paint(f,8,bullet({kind:'needle',halfLength:7}),false);
 const source=f.allocated.find(c=>c.width>=128&&c.height>=128);assert(source,'non-right-angle source rotation has an expanded cache');
 const actual=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
 // An independently oversized canvas cannot clip a96px sample rotated through
 // any angle. Compare all alpha, not just the opaque centre of the result.
 const reference=createCanvas(512,512),rc=reference.getContext('2d');rc.translate(256,256);rc.rotate(Math.PI/3);rc.drawImage(f.images.h24LustLipstick,-48,-48,96,96);const rd=rc.getImageData(0,0,512,512).data;
 let actualMass=0,referenceMass=0,border=0;for(let i=3;i<actual.length;i+=4)actualMass+=actual[i];for(let i=3;i<rd.length;i+=4)referenceMass+=rd[i];
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(x<2||y<2||x>=source.width-2||y>=source.height-2)border=Math.max(border,actual[(y*source.width+x)*4+3]);
 assert.equal(actualMass,referenceMass,'all source alpha survives the actual padded rotation; no clipped lipstick top/base');assert.equal(border,0,'rotated source has transparent guard pixels on every cache edge');
 }finally{f.close();}});
