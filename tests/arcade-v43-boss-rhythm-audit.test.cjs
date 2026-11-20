'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js'),R=require('../src/arcade-boss-rhythm-v43.js');
const Audit=require('../tools/audit-boss-rhythm-v43.cjs');
const report=require('../docs/v43/boss-rhythm-audit.json');

test('rhythm route audit covers all 53 visits, 50 identities, modes, seeds and layouts',()=>{
 const selected=Audit.cases(),ids=new Set(selected.map(c=>c.id));
 assert.equal(selected.length,954);assert.equal(ids.size,954);
 assert.equal(new Set(selected.map(c=>c.segment)).size,53);
 assert.deepEqual(new Set(selected.map(c=>c.actor)),new Set(R.ids));
 assert.deepEqual(new Set(report.samples.map(c=>c.id)),ids);
 assert.deepEqual(report.summary,{cases:954,passed:954,failed:0,actors:50,visits:53,verifiedReplays:954});
 for(const c of selected){const g=A.SEGMENTS[c.segment];assert.equal(g.stage,c.stage);assert.equal(g.actor,c.actor);assert(R.handles({rhythm:true,seg:c.segment},g,A));}
 assert(selected.some(c=>c.actor==='p2_chairman'&&A.SEGMENTS[c.segment].mid),'cinematic sin boss is included');
});

test('stored routes replay without hits, bombs, passive evasion or immunity until native timeout',t=>{
 assert.deepEqual(report.sourceHashes,Audit.sources(),'regenerate the audit after simulation changes');
 let ticks=0;
 for(const sample of report.samples){
  assert(sample.passed,sample.id);assert(sample.route.peakBullets>0&&sample.route.peakLasers>0,'actual hazards were present');
  const replay=Audit.verify(sample,sample.route);assert.deepEqual(replay,sample.replay,sample.id);
  assert.equal(replay.cardTicks,sample.route.cardTicks);ticks+=replay.ticks;
 }
 t.diagnostic('Replayed '+report.samples.length+' seeded continuous input routes over '+ticks+' actual engine ticks; this is finite machine-route evidence, not universal or human-playability proof.');
});

test('audit rejects a damaged route, a shortened route, bombs and excessive movement',()=>{
 const sample=report.samples.find(s=>s.actor==='p1_tree'&&s.difficulty==='normal'&&s.seed===1&&!s.compact);
 assert(sample);
 const s=Audit.init(sample);assert.deepEqual([s.player.x,s.player.y],[180,556]);assert.equal(s.bombs,0);assert.equal(s.noDistort,true);assert.equal(s.player.invulnerableUntil,0);
 assert.throws(()=>Audit.verify(sample,{...sample.route,inputs:[[0,0,false,sample.route.engineTicks]]}),/replay registered a hit\/defense/,'standing still must actually be hit');
 const shortened=sample.route.inputs.map(i=>i.slice());if(--shortened.at(-1)[3]===0)shortened.pop();
 assert.throws(()=>Audit.verify(sample,{...sample.route,inputs:shortened}),/does not finish its actual native first card/);
 assert.throws(()=>Audit.legal({dx:0,dy:0,focus:false,bomb:true}),/bombs are forbidden/);
 assert.throws(()=>Audit.legal({dx:4.2,dy:4.2,focus:false}),/exceeds actual app movement speed/);
 assert.throws(()=>Audit.legal({dx:2,dy:0,focus:true}),/exceeds actual app movement speed/);
});
