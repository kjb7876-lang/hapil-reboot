'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),vm=require('node:vm'),C=require('../src/core.js'),S=require('../src/storage.js')._test;
const BASE='f5bc56c9acaabef2ad653c3c63afd9982599ad54',json=x=>JSON.parse(JSON.stringify(x));
function prior(){const b={module:{exports:{}},console};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/storage.js'],{encoding:'utf8'}),b);return b.module.exports._test;}
function checkpoint(revision){return C.checkpoint(C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,difficulty:'normal',seed:813,runId:'mobile30-save'}));}
test('30 restores its exact checkpoint and old29 tabs cannot reinterpret its save contract',()=>{
 const cp30=checkpoint(30),old=prior();assert.deepEqual(S.validateCheckpoint(cp30),cp30);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(cp30)),cp30);
 const saved=S.reduce(undefined,{type:'checkpoint',value:cp30},0);assert(saved.result.ok);assert.equal(saved.state.combatContract,30);assert.equal(old.safeStoredRecord(json(saved.state)),false);assert.equal(old.reduce(json(saved.state),{type:'settings',value:{quality:'high'}},saved.state.revision).result.reason,'invalid-storage-state');
 for(const revision of [undefined,21,25,27,28,29]){const m=json(saved.state);if(revision===undefined)delete m.backup.combatRevision;else m.backup.combatRevision=revision;assert.equal(S.safeStoredRecord(m),false);}
 assert.equal(S.validateCheckpoint({...cp30,combatRevision:32}),null);
});
test('all six previous checkpoint selectors and reducers remain byte equivalent to the29 storage client',()=>{
 const old=prior();for(const revision of [undefined,21,25,27,28,29]){const cp30=checkpoint(revision);assert.deepEqual(json(S.validateCheckpoint(cp30)),json(old.validateCheckpoint(cp30)));assert.deepEqual(json(S.reduce(undefined,{type:'checkpoint',value:cp30},0)),json(old.reduce(undefined,{type:'checkpoint',value:cp30},0)));}
});
