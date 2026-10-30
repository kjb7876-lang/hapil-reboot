'use strict';
// QA-only ordinary-health product special-practice attempts. The start phase is
// selected through the same checkpoint API used by the product's special button.
// Every subsequent operation is core.step with a legal direction. No immunity,
// health, timer, outgoing damage, actor, projectile, RNG or skill rewrites.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..'),core=require('../src/core.js'),base=require('./natural-bot-policy.cjs');
const forecastFactory=require('./hell-forecast-policy.cjs');
const policyConfig={route:flag('--route','centre'),y:Number(flag('--target-y','575')),beam:Number(flag('--beam','20')),commit:4,horizon:Number(flag('--horizon','96'))};
const policy=forecastFactory(policyConfig,{directions:base.directions,linearMove:base.linearMove});
const FILES=['src/core.js','src/weapon-patterns.js','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs','tools/probe-v21-natural-health.cjs'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes=()=>Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
function flag(name,fallback){const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];}
const difficulties=flag('--difficulties','gentle,normal,hell').split(','),bosses=flag('--bosses',Array.from({length:35},(_,i)=>i).join(',')).split(',').map(Number),phase=Number(flag('--phase','2')),seed=Number(flag('--seed','813')),limit=Number(flag('--limit','5000'));
const output=path.resolve(flag('--out',path.join(ROOT,'docs/V21-NATURAL-HEALTH-20261030.json'))),inputDirectory=path.join(path.dirname(output),'v21-natural-inputs');
function initial(bossIndex,difficulty){
 let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex,combatRevision:21,difficulty,seed,runId:`v21-natural-${difficulty}-${bossIndex}-${phase}-${seed}`});
 const snapshot=core.checkpoint(w);snapshot.phase=phase;w=core.restoreCheckpoint(snapshot);
 if(w.combatRevision!==21)throw Error('v21 is not enabled in the restored product start');
 if(!w.practiceBoss||w.phase!==phase||w.autoAttack!==true||w.skillRotation!==true||w.player.hp!==w.player.maxHp||w.player.invulnerableUntil!==0)throw Error('Unexpected special practice initialization');
 return w;
}
function attempt(bossIndex,difficulty){
 const started=Date.now(),w=initial(bossIndex,difficulty),startHP=w.player.hp,entered=new Set(),releaseIds=new Set(),copies=new Set();let sequence='',maxCopies=0;
 // Read-only proxy selects the stronger public-current-threat forecast for both
 // modes. It never changes actual engine difficulty, properties or RNG. Its
 // only output is one of the existing nine legal movement directions.
 const view=new Proxy(w,{get(target,key,receiver){return key==='difficulty'?'hell':Reflect.get(target,key,receiver);},set(){throw Error('QA policy attempted to write world state');}});
 for(let t=0;t<limit&&!['lost','won'].includes(w.stage);t++){
  const direction=w.bullets.length||w.hazards.length?policy.move(view):0,d=base.directions[direction];if(!d)throw Error('Illegal policy direction');sequence+=String(direction);core.step(w,{dx:d[0],dy:d[1]});entered.add(w.phase);
  if(w.boss&&w.boss.combatCopies){maxCopies=Math.max(maxCopies,w.boss.combatCopies.length);for(const c of w.boss.combatCopies)copies.add(c.id||c.sourceActorId||c.copyId||JSON.stringify(c));}
  for(const b of w.bullets)if(/v21/.test(b.patternId||''))releaseIds.add(b.patternId);
  for(const h of w.hazards)if(/v21/.test(h.patternId||''))releaseIds.add(h.patternId);
 }
 const input=zlib.gzipSync(Buffer.from(sequence),{mtime:0}),file=`boss-${String(bossIndex).padStart(2,'0')}-${difficulty}-phase-${phase}-seed-${seed}.moves.gz`;
 fs.mkdirSync(inputDirectory,{recursive:true});fs.writeFileSync(path.join(inputDirectory,file),input);
 return {elapsedSeconds:(Date.now()-started)/1000,bossIndex,bossId:core.CAMPAIGN_BOSSES[bossIndex].id,difficulty,phase,seed,runId:w.runId,combatRevision:w.combatRevision,stage:w.stage,ticks:w.tick,startHP,hp:w.player.hp,hits:w.stats.hits,score:w.score,phaseTicks:w.stats.phaseTicks,enteredPhases:[...entered],maxCopiesObserved:maxCopies,distinctCopyRecords:copies.size,newPatternIds:[...releaseIds].sort(),peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,resultReason:w.resultReason,input:{file:path.relative(path.dirname(output),path.join(inputDirectory,file)),bytes:input.length,sha256:sha(input),ticks:sequence.length}};
}
function main(){
 if(![0,1,2].includes(phase)||bosses.some(i=>!Number.isInteger(i)||i<0||i>=35)||difficulties.some(d=>!['normal','hell','gentle'].includes(d)))throw Error('Invalid requested cases');
 const before=hashes(),records=[];
 for(const bossIndex of bosses)for(const difficulty of difficulties){const record=attempt(bossIndex,difficulty);records.push(record);console.log(JSON.stringify(record));}
 const after=hashes(),stable=JSON.stringify(before)===JSON.stringify(after),report={schema:1,createdAt:new Date().toISOString(),scope:'Ordinary-health CPU isolated special-practice, product checkpoint-selected starting phase. Legal directional inputs with unmodified HP/damage/autoattack/skills; no777/no external immunity. Not fullstory, naturalhuman/browser/GPU/mobile.',policyConfig,policy:'Existing public-current-threat curved forecast,9legal directions. Read-only proxy selects this forecast in NORMAL too; actualworld difficulty remains unchanged. No future emissions or RNG are read. With no current bullets or announced hazards, the policy stands still.',directions:base.directions,sourceHashes:before,sourceHashesAfter:after,sourceHashGuardPassed:stable,summary:{cases:records.length,won:records.filter(r=>r.stage==='won').length,lost:records.filter(r=>r.stage==='lost').length,unfinished:records.filter(r=>!['won','lost'].includes(r.stage)).length,poolPressure:records.reduce((s,r)=>s+r.poolPressure,0),droppedGroups:records.reduce((s,r)=>s+r.droppedGroups,0)},records};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const md=[ '# V21 일반 체력 특수 연습 CPU 검사', '',report.scope,'',`현재 소스 일치: ${stable}. 검사 ${records.length}, 승리 ${report.summary.won}, 패배 ${report.summary.lost}, 미완료 ${report.summary.unfinished}.`,'', '시작 문양은 실제 제품의 특수 연습과 동일한 체크포인트 복원으로 선택했다. 이후에는 합법적인 이동 입력만 적용했다. 전체 스토리 자연 진행이나 사람이 플레이한 기록이 아니다. 실제 휴대폰 FPS를 검증하지 않는다.','', '| 보스 | 난도 | 시작 페이즈 | 결과 | 틱 | 남은 체력 | 피격 | peak 탄환 | 풀 압력 / 누락 |','|---|---|---:|---|---:|---:|---:|---:|---|',...records.map(r=>`| ${r.bossId} | ${r.difficulty} | ${r.phase+1} | ${r.stage} | ${r.ticks} | ${r.hp} | ${r.hits} | ${r.peakBullets} | ${r.poolPressure} / ${r.droppedGroups} |`),'','각 입력 gzip의 SHA-256과 실행 소스 SHA-256은 JSON에 기록했다. 실패한 시도도 삭제하거나 통과로 표시하지 않는다.',''];
 fs.writeFileSync(output.replace(/\.json$/,'.md'),md.join('\n'));console.log(JSON.stringify({report:output,summary:report.summary,sourceHashGuardPassed:stable}));if(!stable||report.summary.lost||report.summary.unfinished||report.summary.poolPressure||report.summary.droppedGroups)process.exitCode=1;
}
if(require.main===module)main();
