'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),hash=require('node:crypto');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),Source=require('../src/arcade-phase2-source-ink-v43.js');
const defs=require('../src/arcade-phase2-p1-art-v43.js');
const cards=[74],themes=['fall-mage-charred-columns'];
const gaps={74:[[73,119]]};
const base=createCanvas(1,1).getContext('2d'),win={location:{search:'?mono=2'},CanvasRenderingContext2D:base.constructor,HTMLImageElement:Image,CanvasGradient:base.createLinearGradient(0,0,1,1).constructor,document:{documentElement:{classList:{add(){}}},createElement:()=>createCanvas(1,1)}};
win.window=win;vm.runInNewContext(fs.readFileSync('src/ink-v43.js','utf8'),win);globalThis.HapilInk=win.HapilInk;
function until(s,p,max=660){for(let j=0;j<max&&!p();j++)A.step(s,{});assert(p(),JSON.stringify({tick:s.tick,stage:s.stage,seg:s.seg,segTick:s.segTick,n:s.n,view:N.inspect(s)}));}
function run(seg,difficulty='normal',side=1) {
 const s=A.createRun({segment:seg,entranceAll:true,difficulty,spellOnly:true,seed:5815,compact:difficulty==='hell',distort:false});
 s.player.x=side===1?90:270;s.bombs=0;
 return s;
}
async function loadAtlases(){
 const m=new Map();
 for(const theme of themes){
  const d=defs[theme],bytes=fs.readFileSync(d.path);
  assert.equal(hash.createHash('sha256').update(bytes).digest('hex'),d.sha256);
  const image=await loadImage(bytes),ctx=createCanvas(image.width,image.height).getContext('2d');
  HapilInk.raw(1);try{ctx.drawImage(image,0,0);}finally{HapilInk.raw(-1);}
  const a=ctx.getImageData(0,0,image.width,image.height).data,alpha=new Uint8Array(image.width*image.height);
  for(let i=0;i<alpha.length;i++)alpha[i]=a[i*4+3];
  assert(Source.register(image,image.width,image.height,alpha));m.set(theme,{...d,image});
  const unique=new Set();
  for(let i=0;i<24;i++){
   const sx=i%6*d.cellWidth,sy=Math.floor(i/6)*d.cellHeight;
   const c=ctx.getImageData(sx,sy,d.cellWidth,d.cellHeight).data;
   unique.add(hash.createHash('sha256').update(c).digest('hex'));
   const pairs=d.contactRuns[i],active=i>=d.framesByPhase.active[0]&&i<=d.framesByPhase.active[1];
   assert.equal(pairs.length>0,active);assert.equal(pairs.length%2,0);
   let last=-1;
   for(let k=0;k<pairs.length;k+=2){
    const lo=pairs[k],hi=pairs[k+1];
    assert(last<lo&&lo<=hi&&hi<192*192&&Math.floor(lo/192)===Math.floor(hi/192));
    for(let j=lo;j<=hi;j++){assert(c[j*4+3]>=174);for(const [l,r] of gaps[cards[themes.indexOf(theme)]])assert(j%192<l||j%192>=r);}
    last=hi;
   }
   for(const [l,r] of gaps[cards[themes.indexOf(theme)]])for(let y=0;y<192;y++)for(let x=l;x<r;x++)assert.equal(c[(y*192+x)*4+3],0);

  }
  assert.equal(unique.size,24);
 }
 return m;
}
let atlases;
test('exact ordinals and all real authored assets',async()=>{
 assert(HapilInk.on&&HapilInk.mono===2);
 for(const seg of [75])assert.equal(N.slotFor(seg),null);
 cards.forEach((x,i)=>assert.equal(N.slotFor(x).themes[0],themes[i]));
 assert(N.slotFor(3)?.p1&&N.slotFor(119)?.p1);
 atlases=await loadAtlases();
});
test('actual deterministic step + native Ink matrix: real hits, transparent gaps, harmless anticipation and decay',()=>{
 const result=[];
 for(let i=0;i<cards.length;i++)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1])for(const dpr of [1,2]){
  const seg=cards[i],s=run(seg,diff,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=1e6;
  until(s,()=>N.inspect(s)?.phase==='telegraph');assert.equal(s.n,0);assert.equal(N.inspect(s).theme,themes[i]);
  const timing=N.inspect(s).timing,found=new Set(),precise=[];
  for(const [phase,fraction] of [['telegraph',.45],['active',.04],['active',.5],['active',.92],['decay',.32]]){
   until(s,()=>N.inspect(s)?.phase===phase);
   const at=Math.floor(timing[['telegraph','active','decay'].indexOf(phase)]*fraction);until(s,()=>N.inspect(s).local>=at);
   const g=createCanvas(360*dpr,640*dpr).getContext('2d');g.scale(dpr,dpr);
   let project=null;
   const forward=new Proxy(g,{get(o,k){
    if(k==='drawImage')return (im,sx,sy,sw,sh,dx,dy,dw,dh)=>{
      const t=o.getTransform();project=(u,v)=>{
        const x=dx+(u+.5)*dw/sw,y=dy+(v+.5)*dh/sh;
        return [(t.a*x+t.c*y+t.e)/dpr,(t.b*x+t.d*y+t.f)/dpr];
      };return o.drawImage(im,sx,sy,sw,sh,dx,dy,dw,dh);};
    const v=Reflect.get(o,k,o);return typeof v==='function'?v.bind(o):v;
   },set:(o,k,v)=>Reflect.set(o,k,v,o)});
   assert(N.paint(forward,s));
   const a=g.getImageData(0,0,360*dpr,640*dpr).data;
   if(phase==='active'){
     for(const [l,r] of gaps[seg])for(let y=1;y<192;y+=3)for(let x=l+2;x<r-2;x+=2){
       [s.player.x,s.player.y]=project(x,y);
       assert(!N.hit(s),'clear authored internal lane hit');
       const ix=Math.floor(s.player.x*dpr),iy=Math.floor(s.player.y*dpr);
       if(ix>=8*dpr&&ix<352*dpr&&iy>=40*dpr&&iy<626*dpr)assert.equal(a[(iy*360*dpr+ix)*4+3],0);
     }
   }
   let shots=0,pixels=0,maxAlpha=0,minHit=255;
   const coords=[];
   for(let y=40;y<626;y++)for(let x=8;x<352;x++){
    const off=dpr-1;const p=a[((y*dpr+off)*360*dpr+x*dpr+off)*4+3];
    if(p>0)pixels++;maxAlpha=Math.max(maxAlpha,p);
    // Every positive-visibility candidate on sampled matrix; also guarantee transparent field in sampled gaps.
    if(!p&&(x+y)%97)continue;
    s.player.x=x+(dpr===2?.75:.5);s.player.y=y+(dpr===2?.75:.5);
    if(N.hit(s)){assert(p>=100,`transparent or weak hit ${seg}/${diff}/${side}/${p}`);shots++;coords.push([x+.5,y+.5]);minHit=Math.min(minHit,p);}
   }
   assert(pixels>150&&pixels<30000&&maxAlpha>=60);
   if(phase==='active') assert(shots>40,`no real hits ${seg}/${diff}/${side}`);
   else assert.equal(shots,0);
   if(phase==='active')for(let y=40;y<626;y+=5){s.player.x=side>0?9:350;s.player.y=y+.5;assert(!N.hit(s));}
   if(phase==='active')precise.push(coords[Math.floor(coords.length/2)]);
   found.add(phase);result.push({seg,diff,side,dpr,phase,fraction,shots,pixels,minHit:shots?minHit:null});
  }
  assert.equal(found.size,3);assert(s.n===0,'old volleys must not emerge under selected image');
  until(s,()=>s.segTick>90,240);assert.equal(N.inspect(s).theme,null);
 }
 if(process.env.STAGE7_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE7_RASTER_OUTPUT,JSON.stringify(result,null,2));
});
test('ordinary cold missing and late atlas: never stalls; card and old visible projectiles proceed',()=>{
 for(const seg of cards)for(const type of ['missing','delayed']){
  const s=run(seg);let allow=false;N.fixtureAtlas(s,t=>allow?atlases.get(t):null);
  until(s,()=>s.stage==='card'&&s.n>0);const first=s.tick;
  assert(!N.inspect(s)?.theme);if(type==='delayed')allow=true;
  for(let i=0;i<150;i++){A.step(s,{});assert(!N.inspect(s)?.theme);}
  assert(s.segTick>100&&s.tick>=first+150);
 }
});
test('actual A.step player contact: attack reduces life only on visible source',()=>{
 for(const seg of cards){
 const s=run(seg,'hell');N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
 until(s,()=>N.inspect(s)?.phase==='active'&&N.inspect(s).local>=4);
 const saveTick=s.tick;s.tick++;let point=null;
 for(let y=100;y<545&&!point;y++)for(let x=30;x<330&&!point;x++){s.player.x=x+.5;s.player.y=y+.5;if(N.hit(s))point=[x+.5,y+.5];}
 assert(point);s.tick=saveTick;s.player.x=point[0];s.player.y=point[1];s.player.invulnerableUntil=0;
 const before=s.player.hp,hits=s.hits;
 A.step(s,{});assert.equal(s.player.hp,before-1);assert.equal(s.hits,hits+1);assert.equal(s.bombsUsed,0);assert.equal(s.autoBombs,0);
 }
});

test('untouched 75 still uses actual legacy bullets, and all exact Balrog scope remains',()=>{
 for(const i of [70,71,72,73]){assert.equal(A.SEGMENTS[i].kind,'wave');assert.equal(N.slotFor(i),null);}
 for(const i of [75,76,78,79,80,81,82,83,84,85])assert.equal(N.slotFor(i),null);
 assert.deepEqual(N.slotFor(77).themes,['meteor','spatial-slash']);assert.equal(N.slotFor(77).actor,'balrog');
 for(const seg of [75]){
  const s=run(seg,'hell');N.fixtureAtlas(s,t=>atlases.get(t));
  until(s,()=>s.stage==='card'&&s.n>0);
  assert(!N.inspect(s)?.phase);assert.equal(s.seg,seg);assert(s.n>0);
 }
});


test('all authored lanes genuinely reachable with ordinary movement and vulnerable through the whole signature',()=>{
 for(const seg of cards)for(const difficulty of ['gentle','normal','hell'])for(const side of [1,-1])for(const [lo,hi] of gaps[seg]){
  const s=run(seg,difficulty,side);N.fixtureAtlas(s,t=>atlases.get(t));
  until(s,()=>N.inspect(s)?.phase==='telegraph');
  const rec=Source.createRecorder();assert(N.paint(rec,s));const q=rec.draws[0];
  const goal=q.e+((lo+hi)/2)/q.k[0];
  assert(goal>8&&goal<352);
  assert.equal(s.player.invulnerableUntil,0);
  const hp=s.player.hp;
  for(let j=0;j<64&&Math.abs(goal-s.player.x)>0.1;j++){
   A.step(s,{dx:Math.max(-4.2,Math.min(4.2,goal-s.player.x))});
   assert.equal(N.inspect(s)?.phase,'telegraph','reachable before harm');assert.equal(s.player.hp,hp);
  }
  assert(Math.abs(goal-s.player.x)<=.1,'authored lane can be reached at native move speed');
  // Now traverse the projected lane vertically using ordinary player movement.
  while(N.inspect(s)?.phase){
    A.step(s,{dy:-3.5});
    assert.equal(s.player.hp,hp);assert.equal(s.hits,0);assert.equal(s.bombs,0);
    if(N.inspect(s)?.phase)assert.equal(s.n,0,'no overlap with old volley while authored attack runs');
  }
  until(s,()=>s.n>0);
  assert(!N.inspect(s)?.phase);
 }
});

test('all active native Ink compact lattice ticks and mirrors retain visible contact',()=>{
 const rows=[];
 for(const seg of cards)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1]){
  const s=run(seg,diff,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
  until(s,()=>N.inspect(s)?.phase==='active');
  let min=255,minHits=Infinity,ticks=0;
  while(N.inspect(s)?.phase==='active'){
   const canvas=createCanvas(720,1280),ctx=canvas.getContext('2d');ctx.scale(2,2);assert(N.paint(ctx,s));
   const data=ctx.getImageData(0,0,720,1280).data,saved=[s.player.x,s.player.y];let hits=0;
   for(let y=40;y<626;y+=2)for(let x=8;x<352;x+=2){
    s.player.x=x+.75;s.player.y=y+.75;
    if(N.hit(s)){const a=data[((y*2+1)*720+x*2+1)*4+3];assert(a>=98);min=Math.min(min,a);hits++;}
   }
   assert(hits>10);minHits=Math.min(minHits,hits);[s.player.x,s.player.y]=saved;A.step(s,{});ticks++;
  }
  rows.push({seg,diff,side,ticks,min,minHits});
 }
 if(process.env.STAGE7_ALL_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE7_ALL_RASTER_OUTPUT,JSON.stringify(rows,null,2));
});

test('native Stage7 wave start through 70–73 reaches mid74; ready lane clean and late remains legacy',()=>{
 for(const scenario of ['ready','delayed']){
  const s=A.createRun({stage:6,hero:'seoha',entranceAll:true,difficulty:'gentle',compact:true,
    seed:5815,distort:false,pacing:true,rhythm:true,growth:true});
  const seen=new Set(),theme=themes[0];let ready=scenario==='ready';
  N.fixtureAtlas(s,t=>t===theme&&ready?atlases.get(t):null);
  for(let i=0;i<8500&&s.stage!=='lost';i++){
   if(s.stage==='wave')seen.add(s.seg);
   const target=s.mobs.find(m=>!m.retreat&&m.hp>0&&m.y>45);
   A.step(s,{dx:target?Math.max(-3,Math.min(3,target.x-s.player.x)):0});s.events.length=0;
   if(s.stage==='card'&&s.seg===74&&(ready?N.inspect(s)?.phase==='telegraph':s.n>0))break;
  }
  assert.deepEqual([...seen],[70,71,72,73]);assert.equal(s.stage,'card');assert.equal(s.seg,74);assert.equal(s.boss.actor,'mb_07');
  if(ready){
   assert.equal(N.inspect(s).theme,theme);assert.equal(s.n,0);
   const rec=Source.createRecorder();assert(N.paint(rec,s));
   const q=rec.draws[0],goal=q.e+96/q.k[0],before=s.player.hp;
   for(let i=0;i<150&&N.inspect(s)?.phase;i++){
    A.step(s,{dx:Math.max(-4.2,Math.min(4.2,goal-s.player.x)),dy:-2});
    assert.equal(s.player.hp,before);
   }
   assert(!N.inspect(s)?.phase);
  }else{
   assert(s.n>0);assert.equal(N.inspect(s)?.phase??null,null);ready=true;
   for(let i=0;i<120;i++){A.step(s,{});assert(!N.inspect(s)?.phase);}
  }
 }
});
