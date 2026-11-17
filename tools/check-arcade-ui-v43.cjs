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
  for(const id of ['memory','seoha','confirm','cancel'])await inViewport(page,'#hero-select-'+id,name+' hero '+id);
  for(const id of ['portrait','name','title','description','abilities'])await inViewport(page,'#hero-select-'+id,name+' hero '+id,1);
  assert.equal(await page.locator('#hero-select-portrait').evaluate(el=>getComputedStyle(el).objectFit),'contain','portrait preserves the complete face');
  await page.waitForTimeout(750);
  assert.equal((await state(page)).mode,'hero','reveal animation never starts the game automatically');
  await page.screenshot({path:path.join(out,name+'-hero-memory.png'),fullPage:true});
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#hero-select-seoha').getAttribute('aria-pressed'),'true','keyboard selects Seoha');
  assert.equal(await page.locator('#hero-select-name').innerText(),'윤서하');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#hero-select-memory').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>{const p=document.getElementById('hero-select-portrait');return p.src.includes('seoha-portrait.webp')&&p.complete&&p.naturalWidth>0;});
  assert.equal(await page.locator('#hero-select-abilities li').count(),3);
  assert((await page.locator('#hero-select-description').innerText()).trim().length>0);
  await page.waitForTimeout(750);
  for(const id of ['memory','seoha','confirm','cancel'])await inViewport(page,'#hero-select-'+id,name+' Seoha '+id);
  for(const id of ['portrait','name','title','description','abilities'])await inViewport(page,'#hero-select-'+id,name+' Seoha '+id,1);
  await page.screenshot({path:path.join(out,name+'-hero-seoha.png'),fullPage:true});
  if(mobile)await activate(page,'#hero-select-cancel',true);else await page.keyboard.press('Escape');
  assert.equal((await state(page)).mode,'title');
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state),null,'cancel does not start or save a run');
  await activate(page,'#arcade-start',mobile);
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  assert.equal(await page.locator('#hero-select-memory').getAttribute('aria-pressed'),'true','unconfirmed choice is not persisted');
  if(mobile)await confirmHero(page,'seoha',true);
  else{
    await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='playing');
    assert.equal((await state(page)).hero,'seoha');
    assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.hero),'seoha');
    assert.equal(await page.locator('#arcade-hero-select').isVisible(),false);
  }
}
async function setup(browser,viewport,mobile,name){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],badRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badRequests.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{
    window.__audioContexts=[];
    const Native=window.AudioContext||window.webkitAudioContext;
    if(Native)window.AudioContext=new Proxy(Native,{construct(target,args){const c=new target(...args);window.__audioContexts.push(c);return c;}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/arcade.html?eyes=0',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
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
  return page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {tick:s.tick,stageTick:s.stageTick,segTick:s.segTick,hp:s.player.hp,bombs:s.bombs,x:s.player.x,y:s.player.y,actor:s.boss.actor,present:s.boss.present,n:s.n,floor:s.floor.t};});
}
async function storyAndRules(page,name){
  // Warm the authored full portrait before timing the short entrance animation.
  await page.evaluate(()=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>reject(new Error('Violet cut-in portrait failed to load'));im.src='media/combat/boss01-purple-sword-spider-angel-cutin.webp';}));
  const fixture=await page.evaluate(()=>{
    const a=HapilArcade,s=HapilArcadeApp.debugState().state;
    const main=a.SEGMENTS.findIndex(g=>g.stage===1&&g.kind==='card'&&!g.mid),mid=a.SEGMENTS.find(g=>g.stage===1&&g.kind==='card'&&g.mid);
    // This is the real pre-enter state: the previous midboss still owns boss
    // metadata, while the next segment identifies the not-yet-spawned main boss.
    s.stageIndex=1;s.seg=main;s.stage='intro';s.stageTick=0;s.segTick=0;
    s.boss.actor=mid.actor;s.boss.name=a.ACTORS[mid.actor].name;s.boss.mid=true;s.boss.present=false;s.boss.leaving=true;
    s.n=0;s.lasers.length=s.figures.length=s.mobs.length=0;if(s.risers)s.risers.length=0;
    s.player.invulnerableUntil=s.tick+1e7;document.getElementById('story-auto').checked=false;
    return {tick:s.tick,main,midActor:mid.actor};
  });
  // No showStory debug call: the application must intercept before Arcade.step.
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='story');
  const cutin=await state(page);
  assert.equal(cutin.story.phase,'impact');assert.equal(cutin.story.actor,'violet');assert.equal(cutin.seg,fixture.main);
  const before=await combatClock(page);
  assert.equal(before.tick,fixture.tick,'cut-in opens before the first main-boss engine tick');
  assert.equal(before.stageTick,0);assert.equal(before.actor,fixture.midActor);assert.equal(before.present,false,'main boss has not arrived');
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
  await stationary(page);
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
  await page.locator('#setting-lowQuality').check();
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>HapilArcadeApp.debugState().state.tick),tick,'settings must not advance combat');
  assert.equal((await state(page)).settings.musicVolume,.35);
  assert.equal((await state(page)).settings.sfxVolume,.65);
  await page.screenshot({path:path.join(out,name+'-pause.png'),fullPage:true});
  // Turning off BGM must pause every HTML audio player even if play() was pending.
  await page.locator('#setting-music').uncheck();
  await page.locator('#arcade-resume').click();
  await page.waitForTimeout(250);
  assert(await page.evaluate(()=>Object.values(HapilMusic._players()).every(p=>p.a.paused)),'disabled BGM stays paused');
  await page.locator('#arcade-pause-button').click();
  await page.locator('#setting-music').check();
  await page.locator('#arcade-resume').click();
  await page.waitForFunction(()=>Object.values(HapilMusic._players()).some(p=>!p.a.paused));
  await page.locator('#arcade-pause-button').click();
  await page.waitForTimeout(100);
  assert(await page.evaluate(()=>Object.values(HapilMusic._players()).every(p=>p.a.paused)),'pause stops BGM');
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
  const saved=(await state(page)).settings;
  assert.equal(saved.musicVolume,.35);assert.equal(saved.sfxVolume,.65);assert.equal(saved.screenShake,false);assert.equal(saved.lowQuality,true);
  await page.locator('#arcade-start').click();
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='hero');
  assert.equal(await page.locator('#hero-select-seoha').getAttribute('aria-pressed'),'true','confirmed hero survives reload');
  assert.equal(await page.locator('#arcade-hero-select').getAttribute('data-lite'),'true');
  assert.equal(await page.locator('#arcade-hero-select .hs-art').evaluate(el=>getComputedStyle(el).animationName),'none','low-quality selection disables reveal motion');
  await confirmHero(page,'seoha',mobile);
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
    await storyAndRules(page,'desktop');await pauseSettings(page,'desktop',false);
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name:'desktop',heroSelection:true,hero:'seoha',mainBossCutin:true,keyboard:true,pauseSettings:true,audioLifecycle:true,errors,badRequests});
  }catch(e){await page.screenshot({path:path.join(out,'desktop-failure.png'),fullPage:true});throw e;}
  finally{await context.close();}
}
async function mobile(browser,width,height){
  const name='mobile-'+width+'x'+height,{context,page,errors,badRequests}=await setup(browser,{width,height},true,name);
  try{
    await stationary(page);
    const cdp=await context.newCDPSession(page);
    const rect=await page.locator('#arcade-canvas').boundingBox(),focus=await page.locator('#arcade-focus').boundingBox(),bomb=await page.locator('#arcade-bomb').boundingBox();
    for(const [label,b] of [['focus',focus],['bomb',bomb]]){assert(b&&b.width>=44&&b.height>=44,label+' touch target');assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,label+' visible');}
    // Landscape keeps the action pads over the bottom of the canvas. Start the
    // movement finger above them so it cannot be mistaken for a bomb press.
    const move={id:1,x:rect.x+rect.width*.85,y:Math.min(rect.y+rect.height*(544/640),focus.y-12,bomb.y-12)},hold={id:2,x:focus.x+focus.width/2,y:focus.y+focus.height/2},blast={id:3,x:bomb.x+bomb.width/2,y:bomb.y+bomb.height/2};
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const pos=()=>page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {x:s.player.x,tick:s.tick,bombs:s.bombs,focus:s.player.focus};});
    await touch('touchStart',[move]);let p0=await pos();await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+12,p0.tick);let p1=await pos();
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
    await storyAndRules(page,name);await pauseSettings(page,name,true);
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name,heroSelection:true,hero:'seoha',mainBossCutin:true,fast,slow,multitouchBomb:true,pauseSettings:true,audioLifecycle:true,errors,badRequests});
  }catch(e){await page.screenshot({path:path.join(out,name+'-failure.png'),fullPage:true});throw e;}
  finally{await context.close();}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    await desktop(browser);for(const size of [[390,844],[360,640],[844,390]])await mobile(browser,...size);
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,reports},null,2));console.log(JSON.stringify(reports,null,2));
  }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:false,reports,error:e.stack},null,2));throw e;}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
