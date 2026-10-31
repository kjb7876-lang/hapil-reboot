'use strict';
// Independent CPU fixtures. Ordinary-health input runs are reported separately.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='7c3acd7e154e08444236395eb316fb678bc01568';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const FILES=['src/core.js','src/boss-lasers-v28.js','src/boss-patterns-v27.js','src/weapon-patterns.js','src/projectiles.js','src/boss-skills.js','src/storage.js','src/app.js','src/render.js','src/actors.js','src/story-assets.js','src/media.js','index.html','styles.css','tools/audit-laser-barrages-v28.cjs','tests/independent-laser-barrages-v28.test.cjs','tools/probe-identities-v25-natural.cjs','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs'];
function hashes(){return Object.fromEntries(FILES.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));}
function world(C,index=0,phase=0,difficulty='hell',revision=28,{immune=true}={}){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:`independent28-${index}-${phase}-${difficulty}`}),boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);assert.equal(w.stage,'boss');assert.equal(w.phase,phase);if(immune){w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;}return w;
}
function oldCore(){const box={module:{exports:{}},require:name=>require(path.join(ROOT,'src',name))};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/core.js'],{cwd:ROOT,encoding:'utf8'}),box);return box.module.exports;}
function locked(h){return JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.born,h.warningTicks,h.activeAt,h.fadeAt,h.expireAt,h.sourcePhase,h.sourceActorId,h.modelActorId,h.chainId,h.v28BarrageId,h.v28Segment]);}
function expectedPhase(h,tick){return tick<h.activeAt?'warning':tick<h.fadeAt?'active':'fade';}
function geometricDiversity(C){
  const L=require('../src/boss-lasers-v28.js'),keys=['x','y','x2','y2','width','warningTicks','staggerTicks','activeTicks','fadeTicks','v28Segment'],seen=new Map(),rows=[];let pianoPrograms=0,reflectedPrograms=0;
  for(let index=0;index<35;index++){
    const phases=[];
    for(const phase of [0,1,2]){
      const w=world(C,index,phase),beats=[];
      for(let beat=0;beat<3;beat++){
        const specs=L.makeBarrage(w,{x:180,y:130},beat,{phase});assert(specs.length>0&&specs.length<=8);
        if(specs.some(s=>s.v28Reflected))reflectedPrograms++;if(specs.some(s=>s.v28LaneIndex!=null))pianoPrograms++;
        beats.push(specs.map(s=>keys.map(k=>typeof s[k]==='number'?Math.round(s[k]*1e7)/1e7:s[k]===undefined?null:s[k])));
      }
      phases.push(JSON.stringify(beats));
    }
    assert(new Set(phases).size>=2,'actual phase geometry/clocks must change '+index);const signature=JSON.stringify(phases);assert(!seen.has(signature),'bosses share one physical laser program '+index+'/'+seen.get(signature));seen.set(signature,index);rows.push({bossIndex:index,physicalLaserProgramSHA256:sha(signature),distinctPhasePrograms:new Set(phases).size});
  }
  assert(pianoPrograms>0&&reflectedPrograms>0);return {bossConfigurations:35,uniquePhysicalLaserPrograms:seen.size,minimumDistinctPhasePrograms:Math.min(...rows.map(r=>r.distinctPhasePrograms)),pianoPrograms,reflectedPrograms,excludedFromSignatures:['name','profile ID','source artwork','identityRole','mode label'],rows};
}
function validateGeometry(h){
  assert([h.x1,h.y1,h.x2,h.y2,h.width].every(Number.isFinite),'laser endpoints and physical width must be finite');assert(h.width>0&&h.width<=64,'new laser width must remain a bounded capsule');
  const minimum=h.v28Reflected&&h.v28Segment===0?12:Math.max(24,h.width*3);assert(Math.hypot(h.x2-h.x1,h.y2-h.y1)>=minimum-1e-7,'new visible beam must retain meaningful finite length');
  assert(h.x1>=-1&&h.x1<=361&&h.x2>=-1&&h.x2<=361&&h.y1>=-1&&h.y1<=641&&h.y2>=-1&&h.y2<=641,'finite ray must stop on the actual arena boundary instead of extending680px');
}
function reachesPilot(C,h){
  const inside=(x,y)=>x>=16&&x<=344&&y>=260&&y<=614;if(inside(h.x1,h.y1)||inside(h.x2,h.y2))return true;
  const radius=h.width/2+3,edges=[[16,260,344,260],[344,260,344,614],[344,614,16,614],[16,614,16,260]];
  return edges.some(e=>C.geometry.segmentPairDistanceSquared(h.x1,h.y1,h.x2,h.y2,...e)<=radius*radius);
}
function validateReflectionChains(hazards){
  const chains=new Map();for(const h of hazards.filter(h=>h.laserBarrage&&h.v28Reflected)){const key=h.v28BarrageId+'|'+h.chainId;let rows=chains.get(key);if(!rows)chains.set(key,rows=[]);rows.push(h);}
  for(const [key,rows]of chains){
    assert.equal(rows.length,2,'a committed mirror ray must contain both finite segments '+key);rows.sort((a,b)=>a.v28Segment-b.v28Segment);const [a,b]=rows;
    assert.equal(a.x2,b.x1);assert.equal(a.y2,b.y1);assert.equal(a.activeAt,b.activeAt);assert.equal(a.fadeAt,b.fadeAt);assert.equal(a.expireAt,b.expireAt);
    const ax=a.x2-a.x1,ay=a.y2-a.y1,bx=b.x2-b.x1,by=b.y2-b.y1,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
    assert(ax*bx<0,'mirror must reverse the actual horizontal ray direction');assert(Math.abs(ax/al+bx/bl)<1e-7&&Math.abs(ay/al-by/bl)<1e-7,'mirror preserves incidence angle at the side wall');
  }
  return chains.size;
}
function phaseMatrix(C,{ticks=1800,bosses=Array.from({length:35},(_,i)=>i),phases=[0,1,2],difficulties=['gentle','normal','hell'],strictExposure=true}={}){
  const rows=[];let totalRays=0,totalActive=0,reflectedChains=0,corridorChecks=0,pianoRays=0;const modes=new Set(),participantSources=new Set();
  for(const index of bosses)for(const phase of phases)for(const difficulty of difficulties){
    const w=world(C,index,phase,difficulty),seen=new Map(),groups=new Set();let peakTotal=0,peakNew=0,newRays=0,activeSamples=0,localReflections=0,priorLive=new Map(),firstCommitTick=null,firstActiveTick=null,firstPilotThreatTick=null;
    for(let n=0;n<ticks;n++){
      C.step(w,{dx:n%240<120?1:-1,dy:n%180<90?.5:-.5});const barrage=w.hazards.filter(h=>h.laserBarrage);
      const currentIds=new Set(barrage.map(h=>h.id));for(const [id,expireAt]of priorLive)if(!currentIds.has(id))assert.equal(w.tick,expireAt,'announced laser must finish its exact fade before removal');priorLive=new Map(barrage.map(h=>[h.id,h.expireAt]));
      assert(w.hazards.length<=40,'global active/pending/fading laser cap40');assert(barrage.length<=12,'new laser cap12 includes warning, active and fade');peakTotal=Math.max(peakTotal,w.hazards.length);peakNew=Math.max(peakNew,barrage.length);
      localReflections+=validateReflectionChains(barrage);
      for(const h of barrage){
        validateGeometry(h);assert.equal(h.sourcePhase,phase,'laser stays owned by its actual source phase');assert(h.activeAt-h.born>=54,'every actual ray needs at least54visible warning ticks');assert.equal(h.warningTicks,h.activeAt-h.born);assert(h.fadeAt>h.activeAt&&h.expireAt>h.fadeAt);assert(w.tick<h.expireAt);assert.equal(h.phase,expectedPhase(h,w.tick));assert(h.v28BarrageId&&h.chainId,'each actual ray needs a committed group/chain identity');
        const previous=seen.get(h.id);if(previous)assert.equal(locked(h),previous,'an already announced ray may not rotate, follow the player or change geometry/clocks');else{
          seen.set(h.id,locked(h));newRays++;groups.add(h.v28BarrageId);modes.add(h.v28Mode);if(firstCommitTick===null)firstCommitTick=w.tick;
          if(h.v28LaneIndex!=null){assert.notEqual(h.v28LaneIndex,h.v28RestLane);assert.notEqual(h.v28LaneIndex,(h.v28RestLane+1)%h.v28KeyCount);assert(Math.abs(h.x2-h.x1)<=31,'actual keyboard columns should remain recognizable lanes');pianoRays++;}
          if(index===33){assert(['han-rian','baek-ion'].includes(h.sourceActorId),'paired circuit rays must preserve the real participant');assert.equal(h.sourceActorId,h.modelActorId);participantSources.add(h.sourceActorId);}
          const phaseStart=w.tick-Math.round(w.phaseTime*60),within=(h.born-phaseStart-1)%600,cycleStart=phaseStart+Math.floor((h.born-phaseStart-1)/600)*600;
          assert(within>=72&&within<=456,'new birth must follow the fixed pressure-route commitment, not precede it');assert(h.expireAt<cycleStart+661,'new ray must finish before next pressure route is selected');
        }
        if(h.phase==='active'){activeSamples++;if(firstActiveTick===null)firstActiveTick=w.tick;if(firstPilotThreatTick===null&&reachesPilot(C,h))firstPilotThreatTick=w.tick;}
        const pressure=w._pressurePlan;if(pressure&&w.tick<pressure.expireAt){
          const route=pressure.route,d2=C.geometry.segmentPairDistanceSquared(h.x1,h.y1,h.x2,h.y2,route.x1,route.y1,route.x2,route.y2),margin=route.halfWidth+h.width/2+w.player.r;
          assert(d2>margin*margin,'actual finite new ray crosses the current pressure corridor '+[index,phase,difficulty,w.tick,h.id]);corridorChecks++;
        }
      }
    }
    assert.equal(w.stage,'boss','immune observation must remain in its selected phase');if(strictExposure){assert(newRays>0&&activeSamples>0,'every configuration must actually emit and activate its own laser barrage '+[index,phase,difficulty]);if(ticks>=600){assert(firstCommitTick!==null&&firstCommitTick<=600);assert(firstActiveTick!==null&&firstActiveTick<=600,'first-cycle actual activation missing '+[index,phase,difficulty]);assert(firstPilotThreatTick!==null&&firstPilotThreatTick<=600,'first-cycle meaningful beam never enters reachable pilot area '+[index,phase,difficulty]);}}
    rows.push({bossIndex:index,phase,difficulty,ticks,newRays,barrageGroups:groups.size,activeSamples,firstCommitTick,firstActiveTick,firstPilotThreatTick,peakNewLaserBodies:peakNew,peakAllLaserBodies:peakTotal,reflectedChainSamples:localReflections,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,telemetry:w.boss.laserBarrageStats||null});totalRays+=newRays;totalActive+=activeSamples;reflectedChains+=localReflections;
  }
  return {summary:{cases:rows.length,ticksPerCase:ticks,engineTicks:rows.length*ticks,strictExposure,newRays:totalRays,actualActiveSamples:totalActive,firstCycleMissingActivation:rows.filter(r=>r.firstActiveTick===null||r.firstActiveTick>600).length,firstCycleMissingPilotThreat:rows.filter(r=>r.firstPilotThreatTick===null||r.firstPilotThreatTick>600).length,latestFirstActiveTick:Math.max(...rows.map(r=>r.firstActiveTick||0)),latestFirstPilotThreatTick:Math.max(...rows.map(r=>r.firstPilotThreatTick||0)),reflectedChainSamples:reflectedChains,actualCorridorChecks:corridorChecks,actualPianoRays:pianoRays,actualModes:[...modes].sort(),actualPairedSources:[...participantSources].sort(),peakNewLaserBodies:Math.max(...rows.map(r=>r.peakNewLaserBodies)),peakAllLaserBodies:Math.max(...rows.map(r=>r.peakAllLaserBodies)),poolPressure:rows.reduce((n,r)=>n+r.poolPressure,0),droppedGroups:rows.reduce((n,r)=>n+r.droppedGroups,0)},rows};
}
function old27Exact(C,{ticks=360}={}){
  const old=oldCore();let cases=0,comparisons=0;
  for(let index=0;index<35;index++)for(const phase of [0,1,2])for(const difficulty of ['gentle','normal','hell']){
    const w=world(C,index,phase,difficulty,27),prior=world(old,index,phase,difficulty,27);assert.equal(JSON.stringify(w),JSON.stringify(prior));
    for(let n=0;n<ticks;n++){const input={dx:n%120<60?1:-1,dy:n%180<90?.5:-.5};C.step(w,input);old.step(prior,input);if(n%60===0||n===ticks-1){assert.equal(JSON.stringify(w),JSON.stringify(prior),'old27 world changed '+[index,phase,difficulty,n]);assert.equal(JSON.stringify(C.checkpoint(w)),JSON.stringify(old.checkpoint(prior)));comparisons++;}}cases++;
  }
  return {cases,ticksPerCase:ticks,pairedTicks:cases*ticks,sampledWorldAndRawCheckpointComparisons:comparisons,normalisation:null,exact:true};
}
function sampleRay(C,index=6,phase=0){const w=world(C,index,phase,'hell');for(let n=0;n<500;n++){C.step(w,{});for(const h of w.hazards.filter(h=>h.laserBarrage))for(let i=0;i<=100;i++){const t=i/100,x=h.x1+(h.x2-h.x1)*t,y=h.y1+(h.y2-h.y1)*t;if(x>24&&x<336&&y>280&&y<590)return {w,h:JSON.parse(JSON.stringify(h)),point:{x,y}};}}assert.fail('could not find an actual ray through the playable pilot region');}
function damageClocks(C){
  const sample=sampleRay(C),rows=[];
  for(const [label,tick,damages]of [['warning',sample.h.activeAt-1,false],['first-active',sample.h.activeAt,true],['last-active',sample.h.fadeAt-1,true],['first-fade',sample.h.fadeAt,false],['last-fade',sample.h.expireAt-1,false]]){
    // An isolated collision fixture uses one real committed hazard. It is not
    // presented as ordinary-health gameplay or a natural clear attempt.
    const w=JSON.parse(JSON.stringify(sample.w));w.stage='transition';w.stageTime=0;w.tick=tick-1;w.time=(tick-1)/60;w.hazards=[JSON.parse(JSON.stringify(sample.h))];w.bullets=[];w.enemies=[];w.shots=[];w._warnings=[];w._deferred=[];w._delays=[];w._identityPlans=[];w.player.x=sample.point.x;w.player.y=sample.point.y;w.player.invulnerableUntil=0;const hp=w.player.hp;C.step(w,{});assert.equal(w.player.hp,hp-(damages?1:0),label+' collision clock');rows.push({label,tick,damages,observedHP:w.player.hp});
  }
  const h=sample.h,dx=h.x2-h.x1,dy=h.y2-h.y1,length=Math.hypot(dx,dy),x=h.x2+dx/length*20,y=h.y2+dy/length*20,d2=C.geometry.hazardDistanceSquared(h,x,y,x,y);assert(Math.abs(d2-400)<1e-6,'finite segment damage must stop at its endpoint rather than use an infinite ray');
  return {actualHazard:sample.h,collisionSamples:rows,beyondFiniteEndpointDistanceSquared:d2};
}
function phaseStop(C){
  const rows=[];
  for(const phase of [0,2]){
    const sample=sampleRay(C,6,phase),w=sample.w,beforeDefeat=new Map(w.hazards.filter(h=>h.laserBarrage).map(h=>[h.id,h.expireAt]));w.boss.hp=1;w.shots.push({id:++w.idCounter,x:w.boss.x,y:w.boss.y,px:w.boss.x,py:w.boss.y,vx:0,vy:0,r:2,kind:'basic',age:0,ttl:1,damage:100});C.step(w,{});assert(['transition','won'].includes(w.stage),'actual friendly shot must finish the selected boss phase');const stage=w.stage,stopTick=w.tick,allowed=new Set(beforeDefeat.keys());for(const [id,expireAt]of beforeDefeat)if(w.tick<expireAt)assert(w.hazards.some(h=>h.id===id),'defeat may not erase an already committed unexpired ray');let observed=0,exactExpireRemovals=0;
    for(let n=0;n<300&&w.stage===stage;n++){const liveBefore=new Map(w.hazards.filter(h=>h.laserBarrage).map(h=>[h.id,h.expireAt]));C.step(w,{});const current=w.hazards.filter(h=>h.laserBarrage),ids=new Set(current.map(h=>h.id));for(const [id,expireAt]of liveBefore)if(!ids.has(id)){assert.equal(w.tick,expireAt,'post-defeat explicit step must remove each ray exactly at its committed expiry');exactExpireRemovals++;}for(const h of current){assert(allowed.has(h.id),'phase/death must stop new laser promises');observed++;}}
    const drained=[...allowed].every(id=>!w.hazards.some(h=>h.id===id));assert(drained,'explicit pure-core stepping must finish the already announced laser clocks');
    assert.equal(exactExpireRemovals,allowed.size);rows.push({phase,stageAfterRealBossDefeat:stage,stopTick,endTick:w.tick,existingLaserIds:[...allowed],observationsAfterDefeat:observed,newPromisesAfterDefeat:0,exactExpireRemovals,announcedLaserDrainComplete:drained,scope:stage==='won'?'Explicit pure-core step calls after victory advance and drain existing hazards in this fixture. The app result-mode clock freeze is not simulated.':'Explicit pure-core phase-transition steps drain existing committed hazards without new promises.'});
  }
  return rows;
}
function naturalHealth(C,{bosses=Array.from({length:35},(_,i)=>i),difficulties=['gentle','normal','hell']}={}){
  const probe=require('./probe-identities-v25-natural.cjs'),base=require('./natural-bot-policy.cjs'),zlib=require('node:zlib'),box={HapilCore:C},inputDirectory=path.join(ROOT,'docs/v28-natural-inputs'),before=hashes(),records=[];let replayedTicks=0;
  for(const index of bosses)for(const difficulty of difficulties){
    const rays=new Set(),active=new Set(),modes=new Set();let peakNew=0,peakAll=0;
    const observed=Object.assign({},C,{step:function(w,input){C.step(w,input);const current=w.hazards.filter(h=>h.laserBarrage);peakNew=Math.max(peakNew,current.length);peakAll=Math.max(peakAll,w.hazards.length);for(const h of current){rays.add(h.id);modes.add(h.v28Mode);if(h.phase==='active')active.add(h.id);}return w;}});
    const r=probe.attempt({HapilCore:observed},{bossIndex:index,phase:2,difficulty,combatRevision:28},{limit:5000,inputDirectory});r.actualLaserObservations={committedRays:rays.size,activatedRays:active.size,peakNewLaserBodies:peakNew,peakAllLaserBodies:peakAll,modes:[...modes].sort()};records.push(r);
    const bytes=fs.readFileSync(path.join(inputDirectory,path.basename(r.input.file))),moves=zlib.gunzipSync(bytes).toString('ascii'),w=probe.initial(box,r);assert.equal(sha(bytes),r.input.sha256);assert.equal(moves.length,r.ticks);
    for(const key of moves){assert(!['won','lost'].includes(w.stage));const direction=base.directions[Number(key)];assert(direction);C.step(w,{dx:direction[0],dy:direction[1]});replayedTicks++;}
    assert.deepEqual(probe.result(w),{stage:r.stage,ticks:r.ticks,hp:r.hp,hits:r.hits,score:r.score,phaseTicks:r.phaseTicks,peakBullets:r.peakBullets,poolPressure:r.poolPressure,droppedGroups:r.droppedGroups,resultReason:r.resultReason},'exact original ordinary-health input replay');
    console.log(JSON.stringify({bossIndex:index,difficulty,stage:r.stage,hp:r.hp,hits:r.hits,ticks:r.ticks,poolPressure:r.poolPressure,droppedGroups:r.droppedGroups}));
  }
  assert.deepEqual(hashes(),before,'sources changed during ordinary-health recording/replay');
  const report={schema:1,date:'2026-10-31',scope:'CPU isolated special-practice phase3starts, ordinary selected-mode HP/damage, default automatic attack and skillrotation, legal nine-direction inputs only. No external immunity,777, altered HP/speed/damage/RNG/timer/phase after product checkpoint phase selection. Not human/full-story/browser/GPU/phoneFPS.',policy:'Existing public-current-threat forecast. It reads live bullets and committed finite laser hazards, emits ordinary directions, never edits live combat or reads future boss emissions/RNG.',policyConfig:probe.POLICY,directions:base.directions,sourceHashes:before,sourceHashGuardPassed:true,summary:{cases:records.length,won:records.filter(r=>r.stage==='won').length,lost:records.filter(r=>r.stage==='lost').length,unfinished:records.filter(r=>!['won','lost'].includes(r.stage)).length,recordedInputTicks:records.reduce((n,r)=>n+r.ticks,0),exactlyReplayedInputTicks:replayedTicks,poolPressure:records.reduce((n,r)=>n+r.poolPressure,0),droppedGroups:records.reduce((n,r)=>n+r.droppedGroups,0)},records};
  const file=path.join(ROOT,'docs/V28-NATURAL-HEALTH-20261031.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,summary:report.summary}));return report;
}
function archiveInputs(){
  const file=path.join(ROOT,'docs/v28-natural-inputs.zip'),manifestFile=path.join(ROOT,'docs/V28-NATURAL-INPUT-ARCHIVE-20261031.json');
  const python='from pathlib import Path\nimport json,hashlib,zipfile,gzip\nroot=Path(".");entries=[];reports=[]\nfor name in ["V28-NATURAL-HEALTH-20261031.json","V28-NATURAL-HEALTH-FOLLOWUP-20261031.json"]:\n p=root/"docs"/name\n if not p.exists(): continue\n r=json.loads(p.read_text());reports.append({"path":"docs/"+name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"summary":r["summary"]})\n for row in r["records"]:\n  rel=row["input"]["file"];data=(root/"docs"/rel).read_bytes();moves=gzip.decompress(data)\n  assert rel.startswith("v28-natural-inputs/");assert hashlib.sha256(data).hexdigest()==row["input"]["sha256"];assert len(moves)==row["ticks"];assert all(48<=v<=56 for v in moves)\n  entries.append({"path":rel,"bytes":len(data),"sha256":row["input"]["sha256"],"inputTicks":len(moves),"report":"docs/"+name,"stage":row["stage"]})\nentries.sort(key=lambda r:r["path"]);assert entries\narchive=root/"docs/v28-natural-inputs.zip"\nwith zipfile.ZipFile(archive,"w") as z:\n for row in entries:\n  info=zipfile.ZipInfo(row["path"],date_time=(2026,10,31,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_STORED;z.writestr(info,(root/"docs"/row["path"]).read_bytes())\nwith zipfile.ZipFile(archive) as z:\n assert z.namelist()==[r["path"] for r in entries];assert z.testzip() is None\n for row in entries:\n  data=z.read(row["path"]);assert hashlib.sha256(data).hexdigest()==row["sha256"];assert len(gzip.decompress(data))==row["inputTicks"]\nassert archive.stat().st_size<=2700000\nmanifest={"schema":1,"date":"2026-10-31","scope":"Original already-replayed legal-direction gzip traces. Failed attempts, if any, are retained. Archive checks do not claim additional gameplay.","archive":{"path":"docs/v28-natural-inputs.zip","bytes":archive.stat().st_size,"sha256":hashlib.sha256(archive.read_bytes()).hexdigest(),"entryCount":len(entries),"totalInputTicks":sum(r["inputTicks"] for r in entries)},"extraction":{"fromRepositoryRoot":"python -m zipfile -e docs/v28-natural-inputs.zip docs","sourceInputsRetainedLocally":True},"reports":reports,"validation":{"allEntryNamesExact":True,"allEntrySHA256Exact":True,"allDecompressedTickCountsExact":True,"onlyLegalDirectionDigits0to8":True,"zipCRC":True},"entries":entries}\n(root/"docs/V28-NATURAL-INPUT-ARCHIVE-20261031.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\\n");print(json.dumps(manifest["archive"]))\n';
  const output=cp.execFileSync('python',['-c',python],{cwd:ROOT,encoding:'utf8'});console.log(output.trim());return {file,manifestFile};
}
async function main(){const C=require('../src/core.js');if(process.argv.includes('--natural'))return naturalHealth(C);if(process.argv.includes('--archive'))return archiveInputs();const before=hashes(),damage=damageClocks(C),stop=phaseStop(C),diversity=geometricDiversity(C),matrix=phaseMatrix(C),legacy=old27Exact(C);assert.deepEqual(hashes(),before);const report={schema:1,date:'2026-10-31',baseline:BASE,scope:'Explicit immune CPU phase observations and isolated actual-hazard collision/defeat fixtures, plus exact old27 state comparisons. Not ordinary-health/human/full-story/browser/GPU/phoneFPS.',sourceHashes:before,sourceHashGuardPassed:true,damage,stop,diversity,matrix,legacy};const file=path.join(ROOT,'docs/V28-INDEPENDENT-LASER-QA-20261031.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,matrix:matrix.summary,legacy}));assert.equal(matrix.summary.poolPressure,0);assert.equal(matrix.summary.droppedGroups,0);return report;}
module.exports={ROOT,BASE,FILES,hashes,world,locked,validateGeometry,reachesPilot,validateReflectionChains,geometricDiversity,phaseMatrix,old27Exact,sampleRay,damageClocks,phaseStop,naturalHealth,archiveInputs,main};
if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
