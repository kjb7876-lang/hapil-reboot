'use strict';
// Called from the existing Playwright CI server. Only setup positions and the
// one flame sample are fixtures; the engine step, author art and canvas draw are real.
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function wrathBrowser(browser,url,out){
  const page=await browser.newPage({viewport:{width:920,height:780}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(url+'/arcade.html?eyes=0');
    await page.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
    const install=async (page)=>page.evaluate(()=>{
      const a=HapilArcade,app=HapilArcadeApp,seg=a.SEGMENTS.findIndex(g=>g.actor==='p2_wrath'&&!g.mid&&g.kind==='card');
      app.debugState().jumpSegment(seg,false);
      const f=window.__wrathFixture={seg,mode:'route',rotations:[],bodyBefore:0,bodyAfter:0,missBefore:0,missAfter:0};
      const origDraw=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){
        if(this.canvas.id==='arcade-canvas'&&/\/p2_flame\.webp(?:\?|$)/.test(args[0]?.src||'')){
          const m=this.getTransform();
          if(f.rotations.length<240)f.rotations.push(Math.atan2(m.b,m.a));
        }
        return origDraw.apply(this,args);
      };
      const step=a.step,prop=a.PROPS.findIndex(x=>x.key==='p2_flame');
      const clear=s=>{s.n=0;s.lasers.length=0;s.figures.length=0;s.weapons.length=0;s.cannons.length=0;};
      const put=(s,x,y,spin=.065)=>{
        const i=s.n++;
        for(const k of ['ba','bs','bturn','bacc','bmin','barg','bs2','bspin','bage','bat','bsize','bcolor','bgrazed','bmode','bgen','bgrace','bexit','bfrag','bbounce','bmirror','bbreakable'])if(s[k])s[k][i]=0;
        s.bmax[i]=400;s.bx[i]=x;s.by[i]=y;s.blife[i]=60000;s.bsize[i]=a.SHAPE_PROP;s.bcolor[i]=prop;s.bage[i]=a.BLOOM_TICKS+1;s.bspin[i]=spin;
      };
      a.step=function(s,input){
        if(s.seg!==seg||s.stage!=='card')return step(s,input);
        if(f.mode==='route'){
          s.player.invulnerableUntil=s.tick+99;s.boss.hp=s.boss.maxHp;
          if(!f.entered){s.segTick=180;f.entered=true;}
          const result=step(s,input);const w=s.wrathTraverse;
          if(w&&!w.active&&!w.done)f.warn=true;
          if(w&&w.active){f.moving=true;f.maxY=Math.max(f.maxY||0,s.boss.y);}
          if(w&&w.done)f.done=true;
          return result;
        }
        if(f.mode==='still'){
          s.player.invulnerableUntil=s.tick+99;
          if(!f.seeded){clear(s);put(s,120,390);put(s,180,420);put(s,240,450);f.seeded=true;}
          return step(s,input);
        }
        if(f.mode==='impact'){
          clear(s);s.bombs=0;s.player.invulnerableUntil=0;s.player.x=180;s.player.y=460;
          f.bodyBefore=s.hits;put(s,s.player.x,s.player.y);
          const result=step(s,{});f.bodyAfter=s.hits;f.mode='off';return result;
        }
        if(f.mode==='gap'){
          clear(s);s.bombs=0;s.player.invulnerableUntil=0;s.player.x=180;s.player.y=460;
          f.missBefore=s.hits;put(s,s.player.x-20,s.player.y+23,0);
          const result=step(s,{});f.missAfter=s.hits;f.mode='off';return result;
        }
        if(f.mode==='off'){s.player.invulnerableUntil=s.tick+99;return step(s,input);}
        return step(s,input);
      };
    });
    await install(page);
    await page.waitForFunction(()=>window.__wrathFixture.warn,{},{timeout:30000});
    await page.screenshot({path:path.join(out,'wrath-traverse-warning.png')});
    await page.waitForFunction(()=>window.__wrathFixture.maxY>420,{},{timeout:30000});
    await page.screenshot({path:path.join(out,'wrath-traverse-downfield.png')});
    await page.waitForFunction(()=>window.__wrathFixture.done,{},{timeout:30000});
    await page.evaluate(()=>window.__wrathFixture.mode='still');
    await page.waitForFunction(()=>window.__wrathFixture.rotations.length>9,{},{timeout:15000});
    await page.screenshot({path:path.join(out,'wrath-rotating-original-weapon.png')});
    await page.evaluate(()=>window.__wrathFixture.mode='impact');
    await page.waitForFunction(()=>window.__wrathFixture.mode==='off',{},{timeout:10000});
    await page.evaluate(()=>window.__wrathFixture.mode='gap');
    await page.waitForFunction(()=>window.__wrathFixture.mode==='off',{},{timeout:10000});
    const r=await page.evaluate(()=>window.__wrathFixture);
    assert.equal(r.missAfter-r.missBefore,0,'transparent corner of the visible flame does not hit');
    assert(r.warn&&r.moving&&r.done&&r.maxY>420);
    assert(new Set(r.rotations.map(x=>x.toFixed(3))).size>2,'visible original weapon canvas draws rotate');
    assert.equal(r.bodyAfter-r.bodyBefore,1,'visible placed flame triggers production damage pipeline');
    assert.deepEqual(errors,[]);
    const blocked=await browser.newPage({viewport:{width:390,height:720},isMobile:true,hasTouch:true});
    let requests=0;
    try{
      await blocked.route(/\/p2_flame\.webp(?:\?|$)/,r=>{requests++;return r.abort();});
      await blocked.goto(url+'/arcade.html?eyes=0');
      await blocked.waitForFunction(()=>window.HapilArcadeApp&&!document.getElementById('arcade-start').disabled);
      await install(blocked);
      await blocked.waitForFunction(()=>HapilArcadeApp.debugState().state?.stage==='card',{},{timeout:30000});
      await blocked.evaluate(()=>window.__wrathFixture.mode='still');
      for(let i=0;i<100&&!requests;i++)await blocked.waitForTimeout(50);
      assert(requests>0,'browser actually tried to load blocked original flame');
      await blocked.evaluate(()=>window.__wrathFixture.mode='impact');
      await blocked.waitForFunction(()=>window.__wrathFixture.mode==='off',{},{timeout:10000});
      const invisible=await blocked.evaluate(()=>window.__wrathFixture);
      assert.equal(invisible.rotations.length,0);
      assert.equal(invisible.bodyAfter-invisible.bodyBefore,0,'no invisible projectile hit when asset request fails');
    }finally{await blocked.close();}
    return {fixture:'real headless canvas; isolated scene and seeded flame positions; not a natural-play recording',routeMaxY:r.maxY,rotatedDraws:r.rotations.length,flameHits:r.bodyAfter-r.bodyBefore};
  }finally{await page.close();}
};
