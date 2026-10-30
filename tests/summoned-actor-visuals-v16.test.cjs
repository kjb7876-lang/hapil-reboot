'use strict';
// Asset-contract fixture: stub image headers and draw calls, not a decoded-image
// or real-mobile test. Production loads the same encounter's verified poses.
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/boss-motion.js');require('../src/actors.js');
const API=global.HapilActors;
function ctxFixture(){const calls=[],ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(im){calls.push(im.key)},arc(){throw Error('enemy ring drawn')}};return {ctx,calls};}
function imagesFor(id){const images={};for(const p of Object.values(API.contracts[id].poses))images[p.key]={key:p.key,complete:true,naturalWidth:p.width,naturalHeight:p.height};return images;}
const names={weaver:'spider',wraith:'swamp',ember:'ember',echo:'echo',vial:'vial',guard:'guard',denial:'denial'};
test('every existing wave actor paints its own verified four-pose image during a boss battle without an enemy ring',()=>{
 for(const [archetype,identity] of Object.entries(names))for(const action of ['idle','move','charge','attack','hit']){
  const im=imagesFor(identity),actor=API.create(im),{ctx,calls}=ctxFixture(),w={campaign:true,stage:'boss',time:2,tick:120,bossIndex:5};
  const e={archetype,x:120,y:180,baseX:120,age:2,action,actionProgress:.5,wobble:0,lean:0};
  assert.equal(actor.drawEnemy(ctx,w,e),true);assert.equal(calls.length,1);assert(Object.values(API.contracts[identity].poses).some(p=>p.key===calls[0]));assert.equal(actor.getMetrics().enemyDraws,1);
 }
});
test('an unready actor never draws another enemy or a geometric substitute in actor presentation',()=>{
 for(const [archetype,identity] of Object.entries(names)){
  const im=imagesFor(identity);delete im[API.contracts[identity].poses.walk.key];const actor=API.create(im),{ctx,calls}=ctxFixture();
  assert.equal(actor.drawEnemy(ctx,{campaign:true,stage:'boss',tick:20},{archetype,x:180,y:120,age:1}),false);assert.deepEqual(calls,[]);
 }
});

test('decoded actual guard poses draw ordinary enemies below and summoned enemies above the boss',async()=>{
 const fs=require('node:fs'),path=require('node:path');const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
 const core=require('../src/core.js');require('../src/render.js');const raw=fs.readFileSync(path.resolve(__dirname,'../src/media.js'),'utf8'),media=require('../tools/read-media-registry.cjs')();
 const keys=['sinPrideAtlas','gunner','h14MapPride',...Object.values(API.contracts.guard.poses).map(p=>p.key)],images={};
 for(const k of keys)images[k]=await loadImage(path.resolve(__dirname,'..',media[k]));
 const previous=global.document;global.document={createElement:()=>createCanvas(1,1)};const canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),events=[];
 ctx.drawImage=function(im,...args){if(im===images.sinPrideAtlas)events.push('boss');if(Object.values(API.contracts.guard.poses).some(p=>im===images[p.key]))events.push('guard');return draw(im,...args)};
 const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
 try{const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:11,difficulty:'normal',seed:42});w.enemies=[{archetype:'guard',x:70,y:160,baseX:70,age:2,action:'idle',hp:60,maxHp:60},{archetype:'guard',x:290,y:160,baseX:290,age:2,action:'idle',hp:60,maxHp:60,summoned:true}];renderer.draw(w,0,w.time,false);assert.deepEqual(events,['guard','boss','guard']);assert.equal(renderer.getMetrics().actorPresentation.enemyDraws,2)}finally{renderer.destroy();global.document=previous}
});
