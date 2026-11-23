'use strict';
// Real Chromium regression: desktop keyboard, mobile simultaneous touches,
// hero selection, pre-main-boss cut-ins, persistent pause settings, actual
// media lifecycle and viewport screenshots.
// Run: npm install && npx playwright install chromium && npm run test:ui
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/arcade-ui');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.css':'text/css'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));}catch(e){res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});fs.createReadStream(file).pipe(res);
  });
});
const reports=[];
async function state(page){return page.evaluate(()=>HapilArcadeApp.getState());}
async function musicTrace(page){
  const trace=await page.evaluate(()=>{const o=window.__mediaObserver;return {players:o.elements.size,plays:o.plays,maxPlaying:o.maxPlaying,overlaps:o.overlaps};});
  assert.equal(trace.players,1,'all BGM transitions reuse one physical HTMLAudioElement');
  assert(trace.plays>0,'real HTMLMediaElement.play calls were observed');assert.equal(trace.maxPlaying,1,'at least one real playback began and simultaneous playback never exceeds one');assert.deepEqual(trace.overlaps,[]);
  return trace;
}
async function musicStopped(page,label){
  assert.equal(await page.evaluate(()=>Array.from(window.__mediaObserver.elements).filter(a=>!a.paused).length),0,label);
}
async function inViewport(page,selector,label,min=44){
  const box=await page.locator(selector).boundingBox(),view=page.viewportSize();
  assert(await page.locator(selector).isVisible(),label+' is visible');
  assert(box&&box.width>=min&&box.height>=min,label+' has a usable target');
  assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=view.width+1&&box.y+box.height<=view.height+1,label+' is inside the viewport: '+JSON.stringify(box));
}
async function activate(page,selector,mobile){await page.locator(selector)[mobile?'tap':'click']();}
async function confirmHero(page,id,mobile){
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  await activate(page,'#hero-select-'+id,mobile);
  assert.equal(await page.locator('#hero-select-'+id).getAttribute('aria-pressed'),'true');
  await activate(page,'#hero-select-confirm',mobile);
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='playing');
  assert.equal((await state(page)).hero,id);
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.hero),id);
  assert.equal(await page.locator('#arcade-hero-select').isVisible(),false);
}
async function heroSelection(page,name,mobile){
  await activate(page,'#arcade-start',mobile);
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state),null,'hero selection has not created a run');
  assert.equal(await page.locator('#hero-select-memory').getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>{const p=document.getElementById('hero-select-portrait');return p.complete&&p.naturalWidth>0;});
  for(const id of ['memory','seoha','seoha-b','confirm','cancel'])await inViewport(page,'#hero-select-'+id,name+' hero '+id);
  for(const id of ['portrait','name','title','description','abilities'])await inViewport(page,'#hero-select-'+id,name+' hero '+id,1);
  assert.equal(await page.locator('#hero-select-portrait').evaluate(el=>getComputedStyle(el).objectFit),'contain','portrait preserves the complete face');
  await page.waitForTimeout(750);
  assert.equal((await state(page)).mode,'hero','reveal animation never starts the game automatically');
  await page.screenshot({path:path.join(out,name+'-hero-memory.png'),fullPage:true});
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#hero-select-seoha').getAttribute('aria-pressed'),'true','keyboard selects the original Seoha A');
  assert.equal(await page.locator('#hero-select-name').innerText(),await page.evaluate(()=>HapilArcadeHeroes.get('seoha').name));
  await page.waitForFunction(()=>{const p=document.getElementById('hero-select-portrait');return p.src.endsWith('/seoha-portrait.webp')&&p.complete&&p.naturalWidth>0;});
  await page.waitForTimeout(750);await page.screenshot({path:path.join(out,name+'-hero-seoha-a.png'),fullPage:true});
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#hero-select-seoha-b').getAttribute('aria-pressed'),'true','keyboard advances to the new Seoha B');
  assert.equal(await page.locator('#hero-select-name').innerText(),await page.evaluate(()=>HapilArcadeHeroes.get('seoha-b').name));
  await page.waitForFunction(()=>{const p=document.getElementById('hero-select-portrait');return p.src.includes('seoha-portrait-v2.webp')&&p.complete&&p.naturalWidth>0;});
  assert.equal(await page.locator('#hero-select-abilities li').count(),3);
  assert((await page.locator('#hero-select-description').innerText()).trim().length>0);
  await page.waitForTimeout(750);
  for(const id of ['memory','seoha','seoha-b','confirm','cancel'])await inViewport(page,'#hero-select-'+id,name+' Seoha '+id);
  for(const id of ['portrait','name','title','description','abilities'])await inViewport(page,'#hero-select-'+id,name+' Seoha '+id,1);
  await page.screenshot({path:path.join(out,name+'-hero-seoha-b.png'),fullPage:true});
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#hero-select-memory').getAttribute('aria-pressed'),'true','right wraps across all three heroes');
  await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#hero-select-seoha-b').getAttribute('aria-pressed'),'true','left cycles in reverse');
  if(mobile)await activate(page,'#hero-select-cancel',true);else await page.keyboard.press('Escape');
  assert.equal((await state(page)).mode,'title');
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state),null,'cancel does not start or save a run');
  await activate(page,'#arcade-start',mobile);
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  assert.equal(await page.locator('#hero-select-memory').getAttribute('aria-pressed'),'true','unconfirmed choice is not persisted');
  if(mobile)await confirmHero(page,'seoha-b',true);
  else{
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='playing');
    assert.equal((await state(page)).hero,'seoha-b');
    assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.hero),'seoha-b');
    assert.equal(await page.locator('#arcade-hero-select').isVisible(),false);
  }
}
async function setup(browser,viewport,mobile,name){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],badRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badRequests.push(r.status()+' '+r.url());});
  await page.addInitScript(name=>{
    window.__audioContexts=[];
    const Native=window.AudioContext||window.webkitAudioContext;
    if(Native)window.AudioContext=new Proxy(Native,{construct(target,args){const c=new target(...args);window.__audioContexts.push(c);return c;}});
    const observer=window.__mediaObserver={elements:new Set(),plays:0,maxPlaying:0,overlaps:[]};
    function sample(phase){const active=Array.from(observer.elements).filter(a=>!a.paused);observer.maxPlaying=Math.max(observer.maxPlaying,active.length);if(active.length>1&&observer.overlaps.length<20)observer.overlaps.push({phase,sources:active.map(a=>a.currentSrc||a.src)});}
    const NativeAudio=window.Audio;
    window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);observer.elements.add(a);return a;}});
    const nativePlay=HTMLMediaElement.prototype.play,nativePause=HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play=function(...args){
      observer.elements.add(this);observer.plays++;sample('before-play');const result=nativePlay.apply(this,args);sample('after-play');
      if(result&&result.then)result.then(()=>sample('resolved-play'),()=>sample('rejected-play'));
      return result;
    };
    HTMLMediaElement.prototype.pause=function(...args){const result=nativePause.apply(this,args);sample('after-pause');return result;};
    if(name==='desktop'){
      // Unlock prerequisites for the later stage-20 (index 19) persistence fixture. Its
      // actual clear must still be produced by the engine and app handlers.
      if(!localStorage.getItem('hapil-arcade-save-v43'))localStorage.setItem('hapil-arcade-save-v43',JSON.stringify({version:44,cleared:Array.from({length:19},(_,i)=>i),stars:{},best:{},difficulty:'normal'}));
      localStorage.setItem('hapil-arcade-main-boss-seen-v2','{"19":true}');
    }
  },name);
  await page.goto('http://127.0.0.1:'+server.address().port+'/arcade.html?eyes=0',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
  await page.evaluate(()=>{
    // Observe the actual player sprite canvas draw, not a calculated opacity
    // debug value. Install after Ink has wrapped drawImage: its inner call uses
    // a washed canvas, while this outer call still receives the source image.
    // Every call is forwarded unchanged through the production Ink renderer.
    window.__heroSpriteDraws={};
    const drawImage=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      const source=args[0]&&(args[0].currentSrc||args[0].src)||'';
      const hero=/\/media\/gunner\.webp(?:\?|$)/.test(source)?'memory':/\/media\/arcade-v43-heroes\/seoha-player-v2\.webp(?:\?|$)/.test(source)?'seoha-b':/\/media\/arcade-v43-heroes\/seoha-player\.webp(?:\?|$)/.test(source)?'seoha':null;
      if(hero&&this.canvas.id==='arcade-canvas')window.__heroSpriteDraws[hero]={alpha:this.globalAlpha,source,time:performance.now()};
      return drawImage.apply(this,args);
    };
  });
  await page.locator('#arcade-rules-title').click();assert.equal((await state(page)).mode,'rules');
  await page.locator('#arcade-rules-back').click();assert.equal((await state(page)).mode,'title');
  try{await heroSelection(page,name,mobile);}catch(e){await page.screenshot({path:path.join(out,name+'-hero-failure.png'),fullPage:true});await context.close();throw e;}
  return {context,page,errors,badRequests};
}
async function stationary(page){
  // A deterministic empty segment isolates input from bullet RNG and auto-defense.
  await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;s.stage='break';s.stageTick=-1e7;s.player.x=80;s.player.y=480;s.player.invulnerableUntil=s.tick+1e7;s.n=0;s.lasers.length=s.figures.length=s.mobs.length=0;if(s.risers)s.risers.length=0;s.bombs=3;});
}
async function combatClock(page){
  return page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,stageTick:s.stageTick,segTick:s.segTick,hp:s.player.hp,bombs:s.bombs,x:s.player.x,y:s.player.y,actor:s.boss.actor,present:s.boss.present,n:s.n,sn:s.sn,lasers:s.lasers.length,figures:s.figures.length,risers:(s.risers||[]).length,floor:s.floor.t};});
}
async function nearbyBulletOpacity(page,name){
  const results=[];
  for(const hero of ['memory','seoha','seoha-b']){
    // Use the real selection flow for every identity so each gameplay image is
    // loaded through its production path instead of an injected image cache.
    await page.evaluate(()=>HapilArcadeApp.pause());await page.locator('#arcade-quit').click();await page.locator('#arcade-start').click();await confirmHero(page,hero,false);
    await stationary(page);
    const farAt=await page.evaluate(hero=>{const s=HapilArcadeApp.debugState().state;s.hero=hero;s.player.x=180;s.player.y=450;s.player.invulnerableUntil=0;s.n=0;return performance.now();},hero);
    await page.waitForFunction(({hero,at})=>window.__heroSpriteDraws[hero]&&window.__heroSpriteDraws[hero].time>at,{hero,at:farAt});
    const far=await page.evaluate(hero=>window.__heroSpriteDraws[hero],hero);
    assert(far.alpha>.85,name+' '+hero+' unobstructed sprite remains opaque');
    if(hero==='seoha')assert.match(far.source,/seoha-player\.webp/,'the original A gameplay art remains in use');
    if(hero==='seoha-b')assert.match(far.source,/seoha-player-v2\.webp/,'the new B gameplay art is actually drawn');
    await page.screenshot({path:path.join(out,name+'-'+hero+'-far.png'),fullPage:true});
    const nearAt=await page.evaluate(()=>{const a=HapilArcade,s=HapilArcadeApp.debugState().state;s.n=1;s.bx[0]=s.player.x+20;s.by[0]=s.player.y;s.ba[0]=0;s.bs[0]=0;s.bturn[0]=0;s.bacc[0]=0;s.bmin[0]=0;s.bmax[0]=1000;s.bsize[0]=1;s.bcolor[0]=0;s.bage[0]=a.BLOOM_TICKS+30;s.blife[0]=60000;s.bmode[0]=0;s.bbreakable[0]=0;s.bgrace[0]=0;return performance.now();});
    await page.waitForFunction(({hero,at,alpha})=>window.__heroSpriteDraws[hero]&&window.__heroSpriteDraws[hero].time>at&&window.__heroSpriteDraws[hero].alpha<alpha*.45,{hero,at:nearAt,alpha:far.alpha});
    const near=await page.evaluate(hero=>window.__heroSpriteDraws[hero],hero);
    assert(near.alpha<far.alpha*.8,name+' '+hero+' nearby enemy bullet fades the actual sprite: '+JSON.stringify({far,near}));
    assert(near.alpha>.1,name+' '+hero+' remains visible');
    await page.screenshot({path:path.join(out,name+'-'+hero+'-near.png'),fullPage:true});
    const restoredAt=await page.evaluate(()=>{HapilArcadeApp.debugState().state.n=0;return performance.now();});
    await page.waitForFunction(({hero,at,alpha})=>window.__heroSpriteDraws[hero]&&window.__heroSpriteDraws[hero].time>at&&Math.abs(window.__heroSpriteDraws[hero].alpha-alpha)<.01,{hero,at:restoredAt,alpha:far.alpha});
    results.push({hero,far:far.alpha,near:near.alpha});
  }
  await stationary(page);return results;
}
async function storyAndRules(page,name){
  // Warm the authored full portrait before timing the short entrance animation.
  await page.evaluate(()=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>reject(new Error('Violet cut-in portrait failed to load'));im.src='media/combat/boss01-purple-sword-spider-angel-cutin.webp';}));
  const fixture=await page.evaluate(()=>{
    const a=HapilArcade,s=HapilArcadeApp.debugState().state;
    const main=a.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid),mid=a.SEGMENTS.find(g=>g.stage===1&&g.kind==='card'&&g.mid);
    // This is the real pre-enter state: the previous midboss still owns boss
    // metadata, while the next segment identifies the not-yet-spawned main boss.
    s.entranceAll=false; // 11-17: 앱 기본은 판 위 입장 연출. 예전 컷신 화면(기억 다시 보기 경로)은 이 옵션이 꺼진 실행에서 그대로 검사한다.
    s.stageIndex=1;s.seg=main;s.stage='intro';s.stageTick=0;s.segTick=0;
    s.boss.actor=mid.actor;s.boss.name=a.ACTORS[mid.actor].name;s.boss.mid=true;s.boss.present=false;s.boss.leaving=true;
    s.n=1;s.bx[0]=s.player.x;s.by[0]=s.player.y;s.bsize[0]=1;s.bcolor[0]=0;s.bs[0]=s.ba[0]=s.bacc[0]=s.bturn[0]=0;s.bage[0]=100;s.blife[0]=1000;s.bmode[0]=0;
    s.lasers.length=s.figures.length=s.mobs.length=0;if(s.risers)s.risers.length=0;
    s.player.invulnerableUntil=0;document.getElementById('story-auto').checked=false;
    return {tick:s.tick,main,midActor:mid.actor};
  });
  // No showStory debug call: the application must intercept before Arcade.step.
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='story');
  const cutin=await state(page);
  assert.equal(cutin.story.phase,'impact');assert.equal(cutin.story.actor,'violet');assert.equal(cutin.seg,fixture.main);
  const before=await combatClock(page);
  assert.equal(before.tick,fixture.tick,'cut-in opens before the first main-boss engine tick');
  assert.equal(before.stageTick,0);assert.equal(before.actor,fixture.midActor);assert.equal(before.present,false,'main boss has not arrived');
  assert.equal(before.n,0,'existing live bullets disappear when the cut-in starts');assert.equal(before.sn,0,'old player shots disappear too');
  assert.equal(await page.locator('#arcade-story').getAttribute('data-actor'),'violet');
  assert.equal(await page.locator('#story-boss-name').innerText(),await page.evaluate(()=>HapilArcade.ACTORS.violet.name));
  assert.equal(await page.locator('#story-portrait').getAttribute('aria-label'),await page.evaluate(()=>HapilArcade.ACTORS.violet.name));
  assert.match(await page.locator('#story-portrait').evaluate(el=>getComputedStyle(el).backgroundImage),/boss01-purple-sword-spider-angel-cutin\.webp/);
  assert.equal(await page.locator('#story-text').isVisible(),false,'canonical excerpt waits until after the impact');
  await inViewport(page,'#story-skip',name+' impact skip');
  await page.waitForTimeout(600);assert.deepEqual(await combatClock(page),before,'impact freezes combat');
  await page.screenshot({path:path.join(out,name+'-story-impact.png'),fullPage:true});
  await page.keyboard.press('Escape');assert.equal((await state(page)).mode,'paused');
  const paused=await page.evaluate(async()=>{
    const el=document.getElementById('arcade-story'),playState=getComputedStyle(document.querySelector('.story-cutin-slash')).animationPlayState;
    const animations=el.getAnimations({subtree:true});await Promise.all(animations.map(a=>a.ready));
    return {story:HapilArcadeApp.getState().story,hidden:el.hidden,inert:el.inert,playState,animations:animations.map(a=>({name:a.animationName,time:a.currentTime}))};
  });
  assert.equal(paused.story.phase,'impact');assert.equal(paused.hidden,false,'pause keeps the cut-in mounted');assert.equal(paused.inert,true);assert.equal(paused.playState,'paused');
  await page.waitForTimeout(200);
  assert.deepEqual((await state(page)).story,paused.story,'pause freezes phase time');
  assert.deepEqual(await combatClock(page),before,'pause freezes all combat clocks');
  assert.deepEqual(await page.locator('#arcade-story').evaluate(el=>el.getAnimations({subtree:true}).map(a=>({name:a.animationName,time:a.currentTime}))),paused.animations,'pause freezes CSS animation time');
  await page.locator('#arcade-rules-pause').click();assert(await page.locator('#arcade-rules').isVisible(),'rules open from pause');
  await page.locator('#arcade-rules-back').click();assert.equal((await state(page)).mode,'paused');
  await page.locator('#arcade-resume').click();assert.equal((await state(page)).mode,'story');
  assert.equal((await state(page)).story.phase,'impact','resume continues the same impact');
  // Advancing the entrance by keyboard opens memory, not the fight. The skip
  // button keeps its separate immediate-start behavior.
  await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('z');
  await page.waitForFunction(()=>HapilArcadeApp.getState().story&&HapilArcadeApp.getState().story.phase==='memory');
  assert.equal(await page.locator('#story-text').innerText(),await page.evaluate(()=>HapilArcadeStory.getStage(1).lines[0].text));
  assert(await page.locator('#story-text').isVisible(),'canonical excerpt is readable after impact');
  for(const id of ['story-next','story-skip'])await inViewport(page,'#'+id,name+' memory '+id);
  await page.waitForTimeout(180);assert.deepEqual(await combatClock(page),before,'memory also freezes combat');
  await page.screenshot({path:path.join(out,name+'-story-memory.png'),fullPage:true});
  await page.locator('#story-skip').click();assert.equal((await state(page)).mode,'playing');
  await page.waitForFunction(()=>{const s=HapilArcadeApp.debugState().state;return s.boss.actor==='violet'&&s.boss.present&&!s.boss.mid;});
  assert.equal((await state(page)).mode,'playing','main boss enters after the cut-in without replay');
  const arrival=await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,entry:s.bossEntrance,bombs:s.bombs,bombsUsed:s.bombsUsed,hits:s.hits,hp:s.player.hp};});
  assert.equal(arrival.entry.readyTick-arrival.entry.enteredTick,120,'the full two-second lock begins at actual enter');
  assert(arrival.tick<arrival.entry.readyTick,'the browser observes the arrival grace');
  await page.keyboard.press('x');await page.waitForTimeout(250);
  const locked=await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,stage:s.stage,n:s.n,sn:s.sn,bombs:s.bombs,bombsUsed:s.bombsUsed,hits:s.hits,hp:s.player.hp};});
  assert(locked.tick<arrival.entry.readyTick);assert.equal(locked.stage,'intro');assert.equal(locked.n,0);assert.equal(locked.sn,0);
  for(const key of ['bombs','bombsUsed','hits','hp'])assert.equal(locked[key],arrival[key],'arrival lock preserves '+key);
  await page.waitForFunction(()=>{const s=HapilArcadeApp.debugState().state;return s.bossEntrance&&s.bossEntrance.releasedTick!==null;});
  const released=await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {entry:s.bossEntrance,bombs:s.bombs,bombsUsed:s.bombsUsed};});
  assert.equal(released.entry.releasedTick,released.entry.readyTick);assert.equal(released.bombs,arrival.bombs);assert.equal(released.bombsUsed,arrival.bombsUsed,'blocked X is not delayed until combat');
  await stationary(page);
}
async function playerShotPalette(page){
  // Read the actual drawing output with the current app setting, including the animated shard atlas.
  await page.waitForFunction(()=>HapilHeroFx.debug().ready.includes('shard'));
  return page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=100;
    const g=canvas.getContext('2d',{willReadFrequently:true});
    const output={};
    for(const [key,hero,kind,homing] of [['memory','memory',0,0],['shard','memory',0,1],['trainee','seoha',0,0],['awakened','seoha-b',2,0]]){
      g.clearRect(0,0,100,100);
      HapilHeroFx.shots(g,{hero,power:5,sn:1,sx:[50],sy:[50],svx:[0],sspd:[15],skind:[kind],shoming:[homing]},.1);
      const p=g.getImageData(0,0,100,100).data;
      let painted=0,red=0;
      for(let i=0;i<p.length;i+=4){
        if(p[i+3]<30)continue;
        painted++;
        if(p[i]>p[i+1]+30&&p[i]>p[i+2]+30)red++;
      }
      output[key]={painted,red};
    }
    return output;
  });
}
async function pauseSettings(page,name,mobile){
  await page.locator('#arcade-pause-button').click();
  assert.equal((await state(page)).mode,'paused');
  const tick=await page.evaluate(()=>HapilArcadeApp.debugState().state.tick);
  for(const [id,steps] of [['setting-musicVolume',7],['setting-sfxVolume',13]]){
    const slider=page.locator('#'+id);await slider.press('Home');
    for(let i=0;i<steps;i++)await slider.press('ArrowRight');
  }
  await page.locator('#setting-screenShake').uncheck();
  const inkRed=page.locator('#setting-inkRedShots');
  assert.equal(await inkRed.isChecked(),true,'new players start with vermilion attacks');
  const vermilion=await playerShotPalette(page);
  await inkRed.uncheck();
  const plain=await playerShotPalette(page);
  for(const key of Object.keys(vermilion)){
    assert(plain[key].painted>10&&vermilion[key].painted>10,key+' draws actual pixels');
    assert(vermilion[key].red>plain[key].red+8,key+' loses its vermilion tint when disabled');
  }
  await inkRed.check();
  assert.deepEqual(await playerShotPalette(page),vermilion,'switching back on restores the default palette');
  if(!mobile)await inkRed.uncheck(); // Exercise both saved choices across reloads.
  await page.locator('#setting-lowQuality').check();
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.tick),tick,'settings must not advance combat');
  assert.equal((await state(page)).settings.musicVolume,.35);
  assert.equal((await state(page)).settings.sfxVolume,.65);
  await page.screenshot({path:path.join(out,name+'-pause.png'),fullPage:true});
  // Zero volume must stop the element, not leave an inaudible player running.
  await page.locator('#setting-musicVolume').press('Home');await page.locator('#arcade-resume').click();
  await page.waitForTimeout(150);await musicStopped(page,'zero BGM volume leaves no playing media');
  await page.locator('#arcade-pause-button').click();
  for(let i=0;i<7;i++)await page.locator('#setting-musicVolume').press('ArrowRight');
  // Turning off BGM must pause every HTML audio player even if play() was pending.
  await page.locator('#setting-music').uncheck();
  await page.locator('#arcade-resume').click();
  await page.waitForTimeout(250);
  assert(await page.evaluate(()=>Object.values(HapilMusic._players()).every(p=>p.a.paused)),'disabled BGM stays paused');
  await musicStopped(page,'disabled BGM leaves no stale playing media');
  await page.locator('#arcade-pause-button').click();
  await page.locator('#setting-music').check();
  await page.locator('#arcade-resume').click();
  await page.waitForFunction(()=>Object.values(HapilMusic._players()).some(p=>!p.a.paused));
  await page.locator('#arcade-pause-button').click();
  await page.waitForTimeout(100);
  assert(await page.evaluate(()=>Object.values(HapilMusic._players()).every(p=>p.a.paused)),'pause stops BGM');
  await musicStopped(page,'pause stops every observed media element');
  const observedMusic=await musicTrace(page);
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
  const saved=(await state(page)).settings;
  assert.equal(saved.musicVolume,.35);assert.equal(saved.sfxVolume,.65);assert.equal(saved.screenShake,false);assert.equal(saved.lowQuality,true);assert.equal(saved.inkRedShots,mobile);
  const restored=await playerShotPalette(page);
  for(const key of Object.keys(restored))assert.equal(restored[key].red>plain[key].red+8,mobile,key+' uses the saved palette after reload');
  await page.locator('#arcade-start').click();
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  assert.equal(await page.locator('#hero-select-seoha-b').getAttribute('aria-pressed'),'true','confirmed B hero survives reload');
  assert.equal(await page.locator('#arcade-hero-select').getAttribute('data-lite'),'true');
  assert.equal(await page.locator('#arcade-hero-select .hs-art').evaluate(el=>getComputedStyle(el).animationName),'none','low-quality selection disables reveal motion');
  await confirmHero(page,'seoha-b',mobile);
  return observedMusic;
}
async function musicTransitions(page){
  // Exercise pending native play promises with immediate track changes. Normal
  // app frames and the real UI transitions below continue using this same element.
  const samples=await page.evaluate(()=>{
    const m=HapilMusic,base={stageIndex:19,boss:{present:true}},out=[];
    function capture(label,expected,stopped){const p=m._players().main,track=m._tracks()[expected];out.push({label,expected,current:m.stats().current,source:p.a.src,wanted:new URL('media/bgm/'+track.file,location.href).href,playing:Array.from(window.__mediaObserver.elements).filter(a=>!a.paused).length,stopped:!!stopped});}
    for(let i=0;i<6;i++)for(const [mode,stage,key] of [['playing','wave','field'],['playing','intro','boss2'],['playing','bossClear','boss2'],['paused','bossClear','boss2'],['title','wave','title']]){m.update(mode,{...base,stage},true);capture(i+':'+mode+':'+stage,key,mode==='paused');}
    m.setVolume(0);m.update('playing',{...base,stage:'wave'},true);capture('volume-zero','field',true);
    m.setVolume(1);m.update('playing',{...base,stage:'intro'},false);capture('disabled','boss2',true);
    m.update('playing',{...base,stage:'wave'},true);window.dispatchEvent(new Event('pagehide'));m.update('playing',{...base,stage:'wave'},true);capture('pagehide','field',true);
    window.dispatchEvent(new Event('pageshow'));m.update('playing',HapilArcadeApp.debugState().state,true);
    return out;
  });
  for(const s of samples){assert.equal(s.current,s.expected,s.label+' track');assert.equal(s.source,s.wanted,s.label+' source');assert(s.playing<=1,s.label+' has at most one playing element');if(s.stopped)assert.equal(s.playing,0,s.label+' stops playback');}
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state(page)).mode,'paused');await musicStopped(page,'blur pauses BGM');
  await page.locator('#arcade-resume').click();await page.locator('#arcade-pause-button').click();await page.locator('#arcade-quit').click();
  assert.equal((await state(page)).mode,'title');assert.equal(await page.evaluate(()=>HapilMusic.stats().current),'title');
  await page.locator('#arcade-start').click();await confirmHero(page,'seoha-b',false);
  assert.equal(await page.evaluate(()=>HapilMusic.stats().current),'field');
  await page.evaluate(()=>HapilArcadeApp.debugState().lose());
  // Defeat starts the authored closing animation; finish() reveals the result
  // asynchronously afterward. Wait for that real UI transition before retrying.
  await page.waitForFunction(()=>{const s=HapilArcadeApp.getState();return s.mode==='result'&&s.stage==='lost';});
  assert.equal(await page.locator('#result-title').innerText(),'GAME OVER');assert.equal(await page.evaluate(()=>HapilMusic.stats().current),'title');
  await page.locator('#arcade-retry').click();await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='playing');
  assert.equal(await page.evaluate(()=>HapilMusic.stats().current),'field');await stationary(page);
  return {rapidChanges:samples.length,signals:['pagehide','pageshow','blur'],ui:['quit','new-game','loss','retry']};
}
async function sevenSinsClear(page){
  // Keep the production app loop, dialogue handlers, attacks and clear events.
  // Only the starting encounter and boss HP are fixture controls.
  const fixture=await page.evaluate(()=>{
    const a=HapilArcade,s=HapilArcadeApp.debugState().state,first=a.SEGMENTS.findIndex(g=>g.stage===19&&g.actor==='p2_chairman'&&g.kind==='card');
    window.__sinSaveWrites=[];window.__sinLaserDraw=null;
    const save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hapil-arcade-save-v43')window.__sinSaveWrites.push(JSON.parse(v));return save.call(this,k,v);};
    // This wraps the already-installed Ink renderer, as does the hero observer.
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      const src=args[0]&&(args[0].currentSrc||args[0].src)||'';
      if(this.canvas.id==='arcade-canvas'&&src.includes('/arcade-v43-laser/')&&args.length===9&&args[2]===0)window.__sinLaserDraw={src,alpha:this.globalAlpha,time:performance.now()};
      return draw.apply(this,args);
    };
    s.stageIndex=19;s.seg=first;s.stage='intro';s.stageTick=s.segTick=0;s.boss.present=false;s.boss.leaving=false;
    s.events.push('map');s.player.x=60;s.player.y=510;s.player.invulnerableUntil=0;s.rhythm=true;
    document.getElementById('story-auto').checked=false;
    return {first,tick:s.tick,last:a.SEGMENTS.map((g,i)=>({g,i})).filter(x=>x.g.stage===19&&x.g.actor==='p2_core').at(-1).i};
  });
  async function dialogue(actor){
    await page.waitForFunction(actor=>{const s=HapilArcadeApp.getState();return s.mode==='story'&&s.story.actor===actor;},actor);
    const entry=await page.evaluate(actor=>HapilArcadeBossIntros.getBoss(actor,19),actor);
    assert.equal(entry.kind,'canon-monologue');assert.equal(entry.lines.length,2);
    assert.equal(await page.locator('#arcade-story').getAttribute('data-actor'),actor);
    assert.equal(await page.locator('#story-boss-name').innerText(),await page.evaluate(actor=>HapilArcade.ACTORS[actor].name,actor));
    assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.boss.present),false,'cut-in precedes the incoming actor');
    if((await state(page)).story.phase==='impact'){await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('z');}
    for(let i=0;i<2;i++){
      assert.equal(await page.locator('#story-speaker').innerText(),entry.lines[i].speaker);
      assert.equal(await page.locator('#story-text').innerText(),entry.lines[i].text);
      if(i===0)await page.locator('#story-next').click();
    }
    assert.equal(await page.locator('#story-caption').innerText(),'서사 정본 · 기억');
    await page.waitForTimeout(900); // Capture the completed portrait reveal, not its initial clipped frame.
    await page.screenshot({path:path.join(out,'desktop-'+actor+'-dialogue.png'),fullPage:true});
    await page.locator('#story-skip').click();
    await page.waitForFunction(actor=>{const s=HapilArcadeApp.debugState().state;return s.boss.actor===actor&&s.boss.present&&s.bossEntrance.enteredTick!==null;},actor);
    const entryClock=await page.evaluate(()=>HapilArcadeApp.debugState().state.bossEntrance);
    assert.equal(entryClock.readyTick-entryClock.enteredTick,120);
    await page.waitForFunction(actor=>{const s=HapilArcadeApp.debugState().state;return s.boss.actor===actor&&s.stage==='card';},actor);
    assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.bossEntrance.releasedTick),entryClock.readyTick);
  }
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='story');
  assert.equal((await combatClock(page)).tick,fixture.tick,'the chairman midboss is intercepted before its first engine tick');
  await dialogue('p2_chairman');
  const rhythm=await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;s.boss.hp=s.boss.maxHp=1e6;return {active:HapilArcadeBossRhythm.handles(s,HapilArcade.SEGMENTS[s.seg],HapilArcade),description:HapilArcadeBossRhythm.describe(s.boss.actor,HapilArcade)};});
  assert.equal(rhythm.active,true);assert.equal(rhythm.description.actor,'p2_chairman');assert(rhythm.description.motif.length>0);
  // Wait for the real first-pattern beam AND an actual loaded laser-sheet draw.
  // Pause on that engine frame so the exported canvas contains the live beam.
  await page.waitForFunction(()=>{
    const s=HapilArcadeApp.debugState().state,d=window.__sinLaserDraw;
    if(s.stage==='card'&&s.boss.actor==='p2_chairman'&&s.lasers.some(l=>l.age>=l.warn&&l.age<l.warn+l.active)&&d&&d.src.includes('/p2_chairman.webp')&&d.alpha>0&&performance.now()-d.time<100){HapilArcadeApp.pause();return true;}
    return false;
  });
  const laser=await page.evaluate(()=>window.__sinLaserDraw),png=await page.locator('#arcade-canvas').evaluate(el=>el.toDataURL('image/png'));
  fs.writeFileSync(path.join(out,'desktop-seven-sins-rhythm-laser.png'),Buffer.from(png.split(',')[1],'base64'));
  assert.match(laser.src,/arcade-v43-laser\/p2_chairman\.webp/);
  await page.locator('#arcade-resume').click();
  async function defeatAndPause(actor){
    await page.waitForFunction(actor=>{
      const s=HapilArcadeApp.debugState().state;
      if(s.stage==='bossClear'&&s.bossClear.actor===actor){HapilArcadeApp.pause();return true;}
      if(s.stage==='card'&&s.boss.actor===actor)s.boss.hp=0;
      return false;
    },actor);
    return page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,clear:s.bossClear,seg:s.seg,stageIndex:s.stageIndex,results:s.results.slice(),writes:window.__sinSaveWrites.slice(),n:s.n,sn:s.sn,lasers:s.lasers.length,figures:s.figures.length,score:s.score,exp:s.exp};});
  }
  const chairman=await defeatAndPause('p2_chairman');
  assert.equal(chairman.clear.readyTick-chairman.clear.startedTick,120);assert.equal(chairman.stageIndex,19);assert.equal(chairman.results.length,0);assert.equal(chairman.writes.length,0,'chairman defeat does not clear the shared stage');
  for(const k of ['n','sn','lasers','figures'])assert.equal(chairman[k],0,'clear removes '+k);
  const frozen=await combatClock(page);await page.waitForTimeout(180);assert.deepEqual(await combatClock(page),frozen,'pause freezes the clear interval');
  await page.locator('#arcade-resume').click();
  await page.waitForFunction(()=>{const a=HapilArcadeApp.getState();return a.mode==='story'&&a.story.actor==='p2_core';});
  assert.equal((await combatClock(page)).tick,chairman.clear.readyTick,'core cut-in starts exactly when the clear interval ends');
  let seen=await page.evaluate(()=>JSON.parse(localStorage.getItem('hapil-arcade-boss-seen-v4')));
  assert.equal(seen['19:p2_chairman'],true);assert.equal(seen['19:p2_core'],undefined,'one encounter does not mark its same-stage successor seen');
  await dialogue('p2_core');
  seen=await page.evaluate(()=>JSON.parse(localStorage.getItem('hapil-arcade-boss-seen-v4')));assert.equal(seen['19:p2_core'],true);
  const core=await defeatAndPause('p2_core');
  assert.equal(core.seg,fixture.last,'the actual final core card is defeated');assert.equal(core.stageIndex,19);assert.equal(core.clear.readyTick-core.clear.startedTick,120);
  assert.equal(core.results.filter(r=>r.stage===19).length,1);assert.equal(core.writes.length,1,'the completed stage is saved immediately, before its visual transition');
  assert.equal(core.writes[0].cleared.filter(x=>x===19).length,1);
  for(const k of ['n','sn','lasers','figures'])assert.equal(core[k],0,'final clear removes '+k);
  const clearClock=await combatClock(page);await page.waitForTimeout(180);assert.deepEqual(await combatClock(page),clearClock);
  await page.locator('#arcade-resume').click();
  await page.waitForFunction(()=>{const s=HapilArcadeApp.debugState().state;if(s.stageIndex===20){HapilArcadeApp.pause();return true;}return false;});
  const after=await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,stage:s.stage,results:s.results,writes:window.__sinSaveWrites,progress:HapilArcadeApp.debugState().progress};});
  assert(after.tick>=core.clear.readyTick);assert.equal(after.stage,'wave');assert.equal(after.results.filter(r=>r.stage===19).length,1);assert.equal(after.writes.length,1,'transition does not save the same clear again');
  assert.equal(after.progress.cleared.filter(x=>x===19).length,1);
  await page.locator('#arcade-resume').click();await stationary(page);
  return {actors:['p2_chairman','p2_core'],clearTicks:120,stageSaves:after.writes.length,rhythm:rhythm.description.motif,laserSource:laser.src.split('/').pop()};
}

async function seohaAwakenedAbility(browser,baseURL){
  const mode=(p,name)=>p.waitForFunction(name=>window.HapilArcadeApp?.getState().mode===name,name);
  const state=p=>p.evaluate(()=>{const d=HapilArcadeApp.debugState(),s=d.state;return {hero:s?.hero,tick:s?.tick,ability:s?.ability,stageIndex:s?.stageIndex,seg:s?.seg,difficulty:s?.difficulty,settings:d.app.settings};});
  const near=(x,y,e=.001)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
  const pause=async p=>{await p.locator('#arcade-pause-button').click();await mode(p,'paused');};
  const resume=async p=>{await p.locator('#arcade-resume').click();await mode(p,'playing');};
  const slider=p=>p.locator('#setting-abilitySeoha');
  async function select(p,id){
   await p.locator('#arcade-start').click();await mode(p,'hero');
   await p.locator('#hero-select-'+id).click();assert.equal(await p.locator('#hero-select-'+id).getAttribute('aria-pressed'),'true');await p.locator('#hero-select-confirm').click();
   if(await p.evaluate(()=>HapilArcadeApp.getState().mode)==='chapter')await p.locator('#arcade-chapter-card .cc-skip').click();
   await mode(p,'playing');assert.equal((await state(p)).hero,id);
  }
  async function paint(p,n,wantedMax){
   const e=slider(p);assert.equal(await e.getAttribute('max'),String(wantedMax));
   assert.equal(await e.inputValue(),String(n));
   assert.equal(await e.evaluate(x=>x.style.getPropertyValue('--steps')),String(wantedMax));
   const key=wantedMax===7?'abilityTimeAwakened':'abilityTime';
   assert.equal(await e.getAttribute('data-i18n-label'),key);
   assert.match(await e.getAttribute('aria-label'),wantedMax===7?/각성|Awakened/:/서하|Seoha/);
   assert.equal(await p.locator('#label-abilitySeoha').getAttribute('data-i18n'),key);
   if(n)assert.match(await p.locator('#value-abilitySeoha').textContent(),new RegExp(String(n)));
   if(n)assert.match(await p.locator('#note-abilitySeoha').textContent(),new RegExp(String(11*n)+'%'));
   assert.equal((await state(p)).ability,n);
  }
  async function sample(p,held,expected){
   // Staging only: leave the public game loop and real renderer/input running, but stop hostile spawns
   // and place one native bullet well outside the player's slow circle to measure the time modifier.
   await p.evaluate(()=>{
    const s=HapilArcadeApp.debugState().state; s.stage='break';s.stageTick=-1e7;
    s.player.x=180;s.player.y=508;s.n=1;s.mobs.length=0;s.lasers.length=0;s.figures.length=0;
    if(s.risers)s.risers.length=0;
    for(const a of ['ba','bturn','bacc','bmin','barg','bs2','bspin','bat','bmode','bgen','bfragment','bbreakable','bcolor','bexit','bbounce','bmirror','bgrace'])s[a][0]=0;
    s.bformation[0]=1; // suppress the legacy forced-descent turn; horizontal native control shot
    s.bx[0]=35;s.by[0]=110;s.bs[0]=60;s.bmax[0]=400;s.bage[0]=100;s.blife[0]=60000;s.bsize[0]=1;
   });
   if(held)await p.keyboard.down('Shift');
   await p.keyboard.down('ArrowRight');
   try{
    await p.waitForFunction(({held,expected})=>{const s=HapilArcadeApp.debugState().state;return s.player.focus===held&&Math.abs(s.enemyTimeRate-expected)<1e-6;},{held,expected});
    const reading=await p.evaluate(async()=>{const s=HapilArcadeApp.debugState().state;
     const t=s.tick,x=s.player.x,b=s.bx[0];
     await new Promise(ok=>{const go=()=>s.tick>=t+12?ok():requestAnimationFrame(go);go();});
     return {ticks:s.tick-t,move:(s.player.x-x)/(s.tick-t),bullet:(s.bx[0]-b)/(s.tick-t),rate:s.enemyTimeRate,focus:s.player.focus};});
    assert.equal(reading.focus,held);near(reading.rate,expected);return reading;
   }finally{await p.keyboard.up('ArrowRight');if(held)await p.keyboard.up('Shift');}
  }
  const c=await browser.newContext({viewport:{width:1280,height:900}});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
    await p.goto(baseURL+'/arcade.html?eyes=0&drill=0',{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
    await p.locator('[data-difficulty=hell]').click();
    await select(p,'seoha-b');await pause(p);await paint(p,7,7);
    await slider(p).press('Home');await paint(p,0,7);await resume(p);const baselineHeld=await sample(p,true,1);
    await pause(p);await slider(p).press('End');await paint(p,7,7);await resume(p);
    const awakenedHeld=await sample(p,true,.23);const awakenedReleased=await sample(p,false,1);
    near(baselineHeld.move,1.8);near(baselineHeld.bullet,1);
    near(awakenedHeld.bullet/baselineHeld.bullet,.23);near(awakenedHeld.move,.46);
    near(awakenedReleased.bullet,baselineHeld.bullet);near(awakenedReleased.move,4.2);
    await pause(p);await slider(p).press('ArrowLeft');await paint(p,6,7);
    const cp=await p.evaluate(()=>{const s=HapilArcadeApp.debugState().state,seg=HapilArcade.STAGES[0].first+1;
     // Checkpoint writer fixture from an exact currently selected native hero. Not a naturally cleared boss.
     if(!HapilMobile.commitBossClear({...s,stage:'bossClear',bossClear:{nextSegment:seg,stageCommitted:false}}))throw Error('native checkpoint fill');
     return HapilMobile.checkpoint(0,s.difficulty);
    });assert.equal(cp.hero,'seoha-b');assert.equal(cp.difficulty,'hell');
    assert.deepEqual((await state(p)).settings.abilitySeohaB,6);
    await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
    await p.locator('#arcade-continue').click();await mode(p,'playing');assert.equal((await state(p)).hero,'seoha-b');await pause(p);await paint(p,6,7);
    assert.equal((await state(p)).settings.abilitySeoha,3);
    await p.locator('#arcade-quit').click();await mode(p,'title');await select(p,'seoha');await pause(p);await paint(p,3,3);
    assert.equal((await state(p)).settings.abilitySeohaB,6);assert.deepEqual(errors,[]);
    return {baselineHeld,awakenedHeld,awakenedReleased,continuedAbility:6,traineeCap:3};
  }catch(e){await p.screenshot({path:path.join(out,'seoha-awakened-ability-failure.png'),fullPage:true});throw e;}
  finally{await c.close();}
}
async function desktop(browser){
  const {context,page,errors,badRequests}=await setup(browser,{width:1280,height:900},false,'desktop');
  try{
    await stationary(page);
    await page.keyboard.down('Escape');await page.keyboard.down('Escape');
    assert.equal((await state(page)).mode,'paused','held Esc must not immediately resume');
    await page.keyboard.up('Escape');await page.keyboard.press('Escape');
    assert.equal((await state(page)).mode,'playing');
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.press('Escape');
    await page.keyboard.up('ArrowRight');await page.keyboard.press('Escape');
    const x=await page.evaluate(()=>HapilArcadeApp.debugState().state.player.x);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.player.x),x,'no sticky movement after pause');
    const heroOpacity=await nearbyBulletOpacity(page,'desktop');
    await storyAndRules(page,'desktop');const sevenSins=await sevenSinsClear(page),musicStress=await musicTransitions(page),music=await pauseSettings(page,'desktop',false);
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name:'desktop',heroSelection:true,hero:'seoha-b',heroOpacity,mainBossCutin:true,sevenSins,keyboard:true,pauseSettings:true,audioLifecycle:true,musicStress,music,errors,badRequests});
  }catch(e){await page.screenshot({path:path.join(out,'desktop-failure.png'),fullPage:true});throw e;}
  finally{await context.close();}
}
async function mobile(browser,width,height){
  const name='mobile-'+width+'x'+height,{context,page,errors,badRequests}=await setup(browser,{width,height},true,name);
  try{
    await stationary(page);
    const cdp=await context.newCDPSession(page);
    const rect=await page.locator('#arcade-canvas').boundingBox(),focus=await page.locator('#arcade-focus').boundingBox(),bomb=await page.locator('#arcade-bomb').boundingBox();
    const readouts=await page.locator('#arcade-hud-low.mobile-player').boundingBox();
    const bossHud=await page.locator('#arcade-hud-high.mobile-boss').boundingBox();
    assert(readouts&&bossHud&&readouts.x>bossHud.x+bossHud.width,'hero stats sit at the upper right');
    assert(readouts.y<=rect.y+5,'the HUD starts at the top of the field or in the gutter');
    const stats=page.locator('.mobile-player');
    for(const selector of ['.score','.graze','.lives','.bombs','.levels','.gauge'])assert(await stats.locator(selector).isVisible());
    for(const [id,b,w,h] of [['focus',focus,104,88],['bomb',bomb,80,68]]){
      assert.deepEqual([b.width,b.height],[w,h],id+' preserves the original touch target');
      assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,id+' target stays within the viewport');
      const label=await page.locator('#arcade-'+id+' .pad-label').boundingBox();
      assert(label.width<w&&label.height<h/2&&label.y>b.y+12,id+' paints only a small label at the bottom');
    }
    // Press above both visible labels, including the focus button's extended hit area.
    const move={id:1,x:rect.x+rect.width*.12,y:Math.min(rect.y+rect.height*.52,focus.y-44,bomb.y-44)},hold={id:2,x:focus.x+focus.width/2,y:focus.y-6},blast={id:3,x:bomb.x+bomb.width/2,y:bomb.y+6};
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const pos=()=>page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {x:s.player.x,tick:s.tick,bombs:s.bombs,focus:s.player.focus};});
    await touch('touchStart',[move]);let p0=await pos();
    await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+6,p0.tick);
    assert.equal((await pos()).x,p0.x,name+' touching a new location holds the hero in place');
    move.x=rect.x+rect.width*.95;p0=await pos();await touch('touchMove',[move]);
    await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+8,p0.tick);let p1=await pos();
    const fast=(p1.x-p0.x)/(p1.tick-p0.tick);assert(fast>3,name+' normal touch movement: '+JSON.stringify({p0,p1,move}));
    await touch('touchStart',[hold]);p0=await pos();await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+12,p0.tick);p1=await pos();
    const slow=(p1.x-p0.x)/(p1.tick-p0.tick);assert(slow>0&&slow<fast*.65,'slow touch movement is actually slower');assert(p1.focus);
    // Finger leaving the button while held must keep pointer capture and focus.
    hold.x=Math.min(width-1,hold.x+80);hold.y=Math.max(1,hold.y-80);
    await touch('touchMove',[hold]);assert((await state(page)).focus,'focus survives dragging off button');
    const stock=(await pos()).bombs;
    await touch('touchStart',[blast]);await page.waitForFunction(n=>HapilArcadeApp.debugState().state.bombs===n-1,stock);
    // Chromium CreateWebTouchEvents ends the supplied IDs, not the remaining
    // fingers. An empty touchEnd ends every remaining pointer.
    await touch('touchEnd',[blast]);assert((await state(page)).focus,'bomb release does not release low speed');
    await touch('touchEnd',[hold]);assert.equal((await state(page)).focus,false,'focus clears on its own release');
    await touch('touchEnd',[]);
    const heroOpacity=await nearbyBulletOpacity(page,name);
    await storyAndRules(page,name);const music=await pauseSettings(page,name,true);
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name,heroSelection:true,hero:'seoha-b',heroOpacity,mainBossCutin:true,fast,slow,multitouchBomb:true,pauseSettings:true,audioLifecycle:true,music,errors,badRequests});
  }catch(e){await page.screenshot({path:path.join(out,name+'-failure.png'),fullPage:true});throw e;}
  finally{await context.close();}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    reports.push({seohaAwakenedAbility:await seohaAwakenedAbility(browser,'http://127.0.0.1:'+server.address().port)});
    await desktop(browser);for(const size of [[390,844],[360,640],[844,390]])await mobile(browser,...size);
    const wrath=await require('./check-wrath-browser-v43.cjs')(browser,'http://127.0.0.1:'+server.address().port,out);reports.push({wrath});
    const phase2=require('./check-phase2-native-browser-v43.cjs'),baseURL='http://127.0.0.1:'+server.address().port;
    reports.push({phase2:await phase2(browser,baseURL,out)});
    reports.push({phase2Mobile:await phase2(browser,baseURL,out,{mobile:true,only:['p2_wrath','siren']})});
    reports.push({phase2ExtraMobile:await require("./check-phase2-extra-browser-v43.cjs")(browser,baseURL,out)});
    reports.push({balrogThreeCuts:await require("./check-balrog-three-cuts-browser-v43.cjs")(browser,baseURL,out)});
    reports.push({phase2P1Mobile:await require("./check-phase2-extra-browser-v43.cjs")(browser,baseURL,out,{p1:true})});
    reports.push({stage2:await require('./check-stage2-source-browser-v43.cjs')(browser,baseURL,out)});
    reports.push({stage3:await require('./check-stage3-source-browser-v43.cjs')(browser,baseURL,out)});
    reports.push({stage4:await require('./check-stage4-source-browser-v43.cjs')(browser,baseURL,out)});
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,reports},null,2));console.log(JSON.stringify(reports,null,2));
  }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:false,reports,error:e.stack},null,2));throw e;}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
