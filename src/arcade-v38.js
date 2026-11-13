/* 합일 v42 · 총집본(ARCADE 탄막) — 전투 시뮬레이션.
 * 스토리 전투(core.js, 규칙31)와 완전히 분리된 독립 엔진이다. 60Hz 고정 틱·시드 난수로 결정적으로 돈다.
 * 스테이지는 원작(StoryWorld) 8부의 장 순서를 따르고, 각 스테이지는
 *   잡몹 구간 → 중간 보스 → 잡몹 구간 → 보스(일반 공격과 이름 붙은 패턴이 번갈아)로 이어진다.
 * 글 대신 패턴 이름 한 줄과 탄막 무늬로만 사연을 전한다. 화면·소리는 arcade-app-v38.js가 맡는다. */
(function(root){
  'use strict';
  var W=360,H=640,CAP=1400,COMPACT_CAP=820,LASER_CAP=24,MOB_CAP=28,ITEM_CAP=160,TICK=1/60,TAU=Math.PI*2;
  var GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5)); // 137.5°. 해바라기 씨앗이 겹치지 않고 차오르는 각도
  /* 난이도. density 탄 수 배율 · speed 탄 속도 배율 · hp 목숨 · mapHeal 다음 맵에서 회복(-1은 전부) · bombs 폭탄 ·
   * radius 영웅 피격점 반지름 · hitScale 탄의 보이는 반지름 중 실제로 닿는 비율 · warn 광선 예고 시간 배율 · beam 광선 굵기 배율 */
  var DIFFICULTY={
    gentle:{density:.9,speed:.6,hp:7,mapHeal:-1,bombs:3,radius:1.4,hitScale:.36,warn:1.6,beam:.72,label:'여유'},
    normal:{density:1.3,speed:.74,hp:3,mapHeal:1,bombs:2,radius:2,hitScale:.46,warn:1.2,beam:.88,label:'기본'},
    hell:{density:2,speed:.9,hp:1,mapHeal:0,bombs:1,radius:2.4,hitScale:.5,warn:1,beam:1,label:'지옥'}
  };
  // 휴대폰 모드: 탄 수를 줄이고 그만큼 탄을 크게 그린다(판정도 같이 커진다).
  var COMPACT_DENSITY=.72,COMPACT_SIZE=1.25;
  var GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,BOMB_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=80,FIRE_DELAY=40,WAVE_GRACE=360;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=96,MAX_MOVE=12,FOCUS_MOVE=2;
  var BEAM_HIT=.62,BEAM_FADE=14,BEAM_LENGTH=1000;
  var GAUGE_FULL=100,MAX_BOMBS=4,AUTO_COLLECT_Y=190,ITEM_REACH=24,ITEM_PULL=11,BOMB_BOSS_DAMAGE=40,BOMB_MOB_DAMAGE=25;
  // 탄 색은 여섯 가지만 쓴다: 0 빨강 2 보라 4 청록 5 초록 6 노랑 8 흰색
  var PALETTE=[0,2,4,5,6,8],RED=0,PURPLE=2,CYAN=4,GREEN=5,YELLOW=6,WHITE=8;
  // 모양도 여섯 가지: 0 작은 구슬 1 중간 2 큰 구슬 3 쌀알탄 4 거품 5 큰 기물(색 번호 자리에 기물 번호)
  var SIZE_RADIUS=[4,6,10,3.2,15,14],RICE=3,SHAPE_PROP=5;
  // 큰 기물. upright는 절대 돌리지 않는 것(십자가는 똑바로 선 채 아래로만 내려온다).
  var PROPS=[{key:'sword-violet',radius:12},{key:'cleaver',radius:14},{key:'sword-balrog',radius:14},{key:'obelisk',radius:17},{key:'spire',radius:18},
    {key:'twin-blade',radius:13},{key:'crescent',radius:14},{key:'tissue',radius:10},{key:'money',radius:10},{key:'heel',radius:11},{key:'feather',radius:9},
    {key:'cross',radius:14,upright:true},{key:'gear',radius:16}];
  var P={};PROPS.forEach(function(p,i){P[p.key]=i;});
  // 탄 변화 방식: 1 영웅을 다시 조준 2 각도 꺾기 3 터져서 고리로 4 가지치기(프랙탈)
  var MODE_REAIM=1,MODE_TURN=2,MODE_SPLIT=3,MODE_BRANCH=4;

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*s.density));}
  function pick(s,gentle,normal,hell){return s.difficulty==='gentle'?gentle:s.difficulty==='hell'?hell:normal;}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  function note(s,name){if(s.events.length<48)s.events.push(name);}
  function bulletRadius(s,i){return (s.bsize[i]===SHAPE_PROP?PROPS[s.bcolor[i]].radius:SIZE_RADIUS[s.bsize[i]])*s.sizeScale;}
  /* 탄 하나. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode,arg,speed2,life,gen(가지치기 남은 횟수),spin(기물이 도는 속도, 틱당 라디안)} */
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=s.cap){s.dropped++;return;}
    o=o||{};var i=s.n++,size=o.size||0;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*s.rules.speed;
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*s.rules.speed;s.bgen[i]=o.gen||0;
    s.bage[i]=0;s.blife[i]=o.life||780;s.bsize[i]=size;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;
    s.bspin[i]=size===SHAPE_PROP&&PROPS[o.color||0].upright?0:o.spin||0;
  }
  function ring(s,x,y,n,speed,offset,o){for(var i=0;i<n;i++)spawn(s,x,y,offset+TAU*i/n,speed,o);}
  function fan(s,x,y,n,center,spread,speed,o){for(var i=0;i<n;i++)spawn(s,x,y,center+(n>1?(i/(n-1)-.5)*spread:0),speed,o);}
  // 가우스 종곡선: 부채꼴 가운데가 가장 빠르고 가장자리로 갈수록 정규분포 곡선을 따라 느려져, 탄막 앞줄이 종 모양이 된다.
  function bell(s,x,y,n,center,spread,speed,sigma,o){
    for(var i=0;i<n;i++){var u=n>1?i/(n-1)*2-1:0;spawn(s,x,y,center+u*spread/2,speed*(.5+.8*Math.exp(-u*u/(2*sigma*sigma))),o);}
  }
  // 위에서 내려오는 한 줄. 화면 밖(위)에서 들어오므로 갑자기 나타나지 않는다. gapAt부터 gapWidth칸은 비운다.
  function curtain(s,cells,gapAt,gapWidth,speed,o){var step=W/cells;for(var i=0;i<cells;i++){if(i>=gapAt&&i<gapAt+gapWidth)continue;spawn(s,step*(i+.5),-10,Math.PI/2,speed,o);}}

  /* ── 기하 도형. 원점 기준 단위 좌표의 점 묶음. 각 탄을 "원점에서 그 점 방향으로, 거리에 비례한 속도"로 쏘면
   *    도형이 모양을 유지한 채 커진다. ── */
  var shapeCache={};
  function cached(key,build){if(!shapeCache[key]){var pts=build(),max=0,out=[],i;for(i=0;i<pts.length;i+=2)max=Math.max(max,Math.sqrt(pts[i]*pts[i]+pts[i+1]*pts[i+1]));for(i=0;i<pts.length;i+=2){var x=pts[i]/max,y=pts[i+1]/max;if(x*x+y*y>=.0144)out.push(x,y);}shapeCache[key]=out;}return shapeCache[key];}
  function outline(vertices,perSide){var out=[],n=vertices.length/2;for(var k=0;k<n;k++){var x1=vertices[k*2],y1=vertices[k*2+1],x2=vertices[(k+1)%n*2],y2=vertices[(k+1)%n*2+1];for(var j=0;j<perSide;j++)out.push(x1+(x2-x1)*j/perSide,y1+(y2-y1)*j/perSide);}return out;}
  function corners(n,radius,turn){var v=[];for(var k=0;k<n;k++){var a=TAU*k/n-Math.PI/2+(turn||0);v.push(Math.cos(a)*radius,Math.sin(a)*radius);}return v;}
  var Shapes={
    polygon:function(n,perSide){return cached('p'+n+'/'+perSide,function(){return outline(corners(n,1),perSide);});},
    // 별(톱니): 바깥 꼭짓점과 안쪽 꼭짓점을 번갈아 이은 2n각형
    star:function(n,inner,perSide){return cached('s'+n+'/'+inner+'/'+perSide,function(){var v=[],o=corners(n,1),i=corners(n,inner,Math.PI/n);for(var k=0;k<n;k++)v.push(o[k*2],o[k*2+1],i[k*2],i[k*2+1]);return outline(v,perSide);});},
    // 장미 곡선 r = 0.3 + 0.7·cos²(kθ/2): 꽃잎 k장
    rose:function(k,points){return cached('r'+k+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var a=TAU*i/points,c=Math.cos(k*a/2),r=.3+.7*c*c;out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});},
    // 눈: 납작한 타원 테두리 안에 작은 눈동자 고리
    eye:function(points){return cached('e'+points,function(){var out=[],i,a,pupil=Math.max(6,points>>2);for(i=0;i<points;i++){a=TAU*i/points;out.push(Math.cos(a),Math.sin(a)*.42);}for(i=0;i<pupil;i++){a=TAU*i/pupil;out.push(Math.cos(a)*.24,Math.sin(a)*.24);}return out;});},
    // 리사주 곡선 x = sin(a·t + π/2), y = sin(b·t): 두 진동의 겹침
    lissajous:function(a,b,points){return cached('l'+a+'/'+b+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points;out.push(Math.sin(a*t+Math.PI/2),Math.sin(b*t));}return out;});},
    // 하이포사이클로이드: 큰 원 안을 구르는 작은 원 위 한 점의 자취. k=3 델토이드, k=4 아스트로이드
    hypocycloid:function(k,points){return cached('h'+k+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points;out.push((k-1)*Math.cos(t)+Math.cos((k-1)*t),(k-1)*Math.sin(t)-Math.sin((k-1)*t));}return out;});},
    // 심장형 곡선 r = 1 − sin θ. 부푼 쪽이 위(−y)를 본다.
    cardioid:function(points){return cached('c'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points,r=1-Math.sin(t);out.push(Math.cos(t)*r,Math.sin(t)*r);}return out;});},
    // 초공식(Gielis): r = (|cos(mθ/4)|^n2 + |sin(mθ/4)|^n3)^(−1/n1). 꽃·불가사리·조개 같은 자연의 윤곽
    superformula:function(m,n1,n2,n3,points){return cached('f'+[m,n1,n2,n3,points].join('/'),function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points,r=Math.pow(Math.pow(Math.abs(Math.cos(m*t/4)),n2)+Math.pow(Math.abs(Math.sin(m*t/4)),n3),-1/n1);out.push(Math.cos(t)*r,Math.sin(t)*r);}return out;});},
    // 해바라기: i번째 씨앗을 황금각 i배 방향, √i 거리에 놓는다(피보나치 나선이 보인다).
    sunflower:function(points){return cached('u'+points,function(){var out=[];for(var i=0;i<points;i++){var r=Math.sqrt((i+1)/points),a=i*GOLDEN_ANGLE;out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});},
    // 코흐 눈송이: 정삼각형의 각 변 가운데 1/3을 바깥 삼각형으로 바꾸기를 depth번 반복
    koch:function(depth){return cached('k'+depth,function(){var v=corners(3,1);for(var d=0;d<depth;d++){var next=[],n=v.length/2;for(var k=0;k<n;k++){var x1=v[k*2],y1=v[k*2+1],x2=v[(k+1)%n*2],y2=v[(k+1)%n*2+1],dx=(x2-x1)/3,dy=(y2-y1)/3;next.push(x1,y1,x1+dx,y1+dy,x1+dx*1.5+dy*.8660254,y1+dy*1.5-dx*.8660254,x1+dx*2,y1+dy*2);}v=next;}return v;});},
    // 시에르핀스키 삼각형: 가운데 삼각형을 비우기를 depth번 반복한 뒤 남은 작은 삼각형들의 꼭짓점
    sierpinski:function(depth){return cached('t'+depth,function(){var seen={},out=[];(function cut(ax,ay,bx,by,cx,cy,d){if(!d){[[ax,ay],[bx,by],[cx,cy]].forEach(function(p){var key=Math.round(p[0]*1000)+','+Math.round(p[1]*1000);if(!seen[key]){seen[key]=1;out.push(p[0],p[1]);}});return;}var abx=(ax+bx)/2,aby=(ay+by)/2,bcx=(bx+cx)/2,bcy=(by+cy)/2,cax=(cx+ax)/2,cay=(cy+ay)/2;cut(ax,ay,abx,aby,cax,cay,d-1);cut(abx,aby,bx,by,bcx,bcy,d-1);cut(cax,cay,bcx,bcy,cx,cy,d-1);})(0,-1,.8660254,.5,-.8660254,.5,depth);return out;});},
    // 비트루비우스: 원과 그 안의 정사각형
    vitruvian:function(points){return cached('v'+points,function(){return outline(corners(points,1),1).concat(outline(corners(4,.9,Math.PI/4),Math.max(2,Math.round(points/5))));});},
    // 황금 나선: 90°마다 반지름이 황금비만큼 커지는 로그 나선(6.9라디안, 약 1.1바퀴 동안 약 8배)
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

  /* ── 몹. elite는 내려와 자리를 잡고 무늬를 쏘는 중간 몹. ── */
  var MOBS={
    spider:{hp:5,r:14,score:300},slime:{hp:6,r:14,score:300},ember:{hp:6,r:14,score:300},drone:{hp:6,r:13,score:300},mobgoblin:{hp:7,r:14,score:300},
    wolf:{hp:6,r:14,score:300},nightmare:{hp:8,r:15,score:300},collector:{hp:8,r:15,score:300},leech:{hp:7,r:14,score:300},
    guardian:{hp:70,r:20,score:3000,elite:true},warden:{hp:90,r:22,score:4000,elite:true},horn:{hp:120,r:24,score:6000,elite:true},
    belphegor:{hp:100,r:22,score:5000,elite:true},mammon:{hp:100,r:20,score:5000,elite:true},knight:{hp:120,r:22,score:6000,elite:true}
  };
  var MOB_FIRE={
    aim:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.3,96,{color:m.color,size:RICE});},
    drop:function(s,m){spawn(s,m.x,m.y,Math.PI/2,78,{color:m.color,size:0});},
    ring:function(s,m){ring(s,m.x,m.y,count(s,8),64,aim(s,m.x,m.y),{color:m.color,size:0});},
    hexagon:function(s,m){shape(s,m.x,m.y,Shapes.polygon(6,Math.max(2,count(s,3))),78,m.shots*.26,{color:m.color,size:0});},
    bell:function(s,m){bell(s,m.x,m.y,count(s,11),aim(s,m.x,m.y),1.5,100,.42,{color:m.color,size:1});},
    gearRing:function(s,m){shape(s,m.x,m.y,Shapes.star(8,.72,Math.max(1,count(s,2))),76,m.shots*.2,{color:m.color,size:0});},
    tissue:function(s,m){fan(s,m.x,m.y,pick(s,2,3,5),aim(s,m.x,m.y),1.1,52,{size:SHAPE_PROP,color:P.tissue,spin:.03});},
    money:function(s,m){ring(s,m.x,m.y,pick(s,4,6,9),70,m.shots*.5,{size:SHAPE_PROP,color:P.money,spin:.12});},
    cleaver:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.7,104,{size:SHAPE_PROP,color:P.cleaver,spin:.2});bell(s,m.x,m.y,count(s,9),aim(s,m.x,m.y),1.6,92,.45,{color:m.color,size:1});},
    sixcuts:function(s,m){fan(s,m.x,m.y,6,aim(s,m.x,m.y),pick(s,2.2,1.9,1.6),118,{size:SHAPE_PROP,color:P['sword-violet']});}
  };
  /* 몹 하나. o: {vx,vy,sway,swayRate,fire,first,every,color,stopY,hold} */
  function mob(s,kind,x,y,o){
    if(s.mobs.length>=MOB_CAP)return;
    var spec=MOBS[kind];o=o||{};
    s.mobs.push({kind:kind,elite:!!spec.elite,x:x,y:y,baseX:x,vx:o.vx||0,vy:o.vy===undefined?1.6:o.vy,sway:o.sway||0,swayRate:o.swayRate||.05,hp:spec.hp,r:spec.r,score:spec.score,
      fire:o.fire||'aim',first:o.first||40,every:o.every||0,color:o.color||0,stopY:o.stopY||120,hold:o.hold||300,age:0,shots:0,hitTick:-99});
  }
  /* 잡몹 구간 대본 두 가지. a: 잡몹 {kind,fire,color}, elite: 중간 몹 {kind,fire,color} 또는 없음. */
  function waveColumns(a,elite){return function(s,t){
    // 황금각 순서로 자리를 옮겨 가며 내려오는 줄 → 중간 몹 → 양옆에서 가로질러 들어오는 줄
    if(t<270&&t%24===0){var i=t/24;mob(s,a.kind,180+150*Math.sin(i*GOLDEN_ANGLE),-20,{vy:1.7,sway:.6,fire:a.fire,first:46,color:a.color});}
    if(t===300){if(elite)mob(s,elite.kind,180,-30,{stopY:116,fire:elite.fire,first:20,every:78,hold:280,color:elite.color});else for(var k=0;k<4;k++)mob(s,a.kind,60+k*80,-20-k*14,{vy:1.3,fire:'ring',first:60,color:a.color});}
    if(t>=420&&t<700&&t%32===0){var left=(t/32)%2===0;mob(s,a.kind,left?-16:W+16,60+rand(s)*90,{vx:left?2:-2,vy:.7,fire:'drop',first:34,every:54,color:a.color});}
  };}
  function waveDives(a,elite){return function(s,t){
    // 사인 곡선으로 내리꽂는 떼 → 중간 몹 둘 → 흩어져 내려오며 고리를 뿌리는 떼
    if(t<280&&t%20===0){var i=t/20;mob(s,a.kind,i%2?74:286,-20,{vy:2.1,sway:2.4,swayRate:.085,fire:a.fire,first:38,color:a.color});}
    if(t===300&&elite){mob(s,elite.kind,96,-30,{stopY:122,fire:elite.fire,first:20,every:84,hold:280,color:elite.color});mob(s,elite.kind,264,-30,{stopY:122,fire:elite.fire,first:62,every:84,hold:280,color:elite.color});}
    if(t>=400&&t<700&&t%34===0)mob(s,a.kind,30+rand(s)*300,-20,{vy:1.5,sway:1.1,fire:'ring',first:44,color:a.color});
  };}

  /* ── 보스의 일반 공격 세 가지(이름 없음). c1, c2는 그 보스의 두 색. ── */
  function plainSpiral(c1,c2){return function(s,t){var b=s.boss,arms=count(s,3),k;
    if(t%7===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.04+TAU*k/arms,84,{color:c1,size:0});
    if(t%7===3)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.034+TAU*k/arms,66,{color:c2,size:0});};}
  function plainRings(c1,c2){return function(s,t){var b=s.boss,n=count(s,18);
    if(t%44===0)ring(s,b.x,b.y,n,72,(t/44)%2?Math.PI/n:0,{color:(t/44)%2?c2:c1,size:1});
    if(t%88===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,112,{color:WHITE,size:RICE});};}
  function plainBells(c1,c2){return function(s,t){var b=s.boss;
    if(t%52===0)bell(s,b.x,b.y,count(s,13),aim(s,b.x,b.y),1.9,104,.45,{color:c1,size:1});
    if(t%104===70)ring(s,b.x,b.y,count(s,12),58,rand(s)*TAU,{color:c2,size:0});};}
  function plainLissajous(c1,c2){return function(s,t){var b=s.boss;
    if(t%56===0)shape(s,b.x,b.y,Shapes.lissajous(3,2,count(s,26)),82,t*.01,{color:(t/56)%2?c2:c1,size:0});
    if(t%112===84)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,110,{color:WHITE,size:RICE});};}
  function plainHypocycloid(c1,c2){return function(s,t){var b=s.boss,odd=(t/60)%2;
    if(t%60===0)shape(s,b.x,b.y,Shapes.hypocycloid(odd?3:4,count(s,28)),78,t*.008,{color:odd?c2:c1,size:1});};}
  function plainCardioid(c1,c2){return function(s,t){var b=s.boss;
    if(t%64===0)shape(s,b.x,b.y,Shapes.cardioid(count(s,26)),84,aim(s,b.x,b.y)+Math.PI/2,{color:c1,size:0});
    if(t%64===32)ring(s,b.x,b.y,count(s,12),60,rand(s)*TAU,{color:c2,size:1});};}
  // 가우디의 현수선 아치: 사슬을 늘어뜨린 곡선(cosh)을 뒤집은 아치가 차례로 내려온다. 아치마다 세 칸의 문이 있다.
  function plainCatenary(c1,c2){return function(s,t){
    if(t%46!==0)return;
    s.lane=Math.max(0,Math.min(10,(s.lane===undefined?5:s.lane)+Math.floor(rand(s)*3)-1));
    for(var i=0;i<13;i++){if(i>=s.lane&&i<s.lane+3)continue;var x=W/13*(i+.5),u=(x-W/2)/90;spawn(s,x,-43+12*((Math.exp(u)+Math.exp(-u))/2-1),Math.PI/2,60,{color:(t/46)%2?c2:c1,size:1});}};}
  function plainSunflower(c1,c2){return function(s,t){var b=s.boss;
    if(t%90===0)shape(s,b.x,b.y,Shapes.sunflower(count(s,34)),94,rand(s)*TAU,{color:c1,size:0});
    if(t%90===45)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.8,100,.45,{color:c2,size:1});};}
  function plainSuperformula(c1,c2){return function(s,t){var b=s.boss,odd=(t/58)%2;
    if(t%58===0)shape(s,b.x,b.y,Shapes.superformula(odd?5:7,odd?2:3,7,7,count(s,30)),80,t*.006,{color:odd?c2:c1,size:0});};}
  // 보스를 축으로 도는 광선 바퀴
  function wheel(s,spokes,turn,color,active){var b=s.boss,base=aim(s,b.x,b.y)+Math.PI/spokes;for(var k=0;k<spokes;k++)beam(s,b.x,b.y,base+TAU*k/spokes,{width:12,warn:76,active:active,color:color,spin:turn,follow:true});}
  // 가로줄·세로줄 광선 격자. both면 한꺼번에 켠다.
  function lattice(s,t,period,rows,columns,both,width,c1,c2){var phase=t%period,half=period>>1;
    if(phase===0||both&&phase===half)for(var k=0;k<rows;k++)row(s,236+k*(330/rows)+rand(s)*46,{width:width,warn:64,active:66,color:c1});
    if(phase===half||both&&phase===0)slots(s,columns,W,10).forEach(function(x){column(s,x,{width:width,warn:64,active:66,color:c2});});}

  /* ── 인물. 원작에 나오는 이름만 쓴다. ── */
  var ACTORS={
    violet:{name:'보라검 천사',c1:PURPLE,c2:WHITE},balrog:{name:'발록',c1:RED,c2:YELLOW},mask:{name:'웃는 가면',c1:WHITE,c2:RED},lucifer:{name:'루시퍼',c1:YELLOW,c2:RED},
    asmodeus:{name:'아스모데우스',c1:RED,c2:PURPLE},pride:{name:'교만의 회장',c1:WHITE,c2:YELLOW},controller:{name:'통제자',c1:CYAN,c2:PURPLE},
    goblin:{name:'고블린 두목',c1:GREEN,c2:RED},insomnia:{name:'불면귀',c1:WHITE,c2:PURPLE},arbelia:{name:'아르벨리아',c1:CYAN,c2:WHITE},siren:{name:'세이렌 모르',c1:RED,c2:CYAN},
    chief:{name:'악몽의 우두머리',c1:WHITE,c2:PURPLE},executor:{name:'파란불 집행체',c1:CYAN,c2:RED},rian:{name:'한리안과 백이온',c1:YELLOW,c2:CYAN},cultist:{name:'교주',c1:RED,c2:WHITE}
  };

  /* ── 이름 붙은 패턴. 이름을 순서대로 읽으면 그 인물의 사연이 되도록 원작 장면 제목·목표에서만 따왔다.
   *    name 패턴 이름 · scene 원작 장면 번호 · fire(s,t) 발사 시작 뒤 t틱째 ── */
  var spells={
    // 1부 전반 — 궁전. 보라검 천사의 실, 발록의 일곱 기둥·소환진·추락
    web:{name:'여덟 다리의 실',scene:'02',fire:function(s,t){var b=s.boss,n=pick(s,2,2,3),k,phase=t%190;
      if(phase===0)for(k=0;k<n;k++)beam(s,-12,-150+k*(520/n)+rand(s)*50,.95,{width:11,warn:62,active:70,color:PURPLE});
      if(phase===95)for(k=0;k<n;k++)beam(s,W+12,-150+k*(520/n)+rand(s)*50,Math.PI-.95,{width:11,warn:62,active:70,color:PURPLE});
      if(t%54===20)shape(s,b.x,b.y,Shapes.polygon(6,Math.max(2,count(s,4))),64,t*.009,{color:PURPLE,size:1});
      if(t%108===74)ring(s,b.x,b.y,pick(s,3,4,6),90,rand(s)*TAU,{size:SHAPE_PROP,color:P['sword-violet'],spin:.16});}},
    pillars:{name:'일곱 기둥',scene:'06',fire:function(s,t){var b=s.boss,phase=t%230,k,shift=Math.floor(t/230)%2?25:0;
      // 일곱 기둥이 한꺼번에 서고, 다음에는 반 칸 옮겨 선다. 기둥 사이 여섯 칸이 통로다.
      if(phase===0)for(k=0;k<7;k++)column(s,30+shift+k*50,{width:14,warn:70,active:84,color:RED});
      if(t%58===30)ring(s,b.x,b.y,count(s,12),60,rand(s)*TAU,{color:YELLOW,size:1});}},
    summon:{name:'소환진',scene:'07',fire:function(s,t){var b=s.boss;
      if(t%66===0)shape(s,b.x,b.y,Shapes.vitruvian(count(s,16)),66,t*.01,{color:RED,size:1});
      if(t%132===33)shape(s,b.x,b.y,Shapes.star(5,.4,Math.max(2,count(s,3))),78,-t*.008,{color:YELLOW,size:0});
      if(t%120===90)ring(s,b.x,b.y,pick(s,2,3,5),80,aim(s,b.x,b.y),{size:SHAPE_PROP,color:P['sword-balrog'],spin:.2,turn:.22});}},
    fall:{name:'추락',scene:'07',fire:function(s,t){var b=s.boss,i;
      // 모든 것이 아래로 떨어진다. 빈 칸이 조금씩 옮겨 가며 이어진다.
      if(t%40===0){s.lane=Math.max(1,Math.min(10,(s.lane===undefined?5:s.lane)+Math.floor(rand(s)*3)-1));curtain(s,14,s.lane,3,62,{color:t%80?RED:YELLOW,size:1});}
      if(t%9===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,50+rand(s)*40,{color:YELLOW,size:0});
      if(t%110===55)spawn(s,b.x,b.y,aim(s,b.x,b.y),96,{color:RED,size:2,at:56,mode:MODE_SPLIT,arg:count(s,10),speed2:70});}},
    // 1부 후반 — 병원. 웃는 가면, 루시퍼의 주사실·중독의 도시·천사의 가면
    smile:{name:'웃는 가면',scene:'08',fire:function(s,t){var b=s.boss;
      if(t%72===0)fan(s,b.x,b.y,pick(s,3,5,7),aim(s,b.x,b.y),1.3,96,{size:SHAPE_PROP,color:P.feather});
      if(t%72===36)ring(s,b.x,b.y,count(s,16),60,t*.02,{color:WHITE,size:1});}},
    needles:{name:'주사실',scene:'09-1',fire:function(s,t){var b=s.boss,phase=t%120;
      // 가는 바늘 줄기가 한동안 영웅을 따라오다 멈춘다.
      if(phase<64&&phase%8===0){var a=aim(s,b.x,b.y);spawn(s,b.x-9,b.y,a,132,{color:WHITE,size:RICE});spawn(s,b.x+9,b.y,a,132,{color:WHITE,size:RICE});}
      if(t%60===30)ring(s,b.x,b.y,count(s,14),54,rand(s)*TAU,{color:YELLOW,size:1});}},
    craving:{name:'중독의 도시',scene:'10',fire:function(s,t){var b=s.boss;
      // 흩어졌던 탄이 멈췄다가 영웅 쪽으로 다시 몰려든다.
      if(t%78===0){var n=count(s,30),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,160,{color:RED,size:0,accel:-165,min:0,at:60,mode:MODE_REAIM,arg:(i%3-1)*.22,speed2:92});}
      if(t%78===39)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.8,96,.45,{color:YELLOW,size:1});}},
    angelMask:{name:'천사의 가면',scene:'11',fire:function(s,t){var b=s.boss,every=pick(s,3,2,2);
      // 황금각 잎차례: 한 발마다 137.5°씩 돌려 쏘면 날개 같은 나선 팔이 생긴다.
      if(t%every===0){var i=t/every;spawn(s,b.x,b.y,i*GOLDEN_ANGLE,74,{color:i%13?YELLOW:WHITE,size:i%13?0:1});}
      if(t%130===70)ring(s,b.x,b.y,pick(s,4,6,8),70,rand(s)*TAU,{size:SHAPE_PROP,color:P.feather,spin:.1});}},
    // 2부 — 일곱 개의 귀. 붉은 하이힐, 회장의 전극 성당·하늘에 서려는 자·생체 부트로더
    heel:{name:'붉은 하이힐',scene:'17',fire:function(s,t){var b=s.boss;
      if(t%64===0)fan(s,b.x,b.y,pick(s,2,3,5),aim(s,b.x,b.y),1,104,{size:SHAPE_PROP,color:P.heel});
      if(t%96===48)shape(s,b.x,b.y,Shapes.rose(5,count(s,30)),78,t*.01,{color:RED,size:0});}},
    cathedral:{name:'전극 성당',scene:'21',fire:function(s,t){var b=s.boss;
      lattice(s,t,220,pick(s,2,2,3),pick(s,2,3,4),s.difficulty==='hell',10,WHITE,YELLOW);
      if(t%70===35)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,92,.45,{color:WHITE,size:0});}},
    ascend:{name:'하늘에 서려는 자',scene:'21',fire:function(s,t){var b=s.boss;
      // 위로 솟구친 탄이 힘을 잃고 꺾여 내려온다.
      if(t%44===0){var n=count(s,16);for(var i=0;i<n;i++){var u=n>1?i/(n-1)-.5:0;spawn(s,b.x,b.y,-Math.PI/2+u*2.2,150,{color:YELLOW,size:1,accel:-150,min:20,at:52,mode:MODE_TURN,arg:Math.PI-u*1.5,speed2:64});}}
      if(t%88===44)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,108,{color:WHITE,size:RICE});}},
    bootloader:{name:'생체 부트로더',scene:'22',fire:function(s,t){
      // 0과 1의 줄이 내려온다. 빈 세 칸이 한 줄에 한 칸씩만 옮겨 간다.
      if(t%38===0){s.lane=Math.max(0,Math.min(12,(s.lane===undefined?6:s.lane)+Math.floor(rand(s)*3)-1));curtain(s,15,s.lane,3,58,{color:(t/38)%2?WHITE:CYAN,size:(t/38)%2?0:1});}}},
    // 3부 — 통제자의 열일곱 단계
    legion:{name:'방어의 군단',scene:'24',fire:function(s,t){var b=s.boss;
      if(t%52===0)shape(s,b.x,b.y,Shapes.polygon(4,Math.max(2,count(s,6))),70,t*.012,{color:CYAN,size:0});
      if(t%104===78)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.5,96,.45,{color:PURPLE,size:1});}},
    rescue:{name:'잔인한 구원',scene:'25',fire:function(s,t){var b=s.boss,phase=t%260;
      // 양옆 벽이 차례로 좁혀 온다. 가운데 길만 남는다.
      if(phase===0){column(s,26,{width:22,warn:70,active:150,color:CYAN});column(s,W-26,{width:22,warn:70,active:150,color:CYAN});}
      if(phase===70){column(s,74,{width:22,warn:70,active:90,color:CYAN});column(s,W-74,{width:22,warn:70,active:90,color:CYAN});}
      if(t%64===32)fan(s,b.x,b.y,count(s,5),aim(s,b.x,b.y),.9,96,{color:PURPLE,size:1});}},
    veto:{name:'시스템의 거부권',scene:'26',fire:function(s,t){var b=s.boss,k;
      // 뻗어 나가던 탄이 멈춰 서서 일제히 방향을 꺾는다.
      if(t%120===0){var n=count(s,36),start=rand(s)*TAU;for(k=0;k<n;k++)spawn(s,b.x,b.y,start+TAU*k/n,180,{color:CYAN,size:0,accel:-200,min:0,at:55,mode:MODE_TURN,arg:k%2?.9:-.9,speed2:88});}
      if(t%120===60)shape(s,b.x,b.y,Shapes.koch(pick(s,1,2,2)),92,t*.004,{color:WHITE,size:0});}},
    memoryGate:{name:'기억의 문',scene:'29',fire:function(s,t){var b=s.boss;
      // 같은 명령이 되풀이된다: 같은 삼각 무늬가 조금씩 돌아가며 반복된다.
      if(t%48===0)shape(s,b.x,b.y,Shapes.sierpinski(pick(s,2,2,3)),74,Math.floor(t/48)*.35,{color:PURPLE,size:0});
      if(t%192===100)for(var k=0;k<pick(s,1,2,2);k++)row(s,300+k*150+rand(s)*40,{width:14,warn:66,active:60,color:CYAN});}},
    // 4부 — 환도 자아와 융합몽세. 고블린 두목의 장미 인장, 불면귀의 마을·눈·실안개
    roseSeal:{name:'장미 인장',scene:'32',fire:function(s,t){var b=s.boss;
      if(t%60===0)shape(s,b.x,b.y,Shapes.rose((t/60)%2?5:4,count(s,32)),84,t*.007,{color:(t/60)%2?RED:GREEN,size:0});
      if(t%120===90)ring(s,b.x,b.y,pick(s,2,3,5),86,aim(s,b.x,b.y),{size:SHAPE_PROP,color:P.cleaver,spin:.18});}},
    sleepless:{name:'잠들지 못하는 마을',scene:'34',fire:function(s,t){var b=s.boss,i;
      // 안개: 흰 탄이 천천히 흔들리며 화면을 덮는다.
      if(t%7===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2+(rand(s)-.5)*.5,30+rand(s)*26,{color:WHITE,size:rand(s)<.25?1:0,turn:(rand(s)-.5)*.3,life:1500});
      if(t%96===48)ring(s,b.x,b.y,count(s,14),50,rand(s)*TAU,{color:PURPLE,size:1});}},
    openEye:{name:'감기지 않는 눈',scene:'35',fire:function(s,t){var b=s.boss;
      if(t%68===0)shape(s,b.x,b.y,Shapes.eye(count(s,30)),86,(t/68)%2?.5:-.5,{color:(t/68)%2?PURPLE:WHITE,size:0});
      // 시선: 눈이 영웅을 본다.
      if(t%68===34)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.3,118,{color:PURPLE,size:RICE});}},
    puppetFog:{name:'꼭두각시 실안개',scene:'35',fire:function(s,t){var i;
      // 주민에게서 뻗은 흰 실이 격자를 짜고, 그 사이로 안개가 내린다.
      lattice(s,t,240,pick(s,2,2,3),pick(s,2,3,4),s.difficulty==='hell',8,WHITE,WHITE);
      if(t%10===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2+(rand(s)-.5)*.4,32+rand(s)*22,{color:WHITE,size:0,turn:(rand(s)-.5)*.24,life:1500});}},
    // 5부 — 카이로노미콘. 아르벨리아의 유예, 세이렌의 빼앗긴 시간·닫힌 층·재작성. 톱니와 초침.
    reprieve:{name:'유예의 수문장',scene:'45',fire:function(s,t){var b=s.boss;
      // 시계: 긴 바늘과 짧은 바늘이 서로 다른 빠르기로 돌고, 열두 눈금이 퍼진다.
      if(t%420===0){var a=aim(s,b.x,b.y)+Math.PI/2;beam(s,b.x,b.y,a,{width:11,warn:76,active:300,color:CYAN,spin:pick(s,.16,.22,.3),follow:true});beam(s,b.x,b.y,a+Math.PI,{width:15,warn:76,active:300,color:WHITE,spin:-pick(s,.06,.08,.11),follow:true});}
      if(t%60===30)ring(s,b.x,b.y,12,58,-Math.PI/2+Math.floor(t/60)*.13,{color:CYAN,size:1});}},
    stolenTime:{name:'빼앗긴 시간',scene:'39',fire:function(s,t){var b=s.boss;
      // 톱니바퀴: 톱니 모양 고리가 맞물리듯 번갈아 돌며 퍼진다.
      if(t%60===0)shape(s,b.x,b.y,Shapes.star(8,.74,Math.max(2,count(s,2))),74,((t/60)%2?1:-1)*t*.006,{color:(t/60)%2?CYAN:RED,size:0});
      if(t%120===80)ring(s,b.x,b.y,pick(s,2,3,5),62,rand(s)*TAU,{size:SHAPE_PROP,color:P.gear,spin:.08});}},
    closedFloor:{name:'닫힌 층의 명령',scene:'40',fire:function(s,t){var b=s.boss,phase=t%240;
      // 층이 위에서부터 차례로 닫힌다.
      if(phase===0)row(s,250,{width:16,warn:60,active:70,color:RED});if(phase===50)row(s,380,{width:16,warn:60,active:70,color:RED});if(phase===100)row(s,510,{width:16,warn:60,active:70,color:RED});
      if(t%60===20)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,92,.45,{color:CYAN,size:1});}},
    rewrite:{name:'최초명령 재작성',scene:'46',fire:function(s,t){var b=s.boss,k,n=pick(s,2,3,4);
      // 초침처럼 한 바퀴 도는 탄 줄기와, 휘어 돌아오는 초승달
      if(t%90===0)for(k=0;k<n;k++)shape(s,b.x,b.y,Shapes.goldenSpiral(count(s,12)),104,TAU*k/n+t*.01,{color:CYAN,size:1});
      if(t%90===45)fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),1.3,96,{size:SHAPE_PROP,color:P.crescent,spin:.12,turn:.28});
      if(t%10===0)spawn(s,b.x,b.y,-Math.PI/2+t*TAU/360,60,{color:RED,size:0});}},
    // 6부 — 두 사람의 성
    castleGate:{name:'성문',scene:'48',fire:function(s,t){var b=s.boss;
      if(t%200===0){column(s,70,{width:20,warn:66,active:120,color:WHITE});column(s,W-70,{width:20,warn:66,active:120,color:WHITE});}
      if(t%84===40)ring(s,b.x,b.y,pick(s,3,4,6),82,rand(s)*TAU,{size:SHAPE_PROP,color:P['twin-blade'],spin:.2});}},
    summoned:{name:'소환된 의목사',scene:'48',fire:function(s,t){var b=s.boss;
      if(t%64===0)shape(s,b.x,b.y,Shapes.vitruvian(count(s,16)),64,t*.009,{color:WHITE,size:1});
      if(t%64===32)ring(s,b.x,b.y,count(s,14),84,t*.02,{color:PURPLE,size:0});}},
    twoMasters:{name:'두 주인의 각성',scene:'49',fire:function(s,t){var b=s.boss,every=pick(s,4,3,2);
      // 두 주인: 보스 양옆 두 자리에서 서로 반대로 도는 나선이 함께 피어난다.
      if(t%every===0){var i=t/every;spawn(s,b.x-64,b.y+6,i*GOLDEN_ANGLE,70,{color:PURPLE,size:0});spawn(s,b.x+64,b.y+6,-i*GOLDEN_ANGLE,70,{color:WHITE,size:0});}}},
    sharedCore:{name:'함께 되찾은 코어',scene:'50',fire:function(s,t){var b=s.boss,k;
      // 좌우로 갈라져 나간 쌍검이 휘어 한가운데에서 다시 만난다.
      if(t%70===0)for(k=0;k<pick(s,1,2,3);k++){spawn(s,b.x,b.y,Math.PI/2-1.2-k*.25,104,{size:SHAPE_PROP,color:P['twin-blade'],spin:.2,turn:.55});spawn(s,b.x,b.y,Math.PI/2+1.2+k*.25,104,{size:SHAPE_PROP,color:P['twin-blade'],spin:-.2,turn:-.55});}
      if(t%70===35)shape(s,b.x,b.y,Shapes.polygon(8,Math.max(2,count(s,3))),72,t*.01,{color:(t/70)%2?PURPLE:WHITE,size:1});}},
    // 7부 — 파란불 아래의 사람들
    hotel:{name:'새빛호텔',scene:'53',fire:function(s,t){var b=s.boss,phase=t%200;
      // 화재 경보: 붉은 줄과 푸른 줄이 번갈아 켜진다.
      if(phase===0)row(s,300+rand(s)*60,{width:16,warn:64,active:70,color:RED});if(phase===100)row(s,440+rand(s)*60,{width:16,warn:64,active:70,color:CYAN});
      if(t%50===25)ring(s,b.x,b.y,count(s,14),64,rand(s)*TAU,{color:(t/50)%2?RED:CYAN,size:1});}},
    fireDoor:{name:'청록빌라 방화문',scene:'54',fire:function(s,t){var i;
      // 방화문이 닫힌다: 세로 막대 사이 열린 문으로만 지나간다.
      if(t%170===0)slots(s,pick(s,2,3,4),W,24).forEach(function(x){column(s,x,{width:26,warn:70,active:80,color:CYAN});});
      if(t%9===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,48+rand(s)*36,{color:CYAN,size:0});}},
    blueLight:{name:'파란불',scene:'52',fire:function(s,t){var b=s.boss;
      // 멈춤과 출발: 고리가 멈춰 섰다가 신호가 바뀌면 다시 나아간다.
      if(t%84===0){var n=count(s,26),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,150,{color:(t/84)%2?RED:CYAN,size:1,accel:-190,min:0,at:96,mode:MODE_TURN,arg:0,speed2:84});}
      if(t%84===42)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,108,{color:WHITE,size:RICE});}},
    rooftopLoop:{name:'옥상의 순환',scene:'55',fire:function(s,t){var b=s.boss;
      // 순환: 탄이 원을 그리며 돌아 제자리로 되돌아온다.
      if(t%50===0)ring(s,b.x,b.y,count(s,14),96,rand(s)*TAU,{color:(t/50)%2?CYAN:WHITE,size:0,turn:(t/50)%2?.95:-.95,life:560});
      if(t%100===60)fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),1.2,90,{size:SHAPE_PROP,color:P.crescent,spin:.12,turn:.25});}},
    // 8부 — 사이비 합일몽세
    traitors:{name:'배신자 둘',scene:'60',fire:function(s,t){var b=s.boss,other=W-b.x;
      // 두 사람: 보스 자리와 그 맞은편 자리에서 번갈아 쏜다. 십자가는 똑바로 선 채 내려온다.
      if(t%72===0)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,96,.45,{color:YELLOW,size:1});
      if(t%72===36)bell(s,other,b.y,count(s,11),aim(s,other,b.y),1.7,96,.45,{color:CYAN,size:1});
      if(t%150===100)slots(s,pick(s,1,2,3),W,30).forEach(function(x){spawn(s,x,-30,Math.PI/2,76,{size:SHAPE_PROP,color:P.cross,life:900});});}},
    boundNightmare:{name:'하나로 묶인 악몽',scene:'56',fire:function(s,t){var b=s.boss;
      // 흩어졌던 탄이 한 점으로 묶여 든다.
      if(t%90===0){var n=count(s,28),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,170,{color:RED,size:0,accel:-180,min:0,at:64,mode:MODE_REAIM,arg:0,speed2:78});}
      if(t%90===45)ring(s,b.x,b.y,count(s,12),56,rand(s)*TAU,{color:WHITE,size:1});}},
    returning:{name:'돌아오는 기억',scene:'58',fire:function(s,t){var b=s.boss;
      // 아래로 내려갔던 탄이 멈췄다가 왔던 길로 되돌아온다.
      if(t%64===0){var n=count(s,11);for(var i=0;i<n;i++)spawn(s,b.x,b.y,Math.PI/2+(n>1?i/(n-1)-.5:0)*1.9,190,{color:WHITE,size:1,accel:-170,min:0,at:84,mode:MODE_TURN,arg:Math.PI,speed2:74});}
      if(t%128===96)ring(s,b.x,b.y,count(s,14),60,rand(s)*TAU,{color:RED,size:0});}},
    twoGoals:{name:'처음 세웠던 목표',scene:'59',fire:function(s,t){var b=s.boss,phase=t%100;
      // 두 목표: 두 자리에서 번갈아 곧게 겨눈다.
      if(phase<50&&phase%10===0)fan(s,b.x-80,b.y,pick(s,1,2,3),aim(s,b.x-80,b.y),.16,120,{color:RED,size:RICE});
      if(phase>=50&&phase%10===0)fan(s,b.x+80,b.y,pick(s,1,2,3),aim(s,b.x+80,b.y),.16,120,{color:WHITE,size:RICE});
      if(t%100===75)ring(s,b.x,b.y,count(s,16),54,rand(s)*TAU,{color:YELLOW,size:1});}},
    samong:{name:'교주의 사몽',scene:'61',fire:function(s,t){var b=s.boss,k,arms=count(s,3);
      // 끝: 광선 바퀴 사이로 눈송이와 나선이 번갈아 피어난다.
      if(t%400===0)wheel(s,pick(s,2,3,4),(Math.floor(t/400)%2?-1:1)*pick(s,.14,.2,.28),RED,270);
      if(t%11===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.03+TAU*k/arms,84,{color:RED,size:0});
      if(t%120===30)shape(s,b.x,b.y,Shapes.koch(pick(s,1,2,2)),92,t*.004,{color:WHITE,size:0});
      if(t%120===90)for(k=0;k<pick(s,2,3,4);k++)shape(s,b.x,b.y,Shapes.goldenSpiral(count(s,12)),104,TAU*k/pick(s,2,3,4)+t*.01,{color:YELLOW,size:1});}}
  };

  /* ── 스테이지. 원작 8부의 장 순서 그대로다(1부만 궁전과 병원 두 스테이지). scenes는 이 스테이지가 맡는 원작 장면 번호.
   *    mid 중간 보스 [인물, 패턴] · boss 보스 [인물, 패턴 셋 이상] · a/b 앞뒤 잡몹 구간 [잡몹, 중간 몹] ── */
  var STAGE_DATA=[
    {part:1,name:'악마화 나무의 정원',bg:'forest',scenes:['01','02','03','04','05','06','07'],
      a:[{kind:'spider',fire:'aim',color:PURPLE},{kind:'guardian',fire:'hexagon',color:PURPLE}],mid:['violet','web'],
      b:[{kind:'slime',fire:'drop',color:GREEN},{kind:'horn',fire:'cleaver',color:GREEN}],boss:['balrog','pillars','summon','fall']},
    {part:1,name:'피로 물든 병원',bg:'hospital',scenes:['08','09-1','09-2','10','11'],
      a:[{kind:'ember',fire:'aim',color:RED},null],mid:['mask','smile'],
      b:[{kind:'ember',fire:'ring',color:RED},null],boss:['lucifer','needles','craving','angelMask']},
    {part:2,name:'솔로몬의 봉인식',bg:'rings',scenes:['13','14','15','16','17','18','19','20','21','22'],
      a:[{kind:'ember',fire:'aim',color:YELLOW},{kind:'belphegor',fire:'tissue',color:YELLOW}],mid:['asmodeus','heel'],
      b:[{kind:'ember',fire:'drop',color:YELLOW},{kind:'mammon',fire:'money',color:YELLOW}],boss:['pride','cathedral','ascend','bootloader']},
    {part:3,name:'방어의 군단',bg:'nexus',scenes:['24','25','26','27','28','29'],
      a:[{kind:'drone',fire:'aim',color:CYAN},null],mid:['controller','legion'],
      b:[{kind:'drone',fire:'ring',color:CYAN},null],boss:['controller','rescue','veto','memoryGate']},
    {part:4,name:'잠들지 못하는 마을',bg:'insomnia',scenes:['31','32','33','34','35'],
      a:[{kind:'mobgoblin',fire:'aim',color:GREEN},null],mid:['goblin','roseSeal'],
      b:[{kind:'wolf',fire:'drop',color:WHITE},{kind:'knight',fire:'sixcuts',color:PURPLE}],boss:['insomnia','sleepless','openEye','puppetFog']},
    {part:5,name:'예순여섯 수문장',bg:'siren',scenes:['37','38','39','40','41','42','43','44','45','46'],
      a:[{kind:'collector',fire:'aim',color:CYAN},{kind:'guardian',fire:'gearRing',color:CYAN}],mid:['arbelia','reprieve'],
      b:[{kind:'collector',fire:'drop',color:RED},{kind:'warden',fire:'gearRing',color:RED}],boss:['siren','stolenTime','closedFloor','rewrite']},
    {part:6,name:'성 안에 소환된 의목사',bg:'chief',scenes:['48','49','50'],
      a:[{kind:'nightmare',fire:'aim',color:WHITE},null],mid:['chief','castleGate'],
      b:[{kind:'nightmare',fire:'ring',color:PURPLE},null],boss:['chief','summoned','twoMasters','sharedCore']},
    {part:7,name:'옥상의 순환',bg:'executor',scenes:['52','53','54','55'],
      a:[{kind:'nightmare',fire:'drop',color:CYAN},null],mid:['executor','hotel'],
      b:[{kind:'nightmare',fire:'aim',color:CYAN},null],boss:['executor','fireDoor','blueLight','rooftopLoop']},
    {part:8,name:'교주의 사몽',bg:'cult',scenes:['56','57','58','59','60','61'],
      a:[{kind:'leech',fire:'aim',color:RED},null],mid:['rian','traitors'],
      b:[{kind:'leech',fire:'ring',color:RED},null],boss:['cultist','boundNightmare','returning','twoGoals','samong']}
  ];
  var PLAIN=[plainSpiral,plainLissajous,plainBells,plainCatenary,plainRings,plainHypocycloid,plainSunflower,plainCardioid,plainSuperformula],PLAIN_NAMES=['spiral','lissajous','bell','catenary','rings','hypocycloid','sunflower','cardioid','superformula'],plainCount=0,STAGES=[],SEGMENTS=[];
  STAGE_DATA.forEach(function(g,index){
    var cast=[];[g.a,g.b].forEach(function(pair){pair.forEach(function(m){if(m&&cast.indexOf(m.kind)<0)cast.push(m.kind);});});
    STAGES.push({part:g.part,name:g.name,bg:g.bg,scenes:g.scenes,cast:cast,first:SEGMENTS.length});
    function card(actor,mid,spell,plainIndex,last){
      var who=ACTORS[actor];
      return spell?{kind:'card',stage:index,actor:actor,mid:mid,spell:true,name:spell.name,scene:spell.scene,hp:mid?420:last?600:520,time:mid?26:last?36:30,fire:spell.fire}
        :{kind:'card',stage:index,actor:actor,mid:mid,spell:false,name:'',plain:PLAIN_NAMES[plainCount%9],hp:mid?200:240,time:mid?16:18,fire:PLAIN[plainCount++%9](who.c1,who.c2)};
    }
    SEGMENTS.push({kind:'wave',stage:index,duration:760,script:waveColumns(g.a[0],g.a[1])});
    SEGMENTS.push(card(g.mid[0],true,null,index,false));SEGMENTS.push(card(g.mid[0],true,spells[g.mid[1]],0,false));
    SEGMENTS.push({kind:'wave',stage:index,duration:760,script:waveDives(g.b[0],g.b[1])});
    for(var k=1;k<g.boss.length;k++){SEGMENTS.push(card(g.boss[0],false,null,index+k,false));SEGMENTS.push(card(g.boss[0],false,spells[g.boss[k]],0,k===g.boss.length-1));}
  });
  var CARD_TOTAL=SEGMENTS.filter(function(g){return g.kind==='card'&&g.spell;}).length;

  /* options: {difficulty, seed, stage(시작 스테이지), segment(시작 구간), compact(휴대폰 모드), bossOnly(보스 체험: 그 스테이지의 보스전만)} */
  function createRun(options){
    options=options||{};var difficulty=DIFFICULTY[options.difficulty]?options.difficulty:'normal',rules=DIFFICULTY[difficulty],compact=!!options.compact;
    var startSeg=Number.isInteger(options.segment)&&SEGMENTS[options.segment]?options.segment:Number.isInteger(options.stage)&&STAGES[options.stage]?STAGES[options.stage].first:0;
    var s={revision:42,difficulty:difficulty,rules:rules,compact:compact,density:rules.density*(compact?COMPACT_DENSITY:1),sizeScale:compact?COMPACT_SIZE:1,cap:compact?COMPACT_CAP:CAP,
      seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'break',stageTick:BREAK_TICKS-30,seg:startSeg-1,segTick:0,stageIndex:SEGMENTS[startSeg].stage,spellNumber:0,
      player:{x:W/2,y:H-84,hp:rules.hp,maxHp:rules.hp,invulnerableUntil:0,r:rules.radius,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,actor:'',name:'',mid:false,hitTick:-99,leaving:false,present:false},
      bossOnly:!!options.bossOnly,rushStage:SEGMENTS[startSeg].stage,bombs:rules.bombs,gauge:0,spellClean:false,captures:0,itemsTaken:0,lane:undefined,
      n:0,dropped:0,peak:0,score:0,graze:0,hits:0,kills:0,cleared:0,timeouts:0,events:[],cancelled:[],pops:[],lasers:[],mobs:[],warned:false,sn:0,itemCount:0};
    ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin'].forEach(function(k){s[k]=new Float32Array(CAP);});
    ['bage','blife','bat'].forEach(function(k){s[k]=new Uint16Array(CAP);});
    ['bsize','bcolor','bgrazed','bmode','bgen'].forEach(function(k){s[k]=new Uint8Array(CAP);});
    s.sx=new Float32Array(SHOT_CAP);s.sy=new Float32Array(SHOT_CAP);s.shoming=new Uint8Array(SHOT_CAP);
    s.ix=new Float32Array(ITEM_CAP);s.iy=new Float32Array(ITEM_CAP);s.ivy=new Float32Array(ITEM_CAP);s.ikind=new Uint8Array(ITEM_CAP);
    // 구간을 직접 지정하면(연습·검사) 그 구간에서 바로 시작한다.
    if(Number.isInteger(options.segment)&&SEGMENTS[options.segment]){s.seg=startSeg;s.stageTick=0;s.stage=SEGMENTS[startSeg].kind==='wave'?'wave':'intro';}
    return s;
  }
  function removeBullet(s,i){
    var j=--s.n;if(i===j)return;
    s.bx[i]=s.bx[j];s.by[i]=s.by[j];s.ba[i]=s.ba[j];s.bs[i]=s.bs[j];s.bturn[i]=s.bturn[j];s.bacc[i]=s.bacc[j];s.bmin[i]=s.bmin[j];s.bmax[i]=s.bmax[j];s.barg[i]=s.barg[j];s.bs2[i]=s.bs2[j];s.bspin[i]=s.bspin[j];
    s.bage[i]=s.bage[j];s.blife[i]=s.blife[j];s.bat[i]=s.bat[j];s.bsize[i]=s.bsize[j];s.bcolor[i]=s.bcolor[j];s.bgrazed[i]=s.bgrazed[j];s.bmode[i]=s.bmode[j];s.bgen[i]=s.bgen[j];
  }
  // 화면의 탄과 광선을 모두 지우고, 지운 탄 자리를 연출용으로 남긴다(최대 320개). 지운 탄 수를 돌려준다.
  function cancelAll(s){
    var n=s.n;for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bsize[i]===SHAPE_PROP?WHITE:s.bcolor[i]);
    s.n=0;s.lasers.length=0;return n;
  }
  /* 아이템 하나를 떨군다. kind 0 점수, 1 폭탄 조각. 위로 살짝 튀었다가 천천히 내려온다. */
  function dropItem(s,x,y,kind){if(s.itemCount>=ITEM_CAP)return;var i=s.itemCount++;s.ix[i]=Math.max(10,Math.min(W-10,x));s.iy[i]=y;s.ivy[i]=-1.6;s.ikind[i]=kind||0;}
  function fillGauge(s){while(s.gauge>=GAUGE_FULL){s.gauge-=GAUGE_FULL;if(s.bombs<MAX_BOMBS){s.bombs++;note(s,'bombGain');}}}
  function updateItems(s){
    var p=s.player,pull=p.y<AUTO_COLLECT_Y,reach=p.focus?ITEM_REACH+10:ITEM_REACH;
    for(var i=s.itemCount-1;i>=0;i--){
      var dx=p.x-s.ix[i],dy=p.y-s.iy[i],d=Math.sqrt(dx*dx+dy*dy);
      // 화면 위쪽으로 올라가 있으면 모든 아이템이 빨려 온다. 아니면 가까운 것만 끌려온다.
      if(pull||d<60){var step=pull?ITEM_PULL:5;if(d>step){s.ix[i]+=dx/d*step;s.iy[i]+=dy/d*step;d-=step;}else d=0;}
      else{s.ivy[i]=Math.min(1.5,s.ivy[i]+.05);s.iy[i]+=s.ivy[i];}
      if(d<reach){
        // 높은 곳에서 먹을수록 값이 크다.
        if(s.ikind[i]===1)s.gauge+=25;else s.score+=100+Math.round(Math.max(0,H-p.y)*1.5);
        s.itemsTaken++;note(s,'item');
      }else if(s.iy[i]<=H+20)continue;
      var j=--s.itemCount;s.ix[i]=s.ix[j];s.iy[i]=s.iy[j];s.ivy[i]=s.ivy[j];s.ikind[i]=s.ikind[j];
    }
    fillGauge(s);
  }
  function killMob(s,k){var m=s.mobs[k];s.score+=m.score;s.kills++;s.pops.push(m.x,m.y,m.elite?1:0);note(s,'kill');
    for(var i=0;i<(m.elite?7:1);i++)dropItem(s,m.x+(m.elite?(i-3)*9:0),m.y,m.elite&&i===3?1:0);s.mobs.splice(k,1);}
  function useBomb(s){
    if(s.bombs<=0||s.stage==='won'||s.stage==='lost')return;
    s.bombs--;s.spellClean=false;s.score+=cancelAll(s)*10;s.player.invulnerableUntil=Math.max(s.player.invulnerableUntil,s.tick+BOMB_TICKS);note(s,'bomb');
    if(s.stage==='card')s.boss.hp-=BOMB_BOSS_DAMAGE;
    for(var k=s.mobs.length-1;k>=0;k--){var m=s.mobs[k];m.hp-=BOMB_MOB_DAMAGE;m.hitTick=s.tick;if(m.hp<=0)killMob(s,k);}
  }
  function segment(s){return SEGMENTS[s.seg];}
  /* 다음 구간으로. 맵이 바뀌면 난이도 규칙대로 목숨을 채우고, 인물이 바뀌면 이전 보스를 내보낸다. */
  function advance(s){
    var prev=segment(s),at=s.seg+1,p=s.player;
    // 보스 체험: 잡몹 구간을 건너뛰고, 고른 스테이지의 중간 보스와 보스만 싸운 뒤 끝난다.
    if(s.bossOnly){while(SEGMENTS[at]&&SEGMENTS[at].kind==='wave')at++;if(SEGMENTS[at]&&SEGMENTS[at].stage!==s.rushStage)at=SEGMENTS.length;}
    var next=SEGMENTS[at];
    if(!next){s.stage='won';s.stageTick=0;note(s,'win');return;}
    s.seg=at;s.segTick=0;s.stageTick=0;s.lane=undefined;
    if(next.stage!==s.stageIndex){s.stageIndex=next.stage;var heal=s.rules.mapHeal;if(heal&&p.hp<p.maxHp){p.hp=heal<0?p.maxHp:Math.min(p.maxHp,p.hp+heal);note(s,'extend');}note(s,'map');}
    if(next.kind==='wave'){s.boss.leaving=s.boss.present;s.stage='wave';note(s,'wave');return;}
    if(!prev||prev.kind!=='card'||prev.actor!==next.actor||!s.boss.present){s.boss.leaving=s.boss.present;s.stage='intro';}else s.stage='break';
  }
  function enter(s,actor){var b=s.boss;b.actor=actor;b.name=ACTORS[actor].name;b.mid=!!segment(s).mid;b.present=true;b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=132;s.stageTick=0;note(s,'entrance');}
  function beginCard(s){var card=segment(s),b=s.boss;b.maxHp=b.hp=card.hp;b.mid=!!card.mid;s.stage='card';s.stageTick=0;s.segTick=0;s.spellClean=!!card.spell;if(card.spell){s.spellNumber++;note(s,'card');}else note(s,'plain');}
  function endCard(s,defeated){
    var card=segment(s),left=Math.max(0,card.time-s.segTick*TICK),wiped=cancelAll(s),b=s.boss;
    if(defeated){s.cleared++;s.score+=Math.round(left)*300+wiped*30;for(var i=0;i<(card.spell?10:5);i++)dropItem(s,b.x+(i-4.5)*12,b.y+((i*37)%30)-15,card.spell&&i===5?1:0);}else s.timeouts++;
    // 이름 붙은 패턴을 폭탄 없이, 맞지 않고 넘기면 보너스
    if(card.spell&&defeated&&s.spellClean){s.captures++;s.score+=20000+card.stage*5000;note(s,'capture');}
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
    if(!(len<1e9)){dx=0;dy=0;len=0;} // NaN·무한대 입력은 버린다
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
        // 화면 위쪽에 있을 때만 쏜다(영웅 코앞 기습 방지).
        if(m.y<300&&m.y>0&&(m.age===m.first||m.every&&m.age>m.first&&(m.age-m.first)%m.every===0)){MOB_FIRE[m.fire](s,m);m.shots++;}
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
        hit=true;m.hp--;m.hitTick=s.tick;if(m.hp<=0)killMob(s,k);
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
        if(l.burst)for(var d=70;d<620;d+=Math.round(64/s.density)){var bx=l.x+cos*d,by=l.y+sin*d;if(bx<-10||bx>W+10||by>H+10)break;spawn(s,bx,by,l.angle+Math.PI/2,34,{color:l.color,size:RICE});spawn(s,bx,by,l.angle-Math.PI/2,34,{color:l.color,size:RICE});}
      }
      if(l.age<l.warn||l.age>=l.warn+l.active)continue;
      var px=p.x-l.x,py=p.y-l.y,along=px*cos+py*sin,dist=along<0?Math.sqrt(px*px+py*py):Math.abs(px*sin-py*cos);
      if(along>BEAM_LENGTH)continue;
      if(dist<l.width*.5*BEAM_HIT+p.r)struck=true;
      else if(!l.grazed&&dist<l.width*.5+GRAZE_MARGIN){l.grazed=true;grazed++;}
    }
    if(!s.lasers.length)s.warned=false;
    if(fired)note(s,'laserFire');
    if(grazed){s.graze+=grazed;s.gauge+=grazed*2;s.score+=grazed*40;note(s,'graze');}
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
      var dx=x-px,dy=y-py,radius=bulletRadius(s,i),d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN;
      if(d2>reach*reach)continue;
      var hitReach=radius*hitScale+p.r;
      if(d2<hitReach*hitReach)struck=true;
      else if(!s.bgrazed[i]){s.bgrazed[i]=1;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.gauge+=grazed;s.score+=grazed*20;note(s,'graze');}
    return struck;
  }
  /* 한 틱(1/60초) 진행. input: {dx,dy,focus,bomb} — dx,dy는 이번 틱에 움직일 픽셀, focus는 저속 이동, bomb은 이번 틱에 폭탄 사용. */
  function step(s,input){
    if(s.stage==='won'||s.stage==='lost'){s.stageTick++;return s;}
    s.tick++;s.stageTick++;movePlayer(s,input);moveBoss(s);
    if(input&&input.bomb)useBomb(s);
    var seg=segment(s),b=s.boss;
    if(s.stage==='break'){if(s.stageTick>=BREAK_TICKS){if(seg&&seg.kind==='card'&&b.present)beginCard(s);else advance(s);}}
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
      if(t>=FIRE_DELAY)seg.fire(s,t-FIRE_DELAY); // 패턴 이름이 뜨는 동안은 쏘지 않는다
      var left=seg.time-s.segTick*TICK;
      if(seg.spell&&left<=10&&left>0&&s.segTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    updateMobs(s);updateShots(s);
    if(s.stage==='card'&&b.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&s.segTick*TICK>=segment(s).time)endCard(s,false);
    var p=s.player,byBeam=updateLasers(s),byBullet=updateBullets(s);
    updateItems(s);
    if((byBeam||byBullet)&&s.tick>=p.invulnerableUntil&&s.stage!=='won'){
      p.hp--;s.hits++;s.spellClean=false;p.invulnerableUntil=s.tick+INVULN_TICKS;cancelAll(s);note(s,'hurt');
      // 목숨이 남았으면 폭탄이 기본 개수까지 다시 찬다.
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}else if(s.bombs<s.rules.bombs)s.bombs=s.rules.bombs;
    }
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function timeLeft(s){var seg=segment(s);return s.stage==='card'?Math.max(0,seg.time-s.segTick*TICK):0;}
  var api={revision:42,WIDTH:W,HEIGHT:H,CAP:CAP,COMPACT_CAP:COMPACT_CAP,LASER_CAP:LASER_CAP,MOB_CAP:MOB_CAP,ITEM_CAP:ITEM_CAP,GOLDEN_ANGLE:GOLDEN_ANGLE,GAUGE_FULL:GAUGE_FULL,AUTO_COLLECT_Y:AUTO_COLLECT_Y,
    SEGMENTS:SEGMENTS,STAGES:STAGES,ACTORS:ACTORS,MOBS:MOBS,PROPS:PROPS,PALETTE:PALETTE,CARD_TOTAL:CARD_TOTAL,DIFFICULTY:DIFFICULTY,SIZE_RADIUS:SIZE_RADIUS,SHAPE_PROP:SHAPE_PROP,
    BLOOM_TICKS:BLOOM_TICKS,BEAM_FADE:BEAM_FADE,BEAM_HIT:BEAM_HIT,Shapes:Shapes,createRun:createRun,step:step,timeLeft:timeLeft,bulletRadius:bulletRadius,dropItem:dropItem};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);
