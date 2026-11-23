'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assetMap={
  13:['eggkeeper-silk','spider-eggkeeper-silk.webp'],
  16:['violet-white-wings','violet-white-wings-seg16-r1.webp'],
  18:['violet-eight-leg-silk','violet-eight-leg-silk-seg18-r1.webp']
};
module.exports=async function stage2Browser(browser,uri,out){
 const notes=[];
 for(const seg of [13,16,18])for(const mode of ['ready','missing','delayed']){
  const [theme,file]=assetMap[seg], page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const failures=[],target='**/'+file+'*';let observed=0,release=null,latched=Promise.resolve();
  if(mode==='delayed')latched=new Promise(r=>{release=r});
  await page.addInitScript(()=>{
    const created=window.__stage2CreatedImages=[];
    window.Image=new Proxy(window.Image,{construct(Target,args){const image=Reflect.construct(Target,args);created.push(image);return image;}});
  });
  try{
  await page.route(target,async route=>{
    observed++;
    if(mode==='missing')await route.fulfill({status:404,body:''});
    else{if(mode==='delayed')await latched;await route.continue();}
  });
  page.on('pageerror',e=>failures.push(e.message));
  await page.goto(uri+'/arcade.html?mono=2',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HapilArcade?.createRun&&window.HapilPhase2Native?.preload&&window.HapilInk?.mono===2&&document.getElementById('arcade-start')&&!document.getElementById('arcade-start').disabled);
  const started=await page.evaluate(async({seg,mode,theme})=>{
    const A=window.HapilArcade,N=window.HapilPhase2Native;
    if(N.slotFor(seg)?.themes[0]!==theme)throw Error('missing exact Stage2 admission');
    const s=A.createRun({segment:seg,spellOnly:true,entranceAll:true,difficulty:'hell',compact:true,seed:5815,distort:false});
    s.player.x=90;s.bombs=0;s.player.invulnerableUntil=100000;
    window.__stage2BrowserFixture=s;
    N.preload(2,'02');
    for(let i=0;i<640;i++){
      A.step(s,{});
      if(i%5===0)await new Promise(requestAnimationFrame);
      if(N.inspect(s)?.phase==='telegraph'||s.stage==='card'&&s.n>0)break;
    }
    return {phase:N.inspect(s)?.phase??null,seg:s.seg,n:s.n,stage:s.stage,segTick:s.segTick};
  },{seg,mode,theme});
  assert(observed>0,'no actual HTMLImage asset request');
  assert.equal(started.seg,seg);
  const ready=()=>page.waitForFunction(file=>window.__stage2CreatedImages.some(im=>im.src.includes(file)&&HapilPhase2Source.ready(im)),file,{timeout:10000});
  if(mode!=='ready'){
    assert.equal(started.phase,null);assert(started.n>0&&started.stage==='card');
    if(release){const arrival=page.waitForResponse(r=>r.url().includes(file)&&r.ok(),{timeout:8000});release();await arrival;await ready();}
    const late=await page.evaluate(async()=>{
      const A=window.HapilArcade,N=window.HapilPhase2Native,s=window.__stage2BrowserFixture;
      let inserted=false;for(let i=0;i<120;i++){A.step(s,{});inserted||=!!N.inspect(s)?.phase;if(i%5===0)await new Promise(requestAnimationFrame);}
      return {inserted,segTick:s.segTick,n:s.n};
    });
    assert(!late.inserted&&late.segTick>100);
    notes.push({seg,mode,started,late,actuallyDecoded:mode==='delayed'});
  }else{
    await ready();assert.equal(started.phase,'telegraph');assert.equal(started.n,0);
    const measured=await page.evaluate(()=>{
      const A=window.HapilArcade,N=window.HapilPhase2Native,s=window.__stage2BrowserFixture;
      function until(name){for(let i=0;i<120&&N.inspect(s)?.phase!==name;i++)A.step(s,{});if(N.inspect(s)?.phase!==name)throw Error('phase '+name);}
      function probe(){
        const canvas=document.createElement('canvas');
        // Render at CSS logical 360x640 on DPR 2; sampled contact remains in logical coordinates.
        canvas.width=720;canvas.height=1280;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);
        if(!N.paint(ctx,s))throw Error('no native canvas effect');
        const d=ctx.getImageData(0,0,720,1280).data;
        let hits=0,min=255,holes=0,blank=0,point,blankPoint;
        const saved=[s.player.x,s.player.y];
        for(let y=40;y<626;y+=2)for(let x=8;x<352;x+=2){
          const a=d[((y*2+1)*720+x*2+1)*4+3];
          s.player.x=x+.75;s.player.y=y+.75;
          if(!a){blank++;if(x>66&&x<298&&y>95&&y<546&&!blankPoint)blankPoint=[x+.75,y+.75];}
          if(N.hit(s)){hits++;min=Math.min(min,a);point=[s.player.x,s.player.y];if(!a)holes++;}
        }
        [s.player.x,s.player.y]=saved;
        return{hits,min,holes,blank,point,blankPoint};
      }
      for(let i=0;i<20;i++)A.step(s,{});
      const early=probe();until('active');for(let i=0;i<7;i++)A.step(s,{});
      const active=probe();
      const savedTick=s.tick;s.tick++;const next=probe();s.tick=savedTick;
      if(!next.point)throw Error('no following contact sample');
      [s.player.x,s.player.y]=next.point;
      const hp=s.player.hp,hits=s.hits,stock=s.bombs,used=s.bombsUsed,autos=s.autoBombs;
      s.player.invulnerableUntil=0;A.step(s,{});const hurt=hp-s.player.hp;
      const damage={stock,hits:s.hits-hits,uses:s.bombsUsed-used,auto:s.autoBombs-autos};
      const img=document.createElement('canvas');img.width=A.WIDTH;img.height=A.HEIGHT;N.paint(img.getContext('2d'),s);
      const preview=img.toDataURL('image/png');
      s.player.invulnerableUntil=100000;until('decay');const decay=probe();
      return {early,active,decay,hurt,damage,preview};
    });
    assert.equal(measured.early.hits,0);assert.equal(measured.decay.hits,0);
    assert(measured.active.hits>10&&measured.active.min>=98&&measured.active.blank>15000);
    assert.equal(measured.active.holes,0);
    assert.equal(measured.hurt,1);
    assert.deepEqual(measured.damage,{stock:0,hits:1,uses:0,auto:0});
    const {preview,...rest}=measured;
    fs.writeFileSync(path.join(out,'stage2-'+seg+'-native-active.png'),Buffer.from(preview.split(',')[1],'base64'));
    notes.push({seg,mode,started,measured:rest});
  }
  assert.deepEqual(failures,[]);
  }finally{if(release)release();await page.close();}
 }
 return {scope:'seeded exact engine/native Canvas and HTMLImage in Chromium compact DPR2, not ordinary play or a real phone',cases:notes};
};
