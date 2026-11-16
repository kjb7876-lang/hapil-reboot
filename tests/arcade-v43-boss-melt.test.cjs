'use strict';
// 보스 아랫몸은 발치 먹구름에 녹아든다(사용자 11-16 "보스가 구름에 반짤린 그낌이아니라 녹아든 느낌이 들도록").
// 몸을 따로 그린 뒤 아래쪽을 번진 먹 가장자리로 지우고(destination-out), 구름을 한 겹 더 몸 앞에 얹는다. 곧은 자르기(clip)는 쓰지 않는다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'src/ink-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
function inkWorld(){
  const ops=[];function Ctx(){}
  ['fillStyle','strokeStyle','shadowColor','globalAlpha','filter'].forEach(n=>Object.defineProperty(Ctx.prototype,n,{configurable:true,get(){return this['_'+n];},set(v){this['_'+n]=v;}}));
  Object.defineProperty(Ctx.prototype,'globalCompositeOperation',{configurable:true,get(){return this._gco||'source-over';},set(v){this._gco=v;}});
  ['stroke','fill','fillRect','save','restore','setLineDash','getLineDash','translate','scale','rotate','beginPath','ellipse','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath','arc','clip','rect','clearRect','setTransform'].forEach(n=>{Ctx.prototype[n]=function(){return [];};});
  Ctx.prototype.drawImage=function(){ops.push(this.globalCompositeOperation);};
  Ctx.prototype.createLinearGradient=Ctx.prototype.createRadialGradient=function(){return {addColorStop(){}};};
  Ctx.prototype.getImageData=function(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};};Ctx.prototype.putImageData=function(){};
  function Grad(){}Grad.prototype.addColorStop=function(){};
  const win={location:{search:''},CanvasRenderingContext2D:Ctx,CanvasGradient:Grad,Image:function(){},document:{documentElement:{classList:{add(){}}},createElement(){return {width:0,height:0,getContext(){return new Ctx();}};}}};
  win.window=win;vm.runInNewContext(src,win);return {win,ctx:new Ctx(),ops};
}
test('the ink module offers a melt that erases the lower body with a wash-edged mask',()=>{
  const {win,ctx,ops}=inkWorld();
  assert.equal(typeof win.HapilInk.melt,'function','HapilInk.melt');
  win.HapilInk.melt(ctx,195,120,150,1.2);
  assert(ops.includes('destination-out'),'melt erases with destination-out, got '+ops.join(','));
});
test('the boss body is drawn on its own layer and melted before the foot cloud',()=>{
  const m=/function drawBoss\(s\)\{([\s\S]*?)\n  \}/.exec(app);assert(m,'drawBoss');
  assert.match(m[1],/meltBegin\(/,'drawBoss draws the body on its own layer');
  const e=/function meltEnd\([^)]*\)\{([\s\S]*?)\n  \}/.exec(app);assert(e&&/Ink\.melt\(/.test(e[1]),'meltEnd melts the lower body');
  const melt=m[1].indexOf('meltEnd('),cloud=m[1].indexOf('Ink.footCloud(');
  assert(melt>=0&&cloud>melt,'melt comes before the cloud');
  assert.match(m[1],/Ink\.footVeil\(/,'a thinner cloud layer drifts in front of the lower body');
});
test('the translucent redraw over bullets melts too, with no straight clip',()=>{
  const m=/function drawBossOver\(s\)\{([\s\S]*?)\n  \}/.exec(app);assert(m,'drawBossOver');
  assert.doesNotMatch(m[1],/ctx\.clip\(\)/,'no hard rectangular clip');
  assert.match(m[1],/meltBegin\([\s\S]*meltEnd\(/,'the redraw melts the same way');
});
// 보스 사망도 수묵화풍(사용자 11-16 "보스 사망연출도 수묵화풍으로 연출부탁"): 몸이 먹빛으로 물들고 아래부터 녹아 사라지며, 한지에 먹이 번진다.
test('a felled boss turns to ink and seeps away instead of tumbling as a picture',()=>{
  const m=/function inkFall\(s,k\)\{([\s\S]*?)\n  \}/.exec(app);assert(m,'inkFall');
  assert.match(m[1],/source-atop/,'the body is soaked with ink');
  assert.match(m[1],/Ink\.melt\(/,'the body melts away from below');
  assert.match(m[1],/stainSprite/,'an ink stain spreads on the paper');
  assert.doesNotMatch(m[1],/\.arc\(/,'no circles or rings');
  assert.match(app,/if\(Ink&&Ink\.melt&&inkFall\(s,k\)\)return;/,'ink mode uses the ink fall');
});
test('the falling boss keeps its own picture even when the next stage releases it',()=>{
  assert.match(app,/bossArt\.keep\[dn\.actor\+m\]/,'fall borrows the held boss art');
  assert.match(app,/finally\{for\(var li=0;li<lent\.length;li\+\+\)delete images\[lent\[li\]\];\}/,'the borrowed art is handed back after drawing');
});
