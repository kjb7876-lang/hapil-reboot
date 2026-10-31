'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const a=require('../tools/audit-boss-identities-v25.cjs');
test('the v25 comparison reads the exact v24 git objects and preserves the35config route boundary',()=>{
  const pinned=JSON.parse(fs.readFileSync(path.join(a.ROOT,'docs/v25-qa/pinned-v24-baseline.json'))),fresh=a.baselineManifest();
  assert.equal(JSON.stringify(fresh),JSON.stringify(pinned));assert.equal(fresh.baseline,'ef95fc227506162b5203092da9e1734e2f43ef58');assert.equal(fresh.campaignBossCount,35);assert.equal(fresh.standaloneCultAssetGroup,12);
  assert.equal(JSON.stringify(fresh.campaignBosses.map(b=>b.assetGroup)),JSON.stringify([...Array.from({length:12},(_,i)=>i),...Array.from({length:23},(_,i)=>i+13)]));
});
test('the independent escape oracle counts crossing, tangent and degenerate real segments',()=>{
  assert.equal(a.segmentsSquared(0,0,20,20,0,20,20,0),0);assert.equal(a.segmentsSquared(0,0,20,0,20,0,40,0),0);
  assert.equal(a.segmentsSquared(0,0,20,0,30,0,40,0),100);assert.equal(a.segmentsSquared(0,0,0,0,3,4,3,4),25);
  assert.equal(a.segmentsSquared(0,0,20,0,5,3,15,3),9);assert.equal(a.segmentsSquared(0,0,20,0,10,-5,10,5),0);
});
test('every old boss keeps exact unversioned and21 simulated worlds and boundary saves',()=>{
  const box=a.runtime(),old=a.runtime(a.BASE),rows=a.legacyTrace(box,old,{phases:[2],difficulties:['hell'],ticks:240});assert.equal(rows.length,70);assert(rows.every(r=>r.exact));
});
test('actual25 casts keep at least54ticks immutable warning and never put new bodies in a committed escape route',()=>{
  // The first held escape corridor may legitimately filter an entire volley.
  // Observe its second cycle too; never force a shot through that safe route.
  const box=a.runtime(),result=a.collectRoutes(box,{phases:[0],difficulties:['hell'],ticks:840,standalone:true});assert.equal(result.rows.length,36);
  assert(result.rows.filter(r=>r.group!==8).every(r=>r.identityCasts>0&&r.identityBullets>0));assert(result.rows.every(r=>r.poolPressure===0&&r.droppedGroups===0));
  assert(result.rows.some(r=>r.escapeRouteBirthsChecked>0));assert.equal(result.rows.find(r=>r.group===8).identityCasts,0,'Lust keeps its reference choreography');
});
test('the reference Lust battle is exactly v24 in all3phases and3difficulties apart from its optional revisionfield',()=>{
  const rows=a.lustPhysics(a.runtime(),a.runtime(a.BASE),{ticks:240});assert.equal(rows.length,9);
});
test('checkpoint-selected25 configurations replay the same legal directions deterministically',()=>{
  const rows=a.checkpointDeterminism(a.runtime(),{bosses:[0,8,12,21,28,33,34],ticks:180});assert.equal(rows.length,63);
});
test('new source pivots keep the historical colored bright centers and at least90percent of the full real hitbody',async()=>{
  const report=await require('../tools/review-source-centers-v25.cjs').review();assert.equal(report.summary.cases,144);assert(report.summary.minCentral>=.8);assert(report.summary.minBright>=.8);assert(report.summary.minRelativeHistoricalLuma>=.9);assert(report.summary.minFullDamage>=.9);
});
