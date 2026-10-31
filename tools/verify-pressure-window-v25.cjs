'use strict';
// Reuse the independent v21 capsule/union audit without changing its geometry
// or thresholds. This is a CPU/immune observation, not a screen/FPS promise.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const audit=require('./audit-attack-coverage-v21.cjs'),core=require('../src/core.js');
const root=path.resolve(__dirname,'..');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const sourceFiles=['src/core.js','src/weapon-patterns.js','src/boss-skills.js'];
const hashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,sha(file)]));
const before=hashes(),observations={ticks:0,maxBullets:0,maxHazards:0,maxPendingIdentityWarnings:0,maxIdentityCastHistory:0,checkedCurtainGeometryTicks:0};
const committed=new WeakMap();
function capsuleContract(h){return JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.warningTicks,h.activeTicks,h.fadeTicks,h.born,h.activeAt,h.fadeAt,h.expireAt]);}
const observed={...core,step(w,input,dt){
  const result=core.step(w,input,dt);observations.ticks++;
  observations.maxBullets=Math.max(observations.maxBullets,w.bullets.length);observations.maxHazards=Math.max(observations.maxHazards,w.hazards.length);
  observations.maxPendingIdentityWarnings=Math.max(observations.maxPendingIdentityWarnings,(w._identityPlans||[]).length);
  observations.maxIdentityCastHistory=Math.max(observations.maxIdentityCastHistory,w.boss?(w.boss.identityCasts||[]).length:0);
  let records=committed.get(w);if(!records){records=new Map();committed.set(w,records);}
  for(const h of w.hazards)if(h.pressureCurtain){
    const value=capsuleContract(h);if(!records.has(h.id))records.set(h.id,value);else assert.equal(value,records.get(h.id),'pressure capsule moved after its warning');
    assert.equal(h.activeTicks,w.stage==='waves'?180:360);assert.equal(h.activeAt-h.born,w.difficulty==='gentle'?102:90);
    assert.equal(h.phase,w.tick<h.activeAt?'warning':w.tick<h.fadeAt?'active':'fade');observations.checkedCurtainGeometryTicks++;
  }
  if(w.stage==='boss'&&w.boss)for(const c of w.boss.identityCasts||[]){assert.equal(c.activeAt-c.warningAt,54);assert.ok(w.tick<c.expireAt,'expired identity cue survives in live boss');if(w.tick>=c.activeAt)assert.ok(c.cancelled===true||c.releaseTick===c.activeAt,'identity cue never resolved at its known boundary');else assert.equal(c.releaseTick,undefined);}
  return result;
}};
const rows=audit.inspect({core:observed,combatRevision:25,phases:[2],ticks:1440,sampleEvery:24,step:8});
const waveRows=audit.inspectWaves({core:observed,combatRevision:25,ticks:1800,sampleEvery:24,step:8});
function exactTarget(row,wave){const target={gentle:.22,normal:.44,hell:.66}[row.difficulty]*(wave?.70:1),a=row.exactCurtainAreaFraction;return a.samples>0&&Math.abs(a.min-target)<1e-10&&Math.abs(a.max-target)<1e-10;}
const cancellations=[];
const presentationSource=fs.readFileSync(path.join(root,'src/boss-skills.js'),'utf8');
const presentationCancellationGuards={bossStageRequired:presentationSource.includes("world.stage !== 'boss'"),cancelledPlansSkipped:presentationSource.includes('!plan||plan.cancelled||')};
for(const index of [0,5,6,18,19,20,29,30,33,34]){
  const w=audit.phaseWorld(core,index,0,'hell',25);
  while(!(w._identityPlans||[]).length)core.step(w,{});
  const defeated=w.boss,pending=JSON.parse(JSON.stringify(w._identityPlans)),ids=new Set(pending.map(p=>p.cast.id)),lastActive=Math.max(...pending.map(p=>p.cast.activeAt));
  const shotsBefore=w.shots.length;
  // Explicit controlled defeat fixture. One friendly shot of boss HP is not
  // ordinary damage/play and is used only to exercise the real hitTarget path.
  w.shots.push({id:++w.idCounter,x:w.boss.x,y:w.boss.y,px:w.boss.x,py:w.boss.y,vx:0,vy:0,r:2,age:0,ttl:1,damage:w.boss.hp,kind:'basic',angle:-Math.PI/2});
  core.step(w,{});assert.ok(w.stage==='transition'||w.stage==='boss'&&w.boss.id!==defeated.id,'defeated actor either drains existing danger or reaches the next safe phase');assert.equal((w._identityPlans||[]).length,0);
  assert.ok(defeated.identityCasts.filter(c=>ids.has(c.id)).every(c=>c.cancelled===true));
  let phantomBorn=0,phantomCuePlans=0,phantomReleaseEvents=0;
  while(w.tick<=lastActive+12){
    phantomBorn+=w.bullets.filter(b=>ids.has(b.identityCastId)).length;
    if(w.stage==='boss'&&w.boss){phantomCuePlans+=(w.boss.identityCasts||[]).filter(c=>ids.has(c.id)&&!c.cancelled&&w.tick>=c.warningAt&&w.tick<c.activeAt).length;phantomReleaseEvents+=(w.boss.skillReleases||[]).filter(e=>ids.has(e.identityCastId)).length;}
    core.step(w,{});
  }
  assert.equal(phantomBorn,0);assert.equal(phantomCuePlans,0);assert.equal(phantomReleaseEvents,0);
  cancellations.push({bossIndex:index,pendingAtDefeat:pending.length,firstWarningAt:Math.min(...pending.map(p=>p.cast.warningAt)),immediateNextSafePhase:w.boss&&w.boss.id!==defeated.id,lastCommittedActiveAt:lastActive,observedThrough:w.tick,phantomIdentityBulletObservations:phantomBorn,phantomLiveSourceCuePlans:phantomCuePlans,phantomActualReleaseEvents:phantomReleaseEvents,fixture:'immune world, outgoing automatic damage off; one injected friendly shot equal to boss HP exercises actual defeat path',priorFriendlyShots:shotsBefore});
}
const after=hashes(),validation={bossCases105:rows.length===105,waveCases105:waveRows.length===105,allBossExactActiveWindowTargets:rows.every(r=>exactTarget(r,false)),allWaveExact70PercentTargets:waveRows.every(r=>exactTarget(r,true)),allThreeCurtainProfilesEachBossCase:rows.every(r=>JSON.stringify(r.activeProfiles)===JSON.stringify(['horizontal','lattice','vertical'])),noPoolPressureOrDroppedGroups:rows.concat(waveRows).every(r=>r.poolPressure===0&&r.droppedGroups===0),capacityBounds:observations.maxBullets<=768&&observations.maxHazards<=40,maxPendingWarningsFour:observations.maxPendingIdentityWarnings<=4,castHistoryEight:observations.maxIdentityCastHistory<=8,defeatCancelsPendingWithoutPhantomBulletsOrCuePlans:cancellations.every(r=>r.phantomIdentityBulletObservations===0&&r.phantomLiveSourceCuePlans===0&&r.phantomActualReleaseEvents===0),presentationCancellationGuardsPresent:Object.values(presentationCancellationGuards).every(Boolean),sourceHashGuard:JSON.stringify(before)===JSON.stringify(after)};
const report={schema:1,createdAt:new Date().toISOString(),scope:'Independent CPU geometric active-window audit reused from tools/audit-attack-coverage-v21.cjs; combatRevision25. Controlled checkpoints, automatic player damage/skills off, immunity999999. Not natural completion, rendered attack pressure, browser/GPU/phone/FPS validation, or an all-time screen occupancy promise.',sampling:{step:8,sampleEvery:24,bossPhase:2,bossTicks:1440,waveMaxTicks:1800},exactTargets:{boss:{hell:.66,normal:.44,gentle:.22},approachMultiplier:.70,comparisonTolerance:1e-10,meaning:'Continuous union of actual active axis-aligned full-span curtain collision capsules clipped to360x640. Other bullets/rays can add area; warning/fade omitted.'},sourceHashes:before,sourceHashesAfter:after,observations,validation,presentationCancellationGuards,presentationCancellationScope:'CPU plan/event observation plus inspection of renderer cancellation/stage guards. This followup does not assert actual pixel rendering of cancelled cues.',initialProbeCorrection:'The initial defeat fixture required a transition stage. A clear phase with no live danger may legitimately advance immediately to its next safe phase. The fixture now checks the defeated actor and cast IDs across either path; product code and pass thresholds were unchanged. Initial failure log retained.',cancellations,rows,waveRows};
const output=path.join(root,'docs/V25-PRESSURE-WINDOW-COVERAGE-20261031.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,validation,observations,geometricRanges:{boss:Object.fromEntries(['hell','normal','gentle'].map(d=>[d,{min:Math.min(...rows.filter(r=>r.difficulty===d).map(r=>r.exactCurtainAreaFraction.min)),max:Math.max(...rows.filter(r=>r.difficulty===d).map(r=>r.exactCurtainAreaFraction.max))}])),wave:Object.fromEntries(['hell','normal','gentle'].map(d=>[d,{min:Math.min(...waveRows.filter(r=>r.difficulty===d).map(r=>r.exactCurtainAreaFraction.min)),max:Math.max(...waveRows.filter(r=>r.difficulty===d).map(r=>r.exactCurtainAreaFraction.max))}]))}},null,2));
assert.ok(Object.values(validation).every(Boolean),'see exact failed verification in report');
