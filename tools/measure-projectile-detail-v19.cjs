'use strict';
// Actual source pixels and actual projectile API, native CPU Canvas only.
// Fixed presentation fixtures compare v18 to the candidate; no simulation,
// natural play, browser, GPU or mobile-performance result is implied.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),baseline='878419a75189ea82db21ae4b696a150d4280b354',target=path.join(root,'src/projectiles.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function api(source,story){const window={document:{createElement(){return createCanvas(1,1)}}};const scope={window};if(story)vm.runInNewContext(story,scope);vm.runInNewContext(source,scope);return window.HapilProjectiles;}
function world(group){return group===12?{campaign:true,bossIndex:11,finalPractice:true,time:.25,tick:15}:group>=13?{campaign:true,campaignRevision:4,bossIndex:group-1,time:.25,tick:15}:{campaign:true,campaignRevision:3,bossIndex:group,time:.25,tick:15};}
const cases=[{label:'orb r3',r:3,l:0},{label:'orb r6',r:6,l:0},{label:'needle r3 l7',r:3,l:7},{label:'needle r6 l7',r:6,l:7}];
const names=['violet','horn','balrog','mask','lucifer','belphegor','leviathan','beelzebub','asmodeus','mammon','wrath','pride','cult practice','controller army','controller rescue','controller veto','controller authority','controller migration','memory gate'];
function inspect(data,r,l){let visible=0,outside=0,core=0,coreVisible=0,colors=new Set(),sum=0,sum2=0,n=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,a=data[i+3],dx=x+.5-32,dy=y+.5-32,d=Math.hypot(Math.max(0,Math.abs(dx)-l),dy);
  if(a>=32)visible++;if(a>=64&&d>r+.75)outside++;
  if(Math.hypot(dx,dy)<Math.min(2,r*.55)){core++;coreVisible+=a>=200;}
  if(a>=200){colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];sum+=lum;sum2+=lum*lum;n++;}
 }
 return {visiblePixels:visible,outsideOriginalHitCapsulePixels:outside,centralCorePixels:core,centralCoreVisibleFraction:coreVisible/Math.max(1,core),opaqueRGBColors:colors.size,opaqueLuminanceStd:n?Math.sqrt(Math.max(0,sum2/n-(sum/n)**2)):0};
}
async function main(){const beforeSource=cp.execFileSync('git',['show',`${baseline}:src/projectiles.js`],{cwd:root,encoding:'utf8'}),afterSource=fs.readFileSync(target,'utf8'),storyFile=path.join(root,'src/story-assets.js'),story=fs.existsSync(storyFile)?fs.readFileSync(storyFile,'utf8'):'';
 const before=api(beforeSource),after=api(afterSource,story),scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/media.js'),'utf8'),scope);const media=scope.window.HapilMedia;
 const keys=new Set();for(let group=0;group<19;group++)for(const a of [before,after])for(const key of a.assetKeysForEncounter(group).concat(a.optionalAssetKeysForEncounter(group)))keys.add(key);
 const images={},sources=[];for(const key of keys){if(!media[key])throw Error('Unregistered source '+key);const file=path.join(root,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources.push({key,path:media[key],bytes:bytes.length,sha256:sha(bytes),dimensions:[images[key].width,images[key].height]});}
 const cellW=168,rowH=252,width=140+cellW*8,contact=createCanvas(width,48+19*rowH),ctx=contact.getContext('2d');ctx.fillStyle='#121722';ctx.fillRect(0,0,contact.width,contact.height);ctx.font='13px sans-serif';ctx.fillStyle='#fff';ctx.fillText('ACTUAL 1x + 4x pixel view | v18 BEFORE',12,22);ctx.fillText('v19 CANDIDATE',140+cellW*4,22);
 const rows=[];for(let group=0;group<19;group++){const y=48+group*rowH;ctx.fillStyle='#e0e3e8';ctx.fillText(`${group}: ${names[group]}`,8,y+18);const apis=[before,after];
  for(let side=0;side<2;side++){const fx=apis[side].create(images);try{for(let k=0;k<cases.length;k++){const c=cases[k],s=createCanvas(64,64),sc=s.getContext('2d'),w=world(group),b={id:7,x:32,y:32,r:c.r,halfLength:c.l,kind:c.l?'needle':'orb',angle:0,age:.25,vx:100,vy:0};fx.beginFrame();let draws=0;const noGeometry=new Proxy(sc,{get(t,key){if(['fill','fillRect','stroke','strokeRect','fillText'].includes(key))return()=>{throw Error('Procedural body '+key)};const f=t[key];if(key==='drawImage')return(...a)=>{draws++;return f.apply(t,a)};return typeof f==='function'?f.bind(t):f;},set(t,key,value){t[key]=value;return true;}});
     if(!fx.drawBullet(noGeometry,w,b,false))throw Error('Missing source '+group);const m=fx.getMetrics(),pixels=sc.getImageData(0,0,64,64).data,row={group,id:names[group],version:side?'candidate':'baseline',case:c.label,r:c.r,halfLength:c.l,draws,metrics:inspect(pixels,c.r,c.l),cacheBytes:m.stampCacheBytes,missing:m.missingProjectileAssets};rows.push(row);
     const x=140+(side*4+k)*cellW;ctx.fillStyle='#a6afbc';ctx.fillText(c.label,x,y+14);ctx.drawImage(s,0,0,64,64,x+48,y+18,64,64);ctx.imageSmoothingEnabled=false;ctx.drawImage(s,12,12,40,40,x,y+84,160,160);ctx.imageSmoothingEnabled=true;
   }}finally{fx.destroy();}}
 }
 const dir=path.join(root,'docs/v19-projectile-pixels');fs.mkdirSync(dir,{recursive:true});const imagePath=path.join(dir,'before-after-contact.jpg');fs.writeFileSync(imagePath,contact.toBuffer('image/jpeg'));
 if(sha(fs.readFileSync(target))!==sha(Buffer.from(afterSource)))throw Error('Projectile source changed during measurement');if(story&&sha(fs.readFileSync(storyFile))!==sha(Buffer.from(story)))throw Error('Story asset table changed during measurement');const report={scope:'Actual source images and projectile APIs on native CPU Canvas. Fixed r3/r6 orb and needle presentation fixtures, 19 historical asset groups, one live draw per bullet; not timing/GPU/mobile/natural gameplay.',baselineCommit:baseline,baselineProjectileSHA256:sha(Buffer.from(beforeSource)),candidateProjectileSHA256:sha(Buffer.from(afterSource)),candidateStoryAssetsSHA256:story?sha(Buffer.from(story)):null,sources,rows};const reportPath=path.join(root,'docs/V19-PROJECTILE-PIXELS-20261030.json');fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,report:reportPath,contact:imagePath,candidateProjectileSHA256:report.candidateProjectileSHA256},null,2));
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
