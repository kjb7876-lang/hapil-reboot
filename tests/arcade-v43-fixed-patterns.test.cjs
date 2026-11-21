'use strict';
// 사용자 11-20 "모든 탄환은 일정패턴이 있었으면 좋겠어 무작위성 좀 줄여서":
// 실제 게임(entranceAll)의 탄막은 시드와 상관없이 같은 구간·같은 순간에 같은 자리·각도로 나온다(외울 수 있는 탄막).
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/arcade-v43.js');
function snap(s){const o=[];for(let i=0;i<s.n;i++)o.push(Math.round(s.bx[i]*10),Math.round(s.by[i]*10),Math.round(s.ba[i]*1000));return o.join(',')+'|'+s.lasers.map(l=>Math.round(l.x)+':'+Math.round(l.y)+':'+Math.round(l.angle*100)).join(',');}
function run(difficulty,stage,seed,ticks){
 const s=A.createRun({entranceAll:true,difficulty,stage,stages:1,seed,distort:false});s.frng=s.drng=12345;
 const out=[];
 for(let t=0;t<ticks&&s.stage!=='won';t++){const p=s.player,tx=180+Math.sin(t/170)*120,ty=560;
  A.step(s,{dx:Math.max(-4.2,Math.min(4.2,tx-p.x)),dy:Math.max(-4.2,Math.min(4.2,ty-p.y))});p.hp=99;
  if(t%30===0)out.push(s.stage+'#'+s.seg+'#'+snap(s));}
 return out;}
for(const difficulty of ['gentle','normal','hell'])test(`same bullets whatever the seed / ${difficulty}`,()=>{
 for(const stage of [0,8,20]){
  const a=run(difficulty,stage,3,60*60*2),b=run(difficulty,stage,987654,60*60*2);
  assert.equal(a.length,b.length);
  let same=0;for(let i=0;i<a.length;i++)if(a[i]===b[i])same++;
  assert.equal(same,a.length,`stage ${stage}: ${same}/${a.length} snapshots identical`);
  assert(a.some(x=>x.split('|')[0].split('#')[2].length>40),'bullets were actually fired');
 }
});
test('a ring fired on a fixed beat turns by a fixed step (no random offset)',()=>{
 const s=A.createRun({entranceAll:true,difficulty:'normal',stage:0,stages:1,seed:1});
 s.stage='card';s.segTick=104;A.patternClock&&0;
 const r=[];for(let k=0;k<4;k++){s.segTick=104*k;s.tick++;A.__patternClock(s);r.push(A.__rand(s));}
 const d=r.slice(1).map((v,i)=>((v-r[i])%1+1)%1);
 for(const x of d)assert(Math.abs(x-d[0])<1e-6,'equal rotation step: '+d.join(','));
});

test('live enemy emitters retain exactly 50% of wave shots and 89% of boss shots in every difficulty',()=>{
 const emitter={kind:'rotating',fireInterval:1/60,baseSpeed:84,bulletType:{formation:true}};
 for(const difficulty of ['gentle','normal','hell'])for(const compact of [false,true]){
  for(const [stage,expected] of [['wave',100],['card',178]]){
   const s=A.createRun({entranceAll:true,difficulty,compact,stage:0});
   s.stage=stage;
   for(let t=0;t<200;t++)A.emit(s,emitter,t,{x:120,y:140});
   assert.equal(s.n,expected,difficulty+' '+stage+' compact='+compact);
   assert.equal(s.bs[0],Math.fround(84*s.rules.speed),'retained shots keep their speed');
  }
 }
});
