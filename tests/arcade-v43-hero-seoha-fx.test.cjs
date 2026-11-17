'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('../src/arcade-heroes-v43.js');
const source=fs.readFileSync(path.join(__dirname,'../src/hero-memory-v43.js'),'utf8');
function harness({ink=true,missingPortrait=false}={}){
  const loaded=[],calls=[],canvases=[];
  function context(canvas){
    const stack=[],g={globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',strokeStyle:'#000',filter:'none',lineWidth:1,font:'10px sans-serif',canvas,
      save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,filter:this.filter,lineWidth:this.lineWidth,font:this.font});},restore(){Object.assign(this,stack.pop()||{});},
      translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},rect(){},clip(){},ellipse(){},arc(){},
      fill(){calls.push({kind:'fill',color:this.fillStyle,alpha:this.globalAlpha});},stroke(){calls.push({kind:'stroke',color:this.strokeStyle,alpha:this.globalAlpha});},fillRect(){},
      createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},
      drawImage(im){calls.push({kind:'image',src:im.src||im.sourceImage||'',filter:this.filter});if(canvas&&!canvas.sourceImage)canvas.sourceImage=im.src||im.sourceImage;},
      fillText(text){calls.push({kind:'text',text});},strokeText(){},measureText(text){return {width:text.length*20};}};
    return g;
  }
  function makeCanvas(){const c={width:0,height:0},g=context(c);c.getContext=()=>g;canvases.push(c);return c;}
  class Img{constructor(){this.complete=true;this.naturalWidth=384;this.naturalHeight=512;}set src(v){this._src=v;loaded.push(v);if(v.includes('seoha')){this.naturalWidth=missingPortrait?0:1024;this.naturalHeight=1536;}}get src(){return this._src;}}
  const w={Image:Img,document:{createElement:makeCanvas},HapilInk:{on:ink,raw(){}},HapilArcadeHeroes:H,HapilArcade:{heroProfile:s=>H.get(typeof s==='string'?s:s.hero),bombName:(s,l)=>H.get(s.hero).bombNames[l],clockState:()=> 'normal',slowField:()=>[55,.3]}};w.window=w;
  vm.runInNewContext(source,w);return {fx:w.HapilHeroFx,g:context(),loaded,calls,canvases};
}
function state(hero,level=7){return {hero,power:level,bombLevel:level,tick:120,player:{x:180,y:550,invulnerableUntil:0},sn:2,sx:[160,200],sy:[310,280],svx:[-2,2],shoming:[0,1],zaps:[],distorts:1,
  lastBomb:{hero,level,name:H.get(hero).bombNames[level],x:180,y:550,targets:[180,190]},pulseInfo:{index:4,targets:[180,210]}};}

test('Seoha assets preload once and clock-hand shots replace memory shards without changing shot state',()=>{
  const h=harness({ink:false}),s=state('seoha'),before=JSON.stringify(s),n=h.loaded.length;
  for(let i=0;i<30;i++)h.fx.shots(h.g,s,i/60);
  assert.equal(JSON.stringify(s),before);assert.equal(h.loaded.length,n);
  assert.equal(h.loaded.filter(p=>p==='media/arcade-v43-heroes/seoha-portrait.webp').length,1);
  assert(!h.calls.some(c=>c.kind==='image'),'Seoha shots draw clock hands, not memory shard sheets');
  assert(h.calls.some(c=>c.color==='#59bab6')&&h.calls.some(c=>c.color==='#c39b58'));
  h.calls.length=0;h.fx.shots(h.g,state('memory'),1);assert(h.calls.some(c=>c.kind==='image'&&/shard/.test(c.src)),'memory shots keep their source sheet');
});
test('every Seoha ultimate uses her own portrait and profile name; portrait cache is reused',()=>{
  const h=harness(),s=state('seoha'),n=h.loaded.length;
  for(let lv=1;lv<=7;lv++){
    h.fx.reset();s.bombLevel=lv;s.lastBomb.level=lv;s.lastBomb.name=H.get('seoha').bombNames[lv];h.fx.onEvent('bomb',s,0);h.fx.drawTexts(h.g,.3);
    assert.equal(h.fx.debug().cutHero,'seoha');assert.equal(h.fx.debug().cutName,H.get('seoha').bombNames[lv]);
    assert(h.calls.some(c=>c.kind==='text'&&c.text===H.get('seoha').bombNames[lv]));
  }
  assert(h.calls.some(c=>c.kind==='text'&&c.text.startsWith('윤서하 · 필살 Lv.')));
  assert(h.calls.filter(c=>c.kind==='image').every(c=>/seoha-portrait/.test(c.src)),'no memory-gunner portrait in Seoha cut-in');
  assert(h.calls.some(c=>c.kind==='image'&&c.filter==='grayscale(1)'),'ink mode converts the new portrait once');
  assert.equal(h.canvases.length,1,'processed portrait canvas is cached across seven cut-ins');assert.equal(h.loaded.length,n);
  h.fx.reset();h.calls.length=0;h.fx.onEvent('bomb',state('memory'),0);h.fx.drawTexts(h.g,.3);
  assert.equal(h.fx.debug().cutHero,'memory');assert(h.calls.some(c=>c.kind==='image'&&/cutin-ink/.test(c.src)));
  assert(h.calls.some(c=>c.kind==='text'&&c.text==='기억사수 · 필살 Lv.7'));
});
test('Seoha zaps, ultimate pulses, field and evasion are distinct clockwork without memory glyphs or combat changes',()=>{
  for(const ink of [true,false]){
    const h=harness({ink}),s=state('seoha');s.zaps=[180,520,180,180,7];
    h.fx.onEvent('bomb',s,0);h.fx.onEvent('bombPulse',s,.5);h.fx.onEvent('distort',s,.5);
    const expected=JSON.parse(JSON.stringify(s));expected.zaps=[];h.fx.draw(h.g,s,.6);h.fx.clock(h.g,s,.6);h.fx.field(h.g,s,.6);
    assert.equal(JSON.stringify(s),JSON.stringify(expected),'only the pre-existing one-shot zap queue is consumed');
    assert(!h.calls.some(c=>c.kind==='image'),'clockwork blasts never borrow memory burst/shatter/bolt sheets');
    assert(!h.calls.some(c=>c.kind==='text'&&c.text==='憶'));
    const colors=h.calls.filter(c=>c.color).map(c=>c.color);
    if(ink){assert(colors.every(c=>c==='#625e52'||c==='#282b29'),'ink clockwork stays muted grey');}
    else{assert(colors.includes('#59bab6')&&colors.includes('#c39b58'));}
    h.fx.reset();assert.equal(h.fx.debug().cut,false);assert.equal(h.fx.debug().zaps,0);assert.equal(h.fx.debug().bombs,0);
  }
});
test('a missing Seoha portrait falls back to her own ultimate text without requesting repeatedly or using the memory hero',()=>{
  const h=harness({missingPortrait:true}),s=state('seoha'),n=h.loaded.length;
  h.fx.onEvent('bomb',s,0);h.fx.drawTexts(h.g,.3);h.fx.draw(h.g,s,.3);
  assert.equal(h.fx.debug().cut,false);assert(h.calls.some(c=>c.kind==='text'&&c.text==='되찾은 시간'));
  assert(!h.calls.some(c=>c.kind==='image'));assert.equal(h.loaded.length,n);
});
