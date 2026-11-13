'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const arcade=require('../src/arcade-v38.js');

// 맞아도 죽지 않게 체력만 되돌려 끝까지 돌린다. 전투 규칙 자체는 건드리지 않는다.
function play(difficulty,seed,options){
 options=options||{};const s=arcade.createRun({difficulty,seed}),peaks=[];let peak=0,card=0,events=0;
 for(let i=0;i<30000&&s.stage!=='won'&&s.stage!=='lost';i++){
  if(!options.mortal)s.player.hp=s.player.maxHp;
  const follow=options.follow?Math.max(-4,Math.min(4,s.boss.x-s.player.x)):Math.sin(i/45)*3;
  arcade.step(s,{dx:follow,dy:0});
  assert(s.n<=arcade.CAP);assert(s.events.length<=48);events+=s.events.length;s.events.length=0;s.cancelled.length=0;
  if(s.cardIndex!==card){peaks.push(peak);peak=0;card=s.cardIndex;}peak=Math.max(peak,s.n);
 }
 peaks.push(peak);return {s,peaks,events};
}
function digest(s){let h=0;for(let i=0;i<s.n;i++)h=(h*31+Math.round(s.bx[i]*8)+Math.round(s.by[i]*8)*7+s.bcolor[i])|0;return [s.tick,s.stage,s.cardIndex,s.n,s.score,s.graze,s.hits,s.rng,Math.round(s.player.x*100),h].join('|');}

test('v38 arcade run is deterministic for a seed and differs across seeds',()=>{
 const a=arcade.createRun({difficulty:'normal',seed:11}),b=arcade.createRun({difficulty:'normal',seed:11}),c=arcade.createRun({difficulty:'normal',seed:12});
 for(let i=0;i<5200;i++){const input={dx:Math.sin(i/30)*4,dy:Math.cos(i/70)*2};for(const s of [a,b,c]){s.player.hp=3;arcade.step(s,input);s.events.length=0;s.cancelled.length=0;}}
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
 assert(peak.gentle<peak.normal&&peak.normal<peak.hell,JSON.stringify(peak));
 assert(peak.normal>=350,'normal should fill the screen: '+peak.normal);assert(peak.hell<=arcade.CAP*.8,'hell keeps headroom under the cap');
});

test('v38 standing under the boss clears cards; hiding lets them time out',()=>{
 const under=play('normal',9,{follow:true}).s,away=arcade.createRun({difficulty:'normal',seed:9});
 assert(under.cleared>=5,'cleared '+under.cleared);
 // 주포가 닿지 않는 구석에서도 유도탄 덕분에 시간 안에 깰 수 있어야 한다.
 for(let i=0;i<30000&&away.stage!=='won';i++){away.player.hp=3;arcade.step(away,{dx:-4,dy:0});away.events.length=0;away.cancelled.length=0;}
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
 assert.equal(s.player.hp,3,'blooming bullet is harmless');
 arcade.step(s,{dx:0,dy:0});arcade.step(s,{dx:0,dy:0});assert.equal(s.player.hp,2,'it hits once it has formed');
 s.player.invulnerableUntil=0;s.events.length=0;const graze=s.graze;put(s.player.x+12,s.player.y,200);
 arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1);assert(s.events.includes('graze'));
 for(let i=0;i<30;i++)arcade.step(s,{dx:0,dy:0});assert.equal(s.graze,graze+1,'the same bullet never grazes twice');assert.equal(s.player.hp,2);
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
