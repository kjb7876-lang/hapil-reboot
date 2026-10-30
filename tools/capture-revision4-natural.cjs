'use strict';
// QA recordings only: unchanged game state; legal directional input. Isolated
// workers run independent seeds concurrently. No fixture becomes visible until
// every ordinary-health run wins and every source hash is still unchanged.
const core=require('../src/core.js'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process'),os=require('node:os');
const policy=require('./natural-bot-policy.cjs'),root=path.join(__dirname,'..'),out=path.join(root,'tests/fixtures/revision4-natural-bot');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const moduleHashes=Object.fromEntries(['src/core.js','src/storage.js','src/weapon-patterns.js','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs','tools/capture-revision4-natural.cjs'].map(p=>[p,hash(p)]));
const jobs=['gentle','normal','hell'].flatMap(difficulty=>[813,42].map(seed=>({difficulty,seed})));
function assertUnchanged(){for(const [p,expected] of Object.entries(moduleHashes))if(hash(p)!==expected)throw Error('Recording source changed: '+p);}
function record(difficulty,seed){
 const w=core.createRun({campaign:true,campaignRevision:4,difficulty,seed,runId:'revision4-natural-'+difficulty+'-'+seed});
 const marks=[];let serial=w.checkpointSerial,sequence='';
 // Eighteen encounters can exceed the prior twelve-route recorder's 180000
 // ticks. This bound derives from authored wave/phase timeouts, not a skip.
 const maximumTicks=w.bossCount*(3*15+3*75+3*20)*60;
 for(let n=0;n<maximumTicks&&!['lost','won'].includes(w.stage);n++){
  const key=policy.move(w),d=policy.directions[key];sequence+=String(key);core.step(w,{dx:d[0],dy:d[1]});
  if(w.checkpointSerial!==serial){serial=w.checkpointSerial;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);}
 }
 const observed={difficulty,seed,stage:w.stage,tick:w.tick,bossIndex:w.bossIndex,bossId:w.bossId,phase:w.phase,hits:w.stats.hits,hp:w.player.hp,reason:w.resultReason,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups};
 assertUnchanged();if(w.stage!=='won')return {failed:true,observed,moduleHashes};
 const file=`${difficulty}-${seed}.moves.gz`,bytes=zlib.gzipSync(Buffer.from(sequence),{mtime:0});
 return {moduleHashes,bytes:bytes.toString('base64'),record:{...observed,runId:w.runId,campaignRevision:w.campaignRevision,bossCount:w.bossCount,score:w.score,killCount:w.kills,checkpointCount:w.checkpointSerial,phaseTicks:w.stats.phaseTicks,marks,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}};
}
async function main(){
 // Preserve completed private worker artifacts even if this runner is stopped;
 // these are never accepted as tests/fixtures without the all-six guard.
 const pending=fs.mkdtempSync(path.join(os.tmpdir(),'hapil-rev4-natural-'));console.log(JSON.stringify({pendingDirectory:pending,workers:jobs.length,sourceHashes:moduleHashes}));
 const completed=await Promise.allSettled(jobs.map(({difficulty,seed})=>new Promise((resolve,reject)=>{
  cp.execFile(process.execPath,[__filename,'--worker',difficulty,String(seed)],{cwd:root,maxBuffer:4*1024*1024},(err,stdout,stderr)=>{
   if(err){reject(new Error(`${difficulty}/${seed}: ${stderr||err.message}`));return;}
   try{
    const result=JSON.parse(stdout);fs.writeFileSync(path.join(pending,`${difficulty}-${seed}.json`),JSON.stringify(result));
    if(!result.failed){const {record:r}=result;console.log(JSON.stringify({difficulty:r.difficulty,seed:r.seed,stage:r.stage,tick:r.tick,hp:r.hp,hits:r.hits,peakBullets:r.peakBullets,poolPressure:r.poolPressure,droppedGroups:r.droppedGroups,pendingFile:path.join(pending,r.file)}));fs.writeFileSync(path.join(pending,r.file),Buffer.from(result.bytes,'base64'));}
    resolve(result);
   }catch(e){reject(e);}
  });
 })));
 const failed=completed.flatMap((r,i)=>r.status==='rejected'?[{...jobs[i],error:String(r.reason),moduleHashes}]:r.value.failed?[{...r.value.observed,moduleHashes:r.value.moduleHashes}]:[]);
 if(failed.length){const file=path.join(root,'docs/REVISION4-NATURAL-FAILED-ATTEMPTS-20261030.json');let before=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];fs.writeFileSync(file,JSON.stringify(before.concat(failed),null,2)+'\n');throw Error('Ordinary-health recording failed; no fixtures emitted. '+JSON.stringify(failed));}
 assertUnchanged();const records=[];
 for(let i=0;i<completed.length;i++){
  const result=completed[i].value;for(const [p,expected] of Object.entries(moduleHashes))if(result.moduleHashes[p]!==expected)throw Error('Worker source mismatch: '+p);
  const r=result.record,expected=jobs[i];if(r.difficulty!==expected.difficulty||r.seed!==expected.seed||r.stage!=='won'||r.bossCount!==18||r.campaignRevision!==4||r.checkpointCount!==106)throw Error('Incomplete worker result');
  const bytes=Buffer.from(result.bytes,'base64');if(crypto.createHash('sha256').update(bytes).digest('hex')!==r.sha256||zlib.gunzipSync(bytes).length!==r.tick)throw Error('Invalid worker input bytes');records.push(r);
 }
 if(fs.existsSync(out))throw Error('Refusing to overwrite an existing fixture directory');
 const ready=path.join(pending,'ready');fs.mkdirSync(ready);for(const r of records)fs.copyFileSync(path.join(pending,r.file),path.join(ready,r.file));
 fs.writeFileSync(path.join(ready,'manifest.json'),JSON.stringify({method:'Revision-four full route; ordinary health, damage, auto attack, auto skills and normal legal directional input. Controller observes already-existing projectiles and announced warnings only. No future emissions or RNG access, game-state, immunity or health modification; not human/browser/mobile/GPU play. Six isolated workers; all-six atomic output guard.',campaignRevision:4,recordedModuleSha256:moduleHashes,directions:policy.directions,encounterIds:core.CAMPAIGN_BOSSES.map(b=>b.id),records},null,2)+'\n');
 assertUnchanged();fs.renameSync(ready,out);console.log(JSON.stringify({complete:true,records:records.length,destination:out,pendingDirectory:pending}));
}
if(process.argv[2]==='--worker'){
 const difficulty=process.argv[3],seed=Number(process.argv[4]);if(!jobs.some(j=>j.difficulty===difficulty&&j.seed===seed))throw Error('Unknown recording job');process.stdout.write(JSON.stringify(record(difficulty,seed)));
}else main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
