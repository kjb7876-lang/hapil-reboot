'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),flame=a.PROPS.findIndex(p=>p.key==='p2_flame'),span=a.propRenderSpan(a.PROPS[flame]);
const wrath=a.SEGMENTS.findIndex(g=>g.actor==='p2_wrath'&&!g.mid&&g.kind==='card');
const next=a.SEGMENTS.findIndex((g,i)=>i>wrath&&g.actor==='p2_wrath'&&!g.mid&&g.kind==='card');
function shot(x,y,angle,ready,compact=false){
 const s=h.idle({difficulty:'hell',entranceAll:true,compact});s.bombs=0;s.player.invulnerableUntil=0;s.player.x=180;s.player.y=400;s.flameArtReady=ready;
 h.put(s,s.player.x-x,s.player.y-y,{bsize:a.SHAPE_PROP,bcolor:flame,ba:angle,bage:a.BLOOM_TICKS+1});a.step(s,{});return s.hits;
}
function run(diff,segment=wrath,compact=false){
 const s=a.createRun({difficulty:diff,segment,seed:7,entranceAll:true,compact});
 for(let i=0;i<1300&&s.stage!=='card';i++){a.step(s,{});h.clear(s);}
 assert.equal(s.stage,'card');s.player.invulnerableUntil=1000000;s.player.x=10;
 return s;
}
function step(s){
 s.n=0;s.sn=0;s.lasers.length=0;s.figures.length=0;s.boss.hp=s.boss.maxHp;
 a.step(s,{});h.clear(s);
}
function route(s){for(let i=0;i<600&&!s.wrathTraverse;i++)step(s);assert(s.wrathTraverse);return s.wrathTraverse;}
test('Wrath flame image is pinned; hit is on rotated opaque fill, not corner/removed halo, and no invisible art-pending hit',()=>{
 const digest=crypto.createHash('sha256').update(fs.readFileSync('media/arcade-v43/p2_flame.webp')).digest('hex');
 assert(h.read('src/arcade-v43.js').includes(digest));
 assert(a.flameContact(0,0,0,span,.01));
 assert(a.flameContact(0,-span*.29,0,span,.01));
 assert(!a.flameContact(-span*.29,0,0,span,.01));
 assert(a.flameContact(-span*.29,0,-Math.PI/2,span,.01));
 assert(!a.flameContact(span*.24,-span*.44,0,span,.01));
 assert.equal(shot(0,0,0,true),1);assert.equal(shot(0,0,0,true,true),1);
 assert.equal(shot(0,0,0,false),0);
 assert.equal(shot(20,-23,0,true),0);
 assert.equal(shot(0,-span*.29,0,true),1);
 assert.equal(shot(-span*.29,0,-Math.PI/2,true),1);
});
test('Wrath phase 1 traverses arena only after a harmless tell, remains on screen and uses Easy < Normal < Hell speed',()=>{
 for(const compact of [false,true]){const max=[],length=[];
 for(const d of ['gentle','normal','hell']){
  const s=run(d,wrath,compact),f=route(s),clock=s.segTick;
  assert.equal(f.active,false);s.player.x=s.boss.x;s.player.y=s.boss.y;assert(!a.wrathBodyTouch(s));s.player.x=10;
  let w=0;while(!f.active){step(s);w++;assert(w<60);}assert(w>=52);
  let ticks=0,top=Infinity,bottom=-Infinity,left=Infinity,right=-Infinity,speed=0;
  while(!f.done){const x=s.boss.x,y=s.boss.y;step(s);speed=Math.max(speed,Math.hypot(x-s.boss.x,y-s.boss.y));ticks++;
   left=Math.min(left,s.boss.x);right=Math.max(right,s.boss.x);top=Math.min(top,s.boss.y);bottom=Math.max(bottom,s.boss.y);
   assert(s.boss.x>65&&s.boss.x<a.WIDTH-65&&s.boss.y>110&&s.boss.y<a.HEIGHT-85);assert(ticks<550);}
  assert(right-left>185&&bottom-top>=300);assert.equal(s.segTick,clock+1);step(s);assert.equal(s.segTick,clock+2);
  assert(!a.wrathBodyTouch(s));max.push(speed);length.push(ticks);
 }
 assert(max[0]<max[1]&&max[1]<max[2],max.join(','));
 assert(length[0]>length[1]&&length[1]>length[2],length.join(','));}
 const other=run('hell',next);for(let i=0;i<360;i++)step(other);assert.equal(other.wrathTraverse,null);
});
test('active Wrath torso triggers existing damage/invulnerability; wheel radius contact does not',()=>{
 const s=run('hell'),f=route(s);while(!f.active)step(s);
 s.bombs=0;s.player.invulnerableUntil=0;
 s.player.x=s.boss.x+65;s.player.y=s.boss.y-5;step(s);assert.equal(s.hits,0);
 s.player.x=s.boss.x;s.player.y=s.boss.y-5;step(s);assert.equal(s.hits,1);
 assert(s.player.invulnerableUntil>s.tick);
 s.player.x=s.boss.x;s.player.y=s.boss.y-5;step(s);assert.equal(s.hits,1);
});
