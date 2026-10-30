/* Independent first-battle saves. This module never accesses local/sessionStorage. */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStore = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function (environment) {
  'use strict';
  var DB_NAME = 'hapil.reboot.firstbattle.v1';
  var STORE_NAME = 'state';
  var STATE_KEY = 'main';
  var LEDGER_LIMIT = 256;
  var RULESET = 'hapil-firstbattle-1';
  var MAX_COUNTER = 1000000000;
  // Checkpoint routes are immutable by revision. Extending the live roster must
  // not turn an invalid old save into a new encounter or reinterpret its wave.
  var CAMPAIGN_CONTRACTS = Object.freeze({
    1: Object.freeze({ bosses: 3, phases: 9 }),
    2: Object.freeze({ bosses: 5, phases: 15 }),
    3: Object.freeze({ bosses: 12, phases: 36 }),
    4: Object.freeze({ bosses: 18, phases: 54, checkpoints: 106 }),
    5: Object.freeze({ bosses: 35, phases: 105, checkpoints: 208 })
  });
  var DEFAULT_SETTINGS = { music: true, sfx: true, quality: 'high', skillRotation: true, difficulty: 'normal', sensitivity: 1 };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function finite(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
  function integer(value, min, max) { return finite(value, min, max) && Math.floor(value) === value; }
  function validRunId(value) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(value); }
  function difficulty(value) { return value === 'normal' || value === 'gentle' || value === 'hell'; }

  function settingsPatch(value) {
    var out = {};
    if (!object(value)) return out;
    ['music', 'sfx', 'skillRotation'].forEach(function (key) { if (typeof value[key] === 'boolean') out[key] = value[key]; });
    if (value.quality === 'high' || value.quality === 'low') out.quality = value.quality;
    if (difficulty(value.difficulty)) out.difficulty = value.difficulty;
    if (finite(value.sensitivity, 0.01, 100)) out.sensitivity = Math.max(0.5, Math.min(2, value.sensitivity));
    return out;
  }

  // Copy only the known safe phase-start schema. No executable values, entity
  // arrays, arbitrary object keys, unbounded strings, or nonfinite numbers survive.
  function validateCheckpoint(input) {
    try {
      if(input&&Object.prototype.hasOwnProperty.call(input,'combatRevision')&&input.combatRevision!==21)return null;
      var encoded = JSON.stringify(input);
      if (typeof encoded !== 'string' || encoded.length > 16384) return null;
      var value = JSON.parse(encoded);
      if (!object(value) || value.rulesetVersion !== RULESET || !validRunId(value.runId) || !difficulty(value.difficulty)) return null;
      var campaign = value.campaign === true;
      var campaignContract = null;
      if (campaign) {
        if (!integer(value.campaignRevision, 1, 5)) return null;
        campaignContract = CAMPAIGN_CONTRACTS[value.campaignRevision];
        if (!integer(value.bossIndex, 0, campaignContract.bosses - 1)) return null;
        if (value.difficulty === 'hell' && value.campaignRevision < 3) return null;
        if (value.stage === 'waves' && value.bossIndex === 1 && value.wave !== 0) return null;
      } else if (value.campaign !== undefined || value.campaignRevision !== undefined || value.bossIndex !== undefined) return null;
      if (!integer(value.seed, 0, 4294967295) || !integer(value.rngState, 0, 4294967295) || !integer(value.idCounter, 0, 100000000)) return null;
      if (!integer(value.checkpointSerial, 1, campaignContract && campaignContract.checkpoints || 100) || !integer(value.tick, 0, 1000000) || typeof value.practiceBoss !== 'boolean') return null;
      if (!integer(value.shotReadyAt, 0, 1003600)) return null;
      if (value.stage !== 'waves' && value.stage !== 'boss') return null;
      if (!integer(value.wave, 0, 2) || !integer(value.phase, 0, 2)) return null;
      if (value.stageTime !== 0 || value.phaseTime !== 0 || value.waveTime !== 0) return null;
      if (typeof value.skillRotation !== 'boolean' || value.autoAttack !== true) return null;
      var p = value.player;
      var maxHp = value.difficulty === 'gentle' ? 5 : 3;
      if (!object(p) || !finite(p.x, 16, 344) || !finite(p.y, 260, 614) || !integer(p.hp, 1, maxHp) || p.maxHp !== maxHp || p.r !== 3) return null;
      if (!integer(p.invulnerableUntil, 0, 1003600) || !integer(p.egoUntil, 0, 1003600)) return null;
      if (!integer(value.score, 0, 100000000) || !integer(value.graze, 0, 100000000) || !integer(value.kills, 0, 100000000)) return null;
      if (!finite(value.memory, 0, 100) || !finite(value.resonance, 0, 100)) return null;
      if (!object(value.skills)) return null;
      var skills = {};
      var readyKeys = ['memoryReadyAt', 'delayReadyAt', 'counterReadyAt', 'egoReadyAt', 'globalReadyAt'];
      for (var i = 0; i < readyKeys.length; i += 1) {
        var key = readyKeys[i];
        if (!integer(value.skills[key], 0, 1003600)) return null;
        skills[key] = value.skills[key];
      }
      if (!object(value.stats) || !object(value.stats.casts)) return null;
      var stats = {}, casts = {};
      var required = ['hits', 'shots', 'damage', 'peakBullets', 'peakEnemies', 'peakParticles'];
      if (!required.every(function (key) { return finite(value.stats[key], 0, 100000000); })) return null;
      var statKeys = Object.keys(value.stats);
      if (statKeys.length > 32) return null;
      for (var j = 0; j < statKeys.length; j += 1) {
        var stat = statKeys[j];
        if (stat === 'casts') continue;
        if (stat === 'phaseTicks') {
          if (!Array.isArray(value.stats.phaseTicks) || value.stats.phaseTicks.length > (campaign ? campaignContract.phases : 3) || !value.stats.phaseTicks.every(function (tick) { return integer(tick, 0, 4500); })) return null;
          stats.phaseTicks = value.stats.phaseTicks.slice();
          continue;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(stat) || stat === 'constructor' || stat === 'prototype' || !finite(value.stats[stat], 0, 100000000)) return null;
        stats[stat] = value.stats[stat];
      }
      for (var c = 0; c < 4; c += 1) {
        var cast = ['memory', 'delay', 'counter', 'ego'][c];
        if (!integer(value.stats.casts[cast], 0, 1000000)) return null;
        casts[cast] = value.stats.casts[cast];
      }
      stats.casts = casts;
      if (!stats.phaseTicks) return null;
      var resourceState = {};
      if (!object(value.resourceState)) return null;
      var resourceKeys = ['memoryBucket', 'memoryGain', 'resBucket', 'resGain', 'grazeGain', 'lastGraze'];
      for (var r = 0; r < resourceKeys.length; r += 1) {
        var resource = resourceKeys[r];
        if (!finite(value.resourceState[resource], resource === 'lastGraze' ? -10000000 : 0, 10000000)) return null;
        resourceState[resource] = value.resourceState[resource];
      }
      var clean = {
        rulesetVersion: RULESET, runId: value.runId, seed: value.seed, difficulty: value.difficulty,
        practiceBoss: value.practiceBoss, checkpointSerial: value.checkpointSerial, tick: value.tick,
        shotReadyAt: value.shotReadyAt,
        rngState: value.rngState, idCounter: value.idCounter, stage: value.stage, wave: value.wave, phase: value.phase,
        stageTime: 0, phaseTime: 0, waveTime: 0,
        player: { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, r: 3, invulnerableUntil: p.invulnerableUntil, egoUntil: p.egoUntil },
        score: value.score, graze: value.graze, kills: value.kills, memory: value.memory, resonance: value.resonance,
        autoAttack: true, skillRotation: value.skillRotation, skills: skills, stats: stats, resourceState: resourceState
      };
      if (campaign) { clean.campaign = true; clean.campaignRevision = value.campaignRevision; clean.bossIndex = value.bossIndex; }
      if(value.combatRevision===21)clean.combatRevision=21;
      return clean;
    } catch (_) { return null; }
  }

  function validateResult(value) {
    if (!object(value) || !validRunId(value.runId) || !difficulty(value.difficulty) || typeof value.won !== 'boolean') return null;
    if (!integer(value.score, 0, MAX_COUNTER) || !integer(value.graze, 0, MAX_COUNTER) || !integer(value.kills, 0, MAX_COUNTER)) return null;
    return { runId: value.runId, score: value.score, graze: value.graze, kills: value.kills, difficulty: value.difficulty, won: value.won };
  }

  function emptyState() {
    return { version: 1, revision: 0, generation: 0, activeRunId: null, activeRunBaselineKills: 0, settings: clone(DEFAULT_SETTINGS),
      profile: { runs: 0, wins: 0, bestScore: 0, bestGraze: 0, totalKills: 0, lastRun: null },
      checkpoint: null, backup: null, completed: [] };
  }
  function completed(state, runId) { return state.completed.some(function (result) { return result.runId === runId; }); }
  function safeAdd(a, b) { return Math.min(MAX_COUNTER, a + b); }

  function normalizeState(raw) {
    var state = emptyState();
    if (!object(raw) || raw.version !== 1) return state;
    if(raw.combatContract===21)state.combatContract=21;
    if (integer(raw.revision, 0, Number.MAX_SAFE_INTEGER - 1)) state.revision = raw.revision;
    if (integer(raw.generation, 0, Number.MAX_SAFE_INTEGER - 1)) state.generation = raw.generation;
    state.settings = Object.assign(state.settings, settingsPatch(raw.settings));
    if (object(raw.profile)) {
      ['runs', 'wins', 'bestScore', 'bestGraze', 'totalKills'].forEach(function (key) {
        if (integer(raw.profile[key], 0, MAX_COUNTER)) state.profile[key] = raw.profile[key];
      });
      state.profile.wins = Math.min(state.profile.runs, state.profile.wins);
      state.profile.lastRun = validateResult(raw.profile.lastRun);
    }
    var metadataValid = Array.isArray(raw.completed) && raw.completed.length <= LEDGER_LIMIT &&
      integer(raw.revision, 0, Number.MAX_SAFE_INTEGER - 1) && integer(raw.generation, 0, Number.MAX_SAFE_INTEGER - 1) &&
      (raw.activeRunId === null || validRunId(raw.activeRunId));
    if (metadataValid) {
      for (var i = 0; i < raw.completed.length; i += 1) {
        var result = validateResult(raw.completed[i]);
        if (!result || completed(state, result.runId)) { metadataValid = false; break; }
        state.completed.push(result);
      }
    }
    if (!metadataValid) { state.completed = []; return state; }
    state.activeRunId = raw.activeRunId;
    function safeCheckpoint(value) {
      var snapshot = validateCheckpoint(value);
      return snapshot && snapshot.runId === state.activeRunId && !completed(state, snapshot.runId) ? snapshot : null;
    }
    state.checkpoint = safeCheckpoint(raw.checkpoint);
    state.backup = safeCheckpoint(raw.backup);
    if (!state.checkpoint && state.backup) state.checkpoint = clone(state.backup);
    // Old version-1 states have no baseline and mean an un-retried run.
    // Clamp a retained baseline when recovering an older backup so only kills
    // after the restored boundary are credited on the next completed attempt.
    if (state.checkpoint && integer(raw.activeRunBaselineKills, 0, MAX_COUNTER))
      state.activeRunBaselineKills = Math.min(raw.activeRunBaselineKills, state.checkpoint.kills);
    return state;
  }

  // Never rewrite unknown/corrupt stored records through a normalized empty
  // state. A valid same-run backup can recover an invalid primary checkpoint;
  // a corrupt backup is retained on disk and exported for recovery instead.
  function safeStoredRecord(raw) {
    if (raw === undefined) return true;
    if (!object(raw) || raw.version !== 1 || !Array.isArray(raw.completed) || raw.completed.length > LEDGER_LIMIT ||
        !integer(raw.revision, 0, Number.MAX_SAFE_INTEGER - 1) || !integer(raw.generation, 0, Number.MAX_SAFE_INTEGER - 1) ||
        !(raw.activeRunId === null || validRunId(raw.activeRunId))) return false;
    if (raw.activeRunBaselineKills !== undefined && !integer(raw.activeRunBaselineKills, 0, MAX_COUNTER)) return false;
    if(raw.combatContract!==undefined&&raw.combatContract!==21)return false;
    if((raw.checkpoint&&raw.checkpoint.combatRevision===21||raw.backup&&raw.backup.combatRevision===21)&&raw.combatContract!==21)return false;
    function hasOnlyKeys(value, allowed) {
      return object(value) && Object.keys(value).every(function (key) { return allowed.indexOf(key) >= 0; });
    }
    if (!hasOnlyKeys(raw, ['version','revision','generation','activeRunId','activeRunBaselineKills','settings','profile','checkpoint','backup','completed','combatContract'])) return false;
    if (raw.settings !== undefined) {
      if (!hasOnlyKeys(raw.settings, ['music','sfx','quality','skillRotation','difficulty','sensitivity'])) return false;
      if (['music','sfx','skillRotation'].some(function (k) { return raw.settings[k] !== undefined && typeof raw.settings[k] !== 'boolean'; })) return false;
      if (raw.settings.quality !== undefined && raw.settings.quality !== 'high' && raw.settings.quality !== 'low') return false;
      if (raw.settings.difficulty !== undefined && !difficulty(raw.settings.difficulty)) return false;
      if (raw.settings.sensitivity !== undefined && !finite(raw.settings.sensitivity, .5, 2)) return false;
    }
    if (raw.profile !== undefined) {
      if (!hasOnlyKeys(raw.profile, ['runs','wins','bestScore','bestGraze','totalKills','lastRun'])) return false;
      if (['runs','wins','bestScore','bestGraze','totalKills'].some(function (k) { return raw.profile[k] !== undefined && !integer(raw.profile[k], 0, MAX_COUNTER); })) return false;
      if (raw.profile.wins !== undefined && raw.profile.wins > (raw.profile.runs || 0)) return false;
      if (raw.profile.lastRun != null && (!hasOnlyKeys(raw.profile.lastRun, ['runId','score','graze','kills','difficulty','won']) || !validateResult(raw.profile.lastRun))) return false;
    }
    var ids = new Set();
    for (var i = 0; i < raw.completed.length; i++) {
      var result = validateResult(raw.completed[i]);
      if (!result || !hasOnlyKeys(raw.completed[i], ['runId','score','graze','kills','difficulty','won']) || ids.has(result.runId)) return false;
      ids.add(result.runId);
    }
    function validStoredCheckpoint(value) {
      var snapshot = validateCheckpoint(value);
      return !!(snapshot && snapshot.runId === raw.activeRunId && !ids.has(snapshot.runId));
    }
    var backupPresent = raw.backup !== undefined && raw.backup !== null;
    var checkpointPresent = raw.checkpoint !== undefined && raw.checkpoint !== null;
    var backupValid = backupPresent && validStoredCheckpoint(raw.backup);
    var checkpointValid = checkpointPresent && validStoredCheckpoint(raw.checkpoint);
    if (backupPresent && !backupValid) return false;
    if (checkpointPresent && !checkpointValid && !backupValid) return false;
    if (checkpointValid && raw.activeRunBaselineKills !== undefined && raw.activeRunBaselineKills > raw.checkpoint.kills) return false;
    if (!checkpointPresent && !backupPresent && raw.activeRunBaselineKills > 0) return false;
    return true;
  }

  // Pure reducer: IDB always calls this after reading within the same read/write
  // transaction. An instance may refresh its revision only with an explicit load.
  function reduce(raw, action, expectedRevision) {
    var state = normalizeState(raw);
    if (!safeStoredRecord(raw)) return { state: state, changed: false, result: { ok: false, reason: 'invalid-storage-state' } };
    // The v1 record validator cannot represent a subsequent counter above this
    // boundary. Keep the current bytes intact and let users export the record.
    if (state.revision >= Number.MAX_SAFE_INTEGER - 1 || state.generation >= Number.MAX_SAFE_INTEGER - 1)
      return { state: state, changed: false, result: { ok: false, reason: 'counter-exhausted' } };
    if (state.revision !== expectedRevision) return { state: state, changed: false, result: { ok: false, reason: 'conflict', revision: state.revision } };
    var result = { ok: true };
    if (action.type === 'settings') {
      state.settings = Object.assign(state.settings, action.value);
    } else if (action.type === 'checkpoint') {
      var snapshot = action.value;
      if (completed(state, snapshot.runId)) return { state: state, changed: false, result: { ok: false, reason: 'completed' } };
      if (state.activeRunId === snapshot.runId && state.checkpoint) {
        if(snapshot.combatRevision!==state.checkpoint.combatRevision)return { state: state, changed: false, result: { ok: false, reason: 'combat-revision-mismatch' } };
        if (snapshot.checkpointSerial < state.checkpoint.checkpointSerial || snapshot.tick < state.checkpoint.tick) return { state: state, changed: false, result: { ok: false, reason: 'stale-checkpoint' } };
        if (snapshot.checkpointSerial === state.checkpoint.checkpointSerial) {
          var identical = JSON.stringify(snapshot) === JSON.stringify(state.checkpoint);
          return { state: state, changed: false, result: { ok: identical, reason: identical ? 'unchanged' : 'stale-checkpoint' } };
        }
      }
      if (state.activeRunId !== snapshot.runId) {
        state.activeRunId = snapshot.runId;
        state.activeRunBaselineKills = 0;
        state.generation += 1;
        state.backup = clone(snapshot);
      } else state.backup = state.checkpoint ? clone(state.checkpoint) : clone(snapshot);
      state.checkpoint = clone(snapshot);
      // Old clients reject unknown top-level keys before any write. Retaining
      // this marker stops an already-open v20 tab from stripping revision21
      // out of a newly saved checkpoint while saving unrelated settings.
      if(snapshot.combatRevision===21)state.combatContract=21;
    } else if (action.type === 'complete') {
      var summary = action.value;
      if (completed(state, summary.runId)) return { state: state, changed: false, result: { ok: true, duplicate: true } };
      if (state.activeRunId !== summary.runId) return { state: state, changed: false, result: { ok: false, reason: 'inactive-run' } };
      state.profile.runs = safeAdd(state.profile.runs, 1);
      if (summary.won) state.profile.wins = safeAdd(state.profile.wins, 1);
      state.profile.bestScore = Math.max(state.profile.bestScore, summary.score);
      state.profile.bestGraze = Math.max(state.profile.bestGraze, summary.graze);
      // Checkpoints retain cumulative kills; the prefix from an earlier failed
      // attempt was already counted and must not be counted a second time.
      state.profile.totalKills = safeAdd(state.profile.totalKills, Math.max(0, summary.kills - state.activeRunBaselineKills));
      state.profile.lastRun = clone(summary);
      state.completed.push(clone(summary));
      if (state.completed.length > LEDGER_LIMIT) state.completed.splice(0, state.completed.length - LEDGER_LIMIT);
      state.generation += 1;
      if (!summary.won && state.checkpoint) {
        // Loss records the just-ended run exactly once, but keeps the last
        // confirmed safe boundary and its previous backup playable. A retry
        // needs a new run ID because the old one is now in the completed ledger.
        var suffix = 0, retryId;
        do { retryId = summary.runId.slice(0, 62) + '-retry-' + state.generation.toString(36) + '-' + (suffix++).toString(36); }
        while (completed(state, retryId));
        state.activeRunId = retryId;
        state.activeRunBaselineKills = state.checkpoint.kills;
        state.checkpoint.runId = retryId;
        if (state.backup) state.backup.runId = retryId;
        result.continuedRunId = retryId;
      } else {
        state.checkpoint = null;
        state.backup = null;
        state.activeRunId = null;
        state.activeRunBaselineKills = 0;
      }
      result.duplicate = false;
    } else if (action.type === 'clear') {
      state.checkpoint = null;
      state.backup = null;
      state.activeRunId = null;
      state.activeRunBaselineKills = 0;
      state.generation += 1;
    } else return { state: state, changed: false, result: { ok: false, reason: 'invalid-action' } };
    state.revision += 1;
    result.revision = state.revision;
    return { state: state, changed: true, result: result };
  }

  function createStore(env) {
    env = env || {};
    var status = { persistent: false, message: '저장소 확인 중' };
    var db = null, opening = null, memory = emptyState(), expectedRevision = 0, initialized = false, persistenceLost = false, hasStoredState = false, rawStoredState, storageInvalid = false;
    var queue = Promise.resolve();
    function enqueue(fn) {
      var next = queue.then(fn, fn);
      queue = next.catch(function () {});
      return next.catch(function () { return { ok: false, persistent: status.persistent, reason: 'storage-error' }; });
    }
    function memoryMode(reason) {
      if (db) { try { db.close(); } catch (_) {} }
      db = null;
      status.persistent = false;
      status.message = '메모리 저장 모드 · 창을 닫으면 기록이 사라집니다 (' + reason + ')';
    }
    function persistentStatus() {
      status.persistent = true;
      status.message = storageInvalid ? '저장 데이터 오류 · 기존 기록을 보존했습니다. 내보내기로 기록을 보관해 주세요' :
        memory.revision >= Number.MAX_SAFE_INTEGER - 1 || memory.generation >= Number.MAX_SAFE_INTEGER - 1 ?
          '저장 데이터 오류 · 기록 번호 한도에 도달했습니다. 내보내기로 기록을 보관해 주세요' : '이 기기에 독립 저장됨';
    }
    function openDatabase() {
      if (opening) return opening;
      opening = new Promise(function (resolve) {
        var settled = false, request, timer;
        function finish(value) { if (settled) return; settled = true; if (timer) clearTimeout(timer); resolve(value); }
        try {
          if (env.location && env.location.protocol === 'file:') { memoryMode('파일 실행'); finish(false); return; }
          if (!env.indexedDB || typeof env.indexedDB.open !== 'function') { memoryMode('IndexedDB 없음'); finish(false); return; }
          request = env.indexedDB.open(DB_NAME, 1);
          timer = setTimeout(function () { memoryMode('저장소 응답 없음'); finish(false); }, 1800);
          request.onupgradeneeded = function () {
            try { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); }
            catch (_) { try { request.transaction.abort(); } catch (_) {} }
          };
          request.onblocked = function () { memoryMode('다른 창이 저장소를 사용 중'); finish(false); };
          request.onerror = function (event) { if (event && event.preventDefault) event.preventDefault(); memoryMode('저장소 접근 거부'); finish(false); };
          request.onsuccess = function () {
            if (settled) { try { request.result.close(); } catch (_) {} return; }
            db = request.result;
            db.onversionchange = function () { persistenceLost = true; memoryMode('저장소 버전 변경 · 새로 열어주세요'); };
            persistentStatus();
            finish(true);
          };
        } catch (_) { memoryMode('저장소 접근 거부'); finish(false); }
      });
      return opening;
    }
    function readDatabase() {
      return new Promise(function (resolve, reject) {
        var transaction, value, timer;
        function fail() { if (timer) clearTimeout(timer); reject(new Error('read failed')); }
        try {
          transaction = db.transaction(STORE_NAME, 'readonly');
          timer = setTimeout(function () { try { transaction.abort(); } catch (_) {} fail(); }, 1800);
          var request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
          request.onsuccess = function () { rawStoredState = request.result; hasStoredState = request.result !== undefined; storageInvalid = !safeStoredRecord(request.result); value = normalizeState(request.result); };
          transaction.oncomplete = function () { if (timer) clearTimeout(timer); resolve(value || emptyState()); };
          transaction.onabort = transaction.onerror = fail;
        } catch (_) { fail(); }
      });
    }
    async function readCurrent(refresh) {
      await openDatabase();
      if (db) {
        try { memory = await readDatabase(); }
        catch (_) { persistenceLost = true; memoryMode('저장소 읽기 실패 · 새로 열어주세요'); }
      }
      if (refresh) {
        // A failed read or invalid record must never adopt the stale in-memory
        // revision. Memory-only mode is still usable when IDB was unavailable
        // from the outset, because persistenceLost remains false in that case.
        if (!persistenceLost && !storageInvalid) expectedRevision = memory.revision;
        initialized = true;
        if (db) persistentStatus();
      }
      return clone(memory);
    }
    function writeDatabase(action) {
      return new Promise(function (resolve, reject) {
        var transaction, update, timer;
        function fail() { if (timer) clearTimeout(timer); reject(new Error('write failed')); }
        try {
          transaction = db.transaction(STORE_NAME, 'readwrite');
          timer = setTimeout(function () { try { transaction.abort(); } catch (_) {} fail(); }, 1800);
          var store = transaction.objectStore(STORE_NAME);
          var request = store.get(STATE_KEY);
          request.onsuccess = function () {
            try {
              update = reduce(request.result, action, expectedRevision);
              if (update.changed) store.put(update.state, STATE_KEY);
            } catch (_) { try { transaction.abort(); } catch (_) {} fail(); }
          };
          transaction.oncomplete = function () { if (timer) clearTimeout(timer); resolve(update); };
          transaction.onabort = transaction.onerror = fail;
        } catch (_) { fail(); }
      });
    }
    function mutation(action) {
      return enqueue(async function () {
        await openDatabase();
        if (persistenceLost) return { ok: false, persistent: false, reason: 'storage-error' };
        var update;
        if (db) {
          try { update = await writeDatabase(action); }
          catch (_) { persistenceLost = true; memoryMode('저장소 쓰기 실패 · 새로 열어주세요'); return { ok: false, persistent: false, reason: 'storage-error' }; }
        }
        if (!update) update = reduce(memory, action, expectedRevision);
        // A rejected stale write must not refresh this writer's revision. Only
        // load() explicitly adopts another tab's state and allows new writes.
        if (update.result.reason !== 'conflict') {
          memory = clone(update.state);
          if (update.changed) { expectedRevision = memory.revision; hasStoredState = true; }
        }
        if (update.result.reason === 'conflict') status.message = '다른 창의 저장이 감지되었습니다 · 새로 열어 최신 기록을 불러오세요';
        if (update.result.reason === 'invalid-storage-state') { storageInvalid = true; status.message = '저장 데이터 오류 · 기존 기록을 보존했습니다. 내보내기로 기록을 보관해 주세요'; }
        if (update.result.reason === 'counter-exhausted') status.message = '저장 데이터 오류 · 기록 번호 한도에 도달했습니다. 내보내기로 기록을 보관해 주세요';
        return Object.assign({}, update.result, { persistent: status.persistent });
      });
    }
    function invalid(reason) { return Promise.resolve({ ok: false, persistent: status.persistent, reason: reason }); }
    var api = {
      status: status,
      open: function () { return enqueue(async function () { if (!initialized) await readCurrent(true); if (persistenceLost || storageInvalid) return { ok: false, reason: storageInvalid ? 'invalid-storage-state' : 'storage-error', persistent: status.persistent, message: status.message }; return { ok: true, persistent: status.persistent, message: status.message }; }); },
      load: function () { return enqueue(async function () { var state = await readCurrent(true); if (persistenceLost || storageInvalid) return { ok: false, reason: storageInvalid ? 'invalid-storage-state' : 'storage-error', persistent: status.persistent }; return { settings: state.settings, profile: state.profile, checkpoint: state.checkpoint, persistent: status.persistent, hasStoredState: hasStoredState }; }); },
      // Observation for asynchronous result UI: read the current durable state
      // but never adopt its revision for future writes. Only explicit load()
      // refreshes a writer after another tab has committed a change.
      peek: function () { return enqueue(async function () { var state = await readCurrent(false); if (persistenceLost || storageInvalid) return { ok: false, reason: storageInvalid ? 'invalid-storage-state' : 'storage-error', persistent: status.persistent }; return { settings: state.settings, profile: state.profile, checkpoint: state.checkpoint, persistent: status.persistent, hasStoredState: hasStoredState }; }); },
      saveSettings: function (settings) {
        try { if (!object(settings)) return invalid('invalid-settings'); return mutation({ type: 'settings', value: settingsPatch(settings) }); }
        catch (_) { return invalid('invalid-settings'); }
      },
      saveCheckpoint: function (snapshot) {
        var value = validateCheckpoint(snapshot);
        // Practice is ephemeral and must never replace campaign or backup,
        // even if a future caller mistakenly asks the store to save it.
        if (value && value.practiceBoss) return invalid('practice-checkpoint');
        return value ? mutation({ type: 'checkpoint', value: value }) : invalid('invalid-checkpoint');
      },
      completeRun: function (summary) {
        try { if (summary && summary.practiceBoss === true) return invalid('practice-result'); var value = validateResult(summary); return value ? mutation({ type: 'complete', value: value }) : invalid('invalid-result'); }
        catch (_) { return invalid('invalid-result'); }
      },
      clearCheckpoint: function () { return mutation({ type: 'clear' }); },
      exportData: function () { return enqueue(async function () {
        var state = await readCurrent(false);
        var result = { format: DB_NAME, version: 1, persistent: status.persistent, revision: state.revision, generation: state.generation,
          settings: state.settings, profile: state.profile, activeRunId: state.activeRunId, activeRunBaselineKills: state.activeRunBaselineKills, checkpoint: state.checkpoint, backup: state.backup, completed: state.completed };
        if(state.combatContract===21)result.combatContract=21;
        // Include the exact stored record only when normal use is blocked; the
        // data stays local unless the user explicitly chooses to export it.
        if (storageInvalid && hasStoredState) result.rawState = rawStoredState;
        return JSON.stringify(result, null, 2);
      }); }
    };
    return api;
  }
  var api = createStore(environment);
  // Test helpers are available only in CommonJS, never on the browser global.
  if (typeof module === 'object' && module.exports) Object.defineProperty(api, '_test', { value: {
    createStore: createStore, validateCheckpoint: validateCheckpoint, validateResult: validateResult,
    settingsPatch: settingsPatch, normalizeState: normalizeState, safeStoredRecord: safeStoredRecord, reduce: reduce, emptyState: emptyState,
    DB_NAME: DB_NAME, STORE_NAME: STORE_NAME, STATE_KEY: STATE_KEY, LEDGER_LIMIT: LEDGER_LIMIT
  } });
  return api;
});
