'use strict';
/* Execute the real app event handlers with a small DOM double. The game engine is real;
   only rendering/boot and platform audio are omitted. This does not require Chromium. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const A=require('../src/arcade-v43.js'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function harness(saved){
  const nodes=new Map(),storage=Object.assign({},saved),calls=[],globals={},strokes=[];let pen=[],dash=[];const stack=[];
  const ctx=new Proxy({globalAlpha:1,lineWidth:1,
    beginPath(){pen=[];},moveTo(...v){pen.push(['moveTo',...v]);},lineTo(...v){pen.push(['lineTo',...v]);},arc(...v){pen.push(['arc',...v]);},setLineDash(v){dash=v;},
    stroke(){strokes.push({alpha:this.globalAlpha,width:this.lineWidth,points:pen.map(p=>p.slice()),dash:dash.slice()});},
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
    localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v;},removeItem:k=>{delete storage[k];}},
    HapilMusic:{update:(...a)=>calls.push(['musicUpdate',...a]),setEnabled:v=>calls.push(['music',v]),setVolume:v=>calls.push(['musicVolume',v]),unlock:()=>calls.push(['musicUnlock'])},
    addEventListener:(k,f)=>{(globals[k]||(globals[k]=[])).push(f);},requestAnimationFrame(){},setTimeout(){},Image:class{},};w.window=w;
  const sandbox=vm.createContext(w);vm.runInContext(read('src/arcade-i18n-v43.js'),sandbox);vm.runInContext(read('src/arcade-story-v43.js'),sandbox);
  vm.runInContext(read('src/arcade-heroes-v43.js'),sandbox);vm.runInContext(read('src/arcade-mobile-v43.js'),sandbox);
  // Skip only browser boot. Expose the closed-over real handlers to install them on the DOM double.
  const script=read('src/arcade-app-v43.js').replace(/  boot\(\);\s*\}\)\(window\);\s*$/,`  global.controlsTest={bind:bind,input:inputForStep,load:loadSettings,apply:applySettings,mode:setMode,
    prepare:function(s,a){state=s;fx=a;mode='playing';},picker:function(p){heroPicker=p;},manifest:function(m){manifest=m;},settings:function(){return settings;},finger:function(){return finger;},quality:function(){return lite;},drawFigures:drawFigures,drawRunes:drawRunes,frame:frame,consume:consume,beginStory:beginStory,nextStory:nextStory};
})(window);`);
  assert(script.includes('global.controlsTest='));vm.runInContext(script,sandbox);
  const h=w.controlsTest,s=A.createRun({difficulty:'hell',seed:77});s.stage='break';s.stageTick=-100000;
  h.prepare(s,audio);h.bind();
  return {w,h,s,doc,nodes,storage,calls,globals,audio,strokes};
}
function pickerFor(h){
  const picker={visible:false,shown:0,selected:null,confirmCallback:null,cancelCallback:null,
    show(id,confirm,cancel){this.visible=true;this.shown++;this.selected=id;this.confirmCallback=confirm;this.cancelCallback=cancel;},
    hide(){this.visible=false;},confirm(id){const callback=this.confirmCallback;this.hide();callback(id);},cancel(){const callback=this.cancelCallback;this.hide();callback();}};
  h.picker(picker);return picker;
}

test('new game waits for hero confirmation, cancel leaves no run, and Seoha confirmation and retry preserve the chosen hero',()=>{
 const {h,w,nodes,storage,audio}=harness(),picker=pickerFor(h);h.prepare(null,audio);h.mode('title');
 nodes.get('arcade-start').click();assert.equal(w.HapilArcadeApp.getState().mode,'hero');assert.equal(picker.selected,'memory');
 assert.equal(w.HapilArcadeApp.debugState().state,null);h.frame(1000);h.frame(1100);assert.equal(w.HapilArcadeApp.debugState().state,null,'selection never advances a run');
 picker.cancel();assert.equal(w.HapilArcadeApp.getState().mode,'title');assert.equal(w.HapilArcadeApp.debugState().state,null);
 assert.equal(storage['hapil-arcade-hero-v43'],undefined);assert.equal(storage['hapil-arcade-journey-hero-v43'],undefined);
 nodes.get('arcade-start').click();picker.confirm('seoha');let s=w.HapilArcadeApp.debugState().state;
 assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(s.hero,'seoha');assert.equal(s.stageIndex,0);assert.equal(s.tick,0);assert.equal(picker.visible,false);
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

test('blur and background pause clear captured touch controls and queued actions',()=>{
  const {h,w,doc,nodes,globals}=harness(),stage=nodes.get('arcade-stage'),focus=nodes.get('arcade-focus');
  stage.emit('pointerdown',{pointerId:1,target:nodes.get('arcade-canvas')});focus.emit('pointerdown',{pointerId:2});nodes.get('arcade-bomb').emit('pointerdown',{pointerId:3});
  globals.blur[0]();assert.equal(w.HapilArcadeApp.getState().mode,'paused');assert.equal(stage.captured.size,0);assert.equal(focus.captured.size,0);assert.equal(h.input().bomb,false);assert.equal(h.input().focus,false);
  h.mode('playing');doc.hidden=true;doc.emit('visibilitychange');assert.equal(w.HapilArcadeApp.getState().mode,'paused');
});

test('invalid persisted values are bounded; reduced-shake and graphics settings load',()=>{
  const {h}=harness({'hapil-arcade-settings-v43':JSON.stringify({musicVolume:7,sfxVolume:-1,music:'false',screenShake:false,lowQuality:true})});h.load();
  assert.equal(h.settings().music,true);assert.equal(h.settings().musicVolume,1);assert.equal(h.settings().sfxVolume,0);assert.equal(h.settings().screenShake,false);assert.equal(h.quality(),true);
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
 nodes.get('story-skip').click();assert.equal(w.HapilArcadeApp.getState().mode,'playing');assert.equal(JSON.parse(storage['hapil-arcade-main-boss-seen-v2'])[1],true);
 frame(10000);assert.equal(s.tick,frozen.tick,'reading time does not cause catch-up steps');
 for(let i=0;i<150&&s.boss.actor!=='violet';i++){frame();assert.equal(w.HapilArcadeApp.getState().mode,'playing');}
 assert.equal(s.boss.actor,'violet');assert.equal(s.boss.mid,false);assert.equal(s.boss.present,true);assert.equal(s.stage,'intro');
 assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='bossCutin').length,1,'one cut-in cue, no repeat at actual entrance');
 assert.equal(calls.filter(c=>c[0]==='play'&&c[1]==='warning').length,1,'only the midboss uses the regular entrance warning');
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
 const saved=harness({'hapil-arcade-main-boss-seen-v2':'{"1":true}'}),index=A.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid);
 saved.h.prepare(A.createRun({segment:index}),saved.audio);assert.equal(saved.h.beginStory(),false);assert.equal(saved.w.HapilArcadeApp.getState().mode,'playing');
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
 assert.equal(JSON.parse(storage['hapil-arcade-main-boss-seen-v2'])[0],true);assert(calls.some(c=>c[0]==='musicUpdate'&&c[1]==='playing'));
});
