'use strict';
/* 7전문가 심사(11-15 새벽, 6.46): PC 패널 가운데가 비고 스펠명이 어절마다 줄바꿈된다, 밝은 테마의 금빛 광선 심지가 여전히 가장 밝다,
   금빛 원반 위 흰 탄 테가 약하다. 패널 가운데에 보스 체력·진행 정보를 두고, 스펠명은 한 줄에 맞추고, 흰·금 광선 심지와 빛무리를 더 낮춘다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 panels: the PC panels carry boss HP and run progress in their middle, and the spell name fits one line',()=>{
 const app=h.read('src/arcade-app-v43.js'),page=h.read('arcade.html');
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/class="bosshp"/.test(dom),'right panel shows the boss HP bar');
 assert(/class="progress"/.test(dom),'left panel shows run progress');
 assert(/spellFit\(/.test(dom)&&/function spellFit\(/.test(app),'spell name size is fitted to the panel');
 assert(/\.hudx\.side \.spell\{[^}]*white-space:nowrap/.test(page),'spell name stays on one line');
 assert(/\.hudx\.side \.bosshp\{/.test(page),'boss HP bar styled');
});

test('v43 beams: pale (gold/white) beams keep a dimmer core and glow than coloured ones',()=>{
 const app=h.read('src/arcade-app-v43.js');
 assert(+/PALE_BEAM_DIM=([\d.]+)/.exec(app)[1]<=.3,'pale beam glow at most 30%');
 const las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/PALE_CORE/.test(las),'pale beam core is toned down');
 assert(+/PALE_CORE=([\d.]+)/.exec(app)[1]<=.6,'pale core alpha at most .6');
});

test('v43 orbs: white and gold orbs wear a thicker dark rim so they read over the gold disc',()=>{
 const app=h.read('src/arcade-app-v43.js');
 const m=/paleRimOf\(color\);g\.lineWidth=Math\.max\(1,r\*([\d.]+)\)/.exec(app);assert(m,'pale rim width found');
 assert(+m[1]>=.22,'pale rim at least 22% of radius: '+m[1]);
});
