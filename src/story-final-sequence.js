/* Canonical final-scene sequence, independent from art, combat and save gates.
 * This accepts narrative events only. A complete journal is NOT combat proof;
 * integration must independently verify mechanics and asset readiness. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStoryFinalSequence = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var SCHEMA = 1, SCENE = 'cult04';
  var stages = [
    ['leaderBodyDefeated', 'mortallyWounded'], ['blackNeuralRevival'],
    ['realityMemoryRecalled'], ['tripletTruthRevealed'], ['samongAwakened'],
    ['bodyAndSwordReformed'], ['battlefieldRestored'], ['consentingDualWills'],
    ['leaderAuthoritySevered'], ['leaderDissolvedInDreamWorld'], ['corePreserved'],
    ['commandsRemoved', 'coerciveCircuitRemoved'], ['ownSamongLinkedToCore'],
    ['distinctWorldsPreserved'], ['guardianRemains']
  ];
  var forbidden = ['ordinaryDeath', 'postDeathSamong', 'newRevivalBoss',
    'firstChildErased', 'bErased', 'destroyCore', 'coreDestroyed',
    'eraseMemories', 'mergeAllIdentities', 'forceSameWill', 'returnToReality'];
  function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function keysEqual(obj, keys) { return Object.keys(obj).sort().join('|') === keys.slice().sort().join('|'); }
  function normalize(e) {
    if (!object(e) || typeof e.type !== 'string') return null;
    if (e.type === 'blackNeuralRevival') {
      if (!keysEqual(e, ['type', 'identity', 'method']) || e.identity !== 'sameLeader' || e.method !== 'blackNeuralCords') return null;
      return { type: e.type, identity: 'sameLeader', method: 'blackNeuralCords' };
    }
    if (e.type === 'samongAwakened') {
      if (!keysEqual(e, ['type', 'alive']) || e.alive !== true) return null;
      return { type: e.type, alive: true };
    }
    // This records the two named consenting wills, not an upper bound on all wills.
    if (e.type === 'consentingDualWills') {
      if (!keysEqual(e, ['type', 'confirmedParticipants', 'voluntary']) || e.voluntary !== true || !Array.isArray(e.confirmedParticipants) || e.confirmedParticipants.length !== 2 || new Set(e.confirmedParticipants).size !== 2 || !e.confirmedParticipants.includes('B') || !e.confirmedParticipants.includes('firstChild')) return null;
      return { type: e.type, confirmedParticipants: ['B', 'firstChild'], voluntary: true };
    }
    if (!keysEqual(e, ['type'])) return null;
    return { type: e.type };
  }
  function replay(raw) {
    if (!object(raw) || !keysEqual(raw, ['schemaVersion', 'sceneId', 'events']) || raw.schemaVersion !== SCHEMA || raw.sceneId !== SCENE || !Array.isArray(raw.events) || raw.events.length > 32) return null;
    var stage = 0, seen = Object.create(null), events = [];
    for (var i = 0; i < raw.events.length; i++) {
      var event = normalize(raw.events[i]);
      if (!event || stage >= stages.length || stages[stage].indexOf(event.type) < 0 || seen[event.type]) return null;
      seen[event.type] = true; events.push(event);
      if (stages[stage].every(function (type) { return !!seen[type]; })) stage++;
    }
    return { stage: stage, seen: seen, state: { schemaVersion: SCHEMA, sceneId: SCENE, events: events } };
  }
  function create() { return { schemaVersion: SCHEMA, sceneId: SCENE, events: [] }; }
  function step(raw, input) {
    var r = replay(raw);
    if (!r) return { ok: false, reason: 'invalid-state', state: null };
    function reject(reason) { return { ok: false, reason: reason, state: r.state }; }
    if (!object(input) || typeof input.type !== 'string') return reject('invalid-event');
    if (forbidden.indexOf(input.type) >= 0) return reject('canon-forbidden-action');
    var e = normalize(input);
    if (!e) return reject('invalid-event');
    var known = stages.some(function (stage) { return stage.indexOf(e.type) >= 0; });
    if (!known) return reject('unsupported-event');
    if (r.seen[e.type]) return { ok: true, reason: 'duplicate', state: r.state };
    if (r.stage >= stages.length || stages[r.stage].indexOf(e.type) < 0) return reject('prerequisite-not-met');
    r.state.events.push(copy(e));
    return { ok: true, reason: null, state: r.state };
  }
  function evaluate(raw) {
    var r = replay(raw);
    if (!r) return { valid: false, complete: false, combatVerified: false, resolution: null, next: [] };
    var complete = r.stage === stages.length;
    return { valid: true, complete: complete, combatVerified: false,
      resolution: complete ? 'narrative-sequence-acknowledged' : null,
      next: complete ? [] : stages[r.stage].filter(function (type) { return !r.seen[type]; }),
      sourceRange: [875, 919], acceptedEvents: copy(r.state.events) };
  }
  return Object.freeze({ SCHEMA_VERSION: SCHEMA, create: create, step: step, evaluate: evaluate });
}));
