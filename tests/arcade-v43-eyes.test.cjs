'use strict';
/* 11-16 사용자 요청: 게임 시작 시 눈을 뜨고, 사망(게임 오버) 시 눈을 감는 연출(가로판 RC181·RC182 눈꺼풀 참고).
   수묵화풍: 먹색만 쓰고 인주색·감싸는 원·십자가는 쓰지 않는다. 게임 판정에는 손대지 않는다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const load=(search='')=>{const w={location:{search},matchMedia:()=>({matches:false}),document:{documentElement:{classList:{contains:()=>true}},getElementById:()=>null},
  requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};w.window=w;vm.runInNewContext(read('src/arcade-eyes-v43.js'),w);return w.HapilEyes;};
test('opening starts shut, blinks once, ends wide open; closing ends shut',()=>{
  const E=load();assert.equal(E.at('open',0),0);assert.equal(E.at('open',E.OPEN_SECONDS),1);
  let peak=0,dip=1,after=false;for(let t=0;t<=E.OPEN_SECONDS;t+=.01){const o=E.at('open',t);if(o>peak)peak=o;if(peak>.15&&peak<1&&o<peak-.05){after=true;dip=Math.min(dip,o);}}
  assert(after&&dip<.15,'a blink before opening fully');
  assert.equal(E.at('close',0),1);assert.equal(E.at('close',E.CLOSE_SECONDS),0);
  assert(E.OPEN_SECONDS<=1.2,'the hero is not hidden long');assert(E.CLOSE_SECONDS<=1.4);
});
test('?eyes=0 turns it off',()=>{assert.equal(load('?eyes=0').state().off,true);assert.equal(load('').state().off,false);});
test('ink only: no seal red, no ring, no cross',()=>{
  const src=read('src/arcade-eyes-v43.js').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  assert.doesNotMatch(src,/\.arc\(|ellipse\(/,'no circle drawn');
  for(const m of src.matchAll(/#([0-9a-f]{6})\b/gi)){const v=m[1],r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);assert(r-Math.min(g,b)<24,'not red: #'+v);}
});
test('the app opens on start, closes only on a loss, clears on the title, and the page loads it before the app',()=>{
  const app=read('src/arcade-app-v43.js');
  assert.match(app,/setMode\('playing'\);\n\s*if\(global\.HapilEyes\)global\.HapilEyes\[quiet\?'clear':'open'\]\(\)/);
  assert.match(app,/var eyes=!won&&global\.HapilEyes;if\(eyes\)eyes\.close\(\)/);
  assert.match(app,/function goTitle\(\)\{if\(global\.HapilEyes\)global\.HapilEyes\.clear\(\)/);
  const order=[...read('arcade.html').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
  assert(order.indexOf('src/arcade-eyes-v43.js')>=0&&order.indexOf('src/arcade-eyes-v43.js')<order.indexOf('src/arcade-app-v43.js'));
});
