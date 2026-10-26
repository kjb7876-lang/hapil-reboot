/* Canonical scene objectives. Pure event evidence; never a combat/art unlock authority. */
(function (root, factory) {
  'use strict';
  var data = typeof module === 'object' && module.exports ? require('./story-data.js') : root.HapilStoryData;
  var api = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStoryObjectives = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (data) {
  'use strict';
  var VERSION = 1, END_LINE = 919, contracts = Object.create(null), scenes = Object.create(null);
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function event(type, key, value) { var e = { type: type }; if (key) e[key] = value; return e; }
  function all() { return Array.prototype.slice.call(arguments); }
  function one(type, key, value) { return [event(type, key, value)]; }
  function series(type, key, values) { return values.map(function (v) { return one(type, key, v); }); }
  function define(id, resolution, stages, forbidden) {
    if (!scenes[id]) throw new Error('Objective outside canonical storymode: ' + id);
    contracts[id] = { sceneId: id, sourceRange: scenes[id].sourceRange.slice(), resolution: resolution, stages: stages, forbidden: forbidden || [] };
  }
  if (!data || !Array.isArray(data.scenes)) throw new Error('Canonical story data required');
  data.scenes.forEach(function (s) {
    if (!s || typeof s.id !== 'string' || scenes[s.id] || !Array.isArray(s.sourceRange) || s.sourceRange[1] > END_LINE || s.sourceRange[0] < 1 || s.sourceRange[0] > s.sourceRange[1]) throw new Error('Invalid storymode boundary');
    scenes[s.id] = s;
  });
  Object.keys(scenes).forEach(function (id) { define(id, 'narrative', [one('narrativeAcknowledged')]); });
  define('last301', 'survive-and-fall', [one('sixFormsSeen'), one('scriptedPierce'), one('fall')], ['ordinaryDeath', 'death', 'bossKilled', 'victory']);
  define('kair01', 'defended', series('waveDefended', 'wave', [1, 2, 3, 4, 5, 6]), ['destroyCore', 'coreDestroyed', 'firstCommandCorrupted']);
  // Ring numbers identify six distinct cuts; prose does not impose an order.
  define('kair10', 'cleared', [[1, 2, 3, 4, 5, 6].map(function (ring) { return event('commandRingCut', 'ring', ring); })], ['destroyCore']);
  define('kair02', 'liberated', [one('cutCorruptionThread'), one('arveliaSelfRewrite'), one('ally')], ['attackBody', 'killed', 'arveliaKilled']);
  define('kair03', 'cleared', [one('phaseCompleted', 'phase', 1), one('arveliaSupport'), one('phaseCompleted', 'phase', 2), one('phaseCompleted', 'phase', 3)], ['arveliaKilled']);
  define('hando02', 'defended', [all(event('ownerSealOpened', 'owner', 'second'), event('ownerSealOpened', 'owner', 'third'))], ['proxySealOpened']);
  define('hando03', 'cleared', [one('jointChoice'), one('coreBindingsCut'), one('coreRecovered'), one('laurenAlliance')], ['destroyCore', 'ownersErased', 'forcedAlliance']);
  define('murder01', 'investigated', [one('viewpointEntered', 'person', 'YunHaram'), one('clueFound', 'clue', 'softenedSafetyReport'), one('clueFound', 'clue', 'greenLightCollision'), one('clueFound', 'clue', 'lowElectronicTone')], ['victimKilled', 'eraseRecords']);
  define('murder02', 'investigated', [one('viewpointEntered', 'person', 'JangMinjae'), one('clueFound', 'clue', 'fallAbsentFromCCTV'), one('clueFound', 'clue', 'haramDiedTwoDaysLater'), one('clueFound', 'clue', 'saebitReportAndAnonymousMail'), one('clueFound', 'clue', 'hotelFireAndDeletedEntryLog'), one('clueFound', 'clue', 'minjaeStairFall')], ['victimKilled', 'eraseRecords', 'shadowDeclaredHallucination']);
  define('murder04', 'investigated', [
    one('viewpointEntered', 'person', 'GoSeojin'), one('clueFound', 'clue', 'faultyAlarmAndFireDoor'), one('clueFound', 'clue', 'occupiedFloorRecordedVacant'), one('clueFound', 'clue', 'seojinPushedAtVilla'),
    one('viewpointEntered', 'person', 'HanIkyung'), one('clueFound', 'clue', 'woosolOriginalReport'),
    all(event('responsibilityRecorded', 'person', 'YunHaram'), event('responsibilityRecorded', 'person', 'JangMinjae'), event('responsibilityRecorded', 'person', 'GoSeojin'), event('responsibilityRecorded', 'person', 'HanIkyung')),
    one('clueFound', 'clue', 'ikyungSentAnonymousMail')
  ], ['victimKilled', 'eraseRecords', 'singleCulpritSelected']);
  define('murder03', 'command-severed', [one('fourMemoriesReviewed'), one('singleCulpritRejected'), one('recordsPreserved')].concat(series('causalAnchorBroken', 'anchor', [1, 2, 3]), [one('shadowRevealed', 'identity', 'HanIkyung'), one('causalLoopReleased')]), ['victimKilled', 'eraseRecords', 'singleCulpritSelected', 'shadowDeclaredHallucination']);
  var endingStages = [one('corePreserved'), all(event('commandsRemoved'), event('coerciveCircuitRemoved')), one('distinctWorldsPreserved'), one('guardianRemains')];
  var endingForbidden = ['destroyCore', 'coreDestroyed', 'eraseMemories', 'mergeAllIdentities', 'forceSameWill', 'returnToReality'];
  define('cult04', 'authority-severed', [
    one('leaderBodyDefeated'), one('mortallyWounded'), one('blackNeuralRevival'),
    one('realityMemoryRecalled'), one('tripletTruthRevealed'), one('samongAwakened'),
    one('bodyAndSwordReformed'), one('consentingDualWills'), one('leaderAuthoritySevered')
  ].concat(endingStages), endingForbidden.concat(['ordinaryDeath', 'postDeathSamong', 'firstChildErased', 'bErased', 'newRevivalBoss']));
  define('ending', 'ending-preserved', endingStages, endingForbidden);

  function signature(e) {
    if (!object(e) || typeof e.type !== 'string') return null;
    var keys = Object.keys(e).sort();
    if (keys.length > 2 || keys.indexOf('type') < 0 || keys.some(function (k) { return typeof e[k] !== 'string' && !(typeof e[k] === 'number' && Number.isSafeInteger(e[k])); })) return null;
    return JSON.stringify(keys.map(function (k) { return [k, e[k]]; }));
  }
  function layout(contract) {
    var map = Object.create(null);
    contract.stages.forEach(function (stage, index) { stage.forEach(function (e) { map[signature(e)] = { stage: index, event: e }; }); });
    return map;
  }
  function replay(raw) {
    if (!object(raw) || raw.schemaVersion !== VERSION || typeof raw.sceneId !== 'string' || !contracts[raw.sceneId] || !Array.isArray(raw.events) || raw.events.length > 128 || Object.keys(raw).sort().join('|') !== 'events|sceneId|schemaVersion') return null;
    var contract = contracts[raw.sceneId], map = layout(contract), seen = Object.create(null), stage = 0, journal = [];
    for (var i = 0; i < raw.events.length; i++) {
      var key = signature(raw.events[i]), entry = key && map[key];
      if (!entry || seen[key] || entry.stage !== stage) return null;
      seen[key] = true; journal.push(copy(entry.event));
      if (contract.stages[stage].every(function (e) { return seen[signature(e)]; })) stage++;
    }
    return { state: { schemaVersion: VERSION, sceneId: raw.sceneId, events: journal }, contract: contract, map: map, seen: seen, stage: stage };
  }
  function create(sceneId) {
    if (typeof sceneId !== 'string' || !contracts[sceneId]) throw new RangeError('Unknown canonical storymode scene: ' + String(sceneId));
    return { schemaVersion: VERSION, sceneId: sceneId, events: [] };
  }
  function step(raw, e) {
    var r = replay(raw);
    if (!r) return { ok: false, state: null, reason: 'invalid-state' };
    function reject(reason) { return { ok: false, state: r.state, reason: reason }; }
    var key = signature(e);
    if (!key) return reject('invalid-event');
    if (r.contract.forbidden.indexOf(e.type) >= 0) return reject('canon-forbidden-action');
    var entry = r.map[key];
    if (!entry) return reject('unsupported-event');
    if (r.seen[key]) return { ok: true, state: r.state, reason: 'duplicate' };
    if (entry.stage !== r.stage) return reject('prerequisite-not-met');
    r.state.events.push(copy(entry.event));
    return { ok: true, state: r.state, reason: null };
  }
  function evaluate(raw) {
    var r = replay(raw);
    if (!r) return { complete: false, resolution: null, evidence: { validState: false, combatVerified: false } };
    var complete = r.stage === r.contract.stages.length;
    var evidence = { validState: true, sceneId: raw.sceneId, canonicalRange: r.contract.sourceRange.slice(), sourceBoundaryEnd: END_LINE, combatVerified: false, acceptedEvents: copy(r.state.events) };
    r.state.events.forEach(function (e) { if (Object.keys(e).length === 1) evidence[e.type] = true; });
    evidence.defendedWaves = r.state.events.filter(function (e) { return e.type === 'waveDefended'; }).map(function (e) { return e.wave; });
    evidence.commandRingsCut = r.state.events.filter(function (e) { return e.type === 'commandRingCut'; }).map(function (e) { return e.ring; });
    evidence.completedPhases = r.state.events.filter(function (e) { return e.type === 'phaseCompleted'; }).map(function (e) { return e.phase; });
    evidence.ownerSeals = r.state.events.filter(function (e) { return e.type === 'ownerSealOpened'; }).map(function (e) { return e.owner; });
    evidence.causalAnchorsBroken = r.state.events.filter(function (e) { return e.type === 'causalAnchorBroken'; }).map(function (e) { return e.anchor; });
    var shadow = r.state.events.find(function (e) { return e.type === 'shadowRevealed'; });
    if (shadow) evidence.fallingShadowIdentity = shadow.identity;
    return { complete: complete, resolution: complete ? r.contract.resolution : null, evidence: evidence };
  }
  function describe(sceneId) {
    if (sceneId === undefined) return Object.keys(contracts).map(function (id) { return copy(contracts[id]); });
    if (!contracts[sceneId]) throw new RangeError('Unknown canonical storymode scene');
    return copy(contracts[sceneId]);
  }
  return Object.freeze({ SCHEMA_VERSION: VERSION, create: create, step: step, evaluate: evaluate, describe: describe });
}));
