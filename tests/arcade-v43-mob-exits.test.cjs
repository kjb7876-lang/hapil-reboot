'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const game=require('../src/arcade-v43.js');

// 실제 앱의 대본·자동 사격을 사용한다. 왼쪽에서 쏘며 버틴 한 웨이브의 몹을 끝까지 추적한다.
function playWave(scene,waveIndex,input={}){
  const waves=game.SEGMENTS.filter(seg=>seg.kind==='wave'&&game.STAGES[seg.stage].scene===scene);
  const seg=waves[waveIndex],index=game.SEGMENTS.indexOf(seg);
  assert.ok(seg,'authored wave '+scene+'/'+waveIndex);
  const run=game.createRun({segment:index,pacing:true,entranceAll:true,difficulty:'normal',seed:33});
  run.player.x=8;
  const duration=game.waveDuration(run,seg),limit=duration+3000,records=new Map();
  run.player.invulnerableUntil=limit;
  while(run.seg===index&&run.tick<limit){
    game.step(run,input);
    for(const mob of run.mobs){
      let record=records.get(mob);
      if(!record){
        record={mob,born:run.tick,startX:mob.x,lastY:mob.y,engaged:0,exitTick:0};
        records.set(mob,record);
      }
      if(mob.rise)assert.ok(mob.y<=record.lastY,'warned floor reinforcement keeps rising');
      else assert.ok(mob.y>=record.lastY,'wave mob reversed upwards: '+mob.kind);
      record.lastY=mob.y;
      if(mob.x>=0&&mob.x<=game.WIDTH&&mob.y>=10&&mob.y<300)record.engaged++;
      if(mob.retreat&&!record.exitTick)record.exitTick=run.tick;
    }
    run.events.length=0;run.pops.length=0;run.cancelled.length=0;
  }
  assert.notEqual(run.seg,index,'wave and surviving exits finish within 50 s of the last script tick');
  const mobs=[...records.values()];
  assert.equal(run.kills,mobs.filter(record=>record.mob.hp<=0).length,'departures earn no kill');
  for(const {mob} of mobs){
    if(mob.hp>0)assert.ok(mob.y>game.HEIGHT+40||(mob.rise&&mob.y< -40)||mob.x< -40||mob.x>game.WIDTH+40,'survivor removed in view: '+mob.kind);
  }
  return {run,mobs,duration};
}

test('late garden enemies have time to fight after the spawn script ends',()=>{
  const {mobs,duration}=playWave('01',0);
  const late=mobs.filter(({born,mob})=>born>duration-60&&mob.hp>0);
  assert.ok(late.length>0,'a late survivor reaches its exit');
  assert.ok(late.some(({engaged,mob})=>engaged>=420&&mob.shots>=2),'at least seven seconds in firing range');
});

test('the trailing wolves of both side formations enter the field',()=>{
  const {mobs}=playWave('04',0);
  for(const direction of [-1,1]){
    const tail=mobs.filter(r=>direction>0?r.startX< -40:r.startX>game.WIDTH+40);
    assert.ok(tail.length>0,'off-screen formation tail '+direction);
    assert.ok(tail.some(r=>r.engaged>0),'tail actually enters the firing lane '+direction);
  }
});

test('a late demon crosses the field while the hero defeats its hovering keepers',()=>{
  const {mobs,duration,run}=playWave('48',2);
  const late=mobs.find(r=>r.born>duration-40&&r.mob.vx>0&&r.mob.hp>0);
  assert.ok(late&&late.engaged>=270&&late.mob.x>game.WIDTH,'late crossing keeps its direction and a 4.5-second firing window');
  assert.ok(mobs.some(r=>r.mob.elite&&r.mob.hp<=0&&!r.exitTick),'keeper defeated in combat before departure');
  assert.ok(run.kills>0&&run.exp>0,'automatic fire still defeats enemies and awards experience');
  assert.equal(run.dropped,0);
});

test('a keeper outside the firing lane holds for forty seconds and departs below',()=>{
  // 위쪽으로 이동해 정예 뒤에서 위로 쏜다. 적 체력이나 자동 사격을 바꾸지 않는다.
  const {mobs,duration}=playWave('48',2,{dy:-3});
  const keeper=mobs.find(r=>r.mob.elite&&r.mob.hp>0);
  assert.ok(keeper&&keeper.exitTick>=duration+2400,'living elite holds throughout the app grace period');
  assert.ok(keeper.mob.y>game.HEIGHT+40&&keeper.mob.shots>0,'keeper fired, then cleared the bottom edge');
});
