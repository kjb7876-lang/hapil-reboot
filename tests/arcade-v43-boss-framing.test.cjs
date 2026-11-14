'use strict';
/* 7전문가 심사 반복 지적(11-15 새벽): 보스가 화면 위에 붙어 체력 띠·스펠 이름과 겹치고, PC 1280x800에서 좌우 패널 아래가 비어 있다.
   보스는 스펠 중 조금 더 아래에 머물고, PC 패널은 플레이 칸 높이를 채우며 아래쪽에 조작법과 지금 스펠 이름을 둔다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 framing: during a spell the boss rests clear of the top HUD band but stays in the upper third',()=>{
 const a=h.need(),i=a.SEGMENTS.findIndex(g=>g.kind==='card'&&g.spell);
 const s=a.createRun({difficulty:'normal',seed:5,segment:i,stages:1}),ys=[];
 for(let t=0;t<1500&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
  if(s.stage==='card'&&s.segTick>120)ys.push(s.boss.y);}
 assert(ys.length>300,'sampled the spell');
 const sorted=[...ys].sort((p,q)=>p-q),median=sorted[sorted.length>>1];
 assert(sorted[0]>=136,'boss never hugs the top: min y '+sorted[0].toFixed(0));
 assert(median>=150,'boss usually rests lower: median y '+median.toFixed(0));
 assert(sorted[sorted.length-1]<=a.HEIGHT/3,'boss stays in the upper third: max y '+sorted[sorted.length-1].toFixed(0));
});

test('v43 framing: PC side panels span the play field and fill their lower part with controls and the spell name',()=>{
 const app=h.read('src/arcade-app-v43.js'),page=h.read('arcade.html');
 const place=/function placeHud\(\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/hudOut==='side'[\s\S]*height:'\+px\(/.test(place),'side panels get a height tied to the field');
 assert(/\.hudx\.side\{[^}]*justify-content:space-between/.test(page),'side panel content spreads top to bottom');
 const dom=/function domHud\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/class="keys"/.test(dom),'left panel lists the controls');
 assert(/class="spell"/.test(dom),'right panel shows the current spell name');
 assert(/\.hudx\.side \.spell\{/.test(page)&&/\.hudx\.side \.keys\{/.test(page),'styled');
});
