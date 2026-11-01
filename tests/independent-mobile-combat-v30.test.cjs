'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js'),qa=require('../tools/audit-mobile-combat-v30.cjs'),flowQA=require('../tools/audit-danmaku-flow-v29.cjs');
test('actual30clone admissions own real sources and complete promises while boss-stage pawn count stays zero',()=>{const r=qa.phaseMatrix(C,{ticks:1200,bosses:[0,7,8,12,16,33,34],phases:[0,2],difficulties:['hell']});assert.equal(r.summary.cases,14);assert.equal(r.summary.peakPawns,0);assert(r.summary.copyBirths>r.summary.baseline29CopyBirths);assert.equal(r.summary.unexplainedOnscreenRemovals,0);});
test('new30stream retains the exact warning-time bait point through reversed legal input',()=>{assert.equal(flowQA.targetLock(qa.select30(C)).rows.length,2);});
test('new30complete streams reserve every future pellet before warning despite synthetic capacity pressure',()=>{assert.equal(flowQA.capacityReservation(qa.select30(C)).actualPellets,12);});
test('new30actual transition drains existing promises and terminal victory cancels pending plans without fake cues',()=>{assert.equal(flowQA.streamDefeatDrain(qa.select30(C)).length,2);});
test('all315old29raw worlds and checkpoints match pinned latest-main git objects without normalisation',()=>{assert.equal(qa.oldExact(C,{ticks:120,revisions:[29]}).cases,315);});
test('undefined21/25/27/28raw simulation and checkpoints remain unchanged',()=>{assert.equal(qa.oldExact(C,{ticks:120,bosses:[0,8,16,33,34],phases:[0,2],revisions:[undefined,21,25,27,28]}).cases,150);});

test('all30friendly skills preserve bullet IDs and expiry uses bounded unscaled grace, harmless fade and104pxedge padding',()=>{assert.equal(qa.continuity(C).movingUnscaledGraceTicks,180);});
