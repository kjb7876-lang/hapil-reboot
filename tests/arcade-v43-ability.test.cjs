'use strict';
/* 능력조절(사용자 11-20 "설정안에 능력조절 신규로 만들어서 기억사수는 출력조절 … 서하는 시간제어 … 7단계로 조절",
   "저속 누르면 탄환느려지는거 서하만 적용하고 기억사수는 자신의 데미지 증가 … 필살기 게이지 더 잘차게"). */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),{idle,put,read}=h;
const A=()=>h.need();
const near=(x,y)=>Math.abs(x-y)<1e-4; // 탄 자리는 Float32

test('ability defaults to off and is clamped: Memory 0..7, Seoha 0..3 (user 11-20 "3단계를 최고단계로")',()=>{
 const a=A();assert.equal(a.ABILITY_MAX,7);assert.equal(a.SEOHA_ABILITY_MAX,3);
 for(const [hero,max] of [['memory',7],['seoha',3],['seoha-b',3]]){const s=idle({hero});assert.equal(s.ability,0);const o=a.abilityOf(s);assert(near(o.damage,1)&&near(o.bulletSpeed,1)&&near(o.move,1),hero+' off = unchanged game');
  assert.equal(a.setAbility(s,99),max);assert.equal(a.setAbility(s,-3),0);assert.equal(idle({hero,ability:12}).ability,max);assert.equal(a.abilityMax(s),max);}
 const s=idle({hero:'seoha'});s.ability=7;assert(near(a.abilityOf(s,true).bulletSpeed,.67),'a stale 7 is read as the top step 3');
});

test('Memory Gunner output: damage and enemy bullet speed both rise with the level (7 = ×1.77 damage, ×1.385 bullets)',()=>{
 const a=A();let pd=1,ps=1;
 for(let l=1;l<=7;l++){const o=a.abilityOf(idle({hero:'memory',ability:l}));assert.equal(o.kind,'power');assert(o.damage>pd&&o.bulletSpeed>ps);assert(near(o.move,1));pd=o.damage;ps=o.bulletSpeed;}
 assert(near(pd,1.77)&&near(ps,1.385));
 const s=idle({hero:'memory'}),base=a.shotDamage(s);a.setAbility(s,7);assert(near(a.shotDamage(s)/base,1.77));
 const fly=l=>{const t=idle({hero:'memory',ability:l});put(t,40,100,{bage:100,bs:60,ba:0});const x0=t.bx[0];a.step(t,{dx:0,dy:0});return t.bx[0]-x0;};
 assert(near(fly(7)/fly(0),1.385),'far bullet flies faster at output 7');
});

test('Seoha time control works only while the psi (focus) button is held: 11/22/33% slower bullets and Seoha, stacking with the slow circle (user 11-20)',()=>{
 const a=A();[[1,.89],[2,.78],[3,.67]].forEach(([l,k])=>{const o=a.abilityOf(idle({hero:'seoha',ability:l}),true);assert.equal(o.kind,'time');assert(near(o.bulletSpeed,k)&&near(o.move,k)&&near(o.damage,1),'step '+l);});
 assert(near(a.abilityOf(idle({hero:'seoha',ability:3})).bulletSpeed,1),'not held: no effect');
 const fly=(l,focus,dist=130)=>{const t=idle({hero:'seoha',ability:l});t.power=7;put(t,t.player.x+dist,t.player.y-dist,{bage:100,bs:60,ba:0});const x0=t.bx[0];a.step(t,{dx:0,dy:0,focus});return t.bx[0]-x0;};
 assert(near(fly(3,false)/fly(0,false),1),'outside focus the setting does nothing');
 assert(near(fly(3,true)/fly(0,true),.67),'held, outside the circle: setting only');
 const inside0=fly(0,true,12),inside3=fly(3,true,12);assert(inside0<1&&near(inside3/inside0,.67),'held, inside the circle: passive slow × setting');
 const walk=(l,focus)=>{const t=idle({hero:'seoha',ability:l});const x0=t.player.x;a.step(t,{dx:50,dy:0,focus});return t.player.x-x0;};
 assert(near(walk(3,false)/walk(0,false),1)&&near(walk(3,true)/walk(0,true),.67),'Seoha slows only while held');
 assert(near(a.abilityOf(idle({hero:'seoha-b',ability:3}),true).bulletSpeed,.67),'Seoha (B) shares the trait');
});

test('focus: Seoha keeps the stronger slow field; Memory Gunner gets damage and bomb charge instead',()=>{
 const a=A(),seoha=idle({hero:'seoha'}),mem=idle({hero:'memory'});
 for(const s of [seoha,mem]){s.power=7;s.player.focus=true;}
 assert(near(a.slowField(seoha)[1],a.FOCUS_SLOW_MAX),'Seoha focus slows up to 77.7% as before');
 assert(near(a.slowField(mem)[1],a.SLOW_FIELD[7][1]),'Memory focus does not strengthen the slow field');
 const d=s=>{s.player.focus=false;const off=a.shotDamage(s);s.player.focus=true;return a.shotDamage(s)/off;};
 assert(near(d(mem),a.FOCUS_POWER)&&a.FOCUS_POWER>1,'Memory focus hits harder');assert(near(d(seoha),1),'Seoha focus damage unchanged');
 const charge=(hero,focus)=>{const s=idle({hero});s.power=1;let n=0;for(let i=0;i<4;i++){put(s,s.player.x+15,s.player.y-14+i*7,{bage:100});}
  a.step(s,{dx:0,dy:0,focus});return s.fills*a.GAUGE_FULL+s.gauge;};
 const mf=charge('memory',true),mn=charge('memory',false);assert(mn>0,'grazing charges the gauge');assert(near(mf/mn,a.FOCUS_GAUGE),`memory focus charges ×${a.FOCUS_GAUGE}: ${mf}/${mn}`);
 const trainee=charge('seoha',false),awakened=charge('seoha-b',false);
 assert(awakened>0&&near(trainee/awakened,1.77),'only the trainee gains extra charge from grazes');
 assert(near(charge('seoha',true),trainee),'the trainee also gains charge while focused');
 for(const difficulty of ['gentle','normal','hell']){
  const s=idle({hero:'seoha',difficulty});
  s.gauge=60;
  const bombs=s.bombs;
  a.dropItem(s,s.player.x,s.player.y,1);
  a.step(s,{});
  assert.equal(s.bombs,bombs+1,'one heart crosses the charge threshold in '+difficulty);
  assert(near(s.gauge,4.25),'the unused charge carries over');
 }
});

test('pause settings carry the ability sliders and the app hands the level to the engine',()=>{
 const html=read('arcade.html'),app=read('src/arcade-app-v43.js'),i18n=read('src/arcade-i18n-v43.js');
 for(const [id,max] of [['setting-abilityMemory',7],['setting-abilitySeoha',3]])assert(new RegExp(`id="${id}" type="range" min="0" max="${max}" step="1" value="${max}"`).test(html),id);
 assert(/data-i18n="ability">능력조절</.test(html)&&/출력조절/.test(html)&&/시간제어/.test(html));
 assert(/options=\{ability:abilityFor\(run\.hero\)/.test(app)&&/Arcade\.setAbility\(state,abilityFor\(state\.hero\)\)/.test(app));
 for(const k of ['ability','abilityPower','abilityTime','abilityPowerNote','abilityTimeNote'])assert.equal((i18n.match(new RegExp('\\b'+k+':','g'))||[]).length,2,k+' in ko and en');
});

test('the focus notes in the pause panel quote the engine numbers',()=>{
 const a=A(),html=read('arcade.html');
 assert(html.includes(`초능력: 공격 ×${a.FOCUS_POWER} · 필살 게이지 ×${a.FOCUS_GAUGE}`)&&html.includes('원 안 적탄은 한층 더 느려짐'));
});

test('Seoha psi: her own shots fly much slower, time bombs come twice as often and fly slower; Memory Gunner shots are untouched (user 11-20)',()=>{
 const a=A();assert(a.SEOHA_FOCUS_SHOT<=.5&&a.SEOHA_FOCUS_TB<a.SEOHA_FOCUS_SHOT);
 const shots=(hero,focus)=>{const s=idle({hero});s.mobs.push({kind:'x',x:s.player.x,baseX:s.player.x,y:120,r:12,hp:1e9,maxHp:1e9,hitTick:-99,elite:false,score:0,age:0,shots:0,vx:0,vy:0,sway:0,swayRate:0,fire:'aim',first:1e9,every:0,color:0,stopY:120,hold:1e9,next:1e9});
  const speeds=new Set(),tb=[];for(let t=0;t<240;t++){a.step(s,{dx:0,dy:0,focus});for(let i=0;i<s.sn;i++){speeds.add(Math.round(s.sspd[i]*100)/100);}if(s.events.includes('tbFire'))tb.push(s.tick);s.events.length=0;}
  return {speeds:[...speeds].sort((x,y)=>x-y),tb};};
 const sf=shots('seoha',true),sn=shots('seoha',false),mf=shots('memory',true);
 assert.deepEqual(sn.speeds,[15]);assert.deepEqual(mf.speeds,[15],'Memory Gunner unchanged');
 assert(sf.speeds.includes(15*a.SEOHA_FOCUS_SHOT)&&sf.speeds.includes(15*a.SEOHA_FOCUS_TB)&&!sf.speeds.includes(15),JSON.stringify(sf.speeds));
 assert(sf.tb.length>=sn.tb.length*1.6,`time bombs ${sf.tb.length} vs ${sn.tb.length}`);
});

test('enemies specialize by hero: more bullets against Seoha, more boss lasers against Memory Gunner (user 11-20)',()=>{
 const a=A(),mk=hero=>a.createRun({difficulty:'normal',seed:3,hero,entranceAll:true});
 const m=mk('memory'),s=mk('seoha');for(let t=0;t<30;t++){a.step(m,{});a.step(s,{});}assert(s.density>m.density*1.15&&s.rules.speed>m.rules.speed,'Seoha faces denser, slightly faster bullets');
 assert(a.heroLaserBias(m)>1&&a.heroLaserBias(s)===1,'laser bias is shared for other laser phases');
 const seg=a.SEGMENTS.findIndex((g,i)=>g.kind==='card'&&i>40),count=hero=>{const r=a.createRun({difficulty:'normal',seed:5,segment:seg,hero,entranceAll:true});let on=0;
  for(let t=0;t<1800&&r.seg===seg;t++){r.player.invulnerableUntil=r.tick+999;r.boss.hp=r.boss.maxHp;a.step(r,{dx:0,dy:0});r.events.length=0;if(r.lasers.length)on++;}return {on,n:r.heroLaserN||0};};
 const cm=count('memory'),cs=count('seoha');assert(cm.n>0&&cs.n===0&&cm.on>cs.on,JSON.stringify({cm,cs}));
});

test('Seoha time control slows the enemy fire clock with the bullets, so slowed bullets do not pile up (user 11-20 dodge check)',()=>{
 const a=A(),seg=a.SEGMENTS.findIndex((g,i)=>g.kind==='wave'&&i>100),run=(ability,focus)=>{const r=a.createRun({difficulty:'normal',seed:9,segment:seg,hero:'seoha',entranceAll:true,ability});let peak=0;
  for(let t=0;t<900&&r.seg===seg;t++){r.player.invulnerableUntil=r.tick+999;a.step(r,{dx:0,dy:0,focus});r.events.length=0;peak=Math.max(peak,r.n);}return {peak,held:r.timeHeld||0};};
 const off=run(0,true),max=run(3,true),idleMax=run(3,false);
 assert.equal(off.held,0);assert.equal(idleMax.held,0,'only while psi is held');assert(max.held>0);
 assert(max.peak<=off.peak*1.6,`slowed field stays near normal density ${max.peak} vs ${off.peak}`);
});
