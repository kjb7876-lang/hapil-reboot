'use strict';
// 영웅 공격 손맛(사용자 11-20 "기억사수 모든공격 롤제리 느낌나게", "서하는 공격중에 시간탄섞어서 … 시간폭탄").
// 기억사수 충전탄은 피해 합계를 그대로 두고 일부를 옆 적에 튀긴다. 서하 시간탄은 붙었다가 정해진 틱 뒤에 터진다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../src/arcade-v43.js');
function arena(hero){
  const s=A.createRun({hero,difficulty:'normal',seed:7,stage:0,segment:2});s.noDistort=true;
  let n=0;while(!s.mobs.length&&n++<900){A.step(s,{dx:0,dy:0});s.player.hp=9;}
  assert.ok(s.mobs.length,'a wave mob appears');const tpl=s.mobs[0];
  s.mobs.length=0;s.sn=0;s.n=0;s.shotHits.length=0;s.events.length=0;s.tbombs.length=0;
  const mob=(x,y,hp)=>{const m=Object.assign({},tpl,{x,y,hp,maxHp:hp,elite:false,score:1});s.mobs.push(m);return m;};
  return {s,mob};
}
test('memory charged shot splits one shot of damage between the target and a neighbour',()=>{
  const {s,mob}=arena('memory'),a=mob(180,200,100),b=mob(180+A.CHARGE_REACH*.6,200,100),d=10;
  A.shotStrike(s,a,180,210,d,1);
  assert.ok(Math.abs((100-a.hp)+(100-b.hp)-d)<1e-9,'total damage equals one shot');
  assert.ok(Math.abs(100-b.hp-d*A.CHARGE_ARC)<1e-9,'neighbour takes the arc share');
  assert.ok(s.events.includes('sparkHit'));
  const kinds=[];for(let i=0;i<s.shotHits.length;i+=5)kinds.push(s.shotHits[i+2]);assert.ok(kinds.includes(3)&&kinds.includes(1),'arc and big spark are drawn');
});
test('memory charged shot with nobody nearby keeps the whole damage',()=>{
  const {s,mob}=arena('memory'),a=mob(60,200,100);mob(320,600,100);
  A.shotStrike(s,a,60,210,10,1);assert.ok(Math.abs(a.hp-90)<1e-9);
});
test('every CHARGE_EVERY-th main volley has exactly one charged shot in the middle',()=>{
  const s=A.createRun({hero:'memory',difficulty:'normal',seed:3,stage:0,segment:2});s.noDistort=true;
  let charged=0,volleys0=s.volleys;
  for(let i=0;i<600;i++){const before=s.sn;A.step(s,{dx:0,dy:0});s.player.hp=9;for(let k=0;k<s.sn;k++)if(s.skind[k]===1&&s.sy[k]>s.player.y-40)charged++;}
  const volleys=s.volleys-volleys0;assert.ok(volleys>50);
  assert.ok(Math.abs(charged-Math.floor(volleys/A.CHARGE_EVERY))<=2,'charged '+charged+' of '+volleys);
});
test('seoha time bomb hits like one shot on contact, ticks for TIMEBOMB_FUSE, then splashes neighbours',()=>{
  const {s,mob}=arena('seoha'),a=mob(180,200,100),b=mob(180+A.TIMEBOMB_R*.5,210,100),far=mob(40,200,100),d=10;
  A.shotStrike(s,a,180,210,d,2);
  assert.equal(a.hp,100-d,'one ordinary shot of damage on contact');assert.equal(s.tbombs.length,1);assert.ok(s.events.includes('tbStick'));
  for(let i=0;i<A.TIMEBOMB_FUSE-1;i++)A.updateTimeBombs(s);
  assert.equal(s.tbombs.length,1,'still ticking');a.x+=12;A.updateTimeBombs(s);
  assert.equal(s.tbombs.length,0);assert.ok(s.events.includes('tbBoom'));
  assert.ok(Math.abs(100-a.hp-d*(1+A.TIMEBOMB_MULT))<1e-9);assert.ok(Math.abs(100-b.hp-d*A.TIMEBOMB_SPLASH)<1e-9);assert.equal(far.hp,100);
});
test('seoha time bomb bursts where its target fell',()=>{
  const {s,mob}=arena('seoha'),a=mob(180,200,100),b=mob(200,200,100);
  A.shotStrike(s,a,180,210,10,2);A.updateTimeBombs(s);s.mobs.splice(s.mobs.indexOf(a),1);A.updateTimeBombs(s);
  assert.equal(s.tbombs.length,0);assert.ok(Math.abs(100-b.hp-10*A.TIMEBOMB_SPLASH)<1e-9);
});
test('seoha fires time bombs during play and their damage stays a small share of her output',()=>{
  const s=A.createRun({hero:'seoha',difficulty:'normal',seed:5,stage:0,segment:2});s.noDistort=true;
  let fired=0;for(let i=0;i<1800;i++){A.step(s,{dx:0,dy:0});s.player.hp=9;fired+=s.events.filter(e=>e==='tbFire').length;s.events.length=0;}
  assert.ok(fired>=10,'fired '+fired);
  assert.equal(A.TIMEBOMB_MULT,0,'single-target damage stays equal to the memory gunner (heroes test)');
});
test('hero feel drawing keeps the house rules',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../src/hero-memory-v43.js'),'utf8');
  const body=src.slice(src.indexOf('전기 연사 손맛'),src.indexOf('/* ── 기억 번개(5단계부터)'));
  assert.ok(body.length>500);assert.ok(!/cross/i.test(body));assert.ok(!/#(c8|d0|e0|b8)3[0-9a-f]{3}/i.test(body),'no vermilion');
});
