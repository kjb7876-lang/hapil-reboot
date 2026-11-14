'use strict';
/* 7전문가 심사(11-15 새벽, 6.51 두 번): 문양 바깥 고리가 칸 좌우·위 가장자리에서 잘린다, 하단의 직선 광선 여러 줄이 회피 공간을 조각낸다.
   문양은 칸 폭의 42% 안에 들고, 광선은 아래로 갈수록 옅어진다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 sigils fit the field: no sigil reaches further than 42% of the field width from the boss',()=>{
 const a=h.need(),firsts=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!firsts.has(g.actor)&&firsts.size<6)firsts.set(g.actor,i);});
 for(const [actor,i] of firsts){
  const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});let seen=0;
  for(let t=0;t<700&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
   for(const f of s.figures)if(f.sigil){seen++;for(const g of a.figureSegments(f))for(const [x,y] of [[g[0],g[1]],[g[2],g[3]]])assert(Math.hypot(x-f.cx,y-f.cy)<=a.WIDTH*.42+1,actor+' sigil reach '+Math.hypot(x-f.cx,y-f.cy).toFixed(0));}}
  assert(seen,actor+' raised a sigil');}
});

test('v43 beams fade toward the bottom of the field so the dodge space reads first',()=>{
 const las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(h.read('src/arcade-app-v43.js'))[0];
 assert(/BEAM_LOW_FADE/.test(las)&&/createLinearGradient/.test(las),'beam glow uses a fading gradient');
});
