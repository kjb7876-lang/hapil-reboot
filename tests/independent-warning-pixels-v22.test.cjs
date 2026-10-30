'use strict';
// Independent CPU raster checks of actual committed hazards. The phase
// observations explicitly grant immunity; they are not natural/device play.
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../tools/audit-warning-footprints-v22.cjs');
let fixture;
function prepared(){if(!fixture)fixture={box:audit.runtime(),baseline:audit.runtime(audit.BASE),cache:new Map(),sources:{}};return fixture;}
test('actual vertical/horizontal/lattice warnings expose their committed outer edges on both qualities and all three modes',async()=>{
 const {box,baseline,cache,sources}=prepared(),rows=[];for(const group of [0,1,2,20])for(const mode of ['gentle','normal','hell']){const result=await audit.caseFor(box,baseline,group,mode,cache,sources);rows.push(...result.rows);}
 audit.gate(rows);assert.equal(rows.length,24);assert.deepEqual([...new Set(rows.map(r=>r.profile))].sort(),['horizontal','lattice','vertical']);assert(rows.every(r=>r.baseline.strongEdgeFraction===0),'the exact retained v21 pixel baseline independently reproduces faint boundaries');
});
test('full-width boundary cues stop at actual activation and do not reappear during harmless fading',async()=>{
 const {box,cache,sources}=prepared();for(const group of [0,1,2]){const w=audit.worldFor(box,group,'hell'),images=await audit.imagesFor(box,group,cache,sources),before=structuredClone(w),original=w.hazards.filter(h=>h.pressureCurtain),ids=new Set(original.map(h=>h.id)),start=original[0].activeAt,end=original[0].fadeAt;assert.equal(w.tick,start-1);
  const waiting=audit.paint(box,images,w);for(const h of original){const cue=waiting.metrics.warningFootprints.find(c=>c.id===h.id);assert(cue);for(const k of ['x1','y1','x2','y2','width','activeAt'])assert.equal(cue[k],h[k]);}assert.equal(JSON.stringify(w),JSON.stringify(before));
  for(const tick of [start,end-1,end]){while(w.tick<tick)box.HapilCore.step(w,{});const snap=structuredClone(w),out=audit.paint(box,images,w);assert(!out.metrics.warningFootprints.some(c=>ids.has(c.id)),'the warning contour is never a live-beam/fade decoration');assert(w.hazards.filter(h=>ids.has(h.id)).every(h=>h.phase===(tick<end?'active':'fade')));assert.equal(JSON.stringify(w),JSON.stringify(snap));}
 }
});
