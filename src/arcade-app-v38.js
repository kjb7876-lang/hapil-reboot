/* 합일 v39 · ARCADE 탄막 모드 — 화면·입력·소리.
 * 시뮬레이션은 arcade-v38.js가 맡고, 여기서는 그 상태를 읽어 그리기만 한다. */
(function(global){
  'use strict';
  var Arcade=global.HapilArcade,W=Arcade.WIDTH,H=Arcade.HEIGHT,TAU=Math.PI*2;
  var $=function(id){return document.getElementById(id);};
  var canvas=$('arcade-canvas'),ctx=canvas.getContext('2d');
  var COLORS=['#ff3b4e','#ff4fd0','#a45cff','#4d7dff','#35d6ff','#4de38a','#ffd84a','#ff8a2e','#f2f2ff'];
  var RIM=['#7a0010','#7a0060','#3a0c8a','#0c2a8a','#04607a','#0a6a34','#7a5a00','#7a3000','#6a6a8a'];
  var THEME={violet:{color:'#b77bff',bg:'forest'},horn:{color:'#7be08a',bg:'cave'},balrog:{color:'#ff8a3c',bg:'ruins'}};
  var ART={violet:{src:'media/boss.webp',box:[188,64,298,288]},horn:{src:'media/horn.webp',box:[211,64,251,288]},balrog:{src:'media/balrog-idle.webp',box:[212,64,248,288]}};
  var IMAGES={player:'media/gunner.webp',forest:'media/forest.jpg',cave:'media/cave.webp',ruins:'media/ruins.webp',violet:ART.violet.src,horn:ART.horn.src,balrog:ART.balrog.src};
  var SERIF='"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var BOSS_HEIGHT=124,SLOW_FRAME_MS=21,VERY_SLOW_FRAME_MS=28,MAX_PARTICLES=360;

  var SHAPE_RICE=3,SHAPE_BUBBLE=4;
  var NOTES={gentle:'목숨 6 · 느린 탄 · 아주 작은 피격점 · 광선 예고 길게',normal:'목숨 4 · 탄 보통 · 광선 3줄',hell:'목숨 3 · 빠르고 빽빽한 탄 · 격자 광선 동시 발사'};
  var images={},orbs=[],shotSprite=null,homingSprite=null,circleSprite=null,backgrounds={};
  var scale=1,lite=false,frameMs=16,framesSeen=0,offsetX=0,offsetY=0;
  var state=null,mode='title',difficulty='normal',accumulator=0,lastStamp=0,visual=0;
  var particles=[],flash=0,hurtFlash=0,shake=0,shock=null,cutIn=0;
  var keys={},drag={active:false,id:null,x:0,y:0,pendingX:0,pendingY:0};
  var fx=null,music=null,soundOn=true,best=0;

  function offscreen(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
  function loadImages(){
    return Promise.all(Object.keys(IMAGES).map(function(key){return new Promise(function(resolve){var img=new Image();img.onload=function(){images[key]=img;resolve();};img.onerror=function(){resolve();};img.src=IMAGES[key];});}));
  }
  /* 구슬탄 한 장: 바깥 빛무리 → 색 테두리 → 흰 심. 색 9 × 크기 3을 미리 그려 두고 찍기만 한다. */
  function buildOrb(radius,color,rim){
    var reach=radius*(lite?1.25:2.3),c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale,grad;
    if(!lite){grad=g.createRadialGradient(m,m,r*.7,m,m,reach*scale);grad.addColorStop(0,color+'aa');grad.addColorStop(.45,color+'3c');grad.addColorStop(1,color+'00');g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);}
    grad=g.createRadialGradient(m,m,0,m,m,r);grad.addColorStop(0,'#ffffff');grad.addColorStop(.52,'#ffffff');grad.addColorStop(.78,color);grad.addColorStop(1,rim);
    g.fillStyle=grad;g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  // 쌀알탄: 오른쪽(진행 방향)으로 길쭉한 알. 그릴 때 탄의 각도로 돌린다.
  function buildRice(radius,color,rim){
    var longHalf=radius*2.6,reach=longHalf+(lite?1:4),c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale;
    g.translate(m,m);g.scale(scale,scale);
    if(!lite){g.fillStyle=color+'55';g.beginPath();g.ellipse(0,0,longHalf+3,radius+3,0,0,TAU);g.fill();}
    g.fillStyle=rim;g.beginPath();g.ellipse(0,0,longHalf,radius,0,0,TAU);g.fill();
    g.fillStyle=color;g.beginPath();g.ellipse(0,0,longHalf-1,radius-.8,0,0,TAU);g.fill();
    g.fillStyle='#ffffff';g.beginPath();g.ellipse(0,0,longHalf*.62,radius*.5,0,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  // 거품: 속이 비치는 큰 방울. 터지기 전의 독 포자·운석에 쓴다.
  function buildBubble(radius,color,rim){
    var reach=radius*(lite?1.15:1.6),c=offscreen(reach*2*scale,reach*2*scale),g=c.getContext('2d'),m=reach*scale,r=radius*scale,grad;
    if(!lite){grad=g.createRadialGradient(m,m,r*.8,m,m,reach*scale);grad.addColorStop(0,color+'88');grad.addColorStop(1,color+'00');g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);}
    grad=g.createRadialGradient(m,m,r*.2,m,m,r);grad.addColorStop(0,color+'30');grad.addColorStop(.7,color+'70');grad.addColorStop(.9,color);grad.addColorStop(1,rim);
    g.fillStyle=grad;g.beginPath();g.arc(m,m,r,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(m-r*.38,m-r*.42,r*.26,r*.15,-.6,0,TAU);g.fill();
    g.fillStyle='#ffffff';g.beginPath();g.arc(m,m,r*.22,0,TAU);g.fill();
    return {image:c,half:reach};
  }
  function buildSprites(){
    orbs=[];Arcade.SIZE_RADIUS.forEach(function(radius,size){orbs[size]=COLORS.map(function(color,i){return size===SHAPE_RICE?buildRice(radius,color,RIM[i]):size===SHAPE_BUBBLE?buildBubble(radius,color,RIM[i]):buildOrb(radius,color,RIM[i]);});});
    var c=offscreen(8*scale,26*scale),g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,c.height);
    grad.addColorStop(0,'#ffffff');grad.addColorStop(.35,'#9fefff');grad.addColorStop(1,'#35d6ff00');g.fillStyle=grad;g.beginPath();g.ellipse(c.width/2,c.height/2,c.width*.32,c.height/2,0,0,TAU);g.fill();shotSprite=c;
    homingSprite=buildOrb(3,'#7df3ff','#0a6a8a');
    c=offscreen(220*scale,220*scale);g=c.getContext('2d');g.scale(scale,scale);g.translate(110,110);g.strokeStyle='#ffffff';g.lineWidth=1.6;
    [104,92,60].forEach(function(r){g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();});
    g.lineWidth=1;for(var i=0;i<36;i++){var a=TAU*i/36;g.beginPath();g.moveTo(Math.cos(a)*92,Math.sin(a)*92);g.lineTo(Math.cos(a)*(i%3?98:104),Math.sin(a)*(i%3?98:104));g.stroke();}
    for(var k=0;k<2;k++){g.beginPath();for(var j=0;j<3;j++){var b=TAU*j/3+k*Math.PI/3-Math.PI/2;g[j?'lineTo':'moveTo'](Math.cos(b)*92,Math.sin(b)*92);}g.closePath();g.stroke();}
    circleSprite=c;
  }
  function buildBackgrounds(){
    Object.keys(THEME).forEach(function(key){
      var img=images[THEME[key].bg],c=offscreen(W,H+160),g=c.getContext('2d');g.fillStyle='#07070f';g.fillRect(0,0,c.width,c.height);
      if(img){var k=Math.max(c.width/img.width,c.height/img.height),w=img.width*k,h=img.height*k;g.drawImage(img,(c.width-w)/2,(c.height-h)/2,w,h);}
      g.fillStyle='rgba(5,5,14,.66)';g.fillRect(0,0,c.width,c.height);backgrounds[key]=c;
    });
  }
  function fit(){
    var dpr=Math.min(2,global.devicePixelRatio||1),next=lite?1:Math.max(1,dpr);
    if(next!==scale||!orbs.length||canvas.width!==W*next){scale=next;canvas.width=W*scale;canvas.height=H*scale;buildSprites();}
    var stage=$('arcade-stage'),room=stage.getBoundingClientRect(),k=Math.min(room.width/W,room.height/H);
    canvas.style.width=Math.floor(W*k)+'px';canvas.style.height=Math.floor(H*k)+'px';
  }
  // 느린 기기에서는 먼저 해상도를, 그래도 느리면 빛무리를 내려 탄 수는 그대로 지킨다.
  function adaptQuality(elapsedMs){
    frameMs+=(Math.min(80,elapsedMs)-frameMs)*.05;framesSeen++;
    if(framesSeen<150||mode!=='playing')return;
    if(frameMs>VERY_SLOW_FRAME_MS&&!lite){lite=true;framesSeen=0;frameMs=16;fit();buildSprites();}
    else if(frameMs>SLOW_FRAME_MS&&scale>1){scale=1;canvas.width=W;canvas.height=H;buildSprites();framesSeen=0;frameMs=16;}
  }

  function play(name,x){if(fx&&soundOn)fx.play(name,x===undefined?0:Math.max(-1,Math.min(1,(x/W-.5)*1.4)));}
  function addParticle(x,y,vx,vy,life,color,size){if(particles.length<MAX_PARTICLES)particles.push({x:x,y:y,vx:vx,vy:vy,life:life,max:life,color:color,size:size});}
  function consume(){
    var s=state,i;
    for(i=0;i<s.cancelled.length;i+=3)addParticle(s.cancelled[i],s.cancelled[i+1],0,-.5,22+(i%9),COLORS[s.cancelled[i+2]],5);
    s.cancelled.length=0;
    for(i=0;i<s.events.length;i++){
      var e=s.events[i];
      if(e==='graze'){play('graze',s.player.x);for(var k=0;k<3;k++)addParticle(s.player.x,s.player.y,(Math.random()-.5)*5,(Math.random()-.5)*5,12,'#ffffff',2);}
      else if(e==='bossHit'||e==='bossHitLow')play(e,s.boss.x);
      else if(e==='hurt'){play('hurt',s.player.x);hurtFlash=1;shake=14;}
      else if(e==='card'){play('charge',s.boss.x);cutIn=1;}
      else if(e==='entrance')play('warning');
      else if(e==='break'){play('phaseBreak',s.boss.x);flash=.7;shock={x:s.boss.x,y:s.boss.y,r:10};shake=8;}
      else if(e==='extend')play('seal');
      else if(e==='win'){play('win');flash=1;shock={x:s.boss.x,y:s.boss.y,r:10};finish();}
      else if(e==='lose'){play('lose');finish();}
      else if(e==='countdown'||e==='countdownLast')play(e);
      else if(e==='laserWarn')play('laserWarn',s.boss.x);
      else if(e==='laserFire'){play('laserFire',s.boss.x);shake=Math.max(shake,5);}
      else if(e==='pop')play('kill',s.boss.x);
    }
    s.events.length=0;
  }

  function drawBackground(s){
    var bg=backgrounds[s.boss.art]||backgrounds.violet;if(!bg){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);return;}
    ctx.drawImage(bg,0,-80+Math.sin(visual*.12)*78,W,H+160);
  }
  function drawBoss(s){
    var b=s.boss,art=ART[b.art],img=images[b.art];if(b.y<-50)return;
    var bob=Math.sin(visual*2.2)*4,size=190+Math.sin(visual*1.3)*10;
    ctx.save();ctx.translate(b.x,b.y+bob);ctx.rotate(visual*.5);ctx.globalAlpha=s.stage==='card'?.5:.22;ctx.globalCompositeOperation='lighter';
    ctx.drawImage(circleSprite,-size/2,-size/2,size,size);ctx.restore();
    if(!img)return;
    var w=BOSS_HEIGHT*art.box[2]/art.box[3],x=b.x-w/2,y=b.y+bob-BOSS_HEIGHT/2;
    ctx.drawImage(img,art.box[0],art.box[1],art.box[2],art.box[3],x,y,w,BOSS_HEIGHT);
    if(s.tick-b.hitTick<3){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4;ctx.drawImage(img,art.box[0],art.box[1],art.box[2],art.box[3],x,y,w,BOSS_HEIGHT);ctx.restore();}
  }
  function drawBullets(s){
    var bloom=Arcade.BLOOM_TICKS,i,o,half;
    for(i=0;i<s.n;i++){
      if(s.bage[i]<bloom)continue;
      o=orbs[s.bsize[i]][s.bcolor[i]];half=o.half;
      if(s.bsize[i]===SHAPE_RICE){var cos=Math.cos(s.ba[i]),sin=Math.sin(s.ba[i]);ctx.setTransform(scale*cos,scale*sin,-scale*sin,scale*cos,(s.bx[i]+offsetX)*scale,(s.by[i]+offsetY)*scale);ctx.drawImage(o.image,-half,-half,half*2,half*2);ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);}
      else ctx.drawImage(o.image,s.bx[i]-half,s.by[i]-half,half*2,half*2);
    }
    // 갓 피어나는 탄: 크고 옅게 시작해 제 크기로 조여 든다.
    for(i=0;i<s.n;i++){
      var age=s.bage[i];if(age>=bloom)continue;
      var t=age/bloom;o=orbs[s.bsize[i]][s.bcolor[i]];half=o.half*(2.4-1.4*t);ctx.globalAlpha=.25+.6*t;ctx.drawImage(o.image,s.bx[i]-half,s.by[i]-half,half*2,half*2);
    }
    ctx.globalAlpha=1;
  }
  /* 광선. 예고: 가는 점선이 굵어지며 깜빡인다 → 발사: 색 빛무리 + 흰 심 → 잔광: 가늘어지며 사라진다. */
  function drawLasers(s){
    if(!s.lasers.length)return;
    ctx.save();ctx.lineCap='butt';
    for(var i=0;i<s.lasers.length;i++){
      var l=s.lasers[i],color=COLORS[l.color],x2=l.x+Math.cos(l.angle)*1000,y2=l.y+Math.sin(l.angle)*1000;
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
  function drawShots(s){
    ctx.globalAlpha=.8;
    for(var i=0;i<s.sn;i++){
      if(s.shoming[i]){var h=homingSprite.half;ctx.drawImage(homingSprite.image,s.sx[i]-h,s.sy[i]-h,h*2,h*2);}
      else ctx.drawImage(shotSprite,s.sx[i]-4,s.sy[i]-13,8,26);
    }
    ctx.globalAlpha=1;
  }
  function drawPlayer(s){
    var p=s.player,blink=s.tick<p.invulnerableUntil&&Math.floor(s.tick/4)%2;
    if(images.player){ctx.globalAlpha=blink?.35:.95;ctx.drawImage(images.player,p.x-258.5369*57/512,p.y-283.8754*57/512,57,57);ctx.globalAlpha=1;}
    if(p.focus||s.tick<p.invulnerableUntil){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(visual*3);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,p.focus?17:24,0,TAU);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#ff2a4a';ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.8,0,TAU);ctx.fill();
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
  function pad(n){return ('00000000'+Math.max(0,Math.floor(n))).slice(-8);}
  function drawHud(s){
    var b=s.boss,card=Arcade.CARDS[s.cardIndex],theme=THEME[b.art],left=Arcade.timeLeft(s);
    var top=ctx.createLinearGradient(0,0,0,64);top.addColorStop(0,'rgba(4,4,12,.78)');top.addColorStop(1,'rgba(4,4,12,0)');ctx.fillStyle=top;ctx.fillRect(0,0,W,64);
    ctx.textBaseline='alphabetic';
    if(s.stage==='card'){
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(12,9,W-24,4);ctx.fillStyle=b.hp/b.maxHp<=.2?'#ff5a5a':theme.color;ctx.fillRect(12,9,(W-24)*Math.max(0,b.hp/b.maxHp),4);
      ctx.textAlign='right';ctx.font='600 20px '+SANS;ctx.fillStyle=left<=10?'#ff6a6a':'#ffffff';ctx.fillText(left<10?left.toFixed(1):String(Math.ceil(left)),W-12,35);
      ctx.font='italic 12px '+SERIF;ctx.fillStyle='#f3e3b5';ctx.fillText('「'+card.name+'」',W-12,52);
    }
    ctx.textAlign='left';ctx.font='600 12px '+SANS;ctx.fillStyle=theme.color;ctx.fillText(b.name,12,29);
    ctx.font='11px '+SANS;ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText('스펠 '+(s.cardIndex+1)+' / '+Arcade.CARDS.length,12,45);
    var bottom=ctx.createLinearGradient(0,H-46,0,H);bottom.addColorStop(0,'rgba(4,4,12,0)');bottom.addColorStop(1,'rgba(4,4,12,.7)');ctx.fillStyle=bottom;ctx.fillRect(0,H-46,W,46);
    ctx.font='15px '+SANS;ctx.fillStyle='#ff6a8a';var hearts='';for(var i=0;i<s.player.maxHp;i++)hearts+=i<s.player.hp?'◆':'◇';ctx.fillText(hearts,12,H-12);
    ctx.textAlign='right';ctx.font='600 14px '+SANS;ctx.fillStyle='#ffffff';ctx.fillText(pad(s.score),W-12,H-12);
    ctx.font='10px '+SANS;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillText('GRAZE '+s.graze,W-12,H-29);
    if(cutIn>0&&s.stage==='card'){
      var t=1-cutIn,slide=t<.18?(1-t/.18)*W:0,alpha=t>.75?(1-t)/.25:1,img=images[b.art],art=ART[b.art];
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(slide,0);
      var band=ctx.createLinearGradient(0,0,W,0);band.addColorStop(0,'rgba(0,0,0,0)');band.addColorStop(.25,'rgba(6,4,16,.82)');band.addColorStop(1,'rgba(6,4,16,.82)');ctx.fillStyle=band;ctx.fillRect(0,232,W,58);
      ctx.fillStyle=theme.color;ctx.fillRect(60,232,W-60,1.5);ctx.fillRect(60,288.5,W-60,1.5);
      if(img){ctx.globalAlpha=alpha*.5;var cropH=art.box[3]*.6,showH=92;ctx.drawImage(img,art.box[0],art.box[1],art.box[2],cropH,8,196,showH*art.box[2]/cropH,showH);ctx.globalAlpha=alpha;}
      ctx.textAlign='right';ctx.font='600 22px '+SERIF;ctx.fillStyle='#fff3cf';ctx.fillText(card.name,W-16,268);
      ctx.font='11px '+SANS;ctx.fillStyle=theme.color;ctx.fillText(b.name+' · SPELL '+(s.cardIndex+1),W-16,283);ctx.restore();
    }
  }
  function draw(){
    var s=state;ctx.setTransform(scale,0,0,scale,0,0);
    if(!s){ctx.fillStyle='#07070f';ctx.fillRect(0,0,W,H);if(backgrounds.violet)ctx.drawImage(backgrounds.violet,0,-80,W,H+160);return;}
    offsetX=offsetY=0;if(shake>0){offsetX=(Math.random()-.5)*shake*.7;offsetY=(Math.random()-.5)*shake*.7;shake--;}
    ctx.save();ctx.setTransform(scale,0,0,scale,offsetX*scale,offsetY*scale);
    drawBackground(s);drawBoss(s);drawShots(s);drawPlayer(s);drawParticles();drawLasers(s);drawBullets(s);
    // 피격점은 탄에 가려지지 않도록 맨 위에 한 번 더 찍는다.
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(s.player.x,s.player.y,Math.max(1.2,s.player.r),0,TAU);ctx.fill();
    ctx.restore();drawHud(s);
    if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash*.8)+')';ctx.fillRect(0,0,W,H);flash-=.04;}
    if(hurtFlash>0){var v=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,420);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,'rgba(255,0,40,'+(hurtFlash*.6)+')');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);hurtFlash-=.035;}
    if(cutIn>0)cutIn-=1/95;
  }

  function inputForStep(){
    var focus=!!keys.Shift,speed=focus?1.8:4.2,x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),y=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
    if(x||y){var n=Math.sqrt(x*x+y*y);return {dx:x/n*speed,dy:y/n*speed,focus:focus};}
    var dx=drag.pendingX,dy=drag.pendingY,len=Math.sqrt(dx*dx+dy*dy),limit=12;
    if(len>limit){dx*=limit/len;dy*=limit/len;}
    drag.pendingX-=dx;drag.pendingY-=dy;return {dx:dx,dy:dy,focus:false};
  }
  function frame(stamp){
    requestAnimationFrame(frame);
    if(!lastStamp)lastStamp=stamp;var elapsed=Math.min(.1,Math.max(0,(stamp-lastStamp)/1000));lastStamp=stamp;visual+=elapsed;
    if(mode==='playing'&&state){
      adaptQuality(elapsed*1000);accumulator=Math.min(accumulator+elapsed,4/60);
      var steps=0;while(accumulator>=1/60&&steps<4&&mode==='playing'){Arcade.step(state,inputForStep());accumulator-=1/60;steps++;consume();}
    }
    draw();
  }
  function show(id,on){$(id).hidden=!on;}
  function setMode(next){mode=next;show('arcade-title',next==='title');show('arcade-pause',next==='paused');show('arcade-result',next==='result');show('arcade-pause-button',next==='playing');if(music){if(next==='playing'&&soundOn){var p=music.play();if(p&&p.catch)p.catch(function(){});}else music.pause();}}
  function start(){
    if(fx)fx.unlock();
    state=Arcade.createRun({difficulty:difficulty,seed:(Date.now()^Math.floor(performance.now()*1000))>>>0});
    particles.length=0;flash=hurtFlash=shake=cutIn=0;shock=null;accumulator=0;lastStamp=0;drag.pendingX=drag.pendingY=0;framesSeen=0;setMode('playing');
  }
  function finish(){
    var s=state,won=s.stage==='won';
    if(s.score>best){best=s.score;try{global.localStorage.setItem('hapil-arcade-best-v38',String(best));}catch(e){}}
    $('result-title').textContent=won?'ALL CLEAR':'GAME OVER';$('result-score').textContent=pad(s.score);$('result-best').textContent=pad(best);
    $('result-detail').textContent='스펠 격파 '+s.cleared+' / '+Arcade.CARDS.length+' · 스친 탄 '+s.graze+' · 피격 '+s.hits;
    setTimeout(function(){if(state===s)setMode('result');},won?1500:900);
  }
  function pause(){if(mode==='playing')setMode('paused');}
  function bind(){
    document.querySelectorAll('[data-difficulty]').forEach(function(button){button.addEventListener('click',function(){difficulty=button.dataset.difficulty;$('difficulty-note').textContent=NOTES[difficulty];document.querySelectorAll('[data-difficulty]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});});});
    $('arcade-start').addEventListener('click',start);$('arcade-retry').addEventListener('click',start);
    $('arcade-resume').addEventListener('click',function(){if(fx)fx.unlock();accumulator=0;lastStamp=0;setMode('playing');});
    $('arcade-pause-button').addEventListener('click',pause);
    $('arcade-quit').addEventListener('click',function(){state=null;setMode('title');});
    $('arcade-sound').addEventListener('click',function(){soundOn=!soundOn;this.textContent=soundOn?'소리 켜짐':'소리 꺼짐';this.setAttribute('aria-pressed',String(soundOn));});
    var stage=$('arcade-stage');
    stage.addEventListener('pointerdown',function(e){if(mode!=='playing'||drag.active||e.target.closest('button'))return;e.preventDefault();drag.active=true;drag.id=e.pointerId;drag.x=e.clientX;drag.y=e.clientY;try{stage.setPointerCapture(e.pointerId);}catch(ignore){}});
    stage.addEventListener('pointermove',function(e){if(!drag.active||e.pointerId!==drag.id)return;e.preventDefault();var k=W/canvas.getBoundingClientRect().width;drag.pendingX=Math.max(-48,Math.min(48,drag.pendingX+(e.clientX-drag.x)*k));drag.pendingY=Math.max(-48,Math.min(48,drag.pendingY+(e.clientY-drag.y)*k));drag.x=e.clientX;drag.y=e.clientY;});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){stage.addEventListener(type,function(e){if(e.pointerId===drag.id){drag.active=false;drag.id=null;}});});
    document.addEventListener('keydown',function(e){var key=e.key.length===1?e.key.toLowerCase():e.key;if(key==='Escape'||key===' '){e.preventDefault();if(mode==='playing')pause();else if(mode==='paused')$('arcade-resume').click();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift'].indexOf(key)>=0){if(mode==='playing')e.preventDefault();keys[key]=true;}});
    document.addEventListener('keyup',function(e){delete keys[e.key.length===1?e.key.toLowerCase():e.key];});
    document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
    global.addEventListener('blur',function(){keys={};pause();});global.addEventListener('resize',fit);
  }
  function boot(){
    try{best=Number(global.localStorage.getItem('hapil-arcade-best-v38'))||0;}catch(e){best=0;}
    $('title-best').textContent=pad(best);
    try{fx=global.HapilAudio&&global.HapilAudio.create?global.HapilAudio.create():null;}catch(e){fx=null;}
    try{music=new Audio('media/music.mp3');music.loop=true;music.volume=.22;music.preload='none';}catch(e){music=null;}
    bind();fit();requestAnimationFrame(frame);
    loadImages().then(function(){buildBackgrounds();$('arcade-start').disabled=false;$('arcade-start').textContent='게임 시작';});
  }
  global.HapilArcadeApp={getState:function(){return {mode:mode,scale:scale,lite:lite,frameMs:frameMs,bullets:state?state.n:0,stage:state?state.stage:'',card:state?state.cardIndex:-1,hp:state?state.player.hp:0,score:state?state.score:0,particles:particles.length,images:Object.keys(images).length};},debugState:function(){return state;}};
  boot();
})(window);
