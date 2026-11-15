'use strict';
/* 7전문가 심사(11-15 새벽, 6.49): 일곱 분야 모두 금빛 원반 하이라이트가 하얗게 날아가 흰 탄이 묻힌다고 지적, 휴대폰에서 문양 바깥 고리가 아직 잘린다,
   광선들이 보스 바로 아래 한 점에 모여 밝은 덩어리를 만든다. 밝은 보스 그림은 스펠 중 더 누르고, 문양 상한을 낮추고, 광선은 시작부도 옅게 시작한다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const app=()=>h.read('src/arcade-app-v43.js');

test('v43 bright boss art is pressed well below the bullets during spells',()=>{
 const m=/BRIGHT_ART_DIM='brightness\(([\d.]+)\) contrast\(([\d.]+)\)'/.exec(app());
 assert(m&&+m[1]<=.6&&+m[2]<=.75,'brightness '+(m&&m[1])+' contrast '+(m&&m[2]));
});

// 11-15 사용자 새 요청(육망성을 맵 대부분을 덮게)으로 '문양 칸 폭 38%' 검사는 뺐다.
test('v43 beams start faint at the boss so crossing beams do not pile into one hot spot',()=>{
 const las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(app())[0];
 assert(/BEAM_ROOT/.test(las),'beam root fade');
});

test('v43 skill effects add less light over bright (gold/white) stages, where they blew the disc out to white',()=>{
 const fx=/function drawSkillFx\(s\)[\s\S]*?\n  \}/.exec(app())[0];
 assert(/SKILL_FX_BRIGHT/.test(fx)&&/paleOf\(themeColor\(s\)\)/.test(fx),'bright-stage skill effect alpha');
 assert(+/SKILL_FX_BRIGHT=([\d.]+)/.exec(app())[1]<=.5);
});
