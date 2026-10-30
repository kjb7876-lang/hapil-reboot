'use strict';
// Persistence validation and reducer tests; this is not a browser/IDB test.
const test = require('node:test');
const assert = require('node:assert/strict');
const Store = require('../src/storage.js')._test;
const Core = require('../src/core.js');
const copy = x => structuredClone(x);

function checkpoint(revision = 3, difficulty = 'normal', bossIndex = 0) {
  const s = Core.checkpoint(Core.createRun({ campaign: true, seed: 8103, runId: 'hell-storage-boundary' }));
  s.campaignRevision = revision;
  s.difficulty = difficulty;
  s.bossIndex = bossIndex;
  s.player.hp = s.player.maxHp = difficulty === 'gentle' ? 5 : 3;
  return s;
}

test('hell settings and results roundtrip without accepting unknown difficulty names', async () => {
  assert.deepEqual(Store.settingsPatch({ difficulty: 'hell' }), { difficulty: 'hell' });
  assert.deepEqual(Store.settingsPatch({ difficulty: 'HELL' }), {});
  const result = { runId: 'hell-result', score: 14, graze: 3, kills: 8, difficulty: 'hell', won: true };
  assert.deepEqual(Store.validateResult(result), result);
  assert.equal(Store.validateResult({ ...result, difficulty: 'insane' }), null);
  const store = Store.createStore({ location: { protocol: 'https:' } });
  await store.open();
  assert.equal((await store.saveSettings({ difficulty: 'hell' })).ok, true);
  assert.equal((await store.load()).settings.difficulty, 'hell');
});

test('old campaign revisions retain their three- and five-boss bounds and phase history limits', () => {
  for (const [revision, bosses, phases] of [[1, 3, 9], [2, 5, 15]]) {
    const good = checkpoint(revision, 'normal', bosses - 1);
    good.stats.phaseTicks = Array(phases).fill(1500);
    assert.deepEqual(Store.validateCheckpoint(good), good);
    assert.equal(Store.validateCheckpoint({ ...good, bossIndex: bosses }), null);
    const tooMany = copy(good); tooMany.stats.phaseTicks.push(1500);
    assert.equal(Store.validateCheckpoint(tooMany), null);
    const horn = checkpoint(revision, 'gentle', 1);
    assert.deepEqual(Store.validateCheckpoint(horn), horn);
    assert.equal(Store.validateCheckpoint({ ...horn, wave: 1 }), null);
    assert.equal(Store.validateCheckpoint({ ...good, difficulty: 'hell' }), null);
  }
});

test('revision three admits the twelfth boss and 36 bounded phases but rejects its own overflow and unknown revisions', () => {
  const good = checkpoint(3, 'hell', 11);
  good.stage = 'boss'; good.phase = 2; good.checkpointSerial = 70;
  good.stats.phaseTicks = Array(36).fill(4500);
  assert.deepEqual(Store.validateCheckpoint(good), good);
  for (const patch of [{ bossIndex: 12 }, { bossIndex: -1 }, { campaignRevision: 99 }, { campaignRevision: '3' },
    { wave: 3 }, { phase: 3 }, { checkpointSerial: 101 }]) {
    assert.equal(Store.validateCheckpoint({ ...good, ...patch }), null, JSON.stringify(patch));
  }
  for (const ticks of [Array(37).fill(4500), [4501], [-1], [0.5], [Infinity]]) {
    const invalid = copy(good); invalid.stats.phaseTicks = ticks;
    assert.equal(Store.validateCheckpoint(invalid), null);
  }
  const horn = checkpoint(3, 'hell', 1);
  assert(Store.validateCheckpoint(horn));
  assert.equal(Store.validateCheckpoint({ ...horn, wave: 1 }), null);
});

test('hell checkpoints use three HP and retain the noncampaign three-phase limit', () => {
  const good = checkpoint(3, 'hell', 0);
  assert(Store.validateCheckpoint(good));
  const highHp = copy(good); highHp.player.hp = highHp.player.maxHp = 5;
  assert.equal(Store.validateCheckpoint(highHp), null);
  const sandbox = copy(good);
  delete sandbox.campaign; delete sandbox.campaignRevision; delete sandbox.bossIndex;
  sandbox.stats.phaseTicks = [1500, 1500, 1500];
  assert.deepEqual(Store.validateCheckpoint(sandbox), sandbox);
  sandbox.stats.phaseTicks.push(1500);
  assert.equal(Store.validateCheckpoint(sandbox), null);
});

test('changing to hell settings preserves existing revision-two checkpoint and backup verbatim', () => {
  const first = checkpoint(2, 'gentle', 4);
  let state = Store.reduce(undefined, { type: 'checkpoint', value: first }, 0).state;
  const next = { ...first, checkpointSerial: 2, tick: 60, score: 50 };
  state = Store.reduce(state, { type: 'checkpoint', value: next }, state.revision).state;
  const old = copy(state);
  const updated = Store.reduce(state, { type: 'settings', value: { difficulty: 'hell' } }, state.revision);
  assert.equal(updated.result.ok, true);
  assert.deepEqual(updated.state.checkpoint, old.checkpoint);
  assert.deepEqual(updated.state.backup, old.backup);
  assert.equal(Store.safeStoredRecord(updated.state), true);
  assert.equal(Store.normalizeState(updated.state).settings.difficulty, 'hell');
});

test('hell loss and stale-client rejection keep the full-route checkpoint and its previous backup', async () => {
  const store = Store.createStore({ location: { protocol: 'https:' } });
  await store.open();
  const first = checkpoint(3, 'hell', 10);
  first.checkpointSerial = 60; first.tick = 60000;
  first.stats.phaseTicks = Array(30).fill(1700);
  assert.equal((await store.saveCheckpoint(first)).ok, true);
  const next = copy(first); next.bossIndex = 11; next.checkpointSerial = 66; next.tick = 65000;
  next.stats.phaseTicks = Array(33).fill(1700);
  assert.equal((await store.saveCheckpoint(next)).ok, true);
  const before = JSON.parse(await store.exportData());
  assert.deepEqual(before.backup, first);
  const loss = await store.completeRun({ runId: first.runId, difficulty: 'hell', score: 0, graze: 0, kills: 0, won: false });
  assert.equal(loss.ok, true);
  const after = JSON.parse(await store.exportData());
  assert.deepEqual(after.checkpoint, { ...next, runId: loss.continuedRunId });
  assert.deepEqual(after.backup, { ...first, runId: loss.continuedRunId });
  assert.equal((await store.saveCheckpoint({ ...next, checkpointSerial: 67, tick: 66000 })).reason, 'completed');
  const durable = Store.normalizeState(after);
  const stale = Store.reduce(durable, { type: 'settings', value: { quality: 'low' } }, durable.revision - 1);
  assert.equal(stale.result.reason, 'conflict');
  assert.deepEqual(stale.state.checkpoint, after.checkpoint);
  assert.deepEqual(stale.state.backup, after.backup);
});
