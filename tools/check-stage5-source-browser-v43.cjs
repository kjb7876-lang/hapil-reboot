'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assetMap={
  53:['grave-mid-stitched-shroud','grave-mid-stitched-shroud-seg53.webp'],
  56:['grave-armor-mounds','grave-armor-mounds-seg56.webp'],
  58:['grave-comrade-delayed-echo','grave-comrade-delayed-echo-seg58-v2.webp']
};
module.exports=async function stage5Browser(browser,uri,out){
 const notes=[];
 for(const seg of [53,56,58])for(const mode of ['ready','missing','delayed']){
  const [theme,file]=assetMap[seg], page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const failures=[],target='**/'+file+'*';let observed=0,release=null,latched=Promise.resolve();
  const prefix='stage5-'+seg+'-'+mode+'-diagnostic',run={seg,theme,file,mode,seed:5815,compact:true,dpr:2,observed:0};
  const report=()=>fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify(run,null,2));
  if(mode==='delayed')latched=new Promise(r=>{release=r});
  await page.addInitScript(()=>{
    const created=window.__stage5CreatedImages=[];
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
    if(N.slotFor(seg)?.themes[0]!==theme)throw Error('missing exact Stage5 admission');
    const s=A.createRun({segment:seg,spellOnly:true,entranceAll:true,difficulty:'hell',compact:true,seed:5815,distort:false});
    s.player.x=90;s.bombs=0;s.player.invulnerableUntil=100000;
    window.__stage5BrowserFixture=s;
    N.preload(5,'05');
    for(let i=0;i<640;i++){
      A.step(s,{});
      if(i%5===0)await new Promise(requestAnimationFrame);
      if(N.inspect(s)?.phase==='telegraph'||s.stage==='card'&&s.n>0)break;
    }
    return {phase:N.inspect(s)?.phase??null,seg:s.seg,n:s.n,stage:s.stage,segTick:s.segTick};
  },{seg,mode,theme});
  run.started=started;run.observed=observed;report();
  assert(observed>0,prefix+': no actual HTMLImage asset request');
  assert.equal(started.seg,seg);
  const ready=()=>page.waitForFunction(file=>window.__stage5CreatedImages.some(im=>im.src.includes(file)&&HapilPhase2Source.ready(im)),file,{timeout:10000});
  if(mode!=='ready'){
    assert.equal(started.phase,null);assert(started.n>0&&started.stage==='card');
    if(release){const arrival=page.waitForResponse(r=>r.url().includes(file)&&r.ok(),{timeout:8000});release();await arrival;await ready();}
    const late=await page.evaluate(async()=>{
      const A=window.HapilArcade,N=window.HapilPhase2Native,s=window.__stage5BrowserFixture;
      let inserted=false;for(let i=0;i<120;i++){A.step(s,{});inserted||=!!N.inspect(s)?.phase;if(i%5===0)await new Promise(requestAnimationFrame);}
      return {inserted,segTick:s.segTick,n:s.n};
    });
    run.late=late;run.actuallyDecoded=mode==='delayed';report();
    assert(!late.inserted&&late.segTick>100,prefix+': missing/late source must never pause or insert over original volley');
    notes.push({seg,mode,started,late,actuallyDecoded:mode==='delayed'});
  }else{
    await ready();assert.equal(started.phase,'telegraph');assert.equal(started.n,0);
    const measured=await page.evaluate(({seg})=>{
      const A=window.HapilArcade,N=window.HapilPhase2Native,s=window.__stage5BrowserFixture;
      function until(name){for(let i=0;i<120&&N.inspect(s)?.phase!==name;i++)A.step(s,{});if(N.inspect(s)?.phase!==name)throw Error('phase '+name);}
      function probe(){
        const width=720,height=1280,S=window.HapilPhase2Source,Ink=window.HapilInk;
        function draw(raw){
          const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);
          if(raw)Ink.raw(1);
          try{if(!N.paint(ctx,s))throw Error('no native canvas effect');}
          finally{if(raw)Ink.raw(-1);}
          return ctx.getImageData(0,0,width,height).data;
        }
        // The first raster is release behavior; raw is an isolated diagnostic only.
        const final=draw(false),raw=draw(true),rec=S.createRecorder();N.paint(rec,s);
        const stamps=rec.draws.map(({sx,sy,sw,sh,opacity,bb})=>({sx,sy,sw,sh,opacity,bb}));
        let hits=0,min=255,rawMin=255,holes=0,rawHoles=0,blank=0,rawBlank=0,point,blankPoint;
        const weakest={final:null,raw:null},low=[],saved=[s.player.x,s.player.y];
        let minHitX=Infinity,maxHitX=-Infinity;
        for(let y=40;y<626;y+=2)for(let x=8;x<352;x+=2){
          const px=x*2+1,py=y*2+1,at=(py*width+px)*4+3,a=final[at],r=raw[at];
          s.player.x=x+.75;s.player.y=y+.75;
          if(!a){blank++;if(x>66&&x<298&&y>95&&y<546&&!blankPoint)blankPoint=[x+.75,y+.75];}
          if(!r)rawBlank++;
          if(N.hit(s)){
            hits++;point=[s.player.x,s.player.y];minHitX=Math.min(minHitX,point[0]);maxHitX=Math.max(maxHitX,point[0]);if(!a)holes++;if(!r)rawHoles++;
            const detail=()=>({logical:point,pixel:[px,py],final:a,raw:r,
              predicted:Math.round(Math.max(0,...rec.draws.map(stamp=>S.sample(stamp,...point))))});
            if(a<min||!weakest.final){min=a;weakest.final=detail();}
            if(r<rawMin||!weakest.raw){rawMin=r;weakest.raw=detail();}
            if(a<98&&low.length<12)low.push(detail());
          }
        }
        let moundGap=null;
        if(seg===56&&rec.draws.length===1){
          const q=rec.draws[0],k=q.k,det=k[0]*k[3]-k[1]*k[2];
          let samples=0,gapHits=0,maxAlpha=0;
          for(let v=1;v<q.sh;v+=3)for(let u=80;u<=108;u+=3){
            const x=q.e+(k[3]*(u+.5)-k[2]*(v+.5))/det;
            const y=q.f+(-k[1]*(u+.5)+k[0]*(v+.5))/det;
            if(x<8||x>=352||y<40||y>=626)continue;
            s.player.x=x;s.player.y=y;samples++;if(N.hit(s))gapHits++;
            // The stationary decorative dirt strip (source y119–131) is visible but non-contact.
            if(v<116||v>134)maxAlpha=Math.max(maxAlpha,final[(Math.floor(y*2)*width+Math.floor(x*2))*4+3]);
          }
          moundGap={samples,gapHits,maxAlpha};
        }
        [s.player.x,s.player.y]=saved;
        const view=N.inspect(s);
        return{tick:s.tick,phase:view?.phase,local:view?.local,hits,min,rawMin,holes,rawHoles,blank,rawBlank,point,blankPoint,
          weakest,low,stamps,moundGap,hitX:hits?[minHitX,maxHitX]:null,frame:stamps.length===1?stamps[0].sx/stamps[0].sw+6*(stamps[0].sy/stamps[0].sh):null,recorderComplete:rec.complete};
      }
      for(let i=0;i<20;i++)A.step(s,{});
      const early=probe();until('active');
      const opening=probe();for(let i=0;i<7;i++)A.step(s,{});
      const active=probe();
      const savedTick=s.tick;s.tick++;const next=probe();s.tick=savedTick;
      if(!next.point)return {early,opening,active,next,closing:null,gap:null,decay:null,hurt:null,damage:null,preview:null};
      [s.player.x,s.player.y]=next.point;
      const hp=s.player.hp,hits=s.hits,stock=s.bombs,used=s.bombsUsed,autos=s.autoBombs;
      s.player.invulnerableUntil=0;A.step(s,{});const hurt=hp-s.player.hp;
      const damage={stock,hits:s.hits-hits,uses:s.bombsUsed-used,auto:s.autoBombs-autos};
      const img=document.createElement('canvas');img.width=A.WIDTH;img.height=A.HEIGHT;N.paint(img.getContext('2d'),s);
      const preview=img.toDataURL('image/png');
      s.player.invulnerableUntil=100000;
      while(N.inspect(s)?.phase==='active'&&N.inspect(s).local<10)A.step(s,{});
      const gap=seg===58?probe():null;
      while(N.inspect(s)?.phase==='active'&&N.inspect(s).local<14)A.step(s,{});
      const closing=probe();until('decay');const decay=probe();
      return {early,opening,active,next,closing,gap,decay,hurt,damage,preview};
    },{seg});
    const {preview,...rest}=measured;
    run.measured=rest;report();
    if(preview)fs.writeFileSync(path.join(out,'stage5-'+seg+'-native-active.png'),Buffer.from(preview.split(',')[1],'base64'));
    const summary=(probe)=>({seg,mode,tick:probe.tick,local:probe.local,hits:probe.hits,finalMin:probe.min,rawMin:probe.rawMin,
      blank:probe.blank,rawBlank:probe.rawBlank,holes:probe.holes,rawHoles:probe.rawHoles,weakest:probe.weakest,firstLow:probe.low[0]??null,stamps:probe.stamps,moundGap:probe.moundGap,frame:probe.frame,hitX:probe.hitX});
    const checkpoints=[[0,measured.opening],[7,measured.active],[8,measured.next],[14,measured.closing]];
    for(const [local,p] of checkpoints)if(p)console.log('STAGE5_SOURCE_DIAGNOSTIC '+JSON.stringify(summary(p)));
    if(measured.gap)console.log('STAGE5_SOURCE_GAP '+JSON.stringify(summary(measured.gap)));
    assert.equal(measured.early.hits,0,prefix+': early imagery must not harm');
    for(const [local,p] of checkpoints){
      assert.equal(p?.phase,'active',prefix+': actual active phase at '+local);
      assert.equal(p.local,local,prefix+': exact active frame');
      assert(p.hits>10,prefix+': active probe must see >10 visible contact samples; actual '+p.hits);
      assert(p.min>=98,prefix+': active final-filter alpha must be ≥98 at all contact samples: '+JSON.stringify(p.weakest.final));
      assert(p.blank>15000,prefix+': large transparent area must remain; actual '+p.blank);
      assert.equal(p.holes,0,prefix+': no contact in a transparent rendered pixel');
      if(seg===56){
        assert(p.moundGap?.samples>500,prefix+': directly sample the authored safe gap between both mounds');
        assert.equal(p.moundGap.gapHits,0,prefix+': the space between both mounds never hits');
        assert.equal(p.moundGap.maxAlpha,0,prefix+': the space between both mounds stays visually clear');
      }
    }
    if(seg===58){
      assert.equal(measured.gap?.local,10,prefix+': inspect exact gap tick');
      assert.equal(measured.gap.frame,15,prefix+': expected artwork cell in the pause');
      assert.equal(measured.gap.hits,0,prefix+': no lingering cut in the gap');
      assert(measured.active.hitX[1]<measured.opening.hitX[0]&&measured.opening.hitX[1]<measured.closing.hitX[0],prefix+': only the authored middle, left, right ranges hit at their respective beats');
    }
    assert(measured.next.point,prefix+': actual next tick must expose a native life-loss sample');
    assert.equal(measured.decay?.hits,0,prefix+': decay must not harm');
    assert.equal(measured.hurt,1,prefix+': exactly one ordinary native life lost');
    assert.deepEqual(measured.damage,{stock:0,hits:1,uses:0,auto:0},prefix+': no auto-bomb or stock shielding');
    notes.push({seg,mode,started,measured:rest});
  }
  assert.deepEqual(failures,[],prefix+': browser page errors');
  }finally{if(release)release();await page.close();}
 }
 return {scope:'seeded exact engine/native Canvas and HTMLImage in Chromium compact DPR2, not ordinary play or a real phone',cases:notes};
};
