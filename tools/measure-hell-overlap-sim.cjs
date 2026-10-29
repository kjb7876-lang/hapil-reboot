'use strict';
// Deterministic CPU simulation observations, not frame-rate/GPU/device tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const core=require('../src/core.js');
const root=path.resolve(__dirname,'..');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
function fixture(index,phase,difficulty,seed=813){
 const initial=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty,seed,runId:'overlap-quantitative-fixture'});
 const s=core.checkpoint(initial);s.phase=phase;
 const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
// Conservative unique 15px grid cells touched by a damage capsule expanded
// by the real player radius. Cell-diagonal padding includes cell interiors
// whose centre alone would miss a thin beam; this is a density estimate.
function occupiedCells(w){
 const occupied=new Set(),cell=15,halfDiag=cell/Math.SQRT2;
 function capsule(ax,ay,bx,by,r){
  const reach=r+halfDiag,x0=Math.max(0,Math.floor((Math.min(ax,bx)-reach)/cell)),x1=Math.min(23,Math.floor((Math.max(ax,bx)+reach)/cell));
  const y0=Math.max(0,Math.floor((Math.min(ay,by)-reach-260)/cell)),y1=Math.min(23,Math.floor((Math.max(ay,by)+reach-260)/cell));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)if(core.geometry.segmentDistanceSquared((cx+.5)*cell,260+(cy+.5)*cell,ax,ay,bx,by)<=reach*reach)occupied.add(cy*24+cx);
 }
 for(const b of w.bullets){const l=b.halfLength||0,dx=Math.cos(b.angle||0)*l,dy=Math.sin(b.angle||0)*l;capsule(b.x-dx,b.y-dy,b.x+dx,b.y+dy,(b.r||0)+w.player.r);}
 for(const h of w.hazards)if(h.phase==='active')capsule(h.x1,h.y1,h.x2,h.y2,h.width/2+w.player.r);
 return occupied.size;
}
function measure(index,difficulty,phase=2,seed=813,ticks=1800){
 const w=fixture(index,phase,difficulty,seed),signatureId=core.CAMPAIGN_SIGNATURES[index].id;
 let emissions=0,releaseFrames=0,speedTotal=0,maxSpeed=0,peakBullets=0,activeBeamFrames=0,beamObjectFrames=0,signatureFrames=0,rotorFrames=0,simultaneousFrames=0,lowerFanSimultaneousFrames=0,firstSimultaneousTick=null,occupiedTotal=0,occupiedSamples=0,maxOccupiedCells=0;
 for(let n=0;n<ticks;n++){
  core.step(w,{});if(w.stage!=='boss')throw Error(`fixture ended ${index}/${difficulty}/${phase}`);
  const fresh=w.bullets.filter(b=>Math.abs(b.age-core.FIXED_DT)<1e-8);emissions+=fresh.length;releaseFrames+=fresh.length>0;
  for(const b of fresh)speedTotal+=Math.hypot(b.vx,b.vy);
  for(const b of w.bullets)maxSpeed=Math.max(maxSpeed,Math.hypot(b.vx,b.vy));
  peakBullets=Math.max(peakBullets,w.bullets.length);
  const beams=w.hazards.filter(h=>h.phase==='active'),signature=w.bullets.some(b=>b.patternId===signatureId),rotor=w.bullets.some(b=>b.patternId==='hell-overlap-rotor-v14'&&b.weaponMotion),fan=w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14');
  activeBeamFrames+=beams.length>0;beamObjectFrames+=beams.length;signatureFrames+=signature;rotorFrames+=rotor;
  if(beams.some(h=>h.patternId==='hell-overlap-lattice-v14')&&signature&&rotor&&fan){simultaneousFrames++;if(firstSimultaneousTick===null)firstSimultaneousTick=w.tick;if(w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14'&&b.y>=450&&b.y<=614))lowerFanSimultaneousFrames++;}
  if(n%6===0){const cells=occupiedCells(w);occupiedTotal+=cells;occupiedSamples++;maxOccupiedCells=Math.max(maxOccupiedCells,cells);}
 }
 return{bossIndex:index,bossId:core.CAMPAIGN_BOSSES[index].id,difficulty,phase,seed,ticks,emittedBullets:emissions,releaseFrames,emissionsPerSecond:+(emissions/(ticks/60)).toFixed(3),meanBirthSpeed:+(speedTotal/Math.max(1,emissions)).toFixed(3),maxObservedSpeed:+maxSpeed.toFixed(3),peakBullets,activeBeamFrames,beamObjectFrames,signatureFrames,rotorFrames,simultaneousFrames,lowerFanSimultaneousFrames,firstSimultaneousTick,occupiedSamples,meanOccupiedCells:+(occupiedTotal/Math.max(1,occupiedSamples)).toFixed(3),maxOccupiedCells,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups};
}
if(require.main===module){
 const codeHashes=Object.fromEntries(['src/core.js','src/weapon-patterns.js'].map(p=>[p,sha(p)])),rows=[];
 for(let index=0;index<core.CAMPAIGN_BOSSES.length;index++)for(const mode of ['normal','hell'])rows.push(measure(index,mode));
 for(const [p,expected] of Object.entries(codeHashes))if(sha(p)!==expected)throw Error('simulation source changed while measuring '+p);
 const comparisons=Array.from({length:core.CAMPAIGN_BOSSES.length},(_,index)=>{const normal=rows.find(r=>r.bossIndex===index&&r.difficulty==='normal'),hell=rows.find(r=>r.bossIndex===index&&r.difficulty==='hell');return{bossIndex:index,bossId:hell.bossId,emissionRatio:+(hell.emittedBullets/normal.emittedBullets).toFixed(3),meanBirthSpeedRatio:+(hell.meanBirthSpeed/normal.meanBirthSpeed).toFixed(3),occupiedCellRatio:+(hell.meanOccupiedCells/normal.meanOccupiedCells).toFixed(3),normalPeak:normal.peakBullets,hellPeak:hell.peakBullets,normalActiveBeamFrames:normal.activeBeamFrames,hellActiveBeamFrames:hell.activeBeamFrames};});
 const report={recordedAt:new Date().toISOString(),codeHashes,scope:'Controlled phase3 CPU simulation for all12bosses, NORMAL versus HELL, fixedseed813,1800ticks30sec each. No player attacks/skills and explicit damage immunity keep the full composition open. This is not natural progression or a performance benchmark.',densityMetric:'Unique conservative15px cells in x0..360,y260..620 intersected by live bullet/activebeam capsules expanded by real player radius. Cell diagonal padding overestimates exact damaged pixels; no warning/fade decoration contributes. Sample every6ticks.',limits:['not-human-input','not-natural-clear','not-frame-rate','not-headless-browser','not-software-GPU','not-hardware-GPU','not-mobile-emulation','not-actual-device'],rows,comparisons};
 const file=path.join(root,'docs/HELL-OVERLAP-SIM-20261029.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,comparisons},null,2));
}
module.exports=Object.freeze({fixture,measure,occupiedCells});
