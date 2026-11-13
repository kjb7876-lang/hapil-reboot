/* 합일 v43 · 원큐 여정(ARCADE 탄막) — 화면·입력·소리·저장.
 * 시뮬레이션은 arcade-v43.js가 맡고, 여기서는 그 상태를 읽어 그리기만 한다.
 * 글은 스테이지 이름 한 줄과 패턴 이름 한 줄만 띄운다(메뉴 버튼 글은 예외).
 * 저장: localStorage 'hapil-arcade-save-v43' = Progress 객체(JSON). 읽을 때 Progress.sanitize, 스테이지를 깰 때마다 Progress.record.
 * 그림: 스테이지에 들어설 때 그 스테이지 그림만 받고(loadStage) 지난 스테이지 그림은 버린다(releaseStage). 그림이 없으면 색·도형으로 그린다. */
(function(global){
  'use strict';
  var Arcade=global.HapilArcade,Progress=Arcade.Progress,W=Arcade.WIDTH,H=Arcade.HEIGHT,TAU=Math.PI*2;
  var $=function(id){return document.getElementById(id);};
  var canvas=$('arcade-canvas'),ctx=canvas.getContext('2d');
  var SAVE_KEY='hapil-arcade-save-v43',BEST_KEY='hapil-arcade-best-v43';
  // 탄 색 여섯 가지(시뮬레이션의 색 번호 0·2·4·5·6·8). 속은 단색, 테두리는 밝게.
  var COLORS={0:'#ff3b4e',2:'#a45cff',4:'#2fd0ff',5:'#3fdc82',6:'#ffd23e',8:'#e9e9ff'};
  // 그림 높이(픽셀). 모르는 키는 종류별 기본값(인물·몹·기물)을 쓴다. 부별 파일이 새 인물·몹·기물을 계속 들인다.
  var TALL={violet:112,balrog:124,mask:112,lucifer:124,asmodeus:108,pride:118,controller:118,goblin:104,insomnia:124,arbelia:108,siren:124,chief:124,executor:124,rian:108,cultist:124,
    spider:30,slime:28,ember:34,drone:26,mobgoblin:36,wolf:34,nightmare:40,collector:40,leech:34,guardian:62,warden:72,horn:84,belphegor:70,mammon:74,knight:80};
  var ITEM_DRAW=22,TALL_ACTOR=116,TALL_MOB=64,TALL_ELITE=92;
  var PROP_LONG={'sword-violet':68,cleaver:64,'sword-balrog':72,obelisk:80,spire:72,'twin-blade':62,crescent:58,tissue:34,money:36,heel:40,feather:44,cross:60,gear:56};
  var PROP_GLOW={'sword-violet':2,cleaver:5,'sword-balrog':0,obelisk:2,spire:4,'twin-blade':8,crescent:4,tissue:6,money:6,heel:0,feather:8,cross:6,gear:4};
  var ART_DIR='media/arcade-v43/';
  var SERIF='"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var SLOW_FRAME_MS=21,VERY_SLOW_FRAME_MS=28,MAX_PARTICLES=320,FINGER_LIFT=64,TOAST_SECONDS=1.6;
  var SHAPE_RICE=3,SHAPE_BUBBLE=4,SHAPE_PROP=Arcade.SHAPE_PROP;
  var NOTES={gentle:'목숨 7 · 폭탄 3 · 스테이지마다 전부 회복 · 느린 탄 · 아주 작은 피격점',normal:'목숨 3 · 폭탄 2 · 스테이지마다 1 회복',hell:'목숨 1 · 폭탄 1 · 회복 없음 · 빽빽한 탄 · 격자 광선 동시'};

  var images={},loading={},failed={},want={},manifest=null,orbs=[],shotSprite=null,homingSprite=null,circleSprite=null,itemSprites=[],background=null,backgroundStage=-1,loadedStage=-1;
  var scale=1,lite=false,frameMs=16,framesSeen=0,offsetX=0,offsetY=0;
  var state=null,mode='title',difficulty='normal',accumulator=0,lastStamp=0,visual=0,lastRun=null;
  var particles=[],flash=0,hurtFlash=0,shake=0,shock=null,banner=0,bannerTitle='',bannerSub='',toast=null;
  var keys={},finger={active:false,id:null,x:0,y:0},focusHeld=false,bombQueued=false;
  var fx=null,music=null,soundOn=true,best=0,lastItemSound=0,progress=Progress.fresh(),saveOk=true;
  var themeOverride=null,turbo=0,rushStage=false;
  var compact=!!(global.matchMedia&&global.matchMedia('(pointer:coarse)').matches)||global.innerWidth<520;

  function finite(v,fallback){return v===v&&v!==Infinity&&v!==-Infinity?v:fallback;}
  function offscreen(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
  function hash(text){var n=2166136261;text=String(text);for(var i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return n>>>0;}

  /* ── 색: 스테이지 색조와 HUD 색은 theme.tint에서 계산한다 ── */
  function hexRgb(hex){var m=/^#([0-9a-f]{6})$/i.exec(String(hex||''));if(!m)return null;var n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255];}
  function rgbHsl(c){var r=c[0]/255,g=c[1]/255,b=c[2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,h=0,s=0,d=max-min;
    if(d>0){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return [h,s,l];}
  function hslHex(h,s,l){var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;h=((h%360)+360)%360;
    if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
    return '#'+[r,g,b].map(function(v){return ('0'+Math.round(Math.max(0,Math.min(1,v+m))*255).toString(16)).slice(-2);}).join('');}
  function themeOf(index){
    var g=Arcade.STAGES[index]||Arcade.STAGES[0],t=(themeOverride&&themeOverride.stage===index?themeOverride:g.theme)||{};
    return {bg:typeof t.bg==='string'?t.bg:'',tint:typeof t.tint==='string'?t.tint:'',fx:typeof t.fx==='string'?t.fx:'none'};
  }
  // 색조: 아주 어두운 값(임시 #000000 따위)은 스테이지 번호로 고른 색으로 바꾼다.
  function tintOf(index){
    var rgb=hexRgb(themeOf(index).tint);
    if(rgb&&rgb[0]+rgb[1]+rgb[2]>30)return themeOf(index).tint;
    return hslHex((index*137.5+(Arcade.STAGES[index]?Arcade.STAGES[index].part:1)*40)%360,.42,.42);
  }
  // HUD 색(옛 STAGE_COLOR): 색조의 색상을 밝게 끌어올린다. 회색 색조는 옅은 보라빛 흰색.
  function hudColorOf(index){var hsl=rgbHsl(hexRgb(tintOf(index)));return hsl[1]<.08?'#e6e0ff':hslHex(hsl[0],Math.max(.55,hsl[1]),.74);}
  var STAGE_COLOR=Arcade.STAGES.map(function(g,i){return hudColorOf(i);});
  function themeColor(s){return themeOverride&&themeOverride.stage===s.stageIndex?hudColorOf(s.stageIndex):STAGE_COLOR[s.stageIndex]||'#e6e0ff';}
  function tallOf(key){
    if(TALL[key])return Arcade.MOBS[key]&&TALL[key]<TALL_MOB?TALL_MOB:TALL[key]; // 옛 잡몹 크기(26~40)는 그림이 안 보일 만큼 작았다. 잡몹은 TALL_MOB보다 작게 그리지 않는다.
    if(Arcade.ACTORS[key])return TALL_ACTOR;
    var m=Arcade.MOBS[key];if(m)return m.elite?Math.max(TALL_ELITE,Math.round(m.r*4.2)):Math.min(78,Math.max(TALL_MOB,Math.round(m.r*4.1)));
    return TALL_MOB;
  }
  /* 동작 그림: manifest의 <키>.webp 항목에 motions:['side','attack',…]가 있으면 <키>@side.webp 같은 스트립이 따로 있다. */
  function motionsOf(key){var e=manifest&&manifest[key+'.webp'];return e&&Array.isArray(e.motions)?e.motions:[];}
  function propLong(prop){return PROP_LONG[prop.key]||Math.round((prop.radius||12)*4.4);}
  function propGlow(prop){var g=PROP_GLOW[prop.key];return g===undefined?Arcade.PALETTE[hash(prop.key)%Arcade.PALETTE.length]:g;}

  /* ── 그림 받기 ── */
  function fileOf(key){return key==='gunner'?'media/gunner.webp':ART_DIR+key+(key.indexOf('bg-')===0?'.jpg':'.webp');}
  // 목록(manifest.json)에 없는 그림은 받지 않는다(404 없이 색·도형으로 넘어간다). 목록을 못 읽었으면 일단 받아 본다.
  function listed(key){if(key==='gunner'||!manifest)return true;return !!manifest[fileOf(key).slice(ART_DIR.length)];}
  function loadImage(key){
    if(!key||images[key]||loading[key]||failed[key])return;
    if(!listed(key)){failed[key]=true;return;}
    loading[key]=true;want[key]=true;
    var img=new Image();
    img.onload=function(){delete loading[key];if(!want[key])return;images[key]=img;if(key.indexOf('bg-')===0)backgroundStage=-1;};
    img.onerror=function(){delete loading[key];failed[key]=true;};
    img.src=fileOf(key);
  }
  /* 스테이지에 필요한 그림: 배경 · 그 스테이지 SEGMENTS의 인물 · cast의 몹 · 기념물. 기물은 처음 화면에 나올 때 받는다. */
  /* 장면마다 m0 지역표의 몹 그림을 입힌다(src/arcade-skins-v43.js). 시뮬의 몹 종류는 그대로고 그림만 바뀐다. */
  var SKINS=(typeof ArcadeSkins==='object'&&ArcadeSkins&&ArcadeSkins.scenes)||{};
  function skinsOf(index){var g=Arcade.STAGES[index],list=g&&SKINS[g.scene];return list&&list.length?list:null;}
  function skinOf(index,kind){
    var list=skinsOf(index);if(!list)return kind;
    var g=Arcade.STAGES[index],at=(g.cast||[]).indexOf(kind);if(at<0){at=0;for(var i=0;i<kind.length;i++)at+=kind.charCodeAt(i);}
    var key=list[at%list.length];return images[key]?key:(images[kind]?kind:key);
  }
  function facesRight(key){var e=manifest&&manifest[key+'.webp'];return !!e&&e.facing==='right';}
  function stageKeys(index){
    var g=Arcade.STAGES[index];if(!g)return [];
    var list=[],add=function(k){if(k&&list.indexOf(k)<0)list.push(k);};
    var bg=themeOf(index).bg;if(bg)add('bg-'+bg);
    for(var i=g.first;i<Arcade.SEGMENTS.length&&Arcade.SEGMENTS[i].stage===index;i++){var seg=Arcade.SEGMENTS[i];if(seg.kind==='card')add(seg.actor);}
    var skin=skinsOf(index);(skin||g.cast||[]).forEach(add); // m0 지역표 몹이 있으면 그것만 받는다
    // 동작 그림(옆 걷기·공격 등)은 목록에 있을 때만 같이 받는다.
    list.slice().forEach(function(k){motionsOf(k).forEach(function(m){add(k+'@'+m);});});
    if(g.reward&&g.reward.key)add('reward-'+g.reward.key);
    return list;
  }
  /* 스테이지 그림은 그 스테이지에 들어설 때 한 번만 받는다. 이미 받은 그림은 다시 받지 않는다. */
  function loadStage(index){
    if(index===loadedStage||!Arcade.STAGES[index])return;
    if(loadedStage>=0)releaseStage(loadedStage,index);
    loadedStage=index;stageKeys(index).forEach(function(key){want[key]=true;loadImage(key);});
  }
  /* 지난 스테이지의 그림과 배경 캔버스를 버린다. 다음 스테이지에서도 쓰는 그림은 남긴다. */
  function releaseStage(index,next){
    var keep=next>=0?stageKeys(next):[];
    stageKeys(index).forEach(function(key){if(keep.indexOf(key)<0){delete images[key];delete want[key];}});
    if(background){background.width=background.height=0;background=null;}backgroundStage=-1;
    if(next<0)loadedStage=-1;
  }
  /* 움직이는 그림: manifest 항목에 frames·cell·fps가 있으면 가로로 칸이 이어진 시트다. 없으면 한 장.
   * 결과는 키마다 한 번 만들어 두고 다시 쓴다(프레임마다 객체를 만들지 않는다). */
  var sheets={};
  function sheetOf(key,img){
    var hit=sheets[key];if(hit&&hit.img===img)return hit;
    var e=manifest&&manifest[fileOf(key).slice(ART_DIR.length)],frames=e&&Math.floor(Number(e.frames)),cw=e&&e.cell&&Number(e.cell[0]),ch=e&&e.cell&&Number(e.cell[1]),fps=e&&Number(e.fps);
    var info={img:img,frames:1,cw:img.width,ch:img.height,fps:0};
    if(frames>1&&cw>0&&ch>0&&cw*frames<=img.width+frames&&ch<=img.height+1){info.frames=frames;info.cw=cw;info.ch=ch;info.fps=fps>0&&fps<=60?fps:8;}
    sheets[key]=info;return info;
  }
  // 칸 하나만 잘라 그린다(9인자 drawImage). phase로 시작 칸을 어긋나게 한다. still이면 첫 칸.
  function drawCell(key,img,phase,still,x,y,w,h){
    var sh=sheetOf(key,img),f=0;
    if(sh.frames>1&&!still)f=((Math.floor(visual*sh.fps)+(phase|0))%sh.frames+sh.frames)%sh.frames;
    ctx.drawImage(img,f*sh.cw,0,sh.cw,sh.ch,x,y,w,h);
  }
  function cellRatio(key,img){var sh=sheetOf(key,img);return sh.cw/Math.max(1,sh.ch);}
  function requestProp(key){if(!images[key]&&!loading[key]&&!failed[key]){want[key]=true;loadImage(key);}}

  /* ── 탄 그림 ── */
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
    // 아이템은 하트다: 점수는 분홍 하트, 폭탄 게이지는 금빛 하트. 흰 테두리와 옅은 빛으로 적 탄과 구별한다.
    itemSprites=[['#ff6fa3','#ffd0e0'],['#ffcf4a','#fff3c4']].map(function(c){var d=offscreen(ITEM_DRAW*scale,ITEM_DRAW*scale),q=d.getContext('2d');q.scale(scale,scale);q.translate(ITEM_DRAW/2,ITEM_DRAW/2);
      var u=ITEM_DRAW/26,g=q.createRadialGradient(0,0,2*u,0,0,13*u);g.addColorStop(0,c[1]);g.addColorStop(1,'rgba(255,255,255,0)');q.globalAlpha=.35;q.fillStyle=g;q.fillRect(-13*u,-13*u,26*u,26*u);q.globalAlpha=1;
      q.beginPath();q.moveTo(0,8*u);q.bezierCurveTo(-11*u,0,-9*u,-9*u,-4*u,-8*u);q.bezierCurveTo(-1.5*u,-8*u,0,-6*u,0,-4.5*u);q.bezierCurveTo(0,-6*u,1.5*u,-8*u,4*u,-8*u);q.bezierCurveTo(9*u,-9*u,11*u,0,0,8*u);q.closePath();
      q.fillStyle=c[0];q.fill();q.lineWidth=1.6*u;q.strokeStyle='#ffffff';q.lineJoin='round';q.stroke();
      q.fillStyle=c[1];q.globalAlpha=.9;q.beginPath();q.ellipse(-3.6*u,-4.6*u,1.9*u,1.2*u,-.6,0,Math.PI*2);q.fill();return d;});
    // 보스 뒤 마법진: 동심원 셋 + 눈금 + 육각별
    c=offscreen(220*scale,220*scale);g=c.getContext('2d');g.scale(scale,scale);g.translate(110,110);g.strokeStyle='#ffffff';g.lineWidth=1.6;
    [104,92,60].forEach(function(r){g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();});
    g.lineWidth=1;for(var i=0;i<36;i++){var a=TAU*i/36;g.beginPath();g.moveTo(Math.cos(a)*92,Math.sin(a)*92);g.lineTo(Math.cos(a)*(i%3?98:104),Math.sin(a)*(i%3?98:104));g.stroke();}
    for(var k=0;k<2;k++){g.beginPath();for(var j=0;j<3;j++){var b=TAU*j/3+k*Math.PI/3-Math.PI/2;g[j?'lineTo':'moveTo'](Math.cos(b)*92,Math.sin(b)*92);}g.closePath();g.stroke();}
    circleSprite=c;
    fxSprite=null;
  }

  /* ── 배경: 탄보다 어둡고 흐리게. 원화가 있으면 줄여 흐리게 + 색조 + 어둡게, 없으면 색조로 만든 무늬 배경. 위아래로 이어지게 그린다. ── */
  function buildBackground(index){
    if(background){background.width=background.height=0;background=null;}
    var tall=H+160,c=offscreen(W,tall),g=c.getContext('2d'),tint=tintOf(index),rgb=hexRgb(tint),img=images['bg-'+themeOf(index).bg],i;
    if(img){
      g.filter='blur(1.5px)';g.drawImage(img,0,0,W,tall);g.filter='none';
      // 원화 위에 색조를 입힌다(색상만 바꾸고 밝기는 그대로).
      g.globalCompositeOperation='color';g.globalAlpha=.42;g.fillStyle=tint;g.fillRect(0,0,W,tall);
      g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(5,5,14,.68)';g.fillRect(0,0,W,tall);
    }else{
      var top=g.createLinearGradient(0,0,0,tall);
      top.addColorStop(0,'rgb('+Math.round(rgb[0]*.2)+','+Math.round(rgb[1]*.2)+','+Math.round(rgb[2]*.2)+')');
      top.addColorStop(.5,'rgb('+Math.round(rgb[0]*.1+4)+','+Math.round(rgb[1]*.1+4)+','+Math.round(rgb[2]*.1+10)+')');
      top.addColorStop(1,'rgb('+Math.round(rgb[0]*.2)+','+Math.round(rgb[1]*.2)+','+Math.round(rgb[2]*.2)+')');
      g.fillStyle=top;g.fillRect(0,0,W,tall);
      // 스테이지마다 다른 무늬(같은 부 안에서도 달라 보이게). 위아래 끝이 이어지도록 tall만큼 위아래로 한 벌 더 그린다.
      var seed=hash(themeOf(index).bg+'#'+index),motif=seed%5,rnd=function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      g.strokeStyle=hslHex(rgbHsl(rgb)[0],.35,.5);g.fillStyle=g.strokeStyle;g.globalAlpha=.16;g.lineWidth=1.2;
      for(var copy=-1;copy<=1;copy++){
        var save=seed;
        if(motif===0)for(i=0;i<14;i++){var x=rnd()*W,y=rnd()*tall+copy*tall,r=20+rnd()*70;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();}
        else if(motif===1)for(i=0;i<9;i++){var px=rnd()*W,pw=10+rnd()*40;g.globalAlpha=.08;g.fillRect(px,0,pw,tall);g.globalAlpha=.16;}
        else if(motif===2)for(i=0;i<22;i++){var yy=rnd()*tall+copy*tall;g.beginPath();g.moveTo(0,yy);g.lineTo(W,yy+(rnd()-.5)*80);g.stroke();}
        else if(motif===3)for(i=0;i<60;i++){g.fillRect(rnd()*W,rnd()*tall+copy*tall,1.6,1.6);}
        else for(i=0;i<10;i++){var cx=rnd()*W,cy=rnd()*tall+copy*tall,s=14+rnd()*36;g.beginPath();g.moveTo(cx,cy-s);g.lineTo(cx+s,cy);g.lineTo(cx,cy+s);g.lineTo(cx-s,cy);g.closePath();g.stroke();}
        seed=save;
      }
      g.globalAlpha=1;
    }
    var v=g.createRadialGradient(W/2,tall/2,160,W/2,tall/2,480);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=v;g.fillRect(0,0,W,tall);
    background=c;backgroundStage=index;
  }
  function drawBackground(s){
    if(backgroundStage!==s.stageIndex||!background)buildBackground(s.stageIndex);
    // 아래로 흐르는 배경: 같은 그림을 위아래로 이어 붙여 끝없이 내린다.
    var tall=H+160,y=(visual*14)%tall;ctx.drawImage(background,0,y-tall,W,tall);ctx.drawImage(background,0,y,W,tall);
  }

  /* ── 날씨: 고정 크기 풀(Float32Array). 프레임마다 객체를 만들지 않는다. 탄보다 어둡고 작게, 탄 뒤에 그린다. ── */
  var FX_POOL=compact?56:96,FX_LITE_POOL=40;
  var fxX=new Float32Array(FX_POOL),fxY=new Float32Array(FX_POOL),fxVX=new Float32Array(FX_POOL),fxVY=new Float32Array(FX_POOL),fxS=new Float32Array(FX_POOL),fxP=new Float32Array(FX_POOL),fxL=new Float32Array(FX_POOL);
  var fxKind='none',fxCount=0,fxStage=-1,fxSprite=null,fxSpriteKind='',fxColor='#ffffff';
  /* n 풀에서 쓰는 비율 · shape 그리는 법 · size/vx/vy 범위 · wob 좌우 흔들림 · life 수명(초, 있으면 다시 태어난다) */
  var WEATHER={
    spores:{n:.5,color:'#b9d9a0',shape:'dot',size:[1,2.2],vx:[-6,6],vy:[-16,-6],wob:10,alpha:.3},
    embers:{n:.5,color:'#e08a4a',shape:'dot',size:[1,2],vx:[-8,8],vy:[-44,-18],wob:16,alpha:.34},
    ash:{n:.6,color:'#a29d9a',shape:'dot',size:[1,2.4],vx:[-12,4],vy:[14,30],wob:12,alpha:.28},
    rain:{n:1,color:'#8fb2d0',shape:'streak',size:[9,16],vx:[-70,-50],vy:[440,560],wob:0,alpha:.2},
    snow:{n:.8,color:'#dfe7f5',shape:'dot',size:[1.2,2.8],vx:[-8,8],vy:[22,46],wob:18,alpha:.32},
    mist:{n:.1,color:'#c4cad8',shape:'blob',size:[70,130],vx:[6,16],vy:[-3,3],wob:0,alpha:.1},
    dust:{n:.6,color:'#c4b08a',shape:'dot',size:[.8,1.6],vx:[6,18],vy:[-3,3],wob:6,alpha:.28},
    petals:{n:.35,color:'#d99ab4',shape:'leaf',size:[2.6,4.2],vx:[10,26],vy:[26,48],wob:20,alpha:.34,spin:2},
    sparks:{n:.3,color:'#e8cf8a',shape:'streak',size:[4,9],vx:[-120,120],vy:[-120,120],wob:0,alpha:.36,life:[.25,.7]},
    static:{n:.6,color:'#c8d0e8',shape:'dash',size:[3,14],vx:[0,0],vy:[0,0],wob:0,alpha:.16,life:[.04,.16]},
    bubbles:{n:.3,color:'#94cfe6',shape:'ring',size:[2,5],vx:[-4,4],vy:[-36,-16],wob:8,alpha:.26},
    leaves:{n:.3,color:'#8f9c58',shape:'leaf',size:[3.4,6],vx:[-24,30],vy:[30,56],wob:26,alpha:.32,spin:1.4},
    sand:{n:.9,color:'#cdb07a',shape:'streak',size:[3,7],vx:[160,260],vy:[8,24],wob:0,alpha:.22},
    paper:{n:.22,color:'#ddd6c4',shape:'rect',size:[3.4,6],vx:[-16,16],vy:[18,36],wob:22,alpha:.28,spin:1.8},
    motes:{n:.35,color:'',shape:'glow',size:[4,8],vx:[-6,6],vy:[-8,4],wob:8,alpha:.4},
    drip:{n:.3,color:'#7a3a48',shape:'drop',size:[4,9],vx:[0,0],vy:[20,60],wob:0,alpha:.34}
  };
  function between(r){return r[0]+Math.random()*(r[1]-r[0]);}
  function spawnFx(k,i,anywhere){
    fxS[i]=between(k.size);fxVX[i]=between(k.vx);fxVY[i]=between(k.vy);fxP[i]=Math.random()*TAU;fxL[i]=k.life?between(k.life):0;
    fxX[i]=Math.random()*W;
    if(anywhere||k.life)fxY[i]=Math.random()*H;
    else if(fxVY[i]>=0)fxY[i]=-12-Math.random()*20;else fxY[i]=H+12+Math.random()*20;
    if(!anywhere&&!k.life&&Math.abs(fxVX[i])>Math.abs(fxVY[i])){fxX[i]=fxVX[i]>0?-12:W+12;fxY[i]=Math.random()*H;} // 옆으로 흐르는 것은 옆에서
  }
  function initFx(kind,index){
    fxKind=WEATHER[kind]?kind:'none';fxStage=index;
    var k=WEATHER[fxKind],pool=lite?Math.min(FX_LITE_POOL,FX_POOL):FX_POOL;
    fxCount=k?Math.max(1,Math.round(pool*k.n)):0;
    fxColor=k?(k.color||hudColorOf(index)):'#ffffff';
    for(var i=0;i<fxCount;i++)spawnFx(k,i,true);
    if(k&&(k.shape==='blob'||k.shape==='glow')&&fxSpriteKind!==fxKind+fxColor){
      // 흐린 덩어리 한 장을 미리 그려 두고 찍기만 한다(종류가 바뀔 때만 다시 그린다).
      var c=offscreen(64,64),g=c.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
      grad.addColorStop(0,fxColor);grad.addColorStop(1,fxColor+'00');g.fillStyle=grad;g.fillRect(0,0,64,64);fxSprite=c;fxSpriteKind=fxKind+fxColor;
    }
  }
  function updateFx(dt){
    var k=WEATHER[fxKind];if(!k)return;
    for(var i=0;i<fxCount;i++){
      if(k.life){fxL[i]-=dt;if(fxL[i]<=0){spawnFx(k,i,true);continue;}}
      if(k.shape==='drop')fxVY[i]=Math.min(420,fxVY[i]+260*dt);
      fxX[i]+=(fxVX[i]+(k.wob?Math.sin(fxP[i]+visual*1.7)*k.wob:0))*dt;fxY[i]+=fxVY[i]*dt;
      var m=k.shape==='blob'?fxS[i]:16;
      if(fxY[i]>H+m||fxY[i]<-m-30||fxX[i]>W+m||fxX[i]<-m){if(k.life)spawnFx(k,i,true);else spawnFx(k,i,false);if(k.shape==='blob'){fxX[i]=-fxS[i];fxY[i]=Math.random()*H;}}
    }
  }
  function drawFx(){
    var k=WEATHER[fxKind];if(!k||!fxCount)return;
    var i,sh=k.shape,len,vx,vy;
    ctx.save();ctx.globalAlpha=k.alpha;ctx.fillStyle=fxColor;ctx.strokeStyle=fxColor;ctx.lineCap='round';
    if(sh==='dot'){ctx.beginPath();for(i=0;i<fxCount;i++)ctx.rect(fxX[i],fxY[i],fxS[i],fxS[i]);ctx.fill();}
    else if(sh==='streak'||sh==='drop'){
      ctx.lineWidth=sh==='drop'?1.6:1;ctx.beginPath();
      for(i=0;i<fxCount;i++){vx=fxVX[i];vy=fxVY[i];len=Math.sqrt(vx*vx+vy*vy)||1;
        if(k.life)ctx.globalAlpha=k.alpha;
        ctx.moveTo(fxX[i],fxY[i]);ctx.lineTo(fxX[i]-vx/len*fxS[i],fxY[i]-vy/len*fxS[i]);}
      ctx.stroke();
    }
    else if(sh==='dash'){ctx.beginPath();for(i=0;i<fxCount;i++)ctx.rect(fxX[i],fxY[i],fxS[i],1);ctx.fill();
      if(Math.random()<.04){ctx.globalAlpha=k.alpha*.5;ctx.fillRect(0,Math.random()*H,W,1+Math.random()*3);}}
    else if(sh==='ring'){ctx.lineWidth=1;ctx.beginPath();for(i=0;i<fxCount;i++){ctx.moveTo(fxX[i]+fxS[i],fxY[i]);ctx.arc(fxX[i],fxY[i],fxS[i],0,TAU);}ctx.stroke();}
    else if(sh==='blob'||sh==='glow'){
      if(fxSprite)for(i=0;i<fxCount;i++){var r=fxS[i];if(sh==='glow')ctx.globalAlpha=k.alpha*(.55+.45*Math.sin(fxP[i]+visual*2.3));ctx.drawImage(fxSprite,fxX[i]-r,fxY[i]-r,r*2,r*2);}
    }
    else if(sh==='leaf'||sh==='rect'){
      for(i=0;i<fxCount;i++){var turn=fxP[i]+visual*k.spin,c=Math.cos(turn),s=Math.sin(turn),z=fxS[i];
        ctx.setTransform(scale*c,scale*s,-scale*s,scale*c,(fxX[i]+offsetX)*scale,(fxY[i]+offsetY)*scale);
        if(sh==='rect')ctx.fillRect(-z,-z*.7,z*2,z*1.4);else{ctx.beginPath();ctx.ellipse(0,0,z,z*.45,0,0,TAU);ctx.fill();}}
      ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    }
    ctx.restore();
  }

  function fit(){
    var dpr=Math.min(2,global.devicePixelRatio||1),next=lite?1:Math.max(1,dpr);
    if(next!==scale||!orbs.length||canvas.width!==W*next){scale=next;canvas.width=W*scale;canvas.height=H*scale;buildSprites();}
    var stage=$('arcade-stage'),room=stage.getBoundingClientRect(),k=Math.min(room.width/W,room.height/H);
    canvas.style.width=Math.floor(W*k)+'px';canvas.style.height=Math.floor(H*k)+'px';
  }
  // 느린 기기에서는 먼저 해상도를, 그래도 느리면 빛무리와 날씨 입자 수를 내린다.
  function adaptQuality(elapsedMs){
    frameMs+=(Math.min(80,elapsedMs)-frameMs)*.05;framesSeen++;
    if(framesSeen<150||mode!=='playing'||turbo)return;
    if(frameMs>VERY_SLOW_FRAME_MS&&!lite){lite=true;framesSeen=0;frameMs=16;fit();buildSprites();if(state)initFx(themeOf(state.stageIndex).fx,state.stageIndex);}
    else if(frameMs>SLOW_FRAME_MS&&scale>1){scale=1;canvas.width=W;canvas.height=H;buildSprites();framesSeen=0;frameMs=16;}
  }

  /* ── 저장 ── */
  function loadProgress(){
    var raw=null;
    try{var text=global.localStorage.getItem(SAVE_KEY);raw=text?JSON.parse(text):null;}catch(e){raw=null;}
    try{progress=Progress.sanitize(raw);}catch(e){progress=Progress.fresh();}
    try{best=Math.max(0,finite(Number(global.localStorage.getItem(BEST_KEY)),0))||0;}catch(e){best=0;}
  }
  function saveProgress(){try{global.localStorage.setItem(SAVE_KEY,JSON.stringify(progress));saveOk=true;}catch(e){saveOk=false;}}
  function recordResult(result){
    if(!result||state.bossOnly)return;
    progress=Progress.record(progress,result,state.difficulty);saveProgress();
  }

  function play(name,x){if(fx&&soundOn)fx.play(name,x===undefined?0:Math.max(-1,Math.min(1,(finite(x,W/2)/W-.5)*1.4)));}
  function addParticle(x,y,vx,vy,life,color,size){if(particles.length<MAX_PARTICLES)particles.push({x:x,y:y,vx:vx,vy:vy,life:life,max:life,color:color,size:size});}
  function showBanner(title,sub){banner=1;bannerTitle=title;bannerSub=sub;}
  function showToast(result){
    var g=Arcade.STAGES[result.stage];if(!g)return;
    // 기념물 그림은 이 스테이지 그림과 함께 이미 받아 두었다(곧 releaseStage가 목록에서 지워도 여기서 쥐고 있다).
    toast={t:TOAST_SECONDS,name:g.name,stars:Math.max(1,Math.min(3,result.stars|0)),img:g.reward?images['reward-'+g.reward.key]||null:null,key:g.reward?'reward-'+g.reward.key:'',color:themeColor(state)};
  }
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
      else if(e==='wave'){var g=Arcade.STAGES[s.stageIndex];if(g.first===s.seg){showBanner(g.name,'제'+g.part+'부 · STAGE '+(s.stageIndex+1));play('seal');}}
      else if(e==='stageClear'){var r=s.results[s.results.length-1];recordResult(r);showToast(r);rushStage=false;}
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

  // 그림이 없으면(아직 받는 중이거나 없는 그림) 색 도형으로 대신 그린다.
  function drawArt(key,x,y,flashOn,fallbackColor,phase,motion,face,sizeKey){
    var tall=tallOf(sizeKey||key);
    if(motion&&images[key+'@'+motion])key=key+'@'+motion;
    var flip=face<0&&facesRight(key); // 옆모습 그림은 오른쪽을 본다. 왼쪽으로 갈 때만 뒤집는다.
    var img=images[key];
    if(!img){
      ctx.save();ctx.globalAlpha=flashOn?.9:.6;ctx.strokeStyle=fallbackColor||'#ffffff';ctx.fillStyle='rgba(10,8,20,.7)';ctx.lineWidth=2;
      var r=tall*.32;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.8,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.8,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
    }
    // 화면 높이는 칸 높이 기준(시트 전체 너비가 아니라 칸 비율).
    var w=tall*cellRatio(key,img);
    if(flip){ctx.save();ctx.translate(x,0);ctx.scale(-1,1);x=0;}
    drawCell(key,img,phase,false,x-w/2,y-tall/2,w,tall);
    if(flashOn){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;drawCell(key,img,phase,false,x-w/2,y-tall/2,w,tall);ctx.restore();}
    else if(sizeKey){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.24;drawCell(key,img,phase,false,x-w/2,y-tall/2,w,tall);ctx.restore();} // 잡몹은 원화가 어두워 배경에 묻힌다. 한 번 더 옅게 덧그려 밝힌다.
    if(flip)ctx.restore();
  }
  /* 움직임으로 동작을 고른다(시뮬은 건드리지 않는다). 방금 쏜 몹은 공격, 옆으로 가는 몹은 옆 걷기(스트립은 오른쪽을 본다), 그 밖에는 아래로 걷기. */
  var poses=typeof WeakMap==='function'?new WeakMap():null,bossPose={x:0,n:0,until:0,dir:0,actor:''};
  function poseOf(s,m){
    if(!poses)return null;var p=poses.get(m);
    if(!p){p={x:m.x,y:m.y,shots:m.shots|0,until:-1,dir:0,side:0};poses.set(m,p);}
    if((m.shots|0)>p.shots){p.shots=m.shots|0;p.until=s.tick+26;}
    var dx=m.x-p.x,dy=m.y-p.y;p.x=m.x;p.y=m.y;
    if(Math.abs(dx)>Math.abs(dy)*1.15&&Math.abs(dx)>.35){p.side=8;p.dir=dx<0?-1:1;}else if(p.side>0)p.side--;
    return p;
  }
  function drawBoss(s){
    var b=s.boss;if(!b.present||b.y<-50)return;
    var bob=Math.sin(visual*2.2)*4,size=(b.mid?150:190)+Math.sin(visual*1.3)*10,bx=finite(b.x,W/2),by=finite(b.y,120)+bob;
    ctx.save();ctx.translate(bx,by);ctx.rotate(visual*.5);ctx.globalAlpha=s.stage==='card'?.45:.2;ctx.globalCompositeOperation='lighter';
    ctx.drawImage(circleSprite,-size/2,-size/2,size,size);ctx.restore();
    var bp=bossPose;if(bp.actor!==b.actor){bp.actor=b.actor;bp.x=bx;bp.n=s.n;bp.until=-1;bp.side=0;}
    var bdx=bx-bp.x;bp.x=bx;if(Math.abs(bdx)>.3){bp.side=10;bp.dir=bdx<0?-1:1;}else if(bp.side>0)bp.side--;
    if(s.stage==='card'&&s.n-bp.n>=6)bp.until=s.tick+56;bp.n=s.n; // 탄을 한꺼번에 뿌린 순간이 공격 동작
    var bm=s.tick<bp.until&&images[b.actor+'@attack']?'attack':bp.side>0?'side':'';
    drawArt(b.actor,bx,by,s.tick-b.hitTick<3,themeColor(s),0,bm,bp.dir||(bx>W/2?-1:1));
  }
  /* 몹 뒤에 까는 부드러운 빛(테두리 없는 원). 어두운 배경에서 어두운 몹의 윤곽이 뜨게 한다. */
  var haloImage=null;
  function haloSprite(){
    if(haloImage)return haloImage;
    var d=offscreen(128,128),q=d.getContext('2d'),g=q.createRadialGradient(64,64,4,64,64,64);
    g.addColorStop(0,'rgba(214,226,255,.95)');g.addColorStop(.55,'rgba(170,190,240,.38)');g.addColorStop(1,'rgba(150,170,230,0)');q.fillStyle=g;q.fillRect(0,0,128,128);haloImage=d;return d;
  }
  function drawMobs(s){
    var tint=Arcade.PALETTE[s.stageIndex%Arcade.PALETTE.length],color=themeColor(s);
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i],glow=orbs[2][tint],reach=m.r*1.5;if(m.x!==m.x||m.y!==m.y)continue;var art=skinOf(s.stageIndex,m.kind);if(!images[art]){ctx.globalAlpha=.3;ctx.drawImage(glow.image,m.x-reach,m.y-reach,reach*2,reach*2);ctx.globalAlpha=1;}else{var tl=tallOf(m.kind),halo=tl*.82;ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(m.x,m.y+tl*.47,tl*.3,tl*.085,0,0,TAU);ctx.fill();ctx.globalAlpha=.34;ctx.drawImage(haloSprite(),m.x-halo,m.y-halo,halo*2,halo*2);ctx.globalAlpha=1;} /* 어두운 배경에서 몹이 묻히지 않게 뒤에 옅은 빛만 깐다 */var po=poseOf(s,m),mo=po&&s.tick<po.until&&images[art+'@attack']?'attack':po&&po.side>0?'side':'';drawArt(art,m.x,m.y+Math.sin(visual*4+i)*2,s.tick-m.hitTick<3,color,Math.floor(finite(m.baseX,0)/9)+(m.elite?3:0),mo,(po&&po.dir)||(m.x>W/2?-1:1),m.kind);} // 시작 칸을 나온 자리로 어긋나게 해 떼가 똑같이 움직이지 않는다
  }
  function drawItems(s){
    // 하트가 고동친다. 드라이브 하트 그림(heart)이 있으면 점수 아이템은 그 그림으로.
    var beat=1+Math.sin(visual*7)*.08;
    for(var i=0;i<s.itemCount;i++){var z=ITEM_DRAW*beat*(s.ikind[i]?1.15:1);ctx.globalAlpha=s.iy[i]>H-150?.45:1;ctx.drawImage(itemSprites[s.ikind[i]],s.ix[i]-z/2,s.iy[i]-z/2,z,z);}ctx.globalAlpha=1; // 아래쪽 버튼·점수 자리에서는 흐리게
  }
  function drawProp(s,i,grow,alpha){
    var prop=Arcade.PROPS[s.bcolor[i]];if(!prop)return;
    var img=images[prop.key],x=s.bx[i],y=s.by[i];
    if(!img)requestProp(prop.key); // 기물은 처음 화면에 나타날 때 받는다
    // 십자가처럼 upright인 기물은 절대 돌리지 않는다. 도는 기물은 제자리에서 돌고, 그 밖에는 끝이 진행 방향을 본다.
    var turn=prop.upright?0:s.bspin[i]?s.bage[i]*s.bspin[i]:s.ba[i],cos=Math.cos(turn),sin=Math.sin(turn),core=orbs[0][8],glow=orbs[2][propGlow(prop)]||orbs[2][8],reach=glow.half*1.5*grow,long=propLong(prop)*s.sizeScale*grow;
    ctx.globalAlpha=alpha*.5;ctx.drawImage(glow.image,x-reach,y-reach,reach*2,reach*2);
    ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);ctx.globalAlpha=alpha;
    if(img){var sh=sheetOf(prop.key,img),k=long/Math.max(sh.cw,sh.ch),w=sh.cw*k,h=sh.ch*k;drawCell(prop.key,img,0,true,-w/2,-h/2,w,h);}
    else{
      // 그림을 받기 전: 길쭉한 마름모 단색 도형(upright 기물은 세로로 선다).
      var a=long/2,b=Math.max(4,(prop.radius||10)*.55)*s.sizeScale*grow;ctx.fillStyle=COLORS[propGlow(prop)]||'#e9e9ff';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.2;ctx.beginPath();
      if(prop.upright){ctx.moveTo(0,-a);ctx.lineTo(b,0);ctx.lineTo(0,a);ctx.lineTo(-b,0);}else{ctx.moveTo(a,0);ctx.lineTo(0,b);ctx.lineTo(-a,0);ctx.lineTo(0,-b);}
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    // 실제로 닿는 곳은 가운데 심뿐이다.
    ctx.globalAlpha=alpha;ctx.drawImage(core.image,x-core.half,y-core.half,core.half*2,core.half*2);ctx.globalAlpha=1;
  }
  function drawBullets(s){
    var bloom=Arcade.BLOOM_TICKS,i,o,half,size,x,y;
    for(i=0;i<s.n;i++){
      x=s.bx[i];y=s.by[i];if(s.bage[i]<bloom||x!==x||y!==y)continue;
      size=s.bsize[i];if(size===SHAPE_PROP){drawProp(s,i,1,1);continue;}
      o=orbs[size]&&orbs[size][s.bcolor[i]];if(!o)continue;half=o.half;
      if(size===SHAPE_RICE){var a=finite(s.ba[i],0),cos=Math.cos(a),sin=Math.sin(a);ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);ctx.drawImage(o.image,-half,-half,half*2,half*2);ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);}
      else ctx.drawImage(o.image,x-half,y-half,half*2,half*2);
    }
    // 갓 피어나는 탄: 크고 옅게 시작해 제 크기로 조여 든다(이때는 닿지 않는다).
    for(i=0;i<s.n;i++){
      var age=s.bage[i];x=s.bx[i];y=s.by[i];if(age>=bloom||x!==x||y!==y)continue;
      var t=age/bloom;size=s.bsize[i];
      if(size===SHAPE_PROP){drawProp(s,i,1.5-.5*t,.25+.6*t);continue;}
      o=orbs[size]&&orbs[size][s.bcolor[i]];if(!o)continue;half=o.half*(2.4-1.4*t);ctx.globalAlpha=.25+.6*t;ctx.drawImage(o.image,x-half,y-half,half*2,half*2);
    }
    ctx.globalAlpha=1;
  }
  /* 광선. 예고: 가는 점선이 굵어지며 깜빡인다 → 발사: 색 빛무리 + 흰 심 → 잔광: 가늘어지며 사라진다. */
  function drawLasers(s){
    if(!s.lasers.length)return;
    ctx.save();ctx.lineCap='butt';
    for(var i=0;i<s.lasers.length;i++){
      var l=s.lasers[i],color=COLORS[l.color]||'#ffffff',angle=finite(l.angle,0),lx=finite(l.x,0),ly=finite(l.y,0),x2=lx+Math.cos(angle)*1000,y2=ly+Math.sin(angle)*1000;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x2,y2);
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
    ctx.globalAlpha=blink?.35:.95;
    if(images.gunner)ctx.drawImage(images.gunner,p.x-258.5369*57/512,p.y-283.8754*57/512,57,57);
    else{ctx.fillStyle='#9fefff';ctx.beginPath();ctx.moveTo(p.x,p.y-16);ctx.lineTo(p.x+10,p.y+12);ctx.lineTo(p.x-10,p.y+12);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;
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
  function starText(n){var out='';for(var i=0;i<3;i++)out+=i<n?'★':'☆';return out;}
  // 스테이지를 깼다: 이름 한 줄 + 별 + 기념물 그림. 게임은 멈추지 않는다.
  function drawToast(){
    if(!toast)return;
    var t=toast.t/TOAST_SECONDS,alpha=t>.85?(1-t)/.15:t<.25?t/.25:1,y=74;
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
    ctx.fillStyle='rgba(6,4,16,.78)';ctx.fillRect(40,y,W-80,64);ctx.fillStyle=toast.color;ctx.fillRect(40,y,W-80,1.5);ctx.fillRect(40,y+62.5,W-80,1.5);
    if(toast.img){var h=54,w=h*cellRatio(toast.key,toast.img);if(w>60){h*=60/w;w=60;}drawCell(toast.key,toast.img,0,false,48+(60-w)/2,y+5+(54-h)/2,w,h);}
    else{ctx.strokeStyle=toast.color;ctx.lineWidth=1.2;ctx.strokeRect(54,y+10,44,44);}
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='600 15px '+SERIF;ctx.fillStyle='#fff3cf';
    var name=toast.name;while(name.length>2&&ctx.measureText(name).width>W-80-84)name=name.slice(0,-1);ctx.fillText(name===toast.name?name:name+'…',116,y+28);
    ctx.font='18px '+SANS;ctx.fillStyle='#ffd86a';ctx.fillText(starText(toast.stars),116,y+51);
    ctx.restore();
  }
  function drawHud(s){
    var b=s.boss,seg=Arcade.SEGMENTS[s.seg],color=themeColor(s),left=Arcade.timeLeft(s),stage=Arcade.STAGES[s.stageIndex],i;
    var top=ctx.createLinearGradient(0,0,0,96);top.addColorStop(0,'rgba(4,4,12,.9)');top.addColorStop(.6,'rgba(4,4,12,.55)');top.addColorStop(1,'rgba(4,4,12,0)');ctx.fillStyle=top;ctx.fillRect(0,0,W,96);
    ctx.textBaseline='alphabetic';
    if(s.stage==='card'&&seg){
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(12,9,W-24,4);ctx.fillStyle=b.hp/b.maxHp<=.2?'#ff5a5a':color;ctx.fillRect(12,9,(W-24)*Math.max(0,Math.min(1,finite(b.hp/b.maxHp,0))),4);
      if(seg.spell){
        ctx.textAlign='right';ctx.font='600 20px '+SANS;ctx.fillStyle=left<=10?'#ff6a6a':'#ffffff';ctx.fillText(left<10?left.toFixed(1):String(Math.ceil(left)),W-12,35);
        ctx.font='italic 12px '+SERIF;ctx.fillStyle='#f3e3b5';ctx.fillText('「'+seg.name+'」',W-12,52);
      }
    }
    ctx.textAlign='left';ctx.font='600 12px '+SANS;ctx.fillStyle=color;ctx.fillText(b.present?b.name:stage.name,12,29);
    ctx.font='11px '+SANS;ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText(s.bossOnly?'보스 체험 · 제'+stage.part+'부':'STAGE '+(s.stageIndex+1)+' / '+Arcade.STAGES.length,12,45);
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
    drawToast();
  }
  function draw(elapsed){
    var s=state;ctx.setTransform(scale,0,0,scale,0,0);
    if(!s){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);return;}
    if(fxStage!==s.stageIndex)initFx(themeOf(s.stageIndex).fx,s.stageIndex);
    if(mode==='playing')updateFx(Math.min(.05,elapsed));
    offsetX=offsetY=0;if(shake>0){offsetX=(Math.random()-.5)*shake*.7;offsetY=(Math.random()-.5)*shake*.7;shake--;}
    ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    // 순서: 배경 → 날씨 → 인물·몹 → 영웅 탄 → 영웅 → 장식 이펙트 → 아이템 → 광선 → 적 탄 → 판정점
    drawBackground(s);drawFx();drawBoss(s);drawMobs(s);drawShots(s);drawPlayer(s);drawParticles();drawItems(s);drawLasers(s);drawBullets(s);drawHitbox(s);
    ctx.restore();ctx.setTransform(scale,0,0,scale,0,0);drawHud(s);
    if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash*.8)+')';ctx.fillRect(0,0,W,H);flash-=.04;}
    if(hurtFlash>0){var v=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,420);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,'rgba(255,0,40,'+(hurtFlash*.6)+')');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);hurtFlash-=.035;}
    if(banner>0)banner-=1/95;
    if(toast&&mode==='playing'){toast.t-=Math.min(.05,elapsed);if(toast.t<=0)toast=null;}
  }

  function inputForStep(){
    var focus=!!keys.Shift||focusHeld,bomb=bombQueued;bombQueued=false;
    var speed=focus?1.8:4.2,x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),y=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
    if(x||y){var n=Math.sqrt(x*x+y*y);return {dx:x/n*speed,dy:y/n*speed,focus:focus,bomb:bomb};}
    // 터치: 영웅이 손가락 조금 위에 뜬다. 손가락이 영웅과 판정점을 가리지 않는다.
    if(finger.active&&state){var p=state.player;return {dx:finite(finger.x-p.x,0),dy:finite(finger.y-FINGER_LIFT-p.y,0),focus:focus,bomb:bomb};}
    return {dx:0,dy:0,focus:focus,bomb:bomb};
  }
  // 디버그 가속: 이 스테이지를 빨리 끝낸다(무적, 잡몹 구간은 대본 끝으로, 보스는 바로 쓰러진다).
  function rushTick(s){
    s.player.invulnerableUntil=s.tick+999;
    var seg=Arcade.SEGMENTS[s.seg];
    if(s.stage==='wave'&&seg&&s.segTick<seg.duration){s.segTick=seg.duration;s.mobs.length=0;}
    if(s.stage==='card')s.boss.hp=0;
    if(s.stage==='intro'||s.stage==='break')s.stageTick+=40;
  }
  function frame(stamp){
    requestAnimationFrame(frame);
    if(!lastStamp)lastStamp=stamp;var elapsed=finite(Math.min(.1,Math.max(0,(stamp-lastStamp)/1000)),0);lastStamp=stamp;visual+=elapsed;
    if(mode==='playing'&&state){
      adaptQuality(elapsed*1000);accumulator=Math.min(accumulator+elapsed,4/60);
      var steps=0,limit=turbo||rushStage?Math.max(4,turbo||60):4;if(turbo||rushStage)accumulator=limit/60;
      while(accumulator>=1/60&&steps<limit&&mode==='playing'){if(rushStage)rushTick(state);Arcade.step(state,inputForStep());accumulator-=1/60;steps++;consume();}
    }
    draw(elapsed);
  }

  /* ── 메뉴 ── */
  function show(id,on){var el=$(id);if(el)el.hidden=!on;}
  var SCREENS={title:'arcade-title',paused:'arcade-pause',result:'arcade-result',keepsakes:'arcade-keepsake-screen',boss:'arcade-boss-screen'};
  function setMode(next){
    mode=next;Object.keys(SCREENS).forEach(function(k){show(SCREENS[k],k===next);});
    ['arcade-pause-button','arcade-focus','arcade-bomb'].forEach(function(id){show(id,next==='playing');});
    if(next!=='playing'){focusHeld=false;finger.active=false;bombQueued=false;}
    if(next!=='keepsakes')clearKeepsakes();
    if(music){if(next==='playing'&&soundOn){var p=music.play();if(p&&p.catch)p.catch(function(){});}else music.pause();}
  }
  /* run: {stage, bossOnly}. 원큐: 그 스테이지부터 끝까지 이어진다. */
  function start(run){
    if(fx)fx.unlock();
    run={stage:Math.max(0,Math.min(Arcade.STAGES.length-1,run&&run.stage|0)),bossOnly:!!(run&&run.bossOnly),segment:run&&run.segment};
    lastRun=run;
    var options={difficulty:difficulty,seed:(Date.now()^Math.floor(performance.now()*1000))>>>0,stage:run.stage,compact:compact,bossOnly:run.bossOnly};
    if(Number.isInteger(run.segment))options.segment=run.segment;
    state=Arcade.createRun(options);
    buildSprites();loadStage(state.stageIndex);fxStage=-1;
    particles.length=0;flash=hurtFlash=shake=banner=0;shock=null;toast=null;accumulator=0;lastStamp=0;framesSeen=0;rushStage=false;setMode('playing');
  }
  function finish(){
    var s=state,won=s.stage==='won';rushStage=false;
    if(s.score>best){best=s.score;try{global.localStorage.setItem(BEST_KEY,String(best));}catch(e){}}
    var stars=0;s.results.forEach(function(r){stars+=r.stars;});
    $('result-title').textContent=won?(s.bossOnly?'BOSS CLEAR':s.stageIndex>=Arcade.STAGES.length-1?'ALL CLEAR':'CLEAR'):'GAME OVER';
    $('result-score').textContent=pad(s.score);$('result-best').textContent=pad(best);
    $('result-detail').textContent=(won?'':'STAGE '+(s.stageIndex+1)+' '+Arcade.STAGES[s.stageIndex].name+' · ')+'깬 스테이지 '+s.results.length+' · 별 '+stars+' · 패턴 보너스 '+s.captures+' · 피격 '+s.hits;
    var retry=$('arcade-retry');
    if(!won){retry.hidden=false;retry.textContent='이 스테이지부터 다시';retry.dataset.stage=String(s.stageIndex);}
    else if(s.bossOnly){retry.hidden=false;retry.textContent='한 번 더';retry.dataset.stage=String(s.rushStage);}
    else retry.hidden=true;
    retry.dataset.boss=s.bossOnly?'1':'';
    $('arcade-home').className=retry.hidden?'primary':'';
    setTimeout(function(){if(state===s)setMode('result');},won?1500:900);
  }
  function pause(){if(mode==='playing')setMode('paused');}
  function goTitle(){if(loadedStage>=0)releaseStage(loadedStage,-1);state=null;toast=null;refreshTitle();setMode('title');}
  function bossStages(){return Arcade.STAGES.filter(function(g){return g.kind==='boss'&&progress.cleared.indexOf(g.index)>=0;});}
  function actorNames(index){var names=[];Arcade.SEGMENTS.forEach(function(seg){if(seg.stage===index&&seg.kind==='card'){var who=Arcade.ACTORS[seg.actor],n=who?who.name:seg.actor;if(names.indexOf(n)<0)names.push(n);}});return names;}
  // 스테이지 선택: 부별로 묶고, 잠긴 스테이지는 고를 수 없다. 깬 스테이지에는 별을 단다.
  function fillStages(){
    var select=$('arcade-stage-select'),open=Progress.unlocked(progress),groups={},resume=Progress.resume(progress);select.textContent='';
    Arcade.STAGES.forEach(function(g,i){
      var group=groups[g.part];if(!group){group=groups[g.part]=document.createElement('optgroup');group.label='제'+g.part+'부';select.appendChild(group);}
      var option=document.createElement('option'),done=progress.cleared.indexOf(i)>=0,can=Progress.canPlay(progress,i);option.value=String(i);
      option.textContent=(i+1)+'. '+g.name+(done?' '+starText(progress.stars[i]||1):can?'':' · 잠김');option.disabled=!can;
      group.appendChild(option);
    });
    select.value=String(Math.min(open,resume));
    var boss=$('arcade-boss-select'),list=bossStages();boss.textContent='';
    list.forEach(function(g){var option=document.createElement('option');option.value=String(g.index);option.textContent='제'+g.part+'부 · '+g.name+' — '+actorNames(g.index).join(' → ');boss.appendChild(option);});
    boss.disabled=!list.length;$('arcade-boss-start').disabled=!list.length;
    $('mode-note').textContent=list.length?'고른 스테이지의 중간 보스와 보스만 연달아 싸웁니다.':'보스 스테이지를 깨면 여기서 다시 싸울 수 있습니다.';
  }
  function refreshTitle(){
    var any=progress.cleared.length>0,resume=Progress.resume(progress),cont=$('arcade-continue'),begin=$('arcade-start');
    cont.hidden=!any;cont.textContent='이어하기 · STAGE '+(resume+1);
    $('continue-note').textContent=any?Arcade.STAGES[resume].name:'';$('continue-note').hidden=!any;
    cont.className=any?'primary':'';begin.className=any?'':'primary';
    $('title-best').textContent=pad(best);$('title-stars').textContent=String(Progress.totalStars(progress));$('title-stars-max').textContent=String(Arcade.STAGES.length*3);
    $('arcade-keepsakes').textContent='기념물 '+progress.rewards.length+'/'+Arcade.STAGES.length;
    $('save-note').hidden=saveOk;
    fillStages();
  }
  function setDifficulty(next){
    if(!Arcade.DIFFICULTY[next])next='normal';difficulty=next;$('difficulty-note').textContent=NOTES[difficulty];
    document.querySelectorAll('[data-difficulty]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.difficulty===difficulty));});
  }
  // 기념물 격자: 얻은 것만 그림을 보이고, 못 얻은 칸은 가린다. 화면을 닫으면 그림을 버린다.
  function openKeepsakes(){
    var grid=$('arcade-keepsake-grid');grid.textContent='';
    Arcade.STAGES.forEach(function(g){
      var cell=document.createElement('div'),got=progress.rewards.indexOf(g.reward.key)>=0;cell.className='keepsake'+(got?'':' locked');
      if(got){
        cell.title=g.reward.name;cell.setAttribute('aria-label',g.reward.name);
        var key='reward-'+g.reward.key;
        var e=manifest&&manifest[fileOf(key).slice(ART_DIR.length)],frames=e&&Math.floor(Number(e.frames));
        if(frames>1&&e.cell&&!failed[key]){var art=document.createElement('div');art.className='sheet';art.style.backgroundImage='url("'+fileOf(key)+'")';art.style.backgroundSize=(frames*100)+'% 100%';art.style.aspectRatio=Number(e.cell[0])+'/'+Number(e.cell[1]);cell.appendChild(art);}
        else if(listed(key)&&!failed[key]){var img=document.createElement('img');img.alt=g.reward.name;img.decoding='async';img.loading='lazy';img.onerror=function(){failed[key]=true;img.remove();cell.textContent=g.reward.name;};img.src=fileOf(key);cell.appendChild(img);}
        else cell.textContent=g.reward.name;
      }else{cell.textContent='?';cell.setAttribute('aria-label','아직 얻지 못함');}
      grid.appendChild(cell);
    });
    $('keepsake-count').textContent=progress.rewards.length+' / '+Arcade.STAGES.length;
    setMode('keepsakes');
  }
  function clearKeepsakes(){var grid=$('arcade-keepsake-grid');if(grid&&grid.firstChild)grid.textContent='';}
  function fieldPoint(e){var rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};}
  function bind(){
    document.querySelectorAll('[data-difficulty]').forEach(function(button){button.addEventListener('click',function(){setDifficulty(button.dataset.difficulty);progress.difficulty=difficulty;saveProgress();});});
    $('arcade-continue').addEventListener('click',function(){start({stage:Progress.resume(progress)});});
    $('arcade-start').addEventListener('click',function(){start({stage:0});});
    $('arcade-stage-go').addEventListener('click',function(){var i=Number($('arcade-stage-select').value);if(Progress.canPlay(progress,i))start({stage:i});});
    $('arcade-boss-open').addEventListener('click',function(){fillStages();setMode('boss');});
    $('arcade-boss-start').addEventListener('click',function(){var i=Number($('arcade-boss-select').value),g=Arcade.STAGES[i];if(g&&g.kind==='boss'&&progress.cleared.indexOf(i)>=0)start({stage:i,bossOnly:true});});
    $('arcade-boss-back').addEventListener('click',function(){setMode('title');});
    $('arcade-keepsakes').addEventListener('click',openKeepsakes);
    $('arcade-keepsake-back').addEventListener('click',function(){setMode('title');});
    $('arcade-retry').addEventListener('click',function(){var i=Number(this.dataset.stage)||0;start({stage:i,bossOnly:this.dataset.boss==='1'});});
    $('arcade-home').addEventListener('click',goTitle);
    $('arcade-resume').addEventListener('click',function(){if(fx)fx.unlock();accumulator=0;lastStamp=0;setMode('playing');});
    $('arcade-pause-button').addEventListener('click',pause);
    $('arcade-quit').addEventListener('click',goTitle);
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
    document.addEventListener('keydown',function(e){var key=e.key.length===1?e.key.toLowerCase():e.key;if(key==='Escape'||key===' '){if(mode==='playing'||mode==='paused')e.preventDefault();if(mode==='playing')pause();else if(mode==='paused')$('arcade-resume').click();return;}
      if(key==='x'&&mode==='playing'&&!e.repeat){bombQueued=true;return;}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift'].indexOf(key)>=0){if(mode==='playing')e.preventDefault();keys[key]=true;}});
    document.addEventListener('keyup',function(e){delete keys[e.key.length===1?e.key.toLowerCase():e.key];});
    document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
    global.addEventListener('blur',function(){keys={};pause();});global.addEventListener('resize',fit);
  }
  function ready(){var b=$('arcade-start');if(!b.disabled)return;b.disabled=false;b.textContent='처음부터';}
  function boot(){
    loadProgress();setDifficulty(progress.difficulty);
    try{fx=global.HapilAudio&&global.HapilAudio.create?global.HapilAudio.create():null;}catch(e){fx=null;}
    try{music=new Audio('media/music.mp3');music.loop=true;music.volume=.2;music.preload='none';}catch(e){music=null;}
    bind();fit();refreshTitle();requestAnimationFrame(frame);
    // 그림 목록을 먼저 읽는다(없는 그림을 요청하지 않으려고). 못 읽어도 3초 뒤에는 시작할 수 있다.
    var done=function(){loadImage('gunner');if(manifest&&manifest['heart.webp']){want.heart=true;loadImage('heart');}ready();};
    try{
      global.fetch(ART_DIR+'manifest.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(m){manifest=m&&typeof m==='object'?m:null;done();},function(){manifest=null;done();});
    }catch(e){done();}
    setTimeout(done,3000);
  }
  function snapshot(){return {mode:mode,scale:scale,lite:lite,compact:compact,frameMs:frameMs,bullets:state?state.n:0,stage:state?state.stage:'',stageIndex:state?state.stageIndex:-1,seg:state?state.seg:-1,
    hp:state?state.player.hp:0,score:state?state.score:0,particles:particles.length,images:Object.keys(images).sort(),loading:Object.keys(loading).sort(),loadedStage:loadedStage,
    fx:{kind:fxKind,count:fxCount,pool:FX_POOL},toast:toast?{name:toast.name,stars:toast.stars,hasArt:!!toast.img}:null,difficulty:difficulty,saveOk:saveOk};}
  /* 디버그 훅(헤드리스 검증용): 상태를 읽고, 스테이지·구간으로 건너뛰고, 진행 기록을 본다. */
  global.HapilArcadeApp={
    getState:snapshot,
    debugState:function(){
      return {state:state,app:snapshot(),progress:JSON.parse(JSON.stringify(progress)),saved:(function(){try{return global.localStorage.getItem(SAVE_KEY);}catch(e){return null;}})(),
        jumpStage:function(i,bossOnly){start({stage:i,bossOnly:!!bossOnly});return snapshot();},
        jumpSegment:function(i){var seg=Arcade.SEGMENTS[i];if(!seg)return null;start({stage:seg.stage,segment:i});return snapshot();},
        finishStage:function(){if(state&&mode==='playing')rushStage=true;return snapshot();},
        turbo:function(n){turbo=Math.max(0,Math.min(600,n|0));return turbo;},
        lose:function(){if(!state||mode!=='playing')return null;state.player.hp=0;state.stage='lost';state.stageTick=0;state.events.push('lose');consume();return snapshot();},
        setTheme:function(theme){if(!state)return null;themeOverride=theme?{stage:state.stageIndex,bg:theme.bg,tint:theme.tint,fx:theme.fx}:null;backgroundStage=-1;fxStage=-1;return snapshot();},
        sheet:function(key){var img=images[key];if(!img)return null;var x=sheetOf(key,img);return {frames:x.frames,cw:x.cw,ch:x.ch,fps:x.fps,width:img.width,height:img.height};},
        stageKeys:stageKeys,weather:Object.keys(WEATHER)};
    }
  };
  boot();
})(window);
