'use strict';
// CPU and emulated IndexedDB contract checks; no browser/device claim.
// New combat is selected explicitly. Restoring an older saved boundary never
// upgrades its combat, while new saves retain their version through recovery.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process'),path=require('node:path');
const core=require('../src/core.js'),storeAPI=require('../src/storage.js'),Store=storeAPI._test;
const clone=x=>structuredClone(x);
function boundary(id='v21-save',combatRevision=21){
 const options={campaign:true,campaignRevision:5,difficulty:'hell',seed:813,runId:id};
 if(combatRevision!==undefined)options.combatRevision=combatRevision;
 return core.checkpoint(core.createRun(options));
}
function legacyBoundary(id='legacy-save'){
 return core.checkpoint(core.createRun({campaign:true,campaignRevision:5,difficulty:'hell',seed:813,runId:id}));
}
function mockDB(seed){
 let data=clone(seed),writes=0;
 const db={close(){},transaction(){let aborted=false,pending;
  const tx={abort(){aborted=true;queueMicrotask(()=>tx.onabort&&tx.onabort())},objectStore(){return{
   get(){const req={};queueMicrotask(()=>{if(aborted)return;req.result=clone(data);req.onsuccess&&req.onsuccess();queueMicrotask(()=>{if(aborted)return;if(pending!==undefined){data=clone(pending);writes++}tx.oncomplete&&tx.oncomplete()})});return req},
   put(value){pending=clone(value)}
  }}};return tx;
 }};
 return{env:{indexedDB:{open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req}},location:{protocol:'https:'}},snapshot(){return clone(data)},writes(){return writes}};
}
const stateFields=['combatRevision','tick','stage','stageTime','wave','waveTime','phase','phaseTime','bossIndex','campaignRevision','checkpointSerial','rngState','idCounter','player','boss','enemies','bullets','shots','hazards','stats','skills','memory','resonance','score','graze','kills','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze'];
const state=w=>Object.fromEntries(stateFields.map(k=>[k,w[k]]));

test('new combat revision survives strict save validation and deterministic ordinary-health restore',()=>{
 const original=core.createRun({campaign:true,campaignRevision:5,difficulty:'hell',seed:813,runId:'v21-real-boundary',combatRevision:21});
 const snap=core.checkpoint(original),clean=Store.validateCheckpoint(snap);assert(clean);assert.equal(snap.combatRevision,21);assert.deepEqual(clean,snap);
 const restored=core.restoreCheckpoint(clean);assert.equal(restored.combatRevision,21);assert.deepEqual(state(restored),state(original));
 for(let i=0;i<900;i++){
  const move={dx:i%120<60?2:-2,dy:i%180<90?1:-1};core.step(original,move);core.step(restored,move);assert.deepEqual(state(restored),state(original),'new boundary diverges at ordinary input '+i);
 }
});

test('legacy absent-field boundaries stay byte-compatible and never select new combat on restore',()=>{
 for(const revision of [1,2,3,4,5]){
  const snap=core.checkpoint(core.createRun({campaign:true,campaignRevision:revision,difficulty:'normal',seed:42,runId:'old-revision-'+revision}));
  assert.equal(Object.hasOwn(snap,'combatRevision'),false);const clean=Store.validateCheckpoint(snap);assert.deepEqual(clean,snap);
  const restored=core.restoreCheckpoint(clean);assert.notEqual(restored.combatRevision,21);assert.deepEqual(core.checkpoint(restored),snap);
 }
});

test('unknown or malformed combat selectors cannot silently downgrade a saved run',()=>{
 const snap=boundary();
 for(const invalid of [0,20,22,-1,21.5,'21',null,true,{},[],undefined]){
  const changed={...snap,combatRevision:invalid};assert.equal(Store.validateCheckpoint(changed),null,'store rejects '+String(invalid));assert.throws(()=>core.restoreCheckpoint(changed),/combat|revision|checkpoint/i,'restore rejects '+String(invalid));
  if(invalid!==undefined)assert.throws(()=>core.createRun({campaign:true,campaignRevision:5,combatRevision:invalid}),/combat|revision/i);
 }
});

test('same-run checkpoint writes cannot switch combat revision in either direction or overwrite backup',async()=>{
 for(const current of [boundary('same-new'),legacyBoundary('same-old')]){
  const store=Store.createStore({location:{protocol:'https:'}});await store.open();assert((await store.saveCheckpoint(current)).ok);
  const before=JSON.parse(await store.exportData()),changed={...current,checkpointSerial:current.checkpointSerial+1,tick:current.tick+60};
  if(current.combatRevision===21)delete changed.combatRevision;else changed.combatRevision=21;
  const outcome=await store.saveCheckpoint(changed);assert.equal(outcome.ok,false);assert.match(outcome.reason,/combat|revision/);assert.deepEqual(JSON.parse(await store.exportData()),before);
 }
});

test('v21 backup recovery retains combat and a stale emulated tab cannot replace it with a legacy run',async()=>{
 const first=boundary('v21-cross-tab'),mock=mockDB(undefined),a=Store.createStore(mock.env),b=Store.createStore(mock.env);await a.open();await b.open();
 assert((await a.saveCheckpoint(first)).ok);const next={...first,checkpointSerial:2,tick:60,score:20};assert((await a.saveCheckpoint(next)).ok);
 const saved=mock.snapshot();assert.deepEqual(saved.backup,first);assert.equal(saved.checkpoint.combatRevision,21);
 const stale=await b.saveCheckpoint(legacyBoundary('stale-legacy-run'));assert.equal(stale.ok,false);assert.equal(stale.reason,'conflict');assert.deepEqual(mock.snapshot(),saved);
 assert.deepEqual((await b.peek()).checkpoint,next);assert.equal((await b.saveSettings({quality:'low'})).reason,'conflict');assert.deepEqual(mock.snapshot(),saved);
 const loaded=await b.load();assert.deepEqual(loaded.checkpoint,next);assert.equal(core.restoreCheckpoint(loaded.checkpoint).combatRevision,21);assert((await b.saveSettings({quality:'low'})).ok);
 const afterSettings=mock.snapshot();assert.deepEqual(afterSettings.backup,first);assert.deepEqual(afterSettings.checkpoint,next);
 const damaged=clone(afterSettings);damaged.checkpoint={broken:true};const damagedMock=mockDB(damaged),recovery=Store.createStore(damagedMock.env);await recovery.open();assert.deepEqual((await recovery.load()).checkpoint,first);assert.equal(core.restoreCheckpoint((await recovery.load()).checkpoint).combatRevision,21);assert.deepEqual(damagedMock.snapshot().backup,first);
});

test('practice and malformed v21 backup data cannot overwrite confirmed legacy or v21 progress',async()=>{
 for(const confirmed of [legacyBoundary('confirmed-old'),boundary('confirmed-new')]){
  const store=Store.createStore({location:{protocol:'https:'}});await store.open();assert((await store.saveCheckpoint(confirmed)).ok);const before=await store.exportData();
  const practice=core.checkpoint(core.createRun({campaign:true,campaignRevision:5,difficulty:'hell',seed:813,runId:'v21-practice',combatRevision:21,practiceBoss:true,bossIndex:34}));
  assert.equal((await store.saveCheckpoint(practice)).reason,'practice-checkpoint');assert.equal(await store.exportData(),before);
 }
 const first=boundary('bad-backup'),raw=Store.reduce(undefined,{type:'checkpoint',value:first},0).state;raw.backup.combatRevision=22;const mock=mockDB(raw),store=Store.createStore(mock.env);
 assert.equal((await store.open()).reason,'invalid-storage-state');assert.equal((await store.saveSettings({quality:'low'})).ok,false);assert.equal(mock.writes(),0);assert.deepEqual(mock.snapshot(),raw);assert.deepEqual(JSON.parse(await store.exportData()).rawState,raw);
});


test('an already-open deployed v20 storage client fails closed instead of stripping a newer v21 checkpoint selector',async()=>{
 const oldBoundary=legacyBoundary('old-code-before-upgrade'),initial=Store.reduce(undefined,{type:'checkpoint',value:oldBoundary},0).state;
 const oldBytes=cp.execFileSync('git',['show','d2f5fddff2f12118d5c97a9a24e1111c16a1c771:src/storage.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
 const mock=mockDB(initial),box={module:{exports:{}},window:mock.env,queueMicrotask,setTimeout,clearTimeout};vm.runInNewContext(oldBytes,box,{filename:'deployed-v20-storage.js'});
 const old=box.module.exports._test.createStore(mock.env);assert((await old.open()).ok);assert.equal((await old.load()).checkpoint.runId,oldBoundary.runId);
 const first=boundary('old-code-after-upgrade'),current=Store.createStore(mock.env);assert((await current.open()).ok);assert((await current.saveCheckpoint(first)).ok);const saved=mock.snapshot(),writes=mock.writes();assert.equal(saved.combatContract,21);assert(Store.safeStoredRecord(saved));
 // The old client is already initialized and still owns its earlier revision.
 // Its next transaction must examine the new record before writing settings.
 const outcome=await old.saveSettings({quality:'low'});assert.equal(outcome.ok,false);assert.equal(outcome.reason,'invalid-storage-state');assert.equal(mock.writes(),writes);assert.deepEqual(mock.snapshot(),saved);
 const exported=JSON.parse(await old.exportData());assert.deepEqual(exported.rawState,saved,'old client preserves newer unknown record for recovery');
 const reopenedOld=box.module.exports._test.createStore(mock.env);assert.equal((await reopenedOld.open()).reason,'invalid-storage-state');assert.equal(mock.writes(),writes);
 assert.deepEqual((await current.load()).checkpoint,first);assert.equal(core.restoreCheckpoint((await current.load()).checkpoint).combatRevision,21);
});

test('v21 forward-compatibility marker is required for new records and remains present in exports and loss retries',async()=>{
 const first=boundary('marker-retained'),record=Store.reduce(undefined,{type:'checkpoint',value:first},0).state;const missing=clone(record);delete missing.combatContract;assert.equal(Store.safeStoredRecord(missing),false);for(const invalid of [0,20,22,'21',null])assert.equal(Store.safeStoredRecord({...record,combatContract:invalid}),false);
 const store=Store.createStore({location:{protocol:'https:'}});await store.open();assert((await store.saveCheckpoint(first)).ok);assert.equal(JSON.parse(await store.exportData()).combatContract,21);assert((await store.saveSettings({quality:'low'})).ok);assert.equal(JSON.parse(await store.exportData()).combatContract,21);
 const lost=await store.completeRun({runId:first.runId,difficulty:'hell',score:0,graze:0,kills:0,won:false});assert(lost.ok);const retried=JSON.parse(await store.exportData());assert.equal(retried.combatContract,21);assert.equal(retried.checkpoint.combatRevision,21);assert.equal(retried.backup.combatRevision,21);assert.equal(retried.checkpoint.runId,lost.continuedRunId);assert.equal(retried.backup.runId,lost.continuedRunId);
 const legacy=Store.reduce(undefined,{type:'checkpoint',value:legacyBoundary('legacy-marker-free')},0).state;assert.equal(Object.hasOwn(legacy,'combatContract'),false);assert(Store.safeStoredRecord(legacy));
});
