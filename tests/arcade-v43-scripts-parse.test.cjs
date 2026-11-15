'use strict';
/* 11-15: 그리기 파일 한 줄에 주석이 코드 앞에 끼어 arcade-app-v43.js 전체가 문법 오류가 났는데, 다른 검사는 소스를 정규식으로만 읽어 통과했다.
   페이지가 '불러오는 중…'에서 멈췄다. 화면이 싣는 모든 스크립트가 문법상 읽히는지 확인한다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
test('every script arcade.html loads parses',()=>{
  const html=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),srcs=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
  assert(srcs.length>=10,'found scripts: '+srcs.length);
  for(const s of srcs){const code=fs.readFileSync(path.join(root,s),'utf8');assert.doesNotThrow(()=>new vm.Script(code,{filename:s}),s+' parses');}
});
