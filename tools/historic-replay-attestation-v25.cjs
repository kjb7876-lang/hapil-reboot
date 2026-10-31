'use strict';
// Archived recordings retain their original source provenance. A separate
// attestation pins a current candidate only after every unchanged input and
// saved-boundary successor has been replayed against its recorded outcome.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),REPORT='docs/V25-HISTORIC-INPUT-REPLAY-ATTESTATION-20261031.json';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hash=file=>sha(fs.readFileSync(path.join(ROOT,file)));
function recordedModules(manifest){return manifest.recordedModuleSha256||{'src/core.js':manifest.recordedCoreSha256,'src/weapon-patterns.js':manifest.recordedWeaponPatternsSha256,...manifest.recordedPolicyFiles};}
function validateHistoricalReplayAttestation(directory,manifest){
  const report=JSON.parse(fs.readFileSync(path.join(ROOT,REPORT),'utf8'));
  assert.equal(report.schema,'hapil-v25-historic-input-replay-attestation-1');
  assert.equal(report.complete,true,'partial historic replay report cannot authorize source hashes');
  assert.equal(report.validation.allEighteenRecordedRoutes,true);assert.equal(report.validation.everyRecordedInputReplayed,true);
  assert.equal(report.validation.everyRecordedOutcomeExact,true);assert.equal(report.validation.everySavedBoundaryAndNext180InputsExact,true);
  assert.equal(report.validation.archivedInputsManifestsAndPoliciesUnchanged,true);assert.equal(report.validation.candidateSourceHashGuard,true);
  assert.equal(report.records.length,18);
  assert.equal(hash('tools/historic-replay-attestation-v25.cjs'),report.attestationLoaderSha256,'attestation loader changed after exact revalidation');
  assert.equal(hash(report.verificationTool),report.verificationToolSha256,'exact replay verifier changed after attestation');
  for(const [file,expected]of Object.entries(report.testSourceSha256))assert.equal(hash(file),expected,'historic replay assertions changed after attestation: '+file);
  const archive=report.archives.find(a=>a.directory===directory);assert.ok(archive,'missing archived fixture family');
  assert.equal(hash(`tests/fixtures/${directory}/manifest.json`),archive.manifestSha256,'original recording manifest changed');
  assert.deepEqual(archive.recordedModuleSha256,recordedModules(manifest),'original recording provenance changed');
  assert.equal(archive.inputFiles.length,manifest.records.length);
  for(const expected of manifest.records){
    const input=archive.inputFiles.find(r=>r.file===expected.file),record=report.records.find(r=>r.directory===directory&&r.file===expected.file);
    assert.ok(input&&record,'missing exact recorded input revalidation');
    assert.equal(hash(`tests/fixtures/${directory}/${expected.file}`),expected.sha256,'original input gzip changed');
    assert.equal(input.sha256,expected.sha256);assert.equal(record.inputSha256,expected.sha256);
    assert.equal(record.actual.tick,expected.tick);assert.equal(record.actual.hp,expected.hp);assert.equal(record.actual.hits,expected.hits);
    assert.equal(record.actual.score,expected.score);assert.equal(record.actual.killCount,expected.killCount);assert.equal(record.actual.checkpointCount,expected.checkpointCount);
    assert.deepEqual(record.actual.phaseTicks,expected.phaseTicks);assert.equal(record.actual.marksSha256,sha(JSON.stringify(expected.marks)));
    assert.equal(record.complete,true);assert.equal(record.replayedInputTicks,expected.tick);assert.equal(record.savedBoundariesVerified,expected.marks.length);
  }
  const current={};
  for(const [file,original]of Object.entries(recordedModules(manifest))){
    assert.ok(Object.hasOwn(report.candidateModuleSha256,file),'missing original module/capture/policy key: '+file);
    const expected=report.candidateModuleSha256[file];assert.equal(hash(file),expected,'current replay-attested simulation/policy/capture changed: '+file);current[file]=expected;
    // Only simulation core and storage gained new opt-in behavior. Weapon,
    // policy and capture sources remain identical to recording provenance.
    if(file!=='src/core.js'&&file!=='src/storage.js')assert.equal(expected,original,'recorded weapon/policy/capture source must stay unchanged: '+file);
  }
  return {currentModuleSha256:current,report};
}
module.exports={validateHistoricalReplayAttestation,recordedModules};
