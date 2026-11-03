'use strict';
// App integration with its real fixed-step core; fixture renderer intentionally
// draws nothing, so a later draw cannot conceal a missed first-shot record.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,boot,advance}=require('./helpers/story-app-fixture-v19.cjs');
test('a newly started app records its first successful shot before any render observer exists',async()=>{
 const h=harness();await boot(h);h.el('practice-select').value='8';h.click('practice-button');await advance(h);
 const w=h.world();assert(w&&w.combatRevision===31&&w.stats.shots>0);
 const frame=h.g.HapilCore.getCombatPresentation(w),muzzles=frame.events.filter(e=>e.serial&&e.kind==='muzzle');
 assert(muzzles.length>0,'app must enable the private channel before its first fixed-step shot');
 assert.equal(muzzles[0].shotId,w.shots[0].id);assert.equal(muzzles[0].shotKind,'basic');
 assert(!Object.keys(w).some(k=>/presentation/i.test(k)));assert.equal(h.saveCalls.length,0);
});
