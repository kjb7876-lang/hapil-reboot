'use strict';
// 수집선 규칙(사용자 11-20): 탄은 시간으로 사라지지 않고, 영웅이 수집선 위에 있을 때만 닿을 수 없는 선 아래 탄이 빨리 빠진다.
// 선 위에 머물면 조준탄·가로 광선·먹바위가 돌아가며 나온다. 중간보스 격파는 탄을 걷지 않는다. 탄속 +16%·탄 수 -20%.
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/arcade-v43.js');
function drive(s,ty,ticks,each){for(let t=0;t<ticks&&s.stage!=='won'&&s.stage!=='lost';t++){const p=s.player,tx=180+Math.sin(t/90)*120;
  A.step(s,{dx:Math.max(-4.2,Math.min(4.2,tx-p.x)),dy:Math.max(-4.2,Math.min(4.2,ty-p.y))});p.hp=99;if(each)each(s,t);s.events.length=s.cancelled.length=s.pops.length=0;}}

test('collection line sits higher (150) and the live table carries +16% speed and -20% bullets',()=>{
  assert.equal(A.AUTO_COLLECT_Y,150);
  assert(Math.abs(A.LIVE_TABLE.normal.speed-1.17*1.16)<1e-3&&Math.abs(A.LIVE_TABLE.hell.speed-1.365*1.16)<1e-3&&Math.abs(A.LIVE_TABLE.gentle.speed-.91*1.16)<1e-3);
  assert(Math.abs(A.LIVE_TABLE.normal.density-.595*.8)<1e-3&&Math.abs(A.LIVE_TABLE.hell.density-.77*.8)<1e-3&&Math.abs(A.LIVE_TABLE.gentle.density-.385*.8)<1e-3);
  assert.equal(A.CAP,1120);assert.equal(A.COMPACT_CAP,656);
});

test('below the line nothing is swept or flushed by time; bullets leave only by flying off screen',()=>{
  for(const d of ['normal','hell']){const s=A.createRun({entranceAll:true,difficulty:d,stage:3,stages:1,seed:8});s.bombs=0;let exits=0;
    drive(s,560,60*60*4,c=>{c.bombs=0;if(c.stage==='wave'||c.stage==='intro')for(let i=0;i<c.n;i++)if(c.bexit[i])exits++;}); // 필살기·보스 격파 걷기는 예외라 일반몹 구간과 입장 대기만 센다
    assert.equal(s.lineSwept||0,0,d+' nothing swept while the hero stays below the line');
    assert.equal(exits,0,d+' no bullet was turned into a hitless exit bullet in waves or entrance waits');}
});

test('above the line only bullets that already went down past the hero are hurried out, keeping their hit boxes',()=>{
  const s=A.createRun({entranceAll:true,difficulty:'normal',stage:3,stages:1,seed:8});
  drive(s,560,600);s.player.y=100;s.player.x=180;const before=[];
  for(let i=0;i<s.n;i++)before.push({y:s.by[i],down:Math.sin(s.ba[i])});
  const n=A.lineSweep(s);let wrong=0;
  for(let i=0;i<s.n;i++)if(s.bacc[i]===300&&!s.bexit[i]&&(s.by[i]<A.AUTO_COLLECT_Y+A.LINE_SWEEP_GAP||Math.sin(s.ba[i])<.2))wrong++;
  assert(n>0,'some low bullets are hurried');assert.equal(wrong,0,'nothing above or rising is hurried');
  for(let i=0;i<s.n;i++)assert.equal(s.bexit[i],0,'hurried bullets keep their hit boxes');
});

test('staying above the line draws aimed shots, a beam and rising ink rocks, and costs more hits than staying low',()=>{
  const hits={};for(const ty of [560,100]){const s=A.createRun({entranceAll:true,difficulty:'normal',stage:3,stages:1,seed:5});s.bombs=0;let guard=0,beam=0,rock=0;
    drive(s,ty,60*60*3,c=>{if(c.events.includes('lineGuard'))guard++;});hits[ty]=s.hits;
    if(ty===100){assert(guard>=30,'guards '+guard);assert((s.risen||0)>0,'ink rocks rose');}
    else assert.equal(guard,0);}
  assert(hits[100]>hits[560],JSON.stringify(hits));
});

test('mid-boss defeat lets its bullets fly off before moving on; mid-boss HP is 1.3x on easy and normal',()=>{
  assert.equal(A.MID_HP_MORE.normal,1.3);assert.equal(A.MID_HP_MORE.gentle,1.3);assert.equal(A.MID_HP_MORE.hell,1);
  const mid=A.SEGMENTS.findIndex((g,i)=>{const nx=A.SEGMENTS[i+1];return g.kind==='card'&&g.mid&&!(nx&&nx.kind==='card'&&nx.actor===g.actor);});/* 중간보스의 마지막 패턴(쓰러짐 연출로 넘어가는 자리) */const s=A.createRun({entranceAll:true,difficulty:'normal',segment:mid,seed:4});
  for(let i=0;i<3000&&!(s.stage==='card'&&s.segTick>400);i++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});s.events.length=s.cancelled.length=s.pops.length=0;}
  assert.equal(s.stage,'card');const n0=s.n;assert(n0>0);s.boss.hp=0;
  let seenEndingBullets=false;
  for(let i=0;i<2400&&s.seg===mid&&s.stage==='card';i++){
    s.player.invulnerableUntil=s.tick+999;A.step(s,{});
    if(s.cardEnding&&s.n>0)seenEndingBullets=true;
    for(let j=0;j<s.n;j++)assert.equal(s.bexit[j],0,'bullets retain their damage and appearance');
    s.events.length=s.cancelled.length=s.pops.length=0;
  }
  assert(seenEndingBullets,'previous shots remain visible through the ending');
  assert(s.seg!==mid||s.stage!=='card','the encounter progresses');
  assert.equal(s.n,0,'the next encounter starts on an empty field');
});

test('the line guard beam stays at the hero height instead of being turned into a floor ladder',()=>{
  const s=A.createRun({entranceAll:true,difficulty:'normal',stage:3,stages:1,seed:8});let seen=0;
  drive(s,100,60*40,c=>{if(c.events.includes('lineGuard')&&c.lineN%3===2){const l=c.lasers[c.lasers.length-1];
    if(l&&l.angle===0){seen++;assert(Math.abs(l.y-Math.max(24,c.player.y))<1,'beam at '+l.y+' hero '+c.player.y);}}});
  assert(seen>0,'a guard beam was fired');
});

test('boss entrance preparation waits for leftover bullets, even when the app calls it directly',()=>{
  const s=A.createRun({entranceAll:true,difficulty:'normal',stage:3,stages:1,seed:8});drive(s,560,600);
  const card=A.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid);assert(s.n>0);
  s.stage='intro';s.seg=card;s.bossEntrance=null;const n0=s.n;
  assert.equal(A.prepareBossEntrance(s),false);assert.equal(s.n,n0,'bullets are not cleared while they drain');
  s.n=0;
  if((s.risers||[]).some(r=>!r.fade&&(r.dir==='down'||r.dir==='spit'))){
    assert.equal(A.prepareBossEntrance(s),false,'flying ink also holds the entrance');
    for(let t=0;t<1200&&!s.bossEntrance;t++)A.step(s,{});
    assert(s.bossEntrance,'entrance is scheduled once the flying ink is offscreen');
  }else assert.equal(A.prepareBossEntrance(s),true);
});
