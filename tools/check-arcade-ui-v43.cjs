'use strict';
// Real Chromium regression: desktop keyboard, mobile simultaneous touches,
// persistent pause settings, actual media lifecycle and viewport screenshots.
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
async function setup(browser,viewport,mobile){
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
  await page.locator('#arcade-start').click();
  await page.waitForFunction(()=>HapilArcadeApp.getState().mode==='playing');
  return {context,page,errors,badRequests};
}
async function stationary(page){
  // A deterministic empty segment isolates input from bullet RNG and auto-defense.
  await page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;s.stage='break';s.stageTick=-1e7;s.player.x=80;s.player.y=480;s.player.invulnerableUntil=s.tick+1e7;s.n=0;s.lasers.length=s.figures.length=s.mobs.length=0;s.risers.length=0;s.bombs=3;});
}
async function pauseSettings(page,name){
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
}
async function desktop(browser){
  const {context,page,errors,badRequests}=await setup(browser,{width:1280,height:900},false);
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
    await pauseSettings(page,'desktop');
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name:'desktop',keyboard:true,pauseSettings:true,audioLifecycle:true,errors,badRequests});
  }finally{await context.close();}
}
async function mobile(browser,width,height){
  const {context,page,errors,badRequests}=await setup(browser,{width,height},true),name='mobile-'+width+'x'+height;
  try{
    await stationary(page);
    const cdp=await context.newCDPSession(page);
    const rect=await page.locator('#arcade-canvas').boundingBox(),focus=await page.locator('#arcade-focus').boundingBox(),bomb=await page.locator('#arcade-bomb').boundingBox();
    for(const [label,b] of [['focus',focus],['bomb',bomb]]){assert(b&&b.width>=44&&b.height>=44,label+' touch target');assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,label+' visible');}
    const move={id:1,x:rect.x+rect.width*.85,y:rect.y+rect.height*(544/640)},hold={id:2,x:focus.x+focus.width/2,y:focus.y+focus.height/2},blast={id:3,x:bomb.x+bomb.width/2,y:bomb.y+bomb.height/2};
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const pos=()=>page.evaluate(()=>{const s=HapilArcadeApp.debugState().state;return {x:s.player.x,tick:s.tick,bombs:s.bombs,focus:s.player.focus};});
    await touch('touchStart',[move]);let p0=await pos();await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+12,p0.tick);let p1=await pos();
    const fast=(p1.x-p0.x)/(p1.tick-p0.tick);assert(fast>3,'normal touch movement');
    await touch('touchStart',[move,hold]);p0=await pos();await page.waitForFunction(t=>HapilArcadeApp.debugState().state.tick>=t+12,p0.tick);p1=await pos();
    const slow=(p1.x-p0.x)/(p1.tick-p0.tick);assert(slow>0&&slow<fast*.65,'slow touch movement is actually slower');assert(p1.focus);
    // Finger leaving the button while held must keep pointer capture and focus.
    hold.x=Math.min(width-1,hold.x+80);hold.y=Math.max(1,hold.y-80);
    await touch('touchMove',[move,hold]);assert((await state(page)).focus,'focus survives dragging off button');
    const stock=(await pos()).bombs;
    await touch('touchStart',[move,hold,blast]);await page.waitForFunction(n=>HapilArcadeApp.debugState().state.bombs===n-1,stock);
    await touch('touchEnd',[move,hold]);assert((await state(page)).focus,'bomb release does not release low speed');
    await touch('touchEnd',[move]);assert.equal((await state(page)).focus,false,'focus clears on its own release');
    await touch('touchEnd',[]);
    await pauseSettings(page,name);
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    reports.push({name,fast,slow,multitouchBomb:true,pauseSettings:true,audioLifecycle:true,errors,badRequests});
  }finally{await context.close();}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    await desktop(browser);for(const size of [[390,844],[360,640],[844,390]])await mobile(browser,...size);
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,reports},null,2));console.log(JSON.stringify(reports,null,2));
  }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:false,reports,error:e.stack},null,2));throw e;}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
