/* 합일 v38 · ARCADE 탄막 모드 — 전투 시뮬레이션.
 * 스토리 전투(core.js, 규칙31)와 완전히 분리된 독립 엔진이다. 구슬탄 수백~천 발을
 * 다루기 위해 탄환을 배열 묶음(SoA)으로 두고, 60Hz 고정 틱·시드 난수로 결정적으로 돈다.
 * 화면 그리기와 소리는 arcade-app-v38.js가 맡고 이 파일은 DOM을 쓰지 않는다. */
(function(root){
  'use strict';
  var W=360,H=640,CAP=1400,TICK=1/60,TAU=Math.PI*2;
  var DENSITY={gentle:.75,normal:1.25,hell:1.8},SPEED={gentle:.8,normal:.9,hell:1.08};
  var PLAYER_RADIUS=2.4,GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=100;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=96,MAX_MOVE=12,FOCUS_MOVE=2;
  // 색 번호: 0 빨강 1 자홍 2 보라 3 파랑 4 청록 5 초록 6 노랑 7 주황 8 흰색 · 크기 번호: 0 작은 탄(반지름 4) 1 중간(6) 2 큰 탄(10)
  var SIZE_RADIUS=[4,6,10];

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*DENSITY[s.difficulty]));}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  /* 탄 하나를 만든다. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode(1 조준 재발사, 2 각도 꺾기),arg,speed2,life} */
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=CAP){s.dropped++;return;}
    o=o||{};var i=s.n++,size=o.size||0;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*SPEED[s.difficulty];
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*SPEED[s.difficulty];
    s.bage[i]=0;s.blife[i]=o.life||720;s.bsize[i]=size;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;
  }
  function ring(s,x,y,n,speed,offset,o){for(var i=0;i<n;i++)spawn(s,x,y,offset+TAU*i/n,speed,o);}
  function fan(s,x,y,n,center,spread,speed,o){for(var i=0;i<n;i++)spawn(s,x,y,center+(n>1?(i/(n-1)-.5)*spread:0),speed,o);}

  /* 스펠 카드. fire(s,t)는 카드 시작 뒤 t틱째에 한 번 불린다. 탄 수는 count()로 난이도에 맞춘다. */
  var CARDS=[
    {boss:0,name:'여덟 실의 나선',hp:680,time:45,fire:function(s,t){
      var b=s.boss,arms=count(s,4),k;
      if(t%5===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.045+TAU*k/arms,92,{color:2,size:0});
      if(t%5===2)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.038+TAU*k/arms,74,{color:1,size:0});
      if(t%96===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,128,{color:8,size:1});
    }},
    {boss:0,name:'거미줄 만개',hp:760,time:45,fire:function(s,t){
      var b=s.boss,n=count(s,26);
      if(t%46===0){var odd=(t/46)%2;ring(s,b.x,b.y,n,84,odd?Math.PI/n:0,{color:odd?1:2,size:1,turn:odd?.22:-.22});}
      if(t%46===23)ring(s,b.x,b.y,n,58,t*.01,{color:3,size:0});
      if(t%110===80)fan(s,b.x,b.y,count(s,5),aim(s,b.x,b.y),.7,134,{color:8,size:2});
    }},
    {boss:1,name:'늪의 파문',hp:840,time:50,fire:function(s,t){
      var b=s.boss;
      if(t%72===0){var n=count(s,34),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,168,{color:5,size:0,accel:-170,min:0,at:62,mode:1,arg:(i%3-1)*.2,speed2:104});}
      if(t%72===36)ring(s,b.x,b.y,count(s,16),70,t*.02,{color:6,size:1});
      if(t%14===0)spawn(s,20+rand(s)*(W-40),-8,Math.PI/2+(rand(s)-.5)*.3,46+rand(s)*30,{color:4,size:0});
    }},
    {boss:1,name:'썩은 비의 장막',hp:900,time:50,fire:function(s,t){
      var b=s.boss,i;
      if(t%7===0)for(i=0;i<count(s,2);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,58+rand(s)*52,{color:rand(s)<.5?5:4,size:0,turn:(i%2?1:-1)*(.1+rand(s)*.12),life:900});
      if(t%120===0)for(i=0;i<3;i++)ring(s,b.x,b.y,count(s,18),64+i*26,i*.17+t*.003,{color:6,size:1});
      if(t%120===70)fan(s,b.x,b.y,count(s,7),aim(s,b.x,b.y),1.1,118,{color:7,size:2});
    }},
    {boss:2,name:'화염 수레바퀴',hp:960,time:55,fire:function(s,t){
      var b=s.boss,arms=count(s,3),k;
      if(t%4===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.06+TAU*k/arms,102,{color:7,size:0,turn:.42});
      if(t%4===2)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.06+TAU*k/arms,102,{color:0,size:0,turn:-.42});
      if(t%84===0)ring(s,b.x,b.y,count(s,18),52,rand(s)*TAU,{color:6,size:2});
    }},
    {boss:2,name:'최후의 만다라',hp:1100,time:60,fire:function(s,t){
      var b=s.boss,arms=count(s,6),k;
      if(t%7===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.031+TAU*k/arms,104,{color:0,size:1});
      if(t%7===3)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.027+TAU*k/arms,76,{color:7,size:0});
      if(t%130===0){var n=count(s,44),base=rand(s)*TAU;for(k=0;k<n;k++)spawn(s,b.x,b.y,base+TAU*k/n,190,{color:8,size:0,accel:-210,min:0,at:55,mode:2,arg:k%2?.9:-.9,speed2:96});}
      if(t%130===65)fan(s,b.x,b.y,count(s,5),aim(s,b.x,b.y),.6,140,{color:6,size:2});
    }}
  ];
  var BOSSES=[{name:'보라검천사',art:'violet'},{name:'늪지대 뿔악마',art:'horn'},{name:'발록',art:'balrog'}];

  function createRun(options){
    options=options||{};var difficulty=DENSITY[options.difficulty]?options.difficulty:'normal';
    var s={revision:38,difficulty:difficulty,seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'intro',stageTick:0,cardIndex:0,cardTick:0,
      player:{x:W/2,y:H-84,hp:3,maxHp:3,invulnerableUntil:0,r:PLAYER_RADIUS,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,index:0,name:BOSSES[0].name,art:BOSSES[0].art,hitTick:-99},
      n:0,dropped:0,peak:0,score:0,graze:0,hits:0,cleared:0,timeouts:0,events:[],cancelled:[],
      shots:[],sn:0};
    ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2'].forEach(function(k){s[k]=new Float32Array(CAP);});
    ['bage','blife','bat'].forEach(function(k){s[k]=new Uint16Array(CAP);});
    ['bsize','bcolor','bgrazed','bmode'].forEach(function(k){s[k]=new Uint8Array(CAP);});
    s.sx=new Float32Array(SHOT_CAP);s.sy=new Float32Array(SHOT_CAP);s.shoming=new Uint8Array(SHOT_CAP);
    return s;
  }
  function note(s,name){if(s.events.length<48)s.events.push(name);}
  function removeBullet(s,i){
    var j=--s.n;if(i===j)return;
    s.bx[i]=s.bx[j];s.by[i]=s.by[j];s.ba[i]=s.ba[j];s.bs[i]=s.bs[j];s.bturn[i]=s.bturn[j];s.bacc[i]=s.bacc[j];s.bmin[i]=s.bmin[j];s.bmax[i]=s.bmax[j];s.barg[i]=s.barg[j];s.bs2[i]=s.bs2[j];
    s.bage[i]=s.bage[j];s.blife[i]=s.blife[j];s.bat[i]=s.bat[j];s.bsize[i]=s.bsize[j];s.bcolor[i]=s.bcolor[j];s.bgrazed[i]=s.bgrazed[j];s.bmode[i]=s.bmode[j];
  }
  // 화면의 탄을 모두 지우고 지운 자리를 연출용으로 남긴다(최대 320개). 지운 수를 돌려준다.
  function cancelAll(s){
    var n=s.n;for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bcolor[i]);
    s.n=0;return n;
  }
  function beginCard(s){
    var card=CARDS[s.cardIndex],boss=s.boss;
    if(boss.index!==card.boss||s.cardIndex===0){boss.index=card.boss;boss.name=BOSSES[card.boss].name;boss.art=BOSSES[card.boss].art;}
    boss.maxHp=boss.hp=card.hp;s.stage='card';s.stageTick=0;s.cardTick=0;note(s,'card');
  }
  function endCard(s,defeated){
    var card=CARDS[s.cardIndex],left=Math.max(0,card.time-s.cardTick*TICK),wiped=cancelAll(s);
    if(defeated){s.cleared++;s.score+=Math.round(left)*500+wiped*30;}else s.timeouts++;
    s.score+=wiped*10;
    if(s.cardIndex===CARDS.length-1){s.stage='won';s.stageTick=0;note(s,'win');return;}
    var next=CARDS[s.cardIndex+1];s.cardIndex++;s.stage='break';s.stageTick=0;note(s,'break');
    if(next.boss!==card.boss){s.boss.leaving=true;if(s.player.hp<s.player.maxHp){s.player.hp++;note(s,'extend');}}
  }
  function moveBoss(s){
    var b=s.boss;
    if(s.stage==='card'&&s.cardTick%150===0){b.targetX=96+rand(s)*(W-192);b.targetY=112+rand(s)*52;}
    if(b.leaving){b.y-=5;if(b.y<-70){b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=132;var card=CARDS[s.cardIndex];b.index=card.boss;b.name=BOSSES[card.boss].name;b.art=BOSSES[card.boss].art;note(s,'entrance');}return;}
    b.x+=(b.targetX-b.x)*.035;b.y+=(b.targetY-b.y)*.05;
  }
  function movePlayer(s,input){
    var p=s.player,dx=Number(input&&input.dx)||0,dy=Number(input&&input.dy)||0,limit=input&&input.focus?FOCUS_MOVE:MAX_MOVE,len=Math.sqrt(dx*dx+dy*dy);
    if(len>limit){dx*=limit/len;dy*=limit/len;}
    p.focus=!!(input&&input.focus);p.x=Math.max(8,Math.min(W-8,p.x+dx));p.y=Math.max(40,Math.min(H-14,p.y+dy));
  }
  function updateShots(s){
    var b=s.boss,p=s.player,i;
    // 곧은 주포 2발 + 보스를 따라가는 유도탄 2발. 보스 바로 아래에 서면 주포까지 맞아 훨씬 빨리 깬다.
    if(s.tick%SHOT_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=0;s.sx[s.sn]=p.x-7;s.sy[s.sn++]=p.y-18;s.shoming[s.sn]=0;s.sx[s.sn]=p.x+7;s.sy[s.sn++]=p.y-18;}
    if(s.tick%HOMING_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=1;s.sx[s.sn]=p.x-20;s.sy[s.sn++]=p.y-4;s.shoming[s.sn]=1;s.sx[s.sn]=p.x+20;s.sy[s.sn++]=p.y-4;}
    for(i=s.sn-1;i>=0;i--){
      s.sy[i]-=SHOT_SPEED;
      if(s.shoming[i]){var steer=b.x-s.sx[i];s.sx[i]+=steer>HOMING_STEER?HOMING_STEER:steer<-HOMING_STEER?-HOMING_STEER:steer;}
      var hit=s.stage==='card'&&Math.abs(s.sx[i]-b.x)<30&&Math.abs(s.sy[i]-b.y)<34;
      if(hit){b.hp-=1;s.score+=2;if(s.tick-b.hitTick>=5){b.hitTick=s.tick;note(s,b.hp/b.maxHp<=.2?'bossHitLow':'bossHit');}}
      if(hit||s.sy[i]<-20){var j=--s.sn;s.sx[i]=s.sx[j];s.sy[i]=s.sy[j];s.shoming[i]=s.shoming[j];}
    }
  }
  function updateBullets(s){
    var p=s.player,px=p.x,py=p.y,vulnerable=s.tick>=p.invulnerableUntil,struck=false,grazed=0,i;
    for(i=s.n-1;i>=0;i--){
      var age=++s.bage[i];
      if(s.bat[i]&&age===s.bat[i]){
        if(s.bmode[i]===1)s.ba[i]=Math.atan2(py-s.by[i],px-s.bx[i])+s.barg[i];else if(s.bmode[i]===2)s.ba[i]+=s.barg[i];
        s.bs[i]=s.bs2[i];s.bacc[i]=0;
      }
      if(s.bturn[i])s.ba[i]+=s.bturn[i]*TICK;
      if(s.bacc[i]){var v=s.bs[i]+s.bacc[i]*TICK;s.bs[i]=v<s.bmin[i]?s.bmin[i]:v>s.bmax[i]?s.bmax[i]:v;}
      var x=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK,y=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK;
      if(x<-24||x>W+24||y<-40||y>H+24||age>=s.blife[i]){removeBullet(s,i);continue;}
      if(age<BLOOM_TICKS)continue; // 갓 피어난 탄은 아직 닿지 않는다
      var dx=x-px,dy=y-py,radius=SIZE_RADIUS[s.bsize[i]],d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN;
      if(d2>reach*reach)continue;
      var hitReach=radius*.5+PLAYER_RADIUS;
      if(d2<hitReach*hitReach){if(vulnerable)struck=true;}
      else if(!s.bgrazed[i]){s.bgrazed[i]=1;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.score+=grazed*20;note(s,'graze');}
    if(struck){
      p.hp--;s.hits++;p.invulnerableUntil=s.tick+INVULN_TICKS;cancelAll(s);note(s,'hurt');
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}
    }
  }
  /* 한 틱(1/60초) 진행. input: {dx,dy,focus} — dx,dy는 이번 틱에 움직일 픽셀. */
  function step(s,input){
    if(s.stage==='won'||s.stage==='lost'){s.stageTick++;return s;}
    s.tick++;s.stageTick++;movePlayer(s,input);moveBoss(s);
    if(s.stage==='intro'){if(s.stageTick===1)note(s,'entrance');if(s.stageTick>=INTRO_TICKS)beginCard(s);}
    else if(s.stage==='break'){if(s.stageTick>=BREAK_TICKS&&!s.boss.leaving)beginCard(s);}
    else if(s.stage==='card'){
      var card=CARDS[s.cardIndex],t=s.cardTick++;
      if(t>=40)card.fire(s,t-40); // 카드 이름이 뜨는 동안은 쏘지 않는다
      var left=card.time-s.cardTick*TICK;
      if(left<=10&&left>0&&s.cardTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    updateShots(s);
    if(s.stage==='card'&&s.boss.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&s.cardTick*TICK>=CARDS[s.cardIndex].time)endCard(s,false);
    updateBullets(s);
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function timeLeft(s){return s.stage==='card'?Math.max(0,CARDS[s.cardIndex].time-s.cardTick*TICK):0;}
  var api={revision:38,WIDTH:W,HEIGHT:H,CAP:CAP,CARDS:CARDS,BOSSES:BOSSES,SIZE_RADIUS:SIZE_RADIUS,BLOOM_TICKS:BLOOM_TICKS,createRun:createRun,step:step,timeLeft:timeLeft};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);
