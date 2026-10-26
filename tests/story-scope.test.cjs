'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const Base = require('../src/story-data.js');
const Scope = require('../src/story-scope.js');
const root = path.resolve(__dirname, '..');
const addonPath = process.env.HAPIL_STORY_ADDENDUM || path.resolve(root, 'docs/story/required-forms-addendum.json');
const originalPath = process.env.HAPIL_STORY_SOURCE || path.resolve(root, 'docs/story-source/canonical-original.txt');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const effective = () => Scope.apply(Base);

test('scope UMD and CommonJS expose immutable apply and exact requirement exports', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/story-scope.js'), 'utf8'), context);
  assert.equal(context.HapilStoryScope.scopeRevision, 'storymode-canonical-r3');
  assert.equal(typeof context.HapilStoryScope.apply, 'function');
  assert.equal(Scope.addendumSHA256, 'fa73528c57d56ae5e1841f2c08463c3d243cc8634c48b40ce771814f24e659fb');
  assert.equal(Scope.formRequirements.length, 16);
  assert.ok(Object.isFrozen(Scope));
  assert.ok(Object.isFrozen(Scope.formRequirements[0].canonicalEvidence));
  assert.equal(Scope.sourceEvidence.mismatches.length, 0);
  assert.equal(Scope.sourceEvidence.checks.length, 19);
  assert.ok(Scope.sourceEvidence.checks.every(c => c.normalizedMatch && c.exactExceptTerminalNewlines));
});

test('apply leaves the frozen historical census and original scene text unchanged', () => {
  const before = JSON.stringify(Base);
  const data = effective();
  assert.equal(JSON.stringify(Base), before);
  assert.equal(Base.primaryCombatIds.length, 69);
  assert.deepEqual(Base.conditionalCombatIds, ['mb-ep1a09', 'a11-cosmic-v31318', 'blue-executor']);
  assert.notEqual(data, Base);
  assert.deepEqual(data.historicalPrimaryCombatIds, Base.primaryCombatIds);
  assert.deepEqual(data.historicalConditionalCombatIds, Base.conditionalCombatIds);
  assert.deepEqual(data.scenes.map(s => s.text), Base.scenes.map(s => s.text));
  assert.deepEqual(data.scenes.map(s => s.sourceRange), Base.scenes.map(s => s.sourceRange));
  assert.deepEqual(data.scenes.map(s => s.narrators), Base.scenes.map(s => s.narrators));
});

test('r3 promotes the distinct canonical executor, giving 70 primary and no selectable conditional', () => {
  const data = effective();
  assert.equal(data.primaryCombatIds.length, 70);
  assert.equal(new Set(data.primaryCombatIds).size, 70);
  assert.deepEqual(data.conditionalCombatIds, []);
  assert.equal(data.encounters.length, 70);
  assert.ok(data.encounters.every(e => e.required && e.selectable && !e.conditional));
  const blue = data.encounters.find(e => e.id === 'blue-executor');
  const keeper = data.encounters.find(e => e.id === 'mb-murder03');
  assert.equal(blue.sceneId, 'murder03');
  assert.equal(blue.canonicalName, '파란불 집행체');
  assert.notEqual(blue.id, keeper.id);
  assert.notEqual(blue.relationGroup, keeper.relationGroup);
  assert.deepEqual(data.excludedStandaloneCombatIds, ['mb-ep1a09', 'a11-cosmic-v31318']);
  assert.equal(data.excludedHistoricalEncounters.length, 2);
  assert.ok(data.excludedHistoricalEncounters.every(e => !e.selectable && !e.required && e.standaloneExcluded));
  assert.equal(data.scenes.flatMap(s => s.requiredCombatIds).length, 70);
  assert.equal(data.scenes.flatMap(s => s.conditionalCombatIds).length, 0);
  assert.deepEqual(data.scenes.flatMap(s => s.requiredCombatIds).sort(), [...data.primaryCombatIds].sort());
});

test('three causal locks belong to one executor without invented ordering against the keeper', () => {
  const data = effective();
  const s = data.scenes.find(s => s.id === 'murder03');
  assert.deepEqual(s.combatOrderGroups, [['mb-murder03', 'blue-executor']]);
  assert.equal(s.combatOrderEvidence.relativeOrder, 'unspecified');
  assert.deepEqual(s.historicalConditionalCombatIds, ['blue-executor']);
  const stages = data.stageRequirementsByCombat['blue-executor'];
  assert.equal(stages.identityCount, 1);
  assert.equal(stages.stageCount, 3);
  assert.deepEqual(stages.stageIds, ['causal-lock-1', 'causal-lock-2', 'causal-lock-3']);
  assert.equal(stages.relativeOrderAgainstOtherEncounterIds, 'unspecified');
  assert.equal(data.primaryCombatIds.filter(id => id.startsWith('causal-lock')).length, 0);
  assert.equal(data.encounters.find(e => e.id === 'blue-executor').stageRequirements.stageCount, 3);
});

test('scene07 preserves pillar, Balrog, and post-circle collapse order without changing the frozen source census', () => {
  const data = effective();
  const scene = data.scenes.find(s => s.id === 'dist06');
  assert.deepEqual(scene.combatOrderGroups, [['mb-dist06'], ['dist06-boss'], ['mb-ep1a07']]);
  assert.equal(scene.outcome, 'survive-and-fall');
  assert.equal(Base.scenes.find(s => s.id === 'dist06').combatOrderGroups.length, 1);
  const correction = Scope.routeOrderCorrections.dist06;
  assert.match(correction.origin, /not an instruction in the required-forms addendum/);
  assert.match(correction.sceneOutcomeTiming, /after all scene combats/);
  assert.equal(correction.sourceEvidence.length, 3);
  assert.match(correction.sourceEvidence[0].exactText, /기둥을 지키는 악마들을 하나씩 쓰러뜨렸다/);
  assert.match(correction.sourceEvidence[1].exactText, /발록의 가슴에 무기를 적중시켰다/);
  assert.match(correction.sourceEvidence[2].exactText, /검은 소용돌이/);
  assert.equal(data.encounters.find(e => e.id === 'dist06-boss').resolution, undefined);
});

test('16 forms map to existing combat identities and do not add 16 bosses', () => {
  const data = effective();
  assert.deepEqual(data.requiredForms, Scope.formRequirements);
  assert.equal(new Set(data.requiredForms.map(r => r.formID)).size, 16);
  assert.equal(Object.keys(data.requiredFormIdsByCombat).length, 16);
  for (const row of data.requiredForms) {
    const e = data.encounters.find(e => e.id === row.bossID);
    assert.ok(e, row.bossID);
    assert.ok(e.requiredFormIds.includes(row.formID));
    assert.ok(data.requiredFormIdsByCombat[row.bossID].includes(row.formID));
    assert.ok(row.canonicalEvidence.exactText.length > 0);
    assert.ok(row.completionGate.includes('runtime presentation'));
    assert.ok(!data.primaryCombatIds.includes(row.formID));
  }
  assert.deepEqual(data.requiredFormIdsByCombat['a11-boss'], ['revealed-black-wing-horn-lucifer']);
  assert.equal(data.requiredFormIdsByCombat['a11-cosmic-v31318'], undefined);
  for (const ids of [['b06-boss', 'b06b-boss'], ['b08-boss', 'b09-boss']]) {
    assert.equal(new Set(ids.map(id => data.encounters.find(e => e.id === id).relationGroup)).size, 1);
  }
});

test('derived data is deeply immutable and repeat application is idempotent', () => {
  const data = effective();
  assert.ok(Object.isFrozen(data));
  assert.ok(Object.isFrozen(data.scenes[0]));
  assert.ok(Object.isFrozen(data.encounters[0].requiredFormIds));
  assert.ok(Object.isFrozen(data.requiredForms[0].canonicalEvidence));
  assert.throws(() => data.primaryCombatIds.push('invented'), TypeError);
  assert.throws(() => { data.scenes[0].text = 'changed'; }, TypeError);
  assert.throws(() => { data.requiredForms[0].bossID = 'invented'; }, TypeError);
  assert.equal(Scope.apply(data), data);
});

test('overlay rejects different canonical bindings or incomplete historical data', () => {
  const wrong = JSON.parse(JSON.stringify(Base));
  wrong.canonicalSHA256 = 'incorrect';
  assert.throws(() => Scope.apply(wrong), /source binding mismatch/);
  const missing = JSON.parse(JSON.stringify(Base));
  missing.encounters = missing.encounters.filter(e => e.id !== 'blue-executor');
  assert.throws(() => Scope.apply(missing), /executor mapping missing/);
  const census = JSON.parse(JSON.stringify(Base));
  census.primaryCombatIds.pop();
  assert.throws(() => Scope.apply(census), /69-primary census required/);
});

test('all addendum rows and decisions bind exactly to the verified original', () => {
  const addonBytes = fs.readFileSync(addonPath);
  assert.equal(hash(addonBytes), Scope.addendumSHA256);
  const addon = JSON.parse(addonBytes);
  assert.deepEqual(Scope.formRequirements, addon.requiredForms);
  assert.deepEqual(Scope.conditionalDecisions, addon.conditionalDecisions);
  const original = fs.readFileSync(originalPath);
  assert.equal(hash(original), Scope.sourceEvidence.canonicalOriginalSHA256);
  assert.notEqual(Scope.sourceEvidence.declaredReadCopySHA256, Scope.sourceEvidence.canonicalOriginalSHA256);
  const lines = original.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const normalized = value => value.replace(/\s+/g, ' ').trim();
  for (const row of [...addon.requiredForms, ...addon.conditionalDecisions]) {
    const e = row.canonicalEvidence || row.anchor;
    const excerpt = lines.slice(e.startLine - 1, e.endLine).join('\n');
    assert.equal(normalized(excerpt), normalized(e.exactText), row.formID || row.id);
    assert.equal(excerpt.replace(/\n+$/, ''), e.exactText.replace(/\r\n?/g, '\n').replace(/\n+$/, ''), row.formID || row.id);
  }
  for (const e of Scope.routeOrderCorrections.dist06.sourceEvidence) {
    assert.equal(lines.slice(e.sourceRange[0] - 1, e.sourceRange[1]).join('\n'), e.exactText);
  }
  const doc = JSON.parse(fs.readFileSync(path.join(root, 'docs/story-scope-r3.json'), 'utf8'));
  assert.deepEqual(doc.requiredForms, addon.requiredForms);
  assert.equal(doc.effectiveScope.primaryCount, 70);
  assert.equal(doc.assetVerification.includes('not completion claims'), true);
});
