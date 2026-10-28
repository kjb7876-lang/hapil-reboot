/* Story-only persistence. Legacy v8/campaign stores are never read or changed. */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStoryStorage = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (environment) {
  'use strict';
  var KEY = 'hapil.storymode.v1', BACKUP_KEY = KEY + '.backup', QUARANTINE_KEY = KEY + '.quarantine', RESTORE_PREVIOUS_KEY = KEY + '.before-restore';
  var SCHEMA = 1, MAX_BYTES = 262144;
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function revision(value) { return Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER; }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (object(value)) return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  // FNV-1a over canonical JSON's UTF-16 code units catches accidental damage.
  // It is public, unkeyed, collision-prone, and provides NO proof of authenticity.
  function checksum(value) {
    var encoded = canonical(value), hash = 2166136261;
    for (var i = 0; i < encoded.length; i++) hash = Math.imul(hash ^ encoded.charCodeAt(i), 16777619) >>> 0;
    return 'fnv1a32:' + ('00000000' + hash.toString(16)).slice(-8);
  }
  function payload(envelope) { return { schemaVersion: envelope.schemaVersion, revision: envelope.revision, state: envelope.state }; }
  function create(storyState, options) {
    if (!storyState || typeof storyState.validate !== 'function' || typeof storyState.newState !== 'function') throw new TypeError('StoryState instance required');
    options = options || {};
    var initial = storyState.validate(storyState.newState()), storage, lastRead = null;
    if (!initial) throw new TypeError('Invalid StoryState instance');
    try { storage = Object.prototype.hasOwnProperty.call(options, 'storage') ? options.storage : environment.localStorage; } catch (_) {}
    function failure(status, reason) { return { ok: false, status: status, reason: reason, revision: null, state: null }; }
    function parse(raw) {
      if (raw === null) return { ok: true, status: 'empty', revision: 0, state: null, raw: null };
      if (typeof raw !== 'string' || raw.length > MAX_BYTES) return Object.assign(failure('corrupt', 'invalid-size'), { raw: raw });
      var envelope;
      try { envelope = JSON.parse(raw); } catch (_) { return Object.assign(failure('corrupt', 'invalid-json'), { raw: raw }); }
      if (!object(envelope)) return Object.assign(failure('corrupt', 'invalid-envelope'), { raw: raw });
      if (envelope.schemaVersion !== SCHEMA || object(envelope.state) && (envelope.state.schemaVersion !== initial.schemaVersion || envelope.state.contentRevision !== initial.contentRevision)) return Object.assign(failure('version-mismatch', 'unsupported-version'), { raw: raw });
      var checksumValid = false;
      try { checksumValid = checksum(payload(envelope)) === envelope.checksum; } catch (_) {}
      if (!revision(envelope.revision) || envelope.revision < 1 || typeof envelope.checksum !== 'string' || Object.keys(envelope).sort().join(',') !== 'checksum,revision,schemaVersion,state' || !checksumValid) return Object.assign(failure('corrupt', 'invalid-envelope-or-checksum'), { raw: raw });
      var state = storyState.validate(envelope.state);
      if (!state) return Object.assign(failure('corrupt', 'invalid-state'), { raw: raw });
      return { ok: true, status: 'ok', revision: envelope.revision, state: state, raw: raw };
    }
    function read() {
      var raw;
      try {
        if (!storage || typeof storage.getItem !== 'function') return failure('storage-error', 'unavailable');
        raw = storage.getItem(KEY);
      } catch (_) { return failure('storage-error', 'read-failed'); }
      return parse(raw);
    }
    function publicResult(result) { var out = Object.assign({}, result); delete out.raw; return out; }
    function load() { var result = read(); lastRead = result; return publicResult(result); }
    function compare(current, expectedRevision, allowInvalid) {
      if (current.status === 'storage-error') return publicResult(current);
      if (!current.ok) {
        if (allowInvalid && expectedRevision === null && lastRead && lastRead.raw === current.raw && lastRead.status === current.status) return null;
        return publicResult(current);
      }
      if (!revision(expectedRevision)) return failure('invalid-request', 'expected-revision-required');
      if (current.revision !== expectedRevision) return { ok: false, status: 'conflict', reason: 'stale-revision', revision: current.revision, state: null };
      return null;
    }
    function write(state, current, nextRevision) {
      if (!revision(nextRevision) || nextRevision < 1) return failure('invalid-request', 'revision-exhausted');
      var envelope = { schemaVersion: SCHEMA, revision: nextRevision, state: state };
      envelope.checksum = checksum(payload(envelope));
      var encoded = JSON.stringify(envelope);
      if (encoded.length > MAX_BYTES) return failure('invalid-request', 'invalid-size');
      try {
        // Recheck the exact bytes immediately before writing. localStorage has no
        // transaction/atomic CAS: simultaneous processes still require a lock.
        if (storage.getItem(KEY) !== current.raw) return { ok: false, status: 'conflict', reason: 'changed-before-write', revision: null, state: null };
        storage.setItem(KEY, encoded);
        if (storage.getItem(KEY) !== encoded) return { ok: false, status: 'conflict', reason: 'changed-after-write', revision: null, state: null };
      } catch (_) { return failure('storage-error', 'write-failed'); }
      lastRead = { ok: true, status: 'ok', revision: nextRevision, state: state, raw: encoded };
      // Validation returns a separate snapshot; caller-owned objects never change.
      return { ok: true, status: 'ok', revision: nextRevision, state: storyState.validate(state) };
    }
    function save(value, expectedRevision) {
      var state = storyState.validate(value);
      if (!state) return failure('invalid-request', 'invalid-state');
      var current = read(), error = compare(current, expectedRevision, false);
      return error || write(state, current, current.revision + 1);
    }
    function startNew(expectedRevision) {
      var current = read(), error = compare(current, expectedRevision, false);
      if (error) return error;
      if (current.status !== 'empty') return { ok: false, status: 'conflict', reason: 'story-already-exists', revision: current.revision, state: null };
      return write(storyState.validate(storyState.newState()), current, 1);
    }
    function copyEvidence(current, key) {
      if (current.raw === null) return { ok: true, status: 'empty', revision: 0, state: null };
      if (typeof current.raw !== 'string' || current.raw.length > MAX_BYTES) return failure('invalid-request', 'evidence-too-large');
      try {
        if (storage.getItem(KEY) !== current.raw) return { ok: false, status: 'conflict', reason: 'changed-before-backup', revision: null, state: null };
        var previous = storage.getItem(key);
        if (previous !== null && previous !== current.raw) return failure('preservation-required', 'evidence-slot-occupied');
        storage.setItem(key, current.raw);
        if (storage.getItem(key) !== current.raw) return failure('storage-error', 'backup-verification-failed');
      } catch (_) { return failure('storage-error', 'backup-failed'); }
      return { ok: true, status: 'backed-up', revision: current.revision, state: null, key: key };
    }
    function evidence(expectedRevision, key) {
      var current = read(), error = compare(current, expectedRevision, true);
      return error || copyEvidence(current, key);
    }
    function reset(expectedRevision) {
      var current = read(), error = compare(current, expectedRevision, true);
      if (error) return error;
      var backup = copyEvidence(current, BACKUP_KEY);
      if (!backup.ok) return backup;
      // Retain a monotonic revision on valid resets. For damaged data salvage
      // its numeric revision if available; raw malformed evidence remains backup.
      var previous = current.revision;
      if (previous === null) { try { previous = JSON.parse(current.raw).revision; } catch (_) {} }
      if (!revision(previous)) previous = 0;
      return write(storyState.validate(storyState.newState()), current, previous + 1);
    }
    function restoreBackup(expectedRevision) {
      var current = read(), error = compare(current, expectedRevision, true), backupRaw, preserved;
      if (error) return error;
      try { backupRaw = storage.getItem(BACKUP_KEY); preserved = storage.getItem(RESTORE_PREVIOUS_KEY); }
      catch (_) { return failure('storage-error', 'read-failed'); }
      var backup = parse(backupRaw);
      if (backup.status !== 'ok') return failure('invalid-backup', backup.status === 'empty' ? 'backup-missing' : 'backup-invalid');
      // Keep the previous primary bytes as well as the source backup. Never
      // overwrite an earlier preserved copy without an explicit export flow.
      if (current.raw !== null) {
        if (preserved !== null && preserved !== current.raw) return failure('preservation-required', 'restore-previous-slot-occupied');
        var evidenceResult = copyEvidence(current, RESTORE_PREVIOUS_KEY);
        if (!evidenceResult.ok) return evidenceResult;
      }
      var previous = current.revision;
      if (previous === null) { try { previous = JSON.parse(current.raw).revision; } catch (_) {} }
      if (!revision(previous)) previous = 0;
      return write(backup.state, current, Math.max(previous, backup.revision) + 1);
    }
    return Object.freeze({ load: load, save: save, startNew: startNew, backup: function (expectedRevision) { return evidence(expectedRevision, BACKUP_KEY); }, quarantine: function (expectedRevision) { return evidence(expectedRevision, QUARANTINE_KEY); }, reset: reset, restoreBackup: restoreBackup });
  }
  return Object.freeze({ create: create, KEY: KEY, BACKUP_KEY: BACKUP_KEY, QUARANTINE_KEY: QUARANTINE_KEY, RESTORE_PREVIOUS_KEY: RESTORE_PREVIOUS_KEY, SCHEMA_VERSION: SCHEMA, MAX_BYTES: MAX_BYTES });
}));
