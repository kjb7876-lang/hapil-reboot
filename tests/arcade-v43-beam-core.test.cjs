'use strict';
/* 7전문가 심사(11-15 새벽, 6.51): 루시퍼의 붉은 광선 흰 심지가 여전히 화면에서 가장 밝다, 금빛 원반 하이라이트가 하얗게 날아간다,
   PC 패널 가운데가 비어 위만 무겁다, 붉은 광선 사이에서 영웅 고리가 묻힌다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const app=()=>h.read('src/arcade-app-v43.js');

test('v43 beams: every straight beam keeps its white core below full strength, pale ones lower still',()=>{
 const a=app(),las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(a)[0];
 assert(/BEAM_CORE/.test(las),'beam core dimmed');
 const core=+/[ ,]BEAM_CORE=([\d.]+)/.exec(a)[1],pale=+/PALE_CORE=([\d.]+)/.exec(a)[1];
 assert(core<=.75&&pale<core,'core '+core+', pale '+pale);
});

test('v43 boss art: bright artwork loses contrast too, so its highlight cannot clip to white',()=>{
 assert(/BRIGHT_ART_DIM='brightness\([\d.]+\) contrast\(\.[0-8]\d*\)'/.test(app()),'contrast lowered');
});

test('v43 panels: the stacked blocks spread over the panel height instead of piling at the top',()=>{
 assert(/\.hudx\.side \.stack\{[^}]*flex:1[^}]*justify-content:space-between/.test(h.read('arcade.html')),'stack fills and spreads');
});

test('v43 hero marker: the cyan ring is bold enough to survive red beams',()=>{
 assert(+/HERO_RING_WIDTH=([\d.]+)/.exec(app())[1]>=2.8,'ring width');
});
