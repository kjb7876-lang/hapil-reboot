'use strict';
/* v41 완료 조건. 코드를 고치기 전에 먼저 쓰고 실패를 확인한 검사다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const arcade=require('../src/arcade-v38.js'),lane=require('./helpers/arcade-lane.cjs');
const root=path.join(__dirname,'..'),original=JSON.parse(fs.readFileSync(path.join(root,'docs/v41/original-scenes.json'),'utf8')).scenes;
const SEG=arcade.SEGMENTS||[],STAGES=arcade.STAGES||[];
const clear=s=>{s.events.length=0;s.cancelled.length=0;s.pops.length=0;};
function idle(options){const s=arcade.createRun(Object.assign({difficulty:'normal',seed:1},options));s.stage='break';s.stageTick=-1e6;s.mobs.length=0;return s;}
function put(s,x,y,patch){const i=s.n++;for(const k of ['ba','bs','bturn','bacc','bmin','barg','bs2','bspin','bage','bat','bsize','bcolor','bgrazed','bmode','bgen'])s[k][i]=0;s.bmax[i]=400;s.bx[i]=x;s.by[i]=y;s.blife[i]=60000;s.bsize[i]=1;for(const k in patch||{})s[k][i]=patch[k];return i;}

test('v41 stages follow the original story parts in order and leave no scene out',()=>{
 const playable=original.filter(r=>!r.rest).map(r=>r.id);
 assert.deepEqual(STAGES.flatMap(g=>g.scenes),playable,'every playable scene, once, in the original order');
 const partOf=id=>Number(original.find(r=>r.id===id).chapter.match(/제(\d)부/)[1]);
 STAGES.forEach(g=>{for(const id of g.scenes)assert.equal(partOf(id),g.part,g.name+' holds only scenes of its own part');});
 assert.deepEqual([...new Set(STAGES.map(g=>g.part))],[1,2,3,4,5,6,7,8]);
 for(const g of STAGES){assert(original.some(r=>r.title===g.name),'the stage name is an original scene title: '+g.name);assert(g.name.length<=16);}
});

test('v41 every stage is mobs → mid boss → mobs → boss, and bosses alternate plain attacks with named patterns',()=>{
 const names=new Set();
 STAGES.forEach((g,index)=>{
  const mine=SEG.filter(x=>x.stage===index),code=mine.map(x=>x.kind==='wave'?'W':x.mid?'M':'B').join('');
  assert.match(code,/^WM+WB+$/,g.name+': '+code);
  const boss=mine.filter(x=>x.kind==='card'&&!x.mid),mid=mine.filter(x=>x.mid);
  assert(boss.length>=6);boss.forEach((x,i)=>assert.equal(!!x.spell,i%2===1,'plain attack first, then a named pattern, alternating'));
  assert(boss.filter(x=>x.spell).length>=3,'at least three named patterns');assert(mid.some(x=>x.spell));
  assert.equal(new Set(boss.map(x=>x.actor)).size,1);assert.equal(new Set(mid.map(x=>x.actor)).size,1);
  for(const x of mine.filter(x=>x.kind==='card')){
   assert(arcade.ACTORS[x.actor]&&arcade.ACTORS[x.actor].name,'known actor '+x.actor);assert(x.hp>0&&x.time>0&&x.time<=40,'every card has a time limit');
   if(x.spell){assert(x.name&&x.name.length>=2&&x.name.length<=12,'a short name, about ten characters: '+x.name);assert(!names.has(x.name),'unique: '+x.name);names.add(x.name);assert(x.scene&&g.scenes.includes(x.scene),x.name+' is tied to a scene of its stage');}
   else assert.equal(x.name,'','plain attacks carry no name');
  }
 });
 assert(names.size>=36);
});

test('v41 a full run on every difficulty ends without error, in order, with nothing dropped',()=>{
 for(const difficulty of ['gentle','normal','hell']){
  const s=arcade.createRun({difficulty,seed:5}),order=[];let most=0;
  for(let i=0;i<400000&&s.stage!=='won'&&s.stage!=='lost';i++){
   s.player.invulnerableUntil=s.tick+999;const target=s.stage==='card'?s.boss.x:s.mobs.length?s.mobs[0].x:180;
   arcade.step(s,{dx:Math.max(-4,Math.min(4,target-s.player.x)),dy:0});
   assert(s.n<=arcade.CAP&&s.events.length<=48&&s.mobs.length<=arcade.MOB_CAP&&s.lasers.length<=arcade.LASER_CAP&&s.itemCount<=arcade.ITEM_CAP);
   if(order[order.length-1]!==s.seg)order.push(s.seg);most=Math.max(most,s.n);clear(s);
  }
  assert.equal(s.stage,'won',difficulty);assert.equal(s.dropped,0);assert.deepEqual(order,[-1,...SEG.map((x,i)=>i)]);
  for(let i=0;i<s.n;i++)assert(Number.isFinite(s.bx[i])&&Number.isFinite(s.by[i])&&Number.isFinite(s.ba[i])&&Number.isFinite(s.bs[i]));
  assert(Number.isFinite(s.score)&&s.score>0&&s.kills>100);assert(most<=arcade.CAP*.85,'headroom under the cap: '+most);
 }
});

test('v41 every wave, plain attack and named pattern always leaves a lane for the hitbox',()=>{
 const failures=[];let tightest={minOpen:1e9};
 for(const [difficulty,compact] of [['gentle',false],['normal',false],['hell',false],['normal',true]])for(let i=0;i<SEG.length;i++){
  const r=lane.check(arcade,{difficulty,compact,seed:17+i,segment:i});
  if(r.emptyAt>=0||r.minOpen<4)failures.push(`${difficulty}${compact?'/compact':''} #${i} ${r.name}: open ${r.minOpen} emptyAt ${r.emptyAt}`);
  if(r.minOpen<tightest.minOpen)tightest=Object.assign({difficulty,i},r);
  assert(r.ticks>100,'the segment actually ran: '+r.name);
 }
 assert.deepEqual(failures,[],'tightest was '+JSON.stringify(tightest));
});

test('v41 slow movement, the bomb, grazing, items and the named-pattern bonus work',()=>{
 const s=idle();const x=s.player.x;arcade.step(s,{dx:50,dy:0,focus:true});assert(s.player.x-x<=2.01&&s.player.focus===true,'focus slows the hero');
 arcade.step(s,{dx:50,dy:0});assert(s.player.focus===false);
 // 폭탄: 탄과 광선을 지우고 잠깐 무적, 재고가 줄고, 없으면 아무 일도 없다
 const b=idle(),stock=b.bombs;assert.equal(stock,arcade.DIFFICULTY.normal.bombs);for(let i=0;i<30;i++)put(b,40+i*8,300,{bage:100});b.lasers.push({x:0,y:0,angle:0,width:10,warn:5,active:50,color:0,spin:0,follow:false,burst:false,age:0,grazed:false});
 arcade.step(b,{dx:0,dy:0,bomb:true});assert.equal(b.n,0);assert.equal(b.lasers.length,0);assert.equal(b.bombs,stock-1);assert(b.events.includes('bomb'));assert(b.player.invulnerableUntil>=b.tick+90);
 put(b,b.player.x,b.player.y,{bage:100});arcade.step(b,{dx:0,dy:0});assert.equal(b.player.hp,b.player.maxHp,'invincible right after a bomb');
 b.bombs=0;clear(b);b.n=0;put(b,20,300,{bage:100});arcade.step(b,{dx:0,dy:0,bomb:true});assert.equal(b.n,1,'no stock, no effect');assert(!b.events.includes('bomb'));
 // 스치기 게이지가 차면 폭탄이 하나 는다
 const g=idle();g.bombs=0;g.gauge=arcade.GAUGE_FULL-1;put(g,g.player.x+12,g.player.y,{bage:100});arcade.step(g,{dx:0,dy:0});assert.equal(g.graze,1);assert.equal(g.bombs,1);assert(g.gauge<arcade.GAUGE_FULL);
 // 아이템: 가까이 가면 먹고, 화면 위쪽으로 올라가면 전부 빨려 온다
 const it=idle();arcade.dropItem(it,it.player.x+6,it.player.y,0);arcade.step(it,{dx:0,dy:0});assert.equal(it.itemCount,0);assert.equal(it.itemsTaken,1);assert(it.score>0);
 const far=idle();arcade.dropItem(far,20,560,0);arcade.dropItem(far,340,600,0);for(let i=0;i<40;i++)arcade.step(far,{dx:0,dy:0});assert.equal(far.itemsTaken,0,'far items are not collected from below the line');
 far.player.y=arcade.AUTO_COLLECT_Y-10;let n=0;while(far.itemCount&&n++<200)arcade.step(far,{dx:0,dy:0});assert.equal(far.itemsTaken,2,'above the line every item flies to the hero');
 const high=idle(),low=idle();high.player.y=60;arcade.dropItem(high,high.player.x,60,0);arcade.step(high,{dx:0,dy:0});arcade.dropItem(low,low.player.x,low.player.y,0);arcade.step(low,{dx:0,dy:0});assert(high.score>low.score,'items are worth more higher up');
 // 이름 붙은 패턴을 폭탄 없이 안 맞고 넘기면 보너스
 const spell=SEG.findIndex(x=>x.spell);
 const run=(mess)=>{const s=arcade.createRun({difficulty:'normal',seed:3,segment:spell});let got=false,done=false;for(let i=0;i<4000&&!done;i++){s.player.invulnerableUntil=s.tick+999;const on=s.stage==='card'&&s.seg===spell;if(on&&mess==='bomb'&&s.segTick===60)arcade.step(s,{dx:s.boss.x-s.player.x,dy:0,bomb:true});else arcade.step(s,{dx:Math.max(-4,Math.min(4,s.boss.x-s.player.x)),dy:0});if(s.events.includes('capture'))got=true;if(s.seg!==spell)done=true;clear(s);}return {got,s};};
 const clean=run(''),bombed=run('bomb');assert.equal(clean.got,true);assert.equal(clean.s.captures,1);assert.equal(bombed.got,false,'a bomb forfeits the bonus');assert.equal(bombed.s.captures,0);assert(clean.s.score>bombed.s.score);
});

test('v41 three difficulties differ in lives, bullet count and speed, and bullets are slow',()=>{
 const d=arcade.DIFFICULTY;assert.deepEqual([d.gentle.hp,d.normal.hp,d.hell.hp],[7,3,1]);
 assert(d.gentle.speed<d.normal.speed&&d.normal.speed<d.hell.speed&&d.hell.speed<1,'slow bullets on every difficulty');
 assert(d.gentle.density<d.normal.density&&d.normal.density<d.hell.density);assert(d.gentle.radius<d.normal.radius&&d.normal.radius<d.hell.radius);
 const peak={};for(const difficulty of ['gentle','normal','hell']){const i=SEG.findIndex(x=>x.spell&&!x.mid),s=arcade.createRun({difficulty,seed:9,segment:i});let most=0,fastest=0;for(let t=0;t<1500&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;arcade.step(s,{dx:0,dy:0});most=Math.max(most,s.n);for(let k=0;k<s.n;k++)if(s.bsize[k]!==arcade.SHAPE_PROP)fastest=Math.max(fastest,s.bs[k]);clear(s);}peak[difficulty]=most;assert(fastest<=200,'no fast orb bullets: '+fastest);}
 assert(peak.gentle<peak.hell&&peak.normal<peak.hell,JSON.stringify(peak));
 for(const [difficulty,expected] of [['gentle',7],['normal',2],['hell',1]]){const s=arcade.createRun({difficulty,seed:3});let stage=0,seen=-1;for(let i=0;i<60000&&seen<0;i++){s.player.invulnerableUntil=s.tick+999;if(s.stageIndex===0)s.player.hp=1;arcade.step(s,{dx:Math.max(-4,Math.min(4,(s.stage==='card'?s.boss.x:180)-s.player.x)),dy:0});if(s.stageIndex!==stage){seen=s.player.hp;}clear(s);}assert.equal(seen,expected,difficulty+' lives on entering the next map');}
});

test('v41 the phone mode lowers the bullet cap and draws bullets larger instead',()=>{
 const i=SEG.findIndex(x=>x.spell&&!x.mid),run=compact=>{const s=arcade.createRun({difficulty:'hell',seed:9,segment:i,compact});let most=0;for(let t=0;t<1500&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;arcade.step(s,{dx:0,dy:0});most=Math.max(most,s.n);clear(s);}return {s,most};};
 const wide=run(false),phone=run(true);assert(phone.most<wide.most*.85,phone.most+' vs '+wide.most);assert(phone.most<=arcade.COMPACT_CAP);assert(arcade.COMPACT_CAP<arcade.CAP);
 assert(phone.s.sizeScale>1&&wide.s.sizeScale===1);const a=idle({compact:true}),b=idle();put(a,0,0);put(b,0,0);assert(arcade.bulletRadius(a,0)>arcade.bulletRadius(b,0));
});

test('v41 bullets use six colours and six shapes, the cross stays upright, and nothing can hit before it has formed',()=>{
 assert.deepEqual([...arcade.PALETTE].sort(),[0,2,4,5,6,8]);assert.equal(arcade.SIZE_RADIUS.length,6);
 const cross=arcade.PROPS.findIndex(p=>p.key==='cross');assert(cross>=0&&arcade.PROPS[cross].upright===true);
 const colors=new Set(),sizes=new Set();let crosses=0;
 const s=arcade.createRun({difficulty:'hell',seed:2});
 for(let i=0;i<400000&&s.stage!=='won';i++){s.player.invulnerableUntil=s.tick+999;arcade.step(s,{dx:Math.max(-4,Math.min(4,(s.stage==='card'?s.boss.x:180)-s.player.x)),dy:0});
  if(i%7===0)for(let k=0;k<s.n;k++){sizes.add(s.bsize[k]);if(s.bsize[k]===arcade.SHAPE_PROP){assert(s.bcolor[k]<arcade.PROPS.length);if(s.bcolor[k]===cross){crosses++;assert.equal(s.bspin[k],0,'a cross never spins');assert(Math.abs(s.ba[k]-Math.PI/2)<1e-6,'and only falls straight down');}}else colors.add(s.bcolor[k]);}
  clear(s);}
 for(const c of colors)assert(arcade.PALETTE.includes(c),'colour '+c);assert(crosses>0);assert(sizes.size<=6);
 const f=idle();put(f,f.player.x,f.player.y);for(let i=0;i<arcade.BLOOM_TICKS-2;i++)arcade.step(f,{dx:0,dy:0});assert.equal(f.player.hp,f.player.maxHp);
});

test('v41 a run can start at any stage, and the same seed replays exactly',()=>{
 STAGES.forEach((g,k)=>{const s=arcade.createRun({stage:k,seed:1});for(let i=0;i<200;i++){arcade.step(s,{dx:0,dy:0});clear(s);}assert.equal(s.stageIndex,k);assert.equal(SEG[s.seg].stage,k);assert.equal(s.seg,SEG.findIndex(x=>x.stage===k));});
 const digest=s=>{let h=0;for(let i=0;i<s.n;i++)h=(h*31+Math.round(s.bx[i]*8)+Math.round(s.by[i]*8)*7+s.bcolor[i])|0;return [s.tick,s.stage,s.seg,s.n,s.lasers.length,s.mobs.length,s.itemCount,s.score,s.graze,s.rng,h].join('|');};
 const a=arcade.createRun({seed:11}),b=arcade.createRun({seed:11}),c=arcade.createRun({seed:12});
 for(let i=0;i<9000;i++){const input={dx:Math.sin(i/30)*4,dy:Math.cos(i/70)*2,focus:i%300<60,bomb:i===4000};for(const s of [a,b,c]){s.player.invulnerableUntil=s.tick+999;arcade.step(s,input);clear(s);}}
 assert.equal(digest(a),digest(b));assert.notEqual(digest(a),digest(c));
});

test('v41 the page loads art one stage at a time from small files, and sound levels are ordered',()=>{
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v38.js'),'utf8'),sim=fs.readFileSync(path.join(root,'src/arcade-v38.js'),'utf8'),page=fs.readFileSync(path.join(root,'arcade.html'),'utf8');
 assert.doesNotMatch(sim,/document\.|HapilCore|Math\.random|Date\.now|performance\./);
 const keys=new Set([...Object.keys(arcade.ACTORS),...Object.keys(arcade.MOBS),...arcade.PROPS.map(p=>p.key),...STAGES.map(g=>'bg-'+g.bg)]);
 for(const key of keys){const webp=path.join(root,'media/arcade-v41',key+'.webp'),jpg=path.join(root,'media/arcade-v41',key+'.jpg'),file=fs.existsSync(webp)?webp:jpg;assert(fs.existsSync(file),'art for '+key);assert(fs.statSync(file).size<90000,key+' stays small for a phone');}
 assert.match(app,/function loadStage\(/);assert.match(app,/function releaseStage\(/,'the previous stage is released');
 assert.match(page,/id="arcade-focus"/);assert.match(page,/id="arcade-bomb"/);assert.match(page,/id="arcade-stage-select"/);
 const cues=require('../src/audio-v37.js').CUES;
 assert(cues.hurt.level>cues.bomb.level&&cues.bomb.level>cues.charge.level&&cues.charge.level>cues.graze.level&&cues.charge.level>cues.item.level,'hit > bomb > pattern start > graze and item');
});
