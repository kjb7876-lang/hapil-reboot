'use strict';
// Native CPU Canvas fixtures. This checks the shared full renderer, not a
// browser/GPU, natural play, or the alpha baked into source artwork.
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');
require('../src/boss-motion.js');require('../src/actors.js');require('../src/render.js');
async function fixture(){
 const previous=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 const images={};
 for(const id of ['Violet','Horn','Balrog','Mask','Lucifer'])images['bossMotion'+id]=await loadImage(path.resolve(__dirname,'../media/boss-motion-v8/'+id.toLowerCase()+'-atlas-512.png'));
 const main=createCanvas(360,640);main.style={};const ctx=main.getContext('2d'),arcs=[],original=ctx.arc.bind(ctx),dashes=[],dash=ctx.setLineDash.bind(ctx);
 ctx.arc=function(x,y,r,a,b,...rest){const m=ctx.getTransform();arcs.push({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,r,a,b});return original(x,y,r,a,b,...rest);};
 ctx.setLineDash=function(a){dashes.push([...a]);return dash(a);};
 const renderer=global.HapilRenderer.create(main,images);renderer.resize(360,640,1);
 return{renderer,arcs,dashes,close(){renderer.destroy();global.document=previous;}};
}
test('real five-boss portraits have no renderer-drawn ring around their combat pivot',async()=>{
 const f=await fixture();try{
  for(let i=0;i<5;i++)for(const action of ['recover','charge','attack'])for(const low of [false,true]){
   const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,seed:811});
   w.phase=2;w.phaseTime=5;w.stage='boss';w.boss.x=181;w.boss.y=145;w.boss.action=action;w.boss.actionProgress=.6;
   w.effects=[];w.hazards=[];w.bullets=[];w.shots=[];w.enemies=[];w.player.egoUntil=0;
   f.arcs.length=0;f.renderer.draw(w,0,5,low);
   const aroundBody=f.arcs.filter(a=>Math.abs(a.x-w.boss.x)<1&&Math.abs(a.y-w.boss.y)<13&&a.r>10);
   assert.deepEqual(aroundBody,[],`decorative ${action} ring remains for boss ${i}`);
   assert.equal(f.renderer.getMetrics().actorPresentation.lastBossIdentity,core.CAMPAIGN_BOSSES[i].id,'verified real boss sprite remains in use');
  }
 }finally{f.close();}
});
test('enemy charge does not add a surrounding ring; player hitpoint and laser telegraph remain',async()=>{
 const f=await fixture();try{
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:0,seed:812});
  w.phaseTime=5;w.boss=null;w.effects=[];w.bullets=[];w.shots=[];
  w.enemies=[{x:147,y:330,r:12,archetype:'weaver',action:'charge',actionProgress:.6,age:3,hp:10,maxHp:10}];
  w.hazards=[{id:1,phase:'warning',x1:50,y1:250,x2:300,y2:500,width:8,progress:.5}];
  for(const low of [false,true]){
   f.arcs.length=0;f.dashes.length=0;f.renderer.draw(w,0,5,low);
   assert.equal(f.arcs.some(a=>Math.abs(a.x-147)<1&&Math.abs(a.y-330)<1&&a.r>=10),false);
   assert(f.arcs.some(a=>Math.abs(a.x-w.player.x)<1&&Math.abs(a.y-w.player.y)<1&&a.r===w.player.r),'small white player hitpoint is kept');
   assert(f.dashes.some(a=>a.length===2&&a[0]===7&&a[1]===7),'committed laser warning remains visible');
  }
 }finally{f.close();}
});
