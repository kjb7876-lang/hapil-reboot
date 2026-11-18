'use strict';
// 보스전 특수 페이즈와 중앙 견제(사용자 11-18): 레이저만 / 그림만 / 무자비 테트리스 / 솟는 바위, 레이백 장단, 중앙 버티기 견제.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function bossRun(difficulty,stage,seed){const g=a.STAGES[stage||9];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card'||a.SEGMENTS[seg].mid)seg++;const s=a.createRun({difficulty,seed:seed||3,segment:seg,entranceAll:true});toCard(s);return s;}
function kindRun(difficulty,kind){for(let st=0;st<a.STAGES.length;st++){const g=a.STAGES[st];let seg=g.first;while(a.SEGMENTS[seg]&&a.SEGMENTS[seg].kind!=='card'||(a.SEGMENTS[seg]&&a.SEGMENTS[seg].mid))seg++;if(!a.SEGMENTS[seg]||a.SEGMENTS[seg].stage!==st)continue;
 if(a.SP_KINDS[(st*3+seg)%4]===kind){const s=a.createRun({difficulty,seed:3,segment:seg,entranceAll:true});toCard(s);if(a.spStart(s)<0)continue;s.segTick=a.spStart(s)-a.SP_LEAD-5;return s;}}throw new Error(kind);}
function toCard(s){for(let i=0;i<3000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');s.segTick=0;}
function go(s,ticks,each,x){for(let i=0;i<ticks&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;if(x!==undefined)s.player.x=x;a.step(s,{dx:0,dy:0});if(each)each(s,i);h.clear(s);}return s;}
const DIFFS=['gentle','normal','hell'];

test('every difficulty gets all four special phases, and normal firing is silent while one runs',()=>{
 for(const d of DIFFS)for(const kind of a.SP_KINDS){
  const s=kindRun(d,kind);let active=0,maxN=0;
  go(s,a.SP_LEAD+a.SP_LEN[d]+10,t=>{if(t.special&&t.special.kind===kind){active++;maxN=Math.max(maxN,t.n);}});
  assert(active>=a.SP_LEN[d]-5,`${d} ${kind} active ${active}`);assert.equal(maxN,0,`${d} ${kind}: no bullets while it runs`);assert.equal(s.special,null,'ends');
 }
});
test('laser phase: thin beams only, always a gap, within the laser cap; harder difficulty has a narrower gap',()=>{
 const open={};
 for(const d of DIFFS){const s=kindRun(d,'laser');let beams=0,combs=[];
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{assert(t.lasers.length<=a.LASER_CAP);const cols=t.lasers.filter(l=>l.age===1&&Math.abs(l.angle-Math.PI/2)<1e-9&&l.y===-12&&Math.abs(l.x-180)>1);if(cols.length>1){combs.push(cols.length);}beams+=t.lasers.filter(l=>l.age===1).length;});
  assert(beams>=6,`${d} beams ${beams}`);assert(combs.length>=1,'combs');assert(combs.every(n=>n<=5),`${d}: a lane is always open (${combs})`);open[d]=Math.max(...combs);}
 assert(open.gentle<=open.normal,JSON.stringify(open));
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
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{const live=(t.risers||[]).filter(r=>!r.fade);m=Math.max(m,live.length);live.forEach(r=>dirs[d].add(r.dir));});most[d]=m;}
 assert(most.gentle>=2&&most.gentle<=3&&most.normal>=3&&most.normal<=5&&most.hell>=4&&most.hell<=7,JSON.stringify(most));
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
test('stones phase: hills rise from the bottom (never to the top), stones come per-difficulty sides, then sink',()=>{
 for(const d of DIFFS){const s=kindRun(d,'stones');let hill=0,mountains=0;
  go(s,a.SP_LEAD+a.SP_LEN[d],t=>{hill=Math.max(hill,...t.floor.hill);mountains=Math.max(mountains,(t.risers||[]).filter(r=>r.kind==='mountain').length);});
  assert(hill>=40&&hill<=110,`${d} hill ${hill}`);assert(mountains>=1,`${d} stones`);
  go(s,300);assert(Math.max(...s.floor.hill)<5,'sinks again');}
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
