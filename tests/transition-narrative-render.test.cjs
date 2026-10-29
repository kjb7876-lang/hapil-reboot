'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/render.js');
test('chronological bridge wraps Korean above the player lane and leaves the actual hazard on top',async()=>{
 const previous=global.document;global.document={createElement(){return createCanvas(1,1);}};
 const atlas=await loadImage(path.resolve(__dirname,'../media/boss-motion-v8/lucifer-atlas-512.png'));
 const canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),events=[],drawText=ctx.fillText.bind(ctx),stroke=ctx.stroke.bind(ctx);
 ctx.fillText=function(text,x,y,...args){events.push({kind:'text',text,x,y,width:ctx.measureText(text).width});return drawText(text,x,y,...args);};
 ctx.stroke=function(...args){events.push({kind:'stroke',dashes:ctx.getLineDash()});return stroke(...args);};
 const renderer=global.HapilRenderer.create(canvas,{bossMotionLucifer:atlas});renderer.resize(360,640,1);
 try{
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:4,seed:412});w.stage='transition';w.stageLabel='병원에서 의목사의 첫 임무로';w.phase=2;w.phaseTime=5;w.effects=[];w.shots=[];w.bullets=[];w.enemies=[];
  w.transitionNarrative=['병원에서 눈을 뜬 환도는 미카엘라의 치료를 받는다.','오랜 치료를 거친 뒤 의목사 후보생이 되어 배운다.','쉼터에서 미카엘라가 자신의 과거를 기억하지 못한다는 사실을 알게 된다.','솔로몬의 봉인 자격시험에서 72개의 트라우마 형상을 마주한다. 욕망이 행동을 끌고 가지 못하도록 봉인한다.','의목사 자격을 얻은 뒤 일곱 검은 신호를 조사하는 첫 임무를 맡는다.'];
  w.hazards=[{id:1,phase:'warning',x1:180,y1:90,x2:180,y2:580,width:8,progress:.4}];
  for(let page=0;page<5;page++){
   w.stageTime=page*3+.1;events.length=0;renderer.draw(w,0,5,false);
   const text=events.filter(e=>e.kind==='text'&&e.x===40&&e.y>=132);
   assert(text.length>0);assert.equal(text.map(e=>e.text).join('').replaceAll(' ',''),w.transitionNarrative[page].replaceAll(' ',''),'current page is fully rendered');
   for(const line of text){assert(Array.from(line.text).length<=32);assert(line.width<=278);assert(line.y<=216,'body stays within upper bridge panel');}
   assert(events.some(e=>e.kind==='text'&&e.text===(page+1)+' / 5'));
   assert.equal(renderer.getMetrics().actorPresentation.bossDraws,0,'old defeated boss is suppressed while bridge text is displayed');
   const lastText=events.findLastIndex(e=>e.kind==='text'&&e.x===40&&e.y>=132),warning=events.findLastIndex(e=>e.kind==='stroke'&&e.dashes[0]===7&&e.dashes[1]===7);
   assert(warning>lastText,'a still-committed laser warning remains visible over the narrative');
  }
 }finally{renderer.destroy();global.document=previous;}
});
