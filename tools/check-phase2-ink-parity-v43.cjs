'use strict';
// Offline native Ink canvas and actual atlas pixels. This does not replace
// gameplay browser/real-phone checks, and does not modify the release artwork.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Image,Path2D}=require('@napi-rs/canvas');
const P=require('../src/arcade-phase2-signatures-v43.js'), N=require('../src/arcade-phase2-native-v43.js');
globalThis.Path2D=Path2D;
const base=path.join(__dirname,'..');
const probe=createCanvas(1,1).getContext('2d'),win={location:{search:'?mono=2'},CanvasRenderingContext2D:probe.constructor,HTMLImageElement:Image,
 CanvasGradient:probe.createLinearGradient(0,0,1,1).constructor,document:{documentElement:{classList:{add(){}}},createElement:()=>createCanvas(1,1)}};
win.window=win;
vm.runInNewContext(fs.readFileSync(path.join(base,'src/ink-v43.js'),'utf8'),win);
vm.runInNewContext(fs.readFileSync(path.join(base,'src/arcade-phase2-art-v43.js'),'utf8'),win);
globalThis.HapilInk=win.HapilInk;assert(HapilInk.on&&HapilInk.mono===2);
async function art(a){return {...a,image:await loadImage(path.join(base,a.url.split('?')[0])),alternateSpec:a.alternateSpec&&await art(a.alternateSpec)};}
const lum=(a,i)=>.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
(async()=>{
 const out=[];
 for(const [actor,b] of Object.entries(P.roster)){
  for(let ti=0;ti<b.themes.length;ti++){
   const theme=b.themes[ti],spec=await art(win.HapilPhase2Art[theme]);
   for(const difficulty of ['gentle','normal','hell']){
    const s={stage:'card',seg:1,tick:0,difficulty,boss:{actor,hp:500,x:180,y:116},player:{x:100,y:500}};
    const e=P.make(s,{stage:b.stage,scene:b.scene,actor,cardOrdinal:1,mid:false,themeIndex:ti,renderSpec:spec,side:1});
    assert(e,theme+' event');assert(Math.abs(e.plan.coverage-P.target[difficulty])<1e-5);
    const [pre,active,decay]=e.plan.timing;
    const record={actor,theme,difficulty,target:e.plan.target,measured:e.plan.coverage,lane:e.plan.safeLane,contrast:[],vehicleLandings:[]};
    for(const age of [Math.floor(pre*.5),pre+Math.floor(active*.5),pre+active+Math.floor(decay*.5)]){
     s.tick=age;const ph=P.phaseAt(e.plan,age),land=P.impactIndex(e.plan,ph),c=createCanvas(360,640).getContext('2d');
     assert(P.paint(c,e,s));N.fixtureFinish(c,e,s);
     const rr=c.getImageData(0,0,360,640).data;
     let expected=0,mismatch=0,hitMismatch=0;
     for(let y=0;y<640;y++)for(let x=0;x<360;x++){
      const cell=P.contains(e.plan,x+.5,y+.5,land);if(cell)expected++;
      if((rr[(y*360+x)*4+3]>0)!==cell)mismatch++;
      if(x%31===0&&y%23===0){s.player.x=x+.5;s.player.y=y+.5;if(P.hit(e,s)!==(cell&&ph.name==='active'))hitMismatch++;}
     }
     assert.equal(mismatch,0,theme+' '+ph.name+' paint/collision contour');
     assert.equal(hitMismatch,0,theme+' '+ph.name+' active-only hit map');
     for(let y=40;y<626;y+=11)for(let x=e.plan.safeLane[0];x<e.plan.safeLane[1];x+=2){
      s.player.x=x+.5;s.player.y=y+.5;assert.equal(P.hit(e,s),false,theme+' protected lane');
     }
     if(ph.name!=='active')continue;
     // Mobile-sized raster over two explicit parchment levels; compare the
     // danger fill to the *same* baseline even where the art itself is sparse.
     for(const paper of ['#d8cfbc','#8d877c']){
      const width=288,height=512,m=createCanvas(width,height).getContext('2d');
      m.fillStyle=paper;m.fillRect(0,0,width,height);const before=m.getImageData(0,0,width,height).data;
      m.scale(width/360,height/640);P.paint(m,e,s);N.fixtureFinish(m,e,s);const after=m.getImageData(0,0,width,height).data;
      let n=0,clear=0,sum=0;
      for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
       const gx=(x+.5)*360/width,gy=(y+.5)*640/height;
       if(![-1.1,0,1.1].every(k=>P.contains(e.plan,gx+k,gy,land)&&P.contains(e.plan,gx,gy+k,land)))continue;
       const i=(y*width+x)*4,delta=Math.abs(lum(before,i)-lum(after,i));
       n++;if(delta>=24)clear++;sum+=delta;
      }
      // This is a bounded screen-readability smoke signal, not a guarantee
      // about every pixel/background/device. Report the actual ratio (no rounding).
      assert(n>2000&&clear/n>=.75&&sum/n>=35,theme+' warning: very weak mobile-size practice-raster contrast over '+paper);
      const preview=process.env.PHASE2_INK_PREVIEW;
      if(preview&&difficulty==='normal'){fs.mkdirSync(preview,{recursive:true});fs.writeFileSync(path.join(preview,theme+'-'+paper.slice(1)+'.png'),m.canvas.toBuffer('image/png'));}
      record.contrast.push({paper,cells:n,ratio:clear/n,mean:sum/n});
     }
    }
    if(theme==='falling-vehicles')for(let i=0;i<5;i++){s.tick=pre+i*7;const r=e.plan.landings[i];let n=0;
      for(let j=0;j<r.length;j++)for(let k=0;k<r[j].length;k+=2)n+=r[j][k+1]-r[j][k];
      record.vehicleLandings.push(n);}
    out.push(record);
   }
  }
 }
 assert.equal(out.length,27);
 console.log(JSON.stringify({scope:'Actual authored WebPs, native Ink mono2 through @napi-rs/canvas; logical pixel occupancy and mobile-size two-tone contrast, not browser/physical phone',cases:out},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
