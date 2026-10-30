'use strict';
// CPU automation with ordinary engine health/damage/skills and legal moves.
// Workers persist private results before the parent observes completion. The
// public fixture directory is published only after all six succeed against
// frozen sources. This neither alters game state nor weakens failed checks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process'),os=require('node:os');
const core=require('../src/core.js'),policy=require('./natural-bot-policy.cjs'),root=path.resolve(__dirname,'..'),out=path.join(root,'tests/fixtures/revision5-natural-bot');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const moduleFiles=['src/core.js','src/storage.js','src/weapon-patterns.js','tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs','tools/capture-revision5-natural.cjs'];
const moduleHashes=Object.fromEntries(moduleFiles.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const jobs=['gentle','normal','hell'].flatMap(difficulty=>[813,42].map(seed=>({difficulty,seed})));
function assertUnchanged(){for(const [p,h] of Object.entries(moduleHashes))if(sha(fs.readFileSync(path.join(root,p)))!==h)throw Error('Source changed during ordinary-health capture: '+p);}
function validateResult(result,difficulty,seed,pending){
 const r=result.record;for(const [p,h] of Object.entries(moduleHashes))if(result.moduleHashes[p]!==h)throw Error('Worker source differs '+p);
 if(!r||r.difficulty!==difficulty||r.seed!==seed||r.stage!=='won'||r.bossCount!==35||r.campaignRevision!==5||r.checkpointCount!==208||r.phaseTicks.length!==105||r.poolPressure!==0||r.droppedGroups!==0)throw Error('Incomplete or pressured ordinary-health route '+difficulty+'/'+seed);
 const bytes=fs.readFileSync(path.join(pending,r.file));if(sha(bytes)!==r.sha256||zlib.gunzipSync(bytes).length!==r.tick)throw Error('Invalid recorded input bytes '+r.file);return r;
}
function record(difficulty,seed,pending){
 const w=core.createRun({campaign:true,campaignRevision:5,difficulty,seed,runId:`revision5-natural-${difficulty}-${seed}`});
 if(w.bossCount!==35||w.practiceBoss||!w.autoAttack||!w.skillRotation||w.player.hp!==w.player.maxHp)throw Error('Unexpected ordinary run initialization');
 let serial=w.checkpointSerial,sequence='';const marks=[];
 const maximumTicks=w.bossCount*(3*15+3*75+3*20)*60;
 for(let n=0;n<maximumTicks&&!['lost','won'].includes(w.stage);n++){
  const key=policy.move(w),d=policy.directions[key];sequence+=String(key);core.step(w,{dx:d[0],dy:d[1]});
  if(w.checkpointSerial!==serial){serial=w.checkpointSerial;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);}
 }
 const observed={difficulty,seed,stage:w.stage,tick:w.tick,bossIndex:w.bossIndex,bossId:w.bossId,phase:w.phase,hits:w.stats.hits,hp:w.player.hp,resultReason:w.resultReason,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups};
 assertUnchanged();if(w.stage!=='won'){const failure={moduleHashes,observed};fs.writeFileSync(path.join(pending,`${difficulty}-${seed}.failed.json`),JSON.stringify(failure,null,2));throw Error('Ordinary-health route did not win '+JSON.stringify(observed));}
 const file=`${difficulty}-${seed}.moves.gz`,bytes=zlib.gzipSync(Buffer.from(sequence),{mtime:0}),record={...observed,runId:w.runId,campaignRevision:w.campaignRevision,bossCount:w.bossCount,score:w.score,killCount:w.kills,checkpointCount:w.checkpointSerial,phaseTicks:w.stats.phaseTicks,marks,file,sha256:sha(bytes)};
 fs.writeFileSync(path.join(pending,file+'.tmp'),bytes);fs.renameSync(path.join(pending,file+'.tmp'),path.join(pending,file));
 const metadata=path.join(pending,`${difficulty}-${seed}.json`);fs.writeFileSync(metadata+'.tmp',JSON.stringify({moduleHashes,record},null,2)+'\n');fs.renameSync(metadata+'.tmp',metadata);
 console.log(JSON.stringify({difficulty,seed,tick:record.tick,hp:record.hp,hits:record.hits,metadata}));
}
async function main(){
 if(fs.existsSync(out))throw Error('Refusing to overwrite existing revision-five input fixtures');
 const resumeAt=process.argv.indexOf('--resume'),pending=resumeAt>=0?path.resolve(process.argv[resumeAt+1]):fs.mkdtempSync(path.join(os.tmpdir(),'hapil-rev5-natural-'));
 if(!fs.statSync(pending).isDirectory())throw Error('Invalid pending directory');
 const status=path.join(pending,'source-hashes.json');if(fs.existsSync(status)){const saved=JSON.parse(fs.readFileSync(status));if(JSON.stringify(saved)!==JSON.stringify(moduleHashes))throw Error('Cannot resume results from another source snapshot');}else fs.writeFileSync(status,JSON.stringify(moduleHashes,null,2)+'\n');
 console.log(JSON.stringify({pendingDirectory:pending,workers:jobs.length,sourceHashes:moduleHashes}));
 const results=await Promise.allSettled(jobs.map(({difficulty,seed})=>new Promise((resolve,reject)=>{
  const existing=path.join(pending,`${difficulty}-${seed}.json`);if(fs.existsSync(existing)){try{resolve(validateResult(JSON.parse(fs.readFileSync(existing)),difficulty,seed,pending));}catch(e){reject(e);}return;}
  cp.execFile(process.execPath,[__filename,'--worker',difficulty,String(seed),pending],{cwd:root,maxBuffer:1024*1024},(error,stdout,stderr)=>{if(error){reject(new Error(`${difficulty}/${seed}: ${stderr||error.message}`));return;}process.stdout.write(stdout);try{resolve(validateResult(JSON.parse(fs.readFileSync(existing)),difficulty,seed,pending));}catch(e){reject(e);}});
 })));
 const failed=results.flatMap((r,i)=>r.status==='rejected'?[{...jobs[i],error:String(r.reason),pendingDirectory:pending,moduleHashes}]:[]);
 if(failed.length){const file=path.join(root,'docs/V19-NATURAL-FAILED-ATTEMPTS-20261030.json'),previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];fs.writeFileSync(file,JSON.stringify(previous.concat(failed),null,2)+'\n');throw Error('Capture failed; no public fixtures emitted. '+JSON.stringify(failed));}
 assertUnchanged();const records=results.map(r=>r.value),ready=path.join(pending,'ready');fs.mkdirSync(ready);for(const r of records)fs.copyFileSync(path.join(pending,r.file),path.join(ready,r.file));
 fs.writeFileSync(path.join(ready,'manifest.json'),JSON.stringify({method:'Full revision-five ordinary-health CPU route. Unchanged game health/damage, auto attack and auto skills; existing legal direction policy reads current threats and announced warnings, never future emissions/RNG. No direct engine-state/health/immunity/timer edits. Six independent workers, private durable staging and all-six atomic publish. Not human/browser/GPU/mobile play.',campaignRevision:5,canonicalNarrativeSHA256:'e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa',recordedModuleSha256:moduleHashes,directions:policy.directions,encounterIds:core.CAMPAIGN_BOSSES.map(b=>b.id),records},null,2)+'\n');
 assertUnchanged();fs.renameSync(ready,out);console.log(JSON.stringify({complete:true,records:records.length,destination:out,pendingDirectory:pending}));
}
if(process.argv[2]==='--worker'){
 const difficulty=process.argv[3],seed=Number(process.argv[4]),pending=path.resolve(process.argv[5]);if(!jobs.some(j=>j.difficulty===difficulty&&j.seed===seed))throw Error('Unknown capture job');record(difficulty,seed,pending);
}else main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
