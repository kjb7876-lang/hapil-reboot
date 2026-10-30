'use strict';
// Independently pinned latest-narrative order and historical save boundaries.
// Controlled boundary fixtures are distinct from ordinary-health route replays.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const scenes=['last305','last301','last303','kair01','kair05','kair06','kair07','kair08','kair09','kair10','kair02','kair03','hando03','murder03','cult01','cult03','cult04'];
const chapters=[4,4,4,5,5,5,5,5,5,5,5,5,6,7,8,8,8];
test('revision-five combat order follows the independent canonical scene map without treating civilians or 66 guards as new named bosses',()=>{
 const canon=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/V19-CANON-ROUTE-20261030.json'),'utf8'));
 assert.equal(canon.source.sha256,'e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa');assert.deepEqual(canon.newCombatSceneOrder,scenes);assert.equal(canon.source.storyModeEndLine,828);assert.equal(canon.interpretation.canonicalUniqueBossCountClaimed,false);assert.deepEqual(canon.interpretation.guardsInText,{total:66,lower:48,upper:12,grand:6});
 const additions=core.CAMPAIGN_BOSSES.slice(18);assert.equal(additions.length,17);assert.deepEqual(additions.map(e=>e.sceneIds[0]),scenes);assert.deepEqual(additions.map(e=>e.chapter),chapters);
 assert(!additions.some(e=>['last302','murder01','murder02','murder04'].includes(e.sceneIds[0])),'protected villagers and human witnesses are not shooter bosses');
 assert(!additions.some(e=>/은재|네오서울|윤서하 엔딩|사몽역행/.test(e.name)),'excluded continuations do not leak into the source-mode campaign');
 for(let n=0;n<17;n++){const w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:n+18,difficulty:'normal',seed:813});assert.equal(w.protagonist,n>=3&&n<=11?'윤서하':'환도');assert.equal(w.boss.linkTarget,true,'target is an actor attack/command resistance, no fake death burst');assert.equal(w.boss.healthLabel,additions[n].healthLabel);assert.equal(w.bossCount,35);}
 assert.equal(additions[1].scriptedFall,true);assert.equal(additions[1].combatKind,'scripted-fall');assert.equal(additions[10].combatKind,'release-command');assert.equal(additions[15].combatKind,'circuit-pair');assert.equal(additions[16].combatKind,'final-authority');
});
test('revision-five save history expands to105 phases/208 boundaries without widening any revision-one-through-four record',()=>{
 assert.equal(core.CAMPAIGN_REVISION,3);assert.equal(core.LATEST_CAMPAIGN_REVISION,5);assert.equal(core.createRun({campaign:true}).campaignRevision,3);
 for(const [revision,count,maxSerial,maxPhases] of [[1,3,100,9],[2,5,100,15],[3,12,100,36],[4,18,106,54],[5,35,208,105]]){
  const w=core.createRun({campaign:true,campaignRevision:revision,difficulty:'normal',seed:813,runId:'historical-save-'+revision}),snapshot=core.checkpoint(w);assert.equal(w.bossCount,count);snapshot.bossIndex=count-1;snapshot.stage='boss';snapshot.phase=2;snapshot.checkpointSerial=maxSerial;snapshot.stats.phaseTicks=Array(maxPhases).fill(1200);
  const valid=store.validateCheckpoint(snapshot);assert.deepEqual(valid,snapshot);assert.equal(core.restoreCheckpoint(valid).bossCount,count);assert.equal(core.restoreCheckpoint(valid).campaignRevision,revision);
  for(const invalid of [{...snapshot,bossIndex:count},{...snapshot,checkpointSerial:maxSerial+1},{...snapshot,stats:{...snapshot.stats,phaseTicks:Array(maxPhases+1).fill(1200)}}]){assert.equal(store.validateCheckpoint(invalid),null);assert.throws(()=>core.restoreCheckpoint(invalid));}
 }
});
test('creating the new campaign leaves retained revision-three/four raw records untouched and restores their exact checkpoint/backup values',()=>{
 for(const revision of [3,4]){const first=core.checkpoint(core.createRun({campaign:true,campaignRevision:revision,difficulty:'normal',seed:813,runId:'old-'+revision}));let state=store.reduce(undefined,{type:'checkpoint',value:first},0).state;const next={...first,checkpointSerial:2,tick:60,score:1};state=store.reduce(state,{type:'checkpoint',value:next},state.revision).state;const before=JSON.stringify(state);
  const fresh=core.createRun({campaign:true,campaignRevision:5,seed:42});assert.equal(fresh.bossCount,35);assert.equal(JSON.stringify(state),before);const loaded=store.normalizeState(state);assert.deepEqual(loaded.checkpoint,state.checkpoint);assert.deepEqual(loaded.backup,state.backup);for(const s of [loaded.checkpoint,loaded.backup])assert.equal(core.restoreCheckpoint(s).bossCount,revision===3?12:18);
 }
});
test('all twelve retained ordinary input files remain exactly the original repository bytes',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/V19-QA-BASELINE-20261030.json'),'utf8'));assert.equal(manifest.retainedOrdinaryInputFiles.length,12);
 for(const f of manifest.retainedOrdinaryInputFiles){const b=fs.readFileSync(path.join(__dirname,'..',f.path));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
});
function boundary(index,phase){const w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:index,difficulty:'normal',seed:813,runId:'controlled-canon-boundary'});const s=core.checkpoint(w);s.practiceBoss=false;s.phase=phase;s.autoAttack=false;s.skillRotation=false;return core.restoreCheckpoint(s);}
function finish(w){const b=w.boss;w.shots.push({id:++w.idCounter,x:b.x,y:b.y,px:b.x,py:b.y,vx:0,vy:0,r:2,age:0,ttl:1,damage:b.hp,kind:'basic',angle:-Math.PI/2});core.step(w,{});}
test('the knight boundary is a canonical defeat/fall, while Arbelia and the causal records are preserved',()=>{
 const fall=boundary(19,2);finish(fall);assert.equal(fall.stage,'transition');assert.equal(fall.nextEncounter,20);assert.equal(fall.storyOutcome,'defeated-and-fell');assert(fall.events.some(e=>e.type==='story-fall'));assert(!fall.events.some(e=>e.type==='win'||e.type==='lose'));assert.match(fall.transitionNarrative.join(' '),/추락/);assert.match(fall.transitionNarrative.join(' '),/주민/);
 const arbelia=boundary(28,2);finish(arbelia);assert.equal(arbelia.stage,'transition');assert.equal(arbelia.arbeliaFreed,true);assert.equal(arbelia.storyOutcome,'arbelia-self-rewrites');assert(arbelia.events.some(e=>e.type==='release'));assert(!arbelia.events.some(e=>e.type==='kill'));assert.match(arbelia.transitionNarrative.join(' '),/직접 다시|직접.*쓰|스스로/);
 const causal=boundary(31,2);finish(causal);assert.equal(causal.guiltRecordsPreserved,true);assert(causal.events.some(e=>e.type==='record-preserved'));assert.match(causal.transitionNarrative.join(' '),/한이경/);assert.match(causal.transitionNarrative.join(' '),/실제 과실/);
});
test('the final story has revival, alive-before-death awakening and a protected-core guardian conclusion',()=>{
 const w=boundary(34,0),narratives=[];let sawAwakening=false;
 for(let phase=0;phase<3;phase++){
  assert.equal(w.stage,'boss');assert.equal(w.phase,phase);if(phase===2){assert.equal(w.samongAwakened,true);assert.equal(w.player.hp,w.player.maxHp);sawAwakening=w.events.some(e=>e.type==='awakening');}
  finish(w);if(w.transitionNarrative)narratives.push(w.transitionNarrative.join(' '));if(phase<2){for(let i=0;i<1800&&w.stage==='transition';i++)core.step(w,{});}
 }
 assert.match(narratives[0],/신경선/);assert.match(narratives[0],/되살아난/);assert.match(narratives[1],/아직 살아/);assert.match(narratives[1],/현실.*기억|기억.*현실/);assert.match(narratives[1],/사몽/);assert(sawAwakening);
 assert.equal(w.stage,'won');assert.equal(w.coreIntact,true);assert.equal(w.forcedCommandsSeparated,true);assert.equal(w.guardianRole,'몽세수호자');assert(w.endingNarrative.length>=4);assert.match(w.resultReason,/코어는 파괴하지 않고/);assert.match(w.resultReason,/사이비 회로만 분리/);assert.match(w.resultReason,/몽세수호자/);
});
