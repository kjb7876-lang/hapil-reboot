'use strict';
// 아래쪽 압박(사용자 11-15 "맨아래에만 있으면 피하기 쉬워서 아래에서 몹이 가끔식 나오거나 아래를 테트리스처럼 채우는 패턴, 아래쪽에 지형같은게나와서
// 아래쪽 공간을 줄이는패턴 아래쪽에 ㅡ = 이런패턴 만들어서 위로 유도하는 패턴등도 잘 적용해줘").
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function cardRun(stage,difficulty,seed){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;return a.createRun({difficulty:difficulty||'normal',seed:seed||3,segment:seg});}
// 영웅을 맨 아래 가운데에 두고(무적), 바닥 압박만 본다.
function hold(s,ticks,each){for(let i=0;i<ticks&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:4});if(each)each(s,i);h.clear(s);}return s;}
function stageWith(kind,difficulty){for(let i=0;i<a.STAGES.length;i++)if(a.floorPlan(i,difficulty||'normal')[0]===kind)return i;return -1;}
function runKind(kind,difficulty,ticks,each){const i=stageWith(kind,difficulty);assert(i>=0,kind);const s=cardRun(i,difficulty);hold(s,ticks||a.FLOOR_CYCLE,each);return s;}

test('every stage mixes two of the four bottom-pressure kinds (easy uses one) and all four are used',()=>{
 const used=new Set();
 for(let i=0;i<a.STAGES.length;i++){const n=a.floorPlan(i,'normal'),e=a.floorPlan(i,'gentle'),hh=a.floorPlan(i,'hell');
  assert.equal(n.length,2);assert.notEqual(n[0],n[1]);assert.deepEqual(hh,n);assert.equal(e.length,1);n.forEach(k=>{assert(a.FLOOR_KINDS.includes(k));used.add(k);});}
 assert.deepEqual([...used].sort(),['blocks','lines','rise','terrain']);
});
test('rise: mobs sometimes come up from below, away from the hero',()=>{
 let seen=0;runKind('rise','normal',a.FLOOR_CYCLE,s=>{for(const m of s.mobs)if(m.rise&&m.age===1){seen++;assert(m.y>a.HEIGHT,'starts below the screen');assert(m.vy<0,'moves up');assert(Math.abs(m.x-s.player.x)>=80,'not right under the hero');}});
 assert(seen>=3,'rising mobs: '+seen);
});
test('blocks: tetris pieces fall, stack at the bottom no higher than the cap, and full rows clear',()=>{
 let most=0;const s=runKind('blocks','normal',a.FLOOR_CYCLE-100,s=>{for(let c=0;c<a.FLOOR_COLS;c++)most=Math.max(most,a.HEIGHT-a.floorTop(s,c*a.FLOOR_CELL+1));});
 assert(s.floor.dropped>=6,'pieces dropped: '+s.floor.dropped);assert(most>0,'something stacked');assert(most<=4*a.FLOOR_CELL,'stack height '+most);
 // 한 줄을 다 채우면 지워진다
 const t=cardRun(stageWith('blocks'));t.floor.grid.fill(3,0,a.FLOOR_COLS-1);t.floor.pieces.push({cells:[[0,0]],col:a.FLOOR_COLS-1,y:a.HEIGHT-1,land:0,color:2});
 t.player.x=40;t.player.y=300;a.step(t,{dx:0,dy:0});assert.equal(t.floor.cleared,1);assert.equal(a.floorTop(t,10),a.HEIGHT);
});
test('blocks: a falling piece hurts, a settled block only pushes the hero up',()=>{
 const s=cardRun(stageWith('blocks'));s.player.x=45;s.player.y=300;s.player.invulnerableUntil=0;const hp=s.player.hp;
 s.floor.pieces.push({cells:[[0,0],[1,0]],col:1,y:300+10,land:0,color:1});a.step(s,{dx:0,dy:0});assert.equal(s.player.hp,hp-1,'falling piece hits');
 const t=cardRun(stageWith('blocks'));t.floor.grid.fill(2,0,a.FLOOR_COLS);t.floor.grid[a.FLOOR_COLS+1]=2;t.player.x=45;t.player.y=a.HEIGHT-20;t.player.invulnerableUntil=0;const hp2=t.player.hp;
 a.step(t,{dx:0,dy:4});assert.equal(t.player.hp,hp2,'settled blocks do not hurt');assert(t.player.y<=a.HEIGHT-2*a.FLOOR_CELL,'pushed above the stack: '+t.player.y);
});
test('terrain: hills rise from the bottom, push the hero up, and sink again',()=>{
 let tallest=0,lifted=false;const s=runKind('terrain','normal',a.FLOOR_CYCLE,s=>{const top=Math.min(...Array.from({length:a.FLOOR_COLS},(_,c)=>a.floorTop(s,c*a.FLOOR_CELL+1)));tallest=Math.max(tallest,a.HEIGHT-top);if(s.player.y<a.HEIGHT-14-1&&a.floorTop(s,s.player.x)<a.HEIGHT-10)lifted=true;});
 assert(tallest>=40,'hill height '+tallest);assert(tallest<=110,'leaves space above: '+tallest);
 const t=cardRun(stageWith('terrain'));t.floor.hill.fill(80);t.floor.goal.fill(80);t.player.y=a.HEIGHT-20;a.step(t,{dx:0,dy:4});assert(t.player.y<=a.HEIGHT-80,'pushed up to '+t.player.y);
 t.floor.goal.fill(0);t.stage='card';hold(t,200);assert(a.floorTop(t,180)>a.HEIGHT-5,'sinks back');
});
test('lines: ㅡ and = horizontal beams along the bottom, even while the big hexagram is up',()=>{
 const ys=new Set();let twin=false,sigil=false;
 runKind('lines','normal',a.FLOOR_CYCLE,s=>{const f=s.lasers.filter(l=>l.floor&&l.age===1);if(f.length===2)twin=true;f.forEach(l=>{ys.add(l.y);assert.equal(l.angle,0);});if(s.figures.some(f=>f.sigil)&&f.length)sigil=true;});
 assert(ys.size>=1&&[...ys].every(y=>y>=a.HEIGHT*.85),'low lines: '+[...ys]);assert(twin,'a = pair appears');
 const s=cardRun(stageWith('lines'));s.figures.push({sigil:true,kind:'glyph',age:0,warn:1e6,active:1,glyph:'x',want:1,turn:0,spin:0,width:1,cx:0,cy:0,r:1,r0:1,r1:1,period:1});
 let n=0;hold(s,a.FLOOR_ON+400,t=>{t.figures.forEach(f=>{f.age=0;});n=Math.max(n,t.lasers.filter(l=>l.floor).length);});assert(n>=1,'lines are not muted by the hexagram');
});
test('easy is gentler than hell: fewer bottom-pressure events over the same stage',()=>{
 const tally=d=>{let k=0;for(let i=0;i<8;i++){const s=cardRun(i,d,9);hold(s,a.FLOOR_CYCLE*2);const F=s.floor;k+=F.risen+F.dropped+F.mounds+F.lines;}return k;};
 const e=tally('gentle'),hl=tally('hell');assert(e>0&&e<hl*.6,`gentle ${e} vs hell ${hl}`);
});
test('the app draws the floor (blocks, falling pieces, hills) under the bullets and keeps bottom lines bright under the hexagram',()=>{
 const app=h.read('src/arcade-app-v43.js');const m=app.match(/function drawFloor\(s\)\{([\s\S]*?)\n  \}/);assert(m,'drawFloor exists');
 for(const k of ['F.grid','F.hill','F.pieces'])assert(m[1].includes(k),k);
 const order=app.match(/drawBackground\(s\);[^\n]*/)[0];assert(order.indexOf('drawFloor(s)')>0&&order.indexOf('drawFloor(s)')<order.indexOf('drawBullets(s)'),'floor before bullets');
 assert.match(app,/l\.floor\?1:under/,'floor lines are not dimmed by the hexagram');
 const loop=app.slice(app.indexOf('function drawLasers(s){'));assert(loop.indexOf('var l=s.lasers[i]')<loop.indexOf('l.floor?1:under'),'the laser is read before its floor flag (a page error otherwise)');
});
