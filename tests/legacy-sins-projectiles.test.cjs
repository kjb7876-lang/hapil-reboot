'use strict';
// Direct renderer contract checks. Actual retained-pixel fixtures below are
// CPU Canvas tests, not browser, mobile-device, or GPU measurements.
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/projectiles.js');
const API = global.HapilProjectiles;
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', path.resolve(__dirname, '..')] }));
const materialKeys = ['projectileBelphegorV13', 'projectileLeviathanV13', 'projectileBeelzebubV13', 'projectileAsmodeusV13', 'projectileMammonV13', 'projectileWrathV13', 'projectilePrideV13'];
const ownOptionalKeys = [
  ['h14SkillSloth', 'h14BeamSloth'], ['h14SkillEnvy', 'h14BeamEnvy'], ['h14RotorGlutton', 'h14BeamGlutton'],
  ['h14SkillLust', 'h14BeamLust'], ['h14SkillGreed', 'h14BeamGreed'], ['h14SkillWrath', 'h14BeamWrath'], ['h14SkillPride', 'h14BeamPride']
];
async function materialFixture() {
  const original = global.document;
  const allocated = [];
  global.document = { createElement(name) { assert.equal(name, 'canvas'); const c = createCanvas(1, 1); allocated.push(c); return c; } };
  const images = {};
  const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/SINS-PROJECTILE-SOURCES-20261029.json'), 'utf8'));
  for (const spec of sources.items.concat(sources.generatedMissingOwnMaterials)) images[spec.runtimeKey] = await loadImage(path.join(__dirname, '..', spec.runtimePath));
  const surface = createCanvas(360, 100), ctx = surface.getContext('2d'), fx = API.create(images);
  return { images, surface, ctx, fx, allocated, close() { fx.destroy(); global.document = original; } };
}

test('unknown encounter indices fail closed instead of borrowing the final existing boss artwork', () => {
  const fx = API.create({});
  const noDraw = new Proxy({}, { get() { return () => { throw Error('unsupported encounter was drawn'); }; }, set() { return true; } });
  try {
    for (const bossIndex of [999, -2, 4.5, '5']) {
      const w = { campaign: true, bossIndex };
      assert.deepEqual(API.assetKeysForEncounter(bossIndex), []);
      assert.equal(API.invalidAssetForEncounter({}, bossIndex), 'unsupportedProjectileEncounter');
      assert.equal(API.paletteFor(w), null);
      assert.equal(API.colorFor(w), null);
      fx.beginFrame();
      assert.equal(fx.drawBullet(noDraw, w, { x: 20, y: 20, r: 4, halfLength: 0 }), false);
      assert.equal(fx.drawHazardBody(noDraw, w, { x1: 20, y1: 20, x2: 40, y2: 20, width: 8, phase: 'active' }), false);
      assert.equal(fx.getMetrics().missingProjectileAssets, 2);
    }
  } finally { fx.destroy(); }
});

test('the explicit legacy encounter retains its original source keys without requiring a hand weapon', () => {
  const keys = API.assetKeysForEncounter(-1);
  assert(keys.includes('projectileVioletOrbV9'));
  assert(keys.includes('projectileVioletBladeV10'));
  assert(!keys.some(k => k.startsWith('weapon')));
  assert.equal(API.paletteFor({}).id, 'violet');
  assert.equal(API.paletteFor({ bossIndex: -1 }).id, 'violet');
});

test('all seven sins require their own checked static material, with no Lucifer source or invented weapon', async () => {
  const f = await materialFixture();
  try {
    for (let i = 5; i < 12; i++) {
      assert.deepEqual(API.assetKeysForEncounter(i), [materialKeys[i - 5], ...ownOptionalKeys[i - 5]]);
      assert.equal(API.invalidAssetForEncounter(f.images, i), null);
      assert.deepEqual(API.optionalAssetKeysForEncounter(i), ownOptionalKeys[i - 5]);
      const missing = { ...f.images }; delete missing[materialKeys[i - 5]];
      assert.equal(API.invalidAssetForEncounter(missing, i), materialKeys[i - 5]);
      missing[materialKeys[i - 5]] = { complete: true, naturalWidth: 1, naturalHeight: 1 };
      assert.equal(API.invalidAssetForEncounter(missing, i), materialKeys[i - 5]);
      f.fx.beginFrame();
      assert.equal(f.fx.drawBullet(f.ctx, { campaign: true, bossIndex: i }, { x: 30, y: 50, r: 11, halfLength: 0, kind: 'boss-weapon' }), false);
      assert.equal(f.fx.getMetrics().weaponVisualDraws, 0);
      assert.equal(f.fx.getMetrics().missingProjectileAssets, 1);
    }
  } finally { f.close(); }
});

test('actual same-boss material stays visibly dense throughout the capsule and active-beam interior without geometric backing', async () => {
  const f = await materialFixture();
  try {
    for (let bossIndex = 5; bossIndex < 12; bossIndex++) for (const low of [false, true]) {
      const w = { campaign: true, bossIndex };
      f.ctx.clearRect(0, 0, 360, 100); f.fx.beginFrame();
      const body = { x: 40, y: 50, r: 6, halfLength: 12, kind: 'needle', age: 0, angle: 0 };
      let sourceDraws = 0;
      const noBacking = new Proxy(f.ctx, { get(target, key) {
        if (['fill', 'fillRect', 'stroke', 'strokeRect'].includes(key)) return () => { throw Error('geometric backing ' + key); };
        const value = target[key];
        if (key === 'drawImage') return (...args) => { sourceDraws++; return value.apply(target, args); };
        return typeof value === 'function' ? value.bind(target) : value;
      }, set(target, key, value) { target[key] = value; return true; } });
      assert.equal(f.fx.drawBullet(noBacking, w, body, low), true);
      assert.equal(sourceDraws, 1);
      let data = f.ctx.getImageData(0, 0, 360, 100).data;
      for (let x = 27; x <= 53; x++) for (let y = 47; y <= 52; y++) assert(data[(y * 360 + x) * 4 + 3] >= 240, `dense visible danger ${bossIndex}:${x},${y}`);
      assert.equal(data[(40 * 360 + 40) * 4 + 3], 0);
      const atStart = Buffer.from(data);
      f.ctx.clearRect(0, 0, 360, 100);
      assert.equal(f.fx.drawBullet(noBacking, w, { ...body, age: 100 }, low), true);
      assert.deepEqual(Buffer.from(f.ctx.getImageData(0, 0, 360, 100).data), atStart, 'static material does not pretend to be animated');
      f.ctx.clearRect(0, 0, 360, 100); f.fx.beginFrame();
      const beam = { phase: 'active', x1: 30, y1: 50, x2: 330, y2: 50, width: 10, progress: 0.2 };
      assert.equal(f.fx.drawHazardBody(noBacking, w, beam, low), true);
      data = f.ctx.getImageData(0, 0, 360, 100).data;
      for (let x = 32; x <= 328; x++) for (let y = 47; y <= 52; y++) assert(data[(y * 360 + x) * 4 + 3] >= 240, `no transparent damage interior ${bossIndex}:${x},${y}`);
      assert.equal(data[(40 * 360 + 180) * 4 + 3], 0);
      f.ctx.clearRect(0, 0, 360, 100);
      assert.equal(f.fx.drawHazardBody(noBacking, w, { ...beam, phase: 'warning' }, low), false);
      assert.equal(f.ctx.getImageData(180, 50, 1, 1).data[3], 0);
      assert(f.fx.getMetrics().stampCacheBytes <= 4 * 1024 * 1024);
    }
  } finally { f.close(); }
});

test('seven material palettes keep naming priority, explicit secondary use and dense-source detail within a bounded cache', async () => {
  const f = await materialFixture();
  try {
    assert.equal(API.paletteList.length, 19);
    assert.equal(API.paletteFor({bossIndex:11,finalPractice:true}).id,'cult-leader');
    assert.equal(API.paletteFor({ bossIndex: 11 }).primary, '#eee6d6', 'white-suit chairman keeps named white primary');
    const ids = ['belphegor', 'leviathan', 'beelzebub', 'asmodeus', 'mammon', 'wrath', 'pride'];
    for (let i = 5; i < 12; i++) {
      const w = { campaign: true, bossIndex: i }, p = API.paletteFor(w);
      assert.equal(p.id, ids[i - 5]);
      assert.equal(API.colorFor(w, { paletteSlot: 1 }), p.secondary);
      assert.equal(API.colorFor(w, { paletteSlot: 9 }), p.primary);
      f.fx.beginFrame();
      for (let n = 0; n < 768; n++) assert.equal(f.fx.drawBullet(f.ctx, w, { x: 40, y: 50, r: 3 + n % 6, halfLength: n % 12, kind: n % 2 ? 'needle' : 'orb', age: n / 60, angle: 0 }, true), true);
      const metrics = f.fx.getMetrics();
      assert.equal(metrics.texturedBullets, 768);
      assert.equal(metrics.missingProjectileAssets, 0);
      assert(metrics.stampCacheBytes <= 4 * 1024 * 1024);
      assert(metrics.stampCacheEntries <= 96);
      assert.equal(metrics.weaponVisualDraws, 0);
    }
    f.fx.destroy();
    assert(f.allocated.every(c => c.width === 1 && c.height === 1), 'every cached material and stamp surface is released');
  } finally { f.close(); }
});
