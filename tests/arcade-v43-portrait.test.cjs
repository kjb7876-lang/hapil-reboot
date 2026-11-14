'use strict';
/* 7전문가 심사(11-15 새벽, 6.60): 일곱 중 다수가 PC 패널 가운데 빈자리에 보스 초상을 두라고 함.
   보스 그림을 작은 그림으로 한 번 구워(보스·그림 로드 상태가 바뀔 때만) 오른쪽 패널에 넣는다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 panels: the right PC panel shows a portrait of the current boss, baked once per boss',()=>{
 const app=h.read('src/arcade-app-v43.js');
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/class="portrait"/.test(dom)&&/bossPortrait\(/.test(dom),'portrait in the panel');
 const fn=/function bossPortrait\([\s\S]*?\n  \}/.exec(app);assert(fn,'bossPortrait defined');
 assert(/portraitKey/.test(fn[0])&&/toDataURL/.test(fn[0]),'baked to an image and cached by key');
 assert(/ctx=saved/.test(fn[0]),'restores the main canvas context');
 assert(/\.hudx\.side \.portrait\{/.test(h.read('arcade.html')),'styled');
});
