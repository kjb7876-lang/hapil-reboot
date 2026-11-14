'use strict';
/* v43 공통 발사기(11-14 지시서 STEP 3·4): 데이터로 쓰는 발사기 10종과 탄 물리·충돌 검사.
 * 좌표계: x는 오른쪽, y는 아래가 +. 각도 π/2가 화면 아래(적 탄이 영웅 쪽으로 내려가는 방향). 시간은 60Hz 고정 틱(TICK=1/60초). */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const TAU=Math.PI*2;
const norm=a=>((a%TAU)+TAU)%TAU;
const fresh=(o)=>{const s=h.idle(Object.assign({difficulty:'normal',seed:3},o));s.n=0;return s;};
const angles=(s,from)=>{const out=[];for(let i=from||0;i<s.n;i++)out.push(s.ba[i]);return out;};

test('v43 emitters: ten data-driven kinds exist and take the documented fields',()=>{
 const a=h.need();
 assert.deepEqual(a.EMITTER_KINDS,['radial','fan','rotating','curved','spiral','delayedRing','aimed','layered','orbCorridor','composite']);
 assert.equal(typeof a.emit,'function');
 for(const kind of a.EMITTER_KINDS){const s=fresh();
  const spec={kind,patternId:'t-'+kind,emitterCount:3,bulletsPerWave:8,fireInterval:.25,baseSpeed:90,speedVariance:0,spreadAngle:1.2,rotationSpeed:1.5,phaseOffset:.2,
   bulletType:{size:0,color:2},difficultyMultiplier:{gentle:.8,normal:1,hell:1.3},duration:4,children:[{kind:'radial',bulletsPerWave:6,baseSpeed:80,fireInterval:.5},{kind:'aimed',bulletsPerWave:3,baseSpeed:120,spreadAngle:.4,fireInterval:.5}]};
  for(let t=0;t<120;t++)a.emit(s,spec,t,{x:180,y:120});
  assert(s.n>0,kind+' fires');
  for(let i=0;i<s.n;i++)assert(Number.isFinite(s.bx[i])&&Number.isFinite(s.ba[i])&&s.bs[i]>0,kind+' finite bullets');}
});

test('v43 emitters 01 radial: θi = θ0 + 2πi/N, evenly spaced',()=>{
 const a=h.need(),s=fresh();s.density=1;
 a.emit(s,{kind:'radial',bulletsPerWave:12,baseSpeed:80,phaseOffset:.3,fireInterval:1},0,{x:180,y:200});
 assert.equal(s.n,12);const got=angles(s).map(norm).sort((x,y)=>x-y),want=[...Array(12)].map((_,k)=>norm(.3+TAU*k/12)).sort((x,y)=>x-y);
 for(let i=0;i<12;i++)assert(Math.abs(got[i]-want[i])<1e-4,'angle '+i);
});

test('v43 emitters 02 fan: every bullet within centre ± spread/2, ends exactly on the edges',()=>{
 const a=h.need(),s=fresh();s.density=1;
 a.emit(s,{kind:'fan',bulletsPerWave:7,baseSpeed:80,spreadAngle:1,center:Math.PI/2,fireInterval:1},0,{x:180,y:100});
 const got=angles(s);assert.equal(got.length,7);
 assert(Math.abs(Math.min(...got)-(Math.PI/2-.5))<1e-5&&Math.abs(Math.max(...got)-(Math.PI/2+.5))<1e-5);
 assert(got.every(x=>x>=Math.PI/2-.5-1e-9&&x<=Math.PI/2+.5+1e-9),'downward fan stays below the horizon');
});

test('v43 emitters 03/05 spiral: arm angle follows θi(t) = ωt + 2πi/N + θ0 in simulated seconds',()=>{
 const a=h.need(),s=fresh();s.density=1;const spec={kind:'spiral',emitterCount:4,rotationSpeed:2,phaseOffset:.1,baseSpeed:90,fireInterval:5/60};
 for(const t of [0,5,10,30]){const from=s.n;a.emit(s,spec,t,{x:180,y:120});
  const got=angles(s,from).map(norm).sort((x,y)=>x-y),want=[0,1,2,3].map(i=>norm(2*t/60+TAU*i/4+.1)).sort((x,y)=>x-y);
  assert.equal(got.length,4,'four arms at t='+t);for(let i=0;i<4;i++)assert(Math.abs(got[i]-want[i])<1e-4,'t='+t+' arm '+i);}
 const r=fresh();r.density=1;a.emit(r,{kind:'rotating',rotationSpeed:3,baseSpeed:90,fireInterval:5/60},0,{x:180,y:120});a.emit(r,{kind:'rotating',rotationSpeed:3,baseSpeed:90,fireInterval:5/60},5,{x:180,y:120});
 assert.equal(r.n,2,'one rotating emitter shoots one bullet per beat');assert(Math.abs((r.ba[1]-r.ba[0])-3*5/60)<1e-5,'the emitter turned by ωΔt');
 assert(r.bturn[0]===0&&r.bturn[1]===0,'rotating emitter shoots straight bullets (the emitter turns, not the bullet)');
});

test('v43 emitters 04 curved: the bullet itself turns, v(t+dt) = Rotate(v(t), ω dt)',()=>{
 const a=h.need(),s=fresh();s.density=1;
 a.emit(s,{kind:'curved',bulletsPerWave:1,baseSpeed:60,turnRate:1.2,center:Math.PI/2,fireInterval:1},0,{x:180,y:100});
 assert.equal(s.n,1);const a0=s.ba[0];s.bage[0]=20;
 for(let k=0;k<60;k++)a.step(s,{dx:0,dy:0});
 assert(Math.abs((s.ba[0]-a0)-1.2)<1e-4,'turned 1.2 rad in one simulated second: '+(s.ba[0]-a0));
});

test('v43 emitters 06 delayed ring: rings at different times with stepped speed and phase',()=>{
 const a=h.need(),s=fresh();s.density=1;const spec={kind:'delayedRing',bulletsPerWave:10,emitterCount:3,baseSpeed:60,speedStep:20,phaseStep:.15,fireInterval:.2};
 const rings=[];for(let t=0;t<60;t++){const from=s.n;a.emit(s,spec,t,{x:180,y:120});if(s.n>from)rings.push({t,speed:s.bs[from]/s.rules.speed,phase:norm(s.ba[from])});}
 assert(rings.length>=3,'several rings');const speeds=new Set(rings.slice(0,3).map(r=>Math.round(r.speed)));assert.equal(speeds.size,3,'three different speeds');
 assert(new Set(rings.slice(0,3).map(r=>r.t)).size===3,'different fire times');
});

test('v43 emitters 07 aimed: aims at the hero at the moment of firing and never tracks afterwards',()=>{
 const a=h.need(),s=fresh();s.density=1;s.player.x=60;s.player.y=520;
 a.emit(s,{kind:'aimed',bulletsPerWave:1,baseSpeed:90,fireInterval:1},0,{x:180,y:100});
 const want=Math.atan2(520-100,60-180);assert(Math.abs(s.ba[0]-want)<1e-5,'aimed at the hero');
 assert.equal(s.bmode[0],0,'plain aimed bullet has no re-aim mode');
 s.player.x=300;s.bage[0]=20;for(let k=0;k<30;k++)a.step(s,{dx:0,dy:0});
 assert(Math.abs(s.ba[0]-want)<1e-5,'keeps its heading after the hero moves');
});

test('v43 emitters 08 layered: independent streams with different bullet types and speeds cross',()=>{
 const a=h.need(),s=fresh();s.density=1;
 const spec={kind:'layered',children:[{kind:'spiral',emitterCount:3,rotationSpeed:2,baseSpeed:70,fireInterval:6/60,bulletType:{size:3,color:0}},{kind:'radial',bulletsPerWave:16,rotationSpeed:-1,baseSpeed:110,fireInterval:.5,bulletType:{size:2,color:4}}]};
 for(let t=0;t<60;t++)a.emit(s,spec,t,{x:180,y:120});
 const sizes=new Set(),speeds=new Set();for(let i=0;i<s.n;i++){sizes.add(s.bsize[i]);speeds.add(Math.round(s.bs[i]));}
 assert(sizes.has(3)&&sizes.has(2),'two bullet types');assert(speeds.size>=2,'two speeds');
});

test('v43 emitters 09 large-orb corridor: big orbs leave a gap at least 4× the hero hitbox that drifts over time',()=>{
 const a=h.need(),s=fresh();s.density=1;const spec={kind:'orbCorridor',bulletsPerWave:9,baseSpeed:70,fireInterval:.5,gapWidth:80,drift:1.1};
 const centres=[];
 for(let t=0;t<600;t++){const from=s.n;a.emit(s,spec,t,{x:180,y:-10});if(s.n===from)continue;
  const xs=[];for(let i=from;i<s.n;i++){xs.push(s.bx[i]);assert.equal(s.bsize[i],2,'large orbs');assert(Math.abs(s.ba[i]-Math.PI/2)<1e-5,'straight down');}
  xs.sort((p,q)=>p-q);const r=a.SIZE_RADIUS[2]*s.sizeScale*s.rules.hitScale;let best=0,mid=0;const edges=[0,...xs,a.WIDTH];
  for(let k=1;k<edges.length;k++){const g=edges[k]-edges[k-1]-(k>1?r:0)-(k<edges.length-1?r:0);if(g>best){best=g;mid=(edges[k]+edges[k-1])/2;}}
  assert(best>=s.player.r*2*4,'open gap '+best);centres.push(mid);}
 assert(Math.max(...centres)-Math.min(...centres)>60,'the corridor moves across the screen');
});

test('v43 emitters 10 composite: children start on their own delays and fire on their own beats',()=>{
 const a=h.need(),s=fresh();s.density=1;
 const spec={kind:'composite',children:[{kind:'radial',bulletsPerWave:8,baseSpeed:70,fireInterval:1,delay:0},{kind:'fan',bulletsPerWave:5,baseSpeed:90,spreadAngle:1,fireInterval:1,delay:.5}]};
 const fired=[];for(let t=0;t<90;t++){const from=s.n;a.emit(s,spec,t,{x:180,y:120});if(s.n>from)fired.push([t,s.n-from]);}
 assert.deepEqual(fired,[[0,8],[30,5],[60,8]]);
});

test('v43 emitters: difficulty multiplier changes counts, hell differs in structure not only in speed',()=>{
 const a=h.need(),n={};
 for(const difficulty of ['gentle','normal','hell']){const s=fresh({difficulty});s.density=1;a.emit(s,{kind:'radial',bulletsPerWave:10,baseSpeed:80,fireInterval:1,difficultyMultiplier:{gentle:.6,normal:1,hell:1.5}},0,{x:180,y:120});n[difficulty]=s.n;}
 assert(n.gentle<n.normal&&n.normal<n.hell,JSON.stringify(n));
});

test('v43 emitters: a fixed seed reproduces the same pattern exactly',()=>{
 const a=h.need(),spec={kind:'aimed',bulletsPerWave:3,baseSpeed:90,speedVariance:30,spreadAngle:.5,fireInterval:.1};
 const run=()=>{const s=fresh({seed:42});for(let t=0;t<60;t++)a.emit(s,spec,t,{x:180,y:120});return Array.from(s.bs.slice(0,s.n));};
 assert.deepEqual(run(),run());
});

test('v43 physics: bullet travel depends on simulated ticks, speed × ticks × 1/60',()=>{
 const a=h.need(),s=fresh();const i=h.put(s,100,100,{ba:Math.PI/2,bs:120,bage:20});
 for(let k=0;k<30;k++)a.step(s,{dx:0,dy:0});
 assert(Math.abs(s.by[i]-(100+120*30/60))<1e-4,'moved '+(s.by[i]-100));
 const app=h.read('src/arcade-app-v43.js');
 assert(/accumulator=Math\.min\(accumulator\+elapsed,4\/60\)/.test(app)&&/while\(accumulator>=1\/60/.test(app),'the app steps the engine at a fixed 60Hz, render rate does not change bullet speed');
 assert(/visibilitychange[^\n]*pause\(\)/.test(app)&&/arcade-resume[^\n]*accumulator=0/.test(app),'tab switches pause and resume without a time jump');
});

test('v43 physics: a fast bullet that jumps over the hero in one tick still hits (swept collision)',()=>{
 const a=h.need(),s=fresh();s.player.x=180;s.player.y=500;s.player.invulnerableUntil=0;const hp=s.player.hp;
 h.put(s,180,488,{ba:Math.PI/2,bs:1500,bmax:2000,bage:20,bsize:0});
 a.step(s,{dx:0,dy:0});
 assert(s.player.hp<hp||s.player.invulnerableUntil>s.tick,'the hero is hit even though the bullet skipped past');
});

test('v43 physics: graze pays once per bullet',()=>{
 const a=h.need(),s=fresh();s.player.x=180;s.player.y=500;s.player.invulnerableUntil=1e9;
 h.put(s,180+ (a.SIZE_RADIUS[0]*s.sizeScale*s.rules.hitScale+s.player.r)+4,430,{ba:Math.PI/2,bs:30,bage:20,bsize:0});
 const before=s.graze;for(let k=0;k<200;k++)a.step(s,{dx:0,dy:0});
 assert.equal(s.graze-before,1);
});
