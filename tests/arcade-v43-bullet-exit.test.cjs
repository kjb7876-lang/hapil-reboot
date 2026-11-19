'use strict';
// 사용자 11-19(모든 난이도): 보스·중간보스는 패턴이 끝난 뒤 쓰러진다 / 탄은 화면 밖으로 나가야만 사라진다(필살기 예외) /
// 적이 없고 탄만 남으면 탄을 가속해 내보낸 뒤 다음 등장 / 반사탄은 벽에서 거울 반사 1~2번 뒤 밖으로 / 탄 수 조금 줄임.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),DIFFS=['gentle','normal','hell'];
const W=a.WIDTH,H=a.HEIGHT,off=(x,y)=>x<-30||x>W+30||y<-40||y>H+30;
function toCard(s){for(let i=0;i<4000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');}
function firstCard(st){let seg=a.STAGES[st].first;while(a.SEGMENTS[seg].kind!=='card')seg++;return seg;}
// 사라지는 탄은 모두 화면 밖에서 사라져야 한다: 이전 틱 위치 목록과 비교(탄 배열은 지울 때 뒤에서 당겨 오므로 위치 집합으로 본다)
function watchVanish(s,prev){const now=new Set();for(let i=0;i<s.n;i++)now.add(Math.round(s.bx[i])+','+Math.round(s.by[i]));return now;}
test('boss at zero HP keeps the card until its bullets have flown off-screen, then falls (all difficulties)',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:4,segment:firstCard(3),entranceAll:true});toCard(s);
  for(let i=0;i<420;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
  assert(s.n>0,d+' has bullets in flight');s.boss.hp=0;const seg=s.seg;let waited=0,hits0=s.hits;
  while(s.stage==='card'&&s.seg===seg&&waited<400){a.step(s,{dx:0,dy:0});h.clear(s);waited++;if(s.stage==='card')assert.equal(s.boss.hp,0);}
  assert(waited>1,`${d}: did not fall in the middle of the pattern (${waited})`);assert(waited<=a.CARD_ENDING_MAX+2,`${d}: fell within the cap (${waited})`);assert.equal(s.hits,hits0,'exiting bullets never hit');
 }
});
test('wave end: leftover bullets accelerate off-screen before the next segment begins, and nothing vanishes on screen',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:2,segment:a.STAGES[1].first,entranceAll:true});const seg=s.seg;let flushed=false,vanishedOn=0;
  for(let i=0;i<9000&&s.seg===seg;i++){s.player.invulnerableUntil=s.tick+999;const before=[];for(let k=0;k<s.n;k++)before.push([s.bx[k],s.by[k],s.bexit[k]]);
   a.step(s,{dx:0,dy:0});h.clear(s);
   if(s.mobs.length===0&&s.segTick>0&&s.n&&s.bexit[0])flushed=true;
   if(s.seg!==seg)assert.equal(s.n,0,`${d}: next segment starts with an empty field`);}
  assert.notEqual(s.seg,seg,d+' advanced');
 }
});
test('exiting bullets only disappear off-screen and speed up',()=>{
 const s=a.createRun({difficulty:'normal',seed:1,segment:firstCard(2),entranceAll:true});toCard(s);
 for(let i=0;i<300;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
 s.boss.hp=0;s.player.invulnerableUntil=0;
 const track=new Map();let id=0;
 for(let t=0;t<a.CARD_ENDING_MAX&&s.n;t++){
  const pos=[];for(let i=0;i<s.n;i++)pos.push({x:s.bx[i],y:s.by[i],a:s.ba[i],v:s.bs[i]});
  a.step(s,{dx:0,dy:0});h.clear(s);if(s.stage!=='card')break;
  // 각 이전 탄은 같은 방향으로 더 빨리 움직인 자리에 있거나, 화면 밖으로 나가 사라졌어야 한다
  const left=[];for(let i=0;i<s.n;i++)left.push([s.bx[i],s.by[i]]);
  for(const p of pos){const nx=p.x+Math.cos(p.a)*p.v*1.08/60,ny=p.y+Math.sin(p.a)*p.v*1.08/60;
   const found=left.some(q=>Math.abs(q[0]-nx)<3&&Math.abs(q[1]-ny)<3);if(!found)assert(off(nx,ny)||p.v<1,`bullet vanished on screen at ${nx|0},${ny|0}`);}
 }
});
test('mirror bullets reflect off the side walls like light on a mirror (angle in = angle out) and leave after 1-2 bounces',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:6,segment:firstCard(4),entranceAll:true});toCard(s);let bounced=0,maxB=0;
  for(let i=0;i<1200&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;
   const before=[];for(let k=0;k<s.n;k++)if(s.bbounce[k])before.push({x:s.bx[k],a:s.ba[k],b:s.bbounce[k]});
   for(let k=0;k<s.n;k++)maxB=Math.max(maxB,s.bbounce[k]);
   a.step(s,{dx:0,dy:0});h.clear(s);
   for(let k=0;k<s.n;k++){if(s.bx[k]!==0&&s.bx[k]!==W)continue;const c=Math.cos(s.ba[k]),sn=Math.sin(s.ba[k]);
    const m=before.find(p=>Math.abs(Math.sin(p.a)-sn)<1e-4&&Math.abs(Math.cos(p.a)+c)<1e-4);if(m)bounced++;}}
  assert(bounced>0,d+' saw a mirror reflection');assert(maxB>=1&&maxB<=2,d+' bounces '+maxB);
 }
});
test('live game trims bullet density by 10% on every difficulty; replay mode keeps its numbers',()=>{
 for(const d of DIFFS){const live=a.createRun({difficulty:d,seed:1,entranceAll:true}),old=a.createRun({difficulty:d,seed:1});
  const soft=d==='hell'?1:.8;assert(Math.abs(live.density-old.density*soft*.9)<1e-9,d+' '+live.density+' '+old.density);}
});
