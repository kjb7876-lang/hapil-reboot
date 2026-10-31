'use strict';
// Independent native CPU verification. Immune observation, ordinary-health
// input attempts and browser/device checks are deliberately separate scopes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const v24=require('./audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',v24.ROOT]}));
const ROOT=v24.ROOT,BASE='ef95fc227506162b5203092da9e1734e2f43ef58';
const FILES=['src/core.js','src/weapon-patterns.js','src/projectiles.js','src/boss-skills.js','src/media.js','src/story-assets.js','src/actors.js','src/render.js','src/app.js','src/storage.js'];
const sha=v24.sha,source=v24.source,runtime=v24.runtime;
function hashes(){return Object.fromEntries(FILES.map(f=>[f,sha(source(f))]));}
function assetGroup(bossIndex){return bossIndex>=12?bossIndex+1:bossIndex;}
function practice(box,bossIndex,phase,difficulty,combatRevision,{immune=true,finalPractice=false}={}){
  const core=box.HapilCore;
  let w=core.createRun({campaign:true,campaignRevision:finalPractice?3:5,practiceBoss:true,bossIndex,finalPractice,difficulty,combatRevision,seed:813,runId:`v25-independent-${bossIndex}-${phase}-${difficulty}`});
  const snap=core.checkpoint(w);snap.phase=phase;w=core.restoreCheckpoint(snap);
  assert(w&&w.stage==='boss'&&w.phase===phase,'real product checkpoint phase entry');
  if(immune){w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;}
  else {assert.equal(w.player.invulnerableUntil,0);assert(w.autoAttack&&w.skillRotation);assert.equal(w.player.hp,w.player.maxHp);}
  return w;
}
function routeKey(b){return JSON.stringify([b.kind,b.r,b.halfLength||0,b.sourceActorId||'',b.modelActorId||'',b.patternId||'',b.paletteSlot||0,Math.sign(b.spinRate||0),b.identityRole||'',b.identityPatternId||'',b.sourcePhase==null?'':b.sourcePhase]);}
function pointSegmentSquared(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/d)):0;return (x-ax-t*dx)**2+(y-ay-t*dy)**2;}
function segmentsSquared(ax,ay,bx,by,cx,cy,dx,dy){
  const cross=(px,py,qx,qy,rx,ry)=>(qx-px)*(ry-py)-(qy-py)*(rx-px),s1=cross(ax,ay,bx,by,cx,cy),s2=cross(ax,ay,bx,by,dx,dy),s3=cross(cx,cy,dx,dy,ax,ay),s4=cross(cx,cy,dx,dy,bx,by);
  if(s1*s2<=0&&s3*s4<=0&&Math.max(Math.min(ax,bx),Math.min(cx,dx))<=Math.min(Math.max(ax,bx),Math.max(cx,dx))&&Math.max(Math.min(ay,by),Math.min(cy,dy))<=Math.min(Math.max(ay,by),Math.max(cy,dy)))return 0;
  return Math.min(pointSegmentSquared(ax,ay,cx,cy,dx,dy),pointSegmentSquared(bx,by,cx,cy,dx,dy),pointSegmentSquared(cx,cy,ax,ay,bx,by),pointSegmentSquared(dx,dy,ax,ay,bx,by));
}
function lockedCast(c){const out={};for(const k of['id','patternId','identityRole','kind','x','y','angle','warningAt','activeAt','expireAt','sourceActorId','modelActorId','sourcePhase','escapeRoute'])if(c[k]!=null)out[k]=c[k];return JSON.stringify(out);}
function alphaMeasure(painted,b){
  const {data,canvas}=painted,angle=b.angle||0,ca=Math.cos(angle),sa=Math.sin(angle),l=b.halfLength||0,r=b.r;
  let core=0,coreVisible=0,damage=0,damageVisible=0,edges=0,opaque=0,sum=0,sum2=0;
  const colours=new Set();
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=(y*canvas.width+x)*4,a=data[i+3],dx=x+.5-b.x,dy=y+.5-b.y;
    const along=dx*ca+dy*sa,across=-dx*sa+dy*ca;
    if(Math.hypot(dx,dy)<Math.min(2,r*.55)){core++;coreVisible+=a>=180;}
    if(Math.hypot(Math.max(0,Math.abs(along)-l),across)<=r){damage++;damageVisible+=a>=128;}
    if((x===0||y===0||x===canvas.width-1||y===canvas.height-1)&&a>8)edges++;
    if(a>=180){opaque++;const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];sum+=lum;sum2+=lum*lum;colours.add(`${data[i]>>3},${data[i+1]>>3},${data[i+2]>>3}`);}
  }
  return {centralSamples:core,centralVisibleSamples:coreVisible,centralFraction:coreVisible/Math.max(core,1),damageSamples:damage,visibleDamageSamples:damageVisible,fullDamageFraction:damageVisible/Math.max(damage,1),opaquePixels:opaque,quantizedColours:colours.size,opaqueLumaDeviation:Math.sqrt(Math.max(0,sum2/Math.max(1,opaque)-(sum/Math.max(1,opaque))**2)),isolatedClippedEdgePixels:edges};
}
async function imagesFor(box,group,cache=new Map(),prior=null,full=false){
  const images=await v24.imagesFor(box,group,cache,{},prior,!full);
  if(full){
    const keys=new Set(box.HapilBossSkills.optionalAssetKeysForEncounter(group));
    if(prior)prior.HapilBossSkills.optionalAssetKeysForEncounter(group).forEach(k=>keys.add(k));
    const {loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]}));
    for(const k of keys){const file=box.HapilMedia[k]||prior&&prior.HapilMedia[k];assert(file,'unregistered skill image '+k);if(!cache.has(file))cache.set(file,await loadImage(path.join(ROOT,file)));images[k]=cache.get(file);}
  }
  return images;
}
function normaliseVersion(w){const value=JSON.parse(JSON.stringify(w));delete value.combatRevision;if(value._checkpoint)delete value._checkpoint.combatRevision;return value;}
function baselineManifest(){
  const old=runtime(BASE),core=old.HapilCore;
  return {schema:1,baseline:BASE,scope:'Pinned v24 git objects read in this execution environment, not inherited test results.',files:Object.fromEntries(FILES.map(f=>[f,{bytes:source(f,BASE).length,sha256:sha(source(f,BASE))}])),campaignBosses:core.CAMPAIGN_BOSSES.map((b,i)=>({bossIndex:i,assetGroup:assetGroup(i),id:b.id,name:b.name,sceneIds:b.sceneIds||[],phaseRoles:b.phaseRoles||[],protectedTargets:b.protectedTargets||[]})),campaignBossCount:core.CAMPAIGN_BOSSES.length,standaloneCultAssetGroup:12};
}
function legacyTrace(box,old,{bosses=Array.from({length:35},(_,i)=>i),phases=[0,1,2],difficulties=['gentle','normal','hell'],ticks=240}={}){
  const rows=[];
  for(const combatRevision of [undefined,21])for(const bossIndex of bosses)for(const phase of phases)for(const difficulty of difficulties){
    const w=practice(box,bossIndex,phase,difficulty,combatRevision),before=practice(old,bossIndex,phase,difficulty,combatRevision);
    for(let n=0;n<ticks;n++){box.HapilCore.step(w,{});old.HapilCore.step(before,{});if(n%60===0)assert.equal(JSON.stringify(w),JSON.stringify(before),'legacy simulated world changed '+[bossIndex,phase,difficulty,combatRevision,w.tick]);}
    assert.equal(JSON.stringify(w),JSON.stringify(before),'legacy final world changed');
    assert.equal(JSON.stringify(box.HapilCore.checkpoint(w)),JSON.stringify(old.HapilCore.checkpoint(before)),'legacy checkpoint changed');
    rows.push({bossIndex,phase,difficulty,combatRevision:combatRevision||null,ticks,worldSHA256:sha(JSON.stringify(w)),checkpointSHA256:sha(JSON.stringify(box.HapilCore.checkpoint(w))),exact:true});
  }
  return rows;
}
function collectRoutes(box,{bosses=Array.from({length:35},(_,i)=>i),phases=[0,1,2],difficulties=['gentle','normal','hell'],combatRevision=25,ticks=840,standalone=true}={}){
  const rows=[],routes=new Map(),scenes=new Map(),castScenes=new Map(),releaseScenes=new Map(),clocks=[];
  const cases=bosses.map(bossIndex=>({bossIndex,finalPractice:false}));if(standalone)cases.push({bossIndex:11,finalPractice:true});
  for(const {bossIndex,finalPractice}of cases)for(const phase of phases)for(const difficulty of difficulties){
    const group=finalPractice?12:assetGroup(bossIndex),caseKey=[group,phase,difficulty].join('|'),w=practice(box,bossIndex,phase,difficulty,combatRevision,{finalPractice}),seen=new Set(),ids=new Set(),born=new Set(),casts=new Map();
    let identityBullets=0,escapedChecked=0;
    let peakBullets=0,peakHazards=0,firstIdentityTick=null;
    for(let n=0;n<ticks;n++){
      box.HapilCore.step(w,{});assert.equal(w.stage,'boss','immune observation cannot leave selected phase');
      peakBullets=Math.max(peakBullets,w.bullets.length);peakHazards=Math.max(peakHazards,w.hazards.length);
      assert(w.bullets.length<=box.HapilCore.CAPS.bullets&&w.hazards.length<=box.HapilCore.CAPS.hazards);
      assert((w._identityPlans||[]).length<=4);assert((w.boss.identityCasts||[]).length<=8);
      for(const c of w.boss.identityCasts||[]){
        assert(c.activeAt-c.warningAt>=54,'minimum committed warning lead');
        if(!casts.has(c.id)){assert.equal(w.tick,c.warningAt,'first visible warning is not late');casts.set(c.id,{locked:lockedCast(c),cast:JSON.parse(JSON.stringify(c)),emitted:0});}
        else assert.equal(lockedCast(c),casts.get(c.id).locked,'warning position/heading/clock/escape cannot retarget');
        if(c.releaseTick!=null)assert.equal(c.releaseTick,c.activeAt,'no delayed successful release');
      }
      if(!castScenes.has(caseKey)&&w.boss.identityCasts&&w.boss.identityCasts.some(c=>w.tick>=c.warningAt&&w.tick<c.activeAt))castScenes.set(caseKey,{group,bossIndex,phase,difficulty,world:JSON.parse(JSON.stringify(w))});
      for(const b of w.bullets){
        if(!born.has(b.id)){born.add(b.id);if(b.identityCastId){
          const observed=casts.get(b.identityCastId);assert(observed,'real shot has prior visible source warning');assert.equal(w.tick,b.identityActiveAt,'real shot releases on committed active tick');assert.equal(b.identityWarningAt,observed.cast.warningAt);assert.equal(b.identityActiveAt,observed.cast.activeAt);assert.equal(b.identityRole,observed.cast.identityRole);assert.equal(b.sourcePhase,phase,'release pins authored source phase');assert(!b.curveRate,'identity trajectories remain straight after their warning');identityBullets++;observed.emitted++;
          const route=observed.cast.escapeRoute;if(route){const startX=b.px,startY=b.py,endX=startX+Math.cos(b.angle)*1600,endY=startY+Math.sin(b.angle)*1600,inflate=route.halfWidth+b.r+(b.halfLength||0)+3;assert(segmentsSquared(startX,startY,endX,endY,route.x1,route.y1,route.x2,route.y2)>inflate*inflate,'new identity body invades committed player-radius escape route '+[group,phase,difficulty,w.tick]);escapedChecked++;}
        }}
        const route=routeKey(b),key=group+'|'+route;seen.add(key);
        if(b.identityPatternId||/^identity-/.test(b.patternId||'')){ids.add(b.identityPatternId||b.patternId);if(firstIdentityTick===null)firstIdentityTick=w.tick;if(!releaseScenes.has(caseKey))releaseScenes.set(caseKey,{group,bossIndex,phase,difficulty,world:JSON.parse(JSON.stringify(w))});}
        if(!routes.has(key))routes.set(key,{group,first:{bossIndex,phase,difficulty,tick:w.tick,finalPractice},bullet:JSON.parse(JSON.stringify(b)),world:v24.world(group,{phase,tick:w.tick,time:w.time,boss:w.boss?JSON.parse(JSON.stringify(w.boss)):null,combatRevision})});
      }
      if(w.tick===235||(!scenes.has(group)&&firstIdentityTick!==null))scenes.set(group,JSON.parse(JSON.stringify(w)));
    }
    assert.equal(w.stats.poolPressure,0,'pool pressure '+[group,phase,difficulty]);assert.equal(w.stats.droppedGroups,0,'dropped groups '+[group,phase,difficulty]);
    rows.push({bossIndex,group,finalPractice,phase,difficulty,combatRevision,ticks,routeKeys:[...seen],identityPatternIds:[...ids],firstIdentityTick,identityCasts:casts.size,identityBullets,escapeRouteBirthsChecked:escapedChecked,peakBullets,peakHazards,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups});
    clocks.push({group,phase,difficulty,casts:[...casts.values()].map(c=>({...c.cast,emittedBullets:c.emitted}))});
  }
  return {scope:'Actual emitted entities from product checkpoint-selected phases with outgoing damage disabled and explicit immunity. No natural-health claim.',rows,routes:[...routes.values()],scenes,castScenes,releaseScenes,clocks};
}
async function sourcePixels(box,old,collected,{angles=[0,Math.PI/4,Math.PI/2,Math.PI*3/4],qualities=[false,true]}={}){
  const cache=new Map(),rows=[],pictures=[],groupImages=new Map(),newOwnedVariants=new Set();
  for(const route of collected.routes){
    const {group}=route;if(!groupImages.has(group))groupImages.set(group,await imagesFor(box,group,cache,old));const images=groupImages.get(group);
    assert.equal(box.HapilProjectiles.invalidAssetForEncounter(images,group),null,'required projectile assets loaded');
    for(const angle of angles)for(const low of qualities){
      const b={...route.bullet,x:128,y:128,px:128,py:128,angle};if(b.kind==='hell-rotor')b.spinAngle=angle;
      const actual=v24.bulletPaint(box,images,route.world,b,low),prior=v24.bulletPaint(old,images,route.world,b,low),m=alphaMeasure(actual,b),changed=!actual.data.equals(prior.data),owned=actual.metrics.ownedObjectDraws>0;
      assert.equal(actual.metrics.missingProjectileAssets,0);assert.equal(m.isolatedClippedEdgePixels,0,'QA viewport cannot clip object');
      assert(m.centralFraction>=.8,'visible collision centre '+JSON.stringify({group,b,low,m}));
      if(changed&&owned){assert(m.fullDamageFraction>=.9,'new whole object must enclose real full hitbody '+JSON.stringify({group,b,low,m}));assert.equal(actual.draws,1,'no second primitive/composite backing');assert(m.quantizedColours>=12&&m.opaqueLumaDeviation>=3,'source material contrast survives');for(const v of Object.keys(actual.metrics.projectileVariantDraws||{}))newOwnedVariants.add(v);}
      assert(actual.metrics.stampCacheBytes<=4194304&&actual.metrics.stampCacheEntries<=96);
      if(group===8)assert(!changed,'v24 Lust pixel behavior must remain identical');
      const row={group,first:route.first,routeKey:routeKey(route.bullet),angle,quality:low?'low':'high',changed,ownedObject:owned,measurement:m,pixelSHA256:sha(actual.data),variantKeys:Object.keys(actual.metrics.projectileVariantDraws||{}),sourceKeys:Object.keys(actual.metrics.compactFamilies||{})};rows.push(row);
      if(changed&&!low&&angle===0&&!pictures.some(p=>p.group===group))pictures.push({group,name:'g'+group,actual:actual.canvas,baseline:prior.canvas});
    }
  }
  return {rows,pictures,newOwnedVariants:[...newOwnedVariants]};
}
async function ownedRotations(box,old,collected,pixels){
  const selected=new Map(),cache=new Map(),loaded=new Map(),rows=[];
  for(const row of pixels.rows.filter(r=>r.changed&&r.ownedObject&&r.angle===0&&r.quality==='high')){
    const route=collected.routes.find(r=>r.group===row.group&&routeKey(r.bullet)===row.routeKey);assert(route);
    const key=JSON.stringify([row.group,route.bullet.r,route.bullet.halfLength||0,row.variantKeys,route.bullet.sourcePhase,Math.sign(route.bullet.spinRate||0)]);if(!selected.has(key))selected.set(key,route);
  }
  for(const route of selected.values()){
    if(!loaded.has(route.group))loaded.set(route.group,await imagesFor(box,route.group,cache,old));const images=loaded.get(route.group),fx=box.HapilProjectiles.create(images);
    try{for(let n=0;n<9;n++)for(const offset of[0,.25,.5])for(const low of[false,true]){
      const angle=Math.PI*2*n/9,b={...route.bullet,x:128+offset,y:128+offset,px:128+offset,py:128+offset,angle};if(b.kind==='hell-rotor')b.spinAngle=angle;
      const out=v24.bulletPaint(box,images,route.world,b,low,fx),m=alphaMeasure(out,b);assert(out.metrics.ownedObjectDraws>0);assert(m.centralFraction>=.8,'rotating owned center '+JSON.stringify({group:route.group,b,low,m}));assert(m.fullDamageFraction>=.9,'rotating complete real damage body '+JSON.stringify({group:route.group,b,low,m}));assert.equal(m.isolatedClippedEdgePixels,0);assert.equal(out.draws,1);assert(out.metrics.maxOwnedObjectPixels<=(b.r>6?100:48)+.01);
      rows.push({group:route.group,sourcePhase:b.sourcePhase,kind:b.kind,r:b.r,halfLength:b.halfLength||0,angle,offset,quality:low?'low':'high',variants:Object.keys(out.metrics.projectileVariantDraws||{}),measurement:m,maxOwnedObjectPixels:out.metrics.maxOwnedObjectPixels,pixelSHA256:sha(out.data)});
    }}finally{fx.destroy();}
  }
  return rows;
}
function lustPhysics(box,old,{ticks=840}={}){
  const rows=[];for(const phase of[0,1,2])for(const difficulty of['gentle','normal','hell']){
    const w=practice(box,8,phase,difficulty,25),prior=practice(old,8,phase,difficulty,21);
    for(let t=0;t<ticks;t++){box.HapilCore.step(w,{});old.HapilCore.step(prior,{});if(t%30===0||t===ticks-1)assert.deepEqual(normaliseVersion(w),normaliseVersion(prior),'v24 Lust physical behavior changed '+[phase,difficulty,t]);}
    assert.deepEqual(normaliseVersion(box.HapilCore.checkpoint(w)),normaliseVersion(old.HapilCore.checkpoint(prior)));
    rows.push({phase,difficulty,ticks,normalisedWorldSHA256:sha(JSON.stringify(normaliseVersion(w))),normalisedCheckpointSHA256:sha(JSON.stringify(normaliseVersion(box.HapilCore.checkpoint(w))))});
  }return rows;
}
function checkpointDeterminism(box,{bosses=[0,5,6,7,9,11,12,18,21,26,29,32,33,34],combatRevision=25,ticks=720}={}){
  const rows=[];
  for(const bossIndex of bosses)for(const difficulty of ['gentle','normal','hell'])for(const phase of[0,1,2]){
    const a=practice(box,bossIndex,phase,difficulty,combatRevision),snap=box.HapilCore.checkpoint(a),b=box.HapilCore.restoreCheckpoint(snap);b.autoAttack=false;b.skillRotation=false;b.player.invulnerableUntil=999999;
    assert.equal(JSON.stringify(a),JSON.stringify(b),'same boundary checkpoint initialization');
    for(let t=0;t<ticks;t++){const d={dx:t%120<60?1:-1,dy:t%180<90?-.5:.5};box.HapilCore.step(a,d);box.HapilCore.step(b,d);if(t%30===0||t===ticks-1)assert.equal(JSON.stringify(a),JSON.stringify(b),'deterministic legal input route '+[bossIndex,phase,difficulty,t]);}
    const checkpoint=box.HapilCore.checkpoint(a);assert.equal(checkpoint.combatRevision,combatRevision);assert.equal(JSON.stringify(checkpoint),JSON.stringify(box.HapilCore.checkpoint(b)));
    rows.push({bossIndex,phase,difficulty,ticks,worldSHA256:sha(JSON.stringify(a)),checkpointSHA256:sha(JSON.stringify(checkpoint))});
  }
  return rows;
}
function writeReport(file,value){const p=path.join(ROOT,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');return {path:file,sha256:sha(source(file)),bytes:source(file).length};}
function imageOnlyContext(ctx,counter){return new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('primitive skill replacement '+k);};const f=t[k];if(k==='drawImage')return(...args)=>{counter.draws++;return f.apply(t,args);};return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});}
async function skillFrames(box,collected){
  const cache=new Map(),loaded=new Map(),rows=[],pictures=[];
  for(const [kind,values]of [['warning',collected.castScenes],['release',collected.releaseScenes]])for(const record of values.values()){
    const {group,world:w}=record;if(!loaded.has(group))loaded.set(group,await imagesFor(box,group,cache,null,true));
    for(const low of[false,true]){
      const c=createCanvas(360,240),ctx=c.getContext('2d'),counter={draws:0},fx=box.HapilBossSkills.create(loaded.get(group)),before=JSON.stringify(w);
      try{fx.beginFrame();fx.draw(imageOnlyContext(ctx,counter),w,low);assert.equal(JSON.stringify(w),before,'skill cues cannot mutate combat');const m=fx.getMetrics();assert.equal(m.skillMissingAssets,0);assert(m.skillSourceDraws<=(low?4:8));assert.equal(counter.draws,m.skillSourceDraws);assert(m.skillCacheEntries<=24&&m.skillCacheBytes<=2097152);
        if(kind==='warning'){const pending=w.boss.identityCasts.filter(p=>!p.cancelled&&w.tick>=p.warningAt&&w.tick<p.activeAt);assert.equal(m.skillWarningDraws,pending.length,'all currently committed warning origins visible on both paths');for(const p of pending){const shown=m.representedCasts.find(s=>s.id===p.id);assert(shown,'missing actual locked source cue '+[group,p.id]);assert.equal(shown.warningAt,p.warningAt);assert.equal(shown.activeAt,p.activeAt);assert.equal(shown.x,p.x);assert.equal(shown.y,p.y);}}
        for(const r of m.representedReleases){const actual=w.boss.skillReleases.find(e=>e.tick===r.tick&&e.kind===r.kind&&e.x===r.x&&e.y===r.y&&(!r.sourceActorId||e.sourceActorId===r.sourceActorId));assert(actual,'cue must represent a successfully committed real emission');assert.equal(r.releaseAge,w.tick-r.tick);}
        rows.push({kind,group,bossIndex:record.bossIndex,phase:record.phase,difficulty:record.difficulty,tick:w.tick,quality:low?'low':'high',metrics:m,pixelSHA256:sha(Buffer.from(ctx.getImageData(0,0,360,240).data))});if(!low&&!pictures.some(p=>p.group===group&&p.kind===kind))pictures.push({group,kind,canvas:c});
      }finally{fx.destroy();}
    }
  }
  return {rows,pictures};
}
async function fullScenes(box,old,collected,{warmups=5,samples=12,details=true}={}){
  const {performance}=require('node:perf_hooks'),cache=new Map(),rows=[],pictures=[];
  const snapshots=[...collected.scenes].map(([group,world])=>({group,world,detail:false}));
  // The complete campaign sheet uses the final phase. Show the earlier own
  // tissue/knife/money/treasure contexts separately so Mammon's child-memory
  // phase is never advertised with adult money/treasure imagery.
  if(details)for(const bossIndex of[5,7,9])for(const phase of[0,1]){const w=practice(box,bossIndex,phase,'hell',25);while(w.tick<235)box.HapilCore.step(w,{});snapshots.push({group:assetGroup(bossIndex),world:w,detail:true});}
  for(const {group,world:w,detail}of snapshots){
    const images=await imagesFor(box,group,cache,old,true),immutable=JSON.stringify(w);
    for(const low of[false,true]){
      const row={group,phase:w.phase,difficulty:w.difficulty,tick:w.tick,detail,quality:low?'low':'high',bullets:w.bullets.length,hazards:w.hazards.length},pair={group,phase:w.phase,detail};
      for(const [name,scope]of [['baseline',old],['actual',box]]){
        const canvas=createCanvas(360,640);canvas.style={};const r=scope.HapilRenderer.create(canvas,images);
        try{r.resize(360,640,1);for(let n=0;n<warmups;n++)r.draw(w,0,w.time,low);const times=[];for(let n=0;n<samples;n++){const start=performance.now();r.draw(w,0,w.time,low);times.push(performance.now()-start);}times.sort((x,y)=>x-y);const m=r.getMetrics(),p=m.projectilePresentation,s=m.bossSkillsPresentation;
          assert.equal(p.missingProjectileAssets,0);assert(p.stampCacheBytes<=4194304&&p.stampCacheEntries<=96);assert.equal(p.stampCacheMisses,0,'fixed warm scene cannot continually rebuild stamps');assert.equal(p.beamFrameCacheBuilds,0);assert.equal(s.skillMissingAssets,0);assert(s.skillSourceDraws<=(low?4:8));assert(s.skillCacheBytes<=2097152&&s.skillCacheEntries<=24);
          row[name]={warmups,samples,p50Ms:times[Math.floor((samples-1)*.5)],p95Ms:times[Math.floor((samples-1)*.95)],maxMs:times.at(-1),projectiles:p,bossSkills:s,pixelSHA256:sha(Buffer.from(canvas.getContext('2d').getImageData(0,0,360,640).data))};
          if(!low){const copy=createCanvas(360,640);copy.getContext('2d').drawImage(canvas,0,0);pair[name]=copy;}
        }finally{r.destroy();}
      }
      if(group===8)assert.equal(row.actual.pixelSHA256,row.baseline.pixelSHA256,'complete v24 Lust scene pixels remain unchanged');
      assert.equal(JSON.stringify(w),immutable);rows.push(row);if(!low)pictures.push(pair);
    }
  }
  return {scope:'Native CPU complete360x640DPR1 scenes from explicitly immune core observations, frozen snapshots and synchronous draws on shared host; not browser/software GPU/hardware GPU, sustained gameFPS or physicalphone measurement.',rows,pictures};
}
function jpgProof(canvas,file){const bytes=canvas.toBuffer('image/jpeg');assert(bytes.length<=2700000,'review image below delivery size ceiling');const p=path.join(ROOT,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);return{path:file,width:canvas.width,height:canvas.height,bytes:bytes.length,sha256:sha(bytes)};}
function sceneSheets(pictures){
  const main=pictures.filter(p=>!p.detail),proofs=[];for(let start=0;start<main.length;start+=6){const batch=main.slice(start,start+6),cw=240,ch=450,c=createCanvas(cw*batch.length,ch*2),ctx=c.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<batch.length;i++)for(const [j,key]of['baseline','actual'].entries()){const x=i*cw,y=j*ch;ctx.drawImage(batch[i][key],x,y+24,240,426);ctx.fillStyle='#eee';ctx.font='13px sans-serif';ctx.fillText('G'+batch[i].group+' '+key+' · CPU immune snapshot',x+3,y+17);}
    proofs.push(jpgProof(c,`docs/v25-pixels/battle-page-${start/6+1}.jpg`));
  }
  for(const picture of pictures.filter(p=>p.detail||[1,2,5,7,9,17,22,27,29,34,35].includes(p.group))){const c=createCanvas(720,664),ctx=c.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,720,664);for(const [i,key]of['baseline','actual'].entries()){ctx.drawImage(picture[key],i*360,24);ctx.fillStyle='#eee';ctx.font='14px sans-serif';ctx.fillText('G'+picture.group+' phase'+(picture.phase+1)+' '+key+' · native360x640',i*360+5,17);}proofs.push(jpgProof(c,`docs/v25-pixels/native-group-${picture.group}-phase-${picture.phase+1}.jpg`));}
  return proofs;
}
function objectSheets(pictures){const proofs=[];for(let start=0;start<pictures.length;start+=6){const batch=pictures.slice(start,start+6),cw=256,ch=280,c=createCanvas(cw*batch.length,ch*2),ctx=c.getContext('2d');ctx.fillStyle='#151d29';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<batch.length;i++)for(const[j,key]of['baseline','actual'].entries()){ctx.drawImage(batch[i][key],i*cw,j*ch+24);ctx.fillStyle='#eee';ctx.font='13px sans-serif';ctx.fillText('G'+batch[i].group+' '+key+' · native pixels',i*cw+4,j*ch+17);}proofs.push(jpgProof(c,`docs/v25-pixels/objects-page-${start/6+1}.jpg`));}return proofs;}
function cueSheets(pictures){const proofs=[];for(let start=0;start<pictures.length;start+=8){const batch=pictures.slice(start,start+8),cw=360,ch=265,c=createCanvas(cw*4,ch*2),ctx=c.getContext('2d');ctx.fillStyle='#121a27';ctx.fillRect(0,0,c.width,c.height);batch.forEach((p,i)=>{const x=i%4*cw,y=Math.floor(i/4)*ch;ctx.drawImage(p.canvas,x,y+25);ctx.fillStyle='#eee';ctx.font='14px sans-serif';ctx.fillText('G'+p.group+' '+p.kind+' · native source cue',x+4,y+18);});proofs.push(jpgProof(c,`docs/v25-pixels/skill-page-${start/8+1}.jpg`));}return proofs;}
async function main(){
  if(!process.argv.includes('--full')){console.log(JSON.stringify(writeReport('docs/v25-qa/pinned-v24-baseline.json',baselineManifest())));return;}
  const before=hashes(),box=runtime(),old=runtime(BASE),ticks=Number(process.env.HAPIL_QA_TICKS||840),collected=collectRoutes(box,{ticks});
  console.log(JSON.stringify({stage:'actual-routes',cases:collected.rows.length,routes:collected.routes.length}));
  writeReport('docs/v25-qa/actual-emitted-routes.json',{scope:collected.scope,sourceHashes:before,rows:collected.rows,clocks:collected.clocks,routes:collected.routes.map(({world,...r})=>r)});
  const pixels=await sourcePixels(box,old,collected);console.log(JSON.stringify({stage:'source-pixels',cases:pixels.rows.length,newOwnedVariants:pixels.newOwnedVariants}));
  writeReport('docs/v25-qa/actual-source-pixels.json',{sourceHashes:before,minimumCentralFraction:Math.min(...pixels.rows.map(r=>r.measurement.centralFraction)),minimumNewWholeFraction:Math.min(...pixels.rows.filter(r=>r.changed&&r.ownedObject).map(r=>r.measurement.fullDamageFraction)),newOwnedVariants:pixels.newOwnedVariants,rows:pixels.rows});
  const rotationRows=await ownedRotations(box,old,collected,pixels);console.log(JSON.stringify({stage:'owned-rotation-subpixel',cases:rotationRows.length}));writeReport('docs/v25-qa/owned-rotation-subpixel.json',{sourceHashes:before,rows:rotationRows});
  const skill=await skillFrames(box,collected);console.log(JSON.stringify({stage:'actual-source-cues',cases:skill.rows.length}));writeReport('docs/v25-qa/actual-source-cues.json',{sourceHashes:before,rows:skill.rows});
  const legacy=legacyTrace(box,old,{ticks:360});console.log(JSON.stringify({stage:'legacy-exact',cases:legacy.length}));writeReport('docs/v25-qa/legacy-exact.json',{baseline:BASE,sourceHashes:before,rows:legacy});
  const lust=lustPhysics(box,old);writeReport('docs/v25-qa/lust-physical-exact.json',{baseline:BASE,sourceHashes:before,normalisation:'Only optional combatRevision21/25 field removed; all simulated world/checkpoint content otherwise equal.',rows:lust});
  const deterministic=checkpointDeterminism(box,{bosses:Array.from({length:35},(_,i)=>i),ticks:480});console.log(JSON.stringify({stage:'checkpoint-determinism',cases:deterministic.length}));writeReport('docs/v25-qa/checkpoint-determinism.json',{sourceHashes:before,rows:deterministic});
  const scenes=await fullScenes(box,old,collected);console.log(JSON.stringify({stage:'full-scene-cpu',cases:scenes.rows.length}));writeReport('docs/v25-qa/full-scene-cpu.json',{scope:scenes.scope,sourceHashes:before,rows:scenes.rows});
  const proofs=[...sceneSheets(scenes.pictures),...objectSheets(pixels.pictures),...cueSheets(skill.pictures)];
  assert.deepEqual(hashes(),before,'source changed during independent frozen audit');
  const summary={schema:1,scope:'Independent native CPU source/render and explicitly immune actual core observation; ordinary-health inputs/replays, actual browser/GPU/mobile/device checks are separate.',baseline:BASE,sourceHashes:before,sourceHashGuardPassed:true,actualCases:collected.rows.length,actualRoutes:collected.routes.length,pixelCases:pixels.rows.length,ownedRotationSubpixelCases:rotationRows.length,skillFrames:skill.rows.length,legacyExactCases:legacy.length,lustPhysicalExactCases:lust.length,deterministicCheckpointCases:deterministic.length,fullSceneCases:scenes.rows.length,proofs,reviewStatus:'pending root direct pixel review'};
  writeReport('docs/V25-INDEPENDENT-QA-20261031.json',summary);console.log(JSON.stringify(summary));
}
module.exports={ROOT,BASE,FILES,sha,source,runtime,hashes,assetGroup,practice,routeKey,alphaMeasure,imagesFor,normaliseVersion,pointSegmentSquared,segmentsSquared,baselineManifest,legacyTrace,collectRoutes,sourcePixels,ownedRotations,lustPhysics,checkpointDeterminism,skillFrames,fullScenes,writeReport,jpgProof,sceneSheets,objectSheets,cueSheets,main,createCanvas};
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
