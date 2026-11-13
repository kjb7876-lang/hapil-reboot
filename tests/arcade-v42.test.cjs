'use strict';
// v42 총집본: 원큐 여정 + 보스 체험이 한 화면에서 시작되고, 일반 공격이 아홉 가지 기하 무늬로 나뉜다.
const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const arcade=require('../src/arcade-v38.js'),lane=require('./helpers/arcade-lane.cjs');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function play(options,limit){const s=arcade.createRun(options);let waves=0,i=0;const stages=new Set();
 for(;i<limit&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+9;if(s.stage==='wave')waves++;stages.add(s.stageIndex);
  arcade.step(s,{dx:Math.max(-4,Math.min(4,s.boss.x-s.player.x)),dy:0});s.events.length=0;s.cancelled.length=0;s.pops.length=0;}
 return {s,waves,stages,ticks:i};}

test('v42 the new curves are finite, normalised point sets',()=>{
 const S=arcade.Shapes,sets={lissajous:S.lissajous(3,2,26),deltoid:S.hypocycloid(3,28),astroid:S.hypocycloid(4,28),cardioid:S.cardioid(26),superformula5:S.superformula(5,2,7,7,30),superformula7:S.superformula(7,3,7,7,30),sunflower:S.sunflower(34)};
 for(const [name,pts] of Object.entries(sets)){assert(pts.length>=24&&pts.length%2===0,name);let far=0;
  for(let i=0;i<pts.length;i+=2){assert(Number.isFinite(pts[i])&&Number.isFinite(pts[i+1]),name);far=Math.max(far,Math.hypot(pts[i],pts[i+1]));}
  assert(Math.abs(far-1)<1e-6,name+' reaches the unit circle');}
 // 해바라기: 이웃한 씨앗 사이 각은 황금각이다.
 const sun=S.sunflower(34),a=Math.atan2(sun[sun.length-1],sun[sun.length-2])-Math.atan2(sun[sun.length-3],sun[sun.length-4]);
 assert(Math.abs(((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI)-arcade.GOLDEN_ANGLE)<1e-6);
});

test('v42 plain attacks come in nine geometric kinds and each boss shows more than one',()=>{
 const plain=arcade.SEGMENTS.filter(g=>g.kind==='card'&&!g.spell);
 assert.equal(new Set(plain.map(g=>g.plain)).size,9);
 arcade.STAGES.forEach((g,k)=>{const kinds=new Set(plain.filter(x=>x.stage===k&&!x.mid).map(x=>x.plain));assert(kinds.size>=3,'stage '+k);});
 for(const g of plain)assert.equal(g.name,'','plain attacks stay unnamed');
});

test('v42 every plain attack leaves a lane on every difficulty',()=>{
 arcade.SEGMENTS.forEach((g,i)=>{if(g.kind!=='card'||g.spell)return;
  for(const [difficulty,compact] of [['gentle',false],['normal',false],['hell',false],['hell',true]]){const r=lane.check(arcade,{difficulty,compact,seed:91+i,segment:i});
   assert(r.emptyAt<0&&r.minOpen>=4,g.plain+' '+difficulty+' open '+r.minOpen);}});
});

test('v42 boss experience fights only the chosen stage\'s mid boss and boss, then ends',()=>{
 arcade.STAGES.forEach((g,k)=>{
  const cards=arcade.SEGMENTS.filter(x=>x.stage===k&&x.kind==='card').length,r=play({difficulty:'normal',seed:5+k,stage:k,bossOnly:true},60000);
  assert.equal(r.s.stage,'won','stage '+k);assert.equal(r.waves,0);assert.equal(r.s.cleared+r.s.timeouts,cards);
  assert.deepEqual([...r.stages],[k]);assert.equal(r.s.kills,0);assert.equal(r.s.dropped,0);
 });
 const a=play({difficulty:'hell',seed:77,stage:4,bossOnly:true},60000),b=play({difficulty:'hell',seed:77,stage:4,bossOnly:true},60000);
 assert.equal(a.s.score,b.s.score);assert.equal(a.ticks,b.ticks);
});

test('v42 the one-shot journey is unchanged: all nine stages in order from a single start',()=>{
 const r=play({difficulty:'normal',seed:9},400000);assert.equal(r.s.stage,'won');assert.deepEqual([...r.stages],[0,1,2,3,4,5,6,7,8]);assert(r.waves>0);
 assert.equal(r.s.cleared+r.s.timeouts,arcade.SEGMENTS.filter(g=>g.kind==='card').length);
});

test('v42 one page starts both modes and the story page points to it',()=>{
 const page=read('arcade.html'),app=read('src/arcade-app-v38.js'),index=read('index.html');
 assert(page.includes('data-mode="full"')&&page.includes('data-mode="boss"')&&page.includes('id="mode-note"'));
 assert(app.includes('bossOnly:runMode===\'boss\'')&&app.includes('function fillStages('));
 assert(/href="arcade\.html"[^>]*>총집본/.test(index));
 assert(!/Math\.random|document\.|window\./.test(read('src/arcade-v38.js').replace(/typeof window!=='undefined'\?window:globalThis/,'')));
});
