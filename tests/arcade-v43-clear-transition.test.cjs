'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/arcade-v43.js');
const h=require('./helpers/arcade-v43.cjs');
function boss(stage,last=true,options={}){
  const cards=A.SEGMENTS.map((g,i)=>({g,i})).filter(({g})=>g.stage===stage&&g.kind==='card');
  const index=last?cards.at(-1).i:cards[0].i,s=A.createRun({...options,stage,segment:index,seed:7,distort:false});
  for(let i=0;i<300&&s.stage!=='card';i++){s.player.invulnerableUntil=1e8;A.step(s,{});h.clear(s);}
  assert.equal(s.stage,'card');s.player.invulnerableUntil=s.tick+30;s.boss.hp=0;return s;
}
test('a stage boss records its clear immediately and waits 90 ticks before the next map',()=>{
  const s=boss(0);A.step(s,{});assert.equal(s.stage,'clear');assert.equal(s.stageIndex,0);assert.equal(s.results.length,1);assert(s.events.includes('stageClear'));assert(s.events.includes('bossDown'));
  const frozen={tick:s.tick,score:s.score,bombs:s.bombs,hp:s.player.hp,x:s.player.x,rng:s.rng,inv:s.player.invulnerableUntil,haste:s.hasteUntil,items:s.itemCount};
  for(let i=0;i<A.STAGE_CLEAR_TICKS-1;i++){h.clear(s);A.step(s,{dx:100,dy:-100,bomb:true});assert.equal(s.stage,'clear');assert(!s.events.includes('stageClear'));}
  assert.deepEqual({tick:s.tick,score:s.score,bombs:s.bombs,hp:s.player.hp,x:s.player.x,rng:s.rng,inv:s.player.invulnerableUntil,haste:s.hasteUntil,items:s.itemCount},frozen);
  A.step(s,{});assert.equal(s.stageIndex,1);assert.equal(s.results.length,1);assert(s.events.includes('map'));assert.notEqual(s.stage,'clear');
});
test('ordinary boss phase and middle-boss breaks retain their existing timing',()=>{
  const s=boss(0,false);A.step(s,{});assert.notEqual(s.stage,'clear');assert.equal(s.stageIndex,0);assert.equal(s.results.length,0);
});
test('final stage and boss practice finish only after the short clear interval, without duplicate rewards',()=>{
  for(const [stage,options] of [[A.STAGES.length-1,{}],[3,{bossOnly:true}],[0,{stages:1}]]){
    const s=boss(stage,true,options);A.step(s,{});assert.equal(s.stage,'clear');assert.equal(s.results.length,1);
    for(let i=0;i<A.STAGE_CLEAR_TICKS;i++){h.clear(s);A.step(s,{});}
    assert.equal(s.stage,'won');assert.equal(s.results.length,1);assert(s.events.includes('win'));
  }
});
test('a timeout retains its original advance rule instead of awarding a new boss-clear pause',()=>{
  const s=boss(0);s.boss.hp=1e6;s.segTick=A.SEGMENTS[s.seg].time*60;A.step(s,{});assert.equal(s.stageIndex,1);assert.notEqual(s.stage,'clear');assert.equal(s.timeouts,1);
});
test('all 56 stage boundaries advance once and preserve the recorded clear',()=>{
  for(let stage=0;stage<A.STAGES.length;stage++){
    const s=boss(stage);A.step(s,{});assert.equal(s.stage,'clear','stage '+stage);
    for(let i=0;i<A.STAGE_CLEAR_TICKS;i++){h.clear(s);A.step(s,{});}
    assert.equal(s.results.length,1);assert.equal(s.results[0].stage,stage);
    if(stage===A.STAGES.length-1)assert.equal(s.stage,'won');else assert.equal(s.stageIndex,stage+1);
  }
});
