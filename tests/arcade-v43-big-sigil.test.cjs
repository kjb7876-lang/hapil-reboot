'use strict';
/* 사용자 11-15 10:09 KST(3스테이지 뿔악마 화면): "이거뒤에 육망성문양을 맵을 거의 다 덮을정도로 키운다음 거기에 닿으면 체력달게하라고 이상한레이져 생성하지말고".
   보스 뒤 육망성 하나를 맵 대부분을 덮게 키우고, 그 선 자체가 판정을 갖는다. 따로 도는 고리 레이저는 만들지 않는다.
   피할 자리: 꼭짓점은 화면 아래 띠(영웅이 서는 줄)까지 내려오지 않고, 켜지기 전에 예고한다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

function watch(a,i,ticks,each){const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1}),seen=[];
 for(let t=0;t<ticks&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
  for(const f of s.figures)if(f.sigil)seen.push({glyph:f.glyph,turn:f.turn,warn:f.warn,age:f.age,active:f.age>=f.warn&&f.age<f.warn+f.active,cx:f.cx,cy:f.cy,segs:a.figureSegments(f)});if(each)each(s);}
 return seen;}
const firsts=a=>{const m=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!m.has(g.actor)&&m.size<8)m.set(g.actor,i);});return m;};

test('v43 big sigil: each boss spell raises one hexagram that covers most of the field, and no extra ring lasers',()=>{
 const a=h.need();
 for(const [actor,i] of firsts(a)){const seen=watch(a,i,900);assert(seen.length,actor+' raises the sigil');
  assert(seen.every(f=>f.glyph==='hexagram'),actor+' uses the hexagram: '+[...new Set(seen.map(f=>f.glyph))]);
  const reach=f=>Math.max(...f.segs.flatMap(g=>[Math.hypot(g[0]-f.cx,g[1]-f.cy),Math.hypot(g[2]-f.cx,g[3]-f.cy)]));
  assert(seen.every(f=>reach(f)>=a.WIDTH*.85),actor+' sigil reach '+Math.min(...seen.map(reach)).toFixed(0));
  const act=seen.filter(f=>f.active);assert(act.length>60,actor+' sigil stays live for a while');
  assert(new Set(act.map(f=>f.turn.toFixed(3))).size>10,actor+' sigil turns while live');}
});

test('v43 big sigil is fair: it warns first and leaves the hero\'s band at the bottom free',()=>{
 const a=h.need(),H=a.HEIGHT;
 for(const [actor,i] of firsts(a)){const seen=watch(a,i,900);
  assert(seen.every(f=>f.warn>=54),actor+' warns');
  const low=Math.max(...seen.flatMap(f=>f.segs.flatMap(g=>[g[1],g[3]])));
  assert(low>=H*.6,actor+' really reaches down the field: '+low.toFixed(0));
  assert(low<=H*.8,actor+' leaves the bottom band free: '+low.toFixed(0));}
});

test('v43 big sigil hurts on contact once live, not while it is only a warning',()=>{
 const a=h.need(),i=[...firsts(a).values()][0],s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});
 let hitLive=false,hitWarn=false;
 for(let t=0;t<900&&s.seg===i&&!hitLive;t++){if(s.stage==='card')s.boss.hp=s.boss.maxHp;
  s.bombs=0; // 육망성이 24초마다 한 번뿐이라(사용자 11-16 빈도 낮춤) 맞을 때 자동 필살기가 그 한 번을 지우지 않게
  const f=s.figures.find(q=>q.sigil);
  if(f){const g=a.figureSegments(f)[0],mx=(g[0]+g[2])/2,my=(g[1]+g[3])/2;
   if(mx>8&&mx<a.WIDTH-8&&my>8&&my<a.HEIGHT-8){s.player.x=mx;s.player.y=my;}}
  s.player.invulnerableUntil=-1;h.clear(s);const hp=s.player.hp;s.n=0;a.step(s,{dx:0,dy:0});
  if(f&&s.player.hp<hp){if(f.age<f.warn)hitWarn=true;else hitLive=true;}
  s.player.hp=Math.max(s.player.hp,3);}
 assert(hitLive,'touching a live sigil line costs a life');assert(!hitWarn,'the warning outline is harmless');
});

test('v43 big sigil reads as a hazard once live: stronger than its faint warning, with a dark edge under the line',()=>{
 const app=h.read('src/arcade-app-v43.js'),fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/SIGIL_LIVE/.test(fig),'live sigil alpha');assert(+/SIGIL_LIVE=([\d.]+)/.exec(app)[1]>=.8,'live sigil clearly visible');
 assert(/SIGIL_EDGE/.test(fig),'dark edge under live sigil lines');
});
test('while the big hexagram is up the boss raises no other laser (user 11-15: no odd lasers; review 6.50)',()=>{
  const a=h.need();let checked=0;
  for(const [actor,i] of firsts(a)){let prev=null;
    watch(a,i,900,s=>{const up=s.figures.some(f=>f.sigil);const n=s.lasers.filter(l=>l.age===0).length;if(up&&prev===true){assert.equal(n,0,actor+' new laser while hexagram up');checked++;}prev=up;});}
  assert(checked>200,'hexagram was up long enough to check: '+checked);
});
