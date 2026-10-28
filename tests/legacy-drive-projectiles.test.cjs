'use strict';
// CPU Canvas/unit fixtures only: no claim about mobile GPU or natural gameplay.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/projectiles.js');
const API=global.HapilProjectiles;
const keys=['fxV8VioletWeb','fxV8SilverSlash','fxV8SwampRipple','fxV8Reed','fxV8Ember','fxV8GoldSlash','fxV8Unlock','fxV8Vortex'];
function fixture(){
 const old=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1)}};
 const images={};
 for(const key of keys){const h=key==='fxV8GoldSlash'?256:512,c=createCanvas(512,h),ctx=c.getContext('2d');for(let i=0;i<h/128*4;i++){ctx.fillStyle=`rgb(${25+i*10},${50+i*7},${220-i*9})`;ctx.fillRect(i%4*128,Math.floor(i/4)*128,128,128)}c.complete=true;c.naturalWidth=512;c.naturalHeight=h;images[key]=c;}
 for(const key of ['projectileVioletOrbV9','projectileLuciferOrbV9']){const c=createCanvas(296,80),ctx=c.getContext('2d');for(let i=0;i<4;i++){ctx.fillStyle=['#8d3acb','#aaa7db','#42a6bc','#daa4a0'][i];ctx.fillRect(8+i*72,8,64,64)}c.complete=true;c.naturalWidth=296;c.naturalHeight=80;images[key]=c;}
 const c=createCanvas(48,48),ctx=c.getContext('2d'),fx=API.create(images);return {c,ctx,fx,close(){fx.destroy();global.document=old}};
}
function bullet(age=0,r=4,l=0){return {id:3,x:24,y:24,r,halfLength:l,age,angle:0,vx:0,vy:100};}
function render(f,boss,age,r=4,l=0,low=false){f.ctx.clearRect(0,0,48,48);f.fx.beginFrame();assert.equal(f.fx.drawBullet(f.ctx,{campaign:true,bossIndex:boss,bullets:[{}]},bullet(age,r,l),low),true);return Buffer.from(f.ctx.getImageData(0,0,48,48).data);}
function alpha(b){return Array.from(b).filter((_,i)=>i%4===3)}
test('Drive ORB phases advance once at 125ms and hold without changing danger alpha at 6–10px',()=>{
 const f=fixture();try{for(const boss of [0,4])for(const low of [false,true])for(const diameter of [6,7.6,10]){const frames=[0,.126,.251,.376].map(t=>render(f,boss,t,diameter/2,0,low));for(let i=1;i<4;i++){assert.notDeepEqual(frames[i],frames[i-1]);assert.deepEqual(alpha(frames[i]),alpha(frames[0]));}assert.deepEqual(render(f,boss,4,diameter/2,0,low),frames[3]);assert.deepEqual(render(f,boss,40,diameter/2,0,low),frames[3]);const c=24*48*4+24*4;assert.equal(frames[0][c+3],255);}}finally{f.close()}
});
test('animation phase changes reuse one bounded cached strip and one live draw per bullet',()=>{
 const f=fixture();try{const w={campaign:true,bossIndex:0,bullets:new Array(500)},b=bullet();f.fx.beginFrame();f.fx.drawBullet(f.ctx,w,b,false);assert.equal(f.fx.getMetrics().stampCacheMisses,1);for(let cycle=0;cycle<5;cycle++){f.fx.beginFrame();for(let i=0;i<500;i++){b.age=i/120;f.fx.drawBullet(f.ctx,w,b,false);}const m=f.fx.getMetrics();assert.equal(m.stampDraws,500);assert.equal(m.animatedBulletDraws,500);assert.equal(m.stampCacheMisses,0);assert(m.stampCacheBytes<=m.stampCacheByteLimit);assert.equal(m.projectileTailDraws,0);}for(let shape=0;shape<180;shape++){b.r=1+(shape%70)/10;b.halfLength=(shape%25);f.fx.drawBullet(f.ctx,w,b,shape%2===0);}const m=f.fx.getMetrics();assert(m.stampCacheEntries<=96);assert(m.stampCacheBytes<=4*1024*1024);assert(m.stampDraws<=768);}finally{f.close()}
});
test('generic texture phases are once-only and source-less effects never replace warning geometry',()=>{
 const f=fixture();try{for(const boss of [1,2,3]){const a=render(f,boss,0,4,3),last=render(f,boss,2,4,3);assert.deepEqual(alpha(a),alpha(last));assert.deepEqual(render(f,boss,20,4,3),last);}f.fx.beginFrame();assert.equal(f.fx.drawHazardDecoration(f.ctx,{campaign:true,bossIndex:2},{phase:'warning',x1:24,y1:24,width:8},false),false);assert.equal(f.fx.getMetrics().compactHazardDraws,0);assert(API.assetKeysForEncounter(0).includes('projectileVioletOrbV9'));assert(API.assetKeysForEncounter(4).includes('projectileLuciferOrbV9'));assert(API.assetKeysForEncounter(3).includes('fxV8SilverSlash'));}finally{f.close()}
});

test('unapproved unlock source is neither requested nor drawn as another effect',()=>{
 const f=fixture();try{for(const boss of [3,4]){assert(!API.assetKeysForEncounter(boss).includes('fxV8Unlock'));f.fx.beginFrame();const w={campaign:true,bossIndex:boss,stage:'boss',phase:2,tick:120,boss:{x:24,y:24,action:boss===3?'charge':'attack',actionProgress:.3,releaseTick:120}};f.fx.drawBossCast(f.ctx,w,false);const m=f.fx.getMetrics();assert.equal(m.suppressedUnapprovedFX,1);assert.equal(m.bossCastDraws,0);}}finally{f.close()}
});
