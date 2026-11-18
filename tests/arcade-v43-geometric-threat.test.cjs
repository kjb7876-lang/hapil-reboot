'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/arcade-v43.js');
const P = require('../src/arcade-boss-phases-v43.js');
const score = {actor:'p2_core|21', phaseNo:2};
const kinds = ['goldrain','fibfan','spiro','ripple'];

function stage() {
  const s = A.createRun({difficulty:'normal', seed:17, entranceAll:true, distort:false});
  // Isolate one geometric turn from other cards. Physics, movement, collision and slow field are live.
  s.stage='break'; s.stageTick=-5000; s.seg=1;
  s.player.x=180; s.player.y=550; s.boss.x=180; s.boss.y=160;
  return s;
}
function emitter(s,kind,observe) {
  const k=P.KINDS.find(k=>k.id===kind);
  return t=>P.fire(k,s,t,{W:A.WIDTH,H:A.HEIGHT,colors:[1,3],spawn(state,x,y,angle,speed,bulletType){
    if(observe)observe({x,y,angle,speed,bulletType});
    A.emit(state,{kind:'rotating',phaseOffset:angle,baseSpeed:speed,bulletType},0,{x,y});
  }},score);
}
for(const kind of kinds) {
  test(kind+' waits for its cue and fires from the marked origin after the player moves',()=>{
    const s=stage(),shots=[],fire=emitter(s,kind,shot=>shots.push(shot));
    for(let t=0;t<24;t++){
      s.tick=t;fire(t);
      if(t===1){s.player.x=290;s.boss.x+=30;}
    }
    const cue=s.patternCue;
    assert.equal(cue.kind,kind);assert.equal(cue.seg,s.seg);
    assert.equal(cue.until-cue.start,24);assert.equal(shots.length,0);
    s.tick=24;fire(24);
    assert.ok(shots.length>0 && shots.every(b=>b.bulletType.formation));
    if(kind==='goldrain'){
      assert.equal(cue.xs[0],180);
      assert.deepEqual([...new Set(shots.map(b=>b.x))],cue.xs);
      assert.ok(shots.every(b=>b.angle===Math.PI/2));
    }else{
      assert.ok(shots.every(b=>b.x===cue.x && b.y===cue.y));
      if(kind==='fibfan')assert.ok(shots.some(b=>b.angle===cue.angle));
      if(kind==='spiro')assert.equal(shots[0].angle,cue.angle);
      if(kind==='ripple')assert.ok(shots.every(b=>Math.abs(b.angle-cue.angle)>=cue.gapAngle));
    }
    // A different card or a warning interrupted by another beat may not release this old cast.
    const stale=stage(),late=[],lateFire=emitter(stale,kind,shot=>late.push(shot));
    stale.tick=0;lateFire(0);stale.tick=90;lateFire(24);assert.equal(late.length,0);
    stale.tick=24;stale.seg++;lateFire(24);assert.equal(late.length,0);
  });
}

test('the Fibonacci reply leaves an open wedge at the first bait position',()=>{
  const s=stage(),shots=[],fire=emitter(s,'fibfan',shot=>shots.push(shot));
  s.tick=0;fire(0);
  s.player.x=290;s.tick=60;fire(60);
  const cue=s.patternCue;
  assert.equal(cue.aimX,180);assert.equal(cue.open,true);
  s.tick=84;fire(84);
  assert.equal(shots.length,5);
  const offsets=shots.map(b=>b.angle-cue.angle);
  assert.ok(offsets.every(a=>Math.abs(a)>=cue.gapAngle-1e-9));
  assert.ok(offsets.some(a=>a<0)&&offsets.some(a=>a>0));
});

function replay(kind,dodge) {
  const s=stage(),fire=emitter(s,kind);
  let reached=false;
  for(let t=0;t<840;t++) {
    if(t<120)fire(t);
    let dx=0;
    if(dodge){
      if(kind==='ripple'){
        // Enter the first projected gap and cross to the other side behind the front.
        const target=t<275?234:126;dx=Math.max(-4,Math.min(4,target-s.player.x));
      }else if(t>121&&t<135)dx=1.35;
    }
    A.step(s,{dx,dy:0});
    if(!reached)for(let j=0;j<s.n;j++)if(s.by[j]>=510&&s.bx[j]>=0&&s.bx[j]<=A.WIDTH)reached=true;
    if(s.hits)return {reached,contact:t};
  }
  return {reached,contact:null};
}
for(const kind of kinds){
  test(kind+' reaches the lower field, hits a stationary hero and admits a legal dodge',()=>{
    const idle=replay(kind,false),dodge=replay(kind,true);
    assert.ok(idle.reached&&idle.contact!==null&&idle.contact<360);
    assert.deepEqual(dodge,{reached:true,contact:null});
  });
}
