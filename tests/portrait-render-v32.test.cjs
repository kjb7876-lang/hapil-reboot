'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../tools/audit-object-projectiles-v24.cjs'),m=require('../tools/review-mobile-render-v30.cjs');
const BASE='86f45afa49b282cfb20c03263904e576bc1b89f8',viewport={left:0,top:0,right:360,bottom:640};
test('recycled bullet bindings track source, size, palette and cache eviction without changing pixels',async()=>{
  const box=a.runtime(),old=a.runtime(BASE),images=await a.imagesFor(box,8),fx=box.HapilProjectiles.create(images),prior=old.HapilProjectiles.create(images),c=m.createCanvas(360,640),d=m.createCanvas(360,640),ctx=c.getContext('2d'),dc=d.getContext('2d'),w=a.world(8,{combatRevision:31});
  const b={x:180,y:300,r:5,age:.2,angle:.7,vx:1,vy:1};
  function check(){ctx.clearRect(0,0,360,640);dc.clearRect(0,0,360,640);fx.beginFrame();prior.beginFrame();const state=JSON.stringify(b);assert(fx.drawBullet(ctx,w,b,true,viewport));assert(prior.drawBullet(dc,w,b,true));assert.equal(JSON.stringify(b),state);assert(Buffer.from(ctx.getImageData(0,0,360,640).data).equals(Buffer.from(dc.getImageData(0,0,360,640).data)));}
  try{check();check();assert.equal(fx.getMetrics().bodyBindingHits,1);
    for(const patch of [{kind:'hell-rotor',spinRate:-1},{spinRate:1},{r:8},{paletteSlot:1,acceleration:.3},{halfLength:5},{retiring:true,retireAge:.2,retireDuration:.8}]){Object.assign(b,patch);check();}
    const clearState={...b};for(let n=0;n<110;n++)fx.drawBullet(ctx,w,{...b,r:2+n/10},true);Object.assign(b,clearState);check();
    for(const [x,y]of[[-200,300],[560,300],[180,-200],[180,840],[-1,300],[359,639]]){b.x=x;b.y=y;check();}
    b.x=180;b.y=300;check();assert.equal(fx.getMetrics().missingProjectileAssets,0);
  }finally{fx.destroy();prior.destroy();}
});
test('rotated edge and reentering bullets preserve exact pixels; offscreen skip never deletes an attack',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,0),fx=box.HapilProjectiles.create(images),ref=box.HapilProjectiles.create(images),c=m.createCanvas(360,640),d=m.createCanvas(360,640),ctx=c.getContext('2d'),dc=d.getContext('2d'),w=a.world(0,{combatRevision:31});
  let cases=0,skipped=0;try{for(const angle of[0,.73,1.57,2.9])for(const x of[-180,-20,-1,0,359,380,540])for(const y of[10,320,650]){const b={x,y,angle,r:5,halfLength:12,age:.1,kind:'orb'};ctx.clearRect(0,0,360,640);dc.clearRect(0,0,360,640);fx.beginFrame();ref.beginFrame();fx.drawBullet(ctx,w,b,true,viewport);ref.drawBullet(dc,w,b,true);assert(Buffer.from(ctx.getImageData(0,0,360,640).data).equals(Buffer.from(dc.getImageData(0,0,360,640).data)));skipped+=fx.getMetrics().offscreenBulletDrawsSkipped||0;cases++;}assert.equal(cases,84);assert(skipped>0);}finally{fx.destroy();ref.destroy();}
});
test('source impact phases fade through real effect lifetime, bounded budgets and released surfaces',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,8),w=m.world(box,8,2,421,31),f=m.fixture(box,images),c=box.allocated.length;w.effects=[];
  try{for(const low of[true,false]){w.effects=Array.from({length:20},(_,i)=>({kind:'kill',x:40+i*12,y:260,r:23,age:.1,ttl:.6}));w.effects.push({kind:'hit',x:180,y:500,r:16,age:.1,ttl:.35});const state=JSON.stringify(w),out=f.draw(w,low);assert.equal(JSON.stringify(w),state);assert.equal(out.metrics.hurtImpactDraws,1);assert.equal(out.metrics.defeatImpactDraws,low?6:10);assert(out.metrics.impactCacheBytes<=663552);for(let n=0;n<3;n++)f.draw(w,low);const allocated=box.allocated.length;f.draw(w,low);assert.equal(box.allocated.length,allocated);}
    for(const age of[.01,.12,.3,.59,.6]){w.effects=[{kind:'kill',x:180,y:260,r:23,age,ttl:.6}];assert.equal(f.draw(w,true).metrics.defeatImpactDraws,age<.6?1:0);}
  }finally{f.close();}const impactCanvases=box.allocated.slice(c).filter(x=>x.width===144);assert.equal(impactCanvases.length,0);
});
