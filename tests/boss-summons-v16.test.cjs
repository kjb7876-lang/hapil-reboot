'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
function setup(i,d='hell'){let w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,difficulty:d,seed:813,runId:'summon-qa'});w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=100000;return w}
test('all campaign bosses visibly summon at most two local encounter enemies that fire only after entering',()=>{
 for(let i=0;i<12;i++)for(let phase=0;phase<3;phase++){
  const w=setup(i);w.phase=phase;w.boss.phase=phase;let ids=[],firstShoot=Infinity,firstVisible=Infinity,max=0,heard=0,types=new Set();
  for(let t=0;t<850;t++){
   core.step(w,{});max=Math.max(max,w.enemies.length);
   for(const e of w.enemies){assert(e.summoned);if(!ids.includes(e.id))ids.push(e.id);if(e.age>=0)firstVisible=Math.min(firstVisible,w.tick);types.add(e.archetype)}
   if(w.bullets.some(b=>ids.includes(b.ownerId)))firstShoot=Math.min(firstShoot,w.tick);
   heard+=w.events.filter(e=>e.type==='summon').length;w.events.length=0;
  }
  assert.equal(ids.length,2,`boss ${i}/${phase}`);assert(max<=2);assert.equal(heard,1);assert(firstShoot-firstVisible>=120);assert(Number.isFinite(firstShoot));
  for(const a of types)assert((i<3?[['weaver'],['wraith'],['ember']][i]:i===3?['echo','vial']:['guard','denial']).includes(a));
 }
});
test('summons leave no actor at boss phase boundary and snapshot replay matches',()=>{
 let a=setup(11,'normal'),cp=core.checkpoint(a),b=core.restoreCheckpoint(cp);a.player.invulnerableUntil=100000;b.player.invulnerableUntil=100000;a.autoAttack=false;b.autoAttack=false;a.skillRotation=false;b.skillRotation=false;
 for(let t=0;t<500;t++){core.step(a,{});core.step(b,{});assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.bullets,b.bullets)}
 assert.equal(a.enemies.length,2);
 a.boss.hp=1;a.autoAttack=true;for(let t=0;t<700&&a.stage==='boss';t++)core.step(a,{});
 assert.notEqual(a.stage,'boss');assert.equal(a.enemies.length,0);
});

test('five original bosses have a real five-cycle no-hit focus route while summons fire',()=>{
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const dirs=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[1.414,1.414],[1.414,-1.414],[-1.414,1.414],[-1.414,-1.414]];
 function dist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,z=dx*dx+dy*dy,t=z?clamp(((px-ax)*dx+(py-ay)*dy)/z,0,1):0;return Math.hypot(px-ax-dx*t,py-ay-dy*t)}
 function choose(w){let best=0,score0=Infinity,p=w.player;for(let i=0;i<dirs.length;i++){const [dx,dy]=dirs[i];let score=0;
  for(const t of [6,12,20,30,42,56,72]){const x=clamp(p.x+dx*t,16,344),y=clamp(p.y+dy*t,260,614),weight=1/(1+t*.015);
   for(const b of w.bullets){const bx=b.x+b.vx*t/60,by=b.y+b.vy*t/60,l=b.halfLength||0,ux=Math.cos(b.angle||0)*l,uy=Math.sin(b.angle||0)*l,d=dist(x,y,bx-ux,by-uy,bx+ux,by+uy)-(b.r||3)-p.r;if(d<0)score+=12000*weight;else if(d<38)score+=(38-d)*(38-d)*weight}
   for(const h of w.hazards){if(w.tick+t<h.activeAt||w.tick+t>=h.fadeAt)continue;const d=dist(x,y,h.x1,h.y1,h.x2,h.y2)-h.width/2-p.r;if(d<0)score+=16000*weight;else if(d<35)score+=(35-d)*(35-d)*weight}
  }
  const x=clamp(p.x+dx*30,16,344),y=clamp(p.y+dy*30,260,614),goal=w.bossIndex===2?500:540;
  score+=(x-180)*(x-180)*.006+(y-goal)*(y-goal)*.012;if(i===0)score-=3;if(score<score0){score0=score;best=i}
 }return dirs[best]}
 for(let i=0;i<5;i++)for(const mode of ['normal','gentle']){
  let w=core.createRun({campaign:true,practiceBoss:true,bossIndex:i,difficulty:mode,seed:813,runId:'live-summons-focus'});w.phase=2;w.boss.phase=2;w.autoAttack=false;w.skillRotation=false;const hp=w.player.hp,owners=new Set();let shots=0;
  for(let t=0;t<2100;t++){for(const e of w.enemies)if(e.summoned)owners.add(e.id);const [dx,dy]=choose(w);core.step(w,{dx,dy,focus:true});if(w.bullets.some(b=>owners.has(b.ownerId)))shots++}
  assert.equal(w.stage,'boss',`${i}/${mode}`);assert.equal(w.player.hp,hp,`${i}/${mode}`);assert.equal(w.stats.hits,0);assert.equal(w.player.invulnerableUntil,0);assert(shots>0,`${i}/${mode} summons never fired`);
 }
});
