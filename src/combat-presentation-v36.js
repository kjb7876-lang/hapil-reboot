/* Friendly combat presentation. Every visible body is sampled from retained
 * artwork. Successful muzzle/contact records are core-owned, opt-in and kept
 * outside worlds/saves. This module cannot change damage, aim or timing. */
(function(global){
  'use strict';
  var CACHE_LIMIT=1024*1024,SHOT_W=96,SHOT_H=32,TIP_X=83,TIP_Y=16;
  var MODES=['basic','memory','counter','ego'];
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function enabled(w){return !!(w&&w.campaign&&w.combatRevision===31);}
  function ready(im,w,h){return !!(im&&im.complete!==false&&im.naturalWidth===w&&im.naturalHeight===h);}
  function create(images){
    images=images||{};
    var entries=Object.create(null),cacheBytes=0,cacheBuilds=0,frame=null,current=null,low=false,destroyed=false;
    var metrics={revision:36,enabled:false,shotDraws:0,shotAsset:null,cacheBytes:0,cacheBuilds:0,muzzleDraws:0,impactDraws:0,defeatDraws:0,missingAssets:0,offscreenSkipped:0,latestSerial:0,lastContactX:null,lastContactY:null,contactLimit:8,shotVariants:{basic:0,memory:0,counter:0,ego:0}};
    function release(entry){
      if(!entry)return;
      for(var i=0;i<entry.frames.length;i++){var c=entry.frames[i];cacheBytes-=c.width*c.height*4;c.width=1;c.height=1;}
      delete entries[entry.key];
    }
    function reserve(bytes){
      if(bytes>CACHE_LIMIT)return false;
      if(cacheBytes+bytes>CACHE_LIMIT){var keys=Object.keys(entries);for(var i=0;i<keys.length&&cacheBytes+bytes>CACHE_LIMIT;i++)release(entries[keys[i]]);}
      return cacheBytes+bytes<=CACHE_LIMIT;
    }
    function canvas(w,h){var c=global.document.createElement('canvas');c.width=w;c.height=h;cacheBytes+=w*h*4;return c;}
    // Recolour only existing source pixels, including their original alpha.
    // Pixel processing occurs once when a small source stamp is created.
    function grade(ctx,w,h,mode){
      if(mode==='basic')return;
      var p=ctx.getImageData(0,0,w,h),d=p.data;
      for(var i=0;i<d.length;i+=4){
        if(!d[i+3])continue;
        var l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],v=Math.max(l,Math.max(d[i],d[i+1],d[i+2])*.7);
        if(mode==='memory'){d[i]=Math.min(255,v*.55);d[i+1]=Math.min(255,v*1.06);d[i+2]=Math.min(255,v*.98);}
        else if(mode==='counter'){d[i]=Math.min(255,v*1.22);d[i+1]=Math.min(255,v*.9);d[i+2]=Math.min(255,v*.4);}
        else if(mode==='ego'){d[i]=Math.min(255,v*1.18);d[i+1]=Math.min(255,v*1.08);d[i+2]=Math.min(255,v*.72);}
        else if(mode==='smoke'){d[i]=v*.39;d[i+1]=v*.36;d[i+2]=v*.43;}
      }ctx.putImageData(p,0,0);
    }
    function shotFamily(w){
      var story=global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(w),spec=story&&story.playerShot;
      var key=spec?spec.key:'fxWindArrow8V6',im=images[key],width=spec?spec.width:1024,height=spec?spec.height:512;
      if(!ready(im,width,height))return null;
      var cacheKey='shot:'+key,entry=entries[cacheKey];
      if(entry&&entry.source===im&&entry.spec===spec)return entry;
      if(entry)release(entry);
      var count=spec?1:8;if(!reserve(count*MODES.length*SHOT_W*SHOT_H*4))return null;
      entry={key:cacheKey,asset:key,source:im,spec:spec,frames:[],count:count};
      for(var mode=0;mode<MODES.length;mode++)for(var n=0;n<count;n++){
        var c=canvas(SHOT_W,SHOT_H),pc=c.getContext('2d');
        var crop=spec?(spec.crop||[0,0,width,height]):[(n%4)*256+64,Math.floor(n/4)*256+72,144,112];
        var pivotX=spec?(key==='storyPlayerSeohaSlash'?324:420):((n%4)*256+192);
        var pivotY=spec?(key==='storyPlayerSeohaSlash'?245:111):(Math.floor(n/4)*256+128);
        var bodyHeight=spec?(key==='storyPlayerSeohaSlash'?21:18):28;
        var bodyX=TIP_X-(pivotX-crop[0])/crop[2]*84,bodyY=TIP_Y-(pivotY-crop[1])/crop[3]*bodyHeight;
        // A restrained, long after-image is precomposited under the same own
        // object. It adds no independent bullet and no per-frame surfaces.
        pc.globalAlpha=.21;pc.drawImage(im,crop[0],crop[1],crop[2],crop[3],bodyX-22,16-(pivotY-crop[1])/crop[3]*bodyHeight*.62,73,bodyHeight*.62);
        pc.globalAlpha=1;pc.drawImage(im,crop[0],crop[1],crop[2],crop[3],bodyX,bodyY,84,bodyHeight);
        grade(pc,SHOT_W,SHOT_H,MODES[mode]);entry.frames.push(c);
      }
      entries[cacheKey]=entry;cacheBuilds++;return entry;
    }
    function effects(){
      var im=images.fxResonance;if(!ready(im,512,512))return null;
      var key='contact:fxResonance',entry=entries[key];if(entry&&entry.source===im)return entry;
      if(entry)release(entry);
      if(!reserve(12*64*64*4))return null;
      entry={key:key,source:im,frames:[],count:4};
      for(var tone=0;tone<3;tone++)for(var n=0;n<4;n++){
        var c=canvas(64,64),pc=c.getContext('2d');pc.drawImage(im,n%2*256,Math.floor(n/2)*256,256,256,0,0,64,64);
        grade(pc,64,64,tone===0?'counter':tone===1?'memory':'smoke');entry.frames.push(c);
      }entries[key]=entry;cacheBuilds++;return entry;
    }
    function beginFrame(w,lightweight){
      current=w;low=!!lightweight;frame=null;
      metrics.enabled=!destroyed&&enabled(w);metrics.shotDraws=0;metrics.shotAsset=null;metrics.muzzleDraws=0;metrics.impactDraws=0;metrics.defeatDraws=0;metrics.missingAssets=0;metrics.offscreenSkipped=0;metrics.lastContactX=null;metrics.lastContactY=null;metrics.contactLimit=low?8:12;
      for(var m=0;m<MODES.length;m++)metrics.shotVariants[MODES[m]]=0;
      if(metrics.enabled&&global.HapilCore&&global.HapilCore.getCombatPresentation)frame=global.HapilCore.getCombatPresentation(w);
      metrics.latestSerial=frame?frame.serial:0;
    }
    function modeFor(w,s){return s.kind==='memory'?1:s.kind==='counter'?2:w.player&&w.tick<(w.player.egoUntil||0)?3:0;}
    function drawShot(ctx,w,s){
      if(destroyed||!enabled(w))return false;
      // A current own-source shot is handled even if its material is missing;
      // the caller must not substitute a legacy arrow from another character.
      if(!s||!finite(s.x)||!finite(s.y))return true;
      if(s.x<-42||s.x>402||s.y<-42||s.y>682){metrics.offscreenSkipped++;return true;}
      var family=shotFamily(w);if(!family){metrics.missingAssets++;return true;}
      var mode=modeFor(w,s),phase=family.count===1?0:Math.min(7,Math.floor(Math.max(0,s.age||0)*1000/80));
      var width=mode===2?38:mode===3?35:mode===1?29:31,height=mode===2?12:mode===3?11.5:mode===1?10.5:10;
      var angle=finite(s.angle)?s.angle:Math.atan2(s.vy||-1,s.vx||0);
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.translate(s.x,s.y);ctx.rotate(angle);
      ctx.drawImage(family.frames[mode*family.count+phase],-TIP_X/SHOT_W*width,-TIP_Y/SHOT_H*height,width,height);ctx.restore();
      metrics.shotDraws++;metrics.shotAsset=family.asset;metrics.shotVariants[MODES[mode]]++;return true;
    }
    function stamp(ctx,image,x,y,width,height,angle,alpha){
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle||0);ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();
    }
    function drawContacts(ctx,w){
      if(destroyed||!enabled(w)||current!==w||!frame)return;
      if(w.stage!=='waves'&&w.stage!=='boss'&&w.stage!=='transition')return;
      var sheet=null,limit=low?8:12,muzzleLimit=low?2:3,capacity=Math.min(64,frame.capacity||64);
      // Freshest real contacts win the small cosmetic budget. Expiry is in
      // simulation ticks, so repeated/paused draws cannot extend an effect.
      for(var serial=frame.serial,first=Math.max(1,serial-capacity+1);serial>=first;serial--){
        var e=frame.events[(serial-1)%capacity];if(!e||e.serial!==serial||!finite(e.x)||!finite(e.y)||!finite(e.tick))continue;
        var age=w.tick-e.tick;if(age<0||e.x<-42||e.x>402||e.y<-42||e.y>682)continue;
        var muzzle=e.kind==='muzzle',impact=e.kind==='impact';if((!muzzle&&!impact)||age>=(muzzle?5:15))continue;
        if(muzzle&&metrics.muzzleDraws>=muzzleLimit||impact&&metrics.impactDraws>=limit)continue;
        if(!sheet){sheet=effects();if(!sheet){metrics.missingAssets++;return;}}
        var tone=e.shotKind==='memory'?1:0,angle=finite(e.angle)?e.angle:-Math.PI/2;
        if(muzzle){
          var pulse=1-age/5,size=e.shotKind==='counter'?18:14;stamp(ctx,sheet.frames[tone*4],e.x,e.y,size*(.8+.2*pulse),size*.72,angle,pulse*.65);metrics.muzzleDraws++;
        }else{
          var p=age/15,cell=age<2?0:age<5?1:age<10?2:3,size=e.shotKind==='counter'?28:e.isBoss?24:21;
          stamp(ctx,sheet.frames[tone*4+cell],e.x,e.y,size*(.8+p*.45),size*(.8+p*.45),angle*.22,(1-p)*.91);
          // The authored broken-spark cell is reused as three tiny material
          // flecks. They have no backing, geometric body or collision effect.
          if(age>=2&&age<12){for(var n=0;n<3;n++){var a=angle+Math.PI+(n-1)*.83,spread=4+p*14;stamp(ctx,sheet.frames[tone*4+3],e.x+Math.cos(a)*spread,e.y+Math.sin(a)*spread,7+2*p,4+2*p,a,(1-p)*.55);}}
          metrics.impactDraws++;metrics.lastContactX=e.x;metrics.lastContactY=e.y;
        }
      }
    }
    function drawDefeat(ctx,w,e){
      if(destroyed||!enabled(w)||!e||e.kind!=='kill')return false;
      if(metrics.defeatDraws>=(low?6:10))return true;
      var duration=e.ttl||.6,age=Math.max(0,e.age||0),p=clamp(age/duration,0,1);if(p>=1)return true;
      var size=Math.min(94,Math.max(44,(e.r||23)*2.2));if(e.x+size<0||e.x-size>360||e.y+size<0||e.y-size>640)return true;
      var sheet=effects();if(!sheet){metrics.missingAssets++;return true;}
      var cell=p<.12?0:p<.32?1:p<.64?2:3;
      // Compact first beat, then a quiet source-masked dust ring and separated
      // warm fragments. No full-screen flash or bright persistent death disc.
      stamp(ctx,sheet.frames[cell],e.x,e.y,size*(.43+.46*p),size*(.43+.46*p),.28,Math.max(0,1-p*1.5)*.83);
      if(p>.13){var dust=clamp((p-.13)/.22,0,1)*(1-p);stamp(ctx,sheet.frames[8+Math.max(2,cell)],e.x,e.y-6*p,size*(.64+.5*p),size*(.64+.5*p),-.2,dust*.66);
        var pieces=low?3:5;for(var n=0;n<pieces;n++){var a=n*2.399963+e.x*.013,spread=size*(.08+p*.28);stamp(ctx,sheet.frames[3],e.x+Math.cos(a)*spread,e.y+Math.sin(a)*spread-p*5,9+(1-p)*5,6+(1-p)*4,a+p,(1-p)*.55);}}
      metrics.defeatDraws++;return true;
    }
    function getMetrics(){
      return {revision:36,enabled:metrics.enabled,shotDraws:metrics.shotDraws,shotAsset:metrics.shotAsset,cacheBytes:cacheBytes,cacheBuilds:cacheBuilds,muzzleDraws:metrics.muzzleDraws,impactDraws:metrics.impactDraws,defeatDraws:metrics.defeatDraws,missingAssets:metrics.missingAssets,offscreenSkipped:metrics.offscreenSkipped,latestSerial:metrics.latestSerial,lastContactX:metrics.lastContactX,lastContactY:metrics.lastContactY,contactLimit:metrics.contactLimit,shotVariants:{basic:metrics.shotVariants.basic,memory:metrics.shotVariants.memory,counter:metrics.shotVariants.counter,ego:metrics.shotVariants.ego}};
    }
    function destroy(){var keys=Object.keys(entries);for(var i=0;i<keys.length;i++)release(entries[keys[i]]);cacheBytes=0;frame=null;current=null;images={};destroyed=true;metrics.enabled=false;}
    return {beginFrame:beginFrame,drawShot:drawShot,drawContacts:drawContacts,drawDefeat:drawDefeat,getMetrics:getMetrics,destroy:destroy};
  }
  var api=Object.freeze({create:create,CACHE_LIMIT:CACHE_LIMIT,SHOT_STAMP_WIDTH:SHOT_W,SHOT_STAMP_HEIGHT:SHOT_H,SHOT_TIP_X:TIP_X,SHOT_TIP_Y:TIP_Y});
  global.HapilCombatPresentationV36=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
