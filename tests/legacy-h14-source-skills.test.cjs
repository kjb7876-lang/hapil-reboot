'use strict';
// Actual retained hapil1 images + native CPU Canvas. These checks do not
// establish browser/GPU/mobile performance or natural gameplay difficulty.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', path.resolve(__dirname, '..')] }));
require('../src/projectiles.js'); require('../src/boss-skills.js');
const Projectiles = global.HapilProjectiles, Skills = global.HapilBossSkills;
const mediaText = fs.readFileSync(path.join(__dirname, '../src/media.js'), 'utf8');
const media = require('../tools/read-media-registry.cjs')();
const skillKeys = ['h14SkillViolet','h14SkillHorn','h14SkillBalrog','h14SkillMask','h14SkillLucifer','h14SkillSloth','h14SkillEnvy','h14SkillGlutton','h14SkillLust','h14SkillGreed','h14SkillWrath','h14SkillPride'];
const materialKeys = ['projectileBelphegorV13','projectileLeviathanV13','projectileBeelzebubV13','projectileAsmodeusV13','projectileMammonV13','projectileWrathV13','projectilePrideV13'];
const beamKeys = ['h14BeamSloth','h14BeamEnvy','h14BeamGlutton','h14BeamLust','h14BeamGreed','h14BeamWrath','h14BeamPride'];
async function fixture(keys) {
  const previous = global.document, allocated = [];
  global.document = { createElement(name) { assert.equal(name, 'canvas'); const c = createCanvas(1, 1); allocated.push(c); return c; } };
  const images = {};
  for (const key of [...new Set(keys)]) { assert(media[key], key + ' has a registered source'); images[key] = await loadImage(path.join(__dirname, '..', media[key])); }
  const c = createCanvas(360, 260), ctx = c.getContext('2d'), skills = Skills.create(images), projectiles = Projectiles.create(images);
  return { images, c, ctx, allocated, skills, projectiles, close() { skills.destroy(); projectiles.destroy(); global.document = previous; } };
}
function world(bossIndex, patch = {}) {
  return { campaign: true, bossIndex, stage: 'boss', phase: 0, tick: 100, boss: { x: 180, y: 100, action: 'recover', actionProgress: 0, releaseTick: -1, ...patch } };
}
function deepFreeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; }
function forbidGeometry(ctx, counter) {
  return new Proxy(ctx, { get(target, key) {
    if (['fill','fillRect','stroke','strokeRect','fillText'].includes(key)) return () => { throw Error('unexpected geometric effect ' + key); };
    const value = target[key];
    if (key === 'drawImage') return (...args) => { counter.count++; return value.apply(target, args); };
    return typeof value === 'function' ? value.bind(target) : value;
  }, set(target, key, value) { target[key] = value; return true; } });
}

test('twelve skill sources are their exact pinned hapil1 files, single-frame artwork with explicit dimensions and no foreign fallback', () => {
  const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/HAPIL1-FX-CANDIDATES-V14-20261029.json'), 'utf8'));
  assert.equal(candidates.sourceCommit, '43f9b257199f3cb25d81bf0ef3fdc8243f8dbd81');
  assert.equal(Skills.encounters.length, 12);
  for (let i = 0; i < 12; i++) {
    const entry = Skills.encounters[i], spec = entry.release, row = candidates.rows[i];
    assert.deepEqual(Skills.optionalAssetKeysForEncounter(i), [skillKeys[i]]);
    assert.deepEqual(Skills.assetKeysForEncounter(i), []);
    assert.equal(spec.key, skillKeys[i]); assert.equal(spec.authoredFrames, 1);
    const source = Object.values(row.roles).find(s => s.file === media[spec.key]);
    assert(source, 'registered skill belongs to the same actor row ' + i);
    const bytes = fs.readFileSync(path.join(__dirname, '..', source.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex'), source.gitBlobSHA);
    assert.deepEqual([spec.width, spec.height], source.dimensions);
    assert(spec.crop[0] >= 0 && spec.crop[1] >= 0 && spec.crop[0] + spec.crop[2] <= spec.width && spec.crop[1] + spec.crop[3] <= spec.height);
  }
  for (const i of [-1, 999, '3']) assert.deepEqual(Skills.optionalAssetKeysForEncounter(i), []);
  assert.deepEqual(Skills.optionalAssetKeysForEncounter(12),['cultDriveFold','cultDriveImpact','cultDriveStitch']);
  assert.deepEqual(Skills.encounters[1].release.crop, [31,67,83,151], 'Horn bone excerpt omits full surrounding circle');
  assert.deepEqual(Skills.encounters[11].release.crop, [174,142,154,267], 'Pride cross excerpt omits its outer ring');
});

test('source skill release appears only on a confirmed current event, not before firing, on a future event, or after its finite lifetime', async () => {
  const f = await fixture(skillKeys);
  try {
    for (let i = 0; i < 12; i++) {
      assert.equal(Skills.invalidOptionalAssetForEncounter(f.images, i), null);
      for (const [tick, expected] of [[-1,0],[101,0],[100,1],[71,1],[70,0]]) {
        const w = deepFreeze(world(i, { skillReleases: [{ tick, kind: 'orb', patternId: 'real-fixture', x: 180, y: 120 }] }));
        const before = JSON.stringify(w), calls = { count: 0 }; f.skills.beginFrame();
        f.skills.draw(forbidGeometry(f.ctx, calls), w, false);
        assert.equal(calls.count, expected, i + ':' + tick);
        assert.equal(f.skills.getMetrics().skillReleaseDraws, expected);
        assert.equal(JSON.stringify(w), before, 'presentation never mutates simulation');
      }
      f.skills.beginFrame(); f.skills.draw(f.ctx, world(i), false);
      assert.equal(f.skills.getMetrics().skillSourceDraws, 0, 'initial releaseTick=-1 never fakes a firing effect');
    }
  } finally { f.close(); }
});

test('compact skill presentation is bounded, source-only, below the player region, and releases its own cache', async () => {
  const f = await fixture(skillKeys);
  try {
    for (let i = 0; i < 12; i++) for (const low of [false, true]) {
      const records = Array.from({ length: 200 }, (_, n) => ({ tick: 100, kind: n % 2 ? 'laser' : 'orb', patternId: 'source-' + n, x: 170, y: 140 }));
      const w = world(i, { action: 'charge', actionProgress: .5, skillReleases: records });
      f.ctx.clearRect(0, 0, 360, 260); f.skills.beginFrame();
      const calls = { count: 0 }; f.skills.draw(forbidGeometry(f.ctx, calls), w, low);
      const metrics = f.skills.getMetrics();
      assert.equal(calls.count, low ? 4 : 8);
      assert.equal(metrics.skillSourceDraws, low ? 4 : 8);
      assert(Object.keys(metrics.sourceKeys).every(k => k === skillKeys[i]));
      assert.equal(f.ctx.getImageData(180, 245, 1, 1).data[3], 0, 'skill artwork does not occupy the player core region');
      assert(metrics.skillCacheBytes <= 2 * 1024 * 1024);
      assert(metrics.skillCacheEntries <= 24);
    }
    f.skills.destroy(); assert(f.allocated.every(c => c.width === 1 && c.height === 1));
  } finally { f.close(); }
});

test('missing optional skill pixels are omitted without shapes and transparent hidden RGB never becomes visible stripes', async () => {
  const f = await fixture(['h14SkillLucifer']);
  try {
    const w = world(4, { skillReleases: [{ tick: 100, kind: 'laser', x: 180, y: 120, patternId: 'actual-laser' }] });
    f.skills.beginFrame(); f.skills.draw(f.ctx, w, false);
    assert.equal(f.skills.getMetrics().skillLaserDraws, 1);
    const pixels = f.ctx.getImageData(0,0,360,260).data;
    assert(pixels.some((v,n) => n % 4 === 3 && v > 0));
    // Original (450,332) stores vivid RGB with alpha0. Its cropped/resampled
    // location is about (201,128); the cache must keep that location clear.
    assert.equal(f.ctx.getImageData(201,128,1,1).data[3], 0, 'hidden-RGB bar stays transparent inside the effect stamp');
    const missing = Skills.create({}), calls = { count: 0 };
    missing.beginFrame(); missing.draw(forbidGeometry(f.ctx,calls),w,false);
    assert.equal(calls.count,0); assert.equal(missing.getMetrics().skillMissingAssets,1);
    assert.equal(Skills.invalidOptionalAssetForEncounter({},4),'h14SkillLucifer'); missing.destroy();
    assert.equal(Skills.invalidOptionalAssetForEncounter({h14SkillLucifer:{complete:true,naturalWidth:1,naturalHeight:1}},4),'h14SkillLucifer');
  } finally { f.close(); }
});

test('all seven large HELL rotors use their own full source image and visual spin without changing physics or duplicating ordinary bullet draws', async () => {
  const f = await fixture([...materialKeys,...skillKeys.slice(5),'h14RotorGlutton','h24LustHeel','h24LustLipstick','h24LustBrokenHeart']);
  try {
    for (let i=5;i<12;i++) {
      const w=world(i), bullet={x:180,y:120,r:11,halfLength:0,kind:'hell-rotor',angle:Math.PI/2,vx:40,vy:90,age:0,spinAngle:0};
      f.ctx.clearRect(0,0,360,260); f.projectiles.beginFrame(); const original=JSON.stringify(bullet), calls={count:0};
      assert.equal(f.projectiles.drawBullet(forbidGeometry(f.ctx,calls),w,bullet,false),true);
      assert.equal(calls.count,i===8?1:2,'Lust is one independent whole prop; other rotors retain their original body plus own ornament');
      assert.equal(f.projectiles.getMetrics().rotorVisualDraws,1);
      assert.equal(f.projectiles.getMetrics().weaponVisualDraws,0);
      assert.equal(JSON.stringify(bullet),original,'visual rotation never mutates velocity, angle or radius');
      const first=Buffer.from(f.ctx.getImageData(155,95,50,50).data);
      f.ctx.clearRect(0,0,360,260); f.projectiles.drawBullet(f.ctx,w,{...bullet,spinAngle:Math.PI/2},false);
      assert.notDeepEqual(Buffer.from(f.ctx.getImageData(155,95,50,50).data),first,'own source visibly rotates');
      const ordinaryCalls={count:0}; f.projectiles.beginFrame();
      f.projectiles.drawBullet(forbidGeometry(f.ctx,ordinaryCalls),w,{...bullet,kind:'orb'},false);
      assert.equal(ordinaryCalls.count,1,'ordinary bullets keep their single live source draw');
    }
  } finally { f.close(); }
});

test('seven rotor warnings preview owned art; required natural bodies fail closed and absent ornaments never borrow another boss', async () => {
  const f=await fixture([...materialKeys,...skillKeys.slice(5),'h14RotorGlutton','h24LustHeel','h24LustLipstick','h24LustBrokenHeart']);
  try {
    for(let i=5;i<12;i++) {
      const w=world(i,{rotorTelegraph:true,hellOverlap:{warningTick:73,pairReleaseAt:127}});
      f.projectiles.beginFrame(); f.projectiles.drawBossCast(f.ctx,w,false);
      assert.equal(f.projectiles.getMetrics().rotorTelegraphDraws,2);
      assert.equal(f.projectiles.getMetrics().weaponTelegraphDraws,0);
      w.boss.rotorTelegraph=false; f.projectiles.beginFrame(); f.projectiles.drawBossCast(f.ctx,w,false);
      assert.equal(f.projectiles.getMetrics().rotorTelegraphDraws,0);
      const ownKey=i===8?'h24LustLipstick':i===7?'h14RotorGlutton':skillKeys[i],saved=f.images[ownKey]; delete f.images[ownKey];
      // A fresh renderer cannot retain an earlier cached ornament after failure.
      const missing=Projectiles.create(f.images);f.ctx.clearRect(0,0,360,260);missing.beginFrame();
      if(i!==7)assert.equal(Projectiles.invalidAssetForEncounter(f.images,i),ownKey,'a complete encounter cannot start without a newly required own source');
      if(i===6||i===8){assert.equal(missing.drawBullet(f.ctx,w,{x:180,y:120,r:11,halfLength:0,kind:'hell-rotor',spinAngle:0,angle:0},false),false);assert.equal(f.ctx.getImageData(180,120,1,1).data[3],0);assert.equal(missing.getMetrics().missingProjectileAssets,1,'missing mirror/heart body must not fall back to a geometric/material orb');}
      else{assert.equal(missing.drawBullet(f.ctx,w,{x:180,y:120,r:11,halfLength:0,kind:'hell-rotor',spinAngle:0,angle:0},false),true);assert(f.ctx.getImageData(180,120,1,1).data[3]>=240,'still-present owned orb remains visible');assert.equal(missing.getMetrics().missingOptionalRotorAssets,1);}
      assert.equal(missing.getMetrics().rotorVisualDraws,0);missing.destroy();f.images[ownKey]=saved;
    }
  } finally { f.close(); }
});

test('seven own-source beam ornaments obey the exact damage clip, retain dense material coverage, and use the current encounter palette', async () => {
  const f=await fixture([...materialKeys,...beamKeys]);
  try {
    for(let i=5;i<12;i++)for(const low of [false,true]) {
      const w=world(i),h={x1:30,y1:120,x2:330,y2:120,width:12,phase:'active',progress:.2};
      f.ctx.clearRect(0,0,360,260);f.projectiles.beginFrame();
      assert.equal(f.projectiles.drawHazardBody(f.ctx,w,h,low),true);
      const m=f.projectiles.getMetrics(),data=f.ctx.getImageData(0,0,360,260).data;
      assert.equal(m.sourceBeamOverlayDraws,1);assert.equal(m.assetLaserDraws,1);
      for(let x=34;x<327;x++)for(let y=117;y<=122;y++)assert(data[(y*360+x)*4+3]>=240,'source holes cannot become invisible damaging beam');
      assert.equal(data[(111*360+180)*4+3],0,'ornament cannot widen the visible hazard');
      if(i===6){const p=(120*360+180)*4;assert(data[p+1]>data[p],'native pink envy family is retinted to source-image teal');}
      if(i===11){const p=(120*360+180)*4;assert(data[p]>180&&data[p+1]>180,'named white chairman overrides native violet beam');}
      f.ctx.clearRect(0,0,360,260);f.projectiles.beginFrame();assert.equal(f.projectiles.drawHazardBody(f.ctx,w,{...h,phase:'warning'},low),false);
      assert.equal(f.projectiles.getMetrics().sourceBeamOverlayDraws,0);
      assert(f.projectiles.getMetrics().stampCacheBytes<=4*1024*1024);
    }
  } finally { f.close(); }
});
