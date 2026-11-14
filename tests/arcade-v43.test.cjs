'use strict';
/* v43 완료 조건: 원작 56장면(쉼터 6곳 제외)이 장면마다 한 스테이지인 원큐 여정. 코드를 고치기 전에 먼저 쓰고 실패를 확인한 검사다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{original,clear,idle,put,play,root}=h;
const A=()=>h.need();

test('v43 one stage per original scene: 56 stages in the original order, named by the scene title',()=>{
 const a=A(),playable=original.filter(r=>!r.rest);
 assert.equal(a.STAGES.length,playable.length);assert.equal(a.STAGES.length,56);
 a.STAGES.forEach((g,i)=>{const r=playable[i];assert.equal(g.scene,r.id);assert.equal(g.name,r.title);assert.equal(g.part,Number(r.chapter.match(/제(\d)부/)[1]));assert(g.name.length<=16);assert.equal(g.index,i);});
 assert.deepEqual([...new Set(a.STAGES.map(g=>g.part))],[1,2,3,4,5,6,7,8]);
});

test('v43 stages are mob waves then a guardian, or waves → mid boss → waves → boss; every stage carries a named pattern from its own scene',()=>{
 const a=A(),names=new Set();let bossStages=0;
 a.STAGES.forEach((g,index)=>{
  const mine=a.SEGMENTS.filter(x=>x.stage===index),code=mine.map(x=>x.kind==='wave'?'W':x.mid?'M':'B').join('');
  assert(g.kind==='road'||g.kind==='boss',g.name);
  if(g.kind==='boss'){assert.match(code,/^W+M+W+B+$/,g.name+': '+code);bossStages++;}else assert.match(code,/^W{2,}M+$/,g.name+': '+code);
  assert.equal(a.SEGMENTS.indexOf(mine[0]),g.first);
  const boss=mine.filter(x=>x.kind==='card'&&!x.mid),mid=mine.filter(x=>x.mid);
  for(const run of [boss,mid]){run.forEach((x,i)=>assert.equal(!!x.spell,i%2===1,g.name+': plain attack first, then a named pattern, alternating'));assert.equal(run.length%2,0);assert(new Set(run.map(x=>x.actor)).size<=1);}
  assert(mid.some(x=>x.spell),g.name+' has a named pattern');
  if(g.kind==='boss')assert(boss.filter(x=>x.spell).length>=3,g.name+': a boss shows at least three named patterns');
  for(const x of mine.filter(x=>x.kind==='card')){
   assert(a.ACTORS[x.actor]&&a.ACTORS[x.actor].name,'known actor '+x.actor);assert(x.hp>0&&x.time>0&&x.time<=40,'every card has a time limit');
   if(x.spell){assert(x.name&&x.name.length>=2&&x.name.length<=12,'a short name: '+x.name);assert(!names.has(x.name),'unique: '+x.name);names.add(x.name);assert.equal(x.scene,g.scene,x.name+' belongs to its own scene');}
   else assert.equal(x.name,'','plain attacks carry no name');
  }
  for(const x of mine.filter(x=>x.kind==='wave'))assert(x.duration>=300&&typeof x.script==='function');
 });
 // 부마다 마지막 스테이지는 보스 스테이지다. 7대죄(2부)는 장면마다 보스가 있다.
 for(let part=1;part<=8;part++){const list=a.STAGES.filter(g=>g.part===part);assert.equal(list[list.length-1].kind,'boss','part '+part+' ends on a boss');}
 assert(a.STAGES.filter(g=>g.part===2&&g.kind==='boss').length>=7,'the seven sins are boss stages');
 assert(bossStages>=20,'boss stages: '+bossStages);assert(names.size>=110,'named patterns: '+names.size);
 const plain=a.SEGMENTS.filter(x=>x.kind==='card'&&!x.spell);assert(new Set(plain.map(x=>x.plain)).size>=9);
});

test('v43 the journey is three to four hours: stage lengths vary and add up',()=>{
 const a=A();let total=0;
 a.STAGES.forEach((g,i)=>{
  const mine=a.SEGMENTS.filter(x=>x.stage===i);let s=0;for(const x of mine)s+=x.kind==='wave'?x.duration/60+4:x.time*.7+2.5;
  assert(Math.abs(g.seconds-s)<1,'seconds is the nominal length of '+g.name);assert(s>=70&&s<=420,g.name+' '+Math.round(s)+'s');total+=s;});
 assert(total>=9000&&total<=13500,'nominal total '+Math.round(total)+'s (2.5 to 3.75 hours before retries)');
 const road=a.STAGES.filter(g=>g.kind==='road'),boss=a.STAGES.filter(g=>g.kind==='boss'),avg=l=>l.reduce((n,g)=>n+g.seconds,0)/l.length;
 assert(avg(boss)>avg(road)*1.4,'boss stages are clearly longer than road stages');
});

test('v43 every stage has its own look: background, tint and weather change from stage to stage, and the art is small',()=>{
 const a=A(),bgs=new Set(),fx=new Set();
 a.STAGES.forEach((g,i)=>{const t=g.theme;assert(t&&typeof t.bg==='string'&&t.bg,g.name+' theme');assert(/^#[0-9a-f]{6}$/.test(t.tint),g.name+' tint');assert(typeof t.fx==='string'&&t.fx);bgs.add(t.bg);fx.add(t.fx);
  if(i){const p=a.STAGES[i-1].theme;assert.notEqual(t.bg,p.bg,g.name+' does not reuse the previous background');assert(t.tint!==p.tint||t.fx!==p.fx,g.name+' changes tint or weather');}
  assert(g.cast.length>=1&&g.cast.every(k=>a.MOBS[k]),g.name+' cast');});
 assert(bgs.size>=36,'distinct backgrounds: '+bgs.size);assert(fx.size>=8,'weather kinds: '+fx.size);
 for(let part=1;part<=8;part++){const list=a.STAGES.filter(g=>g.part===part);assert.equal(new Set(list.map(g=>g.theme.bg)).size,list.length,'no background repeats inside part '+part);}
 assert(new Set(a.STAGES.flatMap(g=>g.cast)).size>=24,'mob kinds across the journey');
 const dir=path.join(root,'media/arcade-v43'),size=f=>{assert(fs.existsSync(path.join(dir,f)),'art '+f);return fs.statSync(path.join(dir,f)).size;};
 for(const bg of bgs)assert(size('bg-'+bg+'.jpg')<130000,'bg '+bg);
 for(const key of new Set([...Object.keys(a.ACTORS),...Object.keys(a.MOBS),...a.PROPS.map(p=>p.key)]))assert(size(key+'.webp')<90000,key+' stays small for a phone');
 const used=new Set(a.SEGMENTS.filter(x=>x.kind==='card').map(x=>x.actor));for(const key of Object.keys(a.ACTORS))assert(used.has(key),'actor in use: '+key);
 assert(used.size>=34,'named opponents: '+used.size);
});

test('v43 clearing a stage gives its keepsake, and results add up to stars',()=>{
 const a=A(),keys=new Set();
 for(const g of a.STAGES){assert(g.reward&&g.reward.key&&g.reward.name,g.name+' reward');assert(g.reward.name.length>=2&&g.reward.name.length<=10);assert(!keys.has(g.reward.key));keys.add(g.reward.key);
  const f=path.join(root,'media/arcade-v43','reward-'+g.reward.key+'.webp');assert(fs.existsSync(f),'art '+f);assert(fs.statSync(f).size<40000);}
 const r=play({difficulty:'gentle',seed:3,stage:0,stages:2},200000);assert.equal(r.s.stage,'won');assert.equal(r.s.results.length,2);
 r.s.results.forEach((x,i)=>{assert.equal(x.stage,i);assert(x.ticks>0&&x.score>=0&&x.hits===0&&x.bombs===0);assert.equal(x.stars,3);assert(x.captures<=x.spells&&x.spells>=1);});
 assert.equal(r.s.results.reduce((n,x)=>n+x.ticks,0)<=r.s.tick,true);
 const b=a.createRun({difficulty:'gentle',seed:3,stage:0,stages:1});let bombed=false;
 for(let i=0;i<200000&&b.stage!=='won';i++){b.player.invulnerableUntil=b.tick+999;const use=!bombed&&b.stage==='card';if(use)bombed=true;a.step(b,{dx:Math.max(-4,Math.min(4,(b.stage==='card'?b.boss.x:180)-b.player.x)),dy:0,bomb:use});clear(b);}
 assert.equal(b.results[0].bombs,1);assert.equal(b.results[0].stars,2,'a bomb costs one star');
});

test('v43 progress saves stage by stage, unlocks in order and survives a broken save',()=>{
 const a=A(),P=a.Progress;let p=P.fresh();
 assert.equal(P.unlocked(p),0);assert.equal(P.canPlay(p,0),true);assert.equal(P.canPlay(p,1),false);
 p=P.record(p,{stage:0,stars:2,score:1200,ticks:5000,hits:1,bombs:0,captures:1,spells:1},'normal');
 assert.equal(P.unlocked(p),1);assert.equal(P.canPlay(p,1),true);assert.equal(P.canPlay(p,2),false);assert.equal(p.stars[0],2);assert.equal(p.best[0],1200);assert.deepEqual(p.rewards,[a.STAGES[0].reward.key]);
 p=P.record(p,{stage:0,stars:1,score:900,ticks:4000,hits:2,bombs:1,captures:0,spells:1},'normal');assert.equal(p.stars[0],2,'the better result stays');assert.equal(p.best[0],1200);assert.equal(p.rewards.length,1);
 p=P.record(p,{stage:5,stars:3,score:1,ticks:1,hits:0,bombs:0,captures:0,spells:1},'normal');assert.equal(P.unlocked(p),1,'a locked stage cannot be recorded');
 const back=P.sanitize(JSON.parse(JSON.stringify(p)));assert.deepEqual(back,p);assert.equal(P.resume(p),1,'continue starts at the first uncleared stage');
 for(const junk of [null,undefined,7,'x',[],{},{cleared:'no'},{cleared:[1,2,'a'],stars:{0:9},best:[NaN,Infinity,-5],rewards:[3,'nope'],unlocked:999,difficulty:'godlike'}]){
  const s=P.sanitize(junk);assert(Array.isArray(s.cleared)&&Array.isArray(s.rewards));assert(P.unlocked(s)>=0&&P.unlocked(s)<a.STAGES.length);
  for(const k of Object.keys(s.stars))assert(s.stars[k]>=1&&s.stars[k]<=3);for(const k of Object.keys(s.best))assert(Number.isFinite(s.best[k])&&s.best[k]>=0);
  assert(['gentle','normal','hell'].includes(s.difficulty));assert(s.rewards.every(k=>a.STAGES.some(g=>g.reward.key===k)));}
 let all=P.fresh();for(let i=0;i<a.STAGES.length;i++)all=P.record(all,{stage:i,stars:3,score:10,ticks:10,hits:0,bombs:0,captures:1,spells:1},'hell');
 assert.equal(P.unlocked(all),a.STAGES.length-1);assert.equal(all.rewards.length,56);assert.equal(P.resume(all),0);assert.equal(P.totalStars(all),168);
});

test('v43 a run can start at any stage, stop after a chosen number of stages, and replays exactly from a seed',()=>{
 const a=A();
 a.STAGES.forEach((g,k)=>{const s=a.createRun({stage:k,seed:1});for(let i=0;i<200;i++){a.step(s,{dx:0,dy:0});clear(s);}assert.equal(s.stageIndex,k);assert.equal(s.seg,g.first);assert.equal(s.player.hp,s.player.maxHp);});
 const one=play({difficulty:'gentle',seed:2,stage:7,stages:1},200000);assert.equal(one.s.stage,'won');assert.equal(one.s.stageIndex,7);assert.deepEqual(one.s.results.map(x=>x.stage),[7]);
 const digest=s=>{let n=0;for(let i=0;i<s.n;i++)n=(n*31+Math.round(s.bx[i]*8)+Math.round(s.by[i]*8)*7+s.bcolor[i])|0;return [s.tick,s.stage,s.seg,s.n,s.lasers.length,s.mobs.length,s.itemCount,s.score,s.graze,s.rng,n].join('|');};
 const x=a.createRun({seed:11}),y=a.createRun({seed:11}),z=a.createRun({seed:12});
 for(let i=0;i<9000;i++){const input={dx:Math.sin(i/30)*4,dy:Math.cos(i/70)*2,focus:i%300<60,bomb:i===4000};for(const s of [x,y,z]){s.player.invulnerableUntil=s.tick+999;a.step(s,input);clear(s);}}
 assert.equal(digest(x),digest(y));assert.notEqual(digest(x),digest(z));
 // 보스 체험: 고른 스테이지의 보스전만
 const k=a.STAGES.findIndex(g=>g.kind==='boss'),cards=a.SEGMENTS.filter(g=>g.stage===k&&g.kind==='card').length;let waves=0;
 const rush=play({difficulty:'normal',seed:5,stage:k,bossOnly:true},60000,s=>{if(s.stage==='wave')waves++;});
 assert.equal(rush.s.stage,'won');assert.equal(waves,0);assert.equal(rush.s.cleared+rush.s.timeouts,cards);assert.equal(rush.s.kills,0);
});

test('v43 slow movement, the bomb, grazing, items and the named-pattern bonus still work',()=>{
 const a=A(),s=idle();const x=s.player.x;a.step(s,{dx:50,dy:0,focus:true});assert(s.player.x-x<=2.01&&s.player.focus===true);a.step(s,{dx:50,dy:0});assert(s.player.focus===false);
 const b=idle(),stock=b.bombs;assert.equal(stock,a.DIFFICULTY.normal.bombs);for(let i=0;i<30;i++)put(b,40+i*8,300,{bage:100});b.lasers.push({x:0,y:0,angle:0,width:10,warn:5,active:50,color:0,spin:0,follow:false,burst:false,age:0,grazed:false});
 a.step(b,{dx:0,dy:0,bomb:true});assert.equal(b.n,0);assert.equal(b.lasers.length,0);assert.equal(b.bombs,stock-1);assert(b.events.includes('bomb'));assert(b.player.invulnerableUntil>=b.tick+90);
 put(b,b.player.x,b.player.y,{bage:100});a.step(b,{dx:0,dy:0});assert.equal(b.player.hp,b.player.maxHp);
 b.bombs=0;clear(b);b.n=0;put(b,20,300,{bage:100});a.step(b,{dx:0,dy:0,bomb:true});assert.equal(b.n,1);assert(!b.events.includes('bomb'));
 const g=idle();g.bombs=0;g.gauge=a.GAUGE_FULL-1;put(g,g.player.x+12,g.player.y,{bage:100});a.step(g,{dx:0,dy:0});assert.equal(g.graze,1);assert.equal(g.bombs,1);
 const it=idle();a.dropItem(it,it.player.x+6,it.player.y,0);a.step(it,{dx:0,dy:0});assert.equal(it.itemCount,0);assert.equal(it.itemsTaken,1);
 const far=idle();a.dropItem(far,20,560,0);a.dropItem(far,340,600,0);for(let i=0;i<40;i++)a.step(far,{dx:0,dy:0});assert.equal(far.itemsTaken,0);
 far.player.y=a.AUTO_COLLECT_Y-10;let n=0;while(far.itemCount&&n++<200)a.step(far,{dx:0,dy:0});assert.equal(far.itemsTaken,2);
 const spell=a.SEGMENTS.findIndex(x=>x.spell);
 const run=mess=>{const s=a.createRun({difficulty:'normal',seed:3,segment:spell});let got=false,done=false;for(let i=0;i<4000&&!done;i++){s.player.invulnerableUntil=s.tick+999;const on=s.stage==='card'&&s.seg===spell;if(on&&mess==='bomb'&&s.segTick===60)a.step(s,{dx:s.boss.x-s.player.x,dy:0,bomb:true});else a.step(s,{dx:Math.max(-4,Math.min(4,s.boss.x-s.player.x)),dy:0});if(s.events.includes('capture'))got=true;if(s.seg!==spell)done=true;clear(s);}return {got,s};};
 const clean=run(''),bombed=run('bomb');assert.equal(clean.got,true);assert.equal(clean.s.captures,1);assert.equal(bombed.got,false);assert(clean.s.score>bombed.s.score);
 // 잘못된 입력은 버린다
 const bad=idle();for(const input of [{dx:NaN,dy:1},{dx:Infinity,dy:-Infinity},null,undefined,{dx:'a'}]){a.step(bad,input);assert(Number.isFinite(bad.player.x)&&Number.isFinite(bad.player.y));}
});

test('v43 difficulties, the phone mode, six colours and shapes, upright crosses, and nothing hits before it has formed',()=>{
 const a=A(),d=a.DIFFICULTY;assert.deepEqual([d.gentle.hp,d.normal.hp,d.hell.hp],[9,5,3]);
 assert(d.gentle.speed<d.normal.speed&&d.normal.speed<d.hell.speed&&d.hell.speed<1);assert(d.gentle.density<d.normal.density&&d.normal.density<d.hell.density);
 assert.deepEqual([...a.PALETTE].sort(),[0,2,4,5,6,8]);assert.equal(a.SIZE_RADIUS.length,6);assert(a.COMPACT_CAP<a.CAP);
 const cross=a.PROPS.findIndex(p=>p.key==='cross');assert(cross>=0&&a.PROPS[cross].upright===true);
 const heart=a.PROPS.findIndex(p=>p.key==='heart');assert(heart<0||a.PROPS[heart].radius>0);
 const i=a.SEGMENTS.findIndex(x=>x.spell&&!x.mid),run=(difficulty,compact)=>{const s=a.createRun({difficulty,seed:9,segment:i,compact});let most=0,fastest=0;for(let t=0;t<1500&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});most=Math.max(most,s.n);for(let k=0;k<s.n;k++)if(s.bsize[k]!==a.SHAPE_PROP)fastest=Math.max(fastest,s.bs[k]);clear(s);}return {s,most,fastest};};
 const gentle=run('gentle'),hell=run('hell'),phone=run('hell',true);assert(d.gentle.density<=d.normal.density*.7&&d.gentle.density<d.hell.density&&gentle.most>0); // 사용자 결정(11-14): 이지·노멀은 헬만큼 쏘되 느리게. 화면 탄 수 대신 쏘는 양(density)을 비교한다.assert(hell.fastest<=200);assert(phone.most<hell.most*.85&&phone.most<=a.COMPACT_CAP);assert(phone.s.sizeScale>1&&hell.s.sizeScale===1);
 // 모든 스테이지를 지옥 난이도로 훑으며 색·모양·십자가를 본다(스테이지마다 앞 6000틱)
 const colors=new Set(),sizes=new Set();let crosses=0;
 a.STAGES.forEach((g,k)=>{const s=a.createRun({difficulty:'hell',seed:2+k,stage:k,stages:1});
  for(let t=0;t<30000&&s.stage!=='won';t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:Math.max(-4,Math.min(4,(s.stage==='card'?s.boss.x:180)-s.player.x)),dy:0});
   if(t%11===0)for(let j=0;j<s.n;j++){sizes.add(s.bsize[j]);if(s.bsize[j]===a.SHAPE_PROP){assert(s.bcolor[j]<a.PROPS.length);if(a.PROPS[s.bcolor[j]].upright){if(s.bcolor[j]===cross)crosses++;assert.equal(s.bspin[j],0,'an upright prop never spins');assert(Math.abs(s.ba[j]-Math.PI/2)<1e-6,'and only falls straight down');}}else colors.add(s.bcolor[j]);}
   clear(s);}});
 for(const c of colors)assert(a.PALETTE.includes(c),'colour '+c);assert(crosses>0);assert(sizes.size<=6);
 const f=idle();put(f,f.player.x,f.player.y);for(let t=0;t<a.BLOOM_TICKS-2;t++)a.step(f,{dx:0,dy:0});assert.equal(f.player.hp,f.player.maxHp);
});

test('v43 one page: the journey with continue, stage select and locks; art loads a stage at a time; sound levels are ordered',()=>{
 const page=h.read('arcade.html'),app=h.read('src/arcade-app-v43.js'),sim=h.read('src/arcade-v43.js'),index=h.read('index.html');
 assert.doesNotMatch(sim.replace(/typeof window!=='undefined'\?window:globalThis/,''),/document\.|window\.|HapilCore|Math\.random|Date\.now|performance\.|localStorage/);
 for(let p=1;p<=8;p++){const f='src/arcade-parts-v43/p'+p+'.js';assert(page.includes(f),'page loads '+f);assert.doesNotMatch(h.read(f),/document\.|window\.|Math\.random|Date\.now|localStorage/);}
 assert(page.indexOf('src/arcade-parts-v43/p8.js')<page.indexOf('src/arcade-v43.js')&&page.indexOf('src/arcade-v43.js')<page.indexOf('src/arcade-app-v43.js'));
 for(const id of ['arcade-focus','arcade-bomb','arcade-stage-select','arcade-continue','arcade-keepsakes'])assert(page.includes('id="'+id+'"'),id);
 assert.match(app,/function loadStage\(/);assert.match(app,/function releaseStage\(/);assert(app.includes('hapil-arcade-save-v43'));assert(app.includes('Progress.sanitize'));assert(app.includes('Progress.record'));
 assert.doesNotMatch(page,/arcade-v38|arcade-app-v38/);assert(/arcade\.html/.test(index),'the first page leads to the journey');
 const cues=require('../src/audio-v37.js').CUES;
 assert(cues.hurt.level>cues.bomb.level&&cues.bomb.level>cues.charge.level&&cues.charge.level>cues.graze.level&&cues.charge.level>cues.item.level);
});
