'use strict';
// 보스 이펙트 전수조사(사용자 11-15 "보스 이펙트쓸때 버그있는지 전수조사")에서 찾은 것.
// 수묵화풍은 밝은 색을 먹색으로 뒤집는다. 화면 전체를 하얗게 번쩍이는 섬광(패턴 격파·보스 쓰러짐·폭탄·승리)까지 뒤집혀
// 한지 화면이 먹빛으로 어두워졌다. 섬광은 뒤집지 않고 밝게(한지보다 밝은 흰빛) 칠해야 한다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs'),fs=require('fs'),path=require('path'),vm=require('vm');
const app=h.read('src/arcade-app-v43.js');

// 캔버스 없이 ink-v43.js를 불러, fillStyle에 넣은 색과 그림 굽기가 어떻게 바뀌는지 본다(아주 작은 가짜 캔버스).
function loadInk(){
  class Img{constructor(src,w,h,px){this.src=src;this.complete=true;this.naturalWidth=w;this.naturalHeight=h;this._px=px;}}
  function Ctx(canvas){this.canvas=canvas;this._fill='#000000';this.drawn=[];}
  Object.defineProperty(Ctx.prototype,'fillStyle',{configurable:true,enumerable:true,get:function(){return this._fill;},set:function(v){this._fill=v;}});
  ['strokeStyle','shadowColor','globalCompositeOperation'].forEach(function(k){Object.defineProperty(Ctx.prototype,k,{configurable:true,enumerable:true,get:function(){return this['_'+k];},set:function(v){this['_'+k]=v;}});});
  Ctx.prototype.stroke=function(){};
  Ctx.prototype.drawImage=function(src){this.drawn.push(src);const c=this.canvas;if(c&&c.px){const from=src._px||src.px;if(from)c.px.set(from.subarray(0,c.px.length));}};
  Ctx.prototype.getImageData=function(x,y,w,h){return {data:new Uint8ClampedArray(this.canvas.px)};};
  Ctx.prototype.putImageData=function(d){this.canvas.px.set(d.data);};
  function Canvas(){this.width=0;this.height=0;this.px=null;}
  Canvas.prototype.getContext=function(){if(!this.px)this.px=new Uint8ClampedArray(this.width*this.height*4);return this._ctx||(this._ctx=new Ctx(this));};
  const g={location:{search:''},CanvasRenderingContext2D:Ctx,HTMLImageElement:Img,WeakMap:WeakMap,Uint8Array:Uint8Array,Float32Array:Float32Array,Uint32Array:Uint32Array,Math:Math,
    document:{documentElement:{classList:{add:function(){}}},createElement:function(){return new Canvas();}},Image:function(){},setTimeout:function(){}};
  g.window=g;vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','ink-v43.js'),'utf8'),g);
  const screen=new Canvas();screen.width=2;screen.height=1;
  return {ink:g.HapilInk,ctx:new Ctx(null),Img:Img,screen:new Ctx(screen)};
}
const lum=c=>{const m=/rgba?\(([^)]+)\)/.exec(c);const p=m[1].split(',').map(Number);return .299*p[0]+.587*p[1]+.114*p[2];};

test('ink style turns a plain white fill dark, unless it is wrapped in Ink.raw',()=>{
  const {ink,ctx}=loadInk();assert(ink&&ink.on&&ink.raw,'ink loaded');
  ctx.fillStyle='rgba(255,255,255,0.5)';assert(lum(ctx.fillStyle)<80,'white becomes ink: '+ctx.fillStyle);
  ink.raw(1);ctx.fillStyle='rgba(255,252,244,0.5)';ink.raw(-1);assert(lum(ctx.fillStyle)>240,'raw keeps it bright: '+ctx.fillStyle);
});

test('the full-screen flash stays bright under the ink style (it used to dim the paper to ink grey)',()=>{
  const d=app.match(/function draw\(elapsed\)\{([\s\S]*?)\n  \}/);assert(d,'draw found');
  const f=d[1].match(/if\(flash>0\)\{([^\n]*?)flash-=\.04;\}/);assert(f,'flash block found');
  const body=f[1];
  assert.match(body,/Ink&&Ink\.raw\)Ink\.raw\(1\)/,'flash colour is not remapped to ink');
  assert.match(body,/Ink\.raw\(-1\)/,'remapping is restored right after the flash');
  assert(body.indexOf('Ink.raw(1)')<body.indexOf('fillRect')&&body.indexOf('fillRect')<body.indexOf('Ink.raw(-1)'),'only the flash fill is raw');
});

// 보스 레이저 그림(media/arcade-v43-laser, 28명)은 검은 바탕에 빛만 그린 더하기용 그림이다. 수묵화가 이것을 인물처럼 굽자
// 검은 바탕이 먹색 네모가 되어, 스펠을 쓸 때마다 보스 위에 250px 먹 네모(drawEmblems)가 1초 뜨고 광선이 검은 띠로 그려졌다.
test('an additive laser sheet keeps its black background transparent under the ink style',()=>{
  const {ctx,Img}=loadInk();
  // 픽셀 둘: 검은 바탕, 밝은 보랏빛
  const img=new Img('media/arcade-v43-laser/violet.webp',2,1,new Uint8ClampedArray([0,0,0,255, 200,140,255,255]));
  ctx.drawImage(img,0,0);const out=ctx.drawn[ctx.drawn.length-1];
  assert.notStrictEqual(out,img,'the sheet is converted for ink');
  const px=out.px;assert(px,'converted pixels');
  assert(px[3]<=8,'black background becomes transparent, not an ink square (alpha '+px[3]+')');
  assert(px[7]>=150,'the glow stays as ink (alpha '+px[7]+')');
  assert(.299*px[4]+.587*px[5]+.114*px[6]<150,'the glow is an ink pigment, darker than the paper');
});
test('ordinary character art is still washed the old way (alpha kept)',()=>{
  const {ctx,Img}=loadInk();
  const img=new Img('media/arcade-v43/actors/violet.webp',2,1,new Uint8ClampedArray([0,0,0,255, 200,140,255,255]));
  ctx.drawImage(img,0,0);const out=ctx.drawn[ctx.drawn.length-1];
  assert(out.px&&out.px[3]===255,'character pixels keep their alpha');
});
