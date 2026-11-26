'use strict';
/* 7전문가 심사(11-15 새벽, 6.53): PC 패널 가운데가 여전히 비고 스펠명이 작다, 보스가 좌우 끝으로 가 문양이 잘린다, 필드 안 스펠명이 패널과 겹친다.
   패널을 넓히고 가운데에 여정 목록(앞뒤 스테이지)과 이 보스의 스펠 목록을 두며, 보스는 화면 가운데 쪽에서만 움직인다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 panels: wider PC panels list nearby stages and this boss\'s spells, with a large spell name',()=>{
 const app=h.read('src/arcade-app-v43.js'),page=h.read('arcade.html');
 const place=/function placeHud\(\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/PANEL_W=(\d+)/.test(app)&&+/PANEL_W=(\d+)/.exec(app)[1]>=196,'panels at least 196px wide');
 assert(/PANEL_W/.test(place),'placeHud uses the panel width');
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/class="route"/.test(dom),'left panel lists the stages around the current one');
 assert(/class="cards"/.test(dom),'right panel lists this boss\'s spells');
 const fit=/function spellFit\(name\)\{[^\n]*\}/.exec(app)[0];assert(/Math\.min\((\d+)/.exec(fit)[1]>=20,'spell name may grow to 20px');
 assert(/\.hudx\.side \.route\{/.test(page)&&/\.hudx\.side \.cards\{/.test(page),'lists styled');
});

test('v43 panels: on PC the in-field spell name is left to the panel',()=>{
 const app=h.read('src/arcade-app-v43.js'),hud=/function drawHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/hudOut!=='side'[^\n]*?fillText\('「'\+localText\(seg\.name\)/.test(hud.replace(/\n/g,' ')),'in-field spell name drawn only without side panels');
});

test('v43 framing: during spells the boss keeps to the middle so its sigil is not cut by the field edges',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);
 const s=a.createRun({difficulty:'normal',seed:9,segment:i,stages:1}),xs=[];
 for(let t=0;t<2000&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);if(s.stage==='card')xs.push(s.boss.x);}
 assert(xs.length>300);
 assert(Math.min(...xs)>=a.WIDTH*.33-1&&Math.max(...xs)<=a.WIDTH*.67+1,'boss x within the middle third: '+Math.min(...xs).toFixed(0)+'..'+Math.max(...xs).toFixed(0));
});

test('v43 panels: panel pieces are built before they are used (a hoisted undefined printed "undefined" and crashed the PC HUD)',()=>{
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(h.read('src/arcade-app-v43.js'))[0];
 for(const [name,use] of [['route','+route+'],['list','list.length'],['cards','+cards']])
  {const at=dom.search(new RegExp('[ ,]'+name+'='));assert(at>=0&&at<dom.indexOf(use),name+' defined before use');}
});
