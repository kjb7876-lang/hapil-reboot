'use strict';
// 사용자 11-15 "아래에서 수묵화풍 난,꽃,호랑이,산,해,달 등 동양화에 자주등장하는 것들도 수묵동양화풍으로 그려서 올라오면 피하게 해줘
// +적들 무기들+시그니처상징도 동양화수묵화풍으로 아래에서 올라와서 피하도록". 판정은 그림 실루엣을 따르고 공간은 남긴다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function cardRun(stage,difficulty,seed){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;return a.createRun({difficulty:difficulty||'normal',seed:seed||3,segment:seg});}
function hold(s,ticks,each){for(let i=0;i<ticks&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:4});if(each)each(s,i);h.clear(s);}return s;}
// 사용자 11-15 "호랑이만빼셈" "꽃도 넣고" "동적인것들위주로": 호랑이는 없고, 스테이지마다 움직이는 소재가 둘 이상이다.
const MOVING=['wave','whirl','flame','cloud'],NATURE=['orchid','plum','bamboo','lotus','mountain','sun','moon'].concat(MOVING),WEAPONS=['sword','spear'];

test('every stage sends up eastern-painting subjects, an enemy weapon and the boss emblem',()=>{
  const used=new Set();
  for(let i=0;i<a.STAGES.length;i++){const p=a.motifPlan(i);
    assert(p.filter(k=>NATURE.includes(k)).length>=2,'two nature subjects at stage '+i);assert(p.some(k=>WEAPONS.includes(k)),'a weapon');assert(p.filter(k=>MOVING.includes(k)).length>=2,'two moving subjects');assert(p.some(k=>!NATURE.includes(k)&&!WEAPONS.includes(k)),'a boss emblem');
    p.forEach(k=>{assert(a.MOTIFS[k]&&a.MOTIFS[k].hit.length,'known subject '+k);used.add(k);});}
  NATURE.concat(WEAPONS).forEach(k=>assert(used.has(k),k+' is used somewhere'));assert(!a.MOTIFS.tiger,'no tiger');
});
test('a subject is announced, rises from below the screen away from the hero, and leaves the upper field free',()=>{
  let seen=0,most=0,highest=a.HEIGHT;const s=cardRun(0,'normal');
  hold(s,2400,s=>{const R=s.risers||[];most=Math.max(most,R.length);
    for(const r of R){if(r.age===1){seen++;assert(Math.abs(r.x-s.player.x)>=80,'not under the hero');assert(r.y-r.size>=a.HEIGHT,'starts below the screen');}
      if(r.age<a.RISER_WARN)assert.equal(a.riserHits(s,r,r.x,r.y),false,'no hit while announced');
      highest=Math.min(highest,r.y-r.size);}});
  assert(seen>=3,'subjects rose: '+seen);assert(most<=2,'at most two at once');assert(highest>=a.HEIGHT*.25,'the top quarter stays free: '+highest);
});
test('touching the drawn shape hurts, the empty space beside it does not',()=>{
  const t=cardRun(0,'normal');let hit=null;
  for(let i=0;i<2400&&!hit;i++){t.player.invulnerableUntil=t.tick+999;t.boss.hp=t.boss.maxHp;a.step(t,{dx:0,dy:4});h.clear(t);hit=(t.risers||[]).find(q=>q.age>a.RISER_WARN+60&&!q.fade)||null;}
  assert(hit,'a risen subject');const c=a.MOTIFS[hit.kind].hit[0];
  assert.equal(a.riserHits(t,hit,hit.x+c[0]*hit.size,hit.y+c[1]*hit.size),true);assert.equal(a.riserHits(t,hit,hit.x+hit.size*2.2,hit.y),false);
  const hp=t.player.hp;t.player.x=hit.x+c[0]*hit.size;t.player.y=hit.y+c[1]*hit.size;t.player.invulnerableUntil=0;a.step(t,{dx:0,dy:0});assert.equal(t.player.hp,hp-1);
});
test('easy sends fewer subjects than normal',()=>{
  const tally=d=>{let k=0;for(let i=0;i<4;i++){const s=cardRun(i,d,9);hold(s,2400);k+=s.risen||0;}return k;};
  assert(tally('gentle')<tally('normal'));
});
test('the page loads the brush drawings and the app draws every subject through them',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),art=fs.readFileSync(path.join(root,'src/ink-motifs-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
  assert.match(html,/src\/ink-motifs-v43\.js/);assert(html.indexOf('ink-motifs-v43.js')<html.indexOf('arcade-app-v43.js'));
  NATURE.concat(WEAPONS,['coin','lips','glyph']).forEach(k=>assert.match(art,new RegExp('M\\.'+k+'=function')));
  assert.match(app,/function drawRisers\(/);
});
