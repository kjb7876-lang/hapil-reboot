'use strict';
// Actual core warning states; explicit immunity isolates the presentation.
// No natural-play, browser, device or GPU performance assertion.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..');global.window=global;global.document={createElement(){return createCanvas(1,1)}};
for(const file of ['media','weapon-patterns','core','story-assets','boss-motion','actors','projectiles','boss-skills','render'])require('../src/'+file+'.js');
const core=global.HapilCore,realProjectiles=global.HapilProjectiles;
const source=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),a=source.indexOf('  function mobileAssetKeys('),b=source.indexOf('\n  // Required actor',a),assetKeys=Function('global',source.slice(a,b)+';return mobileAssetKeys;')(global);
const imagesByGroup=new Map();
async function images(group){if(!imagesByGroup.has(group)){const value={};for(const key of assetKeys(group))value[key]=await loadImage(path.join(root,global.HapilMedia[key]));imagesByGroup.set(group,value);}return imagesByGroup.get(group);}
function phaseWorld(bossIndex,difficulty='hell',phase=2){let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,combatRevision:21,bossIndex,difficulty,seed:813,runId:'v22-warning-'+bossIndex+'-'+difficulty}),s=core.checkpoint(w);s.phase=phase;w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function advance(w,tick){while(w.tick<tick)core.step(w,{});return w;}
function renderer(art){const canvas=createCanvas(360,640);canvas.style={};const r=global.HapilRenderer.create(canvas,art);r.resize(360,640,1);return r;}
test('actual paired warnings retain the committed caster and palette slot used by their source beam',async()=>{
 const w=advance(phaseWorld(33),109),warnings=w.hazards.filter(h=>h.phase==='warning'),ion=warnings.find(h=>h.sourceActorId==='baek-ion');assert(ion,'the actual BaekIon cast is observed');
 const gold=realProjectiles.paletteFor(w),blue=realProjectiles.paletteFor(w,ion);assert.notEqual(blue.id,gold.id,'the retained owner palette differs');
 const calls=[];global.HapilProjectiles=Object.assign({},realProjectiles,{paletteFor(world,owner){if(owner)calls.push({owner,palette:realProjectiles.paletteFor(world,owner)});return realProjectiles.paletteFor(world,owner);}});
 const r=renderer(await images(34)),before=structuredClone(w);
 try{r.draw(w,0,w.time,false);for(const h of warnings){const call=calls.find(c=>c.owner===h);assert(call,'the displayed warning resolves its actual committed hazard owner');assert.equal(call.palette.id,realProjectiles.paletteFor(w,h).id);}
  assert(calls.some(c=>c.owner===ion&&c.palette.id===blue.id));assert.deepEqual(w,before);
 }finally{r.destroy();global.HapilProjectiles=realProjectiles;}
});
test('wide warnings expose exact capsule edges in all3 real profiles and retain their harmless-to-active boundary',async()=>{
 const profiles=new Set();for(const bossIndex of [0,1,2])for(const difficulty of ['gentle','normal','hell']){
  const w=advance(phaseWorld(bossIndex,difficulty),difficulty==='gentle'?162:150),r=renderer(await images(bossIndex)),before=structuredClone(w),h=w.hazards.filter(h=>h.pressureCurtain&&h.phase==='warning');assert(h.length);profiles.add(w.boss.combatPressure.profile);
  try{for(const low of [false,true]){r.draw(w,0,w.time,low);const m=r.getMetrics(),expected=w.hazards.filter(x=>x.phase==='warning'&&x.width>=18);assert.equal(m.warningFootprintDraws,expected.length);for(const e of expected){const p=m.warningFootprints.find(x=>x.id===e.id);assert(p);for(const k of ['x1','y1','x2','y2','width','activeAt'])assert.equal(p[k],e[k]);assert.equal(p.paletteId,realProjectiles.paletteFor(w,e).id);assert.equal(p.boundaryInset,p.boundaryDarkWidth/2,'keyline lies inside the actual collision capsule');assert(p.boundaryLightWidth<p.boundaryDarkWidth);assert.equal(p.damageGeometryOwnedByCore,true);}
   const builds=m.warningFootprintBuilds,prior=structuredClone(m.warningFootprints);for(let draw=0;draw<12;draw++)r.draw(w,0,w.time,low);assert.equal(r.getMetrics().warningFootprintBuilds,builds,'warm warnings reuse their bounded presentation records');assert.deepEqual(m.warningFootprints,prior,'diagnostic snapshot remains stable');assert.deepEqual(w,before);
  }
  core.step(w,{});assert(h.every(x=>x.phase==='active'),'actual core changes at the exact committed activation tick');r.draw(w,0,w.time,false);const m=r.getMetrics();assert(h.every(x=>!m.warningFootprints.some(y=>y.id===x.id)),'an active beam is not redrawn as a harmless warning');assert.equal(m.projectilePresentation.missingProjectileAssets,0);
  }finally{r.destroy();}
 }assert.deepEqual([...profiles].sort(),['horizontal','lattice','vertical']);
});
