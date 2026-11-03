'use strict';
// Real core/renderer integration. Immune fixtures isolate presentation; these
// are not ordinary-health clears, browser/GPU timings or physical-phone FPS.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const a=require('../tools/audit-object-projectiles-v24.cjs'),m=require('../tools/review-mobile-render-v30.cjs');
const BASE='f616a344cfdc03af2bbc7cf98a17e2126123a4c0';

function actualWorld(box,index=8,revision=31){
  const C=box.HapilCore,initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'v36-shot-impact-integration'}),saved=C.checkpoint(initial);saved.phase=2;
  const w=C.restoreCheckpoint(saved);w.autoAttack=true;w.skillRotation=false;w.player.invulnerableUntil=999999;
  if(revision===31)assert(C.getCombatPresentation(w),'the current source must register its opt-in exact-contact channel');
  return w;
}
function freshCue(frame,kind,tick,maximumAge){
  return frame.events.some(e=>e.serial>0&&e.kind===kind&&tick-e.tick>=0&&tick-e.tick<=maximumAge);
}
function impactScene(box,index=8){
  const C=box.HapilCore,w=actualWorld(box,index),channel=C.getCombatPresentation(w);
  for(let tick=0;tick<540;tick++){
    C.step(w,{});
    if(w.tick>=240&&w.stage==='boss'&&w.shots.length&&freshCue(channel,'impact',w.tick,4)&&freshCue(channel,'muzzle',w.tick,2))return w;
  }
  assert.fail('the actual auto-attack fixture did not produce an overlapping real shot/contact/muzzle frame');
}

test('the live loader and shared native runtime wire the new combat presentation before rendering',()=>{
  const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/src="src\/([^"?]+)\.js\?v=([^"&]+)"/g)].map(match=>({name:match[1],version:match[2]}));
  const combat=scripts.findIndex(x=>x.name==='combat-presentation-v36'),render=scripts.findIndex(x=>x.name==='render'),core=scripts.findIndex(x=>x.name==='core');
  assert(combat>core&&combat<render,'production cannot leave the new file disconnected from its real render path');assert.equal(new Set(scripts.map(x=>x.version)).size,1,'new source and existing companions must share a cache revision');
  const box=a.runtime();assert.equal(typeof box.HapilCore.getCombatPresentation,'function');
  assert(box.HapilCombatPresentationV36&&typeof box.HapilCombatPresentationV36.create==='function','native QA must execute the same optional module as index.html');
});

test('actual current31 shots and swept-contact cues draw in both qualities without world changes or warm readback/allocation',async()=>{
  const box=a.runtime(),cache=new Map();let comparisons=0;
  for(const index of[8,33]){
    const w=impactScene(box,index),images=await a.imagesFor(box,index>=12?index+1:index,cache),f=m.fixture(box,images),state=JSON.stringify(w),checkpoint=JSON.stringify(box.HapilCore.checkpoint(w));
    try{for(const low of[true,false]){
      for(let n=0;n<4;n++)f.renderer.draw(w,0,w.time,low,{precise:true});
      const allocated=box.allocated.length,contexts=[...new Set([f.canvas,...box.allocated].map(c=>c.getContext('2d')))],originals=contexts.map(ctx=>ctx.getImageData);let reads=0;
      contexts.forEach((ctx,i)=>{ctx.getImageData=function(...args){reads++;return originals[i].apply(this,args);};});
      try{for(let n=0;n<100;n++)f.renderer.draw(w,0,w.time,low,{precise:true});}finally{contexts.forEach((ctx,i)=>{ctx.getImageData=originals[i];});}
      const metrics=f.renderer.getMetrics(),p=metrics.combatPresentation;
      assert(p,'real renderer diagnostics must expose the integrated module');assert(p.shotDraws>0,'real friendly projectiles must use the new path');assert(p.impactDraws>0,'real nonlethal contacts need visible confirmation');assert(p.muzzleDraws>0,'real successful emissions need their own local cue');assert.equal(p.missingAssets,0);
      assert(p.cacheBytes>0&&p.cacheBytes<=1048576,'source stamps must remain inside their finite1MiB budget');assert.equal(box.allocated.length,allocated,'warm fullscene drawing cannot allocate another canvas');assert.equal(reads,0,'warm fullscene drawing cannot read pixels back');
      assert.equal(JSON.stringify(w),state);assert.equal(JSON.stringify(box.HapilCore.checkpoint(w)),checkpoint);assert.equal(metrics.projectilePresentation.missingProjectileAssets,0);assert.equal(metrics.playerFeedback.hitRadius,w.player.r);comparisons++;
    }}finally{f.close();assert.equal(f.canvas.width,1);assert.equal(f.canvas.height,1);}
  }
  assert.equal(comparisons,4);
});

test('historical30 fullscene pixels and raw simulation remain exact against the deployed35 renderer',async()=>{
  const box=a.runtime(),old=a.runtime(BASE),cache=new Map();let comparisons=0;
  for(const index of[8,33]){
    const w=actualWorld(box,index,30),prior=actualWorld(old,index,30);for(let tick=0;tick<300;tick++){box.HapilCore.step(w,{});old.HapilCore.step(prior,{});}assert.equal(JSON.stringify(w),JSON.stringify(prior));
    const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},old),f=m.fixture(box,images),g=m.fixture(old,images),state=JSON.stringify(w);
    try{for(const low of[true,false]){for(let n=0;n<3;n++){f.draw(w,low);g.draw(prior,low);}assert(f.draw(w,low).pixels.equals(g.draw(prior,low).pixels),'legacy render source must stay byte-exact');assert.equal(JSON.stringify(w),state);comparisons++;}}finally{f.close();g.close();}
  }
  assert.equal(comparisons,4);
});

test('real contact accents finish before every hostile damage-body draw in the full compositor',async()=>{
  const box=a.runtime(),w=impactScene(box,8),images=await a.imagesFor(box,8),order=[];
  const ownCreate=box.HapilCombatPresentationV36.create,hostileCreate=box.HapilProjectiles.create;
  box.HapilCombatPresentationV36={...box.HapilCombatPresentationV36,create(...args){const fx=ownCreate.apply(this,args),draw=fx.drawContacts;fx.drawContacts=function(...drawArgs){order.push('contact');return draw.apply(this,drawArgs);};return fx;}};
  box.HapilProjectiles={...box.HapilProjectiles,create(...args){const fx=hostileCreate.apply(this,args);for(const name of['drawHazardBody','drawBullet']){const draw=fx[name];fx[name]=function(...drawArgs){order.push('hostile');return draw.apply(this,drawArgs);};}return fx;}};
  const f=m.fixture(box,images),state=JSON.stringify(w);
  try{const out=f.draw(w,true),contact=order.indexOf('contact'),hostile=order.indexOf('hostile');assert(contact>=0&&hostile>contact,'friendly contact accents must be under the first hostile damage body');assert(order.slice(hostile).every(x=>x==='hostile'),'no friendly contact may be added over later danger bodies');assert(out.metrics.combatPresentation.impactDraws>0);assert.equal(out.metrics.projectilePresentation.missingProjectileAssets,0);assert.equal(JSON.stringify(w),state);}finally{f.close();}
});

module.exports={actualWorld,impactScene,freshCue};
