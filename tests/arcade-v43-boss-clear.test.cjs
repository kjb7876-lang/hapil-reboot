'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need(),Intros=require('../src/arcade-boss-intros-v43.js');
const MAIN=A.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid),MID=A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.mid);
const CHAIRMAN=A.SEGMENTS.findIndex(g=>g.actor==='p2_chairman');
function make(options={}){return A.createRun(Object.assign({difficulty:'hell',segment:MAIN,pacing:true,seed:41},options));}
function entered(options={}){
 const s=make(options);assert.equal(A.prepareBossEntrance(s),true);
 for(let i=0;i<200&&s.stage!=='card';i++)A.step(s,{});
 assert.equal(s.stage,'card');return s;
}
function atLast(s){
 const actor=s.boss.actor,stage=s.stageIndex;
 while(true){
  const next=A.SEGMENTS[A.nextSegmentIndex(s)];if(!next||next.kind!=='card'||next.actor!==actor||next.stage!==stage)return s;
  s.boss.hp=0;A.step(s,{});assert.equal(s.stage,'break','an intermediate card keeps its normal short break');
  for(let i=0;i<100&&s.stage!=='card';i++)A.step(s,{});assert.equal(s.stage,'card');
 }
}
function resources(s){return {hp:s.player.hp,bombs:s.bombs,gauge:s.gauge,power:s.power,exp:s.exp,fills:s.fills,bombLevel:s.bombLevel,bombsUsed:s.bombsUsed,autoBombs:s.autoBombs,score:s.score,kills:s.kills,hits:s.hits,hearts:s.hearts,graze:s.graze,items:s.itemCount,itemsTaken:s.itemsTaken,broken:s.orbsBroken,fragments:s.orbFragments,cleared:s.cleared,captures:s.captures,lastWipe:s.lastWipe};}
function hazardSeed(s){
 h.put(s,20,200,{bage:100,bsize:5,bcolor:A.PROPS.findIndex(p=>p.key==='p3_core'),bmode:A.MODE_SPLIT,bat:900});s.bbreakable[s.n-1]=1;s.bhp[s.n-1]=3;
 s.sn=1;s.sx[0]=10;s.sy[0]=10;s.svx[0]=0;s.shoming[0]=0;
 s.mobs.push({hp:100,age:10,first:99999,next:99999,baseX:80,x:80,y:80,vx:0,vy:0,r:10,sway:0});
 s.lasers.push({x:0,y:s.player.y,angle:0,width:200,warn:0,active:100,age:50});
 s.figures.push({kind:'runes',age:50,warn:0,active:100});s.ripples.push({x:s.player.x,age:A.HAND_WARN-1});
 s.risers=[{kind:'sun',x:s.player.x,y:s.player.y,size:100,age:A.RISER_WARN,fade:0}];s.riserDue=2;
 s.floor.grid.fill(1);s.floor.hill.fill(80);s.floor.goal.fill(100);s.floor.pieces.push({cells:[[0,0]],col:0,y:500});
 s.floor.warns.push({x:180,age:44});s.floor.bursts=[{age:0}];s.floor.kind='blocks';s.floor.clearing=1;
 s.cancelled.push(1,2,0);s.drifted.push(1,2,0,0,1);s.pops.push(1,2,0);s.zaps.push(1,2,3,4,1);
 s.bombPulse={left:7,next:s.tick+2,lv:7};s.pulseInfo={index:0,targets:[180,156]};s.lastBomb={tick:s.tick-1};
}
function assertEmpty(s){
 assert.equal(s.n,0);assert.equal(s.sn,0);
 for(const k of ['mobs','lasers','figures','ripples','risers','cancelled','drifted','pops','zaps'])assert.equal(s[k].length,0,k);
 assert.equal(s.bombPulse,null);assert.equal(s.pulseInfo,null);assert.equal(s.lastBomb,null);assert.equal(s.riserDue,0);
 for(const k of ['grid','hill','goal'])assert(s.floor[k].every(v=>v===0),k);
 for(const k of ['pieces','warns','bursts'])assert.equal(s.floor[k].length,0,k);
}
function defeat(s){s.events.length=0;s.lastWipe=s.tick;s.boss.hp=0;A.step(s,{});return s;}

test('cinematic eligibility shares the canonical seven-sin allowlist, with only the chairman as a real midboss exception',()=>{
 const names=['p2_belphegor','p2_leviathan','p2_beelzebub','asmodeus','p2_greed','p2_mammon','p2_wrath','pride','p2_chairman','p2_core'];
 for(const actor of names){assert.equal(Intros.isSinBoss(actor),true);assert.equal(A.isCinematicBoss(actor,true),true);}
 const mid=Array.from(new Set(A.SEGMENTS.filter(g=>g.mid&&A.isCinematicBoss(g.actor,g.mid)).map(g=>g.actor)));
 assert.deepEqual(mid,['p2_chairman']);assert.equal(A.isCinematicBoss(A.SEGMENTS[MID].actor,true),false);
 assert.equal(A.isCinematicBoss('violet',false),true);assert.equal(A.prepareBossEntrance(make({segment:MID})),false);
 const chair=entered({segment:CHAIRMAN});assert.equal(chair.boss.mid,true);assert.equal(chair.cinematicEncounter.actor,'p2_chairman');
});

test('next-segment helper follows authored order, difficulty skips, boss-only scope and last-stage limits',()=>{
 for(const difficulty of ['gentle','normal','hell'])for(const pacing of [false,true]){
  const plan=pacing?A.plannedSegments(difficulty):A.SEGMENTS.map((_,i)=>i);
  for(let j=0;j<plan.length;j++){
   const s=make({difficulty,pacing,segment:plan[j]});assert.equal(A.nextSegmentIndex(s),plan[j+1]===undefined?A.SEGMENTS.length:plan[j+1]);
  }
 }
 const s=atLast(entered({bossOnly:true}));assert.equal(A.nextSegmentIndex(s),A.SEGMENTS.length);
 const t=atLast(entered({stages:1}));assert.equal(A.nextSegmentIndex(t),A.SEGMENTS.length);
});

test('last cinematic defeat clears all attacks with ordinary rewards exactly once and no bullet-clear bonus',()=>{
 const s=atLast(entered()),control=atLast(entered());hazardSeed(s);
 const oldActor=s.boss.actor,seg=s.seg,before=resources(s);defeat(s);defeat(control);
 assert.equal(s.stage,'bossClear');assert.equal(s.seg,seg);assert.equal(s.stageTick,0);assertEmpty(s);
 assert.deepEqual(resources(s),resources(control),'adding residual hazards does not add score, drops, fragments or resource use');
 assert.equal(s.cleared,before.cleared+1);assert.equal(s.orbsBroken,before.broken);assert.equal(s.orbFragments,before.fragments);
 assert.equal(s.bombsUsed,before.bombsUsed);assert.equal(s.itemsTaken,before.itemsTaken);assert.equal(s.boss.present,false);
 assert.equal(s.boss.actor,oldActor);assert.equal(s.boss.down.actor,oldActor);assert.equal(s.bossClear.actor,oldActor);
 assert.equal(s.boss.down.seg,seg);assert.equal(s.bossClear.segment,seg);assert.equal(s.bossClear.readyTick-s.bossClear.startedTick,120);
 assert.equal(s.events.filter(e=>e==='bossClear').length,1);assert.equal(s.events.filter(e=>e==='bossDown').length,1);
 assert.equal(s.results.length,1);assert(s.events.includes('stageClear'));assert.equal(s.bossClear.stageCommitted,true);assert.equal(s.bossClear.nextSegment,A.nextSegmentIndex(s));
});

test('clear phase saves the defeated stage immediately and transitions after 120 ticks without a duplicate result',()=>{
 const s=atLast(entered());hazardSeed(s);defeat(s);const phase=structuredClone(s.bossClear),before=resources(s),b=structuredClone(s.boss),items=Array.from(s.iy.slice(0,s.itemCount)),x=s.player.x,result=structuredClone(s.results[0]);
 assert.equal(s.results.length,1);assert.equal(result.stage,phase.stageIndex);assert.equal(s.mark.tick,phase.startedTick);
 const saved=A.Progress.record(A.Progress.fresh(),result,s.difficulty);assert(saved.cleared.includes(phase.stageIndex),'quitting during the visual pause can already persist the win');
 for(let i=1;i<120;i++){
  A.step(s,{dx:.2,bomb:true});assert.equal(s.stage,'bossClear');assert.equal(s.seg,phase.segment);assertEmpty(s);
  assert.deepEqual(resources(s),before);assert.deepEqual(s.boss,b);assert.deepEqual(Array.from(s.iy.slice(0,s.itemCount)),items);assert.equal(s.results.length,1);assert.deepEqual(s.results[0],result);
 }
 assert(s.player.x>x,'movement remains available');assert.equal(s.tick,phase.readyTick-1);
 A.step(s,{bomb:true});assert.equal(s.tick,phase.readyTick);assert.equal(s.stage,'wave');assert.equal(s.stageIndex,phase.stageIndex+1);
 assert.equal(s.results.length,1);assert.deepEqual(s.results[0],result);assert.equal(s.mark.tick,phase.readyTick,'the next stage starts its own clock after the visual pause');
 assert.equal(s.events.filter(e=>e==='stageClear').length,1);assert.equal(s.events.filter(e=>e==='bossDown').length,1);
 assert.equal(s.bombsUsed,before.bombsUsed);assert.equal(s.cleared,before.cleared);assert.equal(s.bombPulse,null);assert.equal(s.n,0);assert.equal(s.sn,0,'new attacks wait until the next update');
});

test('cinematic victory holds apply to all heroes and difficulties and include boss-only final victory',()=>{
 for(const hero of ['memory','seoha','seoha-b'])for(const difficulty of ['gentle','normal','hell']){
  const s=atLast(entered({hero,difficulty,bossOnly:true}));assert.equal(s.hero,hero);defeat(s);
  assert.equal(s.stage,'bossClear');const ready=s.bossClear.readyTick;
  assert.equal(s.results.length,1);assert.equal(s.bossClear.stageCommitted,true);while(s.tick<ready-1){A.step(s,{bomb:true});assert.equal(s.stage,'bossClear');assert.equal(s.results.length,1);}
  A.step(s,{bomb:true});assert.equal(s.stage,'won');assert.equal(s.results.length,1);assert.equal(s.events.filter(e=>e==='win').length,1);
 }
});

test('chairman clear keeps the old actor and stage until the next main-boss introduction',()=>{
 const s=atLast(entered({segment:CHAIRMAN})),stage=s.stageIndex;defeat(s);assert.equal(s.stage,'bossClear');assert.equal(s.bossClear.actor,'p2_chairman');assert.equal(s.bossClear.stageCommitted,false);assert.equal(s.results.length,0);assert(!s.events.includes('stageClear'));assert.equal(A.SEGMENTS[s.bossClear.nextSegment].actor,'p2_core');
 while(s.tick<s.bossClear.readyTick-1)A.step(s,{});A.step(s,{});
 assert.equal(s.stage,'intro');assert.equal(s.stageIndex,stage);assert.equal(A.SEGMENTS[s.seg].actor,'p2_core');assert.equal(s.boss.actor,'p2_chairman');assert.equal(s.results.length,0);
 assert.equal(A.prepareBossEntrance(s),true);assert.equal(s.cinematicEncounter.actor,'p2_core');A.step(s,{});assert.equal(s.boss.actor,'p2_core');
 assert.equal(s.bossEntrance.readyTick-s.bossEntrance.enteredTick,120);
});

test('timeouts and unprepared encounters retain existing immediate progression',()=>{
 const s=atLast(entered());s.segTick=Math.ceil(A.cardDuration(s,A.SEGMENTS[s.seg])*60);s.boss.hp=s.boss.maxHp;const timed=s.timeouts;
 A.step(s,{});assert.notEqual(s.stage,'bossClear');assert.equal(s.timeouts,timed+1);assert.equal(s.bossClear,undefined);
 const final=atLast(entered()).seg,t=make({segment:final});while(t.stage!=='card')A.step(t,{});assert.equal(t.cinematicEncounter,undefined);
 defeat(t);assert.notEqual(t.stage,'bossClear');assert.equal(t.bossClear,undefined);assert.equal(t.results.length,1);
});
