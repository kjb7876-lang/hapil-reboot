'use strict';
// 사용자 11-16 "십자가는 빼 다 육망성으로 바꿔 십자가들" "십자가는 항상좋은거야": 적이 쓰는 십자가(솟는 소재, 떨어지는 기물)는 모두 육망성으로 바꾼다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),root=path.join(__dirname,'..');
test('no enemy cross: neither a rising subject nor a falling prop',()=>{
  assert(!a.MOTIFS.cross,'no cross subject');assert(!a.MOTIF_WEST.includes('cross'));
  for(let i=0;i<a.STAGES.length;i++){assert(!a.motifPlan(i).includes('cross'),'stage '+i);}
  assert(a.PROPS.every(p=>p.key!=='cross'),'no cross prop');
  const art=fs.readFileSync(path.join(root,'src/ink-motifs-v43.js'),'utf8');assert.doesNotMatch(art,/M\.cross=function/);
});
test('the hexagram takes the cross places: rising ink subject and an upright falling prop',()=>{
  assert(a.MOTIFS.hexagram&&a.MOTIF_WEST.includes('hexagram'));
  const used=a.STAGES.filter((g,i)=>a.stageMotifs(i).includes('hexagram')).length;assert(used>=7,'hexagram stages '+used);
  const hx=a.PROPS.findIndex(p=>p.key==='hexagram');assert(hx>=0&&a.PROPS[hx].upright===true&&a.PROPS[hx].drawn===true);
  const art=fs.readFileSync(path.join(root,'src/ink-motifs-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
  assert.match(art,/M\.hexagram=function/);assert.match(app,/function drawHexagram\(/);
  let seen=0;for(let k=0;k<a.STAGES.length&&!seen;k++){const s=a.createRun({difficulty:'hell',seed:2+k,stage:k,stages:1});
    for(let t=0;t<30000&&s.stage!=='won'&&!seen;t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});for(let j=0;j<s.n;j++)if(s.bsize[j]===a.SHAPE_PROP&&s.bcolor[j]===hx)seen++;h.clear(s);}}
  assert(seen>0,'a hexagram prop falls somewhere');
});
test('the golden pattern and keepsake of the threshold stage are hexagrams too, and every falling prop is a real prop',()=>{
  const names=a.SEGMENTS.map(x=>x.name||'').concat(a.STAGES.map(g=>(g.reward&&g.reward.name)||''));
  assert(names.every(n=>n.indexOf('십자')<0),'no cross in pattern or keepsake names');
  const g=a.STAGES.find(x=>x.scene==='60');assert.equal(g.reward.key,'p8_goldhexagram');assert.equal(g.reward.name,'황금 육망성');
  const k=a.SEGMENTS.findIndex(x=>x.name==='황금 육망성');assert(k>=0);
  const s=a.createRun({difficulty:'normal',seed:4,segment:k});let props=0;
  for(let t=0;t<900;t++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});
    for(let j=0;j<s.n;j++)if(s.bsize[j]===a.SHAPE_PROP){props++;assert(a.PROPS[s.bcolor[j]],'prop '+s.bcolor[j]);assert.equal(a.PROPS[s.bcolor[j]].key,'hexagram');}h.clear(s);}
  assert(props>0);
  const man=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43/manifest.json'),'utf8'));assert(man['reward-p8_goldhexagram.webp'],'keepsake picture');
});
