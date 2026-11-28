'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../src/arcade-party-training-v43.js');

const unit = (kind,slot,stars=1) => ({kind,slot,stars});
function battle(companions, extra={}) {
  return sim.create({companions,difficulty:'hell',hero:'seoha',seed:24,...extra});
}
function round(s,x,y,leader=false,vx=0,vy=135) {
  const b={id:++s.serial,kind:leader?'aim':'rank',leader,volley:-1,side:0,targetSlot:0,x,y,vx,vy,r:4};
  s.bullets.push(b);
  return b;
}

test('training roster admits three different positions and can resume flights from before role counters existed',()=>{
  const old=battle([unit('archon','front'),unit('drone','wing'),unit('angel','rear'),unit('archer','rear')]);
  assert.deepEqual(old.allies.map(a=>a.kind),['archon','drone','angel']);
  const tank=old.allies[0];
  delete tank.integrity;delete tank.guards;delete old.boons.archerDamage;
  old.hero.bombs=0;old.power.charge=36;
  sim.restoreRoles(old);
  assert.equal(tank.integrity,4);assert.equal(tank.guards,0);assert.equal(old.boons.archerDamage,1);
  assert.equal(old.hero.bombs,0);assert.equal(old.power.charge,36);
  tank.integrity=1;sim.restoreRoles(old);assert.equal(tank.integrity,1);
});

test('drone deliberately shoots down an incoming small round while the aimed skill and outgoing round keep flying',()=>{
  const s=battle([unit('drone','wing')]), p=s.hero, drone=s.allies[0];
  drone.cooldown=0;
  const heavy=round(s,p.x,p.y-30,true), harmless=round(s,p.x+25,p.y-44,false,130,0);
  const small=round(s,p.x,p.y-52);
  sim.step(s);
  assert.equal(drone.intercepts,1);
  assert(s.bullets.includes(heavy)&&s.bullets.includes(harmless)&&!s.bullets.includes(small));
  round(s,p.x,p.y-53);sim.step(s);assert.equal(drone.intercepts,1);
});

test('refitting carries support wounds and remaining timers through a reserve swap',()=>{
  const first=battle([unit('archon','front'),unit('angel','rear')]), [tank,angel]=first.allies;
  first.tick=390;tank.guardReady=460;tank.integrity=2;tank.cooldown=4;
  angel.alive=false;angel.respawn=1.4;
  const retained=battle([unit('archer','front'),unit('angel','rear')],{carry:{lives:1,bombs:0,companions:sim.carryCompanions(first)}});
  assert.equal(retained.allies[1].alive,false);assert.equal(retained.allies[1].respawn,1.4);
  const redeployed=battle([unit('archon','front')],{carry:{lives:1,bombs:0,companions:sim.carryCompanions(retained)}});
  assert.equal(redeployed.allies[0].integrity,2);assert.equal(redeployed.allies[0].guardReady,70);assert.equal(redeployed.allies[0].cooldown,4);
  tank.integrity=1;
  const wing=battle([unit('archon','wing')],{carry:{lives:1,bombs:0,companions:sim.carryCompanions(first)}});
  const front=battle([unit('archon','front')],{carry:{lives:1,bombs:0,companions:sim.carryCompanions(wing)}});
  assert.equal(front.allies[0].integrity,1);
});

test('only an aligned front tank guards the boss spear before it reaches the hero, consuming a charge',()=>{
  for(const [slot,aligned,expected] of [['front',true,1],['front',false,0],['wing',true,0]]){
    const s=battle([unit('archon',slot)]), h=s.hero, tank=s.allies[0];
    if(!aligned)tank.x+=58;
    const b=round(s,h.x,h.y-67,true);
    sim.step(s);
    assert.equal(tank.guards,expected);assert.equal(tank.skillBlocks,expected);
    assert.equal(s.bullets.includes(b),!expected);assert.equal(h.lives,h.maxLives);
    if(expected){
      assert.equal(tank.integrity,tank.maxIntegrity-1);
      const next=round(s,h.x,h.y-67);sim.step(s);
      assert.equal(tank.guards,1);assert(s.bullets.includes(next));
    }
  }
});

test('rear archer aims stronger arrows, applies the archer boon, and primes only one double arrow on a linked power',()=>{
  function first(kind,slot,boons){
    const s=battle([unit(kind,slot)],{boons});
    s.allies[0].shotCd=0;sim.step(s);
    return s.shots.find(b=>b.slot===1).damage;
  }
  const base=first('archer','front');
  assert.equal(first('archer','rear'),base*1.6);
  assert(first('archer','rear')>first('drone','rear'));
  assert(Math.abs(first('archer','rear',{archerDamage:1.24})-base*1.6*1.24)<.00001);
  const s=battle([unit('archer','rear',7),unit('angel','wing')]);
  const bow=s.allies[0];
  bow.shotCd=1;
  sim.step(s,{power:true});assert(s.linkUsed&&bow.chargedArrow);
  bow.shotCd=0;sim.step(s);
  const double=s.shots.find(b=>b.kind==='archer');
  assert(double.boost&&!bow.chargedArrow);
  bow.shotCd=0;sim.step(s);
  const regular=s.shots.filter(b=>b.kind==='archer').at(-1);
  assert.equal(double.damage,2*regular.damage);
});

test('living angel accelerates power and heals missing life after real rear rescues only once per Hell stage',()=>{
  const s=battle([unit('angel','rear')]), wing=battle([unit('drone','rear')]), h=s.hero, angel=s.allies[0];
  s.power.charge=wing.power.charge=0;
  sim.step(s);sim.step(wing);
  assert(Math.abs(s.power.charge-wing.power.charge*1.2)<.00001);
  h.lives=1;
  function cover(vx,vy){
    s.fields.push({id:++s.serial,kind:'barrier',slot:angel.slot,x:h.x,y:h.y-12,r:32,capacity:1,duration:1,timeLeft:1});
    round(s,h.x,h.y-20,false,vx,vy);sim.step(s);
  }
  cover(135,0);assert.equal(h.fragments,0);
  for(let i=0;i<3;i++)cover(0,135);
  assert.equal(h.lives,h.maxLives);assert.equal(angel.rescues,1);assert(angel.chargeGranted>=24);
  h.lives=1;
  for(let i=0;i<3;i++)cover(0,135);
  assert.equal(h.lives,1);assert.equal(angel.rescues,1);
  const fields=sim.snapshot(s).allies[0];assert.equal(fields.rescues,1);assert(fields.chargeGranted>=48);
});

test('rear care marks use eight seconds of live combat, survive reload, and combine with a genuine rescue',()=>{
  const team=[unit('angel','rear')];
  let s=battle(team);
  s.hero.lives=1;s.hero.invuln=100;s.boss.hp=s.boss.maxHp=100000;
  s.allies[0].invuln=100;
  sim.step(s,{},479/60);assert.equal(s.hero.fragments,0);assert.equal(s.allies[0].careTicks,479);
  const flight=JSON.parse(JSON.stringify(s));
  flight.players=[flight.hero,...flight.allies];s=sim.restoreRoles(flight);
  sim.step(s);assert.equal(s.hero.fragments,1);assert.equal(s.allies[0].careTicks,0);
  sim.step(s,{},8);assert.equal(s.hero.fragments,2);
  const a=s.allies[0],h=s.hero;
  h.invuln=0;
  s.bullets.length=0;
  s.fields.push({id:++s.serial,kind:'barrier',slot:a.slot,x:h.x,y:h.y-12,r:32,capacity:1,duration:1,timeLeft:1});
  round(s,h.x,h.y-20);sim.step(s);
  assert.equal(h.lives,2);assert.equal(a.rescues,1);
  h.lives=1;h.invuln=100;
  sim.step(s,{},24);
  assert.equal(h.lives,1);assert.equal(h.fragments,0);assert.equal(a.careTicks,0);
});

test('care stops while downed, off the rear seat, or without a live enemy, and full health clears partial progress',()=>{
  for(const state of ['down','wing','empty','full']){
    const s=battle([unit('angel',state==='wing'?'wing':'rear')]);
    const a=s.allies[0];
    a.careTicks=479;s.hero.lives=state==='full'?2:1;
    if(state==='down'){a.alive=false;a.respawn=1;}
    if(state==='empty')s.boss.alive=false;
    sim.step(s);
    assert.equal(s.hero.fragments,0);
    assert.equal(a.careTicks,state==='full'?0:479);
  }
  const s=battle([unit('angel','rear')]);s.hero.lives=1;s.allies[0].careTicks=340;
  const next=battle([unit('angel','rear')],{carry:{lives:1,bombs:0,companions:sim.carryCompanions(s)}});
  assert.equal(next.allies[0].careTicks,340);
});
