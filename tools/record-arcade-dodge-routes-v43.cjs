#!/usr/bin/env node
'use strict';
/* Regenerate only the two root-pattern recordings after projectile rules change.
 * This QA controller forecasts present hazards and rejects candidate directions
 * that hit during one exact engine step on a structured clone. It may inspect
 * future engine state; this is a reproducible route search, not a human pilot.
 * Live runs use legal <=4.01 px inputs, no injected immunity, no bombs and no
 * passive evasion. As in the replay test, boss HP is restored each card tick so
 * the whole authored attack duration remains covered. The chain recording is
 * retained unchanged and all three cases are replayed on Normal and Hell.
 * Run: node tools/record-arcade-dodge-routes-v43.cjs [--write]
 * Without --write this validates newly generated routes without changing files.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),a=require('../src/arcade-v43.js');
const fixture=path.join(root,'tests/fixtures/arcade-v43-dodge-routes.json'),source=fs.readFileSync(fixture,'utf8'),data=JSON.parse(source),D=data.directions;
const enginePath=path.join(root,'src/arcade-v43.js'),digest=()=>crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex'),before=digest();
function dist(x,y,x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,L=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/L));return Math.hypot(x-x0-u*dx,y-y0-u*dy);}
function control(s,cfg={}){
 const p=s.player,figs=s.figures.filter(f=>f.age+30>=f.warn&&f.age<f.warn+f.active).flatMap(f=>a.figureSegments(f).map(g=>({g,r:f.width*a.BEAM_HIT*.5+p.r,t:Math.max(0,f.warn-f.age),f})));
 let best=D[0],min=Infinity,ranks=[];
 for(const d of D){let score=0;for(const t of (cfg.horizon||[2,6,12])){const x=Math.max(8,Math.min(352,p.x+d[0]*t)),y=Math.max(40,Math.min(626,p.y+d[1]*t));if(x!==p.x+d[0]*t||y!==p.y+d[1]*t)score+=3;
   let nearest=100;const weight=t===2?5:t===6?2:1;
   for(let i=0;i<s.n;i++){if(s.bage[i]+t<a.BLOOM_TICKS)continue;const bx=s.bx[i]+Math.cos(s.ba[i])*s.bs[i]/60*t,by=s.by[i]+Math.sin(s.ba[i])*s.bs[i]/60*t,r=a.bulletRadius(s,i)*s.rules.hitScale+p.r+(cfg.margin||2),di=Math.hypot(x-bx,y-by)-r;nearest=Math.min(nearest,di);if(di<0)score+=weight*(400-di*20);else score+=weight*2/(di+2);}
   for(const l of s.lasers){if(l.age+t<l.warn||l.age+t>=l.warn+l.active)continue;const an=l.angle+(l.spin||0)/60*t,di=dist(x,y,l.x,l.y,l.x+Math.cos(an)*1000,l.y+Math.sin(an)*1000)-l.width*a.BEAM_HIT*.5-p.r-3;nearest=Math.min(nearest,di);if(di<0)score+=weight*(700-di*20);else score+=weight*10/(di+2);}
   for(const f of figs){if(t<f.t||a.figurePhase&&a.figurePhase({...f.f,age:f.f.age+t},s.tick+t)!=='on')continue;const di=dist(x,y,...f.g)-f.r-3;nearest=Math.min(nearest,di);if(di<0)score+=weight*(600-di*20);}
   for(const r of s.risers||[]){if(r.age+t<a.RISER_WARN||r.fade)continue;for(const c of a.MOTIFS[r.kind].hit){const di=Math.hypot(x-r.x-c[0]*r.size,y-(Math.max(r.apex,r.y-r.vy*t)+c[1]*r.size))-c[2]*r.size-p.r-3;nearest=Math.min(nearest,di);if(di<0)score+=weight*(600-di*20);}}
   const fy=Math.min(a.floorTop(s,x-6),a.floorTop(s,x+6))-6;if(y>fy)score+=weight*100;
   for(const q of s.floor.pieces)for(const c of q.cells){const x0=(q.col+c[0])*30+3,y1=q.y+3.7*t-c[1]*30-3;if(x>x0-p.r-3&&x<x0+24+p.r+3&&y>y1-24-p.r-3&&y<y1+p.r+3)score+=weight*700;}
   score-=Math.min(30,nearest)*weight*.5;score+=(Math.abs(y-(cfg.y||510))*(cfg.yWeight||.01)+Math.abs(x-(cfg.x||180))*(cfg.xWeight||.003))*weight;
  }ranks.push({d,score});if(score<min){min=score;best=d;}}
 return cfg.ranks?ranks.sort((a,b)=>a.score-b.score):{dx:best[0],dy:best[1]};
}

function clean(s){s.events.length=s.cancelled.length=s.pops.length=0;}
function safe(s){return s.hits===0&&s.autoBombs===0&&s.distorts===0&&s.bombsUsed===0;}
function runFor(route,difficulty){const s=a.createRun({difficulty,compact:route.compact,seed:route.seed,segment:route.segment,distort:false});s.bombs=0;return s;}
function record(route){
 const s=runFor(route,'hell'),moves=[];let alternatives=0;
 while(s.seg===route.segment&&s.tick<route.ticks){
  if(s.stage==='card')s.boss.hp=s.boss.maxHp;
  const ranked=control(s,{y:430,yWeight:.01,ranks:true});let direction=-1;
  for(let i=0;i<ranked.length;i++){
   const d=ranked[i].d,candidate=structuredClone(s);a.step(candidate,{dx:d[0],dy:d[1]});
   if(safe(candidate)){direction=D.findIndex(v=>v[0]===d[0]&&v[1]===d[1]);if(i)alternatives++;break;}
  }
  assert(direction>=0,`${route.name}${route.compact?' mobile':''}: no one-tick safe direction at ${s.tick}`);
  const d=D[direction];assert(Math.hypot(...d)<=4.01);a.step(s,{dx:d[0],dy:d[1]});assert(safe(s),'live execution differs from candidate');clean(s);moves.push(direction);
 }
 assert.notEqual(s.seg,route.segment,'the full authored attack must end');assert.equal(moves.length,route.ticks,'preserve recorded duration');
 const inputs=[];for(const move of moves){const last=inputs.at(-1);if(last&&last[0]===move)last[1]++;else inputs.push([move,1]);}
 console.log(`${route.name}${route.compact?' mobile':' desktop'}: ${moves.length} legal ticks, ${alternatives} exact-step alternatives`);
 return {...route,inputs};
}
function verify(route,difficulty){
 const s=runFor(route,difficulty);assert.equal(a.SEGMENTS[route.segment].name,route.name);let ticks=0;
 for(const [direction,count] of route.inputs){const [dx,dy]=D[direction];assert(Math.hypot(dx,dy)<=4.01);for(let i=0;i<count;i++){
  if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx,dy});ticks++;assert(safe(s),`${route.name} ${difficulty} ${route.compact?'mobile':'desktop'} hit at ${s.tick}`);clean(s);
 }}
 assert.equal(ticks,route.ticks);assert.notEqual(s.seg,route.segment);
}
const updated=data.routes.map(route=>route.segment===6?record(route):route);
for(const route of updated)for(const difficulty of ['normal','hell'])verify(route,difficulty);
assert.equal(digest(),before,'engine changed during generation; rerun before writing');
if(process.argv.includes('--write')){
 let output=source;for(let i=0;i<updated.length;i++){const prior=JSON.stringify(data.routes[i].inputs),next=JSON.stringify(updated[i].inputs);if(prior===next)continue;assert(output.includes(prior),'fixture input formatting changed');output=output.replace(prior,next);}
 fs.writeFileSync(fixture,output);
}
console.log(`Verified ${updated.length*2} full-duration replays without hits, automatic defense or bombs${process.argv.includes('--write')?'; fixture updated':'; no files changed'}.`);
