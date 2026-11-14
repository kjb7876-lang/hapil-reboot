'use strict';
/* 7전문가 심사(11-15 새벽, 6.56): PC 패널 내용이 가운데에 떠서 위아래가 비고, 막대 길이가 화면마다 다르고, 스펠이 하나뿐인 보스는 목록이 빠지며,
   일시정지 버튼이 패널과 줄이 안 맞고, 금빛 원반의 흰 하이라이트가 날아간다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 panels: blocks stack from the top with an even gap, bars have a fixed width, every boss lists its spells',()=>{
 const app=h.read('src/arcade-app-v43.js'),page=h.read('arcade.html');
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert((dom.match(/class="stack"/g)||[]).length>=2,'both panels wrap their blocks in one stack');
 assert(/\.hudx\.side \.stack\{[^}]*flex-direction:column[^}]*gap:\d+px/.test(page),'stack has an even gap');
 for(const k of ['bosshp','progress','gauge'])assert(new RegExp('\\.hudx\\.side \\.'+k+'\\{width:\\d+px').test(page),k+' has a fixed width');
 assert(!/list\.length>1/.test(dom),'a boss with one spell still shows its list');
});

test('v43 panels: the pause button lines up with the left panel edge',()=>{
 const place=/function placeHud\(\)[\s\S]*?\n  \}/.exec(h.read('src/arcade-app-v43.js'))[0];
 assert(/pause\.style\.left=px\(r\.left-pw-20\)/.test(place),'pause aligned to the panel');
});

test('v43 boss art: bright boss art is pressed down further during spells so its highlight no longer clips',()=>{
 const app=h.read('src/arcade-app-v43.js'),m=/BRIGHT_ART_DIM='brightness\(([\d.]+)\)/.exec(app);
 assert(m&&+m[1]<=.7,'brightness at most .7');
});
