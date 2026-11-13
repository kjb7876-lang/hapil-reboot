'use strict';
/* 안전 통로 검사기. 한 구간을 실제로 돌리면서 "영웅 판정점이 서 있을 수 있었던 칸"의 집합을 틱마다 추적한다.
 * 칸은 8픽셀 격자. 다음 틱에 갈 수 있는 칸 = 지금 갈 수 있는 칸에서 한 칸 이내(2틱에 8픽셀, 실제 이동 한도보다 느림).
 * 탄·광선이 닿는 칸은 뺀다. 이 집합이 한 번이라도 비면 그 순간 어디에 있었어도 맞는다는 뜻이므로 통로가 없는 패턴이다.
 * 조준탄은 실제 영웅 위치를 겨누므로, 영웅은 통로 안에서 위협과 가장 먼 칸을 따라 움직인다. */
const CELL=8,X0=8,Y0=40,MARGIN=2.5;
function check(arcade,options){
 const s=arcade.createRun(options),W=arcade.WIDTH,H=arcade.HEIGHT,cols=Math.floor((W-16)/CELL)+1,rows=Math.floor((H-14-Y0)/CELL)+1,size=cols*rows;
 const start=s.seg,seg=arcade.SEGMENTS[start];let reach=new Uint8Array(size),blocked=new Uint8Array(size),next=new Uint8Array(size),minOpen=size,ticks=0,emptyAt=-1,peak=0;
 const cellOf=(x,y)=>Math.max(0,Math.min(cols-1,Math.round((x-X0)/CELL)))+Math.max(0,Math.min(rows-1,Math.round((y-Y0)/CELL)))*cols;
 reach.fill(1);
 const limit=(seg.kind==='card'?seg.time*60:seg.duration+600)+400;
 for(let i=0;i<limit&&s.seg===start&&s.stage!=='won';i++){
  s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp; // 제한 시간 끝까지 본다
  // 영웅 이동: 통로 안에서, 지금 칸과 이웃 8칸 가운데 위협과 가장 먼 칸으로
  const p=s.player,pc=cellOf(p.x,p.y),px=pc%cols,py=(pc/cols)|0;let best=pc,bestScore=-1e9;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=px+dx,cy=py+dy;if(cx<0||cy<0||cx>=cols||cy>=rows)continue;const c=cx+cy*cols;if(!reach[c])continue;
   const x=X0+cx*CELL,y=Y0+cy*CELL;let near=1e9;for(let k=0;k<s.n;k++){const d=Math.hypot(s.bx[k]+Math.cos(s.ba[k])*s.bs[k]*.2-x,s.by[k]+Math.sin(s.ba[k])*s.bs[k]*.2-y);if(d<near)near=d;}
   const score=Math.min(near,60)-Math.abs(y-520)*.04-Math.abs(x-180)*.01;if(score>bestScore){bestScore=score;best=c;}}
  const tx=X0+(best%cols)*CELL,ty=Y0+((best/cols)|0)*CELL;
  arcade.step(s,{dx:Math.max(-4,Math.min(4,tx-p.x)),dy:Math.max(-4,Math.min(4,ty-p.y))});
  s.events.length=0;s.cancelled.length=0;s.pops.length=0;
  if(s.seg!==start)break;
  if(i%2)continue; // 2틱에 한 칸
  blocked.fill(0);const radiusOf=k=>arcade.bulletRadius(s,k)*s.rules.hitScale+p.r+MARGIN;
  for(let k=0;k<s.n;k++){if(s.bage[k]<arcade.BLOOM_TICKS-2)continue;const r=radiusOf(k),x=s.bx[k],y=s.by[k],c0=Math.floor((x-r-X0)/CELL),c1=Math.ceil((x+r-X0)/CELL),r0=Math.floor((y-r-Y0)/CELL),r1=Math.ceil((y+r-Y0)/CELL);
   for(let cy=Math.max(0,r0);cy<=Math.min(rows-1,r1);cy++)for(let cx=Math.max(0,c0);cx<=Math.min(cols-1,c1);cx++)if(Math.hypot(X0+cx*CELL-x,Y0+cy*CELL-y)<r)blocked[cx+cy*cols]=1;}
  for(const l of s.lasers){if(l.age<l.warn-2||l.age>=l.warn+l.active)continue;const cos=Math.cos(l.angle),sin=Math.sin(l.angle),r=l.width*.5*arcade.BEAM_HIT+p.r+MARGIN;
   for(let c=0;c<size;c++){const x=X0+(c%cols)*CELL-l.x,y=Y0+((c/cols)|0)*CELL-l.y,along=x*cos+y*sin,d=along<0?Math.hypot(x,y):Math.abs(x*sin-y*cos);if(d<r)blocked[c]=1;}}
  next.fill(0);let open=0;
  for(let c=0;c<size;c++){if(blocked[c])continue;const cx=c%cols,cy=(c/cols)|0;let ok=false;
   for(let dy=-1;dy<=1&&!ok;dy++)for(let dx=-1;dx<=1&&!ok;dx++){const nx=cx+dx,ny=cy+dy;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&reach[nx+ny*cols])ok=true;}
   if(ok){next[c]=1;open++;}}
  const swap=reach;reach=next;next=swap;ticks++;if(open<minOpen)minOpen=open;if(s.n>peak)peak=s.n;
  if(!open){emptyAt=s.tick;break;}
 }
 return {name:seg.name||('wave '+seg.stage),ticks,minOpen,emptyAt,peak,cells:size};
}
module.exports={check};
