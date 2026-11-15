'use strict';
// 실기기 진단(사용자 11-15 "실기기 테스트까지해줘 버그잡기"): 개발자 모드 배지에 초당 프레임·가벼운 화면 여부·오류 수와 마지막 오류를 보여 준다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const app=h.read('src/arcade-app-v43.js');
test('the developer badge reports frame rate, lite mode and script errors on the device itself',()=>{
 assert.match(app,/global\.addEventListener\('error',/,'script errors are counted');
 assert.match(app,/global\.addEventListener\('unhandledrejection',/);
 assert.match(app,/function devDiag\(\)/);
 const m=app.match(/function devDiag\(\)\{[^\n]*/)[0];
 assert.match(m,/fps/);assert.match(m,/오류 /);assert.match(m,/lite/);
 assert.match(app,/devDiag:devDiag/,'the same text is readable from tests');
});
test('the floor pressure pattern has its own ink palette',()=>{
 const f=app.match(/function drawFloor\(s\)\{([\s\S]*?)\n  \}/)[1];
 assert.match(f,/if\(Ink\)\{stone=/);assert.match(f,/HOT=Ink\?/);
});
