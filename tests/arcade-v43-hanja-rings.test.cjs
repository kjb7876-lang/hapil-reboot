'use strict';
// 한자문 고리(사용자 11-15 "보스뒤에 나오는 저 원들 톱니처럼도는거 크기를 키우고 굵게해서 패턴용으로 만들라니까 안에는 한자 적어놓고 …",
// "한자문으로 만들어서 넣어 단순 한자 한글자 반복하지말고")와 패턴 끝 탄 지우기 쿨타임("하트모으면 탄모두없어지는거 쿨타임 1분", 카드 답: 패턴 깰 때).
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const A=require('../src/arcade-v43.js'),app=h.read('src/arcade-app-v43.js');
const firstSpell=actor=>A.SEGMENTS.findIndex(s=>s.kind==='card'&&s.spell&&(!actor||s.actor===actor));
function toCard(ci,difficulty){const s=A.createRun({segment:ci,difficulty:difficulty||'normal',seed:9});for(let t=0;t<600&&!(s.stage==='card'&&s.seg===ci);t++)A.step(s,{});return s;}
function hold(s){s.player.hp=s.player.maxHp;s.player.invulnerableUntil=s.tick+1e6;}
const live=f=>f.age>=f.warn&&f.age<f.warn+f.active;

test('during a named spell the boss raises two big turning rune rings that hurt, the outer one far larger than the old decorative ring',()=>{
  const ci=firstSpell(),s=toCard(ci);let rf=null;
  for(let t=0;t<900&&!rf;t++){hold(s);A.step(s,{});rf=s.figures.find(f=>f.kind==='runes'&&live(f));}
  assert(rf,'a live rune ring figure appears');
  const radii=rf.rings.map(q=>q.r).sort((a,b)=>b-a);assert.equal(radii.length,2);
  assert(radii[0]>=168&&radii[0]<=180,'outer ring is larger than the old decorative ring (153) but fits the 360 field (review 11-15: 200 was cut off)');assert(rf.width>=16,'the band is bold');
  assert(rf.rings.every(q=>q.n>=3&&q.gap>0),'each ring has gaps like a gear');
  assert(rf.rings[0].dir!==rf.rings[1].dir,'the two rings turn in opposite directions');
  // 켜지는 순간 두 고리 모두 틈 하나가 바로 아래(영웅 쪽)를 본다
  for(const q of rf.rings){const rot=rf.turn*q.dir+q.phase;let bd=9;for(let k=0;k<q.n;k++){const a=rot+2*Math.PI*k/q.n;bd=Math.min(bd,Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2))));}
    assert(bd<q.gap/2,'a gap faces the hero at ignition ('+bd.toFixed(2)+')');}
});

test('the rune rings hurt on the band but not in a gap',()=>{
  const ci=firstSpell(),s=toCard(ci);let rf=null;
  for(let t=0;t<900&&!rf;t++){hold(s);A.step(s,{});rf=s.figures.find(f=>f.kind==='runes'&&f.age>=f.warn+5);}
  assert(rf);
  const q=rf.rings[0],rot=rf.turn*q.dir+q.phase;
  // 아래쪽(영웅 쪽)에 가장 가까운 틈과 띠 가운데
  let best=0,bd=9;for(let k=0;k<q.n;k++){const a=rot+2*Math.PI*k/q.n,d=Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)));if(d<bd){bd=d;best=k;}}
  const gapA=rot+2*Math.PI*best/q.n,bandA=gapA+Math.PI/q.n;
  const R=q.r*(rf.fit||1),at=(a)=>({x:rf.cx+Math.cos(a)*R,y:rf.cy+Math.sin(a)*R});
  function hurtsAt(pt){const c=Object.assign(Object.create(Object.getPrototypeOf(s)),s);
    const t=A.createRun({segment:ci,seed:9});Object.keys(s).forEach(k=>{t[k]=s[k];});
    t.figures=[Object.assign({},rf,{age:rf.warn+5})];t.lasers=[];t.n=0;t.mobs=[];t.player=Object.assign({},s.player,{x:pt.x,y:pt.y,invulnerableUntil:0,hp:5});t.floor.pieces=[];
    const h0=t.hits;A.step(t,{});return t.hits>h0;}
  const g=at(gapA),b=at(bandA);
  if(g.x>10&&g.x<350&&g.y>45&&g.y<600)assert.equal(hurtsAt(g),false,'the gap is safe');
  assert.equal(hurtsAt(b),true,'the band hurts');
});

test('the rune rings and the big hexagram never hurt at the same time, and only spells raise rings',()=>{
  for(const diff of ['gentle','normal','hell']){
    const ci=firstSpell('balrog'),s=toCard(ci,diff);let both=0,seen=0;
    for(let t=0;t<2400&&s.seg===ci;t++){hold(s);A.step(s,{});
      const r=s.figures.some(f=>f.kind==='runes'&&live(f)),g=s.figures.some(f=>f.sigil&&live(f));if(r)seen++;if(r&&g)both++;}
    assert(seen>0,diff+': rings went live');assert.equal(both,0,diff+': never both live');
  }
  const plain=A.SEGMENTS.findIndex(s=>s.kind==='card'&&!s.spell),s=toCard(plain);
  for(let t=0;t<900&&s.seg===plain;t++){hold(s);A.step(s,{});assert(!s.figures.some(f=>f.kind==='runes'),'no rings in a plain pattern');}
});

test('the outer ring stays inside the side walls wherever the boss stands (review 11-15: it was cut off)',()=>{
  const ci=firstSpell(),s=toCard(ci);let n=0;
  for(let t=0;t<2400&&s.seg===ci;t++){hold(s);A.step(s,{});const rf=s.figures.find(f=>f.kind==='runes'&&live(f));if(!rf)continue;n++;
    const R=Math.max(...rf.rings.map(q=>q.r))*(rf.fit||1);assert(rf.cx-R>=8&&rf.cx+R<=352,'inside walls: cx '+rf.cx.toFixed(0)+' R '+R.toFixed(0));assert(R>=150,'still big: '+R.toFixed(0));}
  assert(n>0);
});

test('easy mode keeps only the outer ring',()=>{
  const ci=firstSpell(),s=toCard(ci,'gentle');let rf=null;
  for(let t=0;t<900&&!rf;t++){hold(s);A.step(s,{});rf=s.figures.find(f=>f.kind==='runes');}
  assert(rf);assert.equal(rf.rings.length,1);
});

test('every boss has its own Classical Chinese verse for the rings, not one character repeated',()=>{
  const m=app.match(/var RUNE_VERSES=\{([\s\S]*?)\};/);assert(m,'RUNE_VERSES table');
  const pairs=[...m[1].matchAll(/(\w+):'([^']+)'/g)].map(x=>[x[1],x[2]]);const map=Object.fromEntries(pairs);
  const actors=[...new Set(A.SEGMENTS.filter(s=>s.kind==='card').map(s=>s.actor))];
  const seen=new Set();
  for(const a of actors){const v=map[a];assert(v,'verse for '+a);const han=[...v].filter(c=>/\p{Script=Han}/u.test(c));
    assert(han.length>=8,a+': at least 8 characters');assert(new Set(han).size>=6,a+': not a single character repeated');
    assert(!seen.has(v),a+': verse is unique');seen.add(v);}
});

test('the drawn rune ring writes the boss verse, and the decorative ring steps aside while the attack rings are up',()=>{
  assert.match(app,/function drawRunes\(/);assert.match(app,/RUNE_VERSES\[/);assert.match(app,/fillText\(/);
  assert.match(app,/f\.kind==='runes'/,'drawFigures hands rune figures to drawRunes');
  const d=app.match(/function drawRunes\(s,f\)\{([\s\S]*?)\n  \}/);assert(d,'drawRunes body');
  assert.match(d[1],/if\(warn\)\{[\s\S]{0,500}setLineDash/,'the warning is a dashed outline');
  assert.match(d[1],/y<78/,'no verse letters over the HUD strip');
});

test('the bullet wipe when a pattern ends happens at most once a minute; in between bullets stay',()=>{
  assert.equal(A.WIPE_COOLDOWN,3600);
  const plain=A.SEGMENTS.findIndex(s=>s.kind==='card'&&!s.spell&&A.SEGMENTS[A.SEGMENTS.indexOf(s)+1]&&A.SEGMENTS[A.SEGMENTS.indexOf(s)+1].kind==='card');
  const s=toCard(plain);
  function breakNow(){for(let t=0;t<1200&&!(s.stage==='card'&&s.segTick>240&&s.n>20);t++){hold(s);A.step(s,{});}
    assert(s.stage==='card'&&s.n>20,'bullets on screen before the break');s.boss.hp=0;hold(s);A.step(s,{});return s.n;}
  assert.equal(breakNow(),0,'first break wipes the screen');
  const left=breakNow();assert(left>0,'a second break within a minute keeps the bullets ('+left+')');
  assert(!s.figures.length&&!s.lasers.filter(l=>!l.floor).length,'boss lasers and figures still end with the pattern');
  s.lastWipe=s.tick-3600;assert.equal(breakNow(),0,'after a minute the wipe is back');
});
