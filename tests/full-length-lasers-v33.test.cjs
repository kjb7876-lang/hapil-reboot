'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js'),L=require('../src/boss-lasers-v28.js');
const edge=(x,y)=>Math.min(Math.abs(x),Math.abs(x-360),Math.abs(y),Math.abs(y-640))<1e-6;
test('every admitted full-length phrase reaches an actual outer map edge for all315 boss configurations',()=>{
 let rays=0,reflections=0;const modes=new Set();
 for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of['gentle','normal','hell']){
  const w={combatRevision:31,bossIndex:index,phase,difficulty,boss:{id:1},player:{x:180,y:550,r:3}},emitter={x:180,y:126};
  const specs=L.makeBarrage(w,emitter,1,{fullLength:true,escapeRoute:{x1:180,y1:260,x2:180,y2:614,halfWidth:24},playerRadius:3});assert(specs.length>0,[index,phase,difficulty].join('/'));
  assert.deepEqual(specs,L.makeBarrage(w,emitter,1,{fullLength:true,escapeRoute:{x1:180,y1:260,x2:180,y2:614,halfWidth:24},playerRadius:3}));
  for(const s of specs){assert(edge(s.x2,s.y2),JSON.stringify(s));assert(!s.v28RouteClipped);assert(Math.abs(s.length-Math.hypot(s.x2-s.x,s.y2-s.y))<1e-6);rays++;modes.add(s.v28Mode);if(s.v28Reflected){reflections++;assert(s.x2===0||s.x2===360||s.v28Segment===1);}}
 }assert(rays>1000);assert(reflections>0);assert(modes.size>=10);
});
test('actual core warning, active and fade retain their full outer-edge promise',()=>{
 let checked=0;for(const index of[0,1,3,4,6,8,11,18,24,33,34]){
  const first=C.createRun({campaign:true,campaignRevision:5,combatRevision:31,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'full-length-qa'}),snap=C.checkpoint(first);snap.phase=2;const w=C.restoreCheckpoint(snap);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;const known=new Map();
  for(let n=0;n<600;n++){C.step(w,{});for(const h of w.hazards.filter(h=>h.laserBarrage)){assert(edge(h.x2,h.y2));const value=JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.activeAt,h.fadeAt,h.expireAt]);if(known.has(h.id))assert.equal(value,known.get(h.id));else{known.set(h.id,value);checked++;}}}
  assert(known.size>0,'no complete barrage for boss '+index);
 }assert(checked>60);
});
