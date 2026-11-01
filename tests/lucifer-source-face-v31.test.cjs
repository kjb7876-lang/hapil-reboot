'use strict';
// Native CPU source images and restored product boss checkpoints. Display-only
// fixtures use immunity and disable attacks/skills, not human/mobile-FPS QA.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const a=require('../tools/audit-object-projectiles-v24.cjs'),C=require('../src/core.js');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const BASE='a5982f256b053429135fac1ed0c19a07d7f073bc',current=a.runtime(),before=a.runtime(),pinnedActors=a.runtime(BASE);
const renderSource=a.source('src/render.js').toString(),oldSource=a.source('src/render.js',BASE).toString(),start='    function drawSpellTheatre(world){',end='    function draw(world,alpha,time,lowQuality,presentation)';
const a0=renderSource.indexOf(start),a1=renderSource.indexOf(end,a0),b0=oldSource.indexOf(start),b1=oldSource.indexOf(end,b0);
assert(a0>=0&&a1>a0&&b0>=0&&b1>b0);const oldTheatre=oldSource.slice(b0,b1);
assert(oldTheatre.includes("'#15192e'"),'pinned source must contain the actual obstructing faceplate');
vm.runInContext(renderSource.slice(0,a0)+oldTheatre+renderSource.slice(a1),vm.createContext(before),{filename:'same-renderer-with-pinned-faceplate.js'});
const cache=new Map();let luciferImages;
async function images(){return luciferImages||(luciferImages=await a.imagesFor(current,4,cache));}
function world(index=4,phase=0,revision=31,tick=90){
  const run=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'source-face31-restore'}),checkpoint=C.checkpoint(run);checkpoint.phase=phase;
  const w=C.restoreCheckpoint(checkpoint);assert.equal(w.combatRevision,revision);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;while(w.tick<tick)C.step(w,{});return w;
}
function scene(box,im,w,low){
  const c=createCanvas(360,640);c.style={};const ctx=c.getContext('2d'),fill=ctx.fill.bind(ctx),initial=JSON.stringify(w);let faceplateFills=0;
  ctx.fill=function(...args){if(String(ctx.fillStyle).toLowerCase()==='#15192e')faceplateFills++;return fill(...args);};
  const renderer=box.HapilRenderer.create(c,im);try{renderer.resize(360,640,1);renderer.draw(w,0,w.time,low);assert.equal(JSON.stringify(w),initial);return {pixels:Buffer.from(ctx.getImageData(0,0,360,640).data),faceplateFills,metrics:renderer.getMetrics()};}finally{renderer.destroy();}
}
function actor(box,im,w,copy){
  const c=createCanvas(360,640),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),sources=[],initial=JSON.stringify(w);ctx.drawImage=function(...args){sources.push(args);return draw(...args);};
  const actors=box.HapilActors.create(im);actors.beginFrame();assert(copy?actors.drawCombatCopy(ctx,w,copy,.62):actors.drawBoss(ctx,w,w.boss.x,w.boss.y,230,1));assert.equal(JSON.stringify(w),initial);
  return {pixels:Buffer.from(ctx.getImageData(0,0,360,640).data),sources,metrics:actors.getMetrics()};
}

test('Lucifer retains the accepted source atlas and its own 256-pixel pose cells',async()=>{
  const source=JSON.parse(fs.readFileSync(path.join(a.ROOT,'docs/reused-boss-motion-v8.json'))).files.find(row=>row.identity==='lucifer'),im=await images();
  assert.equal(a.sha(fs.readFileSync(path.join(a.ROOT,source.file))),source.sha256);assert.equal(current.HapilMedia.bossMotionLucifer,source.file);
  for(const phase of [0,1,2])for(const tick of [90,127,150,235]){
    const w=world(4,phase,31,tick),shown=actor(current,im,w);assert.equal(shown.metrics.lastBossIdentity,'lucifer');assert.equal(shown.metrics.lastBossAsset,'bossMotionLucifer');
    assert(shown.sources.length>=1&&shown.sources.length<=2);for(const draw of shown.sources){assert.equal(draw[0],im.bossMotionLucifer,'never substitutes another character/face');assert.equal(draw[3],256);assert.equal(draw[4],256);assert([0,256].includes(draw[1])&&[0,256].includes(draw[2]));}
  }
});

test('restored old selectors and 31 show the source face without a synthetic navy plate in either quality',async()=>{
  const im=await images();let comparisons=0;
  for(const revision of [undefined,21,25,27,28,29,30,31])for(const phase of [0,1,2])for(const low of [false,true]){
    const w=world(4,phase,revision),old=scene(before,im,w,low),fixed=scene(current,im,w,low);assert.equal(old.faceplateFills,1);assert.equal(fixed.faceplateFills,0,'the source human face must not receive a procedural mask');
    assert.equal(fixed.metrics.actorPresentation.lastBossAsset,'bossMotionLucifer');assert.equal(fixed.metrics.projectilePresentation.missingProjectileAssets,0);
    let changed=0,outside=0;for(let y=0;y<640;y++)for(let x=0;x<360;x++){const i=(y*360+x)*4;if([0,1,2,3].some(k=>old.pixels[i+k]!==fixed.pixels[i+k])){changed++;if(x<w.boss.x-14||x>w.boss.x+10||y<w.boss.y-29||y>w.boss.y-6)outside++;}}
    assert(changed>0,'the old obstruction was really visible');assert.equal(outside,0,'faceplate removal cannot alter nonface sprite/map/bullet/HUD pixels');comparisons++;
  }
  assert.equal(comparisons,48);
});

test('the cosmetic face fix leaves legacy Lucifer source body sampling unchanged',async()=>{
  const im=await images();for(const revision of [undefined,21,25,27,28,29,30])for(const phase of [0,1,2])for(const tick of [90,127,150,235]){
    const w=world(4,phase,revision,tick),fixed=actor(current,im,w),previous=actor(pinnedActors,im,w);assert(fixed.pixels.equals(previous.pixels),'preserved original source body/crossfade '+[revision,phase,tick]);assert.equal(fixed.metrics.lastBossPose,previous.metrics.lastBossPose);
  }
});

test('31 clones retain committed anticipation, actual release and cancellation behavior from 30',async()=>{
  const im=await a.imagesFor(current,0,cache),w=world(0,0,31,91),copy=w.boss.combatCopies.find(c=>c.kind==='clone');assert(copy);
  let shown=actor(current,im,w,copy).metrics.lastCombatCopySamples[0];assert(shown.repeatCue&&shown.repeatCue.active);assert.equal(shown.repeatCue.nextAt,127);assert.equal(shown.presentationAction,'charge');
  const cast=w.boss.identityCasts.find(c=>c.sourceActorId===copy.sourceActorId);assert(cast);cast.cancelled=true;shown=actor(current,im,w,copy).metrics.lastCombatCopySamples[0];assert.equal(shown.presentationAction,'recover');assert.equal(shown.repeatCue.active,false);cast.cancelled=false;
  while(w.tick<127)C.step(w,{});assert.equal(copy.releaseTick,127);shown=actor(current,im,w,copy).metrics.lastCombatCopySamples[0];assert.equal(shown.repeatCue.reason,'actual-release-pose');assert.equal(shown.presentationAction,'attack');
});
