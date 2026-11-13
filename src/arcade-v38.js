/* 합일 v39 · ARCADE 탄막 모드 — 전투 시뮬레이션.
 * 스토리 전투(core.js, 규칙31)와 완전히 분리된 독립 엔진이다. 구슬탄 수백~천 발을
 * 다루기 위해 탄환을 배열 묶음(SoA)으로 두고, 60Hz 고정 틱·시드 난수로 결정적으로 돈다.
 * 화면 그리기와 소리는 arcade-app-v38.js가 맡고 이 파일은 DOM을 쓰지 않는다. */
(function(root){
  'use strict';
  var W=360,H=640,CAP=1400,LASER_CAP=24,TICK=1/60,TAU=Math.PI*2;
  /* 난이도. density 탄 수 배율 · speed 탄 속도 배율 · hp 목숨 · radius 영웅 피격점 반지름 ·
   * hitScale 탄의 보이는 반지름 중 실제로 닿는 비율 · warn 광선 예고 시간 배율 · beam 광선 굵기 배율 · extend 보스 교체 때 회복량 */
  var DIFFICULTY={
    gentle:{density:.7,speed:.66,hp:6,radius:1.4,hitScale:.36,warn:1.6,beam:.72,extend:2,label:'여유'},
    normal:{density:1,speed:.82,hp:4,radius:2,hitScale:.46,warn:1.2,beam:.88,extend:1,label:'기본'},
    hell:{density:1.8,speed:1.08,hp:3,radius:2.4,hitScale:.5,warn:1,beam:1,extend:1,label:'지옥'}
  };
  var GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=100,FIRE_DELAY=40;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=96,MAX_MOVE=12,FOCUS_MOVE=2;
  var BEAM_HIT=.62,BEAM_FADE=14,BEAM_LENGTH=1000;
  // 색 번호: 0 빨강 1 자홍 2 보라 3 파랑 4 청록 5 초록 6 노랑 7 주황 8 흰색
  // 모양 번호: 0 작은 구슬(반지름 4) 1 중간(6) 2 큰 구슬(10) 3 쌀알탄(3.2, 진행 방향으로 길쭉) 4 거품(15)
  var SIZE_RADIUS=[4,6,10,3.2,15];
  // 탄 변화 방식: 1 영웅을 다시 조준 2 각도 꺾기 3 터져서 고리로 갈라짐
  var MODE_REAIM=1,MODE_TURN=2,MODE_SPLIT=3;

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*s.rules.density));}
  function pick(s,gentle,normal,hell){return s.difficulty==='gentle'?gentle:s.difficulty==='hell'?hell:normal;}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  /* 탄 하나. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode,arg,speed2,life} */
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=CAP){s.dropped++;return;}
    o=o||{};var i=s.n++;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*s.rules.speed;
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*s.rules.speed;
    s.bage[i]=0;s.blife[i]=o.life||720;s.bsize[i]=o.size||0;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;
  }
  function ring(s,x,y,n,speed,offset,o){for(var i=0;i<n;i++)spawn(s,x,y,offset+TAU*i/n,speed,o);}
  function fan(s,x,y,n,center,spread,speed,o){for(var i=0;i<n;i++)spawn(s,x,y,center+(n>1?(i/(n-1)-.5)*spread:0),speed,o);}
  /* 광선 하나. (x,y)에서 angle 방향으로 뻗는다. o: {width,warn,active,color,spin(초당 회전),follow(보스에 붙음),burst(켜질 때 선을 따라 쌀알탄)} */
  function beam(s,x,y,angle,o){
    if(s.lasers.length>=LASER_CAP)return;
    s.lasers.push({x:x,y:y,angle:angle,width:(o.width||18)*s.rules.beam,warn:Math.round((o.warn||60)*s.rules.warn),active:o.active||60,
      color:o.color||0,spin:o.spin||0,follow:!!o.follow,burst:!!o.burst,age:0,grazed:false});
    if(!s.warned){s.warned=true;note(s,'laserWarn');}
  }
  function row(s,y,o){beam(s,-12,y,0,o);}
  function column(s,x,o){beam(s,x,-12,Math.PI/2,o);}
  // 가로폭을 n칸으로 나눠 칸마다 한 줄씩 세운다. 칸 사이에는 늘 지나갈 틈이 남는다.
  function slots(s,n,span,margin){var out=[],cell=(span-margin*2)/n;for(var i=0;i<n;i++)out.push(margin+cell*(i+.2+rand(s)*.6));return out;}

  /* 스펠 카드. fire(s,t)는 발사가 시작된 뒤 t틱째에 한 번 불린다.
   * 보스마다 색·탄 모양·광선 방향을 달리해 누구의 공격인지 한눈에 구분되게 한다.
   *   보라검천사 — 보라·자홍, 실(대각선 광선 그물)과 검(조준 참격 + 쌀알탄)
   *   늪지대 뿔악마 — 초록·노랑, 위에서 내리꽂는 세로 기둥과 터지는 독 거품
   *   발록 — 빨강·주황, 가로세로 불길 격자와 보스를 축으로 도는 회전 광선 */
  var CARDS=[
    {boss:0,name:'여덟 실의 나선',hp:680,time:45,fire:function(s,t){
      var b=s.boss,arms=count(s,4),k;
      if(t%5===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.045+TAU*k/arms,92,{color:2,size:0});
      if(t%5===2)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.038+TAU*k/arms,74,{color:1,size:0});
      if(t%96===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,128,{color:8,size:3});
    }},
    {boss:0,name:'거미줄 결계',hp:700,time:50,fire:function(s,t){
      var b=s.boss,n=pick(s,2,3,4),tilt=.95,k,phase=t%190;
      if(phase===0)for(k=0;k<n;k++)beam(s,-12,-150+k*(520/n)+rand(s)*50,tilt,{width:13,warn:62,active:78,color:2});
      if(phase===95)for(k=0;k<n;k++)beam(s,W+12,-150+k*(520/n)+rand(s)*50,Math.PI-tilt,{width:13,warn:62,active:78,color:1});
      if(t%44===20)ring(s,b.x,b.y,count(s,14),62,t*.013,{color:2,size:1});
      if(s.difficulty==='hell'&&t%6===0)for(k=0;k<2;k++)spawn(s,b.x,b.y,t*.07+Math.PI*k,88,{color:1,size:0});
    }},
    {boss:0,name:'보라검 난무',hp:720,time:50,fire:function(s,t){
      var b=s.boss,cuts=pick(s,1,2,3),k;
      if(t%104===0){var center=aim(s,b.x,b.y);for(k=0;k<cuts;k++)beam(s,b.x,b.y,center+(cuts>1?(k/(cuts-1)-.5)*.8:0),{width:15,warn:44,active:20,color:1,burst:true});}
      if(t%52===26)fan(s,b.x,b.y,count(s,7),aim(s,b.x,b.y),1.25,118,{color:2,size:3});
      if(s.difficulty==='hell'&&t%104===52)ring(s,b.x,b.y,24,70,rand(s)*TAU,{color:8,size:0});
    }},
    {boss:1,name:'늪의 파문',hp:760,time:50,fire:function(s,t){
      var b=s.boss;
      if(t%72===0){var n=count(s,34),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,168,{color:5,size:0,accel:-170,min:0,at:62,mode:MODE_REAIM,arg:(i%3-1)*.2,speed2:104});}
      if(t%72===36)ring(s,b.x,b.y,count(s,16),70,t*.02,{color:6,size:1});
      if(t%14===0)spawn(s,20+rand(s)*(W-40),-8,Math.PI/2+(rand(s)-.5)*.3,46+rand(s)*30,{color:4,size:0});
    }},
    {boss:1,name:'썩은 비의 기둥',hp:740,time:50,fire:function(s,t){
      var b=s.boss,i;
      if(t%156===0){
        // 첫 기둥은 영웅 머리 위에 떨어져 자리를 옮기게 하고, 나머지는 칸마다 하나씩 선다.
        column(s,s.player.x,{width:26,warn:66,active:84,color:5});
        slots(s,pick(s,1,2,4),W,14).forEach(function(x){if(Math.abs(x-s.player.x)>44)column(s,x,{width:22,warn:66,active:84,color:5});});
      }
      if(t%9===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,60+rand(s)*48,{color:rand(s)<.5?5:4,size:0,turn:(i%2?1:-1)*(.08+rand(s)*.1),life:900});
      if(t%156===90)ring(s,b.x,b.y,count(s,18),66,rand(s)*TAU,{color:6,size:1});
    }},
    {boss:1,name:'독기 포자',hp:780,time:55,fire:function(s,t){
      var b=s.boss,k;
      if(t%58===0)for(k=0;k<pick(s,1,1,2);k++)spawn(s,b.x,b.y,aim(s,b.x,b.y)+(rand(s)-.5)*1.3,74,{color:5,size:4,at:84+Math.floor(rand(s)*30),mode:MODE_SPLIT,arg:count(s,11),speed2:78});
      if(t%22===0)spawn(s,10+rand(s)*(W-20),-8,Math.PI/2,40+rand(s)*26,{color:6,size:0});
      if(t%116===58)fan(s,b.x,b.y,count(s,5),aim(s,b.x,b.y),.9,112,{color:4,size:1});
      if(s.difficulty==='hell'&&t%174===100)column(s,s.player.x,{width:22,warn:60,active:60,color:5});
    }},
    {boss:2,name:'화염 수레바퀴',hp:860,time:55,fire:function(s,t){
      var b=s.boss,arms=count(s,3),k;
      if(t%4===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.06+TAU*k/arms,102,{color:7,size:0,turn:.42});
      if(t%4===2)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.06+TAU*k/arms,102,{color:0,size:0,turn:-.42});
      if(t%84===0)ring(s,b.x,b.y,count(s,18),52,rand(s)*TAU,{color:6,size:2});
    }},
    {boss:2,name:'지옥불 격자',hp:820,time:55,fire:function(s,t){
      var b=s.boss,phase=t%210,rows=pick(s,2,3,3),columns=pick(s,2,3,4),both=s.difficulty==='hell';
      // 가로줄 → 세로줄이 번갈아 켜진다. 지옥에서는 한꺼번에 켜져 바둑판 칸 안에 갇힌다.
      if(phase===0||both&&phase===105)for(var k=0;k<rows;k++)row(s,236+k*(330/rows)+rand(s)*46,{width:20,warn:64,active:66,color:7});
      if(phase===105||both&&phase===0)slots(s,columns,W,10).forEach(function(x){column(s,x,{width:20,warn:64,active:66,color:0});});
      if(t%70===35)ring(s,b.x,b.y,count(s,16),64,rand(s)*TAU,{color:7,size:1});
      if(t%96===0)spawn(s,30+rand(s)*(W-60),-10,Math.PI/2,112,{color:6,size:2,at:60+Math.floor(rand(s)*30),mode:MODE_SPLIT,arg:count(s,8),speed2:82});
    }},
    {boss:2,name:'최후의 만다라',hp:1000,time:60,fire:function(s,t){
      var b=s.boss,arms=count(s,5),k,spokes=pick(s,2,3,4);
      // 보스를 축으로 도는 광선 바퀴. 바퀴살 사이에서 함께 돌아야 한다.
      if(t%400===0){var base=aim(s,b.x,b.y)+Math.PI/spokes,turn=(Math.floor(t/400)%2?-1:1)*pick(s,.15,.21,.3);for(k=0;k<spokes;k++)beam(s,b.x,b.y,base+TAU*k/spokes,{width:13,warn:76,active:270,color:0,spin:turn,follow:true});}
      if(t%8===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.031+TAU*k/arms,100,{color:0,size:1});
      if(t%8===4)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.027+TAU*k/arms,74,{color:7,size:0});
      if(t%150===75){var n=count(s,36),start=rand(s)*TAU;for(k=0;k<n;k++)spawn(s,b.x,b.y,start+TAU*k/n,190,{color:8,size:0,accel:-210,min:0,at:55,mode:MODE_TURN,arg:k%2?.9:-.9,speed2:96});}
    }}
  ];
  var BOSSES=[{name:'보라검천사',art:'violet'},{name:'늪지대 뿔악마',art:'horn'},{name:'발록',art:'balrog'}];

  function createRun(options){
    options=options||{};var difficulty=DIFFICULTY[options.difficulty]?options.difficulty:'normal',rules=DIFFICULTY[difficulty];
    var s={revision:39,difficulty:difficulty,rules:rules,seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'intro',stageTick:0,cardIndex:0,cardTick:0,
      player:{x:W/2,y:H-84,hp:rules.hp,maxHp:rules.hp,invulnerableUntil:0,r:rules.radius,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,index:0,name:BOSSES[0].name,art:BOSSES[0].art,hitTick:-99,leaving:false},
      n:0,dropped:0,peak:0,score:0,graze:0,hits:0,cleared:0,timeouts:0,events:[],cancelled:[],lasers:[],warned:false,sn:0};
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
  // 화면의 탄과 광선을 모두 지우고, 지운 탄 자리를 연출용으로 남긴다(최대 320개). 지운 탄 수를 돌려준다.
  function cancelAll(s){
    var n=s.n;for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bcolor[i]);
    s.n=0;s.lasers.length=0;return n;
  }
  function setBoss(s,index){var b=s.boss;b.index=index;b.name=BOSSES[index].name;b.art=BOSSES[index].art;}
  function beginCard(s){
    var card=CARDS[s.cardIndex],boss=s.boss;setBoss(s,card.boss);
    boss.maxHp=boss.hp=card.hp;s.stage='card';s.stageTick=0;s.cardTick=0;note(s,'card');
  }
  function endCard(s,defeated){
    var card=CARDS[s.cardIndex],left=Math.max(0,card.time-s.cardTick*TICK),wiped=cancelAll(s),p=s.player;
    if(defeated){s.cleared++;s.score+=Math.round(left)*500+wiped*30;}else s.timeouts++;
    s.score+=wiped*10;
    if(s.cardIndex===CARDS.length-1){s.stage='won';s.stageTick=0;note(s,'win');return;}
    var next=CARDS[s.cardIndex+1];s.cardIndex++;s.stage='break';s.stageTick=0;note(s,'break');
    if(next.boss!==card.boss){s.boss.leaving=true;if(p.hp<p.maxHp){p.hp=Math.min(p.maxHp,p.hp+s.rules.extend);note(s,'extend');}}
  }
  function moveBoss(s){
    var b=s.boss;
    if(s.stage==='card'&&s.cardTick%150===0){b.targetX=96+rand(s)*(W-192);b.targetY=112+rand(s)*52;}
    if(b.leaving){b.y-=5;if(b.y<-70){b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=132;setBoss(s,CARDS[s.cardIndex].boss);note(s,'entrance');}return;}
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
  // 광선을 한 틱 진행하고, 켜져 있는 광선이 영웅에게 닿았는지 돌려준다.
  function updateLasers(s){
    var p=s.player,struck=false,fired=false,grazed=0,i;
    for(i=s.lasers.length-1;i>=0;i--){
      var l=s.lasers[i];l.age++;
      if(l.follow){l.x=s.boss.x;l.y=s.boss.y;}
      if(l.spin&&l.age>l.warn)l.angle+=l.spin*TICK;
      if(l.age>l.warn+l.active+BEAM_FADE){s.lasers.splice(i,1);continue;}
      var cos=Math.cos(l.angle),sin=Math.sin(l.angle);
      if(l.age===l.warn){
        fired=true;
        // 참격: 켜지는 순간 선을 따라 쌀알탄이 양옆으로 흩어진다.
        if(l.burst)for(var d=70;d<620;d+=Math.round(64/s.rules.density)){var bx=l.x+cos*d,by=l.y+sin*d;if(bx<-10||bx>W+10||by>H+10)break;spawn(s,bx,by,l.angle+Math.PI/2,34,{color:2,size:3});spawn(s,bx,by,l.angle-Math.PI/2,34,{color:2,size:3});}
      }
      if(l.age<l.warn||l.age>=l.warn+l.active)continue;
      var px=p.x-l.x,py=p.y-l.y,along=px*cos+py*sin,dist=along<0?Math.sqrt(px*px+py*py):Math.abs(px*sin-py*cos);
      if(along>BEAM_LENGTH)continue;
      if(dist<l.width*.5*BEAM_HIT+p.r)struck=true;
      else if(!l.grazed&&dist<l.width*.5+GRAZE_MARGIN){l.grazed=true;grazed++;}
    }
    if(!s.lasers.length)s.warned=false;
    if(fired)note(s,'laserFire');
    if(grazed){s.graze+=grazed;s.score+=grazed*40;note(s,'graze');}
    return struck;
  }
  function updateBullets(s){
    var p=s.player,px=p.x,py=p.y,struck=false,grazed=0,hitScale=s.rules.hitScale,i;
    for(i=s.n-1;i>=0;i--){
      var age=++s.bage[i];
      if(s.bat[i]&&age===s.bat[i]){
        if(s.bmode[i]===MODE_SPLIT){var sx=s.bx[i],sy=s.by[i],color=s.bcolor[i],parts=Math.round(s.barg[i]),speed=s.bs2[i]/s.rules.speed,turn=s.ba[i];removeBullet(s,i);ring(s,sx,sy,parts,speed,turn,{color:color,size:0});note(s,'pop');continue;}
        if(s.bmode[i]===MODE_REAIM)s.ba[i]=Math.atan2(py-s.by[i],px-s.bx[i])+s.barg[i];else if(s.bmode[i]===MODE_TURN)s.ba[i]+=s.barg[i];
        s.bs[i]=s.bs2[i];s.bacc[i]=0;
      }
      if(s.bturn[i])s.ba[i]+=s.bturn[i]*TICK;
      if(s.bacc[i]){var v=s.bs[i]+s.bacc[i]*TICK;s.bs[i]=v<s.bmin[i]?s.bmin[i]:v>s.bmax[i]?s.bmax[i]:v;}
      var x=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK,y=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK;
      if(x<-24||x>W+24||y<-40||y>H+24||age>=s.blife[i]){removeBullet(s,i);continue;}
      if(age<BLOOM_TICKS)continue; // 갓 피어난 탄은 아직 닿지 않는다
      var dx=x-px,dy=y-py,radius=SIZE_RADIUS[s.bsize[i]],d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN;
      if(d2>reach*reach)continue;
      var hitReach=radius*hitScale+p.r;
      if(d2<hitReach*hitReach)struck=true;
      else if(!s.bgrazed[i]){s.bgrazed[i]=1;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.score+=grazed*20;note(s,'graze');}
    return struck;
  }
  /* 한 틱(1/60초) 진행. input: {dx,dy,focus} — dx,dy는 이번 틱에 움직일 픽셀. */
  function step(s,input){
    if(s.stage==='won'||s.stage==='lost'){s.stageTick++;return s;}
    s.tick++;s.stageTick++;movePlayer(s,input);moveBoss(s);
    if(s.stage==='intro'){if(s.stageTick===1)note(s,'entrance');if(s.stageTick>=INTRO_TICKS)beginCard(s);}
    else if(s.stage==='break'){if(s.stageTick>=BREAK_TICKS&&!s.boss.leaving)beginCard(s);}
    else if(s.stage==='card'){
      var card=CARDS[s.cardIndex],t=s.cardTick++;
      if(t>=FIRE_DELAY)card.fire(s,t-FIRE_DELAY); // 카드 이름이 뜨는 동안은 쏘지 않는다
      var left=card.time-s.cardTick*TICK;
      if(left<=10&&left>0&&s.cardTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    updateShots(s);
    if(s.stage==='card'&&s.boss.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&s.cardTick*TICK>=CARDS[s.cardIndex].time)endCard(s,false);
    var p=s.player,byBeam=updateLasers(s),byBullet=updateBullets(s);
    if((byBeam||byBullet)&&s.tick>=p.invulnerableUntil&&s.stage!=='won'){
      p.hp--;s.hits++;p.invulnerableUntil=s.tick+INVULN_TICKS;cancelAll(s);note(s,'hurt');
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}
    }
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function timeLeft(s){return s.stage==='card'?Math.max(0,CARDS[s.cardIndex].time-s.cardTick*TICK):0;}
  var api={revision:39,WIDTH:W,HEIGHT:H,CAP:CAP,LASER_CAP:LASER_CAP,CARDS:CARDS,BOSSES:BOSSES,DIFFICULTY:DIFFICULTY,SIZE_RADIUS:SIZE_RADIUS,BLOOM_TICKS:BLOOM_TICKS,BEAM_FADE:BEAM_FADE,createRun:createRun,step:step,timeLeft:timeLeft};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);
