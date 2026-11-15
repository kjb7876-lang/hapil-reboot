'use strict';
// 사용자 11-15 "서양쪽 적테마와서사,보스에 맞는것도 수묵화버전으로생성해서 아래에서 위로 나타나게" "그냥 모든테마에 맞게 만들어서 적용해줘".
// 모든 스테이지가 그 스테이지 서사·보스에 맞춘 서양 소재 셋을 가지며, 보스 맞춤 소재(첫째)는 한 바퀴에 두 번 나온다. 동양 소재·무기·보스 상징은 그대로 섞인다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
const WEST=['chalice','hexagram','skull','scythe','crown','chain','candle','key','hourglass','wing','horn','mirror','gear','bell','mask','rose','web','vial','eye','tower','book','cauldron'];
const EAST=['orchid','plum','bamboo','lotus','mountain','sun','moon','wave','whirl','flame','cloud'];

test('the engine knows every western subject with a silhouette that stays inside its drawing',()=>{
  assert.deepEqual(a.MOTIF_WEST.slice().sort(),WEST.slice().sort());
  WEST.forEach(k=>{const m=a.MOTIFS[k];assert(m&&m.size>=50&&m.size<=90,'size of '+k);assert(m.hit.length>=1,'hit of '+k);
    m.hit.forEach(c=>{assert(c[2]>0&&c[2]<=.9,'radius '+k);assert(Math.abs(c[0])+c[2]<=1.25&&Math.abs(c[1])+c[2]<=1.25,'circle inside the drawing: '+k+' '+c);});});
  assert(!a.MOTIFS.tiger,'no tiger');
});
test('every stage has three western subjects matched to its theme, and the boss-matched one comes twice per cycle',()=>{
  const used=new Set();
  for(let i=0;i<a.STAGES.length;i++){const t=a.stageMotifs(i),p=a.motifPlan(i);
    assert.equal(t.length,3,'three themed subjects at stage '+i);assert.equal(new Set(t).size,3,'distinct at stage '+i);
    t.forEach(k=>{assert(WEST.includes(k),'western subject '+k);assert(p.includes(k),'plan has '+k+' at stage '+i);used.add(k);});
    assert.equal(p[0],t[0],'the boss-matched subject opens the stage '+i);
    assert.equal(p.filter(k=>k===t[0]).length,2,'boss-matched subject twice at stage '+i);
    const west=p.filter(k=>WEST.includes(k)).length,east=p.filter(k=>EAST.includes(k)).length;
    assert(west>=4,'western subjects at stage '+i);assert(east>=4,'eastern subjects stay mixed at stage '+i);
    for(let k=1;k<p.length;k++)assert.notEqual(p[k],p[k-1],'no subject twice in a row at stage '+i);}
  WEST.forEach(k=>assert(used.has(k),k+' is used somewhere'));
});
test('bosses with a signature get the subject of that signature',()=>{
  const by=name=>a.STAGES.findIndex(g=>g.name.indexOf(name)>=0);
  assert.equal(a.stageMotifs(by('거미동굴'))[0],'web');assert.equal(a.stageMotifs(by('늪지대의 뿔악마'))[0],'horn');
  assert.equal(a.stageMotifs(by('나태의 집'))[0],'hourglass');assert.equal(a.stageMotifs(by('탐식의 주방'))[0],'cauldron');
  assert.equal(a.stageMotifs(by('붉은 하이힐'))[0],'rose');assert.equal(a.stageMotifs(by('타락천사 기사'))[0],'wing');
  assert.equal(a.stageMotifs(by('옥상의 순환'))[0],'key');assert.equal(a.stageMotifs(by('피로 물든 병원'))[0],'vial');
});
test('a western subject really rises in play and hurts on its shape',()=>{
  const g=a.STAGES[4];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;
  const s=a.createRun({difficulty:'normal',seed:3,segment:seg});let hit=null;
  for(let i=0;i<1200&&!hit;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:4});h.clear(s);hit=(s.risers||[]).find(q=>WEST.includes(q.kind)&&q.age>a.RISER_WARN+60&&!q.fade)||null;}
  assert(hit,'a western subject rose');assert.equal(hit.kind,a.stageMotifs(4)[0]);
  const c=a.MOTIFS[hit.kind].hit[0],hp=s.player.hp;s.player.x=hit.x+c[0]*hit.size;s.player.y=hit.y+c[1]*hit.size;s.player.invulnerableUntil=0;a.step(s,{dx:0,dy:0});assert.equal(s.player.hp,hp-1);
});
test('every western subject is drawn with the brush, in ink only',()=>{
  const art=fs.readFileSync(path.join(__dirname,'..','src/ink-motifs-v43.js'),'utf8');
  WEST.forEach(k=>assert.match(art,new RegExp('M\\.'+k+'=function')));
  assert.doesNotMatch(art,/#[0-9a-fA-F]{3,6}\b/,'no colour literals outside the ink and paper tones');
  const tones=[...art.matchAll(/'(\d+,\d+,\d+)'/g)].map(m=>m[1]);assert.deepEqual([...new Set(tones)].sort(),['242,233,214','252,249,243','30,26,24']);
});
// 심사 2차(카메라·구도): 영웅이 가운데 서 있어도 소재가 한쪽에만 솟지 않는다.
test('subjects rise on both sides of a hero who stays in the middle',()=>{
  const g=a.STAGES[13];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;
  const s=a.createRun({difficulty:'normal',seed:3,segment:seg});let left=0,right=0;
  for(let i=0;i<3000&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;s.player.x=a.WIDTH/2;a.step(s,{dx:0,dy:0});h.clear(s);
    for(const r of s.risers||[])if(r.age===1){if(r.x<a.WIDTH/2)left++;else right++;}}
  assert(left>=2&&right>=2,'both sides: '+left+' / '+right);assert(Math.max(left,right)<=2*Math.min(left,right)+1,'not lopsided: '+left+' / '+right);
});
