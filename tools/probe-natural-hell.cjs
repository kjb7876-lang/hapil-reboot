'use strict';
// QA-only ordinary-input attempts. This never writes passing replay fixtures.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),core=require('../src/core.js'),policy=require('./natural-bot-policy.cjs');
const root=path.resolve(__dirname,'..'),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const codeHash=sha('src/core.js'),weaponHash=sha('src/weapon-patterns.js'),policyHash=sha('tools/natural-bot-policy.cjs');
const records=[];
for(const seed of [813,42]){
 const w=core.createRun({campaign:true,difficulty:'hell',seed,runId:'natural-probe-hell-'+seed});
 for(let tick=0;tick<180000&&!['lost','won'].includes(w.stage);tick++){
  const d=policy.directions[policy.move(w)];core.step(w,{dx:d[0],dy:d[1]});
 }
 const result={policy:policy.id||'acceleration-and-bounce-prediction-v14',policySHA256:policyHash,coreSHA256:codeHash,weaponSHA256:weaponHash,difficulty:'hell',seed,stage:w.stage,tick:w.tick,bossIndex:w.bossIndex,bossId:w.bossId,phase:w.phase,hits:w.stats.hits,hp:w.player.hp,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,checkpointCount:w.checkpointSerial};
 records.push(result);console.log(JSON.stringify(result));
}
if(sha('src/core.js')!==codeHash||sha('src/weapon-patterns.js')!==weaponHash||sha('tools/natural-bot-policy.cjs')!==policyHash)throw Error('sources changed during ordinary-input attempt');
const file=path.join(root,'docs/HELL-NATURAL-ATTEMPTS-20261029.json'),report=JSON.parse(fs.readFileSync(file,'utf8'));report.attempts.push(...records);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
if(records.some(r=>r.stage!=='won'))process.exitCode=1;
