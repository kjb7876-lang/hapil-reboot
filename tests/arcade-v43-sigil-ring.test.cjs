'use strict';
/* 사용자 11-15 18:42 KST(파란 육망성 캡처, 아래쪽 희미한 큰 원 띠에 빨간 표시): "그게 진하게 나오면서 돌아가면서 맞으면 피해를 입는걸 구현하고 픈거야".
   18:43 KST: "피할길 안남겨도 됨 그냥 공간만남겨도됨". 육망성 꼭짓점을 지나는 큰 원이 진한 판정선이 되고, 육망성과 함께 돈다. 원 아래 공간은 남긴다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const firsts=a=>{const m=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!m.has(g.actor)&&m.size<8)m.set(g.actor,i);});return m;};
function live(a,i,each){const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});
  for(let t=0;t<900&&s.seg===i;t++){if(s.stage==='card')s.boss.hp=s.boss.maxHp;s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);const f=s.figures.find(q=>q.sigil);if(f&&each(s,f)===false)break;}}
test('big hexagram carries a full circle through its tips as damaging segments, turning with it',()=>{
  const a=h.need();
  for(const [actor,i] of firsts(a)){let seen=0,turns=new Set();
    live(a,i,(s,f)=>{assert(f.ring>=36,actor+' ring segments: '+f.ring);const segs=a.figureSegments(f),ring=segs.slice(segs.length-f.ring);
      for(const g of ring){const d=Math.hypot(g[0]-f.cx,g[1]-f.cy);assert(Math.abs(d-f.r)<1,actor+' ring on the tip circle');}
      if(f.age>=f.warn){seen++;turns.add(Math.atan2(ring[0][1]-f.cy,ring[0][0]-f.cx).toFixed(2));}});
    assert(seen>60,actor+' ring live for a while');assert(turns.size>10,actor+' ring turns');}
});
test('the ring hurts on contact once live and leaves the space below it free',()=>{
  const a=h.need(),H=a.HEIGHT;let hit=false,warnHit=false,low=0;
  for(const [actor,i] of firsts(a)){
    live(a,i,(s,f)=>{const segs=a.figureSegments(f);for(const g of segs.slice(segs.length-f.ring))low=Math.max(low,g[1],g[3]);});}
  assert(low<=H*.8,'space left under the ring: '+low.toFixed(0));
  const i=[...firsts(a).values()][0],s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});
  for(let t=0;t<900&&s.seg===i&&!hit;t++){if(s.stage==='card')s.boss.hp=s.boss.maxHp;const f=s.figures.find(q=>q.sigil);
    if(f){s.player.x=Math.max(8,Math.min(a.WIDTH-8,f.cx));s.player.y=f.cy+f.r;}
    s.player.invulnerableUntil=-1;h.clear(s);const hp=s.player.hp;s.n=0;a.step(s,{dx:0,dy:0});
    if(f&&s.player.hp<hp){if(f.age<f.warn)warnHit=true;else hit=true;}s.player.hp=Math.max(s.player.hp,3);}
  assert(hit,'touching the live ring costs a life');assert(!warnHit,'warning ring is harmless');
});
test('app: tip nodes come from the hexagram only, and the ring is drawn bold (not faded out like the far glow)',()=>{
  const app=h.read('src/arcade-app-v43.js');
  assert(/f\.ring/.test(/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0]),'frame gets hexagram segments only');
  const mask=/function maskSigil\(f\)[\s\S]*?\n  \}/.exec(app)[0];assert(/SIGIL_RING_GLOW/.test(mask),'ring band kept bright in the mask');
  assert(+/SIGIL_RING_GLOW=([\d.]+)/.exec(app)[1]>=.85,'ring bold');
});
test('ring review 1 (6.83): decoration rings step back while live so only the bold ring reads as the hurting circle',()=>{
  const app=h.read('src/arcade-app-v43.js'),fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];
  assert(/SIGIL_DECOR_LIVE/.test(fr),'rune rings dimmed once live');assert(+/SIGIL_DECOR_LIVE=([\d.]+)/.exec(app)[1]<=.5,'clearly quieter');
});
