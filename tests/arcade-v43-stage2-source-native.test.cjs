'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),hash=require('node:crypto');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),Source=require('../src/arcade-phase2-source-ink-v43.js');
const defs=require('../src/arcade-phase2-p1-art-v43.js');
const cards=[13,16,18],themes=['eggkeeper-silk','violet-white-wings','violet-eight-leg-silk'];
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
   if(d.contact)for(const j of d.contact[i])assert(c[j*4+3]>=172);
  }
  assert.equal(unique.size,24);
 }
 return m;
}
let atlases;
test('exact ordinals and all real authored assets',async()=>{
 assert(HapilInk.on&&HapilInk.mono===2);
 assert.equal(N.slotFor(12),null);assert.equal(N.slotFor(17),null);
 cards.forEach((x,i)=>assert.equal(N.slotFor(x).themes[0],themes[i]));
 assert(N.slotFor(3)?.p1&&N.slotFor(119)?.p1);
 atlases=await loadAtlases();
});
test('actual deterministic step + native Ink matrix: real hits, transparent gaps, harmless anticipation and decay',()=>{
 const result=[];
 for(let i=0;i<3;i++)for(const diff of ['gentle','normal','hell'])for(const side of [1,-1]){
  const seg=cards[i],s=run(seg,diff,side);N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=1e6;
  until(s,()=>N.inspect(s)?.phase==='telegraph');assert.equal(s.n,0);assert.equal(N.inspect(s).theme,themes[i]);
  const timing=N.inspect(s).timing,found=new Set(),precise=[];
  for(const phase of ['telegraph','active','decay']){
   until(s,()=>N.inspect(s)?.phase===phase);
   for(let t=0;t<Math.floor(timing[['telegraph','active','decay'].indexOf(phase)]/2);t++)A.step(s,{});
   const g=createCanvas(360,640).getContext('2d');assert(N.paint(g,s));
   const a=g.getImageData(0,0,360,640).data;
   let shots=0,pixels=0,maxAlpha=0,minHit=255;
   const coords=[];
   for(let y=40;y<626;y++)for(let x=8;x<352;x++){
    const p=a[(y*360+x)*4+3];
    if(p>0)pixels++;maxAlpha=Math.max(maxAlpha,p);
    // Every positive-visibility candidate on sampled matrix; also guarantee transparent field in sampled gaps.
    if(!p&&(x+y)%97)continue;
    s.player.x=x+.5;s.player.y=y+.5;
    if(N.hit(s)){assert(p>=100,`transparent or weak hit ${seg}/${diff}/${side}/${p}`);shots++;coords.push([x+.5,y+.5]);minHit=Math.min(minHit,p);}
   }
   assert(pixels>150&&pixels<30000&&maxAlpha>=80);
   if(phase==='active') assert(shots>40,`no real hits ${seg}/${diff}/${side}`);
   else assert.equal(shots,0);
   if(phase==='active')for(let y=40;y<626;y+=5){s.player.x=side>0?9:350;s.player.y=y+.5;assert(!N.hit(s));}
   if(phase==='active')precise.push(coords[Math.floor(coords.length/2)]);
   found.add(phase);result.push({seg,diff,side,phase,shots,pixels,minHit:shots?minHit:null});
  }
  assert.equal(found.size,3);assert(s.n===0,'old volleys must not emerge under selected image');
  until(s,()=>s.segTick>90,240);assert.equal(N.inspect(s).theme,null);
 }
 if(process.env.STAGE2_RASTER_OUTPUT)fs.writeFileSync(process.env.STAGE2_RASTER_OUTPUT,JSON.stringify(result,null,2));
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
 const s=run(16,'hell');N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
 until(s,()=>N.inspect(s)?.phase==='active'&&N.inspect(s).local>=4);
 const saveTick=s.tick;s.tick++;let point=null;
 for(let y=100;y<520&&!point;y++)for(let x=30;x<330&&!point;x++){s.player.x=x+.5;s.player.y=y+.5;if(N.hit(s))point=[x+.5,y+.5];}
 assert(point);s.tick=saveTick;s.player.x=point[0];s.player.y=point[1];s.player.invulnerableUntil=0;
 const before=s.player.hp;
 A.step(s,{});assert.equal(s.player.hp,before-1);
});

test('ordinary fresh Stage 1 reaches its first midboss: native cue appears with ready art and never inserts over a late original volley',async()=>{
 const {atlas,prepareAtlas}=require('./helpers/phase2-source-image.cjs');await prepareAtlas(defs['root-tracer']);
 const tracer=atlas(defs['root-tracer']);
 for(const scenario of ['ready','delayed']){
  // No segment option, no boss/mob shortcuts, vulnerability overrides, or HP edits.
  const s=A.createRun({hero:'seoha',entranceAll:true,difficulty:'gentle',compact:true,
    seed:5815,distort:false,pacing:true,rhythm:true,growth:true});
  const wave=new Set();let ready=scenario==='ready';
  N.fixtureAtlas(s,t=>t==='root-tracer'&&ready?tracer:null);
  for(let i=0;i<8500&&s.stage!=='lost';i++){
   if(s.stage==='wave')wave.add(s.seg);
   const target=s.mobs.find(m=>!m.retreat&&m.hp>0&&m.y>45);
   const dx=target?Math.max(-3,Math.min(3,target.x-s.player.x)):0;A.step(s,{dx});s.events.length=0;
   if(s.stage==='card'&&s.seg===3&&(ready?N.inspect(s)?.phase==='telegraph':s.n>0))break;
  }
  assert(s.tick>1000&&wave.size>0&&s.stage==='card'&&s.stageIndex===0&&s.seg===3);
  assert.equal(s.boss.actor,'mb_01');assert.equal(s.boss.mid,true);
  if(scenario==='ready'){
    assert.equal(N.inspect(s).theme,'root-tracer');assert.equal(s.n,0);
    let contact=false;
    for(let y=100;y<570&&!contact;y+=4)for(let x=63;x<310;x+=4)if(N.firstContactAt(s,x+.5,y+.5)){contact=true;break;}
    assert(contact,'fresh first midboss actually schedules visible atlas contact');
  }else{
    assert(s.n>0);assert.equal(N.inspect(s)?.phase??null,null);
    const tick=s.segTick;ready=true;
    for(let i=0;i<120;i++){A.step(s,{});assert.equal(N.inspect(s)?.phase??null,null);}
    assert(s.segTick>=tick+100,'late atlas does not freeze or replace existing native spell');
  }
 }
});

test('eight-leg silk excludes the two exact weak Chromium fringe contacts without removing opaque life loss',()=>{
 const s=run(18,'hell');N.fixtureAtlas(s,t=>atlases.get(t));s.player.invulnerableUntil=100000;
 until(s,()=>N.inspect(s)?.phase==='active');
 for(let i=0;i<7;i++)A.step(s,{});
 assert.equal(N.inspect(s)?.local,7);
 const rec=Source.createRecorder();assert(N.paint(rec,s));assert(rec.complete);
 for(const p of [[246.75,394.75],[142.75,272.75]]){
  const predicted=Math.max(...rec.draws.map(q=>Source.sample(q,...p)));
  assert(predicted>=104&&predicted<124,'addresses a real former positive fringe');
  [s.player.x,s.player.y]=p;assert.equal(N.hit(s),false);
 }
 const start=s.tick;s.tick++;let point=null;
 for(let y=100;y<546&&!point;y+=2)for(let x=32;x<328&&!point;x+=2){
  s.player.x=x+.75;s.player.y=y+.75;if(N.hit(s))point=[s.player.x,s.player.y];
 }
 assert(point,'an opaque source contact remains');
 s.tick=start;[s.player.x,s.player.y]=point;s.player.invulnerableUntil=0;
 const before=s.player.hp,hits=s.hits;
 A.step(s,{});assert.equal(s.player.hp,before-1);assert.equal(s.hits,hits+1);assert.equal(s.bombsUsed,0);assert.equal(s.autoBombs,0);
});
