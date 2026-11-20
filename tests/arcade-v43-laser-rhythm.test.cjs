'use strict';
// 리듬 레이저(사용자 11-20 "보스페이즈가 보통 5인데 3개는 레이져 패턴이 꼭 있도록 … 마치 리듬게임을 레이져 패턴으로 구현한 느낌"):
// 보스 페이즈의 60%가 레이저 장단 페이즈이고, 그 페이즈에서는 레이저 구간이 반드시 끝까지 나온다. 음표는 박에 켜지고, 늘 피할 길이 있다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),R=require('../src/arcade-laser-rhythm-v43.js'),Audio=require('../src/audio-v37.js');
const DIFFS=['gentle','normal','hell'],LANE=a.WIDTH/R.LANES;
function toCard(s){for(let i=0;i<4000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');s.segTick=0;}
function firstBossCard(stage){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card'||a.SEGMENTS[seg].mid)seg++;return seg;}
// 무늬 하나를 골라 레이저 구간 직전으로 간다
function motifRun(d,name,x,y){const s=a.createRun({difficulty:d,seed:3,segment:firstBossCard(9),entranceAll:true});toCard(s);s.sp.need=true;s.sp.lj=0;s.sp.force=name;s.segTick=a.spStart(s)-a.SP_LEAD-2;s.lasers.length=0;s.figures.length=0;s.n=0;if(x!==undefined){s.player.x=x;s.player.y=y||560;}return s;}
function run(s,ticks,each,move){for(let i=0;i<ticks&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,move?move(s):{dx:0,dy:0});if(each)each(s,i);h.clear(s);}return s;}
const notes=s=>s.lasers.filter(l=>l.role==='note');
const lit=l=>l.age>=l.warn&&l.age<l.warn+l.active;
const vertical=l=>Math.abs(l.angle-Math.PI/2)<1e-9;
const r6=v=>Math.round(v*1e6)/1e6,span=l=>{const m=vertical(l)?l.x:l.y;return [r6(m-l.width/2),r6(m+l.width/2)];};

test('three of five boss phases are laser phases: round(60%) of each boss, spread out, never the first and always the last',()=>{
 for(const d of DIFFS){const s={paced:true,difficulty:d,entranceAll:true},bosses={};
  a.plannedSegments(d).forEach(i=>{const g=a.SEGMENTS[i];if(g.kind!=='card')return;s.seg=i;const pi=a.livePhaseOf(s,i),lc=a.laserCard(s),k=g.stage+'|'+g.actor+'|'+(g.mid?1:0);
   (bosses[k]=bosses[k]||{mid:!!g.mid,n:pi.count,laser:[]});if(lc){bosses[k].laser.push(pi.no);assert.equal(lc.j,bosses[k].laser.length-1);}});
  let five=0;
  for(const k in bosses){const b=bosses[k];if(b.mid){assert.equal(b.laser.length,0,'mid-bosses are left as they were');continue;}
   assert.equal(b.laser.length,Math.round(b.n*a.LASER_SHARE),`${d} ${k}: ${b.laser} of ${b.n}`);
   assert(!b.laser.includes(1),'the first phase shows the boss\'s own attack');assert(b.laser.includes(b.n),'the last phase is a laser phase');
   for(let i=1;i<b.laser.length;i++)assert(b.laser[i]-b.laser[i-1]<=2,'no long stretch without one');
   if(b.n===5){five++;assert.deepEqual(b.laser,[2,4,5]);}}
  assert(Object.keys(bosses).length>50);if(d!=='hell')assert(five>=5,d+' five-phase bosses '+five);}
 assert.equal(a.LASER_SHARE,.6);
});

test('in a laser phase the rhythm section always plays to the end: it opens when the boss is at half health and the boss cannot fall before it finishes',()=>{
 for(const d of DIFFS){
  const r=h.play({difficulty:d,seed:11,stage:9,stages:1,entranceAll:true,pacing:true,rhythm:true,growth:true},400000,null);
  assert.equal(r.s.stage,'won',d);
 }
 // 한 스테이지를 빠른 추적 봇으로: 레이저 페이즈마다 레이저 구간이 제 길이만큼 돌았다
 for(const d of DIFFS)for(const stage of [9,30]){const s=a.createRun({difficulty:d,seed:5,stage,stages:1,entranceAll:true,pacing:true,rhythm:true,growth:true});
  const cards={};let early=0;
  for(let i=0;i<400000&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;s.bombs=0;const tx=s.stage==='card'?s.boss.x:s.mobs.length?s.mobs[0].x:180;
   const seg=s.seg,was=s.stage;a.step(s,{dx:Math.max(-4,Math.min(4,tx-s.player.x)),dy:0});
   if(s.stage==='card'&&!a.SEGMENTS[s.seg].mid){const c=cards[s.seg]=cards[s.seg]||{need:!!a.laserCard(s),laser:0,notes:0,startHp:1,startTick:-1};
    if(s.special&&s.special.kind==='laser'&&s.special.cycle===0){if(!c.laser){c.startHp=s.boss.hp/s.boss.maxHp;c.startTick=s.segTick;}c.laser++;}
    for(const l of s.lasers)if(l.age===1&&l.rl)c.notes++;}
   h.clear(s);}
  assert.equal(s.stage,'won',`${d} stage ${stage}`);
  const list=Object.values(cards),need=list.filter(c=>c.need);assert(need.length>=2,`${d} stage ${stage}: laser phases ${need.length}`);
  for(const c of need){assert(c.laser>=a.SP_LEN[d]-2,`${d} stage ${stage}: the section ran ${c.laser} of ${a.SP_LEN[d]} ticks`);assert(c.notes>=4,'beams '+c.notes);
   assert(c.startTick<=a.SP_START+1,'no later than the usual 16 seconds');if(c.startTick<a.SP_START-5){early++;assert(c.startHp<=a.RL_HP+.02,'opened early only because the boss was at half health: '+c.startHp);assert(c.startTick>=a.RL_EARLIEST,'never before the boss has shown its own attack');}}
  if(d!=='gentle')assert(list.some(c=>!c.need),'other phases stay as they were');
 }
});

test('notes are full-length solid beams announced two beats ahead (three on easy) that light exactly on the beat, laid back',()=>{
 for(const d of DIFFS)for(const name of R.MOTIFS){const s=motifRun(d,name,200,560);let beat0=-1,fired=0;const WB=d==='gentle'?3:2;
  run(s,a.SP_LEAD+a.SP_LEN[d]+150,t=>{if(t.special&&beat0<0)beat0=t.special.start;
   for(const l of notes(t)){assert(l.full&&l.solid&&l.keep,'edge to edge, whole width hits, never regrouped');assert.equal(l.rl,name);
    assert(vertical(l)||Math.abs(l.angle)<1e-9,'lanes or rows only');
    if(l.age===1){assert(l.warn>=WB*a.SP_BEAT,`${d} ${name}: warned ${l.warn} ticks`);assert(l.warn<=(WB+.5)*a.SP_BEAT+1e-9||name==='climb','only the rising rows are shown further ahead (all at once, from the floor up)');}
    if(l.age===l.warn){fired++;const off=(t.tick+1-beat0-a.SP_LAYBACK[d])%(a.SP_BEAT/2);assert.equal(off,0,`${d} ${name}: lights on the beat or the half beat (off by ${off})`);}}
   assert(t.lasers.length<=a.LASER_CAP-4,'well under the laser cap: '+t.lasers.length);});
  assert(fired>=(d==='gentle'?3:5),`${d} ${name} fired ${fired}`);}
});

test('there is always somewhere to stand, and what must be crossed in one beat is never more than a lane',()=>{
 for(const d of DIFFS)for(const name of R.MOTIFS){const s=motifRun(d,name,150,560);
  run(s,a.SP_LEAD+a.SP_LEN[d]+150,t=>{const L=notes(t).filter(lit);if(!L.length)return;
   // 세로 음표가 덮지 않은 x 구간과 가로 음표가 덮지 않은 y 구간이 늘 남는다
   const free=(list,lo,hi)=>{const iv=list.map(span).sort((p,q)=>p[0]-q[0]);let at=lo,best=0;for(const [p,q] of iv){best=Math.max(best,p-at);at=Math.max(at,q);}return Math.max(best,hi-at);};
   const fx=free(L.filter(vertical),0,a.WIDTH),fy=free(L.filter(l=>!vertical(l)),R.TOP,a.HEIGHT);
   assert(fx>=LANE-1e-6,`${d} ${name}: open width ${fx}`);assert(fy>=R.BAND-1e-6,`${d} ${name}: open height ${fy}`);});}
});

test('left-right trill: the halves alternate on the beat around the lane edge nearest the hero, starting on the hero\'s side',()=>{
 for(const d of DIFFS)for(const x of [40,170,310]){const s=motifRun(d,'trill',x),sides=[];
  run(s,a.SP_LEAD+7*a.SP_BEAT+10,t=>{for(const l of notes(t))if(l.age===1){const [lo,hi]=span(l);assert(Math.abs(lo)<1e-6||Math.abs(hi-a.WIDTH)<1e-6);const split=Math.abs(lo)<1e-6?hi:lo;assert(split>=2*LANE-1e-6&&split<=4*LANE+1e-6);assert(Math.abs(split/LANE-Math.round(split/LANE))<1e-6);sides.push(Math.abs(lo)<1e-6?'L':'R');}});
  assert(sides.length>=3,d+' '+sides);assert.equal(sides[0],x<180?'L':'R','first note where the hero stands');for(let i=1;i<sides.length;i++)assert.notEqual(sides[i],sides[i-1]);}
});

test('jangdan: kung lights the left half, deok the right, dung both ends; sides never switch within a beat, and off-beats appear on every difficulty but easy',()=>{
 for(const d of DIFFS){const s=motifRun(d,'jangdan',180),hits=[];let beat0=-1;
  run(s,a.SP_LEAD+12*a.SP_BEAT,t=>{if(t.special&&beat0<0)beat0=t.special.start;for(const l of notes(t))if(l.age===l.warn&&!l.mute){const [lo,hi]=span(l);
   if(l.tone==='k'){assert(Math.abs(lo)<1e-6&&Math.abs(hi-180)<1e-6);}else if(l.tone==='t'){assert(Math.abs(lo-180)<1e-6&&Math.abs(hi-360)<1e-6);}else assert.equal(l.tone,'d');
   hits.push({tone:l.tone,at:t.tick+1-beat0-a.SP_LAYBACK[d]});}});
  assert.equal(hits[0].tone,'d','a bar opens with dung');assert(hits.some(x=>x.tone==='k')&&hits.some(x=>x.tone==='t'));
  const sides=hits.filter(x=>x.tone!=='d');for(let i=1;i<sides.length;i++)if(sides[i].tone!==sides[i-1].tone)assert(sides[i].at-sides[i-1].at>=a.SP_BEAT*(d==='hell'?1:2),`${d}: switch after ${sides[i].at-sides[i-1].at}`);
  const off=hits.filter(x=>x.at%a.SP_BEAT!==0).length;if(d==='gentle')assert.equal(off,0);else assert(off>=1,d+' syncopation');}
 for(const p of R.JANGDAN)assert.equal(p.length,16);
});

test('rising beat: rows light from the floor upward one per beat and clear together, then rows come down from the top',()=>{
 for(const d of DIFFS){const s=motifRun(d,'climb',180,600),up=[],down=[];
  run(s,a.SP_LEAD+8*a.SP_BEAT,t=>{for(const l of notes(t))if(l.age===l.warn){assert(!vertical(l));(l.y>a.HEIGHT/2?up:down).push({y:l.y,tick:t.tick,off:t.tick+l.active,w:r6(l.width)});}});
  const n={gentle:2,normal:3,hell:4}[d];assert.equal(up.length,n,d);
  for(let i=0;i<n;i++){assert.equal(up[i].w,R.BAND);assert.equal(up[i].y,a.HEIGHT-R.BAND*(i+.5));if(i){assert.equal(up[i].tick-up[i-1].tick,a.SP_BEAT);assert.equal(up[i].off,up[0].off);}}
  assert(a.HEIGHT-R.BAND*n>=384,'the top is always free');
  assert(down.length>=1,d+' rows from the top');assert(down[0].tick>=up[0].off,'they start once the floor has cleared');for(let i=1;i<down.length;i++)assert(down[i].y>down[i-1].y);
  assert(down[down.length-1].y+R.BAND/2<a.HEIGHT-R.BAND*n,'a band stays open between the two');}
});

test('follow the path: an open corridor of two lanes (three on easy) that holds the hero at first and shifts one lane at a time',()=>{
 for(const d of DIFFS)for(const x of [20,200,345]){const s=motifRun(d,'slide',x),w=d==='gentle'?3:2;let prev=null,steps=0,first=true;
  run(s,a.SP_LEAD+10*a.SP_BEAT,t=>{const L=notes(t).filter(lit);if(!L.length)return;const shut=new Array(R.LANES).fill(false);
   for(const l of L){const [lo,hi]=span(l);for(let j=Math.round(lo/LANE);j<Math.round(hi/LANE);j++)shut[j]=true;}
   const open=[];shut.forEach((v,j)=>{if(!v)open.push(j);});assert(open.length>=w&&open[open.length-1]-open[0]===open.length-1,`${d}: open lanes ${open}`);
   if(first){first=false;assert(open.includes(Math.floor(x/LANE)),'the corridor starts on the hero');}
   const key=open.join();if(prev!==null&&key!==prev)steps++;if(prev!==null){const p0=+prev.split(',')[0];assert(Math.abs(open[0]-p0)<=1,'one lane at a time');}prev=key;});
  assert(steps>=(d==='gentle'?2:3),`${d} x${x}: moved ${steps} times`);}
});

test('squeeze and release: walls close in from both sides, then the centre is struck a beat after they let go (two beats on easy)',()=>{
 for(const d of DIFFS){const s=motifRun(d,'squeeze',180),ev=[];
  run(s,a.SP_LEAD+((d==='gentle'?3:2)+6.5)*a.SP_BEAT,t=>{for(const l of notes(t))if(l.age===l.warn){const [lo,hi]=span(l);ev.push({lo,hi,on:t.tick,off:t.tick+l.active});}});
  const outer=ev.filter(e=>e.hi-e.lo===LANE&&(e.lo===0||e.hi===a.WIDTH)),inner=ev.filter(e=>e.hi-e.lo===LANE&&(e.lo===LANE||e.hi===a.WIDTH-LANE)),mid=ev.filter(e=>e.lo===2*LANE&&e.hi===4*LANE);
  assert.equal(outer.length,2);assert.equal(inner.length,2);assert.equal(mid.length,1);
  assert.equal(inner[0].on-outer[0].on,a.SP_BEAT);assert.equal(inner[0].off,outer[0].off,'they let go together');
  assert.equal(mid[0].on-outer[0].off,a.SP_BEAT*(d==='gentle'?2:1));}
});

test('off-beat tag: the melody skips across lanes on the beat and the off-beat note lands on the hero\'s lane',()=>{
 for(const d of DIFFS){const s=motifRun(d,'swing',200);let beat0=-1,on=[],off=[];
  run(s,a.SP_LEAD+9*a.SP_BEAT,t=>{if(t.special&&beat0<0)beat0=t.special.start;for(const l of notes(t))if(l.age===l.warn){const [lo,hi]=span(l);assert(Math.abs(hi-lo-LANE)<1e-6);((t.tick+1-beat0-a.SP_LAYBACK[d])%a.SP_BEAT?off:on).push(Math.round(lo/LANE));}},()=>({dx:0,dy:0}));
  assert(on.length>=5&&new Set(on).size>=5,d+' melody '+on);assert(off.length>=(d==='hell'?5:2),d+' off-beats '+off);assert(off.every(j=>j===3),'the hero stood in lane 3: '+off);}
});

test('a bot that sees only the warnings and moves at keyboard speed gets through every rhythm chart untouched',()=>{
 // 4px 격자 위에서 58틱 앞까지 닿을 수 있는 자리를 넓혀 가며(4.2px/틱 이하, 상하좌우) 피한다. 판정은 4px·3틱 넉넉히 잡는다.
 const G=4,NX=91,Y0=124,NY=128,HZ=58,M=4,TM=3;
 function plan(s){if(!s.lasers.length)return {dx:0,dy:0};const p=s.player,N=NX*NY;let cur=new Uint8Array(N);const back=[];
  cur[Math.max(0,Math.min(NY-1,Math.round((p.y-Y0)/G)))*NX+Math.max(0,Math.min(NX-1,Math.round(p.x/G)))]=1;
  for(let tau=1;tau<=HZ;tau++){const L=s.lasers.filter(l=>{const g=l.age+tau;return g>=l.warn-TM&&g<l.warn+l.active+TM;}),m=new Uint8Array(N).fill(1);
   for(const l of L){const hw=l.width*.5*(l.solid?1:a.BEAM_HIT)+p.r+M;if(vertical(l)){for(let i=0;i<NX;i++)if(Math.abs(i*G-l.x)<hw)for(let j=0;j<NY;j++)m[j*NX+i]=0;}
    else if(Math.abs(l.angle)<1e-9){for(let j=0;j<NY;j++)if(Math.abs(Y0+j*G-l.y)<hw)m.fill(0,j*NX,j*NX+NX);}
    else{const c=Math.cos(l.angle),sn=Math.sin(l.angle);for(let j=0;j<NY;j++)for(let i=0;i<NX;i++)if(Math.abs((i*G-l.x)*sn-(Y0+j*G-l.y)*c)<hw)m[j*NX+i]=0;}}
   const nxt=new Uint8Array(N),bk=new Int32Array(N).fill(-1);let any=false;
   for(let k=0;k<N;k++){if(!m[k])continue;const i=k%NX;if(cur[k])bk[k]=k;else if(i>0&&cur[k-1])bk[k]=k-1;else if(i<NX-1&&cur[k+1])bk[k]=k+1;else if(k>=NX&&cur[k-NX])bk[k]=k-NX;else if(k<N-NX&&cur[k+NX])bk[k]=k+NX;else continue;nxt[k]=1;any=true;}
   if(!any)return {dx:0,dy:0,stuck:true};back.push(bk);cur=nxt;}
  const pend=s.lasers.filter(l=>l.age+HZ<l.warn+l.active);let best=-1,bs=1e18;
  for(let k=0;k<N;k++){if(!cur[k])continue;const x=(k%NX)*G,y=Y0+Math.floor(k/NX)*G;let v=Math.abs(x-p.x)+Math.abs(y-p.y)+Math.abs(y-540)*.15+Math.abs(x-180)*.05;
   for(const l of pend){const mid=vertical(l)?x-l.x:y-l.y;if(Math.abs(mid)<l.width/2+p.r+10)v+=400;}if(v<bs){bs=v;best=k;}}
  let k=best;for(let tau=back.length-1;tau>=1;tau--)k=back[tau][k];
  let dx=(k%NX)*G-p.x,dy=Y0+Math.floor(k/NX)*G-p.y;const dd=Math.hypot(dx,dy);if(dd>4.2){dx*=4.2/dd;dy*=4.2/dd;}return {dx,dy};}
 for(const d of DIFFS)R.MOTIFS.forEach((name,mi)=>{const [x,y]=(mi+DIFFS.indexOf(d))%2?[20,560]:[300,260],s=motifRun(d,name,x,y);let hits=0,stuck=0;
  for(let i=0;i<a.SP_LEAD+a.SP_LEN[d]+150&&s.stage==='card';i++){s.boss.hp=s.boss.maxHp;s.bombs=0;s.player.hp=9;const h0=s.hits,pl=plan(s);if(pl.stuck)stuck++;a.step(s,pl);if(s.hits>h0)hits++;h.clear(s);}
  assert.equal(hits,0,`${d} ${name} from ${x},${y}: hit ${hits} times (no way out seen ${stuck} times)`);});
});

test('the page loads the rhythm module before the engine, the app draws and voices the notes, and every note sound exists',()=>{
 const html=h.read('arcade.html'),app=h.read('src/arcade-app-v43.js');
 assert(html.indexOf('src/arcade-laser-rhythm-v43.js')>0&&html.indexOf('src/arcade-laser-rhythm-v43.js')<html.indexOf('src/arcade-v43.js?'));
 assert.match(app,/Rhythm\.draw\(ctx,s,/);assert.match(app,/Rhythm\.sounds\(s,play\)/);assert.match(app,/Rhythm\.drawBeats\(ctx,s,/);
 for(const tone of ['k','t','d',0,1,2,3,4,7])assert(Audio.CUES[R.cueOf({tone})],'cue for '+tone);
 for(const name of R.MOTIFS){assert(R.INFO[name].name&&R.INFO[name].why);assert(a.LASER_POOL.includes(name));}
 // 그리기는 판정과 무관하고, 음표가 있을 때만 그린다
 const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(k==='createLinearGradient'?()=>({addColorStop(){}}):(...x)=>{calls.push(k);}),set:(o,k,v)=>{o[k]=v;return true;}});
 const s=motifRun('normal','jangdan',180);run(s,a.SP_LEAD+75);const snap=JSON.stringify(s.lasers);
 for(const phase of ['under','over'])R.draw(ctx,s,{COLORS:{0:'#ff3b4e',4:'#2fd0ff'},W:a.WIDTH,H:a.HEIGHT,fade:a.BEAM_FADE,phase});R.drawBeats(ctx,s,{W:a.WIDTH,H:a.HEIGHT});
 assert(calls.includes('fillRect')&&calls.includes('arc'));assert.equal(JSON.stringify(s.lasers),snap,'drawing changes nothing');
 const played=[];run(s,60,t=>{R.sounds(t,(cue,x)=>played.push(cue));});assert(played.length>=1&&played.every(c=>Audio.CUES[c]),played.join());
});
