/* 합일 v43 · 제1부 — 마지막 수호자 EGO. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다.
 * 궁전 구간(01~07)은 정원·동굴·늪·성·묘지·불길의 따뜻하고 탁한 색, 병원 구간(08~11)은 형광등 아래의 차가운 청록·남색이다.
 * 입문부라서 01~03은 느리고 성기게, 08부터 조금씩 촘촘해진다. */
(function(root){
  'use strict';
  var part={part:1,
    actors:{
      p1_tree:{name:'악마화 나무',c1:2,c2:5},
      p1_horn:{name:'뿔악마',c1:5,c2:0},
      p1_chaser:{name:'핏빛 추격자',c1:0,c2:2},
      p1_comrade:{name:'동료의 악마화 잔상',c1:8,c2:2},
      p1_gate:{name:'문지기',c1:0,c2:6},
      p1_staff:{name:'의료진',c1:8,c2:4},
      p1_seraph:{name:'초천사',c1:6,c2:8}},
    mobs:{
      p1_root:{hp:5,r:14,score:300},      // 뿌리
      p1_reed:{hp:5,r:14,score:300},      // 사람 얼굴을 닮은 수초
      p1_face:{hp:6,r:13,score:320},      // 의료진 얼굴 위로 겹친 악마의 얼굴(가면 조각)
      p1_vial:{hp:6,r:12,score:320},      // 약병
      p1_nurse:{hp:80,r:20,score:3200,elite:true}}, // 주사기를 든 간호사(중간 몹)
    props:[{key:'p1_syringe',radius:9},{key:'p1_shard',radius:12}],
    build:function(K){
      var W=K.W,TAU=K.TAU,PI=Math.PI,DOWN=Math.PI/2,R=K.RED,PU=K.PURPLE,C=K.CYAN,G=K.GREEN,Y=K.YELLOW,WH=K.WHITE,RICE=K.RICE,PROP=K.SHAPE_PROP;
      function clamp(v,a,b){return v<a?a:v>b?b:v;}
      // 얼굴 하나: 작은 고리(윤곽)와 두 눈이 한 덩어리로 같은 방향·속도로 움직인다.
      function face(s,x,y,a,v,color,r){
        for(var k=0;k<8;k++){var q=TAU*k/8;K.spawn(s,x+Math.cos(q)*r,y+Math.sin(q)*r,a,v,{color:color,size:0});}
        K.spawn(s,x-r*.42,y-r*.2,a,v,{color:color,size:0});K.spawn(s,x+r*.42,y-r*.2,a,v,{color:color,size:0});
      }
      /* 잡몹 구간 대본: [시작 틱, 끝 틱, 간격, 함수(s,i)] 목록. 정해진 틱마다 i번째로 부른다. */
      function seq(list,duration){return K.wave(function(s,t){for(var k=0;k<list.length;k++){var e=list[k];if(t>=e[0]&&t<e[1]&&(t-e[0])%e[2]===0)e[3](s,(t-e[0])/e[2]);}},duration);}
      function M(s,kind,x,y,o){K.mob(s,kind,x,y,o);}

      /* ── 몹의 공격 ── */
      var mobFire={
        // 뿌리 끝에서 검은 수액이 한두 방울 떨어진다.
        p1_sap:function(s,m){K.fan(s,m.x,m.y+8,K.pick(s,2,2,3),DOWN,.5,56,{color:m.color,size:0});},
        // 늪의 거품: 크고 느린 거품이 비스듬히 휘며 가라앉는다.
        p1_bubble:function(s,m){K.spawn(s,m.x,m.y+6,DOWN+(K.rand(s)-.5)*.7,40,{color:m.color,size:4,turn:(K.rand(s)<.5?-1:1)*.22,life:900});if(s.difficulty!=='gentle')K.spawn(s,m.x,m.y,K.aim(s,m.x,m.y),70,{color:m.color,size:0});},
        // 검은 재: 아래로 퍼지는 느린 세 갈래
        p1_ash:function(s,m){K.fan(s,m.x,m.y,K.pick(s,2,3,4),DOWN+(K.rand(s)-.5)*.3,.7,52,{color:m.color,size:0});},
        // 약병에서 떨어진 방울이 셋으로 갈라진다.
        p1_drip:function(s,m){K.spawn(s,m.x,m.y+6,DOWN,68,{color:m.color,size:1,at:44,mode:K.MODE_BRANCH,arg:3,gen:1,speed2:58});},
        // 얼굴: 작은 고리 하나와 눈길 한 줄
        p1_gaze:function(s,m){K.ring(s,m.x,m.y,K.pick(s,5,6,8),54,K.rand(s)*TAU,{color:m.color,size:0});K.spawn(s,m.x,m.y,K.aim(s,m.x,m.y),88,{color:WH,size:RICE});},
        // 간호사: 주사기를 겨누고, 차가운 고리를 남긴다.
        p1_syringe:function(s,m){K.fan(s,m.x,m.y,K.pick(s,2,3,4),K.aim(s,m.x,m.y),.8,88,{size:PROP,color:K.P.p1_syringe});K.ring(s,m.x,m.y,K.count(s,10),50,K.rand(s)*TAU,{color:m.color,size:1});},
        // 사슬: 한 방향으로 길게 늘어진 탄 줄
        p1_chain:function(s,m){var a=K.aim(s,m.x,m.y),n=K.pick(s,1,2,3);for(var k=0;k<n;k++)for(var j=0;j<5;j++)K.spawn(s,m.x,m.y,a+(k-(n-1)/2)*.45,54+j*12,{color:m.color,size:j?0:1});}
      };

      /* ── 이름 붙은 패턴 ── */
      // 던지기: 큰 기물이 날아가고, 같은 방향으로 조금씩 느린 구슬이 따라붙어 꼬리가 된다.
      function toss(s,x,y,a,v,prop,color,beads,spin){K.spawn(s,x,y,a,v,{size:PROP,color:K.P[prop],spin:spin||0});for(var j=1;j<=beads;j++)K.spawn(s,x,y,a,v*(1-j*.075),{color:color,size:j%3?0:1});}
      // 휘두르기: 칼끝이 지나간 각도마다 빠르기가 다른 탄 몇 겹을 남겨, 호를 그리며 펼쳐지는 칼날 물결이 된다.
      function swing(s,x,y,a,layers,v0,dv,color,size){for(var j=0;j<layers;j++)K.spawn(s,x,y,a,v0+j*dv,{color:color,size:size});}

      /* ── 이름 붙은 패턴. 인물마다 원작에 나오는 무기·도구(뿌리, 보라검, 뿔, 사슬, 채찍, 발록의 검, 주사기, 권능, 가면 조각, 검날)를 탄의 모양으로 그린다. ── */
      var spells={
        // 01 악마화 나무의 정원 — 뿌리가 다가오고, 가장 굵은 뿌리를 벤다. (도구: 뿌리)
        p1_roots:{name:'다가오는 뿌리',fire:function(s,t){var b=s.boss;
          // 그림: 위에서 내려온 뿌리가 두 갈래, 네 갈래로 갈라지며 자라 내려온다.
          if(t%70===0){var n=K.pick(s,3,4,5),step=W/n,off=K.rand(s)*step;for(var k=0;k<n;k++)K.spawn(s,(off+k*step)%W,-10,DOWN+(K.rand(s)-.5)*.3,64,{color:PU,size:2,at:80,mode:K.MODE_BRANCH,arg:2,gen:K.pick(s,2,2,3),speed2:56});}
          if(t%80===40)K.ring(s,b.x,b.y,K.count(s,13),48,K.rand(s)*TAU,{color:G,size:1});}},
        p1_thick:{name:'가장 굵은 뿌리',fire:function(s,t){var b=s.boss,ph=t%150,j;
          // 그림(내려치기): 가장 굵은 뿌리가 세로로 내리꽂히고(광선), 위에서 떨어진 뿌리 끝은 바닥 가까이에서 양옆으로 갈라져 기어간다.
          if(ph===0){s.p1x=50+K.rand(s)*260;K.column(s,s.p1x,{width:34,warn:84,active:60,color:PU});}
          if(ph===60||ph===110){var x=30+K.rand(s)*300,at=Math.round(15000/(70*s.rules.speed)),n=K.pick(s,4,5,7);
            for(j=0;j<n;j++){K.spawn(s,x,-12,DOWN,70,{color:j%2?PU:G,size:j?0:2,at:at,mode:K.MODE_TURN,arg:DOWN-.12,speed2:34+j*11});K.spawn(s,x,-12,DOWN,70,{color:j%2?PU:G,size:j?0:2,at:at,mode:K.MODE_TURN,arg:-DOWN+.12,speed2:34+j*11});}}
          if(ph===130)K.fan(s,s.p1x,-10,K.count(s,7),DOWN,1,56,{color:PU,size:1});
          if(t%50===25)K.spawn(s,b.x,b.y,DOWN+(K.rand(s)-.5)*1.4,72,{color:G,size:2,at:60,mode:K.MODE_SPLIT,arg:K.count(s,9),speed2:48});}},

        // 02 거미동굴 — 흰 날개, 여덟 다리의 실, 굶주림과 두려움, 사랑받지 못한 마음, 무아지경 (무기: 보라검)
        p1_wings:{name:'흰 날개',fire:function(s,t){var b=s.boss;
          // 그림: 보스 양옆에서 흰 날개 두 장이 펼쳐졌다가 안쪽으로 접힌다.
          if(t%50===0)for(var side=-1;side<=1;side+=2)K.fan(s,b.x+side*46,b.y-6,K.count(s,7),DOWN-side*1.05,1.1,78,{color:WH,size:RICE,turn:side*.38});
          if(t%100===75)K.ring(s,b.x,b.y,K.count(s,12),52,K.rand(s)*TAU,{color:PU,size:1});}},
        p1_hunger:{name:'굶주림과 두려움',fire:function(s,t){var b=s.boss,ph=t%96;
          // 그림: 굶주림은 세 번 연달아 무는 붉은 쌀알, 두려움은 떨며 번지는 보라 고리.
          if(ph===0)s.p1a=K.aim(s,b.x,b.y);
          if(ph===0||ph===10||ph===20)K.fan(s,b.x,b.y,K.count(s,5),s.p1a,.8,104,{color:R,size:RICE});
          if(ph===48){var n=K.count(s,20),o=K.rand(s)*TAU;for(var i=0;i<n;i++)K.spawn(s,b.x,b.y,o+TAU*i/n,54,{color:PU,size:1,turn:i%2?.45:-.45});}}},
        p1_unloved:{name:'사랑받지 못한 마음',fire:function(s,t){var b=s.boss,i;
          // 그림: 하트 모양 탄 무리가 커지다 가운데에서 둘로 갈라져 멀어진다.
          if(t%80===0){var pts=K.Shapes.cardioid(K.count(s,30));for(i=0;i<pts.length;i+=2){var px=pts[i],py=-pts[i+1];K.spawn(s,b.x,b.y,Math.atan2(py,px),72*Math.sqrt(px*px+py*py),{color:i%4?R:PU,size:0,at:66,mode:K.MODE_TURN,arg:px<0?.55:-.55,speed2:62});}}
          if(t%80===40)K.ring(s,b.x,b.y,K.count(s,12),46,K.rand(s)*TAU,{color:PU,size:1});}},
        p1_trance:{name:'무아지경',time:34,fire:function(s,t){var b=s.boss,ph=t%90,dir=Math.floor(t/90)%2?-1:1;
          // 그림(무기 보라검): 몸이 기억하는 칼춤. 보라검이 좌우로 번갈아 크게 휘둘려 호 모양 칼날 물결이 펼쳐지고, 내던진 보라검 뒤로 보라 구슬 꼬리가 따라간다.
          if(ph<30&&ph%2===0)swing(s,b.x,b.y,DOWN+dir*(1.3-2.6*ph/28),K.pick(s,2,2,3),52,16,ph%4?PU:WH,ph%4?0:RICE);
          if(ph===50){var a=K.aim(s,b.x,b.y),n=K.pick(s,1,2,3);for(var k=0;k<n;k++)toss(s,b.x,b.y,a+(k-(n-1)/2)*.5,110,'sword-violet',PU,K.pick(s,5,7,9),0);}
          if(ph===70)K.ring(s,b.x,b.y,K.count(s,12),44,K.rand(s)*TAU,{color:WH,size:1});}},

        // 03 늪지대의 뿔악마 — 수초, 물속의 손, 뿔에 매달린 머리, 익숙한 얼굴들, 버리고 온 것들 (무기: 머리를 매단 뿔)
        p1_reeds:{name:'얼굴을 닮은 수초',fire:function(s,t){var n=K.pick(s,3,3,4),k;
          // 그림: 물결치는 수초 줄기가 위에서 늘어지고, 그 사이로 얼굴 모양 탄 무리가 떠내려온다.
          if(t%K.pick(s,14,11,8)===0)for(k=0;k<n;k++)K.spawn(s,(k+.5)*W/n+24*Math.sin(t*.028+k*1.7),-8,DOWN,56,{color:G,size:0});
          if(t%K.pick(s,110,90,70)===40)face(s,50+K.rand(s)*260,-26,DOWN,44,WH,13);}},
        p1_hands:{name:'물속에서 올라온 손',fire:function(s,t){var b=s.boss;
          // 그림: 다섯 손가락 모양 탄이 아래로 뻗어 내려가 발목 높이에서 멈추고, 다시 천천히 위로 올라간다.
          if(t%40===0)for(var h=0;h<K.pick(s,1,1,2);h++){var x=36+K.rand(s)*288,at=Math.round(26000/(110*s.rules.speed));for(var f=0;f<5;f++)K.spawn(s,x+(f-2)*10,-10-(2-Math.abs(f-2))*8,DOWN,110,{color:G,size:RICE,at:at,mode:K.MODE_TURN,arg:PI,speed2:38,life:at+700});}
          if(t%80===60)K.bell(s,b.x,b.y,K.count(s,10),K.aim(s,b.x,b.y),1.5,80,.45,{color:R,size:1});}},
        p1_heads:{name:'수호자들의 머리',fire:function(s,t){var b=s.boss,sw,L=K.pick(s,1,2,2);
          // 그림(무기 뿔): 뿔 두 끝에 매달린 머리가 진자처럼 흔들리며 탄을 흘리고, 무거운 머리(거품)가 떨어진다.
          if(t%K.pick(s,6,5,4)===0&&t%160<116){sw=Math.sin(t*.045)*.95;for(var j=0;j<L;j++){K.spawn(s,b.x-34,b.y-18,DOWN+sw,84-j*22,{color:j?G:WH,size:RICE});K.spawn(s,b.x+34,b.y-18,DOWN-sw,84-j*22,{color:j?G:WH,size:RICE});}}
          if(t%70===35)for(var side=-1;side<=1;side+=2)K.spawn(s,b.x+side*34,b.y-18,DOWN+side*.25,44,{color:R,size:4,life:900});
          if(t%160===130)K.ring(s,b.x,b.y,K.count(s,14),50,K.rand(s)*TAU,{color:G,size:0});}},
        p1_faces:{name:'익숙한 얼굴들',fire:function(s,t){var b=s.boss,every=K.pick(s,96,88,72);
          // 그림: 얼굴 모양 탄 무리가 부채꼴로 다가온다. 가운데 얼굴은 곧장 나를 본다.
          if(t%every===0){var n=K.pick(s,3,4,6),a=K.aim(s,b.x,b.y);for(var k=0;k<n;k++)face(s,b.x,b.y+10,a+(k-(n-1)/2)*.42,62,k%2?WH:G,12);}
          if(t%every===44)K.ring(s,b.x,b.y,K.count(s,12),52,K.rand(s)*TAU,{color:R,size:0});}},
        p1_left:{name:'내가 버리고 온 것들',time:34,fire:function(s,t){var b=s.boss;
          // 그림: 뿔악마가 늪을 가로지르며 탄을 떨궈 두고, 멈춰 있던 탄들이 잠시 뒤 한꺼번에 아래로 쏟아진다.
          b.targetX=180+120*Math.sin(t*.011);
          if(t%K.pick(s,5,4,3)===0){var a=DOWN+(K.rand(s)-.5)*2.6;K.spawn(s,b.x,b.y,a,170,{color:t%40<20?G:WH,size:0,accel:-150,min:0,at:150,mode:K.MODE_TURN,arg:DOWN-a+(K.rand(s)-.5)*.3,speed2:50});}
          if(t%100===50)K.fan(s,b.x,b.y,K.count(s,6),K.aim(s,b.x,b.y),.9,84,{color:R,size:1});}},

        // 04 무너진성 — 검은 재, 끊어진 봉인 사슬 (도구: 추격하는 몸과 봉인 사슬)
        p1_ash:{name:'검은 재',fire:function(s,t){var b=s.boss,wind=Math.floor(t/200)%2?1:-1;
          // 그림: 바람이 바뀔 때마다 검은 재가 비스듬히 날리고, 추격자는 내 머리 위를 따라오며 내리찍는다.
          b.targetX=clamp(s.player.x,70,W-70);
          if(t%K.pick(s,4,3,2)===0)K.spawn(s,((t*53)%W)+(K.rand(s)-.5)*14,-8,DOWN+wind*.4+(K.rand(s)-.5)*.16,56+K.rand(s)*18,{color:K.rand(s)<.3?WH:PU,size:0});
          if(t%60===30)K.fan(s,b.x,b.y,K.count(s,4),DOWN,.6,96,{color:R,size:RICE});}},
        p1_chains:{name:'끊어진 봉인 사슬',fire:function(s,t){var b=s.boss,cells=K.pick(s,13,14,16);
          // 그림(도구 봉인 사슬): 두 겹 사슬이 내려오다 끊어진 자리에서 양쪽으로 갈라져 흩어진다.
          if(t%64===0){var gap=1+Math.floor(K.rand(s)*(cells-4)),at=K.pick(s,230,200,170);for(var i=0;i<cells;i++){if(i>=gap&&i<=gap+1)continue;for(var j=0;j<2;j++)K.spawn(s,(i+.5+j*.5)*W/cells,-10-j*12,DOWN,60,{color:(i+j)%2?R:WH,size:j?0:1,at:at,mode:K.MODE_TURN,arg:i<gap?.6:-.6,speed2:64});}}
          if(t%50===25){b.targetX=clamp(s.player.x,70,W-70);K.fan(s,b.x,b.y,K.count(s,3),K.aim(s,b.x,b.y),.45,96,{color:PU,size:RICE});}}},

        // 05 시체들이 되살아난 밤 — 시체 언덕, 익숙한 모습의 동료들(잔상)
        p1_hill:{name:'시체들로 이루어진 언덕',fire:function(s,t){var b=s.boss,cells=K.pick(s,14,15,18);
          // 그림: 가운데가 볼록한 언덕 모양 줄이 두 겹으로 내려온다. 언덕마다 세 칸이 비어 있다.
          if(t%K.pick(s,60,52,44)===0){var c=60+K.rand(s)*240,gap=Math.floor(K.rand(s)*(cells-2));for(var i=0;i<cells;i++){if(i>=gap&&i<gap+3)continue;var x=(i+.5)*W/cells,u=(x-c)/80,h=56*Math.exp(-u*u);K.spawn(s,x,-12-h,DOWN,58,{color:i%3?WH:PU,size:1});K.spawn(s,x,-26-h,DOWN,58,{color:PU,size:0});}}
          if(t%120===90)K.fan(s,b.x,b.y,K.count(s,3),K.aim(s,b.x,b.y),.5,94,{color:PU,size:RICE});}},
        p1_echo:{name:'익숙한 모습의 동료들',fire:function(s,t){var b=s.boss,ph=t%96;
          // 그림: 같은 공격이 조금씩 늦게, 자리를 옮겨 두 번 더 되풀이된다(잔상).
          if(ph===0)s.p1a=K.aim(s,b.x,b.y);
          if(ph===0||ph===16||ph===32)K.bell(s,b.x+(ph===16?-58:ph===32?58:0),b.y,K.count(s,11),s.p1a,1.7,88,.45,{color:ph?PU:WH,size:ph?0:1});
          if(t%96===64)K.ring(s,b.x,b.y,K.count(s,12),48,K.rand(s)*TAU,{color:WH,size:0});}},

        // 06 일곱 기둥 — 기둥에 남은 불씨, 채찍 자국, (기존) 일곱 기둥 (무기: 채찍)
        p1_embers:{name:'기둥에 남은 불씨',fire:function(s,t){var b=s.boss;
          // 그림: 일곱 기둥 자리에서만 불씨가 흔들리며 떨어진다. 기둥 사이가 길이다.
          if(t%K.pick(s,5,4,2)===0){var k=Math.floor(K.rand(s)*7);K.spawn(s,30+k*50+(K.rand(s)-.5)*10,-8,DOWN,58+K.rand(s)*24,{color:K.rand(s)<.5?R:Y,size:0,turn:(K.rand(s)-.5)*.4});}
          if(t%80===40)K.spawn(s,b.x,b.y,K.aim(s,b.x,b.y),80,{color:R,size:2,at:54,mode:K.MODE_SPLIT,arg:K.count(s,10),speed2:56});}},
        p1_whip:{name:'채찍 자국',fire:function(s,t){var b=s.boss,ph=t%110,L=K.pick(s,2,3,4);
          // 그림(무기 채찍): 채찍이 화면을 가로질러 휘둘린다. 빠르기가 다른 탄 몇 겹이 휘어지는 곡선 줄이 되고, 그 자국이 잠시 멈춰 남았다가 아래로 떨어진다.
          if(ph<36&&ph%2===0){var u=ph/34,dir=Math.floor(t/110)%2?1:-1,a=DOWN+dir*(1.15-2.3*u);for(var j=0;j<L;j++)K.spawn(s,b.x,b.y,a,70+u*100+j*18,{color:j%2?Y:R,size:RICE,turn:-dir*.3,accel:-130,min:0,at:110,mode:K.MODE_TURN,arg:DOWN-a,speed2:48+j*6});}
          if(t%110===80)K.ring(s,b.x,b.y,K.count(s,12),52,K.rand(s)*TAU,{color:Y,size:1});}},

        // 07 추락 — 발록의 검, 불덩이, (기존) 소환진, 검은 소용돌이, (기존) 추락 (무기: 발록의 검)
        p1_sword:{name:'발록의 검',fire:function(s,t){var b=s.boss,ph=t%160;
          // 그림(무기 발록의 검): 검이 공간을 가른다. 엇갈린 참격 두 줄이 그어지고, 검이 크게 휘둘려 불꽃 호가 펼쳐지며, 던진 검 뒤로 불씨 꼬리가 남는다.
          if(ph===0){var x=90+K.rand(s)*180;K.beam(s,x-150,-12,1.05,{width:14,warn:76,active:50,color:R});K.beam(s,x+150,-12,PI-1.05,{width:14,warn:76,active:50,color:Y});}
          if(ph>=60&&ph<92&&ph%2===0){var dir=Math.floor(t/160)%2?1:-1;swing(s,b.x,b.y,DOWN+dir*(1.25-2.5*(ph-60)/30),K.pick(s,2,3,4),50,15,ph%4?R:Y,ph%4?0:1);}
          if(ph===120){var a=K.aim(s,b.x,b.y),n=K.pick(s,1,2,3);for(var k=0;k<n;k++)toss(s,b.x,b.y,a+(k-(n-1)/2)*.55,108,'sword-balrog',Y,K.pick(s,6,8,10),.2);}}},
        p1_fireballs:{name:'불덩이',fire:function(s,t){var b=s.boss;
          // 그림: 불덩이가 하늘을 뒤덮는다. 위에서 큰 불덩이가 내려오다 터져 작은 불꽃 고리가 된다.
          if(t%K.pick(s,26,18,12)===0)K.spawn(s,20+K.rand(s)*320,-14,DOWN+(K.rand(s)-.5)*.3,70,{color:R,size:2,at:K.pick(s,190,170,150)+Math.floor(K.rand(s)*40),mode:K.MODE_SPLIT,arg:K.pick(s,6,7,8),speed2:52});
          if(t%60===30)K.fan(s,b.x,b.y,K.count(s,6),K.aim(s,b.x,b.y),1,92,{color:Y,size:0});}},
        p1_vortex:{name:'검은 소용돌이',fire:function(s,t){var b=s.boss,arms=K.count(s,3),k;
          // 그림: 하늘 한가운데 검은 소용돌이. 팔이 휘감기며 돌고, 화면 위 양 끝에서 끌려 들어오는 탄이 휘어진다.
          if(t%7===0)for(k=0;k<arms;k++)K.spawn(s,b.x,b.y,t*.05+TAU*k/arms,70,{color:k%2?PU:R,size:0,turn:.36,life:620});
          if(t%K.pick(s,36,28,20)===0){K.spawn(s,8,-10,.95,92,{color:WH,size:1,turn:-.42});K.spawn(s,W-8,-10,PI-.95,92,{color:WH,size:1,turn:.42});}}},

        // 08 피로 물든 병원 — 가느다란 전자음, 붉은 글씨, (기존) 웃는 가면 (도구: 깃털 부채 — 기존 '웃는 가면')
        p1_beep:{name:'가느다란 전자음',fire:function(s,t){var b=s.boss,ph=t%80,cells=K.pick(s,15,16,19);
          // 그림: 심전도. 선이 왼쪽에서 오른쪽으로 그려지며 내려오고, 한 곳에서 높이 튀어 오른다. 튀어 오른 자리가 빈칸이다.
          if(ph===0)s.p1c=2+Math.floor(K.rand(s)*(cells-4));
          if(ph<cells*2&&ph%2===0){var i=ph>>1,d=i-s.p1c;
            if(d<-1||d>1)K.spawn(s,(i+.5)*W/cells,-10,DOWN,60,{color:C,size:0});
            if(d===-2||d===2)for(var h=1;h<=3;h++)K.spawn(s,(i+.5)*W/cells,-10-h*14,DOWN,60,{color:R,size:0});}
          if(t%80===56)K.ring(s,b.x,b.y,K.count(s,14),50,K.rand(s)*TAU,{color:WH,size:0});}},
        p1_scrawl:{name:'붉은 글씨',fire:function(s,t){var b=s.boss,ph=t%130;
          // 그림: 펜 끝이 휘갈기며 탄을 멈춰 세워 글씨를 쓰고, 다 쓰면 글씨가 핏물처럼 흘러내린다.
          if(ph===0)s.p1d=K.rand(s)*TAU;
          if(ph<72&&ph%K.pick(s,2,2,1)===0){var u=ph/72,px=clamp(b.x-130+260*u,24,W-24),py=b.y-60+34*Math.sin(u*TAU*3)+14*Math.sin(u*TAU*7.3+s.p1d);
            K.spawn(s,px,clamp(py,30,190),DOWN,0,{color:R,size:0,at:170-ph,mode:K.MODE_TURN,arg:0,speed2:52+K.rand(s)*24});}
          if(ph===100)K.fan(s,b.x,b.y,K.count(s,5),K.aim(s,b.x,b.y),.8,94,{color:WH,size:RICE});}},

        // 09-1 주사실 — (기존) 주사실, 펜타닐, 따뜻한 빛 (무기: 주사기)
        p1_fentanyl:{name:'펜타닐',fire:function(s,t){var b=s.boss,ph=t%72;
          // 그림(무기 주사기): 주사기가 곧고 빠르게 찌르고, 찌른 줄은 곧 세 갈래로 퍼지는 잔상이 된다. 그 사이로 떨리며 휘는 거품 고리.
          if(ph===0){var n=K.count(s,8),o=K.rand(s)*TAU;for(var i=0;i<n;i++)K.spawn(s,b.x,b.y,o+TAU*i/n,46,{color:C,size:4,turn:i%2?.22:-.22,life:820});}
          if(ph===36){var a=K.aim(s,b.x,b.y),m=K.pick(s,1,2,3);for(var k=0;k<m;k++){var q=a+(k-(m-1)/2)*.6;K.spawn(s,b.x,b.y,q,150,{size:PROP,color:K.P.p1_syringe});for(var j=1;j<=6;j++)K.spawn(s,b.x,b.y,q,150-j*12,{color:WH,size:RICE,at:30+j*3,mode:K.MODE_BRANCH,arg:3,gen:1,speed2:44});}}
          if(t%K.pick(s,18,14,10)===0)K.spawn(s,b.x+(K.rand(s)-.5)*40,b.y+10,DOWN,70,{color:WH,size:0});}},
        p1_warm:{name:'따뜻한 빛',fire:function(s,t){var b=s.boss;
          // 그림: 고통이 멀어지고 따뜻한 빛이 퍼진다. 천천히 도는 빛줄기와 번지는 노란 고리.
          if(t%420===0)K.wheel(s,K.pick(s,2,3,3),(Math.floor(t/420)%2?-1:1)*K.pick(s,.13,.17,.21),Y,300);
          if(t%54===27)K.ring(s,b.x,b.y,K.count(s,18),48,t*.07,{color:Y,size:1});
          if(t%54===0)K.ring(s,b.x,b.y,K.count(s,12),66,t*.05,{color:WH,size:0});}},

        // 09-2 결전의 날 — 봉인된 초천사, 존재를 지우는 힘, 한 스푼 정도의 기억 (도구: 존재를 지우는 권능)
        p1_sealed:{name:'봉인된 초천사',fire:function(s,t){var b=s.boss;
          // 그림: 네모난 봉인이 커지다 멈춰 서고, 봉인이 풀리면 봉인을 이루던 탄이 비틀려 흩어진다.
          if(t%90===0){var pts=K.Shapes.polygon(4,Math.max(3,K.count(s,7))),q=Math.floor(t/90)*.4,c=Math.cos(q),sn=Math.sin(q);
            for(var i=0;i<pts.length;i+=2){var px=pts[i]*c-pts[i+1]*sn,py=pts[i]*sn+pts[i+1]*c;K.spawn(s,b.x,b.y,Math.atan2(py,px),180*Math.sqrt(px*px+py*py),{color:Y,size:1,accel:-160,min:0,at:96,mode:K.MODE_TURN,arg:(i>>1)%2?.8:-.8,speed2:60});}}
          if(t%90===50)K.fan(s,b.x,b.y,K.count(s,5),K.aim(s,b.x,b.y),.7,94,{color:WH,size:RICE});}},
        p1_erase:{name:'존재를 지우는 힘',fire:function(s,t){var b=s.boss;
          // 그림(도구 권능): 흰 고리가 크게 번졌다가 한순간에 사라진다. 사라지지 않고 남는 것은 노란 탄 몇 개뿐이다.
          if(t%64===0){var n=K.count(s,30),o=K.rand(s)*TAU,keep=K.pick(s,5,4,3);for(var i=0;i<n;i++){var k=i%keep===0;K.spawn(s,b.x,b.y,o+TAU*i/n,k?58:112,{color:k?Y:WH,size:k?1:0,life:k?780:K.pick(s,120,130,140)});}}
          if(t%128===96)K.bell(s,b.x,b.y,K.count(s,11),K.aim(s,b.x,b.y),1.5,88,.45,{color:WH,size:0});}},
        p1_spoon:{name:'한 스푼 정도의 기억',fire:function(s,t){var b=s.boss;
          // 그림: 겨우 한 스푼의 기억 조각이 드문드문 떨어지고, 처음의 정원처럼 뿌리가 다시 갈라지며 내려온다.
          if(t%K.pick(s,8,6,4)===0)K.spawn(s,20+((t*37)%320),-8,DOWN,46+K.rand(s)*20,{color:WH,size:K.rand(s)<.2?1:0});
          if(t%80===0)for(var k=-1;k<=1;k+=2)K.spawn(s,b.x+k*30,b.y,DOWN+k*.55,72,{color:Y,size:2,at:58,mode:K.MODE_BRANCH,arg:2,gen:K.pick(s,2,3,3),speed2:60});}},

        // 10 환자와 중독의 도시 — 이번이 마지막, (기존) 중독의 도시, 검은 숫자 666 (도구: 갈망을 부르는 목소리)
        p1_last:{name:'이번이 마지막',fire:function(s,t){var b=s.boss,ph=t%180;
          // 그림: 이번이 마지막이라며 고리를 한 번 더, 한 번 더 — 매번 더 촘촘하고 빨라진다.
          if(ph<=120&&ph%30===0){var k=ph/30;K.ring(s,b.x,b.y,K.count(s,10+k*4),56+k*8,k*.2+K.rand(s)*.2,{color:k===4?R:Y,size:k>=3?1:0});}
          if(ph===150)K.fan(s,b.x,b.y,K.count(s,4),K.aim(s,b.x,b.y),.7,98,{color:WH,size:RICE});}},
        p1_666:{name:'검은 숫자 666',fire:function(s,t){var b=s.boss,ph=t%110;
          // 그림: 이마에 떠오른 검은 숫자 666. 세 자리에서 차례로 고리(6의 몸통)와 위로 휜 획(6의 머리)이 그려진다.
          if(ph===0||ph===14||ph===28){var k=ph/14-1,x=b.x+k*62,n=K.count(s,13);
            K.ring(s,x,b.y,n,54,K.rand(s)*TAU,{color:PU,size:1});
            for(var j=0;j<5;j++)K.spawn(s,x,b.y,-PI/2-.5+j*.16,40+j*6,{color:R,size:0,turn:-.5,life:700});}
          if(ph===70)K.bell(s,b.x,b.y,K.count(s,11),K.aim(s,b.x,b.y),1.6,90,.45,{color:R,size:0});}},

        // 11 천사의 가면과 의목사 후보생 — 완벽해야 한다, 수천 개의 내 얼굴, 환난은 인내를, 인내는 연단을, 연단은 소망을 (무기: 가면 조각, 검날)
        p1_perfect:{name:'완벽해야 한다',fire:function(s,t){var b=s.boss,every=K.pick(s,36,30,24);
          // 그림: 한 치도 어긋나지 않는 벽돌 격자. 줄마다 반 칸씩 엇갈려, 한 줄도 같은 자리에 설 수 없다.
          if(t%every===0){var row=Math.floor(t/every),cells=12;for(var i=0;i<cells;i++)K.spawn(s,(i+(row%2?.5:0))*W/cells+W/cells*.25,-10,DOWN,62,{color:row%2?WH:Y,size:RICE});}
          if(t%110===70)K.fan(s,b.x,b.y,K.pick(s,2,3,4),K.aim(s,b.x,b.y),.9,88,{size:PROP,color:K.P.p1_shard,spin:.12});}},
        p1_thousand:{name:'수천 개의 내 얼굴',fire:function(s,t){var b=s.boss;
          // 그림(무기 가면 조각): 가면이 갈라진다. 던진 가면 조각 뒤로 구슬 꼬리가 따라가고, 큰 탄은 조각마다 작은 얼굴 고리로 터진다.
          if(t%64===0){var n=K.pick(s,4,5,7),o=K.rand(s)*TAU;for(var i=0;i<n;i++)K.spawn(s,b.x,b.y,o+TAU*i/n,100,{color:i%2?WH:R,size:2,accel:-60,min:30,at:62,mode:K.MODE_SPLIT,arg:K.pick(s,7,8,9),speed2:46});}
          if(t%128===96){var m=K.pick(s,3,4,5),o2=K.aim(s,b.x,b.y);for(var k=0;k<m;k++)toss(s,b.x,b.y,o2+(k-(m-1)/2)*.5,96,'p1_shard',WH,K.pick(s,5,6,8),.1);}}},
        p1_trial:{name:'환난은 인내를',fire:function(s,t){var b=s.boss,k;
          // 그림: 환난. 꽃잎처럼 빠르기가 출렁이는 두 나선이 서로 반대로 돌며 오래 쏟아진다. 견디는 수밖에 없다.
          if(t%K.pick(s,4,3,2)===0){var a=t*.07,v=50+22*Math.cos(3*a);for(k=0;k<2;k++)K.spawn(s,b.x,b.y,k?PI-a:a,v,{color:k?R:PU,size:0});}
          if(t%110===55)K.bell(s,b.x,b.y,K.count(s,7),K.aim(s,b.x,b.y),1.2,90,.45,{color:WH,size:1});}},
        p1_temper:{name:'인내는 연단을',fire:function(s,t){var b=s.boss,ph=t%130;
          // 그림(무기 검날): 피 흐르는 손으로 붙잡은 검날. 검날이 세로로 내리꽂히고(광선), 꽂힌 자리에서 불꽃이 두 갈래씩 갈라져 튄다.
          if(ph===0){s.p1x=clamp(b.x,40,W-40);K.column(s,s.p1x,{width:26,warn:70,active:40,color:Y});}
          if(ph===30||ph===70)K.ring(s,b.x,b.y,K.count(s,14),46,K.rand(s)*TAU,{color:ph===30?WH:R,size:0});
          if(ph===104){var n=K.count(s,14);for(var i=0;i<n;i++)K.spawn(s,s.p1x,b.y+20,.25+(PI-.5)*i/(n-1),120,{color:i%2?Y:R,size:1,at:40,mode:K.MODE_BRANCH,arg:2,gen:K.pick(s,1,1,2),speed2:72});}}},
        p1_hope:{name:'연단은 소망을',time:36,fire:function(s,t){var b=s.boss;
          // 그림: 병원 창문에 하나씩 불이 켜진다. 창문 자리마다 작은 빛 고리가 피어 천천히 내려오고, 여섯 꼭짓점 인장이 퍼진다.
          if(t%22===0){var k=(t/22)%15,c=k%5,r=Math.floor(k/5);K.ring(s,48+c*66,36+r*36,K.pick(s,6,7,9),36,t*.1,{color:Y,size:1});}
          if(t%150===75)K.shape(s,b.x,b.y,K.Shapes.star(6,.5,Math.max(2,K.count(s,3))),84,t*.01,{color:WH,size:0});
          if(t%75===40)K.fan(s,b.x,b.y,K.count(s,3),K.aim(s,b.x,b.y),.5,96,{color:R,size:RICE});}}
      };

      /* ── 잡몹 구간. 장면마다 길의 느낌이 다르다. ── */
      var D=900; // 구간 길이(틱)
      // 01 정원·회랑: 회랑 양쪽 벽을 타고 뿌리가 내려오고, 가운데에서 V자로 갈라진다.
      var w01=[
        seq([[0,420,26,function(s,i){var L=i%2===0,j=(i>>1)%3;M(s,'p1_root',L?40+j*26:W-40-j*26,-20,{vy:1.3,sway:.3,swayRate:.04,fire:'p1_sap',first:40,every:60,color:PU});}],
             [440,800,48,function(s,i){M(s,'p1_root',180-30-(i%5)*14,-20,{vx:-.45,vy:1.2,fire:'aim',first:44,every:80,color:G});M(s,'p1_root',180+30+(i%5)*14,-20,{vx:.45,vy:1.2,fire:'aim',first:44,every:80,color:G});}]],D),
        seq([[0,460,34,function(s,i){var d=18+(i%8)*16;M(s,'p1_root',180-d,-20,{vx:-.35,vy:1.5,fire:'p1_sap',first:36,every:56,color:PU});M(s,'p1_root',180+d,-20,{vx:.35,vy:1.5,fire:'p1_sap',first:36,every:56,color:PU});}],
             [500,800,46,function(s,i){M(s,'p1_root',60+((i*97)%240),-20,{vy:1.1,sway:.5,fire:'ring',first:50,every:110,color:G});}]],D),
        seq([[0,480,22,function(s,i){var L=i%2===0;M(s,'p1_root',L?18:W-18,-20,{vx:L?1.1:-1.1,vy:1.35,fire:'p1_sap',first:30,every:50,color:PU});}],
             [520,800,70,function(s,i){for(var k=0;k<3;k++)M(s,'p1_root',90+k*90,-20-k*10,{vy:1.1,fire:'ring',first:56,every:100,color:i%2?PU:G});}]],D)];
      // 02 뼈 거미줄 동굴: 줄에 매달려 천천히 내려오는 거미, 흔들리며 달려드는 거미, 육각 거미줄 대형, 옆벽을 기는 거미
      var w02=[
        seq([[0,520,24,function(s,i){M(s,'spider',36+((i*83)%288),-20,{vy:.95,fire:'p1_ash',first:24,every:48,color:PU});}],
             [540,800,44,function(s,i){M(s,'spider',i%2?100:260,-20,{vy:1.6,sway:1.6,swayRate:.05,fire:'aim',first:40,every:60,color:WH});}]],D),
        seq([[0,480,18,function(s,i){var L=(i>>1)%2===0;M(s,'spider',L?80:280,-20,{vy:2,sway:2.4,swayRate:.09,fire:'aim',first:30,every:56,color:WH});}],
             [500,800,40,function(s,i){M(s,'spider',40+K.rand(s)*280,-20,{vy:1.3,sway:.8,fire:'ring',first:44,every:100,color:PU});}]],D),
        seq([[0,720,180,function(s,i){for(var k=0;k<6;k++){var q=TAU*k/6+i*.5;M(s,'spider',180+Math.cos(q)*70,-70+Math.sin(q)*40,{vy:1.05,fire:'hexagon',first:60,every:90,color:PU});}}]],D),
        seq([[0,560,28,function(s,i){var L=i%2===0;M(s,'spider',L?-16:W+16,40+((i*37)%110),{vx:L?1.8:-1.8,vy:.5,fire:'p1_ash',first:24,every:44,color:PU});}],
             [560,800,56,function(s,i){M(s,'spider',180,-20,{vy:1.4,sway:2,swayRate:.06,fire:'ring',first:36,every:80,color:WH});}]],D)];
      // 03 검은 늪·수초 길: 떠오르듯 천천히 내려오는 수초 떼, 늪의 슬라임, 수초 사이로 굽이치는 길
      var w03=[
        seq([[0,660,84,function(s,i){for(var k=0;k<5;k++)M(s,'p1_reed',36+k*72+(i%2?36:0),-20-k%2*16,{vy:.75,sway:.4,swayRate:.03,fire:'p1_bubble',first:50,every:110,color:G});}]],D),
        seq([[0,480,32,function(s,i){M(s,'slime',i%2?110:250,-20,{vy:1.2,sway:.9,swayRate:.05,fire:'ring',first:44,every:90,color:G});}],
             [500,800,50,function(s,i){M(s,'p1_reed',60+((i*113)%240),-20,{vy:.9,fire:'p1_bubble',first:36,every:90,color:G});}]],D),
        seq([[0,600,40,function(s,i){M(s,'slime',40+((i*71)%280),-20,{vy:.8,sway:.3,fire:'ring',first:30,every:80,color:R});M(s,'p1_reed',W-40-((i*71)%280),-30,{vy:.8,fire:'p1_bubble',first:60,every:120,color:G});}]],D),
        seq([[0,680,30,function(s,i){var path=180+92*Math.sin(i*.42);M(s,'p1_reed',clamp(path-78,20,W-20),-20,{vy:1.1,fire:'drop',first:30,every:40,color:G});M(s,'p1_reed',clamp(path+78,20,W-20),-20,{vy:1.1,fire:'drop',first:50,every:40,color:G});}]],D)];
      // 04 무너진 성 접근로: 핏빛 추격자의 늑대 떼가 대각선으로 몰려오고, 박쥐 날개 무리가 재를 흩뿌린다.
      var w04=[
        seq([[0,600,50,function(s,i){var L=i%2===0;for(var k=0;k<3;k++)M(s,'wolf',(L?-16:W+16)+(L?-1:1)*k*22,10+k*18,{vx:L?2.2:-2.2,vy:1.5,fire:'aim',first:20+k*8,every:44,color:R});}]],D),
        seq([[0,520,20,function(s,i){M(s,'ember',30+((i*61)%300),-20,{vy:1.7,sway:1.8,swayRate:.07,fire:'p1_ash',first:30,every:50,color:PU});}],
             [540,800,44,function(s,i){M(s,'wolf',i%2?60:300,-20,{vx:i%2?1:-1,vy:2,fire:'aim',first:26,every:40,color:R});}]],D),
        seq([[0,660,64,function(s,i){var gap=Math.floor(K.rand(s)*5);for(var k=0;k<6;k++){if(k===gap)continue;M(s,k%2?'ember':'wolf',30+k*60,-20,{vy:1.2,fire:k%2?'p1_ash':'drop',first:36,every:k%2?70:40,color:k%2?PU:R});}}]],D)];
      // 05 시체 언덕·묘지 길: 묘비 줄에서 일어나는 시체, 언덕 모양 대형, 뿌리와 시체가 뒤섞인 길
      var w05=[
        seq([[0,620,64,function(s,i){for(var k=0;k<4;k++)M(s,'nightmare',54+k*84,-20,{vy:.9,fire:'ring',first:44+k*12,every:140,color:WH});}]],D),
        seq([[0,600,100,function(s,i){for(var k=0;k<7;k++){var u=(k-3)/2;M(s,'nightmare',36+k*48,-20-42*Math.exp(-u*u),{vy:1.15,fire:k%2?'aim':'drop',first:40,every:k%2?60:40,color:k%2?PU:WH});}}]],D),
        seq([[0,520,24,function(s,i){var L=i%2===0;M(s,'p1_root',L?24:W-24,-20,{vx:L?.6:-.6,vy:1.4,fire:'p1_sap',first:30,every:50,color:PU});}],
             [200,760,50,function(s,i){M(s,'nightmare',120+((i*67)%120),-20,{vy:1,sway:.6,fire:'bell',first:46,every:110,color:WH});}]],D)];
      // 06 성 중심·일곱 기둥: 일곱 기둥 줄을 따라 내려오는 불씨 악마, 기둥을 지키는 뿔 악마
      var w06=[
        seq([[0,640,16,function(s,i){var k=(i*3)%7;M(s,'ember',30+k*50,-20,{vy:1.8,fire:'drop',first:24,every:30,color:R});}]],D),
        seq([[0,320,24,function(s,i){M(s,'ember',i%2?50:310,-20,{vy:1.6,sway:1.6,swayRate:.07,fire:'aim',first:30,every:50,color:Y});}],
             [320,321,1,function(s,i){M(s,'horn',180,-30,{stopY:120,fire:'p1_chain',first:20,every:60,hold:320,color:R});}],
             [420,800,36,function(s,i){M(s,'ember',30+((i*3)%7)*50,-20,{vy:1.4,fire:'drop',first:30,every:36,color:Y});}]],D),
        seq([[0,420,20,function(s,i){M(s,'ember',i%2?74:286,-20,{vy:2.1,sway:2.2,swayRate:.085,fire:'p1_ash',first:28,every:60,color:R});}],
             [420,421,1,function(s,i){M(s,'horn',96,-30,{stopY:118,fire:'p1_chain',first:20,every:72,hold:300,color:Y});M(s,'horn',264,-30,{stopY:118,fire:'p1_chain',first:56,every:72,hold:300,color:R});}],
             [500,800,40,function(s,i){M(s,'ember',30+K.rand(s)*300,-20,{vy:1.9,fire:'drop',first:24,every:34,color:Y});}]],D)];
      // 07 궁전 중심 소환진: 모든 기억이 부서져 떨어진다. 거미·늪·불씨가 차례로 빠르게 추락한다.
      var w07=[
        seq([[0,600,12,function(s,i){M(s,'spider',20+K.rand(s)*320,-20,{vy:2.6,fire:'drop',first:20,every:24,color:PU});}]],D),
        seq([[0,600,16,function(s,i){M(s,'slime',30+((i*89)%300),-20,{vy:2.3,sway:1.2,swayRate:.06,fire:'ring',first:26,every:70,color:G});}]],D),
        seq([[0,620,14,function(s,i){var L=i%2===0;M(s,'ember',L?20+((i*29)%120):W-20-((i*29)%120),-20,{vx:L?.9:-.9,vy:2.4,fire:'aim',first:22,every:40,color:R});}]],D),
        seq([[0,660,11,function(s,i){var kinds=['spider','slime','ember'];M(s,kinds[i%3],20+((i*101)%320),-20,{vy:2.4+(i%3)*.2,fire:i%3===1?'ring':'drop',first:22,every:i%3===1?70:28,color:i%3===2?Y:R});}]],D)];
      // 08 병동·의료 복도: 복도 양쪽에서 번갈아 다가오는 얼굴, 간호사, 자리를 맞바꾸는 얼굴
      var w08=[
        seq([[0,640,20,function(s,i){var L=i%2===0;M(s,'p1_face',L?40+(i%3)*20:W-40-(i%3)*20,-20,{vy:1.6,fire:'p1_gaze',first:36,every:64,color:C});}]],D),
        seq([[0,300,30,function(s,i){M(s,'p1_face',60+((i*79)%240),-20,{vy:1.4,sway:.6,fire:'aim',first:36,every:44,color:R});}],
             [300,301,1,function(s,i){M(s,'p1_nurse',180,-30,{stopY:118,fire:'p1_syringe',first:20,every:70,hold:340,color:C});}],
             [400,800,32,function(s,i){M(s,'p1_face',i%2?40:320,-20,{vy:1.5,fire:'drop',first:24,every:30,color:WH});}]],D),
        seq([[0,660,32,function(s,i){M(s,'p1_face',60,-20,{vx:1.1,vy:1.4,fire:'p1_gaze',first:44,every:80,color:WH});M(s,'p1_face',300,-20,{vx:-1.1,vy:1.4,fire:'aim',first:26,every:44,color:R});}]],D)];
      // 09-1 잠긴 주사실·약품 구획: 선반 줄처럼 늘어선 약병, 흔들리는 얼굴, 간호사가 지키는 서랍
      var w091=[
        seq([[0,660,80,function(s,i){for(var k=0;k<5;k++)M(s,'p1_vial',48+k*66,-20,{vy:1.1,fire:'p1_drip',first:36+k*12,every:66,color:C});}]],D),
        seq([[0,600,24,function(s,i){if(i%2)M(s,'p1_face',40+K.rand(s)*280,-20,{vy:1.5,sway:1.4,swayRate:.07,fire:'p1_gaze',first:40,every:80,color:WH});else M(s,'p1_vial',40+K.rand(s)*280,-20,{vy:1.7,fire:'p1_drip',first:26,every:44,color:C});}]],D),
        seq([[0,280,22,function(s,i){M(s,'p1_vial',i%2?70:290,-20,{vy:1.8,sway:1,fire:'aim',first:30,every:40,color:C});}],
             [280,281,1,function(s,i){M(s,'p1_nurse',110,-30,{stopY:120,fire:'p1_syringe',first:20,every:80,hold:320,color:WH});M(s,'p1_nurse',250,-30,{stopY:120,fire:'p1_syringe',first:60,every:80,hold:320,color:C});}],
             [440,800,40,function(s,i){M(s,'p1_vial',30+((i*83)%300),-20,{vy:1.4,fire:'p1_drip',first:30,every:50,color:WH});}]],D)];
      // 09-2 과거 궁전·봉인 회랑: 동료들이 막아 선 회랑 두 줄, 뿌리, 봉인 앞을 지키는 뿔 악마
      var w092=[
        seq([[0,640,20,function(s,i){var lane=i%2?126:234;M(s,'ember',lane+(K.rand(s)-.5)*30,-20,{vy:1.9,fire:'aim',first:26,every:40,color:Y});}]],D),
        seq([[0,320,28,function(s,i){var L=i%2===0;M(s,'p1_root',L?30:W-30,-20,{vx:L?.8:-.8,vy:1.4,fire:'p1_sap',first:26,every:44,color:Y});}],
             [320,321,1,function(s,i){M(s,'horn',180,-30,{stopY:120,fire:'p1_chain',first:20,every:60,hold:320,color:Y});}],
             [420,800,40,function(s,i){M(s,'ember',40+((i*59)%280),-20,{vy:1.6,fire:'drop',first:30,every:34,color:WH});}]],D),
        seq([[0,560,26,function(s,i){var L=i%2===0;M(s,'ember',L?-16:W+16,30+((i*41)%100),{vx:L?2:-2,vy:.6,fire:'drop',first:24,every:30,color:Y});}],
             [560,800,48,function(s,i){M(s,'p1_root',180+(i%2?-60:60),-20,{vy:1.3,fire:'ring',first:40,every:80,color:WH});}]],D)];
      // 10 환자·중독의 도시: 폐허의 거리에 쓰러져 있던 내 모습들, 달빛을 받으며 비스듬히 떨어지는 약병, 길을 막는 간호사
      var w10=[
        seq([[0,660,52,function(s,i){for(var k=0;k<3;k++)M(s,'nightmare',60+k*120+(i%2?60:0)-30,-20-k*12,{vy:.95,fire:'ring',first:44+k*10,every:84,color:PU});}]],D),
        seq([[0,580,14,function(s,i){M(s,'p1_vial',20+((i*47)%220),-20,{vx:.8,vy:2,fire:'p1_drip',first:26,every:44,color:C});}],
             [580,800,36,function(s,i){M(s,'nightmare',i%2?90:270,-20,{vy:1.3,fire:'bell',first:36,every:90,color:WH});}]],D),
        seq([[0,300,28,function(s,i){M(s,'nightmare',40+((i*71)%280),-20,{vy:1.3,sway:.8,fire:'aim',first:30,every:40,color:R});}],
             [300,301,1,function(s,i){M(s,'p1_nurse',90,-30,{stopY:124,fire:'p1_syringe',first:20,every:72,hold:320,color:C});M(s,'p1_nurse',270,-30,{stopY:124,fire:'p1_syringe',first:56,every:72,hold:320,color:WH});}],
             [440,800,24,function(s,i){M(s,'p1_vial',i%2?30:330,-20,{vx:i%2?.7:-.7,vy:1.6,fire:'drop',first:24,every:28,color:C});}]],D)];
      // 11 가면·병원 경계: 둥글게 둘러선 수많은 얼굴, 간호사와 약병, 엇갈리는 얼굴, 창문처럼 줄 선 얼굴
      var w11=[
        seq([[0,600,110,function(s,i){for(var k=0;k<8;k++){var q=TAU*k/8+i*.4;M(s,'p1_face',180+Math.cos(q)*110,-80+Math.sin(q)*50,{vy:1.2,fire:'p1_gaze',first:56+k*6,every:84,color:k%2?WH:R});}}]],D),
        seq([[0,300,24,function(s,i){M(s,'p1_vial',40+((i*89)%280),-20,{vy:1.7,fire:'p1_drip',first:26,every:44,color:C});}],
             [300,301,1,function(s,i){M(s,'p1_nurse',180,-30,{stopY:118,fire:'p1_syringe',first:20,every:64,hold:340,color:R});}],
             [400,800,28,function(s,i){M(s,'p1_face',i%2?50:310,-20,{vy:1.6,sway:1,fire:'aim',first:28,every:40,color:WH});}]],D),
        seq([[0,640,18,function(s,i){var L=i%2===0;M(s,'p1_face',L?30:W-30,-20,{vx:L?1.4:-1.4,vy:1.7,fire:L?'p1_gaze':'drop',first:26,every:L?80:30,color:L?R:WH});}]],D),
        seq([[0,660,90,function(s,i){for(var k=0;k<5;k++)M(s,k%2?'p1_vial':'p1_face',48+k*66,-20,{vy:1.25,fire:k%2?'p1_drip':'p1_gaze',first:36+k*12,every:80,color:k%2?Y:WH});}]],D)];
      var stages=[
        {scene:'01',theme:{bg:'p1_garden',tint:'#1c2414',fx:'leaves'},cast:['p1_root'],reward:{key:'p1_sap',name:'검은 수액'},
          waves:w01,mid:['p1_tree','p1_roots','p1_thick']},
        {scene:'02',theme:{bg:'p1_cave',tint:'#1e1030',fx:'dust'},cast:['spider'],reward:{key:'p1_portal',name:'포탈'},
          waves:w02,mid:['violet','p1_wings'],boss:['violet','web','p1_hunger','p1_unloved','p1_trance']},
        {scene:'03',theme:{bg:'p1_swamp',tint:'#0e2016',fx:'bubbles'},cast:['p1_reed','slime'],reward:{key:'p1_reedr',name:'수초'},
          waves:w03,mid:['p1_horn','p1_reeds'],boss:['p1_horn','p1_hands','p1_heads','p1_faces','p1_left']},
        {scene:'04',theme:{bg:'p1_castle',tint:'#2a1810',fx:'ash'},cast:['wolf','ember'],reward:{key:'p1_chainr',name:'봉인 사슬'},
          waves:w04,mid:['p1_chaser','p1_ash','p1_chains']},
        {scene:'05',theme:{bg:'p1_grave',tint:'#18122a',fx:'mist'},cast:['nightmare','p1_root'],reward:{key:'p1_comrades',name:'동료'},
          waves:w05,mid:['p1_comrade','p1_hill','p1_echo']},
        {scene:'06',theme:{bg:'p1_pillars',tint:'#341008',fx:'embers'},cast:['ember','horn'],reward:{key:'p1_ember',name:'불씨'},
          waves:w06,mid:['p1_gate','p1_embers','p1_whip','pillars']},
        {scene:'07',theme:{bg:'p1_summon',tint:'#3a0a04',fx:'sparks'},cast:['spider','slime','ember'],reward:{key:'p1_vortexr',name:'검은 소용돌이'},
          waves:w07,mid:['balrog','p1_sword'],boss:['balrog','p1_fireballs','summon','p1_vortex','fall']},
        {scene:'08',theme:{bg:'p1_ward',tint:'#0a1e24',fx:'drip'},cast:['p1_face','p1_nurse'],reward:{key:'p1_lamp',name:'형광등'},
          waves:w08,mid:['mask','p1_beep','p1_scrawl','smile']},
        {scene:'09-1',theme:{bg:'p1_injection',tint:'#0c1828',fx:'static'},cast:['p1_vial','p1_face','p1_nurse'],reward:{key:'p1_vialr',name:'약병'},
          waves:w091,mid:['p1_staff','needles','p1_fentanyl','p1_warm']},
        {scene:'09-2',theme:{bg:'p1_memory',tint:'#1c2030',fx:'motes'},cast:['ember','p1_root','horn'],reward:{key:'p1_seal',name:'봉인'},
          waves:w092,mid:['p1_seraph','p1_sealed','p1_erase','p1_spoon']},
        {scene:'10',theme:{bg:'p1_city',tint:'#0a1420',fx:'rain'},cast:['nightmare','p1_vial','p1_nurse'],reward:{key:'p1_moon',name:'달빛'},
          waves:w10,mid:['lucifer','p1_last','craving','p1_666']},
        {scene:'11',theme:{bg:'p1_mask',tint:'#160c1c',fx:'petals'},cast:['p1_face','p1_vial','p1_nurse'],reward:{key:'p1_sigil',name:'J의 인장'},
          waves:w11,mid:['mask','angelMask'],boss:['lucifer','p1_perfect','p1_thousand','p1_trial','p1_temper','p1_hope']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
