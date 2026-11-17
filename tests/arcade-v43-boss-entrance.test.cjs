'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();
const MAIN=A.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid),MID=A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.mid);
function make(options={}){return A.createRun(Object.assign({difficulty:'hell',segment:MAIN,pacing:true,seed:41},options));}
function resources(s){return {hp:s.player.hp,invulnerable:s.player.invulnerableUntil,bombs:s.bombs,gauge:s.gauge,power:s.power,exp:s.exp,fills:s.fills,bombLevel:s.bombLevel,bombsUsed:s.bombsUsed,autoBombs:s.autoBombs,score:s.score,kills:s.kills,hits:s.hits,hearts:s.hearts,graze:s.graze,items:s.itemCount,itemsTaken:s.itemsTaken,broken:s.orbsBroken,fragments:s.orbFragments,lastWipe:s.lastWipe,rng:s.rng,drng:s.drng};}
function seedHazards(s){
 h.put(s,s.player.x,s.player.y,{bage:100,bsize:5,bcolor:A.PROPS.findIndex(p=>p.key==='p3_core'),bmode:A.MODE_SPLIT,bat:101});
 s.bbreakable[0]=1;s.bhp[0]=1;s.sn=1;s.sx[0]=s.player.x;s.sy[0]=s.player.y+15;
 s.mobs.push({hp:1,age:100,first:0,next:0,fire:'aim',every:1,x:180,y:200});
 s.lasers.push({x:0,y:s.player.y,angle:0,width:200,warn:0,active:100,age:50});
 s.figures.push({kind:'runes',age:50,warn:0,active:100});s.ripples.push({x:s.player.x,age:A.HAND_WARN-1});
 s.risers=[{kind:'sun',x:s.player.x,y:s.player.y,size:100,age:A.RISER_WARN,fade:0}];
 s.riserDue=2;s.riserT=119;s.riserN=8;s.riserStage=s.stageIndex;s.risen=7;
 s.floor.grid.fill(1);s.floor.hill.fill(80);s.floor.goal.fill(100);s.floor.pieces.push({cells:[[0,0]],col:0,y:500});
 s.floor.warns.push({x:180,age:44});s.floor.bursts=[{age:0}];s.floor.kind='blocks';s.floor.t=90;s.floor.clearing=1;s.floor.broken=4;
 s.cancelled.push(1,2,0);s.drifted.push(1,2,0,0,1);s.pops.push(1,2,0);s.zaps.push(1,2,3,4,1);
 s.bombPulse={left:7,next:0,lv:7};s.pulseInfo={index:0,targets:[180,156]};s.lastBomb={tick:0};
 s.events.push('bomb','bombPulse','zap','figure','laserWarn','orbBreak','map','stageClear','extend');
 A.dropItem(s,30,100,1);s.gauge=100;
}
function assertEmpty(s){
 assert.equal(s.n,0);assert.equal(s.sn,0);
 for(const k of ['mobs','lasers','figures','ripples','risers','cancelled','drifted','pops','zaps'])assert.equal(s[k].length,0,k);
 assert.equal(s.bombPulse,null);assert.equal(s.pulseInfo,null);assert.equal(s.lastBomb,null);assert.equal(s.riserDue,0);
 for(const k of ['grid','hill','goal'])assert(s.floor[k].every(v=>v===0),k);
 for(const k of ['pieces','warns','bursts'])assert.equal(s.floor[k].length,0,k);
 assert.equal(s.floor.kind,'');assert.equal(s.floor.clearing,0);
}

test('main boss preparation clears every attack layer without rewards, fragments, resource use or boss relocation',()=>{
 const s=make();seedHazards(s);const before=resources(s),boss=structuredClone(s.boss),tick=s.tick;
 assert.equal(A.prepareBossEntrance(s),true);assertEmpty(s);assert.deepEqual(resources(s),before);assert.deepEqual(s.boss,boss);assert.equal(s.tick,tick);
 assert.equal(s.floor.broken,4);assert.equal(s.risen,7);assert.deepEqual(s.events,['map','stageClear','extend']);
 assert.deepEqual(s.bossEntrance,{segment:MAIN,enteredTick:null,readyTick:null,releasedTick:null});
 assert.equal(A.prepareBossEntrance(s),false,'repeated render-frame preparation is idempotent');assert.deepEqual(resources(s),before);
});

test('main entrance locks both attacks, damage and skills for 120 ticks from actual entry across heroes and difficulties',()=>{
 for(const difficulty of ['gentle','normal','hell'])for(const hero of ['memory','seoha','seoha-b'])for(const pacing of [false,true]){
  const s=make({difficulty,hero,pacing});assert.equal(s.hero,hero,'the selected profile is actually used');seedHazards(s);const before=resources(s);A.prepareBossEntrance(s);
  A.step(s,{bomb:true});const e=s.bossEntrance;assert.equal(e.enteredTick,1);assert.equal(e.readyTick,e.enteredTick+120);
  assert.equal(s.boss.x,180);assert.equal(s.boss.y,-60);assert.equal(s.boss.targetY,156,'original entrance destination');
  while(s.tick<e.readyTick-1){A.step(s,{dx:.25,focus:true,bomb:true});assert.equal(s.stage,'intro');assertEmpty(s);assert.deepEqual(resources(s),before);assert.equal(s.segTick,0);assert.equal(s.floor.t,0);assert.equal(s.riserT,0);}
  assert(s.player.x>180,'player movement still works');assert(s.boss.y>155,'boss moves fully into its original resting area');
  A.step(s,{});assert.equal(s.tick,e.readyTick);assert.equal(e.releasedTick,e.readyTick);assert.equal(s.stage,'card');assert.equal(s.segTick,1);
  assert.equal(s.bombsUsed,0);assert.equal(s.bombPulse,null);assert.equal(s.hits,0);assert.equal(s.orbFragments,0);
 }
});

test('outgoing midboss exits normally and never consumes the new main boss grace clock',()=>{
 const s=make(),mid=A.SEGMENTS[MID];Object.assign(s.boss,{present:true,leaving:true,actor:mid.actor,mid:true,x:155,y:156,targetX:155,targetY:156});
 const b=structuredClone(s.boss);A.prepareBossEntrance(s);assert.deepEqual(s.boss,b);
 while(s.boss.actor===mid.actor){A.step(s,{bomb:true});if(s.boss.actor===mid.actor){assert.equal(s.bossEntrance.enteredTick,null);assert.equal(s.bossEntrance.readyTick,null);}}
 const e=s.bossEntrance;assert(e.enteredTick>1);assert.equal(e.readyTick-e.enteredTick,120);assert.equal(s.boss.x,180);assert.equal(s.boss.y,-60);
 while(s.tick<e.readyTick-1)A.step(s,{});assert.equal(s.stage,'intro');A.step(s,{});assert.equal(s.stage,'card');assert.equal(s.tick-e.enteredTick,120);
});

test('first prepared card fires at release while subsequent cards retain their 40 tick warning',()=>{
 const first=A.SEGMENTS[MAIN],second=A.SEGMENTS[MAIN+1],f=first.fire,g=second.fire,calls=[];
 first.fire=function(s,t){calls.push({seg:s.seg,tick:s.tick,t});return f(s,t);};second.fire=function(s,t){calls.push({seg:s.seg,tick:s.tick,t});return g(s,t);};
 try{
  const s=make();A.prepareBossEntrance(s);while(s.stage!=='card')A.step(s,{});
  assert.deepEqual(calls[0],{seg:MAIN,tick:s.bossEntrance.readyTick,t:0});
  for(let i=0;i<5&&!s.sn;i++)A.step(s,{});assert(s.sn>0,'player fire is also enabled immediately after the shared grace');
  s.boss.hp=0;A.step(s,{});assert.equal(s.seg,MAIN+1);assert.equal(s.stage,'break');
  while(s.stage!=='card')A.step(s,{});const start=s.tick;
  for(let i=0;i<40;i++){A.step(s,{});assert.equal(calls.filter(c=>c.seg===MAIN+1).length,0);}
  A.step(s,{});assert.deepEqual(calls.find(c=>c.seg===MAIN+1),{seg:MAIN+1,tick:start+41,t:0});
 }finally{first.fire=f;second.fire=g;}
});

test('preparation is opt-in and midboss/non-intro calls leave the existing simulation unchanged',()=>{
 for(const segment of [MID,0]){
  const s=make({segment}),t=make({segment});assert.equal(A.prepareBossEntrance(s),false);assert.deepEqual(s,t);
  for(let i=0;i<180;i++){A.step(s,{});A.step(t,{});}assert.deepEqual(s,t);
 }
 const s=make(),t=make();for(let i=0;i<20;i++){A.step(s,{});A.step(t,{});}assert.equal(s.stage,'intro');
 assert.equal(A.prepareBossEntrance(s),true);assert.equal(s.bossEntrance.enteredTick,1,'late opt-in remembers actual entry');assert.equal(s.bossEntrance.readyTick,121);
 assert.equal(t.bossEntrance,undefined,'unprepared authored simulation remains opt-in');
});

test('release discards any queued attacks left during the lock rather than replaying them',()=>{
 const s=make();A.prepareBossEntrance(s);A.step(s,{});const e=s.bossEntrance;
 while(s.tick<e.readyTick-1)A.step(s,{});
 seedHazards(s);const before=resources(s);A.step(s,{});
 assert.equal(s.bombPulse,null);assert.equal(s.pulseInfo,null);assert.equal(s.mobs.length,0);assert.equal(s.orbFragments,before.fragments);assert.equal(s.orbsBroken,before.broken);
 assert.equal(s.hits,before.hits);assert.equal(s.player.hp,before.hp);assert.equal(s.bombsUsed,before.bombsUsed);assert.equal(s.floor.pieces.length,0);assert.equal(s.risers.length,0);
 assert(s.n===0||Array.from(s.bage.slice(0,s.n)).every(age=>age===1),'only fresh boss bullets may exist at release');
});
