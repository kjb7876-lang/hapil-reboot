'use strict';
// Optional exact-game CI fixture. Browser is supplied by the existing runner;
// nothing in this fixture replaces render, Ink, geometry, or collision.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function phase2Browser(browser,url,out,options={}){
 const cases=Object.entries(require('../src/arcade-phase2-native-v43.js').slots).filter(([id])=>!options.only||options.only.includes(id));
 const data=[],errors=[],page=await browser.newPage(options.mobile?{viewport:{width:390,height:790},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:940,height:780}});
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   const R=CanvasRenderingContext2D.prototype.drawImage,washed=new WeakMap();
   const t=window.__phase2NativeInk={wash:0,filtered:0,raw:0,last:null,bySource:{}};
   CanvasRenderingContext2D.prototype.drawImage=function(src,...args){
    const name=String(src?.src||'').match(/\/phase2-v43\/([^?]+\.webp)(?:\?|$)/)?.[1],main=this.canvas.id==='arcade-canvas';
    if(name&&!main){washed.set(this.canvas,name);t.wash++;}
    if(name&&main)t.raw++;
    if(main&&washed.has(src)){t.filtered++;t.last=washed.get(src);t.bySource[t.last]=(t.bySource[t.last]||0)+1;}
    return R.call(this,src,...args);
   };
  });
  await page.goto(url+'/arcade.html?eyes=0');
  await page.waitForFunction(()=>HapilArcadeApp.getState()&&document.getElementById('arcade-start')&&!document.getElementById('arcade-start').disabled);
  assert(await page.evaluate(()=>HapilInk.on&&HapilInk.mono===2),'real native default Ink mode enabled');
  for(const [actor,slot] of cases){
   await page.evaluate(seg=>HapilArcadeApp.debugState().jumpSegment(seg,false),slot.segment);
   await page.waitForFunction(seg=>{const v=HapilArcadeApp.debugState().state;return v?.seg===seg&&v.stage==='card';},slot.segment,{timeout:40000});
   // Explicit staged card and training protection; the normal sim and drawing continue.
   await page.evaluate(()=>{
    const app=HapilArcadeApp,engine=HapilArcade,raw=engine.step;
    if(window.__phase2Wrapped)return;
    engine.step=function(s,input){
     if(s.entranceAll&&s.stage==='card'){
      s.player.invulnerableUntil=s.tick+90;s.boss.hp=s.boss.maxHp;
     }
     return raw(s,input);
    };window.__phase2Wrapped=true;
   });
   for(const theme of slot.themes){
    await page.waitForFunction(theme=>{const d=HapilArcadeApp.debugState();return d.signature?.theme===theme&&d.signature?.phase==='telegraph';},theme,{timeout:30000});
    const warning=await page.evaluate(()=>{const d=HapilArcadeApp.debugState();return d.signature;});
    assert(warning.coverage>=.5-1e-5&&warning.coverage<=.7+1e-5);
    // Snapshot exact active canvas from within the same animation frame,
    // after observing a native filtered draw (not a delayed UI screenshot).
    await page.evaluate(theme=>{
     window.__phase2PendingCapture=null;
     const asset=HapilPhase2Art[theme],key=q=>q.url.split('/').pop().split('?')[0];
     const needs=[key(asset),...(asset.alternateSpec?[key(asset.alternateSpec)]:[])];
     function take(){
      const d=HapilArcadeApp.debugState(),ink=window.__phase2NativeInk,s=d.signature;
      if(s?.theme===theme&&s.phase==='active'&&needs.some(f=>ink.bySource[f]>0)){
       window.__phase2PendingCapture={signature:s,polygon:'logical arena incl. safety strip',draw:{...ink},image:document.getElementById('arcade-canvas').toDataURL('image/png')};return;
      }
      requestAnimationFrame(take);
     }
     requestAnimationFrame(take);
    },theme);
    await page.waitForFunction(()=>!!window.__phase2PendingCapture,undefined,{timeout:30000});
    const {image,draw,signature}=await page.evaluate(()=>window.__phase2PendingCapture);
    assert.equal(draw.raw,0,'no raw native-canvas draw bypass');
    assert(draw.wash>0&&draw.filtered>0,'verified native washed sprite reaches actual canvas');
    assert.equal(signature.phase,'active');
    assert(image.startsWith('data:image/png;base64,'));
    const bytes=Buffer.from(image.slice(22),'base64');assert(bytes.length>4000,'nonblank real active game');
    fs.writeFileSync(path.join(out,'phase2-'+(options.mobile?'mobile-':'')+theme+'-active.png'),bytes);
    data.push({actor,theme,slot:slot.segment,warning,draw,signature});
   }
  }
  assert.equal(data.length,cases.reduce((n,[,slot])=>n+slot.themes.length,0));assert.deepEqual(errors,[]);
  return {scope:'seeded native browser visuals, not normal play or physical device',data};
 }finally{await page.close();}
};
