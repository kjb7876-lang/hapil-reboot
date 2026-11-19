'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
// docs/v43/danmaku-rules.md 규칙 6(조준은 움직일 이유)·9·16(빈 화면 금지). 사용자 11-19 "모든 패턴 모든공격에는 의미와 당위성"
const live=s=>s.n>0||s.lasers.length||s.figures.length||(s.risers&&s.risers.length)||s.mobs.length||(s.floor&&s.floor.pieces&&s.floor.pieces.length)||(s.floor&&s.floor.goal&&s.floor.goal.some(v=>v>0));
// 전수조사와 같은 회피 봇(탄을 피해 아래쪽에 머문다): 가만히 선 영웅과 달리 보스를 덜 맞혀 카드가 길어지고, 보스가 내려와 쉬는 구간이 드러난다
function dodge(s){const p=s.player;let best=null,bs=1e18;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=Math.max(8,Math.min(352,p.x+dx*12)),ny=Math.max(300,Math.min(630,p.y+dy*12));let v=0;
 for(let i=0;i<s.n;i++){if(s.bexit[i])continue;for(const t of [4,10]){const bx=s.bx[i]+Math.cos(s.ba[i])*s.bs[i]*t/60,by=s.by[i]+Math.sin(s.ba[i])*s.bs[i]*t/60;v+=1/((bx-nx)**2+(by-ny)**2+20);}}
 for(const l of s.lasers){if(l.age<l.warn-30)continue;const c=Math.cos(l.angle),sn=Math.sin(l.angle),px=nx-l.x,py=ny-l.y;if(Math.abs(px*sn-py*c)<l.width*.5+14)v+=.05;}
 v+=((nx-180)**2)*1e-7+((ny-560)**2)*1e-7;if(v<bs){bs=v;best={dx,dy};}}return {dx:best.dx*4,dy:best.dy*4};}
function play(d,seg,fn,bot){const s=a.createRun({segment:seg,seed:31+seg,difficulty:d,entranceAll:true,rhythm:true,compact:true});let t0=-1;
  for(let k=0;k<7000;k++){a.step(s,bot?bot(s):{});s.player.hp=9;if(s.stage==='card'&&t0<0)t0=k;if(t0<0)continue;if(s.stage!=='card'||s.seg!==seg)break;fn(s,k-t0);}return s;}
// 전수조사에서 보스가 내려와 쉬는 동안 화면이 9초까지 비던 카드들
const EMPTY=[40,58,79,96,103,116,125];
test('normal: while the boss rests low the screen never stays empty for 3 seconds',()=>{
  for(const seg of EMPTY){let q=0,max=0;const s=play('normal',seg,s=>{q=live(s)?0:q+1;if(q>max)max=q;},dodge);assert(max<=180,'segment '+seg+' empty for '+max+' ticks');assert(s.calmSoftN>0||max<=180);}
});
test('easy: an idle hero is nudged by a slow odd three-way aimed shot',()=>{
  const seg=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.actor==='violet');let first=-1;
  const s=play('gentle',seg,(s,t)=>{if(first<0&&s.nudges)first=t;});
  assert(s.nudges>0,'the nudge fired');assert(first>0&&first<600,'within ten seconds ('+first+')');
  const n=a.createRun({segment:seg,seed:9,difficulty:'normal',entranceAll:true,rhythm:true,compact:true});for(let k=0;k<1500;k++){a.step(n,{});n.player.hp=9;}assert(!n.nudges,'normal and hell already make you move');
});
