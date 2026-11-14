'use strict';
/* 사용자 11-14 23:33·23:34 KST: "스테이지넘어가면 모든체력복구", "보스뒤에나오는 육망성문양키워서 레이저패턴화 - 보스마다 문양패턴다르게",
   "지금 보스뒤 육망성이 돌아가잖아 그런것처럼 신규 레이저패턴도 원들이 돌아가는것", "보스고유색느낌 탄색변화", "단순도형느낌탄보다는 그라데이션 미술효과". */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 refill: every difficulty restores all lives when the next stage begins',()=>{
 const d=h.need().DIFFICULTY;for(const k of ['gentle','normal','hell'])assert.equal(d[k].mapHeal,-1,k);
});

function sigilsOf(a,i,ticks){
 const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1}),seen=[];
 for(let t=0;t<ticks&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
  for(const f of s.figures)if(f.sigil)seen.push({glyph:f.glyph,r:f.r,spin:f.spin,cx:f.cx,cy:f.cy,bx:s.boss.x,by:s.boss.y,segs:a.figureSegments(f),age:f.age,warn:f.warn});}
 return seen;
}

test('v43 sigil lasers: each boss spell raises a large turning sigil (its own glyph plus a broken ring) centred on the boss',()=>{
 const a=h.need(),firsts=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!firsts.has(g.actor)&&firsts.size<12)firsts.set(g.actor,i);});
 const glyphs=new Set();
 for(const [actor,i] of firsts){const seen=sigilsOf(a,i,900);assert(seen.length,actor+' raises a sigil');
  const own=seen.filter(f=>f.glyph===a.SIGNATURES[actor].glyph);assert(own.length,actor+' sigil uses its own glyph '+a.SIGNATURES[actor].glyph);
  assert(seen.some(f=>/^ring/.test(f.glyph)),actor+' has a turning broken ring');
  const reach=f=>Math.max(...f.segs.flatMap(g=>[Math.hypot(g[0]-f.cx,g[1]-f.cy),Math.hypot(g[2]-f.cx,g[3]-f.cy)]));
  assert(seen.every(f=>reach(f)>=100),actor+' sigil is large: '+Math.min(...seen.map(reach)).toFixed(0)+'px');
  assert(seen.every(f=>Math.hypot(f.cx-f.bx,f.cy-f.by)<1),actor+' sigil stays centred on the boss');
  const turns=new Set(seen.filter(f=>f.glyph===a.SIGNATURES[actor].glyph).map(f=>f.spin));assert([...turns].every(v=>v!==0),actor+' sigil turns');
  glyphs.add(a.SIGNATURES[actor].glyph);}
 assert(glyphs.size>=9,'bosses use different sigils: '+[...glyphs].join(','));
});

test('v43 sigil lasers are fair: they warn first and never reach the lower half where the hero lives',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);const seen=sigilsOf(a,i,900);assert(seen.length);
 assert(seen.every(f=>f.warn>=50),'warning time');
 for(const f of seen)for(const g of f.segs)assert(Math.max(g[1],g[3])<a.HEIGHT*.55,'sigil segment reaches y '+Math.max(g[1],g[3]).toFixed(0));
});

test('v43 bullet art: bullets take on the boss colour in a gradient halo and rim band, rebuilt when the boss changes',()=>{
 const app=h.read('src/arcade-app-v43.js');
 const orb=/function buildOrb[\s\S]*?\n  \}/.exec(app)[0];assert(/tint/.test(orb),'orb sprites take a boss tint');
 assert(/function bossTint\(/.test(app),'boss tint comes from the boss colours');
 assert(/orbTint!==/.test(app),'orb sprites are rebuilt when the boss tint changes');
 const a=h.need();assert.deepEqual(a.SIZE_RADIUS,[4,6,10,3.2,15,14],'hit radii are unchanged');
});
