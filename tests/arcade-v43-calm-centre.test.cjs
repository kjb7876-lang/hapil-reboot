'use strict';
/* 7전문가 심사(11-15 새벽, 6.53): 루시퍼처럼 바깥 탄 고리가 큰 보스는 가운데 3분의 1 끝에 서면 고리가 칸 밖으로 잘린다,
   붉은 광선 흰 심지(70%)가 아직 탄보다 밝다, PC 패널은 블록이 흩어져 보이니 위에서부터 붙여 쌓고 남는 자리는 아래로 모아라(일곱 중 다섯). */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 framing: during spells the boss sways at most 60px either side of centre (a tighter 36px broke the wave/boss pressure balance)',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);
 const s=a.createRun({difficulty:'normal',seed:11,segment:i,stages:1}),xs=[];
 for(let t=0;t<2000&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);if(s.stage==='card')xs.push(s.boss.x);}
 assert(xs.length>300);const W=a.WIDTH;
 assert(Math.min(...xs)>=W/2-60&&Math.max(...xs)<=W/2+60,'boss x '+Math.min(...xs).toFixed(0)+'..'+Math.max(...xs).toFixed(0));
});

test('v43 beams: coloured beam cores sit at or below 55%',()=>{
 assert(+/[ ,]BEAM_CORE=([\d.]+)/.exec(h.read('src/arcade-app-v43.js'))[1]<=.55);
});

test('v43 panels: blocks stack from the top in a steady rhythm, spare height collects at the foot',()=>{
 assert(/\.hudx\.side \.stack\{[^}]*justify-content:flex-start[^}]*\}/.test(h.read('arcade.html')));
});

test('v43 beams: the beam texture itself is drawn at about a third of full strength',()=>{
 assert(+/[ ,]BEAM_DIM=([\d.]+)/.exec(h.read('src/arcade-app-v43.js'))[1]<=.4);
});
