'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/render.js');
test('Drive eight-phase memory effect keeps the authored tip fixed and plays once within the skill lifetime',()=>{
 const previous=global.document;global.document={createElement(){return createCanvas(1,1)}};
 const atlas=createCanvas(1024,512);atlas.complete=true;atlas.naturalWidth=1024;atlas.naturalHeight=512;
 const output=createCanvas(360,640);output.style={};const ctx=output.getContext('2d'),calls=[],original=ctx.drawImage.bind(ctx);
 ctx.drawImage=function(...a){if(a[0]===atlas)calls.push({a:a.slice(1),m:ctx.getTransform()});return original(...a)};
 const renderer=global.HapilRenderer.create(output,{fxWindArrow8V6:atlas});renderer.resize(360,640,1);
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:1,seed:4});w.autoAttack=false;w.skillRotation=false;w.bullets=[];w.hazards=[];w.shots=[];w.enemies=[];
 try{for(const low of [false,true])for(const [age,frame] of [[.01,0],[.06,1],[.16,3],[.36,7],[.45,null]]){
  calls.length=0;w.effects=[{kind:'memory',x:170,y:430,age,ttl:.4}];renderer.draw(w,0,1,low);
  assert.equal(calls.length,frame===null?0:1);if(frame===null)continue;
  const {a,m}=calls[0];assert.deepEqual(a.slice(0,4),[(frame%4)*256,Math.floor(frame/4)*256,256,256]);
  const scale=a[6]/256,lx=a[4]+192*scale,ly=a[5]+128*scale;
  assert(Math.abs(m.a*lx+m.c*ly+m.e-170)<1e-8);assert(Math.abs(m.b*lx+m.d*ly+m.f-420)<1e-8);
  assert(m.b<0,'source forward axis points up the playfield');
 }}finally{renderer.destroy();global.document=previous;}
});
