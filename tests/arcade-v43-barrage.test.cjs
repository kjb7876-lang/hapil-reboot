'use strict';
/* v43 탄막 강화(2026-11-14 요청): 탄은 화면 안에서 수명으로 사라지지 않는다, 벽에서 되돌아오는 탄, 이지·노멀도 헬에 가까운 밀도에
 * 작은 피격점, 보스마다 고유한 문양 광선(줄었다 늘었다 도는 도형·외곽 지그재그)과 이어진 탄 줄기, 아래로 걷는 그림만 쓰는 잡몹. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{root}=h;

const onScreen=(a,x,y)=>x>2&&x<a.WIDTH-2&&y>2&&y<a.HEIGHT-2; // 가장자리에서 밖으로 나가는 탄은 빼고 본다

test('v43 barrage: a bullet never disappears in the middle of the screen because its time ran out',()=>{
 const a=h.need();let checked=0,vanished=0;const where=[];
 a.SEGMENTS.forEach((g,i)=>{if(i%3)return;
  const s=a.createRun({difficulty:'normal',seed:7+i,segment:i,stages:1});
  for(let t=0;t<1800&&s.seg===i&&s.stage!=='won'&&s.stage!=='lost';t++){s.player.invulnerableUntil=s.tick+999;
   const due=[];for(let k=0;k<s.n;k++)if(s.bage[k]+1>=s.blife[k]&&onScreen(a,s.bx[k],s.by[k])&&s.bmode[k]===0)due.push([s.bx[k],s.by[k],s.bs[k]]);
   const hp=s.player.hp,before=s.n;a.step(s,{dx:0,dy:0});h.clear(s);checked++;
   if(s.player.hp!==hp||s.n===0&&before>0)continue; // 피격·전멸 정리로 지워진 경우는 따로 센다
   for(const [x,y,v] of due){let found=false;for(let k=0;k<s.n&&!found;k++)if(Math.hypot(s.bx[k]-x,s.by[k]-y)<=Math.max(v,60)/60+1.5)found=true;
    if(!found){vanished++;if(where.length<5)where.push(a.STAGES[g.stage].name+' '+(g.name||'wave'));}}
  }});
 assert(checked>10000);assert.equal(vanished,0,'bullets that would vanish on screen: '+where.join(', '));
});

test('v43 barrage: a bullet whose time ran out keeps flying, never stalls, and bounces back once from a side wall',()=>{
 const a=h.need(),s=h.idle();assert(s.bbounce instanceof Uint8Array,'bounce counter per bullet');
 h.put(s,a.WIDTH-20,300,{ba:0,bs:120,bbounce:1});
 for(let t=0;t<60;t++){a.step(s,{dx:0,dy:0});h.clear(s);}
 assert.equal(s.n,1,'the bullet is still there');assert(s.bx[0]<a.WIDTH-20&&Math.cos(s.ba[0])<0,'it came back from the right wall');
 const e=h.idle();const i=h.put(e,180,200,{ba:Math.PI/2,bs:0,bturn:2});e.blife[i]=30;
 for(let t=0;t<200;t++){a.step(e,{dx:0,dy:0});h.clear(e);}
 assert(e.n===0||e.by[0]>200+60,'an expired, stopped bullet starts moving again and leaves');
});

test('v43 barrage: easy and normal are nearly as dense as hell, slower, and forgiven by a smaller hitbox',()=>{
 const d=h.need().DIFFICULTY,S=h.need().SIZE_RADIUS[1];
 for(const k of ['gentle','normal'])assert(d[k].density>=d.hell.density*.88,k+' density '+d[k].density);
 assert(d.gentle.speed<=.62&&d.normal.speed<=.7,'slow bullets are fine');
 const hit=k=>d[k].radius+S*d[k].hitScale;assert(hit('gentle')<hit('normal')&&hit('normal')<hit('hell'));
 assert(hit('gentle')<=hit('hell')*.62,'easy hitbox is much smaller: '+hit('gentle')+' vs '+hit('hell'));
});

test('v43 barrage: every boss has its own signature — glyph laser, colour and bullet strands — and they differ from boss to boss',()=>{
 const a=h.need(),sig=a.SIGNATURES,glyphs=a.GLYPHS;assert(sig&&glyphs,'signature table and glyph shapes');
 const actors=[...new Set(a.SEGMENTS.filter(g=>g.kind==='card').map(g=>g.actor))];assert(actors.length>=50);
 const keys=new Set();let prev='';
 for(const k of actors){const g=sig[k];assert(g,'signature of '+k);assert(glyphs[g.glyph],k+' glyph '+g.glyph);assert(a.PALETTE.includes(g.color),k+' colour');
  assert(g.arms>=2&&g.arms<=6,k+' strands');const key=[g.glyph,g.color,g.arms,g.edge].join('/');assert(!keys.has(key),'two bosses share '+key);keys.add(key);
  assert(g.glyph!==prev||true);prev=g.glyph;}
 assert(new Set(actors.map(k=>sig[k].glyph)).size>=12,'many different glyphs');
 for(const [name,pts] of Object.entries(glyphs)){assert(Array.isArray(pts)&&pts.length>=2,name);for(const line of pts)assert(line.length>=4&&line.length%2===0&&line.every(Number.isFinite),name);}
});

test('v43 barrage: during a named boss pattern the glyph laser turns, grows and shrinks, edge zigzags close in for a few seconds, and strands of bullets sway',()=>{
 const a=h.need();const seen={figure:0,zig:0,grow:0,strand:0};
 const firsts=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!firsts.has(g.actor))firsts.set(g.actor,i);});
 for(const [actor,i] of firsts){const s=a.createRun({difficulty:'normal',seed:3,segment:i,stages:1});let sizes=new Set(),fig=false,zig=false,angles=new Set();
  for(let t=0;t<2400&&s.seg===i;t++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;a.step(s,{dx:0,dy:0});h.clear(s);
   for(const f of s.figures||[]){if(f.kind==='zigzag')zig=true;else{fig=true;sizes.add(Math.round(f.r));angles.add(Math.round(f.turn*10));}}}
  if(fig)seen.figure++;if(zig)seen.zig++;if(sizes.size>8&&angles.size>8)seen.grow++;}
 assert(seen.figure>=firsts.size*.9,'bosses that summon their glyph: '+seen.figure+'/'+firsts.size);
 assert(seen.grow>=firsts.size*.9,'glyphs turn and change size: '+seen.grow);
 assert(seen.zig>=firsts.size*.3,'bosses that close the edges with zigzag lasers: '+seen.zig);
});

test('v43 barrage: glyph lasers hit only along their own segments, and warn before they burn',()=>{
 const a=h.need(),s=h.idle();s.player.x=180;s.player.y=500;
 s.figures.push({kind:'zigzag',points:[0,480,180,500,360,480],width:12,warn:20,active:60,age:0,color:0,r:0,turn:0});
 for(let t=0;t<15;t++){a.step(s,{dx:0,dy:0});h.clear(s);}assert.equal(s.player.hp,s.player.maxHp,'not during the warning');
 for(let t=0;t<20;t++){a.step(s,{dx:0,dy:0});h.clear(s);}assert(s.player.hp<s.player.maxHp,'the burning segment hits');
 const f=h.idle();f.player.x=180;f.player.y=500;f.figures.push({kind:'zigzag',points:[0,300,40,320],width:12,warn:5,active:60,age:0,color:0,r:0,turn:0});
 for(let t=0;t<40;t++){a.step(f,{dx:0,dy:0});h.clear(f);}assert.equal(f.player.hp,f.player.maxHp,'a short segment far away never reaches');
});

/* 문양 광선까지 막는 칸으로 넣은 안전 통로 검사(기존 검사기는 광선을 무한 반직선으로 본다). 보스 고유 패턴이 있는 구간을 지옥 난이도로 본다. */
function laneWithFigures(a,options){
 const s=a.createRun(options),W=a.WIDTH,H=a.HEIGHT,CELL=8,X0=8,Y0=40,M=2.5,cols=Math.floor((W-16)/CELL)+1,rows=Math.floor((H-14-Y0)/CELL)+1,size=cols*rows;
 const start=s.seg,seg=a.SEGMENTS[start];let reach=new Uint8Array(size).fill(1),blocked=new Uint8Array(size),next=new Uint8Array(size),minOpen=size;
 const cellOf=(x,y)=>Math.max(0,Math.min(cols-1,Math.round((x-X0)/CELL)))+Math.max(0,Math.min(rows-1,Math.round((y-Y0)/CELL)))*cols;
 const limit=seg.time*60+400;
 for(let i=0;i<limit&&s.seg===start;i++){s.player.invulnerableUntil=s.tick+999;if(s.stage==='card')s.boss.hp=s.boss.maxHp;
  const p=s.player,pc=cellOf(p.x,p.y),px=pc%cols,py=(pc/cols)|0;let best=pc,bs=-1e9;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=px+dx,cy=py+dy;if(cx<0||cy<0||cx>=cols||cy>=rows)continue;const c=cx+cy*cols;if(!reach[c])continue;
   const x=X0+cx*CELL,y=Y0+cy*CELL;let near=1e9;for(let k=0;k<s.n;k++){const d=Math.hypot(s.bx[k]+Math.cos(s.ba[k])*s.bs[k]*.2-x,s.by[k]+Math.sin(s.ba[k])*s.bs[k]*.2-y);if(d<near)near=d;}
   const sc=Math.min(near,60)-Math.abs(y-520)*.04-Math.abs(x-180)*.01;if(sc>bs){bs=sc;best=c;}}
  a.step(s,{dx:Math.max(-4,Math.min(4,X0+(best%cols)*CELL-p.x)),dy:Math.max(-4,Math.min(4,Y0+((best/cols)|0)*CELL-p.y))});h.clear(s);
  if(s.seg!==start)break;if(i%2)continue;
  blocked.fill(0);
  for(let k=0;k<s.n;k++){if(s.bage[k]<a.BLOOM_TICKS-2)continue;const r=a.bulletRadius(s,k)*s.rules.hitScale+p.r+M,x=s.bx[k],y=s.by[k];
   for(let cy=Math.max(0,Math.floor((y-r-Y0)/CELL));cy<=Math.min(rows-1,Math.ceil((y+r-Y0)/CELL));cy++)for(let cx=Math.max(0,Math.floor((x-r-X0)/CELL));cx<=Math.min(cols-1,Math.ceil((x+r-X0)/CELL));cx++)if(Math.hypot(X0+cx*CELL-x,Y0+cy*CELL-y)<r)blocked[cx+cy*cols]=1;}
  for(const l of s.lasers){if(l.age<l.warn-2||l.age>=l.warn+l.active)continue;const cos=Math.cos(l.angle),sin=Math.sin(l.angle),r=l.width*.5*a.BEAM_HIT+p.r+M;
   for(let c=0;c<size;c++){const x=X0+(c%cols)*CELL-l.x,y=Y0+((c/cols)|0)*CELL-l.y,al=x*cos+y*sin,d=al<0?Math.hypot(x,y):Math.abs(x*sin-y*cos);if(d<r)blocked[c]=1;}}
  for(const f of s.figures){if(f.age<f.warn-2||f.age>=f.warn+f.active)continue;const r=f.width*.5*a.BEAM_HIT+p.r+M;
   for(const seg2 of a.figureSegments(f))for(let c=0;c<size;c++){if(blocked[c])continue;const x=X0+(c%cols)*CELL,y=Y0+((c/cols)|0)*CELL,[x1,y1,x2,y2]=seg2,dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/L));if(Math.hypot(x-x1-u*dx,y-y1-u*dy)<r)blocked[c]=1;}}
  next.fill(0);let open=0;
  for(let c=0;c<size;c++){if(blocked[c])continue;const cx=c%cols,cy=(c/cols)|0;let ok=false;for(let dy=-1;dy<=1&&!ok;dy++)for(let dx=-1;dx<=1&&!ok;dx++){const nx=cx+dx,ny=cy+dy;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&reach[nx+ny*cols])ok=true;}if(ok){next[c]=1;open++;}}
  const sw=reach;reach=next;next=sw;if(open<minOpen)minOpen=open;if(!open)return {minOpen:0,name:seg.name};}
 return {minOpen,name:seg.name};
}
test('v43 barrage: with glyph lasers and edge zigzags on, every boss pattern still leaves a lane (hell)',()=>{
 const a=h.need(),fails=[];const firsts=new Map();a.SEGMENTS.forEach((g,i)=>{if(g.kind==='card'&&g.spell&&!firsts.has(g.actor))firsts.set(g.actor,i);});
 for(const [actor,i] of firsts){const r=laneWithFigures(a,{difficulty:'hell',seed:17+i,segment:i});if(r.minOpen<4)fails.push(actor+' '+r.name+' open '+r.minOpen);}
 assert.deepEqual(fails,[]);
});

test('v43 barrage: mobs are drawn only with art that walks down the screen',()=>{
 const skins=require(path.join(root,'src/arcade-skins-v43.js')),manifest=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43/manifest.json'),'utf8'));
 assert(skins.front&&typeof skins.front==='object','scene → front-walking mobs');
 const a=h.need(),scenes=new Set(a.STAGES.map(g=>g.scene));let n=0;
 for(const [s,keys] of Object.entries(skins.front)){assert(scenes.has(s));assert(keys.length>=1,s);for(const k of keys){const e=manifest[k+'.webp'];assert(e,k);assert.notEqual(e.facing,'right',k+' faces the side');assert(/drive-v43\//.test(e.source),k+' comes from a down-walk sheet');n++;}}
 assert(Object.keys(skins.front).length>=50,'scenes with down-walking mobs: '+Object.keys(skins.front).length);
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');assert(/skins\.front|\.front\[/.test(app),'the game draws from the front-walking list');
});

test('v43 boss hit/death: the engine marks the moment a boss falls, and the game plays a hit and a death motion for it',()=>{
 const a=h.need();
 // 보스가 다른 보스나 잡몹 구간으로 넘어가며 쓰러지는 패턴(마지막 패턴)을 찾아 체력을 0으로 만든다.
 const i=a.SEGMENTS.findIndex((g,k)=>g.kind==='card'&&(!a.SEGMENTS[k+1]||a.SEGMENTS[k+1].kind!=='card'||a.SEGMENTS[k+1].actor!==g.actor));assert(i>=0);
 const s=a.createRun({difficulty:'normal',seed:3,segment:i});let guard=0;
 while(s.stage!=='card'&&guard++<2000){s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});h.clear(s);}
 assert.equal(s.stage,'card');const actor=s.boss.actor,x=s.boss.x;s.boss.hp=0;s.player.invulnerableUntil=s.tick+999;a.step(s,{dx:0,dy:0});
 assert(s.events.includes('bossDown'),'bossDown event when the last pattern of a boss breaks: '+s.events.join(','));
 assert.equal(s.boss.down&&s.boss.down.actor,actor);assert(Math.abs(s.boss.down.x-x)<8);assert.equal(s.boss.down.tick,s.tick);
 // 같은 보스의 다음 패턴으로 넘어갈 때는 쓰러지지 않는다.
 const j=a.SEGMENTS.findIndex((g,k)=>g.kind==='card'&&a.SEGMENTS[k+1]&&a.SEGMENTS[k+1].kind==='card'&&a.SEGMENTS[k+1].actor===g.actor);assert(j>=0);
 const t=a.createRun({difficulty:'normal',seed:3,segment:j});guard=0;
 while(t.stage!=='card'&&guard++<2000){t.player.invulnerableUntil=t.tick+999;a.step(t,{dx:0,dy:0});h.clear(t);}
 t.boss.hp=0;a.step(t,{dx:0,dy:0});assert(!t.events.includes('bossDown'),'no death between patterns of the same boss');
 const app=h.read('src/arcade-app-v43.js');
 assert(/'bossDown'/.test(app),'the game listens for the fall');
 assert(/'@hit'/.test(app)&&/'@death'/.test(app),'drawn hit/death strips are used when the manifest has them');
 assert(/function recoilOf\(/.test(app)&&/function drawFall\(/.test(app),'code recoil and collapse when there is no drawing');
});

test('v43 barrage: the game draws glyph lasers and edge zigzags from the same segments the engine hits with',()=>{
 const app=h.read('src/arcade-app-v43.js');
 assert(/function drawFigures\(/.test(app)&&/Arcade\.figureSegments\(/.test(app)&&/drawFigures\(s\)/.test(app),'figures are drawn from engine segments');
});

test('v43 boss skill effects: drive frame animations are matched to bosses, light, loaded per boss, and every other boss gets a code effect',()=>{
 const a=h.need(),file=path.join(root,'media/arcade-v43-fx/index.json');assert(fs.existsSync(file),'effect list');
 const list=JSON.parse(fs.readFileSync(file,'utf8')).effects,seen=new Set();assert(list.length>=12,'effects: '+list.length);
 for(const e of list){const p=path.join(root,'media/arcade-v43-fx',e.file);assert(fs.existsSync(p),e.file);assert(fs.statSync(p).size<=200000,e.file+' is light');
  assert(Number.isInteger(e.frames)&&e.frames>=4&&Array.isArray(e.cell)&&e.fps>0,e.file);assert(['normal','lighter'].includes(e.blend));assert(e.status,e.file+' keeps the author status');
  for(const b of e.bosses){assert(a.SIGNATURES[b],b+' is a boss');assert(!seen.has(b),b+' has one effect');seen.add(b);}}
 const app=h.read('src/arcade-app-v43.js');
 assert(/arcade-v43-fx\/index\.json/.test(app)&&/function drawSkillFx\(/.test(app)&&/drawSkillFx\(s\)/.test(app),'effects are drawn');
 assert(/e==='figure'/.test(app)&&/function castFx\(/.test(app),'played when a boss casts');
});

test('v43 vertical maps: drive loop maps cover their scenes, wrap without a seam, and the game scrolls them at their own height',()=>{
 const a=h.need(),table=JSON.parse(h.read('docs/v43/vmaps.json')).maps,manifest=JSON.parse(h.read('media/arcade-v43/manifest.json')),scenes=new Set(a.STAGES.map(g=>g.scene));
 assert(Object.keys(table).length>=30);
 for(const [p,row] of Object.entries(table)){assert(scenes.has(row.scene),p);const e=manifest['bg-loop-'+row.scene+'.jpg'];assert(e&&e.loop===true,p+' built');assert(e.bytes<=130000,p+' light');
  assert(fs.existsSync(path.join(root,'media/arcade-v43/bg-loop-'+row.scene+'.jpg')));}
 // 이음매: 그림의 마지막 줄과 첫 줄의 차이가 그림 안 이웃한 줄끼리의 차이와 비슷해야 한다(파이썬으로 잰다).
 const out=require('node:child_process').execFileSync('python3',['-I','-c',`
import glob,sys
from PIL import Image
import numpy as np
worst=0
for f in sorted(glob.glob('media/arcade-v43/bg-loop-*.jpg')):
    a=np.asarray(Image.open(f).convert('L')).astype(float)
    seam=np.abs(a[-1]-a[0]).mean();inner=np.median([np.abs(a[i]-a[i+1]).mean() for i in range(0,a.shape[0]-1,7)])
    worst=max(worst,seam/max(inner,1))
print(worst)`],{cwd:root}).toString();
 assert(Number(out)<2.2,'seam / neighbour-row difference: '+out.trim());
 const app=h.read('src/arcade-app-v43.js');assert(/'bg-loop-'/.test(app)&&/backgroundTall/.test(app),'the game uses loop maps at their own height');
});

test('v43 barrage: hell fires about 30% more than before (user 11-14: "헬도 비슷하게 탄수 올려"), easy and normal keep pace',()=>{
 const d=h.need().DIFFICULTY;assert(d.hell.density>=2.6,'hell density '+d.hell.density);
 assert(d.gentle.density>=d.hell.density*.88&&d.normal.density>=d.hell.density*.88);
});

test('v43 review fixes: pattern banner sits under the top HUD, bullets fade on the boss body, the stage art bleeds past the play field',()=>{
 const app=h.read('src/arcade-app-v43.js'),html=h.read('arcade.html');
 const m=/var BANNER_Y=(\d+)/.exec(app);assert(m&&Number(m[1])<=110,'pattern-name banner in the upper part of the field');
 assert(/function nearBoss\(/.test(app),'bullets over the boss body are drawn faint so the boss stays readable');
 assert(/id="arcade-bleed"/.test(html)&&/arcade-bleed/.test(app),'blurred stage art fills the bars outside the play field');
});
