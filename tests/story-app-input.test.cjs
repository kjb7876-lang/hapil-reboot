const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/story-app.js'), 'utf8');

async function setup({ review = false, failStart = false } = {}) {
  const elements = new Map(), raf = [], steps = [];
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const node = { id, dataset: {}, style: {}, hidden: false, listeners: {}, children: [],
      addEventListener(name, fn) { this.listeners[name] = fn; },
      dispatch(name, event = {}) { this.listeners[name]?.(event); },
      appendChild(child) { this.children.push(child); }, append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; }, focus() {}, setPointerCapture() {},
      getBoundingClientRect() { return { width: 360 }; }, showModal() {}, close() {} };
    elements.set(id, node); return node;
  }
  const data = { scenes: [{ id:'s1', title:'Scene', sequence:0, chapter:1, text:'text', requiredCombatIds:['b1'] }], primaryCombatIds:['b1'] };
  const state = { viewSceneId:'s1', acknowledgedSceneIds:[], clearedCombatIds:[], activeCombat:null };
  let world = null;
  const session = { state:()=>state, frontier:()=>({sceneIndex:0}), sceneStatus:()=> 'current', availableCombats:()=>['b1'], status:()=>({error:null}), dispatch:()=>({ok:true}),
    start:()=> { if(failStart) return {ok:false,reason:'write-failed'}; world = {status:'active'}; return {ok:true}; },
    retry:()=>({ok:false,reason:'write-failed'}), tick(input) { steps.push(input); }, world:()=>world };
  const registry = { bindings:{ b1:{ images:[{key:'body',file:'media/body.png'}], art:{} } } };
  const gate = { entryStatus:()=>({ready:true,name:'Boss'}), summary:()=>({indexRevision:1,readyCount:1,primaryCount:1,generationComplete:false,readyFormCount:0,requiredFormCount:0}) };
  const document = { getElementById:element, createElement:()=>element('created'+Math.random()), body:{dataset:{}}, addEventListener() {} };
  class Image { set src(v) { if(v) queueMicrotask(()=>this.onload()); } }
  const win = { document, Image, location:{search:review?'?review=b1':''}, matchMedia:()=>({matches:false}), innerHeight:800,innerWidth:400, devicePixelRatio:1, addEventListener(){}, scrollTo(){},
    HapilStoryData:data, HapilStoryScope:{apply:()=>data}, HapilStoryEncounters:{get:()=>({id:'b1',name:'Boss'})},
    HapilStoryAssets:{create:()=>gate}, HapilStoryState:{}, HapilStoryStorage:{}, HapilStorySession:{create:()=>session},
    HapilStoryCombat:{supports:()=>true,create:()=>({status:'active'}),step:(w,i)=>steps.push(i),result:()=>null,verifyResult:()=>true},
    HapilStoryRenderer:{create:()=>({resize(){},render(){return {ready:true}},dispose(){}})} };
  const context={ window:win, document, Image, URLSearchParams, performance:{now:()=>0}, requestAnimationFrame:fn=>raf.push(fn),
    fetch:async path=>({ok:true,json:async()=>path.includes('runtime-assets')?registry:{}}), setTimeout:()=>1,clearTimeout(){},console };
  vm.runInNewContext(code,context);
  await new Promise(setImmediate);
  return { element, win, raf, steps };
}

test('a completed short touch drag survives until the next simulation tick', async () => {
  const h=await setup({review:true});
  h.element('review-fight').onclick();
  await new Promise(setImmediate);
  const canvas=h.element('story-canvas');
  canvas.dispatch('pointerdown',{pointerId:1,clientX:20,clientY:20});
  canvas.dispatch('pointermove',{pointerId:1,clientX:26,clientY:23});
  canvas.dispatch('pointerup',{pointerId:1,clientX:28,clientY:24});
  canvas.dispatch('lostpointercapture',{pointerId:1});
  assert.ok(h.raf.length);
  h.raf.shift()(20);
  assert.equal(h.steps.length,1);
  assert.equal(h.steps[0].dx,8);
  assert.equal(h.steps[0].dy,4);
});

test('a cancelled touch discards its pending movement', async () => {
  const h=await setup({review:true});
  h.element('review-fight').onclick();
  await new Promise(setImmediate);
  const canvas=h.element('story-canvas');
  canvas.dispatch('pointerdown',{pointerId:2,clientX:20,clientY:20});
  canvas.dispatch('pointermove',{pointerId:2,clientX:40,clientY:30});
  canvas.dispatch('pointercancel',{pointerId:2});
  h.raf.shift()(20);
  assert.equal(h.steps.length,1);
  assert.equal(h.steps[0].dx,undefined);
  assert.equal(h.steps[0].dy,undefined);
});

test('save failure when starting combat returns to the reader', async () => {
  const h=await setup({failStart:true});
  const list=h.element('encounters');
  const start=list.children[0].children.find(x => x.textContent==='전투 시작');
  start.listeners.click();
  await new Promise(setImmediate);
  assert.equal(h.win.document.body.dataset.battle,'false');
  assert.equal(h.element('reader').hidden,false);
  assert.equal(h.element('battle').hidden,true);
  assert.match(h.element('notice').textContent,/저장하지 못했습니다/);
});
