'use strict';
/* 동방식 시스템(docs/v43/touhou-systems.md): 줄어드는 봉인 보너스 · 스침으로 오르는 하트 값과 수집선 · 봉인 조각 · 스테이지 결산 · 표시층 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),A=h.need(),Spirit=require('../src/arcade-spirit-v43.js');
const spell=A.SEGMENTS.findIndex(x=>x.spell);
function toCard(options){const s=A.createRun(Object.assign({difficulty:'normal',seed:3,segment:spell},options));for(let i=0;i<4000&&!(s.stage==='card'&&s.seg===spell);i++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});h.clear(s);}assert.equal(s.stage,'card');return s;}

test('the seal bonus starts at its full value, shrinks with time and never below a third',()=>{
 const s=toCard({entranceAll:true}),base=A.spellBonusBase(A.SEGMENTS[spell]);assert.equal(base,20000+A.SEGMENTS[spell].stage*5000);
 let last=A.spellBonus(s);assert.equal(last,base);
 for(let i=0;i<60*(A.SPELL_DECAY_FROM+A.SPELL_DECAY_OVER+20)&&s.stage==='card'&&s.seg===spell;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;A.step(s,{});h.clear(s);
  if(s.stage!=='card'||s.seg!==spell)break;const v=A.spellBonus(s);assert(v<=last,'never grows');assert(v>=Math.floor(base/3/10)*10,'floor');last=v;}
 assert(last<base*.6,'a slow clear is worth clearly less: '+last);
 const idle=h.idle();assert.equal(A.spellBonus(idle),0,'no bonus outside a named pattern');
});

test('a quick clean clear is paid more than a slow one, and a hit or bomb pays nothing',()=>{
 const run=(wait,mess,options)=>{const s=toCard(options);let got=0,miss=false;for(let i=0;i<20000&&s.seg===spell;i++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card'&&s.segTick>=wait)s.boss.hp=0;else if(s.stage==='card')s.boss.hp=s.boss.maxHp;
   if(mess&&s.stage==='card'&&s.segTick===50)s.spellClean=false;A.step(s,{});if(s.events.includes('capture'))got=s.lastCapture.bonus;if(s.events.includes('captureMiss'))miss=true;h.clear(s);}return {got,miss,s};};
 const quick=run(60),slow=run(60*40,false,{entranceAll:true}),failed=run(60,true);
 assert(quick.got>slow.got&&slow.got>0,JSON.stringify([quick.got,slow.got]));assert.equal(quick.s.captures,1);assert.equal(quick.s.lastCapture.ok,true);
 assert.equal(failed.got,0);assert.equal(failed.miss,true);assert.equal(failed.s.captures,0);assert.equal(failed.s.lastCapture.ok,false);assert.equal(failed.s.pieces,0);
 // 실제 게임은 페이즈 최소 시간 동안 보스가 쓰러지지 않는다: 그 시간 안에 체력을 다 깎았다면 보너스는 줄지 않은 값이다.
 const live=run(60,false,{entranceAll:true});assert.equal(live.got,A.spellBonusBase(A.SEGMENTS[spell]),'the forced minimum phase time costs nothing');
});

test('grazing raises the heart value; the collection line pays the full value and low pickups pay less',()=>{
 const s=h.idle();assert.equal(A.pointValue(s),A.POINT_BASE);s.graze=40;assert(A.pointValue(s)>A.POINT_BASE);s.graze=1e6;assert.equal(A.pointValue(s),A.POINT_MAX);
 s.graze=40;const full=A.pointValue(s);assert.equal(A.heartWorth(s,A.AUTO_COLLECT_Y),full);assert(A.heartWorth(s,A.HEIGHT-14)<full*.4);assert(A.heartWorth(s,400)>A.heartWorth(s,560));
 const low=h.idle();low.graze=40;const before=low.score;A.dropItem(low,low.player.x+4,low.player.y,0);A.step(low,{});
 assert.equal(low.itemsTaken,1);assert.deepEqual(Array.from(low.gets.slice(2)),[low.score-before,0],'a low pickup is reported as not full');assert(low.score-before<full);
 const high=h.idle();high.graze=40;high.player.y=A.AUTO_COLLECT_Y-10;A.dropItem(high,40,500,0);A.dropItem(high,300,560,0);const b2=high.score;let n=0;while(high.itemCount&&n++<300)A.step(high,{});
 assert.equal(high.itemsTaken,2);assert.equal(high.score-b2,full*2,'above the line every heart pays the full value');assert.deepEqual([high.gets[3],high.gets[7]],[1,1]);
 const gauge=h.idle(),g0=gauge.score;A.dropItem(gauge,gauge.player.x,gauge.player.y,1);A.step(gauge,{});assert.equal(gauge.score,g0,'charge items carry no score');assert.equal(gauge.gets.length,0);
 const many=h.idle();for(let i=0;i<300;i++){A.dropItem(many,many.player.x,many.player.y,0);A.step(many,{});}assert(many.gets.length<=160,'the report list is bounded when nothing drains it');
});

test('every third seal restores a life, then a bomb, and never exceeds the caps',()=>{
 const cap=(s)=>{s.stage='card';s.seg=spell;s.segTick=100;s.spellClean=true;s.boss.present=true;s.boss.actor=A.SEGMENTS[spell].actor;s.boss.hp=0;s.boss.maxHp=10;A.step(s,{});};
 const s=A.createRun({difficulty:'normal',seed:5,segment:spell});s.player.invulnerableUntil=1e9;s.player.hp=1;const max=s.player.maxHp;
 let ext=0;for(let k=1;k<=6;k++){for(let i=0;i<4000&&!(s.stage==='card');i++){A.step(s,{});h.clear(s);}s.seg=spell;const hp=s.player.hp,c=s.captures;cap(s);
  assert.equal(s.captures,c+1);if(s.events.includes('extend'))ext++;assert.equal(s.pieces,k%A.LIFE_PIECES);assert.equal(s.player.hp,hp+(k%A.LIFE_PIECES===0?1:0));h.clear(s);}
 assert.equal(ext,2);assert(s.player.hp<=max);
 const full=A.createRun({difficulty:'normal',seed:5,segment:spell});full.player.invulnerableUntil=1e9;full.pieces=A.LIFE_PIECES-1;for(let i=0;i<4000&&full.stage!=='card';i++){A.step(full,{});h.clear(full);}
 const bombs=full.bombs;cap(full);assert.equal(full.player.hp,full.player.maxHp);assert.equal(full.bombs,Math.min(4,bombs+1),'a full life bar turns the piece into a bomb');assert.equal(full.pieces,0);
});

test('the stage tally adds stage, graze, no-hit and no-bomb bonuses and reports them',()=>{
 assert.equal(A.clearBonus(0,0,1,1),2000);assert(A.clearBonus(3,50,0,0)>A.clearBonus(3,50,1,0));assert(A.clearBonus(3,50,0,0)>A.clearBonus(3,50,0,1));assert(A.clearBonus(3,60,1,1)>A.clearBonus(3,50,1,1));
 const r=h.play({difficulty:'gentle',seed:3,stage:0,stages:2},200000);assert.equal(r.s.stage,'won');
 let sum=0;r.s.results.forEach((x,i)=>{assert(x.graze>=0);assert.equal(x.bonus,A.clearBonus(i,x.graze,x.hits,x.bombs));sum+=x.graze;});assert.equal(sum,r.s.graze,'graze is split per stage');
 assert.equal(Spirit.tally(r.s.results[0]).includes('결산 +'),true);assert.equal(Spirit.tally(null),'');
});

test('the display layer only reads the run: history counts tries and seals per difficulty, and pickups are merged',()=>{
 const store={};global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v);}};
 try{
  const s=toCard();Spirit.reset();Spirit.onEvent('card',s,A);const name=A.SEGMENTS[spell].name;assert.deepEqual(Spirit.history(name,'normal'),[1,0]);assert.deepEqual(Spirit.history(name,'hell'),[0,0]);
  s.lastCapture={ok:true,bonus:1230,tick:s.tick,seg:spell,name};Spirit.onEvent('capture',s,A);assert.deepEqual(Spirit.history(name,'normal'),[1,1]);assert.deepEqual(Spirit.state().stamp,{ok:true,bonus:1230});
  Spirit.onEvent('capture',s,A);assert.deepEqual(Spirit.history(name,'normal'),[1,1],'seals never exceed tries');assert(JSON.parse(store[Spirit.BOOK_KEY])['normal|'+name]);
  Spirit.onEvent('captureMiss',s,A);assert.equal(Spirit.state().stamp,null,'a missed pattern raises no centre notice');
  const before=JSON.stringify({score:s.score,hp:s.player.hp,n:s.n,tick:s.tick});s.gets.push(10,20,500,1,30,40,500,1);Spirit.consume(s);assert.equal(s.gets.length,0);assert.equal(Spirit.state().popups,1,'same-tick pickups share one number');
  assert.equal(JSON.stringify({score:s.score,hp:s.player.hp,n:s.n,tick:s.tick}),before);
  const practice=toCard({bossOnly:true});Spirit.onEvent('card',practice,A);assert.deepEqual(Spirit.history(name,'normal'),[1,1],'boss practice is not recorded');
  assert.equal(Spirit.comma(1234567),'1,234,567');
 }finally{delete global.localStorage;}
});

test('the page loads the display layer before the app, and the app draws it without owning any rule',()=>{
 const html=h.read('arcade.html'),app=h.read('src/arcade-app-v43.js'),spirit=h.read('src/arcade-spirit-v43.js');
 assert(html.indexOf('src/arcade-spirit-v43.js')>0&&html.indexOf('src/arcade-spirit-v43.js')<html.indexOf('src/arcade-app-v43.js'));
 for(const call of ['Spirit.consume(s)','Spirit.onEvent(e,s,Arcade)','Spirit.drawWorld(','Spirit.drawHud(','Spirit.reset()'])assert(app.includes(call),call);
 assert(!/s\.(score|graze|captures|pieces|bombs)\s*(\+=|-=|\+\+|--|=[^=])/.test(spirit),'the display layer never writes run totals');assert(!/player\.hp\s*(\+=|-=|\+\+|--|=[^=])/.test(spirit));
 assert(!/[✝✞✟†]/.test(spirit),'no cross');
 for(const f of ['arcade.html','src/arcade-i18n-v43.js'])assert(h.read(f).includes('수집선'),f+' explains the collection line');
});
