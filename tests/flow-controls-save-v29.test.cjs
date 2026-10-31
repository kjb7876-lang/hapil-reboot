'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),vm=require('node:vm');
const C=require('../src/core.js'),S=require('../src/storage.js')._test,{harness,boot,advance,practice}=require('./helpers/story-app-fixture-v19.cjs');
const BASE='f32a2b9c6e61730ae5bd1b411fc58897d1b677ec',json=x=>JSON.parse(JSON.stringify(x));
function saved(revision){return C.checkpoint(C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,difficulty:'normal',seed:813,runId:'flow29-save-contract'}));}
function previousStore(){const box={module:{exports:{}},console};vm.runInNewContext(cp.execFileSync('git',['show',BASE+':src/storage.js'],{encoding:'utf8'}),box);return box.module.exports._test;}
function drag(h,amount){const e={button:0,pointerId:7,clientX:0,clientY:0,preventDefault(){}};h.el('touch-pad').listeners.pointerdown(e);h.el('touch-pad').listeners.pointermove({...e,clientX:amount});}

test('mobile precision uses the same half-speed core movement without changing hit radius or adding lower guidance',async()=>{
 const runs=[];for(const precise of [false,true]){const h=harness();await boot(h);await practice(h,0);const w=h.world();assert.equal(w.combatRevision,29);assert.equal(h.el('precision-button').hidden,false);if(precise)h.click('precision-button');assert.equal(h.el('precision-button').ariaPressed,String(precise));const x=w.player.x,tick=w.tick,r=w.player.r;drag(h,48);h.tick();runs.push({dx:w.player.x-x,ticks:w.tick-tick,r});assert.equal(w.player.r,r);assert.equal(String(h.el('pad-title').textContent||''),'');assert.equal(String(h.el('pad-caption').textContent||''),'');assert.equal(h.saveCalls.length,0);}
 assert(runs.every(r=>r.ticks>0));assert.equal(runs[0].dx/runs[0].ticks,4);assert.equal(runs[1].dx/runs[1].ticks,2);assert.equal(runs[0].r,runs[1].r);
});

test('precision transitions clear queued drag and reset on pause and leave restored old28 controls unchanged',async()=>{
 const h=harness();await boot(h);await practice(h,0);drag(h,48);assert(h.g.HapilApp.getState().pointer.pendingX>0);h.click('precision-button');assert.equal(h.g.HapilApp.getState().pointer.pendingX,0);h.click('pause-button');assert.equal(h.el('precision-button').ariaPressed,'false');assert.equal(h.el('precision-button').disabled,true);h.click('resume-button');assert.equal(h.el('precision-button').ariaPressed,'false');
 const old=harness({checkpoint:saved(28)});await boot(old);old.click('continue-button');await advance(old);assert.equal(old.world().combatRevision,28);assert.equal(old.el('precision-button').hidden,true);old.click('precision-button');assert.equal(old.el('precision-button').ariaPressed,'false');
});

test('29 checkpoint storage keeps its selector and rejects old-client overwrite while older schemas stay byte exact',()=>{
 const previous=previousStore(),cp29=saved(29),out=S.reduce(undefined,{type:'checkpoint',value:cp29},0);assert.deepEqual(S.validateCheckpoint(cp29),cp29);assert(out.result.ok);assert.equal(out.state.combatContract,29);assert.equal(previous.safeStoredRecord(json(out.state)),false);assert.equal(previous.reduce(json(out.state),{type:'settings',value:{quality:'low'}},out.state.revision).result.reason,'invalid-storage-state');
 for(const revision of [undefined,21,25,27,28]){const cp=saved(revision);assert.deepEqual(json(S.reduce(undefined,{type:'checkpoint',value:cp},0)),json(previous.reduce(undefined,{type:'checkpoint',value:cp},0)));const mixed=json(out.state);mixed.backup.combatRevision=revision;if(revision===undefined)delete mixed.backup.combatRevision;assert.equal(S.safeStoredRecord(mixed),false);}
 assert.equal(S.validateCheckpoint({...cp29,combatRevision:30}),null);
});

test('the precision control is outside the arena and the flow module loads before core under one cache revision',()=>{
 const html=fs.readFileSync('index.html','utf8'),control=html.indexOf('id="precision-button"'),arena=html.indexOf('id="app-stage"');assert(control>0&&control<arena);assert.match(html,/id="precision-button"[^>]*aria-pressed="false"/);const scripts=[...html.matchAll(/src="src\/([^"?]+)\.js\?v=([^"&]+)"/g)].map(m=>({name:m[1],revision:m[2]}));assert(scripts.findIndex(s=>s.name==='boss-flow-v29')<scripts.findIndex(s=>s.name==='core'));assert.equal(new Set(scripts.map(s=>s.revision)).size,1);assert.equal(scripts[0].revision,'20261101-flow29');
});
