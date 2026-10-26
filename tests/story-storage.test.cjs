'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const State = require('../src/story-state.js');
const Data = require('../src/story-data.js');
const Storage = require('../src/story-storage.js');
const clone = value => JSON.parse(JSON.stringify(value));
function memory(seed = {}) {
  const values = new Map(Object.entries(seed)), reads = [], writes = [];
  return {values, reads, writes, failRead:false, failWrite:false,
    getItem(key) { reads.push(key); if(this.failRead) throw Error('denied'); return values.has(key) ? values.get(key) : null; },
    setItem(key,value) { if(this.failWrite) throw Error('quota'); writes.push(key); values.set(key,String(value)); },
    removeItem() { throw Error('Story store must not remove old data'); },
    clear() { throw Error('Story store must not clear storage'); }
  };
}
function setup(storage = memory()) {
  const engine = State.create(Data,{canStartCombat:()=>true,verifyResult:event=>event.receipt==='test-only-adapter'});
  return {storage,engine,store:Storage.create(engine,{storage})};
}
function step(engine,state,event) { const result=engine.reduce(state,event);assert.equal(result.ok,true,result.reason);return result.state; }
function activeState(engine) {
  let state=engine.newState();
  while(!engine.availableCombats(state).length) {
    const frontier=engine.deriveFrontier(state);
    while(state.viewSceneId!==frontier.sceneId) state=step(engine,state,{type:'VIEW_NEXT'});
    state=step(engine,state,{type:'ACK_SCENE',sceneId:state.viewSceneId});
  }
  const combatId=engine.availableCombats(state)[0];
  return step(engine,state,{type:'START_COMBAT',combatId,runId:'active-test'});
}
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
function resign(envelope) {
  const text=canonical({schemaVersion:envelope.schemaVersion,revision:envelope.revision,state:envelope.state});let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  envelope.checksum='fnv1a32:'+hash.toString(16).padStart(8,'0');return JSON.stringify(envelope);
}

test('UMD browser global and CommonJS expose the same story-only API',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(require.resolve('../src/story-storage.js'),'utf8'),context);
  assert.equal(context.HapilStoryStorage.KEY,Storage.KEY);
  assert.equal(typeof context.HapilStoryStorage.create,'function');
  assert.throws(()=>Storage.create(State),/StoryState instance/);
});

test('new start is explicit; loading and validating never write; start cannot replace progress',()=>{
  const {store,storage,engine}=setup();assert.deepEqual(store.load(),{ok:true,status:'empty',revision:0,state:null});assert.equal(storage.writes.length,0);
  assert.equal(store.startNew().reason,'expected-revision-required');const created=store.startNew(0);
  assert.equal(created.ok,true);assert.equal(created.revision,1);assert.deepEqual(created.state,engine.newState());
  assert.deepEqual(store.load(),created);assert.equal(store.startNew(1).reason,'story-already-exists');
  assert.equal(storage.writes.length,1);
});

test('save/load copies actual validated state, keeping view navigation separate from clears',()=>{
  const {store,engine}=setup();const fresh=engine.newState();const preview=step(engine,fresh,{type:'VIEW_NEXT'});
  const original=clone(preview);const saved=store.save(preview,0);assert.equal(saved.ok,true);
  assert.deepEqual(preview,original);assert.deepEqual(store.load().state.clearedCombatIds,[]);assert.deepEqual(store.load().state.acknowledgedSceneIds,[]);
  saved.state.clearedCombatIds.push('not-persisted');assert.deepEqual(store.load().state,preview);
  assert.equal(store.load().revision,1);assert.equal(store.load().state.revision,preview.revision,'persistence revision is distinct from reducer revision');
});

test('ordinary tampering, malformed data, and future versions preserve exact evidence',()=>{
  const {store,storage}=setup();store.startNew(0);const baseline=storage.values.get(Storage.KEY);
  for(const [raw,status] of [['{broken','corrupt'],['null','corrupt'],[JSON.stringify({...JSON.parse(baseline),revision:999}),'corrupt'],[JSON.stringify({...JSON.parse(baseline),schemaVersion:2}),'version-mismatch'],[JSON.stringify({...JSON.parse(baseline),state:{...JSON.parse(baseline).state,contentRevision:'future'}}),'version-mismatch']]) {
    storage.values.set(Storage.KEY,raw);const writes=storage.writes.length;
    assert.equal(store.load().status,status);assert.equal(store.save(State.create(Data).newState(),0).status,status);assert.equal(store.startNew(0).status,status);
    assert.equal(storage.writes.length,writes);assert.equal(storage.values.get(Storage.KEY),raw);
  }
});

test('checksummed but invalid progress and unsupported checkpoint snapshots still fail State validation',()=>{
  const {store,storage,engine}=setup();store.startNew(0);const envelope=JSON.parse(storage.values.get(Storage.KEY));
  for(const patch of [{clearedCombatIds:[Data.primaryCombatIds[0]]},{snapshot:{tick:0}},{activeCombat:{combatId:Data.primaryCombatIds[0],runId:'forged',status:'active',practice:false,snapshot:{tick:0}}}]) {
    const raw=resign({...envelope,state:{...envelope.state,...patch}});storage.values.set(Storage.KEY,raw);
    assert.equal(store.load().status,'corrupt');assert.equal(storage.values.get(Storage.KEY),raw);
  }
  assert.equal(store.save({...engine.newState(),snapshot:{tick:0}},1).reason,'invalid-state');
});

test('all legacy keys remain untouched and unread; no v8 clears implicitly migrate',()=>{
  const old={'hapil.v8':'old raw v8','hapil.campaign.v8':JSON.stringify({cleared:['all']}),'hapil.reboot.firstbattle.v1':'old combat store'};
  const {store,storage}=setup(memory(old));store.load();store.startNew(0);store.backup(1);store.quarantine(1);store.reset(1);
  for(const [key,value] of Object.entries(old))assert.equal(storage.values.get(key),value);
  assert.ok(storage.reads.every(key=>key===Storage.KEY||key===Storage.BACKUP_KEY||key===Storage.QUARANTINE_KEY));
  assert.ok(storage.writes.every(key=>[Storage.KEY,Storage.BACKUP_KEY,Storage.QUARANTINE_KEY].includes(key)));
  assert.deepEqual(store.load().state.clearedCombatIds,[]);
});

test('stale tab revision cannot overwrite newer progress or reset it',()=>{
  const {storage,engine,store:a}=setup();a.startNew(0);const b=Storage.create(engine,{storage});const tabA=a.load(),tabB=b.load();
  const next=step(engine,tabA.state,{type:'ACK_SCENE',sceneId:tabA.state.viewSceneId});assert.equal(a.save(next,tabA.revision).revision,2);
  const evidence=storage.values.get(Storage.KEY);assert.equal(b.save(tabB.state,tabB.revision).status,'conflict');assert.equal(b.reset(tabB.revision).status,'conflict');assert.equal(storage.values.get(Storage.KEY),evidence);
  const refreshed=b.load();assert.equal(b.save(refreshed.state,refreshed.revision).revision,3);
});

test('storage failures never mutate caller state or claim persistence',()=>{
  const {store,storage,engine}=setup();store.startNew(0);const input=engine.newState(),original=clone(input),raw=storage.values.get(Storage.KEY);
  storage.failWrite=true;assert.equal(store.save(input,1).status,'storage-error');assert.deepEqual(input,original);assert.equal(storage.values.get(Storage.KEY),raw);
  assert.equal(store.reset(1).reason,'backup-failed');assert.equal(storage.values.get(Storage.KEY),raw);
  storage.failWrite=false;storage.failRead=true;assert.equal(store.load().status,'storage-error');assert.equal(store.save(input,1).status,'storage-error');assert.deepEqual(input,original);
  assert.equal(Storage.create(engine,{storage:null}).load().status,'storage-error');
});

test('active and defeated metadata may resume; paused status and nonnull snapshots are rejected',()=>{
  const {store,engine}=setup();let state=activeState(engine);assert.equal(store.save(state,0).ok,true);assert.deepEqual(store.load().state.activeCombat,state.activeCombat);
  const revision=store.load().revision;
  for(const patch of [{status:'paused'},{snapshot:{tick:1}},{combatId:'unknown'}])assert.equal(store.save({...state,activeCombat:{...state.activeCombat,...patch}},revision).reason,'invalid-state');
  state=step(engine,state,{type:'DEFEAT',combatId:state.activeCombat.combatId,runId:state.activeCombat.runId});assert.equal(store.save(state,revision).ok,true);assert.equal(store.load().state.activeCombat.status,'defeated');assert.deepEqual(store.load().state.clearedCombatIds,[]);
});

test('explicit bounded backup/quarantine copy evidence, and reset backs up before replacing only story state',()=>{
  const {store,storage}=setup();store.startNew(0);const original=storage.values.get(Storage.KEY);
  assert.equal(store.backup(1).ok,true);assert.equal(store.quarantine(1).ok,true);assert.equal(storage.values.get(Storage.BACKUP_KEY),original);assert.equal(storage.values.get(Storage.QUARANTINE_KEY),original);assert.equal(storage.values.get(Storage.KEY),original);
  const reset=store.reset(1);assert.equal(reset.ok,true);assert.equal(reset.revision,2);assert.equal(storage.values.get(Storage.BACKUP_KEY),original);
  storage.values.set(Storage.KEY,'damaged evidence');assert.equal(store.reset(null).status,'corrupt','recovery requires explicit load of exact evidence');assert.equal(store.load().status,'corrupt');
  assert.equal(store.quarantine(null).ok,true);assert.equal(store.reset(null).ok,true);assert.equal(storage.values.get(Storage.BACKUP_KEY),'damaged evidence');assert.equal(storage.values.get(Storage.QUARANTINE_KEY),'damaged evidence');
  storage.values.set(Storage.KEY,'x'.repeat(Storage.MAX_BYTES+1));store.load();assert.equal(store.reset(null).reason,'evidence-too-large');assert.equal(storage.values.get(Storage.KEY).length,Storage.MAX_BYTES+1);
  assert.equal(storage.values.size,3,'fixed slots prevent unbounded backup key growth');
});

test('canonical progression roundtrips every actual roster member without hardcoded scope',()=>{
  const {store,engine}=setup();let state=engine.newState(),revision=0,count=0;
  const evidence={corePreserved:true,commandsRemoved:true,coerciveCircuitRemoved:true,distinctWorldsPreserved:true,guardianRemains:true};
  for(const scene of Data.scenes) {
    while(state.viewSceneId!==scene.id)state=step(engine,state,{type:'VIEW_NEXT'});
    state=step(engine,state,{type:'ACK_SCENE',sceneId:scene.id});
    for(const group of scene.combatOrderGroups)for(const combatId of group) {
      const runId='storage-'+(++count);state=step(engine,state,{type:'START_COMBAT',combatId,runId});
      state=step(engine,state,{type:'COMBAT_CLEARED',combatId,runId,resolution:engine.resolutionFor(combatId),evidence,receipt:'test-only-adapter'});
      const saved=store.save(state,revision);assert.equal(saved.ok,true,saved.reason);revision=saved.revision;assert.deepEqual(store.load().state,state);
    }
  }
  const final=store.save(state,revision);assert.equal(final.ok,true);assert.equal(count,Data.primaryCombatIds.length);assert.equal(final.state.endingSeen,true);assert.deepEqual(new Set(final.state.clearedCombatIds),new Set(Data.primaryCombatIds));
});
