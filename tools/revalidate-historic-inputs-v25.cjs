'use strict';
// Replays existing gzip directions only. Never executes the input policy or
// capture tools; never modifies a recording, health, damage, RNG, timer or phase.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),core=require('../src/core.js'),store=require('../src/storage.js')._test;
const {recordedModules}=require('./historic-replay-attestation-v25.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>sha(fs.readFileSync(path.join(ROOT,file)));
const families=[['natural-bot',3],['revision4-natural-bot',4],['revision5-natural-bot',5]];
const tests=['tests/legacy-natural-bot-replay.test.cjs','tests/revision4-natural-bot-replay-v18.test.cjs','tests/revision5-natural-bot-replay-v19.test.cjs'];
const fields=['tick','stage','stageTime','wave','waveTime','phase','phaseTime','bossIndex','bossCount','bossId','bossName','campaignRevision','checkpointSerial','waveDuration','idCounter','rngState','player','boss','enemies','bullets','shots','hazards','memory','resonance','score','graze','kills','skills','stats','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze','protagonist','combatObjective','resultReason','samongAwakened'];
function state(w){const o={};for(const key of fields)o[key]=w[key];o.activeArbeliaSlowUntil=w.tick<(w.arbeliaSlowUntil||0)?w.arbeliaSlowUntil:null;return o;}
const archives=families.map(([directory,campaignRevision])=>{
 const manifestFile=`tests/fixtures/${directory}/manifest.json`,manifest=JSON.parse(fs.readFileSync(path.join(ROOT,manifestFile),'utf8'));
 const original=recordedModules(manifest);for(const [file,expected]of Object.entries(original))if(!['src/core.js','src/storage.js'].includes(file))assert.equal(hash(file),expected,'original weapon/policy/capture changed before replay: '+file);
 return {directory,campaignRevision,manifest,manifestSha256:hash(manifestFile),recordedModuleSha256:original,previousReplayValidatedModuleSha256:manifest.replayValidatedModuleSha256||{'src/core.js':manifest.replayValidatedCoreSha256||manifest.recordedCoreSha256},inputFiles:manifest.records.map(r=>({file:r.file,sha256:hash(`tests/fixtures/${directory}/${r.file}`)}))};
});
const candidateFiles=[...new Set(archives.flatMap(a=>Object.keys(a.recordedModuleSha256)))].sort();
const sourceFiles=[...candidateFiles,...tests,'tools/historic-replay-attestation-v25.cjs','tools/revalidate-historic-inputs-v25.cjs'];
const before=Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));
const records=[];let totalInputTicks=0,totalBoundarySuccessorPairs=0,totalBoundaries=0;
for(const archive of archives)for(const expected of archive.manifest.records){
 const {directory,campaignRevision,manifest}=archive,raw=fs.readFileSync(path.join(ROOT,`tests/fixtures/${directory}/${expected.file}`));assert.equal(sha(raw),expected.sha256);
 const moves=zlib.gunzipSync(raw).toString('ascii');assert.equal(moves.length,expected.tick);
 function move(c){const pair=manifest.directions[Number(c)];assert.ok(pair,'bad archived direction');return{dx:pair[0],dy:pair[1]};}
 const w=core.createRun({campaign:true,campaignRevision,difficulty:expected.difficulty,seed:expected.seed,runId:expected.runId});
 assert.equal(w.player.invulnerableUntil,0);assert.equal(w.combatRevision,undefined);assert.equal(w.practiceBoss,false);assert.equal(w.player.hp,w.player.maxHp);assert(w.autoAttack&&w.skillRotation);
 let serial=w.checkpointSerial,boundaries=0,successorPairs=0;const marks=[],phases=new Set();
 for(let tick=0;tick<moves.length;tick++){
  assert.ok(!['won','lost'].includes(w.stage),'early recorded route end');core.step(w,move(moves[tick]));
  if(w.checkpointSerial!==serial){
   serial=w.checkpointSerial;boundaries++;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);if(w.stage==='boss')phases.add(`${w.bossIndex}:${w.phase}`);
   const clean=store.validateCheckpoint(core.checkpoint(w));assert.ok(clean);assert.equal(clean.combatRevision,undefined);assert.equal(clean.campaignRevision,campaignRevision);
   const original=structuredClone(w),restored=core.restoreCheckpoint(clean);
   for(let j=tick+1;j<Math.min(moves.length,tick+181);j++){
    const input=move(moves[j]),oldEvents=new Set(original.events),restoredEvents=new Set(restored.events);core.step(original,input);core.step(restored,input);
    assert.deepEqual(state(restored),state(original),`${directory}/${expected.file} boundary${serial} successor${j-tick}`);
    assert.deepEqual(restored.events.filter(e=>!restoredEvents.has(e)),original.events.filter(e=>!oldEvents.has(e)),'new cues after restored boundary');successorPairs++;
   }
  }
 }
 const count=campaignRevision===3?12:campaignRevision===4?18:35;
 assert.deepEqual([...phases].sort(),Array.from({length:count},(_,b)=>Array.from({length:3},(_,p)=>`${b}:${p}`)).flat().sort());
 assert.equal(w.stage,'won');assert.equal(w.bossIndex,count-1);assert.equal(w.phase,2);assert.equal(w.tick,expected.tick);assert.equal(w.player.hp,expected.hp);assert.equal(w.stats.hits,expected.hits);assert.equal(w.score,expected.score);assert.equal(w.kills,expected.killCount);assert.equal(w.checkpointSerial,expected.checkpointCount);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);assert.deepEqual(w.stats.phaseTicks,expected.phaseTicks);assert.deepEqual(marks,expected.marks);
 if(campaignRevision===4){assert.equal(w.resultReason,expected.reason);assert.equal(w.protagonist,'의목사 B');}
 if(campaignRevision===5){assert.equal(w.resultReason,expected.resultReason);assert.equal(w.samongAwakened,true);assert.equal(w.coreIntact,true);assert.equal(w.forcedCommandsSeparated,true);assert.equal(w.guardianRole,'몽세수호자');}
 const actual={stage:w.stage,tick:w.tick,hp:w.player.hp,hits:w.stats.hits,score:w.score,killCount:w.kills,checkpointCount:w.checkpointSerial,phaseTicks:w.stats.phaseTicks,marksSha256:sha(JSON.stringify(marks)),resultReason:w.resultReason};
 records.push({directory,file:expected.file,campaignRevision,difficulty:expected.difficulty,seed:expected.seed,runId:expected.runId,inputSha256:expected.sha256,replayedInputTicks:moves.length,savedBoundariesVerified:boundaries,boundarySuccessorInputPairsVerified:successorPairs,allPhasesVisited:phases.size,actual,complete:true});
 totalInputTicks+=moves.length;totalBoundaries+=boundaries;totalBoundarySuccessorPairs+=successorPairs;
 console.log(JSON.stringify({directory,file:expected.file,tick:w.tick,hp:w.player.hp,hits:w.stats.hits,savedBoundaries:boundaries,successorPairs,passed:true}));
}
const after=Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));assert.deepEqual(after,before,'source mutated during full exact replay');
for(const a of archives){assert.equal(hash(`tests/fixtures/${a.directory}/manifest.json`),a.manifestSha256);for(const f of a.inputFiles)assert.equal(hash(`tests/fixtures/${a.directory}/${f.file}`),f.sha256);}
assert.equal(records.length,18);
const report={schema:'hapil-v25-historic-input-replay-attestation-1',createdAt:new Date().toISOString(),complete:true,scope:'Current candidate replay verification of ALL unchanged archived ordinary-health legal directions for campaign revisions3/4/5. No new capture, policy execution,777, external immunity, HP/damage/RNG/timer/phase modification. This does not validate new25 natural-route completion, human play, browser/GPU/mobileFPS.',attestationLoaderSha256:before['tools/historic-replay-attestation-v25.cjs'],verificationTool:'tools/revalidate-historic-inputs-v25.cjs',verificationToolSha256:before['tools/revalidate-historic-inputs-v25.cjs'],testSourceSha256:Object.fromEntries(tests.map(f=>[f,before[f]])),candidateModuleSha256:Object.fromEntries(candidateFiles.map(f=>[f,before[f]])),sourceHashesAfter:after,archives:archives.map(({manifest,...archive})=>archive),records,summary:{routes:records.length,ordinaryInputTicks:totalInputTicks,savedBoundaries:totalBoundaries,boundarySuccessorInputPairs:totalBoundarySuccessorPairs,extraBoundarySimulationTicks:totalBoundarySuccessorPairs*2,originalArchiveFilesModified:0},validation:{allEighteenRecordedRoutes:true,everyRecordedInputReplayed:true,everyRecordedOutcomeExact:true,everySavedBoundaryAndNext180InputsExact:true,archivedInputsManifestsAndPoliciesUnchanged:true,candidateSourceHashGuard:true}};
const output=path.join(ROOT,'docs/V25-HISTORIC-INPUT-REPLAY-ATTESTATION-20261031.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,summary:report.summary,complete:true}));
