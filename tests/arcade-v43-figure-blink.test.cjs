'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();
const figure=(kind='glyph')=>Object.assign({kind,age:200,warn:0,active:2000,width:24,turn:0,spin:0,cx:180,cy:300,follow:false,grazed:false},kind==='glyph'?{glyph:'hexagram',r:120,r0:120,r1:120,period:1e9,ring:48}:kind==='runes'?{fit:1,grow:1,rings:A.RUNE_RADII.map(r=>({r,n:3,gap:0,dir:1,phase:0}))}:{points:[0,400,360,400]});
const pointOn=f=>{const line=A.figureSegments(f)[0];return [(line[0]+line[2])/2,(line[1]+line[3])/2];};
function contact(kind,tick,difficulty='hell'){
 const s=h.idle({difficulty,distort:false});s.bombs=0;s.tick=tick-1;
 const f=figure(kind);s.figures=[f];[s.player.x,s.player.y]=pointOn(f);const hp=s.player.hp;
 A.step(s,{});return {s,f,hp};
}

test('figure lasers have synchronized full-geometry on, off and harmless charging windows',()=>{
 const f=figure(),other=figure();other.age=700;
 const counts={on:0,off:0,charge:0};
 for(let tick=0;tick<150;tick++){const phase=A.figurePhase(f,tick);counts[phase]++;assert.equal(phase,A.figurePhase(other,tick),'figures spawned at different times share openings');}
 assert.deepEqual(counts,{on:60,off:72,charge:18});
 assert.equal(A.figurePhase(f,60),'off');assert.equal(A.figurePhase(f,131),'off');
 assert.equal(A.figurePhase(f,132),'charge');assert.equal(A.figurePhase(f,149),'charge');assert.equal(A.figurePhase(f,150),'on');
 const before=A.figureSegments(f);for(const tick of [0,60,132,150]){A.figurePhase(f,tick);assert.deepEqual(A.figureSegments(f),before,'no spatial erasure in phase '+tick);}
 const warning=figure();warning.warn=60;warning.age=59;assert.equal(A.figurePhase(warning,1),'warn');
 warning.age=60;assert.equal(A.figurePhase(warning,1),'on');warning.age=warning.warn+warning.active;assert.equal(A.figurePhase(warning,1),'fade');
});

test('actual glyph, rune and zigzag collisions only damage during their illuminated phase',()=>{
 for(const kind of ['glyph','runes','zigzag'])for(const difficulty of ['normal','hell']){
  for(const tick of [60,90,131,132,149]){const r=contact(kind,tick,difficulty);assert.equal(r.s.player.hp,r.hp,kind+' harmless at '+tick);assert.equal(r.s.hits,0);assert.equal(r.s.graze,0);}
  for(const tick of [1,59,150]){const r=contact(kind,tick,difficulty);assert.equal(r.s.player.hp,r.hp-1,kind+' damages at '+tick);assert.equal(r.s.hits,1);}
 }
});

test('a focus-speed player can cross all six complete rune rings in one dark interval',()=>{
 const s=h.idle({difficulty:'hell'});s.bombs=0;s.tick=59;s.figures=[figure('runes')];
 s.player.x=180;s.player.y=524;const hp=s.player.hp,geometry=A.figureSegments(s.figures[0]);
 assert(geometry.length>300,'six closed circles remain present');
 for(let t=0;t<90;t++){A.step(s,{dx:0,dy:-2,focus:true});assert.equal(s.player.hp,hp,'dark traversal tick '+s.tick);h.clear(s);}
 assert.equal(s.tick,149);assert.equal(s.player.y,344);assert.equal(s.hits,0);
 // The same intact rings become dangerous again; stand on the innermost circumference at reactivation.
 s.player.x=180;s.player.y=360;A.step(s,{});assert.equal(s.player.hp,hp-1);
});

test('normal and hell use the same figure rhythm in live simulation, including initial warning',()=>{
 const make=difficulty=>{const s=h.idle({difficulty,distort:false});s.player.invulnerableUntil=1e9;const f=figure();f.age=0;f.warn=70;s.figures=[f];return s;};
 const normal=make('normal'),hell=make('hell'),seen=new Set();
 for(let t=0;t<450;t++){for(const s of [normal,hell])A.step(s,{});const phase=A.figurePhase(normal.figures[0],normal.tick);seen.add(phase);assert.equal(phase,A.figurePhase(hell.figures[0],hell.tick));assert.deepEqual(A.figureSegments(normal.figures[0]),A.figureSegments(hell.figures[0]));}
 assert.deepEqual([...seen].sort(),['charge','off','on','warn']);
});
