'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Combat=require('../src/story-combat.js');
function spec(pattern='fan',extra={}){return Object.assign({id:'ordinary-boss',sceneId:'dist00',objectiveSceneId:'dist00',resolution:'cleared',stages:[{id:'ordinary-phase-1',label:'검사 전투',sourceExplicit:[],target:'body',adaptation:{pattern,windupTicks:60,activeTicks:150,recoveryTicks:90,intervalTicks:36,count:8,speed:90,spread:.16}}]},extra);}
function spawn(pattern='fan',options={},extra={}){return Combat.create(spec(pattern,extra),{runId:'test-'+pattern,seed:12345,difficulty:'gentle',...options});}
function dodger(w){
 const p=w.player;let best=Infinity,chosen={x:0,y:0};
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
  let n=Math.hypot(x,y),vx=x*(n>1?3/n:3),vy=y*(n>1?3/n:3),risk=0;
  for(const frames of [8,20,36,54]){
   const px=Math.max(14,Math.min(346,p.x+vx*Math.min(frames,24))),py=Math.max(300,Math.min(620,p.y+vy*Math.min(frames,24)));
   for(const b of w.bullets){
    const bx=b.x+b.vx*frames/60,by=b.y+b.vy*frames/60,l=b.halfLength||0;
    if(Math.abs(bx-px)>80||Math.abs(by-py)>80)continue;
    const d=Math.sqrt(Combat.geometry.segmentDistanceSquared(px,py,bx-Math.cos(b.angle)*l,by-Math.sin(b.angle)*l,bx+Math.cos(b.angle)*l,by+Math.sin(b.angle)*l))-3-b.r;
    risk+=d<3?10000:d<10?100/(d+1):d<22?3/(d+1):0;
   }
  }
  for(const h of w.hazards){
   if(h.activeAt>w.tick+70||h.fadeAt<=w.tick)continue;
   const frames=Math.max(1,Math.min(40,h.activeAt-w.tick)),px=Math.max(14,Math.min(346,p.x+vx*frames)),py=Math.max(300,Math.min(620,p.y+vy*frames));
   const d=Math.sqrt(Combat.geometry.segmentDistanceSquared(px,py,h.x1,h.y1,h.x2,h.y2))-h.width/2-3;risk+=d<8?20000:d<24?300/(d+1):0;
  }
  risk+=Math.abs(p.x+vx*12-w.boss.x)*.008+Math.abs(p.y+vy*12-535)*.006+(Math.abs(x)+Math.abs(y))*.003;
  if(risk<best){best=risk;chosen={x,y};}
 }
 return chosen;
}
function play(w,limit=12000){let input={};for(let i=0;i<limit&&w.status==='active';i++){if(i%3===0)input=dodger(w);Combat.step(w,input);}return w;}

test('supports fails closed for non-body and canonical special objectives rather than claiming the whole campaign',()=>{
 assert(Combat.supports(spec()));assert(Combat.supports(spec('ring',{resolution:'victory'})));
 for(const sceneId of Combat.UNSUPPORTED_OBJECTIVE_SCENES)assert.equal(Combat.supports(spec('fan',{sceneId,objectiveSceneId:sceneId})),false,sceneId);
 for(const resolution of ['liberated','defended','authority-severed','survive-and-fall','investigated','command-severed','narrative'])assert.equal(Combat.supports(spec('fan',{resolution})),false);
 for(const target of ['command-link','core','authority','survival']){const s=spec();s.stages[0].target=target;assert(!Combat.supports(s));assert.throws(()=>Combat.create(s),/Unsupported/);}
 for(const patch of [{count:100},{speed:999},{windupTicks:0},{intervalTicks:0},{pattern:'unverified'}]){const s=spec();Object.assign(s.stages[0].adaptation,patch);assert(!Combat.supports(s));}
});

test('simulation advances one fixed tick per call regardless of supplied frame delta and input is bounded',()=>{
 const a=spawn(),b=spawn();
 for(let i=0;i<240;i++){Combat.step(a,{x:.5,y:0,dt:.001},.001);Combat.step(b,{x:.5,y:0,dt:100},100);}
 assert.deepEqual(a,b);assert.equal(a.tick,240);assert.equal(a.time,4);
 const w=spawn();const before={x:w.player.x,y:w.player.y};Combat.step(w,{dx:10000,dy:10000});assert(Math.hypot(w.player.x-before.x,w.player.y-before.y)<=40+1e-9);
 const k=spawn();Combat.step(k,{x:1,y:1});assert(Math.abs(Math.hypot(k.player.x-180,k.player.y-540)-3)<1e-9);assert.equal(k.player.r,3);const keyboard=spawn();Combat.step(keyboard,{x:1,dx:0,dy:0});assert.equal(keyboard.player.x,183);
});

test('windup, active and recovery have exact tick boundaries and genuine actor action states',()=>{
 const w=spawn();for(let i=0;i<59;i++)Combat.step(w,{skillRotation:false});
 assert.equal(w.cyclePhase,'windup');assert.equal(w.boss.action,'charge');assert.equal(w.bullets.length,0);assert.equal(w.cyclePhaseTick,59);
 Combat.step(w,{skillRotation:false});assert.equal(w.cyclePhase,'active');assert.equal(w.boss.action,'attack');assert(w.bullets.length>0);assert.equal(w.cyclePhaseTick,0);
 for(let i=60;i<210;i++)Combat.step(w,{skillRotation:false});assert.equal(w.cyclePhase,'recovery');assert.equal(w.boss.action,'recover');assert.equal(w.cyclePhaseTick,0);
});

test('all six supported patterns can be cleared with ordinary legal movement, auto shots and actual damage',()=>{
 for(const pattern of Combat.PATTERNS)for(const difficulty of ['normal','gentle']){
  const w=play(spawn(pattern,{difficulty}));assert.equal(w.status,'won',pattern+' '+JSON.stringify(w.stats));const result=Combat.result(w);assert(result,pattern);
  assert.equal(result.resolution,'cleared');assert.deepEqual(result.evidence.stageIds,['ordinary-phase-1']);assert.equal(result.evidence.stageDamage[0],1050);assert(result.evidence.shots>0);assert(result.evidence.playerHp>0);
  assert(w.stats.peakBullets<=160&&w.stats.peakShots<=64&&w.stats.peakEffects<=24);assert(w.tick>=480&&w.tick<2400,pattern+' duration '+w.tick);
 }
});

test('multi-stage progression earns each phase through real HP damage and a safe drain',()=>{
 const s=spec('ring');s.stages.push({...s.stages[0],id:'ordinary-phase-2',label:'두 번째 문양',adaptation:{...s.stages[0].adaptation,pattern:'aimed'}});
 const w=play(Combat.create(s,{runId:'multi',seed:8,difficulty:'gentle'}));assert.equal(w.stage,'won');const e=Combat.result(w).evidence;
 assert.deepEqual(e.stageIds,['ordinary-phase-1','ordinary-phase-2']);assert.deepEqual(e.stageDamage,[1050,1120]);assert.equal(e.damage,2170);assert.equal(w.hazards.length,0);assert.equal(w.bullets.length,0);
});

test('standing in aimed fire causes actual defeat and a retry creates a clean, distinct run',()=>{
 const s=spec('aimed');Object.assign(s.stages[0].adaptation,{count:1,speed:160,intervalTicks:18});
 const old=Combat.create(s,{runId:'first-attempt',seed:1,difficulty:'normal'});for(let i=0;i<3000&&old.status==='active';i++)Combat.step(old,{skillRotation:false});
 assert.equal(old.status,'lost');assert.equal(old.player.hp,0);assert.equal(old.stats.hits,3);assert.equal(Combat.result(old),null);
 const retry=Combat.create(s,{runId:'retry-attempt',seed:1,difficulty:'normal'});assert.equal(retry.tick,0);assert.equal(retry.player.hp,3);assert.equal(retry.shots.length,0);assert.equal(retry.stats.damage,0);assert.notEqual(retry.runId,old.runId);
});

test('forged, copied, premature and altered results cannot self-certify completion',()=>{
 const w=spawn(),active={combatId:w.combatId,runId:w.runId,status:'active'},forged={combatId:w.combatId,runId:w.runId,resolution:'cleared',evidence:{},combatVerified:true};
 assert.equal(Combat.verifyResult(forged,active,w),false);assert.equal(Combat.result({...w,stage:'won',status:'won'}),null);
 play(w);const result=Combat.result(w);assert(result);assert.equal(Combat.verifyResult(result,active,w),true);
 assert.equal(Combat.verifyResult({...result,combatVerified:false},active,w),false);
 assert.equal(Combat.verifyResult({...result,runId:'other'},active,w),false);
 assert.equal(Combat.verifyResult({...result,evidence:{...result.evidence,damage:999999}},active,w),false);
 assert.equal(Combat.verifyResult(result,{...active,status:'defeated'},w),false);
 assert.equal(Combat.verifyResult(result,active,JSON.parse(JSON.stringify(w))),false);
 const proof=Combat.result(w);proof.evidence.stageIds.length=0;assert.equal(Combat.result(w).evidence.stageIds.length,1);
 w.status='active';assert.equal(Combat.result(w),null);
});

test('sweep lasers retain committed geometry; warning and fading residue are harmless',()=>{
 const w=spawn('sweep'),h=w.hazards[0],geometry=[h.x1,h.y1,h.x2,h.y2,h.width],phases=new Set();
 for(let i=0;i<300&&w.status==='active';i++){Combat.step(w,{x:.9,y:0,skillRotation:false});if(w.hazards.includes(h)){phases.add(h.phase);assert.deepEqual([h.x1,h.y1,h.x2,h.y2,h.width],geometry);}}
 assert.deepEqual([...phases],['warning','active','fade']);
 const safe=spawn('sweep');for(let i=0;i<59;i++)Combat.step(safe,{skillRotation:false});assert.equal(safe.player.hp,5,'centered warning cannot hit');
 const crossing=spawn('sweep');for(let i=0;i<230&&crossing.status==='active';i++)Combat.step(crossing,{x:1,skillRotation:false});const hp=crossing.player.hp;
 // Recovery/fade may be crossed without a laser hit; no bullets are emitted by sweep.
 for(let i=0;i<50;i++)Combat.step(crossing,{dx:-8,skillRotation:false});assert.equal(crossing.player.hp,hp);
});


test('real skill casts clear bullets, slow flight, reflect incoming fire and strengthen actual shots',()=>{
 const s=spec('ring');Object.assign(s.stages[0].adaptation,{windupTicks:24,count:24,intervalTicks:36});
 const memory=Combat.create(s,{runId:'memory',seed:8,difficulty:'gentle'});while(memory.bullets.length<18)Combat.step(memory,{skillRotation:false});
 assert(memory.bullets.length>0);Combat.step(memory,{skillRotation:false,skill:'memory'});assert.equal(memory.bullets.length,0);assert.equal(memory.stats.casts.memory,1);
 const delay=spawn('fan');for(let i=0;i<65;i++)Combat.step(delay,{skillRotation:false});const b=delay.bullets[0],base=Math.hypot(b.vx,b.vy);assert(base>0);
 Combat.step(delay,{skillRotation:false,skill:'delay'});assert(Math.abs(Math.hypot(b.vx,b.vy)-base*.36)<1e-8);const expiry=delay.player.delayUntil;
 while(delay.tick<expiry&&delay.status==='active')Combat.step(delay,{...dodger(delay),skillRotation:false});
 assert.equal(delay.status,'active');assert(Math.abs(Math.hypot(b.vx,b.vy)-base)<1e-8,'delayed speed restores at its exact expiry');
 const parrySpec=spec('aimed');Object.assign(parrySpec.stages[0].adaptation,{count:1,speed:100,intervalTicks:120});
 const parry=Combat.create(parrySpec,{runId:'parry',seed:8,difficulty:'gentle'});
 let requested=false;for(let i=0;i<500&&parry.status==='active'&&!parry.stats.reflected;i++){
  const incoming=parry.bullets.some(v=>Math.hypot(v.x-parry.player.x,v.y-parry.player.y)<36);
  Combat.step(parry,{skillRotation:false,skill:incoming&&!requested?'parry':undefined});if(incoming)requested=true;
 }
 assert(parry.stats.reflected>0,'the window reflects an actual incoming bullet');assert(parry.shots.some(v=>v.reflected));assert.equal(parry.player.hp,5);
 const ego=spawn('fan',{runId:'ego'}),control=spawn('fan',{runId:'ego-control'});
 while(ego.memory<45){Combat.step(ego,{skillRotation:false});Combat.step(control,{skillRotation:false});}
 const hp=ego.boss.hp;Combat.step(ego,{skillRotation:false,skill:'ego'});Combat.step(control,{skillRotation:false});assert(ego.boss.hp<=hp-64);assert.equal(ego.stats.casts.ego,1);
 for(let i=0;i<60;i++){Combat.step(ego,{skillRotation:false});Combat.step(control,{skillRotation:false});}
 assert(ego.stats.shots>control.stats.shots,'ego changes real shot cadence');assert(ego.stats.damage>control.stats.damage,'ego damage is recorded from real hits/burst');
});

test('maximum supported speeds preserve swept collision and all entity caps under dense emission',()=>{
 const s=spec('spiral');Object.assign(s.stages[0].adaptation,{count:36,speed:228,intervalTicks:12,windupTicks:24,activeTicks:240,recoveryTicks:30});assert(Combat.supports(s));
 const w=Combat.create(s,{runId:'dense',seed:3,difficulty:'gentle'});
 for(let i=0;i<1600&&w.status==='active';i++){Combat.step(w,{...dodger(w),skillRotation:false});assert(w.bullets.length<=160&&w.shots.length<=64&&w.effects.length<=24&&w.hazards.length<=3);}
 assert(w.stats.shots>0&&w.stats.damage>0);assert(w.stats.peakBullets>0);
 const bullet={px:170,py:500,x:173.8,y:500,angle:Math.PI/2,halfLength:7};assert(Combat.geometry.bulletDistanceSquared(bullet,190,500,150,500)<=6*6,'a drag that crosses the moving needle is detected');
});


test('seeded motion is repeatable while different seeds produce different committed trajectories',()=>{const a=spawn('spiral',{seed:54}),b=spawn('spiral',{seed:54}),c=spawn('spiral',{seed:89});for(let i=0;i<150;i++){Combat.step(a,{skillRotation:false});Combat.step(b,{skillRotation:false});Combat.step(c,{skillRotation:false});}assert.deepEqual(a,b);assert.notDeepEqual(a.bullets.map(v=>[v.x,v.y]),c.bullets.map(v=>[v.x,v.y]));});


function rootSpec(){const s=spec('sweep',{id:'dist00-boss',sceneId:'dist00',objectiveSceneId:'dist00'});s.stages[0].id='dist00-root-command';s.stages[0].label='붙잡은 뿌리의 연결';s.stages[0].target='command-link';return s;}
test('the first garden fight supports only cutting its command link while the captive body stays protected',()=>{
 const s=rootSpec();assert(Combat.supports(s));const body=structuredClone(s);body.stages[0].target='body';assert.equal(Combat.supports(body),false);
 const wrong=structuredClone(s);wrong.id='other-boss';assert.equal(Combat.supports(wrong),false);
 const w=Combat.create(s,{runId:'root-targeting',seed:1,difficulty:'gentle'});assert.equal(w.boss.bodyProtected,true);assert.equal(w.commandLink.r,14);
 const b=w.boss,link=w.commandLink,nearBody={px:b.x,py:b.y,x:b.x, y:b.y,r:2.2};
 assert(Combat.geometry.targetDistanceSquared(w,nearBody)>(nearBody.r+link.r)**2,'a shot near only the captive body cannot damage the link');
 const nearLink={px:link.x,py:link.y,x:link.x,y:link.y,r:2.2};assert.equal(Combat.geometry.targetDistanceSquared(w,nearLink),0);
 Combat.step(w,{skillRotation:false});assert.equal(w.stats.bodyDamage,0);assert.equal(w.stats.commandLinkDamage,0,'distant shots do not instant-hit the body');
 const unowned={id:999,x:link.x,y:link.y,px:link.x,py:link.y,r:30,vx:0,vy:0,ageTicks:0};w.shots.push(unowned);Combat.step(w,{skillRotation:false});assert.equal(w.stats.commandLinkDamage,0,'injected self-certified hits are not real engine shots');
});
test('legal auto-aimed fire really cuts the root link and issues protected-body proof only after completion',()=>{
 const w=Combat.create(rootSpec(),{runId:'root-natural',seed:12345,difficulty:'normal'}),active={combatId:w.combatId,runId:w.runId,status:'active'};
 assert.equal(Combat.result(w),null);play(w);assert.equal(w.status,'won');const receipt=Combat.result(w);assert(receipt);assert.equal(receipt.evidence.commandLinkCut,true);assert.equal(receipt.evidence.protectedBodyUntouched,true);assert.equal(receipt.evidence.bodyDamage,0);assert.equal(receipt.evidence.commandLinkDamage,1050);assert.equal(w.commandLink.hp,0);assert.equal(w.boss.bodyProtected,true);assert(Combat.verifyResult(receipt,active,w));
 w.commandLink.hp=10;assert.equal(Combat.result(w),null,'terminal proof compares the actual target state too');
});
