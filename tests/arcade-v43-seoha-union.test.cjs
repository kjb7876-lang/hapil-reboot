'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {need,idle,put,clear}=require('./helpers/arcade-v43.cjs');
const A=need();

function restore(options={}){
  return idle({entranceAll:true,hero:'seoha',grown:{exp:A.POWER_EXP[6],fills:A.BOMB_FILLS[6]},...options});
}

test('the trainee awakens once at both level caps, whichever cap comes last',()=>{
  for(const expFirst of [true,false]){
    const s=idle({hero:'seoha',entranceAll:true});
    if(expFirst)A.gainExp(s,Math.ceil(A.POWER_EXP[6]*100/(2*A.POWER_EXP_RATE)));
    s.fills=A.BOMB_FILLS[6]-1;
    s.gauge=A.GAUGE_FULL;
    A.step(s,{});
    assert.equal(!!s.union,expFirst);
    if(!expFirst)A.gainExp(s,Math.ceil(A.POWER_EXP[6]*100/(2*A.POWER_EXP_RATE)));
    assert.equal(s.union,true);
    assert.equal(A.heroProfile(s).id,'seoha-b');
    assert.equal(s.events.filter(e=>e==='unionAwakening').length,1);
    A.gainExp(s,30);
    assert.equal(s.events.filter(e=>e==='unionAwakening').length,1);
    const matching=A.createRun({difficulty:s.difficulty,entranceAll:true,hero:'memory'});
    assert.equal(s.rules.speed,matching.rules.speed);
    assert.equal(s.density,matching.density);
  }
  for(const hero of ['seoha-b','memory'])assert(!restore({hero}).union);
  assert(!restore({bossOnly:true}).union);
});

test('after awakening the two weapon families emit from either side during the same tick',()=>{
  const s=restore();
  s.hasteUntil=0;
  s.tick=5;
  A.step(s,{});
  assert.equal(s.sn,22);
  const memory=[],seoha=[];
  for(let i=0;i<s.sn;i++)(s.memoryShots[i]?memory:seoha).push(s.sx[i]);
  assert.equal(memory.length,11);
  assert.equal(seoha.length,11);
  assert(Math.abs(memory.reduce((a,b)=>a+b)/11-s.player.x-A.UNION_OFFSET)<1e-4);
  assert(Math.abs(seoha.reduce((a,b)=>a+b)/11-s.player.x+A.UNION_OFFSET)<1e-4);
});

test('time control applies to the field while Memory Gunner keeps output and both mini specials fire',()=>{
  const s=restore({ability:3});
  s.memoryAbility=7;
  s.player.focus=true;
  assert(Math.abs(A.abilityOf(s).bulletSpeed-.67)<1e-9);
  assert.equal(A.abilityOf(s).move,1);
  assert.equal(A.slowField(s)[1],.777);
  assert.equal(A.shotDamage(s,true),A.SHOT_DAMAGE[7]*1.77*1.3);
  assert.equal(A.shotDamage(s),A.SHOT_DAMAGE[7]);
  s.stage='wave';
  s.seg=A.STAGES[0].first;
  s.segTick=1;
  s.tick=100;
  s.frng=1;
  const m={x:180,y:245,baseX:180,r:16,hp:5000,maxHp:5000,age:0,hitTick:-99,score:0,fire:'aim',shots:0,vx:0,vy:0,sway:0,swayRate:0,every:100000,first:100000};
  s.mobs.push(m);
  A.step(s,{focus:true});
  assert.equal(s.fsLast.kind,'union');
  assert.equal(s.fsSwords[0].x,s.player.x-A.UNION_OFFSET);
  assert.equal(s.skillFx[0],s.player.x+A.UNION_OFFSET);
  assert(m.hp<5000,'reversal really deals damage');
  s.bombs=0;
  s.gauge=0;
  A.dropItem(s,s.player.x,s.player.y,1);
  A.step(s,{focus:true});
  assert.equal(s.gauge,25*A.FOCUS_GAUGE);
});

test('the paired bomb spends one bomb and delivers two complete sets of damage',()=>{
  const s=restore();
  const m={x:30,y:s.player.y+20,baseX:30,r:10,hp:5000,maxHp:5000,age:0,hitTick:-99,score:0,fire:'aim',shots:0,vx:0,vy:0,sway:0,swayRate:0,every:100000,first:100000};
  s.mobs.push(m);
  const before=s.bombs;
  A.step(s,{bomb:true});
  assert.equal(s.bombs,before-1);
  assert.equal(s.bombsUsed,1);
  assert.equal(s.lastBomb.union,true);
  assert.equal(s.lastBomb.name,'되찾은 시간 · 기억 해방');
  const pulses=[];
  for(let i=0;i<130;i++){
    clear(s);
    s.sn=0;
    A.step(s,{});
    if(s.events.includes('bombPulse'))pulses.push(s.pulseInfo);
  }
  assert.equal(pulses.length,A.BOMB_PULSES);
  assert(pulses.every(p=>p.union));
  assert(Math.abs(5000-m.hp-2*A.BOMB_POWER[7][1])<1e-8);
});

test('the overlap uses the existing single hit point and a hit cannot revoke the form',()=>{
  const s=restore({difficulty:'hell'});
  s.player.hp=2;
  put(s,s.player.x+A.UNION_OFFSET,s.player.y,{bage:100,bsize:0});
  A.step(s,{});
  assert.equal(s.hits,0,'the second portrait is not a hitbox');
  s.n=0;
  put(s,s.player.x,s.player.y,{bage:100,bsize:0});
  A.step(s,{});
  assert.equal(s.hits,1);
  assert.equal(s.power,7);
  assert.equal(s.union,true);
  const resumed=restore({grown:{exp:s.exp,fills:s.fills,union:s.union}});
  assert.equal(resumed.power,7);
  assert.equal(resumed.union,true);
  assert(!resumed.events.includes('unionAwakening'));
});
