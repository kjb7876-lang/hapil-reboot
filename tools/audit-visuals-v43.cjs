#!/usr/bin/env node
'use strict';
/* 세로판 이미지·이펙트 전수 점검(11-16 사용자 "이펙트및 이미지 전수조사 해서 버그없게끔").
 * 정적 서버에 올린 arcade.html 을 헤드리스로 56스테이지 끝까지(무적·가속) 돌리며
 *  1) 불러온 그림마다 성공/실패(404·디코드 실패)를 모으고,
 *  2) 게임 캔버스에 그린 drawImage 마다 그리기 전후 픽셀을 비교해 "그렸는데 화면이 안 바뀌는" 그림(알파 0·배경과 같은 색)을 찾는다.
 * 사용: python3 -m http.server 4396 & ; node tools/audit-visuals-v43.cjs [주소, 기본 http://localhost:4396/arcade.html] [결과 json]
 * 판정: images 의 state 가 ok 가 아니면 실패, drawn 행의 vis/sampled 가 0 이면 안 보이는 그림. dsum/sampled 는 바뀐 픽셀의 평균 밝기 차(0~765). */
const {chromium,devices}=require('playwright');
const URL_=process.argv[2]||'http://localhost:4396/arcade.html',OUT=process.argv[3]||'audit-visuals-v43.json';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext(devices['iPhone 13']);
 await ctx.addInitScript(()=>{try{localStorage.setItem('hapil-arcade-dev-v43','1')}catch(e){}
  window.__imgs={};const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{get(){return d.get.call(this)},set(v){const im=this,k=String(v).replace(location.origin+'/','');window.__imgs[k]={state:'loading'};im.addEventListener('load',()=>{window.__imgs[k]={state:'ok',w:im.naturalWidth,h:im.naturalHeight}});im.addEventListener('error',()=>{window.__imgs[k]={state:'ERROR'}});d.set.call(this,v)}});
 });
 const p=await ctx.newPage();const bad=[];p.on('pageerror',e=>console.log('PAGEERROR',e.message));
 p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});p.on('requestfailed',r=>bad.push('FAIL '+r.url()));
 await p.goto(URL_);await p.waitForFunction(()=>!document.getElementById('arcade-start').disabled);
 await p.evaluate(()=>{const P=CanvasRenderingContext2D.prototype,o=P.drawImage;window.__da={};
  P.drawImage=function(img){const c=this.canvas;if(!c||c.id!=='arcade-canvas')return o.apply(this,arguments);
   const key=(img&&img.src?img.src.replace(location.origin+'/','').replace(/\?.*/,''):(img&&img.__k)||('canvas'+(img&&img.width)+'x'+(img&&img.height)));
   const r=window.__da[key]||(window.__da[key]={n:0,s:0,vis:0,dsum:0,lowA:0,zero:0});r.n++;
   if(this.globalAlpha<0.03)r.lowA++;if(img&&img.naturalWidth===0&&img.tagName==='IMG')r.zero++;
   if(r.s<25&&Math.random()<0.25){const a=arguments,n=a.length;let dx,dy,dw,dh;if(n===3){dx=a[1];dy=a[2];dw=img.width;dh=img.height}else if(n===5){[dx,dy,dw,dh]=[a[1],a[2],a[3],a[4]]}else{[dx,dy,dw,dh]=[a[5],a[6],a[7],a[8]]}
    const T=this.getTransform(),pts=[[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([x,y])=>[T.a*x+T.c*y+T.e,T.b*x+T.d*y+T.f]);
    let x0=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[0])))),y0=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[1])))),x1=Math.min(c.width,Math.ceil(Math.max(...pts.map(p=>p[0])))),y1=Math.min(c.height,Math.ceil(Math.max(...pts.map(p=>p[1]))));
    if(x1-x0>1&&y1-y0>1&&(x1-x0)*(y1-y0)<400000){const A=this.getImageData(x0,y0,x1-x0,y1-y0).data;const res=o.apply(this,arguments);const B=this.getImageData(x0,y0,x1-x0,y1-y0).data;let ch=0,sum=0;for(let i=0;i<A.length;i+=4){const d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]);if(d>12){ch++;sum+=d}}r.s++;r.dsum+=ch?sum/ch:0;if(ch>(A.length/4)*0.01)r.vis++;return res}}
   return o.apply(this,arguments)};});
 await p.click('#arcade-start');await p.waitForTimeout(800);await p.evaluate(()=>HapilArcadeApp.debugState().turbo(25));
 let lastBomb=0;
 for(let k=0;k<3000;k++){await p.waitForTimeout(1000);const s=await p.evaluate(()=>{const d=HapilArcadeApp.debugState();return {mode:d.app.mode,i:d.app.stageIndex}});
  if(k-lastBomb>20){lastBomb=k;await p.keyboard.press('x');}
  if(s.mode!=='playing'){console.log('end',JSON.stringify(s));break;}}
 const out=await p.evaluate(()=>({imgs:window.__imgs,da:window.__da}));
 require('fs').writeFileSync(OUT,JSON.stringify(out,null,1));
 const errs=Object.entries(out.imgs).filter(([k,v])=>v.state!=='ok');console.log('images',Object.keys(out.imgs).length,'not ok',JSON.stringify(errs));
 console.log('bad http',bad);
 const rows=Object.entries(out.da).map(([k,r])=>[k,r.n,r.s,r.vis,r.s?Math.round(r.dsum/r.s):0,r.lowA,r.zero]);
 rows.filter(r=>r[2]>=3&&r[3]===0||r[6]>0).forEach(r=>console.log('INVISIBLE?',JSON.stringify(r)));
 console.log('drawn keys',rows.length);
 await b.close();})();
