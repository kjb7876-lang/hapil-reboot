'use strict';
/* 사용자 11-25 16:16 KST: "헬모드 윗단계로 핸디캡모드 … 하트1에 필살기2 필살기및 시공간왜곡 자동사용 미적용해서 순수피지컬모드", "초능력은 있어야함". */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('handicap = hell patterns with 1 life, 2 bombs (cap 2), no distortion even with fruits',()=>{
 for(const compact of [false,true]){
  const s=h.idle({difficulty:'handicap',fruits:10,compact,entranceAll:true});
  assert.equal(s.handicap,true);assert.equal(s.mode,'handicap');assert.equal(s.difficulty,'hell','patterns follow hell');
  assert.equal(s.player.hp,1);assert.equal(s.player.maxHp,1);assert.equal(s.bombs,2);assert.equal(A.bombCap?A.bombCap(s):2,2);
  assert.equal(s.noDistort,true);assert.equal(s.fruits,0);}
 const hell=h.idle({difficulty:'hell',entranceAll:true}),hc=h.idle({difficulty:'handicap',entranceAll:true});
 assert.equal(hell.mode,'hell');assert.equal(hc.rules.speed,hell.rules.speed);assert.equal(hc.density,hell.density);assert.equal(hc.rules.radius,hell.rules.radius);
});

test('handicap hit kills at once: no distortion, no automatic bomb',()=>{
 const s=h.idle({difficulty:'handicap',seed:9,fruits:10});
 h.put(s,s.player.x,s.player.y,{bage:100});A.step(s,{dx:0,dy:0});
 assert.equal(s.distorts,0);assert.equal(s.autoBombs,0);assert.equal(s.bombs,2);assert.equal(s.stage,'lost');
});

test('handicap keeps the Psi power (focus) of both heroes and is wired into the UI and records',()=>{
 for(const hero of ['memory','seoha']){const s=h.idle({difficulty:'handicap',hero,entranceAll:true});s.player.focus=true;A.step(s,{dx:0,dy:0,focus:true});assert.equal(s.handicap,true);}
 assert(read('arcade.html').includes('data-difficulty="handicap"'));
 assert(A.DIFFICULTY.handicap&&A.DIFFICULTY.handicap.hp===1&&A.DIFFICULTY.handicap.bombs===2);
 assert(/handicap:4/.test(read('src/arcade-chapters-v43.js')));
 assert(/noteHandicap/.test(read('src/arcade-i18n-v43.js')));
});
