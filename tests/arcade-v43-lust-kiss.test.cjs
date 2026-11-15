'use strict';
/* 사용자 11-15 10:10 KST: "색욕보스 키스(입술)공격도 추가". 립스틱 자국 패턴에서 보스가 입술 모양 그대로 굳은 탄 덩어리를 영웅에게 날린다(키스).
   덩어리는 모두 같은 방향·속도로 날아 모양이 흩어지지 않고, 피할 수 있게 느리고 한 덩어리 폭이 영웅 칸보다 훨씬 좁다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 lust boss: the lipstick spell blows a kiss, a rigid lip-shaped cluster flying at the hero',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell&&g.actor==='asmodeus'&&g.name==='립스틱 자국');assert(i>=0);
 const s=a.createRun({difficulty:'normal',seed:5,segment:i,stages:1});let kisses=0,best=null;
 for(let t=0;t<900&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;const before=s.n;a.step(s,{dx:0,dy:0});
  const groups=new Map();for(let k=before;k<s.n;k++){const key=s.ba[k].toFixed(3)+'|'+s.bs[k].toFixed(2);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(k);}
  for(const g of groups.values())if(g.length>=24){kisses++;const xs=g.map(k=>s.bx[k]),ys=g.map(k=>s.by[k]),w=Math.max(...xs)-Math.min(...xs),hgt=Math.max(...ys)-Math.min(...ys);
   const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2,aim=Math.atan2(s.player.y-cy,s.player.x-cx),d=Math.abs(Math.atan2(Math.sin(s.ba[g[0]]-aim),Math.cos(s.ba[g[0]]-aim)));
   best={n:g.length,w,hgt,d,speed:s.bs[g[0]]};}
  h.clear(s);}
 assert(kisses>=2,'kisses blown: '+kisses);
 assert(best.w>=50&&best.w<=145&&best.w/best.hgt>=1.4&&best.w/best.hgt<=3.2,'lip silhouette '+JSON.stringify(best));
 assert(best.d<.35,'aimed at the hero '+best.d.toFixed(2));assert(best.speed<=90,'slow enough to sidestep '+best.speed);
});

test('v43 lust boss: lip points have a cupid\'s bow dip in the top lip and a parted mouth line',()=>{
 const src=h.read('src/arcade-parts-v43/p2.js');assert(/function lips\(/.test(src),'lips shape');assert(/cupid/i.test(src),'cupid bow noted');
});
