'use strict';
// 11-17: 노멀·헬 공격은 동일. 이전의 초반 완화 곡선은 여유 모드에만 남긴다.
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');
const last=A.STAGES.length-1;
const at=(difficulty,stage)=>A.createRun({difficulty,stage,seed:3});
test('normal and hell keep identical density and speed on every stage',()=>{
  for(const d of ['normal','hell'])for(const st of [0,10,30,last]){const s=at(d,st);assert.equal(s.density,A.DIFFICULTY.hell.density);assert.equal(s.rules.speed,A.DIFFICULTY.hell.speed);}
});
test('easy starts about 30% looser than before',()=>{
  for(const d of ['gentle']){const s=at(d,0),base=A.DIFFICULTY[d];
    assert(Math.abs(s.density/base.density-.7)<.03,d+' first stage density x'+(s.density/base.density).toFixed(2));
    assert.equal(s.rules.speed,base.speed,d+' bullet speed unchanged');}
});
test('easy tightens stage by stage and end tighter than before',()=>{
  for(const d of ['gentle']){let prev=0;
    for(let st=0;st<=last;st++){const s=at(d,st);assert(s.density>=prev-1e-9,d+' stage '+st+' not looser than the one before');prev=s.density;}
    const end=at(d,last),base=A.DIFFICULTY[d];assert(end.density>base.density*1.05,d+' last stage is tighter than before');
    assert(end.density<A.DIFFICULTY.hell.density*1.05||d==='normal',d+' easy never reaches hell density');}
});
test('the curve follows the run when a stage is cleared, not only the starting stage',()=>{
  const s=at('gentle',0),d0=s.density;let t=0;
  while(s.stageIndex===0&&t<200000&&s.stage!=='won'){s.player.hp=s.player.maxHp;s.player.invulnerableUntil=s.tick+1e6;if(s.stage==='card'&&s.segTick>30)s.boss.hp=0;A.step(s,{});t++;}
  assert.equal(s.stageIndex,1);assert(s.density>d0,'density rose after stage 1');
});
test('the shared difficulty table is not mutated by a run',()=>{
  const before=JSON.stringify(A.DIFFICULTY);at('normal',last);at('gentle',20);assert.equal(JSON.stringify(A.DIFFICULTY),before);
});
