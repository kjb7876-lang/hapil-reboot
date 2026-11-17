'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();

function shot(s,x,y,patch={}){const i=s.sn++;s.sx[i]=x;s.sy[i]=y;s.svx[i]=patch.vx||0;s.shoming[i]=patch.homing||0;}
function orb(s,x,y,size,hp){const i=h.put(s,x,y,{bsize:size,bage:100});s.bhp[i]=hp===undefined?A.ORB_HP[size]:hp;return i;}
function step(s,input){A.step(s,input||{});}

test('hell contact never rolls evasion or spends a bomb, while the manual bomb works',()=>{
 const s=h.idle({difficulty:'hell',seed:2});s.power=7;s.exp=A.POWER_EXP[6];
 assert.equal(A.distortChance(s),0);
 const rng=s.drng;
 for(let k=0;k<100;k++){
  s.player.hp=3;s.player.invulnerableUntil=0;s.bombs=2;s.n=0;
  orb(s,s.player.x,s.player.y,1);step(s);
  assert.equal(s.player.hp,2);assert.equal(s.bombs,2);assert.equal(s.autoBombs,0);assert.equal(s.distorts,0);
  assert.equal(s.drng,rng,'hell does not advance the evasion RNG');h.clear(s);
 }
 s.player.invulnerableUntil=0;s.bombs=2;orb(s,s.player.x,s.player.y,1);step(s,{bomb:true});
 assert.equal(s.player.hp,2);assert.equal(s.bombs,1);assert.equal(s.bombsUsed,1);assert(s.events.includes('bomb'));
 assert(!s.lastBomb.auto);
});

test('normal retains contact-only automatic defense and gauge-funded bomb stock',()=>{
 const s=h.idle({difficulty:'normal',distort:false});s.bombs=0;s.gauge=A.GAUGE_FULL;
 orb(s,s.player.x+15,s.player.y,1);step(s);
 assert.equal(s.bombs,1,'full gauge provides a bomb');assert.equal(s.autoBombs,0,'graze is not a hit');
 assert.equal(s.distorts,0);const hp=s.player.hp;s.n=0;
 orb(s,s.player.x,s.player.y,1);step(s);
 assert.equal(s.player.hp,hp);assert.equal(s.bombs,0);assert.equal(s.autoBombs,1);assert.equal(s.lastBomb.auto,true);
 s.player.invulnerableUntil=0;s.n=0;orb(s,s.player.x,s.player.y,1);step(s);
 assert.equal(s.player.hp,hp-1,'without a full bomb the hit costs a life');
 assert.equal(A.distortChance(h.idle({difficulty:'normal'})),.07);
});

test('small, medium, large orbs and bubbles break under player fire, without triggering a split',()=>{
 for(const size of [0,1,2,4]){
  const s=h.idle({difficulty:'hell'});s.player.x=320;s.tick=0;
  const i=orb(s,80,300,size);s.bat[i]=101;s.bmode[i]=A.MODE_SPLIT;s.barg[i]=18;s.bs2[i]=70;
  // Multiple shots arrive in the same tick; one is not enough for the largest bubble.
  for(let k=0;k<Math.ceil(A.ORB_HP[size]);k++)shot(s,80,315);
  step(s);assert.equal(s.n,0,'size '+size+' is removed before split');assert.equal(s.orbsBroken,1);
  assert(s.events.includes('orbBreak'));assert(s.pops.length>=3);assert.equal(s.sn,0,'the hitting shots are consumed');
 }
});

test('large bubbles need repeated hits; small orbs between shot endpoints are hit by the swept path',()=>{
 const s=h.idle();s.player.x=320;orb(s,80,300,4);shot(s,80,315);step(s);
 assert.equal(s.n,1);assert.equal(s.bhp[0],2);assert.equal(s.orbsBroken,0);
 shot(s,80,315);step(s);assert.equal(s.bhp[0],1);
 shot(s,80,315);step(s);assert.equal(s.n,0);assert.equal(s.orbsBroken,1);
 const t=h.idle();t.player.x=320;orb(t,80,307.5,0);shot(t,80,315);step(t);
 assert.equal(t.n,0,'both endpoints are 7.5px away, but the shot crosses the small orb');
});

test('one shot only hits its first orb, and swap removal preserves the surviving bubble durability',()=>{
 const s=h.idle();s.player.x=320;orb(s,80,310,0);orb(s,80,290,4,2);shot(s,80,318);step(s);
 assert.equal(s.n,1);assert.equal(s.bsize[0],4);assert.equal(s.bhp[0],2);assert.equal(s.orbsBroken,1);
 shot(s,80,305);step(s);assert.equal(s.bhp[0],1);shot(s,80,305);step(s);assert.equal(s.n,0);
});

test('the earliest circle surface intercepts a shot even when a smaller orb has the nearer centre',()=>{
 const s=h.idle();s.player.x=320;orb(s,80,300,4);orb(s,80,310,0);shot(s,80,320);step(s);
 assert.equal(s.n,2,'the small orb behind the bubble shell is not broken');
 assert.equal(s.bhp[0],2,'bubble surface y318 is reached before small orb surface y317');
 assert.equal(s.bhp[1],A.ORB_HP[0]);assert.equal(s.orbsBroken,0);assert.equal(s.sn,0);
});

test('orb swept collision includes initial overlaps, tangent contact and the last endpoint',()=>{
 const overlap=h.idle();overlap.player.x=320;orb(overlap,80,320,4);orb(overlap,80,290,0);shot(overlap,80,315);step(overlap);
 assert.equal(overlap.bhp[0],2,'starting inside the bubble is an immediate contact');assert.equal(overlap.n,2);
 const tangent=h.idle();tangent.player.x=320;orb(tangent,80,307.5,0);shot(tangent,87,315);step(tangent);
 assert.equal(tangent.n,0,'distance to the tangent point equals the 7px shot contact radius');
 const endpoint=h.idle();endpoint.player.x=320;orb(endpoint,80,293,0);shot(endpoint,80,315);step(endpoint);
 assert.equal(endpoint.n,0,'the shot reaches the orb surface exactly at y300');
});

test('rice and prop projectiles remain intact under ordinary player fire',()=>{
 for(const size of [3,A.SHAPE_PROP]){const s=h.idle();s.player.x=320;orb(s,80,300,size);shot(s,80,315);step(s);assert.equal(s.n,1);assert.equal(s.orbsBroken,0);}
});

function hazards(s){
 const o={rng:s.rng,n:s.n,density:s.density,lasers:s.lasers,mobs:s.mobs,figures:s.figures,ripples:s.ripples,lane:s.lane};
 for(const k of ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin','bhp','bage','blife','bat','bsize','bcolor','bgrazed','bmode','bgen','bbounce'])o[k]=Array.from(s[k].subarray(0,s.n));
 return o;
}
test('every authored wave and boss pattern emits identical hazards for normal and hell',()=>{
 for(let idx=0;idx<A.SEGMENTS.length;idx++){
  const seg=A.SEGMENTS[idx],mk=difficulty=>{const s=A.createRun({difficulty,segment:idx,seed:idx+13});s.stage=seg.kind;s.boss.x=180;s.boss.y=160;s.boss.present=seg.kind==='card';s.boss.actor=seg.actor||'';return s;};
  const normal=mk('normal'),hell=mk('hell');
  const count=seg.kind==='card'?Math.min(960,Math.ceil(seg.time*60)):Math.min(960,seg.duration);
  for(let t=0;t<count;t++){
   for(const s of [normal,hell]){s.tick=t;s.segTick=t;s.stageTick=t;s.player.x=180+Math.sin(t*.02)*100;s.player.y=520;if(seg.kind==='card')seg.fire(s,t);else seg.script(s,t);}
   if(t%120===119||t===count-1){assert.deepEqual(hazards(normal),hazards(hell),'segment '+idx+' tick '+t);for(const s of [normal,hell]){s.n=0;s.lasers.length=0;s.mobs.length=0;s.figures.length=0;s.ripples.length=0;}}
  }
 }
});

test('normal and hell also share floor and riser trajectories in actual play',()=>{
 for(const compact of [false,true])for(const stage of [0,1,2,3,11,17,28,42,55]){
  const normal=A.createRun({difficulty:'normal',stage,seed:23,compact}),hell=A.createRun({difficulty:'hell',stage,seed:23,compact});
  for(let t=0;t<1800;t++){
   for(const s of [normal,hell]){s.player.invulnerableUntil=s.tick+999;step(s,{dx:Math.sin(t*.03)*2,dy:Math.cos(t*.015)*.5});h.clear(s);}
   if(t%120===119){assert.equal(normal.seg,hell.seg);assert.deepEqual(hazards(normal),hazards(hell));assert.deepEqual(normal.floor,hell.floor);assert.deepEqual(normal.risers,hell.risers);}
  }
 }
});
