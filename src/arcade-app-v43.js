/* 합일 v43 · 원큐 여정(ARCADE 탄막) — 화면·입력·소리·저장.
 * 시뮬레이션은 arcade-v43.js가 맡고, 여기서는 그 상태를 읽어 그리기만 한다.
 * 글은 스테이지 이름 한 줄과 패턴 이름 한 줄만 띄운다(메뉴 버튼 글은 예외).
 * 저장: localStorage 'hapil-arcade-save-v43' = Progress 객체(JSON). 읽을 때 Progress.sanitize, 스테이지를 깰 때마다 Progress.record.
 * 그림: 스테이지에 들어설 때 그 스테이지 그림만 받고(loadStage) 지난 스테이지 그림은 버린다(releaseStage). 그림이 없으면 색·도형으로 그린다. */
(function(global){
  'use strict';
  var Mobile=global.HapilMobile||null; // 모바일 출시 도우미(오류·플레이 기록, 중간 저장, 기기 진단). 없어도 게임은 돈다.
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
  var PROP_LONG={'sword-violet':68,cleaver:64,'sword-balrog':72,obelisk:80,spire:72,'twin-blade':62,crescent:58,tissue:34,money:36,heel:40,feather:44,hexagram:46,gear:56,skull:34,'demon-hand':46};
  var PROP_GLOW={'sword-violet':2,cleaver:5,'sword-balrog':0,obelisk:2,spire:4,'twin-blade':8,crescent:4,tissue:6,money:6,heel:0,feather:8,hexagram:6,gear:4};
  var ART_DIR='media/arcade-v43/';
  var SERIF='"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var SLOW_FRAME_MS=21,VERY_SLOW_FRAME_MS=28,STALL_FRAME_MS=250,MAX_PARTICLES=320,FINGER_LIFT=64,TOAST_SECONDS=1.6;
  var SHAPE_RICE=3,SHAPE_BUBBLE=4,SHAPE_PROP=Arcade.SHAPE_PROP;
  var I18n=global.HapilI18n||{t:function(k){return k;},apply:function(){}},T=I18n.t;
  // 난이도 설명은 실제 규칙(목숨·폭탄)에서 만든다. 예전 고정 문구(목숨 7·3·1)가 11-14 규칙(9·5·3, 스테이지마다 회복)과 달랐다.
  var NOTES={gentle:'noteGentle',normal:'noteNormal',hell:'noteHell'};

  var images={},loading={},failed={},want={},manifest=null,orbs=[],shotSprite=null,homingSprite=null,circleSprite=null,itemSprites=[],background=null,backgroundStage=-1,loadedStage=-1;
  var scale=1,lite=false,frameMs=16,framesSeen=0,offsetX=0,offsetY=0;
  var state=null,mode='title',difficulty='normal',accumulator=0,lastStamp=0,visual=0,lastRun=null;
  var particles=[],flash=0,hurtFlash=0,hurtRing=null,VERMILION='#a8382a',shake=0,shock=null,banner=0,bannerTick=0,BANNER_TICKS=80,SPELL_BANNER_TICKS=42,bannerSpell=false,bannerTitle='',bannerSub='',toast=null;
  var keys={},finger={active:false,id:null,x:0,y:0},focusHeld=false,bombQueued=false;
  var fx=null,music=null,soundOn=true,best=0,lastItemSound=0,progress=Progress.fresh(),saveOk=true;
  var themeOverride=null,turbo=0,rushStage=false;
  // 개발자 모드(사용자 11-15): 게임 속도 2배 + 체력 무한. 지금은 시작 화면에 대놓고 보인다. 숨기려면 DEV_VISIBLE=false 한 줄만 바꾼다.
  var DEV_VISIBLE=true,DEV_SPEED=2,DEV_KEY='hapil-arcade-dev-v43',devMode=false;
  try{devMode=DEV_VISIBLE&&global.localStorage.getItem(DEV_KEY)==='1';}catch(e){devMode=false;}
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
    img.onload=function(){delete loading[key];if(loadedStage>=0&&!Object.keys(loading).length)warmStage(loadedStage+1);if(!want[key])return;images[key]=img;if(key.indexOf('bg-')===0)backgroundStage=-1;};
    img.onerror=function(){delete loading[key];failed[key]=true;};
    img.src=fileOf(key);
  }
  /* 미리 받기: 다음에 쓸 스테이지 그림을 브라우저 캐시에 먼저 받아 둔다(그림 객체는 들고 있지 않는다).
   * 시작 화면에서는 첫 스테이지를, 플레이 중에는 지금 스테이지 그림을 다 받은 뒤 다음 스테이지를 받는다. */
  var warmed={};
  function warmStage(index){
    if(!manifest||warmed[index]||!Arcade.STAGES[index])return;warmed[index]=true;
    stageKeys(index).forEach(function(key){if(images[key]||loading[key]||failed[key]||!listed(key))return;var im=new Image();im.decoding='async';im.src=fileOf(key);});
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
  // 흰빛에 가까운 탄은 흰 테두리·센 빛무리면 겹칠 때 하얀 덩어리로 번진다(7전문가 심사 11-14). 짙은 테두리, 옅은 빛무리로 낱알을 지킨다.
  var HeroFx=global.HapilHeroFx||null; // 기억사수 성장형 공격·필살기·시계 그림(src/hero-memory-v43.js)
  var Ink=global.HapilInk&&global.HapilInk.on&&global.HapilInk.sprite?global.HapilInk:null; // 수묵화풍(기본, ?ink=0 이면 꺼짐): 탄 그림을 붓 자국으로 굽는다
  var PALE_RIM='#41506e';
  function paleOf(color){var n=parseInt(String(color).slice(1,7),16);if(n!==n)return false;return ((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)>200;}
  function paleRimOf(color){return paleOf(color)?PALE_RIM:'#ffffff';}
  function haloOf(color,strong){return paleOf(color)?'33':strong;}
  function buildOrb(radius,color,tint){
    if(Ink)return Ink.sprite('orb',radius,color,scale,tint);
    var reach=radius*(lite?1.2:1.9),c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale,grad;
    if(!lite){grad=g.createRadialGradient(m,m,r*.8,m,m,reach*scale);var hc=tint&&tint!==color?mix(color,tint,.55):color;grad.addColorStop(0,hc+haloOf(color,'77'));grad.addColorStop(1,hc+'00');g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);}
    // 몸통: 가운데 흰 심 → 밝은 색 → 제 색 → 가장자리 짙은 색(보석처럼 깊이가 생긴다, 사용자 요청 11-14 동방식 탄 미감)
    var body=g.createRadialGradient(m-r*.18,m-r*.18,0,m,m,r),light=mix(color,'#ffffff',.55),deep=mix(tint&&tint!==color?mix(color,tint,.6):color,'#000000',.3);
    body.addColorStop(0,'#ffffff');body.addColorStop(.28,light);body.addColorStop(.62,color);if(tint&&tint!==color)body.addColorStop(.84,mix(color,tint,.45));body.addColorStop(1,deep); // 바깥 띠는 보스 고유 색으로 물든다(사용자 11-14 23:33)
    g.fillStyle=body;g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.strokeStyle='#ffffff';g.lineWidth=Math.max(1,r*.2);g.beginPath();g.arc(m,m,r-g.lineWidth/2,0,TAU);g.stroke();
    if(paleOf(color)){g.strokeStyle=paleRimOf(color);g.lineWidth=Math.max(1,r*.24);g.beginPath();g.arc(m,m,r+g.lineWidth/2,0,TAU);g.stroke();}else if(r>=2*scale){g.strokeStyle=OUTER_RIM;g.lineWidth=Math.max(1,r*.1);g.beginPath();g.arc(m,m,r+g.lineWidth/2,0,TAU);g.stroke();} // 색 탄도 바깥에 짙은 테 한 줄: 겹쳐도 낱알로 읽힌다(심사 6.36) // 흰 탄만 바깥에 짙은 테
    if(r>=4*scale){g.globalAlpha=.75;g.fillStyle='#ffffff';g.beginPath();g.ellipse(m-r*.34,m-r*.38,r*.24,r*.14,-.7,0,TAU);g.fill();g.globalAlpha=1;} // 작은 하이라이트
    return {image:c,half:reach};
  }
  /* 두 색을 섞는다(#rrggbb). */
  function mix(a,b,t){var pa=parseInt(a.slice(1,7),16),pb=parseInt(b.slice(1,7),16),out='#';for(var k=16;k>=0;k-=8){var x=Math.round(((pa>>k)&255)*(1-t)+((pb>>k)&255)*t);out+=('0'+x.toString(16)).slice(-2);}return out;}
  /* 스테이지마다 중간 구슬탄(크기 1)에 입히는 겉모양. 판정 원은 그대로이고 그림만 바뀐다. 동방식 탄막처럼 종류마다 실루엣이 달라 패턴이 서로 다르게 읽힌다. */
  var SKINS=['','star','scale','dagger','talisman'],skinSprites={};
  function skinVariant(s){var i=s.stageIndex|0;return SKINS[(i+Math.floor(i/5))%SKINS.length];} // 이웃 스테이지끼리 겹치지 않게 돌린다
  function buildSkin(kind,radius,color,tint){
    var u=radius*1.9,reach=u*1.5,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale;
    g.translate(m,m);g.scale(scale,scale);
    var glow=g.createRadialGradient(0,0,radius*.6,0,0,reach);var hs=tint&&tint!==color?mix(color,tint,.55):color;glow.addColorStop(0,hs+haloOf(color,'66'));glow.addColorStop(1,hs+'00');if(!lite){g.fillStyle=glow;g.fillRect(-reach,-reach,reach*2,reach*2);}
    var body=g.createLinearGradient(-u,-u,u,u);body.addColorStop(0,mix(color,'#ffffff',.6));body.addColorStop(.5,color);body.addColorStop(1,mix(tint&&tint!==color?mix(color,tint,.6):color,'#000000',.35));
    g.fillStyle=body;g.strokeStyle=paleRimOf(color);g.lineWidth=1.4;g.lineJoin='round';g.beginPath();
    if(kind==='star'){for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?u*.45:u;g[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();}
    else if(kind==='scale'){g.moveTo(u,0);g.quadraticCurveTo(0,-u*.85,-u*.8,-u*.35);g.lineTo(-u*.55,0);g.lineTo(-u*.8,u*.35);g.quadraticCurveTo(0,u*.85,u,0);g.closePath();} // 비늘(화살촉): +x가 진행 방향
    else if(kind==='dagger'){g.moveTo(u*1.15,0);g.lineTo(-u*.2,-u*.32);g.lineTo(-u*.3,-u*.6);g.lineTo(-u*.45,-u*.6);g.lineTo(-u*.45,-u*.2);g.lineTo(-u*.95,-u*.16);g.lineTo(-u*.95,u*.16);g.lineTo(-u*.45,u*.2);g.lineTo(-u*.45,u*.6);g.lineTo(-u*.3,u*.6);g.lineTo(-u*.2,u*.32);g.closePath();}
    else{g.rect(-u*.95,-u*.55,u*1.9,u*1.1);} // 부적: 진행 방향으로 누운 종이
    g.fill();g.stroke();
    if(kind==='talisman'){g.strokeStyle=mix(color,'#000000',.55);g.lineWidth=1;g.beginPath();g.arc(0,0,u*.3,0,TAU);g.moveTo(-u*.7,0);g.lineTo(-u*.3,0);g.moveTo(u*.3,0);g.lineTo(u*.7,0);g.stroke();} // 붓으로 그은 문양
    g.fillStyle='#ffffff';g.beginPath();g.arc(kind==='dagger'?u*.2:0,0,radius*.42,0,TAU);g.fill(); // 흰 심
    return {image:c,half:reach};
  }
  function skinOfBullet(kind,color){var key=kind+color+orbTint;if(!skinSprites[key]){skinSprites[key]=buildSkin(kind,Arcade.SIZE_RADIUS[1]*(state?state.sizeScale:compact?1.25:1),COLORS[color],orbTint);if(Ink&&Ink.rough)Ink.rough(skinSprites[key]);}return skinSprites[key];}
  // 쌀알탄: 오른쪽(진행 방향)으로 길쭉한 알. 그릴 때 탄의 각도로 돌린다.
  function buildRice(radius,color){
    if(Ink)return Ink.sprite('rice',radius,color,scale);
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
    if(Ink)return Ink.sprite('bubble',radius,color,scale);
    var reach=radius*1.2,c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale;
    g.fillStyle=color+'66';g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.strokeStyle='#ffffff';g.lineWidth=Math.max(1.5,r*.12);g.beginPath();g.arc(m,m,r-g.lineWidth/2,0,TAU);g.stroke();
    g.fillStyle=color;g.beginPath();g.arc(m,m,r*.3,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  /* 보스 고유 색(ACTORS c1)으로 탄의 빛무리·바깥 띠를 물들인다. 보스가 바뀔 때만 탄 그림을 다시 만든다. 판정 크기는 그대로. */
  var orbTint='';
  function bossTint(s){var b=s&&s.boss,a=b&&b.present&&Arcade.ACTORS[b.actor];return a?COLORS[a.c1]||'':'';}
  function buildOrbs(){
    var grow=state?state.sizeScale:compact?1.25:1;
    orbs=[];Arcade.SIZE_RADIUS.forEach(function(radius,size){if(size===SHAPE_PROP)return;orbs[size]={};Arcade.PALETTE.forEach(function(index){var color=COLORS[index],r=radius*grow;orbs[size][index]=size===SHAPE_RICE?buildRice(r,color):size===SHAPE_BUBBLE?buildBubble(r,color):buildOrb(r,color,orbTint);});});
  }
  function buildSprites(){
    var grow=state?state.sizeScale:compact?1.25:1;
    buildOrbs();
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
      if(!MONO){lg.globalCompositeOperation='color';lg.globalAlpha=.22;lg.fillStyle=tintOf(index);lg.fillRect(0,0,W,lt);} // 테마 색을 옅게만 입힌다(원화 색을 살린다)
      lg.globalCompositeOperation='source-over';lg.globalAlpha=1;lg.fillStyle='rgba(5,5,14,.56)';lg.fillRect(0,0,W,lt); // 탄이 읽히도록 어둡게 누른다
      background=lc;backgroundTall=lt;backgroundStage=index;return;
    }
    backgroundTall=H+160;
    if(background){background.width=background.height=0;background=null;}
    var tall=H+160,c=offscreen(W,tall),g=c.getContext('2d'),tint=tintOf(index),rgb=hexRgb(tint),img=images['bg-'+themeOf(index).bg],i;
    if(img){
      g.filter='blur(1.5px)';g.drawImage(img,0,0,W,tall);g.filter='none';
      // 원화 위에 색조를 입힌다(색상만 바꾸고 밝기는 그대로).
      if(!MONO){g.globalCompositeOperation='color';g.globalAlpha=.42;g.fillStyle=tint;g.fillRect(0,0,W,tall);}
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
  var hudOut='',hudText={},PANEL_W=200;
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
      var ph=Math.max(200,r.height-88),pw=Math.min(PANEL_W,side-24); // 패널이 플레이 칸 높이를 채운다(심사: PC 패널 아래가 비어 있었다)
      hi.style.cssText='left:'+px(r.left-pw-20)+';width:'+px(pw)+';top:'+px(r.top+64)+';height:'+px(ph)+';align-items:flex-end;text-align:right';
      lo.style.cssText='left:'+px(r.right+20)+';width:'+px(pw)+';top:'+px(r.top+64)+';height:'+px(ph)+';align-items:flex-start'; // 왼쪽 패널과 같은 줄에서 시작(심사 7차: 점수가 오른쪽 아래에 홀로 떠 있었다)
      canvas.style.boxShadow='0 0 0 1px rgba(214,180,120,.55),0 0 0 5px rgba(10,8,16,.92),0 0 0 6px rgba(214,180,120,.3),0 0 60px 20px rgba(0,0,0,.8)'; // 플레이 칸 테두리와 둘레 어둠
      var coarse=global.matchMedia&&global.matchMedia('(pointer:coarse)').matches;
      for(i=0;i<2;i++)if(pads[i]){pads[i].style.position='';pads[i].style.top='';pads[i].style.bottom='';pads[i].style.left='';pads[i].style.right='';pads[i].style.visibility=coarse?'':'hidden';} // PC는 키로 조작하니 터치 버튼을 숨긴다
      if(pause){pause.style.position='fixed';pause.style.top=px(r.top+12);pause.style.left=px(r.left-pw-20);} // PC: 일시정지도 칸 밖 왼쪽 위로(심사 3차)
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
    var lvl='<div class="levels">'+lb('MEMORY')+'<span>공격 Lv.'+(s.power||1)+'</span> <span>필살 Lv.'+(s.bombLevel||1)+'</span></div>'; // 기억사수 성장 단계(사용자 11-16)
    var life='<div>'+lb('LIFE')+'<div class="lives">'+hearts+'</div>'+lb('BOMB [X]')+'<div class="bombs">'+(bombs||'&nbsp;')+'</div>'+lb('CHARGE')+'<div class="gauge"><i style="width:'+g+'%"></i></div>'+lvl+'</div>';
    var score='<div style="text-align:'+(hudOut==='side'?'left':'right')+'">'+lb('SCORE')+'<div class="score">'+pad(s.score)+'</div>'+(hudOut==='side'?lb('BEST')+'<div class="best">'+pad(Math.max(best,s.score))+'</div>':'')+'<div class="graze">GRAZE '+s.graze+'</div></div>'; // 오른쪽 패널에 최고 점수도: 좌우 패널 무게를 맞춘다(심사 10차)
    if(hudOut==='side'){
      var seg=Arcade.SEGMENTS[s.seg],card=s.stage==='card'&&seg,hp=card?Math.round(100*Math.max(0,Math.min(1,finite(b.hp/b.maxHp,0)))):0;
      var route='<div class="route">',k;for(k=Math.max(0,s.stageIndex-1);k<=Math.min(Arcade.STAGES.length-1,s.stageIndex+2);k++)route+='<div'+(k===s.stageIndex?' class="cur" style="color:'+color+'"':'')+'>'+(k<s.stageIndex?'✓ ':k===s.stageIndex?'▸ ':'· ')+esc(Arcade.STAGES[k].name)+'</div>';route+='</div>';
      var list=card?Arcade.SEGMENTS.filter(function(g){return g.kind==='card'&&g.spell&&g.actor===seg.actor&&g.stage===seg.stage;}):[],at=list.indexOf(seg),cards='<div class="cards">';
      for(k=0;k<list.length&&k<6;k++)cards+='<div'+(k===at?' class="cur" style="color:'+color+'"':'')+'>'+(k<at?'✓ ':k===at?'▸ ':'· ')+esc(list[k].name)+'</div>';cards+='</div>';
      var boss='<div>'+(card?lb('BOSS')+'<div class="bosshp"><i style="width:'+hp+'%;background:'+color+'"></i></div>':'')+(card&&seg.spell?lb('SPELL')+'<div class="spell" style="border-color:'+color+';font-size:'+spellFit(seg.name)+'px">'+esc(seg.name)+'</div><div class="graze">'+(s.spellClean?'BONUS +'+(20000+(seg.stage||0)*5000):'BONUS 실패')+'</div>':'')+'</div>'+(card&&list.length?'<div>'+lb('SPELL CARDS')+cards+'</div>':'')+(card&&bossPortrait(b.actor,color)?'<img class="portrait" alt="" src="'+portraitUrl+'" style="border-color:'+color+'">':'');
      var prog=Math.round(100*(s.stageIndex+1)/Arcade.STAGES.length);
      var life2='<div>'+lb('LIFE')+'<div class="lives">'+hearts+'</div>'+lb('BOMB [X]')+'<div class="bombs">'+(bombs||'&nbsp;')+'</div>'+lb('CHARGE')+'<div class="gauge"><i style="width:'+g+'%"></i></div>'+lvl+'</div><div>'+lb('JOURNEY')+'<div class="progress"><i style="width:'+prog+'%"></i></div>'+route+'<div class="graze">패턴 보너스 '+s.captures+'</div></div>';
      var keys='<div class="keys">'+lb('CONTROLS')+'<div>이동 ←↑↓→ · WASD</div><div>저속 Shift · 폭탄 X</div><div>일시정지 Esc</div></div>';
      setHud(hi,'hi','<div class="stack">'+name+life2+'</div>'+keys);setHud(lo,'lo','<div class="stack">'+score+boss+'</div>'+'<div class="keys">'+lb('DIFFICULTY')+'<div>'+({gentle:'EASY',normal:'NORMAL',hell:'HELL'}[s.difficulty]||'')+'</div></div>');} // 패널 가운데: 왼쪽은 목숨·여정, 오른쪽은 보스 체력·스펠명·보너스(심사 6.46: 가운데가 비었다) // 아래쪽 빈자리: 왼쪽은 조작법, 오른쪽은 지금 스펠 이름(칸 안 이름표가 작아 읽기 어렵다는 지적)
    else{setHud(hi,'hi',name);setHud(lo,'lo',life+score);}
  }
  var portraitKey='',portraitUrl='';
  function bossPortrait(actor,color){ // 오른쪽 패널의 보스 초상: 보스·그림 로드 상태가 바뀔 때만 한 번 굽는다(심사 6.60: 패널 가운데가 비었다)
    var key=actor+'|'+(images[actor]?1:0);if(key===portraitKey)return portraitUrl;portraitKey=key;portraitUrl='';
    if(!images[actor]||!document.createElement)return '';
    var c=document.createElement('canvas');c.width=300;c.height=240;var saved=ctx;
    try{ctx=c.getContext('2d');ctx.scale(300/150,240/120);ctx.globalAlpha=1;ctx.filter='none';drawArt(actor,75,74,false,color,0,null,1);portraitUrl=c.toDataURL('image/png');}catch(e){portraitUrl='';}
    ctx=saved;return portraitUrl;
  }
  function spellFit(name){return Math.max(12,Math.min(20,Math.floor(150/Math.max(1,String(name).length+1))));} // 패널 폭(124px)에 한 줄로
  function esc(v){return String(v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  // 느린 기기에서는 먼저 해상도를, 그래도 느리면 빛무리와 날씨 입자 수를 내린다.
  function adaptQuality(elapsedMs){
    if(elapsedMs>STALL_FRAME_MS)return; // 멈춤(가려진 창·탭 전환·그림 굽기)은 느린 기기가 아니다: 평균에 넣지 않는다
    frameMs+=(Math.min(80,elapsedMs)-frameMs)*.05;framesSeen++;
    if(framesSeen<150||mode!=='playing'||turbo)return;
    if(frameMs>VERY_SLOW_FRAME_MS&&!lite){lite=true;if(Ink&&Ink.setLite)Ink.setLite(true);framesSeen=0;frameMs=16;fit();buildSprites();if(state)initFx(themeOf(state.stageIndex).fx,state.stageIndex);}
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
    var s=state,i,k,hurtNow=s.events.indexOf('hurt')>=0;
    // 피격으로 지워진 탄은 영웅에서 바깥으로 튀며 인주색으로 사라진다(탄 지우기의 먹 흩어짐과 다르게, 사용자 11-15 "비슷해서 헷갈림").
    for(i=0;i<s.cancelled.length;i+=3){if(hurtNow){var hx=s.cancelled[i]-s.player.x,hy=s.cancelled[i+1]-s.player.y,hd=Math.max(1,Math.sqrt(hx*hx+hy*hy));if(hd<170)addParticle(s.cancelled[i],s.cancelled[i+1],hx/hd*4.6,hy/hd*4.6,9+(i%5),VERMILION,3);}
      else addParticle(s.cancelled[i],s.cancelled[i+1],0,-.5,22+(i%9),COLORS[s.cancelled[i+2]]||'#ffffff',5);}
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
      else if(e==='pieceBreak'){play('kill',s.player.x);shake=Math.max(shake,4);}
      else if(e==='riserBreak'){play('kill',s.player.x);shake=Math.max(shake,5);}
      else if(e==='item'){if(visual-lastItemSound>.06){lastItemSound=visual;play('item',s.player.x);}}
      else if(e==='hurt'){play('hurt',s.player.x);hurtFlash=1;hurtRing={x:s.player.x,y:s.player.y,r:8};shake=16;}
      else if(e==='bomb'){play('bomb',s.player.x);flash=.55;shock=HeroFx?null:{x:s.player.x,y:s.player.y,r:10};shake=10;if(HeroFx){HeroFx.onEvent(e,s,visual);shake=Math.max(shake,HeroFx.shake());}} // 필살기 단계 연출이 충격파 고리를 대신한다(감싸는 원 금지)
      else if(HeroFx&&(e==='powerUp'||e==='powerDown'||e==='bombLevelUp'||e==='distort')){HeroFx.onEvent(e,s,visual);if(e!=='powerDown')play('seal');}
      else if(e==='card'){play('charge',s.boss.x);castFx(s,true);showBanner(Arcade.SEGMENTS[s.seg].name,s.boss.name,true);}
      else if(e==='wave'){var g=Arcade.STAGES[s.stageIndex];if(g.first===s.seg){showBanner(g.name,'제'+g.part+'부 · STAGE '+(s.stageIndex+1));play('seal');}}
      else if(e==='stageClear'){var r=s.results[s.results.length-1];recordResult(r);showToast(r);rushStage=false;}
      else if(e==='map')loadStage(s.stageIndex);
      else if(e==='entrance'){play('warning');wantFx(s.boss.actor);}
      else if(e==='figure')castFx(s,false);
      else if(e==='bossDown'){var dn=s.boss.down;if(dn){fall={actor:dn.actor,x:dn.x,y:dn.y,tick:dn.tick,dir:dn.x>W/2?1:-1,burst:-1,keep:{}};['','@death','@hit'].forEach(function(m){var im=images[dn.actor+m]||(bossArt.actor===dn.actor&&bossArt.keep[dn.actor+m]);if(im)fall.keep[dn.actor+m]=im;}); /* 다음 스테이지로 넘어가며 그림을 놓아도 쓰러지는 동안은 쥐고 있다(전에는 마름모 자리표시가 쓰러졌다) */flash=Ink?.18:.8;shake=16;}} /* 수묵 모드는 흰 섬광을 줄여 먹빛으로 물드는 순간이 묻히지 않게(사용자 11-16) */
      else if(e==='break'){play('phaseBreak',s.boss.x);flash=.6;shock={x:s.boss.x,y:s.boss.y,r:10,ink:true};shake=3;}
      else if(e==='capture'||e==='bombGain'||e==='extend')play('seal');
      else if(e==='waveClear'){play('phaseBreak');flash=.3;}
      else if(e==='win'){play('win');flash=1;finish();}
      else if(e==='lose'){play('lose');finish();}
      else if(e==='countdown'||e==='countdownLast')play(e);
      else if(e==='laserWarn')play('laserWarn',s.boss.x);
      else if(e==='riserWarn')play('laserWarn',s.risers&&s.risers.length?s.risers[s.risers.length-1].x:W/2); // 아래에서 솟는 소재 예고음
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
        ctx.save();ctx.globalCompositeOperation=e.blend==='lighter'?'lighter':'source-over';ctx.globalAlpha=(f>=e.frames-2?.5:.9)*(paleOf(themeColor(s))?SKILL_FX_BRIGHT:1); // 금빛·흰빛 무대에서는 빛을 덜 더한다(심사: 원반이 하얗게 날아감)
        ctx.drawImage(img,f*e.cell[0],0,e.cell[0],e.cell[1],c.x-e.pivot[0]*sc,c.y-e.pivot[1]*sc,w,hh);ctx.restore();
      }else{
        var k=age/.75;if(k>=1){casts.splice(i,1);continue;}
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=c.color;
        for(var q=0;q<(Ink?0:c.big?3:2);q++){var kk=k-q*.14;if(kk<=0)continue;ctx.globalAlpha=.7*(1-kk);ctx.lineWidth=7*(1-kk)+1;ctx.beginPath();ctx.arc(c.x,c.y,24+kk*(c.big?150:105),0,TAU);ctx.stroke();}
        ctx.restore();
      }
    }
    ctx.globalAlpha=1;
  }
  /* 보스 피격·쓰러짐. manifest에 @hit·@death 스트립이 있으면 그 그림을, 없으면 같은 그림을 코드로 젖히고 무너뜨린다. */
  var recoil={start:-99,actor:''},fall=null,FALL_TICKS=72,FALL_HOLD=.6;
  /* 명중 불꽃: 맞은 자리에서 흰·테마색 작은 조각이 위로 튄다(아래에서 쏘므로). */
  /* 명중 섬광: 주인공 탄이 몹에 맞은 자리에 흰 심·주황 테의 작은 별빛이 2~3틱 번쩍인다(심사 6차: 타격감). */
  var flashes=[];
  function impactFlash(x,y){if(flashes.length<24)flashes.push({x:x+(Math.random()-.5)*8,y:y,t:0});}
  function drawFlashes(){if(!flashes.length)return;ctx.save();ctx.globalCompositeOperation='lighter';
    for(var i=flashes.length-1;i>=0;i--){var f=flashes[i],k=1-f.t/4,r=5+f.t*3;ctx.globalAlpha=.9*k;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(f.x,f.y,2.6*k+1,0,TAU);ctx.fill();
      ctx.strokeStyle='#ffb04a';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(f.x-r,f.y);ctx.lineTo(f.x+r,f.y);ctx.moveTo(f.x,f.y-r);ctx.lineTo(f.x,f.y+r);ctx.stroke();
      if(!Ink){ctx.beginPath();ctx.arc(f.x,f.y,r*.7,0,TAU);ctx.stroke();}if(++f.t>3)flashes.splice(i,1);} // 수묵: 감싸는 원은 그리지 않는다(사용자 11-15)
    ctx.restore();}
  function hitSpark(x,y,color,n){for(var q=0;q<n;q++){var a=-Math.PI/2+(Math.random()-.5)*2.2,v=1.6+Math.random()*2.2;addParticle(x+(Math.random()-.5)*10,y,Math.cos(a)*v,Math.sin(a)*v,9+(q%3)*3,q%2?'#ffffff':color,2.5);}}
  function recoilOf(s,b){ // 연사로 매 틱 맞으므로 18틱에 한 번만 크게 젖힌다(아래에서 쏘니 위·옆으로 젖혀진다)
    if(recoil.actor!==b.actor){recoil.actor=b.actor;recoil.start=-99;}
    if(s.tick-b.hitTick<2&&s.tick-recoil.start>=18){recoil.start=s.tick;hitSpark(b.x,b.y+30,themeColor(s),7);}
    var k=(s.tick-recoil.start)/14;if(k<0||k>=1)return null;
    var e=Math.sin(k*Math.PI)*(1-k*.4),side=(recoil.start>>1)%2?1:-1;
    return {dy:-7*e,tilt:.1*e*side,sx:1+.05*e,sy:1-.08*e};
  }
  /* 한지에 번진 먹 얼룩 한 장(보스 사망용): 고르지 않은 담묵 덩이 여럿이 겹친 부드러운 번짐. 둘레는 선 없이 옅어진다 */
  var stainSprite=null;
  function buildStain(seed){var S=128,d=offscreen(S*1.45,S),q=d.getContext('2d'),sd=seed,rn=function(){sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296;},i,j;
    if(Ink)Ink.raw(1);q.translate(S*.725,S*.45);q.scale(1.45,1);
    for(i=0;i<6;i++){var a=rn()*TAU,dd=rn()*S*.16,r=S*(.12+rn()*.13),x=Math.cos(a)*dd,y=Math.sin(a)*dd*.8+(i>3?S*.12:0),pts=[];
      for(j=0;j<22;j++){var t=TAU*j/22;pts.push(r*(.72+.28*Math.sin(t*3+i)+.12*Math.sin(t*7+i*2)+.16*(rn()-.5)));}
      var g=q.createRadialGradient(x,y,0,x,y,r*1.15);g.addColorStop(0,'rgba(58,48,40,.16)');g.addColorStop(.7,'rgba(52,43,36,.24)');g.addColorStop(.9,'rgba(40,33,28,.42)');g.addColorStop(1,'rgba(40,33,28,0)'); // 물자국: 속은 옅고 가장자리에 먹이 고인다
      q.fillStyle=g;q.beginPath();for(j=0;j<22;j++){var tt=TAU*j/22;q[j?'lineTo':'moveTo'](x+Math.cos(tt)*pts[j],y+Math.sin(tt)*pts[j]);}q.closePath();q.fill();}
    for(i=0;i<3;i++){var dx=(rn()-.5)*S*.4,len=S*(.14+rn()*.18);q.strokeStyle='rgba(44,36,30,.28)';q.lineCap='round';q.lineWidth=2+rn()*3;q.beginPath();q.moveTo(dx,S*.08);q.quadraticCurveTo(dx+(rn()-.5)*6,S*.08+len*.6,dx+(rn()-.5)*4,S*.08+len);q.stroke();} // 아래로 흘러내린 먹 줄기
    if(Ink)Ink.raw(-1);return d;}
  /* 수묵화풍 보스 사망(사용자 11-16 "보스 사망연출도 수묵화풍으로"): 몸이 먹빛으로 짙어지고(먹이 배어든다), 아래부터 번진 먹 가장자리로 지워지며
     구름과 한지 속으로 스민다. 그 자리에는 먹 번짐이 한지에 퍼졌다가 옅어지고, 몸에서 떨어진 먹 조각이 바람에 흩어진다. 십자가·감싸는 원·인주색은 쓰지 않는다. */
  function inkFall(s,k){
    var tall=tallOf(fall.actor),x=fall.x,y=fall.y,sd=((x*31+y*17)|0)>>>0,rn=function(){sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296;},i,a,r,j;
    var sm=function(a,b,v){v=Math.max(0,Math.min(1,(v-a)/(b-a)));return v*v*(3-2*v);},bloom=sm(0,.55,k),fade=Math.pow(1-sm(.35,1,k),1.2);
    // 1) 한지에 퍼지는 먹 번짐: 고르지 않은 둘레의 담묵 덩이 셋이 몸 뒤에서 번져 나갔다가 옅어진다(고리 아님, 채운 번짐)
    if(!stainSprite)stainSprite=[buildStain(7),buildStain(41),buildStain(93)];
    var sa=sm(.12,.5,k)*Math.pow(1-sm(.55,1,k),1.1),ss=(fall.actor.length*7)%3;
    for(j=0;j<2;j++){var sp=stainSprite[(ss+j)%3],cx=x+(rn()-.5)*tall*.3,cy=y+tall*(.2+.1*rn()),R=tall*(.42+.2*j+.35*bloom)*(.85+.25*rn()),rot=(rn()-.5)*.5;
      ctx.save();ctx.globalAlpha=Math.min(1,(1-.25*j)*sa*1.1);ctx.translate(cx,cy);ctx.rotate(rot);ctx.drawImage(sp,-R*1.45/2*1.0,-R*.45,R*1.45,R);ctx.restore();} // 가로로 넓고 아래로 처진 번짐, 보스마다 다른 얼룩
    ctx.globalAlpha=1;
    // 2) 몸: 따로 그린 판에서 먹빛으로 물들이고, 아래부터 위로 녹여 지운다. 몸 곳곳에도 먹이 번져 구멍이 난다.
    var main=meltBegin(x,y,tall);if(!main)return false;
    var slump=sm(0,.6,k);ctx.save();ctx.translate(x+Math.sin(s.tick*.9)*3*(1-slump),y+tall*.12*slump);ctx.rotate(fall.dir*.18*slump);ctx.scale(1+.06*slump,1-.12*slump);
    drawArt(fall.actor,0,0,false,themeColor(s),0,images[fall.actor+'@death']?'death':'',fall.dir);ctx.restore();
    Ink.raw(1);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.88*sm(0,.3,k);ctx.fillStyle='rgba(28,24,22,1)';ctx.fillRect(0,0,meltBox.w,meltBox.h);ctx.restore();Ink.raw(-1); // 먹이 배어든다
    var up=sm(.2,.9,k);Ink.melt(ctx,x,y+tall*.15-tall*1.35*up,tall,visual); // 아래부터 스며 사라진다
    ctx.save();ctx.globalCompositeOperation='destination-out';var holes=sm(.3,1,k);
    for(j=0;j<14;j++){var hx=x+(rn()-.5)*tall*.9,hy=y+(rn()-.55)*tall*.9,hr=tall*(.03+.12*rn())*holes*(1+rn()),hg;if(hr<.5)continue;hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);hg.addColorStop(0,'rgba(0,0,0,1)');hg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=hg;ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);}
    ctx.restore();var l=ctx;ctx=main;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(meltLayer,0,0,meltBox.w,meltBox.h,meltBox.x,meltBox.y,meltBox.w,meltBox.h);ctx.restore();
    // 3) 흩어지는 먹 조각: 몸에서 떨어진 붓 자국이 위·옆으로 바람에 날리며 옅어진다
    Ink.raw(1);ctx.save();ctx.lineCap='round';for(j=0;j<26;j++){var t0=rn()*.45,f=(k-t0)/(1-t0);if(f<=0)continue;var px=x+(rn()-.5)*tall*.7,py=y+(rn()-.3)*tall*.7,dx=(rn()-.35)*tall*.9,dy=-(.3+rn())*tall*.6,qx=px+dx*f+Math.sin(f*5+j)*6,qy=py+dy*f,len=(3+rn()*7)*(1-f*.5),ang=Math.atan2(dy,dx);
      ctx.globalAlpha=Math.max(0,(1-f))*.75;ctx.strokeStyle=j%4?'#2a2522':'#5a524b';ctx.lineWidth=Math.max(.6,(1.2+rn()*2.4)*(1-f));ctx.beginPath();ctx.moveTo(qx-Math.cos(ang)*len,qy-Math.sin(ang)*len);ctx.quadraticCurveTo(qx,qy+2,qx+Math.cos(ang)*len*.4,qy+Math.sin(ang)*len*.4);ctx.stroke();}
    ctx.restore();Ink.raw(-1);ctx.globalAlpha=1;
    // 4) 발치 구름도 함께 흩어진다
    if(Ink.footCloud&&k<.95){ctx.save();ctx.globalAlpha=1-sm(.35,.95,k);Ink.footCloud(ctx,x,y+tall*.12*slump,tall*(1+.25*k),visual);ctx.restore();ctx.globalAlpha=1;}
    return true;
  }
  function drawFall(s){
    if(!fall)return;var k=(s.tick-fall.tick)/FALL_TICKS;if(k<0||k>=1){fall=null;return;}
    var step=Math.floor(k*7);if(step!==fall.burst&&step<6){fall.burst=step;var ox=fall.x+((step*53)%60-30),oy=fall.y+((step*37)%50-25);if(!Ink)for(var q=0;q<12;q++){var a=TAU*q/12;addParticle(ox,oy,Math.cos(a)*3.2,Math.sin(a)*3.2,24,q%2?'#ffffff':themeColor(s),6);}shake=Math.max(shake,7);play('kill',ox);} // 몸 곳곳이 연달아 터진다
    var lent=[],key;for(key in fall.keep)if(!images[key]){images[key]=fall.keep[key];lent.push(key);}
    try{if(Ink&&Ink.melt&&inkFall(s,k))return;
    ctx.save();ctx.globalAlpha=k<.7?1:1-(k-.7)/.3;
    if(images[fall.actor+'@death']){drawArt(fall.actor,fall.x,fall.y+10*k,false,themeColor(s),0,'death',fall.dir);}
    else{ctx.translate(fall.x,fall.y+22*k*k);ctx.rotate(fall.dir*.55*Math.min(1,k*1.5));ctx.scale(1+.1*k,1-.4*k*k);drawArt(fall.actor,0,0,k<.45&&((s.tick>>2)&1)===1,themeColor(s),0,'',fall.dir);} // 젖혀지며 무릎 꿇듯 주저앉고 사라진다
    ctx.restore();ctx.globalAlpha=1;
    }finally{for(var li=0;li<lent.length;li++)delete images[lent[li]];}
  }
  /* 룬 결계(11-14 요청): 보스 둘레를 감싸는 보라색 고대문자 고리 셋. 문자는 이 게임만의 지어낸 글꼴이다 —
     줄기·가지·고리·가로획·갈고리를 정해진 씨앗으로 조합해 고리마다 다른 문장이 된다. 반지름은 마법진(104) 바깥.
     고리마다 도는 방향·빠르기가 다르고, 숨 쉬듯 커졌다 작아진다. 장식이라 맞지 않는다. */
  // 심사(룬 1차): 고리가 너무 크고 셋이 똑같이 밝아 한 덩어리로 뭉친다, 보라 탄과 섞인다 → 반지름을 줄이고, 안쪽 고리가 주인공(굵고 밝게)·바깥은 가늘고 흐리게, 글자는 적고 크게,
  // 보라에 그 장면 테마색을 조금 섞어 장면과 어울리게 한다. 탄보다 먼저(아래에) 그려지고 알파를 낮게 둬 탄 윤곽을 덮지 않는다.
  /* 한자문(사용자 11-15 "안에는 한자 적어놓고 죽음질병뭐 저주 이런거 적들 특성에 맞게", "한자문으로 만들어서 넣어 단순 한자 한글자 반복하지말고"): 보스마다 지은 여덟 글자 주문.
     뜻 풀이는 /mnt/project-files 보고(arcade-v43/hanja-rings). 장식 고리와 판정 고리(drawRunes) 둘 다 이 문장을 고리 따라 이어 쓴다. */
  var RUNE_VERSES={p1_tree:'根噬血土 枝結死果',violet:'八足織網 不愛之心',p1_horn:'泥中有面 角下無魂',p1_chaser:'血跡不絶 鎖斷追魂',p1_comrade:'屍積成丘 故友爲魔',p1_gate:'七柱守門 鞭痕不滅',balrog:'業火焚天 墜者無歸',mask:'笑面藏血 病室無聲',p1_staff:'針入骨髓 藥化爲毒',p1_seraph:'熾天封印 存憶盡滅',lucifer:'傲極必墮 毒城無明',p2_demons:'七十二魔 所羅門印',p2_belphegor:'怠惰腐骨 光陰虛擲',p2_leviathan:'嫉妒如蛇 毒入心肝',p2_beelzebub:'貪食無厭 腹裏藏蠅',asmodeus:'色慾纏絲 紅唇蝕骨',p2_greed:'金如刀刃 貪者自割',p2_mammon:'財奪人位 雪葬童心',p2_wrath:'怒火燎原 辱積成災',pride:'欲立天上 驕者先崩',p2_chairman:'鐵足踐人 權驅萬機',p2_core:'收苦爲算 複製魂紋',p3_legion:'鋼鐵千軍 轟炸無止',p3_rampart:'以憐行暴 救而囚之',p3_defense:'守門拒人 首憶封閉',controller:'系統否決 人性廢棄',p3_body:'肉換爲機 命假選擇',p3_gate:'憶門輪迴 歸路已斷',goblin:'笛驅群狼 刃鳴不和',p4_knight:'墮天騎士 劍路已定',insomnia:'夜不成眠 傀儡懸絲',p5_cult:'噬時之蛇 首令汚染',p5_archon:'收穫生魂 黑沙流轉',p5_common:'奪人光陰 衆門相連',p5_upper:'十二守門 閉層之令',p5_grand:'令令相疊 寸隙難求',p5_furnace:'爐吞可能 命線不息',p5_neuron:'強植其文 腦爲奴門',p5_keeper:'埋夢於忘 時計碎裂',p5_rings:'六環鎖命 沙柱崩儀',arbelia:'窗外午後 未寄之書',siren:'歌收時光 命運已算',p6_demons:'城外魔潮 雙印俱破',chief:'夢魘之首 城陷一夜',p6_bind:'夢縛其核 共奪而還',p7_car:'青燈濕路 前照奪命',p7_shadow:'墜者無聲 黑影隨身',p7_alarm:'警鳴不止 防火門閉',executor:'因果固定 終始相循',p8_chip:'萬夢一網 神經相縛',p8_collective:'衆我爲一 末日之戰',p8_lauren:'雙騎重陣 憶歸一線',cultist:'停時曲空 初志已忘',p8_ion:'秩序之壁 萬法歸一',rian:'叛者二人 全死之門'};
  var RUNE_FONT='"Noto Serif CJK KR","Noto Serif KR","Nanum Myeongjo","Batang","Songti SC","SimSun","Noto Sans CJK KR",serif';
  function verseOf(actor){return (RUNE_VERSES[actor]||'生者必滅 會者定離').replace(/\s+/g,'');}
  // 고리 띠에 문장을 이어 쓴다: 글자는 고리 바깥을 머리로 세우고, 한 문장이 끝날 때마다 작은 고리 쉼표.
  function writeVerse(g,radius,band,actor,color){
    var text=verseOf(actor),size=band*.74,step=(size*1.08)/radius,n=Math.floor(TAU/step),seq=[],k;
    for(k=0;seq.length<n;k++){seq.push(text.charAt(k%(text.length+1))||'');}
    g.fillStyle=color;g.font='bold '+size.toFixed(1)+'px '+RUNE_FONT;g.textAlign='center';g.textBaseline='middle';
    for(k=0;k<n;k++){var a=TAU*k/n;g.save();g.rotate(a);g.translate(0,-radius);
      if(seq[k])g.fillText(seq[k],0,1);else{g.lineWidth=1.2;g.strokeStyle=color;g.beginPath();g.arc(0,0,size*.18,0,TAU);g.stroke();}
      g.restore();}
  }
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
  function buildRuneRing(radius,band,seed,ink,actor){
    var pad=band+6,m=radius+pad,c=offscreen(m*2*scale,m*2*scale),g=c.getContext('2d');g.scale(scale,scale);g.translate(m,m);
    g.lineCap='round';g.lineJoin='round';g.shadowColor=mix(ink,'#000000',.35);g.shadowBlur=5;
    g.strokeStyle=ink;g.lineWidth=band>12?1.5:1;[-band/2,band/2].forEach(function(o){g.beginPath();g.arc(0,0,radius+o,0,TAU);g.stroke();});
    var n=Math.floor(TAU*radius/(band*1.15)),h=band*.66,light=mix(ink,'#ffffff',.55);g.strokeStyle=light;g.lineWidth=band>12?1.8:1.05;
    if(actor){g.shadowBlur=0;writeVerse(g,radius,band,actor,light);}
    else for(var i=0;i<n;i++){var a=TAU*i/n;g.save();g.rotate(a);g.translate(0,-radius);
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
    if(s.figures.some(function(f){return f.kind==='runes';}))return; // 한자문 고리 공격이 뜬 동안 장식 고리는 비킨다(같은 고리가 커져 공격이 된다)
    var ink=mix('#a776ff',themeColor(s).slice(0,7),.4),actor=s.boss.actor,key=ink+actor,rings=runeRings[key];
    if(!rings)rings=runeRings[key]=RUNE_RADII.map(function(r,k){return buildRuneRing(r,RUNE_BAND[k],k+1,ink,actor);});
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
  /* 보스 몸 녹이기(사용자 11-16 "보스가 구름에 반짤린 그낌이아니라 녹아든 느낌이 들도록"): 보스만 보스 둘레 작은 판에 따로 그리고,
     Ink.melt 로 아랫몸을 번진 먹 가장자리 모양으로 지운 뒤 화면에 얹는다. 그 위에 발치 구름과 옅은 앞 구름이 덮어 몸이 구름 속으로 스민다. */
  var meltLayer=null,meltBox=null;
  function meltBegin(x,y,tall){
    if(!(Ink&&Ink.melt)||!ctx.getTransform)return null;var T=ctx.getTransform();if(T.b||T.c)return null;
    var x0=Math.floor(T.a*(x-tall*1.7)+T.e),y0=Math.floor(T.d*(y-tall*1.05)+T.f),w=Math.ceil(T.a*tall*3.4),h=Math.ceil(T.d*tall*1.9);if(!(w>0&&h>0))return null;
    if(!meltLayer)meltLayer=document.createElement('canvas');if(meltLayer.width<w||meltLayer.height<h){meltLayer.width=Math.max(w,meltLayer.width);meltLayer.height=Math.max(h,meltLayer.height);}
    var l=meltLayer.getContext('2d');l.setTransform(1,0,0,1,0,0);l.globalAlpha=1;l.globalCompositeOperation='source-over';l.filter='none';l.clearRect(0,0,meltLayer.width,meltLayer.height);l.setTransform(T.a,0,0,T.d,T.e-x0,T.f-y0);
    meltBox={x:x0,y:y0,w:w,h:h};var keep=ctx;ctx=l;return keep;
  }
  function meltEnd(main,x,y,tall,alpha){
    var l=ctx;ctx=main;Ink.melt(l,x,y,tall,visual);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=alpha;ctx.globalCompositeOperation='source-over';ctx.drawImage(meltLayer,0,0,meltBox.w,meltBox.h,meltBox.x,meltBox.y,meltBox.w,meltBox.h);ctx.restore();
  }
  /* 패턴 중에는 탄을 그린 뒤 보스를 반투명으로 한 번 더 얹어, 보스 몸 위에서 나온 탄 덩어리 속에서도 보스 윤곽이 읽히게 한다. */
  var bossDraw={on:false};
  function drawBossOver(s){
    var b=s.boss;if(!bossDraw.on||!b.present||b.leaving||s.stage!=='card'){bossDraw.on=false;return;}
    var tall=tallOf(b.actor),main=meltBegin(bossDraw.x,bossDraw.y,tall);
    ctx.save();ctx.globalAlpha=main?1:.55;ctx.translate(bossDraw.x,bossDraw.y);if(bossDraw.tilt)ctx.rotate(bossDraw.tilt);ctx.scale(bossDraw.sx,bossDraw.sy);
    drawArt(b.actor,0,0,false,themeColor(s),0,bossDraw.motion,bossDraw.face);ctx.restore();
    if(main)meltEnd(main,bossDraw.x,bossDraw.y,tall,.55);ctx.globalAlpha=1;bossDraw.on=false; // 먹구름에 녹은 아랫몸은 탄 위로도 녹은 채 비친다(곧게 자르지 않는다)
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
  var BACKLIGHT_BRIGHT='26'; // 금빛·흰빛 테마는 역광이 가산되면 보스 뒤가 하얗게 탄다(심사: 탐욕 보스 금빛 과노출)
  var bossArt={actor:'',keep:{}}; // 지금 보스 그림을 쥐어 둔다: 마지막 패턴이 깨진 그 틱에 다음 스테이지로 넘어가며 그림을 놓아도 쓰러짐은 이 그림으로 그린다
  function drawBoss(s){
    bossDraw.on=false;
    var b=s.boss;if(!b.present||b.y<-50)return;
    if(bossArt.actor!==b.actor){bossArt={actor:b.actor,keep:{}};}['','@death','@hit'].forEach(function(m){var im=images[b.actor+m];if(im)bossArt.keep[b.actor+m]=im;});
    if(b.leaving&&fall&&fall.actor===b.actor)return; // 쓰러진 보스는 날아가지 않고 drawFall이 그 자리에서 무너뜨린다
    var bob=Math.sin(visual*2.2)*4,size=(b.mid?150:190)+Math.sin(visual*1.3)*10,bx=finite(b.x,W/2),by=finite(b.y,120)+bob;
    // 역광(backlight): 보스 뒤에 테마색 빛을 깔아 자기 탄 고리 속에서도 몸 윤곽이 뜨게 한다(심사 9차)
    var tc=themeColor(s),bright=paleOf(tc),glowR=size*.62,bl=ctx.createRadialGradient(bx,by,8,bx,by,glowR);bl.addColorStop(0,tc+(bright?BACKLIGHT_BRIGHT:'66'));bl.addColorStop(.6,tc+(bright?'0c':'22'));bl.addColorStop(1,themeColor(s)+'00');
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=bl;ctx.fillRect(bx-glowR,by-glowR,glowR*2,glowR*2);ctx.restore();
    // 문양 레이저가 켜지면 원래 마법진·룬 결계는 물러난다: 같은 자리에 원이 서너 겹 쌓이면 무엇이 닿는 선인지 안 읽힌다(심사 11-14)
    var sigilOn=false;for(var si=0;si<s.figures.length;si++)if(s.figures[si].sigil&&s.figures[si].age>=s.figures[si].warn*.5){sigilOn=true;break;}
    if(!sigilOn)drawRuneBarrier(s,bx,by,size); // 마법진 바깥을 감싸는 룬 결계
    // 마법진: 방금 쐈으면(bossPose.until) 한 번 크게 밝아지며 부푼다 → 발사 순간이 읽힌다
    var fired=bossPose.actor===b.actor&&s.tick<bossPose.until?(bossPose.until-s.tick)/56:0,pulse=1+.1*fired;
    ctx.save();ctx.translate(bx,by);ctx.rotate(visual*.5);ctx.scale(pulse,pulse);ctx.globalAlpha=((s.stage==='card'?.45:.2)+.4*fired)*(sigilOn?.22:1);ctx.globalCompositeOperation='lighter';
    ctx.drawImage(circleSprite,-size/2,-size/2,size,size);ctx.restore();
    var bp=bossPose;if(bp.actor!==b.actor){bp.actor=b.actor;bp.x=bx;bp.n=s.n;bp.until=-1;bp.side=0;}
    var bdx=bx-bp.x;bp.x=bx;if(Math.abs(bdx)>.3){bp.side=10;bp.dir=bdx<0?-1:1;}else if(bp.side>0)bp.side--;
    if(s.stage==='card'&&s.n-bp.n>=6)bp.until=s.tick+56;bp.n=s.n; // 탄을 한꺼번에 뿌린 순간이 공격 동작
    var bm=s.tick<bp.until&&images[b.actor+'@attack']?'attack':bp.side>0?'side':'';
    var since=56-(bp.until-s.tick),punch=bm==='attack'&&since>=0&&since<16?1+.14*(1-since/16):1; // 공격 순간 몸이 한 번 커졌다 돌아온다. 탄에 가려도 윤곽으로 읽힌다.
    var rc=recoilOf(s,b);if(rc&&images[b.actor+'@hit'])bm='hit'; // 피격 그림이 있으면 그 칸을, 없으면 같은 그림을 젖혀 피격을 보인다
    bossDraw.on=true;bossDraw.x=bx;bossDraw.y=by+(rc?rc.dy:0);bossDraw.tilt=rc?rc.tilt:0;bossDraw.sx=punch*(rc?rc.sx:1);bossDraw.sy=punch*(rc?rc.sy:1);bossDraw.motion=bm;bossDraw.face=bp.dir||(bx>W/2?-1:1);
    var tall=tallOf(b.actor),fy=by+(rc?rc.dy:0),main=meltBegin(bx,fy,tall);
    ctx.save();ctx.translate(bx,fy);if(rc)ctx.rotate(rc.tilt);ctx.scale(punch*(rc?rc.sx:1),punch*(rc?rc.sy:1));if(bright&&s.stage==='card'&&'filter' in ctx)ctx.filter=BRIGHT_ART_DIM; // 금빛·흰빛 보스 그림은 스펠 중 한 단계 어둡게: 그 위 탄이 묻힌다(심사 6.44)
    drawArt(b.actor,0,0,s.tick-b.hitTick<3,themeColor(s),0,bm,bp.dir||(bx>W/2?-1:1));ctx.filter='none';ctx.restore();
    if(main)meltEnd(main,bx,fy,tall,1); // 아랫몸은 번진 먹 가장자리로 지워져 구름 속으로 스민다(사용자 11-16)
    if(Ink&&Ink.footCloud)Ink.footCloud(ctx,bx,fy,tall,visual); // 발치의 먹구름: 걷는 동작의 어색함을 가린다(사용자 11-15)
    if(Ink&&Ink.footVeil)Ink.footVeil(ctx,bx,fy,tall,visual,1,hash(b.actor)); // 몸 앞을 지나는 옅은 구름 한 겹: 구름 윗선이 곧은 띠로 남지 않게
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
    for(k=0;k<order.length;k++){var i=order[k],m=s.mobs[i],glow=orbs[2][tint],reach=m.r*1.5;if(m.x!==m.x||m.y!==m.y)continue;var under=(m.y<56&&m.x<200)||(m.y<96&&m.x<64)||(m.y>H-116&&(m.x<96||m.x>W-112));if(under)ctx.globalAlpha=.5; /* 스테이지 이름·일시정지 단추, 아래쪽 목숨·점수 자리에서는 몹을 옅게 */var art=skinOf(s.stageIndex,m.kind);if(!images[art]){ctx.globalAlpha=.3;ctx.drawImage(glow.image,m.x-reach,m.y-reach,reach*2,reach*2);ctx.globalAlpha=1;}else{var tl=tallOf(m.kind),gap=1e9,j;for(j=0;j<s.mobs.length;j++){var o=s.mobs[j];if(j!==i&&Math.abs(o.x-m.x)<14){var d=Math.abs(o.y-m.y);if(d<gap)gap=d;}}if(!m.elite&&gap<tl)tl=Math.max(46,gap*.94); /* 한 줄로 바짝 붙어 내려오는 몹은 간격만큼만 크게 그려 서로 겹치지 않게 한다 */var halo=tl*.58,dim=under?.5:1;ctx.globalAlpha=dim;ctx.drawImage(shadeSprite(),m.x-tl*.42,m.y+tl*.47-tl*.13,tl*.84,tl*.26);ctx.globalAlpha=.26*dim;ctx.drawImage(haloSprite(),m.x-halo,m.y-halo,halo*2,halo*2);ctx.globalAlpha=dim;} /* 어두운 배경에서 몹이 묻히지 않게 뒤에 옅은 빛만 깐다 */var po=poseOf(s,m);if(po&&po.hit!==m.hitTick&&s.tick-m.hitTick<2){po.hit=m.hitTick;hitSpark(m.x,m.y+(tl||40)*.25,color,4);impactFlash(m.x,m.y+(tl||40)*.3);}var mo=po&&s.tick<po.until&&images[art+'@attack']?'attack':po&&po.side>0?'side':'';drawArt(art,m.x,m.y+Math.sin(visual*4+i)*2,s.tick-m.hitTick<3,color,Math.floor(finite(m.baseX,0)/9)+(m.elite?3:0),mo,(po&&po.dir)||(m.x>W/2?-1:1),m.kind,images[art]?tl:0);if(Ink&&Ink.footCloud&&images[art])Ink.footCloud(ctx,m.x,m.y+Math.sin(visual*4+i)*2,tl*.9,visual+i*1.7,.95);ctx.globalAlpha=1;} // 시작 칸을 나온 자리로 어긋나게 해 떼가 똑같이 움직이지 않는다
  }
  /* 아래쪽 압박(사용자 11-15): 쌓인 블록·떨어지는 조각·솟은 지형·올라올 몹 예고. 판정은 엔진(Arcade.floorTop·조각 칸)과 같은 칸이다.
     심사 1차(5.97): 네온 원색 블록이 화풍과 따로 논다 → 장면 색으로 물든 돌 블록. 닿으면 아픈 떨어지는 조각만 따뜻한 경고 테가 맥동하고, 쌓인 블록은 무채색 돌.
     화면 높이 빛기둥 대신 떨어질 자리에 점선 윤곽만. 지형은 장면 색 바위에 밝은 능선, 솟을 때 흙먼지. */
  var MONO=!!(Ink&&Ink.mono); // 먹 농담 화면: 배경에 테마 색을 입히지 않는다(붉은 테마 스테이지 배경이 분홍으로 물들던 것)
  var WARN_RED=!!(Ink&&Ink.mono===2); // 먹 화면에서는 모든 광선 예고선을 인주색으로(사용자 11-15 "경고는 인주색")
  var FLOOR_HOT='#ff5a3c'; // 경고색은 영웅 탄(주황)과 다른 붉은 쪽(심사 2차)
  // 깨진 조각의 점수는 탄 위에 따로 그린다(심사: 탄에 가려 '150'만 보였다).
  function drawPieceScores(s){var F=s.floor;if(!F||!F.bursts||!F.bursts.length)return;var C=Arcade.FLOOR_CELL,PAPER='#f2e9d6',INKC=Ink?'#1e1a18':'#ffffff',k,bb,bf;ctx.save();
    for(k=0;k<F.bursts.length;k++){var pb=F.bursts[k],mx=0,my=0,j,v;for(j=0;j<pb.cells.length;j++){mx+=(pb.col+pb.cells[j][0]+.5)*C;my+=pb.y-(pb.cells[j][1]+.5)*C;}mx/=pb.cells.length;my/=pb.cells.length; // 깨진 조각(사용자 11-16 "깜빡이다가 그림들처럼 폭발하고 사라지도록"): 탄 위에 그려 탄막 속에서도 읽히게
      if(pb.age<12){var e5=pb.age<3?0:(pb.age-3)/9,sw=1+.16*Math.min(1,pb.age/3);ctx.globalAlpha=.82*(1-e5*e5);ctx.fillStyle=INKC;
        for(j=0;j<pb.cells.length;j++){var ox=(pb.col+pb.cells[j][0]+.5)*C,oy=pb.y-(pb.cells[j][1]+.5)*C,sd=(pb.col*7+j*13+pb.cells.length)%11;ctx.beginPath();for(v=0;v<9;v++){var va=v/9*TAU+sd*.3,vr=C*.5*sw*(.82+.3*(((sd+v*5)%7)/6))*(1+.25*e5);if(v)ctx.lineTo(ox+Math.cos(va)*vr,oy+Math.sin(va)*vr);else ctx.moveTo(ox+Math.cos(va)*vr,oy+Math.sin(va)*vr);}ctx.closePath();ctx.fill();}} // 조각 모양 그대로 초묵 덩이로 부풀었다가(가장자리는 번진 먹처럼 고르지 않게) 마른다
      ctx.globalAlpha=1;drawInkBurst({x:mx,y:my,size:C*(.85+.15*pb.cells.length)},Math.min(1,pb.age/(Arcade.BURST_TICKS||40)),pb.col*5+pb.cells.length);} // 솟는 그림이 사라질 때와 같은 먹폭발(조각 크기에 맞춤)

    for(k=0;k<F.bursts.length;k++){bb=F.bursts[k];bf=bb.age/(Arcade.BURST_TICKS||36);
      if(bf<.85){var tx3=(bb.col+1)*C,ty3=Math.max(112,bb.y-C-bb.age*.4);if(s.boss&&s.stage==='card'&&Math.abs(tx3-s.boss.x)<100&&ty3<s.boss.y+120)tx3=s.boss.x+(tx3<s.boss.x?-110:110);tx3=Math.max(24,Math.min(W-24,tx3));var ts=bb.age<6?1+.25*(1-bb.age/6):1;ctx.globalAlpha=bf<.6?1:1-(bf-.6)/.25;ctx.font='bold '+(17*ts).toFixed(1)+'px '+RUNE_FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle=PAPER;ctx.strokeText('+'+(Arcade.PIECE_SCORE||150),tx3,ty3);ctx.fillStyle=INKC;ctx.fillText('+'+(Arcade.PIECE_SCORE||150),tx3,ty3);}}
    ctx.restore();ctx.globalAlpha=1;}
  function drawFloor(s){
    var F=s.floor;if(!F)return;var C=Arcade.FLOOR_CELL,N=Arcade.FLOOR_COLS,c,r,k,v,hill=false,theme=themeColor(s);
    var stone=mix('#3a3546',theme,.28),stoneEdge=mix('#8d8799',theme,.3),live=mix(mix(theme,'#3a3546',.35),'#000000',.15),pulse=.6+.4*Math.sin(visual*12),HOT=Ink?(Ink.mono===1?'#26221f':'#c2362a'):FLOOR_HOT,PAPER='#f2e9d6';
    var PIECE=Ink&&Ink.mono?'#1e1a18':HOT; // 테트리스 조각과 착지 예고는 먹으로(사용자 11-15 "테트리스는 흑백"), 솟는 몹·가로줄 경고는 인주색 그대로
    if(Ink){stone='#4c463f';stoneEdge=PAPER;live=PIECE;} // 수묵: 먹 바위, 한지색 테, 인주색 경고(이 함수는 HapilInk.raw 안에서 돌아 색이 그대로 찍힌다)
    ctx.save();
    for(c=0;c<N;c++)if(F.hill[c]>.5){hill=true;break;}
    if(hill){ // 지형: 기둥 높이를 곡선으로 잇고, 장면 색 바위에 밝은 능선
      ctx.beginPath();ctx.moveTo(-4,H+4);ctx.lineTo(-4,H-F.hill[0]);
      for(c=0;c<N;c++){var jag=F.hill[c]>4?((c*37)%7-3)*1.6:0,x=(c+.5)*C,y=H-F.hill[c]+jag,nx=(c+1.5)*C,ny=H-F.hill[Math.min(N-1,c+1)];ctx.lineTo(x-6,y+Math.abs(jag)*.5);ctx.quadraticCurveTo(x,y-2,(x+nx)/2,(y+ny)/2);} // 바위 윤곽이 매끈한 돔이 되지 않게 기둥마다 조금씩 깬다
      ctx.lineTo(W+4,H-F.hill[N-1]);ctx.lineTo(W+4,H+4);ctx.closePath();
      var g=ctx.createLinearGradient(0,H-110,0,H);if(Ink){g.addColorStop(0,'#1e1a18');g.addColorStop(.45,'#3d3832');g.addColorStop(1,'#6a625a');}else{g.addColorStop(0,mix('#3a3346',theme,.5));g.addColorStop(.35,mix('#201b2a',theme,.4));g.addColorStop(1,'#07050c');}ctx.globalAlpha=.97;ctx.fillStyle=g;ctx.fill();
      ctx.save();ctx.clip();ctx.globalAlpha=.35;ctx.strokeStyle='#07060b';ctx.lineWidth=1;for(k=0;k<22;k++){var hx=(k*53)%W,hy=H-6-(k*29)%96;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+10,hy+4);ctx.lineTo(hx+18,hy+2);ctx.stroke();}ctx.restore(); // 바위 결·균열
      if(!Ink){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;ctx.strokeStyle=theme;ctx.lineWidth=9;ctx.stroke();ctx.globalCompositeOperation='source-over';}
      ctx.globalAlpha=1;ctx.strokeStyle=Ink?PAPER:mix(theme,'#ffffff',.72);ctx.lineWidth=Ink?2:3;ctx.stroke(); // 밟을 수 있는 능선이 보이게 밝은 테
      if(mode==='playing')for(c=0;c<N;c++)if(F.goal[c]>F.hill[c]+1&&Math.random()<.25)addParticle((c+Math.random())*C,H-F.hill[c],(Math.random()-.5)*1.2,-.6-Math.random()*1.2,22,stoneEdge,2.2); // 솟는 동안 흙먼지
    }
    // 쌓인 돌: 칸 사이 틈 없이 한 덩어리로 칠하고, 바깥 윤곽에만 테를 두른다(심사 4차: 칸마다 틈이 있는 UI 타일 같음)
    var cellAt=function(cc,rr){return cc>=0&&cc<N&&rr>=0&&rr<6&&F.grid[rr*N+cc];};
    for(r=0;r<6;r++)for(c=0;c<N;c++){if(!F.grid[r*N+c])continue;var bx=c*C,by=H-(r+1)*C,vary=((r*7+c*3)%3-1)*.1,gr=ctx.createLinearGradient(0,by,0,by+C);
      gr.addColorStop(0,mix(stone,vary>0?'#ffffff':'#000000',Math.abs(vary)));gr.addColorStop(1,mix(stone,'#06050a',.55));ctx.globalAlpha=.97;ctx.fillStyle=gr;ctx.fillRect(bx,by,C,C);
      ctx.globalAlpha=.3;ctx.strokeStyle='#07060b';ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,C-1,C-1); // 옅은 이음매
      if((r*5+c*11)%4===0){ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(bx+8,by+6);ctx.lineTo(bx+14,by+15);ctx.lineTo(bx+11,by+C-6);ctx.stroke();}}
    if(Ink){ // 수묵: 덩어리 가장자리에 먹 고임(짙은 굵은 테, 조금씩 흔들림), 안쪽에 비백 점
      ctx.globalAlpha=.8;ctx.strokeStyle='#141110';ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();
      for(r=0;r<6;r++)for(c=0;c<N;c++){if(!F.grid[r*N+c])continue;var px=c*C,py=H-(r+1)*C,j1=((c*13+r*7)%5-2)*.5,j2=((c*5+r*11)%5-2)*.5;
        if(!cellAt(c-1,r)){ctx.moveTo(px+2.5+j1,py);ctx.lineTo(px+2.5+j2,py+C);}if(!cellAt(c+1,r)){ctx.moveTo(px+C-2.5+j2,py);ctx.lineTo(px+C-2.5+j1,py+C);}if(!cellAt(c,r+1)){ctx.moveTo(px,py+2.5+j1);ctx.lineTo(px+C,py+2.5+j2);}}
      ctx.stroke();ctx.fillStyle=PAPER;
      for(r=0;r<6;r++)for(c=0;c<N;c++){if(!F.grid[r*N+c])continue;for(k=0;k<3;k++){ctx.globalAlpha=.16+.1*((c+r+k)%3);ctx.fillRect(c*C+6+((c*17+r*29+k*11)%(C-12)),H-(r+1)*C+7+((c*23+r*5+k*19)%(C-13)),2.2-k*.5,1.2);}}
    }
    ctx.globalAlpha=Ink?.55:.9;ctx.strokeStyle=stoneEdge;ctx.lineWidth=Ink?1:1.5;ctx.beginPath();
    for(r=0;r<6;r++)for(c=0;c<N;c++){if(!F.grid[r*N+c])continue;var ex0=c*C,ey0=H-(r+1)*C;if(!cellAt(c-1,r)){ctx.moveTo(ex0+.75,ey0);ctx.lineTo(ex0+.75,ey0+C);}if(!cellAt(c+1,r)){ctx.moveTo(ex0+C-.75,ey0);ctx.lineTo(ex0+C-.75,ey0+C);}}
    ctx.stroke();
    ctx.globalAlpha=.85;ctx.fillStyle=Ink?PAPER:mix(theme,'#ffffff',.5);for(c=0;c<N;c++){for(r=5;r>=0&&!F.grid[r*N+c];r--);if(r>=0)ctx.fillRect(c*C,H-(r+1)*C,C,2);} // 쌓인 더미의 새 바닥선
    var next=null;for(k=0;k<F.pieces.length;k++)if(!next||F.pieces[k].y-F.pieces[k].land*C>next.y-next.land*C)next=F.pieces[k];
    for(k=0;k<F.pieces.length;k++){var q=F.pieces[k],j;
      if(q===next){ctx.globalAlpha=Ink?.9:.75;ctx.strokeStyle=PIECE;ctx.lineWidth=Ink?2.6:1.5;ctx.setLineDash([4,3]);ctx.beginPath(); // 가장 먼저 닿을 조각의 착지 자리만, 조각 외곽선 하나로
        for(j=0;j<q.cells.length;j++){var gx=(q.col+q.cells[j][0])*C,gy=H-(q.land+q.cells[j][1]+1)*C,cx0=q.cells[j][0],cy0=q.cells[j][1],has=function(dx,dy){for(var z=0;z<q.cells.length;z++)if(q.cells[z][0]===cx0+dx&&q.cells[z][1]===cy0+dy)return true;return false;};
          if(!has(0,1)){ctx.moveTo(gx+2,gy+2);ctx.lineTo(gx+C-2,gy+2);}if(!has(0,-1)){ctx.moveTo(gx+2,gy+C-2);ctx.lineTo(gx+C-2,gy+C-2);}if(!has(-1,0)){ctx.moveTo(gx+2,gy+2);ctx.lineTo(gx+2,gy+C-2);}if(!has(1,0)){ctx.moveTo(gx+C-2,gy+2);ctx.lineTo(gx+C-2,gy+C-2);}}
        ctx.stroke();ctx.setLineDash([]);}
      var own=function(dx,dy,cx1,cy1){for(var z=0;z<q.cells.length;z++)if(q.cells[z][0]===cx1+dx&&q.cells[z][1]===cy1+dy)return true;return false;};
            for(j=0;j<q.cells.length;j++){var tx2=(q.col+q.cells[j][0])*C,ty2=q.y-(q.cells[j][1]+1)*C;ctx.globalAlpha=Ink?.26:.42;ctx.fillStyle=live;ctx.fillRect(tx2,ty2,C,C);} // 속은 반투명: 탄이 비쳐 보이게
      ctx.globalAlpha=1;ctx.strokeStyle=PIECE===HOT?mix(HOT,'#ffd0c4',.3*pulse):PIECE;ctx.lineWidth=PIECE===HOT?2:2.6;ctx.beginPath();
      for(j=0;j<q.cells.length;j++){var ox=(q.col+q.cells[j][0])*C,oy=q.y-(q.cells[j][1]+1)*C,a0=q.cells[j][0],b0=q.cells[j][1];
        if(!own(0,1,a0,b0)){ctx.moveTo(ox,oy+1);ctx.lineTo(ox+C,oy+1);}if(!own(0,-1,a0,b0)){ctx.moveTo(ox,oy+C-1);ctx.lineTo(ox+C,oy+C-1);}if(!own(-1,0,a0,b0)){ctx.moveTo(ox+1,oy);ctx.lineTo(ox+1,oy+C);}if(!own(1,0,a0,b0)){ctx.moveTo(ox+C-1,oy);ctx.lineTo(ox+C-1,oy+C);}}
      ctx.shadowColor=PIECE;ctx.shadowBlur=lite?0:8+6*pulse;ctx.stroke();ctx.shadowBlur=0;} // 바깥 윤곽 한 줄만 밝게, 둘레로 부드럽게 번지는 빛
    // 깨지는 조각(사용자 11-16): 맞으면 금 없이 한지빛으로 깜빡이고, 다 깨지면 솟는 먹 그림처럼 먹폭발로 터져 사라진다("깨지는 검은선표시말고 그냥 깜빡이다가 그림들처럼 폭발하고 사라지도록").
    for(k=0;k<F.pieces.length;k++){var bq=F.pieces[k],dmg=bq.maxHp?1-Math.max(0,bq.hp)/bq.maxHp:0,since=s.tick-(bq.hitTick===undefined?-99:bq.hitTick),blink=since<10?(since>>1)%2===0:dmg>.55&&((s.tick>>2)%(dmg>.8?2:4)===0);
      for(j=0;j<bq.cells.length;j++){var qx=(bq.col+bq.cells[j][0])*C,qy=bq.y-(bq.cells[j][1]+1)*C;ctx.fillStyle=Ink?'#1e1a18':'#ffffff';
        if(dmg>0){ctx.globalAlpha=dmg<.34?.14:dmg<.67?.3:.46;ctx.fillRect(qx+1,qy+1,C-2,C-2);} // 깎인 만큼 속이 세 단계로 먹에 찬다(선 없이 면으로만, 칸 이음매까지 메워 한 덩어리로)
        if(blink){ctx.globalAlpha=since<10?.55:.32;ctx.fillRect(qx+2,qy+2,C-4,C-4);}}} // 맞은 직후 다섯 번 먹빛으로 깜빡(한지빛은 바탕에 묻혔다), 반 넘게 깎이면 스스로 깜빡이며 곧 깨질 것을 알린다. 윤곽은 늘 그대로
    ctx.globalAlpha=1;
    if(F.bursts)for(k=0;k<F.bursts.length;k++){var bb=F.bursts[k],mx0=0,my0=0;for(j=0;j<bb.cells.length;j++){mx0+=(bb.col+bb.cells[j][0]+.5)*C;my0+=bb.y-(bb.cells[j][1]+.5)*C;}
      mx0/=bb.cells.length;my0/=bb.cells.length;if(bb.age<8){ctx.globalAlpha=.62*(1-bb.age/8);ctx.fillStyle=PAPER;ctx.beginPath();ctx.ellipse(mx0,my0,C*(1.1+.3*bb.cells.length),C*(1+.25*bb.cells.length),0,0,TAU);ctx.fill();}} /* 터지는 자리 뒤(탄 아래)를 한지 여백으로 걷어 탄막과 떼어 놓는다. 먹 덩이와 폭발은 drawPieceScores 에서 탄 위에 */
    ctx.globalAlpha=1;
    for(k=0;k<F.warns.length;k++){var w=F.warns[k],a=Math.min(1,w.age/8)*(.8+.2*Math.sin(w.age*.5)); // 아래에서 올라올 몹: 바닥 가장자리에 빛과 위쪽 화살
      var gl=ctx.createRadialGradient(w.x,H,0,w.x,H,40);gl.addColorStop(0,HOT);gl.addColorStop(.5,'rgba(255,90,60,.35)');gl.addColorStop(1,'rgba(255,90,60,0)');ctx.globalCompositeOperation=Ink?'source-over':'lighter';ctx.globalAlpha=.95*a;ctx.fillStyle=gl;ctx.beginPath();ctx.arc(w.x,H,40,Math.PI,TAU);ctx.fill();ctx.globalCompositeOperation='source-over';
      for(var ch=0;ch<3;ch++){var cy=H-26-ch*15-(w.age%16)*.9,ca=a;ctx.globalAlpha=ca;ctx.strokeStyle='#2a0806';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w.x-13,cy+8);ctx.lineTo(w.x,cy-4);ctx.lineTo(w.x+13,cy+8);ctx.stroke();ctx.strokeStyle=HOT;ctx.lineWidth=3;ctx.stroke();}}
    var fog=ctx.createLinearGradient(0,H-30,0,H);fog.addColorStop(0,Ink?'rgba(242,233,214,0)':'rgba(0,0,0,0)');fog.addColorStop(1,Ink?'rgba(242,233,214,.9)':mix(theme,'#05040a',.7));ctx.globalAlpha=.75;ctx.fillStyle=fog;ctx.fillRect(0,H-30,W,30); // 바닥 요소 밑동을 장면 안개에 묻는다(접지감)
    ctx.restore();
  }
  // 아래에서 솟는 수묵 소재(사용자 11-15): 예고는 인주색 화살, 그림은 먹(곱하기 합성)으로. 그림은 종류마다 한 번 구워 둔다.
  var riserArt={},RISER_FUME={candle:[1.1,-.95],cauldron:[.8,-.5],vial:[.2,-1.0],hourglass:[.1,.1],skull:[.5,-.1],chalice:[.8,-.9]},RISER_THIN={syringe:.45,heel:.85,tomb:.7,sword:.3,spear:.3,bamboo:.5,chain:.35,key:.45,hexagram:.8,scythe:.75,vial:.6,tower:.55,rose:.6,candle:.75,chalice:.7}; // 솟을 자리 띠 폭(그림 폭을 따른다)
  function riserSprite(r){var key=r.kind+':'+r.emblem+':'+scale,hit=riserArt[key];if(hit)return hit;var M=global.InkMotifs;if(!M||!M[r.kind])return null;
    var half=r.size*1.5,c=offscreen(half*2*scale,half*2*scale),q=c.getContext('2d');q.scale(scale,scale);q.translate(half,half);
    if(Ink&&Ink.raw)Ink.raw(1);try{M[r.kind](q,r.size,r.kind==='glyph'?Arcade.GLYPHS[r.emblem]:null);}finally{if(Ink&&Ink.raw)Ink.raw(-1);}
    if(M.seeThrough)try{var pd=q.getImageData(0,0,c.width,c.height);M.seeThrough(pd.data);q.putImageData(pd,0,0);}catch(e){} // 흰빛·한지로 칠한 면은 바탕이 비치게(사용자 11-16)
    return riserArt[key]={image:c,half:half};}
  function drawRisers(s,under){var R=s.risers;if(!R||!R.length)return;ctx.save();
    for(var k=0;k<R.length;k++){var r=R[k],HOT=Ink?'#c2362a':FLOOR_HOT,INKC='#1e1a18',PAPERC='#f2e9d6',wide=r.size*(RISER_THIN[r.kind]||.9);
      if(r.age<Arcade.RISER_WARN){if(under)continue;var a=Math.min(1,r.age/8)*(.8+.2*Math.sin(r.age*.5)); // 솟을 자리: 솟을 폭만큼의 인주 띠, 한지 바탕에 먹 테를 두른 화살, 머물 높이까지 잇는 점선
        ctx.globalAlpha=.85*a;ctx.fillStyle=HOT;ctx.fillRect(r.x-wide,H-5,wide*2,5);
        ctx.globalAlpha=.55*a;ctx.strokeStyle=HOT;ctx.lineWidth=1.6;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(r.x,H-70);ctx.lineTo(r.x,r.apex);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(r.x-9,r.apex);ctx.lineTo(r.x+9,r.apex);ctx.stroke();
        for(var ch=0;ch<3;ch++){var cy=H-26-ch*15-(r.age%16)*.9;ctx.globalAlpha=a;ctx.lineJoin='round';ctx.strokeStyle=PAPERC;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(r.x-13,cy+8);ctx.lineTo(r.x,cy-4);ctx.lineTo(r.x+13,cy+8);ctx.stroke();ctx.strokeStyle=INKC;ctx.lineWidth=6.5;ctx.stroke();ctx.strokeStyle=HOT;ctx.lineWidth=3.6;ctx.stroke();}
        continue;}
      var art=riserSprite(r);if(!art)continue;var f=r.fade?r.fade/Arcade.RISER_FADE:0,bob=Math.sin(visual*2.2+k)*2,rising=!r.fade&&r.y>r.apex+2,sq=r.held>0&&r.held<10?1-.08*Math.sin(r.held/10*Math.PI):1;
      if(under&&rising){var tg=ctx.createLinearGradient(0,r.y,0,H);tg.addColorStop(0,'rgba(30,26,24,.42)');tg.addColorStop(1,'rgba(30,26,24,0)');ctx.fillStyle=tg; // 솟는 동안 아래로 끌리는 갈필 먹 자국(세 갈래)
        for(var st=-1;st<=1;st++)ctx.fillRect(r.x+st*r.size*.13-r.size*.04,r.y+r.size*.3,r.size*.08,(H-r.y)*(st?.7:1));}
      if(!under&&r.held===1&&!r.splashed){r.splashed=true;for(var d=0;d<11;d++)addParticle(r.x+(Math.random()-.5)*r.size*1.2,r.y+r.size*.8,(Math.random()-.5)*3.6,-.6-Math.random()*2.4,30,INKC,2.6+Math.random()*3.4);} // 다 솟은 순간 먹물이 튄다
      var mv=r.kind,spin=mv==='whirl'?-visual*2.6:mv==='gear'?visual*1.5:0,swing=mv==='web'?Math.sin(visual*1.4+k)*.045:mv==='mirror'||mv==='key'?Math.sin(visual*1.9+k)*.04:mv==='bell'?Math.sin(visual*3.2+k)*.09:mv==='chain'?Math.sin(visual*2.1+k)*.07:mv==='scythe'?Math.sin(visual*1.7+k)*.05:0,swayX=mv==='cloud'?Math.sin(visual*1.1+k)*5:mv==='wave'?Math.sin(visual*2+k)*3:0,flick=mv==='flame'?1+.07*Math.sin(visual*11+k)+.04*Math.sin(visual*17):1; // 움직이는 소재: 회오리·톱니는 돌고, 구름·파도는 흐르고, 불길은 일렁이고, 종·사슬·낫은 위쪽을 축으로 흔들린다(판정 원 안에서만 움직인다)
      ctx.save();ctx.translate(r.x+swayX,r.y+bob);ctx.rotate(r.lean*(1-f)+Math.sin(visual*1.3+k*2)*.03);ctx.scale(2-sq,sq);
      if(under){ /* 한지 여백(바탕 가림)은 없앴다: 그림 둘레로 배경이 그대로 보이게(사용자 11-16 "앵간한거 다 배경처리해") */
      // 밑동의 먹 번짐: 모든 소재에 같은 표시로 '솟은 위험물'임을 알린다
      var bg=ctx.createRadialGradient(0,r.size*.98,0,0,r.size*.98,r.size*.7);bg.addColorStop(0,'rgba(30,26,24,.5)');bg.addColorStop(1,'rgba(30,26,24,0)');ctx.globalAlpha=1-f;ctx.fillStyle=bg;ctx.save();ctx.scale(1,.32);ctx.beginPath();ctx.arc(0,r.size*.98/.32,r.size*.7,0,TAU);ctx.fill();ctx.restore();ctx.restore();continue;}
      var rdm=r.maxHp?1-Math.max(0,r.hp)/r.maxHp:0,rsn=s.tick-(r.hitTick===undefined?-99:r.hitTick),rbl=!f&&(rsn<10?(rsn>>1)%2===0:rdm>.55&&((s.tick>>2)%(rdm>.8?2:4)===0)); /* 탄에 맞으면 테트리스 조각처럼 깜빡인다(사용자 11-16) */
      if(r.broken&&f){ctx.restore();drawRiserShards(r,art,f,k);continue;} /* 깨진 그림은 유령 그림 대신 조각으로 흩어진다 */
      ctx.globalAlpha=f?Math.max(0,.45-f*.9):1;if(rbl)ctx.translate((rsn&1?1.6:-1.6),0);ctx.globalCompositeOperation=Ink?'multiply':'source-over';if(!f&&RISER_FUME[mv]&&s.tick%9===k%9&&r.fumeTick!==s.tick){r.fumeTick=s.tick;var fu=RISER_FUME[mv];addParticle(r.x+(Math.random()-.5)*r.size*fu[0],r.y+r.size*fu[1],(Math.random()-.5)*.5,-.5-Math.random()*.7,34,INKC,1.4+Math.random()*1.8);} // 촛불 그을음·가마솥 김·약병 기포·모래: 먹 점이 피어오른다(그리기만)
      var blink=mv==='eye'?Math.max(0,1-Math.abs(((visual*.55+k*.37)%1)-.5)*14):0,flap=mv==='wing'?1+.05*Math.sin(visual*4.2+k):mv==='book'?1+.03*Math.sin(visual*3+k):1;
      ctx.save();if(spin)ctx.rotate(spin);if(blink)ctx.scale(1,1-.82*blink);if(flap!==1){ctx.translate(-r.size*.62,0);ctx.scale(flap,2-flap);ctx.translate(r.size*.62,0);}if(swing){ctx.translate(0,-r.size*.85);ctx.rotate(swing);ctx.translate(0,r.size*.85);}if(flick!==1){ctx.translate(0,r.size*.9);ctx.scale(2-flick,flick);ctx.translate(0,-r.size*.9);}ctx.drawImage(art.image,-art.half,-art.half,art.half*2,art.half*2);if(rbl){ctx.globalAlpha=.85;ctx.drawImage(art.image,-art.half,-art.half,art.half*2,art.half*2);} /* 맞으면 먹이 한 번 더 짙게 번쩍(바래지 않게, 재심사 연출·조명) */ctx.restore();ctx.globalCompositeOperation='source-over';
      if(!f){var sx=Math.min(r.size*.62,(RISER_THIN[r.kind]||.9)*r.size+16),sy=r.size*.86,pl=.75+.25*Math.sin(visual*6+k);ctx.globalAlpha=.75+.25*pl;ctx.fillStyle=PAPERC;ctx.fillRect(sx-14.5,sy-14.5,29,29);ctx.fillStyle=INKC;ctx.fillRect(sx-12.5,sy-12.5,25,25);ctx.fillStyle=HOT;ctx.fillRect(sx-10.5,sy-10.5,21,21);ctx.fillStyle=PAPERC;ctx.fillRect(sx-5.2,sy-5.2,10.4,3.2);ctx.fillRect(sx-5.2,sy+2,10.4,3.2);} // 판정이 켜진 동안만 찍히는 인주 낙관(경고 표시). 사라질 때는 꺼진다
      ctx.restore();if(r.fade)drawInkBurst(r,f,k);}
    ctx.restore();}
  /* 깨진 그림(사용자 11-16 "그림도 테트리스처럼 공격으로 폭파시킬수 있게"): 구운 그림을 네모 조각 4×5로 잘라 테트리스 조각처럼 바깥으로 튀고 돌며 떨어진다. 먹폭발은 그 뒤에 함께 핀다. */
  function drawRiserShards(r,art,f,k){var img=art.image,cw=img.width/4,ch=img.height/5,dw=art.half*2/4,dh=art.half*2/5,sd=((r.x*31+r.size*17+k*7)|0)>>>0,rn=function(){sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296;},e=1-Math.pow(1-f,2),cx=r.x,cy=r.y;
    ctx.save();ctx.globalCompositeOperation=Ink?'multiply':'source-over';
    for(var i=0;i<4;i++)for(var j=0;j<5;j++){var ox=-art.half+(i+.5)*dw,oy=-art.half+(j+.5)*dh,len=Math.hypot(ox,oy)||1,sp=r.size*(.5+rn()*.9),vx=ox/len*sp+(rn()-.5)*r.size*.3,vy=oy/len*sp-r.size*(.2+rn()*.4),rot=(rn()-.5)*5,cut=rn();
      if(cut<.12)continue; /* 몇 조각은 먹폭발 속에 사라진다 */
      ctx.save();ctx.translate(cx+ox+vx*e,cy+oy+vy*e+f*f*r.size*1.3);ctx.rotate(rot*e);var sc=1-.35*f;ctx.scale(sc,sc);ctx.globalAlpha=Math.max(0,1-f*1.15);
      ctx.drawImage(img,i*cw,j*ch,cw,ch,-dw/2,-dh/2,dw,dh);ctx.restore();}
    ctx.restore();drawInkBurst(r,f,k);}
  /* 먹 폭발(사용자 11-16 "사라지그전에 먹폭발한변하고 사라지도록 불꽃놀이 수묵화버전마냥 화려하게"): 솟은 그림이 사라질 때 먹물이 불꽃처럼 터진다.
     옅은 먹(담묵)으로만 그려 가장 짙은 먹인 적 탄과 헷갈리지 않는다. 가운데 먹 덩이가 번지고 → 첫 꽃(붓 획 빛살 열여덟, 끝에 먹방울, 뒤로 떨어지는 먹점) → 늦게 피는 둘째 꽃(작은 먹꽃 여럿). 그리기만 하고 판정은 없다. 감싸는 원은 그리지 않는다. */
  function drawInkBurst(r,f,k){var sd=((r.x*73+r.size*11+k*37)|0)>>>0,rn=function(){sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296;},S=r.size,cx=r.x,cy=r.y-S*.1,C=Ink?'#1e1a18':'#ffe2a0',P=Ink?'#fbf6ea':'#ffffff',e=1-Math.pow(1-Math.min(1,f*1.7),3),fall=f*f*S*.8,al=Math.pow(1-f,1.15),punch=f<.2?1-f/.2:0,i,j,t,q,n;
    ctx.save();ctx.lineCap='round';
    if(f<.3){var pa=1-f/.3;ctx.globalAlpha=.7*pa;var pg=ctx.createRadialGradient(cx,cy,0,cx,cy,S*(.5+.9*e));pg.addColorStop(0,P);pg.addColorStop(1,Ink?'rgba(251,246,234,0)':'rgba(255,255,255,0)');ctx.fillStyle=pg;ctx.fillRect(cx-S*1.5,cy-S*1.5,S*3,S*3);} // 터지는 순간 가운데가 한지빛으로 번쩍(밝은 쪽 대비라 짙은 탄과 겹치지 않는다)
    ctx.globalCompositeOperation=Ink?'multiply':'lighter';ctx.fillStyle=C;ctx.strokeStyle=C;
    if(f<.45){var ca=1-f/.45;ctx.globalAlpha=(.42+.25*punch)*ca;ctx.beginPath();n=18;for(i=0;i<=n;i++){t=i/n*TAU;q=S*(.18+.42*e)*(i<n?.7+.6*rn():1);if(i===n){ctx.closePath();break;}var px=cx+Math.cos(t)*q,py=cy+Math.sin(t)*q;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.fill();} // 가운데 먹 덩이가 퍼지며 옅어진다
    n=18;for(i=0;i<n;i++){var big=i%3===0,ang=i/n*TAU+rn()*.3,L=S*(big?1.6+.7*rn():.8+.5*rn())*e,w=S*(big?.09+.04*rn():.035+.03*rn()),hx=cx+Math.cos(ang)*L,hy=cy+Math.sin(ang)*L+fall*(big?1.2:.8),tx=cx+Math.cos(ang)*L*.3,ty=cy+Math.sin(ang)*L*.3+fall*.3; // 첫 꽃: 긴 붓 획 여섯·짧은 획 열둘, 끝이 무게로 처진다
      ctx.globalAlpha=al*(big?.42+.3*punch:.28+.15*rn());ctx.lineWidth=w*(1-f*.6);ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo(cx+Math.cos(ang)*L*.72,cy+Math.sin(ang)*L*.72+fall*.4,hx,hy);ctx.stroke();
      var hr=w*(.9+.5*rn())*(1-f*.4),ux=Math.cos(ang),uy=Math.sin(ang);ctx.globalAlpha=al*(big?.45:.3);ctx.beginPath();ctx.moveTo(hx+ux*hr*1.8,hy+uy*hr*1.8);ctx.quadraticCurveTo(hx-uy*hr*1.2,hy+ux*hr*1.2,hx-ux*hr,hy-uy*hr);ctx.quadraticCurveTo(hx+uy*hr*1.2,hy-ux*hr*1.2,hx+ux*hr*1.8,hy+uy*hr*1.8);ctx.fill(); // 끝의 먹방울: 물방울 꼴(둥근 탄과 헷갈리지 않게)
      for(j=1;j<=3;j++){var bk=L*(1-j*.16),dx=cx+Math.cos(ang)*bk,dy=cy+Math.sin(ang)*bk+fall*(1+j*.35);ctx.globalAlpha=al*(.28-.07*j);ctx.fillRect(dx-w*.2,dy-w*.45,w*.4,w*.9);}} // 뒤로 흘러내리는 먹점
    var B=[[.18,.55],[.3,.55],[.42,.5]];for(i=0;i<3;i++){var st0=B[i][0];if(f<st0)continue; // 둘째 꽃: 시차를 두고 크게 피는 먹꽃 셋
      var g2=Math.min(1,(f-st0)/B[i][1]),e2=1-Math.pow(1-g2,2),a2=Math.pow(1-g2,1.2)*.55,ba=rn()*TAU+i*2.1,br=S*(1.1+.5*rn()),bx=cx+Math.cos(ba)*br,by=cy+Math.sin(ba)*br*.8+fall*1.1,m=12;
      ctx.globalAlpha=a2*.8;ctx.fillRect(bx-S*.04,by-S*.04,S*.08,S*.08);
      for(j=0;j<m;j++){var sa=j/m*TAU+rn()*.4,sl=S*(.32+.2*rn())*e2;ctx.globalAlpha=a2*(.45+.4*rn());ctx.lineWidth=S*(.03+.02*rn());ctx.beginPath();ctx.moveTo(bx+Math.cos(sa)*sl*.25,by+Math.sin(sa)*sl*.25);ctx.quadraticCurveTo(bx+Math.cos(sa)*sl*.7,by+Math.sin(sa)*sl*.7,bx+Math.cos(sa)*sl,by+Math.sin(sa)*sl+sl*.35*g2);ctx.stroke();}}
    ctx.restore();}
  // 영웅이 바닥 줄·떨어지는 조각과 겹칠 때 영웅 뒤에 어두운 후광을 깔아 묻히지 않게 한다(심사 4차)
  function drawHeroGuard(s){var F=s.floor,p=s.player,near=false,k;if(!F)return;
    for(k=0;k<s.lasers.length&&!near;k++)if(s.lasers[k].floor&&Math.abs(s.lasers[k].y-p.y)<26)near=true;
    for(k=0;k<F.pieces.length&&!near;k++)if(Math.abs(F.pieces[k].y-Arcade.FLOOR_CELL-p.y)<60)near=true;
    if(!near)return;var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,24);g.addColorStop(0,'rgba(5,4,10,.75)');g.addColorStop(1,'rgba(5,4,10,0)');ctx.save();ctx.fillStyle=g;ctx.fillRect(p.x-24,p.y-24,48,48);ctx.restore();}
  function drawItems(s){
    // 하트가 고동친다. 드라이브 하트 그림(heart)이 있으면 점수 아이템은 그 그림으로.
    var beat=1+Math.sin(visual*7)*.08;
    for(var i=0;i<s.itemCount;i++){var z=ITEM_DRAW*beat*(s.ikind[i]?1.15:1),sway=Math.sin(visual*5+s.ix[i]*.13)*3;ctx.globalAlpha=s.iy[i]>H-104?.45:1;ctx.drawImage(itemSprites[s.ikind[i]],s.ix[i]+sway-z/2,s.iy[i]-z/2,z,z);} // 하트는 좌우로 살랑이며 떨어진다: 곧게 날아오는 탄과 움직임이 다르다(그리기만, 줍는 판정은 그대로)ctx.globalAlpha=1; // 아래쪽 버튼·점수 자리에서는 흐리게
  }
  function drawProp(s,i,grow,alpha){
    var prop=Arcade.PROPS[s.bcolor[i]];if(!prop)return;
    var img=images[prop.key],x=s.bx[i],y=s.by[i];
    if(!img)requestProp(prop.key); // 기물은 처음 화면에 나타날 때 받는다
    // 육망성처럼 upright인 기물은 절대 돌리지 않는다. 도는 기물은 제자리에서 돌고, 그 밖에는 끝이 진행 방향을 본다.
    var turn=prop.upright?0:s.bspin[i]?s.bage[i]*s.bspin[i]:s.ba[i],cos=Math.cos(turn),sin=Math.sin(turn),core=orbs[0][8],glow=orbs[2][propGlow(prop)]||orbs[2][8],reach=glow.half*1.5*grow,long=propLong(prop)*s.sizeScale*grow;
    ctx.globalAlpha=alpha*.5;ctx.drawImage(glow.image,x-reach,y-reach,reach*2,reach*2);
    ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(x+offsetX)*scale,(y+offsetY)*scale);ctx.globalAlpha=alpha;
    if(img){var sh=sheetOf(prop.key,img),k=long/Math.max(sh.cw,sh.ch),w=sh.cw*k,h=sh.ch*k;
      // 돌지 않는 기물은 지나온 쪽에 옅은 잔상 둘을 남겨 떨어지는 방향을 읽히게 한다(심사 2차 애니메이션).
      if(prop.upright){var bx=-Math.cos(s.ba[i])*long*.3,by=-Math.sin(s.ba[i])*long*.3;ctx.globalAlpha=alpha*.22;drawCell(prop.key,img,0,true,bx*2-w/2,by*2-h/2,w,h);ctx.globalAlpha=alpha*.4;drawCell(prop.key,img,0,true,bx-w/2,by-h/2,w,h);ctx.globalAlpha=alpha;}
      drawCell(prop.key,img,0,true,-w/2,-h/2,w,h);}
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
  function drawPropArt(key,c,u){var keep=ctx;ctx=c;ctx.save();if(key!=='hexagram')ctx.rotate(key==='skull'?-Math.PI/2:Math.PI/2);if(key==='skull')drawSkull(u);else if(key==='hexagram')drawHexagram(u);else drawHand(u);ctx.restore();ctx=keep;} // 육망성은 똑바로 선 기물이라 돌리지 않는다
  // 금빛 육망성(사용자 11-16: 적이 쓰던 십자가 대신). 교단의 봉인진: 맞물린 두 삼각형에 변마다 새긴 눈금, 가운데 감긴 눈. 속은 비어 탄 너머가 보인다(심사 2차: 밝은 면이 탄보다 튀지 않게 한 단 어둡게).
  function drawHexagram(u){var R=u*.98,k,i;ctx.lineJoin='round';ctx.lineCap='round';
    for(k=0;k<2;k++){var base=k?Math.PI/2:-Math.PI/2,P=[];for(i=0;i<3;i++){var a=base+i*TAU/3;P.push([Math.cos(a)*R,Math.sin(a)*R]);}
      ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);ctx.lineTo(P[1][0],P[1][1]);ctx.lineTo(P[2][0],P[2][1]);ctx.closePath();
      ctx.strokeStyle='#1e1206';ctx.lineWidth=u*.3;ctx.stroke();var g=ctx.createLinearGradient(0,-R,0,R);g.addColorStop(0,'#d9a83c');g.addColorStop(.55,'#a8761e');g.addColorStop(1,'#6a440c');ctx.strokeStyle=g;ctx.lineWidth=u*.17;ctx.stroke();
      ctx.strokeStyle='rgba(255,236,170,.45)';ctx.lineWidth=u*.035;ctx.stroke();
      ctx.strokeStyle='#1e1206';ctx.lineWidth=u*.05;for(i=0;i<3;i++){var A=P[i],B=P[(i+1)%3],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;[.2,.8].forEach(function(f){var x=A[0]+dx*f,y=A[1]+dy*f;ctx.beginPath();ctx.moveTo(x-nx*u*.09,y-ny*u*.09);ctx.lineTo(x+nx*u*.09,y+ny*u*.09);ctx.stroke();});}} // 변마다 새긴 눈금
    ctx.fillStyle='#1e1206';ctx.beginPath();ctx.moveTo(-u*.3,0);ctx.quadraticCurveTo(0,-u*.2,u*.3,0);ctx.quadraticCurveTo(0,u*.2,-u*.3,0);ctx.closePath();ctx.fill(); // 가운데 감긴 눈
    ctx.fillStyle='#c8962e';ctx.beginPath();ctx.arc(0,0,u*.07,0,TAU);ctx.fill();
    ctx.fillStyle='#e8c46a';for(i=0;i<6;i++){var b=-Math.PI/2+i*Math.PI/3;ctx.beginPath();ctx.arc(Math.cos(b)*R,Math.sin(b)*R,u*.07,0,TAU);ctx.fill();}
  }
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
    var sheet=s.stage==='card'?laserSheet(s):null,under=1;
    for(var u=0;u<s.figures.length;u++){var fu=s.figures[u];if(fu.sigil&&fu.age>=fu.warn){under=LASER_UNDER_SIGIL;break;}} // 큰 육망성이 켜진 동안 다른 광선은 한 발 물러선다(심사 6.13: 마법진 선과 방사 광선이 구분되지 않음). 판정은 그대로
    ctx.save();ctx.lineCap='butt';
    for(var i=0;i<s.lasers.length;i++){
      var l=s.lasers[i],color=l.floor?FLOOR_HOT:COLORS[l.color]||'#ffffff',angle=finite(l.angle,0),lx=finite(l.x,0),ly=finite(l.y,0),x2=lx+Math.cos(angle)*1000,y2=ly+Math.sin(angle)*1000;
      var un=l.floor?1:under; // 아래쪽 ㅡ·= 줄(사용자 11-15)은 육망성 아래에서도 또렷하게: 위로 몰아내는 선이라 보여야 한다
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x2,y2);
      if(l.age<l.warn){
        var t=l.age/l.warn,blink=.5+.5*Math.sin(l.age*(.25+t*.5));
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Ink&&l.floor?.55+.35*t:WARN_RED?.22+.26*t:.10+.16*t;ctx.strokeStyle=Ink&&l.floor||WARN_RED?'#c9406e':color;ctx.lineWidth=Ink&&l.floor?Math.max(2.6,l.width*(.25+.75*t)):l.width*(.25+.75*t);ctx.setLineDash([]);ctx.stroke();
        ctx.globalAlpha=.45+.5*blink;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.setLineDash([7,6]);ctx.stroke();
      }else{
        var over=l.age-l.warn-l.active,k=over>0?Math.max(0,1-over/Arcade.BEAM_FADE):Math.min(1,(l.age-l.warn+1)/4),pulse=1+Math.sin(visual*40+i)*.06;
        ctx.setLineDash([]);ctx.globalCompositeOperation='lighter';var dim=(paleOf(color)?PALE_BEAM_DIM:BEAM_DIM)*un; // 금빛·흰빛 광선은 빛무리를 줄인다(심사 6.36: 노란 광선이 화면에서 가장 밝아 탄과 영웅을 덮음)
        if(!lite&&l.floor){ctx.globalAlpha=.2*k*dim;ctx.strokeStyle=color;ctx.lineWidth=l.width*2.3*k*pulse;ctx.stroke();}else if(!lite){var top=Math.min(ly,H*BEAM_LOW_FADE-1),fade=ctx.createLinearGradient(0,top,0,H),span=H-top,r0=Math.min(.5,BEAM_ROOT/span),r1=Math.max(r0,(H*BEAM_LOW_FADE-top)/span);fade.addColorStop(0,ly<H*BEAM_LOW_FADE?'#000000':color);fade.addColorStop(r0,color);fade.addColorStop(r1,color);fade.addColorStop(1,'#000000');ctx.globalAlpha=.3*k*dim;ctx.strokeStyle=fade;ctx.lineWidth=l.width*2.3*k*pulse;ctx.stroke();}
        if(sheet&&!l.floor){ // 보스 시트의 레이저 질감을 광선 방향으로 늘여 더한다. 판정 폭은 흰 심으로 보인다.
          var bm=sheet.e.beam,th=l.width*2.4*k*pulse;ctx.save();ctx.translate(lx,ly);ctx.rotate(angle);ctx.globalAlpha=k*dim;
          ctx.drawImage(sheet.img,bm[0],bm[1],bm[2],bm[3],0,-th/2,LASER_DRAW,th);ctx.restore();
        }else{ctx.globalAlpha=.9*k*un;ctx.strokeStyle=color;ctx.lineWidth=l.width*k*pulse;ctx.stroke();}
        if(l.floor){ctx.globalCompositeOperation='lighter';for(var e=0;e<2;e++){var ex=e?W-10:10;ctx.globalAlpha=.8*k;ctx.fillStyle=color;ctx.beginPath();ctx.arc(ex,ly,l.width*.9,0,TAU);ctx.fill();ctx.globalAlpha=k;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(ex,ly,l.width*.4,0,TAU);ctx.fill();}} // 바닥 줄은 양 끝 발사점에서 뻗는다
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k*un*(paleOf(color)?PALE_CORE:BEAM_CORE);ctx.strokeStyle='#ffffff';ctx.lineWidth=l.width*(sheet?.34:.46)*k;ctx.stroke(); // 흰·금 광선은 심지도 낮춘다(심사 6.46: 금빛 광선이 여전히 가장 밝다)
      }
    }
    ctx.restore();
  }
  /* 보스 문양 레이저·외곽 지그재그. 엔진이 맞히는 선분(Arcade.figureSegments)을 그대로 그린다. 예고 중에는 옅은 선과 흰 점선, 켜지면 굵은 빛. */
  // 문양 레이저는 보스 뒤 층에, 회색 쪽으로 한 단계 눌러 그린다(심사 11-14: 문양·탄·보스가 같은 색으로 겹쳐 보스가 묻힘)
  var SIGIL_MUTE='#4a4f62',SIGIL_LIVE=.85,SIGIL_EDGE='#0a0812',SIGIL_UNDER=2.4,SIGIL_UNDER_ALPHA=.68,SIGIL_TOP_FADE=190,SIGIL_NODE=8,SIGIL_INNER=1.6,SIGIL_BLOOM=3.4,LASER_UNDER_SIGIL=.35,SIGIL_COOL='#38c4ff',SIGIL_IGNITE=10,SIGIL_CORE=.8,SIGIL_HUSH=140,SIGIL_EDGE_W=60,SIGIL_HUD_Y=110,SIGIL_FLOW=.4,SIGIL_SAFE_CORE=.75,SIGIL_VIOLET='#8a5cff',SIGIL_FILL=.12,SIGIL_KNOT=.5,SIGIL_RING_GLOW=.85,SIGIL_DECOR_LIVE=.4,SIGIL_RIM_W=2.4,SIGIL_CORE_EDGE=.5;
  function sigilHue(c){var n=parseInt(c.slice(1,7),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m,l=(M+m)/2,h=0;if(d){h=M===r?((g-b)/d+6)%6:M===g?(b-r)/d+2:(r-g)/d+4;h*=60;}var sat=d?d/(1-Math.abs(2*l-1)):0;h=(h+(h>=60&&h<180?-45:h>=180&&h<240?40:-40)+360)%360;var f=function(k){var q=(k+h/30)%12;return Math.round(255*(l-sat*Math.min(l,1-l)*Math.max(-1,Math.min(q-3,9-q,1))));};return '#'+[f(0),f(8),f(4)].map(function(x){return ('0'+x.toString(16)).slice(-2);}).join('');} // 큰 육망성은 보스 탄과 같은 빛이면 탄에 묻힌다(심사 9차 6.60: 초록·빨강 보스): 색상을 비튼다(초록→라임: 청록은 영웅 색과 겹쳤다(14차), 빨강→자홍)
  function sigilFade(c){var g=ctx.createLinearGradient(0,0,0,SIGIL_TOP_FADE);g.addColorStop(0,c+'00');g.addColorStop(.3,c+'14');g.addColorStop(1,c);return g;} // 위쪽 HUD 띠로 갈수록 투명(심지·흐르는 빛·밑테까지 모두, 심사 6.47: PC에서 심지가 HP 바까지 밝았다)
  /* 큰 육망성의 마법진 틀(7전문가 1차 5.81: 철사 도형처럼 보인다). 꼭짓점을 잇는 바깥 원과 안쪽 육각형을 감싸는 안쪽 원에 룬 고리 그림을 얹고,
     꼭짓점마다 마디를 단다. 틀은 그림일 뿐 맞지 않는다: 판정은 육망성 선뿐이라 틀은 옅게, 선보다 아래에 그린다. */
  function drawSigilFrame(f,segs,color,k,live){
    var ink=mix(color,'#ffffff',.25),key='sig'+ink,rings=runeRings[key];
    if(!rings)rings=runeRings[key]=[buildRuneRing(153,9,5,ink),buildRuneRing(114,12,6,ink)];
    var radii=[f.r,f.r/Math.sqrt(3)],base=[153,114],q;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(q=0;q<2;q++){var img=rings[q],sc=radii[q]/base[q],half=img.width/scale/2;
      ctx.save();ctx.translate(f.cx,f.cy);ctx.rotate(-f.turn*(q?1.5:.5)+q);ctx.scale(sc,sc);ctx.globalAlpha=(live?.38:.25)*k*(q?SIGIL_INNER:1)*(live?SIGIL_DECOR_LIVE:1);ctx.drawImage(img,-half,-half,half*2,half*2);ctx.restore();} // 켜지면 룬 고리는 물러난다: 판정 있는 굵은 원과 장식 호가 겹쳐 헷갈렸다(원 심사 1차 6.83)
    ctx.globalCompositeOperation='source-over';
    for(q=0;q<segs.length;q++){var x=segs[q][0],y=segs[q][1],hud=Math.max(0,Math.min(1,(y-SIGIL_HUD_Y*.5)/(SIGIL_HUD_Y*.5))); // 위쪽 HUD 띠(HP 바·스펠명)에 걸린 마디는 지운다(심사 12차)
      if(!hud)continue;
      ctx.globalAlpha=.8*k*hud;ctx.fillStyle=SIGIL_EDGE;ctx.beginPath();ctx.arc(x,y,SIGIL_NODE+2.5,0,TAU);ctx.fill();
      ctx.globalAlpha=k*hud;ctx.strokeStyle=ink;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(x,y,SIGIL_NODE,0,TAU);ctx.stroke();
      if(live){ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,2,0,TAU);ctx.fill();}}
    var a0=Math.atan2(segs[0][1]-f.cy,segs[0][0]-f.cx)+Math.PI/6,ri=f.r/Math.sqrt(3); // 안쪽 육각형 꼭짓점: 바깥 꼭짓점이 화면 밖에 있어도 이 마디는 보인다
    ctx.beginPath();for(q=0;q<6;q++){var hx=f.cx+Math.cos(a0+q*Math.PI/3)*ri,hy=f.cy+Math.sin(a0+q*Math.PI/3)*ri;if(q)ctx.lineTo(hx,hy);else ctx.moveTo(hx,hy);}ctx.closePath();ctx.globalAlpha=SIGIL_FILL*k;ctx.fillStyle=color;ctx.fill();ctx.setLineDash([1,7]);ctx.lineCap='round';ctx.globalAlpha=.4*k;ctx.strokeStyle=ink;ctx.lineWidth=2.2;ctx.stroke();ctx.setLineDash([]); // 구슬 점 테두리: 장식이라 판정선(실선)·예고(긴 점선)와 구분(심사 14차) // 안쪽 육각형을 옅게 채워 잘린 별도 한 도형으로 읽히게(심사 11차)
    for(q=0;q<6;q++){var ix=f.cx+Math.cos(a0+q*Math.PI/3)*ri,iy=f.cy+Math.sin(a0+q*Math.PI/3)*ri;
      ctx.globalAlpha=.7*k;ctx.fillStyle=SIGIL_EDGE;ctx.beginPath();ctx.arc(ix,iy,SIGIL_NODE*.8+2,0,TAU);ctx.fill();
      ctx.globalAlpha=k;ctx.strokeStyle=ink;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(ix,iy,SIGIL_NODE*.8,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  var sigLayer=null;
  /* 10차 심사 6.60: 바깥을 검게 덮으니 무대가 지워지고, 선은 여전히 아래 교차점이 밝고 필드 끝에서 뚝 끊겼다.
     이제 육망성만 따로 그린 판에서 빛을 뺀다: 보스에서 멀수록 선이 옅어지고(R*.5→R에서 절반), 필드 좌우 끝에서는 0으로 사라진다. 배경은 그대로 둔다. 판정과 무관. */
  function maskSigil(f){
    var R=f.r,o=ctx.createRadialGradient(f.cx,f.cy,R*.5,f.cx,f.cy,R);o.addColorStop(0,'rgba(0,0,0,1)');o.addColorStop(.18,'rgba(0,0,0,.6)');o.addColorStop(.9,'rgba(0,0,0,.45)');o.addColorStop(1,'rgba(0,0,0,'+SIGIL_RING_GLOW+')'); // 꼭짓점 원(판정)은 진하게: 사용자 18:42 "진하게 나오면서" // 아래 X 교차점(안쪽 육각형 꼭짓점, 약 .58R)부터 옅어진다
    ctx.save();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.fillStyle=o;ctx.fillRect(0,0,W,H);
    var e=ctx.createLinearGradient(0,0,W,0),t=SIGIL_EDGE_W/W;e.addColorStop(0,'rgba(0,0,0,0)');e.addColorStop(t,'rgba(0,0,0,1)');e.addColorStop(1-t,'rgba(0,0,0,1)');e.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=e;ctx.fillRect(0,0,W,H);
    var sg=Arcade.figureSegments(f);if(sg.length){var a0=Math.atan2(sg[0][1]-f.cy,sg[0][0]-f.cx)+Math.PI/6,ri=R/Math.sqrt(3);ctx.globalCompositeOperation='destination-out'; // 두 삼각형이 엇갈리는 매듭(안쪽 육각형 꼭짓점)의 번짐을 덜어 낸다: 아래 X 교차점이 보스보다 밝았다(심사 13차)
      for(var q=0;q<6;q++){var kx=f.cx+Math.cos(a0+q*Math.PI/3)*ri,ky=f.cy+Math.sin(a0+q*Math.PI/3)*ri,kg=ctx.createRadialGradient(kx,ky,0,kx,ky,46);kg.addColorStop(0,'rgba(0,0,0,'+SIGIL_KNOT+')');kg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=kg;ctx.fillRect(kx-46,ky-46,92,92);}}
    ctx.restore();
  }
  /* 한자문 고리 공격: 엔진의 고리(틈 있는 호들)를 굵은 띠로, 띠 안에 보스의 한문 주문을 쓴다.
     심사(11-15, 5.8점): 예고가 켜진 띠보다 짙어 보였다 → 예고는 점선 윤곽만, 켜지면 띠를 짙게 채우고 글자는 바탕색으로 뒤집어(탁본처럼) 쓴다.
     글자는 호마다 한 번, 화면 기준 똑바로 세워 쓴다(아래쪽 호에서 뒤집히지 않게). 틈 양끝은 붓을 뗀 먹 맺힘으로 문을 표시. 위쪽 표시(HUD) 자리에는 글자를 쓰지 않는다.
     판정 선분은 Arcade.figureSegments와 같은 호다(띠 폭 = f.width, 판정은 그 62%). 수묵화풍에서 밝은 색은 먹으로, 어두운 색은 한지로 바뀐다. */
  function drawRunes(s,f){
    var color='#f1f1f1',letter='#0c0a08',warn=f.age<f.warn,over=f.age-f.warn-f.active,k=warn?1:over>0?Math.max(0,1-over/Arcade.BEAM_FADE):1,band=f.width;
    var g0=Arcade.RUNE_GROW||.62,grow=(f.fit||1)*(g0+(1-g0)*(f.grow===undefined?1:f.grow)),cx=finite(f.cx,W/2),cy=finite(f.cy,120),text=verseOf(s.boss.actor),i,j,q,R,rot;
    var main=ctx,layer=null;if(canvas.width&&canvas.height){if(!runeLayer)runeLayer=document.createElement('canvas');if(runeLayer.width!==canvas.width||runeLayer.height!==canvas.height){runeLayer.width=canvas.width;runeLayer.height=canvas.height;}
      layer=runeLayer.getContext('2d');layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,runeLayer.width,runeLayer.height);layer.setTransform(main.getTransform());ctx=layer;} // 따로 그려 위쪽 표시(HUD) 경계에서 먹이 옅어지며 사라지게 한다
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineCap='butt';
    /* 결계 안과 틈은 칠하지 않는다: 배경이 그대로 보이고 고리 띠와 한자만 그 위에 얹힌다(사용자 11-16) */
    for(i=0;i<f.rings.length;i++){q=f.rings[i];R=q.r*grow;rot=f.turn*q.dir+q.phase;var layerK=q.r>=180?1:q.r>=118?.85:.7,outer=q.r>=180; // 바깥 겹이 짙고 안쪽일수록 옅게(보스가 묻히지 않게)
      if(warn&&f.grow<i/(f.rings.length+1))continue; // 예고는 바깥 겹부터 안쪽으로 차례로
      for(j=0;j<q.n;j++){var a0=rot+TAU*j/q.n+q.gap/2,a1=rot+TAU*(j+1)/q.n-q.gap/2;
        if(warn){var wg=f.grow;var last=f.warn-f.age<18?(1-(f.warn-f.age)/18)*(.5+.5*Math.sin(f.age*.9)):0;ctx.globalAlpha=.12+.14*wg+.22*last;ctx.strokeStyle=color;ctx.lineWidth=band;ctx.beginPath();ctx.arc(cx,cy,R,a0,a1);ctx.stroke(); // 곧 짙어질 자리를 옅은 담묵 면으로
          ctx.globalAlpha=(.3+.45*wg)*(q.r<100?.6:1);if(Ink&&Ink.raw)Ink.raw(1);try{ctx.strokeStyle=VERMILION;ctx.lineWidth=1.6+.8*wg;ctx.setLineDash([5,5]);[-band/2,band/2].forEach(function(o){ctx.beginPath();ctx.arc(cx,cy,Math.max(0,R+o),a0,a1);ctx.stroke();});ctx.setLineDash([]);}finally{if(Ink&&Ink.raw)Ink.raw(-1);} // 예고 윤곽은 인주색(경고, 사용자 규칙: 플레이어를 돕는 순간) // 점선 윤곽이 1초 동안 짙어진다
          continue;} // 틈 자리 원 표시는 뺐다: 네 겹이면 열두 개가 탄처럼 보였다(심사 11-16) // 틈 자리 매듭을 먼저 찍는다
        var lit=f.age-f.warn<10?1-(f.age-f.warn)/10:0;
        ctx.globalAlpha=Math.min(1,k*((outer?.64:.56)+.2*lit)*layerK);ctx.strokeStyle=color;ctx.lineWidth=band*(1+.3*lit);ctx.beginPath();ctx.arc(cx,cy,R,a0,a1);ctx.stroke(); // 짙은 띠(켜지는 순간 한 번 번진다)
        ctx.globalAlpha=Math.min(1,k*(.95+.5*lit));ctx.lineWidth=(outer?3.4:3)+2*lit;ctx.strokeStyle='#f8f8f8';var lw0=ctx.lineWidth,ea=ctx.globalAlpha;[-band/2,band/2].forEach(function(o,z){for(var m=0;m<8;m++){var p0=a0+(a1-a0)*m/8,p1=a0+(a1-a0)*(m+1)/8,pr=Math.sin(Math.PI*(m+.5)/8);ctx.lineWidth=lw0*(.45+.95*pr)*(z?.6:1.3);ctx.globalAlpha=ea*(.55+.45*pr)*(z?.65:1);ctx.beginPath();ctx.arc(cx,cy,Math.max(0,R+o),p0,p1+.004);ctx.stroke();}});ctx.lineWidth=lw0;ctx.globalAlpha=ea; // 붓 압력: 획 가운데는 굵고 짙게, 틈 쪽 끝은 가늘고 마르게(심사: 관처럼 균일했다) // 갈필 테
        ctx.globalAlpha=k*.3;ctx.lineWidth=1;ctx.strokeStyle=letter;[-.22,.05,.28].forEach(function(o,z){ctx.beginPath();ctx.arc(cx,cy,R+band*o,a0+.04*(z+1),a1-.05*(3-z));ctx.stroke();}); // 갈필 비백 줄
        ctx.globalAlpha=k*.6*layerK;ctx.fillStyle='#f8f8f8';[a0,a1].forEach(function(a,z){var ex=cx+Math.cos(a)*R,ey=cy+Math.sin(a)*R;ctx.beginPath();ctx.ellipse(ex,ey,band*.62,band*.46,a+(z?.5:-.5),0,TAU);ctx.fill();ctx.beginPath();ctx.arc(ex+Math.cos(a+(z?-1:1)*1.6)*band*.4,ey+Math.sin(a+(z?-1:1)*1.6)*band*.4,band*.2,0,TAU);ctx.fill();}); // 틈 양끝 붓을 눌러 뗀 먹 덩이
        if(q.r<100)continue; // 가장 안쪽 겹은 글자 없이 띠만(보스 몸 위에 글자가 겹쳤다)
        var size=band*.8,step=size*1.18/R,mid=(a0+a1)/2,line=text,n;if(step*line.length>a1-a0-.08)line=j%2?text.slice(text.length>>1):text.slice(0,text.length>>1); // 작은 안쪽 고리는 구절을 반씩 나눠 쓴다(11-16 네 겹)
        n=line.length;if(step*n>a1-a0-.08)step=(a1-a0-.08)/n;
        ctx.globalAlpha=outer?k:k*.7;ctx.fillStyle=letter;ctx.font='bold '+size.toFixed(1)+'px '+RUNE_FONT;ctx.textAlign='center';ctx.textBaseline='middle';
        for(var c=0;c<n;c++){var u=mid+(c-(n-1)/2)*step*(Math.sin(mid)>0?-1:1),x=cx+Math.cos(u)*R,y=cy+Math.sin(u)*R;if(y<78||x<-10||x>W+10)continue;ctx.fillText(line.charAt(c),x,y+1);}}}
    ctx.restore();ctx.globalAlpha=1;
    if(layer){ctx.save();ctx.globalCompositeOperation='destination-out';var fade=ctx.createLinearGradient(0,52,0,84);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fade;ctx.fillRect(-60,-60,W+120,144);ctx.restore();
      ctx=main;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(runeLayer,0,0);ctx.restore();}
  }
  var runeLayer=null;
  function drawFigures(s,sigils){
    var list=s.figures;if(!list||!list.length)return;
    var keep=null,f0=null,q0,safe=null;if(sigils){for(q0=0;q0<list.length;q0++)if(list[q0].sigil){f0=list[q0];break;}
      if(f0&&canvas.width&&canvas.height){if(!sigLayer)sigLayer=document.createElement('canvas');if(sigLayer.width!==canvas.width||sigLayer.height!==canvas.height){sigLayer.width=canvas.width;sigLayer.height=canvas.height;}
        var lc=sigLayer.getContext('2d');lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,sigLayer.width,sigLayer.height);lc.setTransform(ctx.getTransform());keep=ctx;ctx=lc;}}
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(var i=0;i<list.length;i++){
      var f=list[i];if(f.kind==='runes'){if(!sigils)drawRunes(s,f);continue;}if(!!f.sigil!==!!sigils)continue;ctx.globalAlpha=1;var fa=f.sigil?SIGIL_ALPHA:1;var color=COLORS[f.color]||'#ffffff',segs=Arcade.figureSegments(f),j;if(f.sigil)color=mix(color,SIGIL_MUTE,.32);
      var cool=false;if(f.sigil){color=bossTint(s)||COLORS[f.color]||'#ffffff';cool=paleOf(color);var c0=color,n0=parseInt(c0.slice(1,7),16),ba=s.boss&&s.boss.present&&Arcade.ACTORS[s.boss.actor],grey=Math.max(n0>>16&255,n0>>8&255,n0&255)-Math.min(n0>>16&255,n0>>8&255,n0&255)<60||!!(ba&&(ba.c2===0||ba.c2===2));if(cool)color=grey?mix(c0,SIGIL_VIOLET,.97):mix(color,SIGIL_COOL,.92);else color=sigilHue(color);} // 흰 보스와 붉은·보라 보조색 금빛 보스(루시퍼 등)는 보랏빛, 나머지 금빛 보스는 얼음빛: 셋이 같은 청록으로 모였다(심사 11차) // 보스 고유색(심사 6.13). 금빛·흰빛 보스는 탄도 같은 빛이라 차가운 백청으로 비튼다(심사 6.36)
      if(f.sigil)drawSigilFrame(f,segs.slice(0,segs.length-(f.ring||0)),color,f.age<f.warn?Math.min(1,f.age/12):1,f.age>=f.warn);
      ctx.beginPath();for(j=0;j<segs.length;j++){var g=segs[j];ctx.moveTo(g[0],g[1]);ctx.lineTo(g[2],g[3]);}
      if(f.age<f.warn){
        var t=f.age/f.warn,blink=.5+.5*Math.sin(f.age*(.25+t*.5));
        ctx.setLineDash([]);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=fa*(WARN_RED?.22+.26*t:.12+.18*t);ctx.strokeStyle=WARN_RED?'#c9406e':color;ctx.lineWidth=f.width*(.3+.7*t);ctx.stroke();
        ctx.globalAlpha=fa*(.4+.5*blink);ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.setLineDash([6,6]);ctx.stroke();
      }else{
        var over=f.age-f.warn-f.active,k=over>0?Math.max(0,1-over/Arcade.BEAM_FADE):Math.min(1,(f.age-f.warn+1)/4),pulse=1+Math.sin(visual*36+i)*.07;
        var top=null;if(f.sigil){fa=SIGIL_LIVE;ctx.setLineDash([]);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=SIGIL_UNDER_ALPHA*k;ctx.strokeStyle=sigilFade(SIGIL_EDGE);ctx.lineWidth=f.width*SIGIL_UNDER*k;ctx.stroke();
          top=sigilFade(color);
          if(!lite){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.1*k;ctx.strokeStyle=top;ctx.lineWidth=f.width*SIGIL_BLOOM*k;ctx.stroke();}
          if(cool){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.5*k;ctx.strokeStyle=sigilFade(mix(bossTint(s)||color,'#000000',.2));ctx.lineWidth=f.width*SIGIL_RIM_W*k;ctx.stroke();}} // 금빛 보스의 백청 선에 보스 색 테: 따로 노는 시스템 광선처럼 보였다(심사 9차) // 켜진 큰 육망성: 닿으면 맞는 선이라 또렷하게, 밑에 짙은 테
        ctx.setLineDash([]);ctx.globalCompositeOperation='lighter';
        if(!lite){ctx.globalAlpha=fa*(.16*k);ctx.strokeStyle=color;ctx.lineWidth=f.width*1.6*k*pulse;ctx.stroke();} // 글로우를 줄여 레이저는 '벽', 탄은 '위협'으로 읽히게
        ctx.globalAlpha=fa*(.9*k);ctx.strokeStyle=top||color;ctx.lineWidth=f.width*k*pulse;ctx.stroke();
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=fa*k*(top?SIGIL_CORE:1);ctx.strokeStyle=top?sigilFade(mix(color,'#ffffff',cool?.45:.85)):'#ffffff';ctx.lineWidth=f.width*(top?.55:.42)*k;ctx.stroke();
        if(top&&keep)safe={segs:segs,color:color,k:k,cool:cool};
        if(top&&f.age-f.warn<SIGIL_IGNITE){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-(f.age-f.warn)/SIGIL_IGNITE;ctx.strokeStyle=sigilFade('#ffffff');ctx.lineWidth=f.width*2.2;ctx.stroke();} // 켜지는 순간 번쩍: 이제부터 맞는다
        if(f.sigil){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=SIGIL_FLOW*k;ctx.strokeStyle=sigilFade(mix(color,'#ffffff',.6));ctx.lineWidth=f.width*.7*k;ctx.setLineDash([46,150]);ctx.lineDashOffset=-visual*150;ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;} // 선을 따라 흐르는 빛: 켜진 선(맞는 선)임을 움직임으로 알린다
      }
    }
    if(keep){maskSigil(f0);ctx.restore();ctx=keep;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(sigLayer,0,0);ctx.restore();ctx.save();
      if(safe){ctx.lineCap='round';ctx.beginPath();for(q0=0;q0<safe.segs.length;q0++){var sg=safe.segs[q0];ctx.moveTo(sg[0],sg[1]);ctx.lineTo(sg[2],sg[3]);}ctx.globalCompositeOperation='source-over';ctx.strokeStyle=sigilFade(mix(safe.color,'#ffffff',safe.cool?.4:.6));ctx.lineWidth=f0.width*.3*safe.k;
        for(q0=0;q0<3;q0++){ctx.save();ctx.beginPath();if(q0===1)ctx.rect(24,0,W-48,H);else ctx.rect(q0?W-24:0,0,24,H);ctx.clip();ctx.beginPath();for(var z=0;z<safe.segs.length;z++){var sz=safe.segs[z];ctx.moveTo(sz[0],sz[1]);ctx.lineTo(sz[2],sz[3]);}ctx.globalAlpha=SIGIL_SAFE_CORE*safe.k*(q0===1?1:SIGIL_CORE_EDGE);ctx.stroke();ctx.restore();}}} // 필드 끝 24px에서는 심지도 절반으로: 테두리에 부딪혀 잘린 듯 보였다(심사 13차). 사라지지는 않는다 // 맞는 심지는 가리지 않는다: 번짐만 옅어지고 판정선은 어디서나 보인다(심사 11차: 흐린 끝에서 맞을 수 있다)
    if(sigils)hushSigil(s);
    ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);
  }
  /* 켜진 큰 육망성 위에 보스 둘레를 어둡게 덮는다(필드 끝 처리는 10차부터 maskSigil이 선 자체에서 한다)(7전문가 4차 6.43: 선이 보스보다 먼저 보이고, 화면 끝에서 뚝 잘린다).
     보스·탄·영웅보다 먼저 그리므로 그것들은 어두워지지 않는다. 판정과 무관. */
  function hushSigil(s){
    var f=null;for(var i=0;i<s.figures.length;i++){var g=s.figures[i];if(g.sigil&&g.age>=g.warn){f=g;break;}}if(!f)return;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    var pool=mix(bossTint(s)||'#06040c','#06040c',.82),r=ctx.createRadialGradient(f.cx,f.cy,0,f.cx,f.cy,SIGIL_HUSH);r.addColorStop(0,pool+'b3');r.addColorStop(.6,pool+'66');r.addColorStop(1,pool+'00'); // 웅덩이에 보스 색을 살짝: 검은 구멍이 무대를 지웠다(심사 9차)
    ctx.fillStyle=r;ctx.fillRect(f.cx-SIGIL_HUSH,f.cy-SIGIL_HUSH,SIGIL_HUSH*2,SIGIL_HUSH*2);
  }
  // 영웅 탄은 반투명하게 그려 적 탄을 가리지 않는다.
  function drawShots(s){
    if(HeroFx){HeroFx.shots(ctx,s,visual);return;} // 기억사수 성장 단계별 탄(src/hero-memory-v43.js)
    ctx.globalAlpha=.55;ctx.globalCompositeOperation='lighter'; // 더해 그리되 한 단계 물러서게: 적 탄이 화면의 주인공이다(심사 9차: 주황 샷이 먼저 눈에 들어온다). 타격감은 명중 섬광이 맡는다
    for(var i=0;i<s.sn;i++){
      if(s.shoming[i])ctx.drawImage(shotSprite,s.sx[i]-3,s.sy[i]-9,6,18); // 유도탄도 주탄과 같은 길쭉한 빛줄기: 둥근 주황 점은 적 탄처럼 읽혔다(심사 7차)
      else ctx.drawImage(shotSprite,s.sx[i]-4,s.sy[i]-13,8,26);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  var SKILL_FX_BRIGHT=.4,BEAM_LOW_FADE=.45,BEAM_ROOT=48,PALE_BEAM_DIM=.3,PALE_CORE=.45,BEAM_CORE=.55,BEAM_DIM=.38,HERO_RING_WIDTH=3,BRIGHT_ART_DIM='brightness(.6) contrast(.72)',PLAYER_SHADE=46,HERO_RING='#7ff3ff',OUTER_RIM='#1c2236',SIGIL_ALPHA=.55;
  function drawPlayer(s){
    var p=s.player,blink=s.tick<p.invulnerableUntil&&Math.floor(s.tick/4)%2;
    if(HeroFx)HeroFx.field(ctx,s,visual); // 영웅 둘레 시간 둔화(먹 붓끝, 원 고리 없음)
    // 영웅 뒤 어두운 빛무리: 밝은 광선·배경 사이에서도 영웅 자리가 먼저 보인다(심사 6.36)
    var sh=ctx.createRadialGradient(p.x,p.y,4,p.x,p.y,PLAYER_SHADE);sh.addColorStop(0,'rgba(6,8,16,.72)');sh.addColorStop(1,'rgba(6,8,16,0)');ctx.globalAlpha=1;ctx.fillStyle=sh;ctx.fillRect(p.x-PLAYER_SHADE,p.y-PLAYER_SHADE,PLAYER_SHADE*2,PLAYER_SHADE*2);
    ctx.globalAlpha=blink?.35:.95;
    if(images.gunner)ctx.drawImage(images.gunner,p.x-258.5369*57/512,p.y-283.8754*57/512,57,57);
    else{ctx.fillStyle='#9fefff';ctx.beginPath();ctx.moveTo(p.x,p.y-16);ctx.lineTo(p.x+10,p.y+12);ctx.lineTo(p.x-10,p.y+12);ctx.closePath();ctx.fill();}
    if(Ink&&Ink.heroCloud)Ink.heroCloud(ctx,p.x,p.y+22,visual); // 영웅은 흰 구름을 탄다(적은 먹구름, 사용자 11-15)
    if(HeroFx)HeroFx.clock(ctx,s,visual); // 구름 위 시계: 보통·가속·둔화에 따라 바늘 빠르기가 바뀐다(사용자 11-16)
    ctx.globalAlpha=1;
    ctx.globalAlpha=blink?.3:.8;ctx.strokeStyle=HERO_RING;ctx.lineWidth=HERO_RING_WIDTH;ctx.beginPath();ctx.arc(p.x,p.y,11,0,TAU);ctx.stroke();ctx.globalAlpha=1; // 영웅 자리 표시 고리(심사 6.36: 밝은 광선 사이에서 영웅을 놓친다)
  }
  // 판정점은 저속 이동 중에만 보인다. 탄에 가려지지 않게 맨 위에 그린다.
  function drawHitbox(s){
    var p=s.player;
    if(!p.focus){ctx.globalAlpha=.85;ctx.fillStyle='#ff2a4a';ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.4,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,p.r*.8),0,TAU);ctx.fill();ctx.globalAlpha=1;return;} // 판정점은 늘 작게 보인다(심사 7차). 저속이면 아래처럼 고리까지
    if(!Ink){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(visual*3);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,17,0,TAU);ctx.stroke();ctx.restore();}
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
    if(shock&&shock.ink){var sk=Math.max(0,1-shock.r/300);if(Ink&&Ink.raw)Ink.raw(1);var cg=ctx.createRadialGradient(shock.x,shock.y,0,shock.x,shock.y,shock.r+40);cg.addColorStop(0,'rgba(250,246,236,'+(.55*sk)+')');cg.addColorStop(.75,'rgba(250,246,236,'+(.35*sk)+')');cg.addColorStop(1,'rgba(250,246,236,0)');ctx.fillStyle=cg;ctx.fillRect(shock.x-shock.r-40,shock.y-shock.r-40,(shock.r+40)*2,(shock.r+40)*2);if(Ink&&Ink.raw)Ink.raw(-1);shock.r+=9;if(shock.r>300)shock=null;} // 탄 지우기: 보스 둘레 바탕이 한지빛으로 걷히며 퍼진다(원 고리 없이, 붉은색 없이)
    else if(shock){var sk=Math.max(0,1-shock.r/420);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=sk*.85;ctx.strokeStyle=state?themeColor(state):'#ffffff';ctx.lineWidth=1+4*sk;/* 충격파: 보스·장면 색, 퍼질수록 얇아진다 */ctx.beginPath();ctx.arc(shock.x,shock.y,shock.r,0,TAU);ctx.stroke();ctx.restore();shock.r+=13;if(shock.r>420)shock=null;}
  }
  function pad(n){return ('00000000'+Math.max(0,Math.floor(finite(n,0)))).slice(-8);}
  function starText(n){var out='';for(var i=0;i<3;i++)out+=i<n?'★':'☆';return out;}
  // 스테이지를 깼다: 이름 한 줄 + 별 + 기념물 그림. 게임은 멈추지 않는다.
  function fallHold(){return !!(fall&&state&&state.tick-fall.tick<FALL_TICKS*FALL_HOLD);} // 보스가 먹으로 스미는 동안 그 자리를 가리는 띠·알림은 기다린다(심사 11-16)
  function drawToast(){
    if(!toast||fallHold())return;
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
        if(hudOut!=='side')if(!(bannerSpell&&banner>0)){ctx.font='italic 12px '+SERIF;ctx.fillStyle='#f3e3b5';ctx.fillText('「'+seg.name+'」',W-12,52);} // 스펠 띠가 떠 있는 동안 받침의 같은 이름은 숨긴다
      }
    }
    if(!hudOut){ // 칸 밖에 자리가 없을 때만 칸 안에 그린다
    ctx.textAlign='left';ctx.font='600 12px '+SANS;ctx.fillStyle=color;ctx.fillText(b.present?b.name:stage.name,12,29);
    ctx.font='11px '+SANS;ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText(s.bossOnly?'보스 체험 · 제'+stage.part+'부':'STAGE '+(s.stageIndex+1)+' / '+Arcade.STAGES.length,12,45);
    // 목숨 · 폭탄 · 스침 게이지(왼쪽 아래 저속 버튼 위), 점수(오른쪽 아래 폭탄 버튼 위)
    ctx.font='14px '+SANS;ctx.fillStyle='#ff6a8a';var hearts='';for(i=0;i<s.player.maxHp;i++)hearts+=i<s.player.hp?'◆':'◇';ctx.fillText(hearts,12,H-96);
    ctx.fillStyle='#7dffb0';var bombs='';for(i=0;i<s.bombs;i++)bombs+='✦';ctx.fillText(bombs,12,H-78);
    ctx.font='10px '+SANS;ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText('공격 Lv.'+(s.power||1)+' · 필살 Lv.'+(s.bombLevel||1),12,H-114); // 목숨 위(저속 버튼과 겹쳐 가려지던 자리 H-60에서 옮김, 11-16 실검증)ctx.font='14px '+SANS;
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
    if(state&&orbs.length){var tn=bossTint(state);if(orbTint!==tn){orbTint=tn;buildOrbs();}}
    var s=state;ctx.setTransform(scale,0,0,scale,0,0);
    if(!s){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);return;}
    if(fxStage!==s.stageIndex)initFx(themeOf(s.stageIndex).fx,s.stageIndex);
    if(mode==='playing')updateFx(Math.min(.05,elapsed));
    offsetX=offsetY=0;if(shake>0){offsetX=(Math.random()-.5)*shake*.7;offsetY=(Math.random()-.5)*shake*.7;shake--;}
    ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    // 순서: 배경 → 날씨 → 인물·몹 → 영웅 탄 → 영웅 → 장식 이펙트 → 아이템 → 광선 → 적 탄 → 판정점
    drawBackground(s);drawFx();drawTopShade();drawVeil(s);drawFigures(s,true);drawSkillFx(s);drawEmblems(s);drawIllusions(s);drawBoss(s);drawFall(s);if(Ink&&Ink.raw)Ink.raw(1);drawFloor(s);drawRisers(s,true);if(Ink&&Ink.raw)Ink.raw(-1);drawMobs(s);drawShots(s);drawDrifts();drawParticles();drawFlashes();drawItems(s);drawLasers(s);drawFigures(s);drawRipples(s);drawBullets(s);if(Ink&&Ink.raw)Ink.raw(1);drawPieceScores(s);if(Ink&&Ink.raw)Ink.raw(-1);if(HeroFx)HeroFx.draw(ctx,s,visual);if(Ink&&Ink.raw)Ink.raw(1);drawRisers(s);if(Ink&&Ink.raw)Ink.raw(-1);drawBossOver(s);drawHeroGuard(s);drawPlayer(s);drawHitbox(s);if(HeroFx)HeroFx.drawTexts(ctx,visual); // 영웅은 탄·레이저 위에 그려 늘 보이게 한다
    ctx.restore();ctx.setTransform(scale,0,0,scale,0,0);drawHud(s);
    if(flash>0){if(Ink&&Ink.raw)Ink.raw(1);if(Ink){var fb=s.boss&&s.boss.present,fx0=fb?finite(s.boss.x,W/2):W/2,fy0=fb?finite(s.boss.y,H/3):H/3,fg=ctx.createRadialGradient(fx0,fy0,20,fx0,fy0,H*.9);fg.addColorStop(0,'rgba(255,252,244,'+(flash*.75)+')');fg.addColorStop(1,'rgba(255,252,244,'+(flash*.2)+')');ctx.fillStyle=fg;}else ctx.fillStyle='rgba(255,255,255,'+(flash*.8)+')';ctx.fillRect(0,0,W,H);if(Ink&&Ink.raw)Ink.raw(-1);if(Ink){ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);drawPlayer(s);drawHitbox(s);ctx.restore();}flash-=.04;} // 수묵화에서도 섬광은 밝게: 먹색으로 뒤집히면 패턴 격파·보스 쓰러짐 때 화면이 잿빛으로 꺼졌다(보스 이펙트 전수조사 11-15). 보스에서 퍼지는 빛으로, 영웅·판정점은 섬광 위에 다시 그려 위치를 놓치지 않게(심사 1차 6.41)
    // 피격: 인주색 테두리 번쩍임 + 영웅 둘레에 금 간 붉은 고리(수묵화풍에서도 먹으로 바꾸지 않는다). 탄 지우기의 한지빛 섬광과 색·모양이 겹치지 않게.
    if(hurtFlash>0){if(Ink&&Ink.raw)Ink.raw(1);var hc='150,40,30',v=ctx.createRadialGradient(W/2,H/2,150,W/2,H/2,400);v.addColorStop(0,'rgba('+hc+',0)');v.addColorStop(.62,'rgba('+hc+',0)');v.addColorStop(1,'rgba('+hc+','+(hurtFlash*.8)+')'); /* 피격 테두리는 인주색 그대로(사용자 11-16 카드 선택 "인주색 그대로 두기") */ctx.fillStyle=v;ctx.fillRect(0,0,W,H);if(hurtRing){ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);ctx.strokeStyle=VERMILION;ctx.lineCap='round';for(var hk=0;hk<11;hk++){var ha=TAU*hk/11+.3,h0=hurtRing.r*(.35+.1*(hk%3)),h1=hurtRing.r*(.8+.35*((hk*5)%4)/3);ctx.globalAlpha=Math.min(1,hurtFlash*1.4)*(.55+.45*((hk*7)%5)/4);ctx.lineWidth=(2.5+3.5*((hk*3)%4)/3)*hurtFlash+.8;ctx.beginPath();ctx.moveTo(hurtRing.x+Math.cos(ha)*h0,hurtRing.y+Math.sin(ha)*h0);ctx.lineTo(hurtRing.x+Math.cos(ha)*h1,hurtRing.y+Math.sin(ha)*h1);ctx.stroke();}ctx.restore();ctx.globalAlpha=1;hurtRing.r+=5;if(hurtRing.r>90)hurtRing=null;}if(Ink&&Ink.raw)Ink.raw(-1);hurtFlash-=.035;}
    if(banner>0&&fallHold())bannerTick=s.tick;
    if(banner>0)banner=Math.max(0,1-(s.tick-bannerTick)/BANNER_TICKS); // 게임 틱 기준: 화면이 느리거나 빨라도 1.3초 뒤에 걷힌다
    if(bannerSpell&&banner>0)banner=Math.max(0,1-(s.tick-bannerTick)/SPELL_BANNER_TICKS); // 스펠 이름 띠는 0.7초: 보스·문양이 뜨는 순간을 오래 가리지 않는다(이름은 오른쪽 위 받침에 남는다) // 게임 틱 기준: 화면이 느리거나 빨라도 1.3초 뒤에 걷힌다
    if(toast&&mode==='playing'&&!fallHold()){toast.t-=Math.min(.05,elapsed);if(toast.t<=0)toast=null;}
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
    if(!lastStamp)lastStamp=stamp;var rawMs=stamp-lastStamp,elapsed=finite(Math.min(.1,Math.max(0,(stamp-lastStamp)/1000)),0);lastStamp=stamp;visual+=elapsed;
    if(mode==='playing'&&state){
      adaptQuality(rawMs>STALL_FRAME_MS?rawMs:elapsed*1000);if(devMode)showDevBadge();accumulator=Math.min(accumulator+elapsed,4/60);if(devMode)accumulator=Math.min(accumulator+elapsed*(DEV_SPEED-1),4*DEV_SPEED/60); // 개발자 모드는 같은 60Hz 틱을 두 배로 돌린다
      var steps=0,limit=turbo||rushStage?Math.max(4,turbo||60):devMode?4*DEV_SPEED:4;if(turbo||rushStage)accumulator=limit/60;
      while(accumulator>=1/60&&steps<limit&&mode==='playing'){if(rushStage)rushTick(state);if(devMode)state.player.hp=state.player.maxHp;Arcade.step(state,inputForStep());accumulator-=1/60;steps++;consume();}
      if(Mobile&&state)Mobile.tick(state,mode,rawMs); // 진단은 잘리기 전 실제 프레임 시간(1초 넘는 복귀 프레임은 tick이 버림)
    }
    if(global.HapilMusic)global.HapilMusic.update(mode,state,soundOn); // 구간이 바뀌면 곡을 겹쳐 바꾼다
    draw(elapsed);
  }

  /* ── 메뉴 ── */
  function show(id,on){var el=$(id);if(el)el.hidden=!on;}
  var SCREENS={title:'arcade-title',paused:'arcade-pause',result:'arcade-result',keepsakes:'arcade-keepsake-screen',boss:'arcade-boss-screen'};
  function setMode(next){
    mode=next;Object.keys(SCREENS).forEach(function(k){show(SCREENS[k],k===next);});
    showDevBadge();
    ['arcade-pause-button','arcade-focus','arcade-bomb'].forEach(function(id){show(id,next==='playing');});
    var hh=$('arcade-hud-high'),hl=$('arcade-hud-low');if(hh&&hl)hh.hidden=hl.hidden=!(hudOut&&next==='playing');
    if(next!=='playing'){focusHeld=false;finger.active=false;bombQueued=false;}
    if(next!=='keepsakes')clearKeepsakes();
    if(global.HapilMusic)global.HapilMusic.update(next,state,soundOn); // 구간별 곡(arcade-music-v43.js). 없으면 예전 한 곡
    else if(music){if(next==='playing'&&soundOn){var p=music.play();if(p&&p.catch)p.catch(function(){});}else music.pause();}
  }
  // 개발자 모드 표시: 탄이 오는 필드 밖(화면 오른쪽 위 구석)에 둔다(심사 1차: 필드 안 배지가 적·탄과 겹침)
  var devErrors=0,devLastError='',devBadgeAt=0;
  function devNote(msg){devErrors++;devLastError=String(msg||'').slice(0,60);}
  global.addEventListener('error',function(ev){devNote(ev&&(ev.message||(ev.target&&ev.target.src&&'불러오기 실패 '+String(ev.target.src).split('/').pop())));},true);
  global.addEventListener('unhandledrejection',function(ev){devNote(ev&&ev.reason&&(ev.reason.message||ev.reason));});
  function devDiag(){return 'DEV ×2 · 무적 · '+Math.round(1000/Math.max(1,frameMs))+'fps'+(lite?' · lite':'')+' · 탄 '+(state?state.n:0)+' · 오류 '+devErrors+(devLastError?' · '+devLastError:'');}
  function showDevBadge(){var e=$('arcade-dev-badge');if(e)e.hidden=!(devMode&&mode==='playing');if(e&&!e.hidden&&framesSeen-devBadgeAt>=0&&(devBadgeAt=framesSeen+30))e.textContent=devDiag();}
  /* run: {stage, bossOnly}. 원큐: 그 스테이지부터 끝까지 이어진다. */
  function start(run){
    if(fx)fx.unlock();
    var quiet=!!(run&&run.quiet);
    var grown=run&&run.grown; // 중간 저장에서 이어 할 때 자란 공격·필살 단계
    run={stage:Math.max(0,Math.min(Arcade.STAGES.length-1,run&&run.stage|0)),bossOnly:!!(run&&run.bossOnly),segment:run&&run.segment,carry:run&&run.carry};
    lastRun=run;
    var options={difficulty:difficulty,seed:(Date.now()^Math.floor(performance.now()*1000))>>>0,stage:run.stage,compact:compact,bossOnly:run.bossOnly,growth:true}; // 중간 스테이지에서 시작하면 그만큼 자란 기억사수로(엔진 createRun)
    if(Number.isInteger(run.segment))options.segment=run.segment;if(grown&&(grown.exp||grown.fills))options.grown={exp:grown.exp|0,fills:grown.fills|0};
    state=Arcade.createRun(options);
    if(run.carry){state.hits+=run.carry.hits|0;state.bombsUsed+=run.carry.bombs|0;} // 중간 저장에서 이어 하면 앞 구간의 피격·폭탄도 별에 반영
    buildSprites();loadStage(state.stageIndex);fxStage=-1;
    particles.length=0;drifts.length=0;flash=hurtFlash=shake=banner=0;shock=null;hurtRing=null;toast=null;if(HeroFx)HeroFx.reset();accumulator=0;lastStamp=0;framesSeen=0;rushStage=false;setMode('playing');
    if(global.HapilEyes)global.HapilEyes[quiet?'clear':'open'](); // 눈 뜨기(arcade-eyes-v43.js). 디버그 건너뛰기는 연출 없이
  }
  function finish(){
    var s=state,won=s.stage==='won';rushStage=false;
    if(s.score>best){best=s.score;try{global.localStorage.setItem(BEST_KEY,String(best));}catch(e){}}
    var stars=0;s.results.forEach(function(r){stars+=r.stars;});
    $('result-title').textContent=won?(s.bossOnly?'BOSS CLEAR':s.stageIndex>=Arcade.STAGES.length-1?'ALL CLEAR':'CLEAR'):'GAME OVER';
    $('result-score').textContent=pad(s.score);$('result-best').textContent=pad(best);
    $('result-detail').textContent=(won?'':'STAGE '+(s.stageIndex+1)+' '+Arcade.STAGES[s.stageIndex].name+' · ')+'깬 스테이지 '+s.results.length+' · 별 '+stars+' · 패턴 보너스 '+s.captures+' · 피격 '+s.hits;
    var retry=$('arcade-retry');
    if(!won){retry.hidden=false;retry.textContent=T('retryFallen');retry.dataset.stage=String(s.stageIndex);}
    else if(s.bossOnly){retry.hidden=false;retry.textContent=T('retryBoss');retry.dataset.stage=String(s.rushStage);}
    else retry.hidden=true;
    retry.dataset.boss=s.bossOnly?'1':'';
    $('arcade-home').className=retry.hidden?'primary':'';
    var eyes=!won&&global.HapilEyes;if(eyes)eyes.close(); // 목숨이 다하면 눈을 감고, 다 감긴 뒤 결과 화면
    var fallen=$('arcade-result');fallen.classList.toggle('fallen',!won&&!!eyes&&!eyes.state().off); // ?eyes=0 이면 감긴 눈 바탕이 없으니 예전 한지 결과판(리뷰 지적) // 게임 오버: 감긴 눈 위에 붉은 십자가가 그어지고 '다시하기'(이 스테이지 처음부터)
    setTimeout(function(){if(state===s){setMode('result');if(eyes&&eyes.cross&&fallen.classList.contains('fallen'))eyes.cross($('result-cross'));}},won?1500:eyes?Math.round(eyes.CLOSE_SECONDS*1000)+350:900);
  }
  function pause(){if(mode==='playing')setMode('paused');}
  function goTitle(){if(global.HapilEyes)global.HapilEyes.clear();if(loadedStage>=0)releaseStage(loadedStage,-1);state=null;toast=null;refreshTitle();setMode('title');}
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
  function midway(){return Mobile&&Mobile.checkpoint?Mobile.checkpoint(Progress.resume(progress),difficulty):null;}
  function refreshTitle(){
    var resume=Progress.resume(progress),mid=midway(),any=progress.cleared.length>0||!!mid,cont=$('arcade-continue'),begin=$('arcade-start');
    cont.hidden=!any;cont.textContent=T(mid?'continueMid':'continueStage',{n:resume+1}); // 앱이 꺼졌던 스테이지는 남긴 구간부터 잇는다
    $('continue-note').textContent=any?Arcade.STAGES[resume].name:'';$('continue-note').hidden=!any;
    cont.className=any?'primary':'';begin.className=any?'':'primary';
    $('title-best').textContent=pad(best);$('title-stars').textContent=String(Progress.totalStars(progress));$('title-stars-max').textContent=String(Arcade.STAGES.length*3);
    $('arcade-keepsakes').textContent=T('keepsakesCount',{n:progress.rewards.length,max:Arcade.STAGES.length});
    $('save-note').hidden=saveOk;
    fillStages();
  }
  function setDifficulty(next){
    if(!Arcade.DIFFICULTY[next])next='normal';difficulty=next;var rule=Arcade.DIFFICULTY[difficulty];$('difficulty-note').textContent=T(NOTES[difficulty],{hp:rule.hp,bombs:rule.bombs});
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
    document.querySelectorAll('[data-difficulty]').forEach(function(button){button.addEventListener('click',function(){setDifficulty(button.dataset.difficulty);progress.difficulty=difficulty;saveProgress();if(state===null)refreshTitle();});});
    $('arcade-continue').addEventListener('click',function(){var mid=midway();start(mid?{stage:mid.stage,segment:mid.seg,carry:{hits:mid.hits,bombs:mid.bombs},grown:{exp:mid.exp,fills:mid.fills}}:{stage:Progress.resume(progress)});});
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
    var rep=$('arcade-report');if(rep)rep.addEventListener('click',function(){if(!Mobile)return;Mobile.copyReport(function(ok){rep.textContent=T(ok?'reportDone':'reportFail');if(!ok)global.prompt&&global.prompt('기기 진단',Mobile.report());setTimeout(function(){rep.textContent=T('report');},4000);});}); // 기기 진단(오류·프레임·스테이지 기록)을 글로 복사
    $('arcade-dev').hidden=!DEV_VISIBLE;if($('arcade-dev-note'))$('arcade-dev-note').hidden=!DEV_VISIBLE;if($('arcade-report'))$('arcade-report').hidden=!DEV_VISIBLE;var devLabel=function(){var d=$('arcade-dev');d.textContent=devMode?'DEV 켜짐':'DEV 꺼짐';d.setAttribute('aria-pressed',String(devMode));};devLabel();
    $('arcade-dev').addEventListener('click',function(){devMode=!devMode;try{global.localStorage.setItem(DEV_KEY,devMode?'1':'0');}catch(e){}devLabel();showDevBadge();});
    $('arcade-sound').addEventListener('click',function(){soundOn=!soundOn;this.textContent=T(soundOn?'soundOn':'soundOff');this.setAttribute('aria-pressed',String(soundOn));});
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
  function ready(){var b=$('arcade-start');if(!b.disabled)return;b.disabled=false;b.textContent=T('fromStart');}
  function boot(){
    I18n.apply(document);
    loadProgress();setDifficulty(progress.difficulty);
    try{fx=global.HapilAudio&&global.HapilAudio.create?global.HapilAudio.create():null;}catch(e){fx=null;}
    if(!global.HapilMusic)try{music=new Audio('media/music.mp3');music.loop=true;music.volume=.2;music.preload='none';}catch(e){music=null;}
    bind();fit();refreshTitle();requestAnimationFrame(frame);
    // 그림 목록을 먼저 읽는다(없는 그림을 요청하지 않으려고). 못 읽어도 3초 뒤에는 시작할 수 있다.
    var done=function(){loadImage('gunner');if(manifest&&manifest['heart.webp']){want.heart=true;loadImage('heart');}ready();warmStage(0);};
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
    getState:snapshot,devDiag:devDiag,drawPropArt:drawPropArt, // tools/build-drawn-props-v43.cjs가 그림 파일을 구울 때 쓴다
    pause:pause,back:function(){if(mode==='paused')$('arcade-resume').click();else if(mode!=='title'&&mode!=='playing')goTitle();}, // 앱의 뒤로가기(arcade-mobile-v43.js)
    debugState:function(){
      return {state:state,app:snapshot(),progress:JSON.parse(JSON.stringify(progress)),saved:(function(){try{return global.localStorage.getItem(SAVE_KEY);}catch(e){return null;}})(),
        jumpStage:function(i,bossOnly){start({stage:i,bossOnly:!!bossOnly,quiet:true});return snapshot();},
        jumpSegment:function(i){var seg=Arcade.SEGMENTS[i];if(!seg)return null;start({stage:seg.stage,segment:i,quiet:true});return snapshot();},
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
