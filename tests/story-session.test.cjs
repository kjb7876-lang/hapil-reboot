'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Session=require('../src/story-session.js');
const State=require('../src/story-state.js');
const Storage=require('../src/story-storage.js');
const Assets=require('../src/story-assets.js');
const Scope=require('../src/story-scope.js');
const Data=Scope.apply(require('../src/story-data.js'));
const clone=value=>JSON.parse(JSON.stringify(value));
const evidence={corePreserved:true,commandsRemoved:true,coerciveCircuitRemoved:true,distinctWorldsPreserved:true,guardianRemains:true};
function memory(seed={}) {
 const values=new Map(Object.entries(seed)),reads=[],writes=[];
 return {values,reads,writes,failWrite:false,getItem(key){reads.push(key);return values.has(key)?values.get(key):null;},setItem(key,value){if(this.failWrite)throw Error('fixture quota failure');writes.push(key);values.set(key,String(value));},removeItem(){throw Error('unexpected delete');},clear(){throw Error('unexpected clear');}};
}
function gateFixture({readyIds=Data.primaryCombatIds}={}) {
 const index=JSON.parse(fs.readFileSync(require.resolve('../docs/story/LIVE-ASSET-INDEX-r3.json'),'utf8'));
 // TEST FIXTURE ONLY. These synthetic approval/QA/form assertions exercise
 // routing. They are not a production ledger, reviewed art, or verified engine.
 const ready=new Set(readyIds);
 for(const row of index.roster)if(ready.has(row.boss_id))row.asset_status='approved';
 const ledger={schemaVersion:1,indexVerified:true,indexRevision:index.revision,entries:readyIds.map(combatId=>({
  combatId,assetApproved:true,sourceVerified:true,implemented:true,correctBody:true,attackArt:true,qa:true,behaviorQA:true,readabilityQA:true,
  binding:{adapter:'story',combatId,handler:'test-only-fake-boundary',...(Assets.V8_BINDINGS[combatId]?{visualId:Assets.V8_BINDINGS[combatId].visualId}: {})},
  requiredForms:Data.requiredForms.filter(form=>form.bossID===combatId).map(form=>({formID:form.formID,assetApproved:true,sourceVerified:true,implemented:true,behaviorQA:true,readabilityQA:true,assetRefs:['test-fixture-only/'+form.formID+'.png']}))
 }))};
 return Assets.create(Data,index,ledger);
}
function fakeCombat(supportedIds=Data.primaryCombatIds) {
 // A deliberately fake in-memory combat boundary. No projectiles, objective
 // implementation, GPU behavior, asset approval, or production engine is tested.
 const supported=new Set(supportedIds),records=new WeakMap(),created=[];
 const resolutions=State.create(Data);
 const api={
  supports:id=>supported.has(id),
  create(combatId,options){
   if(!supported.has(combatId))throw Error('fixture unsupported');
   const world={status:'active',combatId,runId:options.runId};
   records.set(world,{command:null,terminal:null,receipt:Symbol('test-only-boundary-receipt')});created.push(world);return world;
  },
  step(world){
   const row=records.get(world);if(!row)return;
   if(row.command==='defeat'){world.status='defeated';row.command=null;}
   if(row.command==='clear'){
    world.status='cleared';row.command=null;
    row.terminal={combatId:world.combatId,runId:world.runId,resolution:resolutions.resolutionFor(world.combatId),evidence:clone(evidence),receipt:row.receipt};
   }
  },
  result(world){const row=records.get(world);return row&&row.terminal?{...row.terminal}:null;},
  verifyResult(event,active,world){const row=records.get(world);return !!(row&&row.terminal&&event.receipt===row.receipt&&event.combatId===active.combatId&&event.runId===active.runId&&event.combatId===row.terminal.combatId&&event.runId===row.terminal.runId&&event.resolution===row.terminal.resolution);}
 };
 return {api,created,queue(world,command){assert.ok(records.has(world));records.get(world).command=command;}};
}
function fixture(options={}) {
 const storage=options.storage||memory(),gate=options.gate||gateFixture(),combat=options.combat||fakeCombat();
 const session=Session.create({data:Data,assets:gate,combat:combat.api,stateAPI:State,storageAPI:Storage,storageOptions:{storage}});
 return {storage,gate,combat,session};
}
function dispatch(session,event){const result=session.dispatch(event);assert.equal(result.ok,true,result.reason);return result;}
function enterFirst(session) {
 while(!session.availableCombats().length){
  const frontier=session.frontier();
  while(session.state().viewSceneId!==frontier.sceneId)dispatch(session,{type:'VIEW_NEXT'});
  dispatch(session,{type:'ACK_SCENE',sceneId:session.state().viewSceneId});
 }
 return session.availableCombats()[0];
}
function clearFixture(f,id=f.session.availableCombats()[0]) {
 const result=f.session.start(id);assert.equal(result.ok,true,result.reason);
 f.combat.queue(f.session.world(),'clear');assert.equal(f.session.tick({}),true);assert.equal(f.session.status().error,null);
}

test('session forbids every externally dispatched combat event and ignores copied-state edits',()=>{
 const f=fixture(),id=enterFirst(f.session),before=f.session.state();
 for(const type of ['START_COMBAT','COMBAT_CLEARED','DEFEAT','RETRY']){
  const result=f.session.dispatch({type,combatId:id,runId:'invented',resolution:'cleared',trusted:true});assert.equal(result.reason,'engine-owned-event');assert.deepEqual(f.session.state(),before);
 }
 const copied=f.session.state();copied.clearedCombatIds.push(id);copied.activeCombat={combatId:id,runId:'forged',status:'active',practice:false};assert.deepEqual(f.session.state(),before);
 assert.equal(f.session.start(id).ok,true);const active=f.session.state();f.session.world().status='cleared';assert.equal(f.session.settle().pending,true);assert.deepEqual(f.session.state(),active,'world status mutation cannot manufacture a private fake receipt');
});

test('per-entry real asset gate permits a ready fixture while global generation remains incomplete',()=>{
 const only=Data.primaryCombatIds[0],gate=gateFixture({readyIds:[only]}),f=fixture({gate});
 assert.equal(gate.entryStatus(only).ready,true);assert.equal(gate.summary().generationComplete,false);assert.equal(gate.summary().allComplete,false);assert.ok(gate.summary().missingCount>0);
 enterFirst(f.session);assert.equal(f.session.start(only).ok,true);
 const blocked=Data.primaryCombatIds.find(id=>id!==only);const before=f.session.state();assert.equal(f.session.start(blocked).reason,'asset-or-implementation-locked');assert.deepEqual(f.session.state(),before);
 const unsupported=fixture({gate,combat:fakeCombat([])});enterFirst(unsupported.session);assert.equal(unsupported.session.start(only).reason,'asset-or-implementation-locked');
});

test('view/portal navigation does not award progress and live combat prevents navigation',()=>{
 const f=fixture();dispatch(f.session,{type:'VIEW_NEXT'});assert.deepEqual(f.session.state().acknowledgedSceneIds,[]);assert.deepEqual(f.session.state().clearedCombatIds,[]);
 assert.equal(f.session.dispatch({type:'ACK_SCENE',sceneId:f.session.state().viewSceneId}).reason,'scene-locked');
 dispatch(f.session,{type:'VIEW_PREVIOUS'});const id=enterFirst(f.session);assert.equal(f.session.start(id).ok,true);const before=f.session.state();
 for(const event of [{type:'VIEW_NEXT'},{type:'VIEW_PREVIOUS'},{type:'PORTAL_OPEN'},{type:'PORTAL_ENTER',sceneId:'prologue'}])assert.equal(f.session.dispatch(event).reason,'combat-active');
 assert.deepEqual(f.session.state(),before);assert.deepEqual(f.session.state().clearedCombatIds,[]);
});

test('failed navigation/start/result commits do not advance in-memory or persisted story progress',()=>{
 const f=fixture();f.storage.failWrite=true;const before=f.session.state();assert.equal(f.session.dispatch({type:'ACK_SCENE',sceneId:before.viewSceneId}).ok,false);assert.deepEqual(f.session.state(),before);assert.equal(f.storage.values.has(Storage.KEY),false);
 f.storage.failWrite=false;const id=enterFirst(f.session),ready=f.session.state(),raw=f.storage.values.get(Storage.KEY),revision=f.session.status().saveRevision;
 f.storage.failWrite=true;assert.equal(f.session.start(id).ok,false);assert.deepEqual(f.session.state(),ready);assert.equal(f.session.world(),null);assert.equal(f.storage.values.get(Storage.KEY),raw);assert.equal(f.session.status().saveRevision,revision);
 f.storage.failWrite=false;assert.equal(f.session.start(id).ok,true);const active=f.session.state(),activeRaw=f.storage.values.get(Storage.KEY),activeRevision=f.session.status().saveRevision;
 f.combat.queue(f.session.world(),'clear');f.storage.failWrite=true;f.session.tick({});assert.deepEqual(f.session.state(),active);assert.equal(f.storage.values.get(Storage.KEY),activeRaw);assert.equal(f.session.status().saveRevision,activeRevision);
 f.storage.failWrite=false;assert.equal(f.session.settle().ok,true);assert.deepEqual(f.session.state().clearedCombatIds,[id]);
});

test('stale sessions cannot overwrite a newer tab and reset retains its returned storage revision',()=>{
 const storage=memory(),a=fixture({storage}),b=fixture({storage});dispatch(a.session,{type:'ACK_SCENE',sceneId:a.session.state().viewSceneId});
 const bBefore=b.session.state(),raw=storage.values.get(Storage.KEY);assert.equal(b.session.dispatch({type:'ACK_SCENE',sceneId:bBefore.viewSceneId}).reason,'stale-revision');assert.deepEqual(b.session.state(),bBefore);assert.equal(storage.values.get(Storage.KEY),raw);
 assert.equal(b.session.reset().reason,'stale-revision');assert.equal(a.session.reset().ok,true);const resetRevision=a.session.status().saveRevision;assert.ok(resetRevision>1);assert.equal(storage.values.get(Storage.BACKUP_KEY),raw);
 dispatch(a.session,{type:'ACK_SCENE',sceneId:a.session.state().viewSceneId});assert.equal(a.session.status().saveRevision,resetRevision+1);
});

test('reload of active entry requires restart with a fresh token and cannot synthesize a result',()=>{
 const storage=memory(),original=fixture({storage}),id=enterFirst(original.session);assert.equal(original.session.start(id).ok,true);const oldToken=original.session.state().activeCombat.runId;
 const restored=fixture({storage});assert.equal(restored.session.world(),null);assert.equal(restored.session.status().checkpointNeedsRestart,true);assert.equal(restored.session.tick({}),false);assert.equal(restored.session.settle().reason,'no-live-combat');
 assert.equal(restored.session.dispatch({type:'COMBAT_CLEARED',combatId:id,runId:oldToken,resolution:'cleared',trusted:true}).reason,'engine-owned-event');
 assert.equal(restored.session.retry().ok,true);assert.notEqual(restored.session.state().activeCombat.runId,oldToken);assert.equal(restored.session.state().activeCombat.status,'active');assert.equal(restored.session.status().checkpointNeedsRestart,false);assert.deepEqual(restored.session.state().clearedCombatIds,[]);
 original.combat.queue(original.session.world(),'clear');original.session.tick({});assert.equal(original.session.status().error,'stale-revision');assert.deepEqual(original.session.state().clearedCombatIds,[]);
});

test('defeat/retry and leaving defeated combat through a portal never grant a clear',()=>{
 const f=fixture(),id=enterFirst(f.session);assert.equal(f.session.start(id).ok,true);const firstRun=f.session.state().activeCombat.runId;
 assert.equal(f.session.retry().reason,'combat-still-active');f.combat.queue(f.session.world(),'defeat');f.session.tick({});assert.equal(f.session.state().activeCombat.status,'defeated');assert.deepEqual(f.session.state().clearedCombatIds,[]);assert.equal(f.session.tick({}),false);
 assert.equal(f.session.retry().ok,true);assert.notEqual(f.session.state().activeCombat.runId,firstRun);f.combat.queue(f.session.world(),'defeat');f.session.tick({});
 dispatch(f.session,{type:'PORTAL_OPEN'});dispatch(f.session,{type:'PORTAL_ENTER',sceneId:'prologue'});assert.equal(f.session.state().activeCombat,null);assert.equal(f.session.world(),null);assert.equal(f.session.retry().reason,'no-checkpoint');assert.deepEqual(f.session.state().clearedCombatIds,[]);
});

test('explicit session reset preserves corrupt evidence before enabling a new story',()=>{
 const raw='{damaged story evidence',storage=memory({[Storage.KEY]:raw}),f=fixture({storage});assert.equal(f.session.state(),null);assert.equal(f.session.status().loadedStatus,'corrupt');assert.equal(storage.values.get(Storage.KEY),raw);
 assert.equal(f.session.dispatch({type:'VIEW_NEXT'}).ok,false);assert.equal(f.session.reset().ok,true);assert.equal(storage.values.get(Storage.BACKUP_KEY),raw);assert.deepEqual(f.session.state().clearedCombatIds,[]);
 dispatch(f.session,{type:'ACK_SCENE',sceneId:f.session.state().viewSceneId});
});

test('entire effective canonical roster roundtrips through FAKE boundary without touching old saves',()=>{
 const old={'hapil.v8':'v8 evidence','hapil.campaign.v8':'campaign evidence'},storage=memory(old),f=fixture({storage});let count=0;
 assert.equal(f.gate.summary().allComplete,false,'local synthetic ledger never turns incomplete r3 global flags into completion');
 for(const scene of Data.scenes){
  while(f.session.state().viewSceneId!==scene.id)dispatch(f.session,{type:'VIEW_NEXT'});
  if(scene.id==='ending')assert.equal(f.session.state().clearedCombatIds.length,Data.primaryCombatIds.length);
  dispatch(f.session,{type:'ACK_SCENE',sceneId:scene.id});
  for(const group of scene.combatOrderGroups)for(const combatId of group.slice().reverse()){
   clearFixture(f,combatId);count++;assert.equal(f.session.state().activeCombat,null);
   const loaded=Storage.create(State.create(Data),{storage}).load();assert.equal(loaded.status,'ok');assert.deepEqual(loaded.state,f.session.state());
  }
 }
 assert.equal(count,Data.primaryCombatIds.length);assert.equal(f.session.state().endingSeen,true);assert.deepEqual(new Set(f.session.state().clearedCombatIds),new Set(Data.primaryCombatIds));
 for(const [key,value]of Object.entries(old)){assert.equal(storage.values.get(key),value);assert.equal(storage.reads.includes(key),false);assert.equal(storage.writes.includes(key),false);}
 const restored=fixture({storage});assert.deepEqual(restored.session.state(),f.session.state());assert.equal(restored.session.status().checkpointNeedsRestart,false);
});
