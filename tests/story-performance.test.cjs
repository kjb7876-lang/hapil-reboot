'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/story-combat.js');
test('collision broad phase never rejects a swept hit, graze or parry',()=>{
 let seed=123456789;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 let relevant=0,rejected=0;
 for(let i=0;i<50000;i++){
  const p={px:random()*360,py:random()*640,x:random()*360,y:random()*640};
  const b={px:random()*360,py:random()*640,x:random()*360,y:random()*640,halfLength:random()*35,angle:random()*Math.PI*2};
  const radius=2+random()*40,exact=C.geometry.bulletDistanceSquared(b,p.px,p.py,p.x,p.y),may=C.geometry.bulletMayReachPlayer(b,p,radius);
  if(exact<=radius*radius){relevant++;assert.equal(may,true,`missed swept collision ${i}`);}else if(!may)rejected++;
 }
 assert(relevant>1000);assert(rejected>1000);
});
test('collision prefilter conservatively retains floating-point boundaries and malformed data for the exact path',()=>{
 const p={px:0,py:0,x:0,y:0},b={px:25.000000000000004,py:0,x:25.000000000000004,y:0,halfLength:9,angle:0};
 assert.equal(C.geometry.bulletDistanceSquared(b,0,0,0,0),256);assert.equal(C.geometry.bulletMayReachPlayer(b,p,16),true);
 for(const halfLength of [NaN,Infinity,-1])assert.equal(C.geometry.bulletMayReachPlayer({...b,halfLength},p,16),true);
 for(const radius of [NaN,Infinity,-1])assert.equal(C.geometry.bulletMayReachPlayer(b,p,radius),true);
 for(const bad of [NaN,Infinity])assert.equal(C.geometry.bulletMayReachPlayer({...b,x:bad},p,16),true);
});
test('swept needles, graze, parry and harmless shots keep their actual consequences',()=>{
 const spec={id:'ordinary-boss',sceneId:'dist00',resolution:'cleared',stages:[{id:'s1',label:'test',sourceExplicit:[],target:'body',adaptation:{pattern:'fan',windupTicks:60,activeTicks:150,recoveryTicks:90,intervalTicks:36,count:8,speed:90,spread:.16}}]};
 function check(dx,vx,options={}){const w=C.create(spec,{runId:'perf-check',seed:12,difficulty:'normal'});if(options.parry)w.player.parryUntil=20;w.bullets.push({id:999,x:180+dx,y:540,px:180+dx,py:540,r:3,halfLength:7,angle:0,baseVX:vx,baseVY:0,vx,vy:0,kind:'needle',ageTicks:0,age:0,harmful:options.harmful!==false,grazed:false});C.step(w,{skillRotation:false});return w;}
 const hit=check(40,-2400);assert.equal(hit.stats.hits,1);assert.equal(hit.player.hp,2);
 const graze=check(22,0);assert.equal(graze.stats.graze,1);assert.equal(graze.stats.hits,0);
 const parry=check(35,0,{parry:true});assert.equal(parry.stats.reflected,1);assert.equal(parry.stats.hits,0);
 const harmless=check(0,0,{harmful:false});assert.equal(harmless.stats.hits,0);assert.equal(harmless.stats.graze,0);
 // A malformed radius must go through the prior exact path, even though
 // normal authored bullets never produce negative radii.
 const w=C.create(spec,{runId:'negative-radius',seed:12,difficulty:'normal'});w.player.parryUntil=20;
 w.bullets.push({id:998,x:193,y:540,px:193,py:540,r:-20,halfLength:0,angle:0,baseVX:0,baseVY:0,vx:0,vy:0,kind:'orb',ageTicks:0,age:0,harmful:true,grazed:false});
 C.step(w,{skillRotation:false});assert.equal(w.stats.reflected,0);assert.equal(w.stats.hits,1);
});
