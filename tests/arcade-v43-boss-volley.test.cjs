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
    for(let i=0;i<1800&&s.segTick<firstSpecial-1;i++){
      step(s);
      assert.equal(s.special,null);
    }
    assert.equal(s.segTick,firstSpecial-1);
    assert(s.enemyShotsBorn>firedAt,'the boss still fired its phrase at zero HP');
    // A very slow large round cannot reach the old timeout before the laser.
    const stallAge=2500;
    put(s,8,220,{bsize:A.SHAPE_PROP,bcolor:0,bs:45,ba:Math.PI/2,bage:stallAge,bformation:1});
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
    put(s,8,250,{bs:45,ba:Math.PI/2,bage:stallAge,bformation:1});
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
    assert(gaps.has({gentle:9,normal:7,hell:5}[difficulty]),'large volleys are staggered by '+difficulty+': '+[...gaps]);
  }
});

test('a saturated mobile boss rejects further launches without cancelling existing rounds',()=>{
  const index=A.SEGMENTS.findIndex(g=>g.actor==='balrog'&&g.name==='불덩이');
  for(const difficulty of ['gentle','normal','hell']){
    const s=enterCard(difficulty,index),limit=W*H*A.MOBILE_BOSS_COVER[difficulty];
    const emitter={kind:'radial',bulletsPerWave:64,bulletType:{size:A.SHAPE_PROP,color:0,keepShot:true}};
    for(let i=0;i<20;i++)A.emit(s,emitter,0,s.boss);
    const needed=A.fieldBulletArea(s);
    assert(needed<=limit&&needed>limit*.7,'the area limit constrains the dense attack');
    const count=s.n;
    A.emit(s,emitter,0,s.boss);
    assert.equal(s.n,count);
    assert(Array.from(s.bexit.slice(0,count)).every(x=>x===0));
  }
});


test('a large sword remains until its full sprite crosses the bottom, at its original speed',()=>{
  const index=A.SEGMENTS.findIndex(g=>g.actor==='balrog'&&g.name==='불덩이');
  const s=enterCard('gentle',index);
  s.segTick=s.sp.start-1;
  const age=2500;
  put(s,8,H-20,{bsize:A.SHAPE_PROP,bcolor:2,bs:60,ba:Math.PI/2,bage:age,bformation:1});
  for(let i=0;i<60;i++){
    step(s);
    assert.equal(s.special,null);
    assert.equal(s.n,1);
    assert.equal(s.bexit[0],0);
    assert.equal(s.bs[0],60);
  }
  assert(s.by[0]>H+14,'the centre has crossed the old removal boundary');
  for(let i=0;i<200&&!s.special;i++)step(s);
  assert(s.special);
  assert.equal(s.n,0);
});

test('special laser and cinematic defeat wait for in-flight weapons, cannonballs and ink projectiles',()=>{
  const index=A.plannedSegments('gentle').filter(i=>A.SEGMENTS[i].actor==='balrog').at(-1);
  for(const difficulty of ['gentle','normal','hell'])for(const type of ['weapons','cannons','risers','falling']){
    for(const ending of [false,true]){
      const s=enterCard(difficulty,index);
      s.n=0;s.bossVolley=null; // Isolate this extension of the projectile list.
      s.segTick=s.sp.start-1;
      if(ending){s.sp.need=false;s.cardEnding={defeated:true,tick:s.tick,stays:false};}
      if(type==='weapons'){
        A.throwWeapon(s,0,2);
        Object.assign(s.weapons[0],{x:10,y:H-100,a:Math.PI/2,age:A.WEAPON_WARN+1});
      }else if(type==='cannons')s.cannons.push({x:10,y:H-100,a:Math.PI/2,v:1.5,r:26,age:100,warn:50,spin:0});
      else s.risers.push({kind:'flame',dir:type==='falling'?'down':'spit',x:10,y:H-100,
        vx:0,vy:1.5,size:26,age:100,fade:0,ay:H-16});
      const list=()=>s[type==='falling'?'risers':type];
      for(let i=0;i<45;i++){
        step(s);
        assert.equal(s.stage,'card');
        assert.equal(s.special,null,type+' is still flying');
        assert.equal(list().length,1);
      }
      for(let i=0;i<2100&&s.stage==='card'&&!s.special;i++)step(s);
      assert(ending?s.stage==='bossClear':s.special?.kind==='laser',JSON.stringify({type,ending,stage:s.stage,special:s.special,seg:s.seg,n:s.n,left:list().length}));
      if(type==='risers'||type==='falling')assert(s.risers.every(r=>r.fade));
      else assert.equal(s[type].length,0);
    }
  }
});

test('a queued hexagram waits past its old timeout without cancelling a split',()=>{
  const index=A.SEGMENTS.findIndex(g=>g.actor==='balrog'&&g.name==='불덩이');
  const s=enterCard('gentle',index);
  s.segTick=240;s.sp.start=2500;
  const sig=A.SIGNATURES.balrog;
  s.figPend={fn:'sigil',args:[sig,sig.index],seg:s.seg,since:s.tick-A.FIG_WAIT_MAX};
  put(s,8,280,{bs:48,ba:Math.PI/2,bage:40,bat:42,bmode:A.MODE_SPLIT,barg:3,bs2:70,bformation:1});
  step(s);assert.equal(s.figures.length,0);
  const before=s.enemyShotsBorn;
  step(s);assert(s.enemyShotsBorn>before,'the already-fired round can still split');
  assert(s.n>0);
  for(let i=0;i<2200&&!s.figures.length;i++)step(s);
  assert(s.figures.some(f=>f.sigil));
  assert.equal(s.n,0);
});
