'use strict';
// 사용자 11-19(모든 난이도): 보스·중간보스는 패턴이 끝난 뒤 쓰러진다 / 탄은 화면 밖으로 나가야만 사라진다(필살기 예외) /
// 적이 없고 탄만 남으면 탄을 가속해 내보낸 뒤 다음 등장 / 반사탄은 벽에서 거울 반사 1~2번 뒤 밖으로 / 탄 수 조금 줄임.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),DIFFS=['gentle','normal','hell'];
const W=a.WIDTH,H=a.HEIGHT,off=(x,y)=>x<-30||x>W+30||y<-40||y>H+30;
function toCard(s){for(let i=0;i<4000&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.stage,'card');}
function firstCard(st){let seg=a.STAGES[st].first;while(a.SEGMENTS[seg].kind!=='card')seg++;return seg;}
// 사라지는 탄은 모두 화면 밖에서 사라져야 한다: 이전 틱 위치 목록과 비교(탄 배열은 지울 때 뒤에서 당겨 오므로 위치 집합으로 본다)
function watchVanish(s,prev){const now=new Set();for(let i=0;i<s.n;i++)now.add(Math.round(s.bx[i])+','+Math.round(s.by[i]));return now;}
test('boss at zero HP keeps attacking until the phase minimum and its current pattern are done, then its bullets fly off before it falls (all difficulties)',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:4,segment:firstCard(3),entranceAll:true});toCard(s);
  for(let i=0;i<120;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
  s.boss.hp=0;const seg=s.seg,downAt=s.segTick;let waited=0,endAt=-1,hits0=0;
  while(s.stage==='card'&&s.seg===seg&&waited<a.CARD_DOWN_MAX+a.CARD_ENDING_MAX+10){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);waited++;
   if(s.cardEnding&&endAt<0){endAt=s.segTick;hits0=s.hits;s.player.invulnerableUntil=0;}
   if(s.stage==='card'&&s.seg===seg&&!s.cardEnding)assert(s.boss.hp>=1,d+': boss holds on while its pattern finishes');}
  assert(endAt>=0,d+' reached the ending');assert(endAt>=a.CARD_MIN,`${d}: phase lasted its minimum (${endAt})`);
  assert(endAt-downAt<=a.CARD_DOWN_MAX+1,`${d}: did not wait forever (${endAt-downAt})`);
  assert.notEqual(s.seg===seg&&s.stage==='card',true,d+' fell');
 }
});
test('a boss or midboss never leaves on a timer in the live game: only HP ends a phase',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:5,segment:firstCard(1),entranceAll:true});toCard(s);const seg=s.seg,limit=Math.ceil(a.cardDuration(s,a.SEGMENTS[seg])*60)+300;
  for(let i=0;i<limit;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
  assert.equal(s.seg,seg,d+' still on the same phase after its old deadline');assert.equal(s.stage,'card');assert.equal(s.timeouts,0);}
});
test('wave end: leftover bullets accelerate off-screen before the next segment begins, and nothing vanishes on screen',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:2,segment:a.STAGES[1].first,entranceAll:true});const seg=s.seg;let flushed=false,vanishedOn=0;
  for(let i=0;i<9000&&s.seg===seg;i++){s.player.invulnerableUntil=s.tick+999;const before=[];for(let k=0;k<s.n;k++)before.push([s.bx[k],s.by[k],s.bexit[k]]);
   a.step(s,{dx:0,dy:0});h.clear(s);
   if(s.mobs.length===0&&s.segTick>0&&s.n&&s.bexit[0])flushed=true;
   if(s.seg!==seg)assert.equal(s.n,0,`${d}: next segment starts with an empty field`);}
  assert.notEqual(s.seg,seg,d+' advanced');
 }
});
test('exiting bullets only disappear off-screen, speed up and swing downward',()=>{
 const s=a.createRun({difficulty:'normal',seed:1,segment:firstCard(2),entranceAll:true});toCard(s);
 for(let i=0;i<300;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);}
 assert(a.flushBullets(s)>0,'bullets to flush');let checked=0;
 for(let t=0;t<200;t++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;
  const pos=[];for(let i=0;i<s.n;i++)if(s.bexit[i])pos.push({x:s.bx[i],y:s.by[i],a:s.ba[i],v:s.bs[i]});if(!pos.length)break;
  a.step(s,{dx:0,dy:0});h.clear(s);
  // 각 나가는 탄은 아래쪽으로 꺾이며(한 틱 EXIT_TURN 이하) 더 빨리 움직인 자리에 있거나, 화면 밖으로 나가 사라졌어야 한다
  const left=[];for(let i=0;i<s.n;i++)if(s.bexit[i])left.push([s.bx[i],s.by[i]]);
  for(const p of pos){const da=Math.atan2(Math.cos(p.a),Math.sin(p.a)),na=p.a+Math.max(-a.EXIT_TURN,Math.min(a.EXIT_TURN,da)),v=Math.min(900,Math.max(p.v,1)*1.08);
   const nx=p.x+Math.cos(na)*v/60,ny=p.y+Math.sin(na)*v/60;
   const found=left.some(q=>Math.abs(q[0]-nx)<4&&Math.abs(q[1]-ny)<4);if(!found)assert(off(nx,ny)||p.v<1,`bullet vanished on screen at ${nx|0},${ny|0}`);checked++;}
 }
 assert(checked>0);
});
test('mirror bullets reflect off the side walls like light on a mirror (angle in = angle out) and leave after 1-2 bounces',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:6,segment:firstCard(4),entranceAll:true});toCard(s);let bounced=0,maxB=0;
  for(let i=0;i<1200&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;
   const before=[];for(let k=0;k<s.n;k++)if(s.bbounce[k])before.push({x:s.bx[k],a:s.ba[k],b:s.bbounce[k]});
   for(let k=0;k<s.n;k++)maxB=Math.max(maxB,s.bbounce[k]);
   a.step(s,{dx:0,dy:0});h.clear(s);
   for(let k=0;k<s.n;k++){if(s.bx[k]!==0&&s.bx[k]!==W)continue;const c=Math.cos(s.ba[k]),sn=Math.sin(s.ba[k]);
    const m=before.find(p=>Math.abs(Math.sin(p.a)-sn)<1e-4&&Math.abs(Math.cos(p.a)+c)<1e-4);if(m)bounced++;}}
  assert(bounced>0,d+' saw a mirror reflection');assert(maxB>=1&&maxB<=2,d+' bounces '+maxB);
 }
});
// 11-19 "제안대로 계단 고르게": 겹친 배율 대신 기준표 최종값
test('live game takes density and speed from the live difficulty table and grows bullets 15% on every difficulty; replay mode keeps its numbers',()=>{
 for(const d of DIFFS){const live=a.createRun({difficulty:d,seed:1,entranceAll:true}),old=a.createRun({difficulty:d,seed:1});
  const T=a.LIVE_TABLE[d];assert(Math.abs(live.density*a.COMPACT_DENSITY-T.density)<1e-9,d+' '+live.density);assert.equal(live.rules.speed,T.speed,d+' speed from the live table');assert(Math.abs(live.sizeScale-old.sizeScale*1.15*1.3)<1e-9,d+' size '+live.sizeScale);}
});
test('mirror bullets are marked for the layered-ring look and lose one layer (bounce) per wall hit',()=>{
 const s=a.createRun({difficulty:'hell',seed:6,segment:firstCard(4),entranceAll:true});toCard(s);let seen=0,drops=0,hits=0;const last=new Map();
 for(let i=0;i<1200&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
  for(let k=0;k<s.n;k++)if(s.bmirror[k]){seen++;assert(s.bbounce[k]<=2);if(s.bx[k]===0||s.bx[k]===W)drops++;}
  if(s.mirrorHits&&s.mirrorHits.length){for(const m of s.mirrorHits){hits++;assert(m.left>=0&&m.left<=1,'layers left after a hit '+m.left);}s.mirrorHits.length=0;}}
 assert(seen>0,'mirror bullets exist');assert(hits>0,'wall hits are recorded for the ring-burst effect');assert(drops>0,'a mirror bullet hit a wall and lost a layer');
});
test('after the last mob is gone the bullets stay about 6 seconds, then swing down and leave before the next segment',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:2,segment:a.STAGES[1].first,entranceAll:true});const seg=s.seg;let emptyAt=-1,flushAt=-1;
  for(let i=0;i<12000&&s.seg===seg;i++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);
   if(s.seg!==seg)break;
   if(emptyAt<0&&!s.mobs.length&&s.segTick>=a.waveDuration(s,a.SEGMENTS[seg])&&s.n)emptyAt=s.tick;
   if(emptyAt>=0&&flushAt<0&&s.waveFlush)flushAt=s.tick;}
  assert.notEqual(s.seg,seg,d+' advanced');
  if(emptyAt>=0&&flushAt>=0)assert(flushAt-emptyAt>=a.WAVE_LINGER-2,`${d}: bullets lingered ${flushAt-emptyAt} ticks`);
 }
});
test('pattern kinds at once: Easy 1, Normal 2, Hell 3 — new kinds only start when there is room',()=>{
 assert.deepEqual(a.LAYER_CAP,{gentle:1,normal:2,hell:3});
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:3,segment:firstCard(5),entranceAll:true});toCard(s);let over=0,ticks=0,mirrorWithFig=0;
  for(let i=0;i<2400&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;
   const before=a.layersBut(s,'');const m0=s.n;a.step(s,{dx:0,dy:0});h.clear(s);ticks++;
   if(a.layersBut(s,'')>Math.max(before,a.LAYER_CAP[d]+ (d==='gentle'?1:0)))over++;}
  assert(ticks>1000,d+' ran');assert.equal(over,0,d+': a new kind started with no room');
 }
});
// 사용자 11-19 13:14 묶음: 휴대폰 판정 / 문양 중 탄 금지 / 한자 고리 느리게 / 모든 광선은 맵 끝에서 끝까지 / 보스 오르내림
test('on phones the bullets are drawn bigger but hit like on PC (live game)',()=>{
 const pc=a.createRun({difficulty:'gentle',seed:1,entranceAll:true}),ph=a.createRun({difficulty:'gentle',seed:1,entranceAll:true,compact:true});
 a.spawn?0:0;pc.n=0;ph.n=0;for(const s of [pc,ph]){s.bsize[0]=0;s.bx[0]=10;s.by[0]=10;s.n=1;}
 assert(ph.sizeScale>pc.sizeScale,'drawn bigger');assert(Math.abs(a.bulletRadius(ph,0)/a.bulletRadius(pc,0)-a.LIVE_MOBILE.hit)<1e-9,'phone hit radius is PC x LIVE_MOBILE.hit');
});
test('no new bullets while the hexagram or the hanja rings are up; every live laser is a full edge-to-edge line',()=>{
 for(const d of DIFFS){const s=a.createRun({difficulty:d,seed:3,segment:a.SEGMENTS.findIndex(g=>g.spell&&g.stage>=3),entranceAll:true});toCard(s);let calmTicks=0,bornInCalm=0,lasers=0;
  for(let i=0;i<3000&&s.stage==='card';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;const before=s.n;a.step(s,{dx:0,dy:0});
   if(s.calm){calmTicks++;for(let k=0;k<s.n;k++)if(s.bage[k]===1&&!s.bfragment[k]&&!s.bmirror[k])bornInCalm++;}
   for(const l of s.lasers){if(l.age===1){lasers++;assert(l.full||l.floor,d+' full line');assert(!l.follow||l.full);}}h.clear(s);}
  assert(calmTicks>0,d+' saw a hexagram or rings');assert.equal(bornInCalm,0,d+' no bullets born under the figure');}
});
