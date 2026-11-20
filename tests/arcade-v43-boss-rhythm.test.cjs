'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),R=require('../src/arcade-boss-rhythm-v43.js');
const first=R.ids.map(actor=>A.SEGMENTS.findIndex((g,i)=>g.actor===actor&&R.handles({rhythm:true,seg:i},g,A)));
const difficulties=['gentle','normal','hell'];

test('rhythm profiles cover all cinematic bosses, including the chairman, in Node and browser',()=>{
 const browser={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/arcade-boss-rhythm-v43.js'),'utf8'),browser);
 assert.equal(browser.HapilArcadeBossRhythm.ids.length,50);assert.equal(R.ids.length,50);assert(first.every(i=>i>=0));
 const cinematic=new Set(A.SEGMENTS.filter(g=>g.kind==='card'&&A.isCinematicBoss(g.actor,g.mid)).map(g=>g.actor));
 assert.deepEqual(new Set(R.ids),cinematic);assert.equal(R.families.length,6);
 assert(A.SEGMENTS[first[R.ids.indexOf('p2_chairman')]].mid);
 for(const actor of R.ids){const p=R.describe(actor,A);assert(p.motif&&p.name&&p.glyph);assert(R.families.includes(p.family));assert(p.colors.every(c=>A.PALETTE.includes(c)));assert(p.props.every(i=>A.PROPS[i]));assert.deepEqual(p.missingProps,[],actor+' has every authored prop');}
 for(const actor of ['__proto__','constructor','not-a-boss'])assert.equal(R.describe(actor,A),null);
});

test('only the first ordinary cinematic card is replaced; named attacks and opt-out stay authored',()=>{
 const seen=new Set();let count=0;
 A.SEGMENTS.forEach((g,i)=>{
  assert.equal(R.handles({seg:i},g,A),false);assert.equal(R.handles({seg:i,rhythm:false},g,A),false);
  const selected=R.handles({seg:i,rhythm:true},g,A);
  if(g.kind!=='card'||g.spell||!A.isCinematicBoss(g.actor,g.mid)){assert.equal(selected,false);return;}
  const k=g.stage+'|'+g.actor+'|'+!!g.mid;
  assert.equal(selected,!seen.has(k),k);seen.add(k);if(selected)count++;
 });
 assert.equal(count,53,'52 main boss visits and one cinematic midboss');
});

function trace(actor,difficulty){
 const rules=A.DIFFICULTY[difficulty],s={difficulty,rules,lasers:[],boss:{actor,x:180,y:156},player:{x:180,y:570}},shots=[],beams=[];
 const K={...A,spawn:(state,x,y,angle,speed,o)=>shots.push({tick:s.tick,x,y,angle,speed,...o}),beam:(state,x,y,angle,o)=>{const b={tick:s.tick,x,y,angle,...o,warn:Math.round(o.warn*rules.warn),width:o.width*rules.beam};state.lasers.push(b);beams.push(b);}};
 for(let t=0;t<R.CYCLE_TICKS*2;t++){s.tick=t;R.fire(s,t,K);}
 return {shots,beams,s};
}

test('all actors emit bounded spaced fans, fixed two-line warnings and genuine firing rests in every mode',()=>{
 for(const actor of R.ids)for(const difficulty of difficulties){
  const {shots,beams,s}=trace(actor,difficulty),p=R.describe(actor,A),easy=difficulty==='gentle',expected=p.props.length?(easy?3:5):(easy?4:7);
  assert.equal(shots.length,expected*6,actor+' '+difficulty);assert.equal(beams.length,4);
  for(const tick of [0,18,36,480,498,516]){
   const volley=shots.filter(b=>b.tick===tick);assert.equal(volley.length,expected);
   for(let i=1;i<volley.length;i++)assert(volley[i].angle-volley[i-1].angle>=.27,'separated fan spokes');
   for(const b of volley){assert.equal(b.speed,shots[0].speed,'following volleys never overtake');assert(b.life<=600);if(b.size===A.SHAPE_PROP)assert(A.PROPS[b.color]);else assert(A.PALETTE.includes(b.color));}
  }
  for(const b of beams){assert.equal(b.tick%480,84);assert(b.warn>=60);assert.equal(b.active,24);assert.equal(b.spin,0);assert.equal(b.follow,false);assert.equal(b.burst,false);assert(b.width<=8);}
  for(let t=84+Math.round(60*s.rules.warn)+24;t<480;t++){
   assert.equal(R.phase(t,s),'rest');assert(!shots.some(b=>b.tick===t));assert(!beams.some(b=>b.tick===t));
  }
  // Both thin rays may intersect, but their blocked intervals cannot form a
  // full-width wall in the lower playfield. This is geometry, not route proof.
  for(const y of [400,480,560,620]){
   const bands=beams.slice(0,2).map(b=>{const x=b.x+(y-b.y)/Math.tan(b.angle),half=(b.width*A.BEAM_HIT*.5+A.DIFFICULTY[difficulty].radius+4)/Math.abs(Math.sin(b.angle));return [Math.max(0,x-half),Math.min(A.WIDTH,x+half)];}).filter(b=>b[1]>b[0]).sort((a,b)=>a[0]-b[0]);
   let at=0,gap=0;for(const b of bands){gap=Math.max(gap,b[0]-at);at=Math.max(at,b[1]);}gap=Math.max(gap,A.WIDTH-at);assert(gap>=80,actor+' '+difficulty+' ray spacing');
  }
 }
});

test('normal and hell share every emitted bullet and laser geometry for all 50 actors',()=>{
 for(const actor of R.ids){const a=trace(actor,'normal'),b=trace(actor,'hell');assert.deepEqual(a.shots,b.shots,actor);assert.deepEqual(a.beams,b.beams,actor);}
});

test('actual engine runs all 300 actor/mode/viewport cases through finite first-card deadlines',tctx=>{
 // Invulnerability and a refilled boss HP deliberately isolate emission and
 // segment termination. This test makes no claim of a playable no-hit route.
 let cases=0,maxBullets=0;
 for(let k=0;k<first.length;k++)for(const difficulty of difficulties)for(const compact of [false,true]){
  const index=first[k],s=A.createRun({segment:index,difficulty,seed:44,pacing:true,rhythm:true,compact});s.bombs=0;
  let sawWarn=false,sawActive=false,peak=0,t=0;
  for(;s.seg===index&&t<1500;t++){
   s.player.invulnerableUntil=1e9;s.boss.hp=1e9;A.step(s,{});peak=Math.max(peak,s.n);
   for(const b of s.lasers){if(b.age<b.warn)sawWarn=true;if(b.age>=b.warn&&b.age<b.warn+b.active)sawActive=true;assert(b.warn>=60);}
  }
  assert.notEqual(s.seg,index,R.ids[k]+' '+difficulty+' must leave the card');assert(t<1500);
  assert(sawWarn&&sawActive,R.ids[k]+' '+difficulty+' laser visible before deadline');
  assert.equal(s.dropped,0);assert(peak<=160,'bounded actual field including terrain: '+R.ids[k]+' '+difficulty+' '+peak);
  assert.equal(s.autoBombs,0);assert.equal(s.distorts,0);maxBullets=Math.max(maxBullets,peak);cases++;
 }
 assert.equal(cases,300);assert(maxBullets>0);
 tctx.diagnostic('300 actual first-card runs; peak live bullets including terrain='+maxBullets+'; all warned/activated; no cap drops. Invulnerability is emission-test-only.');
});

test('explicit disabled rhythm preserves the default deterministic engine run',()=>{
 const a=A.createRun({seed:52}),b=A.createRun({seed:52,rhythm:false});
 for(let t=0;t<900;t++){a.player.invulnerableUntil=b.player.invulnerableUntil=1e9;const input={dx:Math.sin(t*.03)*2,focus:t%90<45};A.step(a,input);A.step(b,input);}
 assert.deepEqual(a,b);
});
