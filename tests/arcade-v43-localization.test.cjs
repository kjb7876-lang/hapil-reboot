'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Arcade = require('../src/arcade-v43.js');
const BossLines = require('../src/arcade-boss-lines-v43.js');
const Story = require('../src/arcade-story-v43.js');
const Intros = require('../src/arcade-boss-intros-v43.js');
const Chapters = require('../src/arcade-chapters-v43.js');
const Heroes = require('../src/arcade-heroes-v43.js');
const Phases = require('../src/arcade-boss-phases-v43.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'arcade.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(src\/arcade-i18n[^"?]+)/g)].map(m => m[1]);
const locales = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant', 'es', 'pt-BR'];
const hangul = /[가-힣]/;

function browser(languages, search = '', storage = new Map()) {
  const sandbox = {navigator: {language: languages[0], languages}, location: {search}, URLSearchParams,
    localStorage: {getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val)}};
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  return sandbox;
}

function boot(...args) {
  return browser(...args).HapilI18n;
}

function placeholders(text) {
  return [...new Set(text.match(/\{\w+\}/g) || [])].sort();
}

function checkContent(sources, label) {
  const i18n = boot(['ko-KR']);
  const expected = [...new Set(sources.filter(source => typeof source === 'string' && hangul.test(source)))];
  assert(expected.length > 0);
  for (const locale of locales.slice(1)) {
    i18n.set(locale);
    const untranslated = expected.filter(source => {
      const translated = i18n.text(source);
      return !translated || hangul.test(translated);
    });
    assert.deepEqual(untranslated, [], `${locale}: ${label}`);
  }
}

test('the device language, saved choice and explicit URL work across regional variants', () => {
  for (const [tag, code] of [['ja-JP','ja'], ['ko-KR','ko'], ['zh-CN','zh-Hans'], ['zh-TW','zh-Hant'],
    ['zh-HK','zh-Hant'], ['es-MX','es'], ['pt-BR','pt-BR'], ['en-GB','en'], ['fi-FI','en']]) {
    assert.equal(boot([tag]).lang, code, tag);
  }
  const store = new Map();
  const first = boot(['ja-JP'], '', store);
  assert.deepEqual(Object.keys(first.LANGS).sort(), locales.slice().sort());
  first.set('zh-Hant');
  assert.equal(boot(['en-US'], '', store).lang, 'zh-Hant');
  assert.equal(boot(['en-US'], '?lang=es', store).lang, 'es');
});

test('all UI messages are present with the right interpolation tokens and live controls', () => {
  const i18n = boot(['ko-KR']);
  for (const code of locales) {
    const translated = i18n.DICT[code];
    const issues = [];
    for (const [key, source] of Object.entries(i18n.DICT.ko)) {
      const message = translated[key];
      if (!message || (code !== 'ko' && hangul.test(message))) issues.push(`${key} untranslated`);
      else if (placeholders(source).join() !== placeholders(message).join()) issues.push(`${key} placeholders`);
    }
    assert.deepEqual(issues, [], code);
    for (const key of ['rulesBody', 'controls', 'pauseHelp']) {
      for (const action of ['focus', 'bomb']) assert.match(translated[key], new RegExp(`data-keyl=["']?${action}\\b`), `${code}/${key}/${action}`);
    }
    for (const id of ['title-stars', 'title-stars-max', 'title-best']) assert(translated.starsBest.includes(`id="${id}"`), `${code}/${id}`);
  }
});

test('bundled source-string translations preserve every interpolation token', () => {
  const sandbox = browser(['ko-KR']);
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
  const policyCatalog = privacy.match(/<script src="(src\/arcade-i18n-privacy[^"?]+)/)[1];
  vm.runInContext(fs.readFileSync(path.join(root, policyCatalog), 'utf8'), sandbox);
  const issues = [];
  for (const [name, rows] of Object.entries(sandbox).filter(([name]) => name.startsWith('HapilLocale') && name !== 'HapilLocaleUI')) {
    assert(Array.isArray(rows) && rows.length, name);
    for (const row of rows) {
      assert.equal(row.length, locales.length, `${name}: ${row[0]}`);
      for (const [index, value] of row.entries()) {
        if (typeof value !== 'string' || !value.trim() || placeholders(value).join() !== placeholders(row[0]).join()) {
          issues.push(`${name}/${locales[index]}: ${row[0]} → ${value}`);
        }
      }
    }
  }
  assert.deepEqual(issues, []);
});

test('each entrance, form change, reply, and story memory has localized text', () => {
  const sources = [...BossLines.LINES, BossLines.getReply('asmodeus', 14), ...Chapters.TITLES, ...Story.FINALE.title.split(' — ')];
  const entries = [...Story.STAGES, ...Story.TRANSITIONS, Story.PROLOGUE, Story.FINALE, Chapters.PART8, ...Intros.BOSS_ENTRANCES];
  for (const entry of entries) {
    sources.push(entry.title, entry.speaker);
    for (const line of entry.lines) sources.push(line.speaker, line.text);
  }
  checkContent(sources, 'story and dialogue');
});

test('the playable stage list, enemies, named patterns, rewards, and hero weapons are available in every language', () => {
  const sources = [...Object.values(Arcade.ACTOR_TITLES), ...Phases.KINDS.map(p => p.name)];
  for (const stage of Arcade.STAGES) sources.push(stage.name, stage.reward?.name);
  for (const card of Arcade.SEGMENTS.filter(segment => segment.kind === 'card')) {
    sources.push(card.name, card.title, Arcade.ACTORS[card.actor]?.name);
  }
  for (const hero of Heroes.list()) sources.push(hero.name, hero.attackName, hero.shotLabel, ...hero.bombNames);
  checkContent(sources, 'gameplay content');
});
