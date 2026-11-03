'use strict';
// The public-world matrix uses ordinary HP and legal directional inputs.
// Small internal fixtures isolate geometry, not natural clears or device FPS.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),BASE='f616a344cfdc03af2bbc7cf98a17e2126123a4c0';
const MODULES=['weapon-patterns','boss-patterns-v27','boss-lasers-v28','boss-flow-v29','core'];
function load(ref,internal=false){
 const box={};for(const name of MODULES){let source=ref?cp.execFileSync('git',['show',ref+':src/'+name+'.js'],{encoding:'utf8'}):fs.readFileSync(require.resolve('../src/'+name+'.js'),'utf8');
  if(internal&&name==='core'){const marker='return Object.freeze({ W: W,';assert(source.includes(marker));source=source.replace(marker,'return Object.freeze({ _v36:{fireShot:fireShot,updateShots:updateShots}, W: W,');}
  vm.runInNewContext(source,box,{filename:name+'.js'});
 }return box.HapilCore;
}
const Internal=load(null,true),Old=load(BASE);
function world(core=C,index=0,phase=0,difficulty='normal',revision){
 if(arguments.length<5)revision=31;
 const first=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'v36-cue-contract-'+index+'-'+phase+'-'+difficulty+'-'+revision}),saved=core.checkpoint(first);saved.phase=phase;
 const w=core.restoreCheckpoint(saved);assert.equal(w.player.hp,w.player.maxHp);return w;
}
function cues(frame,after=0){return frame.events.filter(e=>e.serial>after).sort((a,b)=>a.serial-b.serial);}
function shot(id,x,y,vx=0,vy=-660,extra={}){return {id,x,y,px:x,py:y,vx,vy,r:2,age:0,ttl:1.2,damage:10,kind:'basic',angle:Math.atan2(vy,vx),...extra};}
function enemy(id,px,py,x=px,y=py,extra={}){return {id,px,py,x,y,r:10,hp:50,maxHp:50,age:2,kind:'fixture',...extra};}
function fixture(){const w=world(Internal);w.autoAttack=false;w.skillRotation=false;w.stage='waves';w.boss=null;w.enemies=[];w.shots=[];return w;}
// Numeric earliest-entry oracle deliberately does not use Core geometry or
// repeat its quadratic implementation. Find a crossing then bisect it.
function contactOracle(s,e){
 const radius=s.r+e.r,inside=t=>{const x=s.x+s.vx/60*t-(e.px+(e.x-e.px)*t),y=s.y+s.vy/60*t-(e.py+(e.y-e.py)*t);return x*x+y*y<=radius*radius;};
 if(inside(0))return 0;let last=0;
 for(let i=1;i<=20000;i++){const t=i/20000;if(inside(t)){let a=last,b=t;for(let j=0;j<45;j++){const m=(a+b)/2;if(inside(m))b=m;else a=m;}return b;}last=t;}
 return null;
}

test('render cues are opt-in only for current31 campaigns and never become world/checkpoint state',()=>{
 assert.equal(C.getCombatPresentation(null),null);assert.equal(C.getCombatPresentation({combatRevision:31,campaign:false}),null);
 for(const revision of[undefined,21,25,27,28,29,30]){const w=world(C,0,0,'normal',revision),before=JSON.stringify(w);assert.equal(C.getCombatPresentation(w),null);assert.equal(JSON.stringify(w),before);}
 const w=world(),before=JSON.stringify(w),saved=JSON.stringify(C.checkpoint(w)),keys=Reflect.ownKeys(w),frame=C.getCombatPresentation(w);
 assert.equal(frame.capacity,64);assert.equal(frame.serial,0);assert.equal(frame.events.length,64);assert.equal(new Set(frame.events).size,64);assert.equal(C.getCombatPresentation(w),frame);
 assert.deepEqual(Reflect.ownKeys(w),keys);assert.equal(JSON.stringify(w),before);assert.equal(JSON.stringify(C.checkpoint(w)),saved);
 const restored=C.restoreCheckpoint(C.checkpoint(w));assert.notEqual(C.getCombatPresentation(restored),frame);assert.equal(C.getCombatPresentation(restored).serial,0);
});

test('actual successful basic/memory/counter fire records exact muzzle before movement, while capacity failure records nothing',()=>{
 const w=fixture(),frame=Internal.getCombatPresentation(w),originalHP=w.player.hp;
 for(const [i,kind]of['basic','memory','counter'].entries()){
  const offset=i-1,angle=-Math.PI/2+offset*.1;w.tick=10+i;const before=w.stats.shots;
  assert(Internal._v36.fireShot(w,angle,10,kind,offset));const s=w.shots[w.shots.length-1],e=frame.events[(frame.serial-1)%64];
  assert.equal(e.kind,'muzzle');assert.equal(e.tick,w.tick);assert.equal(e.shotId,s.id);assert.equal(e.shotKind,kind);assert.equal(e.x,w.player.x+offset);assert.equal(e.y,w.player.y-16);assert.equal(e.angle,angle);assert.equal(e.targetId,0);assert.equal(e.isBoss,false);assert.equal(e.killed,false);assert.equal(w.stats.shots,before+1);
 }
 while(w.shots.length<Internal.CAPS.shots)Internal._v36.fireShot(w,-Math.PI/2,10,'basic',0);
 const serial=frame.serial,count=w.stats.shots;assert.equal(Internal._v36.fireShot(w,-Math.PI/2,10,'basic',0),false);assert.equal(frame.serial,serial);assert.equal(w.stats.shots,count);assert.equal(w.player.hp,originalHP);
});

test('real chosen victims emit the independently measured earliest moving-circle contact and exact kill flag',()=>{
 const cases=[
  {s:shot(100,180,220),e:enemy(200,180,200)},
  {s:shot(101,180,230),e:enemy(201,180,205,180,210)},
  {s:shot(102,100,230,330,-660),e:enemy(202,100,210,105,212)},
  {s:shot(103,180,210),e:enemy(203,170,200,190,200)},
  {s:shot(104,180,201),e:enemy(204,180,200)},
  {s:shot(105,0,12,660,0),e:enemy(205,5.5,0)},
  {s:shot(106,180,220),e:enemy(206,180,200,180,200,{hp:5})}
 ];
 for(const row of cases){
  const w=fixture(),frame=Internal.getCombatPresentation(w),s={...row.s},e={...row.e},fraction=contactOracle(s,e);assert.notEqual(fraction,null,'fixture must really intersect');
  const expected={x:s.x+s.vx/60*fraction,y:s.y+s.vy/60*fraction},hp=e.hp;w.tick=57;w.shots=[s];w.enemies=[e];Internal._v36.updateShots(w);
  assert.equal(w.shots.length,0);assert.equal(frame.serial,1);const cue=cues(frame)[0];assert.equal(cue.kind,'impact');assert.equal(cue.shotId,s.id);assert.equal(cue.targetId,e.id);assert.equal(cue.tick,57);assert.equal(cue.targetRadius,e.r);assert.equal(cue.targetX,e.x);assert.equal(cue.targetY,e.y);assert.equal(cue.killed,hp<=s.damage);assert.equal(cue.isBoss,false);assert(Math.abs(cue.x-expected.x)<1e-6);assert(Math.abs(cue.y-expected.y)<1e-6);assert.equal(w.stats.damage,Math.min(hp,s.damage));
 }
 const w=fixture(),frame=Internal.getCombatPresentation(w),first=enemy(300,180,200,180,200,{hp:5}),second=enemy(301,180,200);w.shots=[shot(302,180,220)];w.enemies=[first,second];Internal._v36.updateShots(w);
 assert.equal(cues(frame)[0].targetId,first.id,'cue must follow the exact victim chosen by existing collision order');assert.equal(second.hp,50);assert.equal(w.stats.damage,5);
});

test('TTL, offscreen, misses, clears and a replacement world do not invent contact effects',()=>{
 const w=fixture(),frame=Internal.getCombatPresentation(w);w.shots=[shot(400,-31,300,-660,0),shot(401,180,300,0,-660,{age:1.19}),shot(402,120,300,0,0)];
 w.enemies=[enemy(403,250,200)];Internal._v36.updateShots(w);assert.equal(w.shots.length,1);assert.equal(w.shots[0].id,402);assert.equal(frame.serial,0);assert.equal(w.stats.damage,0);
 w.shots.length=0;w.stage='transition';Internal._v36.updateShots(w);assert.equal(frame.serial,0);w.stage='lost';Internal.step(w,{});assert.equal(frame.serial,0);
 const next=world(Internal),other=Internal.getCombatPresentation(next);assert.notEqual(other,frame);assert.equal(other.serial,0);assert(other.events.every(e=>e.serial===0));
});

test('a finite64-entry ring reuses the same cue objects and retains serial order across skipped draws',()=>{
 const w=fixture(),frame=Internal.getCombatPresentation(w),array=frame.events,slots=frame.events.slice();
 for(let tick=1;tick<=160;tick++){w.tick=tick;Internal._v36.fireShot(w,-Math.PI/2,10,'basic',0);for(const s of w.shots)s.ttl=0;Internal._v36.updateShots(w);}
 assert.equal(frame.serial,160);assert.equal(frame.events,array);assert.equal(frame.events.length,64);for(let i=0;i<64;i++)assert.equal(frame.events[i],slots[i]);assert.deepEqual(Array.from(cues(frame),e=>e.serial),Array.from({length:64},(_,i)=>97+i));assert(cues(frame).every(e=>e.kind==='muzzle'&&e.targetId===0));
 const real=world(),channel=C.getCombatPresentation(real);real.skillRotation=false;for(let tick=0;tick<180;tick++)C.step(real,{dx:tick%80<40?1:-1,dy:0,focus:true});
 const recorded=cues(channel);assert(channel.serial<=64,'fixture intentionally skips drawing within retained capacity');assert(recorded.filter(e=>e.kind==='muzzle').length>10);assert.equal(recorded.filter(e=>e.kind==='muzzle').length,real.stats.shots);assert.equal(recorded.filter(e=>e.kind==='impact').length*10,real.stats.bossDamage);assert(recorded.some(e=>e.kind==='impact'),'actual normal-health fight must produce hits');assert(real.player.hp<=real.player.maxHp);
});

test('cue targets remain the actual command/circuit boss across phases and never replace protected paired people',()=>{
 for(const index of[12,17,21,26,33,34])for(let phase=0;phase<3;phase++){
  const w=world(Internal,index,phase),frame=Internal.getCombatPresentation(w),b=w.boss,identity={kind:b.kind,name:b.name,semantic:b.targetSemantic,link:b.linkTarget,phase:w.phase},participants=JSON.stringify(b.participants||[]),hp=b.hp;
  w.autoAttack=false;w.skillRotation=false;w.shots=[shot(500+index,b.x,b.y+b.r+6)];Internal._v36.updateShots(w);
  const e=cues(frame)[0];assert(e);assert.equal(e.targetId,b.id);assert.equal(e.isBoss,true);assert.equal(e.killed,false);assert.equal(b.hp,hp-10);assert.equal(JSON.stringify(b.participants||[]),participants);assert.deepEqual({kind:b.kind,name:b.name,semantic:b.targetSemantic,link:b.linkTarget,phase:w.phase},identity);
  if(index===33){const untouched=frame.serial;w.shots=[shot(700,b.participants[0].x,b.participants[0].y+5)];Internal._v36.updateShots(w);assert.equal(frame.serial,untouched,'rendered participant is not the targetable shared command circuit');}
 }
});

test('all2520 normal-health current/historical selector worlds and checkpoints stay raw exact against pinned35 with cues enabled',()=>{
 let cases=0,observed=0;
 for(const revision of[undefined,21,25,27,28,29,30,31])for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of['gentle','normal','hell']){
  const w=world(C,index,phase,difficulty,revision),prior=world(Old,index,phase,difficulty,revision),initial=JSON.stringify(w);assert.equal(initial,JSON.stringify(prior));const frame=C.getCombatPresentation(w);assert.equal(JSON.stringify(w),initial);
  assert.equal(JSON.stringify(C.checkpoint(w)),JSON.stringify(Old.checkpoint(prior)));for(let tick=0;tick<180;tick++){
   const input={dx:tick%120<60?1.5:-1.5,dy:tick%90<45?.5:-.5,focus:tick%100<50};C.step(w,input);Old.step(prior,input);
   if(tick%60===59){assert.equal(JSON.stringify(w),JSON.stringify(prior),[revision,index,phase,difficulty,tick].join('/'));assert.equal(JSON.stringify(C.checkpoint(w)),JSON.stringify(Old.checkpoint(prior)));}
  }if(frame)observed+=frame.serial;cases++;
 }
 assert.equal(cases,2520);assert(observed>3000,'actual shot/contact channel must be exercised, not only empty observer creation');
});
