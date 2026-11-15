'use strict';
// 불러오기 빠르게(11-15 사용자 "불러오기 오래걸리는거개선"): 시작 화면에서 첫 스테이지 그림을, 플레이 중에는 다음 스테이지 그림을 미리 받는다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/arcade-app-v43.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../arcade.html'),'utf8');
test('warmStage prefetches listed stage art into the browser cache without holding it',()=>{
 const m=app.match(/function warmStage\(index\)\{([\s\S]*?)\n  \}/);assert(m,'warmStage exists');
 assert.match(m[1],/warmed\[index\]/);assert.match(m[1],/stageKeys\(index\)/);assert.match(m[1],/listed\(key\)/);
 assert.match(m[1],/new Image\(\)/);assert.match(m[1],/fileOf\(key\)/);assert.doesNotMatch(m[1],/images\[key\]\s*=/);
});
test('the title screen warms the first stage once the art list is in',()=>{
 const m=app.match(/var done=function\(\)\{([^\n]*)\};/);assert(m,'done() found');assert.match(m[1],/warmStage\(0\)/);
});
test('a stage whose art has all arrived warms the next stage',()=>{
 const m=app.match(/img\.onload=function\(\)\{([^\n]*)\};/);assert(m,'onload found');
 assert.match(m[1],/warmStage\(loadedStage\+1\)/);assert.match(m[1],/Object\.keys\(loading\)\.length/);
});
test('arcade.html scripts share one cache revision newer than the one that shipped the broken app',()=>{
 const revs=[...html.matchAll(/<script src="src\/[^"]+\?v=([^"]+)"/g)].map(x=>x[1]);
 assert(revs.length>=12);assert.equal(new Set(revs).size,1);assert.notEqual(revs[0],'20261113-arcade43');
});
