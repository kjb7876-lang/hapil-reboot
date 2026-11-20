'use strict';
// 회피 측정(11-20): 레이저 '화면 덮기'의 틈은 영웅이 반응(0.25초) 뒤 키보드 속도로 닿을 수 있는 거리 안에 있고,
// 덮기가 켜지는 순간 틈 위에 다른 광선(앞 마디의 눌린 건반 등)이 켜져 있지 않다.
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/arcade-v43.js');
const KEY=4.2,REACT=15;
for(const difficulty of ['normal','hell'])test(`cover gap is reachable and clean / ${difficulty}`,()=>{
 let covers=0;
 for(const stage of [8,17,31]){
  const s=A.createRun({entranceAll:true,difficulty,stage,stages:1,seed:5+stage,distort:false});s.bombs=0;const seen=new WeakSet(),open=[];
  for(let t=0;t<60*60*5&&s.stage!=='won';t++){
   const p=s.player,tx=180+Math.sin(t/200)*150,ty=560+Math.sin(t/131)*50;
   A.step(s,{dx:Math.max(-KEY,Math.min(KEY,tx-p.x)),dy:Math.max(-KEY,Math.min(KEY,ty-p.y))});p.hp=99;s.events.length=s.cancelled.length=s.pops.length=0;
   const fresh=s.lasers.filter(l=>l.solid&&!l.role&&!seen.has(l));fresh.forEach(l=>seen.add(l));
   if(fresh.length>=4){covers++;const vert=Math.abs(Math.sin(fresh[0].angle))>.5,top=vert?0:120,end=vert?A.WIDTH:A.HEIGHT;
    const iv=fresh.map(l=>vert?[l.x-l.width/2,l.x+l.width/2]:[l.y-l.width/2,l.y+l.width/2]).sort((a,b)=>a[0]-b[0]);
    let prev=top,gap=null;for(const [a,b] of iv){if(a-prev>8)gap=[prev,a];prev=Math.max(prev,b);}if(end-prev>8)gap=[prev,end];
    assert(gap,'cover leaves one gap');const pos=vert?p.x:p.y,c=Math.min(Math.max(pos,gap[0]+p.r+1),gap[1]-p.r-1);
    assert(REACT+Math.abs(c-pos)/KEY<=fresh[0].warn,`gap reachable: need ${(REACT+Math.abs(c-pos)/KEY).toFixed(0)} > warn ${fresh[0].warn}`);
    open.push({vert,gap,at:s.tick+fresh[0].warn-fresh[0].age});}
   for(let i=open.length-1;i>=0;i--)if(s.tick===open[i].at){const o=open.splice(i,1)[0];
    for(const l of s.lasers){if(l.solid||l.age<l.warn||l.age>=l.warn+l.active)continue;const par=o.vert?Math.abs(Math.abs(l.angle)-Math.PI/2)<.05:Math.abs(Math.sin(l.angle))<.05;if(!par)continue;
     const c=o.vert?l.x:l.y;assert(!(c+l.width/2>o.gap[0]&&c-l.width/2<o.gap[1]),'no live parallel beam inside the cover gap');}}
  }
 }
 assert(covers>=2,`covers seen: ${covers}`);
});
