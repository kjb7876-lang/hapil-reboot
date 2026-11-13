/* 합일 v40 · ARCADE 탄막 모드 — 전투 시뮬레이션.
 * 스토리 전투(core.js, 규칙31)와 완전히 분리된 독립 엔진이다. 60Hz 고정 틱·시드 난수로 결정적으로 돈다.
 * 세 개의 맵이 각각 [일반 몹 구간 → 중간 보스 → 보스 스펠 3개]로 이어진다.
 * 화면 그리기와 소리는 arcade-app-v38.js가 맡고 이 파일은 DOM을 쓰지 않는다. */
(function(root){
  'use strict';
  var W=360,H=640,CAP=1400,LASER_CAP=24,MOB_CAP=28,TICK=1/60,TAU=Math.PI*2;
  var GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5)); // 137.5°. 해바라기 씨앗이 겹치지 않고 차오르는 각도
  /* 난이도. density 탄 수 배율 · speed 탄 속도 배율 · hp 목숨 · mapHeal 다음 맵에서 회복(-1은 전부) ·
   * radius 영웅 피격점 반지름 · hitScale 탄의 보이는 반지름 중 실제로 닿는 비율 · warn 광선 예고 시간 배율 · beam 광선 굵기 배율 */
  var DIFFICULTY={
    gentle:{density:.7,speed:.66,hp:7,mapHeal:-1,radius:1.4,hitScale:.36,warn:1.6,beam:.72,label:'여유'},
    normal:{density:1,speed:.82,hp:3,mapHeal:1,radius:2,hitScale:.46,warn:1.2,beam:.88,label:'기본'},
    hell:{density:1.8,speed:1.08,hp:1,mapHeal:0,radius:2.4,hitScale:.5,warn:1,beam:1,label:'지옥'}
  };
  var GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=100,FIRE_DELAY=40,WAVE_GRACE=420;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=96,MAX_MOVE=12,FOCUS_MOVE=2;
  var BEAM_HIT=.62,BEAM_FADE=14,BEAM_LENGTH=1000;
  // 색 번호: 0 빨강 1 자홍 2 보라 3 파랑 4 청록 5 초록 6 노랑 7 주황 8 흰색
  // 모양 번호: 0 작은 구슬(4) 1 중간(6) 2 큰 구슬(10) 3 쌀알탄(3.2) 4 거품(15) 5 큰 기물(무기·비석, 색 번호 자리에 기물 번호)
  var SIZE_RADIUS=[4,6,10,3.2,15,14],SHAPE_PROP=5;
  // 기물 번호: 0 보라검 1 식칼 2 화염검 3 비석 4 신경 첨탑 5 우두머리 쌍검 6 시간 초승달
  var PROP_RADIUS=[12,14,14,17,18,13,14];
  // 탄 변화 방식: 1 영웅을 다시 조준 2 각도 꺾기 3 터져서 고리로 4 가지치기(프랙탈)
  var MODE_REAIM=1,MODE_TURN=2,MODE_SPLIT=3,MODE_BRANCH=4;

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*s.rules.density));}
  function pick(s,gentle,normal,hell){return s.difficulty==='gentle'?gentle:s.difficulty==='hell'?hell:normal;}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  function note(s,name){if(s.events.length<48)s.events.push(name);}
  /* 탄 하나. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode,arg,speed2,life,gen(가지치기 남은 횟수),spin(기물이 도는 속도, 틱당 라디안)} */
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=CAP){s.dropped++;return;}
    o=o||{};var i=s.n++;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*s.rules.speed;
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*s.rules.speed;s.bgen[i]=o.gen||0;s.bspin[i]=o.spin||0;
    s.bage[i]=0;s.blife[i]=o.life||720;s.bsize[i]=o.size||0;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;
  }
  function ring(s,x,y,n,speed,offset,o){for(var i=0;i<n;i++)spawn(s,x,y,offset+TAU*i/n,speed,o);}
  function fan(s,x,y,n,center,spread,speed,o){for(var i=0;i<n;i++)spawn(s,x,y,center+(n>1?(i/(n-1)-.5)*spread:0),speed,o);}
  // 가우스 종곡선: 부채꼴 가운데가 가장 빠르고 가장자리로 갈수록 정규분포 곡선을 따라 느려져, 탄막 앞줄이 종 모양이 된다.
  function bell(s,x,y,n,center,spread,speed,sigma,o){
    for(var i=0;i<n;i++){var u=n>1?i/(n-1)*2-1:0;spawn(s,x,y,center+u*spread/2,speed*(.5+.8*Math.exp(-u*u/(2*sigma*sigma))),o);}
  }

  /* ── 기하 도형. 원점 기준 단위 좌표의 점 묶음으로 만든다. 각 탄을 "원점에서 그 점 방향으로,
   *    거리에 비례한 속도"로 쏘면 도형이 모양을 유지한 채 커진다. ── */
  var shapeCache={};
  function cached(key,build){if(!shapeCache[key]){var pts=build(),max=0,out=[],i;for(i=0;i<pts.length;i+=2)max=Math.max(max,Math.sqrt(pts[i]*pts[i]+pts[i+1]*pts[i+1]));for(i=0;i<pts.length;i+=2){var x=pts[i]/max,y=pts[i+1]/max;if(x*x+y*y>=.0144)out.push(x,y);}shapeCache[key]=out;}return shapeCache[key];}
  function outline(vertices,perSide){var out=[],n=vertices.length/2;for(var k=0;k<n;k++){var x1=vertices[k*2],y1=vertices[k*2+1],x2=vertices[(k+1)%n*2],y2=vertices[(k+1)%n*2+1];for(var j=0;j<perSide;j++)out.push(x1+(x2-x1)*j/perSide,y1+(y2-y1)*j/perSide);}return out;}
  function corners(n,radius,turn){var v=[];for(var k=0;k<n;k++){var a=TAU*k/n-Math.PI/2+(turn||0);v.push(Math.cos(a)*radius,Math.sin(a)*radius);}return v;}
  var Shapes={
    // 정다각형
    polygon:function(n,perSide){return cached('p'+n+'/'+perSide,function(){return outline(corners(n,1),perSide);});},
    // 별: 바깥 꼭짓점과 안쪽 꼭짓점을 번갈아 이은 2n각형
    star:function(n,inner,perSide){return cached('s'+n+'/'+inner+'/'+perSide,function(){var v=[],o=corners(n,1),i=corners(n,inner,Math.PI/n);for(var k=0;k<n;k++)v.push(o[k*2],o[k*2+1],i[k*2],i[k*2+1]);return outline(v,perSide);});},
    // 장미 곡선 r = 0.3 + 0.7·cos²(kθ/2): 꽃잎 k장
    rose:function(k,points){return cached('r'+k+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var a=TAU*i/points,c=Math.cos(k*a/2),r=.3+.7*c*c;out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});},
    // 코흐 눈송이: 정삼각형의 각 변 가운데 1/3을 바깥 삼각형으로 바꾸기를 depth번 반복
    koch:function(depth){return cached('k'+depth,function(){var v=corners(3,1);for(var d=0;d<depth;d++){var next=[],n=v.length/2;for(var k=0;k<n;k++){var x1=v[k*2],y1=v[k*2+1],x2=v[(k+1)%n*2],y2=v[(k+1)%n*2+1],dx=(x2-x1)/3,dy=(y2-y1)/3;next.push(x1,y1,x1+dx,y1+dy,x1+dx*1.5+dy*.8660254,y1+dy*1.5-dx*.8660254,x1+dx*2,y1+dy*2);}v=next;}return v;});},
    // 시에르핀스키 삼각형: 가운데 삼각형을 비우기를 depth번 반복한 뒤 남은 작은 삼각형들의 꼭짓점
    sierpinski:function(depth){return cached('t'+depth,function(){var seen={},out=[];(function cut(ax,ay,bx,by,cx,cy,d){if(!d){[[ax,ay],[bx,by],[cx,cy]].forEach(function(p){var key=Math.round(p[0]*1000)+','+Math.round(p[1]*1000);if(!seen[key]){seen[key]=1;out.push(p[0],p[1]);}});return;}var abx=(ax+bx)/2,aby=(ay+by)/2,bcx=(bx+cx)/2,bcy=(by+cy)/2,cax=(cx+ax)/2,cay=(cy+ay)/2;cut(ax,ay,abx,aby,cax,cay,d-1);cut(abx,aby,bx,by,bcx,bcy,d-1);cut(cax,cay,bcx,bcy,cx,cy,d-1);})(0,-1,.8660254,.5,-.8660254,.5,depth);return out;});},
    // 비트루비우스: 원과 그 안의 정사각형(다빈치의 인체 비례도)
    vitruvian:function(points){return cached('v'+points,function(){return outline(corners(points,1),1).concat(outline(corners(4,.9,Math.PI/4),Math.max(2,Math.round(points/5))));});},
    // 황금 나선: 90°마다 반지름이 황금비만큼 커지는 로그 나선
    goldenSpiral:function(points){return cached('g'+points,function(){var out=[],phi=(1+Math.sqrt(5))/2;for(var i=0;i<points;i++){var a=i*6.9/Math.max(1,points-1),r=Math.pow(phi,a/(Math.PI/2));out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});}
  };
  function shape(s,x,y,points,speed,turn,o){
    var cos=Math.cos(turn),sin=Math.sin(turn);
    for(var i=0;i<points.length;i+=2){var px=points[i]*cos-points[i+1]*sin,py=points[i]*sin+points[i+1]*cos;spawn(s,x,y,Math.atan2(py,px),speed*Math.sqrt(px*px+py*py),o);}
  }

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

  /* ── 일반 몹. elite는 내려와 자리를 잡고 도형 탄막을 쏘는 중간 몹. ── */
  var MOBS={
    spider:{hp:5,r:14,score:300},goblin:{hp:7,r:14,score:300},drone:{hp:6,r:13,score:300},
    guardian:{hp:70,r:20,score:3000,elite:true},warden:{hp:90,r:22,score:4000,elite:true},wraith:{hp:110,r:22,score:5000,elite:true}
  };
  var MOB_FIRE={
    aim:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.3,104,{color:m.color,size:3});},
    drop:function(s,m){spawn(s,m.x,m.y,Math.PI/2,84,{color:m.color,size:0});},
    ring:function(s,m){ring(s,m.x,m.y,count(s,8),70,aim(s,m.x,m.y),{color:m.color,size:0});},
    hexagon:function(s,m){shape(s,m.x,m.y,Shapes.polygon(6,Math.max(2,count(s,3))),84,m.shots*.26,{color:m.color,size:0});},
    star:function(s,m){shape(s,m.x,m.y,Shapes.star(5,.42,Math.max(2,count(s,2))),88,m.shots*.31,{color:m.color,size:0});},
    bell:function(s,m){bell(s,m.x,m.y,count(s,11),aim(s,m.x,m.y),1.5,110,.42,{color:m.color,size:1});},
    rose:function(s,m){shape(s,m.x,m.y,Shapes.rose(4,count(s,28)),90,m.shots*.4,{color:m.color,size:0});},
    triangle:function(s,m){shape(s,m.x,m.y,Shapes.sierpinski(2),86,m.shots*.5,{color:m.color,size:0});}
  };
  /* 몹 하나. o: {vx,vy,sway,swayRate,fire,first,every,color,stopY,hold} */
  function mob(s,kind,x,y,o){
    if(s.mobs.length>=MOB_CAP)return;
    var spec=MOBS[kind];o=o||{};
    s.mobs.push({kind:kind,elite:!!spec.elite,x:x,y:y,baseX:x,vx:o.vx||0,vy:o.vy===undefined?1.6:o.vy,sway:o.sway||0,swayRate:o.swayRate||.05,hp:spec.hp,r:spec.r,score:spec.score,
      fire:o.fire||'aim',first:o.first||40,every:o.every||0,color:o.color||0,stopY:o.stopY||120,hold:o.hold||360,age:0,shots:0,hitTick:-99});
  }

  /* ── 구간 대본. 맵마다 일반 몹 구간 → 중간 보스 → 보스 스펠 3개. fire(s,t)는 발사 시작 뒤 t틱째에 불린다. ──
   *   보라검천사 — 보라·자홍, 실(대각선 광선 그물·육각 거미줄)과 검(조준 참격·날아오는 보라검)
   *   늪지대 뿔악마 — 초록·노랑, 세로 기둥 뒤에 떨어지는 비석, 가지를 치며 갈라지는 독 포자
   *   발록 — 빨강·주황, 가로세로 불길 격자, 회전 광선 바퀴, 도는 화염검 */
  var STAGES=[{name:'검은 정원',bg:'forest'},{name:'거미동굴 늪',bg:'cave'},{name:'지옥의 폐허',bg:'ruins'}];
  var ACTORS=[{name:'보라검천사',art:'violet'},{name:'늪지대 뿔악마',art:'horn'},{name:'발록',art:'balrog'},
    {name:'타락천사 기사',art:'knight',mid:true},{name:'악몽의 우두머리',art:'chief',mid:true},{name:'파란불 집행체',art:'executor',mid:true}];
  var SEGMENTS=[
    {kind:'wave',stage:0,duration:1080,script:function(s,t){
      // 황금각 순서로 자리를 옮겨 가며 내려오는 거미 떼 → 육각 거미줄을 쏘는 수문장 둘 → 양옆에서 휘어 들어오는 거미
      if(t<300&&t%24===0){var i=t/24;mob(s,'spider',180+150*Math.sin(i*GOLDEN_ANGLE),-20,{vy:1.7,sway:.6,fire:'aim',first:46,color:2});}
      if(t===380){mob(s,'guardian',100,-30,{stopY:118,fire:'hexagon',first:30,every:74,hold:330,color:2});mob(s,'guardian',260,-30,{stopY:118,fire:'hexagon',first:66,every:74,hold:330,color:1});}
      if(t>=520&&t<860&&t%30===0){var left=(t/30)%2===0;mob(s,'spider',left?-16:W+16,60+rand(s)*90,{vx:left?2:-2,vy:.75,fire:'drop',first:34,every:52,color:1});}
    }},
    {kind:'card',stage:0,actor:3,name:'오망성의 서약',hp:520,time:40,fire:function(s,t){
      var b=s.boss;
      if(t%58===0)shape(s,b.x,b.y,Shapes.star(5,.4,Math.max(2,count(s,4))),92,t*.011,{color:(t/58)%2?1:8,size:0});
      if(t%96===48)fan(s,b.x,b.y,pick(s,1,3,5),aim(s,b.x,b.y),.9,142,{size:SHAPE_PROP,color:0});
      if(s.difficulty==='hell'&&t%58===29)shape(s,b.x,b.y,Shapes.polygon(5,6),70,-t*.011,{color:2,size:0});
    }},
    {kind:'card',stage:0,actor:0,name:'황금각의 실',hp:680,time:45,fire:function(s,t){
      // 피보나치 잎차례: 한 발마다 황금각(137.5°)씩 돌려 쏘면 해바라기 씨앗 같은 나선 팔이 저절로 생긴다.
      var b=s.boss,every=pick(s,3,2,1);
      if(t%every===0){var i=t/every;spawn(s,b.x,b.y,i*GOLDEN_ANGLE,80,{color:i%13===0?8:2,size:i%13===0?1:0});}
      if(t%every===0&&t%2===0)spawn(s,b.x,b.y,-(t/every)*GOLDEN_ANGLE,58,{color:1,size:0});
      if(t%110===70)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,128,{color:8,size:3});
    }},
    {kind:'card',stage:0,actor:0,name:'거미줄 결계',hp:700,time:50,fire:function(s,t){
      var b=s.boss,n=pick(s,2,3,4),tilt=.95,k,phase=t%190;
      if(phase===0)for(k=0;k<n;k++)beam(s,-12,-150+k*(520/n)+rand(s)*50,tilt,{width:13,warn:62,active:78,color:2});
      if(phase===95)for(k=0;k<n;k++)beam(s,W+12,-150+k*(520/n)+rand(s)*50,Math.PI-tilt,{width:13,warn:62,active:78,color:1});
      if(t%52===20)shape(s,b.x,b.y,Shapes.polygon(6,Math.max(2,count(s,4))),70,t*.009,{color:2,size:1});
      if(s.difficulty==='hell'&&t%6===0)for(k=0;k<2;k++)spawn(s,b.x,b.y,t*.07+Math.PI*k,88,{color:1,size:0});
    }},
    {kind:'card',stage:0,actor:0,name:'보라검 난무',hp:720,time:50,fire:function(s,t){
      var b=s.boss,cuts=pick(s,1,2,3),k;
      if(t%104===0){var center=aim(s,b.x,b.y);for(k=0;k<cuts;k++)beam(s,b.x,b.y,center+(cuts>1?(k/(cuts-1)-.5)*.8:0),{width:15,warn:44,active:20,color:1,burst:true});}
      if(t%104===60)ring(s,b.x,b.y,pick(s,3,5,8),96,rand(s)*TAU,{size:SHAPE_PROP,color:0,spin:.16});
      if(t%52===26)fan(s,b.x,b.y,count(s,7),aim(s,b.x,b.y),1.25,118,{color:2,size:3});
    }},
    {kind:'wave',stage:1,duration:1140,script:function(s,t){
      // 줄지어 가로지르며 아래로 떨구는 고블린 → 가우스 종곡선을 쏘는 감시자 → 별을 쏘는 감시자와 고블린 돌격
      if(t<330&&t%22===0){var fromLeft=Math.floor(t/110)%2===0;mob(s,'goblin',fromLeft?-16:W+16,70+Math.floor(t/110)*34,{vx:fromLeft?2.1:-2.1,vy:.12,fire:'drop',first:30,every:44,color:5});}
      if(t===400)mob(s,'warden',180,-30,{stopY:110,fire:'bell',first:36,every:80,hold:330,color:6});
      if(t===640){mob(s,'warden',90,-30,{stopY:124,fire:'star',first:30,every:84,hold:300,color:5});mob(s,'warden',270,-30,{stopY:124,fire:'star',first:72,every:84,hold:300,color:6});}
      if(t>=700&&t<940&&t%26===0)mob(s,'goblin',40+rand(s)*280,-20,{vy:2,sway:.8,swayRate:.07,fire:'aim',first:40,color:6});
    }},
    {kind:'card',stage:1,actor:4,name:'악몽의 쌍검',hp:560,time:40,fire:function(s,t){
      var b=s.boss;
      if(t%84===0)ring(s,b.x,b.y,pick(s,4,6,9),88,rand(s)*TAU,{size:SHAPE_PROP,color:5,spin:.2});
      if(t%84===42)bell(s,b.x,b.y,count(s,15),aim(s,b.x,b.y),2,124,.4,{color:8,size:0});
      if(t%168===110)bell(s,b.x,b.y,count(s,15),aim(s,b.x,b.y)+Math.PI,2.6,96,.5,{color:4,size:1,at:50,mode:MODE_REAIM,speed2:96});
    }},
    {kind:'card',stage:1,actor:1,name:'늪의 파문',hp:760,time:50,fire:function(s,t){
      var b=s.boss;
      if(t%72===0){var n=count(s,34),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,168,{color:5,size:0,accel:-170,min:0,at:62,mode:MODE_REAIM,arg:(i%3-1)*.2,speed2:104});}
      if(t%72===36)bell(s,b.x,b.y,count(s,13),aim(s,b.x,b.y),1.9,104,.45,{color:6,size:1});
      if(t%14===0)spawn(s,20+rand(s)*(W-40),-8,Math.PI/2+(rand(s)-.5)*.3,46+rand(s)*30,{color:4,size:0});
    }},
    {kind:'card',stage:1,actor:1,name:'썩은 비의 기둥',hp:740,time:50,fire:function(s,t){
      var b=s.boss,i,phase=t%200;
      if(phase===0){
        // 첫 기둥은 영웅 머리 위에 떨어져 자리를 옮기게 하고, 나머지는 칸마다 하나씩 선다.
        s.marks=[s.player.x];column(s,s.player.x,{width:26,warn:66,active:70,color:5});
        slots(s,pick(s,1,2,4),W,14).forEach(function(x){if(Math.abs(x-s.player.x)>44){s.marks.push(x);column(s,x,{width:22,warn:66,active:70,color:5});}});
      }
      // 기둥이 꺼진 자리로 비석이 천천히 돌며 떨어진다.
      if(phase===Math.round(66*s.rules.warn)+74&&s.marks)s.marks.forEach(function(x,k){spawn(s,x,-30,Math.PI/2,118,{size:SHAPE_PROP,color:3,spin:(k%2?-1:1)*.035,life:900});});
      if(t%10===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,60+rand(s)*48,{color:rand(s)<.5?5:4,size:0,turn:(i%2?1:-1)*(.08+rand(s)*.1),life:900});
      if(phase===100)ring(s,b.x,b.y,count(s,16),66,rand(s)*TAU,{color:6,size:1});
    }},
    {kind:'card',stage:1,actor:1,name:'독기 포자 · 가지치기',hp:780,time:55,fire:function(s,t){
      var b=s.boss,k;
      // 프랙탈 가지: 한 알이 셋으로, 그 셋이 다시 셋으로 갈라진다(1 → 3 → 9 → 27).
      if(t%96===0)for(k=0;k<pick(s,1,2,3);k++)spawn(s,b.x,b.y,aim(s,b.x,b.y)+(k-(pick(s,1,2,3)-1)/2)*.9,96,{color:5,size:2,at:36,mode:MODE_BRANCH,arg:3,gen:pick(s,2,3,3),speed2:96});
      if(t%64===32)spawn(s,b.x,b.y,aim(s,b.x,b.y)+(rand(s)-.5)*1.3,74,{color:6,size:4,at:84+Math.floor(rand(s)*30),mode:MODE_SPLIT,arg:count(s,11),speed2:78});
      if(t%24===0)spawn(s,10+rand(s)*(W-20),-8,Math.PI/2,40+rand(s)*26,{color:4,size:0});
      if(s.difficulty==='hell'&&t%174===100)column(s,s.player.x,{width:22,warn:60,active:60,color:5});
    }},
    {kind:'wave',stage:2,duration:1200,script:function(s,t){
      // 사인 곡선으로 내리꽂는 박쥐 떼 → 장미 곡선을 쏘는 망령 → 시에르핀스키 삼각형을 쏘는 망령 둘 + 고리를 뿌리는 박쥐
      if(t<360&&t%18===0){var i=t/18;mob(s,'drone',i%2?70:290,-20,{vy:2.3,sway:2.6,swayRate:.085,fire:'aim',first:36,color:7});}
      if(t===420)mob(s,'wraith',180,-30,{stopY:112,fire:'rose',first:34,every:78,hold:340,color:0});
      if(t===700){mob(s,'wraith',92,-30,{stopY:126,fire:'triangle',first:30,every:82,hold:320,color:7});mob(s,'wraith',268,-30,{stopY:126,fire:'triangle',first:70,every:82,hold:320,color:6});}
      if(t>=740&&t<1000&&t%34===0)mob(s,'drone',30+rand(s)*300,-20,{vy:1.5,sway:1.2,fire:'ring',first:44,color:0});
    }},
    {kind:'card',stage:2,actor:5,name:'시간의 장미',hp:600,time:40,fire:function(s,t){
      var b=s.boss;
      if(t%60===0)shape(s,b.x,b.y,Shapes.rose((t/60)%2?5:4,count(s,34)),96,t*.007,{color:(t/60)%2?3:4,size:0});
      if(t%90===45)fan(s,b.x,b.y,pick(s,2,3,5),aim(s,b.x,b.y),1.4,104,{size:SHAPE_PROP,color:6,spin:.12,turn:.3});
      if(t%180===120)slots(s,pick(s,1,2,3),W,20).forEach(function(x){spawn(s,x,-30,Math.PI/2,104,{size:SHAPE_PROP,color:4,spin:.02,life:900});});
    }},
    {kind:'card',stage:2,actor:2,name:'화염 수레바퀴',hp:860,time:55,fire:function(s,t){
      var b=s.boss,arms=count(s,3),k;
      if(t%4===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.06+TAU*k/arms,102,{color:7,size:0,turn:.42});
      if(t%4===2)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.06+TAU*k/arms,102,{color:0,size:0,turn:-.42});
      if(t%110===0)ring(s,b.x,b.y,pick(s,2,3,5),84,aim(s,b.x,b.y),{size:SHAPE_PROP,color:2,spin:.22,turn:.25});
    }},
    {kind:'card',stage:2,actor:2,name:'지옥불 격자',hp:820,time:55,fire:function(s,t){
      var b=s.boss,phase=t%210,rows=pick(s,2,3,3),columns=pick(s,2,3,4),both=s.difficulty==='hell';
      // 가로줄 → 세로줄이 번갈아 켜진다. 지옥에서는 한꺼번에 켜져 바둑판 칸 안에 갇힌다.
      if(phase===0||both&&phase===105)for(var k=0;k<rows;k++)row(s,236+k*(330/rows)+rand(s)*46,{width:20,warn:64,active:66,color:7});
      if(phase===105||both&&phase===0)slots(s,columns,W,10).forEach(function(x){column(s,x,{width:20,warn:64,active:66,color:0});});
      if(t%70===35)shape(s,b.x,b.y,Shapes.vitruvian(count(s,16)),70,t*.01,{color:7,size:1});
      if(t%96===0)spawn(s,30+rand(s)*(W-60),-10,Math.PI/2,112,{color:6,size:2,at:60+Math.floor(rand(s)*30),mode:MODE_SPLIT,arg:count(s,8),speed2:82});
    }},
    {kind:'card',stage:2,actor:2,name:'최후의 만다라',hp:1000,time:60,fire:function(s,t){
      var b=s.boss,arms=count(s,4),k,spokes=pick(s,2,3,4);
      // 보스를 축으로 도는 광선 바퀴 사이로 코흐 눈송이와 황금 나선이 번갈아 피어난다.
      if(t%400===0){var base=aim(s,b.x,b.y)+Math.PI/spokes,turn=(Math.floor(t/400)%2?-1:1)*pick(s,.15,.21,.3);for(k=0;k<spokes;k++)beam(s,b.x,b.y,base+TAU*k/spokes,{width:13,warn:76,active:270,color:0,spin:turn,follow:true});}
      if(t%10===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.031+TAU*k/arms,96,{color:0,size:0});
      if(t%120===30)shape(s,b.x,b.y,Shapes.koch(pick(s,1,2,2)),104,t*.004,{color:8,size:0});
      if(t%120===90)for(k=0;k<pick(s,2,3,4);k++)shape(s,b.x,b.y,Shapes.goldenSpiral(count(s,13)),118,TAU*k/pick(s,2,3,4)+t*.01,{color:7,size:1});
    }}
  ];
  var CARD_TOTAL=SEGMENTS.filter(function(g){return g.kind==='card';}).length;

  function createRun(options){
    options=options||{};var difficulty=DIFFICULTY[options.difficulty]?options.difficulty:'normal',rules=DIFFICULTY[difficulty];
    var s={revision:40,difficulty:difficulty,rules:rules,seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'break',stageTick:BREAK_TICKS-30,
      seg:-1,segTick:0,stageIndex:0,cardNumber:0,
      player:{x:W/2,y:H-84,hp:rules.hp,maxHp:rules.hp,invulnerableUntil:0,r:rules.radius,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,actor:-1,name:'',art:'',mid:false,hitTick:-99,leaving:false,present:false},
      n:0,dropped:0,peak:0,score:0,graze:0,hits:0,kills:0,cleared:0,timeouts:0,events:[],cancelled:[],pops:[],lasers:[],mobs:[],marks:null,warned:false,sn:0};
    ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin'].forEach(function(k){s[k]=new Float32Array(CAP);});
    ['bage','blife','bat'].forEach(function(k){s[k]=new Uint16Array(CAP);});
    ['bsize','bcolor','bgrazed','bmode','bgen'].forEach(function(k){s[k]=new Uint8Array(CAP);});
    s.sx=new Float32Array(SHOT_CAP);s.sy=new Float32Array(SHOT_CAP);s.shoming=new Uint8Array(SHOT_CAP);
    return s;
  }
  function removeBullet(s,i){
    var j=--s.n;if(i===j)return;
    s.bx[i]=s.bx[j];s.by[i]=s.by[j];s.ba[i]=s.ba[j];s.bs[i]=s.bs[j];s.bturn[i]=s.bturn[j];s.bacc[i]=s.bacc[j];s.bmin[i]=s.bmin[j];s.bmax[i]=s.bmax[j];s.barg[i]=s.barg[j];s.bs2[i]=s.bs2[j];s.bspin[i]=s.bspin[j];
    s.bage[i]=s.bage[j];s.blife[i]=s.blife[j];s.bat[i]=s.bat[j];s.bsize[i]=s.bsize[j];s.bcolor[i]=s.bcolor[j];s.bgrazed[i]=s.bgrazed[j];s.bmode[i]=s.bmode[j];s.bgen[i]=s.bgen[j];
  }
  // 화면의 탄과 광선을 모두 지우고, 지운 탄 자리를 연출용으로 남긴다(최대 320개). 지운 탄 수를 돌려준다.
  function cancelAll(s){
    var n=s.n;for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bsize[i]===SHAPE_PROP?8:s.bcolor[i]);
    s.n=0;s.lasers.length=0;s.marks=null;return n;
  }
  function segment(s){return SEGMENTS[s.seg];}
  /* 다음 구간으로. 맵이 바뀌면 난이도 규칙대로 목숨을 채우고, 주인공이 바뀌면 이전 보스를 내보낸다. */
  function advance(s){
    var prev=segment(s),next=SEGMENTS[s.seg+1],p=s.player;
    if(!next){s.stage='won';s.stageTick=0;note(s,'win');return;}
    s.seg++;s.segTick=0;s.stageTick=0;
    if(next.stage!==s.stageIndex){s.stageIndex=next.stage;var heal=s.rules.mapHeal;if(heal&&p.hp<p.maxHp){p.hp=heal<0?p.maxHp:Math.min(p.maxHp,p.hp+heal);note(s,'extend');}note(s,'map');}
    if(next.kind==='wave'){s.boss.leaving=s.boss.present;s.stage='wave';note(s,'wave');return;}
    if(!prev||prev.kind!=='card'||prev.actor!==next.actor){s.boss.leaving=s.boss.present;s.stage='intro';}else s.stage='break';
  }
  function enter(s,actor){var b=s.boss,who=ACTORS[actor];b.actor=actor;b.name=who.name;b.art=who.art;b.mid=!!who.mid;b.present=true;b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=132;s.stageTick=0;note(s,'entrance');}
  function beginCard(s){var card=segment(s),b=s.boss;b.maxHp=b.hp=card.hp;s.stage='card';s.stageTick=0;s.segTick=0;s.cardNumber++;note(s,'card');}
  function endCard(s,defeated){
    var card=segment(s),left=Math.max(0,card.time-s.segTick*TICK),wiped=cancelAll(s);
    if(defeated){s.cleared++;s.score+=Math.round(left)*500+wiped*30;}else s.timeouts++;
    s.score+=wiped*10;note(s,'break');advance(s);
  }
  function moveBoss(s){
    var b=s.boss;if(!b.present)return;
    if(b.leaving){b.y-=5;if(b.y<-70){b.leaving=false;b.present=false;}return;}
    if(s.stage==='card'&&s.segTick%150===0){b.targetX=96+rand(s)*(W-192);b.targetY=112+rand(s)*52;}
    b.x+=(b.targetX-b.x)*.035;b.y+=(b.targetY-b.y)*.05;
  }
  function movePlayer(s,input){
    var p=s.player,dx=Number(input&&input.dx)||0,dy=Number(input&&input.dy)||0,limit=input&&input.focus?FOCUS_MOVE:MAX_MOVE,len=Math.sqrt(dx*dx+dy*dy);
    if(len>limit){dx*=limit/len;dy*=limit/len;}
    p.focus=!!(input&&input.focus);p.x=Math.max(8,Math.min(W-8,p.x+dx));p.y=Math.max(40,Math.min(H-14,p.y+dy));
  }
  function updateMobs(s){
    for(var i=s.mobs.length-1;i>=0;i--){
      var m=s.mobs[i];m.age++;
      if(m.elite){
        if(m.age>m.hold+90)m.y-=2.4;else if(m.y<m.stopY)m.y+=2.2;
        if(m.y>=m.stopY-1&&m.age<=m.hold+90&&m.every&&m.age>=m.first+60&&(m.age-m.first-60)%m.every===0){MOB_FIRE[m.fire](s,m);m.shots++;}
        if(m.y<-40&&m.age>m.hold){s.mobs.splice(i,1);continue;}
      }else{
        m.baseX+=m.vx;m.y+=m.vy;m.x=m.baseX+(m.sway?Math.sin(m.age*m.swayRate)*m.sway*22:0);
        // 영웅 구역 가까이 내려온 몹은 쏘지 않는다(코앞 기습 방지).
        if(m.y<400&&m.y>0&&(m.age===m.first||m.every&&m.age>m.first&&(m.age-m.first)%m.every===0)){MOB_FIRE[m.fire](s,m);m.shots++;}
        if(m.y>H+30||m.x<-40||m.x>W+40){s.mobs.splice(i,1);continue;}
      }
    }
  }
  // 유도탄이 따라갈 가로 좌표: 보스전이면 보스, 아니면 가장 가까운 몹.
  function homingX(s){
    if(s.stage==='card')return s.boss.x;
    var best=null,bestD=1e9,p=s.player;
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i];if(m.y<0||m.y>p.y)continue;var d=Math.abs(m.x-p.x)+(p.y-m.y)*.3;if(d<bestD){bestD=d;best=m;}}
    return best?best.x:null;
  }
  function updateShots(s){
    var b=s.boss,p=s.player,i,k,target=homingX(s);
    // 곧은 주포 2발 + 적을 따라가는 유도탄 2발. 적 바로 아래에 서면 주포까지 맞아 훨씬 빨리 깬다.
    if(s.tick%SHOT_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=0;s.sx[s.sn]=p.x-7;s.sy[s.sn++]=p.y-18;s.shoming[s.sn]=0;s.sx[s.sn]=p.x+7;s.sy[s.sn++]=p.y-18;}
    if(s.tick%HOMING_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=1;s.sx[s.sn]=p.x-20;s.sy[s.sn++]=p.y-4;s.shoming[s.sn]=1;s.sx[s.sn]=p.x+20;s.sy[s.sn++]=p.y-4;}
    for(i=s.sn-1;i>=0;i--){
      s.sy[i]-=SHOT_SPEED;
      if(s.shoming[i]&&target!==null){var steer=target-s.sx[i];s.sx[i]+=steer>HOMING_STEER?HOMING_STEER:steer<-HOMING_STEER?-HOMING_STEER:steer;}
      var hit=s.stage==='card'&&Math.abs(s.sx[i]-b.x)<30&&Math.abs(s.sy[i]-b.y)<34;
      if(hit){b.hp-=1;s.score+=2;if(s.tick-b.hitTick>=5){b.hitTick=s.tick;note(s,b.hp/b.maxHp<=.2?'bossHitLow':'bossHit');}}
      for(k=s.mobs.length-1;k>=0&&!hit;k--){
        var m=s.mobs[k];if(Math.abs(s.sx[i]-m.x)>m.r+4||Math.abs(s.sy[i]-m.y)>m.r+9)continue;
        hit=true;m.hp--;m.hitTick=s.tick;
        if(m.hp<=0){s.score+=m.score;s.kills++;s.pops.push(m.x,m.y,m.elite?1:0);note(s,'kill');s.mobs.splice(k,1);}
      }
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
    var p=s.player,px=p.x,py=p.y,struck=false,grazed=0,hitScale=s.rules.hitScale,i,k;
    for(i=s.n-1;i>=0;i--){
      var age=++s.bage[i];
      if(s.bat[i]&&age===s.bat[i]){
        var mode=s.bmode[i];
        if(mode===MODE_SPLIT||mode===MODE_BRANCH){
          var sx=s.bx[i],sy=s.by[i],color=s.bcolor[i],parts=Math.round(s.barg[i]),speed=s.bs2[i]/s.rules.speed,heading=s.ba[i],gen=s.bgen[i],size=s.bsize[i],at=s.bat[i];
          removeBullet(s,i);
          if(mode===MODE_SPLIT)ring(s,sx,sy,parts,speed,heading,{color:color,size:0});
          // 가지치기: 진행 방향을 중심으로 부채꼴로 갈라지고, 세대가 남아 있으면 가지가 다시 갈라진다.
          else for(k=0;k<parts;k++)spawn(s,sx,sy,heading+(k-(parts-1)/2)*.5,speed,gen>1?{color:color,size:Math.max(0,size-1),at:at,mode:MODE_BRANCH,arg:parts,gen:gen-1,speed2:speed}:{color:color,size:0});
          note(s,'pop');continue;
        }
        if(mode===MODE_REAIM)s.ba[i]=Math.atan2(py-s.by[i],px-s.bx[i])+s.barg[i];else if(mode===MODE_TURN)s.ba[i]+=s.barg[i];
        s.bs[i]=s.bs2[i];s.bacc[i]=0;
      }
      if(s.bturn[i])s.ba[i]+=s.bturn[i]*TICK;
      if(s.bacc[i]){var v=s.bs[i]+s.bacc[i]*TICK;s.bs[i]=v<s.bmin[i]?s.bmin[i]:v>s.bmax[i]?s.bmax[i]:v;}
      var x=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK,y=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK;
      if(x<-36||x>W+36||y<-48||y>H+36||age>=s.blife[i]){removeBullet(s,i);continue;}
      if(age<BLOOM_TICKS)continue; // 갓 피어난 탄은 아직 닿지 않는다
      var dx=x-px,dy=y-py,radius=s.bsize[i]===SHAPE_PROP?PROP_RADIUS[s.bcolor[i]]:SIZE_RADIUS[s.bsize[i]],d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN;
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
    var seg=segment(s),b=s.boss;
    if(s.stage==='break'){if(s.stageTick>=BREAK_TICKS){if(seg&&seg.kind==='card')beginCard(s);else advance(s);}}
    else if(s.stage==='intro'){
      if(!b.present)enter(s,seg.actor);
      else if(!b.leaving&&b.actor===seg.actor&&s.stageTick>=INTRO_TICKS)beginCard(s);
    }
    else if(s.stage==='wave'){
      var w=s.segTick++;if(w<seg.duration)seg.script(s,w);
      // 대본이 끝나고 몹이 다 사라지면 다음으로. 너무 오래 남은 몹은 물러난다.
      if(w>=seg.duration&&(!s.mobs.length||w>=seg.duration+WAVE_GRACE)){s.mobs.length=0;s.score+=cancelAll(s)*10;note(s,'waveClear');advance(s);}
    }
    else if(s.stage==='card'){
      var t=s.segTick++;
      if(t>=FIRE_DELAY)seg.fire(s,t-FIRE_DELAY); // 스펠 이름이 뜨는 동안은 쏘지 않는다
      var left=seg.time-s.segTick*TICK;
      if(left<=10&&left>0&&s.segTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    updateMobs(s);updateShots(s);
    if(s.stage==='card'&&b.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&s.segTick*TICK>=segment(s).time)endCard(s,false);
    var p=s.player,byBeam=updateLasers(s),byBullet=updateBullets(s);
    if((byBeam||byBullet)&&s.tick>=p.invulnerableUntil&&s.stage!=='won'){
      p.hp--;s.hits++;p.invulnerableUntil=s.tick+INVULN_TICKS;cancelAll(s);note(s,'hurt');
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}
    }
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function timeLeft(s){var seg=segment(s);return s.stage==='card'?Math.max(0,seg.time-s.segTick*TICK):0;}
  var api={revision:40,WIDTH:W,HEIGHT:H,CAP:CAP,LASER_CAP:LASER_CAP,MOB_CAP:MOB_CAP,GOLDEN_ANGLE:GOLDEN_ANGLE,SEGMENTS:SEGMENTS,STAGES:STAGES,ACTORS:ACTORS,MOBS:MOBS,CARD_TOTAL:CARD_TOTAL,
    DIFFICULTY:DIFFICULTY,SIZE_RADIUS:SIZE_RADIUS,PROP_RADIUS:PROP_RADIUS,SHAPE_PROP:SHAPE_PROP,BLOOM_TICKS:BLOOM_TICKS,BEAM_FADE:BEAM_FADE,Shapes:Shapes,createRun:createRun,step:step,timeLeft:timeLeft};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);
