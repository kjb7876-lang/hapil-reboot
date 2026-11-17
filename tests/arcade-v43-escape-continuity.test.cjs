'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../src/arcade-v43.js'),lane=require('./helpers/arcade-lane.cjs');

// These two curtains used to roll the next opening independently across the
// arena: at 44 ticks/row a 300 px jump exceeded 4 px/tick keyboard movement.
for(const [name,key,width,period,cells] of [
 ['끊어진 봉인 사슬','p1ChainGap',2,64,16],
 ['시체들로 이루어진 언덕','p1HillGap',3,44,18]
])test(name+': consecutive openings remain connected at ordinary movement speed',()=>{
 const index=a.SEGMENTS.findIndex(g=>g.name===name);assert(index>=0);
 for(const difficulty of ['normal','hell'])for(const compact of [false,true])for(const seed of [1,17,12345]){
  const s=a.createRun({difficulty,compact,seed,segment:index});let previous;
  for(let row=0;row<80;row++){
   s.n=0;a.SEGMENTS[index].fire(s,row*period);const gap=s[key];
   assert(Number.isInteger(gap)&&gap>=0&&gap+width<=cells);
   if(previous!==undefined){assert(Math.abs(gap-previous)<=1,'opening moves by at most one column');assert(Math.abs(gap-previous)*a.WIDTH/cells<4*period,'reachable before the next row');}
   // The primary curtain really omits the columns, not just a state marker.
   for(let k=0;k<s.n;k++)if(s.by[k]<0){const column=s.bx[k]/(a.WIDTH/cells);assert(column<gap+.5||column>gap+width-.5,'reserved opening contains no curtain bullet centres');}
   previous=gap;
  }
 }
});

function fixture(kind,warning){
 const fake={WIDTH:360,HEIGHT:640,BLOOM_TICKS:12,BEAM_HIT:.62,RISER_WARN:60,FLOOR_CELL:30,SEGMENTS:[{kind:'card',time:1}],MOTIFS:{test:{hit:[[0,0,1]]}},bulletRadius:()=>80,figureSegments:f=>f.lines,floorTop:()=>640,
  createRun(){const s={seg:0,stage:'card',tick:0,player:{x:180,y:556,r:2},boss:{hp:1,maxHp:1},rules:{hitScale:1},n:0,bx:[],by:[],ba:[],bs:[],bage:[],events:[],cancelled:[],pops:[],lasers:[],figures:[],risers:[],floor:{pieces:[]}};
   if(kind==='bullet'){s.n=1;s.bx=[180];s.by=[556];s.ba=[0];s.bs=[0];s.bage=[99];}
   if(kind==='figure')s.figures=[{age:0,warn:warning||1,active:100,width:100,lines:[[0,556,360,556]]}];
   if(kind==='riser')s.risers=[{age:99,fade:0,kind:'test',size:80,x:180,y:556}];
   if(kind==='block')s.floor.pieces=[{col:4,y:570,cells:[[0,0],[1,0],[2,0],[3,0]]}];
   return s;},
  step(s,input){s.tick++;s.player.x=Math.max(8,Math.min(352,s.player.x+input.dx));s.player.y=Math.max(40,Math.min(626,s.player.y+input.dy));for(const f of s.figures)f.age++;if(s.tick===60)s.seg=1;}
 };
 return fake;
}
test('lane audit cannot teleport from a blocked spawn to a distant safe cell',()=>{
 const r=lane.check(fixture('bullet'),{});assert.equal(r.emptyAt,2);
});
for(const kind of ['figure','riser','block'])test('lane audit includes '+kind+' collision geometry',()=>{
 const r=lane.check(fixture(kind),{});assert.equal(r.emptyAt,2);
});
test('warning time permits a continuous route out before a figure becomes lethal',()=>{
 const r=lane.check(fixture('figure',24),{});assert.equal(r.emptyAt,-1);assert(r.ticks>20);
});

test('the first graph update cannot spend the spawn movement allowance twice',()=>{
 const fake=fixture('figure'),create=fake.createRun;
 fake.createRun=function(){const s=create();s.figures[0].width=13;return s;};
 assert.equal(lane.check(fake,{}).emptyAt,2,'12 px distant cells are not reachable in the initial 8 px budget');
});
