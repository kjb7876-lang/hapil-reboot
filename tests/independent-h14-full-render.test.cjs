'use strict';
// Actual-source CPU Canvas snapshots. These are not browser/GPU/mobile tests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/boss-skills.js');require('../src/render.js');
const raw=fs.readFileSync(path.join(__dirname,'../src/media.js'),'utf8'),media=require('../tools/read-media-registry.cjs')();
async function fixture(){
 const previous=global.document,allocated=[];global.document={createElement(name){assert.equal(name,'canvas');const c=createCanvas(1,1);allocated.push(c);return c;}};
 const keys=Object.keys(media).filter(k=>/^(projectile|fxV8|bossMotion|cast|weapon|sin|h14|h24Lust)/.test(k)||['gunner','forest','ruins','cave','fxWindArrow8V6'].includes(k)),images={};
 for(const key of keys)images[key]=await loadImage(path.join(__dirname,'..',media[key]));
 return{images,allocated,close(){global.document=previous;}};
}
function actualOverlap(index){
 const first=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'actual-render-overlap'}),s=core.checkpoint(first);s.phase=2;
 const w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
 while(w.tick<236)core.step(w,{});return w;
}
test('all12 actual HELL overlap frames paint every damage body, own rotor, source scene and current release in both qualities',async()=>{
 const f=await fixture();try{
  for(let index=0;index<12;index++)for(const low of [false,true]){
   const w=actualOverlap(index);assert(w.hazards.some(h=>h.patternId==='hell-overlap-lattice-v14'&&h.phase==='active'));assert(w.bullets.some(b=>b.patternId==='hell-overlap-fan-v14'&&b.y>=450&&b.y<=614));assert(w.bullets.some(b=>b.patternId===core.CAMPAIGN_SIGNATURES[index].id));assert(w.bullets.some(b=>b.patternId==='hell-overlap-rotor-v14'&&b.weaponMotion));
   const before=JSON.stringify(w),canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,f.images);renderer.resize(360,640,1);
   try{
    renderer.draw(w,0,w.time,low);const m=renderer.getMetrics(),p=m.projectilePresentation,a=m.actorPresentation,b=m.bossSkillsPresentation;
    assert.equal(m.terrainStatus,'hapil1-source-portrait-composite');assert(m.sceneAsset.startsWith('h14Map'));assert.equal(m.sceneCollisionGeometry,false);
    assert.equal(a.bossDraws,1);assert.equal(a.lastBossAsset,w.boss.artKey==='boss'?'bossMotionViolet':index<5?['bossMotionViolet','bossMotionHorn','bossMotionBalrog','bossMotionMask','bossMotionLucifer'][index]:w.boss.artKey);
    assert.equal(p.texturedBullets,w.bullets.length);assert.equal(p.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);
    assert.equal(p.weaponVisualDraws,w.bullets.filter(b=>b.kind==='boss-weapon').length);assert.equal(p.rotorVisualDraws,w.bullets.filter(b=>b.kind==='hell-rotor').length);
    if(index>=5)assert.equal(p.sourceBeamOverlayDraws,p.assetLaserDraws);
    assert.equal(p.missingProjectileAssets,0);assert.equal(p.missingOptionalRotorAssets,0);assert.equal(p.missingOptionalBeamAssets,0);assert.equal(b.skillMissingAssets,0);assert(b.skillReleaseDraws>0);assert(b.skillSourceDraws<=(low?4:8));
    assert.equal(JSON.stringify(w),before,'source presentation cannot mutate live overlapped physics');
   }finally{renderer.destroy();}
  }
 }finally{f.close();}
});
test('a warmed real overlap frame reuses its scene, material and skill caches within the declared bounds',async()=>{
 const f=await fixture();try{
  for(const index of [0,7,9,10,11]){
   const w=actualOverlap(index),canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,f.images);renderer.resize(360,640,1);
   try{
    for(let i=0;i<3;i++)renderer.draw(w,0,w.time,false);const count=f.allocated.length,sceneBuilds=renderer.getMetrics().sceneCacheBuilds;
    for(let i=0;i<25;i++)renderer.draw(w,0,w.time,i%2===0);
    const m=renderer.getMetrics();assert.equal(f.allocated.length,count,'steady frame must not allocate new source surfaces');assert.equal(m.sceneCacheBuilds,sceneBuilds);assert.equal(m.sceneCacheEntries,1);assert.equal(m.sceneCacheBytes,360*720*4);assert(m.projectilePresentation.stampCacheBytes<=4*1024*1024);assert(m.bossSkillsPresentation.skillCacheBytes<=2*1024*1024);
   }finally{renderer.destroy();}
  }
 }finally{f.close();}
});
