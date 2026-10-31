'use strict';
// Actual immune core observations and native CPU source-image review. Fixed
// frames measure cache reuse, never GPU completion, natural play or phone FPS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const a=require('./audit-object-projectiles-v24.cjs');
const {fullPaint}=require('./audit-laser-pixels-v23.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const BOSS_INDICES=[0,1,3,4,5,6,7,8,9,11,25,34],TICK=580;
const LABELS={0:'Violet',1:'Horn',3:'Mask',4:'Lucifer',5:'Sloth',6:'Envy',7:'Glutton',8:'Lust',9:'Mammon',11:'Pride',25:'Neuron',34:'Final authority'};
const FILES=['src/core.js','src/boss-patterns-v27.js','src/projectiles.js','src/boss-skills.js','src/actors.js','src/render.js'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashes=()=>Object.fromEntries(FILES.map(file=>[file,sha(fs.readFileSync(path.join(a.ROOT,file)))]));
function world(box,bossIndex,phase){
  const C=box.HapilCore,initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:27,practiceBoss:true,bossIndex,difficulty:'hell',seed:813,runId:'v27-visual-source-review'});
  const boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function observe(box,w){
  const tracked=new Set(),motions={},radii=new Set(),paused=new Set(),turned=new Set(),reflected=new Set(),splitParents=new Set(),children=new Set(),lanes=new Set();
  let peakBullets=0,peakHazards=0,identityWarnings=0,lastWarnings=new Set();
  while(w.tick<TICK){
    box.HapilCore.step(w,{});assert.equal(w.stage,'boss','immune observation remains in the selected phase');
    peakBullets=Math.max(peakBullets,w.bullets.length);peakHazards=Math.max(peakHazards,w.hazards.length);
    for(const c of w.boss.identityCasts||[])if(!lastWarnings.has(c.id)){lastWarnings.add(c.id);identityWarnings++;}
    for(const b of w.bullets){
      if(!b.v27Motion)continue;
      if(!tracked.has(b.id)){tracked.add(b.id);motions[b.v27Motion]=(motions[b.v27Motion]||0)+1;}
      radii.add(Math.round(b.r*1000)/1000);
      const age=Number.isFinite(b.v27Age)?b.v27Age:b.age;
      if(b.pauseUntil&&age>=b.pauseFrom&&age<b.pauseUntil)paused.add(b.id);
      if(b.v27TurnRate)turned.add(b.id);
      if(b.v27Reflections>0)reflected.add(b.id);
      if(b.v27Child){children.add(b.id);if(b.v27ParentId!=null)splitParents.add(b.v27ParentId);}
      if(Number.isInteger(b.v27LaneIndex))lanes.add(b.v27LaneIndex);
    }
  }
  return {ticks:TICK,peakBullets,peakHazards,identityWarnings,uniquePatternBullets:tracked.size,motions,radii:[...radii].sort((a,b)=>a-b),observedPaused:paused.size,turning:turned.size,wallReflections:reflected.size,splitParents:splitParents.size,splitChildren:children.size,pianoLanes:[...lanes].sort((a,b)=>a-b)};
}
function compact(m){
  const p=m.projectilePresentation||{},s=m.bossSkillsPresentation||{},actor=m.actorPresentation||{};
  return {bulletsDrawn:p.stampDraws||0,missingProjectileAssets:p.missingProjectileAssets||0,missingSkillAssets:s.skillMissingAssets||0,missingCombatCopyAssets:actor.combatCopyMissingAssets||0,
    stampCacheBytes:p.stampCacheBytes||0,stampCacheEntries:p.stampCacheEntries||0,warmStampMisses:p.stampCacheMisses||0,warmBeamBuilds:p.beamFrameCacheBuilds||0,
    skillCacheBytes:s.skillCacheBytes||0,skillCacheEntries:s.skillCacheEntries||0,skillDraws:s.skillSourceDraws||0,skillDrawLimit:s.skillDrawLimit||0,
    sourceKeys:Object.keys(p.compactFamilies||{}),skillSources:Object.keys(s.sourceKeys||{}),patternEntryCue:m.patternEntryCue||null};
}
function warmed(box,images,w,low){
  const c=createCanvas(360,640);c.style={};const r=box.HapilRenderer.create(c,images),before=JSON.stringify(w);
  // The first bullet pass establishes its encounter group after early source
  // cues, so a second pass may finish warming the beam cache. Observe the
  // third complete repeated frame, rather than call that startup work churn.
  try{r.resize(360,640,1);for(let n=0;n<3;n++)r.draw(w,0,w.time,low);const m=compact(r.getMetrics());assert.equal(JSON.stringify(w),before,'the complete renderer cannot change the simulation');
    assert.equal(m.missingProjectileAssets,0);assert.equal(m.missingSkillAssets,0);assert.equal(m.missingCombatCopyAssets,0);
    assert(m.stampCacheBytes<=4194304&&m.stampCacheEntries<=96);assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);assert(m.skillDraws<=(low?4:8));
    return m;
  }finally{r.destroy();}
}
function sheet(pictures){
  const cellW=180,cellH=346,c=createCanvas(1080,cellH*4),ctx=c.getContext('2d');
  ctx.fillStyle='#111722';ctx.fillRect(0,0,c.width,c.height);
  for(let n=0;n<pictures.length;n++){
    const p=pictures[n],x=n%6*cellW,y=Math.floor(n/6)*cellH;
    ctx.drawImage(p.canvas,x,y+26,180,320);
    ctx.fillStyle='#eee7db';ctx.font='10px Arial';ctx.fillText(p.label,x+5,y+11,170);
    ctx.fillStyle='#9aa9b8';ctx.font='9px Arial';ctx.fillText('B'+p.bossIndex+' · P'+(p.phase+1)+' · tick '+TICK+' · '+p.bullets+' shots',x+5,y+22,170);
  }
  let bytes=c.toBuffer('image/jpeg',{quality:84});if(bytes.length>2700000)bytes=c.toBuffer('image/jpeg',{quality:72});
  assert(bytes.length<=2700000,'review JPEG remains within the user transfer limit');
  return {canvas:c,bytes};
}
async function main(){
  const initial=hashes(),box=a.runtime(),cache=new Map(),rows=[],pictures=[];
  assert(box.HapilBossPatternsV27,'central runtime loads the production pattern module before the core');
  for(const bossIndex of BOSS_INDICES){
    const group=bossIndex>=12?bossIndex+1:bossIndex,images=await a.imagesFor(box,group,cache);
    assert.equal(box.HapilProjectiles.invalidAssetForEncounter(images,group),null);
    for(const phase of[0,2]){
      const w=world(box,bossIndex,phase),observed=observe(box,w),captured=fullPaint(box,images,w,false),profile=box.HapilBossPatternsV27.profileFor(w);
      const high=warmed(box,images,w,false),low=warmed(box,images,w,true);
      const modes={};for(const b of w.bullets)if(b.v27Motion)modes[b.v27Motion]=(modes[b.v27Motion]||0)+1;
      rows.push({bossIndex,assetGroup:group,name:w.bossName,phase,tick:w.tick,profile:profile.id,phaseMotion:profile.modes[phase],worldSHA256:sha(JSON.stringify(w)),current:{bullets:w.bullets.length,hazards:w.hazards.length,motions:modes},observation:observed,high,low});
      pictures.push({bossIndex,phase,label:LABELS[bossIndex],bullets:w.bullets.length,canvas:captured.canvas});
      process.stdout.write(JSON.stringify({bossIndex,phase,tick:w.tick,bullets:w.bullets.length,missing:high.missingProjectileAssets+low.missingProjectileAssets,warmMisses:high.warmStampMisses+low.warmStampMisses})+'\n');
    }
  }
  assert.deepEqual(hashes(),initial,'product source did not change during visual capture');
  const rendered=sheet(pictures),file='docs/v27-pattern-review/contact.jpg',absolute=path.join(a.ROOT,file);fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,rendered.bytes);
  const qualityRows=rows.flatMap(r=>[r.high,r.low]);
  const report={schema:1,date:'2026-10-31',scope:'Actual combatRevision27, Hell, phases0/2, seed813,24 immune tick580 snapshots; player attacks and skill rotation disabled. Native CPU source-only fullPaint images and repeated fixed-frame caches. Not human play, natural health, real browser/GPU/mobile FPS.',productSHA256:initial,toolSHA256:sha(fs.readFileSync(__filename)),
    proof:{path:file,width:rendered.canvas.width,height:rendered.canvas.height,bytes:rendered.bytes.length,sha256:sha(rendered.bytes)},
    summary:{bosses:BOSS_INDICES.length,actualWorlds:rows.length,qualityChecks:qualityRows.length,missingProjectileAssets:qualityRows.reduce((n,r)=>n+r.missingProjectileAssets,0),missingSkillAssets:qualityRows.reduce((n,r)=>n+r.missingSkillAssets,0),warmStampMisses:qualityRows.reduce((n,r)=>n+r.warmStampMisses,0),warmBeamBuilds:qualityRows.reduce((n,r)=>n+r.warmBeamBuilds,0),maxStampCacheBytes:Math.max(...qualityRows.map(r=>r.stampCacheBytes)),maxSkillCacheBytes:Math.max(...qualityRows.map(r=>r.skillCacheBytes))},
    visualReview:{status:'pending direct inspection',notes:['This static sheet verifies appearance at a shared clock. Pauses, curved travel, one-wall reflection and daughter splits require the separately reported observed trajectories or a moving preview.','The retained props show owner identity; the change does not author new animation frames or unique motion icons.']},rows};
  fs.writeFileSync(path.join(a.ROOT,'docs/V27-VISUAL-REVIEW-20261031.json'),JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({proof:report.proof,summary:report.summary})+'\n');return report;
}
module.exports={main};if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
