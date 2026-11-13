'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const arcade=require('../src/arcade-v38.js');
const SEG=arcade.SEGMENTS,named=name=>SEG.findIndex(g=>g.name===name);

// 검사용 무적: 무적 시간만 계속 늘려 끝까지 돌린다. 탄·광선·몹 생성 규칙은 건드리지 않는다.
function play(difficulty,seed,each){
 const s=arcade.createRun({difficulty,seed});
 for(let i=0;i<120000&&s.stage!=='won'&&s.stage!=='lost';i++){
  s.player.invulnerableUntil=s.tick+999;
  const target=s.stage==='card'?s.boss.x:s.mobs.length?s.mobs[0].x:180;
  arcade.step(s,{dx:Math.max(-4,Math.min(4,target-s.player.x)),dy:0});
  assert(s.n<=arcade.CAP);assert(s.events.length<=48);assert(s.mobs.length<=arcade.MOB_CAP);assert(s.lasers.length<=arcade.LASER_CAP);
  if(each)each(s);s.events.length=0;s.cancelled.length=0;s.pops.length=0;
 }
 return s;
}
function digest(s){let h=0;for(let i=0;i<s.n;i++)h=(h*31+Math.round(s.bx[i]*8)+Math.round(s.by[i]*8)*7+s.bcolor[i])|0;return [s.tick,s.stage,s.seg,s.n,s.lasers.length,s.mobs.length,s.score,s.graze,s.kills,s.rng,Math.round(s.player.x*100),h].join('|');}
function idle(difficulty){const s=arcade.createRun({difficulty,seed:1});s.stage='break';s.stageTick=-100000;return s;}
function put(s,x,y,patch){const i=s.n++;Object.assign({},patch);s.bx[i]=x;s.by[i]=y;s.ba[i]=0;s.bs[i]=0;s.bage[i]=0;s.blife[i]=60000;s.bsize[i]=1;s.bcolor[i]=0;s.bgrazed[i]=0;s.bat[i]=0;s.bmode[i]=0;s.barg[i]=0;s.bs2[i]=0;s.bturn[i]=0;s.bacc[i]=0;s.bgen[i]=0;s.bspin[i]=0;for(const k in patch||{})s[k][i]=patch[k];return i;}
function laser(s,patch){const l=Object.assign({x:-12,y:s.player.y,angle:0,width:20,warn:30,active:40,color:0,spin:0,follow:false,burst:false,age:0,grazed:false},patch);s.lasers.push(l);return l;}

test('v40 a run is deterministic for a seed and differs across seeds',()=>{
 const a=arcade.createRun({difficulty:'normal',seed:11}),b=arcade.createRun({difficulty:'normal',seed:11}),c=arcade.createRun({difficulty:'normal',seed:12});
 for(let i=0;i<7000;i++){const input={dx:Math.sin(i/30)*4,dy:Math.cos(i/70)*2};for(const s of [a,b,c]){s.player.invulnerableUntil=s.tick+999;arcade.step(s,input);s.events.length=0;s.cancelled.length=0;s.pops.length=0;}}
 assert.equal(digest(a),digest(b));assert.notEqual(digest(a),digest(c));
});

test('v40 every difficulty plays through three maps of mobs, a mid boss and a boss',()=>{
 assert.deepEqual(SEG.map(g=>g.kind==='wave'?'W'+g.stage:(arcade.ACTORS[g.actor].mid?'M':'B')+g.stage).join(' '),'W0 M0 B0 B0 B0 W1 M1 B1 B1 B1 W2 M2 B2 B2 B2');
 assert.equal(arcade.CARD_TOTAL,12);
 const peak={};
 for(const difficulty of ['gentle','normal','hell']){
  const order=[],actors=[];let most=0;
  const s=play(difficulty,5,s=>{most=Math.max(most,s.n);if(order[order.length-1]!==s.seg)order.push(s.seg);if(s.stage==='card'&&actors[actors.length-1]!==s.boss.name)actors.push(s.boss.name);
   if(s.stage==='card')assert.equal(s.boss.actor,SEG[s.seg].actor,'the right actor is on stage for its card');});
  assert.equal(s.stage,'won',difficulty);assert.equal(s.dropped,0,'no bullet was dropped at the cap');
  assert.deepEqual(order,[-1,...SEG.map((g,i)=>i)]);
  assert.deepEqual(actors,['타락천사 기사','보라검천사','악몽의 우두머리','늪지대 뿔악마','파란불 집행체','발록']);
  assert.equal(s.cleared+s.timeouts,12);assert(s.kills>=40,'mobs are killable: '+s.kills);assert(Number.isFinite(s.score)&&s.score>0);
  for(let i=0;i<s.n;i++)assert(Number.isFinite(s.bx[i])&&Number.isFinite(s.by[i]));
  peak[difficulty]=most;
 }
 assert(peak.normal<peak.hell,JSON.stringify(peak));assert(peak.normal>=300,'normal fills the screen: '+peak.normal);assert(peak.hell<=arcade.CAP*.8,'hell keeps headroom under the cap');
});

test('v40 lives and healing follow the difficulty rules',()=>{
 const d=arcade.DIFFICULTY;
 assert.deepEqual([d.gentle.hp,d.normal.hp,d.hell.hp],[7,3,1]);
 assert(d.gentle.speed<d.normal.speed&&d.normal.speed<d.hell.speed);assert(d.gentle.density<d.normal.density&&d.normal.density<d.hell.density);
 assert(d.gentle.radius<d.normal.radius&&d.normal.radius<d.hell.radius);assert(d.gentle.hitScale<d.normal.hitScale&&d.normal.hitScale<=d.hell.hitScale);
 assert(d.gentle.warn>d.normal.warn&&d.normal.warn>d.hell.warn);
 for(const [difficulty,expected] of [['gentle',[7,7]],['normal',[2,2]],['hell',[1,1]]]){
  // 첫 맵에서 목숨을 1만 남기고 두 번째·세 번째 맵에 들어설 때의 목숨을 본다.
  const s=arcade.createRun({difficulty,seed:3}),seen=[];let stage=0;
  for(let i=0;i<120000&&s.stage!=='won';i++){
   s.player.invulnerableUntil=s.tick+999;if(s.stageIndex===stage)s.player.hp=1;
   arcade.step(s,{dx:Math.max(-4,Math.min(4,(s.stage==='card'?s.boss.x:180)-s.player.x)),dy:0});
   if(s.stageIndex!==stage){stage=s.stageIndex;seen.push(s.player.hp);}
   s.events.length=0;s.cancelled.length=0;s.pops.length=0;
  }
  assert.deepEqual(seen,expected,difficulty);
 }
 const hell=arcade.createRun({difficulty:'hell',seed:1});
 for(let i=0;i<20000&&hell.stage!=='lost';i++){arcade.step(hell,{dx:0,dy:-3});hell.events.length=0;hell.cancelled.length=0;hell.pops.length=0;}
 assert.equal(hell.stage,'lost');assert.equal(hell.hits,1,'one hit ends a hell run');
});

test('v40 a hit costs one life, wipes the screen and grants a grace period',()=>{
 const s=arcade.createRun({difficulty:'normal',seed:3});let hurtAt=-1,before=0;
 for(let i=0;i<20000&&s.stage!=='lost';i++){
  const hp=s.player.hp;arcade.step(s,{dx:0,dy:-3});
  if(s.player.hp<hp){assert.equal(s.player.hp,hp-1);assert(s.events.includes('hurt'));assert.equal(s.n,0,'bullets are cancelled on hit');assert.equal(s.lasers.length,0);assert(s.player.invulnerableUntil>s.tick+100);if(hurtAt<0){hurtAt=s.tick;before=hp;}}
  if(hurtAt>=0&&s.tick<hurtAt+140)assert(s.player.hp>=before-1,'no second hit during the grace period');
  s.events.length=0;s.cancelled.length=0;s.pops.length=0;
 }
 assert.equal(s.stage,'lost');assert.equal(s.hits,3);
 const tick=s.tick;arcade.step(s,{dx:5,dy:0});assert.equal(s.tick,tick,'a finished run stops advancing');
});

test('v40 a freshly spawned bullet cannot hit, a near miss grazes once, and a big prop only hits at its core',()=>{
 const s=idle('normal'),full=s.player.maxHp;put(s,s.player.x,s.player.y);
 for(let i=0;i<arcade.BLOOM_TICKS-2;i++)arcade.step(s,{dx:0,dy:0});
 assert.equal(s.player.hp,full,'blooming bullet is harmless');
 arcade.step(s,{dx:0,dy:0});arcade.step(s,{dx:0,dy:0});assert.equal(s.player.hp,full-1,'it hits once it has formed');
 s.player.invulnerableUntil=0;s.events.length=0;const graze=s.graze;put(s,s.player.x+12,s.player.y,{bage:200});
 arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1);assert(s.events.includes('graze'));
 for(let i=0;i<30;i++)arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1,'the same bullet never grazes twice');assert.equal(s.player.hp,full-1);
 const prop=idle('normal');put(prop,prop.player.x+12,prop.player.y,{bsize:arcade.SHAPE_PROP,bcolor:3,bage:200});
 arcade.step(prop,{dx:0,dy:0});assert.equal(prop.player.hp,prop.player.maxHp,'the edge of a tombstone only grazes');assert.equal(prop.graze,1);
 put(prop,prop.player.x+5,prop.player.y,{bsize:arcade.SHAPE_PROP,bcolor:3,bage:200});arcade.step(prop,{dx:0,dy:0});assert.equal(prop.player.hp,prop.player.maxHp-1,'its core hits');
 assert.equal(arcade.PROP_RADIUS.length,7);
});

test('v40 the player stays inside the field and focus slows movement',()=>{
 const s=idle('normal');
 for(let i=0;i<200;i++)arcade.step(s,{dx:999,dy:999});
 assert(s.player.x<=arcade.WIDTH-8&&s.player.y<=arcade.HEIGHT-14);
 for(let i=0;i<200;i++)arcade.step(s,{dx:-999,dy:-999});
 assert(s.player.x>=8&&s.player.y>=40);
 const x=s.player.x;arcade.step(s,{dx:50,dy:0,focus:true});assert(s.player.x-x<=2.01);
 const y=s.player.x;arcade.step(s,{dx:50,dy:0});assert(s.player.x-y<=12.01&&s.player.x-y>2.01);
 assert.equal(arcade.createRun({difficulty:'nope'}).difficulty,'normal');
});

test('v40 a laser is harmless while it warns, hits while lit, and leaves a gap beside it',()=>{
 const s=idle('normal');laser(s,{});
 for(let i=0;i<29;i++)arcade.step(s,{dx:0,dy:0});
 assert.equal(s.player.hp,s.player.maxHp,'the warning line never hurts');
 arcade.step(s,{dx:0,dy:0});assert(s.events.includes('laserFire'));assert.equal(s.player.hp,s.player.maxHp-1,'the lit beam hits on its first tick');
 const beside=idle('normal');laser(beside,{y:beside.player.y-20});
 for(let i=0;i<90;i++)arcade.step(beside,{dx:0,dy:0});
 assert.equal(beside.player.hp,beside.player.maxHp,'standing just outside the beam is safe');assert.equal(beside.graze,1);assert.equal(beside.lasers.length,0,'the beam expires after its fade');
 const behind=idle('normal');laser(behind,{x:behind.player.x+60,y:behind.player.y});
 for(let i=0;i<60;i++)arcade.step(behind,{dx:0,dy:0});assert.equal(behind.player.hp,behind.player.maxHp,'a ray does not reach behind its origin');
 const spin=idle('normal'),l=laser(spin,{x:180,y:100,angle:0,spin:.3,warn:20,active:120});
 for(let i=0;i<20;i++)arcade.step(spin,{dx:0,dy:0});assert.equal(l.angle,0);
 for(let i=0;i<60;i++)arcade.step(spin,{dx:0,dy:0});assert(Math.abs(l.angle-.3)<.01,'one second of spin after lighting');
 const cut=idle('normal');laser(cut,{x:180,y:100,angle:Math.PI/2,warn:10,active:10,burst:true});
 for(let i=0;i<10;i++)arcade.step(cut,{dx:-12,dy:0});
 assert(cut.n>=8&&cut.n%2===0);for(let i=0;i<cut.n;i++){assert.equal(cut.bsize[i],3);assert(Math.abs(cut.bx[i]-180)<2);}
});

test('v40 geometric shapes are what their names say',()=>{
 const S=arcade.Shapes,r=(p,i)=>Math.hypot(p[i],p[i+1]),near=(a,b,eps)=>Math.abs(a-b)<(eps||1e-6);
 const hex=S.polygon(6,4);assert.equal(hex.length/2,24);
 for(let i=0;i<hex.length;i+=2){const a=Math.atan2(hex[i+1],hex[i])+Math.PI/2,sector=((a%(Math.PI/3))+Math.PI/3)%(Math.PI/3)-Math.PI/6;assert(near(r(hex,i)*Math.cos(sector),Math.cos(Math.PI/6),1e-6),'every point lies on a side of the regular hexagon');}
 const star=S.star(5,.4,3),radii=[];for(let i=0;i<star.length;i+=2)radii.push(r(star,i));
 assert.equal(star.length/2,30);assert(near(Math.max(...radii),1));assert.equal(radii.filter(x=>near(x,1)).length,5,'five outer tips');assert.equal(radii.filter(x=>near(x,.4)).length,5,'five inner corners');
 const rose=S.rose(4,400),rr=[];for(let i=0;i<rose.length;i+=2)rr.push(r(rose,i));
 let petals=0;for(let i=0;i<rr.length;i++){const a=rr[(i+rr.length-1)%rr.length],b=rr[i],c=rr[(i+1)%rr.length];if(b>=a&&b>c)petals++;}assert.equal(petals,4,'a k=4 rose has four petals');
 assert.equal(S.koch(0).length/2,3);assert.equal(S.koch(1).length/2,12);assert.equal(S.koch(2).length/2,48,'each Koch step multiplies the corners by four');
 assert.equal(S.sierpinski(1).length/2,6);assert.equal(S.sierpinski(2).length/2,15);assert.equal(S.sierpinski(3).length/2,42,'Sierpinski corner counts 3·(3^d+1)/2');
 const spiral=S.goldenSpiral(40),phi=(1+Math.sqrt(5))/2;
 assert.equal(spiral.length/2,40);for(let i=0;i+1<40;i++)assert(near(r(spiral,(i+1)*2)/r(spiral,i*2),Math.pow(phi,6.9/39/(Math.PI/2)),1e-6),'the radius grows by the golden ratio every quarter turn');
 assert(near(arcade.GOLDEN_ANGLE*180/Math.PI,137.50776,1e-4));
 assert.equal(S.polygon(6,4),S.polygon(6,4),'shapes are built once and reused');
});

test('v40 a shape keeps its form as it grows, phyllotaxis steps by the golden angle, and a branch splits 1→3→9→27',()=>{
 const s=arcade.createRun({difficulty:'normal',seed:4});s.seg=named('오망성의 서약');s.stage='card';s.boss.present=true;s.boss.actor=3;s.boss.x=180;s.boss.y=300;s.boss.targetX=180;s.boss.targetY=300;s.boss.hp=s.boss.maxHp=1e9;s.segTick=40;
 s.player.invulnerableUntil=1e9;arcade.step(s,{dx:0,dy:0});
 const n=s.n;assert(n>=20,'the first pentagram is out: '+n);const at=k=>{const out=[];for(let i=0;i<n;i++)out.push(Math.hypot(s.bx[i]-180,s.by[i]-300));return out;};
 for(let i=0;i<30;i++){s.segTick=41;arcade.step(s,{dx:0,dy:0});}const a=at();for(let i=0;i<30;i++){s.segTick=41;arcade.step(s,{dx:0,dy:0});}const b=at();
 for(let i=0;i<n;i++)assert(Math.abs(b[i]/a[i]-b[0]/a[0])<1e-3,'every bullet scaled by the same factor, so the star stays a star');
 const g=arcade.createRun({difficulty:'hell',seed:4});g.seg=named('황금각의 실');g.stage='card';g.boss.present=true;g.boss.x=180;g.boss.y=300;g.boss.targetX=180;g.boss.targetY=300;g.boss.hp=g.boss.maxHp=1e9;g.player.invulnerableUntil=1e9;
 const angles=[];for(let t=0;t<5;t++){const before=g.n;g.segTick=40+1+t*2;arcade.step(g,{dx:0,dy:0});for(let i=before;i<g.n;i++)if(g.bcolor[i]===2||g.bcolor[i]===8)angles.push(g.ba[i]);}
 assert(angles.length>=4);for(let i=1;i<angles.length;i++)assert(Math.abs((angles[i]-angles[i-1])/arcade.GOLDEN_ANGLE-Math.round((angles[i]-angles[i-1])/arcade.GOLDEN_ANGLE))<1e-4,'successive seeds differ by whole golden-angle steps');
 const f=idle('normal');put(f,180,100,{ba:Math.PI/2,bs:60,bs2:60,bsize:2,bcolor:5,bat:20,bmode:4,barg:3,bgen:3});const counts=[];
 for(let i=0;i<70;i++){arcade.step(f,{dx:-12,dy:0});if(i%20===19||i===0)counts.push(f.n);}
 assert.deepEqual(counts,[1,3,9,27]);for(let i=0;i<f.n;i++)assert.equal(f.bcolor[i],5);
 const bubble=idle('normal');put(bubble,100,200,{bsize:4,bcolor:5,bat:5,bmode:3,barg:11,bs2:60});
 for(let k=0;k<5;k++)arcade.step(bubble,{dx:0,dy:0});assert.equal(bubble.n,11,'a bubble bursts into a full ring');assert(bubble.events.includes('pop'));
});

test('v40 each boss has its own signature and big props match their owner',()=>{
 const seen={};
 for(const difficulty of ['gentle','hell']){
  const cards=SEG.map(()=>({lasers:0,angles:new Set(),spin:false,sizes:new Set(),props:new Set()}));
  play(difficulty,21,s=>{if(s.seg<0)return;const c=cards[s.seg];c.lasers=Math.max(c.lasers,s.lasers.length);
   for(const l of s.lasers){c.angles.add(Math.round(((l.angle%Math.PI)+Math.PI)%Math.PI*100)/100);if(l.spin)c.spin=true;}
   if(s.tick%15===0)for(let k=0;k<s.n;k++){c.sizes.add(s.bsize[k]);if(s.bsize[k]===arcade.SHAPE_PROP)c.props.add(s.bcolor[k]);}});
  seen[difficulty]=cards;const of=name=>cards[named(name)],horizontal=0,vertical=1.57;
  assert(of('오망성의 서약').props.has(0),'the knight throws violet swords');
  assert.equal(of('황금각의 실').lasers,0);
  const web=of('거미줄 결계');assert(web.lasers>=2&&web.angles.size===2&&!web.angles.has(horizontal)&&!web.angles.has(vertical),'violet weaves diagonals both ways');
  assert(of('보라검 난무').lasers>=1&&of('보라검 난무').sizes.has(3)&&of('보라검 난무').props.has(0),'sword cuts, rice and flying violet swords');
  assert(of('악몽의 쌍검').props.has(5),'the chief throws its twin blades');
  const rain=of('썩은 비의 기둥');assert.deepEqual([...rain.angles],[vertical],'the horn demon drops vertical pillars only');assert(rain.props.has(3),'and tombstones follow the pillars on every difficulty');
  assert(of('독기 포자 · 가지치기').sizes.has(4));
  assert(of('시간의 장미').props.has(6)&&of('시간의 장미').props.has(4),'the executor throws crescents and drops spires');
  assert(of('화염 수레바퀴').props.has(2),'balrog spins flame swords');
  const grid=of('지옥불 격자');assert(grid.angles.has(horizontal)&&grid.angles.has(vertical)&&grid.angles.size===2,'balrog lays a horizontal and vertical grid');
  assert(of('최후의 만다라').spin&&of('최후의 만다라').lasers>=2,'and turns a wheel of beams');
  for(const g of SEG)if(g.kind==='wave')assert.equal(cards[SEG.indexOf(g)].lasers,0,'mob waves never use lasers');
 }
 for(const name of ['거미줄 결계','보라검 난무','썩은 비의 기둥','지옥불 격자'])assert(seen.gentle[named(name)].lasers<seen.hell[named(name)].lasers,'hell has more beams in '+name);
});

test('v40 mob waves spawn, shoot from above only, die to shots and hand over to the mid boss',()=>{
 const s=arcade.createRun({difficulty:'normal',seed:8});let maxMobs=0,elite=false,fired=0,lowFire=0,handed=-1;const kinds=new Set();
 for(let i=0;i<4000&&handed<0;i++){
  s.player.invulnerableUntil=s.tick+999;const before=s.n,low=s.mobs.filter(m=>!m.elite&&m.y>=400).length;
  arcade.step(s,{dx:0,dy:0});
  for(const m of s.mobs){kinds.add(m.kind);if(m.elite)elite=true;}maxMobs=Math.max(maxMobs,s.mobs.length);
  if(s.n>before)fired+=s.n-before;for(let k=before;k<s.n;k++)if(s.by[k]>=400)lowFire++;
  if(s.stage==='intro'&&handed<0)handed=s.tick;
  s.events.length=0;s.cancelled.length=0;s.pops.length=0;
 }
 assert(maxMobs>=4);assert(elite,'elite mobs appear');assert.deepEqual([...kinds].sort(),['guardian','spider']);assert(fired>50,'mobs shoot');assert.equal(lowFire,0,'nothing is fired from the player zone');
 assert(handed>0&&s.seg===1&&s.mobs.length===0&&s.n===0,'the wave clears the screen and the mid boss follows');
 const k=idle('normal');k.stage='wave';k.seg=0;k.segTick=1e6;k.mobs.push({kind:'spider',elite:false,x:k.player.x,y:300,baseX:k.player.x,vx:0,vy:0,sway:0,swayRate:0,hp:5,r:14,score:300,fire:'aim',first:1e9,every:0,color:0,stopY:0,hold:0,age:0,shots:0,hitTick:-99});
 let dead=-1;for(let i=0;i<120&&dead<0;i++){k.stage='wave';k.segTick=-1e6;arcade.step(k,{dx:0,dy:0});if(!k.mobs.length)dead=i;}
 assert(dead>0&&dead<90,'a spider under fire dies quickly: '+dead);assert.equal(k.kills,1);assert(k.score>=300);
});

test('v40 the arcade page is separate from the story engine, reachable from the title, and its art exists',()=>{
 const root=path.join(__dirname,'..'),page=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),order=[...page.matchAll(/src="src\/([^"?]+)\.js/g)].map(m=>m[1]);
 assert.deepEqual(order,['audio-v37','arcade-v38','arcade-app-v38']);
 const sim=fs.readFileSync(path.join(root,'src/arcade-v38.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v38.js'),'utf8');
 assert.doesNotMatch(sim,/document\.|HapilCore|Math\.random|Date\.now|performance\./,'the simulation is self-contained and deterministic');
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/href="arcade\.html"/);
 const files=[...app.matchAll(/'(media\/[^']+\.(?:webp|png|jpg))'/g)].map(m=>m[1]);assert(files.length>=16);
 for(const file of files)assert(fs.existsSync(path.join(root,file)),file);
 const props=[...app.matchAll(/key:'([a-z-]+)',long:/g)].map(m=>m[1]);assert.equal(props.length,arcade.PROP_RADIUS.length);
 for(const key of props){const file=path.join(root,'media/arcade-v40',key+'.webp');assert(fs.existsSync(file),key);assert(fs.statSync(file).size<40000,'prop art stays small for mobile');}
 for(const actor of arcade.ACTORS)assert.match(app,new RegExp('\\b'+actor.art+':\\{src:'));for(const kind of Object.keys(arcade.MOBS))assert.match(app,new RegExp('\\b'+kind+':\\{src:'));
});
