'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js'),S=require('../src/storage.js')._test;
const BASE='7c3acd7e154e08444236395eb316fb678bc01568',json=x=>JSON.parse(JSON.stringify(x));
function previousStore(){const box={module:{exports:{}},console};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/storage.js'],{encoding:'utf8'}),box);return box.module.exports._test;}
function boundary(revision,id='laser-save28'){const o={campaign:true,campaignRevision:5,combatRevision:revision,difficulty:'normal',seed:813,runId:id};if(revision===undefined)delete o.combatRevision;return C.checkpoint(C.createRun(o));}

test('28 phase checkpoints restore the same finite laser promises and ordinary-health input outcome',()=>{
 for(const bossIndex of [0,3,6,8,11,24,33,34])for(const phase of [0,2]){
  const run=C.createRun({campaign:true,campaignRevision:5,combatRevision:28,practiceBoss:true,bossIndex,difficulty:'normal',seed:813,runId:'laser28-restore-'+bossIndex+'-'+phase});
  const cp=C.checkpoint(run);cp.phase=phase;const clean=S.validateCheckpoint(cp);assert.deepEqual(clean,cp);
  const a=C.restoreCheckpoint(clean),b=C.restoreCheckpoint(clean);assert.equal(a.player.hp,3);assert.equal(a.combatRevision,28);
  let sawNewLaser=false;
  for(let n=0;n<360;n++){const input={dx:n%120<60?2:-2,dy:n%100<50?.5:-.5,focus:n%90<45};C.step(a,input);C.step(b,input);if(a.hazards.some(h=>h.laserBarrage))sawNewLaser=true;}
  assert.deepEqual(a,b,'raw restored world cannot differ in geometry, activation clocks, RNG or collisions');assert(sawNewLaser,'restored boss '+bossIndex+' phase '+phase+' must exercise actual new laser promises');
 }
});

test('a still-open27 client cannot reinterpret or overwrite a28 saved combat contract',()=>{
 const old=previousStore(),first=boundary(28),out=S.reduce(undefined,{type:'checkpoint',value:first},0);assert(out.result.ok);assert.equal(out.state.combatContract,28);assert(S.safeStoredRecord(out.state));
 assert.equal(old.safeStoredRecord(json(out.state)),false);const blocked=old.reduce(json(out.state),{type:'settings',value:{quality:'low'}},out.state.revision);assert.equal(blocked.result.reason,'invalid-storage-state');assert.equal(blocked.changed,false);
 for(const revision of [undefined,21,25,27]){const next={...first,combatRevision:revision,checkpointSerial:2,tick:60};if(revision===undefined)delete next.combatRevision;const changed=S.reduce(json(out.state),{type:'checkpoint',value:next},out.state.revision);assert.equal(changed.result.reason,'combat-revision-mismatch');assert.equal(changed.changed,false);}
 const cleared=S.reduce(json(out.state),{type:'clear'},out.state.revision);assert(cleared.result.ok);assert.equal(cleared.state.combatContract,28);assert.equal(old.safeStoredRecord(json(cleared.state)),false);
});

test('all previous saved selectors still validate and reduce exactly as the27 client',()=>{
 const old=previousStore();for(const revision of [undefined,21,25,27]){const cp=boundary(revision,'laser28-old-'+String(revision));assert.equal(cp.combatRevision,revision);assert.deepEqual(S.validateCheckpoint(cp),cp);assert.deepEqual(json(old.validateCheckpoint(cp)),cp);assert.deepEqual(json(S.reduce(undefined,{type:'checkpoint',value:cp},0)),json(old.reduce(undefined,{type:'checkpoint',value:cp},0)));}
 const cp=boundary(28),state=S.reduce(undefined,{type:'checkpoint',value:cp},0).state;state.backup.combatRevision=27;assert.equal(S.safeStoredRecord(state),false,'recovery cannot substitute an older laser ruleset');assert.equal(S.validateCheckpoint({...cp,combatRevision:30}),null);
});

test('browser loads both motion modules before core with one coherent cache revision',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const scripts=[...html.matchAll(/src="src\/([^"?]+)\.js\?v=([^"&]+)"/g)].map(m=>({name:m[1],revision:m[2]}));
 for(const name of ['boss-patterns-v27','boss-lasers-v28','boss-flow-v29'])assert(scripts.findIndex(s=>s.name===name)>=0&&scripts.findIndex(s=>s.name===name)<scripts.findIndex(s=>s.name==='core'));
 assert.equal(new Set(scripts.map(s=>s.revision)).size,1);assert.equal(scripts[0].revision,'20261101-flow29');
});
