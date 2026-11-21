'use strict';
/* Execute the real app event handlers with a small DOM double. The game engine is real;
   only rendering/boot and platform audio are omitted. This does not require Chromium. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const A=require('../src/arcade-v43.js'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function harness(saved){
  const nodes=new Map(),storage=Object.assign({},saved),storageWrites=[],calls=[],globals={},strokes=[],imageDraws=[];let pen=[],dash=[];const stack=[];
  const ctx=new Proxy({globalAlpha:1,lineWidth:1,
    beginPath(){pen=[];},moveTo(...v){pen.push(['moveTo',...v]);},lineTo(...v){pen.push(['lineTo',...v]);},arc(...v){pen.push(['arc',...v]);},setLineDash(v){dash=v;},
    stroke(){strokes.push({alpha:this.globalAlpha,width:this.lineWidth,points:pen.map(p=>p.slice()),dash:dash.slice()});},
    fillText(text){calls.push(['fillText',text]);},
    drawImage(img){imageDraws.push({source:img&&img.src,alpha:this.globalAlpha});},
    save(){stack.push({globalAlpha:this.globalAlpha,lineWidth:this.lineWidth});},restore(){Object.assign(this,stack.pop()||{});},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8ClampedArray(64)}),measureText:()=>({width:5})},{get:(o,k)=>k in o?o[k]:()=>{}});
  function element(id,tag='DIV'){
    const listeners={},attrs={};
    return {id,tagName:tag,hidden:false,disabled:false,style:{setProperty(k,v){this[k]=v;}},dataset:{},textContent:'',value:'',checked:false,captured:new Set(),listeners,attrs,
      getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:360,height:640,right:360,bottom:640}),classList:{toggle(){},contains(){return false;}},
      addEventListener(k,f){(listeners[k]||(listeners[k]=[])).push(f);},
      emit(k,e={}){const ev=Object.assign({target:this,button:0,pointerId:1,clientX:180,clientY:400,detail:1,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}},e);for(const f of listeners[k]||[])f.call(this,ev);return ev;},
      setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute:k=>attrs[k],appendChild(){},remove(){},focus(){doc.activeElement=this;},
      click(){this.emit('click',{detail:0});},closest(sel){return sel.split(',').some(x=>x.trim().toUpperCase()===tag)?this:null;},
      setPointerCapture(id){this.captured.add(id);},releasePointerCapture(id){this.captured.delete(id);this.emit('lostpointercapture',{pointerId:id});}};
  }
  const html=read('arcade.html');for(const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g))nodes.set(m[2],element(m[2],m[1].toUpperCase()));
  // The picker creates this screen dynamically during boot; these app tests stub only its UI controller.
  nodes.set('arcade-hero-select',element('arcade-hero-select','SECTION'));
  const doc=element('document');doc.getElementById=id=>nodes.get(id)||null;doc.querySelectorAll=()=>[];doc.createElement=tag=>element('',tag.toUpperCase());doc.hidden=false;
  const audio={unlock:()=>calls.push(['unlock']),reset:()=>calls.push(['reset']),setEnabled:v=>calls.push(['sfx',v]),setVolume:v=>calls.push(['sfxVolume',v]),suspend:v=>calls.push(['suspend',v]),play:(...x)=>calls.push(['play',...x])};
  const w={document:doc,HapilArcade:A,innerWidth:390,innerHeight:844,devicePixelRatio:1,performance:{now:()=>0},location:{search:''},
    localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v;storageWrites.push({key:k,value:v});},removeItem:k=>{delete storage[k];}},
    HapilMusic:{update:(...a)=>calls.push(['musicUpdate',...a]),setEnabled:v=>calls.push(['music',v]),setVolume:v=>calls.push(['musicVolume',v]),unlock:()=>calls.push(['musicUnlock'])},
    addEventListener:(k,f)=>{(globals[k]||(globals[k]=[])).push(f);},requestAnimationFrame(){},setTimeout(){},Image:class{},};w.window=w;
  const sandbox=vm.createContext(w);vm.runInContext(read('src/arcade-i18n-v43.js'),sandbox);vm.runInContext(read('src/arcade-story-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-heroes-v43.js'),sandbox);vm.runInContext(read('src/arcade-mobile-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-skins-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-hero-visibility-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-boss-intros-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-boss-lines-v43.js'),sandbox);
  // Skip only browser boot. Expose the closed-over real handlers to install them on the DOM double.
  const script=read('src/arcade-app-v43.js').replace(/  boot\(\);\s*\}\)\(window\);\s*$/,`  global.controlsTest={bind:bind,input:inputForStep,load:loadSettings,apply:applySettings,mode:setMode,
    prepare:function(s,a){state=s;fx=a;mode='playing';},loadProgress:loadProgress,picker:function(p){heroPicker=p;},manifest:function(m){manifest=m;},settings:function(){return settings;},finger:function(){return finger;},quality:function(){return lite;},drawFigures:drawFigures,drawRunes:drawRunes,frame:frame,consume:consume,beginStory:beginStory,nextStory:nextStory,
    drawBossIntro:drawBossIntro,seedVisuals:function(){particles.push({});drifts.push({});flashes.push({});casts.push({});emblems.push({});bombQueued=true;},visualCounts:function(){return [particles.length,drifts.length,flashes.length,casts.length,emblems.length];},defeatVisual:function(){return {actor:fall&&fall.actor,flash:flash};},storyEntry:function(){return story&&story.entry;},heroImages:function(){['memory','seoha','seoha-b'].forEach(function(id){var p=Heroes.get(id);images[id==='memory'?'gunner':'hero-'+id]={src:p.sprite,width:256,height:512};});}};
})(window);`);
  assert(script.includes('global.controlsTest='));vm.runInContext(script,sandbox);
  const h=w.controlsTest,s=A.createRun({difficulty:'hell',seed:77});s.stage='break';s.stageTick=-100000;
  h.prepare(s,audio);h.bind();
  return {w,h,s,doc,nodes,storage,storageWrites,calls,globals,audio,strokes,imageDraws};
}
test('stage asset lists prefer front-facing mobs and use scene art when it is missing',()=>{
  const {w}=harness();
  const registry=w.ArcadeSkins,stageKeys=w.HapilArcadeApp.debugState().stageKeys;
  for(const stage of A.STAGES){
    const front=registry.front[stage.scene]||[],regional=registry.scenes[stage.scene]||[];
    const expected=front.length?front:regional.length?regional:stage.cast;
    const possible=new Set([...stage.cast,...regional,...front]);
    const actors=new Set(A.SEGMENTS.filter(g=>g.stage===stage.index&&g.kind==='card').map(g=>g.actor));
    const actual=Array.from(stageKeys(stage.index)).filter(key=>possible.has(key)&&!actors.has(key));
    assert.deepEqual(new Set(actual),new Set(Array.from(expected).filter(key=>!actors.has(key))),stage.scene);
  }
});
function pickerFor(h){
  const picker={visible:false,shown:0,selected:null,confirmCallback:null,cancelCallback:null,
    show(id,confirm,cancel){this.visible=true;this.shown++;this.selected=id;this.confirmCallback=confirm;this.cancelCallback=cancel;},
    hide(){this.visible=false;},confirm(id){const callback=this.confirmCallback;this.hide();callback(id);},cancel(){const callback=this.cancelCallback;this.hide();callback();}};
  h.picker(picker);return picker;
}

test('a new phone starts on Easy and restores the difficulty from saves and active checkpoints',()=>{
 const main='hapil-arcade-save-v43',backup=main+'-bak',cp='hapil-arcade-checkpoint-v43';
 const checkpoint={v:1,stage:0,seg:1,difficulty:'hell',at:Date.now()};
 for(const [saved,want] of [[{},'gentle'],[{[main]:JSON.stringify({difficulty:'normal'})},'normal'],
   [{[main]:'{',[backup]:JSON.stringify({progress:{difficulty:'hell'}})},'hell'],
   [{[cp]:JSON.stringify(checkpoint)},'hell'],[{[cp]:JSON.stringify({...checkpoint,at:0})},'gentle']]){
   const {h,w}=harness(saved);h.loadProgress();assert.equal(w.HapilArcadeApp.debugState().progress.difficulty,want);
 }
});

test('new game waits for hero confirmation, cancel leaves no run, and Seoha confirmation and retry preserve the chosen hero',()=>{
 const {h,w,nodes,storage,audio}=harness(),picker=pickerFor(h);h.prepare(null,audio);h.mode('title');
 nodes.get('arcade-start').click();assert.equal(w.HapilArcadeApp.getState().mode,'hero');assert.equal(picker.selected,'memory');
 assert.equal(w.HapilArcadeApp.debugState().state,null);h.frame(1000);h.frame(1100);assert.equal(w.HapilArcadeApp.debugState().state,null,'selection never advances a run');
 picker.cancel();assert.equal(w.HapilArcadeApp.getState().mode,'title');assert.equal(w.HapilArcadeApp.debugState().state,null);
 assert.equal(storage['hapil-arcade-hero-v43'],undefined);assert.equal(storage['hapil-arcade-journey-hero-v43'],undefined);
 nodes.get('arcade-start').click();picker.confirm('seoha');let s=w.HapilArcadeApp.debugState().state;
 assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(s.hero,'seoha');assert.equal(s.rhythm,true,'the real new-game flow enables cinematic boss rhythms');assert.equal(s.stageIndex,0);assert.equal(s.tick,0);assert.equal(picker.visible,false);
 assert.equal(w.HapilArcadeApp.getState().oneCreditEligible,true,'confirmed new game starts a one-credit journey');
 assert.equal(storage['hapil-arcade-hero-v43'],'seoha');assert.equal(storage['hapil-arcade-journey-hero-v43'],'seoha');
 const prior=s;nodes.get('arcade-retry').dataset.stage='0';nodes.get('arcade-retry').click();s=w.HapilArcadeApp.debugState().state;
 assert.notEqual(s,prior);assert.equal(s.hero,'seoha');assert.equal(s.tick,0);assert.equal(picker.shown,2,'retry does not ask for a new hero');
 assert.equal(w.HapilArcadeApp.getState().oneCreditEligible,false,'retrying stage zero is practice, not a new one-credit journey');
});

test('continue restores the checkpoint hero and growth instead of the currently selected hero',()=>{
 const cp={v:1,stage:0,seg:A.STAGES[0].first+1,difficulty:'normal',at:Date.now(),hero:'seoha',hits:2,bombs:1,exp:500,fills:20};
 const {h,w,nodes,storage}=harness({'hapil-arcade-checkpoint-v43':JSON.stringify(cp),'hapil-arcade-hero-v43':'memory','hapil-arcade-journey-hero-v43':'memory'}),picker=pickerFor(h);
 nodes.get('arcade-continue').click();const s=w.HapilArcadeApp.debugState().state;
 assert.equal(s.hero,'seoha');assert.equal(s.seg,cp.seg);assert.equal(s.hits,2);assert.equal(s.bombsUsed,1);assert.equal(s.exp,500);assert.equal(s.fills,20);
 assert.equal(s.paced,true);assert.equal(picker.shown,0);assert.equal(storage['hapil-arcade-journey-hero-v43'],'seoha');
 assert.equal(w.HapilArcadeApp.getState().oneCreditEligible,false,'checkpoint continuation is practice');
});

test('legacy checkpoints and journeys default to Memory while a saved Seoha journey continues without selection',()=>{
 const old={v:1,stage:0,seg:A.STAGES[0].first+1,difficulty:'normal',at:Date.now(),hits:0,bombs:0,exp:0,fills:0};
 const cases=[
  {saved:{'hapil-arcade-checkpoint-v43':JSON.stringify(old),'hapil-arcade-hero-v43':'seoha','hapil-arcade-journey-hero-v43':'seoha'},want:'memory'},
  {saved:{'hapil-arcade-hero-v43':'seoha'},want:'memory'},
  {saved:{'hapil-arcade-hero-v43':'memory','hapil-arcade-journey-hero-v43':'seoha'},want:'seoha'}
 ];
 for(const c of cases){const {h,w,nodes}=harness(c.saved),picker=pickerFor(h);nodes.get('arcade-continue').click();assert.equal(w.HapilArcadeApp.debugState().state.hero,c.want);assert.equal(picker.shown,0);assert.equal(w.HapilArcadeApp.getState().oneCreditEligible,false,'stage-zero continuation remains practice even without a checkpoint');}
});

test('Seoha A retains its saved identity and original art while B selection, retry and checkpoint stay B',()=>{
 const a=harness({'hapil-arcade-hero-v43':'seoha','hapil-arcade-journey-hero-v43':'seoha'});
 assert.equal(a.w.HapilArcadeHeroes.get('seoha').id,'seoha');assert.match(a.w.HapilArcadeHeroes.get('seoha').portrait,/\/seoha-portrait\.webp$/);assert.match(a.w.HapilArcadeHeroes.get('seoha').sprite,/\/seoha-player\.webp$/);
 a.nodes.get('arcade-continue').click();assert.equal(a.w.HapilArcadeApp.debugState().state.hero,'seoha');
 const b=harness(),picker=pickerFor(b.h);b.nodes.get('arcade-start').click();picker.confirm('seoha-b');
 assert.equal(b.w.HapilArcadeApp.debugState().state.hero,'seoha-b');assert.equal(b.storage['hapil-arcade-hero-v43'],'seoha-b');assert.equal(b.storage['hapil-arcade-journey-hero-v43'],'seoha-b');
 assert.match(b.w.HapilArcadeHeroes.get('seoha-b').portrait,/\/seoha-portrait-v2\.webp$/);assert.match(b.w.HapilArcadeHeroes.get('seoha-b').sprite,/\/seoha-player-v2\.webp$/);
 b.nodes.get('arcade-retry').dataset.stage='0';b.nodes.get('arcade-retry').click();const s=b.w.HapilArcadeApp.debugState().state;assert.equal(s.hero,'seoha-b');
 s.started=true;s.seg=A.STAGES[0].first+1;s.stage='wave';b.w.HapilMobile.tick(s,'playing',16);
 assert.equal(b.w.HapilMobile.checkpoint(0,'normal').hero,'seoha-b');
 const resumed=harness({...b.storage,'hapil-arcade-hero-v43':'memory'});resumed.nodes.get('arcade-continue').click();assert.equal(resumed.w.HapilArcadeApp.debugState().state.hero,'seoha-b');
});

test('actual sprite drawing fades all three heroes near enemy bullets, freezes opacity on pause, and restores it afterward',()=>{
 for(const hero of ['memory','seoha','seoha-b']){
  const {h,w,s,imageDraws}=harness();s.hero=hero;s.player.invulnerableUntil=0;h.heroImages();
  const sprite=w.HapilArcadeHeroes.get(hero).sprite,alpha=()=>imageDraws.filter(d=>d.source===sprite).at(-1).alpha;
  h.frame(1000);h.frame(1100);const far=alpha();assert.equal(far,.95,hero+' clear sprite');
  s.n=1;s.bx[0]=s.player.x+20;s.by[0]=s.player.y;s.bs[0]=0;s.bage[0]=100;s.blife[0]=1000;s.bsize[0]=1;s.bcolor[0]=0;
  for(let t=1200;t<=1800;t+=100)h.frame(t);const near=alpha();assert(near<far*.45&&near>.1,hero+' real draw uses reduced opacity');assert.equal(s.hits,0);
  h.mode('paused');s.n=0;h.frame(1900);h.frame(2000);assert.equal(alpha(),near,'paused opacity stays fixed');
  h.mode('playing');for(let t=2100;t<=3100;t+=100)h.frame(t);assert(alpha()>.94,hero+' clears back to full opacity');
 }
});

test('two-finger movement + held focus really changes engine speed; release/cancel belongs to its pointer',()=>{
  const {h,s,nodes}=harness(),stage=nodes.get('arcade-stage'),canvas=nodes.get('arcade-canvas'),focus=nodes.get('arcade-focus');
  s.player.x=100;s.player.y=500;
  stage.emit('pointerdown',{pointerId:11,target:canvas,clientX:300,clientY:564});
  A.step(s,h.input());const fast=s.player.x-100;assert.equal(fast,12);
  focus.emit('pointerdown',{pointerId:22});assert(focus.captured.has(22));assert.equal(focus.attrs['aria-pressed'],'true');
  focus.emit('pointerleave',{pointerId:22}); // finger slips off the visible button while still pressed
  focus.emit('pointerup',{pointerId:99}); // a different finger must not release focus
  const before=s.player.x;A.step(s,h.input());assert.equal(s.player.x-before,2);assert.equal(s.player.focus,true);
  focus.emit('pointercancel',{pointerId:22});assert.equal(h.input().focus,false);assert.equal(focus.attrs['aria-pressed'],'false');
  assert.equal(h.finger().active,true,'movement finger survives cancellation of the focus finger');
  stage.emit('lostpointercapture',{pointerId:11});assert.equal(h.input().dx,0);assert.equal(h.finger().id,null);
});

test('phone drags start in place, scale small corrections and change direction without overshoot',()=>{
  const {h,nodes,audio}=harness(),stage=nodes.get('arcade-stage'),canvas=nodes.get('arcade-canvas');
  for(const [hero,union] of [['memory',false],['seoha',false],['seoha-b',false],['seoha',true]]){
    const s=A.createRun({hero,compact:true,entranceAll:true,ability:0});s.union=union;
    s.stage='break';s.stageTick=-10000;s.player.x=100;s.player.y=400;h.prepare(s,audio);
    const touch=(type,x,y)=>stage.emit(type,{target:canvas,pointerType:'touch',pointerId:11,clientX:x,clientY:y});
    const step=()=>A.step(s,h.input());
    touch('pointerdown',10,280);step();assert.deepEqual([s.player.x,s.player.y],[100,400]);
    touch('pointermove',15,280);step();assert(Math.abs(s.player.x-104.4)<1e-8);
    const x=s.player.x;touch('pointermove',200,280);step();assert(Math.abs(s.player.x-x-10.2)<1e-8,'drag speed cap');
    const peak=s.player.x;touch('pointermove',198,280);step();assert(Math.abs(peak-s.player.x-1.76)<1e-8);
    const focus=nodes.get('arcade-focus');focus.emit('pointerdown',{pointerId:22});const before=s.player.x;
    touch('pointermove',199,280);step();assert(Math.abs(s.player.x-before-.60)<1e-8);
    const focused=s.player.y;touch('pointermove',199,639);step();assert(Math.abs(s.player.y-focused-1.7)<1e-8);
    focus.emit('pointerup',{pointerId:22});for(let t=0;t<40;t++)step();
    touch('pointerup',199,639);const y=s.player.y;
    touch('pointerdown',330,100);step();assert.equal(s.player.y,y,'regrip never jumps');
    touch('pointermove',330,639);for(let t=0;t<60;t++)step();assert.equal(s.player.y,A.HEIGHT-14);
    touch('pointercancel',330,639);assert.equal(h.input().dx,0);assert.equal(h.input().dy,0);
  }
});

test('holding a tap that dismisses a boss speech never starts a movement drag',()=>{
  const {h,nodes,audio}=harness(),stage=nodes.get('arcade-stage'),canvas=nodes.get('arcade-canvas');
  const index=A.SEGMENTS.findIndex(g=>g.kind==='card'&&!g.mid);
  const s=A.createRun({segment:index,entranceAll:true});h.prepare(s,audio);
  for(let t=0;t<400;t++){
    const phase=A.entrancePhase(s);if(phase&&phase.phase==='speech'&&phase.t>.3)break;
    A.step(s,{});
  }
  const ready=s.bossEntrance.readyTick,start=[s.player.x,s.player.y];
  const tap=stage.emit('pointerdown',{pointerId:42,target:canvas,clientX:20,clientY:220});
  assert.ok(tap.prevented&&s.bossEntrance.readyTick<ready,'speech dismissal succeeded');
  stage.emit('pointermove',{pointerId:42,clientX:40,clientY:180});
  for(let t=0;t<30;t++)A.step(s,h.input());
  assert.equal(s.stage,'card');assert.deepEqual([s.player.x,s.player.y],start);
  assert.equal(stage.captured.has(42),false);
  stage.emit('pointerdown',{pointerId:43,target:canvas,clientX:20,clientY:220});
  assert.ok(h.input().dx<0,'a new movement gesture works in combat');
});

test('bomb touch is a one-shot input while another pointer moves; keyboard/assistive click also works',()=>{
  const {h,s,nodes}=harness(),stage=nodes.get('arcade-stage'),bomb=nodes.get('arcade-bomb'),canvas=nodes.get('arcade-canvas');
  stage.emit('pointerdown',{pointerId:11,target:canvas,clientX:250,clientY:580});
  bomb.emit('pointerdown',{pointerId:33});const input=h.input();assert.equal(input.bomb,true);assert.notEqual(input.dx,0);
  const bombs=s.bombs;A.step(s,input);assert.equal(s.bombs,bombs-1);assert.equal(h.input().bomb,false,'not repeated while held');
  bomb.emit('click',{detail:1});assert.equal(h.input().bomb,false,'compatibility click does not double fire');
  bomb.emit('click',{detail:0});assert.equal(h.input().bomb,true,'keyboard or accessibility activation');
  h.mode('paused');bomb.emit('pointerdown',{pointerId:44});assert.equal(h.input().bomb,false,'hidden controls cannot queue a bomb while paused');
});

test('Esc opens settings once, repeat does not resume, and paused inputs do not leak into the resumed game',()=>{
  const {h,w,doc,nodes,calls}=harness();doc.emit('keydown',{key:'ArrowRight'});doc.emit('keydown',{key:'Shift'});assert(h.input().dx>0);
  doc.emit('keydown',{key:'Escape'});assert.equal(w.HapilArcadeApp.getState().mode,'paused');assert.equal(nodes.get('arcade-pause').hidden,false);
  assert.equal(doc.activeElement.id,'arcade-resume');assert(calls.some(x=>x[0]==='suspend'&&x[1]===true));
  doc.emit('keydown',{key:'Escape',repeat:true});assert.equal(w.HapilArcadeApp.getState().mode,'paused');
  doc.emit('keydown',{key:'ArrowRight'});doc.emit('keydown',{key:'x'});doc.emit('keydown',{key:'Escape'});
  const input=h.input();assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(input.dx,0);assert.equal(input.focus,false);assert.equal(input.bomb,false);
  assert(calls.some(x=>x[0]==='suspend'&&x[1]===false));
});

test('space and arrows on paused form controls keep the menu open instead of triggering global game shortcuts',()=>{
  const {h,w,doc,nodes}=harness();h.mode('paused');const slider=nodes.get('setting-musicVolume');
  const space=doc.emit('keydown',{key:' ',target:slider});const arrow=doc.emit('keydown',{key:'ArrowLeft',target:slider});
  assert.equal(w.HapilArcadeApp.getState().mode,'paused');assert(!space.prevented);assert(!arrow.prevented);
});

test('BGM and SFX controls are independent, zero volume is preserved, changes save without resuming',()=>{
  const {h,w,nodes,calls,storage}=harness();h.mode('paused');
  const bgm=nodes.get('setting-music'),sfx=nodes.get('setting-sfxVolume');bgm.checked=false;bgm.emit('change');sfx.value='0';sfx.emit('input');
  assert.equal(w.HapilArcadeApp.getState().mode,'paused');assert.equal(h.settings().music,false);assert.equal(h.settings().sfx,true);assert.equal(h.settings().sfxVolume,0);
  assert(calls.some(x=>x[0]==='music'&&x[1]===false));assert(calls.some(x=>x[0]==='sfxVolume'&&x[1]===0));
  const saved=JSON.parse(storage['hapil-arcade-settings-v43']);assert.equal(saved.music,false);assert.equal(saved.sfxVolume,0);
  const next=harness(storage);next.h.load();next.h.apply(false);assert.equal(next.h.settings().music,false);assert.equal(next.nodes.get('setting-sfxVolume').value,'0');assert.equal(next.nodes.get('value-sfxVolume').textContent,'0%');
});

test('the hit sound checkbox restores a saved preference',()=>{
  const {h,nodes,storage}=harness();h.apply(false);
  const hitSound=nodes.get('setting-hitSound');
  assert.equal(hitSound.checked,true);
  hitSound.checked=false;hitSound.emit('change');
  assert.equal(JSON.parse(storage['hapil-arcade-settings-v43']).hitSound,false);
  const next=harness(storage);next.h.load();next.h.apply(false);
  assert.equal(next.nodes.get('setting-hitSound').checked,false);
});

test('blur and background pause clear captured touch controls and queued actions',()=>{
  const {h,w,doc,nodes,globals}=harness(),stage=nodes.get('arcade-stage'),focus=nodes.get('arcade-focus');
  stage.emit('pointerdown',{pointerId:1,target:nodes.get('arcade-canvas')});focus.emit('pointerdown',{pointerId:2});nodes.get('arcade-bomb').emit('pointerdown',{pointerId:3});
  globals.blur[0]();assert.equal(w.HapilArcadeApp.getState().mode,'paused');assert.equal(stage.captured.size,0);assert.equal(focus.captured.size,0);assert.equal(h.input().bomb,false);assert.equal(h.input().focus,false);
  h.mode('playing');doc.hidden=true;doc.emit('visibilitychange');assert.equal(w.HapilArcadeApp.getState().mode,'paused');
});

test('invalid persisted values are bounded; reduced-shake and graphics settings load',()=>{
  const {h}=harness({'hapil-arcade-settings-v43':JSON.stringify({musicVolume:7,sfxVolume:-1,music:'false',screenShake:false,lowQuality:true})});h.load();
  assert.equal(h.settings().inkRedShots,true,'older settings without a palette use vermilion');assert.equal(h.settings().music,true);assert.equal(h.settings().musicVolume,1);assert.equal(h.settings().sfxVolume,0);assert.equal(h.settings().screenShake,false);assert.equal(h.quality(),true);
});


test('glyph laser off and recharge frames keep every segment, with a faint safe phase and a gradual recharge',()=>{
  const {h,s,strokes}=harness(),f={kind:'glyph',glyph:'hexagram',cx:180,cy:180,r:140,turn:.2,width:7,color:2,age:150,warn:60,active:400};s.figures=[f];
  const render=t=>{s.tick=t;strokes.length=0;h.drawFigures(s,false);return strokes.map(x=>({...x,points:x.points.map(p=>p.slice())}));};
  const on=render(20),off=render(90),chargeStart=render(132),chargeEnd=render(149);
  assert(on.length>off.length);assert.equal(off.length,1);assert(off[0].alpha>0&&off[0].alpha<=.2,'full safe shape stays faintly visible');
  for(const frame of [on,off,chargeStart,chargeEnd])for(const stroke of frame)assert.deepEqual(stroke.points,off[0].points,'no lines removed to make a dodge hole');
  assert(Math.max(...on.map(x=>x.alpha))>Math.max(...off.map(x=>x.alpha)));
  assert(chargeEnd[0].alpha>chargeStart[0].alpha,'charging brightens gradually');
});

test('rune off frames retain complete authored ring geometry and letters without a damaging-looking bright band',()=>{
  const {h,s,strokes}=harness(),f={kind:'runes',cx:180,cy:190,rings:[{r:150,n:3,gap:.62,dir:1,phase:0}],fit:1,grow:1,turn:.2,width:24,color:2,age:150,warn:60,active:400};
  const render=t=>{s.tick=t;strokes.length=0;h.drawRunes(s,f);return strokes.map(x=>({...x,points:x.points.map(p=>p.slice())}));};
  const on=render(20),off=render(90);assert(on.length>0);assert.equal(off.length,on.length,'off preserves all ring strokes');
  assert.deepEqual(off.map(x=>x.points),on.map(x=>x.points));assert(Math.max(...off.map(x=>x.alpha))<=.2);assert(Math.max(...on.map(x=>x.alpha))>.8);
});


test('spider midboss enters normally; mainboss cut-in runs before Violet spawns and freezes impact and memory',()=>{
 const {h,w,nodes,calls,audio,storage}=harness({'hapil-arcade-story-seen-20261117':'{"1":true}'});
 const mid=A.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&g.mid),main=A.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid);
 const s=A.createRun({difficulty:'normal',seed:77,segment:mid,pacing:true});h.prepare(s,audio);nodes.get('story-auto').checked=false;
 let stamp=1000;const frame=(dt=20)=>{stamp+=dt;h.frame(stamp);};frame();
 for(let i=0;i<150&&s.stage!=='card';i++){frame();assert.equal(w.HapilArcadeApp.getState().mode,'playing','midboss does not open a story');}
 assert.equal(s.boss.actor,A.SEGMENTS[mid].actor);assert.equal(s.boss.mid,true);assert.equal(s.stage,'card');
 for(let i=0;i<150&&w.HapilArcadeApp.getState().mode==='playing';i++){if(s.stage==='card')s.boss.hp=0;frame();}
 const view=w.HapilArcadeApp.getState();assert.equal(view.mode,'story');assert.equal(view.story.phase,'impact');assert.equal(view.story.actor,'violet');
 assert.equal(s.seg,main);assert.equal(s.stage,'intro');assert.equal(s.stageTick,0);assert.equal(s.boss.actor,A.SEGMENTS[mid].actor,'the outgoing midboss still owns engine boss state');
 assert.equal(s.boss.mid,true);assert(s.boss.leaving);assert.notEqual(s.boss.actor,'violet','main boss has not spawned');
 assert.equal(nodes.get('story-boss-name').textContent,A.ACTORS.violet.name);assert.equal(nodes.get('story-portrait').attrs['aria-label'],A.ACTORS.violet.name);
 assert.notEqual(nodes.get('story-boss-role').textContent,'storyMainBoss','the role is localized player-facing text');
 assert.match(nodes.get('story-portrait').style.backgroundImage,/boss01-purple-sword-spider-angel-cutin\.webp/);
 assert.equal(nodes.get('story-text').textContent,w.HapilArcadeStory.getStage(1).lines[0].text);
 const clocks=()=>({tick:s.tick,stageTick:s.stageTick,segTick:s.segTick,hp:s.player.hp,px:s.player.x,py:s.player.y,bx:s.boss.x,by:s.boss.y,n:s.n,floor:s.floor.t});
 const frozen=clocks();for(let i=0;i<12;i++)frame();assert.equal(w.HapilArcadeApp.getState().story.phase,'impact');assert.deepEqual(clocks(),frozen);
 h.nextStory();assert.equal(w.HapilArcadeApp.getState().story.phase,'memory');for(let i=0;i<12;i++)frame();assert.deepEqual(clocks(),frozen);
 nodes.get('story-skip').click();assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(JSON.parse(storage['hapil-arcade-boss-seen-v4'])['1:violet'],true);
 frame(10000);assert.equal(s.tick,frozen.tick,'reading time does not cause catch-up steps');
 for(let i=0;i<150&&s.boss.actor!=='violet';i++){frame();assert.equal(w.HapilArcadeApp.getState().mode,'playing');}
 assert.equal(s.boss.actor,'violet');assert.equal(s.boss.mid,false);assert.equal(s.boss.present,true);assert.equal(s.stage,'intro');
 assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='bossCutin').length,1,'one cut-in cue, no repeat at actual entrance');
 assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='warning').length,1,'only the midboss uses the regular entrance warning');
});

test('main-boss cut-in clears combat residue and its 120-tick attack lock starts at actual entrance, including seen stories',()=>{
 const main=A.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid),mid=A.SEGMENTS.find(g=>g.stage===1&&g.kind==='card'&&g.mid);
 for(const seen of [false,true]){
  const saved=seen?{'hapil-arcade-boss-seen-v4':'{"1:violet":true}'}:undefined,{h,w,nodes,audio,calls}=harness(saved);
  const s=A.createRun({difficulty:'hell',seed:43,segment:main,pacing:true});h.prepare(s,audio);
  Object.assign(s.boss,{actor:mid.actor,name:A.ACTORS[mid.actor].name,mid:true,present:true,leaving:true,y:100});
  s.n=s.sn=1;s.bx[0]=s.player.x;s.by[0]=s.player.y;s.bage[0]=100;s.blife[0]=1000;s.bsize[0]=1;
  for(const key of ['mobs','lasers','figures','ripples','cancelled','drifted','pops','zaps'])s[key].push({});
  s.risers=[{}];s.bombPulse={};s.pulseInfo={};s.lastBomb={};s.riserDue=2;s.riserT=200;s.riserN=4;
  s.floor.grid.fill(1);s.floor.hill.fill(12);s.floor.goal.fill(12);s.floor.pieces.push({});s.floor.warns.push({});s.floor.bursts.push({});
  s.itemCount=1;s.ix[0]=100;s.iy[0]=100;s.ivy[0]=0;s.ikind[0]=0;s.gauge=35;s.score=1234;s.bombs=3;s.lastWipe=s.tick;
  const resources=()=>({hp:s.player.hp,hits:s.hits,bombs:s.bombs,bombsUsed:s.bombsUsed,autoBombs:s.autoBombs,distorts:s.distorts,gauge:s.gauge,score:s.score,exp:s.exp,itemCount:s.itemCount});
  const before=resources();h.seedVisuals();assert.equal(h.beginStory(),!seen);assert.equal(calls.filter(c=>c[0]==='reset').length,1,'old scheduled combat sound is cleared at preparation');assert.equal(s.bossEntrance.enteredTick,null);assert.equal(s.bossEntrance.readyTick,null);
  assert.equal(s.n,0);assert.equal(s.sn,0);for(const key of ['mobs','lasers','figures','ripples','cancelled','drifted','pops','zaps','risers'])assert.equal(s[key].length,0,key+' residue is removed');
  assert.equal(s.bombPulse,null);assert.equal(s.pulseInfo,null);assert.equal(s.lastBomb,null);assert(s.floor.grid.every(v=>v===0));assert(s.floor.hill.every(v=>v===0));assert(s.floor.goal.every(v=>v===0));
  for(const key of ['pieces','warns','bursts'])assert.equal(s.floor[key].length,0);assert.deepEqual(Array.from(h.visualCounts()),[0,0,0,0,0]);assert.equal(h.input().bomb,false);assert.deepEqual(resources(),before);
  if(!seen){const tick=s.tick;h.frame(1000);h.frame(1100);assert.equal(s.tick,tick);assert.equal(s.bossEntrance.enteredTick,null,'reading does not consume the arrival grace');nodes.get('story-skip').click();}
  assert.equal(w.HapilArcadeApp.getState().mode,'playing');
  let retiring=0;while(s.bossEntrance.enteredTick===null&&retiring++<100){A.step(s,{dx:1,dy:0,bomb:true});assert.deepEqual(resources(),before);assert.equal(s.n,0);assert.equal(s.sn,0);}
  assert(retiring>1,'the outgoing midboss leaves before the timer starts');assert.equal(s.boss.actor,'violet');assert.equal(s.boss.mid,false);assert.equal(s.boss.present,true);
  const entered=s.bossEntrance.enteredTick,ready=s.bossEntrance.readyTick;assert.equal(ready-entered,120);assert.equal(s.tick,entered);
  const bossY=s.boss.y,playerX=s.player.x;
  while(s.tick<ready-1){A.step(s,{dx:-1,dy:0,bomb:true});assert.equal(s.stage,'intro');assert.equal(s.segTick,0);assert.equal(s.n,0);assert.equal(s.sn,0);assert.deepEqual(resources(),before);}
  assert(s.boss.y>bossY,'boss entrance animation advances');assert(s.player.x<playerX,'movement stays available');
  A.step(s,{dx:0,dy:0});assert.equal(s.tick,ready);assert.equal(s.bossEntrance.releasedTick,ready);assert.equal(s.stage,'card');assert.equal(s.bombs,before.bombs,'blocked bomb presses are not queued');assert.equal(s.hits,0);
  for(let i=0;i<4;i++)A.step(s,{dx:0,dy:0});assert(s.sn>0,'automatic player fire resumes after the full grace period');
 }
});

test('all 56 main bosses qualify before their first engine tick, including road stages; new seen state suppresses replay',()=>{
 const {h,w,nodes,audio}=harness(),manifest=JSON.parse(read('media/arcade-v43/manifest.json'));h.manifest(manifest);
 for(const stage of A.STAGES){
   const index=A.SEGMENTS.findIndex(g=>g.stage===stage.index&&g.kind==='card'&&!g.mid),seg=A.SEGMENTS[index];assert(index>=0);
   const s=A.createRun({difficulty:'normal',seed:11,segment:index,pacing:true});h.prepare(s,audio);
   assert.equal(h.beginStory(),true,stage.name);assert.equal(s.tick,0);assert.equal(s.boss.present,false);assert.equal(s.boss.actor,'');
   assert.equal(w.HapilArcadeApp.getState().story.actor,seg.actor);assert.equal(nodes.get('story-boss-name').textContent,A.ACTORS[seg.actor].name);
   const meta=manifest[seg.actor+'.webp'];
   if(seg.actor!=='violet'&&meta.frames>1){assert.equal(nodes.get('story-portrait').style.backgroundSize,`${meta.frames*100}% 100%`);assert.equal(Number(nodes.get('story-portrait').style.aspectRatio),meta.cell[0]/meta.cell[1]);}
   nodes.get('story-skip').click();assert.equal(h.beginStory(),false,'seen story is not repeated within the same intro');
 }
 const saved=harness({'hapil-arcade-boss-seen-v4':'{"1:violet":true}'}),index=A.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid);
 saved.h.prepare(A.createRun({segment:index}),saved.audio);assert.equal(saved.h.beginStory(),false);assert.equal(saved.w.HapilArcadeApp.getState().mode,'playing');
});

test('all ten seven-sin forms display their own two adapted lines while other main bosses retain canonical excerpts',()=>{
 const {h,w,nodes,audio,storage}=harness(),entries=w.HapilArcadeBossIntros.BOSS_ENTRANCES;assert.equal(entries.length,10);
 for(const entry of entries){
  const index=A.SEGMENTS.findIndex(g=>g.stage===entry.stage&&g.actor===entry.actor&&g.kind==='card');assert(index>=0);
  const s=A.createRun({difficulty:'normal',seed:11,segment:index,pacing:true});h.prepare(s,audio);
  assert.equal(h.beginStory(),true,entry.actor);assert.equal(h.storyEntry().kind,'canon-monologue');assert.equal(h.storyEntry().actor,entry.actor);
  assert.equal(w.HapilArcadeApp.getState().story.actor,entry.actor);assert.equal(s.tick,0);assert.equal(s.boss.present,false);assert.equal(nodes.get('story-portrait').attrs['aria-label'],A.ACTORS[entry.actor].name);
  h.nextStory();assert.equal(nodes.get('story-speaker').textContent,entry.lines[0].speaker);assert.equal(nodes.get('story-text').textContent,entry.lines[0].text);
  h.nextStory();assert.equal(nodes.get('story-speaker').textContent,entry.lines[1].speaker);assert.equal(nodes.get('story-text').textContent,entry.lines[1].text);
  h.nextStory();assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(JSON.parse(storage['hapil-arcade-boss-seen-v4'])[entry.stage+':'+entry.actor],true);
 }
 const index=A.SEGMENTS.findIndex(g=>g.stage===0&&g.kind==='card'&&!g.mid);h.prepare(A.createRun({segment:index}),audio);assert(h.beginStory());assert.equal(h.storyEntry(),w.HapilArcadeStory.getStage(0),'non-sin encounters use the canonical source entry');
 assert.equal(nodes.get('story-text').textContent,w.HapilArcadeStory.getStage(0).lines[0].text);
});

test('stage 20 shows both chairman and core cut-ins with separate seen keys and a real clear transition between them',()=>{
 const {h,w,nodes,audio,storage}=harness({'hapil-arcade-main-boss-seen-v2':'{"19":true}'}),first=A.SEGMENTS.findIndex(g=>g.stage===19&&g.actor==='p2_chairman');
 const s=A.createRun({difficulty:'normal',seed:19,segment:first,pacing:true});h.prepare(s,audio);assert.equal(A.SEGMENTS[first].mid,true);
 assert(h.beginStory());assert.equal(w.HapilArcadeApp.getState().story.actor,'p2_chairman');nodes.get('story-skip').click();
 let sawClear=false,coreOpened=false;
 for(let i=0;i<600&&!coreOpened;i++){
  if(s.stage==='card')s.boss.hp=0;A.step(s,{});if(s.stage==='bossClear'){sawClear=true;assert.equal(s.bossClear.actor,'p2_chairman');}
  h.consume();coreOpened=h.beginStory();
 }
 assert(sawClear,'chairman defeat receives its own clear interval');assert(coreOpened,'the core still opens after the chairman was seen');
 assert.equal(s.stage,'intro');assert.equal(s.stageIndex,19);assert.equal(w.HapilArcadeApp.getState().story.actor,'p2_core');assert.equal(h.storyEntry(),w.HapilArcadeBossIntros.getBoss('p2_core',19));
 assert.equal(s.boss.present,false,'core cut-in precedes its field entrance');assert.equal(s.results.length,0,'defeating the chairman does not prematurely clear the shared stage');
 let seen=JSON.parse(storage['hapil-arcade-boss-seen-v4']);assert.equal(seen['19:p2_chairman'],true);assert.equal(seen['19:p2_core'],undefined);
 nodes.get('story-skip').click();seen=JSON.parse(storage['hapil-arcade-boss-seen-v4']);assert.equal(seen['19:p2_core'],true);
});

test('final boss-card defeat clears old effects, preserves the fresh bossDown flash, pauses its 120-tick clear, and saves once',()=>{
 const {h,w,nodes,audio,doc,calls,storageWrites}=harness(),last=A.SEGMENTS.map((g,i)=>({g,i})).filter(x=>x.g.stage===0&&x.g.kind==='card'&&!x.g.mid).at(-1).i;
 const s=A.createRun({difficulty:'normal',seed:33,segment:last,pacing:true});h.prepare(s,audio);assert(h.beginStory());nodes.get('story-skip').click();
 for(let i=0;i<200&&s.stage!=='card';i++){A.step(s,{});h.consume();}assert.equal(s.stage,'card');
 s.lastWipe=s.tick;s.n=1;s.bx[0]=s.player.x;s.by[0]=s.player.y;s.bsize[0]=1;s.bage[0]=100;s.blife[0]=1000;s.bs[0]=0;
 h.seedVisuals();const resets=calls.filter(c=>c[0]==='reset').length;s.boss.hp=0;A.step(s,{});
 assert.equal(s.stage,'bossClear');assert.equal(s.stageIndex,0);assert.equal(s.seg,last);assert.equal(s.n,0);assert.equal(s.sn,0);assert.equal(s.lasers.length,0);assert.equal(s.figures.length,0);
 assert(s.events.indexOf('bossClear')>=0&&s.events.indexOf('bossClear')<s.events.indexOf('bossDown'));h.consume();
 assert.deepEqual(Array.from(h.visualCounts()),[0,0,0,0,0]);assert.equal(h.defeatVisual().actor,'p1_tree');assert(h.defeatVisual().flash>0,'clear cleanup does not erase the newly emitted defeat flash');assert.equal(h.input().bomb,false);
 assert.equal(calls.filter(c=>c[0]==='reset').length,resets+1,'clear cancels old scheduled combat sounds once');
 const saved=()=>storageWrites.filter(x=>x.key==='hapil-arcade-save-v43');assert.equal(saved().length,1,'the completed stage is persisted at defeat, before the visual wait');assert.equal(s.results.length,1);
 const resources=()=>({score:s.score,exp:s.exp,items:s.itemCount,cleared:s.cleared,bombs:s.bombs,bombsUsed:s.bombsUsed,hits:s.hits,hp:s.player.hp});const rewards=resources(),tick=s.tick,ready=s.bossClear.readyTick;
 assert.equal(ready-tick,120);doc.emit('keydown',{key:'Escape'});assert.equal(w.HapilArcadeApp.getState().mode,'paused');h.frame(1000);h.frame(1100);assert.equal(s.tick,tick);assert.deepEqual(resources(),rewards);doc.emit('keydown',{key:'Escape'});
 while(s.tick<ready-1){A.step(s,{dx:1,bomb:true});h.consume();assert.equal(s.stage,'bossClear');assert.equal(s.stageIndex,0);assert.deepEqual(resources(),rewards);assert.equal(saved().length,1);assert.equal(s.results.length,1);}
 A.step(s,{});h.consume();assert.equal(s.tick,ready);assert.equal(s.stageIndex,1);assert.equal(s.stage,'wave');assert.equal(s.results.length,1);assert.equal(saved().length,1);assert.equal(JSON.parse(saved()[0].value).cleared.filter(x=>x===0).length,1);
 A.step(s,{});h.consume();assert.equal(s.results.length,1);assert.equal(saved().length,1,'the same clear is not recorded a second time');
});

function terminalClear(options,saved){
 const f=harness(saved),stage=options.stage||0,last=A.SEGMENTS.map((g,i)=>({g,i})).filter(x=>x.g.stage===stage&&x.g.kind==='card'&&!x.g.mid).at(-1).i;
 const s=A.createRun(Object.assign({difficulty:'normal',seed:33,segment:last,pacing:true},options));
 f.h.loadProgress();f.h.prepare(s,f.audio);assert(f.h.beginStory());f.nodes.get('story-skip').click();
 for(let i=0;i<200&&s.stage!=='card';i++){A.step(s,{});f.h.consume();}assert.equal(s.stage,'card');
 s.boss.hp=0;A.step(s,{});f.h.consume();assert.equal(s.stage,'bossClear');return Object.assign(f,{s});
}

test('terminal boss clear saves the best score before quitting or reloading during its visual wait',()=>{
 const key='hapil-arcade-best-v43',cases=[{stage:A.STAGES.length-1},{bossOnly:true},{stages:1}];
 for(const options of cases){
  const f=terminalClear(options),s=f.s;assert.equal(s.bossClear.nextSegment,A.SEGMENTS.length);assert(s.score>0);
  assert.equal(Number(f.storage[key]),s.score,'campaign, boss-only and limited-run wins commit before the 120-tick wait');
  assert.equal(f.storageWrites.filter(x=>x.key===key).length,1);
  const reloaded=harness(f.storage);reloaded.h.loadProgress();reloaded.nodes.get('arcade-quit').click();
  assert.equal(Number(reloaded.nodes.get('title-best').textContent),s.score,'fresh page reads the committed best score');
  f.doc.emit('keydown',{key:'Escape'});f.nodes.get('arcade-quit').click();
  assert.equal(f.w.HapilArcadeApp.getState().mode,'title');assert.equal(Number(f.nodes.get('title-best').textContent),s.score,'immediate home keeps the score visible');
  assert.equal(Number(f.storage[key]),s.score);
 }
});

test('finishing a clear wait does not duplicate best-score writes or change nonterminal and lower-score rules',()=>{
 const key='hapil-arcade-best-v43',f=terminalClear({bossOnly:true}),score=f.s.score;
 while(f.s.stage==='bossClear'){A.step(f.s,{});f.h.consume();}
 assert.equal(f.s.stage,'won');assert.equal(Number(f.storage[key]),score);assert.equal(f.storageWrites.filter(x=>x.key===key).length,1,'finish shares the idempotent best-score helper');
 const lower=terminalClear({bossOnly:true},{[key]:'999999999'});assert.equal(lower.storage[key],'999999999');assert.equal(lower.storageWrites.filter(x=>x.key===key).length,0);
 const continuing=terminalClear({});assert(continuing.s.bossClear.nextSegment<A.SEGMENTS.length);
 assert.equal(continuing.storage[key],undefined,'an ordinary stage clear does not introduce a new mid-run best-score save');
});

test('impact animation and one-shot audio pause without restarting, then advance automatically to memory',()=>{
 const {h,w,s,nodes,doc,calls}=harness();assert(h.beginStory(true));const screen=nodes.get('arcade-story');
 assert.equal(screen.dataset.phase,'impact');assert.equal(screen.dataset.paused,'false');assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='bossCutin').length,1);
 const cue=calls.findIndex(c=>c[0]==='play'&&c[1]==='bossCutin');assert.deepEqual(calls.slice(0,cue).filter(c=>c[0]==='suspend').at(-1),['suspend',false],'cue is played only after effects are unsuspended');
 h.frame(1000);h.frame(1100);const phaseMs=w.HapilArcadeApp.getState().story.phaseMs,tick=s.tick;
 doc.emit('keydown',{key:'Escape'});assert.equal(screen.dataset.paused,'true');assert.equal(screen.hidden,false,'keep the animated layer mounted beneath the pause menu');
 assert.equal(screen.attrs['aria-hidden'],'true');assert.equal(screen.inert,true,'paused cinematic controls cannot take focus');
 h.frame(2000);h.frame(3000);assert.equal(w.HapilArcadeApp.getState().story.phaseMs,phaseMs);assert.equal(s.tick,tick);
 nodes.get('arcade-resume').click();assert.equal(screen.dataset.paused,'false');assert.equal(screen.dataset.phase,'impact');assert.notEqual(screen.attrs['aria-hidden'],'true');assert.equal(screen.inert,false);
 assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='bossCutin').length,1,'resume does not replay the impact cue');
 for(let t=3100;t<=5200;t+=100)h.frame(t);
 assert.equal(w.HapilArcadeApp.getState().story.phase,'memory');assert.equal(screen.dataset.phase,'memory');assert.equal(s.tick,tick);
 assert.deepEqual(calls.filter(c=>c[0]==='suspend').at(-1),['suspend',true],'battle effects are silent during memory');
});

test('memory pause, rules, resume and skip preserve narrative position and do not queue game input',()=>{
 const {h,w,s,nodes,doc,calls,storage}=harness();s.boss.actor='violet';s.boss.name='보라검 천사';assert(h.beginStory(true));h.nextStory();
 const controlSpace=doc.emit('keydown',{key:' ',target:nodes.get('story-auto')});assert(!controlSpace.prevented);assert.equal(w.HapilArcadeApp.getState().story.line,0);
 const buttonEnter=doc.emit('keydown',{key:'Enter',target:nodes.get('story-skip')});assert(!buttonEnter.prevented);assert.equal(w.HapilArcadeApp.getState().story.line,0);
 const text=nodes.get('story-text').textContent;doc.emit('keydown',{key:'Escape'});assert.equal(w.HapilArcadeApp.getState().mode,'paused');
 nodes.get('arcade-rules-pause').click();assert.equal(w.HapilArcadeApp.getState().mode,'rules');doc.emit('keydown',{key:'Escape'});assert.equal(w.HapilArcadeApp.getState().mode,'paused');
 nodes.get('arcade-resume').click();assert.equal(w.HapilArcadeApp.getState().mode,'story');assert.equal(nodes.get('story-text').textContent,text);
 doc.emit('keydown',{key:'x'});assert.equal(h.input().bomb,false);doc.emit('keydown',{key:'Enter',repeat:true});assert.equal(w.HapilArcadeApp.getState().story.line,0);
 doc.emit('keydown',{key:'Enter'});assert.equal(w.HapilArcadeApp.getState().story.line,1);nodes.get('story-skip').click();assert.equal(w.HapilArcadeApp.getState().mode,'playing');
 assert.equal(JSON.parse(storage['hapil-arcade-boss-seen-v4'])['0:p1_tree'],true);assert(calls.some(c=>c[0]==='musicUpdate'&&c[1]==='playing'));
});


test('normal canvas entrances use the stage-specific speaker and dialogue across the complete journey',()=>{
  const {h,w,audio,calls}=harness(),intros=w.HapilArcadeBossIntros,book=w.HapilArcadeBossLines;
  const sections=new Set(),newLines=new Set();
  for(const stage of A.STAGES){
    for(const mid of [true,false]){
      const segment=A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.stage===stage.index&&!!g.mid===mid);
      const g=A.SEGMENTS[segment],name=g.title||A.actorName(g.actor,g.stage); // 합쳐진 보스는 지금 모습의 이름(초천사), 바뀐 보스는 새 이름(악몽 군집체·사몽각성 교주)
      const state=A.createRun({segment,entranceAll:true});
      h.prepare(state,audio);
      A.step(state,{});
      assert.equal(A.entrancePhase(state).phase,'cutin');
      A.skipEntrance(state);
      A.step(state,{});
      const line=book.getLine(g.actor,g.stage);
      if(mid){
        // 사용자 11-20: 중간보스는 컷인만, 대사 없음
        for(let k=0;k<A.BOSS_ENTRANCE_MID/2;k++)A.step(state,{});
        calls.length=0;h.drawBossIntro(state);
        assert.equal(calls.filter(c=>c[0]==='fillText').length,0,name+' midboss paints no speech');
        continue;
      }
      sections.add(g.stage);
      assert.equal(line.text,book.LINES[book.ENTRANCE[g.stage]-1],name);newLines.add(line.text);
      const at=state.bossEntrance.enteredTick+Math.ceil(.8*A.BOSS_ENTRANCE_SPEECH);
      while(state.tick<at)A.step(state,{});
      assert.equal(A.entrancePhase(state).phase,'speech');
      calls.length=0;
      h.drawBossIntro(state);
      const painted=calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
      assert(painted.includes(name),name);
      assert(painted.includes(line.text),name);
    }
  }
  assert.equal(sections.size,52);
  assert.equal(newLines.size,52);
});

test('PC 키 바꾸기: 초능력·폭탄 키를 눌러 지정하고, 겹치면 맞바꾸고, 막힌 키는 거절하며, 저장·되돌리기·안내 문구가 따라온다',()=>{
  const f=harness();const {h,w,doc,nodes,storage}=f;h.mode('paused');
  const bind=(id,ev)=>{nodes.get(id).click();doc.emit('keydown',ev);};
  assert.equal(h.settings().keyFocus,'Shift');assert.equal(h.settings().keyBomb,'KeyX');
  bind('key-focus',{key:'c',code:'KeyC'});assert.equal(h.settings().keyFocus,'KeyC');assert.equal(nodes.get('key-focus').textContent,'C');
  assert.equal(JSON.parse(storage['hapil-arcade-settings-v43']).keyFocus,'KeyC');
  bind('key-bomb',{key:'c',code:'KeyC'}); // 초능력과 겹침 → 맞바꿈
  assert.equal(h.settings().keyBomb,'KeyC');assert.equal(h.settings().keyFocus,'KeyX');assert.equal(nodes.get('key-bomb').textContent,'C');
  nodes.get('key-focus').click();doc.emit('keydown',{key:'ArrowLeft',code:'ArrowLeft'}); // 이동키는 거절하고 계속 기다린다
  assert.equal(h.settings().keyFocus,'KeyX');assert(/ArrowLeft/.test(nodes.get('key-note').textContent));
  doc.emit('keydown',{key:'w',code:'KeyW'});assert.equal(h.settings().keyFocus,'KeyX');
  doc.emit('keydown',{key:'Control',code:'ControlRight'});assert.equal(h.settings().keyFocus,'Control');assert.equal(nodes.get('key-focus').textContent,'Ctrl');
  nodes.get('key-reset').click();assert.equal(h.settings().keyFocus,'Shift');assert.equal(h.settings().keyBomb,'KeyX');
});

test('PC 키 바꾸기: 바꾼 키가 실제 조작이고 옛 키는 더 이상 반응하지 않으며 한글 입력기(code만 정확)에서도 같다',()=>{
  const {h,w,doc,nodes}=harness();h.mode('paused');
  nodes.get('key-focus').click();doc.emit('keydown',{key:'ㅊ',code:'KeyC'});
  nodes.get('key-bomb').click();doc.emit('keydown',{key:'Process',code:'KeyV'});
  h.mode('playing');
  doc.emit('keydown',{key:'Shift'});assert.equal(h.input().focus,false);doc.emit('keydown',{key:'x',code:'KeyX'});assert.equal(h.input().bomb,false);
  doc.emit('keydown',{key:'ㅊ',code:'KeyC'});assert.equal(h.input().focus,true);
  doc.emit('keyup',{key:'ㅊ',code:'KeyC'});assert.equal(h.input().focus,false);
  doc.emit('keydown',{key:'Process',code:'KeyV'});assert.equal(h.input().bomb,true);
});

test('PC 키 바꾸기: 저장값을 불러오고, 겹치거나 잘못된 저장값은 기본값으로 둔다',()=>{
  const a=harness({'hapil-arcade-settings-v43':JSON.stringify({keyFocus:'KeyC',keyBomb:'KeyV'})});a.h.load();assert.equal(a.h.settings().keyFocus,'KeyC');assert.equal(a.h.settings().keyBomb,'KeyV');
  const b=harness({'hapil-arcade-settings-v43':JSON.stringify({keyFocus:'Escape',keyBomb:'ArrowUp'})});b.h.load();assert.equal(b.h.settings().keyFocus,'Shift');assert.equal(b.h.settings().keyBomb,'KeyX');
  const c=harness({'hapil-arcade-settings-v43':JSON.stringify({keyFocus:'KeyC',keyBomb:'KeyC'})});c.h.load();assert.equal(c.h.settings().keyFocus,'Shift');assert.equal(c.h.settings().keyBomb,'KeyX');
});
