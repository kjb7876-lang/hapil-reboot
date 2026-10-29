'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/projectiles.js');const p=global.HapilProjectiles;

test('acceleration cue is stable from launch and uses only its owner palette',()=>{
 for(let bossIndex=0;bossIndex<12;bossIndex++)for(const paletteSlot of [0,1]){
  const w={campaign:true,bossIndex},base={paletteSlot},fast={paletteSlot,acceleration:50,accelerateAt:1.15,age:0},late={...fast,age:3};
  const original=p.paletteFor(w,base),cue=p.bulletPalette(w,fast);
  assert.deepEqual(p.bulletPalette(w,base),original);
  assert.deepEqual(p.bulletPalette(w,late),cue);
  assert.equal(cue.secondary,original.secondary);assert.equal(cue.accent,original.accent);
  assert.equal(cue.id,original.id+'-accelerating');
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const source=rgb(original.primary),secondary=rgb(original.secondary),got=rgb(cue.primary);
  for(let i=0;i<3;i++)assert.equal(got[i],Math.round(source[i]*.48+secondary[i]*.52));
 }
 assert.equal(p.bulletPalette({bossIndex:999},{acceleration:50}),null);
});

test('curve and pause cues are determined at birth and keep owner color channels',()=>{
 for(let bossIndex=0;bossIndex<12;bossIndex++)for(const paletteSlot of [0,1]){
  const w={bossIndex},base=p.paletteFor(w,{paletteSlot});
  for(const [role,properties,target,weight] of [
   ['curving',{curveRate:.18,curveUntil:1.2},base.secondary,.25],
   ['pausing',{pauseFrom:.55,pauseUntil:.85},base.accent,.55]
  ]){
   const bullet={paletteSlot,...properties,age:0},cue=p.bulletPalette(w,bullet);
   assert.deepEqual(p.bulletPalette(w,{...bullet,age:3}),cue);
   assert.equal(cue.id,base.id+'-'+role);assert.equal(cue.secondary,base.secondary);
   const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
   const from=rgb(base.primary),to=rgb(target),got=rgb(cue.primary);
   for(let i=0;i<3;i++)assert.equal(got[i],Math.round(from[i]*(1-weight)+to[i]*weight));
  }
 }
});
