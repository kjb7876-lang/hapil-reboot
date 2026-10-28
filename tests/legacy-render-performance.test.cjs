'use strict';
// Native CPU canvas: deterministic render safety and call-count checks, not GPU or mobile timing.
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',require('path').resolve(__dirname,'..')]}));
const core=require('../src/core.js');
require('../src/render.js');
function fixture(){
 const allocated=[];const previous=global.document;
 global.document={createElement(name){assert.equal(name,'canvas');const c=createCanvas(1,1);allocated.push(c);return c;}};
 const images={};for(const [i,key] of ['forest','ruins','cave'].entries()){const c=createCanvas(720,904);c.getContext('2d').fillStyle=['#3b5646','#625347','#303a4c'][i];c.getContext('2d').fillRect(0,0,720,904);c.complete=true;c.naturalWidth=720;c.naturalHeight=904;images[key]=c;}
 const main=createCanvas(360,640);main.style={};const ctx=main.getContext('2d');const dashes=[];const oldDash=ctx.setLineDash.bind(ctx);ctx.setLineDash=function(a){dashes.push([...a]);return oldDash(a)};
 const renderer=global.HapilRenderer.create(main,images);renderer.resize(360,640,1);
 const fg=allocated[1].getContext('2d');let foregroundDraws=0;const original=fg.drawImage.bind(fg);fg.drawImage=function(...args){foregroundDraws++;return original(...args)};
 return {main,renderer,dashes,get foregroundDraws(){return foregroundDraws},close(){renderer.destroy();global.document=previous;}};
}
function world(){const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:1,seed:4});w.autoAttack=false;w.skillRotation=false;w.phaseTime=4;w.hazards=[];w.bullets=[];return w;}
test('stationary boss scenery reuses cached foreground and invalidates on map change',()=>{
 const f=fixture();try{const w=world();f.renderer.draw(w,0,1,false);const first=f.foregroundDraws;assert(first>=2);f.renderer.draw(w,0,1,false);assert.equal(f.foregroundDraws,first);w.bossIndex=2;f.renderer.draw(w,0,1,false);assert.equal(f.foregroundDraws,first+2);}finally{f.close();}
});
test('low quality keeps warning dash and opaque active beam and bullet cores',()=>{
 const f=fixture();try{const w=world();w.hazards=[{id:1,phase:'warning',x1:180,y1:250,x2:180,y2:550,width:10,progress:.5}];w.bullets=[{x:240,y:450,r:5,color:'#ff858f',vx:0,vy:80}];
 for(const low of [false,true]){f.dashes.length=0;f.renderer.draw(w,0,1,low);assert(f.dashes.some(a=>a.length===2&&a[0]===7&&a[1]===7),'telegraph dash visible in both modes');}
 w.hazards[0].phase='active';f.renderer.draw(w,0,1,false);const ctx=f.main.getContext('2d'),beam=Array.from(ctx.getImageData(180,400,1,1).data),bullet=Array.from(ctx.getImageData(240,450,1,1).data);f.renderer.draw(w,0,1,true);assert.deepEqual(Array.from(ctx.getImageData(180,400,1,1).data),beam);assert.deepEqual(Array.from(ctx.getImageData(240,450,1,1).data),bullet);
 }finally{f.close();}
});
