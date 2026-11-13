'use strict';
/* 이름 붙은 패턴마다 화면 탄 최고치를 잰다(기본/지옥). usage: node tools/measure-density-v43.cjs [max] */
const a=require('../src/arcade-v43.js'),lim=+process.argv[2]||1e9;
function peak(i,difficulty){const s=a.createRun({difficulty,seed:31+i,segment:i,stages:1});let most=0;
 for(let t=0;t<1500&&s.seg===i&&s.stage!=='won'&&s.stage!=='lost';t++){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});if(s.stage==='card'&&s.n>most)most=s.n;s.events.length=0;s.cancelled.length=0;s.pops.length=0;}return most;}
const rows=[];a.SEGMENTS.forEach((g,i)=>{if(g.kind!=='card'||!g.spell)return;rows.push([peak(i,'normal'),peak(i,'hell'),a.STAGES[g.stage].scene,g.name]);});
rows.sort((x,y)=>x[0]-y[0]);for(const r of rows)if(r[0]<=lim)console.log(r.join('\t'));
const n=rows.map(r=>r[0]);console.log('patterns',rows.length,'median',n[n.length>>1],'under150',n.filter(x=>x<150).length,'over450',n.filter(x=>x>450).length);
