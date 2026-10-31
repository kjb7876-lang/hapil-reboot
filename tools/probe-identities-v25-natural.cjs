'use strict';
// QA only: normal HP/damage, normal autoattack/skills, nine legal directions.
// A failed attempt remains a failed attempt, with exact replayable inputs.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const a=require('./audit-boss-identities-v25.cjs'),base=require('./natural-bot-policy.cjs'),forecastFactory=require('./hell-forecast-policy.cjs');
const POLICY={route:flag('--route','centre'),y:Number(flag('--target-y','575')),beam:Number(flag('--beam','20')),commit:4,horizon:Number(flag('--horizon','96'))};
const FILES=['src/core.js','src/weapon-patterns.js','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs','tools/audit-boss-identities-v25.cjs','tools/probe-identities-v25-natural.cjs'];
const hashes=()=>Object.fromEntries(FILES.map(f=>[f,a.sha(a.source(f))]));
function flag(name,fallback){const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];}
function list(name,fallback,convert=x=>x){return flag(name,fallback.join(',')).split(',').map(convert);}
function initial(box,r){
  const w=a.practice(box,r.bossIndex,r.phase,r.difficulty,r.combatRevision,{immune:false,finalPractice:!!r.finalPractice});
  assert.equal(w.combatRevision,r.combatRevision);assert.equal(w.player.invulnerableUntil,0);assert.equal(w.player.hp,w.player.maxHp);assert(w.autoAttack&&w.skillRotation);
  return w;
}
function result(w){return {stage:w.stage,ticks:w.tick,hp:w.player.hp,hits:w.stats.hits,score:w.score,phaseTicks:w.stats.phaseTicks,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,resultReason:w.resultReason};}
function attempt(box,r,{limit=5000,inputDirectory}={}){
  const w=initial(box,r),policy=forecastFactory(POLICY,{directions:base.directions,linearMove:base.linearMove}),startHP=w.player.hp,entered=new Set(),patterns=new Set();let moves='',firstIdentityTick=null;
  // The forecast mode is selected independently of actual game difficulty.
  // It reads current public threats/announcements only and emits legal input.
  const view=new Proxy(w,{get(t,k,receiver){return k==='difficulty'?'hell':Reflect.get(t,k,receiver);},set(){throw Error('read-only input policy attempted state write');}});
  for(let t=0;t<limit&&!['lost','won'].includes(w.stage);t++){
    const move=w.bullets.length||w.hazards.length?policy.move(view):0,d=base.directions[move];assert(d,'legal input direction');moves+=move;
    box.HapilCore.step(w,{dx:d[0],dy:d[1]});entered.add(w.phase);
    for(const b of w.bullets)if(b.identityPatternId||/^identity-/.test(b.patternId||'')){patterns.add(b.identityPatternId||b.patternId);if(firstIdentityTick===null)firstIdentityTick=w.tick;}
  }
  const bytes=zlib.gzipSync(Buffer.from(moves),{mtime:0}),filename=`boss-${String(r.bossIndex).padStart(2,'0')}-${r.difficulty}-phase-${r.phase}${r.finalPractice?'-standalone':''}.moves.gz`;
  fs.mkdirSync(inputDirectory,{recursive:true});fs.writeFileSync(path.join(inputDirectory,filename),bytes);
  return {...r,bossId:box.HapilCore.CAMPAIGN_BOSSES[r.bossIndex].id,startHP,...result(w),enteredPhases:[...entered],identityPatternIds:[...patterns],firstIdentityTick,input:{file:path.basename(inputDirectory)+'/'+filename,bytes:bytes.length,sha256:a.sha(bytes),ticks:moves.length}};
}
function replay(input,output){
  const report=JSON.parse(fs.readFileSync(input)),before=hashes();assert.equal(report.sourceHashGuardPassed,true);assert.deepEqual(before,report.sourceHashes,'exact recording source hashes');
  const box=a.runtime(),rows=[];let ticks=0;
  for(const r of report.records){
    const w=initial(box,r),bytes=fs.readFileSync(path.resolve(path.dirname(input),r.input.file));assert.equal(a.sha(bytes),r.input.sha256,'input hash');const moves=zlib.gunzipSync(bytes).toString('ascii');assert.equal(moves.length,r.ticks);assert.equal(w.player.hp,r.startHP);
    for(const key of moves){assert(!['lost','won'].includes(w.stage),'no input after terminal result');const d=report.directions[Number(key)];assert(d);box.HapilCore.step(w,{dx:d[0],dy:d[1]});ticks++;}
    for(const [k,v]of Object.entries(result(w)))assert.equal(JSON.stringify(v),JSON.stringify(r[k]),`exact replay ${r.bossIndex}/${r.phase}/${r.difficulty} ${k}`);
    rows.push({bossIndex:r.bossIndex,phase:r.phase,difficulty:r.difficulty,finalPractice:!!r.finalPractice,...result(w),inputSHA256:r.input.sha256});
  }
  assert.deepEqual(hashes(),before,'sources stable during replay');
  const verified={schema:1,scope:'Pure CPU replays of exact recorded legal inputs with ordinary HP/damage/autoattack/skills. Product checkpoint phase starts. No policy execution, immunity,777, human-play/browser/mobile claim.',recordingSHA256:a.sha(fs.readFileSync(input)),sourceHashes:before,sourceHashGuardPassed:true,summary:{cases:rows.length,ticks,won:rows.filter(r=>r.stage==='won').length,lost:rows.filter(r=>r.stage==='lost').length,unfinished:rows.filter(r=>!['won','lost'].includes(r.stage)).length},rows};
  fs.writeFileSync(output,JSON.stringify(verified,null,2)+'\n');console.log(JSON.stringify({report:output,...verified.summary}));return verified;
}
function main(){
  const replayAt=process.argv.indexOf('--replay');if(replayAt>=0){const input=path.resolve(process.argv[replayAt+1]);replay(input,path.resolve(flag('--out',input.replace(/\.json$/,'.replay.json'))));return;}
  const bosses=list('--bosses',Array.from({length:35},(_,i)=>i),Number),phases=list('--phases',[2],Number),difficulties=list('--difficulties',['gentle','normal','hell']),combatRevision=Number(flag('--combat-revision','25')),limit=Number(flag('--limit','5000'));
  assert(bosses.every(i=>Number.isInteger(i)&&i>=0&&i<35));assert(phases.every(i=>[0,1,2].includes(i)));assert(difficulties.every(d=>['gentle','normal','hell'].includes(d)));
  const output=path.resolve(flag('--out',path.join(a.ROOT,'docs/v25-qa/natural-health-phase3.json'))),inputDirectory=path.join(path.dirname(output),path.basename(output,'.json')+'-inputs'),before=hashes(),box=a.runtime(),records=[];
  for(const bossIndex of bosses)for(const phase of phases)for(const difficulty of difficulties){const r=attempt(box,{bossIndex,phase,difficulty,combatRevision},{limit,inputDirectory});records.push(r);console.log(JSON.stringify({bossIndex,phase,difficulty,...result({stage:r.stage,tick:r.ticks,player:{hp:r.hp},score:r.score,stats:r,resultReason:r.resultReason}),identityPatternIds:r.identityPatternIds}));}
  const after=hashes(),stable=JSON.stringify(before)===JSON.stringify(after),report={schema:1,scope:'Ordinary-health CPU isolated special-practice attempts. Actual product checkpoint-selected phase starts, legal inputs only afterward, unmodified HP/damage/autoattack/skills. No777/no external immunity. Not human/fullstory/browser/GPU/mobile.',policy:'Public-current-threat forecast including existing announced hazards; read-only view selects the same forecast for all actual difficulties. No future emissions or RNG reads. Stands still before a visible threat.',policyConfig:POLICY,directions:base.directions,sourceHashes:before,sourceHashesAfter:after,sourceHashGuardPassed:stable,summary:{cases:records.length,won:records.filter(r=>r.stage==='won').length,lost:records.filter(r=>r.stage==='lost').length,unfinished:records.filter(r=>!['won','lost'].includes(r.stage)).length,poolPressure:records.reduce((s,r)=>s+r.poolPressure,0),droppedGroups:records.reduce((s,r)=>s+r.droppedGroups,0)},records};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:output,sourceHashGuardPassed:stable,...report.summary}));
  if(!stable||report.summary.lost||report.summary.unfinished||report.summary.poolPressure||report.summary.droppedGroups)process.exitCode=1;
}
module.exports={POLICY,FILES,hashes,initial,result,attempt,replay};
if(require.main===module)main();
