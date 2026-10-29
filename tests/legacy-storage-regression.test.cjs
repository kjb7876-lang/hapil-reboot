'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Store=require('../src/storage.js')._test;
test('a failed persistent write reports failure and does not silently commit to memory',async()=>{
 let writes=0;
 const db={close(){},transaction(name,mode){const tx={objectStore(){return {get(){const req={};queueMicrotask(()=>{if(mode==='readonly'){req.result=undefined;req.onsuccess();queueMicrotask(()=>tx.oncomplete())}else{writes++;queueMicrotask(()=>tx.onabort())}});return req}}}};return tx}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req}};
 const store=Store.createStore({indexedDB,location:{protocol:'https:'}});
 assert.equal((await store.open()).persistent,true);
 const failed=await store.saveSettings({quality:'low'});assert.equal(failed.ok,false);assert.equal(failed.reason,'storage-error');assert.equal(failed.persistent,false);
 const blocked=await store.saveSettings({quality:'high'});assert.equal(blocked.ok,false);assert.equal(blocked.reason,'storage-error');assert.equal(writes,1);
});
test('empty store is distinguishable from settings saved in this session',async()=>{
 const store=Store.createStore({location:{protocol:'https:'}});
 await store.open();const fresh=await store.load();assert.equal(fresh.hasStoredState,false);
 assert.equal((await store.saveSettings({quality:'low'})).ok,true);
 const restored=await store.load();assert.equal(restored.hasStoredState,true);assert.equal(restored.settings.quality,'low');
});

test('loss keeps the confirmed campaign checkpoint and backup, allows retry, and never counts a duplicate result',async()=>{
 const core=require('../src/core.js');
 const store=Store.createStore({location:{protocol:'https:'}});await store.open();
 const first=core.checkpoint(core.createRun({campaign:true,seed:27,runId:'campaign-backup'}));
 assert.equal((await store.saveCheckpoint(first)).ok,true);
 const next={...first,checkpointSerial:first.checkpointSerial+1,tick:first.tick+60,score:345,kills:40};
 assert.equal((await store.saveCheckpoint(next)).ok,true);
 const before=JSON.parse(await store.exportData());
 assert.deepEqual(before.checkpoint,next);assert.deepEqual(before.backup,first);
 const practice=core.checkpoint(core.createRun({campaign:true,practiceBoss:true,bossIndex:4,seed:29,runId:'practice-boss'}));
 const rejected=await store.saveCheckpoint(practice);
 assert.deepEqual([rejected.ok,rejected.reason],[false,'practice-checkpoint']);
 const practiceResult=await store.completeRun({runId:practice.runId,score:0,graze:0,kills:0,difficulty:'normal',won:false,practiceBoss:true});
 assert.equal(practiceResult.reason,'practice-result');
 let unchanged=JSON.parse(await store.exportData());
 assert.deepEqual(unchanged.checkpoint,before.checkpoint);assert.deepEqual(unchanged.backup,before.backup);assert.equal(unchanged.generation,before.generation);
 const lost={runId:next.runId,score:350,graze:3,kills:43,difficulty:'normal',won:false};
 const result=await store.completeRun(lost);assert.equal(result.ok,true);assert(result.continuedRunId);assert.notEqual(result.continuedRunId,lost.runId);
 const recovered=JSON.parse(await store.exportData());
 assert.deepEqual(recovered.checkpoint,{...next,runId:result.continuedRunId});
 assert.deepEqual(recovered.backup,{...first,runId:result.continuedRunId});
 assert.equal(recovered.profile.runs,1);assert.equal(recovered.profile.totalKills,43);assert.equal(recovered.activeRunBaselineKills,40);assert.equal(recovered.completed.length,1);
 const duplicate=await store.completeRun(lost);assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);
 assert.deepEqual(JSON.parse(await store.exportData()),recovered);
 const world=core.restoreCheckpoint(recovered.checkpoint);assert.equal(world.runId,result.continuedRunId);assert.equal(world.checkpointSerial,next.checkpointSerial);
 const later={...recovered.checkpoint,checkpointSerial:next.checkpointSerial+1,tick:next.tick+60,kills:50};
 assert.equal((await store.saveCheckpoint(later)).ok,true);
 const again=await store.completeRun({...lost,runId:result.continuedRunId,kills:55});assert.equal(again.ok,true);assert.notEqual(again.continuedRunId,result.continuedRunId);
 const afterSecond=JSON.parse(await store.exportData());assert.equal(afterSecond.profile.totalKills,58);assert.equal(afterSecond.activeRunBaselineKills,50);
 const finalRun=again.continuedRunId,win=await store.completeRun({...lost,runId:finalRun,kills:60,won:true});assert.equal(win.ok,true);
 const finished=JSON.parse(await store.exportData());assert.equal(finished.checkpoint,null);assert.equal(finished.backup,null);assert.equal(finished.profile.runs,3);assert.equal(finished.profile.wins,1);assert.equal(finished.profile.totalKills,68);assert.equal(finished.activeRunBaselineKills,0);
 const winAgain=await store.completeRun({...lost,runId:finalRun,kills:60,won:true});assert.equal(winAgain.duplicate,true);
 assert.deepEqual(JSON.parse(await store.exportData()),finished);
});

test('a practice result without a flag cannot create or replace a campaign record',async()=>{
 const core=require('../src/core.js'),store=Store.createStore({location:{protocol:'https:'}});await store.open();
 const s={runId:'practice-only',score:0,graze:0,kills:0,difficulty:'normal',won:false};
 assert.equal((await store.completeRun(s)).reason,'inactive-run');
 const c=core.checkpoint(core.createRun({campaign:true,runId:'real-campaign'}));await store.saveCheckpoint(c);
 const before=JSON.parse(await store.exportData());assert.equal((await store.completeRun(s)).reason,'inactive-run');
 assert.deepEqual(JSON.parse(await store.exportData()),before);
});

test('a pending checkpoint write commits before a queued loss and the loss retains that checkpoint',async()=>{
 const core=require('../src/core.js');
 let data,holdWrites=false,waiting=[];
 const db={close(){},transaction(name,mode){
  let pending,put=false;
  const tx={objectStore(){return {
   get(){const req={};queueMicrotask(()=>{req.result=data===undefined?undefined:structuredClone(data);req.onsuccess();
    const finish=()=>{if(put)data=structuredClone(pending);tx.oncomplete();};
    if(mode==='readwrite'&&holdWrites)waiting.push(finish);else queueMicrotask(finish);
   });return req;},
   put(value){put=true;pending=structuredClone(value);}
  };}};return tx;
 }};
 const indexedDB={open(){const request={result:db};queueMicrotask(()=>request.onsuccess());return request;}};
 const store=Store.createStore({indexedDB,location:{protocol:'https:'}});assert.equal((await store.open()).persistent,true);
 const first=core.checkpoint(core.createRun({campaign:true,runId:'pending-campaign'}));assert.equal((await store.saveCheckpoint(first)).ok,true);
 holdWrites=true;
 const next={...first,checkpointSerial:first.checkpointSerial+1,tick:first.tick+60,kills:12};
 const savePromise=store.saveCheckpoint(next);
 const lossPromise=store.completeRun({runId:first.runId,score:0,graze:0,kills:14,difficulty:'normal',won:false});
 await new Promise(r=>setImmediate(r));assert.equal(waiting.length,1,'the later mutation has not started before this transaction commits');
 holdWrites=false;waiting.shift()();assert.equal((await savePromise).ok,true);
 const loss=await lossPromise;assert.equal(loss.ok,true);assert(loss.continuedRunId);
 const exported=JSON.parse(await store.exportData());assert.deepEqual(exported.checkpoint,{...next,runId:loss.continuedRunId});
 assert.deepEqual(exported.backup,{...first,runId:loss.continuedRunId});assert.equal(exported.activeRunBaselineKills,12);
 assert.equal(exported.profile.totalKills,14);
 const stale=await store.saveCheckpoint({...next,checkpointSerial:next.checkpointSerial+1,tick:next.tick+60});
 assert.deepEqual([stale.ok,stale.reason],[false,'completed']);
});

test('a stale tab cannot complete over a newer checkpoint or corrupt its backup',()=>{
 const core=require('../src/core.js');
 const checkpoint=core.checkpoint(core.createRun({campaign:true,runId:'race-campaign'}));
 const initial=Store.reduce(undefined,{type:'checkpoint',value:checkpoint},0);assert.equal(initial.result.ok,true);
 const next={...checkpoint,checkpointSerial:checkpoint.checkpointSerial+1,tick:60};
 const saved=Store.reduce(initial.state,{type:'checkpoint',value:next},initial.state.revision);assert.equal(saved.result.ok,true);
 const loss={runId:checkpoint.runId,score:0,graze:0,kills:0,difficulty:'normal',won:false};
 const stale=Store.reduce(saved.state,{type:'complete',value:loss},initial.state.revision);
 assert.equal(stale.changed,false);assert.equal(stale.result.reason,'conflict');
 assert.deepEqual(stale.state.checkpoint,next);assert.deepEqual(stale.state.backup,checkpoint);assert.equal(stale.state.profile.runs,0);
});

test('corrupt or future stored records cannot be overwritten; recoverable raw bytes are included in export',async()=>{
 const core=require('../src/core.js'),cp=core.checkpoint(core.createRun({campaign:true,runId:'damaged-save'}));
 for(const raw of [
  {version:99,unexpected:'future schema'},
  {...Store.emptyState(),profile:null},
  {...Store.emptyState(),profile:{...Store.emptyState().profile,bestScore:'damaged'}},
  {...Store.emptyState(),settings:{...Store.emptyState().settings,quality:'damaged'}},
  {...Store.emptyState(),activeRunId:cp.runId,checkpoint:cp,backup:{...cp,runId:'wrong-run'}},
  {...Store.emptyState(),activeRunId:cp.runId,checkpoint:cp,backup:cp,completed:'bad ledger'},
 ]){
  let stored=structuredClone(raw),writes=0;
  const db={close(){},transaction(name,mode){let next;const tx={objectStore(){return{
   get(){const req={};queueMicrotask(()=>{req.result=structuredClone(stored);req.onsuccess();queueMicrotask(()=>{if(next){stored=structuredClone(next);writes++;}tx.oncomplete()})});return req;},
   put(value){next=value;}
  };}};return tx;}};
  const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;}};
  const store=Store.createStore({indexedDB,location:{protocol:'https:'}});await store.open();
  assert.match(store.status.message,/저장 데이터 오류/);
  const result=await store.saveSettings({quality:'low'});assert.equal(result.reason,'invalid-storage-state');
  assert.equal(writes,0);assert.deepEqual(stored,raw);
  const backup=JSON.parse(await store.exportData());assert.deepEqual(backup.rawState,raw);
 }
});

test('counter exhaustion is readable/exportable but cannot overflow a version-1 record',async()=>{
 const raw={...Store.emptyState(),revision:Number.MAX_SAFE_INTEGER-1};
 const update=Store.reduce(raw,{type:'settings',value:{quality:'low'}},raw.revision);
 assert.equal(update.changed,false);assert.equal(update.result.reason,'counter-exhausted');assert.deepEqual(raw,Store.normalizeState(raw));
});

test('peek observes another writer without silently granting this tab its revision',async()=>{
 const core=require('../src/core.js');let data;
 const db={close(){},transaction(name,mode){let next,put=false;const tx={objectStore(){return{
  get(){const req={};queueMicrotask(()=>{req.result=data===undefined?undefined:structuredClone(data);req.onsuccess();queueMicrotask(()=>{if(put)data=structuredClone(next);tx.oncomplete();});});return req;},
  put(value){put=true;next=structuredClone(value);}
 };}};return tx;}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;}};
 const env={indexedDB,location:{protocol:'https:'}},a=Store.createStore(env),b=Store.createStore(env);
 await a.open();await b.open();const cp=core.checkpoint(core.createRun({campaign:true,runId:'other-tab'}));assert.equal((await a.saveCheckpoint(cp)).ok,true);
 assert.deepEqual((await b.peek()).checkpoint,cp);
 const denied=await b.saveSettings({quality:'low'});assert.equal(denied.reason,'conflict');
 await b.load();assert.equal((await b.saveSettings({quality:'low'})).ok,true);
 const aStillStale=await a.saveSettings({quality:'high'});assert.equal(aStillStale.reason,'conflict');
 assert.equal((await b.load()).settings.quality,'low');
});

test('load reports a persistent read error instead of exposing stale in-memory progress',async()=>{
 const core=require('../src/core.js');const cp=core.checkpoint(core.createRun({campaign:true,runId:'read-failure'}));
 let stored={...Store.emptyState(),activeRunId:cp.runId,checkpoint:cp,backup:cp},reads=0,writes=0;
 const original=structuredClone(stored);
 const db={close(){},transaction(name,mode){const tx={objectStore(){return{
  get(){const req={};queueMicrotask(()=>{if(mode==='readonly'&&++reads>1){tx.onabort();return;}req.result=structuredClone(stored);req.onsuccess();queueMicrotask(()=>tx.oncomplete());});return req;},
  put(value){writes++;stored=structuredClone(value);}
 };}};return tx;}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;}};
 const store=Store.createStore({indexedDB,location:{protocol:'https:'}});
 assert.equal((await store.open()).ok,true);assert.equal(store.status.persistent,true);
 const failed=await store.load();assert.deepEqual([failed.ok,failed.reason,failed.persistent],[false,'storage-error',false]);
 assert.equal(Object.hasOwn(failed,'checkpoint'),false);
 assert.deepEqual([...(await Promise.all([store.saveSettings({quality:'low'}),store.peek()])).map(x=>x.reason)],['storage-error','storage-error']);
 assert.equal(writes,0);assert.deepEqual(stored,original);
});

test('load and open report malformed saved state while leaving a true memory-only session usable',async()=>{
 const invalidRaw={...Store.emptyState(),completed:'bad-ledger'};let writes=0;
 const db={close(){},transaction(){const tx={objectStore(){return{get(){const req={};queueMicrotask(()=>{req.result=structuredClone(invalidRaw);req.onsuccess();queueMicrotask(()=>tx.oncomplete());});return req;},put(){writes++;}};}};return tx;}};
 const idb={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;}};
 const blocked=Store.createStore({indexedDB:idb,location:{protocol:'https:'}});
 assert.equal((await blocked.open()).reason,'invalid-storage-state');assert.equal((await blocked.load()).reason,'invalid-storage-state');
 assert.equal((await blocked.peek()).reason,'invalid-storage-state');assert.equal(writes,0);
 assert.deepEqual(JSON.parse(await blocked.exportData()).rawState,invalidRaw);
 const memory=Store.createStore({location:{protocol:'file:'}});assert.equal((await memory.open()).ok,true);
 const ready=await memory.load();assert.notEqual(ready.ok,false);assert.equal(ready.persistent,false);
 assert.equal((await memory.saveSettings({quality:'low'})).ok,true);assert.equal((await memory.load()).settings.quality,'low');
});
