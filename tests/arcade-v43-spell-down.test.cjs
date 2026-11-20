'use strict';
// 외부 심사 11-20(사용자 /검토): 보스 체력을 다 깎은 순간을 분명히 하고, 소진 뒤에는 다음 발사 묶음을 시작하지 않으며,
// 봉인 보너스는 소진 순간에 확정해 마지막 공격까지 살아남으면 지급한다(교주의 사몽: 소진 뒤 17초 동안 보너스가 줄던 것).
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),DIFFS=['gentle','normal','hell'];
function spellCard(){for(let i=0;i<a.SEGMENTS.length;i++){const g=a.SEGMENTS[i];if(g.kind==='card'&&g.spell&&a.STAGES[g.stage].part>=2)return i;}throw new Error('no spell');}
function toCard(s){for(let i=0;i<4000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');}
function safe(s){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}
test('spell bonus freezes the moment HP runs out and is paid when the hero survives the last attack',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:3,segment:spellCard(),entranceAll:true});toCard(s);
  for(let i=0;i<1500&&s.stage==='card';i++){s.boss.hp=s.boss.maxHp;safe(s);} // 보너스가 줄기 시작한 뒤까지
  s.spellClean=true;const seg=s.seg,before=a.spellBonus(s);assert(before>0&&before<a.spellBonusBase(a.SEGMENTS[seg]),d+' bonus already decaying');
  s.boss.hp=0;safe(s);assert(s.cardDown>0,d+' depletion marked');const locked=s.bonusLock;assert(locked>0&&locked<=before,d+' locked '+locked);
  let pays=-1;for(let i=0;i<a.CARD_DOWN_MAX+a.CARD_ENDING_MAX+20&&s.seg===seg&&s.stage==='card';i++){if(s.stage==='card'&&a.spellBonus(s))assert.equal(a.spellBonus(s),locked,d+' bonus no longer shrinks');s.spellClean=true;
   s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});if(s.events.includes('capture'))pays=s.lastCapture.bonus;h.clear(s);}
  assert.equal(pays,locked,d+' paid the locked amount');
 }
});
test('after HP runs out the boss finishes its current phrase but starts no new volley, special phase or mirror shot',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:7,segment:spellCard(),entranceAll:true});toCard(s);
  for(let i=0;i<200;i++){s.boss.hp=s.boss.maxHp;safe(s);}
  // 레이저 장단 페이즈(2026-11-20)는 장단 구간을 다 보일 때까지 보스를 붙든다 — 여기서는 그 구간이 끝난 뒤의 소진을 본다
  for(let i=0;i<3000&&s.sp&&s.sp.need&&!s.sp.done;i++){s.boss.hp=s.boss.maxHp;safe(s);}
  s.boss.hp=0;safe(s);const seg=s.seg,end=s.downEnd;assert(end>0);let late=0,mirror=0,special=0;
  for(let i=0;i<a.CARD_DOWN_MAX+10&&s.seg===seg&&s.stage==='card'&&!s.cardEnding;i++){safe(s);let fresh=0;for(let k=0;k<s.n;k++)if(s.bage[k]===1&&!s.bfragment[k])fresh++;
   if(s.segTick-40>end+2)late+=fresh;if(s.sp&&s.sp.cur)special++;}
  assert.equal(special,0,d+' no special phase after depletion');assert.equal(late,0,d+' no new bullets after the phrase ended');
 }
});
test('the third seal records what was actually given: life, bomb, or 10,000 points when both are full',()=>{
 for(const want of ['life','bomb','score']){const s=a.createRun({difficulty:'normal',seed:9,segment:spellCard(),entranceAll:true});toCard(s);
  const p=s.player;p.hp=want==='life'?p.maxHp-1:p.maxHp;if(want==='score')s.bombs=99;else s.bombs=0;s.pieces=a.LIFE_PIECES-1;s.spellClean=true;const sc=s.score;
  s.boss.hp=0;let got=null;for(let i=0;i<a.CARD_DOWN_MAX+a.CARD_ENDING_MAX+20&&!got;i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});if(s.events.includes('capture'))got=s.lastCapture.gift;h.clear(s);}
  assert.equal(got,want);}
});
