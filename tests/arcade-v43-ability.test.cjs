'use strict';
/* 능력조절(사용자 11-20 "설정안에 능력조절 신규로 만들어서 기억사수는 출력조절 … 서하는 시간제어 … 7단계로 조절",
   "저속 누르면 탄환느려지는거 서하만 적용하고 기억사수는 자신의 데미지 증가 … 필살기 게이지 더 잘차게"). */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),{idle,put,read}=h;
const A=()=>h.need();
const near=(x,y)=>Math.abs(x-y)<1e-5; // 탄 자리는 Float32

test('ability defaults to off and is clamped to 0..7 for both heroes',()=>{
 const a=A();assert.equal(a.ABILITY_MAX,7);
 for(const hero of ['memory','seoha']){const s=idle({hero});assert.equal(s.ability,0);const o=a.abilityOf(s);assert(near(o.damage,1)&&near(o.bulletSpeed,1)&&near(o.move,1),hero+' off = unchanged game');
  assert.equal(a.setAbility(s,99),7);assert.equal(a.setAbility(s,-3),0);assert.equal(idle({hero,ability:12}).ability,7);}
});

test('Memory Gunner output: damage and enemy bullet speed both rise with the level (7 = ×1.77 damage, ×1.385 bullets)',()=>{
 const a=A();let pd=1,ps=1;
 for(let l=1;l<=7;l++){const o=a.abilityOf(idle({hero:'memory',ability:l}));assert.equal(o.kind,'power');assert(o.damage>pd&&o.bulletSpeed>ps);assert(near(o.move,1));pd=o.damage;ps=o.bulletSpeed;}
 assert(near(pd,1.77)&&near(ps,1.385));
 const s=idle({hero:'memory'}),base=a.shotDamage(s);a.setAbility(s,7);assert(near(a.shotDamage(s)/base,1.77));
 const fly=l=>{const t=idle({hero:'memory',ability:l});put(t,40,100,{bage:100,bs:60,ba:0});const x0=t.bx[0];a.step(t,{dx:0,dy:0});return t.bx[0]-x0;};
 assert(near(fly(7)/fly(0),1.385),'far bullet flies faster at output 7');
});

test('Seoha time control: up to 77% slower enemy bullets and Seoha moves slower by the same ratio',()=>{
 const a=A(),o=a.abilityOf(idle({hero:'seoha',ability:7}));assert.equal(o.kind,'time');assert(near(o.bulletSpeed,.23)&&near(o.move,.23)&&near(o.damage,1));
 const fly=l=>{const t=idle({hero:'seoha',ability:l});put(t,40,100,{bage:100,bs:60,ba:0});const x0=t.bx[0];a.step(t,{dx:0,dy:0});return t.bx[0]-x0;};
 assert(near(fly(7)/fly(0),.23));
 const walk=(l,focus)=>{const t=idle({hero:'seoha',ability:l});const x0=t.player.x;a.step(t,{dx:50,dy:0,focus});return t.player.x-x0;};
 assert(near(walk(7)/walk(0),.23)&&near(walk(7,true)/walk(0,true),.23));
 assert(near(a.abilityOf(idle({hero:'seoha-b',ability:3})).bulletSpeed,.67),'Seoha (B) shares the trait');
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
 assert(near(charge('seoha',true),charge('seoha',false)),'Seoha focus charge unchanged');
});

test('pause settings carry the ability sliders and the app hands the level to the engine',()=>{
 const html=read('arcade.html'),app=read('src/arcade-app-v43.js'),i18n=read('src/arcade-i18n-v43.js');
 for(const id of ['setting-abilityMemory','setting-abilitySeoha'])assert(new RegExp(`id="${id}" type="range" min="0" max="7" step="1"`).test(html),id);
 assert(/data-i18n="ability">능력조절</.test(html)&&/출력조절/.test(html)&&/시간제어/.test(html));
 assert(/options=\{ability:abilityFor\(run\.hero\)/.test(app)&&/Arcade\.setAbility\(state,abilityFor\(state\.hero\)\)/.test(app));
 for(const k of ['ability','abilityPower','abilityTime','abilityPowerNote','abilityTimeNote'])assert.equal((i18n.match(new RegExp('\\b'+k+':','g'))||[]).length,2,k+' in ko and en');
});

test('the focus notes in the pause panel quote the engine numbers',()=>{
 const a=A(),html=read('arcade.html');
 assert(html.includes(`저속: 공격 ×${a.FOCUS_POWER} · 필살 게이지 ×${a.FOCUS_GAUGE}`)&&html.includes(`최대 ${Math.round(a.FOCUS_SLOW_MAX*1000)/10}% 느려짐`));
});
