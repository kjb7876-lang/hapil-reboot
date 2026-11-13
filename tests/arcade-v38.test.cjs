'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const arcade=require('../src/arcade-v38.js');

// 검사용 무적: 무적 시간만 계속 늘려 끝까지 돌린다. 탄·광선 생성 규칙은 건드리지 않는다.
function play(difficulty,seed,options){
 options=options||{};const s=arcade.createRun({difficulty,seed}),peaks=[];let peak=0,card=0,events=0;
 for(let i=0;i<30000&&s.stage!=='won'&&s.stage!=='lost';i++){
  if(!options.mortal)s.player.invulnerableUntil=s.tick+999;
  const follow=options.follow?Math.max(-4,Math.min(4,s.boss.x-s.player.x)):Math.sin(i/45)*3;
  arcade.step(s,{dx:follow,dy:0});
  assert(s.n<=arcade.CAP);assert(s.events.length<=48);events+=s.events.length;s.events.length=0;s.cancelled.length=0;
  if(s.cardIndex!==card){peaks.push(peak);peak=0;card=s.cardIndex;}peak=Math.max(peak,s.n);
 }
 peaks.push(peak);return {s,peaks,events};
}
function digest(s){let h=0;for(let i=0;i<s.n;i++)h=(h*31+Math.round(s.bx[i]*8)+Math.round(s.by[i]*8)*7+s.bcolor[i])|0;return [s.tick,s.stage,s.cardIndex,s.n,s.lasers.length,s.score,s.graze,s.hits,s.rng,Math.round(s.player.x*100),h].join('|');}

test('v38 arcade run is deterministic for a seed and differs across seeds',()=>{
 const a=arcade.createRun({difficulty:'normal',seed:11}),b=arcade.createRun({difficulty:'normal',seed:11}),c=arcade.createRun({difficulty:'normal',seed:12});
 for(let i=0;i<5200;i++){const input={dx:Math.sin(i/30)*4,dy:Math.cos(i/70)*2};for(const s of [a,b,c]){s.player.invulnerableUntil=s.tick+999;arcade.step(s,input);s.events.length=0;s.cancelled.length=0;}}
 assert.equal(digest(a),digest(b));assert.notEqual(digest(a),digest(c));
});

test('v38 every difficulty reaches the end with a full, uncapped screen',()=>{
 const peak={};
 for(const difficulty of ['gentle','normal','hell']){
  const {s,peaks}=play(difficulty,5,{follow:true});
  assert.equal(s.stage,'won',difficulty);assert.equal(s.dropped,0,'no bullet was dropped at the cap');
  assert.equal(peaks.length,arcade.CARDS.length);assert.equal(s.cleared+s.timeouts,arcade.CARDS.length);
  peak[difficulty]=Math.max(...peaks);
  for(let i=0;i<s.n;i++)assert(Number.isFinite(s.bx[i])&&Number.isFinite(s.by[i]));
  assert(Number.isFinite(s.score)&&s.score>0);
 }
 assert(peak.normal<peak.hell,JSON.stringify(peak));
 assert(peak.normal>=350,'normal should fill the screen: '+peak.normal);assert(peak.hell<=arcade.CAP*.8,'hell keeps headroom under the cap');
});

test('v38 standing under the boss clears cards; hiding lets them time out',()=>{
 const under=play('normal',9,{follow:true}).s,away=arcade.createRun({difficulty:'normal',seed:9});
 assert(under.cleared>=8,'cleared '+under.cleared);
 // 주포가 닿지 않는 구석에서도 유도탄 덕분에 시간 안에 깰 수 있어야 한다.
 for(let i=0;i<40000&&away.stage!=='won';i++){away.player.invulnerableUntil=away.tick+999;arcade.step(away,{dx:-4,dy:0});away.events.length=0;away.cancelled.length=0;}
 assert.equal(away.stage,'won');assert(away.tick>under.tick,'ignoring the boss must be slower');
});

test('v38 a hit costs one life, wipes the screen and grants a grace period',()=>{
 const s=arcade.createRun({difficulty:'hell',seed:3});let hurtAt=-1,before=0;
 for(let i=0;i<6000&&s.stage!=='lost';i++){
  const hp=s.player.hp,n=s.n;arcade.step(s,{dx:0,dy:-3});
  if(s.player.hp<hp){assert.equal(s.player.hp,hp-1);assert(s.events.includes('hurt'));assert.equal(s.n,0,'bullets are cancelled on hit');assert(s.cancelled.length>0||n===0);assert(s.player.invulnerableUntil>s.tick+100);if(hurtAt<0){hurtAt=s.tick;before=hp;}}
  if(hurtAt>=0&&s.tick<hurtAt+140)assert(s.player.hp>=before-1,'no second hit during the grace period');
  s.events.length=0;s.cancelled.length=0;
 }
 assert.equal(s.stage,'lost');assert.equal(s.hits,3);assert.equal(s.player.hp,0);
 const tick=s.tick;arcade.step(s,{dx:5,dy:0});assert.equal(s.tick,tick,'a finished run stops advancing');
});

test('v38 a freshly spawned bullet cannot hit, and a near miss is a graze counted once',()=>{
 const s=arcade.createRun({difficulty:'normal',seed:1});s.stage='break';s.boss.leaving=false;s.stageTick=-100000;
 const put=(x,y,age)=>{const i=s.n++;s.bx[i]=x;s.by[i]=y;s.ba[i]=0;s.bs[i]=0;s.bage[i]=age;s.blife[i]=60000;s.bsize[i]=1;s.bgrazed[i]=0;s.bat[i]=0;s.bturn[i]=0;s.bacc[i]=0;};
 put(s.player.x,s.player.y,0);
 for(let i=0;i<arcade.BLOOM_TICKS-2;i++)arcade.step(s,{dx:0,dy:0});
 const full=s.player.maxHp;assert.equal(full,4);assert.equal(s.player.hp,full,'blooming bullet is harmless');
 arcade.step(s,{dx:0,dy:0});arcade.step(s,{dx:0,dy:0});assert.equal(s.player.hp,full-1,'it hits once it has formed');
 s.player.invulnerableUntil=0;s.events.length=0;const graze=s.graze;put(s.player.x+12,s.player.y,200);
 arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1);assert(s.events.includes('graze'));
 for(let i=0;i<30;i++)arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1,'the same bullet never grazes twice');assert.equal(s.player.hp,full-1);
});

test('v38 the player stays inside the field and focus slows movement',()=>{
 const s=arcade.createRun({seed:2});
 for(let i=0;i<200;i++)arcade.step(s,{dx:999,dy:999});
 assert(s.player.x<=arcade.WIDTH-8&&s.player.y<=arcade.HEIGHT-14);
 for(let i=0;i<200;i++)arcade.step(s,{dx:-999,dy:-999});
 assert(s.player.x>=8&&s.player.y>=40);
 const x=s.player.x;arcade.step(s,{dx:50,dy:0,focus:true});assert(s.player.x-x<=2.01);
 const y=s.player.x;arcade.step(s,{dx:50,dy:0});assert(s.player.x-y<=12.01&&s.player.x-y>2.01);
 assert.equal(arcade.createRun({difficulty:'nope'}).difficulty,'normal');
});

test('v38 the arcade page is separate from the story engine and reachable from the title',()=>{
 const root=path.join(__dirname,'..'),page=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),order=[...page.matchAll(/src="src\/([^"?]+)\.js/g)].map(m=>m[1]);
 assert.deepEqual(order,['audio-v37','arcade-v38','arcade-app-v38']);
 const sim=fs.readFileSync(path.join(root,'src/arcade-v38.js'),'utf8');
 assert.doesNotMatch(sim,/document\.|HapilCore|Math\.random|Date\.now|performance\./,'the simulation is self-contained and deterministic');
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/href="arcade\.html"/);
 for(const file of ['media/gunner.webp','media/boss.webp','media/horn.webp','media/balrog-idle.webp','media/forest.jpg','media/cave.webp','media/ruins.webp'])assert(fs.existsSync(path.join(root,file)),file);
});

function idle(difficulty){const s=arcade.createRun({difficulty,seed:1});s.stage='break';s.boss.leaving=false;s.stageTick=-100000;return s;}
function laser(s,patch){const l=Object.assign({x:-12,y:s.player.y,angle:0,width:20,warn:30,active:40,color:0,spin:0,follow:false,burst:false,age:0,grazed:false},patch);s.lasers.push(l);return l;}

test('v39 a laser is harmless while it warns, hits while lit, and leaves a gap beside it',()=>{
 const s=idle('normal'),l=laser(s,{});
 for(let i=0;i<29;i++)arcade.step(s,{dx:0,dy:0});
 assert.equal(s.player.hp,s.player.maxHp,'the warning line never hurts');
 arcade.step(s,{dx:0,dy:0});assert(s.events.includes('laserFire'));assert.equal(s.player.hp,s.player.maxHp-1,'the lit beam hits on its first tick');
 assert.equal(s.lasers.length,0,'a hit clears beams as well as bullets');
 const beside=idle('normal');laser(beside,{y:beside.player.y-20});
 for(let i=0;i<90;i++)arcade.step(beside,{dx:0,dy:0});
 assert.equal(beside.player.hp,beside.player.maxHp,'standing just outside the beam is safe');assert.equal(beside.graze,1,'and counts as one graze');
 assert.equal(beside.lasers.length,0,'the beam expires after its fade');
 const behind=idle('normal');laser(behind,{x:behind.player.x+60,y:behind.player.y});
 for(let i=0;i<60;i++)arcade.step(behind,{dx:0,dy:0});assert.equal(behind.player.hp,behind.player.maxHp,'a ray does not reach behind its origin');
});

test('v39 rotating beams turn only after they light, and a sword cut scatters rice bullets along its line',()=>{
 const s=idle('normal'),l=laser(s,{x:180,y:100,angle:0,spin:.3,warn:20,active:120});
 for(let i=0;i<20;i++)arcade.step(s,{dx:0,dy:0});assert.equal(l.angle,0);
 for(let i=0;i<60;i++)arcade.step(s,{dx:0,dy:0});assert(Math.abs(l.angle-.3)<.01,'one second of spin');
 const cut=idle('normal');laser(cut,{x:180,y:100,angle:Math.PI/2,warn:10,active:10,burst:true});
 for(let i=0;i<10;i++)arcade.step(cut,{dx:-12,dy:0});
 assert(cut.n>=8&&cut.n%2===0,'pairs of bullets: '+cut.n);for(let i=0;i<cut.n;i++){assert.equal(cut.bsize[i],3);assert(Math.abs(cut.bx[i]-180)<2);}
});

test('v39 a bubble bursts into a ring where it was',()=>{
 const s=idle('normal'),i=s.n++;s.bx[i]=100;s.by[i]=200;s.ba[i]=0;s.bs[i]=0;s.bage[i]=0;s.blife[i]=900;s.bsize[i]=4;s.bcolor[i]=5;s.bat[i]=5;s.bmode[i]=3;s.barg[i]=11;s.bs2[i]=60;s.bturn[i]=0;s.bacc[i]=0;s.bgrazed[i]=0;
 for(let k=0;k<5;k++)arcade.step(s,{dx:0,dy:0});
 assert.equal(s.n,11);assert(s.events.includes('pop'));for(let k=0;k<s.n;k++){assert.equal(s.bsize[k],0);assert.equal(s.bcolor[k],5);assert(Math.hypot(s.bx[k]-100,s.by[k]-200)<2);}
});

test('v39 each boss has its own laser signature and the difficulties are clearly apart',()=>{
 const seen={};
 for(const difficulty of ['gentle','normal','hell']){
  const s=arcade.createRun({difficulty,seed:21}),cards=arcade.CARDS.map(()=>({max:0,angles:new Set(),spin:false,sizes:new Set()}));
  for(let i=0;i<60000&&s.stage!=='won';i++){
   s.player.invulnerableUntil=s.tick+999;arcade.step(s,{dx:Math.sin(i/50)*3,dy:0});s.events.length=0;s.cancelled.length=0;
   const c=cards[s.cardIndex];c.max=Math.max(c.max,s.lasers.length);assert(s.lasers.length<=arcade.LASER_CAP);
   for(const l of s.lasers){c.angles.add(Math.round(((l.angle%Math.PI)+Math.PI)%Math.PI*100)/100);if(l.spin)c.spin=true;}
   if(i%20===0)for(let k=0;k<s.n;k++)c.sizes.add(s.bsize[k]);
  }
  assert.equal(s.stage,'won');seen[difficulty]=cards;
  const horizontal=0,vertical=1.57;
  assert.equal(cards[0].max,0);assert.equal(cards[3].max,0);assert.equal(cards[6].max,0,'the opening card of each boss is pure bullets');
  assert(cards[1].max>=2&&!cards[1].angles.has(horizontal)&&!cards[1].angles.has(vertical),'violet weaves diagonals');assert.equal(cards[1].angles.size,2,'in both directions');
  assert(cards[2].max>=1&&cards[2].sizes.has(3),'violet sword cuts leave rice bullets');
  assert(cards[4].max>=2);assert.deepEqual([...cards[4].angles],[vertical],'the horn demon drops vertical pillars only');
  assert(cards[5].sizes.has(4),'and spore bubbles');
  assert(cards[7].angles.has(horizontal)&&cards[7].angles.has(vertical)&&cards[7].angles.size===2,'balrog lays a horizontal and vertical grid');
  assert(cards[8].spin&&cards[8].max>=2,'and turns a wheel of beams');
 }
 for(const card of [1,2,4,7])assert(seen.gentle[card].max<seen.hell[card].max,'hell has more beams on card '+card);
 for(const card of [2,4,7])assert(seen.gentle[card].max<=seen.normal[card].max&&seen.normal[card].max<seen.hell[card].max,'beam count rises with difficulty on card '+card);
 const d=arcade.DIFFICULTY;
 assert(d.gentle.hp>d.normal.hp&&d.normal.hp>d.hell.hp);assert(d.gentle.speed<d.normal.speed&&d.normal.speed<d.hell.speed);
 assert(d.gentle.radius<d.normal.radius&&d.normal.radius<d.hell.radius);assert(d.gentle.hitScale<d.normal.hitScale&&d.normal.hitScale<=d.hell.hitScale);
 assert(d.gentle.density<d.normal.density&&d.normal.density<d.hell.density);assert(d.gentle.warn>d.normal.warn&&d.normal.warn>d.hell.warn);
 assert.equal(arcade.createRun({difficulty:'gentle'}).player.maxHp,6);assert.equal(arcade.createRun({difficulty:'hell'}).player.maxHp,3);
});
