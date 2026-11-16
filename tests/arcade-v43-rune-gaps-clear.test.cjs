'use strict';
// 한자문 고리의 틈과 안쪽은 하얗게 칠하지 않고 배경이 그대로 보이게 한다(사용자 11-16 "피할공간확보하는거 그냥 하얀색이아니라 … 배경이나오게").
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','src','arcade-app-v43.js'),'utf8');
function body(name){const at=src.indexOf('function '+name+'(');assert(at>=0,name+' exists');let i=src.indexOf('{',at),d=0;for(let j=i;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)return src.slice(i,j+1);}throw new Error('unbalanced');}
test('rune rings leave the escape gaps and the inside open to the background',()=>{
  const b=body('drawRunes');
  assert(!/arc\(cx,cy,[^;]*,0,TAU\)/.test(b),'no full disc washed over the ring centre');
  assert(!/a1\+q\.gap/.test(b),'no stroke painted across the escape gap');
});
