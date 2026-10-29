'use strict';
// Test-input policy only. It reads the live state and returns one legal
// direction; it never mutates run state, timers, health, damage, or RNG.
const clamp=(a,l,h)=>Math.min(h,Math.max(l,a));
function pointseg(px,py,ax,ay,bx,by){let x=bx-ax,y=by-ay,d=x*x+y*y,t=d?clamp(((px-ax)*x+(py-ay)*y)/d,0,1):0;return Math.hypot(px-(ax+x*t),py-(ay+y*t));}
const directions=[[0,0],[4,0],[-4,0],[0,4],[0,-4],[2.828,2.828],[2.828,-2.828],[-2.828,2.828],[-2.828,-2.828]];
function linearMove(w){let p=w.player,best=0,bscore=Infinity;for(let a=0;a<directions.length;a++){let [dx,dy]=directions[a],score=0;
 for(let t of [6,12,20,30,42,56,72]){let x=clamp(p.x+dx*t,16,344),y=clamp(p.y+dy*t,260,614),weight=1/(1+t*.015);
  for(const b of w.bullets){let bx=b.x+b.vx*t/60,by=b.y+b.vy*t/60,l=b.halfLength||0,ux=Math.cos(b.angle||0)*l,uy=Math.sin(b.angle||0)*l;
   let d=pointseg(x,y,bx-ux,by-uy,bx+ux,by+uy)-(b.r||3)-p.r;if(d<0)score+=12000*weight;else if(d<38)score+=(38-d)*(38-d)*weight;
  }
  for(const h of w.hazards){if(w.tick+t<h.activeAt||w.tick+t>=h.fadeAt)continue;let d=pointseg(x,y,h.x1,h.y1,h.x2,h.y2)-h.width/2-p.r;if(d<0)score+=16000*weight;else if(d<35)score+=(35-d)*(35-d)*weight;}
 }
 let x=clamp(p.x+dx*30,16,344),y=clamp(p.y+dy*30,260,614);score+=(x-180)*(x-180)*.006+(y-540)*(y-540)*.012;
 if(a===0)score-=3;if(score<bscore){bscore=score;best=a;}}
 return best;}
const forecast=require('./hell-forecast-policy.cjs')({route:'centre',y:580,beam:20,commit:4},{directions,linearMove});
module.exports=Object.freeze({id:forecast.id,directions,move:forecast.move,linearMove,predictiveMove:forecast.move});
