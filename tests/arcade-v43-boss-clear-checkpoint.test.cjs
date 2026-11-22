'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),H=require('../src/arcade-heroes-v43.js');
const source=fs.readFileSync(path.join(__dirname,'../src/arcade-mobile-v43.js'),'utf8'),KEY='hapil-arcade-checkpoint-v43';
function mobile(saved={}){
 const storage={...saved},writes=[],w={HapilArcade:A,HapilArcadeHeroes:H,localStorage:{getItem:k=>storage[k]||null,setItem(k,v){storage[k]=String(v);writes.push({key:k,value:String(v)});},removeItem:k=>delete storage[k]},addEventListener(){}};
 w.window=w;vm.runInNewContext(source,w);return {M:w.HapilMobile,storage,writes};
}
function lastCard(actor){return A.SEGMENTS.map((g,i)=>({g,i})).filter(x=>x.g.actor===actor&&x.g.kind==='card').at(-1).i;}
function encounter(actor,hero='memory',bossOnly=false){
 const s=A.createRun({segment:lastCard(actor),difficulty:'hell',hero,pacing:true,bossOnly});
 assert(A.prepareBossEntrance(s));for(let i=0;i<200&&s.stage!=='card';i++)A.step(s,{});assert.equal(s.stage,'card');
 s.events.length=0;return s;
}
function defeat(s){s.boss.hp=0;A.step(s,{});assert.equal(s.stage,'bossClear');}

test('completed-stage clear removes its old checkpoint immediately and cannot recreate it during the hold',()=>{
 for(const hero of ['memory','seoha','seoha-b']){
  const h=mobile(),s=encounter('p1_tree',hero);h.M.tick(s,'playing',16);assert.equal(h.M.checkpoint(0,'hell').seg,s.seg);
  defeat(s);assert.equal(s.bossClear.stageCommitted,true);assert.equal(s.results.length,1);
  // The app commits this in the bossClear event before the next frame can pause or unload.
  assert.equal(h.M.commitBossClear(s),true);assert.equal(h.storage[KEY],undefined);
  const progress=A.Progress.record(A.Progress.fresh(),s.results[0],s.difficulty),nextStage=A.Progress.resume(progress);
  assert.equal(nextStage,1);const refreshed=mobile(h.storage);assert.equal(refreshed.M.checkpoint(nextStage,'hell'),null);
  const next=A.createRun({stage:nextStage,hero});assert.equal(next.stageIndex,1);
  for(let i=0;i<100&&!next.started;i++)A.step(next,{});
  assert.equal(next.seg,A.STAGES[1].first);assert.equal(next.stage,'wave');assert.equal(next.results.length,0);
  while(s.tick<s.bossClear.readyTick-1){A.step(s,{});h.M.tick(s,'playing',16);assert.equal(h.storage[KEY],undefined);}
  assert.equal(s.results.length,1);A.step(s,{});h.M.tick(s,'playing',16);assert.equal(s.stageIndex,1);assert.equal(s.results.length,1);
  assert.equal(h.M.checkpoint(0,'hell'),null,'the completed stage is no longer resumable');
 }
});

test('chairman defeat checkpoints the next core entrance for all heroes, retaining growth and stage penalties',()=>{
 for(const hero of ['memory','seoha','seoha-b']){
  const h=mobile(),s=encounter('p2_chairman',hero);s.exp=500;s.fills=13;s.hits=2;s.bombsUsed=1;
  h.M.tick(s,'playing',16);assert.equal(h.M.checkpoint(19,'hell').seg,s.seg);defeat(s);
  assert.equal(s.bossClear.stageCommitted,false);assert.equal(s.results.length,0);assert.equal(A.SEGMENTS[s.bossClear.nextSegment].actor,'p2_core');
  h.M.commitBossClear(s);const cp=h.M.checkpoint(19,'hell'),writeCount=h.writes.filter(w=>w.key===KEY).length;
  assert.equal(cp.seg,s.bossClear.nextSegment);assert.equal(cp.hero,hero);assert.equal(cp.exp,s.exp);assert.equal(cp.fills,s.fills);assert.equal(cp.hits,2);assert.equal(cp.bombs,1);
  for(let i=0;i<30;i++){A.step(s,{bomb:true});h.M.tick(s,'playing',16);h.M.commitBossClear(s);}
  assert.equal(h.writes.filter(w=>w.key===KEY).length,writeCount,'one defeat writes one checkpoint');assert.equal(s.bombsUsed,1,'manual bomb input stays blocked in the hold');
  const refreshed=mobile(h.storage),restored=refreshed.M.checkpoint(19,'hell');assert.equal(restored.seg,cp.seg);
  const next=A.createRun({segment:restored.seg,hero:restored.hero,difficulty:'hell',pacing:true,grown:{exp:restored.exp,fills:restored.fills}});
  next.hits+=restored.hits;next.bombsUsed+=restored.bombs;
  assert.equal(next.stage,'intro');assert.equal(A.SEGMENTS[next.seg].actor,'p2_core');assert.equal(next.hero,hero);assert.equal(next.exp,cp.exp);assert.equal(next.fills,cp.fills);assert.equal(next.cleared,0);assert.equal(next.score,0,'resume does not grant the chairman reward again');
  assert.equal(A.prepareBossEntrance(next),true);A.step(next,{});assert.equal(next.boss.actor,'p2_core');assert.equal(next.autoBombs,0);assert.equal(next.distorts,0);
 }
});

test('boss defeat keeps earned ultimate growth at the start of the next stage, including during the victory hold',()=>{
 const h=mobile(),s=encounter('p1_tree','seoha-b');
 s.fills=A.BOMB_FILLS[4];s.bombLevel=5;
 h.M.tick(s,'playing',16);defeat(s);h.M.commitBossClear(s);
 function verify(){
  const cp=mobile(h.storage).M.checkpoint(1,'hell');
  assert.equal(cp.seg,A.STAGES[1].first);
  assert.equal(cp.hero,'seoha-b');
  assert.equal(cp.fills,A.BOMB_FILLS[4]);
  assert.equal(A.createRun({stage:1,grown:cp}).bombLevel,5);
 }
 verify();
 while(s.stage==='bossClear'){A.step(s,{});h.M.tick(s,'playing',16);verify();}
});

test('the frame fallback commits a clear even if no earlier mobile frame ran and boss practice preserves the journey checkpoint',()=>{
 const old={v:1,stage:3,seg:A.STAGES[3].first+1,hero:'seoha-b',difficulty:'normal',at:Date.now(),exp:123,fills:4,hits:0,bombs:0};
 const h=mobile({[KEY]:JSON.stringify(old)}),s=encounter('p1_tree');defeat(s);h.M.tick(s,'playing',16);assert.equal(h.storage[KEY],undefined);
 const practice=mobile({[KEY]:JSON.stringify(old)}),b=encounter('p1_tree','memory',true);defeat(b);practice.M.commitBossClear(b);practice.M.tick(b,'playing',16);
 assert.deepEqual(JSON.parse(practice.storage[KEY]),old);assert.equal(practice.M.checkpoint(3,'normal').hero,'seoha-b');
});
