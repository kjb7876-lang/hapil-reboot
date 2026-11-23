'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,Path2D}=require('@napi-rs/canvas');
const {prepareAtlas,atlas}=require('../tests/helpers/phase2-source-image.cjs');
globalThis.Path2D=Path2D;
const P=require('../src/arcade-phase2-signatures-v43.js'),A=require('../src/arcade-v43.js'),art=require('../src/arcade-phase2-p1-art-v43.js');
const E=require('../src/arcade-phase2-p1-v43.js')(P,A,{assets:Object.fromEntries(Object.values(art).map(d=>[d.artId,d])),offlineOnly:true});
const probe=createCanvas(1,1).getContext('2d'),win={location:{search:'?mono=2'},CanvasRenderingContext2D:probe.constructor,HTMLImageElement:Image,CanvasGradient:probe.createLinearGradient(0,0,1,1).constructor,document:{documentElement:{classList:{add(){}}},createElement:()=>createCanvas(1,1)}};win.window=win;
vm.runInNewContext(fs.readFileSync('src/ink-v43.js','utf8'),win);globalThis.HapilInk=win.HapilInk;
assert(HapilInk.on&&HapilInk.mono===2);
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const counts=[],out=process.env.PHASE2_P1_PREVIEW;
 if(out)fs.mkdirSync(out,{recursive:true});
 for(const q of Object.values(E.specs)){
  const d=art[q.theme];assert.equal(h(fs.readFileSync(d.path)),d.sha256);
  await prepareAtlas(d);const {image}=atlas(d),full=createCanvas(image.naturalWidth,image.naturalHeight).getContext('2d');HapilInk.raw(1);full.drawImage(image,0,0);HapilInk.raw(-1);
  const uniq=new Set();
  for(let k=0;k<d.frameCount;k++)uniq.add(h(Buffer.from(full.getImageData((k%d.columns)*d.cellWidth,Math.floor(k/d.columns)*d.cellHeight,d.cellWidth,d.cellHeight).data)));
  assert.equal(uniq.size,24);
  for(const difficulty of ['gentle','normal','hell'])for(const side of [-1,1]){
   const s={stage:'card',stageIndex:q.stage-1,tick:0,seg:q.seg,difficulty,player:{x:180,y:500},boss:{actor:q.actor,hp:400,x:180,y:114}};
   const e=E.make(s,{art:{...d,image},side});assert(e);
   const [w,a,r]=e.plan.timing,ages=[Math.floor(w*.34),Math.floor(w*.79),w,w+Math.floor(a/2),w+a-1,w+a+Math.floor(r/2)],report=[];
   for(const age of ages){
    s.tick=age;const f=P.phaseAt(e.plan,age),group=P.impactIndex(e.plan,f),c=createCanvas(360,640).getContext('2d');
    assert(E.paint(c,e,s));
    const pix=c.getImageData(0,0,360,640).data;
    let wrote=0,area=0,hits=0,alpha=255,possible=0;
    for(let y=0;y<640;y++)for(let x=0;x<360;x++){
     const cell=P.contains(e.plan,x+.5,y+.5,group),a=pix[(y*360+x)*4+3];if(cell)area++;if(a>0)wrote++;
     assert(!a||cell,'alpha cannot leak past actual lane');
     if(x%3===1&&y%3===1&&y>=40&&y<626&&x>=8&&x<352){
      possible++;s.player={x:x+.5,y:y+.5};if(E.hit(e,s)){hits++;alpha=Math.min(a,alpha);assert(a>=85,'hit without visible source alpha');}
     }
    }
    if(f.name==='telegraph')assert(wrote>60&&wrote/area<.85,q.theme+' does not use a warning fill');
    if(f.name!=='active')assert.equal(hits,0);
    report.push({phase:f.name,n:wrote,area,group,hitSamples:hits,totalSamples:possible,minHitAlpha:hits?alpha:null});
    if(out&&difficulty==='normal'&&side===1&&(age===ages[1]||age===ages[3])){
     const v=createCanvas(202,359).getContext('2d'),b=v.createImageData(202,359);
     for(let i=0;i<b.data.length;i+=4){b.data[i]=216;b.data[i+1]=207;b.data[i+2]=188;b.data[i+3]=255;}v.putImageData(b,0,0);v.drawImage(c.canvas,0,0,202,359);
     fs.writeFileSync(out+'/'+q.seg+'-'+q.theme+'-'+f.name+'.png',v.canvas.toBuffer('image/png'));
    }
   }
   assert(report.some(f=>f.hitSamples>0),q.theme+' has actual painted contact');
   counts.push({seg:q.seg,difficulty,side,report});
  }
 }
 assert.equal(counts.length,36);
 console.log(JSON.stringify({scope:'Actual native-Ink offline raster with original atlases, not gameplay',cases:counts},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
