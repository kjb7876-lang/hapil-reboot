'use strict';
// Native CPU Canvas ordering/lifecycle fixture. Source FX art and its own
// sampling rules are validated by the boss-skills tests, not by this stub.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');require('../src/boss-motion.js');require('../src/actors.js');require('../src/render.js');
test('source skill presentation lifecycle is bounded to the renderer and draws beneath actors, warnings, and the player',async()=>{
 const previousDocument=global.document,previousSkills=global.HapilBossSkills,events=[];let destroyed=0;
 global.document={createElement(){return createCanvas(1,1);}};
 const atlas=await loadImage(path.resolve(__dirname,'../media/boss-motion-v8/violet-atlas-512.png'));
 global.HapilBossSkills={create(images){assert.equal(images.bossMotionViolet,atlas);return{beginFrame(){events.push('begin');},draw(ctx,w,low){assert.equal(w.bossIndex,0);assert.equal(low,true);events.push('skills');},getMetrics(){return{skillSourceDraws:1,skillDrawLimit:4};},destroy(){destroyed++;}};}};
 const canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),dash=ctx.setLineDash.bind(ctx),arc=ctx.arc.bind(ctx);
 ctx.drawImage=function(...a){if(a[0]===atlas)events.push('actor');return draw(...a);};ctx.setLineDash=function(a){if(a[0]===7&&a[1]===7)events.push('warning');return dash(a);};ctx.arc=function(x,y,r,...a){if(x===180&&y===560&&r===3)events.push('player-hitpoint');return arc(x,y,r,...a);};
 const renderer=global.HapilRenderer.create(canvas,{bossMotionViolet:atlas});renderer.resize(360,640,1);
 try{
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:0,seed:941});w.stage='boss';w.phaseTime=5;w.boss.action='recover';w.boss.actionProgress=1;w.effects=[];w.bullets=[];w.shots=[];w.enemies=[];w.player.x=180;w.player.y=560;
  w.hazards=[{id:1,phase:'warning',x1:180,y1:110,x2:180,y2:610,width:8,progress:.6}];
  renderer.draw(w,0,5,true);
  assert(events.indexOf('begin')<events.indexOf('skills'));assert(events.indexOf('skills')<events.indexOf('actor'));assert(events.indexOf('skills')<events.indexOf('warning'));assert(events.indexOf('skills')<events.indexOf('player-hitpoint'));
  assert.deepEqual(renderer.getMetrics().bossSkillsPresentation,{skillSourceDraws:1,skillDrawLimit:4});
 }finally{renderer.destroy();global.document=previousDocument;global.HapilBossSkills=previousSkills;}
 assert.equal(destroyed,1);
});
