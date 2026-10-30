'use strict';
// Independent actual-source fixed-size CPU presentation audit, not gameplay,
// browser/GPU performance or natural-route evidence. No source files are edited.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),files=['src/projectiles.js','src/story-assets.js','src/media.js'],hashes=Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
require('../src/story-assets.js');require('../src/projectiles.js');const API=global.HapilProjectiles,media=require('./read-media-registry.cjs')();
const variants=Array.from({length:17},(_,i)=>({group:i+19,sourceActorId:i+19===34?'han-rian':undefined})).concat({group:34,sourceActorId:'baek-ion'});
const shapes=[{r:3,l:0},{r:6,l:0},{r:3,l:7},{r:6,l:7}];
function metrics(data,r,l){let x0=64,y0=64,x1=-1,y1=-1,opaque=0,core=0,dense=0,outside=0,colors=new Set(),sum=0,sum2=0,n=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,a=data[k+3],dx=x+.5-32,dy=y+.5-32;
  if(a>=180){opaque++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(Math.hypot(dx,dy)<Math.min(2,r*.55)){core++;dense+=a>=180;}
  if(a>=64&&Math.hypot(Math.max(0,Math.abs(dx)-l),dy)>r+.75)outside++;
  if(a>=64)assert(Math.abs(dx)<=l+r+4.75&&Math.abs(dy)<=r+4.75,'cosmetic art exceeds the promised visual margin');
  if(a>=200){colors.add(`${data[k]},${data[k+1]},${data[k+2]}`);const lum=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];sum+=lum;sum2+=lum*lum;n++;}
 }
 let left=0,right=0,top=0,bottom=0;for(let y=y0;y<=y1;y++){left+=data[(y*64+x0)*4+3]>=180;right+=data[(y*64+x1)*4+3]>=180;}for(let x=x0;x<=x1;x++){top+=data[(y0*64+x)*4+3]>=180;bottom+=data[(y1*64+x)*4+3]>=180;}
 return {centralAlpha180Fraction:dense/core,centralSamplePixels:core,outsideHitCapsulePixels:outside,opaqueColors:colors.size,opaqueLuminanceStd:Math.sqrt(Math.max(0,sum2/n-(sum/n)**2)),opaqueBBox:[x0,y0,x1,y1],opaqueBBoxFill:opaque/((x1-x0+1)*(y1-y0+1)),opaqueBBoxCornerAlpha:[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([x,y])=>data[(y*64+x)*4+3]),opaqueBBoxEdgeFill:[left/(y1-y0+1),right/(y1-y0+1),top/(x1-x0+1),bottom/(x1-x0+1)]};
}
async function main(){const previous=global.document;global.document={createElement(){return createCanvas(1,1)}};
 const images={},sources=[];for(const key of [...new Set(variants.flatMap(v=>API.assetKeysForEncounter(v.group)))]){const file=path.join(root,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources.push({key,path:media[key],sha256:sha(bytes),bytes:bytes.length});}
 const sourceObjectBoundaries=[];for(const v of variants){const base=global.HapilStoryAssets.lookup(v.group).projectiles,material=v.sourceActorId&&base.participants&&base.participants[v.sourceActorId]||base;for(const kind of ['orb','blade']){const s=material[kind],im=images[s.key],crop=s.objectCrop||s.crop,c=createCanvas(im.width,im.height),sc=c.getContext('2d');sc.drawImage(im,0,0);const d=sc.getImageData(0,0,c.width,c.height).data,edgeFill=[];
  for(const side of ['left','right','top','bottom']){const n=side==='left'||side==='right'?crop[3]:crop[2];let dense=0;for(let k=0;k<n;k++){const x=side==='left'?crop[0]:side==='right'?crop[0]+crop[2]-1:crop[0]+k,y=side==='top'?crop[1]:side==='bottom'?crop[1]+crop[3]-1:crop[1]+k;dense+=d[(y*c.width+x)*4+3]>=180;}edgeFill.push(dense/n);}assert(Math.max(...edgeFill)<=.75,`${v.group}/${kind}: selected source cuts an opaque object edge`);sourceObjectBoundaries.push({...v,kind,key:s.key,crop,opaqueEdgeFill:edgeFill});
 }}
 const rowH=252,cellW=168,sheet=createCanvas(160+4*cellW,48+variants.length*rowH),ctx=sheet.getContext('2d');ctx.fillStyle='#121722';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.font='13px sans-serif';ctx.fillStyle='#fff';ctx.fillText('ACTUAL 1x + 4x; source-owned new story projectiles; CPU fixed presentation only',8,24);const rows=[];
 try{for(let j=0;j<variants.length;j++){const v=variants[j],fx=API.create(images),y=48+j*rowH;ctx.fillStyle='#e1e6ed';ctx.fillText(`${v.group} ${v.sourceActorId||global.HapilStoryAssets.lookup(v.group).id}`,8,y+18);
  try{for(let i=0;i<shapes.length;i++){const {r,l}=shapes[i],c=createCanvas(64,64),sc=c.getContext('2d'),w={campaign:true,campaignRevision:5,bossIndex:v.group-1},b={id:7,x:32,y:32,r,halfLength:l,kind:l?'needle':'orb',age:.25,angle:0,vx:100,vy:0,sourceActorId:v.sourceActorId};let high,result;
   for(const low of [false,true]){sc.clearRect(0,0,64,64);let draws=0;const guarded=new Proxy(sc,{get(t,key){if(['fill','fillRect','stroke','strokeRect','fillText'].includes(key))return()=>{throw Error('geometric replacement '+key)};const f=t[key];if(key==='drawImage')return(...a)=>{draws++;assert.equal(a.length,5);return f.apply(t,a)};return typeof f==='function'?f.bind(t):f;},set(t,k,value){t[k]=value;return true;}});fx.beginFrame();assert(fx.drawBullet(guarded,w,b,low));assert.equal(draws,1);const data=sc.getImageData(0,0,64,64).data,m=metrics(data,r,l);assert(m.centralAlpha180Fraction>=.8);assert(m.outsideHitCapsulePixels>0);assert(m.opaqueColors>=12);assert(m.opaqueLuminanceStd>=3);if(v.group===19||[20,30,35].includes(v.group)&&!l){assert(m.opaqueBBoxFill<=.90);assert(m.opaqueBBoxCornerAlpha.filter(a=>a<180).length>=2);}if([20,35].includes(v.group)&&!l)assert(Math.max(...m.opaqueBBoxEdgeFill)<=.75);if(low)assert.deepEqual(Buffer.from(data),high);else{high=Buffer.from(data);result=m;}const runtime=fx.getMetrics();assert.equal(runtime.missingProjectileAssets,0);assert(runtime.stampCacheBytes<=4194304);assert(runtime.stampCacheEntries<=96);}
   rows.push({...v,r,halfLength:l,metrics:result});const x=160+i*cellW;ctx.fillStyle='#adb6c3';ctx.fillText(`${l?'needle':'orb'} r${r}${l?' l7':''}`,x,y+14);ctx.drawImage(c,x+48,y+18);ctx.imageSmoothingEnabled=false;ctx.drawImage(c,12,12,40,40,x,y+84,160,160);ctx.imageSmoothingEnabled=true;
  }}finally{fx.destroy();}
 }}finally{global.document=previous;}
 for(const f of files)assert.equal(sha(fs.readFileSync(path.join(root,f))),hashes[f],'production source changed during audit');for(const s of sources)assert.equal(sha(fs.readFileSync(path.join(root,s.path))),s.sha256,'source image changed during audit');
 const dir=path.join(root,'docs/v19-projectile-pixels');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'new-story-contours.jpg'),sheet.toBuffer('image/jpeg'));
 const report={scope:'Actual retained source pixels,72 fixed shapes from17 new encounters plus both cult actors; native CPU Canvas. Each high/low output is byte equal. Not simulation/browser/GPU/mobile/natural play.',codeHashes:hashes,sources,sourceObjectBoundaries,assertions:{centralAlpha180MinimumFraction:.8,opaqueColorsMinimum:12,luminanceStdMinimum:3,affectedGlyphBBoxFillMaximum:.90,affectedGlyphTranslucentBBoxCornersMinimum:2,knightCultOrbOpaqueBBoxEdgeMaximum:.75,selectedSourceOpaqueCropEdgeMaximum:.75,oneLiveImageDraw:true,noGeometricBacking:true},rows};const out=path.join(root,'docs/V19-STORY-PROJECTILE-CONTOURS-20261030.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,codeHashes:hashes,report:out,contact:path.join(dir,'new-story-contours.jpg')},null,2));
}
// Native asynchronous image decoding must finish before an idle event loop can
// exit. A zero-exit process without its final report is never a passing audit.
const keepAlive=setInterval(()=>{},1000);
main().then(()=>clearInterval(keepAlive),e=>{clearInterval(keepAlive);console.error(e.stack||e);process.exitCode=1;});
