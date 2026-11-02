'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const P=require('../src/boss-patterns-v27.js'),Flow=require('../src/boss-flow-v29.js');
function world(index=0,phase=0,difficulty='normal',revision=31){return {combatRevision:revision,campaign:true,stage:'boss',bossIndex:index,phase,difficulty,seed:813,boss:{id:19},player:{x:180,y:550},tick:72};}
function body(s){const b={...s,id:54,age:0,vx:Math.cos(s.angle)*s.speed,vy:Math.sin(s.angle)*s.speed,halfLength:s.kind==='blade'?13:s.kind==='needle'?9:0};P.initialize(b,s);return b;}
function trace(s){
  const b=body(s);let bounced=0,turned=0;
  for(let tick=0;tick<900&&b.y<540;tick++){
    const before=b.angle;P.advance(b,1/30,360);b.age+=1/30;b.v27Age=b.age;
    assert(b.vy>0,'a downfield body turned upward');assert(b.x>=0&&b.x<=360&&b.y>=0,'body escaped before reaching lower playfield');
    const cap=b.r+Math.abs(Math.cos(b.angle))*b.halfLength;assert(b.x-cap>=-1e-8&&b.x+cap<=360+1e-8,'damage capsule clipped an arena wall');
    if(b.v27BouncePoint)bounced++;if(Math.abs(b.angle-before)>1e-6)turned++;
  }
  assert(b.y>=540,'body never crossed lower playfield');assert(bounced<=1);
  if(s.v27Reflect)assert.equal(bounced,1,'authored mirror must retain its real wall visit');
  return {bounced,turned};
}

test('all35 profiles/phases/difficulties enter lower playfield from edge and centre casters, with real curves and one mirror bounce',()=>{
  let count=0,bounces=0,curves=0;
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell'])for(const x of [30,48,180,312,330])for(const copy of [false,true]){
    const w=world(index,phase,difficulty),emitter={x,y:126,sourceActorId:'own-copy',modelActorId:index===33?'baek-ion':'own-body'},rows=P.makeVolley(w,emitter,0,{copy});
    assert.deepEqual(rows,P.makeVolley(w,emitter,0,{copy}));assert(rows.length);
    for(const s of rows){
      assert(s.v35Downfield&&s.v27Motion);assert.equal(s.sourceActorId,emitter.sourceActorId);assert.equal(s.modelActorId,emitter.modelActorId);assert.equal(s.ownerId,19);
      assert(s.x>=s.v35Margin-1e-8&&s.x<=360-s.v35Margin+1e-8,'full capsule must start inside arena');
      const out=trace(s);count++;bounces+=out.bounced;if(s.v27TurnRate&&out.turned)curves++;
    }
  }
  assert(count>18000);assert(bounces>3000);assert(curves>2000,'curves must retain visible bending');
});

test('edge source formations are fitted together instead of piling different authored origins on the clamp',()=>{
  const w=world(9,1,'hell'),rows=P.makeVolley(w,{x:30,y:126},0,{}),legacy=P.makeVolley({...w,combatRevision:30},{x:30,y:126},0,{});
  assert.equal(rows.length,legacy.length);assert.equal(new Set(rows.map(s=>s.x)).size,rows.length);
  assert(new Set(legacy.map(s=>s.x)).size<legacy.length,'fixture must exercise previous source pile');
  for(let i=0;i<rows.length;i++)for(const key of ['speed','r','kind','v27SplitAt','v27TurnRate','sourcePhase'])assert.equal(rows[i][key],legacy[i][key],key+' unexpectedly changed');
});

test('full rings become ordered distinct downward lanes, preparation is idempotent and waves gain bounded straight motion',()=>{
  const w={combatRevision:31,stage:'waves'},rows=Array.from({length:48},(_,i)=>({x:180,y:100,angle:i*Math.PI*2/48,speed:130,r:3,kind:'needle',ownerId:7,token:i}));
  rows._hellPrepared=true;rows._v29Promise=true;
  assert.equal(P.prepareDownfield(w,rows),rows);assert(rows.every(s=>s.v27Motion==='straight'));
  assert.equal(new Set(rows.map(s=>s.v35TargetX.toFixed(6))).size,rows.length,'folding a ring must not stack opposite bullets');
  const angular=rows.slice().sort((a,b)=>a.v35TargetX-b.v35TargetX);
  assert(angular.every((s,i)=>i===0||s.angle<angular[i-1].angle),'landing order must retain a monotonic fan');
  const once=JSON.stringify(rows);P.prepareDownfield(w,rows);assert.equal(JSON.stringify(rows),once);assert(rows._hellPrepared&&rows._v29Promise);
  for(const s of rows){assert.equal(s.ownerId,7);assert.equal(s.speed,130);assert.equal(s.r,3);trace(s);}
  const weapon={x:180,y:120,angle:0,speed:130,r:11,kind:'boss-weapon',weaponMotion:true};const original=JSON.stringify(weapon);P.prepareDownfield(w,[weapon]);assert.equal(JSON.stringify(weapon),original);
  const configured=[{x:180,y:100,angle:-Math.PI/2,speed:130,r:3,kind:'needle',ownerId:19,v27Motion:'straight',_v27Prepared:true}];
  P.decorate(world(),configured);assert(configured[0].v35Downfield&&Math.sin(configured[0].angle)>0);
});

test('safe warning-time aimed streams retain their exact bait heading and source, upper targets receive a committed downward fan',()=>{
  for(const pilot of [{x:180,y:550},{x:48,y:550},{x:312,y:550}]){
    const w=world();w.player=pilot;const plan=Flow.makeStream(w,{x:180,y:126,sourceActorId:'boss'},0,{});
    for(const pulse of plan.pulses){const original=pulse.specs.map(s=>s.angle);P.prepareDownfield(w,pulse.specs);pulse.specs.forEach((s,i)=>{assert.equal(s.angle,original[i]);assert.equal(s.x,180);assert.equal(s.y,126);assert.equal(s.v29TargetX,pilot.x);assert.equal(s.v29TargetY,pilot.y);trace(s);});}
  }
  const w=world();w.player={x:30,y:70};const plan=Flow.makeStream(w,{x:180,y:126},0,{});
  for(const pulse of plan.pulses){P.prepareDownfield(w,pulse.specs);for(const s of pulse.specs){assert.equal(s.v29TargetX,30);assert.equal(s.v29TargetY,70);trace(s);}}
});

test('near-wall split daughters keep their visible parent and use distinct lower-field lanes without recursion',()=>{
  for(const x of [22,338]){
    const w=world(7,0,'hell'),s=P.makeVolley(w,{x:180,y:126,sourceActorId:'own-copy'},0,{})[0],parent=body(s);parent.x=x;parent.y=220;parent.v27Age=parent.v27SplitAt+.01;
    const before=JSON.stringify(parent),children=P.splitChildren(w,parent);assert.equal(JSON.stringify(parent),before);assert.equal(children.length,3);
    assert.equal(new Set(children.map(c=>c.v35TargetX)).size,3);
    for(const c of children){assert(c.v27Child&&c.v27SplitDone);assert.equal(c.v27ParentId,parent.id);assert.equal(c.sourceActorId,'own-copy');trace(c);assert.equal(P.splitChildren(w,body(c)),null);}
  }
});

test('revision30 and earlier authored volleys remain byte-exact against the released module',()=>{
  const box={};vm.runInNewContext(cp.execFileSync('git',['show','509d1beb3a2bb6f4e75d880383fde28901ad5cdd:src/boss-patterns-v27.js'],{encoding:'utf8'}),box);const Old=box.HapilBossPatternsV27;
  for(const revision of [27,28,29,30])for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell']){
    const w=world(index,phase,difficulty,revision),emitter={x:30,y:126};
    assert.equal(JSON.stringify(P.makeVolley(w,emitter,2,{})),JSON.stringify(Old.makeVolley(w,emitter,2,{})));
    const generic=[{x:30,y:126,angle:-1,speed:130,r:3,kind:'needle',ownerId:19}],before=JSON.stringify(generic);assert.equal(P.prepareDownfield(w,generic),generic);assert.equal(JSON.stringify(generic),before);
  }
});
