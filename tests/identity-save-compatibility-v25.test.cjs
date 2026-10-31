'use strict';
// CPU + serialized IndexedDB emulation. This does not certify browser IDB,
// a physical device, or completion of the campaign by a human player.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const cp = require('node:child_process');
const path = require('node:path');
const core = require('../src/core.js');
const Store = require('../src/storage.js')._test;
const BASE = '945799615b35bb732ca5d6a0c48db8eebbd92a74';
const clone = value => structuredClone(value);

function boundary(id, revision = 25) {
  const options = { campaign: true, campaignRevision: 5, difficulty: 'hell', seed: 813, runId: id };
  if (revision !== undefined) options.combatRevision = revision;
  return core.checkpoint(core.createRun(options));
}
function legacyBoundary(id) {
  return core.checkpoint(core.createRun({ campaign: true, campaignRevision: 5, difficulty: 'normal', seed: 42, runId: id }));
}

// All transactions read and commit serially, as the one-store IDB writer does.
// A held transaction has already produced its pending put but has not committed.
function emulatedDB(initial) {
  let data = clone(initial), writes = 0, serial = Promise.resolve();
  let holdNext = null, failNext = false;
  const db = {
    close() {},
    transaction(name, mode) {
      let request, pending, aborted = false;
      const hold = mode === 'readwrite' ? holdNext : null;
      const fail = mode === 'readwrite' && failNext;
      if (mode === 'readwrite') { holdNext = null; failNext = false; }
      const tx = {
        abort() { aborted = true; },
        objectStore() {
          return {
            get() { request = {}; return request; },
            put(value) { pending = clone(value); }
          };
        }
      };
      serial = serial.then(async () => {
        request.result = clone(data);
        if (request.onsuccess) request.onsuccess();
        if (hold) { hold.started(); await hold.wait; }
        if (fail) aborted = true;
        if (aborted) { if (tx.onabort) tx.onabort(); return; }
        if (pending !== undefined) { data = clone(pending); writes += 1; }
        if (tx.oncomplete) tx.oncomplete();
      });
      return tx;
    }
  };
  return {
    env: {
      indexedDB: { open() { const request = { result: db }; queueMicrotask(() => request.onsuccess()); return request; } },
      location: { protocol: 'https:' }
    },
    snapshot: () => clone(data),
    writes: () => writes,
    failNextWrite() { failNext = true; },
    holdNextWrite() {
      let release, started;
      const wait = new Promise(resolve => { release = resolve; });
      const ready = new Promise(resolve => { started = resolve; });
      holdNext = { wait, started };
      return { ready, release };
    }
  };
}

test('identity25 phase boundaries retain the exact selector and ordinary-health deterministic restore', () => {
  const original = core.createRun({ campaign: true, campaignRevision: 5, practiceBoss: true, bossIndex: 9, difficulty: 'hell', seed: 813, runId: 'identity25-restore', combatRevision: 25 });
  const snapshot = core.checkpoint(original), clean = Store.validateCheckpoint(snapshot);
  assert.equal(snapshot.combatRevision, 25);
  assert.deepEqual(clean, snapshot);
  const restored = core.restoreCheckpoint(clean);
  assert.equal(restored.combatRevision, 25);
  assert.equal(restored.player.hp, 3);
  // The app consumes the fresh-run notification; restore intentionally starts
  // with no already-presented UI events. No simulation or health is altered.
  original.events.length = 0;
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(original)));
  let liveTicks = 0;
  for (let tick = 0; tick < 600; tick += 1) {
    if (original.stage !== 'lost' && original.stage !== 'won') liveTicks += 1;
    const input = { dx: tick % 140 < 70 ? 2 : -2, dy: tick % 200 < 100 ? -1 : 1, focus: tick % 180 < 90 };
    core.step(original, input); core.step(restored, input);
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(original)), 'restore diverged at legal input tick ' + tick);
  }
  assert(liveTicks >= 120, 'restore verification must exercise live combat, not only an inert terminal state');
});

test('legacy and21 boundaries remain exact; same-run selector replacement cannot overwrite primary or backup', async () => {
  for (const first of [legacyBoundary('identity25-old'), boundary('identity25-21', 21), boundary('identity25-new', 25)]) {
    assert.deepEqual(Store.validateCheckpoint(first), first);
    const store = Store.createStore({ location: { protocol: 'https:' } });
    assert((await store.open()).ok); assert((await store.saveCheckpoint(first)).ok);
    const before = await store.exportData();
    for (const revision of [undefined, 21, 25]) {
      if (revision === first.combatRevision) continue;
      const next = { ...first, checkpointSerial: 2, tick: 60 };
      if (revision === undefined) delete next.combatRevision; else next.combatRevision = revision;
      const outcome = await store.saveCheckpoint(next);
      assert.equal(outcome.reason, 'combat-revision-mismatch');
      assert.equal(await store.exportData(), before);
    }
  }
  const valid = boundary('identity25-invalid');
  for (const revision of [0, 20, 22, 24, 26, 25.5, '25', null, true, {}, [], undefined]) {
    assert.equal(Store.validateCheckpoint({ ...valid, combatRevision: revision }), null);
  }
});

test('an already-open deployed21 client rejects25 before settings, checkpoint, clear or completion writes', async () => {
  const oldBoundary = boundary('identity25-before-upgrade', 21);
  const initial = Store.reduce(undefined, { type: 'checkpoint', value: oldBoundary }, 0).state;
  const source = cp.execFileSync('git', ['show', BASE + ':src/storage.js'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
  const mock = emulatedDB(initial), box = { module: { exports: {} }, window: mock.env, queueMicrotask, setTimeout, clearTimeout };
  vm.runInNewContext(source, box, { filename: 'deployed-v24-combat21-storage.js' });
  const previous = box.module.exports._test.createStore(mock.env);
  assert((await previous.open()).ok); assert.equal((await previous.load()).checkpoint.combatRevision, 21);
  const current = Store.createStore(mock.env); assert((await current.open()).ok);
  const first = boundary('identity25-after-upgrade'); assert((await current.saveCheckpoint(first)).ok);
  const saved = mock.snapshot(), writes = mock.writes();
  assert.equal(saved.combatContract, 25); assert(Store.safeStoredRecord(saved));
  for (const action of [
    () => previous.saveSettings({ quality: 'low' }),
    () => previous.saveCheckpoint({ ...oldBoundary, checkpointSerial: 2, tick: 60 }),
    () => previous.clearCheckpoint(),
    () => previous.completeRun({ runId: oldBoundary.runId, difficulty: 'hell', score: 0, graze: 0, kills: 0, won: false })
  ]) {
    const outcome = await action(); assert.equal(outcome.reason, 'invalid-storage-state');
    assert.equal(mock.writes(), writes); assert.deepEqual(mock.snapshot(), saved);
  }
  assert.deepEqual(JSON.parse(await previous.exportData()).rawState, saved);
  const reopened = box.module.exports._test.createStore(mock.env);
  assert.equal((await reopened.open()).reason, 'invalid-storage-state');
  assert.deepEqual((await current.load()).checkpoint, first);
});

test('25 marker is required for25 backup/primary and never falls back through retry, settings, clear or an older new run', async () => {
  const first = boundary('identity25-marker');
  const record = Store.reduce(undefined, { type: 'checkpoint', value: first }, 0).state;
  for (const marker of [undefined, 21, 0, 24, 26, '25', null]) {
    const raw = clone(record);
    if (marker === undefined) delete raw.combatContract; else raw.combatContract = marker;
    assert.equal(Store.safeStoredRecord(raw), false);
    assert.equal(Store.reduce(raw, { type: 'settings', value: { quality: 'low' } }, raw.revision).changed, false);
  }
  for (const older of [21, undefined]) {
    for (const key of ['checkpoint', 'backup']) {
      const mixed = clone(record);
      if (older === undefined) delete mixed[key].combatRevision; else mixed[key].combatRevision = older;
      assert.equal(Store.safeStoredRecord(mixed), false, 'same-run mixed rules cannot be selected during recovery');
      assert.equal(Store.reduce(mixed, { type: 'settings', value: { quality: 'low' } }, mixed.revision).changed, false);
    }
  }
  const store = Store.createStore({ location: { protocol: 'https:' } });
  await store.open(); assert((await store.saveCheckpoint(first)).ok);
  assert((await store.saveSettings({ quality: 'low' })).ok);
  const lost = await store.completeRun({ runId: first.runId, difficulty: 'hell', score: 0, graze: 0, kills: 0, won: false });
  assert(lost.ok);
  const retried = JSON.parse(await store.exportData());
  assert.equal(retried.combatContract, 25);
  for (const key of ['checkpoint', 'backup']) {
    assert.equal(retried[key].combatRevision, 25); assert.equal(retried[key].runId, lost.continuedRunId);
  }
  assert((await store.clearCheckpoint()).ok);
  assert.equal(JSON.parse(await store.exportData()).combatContract, 25);
  for (const older of [boundary('identity25-later21', 21), legacyBoundary('identity25-later-absent')]) {
    assert((await store.saveCheckpoint(older)).ok);
    const data = JSON.parse(await store.exportData());
    assert.equal(data.combatContract, 25); assert.deepEqual(data.checkpoint, older); assert.deepEqual(data.backup, older);
  }
});

test('serialized25 writes preserve pending boundaries, backups and stale-tab rejection until explicit load', async () => {
  const mock = emulatedDB(undefined), a = Store.createStore(mock.env), b = Store.createStore(mock.env);
  assert((await a.open()).ok); assert((await b.open()).ok);
  const first = boundary('identity25-pending'); assert((await a.saveCheckpoint(first)).ok);
  const next = { ...first, checkpointSerial: 2, tick: 60, score: 20 };
  const gate = mock.holdNextWrite(), write = a.saveCheckpoint(next);
  await gate.ready;
  assert.deepEqual(mock.snapshot().checkpoint, first, 'pending puts are not durable');
  const settings = a.saveSettings({ quality: 'low' });
  gate.release(); assert((await write).ok); assert((await settings).ok);
  const saved = mock.snapshot(); assert.deepEqual(saved.checkpoint, next); assert.deepEqual(saved.backup, first);
  assert.equal(saved.combatContract, 25);
  assert.equal((await b.saveCheckpoint(boundary('identity25-stale-tab'))).reason, 'conflict');
  assert.deepEqual((await b.peek()).checkpoint, next);
  assert.equal((await b.saveSettings({ quality: 'high' })).reason, 'conflict');
  assert.deepEqual(mock.snapshot(), saved);
  assert.deepEqual((await b.load()).checkpoint, next);
  assert((await b.saveSettings({ quality: 'high' })).ok);
  assert.deepEqual(mock.snapshot().backup, first);
});

test('failed25 durable writes preserve bytes and prohibit later memory commits; valid25 backup recovers damaged primary', async () => {
  const first = boundary('identity25-recovery'), initial = Store.reduce(undefined, { type: 'checkpoint', value: first }, 0).state;
  const mock = emulatedDB(initial), store = Store.createStore(mock.env); assert((await store.open()).ok);
  mock.failNextWrite();
  const next = { ...first, checkpointSerial: 2, tick: 60 };
  assert.equal((await store.saveCheckpoint(next)).reason, 'storage-error');
  assert.equal((await store.saveSettings({ quality: 'low' })).reason, 'storage-error');
  assert.equal(mock.writes(), 0); assert.deepEqual(mock.snapshot(), initial);
  const damaged = clone(initial); damaged.checkpoint = { broken: true };
  const backupMock = emulatedDB(damaged), recovery = Store.createStore(backupMock.env);
  assert((await recovery.open()).ok); assert.deepEqual((await recovery.load()).checkpoint, first);
  assert.equal(core.restoreCheckpoint((await recovery.load()).checkpoint).combatRevision, 25);
  assert.equal(backupMock.writes(), 0); assert.deepEqual(backupMock.snapshot(), damaged);
  const badBackup = clone(initial); badBackup.backup.combatRevision = 26;
  const corruptMock = emulatedDB(badBackup), blocked = Store.createStore(corruptMock.env);
  assert.equal((await blocked.open()).reason, 'invalid-storage-state');
  assert.equal((await blocked.saveSettings({ quality: 'low' })).reason, 'invalid-storage-state');
  assert.equal(corruptMock.writes(), 0); assert.deepEqual(JSON.parse(await blocked.exportData()).rawState, badBackup);
});

test('identity25 practice cannot alter campaign checkpoints, backups or completion ledger', async () => {
  for (const first of [legacyBoundary('identity25-practice-old'), boundary('identity25-practice21', 21), boundary('identity25-practice25')]) {
    const store = Store.createStore({ location: { protocol: 'https:' } }); await store.open(); assert((await store.saveCheckpoint(first)).ok);
    const before = await store.exportData();
    const practice = core.checkpoint(core.createRun({ campaign: true, campaignRevision: 5, practiceBoss: true, bossIndex: 34, difficulty: 'hell', seed: 813, runId: 'identity25-practice-only', combatRevision: 25 }));
    assert.equal((await store.saveCheckpoint(practice)).reason, 'practice-checkpoint');
    assert.equal((await store.completeRun({ runId: practice.runId, difficulty: 'hell', score: 0, graze: 0, kills: 0, won: false, practiceBoss: true })).reason, 'practice-result');
    assert.equal(await store.exportData(), before);
  }
});
