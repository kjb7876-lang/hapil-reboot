'use strict';
// CPU-only deterministic simulation and pure storage reducer. This is natural
// wave input through the first boss introduction, not a full-campaign clear,
// 777 fixture, browser IndexedDB, real multitabs, mobile, or GPU measurement.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
function inputFor(w){return {dx:180+Math.sin(w.tick/120)*80-w.player.x,dy:540-w.player.y};}
function state(w){
 const out={};for(const k of ['tick','stage','wave','phase','bossIndex','idCounter','rngState','player','boss','enemies','bullets','shots','hazards','memory','resonance','score','graze','kills','skills','stats','_delays','_warnings','_deferred','_shotReadyAt','_memoryBucket','_memoryGain','_resBucket','_resGain','_grazeGain','_lastGraze'])out[k]=w[k];return out;
}
function naturalBoundaries(){
 const w=core.createRun({campaign:true,difficulty:'gentle',seed:813,runId:'natural-boundary'});
 const found=[{snapshot:core.checkpoint(w),reference:structuredClone(w)}];let serial=w.checkpointSerial;
 for(let tick=0;tick<4000&&w.stage!=='lost'&&found.length<4;tick++){
  core.step(w,inputFor(w));if(w.checkpointSerial!==serial){serial=w.checkpointSerial;found.push({snapshot:core.checkpoint(w),reference:structuredClone(w)});}
 }
 return found;
}
test('naturally reached wave and first boss checkpoints restore deterministically through real enemies, bullets and warnings',()=>{
 const found=naturalBoundaries();assert.equal(found.length,4);
 assert.deepEqual(found.map(x=>[x.snapshot.stage,x.snapshot.wave,x.snapshot.phase]),[['waves',0,0],['waves',1,0],['waves',2,0],['boss',2,0]]);
 let enemies=false,bullets=false,hazards=false;
 for(const {snapshot,reference} of found){
  const clean=store.validateCheckpoint(snapshot);assert(clean);const restored=core.restoreCheckpoint(clean);
  for(let tick=0;tick<500;tick++){
   const input=inputFor(reference);core.step(reference,input);core.step(restored,input);
   enemies||=reference.enemies.length>0;bullets||=reference.bullets.length>0;hazards||=reference.hazards.length>0;
   assert.deepEqual(state(restored),state(reference),`diverged after checkpoint ${snapshot.checkpointSerial} at tick ${tick}`);
  }
 }
 assert(enemies&&bullets&&hazards,'exercise real simulated enemies, bullets and laser warnings');
});
test('reducer rejects another tab’s stale revision and restores only the active run’s intact backup',()=>{
 const found=naturalBoundaries(),first=store.validateCheckpoint(found[0].snapshot),second=store.validateCheckpoint(found[1].snapshot);
 const empty=store.emptyState(),tabA=store.reduce(empty,{type:'checkpoint',value:first},0);
 assert(tabA.changed);assert.equal(tabA.state.revision,1);
 const tabBStale=store.reduce(tabA.state,{type:'settings',value:{quality:'low'}},0);
 assert.equal(tabBStale.changed,false);assert.equal(tabBStale.result.reason,'conflict');assert.deepEqual(tabBStale.state.checkpoint,first);
 const saveNext=store.reduce(tabA.state,{type:'checkpoint',value:second},1);
 assert(saveNext.changed);assert.deepEqual(saveNext.state.backup,first);assert.deepEqual(saveNext.state.checkpoint,second);
 const damaged=structuredClone(saveNext.state);damaged.checkpoint.wave=99;
 const recovered=store.normalizeState(damaged);assert.deepEqual(recovered.checkpoint,first);assert.deepEqual(recovered.backup,first);
 const foreign=structuredClone(damaged);foreign.backup.runId='other-run';
 const rejected=store.normalizeState(foreign);assert.equal(rejected.checkpoint,null);assert.equal(rejected.backup,null);
 const oldWrite=store.reduce(saveNext.state,{type:'checkpoint',value:first},1);
 assert.equal(oldWrite.result.reason,'conflict');assert.deepEqual(oldWrite.state.backup,first);assert.deepEqual(oldWrite.state.checkpoint,second);
});
