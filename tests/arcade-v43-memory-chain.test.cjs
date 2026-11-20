'use strict';
/* 사용자 11-20 "기억사수의 기본공격은 기본공격탄 주변의 적에게 약한 유도 타격", "초능력 사용시 거의 타겟유도 + 약한 연쇄 체인라이트닝으로 다수의 적을 빨리 섬멸". */
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js');const {idle,clear}=require('./helpers/arcade-v43.cjs');
function mob(x,y,hp){return {kind:'test',x,baseX:x,y,r:14,hp,maxHp:hp,hitTick:-99,elite:false,score:0,age:0,shots:0,vx:0,vy:0,sway:0,swayRate:0,fire:'aim',first:999999,every:0,next:999999};}
function shotAt(s,x,y){const i=s.sn++;s.sx[i]=x;s.sy[i]=y;s.svx[i]=0;s.shoming[i]=0;s.skind[i]=0;s.sspd[i]=15;return i;}
function crowd(hero,focus,level=4){const s=idle({hero,distort:false});s.power=level;s.exp=A.POWER_EXP[level-1];
 for(let r=0;r<4;r++)for(let c=0;c<6;c++)s.mobs.push(mob(30+c*60+(r%2)*25,90+r*55,5));
 let t=0;for(;t<3000&&s.mobs.length;t++){s.player.invulnerableUntil=1e9;A.step(s,{focus});clear(s);}return {t,s};}

test('base shots bend weakly toward a nearby foe; focus locks on hard',()=>{
 const s=idle({hero:'memory'});s.mobs.push(mob(200,320,1e6));const i=shotAt(s,170,400);
 A.seekShot(s,i,false);assert(Math.abs(s.sx[i]-170-A.SEEK_STEER)<1e-4,'weak bend');
 const far=shotAt(s,60,400);A.seekShot(s,far,false);assert.equal(s.sx[far],60,'out of the weak reach: straight');
 A.seekShot(s,far,true);assert(Math.abs(s.sx[far]-60-A.LOCK_STEER)<1e-4,'focus lock bends far shots too');
 assert(A.SEEK_STEER<A.LOCK_STEER/4&&A.SEEK_BOSS<A.SEEK_STEER&&A.LOCK_BOSS<A.LOCK_STEER/10);
});
test('focused hits chain weakly through mobs (never the boss) and clear a crowd much faster',()=>{
 const s=idle({hero:'memory'});s.tick=100;const a=mob(100,200,100),b=mob(160,210,100),c=mob(220,200,100),d=mob(345,330,100);s.mobs.push(a,b,c,d);
 const n=A.chainBolt(s,a,10);assert.equal(n,2,'two hops in reach, the far one is out');
 assert(Math.abs(100-b.hp-10*A.CHAIN_DMG)<1e-9&&Math.abs(100-c.hp-10*A.CHAIN_DMG*A.CHAIN_DECAY)<1e-9&&d.hp===100&&a.hp===100);
 assert.equal(A.chainBolt(s,a,10),0,'gap between chains');
 const marks=[];for(let i=0;i<s.shotHits.length;i+=5)marks.push(s.shotHits[i+2]);assert.deepEqual(marks,[5,5,6]);
 const plain=crowd('memory',false),psi=crowd('memory',true),seoha=crowd('seoha',true);
 assert.equal(psi.s.mobs.length,0);assert(psi.s.chains>10);assert(psi.t<plain.t*.5,`psi ${psi.t} vs plain ${plain.t}`);assert(!seoha.s.chains,'Seoha does not chain');
});
