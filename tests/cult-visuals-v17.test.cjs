'use strict';
// Actual source pixel / CPU Canvas fixture. Not a mobile or GPU benchmark.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/boss-skills.js');require('../src/render.js');
const root=path.join(__dirname,'..'),sources={cultLeaderAtlas:'media/cult-v17/cult-leader-atlas.png',cultBeam:'media/cult-v17/beam.webp',cultLance:'media/cult-v17/lance.webp',cultArena:'media/cult-v17/arena.jpg',cultDriveSpear:'media/cult-v17/drive-spear.webp',cultDriveFold:'media/cult-v17/drive-fold.webp',cultDriveImpact:'media/cult-v17/drive-impact.webp',cultDriveStitch:'media/cult-v17/drive-stitch.webp'};
async function setup(){const images={};for(const [key,src] of Object.entries(sources))images[key]=await loadImage(path.join(root,src));return images;}
test('separate final practice requires its own actual actor, projectile and arena images',async()=>{
 const im=await setup(),a=global.HapilActors,p=global.HapilProjectiles,r=global.HapilRenderer;
 assert.deepEqual(a.cultAssetKeysForEncounter(12),['cultLeaderAtlas']);assert.equal(a.invalidCultAssetForEncounter(im,12),null);
 assert.deepEqual(p.assetKeysForEncounter(12),['cultBeam','cultLance','cultDriveSpear']);assert.equal(p.invalidAssetForEncounter(im,12),null);
 assert.deepEqual(r.terrainAssetKeysForEncounter(12),['cultArena']);assert.equal(r.invalidTerrainAsset(im,12),null);
 for(const [key,tester] of [['cultLeaderAtlas',()=>a.invalidCultAssetForEncounter(im,12)],['cultLance',()=>p.invalidAssetForEncounter(im,12)],['cultDriveSpear',()=>p.invalidAssetForEncounter(im,12)],['cultArena',()=>r.invalidTerrainAsset(im,12)]]){const old=im[key];delete im[key];assert.equal(tester(),key);im[key]=old;}
 assert.equal(p.paletteFor({campaign:true,bossIndex:11,finalPractice:true}).id,'cult-leader');assert.equal(p.paletteFor({campaign:true,bossIndex:12}),null);
});
test('final actor action, attack release, warning and collision use the actual own art',async()=>{
 const im=await setup(),old=global.document;global.document={createElement(){return createCanvas(1,1)}};
 const a=global.HapilActors.create(im),p=global.HapilProjectiles.create(im),fx=global.HapilBossSkills.create(im),c=createCanvas(360,640),ctx=c.getContext('2d');
 try{
  const w={campaign:true,finalPractice:true,bossIndex:11,stage:'boss',tick:20,boss:{kind:'cult-leader',action:'charge',releaseTick:-1,actionProgress:.5,x:180,y:100}};
  a.beginFrame();assert(a.drawBoss(ctx,w,180,120,230,1));assert.equal(a.getMetrics().lastBossPose,'charge');assert.equal(a.getMetrics().lastBossAsset,'cultLeaderAtlas');
  w.boss.releaseTick=20;a.beginFrame();assert(a.drawBoss(ctx,w,180,120,230,1));assert.equal(a.getMetrics().lastBossPose,'down-attack');
  p.beginFrame();assert(p.drawBullet(ctx,w,{x:90,y:400,r:6,halfLength:0,kind:'orb',angle:0,age:0}));assert.equal(p.getMetrics().missingProjectileAssets,0);
  assert(p.drawHazardBody(ctx,w,{phase:'active',x1:110,y1:250,x2:110,y2:620,width:10,progress:0}));assert(p.getMetrics().sourceBeamOverlayDraws>0);
  const alpha=ctx.getImageData(90,400,1,1).data[3];assert(alpha>=240,'damage body remains visible at its center');
  fx.beginFrame();fx.draw(ctx,w,false);assert(fx.getMetrics().sourceKeys.cultDriveFold,'c104 Drive fold visible at actual charge');assert(!fx.getMetrics().sourceKeys.h14SkillPride,'chapter 2 pride FX must never substitute for final leader');
  assert.equal(a.getMetrics().fullAnimationCycles,0);
 }finally{p.destroy();fx.destroy();global.document=old;}
});
