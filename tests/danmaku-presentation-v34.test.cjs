'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../tools/audit-object-projectiles-v24.cjs'),m=require('../tools/review-mobile-render-v30.cjs'),BASE='fb90bfb8c5bf9f63f7789b2c38fefc10927562ed';
test('modern laser relief preserves every alpha pixel and legacy laser RGB while retaining all source bodies',async()=>{
 const box=a.runtime(),old=a.runtime(BASE),cache=new Map();let comparisons=0;
 for(const group of[0,4,6,8,11,34]){
  const images=await a.imagesFor(box,group,cache,{},old),fx=box.HapilProjectiles.create(images),prior=old.HapilProjectiles.create(images),c=m.createCanvas(360,640),d=m.createCanvas(360,640),ctx=c.getContext('2d'),dc=d.getContext('2d');
  try{for(const revision of[30,31])for(const low of[false,true])for(const pressureCurtain of[false,true]){
   const w=a.world(group,{combatRevision:revision,tick:300}),h={id:1,x1:80,y1:10,x2:270,y2:630,width:pressureCurtain?86:9,pressureCurtain,phase:'active',progress:.5},state=JSON.stringify([w,h]);ctx.clearRect(0,0,360,640);dc.clearRect(0,0,360,640);fx.beginFrame();prior.beginFrame();assert(fx.drawHazardBody(ctx,w,h,low));assert(prior.drawHazardBody(dc,w,h,low));
   const one=ctx.getImageData(0,0,360,640).data,two=dc.getImageData(0,0,360,640).data;for(let n=3;n<one.length;n+=4)assert.equal(one[n],two[n],'danger coverage cannot become transparent');if(revision===30)assert(Buffer.from(one).equals(Buffer.from(two)),'legacy source grade must stay exact');else assert(!Buffer.from(one).equals(Buffer.from(two)),'new relief must visibly change its own source');
   assert.equal(JSON.stringify([w,h]),state);assert.equal(fx.getMetrics().assetLaserDraws,1);assert.equal(fx.getMetrics().missingProjectileAssets,0);comparisons++;
  }}finally{fx.destroy();prior.destroy();}
 }assert.equal(comparisons,48);
});
test('source bullet RGB, silhouettes, pivots and rotation remain exact in the current31 style',async()=>{
 const box=a.runtime(),old=a.runtime(BASE),cache=new Map();for(const group of[0,4,6,8,11,34]){
  const images=await a.imagesFor(box,group,cache,{},old),fx=box.HapilProjectiles.create(images),prior=old.HapilProjectiles.create(images),c=m.createCanvas(120,120),d=m.createCanvas(120,120),w=a.world(group,{combatRevision:31});try{for(const kind of['orb','hell-rotor']){
   const b={x:60,y:60,r:5,halfLength:0,age:.2,angle:.8,spinAngle:.7,spinRate:-1,kind,paletteSlot:1};fx.drawBullet(c.getContext('2d'),w,b,true);prior.drawBullet(d.getContext('2d'),w,b,true);assert(c.toBuffer('image/png').equals(d.toBuffer('image/png')));
  }}finally{fx.destroy();prior.destroy();}
 }
});
test('backdrop grade keeps old scenes exact, uses no warm surfaces and preserves all world state',async()=>{
 const box=a.runtime(),old=a.runtime(BASE),images=await a.imagesFor(box,8),w=m.world(box,8,2,300,31),f=m.fixture(box,images),g=m.fixture(old,images);try{
  w.combatRevision=30;assert(f.draw(w,true).pixels.equals(g.draw(w,true).pixels));w.combatRevision=31;const state=JSON.stringify(w);for(let n=0;n<3;n++)f.draw(w,true);const count=box.allocated.length,out=f.draw(w,true);assert.equal(out.metrics.combatBackdropGrade,true);assert.equal(box.allocated.length,count);assert.equal(JSON.stringify(w),state);assert(out.metrics.projectilePresentation.stampCacheBytes<=4194304);
 }finally{f.close();g.close();}
});
test('departing copies fade only after pending promises, while the real release remains bright',async()=>{
 const box=a.runtime(),images=await a.imagesFor(box,0),w=m.world(box,0,2,421,31),f=m.fixture(box,images),copy=w.boss.combatCopies[0];assert(copy);w.boss.combatCopies=[copy];w.tick=copy.expireAt-1;copy.releaseTick=w.tick-20;w.boss.skillCasts=[];
 function opacity(){const state=JSON.stringify(w),out=f.draw(w,true),sample=out.metrics.actorPresentation.lastCombatCopySamples.find(s=>s.id===copy.id);assert.equal(JSON.stringify(w),state);assert(sample);return sample.opacity;}
 try{const fade=opacity();assert(fade>0&&fade<.05);w.boss.skillCasts=[{id:'pending',sourceActorId:copy.sourceActorId,activeAt:w.tick+1,expireAt:w.tick+60,cancelled:false}];const promised=opacity();assert(promised>.5);copy.releaseTick=w.tick;assert(opacity()>.9);}finally{f.close();}
});
