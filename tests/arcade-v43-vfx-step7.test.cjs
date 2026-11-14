'use strict';
/* 지시서 STEP 7(VFX). 7전문가 심사 11-14 반복 지적: 흰 탄이 겹치면 하얀 덩어리로 번져 보스를 가린다,
   발록의 첫 일반 공격(현수선 아치)이 3.5초가 지나도 화면 위쪽 벽처럼 머문다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 pale bullets keep a dark rim and a weaker halo so overlapping white bullets stay separate',()=>{
 const app=h.read('src/arcade-app-v43.js');
 for(const name of ['buildOrb','buildSkin']){const body=new RegExp('function '+name+'[\\s\\S]*?\\n  \\}').exec(app)[0];
  assert(/paleRimOf\(color\)/.test(body),name+' draws its rim with paleRimOf(color)');assert(/haloOf\(color/.test(body),name+' picks its halo strength with haloOf(color)');}
 const rim=/function paleRimOf[\s\S]*?\}/.exec(app);assert(rim,'paleRimOf exists');assert(/PALE_RIM/.test(rim[0]),'pale colours get the dark rim');
});

test('v43 app declares each top-level function name once (a second rimOf silently replaced the mob rim and broke page load)',()=>{
 const app=h.read('src/arcade-app-v43.js'),seen=new Map(),dup=[];
 for(const m of app.matchAll(/^  function ([A-Za-z_$][\w$]*)\(/gm)){if(seen.has(m[1]))dup.push(m[1]);seen.set(m[1],1);}
 assert.deepEqual(dup,[],'duplicate functions: '+dup.join(','));
});

test('v43 catenary arches (balrog plain attack) come a third of the way down within 3.5 seconds',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.spell&&g.plain==='catenary');assert(i>=0);
 const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});let t=0;
 while(!(s.stage==='card'&&s.seg===i)&&t++<4000){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});}
 assert.equal(s.seg,i);const start=s.segTick;let deepest=0;
 for(let k=0;k<210;k++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});}
 for(let k=0;k<s.n;k++)deepest=Math.max(deepest,s.by[k]);
 assert(deepest>=a.HEIGHT*.3,'deepest arch bullet y '+deepest.toFixed(0)+' of '+a.HEIGHT+' after 3.5s (from tick '+start+')');
});
