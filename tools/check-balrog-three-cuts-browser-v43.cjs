'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function verifyThreeCuts(browser,url,out){
 const report=[];
 for(const mobile of [false,true])for(const mode of ['inside','outside']){
  const page=await browser.newPage(mobile?{viewport:{width:390,height:790},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:940,height:780}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url+'/arcade.html?eyes=0');
   await page.waitForFunction(()=>HapilArcadeApp.getState()&&!document.getElementById('arcade-start').disabled);
   if(mobile)await page.locator('[data-difficulty=hell]').click();
   await page.evaluate(mode=>{
    const A=HapilArcade,N=HapilPhase2Native,P=HapilPhase2Local,app=HapilArcadeApp,raw=A.step;
    const result=window.__balrogThree={trace:[],shots:{},mode,seenMeteor:false};
    app.debugState().jumpSegment(77,true);
    let point=null,baseHits,setup=false;
    A.step=function(s,input){
     if(s.seg!==77||result.done)return raw(s,input);
     if(!setup){s.player.x=25;s.player.y=560;s.noDistort=true;setup=true;}
     if(s.stage==='card')s.boss.hp=s.boss.maxHp;
     s.bombs=0;
     const before=N.inspect(s);
     if(before?.theme==='meteor')result.seenMeteor=true;
     // Training protection is limited to the unrelated lead-in. It is explicitly
     // cleared before this fixture observes ANY cut phase. No combat buffs after.
     if(!point&&before?.theme!=='spatial-slash')s.player.invulnerableUntil=s.tick+30;
     if(before?.theme==='spatial-slash'&&before.phase==='telegraph'&&!point){
      const p=P.plan({theme:'spatial-slash',difficulty:s.difficulty,side:before.safeLane[0]<180?1:-1});
      if(mode==='inside'){
       for(let y=325;y<500&&!point;y+=3)for(let x=65;x<310;x+=3)
        if(N.firstContactAt(s,x+.5,y+.5)){point=[x+.5,y+.5];break;}
      }else{
       // Witness from the pinned 379287af broad field, now between the
       // first two actually painted cuts. Verified in Normal and Hell, both sides.
       const gap=[p.side>0?140.5:219.5,335.5];
       if(!P.contains(p,...gap)&&!N.firstContactAt(s,...gap)){point=gap;result.internalGap=true;}
      }
      if(!point)throw Error('could not resolve exact source sample');
      [s.player.x,s.player.y]=point;s.player.invulnerableUntil=0;baseHits=s.hits;result.point=point;result.clip=before.coverage;
      result.compact=s.compact;result.difficulty=s.difficulty;result.stage=s.stageIndex+1;
     }
     const pre={stock:s.bombs,hp:s.player.hp,bombsUsed:s.bombsUsed,autoBombs:s.autoBombs};
     const r=raw(s,input),v=N.inspect(s);
     if(point&&v?.cuts){
      result.trace.push({phase:v.phase,local:v.local,...v.cuts,hits:s.hits-baseHits,mask:N.hit(s),preStock:pre.stock,
       postStock:s.bombs,lifeDelta:s.player.hp-pre.hp,bombUses:s.bombsUsed-pre.bombsUsed,autoBombs:s.autoBombs-pre.autoBombs,
       iframes:s.player.invulnerableUntil,n:s.n});
      if(v.cuts.armed){
       const c=document.createElement('canvas');c.width=A.WIDTH;c.height=A.HEIGHT;const g=c.getContext('2d');N.paint(g,s);
       result.alphaAtProbe=g.getImageData(Math.floor(point[0]),Math.floor(point[1]),1,1).data[3];
      }
      if(v.phase==='decay'&&v.local>=4&&result.shots.one&&result.shots.two&&result.shots.three){result.done=true;A.step=raw;}
     }
     return r;
    };
    const ctxCanvas=document.getElementById('arcade-canvas');
    function raf(){
     const d=app.debugState(),v=d.signature,q=v?.cuts;
     if(q&&point){
      const phase=v.phase==='telegraph'&&q.visible===1&&q.full===1?'one':
                  v.phase==='telegraph'&&q.visible===2&&q.full===2?'two':
                  v.phase==='active'&&q.full===3?'three':null;
      if(phase&&!result.shots[phase]){
       result.shots[phase]=ctxCanvas.toDataURL('image/jpeg',.87);

      }
     }
     if(!result.done)requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
   },mode);
   await page.waitForFunction(()=>window.__balrogThree?.done,undefined,{timeout:60000});
   const {shots,...r}=await page.evaluate(()=>window.__balrogThree),prefix='balrog-three-'+(mobile?'mobile':'desktop')+'-'+mode;
   fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify(r,null,2));
   assert.deepEqual(errors,[]);assert(r.seenMeteor);assert.equal(r.stage,7);assert.equal(r.compact,mobile);
   assert.equal(r.difficulty,mobile?'hell':'normal');
   const pre=r.trace.filter(x=>x.phase==='telegraph'),arm=r.trace.filter(x=>x.armed),after=r.trace.filter(x=>x.phase==='decay'||x.phase==='active'&&!x.armed);
   assert(pre.some(x=>x.full===1)&&pre.some(x=>x.full===2)&&pre.every(x=>x.hits===0&&!x.mask&&x.iframes===0));
   assert.equal(arm.length,1);assert.equal(arm[0].full,3);assert.equal(arm[0].hits,mode==='inside'?1:0);
   assert(after.length>0&&after.every(x=>x.hits===(mode==='inside'?1:0)&&!x.mask));
   if(mode==='outside')assert(r.internalGap===true);
   assert(r.trace.every(x=>x.preStock===0&&x.bombUses===0&&x.autoBombs===0),'no bomb available/used at any measured tick');
   assert(r.trace.every(x=>x.lifeDelta===(mode==='inside'&&x.armed?-1:0)),'ordinary native damage, not an auto-bomb');
   // After ordinary damage the game restores base stock only if the player survived.
   assert(r.trace.every(x=>x.postStock===0||mode==='inside'&&x.armed&&x.lifeDelta===-1),'only the native life-loss refill may occur');
   assert(mode==='inside'?r.alphaAtProbe>=75:r.alphaAtProbe<80);
   for(const [key,bytes] of Object.entries(shots))fs.writeFileSync(path.join(out,prefix+'-'+key+'.jpg'),Buffer.from(bytes.split(',')[1],'base64'));
   report.push(r);
  }finally{await page.close();}
 }
 const failed=await browser.newPage();
 try{
  await failed.route('**/balrog-spatial-slash-24-lossless.webp*',r=>r.abort());
  await failed.goto(url+'/arcade.html?eyes=0');
  await failed.waitForFunction(()=>HapilArcadeApp.getState()&&!document.getElementById('arcade-start').disabled);
  await failed.evaluate(()=>{
   const A=HapilArcade,N=HapilPhase2Native,base=A.step,proof=window.__noSlash={seenMeteor:false,seenSlash:false,count:0};
   HapilArcadeApp.debugState().jumpSegment(77,true);
   A.step=function(s,input){
    if(s.seg===77&&s.stage==='card'){s.boss.hp=s.boss.maxHp;s.player.invulnerableUntil=s.tick+30;
     const q=N.inspect(s);proof.seenMeteor||=q?.theme==='meteor';proof.seenSlash||=q?.theme==='spatial-slash';
     if(proof.seenMeteor&&!q?.theme&&s.segTick>300)proof.count++;
    }
    return base(s,input);
   };
  });
  await failed.waitForFunction(()=>window.__noSlash?.count>260,undefined,{timeout:55000});
  const proof=await failed.evaluate(()=>window.__noSlash);assert(proof.seenMeteor&&!proof.seenSlash);
  return {scope:'seeded stage-7 actual native engine and canvas, mobile emulation is not physical hardware',report,noArt:proof};
 }finally{await failed.close();}
};
