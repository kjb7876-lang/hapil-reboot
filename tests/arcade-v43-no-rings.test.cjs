'use strict';
// 사용자 11-15 "저런 감싸는 원 모두 없애줘 무기에 붙는원도": 수묵화풍에서는 큰 방울 탄의 고리, 명중 섬광 고리, 발사 고리, 저속 점선 고리를 그리지 않는다. 판정은 그대로.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const app=h.read('src/arcade-app-v43.js'),ink=h.read('src/ink-v43.js');
test('ink style draws no wrapping rings',()=>{
 const bubble=ink.slice(ink.indexOf('// 큰 방울'),ink.indexOf('hold--;return {image:c,half:reach}'));
 assert(bubble.length>50);assert.doesNotMatch(bubble,/\.arc\(/,'the big bubble bullet is a wash blot, not a stroked ring');
 assert.match(app,/if\(!Ink\)\{ctx\.beginPath\(\);ctx\.arc\(f\.x,f\.y,r\*\.7,0,TAU\);ctx\.stroke\(\);\}/,'hit flash ring');
 assert.match(app,/q<\(Ink\?0:c\.big\?3:2\)/,'cast pulse rings');
 assert.match(app,/if\(!Ink\)\{ctx\.save\(\);ctx\.translate\(p\.x,p\.y\);ctx\.rotate\(visual\*3\)/,'focus dashed ring');
});
test('ink is monochrome with vermilion accents by default, older looks stay reachable',()=>{assert.match(ink,/mono=monoQ\?\+monoQ\[1\]:2/);assert.match(ink,/\[\?&\]mono=\(\[012\]\)/);assert.match(ink,/s2=0;\}/);assert.match(ink,/!\(al<\.5\)\)l2=Math\.min\(l2,\.18\)/); // 사용자 11-16: 붉은 탄도 먹(옅은 붉은 빛만 먹으로 두던 규칙이 모든 적 붉은색으로 넓어졌다)
  assert.match(app,/PIECE=Ink&&Ink\.mono\?'#1e1a18':HOT/);assert.match(app,/WARN_RED=!!\(Ink&&Ink\.mono===2\)/);assert.match(app,/if\(!MONO\)\{g\.globalCompositeOperation='color'/);});
