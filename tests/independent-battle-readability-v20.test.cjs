'use strict';
// Independent actual-engine geometry, release timing and app/renderer wiring.
// Explicit damage immunity / phase navigation isolates presentation. This is
// not a natural progression, browser, GPU or real-device performance result.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const audit=require('../tools/audit-actual-projectiles-v20.cjs');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const {harness,boot,advance,practice}=require('./helpers/story-app-fixture-v19.cjs');
const root=path.resolve(__dirname,'..'),core=audit.core;
let pixelFixture;
async function pixels(){if(!pixelFixture)pixelFixture=(async()=>{const api=audit.makeAPI(),before=audit.makeAPI(audit.baseline),actual=audit.collectActualShapes(),images=await audit.loadImages([api,before],actual.shapes);return {api,before,actual,images};})();return pixelFixture;}
const variants=[{angle:0,offset:0},{angle:Math.PI/4,offset:0},{angle:Math.PI/2,offset:0},{angle:0,offset:.25},{angle:0,offset:.5}];
test('actual emitted radii and capsule lengths keep readable own-source centers at real rotations and subpixel positions',async()=>{
 const {api,actual,images}=await pixels();assert.equal(actual.observed.length,216);assert.equal(actual.shapes.length,94);assert(actual.shapes.some(s=>s.r===3.8&&s.l===0));assert(actual.shapes.some(s=>s.r===4&&s.l===13));assert(actual.shapes.some(s=>s.r===3&&s.l===9));assert(actual.shapes.some(s=>s.r===11));
 let group=-1,fx,checked=0;
 try{for(const spec of actual.shapes){if(group!==spec.group){if(fx)fx.destroy();group=spec.group;fx=api.create(images);}for(const variant of variants)for(const paletteSlot of [0,1]){
  const high=audit.paint(api,images,spec,{...variant,paletteSlot,effect:fx}),low=audit.paint(api,images,spec,{...variant,paletteSlot,low:true,effect:fx}),m=audit.inspect(high.bodyData,high.bullet),label=JSON.stringify({group:spec.group,r:spec.r,l:spec.l,owner:spec.sourceActorId,...variant,paletteSlot});
  assert(m.centralCoreVisibleFraction>=.8,'actual emitted center is readable '+label+' '+m.centralCoreVisibleFraction);assert(m.maxRasterOutset<=4.75,'source body keeps the small visual margin around its actual collision axis '+label+' '+m.maxRasterOutset);
  assert.deepEqual(Buffer.from(high.data),Buffer.from(low.data),'low quality preserves the actual danger source '+label);assert.equal(high.draws,['boss-weapon','hell-rotor'].includes(spec.kind)?2:1,'one danger-body draw plus only the already-defined separate weapon/rotor icon');
  assert.equal(high.metrics.missingProjectileAssets,0);assert(high.metrics.stampCacheBytes<=4194304);assert(high.metrics.stampCacheEntries<=96);assert(high.metrics.maxVisualOutset<=4);checked++;
 }}assert.equal(checked,940);}finally{if(fx)fx.destroy();}
});
test('the four real-size center holes are fixed with colored source pixels, not an opaque dark substitute',async()=>{
 const {api,before,actual,images}=await pixels();const targets=[{group:23,r:3.8,l:0},{group:25,r:3.8,l:0},{group:29,r:3.8,l:0},{group:34,r:4,l:13,sourceActorId:'baek-ion'}];
 for(const target of targets){const spec=actual.shapes.find(s=>Object.keys(target).every(k=>s[k]===target[k]));assert(spec);const old=audit.paint(before,images,spec),oldCore=audit.inspect(old.data,old.bullet);assert(oldCore.centralCoreVisibleFraction<.8,'the retained baseline independently reproduces the real-size hole');
  for(const variant of variants)for(const paletteSlot of [0,1]){const painted=audit.paint(api,images,spec,{...variant,paletteSlot}),m=audit.inspect(painted.data,painted.bullet),previous=audit.paint(before,images,spec,{...variant,paletteSlot}),p=audit.inspect(previous.data,previous.bullet);
   assert(m.centralCoreVisibleFraction>=.8);assert(m.centralBrightFraction>=.8,'original colored center (alpha180/luma50) must read, not just a dark keyline');assert(m.centralAlphaWeightedLuminance>=p.centralAlphaWeightedLuminance*.9,'center source brightness is retained');
  }
 }
});
test('the two retained four-frame orb sources remain readable in every actual authored frame',async()=>{
 const {api,actual,images}=await pixels();let checked=0;
 for(const spec of actual.shapes.filter(s=>[0,4].includes(s.group)&&s.l===0&&s.kind!=='hell-rotor')){
  const fx=api.create(images),frames=new Set();try{for(const age of [0,.125,.25,.375])for(const variant of variants)for(const paletteSlot of [0,1]){
   const image=audit.paint(api,images,spec,{...variant,paletteSlot,age,effect:fx}),m=audit.inspect(image.bodyData,image.bullet);assert(m.centralCoreVisibleFraction>=.8,'actual animated source frame '+JSON.stringify({group:spec.group,r:spec.r,age,...variant,paletteSlot}));assert(m.maxRasterOutset<=4.75);assert.equal(image.metrics.bodyAnimationPhases,4);assert.equal(image.metrics.missingProjectileAssets,0);if(variant.angle===0&&variant.offset===0&&paletteSlot===0)frames.add(audit.sha(Buffer.from(image.bodyData)));checked++;
  }assert(frames.size>=2,'the authored source variation is retained');const last=audit.paint(api,images,spec,{age:.375,effect:fx}),held=audit.paint(api,images,spec,{age:5,effect:fx});assert.deepEqual(Buffer.from(held.data),Buffer.from(last.data),'the retained four source states hold their last frame rather than inventing a loop');}finally{fx.destroy();}
 }assert(checked>=80);
});
function installPresentation(){global.document={createElement(){return createCanvas(1,1)}};for(const name of ['story-assets','boss-motion','actors','projectiles','boss-skills','render'])require('../src/'+name+'.js');}
async function storyImages(group){const media=require('../tools/read-media-registry.cjs')(),images={};for(const key of global.HapilStoryAssets.assetKeysForEncounter(group))images[key]=await loadImage(path.join(root,media[key]));return images;}
function at(group,tick,phase=2){const w=audit.phaseWorld(group,phase,'hell');while(w.tick<tick)core.step(w,{});return w;}
test('actual simultaneous emitters and separate cult participants retain their own release positions within stable quality budgets',async()=>{
 const previous=global.document;installPresentation();try{
  for(const [group,tick]of [[20,145],[34,181]]){const w=at(group,tick),images=await storyImages(group),fx=global.HapilBossSkills.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),unchanged=structuredClone(w);
   try{const expected=w.boss.skillReleases.filter(e=>w.tick-e.tick>=0&&w.tick-e.tick<30);assert(expected.length>=2);
    fx.beginFrame();fx.draw(ctx,w,false);const high=fx.getMetrics();assert(high.skillSourceDraws<=8);assert.equal(high.skillMissingAssets,0);
    for(const emitted of high.representedReleases)assert(expected.some(e=>e.tick===emitted.tick&&e.kind===emitted.kind&&e.x===emitted.x&&e.y===emitted.y&&e.sourceActorId===emitted.sourceActorId),'every displayed release comes from an actual committed record');
    if(group===20){const blades=high.representedReleases.filter(e=>e.kind==='blade'&&e.tick===145);assert.equal(blades.length,6);assert.deepEqual(blades.map(e=>e.x).sort((a,b)=>a-b),[30,90,150,210,270,330]);assert(blades.every(e=>e.y===88));}
    else{const current=high.representedReleases.filter(e=>e.tick===181);assert(current.some(e=>e.sourceActorId==='han-rian'&&e.sourceKey==='storyRianCross'));assert(current.some(e=>e.sourceActorId==='baek-ion'&&e.sourceKey==='storyIonShield'));}
    fx.beginFrame();fx.draw(ctx,w,true);const low=fx.getMetrics();assert(low.skillSourceDraws<=4);assert(low.skillCacheBytes<=2097152);assert(low.skillCacheEntries<=24);const stable=JSON.stringify(low.representedReleases);fx.beginFrame();fx.draw(ctx,w,true);assert.equal(JSON.stringify(fx.getMetrics().representedReleases),stable,'repainting a fixed frame cannot hop between emitters');
    assert.deepEqual(w,unchanged,'release presentation cannot mutate engine state');
    const negative=structuredClone(w);negative.boss.action='recover';if(negative.boss.participants)negative.boss.participants.forEach(p=>p.action='recover');negative.boss.skillReleases=expected.map((e,i)=>({...e,tick:i%2?w.tick+1:w.tick-30}));fx.beginFrame();fx.draw(ctx,negative,false);assert.equal(fx.getMetrics().representedReleases.length,0,'future and expired releases cannot be invented by presentation');
   }finally{fx.destroy();}
  }
 }finally{global.document=previous;}
});
test('the battle HUD follows exact real laser boundaries and never treats residual threats as a cleared phase',async()=>{
 const previous=global.document;installPresentation();const images=await storyImages(20),canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
 try{const w=audit.phaseWorld(20,2,'hell');for(const tick of [73,140,168,169,192,193,207,208]){while(w.tick<tick)core.step(w,{});const before=structuredClone(w);renderer.draw(w,0,w.time,false);const m=renderer.getMetrics(),hud=m.battleReadability,warnings=w.hazards.filter(h=>h.phase==='warning'),active=w.hazards.filter(h=>h.phase==='active'),fade=w.hazards.filter(h=>h.phase==='fade');assert(hud);assert.equal(hud.warningLasers,warnings.length);assert.equal(hud.activeLasers,active.length);assert.equal(hud.fadingLasers,fade.length);assert.equal(hud.enemyBullets,w.bullets.length);assert.equal(hud.remainingSeconds,Math.max(0,w.phaseTimeout-w.phaseTime));assert(hud.box[1]+hud.box[3]<=64,'persistent HUD stays out of the middle of the combat lane');
   assert.equal(hud.nearestWarningTicks,warnings.length?Math.min(...warnings.map(h=>h.activeAt-w.tick)):null);assert.equal(hud.nearestWarningSeconds,hud.nearestWarningTicks==null?null:hud.nearestWarningTicks/60);assert.equal(m.warningContrastStrokes,warnings.length,'contrasting under-strokes correspond only to actual warning paths');
   if(tick<169)assert.equal(hud.statusKind,'laser-warning');if(tick>=169&&tick<193)assert.equal(hud.statusKind,'laser-active');if(tick===193)assert.equal(hud.activeLasers,0,'damage ends before harmless afterglow');assert.equal(m.patternEntryCue,null,'live warnings/bullets cannot carry the entry banner');assert.equal(m.specialPatternCue.hintRenderedInArena,false);assert.deepEqual(w,before,'timing display cannot mutate simulation');
   const builds=hud.textLayoutBuilds;renderer.draw(w,0,w.time,false);assert.equal(renderer.getMetrics().battleReadability.textLayoutBuilds,builds,'unchanged labels do not rebuild text layout');
  }
  // This is a display-only transition fixture, not progression. The same real
  // hazard records stay active; visual transition language must not imply safe.
  const residual=structuredClone(w);residual.stage='transition';residual.transitionNarrative=null;residual.transitionRemaining=2;residual.nextPhase=0;const immutable=structuredClone(residual);renderer.draw(residual,0,residual.time,false);assert.equal(renderer.getMetrics().battleReadability.statusKind,'residual-danger');assert.deepEqual(residual,immutable);
 }finally{renderer.destroy();global.document=previous;}
});
test('brief deduplicated entry titles disappear before live threats and timeout labels stay bounded',async()=>{
 const previous=global.document;installPresentation();const images=await storyImages(35),canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
 try{const w=at(35,40);renderer.draw(w,0,w.time,false);const cue=renderer.getMetrics().patternEntryCue;assert(cue);assert.equal(cue.title,'두 사몽의 격돌');assert(!cue.title.includes('두 사몽의 격돌 · 두 사몽의 격돌'));assert.equal(cue.expiresAtPhaseSeconds,1.1);while(w.tick<67)core.step(w,{});renderer.draw(w,0,w.time,false);assert.equal(renderer.getMetrics().patternEntryCue,null);
  for(const phaseTime of [w.phaseTimeout-15,w.phaseTimeout-.05,w.phaseTimeout,w.phaseTimeout+1]){const fixture=structuredClone(w);fixture.phaseTime=phaseTime;renderer.draw(fixture,0,fixture.time,false);const hud=renderer.getMetrics().battleReadability;assert.equal(hud.remainingSeconds,Math.max(0,fixture.phaseTimeout-phaseTime));assert.equal(hud.timerWarning,true);assert(!hud.timerText.includes('-'));}
 }finally{renderer.destroy();global.document=previous;}
});
test('the real app keeps the movement surface free of map/pattern copy during combat and residual threats',async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="touch-pad"[^>]*aria-label="상대 드래그 이동 패드"/);
 for(const id of ['pad-title','pad-caption'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,0,'removed visible guidance destination');
 const h=harness();await boot(h);await practice(h,19);const w=h.world();assert(w.boss.patternHint);
 for(const phase of [0,1,2]){w.phase=phase;await advance(h);assert.equal(String(h.el('pad-caption').textContent||''),'');assert.equal(String(h.el('pad-title').textContent||''),'');}
 w.autoAttack=false;w.skillRotation=false;w.stage='transition';w.transitionRemaining=2;w.nextPhase=0;w.bullets.length=0;w.hazards.length=0;w.bullets.push({id:99999,x:24,y:24,px:24,py:24,vx:0,vy:10,r:3.8,halfLength:0,angle:Math.PI/2,kind:'orb',age:0,ttl:10,grazed:false});await advance(h);
 assert.equal(String(h.el('pad-title').textContent||''),'');assert.equal(String(h.el('pad-caption').textContent||''),'');assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
 assert.equal(w.combatRevision,21,'actual product opts new runs into v21 attacks');
 assert.equal(h.g.HapilApp.diagnostics().candidateRevision,21);assert.equal(h.g.HapilApp.diagnostics().version,'hapil-hell-pressure-v21');
});
test('combat expansion retains the exact previously reviewed original source media and collision art metadata',()=>{
 for(const file of ['src/media.js','src/story-assets.js'])assert.deepEqual(fs.readFileSync(path.join(root,file)),cp.execFileSync('git',['show','d2f5fddff2f12118d5c97a9a24e1111c16a1c771:'+file],{cwd:root}),file+' is byte-identical to deployed v20 source art');
});
