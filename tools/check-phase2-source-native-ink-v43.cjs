'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,Path2D}=require('@napi-rs/canvas');
globalThis.Path2D=Path2D;
const P=require('../src/arcade-phase2-signatures-v43.js'),A=require('../src/arcade-v43.js'),burn=require('../src/arcade-phase2-extra-art-v43.js'),bind=require('../src/arcade-phase2-extra-v43.js');
const {atlas,prepareAtlas}=require('../tests/helpers/phase2-source-image.cjs');
const probe=createCanvas(1,1).getContext('2d'),win={location:{search:'?mono=2'},CanvasRenderingContext2D:probe.constructor,HTMLImageElement:Image,CanvasGradient:probe.createLinearGradient(0,0,1,1).constructor,document:{documentElement:{classList:{add(){}}},createElement:()=>createCanvas(1,1)}};
win.window=win;vm.runInNewContext(fs.readFileSync('src/ink-v43.js','utf8'),win);vm.runInNewContext(fs.readFileSync('src/arcade-phase2-art-v43.js','utf8'),win);
globalThis.HapilInk=win.HapilInk;assert(HapilInk.on&&HapilInk.mono===2);
const extras=bind(P,A,Object.fromEntries(Object.values(burn).map(d=>[d.artId,d])));
const roles=[...Object.entries(P.roster).flatMap(([actor,b])=>b.themes.map((theme,i)=>({actor,stage:b.stage,scene:b.scene,theme,i,seg:1,extra:false}))),...Object.values(extras.specs).map(p=>({...p,extra:true}))];
(async()=>{
 const rows=[],out=process.env.PHASE2_SOURCE_PREVIEW;
 if(out)fs.mkdirSync(out,{recursive:true});
 for(const q of roles){
  const md=q.extra?burn[q.theme]:win.HapilPhase2Art[q.theme];
  await prepareAtlas(md);const art=atlas(md), paint=q.extra?extras.paint:P.paint;
  const sizes=['gentle','normal','hell'];
  for(const difficulty of sizes)for(const side of [1,-1]){
   const s={stage:'card',stageIndex:q.stage-1,seg:q.seg,difficulty,boss:{actor:q.actor,hp:1000,x:180,y:116},tick:0,player:{}};
   const e=q.extra?extras.make(s,{art,side}):P.make(s,{actor:q.actor,scene:q.scene,stage:q.stage,cardOrdinal:1,mid:false,themeIndex:q.i,renderSpec:art,side});assert(e,q.theme);
   const {timing:[w,a,d]}=e.plan,ds=[];
   const selected=q.theme==='spatial-slash'?[2,Math.floor(w*.48),w-1,w,w+1,w+a+3]
      :q.theme==='falling-vehicles'?[Math.floor(w*.2),Math.floor(w*.75),...Array.from({length:5},(_,i)=>w+i*7+2),w+a+5]
      :[Math.floor(w*.25),Math.floor(w*.75),w,w+Math.floor(a/2),w+a-1,w+a+5];
   for(const age of selected){
    s.tick=age;const ph=P.phaseAt(e.plan,age),c=createCanvas(360,640),ctx=c.getContext('2d');assert(paint(ctx,e,s));
    const hitPixels=ctx.getImageData(0,0,360,640).data;
    if(q.theme==='falling-vehicles')P.paintApproach(ctx,e,s);
    const actual=ctx.getImageData(0,0,360,640).data;
    let sampled=0,hits=0,strong=0,unseen=0,lo=255,warningPaint=0;
    for(let y=42;y<626;y+=3)for(let x=8;x<352;x+=3){
     s.player.x=x+.5;s.player.y=y+.5;sampled++;
     const pixel=hitPixels[(y*360+x)*4+3],a=actual[(y*360+x)*4+3];if(a>=24)warningPaint++;
     if(pixel>=100)strong++;
     if(P.hit(e,s,paint)){hits++;lo=Math.min(lo,pixel);if(pixel<80)unseen++;}
    }
    assert.equal(unseen,0,q.theme+' sampled collider without enough rendered source alpha: '+JSON.stringify({difficulty,side,age,lo,hits}));
    if(ph.name!=='active'||q.theme==='spatial-slash'&&ph.local!==0)assert.equal(hits,0);
    ds.push({age,phase:ph.name,local:ph.local,group:P.impactIndex(e.plan,ph),hits,strong,sampled,warningPaint,minHitAlpha:hits?lo:null});
    if(out&&difficulty==='normal'&&side===1&&[selected[1],q.theme==='spatial-slash'?w:selected[3]].includes(age)){
      const v=createCanvas(180,320).getContext('2d'),b=v.createImageData(180,320);
      for(let i=0;i<b.data.length;i+=4){b.data[i]=216;b.data[i+1]=207;b.data[i+2]=188;b.data[i+3]=255;}v.putImageData(b,0,0);v.drawImage(c,0,0,180,320);
      fs.writeFileSync(out+'/'+q.theme+'-'+ph.name+'.png',v.canvas.toBuffer('image/png'));
    }
   }
   assert(ds.some(k=>k.hits>0),q.theme+' has no visible attack in the staged active frame samples '+difficulty+' '+side);
   assert(ds.some(k=>k.phase==='telegraph'&&k.warningPaint>20),q.theme+' has no windup image '+difficulty+' '+side);
   rows.push({theme:q.theme,difficulty,side,samples:ds});
  }
 }
 assert.equal(rows.length,90);
 console.log(JSON.stringify({scope:'actual atlas pixels and exact native Ink draw routes, not browser/device',cases:rows},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
