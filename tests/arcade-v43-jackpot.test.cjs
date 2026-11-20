'use strict';
/* 사용자 11-20 12:42 KST: "중간보스 잡으면 하트를 난이도에 맞게 주고 보스를 잡으면 난이도+점수에 맞게 하트를 많이 주도록(잭팟느낌나게)".
   하트(점수 아이템)를 격파 순간 한꺼번에 준다: 중간보스는 난이도별 몇 개, 보스는 난이도 기본 + 지금 점수에 따른 덤. 화면은 하트가 솟구쳐 영웅에게 쏟아진다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const A=h.need();
function lastCardOf(pred){for(let i=0;i<A.SEGMENTS.length;i++){const g=A.SEGMENTS[i],n=A.SEGMENTS[i+1];if(g.kind==='card'&&pred(g)&&(!n||n.kind!=='card'||n.actor!==g.actor))return i;}return -1;}
function defeatAt(seg,opt){const s=A.createRun(Object.assign({difficulty:'normal',seed:4,segment:seg,stages:1},opt));
 for(let t=0;t<4000&&!(s.stage==='card'&&s.seg===seg&&s.boss.present);t++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});}
 assert.equal(s.seg,seg);s.events.length=0;let found=null;
 for(let t=0;t<2400&&!found;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card'&&s.seg===seg&&!s.cardDown&&!s.cardEnding)s.boss.hp=0;const before=s.score;A.step(s,{});if(s.events.includes('jackpot'))found={s,before};s.events.length=0;}
 return found;}

test('jackpot count: midbosses by difficulty, bosses by difficulty plus score',()=>{
 const run=(d,score)=>{const s=A.createRun({difficulty:d,seed:1});s.score=score||0;return s;};
 const mid=['gentle','normal','hell'].map(d=>A.jackpotCount(run(d),true)),boss=['gentle','normal','hell'].map(d=>A.jackpotCount(run(d),false));
 assert(mid[0]>0&&mid[0]<mid[1]&&mid[1]<mid[2],'midboss hearts rise with difficulty '+mid);
 assert(boss[0]<boss[1]&&boss[1]<boss[2],'boss hearts rise with difficulty '+boss);
 for(let i=0;i<3;i++)assert(boss[i]>=2*mid[i],'a boss gives at least twice a midboss');
 const lo=A.jackpotCount(run('normal',0),false),hi=A.jackpotCount(run('normal',30e6),false),huge=A.jackpotCount(run('normal',1e12),false);
 assert(hi>lo,'a higher score pays more hearts');assert(huge<=A.JACKPOT_BOSS.hell+A.JACKPOT_SCORE_MAX,'capped');
});

test('defeating a midboss pays its jackpot once, worth the top heart value',()=>{
 const seg=lastCardOf(g=>g.mid);assert(seg>=0);const r=defeatAt(seg);assert(r,'jackpot event fired');
 const j=r.s.lastJackpot;assert.equal(j.mid,true);assert.equal(j.n,A.JACKPOT_MID.normal);assert.equal(j.total,j.n*j.worth);assert(j.worth>=500);
 assert(r.s.score-r.before>=j.total,'score includes the jackpot');assert.equal(r.s.jackpots,1);
});

test('defeating a main boss pays a bigger jackpot that grows with score, and only on its last pattern',()=>{
 const seg=lastCardOf(g=>!g.mid);const r=defeatAt(seg);assert(r);const j=r.s.lastJackpot;assert.equal(j.mid,false);
 assert(j.n>=A.JACKPOT_BOSS.normal);assert(Number.isFinite(j.x)&&Number.isFinite(j.y));
 // 같은 보스의 앞 패턴을 깨면 잭팟이 없다
 const first=A.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid&&g.actor===A.SEGMENTS[seg].actor);assert(first<seg);
 const s=A.createRun({difficulty:'normal',seed:4,segment:first,stages:1});let fired=0;
 for(let t=0;t<6000&&s.seg===first;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card'&&s.seg===first&&!s.cardDown&&!s.cardEnding)s.boss.hp=0;A.step(s,{});if(s.events.includes('jackpot'))fired++;s.events.length=0;}
 assert.equal(fired,0);
});

test('hell pays more than gentle for the same boss, spell practice pays none',()=>{
 const seg=lastCardOf(g=>!g.mid);const g=defeatAt(seg,{difficulty:'gentle'}),hl=defeatAt(seg,{difficulty:'hell'});
 assert(hl.s.lastJackpot.n>g.s.lastJackpot.n);
 const p=A.createRun({difficulty:'normal',seed:4,segment:seg,spellOnly:true});let fired=0;
 for(let t=0;t<6000&&p.stage!=='won'&&p.stage!=='lost';t++){p.player.invulnerableUntil=p.tick+999;if(p.stage==='card'&&!p.cardDown&&!p.cardEnding)p.boss.hp=0;A.step(p,{});if(p.events.includes('jackpot'))fired++;p.events.length=0;}
 assert.equal(fired,0);
});

test('the presentation layer pours the jackpot hearts to the hero',()=>{
 const sp=h.read('src/arcade-spirit-v43.js'),app=h.read('src/arcade-app-v43.js');
 assert(/e==='jackpot'/.test(sp)&&/function drawJackpot\(/.test(sp),'spirit layer reacts to the event and draws the hearts');
 assert(/Spirit\.useSound\(play\)/.test(app),'sounds can follow each heart');
 assert(/heart:itemSprites\[0\]/.test(app),'the hearts keep the pickup shape');
});
