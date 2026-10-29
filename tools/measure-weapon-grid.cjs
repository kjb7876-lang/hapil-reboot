'use strict';
// Repeatable native CPU Canvas measurements. This script does not start a
// browser, emulate a phone, measure GPU completion, or play natural progression.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),core=require('../src/core.js');
require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/render.js');
const raw=fs.readFileSync(path.join(root,'src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
function dist(a){const b=[...a].sort((x,y)=>x-y);return{samples:b.length,p50Ms:+b[Math.floor((b.length-1)*.5)].toFixed(3),p95Ms:+b[Math.floor((b.length-1)*.95)].toFixed(3),maxMs:+b[b.length-1].toFixed(3)};}
function phaseWorld(index){const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:813,runId:'cpu-phase-fixture'});w.phase=2;w.phaseTime=0;w.boss.phase=2;w.autoAttack=false;w.skillRotation=false;return w;}
function observedPeak(index){const w=phaseWorld(index);let peak=null,maxCost=-1;for(let n=0;n<1800;n++){const cycle=Math.floor(n/360),target=index===2?(cycle%2?252:108):180+Math.sin(Math.floor(Math.max(0,n-240)/360)*.8)*100;core.step(w,{dx:target-w.player.x,focus:true});const cost=w.bullets.length+w.hazards.length*3;if(cost>maxCost){maxCost=cost;peak=JSON.parse(JSON.stringify(w));}}return{world:peak,phasePeakBullets:w.stats.peakBullets,phaseFixtureHits:w.stats.hits,phaseEndStage:w.stage,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups};}
function saturation(index){const w=phaseWorld(index);w.stage='boss';w.phaseTime=4;w.boss.action='attack';w.boss.actionProgress=.5;w.tick=240;w.time=4;
 w.bullets=Array.from({length:768},(_,i)=>({id:i+1,x:12+i%48*7,y:280+Math.floor(i/48)*19,r:i%3===0?4:3.8,halfLength:i%3===0?13:i%3===1?9:0,kind:i%3===0?'blade':i%3===1?'needle':'orb',angle:Math.PI/2+(i%5-2)*.09,age:.26,vx:0,vy:90,paletteSlot:i%2}));
 w.hazards=Array.from({length:40},(_,i)=>({id:900+i,phase:'active',x1:30,y1:260+i*8,x2:330,y2:260+i*8,width:i%2?6:8,progress:.3,paletteSlot:i%2}));return w;}
(async()=>{
 global.document={createElement(name){if(name!=='canvas')throw new Error('Unexpected element');return createCanvas(1,1);}};
 const keys=Object.keys(media).filter(k=>/^(projectile|fxV8|bossMotion|cast|weapon)/.test(k)||['gunner','forest','ruins','cave','fxWindArrow8V6'].includes(k)),images={},sources=[];
 for(const key of keys){const file=path.join(root,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources.push({key,path:media[key],sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
 const rows=[];
 for(let index=0;index<5;index++){
  const peak=observedPeak(index);
  for(const kind of ['phase-3-observed-peak','synthetic-capacity-saturation'])for(const low of [false,true]){
   const w=kind==='phase-3-observed-peak'?peak.world:saturation(index); if(w.boss){w.boss.action='charge';w.boss.actionProgress=.8;w.boss.weaponTelegraph=true;} for(let j=0;j<2;j++)w.bullets[j]={id:9500+j,kind:'boss-weapon',x:135+j*85,y:425,r:11,halfLength:0,angle:Math.PI/2,spinAngle:.8*j,age:.4,vx:0,vy:90}; const main=createCanvas(360,640);main.style={};const renderer=global.HapilRenderer.create(main,images);renderer.resize(360,640,1);
   for(let i=0;i<5;i++)renderer.draw(w,0,w.time,low);
   const times=[];for(let i=0;i<50;i++){const t=performance.now();renderer.draw(w,0,w.time,low);times.push(performance.now()-t);}
   const metrics=renderer.getMetrics().projectilePresentation;
   rows.push({boss:core.CAMPAIGN_BOSSES[index].id,case:kind,quality:low?'low':'normal',bullets:w.bullets.length,hazards:w.hazards.length,...dist(times),lastFrame:{signatureCastDraws:metrics.signatureCastDraws,weaponVisualDraws:metrics.weaponVisualDraws,weaponTelegraphDraws:metrics.weaponTelegraphDraws,sourceBulletDraws:metrics.texturedBullets,assetLaserDraws:metrics.assetLaserDraws,assetLaserSlices:metrics.assetLaserSlices,cacheEntries:metrics.stampCacheEntries,cacheBytes:metrics.stampCacheBytes,cacheMisses:metrics.stampCacheMisses,missingAssets:metrics.missingProjectileAssets},phaseObservation:{frames:1800,phasePeakBullets:peak.phasePeakBullets,hits:peak.phaseFixtureHits,endStage:peak.phaseEndStage,poolPressure:peak.poolPressure,droppedGroups:peak.droppedGroups}});renderer.destroy();
  }
 }
 const codeHashes=Object.fromEntries(['src/core.js','src/boss-motion.js','src/actors.js','src/projectiles.js','src/render.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const report={capturedAt:new Date().toISOString(),codeHashes,scope:'Native CPU Canvas synchronous raster at 360x640, DPR1. Actual retained Drive projectile, boss, player, and forest/ruins/cave art; connected-maptiles omitted (boss0 uses retained terrain fallback), all current presentation modules. Five warmup and fifty measured draws per case. Render-only fixed snapshots force boss charge and telegraph, and replace two projectiles with boss-weapon sprites; this exercises presentation, not collision or play. All5 raw source PNGs are loaded in this test; live app loads one encounter group at a time.',host:{platform:process.platform,arch:process.arch,node:process.version,cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length},fixture:'Explicit phase-3 practice fixture, normal HP and collision, no autoAttack or skills. Pre-planned moving route uses ordinary focus speed. Observed peak selected over1800 simulationticks; this is not natural progression. Synthetic saturation is impossible density in the observed five specials and deliberately overlaps imagery.',exclusions:['browser','headless-browser','mobile-emulation','actual-mobile','software-GPU','hardware-GPU','natural-campaign-clear','simulation-update-timing'],rows,sources};
 fs.writeFileSync(path.join(root,'docs/WEAPON-GRID-CPU-20261029.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({scope:report.scope,rows:rows.map(({boss,case:kind,quality,bullets,hazards,p50Ms,p95Ms,lastFrame})=>({boss,case:kind,quality,bullets,hazards,p50Ms,p95Ms,lastFrame}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
