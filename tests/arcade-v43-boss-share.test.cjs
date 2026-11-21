'use strict';
// 사용자 11-21 "모바일 특히 보스전에서 탄이 빨리 사라지는 문제개선, 일반몹탄환총탄환이 보스보다 많이나와 탄환밸런스가 역전된문제 해결"
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const A=require('../src/arcade-v43.js');

test('boss fights hold more bullets on screen than mob waves on every difficulty, phone and PC (stage 1, the old worst case)',()=>{
 execFileSync(process.execPath,[path.join(__dirname,'..','tools','audit-boss-share-v43.cjs'),'--stages','1','--check'],{encoding:'utf8'});
});

test('the special-phase warning no longer sweeps live boss bullets off at its first tick; only leftovers leave when the special starts',()=>{
 for(const compact of [true,false]){
  const s=A.createRun({difficulty:'normal',seed:3,stage:1,stages:1,entranceAll:true,compact,pacing:true});
  let seen=0;
  for(let t=0;t<60000&&s.stage!=='won';t++){
   s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=Math.max(s.boss.hp,s.boss.maxHp*.6);
   A.step(s,{dx:0,dy:0});s.events.length=s.cancelled.length=s.pops.length=0;
   const w=A.spWindow(s);if(!w||s.stage!=='card')continue;
   if(w.local>0&&w.local<A.SP_LEAD){let exit=0,live=0;for(let i=0;i<s.n;i++)s.bexit[i]?exit++:live++;
    if(live+exit>0){seen++;assert.equal(exit,0,(compact?'phone':'pc')+': bullets keep flying (and can hit) during the warning');}}
   if(seen>40)break;
  }
  assert(seen>0,'a special warning with bullets on screen was observed');
 }
});

test('crowding thins mob shots before boss shots',()=>{
 for(const stage of ['wave','card']){
  const s=A.createRun({entranceAll:true,difficulty:'hell',compact:true,stage:0});s.stage=stage;s.n=Math.round(s.cap*.86);
  let born=0;const before=s.enemyShotsBorn;
  for(let k=0;k<200;k++){const n0=s.n;A.emit(s,{kind:'rotating',fireInterval:1/60,baseSpeed:84,bulletType:{formation:true}},k,{x:120,y:140});s.n=n0;}
  born=s.enemyShotsBorn-before;
  if(stage==='wave')assert.equal(born,0,'mob volleys pause at 86% of the cap');else assert(born>0,'boss volleys still come (thinned) at 86% of the cap');
 }
});
