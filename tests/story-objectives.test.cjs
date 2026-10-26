'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Objectives = require('../src/story-objectives.js');
const Data = require('../src/story-data.js');
const e = (type, payload = {}) => ({ type, ...payload });
const waves = Array.from({ length: 6 }, (_, i) => e('waveDefended', { wave: i + 1 }));
const ending = ['corePreserved', 'commandsRemoved', 'coerciveCircuitRemoved', 'distinctWorldsPreserved', 'guardianRemains'].map(type => e(type));
const finalBattle = ['leaderBodyDefeated', 'mortallyWounded', 'blackNeuralRevival', 'realityMemoryRecalled', 'tripletTruthRevealed', 'samongAwakened', 'bodyAndSwordReformed', 'consentingDualWills', 'leaderAuthoritySevered'].map(type => e(type));
function advance(id, events) {
  let state = Objectives.create(id);
  for (const event of events) {
    const before = JSON.stringify(state);
    const result = Objectives.step(state, event);
    assert.equal(result.ok, true, `${id}/${event.type}: ${result.reason}`);
    assert.equal(JSON.stringify(state), before, 'step does not mutate its input');
    state = result.state;
  }
  return state;
}
function reject(state, event, reason) {
  const before = JSON.stringify(state);
  const result = Objectives.step(state, event);
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(result.state, state);
}
test('canonical boundary includes all 63 scenes and rejects post-ending expansion identities', () => {
  assert.equal(Objectives.describe().length, Data.scenes.length);
  for (const scene of Data.scenes) {
    const state = Objectives.create(scene.id);
    assert.equal(Objectives.evaluate(state).complete, false);
    assert.deepEqual(Objectives.describe(scene.id).sourceRange, scene.sourceRange);
    assert.ok(scene.sourceRange[1] <= 919);
  }
  for (const id of ['S-01', 'NS-01', 'R-01', 'NR-01', 'Persona', 'Michaela', '__proto__', '', null]) assert.throws(() => Objectives.create(id), /canonical storymode/);
});
test('ordinary narrative acknowledgment does not claim a verified combat or invent requirements', () => {
  for (const id of ['prologue', 'last304', 'last305', 'restKairo', 'cult05', 'cult06']) {
    const s = advance(id, [e('narrativeAcknowledged')]);
    const result = Objectives.evaluate(s);
    assert.equal(result.complete, true);
    assert.equal(result.resolution, 'narrative');
    assert.equal(result.evidence.combatVerified, false);
  }
});
test('fallen knight requires six forms, scripted piercing and fall; ordinary death is not resolution', () => {
  const start = Objectives.create('last301');
  for (const type of ['fall', 'scriptedPierce']) reject(start, e(type), 'prerequisite-not-met');
  for (const type of ['death', 'ordinaryDeath', 'bossKilled', 'victory']) reject(start, e(type), 'canon-forbidden-action');
  const beforeFall = advance('last301', [e('sixFormsSeen'), e('scriptedPierce')]);
  assert.equal(Objectives.evaluate(beforeFall).complete, false);
  const s = Objectives.step(beforeFall, e('fall')).state;
  assert.equal(Objectives.evaluate(s).resolution, 'survive-and-fall');
});
test('school core defense requires six sequential distinct waves and preserves the core', () => {
  let s = Objectives.create('kair01');
  reject(s, waves[1], 'prerequisite-not-met');
  reject(s, e('destroyCore'), 'canon-forbidden-action');
  s = advance('kair01', waves.slice(0, 5));
  assert.equal(Objectives.evaluate(s).complete, false);
  const duplicate = Objectives.step(s, waves[0]);
  assert.equal(duplicate.reason, 'duplicate');
  assert.deepEqual(duplicate.state, s);
  reject(s, e('waveDefended', { wave: 7 }), 'unsupported-event');
  s = Objectives.step(s, waves[5]).state;
  assert.equal(Objectives.evaluate(s).resolution, 'defended');
  assert.deepEqual(Objectives.evaluate(s).evidence.defendedWaves, [1, 2, 3, 4, 5, 6]);
});
test('ritual hall needs all six rings without inventing a numeric cut order', () => {
  const cuts = [6, 2, 4, 1, 3, 5].map(ring => e('commandRingCut', { ring }));
  let s = advance('kair10', cuts.slice(0, 5));
  assert.equal(Objectives.evaluate(s).complete, false);
  const duplicate = Objectives.step(s, cuts[0]);
  assert.deepEqual(duplicate.state, s);
  s = Objectives.step(s, cuts[5]).state;
  assert.equal(Objectives.evaluate(s).complete, true);
});
test('Arvelia is freed through command cutting, self rewrite and alliance', () => {
  const start = Objectives.create('kair02');
  for (const type of ['attackBody', 'killed', 'arveliaKilled']) reject(start, e(type), 'canon-forbidden-action');
  reject(start, e('ally'), 'prerequisite-not-met');
  const s = advance('kair02', ['cutCorruptionThread', 'arveliaSelfRewrite', 'ally'].map(type => e(type)));
  assert.equal(Objectives.evaluate(s).resolution, 'liberated');
  reject(s, e('attackBody'), 'canon-forbidden-action');
});
test('Siren phase two cannot be passed without Arvelia assistance', () => {
  let s = advance('kair03', [e('phaseCompleted', { phase: 1 })]);
  reject(s, e('phaseCompleted', { phase: 2 }), 'prerequisite-not-met');
  reject(s, e('phaseCompleted', { phase: 3 }), 'prerequisite-not-met');
  s = Objectives.step(s, e('arveliaSupport')).state;
  s = Objectives.step(s, e('phaseCompleted', { phase: 2 })).state;
  assert.equal(Objectives.evaluate(s).complete, false);
  s = Objectives.step(s, e('phaseCompleted', { phase: 3 })).state;
  assert.deepEqual(Objectives.evaluate(s).evidence.completedPhases, [1, 2, 3]);
});
test('both castle owners open their own seals; repeated or proxy action cannot replace either', () => {
  let s = advance('hando02', [e('ownerSealOpened', { owner: 'third' })]);
  assert.equal(Objectives.evaluate(s).complete, false);
  assert.equal(Objectives.step(s, e('ownerSealOpened', { owner: 'third' })).reason, 'duplicate');
  reject(s, e('proxySealOpened'), 'canon-forbidden-action');
  reject(s, e('ownerSealOpened', { owner: 'hando' }), 'unsupported-event');
  s = Objectives.step(s, e('ownerSealOpened', { owner: 'second' })).state;
  assert.equal(Objectives.evaluate(s).resolution, 'defended');
});
test('shared core recovery and Lauren alliance follow joint choice and release of bindings', () => {
  const start = Objectives.create('hando03');
  reject(start, e('coreRecovered'), 'prerequisite-not-met');
  reject(start, e('forcedAlliance'), 'canon-forbidden-action');
  let s = advance('hando03', ['jointChoice', 'coreBindingsCut', 'coreRecovered'].map(type => e(type)));
  assert.equal(Objectives.evaluate(s).complete, false);
  s = Objectives.step(s, e('laurenAlliance')).state;
  assert.equal(Objectives.evaluate(s).resolution, 'cleared');
});
test('investigation preserves viewpoint and clue order and does not turn the four people into bosses', () => {
  const paths = {
    murder01: [e('viewpointEntered', { person: 'YunHaram' }), ...['softenedSafetyReport', 'greenLightCollision', 'lowElectronicTone'].map(clue => e('clueFound', { clue }))],
    murder02: [e('viewpointEntered', { person: 'JangMinjae' }), ...['fallAbsentFromCCTV', 'haramDiedTwoDaysLater', 'saebitReportAndAnonymousMail', 'hotelFireAndDeletedEntryLog', 'minjaeStairFall'].map(clue => e('clueFound', { clue }))],
    murder04: [e('viewpointEntered', { person: 'GoSeojin' }), e('clueFound', { clue: 'faultyAlarmAndFireDoor' }), e('clueFound', { clue: 'occupiedFloorRecordedVacant' }), e('clueFound', { clue: 'seojinPushedAtVilla' }), e('viewpointEntered', { person: 'HanIkyung' }), e('clueFound', { clue: 'woosolOriginalReport' }), ...['HanIkyung', 'YunHaram', 'GoSeojin', 'JangMinjae'].map(person => e('responsibilityRecorded', { person })), e('clueFound', { clue: 'ikyungSentAnonymousMail' })]
  };
  for (const [id, path] of Object.entries(paths)) {
    reject(Objectives.create(id), path[1], 'prerequisite-not-met');
    reject(Objectives.create(id), e('victimKilled'), 'canon-forbidden-action');
    const s = advance(id, path);
    assert.equal(Objectives.evaluate(s).resolution, 'investigated');
  }
});
test('causal loop requires three distinct anchors before the final Ikyung shadow reveal', () => {
  const start = Objectives.create('murder03');
  reject(start, e('shadowRevealed', { identity: 'HanIkyung' }), 'prerequisite-not-met');
  reject(start, e('eraseRecords'), 'canon-forbidden-action');
  reject(start, e('singleCulpritSelected'), 'canon-forbidden-action');
  let s = advance('murder03', ['fourMemoriesReviewed', 'singleCulpritRejected', 'recordsPreserved'].map(type => e(type)).concat([1, 2, 3].map(anchor => e('causalAnchorBroken', { anchor }))));
  assert.equal(Objectives.evaluate(s).complete, false);
  reject(s, e('shadowRevealed', { identity: 'hallucination' }), 'unsupported-event');
  s = Objectives.step(s, e('shadowRevealed', { identity: 'HanIkyung' })).state;
  s = Objectives.step(s, e('causalLoopReleased')).state;
  assert.equal(Objectives.evaluate(s).resolution, 'command-severed');
  assert.equal(Objectives.evaluate(s).evidence.fallingShadowIdentity, 'HanIkyung');
});
test('final encounter requires injury before neural revival and memory before living Samong awakening', () => {
  const start = Objectives.create('cult04');
  for (const type of ['blackNeuralRevival', 'samongAwakened', 'consentingDualWills', 'leaderAuthoritySevered', 'guardianRemains']) reject(start, e(type), 'prerequisite-not-met');
  let s = advance('cult04', finalBattle.slice(0, 1));
  reject(s, e('blackNeuralRevival'), 'prerequisite-not-met');
  s = advance('cult04', finalBattle.slice(0, 4));
  reject(s, e('samongAwakened'), 'prerequisite-not-met');
  for (const type of ['ordinaryDeath', 'postDeathSamong', 'firstChildErased', 'bErased', 'newRevivalBoss']) reject(s, e(type), 'canon-forbidden-action');
});
test('authority cut alone is incomplete until core preservation and all five ending evidence fields', () => {
  let s = advance('cult04', finalBattle);
  assert.equal(Objectives.evaluate(s).complete, false);
  for (const type of ['destroyCore', 'coreDestroyed', 'eraseMemories', 'mergeAllIdentities', 'returnToReality']) reject(s, e(type), 'canon-forbidden-action');
  for (const event of ending) s = Objectives.step(s, event).state;
  const result = Objectives.evaluate(s);
  assert.equal(result.complete, true);
  assert.equal(result.resolution, 'authority-severed');
  for (const key of ['corePreserved', 'commandsRemoved', 'coerciveCircuitRemoved', 'distinctWorldsPreserved', 'guardianRemains']) assert.equal(result.evidence[key], true);
  assert.equal(result.evidence.combatVerified, false);
  assert.equal(Objectives.step(s, finalBattle[0]).reason, 'duplicate');
  assert.equal(Objectives.describe().filter(c => c.sceneId === 'cult04').length, 1, 'revival belongs to one encounter');
});
test('standalone ending contract also preserves worlds and a remaining guardian', () => {
  const s = advance('ending', ending);
  assert.equal(Objectives.evaluate(s).resolution, 'ending-preserved');
  reject(s, e('forceSameWill'), 'canon-forbidden-action');
});
test('journal replay rejects forged order, duplicate entries, extra fields and unsupported events', () => {
  const forged = [
    { schemaVersion: 1, sceneId: 'last301', events: [e('fall')] },
    { schemaVersion: 1, sceneId: 'kair01', events: [waves[0], waves[0]] },
    { schemaVersion: 1, sceneId: 'S-01', events: [] },
    { schemaVersion: 1, sceneId: 'ending', events: [e('destroyCore')] },
    { ...Objectives.create('last301'), complete: true }
  ];
  for (const state of forged) {
    assert.equal(Objectives.evaluate(state).complete, false);
    assert.equal(Objectives.evaluate(state).evidence.validState, false);
    assert.equal(Objectives.step(state, e('sixFormsSeen')).reason, 'invalid-state');
  }
  const start = Objectives.create('kair01');
  reject(start, { type: 'waveDefended', wave: 1, bypass: true }, 'invalid-event');
  reject(start, e('waveDefended', { wave: '1' }), 'unsupported-event');
  reject(start, e('narrativeAcknowledged'), 'unsupported-event');
});
test('accepted events and contract descriptions are defensively copied and round-trip as JSON', () => {
  const event = e('waveDefended', { wave: 1 });
  const s = Objectives.step(Objectives.create('kair01'), event).state;
  event.wave = 6;
  const saved = JSON.parse(JSON.stringify(s));
  assert.deepEqual(Objectives.evaluate(saved), Objectives.evaluate(s));
  const result = Objectives.evaluate(s);
  result.evidence.acceptedEvents[0].wave = 6;
  assert.equal(s.events[0].wave, 1);
  const contract = Objectives.describe('kair02');
  contract.stages[0][0].type = 'attackBody';
  assert.equal(Objectives.describe('kair02').stages[0][0].type, 'cutCorruptionThread');
});
