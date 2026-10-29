'use strict';
// Reproducible CPU Canvas raster measurements. No browser/device/GPU claims.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),codeFiles=['src/core.js','src/weapon-patterns.js','src/boss-motion.js','src/actors.js','src/projectiles.js','src/render.js','src/media.js'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hashes=()=>Object.fromEntries(codeFiles.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const initialHashes=hashes(),core=require('../src/core.js');
require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/render.js');
const raw=fs.readFileSync(path.join(root,'src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
function distribution(times){const sorted=[...times].sort((a,b)=>a-b);return{samples:sorted.length,p50Ms:+sorted[Math.floor((sorted.length-1)*.5)].toFixed(3),p95Ms:+sorted[Math.floor((sorted.length-1)*.95)].toFixed(3),maxMs:+sorted.at(-1).toFixed(3)};}
function worldFor(index,difficulty){
 const initial=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'cpu-sins-phase3-fixture'});
 const boundary=core.checkpoint(initial);boundary.phase=2;
 const w=core.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
 return w;
}
function observe(index,difficulty){
 const w=worldFor(index,difficulty);let peak=null,score=-1,activePeak=null,activeScore=-1,maxActive=0;
 for(let tick=0;tick<1800;tick++){
  core.step(w,{});assert.equal(w.stage,'boss');
  const active=w.hazards.filter(h=>h.phase==='active').length,cost=w.bullets.length+active*6+w.hazards.length*2;
  maxActive=Math.max(maxActive,active);
  if(cost>score){score=cost;peak=structuredClone(w);}
  if(active&&cost>activeScore){activeScore=cost;activePeak=structuredClone(w);}
 }
 return{snapshots:[['phase-3-observed-peak',peak]].concat(activePeak?[['phase-3-active-beam-peak',activePeak]]:[]),summary:{ticks:1800,damageImmunity:true,autoAttack:false,skillRotation:false,phasePeakBullets:w.stats.peakBullets,maxActiveBeams:maxActive,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,endingStage:w.stage}};
}
(async()=>{
 const previousDocument=global.document;
 global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 const keys=Object.keys(media).filter(key=>/^(projectile|fxV8|bossMotion|cast|weapon|sin)/.test(key)||['gunner','forest','ruins','cave','fxWindArrow8V6'].includes(key));
 const images={},sources=[];
 for(const key of keys){const file=path.join(root,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources.push({key,path:media[key],bytes:bytes.length,width:images[key].width,height:images[key].height,sha256:sha(bytes)});}
 const rows=[];
 for(const difficulty of ['normal','hell'])for(let index=0;index<core.CAMPAIGN_BOSSES.length;index++){
  const observed=observe(index,difficulty);
  assert.equal(observed.summary.poolPressure,0);assert.equal(observed.summary.droppedGroups,0);
  for(const [kind,world] of observed.snapshots)for(const low of [false,true]){
   const canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
   try{
    for(let warmup=0;warmup<5;warmup++)renderer.draw(world,0,world.time,low);
    const times=[];
    for(let draw=0;draw<30;draw++){const start=performance.now();renderer.draw(world,0,world.time,low);times.push(performance.now()-start);}
    const metrics=renderer.getMetrics(),p=metrics.projectilePresentation,a=metrics.actorPresentation;
    const active=world.hazards.filter(h=>h.phase==='active').length,visibleBeams=world.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length;
    assert.equal(p.missingProjectileAssets,0,`missing damage source for ${index}/${difficulty}/${kind}`);
    assert.equal(p.texturedBullets,world.bullets.length,'all observed live bullets must be source-painted');
    assert.equal(p.assetLaserDraws,visibleBeams,'all active or fading observed beams must be source-painted');
    assert.equal(a.bossDraws,1,'observed own boss art must be drawn');
    if(index>=5)assert.equal(a.sinBossDraws,1,'source-backed seven-sin form required');
    rows.push({bossIndex:index,bossId:core.CAMPAIGN_BOSSES[index].id,difficulty,case:kind,quality:low?'low':'high',snapshotTick:world.tick,bullets:world.bullets.length,hazards:world.hazards.length,activeBeams:active,visibleBeams:visibleBeams,...distribution(times),lastFrame:{bossArt:metrics.bossArt,bossDraws:a.bossDraws,sinBossDraws:a.sinBossDraws,sourceBossKey:a.lastBossAsset,sourceBulletDraws:p.texturedBullets,sourceBeamDraws:p.assetLaserDraws,missingAssets:p.missingProjectileAssets,cacheBytes:p.stampCacheBytes,cacheEntries:p.stampCacheEntries,atlasFxDraws:metrics.atlasFxDraws,wrathManifestDraws:a.wrathManifestDraws||0,wrathManifest:a.lastWrathManifest||null},phaseObservation:observed.summary});
   }finally{renderer.destroy();}
  }
 }
 assert.deepEqual(hashes(),initialHashes,'presentation/simulation sources changed during the measurement; rerun');
 global.document=previousDocument;
 const report={capturedAt:new Date().toISOString(),toolSHA256:sha(fs.readFileSync(__filename)),codeHashes:initialHashes,host:{platform:process.platform,arch:process.arch,node:process.version,cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length},scope:'Native synchronous CPU Canvas raster at360x640 DPR1. Actual retained boss, projectile, weapon, player, forest, ruins and cave sources are decoded before timing. All12 bosses are observed in NORMAL and HELL phase3; each peak snapshot receives5 warmup draws and30 measured draws in both qualities. Actual map02/map05/connected tile images are absent from this local thin checkout and are not loaded. The source-backed sin neutral floor uses retained cave art. Every measured live bullet, active beam and own boss form is verified painted with zero missing-source reports.',fixture:'Controlled phase3 safe-boundary fixtures have explicit damage immunity and disabled autoattack/skills to hold each attack open. Capture1800 simulation ticks at stationary player position; rank snapshots by bullets+6*activeBeams+2*hazards, then additionally capture active-beam peak when present. No synthetic bullets/beams/weapon pairs are inserted into snapshots. This measures repeated static rendering, not natural play or simulation update timing.',memoryScope:'This measurement decodes all source images together; live application loads one encounter group at a time. Initial network, PNG decode, cold cache allocation and real-device memory pressure are outside the timed interval.',exclusions:['browser','headless-browser','mobile-emulation','actual-mobile-device','software-GPU','hardware-GPU','human-play','natural-campaign-clear','simulation-update-timing','image-load-and-decode-timing','connected-maptiles'],rows,sources};
 const file=path.join(root,'docs/SINS-HELL-CPU-20261029.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({file,rows:rows.length,measuredDraws:rows.length*30,sourceFiles:sources.length,p95RangeMs:[Math.min(...rows.map(r=>r.p95Ms)),Math.max(...rows.map(r=>r.p95Ms))],allMissingSources:rows.reduce((n,r)=>n+r.lastFrame.missingAssets,0)},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
