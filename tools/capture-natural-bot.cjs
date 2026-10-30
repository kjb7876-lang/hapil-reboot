'use strict';const core=require('../src/core.js'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const policy=require('./natural-bot-policy.cjs'),{directions:dirs,move}=policy;
const out=path.join(__dirname,'../tests/fixtures/natural-bot'),corePath=path.join(__dirname,'../src/core.js');fs.mkdirSync(out,{recursive:true});
const codeHash=crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex');
const weaponPath=path.join(__dirname,'../src/weapon-patterns.js'),weaponHash=crypto.createHash('sha256').update(fs.readFileSync(weaponPath)).digest('hex');
const policyFiles=Object.fromEntries(['tools/natural-bot-policy.cjs','tools/hell-forecast-policy.cjs'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex')]));
const records=[],pending=[];
for(const difficulty of ['gentle','normal','hell'])for(const seed of [813,42]){
 const w=core.createRun({campaign:true,campaignRevision:3,difficulty,seed,runId:'natural-bot-'+difficulty+'-'+seed}),marks=[];let seen=w.checkpointSerial,sequence='';
 for(let n=0;n<180000&&!['lost','won'].includes(w.stage);n++){
  const key=move(w);sequence+=String(key);const dir=dirs[key];core.step(w,{dx:dir[0],dy:dir[1]});
  if(w.checkpointSerial!==seen){seen=w.checkpointSerial;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);}
 }
 if(w.stage!=='won'){
  console.error(JSON.stringify({type:'natural-attempt-failed',difficulty,seed,stage:w.stage,tick:w.tick,bossIndex:w.bossIndex,bossId:w.bossId,phase:w.phase,hits:w.stats.hits,hp:w.player.hp,reason:w.resultReason,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups}));
  throw Error(`Natural bot did not clear ${difficulty}/${seed}: ${w.stage} boss ${w.bossIndex} phase ${w.phase} tick ${w.tick}`);
 }
 const file=`${difficulty}-${seed}.moves.gz`,bytes=zlib.gzipSync(Buffer.from(sequence),{mtime:0});pending.push({file,bytes});
 const rec={difficulty,seed,runId:w.runId,stage:w.stage,tick:w.tick,hits:w.stats.hits,hp:w.player.hp,score:w.score,killCount:w.kills,checkpointCount:w.checkpointSerial,phaseTicks:w.stats.phaseTicks,marks,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};records.push(rec);console.log(JSON.stringify({difficulty,seed,tick:w.tick,hits:w.stats.hits,hp:w.player.hp,file,bytes:bytes.length}));
}
if(crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex')!==codeHash||crypto.createHash('sha256').update(fs.readFileSync(weaponPath)).digest('hex')!==weaponHash)throw Error('Simulation module changed during recording: regenerate replays');
for(const [p,hash] of Object.entries(policyFiles))if(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex')!==hash)throw Error('Input policy changed during recording: '+p);
for(const {file,bytes} of pending)fs.writeFileSync(path.join(out,file),bytes);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({method:'Ordinary legal8direction240px/sec input, normal health/damage/autoattack/skills. NORMAL/GENTLE and HELLwaves retain original linear avoidance. HELLcombat uses96tick existing-projectile acceleration/bounce and announced-laser forecast,20curved paths,8ticksegments and4tick input commitment. Natural hit-earned i-frames are read, never assigned. No live state, future emission, RNG, damage or health override; no engine future forks. CPU controller/input recordings, not human/browser/mobile/GPU play.',policyId:policy.id,recordedPolicyFiles:policyFiles,bossIds:core.CAMPAIGN_BOSSES.slice(0,12).map(b=>b.id),directions:dirs,recordedCoreSha256:codeHash,recordedWeaponPatternsSha256:weaponHash,records},null,2)+'\n');
