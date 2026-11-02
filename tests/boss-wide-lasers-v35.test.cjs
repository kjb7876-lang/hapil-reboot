'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js'),qa=require('../tools/audit-downfield-v35.cjs');
test('all315 real boss configurations cast immutable boss-origin wide fans through warning, active and full fade',()=>{
 const r=qa.phaseMatrix(C,{ticks:600});assert.equal(r.summary.cases,315);assert(r.summary.actualWideCapsules>=315);assert(r.summary.actualAnchorChecks>0&&r.summary.actualCorridorChecks>0);assert(r.summary.peakWide<=6);assert(r.summary.peakHazards<=40&&r.summary.peakBullets<=768);assert.equal(r.summary.violationCount,0,JSON.stringify(r.rows.filter(x=>Object.keys(x.violations.counts).length).slice(0,8).map(x=>({boss:x.bossIndex,phase:x.phase,difficulty:x.difficulty,violations:x.violations})),null,2));
});
test('all105 real approach configurations keep wide lasers boss-only and ordinary bullets in the lower playfield',()=>{
 const r=qa.waveMatrix(C);assert.equal(r.summary.cases,105);assert(r.summary.waveTicks>=50000);assert(r.summary.ordinaryBirths>1000);assert.equal(r.summary.wideObserved,0);assert.equal(r.summary.violationCount,0,JSON.stringify(r.rows.filter(x=>Object.keys(x.violations.counts).length).slice(0,8).map(x=>({boss:x.bossIndex,difficulty:x.difficulty,violations:x.violations})),null,2));
});
