const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/story-app.js'), 'utf8');

async function setup({ review = false, failStart = false, lockReason = null, loseOnTick = false, reviewAssets = false, missingReviewFile = false, coarse = false, extraImages = 0, oversizeImage = false } = {}) {
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
  const data = { scenes: [{ id:'s1', title:'Scene', sequence:0, chapter:1, text:'text', requiredCombatIds:['dist00-boss'] }], primaryCombatIds:['dist00-boss'] };
  const state = { viewSceneId:'s1', acknowledgedSceneIds:[], clearedCombatIds:[], activeCombat:null };
  let world = null, starts=0, renders=0;
  const session = { claimExclusive:async()=>lockReason?({ok:false,reason:lockReason}):({ok:true}),releaseExclusive(){}, state:()=>state, frontier:()=>({sceneIndex:0}), sceneStatus:()=> 'current', availableCombats:()=>['dist00-boss'], status:()=>({error:null}), dispatch:()=>({ok:true}),
    start:()=> { starts++; if(failStart) return {ok:false,reason:'write-failed'}; world = {status:'active'}; return {ok:true}; },
    retry:()=>({ok:false,reason:'write-failed'}), tick(input) { steps.push(input);if(loseOnTick)world.status='lost'; }, world:()=>world };
  const registry = { bindings:{ 'dist00-boss':{ images:[{key:'body',file:'media/body.png'}], art:{} } } };
  if(reviewAssets)registry.bindings['dist00-boss']={combatId:'dist00-boss',images:['body','projectile','map','player','shot','target'].map(key=>({key,file:'media/'+key+'.png'})),art:{body:{combatId:'dist00-boss',key:'body'},projectile:{combatId:'dist00-boss',key:'projectile'},background:{key:'map'},playerKey:'player',shotKey:'shot',targetKey:'target'}};
  if(reviewAssets){for(let i=0;i<extraImages;i++)registry.bindings['dist00-boss'].images.push({key:'extra'+i,file:'media/extra'+i+'.png',width:oversizeImage?4096:512,height:oversizeImage?4096:512});}
  const gate = { entryStatus:()=>({ready:true,name:'Boss'}), summary:()=>({indexRevision:1,readyCount:1,primaryCount:1,generationComplete:false,readyFormCount:0,requiredFormCount:0}) };
  const document = { getElementById:element, createElement:()=>element('created'+Math.random()), body:{dataset:{}}, addEventListener() {} };
  class Image { set src(v) { if(v) queueMicrotask(()=>this.onload()); } }
  const win = { document, Image, location:{search:review?'?review=dist00-boss':''}, matchMedia:()=>({matches:coarse}), innerHeight:800,innerWidth:400, devicePixelRatio:1, addEventListener(){}, scrollTo(){},
    HapilStoryData:data, HapilStoryScope:{apply:()=>data}, HapilStoryEncounters:{get:id=>({id,name:'Boss',stages:[{target:id==='dist00-boss'?'command-link':'body'}]})},
    HapilStoryAssets:{create:()=>gate}, HapilStoryState:{}, HapilStoryStorage:{}, HapilStorySession:{create:()=>session},
    HapilStoryCombat:{supports:()=>true,create:()=>({status:'active'}),step:(w,i)=>steps.push(i),result:()=>null,verifyResult:()=>true},
    HapilStoryRenderer:{create:()=>({resize(){},render(){renders++;return {ready:true}},dispose(){}})} };
  const context={ window:win, document, Image, URLSearchParams, performance:{now:()=>0}, requestAnimationFrame:fn=>raf.push(fn),
    fetch:async (path,options)=>({ok:!(missingReviewFile&&options&&options.method==='HEAD'&&path==='media/target.png'),json:async()=>path.includes('runtime-assets')?registry:{}}), setTimeout:()=>1,clearTimeout(){},console };
  vm.runInNewContext(code,context);
  await new Promise(setImmediate);
  return { element, win, raf, steps, starts:()=>starts, renders:()=>renders };
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

test('a busy storage lock stops boot and tells the user without showing gameplay',async()=>{
 const h=await setup({lockReason:'lock-busy'});
 assert.match(h.element('scene-title').textContent,/열 수 없습니다/);
 assert.match(h.element('scene-status').textContent,/다른 창/);
 assert.match(h.element('save-status').textContent,/변경하지 않았습니다/);
 assert.equal(h.element('encounters').children.length,0);
});

test('lost combat presents a retry rather than a false victory',async()=>{
 const h=await setup({loseOnTick:true});
 h.element('encounters').children[0].children.find(x=>x.textContent==='전투 시작').listeners.click();
 await new Promise(setImmediate);h.raf.shift()(20);
 assert.equal(h.element('retry').hidden,false);
 assert.match(h.element('battle-state').textContent,/다시 도전/);
});

test('review catalogue checks each own asset before enabling and never starts a saved encounter',async()=>{
 const absent=await setup({reviewAssets:true,missingReviewFile:true});
 const a=absent.element('review-list').children[0];assert.equal(a.children[1].disabled,true);assert.match(a.children[0].textContent,/불러올 수 없음/);assert.equal(absent.starts(),0);
 const ready=await setup({reviewAssets:true});const row=ready.element('review-list').children[0];assert.equal(row.children[1].disabled,false);
 row.children[1].listeners.click();await new Promise(setImmediate);
 assert.equal(ready.starts(),0);assert.equal(ready.win.document.body.dataset.battle,'true');assert.match(ready.element('battle-state').textContent,/진행·저장에 반영하지 않습니다/);
});
test('review accepts ten bounded first-encounter images and rejects unbounded count or decoded size',async()=>{
 const bounded=await setup({reviewAssets:true,extraImages:4});assert.equal(bounded.element('review-list').children[0].children[1].disabled,false);
 const tooMany=await setup({reviewAssets:true,extraImages:7});assert.equal(tooMany.element('review-list').children[0].children[1].disabled,true);
 const tooLarge=await setup({reviewAssets:true,extraImages:1,oversizeImage:true});assert.equal(tooLarge.element('review-list').children[0].children[1].disabled,true);
});
test('mobile frame pacing maintains about 30 draws on a 60 Hz timer without slowing simulation',async()=>{
 const h=await setup({review:true,coarse:true});h.element('review-fight').onclick();await new Promise(setImmediate);
 const initial=h.renders();for(let i=1;i<=120;i++){assert(h.raf.length);h.raf.shift()(i*1000/60);}
 const paints=h.renders()-initial;assert(paints>=59&&paints<=61,`draws: ${paints}`);assert(h.steps.length>=118&&h.steps.length<=120,`ticks: ${h.steps.length}`);
});
