'use strict';
// CPU Canvas/unit fixtures only: no claim about mobile GPU or natural gameplay.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/projectiles.js');
const API=global.HapilProjectiles;
const keys=['fxV8VioletWeb','fxV8SilverSlash','fxV8SwampRipple','fxV8Reed','fxV8Ember','fxV8GoldSlash','fxV8Unlock','fxV8Vortex'];
function fixture(){
 const old=global.document,generated=[];global.document={createElement(name){assert.equal(name,'canvas');const c=createCanvas(1,1);generated.push(c);return c}};
 const images={};
 for(const key of keys){const h=key==='fxV8GoldSlash'?256:512,c=createCanvas(512,h),ctx=c.getContext('2d');for(let i=0;i<h/128*4;i++){ctx.fillStyle=`rgb(${25+i*10},${50+i*7},${220-i*9})`;ctx.fillRect(i%4*128,Math.floor(i/4)*128,128,128)}c.complete=true;c.naturalWidth=512;c.naturalHeight=h;images[key]=c;}
 for(const key of ['projectileVioletOrbV9','projectileLuciferOrbV9']){const c=createCanvas(296,80),ctx=c.getContext('2d');for(let i=0;i<4;i++){ctx.fillStyle=['#8d3acb','#aaa7db','#42a6bc','#daa4a0'][i];ctx.fillRect(8+i*72,8,64,64)}c.complete=true;c.naturalWidth=296;c.naturalHeight=80;images[key]=c;}
 for(const key of ['projectileHornOrbV10','projectileBalrogOrbV10','projectileMaskOrbV10','projectileVioletBladeV10','projectileBalrogBladeV10','projectileMaskNeedleV10','projectileHornNeedleV11','projectileLuciferShardV11']){const w=/Blade|Needle|Shard/.test(key)?128:64,c=createCanvas(w,64),ctx=c.getContext('2d');ctx.fillStyle='#e3a459';ctx.fillRect(0,0,w,64);c.complete=true;c.naturalWidth=w;c.naturalHeight=64;images[key]=c;}
 // Natural regular needles now draw these already-owned sources. The unit
 // fixture therefore needs actual drawable canvases, not dimension-only stubs.
 for(const [key,width,height] of [['h14SkillHorn',256,256],['h14SkillBalrog',512,512],['weaponVioletV12',1774,887],['weaponHornV12',1774,887],['weaponBalrogV12',1774,887],['weaponMaskV12',1774,887],['weaponLuciferV12',1254,1254]]){const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.fillStyle='#e3a459';ctx.fillRect(0,0,width,height);c.complete=true;c.naturalWidth=width;c.naturalHeight=height;images[key]=c;}
 const c=createCanvas(48,48),ctx=c.getContext('2d'),fx=API.create(images);return {c,ctx,fx,images,generated,close(){fx.destroy();global.document=old}};
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
test('static source bodies remain fixed and source-less effects never replace warning geometry',()=>{
 const f=fixture();try{for(const boss of [1,2,3]){const a=render(f,boss,0,4,3),last=render(f,boss,2,4,3);assert.deepEqual(alpha(a),alpha(last));assert.deepEqual(render(f,boss,20,4,3),last);}f.fx.beginFrame();assert.equal(f.fx.drawHazardDecoration(f.ctx,{campaign:true,bossIndex:2},{phase:'warning',x1:24,y1:24,width:8},false),false);assert.equal(f.fx.getMetrics().compactHazardDraws,0);assert(API.assetKeysForEncounter(0).includes('projectileVioletOrbV9'));assert(API.assetKeysForEncounter(4).includes('projectileLuciferOrbV9'));assert(API.assetKeysForEncounter(3).includes('projectileMaskNeedleV10'));}finally{f.close()}
});

test('unapproved unlock source is neither requested nor drawn as another effect',()=>{
 const f=fixture();try{for(const boss of [3,4]){assert(!API.assetKeysForEncounter(boss).includes('fxV8Unlock'));f.fx.beginFrame();const w={campaign:true,bossIndex:boss,stage:'boss',phase:2,tick:120,boss:{x:24,y:24,action:boss===3?'charge':'attack',actionProgress:.3,releaseTick:120}};f.fx.drawBossCast(f.ctx,w,false);const m=f.fx.getMetrics();assert.equal(m.suppressedUnapprovedFX,1);assert.equal(m.bossCastDraws,0);}}finally{f.close()}
});


test('all enemy modes, bullet shapes, and cap pressure stay source-only with zero geometric body draws',()=>{
 const f=fixture();try{
  for(const campaign of [true,false])for(const bossIndex of [0,1,2,3,4])for(const [r,l] of [[3.8,0],[4,13],[3,9],[8,24]]){
   f.fx.beginFrame();let draws=0;const ctx=new Proxy(f.ctx,{get(target,key){if(['fill','fillRect','stroke','strokeRect','fillText'].includes(key))return ()=>{throw Error('geometric danger body '+key)};const value=target[key];if(key==='drawImage')return (...args)=>{assert.equal(args.length,5,'one direct frame draw with no source crop');draws++;return value.apply(target,args)};return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});
   for(let i=0;i<768;i++)assert.equal(f.fx.drawBullet(ctx,{campaign,bossIndex},bullet(i/120,r,l),false),true);
   assert.equal(draws,768);assert.equal(f.fx.getMetrics().stampDraws,768);assert.equal(f.fx.getMetrics().missingProjectileAssets,0);
  }
 }finally{f.close();}
});
test('palette priority follows explicit purple name then retained image colors; secondary layer requires an explicit slot',()=>{
 assert.equal(API.paletteFor({bossIndex:0}).primary,'#b46ce0');assert.equal(API.paletteFor({bossIndex:1}).primary,'#b39a51');assert.equal(API.paletteFor({bossIndex:2}).primary,'#f46b2c');assert.equal(API.paletteFor({bossIndex:3}).primary,'#d34b35');assert.equal(API.paletteFor({bossIndex:4}).primary,'#be2442');
 for(let i=0;i<5;i++){const w={campaign:true,bossIndex:i},p=API.paletteFor(w);for(const kind of ['orb','needle','blade'])assert.equal(API.colorFor(w,{kind,id:3}),p.primary);assert.equal(API.colorFor(w,{paletteSlot:1}),p.secondary);assert.equal(API.colorFor(w,{paletteSlot:9}),p.primary);}
});
test('missing or malformed authored bodies are reported instead of replaced with procedural shapes',()=>{
 const f=fixture();try{for(let i=0;i<5;i++){assert.equal(API.invalidAssetForEncounter(f.images,i),null);const required=API.assetKeysForEncounter(i).filter(k=>/^(projectile|weapon|h14Skill)/.test(k)&&!API.optionalAssetKeysForEncounter(i).includes(k));for(const key of required){const original=f.images[key];delete f.images[key];assert.equal(API.invalidAssetForEncounter(f.images,i),key);f.images[key]=original;}}
 const missing=API.create({});f.fx.beginFrame();let calls=0;const ctx=new Proxy({}, {get(){return ()=>calls++;},set(){return true;}});assert.equal(missing.drawBullet(ctx,{campaign:false},bullet()),false);assert.equal(calls,0);assert.equal(missing.getMetrics().missingProjectileAssets,1);missing.destroy();
 }finally{f.close();}
});


test('Lucifer dark source pixels stay readable crimson on dark maps without adding a backing shape',()=>{
 const f=fixture();try{
  const source=f.images.projectileLuciferOrbV9,sc=source.getContext('2d');sc.clearRect(0,0,296,80);for(let phase=0;phase<4;phase++){sc.fillStyle='#030408';sc.fillRect(16+phase*72,16,48,48);}
  const data=render(f,4,0,5,0),at=(24*48+24)*4;
  function linear(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}
  const luminance=.2126*linear(data[at])+.7152*linear(data[at+1])+.0722*linear(data[at+2]);
  const bg=.2126*linear(25)+.7152*linear(32)+.0722*linear(50);
  assert((luminance+.05)/(bg+.05)>3,'dark iris remains a visible >3:1 crimson mass');assert.equal(data[at+3],255);assert(data[at]>data[at+1]*2,'primary remains crimson');
 }finally{f.close();}
});


test('Lucifer blue source petals retain bright ivory structure after crimson recoloring',()=>{
 const f=fixture();try{const sc=f.images.projectileLuciferOrbV9.getContext('2d');for(let phase=0;phase<4;phase++){sc.fillStyle='#030408';sc.fillRect(16+phase*72,16,24,48);sc.fillStyle='#0039ff';sc.fillRect(40+phase*72,16,24,48);}
 const data=render(f,4,0,5,0),dark=(24*48+22)*4,bright=(24*48+26)*4;
 assert(data[bright+1]>data[dark+1]+60,'original saturated blue value becomes visible ivory contrast');assert.equal(data[dark+3],255);assert.equal(data[bright+3],255);assert(data[dark]>data[dark+1]*2);
 }finally{f.close();}
});
test('cache eviction and destroy release every separate animation frame surface',()=>{
 const f=fixture();try{f.fx.beginFrame();for(let shape=0;shape<180;shape++)f.fx.drawBullet(f.ctx,{campaign:true,bossIndex:4},bullet(.25,1+(shape%70)/10,shape%25),false);
 const metrics=f.fx.getMetrics();assert(metrics.stampCacheEntries<=96);assert(metrics.stampCacheBytes<=4*1024*1024);assert(f.generated.some(c=>c.width===1&&c.height===1),'evicted source/frame surfaces released');f.fx.destroy();assert(f.generated.every(c=>c.width===1&&c.height===1),'all cached frame/source surfaces released');
 }finally{f.close();}
});
