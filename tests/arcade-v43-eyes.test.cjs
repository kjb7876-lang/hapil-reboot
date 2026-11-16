'use strict';
/* 11-16 사용자 요청: 게임 시작 시 눈을 뜨고, 사망(게임 오버) 시 눈을 감는 연출(가로판 RC181·RC182 눈꺼풀 참고).
   수묵화풍: 먹색만 쓰고 인주색·감싸는 원·십자가는 쓰지 않는다. 게임 판정에는 손대지 않는다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const load=(search='')=>{const w={location:{search},matchMedia:()=>({matches:false}),document:{documentElement:{classList:{contains:()=>true}},getElementById:()=>null},
  requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};w.window=w;vm.runInNewContext(read('src/arcade-eyes-v43.js'),w);return w.HapilEyes;};
test('opening starts shut, blinks once, ends wide open; closing ends shut',()=>{
  const E=load();assert.equal(E.at('open',0),0);assert.equal(E.at('open',E.OPEN_SECONDS),1);
  let peak=0,dip=1,after=false;for(let t=0;t<=E.OPEN_SECONDS;t+=.01){const o=E.at('open',t);if(o>peak)peak=o;if(peak>.1&&peak<1&&o<peak-.05){after=true;dip=Math.min(dip,o);}}
  assert(after&&dip<.1,'a blink before opening fully');
  assert.equal(E.at('close',0),1);assert.equal(E.at('close',E.CLOSE_SECONDS),0);
  assert(E.OPEN_SECONDS<=1.2,'the hero is not hidden long');assert(E.CLOSE_SECONDS<=1.4);
});
test('?eyes=0 turns it off',()=>{assert.equal(load('?eyes=0').state().off,true);assert.equal(load('').state().off,false);});
test('ink lids; seal red only for the game-over cross (user 11-16), no ring',()=>{
  const src=read('src/arcade-eyes-v43.js').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  assert.doesNotMatch(src,/\.arc\(|ellipse\(/,'no circle drawn');assert.doesNotMatch(src.slice(src.indexOf('var SEAL=')),/createRadialGradient/,'no halo around the cross');
  const lids=src.slice(0,src.indexOf('var SEAL='));
  for(const m of lids.matchAll(/#([0-9a-f]{6})\b/gi)){const v=m[1],r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);assert(r-Math.min(g,b)<24,'lids not red: #'+v);}
  assert.match(src,/var SEAL='#b0302a'/);assert.match(src,/cross:cross/);
});
test('game over: the result shows the red cross over the closed eyes and retry restarts the stage from its start',()=>{
  const app=read('src/arcade-app-v43.js'),html=read('arcade.html');
  assert.match(app,/fallen\.classList\.toggle\('fallen',!won&&!!eyes&&!eyes\.state\(\)\.off\)/,'eyes off keeps the paper result');
  assert.match(app,/setMode\('result'\);if\(eyes&&eyes\.cross&&fallen\.classList\.contains\('fallen'\)\)eyes\.cross\(\$\('result-cross'\)\)/);
  assert.match(app,/if\(!won\)\{retry\.hidden=false;retry\.textContent=T\('retryFallen'\);retry\.dataset\.stage=String\(s\.stageIndex\);\}/);
  assert.match(app,/\$\('arcade-retry'\)\.addEventListener\('click',function\(\)\{var i=Number\(this\.dataset\.stage\)\|\|0;start\(\{stage:i,bossOnly:this\.dataset\.boss==='1'\}\);\}\)/,'no segment: from the stage start');
  assert.match(html,/<canvas id="result-cross"/);assert.match(html,/#arcade-result\.fallen #result-cross\{display:block\}/);
});
test('the app opens on start, closes only on a loss, clears on the title, and the page loads it before the app',()=>{
  const app=read('src/arcade-app-v43.js');
  assert.match(app,/setMode\('playing'\);\n\s*if\(global\.HapilEyes\)global\.HapilEyes\[quiet\?'clear':'open'\]\(\)/);
  assert.match(app,/var eyes=!won&&global\.HapilEyes;if\(eyes\)eyes\.close\(\)/);
  assert.match(app,/function goTitle\(\)\{if\(global\.HapilEyes\)global\.HapilEyes\.clear\(\)/);
  const order=[...read('arcade.html').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
  assert(order.indexOf('src/arcade-eyes-v43.js')>=0&&order.indexOf('src/arcade-eyes-v43.js')<order.indexOf('src/arcade-app-v43.js'));
});
