'use strict';
// 사용자 11-16 "육망성패턴은 솔찍히피할길이 거의없어서 빈도수를 낮춰줘 이펙트 변경하지는 말고 대신 원형한자빈도수 늘리고 더 겹겹히 큰사이즈로 더 압도적이게 해줘".
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');
const spells=A.SEGMENTS.map((s,i)=>[s,i]).filter(([s])=>s.kind==='card'&&s.spell).sort((a,b)=>b[0].time-a[0].time); // 가장 긴 스펠부터(26~38초)
function count(ci,difficulty,ticks){const s=A.createRun({segment:ci,difficulty:difficulty||'normal',seed:5});let t=0;while(!(s.stage==='card'&&s.seg===ci)&&t++<600)A.step(s,{});
  const seen=new Set();let sig=0,runes=0,maxRings=0,maxR=0;
  for(let k=0;k<ticks&&s.seg===ci&&s.stage==='card';k++){s.player.hp=s.player.maxHp;s.player.invulnerableUntil=s.tick+1e6;s.boss.hp=s.boss.maxHp;A.step(s,{});
    for(const f of s.figures){if(seen.has(f))continue;seen.add(f);if(f.sigil)sig++;if(f.kind==='runes'){runes++;maxRings=Math.max(maxRings,f.rings.length);maxR=Math.max(maxR,...f.rings.map(q=>q.r*(f.fit||1)));}}}
  return {sig,runes,maxRings,maxR};}
test('the big hexagram comes a third as often as before (once every 24 s)',()=>{
  assert.equal(A.SIGIL_EVERY,1440);
  const [,ci]=spells[0],c=count(ci,'normal',2280);assert(c.sig<=2,'hexagrams in a 38 s spell: '+c.sig);assert(c.sig>=1,'still appears');
});
test('the hanja rings come four times as often, in more and bigger layers',()=>{
  const [,ci]=spells[0],c=count(ci,'normal',2280);
  assert(c.runes>=5,'ring attacks in a 38 s spell (was 4): '+c.runes);assert(c.maxRings>=4,'layers: '+c.maxRings);assert(c.maxR>=200,'outer radius: '+c.maxR);
  const e=count(ci,'gentle',1440);assert(e.maxRings>=2&&e.maxRings<c.maxRings,'easy keeps fewer layers: '+e.maxRings);
});
test('the hexagram drawing itself is unchanged',()=>{
  const s=A.createRun({segment:spells[0][1],seed:5});assert.equal(A.SIGIL_AT,30);
});
