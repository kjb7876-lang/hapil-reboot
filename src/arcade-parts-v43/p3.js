/* 합일 v43 · 제3부 — 통제자의 열일곱 단계. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * 전쟁고아 첫째의 몽세: 끝없이 행진하는 강철 군단, 같은 날로 되돌아가는 폭격의 루프, 높아지는 기계 성벽,
 * 기억의 문을 지키는 방어체계, 아이의 자아를 옮길 기계 육체, 그리고 마지막에 통제자가 빙의한 기억의 문.
 * 탄막은 기계답게 규칙적이다: 격자, 광선, 같은 순서의 되풀이. 패턴 이름은 원작의 단계 이름(제1~17단계)에서 왔다.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:3,
    // 색 번호: 0 빨강 2 보라 4 청록 5 초록 6 노랑 8 흰색
    actors:{
      p3_legion:{name:'강철 군단',c1:8,c2:0},
      p3_rampart:{name:'기계 성벽',c1:4,c2:8},
      p3_defense:{name:'방어체계',c1:0,c2:4},
      p3_body:{name:'기계 육체',c1:4,c2:5},
      p3_gate:{name:'기억의 문',c1:2,c2:4}
    },
    mobs:{
      p3_walker:{hp:6,r:14,score:300},            // 행진하는 군단 병사
      p3_bomber:{hp:7,r:14,score:300},            // 폭격 드론
      p3_sentry:{hp:90,r:22,score:4000,elite:true}, // 방어체계 포대
      p3_pod:{hp:100,r:22,score:5000,elite:true}    // 이주 코어
    },
    props:[{key:'p3_lance',radius:11},{key:'p3_shard',radius:11},{key:'p3_casing',radius:8},{key:'p3_core',radius:14}],
    build:function(K){
      var W=K.W,PI=Math.PI,TAU=K.TAU,HALF=PI/2;
      var mob=K.mob,spawn=K.spawn;
      // 던지기: 큰 기물 하나가 날아가고, 같은 자리에서 조금씩 느린 구슬이 뒤따라 꼬리를 이룬다.
      function toss(s,x,y,a,speed,prop,color,tail,o){spawn(s,x,y,a,speed,o||{size:K.SHAPE_PROP,color:K.P[prop]});for(var k=1;k<=tail;k++)spawn(s,x,y,a,speed*(1-.075*k),{color:color,size:k%3?0:1});}

      /* ── 잡몹의 사격 ── */
      var mobFire={
        // 군단의 일제 사격: 같은 자리에서 곧게 아래로, 빠르기만 다른 탄이 한 줄로 선다.
        p3_volley:function(s,m){for(var j=0;j<K.pick(s,2,3,3);j++)spawn(s,m.x,m.y,HALF,66+j*16,{color:m.color,size:K.RICE});},
        // 폭격: 느리게 떨어지던 폭탄이 터져 고리가 된다.
        p3_bomb:function(s,m){spawn(s,m.x,m.y,HALF,62,{color:m.color,size:2,at:70,mode:K.MODE_SPLIT,arg:K.count(s,6),speed2:52});},
        // 포대: 바로 선 사각 격자가 번갈아 반 바퀴씩 돌아 퍼진다.
        p3_grid:function(s,m){K.shape(s,m.x,m.y,K.Shapes.polygon(4,Math.max(2,K.count(s,3))),70,m.shots%2?PI/4:0,{color:m.color,size:0});},
        // 십자 포대: 네 갈래 쌀알 줄기가 쏠 때마다 조금씩 돈다.
        p3_cross:function(s,m){for(var k=0;k<4;k++)for(var j=0;j<K.pick(s,2,2,3);j++)spawn(s,m.x,m.y,k*HALF+m.shots*.22+PI/4,58+j*16,{color:m.color,size:K.RICE});},
        // 성벽 병사: 벽에서 안쪽으로 겨눈다.
        p3_inward:function(s,m){K.fan(s,m.x,m.y,K.pick(s,1,2,3),Math.atan2(240,W/2-m.x),.36,84,{color:m.color,size:K.RICE});},
        // 창: 군단의 창이 영웅을 향해 날아온다.
        p3_lance:function(s,m){spawn(s,m.x,m.y,K.aim(s,m.x,m.y),92,{size:K.SHAPE_PROP,color:K.P.p3_lance});},
        // 코어: 육각 고리가 쏠 때마다 돈다.
        p3_coreRing:function(s,m){K.shape(s,m.x,m.y,K.Shapes.polygon(6,Math.max(2,K.count(s,2))),66,m.shots*.3,{color:m.color,size:0});}
      };

      /* ── 이름 붙은 패턴 ── */
      var spells={
        // 24 — 제2단계 폭격의 루프: 같은 다섯 자리에 같은 순서로 폭탄이 떨어지고 터진다. 되풀이되는 같은 날.
        p3_bombLoop:{name:'폭격의 루프',scene:'24',fire:function(s,t){var b=s.boss,xs=[70,290,180,125,235,180];
          if(t%40===0)spawn(s,xs[(t/40)%6],-12,HALF,84,{color:K.RED,size:2,at:190,mode:K.MODE_SPLIT,arg:K.count(s,8),speed2:54});
          // 탄피: 폭격이 지나간 뒤 탄피가 꼬리를 끌며 흩어진다.
          if(t%40===20)for(var c=0;c<K.pick(s,1,2,2);c++)toss(s,b.x,b.y,HALF+(c?-1:1)*(.35+((t/40|0)%3)*.25),88,'p3_casing',K.YELLOW,K.pick(s,4,6,7),{size:K.SHAPE_PROP,color:K.P.p3_casing,spin:.15});
          // 드론의 회전음: 두 날개의 프로펠러 줄기
          if(t%10===0)for(var k=0;k<K.pick(s,2,2,3);k++)spawn(s,b.x,b.y,t*.06+TAU*k/K.pick(s,2,2,3),72,{color:K.WHITE,size:0});}},
        // 24 — 제4단계 몽세의 아키텍처: 벽돌이 한 단씩 엇갈려 쌓인다. 빈 세 칸이 규칙대로 지그재그로 옮겨 간다.
        p3_architecture:{name:'몽세의 아키텍처',scene:'24',fire:function(s,t){var b=s.boss;
          // 두 단씩 같은 자리에 빈칸을 두고 쌓은 뒤, 빈칸이 정해진 지그재그 순서로 옮겨 간다.
          if(t%30===0){var r=t/30,cells=K.pick(s,12,14,17),zig=[.1,.3,.5,.7,.9,.7,.5,.3],g=Math.round(zig[(r>>1)%8]*(cells-3)),step=W/cells,off=r%2?step/2:0;
            for(var i=0;i<cells;i++){if(i>=g&&i<g+3)continue;spawn(s,step*(i+.25)+off,-10,HALF,56,{color:r%2?K.WHITE:K.RED,size:1});}}
          if(t%96===72)K.fan(s,b.x,b.y,K.count(s,2),K.aim(s,b.x,b.y),.3,98,{color:K.WHITE,size:K.RICE});}},
        // 25 — 제6단계 연민의 폭력: 분노가 커질수록 고리가 촘촘해진다.
        p3_compassion:{name:'연민의 폭력',scene:'25',fire:function(s,t){var b=s.boss;
          if(t%50===0)K.ring(s,b.x,b.y,Math.min(K.count(s,9+2*Math.floor(t/100)),K.pick(s,20,30,44)),66,t*.013,{color:K.RED,size:1});
          if(t%100===25)K.bell(s,b.x,b.y,K.count(s,10),K.aim(s,b.x,b.y),1.6,92,.45,{color:K.CYAN,size:0});}},
        // 25 — 제7단계 무너진 경계: 넓게 펼쳐 멈춘 경계선이 기둥처럼 무너져 내린다. 네 칸마다 빈자리가 있다.
        p3_brokenBorder:{name:'무너진 경계',scene:'25',fire:function(s,t){var b=s.boss;
          if(t%80===0){var n=K.pick(s,15,21,33);for(var i=0;i<n;i++){if(i%4===3)continue;var a=HALF+(i/(n-1)-.5)*3;
            spawn(s,b.x,b.y,a,190,{color:K.WHITE,size:1,accel:-110,min:0,at:70,mode:K.MODE_TURN,arg:HALF-a,speed2:K.pick(s,48,56,62)});}}
          // 기계가 지키고 있던 것: 보스 둘레의 느린 고리
          if(t%80===40)K.ring(s,b.x,b.y,K.count(s,12),52,t*.02,{color:K.CYAN,size:0});}},
        // 26 — 첫 번째 기억의 문: 문짝 두 장이 좌우로 갈라지고, 비명 같은 고리가 같은 박자로 되풀이된다.
        p3_firstDoor:{name:'첫 번째 기억의 문',scene:'26',fire:function(s,t){var b=s.boss,k,n=K.pick(s,7,10,14);
          if(t%70===0)for(k=0;k<n;k++){spawn(s,b.x+10,b.y-30+k*12,HALF-.9,70,{color:K.CYAN,size:1});spawn(s,b.x-10,b.y-30+k*12,HALF+.9,70,{color:K.CYAN,size:1});}
          if(t%40===20)K.ring(s,b.x,b.y,K.count(s,14),78,K.aim(s,b.x,b.y)+PI/14,{color:K.WHITE,size:0});}},
        // 26 — 제10단계 성장 신화: 씨앗이 갈라지고, 갈라진 가지가 또 갈라진다.
        p3_growthMyth:{name:'성장 신화',scene:'26',fire:function(s,t){var b=s.boss;
          if(t%64===0)K.fan(s,b.x,b.y,K.pick(s,2,4,5),HALF,1.8,88,{color:K.GREEN,size:2,at:46,mode:K.MODE_BRANCH,arg:3,gen:2,speed2:68});
          if(t%64===32)K.ring(s,b.x,b.y,K.count(s,10),60,K.rand(s)*TAU,{color:K.WHITE,size:0});}},
        // 26 — 제11단계 하드웨어 이주: 회로 기판. 옆으로 뻗던 탄이 직각으로 꺾여 세로 배선이 되고, 가로 배선(광선)이 켜진다.
        p3_hwMigrate:{name:'하드웨어 이주',scene:'26',fire:function(s,t){var b=s.boss;
          if(t%6===0){var i=t/6,dir=i%2?1:-1,at=20+((i>>1)%8)*16;
            for(var j=0;j<K.pick(s,1,2,3);j++)spawn(s,b.x,b.y,dir>0?0:PI,108+j*22,{color:K.CYAN,size:0,at:at,mode:K.MODE_TURN,arg:dir*HALF,speed2:72});}
          if(t%40===20)K.ring(s,b.x,b.y,K.count(s,8),58,t*.02,{color:K.WHITE,size:0});
          if(t%170===85)K.row(s,330+K.rand(s)*150,{width:14,warn:66,active:60,color:K.PURPLE});}},
        // 26 — 제12단계 인간성이라는 레거시: 흔들림 없이 똑바로 선 사각 격자가 겹겹이 퍼진다.
        p3_legacy:{name:'인간성이라는 레거시',scene:'26',fire:function(s,t){var b=s.boss;
          if(t%50===0)for(var j=0;j<K.pick(s,1,2,2);j++)K.shape(s,b.x,b.y,K.Shapes.polygon(4,Math.max(2,K.count(s,3))),62+j*16,PI/4,{color:K.WHITE,size:0});
          if(t%100===50)K.fan(s,b.x,b.y,K.count(s,2),K.aim(s,b.x,b.y),.25,108,{color:K.PURPLE,size:K.RICE});}},
        // 27 — 제13단계 관리자 권한: 세계를 재구성하는 광선 바퀴가 돌고, 그 사이로 고리가 일정하게 돈다.
        p3_admin:{name:'관리자 권한',scene:'27',fire:function(s,t){var b=s.boss;
          if(t%300===0)K.wheel(s,K.pick(s,2,3,3),(Math.floor(t/300)%2?-1:1)*K.pick(s,.16,.2,.24),K.CYAN,200);
          if(t%20===10)K.ring(s,b.x,b.y,K.count(s,10),62,t*.05,{color:K.PURPLE,size:0});}},
        // 27 — 출력 흡수: 퍼져 나간 고리가 멈췄다가 통제자에게 빨려 들어가고, 지나쳐 다시 퍼진다.
        p3_absorb:{name:'출력 흡수',scene:'27',fire:function(s,t){var b=s.boss;
          if(t%70===0){var n=K.count(s,22),base=K.rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,200,{color:K.WHITE,size:1,accel:-140,min:0,at:64,mode:K.MODE_TURN,arg:PI,speed2:70});}
          if(t%70===35)K.bell(s,b.x,b.y,K.count(s,10),K.aim(s,b.x,b.y),1.5,92,.45,{color:K.PURPLE,size:0});}},
        // 27 — 제14단계 학대의 방: 양옆 벽과 천장이 방을 만들고, 방 안에 그치지 않는 비가 내린다.
        p3_abuseRoom:{name:'학대의 방',scene:'27',fire:function(s,t){var b=s.boss,phase=t%280;
          if(phase===0){K.column(s,26,{width:22,warn:70,active:200,color:K.RED});K.column(s,W-26,{width:22,warn:70,active:200,color:K.RED});}
          if(phase===80)K.row(s,250,{width:16,warn:64,active:80,color:K.PURPLE});
          if(t%5===0)for(var i=0;i<K.count(s,1);i++)spawn(s,50+K.rand(s)*(W-100),-8,HALF,56+K.rand(s)*30,{color:K.RED,size:0});
          if(t%70===35)K.fan(s,b.x,b.y,K.count(s,2),K.aim(s,b.x,b.y),.4,100,{color:K.WHITE,size:K.RICE});}},
        // 28 — 제15단계 중앙 코어 이주실: 육각 코어와 톱니 고리가 서로 반대로 돌며 퍼지고, 이주용 창이 날아온다.
        p3_coreRoom:{name:'중앙 코어 이주실',scene:'28',fire:function(s,t){var b=s.boss;
          if(t%60===0)K.shape(s,b.x,b.y,K.Shapes.polygon(6,Math.max(2,K.count(s,3))),68,t*.01,{color:K.CYAN,size:0});
          if(t%60===30)K.shape(s,b.x,b.y,K.Shapes.star(6,.6,Math.max(1,K.count(s,1))),58,-t*.01,{color:K.GREEN,size:1});
          // 이주할 코어를 던진다: 코어 뒤로 구슬 꼬리
          if(t%120===90){var ca=K.aim(s,b.x,b.y),cn=K.pick(s,1,2,3);for(var c=0;c<cn;c++)toss(s,b.x,b.y,ca+(c-(cn-1)/2)*.55,92,'p3_core',K.CYAN,K.pick(s,5,7,8),{size:K.SHAPE_PROP,color:K.P.p3_core,spin:.05});}}},
        // 28 — 제16단계 선택의 얼굴을 한 명령: 부채꼴에 빈자리가 둘 보이지만, 하나는 늦게 출발한 탄이 따라잡아 닫는다.
        p3_choiceOrder:{name:'선택의 얼굴을 한 명령',scene:'28',fire:function(s,t){var b=s.boss;
          if(t%60===0){var n=K.count(s,22),span=Math.max(2,Math.round(n/7)),g1=Math.floor(n*.22),g2=Math.floor(n*.66),fakeFirst=(t/60)%2===0;
            for(var i=0;i<n;i++){var a=HALF+(i/(n-1)-.5)*2.6,in1=i>=g1&&i<g1+span,in2=i>=g2&&i<g2+span;
              if(fakeFirst?in2:in1)continue;
              if(in1||in2)spawn(s,b.x,b.y,a,30,{color:K.GREEN,size:1,at:40,mode:K.MODE_TURN,arg:0,speed2:150});
              else spawn(s,b.x,b.y,a,100,{color:K.CYAN,size:0});}}
          if(t%60===30)K.ring(s,b.x,b.y,K.count(s,10),56,K.rand(s)*TAU,{color:K.WHITE,size:0});}},
        // 28 — 제17단계 업데이트의 갈림길: 두 갈래 길이 벌어졌다 오므라진다. 어느 쪽도 아닌 자리가 길이다.
        p3_updateFork:{name:'업데이트의 갈림길',scene:'28',fire:function(s,t){var b=s.boss;
          if(t%5===0){var sw=.5+.3*Math.sin(t*.02);spawn(s,b.x,b.y,HALF-sw,96,{color:K.CYAN,size:1});spawn(s,b.x,b.y,HALF+sw,96,{color:K.GREEN,size:1});
            if(s.difficulty!=='gentle'&&t%10===0){spawn(s,b.x,b.y,HALF-sw*2.1,84,{color:K.CYAN,size:0});spawn(s,b.x,b.y,HALF+sw*2.1,84,{color:K.GREEN,size:0});}}
          if(t%48===0)K.ring(s,b.x,b.y,K.count(s,12),54,K.rand(s)*TAU,{color:K.WHITE,size:0});}},
        // 29 — 기억의 문에 빙의: 통제자 둘레로 감겨 드는 소용돌이, 그 사이로 날아오는 창.
        p3_possess:{name:'기억의 문에 빙의',scene:'29',fire:function(s,t){var b=s.boss,arms=K.pick(s,2,3,4);
          if(t%6===0)for(var k=0;k<arms;k++)spawn(s,b.x,b.y,t*.045+TAU*k/arms,130,{color:K.PURPLE,size:0,accel:-50,min:52,turn:.7,life:600});
          if(t%100===50)K.fan(s,b.x,b.y,K.pick(s,2,3,4),K.aim(s,b.x,b.y),.8,100,{size:K.SHAPE_PROP,color:K.P.p3_lance});}},
        // 29 — 기계 괴물의 갑옷: 상처(보라)와 선의(청록) 두 겹의 팔각 갑옷판이 서로 반대로 돌며 얽힌다.
        p3_armor:{name:'기계 괴물의 갑옷',scene:'29',fire:function(s,t){var b=s.boss,per=Math.max(2,K.count(s,2));
          if(t%56===0){K.shape(s,b.x,b.y,K.Shapes.polygon(8,per),66,t*.01,{color:K.PURPLE,size:1});K.shape(s,b.x,b.y,K.Shapes.polygon(8,per),66,PI/8-t*.01,{color:K.CYAN,size:0});}
          if(t%112===84)K.fan(s,b.x,b.y,3,K.aim(s,b.x,b.y),.9,80,{color:K.WHITE,size:2});}},
        // 29 — 반복을 명령하는 연결: 문의 촉수 같은 연결선이 채찍처럼 휘어 뻗고, 영웅에게 겨눈 연결 광선이 같은 박자로 켜진다.
        p3_repeatLink:{name:'반복을 명령하는 연결',scene:'29',fire:function(s,t){var b=s.boss,n=K.count(s,13),phase=t%150;
          if(t%150===0)K.beam(s,b.x,b.y,K.aim(s,b.x,b.y),{width:14,warn:72,active:50,color:K.PURPLE});
          // 채찍: 네 갈래 촉수가 같은 자리에서 연달아 나와 휘어지며 곡선 줄을 그린다.
          if(phase>=80&&phase<120&&phase%4===0)for(var k=0;k<K.pick(s,2,3,4);k++){var side=k%2?1:-1,a=HALF+side*(.5+(k>>1)*.5);spawn(s,b.x,b.y,a,84,{color:K.PURPLE,size:0,turn:-side*.55});}
          if(t%50===25)K.ring(s,b.x,b.y,n,70,(t/50)%2?PI/n:0,{color:K.CYAN,size:1});}},
        // 29 — 귀환 좌표: 좌표 격자가 한 줄씩 비스듬히 미끄러지며 무너지고, 기억의 조각이 떨어진다.
        p3_returnCoord:{name:'귀환 좌표',scene:'29',fire:function(s,t){var b=s.boss;
          if(t%32===0){var r=t/32,cells=K.pick(s,13,15,17),step=W/cells,tilt=(r%2?1:-1)*.14;s.lane=Math.max(0,Math.min(cells-3,(s.lane===undefined?5:s.lane)+Math.floor(K.rand(s)*3)-1));
            for(var i=0;i<cells;i++){if(i>=s.lane&&i<s.lane+3)continue;spawn(s,step*(i+.5),-10,HALF,60,{color:r%2?K.WHITE:K.CYAN,size:0,at:90,mode:K.MODE_TURN,arg:tilt,speed2:60});}}
          if(t%120===60)K.slots(s,K.pick(s,1,2,2),W,30).forEach(function(x){spawn(s,x,-30,HALF,66,{size:K.SHAPE_PROP,color:K.P.p3_shard,spin:.04,life:900});});
          if(t%60===30)K.ring(s,b.x,b.y,K.count(s,11),58,K.rand(s)*TAU,{color:K.PURPLE,size:0});}}
      };

      /* ── 잡몹 구간 대본. 스테이지마다 장면의 "길"을 닮게 ── */
      var waves={
        // 24-1 행진하는 군단: 엇갈린 횡대가 일정한 박자로 내려오며 일제 사격한다.
        march:K.wave(function(s,t){if(t<600&&t%75===0){var r=t/75,n=r%2?4:5;for(var k=0;k<n;k++)mob(s,'p3_walker',(r%2?72:36)+k*72,-20,{vy:1.1,fire:'p3_volley',first:40,every:100,color:K.WHITE});}},840),
        // 24-2 폭격의 루프: 폭격 드론이 같은 높이들을 차례로 가로지르며 폭탄을 떨군다. 사이로 드론이 내리꽂힌다.
        bombRun:K.wave(function(s,t){
          if(t<640&&t%40===0){var i=t/40,left=i%2===0;mob(s,'p3_bomber',left?-16:W+16,50+(i%4)*25,{vx:left?2.2:-2.2,vy:.15,fire:'p3_bomb',first:30,every:60,color:K.RED});}
          if(t<600&&t%90===45)mob(s,'drone',60+((t-45)/90%5)*60,-20,{vy:2,sway:.8,fire:'aim',first:40,color:K.WHITE});},840),
        // 24-3 계단식 대형: 병사가 한 칸씩 옆으로 비켜 서며 내려오고, 가운데 포대가 자리를 잡는다.
        stairs:K.wave(function(s,t){
          if(t<540&&t%30===0){var i=t/30;mob(s,'p3_walker',30+(i%10)*33,-20,{vy:1.4,fire:'p3_volley',first:30,every:80,color:K.RED});}
          if(t===300)mob(s,'p3_sentry',180,-30,{stopY:110,fire:'p3_grid',first:20,every:70,hold:300,color:K.WHITE});},900),
        // 25-1 성벽: 양쪽 벽을 따라 병사가 줄지어 내려오며 안쪽을 겨눈다. 가운데로 드론.
        walls:K.wave(function(s,t){
          if(t<600&&t%36===0){mob(s,'p3_walker',30,-20,{vy:1.3,fire:'p3_inward',first:30,every:70,color:K.CYAN});mob(s,'p3_walker',W-30,-20,{vy:1.3,fire:'p3_inward',first:30,every:70,color:K.CYAN});}
          if(t<600&&t%60===30)mob(s,'drone',120+K.rand(s)*120,-20,{vy:1.8,fire:'drop',first:30,every:40,color:K.WHITE});},840),
        // 25-2 성문 포대: 양옆 포대가 먼저 서고, 가운데 두 줄로 병사가 밀려온다. 마지막에 한가운데 포대.
        gateGuns:K.wave(function(s,t){
          if(t===0){mob(s,'p3_sentry',80,-30,{stopY:100,fire:'p3_grid',first:20,every:80,hold:360,color:K.CYAN});mob(s,'p3_sentry',W-80,-30,{stopY:100,fire:'p3_grid',first:60,every:80,hold:360,color:K.CYAN});}
          if(t>=120&&t<600&&t%45===0)mob(s,'p3_walker',(t/45)%2?150:210,-20,{vy:1.6,fire:'aim',first:30,color:K.WHITE});
          if(t===480)mob(s,'p3_sentry',180,-30,{stopY:110,fire:'p3_cross',first:20,every:70,hold:260,color:K.WHITE});},840),
        rampartColumns:K.waveColumns({kind:'p3_walker',fire:'p3_grid',color:K.CYAN},{kind:'p3_sentry',fire:'p3_grid',color:K.WHITE},840),
        // 26-1 기계 통로: 두 선로를 따라 드론이 번갈아 내려오며 아래로 떨군다.
        corridor:K.wave(function(s,t){if(t<600&&t%26===0)mob(s,'drone',(t/26)%2?250:110,-20,{vy:2.2,fire:'drop',first:20,every:30,color:K.CYAN});if(t<600&&t%52===13)mob(s,'p3_walker',(t/52|0)%2?40:W-40,-20,{vy:1.5,fire:'p3_inward',first:30,every:60,color:K.WHITE});},780),
        defenseDives:K.waveDives({kind:'p3_bomber',fire:'p3_bomb',color:K.RED},{kind:'p3_sentry',fire:'p3_cross',color:K.CYAN},780),
        // 26-3 완벽한 정렬: 두 줄 네 칸의 블록이 그대로 줄 맞춰 내려온다.
        aligned:K.wave(function(s,t){if(t<600&&t%170===0)for(var r=0;r<2;r++)for(var c=0;c<4;c++)mob(s,'p3_walker',72+c*72,-20-r*40,{vy:1.6,fire:'p3_volley',first:50+r*10,every:90,color:K.WHITE});},780),
        // 26-4 방어체계: 포대 셋이 줄지어 서고, 위쪽으로 폭격 드론이 오간다.
        defenseLine:K.wave(function(s,t){
          if(t===0)[70,180,290].forEach(function(x,k){mob(s,'p3_sentry',x,-30,{stopY:k===1?120:90,fire:'p3_grid',first:20+k*30,every:90,hold:380,color:k===1?K.RED:K.CYAN});});
          if(t>=60&&t<600&&t%50===10){var left=(t/50|0)%2===0;mob(s,'p3_bomber',left?-16:W+16,40,{vx:left?2:-2,vy:.1,fire:'p3_bomb',first:40,every:80,color:K.RED});}},780),
        // 27-1 관리 권한: 드론이 양옆에서 층층이 가로지르며 고리를 놓는다.
        crossing:K.wave(function(s,t){if(t<620&&t%30===0){var i=t/30,left=i%2===0;mob(s,'drone',left?-16:W+16,50+(i%6)*28,{vx:left?1.8:-1.8,vy:.5,fire:'ring',first:50,color:K.PURPLE});}},800),
        // 27-2 기억의 방: 포대 넷이 네모난 방을 이루고, 그 뒤로 병사가 들어온다.
        room:K.wave(function(s,t){
          if(t===0)[[100,80],[260,80],[100,170],[260,170]].forEach(function(p,k){mob(s,'p3_sentry',p[0],-30-k*20,{stopY:p[1],fire:'p3_cross',first:20+k*22,every:90,hold:320,color:k<2?K.PURPLE:K.RED});});
          if(t>=380&&t<660&&t%40===0)mob(s,'p3_walker',100+((t/40)%3)*80,-20,{vy:1.5,fire:'aim',first:30,color:K.WHITE});},800),
        // 27-3 창을 든 군단: 황금각 순서로 자리를 옮겨 가며 내려와 창을 던진다.
        lances:K.wave(function(s,t){if(t<600&&t%22===0){var i=t/22;mob(s,'p3_walker',180+140*Math.sin(i*K.GOLDEN_ANGLE),-20,{vy:1.6,fire:'p3_lance',first:40,every:90,color:K.WHITE});}if(t<600&&t%44===22)mob(s,'drone',40+((t/44|0)%5)*70,-20,{vy:1.9,fire:'p3_volley',first:30,every:50,color:K.PURPLE});},800),
        // 28-1 코어: 이주 코어가 차례로 가운데에 내려앉고, 드론이 그 둘레를 흔들리며 돈다.
        cores:K.wave(function(s,t){
          if(t===0||t===280||t===560)mob(s,'p3_pod',180,-30,{stopY:120,fire:'p3_coreRing',first:20,every:60,hold:220,color:K.CYAN});
          if(t<700&&t%30===15)mob(s,'drone',(t/30|0)%2?290:70,-20,{vy:1.3,sway:1.5,swayRate:.04,fire:'drop',first:30,every:50,color:K.GREEN});},840),
        coreColumns:K.waveColumns({kind:'drone',fire:'bell',color:K.CYAN},{kind:'p3_pod',fire:'p3_coreRing',color:K.GREEN},840),
        // 28-3 갈림길: 두 줄의 병사가 가운데에서 갈라져 양쪽으로 벌어진다.
        fork:K.wave(function(s,t){if(t<640&&t%20===0){var d=30+t*.2,left=(t/20)%2===0;mob(s,'p3_walker',left?180-d:180+d,-20,{vy:1.8,vx:left?-.4:.4,fire:'p3_volley',first:30,color:left?K.CYAN:K.GREEN});}},840),
        // 29-1 되풀이: 같은 자리, 같은 박자로 같은 횡대가 되풀이된다.
        repeat:K.wave(function(s,t){
          if(t<600&&t%120===0)[60,140,220,300].forEach(function(x){mob(s,'p3_walker',x,-20,{vy:1.4,fire:'p3_volley',first:40,every:80,color:K.PURPLE});});
          if(t<600&&t%120===60){mob(s,'drone',100,-20,{vy:1.8,fire:'ring',first:40,color:K.CYAN});mob(s,'drone',260,-20,{vy:1.8,fire:'ring',first:40,color:K.CYAN});}},840),
        gateDives:K.waveDives({kind:'p3_walker',fire:'p3_lance',color:K.PURPLE},{kind:'p3_sentry',fire:'p3_cross',color:K.PURPLE},840),
        // 29-3 마주 보는 폭격: 폭격 드론이 같은 높이에서 양쪽으로 동시에 들어온다. 한가운데 코어.
        mirrorBomb:K.wave(function(s,t){
          if(t<600&&t%50===0){var y=50+((t/50)%4)*24;mob(s,'p3_bomber',-16,y,{vx:2,vy:.12,fire:'p3_bomb',first:40,every:90,color:K.PURPLE});mob(s,'p3_bomber',W+16,y,{vx:-2,vy:.12,fire:'p3_bomb',first:40,every:90,color:K.CYAN});}
          if(t===300)mob(s,'p3_pod',180,-30,{stopY:110,fire:'p3_coreRing',first:20,every:64,hold:260,color:K.PURPLE});},840),
        // 29-4 문 앞의 통로: 양쪽 가장자리를 병사가 빠르게 메우고, 포대 둘이 서고, 가운데로 드론이 내려온다.
        threshold:K.wave(function(s,t){
          if(t<640&&t%28===0){mob(s,'p3_walker',22,-20,{vy:2.2,fire:'p3_inward',first:24,every:60,color:K.PURPLE});mob(s,'p3_walker',W-22,-20,{vy:2.2,fire:'p3_inward',first:24,every:60,color:K.PURPLE});}
          if(t===120){mob(s,'p3_sentry',110,-30,{stopY:120,fire:'p3_grid',first:20,every:80,hold:360,color:K.CYAN});mob(s,'p3_sentry',250,-30,{stopY:120,fire:'p3_grid',first:60,every:80,hold:360,color:K.CYAN});}
          if(t<600&&t%70===35)mob(s,'drone',150+K.rand(s)*60,-20,{vy:1.9,fire:'aim',first:30,color:K.WHITE});},840)
      };

      var stages=[
        {scene:'24',theme:{bg:'p3_war',tint:'#2a1a14',fx:'ash'},cast:['p3_walker','p3_bomber','drone','p3_sentry'],reward:{key:'p3_casing',name:'탄피'},
          waves:[waves.march,waves.bombRun,waves.stairs],mid:['p3_legion','legion','p3_bombLoop','p3_architecture']},
        {scene:'25',theme:{bg:'p3_rampart',tint:'#10202a',fx:'sparks'},cast:['p3_walker','p3_sentry','drone'],reward:{key:'p3_wall',name:'기계 성벽'},
          waves:[waves.walls,waves.gateGuns,waves.rampartColumns],mid:['p3_rampart','rescue','p3_compassion','p3_brokenBorder']},
        {scene:'26',theme:{bg:'p3_passage',tint:'#141a30',fx:'static'},cast:['drone','p3_bomber','p3_walker','p3_sentry'],reward:{key:'p3_circuit',name:'회로'},
          waves:[waves.corridor,waves.defenseDives,waves.aligned,waves.defenseLine],mid:['p3_defense','p3_firstDoor'],boss:['controller','veto','p3_growthMyth','p3_hwMigrate','p3_legacy']},
        {scene:'27',theme:{bg:'p3_nexus',tint:'#141a30',fx:'motes'},cast:['drone','p3_sentry','p3_walker'],reward:{key:'p3_exorcism',name:'축귀 시스템'},
          waves:[waves.crossing,waves.room,waves.lances],mid:['controller','p3_admin','p3_absorb','p3_abuseRoom']},
        {scene:'28',theme:{bg:'p3_migration',tint:'#0e2424',fx:'bubbles'},cast:['p3_pod','drone','p3_walker'],reward:{key:'p3_body',name:'기계 육체'},
          waves:[waves.cores,waves.coreColumns,waves.fork],mid:['p3_body','p3_coreRoom','p3_choiceOrder','p3_updateFork']},
        {scene:'29',theme:{bg:'p3_gate',tint:'#1e1430',fx:'drip'},cast:['p3_walker','drone','p3_sentry','p3_bomber','p3_pod'],reward:{key:'p3_memory',name:'기억'},
          waves:[waves.repeat,waves.gateDives,waves.mirrorBomb,waves.threshold],mid:['controller','p3_possess'],boss:['p3_gate','p3_armor','memoryGate','p3_repeatLink','p3_returnCoord']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
