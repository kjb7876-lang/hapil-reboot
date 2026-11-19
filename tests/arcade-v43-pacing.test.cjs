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
  assert(s.paced);assert(!practice.paced);assert.equal(A.waveDuration(practice,wave),wave.duration);assert.equal(A.cardDuration(practice,card),card.time);assert.equal(A.cardHp(practice,card),card.hp);
  dur.push(A.waveDuration(s,wave));assert.equal(s.rules.speed,A.DIFFICULTY[difficulty].speed);
 }
 assert(dur[0]<dur[1]&&dur[1]<dur[2]);
});
test('measured campaign HP keeps normal and hell identical, with easy below authored HP',()=>{
 const easy=A.createRun({difficulty:'gentle'}),normal=A.createRun({difficulty:'normal'}),hell=A.createRun({difficulty:'hell'});
 for(const card of A.SEGMENTS.filter(g=>g.kind==='card')){
  assert.equal(A.cardHp(normal,card),A.cardHp(hell,card),'same shared card HP: '+card.actor);
  assert(A.cardHp(easy,card)<A.cardHp(normal,card));assert(A.cardHp(easy,card)<=card.hp);
 }
 assert.equal(A.pacingReport('normal').cardHpScale,A.pacingReport('hell').cardHpScale);
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

test('the controller keeps the correct budget when it returns in a different encounter role',()=>{
 const main=A.SEGMENTS.find(g=>g.actor==='controller'&&!g.mid&&!g.spell&&g.hp===200);
 const mid=A.SEGMENTS.find(g=>g.actor==='controller'&&g.mid&&!g.spell);
 assert.equal(main.hp,mid.hp);
 assert.equal(main.time,mid.time);
 for(const [difficulty,factor] of [['gentle',3],['normal',2.5],['hell',2.5]]){
  const app=A.createRun({difficulty,entranceAll:true,rhythm:true});
  const campaign=A.createRun({difficulty});
  const hp=A.cardHp(campaign,main);
  assert.equal(A.cardHp(app,main),Math.round(hp*1.5));
  assert.equal(A.cardHp(app,mid),Math.round(hp*1.5*factor));
  assert(Math.abs(A.cardDuration(app,mid)-A.cardDuration(app,main)*factor)<1e-10);
 }
});

test('the easy opening midboss loses real HP to shots and can be defeated before timeout',()=>{
 const s=A.createRun({difficulty:'gentle',stage:0,bossOnly:true,entranceAll:true,rhythm:true,seed:12});
 let initialHp,halfAt,activeAt;
 for(let i=0;i<2400&&s.stage!=='bossClear';i++){
  const dx=Math.max(-4,Math.min(4,s.boss.x-s.player.x));
  A.step(s,{dx});
  if(s.stage==='intro')assert.equal(A.timeLeft(s),0);
  if(s.stage!=='card')continue;
  if(activeAt===undefined){
   assert.equal(s.boss.actor,'mb_01');
   activeAt=s.tick-s.segTick;
   initialHp=s.boss.maxHp;
   assert.equal(initialHp,675);
  }
  if(halfAt===undefined&&s.boss.hp<=initialHp/2)halfAt=s.tick;
 }
 assert(halfAt>activeAt);
 assert.equal(s.stage,'bossClear');
 assert(s.tick>halfAt);
 assert.equal(s.cleared,1);
 assert.equal(s.timeouts,0);
 assert.equal(A.timeLeft(s),0);
});

test('the live midboss clock counts firing ticks, but reaching it no longer ends the card (사용자 11-19: 체력이 모두 소진되어야 죽는다)',()=>{
 const s=A.createRun({difficulty:'hell',stage:0,bossOnly:true,entranceAll:true,rhythm:true,seed:12});
 s.player.invulnerableUntil=1e6;
 const ids=A.plannedSegments('hell').filter(i=>A.SEGMENTS[i].stage===0&&A.SEGMENTS[i].mid);
 assert.equal(ids.length,2);
 for(const [phase,id] of ids.entries()){
  const g=A.SEGMENTS[id],duration=A.cardDuration(s,g),delay=phase?40:0;
  while(s.stage!=='card'){assert.equal(A.timeLeft(s),0);assert(s.tick<20000);A.step(s,{dx:-4});}
  assert.equal(s.seg,id);
  // 시간 표시는 그대로 줄어들지만, 0이 되어도 카드는 끝나지 않는다
  while(A.timeLeft(s)>0){const remaining=duration-Math.max(0,s.segTick-delay)/60;assert(Math.abs(A.timeLeft(s)-remaining)<1e-10);s.boss.hp=s.boss.maxHp;A.step(s,{dx:-4});assert.equal(s.seg,id);}
  for(let i=0;i<120;i++){s.boss.hp=s.boss.maxHp;A.step(s,{dx:-4});}
  assert.equal(s.seg,id);assert.equal(s.stage,'card');
  s.boss.hp=0;while(s.seg===id){A.step(s,{dx:-4});assert(s.tick<20000);}
 }
 assert.equal(s.timeouts,0);assert.equal(s.cleared,2);
});
