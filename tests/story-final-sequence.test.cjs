'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Final = require('../src/story-final-sequence.js');
const Combat = require('../src/story-combat.js');
const Encounters = require('../src/story-encounters.js');

const e = type => ({type});
const events = [e('leaderBodyDefeated'), e('mortallyWounded'),
  {type:'blackNeuralRevival',identity:'sameLeader',method:'blackNeuralCords'},
  e('realityMemoryRecalled'), e('tripletTruthRevealed'),
  {type:'samongAwakened',alive:true}, e('bodyAndSwordReformed'), e('battlefieldRestored'),
  {type:'consentingDualWills',confirmedParticipants:['B','firstChild'],voluntary:true},
  e('leaderAuthoritySevered'), e('leaderDissolvedInDreamWorld'), e('corePreserved'),
  e('commandsRemoved'), e('coerciveCircuitRemoved'), e('ownSamongLinkedToCore'),
  e('distinctWorldsPreserved'), e('guardianRemains')];
function advance(items) { let s=Final.create(); for (const item of items) {const out=Final.step(s,item);assert.equal(out.ok,true,JSON.stringify(item));s=out.state;} return s; }

test('source-faithful final order, core preservation and guardian remain narrative evidence only',()=>{
  const before=advance(events.slice(0,-1));
  assert.equal(Final.evaluate(before).complete,false);
  const s=advance(events), out=Final.evaluate(s);
  assert.equal(out.complete,true);
  assert.equal(out.combatVerified,false);
  assert.equal(out.resolution,'narrative-sequence-acknowledged');
  assert.deepEqual(out.sourceRange,[875,919]);
  assert.deepEqual(out.acceptedEvents,events);
  assert.equal(Combat.UNSUPPORTED_OBJECTIVE_SCENES.includes('cult04'),true);
  const actor=Encounters.get('c104-boss');
  assert(actor);assert.equal(Combat.supports(actor),false);
});

test('no event from a future stage is accepted early; commands may be removed in either order',()=>{
  for(let i=0;i<events.length;i++) {
    const prior=advance(events.slice(0,i));
    for(let j=i+1;j<events.length;j++) {
      if((i===0&&j===1)||(i===12&&j===13)) continue;
      const r=Final.step(prior,events[j]);
      assert.equal(r.ok,false,`future ${events[j].type} at index ${i}`);
      assert.deepEqual(r.state,prior);
    }
  }
  const swapped=events.slice();[swapped[0],swapped[1]]=[swapped[1],swapped[0]];[swapped[12],swapped[13]]=[swapped[13],swapped[12]];
  assert.equal(Final.evaluate(advance(swapped)).complete,true);
});

test('awakening requires living player, revival the same leader, and consent from B and the first child',()=>{
  const revival=advance(events.slice(0,2));
  for(const bad of [
    {type:'blackNeuralRevival',identity:'newBoss',method:'blackNeuralCords'},
    {type:'blackNeuralRevival',identity:'sameLeader',method:'other'},
    e('blackNeuralRevival')]) assert.equal(Final.step(revival,bad).ok,false);
  const awakening=advance(events.slice(0,5));
  for(const bad of [{type:'samongAwakened',alive:false},e('samongAwakened')]) assert.equal(Final.step(awakening,bad).ok,false);
  const consent=advance(events.slice(0,8));
  for(const bad of [
    {type:'consentingDualWills',confirmedParticipants:['B','B'],voluntary:true},
    {type:'consentingDualWills',confirmedParticipants:['B','firstChild'],voluntary:false},
    {type:'consentingDualWills',confirmedParticipants:['B','Michaela'],voluntary:true},
    e('consentingDualWills')]) assert.equal(Final.step(consent,bad).ok,false);
  const reversed=Final.step(consent,{type:'consentingDualWills',confirmedParticipants:['firstChild','B'],voluntary:true});
  assert.equal(reversed.ok,true);assert.deepEqual(reversed.state.events.at(-1).confirmedParticipants,['B','firstChild']);
});

test('forbidden outcomes fail closed and malformed or reordered journals cannot pass',()=>{
  const s=advance(events.slice(0,11));
  for(const type of ['destroyCore','eraseMemories','returnToReality','forceSameWill','postDeathSamong','newRevivalBoss']){
    const r=Final.step(s,e(type));assert.equal(r.reason,'canon-forbidden-action');assert.deepEqual(r.state,s);
  }
  for(const raw of [
    {...s,events:[events[2],events[0]]}, {...s,events:[events[0],events[0]]},
    {...s,events:[...s.events,e('guardianRemains')]}, {...s,complete:true},
    {...s,events:[{...events[0],fake:true}]}
  ]) assert.equal(Final.evaluate(raw).valid,false);
  const again=Final.step(s,events[0]);assert.equal(again.reason,'duplicate');assert.deepEqual(again.state,s);
});

test('a well-formed self-reported journal never certifies actual combat or saved progress',()=>{
  const journal={schemaVersion:1,sceneId:'cult04',events:JSON.parse(JSON.stringify(events))};
  const out=Final.evaluate(journal);
  assert.equal(out.complete,true);assert.equal(out.combatVerified,false);
  assert.equal(out.resolution,'narrative-sequence-acknowledged');
  assert.equal(Object.hasOwn(out,'progressVerified'),false);
});
