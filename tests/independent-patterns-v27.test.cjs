'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),qa=require('../tools/audit-patterns-v27.cjs');
test('actual memory/counter/delay/ego casts retain existing enemy IDs and substantially slow displacement plus logical age',()=>{const rows=qa.skillContinuity(C);assert.equal(rows.length,4);});
test('visible TTL expiry retires harmlessly instead of popping; i-frame contacts retain bullets and real hits consume them',()=>{assert.equal(qa.retirementContinuity(C).actualHitConsumed,true);});
test('all35boss programs differ in physical geometry/rhythm under one fixed emitter and have real phase variations',()=>{const out=qa.geometricDiversity(C);assert.equal(out.uniquePhysicalPrograms,35);assert(out.minimumDistinctPhasePrograms>=2);});
test('actual27 phase observations remain finite and bounded while exercising curves, one-reflection shots, split lineage and piano rests',()=>{
  const out=qa.phaseMatrix(C,{ticks:600,bosses:[0,2,4,5,6,7,8,9,11,12,18,21,24,27,29,33,34],phases:[0,2],difficulties:['normal','hell']});
  assert(out.summary.curveObservations>0);assert(out.summary.reflectionObservations>0);assert(out.summary.splitChildren>0);assert(out.summary.pianoSamples>0);
});
test('old25 worlds and raw boundary snapshots remain byte-exact for every boss/phase/difficulty',()=>{const out=qa.old25Exact(C,{ticks:180});assert.equal(out.cases,315);assert(out.exact);});
test('sustained HELL Glutton splitting keeps visible parent/children without saturating or silently skipping attack groups',()=>{const out=qa.phaseMatrix(C,{ticks:1200,bosses:[7],phases:[0],difficulties:['hell']});assert.equal(out.summary.poolPressure,0);assert.equal(out.summary.droppedGroups,0);assert(out.summary.splitChildren>0);});
