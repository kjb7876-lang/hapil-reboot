'use strict';
/* 사용자 11-20: "한챕터(에피소드) 끝나면 모든 목숨 다 차는걸로", "챕터가 달라져도 영웅레벨은 이어지도록 해줘 챕터당 1레벨식 성장하는 구조로 하면될듯 6-7챕터쯤 만렙되게". */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();
function crossPart(stage,setup){
 const s=A.createRun({difficulty:'normal',seed:4,stage,growth:true});if(setup)setup(s);
 s.seg=A.STAGES[stage+1].first-1;s.segTick=0;let t=0;
 while(s.stageIndex===stage&&t<40000){s.player.invulnerableUntil=s.tick+10;if(s.boss&&s.boss.present&&s.boss.hp>1)s.boss.hp=1;A.step(s,{});t++;}
 assert.equal(s.stageIndex,stage+1);return s;
}
test('chapter base level is the chapter number, maxing out at part 7',()=>{
 for(const st of A.STAGES){const s=A.createRun({difficulty:'normal',seed:1,stage:st.index,growth:true});
  const f=Math.min(7,st.part);assert.equal(A.chapterFloor(s),f);assert.equal(s.power,f,'attack level '+st.index);assert.equal(s.bombLevel,f,'bomb level '+st.index);}
 assert.equal(A.createRun({difficulty:'normal',seed:1,stage:30}).power,1,'only when the app asks for growth');
});
test('entering the next chapter refills every life and lifts the hero to that chapter level',()=>{
 for(const diff of ['gentle','normal','hell']){
  const s=A.createRun({difficulty:diff,seed:4,stage:11,growth:true});s.player.hp=1;
  s.seg=A.STAGES[12].first-1;s.segTick=0;let t=0;
  while(s.stageIndex===11&&t<40000){s.player.invulnerableUntil=s.tick+10;if(s.boss&&s.boss.present&&s.boss.hp>1)s.boss.hp=1;A.step(s,{});t++;}
  assert.equal(s.player.hp,s.player.maxHp,diff+' full lives');assert.equal(s.power,2);assert.equal(s.bombLevel,2);
  assert(s.events.includes('extend')&&s.events.includes('powerUp'));
 }
});
test('a higher level earned inside a chapter carries over untouched',()=>{
 const s=crossPart(11,s=>{s.exp=A.POWER_EXP[4];s.power=5;});assert.equal(s.power,5);
});
test('ordinary stage changes inside a chapter do not refill lives',()=>{
 const s=A.createRun({difficulty:'normal',seed:4,stage:3,growth:true});s.player.hp=1;
 s.seg=A.STAGES[4].first-1;s.segTick=0;let t=0;
 while(s.stageIndex===3&&t<40000){s.player.invulnerableUntil=s.tick+10;if(s.boss&&s.boss.present&&s.boss.hp>1)s.boss.hp=1;A.step(s,{});t++;}
 assert.equal(s.stageIndex,4);assert.equal(s.player.hp,1);
});
test('a hit still costs one attack level, but never below the chapter level',()=>{
 const s=h.idle({stage:30,growth:true});assert.equal(A.chapterFloor(s),4);s.exp=A.POWER_EXP[4];s.power=5;
 const seq=[];for(let i=0;i<3;i++){s.bombs=0;s.noDistort=true;s.player.invulnerableUntil=0;s.player.hp=5;h.clear(s);h.put(s,s.player.x,s.player.y,{bage:100});A.step(s,{dx:0,dy:0});assert.equal(s.player.hp,4,'hit landed');seq.push(s.power);}
 assert.deepEqual(seq,[4,4,4]);
});
