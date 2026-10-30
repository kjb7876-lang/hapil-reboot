'use strict';
// Independent geometric measurements. Controlled phase/immune fixtures are not
// ordinary-health runs; those have their own persisted legal-input records.
const test=require('node:test'),assert=require('node:assert/strict');
const {raster,curtainFraction,phaseWorld}=require('../tools/audit-attack-coverage-v21.cjs');
const core=require('../src/core.js');
function fake(hazards=[],bullets=[]){return {hazards,bullets};}
function beam(x,width,phase='active'){return {x1:x,y1:0,x2:x,y2:640,width,phase};}
test('independent occupancy counts real active danger once and excludes warning/fade and empty visual space',()=>{
 const cross=fake([{...beam(90,180),pressureCurtain:true},{phase:'active',x1:0,y1:160,x2:680,y2:160,width:320,pressureCurtain:true,targetCoverage:.01}]);assert.equal(curtainFraction(cross),.75,'exact crossing rectangles count their overlap only once and ignore target metadata');assert.equal(curtainFraction(fake([{...beam(0,180),pressureCurtain:true}])),.25,'continuous union is clipped to actual map edges');
 const single=beam(90,180),exact=raster(fake([single]));assert.equal(exact.activeFraction,.5);assert.equal(exact.warningOnlyFraction,0);
 assert.equal(raster(fake([single,{...single}])).activeFraction,.5,'overlap cannot double area');
 const waiting=raster(fake([beam(90,180,'warning')]));assert.equal(waiting.activeFraction,0);assert.equal(waiting.warningOnlyFraction,.5);
 assert.equal(raster(fake([beam(90,180,'fade')])).activeFraction,0,'afterglow has no collision occupancy');
 const body=raster(fake([],[{x:180,y:320,px:0,py:0,r:8,halfLength:0,angle:0}]),{step:2});assert(Math.abs(body.activeFraction-Math.PI*64/(360*640))<.0001,'circle uses actual radius, not sprite bbox/forecast/player inflation');
 const blade=raster(fake([],[{x:180,y:320,px:180,py:320,r:4,halfLength:13,angle:Math.PI/2}]),{step:2});assert(blade.activeFraction>body.activeFraction,'real oriented capsule length contributes');
});
test('all35 encounters and105phase configurations have real66/44/22 active curtains with bounded pools',()=>{
 const targets={gentle:.22,normal:.44,hell:.66};let cases=0;
 for(let boss=0;boss<35;boss++)for(let phase=0;phase<3;phase++)for(const mode of ['gentle','normal','hell']){
  const w=phaseWorld(core,boss,phase,mode,21);while(w.tick<240)core.step(w,{});assert.equal(w.combatRevision,21);
  const curtains=w.hazards.filter(h=>h.pressureCurtain);assert([3,6].includes(curtains.length));assert(curtains.every(h=>h.phase==='active'&&h.width>0));
  const independent=raster(w,{step:4,onlyPattern:h=>h.pressureCurtain===true});assert(Math.abs(curtainFraction(w)-targets[mode])<1e-12,'continuous actual capsule rectangle union has exact target area: '+[boss,phase,mode]);assert(Math.abs(independent.activeFraction-targets[mode])<=.023,'4px samples converge within explicit grid quantization: '+[boss,phase,mode,independent.activeFraction]);
  const all=raster(w,{step:8}),reported=core.attackCoverage(w,{step:8});assert.equal(all.activeFraction,reported.ratio,'separately implemented grid agrees with diagnostics');
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);assert(w.bullets.length<=768);assert(w.hazards.length<=40);cases++;
 }assert.equal(cases,315);
});
test('a committed pressure warning keeps exact geometry until its six-second active window ends',()=>{
 for(const mode of ['gentle','normal','hell']){
  const w=phaseWorld(core,0,2,mode,21);while(w.tick<61)core.step(w,{});const initial=w.hazards.filter(h=>h.pressureCurtain).map(h=>structuredClone(h));assert([3,6].includes(initial.length));const start=initial[0].activeAt,end=initial[0].fadeAt;assert.equal(end-start,360);
  for(const tick of [start-1,start,end-1,end]){while(w.tick<tick)core.step(w,{});for(const a of initial){const b=w.hazards.find(h=>h.id===a.id);assert(b);for(const k of ['x1','y1','x2','y2','width','activeAt','fadeAt'])assert.equal(b[k],a[k]);assert.equal(b.phase,tick<start?'warning':tick<end?'active':'fade');}const only=raster(w,{onlyPattern:h=>h.pressureCurtain===true});if(tick<start||tick>=end)assert.equal(only.activeFraction,0);else assert(curtainFraction(w)>=.2199999999);}
 }
});
test('own-body send-out illusions and two real-firing clones have exact lifetime and never copy protected link targets',()=>{
 const allowed=new Set([...Array.from({length:12},(_,i)=>i),18,19,20,29,30,33,34]);
 for(let boss=0;boss<35;boss++){
  const w=phaseWorld(core,boss,2,'hell',21);let illusions=null,clones=null,realSources=new Set();
  for(let tick=1;tick<=511;tick++){core.step(w,{});const c=w.boss.combatCopies||[];assert(c.length<=2);
   if(tick===31)illusions=c.map(p=>structuredClone(p));if(tick===151)clones=c.map(p=>structuredClone(p));
   for(const b of w.bullets)if(b.sourceActorId&&String(b.sourceActorId).startsWith('combat-copy-'))realSources.add(b.sourceActorId);
   if(tick===150&&allowed.has(boss))assert.equal(c.length,2,'illusion survives until last tick');if(tick===510&&allowed.has(boss))assert.equal(c.length,2,'clone survives359ticks');if(tick===511)assert.equal(c.length,0,'clone removed at its exact360tick boundary');
  }
  if(allowed.has(boss)){assert.equal(illusions.length,2);assert(illusions.every(c=>c.kind==='illusion'&&c.expireAt-c.born===120));assert.equal(clones.length,2);assert(clones.every(c=>c.kind==='clone'&&c.expireAt-c.born===360));for(const c of [...illusions,...clones])assert(realSources.has(c.sourceActorId),'copy itself emits real own-source projectiles '+boss+'/'+c.kind);}
  else{assert.equal(illusions.length,0);assert.equal(clones.length,0);assert.equal(realSources.size,0,'controller links/memories/protected cores are not invented people');}
 }
});
test('ordinary enemies commit exactly70percent of each difficulty boss curtain area after an existing hostile source is present',()=>{
 const targets={gentle:.154,normal:.308,hell:.462};let checked=0;
 for(let boss=0;boss<35;boss++)for(const mode of ['gentle','normal','hell']){
  let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:boss,difficulty:mode,combatRevision:21,seed:813,runId:'v21-wave-area-qa'});const snap=core.checkpoint(w);snap.practiceBoss=false;snap.stage='waves';snap.wave=0;snap.phase=0;w=core.restoreCheckpoint(snap);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
  while(w.tick<150)core.step(w,{});const promised=w.hazards.filter(h=>h.pressureCurtain);assert([3,6].includes(promised.length));const owner=w.enemies.find(e=>e.id===promised[0].ownerId);if(boss<18)assert(owner&&owner.age>=1.2&&owner.y>=0,'real visible enemy commits the warning');else{assert.equal(promised[0].ownerId,0);assert(w.bullets.length>0,'later story uses already-hostile command/shard material, not invented human enemies');assert.equal(w.enemies.length,0);}
  while(w.tick<300)core.step(w,{});assert.equal(w.stage,'waves');assert(Math.abs(curtainFraction(w)-targets[mode])<1e-12,'70percent of matching boss target, not70percent of map');assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);checked++;
 }assert.equal(checked,105);
});
test('standing in the real central curtain takes damage on activeAt and never during its warning',()=>{
 const w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:0,difficulty:'hell',combatRevision:21,seed:813,runId:'v21-curtain-real-damage'});w.autoAttack=false;w.skillRotation=false;
 while(w.tick<61)core.step(w,{});const h=w.hazards.find(h=>h.pressureCurtain);assert(h);assert.equal(w.player.x,180);const hp=w.player.hp;
 while(w.tick<h.activeAt-1)core.step(w,{});assert.equal(w.player.hp,hp);assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);
 core.step(w,{});assert.equal(w.tick,h.activeAt);assert.equal(w.player.hp,hp-1);assert.equal(w.stats.hits,1);assert.equal(w.hazards.find(x=>x.id===h.id).phase,'active');
});
