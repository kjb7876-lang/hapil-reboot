'use strict';
// Actual retained image pixels, independent of renderer counters/reports.
// A small mathematical hit core is kept readable inside authored silhouette;
// cosmetic pixels outside it are bounded and do not expand engine collision.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/story-assets.js');require('../src/projectiles.js');const API=global.HapilProjectiles,media=require('../tools/read-media-registry.cjs')();
function world(group){return group===12?{campaign:true,bossIndex:11,finalPractice:true}:group>=19?{campaign:true,campaignRevision:5,bossIndex:group-1}:group>=13?{campaign:true,campaignRevision:4,bossIndex:group-1}:{campaign:true,campaignRevision:3,bossIndex:group};}
test('all36 encounter selections and both cult actors show natural contours and internal contrast at real sizes in both qualities, with one bounded draw',async()=>{
 const previous=global.document;global.document={createElement(){return createCanvas(1,1)}};
 const variants=Array.from({length:36},(_,group)=>({group,sourceActorId:group===34?'han-rian':undefined}));variants.push({group:34,sourceActorId:'baek-ion'});
 const keys=[...new Set(variants.flatMap(v=>API.assetKeysForEncounter(v.group)))],images={};for(const key of keys)images[key]=await loadImage(path.join(__dirname,'..',media[key]));
 try{for(const {group,sourceActorId} of variants){
  const fx=API.create(images);try{for(const [r,l] of [[3,0],[6,0],[3,7],[6,7]]){
   let high;
   for(const low of [false,true]){const c=createCanvas(64,64),ctx=c.getContext('2d');let draws=0;const noBodyGeometry=new Proxy(ctx,{get(t,key){if(['fill','fillRect','stroke','strokeRect','fillText'].includes(key))return()=>{throw Error('geometric projectile '+key)};const f=t[key];if(key==='drawImage')return(...a)=>{draws++;assert.equal(a.length,5);return f.apply(t,a)};return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});
    fx.beginFrame();assert(fx.drawBullet(noBodyGeometry,world(group),{id:7,x:32,y:32,r,halfLength:l,kind:l?'needle':'orb',age:.25,angle:0,vx:100,vy:0,sourceActorId},low));assert.equal(draws,1);
    const data=ctx.getImageData(0,0,64,64).data;let core=0,visibleCore=0,outside=0,colors=new Set(),n=0,sum=0,sum2=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,a=data[i+3],dx=x+.5-32,dy=y+.5-32;
     if(Math.hypot(dx,dy)<Math.min(2,r*.55)){core++;visibleCore+=a>=180;}
     if(a>=64){if(Math.hypot(Math.max(0,Math.abs(dx)-l),dy)>r+.75)outside++;if(group===8||(group===6&&!l))assert(Math.abs(dx)<=49&&Math.abs(dy)<=49,'approved whole Lust/mirror objects stay within the explicit48px full-object budget plus raster tolerance');else assert(Math.abs(dx)<=l+r+4.75&&Math.abs(dy)<=r+4.75,'unchanged authored ornament cannot grow beyond the promised small visual margin');}
     if(a>=200){colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];sum+=lum;sum2+=lum*lum;n++;}
    }
    assert(visibleCore/core>=.8,`${group}/${r}/${l}: actual central source pixels must remain readable`);assert(outside>0,`${group}/${r}/${l}: the source outline must survive beyond a forced circle/capsule clip`);assert(colors.size>=12,`${group}/${r}/${l}: source structure must survive a flat-color wash`);assert(Math.sqrt(Math.max(0,sum2/n-(sum/n)**2))>=3,'preserve opaque-source light/dark detail');
    if(low)assert.deepEqual(Buffer.from(data),high,'low quality cannot replace detailed danger sprites with primitive bodies');else high=Buffer.from(data);
    const m=fx.getMetrics();assert.equal(m.missingProjectileAssets,0);assert.equal(m.naturalSilhouetteDraws,1);assert(m.stampCacheBytes<=4194304);assert(m.stampCacheEntries<=96);if(group===8||(group===6&&!l)){assert(m.maxOwnedObjectPixels<=48);assert(m.legacyMaxVisualOutset<=4);}else assert(m.maxVisualOutset<=4);
   }
  }}finally{fx.destroy();}
 }}finally{global.document=previous;}
});
test('all new source objects have closed boundaries and formerly rectangular Goblin/Siren/knight/cult stamps preserve irregular contours',async()=>{
 const previous=global.document;global.document={createElement(){return createCanvas(1,1)}};
 const cases=[[19,0],[19,7],[20,0],[30,0],[35,0]],images={};try{for(const key of [...new Set(Array.from({length:17},(_,i)=>i+19).flatMap(group=>API.assetKeysForEncounter(group)))])images[key]=await loadImage(path.join(__dirname,'..',media[key]));
 for(const entry of global.HapilStoryAssets.entries)for(const material of [entry.projectiles,...Object.values(entry.projectiles.participants||{})])for(const kind of ['orb','blade']){const spec=material[kind];if(!spec)continue;const im=images[spec.key],crop=spec.objectCrop||spec.crop,c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data,alpha=(x,y)=>d[(y*c.width+x)*4+3];
  for(const side of ['left','right','top','bottom']){const len=side==='left'||side==='right'?crop[3]:crop[2];let dense=0;for(let k=0;k<len;k++){const x=side==='left'?crop[0]:side==='right'?crop[0]+crop[2]-1:crop[0]+k,y=side==='top'?crop[1]:side==='bottom'?crop[1]+crop[3]-1:crop[1]+k;dense+=alpha(x,y)>=180;}assert(dense/len<=.75,`${entry.group}/${kind} source crop ${side} edge is${dense/len} opaque: retain the full own object rather than cutting through its release field`);}
 }
 for(const [group,halfLength] of cases){const fx=API.create(images);try{
  for(const r of [3,6])for(const low of [false,true]){
  const c=createCanvas(64,64),ctx=c.getContext('2d');fx.beginFrame();assert(fx.drawBullet(ctx,world(group),{id:7,x:32,y:32,r,halfLength,kind:halfLength?'needle':'orb',age:.25,angle:0,vx:100,vy:0},low));
  const data=ctx.getImageData(0,0,64,64).data;let x0=64,y0=64,x1=-1,y1=-1,opaque=0;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3]>=180){opaque++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  assert(opaque>0);const fill=opaque/((x1-x0+1)*(y1-y0+1)),corners=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([x,y])=>data[(y*64+x)*4+3]);
  assert(fill<=.90,`${group}/${r}/${halfLength}: opaque bbox fill ${fill} exposes an alpha-boosted rectangular crop rather than the authored object`);
  assert(corners.filter(a=>a<180).length>=2,`${group}/${r}/${halfLength}: at least two corners of the source silhouette must remain transparent/translucent, got ${corners}`);
  if(group===20||group===35){let left=0,right=0,top=0,bottom=0;for(let y=y0;y<=y1;y++){left+=data[(y*64+x0)*4+3]>=180;right+=data[(y*64+x1)*4+3]>=180;}for(let x=x0;x<=x1;x++){top+=data[(y0*64+x)*4+3]>=180;bottom+=data[(y1*64+x)*4+3]>=180;}
   const edges=[left/(y1-y0+1),right/(y1-y0+1),top/(x1-x0+1),bottom/(x1-x0+1)];assert(Math.max(...edges)<=.75,`${group}/${r}: a near-solid bbox edge ${edges} exposes a chopped blade/beam card rather than the complete object`);
  }
 }}finally{fx.destroy();}}}finally{global.document=previous;}
});
