'use strict';
/* 색욕 보스 아스모데우스(장면 17) — 11-14 지시서 STEP 5: 립스틱·하이힐·깨진 하트·유혹의 장막·환영 분신·최종 스펠을 저마다 다른 구조로. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const cardsOf=(a,name)=>a.SEGMENTS.map((g,i)=>[g,i]).filter(([g])=>g.kind==='card'&&g.spell&&g.actor==='asmodeus'&&(!name||g.name===name));
const run=(a,i,ticks,each,difficulty)=>{const s=a.createRun({difficulty:difficulty||'normal',seed:5,segment:i,stages:1});
 for(let t=0;t<ticks&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;const before=s.n;a.step(s,{dx:0,dy:0});each(s,before);h.clear(s);}return s;};

test('v43 lust boss: six named attacks, the old ones kept',()=>{
 const a=h.need(),names=cardsOf(a).map(([g])=>g.name);
 for(const n of ['투명한 실','립스틱 자국','붉은 하이힐','유혹의 장막','매혹의 빛','의지와 다르게'])assert(names.includes(n),'missing '+n+' in '+names);
});

test('v43 lust boss: lipstick fans cross later (bullets turn after a delay)',()=>{
 const a=h.need(),[[,i]]=cardsOf(a,'립스틱 자국');let turned=0,left=0,right=0;
 run(a,i,900,(s,before)=>{for(let k=before;k<s.n;k++){if(s.bmode[k]===a.MODE_TURN){turned++;if(s.barg[k]>0)left++;else right++;}}});
 assert(turned>40&&left>10&&right>10,'turning lipstick bullets both ways '+[turned,left,right]);
});

test('v43 lust boss: the high heel dashes fast and a big rotating wheel of large orbs turns',()=>{
 const a=h.need(),[[,i]]=cardsOf(a,'붉은 하이힐');let fast=0,orbs=new Set(),s0=null;
 run(a,i,1200,(s)=>{s0=s;for(let k=0;k<s.n;k++){if(s.bsize[k]===a.SHAPE_PROP&&s.bs[k]>=220*s.rules.speed)fast++;if(s.bsize[k]===2&&s.bage[k]===1)orbs.add(Math.round(Math.atan2(s.by[k]-s.boss.y,s.bx[k]-s.boss.x)*10));}});
 assert(fast>0,'a heel dashes at high speed');assert(orbs.size>=12,'large orbs leave at many turning angles: '+orbs.size);
});

test('v43 lust boss: the broken heart spirals and shatters into fragments',()=>{
 const a=h.need(),[[,i]]=cardsOf(a,'매혹의 빛');let pops=0,arms=0;
 run(a,i,1200,(s,before)=>{pops+=s.events.filter(e=>e==='pop').length;});
 assert(pops>=3,'hearts shatter: '+pops);
});

test('v43 lust boss: the veil is drawn but never hits, and two illusion clones fire out of phase',()=>{
 const a=h.need(),[[,i]]=cardsOf(a,'유혹의 장막');let veil=0,clones=0,fromClone=0;
 run(a,i,900,(s,before)=>{if(s.veilTick===s.tick)veil++;if(s.clones&&s.clonesTick===s.tick&&s.clones.length===2){clones++;
  for(let k=before;k<s.n;k++)for(const c of s.clones)if(Math.hypot(s.bx[k]-c.x,s.by[k]-c.y)<30)fromClone++;}});
 assert(veil>300,'the veil shows through the spell');assert(clones>300,'two clones stand beside the boss');assert(fromClone>20,'clones shoot: '+fromClone);
 const src=require('node:fs').readFileSync(require('node:path').join(h.root,'src/arcade-v43.js'),'utf8');
 const upd=/function updateBullets[\s\S]*?\n  \}/.exec(src)[0];assert(!/veil/.test(upd),'the veil is not part of the collision');
 const app=h.read('src/arcade-app-v43.js');assert(/function drawVeil\(/.test(app)&&/function drawIllusions\(/.test(app),'the app draws the veil and the clones');
});

test('v43 lust boss: the final spell mixes heart spiral, lipstick fan and heel dash on different beats',()=>{
 const a=h.need(),[[,i]]=cardsOf(a,'의지와 다르게');const kinds=new Set();
 run(a,i,1500,(s,before)=>{for(let k=before;k<s.n;k++){if(s.bsize[k]===a.SHAPE_PROP)kinds.add('heel');else if(s.bmode[k]===a.MODE_TURN)kinds.add('lipstick');else if(s.bsize[k]===0&&s.bcolor[k]===0)kinds.add('heart');}});
 assert.deepEqual([...kinds].sort(),['heart','heel','lipstick']);
});
