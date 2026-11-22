'use strict';
/* 사용자 11-20 17:42 KST: "중간보스 -필살기 한개충전 보스-필살기 2개충전 챕터막보스 필살기-3개충전되고 필살기는 최대 7개 -이지 5개 노멀 3개 헬 보관가능하게해줘".
   격파(그 인물의 마지막 패턴) 순간 필살기를 채운다: 중간보스 +1, 보스 +2, 챕터(부) 막보스 +3. 보관 최대치는 이지 7·노멀 5·헬 3. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const A=h.need();
function lastCards(){const out=[];for(let i=0;i<A.SEGMENTS.length;i++){const g=A.SEGMENTS[i],n=A.SEGMENTS[i+1];if(g.kind==='card'&&(!n||n.kind!=='card'||n.actor!==g.actor))out.push(i);}return out;}
function defeatAt(seg,opt){const s=A.createRun(Object.assign({difficulty:'normal',seed:4,segment:seg,stages:1},opt));
 for(let t=0;t<4000&&!(s.stage==='card'&&s.seg===seg&&s.boss.present);t++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});}
 assert.equal(s.seg,seg);if(opt&&opt.bombs!=null)s.bombs=opt.bombs;s.events.length=0;let found=null;
 for(let t=0;t<2400&&!found;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card'&&s.seg===seg&&!s.cardDown&&!s.cardEnding)s.boss.hp=0;const before=s.bombs;A.step(s,{});if(s.events.includes('bombReward'))found={s,before};s.events.length=0;}
 return found;}

test('caps: easy 7, normal 5, hell 3, never below the starting stock',()=>{
 assert.deepEqual(A.BOMB_CAP,{gentle:7,normal:5,hell:3});
 for(const d of ['gentle','normal','hell']){const s=A.createRun({difficulty:d,seed:1});assert.equal(A.bombCap(s),A.BOMB_CAP[d]);assert(A.DIFFICULTY[d].bombs<=A.bombCap(s));}
});

test('every chapter has exactly one final boss, on its last boss stage',()=>{
 const parts=[...new Set(A.STAGES.map(s=>s.part))];let chapter=0,boss=0,mid=0;
 for(const i of lastCards()){const g=A.SEGMENTS[i],n=A.SEGMENTS[i+1],k=A.bombRewardKind(g,n);
  if(k==='chapter'){chapter++;assert.equal(g.stage,A.partFinalStage(A.STAGES[g.stage].part));}else if(k==='mid'){mid++;assert(g.mid);}else{boss++;assert.equal(k,'boss');}}
 assert.equal(chapter,parts.length,'one chapter boss per part');assert(boss>0&&mid>0);
 // 마지막 부의 막보스 = 게임의 마지막 보스
 const all=lastCards(),lastBoss=all.filter(i=>!A.SEGMENTS[i].mid).pop();assert.equal(A.bombRewardKind(A.SEGMENTS[lastBoss],A.SEGMENTS[lastBoss+1]),'chapter');
});

test('midboss +1, boss +2, chapter boss +3',()=>{
 const all=lastCards(),pick=k=>all.find(i=>A.bombRewardKind(A.SEGMENTS[i],A.SEGMENTS[i+1])===k&&A.SEGMENTS[i].stage<12);
 for(const [k,n] of [['mid',1],['boss',2],['chapter',3]]){const seg=pick(k);assert(seg!=null,k);
  const r=defeatAt(seg,{difficulty:'gentle',bombs:0});assert(r,k+' reward fired');
  assert.equal(r.s.lastBombReward.kind,k);assert.equal(r.s.lastBombReward.got,n);assert.equal(r.s.bombs-r.before,n,k);
  assert.equal(r.s.lastJackpot.bombs,n,'the jackpot card carries the bomb reward');}
});

test('the reward stops at the difficulty cap and reports it as full',()=>{
 const all=lastCards(),seg=all.find(i=>A.bombRewardKind(A.SEGMENTS[i],A.SEGMENTS[i+1])==='chapter');
 const r=defeatAt(seg,{difficulty:'hell',bombs:2});assert.equal(r.s.bombs,3);assert.equal(r.s.lastBombReward.got,1);assert.equal(r.s.lastBombReward.full,true);
 const f=defeatAt(seg,{difficulty:'normal',bombs:5});assert.equal(f.s.bombs,5);assert.equal(f.s.lastBombReward.got,0);
 // 게이지가 차도 최대치를 넘지 않는다
 const s=A.createRun({difficulty:'gentle',seed:2});s.bombs=7;s.gauge=A.GAUGE_FULL*3;A.step(s,{});assert(s.bombs<=7);
 const g=A.createRun({difficulty:'gentle',seed:2});g.bombs=5;g.gauge=A.GAUGE_FULL*2-1;g.gauge+=1;A.step(g,{});assert(g.bombs>5,'easy can now hold more than the old 4');
});

test('spell practice gives no bomb reward; non-final patterns give none',()=>{
 const all=lastCards(),seg=all.find(i=>A.SEGMENTS[i].spell&&!A.SEGMENTS[i].mid);
 const s=A.createRun({difficulty:'normal',seed:4,segment:seg,stages:1,spellOnly:true});s.bombs=0;let fired=0;
 for(let t=0;t<5000&&s.stage!=='won';t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card'&&!s.cardDown&&!s.cardEnding&&s.boss.present)s.boss.hp=0;A.step(s,{});if(s.events.includes('bombReward'))fired++;s.events.length=0;}
 assert.equal(fired,0);
});

test('continue restores the saved bomb stock within the cap',()=>{
 const seg=A.STAGES[3].first+1;
 const a=A.createRun({difficulty:'gentle',seed:1,segment:seg,grown:{exp:0,fills:0,stock:6}});assert.equal(a.bombs,6);
 const b=A.createRun({difficulty:'hell',seed:1,segment:seg,grown:{exp:0,fills:0,stock:6}});assert.equal(b.bombs,3);
 const c=A.createRun({difficulty:'normal',seed:1,segment:seg,grown:{exp:0,fills:0}});assert.equal(c.bombs,A.DIFFICULTY.normal.bombs,'old saves without stock start as before');
 const d=A.createRun({difficulty:'normal',seed:1,segment:seg,grown:{exp:0,fills:0,stock:0}});assert.equal(d.bombs,A.DIFFICULTY.normal.bombs,'never below the starting stock');
});

test('the checkpoint stores the bomb stock and reads old checkpoints unchanged',()=>{
 const src=require('fs').readFileSync(require('path').join(__dirname,'..','src','arcade-mobile-v43.js'),'utf8');
 assert(/if\(!retry\)data\.stock=checkpointCount\(s\.bombs\)/.test(src));assert(/if\(c\.stock!==undefined\)c\.stock=checkpointCount\(c\.stock\)/.test(src));
 const app=require('fs').readFileSync(require('path').join(__dirname,'..','src','arcade-app-v43.js'),'utf8');
 assert(/grown:mid/.test(app));assert(/options\.grown\.stock=grown\.stock/.test(app));
});
