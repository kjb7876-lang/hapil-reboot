'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const P=require('../src/boss-patterns-v27.js'),F=require('../src/boss-flow-v29.js');
function world(index=0,phase=0,difficulty='normal'){
  return {combatRevision:29,campaign:true,stage:'boss',bossIndex:index,phase,difficulty,seed:4242,tick:73,phaseTime:73/60,boss:{id:19},player:{x:180,y:550}};
}
const source={x:180,y:126};
function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}

test('29 rhythm replaces extra slots with five bounded decisions and leaves late-cycle firing space',()=>{
  assert(Object.isFrozen(F)&&Object.isFrozen(F.events)&&F.events.every(Object.isFrozen));assert.equal(F.cycleTicks,600);
  assert.deepEqual(F.events.map(e=>e.at),[72,168,228,342,420]);assert.deepEqual(F.pulseOffsets,[54,66,78]);
  for(const difficulty of ['gentle','normal','hell'])for(let phase=0;phase<3;phase++){
    const w=world(0,phase,difficulty),actual=[];for(let within=0;within<600;within++){const action=F.actionAt(w,within,2);if(action){actual.push(action);assert(Object.isFrozen(action));assert(action.at<=420);assert.equal(action.cycle,2);}}
    assert.equal(actual[0].kind,'stream');assert.equal(actual[0].source,'main');assert.equal(actual[1].kind,'fixed');assert.equal(actual[1].source,'copy');assert.equal(actual[2].kind,'laser');assert.equal(actual[3].source,'main');
    assert.equal(actual.length,difficulty==='hell'||difficulty==='normal'&&phase===2?5:4);
    if(actual.length===5)assert.notEqual(actual[1].copySlot,actual[4].copySlot);
    assert.equal(F.actionAt(w,421,2),null);assert.equal(F.actionAt(w,599,2),null);
  }
});

test('35 owned stream profiles retain separate final practice and do not replace any fixed-pattern source contracts',()=>{
  assert.equal(F.profiles.length,35);assert(Object.isFrozen(F.profiles));assert(F.profiles.every(Object.isFrozen));
  assert.equal(new Set(F.profiles.map(p=>p.id)).size,35);
  for(const profile of F.profiles){assert.equal(profile.id,P.profiles[profile.index].id);assert.equal(profile.role,P.profiles[profile.index].role);assert.equal(profile.kind,P.profiles[profile.index].kind);}
  assert.equal(F.profileFor({...world(11),finalPractice:true}).index,34);
  const box={HapilBossPatternsV27:P};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/boss-flow-v29.js'),'utf8'),box);assert.equal(box.HapilBossFlowV29.revision,29);
});

test('paired main and laser slots alternate actual emitters across cycles instead of starving one owner',()=>{
  const w=world(33,2,'hell');
  for(const tick of [72,228,342]){
    const first=F.actionAt(w,tick,0),second=F.actionAt(w,tick,1),third=F.actionAt(w,tick,2);
    assert.notEqual(first.beat%2,second.beat%2);assert.equal(first.beat%2,third.beat%2);assert(first.beat<second.beat&&second.beat<third.beat);
  }
});

test('all 315 boss/phase/difficulty streams commit three exact bait-point pulses within the existing total pellet budget',()=>{
  let checks=0;
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell']){
    const w=world(index,phase,difficulty),emitter={...source,sourceActorId:'own-source',modelActorId:index===33?'han-rian':'own-model'},before=JSON.stringify([w,emitter]);
    const plan=F.makeStream(w,emitter,2),perPulse=difficulty==='hell'?4:difficulty==='gentle'?2:3;
    assert.equal(plan.totalPellets,perPulse*3);assert.equal(plan.warningTicks,54);assert(Object.isFrozen(plan.targetSnapshot));assert.equal(plan.pulses.length,3);
    assert.equal(JSON.stringify([w,emitter]),before);assert.deepEqual(plan,F.makeStream(w,emitter,2));
    for(let pulse=0;pulse<3;pulse++){
      const group=plan.pulses[pulse];assert.equal(group.offset,[54,66,78][pulse]);assert.equal(group.specs.length,perPulse);assert(group.specs._hellPrepared);
      assert.equal(group.targetX,w.player.x);assert.equal(group.targetY,w.player.y);
      for(const s of group.specs){
        assert([s.x,s.y,s.angle,s.speed,s.r,s.ttl].every(Number.isFinite));assert(s.r>=2.7&&s.r<=3.55);assert(s.speed>=110&&s.speed<=245);assert.equal(s.x,emitter.x);assert.equal(s.y,emitter.y);
        assert.equal(s.v27Motion,'straight');assert.equal(s.v29Role,'aimed-stream');assert.equal(s.v29PulseIndex,pulse);assert.equal(s.v29PulseCount,3);assert.equal(s.sourcePhase,phase);assert.equal(s.ownerId,19);
        assert.equal(s.sourceActorId,emitter.sourceActorId);assert.equal(s.modelActorId,emitter.modelActorId);assert.equal(s.v29TargetX,w.player.x);assert.equal(s.v29TargetY,w.player.y);assert.equal(s.v29AimSampleTick,w.tick);
        assert.equal(s.v29MovementX,0);assert.equal(s.v29MovementY,0);assert(s._v27Prepared&&s._rhythmPrepared&&s._hellPrepared);
        for(const key of ['v27TurnRate','v27Reflect','v27SplitAt','acceleration','curveRate','pauseUntil'])assert.equal(s[key],undefined,'stream cannot acquire a hidden later steering/branching rule');
      }
      const direct=Math.atan2(w.player.y-emitter.y,w.player.x-emitter.x);assert(Math.abs(angleDifference(group.specs[0].angle,direct))<1e-12,'even-count streams need a real centre-aimed pellet, not a safe central hole');
    }
    checks++;
  }
  assert.equal(checks,315);
});

test('a stationary bait point can be sidestepped: all 105 new stream programs react to position only when committed',()=>{
  let responsive=0;
  for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++){
    const w=world(index,phase),emitter={...source},left={...w,player:{x:40,y:550}},right={...w,player:{x:320,y:550}};
    const a=F.makeStream(left,emitter,0),b=F.makeStream(right,emitter,0),locked=JSON.stringify(a);
    assert.notEqual(a.pulses[0].specs[0].angle,b.pulses[0].specs[0].angle);responsive++;
    left.player.x=344;left.player.y=270;emitter.x=52;emitter.y=166;
    assert.equal(JSON.stringify(a),locked,'future player movement and moving casters cannot retarget any of the three committed pulses');
    assert(a.pulses.every(g=>g.targetX===40&&g.targetY===550));
  }
  assert.equal(responsive,105);
});

test('no predictive motion option changes the actual public bait point, and paired casters retain their own material role',()=>{
  const w=world(33,2,'hell'),rian={x:96,y:126,sourceActorId:'copy-rian',modelActorId:'han-rian'},ion={x:264,y:126,sourceActorId:'copy-ion',modelActorId:'baek-ion'};
  const a=F.makeStream(w,rian,0,{motionX:4,motionY:-2}),b=F.makeStream(w,ion,0,{motionX:-4,motionY:2});
  assert(a.pulses.every(p=>p.specs.every(s=>s.identityRole==='circuit-cross'&&s.kind==='needle'&&s.sourceActorId==='copy-rian'&&s.modelActorId==='han-rian')));
  assert(b.pulses.every(p=>p.specs.every(s=>s.identityRole==='circuit-shield'&&s.kind==='blade'&&s.sourceActorId==='copy-ion'&&s.modelActorId==='baek-ion')));
  for(const plan of [a,b])assert.deepEqual(plan.targetSnapshot,{x:180,y:550,motionX:0,motionY:0,sampleTick:73});
  for(const phase of [0,1,2]){
    const lust=F.makeStream(world(8,phase),source,0);assert(lust.pulses.every(p=>p.specs.every(s=>s.patternId===(phase===1?'asmodeus-heart-chord':'asmodeus-phase-1'))));
    const final=F.makeStream(world(34,phase),source,0);assert(final.pulses.every(p=>p.specs.every(s=>s.identityRole===['authority-fold','authority-stitch','authority-impact'][phase])));
  }
});

test('all legacy selectors and invalid calls stay inert rather than silently adopting the new rhythm',()=>{
  for(const revision of [undefined,21,25,27,28]){
    const w=world();if(revision===undefined)delete w.combatRevision;else w.combatRevision=revision;
    assert.equal(F.enabled(w),false);assert.equal(F.actionAt(w,72,0),null);assert.equal(F.makeStream(w,source,0),null);
  }
  for(const patch of [{stage:'waves'},{campaign:false},{bossIndex:-1},{player:{x:NaN,y:550}}])assert.equal(F.makeStream({...world(),...patch},source,0),null);
  assert.equal(F.makeStream(world(),{x:NaN,y:126},0),null);assert.equal(F.actionAt(world(),600,0),null);assert.equal(F.actionAt(world(),72.5,0),null);
});
