'use strict';
// Resume the expensive source/render checks from actual core observations.
// Observations are disposable scratch data, bound to the persisted core SHA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const a=require('./audit-boss-identities-v25.cjs'),v24=require('./audit-object-projectiles-v24.cjs');
async function fittedRegression(box,old,collected,pixels){
  const cache=new Map(),rows=[],lookup=new Map(collected.routes.map(r=>[r.group+'|'+a.routeKey(r.bullet),r])),fast=require('./measure-identity-pixels-v25.cjs'),canvas=a.createCanvas(256,256);let group=-1,images,fx;
  try{for(const row of pixels.rows.filter(r=>r.changed&&!r.ownedObject&&r.measurement.fullDamageFraction<.9)){
    const route=lookup.get(row.group+'|'+row.routeKey);assert(route);
    if(row.group!==group){if(fx)fx.destroy();group=row.group;images=await a.imagesFor(box,row.group,cache,old);fx=old.HapilProjectiles.create(images);}
    const b={...route.bullet,x:128,y:128,px:128,py:128,angle:row.angle};if(b.kind==='hell-rotor')b.spinAngle=row.angle;
    const prior=fast.paint(old,fx,canvas,route.world,b,row.quality==='low'),m=fast.measure(prior,b);
    assert(row.measurement.fullDamageFraction>=m.fullDamageFraction-1e-12,'changed fitted source cannot reduce existing full damage visibility '+JSON.stringify({row,baseline:m}));
    rows.push({group:row.group,phase:route.first.phase,kind:b.kind,r:b.r,halfLength:b.halfLength||0,angle:row.angle,quality:row.quality,currentFullDamageFraction:row.measurement.fullDamageFraction,v24FullDamageFraction:m.fullDamageFraction,legacyLessThan90:true});
  }}finally{if(fx)fx.destroy();}
  return rows;
}
async function restoredPixels(box,old,collected,before){
  const saved=JSON.parse(a.source('docs/v25-qa/actual-source-pixels.json'));assert.deepEqual(saved.sourceHashes,before,'only resume exact frozen source pixels');const cache=new Map(),pictures=[],lookup=new Map(collected.routes.map(r=>[r.group+'|'+a.routeKey(r.bullet),r]));
  for(const row of saved.rows.filter(r=>r.changed&&r.angle===0&&r.quality==='high')){
    if(pictures.some(p=>p.group===row.group))continue;const route=lookup.get(row.group+'|'+row.routeKey);assert(route);const im=await a.imagesFor(box,row.group,cache,old),b={...route.bullet,x:128,y:128,px:128,py:128,angle:0};if(b.kind==='hell-rotor')b.spinAngle=0;
    const actual=v24.bulletPaint(box,im,route.world,b,false),baseline=v24.bulletPaint(old,im,route.world,b,false);assert.equal(a.sha(actual.data),row.pixelSHA256,'contact proof exactly matches recorded validated pixels');pictures.push({group:row.group,actual:actual.canvas,baseline:baseline.canvas});
  }
  return{rows:saved.rows,pictures,newOwnedVariants:saved.newOwnedVariants};
}
async function main(){
  const input=process.argv[2]||path.join(path.dirname(a.ROOT),'v25-collected-worlds.json'),before=a.hashes(),box=a.runtime(),old=a.runtime(a.BASE),collected=JSON.parse(fs.readFileSync(input)),actual=JSON.parse(a.source('docs/v25-qa/actual-emitted-routes.json'));
  assert.equal(actual.sourceHashes.core,before['src/core.js']);assert.equal(actual.sourceHashes.weapon,before['src/weapon-patterns.js']);
  for(const k of['scenes','castScenes','releaseScenes'])collected[k]=new Map(collected[k]);
  const pixels=process.argv.includes('--resume-pixels')?await restoredPixels(box,old,collected,before):await require('./measure-identity-pixels-v25.cjs').sourcePixels(box,old,collected);console.log(JSON.stringify({stage:'source-pixels',resumed:process.argv.includes('--resume-pixels'),cases:pixels.rows.length,newOwnedVariants:pixels.newOwnedVariants}));
  a.writeReport('docs/v25-qa/actual-source-pixels.json',{sourceHashes:before,minimumCentralFraction:Math.min(...pixels.rows.map(r=>r.measurement.centralFraction)),minimumNewWholeFraction:Math.min(...pixels.rows.filter(r=>r.changed&&r.ownedObject).map(r=>r.measurement.fullDamageFraction)),newOwnedVariants:pixels.newOwnedVariants,rows:pixels.rows});
  const legacyFitted=await fittedRegression(box,old,collected,pixels);a.writeReport('docs/v25-qa/fitted-geometry-compatibility.json',{criterion:'Every changed fitted damage body either has at least90%alpha128coverage in actual circle/capsule or preserves the prior v24 whole-hitbody coverage exactly; new whole objects always require90%. Historical lower-coverage cases remain explicitly listed.',sourceHashes:before,rows:legacyFitted});
  const rotations=await a.ownedRotations(box,old,collected,pixels);console.log(JSON.stringify({stage:'owned-rotation-subpixel',cases:rotations.length}));a.writeReport('docs/v25-qa/owned-rotation-subpixel.json',{sourceHashes:before,rows:rotations});
  const skills=await a.skillFrames(box,collected);console.log(JSON.stringify({stage:'actual-source-cues',cases:skills.rows.length}));a.writeReport('docs/v25-qa/actual-source-cues.json',{sourceHashes:before,rows:skills.rows});
  const scenes=await a.fullScenes(box,old,collected);console.log(JSON.stringify({stage:'full-scene-cpu',cases:scenes.rows.length}));a.writeReport('docs/v25-qa/full-scene-cpu.json',{scope:scenes.scope,sourceHashes:before,rows:scenes.rows});
  const proofs=[...a.sceneSheets(scenes.pictures),...a.objectSheets(pixels.pictures),...a.cueSheets(skills.pictures)];assert.deepEqual(a.hashes(),before,'frozen product sources changed during independent pixel/scene audit');
  const summary={schema:1,scope:'Independent native CPU, source-only actual-emitted projectiles and explicitly immune core phase observations. Ordinary-health input/replay, browser, softwareGPU/hardwareGPU, mobile emulation/device categories are separate.',baseline:a.BASE,sourceHashes:before,sourceHashGuardPassed:true,actualCases:collected.rows.length,actualRoutes:collected.routes.length,pixelCases:pixels.rows.length,ownedRotationSubpixelCases:rotations.length,skillFrames:skills.rows.length,legacyExactCases:JSON.parse(a.source('docs/v25-qa/legacy-exact.json')).rows.length,lustPhysicalExactCases:JSON.parse(a.source('docs/v25-qa/lust-physical-exact.json')).rows.length,deterministicCheckpointCases:JSON.parse(a.source('docs/v25-qa/checkpoint-determinism.json')).rows.length,fullSceneCases:scenes.rows.length,retainedLowerCoverageFittedCases:legacyFitted.length,proofs,reviewStatus:'pending root direct pixel review'};
  a.writeReport('docs/V25-INDEPENDENT-QA-20261031.json',summary);console.log(JSON.stringify(summary));
}
module.exports={fittedRegression,main};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
