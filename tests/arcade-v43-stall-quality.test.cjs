'use strict';
// 실기기(PC 크롬)에서 찾은 버그: 창이 가려져 화면 갱신이 1초에 한 번으로 줄면 '느린 기기'로 잘못 보고 가벼운 화면으로 영영 내려갔다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const app=h.read('src/arcade-app-v43.js');
test('a stalled frame (covered window, tab switch, image bake) is not counted as a slow device',()=>{
 const m=app.match(/function adaptQuality\(elapsedMs\)\{\n([^\n]*)/);assert(m,'adaptQuality exists');
 assert.match(m[1],/^\s*if\(elapsedMs>STALL_FRAME_MS\)return;/,'stalls are skipped before the average moves');
 assert.match(app,/STALL_FRAME_MS=250[,;]/);
});
