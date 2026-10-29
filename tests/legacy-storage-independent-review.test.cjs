'use strict';
// Independent safety tests; an emulated IndexedDB is NOT an actual browser test.
const test=require('node:test'),assert=require('node:assert/strict');
const Store=require('../src/storage.js')._test, core=require('../src/core.js');
const clone=x=>structuredClone(x);
function fixture(runId='independent-save') {
  return core.checkpoint(core.createRun({campaign:true,difficulty:'normal',seed:17,runId}));
}
function mockDB(seed){
  let data=clone(seed),writes=0;
  const db={close(){},transaction(name,mode){let aborted=false,pending;
    const tx={abort(){aborted=true;queueMicrotask(()=>tx.onabort&&tx.onabort())},objectStore(){return {
      get(){const req={};queueMicrotask(()=>{if(aborted)return;req.result=clone(data);req.onsuccess&&req.onsuccess();queueMicrotask(()=>{if(aborted)return;if(pending!==undefined){data=clone(pending);writes++}tx.oncomplete&&tx.oncomplete()})});return req},
      put(value){pending=clone(value)}
    }}};return tx;
  }};
  return {env:{indexedDB:{open(){const r={result:db};queueMicrotask(()=>r.onsuccess());return r}},location:{protocol:'https:'}},snapshot(){return clone(data)},writes(){return writes}};
}
function withCheckpoint(){const c=fixture();const v=Store.reduce(undefined,{type:'checkpoint',value:c},0);assert(v.result.ok);return v.state}
function result(id,won=false){return {runId:id,score:0,graze:0,kills:0,difficulty:'normal',won}}

test('legacy v1 without baseline restores and retries 96-character run IDs with bounded, collision-free IDs',()=>{
  const id='a'.repeat(96),cp=fixture(id);let s=Store.reduce(undefined,{type:'checkpoint',value:cp},0).state;delete s.activeRunBaselineKills;
  const base=id.slice(0,62)+'-retry-'+(s.generation+1).toString(36)+'-';
  const collisions=[0,1].map(n=>({...result(id),runId:base+n.toString(36)}));
  s.completed.push(...collisions);
  let previous=id;
  for(let i=0;i<260;i++){
    const v=Store.reduce(s,{type:'complete',value:result(previous)},s.revision);assert.equal(v.result.ok,true);
    assert.equal(v.changed,true);assert.notEqual(v.result.continuedRunId,previous);
    assert(v.result.continuedRunId.length<=96);assert.match(v.result.continuedRunId,/^[A-Za-z0-9_.:-]+$/);
    if(i===0)for(const collision of collisions)assert.notEqual(v.result.continuedRunId,collision.runId);
    const state=Store.normalizeState(v.state);assert(state.checkpoint);assert(state.backup);assert.equal(state.checkpoint.runId,v.result.continuedRunId);
    assert.equal(state.completed.length,Math.min(256,i+3));assert.equal(state.profile.runs,i+1);
    previous=v.result.continuedRunId;s=state;
  }
  const finished=Store.reduce(s,{type:'complete',value:result(previous,true)},s.revision);assert.equal(finished.result.ok,true);assert.equal(finished.state.checkpoint,null);assert.equal(finished.state.backup,null);
});

test('a damaged main checkpoint can restore from same-run backup without deleting it',async()=>{
  const state=withCheckpoint(),cp=clone(state.checkpoint);state.checkpoint={broken:true};
  const mock=mockDB(state),store=Store.createStore(mock.env);await store.open();const loaded=await store.load();
  assert.deepEqual(loaded.checkpoint,cp);assert.deepEqual(mock.snapshot().backup,cp);
  const exportState=JSON.parse(await store.exportData());assert.deepEqual(exportState.backup,cp);
});

test('corrupt metadata and corrupt backup block writes and preserve original bytes for export',async()=>{
  const variants=[s=>{s.completed='invalid ledger'},s=>{s.revision=-1},s=>{s.activeRunId='bad id!'},s=>{s.backup={broken:true}},s=>{s.profile=null},s=>{s.profile.bestScore='invalid'},s=>{s.settings.quality='invalid'}];
  for(const damage of variants){const original=withCheckpoint();damage(original);const mock=mockDB(original),store=Store.createStore(mock.env);await store.open();
    const write=await store.saveSettings({quality:'low'});assert.equal(write.ok,false,'unsafe state must fail closed');
    assert.equal(mock.writes(),0,'never overwrite stored corrupt bytes');assert.deepEqual(mock.snapshot(),original);
    const exported=JSON.parse(await store.exportData());assert.deepEqual(exported.rawState,original,'the original state remains exportable for recovery');
  }
});

test('valid boundary generation and revision remain loadable but reject overflowing mutation',async()=>{
  for(const field of ['generation','revision']){const original=withCheckpoint();original[field]=Number.MAX_SAFE_INTEGER-1;
    const mock=mockDB(original),store=Store.createStore(mock.env);await store.open();const before=await store.load();assert.deepEqual(before.checkpoint,original.checkpoint);
    const out=field==='generation'?await store.completeRun(result(original.activeRunId)):await store.saveSettings({quality:'low'});
    assert.equal(out.ok,false,`${field} overflow must be rejected`);assert.equal(mock.writes(),0);assert.deepEqual(mock.snapshot(),original);
  }
});

test('two emulated clients cannot overwrite the newer confirmed run; explicit reload adopts it',async()=>{
 const mock=mockDB(undefined),first=Store.createStore(mock.env),second=Store.createStore(mock.env);await first.open();await second.open();
 const cp=fixture('cross-tab-independent');assert.equal((await first.saveCheckpoint(cp)).ok,true);
 let stale=await second.saveSettings({quality:'low'});assert.equal(stale.ok,false);assert.equal(stale.reason,'conflict');assert.deepEqual(mock.snapshot().checkpoint,cp);
 assert.deepEqual((await second.load()).checkpoint,cp);assert.equal((await second.saveSettings({quality:'low'})).ok,true);
 stale=await first.completeRun(result(cp.runId));assert.equal(stale.ok,false);assert.equal(stale.reason,'conflict');assert.deepEqual(mock.snapshot().checkpoint,cp);
 assert.deepEqual((await first.load()).checkpoint,cp);const finished=await first.completeRun(result(cp.runId));assert.equal(finished.ok,true);assert.equal(mock.snapshot().checkpoint.runId,finished.continuedRunId);
});

test('automatic peek reads another client without authorizing the old world to overwrite it',async()=>{
 const mock=mockDB(undefined),a=Store.createStore(mock.env),b=Store.createStore(mock.env);await a.open();await b.open();
 const old=fixture('peek-old');assert((await a.saveCheckpoint(old)).ok);await b.load();
 const fresh=fixture('peek-fresh');assert((await b.saveCheckpoint(fresh)).ok);
 assert.equal((await a.saveCheckpoint({...old,checkpointSerial:2,tick:60})).reason,'conflict');
 const viewed=await a.peek();assert.deepEqual(viewed.checkpoint,fresh);
 const attempted=await a.saveCheckpoint({...old,checkpointSerial:2,tick:60});
 assert.equal(attempted.ok,false);assert.equal(attempted.reason,'conflict');assert.deepEqual(mock.snapshot().checkpoint,fresh);
 // A deliberately initiated load is allowed to adopt revision; the caller
 // must restore the returned checkpoint rather than keep advancing old world.
 assert.deepEqual((await a.load()).checkpoint,fresh);
});

test('a later IndexedDB read error never reports an old memory snapshot as a successful load',async()=>{
 const original=withCheckpoint();let failRead=false;
 const db={close(){},transaction(name,mode){const tx={abort(){queueMicrotask(()=>tx.onabort&&tx.onabort())},objectStore(){return {get(){const req={};queueMicrotask(()=>{
  if(failRead){tx.onabort();return;}req.result=clone(original);req.onsuccess();queueMicrotask(()=>tx.oncomplete());
 });return req}}}};return tx}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req}};
 const store=Store.createStore({indexedDB,location:{protocol:'https:'}});await store.open();assert.deepEqual((await store.load()).checkpoint,original.checkpoint);
 failRead=true;const outcome=await store.load();assert.equal(outcome.ok,false,'failed reads cannot restore a stale memory checkpoint');assert.equal(outcome.reason,'storage-error');assert.equal(store.status.persistent,false);
});
