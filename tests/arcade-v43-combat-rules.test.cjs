'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();

function shot(s,x,y,patch={}){const i=s.sn++;s.sx[i]=x;s.sy[i]=y;s.svx[i]=patch.vx||0;s.shoming[i]=patch.homing||0;}
function orb(s,x,y,type,hp,breakable){const size=typeof type==='string'?A.SHAPE_PROP:type,color=typeof type==='string'?A.PROPS.findIndex(p=>p.key===type):0;const i=h.put(s,x,y,{bsize:size,bcolor:color,bage:100});s.bbreakable[i]=A.bulletRenderSpan(size,color)>=A.BULLET_BREAK_MIN_SPAN&&breakable!==false?1:0;s.bhp[i]=s.bbreakable[i]?(hp===undefined?A.ORB_HP[size]:hp):0;s.bfragment[i]=0;s.bgrace[i]=A.BLOOM_TICKS;return i;}
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

test('only one in three reference-sized body spawns is breakable, without using pattern RNG',()=>{
 const types=[...Array.from({length:5},(_,size)=>({size,color:0})),...A.PROPS.map((p,color)=>({size:A.SHAPE_PROP,color}))];
 assert.equal(A.BULLET_BREAK_MIN_SPAN,56);assert.equal(A.propRenderSpan(A.PROPS.find(p=>p.key==='gear')),56);
 assert.equal(A.propRenderSpan(A.PROPS.find(p=>p.key==='p3_core')),62);
 for(const difficulty of ['normal','hell'])for(const compact of [false,true])for(const bulletType of types){
  const s=h.idle({difficulty,seed:19,compact});s.density=1;const rng=s.rng;
  A.emit(s,{kind:'radial',bulletsPerWave:9,baseSpeed:60,bulletType},0,{x:180,y:200});
  assert.equal(s.n,9);assert.equal(s.rng,rng);
  const eligible=A.bulletRenderSpan(bulletType.size,bulletType.color)>=56;
  const expected=eligible?[1,0,0,1,0,0,1,0,0]:Array(9).fill(0);
  assert.deepEqual(Array.from(s.bbreakable.slice(0,s.n)),expected,JSON.stringify({bulletType,difficulty,compact}));
  for(let i=0;i<s.n;i++){assert.equal(A.isBulletBreakable(s,i),!!expected[i]);assert.equal(s.bhp[i],expected[i]?A.ORB_HP[bulletType.size]:0);}
 }
});

test('small body types cannot be opted into destruction or enlarged into eligibility by mobile mode',()=>{
 for(const compact of [false,true])for(const type of [0,1,2,3,4,'tissue','money','feather','hexagram','skull','p1_shard']){
  const s=h.idle({compact});s.density=1;const size=typeof type==='string'?A.SHAPE_PROP:type,color=typeof type==='string'?A.PROPS.findIndex(p=>p.key===type):0;
  A.emit(s,{kind:'radial',bulletsPerWave:1,baseSpeed:0,bulletType:{size,color,breakable:true}},0,{x:80,y:300});
  assert.equal(s.n,1);assert.equal(s.bbreakable[0],0);assert.equal(s.bhp[0],0);assert.equal(s.orbSerial,0);
  s.bbreakable[0]=1;assert.equal(A.isBulletBreakable(s,0),false,'size gate also protects stale flags');
 }
});

test('shooting a selected large body leaves three small remnants and all unrelated bullets intact',()=>{
 for(const type of ['gear','p3_core','spire','p8_shield']){
  const s=h.idle({difficulty:'hell'});s.player.x=320;
  const parent=orb(s,80,300,type);s.bat[parent]=101;s.bmode[parent]=A.MODE_SPLIT;s.barg[parent]=18;s.bs2[parent]=70;
  orb(s,200,400,0);orb(s,240,450,1);orb(s,280,320,4,undefined,false);
  for(let k=0;k<Math.ceil(A.ORB_HP[A.SHAPE_PROP]);k++)shot(s,80,315);
  step(s);assert.equal(s.n,6,'three remnants plus three unrelated bullets');assert.equal(s.orbsBroken,1);assert.equal(s.orbFragments,3);
  assert(s.events.includes('orbBreak'));assert(s.pops.length>=3);assert.equal(s.sn,0);
  assert(Array.from(s.bx.slice(0,s.n)).includes(200));assert(Array.from(s.bx.slice(0,s.n)).includes(240));
  assert(Array.from(s.bx.slice(0,s.n)).includes(280),'the unbreakable large bubble also remains');
  const children=Array.from({length:s.n},(_,i)=>i).filter(i=>s.bfragment[i]);assert.equal(children.length,3);
  for(const i of children){assert.equal(s.bsize[i],0);assert.equal(s.bbreakable[i],0);assert.equal(s.bhp[i],0);assert.equal(s.bmode[i],0);assert.equal(s.bgen[i],0);assert.equal(s.bgrace[i],A.ORB_FRAGMENT_GRACE);assert(A.PALETTE.includes(s.bcolor[i]),'prop index becomes a visible palette color');}
  for(let t=0;t<20;t++){step(s);h.clear(s);}assert.equal(s.orbFragments,3,'no inherited 18-bullet split or recursive fragment chain');
 }
});

test('ordinary small/medium bullets, unmarked large orbs, rice and props survive player fire',()=>{
 for(const size of [0,1,2,3,4,A.SHAPE_PROP]){
  const s=h.idle();s.player.x=320;orb(s,80,300,size,undefined,false);
  for(let k=0;k<8;k++)shot(s,80,315);step(s);
  assert.equal(s.n,1,'size '+size);assert.equal(s.orbsBroken,0);assert.equal(s.orbFragments,0);assert.equal(s.sn,8,'enemy bullets are not a global shield or wipe');
 }
});

test('selected large bodies need repeated hits and preserve another body durability on swap removal',()=>{
 const s=h.idle();s.player.x=320;orb(s,80,300,'p3_core');orb(s,220,300,'gear',2);
 shot(s,80,315);step(s);assert.equal(s.bhp[0],2);shot(s,80,315);step(s);assert.equal(s.bhp[0],1);
 shot(s,80,315);step(s);assert.equal(s.orbsBroken,1);assert.equal(s.orbFragments,3);
 assert.equal(s.bx[0],220);assert.equal(s.bsize[0],A.SHAPE_PROP);assert.equal(s.bhp[0],2);assert.equal(s.bbreakable[0],1);
 shot(s,220,315);step(s);assert.equal(s.bhp[0],1);shot(s,220,315);step(s);assert.equal(s.orbsBroken,2);assert.equal(s.orbFragments,6);
});

test('the earliest body surface intercepts a shot even when another body has the nearer centre',()=>{
 const s=h.idle();s.player.x=320;orb(s,80,300,'spire');orb(s,80,305,'sword-violet');shot(s,80,330);step(s);
 assert.equal(s.n,2);assert.equal(s.bhp[0],2,'spire surface y321 is reached before sword core surface y320');
 assert.equal(s.bhp[1],3);assert.equal(s.orbsBroken,0);assert.equal(s.sn,0);
});

test('large-body swept collision includes initial overlaps, tangent contact and the last endpoint',()=>{
 const overlap=h.idle();overlap.player.x=320;orb(overlap,80,320,'spire');orb(overlap,80,290,'sword-violet');shot(overlap,80,315);step(overlap);
 assert.equal(overlap.bhp[0],2);assert.equal(overlap.n,2);
 const tangent=h.idle();tangent.player.x=320;orb(tangent,80,307.5,'p3_core',1);shot(tangent,97,315);step(tangent);
 assert.equal(tangent.orbsBroken,1,'a tangent reaches the 17px shot contact radius');assert.equal(tangent.orbFragments,3);
 const endpoint=h.idle();endpoint.player.x=320;orb(endpoint,80,283,'p3_core',1);shot(endpoint,80,315);step(endpoint);
 assert.equal(endpoint.orbsBroken,1,'the shot reaches the body surface exactly at y300');assert.equal(endpoint.orbFragments,3);
});

test('remnants spread away with wide gaps, are initially harmless, then become ordinary non-breakable bullets',()=>{
 const s=h.idle({difficulty:'hell'});s.player.x=180;s.player.y=500;s.bombs=0;const hp=s.player.hp;
 orb(s,180,500,'p3_core',1);shot(s,180,515);step(s);assert.equal(s.player.hp,hp,'point-blank break does not hit immediately');
 assert.equal(s.n,3);assert.equal(s.orbFragments,3);
 const angles=Array.from(s.ba.slice(0,3)).sort((a,b)=>a-b);assert(Math.abs(angles[1]-angles[0]-.9)<1e-6);assert(Math.abs(angles[2]-angles[1]-.9)<1e-6);
 // Place one remnant on the hitbox throughout its grace window to exercise the real collision gate.
 for(let i=1;i<3;i++){s.bx[i]=40;s.by[i]=100;s.bs[i]=0;}
 s.bs[0]=0;s.bx[0]=s.player.x;s.by[0]=s.player.y;
 while(s.bage[0]<A.ORB_FRAGMENT_GRACE-1){step(s);assert.equal(s.player.hp,hp);}
 step(s);assert.equal(s.player.hp,hp-1,'the remnant becomes dangerous after the promised grace');
 const t=h.idle({difficulty:'hell'});t.player.x=180;t.player.y=500;t.bombs=0;orb(t,180,490,'p3_core',1);shot(t,180,505);step(t);
 for(let i=0;i<t.n;i++)assert(Math.sin(t.ba[i])<0,'all remnants move away from the player below the break');
 const count=t.orbFragments;for(let k=0;k<8;k++){for(let i=0;i<t.n;i++)shot(t,t.bx[i],t.by[i]+15);step(t);}assert.equal(t.orbFragments,count);assert.equal(t.orbsBroken,1,'shooting remnants cannot form a chain');
});

test('bomb cancellation never spawns remnants or recursive fragment chains',()=>{
 const s=h.idle({difficulty:'hell'});s.player.x=320;orb(s,80,300,'gear');orb(s,200,350,'p3_core');orb(s,250,400,0);
 step(s,{bomb:true});assert.equal(s.n,0);assert.equal(s.orbsBroken,0);assert.equal(s.orbFragments,0);
 const t=h.idle({difficulty:'hell'});t.player.x=320;orb(t,80,300,'p3_core',1);shot(t,80,315);step(t);assert.equal(t.orbFragments,3);
 step(t,{bomb:true});assert.equal(t.n,0);assert.equal(t.orbsBroken,1);assert.equal(t.orbFragments,3,'cancelling remnants does not create more');
});

test('fragment creation obeys the bullet cap and preserves at least the freed parent slot',()=>{
 const s=h.idle({difficulty:'hell'});s.player.x=320;orb(s,80,300,'p3_core',1);
 while(s.n<s.cap)orb(s,20,100,0);
 shot(s,80,315);step(s);
 assert.equal(s.n,s.cap);assert.equal(s.orbsBroken,1);assert.equal(s.orbFragments,1);assert.equal(s.dropped,0);
});

function hazards(s){
 const o={rng:s.rng,n:s.n,orbSerial:s.orbSerial,orbFragments:s.orbFragments,density:s.density,lasers:s.lasers,mobs:s.mobs,figures:s.figures,ripples:s.ripples,lane:s.lane};
 for(const k of ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin','bhp','bage','blife','bat','bsize','bcolor','bgrazed','bmode','bgen','bbounce','bbreakable','bfragment','bgrace'])o[k]=Array.from(s[k].subarray(0,s.n));
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
  const normal=A.createRun({difficulty:'normal',stage,seed:23,compact,pacing:false}),hell=A.createRun({difficulty:'hell',stage,seed:23,compact,pacing:false});
  for(let t=0;t<1800;t++){
   for(const s of [normal,hell]){s.player.invulnerableUntil=s.tick+999;step(s,{dx:Math.sin(t*.03)*2,dy:Math.cos(t*.015)*.5});h.clear(s);s.risers.length=0;} // 먹 그림은 난이도마다 들어오는 쪽이 달라(사용자 11-17) 이 시험에서는 비운다
   if(t%120===119){assert.equal(normal.seg,hell.seg);assert.deepEqual(hazards(normal),hazards(hell));assert.deepEqual(normal.floor,hell.floor);}
  }
 }
});
