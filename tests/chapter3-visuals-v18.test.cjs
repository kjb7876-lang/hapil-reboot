'use strict';
// Actual decoded source art with native CPU Canvas. Controlled presentation
// fixtures; these assertions do not certify natural clears or a mobile GPU.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/projectiles.js');require('../src/boss-skills.js');require('../src/render.js');
const root=path.join(__dirname,'..'),scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/media.js'),'utf8'),scope);const media=scope.window.HapilMedia;
let pending;function sources(){return pending||(pending=(async()=>{const im={};for(const [key,file] of Object.entries(media))if(key.startsWith('chapter3')||key==='gunner')im[key]=await loadImage(path.join(root,file));return im;})());}
function world(index){return core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:index,difficulty:'normal',seed:187,runId:'chapter3-pixels'});}
test('six role contracts require each actual body, own beam/lance, own map and three source drone states',async()=>{
 const im=await sources(),a=global.HapilActors,p=global.HapilProjectiles,r=global.HapilRenderer;
 for(let i=12;i<18;i++){
  const group=i+1;assert.equal(a.invalidChapter3AssetForEncounter(im,group),null);assert.equal(p.invalidAssetForEncounter(im,group),null);assert.equal(r.invalidTerrainAsset(im,group),null);
  assert.deepEqual(p.assetKeysForEncounter(group),['chapter3Beam','chapter3Lance']);assert.deepEqual(p.optionalAssetKeysForEncounter(group),[],'damage images cannot be filtered as optional');
  for(const key of a.chapter3AssetKeysForEncounter(group)){const missing={...im};delete missing[key];assert.equal(a.invalidChapter3AssetForEncounter(missing,group),key);}
  for(const key of ['chapter3Beam','chapter3Lance']){const missing={...im};delete missing[key];assert.equal(p.invalidAssetForEncounter(missing,group),key);}
 }
 for(const c of a.chapter3Contracts)for(let n=0;n<c.anchors.length;n++){const key=c.keys?c.keys[n]:c.key,ctx=createCanvas(c.width,c.height).getContext('2d');ctx.drawImage(im[key],0,0);const anchor=c.anchors[n],x=anchor[0]+(c.keys?0:n%c.columns*c.cell),y=anchor[1]+(c.keys?0:Math.floor(n/c.columns)*c.cell);assert(ctx.getImageData(x,y,1,1).data[3]>=235,`${c.identity} pose${n} must anchor the actual opaque torso`);}
 assert.deepEqual(a.chapter3Contracts.map(c=>c.authoredKeyposes),[4,4,4,4,3,4]);assert(a.chapter3Contracts.every(c=>c.fullAnimationCycles===0&&!c.sourcePivotsCertified));
 assert.equal(p.paletteFor(world(12)).id,'controller-system-13');assert.equal(p.paletteFor({campaign:true,bossIndex:12}),null);assert.equal(p.paletteFor({finalPractice:true,bossIndex:11}).id,'cult-leader');
});
test('each source pose follows the real release tick and preserves core position; missing own bodies fail closed',async()=>{
 const im=await sources(),ctx=createCanvas(360,640).getContext('2d');
 for(let i=12;i<18;i++){
  const w=world(i),a=global.HapilActors.create(im);w.tick=100;w.boss.releaseTick=-1;
  for(const [action,frame] of [['idle',0],['charge',1],['recover',i===16?0:3]]){w.boss.action=action;a.beginFrame();assert(a.drawBoss(ctx,w,w.boss.x,w.boss.y,230,1));assert.equal(a.getMetrics().lastChapter3Sample.frame,frame);}
  w.boss.action='recover';w.boss.releaseTick=100;a.beginFrame();assert(a.drawBoss(ctx,w,w.boss.x,w.boss.y,230,1));const m=a.getMetrics();assert.equal(m.lastChapter3Sample.frame,2);assert.deepEqual(m.lastChapter3Sample.position,m.lastChapter3Sample.combatPosition);assert.equal(m.chapter3GateDraws,i===17?1:0);assert.equal(m.silkTethers,0);
  const key=global.HapilActors.chapter3AssetKeysForEncounter(i+1)[0],missing={...im};delete missing[key];assert.equal(global.HapilActors.create(missing).drawBoss(ctx,w,w.boss.x,w.boss.y,230,1),false);
 }
 const a=global.HapilActors.create(im),w=world(12);for(const action of ['move','hit','attack'])assert(a.drawEnemy(ctx,w,{archetype:'chapter3-drone',age:1,x:80,y:220,action}));assert.equal(a.getMetrics().chapter3DroneDraws,3);assert.equal(a.getMetrics().silkTethers,0,'no whole-enemy rings or source-neutral tethers');
});
test('actual own damage material remains opaque and cache-bounded after complete lance detail is applied',async()=>{
 const im=await sources(),old=global.document;global.document={createElement(){return createCanvas(1,1)}};
 try{for(let i=12;i<18;i++){
  const p=global.HapilProjectiles.create(im),w=world(i),c=createCanvas(360,640),ctx=c.getContext('2d');
  for(const l of [0,7,18]){ctx.clearRect(0,0,360,640);p.beginFrame();assert(p.drawBullet(ctx,w,{x:150,y:300,r:6,halfLength:l,kind:l?'needle':'orb',angle:0,age:0}));
   for(let y=-4;y<=4;y++)for(let x=-l-3;x<=l+3;x++)if(Math.hypot(Math.max(0,Math.abs(x)-l),y)<=4)assert(ctx.getImageData(150+x,300+y,1,1).data[3]>=235,'source must visibly cover each interior damage pixel');
  }
  assert(p.drawHazardBody(ctx,w,{phase:'active',x1:230,y1:200,x2:230,y2:580,width:12,progress:0}));assert.equal(p.getMetrics().missingProjectileAssets,0);assert.equal(p.getMetrics().sourceBeamOverlayDraws,1);assert(p.getMetrics().stampCacheBytes<=4194304);p.destroy();
 }}finally{global.document=old;}
});
