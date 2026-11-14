'use strict';
/* 드라이브 보스 레이저·문양 시트(11-14) — 레이저 질감, 스펠 시작 1초 문양, 섬광. 계속 도는 고리·문양은 넣지 않는다(사용자 결정). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs');
const table=JSON.parse(h.read('docs/v43/laser-sheets.json'));
const index=JSON.parse(h.read('media/arcade-v43-laser/index.json'));

test('v43 laser sheets: every Drive sheet number maps to the boss that appears in that order',()=>{
 const a=h.need(),order=[];a.SEGMENTS.filter(g=>g.kind==='card').forEach(g=>{if(!order.includes(g.actor))order.push(g.actor);});
 for(const [b,actor] of Object.entries(table.assign))assert.equal(actor,order[+b.slice(1)-1],b);
 assert.equal(table.assign.B05,'p1_comrade');assert.equal(table.assign.B16,'asmodeus');assert.equal(table.assign.B33,'p5_archon');
 assert(Object.keys(table.assign).length>=28,'all sheets on Drive are assigned');
});

test('v43 laser sheets: each assigned boss has a small baked atlas with beam, emblem and burst',()=>{
 for(const actor of Object.values(table.assign)){
  const e=index.sheets[actor];assert(e,'atlas for '+actor);
  const f=path.join(h.root,'media/arcade-v43-laser',e.file);assert(fs.existsSync(f),f);
  assert(fs.statSync(f).size<=40*1024,'atlas stays small: '+e.file+' '+fs.statSync(f).size);
  for(const k of ['beam','emblem','burst'])assert.equal(e[k].length,4,k);
 }
});

test('v43 laser sheets: the emblem shows only briefly at spell start behind the boss, and lasers keep a white core',()=>{
 const app=h.read('src/arcade-app-v43.js');
 const t=+/EMBLEM_TIME=([\d.]+)/.exec(app)[1];assert(t>0&&t<=1.2,'emblem lasts about a second: '+t);
 assert(/var ls=big&&laserSheet\(s\)/.test(app),'only a spell start (big cast) shows the emblem');
 const order=/drawSkillFx\(s\);drawEmblems\(s\);drawIllusions\(s\);drawBoss\(s\)/.test(app);assert(order,'the emblem is drawn behind the boss');
 const body=/function drawLasers[\s\S]*?\n  \}/.exec(app)[0];
 assert(/sheet\.e\.beam/.test(body),'active lasers use the boss beam texture');
 assert(/strokeStyle='#ffffff'/.test(body),'the white core that marks the hit width stays');
 assert(!/emblems[^;]*rotate|spin/.test(/function drawEmblems[\s\S]*?\n  \}/.exec(app)[0]),'the emblem does not spin around the boss');
});
