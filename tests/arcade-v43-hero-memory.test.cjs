'use strict';
/* 기억사수 성장(사용자 11-16): 패시브 공격 7단계·필살기 7단계·구름 위 시계(보통·가속·둔화)·영웅 둘레 적탄 둔화 7단계.
   그림은 m0 기억사수 이펙트 시트(Dots)를 수묵으로 구운 것. 감싸는 원·십자가 없음. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{clear,idle,put,root}=h;
const A=()=>h.need();

test('attack level climbs 1→7 from kills and pattern breaks, drops one level on a hit, and starts higher deeper in the journey',()=>{
 const a=A(),s=a.createRun({difficulty:'normal',seed:2});
 assert.equal(s.power,1);assert.equal(a.POWER_EXP.length,7);assert.equal(a.MAX_LEVEL,7);
 for(let l=2;l<=7;l++){a.gainExp(s,a.POWER_EXP[l-1]-s.exp);assert.equal(s.power,l);assert(s.events.includes('powerUp'));clear(s);}
 a.gainExp(s,99999);assert.equal(s.power,7,'capped at 7');
 const b=idle();b.exp=a.POWER_EXP[4];b.power=5;put(b,b.player.x,b.player.y,{bage:100});a.step(b,{dx:0,dy:0});
 assert.equal(b.player.hp,b.rules.hp-1);assert.equal(b.power,4,'a hit costs one attack level');assert(b.events.includes('powerDown'));
 const late=a.createRun({difficulty:'normal',seed:2,stage:30,growth:true});assert.equal(a.createRun({difficulty:'normal',seed:2,stage:30}).power,1,'only when the app asks');assert(late.power>=4&&late.power<=5&&late.bombLevel>=4,'continuing deep in the journey');
});

test('each attack level fires more and faster, but firepower grows gently (×1.8 at level 7) so boss patterns still play out',()=>{
 const a=A();let prev=0;
 for(let l=1;l<=7;l++){const q=a.POWER_SHOTS[l],volleys=q[0]*60/q[1]+q[2]*60/q[3];assert(volleys>=prev,'level '+l+' fires at least as much');prev=volleys;
  const dps=(q[0]*60/q[1]+q[2]*60/q[3]+(q[4]?q[4]*q[6]*60/q[5]:0))*a.SHOT_DAMAGE[l],base=(2*60/5+2*60/8);assert(Math.abs(dps/base-a.POWER_DPS[l])<1e-9);}
 assert(a.POWER_SHOTS[7][1]<a.POWER_SHOTS[1][1],'level 7 main gun fires faster (accelerated attack)');assert.equal(a.POWER_DPS[7],1.8);
 assert(a.POWER_SHOTS[5][4]>0&&a.POWER_SHOTS[4][4]===0,'memory bolt from level 5');
 const count=l=>{const s=idle();s.power=l;s.exp=a.POWER_EXP[l-1];s.mobs.length=0;let shots=0;for(let i=0;i<120;i++){const before=s.sn;a.step(s,{dx:0,dy:0});shots+=Math.max(0,s.sn-before);clear(s);}return shots;};
 assert(count(7)>count(1)*2,'level 7 visibly fills the screen with more shots');
});

test('memory bolt strikes the nearest foe and leaves a drawable zap; haste shortens the gun interval after a level up',()=>{
 const a=A(),s=idle();s.power=5;s.exp=a.POWER_EXP[4];
 s.mobs.push({kind:'x',x:s.player.x+30,baseX:s.player.x+30,y:200,r:12,hp:50,maxHp:50,hitTick:-99,elite:false,score:10,age:0,shots:0,vx:0,vy:0,sway:0,swayRate:0,fire:'aim',first:9999,every:0,color:0,stopY:200,hold:99999,next:99999});
 for(let i=0;i<70;i++){a.step(s,{dx:0,dy:0});clear(s);}
 assert(s.zaps.length>=5,'a zap was recorded');assert(s.mobs.length===0||s.mobs[0].hp<50);
 const t=idle();t.tick=1000;a.gainExp(t,a.POWER_EXP[1]);assert.equal(a.clockState(t),'haste');t.player.focus=true;assert.equal(a.clockState(t),'slow');t.player.focus=false;t.tick+=a.HASTE_TICKS;assert.equal(a.clockState(t),'normal');
});

test('enemy bullets slow down near the hero (stronger each level, ×1.35 while focused); far bullets are untouched',()=>{
 const a=A(),move=(l,dist,focus)=>{const s=idle();s.power=l;s.player.focus=!!focus;put(s,s.player.x+dist,s.player.y-dist,{bage:100,bs:60,ba:0});const x0=s.bx[0];a.step(s,{dx:0,dy:0,focus:!!focus});return s.bx[0]-x0;};
 const far=move(1,200);assert(Math.abs(far-1)<1e-6,'far bullet moves at full speed');
 let prevR=0,prevK=0;for(let l=1;l<=7;l++){const [r,k]=a.SLOW_FIELD[l];assert(r>prevR&&k>prevK);prevR=r;prevK=k;}
 const near1=move(1,12),near7=move(7,12),focus7=move(7,12,true);
 assert(near1<1&&near7<near1&&focus7<near7,`slower with level and focus: ${near1} ${near7} ${focus7}`);
 assert(a.slowField({player:{focus:true},power:7})[1]<=.6,'never freezes bullets');
});

test('bomb level climbs with each full charge, scales damage, and hands the screen its level and targets',()=>{
 const a=A(),s=idle();s.bombs=0;assert.equal(s.bombLevel,1);
 for(let l=2;l<=7;l++){s.gauge+=a.GAUGE_FULL*(a.BOMB_FILLS[l-1]-s.fills);a.step(s,{dx:0,dy:0});assert.equal(s.bombLevel,l);clear(s);}
 for(let l=2;l<=7;l++)assert(a.BOMB_POWER[l][0]>a.BOMB_POWER[l-1][0]&&a.BOMB_POWER[l][1]>a.BOMB_POWER[l-1][1]);
 assert.equal(a.BOMB_POWER[1][0],40,'level 1 bomb keeps the old damage');assert.equal(new Set(a.BOMB_NAMES.slice(1)).size,7);
 s.bombs=1;a.step(s,{dx:0,dy:0,bomb:true});assert.equal(s.lastBomb.level,7);assert.equal(s.lastBomb.name,a.BOMB_NAMES[7]);assert(s.events.includes('bomb'));
 const before=s.bombLevel;put(s,s.player.x,s.player.y,{bage:100});s.player.invulnerableUntil=0;a.step(s,{dx:0,dy:0});assert.equal(s.bombLevel,before,'a hit keeps the bomb level');
});

test('hero effects come from the m0 memory-gunner sheets baked in ink; no wrapping rings or crosses are drawn; the page loads the script',()=>{
 const idx=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43-hero/index.json'),'utf8'));
 for(const k of ['shard','shatter','bolt','burst']){assert(idx[k]&&/gunner|pj04/.test(idx[k].source),k);for(const f of [k+'.webp',k+'-ink.webp'])assert(fs.statSync(path.join(root,'media/arcade-v43-hero',f)).size>1000,f);}
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8'),page=fs.readFileSync(path.join(root,'arcade.html'),'utf8');
 assert(!/십자|cross/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'')));
 assert(!/arc\([^)]*TAU\)[^;]*;\s*g\.stroke\(\)/.test(src),'no stroked full circle (rings) around the hero');
 const tags=[...page.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);assert(tags.indexOf('src/hero-memory-v43.js')>tags.indexOf('src/ink-v43.js')&&tags.indexOf('src/hero-memory-v43.js')<tags.indexOf('src/arcade-app-v43.js'));
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');for(const k of ['HeroFx.shots','HeroFx.clock','HeroFx.field','HeroFx.draw(','HeroFx.onEvent'])assert(app.includes(k),k);
});

test('bomb plays a short ink cut-in of the memory gunner: a hanji band with the portrait and the bomb name, under a second, no rings or seal red',()=>{
 const idx=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43-hero/index.json'),'utf8'));
 assert(idx.cutin&&/gunner/.test(idx.cutin.source));for(const f of ['cutin.webp','cutin-ink.webp'])assert(fs.statSync(path.join(root,'media/arcade-v43-hero',f)).size>5000,f);
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8'),fn=src.slice(src.indexOf('function drawCutin'),src.indexOf('function onEvent'));
 assert(fn.length>200,'drawCutin exists');const life=+/CUT_LIFE=([.\d]+)/.exec(src)[1];assert(life>.5&&life<=1.2,'short: '+life);
 assert(/cutPortrait\(\)/.test(fn)&&/img\.cutin/.test(src)&&/cut\.name/.test(fn)&&/필살 Lv\./.test(fn),'portrait, bomb name and level');
 assert(!/arc\([^)]*TAU\)[^;]*;\s*g\.stroke\(\)/.test(fn),'no ring');assert(!/rgb\(\s*1[5-9]\d|rgb\(2[0-4]\d,\s*[0-6]\d,/.test(fn),'no seal red in the cut-in');
 assert(/drawCutin\(g,t/.test(src.slice(src.indexOf('function drawTexts'))),'drawn on top of the field');
});

test('no module-level function in the hero effects file is declared twice (a later twin silently replaced the level 1-2 shot brush and hid the hero bullets)',()=>{
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8'),names=[...src.matchAll(/^  function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]),seen=new Set(),dup=names.filter(n=>seen.has(n)||!seen.add(n));
 assert(names.length>15&&names.includes('shots')&&names.includes('drawCutin'));assert.deepEqual(dup,[]);
});
