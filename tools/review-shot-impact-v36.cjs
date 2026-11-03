'use strict';
// Identical real fixed-step combat states. Native renderer.draw timings omit
// image readback and do not establish GPU, physical-mobile or universal FPS.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const a=require('./audit-object-projectiles-v24.cjs'),m=require('./review-mobile-render-v30.cjs');
const BASE='f616a344cfdc03af2bbc7cf98a17e2126123a4c0',FILES=['src/core.js','src/render.js','src/combat-presentation-v36.js','src/projectiles.js','src/actors.js','src/story-assets.js','src/media.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function hashes(){return Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(a.ROOT,f)))]));}
function world(box,index=8,phase=2,revision=31){
 const C=box.HapilCore,first=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'v36-real-contact-review-'+index}),s=C.checkpoint(first);s.phase=phase;
 const w=C.restoreCheckpoint(s);w.autoAttack=true;w.skillRotation=true;w.player.invulnerableUntil=999999;return w;
}
function freshEvents(frame,tick,kind){return frame.events.filter(e=>e.serial&&e.tick===tick&&(!kind||e.kind===kind));}
function prepare(box,old,index=8,minimumTick=295){
 const w=world(box,index),prior=world(old,index),C=box.HapilCore,O=old.HapilCore,frame=C.getCombatPresentation(w);assert(frame&&frame.capacity===64);
 let contact=null;
 for(let n=0;n<600;n++){
  C.step(w,{});O.step(prior,{});if(n%60===0)assert.equal(JSON.stringify(w),JSON.stringify(prior),'presentation channel changed real combat');
  const hit=freshEvents(frame,w.tick,'impact')[0];
  if(w.tick>=minimumTick&&hit&&!hit.killed&&w.shots.length>=3){contact={...hit};break;}
 }
 assert(contact,'fixture must observe a real nonlethal shot contact');
 // Three fixed ticks retain the short contact burst while the next ordinary
 // shot also supplies a real muzzle cue in these deterministic fixtures.
 for(let n=0;n<3;n++){C.step(w,{});O.step(prior,{});}
 assert.equal(JSON.stringify(w),JSON.stringify(prior),'before and after must use identical raw worlds');
 return {world:w,beforeWorld:prior,frame,contact};
}
function prepareWave(box,old,killed=false){
 function initial(b){const w=b.HapilCore.createRun({campaign:true,campaignRevision:5,combatRevision:31,practiceBoss:false,difficulty:'hell',seed:813,runId:'v36-real-wave-review'});w.autoAttack=true;w.skillRotation=true;w.player.invulnerableUntil=999999;return w;}
 const w=initial(box),prior=initial(old),frame=box.HapilCore.getCombatPresentation(w);let contact=null;
 for(let n=0;n<900;n++){
  box.HapilCore.step(w,{});old.HapilCore.step(prior,{});
  const hit=freshEvents(frame,w.tick,'impact').find(e=>e.killed===killed&&e.y>90&&e.y<500);
  if(w.stage==='waves'&&hit){contact={...hit};break;}
 }
 assert(contact,'a real visible wave enemy must receive the observed shot');
 for(let n=0;n<(killed?9:3);n++){box.HapilCore.step(w,{});old.HapilCore.step(prior,{});}
 assert.equal(JSON.stringify(w),JSON.stringify(prior));return {world:w,beforeWorld:prior,frame,contact};
}
function distribution(values){const s=values.slice().sort((a,b)=>a-b);return {frames:s.length,medianMs:s[Math.floor(s.length/2)],p95Ms:s[Math.floor(s.length*.95)]};}
function measure(before,after,bw,aw,low=true){
 const samples={before:[],after:[]},draw={before:()=>before.renderer.draw(bw,0,bw.time,low,{precise:true}),after:()=>after.renderer.draw(aw,0,aw.time,low,{precise:true})};
 for(let n=0;n<8;n++){draw.before();draw.after();}
 for(let block=0;block<10;block++)for(const arm of(block%2?['after','before']:['before','after']))for(let n=0;n<6;n++){const start=performance.now();draw[arm]();samples[arm].push(performance.now()-start);}
 return {before:distribution(samples.before),after:distribution(samples.after)};
}
function workload(world,output){
 const p=output.metrics.projectilePresentation;
 return {shots:world.shots.length,bullets:world.bullets.length,effects:world.effects.length,logicalLasers:p.assetLaserDraws,hostileStamps:p.stampDraws,hostileMissing:p.missingProjectileAssets,hostileStampCacheBytes:p.stampCacheBytes,combat:output.metrics.combatPresentation||null};
}
function picture(ctx,canvas,x,y,width=360,height=640){ctx.drawImage(canvas,x,y,width,height);}
async function main(){
 const initial=hashes(),box=a.runtime(),old=a.runtime(BASE),cache=new Map(),rows=[],directory=path.join(a.ROOT,'docs/v36');
 assert(box.HapilCombatPresentationV36,'actual runtime loader must register combat presentation');fs.mkdirSync(directory,{recursive:true});
 const overview=m.createCanvas(1440,1390),oc=overview.getContext('2d'),detail=m.createCanvas(1440,920),dc=detail.getContext('2d');oc.fillStyle=dc.fillStyle='#10131c';oc.fillRect(0,0,overview.width,overview.height);dc.fillRect(0,0,detail.width,detail.height);oc.font='18px sans-serif';dc.font='16px sans-serif';
 const cases=[[8,'lust','Lust / wind arrow'],[18,'hando','Hando / blade'],[21,'seoha','Seoha / radiant slash'],[33,'pair','Rian + Ion / Hando']];
 for(const [slot,[index,id,name]]of cases.entries()){
  const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},old),scene=prepare(box,old,index),w=scene.world,bw=scene.beforeWorld,before=m.fixture(old,images),after=m.fixture(box,images),state=JSON.stringify(w),baselineState=JSON.stringify(bw),qualities=[];
  try{
   for(const low of[true,false]){
    for(let n=0;n<4;n++){before.draw(bw,low);after.draw(w,low);}
    const allocated=box.allocated.length,b=before.draw(bw,low),d=after.draw(w,low),f=d.metrics.combatPresentation,pixels=m.difference(b.pixels,d.pixels);
    assert.equal(box.allocated.length,allocated);assert.equal(JSON.stringify(w),state);assert.equal(JSON.stringify(bw),baselineState);assert(f&&f.shotDraws===w.shots.length,'every friendly projectile must render');assert(f.impactDraws>0,'the real collision must be visible');assert.equal(f.missingAssets,0);assert(f.cacheBytes<=1048576);assert.equal(d.metrics.projectilePresentation.missingProjectileAssets,0);assert.equal(d.metrics.projectilePresentation.assetLaserDraws,b.metrics.projectilePresentation.assetLaserDraws);assert.equal(d.metrics.projectilePresentation.stampDraws,b.metrics.projectilePresentation.stampDraws);assert(pixels.changedPixels>20);
    const timings=measure(before,after,bw,w,low);qualities.push({quality:low?'low':'high',difference:pixels,before:workload(bw,b),after:workload(w,d),timings,warmCanvasAllocations:box.allocated.length-allocated});
    if(low){
     const files=[];
     for(const [version,fixture]of[['before35',before],['after36',after]]){
      fixture.draw(version==='before35'?bw:w,true);const bytes=fixture.canvas.toBuffer('image/png'),file=id+'-'+version+'.png';fs.writeFileSync(path.join(directory,file),bytes);files.push({version,file,sha256:sha(bytes)});
      const x=slot%2*720+(version==='after36'?360:0),y=Math.floor(slot/2)*695;picture(oc,fixture.canvas,x,y+40);oc.fillStyle='#eee0c9';oc.fillText(name+' · '+version,x+8,y+25);
      const qx=slot%2*720+(version==='after36'?360:0),qy=Math.floor(slot/2)*460,shot=w.shots.find(s=>s.kind==='memory')||w.shots[0];dc.fillStyle='#eee0c9';dc.fillText(name+' · '+version,qx+8,qy+24);dc.drawImage(fixture.canvas,Math.max(0,scene.contact.x-60),Math.max(64,scene.contact.y-50),120,100,qx+12,qy+42,336,280);dc.drawImage(fixture.canvas,120,Math.max(64,shot.y-20),120,40,qx+12,qy+340,336,112);
     }
     qualities[qualities.length-1].files=files;
    }
   }
   rows.push({bossIndex:index,name,tick:w.tick,phase:w.phase,worldSHA256:sha(state),beforeWorldSHA256:sha(baselineState),actualContact:scene.contact,privateEventSerial:scene.frame.serial,qualities,worldsByteIdentical:state===baselineState,renderWorldsUnchanged:true});
  }finally{before.close();after.close();}
 }
 assert.deepEqual(hashes(),initial,'product changed while visual proof ran');
 const recovery=m.createCanvas(1440,760),rc=recovery.getContext('2d'),recoveryRows=[];rc.fillStyle='#10131c';rc.fillRect(0,0,recovery.width,recovery.height);rc.font='16px sans-serif';
 for(const [slot,[index,id,name]]of cases.entries()){
  const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},old),scene=prepare(box,old,index,530),w=scene.world,bw=scene.beforeWorld,before=m.fixture(old,images),after=m.fixture(box,images),state=JSON.stringify(w);
  try{for(let n=0;n<4;n++){before.draw(bw,true);after.draw(w,true);}const output=after.draw(w,true);assert(output.metrics.combatPresentation.impactDraws>0);assert.equal(JSON.stringify(w),state);
   for(const [version,fixture]of[['before35',before],['after36',after]]){const x=slot%2*720+(version==='after36'?360:0),y=Math.floor(slot/2)*380;rc.fillStyle='#eee0c9';rc.fillText(name+' · '+version+' · tick'+w.tick,x+8,y+24);rc.drawImage(fixture.canvas,Math.max(0,scene.contact.x-60),Math.max(64,scene.contact.y-55),120,110,x,y+40,360,330);}
   recoveryRows.push({bossIndex:index,tick:w.tick,actualContact:scene.contact,hostileLasers:w.hazards.length,bullets:w.bullets.length,worldSHA256:sha(state),worldsByteIdentical:state===JSON.stringify(bw),combat:output.metrics.combatPresentation});
  }finally{before.close();after.close();}
 }
 const wave=m.createCanvas(1440,680),wc=wave.getContext('2d'),waveDetail=m.createCanvas(1440,460),wd=waveDetail.getContext('2d'),waveRows=[];wc.fillStyle=wd.fillStyle='#10131c';wc.fillRect(0,0,wave.width,wave.height);wd.fillRect(0,0,waveDetail.width,waveDetail.height);wc.font=wd.font='16px sans-serif';
 for(const [slot,killed]of[false,true].entries()){
  const images=await a.imagesFor(box,0,cache,{},old),scene=prepareWave(box,old,killed),w=scene.world,bw=scene.beforeWorld,before=m.fixture(old,images),after=m.fixture(box,images),state=JSON.stringify(w);
  try{for(let n=0;n<4;n++){before.draw(bw,true);after.draw(w,true);}const output=after.draw(w,true);assert(killed?output.metrics.combatPresentation.defeatDraws>0:output.metrics.combatPresentation.impactDraws>0);assert.equal(JSON.stringify(w),state);
   for(const [version,fixture]of[['before35',before],['after36',after]]){const x=slot*720+(version==='after36'?360:0),name=killed?'Actual enemy defeat':'Actual nonlethal enemy hit';wc.fillStyle=wd.fillStyle='#eee0c9';wc.fillText(name+' · '+version,x+8,25);wd.fillText(name+' · '+version,x+8,25);picture(wc,fixture.canvas,x,40);const cx=killed?scene.contact.targetX:scene.contact.x,cy=killed?scene.contact.targetY:scene.contact.y;wd.drawImage(fixture.canvas,Math.max(0,cx-60),Math.max(64,cy-70),120,140,x,40,360,420);}
   waveRows.push({kind:killed?'defeat':'nonlethal',tick:w.tick,actualContact:scene.contact,worldSHA256:sha(state),worldsByteIdentical:state===JSON.stringify(bw),enemyCount:w.enemies.length,effects:w.effects.map(e=>({kind:e.kind,x:e.x,y:e.y,age:e.age,ttl:e.ttl})),combat:output.metrics.combatPresentation});
  }finally{before.close();after.close();}
 }
 assert.deepEqual(hashes(),initial,'product changed while supplementary proofs ran');
 const pictures=[];for(const [file,canvas]of[['shot-impact-before-after.png',overview],['shot-impact-detail.png',detail],['contact-recovery.png',recovery],['enemy-hit-defeat-before-after.png',wave],['enemy-hit-defeat-detail.png',waveDetail]]){const bytes=canvas.toBuffer('image/png');fs.writeFileSync(path.join(directory,file),bytes);pictures.push({file,sha256:sha(bytes),width:canvas.width,height:canvas.height});}
 const report={schema:1,baseline:BASE,scope:'Identical raw actual current31/baseline fixed-step boss and wave worlds, campaign5, HELL, phase2 bosses, seed813, real auto attack and skill rotation enabled; explicit player immunity fixture only. Each contact is an actual consumed shot selected by core. Native Canvas renderer.draw submission only,60draws per arm, alternating blocks after warmup; image readback excluded. Not a natural clear, browser/device FPS or GPU completion measure.',sourceHashes:initial,pictures,summary:{scenes:rows.length,qualityCases:rows.length*2,recoveryContactScenes:recoveryRows.length,waveHitAndDefeatScenes:waveRows.length,allWorldsByteIdentical:true,missingAssets:0,warmCanvasAllocations:0,maxCombatCacheBytes:Math.max(...rows.flatMap(r=>r.qualities.map(q=>q.after.combat.cacheBytes)))},rows,recoveryRows,waveRows};
 fs.writeFileSync(path.join(directory,'scene-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,rows:rows.map(r=>({name:r.name,tick:r.tick,contact:r.actualContact,qualities:r.qualities.map(q=>({quality:q.quality,combat:q.after.combat,timings:q.timings}))}))}));return report;
}
module.exports={BASE,FILES,hashes,world,prepare,prepareWave,measure,workload,main};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
