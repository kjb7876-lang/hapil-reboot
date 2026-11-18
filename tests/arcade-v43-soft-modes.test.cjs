'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
// 사용자 11-18: 몹·중간보스·보스가 죽지도 않았는데 사라지고 체력이 적다 / 노멀 탄이 겹치고 빠르다 / 이지·노멀 탄속·탄 수 10% 감소 + 흩뿌림, 헬은 그대로.
const run=(difficulty,all,extra)=>a.createRun(Object.assign({difficulty,seed:9,stage:3,entranceAll:all},extra||{}));
test('easy and normal bullets are slower and about 10% fewer on screen than before; hell stays the same',()=>{
  for(const d of ['gentle','normal']){const before=run(d,false),after=run(d,true);
    assert(after.rules.speed<before.rules.speed*.9+1e-9,d+' speed lowered: '+after.rules.speed+' < '+before.rules.speed);
    const onScreen=after.density/before.density/(after.rules.speed/before.rules.speed); // 느려지면 화면에 더 오래 남으니 화면 속 탄 수는 탄 수÷속도 배율
    assert(onScreen<.95&&onScreen>.85,d+' bullets on screen about 10% fewer: '+onScreen);}
  const h0=run('hell',false),h1=run('hell',true);assert.equal(h1.rules.speed,h0.rules.speed);assert.equal(h1.density,h0.density);
});
test('normal is now gentler than hell in speed (they are no longer identical)',()=>{
  assert(run('normal',true).rules.speed<run('hell',true).rules.speed);
});
test('bullets are scattered: a real pattern has many more distinct speeds on easy and normal than on hell',()=>{
  const seg=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);const distinct={};
  for(const d of ['gentle','normal','hell']){const s=a.createRun({difficulty:d,seed:9,segment:seg,entranceAll:true});s.boss.present=true;s.boss.x=180;s.boss.y=130;s.stage='card';
    for(let t=0;t<160;t++){a.SEGMENTS[seg].fire(s,t);}
    const sp=new Set();for(let i=0;i<s.n;i++)sp.add(Math.round(s.bs[i]*1000));distinct[d]=[sp.size,s.n];}
  assert(distinct.normal[0]>distinct.hell[0]*2,'normal distinct speeds '+distinct.normal+' vs hell '+distinct.hell);
  assert(distinct.gentle[0]>distinct.hell[0]*1.5,'gentle '+distinct.gentle+' vs hell '+distinct.hell);
});
test('mobs and bosses have more health and bosses stay longer in the app rules',()=>{
  const m0=run('normal',false),m1=run('normal',true);
  const seg=a.SEGMENTS.findIndex(g=>g.kind==='card');const card=a.SEGMENTS[seg];
  assert(a.cardHp(m1,card)>=a.cardHp(m0,card)*1.45,'boss hp x1.5');
  assert(a.cardDuration(m1,card)>=a.cardDuration(m0,card)*1.75,'boss stays x1.8');
  m0.mobs.length=m1.mobs.length=0;
  const wave=a.SEGMENTS.findIndex(g=>g.kind==='wave');
  for(const s of [m0,m1]){s.seg=wave;s.stage='wave';s.segTick=0;for(let t=0;t<200&&s.mobs.length<3;t++){a.SEGMENTS[wave].script(s,t);}}
  assert(m1.mobs.length&&m0.mobs.length);assert(m1.mobs[0].hp>=m0.mobs[0].hp*1.6,'mob hp x1.7');
});
test('a mid-wave elite does not drift away on its own while alive',()=>{
  const s=run('normal',true);const w=a.SEGMENTS.findIndex(g=>g.kind==='wave');
  s.seg=w;s.stage='wave';s.segTick=0;s.mobs.length=0;a.spawnMobForTest&&0;
  const mob=(kind,x,y,o)=>({kind,elite:true,x,y,baseX:x,vx:0,vy:0,sway:0,swayRate:.05,hp:999,r:20,score:1,fire:'aim',first:40,every:0,color:0,stopY:120,hold:300,age:0,shots:0,hitTick:-99});
  const e=mob('x',180,-30);s.mobs.push(e);
  for(let t=0;t<900;t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});if(!s.mobs.includes(e)&&s.stage==='wave'&&s.segTick<400)break;}
  assert(s.mobs.includes(e)||s.segTick>=400,'elite stays at its post instead of leaving at hold+90');
  assert(e.y>=0||s.segTick>=400);
});
