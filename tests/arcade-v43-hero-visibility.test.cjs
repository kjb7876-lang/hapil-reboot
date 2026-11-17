'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),V=require('../src/arcade-hero-visibility-v43.js');
function run(hero='memory'){
 const s=A.createRun({hero,difficulty:'normal',seed:123});s.player.x=180;s.player.y=480;s.n=0;s.lasers=[];s.figures=[];return s;
}
function bullet(s,x,y,size=1,color=0){
 const i=s.n++;s.bx[i]=x;s.by[i]=y;s.bsize[i]=size;s.bcolor[i]=color;s.bage[i]=100;s.bgrace[i]=0;return i;
}

test('visibility helper loads independently in Node and browser with immutable constants',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/arcade-hero-visibility-v43.js'),'utf8'),context);
 assert.equal(context.HapilHeroVisibility.MIN_OPACITY,.34);assert(Object.isFrozen(V));assert.equal(V.target(null,A),1);
});

test('both heroes fade near a hostile edge and remain solid away from it',()=>{
 for(const hero of ['memory','seoha']){
  const s=run(hero);assert.equal(V.target(s,A),1);const i=bullet(s,s.player.x+20,s.player.y);
  assert.equal(V.target(s,A),V.MIN_OPACITY,hero);
  s.bx[i]=s.player.x+65;const middle=V.target(s,A);assert(middle>V.MIN_OPACITY&&middle<1,hero+' gradual distance band');
  s.bx[i]=s.player.x+200;assert.equal(V.target(s,A),1);
 }
});

test('large bubbles and enlarged props trigger by their rendered edge, not their center',()=>{
 const s=run();s.sizeScale=2.4;const i=bullet(s,s.player.x+70,s.player.y,0);
 const small=V.target(s,A);s.bsize[i]=4;const bubble=V.target(s,A);assert(bubble<small,'bubble perimeter reaches the hero earlier');
 const prop=A.PROPS.findIndex(p=>p.key==='sword-violet');s.bsize[i]=A.SHAPE_PROP;s.bcolor[i]=prop;s.bx[i]=s.player.x+100;
 assert.equal(V.target(s,A),V.MIN_OPACITY,'the enlarged sword already overlaps the reveal margin');
 s.sizeScale=1;assert(V.target(s,A)>V.MIN_OPACITY,'small version is further from the hero');
});

test('harmless birth and broken-fragment grace do not cause threat fading',()=>{
 const s=run(),i=bullet(s,s.player.x,s.player.y);s.bage[i]=A.BLOOM_TICKS-1;assert.equal(V.target(s,A),1);
 s.bfragment[i]=1;s.bage[i]=A.BLOOM_TICKS+1;s.bgrace[i]=s.bage[i]+1;assert.equal(V.target(s,A),1);
 s.bage[i]=s.bgrace[i];assert.equal(V.target(s,A),V.MIN_OPACITY);
 s.bx[i]=NaN;assert.equal(V.target(s,A),1,'invalid coordinates do not poison opacity');
});

test('only live laser geometry fades the hero; warnings, off phases and afterglow remain harmless',()=>{
 const s=run(),l={x:0,y:s.player.y,angle:0,width:18,warn:60,active:100,age:59};s.lasers.push(l);
 assert.equal(V.target(s,A),1);l.age=60;assert.equal(V.target(s,A),V.MIN_OPACITY);
 l.y=s.player.y-200;assert.equal(V.target(s,A),1);l.y=s.player.y;l.age=160;assert.equal(V.target(s,A),1);
 l.age=80;l.x=s.player.x+200;assert.equal(V.target(s,A),1,'beam does not extend backward from its origin');
 l.x=s.player.x-1200;assert.equal(V.target(s,A),1,'beyond the rendered beam end');
 s.lasers=[];s.tick=0;const f={kind:'zigzag',points:[0,s.player.y,360,s.player.y],width:14,warn:1,active:500,age:30};s.figures.push(f);
 assert.equal(A.figurePhase(f,s.tick),'on');assert.equal(V.target(s,A),V.MIN_OPACITY);
 s.tick=A.FIGURE_ON_TICKS+10;assert.equal(A.figurePhase(f,s.tick),'off');assert.equal(V.target(s,A),1,'darkened authored motif stays safe');
 s.tick=A.FIGURE_ON_TICKS+A.FIGURE_OFF_TICKS-5;assert.equal(A.figurePhase(f,s.tick),'charge');assert.equal(V.target(s,A),1);
});

test('opacity changes quickly near danger, recovers smoothly, and is frame-rate independent',()=>{
 function advance(start,wanted,hz,seconds){let current=start;for(let i=0;i<hz*seconds;i++)current=V.smooth(current,wanted,1/hz);return current;}
 const near60=advance(1,V.MIN_OPACITY,60,.5),near120=advance(1,V.MIN_OPACITY,120,.5);
 assert(near60<.35&&near60>=V.MIN_OPACITY);assert(Math.abs(near60-near120)<1e-12);
 const nearFrame=V.smooth(1,V.MIN_OPACITY,1/60);assert(nearFrame<1&&nearFrame>V.MIN_OPACITY,'no abrupt alpha jump');
 const recover=advance(near60,1,60,1);assert(recover>.99&&recover<1);assert(V.smooth(.5,1,0)===.5,'paused time does not advance opacity');
 assert.equal(V.smooth(NaN,NaN,0),1);assert(V.smooth(1,-5,1)>=V.MIN_OPACITY);
});

test('proximity rendering never changes the simulation state or consumes randomness',()=>{
 const s=run('seoha');bullet(s,s.player.x+60,s.player.y,4);s.lasers.push({x:0,y:440,angle:0,width:18,warn:1,active:100,age:20});
 const before=structuredClone(s);for(let i=0;i<120;i++)V.smooth(1,V.target(s,A),1/60);assert.deepEqual(s,before);
});

test('both hero clocks and local fields respect reveal opacity even when nested helpers set alpha',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/hero-memory-v43.js'),'utf8');
 for(const hero of ['memory','seoha'])for(const ink of [true,false]){
  const alphas=[],stack=[],g={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},arc(){},ellipse(){},stroke(){alphas.push(this.globalAlpha);},fill(){alphas.push(this.globalAlpha);}};
  const w={Image:function(){},HapilInk:{on:ink,raw(){}},HapilArcade:{clockState:()=> 'normal',slowField:()=>[60,.4]}};w.window=w;
  vm.runInNewContext(source,w);const s={hero,power:7,tick:0,player:{x:180,y:480,invulnerableUntil:0}};
  for(const method of ['clock','field']){
   alphas.length=0;w.HapilHeroFx[method](g,s,1,V.MIN_OPACITY);
   assert(alphas.length>0);assert(alphas.every(a=>a>=0&&a<=V.MIN_OPACITY+1e-12),hero+' '+method+' must not restore opaque layers');
   assert.equal(g.globalAlpha,1,'helper restores caller alpha');
  }
  s.tick=4;s.player.invulnerableUntil=100;alphas.length=0;w.HapilHeroFx.clock(g,s,1,V.MIN_OPACITY);
  assert(alphas.every(a=>a<=.45*V.MIN_OPACITY+1e-12),'invulnerability blink composes with proximity fading');
 }
});
