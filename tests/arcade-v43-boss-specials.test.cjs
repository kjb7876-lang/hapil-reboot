'use strict';
// 보스전 특수 페이즈와 중앙 견제(사용자 11-18): 레이저만 / 그림만 / 무자비 테트리스 / 솟는 바위, 레이백 장단, 중앙 버티기 견제.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function bossRun(difficulty,stage,seed){const g=a.STAGES[stage||8];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card'||a.SEGMENTS[seg].mid)seg++;const s=a.createRun({difficulty,seed:seed||3,segment:seg,entranceAll:true});toCard(s);return s;}
function kindRun(difficulty,kind,compact=false){for(let st=0;st<a.STAGES.length;st++){const g=a.STAGES[st];let seg=g.first;while(a.SEGMENTS[seg]&&a.SEGMENTS[seg].kind!=='card'||(a.SEGMENTS[seg]&&a.SEGMENTS[seg].mid))seg++;if(!a.SEGMENTS[seg]||a.SEGMENTS[seg].stage!==st)continue;
 if(a.SP_ORDER[(st*3+seg)%a.SP_ORDER.length]===kind){const s=a.createRun({difficulty,seed:3,segment:seg,entranceAll:true,compact});toCard(s);if(a.spStart(s)<0)continue;s.segTick=a.spStart(s)-a.SP_LEAD-5;return s;}}throw new Error(kind);}
function toCard(s){for(let i=0;i<3000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');s.segTick=0;}
// 사용자 11-20: 특수 페이즈는 지난 탄이 다 빠져나갈 때까지 시작을 미룬다(s.spHold). 미룬 틱은 관찰 시간에서 빼고 센다
function go(s,ticks,each,x){let held=0;for(let i=0;i<ticks+held&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;if(x!==undefined)s.player.x=x;const h0=s.spHold||0;a.step(s,{dx:0,dy:0});if((s.spHold||0)>h0){held++;h.clear(s);continue;}if(each)each(s,i-held);h.clear(s);}return s;}
const DIFFS=['gentle','normal','hell'],COVER={gentle:.7,normal:.8,hell:.9};

test('every difficulty gets all four special phases, and normal firing is silent while one runs',()=>{
 for(const d of DIFFS)for(const kind of a.SP_KINDS){
  const s=kindRun(d,kind);let active=0,maxN=0;
  go(s,a.SP_LEAD+a.SP_LEN[d]+10,t=>{if(t.special&&t.special.kind===kind){active++;maxN=Math.max(maxN,t.n);}});
  assert(active>=a.SP_LEN[d]-5,`${d} ${kind} active ${active}`);assert.equal(maxN,0,`${d} ${kind}: no bullets while it runs`);assert.equal(s.special,null,'ends');
 }
});
test('laser phase: beams only, always a gap, within the laser cap; harder difficulty has a narrower gap',()=>{
 const open={};
 for(const d of DIFFS){
  // 빗살(황금비): 여섯 줄 가운데 늘 길이 열려 있고, 어려울수록 열린 길이 좁다
  let s=kindRun(d,'laser');s.sp.force='comb';let beams=0,combs=[];
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{t.sp.force='comb';assert(t.lasers.length<=a.LASER_CAP);const born=t.lasers.filter(l=>l.age===1);
   const cols=born.filter(l=>l.rl==='comb'&&Math.abs(l.angle-Math.PI/2)<1e-9&&l.y===-12);if(cols.length>1)combs.push(cols.length);beams+=born.length;});
  assert(beams>=6,`${d} beams ${beams}`);assert(combs.length>=1,'combs');assert(combs.every(n=>n<=5),`${d}: a lane is always open (${combs})`);open[d]=Math.max(...combs);
  // 화면 덮기(사용자 11-19, 이지 70·노멀 80·헬 90%): 띠가 덮은 폭이 그 비율을 넘지 않고 틈이 남는다
  s=kindRun(d,'laser');let covers=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{t.sp.force='cover';const solid=t.lasers.filter(l=>l.age===1&&l.rl==='cover');if(!solid.length)return;covers++;
   const vert=solid[0].y===-12,span=vert?a.WIDTH:a.HEIGHT-120,covered=solid.reduce((m,l)=>m+l.width*t.rules.beam,0);assert(covered<=span*COVER[d]+1e-6,`${d} covered ${covered}/${span}`);assert(span-covered>=span*(1-COVER[d])-1e-6,d+' gap');});
  assert(covers>=1,d+' covers');
  // 무늬를 고르지 않아도 상한 안
  s=kindRun(d,'laser');go(s,a.SP_LEAD+a.SP_LEN[d],t=>{assert(t.lasers.length<=a.LASER_CAP);});}
 assert(open.gentle<=open.normal,JSON.stringify(open));
});
test('on phones the rhythm notes give one more beat of warning and the open paths are wider',()=>{
 for(const d of DIFFS){
  const first=(compact,motif)=>{
   const s=kindRun(d,'laser',compact);s.sp.force=motif;let notes=null;
   go(s,a.SP_LEAD+130,t=>{
    const born=t.lasers.filter(l=>l.age===1&&l.rl===motif);
    if(born.length&&!notes)notes={warn:born[0].warn,active:born[0].active,covered:born.reduce((sum,l)=>sum+l.width,0),
      gap:t.coverGap&&t.coverGap.hi-t.coverGap.lo};
   });
   assert(notes,d+' '+motif);return notes;
  };
  const pc=first(false,'slide'),phone=first(true,'slide');
  assert.equal(phone.warn,pc.warn+30,d+' warning');
  assert(phone.covered<pc.covered,d+' moving corridor');
  assert(first(true,'trill').active<first(false,'trill').active,d+' shorter active note');
  assert(first(true,'cover').gap>first(false,'cover').gap,d+' a wider marked escape path');
 }
});

test('rayback: the beat sounds first and the attack lands LAYBACK ticks behind it (laid back more on easy)',()=>{
 for(const d of DIFFS){const s=kindRun(d,'laser');let beatTick=-1,lags=[];
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{if(t.events.includes('grooveBeat')||t.events.includes('grooveAccent'))beatTick=t.tick;
   if(t.lasers.some(l=>l.age===1)&&beatTick>=0){lags.push(t.tick-beatTick);beatTick=-1;}});
  assert(lags.length>=3,d);assert(lags.every(l=>l===a.SP_LAYBACK[d]),`${d} lags ${lags}`);}
 assert(a.SP_LAYBACK.gentle>a.SP_LAYBACK.normal&&a.SP_LAYBACK.normal>a.SP_LAYBACK.hell&&a.SP_LAYBACK.hell>=2);
});
test('drawing phase: many ink drawings, capped per difficulty, entering from the per-difficulty sides',()=>{
 const most={},dirs={};
 for(const d of DIFFS){const s=kindRun(d,'drawing');dirs[d]=new Set();let m=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{const live=(t.risers||[]).filter(r=>!r.fade);m=Math.max(m,live.length);live.forEach(r=>{if(r.dir!=='spit')dirs[d].add(r.dir);});});most[d]=m;}
 assert(most.gentle>=2&&most.gentle<=6&&most.normal>=3&&most.normal<=11&&most.hell>=4&&most.hell<=13&&most.hell>most.gentle,JSON.stringify(most));
 assert.deepEqual([...dirs.gentle],['down']);assert(dirs.hell.size>=3,[...dirs.hell].join());
});
test('tetris phase: relentless pieces, more at once on harder levels, and they can be shot apart',()=>{
 const most={};
 for(const d of DIFFS){const s=kindRun(d,'tetris');let m=0,dropped0=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{if(t.special&&!dropped0)dropped0=t.floor.dropped;m=Math.max(m,t.floor.pieces.length);});most[d]=m;
  assert(s.floor.dropped>=(d==='gentle'?3:6),`${d} dropped ${s.floor.dropped}`);go(s,700);assert(s.floor.grid.every(v=>!v)||s.floor.clearing===1||s.sp.drain,'the stack is scheduled to drain (and the flag survives a card change)');}
 assert(most.gentle<=3&&most.normal<=5&&most.hell<=7&&most.hell>most.gentle,JSON.stringify(most));
 const s=kindRun('normal','tetris');go(s,a.SP_LEAD+200);const piece=s.floor.pieces[0];assert(piece,'a piece is falling');
 const broken=s.floor.broken;s.player.x=(piece.col+piece.cells[0][0]+.5)*a.FLOOR_CELL;s.player.y=a.HEIGHT-30;
 for(let i=0;i<300&&s.floor.pieces.includes(piece);i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
 assert(s.floor.broken>broken||!s.floor.pieces.includes(piece),'a piece goes away');
});
test('piano keys light sooner and leave the last lane clear in both directions',()=>{
 const kw=a.WIDTH/8;
 for(const difficulty of DIFFS){
  const s=kindRun(difficulty,'laser');
  s.sp.force='piano';
  const bars=new Map();
  go(s,a.SP_LEAD+a.SP_LEN[difficulty],t=>{
   const n=t.beat?.n;
   if(n===undefined||t.special?.kind!=='laser')return;
   const bar=n>>3,pos=n%8,up=(bar+t.sp.cycle)%2===0,safe=up?7:0;
   if(!bars.has(bar))bars.set(bar,new Set());
   for(const l of t.lasers.filter(l=>l.rl==='piano'&&l.age===1)){
    const key=Math.floor(l.x/kw);
    assert.notEqual(key,safe,'the last lane is free even during chords');
    assert.notEqual(pos,7,'the final beat is a rest');
    assert.equal(l.warn,Math.round(32*t.rules.warn)+a.LASER_MORE);
    bars.get(bar).add(key);
   }
  });
  assert.deepEqual([...bars.get(0)].sort(),[0,1,2,3,4,5,6]);
  assert(bars.get(1).size>=5&&bars.get(1).has(7),'the next bar fires in the reverse direction');
 }
});
test('stones phase: hills rise from the bottom (never to the top), stones come per-difficulty sides, then sink',()=>{
 for(const d of DIFFS){const s=kindRun(d,'stones');let hill=0,mountains=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{hill=Math.max(hill,...t.floor.hill);mountains=Math.max(mountains,(t.risers||[]).filter(r=>r.kind==='mountain').length);});
  assert(hill>=40&&hill<=110,`${d} hill ${hill}`);assert(mountains>=1,`${d} stones`);
  for(let i=0;i<300&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{});h.clear(s);}assert(Math.max(...s.floor.hill)<5,'sinks again');}
});
test('centre camping is punished on normal and hell (thick centre beam, then hanja rings, then the hexagram) but not on easy',()=>{
 for(const d of DIFFS)for(const step of [0,1,2]){const s=bossRun(d,0);s.sp.round=step;let guards=0,beams=0,runes=0,sigil=0;
  go(s,a.spStart(s)-a.SP_LEAD-5,t=>{if(t.events.includes('centerGuard'))guards++;
   if(t.lasers.some(l=>l.age===1&&Math.abs(l.x-180)<1&&l.y===-12&&l.width>=30))beams++;
   if(t.figures.some(f=>f.age===1&&f.kind==='runes'))runes++;if(t.figures.some(f=>f.age===1&&f.sigil))sigil++;},180);
  if(d==='gentle'){assert.equal(guards,0);continue;}
  assert(guards>=1,`${d} step ${step} guards ${guards}`);
  if(step===0)assert(beams>=1,'thick centre beam');if(step===1)assert(runes>=1,'hanja rings forced');if(step===2)assert(sigil>=1,'hexagram forced');
 }
 const s=bossRun('hell',0);let g=0;go(s,a.spStart(s)-a.SP_LEAD-5,t=>{if(t.events.includes('centerGuard'))g++;},60);assert.equal(g,0,'edge hero is left alone');
});
test('runs without the full boss flow (entranceAll off) are untouched',()=>{
 const g=a.STAGES[0];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;const s=a.createRun({difficulty:'hell',seed:3,segment:seg});toCard(s);let sp=0;
 go(s,a.spStart(s)+a.SP_LEAD+300,t=>{if(t.special)sp++;},180);assert.equal(sp,0);
});

test('the relentless laser phase comes three times in six, and every boss has its own signature spit',()=>{
 assert.equal(a.SP_ORDER.filter(k=>k==='laser').length,3);assert.equal(a.SP_ORDER.length,6);
 for(const k of a.SP_KINDS)assert(a.SP_ORDER.includes(k),k);
 // 거미 둘은 거미줄을 3방향 부채로
 for(const actor of ['mb_02','mb_24']){const s=bossRun('normal');s.boss.actor=actor;assert.equal(a.spitMotif(s),'web');}
 assert.deepEqual(a.SPIT_FORM.web.slice(0,2),['fan',[3,3,3]]);
 const motifs=new Set();for(const g of a.SEGMENTS){if(g.kind!=='card')continue;const s={boss:{actor:g.actor},stageIndex:g.stage};motifs.add(a.spitMotif(s));}
 assert(motifs.size>=20,'many distinct signatures: '+motifs.size);assert(!motifs.has('glyph'));
});
test('drawing phase: the boss spits its own drawings on the strong beats, flying out from the boss',()=>{
 for(const d of DIFFS){const s=kindRun(d,'drawing');s.boss.actor='mb_02';let fans=[];
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{const born=(t.risers||[]).filter(r=>r.dir==='spit'&&r.age===1);if(born.length)fans.push(born);});
  assert(fans.length>=2,`${d} spits ${fans.length}`);
  for(const f of fans){assert.equal(f.length,3,'three web strands');assert(f.every(r=>r.kind==='web'));
   const ang=f.map(r=>Math.atan2(r.vy,r.vx)).sort((x,y)=>x-y);assert(ang[2]-ang[0]>.9,'spread out');}
 }
 const s=kindRun('hell','drawing');go(s,a.SP_LEAD+a.SP_LEN.hell,t=>{for(const r of t.risers||[])if(r.dir==='spit'&&r.age>a.RISER_WARN+2)assert(Math.hypot(r.vx,r.vy)>1,'spits fly');});
});
test('laser phase cycles through eleven motifs: golden-ratio comb, Gaussian fan, Vitruvian square-then-X, piano keys, screen cover and the six rhythm charts',()=>{
 const seen={},x={n:0};
 for(const d of ['normal','hell'])for(let r=0;r<22;r+=2){const s=kindRun(d,'laser');s.segTick+=r*a.SP_CYCLE; // 여러 회차의 레이저 페이즈(회차·마디마다 무늬가 바뀐다)
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{if(!t.special||t.special.kind!=='laser')return;const born=t.lasers.filter(l=>l.age===1);
   for(const l of born){assert(l.rl,'every laser of the phase is labelled with its motif');seen[l.rl]=(seen[l.rl]||0)+1;}
   if(born.filter(l=>Math.abs(Math.abs(l.angle)-Math.PI/4)<1e-6).length===2)x.n++;});}
 for(const k of a.LASER_POOL)assert(seen[k]>0,k+' '+JSON.stringify(seen));
 assert.equal(a.LASER_POOL.length,11);assert(x.n>0,'the diagonal X');
 for(const k of a.LASER_RHYTHM.MOTIFS)assert(a.LASER_POOL.includes(k),k);
});
test('stones phase interleaves stones and drawings from opposite sides (all four on normal/hell)',()=>{
 for(const d of DIFFS){const s=kindRun(d,'stones');const dirs=new Set();let stones=0,draws=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{for(const r of t.risers||[])if(r.age===1&&r.dir!=='spit'){dirs.add(r.dir);if(r.kind==='mountain')stones++;else draws++;}});
  assert(stones>=1&&draws>=1,`${d} stones ${stones} drawings ${draws}`);
  if(d==='gentle')assert([...dirs].every(x=>x==='up'||x==='down'),[...dirs].join());else assert(dirs.size>=3,`${d} dirs ${[...dirs]}`);}
});
test('during the hexagram and the hanja rings the boss comes down a little below the centre, stays a while, then slowly goes back',()=>{
 const s=bossRun('hell',0);go(s,60);
 const sig={glyph:'hexagram'};s.figures.push({kind:'runes',age:0,warn:60,active:150,rings:[],cx:180,cy:200,turn:0,spin:0,width:10,r:0,follow:true});
 let low=0;go(s,200,t=>{t.figures.forEach(f=>{if(f.kind==='runes')f.age=Math.min(f.age,100);});low=Math.max(low,t.boss.y);},180);
 assert(low>a.HEIGHT/2,'boss y '+low);assert(low<=a.BOSS_DESCEND+a.WOBBLE_Y+1); // 사용자 11-20: 내려와 있는 동안 위아래로 조금(WOBBLE_Y 이내) 흔들린다
 s.figures.length=0;let back=1e9,heldLow=0;
 // 사용자 11-19 "보스가 아래로왔다가 금방위로가고 하니까 정신없어": 문양이 끝나도 DESCEND_HOLD 동안은 아래에 머물렀다가 천천히 올라간다
 go(s,a.DESCEND_HOLD-10,t=>{t.figures.length=0;heldLow=Math.max(heldLow,t.boss.y);});assert(s.boss.y>a.HEIGHT/2-20,'stays down for a while: '+s.boss.y);
 go(s,500,t=>{t.figures.length=0;back=Math.min(back,t.boss.y);},180);assert(back<250,'returns '+back);
});
test('bullets and mobs cleared at a mob → mid-boss → boss change leave ink dissolves instead of vanishing',()=>{
 const g=a.STAGES[1];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;
 const s=a.createRun({difficulty:'normal',seed:3,segment:seg,entranceAll:true});
 for(let i=0;i<30;i++)h.put(s,20+i*10,200);s.mobs.push({x:100,y:120,hp:3});
 s.stage='intro';s.boss.present=false;s.bossEntrance=null;
 // 사용자 11-20 "탄은 시간으로 사라지지 않게": 남은 탄은 제 길로 다 나갈 때까지 입장을 미룬다(지우지 않음). 탄이 빠진 뒤 남은 몹은 먹 번짐으로 사라진다
 assert.equal(a.prepareBossEntrance(s),false);assert.equal(s.n,30,'bullets are left to drain');s.n=0;
 assert.equal(a.prepareBossEntrance(s),true);assert.equal(s.n,0);
 assert(s.inked&&s.inked.length>=4,'ink marks '+(s.inked&&s.inked.length));assert.equal(s.inked[s.inked.length-1],3,'the mob leaves a bigger blot');
 const app=h.read('src/arcade-app-v43.js');assert.match(app,/function drawInks\(\)/);assert.match(app,/drawDrifts\(\);drawInks\(\);/);
});
