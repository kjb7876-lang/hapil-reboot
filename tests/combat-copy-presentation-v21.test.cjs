'use strict';
// Source-pixel projection tests use explicitly authored copy records. They do
// not represent natural play, density certification, browser or phone timing.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),audit=require('../tools/audit-actual-projectiles-v20.cjs');
global.document={createElement(){return createCanvas(1,1)}};
for(const name of ['story-assets','boss-motion','actors','projectiles','boss-skills'])require('../src/'+name+'.js');
const media=require('../tools/read-media-registry.cjs')();
async function actorImages(group){const keys=group>=19?global.HapilStoryAssets.assetKeysForEncounter(group):group===12?global.HapilActors.cultAssetKeysForEncounter(12):group>=5?global.HapilActors.sinAssetKeysForEncounter(group):[global.HapilBossMotion.contracts[['violet','horn','balrog','mask','lucifer'][group]].key],images={};for(const key of keys)images[key]=await loadImage(path.join(root,media[key]));return images;}
function projection(w,modelActorId){return{id:'combat-copy-fixture-'+(modelActorId||'solo'),sourceActorId:'combat-copy-fixture-'+(modelActorId||'solo'),modelActorId,kind:'clone',x:90,y:174,born:0,expireAt:360,action:'attack',actionProgress:.5,releaseTick:60,opacity:.72};}
function countPixels(canvas){const rgba=canvas.getContext('2d').getImageData(0,0,360,640).data;let count=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>=24)count++;return count;}
test('combat projections reuse the exact active owner source and actual authored release poses without support bodies',async()=>{
 for(const [group,expected]of [[0,'bossMotionViolet'],[5,'sinBelphegorAtlas'],[11,'sinPrideCyborgAtlas'],[12,'cultLeaderAtlas'],[19,'storyGoblin'],[20,'storyKnightAttack'],[30,'storySirenAttack'],[35,'cultLeaderAtlas']]){
  const w=audit.phaseWorld(group,2,'hell');w.tick=60;const c=projection(w),images=await actorImages(group),actors=global.HapilActors.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),before=structuredClone(w);actors.beginFrame();assert.equal(actors.drawCombatCopy(ctx,w,c,.72),true,'own source draws group'+group);const m=actors.getMetrics(),p=m.lastCombatCopySamples[0];assert.equal(p.key,expected,'same owner active form '+group);assert.deepEqual(p.position,[90,174]);assert.equal(m.combatCopyDraws,1);assert.equal(m.combatCopyMissingAssets,0);assert.equal(m.silkTethers,0);assert.equal(m.storySupportDraws,0);assert.equal(m.storyParticipantDraws,0);assert.equal(m.fullAnimationCycles,0);assert(countPixels(canvas)>300,'real alpha pixels '+group);assert.deepEqual(w,before,'projection cannot alter combat world');
 }
});
test('two paired projections retain separate original models and material ownership after unique emitter IDs',async()=>{
 const group=34,w=audit.phaseWorld(group,2,'hell');w.tick=60;const images=await actorImages(group),actors=global.HapilActors.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d');actors.beginFrame();
 for(const [owner,key,palette]of [['han-rian','storyRianIdle','story-han-rian'],['baek-ion','storyIonIdle','story-baek-ion']]){
  const c=projection(w,owner);c.releaseTick=-1;c.x=owner==='han-rian'?90:270;assert(actors.drawCombatCopy(ctx,w,c,.72));const sample=actors.getMetrics().lastCombatCopySamples.at(-1);assert.equal(sample.key,key);assert.equal(sample.modelActorId,owner);assert.equal(global.HapilProjectiles.paletteFor(w,{sourceActorId:c.id,modelActorId:owner}).id,palette);
 }
 const m=actors.getMetrics();assert.equal(m.combatCopyDraws,2);assert.equal(m.storyParticipantDraws,0);assert.equal(m.storySupportDraws,0);assert.deepEqual(Object.keys(m.usedAssets).sort(),['storyIonIdle','storyRianIdle']);
 const missing=projection(w);assert.equal(actors.drawCombatCopy(ctx,w,missing,.72),false,'a paired projection without its owner cannot substitute either model');assert.equal(actors.getMetrics().combatCopyMissingAssets,1);
});
test('projection body begins and expires at exact core ticks and never invents geometry for missing own art',async()=>{
 const w=audit.phaseWorld(20,2,'hell'),images=await actorImages(20),actors=global.HapilActors.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),c=projection(w);c.born=100;c.expireAt=460;
 for(const tick of [99,100,459,460]){w.tick=tick;actors.beginFrame();ctx.clearRect(0,0,360,640);assert.equal(actors.drawCombatCopy(ctx,w,c,.72),tick>=100&&tick<460);assert.equal(actors.getMetrics().combatCopyDraws,tick>=100&&tick<460?1:0);assert.equal(countPixels(canvas)>0,tick>=100&&tick<460);}
 w.tick=150;w.stage='transition';assert.equal(actors.drawCombatCopy(ctx,w,c,.72),false);w.stage='boss';const absent=global.HapilActors.create({});absent.beginFrame();ctx.clearRect(0,0,360,640);assert.equal(absent.drawCombatCopy(ctx,w,c,.72),false);assert.equal(absent.getMetrics().combatCopyMissingAssets,1);assert.equal(countPixels(canvas),0,'missing source is not a geometric silhouette');
});
test('copy skill accents resolve the original paired owner but keep distinct committed emitter identities',async()=>{
 const w=audit.phaseWorld(34,2,'hell');w.tick=60;w.boss.action='recover';w.boss.participants.forEach(p=>p.action='recover');w.boss.skillReleases=[{tick:60,kind:'blade',patternId:'copy-fixture',x:90,y:174,sourceActorId:'copy-rian',modelActorId:'han-rian'},{tick:60,kind:'orb',patternId:'copy-fixture',x:270,y:174,sourceActorId:'copy-ion',modelActorId:'baek-ion'}];const images=await actorImages(34),fx=global.HapilBossSkills.create(images),canvas=createCanvas(360,640);try{fx.beginFrame();fx.draw(canvas.getContext('2d'),w,false);const m=fx.getMetrics();assert.equal(m.skillMissingAssets,0);assert(m.representedReleases.some(p=>p.sourceActorId==='copy-rian'&&p.modelActorId==='han-rian'&&p.sourceKey==='storyRianCross'));assert(m.representedReleases.some(p=>p.sourceActorId==='copy-ion'&&p.modelActorId==='baek-ion'&&p.sourceKey==='storyIonShield'));}finally{fx.destroy();}
});
test('wide source pressure ribbons retain their full active footprint in both qualities while ordinary lasers stay fully opaque',async()=>{
 const w=audit.phaseWorld(34,2,'hell'),images=await actorImages(34),fx=global.HapilProjectiles.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);let alphas=[];ctx.drawImage=function(...args){alphas.push(ctx.globalAlpha);return draw(...args);};
 // V23 keeps the3base sourcebands and4thmaterial draw. High quality adds
 // at most2source-flow draws and1clippedown-source emitter; these cosmetic
 // samples replace the obsolete exact4draw presentation assertion only.
 // Native CPU Canvas stores the public globalAlpha getter at 8-bit precision.
 const geometry={id:9001,x1:60,y1:0,x2:60,y2:640,width:100,phase:'active',progress:.5,age:1,sourceActorId:'copy-rian',modelActorId:'han-rian'},before=structuredClone(w);
 try{for(const low of [false,true])for(const pressureCurtain of [false,true]){const h={...geometry,pressureCurtain},unchanged=structuredClone(h);alphas=[];fx.beginFrame();assert(fx.drawHazardBody(ctx,w,h,low));assert.equal(alphas.length,low?4:6,'three own-source body bands, graded material and at most two source-flow samples plus one clipped emitter');const activeAlpha=pressureCurtain?.72:1;for(const alpha of alphas.slice(0,3))assert(Math.abs(alpha-activeAlpha)<1/255+1e-9,'every active source body sample keeps one stable pressure factor in both qualities');assert(Math.abs(alphas[3]-activeAlpha*(low?.92:1))<1/255+1e-9,'overlay keeps the existing bounded quality factor');const metrics=fx.getMetrics();assert.equal(metrics.beamFlowDraws,low?0:1);assert.equal(metrics.beamEmitterDraws,low?0:1);assert.equal(metrics.beamMaterialDraws,1);assert.deepEqual(h,unchanged,'display contrast does not change committed damage coordinates or timing');assert.equal(fx.getMetrics().missingProjectileAssets,0);}
  alphas=[];assert(fx.drawHazardBody(ctx,w,{...geometry,pressureCurtain:true,phase:'fade'},false));assert(alphas.slice(0,3).every(alpha=>Math.abs(alpha-.175)<1/255+1e-9),'harmless afterglow keeps the original fade clock');assert.deepEqual(w,before);
 }finally{ctx.drawImage=draw;fx.destroy();}
});
