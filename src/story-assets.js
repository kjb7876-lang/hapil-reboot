/* Explicit identity gates. Missing story art never selects a retained boss. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilStoryAssets = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var V8_BINDINGS = Object.freeze({
    'mb-dist01': Object.freeze({ adapter: 'v8', bossIndex: 0, visualId: 'violet' }),
    'mb-dist02': Object.freeze({ adapter: 'v8', bossIndex: 1, visualId: 'horn' }),
    'dist06-boss': Object.freeze({ adapter: 'v8', bossIndex: 2, visualId: 'balrog' }),
    'mb-ep1a11': Object.freeze({ adapter: 'v8', bossIndex: 3, visualId: 'mask' }),
    'a11-boss': Object.freeze({ adapter: 'v8', bossIndex: 4, visualId: 'lucifer' })
  });
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function create(data, index, ledger, addendum) {
    if (!data || !Array.isArray(data.encounters)) throw new TypeError('Invalid story data');
    index = index || {}; ledger = ledger || {};
    var encounters = Object.create(null), assets = Object.create(null), entries = Object.create(null), duplicateAssets = new Set(), duplicateEntries = new Set();
    data.encounters.forEach(function (e) { encounters[e.id] = e; });
    (Array.isArray(index.roster) ? index.roster : []).forEach(function (row) { if (assets[row.boss_id]) duplicateAssets.add(row.boss_id); assets[row.boss_id] = row; });
    (Array.isArray(ledger.entries) ? ledger.entries : Array.isArray(ledger.rows) ? ledger.rows : []).forEach(function (row) { var id = row.combatId || row.id; if (entries[id]) duplicateEntries.add(id); entries[id] = row; });
    var indexVerified = index.schema === 'hapil.live-asset-index.v1' && Number.isSafeInteger(index.revision) && index.revision >= 1 && ledger.indexVerified === true && ledger.indexRevision === index.revision;
    var suppliedForms = addendum && addendum.requiredForms || data.requiredForms || [];
    var formRequirements = Array.isArray(suppliedForms) ? suppliedForms : [];
    var formScopeValid = Array.isArray(suppliedForms) && formRequirements.every(function (form) { return form && typeof form.bossID === 'string' && typeof form.formID === 'string'; }) && new Set(formRequirements.map(function (form) { return form.bossID + ':' + form.formID; })).size === formRequirements.length;
    var formScopeLoaded = formScopeValid && (!index.required_forms_addendum || formRequirements.length > 0);
    var strictQA = index.revision >= 3;
    var batches = Array.isArray(index.accepted_batches) ? index.accepted_batches : [];
    function batch(id) { return batches.find(function (entry) { return entry.id === id; }) || null; }
    function candidateRegistrations(id, row) {
      var registrations = [];
      if (!row) return registrations;
      if (row.asset_status === 'accepted_initial_keypose_candidate_reuse' && Object.prototype.hasOwnProperty.call(V8_BINDINGS, id)) registrations.push({ batchId: 'initial-five-boss-keyposes', formID: id });
      if (row.asset_status === 'accepted_first8_keypose_candidate_not_all_forms_certified' && batch('first-eight-body-keyposes')) registrations.push({ batchId: 'first-eight-body-keyposes', formID: id });
      var partial = batch('chapter2-partial11-20261026'), aliases = { 'b06b-boss': 'b06b-boss-child', 'b07-boss': 'b07-boss-human', 'b08-boss': 'b08-boss-human' };
      var formID = aliases[id] || id;
      if (partial && Array.isArray(partial.form_ids) && partial.form_ids.indexOf(formID) >= 0) registrations.push({ batchId: partial.id, formID: formID });
      return registrations;
    }
    function requiredFormStatus(id, implementation) {
      var proofs = Array.isArray(implementation.requiredForms) ? implementation.requiredForms : [];
      return formRequirements.filter(function (form) { return form.bossID === id; }).map(function (form) {
        var matches = proofs.filter(function (proof) { return proof && proof.formID === form.formID; }), proof = matches.length === 1 ? matches[0] : {}, reasons = [];
        if (matches.length === 0) reasons.push('missing-form-proof');
        if (matches.length > 1) reasons.push('duplicate-form-proof');
        if (proof.assetApproved !== true) reasons.push('asset-not-approved');
        if (proof.sourceVerified !== true) reasons.push('source-not-verified');
        if (!Array.isArray(proof.assetRefs) || !proof.assetRefs.length || proof.assetRefs.some(function (ref) { return typeof ref !== 'string' || !ref.trim(); })) reasons.push('missing-reviewed-asset-references');
        if (proof.implemented !== true) reasons.push('form-not-implemented');
        if (proof.behaviorQA !== true) reasons.push('behavior-not-verified');
        if (proof.readabilityQA !== true) reasons.push('readability-not-verified');
        return { combatId: id, formID: form.formID, ready: reasons.length === 0, assetApproved: proof.assetApproved === true, sourceVerified: proof.sourceVerified === true, implemented: proof.implemented === true, behaviorQA: proof.behaviorQA === true, readabilityQA: proof.readabilityQA === true, gpuVerified: proof.gpuVerified === true, assetRefs: Array.isArray(proof.assetRefs) ? proof.assetRefs.slice() : [], reasons: reasons };
      });
    }
    function staticFXStatus() {
      var fx = batches.filter(function (entry) { return entry.id === 'signature-static-fx' || entry.id === 'signature-first8-static-fx'; });
      function total(key) { return fx.reduce(function (sum, entry) { return sum + (Number.isSafeInteger(entry[key]) && entry[key] >= 0 ? entry[key] : 0); }, 0); }
      return { available: fx.length > 0, candidateOnly: fx.length > 0, newStaticDrawings: total('new_static_drawings'), reusedStaticDrawings: total('reused_static_drawings'), animatedFrames: total('animated_frames'), countScope: 'batch-declared-counts-not-deduplicated', batches: fx.map(function (entry) { return { id: entry.id, newStaticDrawings: entry.new_static_drawings || 0, reusedStaticDrawings: entry.reused_static_drawings || 0, animatedFrames: entry.animated_frames || 0, derivedVariants: entry.derived_variants || 0 }; }), usage: fx.length ? 'decorative-cast-only' : 'unavailable', soleDamagingWarningCertified: false, collisionVerified: false, gpuVerified: false };
    }
    function entryStatus(id) {
      var e = encounters[id], row = assets[id], implementation = entries[id] || {}, reasons = [];
      if (!e) return { combatId: id, ready: false, known: false, conditional: false, reasons: ['unknown-combat-id'], binding: null };
      var registrations = candidateRegistrations(id, row), candidate = registrations.length > 0;
      var approved = !!(row && !duplicateAssets.has(id) && (row.asset_status === 'accepted_initial_keypose_candidate_reuse' && Object.prototype.hasOwnProperty.call(V8_BINDINGS, id) || row.asset_status === 'approved' || row.asset_status === 'accepted_verified' || candidate && implementation.assetApproved === true));
      var implemented = implementation.implemented === true, correctBody = implementation.correctBody === true, attackArt = implementation.attackArt === true, qa = implementation.qa === true;
      var sourceVerified = implementation.sourceVerified === true, behaviorQA = implementation.behaviorQA === true, readabilityQA = implementation.readabilityQA === true;
      var forms = requiredFormStatus(id, implementation);
      var binding = null;
      var retained = Object.prototype.hasOwnProperty.call(V8_BINDINGS, id) ? V8_BINDINGS[id] : null;
      var suppliedBinding = implementation.binding;
      var storyIdentityMatches = object(suppliedBinding) && (retained ? suppliedBinding.visualId === retained.visualId && (suppliedBinding.bossIndex === undefined || suppliedBinding.bossIndex === retained.bossIndex) : suppliedBinding.bossIndex === undefined && (suppliedBinding.visualId === undefined || suppliedBinding.visualId === id));
      if (implemented && storyIdentityMatches && suppliedBinding.adapter === 'story' && suppliedBinding.combatId === id && typeof suppliedBinding.handler === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,95}$/.test(suppliedBinding.handler)) binding = Object.assign({}, suppliedBinding);
      else if (implemented && Object.prototype.hasOwnProperty.call(V8_BINDINGS, id)) {
        var known = V8_BINDINGS[id];
        // A supplied binding must agree with the exact retained identity.
        if (!implementation.binding || implementation.binding.adapter === 'v8' && implementation.binding.bossIndex === known.bossIndex && (!implementation.binding.visualId || implementation.binding.visualId === known.visualId)) binding = Object.assign({ combatId: id }, known);
      }
      if (!indexVerified) reasons.push('asset-index-not-verified');
      if (!formScopeLoaded) reasons.push('required-form-scope-not-loaded');
      if (!row) reasons.push('missing-asset-index-row');
      if (duplicateAssets.has(id)) reasons.push('duplicate-asset-index-row');
      if (!approved) reasons.push('body-not-approved');
      if (!implemented) reasons.push('combat-not-implemented');
      if (!correctBody) reasons.push('correct-body-not-verified');
      if (!attackArt) reasons.push('attack-art-not-verified');
      if (!qa) reasons.push('integration-qa-not-verified');
      if (strictQA && !sourceVerified) reasons.push('source-not-verified');
      if (strictQA && !behaviorQA) reasons.push('behavior-qa-not-verified');
      if (strictQA && !readabilityQA) reasons.push('readability-qa-not-verified');
      if (implementation.attackArtMode === 'static-decorative-only' && implementation.requiresDamagingWarning === true) reasons.push('static-fx-not-a-damaging-warning');
      forms.forEach(function (form) { form.reasons.forEach(function (reason) { reasons.push('required-form:' + form.formID + ':' + reason); }); });
      if (duplicateEntries.has(id)) reasons.push('duplicate-implementation-row');
      if (!binding) reasons.push('missing-explicit-combat-binding');
      if (e.conditional) reasons.push('conditional-not-independent-combat');
      return { combatId: id, name: e.canonicalName || e.sourceName || id, known: true, conditional: !!e.conditional, indexRevision: index.revision || null, indexVerified: indexVerified, assetStatus: row && row.asset_status || 'missing', bodyCandidate: candidate, bodyCandidateRegistrations: registrations, bodyApproved: approved, sourceVerified: sourceVerified, implemented: implemented, correctBody: correctBody, attackArt: attackArt, qa: qa, behaviorQA: behaviorQA, readabilityQA: readabilityQA, gpuVerified: implementation.gpuVerified === true, requiredForms: forms, requiredFormsComplete: forms.every(function (form) { return form.ready; }), indexReportedFormsComplete: row && row.all_required_forms_complete === true, preRevealRetained: id === 'a11-boss' && candidate, staticFX: staticFXStatus(), ready: reasons.length === 0, reasons: reasons, binding: reasons.length === 0 ? binding : null };
    }
    function missingList() { return data.encounters.filter(function (e) { return !e.conditional; }).map(function (e) { return entryStatus(e.id); }).filter(function (entry) { return !entry.ready; }); }
    function summary() {
      var primary = data.encounters.filter(function (e) { return !e.conditional; }), missing = missingList();
      var forms = [].concat.apply([], primary.map(function (e) { return entryStatus(e.id).requiredForms; }));
      var hasAssetFlag = Object.prototype.hasOwnProperty.call(index, 'required_form_assets_complete');
      var formsComplete = hasAssetFlag ? index.required_form_assets_complete === true : index.required_forms_complete === true;
      var runtimeFormsComplete = formScopeLoaded && forms.every(function (form) { return form.implemented && form.behaviorQA && form.readabilityQA; });
      return { indexRevision: index.revision || null, indexVerified: indexVerified, generationComplete: index.generation_complete === true, generationCompleteScope: 'parent-art-generation-independent-art-qa-and-upload-only', scopeComplete: index.scope_complete === true, requiredFormsComplete: formsComplete, requiredFormAssetsComplete: formsComplete, formAssetCompletionField: hasAssetFlag ? 'required_form_assets_complete' : 'required_forms_complete', runtimeFormGatesComplete: runtimeFormsComplete, parentRuntimeValidationStatus: index.runtime_validation_status || null, requiredFormScopeLoaded: formScopeLoaded, requiredFormCount: forms.length, readyFormCount: forms.filter(function (f) { return f.ready; }).length, primaryCount: primary.length, conditionalCount: data.encounters.length - primary.length, readyCount: primary.length - missing.length, missingCount: missing.length, staticFX: staticFXStatus(), gpuVerifiedCount: primary.filter(function (e) { return entryStatus(e.id).gpuVerified; }).length, allComplete: indexVerified && index.generation_complete === true && index.scope_complete === true && formsComplete && formScopeLoaded && missing.length === 0 };
    }
    return Object.freeze({ entryStatus: entryStatus, missingList: missingList, summary: summary, bindingFor: function (id) { return entryStatus(id).binding; } });
  }
  return Object.freeze({ create: create, V8_BINDINGS: V8_BINDINGS });
}));
