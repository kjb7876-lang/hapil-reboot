'use strict';
/* 사용자 11-20 20:57 KST: "윤서하 수련생 초능력 3단계를 최고단계로하고 11-33프로로 맞춰 대신 하트수집 2배적용하고 보스 클리어시 큰하트가 나오는데
   큰하트는 목숨을 추가로 1개더줘 그리고 레벨업이 2배로 빨라". 서하만: 시간제어 3단계(11·22·33%) 대신 하트 값·잭팟 하트 2배, 보스 격파 큰 하트 = 목숨 +1, 기억 2배. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),{idle,read}=h;
const A=h.need();
function lastCardOf(pred){for(let i=0;i<A.SEGMENTS.length;i++){const g=A.SEGMENTS[i],n=A.SEGMENTS[i+1];if(g.kind==='card'&&pred(g)&&(!n||n.kind!=='card'||n.actor!==g.actor))return i;}return -1;}
function heartAt(s,kind){const p=s.player,i=s.itemCount++;s.ix[i]=p.x;s.iy[i]=p.y;s.ivy[i]=0;s.ikind[i]=kind;s.ilife[i]=0;}

test('Seoha levels up twice as fast; both use the same experience rate; chapter floor still applies',()=>{
 const m=idle({hero:'memory'}),s=idle({hero:'seoha'});A.gainExp(m,50);A.gainExp(s,50);
 assert.equal(m.exp,45);assert.equal(s.exp,90);assert.equal(m.power,1);assert(s.power>=2,'60 exp reached in half the kills');
 assert.equal(A.SEOHA_EXP,2);
});

test('Seoha collects hearts at twice the value; the trainee gets extra charge from bomb hearts',()=>{
 const take=(hero,kind)=>{const s=idle({hero});s.player.y=500;heartAt(s,kind);const sc=s.score,g=s.gauge;A.step(s,{});return {score:s.score-sc,gauge:s.gauge+s.fills*100-g};};
 const m=take('memory',0),s=take('seoha',0);assert(m.score>0);assert.equal(s.score,m.score*2);
 const mb=take('memory',1),sb=take('seoha',1);assert.equal(sb.gauge,mb.gauge*1.77);assert.equal(take('seoha-b',1).gauge,mb.gauge);
});

test('jackpot hearts double for Seoha',()=>{
 for(const d of ['gentle','normal','hell'])for(const mid of [true,false]){const m=A.createRun({difficulty:d,seed:1,hero:'memory'}),s=A.createRun({difficulty:d,seed:1,hero:'seoha'});
  assert.equal(A.jackpotCount(s,mid),A.jackpotCount(m,mid)*2,d+' '+mid);}
});

function defeat(seg,hero){const s=A.createRun({difficulty:'normal',seed:4,segment:seg,hero});
 for(let t=0;t<4000&&!(s.stage==='card'&&s.seg===seg&&s.boss.present);t++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});}
 assert.equal(s.seg,seg);s.events.length=0;
 for(let t=0;t<2400;t++){s.player.invulnerableUntil=s.tick+999;s.player.x=20;s.player.y=A.HEIGHT-30;if(s.stage==='card'&&s.seg===seg&&!s.cardDown&&!s.cardEnding)s.boss.hp=0;A.step(s,{});const done=s.events.includes('jackpot');s.events.length=0;if(done)break;}
 const life=[];for(let i=0;i<s.itemCount;i++)if(s.ilife[i])life.push(i);return {s,life};}

test('a boss defeat drops a big heart for Seoha that gives one more life; Memory and midbosses do not',()=>{
 const boss=lastCardOf(g=>!g.mid&&!g.spell),bossSpell=lastCardOf(g=>!g.mid&&g.spell),mid=lastCardOf(g=>g.mid);
 for(const seg of [boss,bossSpell].filter(i=>i>=0)){
  const r=defeat(seg,'seoha');assert.equal(r.life.length,1,'one life heart on seg '+seg);const i=r.life[0];assert.equal(r.s.ikind[i],1,'it is the big heart');
  const s=r.s,p=s.player;p.hp=1;let ev=[];for(let t=0;t<600&&!ev.includes('lifeHeart');t++){const k=[...Array(s.itemCount).keys()].find(j=>s.ilife[j]);if(k!==undefined){p.x=s.ix[k];p.y=s.iy[k];}p.invulnerableUntil=s.tick+999;A.step(s,{});ev=ev.concat(s.events);s.events.length=0;} // 격파 연출(bossClear) 동안은 아이템이 멈춰 있다: 그 뒤 줍는다
  assert.equal(p.hp,2,'one life more '+JSON.stringify({ev:ev.slice(-8),lh:s.lastLifeHeart,max:p.maxHp,st:s.stage}));assert(ev.includes('lifeHeart')&&ev.includes('extend'));assert.equal(s.lastLifeHeart.got,'life');assert.equal(s.lifeHearts,1);
  assert.equal(defeat(seg,'memory').life.length,0,'Memory gets no life heart');}
 if(mid>=0)assert.equal(defeat(mid,'seoha').life.length,0,'midboss: no life heart');
});

test('life heart with full lives turns into a bomb, then score (same order as seal pieces)',()=>{
 const s=idle({hero:'seoha'});s.player.hp=s.player.maxHp;s.bombs=0;A.bigHeartLife(s,0,0);assert.equal(s.lastLifeHeart.got,'bomb');assert.equal(s.bombs,1);
 s.bombs=99;const sc=s.score;A.bigHeartLife(s,0,0);assert.equal(s.lastLifeHeart.got,'score');assert.equal(s.score-sc,10000);
});

test('the app migrates old Seoha settings 1..7 to 1..3 and defaults to the top step',()=>{
 const app=read('src/arcade-app-v43.js'),sp=read('src/arcade-spirit-v43.js');
 assert(/abilitySeoha:3,abilitySeohaB:7,abilityV:4/.test(app),'separate default top steps, settings version 4');
 assert(/k==='abilitySeoha'&&!\(saved\.abilityV>=3\)\)settings\[k\]=Math\.ceil\(settings\[k\]\*SEOHA_MAX\/7\)/.test(app));
 const mig=v=>Math.ceil(v*3/7);assert.deepEqual([0,1,2,3,4,5,6,7].map(mig),[0,1,1,2,2,3,3,3]);
 assert(/e==='lifeHeart'/.test(sp)&&/목숨 \+1/.test(sp),'the life heart is announced on screen');
});
