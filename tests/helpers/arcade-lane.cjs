'use strict';
/* Seeded route audit, not a proof about every possible player history.
 * Start at the real spawn, expand at 4 px/tick (below normal movement), and
 * retain one continuous reachable set. All damaging layers count, including
 * rune/sigil segments, rising pictures and falling blocks. Terrain is solid.
 * A 4 px clearance margin prevents an 8 px grid edge jumping a thin beam.
 * The recorded attacks still depend on the controller's aiming/shot history;
 * this check detects blocked sampled fields, not a universal human-play guarantee. */
const CELL=8,X0=8,Y0=40,MARGIN=CELL/2+.01;
function check(arcade,options){
 const s=arcade.createRun(options),W=arcade.WIDTH,H=arcade.HEIGHT,cols=Math.floor((W-16)/CELL)+1,rows=Math.floor((H-14-Y0)/CELL)+1,size=cols*rows;
 const start=s.seg,seg=arcade.SEGMENTS[start];let reach=new Uint8Array(size),blocked=new Uint8Array(size),next=new Uint8Array(size),minOpen=size,ticks=0,emptyAt=-1,peak=0;
 const cellOf=(x,y)=>Math.max(0,Math.min(cols-1,Math.round((x-X0)/CELL)))+Math.max(0,Math.min(rows-1,Math.round((y-Y0)/CELL)))*cols;
 // The initial quantized position is within one two-tick movement of the
 // actual spawn. The first graph update uses these cells without expanding
 // again, so the initial two ticks cannot grant two movement budgets.
 for(let c=0;c<size;c++)if(Math.hypot(X0+c%cols*CELL-s.player.x,Y0+Math.floor(c/cols)*CELL-s.player.y)<=CELL)reach[c]=1;
 // laneSpeed: movement budget in px/tick (default 4). focus: hold psi while stepping.
 const vmax=options.laneSpeed||4,every=Math.max(2,Math.ceil(CELL/vmax));
 const limit=(seg.kind==='card'?seg.time*60:seg.duration+600)+400;
 function paintBox(x0,y0,x1,y1,test){
  const c0=Math.max(0,Math.floor((x0-X0)/CELL)),c1=Math.min(cols-1,Math.ceil((x1-X0)/CELL)),r0=Math.max(0,Math.floor((y0-Y0)/CELL)),r1=Math.min(rows-1,Math.ceil((y1-Y0)/CELL));
  for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++){const c=cx+cy*cols;if(!blocked[c]&&(!test||test(X0+cx*CELL,Y0+cy*CELL)))blocked[c]=1;}
 }
 function paintCircle(x,y,r){const r2=r*r;paintBox(x-r,y-r,x+r,y+r,(px,py)=>(px-x)**2+(py-y)**2<r2);}
 function paintLine(x0,y0,x1,y1,r){const dx=x1-x0,dy=y1-y0,L=dx*dx+dy*dy||1,r2=r*r;
  paintBox(Math.min(x0,x1)-r,Math.min(y0,y1)-r,Math.max(x0,x1)+r,Math.max(y0,y1)+r,(x,y)=>{const u=Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/L));return (x-x0-u*dx)**2+(y-y0-u*dy)**2<r2;});}
 for(let i=0;i<limit&&s.seg===start&&s.stage!=='won';i++){
  s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;
  // Select a nearby member of the continuous reachable set as the aiming
  // controller. Invulnerability prevents automatic defenses clearing hazards.
  const p=s.player,pc=cellOf(p.x,p.y),px=pc%cols,py=(pc/cols)|0;let best=pc,bestScore=-1e9;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(Math.abs(dx)+Math.abs(dy)>1)continue;const cx=px+dx,cy=py+dy;if(cx<0||cy<0||cx>=cols||cy>=rows)continue;const c=cx+cy*cols;if(!reach[c])continue;
   const x=X0+cx*CELL,y=Y0+cy*CELL;let near=1e9;for(let k=0;k<s.n;k++){const d=Math.hypot(s.bx[k]+Math.cos(s.ba[k])*s.bs[k]*.2-x,s.by[k]+Math.sin(s.ba[k])*s.bs[k]*.2-y);if(d<near)near=d;}
   const score=Math.min(near,60)-Math.abs(y-520)*.04-Math.abs(x-180)*.01;if(score>bestScore){bestScore=score;best=c;}}
  const tx=X0+(best%cols)*CELL,ty=Y0+((best/cols)|0)*CELL;
  arcade.step(s,{dx:Math.max(-vmax,Math.min(vmax,tx-p.x)),dy:Math.max(-vmax,Math.min(vmax,ty-p.y)),focus:!!options.focus});
  s.events.length=0;s.cancelled.length=0;s.pops.length=0;
  if(s.seg!==start)break;
  // Accumulate each tick, so a short lived or fast hazard cannot slip between
  // the two-tick graph updates.
  const pad=p.r+MARGIN;
  for(let k=0;k<s.n;k++){if(s.bage[k]<arcade.BLOOM_TICKS)continue;const r=arcade.bulletRadius(s,k)*s.rules.hitScale+pad,x=s.bx[k],y=s.by[k],v=s.bs[k]/60;
   if(v>4)paintLine(x-Math.cos(s.ba[k])*v,y-Math.sin(s.ba[k])*v,x,y,r);else paintCircle(x,y,r);}
  for(const l of s.lasers){if(l.age<l.warn||l.age>=l.warn+l.active)continue;paintLine(l.x,l.y,l.x+Math.cos(l.angle)*1000,l.y+Math.sin(l.angle)*1000,l.width*.5*arcade.BEAM_HIT+pad);}
  for(const f of s.figures){if(arcade.figurePhase?arcade.figurePhase(f,s.tick)!=='on':f.age<f.warn||f.age>=f.warn+f.active)continue;const r=f.width*.5*arcade.BEAM_HIT+pad;for(const g of arcade.figureSegments(f))paintLine(...g,r);}
  for(const r of s.risers||[]){if(r.age<arcade.RISER_WARN||r.fade)continue;for(const c of arcade.MOTIFS[r.kind].hit)paintCircle(r.x+c[0]*r.size,r.y+c[1]*r.size,c[2]*r.size+pad);}
  if(s.floor){
   for(let cx=0;cx<cols;cx++){const x=X0+cx*CELL,y=Math.min(arcade.floorTop(s,x-6),arcade.floorTop(s,x+6))-6;paintBox(x,y+.01,x,H);}
   for(const q of s.floor.pieces)for(const c of q.cells){const x=(q.col+c[0])*arcade.FLOOR_CELL+3,y=q.y-c[1]*arcade.FLOOR_CELL-3;paintBox(x-pad,y-arcade.FLOOR_CELL+6-pad,x+arcade.FLOOR_CELL-6+pad,y+pad);}
  }
  if((i+1)%every)continue;
  next.fill(0);let open=0;
  for(let c=0;c<size;c++){if(blocked[c])continue;const cx=c%cols,cy=(c/cols)|0;
   // Cardinal motion only: a diagonal step must consume two updates. This is
   // no faster than the 4 px/tick controller and cannot cut blocked corners.
   if(reach[c]||(ticks>0&&((cx&&reach[c-1])||(cx+1<cols&&reach[c+1])||(cy&&reach[c-cols])||(cy+1<rows&&reach[c+cols])))){next[c]=1;open++;}}
  const swap=reach;reach=next;next=swap;blocked.fill(0);ticks++;if(open<minOpen)minOpen=open;if(s.n>peak)peak=s.n;
  if(!open){emptyAt=s.tick;break;}
 }
 return {name:seg.name||('wave '+seg.stage),ticks,minOpen,emptyAt,peak,cells:size};
}
module.exports={check};
