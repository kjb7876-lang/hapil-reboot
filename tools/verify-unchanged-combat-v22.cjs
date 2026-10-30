'use strict';
// Bounded independent verification of presentation-only v22 changes.
// Existing v21 reports, replay results and gzip inputs are read-only. Fresh
// replay outputs always use explicit V22-prefixed paths beneath docs/v22-qa.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='03c0f984b2e709f2946a56794eaa97d29dba89f5';
const COMBAT_FILES=['src/core.js','src/storage.js','src/media.js','src/story-assets.js','src/weapon-patterns.js'];
const FOLLOWUP='docs/V21-NATURAL-HEALTH-FOLLOWUP-20261030.json',REPLAY_TOOL='tools/replay-v21-natural-health.cjs';
const OUTPUT='docs/v22-qa',JSON_REPORT='docs/V22-UNCHANGED-COMBAT-20261030.json',MD_REPORT='docs/V22-UNCHANGED-COMBAT-20261030.md';
const LABELS={primary:'PRIMARY',alternate1:'ALTERNATE1',alternate2:'ALTERNATE2'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(path.join(ROOT,f));
const json=f=>JSON.parse(read(f));
function baselineBytes(file){return cp.execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,maxBuffer:16*1024*1024});}
function exactBaseline(file){const bytes=read(file),old=baselineBytes(file);assert(bytes.equals(old),'deployed baseline bytes differ: '+file);return{file,bytes:bytes.length,sha256:sha(bytes),baselineSHA256:sha(old),byteIdentical:true};}
function relative(file){const p=path.relative(ROOT,file).split(path.sep).join('/');assert(p&&!p.startsWith('../')&&!path.isAbsolute(p),'proof must remain inside checkout');return p;}
function safeOutput(id){assert(Object.hasOwn(LABELS,id),'unknown proof id');const dest=OUTPUT+'/V22-NATURAL-HEALTH-'+LABELS[id]+'-REPLAY-20261030.json';assert(dest.startsWith('docs/v22-qa/V22-'));assert(!dest.startsWith('docs/v21-'));return dest;}
function snapshot(files){return Object.fromEntries(files.map(f=>[f,sha(read(f))]));}
function verifySnapshot(files,expected,label){assert.deepEqual(snapshot(files),expected,label);}
function main(){
 const combat=COMBAT_FILES.map(exactBaseline),followup=json(FOLLOWUP);assert.equal(followup.sourceHashGuardPassed,true);assert.equal(followup.summary.totalAttempts,113);assert.equal(followup.summary.totalReplayedTicks,198933);assert.equal(followup.proofs.length,3);
 // Cover every historical v21 document/input, not just the three JSON headers.
 const allBaselineDocs=cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'docs'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n');
 const v21ProofFiles=allBaselineDocs.filter(f=>/^docs\/(V21-|v21-)/.test(f));assert(v21ProofFiles.length>113);
 for(const f of v21ProofFiles)exactBaseline(f);
 const oldProofHashes=snapshot(v21ProofFiles),simulationFiles=new Set([...COMBAT_FILES,REPLAY_TOOL,...Object.keys(followup.sourceHashes)]);
 for(const [file,hash]of Object.entries(followup.sourceHashes)){assert.equal(sha(read(file)),hash,'recorded policy/core differs: '+file);exactBaseline(file);}
 exactBaseline(REPLAY_TOOL);const beforeSources=snapshot([...simulationFiles]);
 const recordings=[],inputs=[],failures=[];let expectedTicks=0;
 for(const proof of followup.proofs){
  assert(Object.hasOwn(LABELS,proof.id));assert.equal(sha(read(proof.file)),proof.sha256,'recording report SHA: '+proof.id);assert.equal(sha(read(proof.replayFile)),proof.replaySHA256,'old replay proof SHA: '+proof.id);
  const recorded=json(proof.file),oldReplay=json(proof.replayFile);assert.equal(recorded.sourceHashGuardPassed,true);assert.equal(oldReplay.sourceHashGuardPassed,true);assert.deepEqual(recorded.sourceHashes,followup.sourceHashes);
  for(const r of recorded.records){
   const file=relative(path.resolve(ROOT,path.dirname(proof.file),r.input.file)),bytes=read(file);assert.equal(sha(bytes),r.input.sha256,'input SHA: '+file);assert.equal(bytes.length,r.input.bytes,'input size: '+file);assert.equal(zlib.gunzipSync(bytes).length,r.ticks,'input tick count: '+file);exactBaseline(file);
   assert(['won','lost'].includes(r.stage),'unfinished attempts are not silently omitted');assert.equal(r.phase,2);expectedTicks+=r.ticks;const row={recordingId:proof.id,file,bytes:bytes.length,sha256:r.input.sha256,bossIndex:r.bossIndex,bossId:r.bossId,difficulty:r.difficulty,seed:r.seed,phase:r.phase,stage:r.stage,ticks:r.ticks,hp:r.hp,hits:r.hits};inputs.push(row);if(r.stage==='lost')failures.push(row);
  }
  recordings.push({proof,recorded,oldReplay});
 }
 const uniqueCases=new Set(inputs.map(r=>[r.bossIndex,r.difficulty,r.seed,r.phase].join(':'))).size;
 assert.equal(uniqueCases,followup.summary.uniqueEncounterDifficultyCases);assert.equal(uniqueCases,105);assert.equal(inputs.length,113);assert.equal(expectedTicks,198933);assert.equal(failures.length,8);assert.equal(inputs.filter(r=>r.stage==='won').length,105);
 fs.mkdirSync(path.join(ROOT,OUTPUT),{recursive:true});const replays=[];let ticks=0,won=0,lost=0;
 for(const {proof,recorded,oldReplay}of recordings){
  const out=safeOutput(proof.id);assert.notEqual(out,proof.file);assert.notEqual(out,proof.replayFile);
  const run=cp.spawnSync(process.execPath,[path.join(ROOT,REPLAY_TOOL),path.join(ROOT,proof.file),path.join(ROOT,out)],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(run.status,0,'fresh replay failed: '+proof.id+'\n'+(run.stdout||'')+(run.stderr||''));
  const fresh=json(out);assert.equal(fresh.sourceHashGuardPassed,true);assert.equal(fresh.recordingReportSHA256,proof.sha256);assert.equal(fresh.replayToolSHA256,beforeSources[REPLAY_TOOL]);assert.deepEqual(fresh.sourceHashes,recorded.sourceHashes);assert.deepEqual(fresh.cases,oldReplay.cases,'fresh exact outcomes differ: '+proof.id);assert.deepEqual(fresh.summary,oldReplay.summary,'fresh counts differ: '+proof.id);
  ticks+=fresh.summary.ticks;won+=fresh.summary.won;lost+=fresh.summary.lost;
  replays.push({id:proof.id,inputReport:proof.file,inputReportSHA256:proof.sha256,originalReplay:proof.replayFile,originalReplaySHA256:proof.replaySHA256,freshReplay:out,freshReplaySHA256:sha(read(out)),summary:fresh.summary,exactOriginalOutcomes:true});
 }
 assert.equal(ticks,198933);assert.equal(won,105);assert.equal(lost,8);verifySnapshot([...simulationFiles],beforeSources,'simulation/policy/replay tool changed during verification');verifySnapshot(v21ProofFiles,oldProofHashes,'historical v21 evidence changed during verification');COMBAT_FILES.forEach(exactBaseline);
 const result={schema:'hapil-v22-unchanged-combat-1',date:'2026-10-30',timezone:'Asia/Seoul',createdAt:new Date().toISOString(),baseline:BASE,method:'Independent exact-byte verification against deployed v21, plus fresh deterministic CPU replays of all113 retained ordinary-health legal input attempts. Existing v21 evidence remains read-only; all new replay outputs have explicit V22-prefixed filenames.',runtime:process.version,verificationToolSHA256:sha(read(relative(__filename))),unchangedCombatFiles:combat,simulationPolicyAndReplaySourceHashes:beforeSources,sourceHashGuardPassed:true,v21Evidence:{filesChecked:v21ProofFiles.length,allByteIdenticalToBaseline:true,unchangedBeforeAfter:true,sha256:oldProofHashes},recordingProofs:replays,summary:{attempts:inputs.length,uniqueEncounterDifficultyCases:uniqueCases,inputTicks:ticks,won,lost,failedAttemptsRetained:failures.length,unmatchedOutcomes:0,changedInputs:0,changedOriginalProofs:0},failedAttempts:failures,inputProofs:inputs,limitations:['CPU isolated third-pattern practice (phase index2), seed813, with ordinary health and product safe-checkpoint phase selection; no777, external immunity, HP/damage/timer/RNG modification.','Failed attempts remain losses;105 wins include alternate retries and are not113 successful clears.','This confirms unchanged simulation/results and retained evidence. It does not certify the new presentation, human reaction fairness, full-story completion, actual browser input, GPU completion or mobile-device FPS.']};
 fs.writeFileSync(path.join(ROOT,JSON_REPORT),JSON.stringify(result,null,2)+'\n');
 const lines=['# v22 전투 규칙 불변·자연 입력 재생 검수','','배포된 v21 커밋 `'+BASE+'`과 비교해 코어·저장·미디어·스토리 자산 계약·무기 패턴 **5개 파일의 실제 바이트가 동일함**을 확인했다. 시뮬레이션 정책과 재생 도구도 녹화 당시 해시를 유지한다.','','| 새 CPU 재생 | 시도 | 승리 | 패배 |','|---|---:|---:|---:|',...replays.map(r=>'| '+r.id+' | '+r.summary.cases+' | '+r.summary.won+' | '+r.summary.lost+' |'),'| 합계 | **113** | **105** | **8** |','','원래 기록의 합계 **198,933틱**을 다시 실행해 종료 상태·체력·피격·점수·최대 탄환·페이즈 기록을 일치시켰다. 8개 실패도 원래의 실패로 남겼다. 원본 v21 자료 **'+v21ProofFiles.length+'개**와 모든 입력의 출처·해시·내용을 전후 비교했으며 변경하지 않았다.','','새 재생 결과는 `docs/v22-qa/V22-NATURAL-HEALTH-*-REPLAY-20261030.json`에 따로 저장했다. 기존 v21 자료에는 쓰지 않았다. 입력별·출처별·결과별 해시는 대응 JSON에 있다.','','이는 정상 체력과 실제 연습 체크포인트 API를 사용하는 **CPU 제3패턴 단독 재생**이다. 외부 무적·777·체력·피해·타이머·RNG 변경은 없다. 새 연출의 픽셀 검수, 사람의 반응 난도, 전체 스토리 완주, 실제 브라우저·GPU·휴대폰 성능 검증으로 분류하지 않는다.',''];
 fs.writeFileSync(path.join(ROOT,MD_REPORT),lines.join('\n'));console.log(JSON.stringify({report:JSON_REPORT,unchangedCombatFiles:combat.length,unchangedV21EvidenceFiles:v21ProofFiles.length,...result.summary}));return result;
}
if(require.main===module)main();module.exports={BASE,COMBAT_FILES,main};
