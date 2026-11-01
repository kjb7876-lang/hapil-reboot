'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),vm=require('node:vm');
const C=require('../src/core.js'),S=require('../src/storage.js')._test,BASE='6afd61432c6b2334d44e8ab81db065241c9a67ac',json=x=>JSON.parse(JSON.stringify(x));
function prior(){const b={module:{exports:{}},console};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/storage.js'],{encoding:'utf8'}),b);return b.module.exports._test;}
function checkpoint(revision){return C.checkpoint(C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,difficulty:'normal',seed:813,runId:'laser31-save'}));}
test('31 saves its own laser timing contract and30 clients reject an overwrite',()=>{
 const saved=checkpoint(31),old=prior();assert.deepEqual(S.validateCheckpoint(saved),saved);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(saved)),saved);
 const result=S.reduce(undefined,{type:'checkpoint',value:saved},0);assert(result.result.ok);assert.equal(result.state.combatContract,31);assert.equal(old.safeStoredRecord(json(result.state)),false);assert.equal(old.reduce(json(result.state),{type:'settings',value:{quality:'high'}},result.state.revision).result.reason,'invalid-storage-state');
 for(const revision of [undefined,21,25,27,28,29,30]){const mixed=json(result.state);if(revision===undefined)delete mixed.backup.combatRevision;else mixed.backup.combatRevision=revision;assert.equal(S.safeStoredRecord(mixed),false);}
 assert.equal(S.validateCheckpoint({...saved,combatRevision:32}),null);
});
test('all seven previous save contracts remain byte equivalent to the30 client',()=>{
 const old=prior();for(const revision of [undefined,21,25,27,28,29,30]){const saved=checkpoint(revision);assert.deepEqual(json(S.validateCheckpoint(saved)),json(old.validateCheckpoint(saved)));assert.deepEqual(json(S.reduce(undefined,{type:'checkpoint',value:saved},0)),json(old.reduce(undefined,{type:'checkpoint',value:saved},0)));}
});
