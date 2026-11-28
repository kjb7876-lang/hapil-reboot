'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {idle, put} = require('./helpers/arcade-v43.cjs');
const Party = require('../src/arcade-party-v43.js');
const Expedition = require('../src/arcade-party-expedition-v43.js');
const Forge = require('../src/arcade-party-forge-v43.js');

function fight(kind, cards, auto=false) {
  const run={status:'battle',stage:cards.length+1,picks:cards.map((card,i)=>({stage:i+1,card}))};
  const s=idle({party:{effects:Expedition.effects(run),companions:[{kind,slot:'wing'}]},partyAuto:auto});
  s.stage='wave';s.tick=4;s.party.charge=0;
  return s;
}
function nearby(s) {
  const {x,y}=s.player;
  put(s,x,y-20,{ba:Math.PI/2,bs:90,bage:20,blife:600,bgrace:10});
  s.party.allies[0].ready=0;
}
const tools={hitFoe(s,target,hit){target.hp-=hit;},removeBullet(s){s.n--;}};

test('the drone and archon expedition cards change ally fire damage and support cadence',()=>{
  const sample=cards=>{
    const d=fight('drone',cards);
    d.mobs.push({x:150,y:100,hp:50});
    Party.update(d,tools);
    const a=fight('archon',cards);
    nearby(a);Party.update(a,tools);
    return [d.party.allies[0].damage,a.party.allies[0].ready-a.tick];
  };
  const [damage,wait]=sample([]);
  const [stronger,faster]=sample(['drone-coil','archon-clock','supply-ammo']);
  assert(Math.abs(stronger/damage-1.36)<1e-8);
  assert.equal(faster,Math.round(wait*.92));
});

test('angel ward capacity, pilot charge, and ally reform use their own card ranks',()=>{
  const s=fight('angel',['angel-ward','power-cell','recall-beacon','supply-ward']);
  nearby(s);Party.update(s,tools);
  assert.equal(s.party.ward.capacity,3);
  assert(Math.abs(s.party.charge-.112)<1e-8);
  s.party.ward=null;
  const a=s.party.allies[0];a.integrity=1;
  assert(Party.contact(s,0,a.x,a.y,2));
  assert.equal(a.reform-s.tick,Math.round(240*.88));
  assert.equal(s.player.hp,s.player.maxHp);
});

test('the evasion ribbon extends only a human dodge and reload keeps remaining ally timers',()=>{
  for(const auto of [false,true]){
    const s=fight('drone',['pilot-ribbon'],auto);s.graze=1;s.party.lastMove=s.tick;
    Party.finish(s);
    assert.equal(s.party.boostUntil,auto?0:s.tick+210);
    s.party.charge=17.25;s.party.allies[0].reform=s.tick+94;
    s.party.allies[0].integrity=0;s.party.allies[0].ready=s.tick+103;
    const checkpoint=Party.checkpoint(s),next=fight('drone',['pilot-ribbon'],auto);
    next.tick=31;Party.restore(next,checkpoint);
    assert.equal(next.party.charge,17.25);
    assert.equal(next.party.boostUntil,auto?0:next.tick+210);
    assert.equal(next.party.allies[0].reform,next.tick+94);
    assert.equal(next.party.allies[0].ready,next.tick+103);
    assert.equal(next.party.allies[0].integrity,0);
  }
});

test('reel resonance changes actual campaign drone damage for the allocated stage including its resume',()=>{
  const forge=Forge.fresh(8,'campaign');
  Forge.spin(forge);
  assert.equal(forge.reel.status,'choose');
  assert(Forge.bank(forge,'drone').ok);
  const run={status:'battle',stage:2,picks:[{stage:1,card:'drone-coil'}]};
  const allocated=Forge.campaignEnter(forge,2);
  function fire(config, effects){
    const s=idle({party:{...config,effects}});
    s.tick=4;s.stage='wave';s.mobs.push({x:120,y:96,hp:150});
    Party.update(s,tools);
    return s.party.allies.find(ally=>ally.kind==='drone').damage;
  }
  const plain=fire(allocated,Expedition.effects(run));
  const resonant=fire(allocated,Expedition.effects(run,allocated.companions));
  assert(plain>0);assert(Math.abs(resonant/plain-1.24/1.12)<1e-8);
  const resumed=Forge.campaignEnter(forge,2,{resume:true});
  assert.equal(fire(resumed,Expedition.effects(run,resumed.companions)),resonant);
  const later=Forge.campaignEnter(forge,3);
  assert.equal(Expedition.resonance(run,later.companions),null);
});
