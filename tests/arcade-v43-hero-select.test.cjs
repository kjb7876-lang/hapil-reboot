'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Heroes=require('../src/arcade-heroes-v43.js');
const source=fs.readFileSync(path.join(__dirname,'../src/arcade-hero-select-v43.js'),'utf8');

// A small DOM/event harness exercises the real selector callbacks. Layout is
// covered separately by the Chromium UI checks, not inferred from this stub.
function harness(){
 const listeners=new Map(),loaded=[];let doc;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.style={};this.events={};this.className='';this.hidden=false;this.isConnected=true;this.offsetWidth=300;this._text='';
   this.classList={add:n=>{this.className+=' '+n;},remove:n=>{this.className=this.className.split(/\s+/).filter(v=>v!==n).join(' ');}};}
  appendChild(child){this.children.push(child);return child;}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=v;if(k==='class')this.className=v;}
  getAttribute(k){return this.attrs[k];}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text;}
  set innerHTML(html){this.children=[];for(const [,tag,attrs]of html.matchAll(/<([a-z][a-z0-9-]*)([^>]*)>/gi)){
   const child=new Element(tag);for(const [,key,value]of attrs.matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(key,value);this.children.push(child);
  }}
  querySelector(selector){const match=n=>selector[0]==='#'?n.id===selector.slice(1):selector[0]==='.'?n.className.split(/\s+/).includes(selector.slice(1)):n.tagName===selector.toUpperCase();
   for(const child of this.children){if(match(child))return child;const found=child.querySelector(selector);if(found)return found;}return null;}
  addEventListener(type,fn){(this.events[type]||(this.events[type]=[])).push(fn);}
  click(){for(const fn of this.events.click||[])fn({target:this});}
  focus(){doc.activeElement=this;}
 }
 const head=new Element('head'),host=new Element('main'),previous=new Element('button');
 doc={head,activeElement:previous,createElement:tag=>new Element(tag),getElementById:id=>head.querySelector('#'+id)||host.querySelector('#'+id),
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
 class Image{set src(value){loaded.push(value);}}
 const w={document:doc,Image,HapilArcadeHeroes:Heroes};w.window=w;vm.runInNewContext(source,w);
 const picker=w.HapilHeroSelect.mount(host),el=id=>doc.getElementById(id),root=el('arcade-hero-select');
 function key(key,patch={}){const event={key,target:doc.activeElement,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...patch};for(const fn of listeners.get('keydown')||[])fn(event);return event;}
 return {picker,root,el,key,doc,previous,loaded};
}

test('all three profiles have selectable labels, original A art, B art and their own descriptions',()=>{
 const h=harness();h.picker.show('memory',()=>{});
 assert.deepEqual(Heroes.list().map(p=>p.id),['memory','seoha','seoha-b']);
 for(const [index,p]of Heroes.list().entries()){
  h.el('hero-select-'+p.id).click();assert.equal(h.root.dataset.hero,p.id);
  assert.equal(h.el('hero-select-name').textContent,p.name);assert.equal(h.el('hero-select-title').textContent,p.title);
  assert.equal(h.el('hero-select-description').textContent,p.description);assert.equal(h.el('hero-select-number').textContent,String(index+1).padStart(2,'0'));
  assert.equal(h.el('hero-select-shot').textContent,p.shotLabel);assert.equal(h.el('hero-select-bomb').textContent,p.bombLabel);
  assert.equal(h.el('hero-select-portrait').src,p.portrait);
  assert.deepEqual(h.el('hero-select-abilities').children.map(n=>n.textContent),p.abilities);
  assert.equal(h.el('hero-select-'+p.id).getAttribute('aria-pressed'),'true');
 }
 assert.notEqual(Heroes.get('seoha').portrait,Heroes.get('seoha-b').portrait);
 assert.equal(h.loaded.length,3,'three portraits preload once');h.picker.hide();h.picker.show('seoha-b',()=>{});assert.equal(h.loaded.length,3);
});

test('left/right and up/down cycle all three heroes in their respective direction',()=>{
 const h=harness();h.picker.show('memory',()=>{});
 for(const id of ['seoha','seoha-b','memory']){const e=h.key('ArrowRight');assert(e.prevented&&e.stopped);assert.equal(h.root.dataset.hero,id);assert.equal(h.doc.activeElement,h.el('hero-select-'+id));}
 for(const id of ['seoha-b','seoha','memory']){h.key('ArrowLeft');assert.equal(h.root.dataset.hero,id);}
 h.key('ArrowUp');assert.equal(h.root.dataset.hero,'seoha-b');h.key('ArrowDown');assert.equal(h.root.dataset.hero,'memory');
});

test('B confirms its exact ID, Escape cancels, and the tab trap includes all five controls',()=>{
 const h=harness(),confirmed=[];let cancelled=0;h.picker.show('memory',id=>confirmed.push(id),()=>cancelled++);
 h.el('hero-select-seoha-b').click();assert.deepEqual(confirmed,[],'selecting a portrait does not start a run');
 h.el('hero-select-confirm').focus();h.key('Tab');assert.equal(h.doc.activeElement,h.el('hero-select-memory'));
 h.key('Tab',{shiftKey:true});assert.equal(h.doc.activeElement,h.el('hero-select-confirm'));
 h.el('hero-select-seoha-b').focus();assert.equal(h.key('Tab').prevented,undefined,'B is inside the trap, before cancel');
 h.key('Enter');assert.deepEqual(confirmed,['seoha-b']);assert.equal(h.root.hidden,true);assert.equal(h.doc.activeElement,h.previous);
 h.picker.show('seoha',id=>confirmed.push(id),()=>cancelled++);h.key('Escape');assert.equal(cancelled,1);assert.deepEqual(confirmed,['seoha-b']);assert.equal(h.root.hidden,true);
 h.key('Enter');assert.deepEqual(confirmed,['seoha-b'],'hidden selector does not retain key listeners');
});
