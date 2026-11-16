'use strict';
// 사용자 11-16 "그림도 테트리스처럼 공격으로 폭파시킬수 있게": 솟은 먹 그림도 영웅 공격에 맞으면 깜빡이고, 다 깎이면 먹폭발로 터져 사라진다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function cardRun(stage,difficulty,seed){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;return a.createRun({difficulty:difficulty||'normal',seed:seed||3,segment:seg});}
function risen(s){for(let i=0;i<2400;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:4});h.clear(s);const r=(s.risers||[]).find(q=>q.age>=a.RISER_WARN&&!q.fade);if(r)return r;}return null;}
test('a shot on the drawn shape chips it, the empty space beside it does not',()=>{
  const s=cardRun(0,'normal'),r=risen(s);assert(r,'a risen subject');const c=a.MOTIFS[r.kind].hit[0];
  assert.equal(typeof a.shotHitsRiser,'function');assert.equal(a.riserHp(s)>0,true);
  assert.equal(a.shotHitsRiser(s,r.x+r.size*2.4,r.y,1),false,'beside the shape');
  assert.equal(a.shotHitsRiser(s,r.x+c[0]*r.size,r.y+c[1]*r.size,1),true,'on the shape');
  assert.equal(r.hitTick,s.tick);assert(r.hp<r.maxHp);assert(!r.fade,'one shot does not break it');
});
test('enough shots break it into an ink burst with score, and it no longer hurts',()=>{
  const s=cardRun(0,'normal'),r=risen(s);assert(r);const c=a.MOTIFS[r.kind].hit[0],x=r.x+c[0]*r.size,y=r.y+c[1]*r.size,score=s.score;
  s.events.length=0;let n=0;while(!r.fade&&n<200){a.shotHitsRiser(s,x,y,1);n++;}
  assert(r.fade>0,'fades out (ink burst plays during the fade)');assert.equal(r.broken,true);
  assert(s.score>=score+a.RISER_SCORE);assert(s.events.some(e=>(e.type||e)==='riserBreak'),'riserBreak noted');
  assert.equal(a.riserHits(s,r,x,y),false,'a broken picture no longer hurts');
  assert.equal(a.shotHitsRiser(s,x,y,1),false,'shots pass through a breaking picture');
});
test('announced (not yet risen) pictures cannot be shot',()=>{
  const s=cardRun(0,'normal');const r={kind:'sword',size:a.MOTIFS.sword.size,x:200,y:400,age:a.RISER_WARN-1,fade:0,held:0};s.risers=[r];
  assert.equal(a.shotHitsRiser(s,r.x,r.y,1),false);
});
test('hell pictures are tougher than easy ones',()=>{
  assert(a.riserHp(cardRun(0,'hell'))>a.riserHp(cardRun(0,'gentle')));
});
test('the hero shot loop tests risers and the app blinks and shakes on break',()=>{
  const eng=fs.readFileSync(path.join(__dirname,'..','src','arcade-v43.js'),'utf8'),app=fs.readFileSync(path.join(__dirname,'..','src','arcade-app-v43.js'),'utf8');
  assert.match(eng,/if\(!hit\)hit=shotHitsRiser\(/);
  assert.match(app,/e==='riserBreak'/);
  const at=app.indexOf('function drawRisers(');assert(/hitTick/.test(app.slice(at,app.indexOf('function drawInkBurst(',at))),'risers blink when hit');
});
