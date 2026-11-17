'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/arcade-v43.js');
test('campaign pacing retains all named attacks and stable indices while trimming repeated plain attacks',()=>{
 for(const difficulty of ['gentle','normal','hell']){
  const ids=A.plannedSegments(difficulty);assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(ids.filter(i=>A.SEGMENTS[i].spell),A.SEGMENTS.map((g,i)=>i).filter(i=>A.SEGMENTS[i].spell));
  if(difficulty==='hell')assert.equal(ids.length,A.SEGMENTS.length);else assert(ids.length<A.SEGMENTS.length);
  const counts=new Map();for(const i of ids){const g=A.SEGMENTS[i];if(g.kind==='card'&&!g.spell){const k=g.stage+':'+g.actor;counts.set(k,(counts.get(k)||0)+1);}}
  if(difficulty!=='hell')assert([...counts.values()].every(n=>n===1));
 }
});
test('paced live durations use difficulty budgets without altering authored projectile speeds or practice lengths',()=>{
 const wave=A.SEGMENTS.find(g=>g.kind==='wave'),card=A.SEGMENTS.find(g=>g.spell),dur=[];
 for(const difficulty of ['gentle','normal','hell']){const s=A.createRun({difficulty}),practice=A.createRun({difficulty,segment:0});
  assert(s.paced);assert(!practice.paced);assert.equal(A.waveDuration(practice,wave),wave.duration);assert.equal(A.cardDuration(practice,card),card.time);
  dur.push(A.waveDuration(s,wave));assert.equal(s.rules.speed,A.DIFFICULTY[difficulty].speed);
 }
 assert(dur[0]<dur[1]&&dur[1]<dur[2]);
});
test('lives are 5/3/2 and only a chapter boundary restores one life, capped at maximum',()=>{
 for(const [difficulty,hp] of [['gentle',5],['normal',3],['hell',2]]){
  assert.equal(A.createRun({difficulty}).player.hp,hp);
  for(const chapterBoundary of [false,true])for(const full of [false,true]){
   const stage=A.STAGES.findIndex((g,i)=>i<A.STAGES.length-1&&(A.STAGES[i+1].part!==g.part)===chapterBoundary);
   const index=A.SEGMENTS.map((g,i)=>i).filter(i=>A.SEGMENTS[i].stage===stage).pop();
   const s=A.createRun({difficulty,segment:index,pacing:true});s.stage='card';s.boss.present=true;s.boss.hp=0;s.player.hp=full?hp:1;s.player.invulnerableUntil=999;s.bombs=0;
   A.step(s,{});assert.equal(s.stageIndex,stage+1);assert.equal(s.player.hp,full?hp:chapterBoundary?Math.min(hp,2):1);
  }
 }
});
test('easy boss keeps primary patterns and timed glyphs but does not spawn extra bottom hazards',()=>{
 const index=A.SEGMENTS.findIndex(g=>g.spell),s=A.createRun({difficulty:'gentle',segment:index});let glyph=false;
 for(let t=0;t<1000&&s.seg===index;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;A.step(s,{});if(s.figures.length)glyph=true;s.events.length=s.pops.length=s.cancelled.length=0;}
 assert(glyph);assert.equal(s.floor.dropped+s.floor.risen+s.floor.lines+s.floor.mounds,0);assert.equal(s.risen,0);assert(s.peak>0,'primary attack still fires');
});
