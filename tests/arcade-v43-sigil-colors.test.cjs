'use strict';
/* 사용자 11-14 23:33·23:34 KST: "스테이지넘어가면 모든체력복구", "보스뒤에나오는 육망성문양키워서 레이저패턴화 - 보스마다 문양패턴다르게",
   "지금 보스뒤 육망성이 돌아가잖아 그런것처럼 신규 레이저패턴도 원들이 돌아가는것", "보스고유색느낌 탄색변화", "단순도형느낌탄보다는 그라데이션 미술효과". */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 refill: every difficulty refills all lives at chapter boundaries (사용자 11-20 "한챕터 끝나면 모든 목숨 다 차는걸로")',()=>{
 const d=h.need().DIFFICULTY;for(const k of ['gentle','normal','hell']){assert.equal(d[k].mapHeal,0,k);assert.equal(d[k].partHeal,-1,k);}
});

function sigilsOf(a,i,ticks){
 const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1}),seen=[];
 for(let t=0;t<ticks&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
  for(const f of s.figures)if(f.sigil)seen.push({glyph:f.glyph,r:f.r,spin:f.spin,cx:f.cx,cy:f.cy,bx:s.boss.x,by:s.boss.y,segs:a.figureSegments(f),age:f.age,warn:f.warn});}
 return seen;
}

// 11-15 사용자 새 요청(큰 육망성 하나, 고리 레이저 없음)으로 '보스별 문양 + 끊긴 고리'·'아래 절반 금지' 두 검사는 arcade-v43-big-sigil.test.cjs로 옮겼다.
test('v43 sigil lasers stay centred on the boss and turn',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);const seen=sigilsOf(a,i,900);assert(seen.length);
 assert(seen.every(f=>Math.hypot(f.cx-f.bx,f.cy-f.by)<1),'centred on the boss');assert(seen.every(f=>f.spin!==0),'turns');
 assert(seen.every(f=>f.warn>=50),'warning time');
});

test('v43 bullet art: bullets take on the boss colour in a gradient halo and rim band, rebuilt when the boss changes',()=>{
 const app=h.read('src/arcade-app-v43.js');
 const orb=/function buildOrb[\s\S]*?\n  \}/.exec(app)[0];assert(/tint/.test(orb),'orb sprites take a boss tint');
 assert(/function bossTint\(/.test(app),'boss tint comes from the boss colours');
 assert(/orbTint!==/.test(app),'orb sprites are rebuilt when the boss tint changes');
 const a=h.need();assert.deepEqual(a.SIZE_RADIUS,[4,6,10,3.2,15,14],'hit radii are unchanged');
});
