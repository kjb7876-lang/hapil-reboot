'use strict';
// Actual retained source pixels; synthetic cue records test the presentation
// contract only. Separate integration tests observe real successful contacts.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const a=require('../tools/audit-object-projectiles-v24.cjs'),m=require('../tools/review-mobile-render-v30.cjs');
const source=fs.readFileSync(require.resolve('../src/combat-presentation-v36.js'),'utf8');
function box(){const b=a.runtime();vm.runInNewContext(source,b,{filename:'combat-presentation-v36.js'});return b;}
function world(index=0,revision=31){return {campaign:true,campaignRevision:5,combatRevision:revision,bossIndex:index,phase:0,finalPractice:false,stage:'boss',tick:120,player:{x:180,y:550,egoUntil:0}};}
function shot(patch={}){return {id:7,x:64,y:64,px:64,py:70,kind:'basic',age:.12,angle:0,vx:660,vy:0,...patch};}
function pixels(canvas){return Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);}
function sourcePixelsOnly(ctx){return new Proxy(ctx,{get(target,key){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(key))return function(){throw Error('geometric friendly replacement '+key);};const value=target[key];return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});}
function measure(canvas,x=64,y=64){
 const d=pixels(canvas);let minX=999,maxX=-1,minY=999,maxY=-1,count=0,nearAlpha=0,nearLuma=0;
 for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){const at=(py*canvas.width+px)*4,alpha=d[at+3];if(alpha>=48){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);count++;}if(Math.abs(px-x)<=2&&Math.abs(py-y)<=2){nearAlpha=Math.max(nearAlpha,alpha);nearLuma=Math.max(nearLuma,(d[at]+d[at+1]+d[at+2])/3*alpha/255);}}
 return {minX,maxX,minY,maxY,count,width:maxX-minX+1,height:maxY-minY+1,nearAlpha,nearLuma};
}
function cue(b,w,event){const f=b.HapilCore.getCombatPresentation(w),serial=++f.serial;Object.assign(f.events[(serial-1)%64],{serial,tick:w.tick,kind:'impact',x:64,y:64,angle:-Math.PI/2,shotKind:'basic',shotId:serial,targetId:19,targetX:64,targetY:48,targetRadius:16,isBoss:false,killed:false},event);return f;}
test('three own player shot families keep a dense bright tip on the real point, coherent directions and distinct skill grades',async()=>{
 const b=box(),cache=new Map(),records=[];
 for(const [index,group,key]of[[0,0,'fxWindArrow8V6'],[18,19,'storyPlayerHandoSlash'],[21,22,'storyPlayerSeohaSlash']]){
  const images=await a.imagesFor(b,group,cache),fx=b.HapilCombatPresentationV36.create(images),w=world(index),c=m.createCanvas(128,128),ctx=c.getContext('2d'),hashes=new Set();
  try{for(const kind of['basic','memory','counter','ego']){
   w.player.egoUntil=kind==='ego'?200:0;const s=shot({kind:kind==='ego'?'basic':kind}),state=JSON.stringify([w,s]);ctx.clearRect(0,0,128,128);fx.beginFrame(w,true);assert(fx.drawShot(ctx,w,s));const h=measure(c);
   assert(h.count>=8&&h.width>=15,'shot must have a visible retained object '+JSON.stringify({key,kind,h}));assert(h.width>h.height*1.4,'friendly silhouette must read along its motion '+JSON.stringify({key,kind,h}));assert(h.maxX<=69&&h.minX<52,'real tip must lead its compact trail '+JSON.stringify({key,kind,h}));assert(h.nearAlpha>=64&&h.nearLuma>=30,'real simulation point must contain bright source art '+JSON.stringify({key,kind,h}));
   assert.equal(fx.getMetrics().shotAsset,key);assert.equal(fx.getMetrics().shotDraws,1);assert.equal(fx.getMetrics().missingAssets,0);assert.equal(JSON.stringify([w,s]),state);hashes.add(crypto.createHash('sha256').update(pixels(c)).digest('hex'));
   const horizontal={...h};ctx.clearRect(0,0,128,128);fx.beginFrame(w,true);fx.drawShot(ctx,w,shot({kind:s.kind,angle:-Math.PI/2}));const up=measure(c);assert(up.height>up.width*1.4);assert(up.maxY>76&&up.minY<=69,'upward tip leads a downward trailing body '+JSON.stringify({key,kind,horizontal,up}));records.push({key,kind,horizontal,up});
  }assert.equal(hashes.size,4,'basic/memory/counter/ego must remain visibly distinguishable');}finally{fx.destroy();}
 }
 assert.equal(records.length,12);
});
test('all96 friendly bodies draw in both qualities with bounded own-source caches and no warm surfaces or pixel reads',async()=>{
 const b=box(),cache=new Map(),all={};for(const group of[0,19,22])Object.assign(all,await a.imagesFor(b,group,cache));
 const fx=b.HapilCombatPresentationV36.create(all),c=m.createCanvas(360,640),ctx=c.getContext('2d');
 try{for(const index of[0,18,21])for(const low of[false,true]){
  const w=world(index),shots=Array.from({length:96},(_,i)=>shot({id:i,x:30+i%12*26,y:280+Math.floor(i/12)*32,kind:['basic','memory','counter'][i%3],angle:-Math.PI/2})),state=JSON.stringify([w,shots]);
  for(let pass=0;pass<2;pass++){fx.beginFrame(w,low);for(const s of shots)fx.drawShot(ctx,w,s);cue(b,w);fx.drawContacts(ctx,w);fx.drawDefeat(ctx,w,{kind:'kill',x:180,y:180,r:23,age:.2,ttl:.6});}
  const allocated=b.allocated.length,builds=fx.getMetrics().cacheBuilds;for(const backing of b.allocated)backing.getContext('2d').getImageData=function(){throw Error('warm source pixel read');};
  const sourceOnly=sourcePixelsOnly(ctx);fx.beginFrame(w,low);for(const s of shots)fx.drawShot(sourceOnly,w,s);fx.drawContacts(sourceOnly,w);fx.drawDefeat(sourceOnly,w,{kind:'kill',x:180,y:180,r:23,age:.2,ttl:.6});
  assert.equal(b.allocated.length,allocated);assert.equal(fx.getMetrics().cacheBuilds,builds);assert.equal(fx.getMetrics().shotDraws,96);assert.equal(fx.getMetrics().missingAssets,0);assert(fx.getMetrics().cacheBytes<=1024*1024);assert.equal(JSON.stringify([w,shots]),state);
 }assert.equal(fx.getMetrics().cacheBytes,688128,'all three families and contact grades share a bounded source cache');}finally{fx.destroy();}
 assert.equal(fx.getMetrics().cacheBytes,0);assert(b.allocated.every(c=>c.width===1&&c.height===1),'destroy releases every module-owned backing canvas');
});
test('only successful recorded contacts produce finite local two-beat impacts, capped independently from all shot bodies',async()=>{
 const b=box(),images=await a.imagesFor(b,0),fx=b.HapilCombatPresentationV36.create(images),w=world(),c=m.createCanvas(128,128),ctx=c.getContext('2d');
 try{fx.beginFrame(w,true);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().impactDraws,0);assert.equal(measure(c).count,0);
  cue(b,w,{x:64,y:64});const state=JSON.stringify(w),hashes=[];
  for(const dt of[0,2,8,14]){w.tick=120+dt;ctx.clearRect(0,0,128,128);fx.beginFrame(w,true);fx.drawContacts(ctx,w);const p=measure(c);assert.equal(fx.getMetrics().impactDraws,1);assert.equal(fx.getMetrics().lastContactX,64);assert.equal(fx.getMetrics().lastContactY,64);assert(p.maxX<=92&&p.minX>=36&&p.maxY<=92&&p.minY>=36,'contact cannot wash out a dodge lane');hashes.push(crypto.createHash('sha256').update(pixels(c)).digest('hex'));}
  assert.equal(new Set(hashes).size,4);w.tick=135;ctx.clearRect(0,0,128,128);fx.beginFrame(w,true);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().impactDraws,0);assert.equal(measure(c).count,0);w.tick=120;assert.equal(JSON.stringify(w),state);
  for(let n=0;n<64;n++)cue(b,w,{x:42+n%8*8,y:42+Math.floor(n/8)*8});for(const [low,limit]of[[true,8],[false,12]]){fx.beginFrame(w,low);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().impactDraws,limit);assert.equal(fx.getMetrics().contactLimit,limit);}
 }finally{fx.destroy();}
});
test('muzzle flashes and finite defeat dust use source pixels, remain local and have independent strict draw budgets',async()=>{
 const b=box(),images=await a.imagesFor(b,0),fx=b.HapilCombatPresentationV36.create(images),w=world(),c=m.createCanvas(128,128),ctx=c.getContext('2d');
 try{for(let i=0;i<7;i++)cue(b,w,{kind:'muzzle',x:64,y:64});for(const [low,count]of[[true,2],[false,3]]){ctx.clearRect(0,0,128,128);fx.beginFrame(w,low);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().muzzleDraws,count);assert.equal(fx.getMetrics().impactDraws,0);const p=measure(c);assert(p.width<=18&&p.height<=18);}
  w.tick+=5;fx.beginFrame(w,true);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().muzzleDraws,0);
  const states=[];for(const age of[0,.1,.28,.5,.6]){const e={kind:'kill',x:64,y:64,r:23,age,ttl:.6};ctx.clearRect(0,0,128,128);fx.beginFrame(w,true);assert(fx.drawDefeat(ctx,w,e));states.push(pixels(c));assert.equal(fx.getMetrics().defeatDraws,age<.6?1:0);const p=measure(c);if(age<.6)assert(p.maxX<=107&&p.minX>=21&&p.maxY<=107&&p.minY>=21);}
  assert.equal(new Set(states.map(p=>crypto.createHash('sha256').update(p).digest('hex'))).size,5);fx.beginFrame(w,true);for(let n=0;n<30;n++)fx.drawDefeat(ctx,w,{kind:'kill',x:64,y:64,r:23,age:.2,ttl:.6});assert.equal(fx.getMetrics().defeatDraws,6);
 }finally{fx.destroy();}
});
test('legacy worlds remain untouched and missing current own assets fail closed without a geometric or borrowed replacement',async()=>{
 const b=box(),c=m.createCanvas(128,128),ctx=c.getContext('2d'),fx=b.HapilCombatPresentationV36.create({});
 try{for(const revision of[undefined,21,25,27,28,29,30]){const w=world();w.combatRevision=revision;const state=JSON.stringify(w);fx.beginFrame(w,true);assert.equal(fx.drawShot(ctx,w,shot()),false);assert.equal(fx.drawDefeat(ctx,w,{kind:'kill',x:64,y:64,age:0,ttl:.6}),false);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().cacheBytes,0);assert.equal(JSON.stringify(w),state);}
  const w=world(18);fx.beginFrame(w,true);assert.equal(fx.drawShot(ctx,w,shot()),true);assert.equal(fx.getMetrics().missingAssets,1);assert.equal(fx.getMetrics().shotDraws,0);cue(b,w);fx.drawContacts(ctx,w);assert.equal(fx.getMetrics().impactDraws,0);assert.equal(measure(c).count,0);assert.equal(fx.getMetrics().cacheBytes,0);
 }finally{fx.destroy();}
});
