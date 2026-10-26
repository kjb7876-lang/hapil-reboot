/* Story progression is independent of the retained v8 combat simulation. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStoryState = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function runId(value) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(value); }
  function unique(values) { return Array.isArray(values) && new Set(values).size === values.length; }
  function create(data, options) {
    options = options || {};
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.scenes) || !data.scenes.length || !Array.isArray(data.encounters)) throw new TypeError('Invalid story data');
    var scenes = data.scenes, ids = scenes.map(function (s) { return s.id; }), encounters = Object.create(null);
    data.encounters.forEach(function (e) { if (!e || typeof e.id !== 'string' || encounters[e.id]) throw new TypeError('Duplicate encounter'); encounters[e.id] = e; });
    var primary = data.primaryCombatIds || data.encounters.filter(function (e) { return !e.conditional; }).map(function (e) { return e.id; });
    if (!unique(ids) || !unique(primary) || primary.some(function (id) { return !encounters[id] || encounters[id].conditional; })) throw new TypeError('Invalid story identities');
    var groups = scenes.map(function (scene) {
      var required = scene.requiredCombatIds || [], result = scene.combatOrderGroups || required.map(function (id) { return [id]; });
      var flat = [].concat.apply([], result);
      if (!unique(required) || !unique(flat) || result.some(function (g) { return !Array.isArray(g) || !g.length; }) || flat.length !== required.length || required.some(function (id) { return flat.indexOf(id) < 0 || primary.indexOf(id) < 0 || encounters[id].sceneId !== scene.id; })) throw new TypeError('Invalid combat order');
      return result;
    });
    var allRequired = [].concat.apply([], scenes.map(function (s) { return s.requiredCombatIds || []; }));
    if (!unique(allRequired) || allRequired.length !== primary.length || primary.some(function (id) { return allRequired.indexOf(id) < 0; })) throw new TypeError('Incomplete primary roster');
    function newState() { return { schemaVersion: 1, contentRevision: data.contentRevision, revision: 0, viewSceneId: ids[0], acknowledgedSceneIds: [], clearedCombatIds: [], clearedRuns: [], activeCombat: null, portalOpen: false, endingSeen: false }; }
    function sceneComplete(state, index) { return state.acknowledgedSceneIds.indexOf(ids[index]) >= 0 && (scenes[index].requiredCombatIds || []).every(function (id) { return state.clearedCombatIds.indexOf(id) >= 0; }); }
    function deriveFrontier(state) {
      for (var i = 0; i < scenes.length; i++) {
        if (sceneComplete(state, i)) continue;
        for (var g = 0; g < groups[i].length; g++) {
          var pending = groups[i][g].filter(function (id) { return state.clearedCombatIds.indexOf(id) < 0; });
          if (pending.length) return { sceneId: ids[i], sceneIndex: i, groupIndex: g, combatIds: pending, acknowledged: state.acknowledgedSceneIds.indexOf(ids[i]) >= 0, complete: false };
        }
        return { sceneId: ids[i], sceneIndex: i, groupIndex: null, combatIds: [], acknowledged: false, complete: false };
      }
      return { sceneId: ids[ids.length - 1], sceneIndex: ids.length - 1, groupIndex: null, combatIds: [], acknowledged: true, complete: true };
    }
    function availableCombats(state) { var f = deriveFrontier(state); return f.acknowledged ? f.combatIds.slice() : []; }
    function canSeeEnding(state) { return primary.every(function (id) { return state.clearedCombatIds.indexOf(id) >= 0; }); }
    function expectedResolution(value) { return typeof value === 'string' && value.trim().length > 0 && value.length <= 96 && value === value.trim() ? value : null; }
    function resolutionFor(id) {
      if (!encounters[id] || encounters[id].conditional) return null;
      if (typeof options.resolutionFor === 'function') {
        try { return expectedResolution(options.resolutionFor(id)); } catch (_) { return null; }
      }
      var e = encounters[id];
      if (Object.prototype.hasOwnProperty.call(e, 'resolution')) return expectedResolution(e.resolution);
      if (Object.prototype.hasOwnProperty.call(e, 'outcome')) {
        var outcome = object(e.outcome) ? e.outcome.resolution : e.outcome;
        return { victory: 'cleared', cleared: 'cleared', 'survive-and-fall': 'survive-and-fall', 'restore-ally': 'liberated', liberated: 'liberated', 'defend-core': 'defended', defended: 'defended', investigation: 'investigated', investigated: 'investigated', 'end-command-link': 'command-severed', 'command-severed': 'command-severed', 'authority-cut': 'authority-severed', 'authority-severed': 'authority-severed' }[outcome] || null;
      }
      // Historic data omitted per-encounter outcomes. Preserve its critical
      // canonical resolutions explicitly; never inherit a whole scene's result
      // into each of that scene's midbosses or preliminary encounters.
      return { 'mb-ep1a07': 'survive-and-fall', 'l301-boss': 'survive-and-fall', 'kair-great-03': 'liberated', 'c104-boss': 'authority-severed', 'u203-boss': 'command-severed', 'blue-executor': 'command-severed', 'mb-kair01-v31231': 'defended', 'mb-hando02': 'defended', 'mb-murder01': 'investigated', 'mb-murder02': 'investigated', 'murder04-mid': 'investigated' }[id] || 'cleared';
    }
    function resolutionValid(id, resolution, evidence) {
      var expected = resolutionFor(id);
      if (!expected || resolution !== expected) return false;
      return id !== 'c104-boss' || object(evidence) && ['corePreserved','commandsRemoved','coerciveCircuitRemoved','distinctWorldsPreserved','guardianRemains'].every(function (key) { return evidence[key] === true; });
    }
    function validate(raw) {
      try {
        if (JSON.stringify(raw).length > 131072 || !object(raw) || raw.schemaVersion !== 1 || raw.contentRevision !== data.contentRevision || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || ids.indexOf(raw.viewSceneId) < 0 || typeof raw.portalOpen !== 'boolean' || typeof raw.endingSeen !== 'boolean' || (raw.snapshot !== undefined && raw.snapshot !== null)) return null;
        if (!unique(raw.acknowledgedSceneIds) || !unique(raw.clearedCombatIds) || !Array.isArray(raw.clearedRuns) || raw.clearedRuns.length > primary.length || raw.acknowledgedSceneIds.some(function (id) { return ids.indexOf(id) < 0; }) || raw.clearedCombatIds.some(function (id) { return primary.indexOf(id) < 0; })) return null;
        var clean = newState(), usedRuns = new Set();
        // Reconstruct a legal prefix from the journal. This rejects a future
        // combat inserted into a save, including a skipped group in one scene.
        for (var i = 0; i < raw.clearedRuns.length; i++) {
          var record = raw.clearedRuns[i];
          if (!object(record) || !runId(record.runId) || usedRuns.has(record.runId) || primary.indexOf(record.combatId) < 0 || !resolutionValid(record.combatId, record.resolution, record.evidence)) return null;
          var frontier = deriveFrontier(clean);
          while (!frontier.combatIds.length && !frontier.complete) {
            if (raw.acknowledgedSceneIds.indexOf(frontier.sceneId) < 0) return null;
            clean.acknowledgedSceneIds.push(frontier.sceneId); frontier = deriveFrontier(clean);
          }
          if (frontier.combatIds.indexOf(record.combatId) < 0 || clean.clearedCombatIds.indexOf(record.combatId) >= 0 || raw.acknowledgedSceneIds.indexOf(frontier.sceneId) < 0) return null;
          if (clean.acknowledgedSceneIds.indexOf(frontier.sceneId) < 0) clean.acknowledgedSceneIds.push(frontier.sceneId);
          clean.clearedCombatIds.push(record.combatId); clean.clearedRuns.push(copy(record)); usedRuns.add(record.runId);
        }
        if (JSON.stringify(clean.clearedCombatIds) !== JSON.stringify(raw.clearedCombatIds)) return null;
        for (var j = 0; j < raw.acknowledgedSceneIds.length; j++) {
          var id = raw.acknowledgedSceneIds[j];
          if (clean.acknowledgedSceneIds.indexOf(id) >= 0) continue;
          var f = deriveFrontier(clean);
          if (f.sceneId !== id || f.complete) return null;
          clean.acknowledgedSceneIds.push(id);
        }
        if (raw.endingSeen !== (clean.acknowledgedSceneIds.indexOf('ending') >= 0) || raw.endingSeen && !canSeeEnding(clean)) return null;
        if (raw.viewSceneId === 'ending' && !canSeeEnding(clean)) return null;
        if (raw.activeCombat !== null) {
          var a = raw.activeCombat;
          if (!object(a) || !runId(a.runId) || usedRuns.has(a.runId) || primary.indexOf(a.combatId) < 0 || !['active','defeated'].includes(a.status) || typeof a.practice !== 'boolean' || (a.snapshot !== undefined && a.snapshot !== null) || (!a.practice && availableCombats(clean).indexOf(a.combatId) < 0)) return null;
          clean.activeCombat = { combatId: a.combatId, runId: a.runId, status: a.status, practice: a.practice };
        }
        clean.revision = raw.revision; clean.viewSceneId = raw.viewSceneId; clean.portalOpen = raw.portalOpen; clean.endingSeen = raw.endingSeen;
        return clean;
      } catch (_) { return null; }
    }
    function reduce(raw, event) {
      var state = validate(raw), original = state ? copy(state) : null;
      function reject(reason) { return { ok: false, state: original || newState(), reason: reason }; }
      if (!state) return reject('invalid-state');
      if (!object(event) || typeof event.type !== 'string') return reject('invalid-event');
      if (event.snapshot !== undefined && event.snapshot !== null) return reject('unsupported-snapshot');
      var frontier = deriveFrontier(state), active = state.activeCombat, index = ids.indexOf(state.viewSceneId), destination;
      function entryAllowed(id) { try { return typeof options.canStartCombat === 'function' && options.canStartCombat(id) === true; } catch (_) { return false; } }
      if (event.type === 'ACK_SCENE') {
        if (active) return reject('combat-active');
        if (event.sceneId !== state.viewSceneId) return reject('scene-mismatch');
        if (state.acknowledgedSceneIds.indexOf(event.sceneId) >= 0) return { ok: true, state: state, duplicate: true };
        if (frontier.sceneId !== event.sceneId || frontier.complete) return reject('scene-locked');
        if (event.sceneId === 'ending' && !canSeeEnding(state)) return reject('ending-locked');
        state.acknowledgedSceneIds.push(event.sceneId);
        if (event.sceneId === 'ending') state.endingSeen = true;
      } else if (event.type === 'START_COMBAT') {
        if (active) return reject('combat-active');
        if (!runId(event.runId) || state.clearedRuns.some(function (r) { return r.runId === event.runId; })) return reject('invalid-run');
        if (primary.indexOf(event.combatId) < 0) return reject('unknown-combat');
        if (!resolutionFor(event.combatId)) return reject('invalid-resolution-contract');
        if (!event.practice && (availableCombats(state).indexOf(event.combatId) < 0 || state.viewSceneId !== encounters[event.combatId].sceneId)) return reject('combat-locked');
        if (!entryAllowed(event.combatId)) return reject('asset-or-implementation-locked');
        state.activeCombat = { combatId: event.combatId, runId: event.runId, status: 'active', practice: event.practice === true }; state.portalOpen = false;
      } else if (event.type === 'COMBAT_CLEARED') {
        var duplicate = state.clearedRuns.find(function (r) { return r.runId === event.runId; });
        if (duplicate) return duplicate.combatId === event.combatId && duplicate.resolution === event.resolution ? { ok: true, state: state, duplicate: true } : reject('run-mismatch');
        if (!active || active.status !== 'active' || active.combatId !== event.combatId || active.runId !== event.runId) return reject('run-mismatch');
        var trusted = false;
        try { trusted = typeof options.verifyResult === 'function' && options.verifyResult(event, copy(active)) === true; } catch (_) { trusted = false; }
        if (!trusted) return reject('untrusted-result');
        if (!resolutionValid(event.combatId, event.resolution, event.evidence)) return reject('invalid-resolution');
        if (!active.practice) {
          if (availableCombats(state).indexOf(event.combatId) < 0) return reject('combat-locked');
          state.clearedCombatIds.push(event.combatId);
          var result = { runId: event.runId, combatId: event.combatId, resolution: event.resolution };
          if (event.evidence !== undefined) result.evidence = copy(event.evidence);
          state.clearedRuns.push(result);
        }
        state.activeCombat = null;
      } else if (event.type === 'DEFEAT') {
        if (!active || active.runId !== event.runId || active.combatId !== event.combatId) return reject('run-mismatch');
        state.activeCombat.status = 'defeated';
      } else if (event.type === 'RETRY') {
        if (!active || active.status !== 'defeated' || active.combatId !== event.combatId || active.runId !== event.runId || !runId(event.newRunId) || event.newRunId === active.runId || state.clearedRuns.some(function (r) { return r.runId === event.newRunId; })) return reject('invalid-retry');
        if (!entryAllowed(event.combatId)) return reject('asset-or-implementation-locked');
        state.activeCombat.runId = event.newRunId; state.activeCombat.status = 'active';
      } else if (event.type === 'VIEW_PREVIOUS' || event.type === 'VIEW_NEXT' || event.type === 'PORTAL_ENTER') {
        if (active && active.status === 'active') return reject('combat-active');
        if (event.type === 'PORTAL_ENTER') {
          if (!state.portalOpen) return reject('portal-closed');
          destination = event.sceneId;
          if (state.acknowledgedSceneIds.indexOf(destination) < 0 && destination !== frontier.sceneId) return reject('portal-locked');
        } else destination = ids[index + (event.type === 'VIEW_NEXT' ? 1 : -1)];
        if (!destination || ids.indexOf(destination) < 0) return reject('boundary');
        if (destination === 'ending' && !canSeeEnding(state)) return reject('ending-locked');
        state.viewSceneId = destination; state.portalOpen = false;
        // Leaving a defeated encounter discards its retry token, never progress.
        if (active && active.status === 'defeated') state.activeCombat = null;
      } else if (event.type === 'PORTAL_OPEN') {
        if (active && active.status === 'active') return reject('combat-active');
        state.portalOpen = event.open !== false;
      } else return reject('unknown-event');
      state.revision += 1;
      var valid = validate(state);
      return valid ? { ok: true, state: valid } : reject('invalid-transition');
    }
    function sceneStatus(state, id) { var i = ids.indexOf(id), f = deriveFrontier(state); return i < 0 ? 'unknown' : sceneComplete(state, i) ? 'complete' : f.sceneId === id ? 'current' : i > f.sceneIndex ? 'locked' : 'available'; }
    return Object.freeze({ newState: newState, validate: validate, reduce: reduce, deriveFrontier: deriveFrontier, availableCombats: availableCombats, canSeeEnding: canSeeEnding, sceneStatus: sceneStatus, resolutionFor: resolutionFor });
  }
  return Object.freeze({ create: create, SCHEMA_VERSION: 1 });
}));
