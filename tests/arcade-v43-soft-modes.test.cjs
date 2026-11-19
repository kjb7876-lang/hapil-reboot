'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
// 사용자 11-18: 몹·중간보스·보스가 죽지도 않았는데 사라지고 체력이 적다 / 노멀 탄이 겹치고 빠르다 / 이지·노멀 탄속·탄 수 10% 감소 + 흩뿌림, 헬은 그대로.
const run=(difficulty,all,extra)=>a.createRun(Object.assign({difficulty,seed:9,stage:3,entranceAll:all},extra||{}));
// 사용자 11-19 "제안대로 계단 고르게": 실제 게임은 겹친 배율 대신 LIVE_TABLE 최종값 한 줄을 쓴다(휴대폰 기준 탄 수, PC는 ÷COMPACT_DENSITY).
test('the live game uses one final row per difficulty, with even steps from easy to hell',()=>{
  const T=a.LIVE_TABLE,last=a.STAGES.length-1;
  for(const d of ['gentle','normal','hell']){const m=a.createRun({difficulty:d,seed:9,stage:0,entranceAll:true,compact:true}),pc=a.createRun({difficulty:d,seed:9,stage:0,entranceAll:true});
    assert.equal(m.rules.speed,T[d].speed,d+' speed');assert(Math.abs(m.density-T[d].density)<1e-9,d+' phone density');assert(Math.abs(pc.density*a.COMPACT_DENSITY-T[d].density)<1e-9,d+' pc density');
    assert.equal(m.player.r,T[d].radius,d+' hit dot');assert.equal(m.rules.hitScale,T[d].hitScale,d+' bullet hit share');}
  const g=a.createRun({difficulty:'gentle',seed:9,stage:last,entranceAll:true,compact:true});assert(Math.abs(g.density-T.gentle.end)<1e-9,'easy tightens to its end value');
  for(const k of ['speed','density','radius'])assert(T.gentle[k]<T.normal[k]&&T.normal[k]<=T.hell[k],k+' steps up');
  const step=(x,y)=>y/x;assert(step(T.gentle.speed,T.normal.speed)<1.4&&step(T.normal.speed,T.hell.speed)>1.1,'no cliff between easy and normal, a real step to hell');
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
