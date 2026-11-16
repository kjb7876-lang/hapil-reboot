'use strict';
// 인주색은 돕는 색(사용자 11-16 "모든탄은 언주색 쓰지말고 언주색은 하트나 아래예고처럼 중요한 상황에만 쓰도록 플레이어에게 도움을 주는 그런상황 약간 예수님의보혈느낌인거임").
// 적 탄·광선·보스 공격의 붉은 색은 먹으로, 인주색은 하트·영웅 판정점·예고(아래에서 솟기 전, 광선 예고선)에만 남는다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'src/ink-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
function inkWorld(search){
  function Ctx(){}
  ['fillStyle','strokeStyle','shadowColor','globalCompositeOperation'].forEach(n=>Object.defineProperty(Ctx.prototype,n,{configurable:true,get(){return this['_'+n];},set(v){this['_'+n]=v;}}));
  ['stroke','fill','drawImage','fillRect','save','restore','setLineDash','getLineDash','translate'].forEach(n=>{Ctx.prototype[n]=function(){return [];};});
  function Grad(){this.stops=[];}Grad.prototype.addColorStop=function(o,c){this.stops.push(c);};
  const win={location:{search:search||''},CanvasRenderingContext2D:Ctx,CanvasGradient:Grad,document:{documentElement:{classList:{add(){}}},createElement(){return {getContext(){return new Ctx();}};}}};
  win.window=win;vm.runInNewContext(src,win);return {win,ctx:new Ctx()};
}
const rgb=v=>{const m=/rgba?\(([^)]+)\)/.exec(v);assert(m,'color '+v);return m[1].split(',').map(Number);};
const isVermilion=v=>{const [r,g,b]=rgb(v);return r-b>60&&r-g>50;};
test('enemy reds turn to ink, not vermilion',()=>{
  const {ctx}=inkWorld('');
  for(const red of ['#ff2020','#ff3b3b','#e0202a','#ff5a3c','#a8382a','rgb(255,40,40)','#d0102a']){ctx.fillStyle=red;assert(!isVermilion(ctx.fillStyle),red+' became '+ctx.fillStyle);}
});
test('hearts, the hero hit point and warnings keep vermilion',()=>{
  const {ctx}=inkWorld('');
  for(const help of ['#c9406e','#e0a52c','#ff2a4a','#c2362a','rgba(255,90,60,.35)']){ctx.strokeStyle=help;assert(isVermilion(ctx.strokeStyle),help+' lost vermilion: '+ctx.strokeStyle);}
});
test('the risers and floor warnings and laser telegraphs still draw with the warning colours',()=>{
  assert.match(app,/HOT=Ink\?'#c2362a'/,'riser warning colour');
  assert.match(app,/strokeStyle=WARN_RED\?'#c9406e'/,'figure telegraph colour');
});
test('a hit keeps its vermilion edge flash and cracked ring (user choice 11-16)',()=>{
  const m=/if\(hurtFlash>0\)\{([^\n]*)/.exec(app);assert(m,'hurt overlay');
  assert.match(m[1],/hc='150,40,30'/,'edge flash stays vermilion');
  assert.match(m[1],/strokeStyle=VERMILION;/,'cracked ring stays vermilion');
});
