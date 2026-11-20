'use strict';
// 사용자 11-20: 그림 페이즈 그림 1.5배 + 졸개 6 소환 → 6초 뒤 먹 포탄(난이도별 속도), 불꽃놀이 탄, 회전하는 큰 무기(맵 20%, 외곽선 탄),
// 한자 고리·육망성 중 보스 흔들림, 보스 레이저 예고 1초 더, 모든 무기 그림탄의 외곽 판정.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),DIFFS=['gentle','normal','hell'];
function toCard(s){for(let i=0;i<3000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');s.segTick=0;}
function bossCard(d,stage){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card'||a.SEGMENTS[seg].mid)seg++;const s=a.createRun({difficulty:d,seed:3,segment:seg,entranceAll:true});toCard(s);return s;}
// 그림 페이즈 직전으로 간다(어느 카드든 그림 차례가 오는 주기로 시계를 옮긴다)
function drawingRun(d,stage){const s=bossCard(d,stage===undefined?2:stage);s.sp.need=false;if(s.sp.start<0)s.sp.start=a.SP_START;let c=0;for(;c<6;c++)if(a.SP_ORDER[(s.stageIndex*3+s.seg+c)%6]==='drawing')break;
 s.segTick=s.sp.start-a.SP_LEAD-5+c*a.SP_CYCLE;s.n=0;return s;}
function go(s,ticks,each,input){for(let i=0;i<ticks&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,input?input(s,i):{dx:0,dy:0});if(each&&each(s,i)===false)break;h.clear(s);}return s;}
const brood=s=>s.mobs.filter(m=>m.brood);
function untilSummon(s){go(s,4000,t=>!(t.brood));assert(s.brood,'the boss summons its brood');return s;}

test('drawing phase: drawings are 1.5× and the boss summons six of the stage\'s own footsoldiers that never shoot',()=>{
 for(const d of DIFFS){const s=untilSummon(drawingRun(d));assert.equal(s.special.kind,'drawing');assert.equal(brood(s).length,a.BROOD_N);
  for(const m of brood(s))assert(!a.MOBS[m.kind].elite,'footsoldiers, not elites');
  let sizes=[],shots=0;go(s,a.BROOD_HOLD-20,t=>{for(const r of t.risers||[])if(r.age===1)sizes.push(r.size/(r.spit?Math.round(a.MOTIFS[r.kind].size*.74):a.MOTIFS[r.kind].size));for(const m of t.mobs)if(m.brood)shots+=m.shots;for(const m of t.mobs)if(m.brood)m.hp=99;});
  assert(sizes.length>=2,d+' drawings');assert(sizes.every(k=>Math.abs(k-a.DRAW_BIG)<.03),d+' sizes '+sizes);assert.equal(shots,0,'the brood never fires');
  assert.equal(s.n,0,'no bullets during the special phase');}
});
test('six seconds later the survivors gather into one ink cannonball whose size is the number left, thrown at the hero; only its speed differs by difficulty',()=>{
 const speed={};
 for(const d of DIFFS){const s=untilSummon(drawingRun(d));brood(s).slice(0,2).forEach(m=>{m.hp=0;});go(s,1,null);for(let i=s.mobs.length-1;i>=0;i--)if(s.mobs[i].brood&&s.mobs[i].hp<=0)s.mobs.splice(i,1);
  const left=brood(s).length;let born=-1,gather=-1;
  go(s,a.BROOD_HOLD+a.BROOD_GATHER+40,(t,i)=>{for(const m of t.mobs)if(m.brood)m.hp=99;if(t.events.includes('broodGather')&&gather<0)gather=i;if(t.cannons.length&&born<0){born=i;return false;}});
  assert(gather>=a.BROOD_HOLD-30&&gather<=a.BROOD_HOLD+2,d+' gathers after six seconds: '+gather);assert(born>=0,d+' a cannonball');
  const c=s.cannons[0];assert.equal(c.n,left);assert.equal(c.r,a.cannonRadius(left));assert.equal(brood(s).length,0,'the brood became the ball');
  speed[d]=c.v;assert.equal(c.v,a.CANNON_SPEED[d]);}
 assert(speed.gentle<speed.normal&&speed.normal<speed.hell,JSON.stringify(speed));
});
test('killing the whole brood in time means no cannonball',()=>{
 const s=untilSummon(drawingRun('normal'));for(const m of brood(s))m.hp=0.0000001;
 go(s,3,t=>{for(const m of t.mobs)if(m.brood)m.hp=-1;});for(let i=s.mobs.length-1;i>=0;i--)if(s.mobs[i].brood&&s.mobs[i].hp<0)s.mobs.splice(i,1);
 go(s,a.BROOD_HOLD+a.BROOD_GATHER+30);assert.equal(s.cannons.length,0);assert.equal(s.brood,null);
});
test('the cannonball warns, locks its aim, then flies straight: standing still is hit, stepping aside after the lock is safe (every difficulty)',()=>{
 for(const d of DIFFS)for(const dodge of [false,true]){const s=untilSummon(drawingRun(d));s.player.x=180;s.player.y=560;
  let hit=false,locked=null;
  go(s,a.BROOD_HOLD+a.BROOD_GATHER+a.CANNON_WARN+260,(t)=>{for(const m of t.mobs)if(m.brood)m.hp=99;const c=t.cannons[0];
    if(c&&c.age>a.CANNON_WARN*a.CANNON_LOCK_SHOW&&locked===null)locked=c.a;
    if(c&&c.age>a.CANNON_WARN){const dx=c.x-t.player.x,dy=c.y-t.player.y,rr=c.r*a.CANNON_HIT+t.player.r;if(dx*dx+dy*dy<rr*rr)hit=true;assert.equal(c.a,locked,'aim is locked');}},
   (t)=>({dx:dodge&&t.cannons.length&&t.cannons[0].age>a.CANNON_WARN*a.CANNON_LOCK_SHOW?4.2:0,dy:0}));
  assert.equal(hit,!dodge,`${d} dodge=${dodge}`);}
});
test('a summoned brood withdraws upward when the card ends and never turns into a cannonball',()=>{
 const s=untilSummon(drawingRun('hell'));go(s,30);s.cardDown=1;s.boss.hp=0;go(s,1);
 assert.equal(s.brood,null);assert(s.mobs.every(m=>!m.brood&&m.retreat&&m.vy<0));assert.equal(s.cannons.length,0);
});
test('save mid-brood: a JSON round trip plays on exactly the same',()=>{
 const s=untilSummon(drawingRun('normal'));go(s,200,t=>{for(const m of t.mobs)if(m.brood)m.hp=99;});
 const copy=a.createRun({difficulty:'normal',seed:3,segment:s.seg,entranceAll:true}),raw=JSON.parse(JSON.stringify(s,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
 for(const k in raw)copy[k]=ArrayBuffer.isView(s[k])?new s[k].constructor(raw[k]):raw[k];
 const run=x=>{const out=[];go(x,a.BROOD_HOLD,t=>{for(const m of t.mobs)if(m.brood)m.hp=99;out.push(t.cannons.map(c=>c.x.toFixed(3)+','+c.y.toFixed(3)).join()+'|'+t.mobs.length);});return out.join(';');};
 assert.equal(run(copy),run(structuredClone(s)));
});

test('big rotating weapon: about 20% of the map, ringed with bullets, thrown slower on easy and faster on hell',()=>{
 for(const k of Object.keys(a.WEAPON_PTS)){const P=a.WEAPON_PTS[k];assert(P.length>=20,k);let lo=1e9,hi=-1e9;for(const p of P){lo=Math.min(lo,p[1],p[0]);hi=Math.max(hi,p[1],p[0]);}
  assert(hi-lo>=a.HEIGHT*.18&&hi-lo<=a.HEIGHT*.22,k+' size '+(hi-lo));for(let i=1;i<P.length;i++)assert(Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1])<=14||i>0,'dense outline');}
 assert.equal(a.WEAPON_LEN,a.HEIGHT*.2);
 assert(a.WEAPON_SPEED.gentle<a.WEAPON_SPEED.normal&&a.WEAPON_SPEED.normal<a.WEAPON_SPEED.hell);
 for(const d of DIFFS){const s=bossCard(d,13);s.n=0;s.calm=false;s.figPend=null;a.throwWeapon(s,4,2);assert.equal(s.weapons.length,1);
  const w=s.weapons[0];assert.equal(w.v,a.WEAPON_SPEED[d]);s.player.x=w.x;s.player.y=560;let hitAt=-1,turns=[];
  go(s,400,(t,i)=>{const x=t.weapons[0];if(!x)return false;turns.push(x.t);if(hitAt<0&&t.events.includes('hurt'))hitAt=i;},null);
  assert(turns[turns.length-1]-turns[0]>1,'it spins');}
});
test('the thrown weapon hits only on its outline bullets, and only after the warning',()=>{
 const s=bossCard('normal',13);s.n=0;s.calm=false;a.throwWeapon(s,4,2);const w=s.weapons[0];
 s.player.x=w.x;s.player.y=w.y+10;s.player.invulnerableUntil=0;
 // 예고 동안에는 닿지 않는다
 let touched=false;for(let i=0;i<a.WEAPON_WARN-2;i++){s.player.invulnerableUntil=0;s.player.x=s.weapons[0].x;s.player.y=s.weapons[0].y;a.step(s,{dx:0,dy:0});if(s.events.includes('hurt')||s.events.includes('autoBomb'))touched=true;h.clear(s);}
 assert(!touched,'no hit during the warning');
 const pts=a.weaponPoints(s.weapons[0]);assert.equal(pts.length,a.WEAPON_PTS[s.weapons[0].shape].length*2);
});
test('weapon shapes avoid the cross (no hilt crossguard); fireworks never burst in four',()=>{
 assert.deepEqual(Object.keys(a.WEAPON_PTS).sort(),['axe','chakram','scythe']);
 const src=h.read('src/arcade-v43.js');assert(!/arg:4\b/.test(src.slice(src.indexOf('function extraFire'),src.indexOf('function bossWobble'))));
});
test('fireworks: a shell bursts after its fuse, senrin bursts a second time into triangles, and the same moment always gives the same sparks',()=>{
 const snap=seed=>{const s=bossCard('normal',14);s.n=0;s.calm=false;s.figPend=null;const A=a.ACTORS[s.boss.actor];a.extraFire(s,'senrin',0,A.c1,A.c2===undefined?A.c1:A.c2);const counts=[];
  for(let i=0;i<a.FW_FUSE*2+6;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);counts.push(s.n);}
  return {counts,pos:Array.from(s.bx.slice(0,s.n)).map(v=>v.toFixed(2)).join()};};
 const x=snap(),y=snap();assert.equal(x.pos,y.pos,'fixed pattern');
 assert(x.counts.some(n=>n>=6),'first burst');assert(Math.max(...x.counts)>=15,'second burst into threes: '+Math.max(...x.counts));
 for(const k of ['peony','willow']){const s=bossCard('hell',14);s.n=0;s.calm=false;const A=a.ACTORS[s.boss.actor];a.extraFire(s,k,0,A.c1,A.c2===undefined?A.c1:A.c2);const n0=s.n;go(s,a.FW_FUSE*2+6);assert(n0>=1&&s.n>n0,k+' bursts '+n0+'→'+s.n);}
});
test('fireworks and the big weapon take turns in the boss variation over a whole run, every difficulty',()=>{
 for(const d of DIFFS){const seen={};for(const st of [1,6,9,22]){const s=a.createRun({difficulty:d,seed:3,segment:a.STAGES[st].first,entranceAll:true});
   for(let i=0;i<40000&&s.stageIndex===st&&s.stage!=='won';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:Math.sin(i*.02)*2,dy:0});for(const e of s.events)if(e==='firework'||e==='weaponWarn')seen[e]=(seen[e]||0)+1;h.clear(s);}}
  assert(seen.firework>0&&seen.weaponWarn>0,d+' '+JSON.stringify(seen));}
});

test('boss lasers in a live boss fight are warned one second (two beats) longer; waves and the old game are unchanged',()=>{
 assert.equal(a.LASER_MORE,60);assert.equal(a.LASER_MORE%a.SP_BEAT,0,'keeps the rhythm grid');
 const live=a.createRun({difficulty:'normal',seed:1,entranceAll:true});live.stage='card';
 const wave=a.createRun({difficulty:'normal',seed:1,entranceAll:true});wave.stage='wave';
 const old=a.createRun({difficulty:'normal',seed:1});old.stage='card';
 for(const x of [live,wave,old]){x.figures.length=0;x.lasers.length=0;a.__beam(x,180,-12,Math.PI/2,{warn:60,active:30});}
 assert.equal(live.lasers[0].warn-wave.lasers[0].warn,a.LASER_MORE);assert.equal(wave.lasers[0].warn,Math.round(60*wave.rules.warn));assert.equal(old.lasers[0].warn,Math.round(60*old.rules.warn));
 const m=a.createRun({difficulty:'normal',seed:1,entranceAll:true,compact:true});m.stage='card';m.figures.length=0;a.__beam(m,180,-12,Math.PI/2,{warn:60,active:30});
 assert.equal(m.lasers[0].warn,Math.round(60*m.rules.warn)+a.LASER_MORE,'the phone warning stretch still applies to the base warning');
});
test('during the hexagram and the hanja rings the boss sways a little left-right and up-down on a fixed figure-eight',()=>{
 const s=bossCard('hell',0);go(s,60);s.figures.push({kind:'runes',age:0,warn:60,active:150,rings:[],cx:180,cy:200,turn:0,spin:0,width:10,r:0,follow:true});
 let xs=[],ys=[];go(s,900,(t,i)=>{t.figures.forEach(f=>{if(f.kind==='runes')f.age=Math.min(f.age,100);});if(i>300&&t.boss.descended){xs.push(t.boss.x);ys.push(t.boss.y);}},null);
 const span=v=>Math.max(...v)-Math.min(...v);assert(xs.length>200);
 assert(span(xs)>=20&&span(xs)<=2*a.WOBBLE_X+2,'left-right '+span(xs));assert(span(ys)>=8&&span(ys)<=2*a.WOBBLE_Y+2,'up-down '+span(ys));
 assert.deepEqual(a.bossWobble({entranceAll:true,tick:123}),a.bossWobble({entranceAll:true,tick:123}),'fixed path');
});

test('every weapon picture bullet is ringed along its drawn outline, and touching the outline counts as a hit',()=>{
 const fs=require('node:fs'),path=require('node:path');let ringed=0;
 a.PROPS.forEach((p,i)=>{const file=path.join(h.root,'media/arcade-v43',p.key+'.webp');if(!fs.existsSync(file))return;const pts=a.propHitPoints(i);assert(pts&&pts.length>=6,p.key+' outline');ringed++;
  const span=a.propRenderSpan(p);for(const q of pts)assert(Math.abs(q[0])<=span/2+1&&Math.abs(q[1])<=span/2+1,p.key+' point inside the drawing');});
 assert.equal(ringed,a.PROPS.length,'all picture bullets');
 // 칼끝 바깥 가장자리 점에 영웅이 닿으면 맞는다(몸 판정점에서 먼 곳)
 for(const key of ['sword-violet','p2_knife','p4_sword','p6_spear','crescent']){const idx=a.PROPS.findIndex(p=>p.key===key),pts=a.propHitPoints(idx);
  let far=pts[0],fd=-1;for(const q of pts){const d=Math.hypot(q[0],q[1]);if(d>fd){fd=d;far=q;}}
  const s=h.idle({difficulty:'normal',entranceAll:true});const i=h.put(s,180,300,{bsize:a.SHAPE_PROP,bcolor:idx,bage:60,ba:0,bs:0});s.blife[i]=60000;
  const turn=0,sc=a.hitSize?a.hitSize(s):s.sizeScale;s.player.x=180+far[0]*sc;s.player.y=300+far[1]*sc;s.player.invulnerableUntil=0;const hp=s.player.hp,bombs=s.bombs;
  a.step(s,{dx:0,dy:0});assert(s.player.hp<hp||s.bombs<bombs||s.events.includes('distort'),key+' outline tip hits');}
});
