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
  var ITEM_DRAW=17,TALL_ACTOR=116,TALL_MOB=64,TALL_ELITE=92;
  var PROP_LONG={'sword-violet':68,cleaver:64,'sword-balrog':72,obelisk:80,spire:72,'twin-blade':62,crescent:58,tissue:34,money:36,heel:40,feather:44,cross:60,gear:56,skull:34,'demon-hand':46};
  var PROP_GLOW={'sword-violet':2,cleaver:5,'sword-balrog':0,obelisk:2,spire:4,'twin-blade':8,crescent:4,tissue:6,money:6,heel:0,feather:8,cross:6,gear:4};
  var ART_DIR='media/arcade-v43/';
  var SERIF='"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var SLOW_FRAME_MS=21,VERY_SLOW_FRAME_MS=28,MAX_PARTICLES=320,FINGER_LIFT=64,TOAST_SECONDS=1.6;
  var SHAPE_RICE=3,SHAPE_BUBBLE=4,SHAPE_PROP=Arcade.SHAPE_PROP;
  var NOTES={gentle:'목숨 7 · 폭탄 3 · 스테이지마다 전부 회복 · 느린 탄 · 아주 작은 피격점',normal:'목숨 3 · 폭탄 2 · 스테이지마다 1 회복',hell:'목숨 1 · 폭탄 1 · 회복 없음 · 빽빽한 탄 · 격자 광선 동시'};

  var images={},loading={},failed={},want={},manifest=null,orbs=[],shotSprite=null,homingSprite=null,circleSprite=null,itemSprites=[],background=null,backgroundStage=-1,loadedStage=-1;
  var scale=1,lite=false,frameMs=16,framesSeen=0,offsetX=0,offsetY=0;
  var state=null,mode='title',difficulty='normal',accumulator=0,lastStamp=0,visual=0,lastRun=null;
  var particles=[],flash=0,hurtFlash=0,shake=0,shock=null,banner=0,bannerTick=0,BANNER_TICKS=80,SPELL_BANNER_TICKS=42,bannerSpell=false,bannerTitle='',bannerSub='',toast=null;
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
  function propGlow(prop){var g=prop.glow!==undefined?prop.glow:PROP_GLOW[prop.key];return g===undefined?Arcade.PALETTE[hash(prop.key)%Arcade.PALETTE.length]:g;}

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
  var skins=(typeof ArcadeSkins==='object'&&ArcadeSkins)||{},FRONT=skins.front||{}; // 아래로 걷는 정면 그림만 모은 목록이 있으면 그것을 쓴다(옆모습 몹이 아래로 미끄러지지 않게)
  function skinsOf(index){var g=Arcade.STAGES[index],list=g&&(FRONT[g.scene]&&FRONT[g.scene].length?FRONT[g.scene]:SKINS[g.scene]);return list&&list.length?list:null;}
  function skinOf(index,kind){
    var list=skinsOf(index);if(!list)return kind;
    var g=Arcade.STAGES[index],at=(g.cast||[]).indexOf(kind);if(at<0){at=0;for(var i=0;i<kind.length;i++)at+=kind.charCodeAt(i);}
    var key=list[at%list.length];return images[key]?key:(images[kind]?kind:key);
  }
  function facesRight(key){var e=manifest&&manifest[key+'.webp'];return !!e&&e.facing==='right';}
  function stageKeys(index){
    var g=Arcade.STAGES[index];if(!g)return [];
    var list=[],add=function(k){if(k&&list.indexOf(k)<0)list.push(k);};
    var bg=themeOf(index).bg,lp=loopOf(index);if(lp)add(lp);else if(bg)add('bg-'+bg); // 드라이브 세로 맵(위아래가 이어지게 만든 그림)이 있으면 그것만 받는다
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
    // 몸통: 가운데 흰 심 → 밝은 색 → 제 색 → 가장자리 짙은 색(보석처럼 깊이가 생긴다, 사용자 요청 11-14 동방식 탄 미감)
    var body=g.createRadialGradient(m-r*.18,m-r*.18,0,m,m,r),light=mix(color,'#ffffff',.55),deep=mix(color,'#000000',.35);
    body.addColorStop(0,'#ffffff');body.addColorStop(.28,light);body.addColorStop(.62,color);body.addColorStop(1,deep);
    g.fillStyle=body;g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.strokeStyle='#ffffff';g.lineWidth=Math.max(1,r*.2);g.beginPath();g.arc(m,m,r-g.lineWidth/2,0,TAU);g.stroke();
    if(r>=4*scale){g.globalAlpha=.75;g.fillStyle='#ffffff';g.beginPath();g.ellipse(m-r*.34,m-r*.38,r*.24,r*.14,-.7,0,TAU);g.fill();g.globalAlpha=1;} // 작은 하이라이트
    return {image:c,half:reach};
  }
  /* 두 색을 섞는다(#rrggbb). */
  function mix(a,b,t){var pa=parseInt(a.slice(1,7),16),pb=parseInt(b.slice(1,7),16),out='#';for(var k=16;k>=0;k-=8){var x=Math.round(((pa>>k)&255)*(1-t)+((pb>>k)&255)*t);out+=('0'+x.toString(16)).slice(-2);}return out;}
  /* 스테이지마다 중간 구슬탄(크기 1)에 입히는 겉모양. 판정 원은 그대로이고 그림만 바뀐다. 동방식 탄막처럼 종류마다 실루엣이 달라 패턴이 서로 다르게 읽힌다. */
  var SKINS=['','star','scale','dagger','talisman'],skinSprites={};
  function skinVariant(s){var i=s.stageIndex|0;return SKINS[(i+Math.floor(i/5))%SKINS.length];} // 이웃 스테이지끼리 겹치지 않게 돌린다
  function buildSkin(kind,radius,color){
    var u=radius*1.9,reach=u*1.5,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale;
    g.translate(m,m);g.scale(scale,scale);
    var glow=g.createRadialGradient(0,0,radius*.6,0,0,reach);glow.addColorStop(0,color+'66');glow.addColorStop(1,color+'00');if(!lite){g.fillStyle=glow;g.fillRect(-reach,-reach,reach*2,reach*2);}
    var body=g.createLinearGradient(-u,-u,u,u);body.addColorStop(0,mix(color,'#ffffff',.6));body.addColorStop(.5,color);body.addColorStop(1,mix(color,'#000000',.35));
    g.fillStyle=body;g.strokeStyle='#ffffff';g.lineWidth=1.4;g.lineJoin='round';g.beginPath();
    if(kind==='star'){for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?u*.45:u;g[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();}
    else if(kind==='scale'){g.moveTo(u,0);g.quadraticCurveTo(0,-u*.85,-u*.8,-u*.35);g.lineTo(-u*.55,0);g.lineTo(-u*.8,u*.35);g.quadraticCurveTo(0,u*.85,u,0);g.closePath();} // 비늘(화살촉): +x가 진행 방향
    else if(kind==='dagger'){g.moveTo(u*1.15,0);g.lineTo(-u*.2,-u*.32);g.lineTo(-u*.3,-u*.6);g.lineTo(-u*.45,-u*.6);g.lineTo(-u*.45,-u*.2);g.lineTo(-u*.95,-u*.16);g.lineTo(-u*.95,u*.16);g.lineTo(-u*.45,u*.2);g.lineTo(-u*.45,u*.6);g.lineTo(-u*.3,u*.6);g.lineTo(-u*.2,u*.32);g.closePath();}
    else{g.rect(-u*.95,-u*.55,u*1.9,u*1.1);} // 부적: 진행 방향으로 누운 종이
    g.fill();g.stroke();
    if(kind==='talisman'){g.strokeStyle=mix(color,'#000000',.55);g.lineWidth=1;g.beginPath();g.arc(0,0,u*.3,0,TAU);g.moveTo(-u*.7,0);g.lineTo(-u*.3,0);g.moveTo(u*.3,0);g.lineTo(u*.7,0);g.stroke();} // 붓으로 그은 문양
    g.fillStyle='#ffffff';g.beginPath();g.arc(kind==='dagger'?u*.2:0,0,radius*.42,0,TAU);g.fill(); // 흰 심
    return {image:c,half:reach};
  }
  function skinOfBullet(kind,color){var key=kind+color;if(!skinSprites[key])skinSprites[key]=buildSkin(kind,Arcade.SIZE_RADIUS[1]*(state?state.sizeScale:compact?1.25:1),COLORS[color]);return skinSprites[key];}
  // 쌀알탄: 오른쪽(진행 방향)으로 길쭉한 알. 그릴 때 탄의 각도로 돌린다.
  function buildRice(radius,color){
    var longHalf=radius*2.6,reach=longHalf+3,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale;
    g.translate(m,m);g.scale(scale,scale);
    g.fillStyle='#ffffff';g.beginPath();g.ellipse(0,0,longHalf,radius,0,0,TAU);g.fill();
    var body=g.createLinearGradient(0,-radius,0,radius);body.addColorStop(0,mix(color,'#000000',.3));body.addColorStop(.5,mix(color,'#ffffff',.35));body.addColorStop(1,mix(color,'#000000',.3));
    g.fillStyle=body;g.beginPath();g.ellipse(0,0,longHalf-1.3,radius-1.1,0,0,TAU);g.fill(); // 가운데가 밝은 원통형 몸통
    g.fillStyle='#ffffff';g.globalAlpha=.9;g.beginPath();g.ellipse(longHalf*.12,0,longHalf*.5,Math.max(.6,radius*.28),0,0,TAU);g.fill();g.globalAlpha=1; // 흰 심줄
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
    grad.addColorStop(0,'#ffffff');grad.addColorStop(.35,'#fa800a');grad.addColorStop(1,'#fa800a00');g.fillStyle=grad;g.beginPath();g.ellipse(c.width/2,c.height/2,c.width*.32,c.height/2,0,0,TAU);g.fill();shotSprite=c;
    homingSprite=buildOrb(3,'#fa800a'); // 아군 샷은 주황: 적 탄 6색(빨강·보라·하늘·초록·노랑·흰색) 어느 것과도 헷갈리지 않는다(심사 3차)
    // 아이템: 점수(푸른 마름모)와 폭탄 조각(초록 마름모)
    // 아이템은 하트다: 점수는 장밋빛 하트, 폭탄 게이지는 금빛 하트. 흰 테두리는 적 탄의 문법이라 하트는 금빛 테두리로, 크기는 탄보다 작게(심사 6차).
    itemSprites=[['#c9406e','#f7b6cc','#f2c46d'],['#e0a52c','#fff0c0','#8a5a12']].map(function(c){var d=offscreen(ITEM_DRAW*scale,ITEM_DRAW*scale),q=d.getContext('2d');q.scale(scale,scale);q.translate(ITEM_DRAW/2,ITEM_DRAW/2);
      var u=ITEM_DRAW/26,g=q.createRadialGradient(0,0,2*u,0,0,13*u);g.addColorStop(0,c[1]);g.addColorStop(1,'rgba(255,255,255,0)');q.globalAlpha=.35;q.fillStyle=g;q.fillRect(-13*u,-13*u,26*u,26*u);q.globalAlpha=1;
      q.beginPath();q.moveTo(0,8*u);q.bezierCurveTo(-11*u,0,-9*u,-9*u,-4*u,-8*u);q.bezierCurveTo(-1.5*u,-8*u,0,-6*u,0,-4.5*u);q.bezierCurveTo(0,-6*u,1.5*u,-8*u,4*u,-8*u);q.bezierCurveTo(9*u,-9*u,11*u,0,0,8*u);q.closePath();
      q.fillStyle=c[0];q.fill();q.lineWidth=1.6*u;q.strokeStyle=c[2];q.lineJoin='round';q.stroke();
      q.fillStyle=c[1];q.globalAlpha=.9;q.beginPath();q.ellipse(-3.6*u,-4.6*u,1.9*u,1.2*u,-.6,0,Math.PI*2);q.fill();return d;});
    // 보스 뒤 마법진: 동심원 셋 + 눈금 + 육각별
    c=offscreen(220*scale,220*scale);g=c.getContext('2d');g.scale(scale,scale);g.translate(110,110);g.strokeStyle='#ffffff';g.lineWidth=1.6;
    [104,92,60].forEach(function(r){g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();});
    g.lineWidth=1;for(var i=0;i<36;i++){var a=TAU*i/36;g.beginPath();g.moveTo(Math.cos(a)*92,Math.sin(a)*92);g.lineTo(Math.cos(a)*(i%3?98:104),Math.sin(a)*(i%3?98:104));g.stroke();}
    for(var k=0;k<2;k++){g.beginPath();for(var j=0;j<3;j++){var b=TAU*j/3+k*Math.PI/3-Math.PI/2;g[j?'lineTo':'moveTo'](Math.cos(b)*92,Math.sin(b)*92);}g.closePath();g.stroke();}
    circleSprite=c;
    fxSprite=null;skinSprites={};runeRings={};
  }

  /* ── 배경: 탄보다 어둡고 흐리게. 원화가 있으면 줄여 흐리게 + 색조 + 어둡게, 없으면 색조로 만든 무늬 배경. 위아래로 이어지게 그린다. ── */
  /* 드라이브 세로 맵: tools/build-vmaps-v43.py가 워터마크를 지우고 위아래가 이어지게 만든 bg-loop-<장면>.jpg. 제 비율 그대로 이어 붙여 흘린다. */
  function loopOf(index){var g=Arcade.STAGES[index],k=g&&'bg-loop-'+g.scene;return k&&manifest&&manifest[k+'.jpg']&&manifest[k+'.jpg'].loop?k:'';}
  var backgroundTall=H+160;
  /* 플레이 칸 밖(모바일 위아래, PC 좌우)에 이 스테이지 그림을 흐리고 어둡게 깐다. */
  var bleedKey='';
  function setBleed(index){
    var el=global.document&&global.document.getElementById('arcade-bleed');if(!el)return;
    var k=loopOf(index)||('bg-'+themeOf(index).bg);if(k===bleedKey)return;bleedKey=k;
    el.style.backgroundImage=k&&k!=='bg-'?'url("'+fileOf(k)+'")':'none';
  }
  function buildBackground(index){
    setBleed(index);
    var lk=loopOf(index),limg=lk&&images[lk];
    if(limg){
      if(background){background.width=background.height=0;background=null;}
      var lt=Math.max(120,Math.round(W*limg.height/limg.width)),lc=offscreen(W,lt),lg=lc.getContext('2d');
      lg.drawImage(limg,0,0,W,lt);
      lg.globalCompositeOperation='color';lg.globalAlpha=.22;lg.fillStyle=tintOf(index);lg.fillRect(0,0,W,lt); // 테마 색을 옅게만 입힌다(원화 색을 살린다)
      lg.globalCompositeOperation='source-over';lg.globalAlpha=1;lg.fillStyle='rgba(5,5,14,.56)';lg.fillRect(0,0,W,lt); // 탄이 읽히도록 어둡게 누른다
      background=lc;backgroundTall=lt;backgroundStage=index;return;
    }
    backgroundTall=H+160;
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
    if(img){ // 옛 배경(위아래가 이어지지 않는 그림): 아래 띠를 위쪽에 서서히 섞어 붙이고 그만큼 줄여 이음매를 없앤다
      var B=Math.round(tall*.22),band=offscreen(W,B),bg2=band.getContext('2d');bg2.drawImage(c,0,tall-B,W,B,0,0,W,B);
      var fade=bg2.createLinearGradient(0,0,0,B);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');bg2.globalCompositeOperation='destination-in';bg2.fillStyle=fade;bg2.fillRect(0,0,W,B);
      var c2=offscreen(W,tall-B),g2=c2.getContext('2d');g2.drawImage(c,0,0);g2.drawImage(band,0,0);c.width=c.height=0;c=c2;backgroundTall=tall-B;
    }
    background=c;backgroundStage=index;
  }
  function drawBackground(s){
    if(backgroundStage!==s.stageIndex||!background)buildBackground(s.stageIndex);
    // 아래로 흐르는 배경: 같은 그림을 위아래로 이어 붙여 끝없이 내린다.
    var tall=backgroundTall,y=(visual*14)%tall;for(var yy=y-tall;yy<H;yy+=tall)ctx.drawImage(background,0,Math.floor(yy),W,tall+1); // 위아래가 이어진 그림을 겹치지 않게 이어 붙인다(1px 겹쳐 틈을 막음)
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
    placeHud();
  }
  /* 플레이 칸 밖에 자리가 있으면 HUD(스테이지 이름·목숨·폭탄·점수)와 버튼을 칸 밖으로 뺀다.
     휴대폰(위아래 여백 56px 이상): 위 여백에 이름과 일시정지, 아래 여백에 목숨·점수와 저속·폭탄 버튼. PC(좌우 여백 170px 이상): 좌우 패널. */
  var hudOut='',hudText={};
  function placeHud(){
    var hi=$('arcade-hud-high'),lo=$('arcade-hud-low');if(!hi||!lo||!canvas.getBoundingClientRect)return;
    var r=canvas.getBoundingClientRect(),vw=global.innerWidth||r.width,vh=global.innerHeight||r.height,top=r.top,bottom=vh-r.bottom,side=Math.min(r.left,vw-r.right);
    var pads=[$('arcade-focus'),$('arcade-bomb')],pause=$('arcade-pause-button'),i;
    hudOut=side>=170?'side':Math.min(top,bottom)>=56?'below':'';
    hi.className='hudx'+(hudOut?' '+hudOut:'');lo.className=hi.className;hudText={};
    var px=function(v){return Math.round(v)+'px';};
    if(hudOut==='below'){
      hi.style.cssText='left:'+px(r.left)+';width:'+px(r.width)+';top:0;height:'+px(top)+';justify-content:flex-start;padding-left:64px';
      lo.style.cssText='left:'+px(r.left)+';width:'+px(r.width)+';top:'+px(r.bottom)+';height:'+px(bottom)+';padding:0 86px';
      for(i=0;i<2;i++)if(pads[i]){pads[i].style.position='fixed';pads[i].style.top=px(r.bottom+(bottom-56)/2);pads[i].style.bottom='auto';pads[i].style.left=i?'auto':px(r.left+10);pads[i].style.right=i?px(vw-r.right+10):'auto';}
      if(pause){pause.style.position='fixed';pause.style.top=px(Math.max(4,(top-36)/2));pause.style.left=px(r.left+10);}
      canvas.style.boxShadow='';
    }else if(hudOut==='side'){
      hi.style.cssText='left:'+px(r.left-180)+';width:160px;top:'+px(r.top+64)+';align-items:flex-end;text-align:right';
      lo.style.cssText='left:'+px(r.right+20)+';width:160px;top:'+px(r.top+64)+';align-items:flex-start'; // 왼쪽 패널과 같은 줄에서 시작(심사 7차: 점수가 오른쪽 아래에 홀로 떠 있었다)
      canvas.style.boxShadow='0 0 0 1px rgba(214,180,120,.55),0 0 0 5px rgba(10,8,16,.92),0 0 0 6px rgba(214,180,120,.3),0 0 60px 20px rgba(0,0,0,.8)'; // 플레이 칸 테두리와 둘레 어둠
      var coarse=global.matchMedia&&global.matchMedia('(pointer:coarse)').matches;
      for(i=0;i<2;i++)if(pads[i]){pads[i].style.position='';pads[i].style.top='';pads[i].style.bottom='';pads[i].style.left='';pads[i].style.right='';pads[i].style.visibility=coarse?'':'hidden';} // PC는 키로 조작하니 터치 버튼을 숨긴다
      if(pause){pause.style.position='fixed';pause.style.top=px(r.top+12);pause.style.left=px(r.left-56);} // PC: 일시정지도 칸 밖 왼쪽 위로(심사 3차)
    }else{
      canvas.style.boxShadow='';
      for(i=0;i<2;i++)if(pads[i]){pads[i].style.position='';pads[i].style.top='';pads[i].style.bottom='';pads[i].style.left='';pads[i].style.right='';pads[i].style.visibility='';}
      if(pause){pause.style.position='';pause.style.top='';pause.style.left='';}
    }
    hi.hidden=lo.hidden=!(hudOut&&mode==='playing');
  }
  function setHud(el,key,html){if(hudText[key]!==html){hudText[key]=html;el.innerHTML=html;}}
  function domHud(s){
    var hi=$('arcade-hud-high'),lo=$('arcade-hud-low');if(!hi||!lo)return;hi.hidden=lo.hidden=mode!=='playing';
    var b=s.boss,stage=Arcade.STAGES[s.stageIndex],i,hearts='',bombs='',color=themeColor(s);
    for(i=0;i<s.player.maxHp;i++)hearts+=i<s.player.hp?'◆':'◇';for(i=0;i<s.bombs;i++)bombs+='✦';
    var g=Math.round(100*Math.max(0,Math.min(1,s.gauge/Arcade.GAUGE_FULL)));
    var name='<div><div class="name" style="color:'+color+'">'+esc(b.present?b.name:stage.name)+'</div><div>'+(s.bossOnly?'보스 체험 · 제'+stage.part+'부':'STAGE '+(s.stageIndex+1)+' / '+Arcade.STAGES.length)+'</div></div>';
    var lb=function(t){return hudOut==='side'?'<div class="lbl">'+t+'</div>':'';}; // PC 패널에는 이름표를 붙인다(심사 7차)
    var life='<div>'+lb('LIFE')+'<div class="lives">'+hearts+'</div>'+lb('BOMB [X]')+'<div class="bombs">'+(bombs||'&nbsp;')+'</div>'+lb('CHARGE')+'<div class="gauge"><i style="width:'+g+'%"></i></div></div>';
    var score='<div style="text-align:'+(hudOut==='side'?'left':'right')+'">'+lb('SCORE')+'<div class="score">'+pad(s.score)+'</div>'+(hudOut==='side'?lb('BEST')+'<div class="best">'+pad(Math.max(best,s.score))+'</div>':'')+'<div class="graze">GRAZE '+s.graze+'</div></div>'; // 오른쪽 패널에 최고 점수도: 좌우 패널 무게를 맞춘다(심사 10차)
    if(hudOut==='side'){setHud(hi,'hi',name+life);setHud(lo,'lo',score);}
    else{setHud(hi,'hi',name);setHud(lo,'lo',life+score);}
  }
  function esc(v){return String(v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
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
  var BANNER_Y=60;
  function showBanner(title,sub,spell){banner=1;bannerTitle=title;bannerSub=sub;bannerTick=state?state.tick:0;bannerSpell=!!spell;}
  function showToast(result){
    var g=Arcade.STAGES[result.stage];if(!g)return;
    // 기념물 그림은 이 스테이지 그림과 함께 이미 받아 두었다(곧 releaseStage가 목록에서 지워도 여기서 쥐고 있다).
    toast={t:TOAST_SECONDS,name:g.name,stars:Math.max(1,Math.min(3,result.stars|0)),img:g.reward?images['reward-'+g.reward.key]||null:null,key:g.reward?'reward-'+g.reward.key:'',color:themeColor(state)};
  }
  function consume(){
    var s=state,i,k;
    for(i=0;i<s.cancelled.length;i+=3)addParticle(s.cancelled[i],s.cancelled[i+1],0,-.5,22+(i%9),COLORS[s.cancelled[i+2]]||'#ffffff',5);
    s.cancelled.length=0;
    for(i=0;i<s.drifted.length;i+=5)drifts.push({x:s.drifted[i],y:s.drifted[i+1],c:COLORS[s.drifted[i+2]]||'#ffffff',vx:Math.cos(s.drifted[i+3])*s.drifted[i+4],vy:Math.sin(s.drifted[i+3])*s.drifted[i+4],age:0});
    s.drifted.length=0;if(drifts.length>DRIFT_DRAW)drifts.splice(0,drifts.length-DRIFT_DRAW);
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
      else if(e==='card'){play('charge',s.boss.x);castFx(s,true);showBanner(Arcade.SEGMENTS[s.seg].name,s.boss.name,true);}
      else if(e==='wave'){var g=Arcade.STAGES[s.stageIndex];if(g.first===s.seg){showBanner(g.name,'제'+g.part+'부 · STAGE '+(s.stageIndex+1));play('seal');}}
      else if(e==='stageClear'){var r=s.results[s.results.length-1];recordResult(r);showToast(r);rushStage=false;}
      else if(e==='map')loadStage(s.stageIndex);
      else if(e==='entrance'){play('warning');wantFx(s.boss.actor);}
      else if(e==='figure')castFx(s,false);
      else if(e==='bossDown'){var dn=s.boss.down;if(dn){fall={actor:dn.actor,x:dn.x,y:dn.y,tick:dn.tick,dir:dn.x>W/2?1:-1,burst:-1};flash=.8;shake=16;}}
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
  /* 잡몹 윤곽빛: 그림 모양 그대로 옅은 금빛으로 칠한 판(한 번 만들어 둔다). 몸 뒤에 사방으로 조금씩 밀어 그리면 얇은 테두리가 된다(심사 6차: 회색 몹이 어두운 맵에 묻힘). */
  var rims=typeof WeakMap==='function'?new WeakMap():null;
  function rimOf(img){
    if(!rims)return null;var d=rims.get(img);if(d!==undefined)return d;
    try{d=offscreen(img.width,img.height);var q=d.getContext('2d');q.drawImage(img,0,0);q.globalCompositeOperation='source-in';q.fillStyle='#ffe2b0';q.fillRect(0,0,d.width,d.height);}catch(e){d=null;}
    rims.set(img,d);return d;
  }
  function drawArt(key,x,y,flashOn,fallbackColor,phase,motion,face,sizeKey,fit){
    var tall=fit||tallOf(sizeKey||key);
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
    var rim=sizeKey&&rimOf(img);
    if(rim){var keepA=ctx.globalAlpha,o=1.6;ctx.globalAlpha=keepA*.7;drawCell(key,rim,phase,false,x-w/2-o,y-tall/2,w,tall);drawCell(key,rim,phase,false,x-w/2+o,y-tall/2,w,tall);drawCell(key,rim,phase,false,x-w/2,y-tall/2-o,w,tall);drawCell(key,rim,phase,false,x-w/2,y-tall/2+o,w,tall);ctx.globalAlpha=keepA;}
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
  /* 보스 스킬 이펙트: 드라이브 프레임 애니메이션(media/arcade-v43-fx/index.json)을 보스가 이름 붙은 패턴을 열 때와 문양 레이저를 부를 때 보스 자리에 한 번 재생한다.
     그림은 지금 나온 보스 것만 받는다(보스가 바뀌면 앞 보스 것은 놓는다). 그림이 없는 보스는 고유 색의 겹 고리가 퍼지는 코드 연출. 판정은 없다(장식). */
  var FX_DIR='media/arcade-v43-fx/',fxByBoss={},fxImages={},fxPending={},casts=[];
  /* 보스 레이저·문양 시트(드라이브 Bnn 레이저문양시트, tools/build-laser-sheets-v43.py): 켜진 레이저의 질감 띠, 스펠 시작 때 보스 뒤에 1초 비추는 문양, 섬광.
     계속 도는 고리·문양은 넣지 않는다(사용자 결정 11-14). 판정은 그대로(엔진 선분), 그림은 장식이다. */
  var LASER_DIR='media/arcade-v43-laser/',laserByBoss={},laserImages={},laserPending={},emblems=[];
  function loadLaserList(){
    if(!global.fetch)return;
    global.fetch(LASER_DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
      if(d&&d.sheets)Object.keys(d.sheets).forEach(function(a){laserByBoss[a]=d.sheets[a];});
      if(state&&state.boss&&state.boss.present)wantLaser(state.boss.actor);
    },function(){});
  }
  function wantLaser(actor){
    var e=laserByBoss[actor],k;for(k in laserImages)if(!e||k!==e.file)delete laserImages[k];
    if(!e||laserImages[e.file]||laserPending[e.file])return;laserPending[e.file]=1;
    var im=new Image();im.onload=function(){laserPending[e.file]=0;if(laserByBoss[state&&state.boss.actor]===e)laserImages[e.file]=im;};im.onerror=function(){laserPending[e.file]=0;};im.src=LASER_DIR+e.file;
  }
  function laserSheet(s){var e=s&&s.boss&&laserByBoss[s.boss.actor];return e&&laserImages[e.file]?{e:e,img:laserImages[e.file]}:null;}
  function loadFxList(){
    if(!global.fetch)return;
    global.fetch(FX_DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
      if(d&&Array.isArray(d.effects))d.effects.forEach(function(e){(e.bosses||[]).forEach(function(b){fxByBoss[b]=e;});});
      if(state&&state.boss&&state.boss.present)wantFx(state.boss.actor);
    },function(){});
  }
  function wantFx(actor){
    wantLaser(actor);
    var e=fxByBoss[actor],k;for(k in fxImages)if(!e||k!==e.file)delete fxImages[k];
    if(!e||fxImages[e.file]||fxPending[e.file])return;fxPending[e.file]=1;
    var im=new Image();im.onload=function(){fxPending[e.file]=0;if(fxByBoss[state&&state.boss.actor]===e)fxImages[e.file]=im;};im.onerror=function(){fxPending[e.file]=0;};im.src=FX_DIR+e.file;
  }
  function castFx(s,big){
    var b=s.boss,e=fxByBoss[b.actor],sig=Arcade.SIGNATURES&&Arcade.SIGNATURES[b.actor];if(!b.present)return;
    if(casts.length>=4)casts.shift();
    casts.push({x:b.x,y:b.y,t:visual,e:e&&fxImages[e.file]?e:null,big:big,color:COLORS[sig?sig.color:0]||'#ffffff'});
    var ls=big&&laserSheet(s);if(ls){emblems.length=0;emblems.push({t:visual,img:ls.img,e:ls.e});}
  }
  // 스펠 시작: 보스 뒤에 그 보스의 문양이 1초 떠올랐다 걷히고, 섬광이 한 번 터진다.
  var EMBLEM_TIME=1,EMBLEM_SIZE=250,BURST_TIME=.42;
  function drawEmblems(s){
    var b=s.boss;if(!emblems.length)return;
    var m=emblems[0],age=visual-m.t;if(age>=EMBLEM_TIME||!b.present){emblems.length=0;return;}
    var k=age/EMBLEM_TIME,a=k<.12?k/.12:k>.6?(1-k)/.4:1,size=EMBLEM_SIZE*(k<.15?1.25-k/.15*.25:1+.08*(k-.15)),r=m.e.emblem,q=m.e.burst;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.85*a;
    ctx.drawImage(m.img,r[0],r[1],r[2],r[3],b.x-size/2,b.y-size/2,size,size);
    if(age<BURST_TIME){var kb=age/BURST_TIME,bs=90+150*kb;ctx.globalAlpha=.6*(1-kb);ctx.drawImage(m.img,q[0],q[1],q[2],q[3],b.x-bs/2,b.y-bs/2,bs,bs);}
    ctx.restore();
  }
  function drawSkillFx(s){
    for(var i=casts.length-1;i>=0;i--){
      var c=casts[i],age=visual-c.t,b=s.boss;if(b.present&&!b.leaving){c.x=b.x;c.y=b.y;}
      if(c.e){
        var e=c.e,img=fxImages[e.file],f=Math.floor(age*e.fps);if(!img||f>=e.frames||f<0){casts.splice(i,1);continue;}
        var sc=(c.big?1.35:1)*170/Math.max(e.cell[0],e.cell[1]),w=e.cell[0]*sc,hh=e.cell[1]*sc;
        ctx.save();ctx.globalCompositeOperation=e.blend==='lighter'?'lighter':'source-over';ctx.globalAlpha=f>=e.frames-2?.5:.9;
        ctx.drawImage(img,f*e.cell[0],0,e.cell[0],e.cell[1],c.x-e.pivot[0]*sc,c.y-e.pivot[1]*sc,w,hh);ctx.restore();
      }else{
        var k=age/.75;if(k>=1){casts.splice(i,1);continue;}
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=c.color;
        for(var q=0;q<(c.big?3:2);q++){var kk=k-q*.14;if(kk<=0)continue;ctx.globalAlpha=.7*(1-kk);ctx.lineWidth=7*(1-kk)+1;ctx.beginPath();ctx.arc(c.x,c.y,24+kk*(c.big?150:105),0,TAU);ctx.stroke();}
        ctx.restore();
      }
    }
    ctx.globalAlpha=1;
  }
  /* 보스 피격·쓰러짐. manifest에 @hit·@death 스트립이 있으면 그 그림을, 없으면 같은 그림을 코드로 젖히고 무너뜨린다. */
  var recoil={start:-99,actor:''},fall=null,FALL_TICKS=72;
  /* 명중 불꽃: 맞은 자리에서 흰·테마색 작은 조각이 위로 튄다(아래에서 쏘므로). */
  /* 명중 섬광: 주인공 탄이 몹에 맞은 자리에 흰 심·주황 테의 작은 별빛이 2~3틱 번쩍인다(심사 6차: 타격감). */
  var flashes=[];
  function impactFlash(x,y){if(flashes.length<24)flashes.push({x:x+(Math.random()-.5)*8,y:y,t:0});}
  function drawFlashes(){if(!flashes.length)return;ctx.save();ctx.globalCompositeOperation='lighter';
    for(var i=flashes.length-1;i>=0;i--){var f=flashes[i],k=1-f.t/4,r=5+f.t*3;ctx.globalAlpha=.9*k;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(f.x,f.y,2.6*k+1,0,TAU);ctx.fill();
      ctx.strokeStyle='#ffb04a';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(f.x-r,f.y);ctx.lineTo(f.x+r,f.y);ctx.moveTo(f.x,f.y-r);ctx.lineTo(f.x,f.y+r);ctx.stroke();
      ctx.beginPath();ctx.arc(f.x,f.y,r*.7,0,TAU);ctx.stroke();if(++f.t>3)flashes.splice(i,1);}
    ctx.restore();}
  function hitSpark(x,y,color,n){for(var q=0;q<n;q++){var a=-Math.PI/2+(Math.random()-.5)*2.2,v=1.6+Math.random()*2.2;addParticle(x+(Math.random()-.5)*10,y,Math.cos(a)*v,Math.sin(a)*v,9+(q%3)*3,q%2?'#ffffff':color,2.5);}}
  function recoilOf(s,b){ // 연사로 매 틱 맞으므로 18틱에 한 번만 크게 젖힌다(아래에서 쏘니 위·옆으로 젖혀진다)
    if(recoil.actor!==b.actor){recoil.actor=b.actor;recoil.start=-99;}
    if(s.tick-b.hitTick<2&&s.tick-recoil.start>=18){recoil.start=s.tick;hitSpark(b.x,b.y+30,themeColor(s),7);}
    var k=(s.tick-recoil.start)/14;if(k<0||k>=1)return null;
    var e=Math.sin(k*Math.PI)*(1-k*.4),side=(recoil.start>>1)%2?1:-1;
    return {dy:-7*e,tilt:.1*e*side,sx:1+.05*e,sy:1-.08*e};
  }
  function drawFall(s){
    if(!fall)return;var k=(s.tick-fall.tick)/FALL_TICKS;if(k<0||k>=1){fall=null;return;}
    var step=Math.floor(k*7);if(step!==fall.burst&&step<6){fall.burst=step;var ox=fall.x+((step*53)%60-30),oy=fall.y+((step*37)%50-25);for(var q=0;q<12;q++){var a=TAU*q/12;addParticle(ox,oy,Math.cos(a)*3.2,Math.sin(a)*3.2,24,q%2?'#ffffff':themeColor(s),6);}shake=Math.max(shake,7);play('kill',ox);} // 몸 곳곳이 연달아 터진다
    ctx.save();ctx.globalAlpha=k<.7?1:1-(k-.7)/.3;
    if(images[fall.actor+'@death']){drawArt(fall.actor,fall.x,fall.y+10*k,false,themeColor(s),0,'death',fall.dir);}
    else{ctx.translate(fall.x,fall.y+22*k*k);ctx.rotate(fall.dir*.55*Math.min(1,k*1.5));ctx.scale(1+.1*k,1-.4*k*k);drawArt(fall.actor,0,0,k<.45&&((s.tick>>2)&1)===1,themeColor(s),0,'',fall.dir);} // 젖혀지며 무릎 꿇듯 주저앉고 사라진다
    ctx.restore();ctx.globalAlpha=1;
  }
  /* 룬 결계(11-14 요청): 보스 둘레를 감싸는 보라색 고대문자 고리 셋. 문자는 이 게임만의 지어낸 글꼴이다 —
     줄기·가지·고리·가로획·갈고리를 정해진 씨앗으로 조합해 고리마다 다른 문장이 된다. 반지름은 마법진(104) 바깥.
     고리마다 도는 방향·빠르기가 다르고, 숨 쉬듯 커졌다 작아진다. 장식이라 맞지 않는다. */
  // 심사(룬 1차): 고리가 너무 크고 셋이 똑같이 밝아 한 덩어리로 뭉친다, 보라 탄과 섞인다 → 반지름을 줄이고, 안쪽 고리가 주인공(굵고 밝게)·바깥은 가늘고 흐리게, 글자는 적고 크게,
  // 보라에 그 장면 테마색을 조금 섞어 장면과 어울리게 한다. 탄보다 먼저(아래에) 그려지고 알파를 낮게 둬 탄 윤곽을 덮지 않는다.
  var RUNE_RADII=[114,134,153],RUNE_SPIN=[0.32,-0.21,0.13],RUNE_BAND=[16,12,9],RUNE_ALPHA=[1,0.62,0.38],runeRings={};
  function runeGlyph(g,h,seed){
    var r=function(){seed=(seed*16807)%2147483647;return seed/2147483647;},u=h/2;
    g.beginPath();g.moveTo(0,-u);g.lineTo(0,u); // 줄기
    var parts=1+Math.floor(r()*3);
    for(var k=0;k<parts;k++){var q=Math.floor(r()*5),y=(r()-.5)*h*.7,side=r()<.5?-1:1;
      if(q===0){g.moveTo(0,y);g.lineTo(side*u*.75,y-side*u*.45);}
      else if(q===1){g.moveTo(side*u*.55+u*.22,y);g.arc(side*u*.55,y,u*.22,0,Math.PI*2);}
      else if(q===2){g.moveTo(-u*.55,y);g.lineTo(u*.55,y);}
      else if(q===3){g.moveTo(0,-u);g.quadraticCurveTo(side*u*.9,-u*.6,side*u*.5,-u*.05);}
      else {g.moveTo(side*u*.6,-u*.6);g.lineTo(side*u*.6,u*.6);g.moveTo(0,y);g.lineTo(side*u*.6,y);}}
    g.stroke();
  }
  function buildRuneRing(radius,band,seed,ink){
    var pad=band+6,m=radius+pad,c=offscreen(m*2*scale,m*2*scale),g=c.getContext('2d');g.scale(scale,scale);g.translate(m,m);
    g.lineCap='round';g.lineJoin='round';g.shadowColor=mix(ink,'#000000',.35);g.shadowBlur=5;
    g.strokeStyle=ink;g.lineWidth=band>12?1.5:1;[-band/2,band/2].forEach(function(o){g.beginPath();g.arc(0,0,radius+o,0,TAU);g.stroke();});
    var n=Math.floor(TAU*radius/(band*1.15)),h=band*.66,light=mix(ink,'#ffffff',.55);g.strokeStyle=light;g.lineWidth=band>12?1.8:1.05;
    for(var i=0;i<n;i++){var a=TAU*i/n;g.save();g.rotate(a);g.translate(0,-radius);
      if(i%7===3){g.beginPath();g.arc(0,0,h*.3,0,TAU);g.stroke();g.beginPath();g.arc(0,0,h*.08,0,TAU);g.fillStyle=light;g.fill();} // 문장 사이 쉼표 고리
      else runeGlyph(g,h,seed*977+i*131+7);
      g.restore();}
    return c;
  }
  // 결계 안(바깥 고리 반지름 안)에 있는 적 탄 수. 8프레임마다 센다. 많을수록 고리가 물러나 탄 윤곽을 양보한다(룬 2차 심사).
  var duckMemo={tick:-99,v:1};
  function runeDuck(s,bx,by,R){
    if(s.tick-duckMemo.tick<8)return duckMemo.v;
    var n=0,R2=R*R;for(var i=0;i<s.n;i++){var dx=s.bx[i]-bx,dy=s.by[i]-by;if(dx*dx+dy*dy<R2)n++;}
    duckMemo.tick=s.tick;duckMemo.v=Math.max(.72,1-n/180);return duckMemo.v;
  }
  function drawRuneBarrier(s,bx,by,size){
    var ink=mix('#a776ff',themeColor(s).slice(0,7),.4),rings=runeRings[ink];
    if(!rings)rings=runeRings[ink]=RUNE_RADII.map(function(r,k){return buildRuneRing(r,RUNE_BAND[k],k+1,ink);});
    var count=compact?2:3,k0=size/190*(compact?.9:1); // 모바일은 바깥 고리를 빼고 조금 작게: 화면 위 1/3을 덮지 않게
    var card=s.stage==='card',duck=card?runeDuck(s,bx,by,RUNE_RADII[count-1]*k0):1,alpha=(card?(compact?.6:.5):.12)*duck;
    var room=Math.min(bx,W-bx,by+60); // 보스에서 플레이필드 가장자리(양옆·위)까지의 거리
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(var k=0;k<count;k++){var img=rings[k],half=img.width/scale/2,breathe=1+.05*Math.sin(visual*1.25+k*2.1),r=RUNE_RADII[k]*k0*breathe;
      var edge=Math.max(0,Math.min(1,(room+30-r*.55)/(r*.45))); // 가장자리에 잘리는 고리는 잘린 만큼 흐리게
      if(edge<=0)continue;
      ctx.save();ctx.translate(bx,by);ctx.rotate(visual*RUNE_SPIN[k]+k);ctx.scale(k0*breathe,k0*breathe);
      ctx.globalAlpha=alpha*RUNE_ALPHA[k]*edge*(.82+.18*Math.sin(visual*1.25+k*2.1));ctx.drawImage(img,-half,-half,half*2,half*2);ctx.restore();}
    ctx.restore();ctx.globalAlpha=1;
  }
  /* 패턴 중에는 탄을 그린 뒤 보스를 반투명으로 한 번 더 얹어, 보스 몸 위에서 나온 탄 덩어리 속에서도 보스 윤곽이 읽히게 한다. */
  var bossDraw={on:false};
  function drawBossOver(s){
    var b=s.boss;if(!bossDraw.on||!b.present||b.leaving||s.stage!=='card'){bossDraw.on=false;return;}
    ctx.save();ctx.globalAlpha=.55;ctx.translate(bossDraw.x,bossDraw.y);if(bossDraw.tilt)ctx.rotate(bossDraw.tilt);ctx.scale(bossDraw.sx,bossDraw.sy);drawArt(b.actor,0,0,false,themeColor(s),0,bossDraw.motion,bossDraw.face);ctx.restore();ctx.globalAlpha=1;bossDraw.on=false;
  }
  /* 유혹의 장막(색욕 보스, 11-14): 화면 양옆에 드리운 분홍 비단. 그림일 뿐 맞지 않는다(엔진의 충돌에 없다). 탄보다 먼저(아래에) 옅게 그린다. */
  function drawVeil(s){
    if(s.veilTick===undefined||s.tick-s.veilTick>2)return;
    // 심사(색욕 1차): 장막이 붉은 커튼 배경에 묻힌다 → 더 짙게, 가장자리에 흰빛 분홍 선을 그어 '천의 끝'이 읽히게. 그래도 탄보다 아래, 맞지 않는다.
    ctx.save();
    for(var side=0;side<2;side++)for(var k=0;k<3;k++){var w=58-k*14,x0=side?W-w:0,g=ctx.createLinearGradient(side?W:0,0,side?W-w-24:w+24,0),edge=[];
      g.addColorStop(0,'rgba(255,120,190,'+(.34-k*.08)+')');g.addColorStop(1,'rgba(255,120,190,0)');ctx.fillStyle=g;ctx.globalCompositeOperation='lighter';
      ctx.beginPath();ctx.moveTo(side?W:0,0);for(var y=0;y<=H;y+=24){var sw=Math.sin(visual*(.9+k*.3)+k+side*2)*10*Math.sin(y*.012+visual),xx=side?x0-sw:x0+w+sw;edge.push(xx,y);ctx.lineTo(xx,y);}ctx.lineTo(side?W:0,H);ctx.closePath();ctx.fill();
      if(k===0){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.55;ctx.strokeStyle='#ffd6ea';ctx.lineWidth=1.4;ctx.beginPath();for(var e=0;e<edge.length;e+=2)ctx[e?'lineTo':'moveTo'](edge[e],edge[e+1]);ctx.stroke();ctx.globalAlpha=1;}}
    ctx.restore();
  }
  /* 환영 분신: 엔진이 세운 분신 자리(s.clones)에 보스 그림을 반투명으로 겹쳐 그린다. 뒤에 분홍 빛무리를 깔아 '가짜지만 서 있는' 것이 읽히게 한다(심사 색욕 1차).
     분신 자체는 맞지 않고, 분신이 쏘는 탄만 맞는다. */
  function drawIllusions(s){
    if(!s.clones||s.clonesTick===undefined||s.tick-s.clonesTick>2||!s.boss.present)return;
    for(var k=0;k<s.clones.length;k++){var c=s.clones[k],cx=finite(c.x,W/2),cy=finite(c.y,120)+Math.sin(visual*2.2+k)*4,flick=.5+.12*Math.sin(visual*6+k*2),gl=ctx.createRadialGradient(cx,cy,6,cx,cy,70);
      gl.addColorStop(0,'rgba(255,110,200,.42)');gl.addColorStop(1,'rgba(255,110,200,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=gl;ctx.fillRect(cx-70,cy-70,140,140);ctx.restore();
      ctx.save();ctx.globalAlpha=flick;ctx.translate(cx+Math.sin(visual*9+k)*1.5,cy);ctx.scale(.82,.82);drawArt(s.boss.actor,0,0,false,'#c070ff',0,'',k?-1:1);ctx.restore();}
    ctx.globalAlpha=1;
  }
  function drawBoss(s){
    bossDraw.on=false;
    var b=s.boss;if(!b.present||b.y<-50)return;
    if(b.leaving&&fall&&fall.actor===b.actor)return; // 쓰러진 보스는 날아가지 않고 drawFall이 그 자리에서 무너뜨린다
    var bob=Math.sin(visual*2.2)*4,size=(b.mid?150:190)+Math.sin(visual*1.3)*10,bx=finite(b.x,W/2),by=finite(b.y,120)+bob;
    // 역광(backlight): 보스 뒤에 테마색 빛을 깔아 자기 탄 고리 속에서도 몸 윤곽이 뜨게 한다(심사 9차)
    var glowR=size*.62,bl=ctx.createRadialGradient(bx,by,8,bx,by,glowR);bl.addColorStop(0,themeColor(s)+'66');bl.addColorStop(.6,themeColor(s)+'22');bl.addColorStop(1,themeColor(s)+'00');
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=bl;ctx.fillRect(bx-glowR,by-glowR,glowR*2,glowR*2);ctx.restore();
    drawRuneBarrier(s,bx,by,size); // 마법진 바깥을 감싸는 룬 결계
    // 마법진: 방금 쐈으면(bossPose.until) 한 번 크게 밝아지며 부푼다 → 발사 순간이 읽힌다
    var fired=bossPose.actor===b.actor&&s.tick<bossPose.until?(bossPose.until-s.tick)/56:0,pulse=1+.1*fired;
    ctx.save();ctx.translate(bx,by);ctx.rotate(visual*.5);ctx.scale(pulse,pulse);ctx.globalAlpha=(s.stage==='card'?.45:.2)+.4*fired;ctx.globalCompositeOperation='lighter';
    ctx.drawImage(circleSprite,-size/2,-size/2,size,size);ctx.restore();
    var bp=bossPose;if(bp.actor!==b.actor){bp.actor=b.actor;bp.x=bx;bp.n=s.n;bp.until=-1;bp.side=0;}
    var bdx=bx-bp.x;bp.x=bx;if(Math.abs(bdx)>.3){bp.side=10;bp.dir=bdx<0?-1:1;}else if(bp.side>0)bp.side--;
    if(s.stage==='card'&&s.n-bp.n>=6)bp.until=s.tick+56;bp.n=s.n; // 탄을 한꺼번에 뿌린 순간이 공격 동작
    var bm=s.tick<bp.until&&images[b.actor+'@attack']?'attack':bp.side>0?'side':'';
    var since=56-(bp.until-s.tick),punch=bm==='attack'&&since>=0&&since<16?1+.14*(1-since/16):1; // 공격 순간 몸이 한 번 커졌다 돌아온다. 탄에 가려도 윤곽으로 읽힌다.
    var rc=recoilOf(s,b);if(rc&&images[b.actor+'@hit'])bm='hit'; // 피격 그림이 있으면 그 칸을, 없으면 같은 그림을 젖혀 피격을 보인다
    bossDraw.on=true;bossDraw.x=bx;bossDraw.y=by+(rc?rc.dy:0);bossDraw.tilt=rc?rc.tilt:0;bossDraw.sx=punch*(rc?rc.sx:1);bossDraw.sy=punch*(rc?rc.sy:1);bossDraw.motion=bm;bossDraw.face=bp.dir||(bx>W/2?-1:1);
    ctx.save();ctx.translate(bx,by+(rc?rc.dy:0));if(rc)ctx.rotate(rc.tilt);ctx.scale(punch*(rc?rc.sx:1),punch*(rc?rc.sy:1));drawArt(b.actor,0,0,s.tick-b.hitTick<3,themeColor(s),0,bm,bp.dir||(bx>W/2?-1:1));ctx.restore();
    if(s.stage==='card'){ctx.globalAlpha=.22;ctx.drawImage(shadeSprite(),bx-74,by-74,148,148);ctx.globalAlpha=1;} // 패턴 중에는 몸을 조금 어둡게 눌러 몸 위의 같은 색 탄이 읽히게 한다
  }
  /* 몹 뒤에 까는 부드러운 빛(테두리 없는 원). 어두운 배경에서 어두운 몹의 윤곽이 뜨게 한다. */
  var haloImage=null;
  function haloSprite(){
    if(haloImage)return haloImage;
    var d=offscreen(128,128),q=d.getContext('2d'),g=q.createRadialGradient(64,64,4,64,64,64);
    g.addColorStop(0,'rgba(214,226,255,.95)');g.addColorStop(.55,'rgba(170,190,240,.38)');g.addColorStop(1,'rgba(150,170,230,0)');q.fillStyle=g;q.fillRect(0,0,128,128);haloImage=d;return d;
  }
  /* 가장자리가 흐린 어둠(발밑 그림자, 보스 몸 위 탄 받침) */
  var shadeImage=null;
  function shadeSprite(){
    if(shadeImage)return shadeImage;
    var d=offscreen(96,96),q=d.getContext('2d'),g=q.createRadialGradient(48,48,2,48,48,48);
    g.addColorStop(0,'rgba(0,0,0,.72)');g.addColorStop(.6,'rgba(0,0,0,.4)');g.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=g;q.fillRect(0,0,96,96);shadeImage=d;return d;
  }
  function drawMobs(s){
    var tint=Arcade.PALETTE[s.stageIndex%Arcade.PALETTE.length],color=themeColor(s);
    var order=[],k;for(k=0;k<s.mobs.length;k++)order.push(k);order.sort(function(a,b){return s.mobs[a].y-s.mobs[b].y||a-b;}); // 아래쪽 몹이 위에 그려져야 줄지어 내려올 때 한 덩어리로 안 보인다
    for(k=0;k<order.length;k++){var i=order[k],m=s.mobs[i],glow=orbs[2][tint],reach=m.r*1.5;if(m.x!==m.x||m.y!==m.y)continue;var under=(m.y<56&&m.x<200)||(m.y<96&&m.x<64)||(m.y>H-116&&(m.x<96||m.x>W-112));if(under)ctx.globalAlpha=.5; /* 스테이지 이름·일시정지 단추, 아래쪽 목숨·점수 자리에서는 몹을 옅게 */var art=skinOf(s.stageIndex,m.kind);if(!images[art]){ctx.globalAlpha=.3;ctx.drawImage(glow.image,m.x-reach,m.y-reach,reach*2,reach*2);ctx.globalAlpha=1;}else{var tl=tallOf(m.kind),gap=1e9,j;for(j=0;j<s.mobs.length;j++){var o=s.mobs[j];if(j!==i&&Math.abs(o.x-m.x)<14){var d=Math.abs(o.y-m.y);if(d<gap)gap=d;}}if(!m.elite&&gap<tl)tl=Math.max(46,gap*.94); /* 한 줄로 바짝 붙어 내려오는 몹은 간격만큼만 크게 그려 서로 겹치지 않게 한다 */var halo=tl*.58,dim=under?.5:1;ctx.globalAlpha=dim;ctx.drawImage(shadeSprite(),m.x-tl*.42,m.y+tl*.47-tl*.13,tl*.84,tl*.26);ctx.globalAlpha=.26*dim;ctx.drawImage(haloSprite(),m.x-halo,m.y-halo,halo*2,halo*2);ctx.globalAlpha=dim;} /* 어두운 배경에서 몹이 묻히지 않게 뒤에 옅은 빛만 깐다 */var po=poseOf(s,m);if(po&&po.hit!==m.hitTick&&s.tick-m.hitTick<2){po.hit=m.hitTick;hitSpark(m.x,m.y+(tl||40)*.25,color,4);impactFlash(m.x,m.y+(tl||40)*.3);}var mo=po&&s.tick<po.until&&images[art+'@attack']?'attack':po&&po.side>0?'side':'';drawArt(art,m.x,m.y+Math.sin(visual*4+i)*2,s.tick-m.hitTick<3,color,Math.floor(finite(m.baseX,0)/9)+(m.elite?3:0),mo,(po&&po.dir)||(m.x>W/2?-1:1),m.kind,images[art]?tl:0);ctx.globalAlpha=1;} // 시작 칸을 나온 자리로 어긋나게 해 떼가 똑같이 움직이지 않는다
  }
  function drawItems(s){
    // 하트가 고동친다. 드라이브 하트 그림(heart)이 있으면 점수 아이템은 그 그림으로.
    var beat=1+Math.sin(visual*7)*.08;
    for(var i=0;i<s.itemCount;i++){var z=ITEM_DRAW*beat*(s.ikind[i]?1.15:1),sway=Math.sin(visual*5+s.ix[i]*.13)*3;ctx.globalAlpha=s.iy[i]>H-104?.45:1;ctx.drawImage(itemSprites[s.ikind[i]],s.ix[i]+sway-z/2,s.iy[i]-z/2,z,z);} // 하트는 좌우로 살랑이며 떨어진다: 곧게 날아오는 탄과 움직임이 다르다(그리기만, 줍는 판정은 그대로)ctx.globalAlpha=1; // 아래쪽 버튼·점수 자리에서는 흐리게
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
    else if(prop.drawn)drawPropArt(prop.key,ctx,long/2); // 구운 그림을 받기 전에도 같은 모양
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
  /* 코드로 그리는 기물: 어두운 회화풍에 맞게 뼈빛·이끼빛 단색에 어두운 테두리, 왼쪽 위에서 빛. u는 반 길이. */
  /* 코드로 그린 기물 한 장. +x가 진행 방향이 되게 돌려 그린다(손끝이 +x, 해골은 아래턱이 +x). tools/build-drawn-props-v43.cjs도 이것으로 그림 파일을 굽는다. */
  function drawPropArt(key,c,u){var keep=ctx;ctx=c;ctx.save();ctx.rotate(key==='skull'?-Math.PI/2:Math.PI/2);if(key==='skull')drawSkull(u);else drawHand(u);ctx.restore();ctx=keep;}
  function drawSkull(u){
    ctx.lineWidth=1.4;ctx.strokeStyle='#1a1410';
    var g=ctx.createRadialGradient(-u*.3,-u*.4,u*.1,0,0,u*1.1);g.addColorStop(0,'#f4ead2');g.addColorStop(1,'#a99a7c');ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,-u*.12,u*.78,Math.PI*.82,Math.PI*2.18);ctx.lineTo(u*.42,u*.78);ctx.lineTo(-u*.42,u*.78);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#120c0a';
    ctx.beginPath();ctx.ellipse(-u*.3,-u*.08,u*.2,u*.24,0,0,TAU);ctx.ellipse(u*.3,-u*.08,u*.2,u*.24,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.moveTo(0,u*.18);ctx.lineTo(u*.1,u*.36);ctx.lineTo(-u*.1,u*.36);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ff4a3a';ctx.beginPath();ctx.arc(-u*.3,-u*.06,u*.06,0,TAU);ctx.arc(u*.3,-u*.06,u*.06,0,TAU);ctx.fill(); // 눈 안의 붉은 불씨
    ctx.strokeStyle='#120c0a';ctx.lineWidth=1;ctx.beginPath();for(var k=-2;k<=2;k++){ctx.moveTo(k*u*.15,u*.56);ctx.lineTo(k*u*.15,u*.78);}ctx.stroke();
  }
  function drawHand(u){
    // 손끝이 위(진행 방향)를 향한 초록 악마 손: 가는 손목, 둥근 손바닥, 벌어진 굵은 손가락 넷과 엄지, 검은 발톱
    var g=ctx.createLinearGradient(-u*.6,-u,u*.6,u);g.addColorStop(0,'#a8e88a');g.addColorStop(.55,'#4f9a3c');g.addColorStop(1,'#1f4a1c');
    ctx.fillStyle=g;ctx.strokeStyle='#0b1a09';ctx.lineWidth=1.3;ctx.lineJoin='round';
    var fingers=[[-.62,.3],[-.22,.18],[.2,.18],[.6,.3]],k; // [기울기, 손바닥에서 나오는 높이]
    for(k=0;k<4;k++){var tilt=fingers[k][0],bx=(-.42+k*.28)*u,by=-u*fingers[k][1],len=u*(k===1||k===2?.82:.68),tx=bx+Math.sin(tilt)*len,ty=by-Math.cos(tilt)*len,w=u*.15;
      ctx.beginPath();ctx.moveTo(bx-w,by+u*.1);ctx.quadraticCurveTo(bx-w+Math.sin(tilt)*len*.6,by-Math.cos(tilt)*len*.55,tx,ty);ctx.quadraticCurveTo(bx+w+Math.sin(tilt)*len*.6,by-Math.cos(tilt)*len*.45,bx+w,by+u*.1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#0b1a09';ctx.beginPath();ctx.moveTo(tx-Math.cos(tilt)*u*.07,ty+u*.05);ctx.lineTo(tx+Math.sin(tilt)*u*.2,ty-Math.cos(tilt)*u*.2);ctx.lineTo(tx+Math.cos(tilt)*u*.07,ty+u*.05);ctx.closePath();ctx.fill();ctx.fillStyle=g;}
    ctx.beginPath();ctx.moveTo(u*.42,u*.2);ctx.quadraticCurveTo(u*.95,u*.05,u*.98,-u*.32);ctx.quadraticCurveTo(u*.7,-u*.05,u*.36,-u*.02);ctx.closePath();ctx.fill();ctx.stroke(); // 엄지
    ctx.beginPath();ctx.moveTo(-u*.5,-u*.12);ctx.quadraticCurveTo(-u*.58,u*.4,-u*.24,u*.62);ctx.lineTo(-u*.2,u*1.05);ctx.lineTo(u*.2,u*1.05);ctx.lineTo(u*.24,u*.62);ctx.quadraticCurveTo(u*.58,u*.4,u*.5,-u*.12);ctx.closePath();ctx.fill();ctx.stroke(); // 손바닥·손목
    ctx.strokeStyle='rgba(11,26,9,.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-u*.3,u*.1);ctx.quadraticCurveTo(0,u*.28,u*.3,u*.06);ctx.stroke(); // 손금
  }
  /* 늪 물결: 악마 손이 솟기 전에 그 자리 바닥에 초록 물결이 커지며 예고한다. */
  function drawRipples(s){
    var list=s.ripples;if(!list||!list.length)return;ctx.save();
    for(var i=0;i<list.length;i++){var r=list[i],t=r.age/Arcade.HAND_WARN,y=H-14;
      // 차오르는 밝은 원판 + 퍼지는 물결 세 겹 + 깜빡이는 노란 테: 어두운 늪 위에서도 솟을 자리가 보이게(심사 5차)
      ctx.globalAlpha=.18+.3*t;ctx.fillStyle='#d8ff6a';ctx.beginPath();ctx.ellipse(r.x,y,10+18*t,4+6*t,0,0,TAU);ctx.fill();
      ctx.lineWidth=2.5;for(var k=0;k<3;k++){var q=(t*1.5+k/3)%1;ctx.globalAlpha=(1-q)*(.5+.5*t);ctx.strokeStyle=k?'#9fe07a':'#f2ff9a';ctx.beginPath();ctx.ellipse(r.x,y,10+q*30,4+q*10,0,0,TAU);ctx.stroke();}
      ctx.globalAlpha=(.5+.5*Math.sin(r.age*.5))*t;ctx.strokeStyle='#ffe066';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(r.x,y,28,10,0,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  /* 보스 몸 위(반지름 64 안)의 탄은 옅게 그려 보스 얼굴·몸이 늘 읽히게 한다. 보스 자리에서 막 나온 탄이라 플레이어가 닿을 일은 드물다. */
  function nearBoss(s,x,y){var b=s.boss;if(!b.present||s.stage!=='card')return false;var dx=x-b.x,dy=y-b.y;return dx*dx+dy*dy<4096;}
  /* 잡몹 몸 위(반지름 안)의 탄도 옅게: 몹이 줄지어 쏘는 탄이 나오는 자리에 겹쳐 몹을 막대처럼 덮지 않게 한다(심사 6차, 31스테이지 기사). 몹 자리라 플레이어가 닿을 일은 드물다. */
  function nearMob(s,x,y){for(var k=0;k<s.mobs.length;k++){var m=s.mobs[k],r=(m.r||14)*1.6,dx=x-m.x,dy=y-m.y;if(dx*dx+dy*dy<r*r)return true;}return false;}
  function drawBullets(s){
    var bloom=Arcade.BLOOM_TICKS,i,o,half,size,x,y,variant=skinVariant(s);
    for(i=0;i<s.n;i++){
      x=s.bx[i];y=s.by[i];if(s.bage[i]<bloom||x!==x||y!==y)continue;
      size=s.bsize[i];if(size===SHAPE_PROP){drawProp(s,i,1,1);continue;}
      o=orbs[size]&&orbs[size][s.bcolor[i]];if(!o)continue;half=o.half;var faint=nearBoss(s,x,y)||nearMob(s,x,y);if(faint)ctx.globalAlpha=.38;
      var skin=size===1&&variant;if(skin){var so=skinOfBullet(variant,s.bcolor[i]),sa=variant==='star'?s.bage[i]*.08:finite(s.ba[i],0),sc=Math.cos(sa),ss=Math.sin(sa);ctx.setTransform(scale*sc,scale*ss,-scale*ss,scale*sc,(x+offsetX)*scale,(y+offsetY)*scale);ctx.drawImage(so.image,-so.half,-so.half,so.half*2,so.half*2);ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);} // 별은 돌고, 나머지는 진행 방향을 본다
      else if(size===SHAPE_RICE){var a=finite(s.ba[i],0),cos=Math.cos(a),sin=Math.sin(a);ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);ctx.drawImage(o.image,-half,-half,half*2,half*2);ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);}
      else ctx.drawImage(o.image,x-half,y-half,half*2,half*2);
      if(faint)ctx.globalAlpha=1;
    }
    // 갓 피어나는 탄: 크고 옅게 시작해 제 크기로 조여 든다(이때는 닿지 않는다).
    for(i=0;i<s.n;i++){
      var age=s.bage[i];x=s.bx[i];y=s.by[i];if(age>=bloom||x!==x||y!==y)continue;
      var t=age/bloom;size=s.bsize[i];
      if(size===SHAPE_PROP){drawProp(s,i,1.5-.5*t,.25+.6*t);continue;}
      o=orbs[size]&&orbs[size][s.bcolor[i]];if(!o)continue;var onMob=nearMob(s,x,y);half=o.half*(onMob?1:2.4-1.4*t);ctx.globalAlpha=(.25+.6*t)*(onMob?.45:1);ctx.drawImage(o.image,x-half,y-half,half*2,half*2); // 몹 몸 위에서는 부풀리지 않는다
    }
    ctx.globalAlpha=1;
  }
  /* 광선. 예고: 가는 점선이 굵어지며 깜빡인다 → 발사: 색 빛무리 + 흰 심 → 잔광: 가늘어지며 사라진다. */
  var LASER_DRAW=760; // 화면 대각선보다 길게
  function drawLasers(s){
    if(!s.lasers.length)return;
    var sheet=s.stage==='card'?laserSheet(s):null;
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
        if(sheet){ // 보스 시트의 레이저 질감을 광선 방향으로 늘여 더한다. 판정 폭은 흰 심으로 보인다.
          var bm=sheet.e.beam,th=l.width*2.4*k*pulse;ctx.save();ctx.translate(lx,ly);ctx.rotate(angle);ctx.globalAlpha=k;
          ctx.drawImage(sheet.img,bm[0],bm[1],bm[2],bm[3],0,-th/2,LASER_DRAW,th);ctx.restore();
        }else{ctx.globalAlpha=.9*k;ctx.strokeStyle=color;ctx.lineWidth=l.width*k*pulse;ctx.stroke();}
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k;ctx.strokeStyle='#ffffff';ctx.lineWidth=l.width*(sheet?.34:.46)*k;ctx.stroke();
      }
    }
    ctx.restore();
  }
  /* 보스 문양 레이저·외곽 지그재그. 엔진이 맞히는 선분(Arcade.figureSegments)을 그대로 그린다. 예고 중에는 옅은 선과 흰 점선, 켜지면 굵은 빛. */
  function drawFigures(s){
    var list=s.figures;if(!list||!list.length)return;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(var i=0;i<list.length;i++){
      var f=list[i],color=COLORS[f.color]||'#ffffff',segs=Arcade.figureSegments(f),j;
      ctx.beginPath();for(j=0;j<segs.length;j++){var g=segs[j];ctx.moveTo(g[0],g[1]);ctx.lineTo(g[2],g[3]);}
      if(f.age<f.warn){
        var t=f.age/f.warn,blink=.5+.5*Math.sin(f.age*(.25+t*.5));
        ctx.setLineDash([]);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.12+.18*t;ctx.strokeStyle=color;ctx.lineWidth=f.width*(.3+.7*t);ctx.stroke();
        ctx.globalAlpha=.4+.5*blink;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.setLineDash([6,6]);ctx.stroke();
      }else{
        var over=f.age-f.warn-f.active,k=over>0?Math.max(0,1-over/Arcade.BEAM_FADE):Math.min(1,(f.age-f.warn+1)/4),pulse=1+Math.sin(visual*36+i)*.07;
        ctx.setLineDash([]);ctx.globalCompositeOperation='lighter';
        if(!lite){ctx.globalAlpha=.16*k;ctx.strokeStyle=color;ctx.lineWidth=f.width*1.6*k*pulse;ctx.stroke();} // 글로우를 줄여 레이저는 '벽', 탄은 '위협'으로 읽히게
        ctx.globalAlpha=.9*k;ctx.strokeStyle=color;ctx.lineWidth=f.width*k*pulse;ctx.stroke();
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k;ctx.strokeStyle='#ffffff';ctx.lineWidth=f.width*.42*k;ctx.stroke();
      }
    }
    ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);
  }
  // 영웅 탄은 반투명하게 그려 적 탄을 가리지 않는다.
  function drawShots(s){
    ctx.globalAlpha=.55;ctx.globalCompositeOperation='lighter'; // 더해 그리되 한 단계 물러서게: 적 탄이 화면의 주인공이다(심사 9차: 주황 샷이 먼저 눈에 들어온다). 타격감은 명중 섬광이 맡는다
    for(var i=0;i<s.sn;i++){
      if(s.shoming[i])ctx.drawImage(shotSprite,s.sx[i]-3,s.sy[i]-9,6,18); // 유도탄도 주탄과 같은 길쭉한 빛줄기: 둥근 주황 점은 적 탄처럼 읽혔다(심사 7차)
      else ctx.drawImage(shotSprite,s.sx[i]-4,s.sy[i]-13,8,26);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
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
    var p=s.player;
    if(!p.focus){ctx.globalAlpha=.85;ctx.fillStyle='#ff2a4a';ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.4,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,p.r*.8),0,TAU);ctx.fill();ctx.globalAlpha=1;return;} // 판정점은 늘 작게 보인다(심사 7차). 저속이면 아래처럼 고리까지
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(visual*3);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,17,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle='#ff2a4a';ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.8,0,TAU);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.2,p.r),0,TAU);ctx.fill();
  }
  /* 끝난 패턴의 탄: 판정 없이 제 길로 흘러 화면 밖까지 가며 서서히 옅어진다(사용자 11-14). 진짜 탄과 헷갈리지 않게 속이 빈 옅은 점으로만 그린다. */
  var drifts=[],DRIFT_DRAW=600,DRIFT_LIFE=64,DRIFT_GREY='#8a8f99';
  // 잔상은 해가 없다는 게 한눈에 보여야 한다(7전문가 심사 11-14): 실탄 색 대신 회색, 옅게, 1초 남짓.

  function drawDrifts(){
    if(!drifts.length)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineWidth=1.4;
    for(var i=drifts.length-1;i>=0;i--){var d=drifts[i];d.x+=d.vx;d.y+=d.vy;d.age++;
      if(d.age>DRIFT_LIFE||d.y>H+12||d.y<-20||d.x<-20||d.x>W+20){drifts[i]=drifts[drifts.length-1];drifts.pop();continue;}
      ctx.globalAlpha=.22*(1-d.age/DRIFT_LIFE);ctx.strokeStyle=DRIFT_GREY;ctx.beginPath();ctx.arc(d.x,d.y,3.2,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  function drawParticles(){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(var i=particles.length-1;i>=0;i--){
      var q=particles[i],t=q.life/q.max;q.x+=q.vx;q.y+=q.vy;q.life--;
      if(q.life<=0){particles[i]=particles[particles.length-1];particles.pop();continue;}
      // 파편은 속이 찬 작은 불티 + 짧은 꼬리: 속 빈 고리는 탄처럼 읽혔다(심사 7차)
      ctx.globalAlpha=t*.9;ctx.fillStyle=q.color;ctx.strokeStyle=q.color;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(q.x-q.vx*3,q.y-q.vy*3);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.8,q.size*.32*t),0,TAU);ctx.fill();
    }
    ctx.restore();
    if(shock){var sk=Math.max(0,1-shock.r/420);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=sk*.85;ctx.strokeStyle=state?themeColor(state):'#ffffff';ctx.lineWidth=1+4*sk;/* 충격파: 보스·장면 색, 퍼질수록 얇아진다 */ctx.beginPath();ctx.arc(shock.x,shock.y,shock.r,0,TAU);ctx.stroke();ctx.restore();shock.r+=13;if(shock.r>420)shock=null;}
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
  /* 위쪽 어둠: 탄보다 먼저 그려 탄을 가리지 않는다 */
  function drawTopShade(){var top=ctx.createLinearGradient(0,0,0,96);top.addColorStop(0,'rgba(4,4,12,.85)');top.addColorStop(.6,'rgba(4,4,12,.5)');top.addColorStop(1,'rgba(4,4,12,0)');ctx.fillStyle=top;ctx.fillRect(-8,-8,W+16,104);}
  /* 오른쪽 위 남은 시간·패턴 이름 뒤 받침: 글자가 탄과 겹쳐도 읽힌다(심사 3차) */
  function namePlate(name){
    ctx.font='italic 12px '+SERIF;var w=Math.min(W*.7,ctx.measureText('「'+name+'」').width+28);
    var g=ctx.createLinearGradient(W-w-30,0,W,0);g.addColorStop(0,'rgba(4,4,12,0)');g.addColorStop(.25,'rgba(4,4,12,.72)');g.addColorStop(1,'rgba(4,4,12,.8)');
    ctx.fillStyle=g;ctx.fillRect(W-w-30,16,w+30,42);
  }
  function drawHud(s){
    var b=s.boss,seg=Arcade.SEGMENTS[s.seg],color=themeColor(s),left=Arcade.timeLeft(s),stage=Arcade.STAGES[s.stageIndex],i;
    if(hudOut)domHud(s);
    var plate=ctx.createLinearGradient(0,0,230,0);plate.addColorStop(0,'rgba(4,4,12,.78)');plate.addColorStop(.7,'rgba(4,4,12,.6)');plate.addColorStop(1,'rgba(4,4,12,0)');if(!hudOut){ctx.fillStyle=plate;ctx.fillRect(0,15,230,36);} // 글자 바로 뒤에만 깐다. 넓은 띠는 탄 아래(drawTopShade)에 있다.
    ctx.textBaseline='alphabetic';
    if(s.stage==='card'&&seg){
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(12,9,W-24,4);ctx.fillStyle=b.hp/b.maxHp<=.2?'#ff5a5a':color;ctx.fillRect(12,9,(W-24)*Math.max(0,Math.min(1,finite(b.hp/b.maxHp,0))),4);
      if(seg.spell){
        namePlate(seg.name);
        ctx.textAlign='right';ctx.font='600 20px '+SANS;ctx.fillStyle=left<=10?'#ff6a6a':'#ffffff';ctx.fillText(left<10?left.toFixed(1):String(Math.ceil(left)),W-12,35);
        if(!(bannerSpell&&banner>0)){ctx.font='italic 12px '+SERIF;ctx.fillStyle='#f3e3b5';ctx.fillText('「'+seg.name+'」',W-12,52);} // 스펠 띠가 떠 있는 동안 받침의 같은 이름은 숨긴다
      }
    }
    if(!hudOut){ // 칸 밖에 자리가 없을 때만 칸 안에 그린다
    ctx.textAlign='left';ctx.font='600 12px '+SANS;ctx.fillStyle=color;ctx.fillText(b.present?b.name:stage.name,12,29);
    ctx.font='11px '+SANS;ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText(s.bossOnly?'보스 체험 · 제'+stage.part+'부':'STAGE '+(s.stageIndex+1)+' / '+Arcade.STAGES.length,12,45);
    // 목숨 · 폭탄 · 스침 게이지(왼쪽 아래 저속 버튼 위), 점수(오른쪽 아래 폭탄 버튼 위)
    ctx.font='14px '+SANS;ctx.fillStyle='#ff6a8a';var hearts='';for(i=0;i<s.player.maxHp;i++)hearts+=i<s.player.hp?'◆':'◇';ctx.fillText(hearts,12,H-96);
    ctx.fillStyle='#7dffb0';var bombs='';for(i=0;i<s.bombs;i++)bombs+='✦';ctx.fillText(bombs,12,H-78);
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(12,H-72,64,3);ctx.fillStyle='#7dffb0';ctx.fillRect(12,H-72,64*Math.max(0,Math.min(1,s.gauge/Arcade.GAUGE_FULL)),3);
    ctx.textAlign='right';ctx.font='600 14px '+SANS;ctx.fillStyle='#ffffff';ctx.fillText(pad(s.score),W-12,H-78);
    ctx.font='10px '+SANS;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillText('GRAZE '+s.graze,W-12,H-94);
    }
    if(banner>0){
      var t=1-banner,slide=t<.18?(1-t/.18)*W:bannerSpell&&t>.72?((t-.72)/.28)*((t-.72)/.28)*W:0,alpha=bannerSpell?1:t>.75?(1-t)/.25:1; // 스펠 띠는 흐려지지 않고 오른쪽으로 빠져나간다(반투명 잔상이 받침 글자와 겹치지 않게)
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(slide,0);
      var band=ctx.createLinearGradient(0,0,W,0),by0=BANNER_Y;band.addColorStop(0,'rgba(0,0,0,0)');if(bannerSpell){band.addColorStop(.3,'rgba(6,4,16,.22)');band.addColorStop(.62,'rgba(6,4,16,.3)');band.addColorStop(.8,'rgba(6,4,16,.8)');}else band.addColorStop(.3,'rgba(6,4,16,.88)');band.addColorStop(1,'rgba(6,4,16,.88)');ctx.fillStyle=band;ctx.fillRect(0,by0,W,42);
      var lx=bannerSpell?W*.55:90;ctx.fillStyle=color;ctx.fillRect(lx,by0,W-lx,1.5);ctx.fillRect(lx,by0+40.5,W-lx,1.5);
      ctx.textAlign='right';ctx.font='600 18px '+SERIF;ctx.fillStyle='#fff3cf';ctx.fillText(bannerTitle,W-14,by0+24);
      ctx.font='10px '+SANS;ctx.fillStyle=color;ctx.fillText(bannerSub,W-14,by0+36);ctx.restore(); // 위쪽 HUD 바로 아래의 얇은 띠: 보스와 플레이어 사이 시야를 가리지 않는다
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
    drawBackground(s);drawFx();drawTopShade();drawVeil(s);drawSkillFx(s);drawEmblems(s);drawIllusions(s);drawBoss(s);drawFall(s);drawMobs(s);drawShots(s);drawDrifts();drawParticles();drawFlashes();drawItems(s);drawLasers(s);drawFigures(s);drawRipples(s);drawBullets(s);drawBossOver(s);drawPlayer(s);drawHitbox(s); // 영웅은 탄·레이저 위에 그려 늘 보이게 한다
    ctx.restore();ctx.setTransform(scale,0,0,scale,0,0);drawHud(s);
    if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash*.8)+')';ctx.fillRect(0,0,W,H);flash-=.04;}
    if(hurtFlash>0){var v=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,420);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,'rgba(255,0,40,'+(hurtFlash*.6)+')');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);hurtFlash-=.035;}
    if(banner>0)banner=Math.max(0,1-(s.tick-bannerTick)/BANNER_TICKS); // 게임 틱 기준: 화면이 느리거나 빨라도 1.3초 뒤에 걷힌다
    if(bannerSpell&&banner>0)banner=Math.max(0,1-(s.tick-bannerTick)/SPELL_BANNER_TICKS); // 스펠 이름 띠는 0.7초: 보스·문양이 뜨는 순간을 오래 가리지 않는다(이름은 오른쪽 위 받침에 남는다) // 게임 틱 기준: 화면이 느리거나 빨라도 1.3초 뒤에 걷힌다
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
    var hh=$('arcade-hud-high'),hl=$('arcade-hud-low');if(hh&&hl)hh.hidden=hl.hidden=!(hudOut&&next==='playing');
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
    particles.length=0;drifts.length=0;flash=hurtFlash=shake=banner=0;shock=null;toast=null;accumulator=0;lastStamp=0;framesSeen=0;rushStage=false;setMode('playing');
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
      loadFxList();loadLaserList();
      global.fetch(ART_DIR+'manifest.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(m){manifest=m&&typeof m==='object'?m:null;done();},function(){manifest=null;done();});
    }catch(e){done();}
    setTimeout(done,3000);
  }
  function snapshot(){return {mode:mode,scale:scale,lite:lite,compact:compact,frameMs:frameMs,bullets:state?state.n:0,stage:state?state.stage:'',stageIndex:state?state.stageIndex:-1,seg:state?state.seg:-1,
    hp:state?state.player.hp:0,score:state?state.score:0,particles:particles.length,images:Object.keys(images).sort(),loading:Object.keys(loading).sort(),loadedStage:loadedStage,
    fx:{kind:fxKind,count:fxCount,pool:FX_POOL},toast:toast?{name:toast.name,stars:toast.stars,hasArt:!!toast.img}:null,difficulty:difficulty,saveOk:saveOk};}
  /* 디버그 훅(헤드리스 검증용): 상태를 읽고, 스테이지·구간으로 건너뛰고, 진행 기록을 본다. */
  global.HapilArcadeApp={
    getState:snapshot,drawPropArt:drawPropArt, // tools/build-drawn-props-v43.cjs가 그림 파일을 구울 때 쓴다
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
