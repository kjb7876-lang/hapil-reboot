'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Arcade = require('../src/arcade-v43.js');
const Native = require('../src/arcade-phase2-native-v43.js');
const sheets = require('../src/arcade-phase2-sheets-art-v43.js');
const {prepareAtlas, contact} = require('./helpers/phase2-source-image.cjs');
const {put} = require('./helpers/arcade-v43.cjs');

const sheet = sheets['sheet-11-p2_demons'];
const primarySlots = Object.entries(Native.slots);
const slots = Arcade.SEGMENTS.map((segment, i) => Native.slotFor(i)).filter(Boolean);
const stageCards = slots.filter(slot => slot.theme === sheet.theme);
let image;

test.before(async () => { image = await prepareAtlas(sheet); });

test('the priority bosses reprise their original attack on another spell of the same form', () => {
  for (const [actor, original] of primarySlots) {
    const repeat = slots.find(slot => slot.encore && slot.actor === actor && slot.stage === original.stage &&
      slot.themes.some(theme => original.themes.includes(theme)));
    assert.ok(repeat, actor);
    assert.ok(repeat.segment > original.segment, actor);
    const card = Arcade.SEGMENTS[repeat.segment];
    assert.ok(card.spell && !card.mid);
    assert.equal(Arcade.segArt(card), Arcade.segArt(Arcade.SEGMENTS[original.segment]));
    for (const difficulty of ['gentle', 'normal', 'hell']) {
      assert.ok(Arcade.plannedSegments(difficulty).includes(repeat.segment), actor + '/' + difficulty);
    }
  }
});

function runCard(segment, difficulty) {
  return Arcade.createRun({
    seed: 42, difficulty, segment, compact: true, entranceAll: true,
    pacing: true, distort: false, stages: 1
  });
}

function followBoss(s) {
  // Isolate incoming player damage. Player shots, boss HP, stage clocks and enemy attacks all run normally.
  s.player.invulnerableUntil = s.tick + 2;
  const dx = s.boss.present ? Math.max(-3, Math.min(3, s.boss.x - s.player.x)) : 0;
  Arcade.step(s, {dx});
}

test('the stage 11 sheet really attacks twice in a mobile fight, with ordinary volleys in between', () => {
  const first = Arcade.SEGMENTS.findIndex(card => card.kind === 'card' && !card.mid && card.stage === sheet.stage - 1);
  for (const difficulty of ['gentle', 'normal', 'hell']) {
    const s = runCard(first, difficulty);
    Native.fixtureAtlas(s, theme => theme === sheet.theme ? image : null);
    const attacks = [];
    let ordinaryShots = false;
    while (s.tick < 20000 && s.stage !== 'won' && s.stage !== 'lost' && s.stageIndex === sheet.stage - 1) {
      const before = s.enemyShotsBorn;
      followBoss(s);
      const fx = Native.inspect(s);
      if (fx?.theme === sheet.theme && fx.phase === 'telegraph' && fx.local === 0) {
        attacks.push({segment: s.seg, phases: new Set(), at: s.tick});
        assert.ok(contact((x, y) => Native.firstContactAt(s, x, y)), 'the warning previews a real attack');
      }
      if (fx?.phase && attacks.length) attacks[attacks.length - 1].phases.add(fx.phase);
      if (attacks.length === 1 && !fx?.phase && s.enemyShotsBorn > before) ordinaryShots = true;
    }
    assert.equal(s.stage, 'won', difficulty + ' fight finishes with normal boss health');
    assert.deepEqual(attacks.map(cast => cast.segment), stageCards.map(slot => slot.segment), difficulty);
    assert.equal(attacks.length, 2, difficulty);
    for (const cast of attacks) assert.deepEqual([...cast.phases], ['telegraph', 'active', 'decay']);
    assert.ok(ordinaryShots, difficulty + ' has a separate ordinary attack between sheet casts');
  }
});

function atOpening(slot) {
  const s = runCard(slot.segment, 'normal');
  for (let i = 0; i < 1200 && s.stage !== 'card'; i++) followBoss(s);
  assert.equal(s.stage, 'card');
  assert.equal(s.seg, slot.segment);
  return s;
}

test('a repeat lets an old projectile travel out of the arena, then telegraphs before doing damage', () => {
  const slot = stageCards.find(entry => entry.encore);
  assert.ok(slot);
  const s = atOpening(slot);
  Native.fixtureAtlas(s, theme => theme === sheet.theme ? image : null);
  // Replace any initial field shots with one identifiable round travelling toward the lower edge.
  s.n = 0;
  s.bossVolley = null;
  put(s, 35, Arcade.HEIGHT - 20, {ba: Math.PI / 2, bs: 180, bage: 100});
  let lastY = s.by[0];
  followBoss(s);
  assert.equal(s.n, 1);
  assert.ok(s.by[0] > lastY);
  assert.equal(Native.inspect(s)?.phase, null);
  let warning;
  for (let i = 0; i < 200; i++) {
    if (s.n) lastY = s.by[0];
    followBoss(s);
    warning = Native.inspect(s);
    if (warning?.phase) break;
  }
  assert.ok(lastY >= Arcade.HEIGHT, 'the bullet crossed the bottom edge before removal');
  assert.equal(s.n, 0);
  assert.equal(warning?.phase, 'telegraph');
  assert.equal(warning.theme, sheet.theme);
  assert.equal(Native.hit(s), false);
});

test('an unavailable sheet or a departing actor never starts a hidden reprise', () => {
  const slot = stageCards.find(entry => entry.encore);
  assert.ok(slot);
  const s = atOpening(slot);
  Native.fixtureAtlas(s, () => null);
  const start = s.segTick;
  for (let i = 0; i < 100; i++) {
    followBoss(s);
    assert.ok(!Native.inspect(s)?.phase);
    assert.equal(Native.hit(s), false);
    assert.equal(Native.holding(s), false);
  }
  assert.ok(s.segTick > start, 'ordinary combat advances with no file');

  Native.fixtureAtlas(s, () => image);
  const info = {actor: slot.actor, stage: slot.stage, scene: slot.scene, role: slot.role, mid: false, ordinal: 1, preFire: true};
  s.boss.leaving = true;
  assert.equal(Native.step(s, info), false);
  assert.equal(Native.inspect(s), null);
  s.boss.leaving = false;
  s.boss.present = false;
  assert.equal(Native.step(s, info), false);
  assert.equal(Native.inspect(s), null);
});

test('a lethal hit during the repeat finishes the visible attack and never starts another cast on that card', () => {
  const slot = stageCards.find(entry => entry.encore);
  assert.ok(slot);
  const s = runCard(slot.segment, 'normal');
  Native.fixtureAtlas(s, theme => theme === sheet.theme ? image : null);
  for (let i = 0; i < 1500 && Native.inspect(s)?.phase !== 'telegraph'; i++) followBoss(s);
  assert.equal(Native.inspect(s)?.phase, 'telegraph');
  // Apply a normal player-shot hit during the warning, with one HP remaining.
  s.boss.hp = 1;
  const i = s.sn++;
  s.sx[i] = s.boss.x;
  s.sy[i] = s.boss.y + 6;
  s.sspd[i] = 6;
  s.svx[i] = 0;
  followBoss(s);
  assert.ok(s.cardDown, 'the engine acknowledged lethal damage');
  assert.equal(s.boss.hp, 1);
  const {createCanvas} = require('@napi-rs/canvas');
  const ctx = createCanvas(360, 640).getContext('2d');
  const seen = [];
  const draw = new Set();
  for (let ticks = 0; ticks < 5000 && s.stage === 'card' && s.seg === slot.segment; ticks++) {
    const fx = Native.inspect(s);
    if (fx?.phase && !draw.has(fx.phase)) {
      assert.ok(Native.paint(ctx, s), fx.phase + ' is still drawn');
      draw.add(fx.phase);
    }
    if (fx?.phase && seen[seen.length - 1] !== fx.phase) seen.push(fx.phase);
    followBoss(s);
  }
  assert.deepEqual(seen, ['telegraph', 'active', 'decay']);
  assert.ok(s.stage !== 'card' || s.seg !== slot.segment, 'the defeated card advances');
});
