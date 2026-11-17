'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),intro=require('../src/arcade-boss-intros-v43.js'),arcade=require('../src/arcade-v43.js');
const bytes=fs.readFileSync(path.join(root,intro.SOURCE.file)),source=bytes.toString('utf8'),normalize=s=>s.replace(/\s+/g,' ').trim();
const parts=source.split(/^\[([^\]]+)\]\s*$/m),sections={};for(let i=1;i<parts.length;i+=2)sections[parts[i]]=parts[i+1];

test('all seven sins and their continued forms have an actor-specific entrance',()=>{
 const expected=[['p2_belphegor',13,'sloth'],['p2_leviathan',14,'envy'],['p2_beelzebub',15,'gluttony'],['asmodeus',16,'lust'],['p2_greed',17,'greed'],['p2_mammon',18,'greed'],['p2_wrath',19,'wrath'],['pride',20,'pride'],['p2_chairman',21,'pride'],['p2_core',21,'pride']];
 assert.deepEqual(intro.BOSS_ENTRANCES.map(e=>[e.actor,e.stage,e.sin]),expected);
 assert.equal(new Set(intro.BOSS_ENTRANCES.map(e=>e.sin)).size,7);
 for(const entry of intro.BOSS_ENTRANCES){
  assert.equal(intro.getBoss(entry.actor,entry.stage),entry);assert.equal(intro.isSinBoss(entry.actor),true);
  assert(arcade.SEGMENTS.some(s=>s.kind==='card'&&s.stage===entry.stage&&s.actor===entry.actor));
  assert.equal(entry.bossName,arcade.ACTORS[entry.actor].name);
 }
 assert.equal(intro.isSinBoss('p2_chairman'),true,'continued pride form is eligible even when classified as midboss');
 for(const actor of ['spider','mb_02','mb_24','violet','unknown',null,{}])assert.equal(intro.isSinBoss(actor),false);
 assert.equal(intro.getBoss('p2_belphegor',14),null);assert.equal(intro.getBoss('p2_belphegor','13'),null);assert.equal(intro.getBoss('unknown',13),null);
});

test('adapted dialogue is explicitly marked and grounded in verbatim section evidence',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),intro.SOURCE.sha256);
 for(const entry of intro.BOSS_ENTRANCES){
  assert.equal(entry.kind,'dialogue-adaptation');assert.equal(entry.sourceFile,intro.SOURCE.file);
  assert.equal(entry.sourceSection,arcade.STAGES[entry.stage].name);assert(sections[entry.sourceSection]);
  assert(entry.sourceExcerpts.length>=2);
  for(const excerpt of entry.sourceExcerpts)assert(normalize(sections[entry.sourceSection]).includes(normalize(excerpt)),entry.actor+': '+excerpt);
  assert.equal(entry.lines.length,2);
  for(const line of entry.lines){assert.equal(line.speaker,entry.bossName);assert(line.text.length>0&&line.text.length<=60);assert(Object.isFrozen(line));}
  assert(Object.isFrozen(entry)&&Object.isFrozen(entry.lines)&&Object.isFrozen(entry.sourceExcerpts));
 }
});

test('one stage can present the chairman and core with separate dialogue',()=>{
 const chairman=intro.getBoss('p2_chairman',21),core=intro.getBoss('p2_core',21);
 assert.notEqual(chairman,core);assert.notDeepEqual(chairman.lines,core.lines);
 assert.equal(chairman.sourceSection,core.sourceSection);
 assert.equal(chairman.sin,core.sin);
});

test('browser integration exposes the same API without changing the canonical story module',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/arcade-boss-intros-v43.js'),'utf8'),context);
 assert.equal(context.HapilArcadeBossIntros.getBoss('pride',20).kind,'dialogue-adaptation');
 assert.equal(context.HapilArcadeBossIntros.BOSS_ENTRANCES.length,10);
 assert.equal(context.HapilArcadeStory,undefined);
});

