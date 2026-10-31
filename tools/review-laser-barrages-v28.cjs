'use strict';
// Actual committed v28 core snapshots, source-only native CPU visual review.
// Explicit immunity, attacks and skills disabled: not natural play or FPS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const a=require('./audit-object-projectiles-v24.cjs'),C=require('../src/core.js');
const {fullPaint}=require('./audit-laser-pixels-v23.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const FILES=['src/core.js','src/boss-lasers-v28.js','src/boss-patterns-v27.js','src/projectiles.js','src/boss-skills.js','src/render.js','src/actors.js'];
const CASES=[
  {index:0,phase:0,label:'Violet / sweep'}, {index:1,phase:1,label:'Horn / stairs'},
  {index:2,phase:2,label:'Balrog / triads'}, {index:3,phase:0,label:'Mask / reflection'},
  {index:4,phase:0,label:'Lucifer / spokes'}, {index:5,phase:0,label:'Sloth / parallel'},
  {index:7,phase:2,label:'Glutton / fork'}, {index:8,phase:0,label:'Lust / piano'},
  {index:11,phase:2,label:'Pride / piano'}, {index:25,phase:1,label:'Neuron / relay'},
  {index:33,phase:2,label:'Circuit / Han Rian',owner:'han-rian'},
  {index:34,phase:0,label:'Final / diagonal'},
  {index:33,phase:2,label:'Circuit / Baek Ion',owner:'baek-ion'}
];
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),json=v=>JSON.parse(JSON.stringify(v));
const hashes=()=>Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(a.ROOT,f)))]));
function groupFor(index){return index>=12?index+1:index;}
function playerLaneLength(h){
  const length=Math.hypot(h.x2-h.x1,h.y2-h.y1),dy=h.y2-h.y1;
  if(Math.abs(dy)<1e-9)return h.y1>=260&&h.y1<=614?length:0;
  const a=(260-h.y1)/dy,b=(614-h.y1)/dy,lo=Math.max(0,Math.min(a,b)),hi=Math.min(1,Math.max(a,b));return Math.max(0,hi-lo)*length;
}
function distance(x,y,h){const dx=h.x2-h.x1,dy=h.y2-h.y1,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-h.x1)*dx+(y-h.y1)*dy)/d)):0;return Math.hypot(x-h.x1-t*dx,y-h.y1-t*dy);}
function materialProbe(box,images,w,selected,low){
  const canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),fx=box.HapilProjectiles.create(images),rows=[];
  const guarded=new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('synthetic active beam filler '+k);};const f=t[k];return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});
  try{for(const h of selected.filter(h=>h.phase==='active')){
    const immutable=JSON.stringify(h);ctx.clearRect(0,0,360,640);fx.beginFrame();assert(fx.drawHazardBody(guarded,w,h,low));assert.equal(JSON.stringify(h),immutable);
    const data=ctx.getImageData(0,0,360,640).data;let interior=0,visible=0,outside=0;
    for(let y=0;y<640;y++)for(let x=0;x<360;x++){const d=distance(x+.5,y+.5,h),alpha=data[(y*360+x)*4+3];if(d<h.width/2-.75){interior++;visible+=alpha>=100;}if(d>h.width/2+1.25&&alpha>1)outside++;}
    const coverage=visible/Math.max(1,interior),m=fx.getMetrics();assert(interior>0);assert(coverage>=.97,'actual committed material coverage '+JSON.stringify({id:h.id,width:h.width,coverage}));assert.equal(outside,0);assert.equal(m.missingProjectileAssets,0);
    rows.push({id:h.id,width:h.width,length:h.length,sourceActorId:h.sourceActorId||null,modelActorId:h.modelActorId||null,paletteSlot:h.paletteSlot||0,interiorSamples:interior,visibleInteriorSamples:visible,interiorAlphaCoverage:coverage,outsideCapsulePixels:outside,sourceKeys:Object.keys(m.beamSourceKeys||{})});
  }}finally{fx.destroy();}return rows;
}
function world(index,phase){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:28,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'v28-native-laser-review'}),boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function collectCase(spec){
  const w=world(spec.index,spec.phase),groups=new Map(),seenOwners=new Set();let best=null,score=-Infinity;
  for(let n=0;n<1600;n++){
    C.step(w,{});assert.equal(w.stage,'boss');
    const byGroup=new Map();for(const h of w.hazards.filter(h=>h.laserBarrage)){
      if(h.sourceActorId)seenOwners.add(h.modelActorId||h.sourceActorId);
      if(spec.owner&&(h.modelActorId||h.sourceActorId)!==spec.owner)continue;
      const hs=byGroup.get(h.v28BarrageId)||[];hs.push(h);byGroup.set(h.v28BarrageId,hs);
    }
    for(const [id,hs]of byGroup){
      let g=groups.get(id);if(!g){g={id,firstActive:Math.min(...hs.map(h=>h.activeAt)),born:Math.min(...hs.map(h=>h.born)),rays:hs.length,warning:null};groups.set(id,g);}
      if(w.tick===g.firstActive-1){assert(hs.every(h=>h.phase==='warning'));g.warning=json(w);}
      if(!g.warning)continue;
      const active=hs.filter(h=>h.phase==='active'),pending=hs.filter(h=>h.phase==='warning'),reflected=hs.filter(h=>h.v28Reflected);
      if(!active.length)continue;
      const lane=active.filter(h=>playerLaneLength(h)>=24),lanePixels=active.reduce((n,h)=>n+playerLaneLength(h),0);
      const now=active.length*10+pending.length*3+lane.length*8+lanePixels/200+reflected.length*.2+hs.length*.01;
      // Prefer a real mixed state that exposes successive locked pulses; the
      // matching earlier warning remains the same actual barrage, not a mock.
      if(now>score){score=now;best={id,born:g.born,firstActive:g.firstActive,warning:g.warning,active:json(w),activeRays:active.length,pendingRays:pending.length,activePlayerLaneRays:lane.length,activePlayerLaneAxisPixels:lanePixels,totalRays:g.rays};}
    }
  }
  assert(best,'no real warning/active pair for '+JSON.stringify(spec));
  return {...best,ownersObserved:[...seenOwners].sort(),barrageStats:json(w.boss.laserBarrageStats||{})};
}
function compact(m){const p=m.projectilePresentation||{},s=m.bossSkillsPresentation||{},actor=m.actorPresentation||{};return {
  activeOrFadingBodies:p.assetLaserDraws||0,missingProjectileAssets:p.missingProjectileAssets||0,missingSkillAssets:s.skillMissingAssets||0,missingCombatCopyAssets:actor.combatCopyMissingAssets||0,
  stampCacheBytes:p.stampCacheBytes||0,stampCacheEntries:p.stampCacheEntries||0,warmStampMisses:p.stampCacheMisses||0,warmBeamBuilds:p.beamFrameCacheBuilds||0,
  skillCacheBytes:s.skillCacheBytes||0,skillCacheEntries:s.skillCacheEntries||0,sourceKeys:Object.keys(p.beamSourceKeys||{}),warningStrokes:m.warningContrastStrokes||0,warningFootprints:m.warningFootprints||[],patternEntryCue:m.patternEntryCue||null};}
function warmed(box,images,w,low){
  const canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images),before=JSON.stringify(w),ctx=canvas.getContext('2d'),texts=[],write=ctx.fillText.bind(ctx);
  ctx.fillText=(text,x,y,...rest)=>{texts.push({text:String(text),x,y});return write(text,x,y,...rest);};
  try{renderer.resize(360,640,1);for(let n=0;n<3;n++){texts.length=0;renderer.draw(w,0,w.time,low);}assert.equal(JSON.stringify(w),before);const m=compact(renderer.getMetrics());
    assert.equal(m.missingProjectileAssets,0);assert.equal(m.missingSkillAssets,0);assert.equal(m.missingCombatCopyAssets,0);assert(m.stampCacheBytes<=4194304&&m.stampCacheEntries<=96);assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);
    assert.equal(m.warningStrokes,w.hazards.filter(h=>h.phase==='warning').length);assert.equal(m.activeOrFadingBodies,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);assert(!texts.some(t=>t.y>=260),'no new lower combat captions');
    return m;
  }finally{renderer.destroy();}
}
function hazardRecord(h){return {...Object.fromEntries(['id','phase','x1','y1','x2','y2','width','angle','length','born','activeAt','fadeAt','expireAt','sourceActorId','modelActorId','sourcePhase','paletteSlot','v28Pattern','v28RayGroup','v28Segment','v28Reflected','chainId'].map(k=>[k,h[k]])),axisInPlayerLanePixels:playerLaneLength(h)};}
function makeSheet(pictures){
  const cellW=180,cellH=346,cols=6,rows=Math.ceil(pictures.length/cols),canvas=createCanvas(cols*cellW,rows*cellH),ctx=canvas.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let n=0;n<pictures.length;n++){const p=pictures[n],x=n%cols*cellW,y=Math.floor(n/cols)*cellH;ctx.drawImage(p.canvas,x,y+26,180,320);ctx.fillStyle='#eee7db';ctx.font='10px Arial';ctx.fillText(p.label,x+4,y+11,172);ctx.fillStyle='#9aa9b8';ctx.font='9px Arial';ctx.fillText('B'+p.index+' P'+(p.phase+1)+' '+p.state+' t'+p.tick,x+4,y+22,172);}
  const bytes=canvas.toBuffer('image/jpeg',{quality:84});assert(bytes.length<=2700000,'one review proof stays below the transfer limit');return {canvas,bytes};
}
async function main(){
  const initial=hashes(),box=a.runtime();box.HapilCore=C;const cache=new Map(),rows=[],pictures=[];
  for(const spec of CASES){
    const collected=collectCase(spec),group=groupFor(spec.index),images=await a.imagesFor(box,group,cache),profile=box.HapilBossLasersV28.profileFor(collected.active),states=[];
    assert(profile,'central runtime loads the production laser module');
    for(const [state,w]of[['warning',collected.warning],['active',collected.active]]){
      const selected=w.hazards.filter(h=>h.laserBarrage&&h.v28BarrageId===collected.id),high=warmed(box,images,w,false),low=warmed(box,images,w,true),painted=fullPaint(box,images,w,false),actualMaterial={high:materialProbe(box,images,w,selected,false),low:materialProbe(box,images,w,selected,true)};
      const before=JSON.stringify(w);states.push({state,tick:w.tick,worldSHA256:sha(before),selectedRays:selected.map(hazardRecord),actualMaterial,current:{bullets:w.bullets.length,hazards:w.hazards.length},high,low});
      pictures.push({index:spec.index,phase:spec.phase,state,tick:w.tick,label:spec.label,canvas:painted.canvas});
    }
    rows.push({...spec,assetGroup:group,profile:profile.id,mode:profile.modes[spec.phase],barrageId:collected.id,born:collected.born,totalRays:collected.totalRays,activeRays:collected.activeRays,pendingRays:collected.pendingRays,activePlayerLaneRays:collected.activePlayerLaneRays,activePlayerLaneAxisPixels:collected.activePlayerLaneAxisPixels,sceneWarnings:collected.activePlayerLaneRays?[]:['Selected actual barrage has no segment axis of at least24px inside y260..614; it does not demonstrate an incoming player-lane attack.'],ownersObserved:collected.ownersObserved,barrageStats:collected.barrageStats,states});
    process.stdout.write(JSON.stringify({index:spec.index,phase:spec.phase,owner:spec.owner||'main',warning:collected.warning.tick,active:collected.active.tick,activeRays:collected.activeRays,pendingRays:collected.pendingRays})+'\n');
  }
  assert.deepEqual(hashes(),initial,'product inputs remained stable during all captures');
  const proof=makeSheet(pictures),file='docs/v28-laser-review/contact.jpg';fs.mkdirSync(path.dirname(path.join(a.ROOT,file)),{recursive:true});fs.writeFileSync(path.join(a.ROOT,file),proof.bytes);
  const quality=rows.flatMap(r=>r.states.flatMap(s=>[s.high,s.low])),material=rows.flatMap(r=>r.states.flatMap(s=>s.actualMaterial.high.concat(s.actualMaterial.low))),report={schema:1,date:'2026-10-31',scope:'Actual combatRevision28 Hell, seed813,12 unique encounter indices plus an extra Baek Ion barrage from the same paired encounter;13 same-barrage warning/active pairs,26 actual snapshots. Native CPU fullPaint, explicit immunity, attacks and skill rotation disabled. Three repeated frames for warm caches. Isolated material probes retain actual selected active ray geometry, width, clock and owner in both qualities. Not natural-health, browser/GPU/mobile/FPS certification.',productSHA256:initial,toolSHA256:sha(fs.readFileSync(__filename)),
    proof:{path:file,width:proof.canvas.width,height:proof.canvas.height,bytes:proof.bytes.length,sha256:sha(proof.bytes)},summary:{bosses:new Set(CASES.map(c=>c.index)).size,barragePairs:rows.length,snapshots:pictures.length,qualityChecks:quality.length,actualMaterialChecks:material.length,minActualInteriorAlphaCoverage:Math.min(...material.map(m=>m.interiorAlphaCoverage)),maxActualOutsideCapsulePixels:Math.max(...material.map(m=>m.outsideCapsulePixels)),missingProjectileAssets:quality.reduce((n,m)=>n+m.missingProjectileAssets,0),missingSkillAssets:quality.reduce((n,m)=>n+m.missingSkillAssets,0),warmStampMisses:quality.reduce((n,m)=>n+m.warmStampMisses,0),warmBeamBuilds:quality.reduce((n,m)=>n+m.warmBeamBuilds,0),maxStampCacheBytes:Math.max(...quality.map(m=>m.stampCacheBytes)),maxSkillCacheBytes:Math.max(...quality.map(m=>m.skillCacheBytes))},visualReview:{status:'pending direct inspection',notes:['A sweep consists of successive immutable ray capsules; an active beam does not follow later player aim.','Reflected paths are two simultaneously announced finite segments with the same activation/fade clock; no new caster is inferred from the elbow.','Low quality keeps every active damage body; only bounded flow and origin cosmetics are reduced.','The separate720-case regression uses synthetic finite geometry with actual owned source material. The actualMaterial rows here instead isolate real committed active rays at their real widths/endpoints.','The inherited thin fitted ordinary projectile whole-hitbox visibility limitation below90% is not repaired or reclassified by this laser-specific review.']},rows};
  fs.writeFileSync(path.join(a.ROOT,'docs/V28-LASER-VISUAL-REVIEW-20261031.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({summary:report.summary,proof:report.proof})+'\n');return report;
}
module.exports={main};if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
