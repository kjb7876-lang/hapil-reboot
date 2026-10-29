'use strict';
// Controlled native CPU Canvas source/registration fixtures, not natural play
// or browser/GPU/mobile measurements. Core progression is tested separately.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/render.js');
const API=global.HapilActors,raw=fs.readFileSync(path.resolve(__dirname,'../src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
async function fixture(){
 const images={};for(const key of Object.keys(media).filter(k=>k.startsWith('sin')||['cave','bossMotionBalrog'].includes(k)))images[key]=await loadImage(path.resolve(__dirname,'..',media[key]));
 const previous=global.document,allocated=[],floorDraws=[];
 global.document={createElement(){const c=createCanvas(1,1);allocated.push(c);const cx=c.getContext('2d'),draw=cx.drawImage.bind(cx);cx.drawImage=function(...a){if(a[0]===images.cave)floorDraws.push(a);return draw(...a);};return c;}};
 const canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),draws=[],texts=[],draw=ctx.drawImage.bind(ctx),text=ctx.fillText.bind(ctx);
 ctx.drawImage=function(...a){draws.push({a,m:ctx.getTransform()});return draw(...a);};
 ctx.fillText=function(s,x,y,...a){texts.push({s,x,y});return text(s,x,y,...a);};
 const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
 return{images,canvas,ctx,renderer,draws,texts,allocated,floorDraws,close(){renderer.destroy();global.document=previous;}};
}
function world(index,phase=0){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:972});const info=core.CAMPAIGN_BOSSES[index];
 w.phase=phase;w.phaseTime=5;w.stage='boss';w.time=5;w.tick=100;w.effects=[];w.hazards=[];w.shots=[];w.bullets=[];w.enemies=[];
 w.boss.x=180;w.boss.y=116;w.boss.action='recover';w.boss.actionProgress=1;w.boss.releaseTick=-1;w.boss.healthLabel='봉인 저항';
 w.boss.artKey=info.phaseArtKeys?info.phaseArtKeys[phase]:info.artKey;return w;
}
test('all seven sin identities and both same-person followup forms render only their own real source atlas',async()=>{
 const f=await fixture();try{
  const forms=new Set();
  for(let index=5;index<12;index++)for(let phase=0;phase<3;phase++){
   const w=world(index,phase),key=w.boss.artKey;forms.add(key);
   f.draws.length=0;f.texts.length=0;f.renderer.draw(w,0,5,false);
   const metrics=f.renderer.getMetrics();assert.equal(metrics.actorPresentation.lastBossIdentity,w.boss.kind);assert.equal(metrics.actorPresentation.lastBossAsset,key);assert.equal(metrics.actorPresentation.sinBossDraws,1);
   const bodies=f.draws.filter(d=>d.a[0]===f.images[key]);assert.equal(bodies.length,1);assert.equal(bodies[0].a[3],256);assert.equal(bodies[0].a[4],256);
   assert(f.texts.some(t=>t.s==='봉인 저항'),'new encounter resistance semantics are visible');
   assert.equal(metrics.actorPresentation.fullAnimationCycles,0);assert.equal(metrics.actorPresentation.sourcePivotsCertified,false);
   assert.equal(metrics.terrainStatus,'retained-neutral-floor-crop');assert.equal(metrics.zone,'abstract-memory-stage');
  }
  assert.equal(forms.size,9,'same-person boy and cyborg forms are distinct source forms, not additional identities');
 }finally{f.close();}
});
test('every registered source keypose has an opaque torso anchor, fixed per-form scale, and stays below the HUD',async()=>{
 const f=await fixture();try{
  for(let index=5;index<12;index++)for(const phase of (index===9||index===11?[0,2]:[0])){
   const w=world(index,phase),c=API.sinContractFor(w),sheet=createCanvas(512,512);sheet.getContext('2d').drawImage(f.images[c.key],0,0);const pixels=sheet.getContext('2d').getImageData(0,0,512,512).data;
   const actor=API.create(f.images),scales=[];
   for(let pose=0;pose<4;pose++){
    w.tick=pose===1?100:pose===2?112:140;w.boss.action=pose===0?'charge':'recover';w.boss.actionProgress=pose===0?.8:1;w.boss.releaseTick=pose===0?-1:100;
    actor.beginFrame();f.draws.length=0;assert.equal(actor.drawBoss(f.ctx,w,180,116,230,1),true);
    const m=actor.getMetrics(),sample=m.lastSinSample;scales.push(sample.scale);assert.equal(m.lastBossPose,c.poseNames[pose]);
    const [ax,ay]=c.anchors[pose],sourceX=pose%2*256,sourceY=Math.floor(pose/2)*256;
    assert(pixels[((sourceY+ay)*512+sourceX+ax)*4+3]>=240,'display anchor must be on actual body pixels');
    const d=f.draws.find(d=>d.a[0]===f.images[c.key]),a=d.a,pdx=a[5]+ax*a[7]/256,pdy=a[6]+ay*a[8]/256;
    // Native Canvas transform matrices use float precision; registration must
    // be much smaller than a visible pixel without requiring JS bit identity.
    assert(Math.abs(d.m.a*pdx+d.m.c*pdy+d.m.e-180)<1e-4);assert(Math.abs(d.m.b*pdx+d.m.d*pdy+d.m.f-sample.position[1])<1e-4);
    let top=256,bottom=0;for(let yy=0;yy<256;yy++)for(let xx=0;xx<256;xx++)if(pixels[((sourceY+yy)*512+sourceX+xx)*4+3]>=8){top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
    assert(sample.position[1]+(top-ay)*sample.scale>=64,'source body must not enter the HUD');assert(sample.position[1]+(bottom-ay)*sample.scale<250,'source body stays above player lane');
   }
   assert(scales.every(s=>s===c.scale),'do not independently fit each pose alpha box');
  }
 }finally{f.close();}
});
test('missing own forms and invalid own form dimensions fail closed without painting another boss',async()=>{
 const f=await fixture();try{
  for(let index=5;index<12;index++){
   const keys=API.sinAssetKeysForEncounter(index),ready={};for(const key of keys){const size=/^sinWrath(Bear|Wolf|Dragon)/.test(key)?1254:key.startsWith('sin')?512:627;ready[key]={complete:true,naturalWidth:size,naturalHeight:size};}
   assert.equal(API.invalidSinAssetForEncounter(ready,index),null);
   for(const key of keys){const missing={...ready};delete missing[key];assert.equal(API.invalidSinAssetForEncounter(missing,index),key);missing[key]={complete:true,naturalWidth:1,naturalHeight:1};assert.equal(API.invalidSinAssetForEncounter(missing,index),key);}
  }
  assert.equal(API.invalidSinAssetForEncounter({},12),'sin-encounter-unsupported');
  const w=world(5);w.boss.artKey='sinPrideAtlas';f.draws.length=0;f.renderer.draw(w,0,5,false);
  assert.equal(f.renderer.getMetrics().bossArt,'missing-own-source-belphegor');assert.equal(f.renderer.getMetrics().actorPresentation.bossDraws,0);
  assert.equal(f.draws.some(d=>d.a[0]===f.images.sinPrideAtlas||d.a[0]===f.images.bossMotionBalrog),false,'neither another sin nor Balrog may substitute for missing own art');
 }finally{f.close();}
});
test('Wrath shows one source-backed harmless beast manifestation only on charge and actual release ticks',async()=>{
 const f=await fixture();try{
  const names=['sinWrathBearV13','sinWrathWolfV13','sinWrathDragonV13'],actor=API.create(f.images);
  for(let phase=0;phase<3;phase++){
   const w=world(10,phase),radius=w.boss.r;
   for(const [action,age,expected] of [['recover',Infinity,0],['charge',Infinity,1],['recover',0,1],['recover',17,1],['recover',18,0]]){
    w.boss.action=action;w.boss.actionProgress=.8;w.boss.releaseTick=Number.isFinite(age)?100-age:-1;
    actor.beginFrame();actor.drawBoss(f.ctx,w,180,116,230,1);const m=actor.getMetrics();assert.equal(m.wrathManifestDraws,expected);
    if(expected){assert.equal(m.lastWrathManifest.key,names[phase]);assert.equal(m.lastWrathManifest.damaging,false);assert(m.lastWrathManifest.center[1]+m.lastWrathManifest.size/2<260);assert(m.lastWrathManifest.opacity<=.65);assert.equal(m.lastWrathManifest.sourceFrames,1);}
    assert.equal(w.boss.r,radius,'attack art never expands the core collision');
   }
  }
 }finally{f.close();}
});
test('abstract floor cache reuses one bounded surface and does not allocate or resample source art every frame',async()=>{
 const f=await fixture();try{
  const w=world(5);f.renderer.draw(w,0,5,false);const count=f.allocated.length,sourceDraws=f.floorDraws.length;
  assert.equal(count,3,'two existing surfaces plus one lazy neutral floor');assert.equal(sourceDraws,1);
  for(let i=0;i<20;i++)f.renderer.draw(w,0,5,i%2===0);
  assert.equal(f.allocated.length,count);assert.equal(f.floorDraws.length,sourceDraws);
 }finally{f.close();}
});
test('the extended single-wave approach displays its real fraction rather than finishing its route bar at fifteen seconds',async()=>{
 const f=await fixture();try{
  const w=world(5);w.bossIndex=1;w.stage='waves';w.boss=null;w.practiceBoss=false;w.wave=0;w.waveDuration=45;w.waveTime=15;
  f.renderer.draw(w,0,15,false);assert.equal(f.renderer.getMetrics().segmentProgress,1/3);
  w.waveDuration=15;f.renderer.draw(w,0,15,false);assert.equal(f.renderer.getMetrics().segmentProgress,1,'resumed earlier route duration retains its prior full boundary');
 }finally{f.close();}
});
