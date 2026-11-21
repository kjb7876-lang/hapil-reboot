'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),H=require('../src/arcade-heroes-v43.js');
const {idle,put,clear}=require('./helpers/arcade-v43.cjs');

test('hero profiles load in Node and the browser, with a safe immutable default',()=>{
 const browser={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/arcade-heroes-v43.js'),'utf8'),browser);
 assert.equal(browser.HapilArcadeHeroes.get('seoha').name,'윤서하 · 수련생');
 assert.equal(browser.HapilArcadeHeroes.get('seoha-b').name,'윤서하 · 각성');
 assert.deepEqual(H.list().map(p=>p.id),['memory','seoha','seoha-b']);
 for(const id of [undefined,null,'','missing','__proto__','constructor'])assert.equal(H.get(id).id,'memory');
 for(const p of H.list()){
  assert(Object.isFrozen(p)&&Object.isFrozen(p.shot));assert.equal(p.bombNames.length,8);
  assert.equal(new Set(p.bombNames.slice(1)).size,7);
  for(const file of [p.portrait,p.sprite,p.cutin])assert(fs.statSync(path.join(__dirname,'..',file)).size>1000,file);
 }
 assert.deepEqual(H.get('memory').bombNames,A.BOMB_NAMES);
 const canon=fs.readFileSync(path.join(__dirname,'../docs/v43/canonical-story.txt'),'utf8');
 for(const text of ['윤서하','카이로스 아카데미움','시간검'])assert(canon.includes(text));
 assert.equal(H.get('seoha').source.combatAdaptation,true,'skill labels are game adaptations');
});

test('omitting hero preserves the explicit memory hero deterministic replay',()=>{
 const a=A.createRun({seed:73}),b=A.createRun({seed:73,hero:'memory'});
 for(let t=0;t<900;t++){
  a.player.invulnerableUntil=b.player.invulnerableUntil=t+999;
  const input={dx:Math.sin(t*.03)*3,focus:t%120<60,bomb:t===300};
  A.step(a,input);A.step(b,input);clear(a);clear(b);
 }
 assert.deepEqual(a,b);assert.equal(a.hero,'memory');
 assert.equal(A.createRun({hero:'unknown'}).hero,'memory');
});

test('hero identity survives stage advancement and recreation with saved growth',()=>{
 for(const hero of ['seoha','seoha-b']){
 const s=A.createRun({hero,stage:33,growth:true});
 for(let t=0;t<5;t++)A.step(s,{});
 assert.equal(s.hero,hero);assert.equal(A.heroProfile(s).id,hero);
 const resumed=A.createRun({hero:s.hero,segment:s.seg,pacing:true,grown:{exp:1300,fills:21}});
 assert.equal(resumed.hero,hero);assert.equal(resumed.power,7);assert.equal(resumed.bombLevel,7);
 assert.equal(A.heroProfile(hero).id,hero);
 assert.equal(A.bombName(resumed),H.get(hero).bombNames[7]);
 }
});

test('Seoha focus narrows the actual shot paths without changing projectile counts at any level',()=>{
 for(let level=1;level<=7;level++){
  const volley=(hero,focus)=>{
   const s=idle({hero});s.power=level;s.exp=A.POWER_EXP[level-1];s.tick=A.POWER_SHOTS[level][1]-1;
   A.step(s,{focus});const shots=[];for(let i=0;i<s.sn;i++)if(!s.shoming[i])shots.push({x:s.sx[i],vx:s.svx[i]});return shots;
  };
  const memory=volley('memory',false);
  for(const hero of ['seoha','seoha-b']){
  const wide=volley(hero,false),narrow=volley(hero,true);
  assert.equal(wide.length,A.POWER_SHOTS[level][0]);assert.equal(wide.length,memory.length);assert.equal(narrow.length,wide.length);
  const width=q=>Math.max(...q.map(s=>s.x))-Math.min(...q.map(s=>s.x));
  assert(width(narrow)<width(wide)*.5,'focused volley is narrower at level '+level);
  assert(wide[0].vx<0&&wide.at(-1).vx>0,'normal volley fans outward');
  assert(narrow.every(s=>s.vx===0),'focused time blades travel straight');
  }
 }
});

function target(){return {kind:'test',x:180,baseX:180,y:480,r:70,hp:100000,maxHp:100000,hitTick:-99,elite:false,score:0,age:0,shots:0,vx:0,vy:0,sway:0,swayRate:0,fire:'aim',first:999999,every:0,next:999999};}
test('equal-level heroes deliver equal damage to an aligned target through real shots and bolts (Memory Gunner ×FOCUS_POWER while focused)',()=>{
 for(let level=1;level<=7;level++)for(const focus of [false,true]){
  const damage=hero=>{
   const s=idle({hero});s.power=level;s.exp=A.POWER_EXP[level-1];s.mobs.push(target());
   for(let t=0;t<600;t++){A.step(s,{focus});clear(s);}
   return 100000-s.mobs[0].hp;
  };
  const memory=damage('memory');assert(memory>100);
  for(const hero of ['seoha','seoha-b']){const seoha=damage(hero),want=focus?seoha*A.FOCUS_POWER:seoha;assert(Math.abs(memory-want)<1e-6,`${hero}, level ${level}, focus ${focus}: ${memory} vs ${want}`);} // 사용자 11-20: 저속 때 기억사수만 피해 ×FOCUS_POWER(서하는 대신 탄 둔화)
 }
});

test('all three heroes share lives, hitbox, growth, normal automatic defense and manual-only hell',()=>{
 for(const difficulty of ['gentle','normal','hell'])for(const hero of ['memory','seoha','seoha-b']){
  const s=idle({hero,difficulty,distort:false}),p=s.player,hp=p.hp,bombs=s.bombs;
  assert.equal(hp,A.DIFFICULTY[difficulty].hp);assert.equal(p.r,A.DIFFICULTY[difficulty].radius);
  A.gainExp(s,Math.ceil(A.POWER_EXP[6]*100/A.POWER_EXP_RATE));assert.equal(s.power,7);assert.deepEqual(A.slowField(s),A.SLOW_FIELD[7]);
  put(s,p.x,p.y,{bage:100});A.step(s,{});
  if(difficulty==='hell'){
   assert.equal(s.autoBombs,0);assert.equal(s.distorts,0);assert.equal(p.hp,hp-1);assert.equal(s.bombs,bombs);assert.equal(A.distortChance(s),0);
   A.step(s,{bomb:true});assert.equal(s.bombsUsed,1,'manual bomb still works');
  }else{
   assert.equal(p.hp,hp);assert.equal(s.autoBombs,1);assert.equal(s.bombs,bombs-1);assert.equal(s.lastBomb.hero,hero);assert.equal(s.lastBomb.auto,true);
  }
  assert.equal(s.lastBomb.name,A.bombName(s,s.lastBomb.level));
 }
});

test('both Seoha appearances across seven bomb levels keep the same damage pulses, stock cost and protection',()=>{
 const segment=A.SEGMENTS.findIndex(s=>s.kind==='card');
 for(const hero of ['memory','seoha','seoha-b'])for(let level=1;level<=7;level++){
  const s=A.createRun({hero,difficulty:'hell',segment});s.stage='card';s.stageTick=0;s.bombLevel=level;s.bombs=1;
  s.boss.hp=s.boss.maxHp=100000;s.boss.x=s.boss.targetX=330;s.boss.y=s.boss.targetY=150;s.player.x=8;
  let pulses=0;
  for(let t=0;t<110;t++){
   // Isolate bomb damage: occupy shot slots with already offscreen shots.
   s.sn=s.sx.length;s.sx.fill(-100);s.sy.fill(-100);
   A.step(s,{bomb:t===0});if(s.events.includes('bombPulse'))pulses++;
   if(t===0){assert.equal(s.bombs,0);assert.equal(s.bombsUsed,1);assert.equal(s.player.invulnerableUntil-s.tick,150);assert.equal(s.lastBomb.hero,hero);}
   clear(s);
  }
  assert.equal(pulses,A.BOMB_PULSES);assert(Math.abs(100000-s.boss.hp-A.BOMB_POWER[level][0])<1e-6);
  assert.equal(s.lastBomb.name,H.get(hero).bombNames[level]);
 }
});

test('Seoha A and B share the authored attack profile and have their own portraits and charge rules',()=>{
 const a=H.get('seoha'),b=H.get('seoha-b');
 assert.equal(a.portrait,'media/arcade-v43-heroes/seoha-portrait.webp');
 assert.equal(a.sprite,'media/arcade-v43-heroes/seoha-player.webp');
 assert.equal(b.portrait,'media/arcade-v43-heroes/seoha-portrait-v2.webp');
 assert.equal(b.sprite,'media/arcade-v43-heroes/seoha-player-v2.webp');
 assert.notEqual(a.cutin,b.cutin);assert.deepEqual(a.shot,b.shot);assert.deepEqual(a.bombNames,b.bombNames);
 for(const difficulty of ['gentle','normal','hell']){
  const left=A.createRun({hero:'seoha',difficulty,seed:504}),right=A.createRun({hero:'seoha-b',difficulty,seed:504});
  for(let t=0;t<600;t++){
   left.player.invulnerableUntil=right.player.invulnerableUntil=t+999;
   const input={dx:Math.sin(t/37)*2,focus:t%90<45,bomb:t===240};A.step(left,input);A.step(right,input);clear(left);clear(right);
  }
  assert(Math.abs(left.gauge-right.gauge*1.77)<1e-6,difficulty+' trainee charge');
  const comparable=s=>{const c=JSON.parse(JSON.stringify(s));delete c.hero;delete c.gauge;if(c.lastBomb)delete c.lastBomb.hero;return c;};
  assert.deepEqual(comparable(left),comparable(right),difficulty+' authored play stays in sync before the first charge fills');
 }
});
