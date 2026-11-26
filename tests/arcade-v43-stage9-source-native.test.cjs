'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),hash=require('node:crypto');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),Source=require('../src/arcade-phase2-source-ink-v43.js');
const defs=require('../src/arcade-phase2-p1-art-v43.js');
const cards=[100,103,105],themes=['injection-shadow-shutters','injection-still-glass','injection-warm-delusion'];
const gaps=Object.fromEntries(cards.map(i=>[i,i===105?[[85,104]]:[[76,116]]]));
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
 for(const seg of [101,102,104,106,107])assert.equal(N.slotFor(seg),null);
 cards.forEach((x,i)=>assert.equal(N.slotFor(x).themes[0],themes[i]));
 assert(N.slotFor(3)?.p1&&N.slotFor(119)?.p1);
 atlases=await loadAtlases();
});
test('actual deterministic step + native Ink matrix: real hits, transparent gaps, harmless anticipation and decay',()=>{
 const result=[];
 const surfaces=new Map([1,2].map(d=>[d,createCanvas(360*d,640*d).getContext('2d')]));
 for(let i=0;i<cards.length;i++)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1])for(const dpr of [1,2]){
  const seg=cards[i],s=run(seg,diff,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=1e6;
  until(s,()=>N.inspect(s)?.phase==='telegraph');assert.equal(s.n,0);assert.equal(N.inspect(s).theme,themes[i]);
  const timing=N.inspect(s).timing,found=new Set(),precise=[];
  for(const [phase,fraction] of [['telegraph',.45],['active',.04],['active',.5],['active',.92],['decay',.32]]){
   until(s,()=>N.inspect(s)?.phase===phase);
   const at=Math.floor(timing[['telegraph','active','decay'].indexOf(phase)]*fraction);until(s,()=>N.inspect(s).local>=at);
   const g=surfaces.get(dpr);g.resetTransform();g.clearRect(0,0,360*dpr,640*dpr);g.scale(dpr,dpr);
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
   assert(pixels>150&&pixels<(seg===100?30000:Math.floor(.58*344*586))&&maxAlpha>=60);
   if(phase==='active') assert(shots>40,`no real hits ${seg}/${diff}/${side}`);
   else assert.equal(shots,0);
   if(phase==='active')for(let y=40;y<626;y+=5){s.player.x=side>0?9:350;s.player.y=y+.5;assert(!N.hit(s));}
   if(phase==='active')precise.push(coords[Math.floor(coords.length/2)]);
   found.add(phase);result.push({seg,diff,side,dpr,phase,fraction,shots,pixels,minHit:shots?minHit:null});
  }
  assert.equal(found.size,3);assert(s.n===0,'old volleys must not emerge under selected image');
  until(s,()=>s.segTick>90,240);assert.equal(N.inspect(s).theme,null);
 }
 if(process.env.STAGE9_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE9_RASTER_OUTPUT,JSON.stringify(result,null,2));
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

test('untouched 101/102/104/106/107 still fire actual native bullets',()=>{
 for(const i of [97,98,99]){assert.equal(A.SEGMENTS[i].kind,'wave');assert.equal(N.slotFor(i),null);}
 for(const i of [101,102,104,106,107])assert.equal(N.slotFor(i),null);
 assert.deepEqual(N.slotFor(77).themes,['meteor','spatial-slash']);
 assert.equal(A.STAGES[8].scene,'09-1');assert.equal(A.STAGES[9].scene,'11');assert.equal(A.STAGES.some(t=>t.scene==='09-2'),false);
 for(const i of [108,109,110,111,112,113,114])assert.equal(N.slotFor(i),null);
 for(const i of [115,119,123]){assert.equal(N.slotFor(i).actor,'lucifer');assert.equal(N.slotFor(i).scene,'11');}

 for(const seg of [101,102,104,106,107]){
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
 const ctx=createCanvas(720,1280).getContext('2d');
 for(const seg of cards)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1]){
  const s=run(seg,diff,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
  until(s,()=>N.inspect(s)?.phase==='active');
  let min=255,minHits=Infinity,ticks=0;
  while(N.inspect(s)?.phase==='active'){
   ctx.resetTransform();ctx.clearRect(0,0,720,1280);ctx.scale(2,2);assert(N.paint(ctx,s));
   const data=ctx.getImageData(0,0,720,1280).data,saved=[s.player.x,s.player.y];let hits=0;
   for(let y=40;y<626;y+=2)for(let x=8;x<352;x+=2){
    s.player.x=x+.75;s.player.y=y+.75;
    if(N.hit(s)){const a=data[((y*2+1)*720+x*2+1)*4+3];assert(a>=98);min=Math.min(min,a);hits++;}
   }
   assert(hits>10);minHits=Math.min(minHits,hits);[s.player.x,s.player.y]=saved;A.step(s,{});ticks++;
  }
  rows.push({seg,diff,side,ticks,min,minHits});
 }
 if(process.env.STAGE9_ALL_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE9_ALL_RASTER_OUTPUT,JSON.stringify(rows,null,2));
});

test('native Stage9 wave start through 97–99 reaches mid100; ready lane clean and late remains legacy',()=>{
 for(const scenario of ['ready','delayed']){
  const s=A.createRun({stage:8,hero:'seoha',entranceAll:true,difficulty:'gentle',compact:true,
    seed:5815,distort:false,pacing:true,rhythm:true,growth:true});
  const seen=new Set(),theme=themes[0];let ready=scenario==='ready';
  N.fixtureAtlas(s,t=>t===theme&&ready?atlases.get(t):null);
  for(let i=0;i<8500&&s.stage!=='lost';i++){
   if(s.stage==='wave')seen.add(s.seg);
   const target=s.mobs.find(m=>!m.retreat&&m.hp>0&&m.y>45);
   A.step(s,{dx:target?Math.max(-3,Math.min(3,target.x-s.player.x)):0});s.events.length=0;
   if(s.stage==='card'&&s.seg===100&&(ready?N.inspect(s)?.phase==='telegraph':s.n>0))break;
  }
  assert.deepEqual([...seen],[97,98,99]);assert.equal(s.stage,'card');assert.equal(s.seg,100);assert.equal(s.boss.actor,'mb_09_1');
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

test('expanded Mask-staff cards retain two exact paced HUD phases across every tier',()=>{
 for(const tier of ['gentle','normal','hell']){
  const s=A.createRun({stage:8,entranceAll:true,pacing:true,difficulty:tier});
  const p=A.livePhaseOf(s,103),q=A.livePhaseOf(s,105);
  assert.equal(p.no,2);assert.equal(q.no,tier==='hell'?4:3);
  assert.equal(A.SEGMENTS[103].actor,'p1_staff');assert.equal(A.SEGMENTS[105].actor,'p1_staff');
  assert.equal(A.SEGMENTS[103].formNo,A.SEGMENTS[105].formNo);
 }
});

test('both mirrored bent 105 corridors can be followed vulnerable with legal motion',()=>{
 const art=atlases.get(themes[2]),d=createCanvas(art.image.width,art.image.height).getContext('2d');
 HapilInk.raw(1);try{d.drawImage(art.image,0,0);}finally{HapilInk.raw(-1);}
 const data=d.getImageData(0,0,art.image.width,art.image.height).data;
 const profile=[];
 for(let y=0;y<192;y++){
  let width=0,mid=96,start=-1;
  for(let x=36;x<=156;x++){
   const transparent=x<156&&Array.from({length:24},(_,i)=>i).every(i=>!data[
    (((i/6|0)*192+y)*art.image.width+(i%6)*192+x)*4+3]);
   if(transparent&&start<0)start=x;
   if(!transparent&&start>=0){if(x-start>width){width=x-start;mid=(start+x)/2;}start=-1;}
  }
  profile.push({width,mid});
 }
 assert(Math.min(...profile.map(q=>q.width))*360/192>=65);
 assert(Math.max(...profile.map(q=>q.mid))-Math.min(...profile.map(q=>q.mid))>25,'true bent lane, not two straight rails');
 for(const difficulty of ['gentle','normal','hell'])for(const side of [1,-1]){
  const s=run(105,difficulty,side);N.fixtureAtlas(s,t=>atlases.get(t));
  until(s,()=>N.inspect(s)?.phase==='telegraph');
  const rec=Source.createRecorder();assert(N.paint(rec,s));const q=rec.draws[0],target=y=>q.e+profile[Math.max(0,Math.min(191,Math.floor((y-q.f)*q.k[3])))].mid/q.k[0];
  const hp=s.player.hp;assert.equal(s.player.invulnerableUntil,0);
  for(let i=0;i<48&&Math.abs(target(s.player.y)-s.player.x)>.1;i++)A.step(s,{dx:Math.max(-4.2,Math.min(4.2,target(s.player.y)-s.player.x))});
  assert.equal(N.inspect(s).phase,'telegraph');assert(Math.abs(target(s.player.y)-s.player.x)<.15);
  let minX=s.player.x,maxX=s.player.x,minY=s.player.y;
  while(N.inspect(s)?.phase){
   const dy=-3.8,dx=target(s.player.y+dy)-s.player.x,k=Math.min(1,4.2/Math.hypot(dx,dy));
   A.step(s,{dx:dx*k,dy:dy*k});
   minX=Math.min(minX,s.player.x);maxX=Math.max(maxX,s.player.x);minY=Math.min(minY,s.player.y);
   assert.equal(s.player.hp,hp);assert.equal(s.hits,0);assert.equal(s.bombsUsed,0);assert.equal(s.autoBombs,0);
  }
  assert(maxX-minX>25&&minY<390,`vulnerable route follows real bend ${difficulty}/${side}: ${minX}–${maxX}, y=${minY}`);
 }
});

test('one seeded paced fight reaches both expanded cards on gentle and normal without health overrides',()=>{
 // The left-side route keeps the legacy card alive long enough for the boss to descend.
 for(const [diff,y,goal] of [['gentle',540,180],['normal',580,180],['normal',540,80]]){
  const s=A.createRun({segment:102,entranceAll:true,pacing:true,rhythm:true,difficulty:diff,compact:true,seed:5815,distort:false,hero:'seoha',growth:true});
  N.fixtureAtlas(s,t=>atlases.get(t));s.bombs=0;const seen=new Set();let held=0,inheritedHold=0,released=false;for(let i=0;i<15500&&s.stage!=='lost';i++){
   if(N.inspect(s)?.phase==='active')seen.add(s.seg);
   if(s.seg===105&&N.holding(s)){
    if(!held)inheritedHold=s.boss.downHold;
    held++;assert.equal(s.segTick,0);assert(!N.inspect(s)?.phase);
   }else if(held&&!released){
    const rec=N.inspect(s);assert.equal(rec?.phase,'telegraph');
    assert.equal(rec.opening.elapsed,held);assert.equal(rec.opening.fallback,false);
    assert.equal(s.boss.downHold,0);assert(!s.calm);released=true;
   }
   if(seen.has(103)&&seen.has(105))break;
   let x=180,targetY=y,threats=[];
   if(s.stage==='card'&&!N.inspect(s)?.phase){
    for(let z=0;z<s.n;z++){const bx=s.bx[z],by=s.by[z],vx=Math.cos(s.ba[z])*s.bs[z]/60,vy=Math.sin(s.ba[z])*s.bs[z]/60;
     if(Math.abs(by-s.player.y)<50&&Math.abs(bx-s.player.x)<60)threats.push([bx,by,vx,vy]);}
    const cs=[s.player.x-4.2,s.player.x,s.player.x+4.2].filter(w=>w>40&&w<320);let best=-1e10;
    for(const c of cs){const score=-(Math.abs(c-goal)*.18)+Math.min(55,...threats.map(z=>Math.min(...[0,3,6,10].map(t=>Math.hypot(c-z[0]-z[2]*t,s.player.y-z[1]-z[3]*t)))));if(score>best){x=c;best=score;}}
   }else if(s.seg===105){targetY=520;}
   const dx=Math.max(-4.2,Math.min(4.2,x-s.player.x)),dy=Math.max(-2,Math.min(2,targetY-s.player.y)),k=Math.min(1,4.2/Math.hypot(dx,dy));
   const own=N.inspect(s),before=s.hits;
   A.step(s,{dx:dx*k,dy:dy*k});s.events.length=0;
   if(own?.phase==='active'&&N.inspect(s)?.phase==='active')assert.equal(s.hits,before,'center stays safe at the expanded occurrence');
  }
  assert.deepEqual([...seen],[103,105]);
  assert.equal(s.boss.actor,'p1_staff');assert.equal(s.stageIndex,8);assert(s.player.hp>0);
  assert.equal(s.bombsUsed,s.autoBombs,'no manual or injected stock use; native ordinary-hit refills still apply');
  if(goal===80){
   assert(inheritedHold>0,'the real boss descent carries into card 105');
   assert(held>=inheritedHold&&held<=480);assert(released);
  }
 }
});

function seededOpening(seg=105,difficulty='hell'){
 const s=run(seg,difficulty);
 s.stage='card';s.segTick=0;s.stageTick=0;s.boss.present=true;s.boss.leaving=false;
 const card=A.SEGMENTS[seg];s.boss.actor=card.actor;s.boss.x=180;s.boss.y=156;s.boss.hp=s.boss.maxHp=A.cardHp(s,card);
 s.formKey=card.stage+'|'+card.actor+'|'+(card.formNo||0);s.bombs=0;
 return s;
}
function oldBeam(x=90,duration=12){
 return {x,y:0,angle:Math.PI/2,width:20,warn:0,active:duration,age:0,spin:0,full:true,solid:true,grazed:false};
}

test('ready reservation never deletes or immunizes inherited laser; starts after its honest decay',()=>{
 const s=seededOpening();N.fixtureAtlas(s,t=>atlases.get(t));const beam=oldBeam(),hp=s.player.hp;
 s.lasers.push(beam);assert.equal(s.player.invulnerableUntil,0);
 A.step(s,{});
 assert(N.holding(s));assert.equal(s.segTick,0);assert.equal(beam.age,1);assert.equal(s.lasers[0],beam);
 assert.equal(s.hits,1);assert.equal(s.player.hp,hp-1);assert(!N.hit(s));
 const c=createCanvas(360,640).getContext('2d');assert(!N.paint(c,s));
 for(let i=0;i<100&&N.holding(s);i++){
  assert(s.lasers.includes(beam)||beam.age>beam.active);assert(!N.hit(s));
  A.step(s,{});
 }
 assert(beam.age>beam.active);assert.equal(s.lasers.length,0);assert.equal(N.inspect(s)?.phase,'telegraph');
 assert.equal(s.segTick,0);assert.equal(s.boss.maxHp,A.cardHp(s,A.SEGMENTS[105]));
});

test('bounded reservation preserves occupied board and falls back permanently; no starting on late or lost asset',()=>{
 const occupied=seededOpening(),beam=oldBeam(40,600);occupied.lasers.push(beam);N.fixtureAtlas(occupied,t=>atlases.get(t));
 for(let i=0;i<480;i++){A.step(occupied,{});assert(N.holding(occupied));assert.equal(occupied.segTick,0);assert.equal(occupied.lasers[0],beam);assert(!N.hit(occupied));}
 A.step(occupied,{});assert(!N.holding(occupied));assert.equal(occupied.segTick,1);assert(occupied.lasers.includes(beam));
 assert.deepEqual(N.inspect(occupied)?.opening,{waiting:false,elapsed:480,fallback:true});
 for(let i=0;i<160;i++){A.step(occupied,{});assert(!N.inspect(occupied)?.theme);}
 assert(occupied.segTick>100);
 const missing=seededOpening();let ready=false;N.fixtureAtlas(missing,t=>ready?atlases.get(t):null);missing.lasers.push(oldBeam(40,70));
 for(let i=0;i<100;i++){A.step(missing,{});assert(!N.holding(missing));}assert(missing.segTick>60);
 ready=true;for(let i=0;i<40;i++){A.step(missing,{});assert(!N.inspect(missing)?.theme);}
 const lost=seededOpening();ready=true;N.fixtureAtlas(lost,t=>ready?atlases.get(t):null);lost.lasers.push(oldBeam(40,12));A.step(lost,{});assert(N.holding(lost));
 ready=false;A.step(lost,{});assert(!N.holding(lost));assert.equal(lost.segTick,1);ready=true;
 for(let i=0;i<70;i++){A.step(lost,{});assert(!N.inspect(lost)?.theme);}
});

test('card down or phase exit cancels reservation without altering ordinary life or HP rules',()=>{
 const s=seededOpening();N.fixtureAtlas(s,t=>atlases.get(t));s.lasers.push(oldBeam(40,30));A.step(s,{});assert(N.holding(s));
 const normal=seededOpening();normal.lasers.push(oldBeam(40,30));A.step(normal,{});
 s.boss.hp=0;normal.boss.hp=0;A.step(s,{});A.step(normal,{});
 assert(!N.holding(s));assert.equal(s.boss.hp,normal.boss.hp);assert.equal(s.player.hp,normal.player.hp);assert(s.cardDown>0);
 assert(!N.hit(s));assert(!N.paint(createCanvas(360,640).getContext('2d'),s));
 s.stage='break';s.seg=106;A.step(s,{});assert(!N.holding(s));assert.equal(N.inspect(s),null);
});

test('actual focused Hell transition from legacy card104 reaches expanded card105',()=>{

 const diff='hell',y=570,hero='seoha',seed=5815,goal=90;
  const s=A.createRun({segment:104,entranceAll:true,pacing:true,rhythm:true,difficulty:diff,compact:true,seed,distort:false,hero,growth:true,ability:hero==='seoha'?3:7});
  N.fixtureAtlas(s,t=>atlases.get(t));const seen=new Set();for(let i=0;i<14500&&s.stage!=='lost';i++){
   if(N.inspect(s)?.phase==='active')seen.add(s.seg);
   if(seen.has(105))break;
   const p=s.player,phase=N.inspect(s)?.phase;let dx=0,dy=0,bomb=false,near=99;
   if(s.stage==='card'&&!phase){
    const threats=[];
    for(let z=0;z<s.n;z++){const bx=s.bx[z],by=s.by[z],vx=Math.cos(s.ba[z])*s.bs[z]/60,vy=Math.sin(s.ba[z])*s.bs[z]/60;
     if(!s.bexit[z]&&Math.abs(by-p.y)<65&&Math.abs(bx-p.x)<85)threats.push([bx,by,vx,vy]);}
    let best=-1e10;
    for(const ux of [-1,0,1])for(const uy of [-1,0,1]){
     const mag=Math.hypot(ux,uy)||1,m=4.2/mag,tx=p.x+ux*m,ty=p.y+uy*m;if(tx<35||tx>325||ty<165||ty>614)continue;
     let d=42;for(const b of threats){for(const t of [0,2,4,7,10])d=Math.min(d,Math.hypot(tx-b[0]-b[2]*t,ty-b[1]-b[3]*t));}
     const line=(x,y,x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,t=Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-x0-t*dx,y-y0-t*dy);};
     let rays=35;
     for(const l of s.lasers)for(const k of [1,6,12,20]){
      if(l.age+k<l.warn-12||l.age+k>=l.warn+l.active)continue;
      const a=l.angle+(l.spin||0)*k/60,co=Math.cos(a),si=Math.sin(a),x=l.follow?s.boss.x:l.x,y=l.follow?s.boss.y:l.y;
      const dist=line(tx,ty,x-(l.full?1000:0)*co,y-(l.full?1000:0)*si,x+1000*co,y+1000*si);
      rays=Math.min(rays,dist-l.width*(l.solid?.5:.31)-p.r);
     }
     for(const f of s.figures){
      if(f.age+20<f.warn||f.age>=f.warn+(f.active||0))continue;
      const v=A.figureSegments(f);for(const l of v)if(l.length>=4)rays=Math.min(rays,line(tx,ty,l[0],l[1],l[2],l[3])-f.width*.31-p.r);
     }
     near=Math.min(near,rays);
     const score=Math.min(32,d)*2+Math.min(24,rays)*2-(Math.abs(tx-goal)*.23)-(Math.abs(ty-y)*.20);
     if(score>best){best=score;dx=ux*m;dy=uy*m;near=Math.min(d,rays);}
    }
    bomb=near<9&&s.bombs>0&&s.tick>=s.player.invulnerableUntil;
   }else{dx=Math.max(-4.2,Math.min(4.2,(phase?180:goal)-p.x));dy=Math.max(-2,Math.min(2,y-p.y));const k=Math.min(1,4.2/Math.hypot(dx,dy));dx*=k;dy*=k;}
   A.step(s,{dx,dy,bomb,focus:false});s.events.length=0;
  }
  assert.deepEqual([...seen],[105]);assert.equal(s.seg,105);assert.equal(s.boss.actor,'p1_staff');
  assert.equal(A.livePhaseOf(s,105).no,4);assert(s.player.hp>0);
});
