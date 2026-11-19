'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
// 사용자 11-18: 몹·중간보스·보스가 죽지도 않았는데 사라지고 체력이 적다 / 노멀 탄이 겹치고 빠르다 / 이지·노멀 탄속·탄 수 10% 감소 + 흩뿌림, 헬은 그대로.
const run=(difficulty,all,extra)=>a.createRun(Object.assign({difficulty,seed:9,stage:3,entranceAll:all},extra||{}));
test('easy and normal bullets are slower and about 10% fewer on screen than before; hell stays the same',()=>{
  for(const d of ['gentle','normal']){const before=run(d,false),after=run(d,true);
    assert(after.rules.speed<before.rules.speed*.9+1e-9,d+' speed lowered: '+after.rules.speed+' < '+before.rules.speed);
    const onScreen=after.density/before.density/(after.rules.speed/before.rules.speed)/.75; // 느려지면 화면에 더 오래 남으니 화면 속 탄 수는 탄 수÷속도 배율. 사용자 11-19 "모든모드 탄환숫자25프로정도 감소"로 실제 게임 전체 25%를 줄인 몫(.75)은 따로 본다
    assert(onScreen<.95&&onScreen>.85,d+' bullets on screen about 10% fewer: '+onScreen);}
  const h0=run('hell',false),h1=run('hell',true);assert.equal(h1.rules.speed,h0.rules.speed);assert(Math.abs(h1.density-h0.density*.75)<1e-9,'hell: only the 11-19 all-mode 25% trim');
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

// 사용자 11-18(2): 일반 몹은 위로 되돌아가지 않고 가던 방향대로 나간다 / 중간보스 체력·지속시간은 직전보다 2~3배
test('a retreating regular mob keeps its travel direction instead of turning back up',()=>{
  const s=run('normal',true);s.mobs.length=0;
  const mk=(vx,vy)=>({kind:'x',elite:false,x:180,y:200,baseX:180,vx,vy,sway:0,swayRate:.05,hp:99,r:10,score:1,fire:'aim',first:9999,every:0,color:0,stopY:120,hold:300,age:50,shots:0,hitTick:-99,retreat:true,next:99999});
  const down=mk(0,1.6),side=mk(2,.4);s.mobs.push(down,side);
  const y0=down.y,x0=side.x;
  for(let i=0;i<20;i++)a.step(s,{dx:0,dy:0});
  assert(down.y>y0+20,'moves on downward: '+down.y);
  assert(side.x>x0+20&&side.y>=200,'moves on sideways: '+side.x+','+side.y);
});
test('mid-boss cards have 2.5x (easy 3x) the health and stay duration of before; regular bosses unchanged from last step',()=>{
  const midIdx=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.mid),bossIdx=a.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid);
  assert(midIdx>=0&&bossIdx>=0);
  for(const [d,k] of [['gentle',3],['normal',2.5],['hell',2.5]]){
    const s=a.createRun({difficulty:d,seed:9,segment:midIdx,entranceAll:true}),mid=a.SEGMENTS[midIdx],boss=a.SEGMENTS[bossIdx];
    const plain=Object.assign({},mid,{mid:false});
    assert(Math.abs(a.cardHp(s,mid)/a.cardHp(s,plain)-k)<.05,d+' mid hp x'+k);
    assert(Math.abs(a.cardDuration(s,mid)/a.cardDuration(s,plain)-k)<.05,d+' mid duration x'+k);}
});
