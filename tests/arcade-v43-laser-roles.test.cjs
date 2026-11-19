'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),a=require('../src/arcade-v43.js');
// 사용자 11-19 "레이져도 하나만 딸랑나오지말고 아래부터 한줄씩나오면서 위로가는걸 유도 … 모든 공격에 의미와 당위성"(docs/v43/danmaku-rules.md 규칙 3·4·5·7)
const live=(d)=>{const s=a.createRun({difficulty:d,seed:9,stage:3,entranceAll:true,compact:true});s.lasers.length=0;return s;};
test('a lone horizontal laser becomes a ladder that lights from the bottom up',()=>{
  for(const d of ['gentle','normal','hell']){const s=live(d);a.beamFor(s,-12,420,0,{width:14,warn:60,active:60});a.composeLasers(s);
    const L=s.lasers.slice().sort((x,y)=>x.warn-y.warn);assert.equal(L.length,a.LADDER_N[d],d+' rows');
    for(let i=1;i<L.length;i++){assert(L[i].y<L[i-1].y,'each later row is higher');assert(Math.abs(L[i-1].y-L[i].y-L[i].width)<1e-9&&L[i].solid,'bands touch: no standing between rows');assert(L[i].warn+L[i].active===L[0].warn+L[0].active,'the ladder clears at once');}
    assert(L[0].y+L[0].width/2>=a.HEIGHT,'it starts at the floor');}
});
test('a lone vertical laser becomes a sweeper walking toward the hero',()=>{
  for(const d of ['gentle','normal','hell']){const s=live(d);s.player.x=300;a.beamFor(s,60,-12,Math.PI/2,{width:14,warn:60,active:60});a.composeLasers(s);
    const L=s.lasers.slice().sort((x,y)=>x.warn-y.warn);assert.equal(L.length,a.SWEEP_N[d],d+' columns');
    for(let i=1;i<L.length;i++){assert(L[i].x>L[i-1].x,'it walks toward the hero');assert(L[i].warn>L[i-1].warn,'one column after another');}
    assert(L[L.length-1].x<a.WIDTH-10,'it never leaves the screen');}
});
test('aimed lasers, deliberate singles and volleys are left alone',()=>{
  const s=live('normal');a.beamFor(s,180,100,1.1,{width:14,warn:60,active:60});a.composeLasers(s);assert.equal(s.lasers.length,1,'aimed');
  const k=live('normal');a.beamFor(k,180,-12,Math.PI/2,{width:14,warn:60,active:60,keep:1});a.composeLasers(k);assert.equal(k.lasers.length,1,'keep');
  const v=live('normal');a.beamFor(v,-12,300,0,{width:14,warn:60,active:60});a.beamFor(v,-12,400,0,{width:14,warn:60,active:60});a.composeLasers(v);assert.equal(v.lasers.length,2,'volley');
  const o=a.createRun({difficulty:'normal',seed:9,stage:3,compact:true});o.lasers.length=0;a.beamFor(o,-12,300,0,{width:14,warn:60,active:60});a.composeLasers(o);assert.equal(o.lasers.length,1,'outside the real game');
});
