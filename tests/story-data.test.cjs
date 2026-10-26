'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const os = require('node:os');
const data = require('../src/story-data.js');
const root = path.resolve(__dirname, '..');
const source = process.env.HAPIL_STORY_SOURCE || path.resolve(root, 'docs/story-source/canonical-original.txt');
const manifest = process.env.HAPIL_STORY_MANIFEST || path.resolve(root, 'docs/story-source/boss-scope-manifest.json');
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const scene = id => { const s = data.scenes.find(s => s.id === id); assert.ok(s, id); return s; };
const encounter = id => { const e = data.encounters.find(e => e.id === id); assert.ok(e, id); return e; };

test('UMD and CommonJS expose the same canonical API', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/story-data.js'), 'utf8'), context);
  assert.equal(context.HapilStoryData.contentRevision, data.contentRevision);
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.canonicalSHA256, '4b981a3d64c203a6b5b7d0b429aac452e22b43077a1f961a16afa5fc30406a90');
  assert.deepEqual(data.storymodeLineRange, [92, 919]);
});

test('63 original scenes partition exactly the story-only source with stable text hash', () => {
  assert.equal(data.scenes.length, 63);
  assert.equal(new Set(data.scenes.map(s => s.id)).size, 63);
  data.scenes.forEach((s, i) => {
    assert.equal(s.sequence, i);
    assert.equal(s.sourceRange[0], i ? data.scenes[i - 1].sourceRange[1] + 1 : 92);
    assert.equal(s.text.split('\n').length - 1, s.sourceRange[1] - s.sourceRange[0] + 1);
    assert.ok(s.narrators.length);
    assert.ok(!s.text.includes('\r'));
  });
  assert.equal(data.scenes.at(-1).sourceRange[1], 919);
  const text = data.scenes.map(s => s.text).join('');
  assert.equal(sha(text), '2d8d35fe9d368c2b46ac76332cf3417dbf192dc7b9a4f162fa8225b294357c1e');
  assert.ok(!text.includes('② 사몽'));
  assert.ok(!text.includes('NS-01'));
  assert.ok(!text.includes('R-01.'));
  assert.equal(scene('ep1a11').sourceRange[1], 243);
  assert.equal(scene('dreamRest').sourceRange[0], 244);
  assert.equal(scene('restEp1b').sourceRange[1], 396);
  assert.equal(scene('u203').sourceRange[1], 497);
  assert.equal(scene('ending').sourceRange[0], 902);
});

test('original source and manifest hashes bind every copied chunk and roster row', () => {
  const original = fs.readFileSync(source);
  assert.equal(sha(original), data.canonicalSHA256);
  const lines = original.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/(?<=\n)/);
  for (const s of data.scenes) assert.equal(s.text, lines.slice(s.sourceRange[0] - 1, s.sourceRange[1]).join(''), s.id);
  const rosterBytes = fs.readFileSync(manifest);
  assert.equal(sha(rosterBytes), data.manifestSHA256);
  const rows = JSON.parse(rosterBytes).rows;
  assert.deepEqual(data.encounters.map(e => e.id), rows.map(r => r.bossID));
  for (const row of rows) {
    const e = encounter(row.bossID);
    assert.equal(e.sourceName, row.name);
    assert.deepEqual(e.sourceAnchors, row.sourceAnchors);
    assert.deepEqual(e.sourceSection, row.storySection);
  }
});

test('69 primary and 3 held IDs cover the roster once without inventing people or fights', () => {
  assert.equal(data.primaryCombatIds.length, 69);
  assert.equal(data.conditionalCombatIds.length, 3);
  assert.equal(data.encounters.length, 72);
  assert.equal(new Set([...data.primaryCombatIds, ...data.conditionalCombatIds]).size, 72);
  assert.deepEqual(data.conditionalCombatIds, ['mb-ep1a09', 'a11-cosmic-v31318', 'blue-executor']);
  const required = data.scenes.flatMap(s => s.requiredCombatIds);
  assert.deepEqual([...required].sort(), [...data.primaryCombatIds].sort());
  assert.deepEqual(data.scenes.flatMap(s => s.conditionalCombatIds), data.conditionalCombatIds);
  for (const s of data.scenes) {
    assert.deepEqual(s.combatOrderGroups.flat().sort(), [...s.requiredCombatIds].sort());
    for (const id of s.requiredCombatIds) {
      assert.equal(encounter(id).sceneId, s.id);
      assert.equal(encounter(id).conditional, false);
    }
  }
  assert.equal(data.encounters.filter(e => e.chapter === 1 && !e.conditional).length, 13);
  assert.equal(data.encounters.filter(e => e.chapter === 2 && !e.conditional).length, 19);
  assert.equal(data.encounters.filter(e => e.chapter === 3 && !e.conditional).length, 7);
});

test('source progression and explicit encounter groups preserve special order', () => {
  assert.deepEqual(data.scenes.filter(s => s.chapter === 3).map(s => s.id), ['u201', 'u202', 'u204', 'u205', 'u206', 'u203']);
  assert.deepEqual(scene('ep1a11').combatOrderGroups, [['mb-ep1a11'], ['a11-boss']]);
  assert.deepEqual(scene('u203').combatOrderGroups, [['u203-mid'], ['u203-boss']]);
  assert.deepEqual(scene('cult03').combatOrderGroups, [['c103-mid'], ['c103-boss']]);
  assert.deepEqual(scene('cult04').combatOrderGroups, [['c104-mid'], ['c104-boss']]);
  assert.equal(encounter('c103-mid').canonicalName, '한리안');
  assert.equal(encounter('c103-boss').canonicalName, '백이온');
  assert.deepEqual(data.scenes.filter(s => s.chapter === 5).map(s => s.id), ['kair01', 'kair04', 'kair05', 'kair06', 'kair07', 'kair08', 'kair09', 'kair10', 'kair02', 'kair03', 'restKairo']);
});

test('same-person forms and narrator changes remain distinct from new identities', () => {
  for (const ids of [['mb-ep1a11', 'a11-boss', 'a11-cosmic-v31318'], ['b06-boss', 'b06b-boss'], ['b08-boss', 'b09-boss']]) {
    assert.equal(new Set(ids.map(id => encounter(id).relationGroup)).size, 1);
  }
  assert.deepEqual(scene('restKairo').narrators.map(n => n.name), ['윤서하', '미카엘라']);
  assert.deepEqual(scene('murder04').narrators.map(n => n.name), ['고서진', '한이경']);
  assert.deepEqual(scene('murder03').narrators.map(n => n.name), ['환도', '한이경']);
  assert.equal(scene('dreamRest').narrators[0].name, '의목사 A');
  assert.equal(scene('u201').narrators[0].name, '의목사 B');
  assert.equal(scene('restEp1b').narrators[0].name, '미카엘라');
});

test('essential resolutions and medical details are source-bound and preserved', () => {
  assert.equal(scene('last301').outcome, 'survive-and-fall');
  assert.match(scene('last301').text, /여섯 검격이 내 몸을 꿰뚫었다/);
  assert.equal(scene('kair02').outcome, 'restore-ally');
  assert.match(scene('kair02').text, /그녀의 몸이 아니라 변조된 명령의 실을 베었다/);
  assert.equal(scene('u203').outcome, 'end-command-link');
  assert.match(scene('u203').text, /기억의 문을 부수지는 않았다/);
  assert.match(scene('u203').text, /반복을 명령하는 연결만을 겨누어/);
  assert.equal(scene('cult04').outcome, 'authority-cut');
  assert.match(scene('cult04').text, /서로의 동의 아래 함께 남아 있었다/);
  assert.match(scene('cult04').text, /교주의 사몽 권한을 끊어/);
  assert.equal(scene('ending').outcome, 'ending');
  for (const text of ['코어를 부수지 않았다', '사이비 회로만 분리', '서로 다른 세계들도 사라지지 않고', '현실로 돌아가는 대신 코어에 남기', '몽세수호자']) assert.ok(scene('ending').text.includes(text), text);
  assert.match(scene('ep1a08').text, /악마의 얼굴 위로 의료진의 얼굴이 겹쳐졌다/);
  assert.match(scene('ep1a10').text, /의료진들이 내 호흡을 확인하고 처치를 준비/);
  assert.match(scene('ep1a10').text, /의료진에게 도움을 청했다/);
  assert.match(scene('ep1a11').text, /치료는 오래 이어졌다/);
  assert.match(scene('ep1a11').text, /호출 버튼을 눌렀다/);
});

test('source builder is deterministic and refuses a mismatched source', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hapil-story-data-'));
  try {
    const output = path.join(temp, 'data.js');
    cp.execFileSync('python3', [path.join(root, 'tools/build-story-data.py'), '--source', source, '--manifest', manifest, '--output', output]);
    assert.equal(fs.readFileSync(output, 'utf8'), fs.readFileSync(path.join(root, 'src/story-data.js'), 'utf8'));
    const wrong = path.join(temp, 'wrong.txt'); fs.writeFileSync(wrong, 'incorrect source');
    const result = cp.spawnSync('python3', [path.join(root, 'tools/build-story-data.py'), '--source', wrong, '--manifest', manifest, '--output', output]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr.toString(), /SHA256 mismatch/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
