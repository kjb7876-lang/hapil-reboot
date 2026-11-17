'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');
function run(hero,focus,ticks=3000,seed=5){
  const s=A.createRun({hero,difficulty:'normal',seed,stage:0,segment:2});s.noDistort=true;
  for(let i=0;i<ticks;i++){A.step(s,{dx:0,dy:0,focus});s.skillFx.length=0;s.events.length=0;s.player.hp=9;}
  return s;
}
test('저속 이동 중에만 간이 필살이 나간다',()=>{
  for(const hero of ['memory','seoha','seoha-b']){
    assert.ok(run(hero,true).fsCasts>0,hero+' 저속에서 발동');
    assert.equal(run(hero,false).fsCasts,0,hero+' 일반 이동에서는 발동 없음');
  }
});
test('간이 필살은 적 탄을 지우지 않는다',()=>{
  const s=A.createRun({hero:'memory',seed:3,stage:0,segment:2});
  for(let i=0;i<400;i++)A.step(s,{dx:0,dy:0,focus:true});
  const casts=s.fsCasts;assert.ok(casts>0);
  assert.equal(s.lastBomb,null,'필살기를 쓰지 않았다');
});
test('윤서하 시간검은 지연 뒤 적을 추적해 맞춘다, 기억사수는 연쇄 레이저',()=>{
  const sw=run('seoha',true);assert.ok(sw.fsHits>0,'시간검 명중');
  const me=run('memory',true);assert.ok(me.fsHits>=me.fsCasts,'레이저는 최소 한 번씩 맞춘다');
});
test('같은 시드는 같은 결과(탄 패턴 난수와 분리)',()=>{
  const a=run('memory',true,1200,9),b=run('memory',true,1200,9);
  assert.equal(a.fsCasts,b.fsCasts);assert.equal(a.score,b.score);
});
