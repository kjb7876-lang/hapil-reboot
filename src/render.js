(function (global) {
  'use strict';
  var W = 360, H = 640;
  var COLORS = {cyan:'#8de5ea',violet:'#c2a4f4',pink:'#f3a2cd',gold:'#f0cf86',red:'#ff858f',blue:'#88b7ff',white:'#f6efdc'};
  // Presentation only. These seven moods grade the verified terrain pixels;
  // source map bytes and their authored connections remain unchanged.
  var DREAMS = [
    {id:'moonwood',ink:'#111c29',mist:'#7b9cac',trim:'#91a8b4',motif:'root'},
    {id:'black-garden',ink:'#181824',mist:'#8e7597',trim:'#aaa18c',motif:'root'},
    {id:'silk-vault',ink:'#1b152a',mist:'#8c789c',trim:'#b9a5ba',motif:'web'},
    {id:'drowned-memory',ink:'#0d2527',mist:'#689b92',trim:'#9eafa1',motif:'water'},
    {id:'broken-court',ink:'#231b24',mist:'#9c7b83',trim:'#ae9b8c',motif:'stone'},
    {id:'ashen-wake',ink:'#231b20',mist:'#b58073',trim:'#b7a18e',motif:'grave'},
    {id:'seven-seals',ink:'#261822',mist:'#b58179',trim:'#c1a484',motif:'chain'}
  ];
  function color(value) { return COLORS[value] || value || '#c2a4f4'; }
  function paletteFor(world,owner){return global.HapilProjectiles&&global.HapilProjectiles.paletteFor?global.HapilProjectiles.paletteFor(world,owner):null;}
  function imageReady(im) { return im && im.complete && im.naturalWidth > 0; }
  // These are whole, precomposed source paintings, not a tile atlas. The
  // portrait adaptation preserves one uniformly scaled architectural view and
  // an inspected floor patch from the same scene. It adds no collision walls.
  var H14_TERRAIN=Object.freeze({
    h14MapViolet:Object.freeze({width:1586,height:992,scene:'dist01',floor:Object.freeze([523,278,539,268])}),
    h14MapHorn:Object.freeze({width:1586,height:992,scene:'dist02',floor:Object.freeze([523,278,539,268])}),
    h14MapBalrog:Object.freeze({width:1586,height:992,scene:'dist06',floor:Object.freeze([508,278,571,298])}),
    h14MapMask:Object.freeze({width:1672,height:941,scene:'ep1a08',floor:Object.freeze([585,282,568,301])}),
    h14MapLucifer:Object.freeze({width:1586,height:992,scene:'ep1a11',floor:Object.freeze([508,278,571,298])}),
    h14MapSloth:Object.freeze({width:1600,height:900,scene:'ep1b02',floor:Object.freeze([620,570,360,160])}),
    h14MapEnvy:Object.freeze({width:1600,height:900,scene:'ep1b03',floor:Object.freeze([640,540,360,90])}),
    h14MapGluttony:Object.freeze({width:1672,height:941,scene:'ep1b04',floor:Object.freeze([550,260,600,190])}),
    h14MapLust:Object.freeze({width:1672,height:941,scene:'ep1b05',floor:Object.freeze([552,380,552,179])}),
    h14MapGreed:Object.freeze({width:1600,height:900,scene:'ep1b06',floor:Object.freeze([600,290,420,150])}),
    h14MapGreedSnow:Object.freeze({width:960,height:600,scene:'ep1b06b',floor:Object.freeze([288,180,403,222])}),
    h14MapWrath:Object.freeze({width:1672,height:941,scene:'ep1b07',floor:Object.freeze([580,360,540,290])}),
    h14MapPride:Object.freeze({width:1600,height:900,scene:'ep1b08',floor:Object.freeze([400,240,400,140])}),
    h14MapPrideCore:Object.freeze({width:1600,height:900,scene:'ep1b09',floor:Object.freeze([600,250,400,120])})
  });
  var CULT_TERRAIN=Object.freeze({cultArena:Object.freeze({width:1600,height:1000,scene:'cult04-throne',floor:Object.freeze([500,270,600,300])})});
  var CHAPTER3_TERRAIN=Object.freeze({
    chapter3WarMap:Object.freeze({width:1536,height:1024,scene:'u201-war-loop',floor:Object.freeze([560,280,420,160])}),
    chapter3MigrationMap:Object.freeze({width:1536,height:1024,scene:'u206-migration',floor:Object.freeze([560,650,420,160])}),
    chapter3GateMap:Object.freeze({width:960,height:600,scene:'u203-memory-gate',floor:Object.freeze([330,260,320,120])}),
    chapter3NexusMap:Object.freeze({width:1600,height:1000,scene:'u203-memory-nexus',floor:Object.freeze([620,270,360,180])})
  });
  var H14_GROUP_KEYS=Object.freeze([
    Object.freeze(['h14MapViolet']),Object.freeze(['h14MapHorn']),Object.freeze(['h14MapBalrog']),
    Object.freeze(['h14MapMask']),Object.freeze(['h14MapLucifer']),Object.freeze(['h14MapSloth']),
    Object.freeze(['h14MapEnvy']),Object.freeze(['h14MapGluttony']),Object.freeze(['h14MapLust']),
    Object.freeze(['h14MapGreed','h14MapGreedSnow']),Object.freeze(['h14MapWrath']),Object.freeze(['h14MapPride','h14MapPrideCore']),Object.freeze(['cultArena']),Object.freeze(['chapter3WarMap']),Object.freeze(['chapter3WarMap']),Object.freeze(['chapter3NexusMap']),Object.freeze(['chapter3WarMap']),Object.freeze(['chapter3MigrationMap']),Object.freeze(['chapter3GateMap'])
  ]);
  function storyTerrainContract(key){return global.HapilStoryAssets&&global.HapilStoryAssets.terrainContract(key);}
  function sourceTerrainContract(key){return H14_TERRAIN[key]||CULT_TERRAIN[key]||CHAPTER3_TERRAIN[key]||storyTerrainContract(key);}
  function terrainAssetKeysForEncounter(group){if(group>=19)return global.HapilStoryAssets?global.HapilStoryAssets.terrainKeysForEncounter(group):[];return H14_GROUP_KEYS[group]?H14_GROUP_KEYS[group].slice():[];}
  function readyTerrainImage(images,key){
    var c=sourceTerrainContract(key),im=images&&images[key];
    return !!(c&&imageReady(im)&&im.naturalWidth===c.width&&im.naturalHeight===c.height);
  }
  function invalidTerrainAsset(images,group){
    if(group===-1)return null;
    if(group>=19)return global.HapilStoryAssets?global.HapilStoryAssets.invalidAsset(images,group,'terrain'):'story-terrain-contract';
    if(!Number.isInteger(group)||!H14_GROUP_KEYS[group])return 'terrain-encounter-unsupported';
    var keys=H14_GROUP_KEYS[group];
    for(var i=0;i<keys.length;i++){
      var key=keys[i];if(!readyTerrainImage(images,key))return key;
    }
    return null;
  }
  function h14TerrainKey(world){
    if(!world||!world.campaign)return null;
    if(world.campaignRevision>=5&&world.bossIndex>=18&&!world.finalPractice){var storyTerrain=global.HapilStoryAssets&&global.HapilStoryAssets.terrainForWorld(world);return storyTerrain&&storyTerrain.key;}
    var group=world.finalPractice?12:world.campaignRevision>=4&&world.bossIndex>=12?world.bossIndex+1:world.bossIndex||0,keys=H14_GROUP_KEYS[group];if(!keys)return null;
    // Keep the original connected first approach and Balrog's three approach
    // scenes. Their own new paintings are used for the anchored boss arenas.
    if(world.stage==='waves'&&(group===0||group===2))return null;
    // The child memory and bio-bootloader are same-person followups after the
    // adult form is sealed. Ordinary approach waves must not jump into them.
    var later=world.stage!=='waves'&&(world.phase||0)===2;
    return keys[later&&keys.length>1?1:0];
  }
  function create(canvas, images) {
    var ctx = canvas.getContext('2d', {alpha:false});
    var actorPresentation=global.HapilActors?global.HapilActors.create(images):null;
    var projectilePresentation=global.HapilProjectiles?global.HapilProjectiles.create(images):null;
    var bossSkillPresentation=global.HapilBossSkills?global.HapilBossSkills.create(images):null;
    if (!ctx) throw new Error('이 브라우저에서 2D 전투 화면을 만들 수 없습니다.');
    // Three bounded portrait strips are built once from existing map pixels.
    // The two viewport canvases are reused for masks and near-edge parallax.
    var back=document.createElement('canvas');back.width=W;back.height=H;
    var bg=back.getContext('2d');
    var foreground=document.createElement('canvas');foreground.width=W;foreground.height=H;
    var fg=foreground.getContext('2d');
    var lightweight=false;
    var strips=[],ratio=1,cached=false,edgeMask=null;
    var sinFloor=null,sinFloorSource=null,sinFloorTone=null;
    var sourceScene=null,sourceSceneImage=null,sourceSceneKey=null,sourceSceneTone=null,sourceSceneBuilds=0;
    var playerShotStamp=null,playerShotStampKey=null;
    var warningFootprints=[],warningFootprintPool=[],warningFootprintBuilds=0;
    // Text layouts depend on the actual phase names, not on every render tick.
    // One current HUD/entry/narrative layout keeps memory bounded per renderer.
    var hudTextLayout=null,entryTextLayout=null,narrativeTextLayout=null,textLayoutBuilds=0;
    // The near-edge mask is unchanged during an anchored boss encounter.
    // Reuse its pixels until the source or scroll position changes.
    var parallaxImage=null,parallaxIndex=-1,parallaxProgress=null;
    var terrain=[{key:'forest',label:'숲의 진입로',center:.57,floorY:.38},{key:'ruins',label:'무너진 궁정',center:.50,floorY:.42},{key:'cave',label:'문지기의 동굴',center:.50,floorY:.36}];
    var mapMetrics={zone:'forest',zoneIndex:0,segmentProgress:0,journeyProgress:0,journeySeconds:0,scrollY:640,anchored:false,terrainStripCount:0,cacheCanvasCount:2,cacheBytes:W*H*4*2,introActive:false,introProgress:0,terrainStatus:'retained-v2',sourceStatus:'retained-v2',campaignLocation:null,bossArt:null,visualRevision:11,dreamTheme:null,ambientGlyphs:0,decorativeCenter:'quiet',bossAccent:null,visibleMapTiles:'',visibleMapCount:0,atlasFxDraws:0,atlasFxLimit:24,atlasFxFamilies:''};
    function clamp(value,a,b){return Math.max(a,Math.min(b,value));}
    function smooth(value){value=clamp(value,0,1);return value*value*(3-2*value);}
    function mapImage(index){return imageReady(images[terrain[index].key])?images[terrain[index].key]:images.cave;}
    function cover(target,im,sx,sy,sw,sh,dx,dy,dw,dh){
      if(!imageReady(im))return;
      var scale=Math.max(dw/sw,dh/sh),cropW=dw/scale,cropH=dh/scale;
      target.drawImage(im,sx+(sw-cropW)/2,sy+(sh-cropH)/2,cropW,cropH,dx,dy,dw,dh);
    }
    function makeBackground(){
      parallaxImage=null;parallaxIndex=-1;parallaxProgress=null;
      bg.clearRect(0,0,W,H);
      var wash=bg.createLinearGradient(0,0,0,H);wash.addColorStop(0,'rgba(6,9,17,.18)');wash.addColorStop(.5,'rgba(8,12,21,.19)');wash.addColorStop(1,'rgba(7,13,22,.33)');bg.fillStyle=wash;bg.fillRect(0,0,W,H);
      var vignette=bg.createRadialGradient(W/2,H*.46,100,W/2,H*.5,410);vignette.addColorStop(0,'rgba(5,8,15,0)');vignette.addColorStop(1,'rgba(5,8,15,.48)');bg.fillStyle=vignette;bg.fillRect(0,0,W,H);
      for(var i=0;i<terrain.length;i++){
        var strip=document.createElement('canvas');strip.width=W;strip.height=1280;
        var s=strip.getContext('2d',{alpha:false}),im=mapImage(i),spec=terrain[i];
        s.fillStyle='#141922';s.fillRect(0,0,W,1280);
        if(imageReady(im)){
          var iw=im.naturalWidth,ih=im.naturalHeight;
          // Ground is cropped below each source horizon; it never wraps through sky.
          cover(s,im,iw*.22,ih*spec.floorY,iw*.56,ih*(.94-spec.floorY),0,0,W,1280);
          fg.clearRect(0,0,W,H);fg.globalCompositeOperation='source-over';
          var sourceW=iw*.70,sourceX=clamp(iw*spec.center-sourceW/2,0,iw-sourceW);
          cover(fg,im,sourceX,ih*.055,sourceW,ih*.87,0,0,W,H);
          var seam=fg.createLinearGradient(0,0,0,H);seam.addColorStop(0,'rgba(0,0,0,0)');seam.addColorStop(.18,'rgba(0,0,0,1)');seam.addColorStop(.73,'rgba(0,0,0,1)');seam.addColorStop(1,'rgba(0,0,0,0)');fg.globalCompositeOperation='destination-in';fg.fillStyle=seam;fg.fillRect(0,0,W,H);fg.globalCompositeOperation='source-over';
          // A recognizable gate / demon tree / cave arch arrives from ahead.
          s.drawImage(foreground,0,160);
          s.fillStyle='rgba(10,14,24,.17)';s.fillRect(0,0,W,1280);
        }
        strips.push(strip);
      }
      edgeMask=fg.createLinearGradient(0,0,W,0);edgeMask.addColorStop(0,'rgba(0,0,0,.72)');edgeMask.addColorStop(.18,'rgba(0,0,0,0)');edgeMask.addColorStop(.82,'rgba(0,0,0,0)');edgeMask.addColorStop(1,'rgba(0,0,0,.72)');
      mapMetrics.terrainStripCount=strips.length;mapMetrics.cacheCanvasCount=strips.length+2+(sinFloor?1:0)+(sourceScene?1:0);mapMetrics.cacheBytes=(strips.length*W*1280+(2+(sinFloor?1:0))*W*H+(sourceScene?W*720:0))*4;cached=true;
    }
    function parallax(index,progress,opacity){
      var im=mapImage(index);if(!imageReady(im)||opacity<=0)return;
      var iw=im.naturalWidth,ih=im.naturalHeight,sourceH=ih*.57,sourceY=ih*(.35-progress*.31);
      if(parallaxImage!==im||parallaxIndex!==index||parallaxProgress!==progress){
        fg.clearRect(0,0,W,H);fg.globalCompositeOperation='source-over';fg.globalAlpha=1;
        fg.drawImage(im,iw*.035,sourceY,iw*.20,sourceH,0,0,70,H);
        fg.drawImage(im,iw*.765,sourceY,iw*.20,sourceH,W-70,0,70,H);
        fg.globalCompositeOperation='destination-in';fg.fillStyle=edgeMask;fg.fillRect(0,0,W,H);fg.globalCompositeOperation='source-over';
        parallaxImage=im;parallaxIndex=index;parallaxProgress=progress;
      }
      ctx.globalAlpha=opacity*.36;ctx.drawImage(foreground,0,0);ctx.globalAlpha=1;
    }
    function connectedReady(){
      for(var i=1;i<=12;i++){var im=images['map'+(i<10?'0':'')+i];if(!imageReady(im)||im.naturalWidth!==720||im.naturalHeight!==904)return false;}
      return true;
    }
    function usesConnected(world){return (!world||(world.campaign&&(world.bossIndex||0)===0))&&connectedReady();}
    function drawConnectedTerrain(world){
      var wave=world?clamp(world.wave||0,0,2):0;
      var anchored=!!(world&&(world.practiceBoss||world.boss||world.stage==='bossIntro'||world.stage==='boss'||world.stage==='transition'||world.stage==='won'));
      var local=world?clamp((world.waveTime||0)/(world.waveDuration||15),0,1):0;
      // The verified artwork is a forest/ruins/cave corridor, so its twelve
      // tiles cover the first three waves only. It is not a swamp/castle map.
      var route=world?(anchored?3:wave+local):0;
      var progress=clamp(route/3,0,1),scroll=progress*4784,visible=[];
      ctx.globalAlpha=1;ctx.fillStyle='#111722';ctx.fillRect(0,0,W,H);
      for(var i=1;i<=12;i++){
        var y=H+scroll-i*452;if(y>=H||y+452<=0)continue;
        var key='map'+(i<10?'0':'')+i;
        // Positive source/destination dimensions only: no flips, stretching,
        // hidden overlap, feather reconstruction, or per-frame giant canvas.
        ctx.drawImage(images[key],0,0,720,904,0,y,360,452);visible.push(key);
      }
      mapMetrics.terrainStatus='connected-v1-verified';mapMetrics.sourceStatus='connected-v1-verified';mapMetrics.zone='connected-corridor';mapMetrics.zoneIndex=Math.min(11,Math.floor(scroll/452));
      mapMetrics.segmentProgress=anchored?1:local;mapMetrics.journeyProgress=progress;mapMetrics.journeySeconds=route*15;mapMetrics.scrollY=scroll;mapMetrics.anchored=anchored;
      mapMetrics.campaignLocation=world?(world.encounterName||world.bossName||null):null;mapMetrics.visibleMapTiles=visible.join(',');mapMetrics.visibleMapCount=visible.length;
    }
    function drawExtendedTerrain(world){
      var t=world.time||0, cosmic=world.bossIndex===4, wave=world.wave||0;
      var anchored=world.stage!=='waves', travel=anchored?0:(world.waveTime||0)*22;
      ctx.fillStyle=cosmic?'#090d20':'#101921';ctx.fillRect(0,0,W,H);
      ctx.save();
      if(!cosmic){
        // Receding hospital architecture, no new bitmap artwork.
        var vanX=180+Math.sin(t*.12)*8, vanY=116;
        ctx.fillStyle='#18242c';ctx.beginPath();ctx.moveTo(124,116);ctx.lineTo(236,116);ctx.lineTo(340,640);ctx.lineTo(20,640);ctx.closePath();ctx.fill();
        for(var i=0;i<9;i++){
          var z=((i/9+travel/780)%1),depth=z*z,yy=vanY+depth*560,ww=52+depth*125;
          ctx.globalAlpha=.12+depth*.16;line([[vanX-ww,yy],[vanX+ww,yy]],'#79989d',.8);
          for(var side=0;side<2;side++){
            var sign=side?1:-1,xx=vanX+sign*ww;
            line([[xx,yy],[xx,yy-40-depth*170],[xx+sign*(18+depth*55),yy-55-depth*180]],'#90adb0',1.2);
            ctx.fillStyle=wave===1?'#4d665f':'#597684';ctx.globalAlpha=.07;ctx.fillRect(side?xx:xx-22,yy-75-depth*100,22,35+depth*70);
          }
        }
        ctx.globalAlpha=.16;line([[70,640],[138,116],[222,116],[290,640]],'#8ba5a8',1);
        // Side monitors and broken ceiling lights never resemble attack rays.
        for(var j=0;j<4;j++){ctx.globalAlpha=.1;ctx.fillStyle=wave===2?'#b88ba5':'#a7c5bb';ctx.fillRect(174,80+j*36,12,2);}
      }else{
        var grad=ctx.createRadialGradient(180,150,18,180,200,470);grad.addColorStop(0,'#252644');grad.addColorStop(.5,'#11162e');grad.addColorStop(1,'#090d20');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
        for(var star=0;star<52;star++){
          var sx=(star*137.51)%360,sy=(star*83.17+t*(star%3+1)*.7)%640;
          ctx.globalAlpha=.08+(star%5)*.025;ctx.fillStyle=star%2?'#b6bce3':'#dac9a7';ctx.fillRect(sx,sy,star%7===0?2:1,1);
        }
        // Keep the starfield quiet: the old concentric scenery orbits were
        // centered behind the boss and looked like a second enemy hitbox.
      }
      ctx.restore();
      // Keep the player lane dark even when the scenery is most active.
      ctx.fillStyle='rgba(4,8,17,.22)';ctx.fillRect(48,260,264,380);
      mapMetrics.zone=cosmic?'cosmic-vault':'hospital-corridor';mapMetrics.zoneIndex=world.bossIndex;mapMetrics.terrainStatus='code-scene-v7';mapMetrics.sourceStatus='connected-v1-plus-code-scenes-v7';mapMetrics.anchored=anchored;mapMetrics.segmentProgress=anchored?1:Math.min(1,(world.waveTime||0)/(world.waveDuration||15));mapMetrics.campaignLocation=world.encounterName||world.bossName;mapMetrics.visibleMapTiles='';mapMetrics.visibleMapCount=0;
    }
    function drawSinTerrain(world){
      // A neutral, inspected stone-floor patch from retained cave art. The
      // patch excludes its cavern walls and is an abstract memory arena,
      // never represented as a newly authored hotel, kitchen, or vault map.
      var source=images.cave,palette=paletteFor(world),tone=palette?palette.primary:'#8798af';
      if(!sinFloor){sinFloor=document.createElement('canvas');sinFloor.width=W;sinFloor.height=H;}
      if(sinFloorSource!==source||sinFloorTone!==tone){
        var sc=sinFloor.getContext('2d',{alpha:false});sc.globalAlpha=1;sc.fillStyle='#101621';sc.fillRect(0,0,W,H);
        if(imageReady(source))cover(sc,source,source.naturalWidth*.43,source.naturalHeight*.30,source.naturalWidth*.13,source.naturalHeight*.28,0,0,W,H);
        sc.fillStyle='rgba(5,9,18,.60)';sc.fillRect(0,0,W,H);sc.globalAlpha=.10;sc.fillStyle=tone;sc.fillRect(0,0,W,H);sc.globalAlpha=1;
        var edge=sc.createLinearGradient(0,0,W,0);edge.addColorStop(0,'rgba(4,8,16,.58)');edge.addColorStop(.25,'rgba(4,8,16,.08)');edge.addColorStop(.75,'rgba(4,8,16,.08)');edge.addColorStop(1,'rgba(4,8,16,.58)');sc.fillStyle=edge;sc.fillRect(0,0,W,H);
        sinFloorSource=source;sinFloorTone=tone;
      }
      ctx.globalAlpha=1;ctx.drawImage(sinFloor,0,0);
      mapMetrics.zone='abstract-memory-stage';mapMetrics.zoneIndex=world.bossIndex;mapMetrics.terrainStatus='retained-neutral-floor-crop';mapMetrics.sourceStatus=imageReady(source)?'existing-cave-floor-patch':'unavailable-neutral-floor';
      mapMetrics.anchored=world.stage!=='waves';mapMetrics.segmentProgress=mapMetrics.anchored?1:clamp((world.waveTime||0)/(world.waveDuration||15),0,1);
      mapMetrics.campaignLocation=world.encounterName||world.bossName;mapMetrics.visibleMapTiles='';mapMetrics.visibleMapCount=0;
      mapMetrics.cacheCanvasCount=strips.length+3+(sourceScene?1:0);mapMetrics.cacheBytes=(strips.length*W*1280+3*W*H+(sourceScene?W*720:0))*4;
    }
    function drawSourceTerrain(world,key){
      var contract=sourceTerrainContract(key),im=images[key];
      if(!readyTerrainImage(images,key))return false;
      var palette=paletteFor(world),tone=palette?palette.primary:'#8798af';
      if(!sourceScene){sourceScene=document.createElement('canvas');sourceScene.width=W;sourceScene.height=720;}
      if(sourceSceneImage!==im||sourceSceneKey!==key||sourceSceneTone!==tone){
        var sc=sourceScene.getContext('2d',{alpha:false}),p=contract.floor;
        sc.globalAlpha=1;sc.fillStyle='#111722';sc.fillRect(0,0,W,720);
        cover(sc,im,p[0],p[1],p[2],p[3],0,0,W,720);
        // The floor swatch is not authored as a seamless tile. Feather its
        // repeated copies once at native detail instead of enlarging a tiny
        // patch across the whole portrait lane. This is a derived background.
        fg.clearRect(0,0,W,H);fg.globalAlpha=1;fg.globalCompositeOperation='source-over';
        var tileHeight=W*p[3]/p[2];fg.drawImage(im,p[0],p[1],p[2],p[3],0,0,W,tileHeight);
        var seam=fg.createLinearGradient(0,0,0,tileHeight);seam.addColorStop(0,'rgba(0,0,0,0)');seam.addColorStop(.12,'rgba(0,0,0,1)');seam.addColorStop(.88,'rgba(0,0,0,1)');seam.addColorStop(1,'rgba(0,0,0,0)');
        fg.globalCompositeOperation='destination-in';fg.fillStyle=seam;fg.fillRect(0,0,W,H);fg.globalCompositeOperation='source-over';
        for(var fy=-tileHeight*.5;fy<720;fy+=tileHeight*.78)sc.drawImage(foreground,0,0,W,tileHeight,0,fy,W,tileHeight);
        sc.fillStyle='rgba(5,9,18,.43)';sc.fillRect(0,0,W,720);
        // Reuse the existing temporary foreground surface only while baking.
        // No source-resolution canvas or per-frame map recomposition is made.
        fg.clearRect(0,0,W,H);fg.globalAlpha=1;fg.globalCompositeOperation='source-over';
        var dw=648,dh=dw*im.naturalHeight/im.naturalWidth;
        fg.drawImage(im,0,0,im.naturalWidth,im.naturalHeight,(W-dw)/2,96,dw,dh);
        var fade=fg.createLinearGradient(0,0,0,H);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(.38,'rgba(0,0,0,1)');fade.addColorStop(.66,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,0)');
        fg.globalCompositeOperation='destination-in';fg.fillStyle=fade;fg.fillRect(0,0,W,H);fg.globalCompositeOperation='source-over';
        sc.drawImage(foreground,0,0);parallaxImage=null;parallaxIndex=-1;parallaxProgress=null;
        sc.globalAlpha=.08;sc.fillStyle=tone;sc.fillRect(0,0,W,720);sc.globalAlpha=1;
        var shade=sc.createLinearGradient(0,0,W,0);shade.addColorStop(0,'rgba(3,7,15,.38)');shade.addColorStop(.24,'rgba(3,7,15,.08)');shade.addColorStop(.76,'rgba(3,7,15,.08)');shade.addColorStop(1,'rgba(3,7,15,.38)');sc.fillStyle=shade;sc.fillRect(0,0,W,720);
        sc.fillStyle='rgba(3,7,15,.15)';sc.fillRect(0,300,W,420);
        sourceSceneImage=im;sourceSceneKey=key;sourceSceneTone=tone;sourceSceneBuilds++;
      }
      var anchored=world.stage!=='waves',count=world.bossIndex===1?1:3,local=clamp((world.waveTime||0)/(world.waveDuration||15),0,1);
      var progress=anchored?1:clamp(((world.wave||0)+local)/count,0,1),scroll=progress*80;
      ctx.globalAlpha=1;ctx.drawImage(sourceScene,0,scroll,W,H,0,0,W,H);
      mapMetrics.zone='source-'+contract.scene;mapMetrics.zoneIndex=world.bossIndex;mapMetrics.terrainStatus='hapil1-source-portrait-composite';mapMetrics.sourceStatus='whole-painting-and-feathered-own-floor-swatch';
      mapMetrics.anchored=anchored;mapMetrics.segmentProgress=anchored?1:local;mapMetrics.journeyProgress=progress;mapMetrics.scrollY=scroll;mapMetrics.campaignLocation=world.encounterName||world.bossName;
      mapMetrics.visibleMapTiles='';mapMetrics.visibleMapCount=0;mapMetrics.sceneAsset=key;mapMetrics.sceneSourceSize=[contract.width,contract.height];mapMetrics.sceneFloorPatch=contract.floor.slice();mapMetrics.sceneArchitecturalScale=648/contract.width;
      mapMetrics.sceneCacheBuilds=sourceSceneBuilds;mapMetrics.sceneCacheEntries=1;mapMetrics.sceneCacheBytes=W*720*4;mapMetrics.sceneForegroundDraws=0;mapMetrics.sceneCollisionGeometry=false;
      mapMetrics.cacheCanvasCount=strips.length+2+(sinFloor?1:0)+1;mapMetrics.cacheBytes=(strips.length*W*1280+(2+(sinFloor?1:0))*W*H+W*720)*4;
      return true;
    }
    function releaseSourceTerrain(){
      if(sourceScene){sourceScene.width=1;sourceScene.height=1;sourceScene=null;}
      sourceSceneImage=null;sourceSceneKey=null;sourceSceneTone=null;
      mapMetrics.sceneCacheEntries=0;mapMetrics.sceneCacheBytes=0;
      mapMetrics.cacheCanvasCount=strips.length+2+(sinFloor?1:0);mapMetrics.cacheBytes=(strips.length*W*1280+(2+(sinFloor?1:0))*W*H)*4;
    }
    function drawTerrain(world){
      mapMetrics.sceneAsset=null;mapMetrics.sceneSourceSize=null;mapMetrics.sceneFloorPatch=null;mapMetrics.sceneArchitecturalScale=null;mapMetrics.sceneForegroundDraws=0;mapMetrics.sceneCollisionGeometry=false;
      var sourceKey=h14TerrainKey(world);if(sourceKey&&drawSourceTerrain(world,sourceKey))return;
      releaseSourceTerrain();
      if(world&&(world.finalPractice||world.campaignRevision>=4&&world.bossIndex>=12)){ctx.clearRect(0,0,W,H);mapMetrics.terrainStatus='missing-own-source-'+(world.finalPractice?'cultArena':'chapter3');mapMetrics.sourceStatus='missing-own-source';return;}
      if(world&&world.campaign&&world.bossIndex>=5){drawSinTerrain(world);return;}
      if(world&&world.campaign&&world.bossIndex>=3){drawExtendedTerrain(world);return;}
      if(usesConnected(world)){drawConnectedTerrain(world);return;}
      mapMetrics.terrainStatus='retained-v2';mapMetrics.sourceStatus='retained-v2';mapMetrics.visibleMapTiles='';mapMetrics.visibleMapCount=0;
      var anchored=!!(world&&(world.practiceBoss||world.boss||world.stage==='bossIntro'||world.stage==='boss'||world.stage==='transition'||world.stage==='won'));
      var journey=world?(anchored?45:clamp(world.time||0,0,45)):42;
      var index=Math.min(2,Math.floor(journey/15)),local=clamp((journey-index*15)/15,0,1),scroll=640*(1-local),mix=index<2?smooth((local-.84)/.16):0;
      if(world&&world.campaign){
        // Later encounters retain the three earlier verified pictures. The
        // connected corridor is only used for its forest-to-cave chapter.
        var encounter=clamp(world.bossIndex||0,0,2),wave=clamp(world.wave||0,0,2);
        local=anchored?1:clamp((world.waveTime||0)/(world.waveDuration||15),0,1);
        index=encounter===0?(anchored?2:wave):encounter===1?0:(anchored?1:[1,2,1][wave]);
        scroll=640*(1-local);mix=0;
        journey=(encounter===1?0:wave)*15+local*15;
        mapMetrics.campaignLocation=world.encounterName||world.bossName||null;
      }else mapMetrics.campaignLocation=null;
      ctx.fillStyle='#111722';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      ctx.drawImage(strips[index],0,scroll,W,H,0,0,W,H);
      if(mix>0){ctx.globalAlpha=mix;ctx.drawImage(strips[index+1],0,640,W,H,0,0,W,H);ctx.globalAlpha=1;}
      // Near tree trunks, broken walls and cave edges travel at a different rate.
      parallax(index,local,1-mix);if(mix>0)parallax(index+1,0,mix);
      ctx.drawImage(back,0,0);
      if(world&&world.campaign&&world.bossIndex>0){ctx.fillStyle=world.bossIndex===1?'rgba(9,45,40,.15)':'rgba(53,16,20,.12)';ctx.fillRect(0,0,W,H);}
      mapMetrics.zone=terrain[index].key;mapMetrics.zoneIndex=index;mapMetrics.segmentProgress=local;mapMetrics.journeyProgress=journey/45;mapMetrics.journeySeconds=journey;mapMetrics.scrollY=scroll;mapMetrics.anchored=anchored;
    }
    function drawRoute(world){
      if(world.stage!=='waves')return;
      ctx.save();ctx.globalAlpha=.85;
      if(world.campaign){
        var count=world.bossIndex===1?1:3,current=clamp(world.wave||0,0,count-1),span=(334-(count-1)*5)/count;
        for(var c=0;c<count;c++){var left=13+c*(span+5);ctx.fillStyle='rgba(170,181,201,.22)';ctx.fillRect(left,31,span,2);var amount=c<current?1:c===current?mapMetrics.segmentProgress:0;ctx.fillStyle='#9bcdd0';if(amount>0)ctx.fillRect(left,31,span*amount,2);}
        ctx.font='8px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#c4cccf';ctx.textAlign='left';ctx.fillText(world.encounterName||'기억의 길',14,46);ctx.textAlign='right';ctx.fillStyle='#97b4be';ctx.fillText((current+1)+' / '+count,346,46);ctx.restore();return;
      }
      var length=108;
      for(var i=0;i<3;i++){var x=13+i*113;ctx.fillStyle='rgba(170,181,201,.22)';ctx.fillRect(x,31,length,2);var progress=i<mapMetrics.zoneIndex?1:i===mapMetrics.zoneIndex?mapMetrics.segmentProgress:0;if(progress>0){ctx.fillStyle=i<mapMetrics.zoneIndex?'#b4adc9':'#9bcdd0';ctx.fillRect(x,31,length*progress,2);}}
      ctx.font='8px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#c4cccf';ctx.textAlign='left';ctx.fillText(terrain[mapMetrics.zoneIndex].label,14,46);ctx.textAlign='right';ctx.fillStyle='#97b4be';ctx.fillText('회랑 '+Math.round(mapMetrics.journeyProgress*100)+'%',346,46);ctx.restore();
    }
    function circle(x,y,r,stroke,width) {ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke();}
    function art(im,x,y,w,h,opacity) {if(imageReady(im)){ctx.globalAlpha=opacity==null?1:opacity;ctx.drawImage(im,x-w/2,y-h/2,w,h);ctx.globalAlpha=1;}}
    function polygon(points,fill,stroke,width){ctx.beginPath();for(var i=0;i<points.length;i++){if(i===0)ctx.moveTo(points[i][0],points[i][1]);else ctx.lineTo(points[i][0],points[i][1]);}ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke();}}
    function line(points,stroke,width){ctx.beginPath();for(var i=0;i<points.length;i++){if(i===0)ctx.moveTo(points[i][0],points[i][1]);else ctx.lineTo(points[i][0],points[i][1]);}ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke();}
    function dream(world){
      if(!world)return DREAMS[0];
      if(!world.campaign||world.bossIndex>=3)return null;
      var boss=clamp(world.bossIndex||0,0,2),wave=clamp(world.wave||0,0,2),anchored=mapMetrics.anchored;
      return DREAMS[boss===0?(anchored?2:wave):boss===1?3:4+(anchored?2:wave)];
    }
    function drawDreamscape(world,titleTime){
      var theme=dream(world);mapMetrics.dreamTheme=theme?theme.id:null;mapMetrics.ambientGlyphs=0;
      if(!theme)return;
      // Every moving decoration follows simulation time, so pause is exact.
      // Motifs live at the margins; none are collision or attack indicators.
      var t=world?(world.time||0):(titleTime||0),travel=mapMetrics.anchored?0:mapMetrics.segmentProgress*42,mapped=mapMetrics.terrainStatus==='connected-v1-verified';
      ctx.save();ctx.globalAlpha=mapped?.15:.23;ctx.fillStyle=theme.ink;ctx.fillRect(0,0,W,H);
      var veil=ctx.createLinearGradient(0,0,W,0);veil.addColorStop(0,theme.ink);veil.addColorStop(.20,'rgba(7,11,19,0)');veil.addColorStop(.80,'rgba(7,11,19,0)');veil.addColorStop(1,theme.ink);
      ctx.globalAlpha=.55;ctx.fillStyle=veil;ctx.fillRect(0,64,W,H-64);
      // A narrow quiet lane preserves contrast where the player reads gaps.
      var lane=ctx.createLinearGradient(0,0,W,0);lane.addColorStop(0,'rgba(7,10,18,0)');lane.addColorStop(.26,'rgba(7,10,18,.14)');lane.addColorStop(.74,'rgba(7,10,18,.14)');lane.addColorStop(1,'rgba(7,10,18,0)');
      ctx.globalAlpha=1;ctx.fillStyle=lane;ctx.fillRect(0,180,W,H-180);
      // Low-quality mode removes only non-interactive edge decoration; the
      // background grading, player, every bullet and every hazard stay intact.
      if(lightweight&&world){ctx.restore();return;}
      if(theme.id==='moonwood'){
        var moonX=world?285:270,moonY=world?104:146;
        ctx.globalAlpha=.16;ctx.fillStyle='#b0bcc6';ctx.beginPath();ctx.arc(moonX,moonY,30,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=.55;ctx.fillStyle=theme.ink;ctx.beginPath();ctx.arc(moonX-10,moonY-6,28,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=.12;line([[246,moonY+38],[302,moonY+38],[317,moonY+43]],theme.trim,.8);
      }
      for(var side=0;side<2;side++){
        var sign=side?-1:1,edge=side?W:0;
        function point(x,y){return [edge+sign*x,y];}
        if(!mapped||!(theme.motif==='root'||theme.motif==='web')){
        if(theme.motif==='root'){
          for(var root=0;root<4;root++){
            var y=97+root*150+travel*(root%2?1:.65),bend=30+Math.sin(root*3+side)*11;
            ctx.globalAlpha=.80;polygon([point(0,y-45),point(14,y-24),point(bend,y+20),point(25,y+88),point(9,y+120),point(0,y+136)],'#0d1420',null);
            ctx.globalAlpha=.25;line([point(5,y-35),point(20,y),point(bend+6,y+20),point(bend+21,y+14),point(bend+30,y-10)],theme.trim,.9);
            line([point(15,y+70),point(37,y+60),point(53,y+40)],theme.trim,.7);
            if(theme.id==='black-garden'){
              ctx.globalAlpha=.23;polygon([point(30,y+24),point(45,y+15),point(39,y+31),point(47,y+40),point(31,y+38)],theme.trim,null);
              ctx.globalAlpha=.28;line([point(18,y+50),point(24,y+46),point(29,y+50)],'#c7bda2',1.1);
            }
          }
        }else if(theme.motif==='web'){
          for(var web=0;web<3;web++){
            var wy=87+web*202+travel*.55;
            ctx.globalAlpha=.19;
            for(var thread=0;thread<5;thread++)line([point(0,wy-32),point(16+thread*11,wy+20+thread*14)],theme.trim,.65);
            for(var ring=1;ring<4;ring++){
              var points=[];for(var strand=0;strand<5;strand++)points.push(point((16+strand*11)*ring/4,wy-32+(52+strand*14)*ring/4));
              line(points,theme.trim,.6);
            }
            ctx.globalAlpha=.43;polygon([point(0,wy+92),point(14,wy+81),point(23,wy+118),point(10,wy+134),point(0,wy+129)],'#111320',null);
          }
        }else if(theme.motif==='water'){
          ctx.globalAlpha=.24;
          for(var ripple=0;ripple<9;ripple++){
            var ry=102+ripple*62+Math.sin(t*.35+ripple)*2,len=24+(ripple%3)*11;
            line([point(4,ry),point(len,ry),point(len+12,ry+3)],theme.trim,.65);
            line([point(3,ry+7),point(len*.7,ry+7)],theme.mist,1.2);
          }
          for(var reed=0;reed<5;reed++){
            var yy=143+reed*108+travel*.7,lean=Math.sin(t*.3+reed)*2;
            ctx.globalAlpha=.55;line([point(6,yy+32),point(22,yy+4),point(20+lean,yy-21)],'#132c2d',5);
            ctx.globalAlpha=.22;line([point(8,yy+31),point(24,yy+4),point(22+lean,yy-21)],theme.trim,.7);
            line([point(20,yy),point(34,yy-8),point(37,yy-21)],theme.trim,.6);
          }
        }else{
          // Crooked masonry stays outside the central 240px play-reading lane.
          for(var stone=0;stone<4;stone++){
            var sy=82+stone*157+travel*.6,height=104+(stone%2)*25;
            ctx.globalAlpha=.66;polygon([point(0,sy),point(20,sy-12),point(38,sy+8),point(33,sy+height),point(0,sy+height+21)],'#15151e',null);
            ctx.globalAlpha=.22;line([point(10,sy+height),point(17,sy+18),point(29,sy+8),point(34,sy+height-5)],theme.trim,.9);
            for(var seam=0;seam<3;seam++)line([point(4,sy+28+seam*26),point(32,sy+23+seam*26)],theme.trim,.55);
            if(theme.motif==='grave'){
              ctx.globalAlpha=.40;polygon([point(19,sy+90),point(22,sy+51),point(39,sy+38),point(51,sy+50),point(47,sy+94)],'#1e1c25',null);
              ctx.globalAlpha=.27;line([point(29,sy+77),point(31,sy+54),point(40,sy+49)],theme.trim,.8);
            }
          }
        }
        }
        // Sparse dust strokes look unlike the filled enemy bullet cores.
        for(var mote=0;mote<7;mote++){
          var mx=12+(mote*29+side*11)%42,my=72+((mote*89+t*(4+mote%3)+side*37)%548);
          ctx.globalAlpha=.12+(mote%3)*.03;line([point(mx,my),point(mx+1.6,my-3.2)],theme.mist,.75);mapMetrics.ambientGlyphs++;
        }
      }
      if(theme.motif==='chain'){
        // Exactly seven black pillars, four left and three right. Their low
        // contrast silhouettes do not imply solid terrain or safe corridors.
        var columns=[10,29,48,67,293,322,350];
        for(var pillar=0;pillar<7;pillar++){
          var px=columns[pillar],top=79+(pillar%3)*13,bottom=204+(pillar%2)*31;
          ctx.globalAlpha=.57;polygon([[px-7,top],[px-4,top-8],[px+5,top-5],[px+7,bottom],[px-8,bottom+2]],'#10131c',null);
          ctx.globalAlpha=.23;line([[px+4,top+7],[px+5,bottom-4]],theme.trim,.8);
        }
        ctx.globalAlpha=.21;
        for(var chain=0;chain<2;chain++)for(var link=0;link<9;link++){
          var cx=chain?W-19-link*2:19+link*2,cy=242+link*13+travel*.4;
          polygon([[cx,cy-4],[cx+3,cy],[cx+1,cy+6],[cx-3,cy+2]],null,theme.trim,.7);
        }
      }
      // Quiet manuscript-like border. It never tracks a bullet or a target.
      ctx.globalAlpha=.19;line([[7,72],[7,602],[19,614],[47,614]],theme.trim,.6);line([[353,72],[353,602],[341,614],[313,614]],theme.trim,.6);
      ctx.restore();
    }
    function tFor(world){return world.time||0;}
    function drawBossAccent(world){
      mapMetrics.bossAccent=null;
      if(!world.campaign||!world.boss||world.bossIndex>=5||world.stage==='bossIntro'||world.stage==='transition'&&world.transitionNarrative)return;
      var b=world.boss,info=bossIdentity(world),p=clamp(b.actionProgress||0,0,1),action=b.action||'recover';
      var strength=action==='charge'?.13+.15*p:action==='attack'?.25*(1-p*.7):.09;
      var r=action==='charge'?60-13*p:action==='attack'?48+p*15:53;
      mapMetrics.bossAccent=info.id+'-'+action;
      ctx.save();ctx.globalAlpha=strength;
      if(info.id==='violet'){
        // Bone-like silk facets around the upper-body pivot, never aimed.
        for(var silk=0;silk<8;silk++){
          var a=silk*Math.PI/4+.18,ax=Math.cos(a),ay=Math.sin(a);
          line([[b.x+ax*r*.63,b.y+ay*r*.48],[b.x+ax*r,b.y+ay*r*.70],[b.x+ax*(r+11),b.y+ay*(r+11)*.70]],info.tone,.8);
        }
      }else if(info.id==='horn'){
        line([[b.x-43,b.y+4],[b.x-49,b.y-13],[b.x-44,b.y-25]],info.tone,1);line([[b.x+43,b.y+4],[b.x+49,b.y-13],[b.x+44,b.y-25]],info.tone,1);
      }else if(info.id==='mask'){
        for(var feather=0;feather<6;feather++){var fa=feather*Math.PI/3+tFor(world)*.025;line([[b.x+Math.cos(fa)*(r-5),b.y+Math.sin(fa)*(r-5)*.7],[b.x+Math.cos(fa)*(r+5),b.y+Math.sin(fa)*(r+5)*.7]],info.tone,.8);}
      }else if(info.id==='lucifer'){
        for(var facet=0;facet<6;facet++){var ca=facet*Math.PI/3+.2,cx=b.x+Math.cos(ca)*r,cy=b.y+Math.sin(ca)*r*.7;polygon([[cx,cy-3],[cx+2,cy],[cx,cy+3],[cx-2,cy]],null,info.tone,.7);}
      }else{
        for(var ember=0;ember<7;ember++){
          var angle=Math.PI*1.05+ember*Math.PI*.15,rx=Math.cos(angle),ry=Math.sin(angle);
          polygon([[b.x+rx*(r-5),b.y+ry*(r-5)*.65],[b.x+rx*(r+7)-2,b.y+ry*(r+7)*.65],[b.x+rx*(r+13),b.y+ry*(r+13)*.65],[b.x+rx*(r+7)+2,b.y+ry*(r+7)*.65]],null,info.tone,.8);
        }
      }
      ctx.restore();
    }
    function bossIdentity(world){
      var b=world.boss||{},id=world.bossId||b.kind||'violet',palette=paletteFor(world);
      return {id:id,name:world.bossName||b.name||'보라검천사',artKey:b.artKey||(id==='violet'?'boss':id),tone:palette?palette.primary:id==='balrog'?'#eea47b':id==='horn'?'#9bd9b7':'#c9acd8'};
    }
    function bossPortrait(world,x,y,width,opacity){
      if(actorPresentation&&actorPresentation.drawBoss(ctx,world,x,y,width,opacity)){var actorMetrics=actorPresentation.getMetrics();mapMetrics.bossArt=actorMetrics.lastBossAsset||'actor-presentation';return;}
      var info=bossIdentity(world),b=world.boss||{},action=b.action||'recover',progress=clamp(b.actionProgress||0,0,1),lean=clamp(b.lean||0,-1,1);
      if(world.campaign&&world.bossIndex>=5){
        // New encounters require their own verified atlas. A missing form is
        // rejected at load time; never paint Balrog or a geometric silhouette
        // under another canonical name if a renderer is called directly.
        mapMetrics.bossArt='missing-own-source-'+info.id;return;
      }
      if(((global.HapilBossMotion&&global.HapilBossMotion.contracts[info.id])||info.id==='mask'||info.id==='lucifer')&&actorPresentation){
        var portraitWorld=Object.assign({},world,{stage:'boss',boss:{kind:info.id,action:'recover',actionProgress:1}});
        if(actorPresentation.drawBoss(ctx,portraitWorld,x,y,width,opacity)){mapMetrics.bossArt=info.artKey;return;}
      }
      mapMetrics.bossArt=info.artKey==='boss'?'existing-violet-art':'procedural-placeholder-'+info.id;
      if(info.artKey==='boss'){art(images.boss,x,y,width,width*132/230,opacity);return;}
      var rainPose=(world.phase||0)===1||((world.phase||0)===2&&progress>=.5);
      var key=info.id==='horn'?'horn':action==='attack'?(rainPose?'balrogRain':'balrogAttack'):'balrog';
      if(info.id==='balrog'&&(b.hitUntil||0)>(world.tick||0))key='balrogHit';
      var sprite=imageReady(images[key])?images[key]:images[info.id==='horn'?'horn':'balrog'];
      if(imageReady(sprite)){
        // Verified original 672x384 normalized poses share this source window
        // and pivot. Per-pose alpha cropping would make attacks jump in size.
        var poseScale=world.stage==='bossIntro'?1:action==='charge'?1-.025*progress:action==='attack'?1+.025*(1-progress):1;
        // Top padding and a 136px battle height keep the verified alpha top
        // below the HUD at y64, even at the largest attack breathing pose.
        var drawW=width*(136/230)*(352/368),drawH=width*(136/230)*poseScale;
        ctx.globalAlpha=opacity==null?1:opacity;
        ctx.drawImage(sprite,160,16,352,368,x-drawW/2,y-drawH/2,drawW,drawH);
        ctx.globalAlpha=1;mapMetrics.bossArt='existing-'+(sprite===images[key]?key:info.id);return;
      }
      // Temporary runtime silhouettes: existing canonical names/motifs, not
      // newly generated art and not the violet angel sprite relabelled.
      var scale=width/230,breath=Math.sin((world.phaseTime||0)*1.6)*1.4,pose=action==='charge'?-3*progress:action==='attack'?4*(1-progress):0;
      function pt(a,c){return [x+(a+lean*c*.035)*scale,y+(c+breath)*scale];}
      function shape(points,fill,stroke,line){polygon(points.map(function(p){return pt(p[0],p[1]);}),fill,stroke,(line||1)*scale);}
      ctx.save();ctx.globalAlpha=opacity==null?1:opacity;
      var tone=info.tone,body=info.id==='balrog'?'#30232a':'#233330';
      if(info.id==='balrog'){
        var wing=action==='charge'?10:action==='attack'?-6:2;
        shape([[-19,-21],[-51,-48-wing],[-91,-35-wing],[-71,-12],[-80,14],[-48,3],[-31,26],[-19,10]],'#25232d','#a16a69',1.1);
        shape([[19,-21],[51,-48-wing],[91,-35-wing],[71,-12],[80,14],[48,3],[31,26],[19,10]],'#25232d','#a16a69',1.1);
      }
      shape([[-18,-22],[-30,-9],[-27,22],[-18,38],[-21,52],[-6,51],[0,30],[8,51],[23,52],[18,35],[28,16],[28,-8],[18,-22]],body,tone,1.2);
      shape([[-14,-22],[-19,-34],[-11,-45],[10,-45],[19,-34],[13,-20]],body,tone,1.2);
      shape([[-12,-38],[-26,-48],[-31,-66],[-20,-57],[-14,-48]],'#a4a39a',tone,.8);
      shape([[12,-38],[26,-48],[31,-66],[20,-57],[14,-48]],'#a4a39a',tone,.8);
      shape([[-19,-12],[-34,-8-pose],[-46,16-pose],[-36,23-pose],[-24,7]],body,tone,1);
      shape([[19,-12],[34,-8+pose],[43,14+pose],[33,22+pose],[23,5]],body,tone,1);
      if(info.id==='balrog'){
        var reach=action==='attack'?20*(1-progress):action==='charge'?-11*progress:0;
        shape([[38,16],[45,12],[72+reach,-38-reach],[70+reach,-49-reach],[61+reach,-43-reach]],'#adadad','#f4c4a0',1);
        shape([[31,12],[48,23],[50,18],[34,8]],'#5d4b48','#c3a292',.8);
        shape([[-5,-16],[2,-10],[-4,-2],[5,8],[-1,18]],null,'#df8d70',1.4);
      }else{
        shape([[-9,0],[0,-9],[10,0],[0,12]],'#39554b','#a7dcc1',1);
      }
      ctx.strokeStyle=tone;ctx.lineWidth=2*scale;ctx.beginPath();var p=pt(-9,-32),q=pt(-3,-31);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);p=pt(3,-31);q=pt(9,-32);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.restore();
    }
    function titleScene(t) {
      ctx.save();ctx.globalAlpha=.25;
      for(var halo=0;halo<3;halo++){ctx.beginPath();ctx.arc(180,278,112+halo*9,Math.PI*1.05,Math.PI*1.95);ctx.strokeStyle=halo===1?'#b9a28b':'#8794ac';ctx.lineWidth=halo===1?.8:.5;ctx.stroke();}
      for(var ornament=0;ornament<7;ornament++){var angle=Math.PI*1.11+ornament*Math.PI*.13,ox=180+Math.cos(angle)*139,oy=278+Math.sin(angle)*139;polygon([[ox,oy-4],[ox+2,oy],[ox,oy+4],[ox-2,oy]],null,'#bbaa91',.7);}
      ctx.restore();
      if(imageReady(images.violetCutin))art(images.violetCutin,180,274+Math.sin(t*.6)*3,320,320,.84);
      else art(images.boss,180,268+Math.sin(t*.6)*3,365,209,.91);
      var glow=ctx.createRadialGradient(180,315,0,180,315,100);glow.addColorStop(0,'rgba(152,109,201,.09)');glow.addColorStop(1,'rgba(152,109,201,0)');ctx.fillStyle=glow;ctx.fillRect(75,210,210,210);
      for(var i=0;i<18;i++){var x=(i*79+17)%W,y=(i*113-t*(3+i%3))%H;if(y<0)y+=H;ctx.globalAlpha=.15+(i%4)*.05;ctx.fillStyle=i%3?'#b6a0db':'#8edee0';ctx.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);}ctx.globalAlpha=1;
    }
    function warningBoundary(h,palette) {
      var dx=h.x2-h.x1,dy=h.y2-h.y1,len=Math.hypot(dx,dy),inset=1.25,r=h.width/2-inset;
      // The entire contour remains inside the committed capsule. The dark
      // 2.5px keyline reaches its edge; the thin owner-coloured line sits
      // within it. Neither is a new damage body, forecast path or moving aim.
      ctx.save();ctx.translate((h.x1+h.x2)/2,(h.y1+h.y2)/2);ctx.rotate(Math.atan2(dy,dx));
      ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(-len/2,-r);ctx.lineTo(len/2,-r);
      ctx.arc(len/2,0,r,-Math.PI/2,Math.PI/2);ctx.lineTo(-len/2,r);ctx.arc(-len/2,0,r,Math.PI/2,Math.PI*1.5);ctx.closePath();
      ctx.globalAlpha=.9;ctx.strokeStyle='#080b12';ctx.lineWidth=2.5;ctx.stroke();
      ctx.globalAlpha=.9;ctx.strokeStyle=palette?palette.secondary:color(h.color);ctx.lineWidth=1.4;ctx.stroke();ctx.restore();
      var slot=mapMetrics.warningFootprintDraws++,record=warningFootprintPool[slot];
      if(!record){record=warningFootprintPool[slot]={};warningFootprintBuilds++;}
      record.id=h.id;record.x1=h.x1;record.y1=h.y1;record.x2=h.x2;record.y2=h.y2;record.width=h.width;
      record.boundaryInset=inset;record.boundaryDarkWidth=2.5;record.boundaryLightWidth=1.4;
      record.paletteId=palette?palette.id:null;record.activeAt=h.activeAt;record.damageGeometryOwnedByCore=true;
      warningFootprints.push(record);mapMetrics.warningFootprintBuilds=warningFootprintBuilds;
    }
    function drawHazards(world) {
      var hazards=world.hazards||[];
      for(var i=0;i<hazards.length;i++){
        var h=hazards[i];
        if(h.phase==='active'||h.phase==='fade'){
          // Damage bodies are entirely sampled source pixels. A missing asset
          // is blocked by encounter loading, never replaced with a plain line.
          if(projectilePresentation&&projectilePresentation.drawHazardBody)projectilePresentation.drawHazardBody(ctx,world,h,lightweight);
          continue;
        }
        var width=h.width||2,progress=clamp(h.progress||0,0,1),palette=paletteFor(world,h),tone=palette?palette.primary:color(h.color);
        ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(h.x1,h.y1);ctx.lineTo(h.x2,h.y2);
        // Dashed, harmless telegraphs retain the committed damage footprint.
        var grid=h.patternId==='boss-grid-v1';
        ctx.globalAlpha=grid?.24:.13;ctx.strokeStyle=tone;ctx.lineWidth=width;ctx.stroke();
        var floorScar=h.telegraphKind==='floor-scar';
        // The dark keyline uses this same committed path and stays inside its
        // warning footprint. It improves contrast on pale source paintings;
        // it is not a damaging beam, new aim line or a changed warning clock.
        ctx.globalAlpha=floorScar?.9:.76;ctx.strokeStyle='#080b12';ctx.lineWidth=Math.min(width,floorScar?3.8:3);ctx.stroke();
        mapMetrics.warningContrastStrokes++;
        ctx.globalAlpha=grid?.85:.66+progress*.22;ctx.setLineDash([7,7]);ctx.lineDashOffset=-progress*14;ctx.strokeStyle=palette?palette.secondary:color(h.color);ctx.lineWidth=floorScar?Math.min(width,1.5):grid?Math.min(width,2):1;ctx.stroke();
        ctx.restore();
        if(width>=18)warningBoundary(h,palette);
      }
    }
    function atlasReady(key){return imageReady(images[key])&&images[key].naturalWidth===512&&images[key].naturalHeight===512;}
    function atlasPhase(key,x,y,size,age,opacity){
      if(age<0||age>=.34||mapMetrics.atlasFxDraws>=mapMetrics.atlasFxLimit||!atlasReady(key))return;
      // Authored phases, not a looping flipbook or tweened duplicate frames.
      // The source contract is row-major 2x2, 256px, fixed central pivot.
      var frame=age<.06?0:age<.13?1:age<.22?2:3;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=opacity*(age>.22?1-(age-.22)*.5/.12:1);
      if(key==='fxArrow'){
        // Its authored arrow points right; orient the local cast toward the
        // upper playfield without changing the underlying sprite bytes.
        ctx.translate(x,y);ctx.rotate(-Math.PI/2);
        ctx.drawImage(images[key],(frame%2)*256,Math.floor(frame/2)*256,256,256,-size/2,-size/2,size,size);
      }else ctx.drawImage(images[key],(frame%2)*256,Math.floor(frame/2)*256,256,256,x-size/2,y-size/2,size,size);
      ctx.restore();
      mapMetrics.atlasFxDraws++;
      if((','+mapMetrics.atlasFxFamilies+',').indexOf(','+key+',')<0)mapMetrics.atlasFxFamilies+=(mapMetrics.atlasFxFamilies?',':'')+key;
    }
    function ownPlayerShot(world){
      var entry=global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(world),spec=entry&&entry.playerShot;if(!spec)return null;
      var im=images[spec.key];if(!imageReady(im)||im.naturalWidth!==spec.width||im.naturalHeight!==spec.height)return null;
      var crop=spec.crop||[0,0,spec.width,spec.height],key=spec.key+'|'+crop.join(',');
      if(key!==playerShotStampKey){
        if(playerShotStamp){playerShotStamp.width=1;playerShotStamp.height=1;}
        playerShotStamp=document.createElement('canvas');playerShotStamp.width=96;playerShotStamp.height=64;
        var pc=playerShotStamp.getContext('2d'),scale=Math.min(92/crop[2],60/crop[3]),dw=crop[2]*scale,dh=crop[3]*scale;
        pc.drawImage(im,crop[0],crop[1],crop[2],crop[3],(96-dw)/2,(64-dh)/2,dw,dh);playerShotStampKey=key;
      }return {spec:spec,canvas:playerShotStamp};
    }
    function drawStoryMemory(e,world){
      var entry=global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(world);if(!entry||!entry.playerShot)return false;
      var shot=ownPlayerShot(world),age=e.age||0,duration=Math.min(.4,e.ttl||.4);if(!shot||age<0||age>=duration||mapMetrics.atlasFxDraws>=mapMetrics.atlasFxLimit)return true;
      ctx.save();ctx.translate(e.x,e.y-10);ctx.rotate(-Math.PI/2);ctx.globalAlpha=(lightweight?.58:.68)*Math.min(1,(duration-age)/.08);ctx.drawImage(shot.canvas,-31,-21,62,42);ctx.restore();mapMetrics.atlasFxDraws++;return true;
    }
    function drawMemoryArrow8(e){
      var im=images.fxWindArrow8V6;
      if(!imageReady(im)||im.naturalWidth!==1024||im.naturalHeight!==512)return false;
      var age=e.age||0,duration=Math.min(.4,e.ttl||.4);
      if(age<0||age>=duration||mapMetrics.atlasFxDraws>=mapMetrics.atlasFxLimit)return true;
      // Drive combat-v2: eight authored phases, tip pivot (192,128), rightward.
      // Retimed once to the unchanged 400ms skill life; no looping or damage.
      var frame=Math.min(7,Math.floor(age/duration*8)),size=62,scale=size/256;
      ctx.save();ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=(lightweight?.54:.62)*Math.min(1,(duration-age)/.08);
      ctx.translate(e.x,e.y-10);ctx.rotate(-Math.PI/2);
      ctx.drawImage(im,(frame%4)*256,Math.floor(frame/4)*256,256,256,-192*scale,-128*scale,size,size);
      ctx.restore();mapMetrics.atlasFxDraws++;
      if((','+mapMetrics.atlasFxFamilies+',').indexOf(',fxWindArrow8V6,')<0)mapMetrics.atlasFxFamilies+=(mapMetrics.atlasFxFamilies?',':'')+'fxWindArrow8V6';
      return true;
    }
    function drawAuthoredEffect(e,world){
      if(!world.campaign)return false;
      if(e.kind==='memory'&&(drawStoryMemory(e,world)||drawMemoryArrow8(e)))return true;
      var key=null,size=72,age=e.age||0,y=e.y;
      if(e.kind==='memory'){key='fxArrow';size=62;y-=10;}
      else if(e.kind==='delayCharge'){key='fxThorns';size=68;}
      else if(e.kind==='delayBurst'){key='fxResonance';size=76;}
      else if(e.kind==='ego'){key='fxResonance';size=76;}
      else if(e.kind==='counter'){key='fxParry';size=72;}
      else if(e.kind==='bossCharge'&&(world.bossId==='violet'||world.bossIndex===0)){key='fxSilk';size=76;}
      if(!key||!atlasReady(key))return false;
      atlasPhase(key,e.x,y,size,age,lightweight?.54:.62);
      if(age<.22&&mapMetrics.atlasFxDraws<(lightweight?10:20)){
        var fade=Math.max(0,1-age/.22);ctx.save();ctx.globalAlpha=fade*.34;
        if(e.kind==='counter'){circle(e.x,e.y,17+age*36,'#f2d9a4',1);}
        else if(e.kind==='ego'){circle(e.x,e.y,19+age*30,'#b8e6e7',1);for(var ray=0;ray<4;ray++){var ra=ray*Math.PI/2+age*2;line([[e.x+Math.cos(ra)*14,e.y+Math.sin(ra)*14],[e.x+Math.cos(ra)*22,e.y+Math.sin(ra)*22]],'#d8c1ed',.9);}}
        else if(e.kind==='delayBurst'){circle(e.x,e.y,11+age*44,'#c8b5eb',.8);}
        else if(e.kind==='memory'){line([[e.x-8,e.y+6],[e.x,e.y-13-age*32],[e.x+8,e.y+6]],'#c6eee5',1);}
        ctx.restore();
      }
      // The proposal's 100ms layer delay is adapted to 60ms so both authored
      // phases finish within the unchanged core's 400ms counter effect life.
      if(e.kind==='counter')atlasPhase('fxSlash',e.x,e.y-5,60,age-.06,.46);
      // Once an authored effect expires or reaches the visual cap, do not
      // make a procedural fallback reappear underneath its fading last cell.
      return true;
    }
    function drawEffects(world) {
      var effects=world.effects||[];
      for(var i=0;i<effects.length;i++){
        var e=effects[i],life=Math.max(0,1-(e.age||0)/(e.ttl||.5)),r=e.r||10,p=1-life;
        if(drawAuthoredEffect(e,world))continue;
        ctx.globalAlpha=life*.65;
        if(e.kind==='memory'){
          for(var m=-1;m<=1;m++){var mx=e.x+m*(7+p*11),my=e.y-8-p*18;polygon([[mx,my-8],[mx+3,my-2],[mx+2,my+6],[mx-3,my+3]],null,'#a6e7ed',1);line([[mx-1,my-4],[mx+1,my+1]],'#cfc0e5',.7);}
          ctx.globalAlpha=life*.35;ctx.beginPath();ctx.arc(e.x,e.y-2,13+p*8,Math.PI*1.16,Math.PI*1.84);ctx.strokeStyle='#b9cbe5';ctx.lineWidth=.7;ctx.stroke();
        }else if(e.kind==='delayCharge'){
          var d=Math.min(r,38)*(1-.38*p);ctx.setLineDash([3,4]);circle(e.x,e.y,d,'#bea2e4',.85);ctx.setLineDash([]);
          for(var c=0;c<4;c++){var sx=c%2?-1:1,sy=c<2?-1:1;ctx.beginPath();ctx.moveTo(e.x+sx*(d-7),e.y+sy*d);ctx.lineTo(e.x+sx*d,e.y+sy*d);ctx.lineTo(e.x+sx*d,e.y+sy*(d-7));ctx.strokeStyle='#bfa6ec';ctx.lineWidth=1;ctx.stroke();}
          ctx.globalAlpha=life*.35;line([[e.x-3,e.y-7],[e.x+3,e.y],[e.x-3,e.y+7]],'#ded3ed',.8);
        }else if(e.kind==='delayBurst'){
          var spread=Math.min(r,38)*(.35+.65*p);circle(e.x,e.y,spread,'#b4dce9',.8);
          for(var n=0;n<6;n++){var angle=n*Math.PI/3+.48,ux=Math.cos(angle),uy=Math.sin(angle);polygon([[e.x+ux*spread*.4,e.y+uy*spread*.4],[e.x+ux*spread*.7-uy*2,e.y+uy*spread*.7+ux*2],[e.x+ux*spread,e.y+uy*spread],[e.x+ux*spread*.7+uy*2,e.y+uy*spread*.7-ux*2]],null,'#c4b9ed',.8);}
        }else if(e.kind==='counter'){
          ctx.beginPath();ctx.arc(e.x,e.y,14+p*12,Math.PI*1.06,Math.PI*1.94);ctx.strokeStyle='#dfd4a0';ctx.lineWidth=1.6;ctx.stroke();
          ctx.beginPath();ctx.arc(e.x,e.y+3,17+p*12,Math.PI*1.15,Math.PI*1.85);ctx.strokeStyle='#a5d5d0';ctx.lineWidth=.6;ctx.stroke();
          polygon([[e.x-11-p*9,e.y-8],[e.x-7-p*9,e.y-14],[e.x-4-p*9,e.y-8]],null,'#cce9de',1);
          polygon([[e.x+11+p*9,e.y-8],[e.x+7+p*9,e.y-14],[e.x+4+p*9,e.y-8]],null,'#cce9de',1);
        }else if(e.kind==='ego'){
          for(var k=0;k<6;k++){var a=k*Math.PI/3;ctx.beginPath();ctx.arc(e.x,e.y,20+p*8,a+.12,a+.65);ctx.strokeStyle='#c0efe3';ctx.lineWidth=1.2;ctx.stroke();}
          for(var leaf=0;leaf<4;leaf++){var ea=leaf*Math.PI/2+.78,ex=Math.cos(ea),ey=Math.sin(ea),er=18+p*10;polygon([[e.x+ex*er,e.y+ey*er],[e.x+ex*(er+5)-ey*2,e.y+ey*(er+5)+ex*2],[e.x+ex*(er+9),e.y+ey*(er+9)]],null,'#c8c1d7',.7);}
          ctx.beginPath();ctx.moveTo(e.x-17,e.y+8-p*20);ctx.lineTo(e.x-17,e.y-6-p*20);ctx.moveTo(e.x+17,e.y+8-p*20);ctx.lineTo(e.x+17,e.y-6-p*20);ctx.strokeStyle='#95d9d8';ctx.lineWidth=1;ctx.stroke();
        }else if(e.kind==='bossCharge'){
          ctx.globalAlpha=life*.25;
          for(var charge=0;charge<6;charge++){var ca=charge*Math.PI/3,cr=12+life*16;line([[e.x+Math.cos(ca)*cr,e.y+Math.sin(ca)*cr],[e.x+Math.cos(ca)*(cr+4),e.y+Math.sin(ca)*(cr+4)]],color(e.color),.8);}
        }else if(e.kind==='ring'||e.kind==='skill'){circle(e.x,e.y,r,color(e.color)||'#9bdde1',1.2);}
        else if(e.kind==='graze'){circle(e.x,e.y,4+(1-life)*9,'#a1f1ed',.8);}
        else {circle(e.x,e.y,r*(1.5-life),color(e.color)||'#d9c2ed',1);ctx.beginPath();ctx.moveTo(e.x-r,e.y);ctx.lineTo(e.x+r,e.y);ctx.moveTo(e.x,e.y-r);ctx.lineTo(e.x,e.y+r);ctx.strokeStyle='#d3c5e7';ctx.lineWidth=.8;ctx.stroke();}
      }ctx.globalAlpha=1;
    }
    function drawEnemies(world,time) {
      var enemies=world.enemies||[];
      function drawOne(e){
        var r=e.r||12;
        if(world.campaign&&e.age<0)return;
        var actorDrawn=actorPresentation&&actorPresentation.drawEnemy(ctx,world,e);
        if(world.campaign&&(e.summoned||world.bossIndex>=5)&&!actorDrawn)return;
        if(actorDrawn){/* Real verified actor pose drawn; shared HP and charge indicators follow. */}
        else if(world.campaign&&e.archetype==='wraith'){
          var drift=Math.sin((e.age||0)*2)*2,lean=clamp(e.lean||0,-1,1)*3;
          polygon([[e.x,e.y-18],[e.x+12+lean,e.y-6],[e.x+14,e.y+18+drift],[e.x+4,e.y+14],[e.x-4,e.y+20+drift],[e.x-15,e.y+16],[e.x-12+lean,e.y-5]],'#272d39','#a8becb',1);
          circle(e.x+lean*.4,e.y-7,4,'#d3d3dc',1);
        }else if(world.campaign&&e.archetype==='ember'){
          var pulse=e.action==='charge'?2:0;
          polygon([[e.x,e.y-18-pulse],[e.x+5,e.y-8],[e.x+15,e.y-10],[e.x+10,e.y+2],[e.x+17,e.y+11],[e.x+5,e.y+12],[e.x,e.y+18],[e.x-6,e.y+11],[e.x-16,e.y+12],[e.x-11,e.y+1],[e.x-15,e.y-10],[e.x-5,e.y-7]],'#392a31','#cf998b',1);
          circle(e.x,e.y,4,'#eac2a6',1.5);
        }else{
          var stretch=world.campaign?(e.action==='charge'?.94:e.action==='attack'?1.06:1+Math.sin((e.age||0)*4)*.018):1;
          art(images.spider,e.x,e.y,53/stretch,53*stretch,.95);
        }
        // Charging is communicated by the actor pose and the real projectile
        // or laser telegraph. Do not wrap enemies in a decorative hitbox ring.
        if(e.hp<e.maxHp){ctx.fillStyle='#272235';ctx.fillRect(e.x-15,e.y-r-8,30,2);ctx.fillStyle='#bd9de9';ctx.fillRect(e.x-15,e.y-r-8,30*Math.max(0,e.hp/e.maxHp),2);}
      }
      // Only boss-summoned support is drawn over the boss portrait. Ordinary
      // enemies keep their previous order; hazards/player remain above both.
      for(var i=0;i<enemies.length;i++)if(!enemies[i].summoned)drawOne(enemies[i]);
      drawCombatCopies(world);
      if(world.boss&&!(world.stage==='transition'&&world.transitionNarrative)){var b=world.boss;var opacity=b.opacity==null?1:b.opacity;bossPortrait(world,b.x,b.y,230,opacity);}
      for(var j=0;j<enemies.length;j++)if(enemies[j].summoned)drawOne(enemies[j]);
    }
    function drawCombatCopies(world){
      if(world.stage!=='boss'||!world.boss||!actorPresentation||!actorPresentation.drawCombatCopy)return;
      var copies=world.boss.combatCopies||[],tick=world.tick||0;
      // Core owns the two-projector budget, exact positions, lifetime and
      // release ticks. The cosmetic fade never moves an emitter or hides a
      // released projectile/laser; all real attacks are drawn above bodies.
      for(var i=0;i<Math.min(2,copies.length);i++){
        var copy=copies[i];if(!Number.isFinite(copy.born)||!Number.isFinite(copy.expireAt)||tick<copy.born||tick>=copy.expireAt)continue;
        var progress=clamp((tick-copy.born)/12,0,1),base=Number.isFinite(copy.opacity)?clamp(copy.opacity,.45,.85):copy.kind==='illusion'?.58:.72;
        var age=Number.isFinite(copy.releaseTick)&&copy.releaseTick>=0?tick-copy.releaseTick:Infinity,opacity=age>=0&&age<6?.92:base*(.4+.6*progress);
        if(actorPresentation.drawCombatCopy(ctx,world,copy,opacity))mapMetrics.combatCopyDraws++;
      }
    }
    function drawShots(world) {
      var shots=world.shots||[],entry=global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(world);
      if(entry&&entry.playerShot){
        var own=ownPlayerShot(world);if(!own)return;
        for(var si=0;si<shots.length;si++){var ss=shots[si],dw=own.spec.displayWidth||26,dh=dw*2/3;ctx.save();ctx.translate(ss.x,ss.y);ctx.rotate(Number.isFinite(ss.angle)?ss.angle:Math.atan2(ss.vy||-1,ss.vx||0));ctx.drawImage(own.canvas,-dw*.8,-dh/2,dw,dh);ctx.restore();mapMetrics.playerShotDraws++;}
        mapMetrics.playerShotAsset=own.spec.key;mapMetrics.playerShotCacheBytes=96*64*4;return;
      }
      var im=images.fxWindArrow8V6;
      if(!imageReady(im)||im.naturalWidth!==1024||im.naturalHeight!==512)return;
      for(var i=0;i<shots.length;i++){
        var s=shots[i],frame=Math.min(7,Math.floor(Math.max(0,s.age||0)*1000/80));
        // Existing player wind-arrow pixels, tip anchored to the simulated shot.
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Number.isFinite(s.angle)?s.angle:Math.atan2(s.vy||-1,s.vx||0));
        ctx.drawImage(im,(frame%4)*256+64,Math.floor(frame/4)*256+72,144,112,-128*22/144,-56*9/112,22,9);ctx.restore();
      }
    }
    function drawBullets(world) {
      var bullets=world.bullets||[];
      for(var i=0;i<bullets.length;i++)if(projectilePresentation)projectilePresentation.drawBullet(ctx,world,bullets[i],lightweight);
    }
    function drawPlayerBody(world,time) {
      var p=world.player,inv=(p.invulnerableUntil||0)>world.tick,ego=(p.egoUntil||0)>world.tick;
      if(ego)circle(p.x,p.y,25,'rgba(164,222,228,.45)',1);
      var story=global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(world);
      if(story&&story.player){if(actorPresentation&&actorPresentation.drawPlayer)actorPresentation.drawPlayer(ctx,world,inv?(.55+Math.sin(world.tick*.6)*.2):.95);return;}
      if(imageReady(images.gunner)){ctx.globalAlpha=inv?(.55+Math.sin(world.tick*.6)*.2):.95;ctx.drawImage(images.gunner,p.x-258.5369*57/512,p.y-283.8754*57/512,57,57);ctx.globalAlpha=1;}
    }
    function drawPlayerCore(world) {
      var p=world.player;
      ctx.beginPath();ctx.arc(p.x,p.y,(p.r||3)+1.7,0,Math.PI*2);ctx.fillStyle='#080e19';ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,p.r||3,0,Math.PI*2);ctx.fillStyle='#fff9e9';ctx.fill();ctx.strokeStyle='#8bdce2';ctx.lineWidth=.9;ctx.stroke();
    }
    function fittedText(text,maxWidth,size,minSize,family) {
      text=String(text||'');var fontSize=size,shown=text;ctx.save();
      ctx.font=fontSize+'px '+family;
      while(fontSize>minSize&&ctx.measureText(shown).width>maxWidth){fontSize--;ctx.font=fontSize+'px '+family;}
      if(ctx.measureText(shown).width>maxWidth){
        var chars=Array.from(shown);while(chars.length&&ctx.measureText(chars.join('')+'…').width>maxWidth)chars.pop();shown=chars.join('')+'…';
      }
      var result={text:shown,font:fontSize+'px '+family,maxWidth:maxWidth};ctx.restore();return result;
    }
    function combatReadability(world) {
      var warningCount=0,activeCount=0,fadeCount=0,nearestAt=Infinity,hazards=world.hazards||[];
      for(var hi=0;hi<hazards.length;hi++){
        var hazard=hazards[hi];
        if(hazard.phase==='warning'){warningCount++;if(Number.isFinite(hazard.activeAt)&&hazard.activeAt<nearestAt)nearestAt=hazard.activeAt;}
        else if(hazard.phase==='active')activeCount++;
        else if(hazard.phase==='fade')fadeCount++;
      }
      var ticks=nearestAt===Infinity?null:Math.max(0,nearestAt-(world.tick||0));
      var seconds=ticks===null?null:ticks/60,bulletCount=world.bullets?world.bullets.length:0,live=bulletCount+warningCount+activeCount;
      var timeout=Number.isFinite(world.phaseTimeout)?Math.max(0,world.phaseTimeout):75;
      var remaining=world.stage==='boss'?Math.max(0,timeout-Math.max(0,world.phaseTime||0)):null;
      var status='',kind='';
      if(world.stage==='transition'){
        kind=live?'residual-danger':'phase-change';
        status=live?'잔탄 회피 · 탄환 '+bulletCount+' / 광선 '+(warningCount+activeCount):'다음 기억 준비';
      }else if(activeCount){
        kind='laser-active';status='광선 활성 '+activeCount+(warningCount&&seconds!==null?' · 추가 예고 '+(Math.ceil(seconds*10)/10).toFixed(1)+'초':'');
      }else if(warningCount){
        kind='laser-warning';status=seconds===null?'광선 예고':ticks===0?'광선 발사 직전':'광선 예고 · '+(Math.ceil(seconds*10)/10).toFixed(1)+'초';
      }else if(bulletCount){kind='bullets';status='탄막 '+bulletCount+' · 흐름을 읽으세요';}
      else if(world.stage==='bossIntro'){kind='entrance';status='등장 · 잠시 뒤 전투';}
      else if(fadeCount){kind='laser-afterglow';status='광선 잔광 · 다음 공세 준비';}
      else {kind='preparing';status='다음 공세 준비';}
      return {phase:world.phase||0,remainingSeconds:remaining,warningLasers:warningCount,activeLasers:activeCount,fadingLasers:fadeCount,nearestWarningTicks:ticks,nearestWarningSeconds:seconds,enemyBullets:bulletCount,liveThreats:live,status:status,statusKind:kind,timerWarning:remaining!==null&&remaining<=15,geometryOwnedByCore:true};
    }
    function bossHud(world) {
      if(!world.boss || (world.stage!=='boss'&&world.stage!=='bossIntro'&&world.stage!=='transition'))return;
      var b=world.boss,readability=combatReadability(world);ctx.save();
      var info=bossIdentity(world),family='Arial,"Malgun Gothic",sans-serif',label=b.specialPatternLabel||world.patternName||'',health=String(b.healthLabel||'체력');
      if(!hudTextLayout||hudTextLayout.name!==info.name||hudTextLayout.label!==label||hudTextLayout.health!==health){
        hudTextLayout={name:info.name,label:label,health:health,nameFit:fittedText(info.name,254,9,8,family),labelFit:fittedText(label,220,9,8,family),healthFit:fittedText(health,93,8,7,family)};textLayoutBuilds++;
      }
      // All persistent information stays in the existing top HUD footprint.
      // No opaque panel remains in the middle of the bullet field.
      ctx.fillStyle='rgba(9,11,21,.86)';ctx.fillRect(13,19,334,45);
      ctx.textAlign='left';ctx.font=hudTextLayout.nameFit.font;ctx.fillStyle=info.tone;ctx.fillText(hudTextLayout.nameFit.text,19,31,254);
      ctx.textAlign='right';ctx.font='11px '+family;ctx.fillStyle=readability.timerWarning?'#ffd4a8':'#eee7dc';
      var remaining=readability.remainingSeconds,timerText=remaining===null?(world.stage==='bossIntro'?'등장':'전환'):(remaining<10?remaining.toFixed(1):String(Math.ceil(remaining)))+'초';
      ctx.fillText(timerText,341,31);
      ctx.textAlign='left';ctx.font=hudTextLayout.labelFit.font;ctx.fillStyle='#e6e1e9';ctx.fillText(hudTextLayout.labelFit.text,19,44,220);
      var action=world.stage==='transition'?'전환':world.stage==='bossIntro'?'등장':{move:'이동',charge:'준비',attack:'공격',recover:'회복'}[b.action]||'';
      ctx.textAlign='right';ctx.font='8px '+family;ctx.fillStyle='#c1b9bf';ctx.fillText(((world.phase||0)+1)+' / 3'+(action?' · '+action:''),341,44);
      ctx.textAlign='left';ctx.font='8px '+family;ctx.fillStyle=readability.activeLasers?'#ffe3c9':readability.warningLasers?'#d8e8f0':'#b6c2cf';ctx.fillText(readability.status,19,55,220);
      ctx.textAlign='right';ctx.font=hudTextLayout.healthFit.font;ctx.fillStyle='#bfc5d2';ctx.fillText(hudTextLayout.healthFit.text,341,55,93);
      ctx.fillStyle='#343047';ctx.fillRect(19,59,322,3);ctx.fillStyle=info.tone;ctx.fillRect(19,59,322*clamp(b.hp/b.maxHp,0,1),3);
      readability.box=[13,19,334,45];readability.timerText=timerText;readability.displayName=hudTextLayout.nameFit.text;readability.displayPattern=hudTextLayout.labelFit.text;readability.textLayoutBuilds=textLayoutBuilds;mapMetrics.battleReadability=readability;
      if(world.stage==='boss'&&b.specialPatternLabel){mapMetrics.specialPatternCue={id:b.specialPatternId||'',label:b.specialPatternLabel,displayLabel:hudTextLayout.labelFit.text,hint:String(b.patternHint||''),box:[19,35,220,12],hintRenderedInArena:false,hintLocation:null,damageGeometryOwnedByCore:true};}
      ctx.restore();
    }
    function bossEntrance(world){
      var progress=clamp((world.stageTime||0)/(world.bossIntroDuration||2.5),0,1);
      var enter=smooth(progress/.20),settle=smooth((progress-.72)/.28),envelope=enter*(1-settle);
      ctx.save();
      ctx.fillStyle='rgba(7,9,17,'+(.45*envelope)+')';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(5,7,13,'+(.84*envelope)+')';ctx.fillRect(0,0,W,30*envelope);ctx.fillRect(0,H-30*envelope,W,30*envelope);
      var targetY=world.boss&&Number.isFinite(world.boss.y)?world.boss.y:116,portraitW=620+(230-620)*settle,portraitY=(160+120*enter)+(targetY-280)*settle;
      var info=bossIdentity(world);
      if(world.campaign&&info.id==='violet'&&atlasReady('violetCutin')){
        // This is a static authored cut-in with a transform, not newly drawn
        // combat animation. Crossfade back to the existing combat pivot.
        if(settle<1){var cutinSize=320*(.8+.2*enter)*(1-.65*settle);art(images.violetCutin,180,268+(116-268)*settle,cutinSize,cutinSize,enter*(1-settle));}
        if(settle>0)bossPortrait(world,180,116,230,settle);
        mapMetrics.bossArt=settle<1?'existing-violet-cutin':'existing-violet-art';
      }else bossPortrait(world,180,portraitY,portraitW,enter);
      var caption=smooth((progress-.12)/.12)*(1-smooth((progress-.69)/.16));
      if(caption>0){ctx.globalAlpha=caption;ctx.fillStyle='rgba(8,10,18,.72)';ctx.fillRect(25,438,310,60);ctx.strokeStyle='rgba(205,185,221,.45)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(52,438);ctx.lineTo(308,438);ctx.stroke();ctx.textAlign='center';ctx.font='25px Georgia,"Batang","Malgun Gothic",serif';ctx.fillStyle='#eee4df';ctx.fillText(bossIdentity(world).name,180,478);}
      ctx.restore();
    }
    function transition(world) {
      if(world.stage!=='transition')return;
      if(world.finalPractice&&world.nextPhase===1&&imageReady(images.cultDriveStitch)&&images.cultDriveStitch.naturalWidth===512&&images.cultDriveStitch.naturalHeight===512){ctx.save();ctx.globalAlpha=.60;ctx.drawImage(images.cultDriveStitch,280,2,72,72);ctx.restore();}
      if(Array.isArray(world.transitionNarrative)&&world.transitionNarrative.length){
        // The bridge stays above the movable player lane (y260..614). Drawn
        // before hazards and bullets, it cannot conceal an uncleared attack.
        var page=clamp(Math.floor((world.stageTime||0)/3),0,world.transitionNarrative.length-1);
        ctx.save();ctx.fillStyle='rgba(7,10,20,.91)';ctx.fillRect(24,82,312,152);
        ctx.textAlign='left';ctx.font='14px Georgia,"Batang","Malgun Gothic",serif';ctx.fillStyle='#e6d2b4';
        ctx.fillText(world.stageLabel||'다음 기억으로',40,106);
        ctx.font='12px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#c7c6ce';
        var text=String(world.transitionNarrative[page]);
        if(!narrativeTextLayout||narrativeTextLayout.text!==text){
          var lines=[],lineText='';
          for(var ch of Array.from(text)){
            var next=lineText+ch;
            if(lineText&&(Array.from(next).length>32||ctx.measureText(next).width>278)){lines.push(lineText.trim());lineText=ch===' '?'':ch;}
            else lineText=next;
          }
          if(lineText)lines.push(lineText.trim());narrativeTextLayout={text:text,lines:lines};textLayoutBuilds++;
        }
        for(var li=0;li<narrativeTextLayout.lines.length;li++)ctx.fillText(narrativeTextLayout.lines[li],40,132+li*18);
        ctx.font='9px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#8e9aa7';ctx.textAlign='right';ctx.fillText((page+1)+' / '+world.transitionNarrative.length,320,221);
        ctx.restore();return;
      }
      if(world.campaign){
        if(world.bossIndex>=2&&world.nextEncounter!=null&&!world.bullets.length&&!world.hazards.length){
          ctx.save();ctx.fillStyle='rgba(7,10,20,.80)';ctx.fillRect(24,230,312,98);ctx.textAlign='center';ctx.fillStyle='#e6d2b4';ctx.font='16px Georgia,"Batang",serif';
          ctx.fillText(world.bossIndex>=5?'다음 검은 신호를 향해':world.bossIndex===2?'봉인 너머의 추락':'웃는 가면의 균열',180,263);ctx.font='11px Arial,"Malgun Gothic"';ctx.fillStyle='#b9c4cf';
          ctx.fillText(world.bossIndex>=5?'남은 탄막을 지나 다음 기억으로 이어집니다.':world.bossIndex===2?'눈을 뜬 곳은 낯선 병원 복도였습니다.':'완벽함의 약속 뒤에서, 루시퍼가 모습을 드러냅니다.',180,294);ctx.restore();return;
        }
        ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,world.transitionRemaining==null?1:world.transitionRemaining));ctx.fillStyle='rgba(10,11,21,.56)';ctx.fillRect(40,190,280,38);ctx.textAlign='center';ctx.font='10px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#d8c8e2';ctx.fillText(world.stageLabel||'남은 탄막이 지나갑니다',180,213);ctx.restore();return;
      }
      var t=world.transitionRemaining==null?1:world.transitionRemaining;ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,t));ctx.fillStyle='rgba(10,11,21,.65)';ctx.fillRect(20,273,320,70);ctx.textAlign='center';ctx.fillStyle='#d4c0ec';ctx.font='9px Arial,sans-serif';ctx.fillText('MEMORY RESONANCE',180,296);ctx.fillStyle='#e9e1e7';ctx.font='15px Georgia,"Batang",serif';ctx.fillText(world.patternName||'회랑의 문지기',180,323);ctx.restore();
    }
    function drawSpellTheatre(world){
      if(!world.campaign)return;
      if(world.stage==='transition'&&world.transitionNarrative)return;
      var b=world.boss,t=world.time||0;
      mapMetrics.specialPatternCue=null;
      if(b&&world.bossIndex>=3&&world.stage!=='bossIntro'){
        var phase=world.phase||0;
        if(world.bossIndex===4){
          // Small face plate and broken orbit: bounded above combat lane.
          var mx=b.x-2,my=b.y-20;ctx.save();ctx.globalAlpha=.85;
          polygon([[mx-7,my-6],[mx+7,my-6],[mx+9,my+2],[mx,my+11],[mx-9,my+2]],'#15192e','#cbbbe9',.8);
          ctx.fillStyle='#d9ecff';ctx.fillRect(mx-5,my-1,3,1);ctx.fillRect(mx+2,my-1,3,1);
          if(phase>0)line([[mx,my-6],[mx-2,my],[mx+2,my+3],[mx,my+10]],'#f2ccab',.7);
          ctx.restore();
        }
      }
      if(world.stage==='boss'&&world.phaseTime<1.1&&!(world.bullets&&world.bullets.length)&&!(world.hazards&&world.hazards.length)){
        var primary=String(world.patternName||''),extra=world.phase===2&&b?String(b.specialPatternLabel||''):'',entryTitle=primary+(extra&&extra!==primary?' · '+extra:'');
        if(!entryTextLayout||entryTextLayout.title!==entryTitle){entryTextLayout={title:entryTitle,fit:fittedText(entryTitle,296,13,10,'Georgia,"Batang","Malgun Gothic",serif')};textLayoutBuilds++;}
        var a=Math.min(1,world.phaseTime/.16,(1.1-world.phaseTime)/.25);ctx.save();ctx.globalAlpha=Math.max(0,a);
        ctx.fillStyle='rgba(12,14,28,.88)';ctx.fillRect(20,204,320,45);ctx.fillStyle='#c3af85';ctx.fillRect(20,204,2,45);
        ctx.textAlign='left';ctx.font='8px Arial';ctx.fillStyle='#b9aaca';ctx.fillText('MEMORY SIGN  /  '+(world.finalPractice?'FINAL':((world.bossIndex||0)+1))+'—'+(world.phase+1),32,219);
        ctx.font=entryTextLayout.fit.font;ctx.fillStyle='#eee1ce';ctx.fillText(entryTextLayout.fit.text,32,238,296);ctx.restore();
        mapMetrics.patternEntryCue={title:entryTitle,displayTitle:entryTextLayout.fit.text,box:[20,204,320,45],expiresAtPhaseSeconds:1.1,opacity:Math.max(0,a),suppressedByLiveThreats:true};
      }
      if(world.stage==='won'&&!world.practiceBoss&&world.bossIndex===4){
        ctx.save();ctx.globalAlpha=.42;circle(180,190,46,'#ead5aa',1.2);circle(180,190,53,'#b9dbed',.7);line([[180,158],[180,220],[159,178],[201,178]],'#f0e1ba',2);ctx.restore();
      }
    }
    function draw(world,alpha,time,lowQuality) {
      lightweight=!!lowQuality;mapMetrics.atlasFxLimit=lightweight?12:24;mapMetrics.specialPatternCue=null;mapMetrics.patternEntryCue=null;mapMetrics.battleReadability=null;mapMetrics.warningContrastStrokes=0;mapMetrics.warningFootprintDraws=0;mapMetrics.warningFootprintBuilds=warningFootprintBuilds;warningFootprints.length=0;mapMetrics.warningFootprints=warningFootprints;mapMetrics.combatCopyDraws=0;mapMetrics.playerShotDraws=0;mapMetrics.playerShotAsset=null;mapMetrics.playerShotCacheBytes=playerShotStamp?96*64*4:0;
      if(actorPresentation&&actorPresentation.beginFrame)actorPresentation.beginFrame();
      if(projectilePresentation&&projectilePresentation.beginFrame)projectilePresentation.beginFrame();
      if(bossSkillPresentation&&bossSkillPresentation.beginFrame)bossSkillPresentation.beginFrame();
      var sourceKey=h14TerrainKey(world),sourceReady=sourceKey&&readyTerrainImage(images,sourceKey);
      if(!cached&&!sourceReady&&!usesConnected(world)&&!(world&&world.campaign&&world.bossIndex>=3))makeBackground();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;drawTerrain(world);
      drawDreamscape(world,time);mapMetrics.bossAccent=null;mapMetrics.atlasFxDraws=0;mapMetrics.atlasFxFamilies='';
      mapMetrics.introActive=!!(world&&world.stage==='bossIntro');mapMetrics.introProgress=mapMetrics.introActive?clamp((world.stageTime||0)/(world.bossIntroDuration||2.5),0,1):0;
      if(!world||(!world.boss&&world.stage!=='bossIntro'))mapMetrics.bossArt=null;
      if(!world){titleScene(time||0);return;}
      if(world.stage==='bossIntro'){drawPlayerBody(world,world.time||0);bossEntrance(world);drawPlayerCore(world);return;}
      drawRoute(world);drawBossAccent(world);if(projectilePresentation&&projectilePresentation.drawBossCast)projectilePresentation.drawBossCast(ctx,world,lightweight);drawEffects(world);if(bossSkillPresentation)bossSkillPresentation.draw(ctx,world,lightweight);transition(world);if(actorPresentation&&actorPresentation.drawSceneObjects)actorPresentation.drawSceneObjects(ctx,world);drawEnemies(world,world.time||0);drawSpellTheatre(world);drawPlayerBody(world,world.time||0);drawShots(world);drawHazards(world);drawBullets(world);bossHud(world);
      if(world.reservation){ctx.save();ctx.font='8px Arial,"Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(167,224,227,.85)';ctx.fillText(typeof world.reservation==='string'?world.reservation:'스킬 준비 중',180,621);ctx.restore();}
      drawPlayerCore(world);
    }
    return {resize:function(cssW,cssH,dpr){ratio=Math.min(1.5,Math.max(1,dpr||1))*cssW/W;var nextWidth=Math.max(1,Math.round(W*ratio)),nextHeight=Math.max(1,Math.round(H*ratio));if(canvas.width!==nextWidth)canvas.width=nextWidth;if(canvas.height!==nextHeight)canvas.height=nextHeight;canvas.style.width='100%';canvas.style.height='100%';ctx.imageSmoothingEnabled=true;},draw:draw,getMetrics:function(){return Object.assign({},mapMetrics,{warningFootprints:warningFootprints.map(function(record){return Object.assign({},record);}),actorPresentation:actorPresentation?actorPresentation.getMetrics():null,projectilePresentation:projectilePresentation?projectilePresentation.getMetrics():null,bossSkillsPresentation:bossSkillPresentation?bossSkillPresentation.getMetrics():null});},destroy:function(){if(playerShotStamp){playerShotStamp.width=1;playerShotStamp.height=1;playerShotStamp=null;}playerShotStampKey=null;hudTextLayout=null;entryTextLayout=null;narrativeTextLayout=null;warningFootprints.length=0;warningFootprintPool.length=0;if(projectilePresentation&&projectilePresentation.destroy)projectilePresentation.destroy();if(bossSkillPresentation&&bossSkillPresentation.destroy)bossSkillPresentation.destroy();bossSkillPresentation=null;releaseSourceTerrain();cached=false;canvas.width=1;canvas.height=1;back.width=1;back.height=1;foreground.width=1;foreground.height=1;if(sinFloor){sinFloor.width=1;sinFloor.height=1;sinFloor=null;}sinFloorSource=null;sinFloorTone=null;for(var i=0;i<strips.length;i++){strips[i].width=1;strips[i].height=1;}strips.length=0;actorPresentation=null;projectilePresentation=null;images={};}};
  }
  global.HapilRenderer={create:create,terrainContracts:H14_TERRAIN,cultTerrainContracts:CULT_TERRAIN,chapter3TerrainContracts:CHAPTER3_TERRAIN,terrainAssetKeysForEncounter:terrainAssetKeysForEncounter,invalidTerrainAsset:invalidTerrainAsset};
})(typeof window!=='undefined'?window:globalThis);
