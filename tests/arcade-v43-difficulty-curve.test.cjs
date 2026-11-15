'use strict';
// 난이도 곡선(사용자 11-15 "헬난이도 킵 이지랑 노멀은 초반구간은 지금보다30프로널널하게 점점 빡빡해지게").
// 헬은 그대로. 이지·노멀은 첫 스테이지에서 탄 수가 지금의 약 70%, 스테이지가 진행될수록 늘어 마지막에는 지금보다 빡빡하다.
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');
const last=A.STAGES.length-1;
const at=(difficulty,stage)=>A.createRun({difficulty,stage,seed:3});
test('hell keeps its density and speed on every stage',()=>{
  for(const st of [0,10,30,last]){const s=at('hell',st);assert.equal(s.density,A.DIFFICULTY.hell.density);assert.equal(s.rules.speed,A.DIFFICULTY.hell.speed);}
});
test('easy and normal start about 30% looser than before',()=>{
  for(const d of ['gentle','normal']){const s=at(d,0),base=A.DIFFICULTY[d];
    assert(Math.abs(s.density/base.density-.7)<.03,d+' first stage density x'+(s.density/base.density).toFixed(2));
    assert(s.rules.speed<base.speed*.95,d+' first stage bullets slower');}
});
test('easy and normal tighten stage by stage and end tighter than before',()=>{
  for(const d of ['gentle','normal']){let prev=0;
    for(let st=0;st<=last;st++){const s=at(d,st);assert(s.density>=prev-1e-9,d+' stage '+st+' not looser than the one before');prev=s.density;}
    const end=at(d,last),base=A.DIFFICULTY[d];assert(end.density>base.density*1.05,d+' last stage is tighter than before');
    assert(end.density<A.DIFFICULTY.hell.density*1.05||d==='normal',d+' easy never reaches hell density');}
});
test('the curve follows the run when a stage is cleared, not only the starting stage',()=>{
  const s=at('normal',0),d0=s.density;let t=0;
  while(s.stageIndex===0&&t<200000&&s.stage!=='won'){s.player.hp=s.player.maxHp;s.player.invulnerableUntil=s.tick+1e6;if(s.stage==='card'&&s.segTick>30)s.boss.hp=0;A.step(s,{});t++;}
  assert.equal(s.stageIndex,1);assert(s.density>d0,'density rose after stage 1');
});
test('the shared difficulty table is not mutated by a run',()=>{
  const before=JSON.stringify(A.DIFFICULTY);at('normal',last);at('gentle',20);assert.equal(JSON.stringify(A.DIFFICULTY),before);
});
