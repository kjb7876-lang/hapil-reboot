'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const A=require('../src/arcade-v43.js');
const manifest=require('../media/arcade-v43-fx/index.json');
const app=fs.readFileSync(path.join(__dirname,'../src/arcade-app-v43.js'),'utf8');

function fixture({delayed=false}={}){
  const requested=[];
  const w={addEventListener(){},HapilArcade:A,HapilPhase2Native:{active:s=>!!s.testSignature,holding:s=>!!s.testDrain},document:{getElementById:()=>({getContext:()=>({})})},
    Image:class{set src(value){this.file=value;requested.push(this);if(!delayed)this.onload();}},innerWidth:360,innerHeight:640};
  w.window=w;
  vm.runInNewContext(app.replace('  boot();',`
    global.caster={
      step:updateBossCast,request:wantFx,cache:fxImages,
      seed:function(entries){entries.forEach(e=>e.bosses.forEach(actor=>{fxByBoss[actor]=e;}));},
      current:function(){return casts[0]||null;}
    };`),w);
  w.caster.seed(manifest.effects);
  return {caster:w.caster,requested};
}
function card(actor){
  return A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell&&g.actor===actor&&A.segArt(g)===actor);
}
function state(seg){
  return {seg,stage:'card',tick:1,boss:{actor:A.SEGMENTS[seg].actor,x:180,y:100,hp:1,present:true},events:[],mobs:[],
    n:1,enemyShotsBorn:0,bage:[1],bfragment:[0],bexit:[0],bx:[180],by:[105]};
}
const shoot=s=>{s.tick++;s.enemyShotsBorn++;};

test('casts accompany new boss volleys, and only restart on the next attack after a full rest',()=>{
  const {caster}=fixture(),s=state(card('balrog'));
  caster.step(s);
  assert.equal(caster.current(),null,'a card announcement is not an attack');
  shoot(s);caster.step(s);
  const first=caster.current();
  assert.equal(first.e.file,'fx-meteor.webp');
  assert.equal(first.big,true);
  assert.equal(first.tick,s.tick);
  for(let i=0;i<90;i++){shoot(s);caster.step(s);assert.equal(caster.current(),first);}
  s.tick+=100;caster.step(s);
  assert.equal(caster.current(),first,'elapsed cooldown alone does not replay the skill');
  s.bfragment[0]=1;shoot(s);caster.step(s);
  assert.equal(caster.current(),first,'a broken bullet is not a new cast');
  s.bfragment[0]=0;shoot(s);caster.step(s);
  const second=caster.current();
  assert.equal(second.tick,s.tick);assert.equal(second.big,false);
  assert.equal(second.e,first.e);assert.equal(second.x,s.boss.x);assert.equal(second.actor,'balrog');
  s.testSignature=true;caster.step(s);assert.equal(caster.current(),null,'native foreground has sole ownership');
  s.testSignature=false;s.tick+=200;s.testDrain=true;shoot(s);caster.step(s);
  assert.equal(caster.current(),null,'previous volleys draining into a native warning never start a new ornament');
  s.testDrain=false;s.formHold=s.tick+90;shoot(s);caster.step(s);
  assert.equal(caster.current(),null,'form interlude is kept clear');
  s.tick+=100;s.cardEnding={};shoot(s);caster.step(s);assert.equal(caster.current(),null);
});
test('skipping the entrance during a download plays frame zero on the first later volley, never the stale owner',()=>{
  const {caster,requested}=fixture({delayed:true}),s=state(card('balrog'));
  caster.step(s);shoot(s);caster.step(s);
  assert.equal(caster.current(),null);
  const meteor=requested[0];
  s.seg=card('violet');s.boss.actor='violet';caster.step(s);
  meteor.onload();assert.equal(caster.cache['fx-meteor.webp'],undefined);
  requested[1].onload();caster.step(s);assert.equal(caster.current(),null,'decode alone does not cast');
  shoot(s);caster.step(s);assert.equal(caster.current().e.file,'fx-violet-blast.webp');
  const retry=state(s.seg);caster.step(retry);assert.equal(caster.current(),null);
  shoot(retry);caster.step(retry);assert.equal(caster.current().tick,retry.tick);
});
test('the real mobile and desktop attack scripts give the owned animation multiple beats without extra fire',()=>{
  const {caster}=fixture();
  for(const [actor,difficulty,compact] of [['balrog','gentle',true],['violet','normal',false],['p2_beelzebub','hell',true]]){
    const seg=card(actor);assert.notEqual(seg,-1,actor);
    const s=A.createRun({segment:seg,difficulty,compact,entranceAll:true,spellOnly:true,seed:2231});
    const plays=[];
    for(let i=0;i<2300&&s.seg===seg&&plays.length<2;i++){
      s.player.invulnerableUntil=s.tick+60;A.step(s,{});
      const before=s.enemyShotsBorn;
      caster.step(s);
      assert.equal(s.enemyShotsBorn,before);
      const c=caster.current();
      if(c&&c.tick===s.tick&&c.e)plays.push(c.tick);
      s.events.length=0;
    }
    assert.equal(plays.length,2,actor+'/'+difficulty+': '+plays);
    assert(plays[1]-plays[0]>=150,actor);
  }
});
