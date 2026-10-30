'use strict';
// Independent CPU geometry audit. Never trusts the game's reported percentages.
// Controlled observation disables outgoing damage and explicitly grants immunity;
// these rows measure live attack geometry, not natural play or mobile FPS.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
function pointSegmentSquared(x,y,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/d)):0;return (x-x1-dx*t)**2+(y-y1-dy*t)**2;}
function raster(w,{step=4,includeWarnings=false,swept=false,playerRadius=0,onlyPattern=null}={}){
 const nx=Math.ceil(360/step),ny=Math.ceil(640/step),map=new Uint8Array(nx*ny),warnings=new Uint8Array(nx*ny);
 function capsule(target,x1,y1,x2,y2,r){
  const loX=Math.max(0,Math.ceil((Math.min(x1,x2)-r)/step-.5)),hiX=Math.min(nx-1,Math.floor((Math.max(x1,x2)+r)/step-.5));
  const loY=Math.max(0,Math.ceil((Math.min(y1,y2)-r)/step-.5)),hiY=Math.min(ny-1,Math.floor((Math.max(y1,y2)+r)/step-.5));
  for(let iy=loY;iy<=hiY;iy++)for(let ix=loX;ix<=hiX;ix++){const i=iy*nx+ix;if(!target[i]&&pointSegmentSquared((ix+.5)*step,(iy+.5)*step,x1,y1,x2,y2)<=r*r)target[i]=1;}
 }
 for(const b of w.bullets){if(onlyPattern&&!onlyPattern(b))continue;const l=b.halfLength||0,ux=Math.cos(b.angle||0)*l,uy=Math.sin(b.angle||0)*l;
  capsule(map,b.x-ux,b.y-uy,b.x+ux,b.y+uy,b.r+playerRadius);
  if(swept){capsule(map,b.px-ux,b.py-uy,b.px+ux,b.py+uy,b.r+playerRadius);capsule(map,b.px-ux,b.py-uy,b.x-ux,b.y-uy,b.r+playerRadius);capsule(map,b.px+ux,b.py+uy,b.x+ux,b.y+uy,b.r+playerRadius);}
 }
 for(const h of w.hazards){if(onlyPattern&&!onlyPattern(h))continue;if(h.phase==='active')capsule(map,h.x1,h.y1,h.x2,h.y2,h.width/2+playerRadius);else if(h.phase==='warning')capsule(warnings,h.x1,h.y1,h.x2,h.y2,h.width/2+playerRadius);}
 let occupied=0,warningOnly=0,legalOccupied=0,legalWarnings=0,legalCount=0;
 for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){const i=iy*nx+ix,x=(ix+.5)*step,y=(iy+.5)*step;occupied+=map[i];warningOnly+=warnings[i]&&!map[i]?1:0;
  if(x>=16&&x<=344&&y>=260&&y<=614){legalCount++;legalOccupied+=map[i];legalWarnings+=warnings[i]&&!map[i]?1:0;}
  if(includeWarnings&&warnings[i])map[i]=1;
 }
 return {step,samples:nx*ny,occupiedSamples:occupied,activeFraction:occupied/(nx*ny),warningOnlyFraction:warningOnly/(nx*ny),legalPlayerRegion:{x:[16,344],y:[260,614],samples:legalCount,activeFraction:legalOccupied/legalCount,warningOnlyFraction:legalWarnings/legalCount},map,nx,ny};
}
// Exact continuous lower bound of actual axis-aligned, full-span capsules.
// Clip each real vertical/horizontal ribbon to the map; coordinate-compress
// their rectangles and union each stripe. No target/profile metadata is read.
// Remaining live bullets/ordinary rays can only add area; the separate raster
// reports their complete union. A diagonal capsule is not approximated here.
function curtainFraction(w){
 const rects=[];
 for(const h of w.hazards){if(h.pressureCurtain!==true||h.phase!=='active')continue;const r=h.width/2;
  if(Math.abs(h.x1-h.x2)<1e-8&&Math.min(h.y1,h.y2)<=0&&Math.max(h.y1,h.y2)>=640)rects.push([Math.max(0,h.x1-r),0,Math.min(360,h.x1+r),640]);
  else if(Math.abs(h.y1-h.y2)<1e-8&&Math.min(h.x1,h.x2)<=0&&Math.max(h.x1,h.x2)>=360)rects.push([0,Math.max(0,h.y1-r),360,Math.min(640,h.y1+r)]);
  else throw Error('Exact curtain proof requires a real full-span axis-aligned capsule');
 }
 const xs=[...new Set([0,360,...rects.flatMap(r=>[r[0],r[2]])])].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){const left=xs[i-1],right=xs[i];if(right<=left)continue;const ys=rects.filter(r=>r[0]<=left&&r[2]>=right).map(r=>[r[1],r[3]]).sort((a,b)=>a[0]-b[0]);let end=0,length=0;for(const [a,b]of ys)if(b>end){length+=b-Math.max(a,end);end=b;}area+=(right-left)*length;}
 return area/(360*640);
}
function summary(values){const sorted=values.slice().sort((a,b)=>a-b);return {samples:values.length,min:sorted[0]||0,p50:sorted[Math.floor((sorted.length-1)*.5)]||0,p95:sorted[Math.floor((sorted.length-1)*.95)]||0,max:sorted.at(-1)||0};}
function phaseWorld(core,bossIndex,phase,difficulty,combatRevision){let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex,combatRevision,difficulty,seed:813,runId:'v21-coverage-'+bossIndex+'-'+phase+'-'+difficulty});const s=core.checkpoint(w);s.phase=phase;w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function inspect({core=require('../src/core.js'),combatRevision=21,phases=[0,1,2],bosses=Array.from({length:35},(_,i)=>i),difficulties=['gentle','normal','hell'],ticks=1440,sampleEvery=12,step=4}={}){
 const rows=[];for(const bossIndex of bosses)for(const difficulty of difficulties)for(const phase of phases){const w=phaseWorld(core,bossIndex,phase,difficulty,combatRevision),all=[],legal=[],plateau=[],plateauLegal=[],exactCurtains=[],profilesObserved=new Set();let best=null;
  for(let n=0;n<ticks;n++){core.step(w,{});if(w.tick%sampleEvery)continue;const m=raster(w,{step}),fraction=m.activeFraction;all.push(fraction);legal.push(m.legalPlayerRegion.activeFraction);
   const activePressure=w.hazards.some(h=>h.phase==='active'&&h.pressureCurtain===true);if(activePressure){plateau.push(fraction);plateauLegal.push(m.legalPlayerRegion.activeFraction);exactCurtains.push(curtainFraction(w));profilesObserved.add(w._pressurePlan.profile);}
   if(!best||fraction>best.activeFraction)best={tick:w.tick,activeFraction:fraction,warningOnlyFraction:m.warningOnlyFraction,legalPlayerRegion:m.legalPlayerRegion,bullets:w.bullets.length,activeLasers:w.hazards.filter(h=>h.phase==='active').length,warningLasers:w.hazards.filter(h=>h.phase==='warning').length};
  }
  rows.push({bossIndex,bossId:core.CAMPAIGN_BOSSES[bossIndex].id,difficulty,phase,combatRevision:w.combatRevision||null,ticks,fullTimeline:summary(all),legalTimeline:summary(legal),newLayerActiveWindow:summary(plateau),legalActiveWindow:summary(plateauLegal),exactCurtainAreaFraction:summary(exactCurtains),activeProfiles:[...profilesObserved].sort(),best,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups});
 }
 return rows;
}
function inspectWaves({core=require('../src/core.js'),combatRevision=21,bosses=Array.from({length:35},(_,i)=>i),difficulties=['gentle','normal','hell'],ticks=1800,sampleEvery=12,step=4}={}){
 const rows=[];for(const bossIndex of bosses)for(const difficulty of difficulties){let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex,combatRevision,difficulty,seed:813,runId:'v21-wave-coverage-'+bossIndex+'-'+difficulty});const s=core.checkpoint(w);s.practiceBoss=false;s.stage='waves';s.wave=0;s.phase=0;w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;const all=[],windows=[],exactCurtains=[],profilesObserved=new Set();let best=null;
  for(let n=0;n<ticks&&w.stage==='waves';n++){core.step(w,{});if(w.stage!=='waves'||w.tick%sampleEvery)continue;const m=raster(w,{step});all.push(m.activeFraction);if(w.hazards.some(h=>h.phase==='active'&&h.pressureCurtain===true)){windows.push(m.activeFraction);exactCurtains.push(curtainFraction(w));profilesObserved.add(w._pressurePlan.profile);}if(!best||m.activeFraction>best.activeFraction)best={tick:w.tick,wave:w.wave,activeFraction:m.activeFraction,legalPlayerRegion:m.legalPlayerRegion,bullets:w.bullets.length,activeLasers:w.hazards.filter(h=>h.phase==='active').length};}
  rows.push({bossIndex,bossId:core.CAMPAIGN_BOSSES[bossIndex].id,difficulty,combatRevision:w.combatRevision||null,ticks:w.tick,fullTimeline:summary(all),newLayerActiveWindow:summary(windows),exactCurtainAreaFraction:summary(exactCurtains),activeProfiles:[...profilesObserved].sort(),best,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups});
 }return rows;
}
function convergence(core,combatRevision=21){
 const rows=[];for(const difficulty of ['gentle','normal','hell'])for(const phase of [0,1,2]){const w=phaseWorld(core,0,phase,difficulty,combatRevision);while(w.tick<240)core.step(w,{});const exact=curtainFraction(w);rows.push({difficulty,phase,profile:w._pressurePlan&&w._pressurePlan.profile,tick:w.tick,actualCurtainCapsules:w.hazards.filter(h=>h.pressureCurtain&&h.phase==='active').length,exactCurtainAreaFraction:exact,sampling:[8,4,2,1].map(step=>{const all=raster(w,{step}),only=raster(w,{step,onlyPattern:h=>h.pressureCurtain===true});return{step,fullUnionFraction:all.activeFraction,curtainSampledFraction:only.activeFraction,curtainAbsoluteError:Math.abs(only.activeFraction-exact)};})});}return rows;
}
function validateReport(report){
 const targets={gentle:.22,normal:.44,hell:.66};
 const exactTarget=(r,wave)=>{const t=targets[r.difficulty]*(wave?.7:1),a=r.exactCurtainAreaFraction;return a.samples>0&&Math.abs(a.min-t)<1e-10&&Math.abs(a.max-t)<1e-10;};
 return {sourceHashGuardPassed:report.sourceHashGuardPassed,allBossExactAreaTargetsPassed:report.rows.every(r=>exactTarget(r,false)),allWaveExactAreaTargetsPassed:!report.waveRows||report.waveRows.every(r=>exactTarget(r,true)),noPoolPressureOrDroppedGroups:report.rows.concat(report.waveRows||[]).every(r=>r.poolPressure===0&&r.droppedGroups===0&&r.peakBullets<=768),allThreeProfilesObservedEachBossPhase:report.rows.every(r=>JSON.stringify(r.activeProfiles)===JSON.stringify(['horizontal','lattice','vertical'])),onePixelGridConvergesWithinOnePercentagePoint:(report.gridConvergence||[]).every(r=>r.sampling.find(s=>s.step===1).curtainAbsoluteError<=.01)};
}
function main(){
 const baseAt=process.argv.indexOf('--core'),coreFile=baseAt>=0?path.resolve(process.argv[baseAt+1]):path.join(ROOT,'src/core.js'),weaponFile=path.join(path.dirname(coreFile),'weapon-patterns.js');
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceHashes=Object.fromEntries([coreFile,weaponFile].map(f=>[path.basename(f),sha(fs.readFileSync(f))])),core=require(coreFile),old=process.argv.includes('--baseline'),quick=process.argv.includes('--quick');
 const rows=inspect({core,combatRevision:old?undefined:21,...quick?{phases:[2],ticks:1440,sampleEvery:24,step:8}:{}});
 const report={schema:1,createdAt:new Date().toISOString(),scope:'Independent CPU raster of real live body/capsule collision geometry; warning area separate; no player-radius inflation; no forecast counted as current danger.',controlledFixture:'Phase is restored through real checkpoint API, outgoing damage and skills off, invulnerableUntil999999. Not natural play.',grid:quick?8:4,sourceHashes,summary:{rows:rows.length,allPeak:summary(rows.map(r=>r.best.activeFraction)),allWindowP50:summary(rows.map(r=>r.newLayerActiveWindow.p50)),poolPressure:rows.reduce((s,r)=>s+r.poolPressure,0),droppedGroups:rows.reduce((s,r)=>s+r.droppedGroups,0)},rows};
 if(process.argv.includes('--waves'))report.waveRows=inspectWaves({core,combatRevision:old?undefined:21,...quick?{ticks:1800,sampleEvery:24,step:8}:{}});
 if(!old)report.gridConvergence=convergence(core);
 report.sourceHashesAfter=Object.fromEntries([coreFile,weaponFile].map(f=>[path.basename(f),sha(fs.readFileSync(f))]));report.sourceHashGuardPassed=JSON.stringify(report.sourceHashesAfter)===JSON.stringify(sourceHashes);
 if(!old)report.validation=validateReport(report);
 const outputAt=process.argv.indexOf('--out'),output=outputAt>=0?path.resolve(process.argv[outputAt+1]):path.join(ROOT,'docs/V21-ATTACK-COVERAGE-20261030.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file:output,summary:report.summary,sourceHashGuardPassed:report.sourceHashGuardPassed}));if(!report.sourceHashGuardPassed||report.validation&&Object.values(report.validation).some(x=>x!==true))process.exitCode=1;
}
if(require.main===module)main();module.exports={pointSegmentSquared,raster,curtainFraction,summary,phaseWorld,inspect,inspectWaves,convergence,validateReport};
