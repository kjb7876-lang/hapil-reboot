/* 합일 v41 · ARCADE 탄막 모드 — 화면·입력·소리.
 * 시뮬레이션은 arcade-v38.js가 맡고, 여기서는 그 상태를 읽어 그리기만 한다.
 * 글은 스테이지 이름 한 줄과 패턴 이름 한 줄만 띄운다. */
(function(global){
  'use strict';
  var Arcade=global.HapilArcade,W=Arcade.WIDTH,H=Arcade.HEIGHT,TAU=Math.PI*2;
  var $=function(id){return document.getElementById(id);};
  var canvas=$('arcade-canvas'),ctx=canvas.getContext('2d');
  // 탄 색 여섯 가지(시뮬레이션의 색 번호 0·2·4·5·6·8). 속은 단색, 테두리는 밝게.
  var COLORS={0:'#ff3b4e',2:'#a45cff',4:'#2fd0ff',5:'#3fdc82',6:'#ffd23e',8:'#e9e9ff'};
  var STAGE_COLOR=['#b77bff','#ff8a8a','#ffd86a','#6fd8ff','#d9c8ff','#6fd8ff','#e6e0ff','#6fd8ff','#ff8a8a'];
  // 화면에 그릴 키(픽셀). 인물과 몹의 그림은 media/arcade-v41/<키>.webp 한 장씩이다.
  var TALL={violet:112,balrog:124,mask:112,lucifer:124,asmodeus:108,pride:118,controller:118,goblin:104,insomnia:124,arbelia:108,siren:124,chief:124,executor:124,rian:108,cultist:124,
    spider:30,slime:28,ember:34,drone:26,mobgoblin:36,wolf:34,nightmare:40,collector:40,leech:34,guardian:62,warden:72,horn:84,belphegor:70,mammon:74,knight:80};
  var PROP_LONG={'sword-violet':68,cleaver:64,'sword-balrog':72,obelisk:80,spire:72,'twin-blade':62,crescent:58,tissue:34,money:36,heel:40,feather:44,cross:60,gear:56};
  var PROP_GLOW={'sword-violet':2,cleaver:5,'sword-balrog':0,obelisk:2,spire:4,'twin-blade':8,crescent:4,tissue:6,money:6,heel:0,feather:8,cross:6,gear:4};
  var ART_DIR='media/arcade-v41/';
  var SERIF='"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var SLOW_FRAME_MS=21,VERY_SLOW_FRAME_MS=28,MAX_PARTICLES=320,FINGER_LIFT=64;
  var SHAPE_RICE=3,SHAPE_BUBBLE=4,SHAPE_PROP=Arcade.SHAPE_PROP;
  var NOTES={gentle:'목숨 7 · 폭탄 3 · 맵마다 전부 회복 · 느린 탄 · 아주 작은 피격점',normal:'목숨 3 · 폭탄 2 · 맵마다 1 회복',hell:'목숨 1 · 폭탄 1 · 회복 없음 · 빽빽한 탄 · 격자 광선 동시'};

  var images={},loading={},orbs=[],shotSprite=null,homingSprite=null,circleSprite=null,itemSprites=[],background=null,backgroundStage=-1,loadedStage=-1;
  var scale=1,lite=false,frameMs=16,framesSeen=0,offsetX=0,offsetY=0;
  var state=null,mode='title',difficulty='normal',accumulator=0,lastStamp=0,visual=0;
  var particles=[],flash=0,hurtFlash=0,shake=0,shock=null,banner=0,bannerTitle='',bannerSub='';
  var keys={},finger={active:false,id:null,x:0,y:0},focusHeld=false,bombQueued=false;
  var fx=null,music=null,soundOn=true,best=0,lastItemSound=0;
  var compact=!!(global.matchMedia&&global.matchMedia('(pointer:coarse)').matches)||global.innerWidth<520;

  function finite(v,fallback){return v===v&&v!==Infinity&&v!==-Infinity?v:fallback;}
  function offscreen(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
  function loadImage(key,ext){
    if(images[key]||loading[key])return;loading[key]=true;
    var img=new Image();img.onload=function(){images[key]=img;delete loading[key];if(key.indexOf('bg-')===0)backgroundStage=-1;};img.onerror=function(){delete loading[key];};img.src=key==='gunner'?'media/gunner.webp':ART_DIR+key+(ext||'.webp');
  }
  function stageKeys(index){var g=Arcade.STAGES[index],list=['bg-'+g.bg];Arcade.SEGMENTS.forEach(function(seg){if(seg.stage===index&&seg.kind==='card'&&list.indexOf(seg.actor)<0)list.push(seg.actor);});return list.concat(g.cast);}
  /* 스테이지 그림은 그 스테이지에 들어설 때 한 번만 받는다. 이미 받은 그림은 다시 받지 않는다. */
  function loadStage(index){
    if(index===loadedStage||!Arcade.STAGES[index])return;
    if(loadedStage>=0)releaseStage(loadedStage,index);
    loadedStage=index;stageKeys(index).forEach(function(key){loadImage(key,key.indexOf('bg-')===0?'.jpg':'.webp');});
  }
  /* 지난 스테이지의 그림과 배경 캔버스를 버린다. 다음 스테이지에서도 쓰는 그림은 남긴다. */
  function releaseStage(index,next){
    var keep=next>=0?stageKeys(next):[];
    stageKeys(index).forEach(function(key){if(keep.indexOf(key)<0)delete images[key];});
    if(background){background.width=background.height=0;background=null;}backgroundStage=-1;
  }
  /* 구슬탄 한 장: 옅은 빛무리 → 단색 속 → 밝은 테두리. 색 6 × 모양을 미리 그려 두고 찍기만 한다. */
  function buildOrb(radius,color){
    var reach=radius*(lite?1.2:1.9),c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale,grad;
    if(!lite){grad=g.createRadialGradient(m,m,r*.8,m,m,reach*scale);grad.addColorStop(0,color+'77');grad.addColorStop(1,color+'00');g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);}
    g.fillStyle=color;g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.strokeStyle='#ffffff';g.lineWidth=Math.max(1,r*.26);g.beginPath();g.arc(m,m,r-g.lineWidth/2,0,TAU);g.stroke();
    return {image:c,half:reach};
  }
  // 쌀알탄: 오른쪽(진행 방향)으로 길쭉한 알. 그릴 때 탄의 각도로 돌린다.
  function buildRice(radius,color){
    var longHalf=radius*2.6,reach=longHalf+3,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale;
    g.translate(m,m);g.scale(scale,scale);
    g.fillStyle='#ffffff';g.beginPath();g.ellipse(0,0,longHalf,radius,0,0,TAU);g.fill();
    g.fillStyle=color;g.beginPath();g.ellipse(0,0,longHalf-1.3,radius-1.1,0,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  // 거품: 속이 비치는 큰 방울
  function buildBubble(radius,color){
    var reach=radius*1.2,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale;
    g.fillStyle=color+'66';g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.strokeStyle='#ffffff';g.lineWidth=Math.max(1.5,r*.12);g.beginPath();g.arc(m,m,r-g.lineWidth/2,0,TAU);g.stroke();
    g.fillStyle=color;g.beginPath();g.arc(m,m,r*.3,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  function buildSprites(){
    var grow=state?state.sizeScale:compact?1.25:1;
    orbs=[];Arcade.SIZE_RADIUS.forEach(function(radius,size){if(size===SHAPE_PROP)return;orbs[size]={};Arcade.PALETTE.forEach(function(index){var color=COLORS[index],r=radius*grow;orbs[size][index]=size===SHAPE_RICE?buildRice(r,color):size===SHAPE_BUBBLE?buildBubble(r,color):buildOrb(r,color);});});
    var c=offscreen(8*scale,26*scale),g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,c.height);
    grad.addColorStop(0,'#ffffff');grad.addColorStop(.35,'#9fefff');grad.addColorStop(1,'#35d6ff00');g.fillStyle=grad;g.beginPath();g.ellipse(c.width/2,c.height/2,c.width*.32,c.height/2,0,0,TAU);g.fill();shotSprite=c;
    homingSprite=buildOrb(3,'#7df3ff');
    // 아이템: 점수(푸른 마름모)와 폭탄 조각(초록 마름모)
    itemSprites=['#7fb8ff','#7dffb0'].map(function(color){var d=offscreen(14*scale,14*scale),q=d.getContext('2d');q.scale(scale,scale);q.translate(7,7);q.rotate(Math.PI/4);q.fillStyle=color;q.fillRect(-4,-4,8,8);q.strokeStyle='#ffffff';q.lineWidth=1.2;q.strokeRect(-4,-4,8,8);return d;});
    // 보스 뒤 마법진: 동심원 셋 + 눈금 + 육각별
    c=offscreen(220*scale,220*scale);g=c.getContext('2d');g.scale(scale,scale);g.translate(110,110);g.strokeStyle='#ffffff';g.lineWidth=1.6;
    [104,92,60].forEach(function(r){g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();});
    g.lineWidth=1;for(var i=0;i<36;i++){var a=TAU*i/36;g.beginPath();g.moveTo(Math.cos(a)*92,Math.sin(a)*92);g.lineTo(Math.cos(a)*(i%3?98:104),Math.sin(a)*(i%3?98:104));g.stroke();}
    for(var k=0;k<2;k++){g.beginPath();for(var j=0;j<3;j++){var b=TAU*j/3+k*Math.PI/3-Math.PI/2;g[j?'lineTo':'moveTo'](Math.cos(b)*92,Math.sin(b)*92);}g.closePath();g.stroke();}
    circleSprite=c;
  }
  // 배경은 탄보다 어둡고 흐리게: 줄인 원화를 키워 그리고 어둡게 누른 뒤 가장자리를 더 어둡게 한다.
  function buildBackground(index){
    var img=images['bg-'+Arcade.STAGES[index].bg];if(!img)return;
    if(background){background.width=background.height=0;}
    var c=offscreen(W,H+160),g=c.getContext('2d');g.filter='blur(1.5px)';g.drawImage(img,0,0,c.width,c.height);g.filter='none';
    g.fillStyle='rgba(5,5,14,.7)';g.fillRect(0,0,c.width,c.height);
    var v=g.createRadialGradient(W/2,c.height/2,160,W/2,c.height/2,480);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=v;g.fillRect(0,0,c.width,c.height);
    background=c;backgroundStage=index;
  }
  function fit(){
    var dpr=Math.min(2,global.devicePixelRatio||1),next=lite?1:Math.max(1,dpr);
    if(next!==scale||!orbs.length||canvas.width!==W*next){scale=next;canvas.width=W*scale;canvas.height=H*scale;buildSprites();}
    var stage=$('arcade-stage'),room=stage.getBoundingClientRect(),k=Math.min(room.width/W,room.height/H);
    canvas.style.width=Math.floor(W*k)+'px';canvas.style.height=Math.floor(H*k)+'px';
  }
  // 느린 기기에서는 먼저 해상도를, 그래도 느리면 빛무리를 내린다.
  function adaptQuality(elapsedMs){
    frameMs+=(Math.min(80,elapsedMs)-frameMs)*.05;framesSeen++;
    if(framesSeen<150||mode!=='playing')return;
    if(frameMs>VERY_SLOW_FRAME_MS&&!lite){lite=true;framesSeen=0;frameMs=16;fit();buildSprites();}
    else if(frameMs>SLOW_FRAME_MS&&scale>1){scale=1;canvas.width=W;canvas.height=H;buildSprites();framesSeen=0;frameMs=16;}
  }

  function themeColor(s){return STAGE_COLOR[s.stageIndex];}
  function play(name,x){if(fx&&soundOn)fx.play(name,x===undefined?0:Math.max(-1,Math.min(1,(finite(x,W/2)/W-.5)*1.4)));}
  function addParticle(x,y,vx,vy,life,color,size){if(particles.length<MAX_PARTICLES)particles.push({x:x,y:y,vx:vx,vy:vy,life:life,max:life,color:color,size:size});}
  function showBanner(title,sub){banner=1;bannerTitle=title;bannerSub=sub;}
  function consume(){
    var s=state,i,k;
    for(i=0;i<s.cancelled.length;i+=3)addParticle(s.cancelled[i],s.cancelled[i+1],0,-.5,22+(i%9),COLORS[s.cancelled[i+2]]||'#ffffff',5);
    s.cancelled.length=0;
    for(i=0;i<s.pops.length;i+=3){var big=s.pops[i+2];for(k=0;k<(big?14:6);k++){var a=TAU*k/(big?14:6);addParticle(s.pops[i],s.pops[i+1],Math.cos(a)*(big?3.4:2.2),Math.sin(a)*(big?3.4:2.2),big?26:16,k%2?'#ffffff':themeColor(s),big?7:4);}if(big)shake=Math.max(shake,6);}
    s.pops.length=0;
    for(i=0;i<s.events.length;i++){
      var e=s.events[i];
      if(e==='graze'){play('graze',s.player.x);addParticle(s.player.x,s.player.y,(Math.random()-.5)*5,(Math.random()-.5)*5,12,'#ffffff',2);}
      else if(e==='bossHit'||e==='bossHitLow')play(e,s.boss.x);
      else if(e==='kill')play('kill',s.player.x);
      else if(e==='item'){if(visual-lastItemSound>.06){lastItemSound=visual;play('item',s.player.x);}}
      else if(e==='hurt'){play('hurt',s.player.x);hurtFlash=1;shake=14;}
      else if(e==='bomb'){play('bomb',s.player.x);flash=.55;shock={x:s.player.x,y:s.player.y,r:10};shake=10;}
      else if(e==='card'){play('charge',s.boss.x);showBanner(Arcade.SEGMENTS[s.seg].name,s.boss.name);}
      else if(e==='wave'){if(Arcade.STAGES[s.stageIndex].first===s.seg){showBanner(Arcade.STAGES[s.stageIndex].name,'STAGE '+(s.stageIndex+1));play('seal');}}
      else if(e==='map')loadStage(s.stageIndex);
      else if(e==='entrance')play('warning');
      else if(e==='break'){play('phaseBreak',s.boss.x);flash=.6;shock={x:s.boss.x,y:s.boss.y,r:10};shake=8;}
      else if(e==='capture'||e==='bombGain'||e==='extend')play('seal');
      else if(e==='waveClear'){play('phaseBreak');flash=.3;}
      else if(e==='win'){play('win');flash=1;finish();}
      else if(e==='lose'){play('lose');finish();}
      else if(e==='countdown'||e==='countdownLast')play(e);
      else if(e==='laserWarn')play('laserWarn',s.boss.x);
      else if(e==='laserFire'){play('laserFire',s.boss.x);shake=Math.max(shake,5);}
      else if(e==='pop')play('skillCounter',s.boss.x);
    }
    s.events.length=0;
  }

  function drawBackground(s){
    if(backgroundStage!==s.stageIndex)buildBackground(s.stageIndex);
    if(!background||backgroundStage!==s.stageIndex){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);return;}
    // 아래로 흐르는 배경: 같은 그림을 위아래로 이어 붙여 끝없이 내린다.
    var tall=H+160,y=(visual*14)%tall;ctx.drawImage(background,0,y-tall,W,tall);ctx.drawImage(background,0,y,W,tall);
  }
  function drawArt(key,x,y,flashOn){
    var img=images[key],tall=TALL[key];if(!img||!tall)return;
    var w=tall*img.width/img.height;
    ctx.drawImage(img,x-w/2,y-tall/2,w,tall);
    if(flashOn){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;ctx.drawImage(img,x-w/2,y-tall/2,w,tall);ctx.restore();}
  }
  function drawBoss(s){
    var b=s.boss;if(!b.present||b.y<-50)return;
    var bob=Math.sin(visual*2.2)*4,size=(b.mid?150:190)+Math.sin(visual*1.3)*10;
    ctx.save();ctx.translate(b.x,b.y+bob);ctx.rotate(visual*.5);ctx.globalAlpha=s.stage==='card'?.45:.2;ctx.globalCompositeOperation='lighter';
    ctx.drawImage(circleSprite,-size/2,-size/2,size,size);ctx.restore();
    drawArt(b.actor,b.x,b.y+bob,s.tick-b.hitTick<3);
  }
  function drawMobs(s){
    var tint=Arcade.PALETTE[s.stageIndex%Arcade.PALETTE.length];
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i],glow=orbs[2][tint],reach=m.r*1.9;ctx.globalAlpha=.4;ctx.drawImage(glow.image,m.x-reach,m.y-reach,reach*2,reach*2);ctx.globalAlpha=1;drawArt(m.kind,m.x,m.y+Math.sin(visual*4+i)*2,s.tick-m.hitTick<3);}
  }
  function drawItems(s){
    for(var i=0;i<s.itemCount;i++)ctx.drawImage(itemSprites[s.ikind[i]],s.ix[i]-7,s.iy[i]-7,14,14);
  }
  function drawProp(s,i,grow,alpha){
    var prop=Arcade.PROPS[s.bcolor[i]],img=images[prop.key],x=s.bx[i],y=s.by[i];
    // 십자가처럼 upright인 기물은 절대 돌리지 않는다. 도는 기물은 제자리에서 돌고, 그 밖에는 끝이 진행 방향을 본다.
    var turn=prop.upright?0:s.bspin[i]?s.bage[i]*s.bspin[i]:s.ba[i],cos=Math.cos(turn),sin=Math.sin(turn),core=orbs[0][8],glow=orbs[2][PROP_GLOW[prop.key]],reach=glow.half*1.5*grow;
    ctx.globalAlpha=alpha*.5;ctx.drawImage(glow.image,x-reach,y-reach,reach*2,reach*2);
    if(img){
      var k=PROP_LONG[prop.key]*s.sizeScale/Math.max(img.width,img.height)*grow,w=img.width*k,h=img.height*k;
      ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);
      ctx.globalAlpha=alpha;ctx.drawImage(img,-w/2,-h/2,w,h);
      ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    }
    // 실제로 닿는 곳은 가운데 심뿐이다.
    ctx.globalAlpha=alpha;ctx.drawImage(core.image,x-core.half,y-core.half,core.half*2,core.half*2);ctx.globalAlpha=1;
  }
  function drawBullets(s){
    var bloom=Arcade.BLOOM_TICKS,i,o,half,size,x,y;
    for(i=0;i<s.n;i++){
      x=s.bx[i];y=s.by[i];if(s.bage[i]<bloom||x!==x||y!==y)continue;
      size=s.bsize[i];if(size===SHAPE_PROP){drawProp(s,i,1,1);continue;}
      o=orbs[size][s.bcolor[i]];if(!o)continue;half=o.half;
      if(size===SHAPE_RICE){var cos=Math.cos(s.ba[i]),sin=Math.sin(s.ba[i]);ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);ctx.drawImage(o.image,-half,-half,half*2,half*2);ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);}
      else ctx.drawImage(o.image,x-half,y-half,half*2,half*2);
    }
    // 갓 피어나는 탄: 크고 옅게 시작해 제 크기로 조여 든다(이때는 닿지 않는다).
    for(i=0;i<s.n;i++){
      var age=s.bage[i];x=s.bx[i];y=s.by[i];if(age>=bloom||x!==x||y!==y)continue;
      var t=age/bloom;size=s.bsize[i];
      if(size===SHAPE_PROP){drawProp(s,i,1.5-.5*t,.25+.6*t);continue;}
      o=orbs[size][s.bcolor[i]];if(!o)continue;half=o.half*(2.4-1.4*t);ctx.globalAlpha=.25+.6*t;ctx.drawImage(o.image,x-half,y-half,half*2,half*2);
    }
    ctx.globalAlpha=1;
  }
  /* 광선. 예고: 가는 점선이 굵어지며 깜빡인다 → 발사: 색 빛무리 + 흰 심 → 잔광: 가늘어지며 사라진다. */
  function drawLasers(s){
    if(!s.lasers.length)return;
    ctx.save();ctx.lineCap='butt';
    for(var i=0;i<s.lasers.length;i++){
      var l=s.lasers[i],color=COLORS[l.color]||'#ffffff',angle=finite(l.angle,0),x2=l.x+Math.cos(angle)*1000,y2=l.y+Math.sin(angle)*1000;
      ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(x2,y2);
      if(l.age<l.warn){
        var t=l.age/l.warn,blink=.5+.5*Math.sin(l.age*(.25+t*.5));
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.10+.16*t;ctx.strokeStyle=color;ctx.lineWidth=l.width*(.25+.75*t);ctx.setLineDash([]);ctx.stroke();
        ctx.globalAlpha=.45+.5*blink;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.setLineDash([7,6]);ctx.stroke();
      }else{
        var over=l.age-l.warn-l.active,k=over>0?Math.max(0,1-over/Arcade.BEAM_FADE):Math.min(1,(l.age-l.warn+1)/4),pulse=1+Math.sin(visual*40+i)*.06;
        ctx.setLineDash([]);ctx.globalCompositeOperation='lighter';
        if(!lite){ctx.globalAlpha=.3*k;ctx.strokeStyle=color;ctx.lineWidth=l.width*2.3*k*pulse;ctx.stroke();}
        ctx.globalAlpha=.9*k;ctx.strokeStyle=color;ctx.lineWidth=l.width*k*pulse;ctx.stroke();
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k;ctx.strokeStyle='#ffffff';ctx.lineWidth=l.width*.46*k;ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 영웅 탄은 반투명하게 그려 적 탄을 가리지 않는다.
  function drawShots(s){
    ctx.globalAlpha=.42;
    for(var i=0;i<s.sn;i++){
      if(s.shoming[i]){var h=homingSprite.half;ctx.drawImage(homingSprite.image,s.sx[i]-h,s.sy[i]-h,h*2,h*2);}
      else ctx.drawImage(shotSprite,s.sx[i]-4,s.sy[i]-13,8,26);
    }
    ctx.globalAlpha=1;
  }
  function drawPlayer(s){
    var p=s.player,blink=s.tick<p.invulnerableUntil&&Math.floor(s.tick/4)%2;
    if(images.gunner){ctx.globalAlpha=blink?.35:.95;ctx.drawImage(images.gunner,p.x-258.5369*57/512,p.y-283.8754*57/512,57,57);ctx.globalAlpha=1;}
  }
  // 판정점은 저속 이동 중에만 보인다. 탄에 가려지지 않게 맨 위에 그린다.
  function drawHitbox(s){
    var p=s.player;if(!p.focus)return;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(visual*3);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,17,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle='#ff2a4a';ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.8,0,TAU);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.2,p.r),0,TAU);ctx.fill();
  }
  function drawParticles(){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(var i=particles.length-1;i>=0;i--){
      var q=particles[i],t=q.life/q.max;q.x+=q.vx;q.y+=q.vy;q.life--;
      if(q.life<=0){particles[i]=particles[particles.length-1];particles.pop();continue;}
      ctx.globalAlpha=t*.9;ctx.strokeStyle=q.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(q.x,q.y,q.size*(1.6-t),0,TAU);ctx.stroke();
    }
    ctx.restore();
    if(shock){ctx.save();ctx.globalAlpha=Math.max(0,1-shock.r/420);ctx.strokeStyle='#ffffff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(shock.x,shock.y,shock.r,0,TAU);ctx.stroke();ctx.restore();shock.r+=13;if(shock.r>420)shock=null;}
  }
  function pad(n){return ('00000000'+Math.max(0,Math.floor(finite(n,0)))).slice(-8);}
  function drawHud(s){
    var b=s.boss,seg=Arcade.SEGMENTS[s.seg],color=themeColor(s),left=Arcade.timeLeft(s),stage=Arcade.STAGES[s.stageIndex],i;
    var top=ctx.createLinearGradient(0,0,0,64);top.addColorStop(0,'rgba(4,4,12,.78)');top.addColorStop(1,'rgba(4,4,12,0)');ctx.fillStyle=top;ctx.fillRect(0,0,W,64);
    ctx.textBaseline='alphabetic';
    if(s.stage==='card'){
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(12,9,W-24,4);ctx.fillStyle=b.hp/b.maxHp<=.2?'#ff5a5a':color;ctx.fillRect(12,9,(W-24)*Math.max(0,Math.min(1,b.hp/b.maxHp)),4);
      if(seg.spell){
        ctx.textAlign='right';ctx.font='600 20px '+SANS;ctx.fillStyle=left<=10?'#ff6a6a':'#ffffff';ctx.fillText(left<10?left.toFixed(1):String(Math.ceil(left)),W-12,35);
        ctx.font='italic 12px '+SERIF;ctx.fillStyle='#f3e3b5';ctx.fillText('「'+seg.name+'」',W-12,52);
      }
    }
    ctx.textAlign='left';ctx.font='600 12px '+SANS;ctx.fillStyle=color;ctx.fillText(b.present?b.name:stage.name,12,29);
    ctx.font='11px '+SANS;ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText('STAGE '+(s.stageIndex+1)+' / '+Arcade.STAGES.length,12,45);
    // 목숨 · 폭탄 · 스침 게이지(왼쪽 아래 저속 버튼 위), 점수(오른쪽 아래 폭탄 버튼 위)
    ctx.font='14px '+SANS;ctx.fillStyle='#ff6a8a';var hearts='';for(i=0;i<s.player.maxHp;i++)hearts+=i<s.player.hp?'◆':'◇';ctx.fillText(hearts,12,H-96);
    ctx.fillStyle='#7dffb0';var bombs='';for(i=0;i<s.bombs;i++)bombs+='✦';ctx.fillText(bombs,12,H-78);
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(12,H-72,64,3);ctx.fillStyle='#7dffb0';ctx.fillRect(12,H-72,64*Math.max(0,Math.min(1,s.gauge/Arcade.GAUGE_FULL)),3);
    ctx.textAlign='right';ctx.font='600 14px '+SANS;ctx.fillStyle='#ffffff';ctx.fillText(pad(s.score),W-12,H-78);
    ctx.font='10px '+SANS;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillText('GRAZE '+s.graze,W-12,H-94);
    if(banner>0){
      var t=1-banner,slide=t<.18?(1-t/.18)*W:0,alpha=t>.75?(1-t)/.25:1;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(slide,0);
      var band=ctx.createLinearGradient(0,0,W,0);band.addColorStop(0,'rgba(0,0,0,0)');band.addColorStop(.25,'rgba(6,4,16,.82)');band.addColorStop(1,'rgba(6,4,16,.82)');ctx.fillStyle=band;ctx.fillRect(0,232,W,58);
      ctx.fillStyle=color;ctx.fillRect(60,232,W-60,1.5);ctx.fillRect(60,288.5,W-60,1.5);
      ctx.textAlign='right';ctx.font='600 22px '+SERIF;ctx.fillStyle='#fff3cf';ctx.fillText(bannerTitle,W-16,268);
      ctx.font='11px '+SANS;ctx.fillStyle=color;ctx.fillText(bannerSub,W-16,283);ctx.restore();
    }
  }
  function draw(){
    var s=state;ctx.setTransform(scale,0,0,scale,0,0);
    if(!s){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);return;}
    offsetX=offsetY=0;if(shake>0){offsetX=(Math.random()-.5)*shake*.7;offsetY=(Math.random()-.5)*shake*.7;shake--;}
    ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    // 순서: 배경 → 인물·몹 → 영웅 탄 → 영웅 → 장식 이펙트 → 아이템 → 광선 → 적 탄 → 판정점
    drawBackground(s);drawBoss(s);drawMobs(s);drawShots(s);drawPlayer(s);drawParticles();drawItems(s);drawLasers(s);drawBullets(s);drawHitbox(s);
    ctx.restore();drawHud(s);
    if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash*.8)+')';ctx.fillRect(0,0,W,H);flash-=.04;}
    if(hurtFlash>0){var v=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,420);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,'rgba(255,0,40,'+(hurtFlash*.6)+')');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);hurtFlash-=.035;}
    if(banner>0)banner-=1/95;
  }

  function inputForStep(){
    var focus=!!keys.Shift||focusHeld,bomb=bombQueued;bombQueued=false;
    var speed=focus?1.8:4.2,x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),y=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
    if(x||y){var n=Math.sqrt(x*x+y*y);return {dx:x/n*speed,dy:y/n*speed,focus:focus,bomb:bomb};}
    // 터치: 영웅이 손가락 조금 위에 뜬다. 손가락이 영웅과 판정점을 가리지 않는다.
    if(finger.active&&state){var p=state.player;return {dx:finite(finger.x-p.x,0),dy:finite(finger.y-FINGER_LIFT-p.y,0),focus:focus,bomb:bomb};}
    return {dx:0,dy:0,focus:focus,bomb:bomb};
  }
  function frame(stamp){
    requestAnimationFrame(frame);
    if(!lastStamp)lastStamp=stamp;var elapsed=finite(Math.min(.1,Math.max(0,(stamp-lastStamp)/1000)),0);lastStamp=stamp;visual+=elapsed;
    if(mode==='playing'&&state){
      adaptQuality(elapsed*1000);accumulator=Math.min(accumulator+elapsed,4/60);
      var steps=0;while(accumulator>=1/60&&steps<4&&mode==='playing'){Arcade.step(state,inputForStep());accumulator-=1/60;steps++;consume();}
    }
    draw();
  }
  function show(id,on){$(id).hidden=!on;}
  function setMode(next){
    mode=next;show('arcade-title',next==='title');show('arcade-pause',next==='paused');show('arcade-result',next==='result');
    ['arcade-pause-button','arcade-focus','arcade-bomb'].forEach(function(id){show(id,next==='playing');});
    if(next!=='playing'){focusHeld=false;finger.active=false;bombQueued=false;}
    if(music){if(next==='playing'&&soundOn){var p=music.play();if(p&&p.catch)p.catch(function(){});}else music.pause();}
  }
  function start(){
    if(fx)fx.unlock();
    var from=Number($('arcade-stage-select').value)||0;
    state=Arcade.createRun({difficulty:difficulty,seed:(Date.now()^Math.floor(performance.now()*1000))>>>0,stage:from,compact:compact});
    buildSprites();loadStage(state.stageIndex);
    particles.length=0;flash=hurtFlash=shake=banner=0;shock=null;accumulator=0;lastStamp=0;framesSeen=0;setMode('playing');
  }
  function finish(){
    var s=state,won=s.stage==='won';
    if(s.score>best){best=s.score;try{global.localStorage.setItem('hapil-arcade-best-v38',String(best));}catch(e){}}
    $('result-title').textContent=won?'ALL CLEAR':'GAME OVER';$('result-score').textContent=pad(s.score);$('result-best').textContent=pad(best);
    $('result-detail').textContent='STAGE '+(s.stageIndex+1)+' · 패턴 보너스 '+s.captures+' / '+Arcade.CARD_TOTAL+' · 처치 '+s.kills+' · 스친 탄 '+s.graze+' · 피격 '+s.hits;
    if(!won)$('arcade-stage-select').value=String(s.stageIndex); // 다시 도전은 쓰러진 스테이지부터
    setTimeout(function(){if(state===s)setMode('result');},won?1500:900);
  }
  function pause(){if(mode==='playing')setMode('paused');}
  function fieldPoint(e){var rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};}
  function bind(){
    document.querySelectorAll('[data-difficulty]').forEach(function(button){button.addEventListener('click',function(){difficulty=button.dataset.difficulty;$('difficulty-note').textContent=NOTES[difficulty];document.querySelectorAll('[data-difficulty]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});});});
    $('arcade-start').addEventListener('click',start);$('arcade-retry').addEventListener('click',start);
    $('arcade-resume').addEventListener('click',function(){if(fx)fx.unlock();accumulator=0;lastStamp=0;setMode('playing');});
    $('arcade-pause-button').addEventListener('click',pause);
    $('arcade-quit').addEventListener('click',function(){state=null;setMode('title');});
    $('arcade-sound').addEventListener('click',function(){soundOn=!soundOn;this.textContent=soundOn?'소리 켜짐':'소리 꺼짐';this.setAttribute('aria-pressed',String(soundOn));});
    // 저속 버튼은 누르고 있는 동안, 폭탄 버튼은 누를 때 한 번
    var focusButton=$('arcade-focus');
    focusButton.addEventListener('pointerdown',function(e){e.preventDefault();focusHeld=true;});
    ['pointerup','pointercancel','pointerleave'].forEach(function(type){focusButton.addEventListener(type,function(){focusHeld=false;});});
    $('arcade-bomb').addEventListener('pointerdown',function(e){e.preventDefault();bombQueued=true;});
    var stage=$('arcade-stage');
    stage.addEventListener('pointerdown',function(e){if(mode!=='playing'||finger.active||e.target.closest('button'))return;e.preventDefault();var q=fieldPoint(e);finger.active=true;finger.id=e.pointerId;finger.x=q.x;finger.y=q.y;try{stage.setPointerCapture(e.pointerId);}catch(ignore){}});
    stage.addEventListener('pointermove',function(e){if(!finger.active||e.pointerId!==finger.id)return;e.preventDefault();var q=fieldPoint(e);finger.x=q.x;finger.y=q.y;});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){stage.addEventListener(type,function(e){if(e.pointerId===finger.id){finger.active=false;finger.id=null;}});});
    document.addEventListener('keydown',function(e){var key=e.key.length===1?e.key.toLowerCase():e.key;if(key==='Escape'||key===' '){e.preventDefault();if(mode==='playing')pause();else if(mode==='paused')$('arcade-resume').click();return;}
      if(key==='x'&&mode==='playing'&&!e.repeat){bombQueued=true;return;}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift'].indexOf(key)>=0){if(mode==='playing')e.preventDefault();keys[key]=true;}});
    document.addEventListener('keyup',function(e){delete keys[e.key.length===1?e.key.toLowerCase():e.key];});
    document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
    global.addEventListener('blur',function(){keys={};pause();});global.addEventListener('resize',fit);
  }
  function boot(){
    try{best=Number(global.localStorage.getItem('hapil-arcade-best-v38'))||0;}catch(e){best=0;}
    $('title-best').textContent=pad(best);$('difficulty-note').textContent=NOTES[difficulty];
    var select=$('arcade-stage-select');Arcade.STAGES.forEach(function(g,i){var option=document.createElement('option');option.value=String(i);option.textContent=(i?'제'+g.part+'부 · ':'처음부터 · ')+g.name;select.appendChild(option);});
    try{fx=global.HapilAudio&&global.HapilAudio.create?global.HapilAudio.create():null;}catch(e){fx=null;}
    try{music=new Audio('media/music.mp3');music.loop=true;music.volume=.2;music.preload='none';}catch(e){music=null;}
    bind();fit();requestAnimationFrame(frame);
    // 시작 전에 받는 것은 영웅과 큰 기물뿐이다. 스테이지 그림은 그 스테이지에서 받는다.
    loadImage('gunner');Arcade.PROPS.forEach(function(prop){loadImage(prop.key);});
    $('arcade-start').disabled=false;$('arcade-start').textContent='게임 시작';
  }
  global.HapilArcadeApp={getState:function(){return {mode:mode,scale:scale,lite:lite,compact:compact,frameMs:frameMs,bullets:state?state.n:0,stage:state?state.stage:'',seg:state?state.seg:-1,hp:state?state.player.hp:0,score:state?state.score:0,particles:particles.length,images:Object.keys(images).length,loadedStage:loadedStage};},debugState:function(){return state;}};
  boot();
})(window);
