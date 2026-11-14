'use strict';
/* 잡몹 구간 압박 — 11-14 지시서: 잡몹 구간이 보스전에 비해 지나치게 한가하지 않게(목표 보스의 약 70%), 그렇다고 보스보다 훨씬 세지도 않게. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');
const avg=(a,i,ticks,difficulty)=>{const s=a.createRun({difficulty,seed:3,segment:i,stages:1});let sum=0,n=0;
 for(let t=0;t<ticks&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});if(t>60){sum+=s.n;n++;}}return n?sum/n:0;};
const ratios=(a,difficulty,stages)=>stages.map(st=>{const w=[],c=[];a.SEGMENTS.forEach((g,i)=>{if(g.stage!==st)return;if(g.kind==='wave')w.push(avg(a,i,g.duration,difficulty));else if(g.kind==='card')c.push(avg(a,i,900,difficulty));});
 const m=x=>x.reduce((p,q)=>p+q,0)/x.length;return m(w)/m(c);});
const SAMPLE=[0,9,13,18,29,40,48,55];

test('v43 mob pressure: the quietest waves are no longer idle next to their boss, and none is far above it',()=>{
 const a=h.need(),r=ratios(a,'normal',SAMPLE),sorted=[...r].sort((x,y)=>x-y),median=(sorted[3]+sorted[4])/2;
 assert(median>=.35,'median wave/boss pressure '+median.toFixed(2)+' '+r.map(x=>x.toFixed(2)));
 assert(Math.min(...r)>=.22,'no stage is idle: '+r.map(x=>x.toFixed(2)));
 assert(Math.max(...r)<=1.25,'no stage is far above its boss: '+r.map(x=>x.toFixed(2)));
});

test('v43 mob pressure: mobs keep firing while on screen and rest when the screen is full',()=>{
 const a=h.need();assert.equal(typeof a.refireEvery,'function','refire governor exported');
 const s=a.createRun({difficulty:'normal',seed:1,segment:0,stages:1});
 s.n=0;const low=a.refireEvery(s,60);s.n=400;const high=a.refireEvery(s,60);s.n=300;const mid=a.refireEvery(s,60);
 assert(low<mid&&mid<high,'refire slows as the screen fills: '+[low,mid,high]);assert(low>=12,'never faster than 12 ticks');
 s.n=0;assert(a.refireEvery(s,0)>0,'mobs without their own interval still refire');
});

test('v43 stage banner clears after a fixed amount of game time, not after a number of drawn frames',()=>{
 const app=h.read('src/arcade-app-v43.js');
 assert(/function showBanner\([^)]*\)\{[^}]*bannerTick=/.test(app),'the banner remembers the tick it appeared on');
 assert(/banner=Math\.max\(0,1-\(s\.tick-bannerTick\)\/BANNER_TICKS\)/.test(app),'the banner fades by game ticks');
 assert(!/banner-=1\/80/.test(app),'no per-frame countdown left');
});
