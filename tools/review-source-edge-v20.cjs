'use strict';
// Native-size source-image A/B review, not a game-play or performance test.
// The baseline is the deployed v19 code, using the same current own-source
// contracts so only the cached edge/render fit differs between the columns.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/v20-pixels');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',root]}));
const files=['src/projectiles.js','src/story-assets.js','src/media.js'],hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hashes=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
const S=require('../src/story-assets.js'),media=require('./read-media-registry.cjs')();require('../src/projectiles.js');
const current=global.HapilProjectiles,previousDocument=global.document;
global.document={createElement:()=>createCanvas(1,1)};
const baselineCommit='079c830e40d607d9944215a107003d66e85367ce';
const baselineSource=cp.execFileSync('git',['show',baselineCommit+':src/projectiles.js'],{cwd:root,encoding:'utf8'});
const old={HapilStoryAssets:S,document:global.document};old.globalThis=old;vm.runInNewContext(baselineSource,old);
const cases=[[19,3,9,null],[23,3.8,0,null],[25,3.8,0,null],[29,3.8,0,null],[31,3,9,null],[31,4,13,null],[34,4,13,'baek-ion'],[35,3.8,0,null]];
(async()=>{try{
 const c=createCanvas(1200,80+cases.length*155),ctx=c.getContext('2d');
 ctx.fillStyle='#111722';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.font='18px sans-serif';
 ctx.fillText('V19 / V20 cached source-alpha edge | actual radii | own scene details | 1x + 4x',16,26);
 ctx.font='13px sans-serif';ctx.fillText('Left: V19 native + 4x. Right: V20 native + 4x. Samples are from each own source painting.',16,48);
 for(let n=0;n<cases.length;n++){
  const[group,r,l,owner]=cases[n],images={};for(const k of S.assetKeysForEncounter(group))images[k]=await loadImage(path.join(root,media[k]));
  const entry=S.lookup(group),bg=images[entry.terrain.key],world={campaign:true,campaignRevision:5,bossIndex:group-1};
  const a=old.HapilProjectiles.create(images),b=current.create(images),y=70+n*155;
  try{
   ctx.fillStyle='#fff';ctx.fillText(`g${group} r${r} l${l} ${owner||entry.id}`,15,y+12);
   for(let sample=0;sample<2;sample++)for(let version=0;version<2;version++){
    const tile=createCanvas(90,70),t=tile.getContext('2d');
    const sx=sample?bg.width*.38:bg.width*.48,sy=sample?bg.height*.76:bg.height*.30;
    t.drawImage(bg,sx,sy,bg.width*.10,bg.height*.11,0,0,90,70);
    (version?b:a).drawBullet(t,world,{id:7,x:45,y:35,r,halfLength:l,kind:l?'blade':'orb',age:.25,angle:Math.PI/2,sourceActorId:owner},false);
    const x=180+version*500+sample*235;ctx.drawImage(tile,x,y+20);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(tile,25,15,40,40,x+95,y+18,140,140);ctx.imageSmoothingEnabled=true;
   }
  }finally{a.destroy();b.destroy();}
 }
 const image=c.toBuffer('image/jpeg');
 for(const f of files)if(hash(fs.readFileSync(path.join(root,f)))!==hashes[f])throw Error('Source changed during A/B review; no output published: '+f);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'source-edge-own-map-ab.jpg'),image);
 fs.writeFileSync(path.join(out,'source-edge-own-map-ab.json'),JSON.stringify({capturedAt:new Date().toISOString(),scope:'CPU native-size source-image A/B, current metadata shared by both renderers, eight actual shapes on two details from their own source paintings; not natural progression, complete scene screenshots, browser, GPU or device measurement',baselineCommit,baselineProjectileSHA256:hash(baselineSource),sourceHashes:hashes,cases:cases.map(([group,r,l,owner])=>({group,r,halfLength:l,sourceActorId:owner})),imageSHA256:hash(image)},null,2)+'\n');
 console.log(path.join(out,'source-edge-own-map-ab.jpg'));
 }finally{global.document=previousDocument;}
})().catch(error=>{console.error(error);process.exitCode=1;});
