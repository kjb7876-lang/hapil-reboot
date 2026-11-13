/* 합일 v43 · 제2부 — 일곱 개의 귀와 하이테크 축귀. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다.
 * 일곱 죄는 저마다 색·날씨·잡몹·탄 모양으로 구별한다.
 *   나태 초록·흰색, 쌓였다가 늦게 쏟아지는 것 · 질투 청록·초록, 금이 가 갈라지는 유리와 거울 · 탐식 노랑·초록, 삼켰다 뱉는 것과 가스
 *   색욕 빨강·보라, 실과 하이힐과 하트 · 탐욕 노랑·흰색, 지폐와 동전과 눈보라 · 분노 빨강·노랑, 불과 계단 · 교만 흰색·노랑, 전극과 육망성과 일곱 갈래 신호 */
(function(root){
  'use strict';
  var part={part:2,
    actors:{
      p2_demons:{name:'일흔두 악마',c1:2,c2:8},
      p2_belphegor:{name:'벨페고르',c1:5,c2:8},
      p2_leviathan:{name:'레비아탄',c1:4,c2:5},
      p2_beelzebub:{name:'베엘제붑',c1:6,c2:5},
      p2_greed:{name:'탐욕의 귀',c1:6,c2:8},
      p2_mammon:{name:'맘몬',c1:6,c2:4},
      p2_wrath:{name:'분노의 귀',c1:0,c2:6},
      p2_chairman:{name:'회장',c1:8,c2:4},
      p2_core:{name:'연산핵',c1:4,c2:2}
    },
    mobs:{
      p2_trash:{hp:8,r:15,score:300},p2_shard:{hp:6,r:13,score:300},p2_maw:{hp:7,r:14,score:300},p2_heart:{hp:6,r:13,score:300},
      p2_coin:{hp:7,r:14,score:300},p2_wolfire:{hp:7,r:15,score:300},
      p2_bear:{hp:110,r:24,score:5500,elite:true},p2_sigil:{hp:90,r:22,score:4500,elite:true}
    },
    props:[{key:'p2_sofa',radius:16},{key:'p2_knife',radius:11},{key:'p2_pan',radius:13},{key:'p2_goldcoin',radius:11},{key:'p2_flame',radius:11},{key:'p2_electrode',radius:9}],
    build:function(K){
      var W=K.W,TAU=K.TAU,PI=Math.PI,HALF=PI/2,RED=K.RED,PURPLE=K.PURPLE,CYAN=K.CYAN,GREEN=K.GREEN,YELLOW=K.YELLOW,WHITE=K.WHITE,RICE=K.RICE,PROP=K.SHAPE_PROP,P=K.P;
      var rand=K.rand,count=K.count,pick=K.pick,aim=K.aim,spawn=K.spawn,ring=K.ring,fan=K.fan,bell=K.bell,curtain=K.curtain,shape=K.shape,Shapes=K.Shapes,mob=K.mob;
      var TURN=K.MODE_TURN,REAIM=K.MODE_REAIM,SPLIT=K.MODE_SPLIT,BRANCH=K.MODE_BRANCH;
      // 속도 v로 쏜 탄이 거리 d에서 멈추게 하는 감속도(난이도 속도 배율을 반영한다)와 멈추기까지의 틱
      function brake(s,v,d){var e=v*s.rules.speed;return -(e*e)/(2*d);}
      function stopTicks(s,v,d){var e=v*s.rules.speed;return Math.round(2*d/e*60);}
      // 하트 곡선 점 묶음(원점 기준 단위 좌표). 한 번 만들어 두고 다시 쓴다.
      var hearts={};
      function heart(n){if(hearts[n])return hearts[n];var raw=[],i,u,my=0,max=0,out=[];
        for(i=0;i<n;i++){u=TAU*i/n;raw.push(16*Math.pow(Math.sin(u),3),-(13*Math.cos(u)-5*Math.cos(2*u)-2*Math.cos(3*u)-Math.cos(4*u)));my+=raw[i*2+1]/n;}
        for(i=0;i<raw.length;i+=2){raw[i+1]-=my;max=Math.max(max,Math.sqrt(raw[i]*raw[i]+raw[i+1]*raw[i+1]));}
        for(i=0;i<raw.length;i+=2){var x=raw[i]/max,y=raw[i+1]/max;if(x*x+y*y>=.0144)out.push(x,y);}
        hearts[n]=out;return out;}
      // 수집한 고통: 일곱 귀의 탄이 차례로 돌아온다(나태·질투·탐식·색욕·탐욕·분노·교만).
      var SINS=[[P.tissue,GREEN],[P.p2_knife,CYAN],[P.p2_pan,YELLOW],[P.heel,RED],[P.money,YELLOW],[P.p2_flame,RED],[P.p2_electrode,WHITE]];

      // 던지기: 큰 기물이 날아가면 같은 방향으로 조금씩 느린 구슬이 뒤따라 꼬리를 이룬다.
      function tail(s,x,y,a,v,n,o){for(var i=0;i<n;i++)spawn(s,x,y,a+(i%2?1:-1)*i*.012,v*(1-.075*(i+1)),o);}
      // 휘두르기: from에서 to로 각도를 옮기며 속도를 조금씩 줄여 쏘면, 앞줄이 휘두른 칼끝의 호처럼 휜다.
      function swing(s,x,y,from,to,n,v,dv,o){for(var i=0;i<n;i++)spawn(s,x,y,from+(to-from)*(n>1?i/(n-1):0),v-dv*i,o);}

      var mobFire={
        // 나태: 무거운 초록 방울이 천천히 떨어진다
        p2_drip:function(s,m){spawn(s,m.x,m.y,HALF,44,{color:GREEN,size:2});fan(s,m.x,m.y,count(s,3),HALF,1.1,36,{color:WHITE,size:0});},
        // 질투: 유리 조각이 날아가다 금이 가며 갈라진다
        p2_crack:function(s,m){fan(s,m.x,m.y,pick(s,1,2,2),aim(s,m.x,m.y),.5,84,{color:CYAN,size:1,at:44,mode:BRANCH,arg:3,gen:1,speed2:70});},
        // 탐식: 내뱉은 고리가 멈췄다가 몹을 지나 되삼켜지며 반대편으로 뱉어진다
        p2_gulp:function(s,m){ring(s,m.x,m.y,count(s,8),120,m.shots*.4,{color:YELLOW,size:0,accel:-220,min:0,at:44,mode:TURN,arg:PI,speed2:72});},
        // 색욕: 양옆으로 휘어 들어오는 한 쌍
        p2_kiss:function(s,m){var a=aim(s,m.x,m.y);fan(s,m.x,m.y,count(s,2),a+.5,.3,80,{color:RED,size:1,turn:-.6});fan(s,m.x,m.y,count(s,2),a-.5,.3,80,{color:PURPLE,size:1,turn:.6});},
        // 탐욕: 흩어진 동전이 멈췄다가 모두 같은 쪽으로 날아간다
        p2_flip:function(s,m){var n=count(s,7),to=aim(s,m.x,m.y);for(var i=0;i<n;i++){var a=TAU*i/n;spawn(s,m.x,m.y,a,80,{color:YELLOW,size:1,accel:brake(s,80,26),min:0,at:46,mode:TURN,arg:to-a,speed2:76});}},
        // 눈보라: 바람에 휘는 눈송이
        p2_flake:function(s,m){fan(s,m.x,m.y,count(s,3),HALF,1.3,58,{color:WHITE,size:0,turn:.3});},
        // 분노: 불씨 하나와 작은 불티
        p2_spark:function(s,m){spawn(s,m.x,m.y,HALF,58,{size:PROP,color:P.p2_flame,spin:.08});tail(s,m.x,m.y,HALF,58,2,{color:RED,size:0});fan(s,m.x,m.y,count(s,2),aim(s,m.x,m.y),.4,82,{color:RED,size:0});},
        // 교만: 일곱 갈래로 퍼지는 신호
        p2_signal:function(s,m){ring(s,m.x,m.y,7,62,HALF,{color:m.color,size:0});ring(s,m.x,m.y,7,46,HALF+PI/7,{color:WHITE,size:0});},
        // 사이보그 개: 짧고 빠른 물어뜯기
        p2_bite:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.24,116,{color:CYAN,size:RICE});}
      };
      function seaGap(s,t){var gw=pick(s,5,5,4)+((t/34|0)%6<3?0:1);return [Math.max(1,Math.min(15-gw,8-(gw>>1)+Math.round(3.5*Math.sin(t*.0045)))),gw];}

      var spells={
        // ── 13 솔로몬의 봉인식 · 일흔두 악마(무기 없음: 악마의 이름과 봉인의 힘)
        p2Sea:{name:'검은 바다',fire:function(s,t){var b=s.boss,g;
          // 검은 바다가 갈라진다: 위에서 내려오는 두 겹 물결 가운데에 갈라진 길이 숨 쉬듯 넓어졌다 좁아지며 흔들린다.
          if(t%34===0){g=seaGap(s,t);curtain(s,16,g[0],g[1],58,{color:PURPLE,size:1});}
          if(t%68===17){g=seaGap(s,t-17);curtain(s,16,g[0],g[1],50,{color:WHITE,size:0});}
          if(t%80===40){fan(s,b.x,b.y,count(s,4),HALF-1.15,.5,74,{color:WHITE,size:0});fan(s,b.x,b.y,count(s,4),HALF+1.15,.5,74,{color:WHITE,size:0});}}},
        p2Seal:{name:'일흔두 번째 봉인',fire:function(s,t){var b=s.boss,k,per=count(s,6);
          // 봉인 문양: 고리 아홉 겹(기본 난이도 72발)이 조금씩 비틀린 채 한꺼번에 퍼져 바퀴살 모양 인장을 이룬다.
          if(t%96===0){var base=rand(s)*TAU,dir=(t/96)%2?1:-1;for(k=0;k<9;k++)ring(s,b.x,b.y,per,44+k*9,base+dir*k*.075,{color:k%3===2?WHITE:PURPLE,size:k===8?1:0});}
          if(t%96===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.4,98,{color:WHITE,size:RICE});}},
        // ── 14 나태의 집 · 벨페고르(무기: 날아오는 휴지뭉치·소파·침대·약병)
        p2Heap:{name:'쓰레기 산',fire:function(s,t){var b=s.boss,k;
          // 쓰레기 산: 휴지뭉치와 썩은 방울이 떨어져 화면 위쪽에 층층이 쌓였다가, 한참 뒤에야 천천히 무너져 내린다.
          if(t%8===0)for(k=0;k<count(s,1);k++){var x=14+rand(s)*(W-28),y=130+rand(s)*170,d=y+12,hold=150+Math.floor(rand(s)*100),o=rand(s)<.4;
            spawn(s,x,-12,HALF,96,o?{size:PROP,color:P.tissue,spin:.02,accel:brake(s,96,d),min:0,at:stopTicks(s,96,d)+hold,mode:TURN,arg:0,speed2:40,life:1700}
              :{color:rand(s)<.5?GREEN:WHITE,size:rand(s)<.5?2:1,accel:brake(s,96,d),min:0,at:stopTicks(s,96,d)+hold,mode:TURN,arg:0,speed2:40,life:1700});}
          if(t%96===48)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.5,70,.45,{color:WHITE,size:0});}},
        p2Postponed:{name:'미뤄 둔 시간',fire:function(s,t){var b=s.boss,phase=t%250,k;
          // 미뤄 둔 시간: 흩어져 공중에 멈춰 선 탄들이 한 순간에 모두 곧장 아래로 쏟아진다.
          if(phase<140&&phase%3===0)for(k=0;k<count(s,1.4);k++){var a=phase*.23+k*2.4,d=60+rand(s)*210;
            spawn(s,b.x,b.y,a,150,{color:(phase/3)%2?WHITE:GREEN,size:(phase/3)%2?RICE:1,accel:brake(s,150,d),min:0,at:Math.max(stopTicks(s,150,d)+4,190-phase),mode:TURN,arg:HALF-a,speed2:58+rand(s)*26});}
          if(phase===200)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.4,80,.45,{color:GREEN,size:0});
          if(phase===120)ring(s,b.x,b.y,count(s,12),50,rand(s)*TAU,{color:WHITE,size:0});}},
        p2Fentanyl:{name:'펜타닐 약병',fire:function(s,t){var b=s.boss,k;
          // 무기(던지기): 벨페고르가 소파와 침대 같은 짐을 던진다. 짐 뒤로 오물 구슬 꼬리가 따라온다. 굴러온 약병은 깨지며 고리로 흩어진다.
          if(t%pick(s,52,44,38)===0)spawn(s,b.x,b.y,aim(s,b.x,b.y)+(rand(s)-.5)*.6,130,{color:GREEN,size:2,accel:-60,min:30,at:72,mode:SPLIT,arg:count(s,11),speed2:64});
          if(t%96===48){var n=pick(s,2,3,3),a0=aim(s,b.x,b.y);for(k=0;k<n;k++){var a=a0+(n>1?k/(n-1)-.5:0)*1.1;spawn(s,b.x,b.y,a,80,{size:PROP,color:P.p2_sofa,spin:.012,life:1100});tail(s,b.x,b.y,a,80,count(s,4),{color:GREEN,size:1});}}
          if(t%100===25)ring(s,b.x,b.y,count(s,12),54,rand(s)*TAU,{color:WHITE,size:0});}},
        p2Vinyl:{name:'창문의 비닐',fire:function(s,t){var b=s.boss,i;
          // 창문의 비닐: 가로로 덮인 검은 비닐이 내려오다 한 점에서 찢어져 양옆으로 벌어진다. 휴지뭉치가 꼬리를 끌며 날아온다.
          if(t%42===0){s.lane=Math.max(2,Math.min(11,(s.lane===undefined?6:s.lane)+Math.floor(rand(s)*3)-1));var g=s.lane,odd=(t/42)%2;
            for(i=0;i<14;i++){if(i===g||i===g+1)continue;spawn(s,W/14*(i+.5),-10,HALF,60,{color:odd?PURPLE:GREEN,size:1,at:52,mode:TURN,arg:i<g?.5:-.5,speed2:58});}}
          if(t%10===5)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,HALF,38+rand(s)*24,{color:WHITE,size:0});
          if(t%120===60){var a=aim(s,b.x,b.y);fan(s,b.x,b.y,pick(s,2,3,3),a,.9,56,{size:PROP,color:P.tissue,spin:.03});tail(s,b.x,b.y,a,56,count(s,3),{color:GREEN,size:0});}}},
        // ── 15 금이 간 안경 · 레비아탄(무기: 칼날과 유리 조각, 목에 감긴 질투의 뱀)
        p2Snake:{name:'질투의 뱀',fire:function(s,t){var b=s.boss,pairs=pick(s,1,1,2),k;
          // 채찍처럼: 좌우 대칭의 두 줄기가 구불구불 몸을 비틀며 내려온다. 이따금 독니가 겨눈다.
          if(t%pick(s,5,4,4)===0)for(k=0;k<pairs;k++){var a=HALF+.8*Math.sin(t*.045+k*PI),head=t%60===0;
            spawn(s,b.x-18,b.y+8,a,88,{color:head?CYAN:GREEN,size:head?2:1});spawn(s,b.x+18,b.y+8,PI-a,88,{color:head?CYAN:GREEN,size:head?2:1});}
          if(t%90===45)fan(s,b.x,b.y,count(s,2),aim(s,b.x,b.y),.18,108,{color:CYAN,size:RICE});}},
        p2Glass:{name:'칼날과 유리 조각',fire:function(s,t){var b=s.boss,k;
          // 무기(찌르기): 칼날이 곧게 찔러 오고 그 뒤로 좁은 잔상 줄이 따른다. 큰 유리알은 금이 가며 셋으로, 다시 셋으로 갈라진다.
          if(t%66===0)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),1.6,88,{color:CYAN,size:2,at:46,mode:BRANCH,arg:3,gen:2,speed2:74});
          if(t%66===40){var n=pick(s,2,3,3),a0=aim(s,b.x,b.y);for(k=0;k<n;k++){var a=a0+(n>1?k/(n-1)-.5:0)*.7;spawn(s,b.x,b.y,a,120,{size:PROP,color:P.p2_knife,spin:0});tail(s,b.x,b.y,a,120,count(s,5),{color:WHITE,size:RICE});}}}},
        p2Venom:{name:'레비아탄의 독',fire:function(s,t){var b=s.boss;
          // 독이 스며든다: 위에서 떨어진 독방울이 중간쯤에서 터져 작게 번진다.
          if(t%pick(s,10,8,6)===0)spawn(s,10+rand(s)*(W-20),-10,HALF,64+rand(s)*22,{color:GREEN,size:1,at:120+Math.floor(rand(s)*130),mode:SPLIT,arg:pick(s,4,5,5),speed2:44});
          if(t%120===60)ring(s,b.x,b.y,count(s,10),58,rand(s)*TAU,{color:CYAN,size:0});}},
        p2Future:{name:'가질 수도 있었던 미래',fire:function(s,t){var b=s.boss,mx=W-b.x,a=t*.013;
          // 거울 속 다른 삶: 보스 자리와 거울에 비친 자리에서 좌우가 뒤집힌 같은 꽃무늬가 함께 피고, 거울 쪽이 겨눈다.
          if(t%70===0){shape(s,b.x,b.y,Shapes.rose(3,count(s,21)),76,a,{color:CYAN,size:0});shape(s,mx,b.y,Shapes.rose(3,count(s,21)),76,PI-a,{color:WHITE,size:0});}
          if(t%70===35)fan(s,mx,b.y,count(s,2),aim(s,mx,b.y),.3,100,{color:WHITE,size:RICE});}},
        // ── 16 탐식의 주방 · 베엘제붑(무기: 식칼과 프라이팬, 독가스)
        p2Pans:{name:'식칼과 프라이팬',fire:function(s,t){var b=s.boss,k,n=pick(s,1,1,2);
          // 무기(던지기·내려치기): 프라이팬이 기름 꼬리를 끌며 양옆으로 크게 휘어 날고, 식칼이 영웅 머리 위에서 떨어져 내려치면 양옆으로 기름이 튄다.
          if(t%66===0)for(k=0;k<n;k++){var a=HALF-1.15-k*.3;spawn(s,b.x,b.y,a,108,{size:PROP,color:P.p2_pan,spin:.15,turn:.85});tail(s,b.x,b.y,a,108,count(s,3),{color:YELLOW,size:0,turn:.85});
            spawn(s,b.x,b.y,PI-a,108,{size:PROP,color:P.p2_pan,spin:-.15,turn:-.85});tail(s,b.x,b.y,PI-a,108,count(s,3),{color:YELLOW,size:0,turn:-.85});}
          if(t%110===80){var x=Math.max(30,Math.min(W-30,s.player.x+(rand(s)-.5)*60));spawn(s,x,-24,HALF,96,{size:PROP,color:P.cleaver,spin:.2});
            for(k=1;k<=count(s,3);k++){spawn(s,x,-24,HALF-.18*k,96-k*9,{color:YELLOW,size:1});spawn(s,x,-24,HALF+.18*k,96-k*9,{color:YELLOW,size:1});}}
          if(t%44===22)ring(s,b.x,b.y,count(s,13),66,rand(s)*TAU,{color:YELLOW,size:0});}},
        p2Gas:{name:'독가스',fire:function(s,t){var b=s.boss,odd=(t/96)%2;
          // 독가스: 크고 느린 거품이 흔들리며 번진다. 그 사이로 노란 침이 겨눠 온다.
          if(t%96===0)fan(s,b.x,b.y,pick(s,5,6,7),HALF+(odd?.18:-.18),2.5,54,{color:GREEN,size:4,accel:-12,min:26,turn:odd?.22:-.22,life:950});
          if(t%32===16)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.35,104,{color:YELLOW,size:RICE});
          if(t%48===40)ring(s,b.x,b.y,count(s,12),48,rand(s)*TAU,{color:GREEN,size:0});}},
        p2Stomach:{name:'거대한 위장',fire:function(s,t){var b=s.boss;
          // 거대한 위장: 펼쳐진 고리가 멈췄다가 한가운데로 빨려 들어가 삼켜지고, 그대로 반대편으로 뱉어진다.
          if(t%110===0){var d=110;ring(s,b.x,b.y,count(s,24),150,rand(s)*TAU,{color:YELLOW,size:1,accel:brake(s,150,d),min:0,at:stopTicks(s,150,d)+26,mode:TURN,arg:PI,speed2:92});}
          if(t%110===55){var e=70;ring(s,b.x,b.y,count(s,18),120,rand(s)*TAU,{color:GREEN,size:0,accel:brake(s,120,e),min:0,at:stopTicks(s,120,e)+20,mode:TURN,arg:PI,speed2:76});}}},
        p2Photo:{name:'오래된 사진',fire:function(s,t){var b=s.boss,i;
          // 오래된 사진: 네모난 사진틀이 퍼지다가 불붙어 흩어진다. 위에서는 불티가 내린다.
          if(t%100===0)shape(s,b.x,b.y,Shapes.polygon(4,Math.max(2,count(s,3))),66,PI/4+Math.sin(t*.01)*.2,{color:WHITE,size:1,at:72,mode:SPLIT,arg:3,speed2:58});
          if(t%9===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,HALF,40+rand(s)*30,{color:YELLOW,size:0});
          if(t%100===50)bell(s,b.x,b.y,count(s,7),aim(s,b.x,b.y),1.4,86,.45,{color:YELLOW,size:1});}},
        // ── 17 붉은 하이힐 · 아스모데우스(무기: 하이힐의 칼날, 매혹의 빛, 서윤을 묶은 투명한 실)
        p2Threads:{name:'투명한 실',fire:function(s,t){var b=s.boss,phase=t%64;
          // 채찍처럼: 천장에서 늘어진 가는 실(광선)과, 보스에게서 곧게 뻗는 점선 실 다발
          if(t%210===0)K.slots(s,pick(s,2,3,3),W,30).forEach(function(x){K.beam(s,x,-12,HALF+(rand(s)-.5)*.35,{width:8,warn:70,active:90,color:PURPLE});});
          if(phase<30&&phase%5===0)fan(s,b.x,b.y,count(s,6),HALF+.3*Math.sin(t/64),2.3,96,{color:RED,size:RICE});
          if(t%64===48)ring(s,b.x,b.y,count(s,10),50,rand(s)*TAU,{color:PURPLE,size:0});}},
        p2Charm:{name:'매혹의 빛',fire:function(s,t){var b=s.boss;
          // 매혹의 빛: 곧게 선 하트가 퍼지고, 영웅 양옆을 겨누는 두 줄기 빛이 켜진다.
          if(t%64===0)shape(s,b.x,b.y,heart(count(s,24)),80,0,{color:(t/64)%2?PURPLE:RED,size:1});
          if(t%64===32)ring(s,b.x,b.y,count(s,10),56,rand(s)*TAU,{color:RED,size:0});
          if(t%192===32){var a=aim(s,b.x,b.y);K.beam(s,b.x,b.y,a-.24,{width:10,warn:70,active:40,color:RED});K.beam(s,b.x,b.y,a+.24,{width:10,warn:70,active:40,color:RED});}}},
        p2Will:{name:'의지와 다르게',fire:function(s,t){var b=s.boss,i,n,side;
          // 무기(휘두르기): 영웅 손의 칼이 엉뚱한 쪽(거울 자리)으로 호를 그리며 휘둘러졌다가, 멈춰 서서 영웅의 목 쪽으로 돌아선다.
          if(t%76===0){n=count(s,10);side=(t/76)%2?1:-1;var a=Math.atan2(s.player.y-b.y,W-s.player.x-b.x);
            for(i=0;i<n;i++){var u=n>1?i/(n-1)-.5:0;spawn(s,b.x,b.y,a+side*u*1.1,150-Math.abs(u)*40,{color:RED,size:RICE,accel:-170,min:0,at:64,mode:REAIM,arg:u*.4,speed2:100});}}
          if(t%76===38)ring(s,b.x,b.y,count(s,16),52,rand(s)*TAU,{color:PURPLE,size:0});}},
        // ── 18 맘몬의 금고 · 탐욕의 귀(무기: 칼날로 변하는 지폐, 튕긴 동전)
        p2Bills:{name:'지폐가 칼날로',fire:function(s,t){var b=s.boss;
          // 무기: 흩뿌린 지폐 다발이 한참 날다가 셋으로 갈라진 칼날이 된다.
          if(t%58===0)ring(s,b.x,b.y,pick(s,6,8,12),84,rand(s)*TAU,{size:PROP,color:P.money,spin:.14,at:60,mode:BRANCH,arg:3,gen:1,speed2:94});
          if(t%58===29)bell(s,b.x,b.y,count(s,13),aim(s,b.x,b.y),1.5,90,.45,{color:YELLOW,size:1});}},
        p2Deal:{name:'조건이 숨겨진 거래',fire:function(s,t){var b=s.boss,phase=t%84,i;
          // 겉으로 고를 수 있는 두 길: 앞줄은 왼쪽·오른쪽 두 틈을 열지만, 바로 뒤따르는 줄은 한쪽 틈만 남긴다.
          if(phase===0){s.p2l=1+Math.floor(rand(s)*4);s.p2r=10+Math.floor(rand(s)*4);s.p2pick=rand(s)<.5?0:1;
            for(i=0;i<16;i++){if(i>=s.p2l&&i<s.p2l+3||i>=s.p2r&&i<s.p2r+3)continue;spawn(s,W/16*(i+.5),-10,HALF,56,{color:YELLOW,size:1});}}
          if(phase===26){var g=s.p2pick?s.p2r:s.p2l;for(i=0;i<16;i++){if(i>=g&&i<g+3)continue;spawn(s,W/16*(i+.5),-10,HALF,56,{color:WHITE,size:1});}}
          if(phase===56)ring(s,b.x,b.y,count(s,10),50,rand(s)*TAU,{color:YELLOW,size:0});
          if(t%168===120)fan(s,b.x,b.y,pick(s,2,3,3),aim(s,b.x,b.y),.7,84,{size:PROP,color:P.money,spin:.12});}},
        p2SameBack:{name:'같은 뒷면',fire:function(s,t){var b=s.boss,i;
          // 같은 뒷면: 튕겨 올린 동전들이 멈춰 커다란 동전 하나의 테두리를 이루고, 모두 같은 쪽으로 굴러온다.
          if(t%100===0){var n=pick(s,24,28,32),to=aim(s,b.x,b.y)+(rand(s)-.5)*.3,d=64,base=rand(s)*TAU;
            for(i=0;i<n;i++){var a=base+TAU*i/n;spawn(s,b.x,b.y,a,120,{color:YELLOW,size:1,accel:brake(s,120,d),min:0,at:stopTicks(s,120,d)+22,mode:TURN,arg:to-a,speed2:74});}}
          if(t%50===25)ring(s,b.x,b.y,count(s,12),54,rand(s)*TAU,{color:WHITE,size:0});}},
        p2Vault:{name:'금고 안쪽',fire:function(s,t){var b=s.boss;
          // 금고 안쪽: 금고 문 손잡이처럼 도는 광선 바퀴, 네모난 금속 벽, 쏟아지는 지폐
          if(t%480===0)K.wheel(s,pick(s,2,3,4),((t/480)%2?-1:1)*pick(s,.14,.18,.22),YELLOW,300);
          if(t%46===0)shape(s,b.x,b.y,Shapes.polygon(4,Math.max(2,count(s,5))),68,t*.02,{color:WHITE,size:0});
          if(t%92===69)ring(s,b.x,b.y,pick(s,4,5,6),78,rand(s)*TAU,{size:PROP,color:P.money,spin:.12});}},
        // ── 19 눈보라 속의 소년 · 탐욕의 귀 → 맘몬(무기: 돈. 굴러오는 금화)
        p2Blizzard:{name:'눈보라',fire:function(s,t){var b=s.boss,dir=Math.floor(t/300)%2?-1:1,k;
          // 눈보라: 바람이 한쪽으로 몰아치다 방향을 바꾼다. 눈송이는 바람에 휘며 비스듬히 내린다.
          if(t%4===0)for(k=0;k<count(s,1);k++)spawn(s,rand(s)*W,-10,HALF-dir*(.35+rand(s)*.3),64+rand(s)*40,{color:WHITE,size:rand(s)<.2?1:0,turn:dir*(rand(s)-.5)*.4});
          if(t%96===48)ring(s,b.x,b.y,count(s,12),56,rand(s)*TAU,{color:CYAN,size:1});}},
        p2Seats:{name:'돈과 자리',fire:function(s,t){var b=s.boss,k;
          // 무기(던지기): 금빛 줄과 흰 줄이 엇갈려 극장 좌석처럼 겹겹의 열을 이루고, 금화가 구슬 꼬리를 끌며 굴러 나온다.
          if(t%72===0)fan(s,b.x,b.y,count(s,11),HALF,2.6,80,{color:YELLOW,size:1});
          if(t%72===14)fan(s,b.x,b.y,count(s,10),HALF,2.6*.9,66,{color:WHITE,size:1});
          if(t%108===60){var n=pick(s,3,4,5),a0=aim(s,b.x,b.y);for(k=0;k<n;k++){var a=a0+(k-(n-1)/2)*.45;spawn(s,b.x,b.y,a,84,{size:PROP,color:P.p2_goldcoin,spin:.1});tail(s,b.x,b.y,a,84,count(s,3),{color:YELLOW,size:0});}}}},
        p2Snatch:{name:'먼저 빼앗는 사람',fire:function(s,t){var b=s.boss,p=s.player,phase=t%66;
          // 먼저 빼앗는 사람: 영웅이 피할 양옆 자리를 먼저 겨눠 막고, 그다음 영웅을 겨눈다.
          if(phase===0){fan(s,b.x,b.y,pick(s,3,4,4),Math.atan2(p.y-b.y,p.x-76-b.x),.14,110,{color:CYAN,size:RICE});fan(s,b.x,b.y,pick(s,3,4,4),Math.atan2(p.y-b.y,p.x+76-b.x),.14,110,{color:CYAN,size:RICE});}
          if(phase===22)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.36,94,{color:YELLOW,size:1});
          if(phase===44)ring(s,b.x,b.y,count(s,18),50,rand(s)*TAU,{color:WHITE,size:0});}},
        p2Keep:{name:'기억 보존',fire:function(s,t){var b=s.boss,i;
          // 기억 보존: 가는 여섯 갈래 눈 결정이 서로 반대로 돌며 피어나고, 숲에는 눈이 소리 없이 내린다.
          if(t%80===0)shape(s,b.x,b.y,Shapes.star(6,.28,2),70,t*.004,{color:WHITE,size:0});
          if(t%80===40)shape(s,b.x,b.y,Shapes.star(6,.28,2),56,-t*.004+PI/6,{color:CYAN,size:0});
          if(t%12===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,HALF+(rand(s)-.5)*.3,40+rand(s)*24,{color:WHITE,size:0,life:900});
          if(t%60===45)fan(s,b.x,b.y,count(s,2),aim(s,b.x,b.y),.3,96,{color:CYAN,size:RICE});}},
        // ── 20 불을 지른 남자 · 분노의 귀(무기: 불길, 곰과 늑대와 용의 발톱·이빨·숨)
        p2Stairs:{name:'대피',fire:function(s,t){var b=s.boss,k,j;
          // 대피: 계단 모양으로 꺾인 불줄이 내려온다. 한 칸씩 옮겨 가는 빈 계단이 피난로다.
          if(t%46===0){s.lane=Math.max(0,Math.min(5,(s.lane===undefined?2:s.lane)+Math.floor(rand(s)*3)-1));var up=Math.floor(t/400)%2;
            for(k=0;k<6;k++){if(k===s.lane)continue;var y=-10-(up?k:5-k)*14;for(j=0;j<pick(s,3,3,4);j++)spawn(s,k*60+10+j*(pick(s,3,3,4)>3?13.3:20),y,HALF,56,{color:(t/46)%2?RED:YELLOW,size:1});}}
          if(t%11===0)for(k=0;k<count(s,1);k++)spawn(s,8+rand(s)*(W-16),-8,HALF,36+rand(s)*20,{color:RED,size:0});
          if(t%90===45){var x=20+rand(s)*(W-40);spawn(s,x,-24,HALF,48,{size:PROP,color:P.p2_flame,spin:.06});tail(s,x,-24,HALF,48,3,{color:YELLOW,size:0});}}},
        p2Beasts:{name:'곰과 늑대, 용',fire:function(s,t){var b=s.boss,phase=t%240,a,k;
          // 무기(휘두르기): 곰의 앞발이 좌우로 호를 그리며 할퀴고 → 늑대가 빠르게 물어뜯고 → 용이 좌우로 불길을 휩쓴다.
          if(phase<70&&phase%30===0){a=aim(s,b.x,b.y);var sd=(phase/30)%2?1:-1;for(k=0;k<3;k++)swing(s,b.x+k*10*sd,b.y,a-sd*.9,a+sd*.9,count(s,8),82-k*8,3,{color:k?RED:YELLOW,size:k?1:2});}
          if(phase>=84&&phase<150&&phase%11===0)fan(s,b.x,b.y,pick(s,3,4,5),aim(s,b.x,b.y)+(rand(s)-.5)*.2,.3,118,{color:YELLOW,size:RICE});
          if(phase>=160&&phase<232&&phase%3===0){a=HALF+1.1*Math.sin((phase-160)*.05);for(k=0;k<count(s,2);k++)spawn(s,b.x,b.y,a+k*.1,88-k*10,{color:k%2?YELLOW:RED,size:0});}}},
        p2Insult:{name:'쌓인 모욕과 분노',fire:function(s,t){var b=s.boss;
          // 쌓인 모욕과 분노: 천천히 내려앉던 불씨가 하나씩 터진다.
          if(t%pick(s,10,8,6)===0)spawn(s,10+rand(s)*(W-20),-10,HALF,40+rand(s)*22,{color:RED,size:1,at:110+Math.floor(rand(s)*190),mode:SPLIT,arg:pick(s,3,4,5),speed2:66});
          if(t%64===32)ring(s,b.x,b.y,count(s,9),52,rand(s)*TAU,{color:YELLOW,size:1});}},
        p2Blaze:{name:'불길 한가운데',fire:function(s,t){var b=s.boss,k,arms=count(s,3);
          // 무기(던지기): 불덩이 고리가 불꼬리를 끌며 퍼지는 가운데 여러 갈래 불꽃 소용돌이가 돌고, 위에서 재가 내린다.
          if(t%72===0){var n=pick(s,6,7,8),base=t*.05;for(k=0;k<n;k++){spawn(s,b.x,b.y,base+TAU*k/n,70,{size:PROP,color:P.p2_flame,spin:.1});tail(s,b.x,b.y,base+TAU*k/n,70,2,{color:YELLOW,size:0});}}
          if(t%6===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.035*((t/360|0)%2?-1:1)+TAU*k/arms,80,{color:k%2?YELLOW:RED,size:0});
          if(t%12===0)spawn(s,8+rand(s)*(W-16),-8,HALF,44+rand(s)*20,{color:RED,size:0});}},
        // ── 21 하늘에 서려는 자 · 교만의 회장(무기: 전극, 일곱 갈래 신호)
        p2Seven:{name:'일곱 갈래 신호',fire:function(s,t){var b=s.boss,k,cols=[RED,CYAN,YELLOW,GREEN,PURPLE,WHITE,RED];
          // 일곱 갈래 신호: 위쪽 일곱 자리에서 신호 줄기가 회장에게 모여들어 그를 지나 다시 퍼지고, 회장에게서 일곱 줄 광선이 뻗는다.
          if(t%pick(s,15,12,9)===0)for(k=0;k<7;k++){var x=W*(k+.5)/7;spawn(s,x,-10,Math.atan2(b.y+10,b.x-x),78,{color:cols[k],size:0});}
          if(t%260===100)for(k=0;k<7;k++)K.beam(s,b.x,b.y,HALF+(k-3)*.36,{width:8,warn:72,active:60,color:WHITE});}},
        p2Hexagram:{name:'육망성',fire:function(s,t){var b=s.boss,rot=t*.006,k;
          // 무기(찌르기): 피로 그린 육망성(위아래로 뒤집힌 두 삼각형)이 겹쳐 퍼지고, 전극 바늘이 곧게 찔러 오며 뒤에 잔상을 남긴다.
          if(t%80===0){var pts=Shapes.polygon(3,Math.max(3,count(s,5)));shape(s,b.x,b.y,pts,70,rot,{color:RED,size:1});shape(s,b.x,b.y,pts,70,rot+PI,{color:WHITE,size:1});}
          if(t%80===56){var n=pick(s,2,3,3),a0=aim(s,b.x,b.y);for(k=0;k<n;k++){var a=a0+(n>1?k/(n-1)-.5:0)*.6;spawn(s,b.x,b.y,a,112,{size:PROP,color:P.p2_electrode});tail(s,b.x,b.y,a,112,count(s,4),{color:YELLOW,size:RICE});}}
          if(t%80===30)ring(s,b.x,b.y,count(s,8),46,rand(s)*TAU,{color:YELLOW,size:0});}},
        // ── 22 생체 부트로더 · 회장 → 연산핵(무기: 기계 다리, 전선, 복제한 기술)
        p2Legs:{name:'기계 다리',fire:function(s,t){var b=s.boss,phase=t%90,k,legs=pick(s,6,7,8);
          // 무기(채찍): 몸통에서 여러 갈래 휘어진 기계 다리가 뻗어 나간다. 마디마다 방향이 엇갈린다.
          if(phase<36&&phase%4===0){var base=Math.floor(t/90)*.31;for(k=0;k<legs;k++)spawn(s,b.x,b.y,base+TAU*k/legs,84,{color:k%2?CYAN:WHITE,size:0,turn:k%2?.7:-.7,life:460});}
          if(phase===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.45,104,{color:WHITE,size:RICE});}},
        p2Copy:{name:'복제된 패턴',fire:function(s,t){var b=s.boss,phase=t%100;
          // 복제된 패턴: 흩뿌린 탄과 똑같은 무늬가 잠시 뒤 한 번 더 나온다(같은 난수를 되감아 다시 쏜다).
          function volley(color){var n=count(s,24),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n+(rand(s)-.5)*.35,58+rand(s)*48,{color:color,size:rand(s)<.25?1:0});}
          if(phase===0){s.p2seed=s.rng;volley(CYAN);}
          if(phase===36&&s.p2seed!==undefined){var keep=s.rng;s.rng=s.p2seed;volley(PURPLE);s.rng=keep;}
          if(phase===70)fan(s,b.x,b.y,count(s,4),aim(s,b.x,b.y),.5,100,{color:WHITE,size:RICE});}},
        p2Pain:{name:'수집한 고통',fire:function(s,t){var b=s.boss,k;
          // 무기(던지기): 회장이 모은 무기력·질투·굶주림·집착·탐욕·분노·교만의 무기(휴지·칼날·프라이팬·하이힐·지폐·불덩이·전극)가 꼬리를 끌며 차례로 되돌아온다.
          if(t%100===0){var sin=SINS[Math.floor(t/100)%7],n=pick(s,6,7,8),base=rand(s)*TAU;
            for(k=0;k<n;k++){spawn(s,b.x,b.y,base+TAU*k/n,74,{size:PROP,color:sin[0],spin:sin[0]===P.p2_electrode?0:.1});tail(s,b.x,b.y,base+TAU*k/n,74,2,{color:sin[1],size:0});}
            ring(s,b.x,b.y,count(s,14),56,base+PI/n,{color:sin[1],size:0});}
          if(t%100===50)bell(s,b.x,b.y,count(s,10),aim(s,b.x,b.y),1.5,88,.45,{color:SINS[Math.floor(t/100)%7][1],size:1});
          if(t%9===0)for(k=0;k<3;k++)spawn(s,b.x,b.y,t*.028+TAU*k/3,70,{color:PURPLE,size:0});}}
      };
      /* ── 잡몹 구간 대본. 장면마다 그 장소의 길처럼 ── */
      var w=K.wave;
      var stages=[
        // 13 솔로몬의 봉인식 — 지하 예배당. 갈라지는 검은 바다, 둥글게 솟는 악마들
        {scene:'13',theme:{bg:'p2_chapel',tint:'#140c24',fx:'mist'},cast:['nightmare','leech','guardian'],reward:{key:'p2_k_device',name:'장치'},
          waves:[
            w(function(s,t){ // 가운데에서 둘로 갈라져 양쪽으로 비켜 가는 떼(갈라지는 바다)
              if(t<480&&t%30===0){mob(s,'nightmare',172,-20,{vx:-1.3,vy:1.4,fire:'aim',first:50,every:46,color:PURPLE});mob(s,'nightmare',188,-20,{vx:1.3,vy:1.4,fire:'aim',first:50,every:46,color:PURPLE});}
              if(t>=520&&t<800&&t%40===0)mob(s,'leech',50+((t/40)%4)*87,-20,{vy:1.8,sway:.5,fire:'drop',first:30,every:50,color:WHITE});},820),
            w(function(s,t){ // 둥근 고리 모양으로 차례로 솟아 내려오는 악마들 → 봉인 지기
              if(t<520&&t%26===0){var i=t/26;mob(s,'leech',180+Math.cos(i*TAU/12)*150,-20,{vy:1.5,fire:'ring',first:60,color:PURPLE});}
              if(t===260)mob(s,'guardian',180,-30,{stopY:110,fire:'hexagon',first:20,every:80,hold:300,color:WHITE});},820),
            w(function(s,t){ // V자로 늘어선 다섯씩의 행렬
              if(t<640&&t%80===0)for(var k=0;k<5;k++)mob(s,'nightmare',40+k*70,-20-Math.abs(k-2)*22,{vy:1.25,sway:.4,fire:k%2?'drop':'aim',first:44,every:70,color:PURPLE});},820)],
          mid:['p2_demons','p2Sea','p2Seal']},
        // 14 나태의 집 — 쓰레기가 쌓인 집. 느리게 떠내려오는 쓰레기 더미
        {scene:'14',theme:{bg:'p2_sloth',tint:'#1e2412',fx:'dust'},cast:['p2_trash','slime','belphegor'],reward:{key:'p2_k_tissue',name:'휴지뭉치'},
          waves:[
            w(function(s,t){ // 느리게 내려앉는 쓰레기 더미
              if(t<620&&t%36===0)mob(s,'p2_trash',40+rand(s)*280,-20,{vy:.9,sway:.3,swayRate:.03,fire:'p2_drip',first:30,every:64,color:GREEN});},860),
            w(function(s,t){ // 양옆에서 기어 들어오는 오물 → 나태의 귀
              if(t<560&&t%44===0){var left=(t/44)%2===0;mob(s,'slime',left?-16:W+16,40+rand(s)*80,{vx:left?1.1:-1.1,vy:.5,fire:'tissue',first:40,every:70,color:GREEN});}
              if(t===300)mob(s,'belphegor',180,-30,{stopY:118,fire:'tissue',first:20,every:90,hold:300,color:GREEN});},860),
            w(function(s,t){ // 셋씩 뭉쳐 무너져 내리는 더미
              if(t<700&&t%60===0){var x=50+rand(s)*260;for(var k=0;k<3;k++)mob(s,'p2_trash',x+(k-1)*26,-20-k*18,{vy:1.1,fire:'drop',first:30+k*10,every:80,color:GREEN});}},860)],
          mid:['p2_belphegor','p2Heap'],boss:['p2_belphegor','p2Postponed','p2Fentanyl','p2Vinyl']},
        // 15 금이 간 안경 — 정돈된 집과 거울. 언제나 좌우 대칭으로
        {scene:'15',theme:{bg:'p2_envy',tint:'#0c1e24',fx:'sparks'},cast:['p2_shard','guardian'],reward:{key:'p2_k_glass',name:'유리 조각'},
          waves:[
            w(function(s,t){ // 거울에 비친 쌍: 양쪽 끝에서 가운데로 모여드는 유리 조각
              if(t<600&&t%30===0){var x=40+((t/30)%6)*22;mob(s,'p2_shard',x,-20,{vx:.6,vy:1.9,fire:'p2_crack',first:40,color:CYAN});mob(s,'p2_shard',W-x,-20,{vx:-.6,vy:1.9,fire:'p2_crack',first:40,color:CYAN});}},840),
            w(function(s,t){ // 양옆에서 비스듬히 엇갈려 지나가는 조각들
              if(t<560&&t%24===0){var left=(t/24)%2===0;mob(s,'p2_shard',left?-16:W+16,30+((t/24)%5)*16,{vx:left?2.2:-2.2,vy:1.2,fire:'aim',first:36,every:40,color:GREEN});}},840),
            w(function(s,t){ // 거울 앞 두 파수꾼, 그 사이로 떨어지는 조각
              if(t===60){mob(s,'guardian',110,-30,{stopY:112,fire:'bell',first:20,every:90,hold:320,color:GREEN});mob(s,'guardian',250,-30,{stopY:112,fire:'bell',first:65,every:90,hold:320,color:GREEN});}
              if(t<700&&t%40===20){var x=30+rand(s)*130;mob(s,'p2_shard',x,-20,{vy:1.8,fire:'drop',first:30,every:60,color:CYAN});mob(s,'p2_shard',W-x,-20,{vy:1.8,fire:'drop',first:30,every:60,color:CYAN});}},840)],
          mid:['p2_leviathan','p2Snake'],boss:['p2_leviathan','p2Glass','p2Venom','p2Future']},
        // 16 탐식의 주방 — 호텔 주방이 거대한 위장으로. 컨베이어처럼 흘러가는 입들
        {scene:'16',theme:{bg:'p2_gluttony',tint:'#261808',fx:'bubbles'},cast:['p2_maw','ember','slime'],reward:{key:'p2_k_pan',name:'프라이팬'},
          waves:[
            w(function(s,t){ // 왼쪽에서 오른쪽으로 흘러가는 입들(배식대)
              if(t<560&&t%30===0)mob(s,'p2_maw',-16,60,{vx:1.4,vy:.25,fire:'p2_gulp',first:40,every:80,color:YELLOW});},880),
            w(function(s,t){ // 화구의 불꽃과 기어 나오는 오물
              if(t<600&&t%28===0)mob(s,'ember',40+rand(s)*280,-20,{vy:2,sway:1.6,swayRate:.07,fire:'aim',first:40,every:44,color:YELLOW});
              if(t<600&&t%90===45)mob(s,'slime',60+rand(s)*240,-20,{vy:1.1,fire:'ring',first:50,color:GREEN});},880),
            w(function(s,t){ // 오른쪽에서 거꾸로 흘러가는 입들과 불꽃
              if(t<560&&t%30===0)mob(s,'p2_maw',W+16,104,{vx:-1.4,vy:.25,fire:'p2_gulp',first:40,every:80,color:YELLOW});
              if(t>=200&&t<700&&t%50===0)mob(s,'ember',30+rand(s)*300,-20,{vy:1.7,sway:1,fire:'drop',first:30,every:60,color:YELLOW});},880)],
          mid:['p2_beelzebub','p2Pans'],boss:['p2_beelzebub','p2Gas','p2Stomach','p2Photo']},
        // 17 붉은 하이힐 — 붉은 무대. 실에 매달려 흔들리는 하트와 실을 타고 내려오는 거미
        {scene:'17',theme:{bg:'p2_lust',tint:'#2a0812',fx:'petals'},cast:['p2_heart','spider'],reward:{key:'p2_k_heel',name:'하이힐'},
          waves:[
            w(function(s,t){ // 실에 매달린 하트가 진자처럼 크게 흔들리며 내려온다
              if(t<600&&t%40===0)mob(s,'p2_heart',60+((t/40)%5)*60,-20,{vy:1,sway:2.5,swayRate:.035,fire:'p2_kiss',first:30,every:64,color:RED});},860),
            w(function(s,t){ // 네 가닥 실을 타고 차례로 떨어지는 거미
              if(t<560&&t%20===0)mob(s,'spider',[50,130,230,310][(t/20)%4],-20,{vy:2.2,fire:'drop',first:30,every:24,color:PURPLE});},860),
            w(function(s,t){ // 서로 반대로 흔들리는 하트 한 쌍, 그 사이의 거미
              if(t<640&&t%50===0){mob(s,'p2_heart',100,-20,{vy:1.1,sway:2,swayRate:.04,fire:'p2_kiss',first:40,every:110,color:RED});mob(s,'p2_heart',260,-20,{vy:1.1,sway:-2,swayRate:.04,fire:'p2_kiss',first:95,every:110,color:RED});}
              if(t<640&&t%35===17)mob(s,'spider',140+rand(s)*80,-20,{vy:2,fire:'aim',first:30,color:PURPLE});},860)],
          mid:['asmodeus','p2Threads'],boss:['asmodeus','heel','p2Charm','p2Will']},
        // 18 맘몬의 금고 — 금고와 겨울 산장. 계산대처럼 옆으로 미끄러지는 동전 포탑
        {scene:'18',theme:{bg:'p2_greed',tint:'#241c08',fx:'paper'},cast:['p2_coin','collector','mammon'],reward:{key:'p2_k_coin',name:'동전'},
          waves:[
            w(function(s,t){ // 세 층 선반을 따라 미끄러져 지나가는 동전 포탑
              if(t<560&&t%36===0)mob(s,'p2_coin',-16,40+((t/36)%3)*32,{vx:1.6,vy:.15,fire:'p2_flip',first:40,every:80,color:YELLOW});},860),
            w(function(s,t){ // 지폐 다발처럼 칸칸이 떨어지는 수금꾼 → 탐욕의 중간 몹
              if(t<600&&t%30===0)mob(s,'collector',45+((t/30*3)%8)*38,-20,{vy:1.7,fire:'aim',first:40,every:44,color:YELLOW});
              if(t===320)mob(s,'mammon',180,-30,{stopY:116,fire:'money',first:20,every:100,hold:300,color:YELLOW});},860),
            w(function(s,t){ // 반대 방향 선반과 떨어지는 수금꾼
              if(t<560&&t%36===0)mob(s,'p2_coin',W+16,52+((t/36)%3)*32,{vx:-1.6,vy:.15,fire:'p2_flip',first:40,every:80,color:YELLOW});
              if(t>=150&&t<650&&t%48===0)mob(s,'collector',40+rand(s)*280,-20,{vy:1.6,sway:.6,fire:'drop',first:30,every:56,color:WHITE});},860)],
          mid:['p2_greed','p2Bills'],boss:['p2_greed','p2Deal','p2SameBack','p2Vault']},
        // 19 눈보라 속의 소년 — 눈보라 숲. 바람에 떠밀려 비스듬히 오는 짐승들
        {scene:'19',theme:{bg:'p2_snow',tint:'#18202c',fx:'snow'},cast:['wolf','nightmare'],reward:{key:'p2_k_cable',name:'신경 케이블'},
          waves:[
            w(function(s,t){ // 바람을 타고 비스듬히 내려오는 늑대들. 바람은 중간에 방향을 바꾼다.
              if(t<640&&t%26===0){var dir=t<320?1:-1;mob(s,'wolf',dir>0?20+rand(s)*200:140+rand(s)*200,-20,{vx:dir*1.2,vy:1.9,fire:'p2_flake',first:30,every:56,color:WHITE});}},860),
            w(function(s,t){ // 눈 속 사선 행렬
              if(t<600&&t%60===0){var x0=30+rand(s)*130;for(var k=0;k<4;k++)mob(s,'nightmare',x0+k*44,-20-k*30,{vx:.8,vy:1.5,fire:k%2?'aim':'drop',first:40,every:50,color:CYAN});}},860),
            w(function(s,t){ // 다섯 마리 V자 무리가 내달린다
              if(t<640&&t%90===0){var cx=90+rand(s)*180;for(var k=0;k<5;k++)mob(s,'wolf',cx+(k-2)*32,-20-Math.abs(k-2)*26,{vy:2.4,fire:'drop',first:24,every:36,color:WHITE});}},860)],
          mid:['p2_greed','p2Blizzard'],boss:['p2_mammon','p2Seats','p2Snatch','p2Keep']},
        // 20 불을 지른 남자 — 불탄 호텔과 피난 계단. 계단식 대형
        {scene:'20',theme:{bg:'p2_wrath',tint:'#2a0c04',fx:'embers'},cast:['p2_wolfire','ember','p2_bear'],reward:{key:'p2_k_seal',name:'J의 인장'},
          waves:[
            w(function(s,t){ // 계단처럼 한 칸씩 높아지는 다섯 마리 불늑대. 계단 방향이 번갈아 바뀐다.
              if(t<600&&t%60===0){var up=(t/60)%2;for(var k=0;k<5;k++)mob(s,'p2_wolfire',40+k*70,-20-(up?k:4-k)*26,{vy:1.6,fire:'p2_spark',first:50,every:120,color:RED});}},860),
            w(function(s,t){ // 지그재그로 내려오는 불티 → 곰의 형상
              if(t<620&&t%26===0)mob(s,'ember',30+rand(s)*300,-20,{vy:1.9,sway:1.4,swayRate:.08,fire:'aim',first:40,color:RED});
              if(t===300)mob(s,'p2_bear',180,-30,{stopY:120,fire:'bell',first:20,every:84,hold:300,color:RED});},860),
            w(function(s,t){ // 반대쪽 계단 + 내달리는 불늑대
              if(t<600&&t%70===0)for(var k=0;k<5;k++)mob(s,'p2_wolfire',320-k*70,-20-k*24,{vy:1.7,fire:k%2?'drop':'p2_spark',first:40,every:100,color:YELLOW});
              if(t>=100&&t<700&&t%44===22)mob(s,'p2_wolfire',40+rand(s)*280,-20,{vy:2.7,fire:'aim',first:24,color:YELLOW});},860)],
          mid:['p2_wrath','p2Stairs'],boss:['p2_wrath','p2Beasts','p2Insult','p2Blaze']},
        // 21 하늘에 서려는 자 — 전극 성당. 육각 대형과 일곱 줄
        {scene:'21',theme:{bg:'p2_pride',tint:'#16102a',fx:'static'},cast:['drone','p2_sigil'],reward:{key:'p2_k_electrode',name:'전극'},
          waves:[
            w(function(s,t){ // 육각형 대형으로 내려오는 드론 여섯
              if(t<660&&t%110===0)for(var k=0;k<6;k++){var a=TAU*k/6;mob(s,'drone',180+Math.cos(a)*110,-20-(Math.sin(a)+1)*60,{vy:1.4,fire:'p2_signal',first:60,every:150,color:YELLOW});}},880),
            w(function(s,t){ // 양옆 회랑에서 들어오는 드론 → 문장
              if(t<620&&t%30===0){var left=(t/30)%2===0;mob(s,'drone',left?-16:W+16,40+rand(s)*70,{vx:left?1.8:-1.8,vy:.5,fire:'drop',first:30,every:36,color:WHITE});}
              if(t===220)mob(s,'p2_sigil',180,-30,{stopY:112,fire:'hexagon',first:20,every:80,hold:320,color:YELLOW});},880),
            w(function(s,t){ // 일곱 줄 V자 행렬
              if(t<700&&t%70===0)for(var k=0;k<7;k++)mob(s,'drone',W*(k+.5)/7,-20-Math.abs(k-3)*20,{vy:1.4,fire:k%2?'drop':'aim',first:40,every:90,color:WHITE});},880),
            w(function(s,t){ // 두 문장 사이로 내려오는 육각 대형
              if(t===40){mob(s,'p2_sigil',90,-30,{stopY:104,fire:'p2_signal',first:20,every:90,hold:340,color:YELLOW});mob(s,'p2_sigil',270,-30,{stopY:104,fire:'p2_signal',first:65,every:90,hold:340,color:WHITE});}
              if(t>=200&&t<700&&t%100===0)for(var k=0;k<6;k++){var a=TAU*k/6+PI/6;mob(s,'drone',180+Math.cos(a)*80,-20-(Math.sin(a)+1)*44,{vy:1.6,fire:'drop',first:40,every:70,color:YELLOW});}},880)],
          mid:['pride','p2Seven'],boss:['pride','p2Hexagram','cathedral','ascend']},
        // 22 생체 부트로더 — 검은 태양 아래 설원과 서버실. 달려드는 사이보그 개와 서버 대열
        {scene:'22',theme:{bg:'p2_core',tint:'#081a24',fx:'snow'},cast:['wolf','drone'],reward:{key:'p2_k_core',name:'연산핵'},
          waves:[
            w(function(s,t){ // 눈보라를 헤치고 달려드는 개들
              if(t<640&&t%22===0)mob(s,'wolf',30+rand(s)*300,-20,{vy:2.6,sway:.2,fire:'p2_bite',first:24,every:40,color:CYAN});},880),
            w(function(s,t){ // 서버 선반처럼 줄지어 내려오는 드론
              if(t<640&&t%90===0)for(var k=0;k<6;k++)mob(s,'drone',30+k*60,-20,{vy:1,fire:'ring',first:50+k*12,color:CYAN});},880),
            w(function(s,t){ // 두 마리씩 엇갈려 달려드는 개와 그 뒤의 드론
              if(t<640&&t%40===0){var x=40+rand(s)*120;mob(s,'wolf',x,-20,{vx:.5,vy:2.5,fire:'p2_bite',first:24,color:PURPLE});mob(s,'wolf',W-x,-20,{vx:-.5,vy:2.5,fire:'p2_bite',first:30,color:CYAN});}
              if(t>=200&&t<700&&t%70===0)mob(s,'drone',60+rand(s)*240,-20,{vy:1.2,fire:'ring',first:50,color:PURPLE});},880),
            w(function(s,t){ // 전선에 이어진 듯 한 줄로 이어지는 드론 행렬과 개 떼
              if(t<640&&t%16===0)mob(s,'drone',180+150*Math.sin(t*.02),-20,{vy:1.6,fire:'drop',first:40,every:80,color:CYAN});
              if(t>=300&&t<700&&t%50===0)mob(s,'wolf',30+rand(s)*300,-20,{vy:2.8,fire:'p2_bite',first:22,color:WHITE});},880)],
          mid:['p2_chairman','p2Legs'],boss:['p2_core','bootloader','p2Copy','p2Pain']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
