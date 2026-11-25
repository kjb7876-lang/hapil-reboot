'use strict';
/* 기억사수 성장(사용자 11-16): 패시브 공격 7단계·필살기 7단계·구름 위 시계(보통·가속·둔화)·영웅 둘레 적탄 둔화 7단계.
   그림은 m0 기억사수 이펙트 시트(Dots)를 수묵으로 구운 것. 감싸는 원·십자가 없음. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{clear,idle,put,root}=h;
const A=()=>h.need();

test('attack level climbs 1→7 from kills and pattern breaks, keeps its level and experience after a hit, and starts higher deeper in the journey',()=>{
 const a=A(),s=a.createRun({difficulty:'normal',seed:2});
 assert.equal(s.power,1);assert.equal(a.POWER_EXP.length,7);assert.equal(a.MAX_LEVEL,7);
 for(let l=2;l<=7;l++){a.gainExp(s,Math.ceil((a.POWER_EXP[l-1]-s.exp)*100/a.POWER_EXP_RATE));assert.equal(s.power,l);assert(s.events.includes('powerUp'));clear(s);}
 a.gainExp(s,99999);assert.equal(s.power,7,'capped at 7');
 const b=idle();b.exp=a.POWER_EXP[4];b.power=5;b.bombs=0;b.noDistort=true;put(b,b.player.x,b.player.y,{bage:100});a.step(b,{dx:0,dy:0});
 assert.equal(b.player.hp,b.rules.hp-1);assert.equal(b.power,5);assert.equal(b.exp,a.POWER_EXP[4]);
 const late=a.createRun({difficulty:'normal',seed:2,stage:30,growth:true});assert.equal(a.createRun({difficulty:'normal',seed:2,stage:30}).power,1,'only when the app asks');assert(late.power>=4&&late.power<=5&&late.bombLevel>=4,'continuing deep in the journey');
});

test('every hero earns 90% attack experience and keeps progress after a hit',()=>{
 const a=A();
 for(const hero of ['memory','seoha','seoha-b']){
  const s=idle({hero,distort:false});
  for(let i=0;i<9;i++)a.gainExp(s,1);
  const total=hero==='memory'?810:1620;
  assert.equal(s.exp,Math.floor(total/100));
  assert.equal(s.expRemainder,total%100);
  s.power=4;s.exp=a.POWER_EXP[3]+5;s.bombs=0;
  put(s,s.player.x,s.player.y,{bage:100});
  a.step(s,{});
  assert.equal(s.hits,1);
  assert.equal(s.power,4);
  assert.equal(s.exp,a.POWER_EXP[3]+5);
  assert.equal(s.expRemainder,total%100);
 }
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
 const t=idle();t.tick=1000;a.gainExp(t,Math.ceil(a.POWER_EXP[1]*100/a.POWER_EXP_RATE));assert.equal(a.clockState(t),'haste');t.player.focus=true;assert.equal(a.clockState(t),'slow');t.player.focus=false;t.tick+=a.HASTE_TICKS;assert.equal(a.clockState(t),'normal');
});

test('enemy bullets slow down near the hero (stronger each level, stronger while Seoha focuses — user 11-20); far bullets are untouched',()=>{
 const a=A(),move=(l,dist,focus)=>{const s=idle({hero:'seoha'});s.power=l;s.player.focus=!!focus;put(s,s.player.x+dist,s.player.y-dist,{bage:100,bs:60,ba:0});const x0=s.bx[0];a.step(s,{dx:0,dy:0,focus:!!focus});return s.bx[0]-x0;};
 const far=move(1,200);assert(Math.abs(far-1)<1e-6,'far bullet moves at full speed');
 let prevR=0,prevK=0;for(let l=1;l<=7;l++){const [r,k]=a.SLOW_FIELD[l];assert(r>prevR&&k>prevK);prevR=r;prevK=k;}
 const near1=move(1,12),near7=move(7,12),focus7=move(7,12,true);
 assert(near1<1&&near7<near1&&focus7<near7,`slower with level and focus: ${near1} ${near7} ${focus7}`);
 assert(a.slowField({player:{focus:true},power:7})[1]<=.777+1e-9,'never freezes bullets');assert(Math.abs(a.slowField({player:{focus:true},power:7})[1]-.777)<1e-9,'user 11-20: focus slows up to 77.7%');
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
 assert(/cutPortrait\(cut\.hero\)/.test(fn)&&/function cutinKey\(id\).*:'cutin'/.test(src)&&/cut\.name/.test(fn)&&/필살 Lv\./.test(fn),'selected hero portrait with memory fallback, bomb name and level');
 assert(!/arc\([^)]*TAU\)[^;]*;\s*g\.stroke\(\)/.test(fn),'no ring');assert(!/rgb\(\s*1[5-9]\d|rgb\(2[0-4]\d,\s*[0-6]\d,/.test(fn),'no seal red in the cut-in');
 assert(/drawCutin\(g,t/.test(src.slice(src.indexOf('function drawTexts'))),'drawn on top of the field');
});

test('no module-level function in the hero effects file is declared twice (a later twin silently replaced the level 1-2 shot brush and hid the hero bullets)',()=>{
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8'),names=[...src.matchAll(/^  function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]),seen=new Set(),dup=names.filter(n=>seen.has(n)||!seen.add(n));
 assert(names.length>15&&names.includes('shots')&&names.includes('drawCutin'));assert.deepEqual(dup,[]);
});

test('a hit with a bomb left fires the bomb instead of costing a life (auto bomb); with none left the life goes',()=>{
 const a=A(),s=idle();s.noDistort=true;s.bombs=2;s.power=4;s.exp=a.POWER_EXP[3];const hp=s.player.hp,lv=s.bombLevel;
 put(s,s.player.x,s.player.y,{bage:100});a.step(s,{dx:0,dy:0});
 assert.equal(s.player.hp,hp,'no life lost');assert.equal(s.bombs,1,'one bomb spent');assert(s.events.includes('autoBomb')&&s.events.includes('bomb'));
 assert.equal(s.autoBombs,1);assert.equal(s.hits,1,'still counts as a hit for the no-hit star');assert.equal(s.power,4,'attack level kept');assert.equal(s.bombLevel,lv,'bomb level kept');assert.equal(s.lastBomb.auto,true);
 assert.equal(s.n,0,'the bomb clears the bullets');assert(s.player.invulnerableUntil>s.tick+60);
 const t=idle();t.noDistort=true;t.bombs=0;put(t,t.player.x,t.player.y,{bage:100});a.step(t,{dx:0,dy:0});assert.equal(t.player.hp,hp-1);assert(!t.events.includes('autoBomb'));
});

test('space-time distortion: a touching bullet slips past at 7% base whatever the attack level, +7% per equipped space-time fruit (77% with ten), and a slip-past spends no bomb',()=>{
 const a=A();assert.equal(a.DISTORT_BASE,.07);assert.equal(a.DISTORT_FRUIT,.07); // 사용자 11-25: 공격 단계 7→37% 대신 기본 7% 고정 + 성장나무 열매(arcade-v43-grove.test)
 const rate=(l,fruits)=>{let ok=0,N=3000;const s=idle({fruits});s.power=l;s.exp=a.POWER_EXP[l-1];s.bombs=0;
  for(let i=0;i<N;i++){s.power=l;s.player.hp=5;s.player.invulnerableUntil=0;s.n=0;s.stage='break';const d=s.distorts;put(s,s.player.x,s.player.y,{bage:100});a.step(s,{dx:0,dy:0});
   if(s.distorts>d){ok++;assert.equal(s.player.hp,5);assert(s.events.includes('distort'));assert(s.player.invulnerableUntil>=s.tick+a.DISTORT_TICKS-1);}clear(s);}
  return ok/N;};
 const r1=rate(1,0),r7=rate(7,0),f10=rate(1,10);assert(Math.abs(r1-.07)<.02,'Lv.1 '+r1);assert(Math.abs(r7-.07)<.02,'Lv.7 '+r7);assert(Math.abs(f10-.77)<.03,'ten fruits '+f10);
 const s=idle();s.bombs=2;s.power=7;let dist=0,auto=0;for(let i=0;i<400;i++){s.power=7;s.bombs=2;s.player.invulnerableUntil=0;s.n=0;const d=s.distorts,b=s.autoBombs;put(s,s.player.x,s.player.y,{bage:100});a.step(s,{dx:0,dy:0});if(s.distorts>d){dist++;assert.equal(s.autoBombs,b,'a slip-past does not also spend a bomb');}else auto++;clear(s);}
 assert(dist>0&&auto>0);const off=a.createRun({difficulty:'normal',seed:1,distort:false});assert.equal(off.noDistort,true);
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8'),fx=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8');assert(/'distort'/.test(app)&&/function drawWarps/.test(fx)&&/자동 필살/.test(fx));
});

test('the bomb lands in 7 pulses after the cut-in; the total damage matches the old single hit, the bullets clear at once',()=>{
 const a=A();assert.equal(a.BOMB_PULSES,7);
 let seg=0;while(a.SEGMENTS[seg].kind!=='card')seg++;
 for(const lv of [1,4,7]){
  const mk=bomb=>{const s=a.createRun({difficulty:'normal',seed:3,segment:seg});s.noDistort=true;s.bombLevel=lv;s.bombs=1;let guard=0;while(s.stage!=='card'&&guard++<4000){s.player.invulnerableUntil=s.tick+99;a.step(s,{dx:0,dy:0});clear(s);}
   assert.equal(s.stage,'card');s.player.x=20;s.boss.hp=s.boss.maxHp=1e6;s.mobs.length=0;s.mobs.push({kind:'x',x:300,baseX:300,y:200,r:12,hp:900,maxHp:900,hitTick:-99,elite:false,score:10,age:0,shots:0,vx:0,vy:0,sway:0,swayRate:0,fire:'aim',first:9999,every:0,color:0,stopY:200,hold:99999,next:99999,hold2:0});
   let pulses=0,first=-1,last=-1,n0=null;for(let i=0;i<150;i++){s.player.invulnerableUntil=s.tick+99;s.boss.x=340;s.mobs[0]&&(s.mobs[0].x=300);a.step(s,{dx:0,dy:0,bomb:bomb&&i===0});if(i===0)n0=s.n;if(s.events.includes('bombPulse')){pulses++;if(first<0)first=s.tick;last=s.tick;assert.equal(s.pulseInfo.index,pulses);}clear(s);}
   return {s,pulses,first,last,n0};};
  const on=mk(true),off=mk(false);
  assert.equal(on.n0<=off.n0,true,'bullets clear at once');assert.equal(on.pulses,7,'seven pulses at level '+lv);assert(on.last-on.first>=60&&on.last-on.first<=90,'spread over about a second: '+(on.last-on.first));
  assert(Math.abs((off.s.boss.hp-on.s.boss.hp)-a.BOMB_POWER[lv][0])<1e-3,'boss total '+(off.s.boss.hp-on.s.boss.hp));
  assert(Math.abs((off.s.mobs[0].hp-on.s.mobs[0].hp)-a.BOMB_POWER[lv][1])<1e-3,'mob total');
 }
 const fx=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');assert(/function pulseFx/.test(fx)&&/function drawPulses/.test(fx)&&/'bombPulse'/.test(app));
});
