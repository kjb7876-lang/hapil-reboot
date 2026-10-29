/* Asset-only enemy projectiles. Simulation geometry belongs to core.js.
 * Drive source sprites are nine-slice fitted to the existing danger capsule.
 * Tinting preserves source alpha and luminance detail; no geometric backing,
 * stroke, fallback body, particle tail, or per-frame pixel processing is used.
 */
(function(global){
  'use strict';
  // Readable adaptations sampled from the retained boss sheets. Violet is the
  // only explicit color in a boss name, so its named purple wins. The other
  // palettes follow prominent image colors, then supporting image colors.
  var PALETTE_LIST=Object.freeze([
    Object.freeze({id:'violet',primary:'#b46ce0',secondary:'#ece0cf',accent:'#ad8752'}),
    Object.freeze({id:'horn',primary:'#b39a51',secondary:'#88944f',accent:'#c58252'}),
    Object.freeze({id:'balrog',primary:'#f46b2c',secondary:'#f4c55b',accent:'#78645e'}),
    Object.freeze({id:'mask',primary:'#d34b35',secondary:'#f0ddc4',accent:'#c7a054'}),
    Object.freeze({id:'lucifer',primary:'#be2442',secondary:'#eee0cf',accent:'#cea24c'}),
    // Readable adaptations of the actual retained Chapter-2 boss pixels.
    // The white-suited chairman's explicit named white takes precedence.
    Object.freeze({id:'belphegor',primary:'#b8a36f',secondary:'#ded5b5',accent:'#7e9865'}),
    Object.freeze({id:'leviathan',primary:'#43b7b6',secondary:'#d3d9d3',accent:'#6f7f92'}),
    Object.freeze({id:'beelzebub',primary:'#c79b52',secondary:'#ebd8b0',accent:'#87965c'}),
    Object.freeze({id:'asmodeus',primary:'#d24a4a',secondary:'#f4d9ca',accent:'#bc9363'}),
    Object.freeze({id:'mammon',primary:'#7985aa',secondary:'#e0bb65',accent:'#dfd6c7'}),
    Object.freeze({id:'wrath',primary:'#a8927c',secondary:'#f6a153',accent:'#d75a43'}),
    Object.freeze({id:'pride',primary:'#eee6d6',secondary:'#c9ad67',accent:'#76818c'})
  ]);
  var PALETTES=Object.freeze({violet:PALETTE_LIST[0],horn:PALETTE_LIST[1],balrog:PALETTE_LIST[2],mask:PALETTE_LIST[3],lucifer:PALETTE_LIST[4],belphegor:PALETTE_LIST[5],leviathan:PALETTE_LIST[6],beelzebub:PALETTE_LIST[7],asmodeus:PALETTE_LIST[8],mammon:PALETTE_LIST[9],wrath:PALETTE_LIST[10],pride:PALETTE_LIST[11]});
  var FX=Object.freeze({
    web:{key:'fxV8VioletWeb',frames:16,ms:80,pivot:[64,64],sample:4},
    silver:{key:'fxV8SilverSlash',frames:16,ms:40,pivot:[64,64],sample:4},
    ripple:{key:'fxV8SwampRipple',frames:16,ms:80,pivot:[64,274/3],sample:4},
    reed:{key:'fxV8Reed',frames:16,ms:50,pivot:[64,64],sample:4},
    ember:{key:'fxV8Ember',frames:16,ms:60,pivot:[64,64],sample:4},
    gold:{key:'fxV8GoldSlash',frames:8,ms:60,pivot:[64,64],sample:3},
    unlock:{key:'fxV8Unlock',frames:16,ms:80,pivot:[64,64],sample:4},
    vortex:{key:'fxV8Vortex',frames:16,ms:80,pivot:[64,64],sample:4}
  });
  var FAMILIES=[['web','silver'],['ripple','reed'],['ember','gold'],['unlock','gold'],['vortex','silver','unlock'],[],[],[],[],[],[],[]];
  var ORBS=[
    {key:'projectileVioletOrbV9',width:296,height:80,frames:4,ms:125,crop:[16,16,48,48],step:72,r:24,l:0},
    {key:'projectileHornOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileBalrogOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileMaskOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileLuciferOrbV9',width:296,height:80,frames:4,ms:125,crop:[16,16,48,48],step:72,r:24,l:0},
    // These are dense material crops from that boss's own approved static
    // attack source. They are not separate full-object flight animations.
    // Source alpha (250..253 in these interiors) is retained, never backed by
    // a generated shape. See SINS-PROJECTILE-SOURCES-20261029.json.
    {key:'projectileBelphegorV13',width:1254,height:1254,frames:1,crop:[453,448,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileLeviathanV13',width:1254,height:1254,frames:1,crop:[598,608,104,104],r:52,l:0,encounterMaterial:true},
    {key:'projectileBeelzebubV13',width:1254,height:1254,frames:1,crop:[434,635,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileAsmodeusV13',width:1254,height:1254,frames:1,crop:[810,278,148,148],r:74,l:0,encounterMaterial:true},
    {key:'projectileMammonV13',width:1295,height:1215,frames:1,crop:[461,419,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileWrathV13',width:1295,height:1214,frames:1,crop:[482,481,340,340],r:170,l:0,encounterMaterial:true},
    {key:'projectilePrideV13',width:1536,height:1024,frames:1,crop:[680,452,176,176],r:88,l:0,encounterMaterial:true}
  ];
  var BLADES=[
    {key:'projectileVioletBladeV10',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    {key:'projectileHornNeedleV11',width:128,height:64,frames:1,crop:[28,23,72,18],r:9,l:27},
    {key:'projectileBalrogBladeV10',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    {key:'projectileMaskNeedleV10',width:128,height:64,frames:1,crop:[28,23,72,18],r:9,l:27},
    {key:'projectileLuciferShardV11',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    ORBS[5],ORBS[6],ORBS[7],ORBS[8],ORBS[9],ORBS[10],ORBS[11]
  ];
  // Horn reed and Lucifer mask shard are static own-encounter source art.
  // The shard is a proposed ceramic material, not a canonical actor/body master.
  // Both are fitted to the existing core-owned capsule without changing damage.
  var CASTS=[
    {key:'castVioletV11',width:96,height:96},
    {key:'castHornV11',width:96,height:96},
    {key:'castBalrogV11',width:96,height:96},
    {key:'castMaskV11',width:96,height:96},
    {key:'castLuciferV11',width:96,height:96}
  ];
  // Individually generated transparent weapon/attack-material candidates.
  // Source crops trim faint detached alpha noise, never alter original bytes.
  // Mask's feather and Lucifer's shard are presentation motifs, not claims
  // that those bosses canonically carry a handheld weapon.
  var WEAPONS=[
    {key:'weaponVioletV12',width:1774,height:887,crop:[225,309,1323,296]},
    {key:'weaponHornV12',width:1774,height:887,crop:[66,264,1664,354]},
    {key:'weaponBalrogV12',width:1774,height:887,crop:[41,184,1689,522]},
    {key:'weaponMaskV12',width:1774,height:887,crop:[265,236,1309,448]},
    {key:'weaponLuciferV12',width:1254,height:1254,crop:[348,134,800,979]}
  ];
  var CACHE_LIMIT=96,CACHE_BYTES=4*1024*1024,SCALE=3,PAD=1,CELL=128;
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function slotForEncounter(i){return i===undefined||i===-1?0:Number.isInteger(i)&&i>=0&&i<ORBS.length&&ORBS[i]?i:-1;}
  function indexFor(w){return slotForEncounter(w&&w.bossIndex);}
  function paletteFor(w,b){var p=PALETTE_LIST[indexFor(w)];return p?(b&&b.paletteSlot===1?{id:p.id+'-secondary',primary:p.secondary,secondary:p.primary,accent:p.accent}:p):null;}
  function colorFor(w,b){var p=paletteFor(w,b);return p?p.primary:null;}
  function optionalAssetKeysForEncounter(i){return Number.isInteger(i)&&i>=0&&i<CASTS.length?[CASTS[i].key]:[];}
  function assetKeysForEncounter(i){
    var wi=slotForEncounter(i);if(wi<0)return [];var out=[ORBS[wi].key];
    if(BLADES[wi]&&out.indexOf(BLADES[wi].key)<0)out.push(BLADES[wi].key);
    if(Number.isInteger(i)&&i>=0&&WEAPONS[wi])out.push(WEAPONS[wi].key);
    out=out.concat(optionalAssetKeysForEncounter(i));
    FAMILIES[wi].forEach(function(name){if(name!=='unlock'&&out.indexOf(FX[name].key)<0)out.push(FX[name].key);});
    return out;
  }
  function ready(im,s){return !!(im&&im.complete!==false&&im.naturalWidth===(s.width||512)&&im.naturalHeight===(s.height||Math.ceil(s.frames/4)*CELL));}
  function invalidAssetForEncounter(images,i){var wi=slotForEncounter(i);if(wi<0)return 'unsupportedProjectileEncounter';var specs=[ORBS[wi]];if(BLADES[wi])specs.push(BLADES[wi]);if(Number.isInteger(i)&&i>=0&&WEAPONS[wi])specs.push(WEAPONS[wi]);for(var k=0;k<specs.length;k++)if(!ready(images&&images[specs[k].key],specs[k]))return specs[k].key;return null;}
  function capsule(ctx,x,y,r,l){
    ctx.beginPath();
    if(l>0){ctx.moveTo(x-l,y-r);ctx.lineTo(x+l,y-r);ctx.arc(x+l,y,r,-Math.PI/2,Math.PI/2);ctx.lineTo(x-l,y+r);ctx.arc(x-l,y,r,Math.PI/2,Math.PI*1.5);ctx.closePath();}
    else ctx.arc(x,y,r,0,Math.PI*2);
  }
  function rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function create(images){
    images=images||{};
    var cache=new Map(),cacheBytes=0,group=-1,metrics;
    function release(e){if(!e)return;if(e.canvases)e.canvases.forEach(function(c){c.width=1;c.height=1;});if(e.canvas){e.canvas.width=1;e.canvas.height=1;}}
    function clearCache(){cache.forEach(release);cache.clear();cacheBytes=0;}
    function beginFrame(){metrics={stampDraws:0,stampCacheMisses:0,stampCacheHits:0,stampCacheLimit:CACHE_LIMIT,stampCacheByteLimit:CACHE_BYTES,stampCacheBytes:cacheBytes,stampCacheEntries:cache.size,animatedBulletDraws:0,bodyAnimationPhases:0,suppressedUnapprovedFX:0,compactCastDraws:0,compactHazardDraws:0,assetLaserDraws:0,assetLaserSlices:0,signatureCastDraws:0,weaponVisualDraws:0,weaponTelegraphDraws:0,missingProjectileAssets:0,compactFamilies:{}};}
    function remember(key,e){
      if(e.bytes>CACHE_BYTES){release(e);return null;}
      while(cache.size&&(cache.size>=CACHE_LIMIT||cacheBytes+e.bytes>CACHE_BYTES)){var first=cache.keys().next().value,old=cache.get(first);cacheBytes-=old.bytes;release(old);cache.delete(first);}
      cache.set(key,e);cacheBytes+=e.bytes;return e;
    }
    function canvas(w,h){if(!global.document||!global.document.createElement)return null;var c=global.document.createElement('canvas');c.width=w;c.height=h;return c;}
    function textureFor(w,b){var wi=indexFor(w);return wi<0?null:b&&b.halfLength>0&&BLADES[wi]?BLADES[wi]:ORBS[wi];}
    function tintedArt(s,palette){
      var key='art|'+s.key+'|'+palette.id,e=cache.get(key);if(e)return e;
      var crop=s.crop,fw=crop[2],fh=crop[3],gutter=2,c=canvas((fw+gutter*2)*s.frames,fh+gutter*2);if(!c)return null;
      var ctx=c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      for(var f=0;f<s.frames;f++)ctx.drawImage(images[s.key],crop[0]+f*(s.step||0),crop[1],fw,fh,f*(fw+gutter*2)+gutter,gutter,fw,fh);
      // Recolor only existing authored pixels. Dark details and bright patches
      // remain source-controlled. No new opacity is introduced by tinting.
      var data=ctx.getImageData(0,0,c.width,c.height),d=data.data,p=rgb(palette.primary),q=rgb(palette.secondary),a=rgb(palette.accent);
      for(var i=0;i<d.length;i+=4){
        if(!d[i+3])continue;
        var lum=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255,isLucifer=palette.id.indexOf('lucifer')===0;
        // The eclipse source contains saturated blue petals: weighted luminance
        // alone treats them as dark. Preserve their authored value contrast as
        // ivory highlights while the dark iris remains readable crimson.
        var value=isLucifer?.85*Math.max(d[i],d[i+1],d[i+2])/255+.15*lum:lum;
        // Small static cast accents are sometimes exceptionally dark or pale.
        // Raise their existing pixels into the encounter's identity palette;
        // retain source alpha and source-value variation without adding a rim.
        var castValue=s.cast?Math.max(d[i],d[i+1],d[i+2])/255:0;
        var hi=s.cast?clamp((castValue-.5)/.5,0,1)*.28:s.encounterMaterial?clamp((lum-.52)/.48,0,1)*.55:isLucifer?clamp((value-.45)/.55,0,1)*.9:clamp((lum-.64)/.36,0,1)*.72;
        // Coal, steel and fabric contain dark source detail. Lift their own
        // pixels into the readable encounter palette without adding alpha,
        // contour strokes or an opaque replacement danger body.
        var mid=s.cast?.80+castValue*.35:s.encounterMaterial?.88+Math.min(lum,.75)*.55:isLucifer?1.15+Math.min(value,.64)*.35:.38+Math.min(lum,.64)*1.03;
        for(var j=0;j<3;j++)d[i+j]=clamp(Math.round(p[j]*mid*(1-hi)+q[j]*hi+(a[j]-p[j])*.045),0,255);
      }
      ctx.putImageData(data,0,0);
      return remember(key,{canvas:c,frameWidth:fw+gutter*2,frameHeight:fh+gutter*2,sourceWidth:fw,sourceHeight:fh,gutter:gutter,frames:s.frames,r:s.r,l:s.l,bytes:c.width*c.height*4});
    }
    // Crop caps from authored source art, scale their radii uniformly, and
    // stretch only the central band. Thus an orb can become a capsule without
    // elongating its cap or changing the authoritative damage silhouette.
    function slices(ctx,art,phase,x,y,r,l){
      var sw=art.sourceWidth,sh=art.sourceHeight,sr=art.r,sx=phase*art.frameWidth+art.gutter,sy=art.gutter;
      var cy=y-r,diameter=r*2;
      ctx.drawImage(art.canvas,sx,sy,sr,sh,x-l-r,cy,r,diameter);
      if(l>0){var band=sw-sr*2;ctx.drawImage(art.canvas,sx+sr-(band?0:.5),sy,band||1,sh,x-l,cy,l*2,diameter);}
      ctx.drawImage(art.canvas,sx+sw-sr,sy,sr,sh,x+l,cy,r,diameter);
    }
    function buildStamp(w,b,s,r,l){
      var art=tintedArt(s,paletteFor(w,b));if(!art)return null;
      var hx=l+r+PAD,hy=r+PAD,fw=Math.ceil(hx*2*SCALE),fh=Math.ceil(hy*2*SCALE),frames=[];
      // Separate frame surfaces preserve fractional-radius edge coverage and
      // permit one direct 5-argument drawImage per live bullet. A cropped frame
      // in a long strip was measurably expensive in native CPU Canvas.
      for(var phase=0;phase<s.frames;phase++){
        var c=canvas(fw,fh),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c,canvases:frames});return null;}
        ctx.save();capsule(ctx,hx*SCALE,hy*SCALE,r*SCALE,l*SCALE);ctx.clip();
        slices(ctx,art,phase,hx*SCALE,hy*SCALE,r*SCALE,l*SCALE);ctx.restore();frames.push(c);
      }
      return {canvases:frames,width:fw/SCALE,height:fh/SCALE,frameWidth:fw,frameHeight:fh,frameCount:s.frames,x:hx,y:hy,r:r,halfLength:l,bytes:fw*fh*s.frames*4};
    }
    // One small, bounded per-encounter cache is baked from the generated
    // source pixels; rotating it never changes physics or collision direction.
    function weaponSurface(w){
      var wi=indexFor(w),spec=WEAPONS[wi];if(!spec)return null;var key='weapon|'+spec.key,e=cache.get(key);
      if(e)return e;
      if(!ready(images[spec.key],spec))return null;
      var c=canvas(96,96),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      var crop=spec.crop,scale=84/Math.max(crop[2],crop[3]),dw=crop[2]*scale,dh=crop[3]*scale;
      ctx.drawImage(images[spec.key],crop[0],crop[1],crop[2],crop[3],(96-dw)/2,(96-dh)/2,dw,dh);
      return remember(key,{canvas:c,bytes:96*96*4});
    }
    function drawWeaponIcon(ctx,w,x,y,angle,size,alpha){
      var art=weaponSurface(w);if(!art)return false;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;
      ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(art.canvas,-size/2,-size/2,size,size);ctx.restore();return true;
    }
    function drawBullet(ctx,w,b,lowQuality){
      if(!w||!b||!finite(b.x)||!finite(b.y))return false;
      var wi=indexFor(w),weapon=WEAPONS[wi];
      if(b.kind==='boss-weapon'&&(!weapon||!ready(images[weapon.key],weapon))){metrics.missingProjectileAssets++;return false;}
      var s=textureFor(w,b);
      if(!s||!ready(images[s.key],s)){metrics.missingProjectileAssets++;return false;}
      var r=finite(b.r)&&b.r>0?b.r:3,l=finite(b.halfLength)?Math.max(0,b.halfLength):0;
      if(r>128||l>640)return false;
      if(group!==wi){clearCache();group=wi;}
      var key='body|'+s.key+'|'+r+'|'+l+'|'+paletteFor(w,b).id,e=cache.get(key);
      if(!e){e=buildStamp(w,b,s,r,l);if(!e)return false;e=remember(key,e);if(!e)return false;metrics.stampCacheMisses++;}else metrics.stampCacheHits++;
      var phase=s.frames>1?Math.min(s.frames-1,Math.floor(Math.max(0,finite(b.age)?b.age:0)*1000/s.ms)):0;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.translate(b.x,b.y);ctx.rotate(finite(b.angle)?b.angle:Math.atan2(b.vy||0,b.vx||0));
      ctx.drawImage(e.canvases[phase],-e.x,-e.y,e.width,e.height);ctx.restore();
      // The owner's opaque, authored ORB covers the actual r=11 damage body;
      // the separate transparent weapon is a cosmetic rotating layer on it.
      if(b.kind==='boss-weapon'&&drawWeaponIcon(ctx,w,b.x,b.y,finite(b.spinAngle)?b.spinAngle:0,34,1))metrics.weaponVisualDraws++;
      metrics.stampDraws++;metrics.animatedBulletDraws++;metrics.bodyAnimationPhases=Math.max(metrics.bodyAnimationPhases,e.frameCount);metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;return true;
    }
    function drawHazardBody(ctx,w,h,lowQuality){
      if(!w||!h||(h.phase!=='active'&&h.phase!=='fade')||![h.x1,h.x2,h.y1,h.y2,h.width].every(finite)||h.width<=0)return false;
      var s=textureFor(w,{halfLength:1});if(!s||!ready(images[s.key],s)){metrics.missingProjectileAssets++;return false;}
      var art=tintedArt(s,paletteFor(w,h));if(!art)return false;
      var dx=h.x2-h.x1,dy=h.y2-h.y1,len=Math.sqrt(dx*dx+dy*dy),r=h.width/2;
      var progress=clamp(h.progress||0,0,1),phase=s.frames>1?Math.min(s.frames-1,Math.floor(Math.max(0,finite(h.age)?h.age:0)*1000/s.ms)):0;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=h.phase==='active'?1:Math.max(0,1-progress)*.35;
      ctx.translate((h.x1+h.x2)/2,(h.y1+h.y2)/2);ctx.rotate(Math.atan2(dy,dx));capsule(ctx,0,0,r,len/2);ctx.clip();slices(ctx,art,phase,0,0,r,len/2);ctx.restore();
      metrics.assetLaserDraws++;metrics.assetLaserSlices+=len>0?3:2;return true;
    }
    function oneShot(ctx,s,elapsed,x,y,size,alpha){
      if(!ready(images[s.key],s)||!finite(elapsed)||elapsed<0||elapsed>=s.frames*s.ms||alpha<=0)return false;
      var frame=Math.floor(elapsed/s.ms),a=alpha*Math.min(1,elapsed/s.ms,(s.frames*s.ms-elapsed)/s.ms);if(a<=0)return false;
      size=Math.min(72,size);ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;
      ctx.drawImage(images[s.key],frame%4*CELL,Math.floor(frame/4)*CELL,CELL,CELL,x-s.pivot[0]*size/CELL,y-s.pivot[1]*size/CELL,size,size);ctx.restore();return true;
    }
    function drawBossCast(ctx,w,lowQuality){
      if(!w||!w.campaign||!w.boss||w.stage!=='boss')return;
      var b=w.boss,progress=clamp(b.actionProgress||0,0,1),wi=indexFor(w),names=FAMILIES[wi];if(wi<0||!names)return;
      var releaseAge=Number.isFinite(b.releaseTick)&&b.releaseTick>=0?w.tick-b.releaseTick:Infinity;
      if(b.action!=='charge'&&!(releaseAge>=0&&releaseAge<60))return;
      // The pair appears during this particular charge only; its retained art
      // previews the two actual throws and never replaces damage warnings.
      if(b.weaponTelegraph){
        var a=.55+.25*progress;
        if(drawWeaponIcon(ctx,w,b.x-36,b.y+38,-.45,27,a))metrics.weaponTelegraphDraws++;
        if(drawWeaponIcon(ctx,w,b.x+36,b.y+38,.45,27,a))metrics.weaponTelegraphDraws++;
      }
      // Static accents are purely decorative, underneath all actors, warnings,
      // and damage bodies; they never replace the existing damage telegraphs.
      // One image per frame, visible during charge or the 18 ticks following a
      // real owned-projectile/laser release. No new animated loop is implied.
      var cast=CASTS[wi],fade=b.action==='charge'?.25+.45*progress:(releaseAge<18?.70*(1-releaseAge/18):0);
      if(fade>0&&cast&&ready(images[cast.key],cast)){
        var source=images[cast.key];
        if(wi!==2){
          // Recolor existing pixels once to boss-derived colors. The Lucifer
          // ring uses its blue-value-aware tint; the dim Horn and faint Violet/
          // Mask accents use a readable decorative tint, preserving source alpha.
          var recolored=tintedArt({key:cast.key,width:96,height:96,frames:1,crop:[0,0,96,96],r:48,l:0,cast:wi!==4},PALETTE_LIST[wi]);
          source=recolored&&recolored.canvas;
        }
        if(source){var size=lowQuality?60:72;ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=fade;
          ctx.drawImage(source,b.x-size/2,Math.max(88,b.y+70)-size/2,size,size);ctx.restore();metrics.signatureCastDraws++;
          metrics.compactFamilies[cast.key]=(metrics.compactFamilies[cast.key]||0)+1;}
      }
      var name=b.action==='charge'?names[0]:wi===4&&w.phase===2?'unlock':names[1];if(name==='unlock'){metrics.suppressedUnapprovedFX++;return;}
      var s=FX[name];if(!s||!ready(images[s.key],s))return;
      var elapsed=b.action==='charge'?progress*900:releaseAge*1000/60;
      if(oneShot(ctx,s,elapsed,b.x,Math.max(88,b.y+24),lowQuality?60:72,b.action==='charge'?.48:.7)){metrics.compactCastDraws++;metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;}
    }
    function drawHazardDecoration(ctx,w,h,lowQuality){return false;}
    beginFrame();
    return {beginFrame:beginFrame,drawBullet:drawBullet,drawBossCast:drawBossCast,drawHazardBody:drawHazardBody,drawHazardDecoration:drawHazardDecoration,
      getMetrics:function(){return Object.assign({},metrics,{projectileTextureLimit:768,projectileTextureDraws:metrics.stampDraws,texturedBullets:metrics.stampDraws,projectileTailDraws:0,bossCastDraws:metrics.compactCastDraws+metrics.signatureCastDraws,hazardEmitterDraws:0,stampCacheEntries:cache.size,stampCacheBytes:cacheBytes,compactFamilies:Object.assign({},metrics.compactFamilies)});},
      destroy:function(){clearCache();images={};}};
  }
  global.HapilProjectiles=Object.freeze({create:create,palettes:PALETTES,paletteList:PALETTE_LIST,paletteFor:paletteFor,assetKeysForEncounter:assetKeysForEncounter,optionalAssetKeysForEncounter:optionalAssetKeysForEncounter,invalidAssetForEncounter:invalidAssetForEncounter,colorFor:colorFor,compactFX:FX});
})(typeof window!=='undefined'?window:globalThis);
