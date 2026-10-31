'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');

function world(index,phase=0,difficulty='hell',revision=25){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'identity25-contract'});
  const boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;
  return w;
}
function withoutRevision(value){const v=JSON.parse(JSON.stringify(value));delete v.combatRevision;if(v._checkpoint)delete v._checkpoint.combatRevision;return v;}
function rounded(n){return Math.round(n*1e6)/1e6;}

test('25 is an explicit supported opt-in and preserves the incoming safe boundary revision',()=>{
  assert.equal(C.COMBAT_REVISION,21);assert.equal(C.IDENTITY_COMBAT_REVISION,25);
  for(const revision of [undefined,21,25]){
    const w=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,seed:818,runId:'boundary-revision'});
    const boundary=C.checkpoint(w),restored=C.restoreCheckpoint(boundary);
    assert.equal(boundary.combatRevision,revision);assert.equal(restored.combatRevision,revision);
    assert.deepEqual(C.checkpoint(restored),boundary);
    assert.equal(Object.hasOwn(w,'combatRevision'),revision!==undefined);
  }
  for(const revision of [0,20,22,24,26,'25',null])assert.throws(()=>C.createRun({combatRevision:revision}),/revision/);
});

test('all 34 changed configurations have explicit owned roles; Lust remains excluded',()=>{
  assert.equal(C.IDENTITY_PROFILES.length,35);assert.equal(C.IDENTITY_PROFILES[8],null);
  const changed=C.IDENTITY_PROFILES.filter(Boolean);assert.equal(changed.length,34);
  assert.equal(new Set(changed.map(p=>p.role)).size,34);
  for(const p of changed){assert.ok(Object.isFrozen(p));assert.ok(p.cadenceAdd>=0);}
});

test('Lust 25 retains the entire 21 combat world, including all three phases and difficulties',()=>{
  for(const difficulty of ['gentle','normal','hell'])for(let phase=0;phase<3;phase++){
    const old=world(8,phase,difficulty,21),current=world(8,phase,difficulty,25);
    assert.deepEqual(withoutRevision(current),withoutRevision(old));
    for(let tick=0;tick<840;tick++){
      const input={dx:tick%240<120?1:-1,dy:tick%180<90?.2:-.2,focus:tick%120<60};
      C.step(old,input);C.step(current,input);
      if(tick%60===0||tick===839)assert.deepEqual(withoutRevision(current),withoutRevision(old));
    }
  }
});

test('actual 25 warnings commit for 54 ticks and release the same locked source and phase',()=>{
  let observed=0;
  for(const index of [0,5,6,7,9,11,12,17,21,24,26,28,31,33,34])for(let phase=0;phase<3;phase++){
    const w=world(index,phase),plans=new Map(),born=new Set();
    for(let tick=0;tick<720;tick++){
      C.step(w,{});
      assert.ok((w._identityPlans||[]).length<=4);assert.ok((w.boss.identityCasts||[]).length<=8);
      for(const p of w._identityPlans||[]){
        const c=p.cast;assert.equal(c.activeAt-c.warningAt,54);
        if(!plans.has(c.id))plans.set(c.id,JSON.parse(JSON.stringify(p)));
        else assert.deepEqual(JSON.parse(JSON.stringify(p)),plans.get(c.id));
      }
      for(const b of w.bullets){
        if(!b.identityRole||born.has(b.id))continue;born.add(b.id);observed++;
        const plan=plans.get(b.identityCastId);assert.ok(plan,`${index}/${phase} missing committed warning`);
        assert.equal(w.tick,b.identityActiveAt);assert.equal(b.identityActiveAt-b.identityWarningAt,54);
        assert.equal(b.sourcePhase,phase);assert.equal(b.identityRole,plan.cast.identityRole);
        const matching=plan.specs.some(s=>s.x===b.px&&s.y===b.py&&rounded(s.angle)===rounded(b.angle)&&s.sourceActorId===b.sourceActorId&&s.modelActorId===b.modelActorId);
        assert.ok(matching,`${index}/${phase} changed locked origin/angle/owner`);
      }
    }
  }
  assert.ok(observed>1000);
});

test('every changed configuration actually releases its identity in all three phases within bounded capacity',()=>{
  const rows=[];
  for(let index=0;index<35;index++){
    if(index===8)continue;
    for(let phase=0;phase<3;phase++){
      const w=world(index,phase),seen=new Set();let maxWarnings=0;
      for(let tick=0;tick<1200;tick++){
        C.step(w,{});maxWarnings=Math.max(maxWarnings,(w._identityPlans||[]).length);
        for(const b of w.bullets)if(b.identityRole)seen.add(b.id);
        assert.ok(w.bullets.length<=C.CAPS.bullets);assert.ok(w.hazards.length<=C.CAPS.hazards);
      }
      assert.ok(seen.size>0,`${index}/${phase} has no actual identity release`);
      assert.ok(maxWarnings<=4);assert.equal(w.stats.droppedGroups,0,`${index}/${phase} exhausted pool`);
      rows.push({index,phase,actualIdentityProjectiles:seen.size,peakBullets:w.stats.peakBullets});
    }
  }
  assert.equal(rows.length,102);
});

test('protected command/record configurations receive neither new actors nor combat copies',()=>{
  for(const index of [12,13,14,15,16,17,21,22,23,24,25,26,27,28,31,32]){
    const w=world(index,2);
    for(let tick=0;tick<720;tick++){
      C.step(w,{});assert.equal((w.boss.combatCopies||[]).length,0);
      for(const b of w.bullets)if(b.identityRole)assert.equal(b.sourceActorId,undefined);
    }
  }
  const final=world(34,2);for(let tick=0;tick<720;tick++)C.step(final,{});
  assert.equal(final.boss.coreIntact,true);assert.equal(final.boss.targetSemantic,'cult-authority');
});

test('the 34 new compositions differ in actual geometry/rhythm rather than role labels alone',()=>{
  const signatures=new Map();
  for(let index=0;index<35;index++){
    if(index===8)continue;
    const w=world(index);let selected;
    for(let tick=0;tick<1200&&!selected;tick++){
      C.step(w,{});
      selected=(w._identityPlans||[]).find(p=>!p.cast.sourceActorId||['han-rian','baek-ion'].includes(p.cast.sourceActorId));
    }
    assert.ok(selected,`${index} never commits an actual main-source identity cast`);
    const key=JSON.stringify(selected.specs.map(s=>[s.kind,rounded(s.x-selected.cast.x),rounded(s.y-selected.cast.y),rounded(s.angle),rounded(s.speed),s.acceleration,s.accelerateAt,s.pauseFrom,s.pauseUntil]));
    assert.equal(signatures.has(key),false,`${index} duplicates actual ${signatures.get(key)} geometry/rhythm`);signatures.set(key,index);
  }
  assert.equal(signatures.size,34);
});
