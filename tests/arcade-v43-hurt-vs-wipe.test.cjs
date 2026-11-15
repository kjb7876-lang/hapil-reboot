'use strict';
// 피격과 탄 지우기 구분(사용자 11-15 "맞았을때 랑 탄없앨때 차이가나게 비슷해서 헷갈림").
// 피격: 인주색(붉은) 테두리 번쩍임·영웅 둘레 금 간 고리·크게 흔들림·탄은 영웅에서 바깥으로 튀며 붉게 사라짐·둔탁하고 낮은 소리.
// 탄 지우기(패턴 깨기·잡몹 구간 끝): 한지빛 섬광·먹 흩어짐·흔들림은 작게·맑고 높은 소리.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8'),audio=fs.readFileSync(path.join(root,'src/audio-v37.js'),'utf8');
const recipe=name=>{const m=new RegExp(name+':function\\(d,l(?:,c)?\\)\\{([^\\n]*)\\},').exec(audio);assert(m,name+' recipe');return m[1];};
const tones=body=>[...body.matchAll(/tone\(d,'(\w+)',([\d.]+)/g)].map(x=>+x[2]);
test('the hurt sound is low and dull, with no bright sweep',()=>{
  const b=recipe('hurt');assert(tones(b).every(f=>f<=400),'hurt tones start low: '+tones(b));assert(!/highpass/.test(b),'no hiss on a hit');
});
test('the wipe sound is clear and high, with no low boom',()=>{
  const b=recipe('phaseBreak');assert(tones(b).every(f=>f>=500),'wipe tones are high: '+tones(b));assert(!/lowpass/.test(b),'no low rumble');
});
test('a hit paints a vermilion edge and a cracked ring around the hero, kept vermilion under the ink style',()=>{
  const m=/if\(hurtFlash>0\)\{([^\n]*)/.exec(app);assert(m,'hurt overlay');
  assert(/Ink\.raw\(1\)/.test(m[1])&&/Ink\.raw\(-1\)/.test(m[1]),'not remapped to ink');
  assert(/hurtRing/.test(m[1]),'a ring cracks around the hero');
  assert(!/255,252,244/.test(m[1]),'no paper flash on a hit');
});
test('on a hit the cleared bullets burst outward in vermilion; a wipe keeps the ink scatter and shakes little',()=>{
  assert(/hurtNow/.test(app),'consume knows a hit happened this frame');
  const brk=/else if\(e==='break'\)\{([^\n]*?)\}\n/.exec(app);assert(brk,'break handler');
  const sh=/shake=(\d+)/.exec(brk[1]);assert(sh&&+sh[1]<=4,'a wipe shakes little: '+(sh&&sh[1]));
  const hurt=/else if\(e==='hurt'\)\{([^\n]*?)\}\n/.exec(app);assert(hurt,'hurt handler');
  const hs=/shake=(\d+)/.exec(hurt[1]);assert(hs&&+hs[1]>=14,'a hit shakes hard');
});
