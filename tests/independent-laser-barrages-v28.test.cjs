'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js'),qa=require('../tools/audit-laser-barrages-v28.cjs');
test('real v28 rays are fully warned and collide only during their exact committed active interval',()=>{assert.equal(qa.damageClocks(C).collisionSamples.length,5);});
test('actual boss defeat stops new laser promises and explicit pure-core steps drain existing committed rays',()=>{assert.equal(qa.phaseStop(C).length,2);});
test('all35boss laser programs differ in actual finite geometry/pulse clocks under the same fixed emitter',()=>{assert.equal(qa.geometricDiversity(C).uniquePhysicalLaserPrograms,35);});
test('actual new laser sequences are locked, reflected with finite segments, corridor-safe and inside12/40budgets',()=>{const out=qa.phaseMatrix(C,{ticks:900,bosses:[0,3,6,8,11,18,21,24,29,33,34],phases:[0,2],difficulties:['normal','hell']});assert(out.summary.newRays>0);assert(out.summary.reflectedChainSamples>0);assert.equal(out.summary.poolPressure,0);assert.equal(out.summary.droppedGroups,0);});
test('all315 old27 boss/phase/difficulty worlds and raw checkpoints remain exactly unchanged',()=>{assert.equal(qa.old27Exact(C,{ticks:180}).cases,315);});
