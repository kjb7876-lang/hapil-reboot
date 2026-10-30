'use strict';
// Real retained Drive PNGs + native CPU Canvas. These are controlled render
// fixtures, not natural progress, actual mobile, GPU, or headless-browser tests.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');
// Historical revision-three rendering matrix; revision-four sources have their own full contract tests.
const encounterIndices=Array.from({length:12},(_,i)=>i);
require('../src/projectiles.js');require('../src/render.js');
const API=global.HapilProjectiles;
const raw=fs.readFileSync(path.join(__dirname,'../src/media.js'),'utf8');
const media=require('../tools/read-media-registry.cjs')();
async function fixture(){
 const previous=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 const images={};
 const retainedKeys=[...new Set(['fxWindArrow8V6',...[-1,...encounterIndices].flatMap(i=>API.assetKeysForEncounter(i))])];
 for(const key of retainedKeys)images[key]=await loadImage(path.join(__dirname,'..',media[key]));
 for(const [i,key] of ['forest','ruins','cave'].entries()){const c=createCanvas(720,904);c.getContext('2d').fillStyle=['#3b5646','#625347','#303a4c'][i];c.getContext('2d').fillRect(0,0,720,904);c.complete=true;c.naturalWidth=720;c.naturalHeight=904;images[key]=c;}
 const main=createCanvas(360,640);main.style={};const renderer=global.HapilRenderer.create(main,images);renderer.resize(360,640,1);
 function pixels(world,low){renderer.draw(world,0,0,low);return main.getContext('2d').getImageData(0,0,360,640).data;}
 return{images,main,renderer,pixels,close(){renderer.destroy();global.document=previous;}};
}
function world(index,campaign=true){const w=core.createRun({campaign,practiceBoss:campaign,bossIndex:index,seed:63});w.autoAttack=false;w.skillRotation=false;w.phaseTime=4;w.phase=2;w.stage='boss';w.hazards=[];w.bullets=[];w.shots=[];w.boss=null;w.effects=[];return w;}
function changed(a,b,x,y){const p=(y*360+x)*4;return a[p]!==b[p]||a[p+1]!==b[p+1]||a[p+2]!==b[p+2];}
test('full renderer paints all 768 real-asset enemy bullets for every encounter and legacy mode in both qualities',async()=>{
 const f=await fixture();try{
  for(const campaign of [true,false])for(const index of (campaign?encounterIndices:[0]))for(const low of [false,true]){
   const w=world(index,campaign),before=Buffer.from(f.pixels(w,low));
   w.bullets=Array.from({length:768},(_,i)=>({id:i+1,x:12+i%48*7,y:280+Math.floor(i/48)*19,r:2.5,halfLength:0,kind:'orb',angle:Math.PI/2,age:.26,vx:0,vy:90}));
   const after=f.pixels(w,low),metrics=f.renderer.getMetrics().projectilePresentation;
   assert.equal(metrics.texturedBullets,768,`all bodies drawn: campaign=${campaign}, boss=${index}, low=${low}`);
   assert.equal(metrics.projectileTextureDraws,768);
   for(const b of w.bullets)assert(changed(before,after,b.x,b.y),`missing body at ${b.x},${b.y}: ${index}`);
  }
 }finally{f.close();}
});
test('full renderer paints 40 visible source-textured active beams without silently dropping a hazard',async()=>{
 const f=await fixture();try{
  for(const index of encounterIndices)for(const low of [false,true]){
   const w=world(index),before=Buffer.from(f.pixels(w,low));
   w.hazards=Array.from({length:40},(_,i)=>({id:i+1,phase:'active',x1:30,y1:260+i*8,x2:330,y2:260+i*8,width:4,progress:.3}));
   const after=f.pixels(w,low);
   for(const h of w.hazards)assert(changed(before,after,200,h.y1),`missing laser body ${h.id} for boss ${index}, low=${low}`);
  }
 }finally{f.close();}
});
test('image loader contract rejects every missing or malformed damage-body source before play',async()=>{
 const f=await fixture();try{
  assert.equal(typeof API.invalidAssetForEncounter,'function');
  for(const index of [-1,...encounterIndices]){
   assert.equal(API.invalidAssetForEncounter(f.images,index),null);
   const optional=API.optionalAssetKeysForEncounter(index),required=API.assetKeysForEncounter(index).filter(k=>!optional.includes(k)&&!k.startsWith('fxV8'));assert(required.length>0);
   for(const key of required){const bad={...f.images};delete bad[key];assert.equal(API.invalidAssetForEncounter(bad,index),key);bad[key]={complete:true,naturalWidth:1,naturalHeight:1};assert.equal(API.invalidAssetForEncounter(bad,index),key);}
  }
 }finally{f.close();}
});
test('real-source laser covers every interior damage pixel; fade and warning remain harmless presentation phases',async()=>{
 const f=await fixture();try{
  const canvas=createCanvas(360,100),ctx=canvas.getContext('2d'),fx=API.create(f.images);
  try{for(const index of [0,1,2,3,4])for(const low of [false,true]){
   ctx.clearRect(0,0,360,100);fx.beginFrame();
   assert.equal(fx.drawHazardBody(ctx,world(index),{id:1,phase:'active',x1:30,y1:50,x2:330,y2:50,width:10,progress:.3},low),true);
   const pixels=ctx.getImageData(0,0,360,100).data;
   for(let x=32;x<=328;x++)for(let y=47;y<=52;y++)assert.equal(pixels[(y*360+x)*4+3],255,`transparent damaging interior ${index}:${x},${y}`);
   assert.equal(pixels[(38*360+200)*4+3],0,'beam does not add a damaging-looking body beyond width');
   ctx.clearRect(0,0,360,100);fx.beginFrame();
   assert.equal(fx.drawHazardBody(ctx,world(index),{phase:'warning',x1:30,y1:50,x2:330,y2:50,width:10,progress:.5},low),false);
   assert.equal(ctx.getImageData(200,50,1,1).data[3],0,'warning cannot be painted as active body');
  }}finally{fx.destroy();}
 }finally{f.close();}
});
test('player wind-arrow source tip stays on the simulated shot and faces its actual velocity',async()=>{
 const f=await fixture();try{
  const ctx=f.main.getContext('2d'),original=ctx.drawImage.bind(ctx),calls=[];
  ctx.drawImage=function(...args){if(args[0]===f.images.fxWindArrow8V6)calls.push({args,m:ctx.getTransform()});return original(...args);};
  for(const angle of [-Math.PI/2,-Math.PI/2+.105,-Math.PI/2-.105])for(const age of [0,.2,.4,.7,1]){
   const w=world(0);w.shots=[{x:210,y:440,r:2,kind:'memory',angle,age,vx:Math.cos(angle)*660,vy:Math.sin(angle)*660}];
   calls.length=0;f.pixels(w,false);assert.equal(calls.length,1,'one source draw per friendly projectile');
   const {args,m}=calls[0],[,sx,sy,sw,sh,dx,dy,dw,dh]=args,phase=Math.min(7,Math.floor(age*1000/80));
   // Source contract's authored tip is (192,128) in its frame. A position
   // before the tip must lie behind the simulated velocity, independently of
   // the crop and scaling chosen by the renderer.
   function position(x,y){const px=dx+(x-sx)*dw/sw,py=dy+(y-sy)*dh/sh;return {x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f};}
   const tip=position(phase%4*256+192,Math.floor(phase/4)*256+128);
   assert(Math.abs(tip.x-210)<1e-8&&Math.abs(tip.y-440)<1e-8,'source tip is not displaced from shot');
   const behind=position(phase%4*256+160,Math.floor(phase/4)*256+128);
   assert((behind.x-tip.x)*Math.cos(angle)+(behind.y-tip.y)*Math.sin(angle)<0,'art forward axis follows velocity');
  }
 }finally{f.close();}
});

test('each boss renders its own actual rotating weapon above an opaque circular danger body',async()=>{
 const f=await fixture();try{
  const keys=['weaponVioletV12','weaponHornV12','weaponBalrogV12','weaponMaskV12','weaponLuciferV12'];
  for(let i=0;i<5;i++)for(const low of [false,true]){
   const canvas=createCanvas(80,80),ctx=canvas.getContext('2d'),fx=API.create(f.images),w={campaign:true,bossIndex:i};
   const b={id:1,x:40,y:40,r:11,halfLength:0,angle:Math.PI/2,spinAngle:0,age:.2,vx:0,vy:90,kind:'boss-weapon'};
   try{
    assert(API.assetKeysForEncounter(i).includes(keys[i]));assert.equal(API.invalidAssetForEncounter(f.images,i),null);
    const rotated=[];
    for(const angle of [0,Math.PI/2]){
     b.spinAngle=angle;ctx.clearRect(0,0,80,80);fx.beginFrame();assert.equal(fx.drawBullet(ctx,w,b,low),true);
     const m=fx.getMetrics();assert.equal(m.texturedBullets,1);assert.equal(m.weaponVisualDraws,1);assert.equal(m.missingProjectileAssets,0);
     const pixels=ctx.getImageData(0,0,80,80).data;rotated.push(Buffer.from(pixels));
     // Real source ORB carries the complete damaging interior; the visibly
     // rotating extension is decorative and does not expand collision.
     for(let y=33;y<=47;y++)for(let x=33;x<=47;x++)if((x-40)**2+(y-40)**2<=49)assert.equal(pixels[(y*80+x)*4+3],255,`missing opaque hit interior ${i}:${x},${y}`);
    }
    assert.notDeepEqual(rotated[0],rotated[1],`${keys[i]} did not visibly rotate`);
    const missing={...f.images};delete missing[keys[i]];assert.equal(API.invalidAssetForEncounter(missing,i),keys[i]);const absent=API.create(missing);try{absent.beginFrame();ctx.clearRect(0,0,80,80);assert.equal(absent.drawBullet(ctx,w,b,low),false);assert.equal(absent.getMetrics().missingProjectileAssets,1);assert.equal(ctx.getImageData(40,40,1,1).data[3],0,'no misleading body without required own weapon');}finally{absent.destroy();}
   }finally{fx.destroy();}
  }
 }finally{f.close();}
});
test('each boss weapon telegraph uses two separate source-art images before the actual throw',async()=>{
 const f=await fixture();try{for(let i=0;i<5;i++){
  const c=createCanvas(180,180),ctx=c.getContext('2d'),fx=API.create(f.images),w={campaign:true,bossIndex:i,stage:'boss',tick:100,phase:0,boss:{x:90,y:70,action:'charge',actionProgress:.5,releaseTick:-1,weaponTelegraph:true}};
  try{fx.beginFrame();fx.drawBossCast(ctx,w,false);assert.equal(fx.getMetrics().weaponTelegraphDraws,2);const pixels=ctx.getImageData(0,0,180,180).data;
   for(const px of [54,126]){let alpha=0;for(let y=94;y<122;y++)for(let x=px-14;x<px+14;x++)alpha+=pixels[(y*180+x)*4+3];assert(alpha>0,`missing telegraph on side ${px} for ${i}`);}
   w.boss.weaponTelegraph=false;ctx.clearRect(0,0,180,180);fx.beginFrame();fx.drawBossCast(ctx,w,false);assert.equal(fx.getMetrics().weaponTelegraphDraws,0);
  }finally{fx.destroy();}
 }}finally{f.close();}
});
