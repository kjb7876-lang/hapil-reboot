'use strict';
/* 11-16 세로판 실검증에서 찾은 문제:
   1) 중간 저장에서 이어 하면 그때까지 자란 공격·필살 단계가 스테이지 기본값으로 내려갔다.
   2) 필살 컷인 제목이 한글 명조 없는 기기(아이폰·헤드리스)에서 고딕으로 떨어졌다 → 명조 조각 글꼴을 싣는다.
   3) 휴대폰(칸 안 HUD)에서 '공격 Lv · 필살 Lv' 글자가 저속 버튼 밑에 깔려 가려졌다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{root}=h;
const A=()=>h.need();

test('a mid-stage checkpoint keeps the attack and bomb levels grown so far',()=>{
 const a=A(),exp=a.POWER_EXP[3]+5,fills=a.BOMB_FILLS[2]+1;
 const s=a.createRun({difficulty:'normal',seed:3,stage:1,growth:true,grown:{exp,fills}});
 assert.equal(s.power,4);assert.equal(s.bombLevel,3);assert.equal(s.exp,exp);assert.equal(s.fills,fills);
 const floor=a.createRun({difficulty:'normal',seed:3,stage:30,growth:true,grown:{exp:0,fills:0}});
 assert(floor.power>=4,'never below the journey floor');
 const mob=fs.readFileSync(path.join(root,'src/arcade-mobile-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
 assert.match(mob,/exp:s\.exp\|0,fills:s\.fills\|0/,'checkpoint stores growth');
 assert.match(app,/exp:mid\.exp,fills:mid\.fills/,'continue passes growth back');
});

test('the cut-in serif font ships as a small woff2 with every glyph the cut-in draws',()=>{
 const f=path.join(root,'media/fonts/hapil-serif-v43.woff2');assert(fs.existsSync(f));
 const size=fs.statSync(f).size;assert(size>2000&&size<60000,'small subset, got '+size);
 assert(fs.existsSync(path.join(root,'media/fonts/LICENSE-NotoSerifKR-OFL.txt')),'OFL licence travels with the font');
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8');
 assert.match(src,/new global\.FontFace\('HapilSerif'/);
 assert(!/px "Noto Serif KR"/.test(src),'every canvas font goes through the HapilSerif stack');
});

test('phone HUD level line sits above the hearts, clear of the slow-move button',()=>{
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
 const m=app.match(/fillText\('공격 Lv\.'\+\(s\.power\|\|1\)\+' · 필살 Lv\.'\+\(s\.bombLevel\|\|1\),12,H-(\d+)\)/);
 assert(m,'level line drawn');assert(+m[1]>96,'drawn above the hearts row (H-96), got H-'+m[1]);
});
