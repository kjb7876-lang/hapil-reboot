'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {need,idle,put}=require('./helpers/arcade-v43.cjs');
const A=need(), Party=require('../src/arcade-party-v43.js');
const solo=(kind,slot,stars=1)=>({companions:[{kind,slot,stars}]});
function fight(party){
  return idle({difficulty:'hell',compact:true,entranceAll:true,hero:'memory',distort:false,party});
}
function beam(s,angle=Math.PI/2,solid=false){
  const {x,y}=s.player;
  s.lasers.push({x:x-200*Math.cos(angle),y:y-200*Math.sin(angle),angle,width:10,
    warn:10,age:15,active:180,solid,follow:false,spin:0,full:false});
}
function bullet(s,x,y,angle=Math.PI/2,size=1){
  return put(s,x,y,{ba:angle,bs:100,bage:30,bgrace:12,blife:900,bsize:size});
}
test('front archon spends hull to intercept an inbound shot in front of the pilot',()=>{
  const s=fight(solo('archon','front')),a=s.party.frontGuard;
  bullet(s,s.player.x,a.y-2);
  A.step(s,{});
  assert.equal(s.n,0);assert.equal(a.blocks,1);assert.equal(a.integrity,a.maxIntegrity-1);assert.equal(a.action.kind,'guard');
  bullet(s,s.player.x,a.y-2);
  A.step(s,{});
  assert.equal(s.n,1);assert.equal(a.blocks,1);
  assert.equal(a.guardReady,151);
});
test('front archon holds one aligned laser briefly; crossing lines, walls and flanks still hit',()=>{
  const s=fight(solo('archon','front')),a=s.party.frontGuard;
  beam(s);
  for(let tick=0;tick<30;tick++)A.step(s,{});
  assert.equal(s.player.hp,2);assert.equal(a.blocks,1);assert.equal(a.integrity,3);
  A.step(s,{});
  assert.equal(s.player.hp,1);assert.equal(a.blocks,1);assert.equal(s.lasers.length,1);
  for(const [slot,angles,solid] of [['wing',[Math.PI/2],false],['front',[Math.PI/2],true],['front',[0],false],['front',[Math.PI/2,Math.PI/2+.02],false]]){
    const other=fight(solo('archon',slot));
    for(const angle of angles)beam(other,angle,solid);
    A.step(other,{});
    assert.equal(other.player.hp,1);assert.equal(other.lasers.length,angles.length);
  }
});
test('the drone selects one approaching small round; receding, large and prop shots stay live',()=>{
  const s=fight(solo('drone','wing'));
  s.stage='wave';s.seg=0;s.segTick=80;s.tick=79;
  const p=s.player,d=s.party.allies[0];d.ready=0;
  bullet(s,p.x,p.y-25,-Math.PI/2,1);bullet(s,p.x,p.y-25,Math.PI/2,4);
  bullet(s,p.x,p.y-25,Math.PI/2,5);bullet(s,p.x,p.y-28,Math.PI/2,3);
  A.step(s,{});
  assert.equal(d.blocks,1);assert.equal(d.action.kind,'intercept');assert.equal(d.ready-s.tick,126);
  assert.deepEqual([...s.bsize.slice(0,s.n)].sort(),[1,4,5]);
});
test('archer aims at the active boss; rear position and archer boons multiply actual enemy damage',()=>{
  const sample=(slot,effects)=>{
    const s=fight({...solo('archer',slot),effects});
    s.stage='card';Object.assign(s.boss,{hp:100,present:true,leaving:false,x:150,y:90});
    s.mobs.push({hp:30,x:s.player.x,y:s.player.y-25});
    Party.update(s,{hitFoe(_,foe,hit){foe.hp-=hit;}});
    const a=s.party.allies[0];
    assert.equal(a.action.kind,'arrow');assert.equal(a.action.x,150);assert.equal(s.mobs[0].hp,30);
    assert(Math.abs((100-s.boss.hp)-a.damage)<1e-8);
    return a.damage;
  };
  const standard=sample('front',{});
  assert(Math.abs(sample('wing',{})/standard-1.45)<1e-8);
  assert(Math.abs(sample('rear',{archerDamage:1.12})/standard-1.6*1.12)<1e-8);
});
test('a seven-star archer links once per stage and carries a primed double shot through a checkpoint',()=>{
  const config={companions:[{kind:'archon',slot:'front',stars:1},{kind:'archer',slot:'rear',stars:7}]};
  const s=fight(config);
  s.stage='wave';s.player.focus=true;
  const tools={hitFoe(_,foe,hit){foe.hp-=hit;}};
  Party.update(s,tools);
  assert(s.party.linkUsed);assert(s.party.arrowReady);
  const restored=fight(config);Party.restore(restored,Party.checkpoint(s));
  restored.stage='wave';restored.mobs.push({hp:200,x:180,y:120});
  const a=restored.party.allies[1];
  Party.update(restored,tools);const first=a.damage;
  assert.equal(restored.party.arrowReady,false);
  restored.tick=a.nextShot;restored.party.charge=100;restored.player.focus=true;Party.update(restored,tools);
  assert(Math.abs(a.damage-first-first/2)<1e-8);
});
test('angel amplifies earned bomb charge only while active and restores at most one Hell heart per stage',()=>{
  for(const [party,down,earned] of [[null,false,25],[solo('angel','rear'),true,25],[solo('angel','rear'),false,30]]){
    const s=fight(party);
    if(down)s.party.healer.reform=100;
    A.step(s,{});assert.equal(s.gauge,0);
    s.ix[0]=s.player.x;s.iy[0]=s.player.y;s.ikind[0]=1;s.itemCount=1;
    A.step(s,{});assert.equal(s.gauge,earned);
  }
  const s=fight(solo('angel','rear')),a=s.party.healer,p=s.player;
  p.hp=1;s.party.charge=0;
  function save(){
    s.n=0;bullet(s,p.x,p.y-24);
    s.party.ward={x:p.x,y:p.y-12,radius:32,owner:a,capacity:1,until:s.tick+4};
    A.step(s,{});
  }
  save();save();save();assert.equal(p.hp,2);assert.equal(a.action.kind,'heal');assert.equal(s.party.charge,24);
  p.hp=1;save();save();save();assert.equal(p.hp,1);assert.equal(s.party.extends,1);
  const resume=fight(solo('angel','rear'));Party.restore(resume,Party.checkpoint(s));
  assert.equal(resume.party.healedStage,s.stageIndex);
  s.stageIndex++;save();save();save();assert.equal(p.hp,2);
});
test('benching and restoring a wounded tank, even through a lower-health slot, keeps damage and guard cooldown',()=>{
  const front=solo('archon','front'),bench=solo('archer','rear');
  const s=fight(front);s.tick=40;
  s.party.frontGuard.integrity=1;s.party.frontGuard.guardReady=180;
  const current=Party.checkpoint(s);
  const resumed=fight(bench);Party.restore(resumed,current);
  Party.refit(resumed,solo('archon','wing'));
  Party.refit(resumed,bench);
  const afterMenu=fight(bench);Party.restore(afterMenu,Party.checkpoint(resumed));
  Party.refit(afterMenu,front);
  assert.equal(afterMenu.party.frontGuard.integrity,1);assert.equal(afterMenu.party.frontGuard.guardReady,140);
});
test('rear angel tends a wounded pilot during live combat and resumes partial work after formation changes and reload',()=>{
  const rear=solo('angel','rear'),tools={hitFoe(){}};
  function pass(s,frames){for(let i=0;i<frames;i++){s.tick++;Party.update(s,tools);}}
  const s=fight(rear);s.player.hp=1;s.stage='wave';
  pass(s,600);assert.equal(s.party.healTicks,0);
  s.mobs.push({hp:99,x:180,y:80});pass(s,600);
  assert.equal(s.party.rescue,1);assert.equal(s.party.healTicks,120);
  Party.refit(s,solo('drone','wing'));pass(s,600);
  const next=fight(rear);next.player.hp=1;Party.restore(next,Party.checkpoint(s));
  assert.equal(next.party.rescue,1);assert.equal(next.party.healTicks,120);
  next.stage='card';Object.assign(next.boss,{present:true,hp:500,x:180,y:80});
  pass(next,839);assert.equal(next.player.hp,1);pass(next,1);assert.equal(next.player.hp,2);
  assert.equal(next.party.extends,1);
  next.player.hp=1;pass(next,1600);assert.equal(next.player.hp,1);
  next.stageIndex++;pass(next,575);assert.equal(next.party.rescue,1);
  next.player.hp=2;pass(next,1);assert.equal(next.party.rescue,0);assert.equal(next.party.healTicks,0);
});
