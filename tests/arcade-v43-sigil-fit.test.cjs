'use strict';
/* 7전문가 심사(11-15 새벽, 6.51 두 번): 문양 바깥 고리가 칸 좌우·위 가장자리에서 잘린다, 하단의 직선 광선 여러 줄이 회피 공간을 조각낸다.
   문양은 칸 폭의 42% 안에 들고, 광선은 아래로 갈수록 옅어진다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

// 11-15 사용자 새 요청(육망성을 맵 대부분을 덮게)으로 '칸 폭 42% 안' 검사는 뺐다. 크기와 피할 자리는 arcade-v43-big-sigil.test.cjs.
test('v43 beams fade toward the bottom of the field so the dodge space reads first',()=>{
 const las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(h.read('src/arcade-app-v43.js'))[0];
 assert(/BEAM_LOW_FADE/.test(las)&&/createLinearGradient/.test(las),'beam glow uses a fading gradient');
});
