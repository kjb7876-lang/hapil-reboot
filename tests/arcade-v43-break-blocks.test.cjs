'use strict';
// 내려오는 테트리스 조각을 영웅 공격으로 깨부순다(사용자 11-16 "테트리스 내려오는건 영웅공격으로 꺠부실수 있도록").
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const a=h.need();
function stageWith(kind){for(let i=0;i<a.STAGES.length;i++)if(a.floorPlan(i,'normal')[0]===kind)return i;return -1;}
function cardRun(stage,difficulty){const g=a.STAGES[stage];let seg=g.first;while(a.SEGMENTS[seg].kind!=='card')seg++;return a.createRun({difficulty:difficulty||'normal',seed:3,segment:seg});}
function blocksRun(difficulty){const s=cardRun(stageWith('blocks'),difficulty);a.step(s,{});s.floor.pieces.length=0;return s;}
function shootAt(s,piece,ticks){s.floor.pieces.push(piece);let gone=-1;
  for(let t=0;t<ticks;t++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});if(!s.floor.pieces.includes(piece)){gone=t;break;}h.clear(s);}
  return gone;}

test('a falling piece has health and breaks under the hero\'s shots before it lands',()=>{
  assert(a.PIECE_HP>0,'PIECE_HP exported');
  const s=blocksRun();s.player.x=3*a.FLOOR_CELL+a.FLOOR_CELL;s.player.y=a.HEIGHT-30;
  const grid=Array.from(s.floor.grid),broken=s.floor.broken||0,score=s.score;
  const piece={cells:[[0,0],[1,0],[0,1],[1,1]],col:3,y:-60,land:0,color:2};
  const gone=shootAt(s,piece,400);
  assert(gone>=0,'the piece is gone');
  assert.equal(s.floor.broken,broken+1,'counted as broken');
  assert.deepEqual(Array.from(s.floor.grid),grid,'it did not settle into the stack');
  assert(s.score>score,'breaking gives score');
});

test('a hit piece shows damage (hit tick) and takes several shots, harder pieces on hell',()=>{
  const s=blocksRun();s.player.x=6*a.FLOOR_CELL+a.FLOOR_CELL/2;s.player.y=a.HEIGHT-30;
  const piece={cells:[[0,0]],col:6,y:-30,land:0,color:1};s.floor.pieces.push(piece);
  let hit=false;for(let t=0;t<200&&s.floor.pieces.includes(piece);t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{});if(piece.hitTick===s.tick){hit=true;assert(piece.hp<piece.maxHp,'hp drops');break;}}
  assert(hit,'piece was struck');
  assert(a.pieceHp({difficulty:'hell'})>a.pieceHp({difficulty:'gentle'}),'hell pieces are tougher than easy');
});

test('breaking a piece raises a break event for the ink burst, and a piece away from the shots still lands',()=>{
  const s=blocksRun();s.player.x=40;s.player.y=a.HEIGHT-30;let seen=false;
  const piece={cells:[[0,0],[1,0]],col:0,y:-30,land:0,color:1};s.floor.pieces.push(piece);
  for(let t=0;t<300&&s.floor.pieces.includes(piece);t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{});if(s.events.includes('pieceBreak'))seen=true;h.clear(s);}
  assert(seen,'pieceBreak event');assert(s.floor.bursts&&s.floor.bursts.length>=0);
  const t=blocksRun();t.player.x=40;t.player.y=a.HEIGHT-30;const far={cells:[[0,0]],col:10,y:-30,land:0,color:1};
  const g=shootAt(t,far,400);assert(g>=0);assert(t.floor.grid[10],'the far piece settled');
});
