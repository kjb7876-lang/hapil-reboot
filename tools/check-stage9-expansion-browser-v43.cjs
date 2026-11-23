'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

// Real production 2D Canvas draw + scene 09-1 background, hot engine state and HTMLImage resources.
// This test-only wrapper records bytes around the existing painter, never changes it or the game clock.
module.exports=async function stage9ExpansionBrowser(browser,uri,out){
 const results=[];
 for(const tier of ['gentle','normal','hell'])for(const seg of [103,105]){
  const options={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
  const page=await browser.newPage(options);
  const prefix='stage9-composited-'+tier+'-'+seg,errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.addInitScript(()=>{
    const record={want:null,frames:[],images:{},errors:[]};window.__stage9ActualComposite=record;
    let wrapped;
    function assign(original){
     wrapped={...original,paint(ctx,s){
      const ph=original.inspect(s);
      const hot=s.seg===record.want&&s.boss.actor==='p1_staff'&&s.stageIndex===8&&ph?.phase==='active'&&ctx.canvas.id==='arcade-canvas';
      if(!hot||!window.HapilArcadeApp?.getState().images.includes('bg-loop-09-1'))return original.paint(ctx,s);
      const band=Math.min(3,Math.floor(4*ph.local/ph.timing[1]));
      if(record.frames.some(x=>x.band===band))return original.paint(ctx,s);
      const transform=ctx.getTransform(),W=ctx.canvas.width,H=ctx.canvas.height;
      const crop=[Math.floor(8*transform.a+transform.e),Math.floor(40*transform.d+transform.f),
        Math.ceil(352*transform.a+transform.e),Math.ceil(626*transform.d+transform.f)];
      if(transform.b||transform.c||crop[0]<0||crop[1]<0||crop[2]>W||crop[3]>H){
       record.errors.push('non-identity scaled arena '+JSON.stringify(crop));
       return original.paint(ctx,s);
      }
      const [x0,y0,x1,y1]=crop,cw=x1-x0,ch=y1-y0;
      const before=ctx.getImageData(x0,y0,cw,ch).data;
      if(band===1)record.images.before=ctx.canvas.toDataURL('image/webp',.85);
      const rendered=original.paint(ctx,s);
      if(!rendered)return rendered;
      const after=ctx.getImageData(x0,y0,cw,ch).data;
      const ink=document.createElement('canvas');ink.width=360;ink.height=640;
      const ic=ink.getContext('2d',{willReadFrequently:true});original.paint(ic,s);
      const alpha=ic.getImageData(0,0,360,640).data;
      const luma=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
      let strong=0,light12=0,light30=0,hits=0,weakHits=0,minHitDelta=255,emptyHits=0;
      const old=[s.player.x,s.player.y];
      try{
       for(let y=40;y<626;y++)for(let x=8;x<352;x++){
        const ix=Math.floor((x+.5)*transform.a+transform.e)-x0,iy=Math.floor((y+.5)*transform.d+transform.f)-y0;
        const i=(iy*cw+ix)*4,a=alpha[(y*360+x)*4+3],delta=Math.abs(luma(before,i)-luma(after,i));
        if(a>=98){if(delta>=12)light12++;if(delta>=20)strong++;if(delta>=30)light30++;}
        if(x%3===0&&y%3===0){s.player.x=x+.5;s.player.y=y+.5;if(original.hit(s)){
         hits++;minHitDelta=Math.min(minHitDelta,delta);if(delta<20||a<98)weakHits++;if(!a)emptyHits++;
        }}
       }
      }finally{[s.player.x,s.player.y]=old;}
      const phase=HapilArcade.livePhaseOf(s,s.seg);
      record.frames.push({stage:s.stageIndex+1,seg:s.seg,actor:s.boss.actor,form:s.formKey,difficulty:s.difficulty,
       ordinal:phase?.no,phaseCount:phase?.count,band,tick:s.tick,local:ph.local,theme:ph.theme,loaded:true,
       total:201584,strong,light12,light30,hits,weakHits,emptyHits,minHitDelta});
      if(band===1){record.images.layer=ctx.canvas.toDataURL('image/webp',.85);queueMicrotask(()=>{record.images.full=ctx.canvas.toDataURL('image/webp',.85);});}
      return rendered;
     }};
    }
    Object.defineProperty(window,'HapilPhase2Native',{configurable:true,get:()=>wrapped,set:assign});
   });
   await page.goto(uri+'/arcade.html?mono=2&eyes=0',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.HapilArcadeApp?.debugState&&document.getElementById('arcade-start')&&!document.getElementById('arcade-start').disabled);
   await page.locator('[data-difficulty="'+tier+'"]').click();
   await page.evaluate(seg=>{window.__stage9ActualComposite.want=seg;HapilArcadeApp.debugState().jumpSegment(seg,true);},seg);
   for(let i=0;i<4;i++){
    await page.waitForFunction(()=>window.__stage9ActualComposite.frames.length>=4||HapilArcadeApp.getState().mode==='story',null,{timeout:23000});
    if(await page.evaluate(()=>HapilArcadeApp.getState().mode)==='story'){await page.locator('#story-skip').click();continue;}
    break;
   }
   const proof=await page.evaluate(()=>window.__stage9ActualComposite);
   for(const [name,url] of Object.entries(proof.images))if(url)fs.writeFileSync(path.join(out,prefix+'-'+name+'.webp'),Buffer.from(url.split(',')[1],'base64'));
   const {images,...report}=proof;fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify(report,null,2));
   console.log('STAGE9_EXPANSION_COMPOSITE '+JSON.stringify({tier,seg,frames:report.frames,errors:report.errors}));
   assert.deepEqual(report.errors,[]);assert.deepEqual(errors,[]);assert.deepEqual(report.frames.map(x=>x.band),[0,1,2,3]);
   assert(images.before&&images.layer&&images.full,'capture actual full app before/after proof');
   for(const r of report.frames){
    assert.equal(r.stage,9);assert.equal(r.actor,'p1_staff');assert.equal(r.seg,seg);
    assert.equal(r.form,'8|p1_staff|0');assert.equal(r.difficulty,tier);
    assert.equal(r.ordinal,seg===103?2:tier==='hell'?4:3);
    assert(r.strong>=60476, prefix+': real scene coverage ≥30% of 344×586 alpha≥98 + Δluma≥20: '+JSON.stringify(r));
    assert(r.hits>10);assert.equal(r.weakHits,0);assert.equal(r.emptyHits,0);
   }
   results.push({tier,seg,frames:report.frames});
  }finally{await page.close();}
 }
 return {scope:'actual production Canvas 2D and HTMLImage, seeded exact app cards, compact Chromium DPR2, not physical or whole-fight trace',results};
};
