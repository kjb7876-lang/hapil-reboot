'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),intro=require('../src/arcade-boss-intros-v43.js'),arcade=require('../src/arcade-v43.js');
const bytes=fs.readFileSync(path.join(root,intro.SOURCE.file)),source=bytes.toString('utf8'),normalize=s=>s.replace(/\s+/g,' ').trim();
const parts=source.split(/^\[([^\]]+)\]\s*$/m),sections={};for(let i=1;i<parts.length;i+=2)sections[parts[i]]=parts[i+1];

test('all seven sins and their continued forms have an actor-specific entrance',()=>{
 const expected=[['p2_belphegor',11,'sloth'],['p2_leviathan',12,'envy'],['p2_beelzebub',13,'gluttony'],['asmodeus',14,'lust'],['p2_greed',15,'greed'],['p2_mammon',16,'greed'],['p2_wrath',17,'wrath'],['pride',18,'pride'],['p2_chairman',19,'pride'],['p2_core',19,'pride']];
 assert.deepEqual(intro.BOSS_ENTRANCES.map(e=>[e.actor,e.stage,e.sin]),expected);
 assert.equal(new Set(intro.BOSS_ENTRANCES.map(e=>e.sin)).size,7);
 for(const entry of intro.BOSS_ENTRANCES){
  assert.equal(intro.getBoss(entry.actor,entry.stage),entry);assert.equal(intro.isSinBoss(entry.actor),true);
  assert(arcade.SEGMENTS.some(s=>s.kind==='card'&&s.stage===entry.stage&&s.actor===entry.actor));
  assert.equal(entry.bossName,arcade.ACTORS[entry.actor].name);
 }
 assert.equal(intro.isSinBoss('p2_chairman'),true,'continued pride form is eligible even when classified as midboss');
 for(const actor of ['spider','mb_02','mb_24','violet','unknown',null,{}])assert.equal(intro.isSinBoss(actor),false);
 assert.equal(intro.getBoss('p2_belphegor',12),null);assert.equal(intro.getBoss('p2_belphegor','11'),null);assert.equal(intro.getBoss('unknown',11),null);
});

test('adapted dialogue is explicitly marked and grounded in verbatim section evidence',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),intro.SOURCE.sha256);
 for(const entry of intro.BOSS_ENTRANCES){
  assert.equal(entry.kind,'canon-monologue');assert.equal(entry.sourceFile,intro.SOURCE.file);
  assert.equal(entry.sourceSection,arcade.STAGES[entry.stage].name);assert(sections[entry.sourceSection]);
  assert(entry.sourceExcerpts.length>=2);
  for(const excerpt of entry.sourceExcerpts)assert(normalize(sections[entry.sourceSection]).includes(normalize(excerpt)),entry.actor+': '+excerpt);
  assert.equal(entry.lines.length,2);
  for(const line of entry.lines){assert(normalize(sections[entry.sourceSection]).includes(normalize(line.text)),"monologue must be verbatim: "+line.text);assert.equal(line.speaker,"EGO의 기억");assert(line.text.length>0&&line.text.length<=60);assert(Object.isFrozen(line));}
  assert(Object.isFrozen(entry)&&Object.isFrozen(entry.lines)&&Object.isFrozen(entry.sourceExcerpts));
 }
});

test('one stage can present the chairman and core with separate dialogue',()=>{
 const chairman=intro.getBoss('p2_chairman',19),core=intro.getBoss('p2_core',19);
 assert.notEqual(chairman,core);assert.notDeepEqual(chairman.lines,core.lines);
 assert.equal(chairman.sourceSection,core.sourceSection);
 assert.equal(chairman.sin,core.sin);
});

test('browser integration exposes the same API without changing the canonical story module',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/arcade-boss-intros-v43.js'),'utf8'),context);
 assert.equal(context.HapilArcadeBossIntros.getBoss('pride',18).kind,'canon-monologue');
 assert.equal(context.HapilArcadeBossIntros.BOSS_ENTRANCES.length,10);
 assert.equal(context.HapilArcadeStory,undefined);
});


test('all 56 boss entrance lines stay mapped to the 52 stages and their form changes',()=>{
 const lines=require('../src/arcade-boss-lines-v43.js');
 assert.equal(lines.LINES.length,56);assert.equal(new Set(lines.LINES).size,56);assert.equal(lines.ENTRANCE.length,arcade.STAGES.length);assert.equal(arcade.STAGES.length,52);
 for(const t of lines.LINES){assert(t.length>=3&&t.length<=80,t);assert(!/,,|그떄|불가할/.test(t),t);}
 // 등장 대사는 스테이지마다 하나, 합쳐진 보스의 나머지 대사는 모습이 바뀔 때 나온다
 const used=[];
 for(let i=0;i<52;i++){const l=lines.getLine('any',i);assert.equal(l.text,lines.LINES[lines.ENTRANCE[i]-1]);used.push(lines.ENTRANCE[i]);}
 for(const k of Object.keys(lines.SHIFT))lines.SHIFT[k].forEach((n,j)=>{assert.equal(lines.getShiftLine(+k,j+1).text,lines.LINES[n-1]);used.push(n);});
 assert.deepEqual(used.sort((a,b)=>a-b),Array.from({length:56},(_,i)=>i+1),'사용자 대사 56줄이 모두 한 번씩 쓰인다');
 assert.equal(lines.getLine('any',52),null);assert.equal(lines.getShiftLine(0,1),null);
 // 사용자 지정: 루시퍼 세 대사, 한리안과 백이온 대사는 교주 앞 스테이지로
 assert.equal(lines.getLine('p1_seraph',9).text,'권능이란 내가 원하는 모든 존재를 소멸시킬 수 있는 전능함이로다!');
 assert.equal(lines.getShiftLine(9,1).text,'세상을 수호할 자는 너뿐이라고 했거늘, 어찌하여 믿음을 버리는 것인가.');
 assert.equal(lines.getShiftLine(9,2).text,'오만과 두려움, 그리고 죄책감… 견딜 수 있겠는가?');
 assert.equal(lines.getLine('rian',49).text,'언제나 죽음보다 삶이 낫지 않겠는가!');assert(arcade.SEGMENTS.some(g=>g.stage===49&&g.kind==='card'&&!g.mid&&g.actor==='rian'));assert(arcade.SEGMENTS.some(g=>g.stage===51&&g.kind==='card'&&g.actor==='cultist'));
 assert.equal(lines.getLine('cultist',50).text,'유토피아, 그것을 너희에게 선사해 주마!');
 assert.equal(lines.getLine('cultist',51).text,'고통을 없애 주겠다!');
});

test('only the Asmodeus entrance adds a player reply, with the requested wording',()=>{
 const lines=require('../src/arcade-boss-lines-v43.js');
 const visits=new Set(arcade.SEGMENTS.filter(g=>g.kind==='card'&&!g.mid&&lines.getReply(g.actor,g.stage)).map(g=>g.stage+':'+g.actor));
 assert.deepEqual([...visits],['14:asmodeus']);
 assert.equal(lines.getReply('asmodeus',13),null);
 assert.equal(lines.getReply('p2_archon',14),null);
 assert.equal(lines.getLine('asmodeus',14).text,'사랑이 뭘까?');
 assert.equal(lines.getReply('asmodeus',14),'사랑은 돌아오는거야!');
});
