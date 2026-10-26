'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Data = require('../src/story-data.js');
const Scope = require('../src/story-scope.js');
const Encounters = require('../src/story-encounters.js');
const source = fs.readFileSync(require.resolve('../src/story-encounters.js'), 'utf8');
const byScene = new Map(Data.scenes.map(scene => [scene.id, scene]));

test('effective 70 exact IDs preserve the frozen census and exclude unrelated expansions', () => {
  const before = JSON.stringify(Data);
  const effective = Scope.apply(Data);
  const ids = Encounters.list().map(e => e.id);
  assert.equal(ids.length, 70);
  assert.equal(new Set(ids).size, 70);
  assert.deepEqual([...ids].sort(), [...effective.primaryCombatIds].sort());
  assert.equal(Data.primaryCombatIds.length, 69);
  assert.equal(Data.conditionalCombatIds.length, 3);
  assert.equal(Encounters.get('blue-executor').canonicalIdentity.role, 'boss');
  assert.equal(JSON.stringify(Data), before);
  for (const id of ['mb-ep1a09', 'a11-cosmic-v31318', 'S-01', 'NS-01', 'R-01', 'NR-01', 'persona', 'michaela']) assert.equal(Encounters.get(id), null);
});
test('canonical scene ordering puts the pillars before Balrog and the void presentation last', () => {
  const ids = Encounters.list().filter(e => e.sceneId === 'dist06').map(e => e.id);
  assert.deepEqual(ids, ['mb-dist06', 'dist06-boss', 'mb-ep1a07']);
  assert.equal(Encounters.get('mb-murder03').relativeEncounterOrder, 'unspecified-with-blue-executor');
  assert.equal(Encounters.get('blue-executor').relativeEncounterOrder, 'unspecified-with-mb-murder03');
});
test('narrators preserve separate EGO, A, B, Seoha and investigation memories', () => {
  assert.deepEqual(Encounters.get('dist00-boss').narrator, ['EGO']);
  assert.deepEqual(Encounters.get('b09-boss').narrator, ['의목사 A']);
  assert.deepEqual(Encounters.get('u203-boss').narrator, ['의목사 B']);
  assert.deepEqual(Encounters.get('k103-boss').narrator, ['윤서하']);
  assert.deepEqual(Encounters.get('mb-murder01').narrator, ['윤하람']);
  assert.deepEqual(Encounters.get('mb-murder02').narrator, ['장민재']);
  assert.deepEqual(Encounters.get('murder04-mid').narrator, ['고서진', '한이경']);
  assert.deepEqual(Encounters.get('blue-executor').narrator, ['환도', '한이경']);
});
test('per-encounter resolution does not incorrectly inherit scene ending across intermediates', () => {
  const expected = {
    'mb-dist06': 'cleared', 'dist06-boss': 'cleared', 'mb-ep1a07': 'survive-and-fall',
    'mb-ep1b09': 'cleared', 'b09-boss': 'cleared', 'mb-hando01': 'cleared',
    'u203-mid': 'cleared', 'u203-boss': 'command-severed',
    'mb-hando03': 'cleared', 'h103-boss': 'cleared',
    'mb-murder03': 'cleared', 'blue-executor': 'command-severed',
    'c104-mid': 'cleared', 'c104-boss': 'authority-severed',
    'l301-boss': 'survive-and-fall', 'kair-great-03': 'liberated',
    'mb-kair01-v31231': 'defended', 'mb-hando02': 'defended',
    'mb-murder01': 'investigated', 'mb-murder02': 'investigated', 'murder04-mid': 'investigated'
  };
  for (const [id, resolution] of Object.entries(expected)) assert.equal(Encounters.get(id).resolution, resolution, id);
  assert.equal(Encounters.get('b09-boss').canonicalTransition.event, 'return-coordinates-lost');
  assert.equal(Encounters.get('mb-hando01').canonicalTransition.event, 'castle-fallen-and-ego-stolen');
});
test('explicit objectives attach only to final or sole encounter, never every midboss in scene', () => {
  const attached = Encounters.list().filter(e => e.objectiveSceneId).map(e => e.id).sort();
  assert.deepEqual(attached, ['l301-boss', 'mb-kair01-v31231', 'kair-great-06', 'kair-great-03', 'k103-boss', 'mb-hando02', 'h103-boss', 'mb-murder01', 'mb-murder02', 'murder04-mid', 'blue-executor', 'c104-boss'].sort());
  for (const id of ['mb-hando03', 'mb-murder03', 'c104-mid', 'u203-mid', 'mb-dist06', 'dist06-boss', 'mb-ep1b09']) assert.equal(Encounters.get(id).objectiveSceneId, null);
});
test('source-explicit counts are six defense waves, six rings and three causal/Siren stages', () => {
  for (const [id, count] of [['mb-kair01-v31231', 6], ['kair-great-06', 6], ['k103-boss', 3], ['blue-executor', 3]]) {
    const descriptor = Encounters.get(id);
    assert.equal(descriptor.stageCount, count);
    assert.equal(descriptor.stages.length, count);
    assert.equal(descriptor.stageCountBasis, 'canonical-explicit-count');
  }
  assert.deepEqual(Encounters.get('k103-boss').stages.map(s => s.label), ['시간 수확', '최적화된 운명', '자유의지의 시간']);
  assert.equal(Encounters.get('l301-boss').stages[1].adaptation.count, 6);
  assert.equal(Encounters.get('c104-boss').stageCountBasis, 'authored-contract', 'four implementation beats are not four prose-declared phases');
});
test('source attack quotations are present in the correct scene, and context is not invented attribution', () => {
  for (const encounter of Encounters.list()) {
    const scene = byScene.get(encounter.sceneId);
    assert.ok(scene, encounter.id);
    assert.ok(encounter.sourceAnchors.length > 0);
    assert.ok(encounter.sourceRange[1] <= 919);
    for (const stage of encounter.stages) {
      for (const quote of stage.sourceExplicit) assert.ok(scene.text.includes(quote), `${encounter.id}: ${quote}`);
      for (const evidence of stage.sourceEvidence) assert.ok(evidence.lines[0] >= 1 && evidence.lines[1] <= 919);
    }
  }
  assert.equal(Encounters.get('mb-ep1b06b').stages[0].sourceExplicit.length, 0, 'a thorn/yoyo technique is not named in the boy prose');
  assert.equal(Encounters.get('mb-dist06').stages[0].sourceExplicit.length, 0);
  assert.equal(Encounters.get('mb-ep1a07').stages[0].sourceExplicit.length, 0);
  for (const id of ['c103-mid', 'c103-boss']) assert.equal(Encounters.get(id).stages[0].sourceEvidence[0].attribution, 'scene-context');
});
test('Han Rian and Baek Ion keep named identities and their distinct source-mapped attack presentations', () => {
  assert.match(Encounters.get('c103-mid').name, /한리안/);
  assert.match(Encounters.get('c103-boss').name, /백이온/);
  assert.deepEqual(Encounters.get('c103-mid').stages[0].sourceExplicit, ['황금 역십자가의 탄막']);
  assert.deepEqual(Encounters.get('c103-boss').stages[0].sourceExplicit, ['질서의 방벽']);
});
test('protected command/core targets distinguish Arvelia, Controller, villagers and final authority duel', () => {
  for (const id of ['kair-great-03', 'u203-boss', 'mb-last302-v31231', 'blue-executor', 'c103-mid', 'c103-boss', 'b06b-boss', 'mb-ep1b06b']) assert.ok(Encounters.get(id).stages.every(s => s.target === 'command-link'));
  assert.ok(Encounters.get('mb-kair01-v31231').stages.every(s => s.target === 'core' && s.damageSource.affects === 'protected-core'));
  assert.match(Encounters.get('mb-kair01-v31231').targetSemantics, /never damage or destroy/);
  assert.match(Encounters.get('kair-great-03').targetSemantics, /Never attack or kill her body/);
  assert.match(Encounters.get('u203-boss').targetSemantics, /memory door.*preserved/);
  assert.equal(Encounters.get('c104-boss').stages.at(-1).target, 'authority');
  assert.match(Encounters.get('c104-boss').targetSemantics, /Preserve union core/);
});
test('all proposed vertical patterns fit bounded geometry/timing budget and remain adaptations', () => {
  const patterns = new Set();
  for (const encounter of Encounters.list()) for (const stage of encounter.stages) {
    const a = stage.adaptation;
    patterns.add(a.pattern);
    for (const key of ['windupTicks', 'activeTicks', 'recoveryTicks', 'intervalTicks', 'count', 'speed']) assert.ok(Number.isSafeInteger(a[key]) && a[key] > 0, `${encounter.id}/${key}`);
    assert.ok(a.count <= Encounters.budget.maxEmissionCount);
    assert.ok(a.speed <= Encounters.budget.maxSpeed);
    assert.ok((Math.floor(a.activeTicks / a.intervalTicks) + 1) * a.count <= Encounters.budget.maxActiveProjectiles);
    assert.equal(stage.damageSource.phase, 'active-only');
    assert.equal(stage.damageSource.source, 'gameplay-adaptation');
    assert.ok(['circle', 'annulus', 'rectangle', 'capsule'].includes(stage.damageSource.shape));
    assert.ok(['body', 'command-link', 'core', 'authority', 'survival'].includes(stage.target));
  }
  assert.deepEqual([...patterns].sort(), ['aimed', 'fan', 'lanes', 'ring', 'spiral', 'sweep']);
  assert.equal(Encounters.budget.width, 360);
  assert.equal(Encounters.budget.height, 640);
});
test('phase specificity preserves flame forms, flute/wolves, sword learning and neural revival', () => {
  assert.deepEqual(Encounters.get('b07-boss').stages.map(s => s.label), ['곰의 형상', '늑대의 형상', '용의 형상']);
  assert.match(Encounters.get('l305-boss').stages[0].sourceExplicit[0], /피리로 늑대를 조종/);
  assert.match(Encounters.get('l301-boss').stages[0].sourceExplicit[0], /검로를 읽어/);
  assert.match(Encounters.get('c104-boss').stages[1].sourceExplicit[0], /검은 신경선/);
  assert.equal(Encounters.list().filter(e => e.id === 'c104-boss').length, 1, 'neural revival does not create a new boss ID');
  assert.notDeepEqual(Encounters.get('dist06-boss').stages, Encounters.get('k103-boss').stages);
});
test('contracts are deeply immutable and never claim coded gameplay or approved artwork', () => {
  assert.equal(Encounters.get('__proto__'), null);
  assert.equal(Encounters.get(null), null);
  assert.equal(Encounters.get('not-a-boss'), null);
  assert.ok(Object.isFrozen(Encounters.list()));
  for (const descriptor of Encounters.list()) {
    assert.equal(descriptor.gameplayImplemented, false);
    assert.equal(descriptor.approvedArt, false);
    assert.equal(descriptor.contractOnly, true);
    assert.ok(Object.isFrozen(descriptor.stages[0].adaptation));
    assert.throws(() => { descriptor.stages[0].adaptation.count = 999; }, TypeError);
  }
});
test('browser contract supports scope overlay and exact base-plus-blue fallback without expansions', () => {
  for (const scoped of [false, true]) {
    const ctx = { HapilStoryData: Data };
    if (scoped) ctx.HapilStoryScope = Scope;
    vm.runInNewContext(source, ctx);
    assert.equal(ctx.HapilStoryEncounters.list().length, 70);
    assert.equal(ctx.HapilStoryEncounters.get('blue-executor').stageCount, 3);
    assert.equal(ctx.HapilStoryEncounters.get('a11-cosmic-v31318'), null);
  }
  const extended = structuredClone(Data);
  extended.scenes.push({ id: 'NS-01', sourceRange: [922, 930], combatOrderGroups: [] });
  assert.throws(() => vm.runInNewContext(source, { HapilStoryData: extended }), /Post-ending/);
});
