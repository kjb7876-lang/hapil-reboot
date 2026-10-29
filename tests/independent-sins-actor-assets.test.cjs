'use strict';
// Actual source PNG checks and CPU Canvas draw fixtures. These do not certify
// the source's physical pivot or prove continuous animation/device behavior.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');const API=global.HapilActors;
const root=path.join(__dirname,'..'),source=JSON.parse(fs.readFileSync(path.join(root,'docs/SINS-ASSET-SOURCES-20261029.json'),'utf8'));
const raw=fs.readFileSync(path.join(root,'src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
const contracts=Object.values(API.sinContracts);
async function imagesFor(keys){const images={};for(const key of keys)images[key]=await loadImage(path.join(root,media[key]));return images;}
test('nine actual seven-sin form PNGs decode, match recorded original hashes and have visible source pixels at every manual torso anchor',async()=>{
 assert.equal(contracts.length,9);assert.equal(source.items.length,9);
 for(const c of contracts){
  const entry=source.items.find(i=>i.key===c.key);assert(entry,`missing provenance ${c.key}`);assert.equal(media[c.key],entry.file);
  const bytes=fs.readFileSync(path.join(root,entry.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(bytes.length,entry.bytes);
  const im=await loadImage(bytes);assert.equal(im.width,512);assert.equal(im.height,512);
  const can=createCanvas(512,512),ctx=can.getContext('2d');ctx.drawImage(im,0,0);const pixels=ctx.getImageData(0,0,512,512).data;
  for(let pose=0;pose<4;pose++){
   const ox=pose%2*256,oy=Math.floor(pose/2)*256,anchor=c.anchors[pose];assert(anchor[0]>=0&&anchor[0]<256&&anchor[1]>=0&&anchor[1]<256);
   assert(pixels[((oy+anchor[1])*512+ox+anchor[0])*4+3]>=128,`${c.key}/${pose}: anchor must lie on visible source body`);
   let solid=0,empty=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=pixels[((oy+y)*512+ox+x)*4+3];solid+=a>=128;empty+=a===0;}
   assert(solid>1000,`${c.key}/${pose}: empty source pose`);assert(empty>10000,`${c.key}/${pose}: background must remain transparent`);
  }
  assert.equal(c.authoredKeyposes,4);assert.equal(c.fullAnimationCycles,0);assert.equal(c.sourcePivotsCertified,false);
 }
});

test('all seven encounters reject missing or malformed own forms before play, including child and cyborg alternatives',async()=>{
 const keys=[...new Set(Array.from({length:7},(_,n)=>API.sinAssetKeysForEncounter(n+5)).flat())],images=await imagesFor(keys);
 for(let index=5;index<12;index++){
  assert.equal(API.invalidSinAssetForEncounter(images,index),null);
  const ownKeys=API.sinAssetKeysForEncounter(index).filter(k=>k.startsWith('sin'));assert.equal(ownKeys.filter(k=>k.endsWith('Atlas')).length,index===9||index===11?2:1);
  for(const key of ownKeys){const bad={...images};delete bad[key];assert.equal(API.invalidSinAssetForEncounter(bad,index),key);bad[key]={complete:true,naturalWidth:511,naturalHeight:512};assert.equal(API.invalidSinAssetForEncounter(bad,index),key);}
 }
});

test('every form draws its own four source poses without added rings or combat-state mutations',async()=>{
 const images=await imagesFor(contracts.map(c=>c.key)),actor=API.create(images),can=createCanvas(360,360),ctx=can.getContext('2d');
 const noRing=new Proxy(ctx,{get(t,k){if(k==='arc'||k==='ellipse')return()=>{throw Error('unrequested decorative ring on sin body');};const v=t[k];return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}});
 for(const [index,phase] of [[5,0],[6,0],[7,0],[8,0],[9,0],[9,2],[10,0],[11,0],[11,2]]){
  const start=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:59,runId:'source-body-draw-fixture'}),s=core.checkpoint(start);s.phase=phase;
  const w=core.restoreCheckpoint(s),c=API.sinContractFor(w);assert(c);
  for(const [action,progress,releaseTick,expected] of [['charge',1,-1,'prepare'],['attack',0,100,'downstroke'],['attack',.4,90,'follow'],['recover',.8,-1,'recover']]){
   w.tick=100;w.time=100/60;Object.assign(w.boss,{action,actionProgress:progress,releaseTick,lean:0});const before=JSON.stringify(w);
   ctx.clearRect(0,0,360,360);actor.beginFrame();assert.equal(actor.drawBoss(noRing,w,180,160,230,1),true);
   const m=actor.getMetrics();assert.equal(m.sinBossDraws,1);assert.equal(m.lastBossAsset,c.key);assert.equal(m.lastBossPose,expected);assert.equal(m.fullAnimationCycles,0);assert.deepEqual(Object.keys(m.usedAssets),[c.key]);
   const pixels=ctx.getImageData(0,0,360,360).data;let alpha=0;for(let p=3;p<pixels.length;p+=4)alpha+=pixels[p]>0;assert(alpha>1000,`${c.key}/${expected}: no visible art`);
   assert.equal(JSON.stringify(w),before,'actor registration cannot mutate combat position, phase or timers');
  }
 }
});

test('seven actual projectile originals match provenance bytes and retain their recorded dense authored alpha in each material crop',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/SINS-PROJECTILE-SOURCES-20261029.json'),'utf8'));
 const specs=manifest.items.concat(manifest.generatedMissingOwnMaterials);assert.equal(specs.length,7);
 for(const spec of specs){
  const bytes=fs.readFileSync(path.join(root,spec.runtimePath));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),spec.sha256);assert.equal(bytes.length,spec.bytes);assert.equal(media[spec.runtimeKey],spec.runtimePath);
  const im=await loadImage(path.join(root,spec.runtimePath));assert.deepEqual([im.width,im.height],spec.dimensions);
  const [x,y,w,h]=spec.materialCropXYWH,can=createCanvas(w,h),ctx=can.getContext('2d');ctx.drawImage(im,x,y,w,h,0,0,w,h);const d=ctx.getImageData(0,0,w,h).data;
  // The runtime clips circular caps; square crop corners are outside danger.
  let min=255,max=0;const colors=new Set();for(let py=0;py<h;py++)for(let px=0;px<w;px++)if((px-(w-1)/2)**2+(py-(h-1)/2)**2<=(spec.materialRadius-1)**2){const i=(py*w+px)*4;min=Math.min(min,d[i+3]);max=Math.max(max,d[i+3]);colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);}
  assert.equal(min,spec.sourceAlphaInteriorMin);assert(min>=250);assert(max<=255);assert(colors.size>100,`${spec.boss}: source detail must exist before fitting`);
  assert.equal(spec.frames,1,'static material must not be represented as a flight animation');
 }
});

test('Wrath bear, wolf and dragon are three checked static manifestations above the player lane, not extra damage geometry or actors',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/SINS-GENERATED-ASSETS-20261029.json'),'utf8'));
 const specs=manifest.items.filter(i=>/wrath-(bear|wolf|dragon)-manifest\.png$/.test(i.file));assert.equal(specs.length,3);
 const keys=['sinWrathBearV13','sinWrathWolfV13','sinWrathDragonV13'],images=await imagesFor(['sinWrathAtlas',...keys]);
 for(const key of keys){const spec=specs.find(s=>s.file===media[key]);assert(spec);const bytes=fs.readFileSync(path.join(root,spec.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),spec.sha256);assert.equal(bytes.length,spec.bytes);assert.deepEqual([images[key].width,images[key].height],spec.dimensions);assert.equal(spec.frames,1);assert.equal(spec.transparent_background,true);}
 const previous=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 try{
  const actor=API.create(images),canvas=createCanvas(360,360),ctx=canvas.getContext('2d');
  for(let phase=0;phase<3;phase++){
   const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:10,seed:39,runId:'wrath-source-fixture'});w.phase=phase;w.boss.phase=phase;w.tick=100;w.time=100/60;w.boss.action='charge';w.boss.actionProgress=.9;
   const before=JSON.stringify(w);actor.beginFrame();assert.equal(actor.drawBoss(ctx,w,180,116,230,1),true);const m=actor.getMetrics();
   assert.equal(m.wrathManifestDraws,1);assert.equal(m.lastWrathManifest.key,keys[phase]);assert.equal(m.lastWrathManifest.damaging,false);assert.equal(m.lastWrathManifest.sourceFrames,1);assert(m.lastWrathManifest.center[1]+m.lastWrathManifest.size/2<260);
   assert.equal(m.lastBossIdentity,'wrath');assert.equal(m.lastBossAsset,'sinWrathAtlas');assert.equal(JSON.stringify(w),before);
  }
 }finally{global.document=previous;}
});
