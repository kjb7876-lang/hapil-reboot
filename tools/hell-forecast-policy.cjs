'use strict';
// QA-only curved input search. Current bullets and announced hazards are
// forecast; no live state, future emissions or RNG are changed.

const Weapon=require('../src/weapon-patterns.js');
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
function pointseg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,den=vx*vx+vy*vy,t=den?clamp(((px-ax)*vx+(py-ay)*vy)/den,0,1):0;return Math.hypot(px-ax-vx*t,py-ay-vy*t);}
module.exports=function(config={},base){
 const directions=base.directions,H=config.horizon||96,step=config.step||8,WIDTH=config.beam||20,cache=new WeakMap();
 function buildRows(w){
  const rows=Array.from({length:H/4},(_,i)=>({t:(i+1)*4,bins:new Map(),hazards:w.hazards.filter(h=>w.tick+(i+1)*4>=h.activeAt&&w.tick+(i+1)*4<h.fadeAt)}));
  function insert(row,b){const key=Math.floor(b.x/48)+Math.floor(b.y/48)*32;let a=row.bins.get(key);if(!a)row.bins.set(key,a=[]);a.push(b);}
  for(const b of w.bullets){
   if(b.weaponMotion){const p={...b};for(let t=1;t<=H;t++){Weapon.advance(p,1/60,360);p.age+=1/60;if(t%4===0&&p.age<b.ttl&&p.x>=-38&&p.x<=398&&p.y>=-38&&p.y<=678)insert(rows[t/4-1],{x:p.x,y:p.y,r:b.r+3,ux:0,uy:0});}}
   else if(b.curveRate || Number.isFinite(b.pauseFrom)){
    // Forecast only the already-present projectile using the same per-tick
    // public movement rules. This policy never edits live combat state.
    const p={...b};for(let t=1;t<=H;t++){
     const paused=Number.isFinite(p.pauseFrom)&&p.age>=p.pauseFrom&&p.age<p.pauseUntil;
     if(!paused){
      if(p.curveRate&&p.age<p.curveUntil){const speed=Math.hypot(p.vx,p.vy);p.angle+=p.curveRate/60;p.vx=Math.cos(p.angle)*speed;p.vy=Math.sin(p.angle)*speed;}
      if(p.acceleration&&p.age>=p.accelerateAt){const speed=Math.min(p.maxSpeed,Math.hypot(p.vx,p.vy)+p.acceleration/60);p.vx=Math.cos(p.angle)*speed;p.vy=Math.sin(p.angle)*speed;}
      p.x+=p.vx/60;p.y+=p.vy/60;
     }
     p.age+=1/60;
     if(t%4===0&&p.age<b.ttl&&p.x>=-38&&p.x<=398&&p.y>=-38&&p.y<=678){const l=p.halfLength||0;insert(rows[t/4-1],{x:p.x,y:p.y,r:p.r+3,ux:Math.cos(p.angle)*l,uy:Math.sin(p.angle)*l});}
    }
   }
   else {
    const speed=Math.hypot(b.vx,b.vy),ax=Math.cos(b.angle),ay=Math.sin(b.angle),ux=ax*(b.halfLength||0),uy=ay*(b.halfLength||0);
    for(const row of rows){
     if(b.age+row.t/60>=b.ttl)continue;let distance=speed*row.t/60;
     if(b.acceleration){const delay=Math.max(0,Math.ceil((b.accelerateAt-b.age)*60-1e-8)),n=Math.max(0,row.t-delay),inc=b.acceleration/60,free=Math.min(n,Math.max(0,Math.floor((b.maxSpeed-speed)/inc)));distance+=(inc*free*(free+1)/2+(n-free)*(b.maxSpeed-speed))/60;}
     const x=b.x+ax*distance,y=b.y+ay*distance;
     if(x>=-38&&x<=398&&y>=-38&&y<=678)insert(row,{x,y,r:b.r+3,ux,uy});
    }
   }
  }
  return rows;
 }
 function beamMove(w){
  const last=cache.get(w);if(last&&w.tick<last.until&&last.stage===w.stage&&last.phase===w.phase&&last.bossIndex===w.bossIndex)return last.a;
  const p=w.player,rows=buildRows(w),riskCaches=rows.map(()=>new Map());
  function risk(t,x,y){
   const ri=t/4-1,row=rows[ri],immune=w.tick+t<p.invulnerableUntil;
   const qx=Math.round(x/2),qy=Math.round(y/2),key=qx+qy*256;const cached=riskCaches[ri].get(key);if(cached!==undefined)return cached;
   let cost=0,xx=Math.floor(x/48),yy=Math.floor(y/48);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const group=row.bins.get(xx+dx+(yy+dy)*32);if(!group)continue;
    for(const b of group){const d=pointseg(x,y,b.x-b.ux,b.y-b.uy,b.x+b.ux,b.y+b.uy)-b.r;
     if(d<1.5)cost+=immune?0:1000000;else if(d<24)cost+=(24-d)*(24-d)*(immune?.02:1);
    }
   }
   for(const h of row.hazards){const d=pointseg(x,y,h.x1,h.y1,h.x2,h.y2)-h.width/2-p.r;if(d<1.5)cost+=immune?0:1500000;else if(d<20)cost+=(20-d)*(20-d)*(immune?.02:1);}
   cost*=1/(1+t*.012);riskCaches[ri].set(key,cost);return cost;
  }
  const targetX=config.route==='corridor'?(w.boss&&w.boss.hellOverlap?w.boss.hellOverlap.corridorX:180):config.route==='left'?32:180,targetY=config.y||575;
  let beam=[{x:p.x,y:p.y,score:0,first:0,prev:0}];
  for(let t=step;t<=H;t+=step){const next=[];
   for(const s of beam)for(let a=0;a<directions.length;a++){
    const d=directions[a],x=clamp(s.x+d[0]*step,16,344),y=clamp(s.y+d[1]*step,260,614),mx=clamp(s.x+d[0]*(step/2),16,344),my=clamp(s.y+d[1]*(step/2),260,614);
    let score=s.score+risk(t-step/2,mx,my)+risk(t,x,y);
    score+=((x-targetX)*(x-targetX)*(config.xWeight||.002)+(y-targetY)*(y-targetY)*(config.yWeight||.004))*.10;
    if(a!==s.prev&&t>step)score+=config.turn||1;if(a!==0)score+=.3;
    next.push({x,y,score,first:t===step?a:s.first,prev:a});
   }
   next.sort((a,b)=>a.score-b.score);const seen=new Set();beam=[];
   for(const s of next){const key=Math.round(s.x/8)+Math.round(s.y/8)*64;if(seen.has(key))continue;seen.add(key);beam.push(s);if(beam.length>=WIDTH)break;}
  }
  const chosen=beam[0].first;cache.set(w,{a:chosen,until:w.tick+(config.commit||4),stage:w.stage,phase:w.phase,bossIndex:w.bossIndex});return chosen;
 }
 return {id:'curved-beam-live-forecast-v14',directions,move:w=>w.difficulty==='hell'&&w.stage!=='waves'?beamMove(w):base.linearMove(w)};
};
