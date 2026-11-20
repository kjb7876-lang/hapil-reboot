'use strict';
// 레이저 특수 페이즈 마무리(11-18 심사): 비트루비우스 사각 틀과 대각선 X가 함께 켜져 있지 않고, 페이즈가 끝나 일반 탄이 다시 나올 때 특수 페이즈 광선이 남지 않는다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function toCard(s){for(let i=0;i<3000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}s.segTick=0;}
function laserRuns(difficulty){const out=[];for(let st=0;st<a.STAGES.length&&out.length<4;st++){const g=a.STAGES[st];let seg=g.first;while(a.SEGMENTS[seg]&&(a.SEGMENTS[seg].kind!=='card'||a.SEGMENTS[seg].mid))seg++;if(!a.SEGMENTS[seg]||a.SEGMENTS[seg].stage!==st)continue;
  if(a.SP_ORDER[(st*3+seg)%a.SP_ORDER.length]!=='laser')continue;const s=a.createRun({difficulty,seed:5,segment:seg,entranceAll:true});toCard(s);if(s.stage!=='card'||a.spStart(s)<0)continue;s.segTick=a.spStart(s)-a.SP_LEAD-5;out.push(s);}return out;}
const live=l=>l.age>l.warn&&l.age<=l.warn+l.active;
const axis=l=>Math.abs(Math.sin(l.angle))<1e-6||Math.abs(Math.cos(l.angle))<1e-6;
test('laser special: square frame and diagonal X are never live together, and no special beam outlives the phase',()=>{
 let windows=0,xs=0;
 for(const d of ['gentle','normal','hell'])for(const s of laserRuns(d)){
  let was=false,after=false;
  for(let i=0;i<a.SP_LEAD+a.SP_LEN[d]+400&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});
   const on=s.special&&s.special.kind==='laser';
   if(on){const sq=s.lasers.filter(l=>live(l)&&axis(l)&&l.sq),x=s.lasers.filter(l=>live(l)&&!axis(l)&&Math.abs(Math.abs(Math.tan(l.angle))-1)<1e-6);
    if(x.length)xs++;assert(!(sq.length&&x.length),`${d} stage ${s.stageIndex}: square and X overlap at tick ${s.tick}`);}
   if(was&&!on)after=true;
   if(after&&s.n>0){windows++;after=false;const left=s.lasers.filter(l=>l.rl&&l.age>2&&l.age<=l.warn+l.active);/* 특수 페이즈 광선은 무늬 꼬리표(rl)로 고른다(끝난 뒤의 중앙 견제 광선과 구별) */assert.equal(left.length,0,`${d} stage ${s.stageIndex}: ${left.length} special beams still alive when normal fire resumes`);}
   was=!!on;h.clear(s);}
 }
 assert(windows>=3,'windows '+windows);assert(xs>0,'saw the X at least once');
});
