'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),hash=require('node:crypto');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),Source=require('../src/arcade-phase2-source-ink-v43.js');
const defs=require('../src/arcade-phase2-p1-art-v43.js');
const cards=[53,56,58],themes=['grave-mid-stitched-shroud','grave-armor-mounds','grave-comrade-delayed-echo'];
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
   const pairs=d.contactRuns[i],active=i>=d.framesByPhase.active[0]&&i<=d.framesByPhase.active[1]&&!(theme==='grave-comrade-delayed-echo'&&i===15);
   assert.equal(pairs.length>0,active);assert.equal(pairs.length%2,0);
   let last=-1;
   for(let k=0;k<pairs.length;k+=2){
    const lo=pairs[k],hi=pairs[k+1];
    assert(last<lo&&lo<=hi&&hi<192*192&&Math.floor(lo/192)===Math.floor(hi/192));
    for(let j=lo;j<=hi;j++){assert(c[j*4+3]>=174);if(theme==='grave-armor-mounds')assert(j%192<78||j%192>110);}
    last=hi;
   }
   if(theme==='grave-armor-mounds')for(let y=0;y<192;y++)for(let x=78;x<=110;x++)if(y<119||y>131)assert.equal(c[(y*192+x)*4+3],0);

  }
  assert.equal(unique.size,24);
 }
 return m;
}
let atlases;
test('exact ordinals and all real authored assets',async()=>{
 assert(HapilInk.on&&HapilInk.mono===2);
 for(const seg of [54,55,57])assert.equal(N.slotFor(seg),null);
 cards.forEach((x,i)=>assert.equal(N.slotFor(x).themes[0],themes[i]));
 assert(N.slotFor(3)?.p1&&N.slotFor(119)?.p1);
 atlases=await loadAtlases();
});
test('actual deterministic step + native Ink matrix: real hits, transparent gaps, harmless anticipation and decay',()=>{
 const result=[];
 for(let i=0;i<3;i++)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1])for(const dpr of [1,2]){
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
   if(seg===56&&phase==='active'){
     for(let y=1;y<192;y+=3)for(let x=80;x<=108;x+=3){
       [s.player.x,s.player.y]=project(x,y);
       assert(!N.hit(s),'clear authored middle mound lane hit');
       const ix=Math.floor(s.player.x*dpr),iy=Math.floor(s.player.y*dpr);
       if((y<116||y>134)&&ix>=8*dpr&&ix<352*dpr&&iy>=40*dpr&&iy<626*dpr)assert.equal(a[(iy*360*dpr+ix)*4+3],0);
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
 if(process.env.STAGE5_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE5_RASTER_OUTPUT,JSON.stringify(result,null,2));
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

test('untouched Stage5 54/55/57 still use actual legacy bullets',()=>{
 for(const seg of [54,55,57]){
  const s=run(seg,'hell');N.fixtureAtlas(s,t=>atlases.get(t));
  until(s,()=>s.stage==='card'&&s.n>0);
  assert(!N.inspect(s)?.phase);assert.equal(s.seg,seg);assert(s.n>0);
 }
});

test('actual vulnerable compact Hell mound lane preserves full life for the whole effect',()=>{
 for(const side of [1,-1]){
  const s=run(56,'hell',side);N.fixtureAtlas(s,t=>atlases.get(t));
  until(s,()=>N.inspect(s)?.phase==='telegraph');
  const rec=Source.createRecorder();assert(N.paint(rec,s));
  const box=rec.draws[0].bb;
  s.player.x=(box[0]+box[2])/2;s.player.y=380;
  assert.equal(s.player.invulnerableUntil,0);
  const hp=s.player.hp;
  while(N.inspect(s)?.phase){
    A.step(s,{});
    assert.equal(s.player.hp,hp);assert.equal(s.hits,0);assert.equal(s.bombs,0);
    if(N.inspect(s)?.phase)assert.equal(s.n,0,'no old volley while the authored mounds are active');
  }
  until(s,()=>s.n>0);
  assert(!N.inspect(s)?.phase,'original volley may resume only once the effect is over');
 }
});

test('echo stays center/left/pause/right at every active tick with no delayed collider',()=>{
 const d=defs['grave-comrade-delayed-echo'],width=360,height=640;
 for(const difficulty of ['gentle','normal','hell'])for(const side of [1,-1]){
  const s=run(58,difficulty,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
  until(s,()=>N.inspect(s)?.phase==='active');
  const visited=new Set();
  while(N.inspect(s)?.phase==='active'){
   const recorder=Source.createRecorder();assert(N.paint(recorder,s));assert.equal(recorder.draws.length,1);
   const q=recorder.draws[0],f=q.sx/q.sw+6*q.sy/q.sh;
   assert(q.k[0]>0,'world orientation must not reverse when player starts on right');
   const geometry=f<=11?[80,115]:f<=14?[0,45]:f===15?null:[147,192];
   const expected=f<=11?'middle':f<=14?'left':f===15?'gap':'right';visited.add(expected);
   const ctx=createCanvas(width,height).getContext('2d');N.paint(ctx,s);
   const rgba=ctx.getImageData(0,0,width,height).data;
   const saved=[s.player.x,s.player.y];let hits=0;
   for(let y=40;y<626;y++)for(let x=8;x<352;x++){
    s.player.x=x+.5;s.player.y=y+.5;
    if(N.hit(s)){
     assert(geometry,'no active contact during the intentional F15 gap');
     const u=q.k[0]*(s.player.x-q.e)+q.k[2]*(s.player.y-q.f);
     assert(u>=geometry[0]&&u<geometry[1],'a stale one of the other two cut strips must not hit');
     assert(rgba[(y*width+x)*4+3]>=98);hits++;
    }
   }
   assert(geometry?hits>10:hits===0);
   [s.player.x,s.player.y]=saved;A.step(s,{});
  }
  assert.deepEqual([...visited],['middle','left','gap','right']);
 }
});

test('each real echo cut damages exactly once; same previous cut location is safely vulnerable in F15 pause',()=>{
 for(const [target,gap] of [[0,false],[7,false],[14,false],[9,true]]){
  const s=run(58,'hell');N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
  until(s,()=>N.inspect(s)?.phase==='active');
  const at=()=>N.inspect(s)?.local;
  while(at()<Math.max(0,target-1))A.step(s,{});
  const old=s.tick;
  if(target!==0&&!gap)s.tick++;
  if(target===0)s.tick--;
  let point=null;
  const probeTick=s.tick;
  if(target===0)s.tick=old;
  for(let y=145;y<460&&!point;y++)for(let x=25;x<330&&!point;x++){
   s.player.x=x+.5;s.player.y=y+.5;if(N.hit(s))point=[s.player.x,s.player.y];
  }
  assert(point);
  s.tick=target===0?probeTick:old;
  if(gap){
   while(at()<9)A.step(s,{});
   [s.player.x,s.player.y]=point;assert(N.hit(s),'this left cut truly threatens the same point one tick earlier');
  }
  [s.player.x,s.player.y]=point;s.player.invulnerableUntil=0;
  const before=s.player.hp,hits=s.hits;
  A.step(s,{});
  assert.equal(at(),gap?10:target);
  assert.equal(s.player.hp,before-(gap?0:1));assert.equal(s.hits,hits+(gap?0:1));assert.equal(s.bombsUsed,0);assert.equal(s.autoBombs,0);
 }
});
