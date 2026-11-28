'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {need, idle, put, clear} = require('./helpers/arcade-v43.cjs');
const A = need();
const Party = require('../src/arcade-party-v43.js');
const team = {lineage:'time',companions:[{kind:'archon',slot:'front'},{kind:'drone',slot:'wing'},{kind:'angel',slot:'rear'}]};
function base(config = team) {
  return idle({party:config,hero:'seoha',compact:true,entranceAll:true,seed:22,distort:false});
}
function bullet(s,x,y,speed=90) {
  put(s,x,y,{ba:Math.PI/2,bs:speed,bage:30,blife:1500,bgrace:12});
}

test('campaign run keeps one stock, the same union hero and ordinary bomb protection', () => {
  const opt={hero:'seoha',difficulty:'normal',compact:true,entranceAll:true,grown:{union:true,fills:100,exp:2500},distort:false};
  const old=idle(opt), party=idle({...opt,party:team});
  assert.equal(old.party,undefined);
  assert.equal(party.union,true);
  assert.deepEqual(party.player,old.player);
  for(const s of [old,party]){
    bullet(s,s.player.x,s.player.y,0);
    A.step(s,{});
    assert.equal(s.player.hp,3);assert.equal(s.bombs,1);
    s.player.hp=1;s.bombs=0;s.player.invulnerableUntil=0;
    bullet(s,s.player.x,s.player.y,0);
    A.step(s,{});
    assert.equal(s.stage,'lost');
  }
  assert.equal(party.party.allies.length,3);
  assert(party.party.allies.every(a=>a.integrity>0));
});

test('a real encounter gives the three allies their own movement and attack turns', () => {
  const s=A.createRun({seed:211,stage:41,difficulty:'normal',compact:true,entranceAll:true,party:team,partyAuto:true});
  let peak=0;
  for(let i=0;i<3100&&s.stage!=='lost';i++){
    A.step(s,{});clear(s);peak=Math.max(peak,s.n);
  }
  assert(peak>0);
  for(const a of s.party.allies){
    assert(a.damage>0,a.kind+' fired at this stage’s enemies');
    assert(Math.hypot(a.x-s.player.x,a.y-s.player.y)>10);
  }
  assert.equal(s.party.evades,0);
});

test('reassignment at a stage boundary preserves wounds, cooldowns and pilot stock', () => {
  const s=base();
  const d=s.party.allies.find(a=>a.kind==='drone');
  d.ready=111;d.integrity=1;d.x=198;
  s.party.charge=25;s.player.hp=1;
  Party.refit(s,{companions:[{kind:'drone',slot:'front',stars:4}],lineage:'gravity'});
  const refitted=s.party.allies[0];
  assert.equal(refitted.slot,'front');assert.equal(refitted.ready,111);assert.equal(refitted.integrity,2);
  assert.equal(refitted.x,198);assert.equal(s.party.charge,25);assert.equal(s.player.hp,1);
});

test('only genuine rear angel ward saves contribute an immediate point towards lost life recovery', () => {
  const s=base({companions:[{kind:'angel',slot:'rear'}]});
  const angel=s.party.allies[0],p=s.player;
  s.player.hp=1;
  function intercept(angle,x=p.x){
    s.n=0;bullet(s,x,p.y-20);s.ba[0]=angle;
    s.party.ward={x:p.x,y:p.y-12,radius:36,owner:angel,capacity:1,until:s.tick+2};
    A.step(s,{});
  }
  intercept(0);assert.equal(s.party.rescue,0);
  for(let i=0;i<3;i++)intercept(Math.PI/2);
  assert.equal(p.hp,2);assert.equal(s.party.extends,1);
  angel.slot='wing';
  for(let i=0;i<3;i++)intercept(Math.PI/2);
  assert.equal(p.hp,2);assert.equal(s.bombs,s.rules.bombs);
});

test('manual graze increases firepower for three seconds, while automatic movement earns no graze reward', () => {
  const human=base({companions:[]}),auto=base({companions:[]});
  for(const s of [human,auto]){
    const p=s.player;
    bullet(s,p.x+15,p.y,0);
    if(s===auto)s.party.auto=true;
    A.step(s,{dx:1,dy:0});
  }
  assert.equal(human.party.evades,1);assert.equal(human.party.boostUntil,human.tick+180);
  assert.equal(auto.party.evades,0);assert.equal(auto.graze,0);
  bullet(human,human.player.x,human.player.y,0);A.step(human,{});
  assert.equal(human.party.boostUntil,0);assert.equal(human.party.recoverUntil,human.tick+60);
  human.party.auto=true;A.step(human,{});
  assert(human.party.recoverUntil>human.tick);
});

test('front supports sooner and a rear seat accelerates pilot power charge', () => {
  function cast(slot){
    const s=base({companions:[{kind:'drone',slot}]});
    s.seg=0;s.stage='wave';s.segTick=80;s.stageTick=80;s.tick=79;
    s.party.charge=0;const drone=s.party.allies[0];drone.ready=0;
    bullet(s,s.player.x,s.player.y-20);A.step(s,{});
    assert.equal(drone.blocks,1);return [drone.ready-s.tick,s.party.charge];
  }
  const front=cast('front'),rear=cast('rear');
  assert(front[0]<rear[0]);assert(rear[1]>front[1]);
});

test('automatic contract power waits for a real threat and keeps manual hero focus independent', () => {
  const s=base({companions:[],lineage:'time'});
  s.party.auto=true;s.seg=0;s.stage='wave';s.segTick=80;s.stageTick=80;s.tick=7;
  A.step(s,{});assert.equal(s.party.charge,100);assert.equal(s.party.autoPowers,0);
  s.tick=15;bullet(s,s.player.x,s.player.y-29);
  A.step(s,{});
  assert.equal(s.party.autoPowers,1);assert.equal(s.party.charge,0);
  assert.equal(s.player.focus,false);assert.equal(s.party.field.manual,true);
  s.party.charge=100;A.step(s,{focus:true});
  assert.equal(s.player.focus,true);assert.equal(s.party.powerUses,2);assert.equal(s.party.autoPowers,1);
});
