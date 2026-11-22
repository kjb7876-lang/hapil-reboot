'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');
const {put}=require('./helpers/arcade-v43.cjs');

const W=A.WIDTH,H=A.HEIGHT;
function enterCard(difficulty,segment,compact=true){
  const s=A.createRun({difficulty,segment,compact,entranceAll:true,pacing:true,seed:43});
  s.player.x=110;
  s.player.invulnerableUntil=Infinity;
  for(let i=0;i<900&&s.stage!=='card';i++)step(s);
  assert.equal(s.stage,'card');
  return s;
}
function step(s,input={}){
  A.step(s,input);
  s.events.length=s.cancelled.length=s.drifted.length=s.pops.length=0;
}

for(const difficulty of ['gentle','normal']){
  test(difficulty+' finishes the bullet phrase at zero HP and waits to start the rhythm laser',()=>{
    const index=A.plannedSegments(difficulty).find(i=>{
      const g=A.SEGMENTS[i];
      return g.kind==='card'&&!g.mid&&g.stage===6&&A.laserCard({entranceAll:true,difficulty,paced:true,seg:i});
    });
    const s=enterCard(difficulty,index);
    s.boss.hp=0;
    const firedAt=s.enemyShotsBorn;
    step(s);
    assert(s.downEnd>=A.CARD_MIN);
    const firstSpecial=s.sp.start;
    assert(firstSpecial>=s.downEnd+A.SP_LEAD,'low HP must wait for the shot phrase');
    while(s.segTick<firstSpecial-1){
      step(s);
      assert.equal(s.special,null);
    }
    assert(s.enemyShotsBorn>firedAt,'the boss still fired its phrase at zero HP');
    // A very slow large round cannot reach the old timeout before the laser.
    const stallAge=2500;
    put(s,8,220,{bsize:A.SHAPE_PROP,bcolor:0,bs:0,ba:Math.PI/2,bage:stallAge,bformation:1});
    for(let i=0;i<160;i++){
      step(s);
      assert.equal(s.special,null,'waits past the former timeout');
      assert.equal(s.seg,index);
      const j=s.bage.findIndex((age,k)=>k<s.n&&age===stallAge+i+1);
      assert(j>=0&&s.bexit[j]===0,'the existing projectile is still solid');
    }
    for(let i=0;i<2000&&!s.special;i++)step(s);
    assert.equal(s.special?.kind,'laser');
    assert.equal(s.n,0,'the laser section starts after the last solid bullet leaves');
  });

  test(difficulty+' midboss holds the next card until the remaining bullet leaves',()=>{
    const index=A.plannedSegments(difficulty).find(i=>A.SEGMENTS[i].mid&&A.SEGMENTS[i].stage===6);
    const s=enterCard(difficulty,index);
    s.boss.hp=0;
    for(let i=0;i<1800&&!s.cardEnding;i++)step(s);
    assert(s.cardEnding,'the depleted midboss finishes its phrase');
    const stallAge=2500;
    put(s,8,250,{bs:0,ba:Math.PI/2,bage:stallAge,bformation:1});
    for(let i=0;i<200;i++){
      step(s);
      assert.equal(s.seg,index);
      const j=s.bage.findIndex((age,k)=>k<s.n&&age===stallAge+i+1);
      assert(j>=0&&s.bexit[j]===0);
    }
    for(let i=0;i<2000&&s.seg===index;i++)step(s);
    assert.notEqual(s.seg,index,'the midboss advances normally when clear');
    assert.equal(s.n,0);
  });
}

test('mobile volleys release on several beats and stay within their difficulty’s area budget',()=>{
  const index=A.SEGMENTS.findIndex(g=>g.actor==='balrog'&&g.name==='불덩이');
  for(const difficulty of ['gentle','normal','hell']){
    const s=enterCard(difficulty,index),limit=W*H*A.MOBILE_BOSS_COVER[difficulty];
    const releases=[];
    for(let i=0;i<1140;i++){
      s.boss.hp=s.boss.maxHp;
      const count=s.enemyShotsBorn;
      step(s);
      assert(A.fieldBulletArea(s)<=limit+.0001,'all live projectiles fit within '+difficulty+' budget');
      if(s.enemyShotsBorn>count)releases.push(s.tick);
    }
    assert(releases.length>=6);
    const gaps=new Set(releases.slice(1).map((t,i)=>t-releases[i]));
    assert(gaps.has({gentle:9,normal:7,hell:5}[difficulty]),'large volleys are staggered by difficulty');
  }
});
