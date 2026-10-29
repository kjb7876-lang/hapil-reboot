'use strict';
// Native CPU Canvas raster only. Prepared repeated snapshots do not measure
// device frame rate, startup/decode, browser scheduling or GPU completion.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),files=['src/core.js','src/weapon-patterns.js','src/boss-motion.js','src/actors.js','src/projectiles.js','src/boss-skills.js','src/render.js','src/media.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes=()=>Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const initialHashes=hashes(),core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/boss-skills.js');require('../src/render.js');
const raw=fs.readFileSync(path.join(root,'src/media.js'),'utf8'),media=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
function distribution(values){const a=[...values].sort((x,y)=>x-y);return{samples:a.length,p50Ms:+a[Math.floor((a.length-1)*.5)].toFixed(3),p95Ms:+a[Math.floor((a.length-1)*.95)].toFixed(3),maxMs:+a.at(-1).toFixed(3)};}
function observe(index,difficulty){
 const first=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'v15-render-observation'}),s=core.checkpoint(first);s.phase=2;
 const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
 let best=null,bestScore=-1,overlap=null,overlapScore=-1,release=null,releaseScore=-1,overlapFrames=0,lowerOverlapFrames=0;
 for(let t=0;t<1800;t++){
  core.step(w,{});assert.equal(w.stage,'boss');const active=w.hazards.filter(h=>h.phase==='active').length,score=w.bullets.length+active*6;
  if(score>bestScore){bestScore=score;best=structuredClone(w);}
  const layers=w.hazards.some(h=>h.phase==='active'&&h.patternId==='hell-overlap-lattice-v14')&&w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14')&&w.bullets.some(b=>b.patternId===core.CAMPAIGN_SIGNATURES[index].id)&&w.bullets.some(b=>b.patternId==='hell-overlap-rotor-v14'&&b.weaponMotion);
  if(!layers)continue;overlapFrames++;
  if(!w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14'&&b.y>=450&&b.y<=614))continue;lowerOverlapFrames++;
  if(score>overlapScore){overlapScore=score;overlap=structuredClone(w);}
  const hasRecent=Array.isArray(w.boss.skillReleases)&&w.boss.skillReleases.some(e=>w.tick-e.tick>=1&&w.tick-e.tick<25);
  if(hasRecent&&score>releaseScore){releaseScore=score;release=structuredClone(w);}
 }
 assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 if(difficulty==='hell'){assert(overlap&&release,'actual concurrent lower-lane and release snapshots are required');return{snapshots:[['actual-four-layer-overlap',overlap],['actual-overlap-with-source-release',release]],observation:{ticks:1800,peakBullets:w.stats.peakBullets,overlapFrames,lowerOverlapFrames,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups}};}
 return{snapshots:[['normal-observed-peak',best]],observation:{ticks:1800,peakBullets:w.stats.peakBullets,overlapFrames,lowerOverlapFrames,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups}};
}
(async()=>{
 const previous=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 const keys=Object.keys(media).filter(k=>/^(projectile|fxV8|bossMotion|cast|weapon|sin|h14)/.test(k)||['gunner','forest','ruins','cave','fxWindArrow8V6'].includes(k)),images={},sources=[];
 for(const key of keys){const file=path.join(root,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources.push({key,path:media[key],bytes:bytes.length,width:images[key].width,height:images[key].height,sha256:sha(bytes)});}
 const rows=[];
 for(const difficulty of ['normal','hell'])for(let index=0;index<12;index++){
  const observed=observe(index,difficulty);
  for(const [kind,w] of observed.snapshots)for(const low of [false,true]){
   const canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
   try{
    for(let n=0;n<5;n++)renderer.draw(w,0,w.time,low);
    const warmed=renderer.getMetrics(),sceneBuilds=warmed.sceneCacheBuilds,times=[];
    for(let n=0;n<30;n++){const start=performance.now();renderer.draw(w,0,w.time,low);times.push(performance.now()-start);}
    const m=renderer.getMetrics(),p=m.projectilePresentation,a=m.actorPresentation,skills=m.bossSkillsPresentation;
    const beams=w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length,rotors=w.bullets.filter(b=>b.kind==='hell-rotor').length,weapons=w.bullets.filter(b=>b.kind==='boss-weapon').length;
    assert.equal(p.texturedBullets,w.bullets.length);assert.equal(p.assetLaserDraws,beams);assert.equal(p.missingProjectileAssets,0);assert.equal(p.missingOptionalRotorAssets,0);assert.equal(p.missingOptionalBeamAssets,0);
    assert.equal(p.rotorVisualDraws,rotors);assert.equal(p.weaponVisualDraws,weapons);assert.equal(a.bossDraws,1);if(index>=5)assert.equal(a.sinBossDraws,1);
    assert.equal(m.terrainStatus,'hapil1-source-portrait-composite');assert(m.sceneAsset&&m.sceneAsset.startsWith('h14Map'));assert.equal(m.sceneCacheBuilds,sceneBuilds,'static arena may not resample raw maps each draw');
    assert.equal(skills.skillMissingAssets,0);assert(skills.skillSourceDraws<=(low?4:8));assert(p.stampCacheBytes<=4194304);assert(skills.skillCacheBytes<=2097152);
    if(kind==='actual-overlap-with-source-release')assert(skills.skillReleaseDraws+skills.skillLaserDraws>0,'real-source release must be present in its measured release snapshot');
    rows.push({bossIndex:index,bossId:core.CAMPAIGN_BOSSES[index].id,difficulty,case:kind,quality:low?'low':'high',snapshotTick:w.tick,bullets:w.bullets.length,visibleBeams:beams,rotors,weapons,...distribution(times),lastFrame:{sourceBoss:a.lastBossAsset,sourceTerrain:m.sceneAsset,sourceBulletDraws:p.texturedBullets,sourceBeamDraws:p.assetLaserDraws,rotorDraws:p.rotorVisualDraws,weaponDraws:p.weaponVisualDraws,beamOverlayDraws:p.sourceBeamOverlayDraws,skillDraws:skills.skillSourceDraws,skillReleaseDraws:skills.skillReleaseDraws,skillLaserDraws:skills.skillLaserDraws,missingAssets:p.missingProjectileAssets+skills.skillMissingAssets+p.missingOptionalRotorAssets+p.missingOptionalBeamAssets,projectileCacheBytes:p.stampCacheBytes,skillCacheBytes:skills.skillCacheBytes,sceneCacheBytes:m.sceneCacheBytes},observation:observed.observation});
   }finally{renderer.destroy();}
  }
 }
 assert.deepEqual(hashes(),initialHashes,'sources changed during measurement');global.document=previous;
 const report={capturedAt:new Date().toISOString(),toolSHA256:sha(fs.readFileSync(__filename)),codeHashes:initialHashes,host:{cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,node:process.version,platform:process.platform},scope:'Synchronous native CPU Canvas,360x640DPR1. Actual registered H14 terrain, skill, rotor and beam originals plus retained own bodies/materials. Each snapshot has5warmup+30measured static draws. All12NORMAL peaks and all12HELL real four-layer lower-lane overlaps plus contemporaneous source-release snapshots are measured. No threats are inserted for density.',fixture:'Safe phase3 boundaries restore correct Mammon child and Pride cyborg forms. Explicit damage immunity and disabled attacks/skills hold each1800tick observation open. Every measured damage body, active/fading beam, own form, H14map and optional rotor/beam ornament is counted and verified loaded. This is not natural progression.',memoryScope:'All registered input originals are decoded together before timing. Live app selects one encounter group and releases other image references. Network, decode, cold cache creation and actual device memory pressure are not timed.',exclusions:['browser','headless-browser','mobile-emulation','actual-mobile-device','software-GPU','hardware-GPU','human-play','natural-clear','simulation-update-timing','startup-download-and-decode','connected-approach-maptiles'],rows,sources};
 const file=path.join(root,'docs/V15-CPU-20261029.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,rows:rows.length,measuredDraws:rows.length*30,sourceFiles:sources.length,p95Range:[Math.min(...rows.map(r=>r.p95Ms)),Math.max(...rows.map(r=>r.p95Ms))],allMissing:rows.reduce((n,r)=>n+r.lastFrame.missingAssets,0)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
