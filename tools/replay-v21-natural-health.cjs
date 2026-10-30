'use strict';
// Replay the exact ordinary legal directions recorded by the dedicated probe.
// Failed attempts are deliberately replayed as failed attempts, not relabelled.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),core=require('../src/core.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=path.resolve(process.argv[2]||path.join(root,'docs/V21-NATURAL-HEALTH-20261030.json')),report=JSON.parse(fs.readFileSync(input)),before=Object.fromEntries(Object.keys(report.sourceHashes).map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
assert.equal(report.sourceHashGuardPassed,true,'recording source guard');assert.deepEqual(before,report.sourceHashes,'replay uses exactly the recorded simulation and input-policy implementation');
let ticks=0;const cases=[];
for(const r of report.records){let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:r.bossIndex,combatRevision:21,difficulty:r.difficulty,seed:r.seed,runId:r.runId});let s=core.checkpoint(w);s.phase=r.phase;w=core.restoreCheckpoint(s);
 const bytes=fs.readFileSync(path.resolve(path.dirname(input),r.input.file));assert.equal(sha(bytes),r.input.sha256,'input SHA '+r.bossId+'/'+r.difficulty);const moves=zlib.gunzipSync(bytes).toString('ascii');assert.equal(moves.length,r.ticks);assert.equal(w.player.hp,r.startHP);assert.equal(w.player.invulnerableUntil,0);assert(w.autoAttack&&w.skillRotation);
 for(const key of moves){const d=report.directions[Number(key)];assert(d);assert(!['won','lost'].includes(w.stage),'input after terminal state');core.step(w,{dx:d[0],dy:d[1]});ticks++;}
 for(const [key,value] of Object.entries({stage:w.stage,ticks:w.tick,hp:w.player.hp,hits:w.stats.hits,score:w.score,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups,resultReason:w.resultReason}))assert.deepEqual(value,r[key],`${r.bossId}/${r.difficulty} ${key}`);
 assert.deepEqual(w.stats.phaseTicks,r.phaseTicks);cases.push({bossIndex:r.bossIndex,difficulty:r.difficulty,stage:w.stage,ticks:w.tick,hp:w.player.hp,hits:w.stats.hits,inputSHA256:r.input.sha256});
}
const after=Object.fromEntries(Object.keys(report.sourceHashes).map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));assert.deepEqual(after,before,'source stable during replay');
const result={schema:1,createdAt:new Date().toISOString(),method:'Pure CPU deterministic replays of all recorded legal directions, unmodified engine health and damage; start via actual special-practice checkpoint API. Failed attempts remain failed. No policy execution or direct world edits after start. Not fullcampaign/browser/mobile.',recordingReportSHA256:sha(fs.readFileSync(input)),sourceHashes:before,replayToolSHA256:sha(fs.readFileSync(__filename)),sourceHashGuardPassed:true,summary:{cases:cases.length,ticks,won:cases.filter(r=>r.stage==='won').length,lost:cases.filter(r=>r.stage==='lost').length},cases};
const out=process.argv[3]?path.resolve(process.argv[3]):input.replace(/\.json$/,'.replay.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({report:out,...result.summary}));
