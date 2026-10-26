'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('../src/story-state.js');
const Data = require('../src/story-data.js');
const clone = value => JSON.parse(JSON.stringify(value));
const proof = Symbol('trusted adapter receipt');
const options = {canStartCombat: () => true, verifyResult: event => event.receipt === proof};
const evidence = {corePreserved:true,commandsRemoved:true,coerciveCircuitRemoved:true,distinctWorldsPreserved:true,guardianRemains:true};
function fixture() {
  const encounters = ['a','b','c','d'].map(id => ({id,sceneId:id==='d'?'second':'first',conditional:false}));
  return {schemaVersion:1,contentRevision:'fixture-1',encounters,primaryCombatIds:['a','b','c','d'],conditionalCombatIds:[],scenes:[
    {id:'prologue',requiredCombatIds:[],combatOrderGroups:[]},
    {id:'first',requiredCombatIds:['a','b','c'],combatOrderGroups:[['a','b'],['c']],outcome:'victory'},
    {id:'second',requiredCombatIds:['d'],combatOrderGroups:[['d']],outcome:'victory'},
    {id:'ending',requiredCombatIds:[],combatOrderGroups:[]}
  ]};
}
function step(engine,state,event) { const result = engine.reduce(state,event); assert.equal(result.ok,true,result.reason); return result.state; }
function enterFirst(engine) { let state=engine.newState();state=step(engine,state,{type:'ACK_SCENE',sceneId:'prologue'});state=step(engine,state,{type:'VIEW_NEXT'});return step(engine,state,{type:'ACK_SCENE',sceneId:'first'}); }
function clear(engine,state,id,n=id) {state=step(engine,state,{type:'START_COMBAT',combatId:id,runId:'run-'+n});return step(engine,state,{type:'COMBAT_CLEARED',combatId:id,runId:'run-'+n,resolution:engine.resolutionFor(id),evidence,receipt:proof});}

test('unordered groups allow either member while later groups and scenes remain locked',()=>{
  const engine=State.create(fixture(),options);let state=enterFirst(engine);
  assert.deepEqual(engine.availableCombats(state),['a','b']);
  assert.equal(engine.reduce(state,{type:'START_COMBAT',combatId:'c',runId:'early'}).reason,'combat-locked');
  assert.equal(engine.reduce(state,{type:'START_COMBAT',combatId:'d',runId:'early'}).reason,'combat-locked');
  state=clear(engine,state,'b');state=clear(engine,state,'a');assert.deepEqual(engine.availableCombats(state),['c']);
  assert.equal(engine.sceneStatus(state,'first'),'current','ACK did not complete a combat scene');
  state=clear(engine,state,'c');assert.equal(engine.sceneStatus(state,'first'),'complete');assert.equal(engine.deriveFrontier(state).sceneId,'second');
});

test('view navigation and portals never manufacture progress; ending has a hard gate',()=>{
  const engine=State.create(fixture(),options);let state=enterFirst(engine);const before=clone(state.clearedCombatIds);
  state=step(engine,state,{type:'VIEW_NEXT'});assert.equal(engine.reduce(state,{type:'ACK_SCENE',sceneId:'second'}).reason,'scene-locked');
  assert.equal(engine.reduce(state,{type:'VIEW_NEXT'}).reason,'ending-locked');
  state=step(engine,state,{type:'PORTAL_OPEN'});assert.equal(engine.reduce(state,{type:'PORTAL_ENTER',sceneId:'second'}).reason,'portal-locked');
  state=step(engine,state,{type:'PORTAL_ENTER',sceneId:'prologue'});assert.deepEqual(state.clearedCombatIds,before);
  assert.equal(engine.reduce(state,{type:'VIEW_PREVIOUS'}).reason,'boundary');assert.equal(engine.canSeeEnding(state),false);
});

test('trusted matching run is required; defeat does not clear; retry uses a fresh run',()=>{
  const engine=State.create(fixture(),options);let state=enterFirst(engine);state=step(engine,state,{type:'START_COMBAT',combatId:'a',runId:'original'});
  for(const event of [{runId:'wrong',receipt:proof},{runId:'original'},{runId:'original',receipt:proof,resolution:'killed'}]) {
    const result=engine.reduce(state,{type:'COMBAT_CLEARED',combatId:'a',resolution:'cleared',...event});assert.equal(result.ok,false);assert.deepEqual(result.state,state);
  }
  state=step(engine,state,{type:'DEFEAT',combatId:'a',runId:'original'});assert.deepEqual(state.clearedCombatIds,[]);
  assert.equal(engine.reduce(state,{type:'COMBAT_CLEARED',combatId:'a',runId:'original',resolution:'cleared',receipt:proof}).ok,false);
  assert.equal(engine.reduce(state,{type:'RETRY',combatId:'a',runId:'original',newRunId:'original'}).ok,false);
  state=step(engine,state,{type:'RETRY',combatId:'a',runId:'original',newRunId:'retry'});
  const event={type:'COMBAT_CLEARED',combatId:'a',runId:'retry',resolution:'cleared',receipt:proof};state=step(engine,state,event);
  assert.deepEqual(engine.reduce(state,event),{ok:true,state,duplicate:true});assert.equal(state.clearedRuns.length,1);
});

test('practice completion leaves mainline acknowledgements, clears and ending unchanged',()=>{
  const engine=State.create(fixture(),options);let state=engine.newState();const before=clone(state);
  state=step(engine,state,{type:'START_COMBAT',combatId:'d',runId:'practice',practice:true});
  state=step(engine,state,{type:'COMBAT_CLEARED',combatId:'d',runId:'practice',resolution:'cleared',receipt:proof});
  for(const key of ['acknowledgedSceneIds','clearedCombatIds','clearedRuns','endingSeen','viewSceneId'])assert.deepEqual(state[key],before[key]);
});

test('validation rejects future schemas, unknown identities, non-linear journal and unsupported snapshots',()=>{
  const engine=State.create(fixture(),options),state=enterFirst(engine);
  for(const patch of [{schemaVersion:2},{contentRevision:'future'},{viewSceneId:'missing'},{acknowledgedSceneIds:['prologue','second']},{clearedCombatIds:['unknown']},{clearedCombatIds:['c'],clearedRuns:[{runId:'forged',combatId:'c',resolution:'cleared'}]},{endingSeen:true},{snapshot:{tick:0}},{activeCombat:{combatId:'a',runId:'run',status:'active',practice:false,snapshot:{tick:123}}}])assert.equal(engine.validate({...clone(state),...patch}),null,JSON.stringify(patch));
  assert.equal(engine.reduce(state,{type:'START_COMBAT',combatId:'a',runId:'snapshot',snapshot:{tick:0}}).reason,'unsupported-snapshot');
  const raw=clone(state);assert.deepEqual(engine.validate(raw),state);assert.deepEqual(raw,state,'validation does not mutate input');
});

test('unconfigured entry and result adapters fail closed',()=>{
  const engine=State.create(fixture()),state=enterFirst(engine);
  assert.equal(engine.reduce(state,{type:'START_COMBAT',combatId:'a',runId:'blocked'}).reason,'asset-or-implementation-locked');
  const open=State.create(fixture(),{canStartCombat:()=>true});let active=enterFirst(open);active=step(open,active,{type:'START_COMBAT',combatId:'a',runId:'open'});
  assert.equal(open.reduce(active,{type:'COMBAT_CLEARED',combatId:'a',runId:'open',resolution:'cleared',trusted:true}).reason,'untrusted-result');
});

test('actual 69-ID canonical path validates at every boundary and ends only after all primary results',()=>{
  assert.equal(Data.primaryCombatIds.length,69);assert.equal(Data.conditionalCombatIds.length,3);
  const engine=State.create(Data,options);let state=engine.newState(),counter=0;
  for(const scene of Data.scenes){
    while(state.viewSceneId!==scene.id)state=step(engine,state,{type:'VIEW_NEXT'});
    if(scene.id==='ending')assert.equal(state.clearedCombatIds.length,69);
    state=step(engine,state,{type:'ACK_SCENE',sceneId:scene.id});
    for(const group of scene.combatOrderGroups){
      for(const id of group.slice().reverse()){
        assert.ok(engine.availableCombats(state).includes(id));state=clear(engine,state,id,++counter);assert.deepEqual(engine.validate(clone(state)),state);
      }
    }
  }
  assert.equal(counter,69);assert.equal(engine.deriveFrontier(state).complete,true);assert.equal(state.endingSeen,true);
  assert.deepEqual(new Set(state.clearedCombatIds),new Set(Data.primaryCombatIds));for(const id of Data.conditionalCombatIds)assert.equal(state.clearedCombatIds.includes(id),false);
});

test('canonical loss, liberation and final authority outcomes cannot be replaced with ordinary victory',()=>{
  const engine=State.create(Data,options);
  assert.equal(engine.resolutionFor('l301-boss'),'survive-and-fall');assert.equal(engine.resolutionFor('kair-great-03'),'liberated');assert.equal(engine.resolutionFor('c104-boss'),'authority-severed');assert.equal(engine.resolutionFor('c104-mid'),'cleared');
  let state=engine.newState();
  for(const scene of Data.scenes){
    while(state.viewSceneId!==scene.id)state=step(engine,state,{type:'VIEW_NEXT'});
    state=step(engine,state,{type:'ACK_SCENE',sceneId:scene.id});
    for(const group of scene.combatOrderGroups)for(const id of group){
      state=step(engine,state,{type:'START_COMBAT',combatId:id,runId:'special-'+id});
      if(['l301-boss','kair-great-03','c104-boss'].includes(id)){
        assert.equal(engine.reduce(state,{type:'COMBAT_CLEARED',combatId:id,runId:'special-'+id,resolution:'cleared',receipt:proof}).reason,'invalid-resolution');
        if(id==='c104-boss')for(const key of Object.keys(evidence)){const bad={...evidence,[key]:false};assert.equal(engine.reduce(state,{type:'COMBAT_CLEARED',combatId:id,runId:'special-'+id,resolution:'authority-severed',evidence:bad,receipt:proof}).reason,'invalid-resolution');}
      }
      state=step(engine,state,{type:'COMBAT_CLEARED',combatId:id,runId:'special-'+id,resolution:engine.resolutionFor(id),evidence,receipt:proof});
    }
  }
});

function encounterScene(ids,outcome='victory') {
  return {schemaVersion:1,contentRevision:'encounter-resolution-1',primaryCombatIds:ids,conditionalCombatIds:[],encounters:ids.map(id=>({id,sceneId:'first',conditional:false})),scenes:[{id:'prologue',requiredCombatIds:[],combatOrderGroups:[]},{id:'first',outcome,requiredCombatIds:ids,combatOrderGroups:ids.map(id=>[id])},{id:'ending',requiredCombatIds:[],combatOrderGroups:[]}]};
}
test('authoritative encounter callback separates preliminary, boss and investigation results within one scene',()=>{
  const scenarios=[
    {ids:['mb-dist06','dist06-boss','mb-ep1a07'],scene:'survive-and-fall',results:['cleared','cleared','survive-and-fall']},
    {ids:['u203-mid','u203-boss'],scene:'end-command-link',results:['cleared','command-severed']},
    {ids:['mb-murder03','blue-executor'],scene:'end-command-link',results:['cleared','command-severed']},
    {ids:['c104-mid','c104-boss'],scene:'authority-cut',results:['cleared','authority-severed']}
  ];
  for(const scenario of scenarios){
    const contract=Object.fromEntries(scenario.ids.map((id,i)=>[id,scenario.results[i]]));
    const data=encounterScene(scenario.ids,scenario.scene),engine=State.create(data,{...options,resolutionFor:id=>contract[id]});let state=enterFirst(engine);
    for(const id of scenario.ids){
      assert.equal(engine.resolutionFor(id),contract[id]);state=step(engine,state,{type:'START_COMBAT',combatId:id,runId:'contract-'+id});
      const wrong=contract[id]==='cleared'?'survive-and-fall':'cleared';
      assert.equal(engine.reduce(state,{type:'COMBAT_CLEARED',combatId:id,runId:'contract-'+id,resolution:wrong,evidence,receipt:proof}).reason,'invalid-resolution');
      state=step(engine,state,{type:'COMBAT_CLEARED',combatId:id,runId:'contract-'+id,resolution:contract[id],evidence,receipt:proof});
      assert.deepEqual(engine.validate(clone(state)),state);
    }
    assert.equal(engine.sceneStatus(state,'first'),'complete');
  }
});
test('historical default protects canonical endpoints without inheriting whole-scene outcomes into midbosses',()=>{
  const engine=State.create(Data,options);
  for(const id of ['mb-dist06','dist06-boss','u203-mid','c104-mid','mb-murder03'])assert.equal(engine.resolutionFor(id),'cleared',id);
  for(const [id,resolution] of [['mb-ep1a07','survive-and-fall'],['l301-boss','survive-and-fall'],['kair-great-03','liberated'],['u203-boss','command-severed'],['c104-boss','authority-severed'],['mb-kair01-v31231','defended'],['mb-hando02','defended'],['mb-murder01','investigated']])assert.equal(engine.resolutionFor(id),resolution,id);
  const defaultMid=State.create(encounterScene(['mid'],'survive-and-fall'),options);assert.equal(defaultMid.resolutionFor('mid'),'cleared');
  const data=encounterScene(['specific'],'survive-and-fall');data.encounters[0].resolution='investigated';assert.equal(State.create(data,options).resolutionFor('specific'),'investigated');
  delete data.encounters[0].resolution;data.encounters[0].outcome='defend-core';assert.equal(State.create(data,options).resolutionFor('specific'),'defended');
  const authoritative=State.create(data,{...options,resolutionFor:()=> 'command-severed'});assert.equal(authoritative.resolutionFor('specific'),'command-severed','callback overrides explicit encounter fallback');
});
test('invalid or throwing authoritative resolution fails closed instead of silently choosing victory',()=>{
  for(const resolver of [()=>'',()=> ' ',()=>null,()=>undefined,()=>({resolution:'cleared'}),()=>{throw Error('unavailable contract');}]){
    const engine=State.create(fixture(),{...options,resolutionFor:resolver}),state=enterFirst(engine);
    assert.equal(engine.resolutionFor('a'),null);assert.equal(engine.resolutionFor('unknown'),null);
    assert.equal(engine.reduce(state,{type:'START_COMBAT',combatId:'a',runId:'invalid-contract'}).reason,'invalid-resolution-contract');
    const tampered={...clone(state),clearedCombatIds:['a'],clearedRuns:[{combatId:'a',runId:'bad',resolution:null}]};assert.equal(engine.validate(tampered),null);
  }
  const data=encounterScene(['bad']);data.encounters[0].resolution='';assert.equal(State.create(data,options).resolutionFor('bad'),null);
});

test('effective 70-ID route uses actual encounter resolution contracts and preserves serialized progression',()=>{
  const data=require('../src/story-scope.js').apply(Data),contracts=require('../src/story-encounters.js');
  const engine=State.create(data,{...options,resolutionFor:id=>contracts.get(id)?.resolution});
  assert.equal(data.primaryCombatIds.length,70);assert.deepEqual(data.scenes.find(s=>s.id==='dist06').combatOrderGroups,[['mb-dist06'],['dist06-boss'],['mb-ep1a07']]);
  for(const [id,result] of [['mb-dist06','cleared'],['dist06-boss','cleared'],['mb-ep1a07','survive-and-fall'],['u203-mid','cleared'],['u203-boss','command-severed'],['mb-murder03','cleared'],['blue-executor','command-severed'],['b09-boss','cleared'],['mb-hando01','cleared']])assert.equal(engine.resolutionFor(id),result,id);
  let state=engine.newState(),counter=0;
  for(const scene of data.scenes){
    while(state.viewSceneId!==scene.id)state=step(engine,state,{type:'VIEW_NEXT'});
    state=step(engine,state,{type:'ACK_SCENE',sceneId:scene.id});
    for(const group of scene.combatOrderGroups)for(const id of group.slice().reverse()){
      const contract=contracts.get(id);assert.ok(contract);assert.equal(engine.resolutionFor(id),contract.resolution);
      state=clear(engine,state,id,'effective-'+ ++counter);assert.deepEqual(engine.validate(clone(state)),state);
    }
  }
  assert.equal(counter,70);assert.equal(state.endingSeen,true);assert.equal(engine.deriveFrontier(state).complete,true);
});
