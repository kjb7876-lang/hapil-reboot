'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function extraBrowser(browser,url,out){
 const page=await browser.newPage({viewport:{width:390,height:790},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const data=[],errors=[]; page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   const R=CanvasRenderingContext2D.prototype.drawImage,wash=new WeakMap(),t={wash:0,filtered:0,raw:0};
   window.__extraInk=t;
   CanvasRenderingContext2D.prototype.drawImage=function(src,...args){
    const name=String(src?.src||'').match(/\/phase2-extra\/([^?]+\.webp)(?:\?|$)/)?.[1],main=this.canvas.id==='arcade-canvas';
    if(name&&!main){wash.set(this.canvas,name);t.wash++;}
    if(name&&main)t.raw++;
    if(main&&wash.has(src)){t.filtered++;t.source=wash.get(src);}
    return R.call(this,src,...args);
   };
  });
  await page.goto(url+'/arcade.html?eyes=0');
  await page.waitForFunction(()=>HapilArcadeApp.getState()&&document.getElementById('arcade-start')&&!document.getElementById('arcade-start').disabled);
  await page.locator('[data-difficulty=hell]').click();
  assert(await page.evaluate(()=>HapilInk.on&&HapilInk.mono===2&&matchMedia('(pointer:coarse)').matches));
  for(const [seg,mode] of [[227,'escape'],[321,'contact'],[325,'escape'],[489,'escape'],[572,'escape'],[574,'escape']]){
   const r=await page.evaluate(({seg,mode})=>{
    const app=HapilArcadeApp,N=HapilPhase2Native,P=HapilPhase2Local,E=HapilPhase2Extension(P,HapilArcade),step=HapilArcade.step;
    const report=window.__extraReport={seg,mode,positions:[],phases:{}},priorInk=window.__extraInk.filtered;
    const canvas=document.getElementById('arcade-canvas'),ctx=canvas.getContext('2d');
    app.debugState().jumpSegment(seg,true);
    let p,firstTick,firstHits,target,entry;
    HapilArcade.step=function(s,input){
     if(s.seg!==seg||report.done)return step(s,input);
     const q=N.inspect(s);if(s.stage==='card'||q)s.boss.hp=s.boss.maxHp; // prevent scripted fixture from killing the target card.
     s.bombs=0;
     if(q?.phase==='telegraph'&&!p){
      const planned=E.plan(seg,s.difficulty,q.safeLane[0]<180?1:-1);
      if(!planned)throw Error('missing exact canonical browser geometry');
      entry=null;
      for(let y=150;y<611&&!entry;y+=3)for(let x=65;x<300;x+=3)
       if(N.firstContactAt(s,x+.5,y+.5)){entry={x:x+.5,y:y+.5};break;}
      if(!entry)throw Error('no actual visible source contact for '+seg);
      p=planned;
      firstTick=s.tick;firstHits=s.hits;
      report.maxClip=q.maxClip;report.safeLane=q.safeLane;report.difficulty=s.difficulty;report.compact=s.compact;
      report.staged={tick:s.tick,legacyBullets:s.n};report.card=HapilArcade.SEGMENTS[seg].name;
      // Seed only the starting point. Subsequent movement uses the engine's normal input path.
      s.player.x=entry.x;s.player.y=entry.y;s.player.invulnerableUntil=0;report.entry=entry;
      target=(q.safeLane[0]+q.safeLane[1])/2;
     }
     if(p){
      const elapsed=s.tick-firstTick;
      if(mode==='escape'&&q?.phase==='telegraph'&&elapsed>=15)input={...input,dx:target-s.player.x,dy:0,focus:false};
      report.positions.push({x:s.player.x,at:elapsed,phase:q?.phase,hits:s.hits-firstHits,stock:s.bombs});
     }
     const result=step(s,input);
     if(p){
      const v=N.inspect(s),a=v?.phase;if(a==='active'&&!report.phases.active)report.phases.active={at:s.tick-firstTick,hits:s.hits-firstHits,mask:N.hit(s),bullets:s.n,x:s.player.x,y:s.player.y,invulnerableUntil:s.player.invulnerableUntil};
      if(a==='decay'&&!report.phases.decay)report.phases.decay={hits:s.hits-firstHits,mask:N.hit(s),bullets:s.n,x:s.player.x,y:s.player.y,invulnerableUntil:s.player.invulnerableUntil};
      if(a==='decay'&&report.image){report.done=true;HapilArcade.step=step;}
     }
     return result;
    };
    function loop(){
     const s=app.debugState(),q=s.signature;
     if(q?.phase==='telegraph'&&q.local>=55&&!report.warningImage)report.warningImage=canvas.toDataURL('image/jpeg',.88);
     if(q?.phase==='active'&&!report.image&&window.__extraInk.filtered>priorInk){
      // Actual per-effect render, through the same native Ink prototype, on
      // transparent backing so campsite/legacy pixels cannot fake visibility.
      const off=document.createElement('canvas');off.width=HapilArcade.WIDTH;off.height=HapilArcade.HEIGHT;
      const isolated=off.getContext('2d');N.paint(isolated,s.state);
      const pixels=isolated.getImageData(0,0,off.width,off.height).data,read=(x,y)=>pixels[(Math.floor(y)*off.width+Math.floor(x))*4+3];
      let paint=0,total=0;for(let y=43;y<626;y+=3)for(let x=8;x<352;x+=3){total++;if(read(x,y)>=80)paint++;}
      report.alpha={paint,total,entry:read(entry.x,entry.y),player:read(s.state.player.x,s.state.player.y)};
      report.ink={...window.__extraInk};report.image=canvas.toDataURL('image/png');
     }
     if(!report.done)requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);return true;
   },{seg,mode});assert(r);
   await page.waitForFunction(()=>window.__extraReport?.done,undefined,{timeout:30000});
   const {image,warningImage,...proof}=await page.evaluate(()=>window.__extraReport);
   assert(warningImage?.startsWith('data:image/jpeg;base64,'));
   fs.writeFileSync(path.join(out,'phase2-extra-mobile-'+seg+'-warning.jpg'),Buffer.from(warningImage.slice('data:image/jpeg;base64,'.length),'base64'));
   fs.writeFileSync(path.join(out,'phase2-extra-mobile-'+seg+'-trace.json'),JSON.stringify(proof,null,2));
   assert(Number.isFinite(proof.entry?.x)&&Number.isFinite(proof.entry?.y));
   if(mode==='escape')assert(proof.phases.active.x>=proof.safeLane[0]&&proof.phases.active.x<proof.safeLane[1],'real native movement crossed exact lane');
   assert.equal(proof.phases.active.bullets,0,'follow-on must not insert over a legacy volley');
   assert.equal(proof.ink.raw,0);assert(proof.ink.filtered>0&&proof.ink.wash>0);
   assert.equal(proof.difficulty,'hell');assert(proof.compact);assert.equal(proof.staged.legacyBullets,0);
   assert(Math.abs(proof.maxClip-.70)<1e-5);
   assert(proof.alpha.paint>0&&proof.alpha.paint/proof.alpha.total<proof.maxClip);
   if(mode==='escape')assert(proof.alpha.player<80,'safe lane has no dark effect pixels');
   assert(proof.positions.filter(p=>p.phase==='telegraph').every(p=>p.hits===0&&p.stock===0));
   assert.equal(proof.phases.active.hits,mode==='contact'?1:0);
   assert.equal(proof.phases.active.mask,mode==='contact');
   assert(!proof.phases.decay.mask);assert.equal(proof.phases.decay.hits,mode==='contact'?1:0);
   assert(proof.positions.some((p,i)=>mode==='contact'||i>0&&p.x!==proof.positions[i-1].x),'normal movement input did change rendered player position');
   fs.writeFileSync(path.join(out,'phase2-extra-mobile-'+seg+'-'+mode+'.png'),Buffer.from(image.slice(22),'base64'));data.push(proof);
  }
  assert.deepEqual(errors,[]);
  return {scope:'seeded native Chromium mobile emulation (actual renderer and damage; scripted normal movement inputs, no real touch device claim)',data};
 }finally{await page.close();}
};
