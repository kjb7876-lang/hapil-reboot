'use strict';
// 테트리스 조각 피격은 검은 금 대신 깜빡임만, 깨지면 솟는 먹 그림처럼 먹폭발로 터져 사라진다(사용자 11-16 "깨지는 검은선표시말고 그냥 깜빡이다가 그림들처럼 폭발하고 사라지도록").
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','src','arcade-app-v43.js'),'utf8');
function body(name){const at=src.indexOf('function '+name+'(');assert(at>=0,name+' exists');let i=src.indexOf('{',at),d=0;for(let j=i;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)return src.slice(i,j+1);}throw new Error('unbalanced');}
test('a hit piece only blinks: no ink crack lines drawn on falling pieces',()=>{
  const b=body('drawFloor');const at=b.indexOf('깨지는 조각'),end=b.indexOf('F.bursts',at);const piece=b.slice(at,end);
  assert(at>=0&&piece.length>0,'piece damage drawing found');
  assert(!/lineTo/.test(piece),'no crack strokes on pieces');
  assert(/hitTick/.test(piece),'still reacts to hits (blink)');
});
test('a broken piece bursts like the rising ink pictures',()=>{
  assert(/drawInkBurst\(/.test(body('drawPieceScores')),'bursts use drawInkBurst (drawn above the bullets)');
});
