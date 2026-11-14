'use strict';
/* 사용자 11-14 22:16 KST: "목숨 모든 모드 2개씩 더", "하트 나오는 거 수 적게", 탄이 닿기 직전 끊기면 맥빠짐. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 lives: every difficulty starts with two more lives than before (7/3/1 -> 9/5/3), hell still the fewest',()=>{
 const d=h.need().DIFFICULTY;assert.deepEqual([d.gentle.hp,d.normal.hp,d.hell.hp],[9,5,3]);
 const a=h.need();for(const [k,n] of [['gentle',9],['normal',5],['hell',3]]){const s=a.createRun({difficulty:k,seed:1});assert.equal(s.player.hp,n,k);}
});

test('v43 hearts: only every third ordinary mob drops a heart, elites and spells drop fewer',()=>{
 const a=h.need();assert.equal(a.MOB_DROP_EVERY,3);assert(a.ELITE_DROPS<=3&&a.CARD_DROPS<=4,'fewer drops');
 const s=a.createRun({difficulty:'normal',seed:1,segment:0,stages:1});let kills=0;
 for(let t=0;t<1600&&s.seg===0;t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});kills=s.kills;}
 assert(kills>=6,'mobs were shot down: '+kills);
 assert(s.hearts<=Math.ceil(kills/3)+3*a.ELITE_DROPS,'hearts '+s.hearts+' for '+kills+' kills');
});

test('v43 drifting bullets: when a spell or wave ends, its bullets drift on to the edge instead of popping, and never hit',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);
 const s=a.createRun({difficulty:'normal',seed:2,segment:i,stages:1});
 for(let t=0;t<300;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});s.events.length=0;s.cancelled.length=0;}
 const live=s.n;assert(live>20,'bullets on screen before the end: '+live);
 s.boss.hp=0;s.drifted.length=0;for(let t=0;t<3&&s.drifted.length===0;t++)a.step(s,{dx:0,dy:0});
 assert.equal(s.drifted.length/5,live,'every bullet becomes a drifting one');assert.equal(s.cancelled.length,0,'none pop');
 for(let k=0;k<s.drifted.length;k+=5)assert(Number.isFinite(s.drifted[k+3])&&s.drifted[k+4]>0,'keeps its heading and speed');
 const app=h.read('src/arcade-app-v43.js');assert(/function drawDrifts\(/.test(app)&&/drawShots\(s\);drawDrifts\(\);/.test(app),'the app draws them under the live bullets');
 assert(!/drifts/.test(/function updateBullets[\s\S]*?\n  \}/.exec(h.read('src/arcade-v43.js'))[0]),'drifting bullets are not in the collision');
});
