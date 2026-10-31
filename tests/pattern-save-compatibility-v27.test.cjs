'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),S=require('../src/storage.js')._test;
const BASE='3e5fc485f6006016de7bfa972a5b00683ee216ba';
function oldStore(){const box={module:{exports:{}},console};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/storage.js'],{encoding:'utf8'}),box);return box.module.exports._test;}
function boundary(revision,id='pattern-save27'){if(arguments.length===0)revision=27;const options={campaign:true,campaignRevision:5,combatRevision:revision,difficulty:'normal',seed:42,runId:id};if(revision===undefined)delete options.combatRevision;return C.checkpoint(C.createRun(options));}
const json=x=>JSON.parse(JSON.stringify(x));

test('new27 saves validate and restore ordinary-health timers and exact initial world across every phase',()=>{
 for(const bossIndex of [0,6,8,11,21,24,33,34])for(const phase of [0,1,2]){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:27,practiceBoss:true,bossIndex,difficulty:'normal',seed:813,runId:'pattern27-restore-'+bossIndex+'-'+phase});
  const cp=C.checkpoint(initial);cp.phase=phase;const clean=S.validateCheckpoint(cp);assert.deepEqual(clean,cp);const a=C.restoreCheckpoint(clean),b=C.restoreCheckpoint(clean);
  assert.equal(a.player.hp,3);assert.equal(a.combatRevision,27);
  for(let n=0;n<240;n++){const input={dx:n%80<40?2:-2,dy:n%120<60?.5:-.5,focus:n%90<45};C.step(a,input);C.step(b,input);}
  assert.deepEqual(a,b,'real direction input after restoring must stay deterministic');
 }
});

test('new27 contract blocks an already-open25 client and prevents selector substitution in the same run',()=>{
 const prior=oldStore(),first=boundary(),saved=S.reduce(undefined,{type:'checkpoint',value:first},0);assert(saved.result.ok);assert.equal(saved.state.combatContract,27);assert(S.safeStoredRecord(saved.state));
 assert.equal(prior.safeStoredRecord(json(saved.state)),false,'old tab cannot reinterpret new saved attacks');
 const oldWrite=prior.reduce(json(saved.state),{type:'settings',value:{quality:'low'}},saved.state.revision);assert.equal(oldWrite.result.reason,'invalid-storage-state');assert.equal(oldWrite.changed,false);
 for(const revision of [undefined,21,25]){
  const next={...first,combatRevision:revision,checkpointSerial:2,tick:60};if(revision===undefined)delete next.combatRevision;
  const result=S.reduce(json(saved.state),{type:'checkpoint',value:next},saved.state.revision);assert.equal(result.result.reason,'combat-revision-mismatch');assert.equal(result.changed,false);
 }
 const cleared=S.reduce(json(saved.state),{type:'clear'},saved.state.revision);assert(cleared.result.ok);assert.equal(cleared.state.combatContract,27);assert.equal(prior.safeStoredRecord(json(cleared.state)),false,'clearing cannot remove the old-tab write guard');
});

test('old undefined21and25 records remain byte-equivalent to the prior reducer and keep their own rules',()=>{
 const prior=oldStore();for(const revision of [undefined,21,25]){
  const cp=boundary(revision,'old-record-'+String(revision));assert.equal(cp.combatRevision,revision);assert.deepEqual(S.validateCheckpoint(cp),cp);assert.deepEqual(json(prior.validateCheckpoint(cp)),cp);
  const current=S.reduce(undefined,{type:'checkpoint',value:cp},0),old=prior.reduce(undefined,{type:'checkpoint',value:cp},0);assert.deepEqual(json(current),json(old));
  assert.equal(C.restoreCheckpoint(S.validateCheckpoint(cp)).combatRevision,revision);
 }
});

test('mixed27and25 primary-backup records cannot silently restore a different combat contract',()=>{
 const first=boundary(),state=S.reduce(undefined,{type:'checkpoint',value:first},0).state;
 const mixed=json(state);mixed.backup.combatRevision=25;assert.equal(S.safeStoredRecord(mixed),false);
 assert.equal(S.validateCheckpoint({...first,combatRevision:26}),null);assert.equal(S.validateCheckpoint({...first,combatRevision:28}),null);
});
