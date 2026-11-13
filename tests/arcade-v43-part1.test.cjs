'use strict';
// v43 완료 조건(제1부): 모든 구간에 안전 통로가 있고, 세 난이도로 그 부를 끝까지 깰 수 있다.
const test=require('node:test'),h=require('./helpers/arcade-v43.cjs');
test('v43 part 1: every wave, plain attack and named pattern leaves a lane for the hitbox',()=>h.lanePart(1));
test('v43 part 1: a run through the part ends without error on every difficulty',()=>h.runPart(1));
