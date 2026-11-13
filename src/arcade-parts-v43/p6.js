/* 합일 v43 · 제6부 — 두 사람의 성. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * 48 성 안에 소환된 의목사: 혼자 성문을 지키는 방어전. 위·양옆·네 귀퉁이에서 떼가 밀려온다.
 * 49 두 주인의 각성: 두 주인이 성문 양쪽 봉인을 하나씩 연다. 잡몹도 탄도 좌우가 거울처럼 맞선다.
 * 50 함께 되찾은 코어: 함께 싸운다. 좌우에서 출발한 탄이 가운데로 모였다가 엇갈린다.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:6,
    // 색 번호: 0 빨강 2 보라 4 청록 5 초록 6 노랑 8 흰색
    actors:{p6_demons:{name:'성 밖의 악마들',c1:0,c2:6},p6_bind:{name:'속박 코어',c1:2,c2:4}},
    mobs:{p6_demon:{hp:7,r:14,score:300},p6_raider:{hp:8,r:15,score:300},p6_keeper:{hp:90,r:22,score:4000,elite:true}},
    props:[{key:'p6_lance',radius:12},{key:'p6_spear',radius:12}],
    build:function(K){
      var W=K.W,H=K.H,TAU=K.TAU,HALF=Math.PI/2;
      /* ── 잡몹이 쏘는 탄 ── */
      var mobFire={
        // 양옆에서 조여 오는 두 창끝(가운데 한 발은 기본·지옥만)
        p6_pincer:function(s,m){var a=K.aim(s,m.x,m.y);var n=K.pick(s,2,2,3);for(var i=0;i<n;i++){K.spawn(s,m.x,m.y,a-.34,90-i*9,{color:m.color,size:K.RICE});K.spawn(s,m.x,m.y,a+.34,90-i*9,{color:m.color,size:K.RICE});}if(s.difficulty!=='gentle')K.fan(s,m.x,m.y,K.pick(s,1,2,3),a,.3,70,{color:m.color,size:0});},
        // 곧게 아래로 퍼지는 좌우 대칭 부채
        p6_mirror:function(s,m){K.fan(s,m.x,m.y,K.count(s,5),HALF,.9,72,{color:m.color,size:0});if(s.difficulty!=='gentle')K.fan(s,m.x,m.y,2,HALF,.5,56,{color:m.color,size:1});},
        // 성문지기의 아래쪽 반원. 쏠 때마다 반 칸씩 엇갈린다.
        p6_gateRing:function(s,m){var n=Math.max(4,K.count(s,12)),off=m.shots%2?.5:0;for(var i=0;i<n;i++)K.spawn(s,m.x,m.y,.3+(Math.PI-.6)*(i+off)/n,66,{color:m.color,size:1});},
        // 화면 가운데 아래(영웅이 지키는 자리)로 모이는 탄
        p6_converge:function(s,m){K.fan(s,m.x,m.y,K.count(s,4),Math.atan2(H-m.y,W/2-m.x),.5,80,{color:m.color,size:0});}
      };

      /* ── 이름 붙은 패턴. 순서대로 읽으면 장면의 사연이 된다. ── */
      var spells={
        // 48 중간 — 성 밖에서 밀려오는 악마 떼: 위쪽 한 줄 전체가 성문(아래 가운데)을 향해 조금씩 좁혀 들고, 양 끝에서는 성벽을 타고 휘어 드는 줄기가 붙는다.
        demonTide:{name:'밀려오는 악마들',scene:'48',fire:function(s,t){var b=s.boss,i,n=16,gy=H+1500;
          if(t%K.pick(s,44,36,30)===0){s.lane=Math.max(1,Math.min(n-4,(s.lane===undefined?6:s.lane)+Math.floor(K.rand(s)*3)-1));
            for(i=0;i<n;i++){if(i>=s.lane&&i<s.lane+3)continue;var x=W/n*(i+.5);K.spawn(s,x,-10,Math.atan2(gy+10,W/2-x),62,{color:(t%60)<30?K.RED:K.YELLOW,size:1});}}
          if(t%22===11){var c=K.count(s,1.6);for(i=0;i<c;i++){K.spawn(s,10+i*12,-10,HALF,74,{color:K.RED,size:0,turn:-.32});K.spawn(s,W-10-i*12,-10,HALF,74,{color:K.RED,size:0,turn:.32});}}
          if(t%96===70)K.bell(s,b.x,b.y,K.count(s,13),K.aim(s,b.x,b.y),1.5,90,.45,{color:K.YELLOW,size:0});}},
        // 48 보스 셋째 — 봉인당하자 빠르게 함락된 성: 벽돌처럼 엇갈려 쌓인 성벽 돌이 떨어지며 점점 빨라지다, 아래에서 부서져 흩어진다.
        fallenCastle:{name:'빠르게 함락된 성',scene:'48',fire:function(s,t){var b=s.boss,k,row=Math.floor(t/50);
          if(t%50===0)for(k=0;k<6;k++)K.spawn(s,W/6*(k+(row%2?.25:.75)),-14,HALF,22,{color:K.WHITE,size:2,accel:K.pick(s,58,72,84),max:160,at:K.pick(s,176,168,160),mode:K.MODE_SPLIT,arg:K.count(s,5.5),speed2:58});
          if(t%100===70)K.ring(s,b.x,b.y,K.count(s,16),62,K.rand(s)*TAU,{color:K.PURPLE,size:1});}},
        // 48 보스 끝 — 빼앗긴 EGO 코어: 위쪽 가장자리의 모든 탄이 우두머리에게로 빨려 들었다가 그 너머로 모래시계처럼 퍼진다.
        // 무기(쌍검 던지기): 우두머리가 양손의 쌍검을 좌우 비스듬히 던지고, 칼날 뒤로 구슬 꼬리가 같은 길을 따라간다. 코어(청록 거품)는 그 사이로 끌려간다.
        stolenCore:{name:'빼앗긴 EGO 코어',scene:'48',fire:function(s,t){var b=s.boss,i,k,n,per=K.pick(s,46,40,34);
          if(t%per===0){n=K.count(s,13);var j=K.rand(s)*.6-.3;for(i=0;i<n;i++){var x=W*(i+.5+j)/n;K.spawn(s,x,-10,Math.atan2(b.y+10,b.x-x),88,{color:(t/per)%2?K.CYAN:K.PURPLE,size:0});}}
          if(t%110===55){var a=K.aim(s,b.x,b.y),tail=K.count(s,5);
            for(k=-1;k<=1;k+=2){var d=a+k*K.pick(s,.5,.42,.36);K.spawn(s,b.x+k*24,b.y,d,96,{size:K.SHAPE_PROP,color:K.P['twin-blade'],spin:.2*k});
              for(i=1;i<=tail;i++)K.spawn(s,b.x+k*24,b.y,d,96-i*7,{color:K.WHITE,size:i%2?0:1});}}
          if(t%110===95)K.spawn(s,b.x,b.y,K.aim(s,b.x,b.y),66,{color:K.CYAN,size:4});}},
        // 49 길목 — 성문 양쪽의 봉인 둘: 좌우 두 자리에서 거울처럼 같은 고리가 퍼지고, 고리의 닫힌 쪽이 회마다 조금씩 열린다.
        twinSeals:{name:'양쪽 봉인',scene:'49',fire:function(s,t){var b=s.boss,k,n=K.count(s,22),y=b.y+24,per=K.pick(s,48,42,36);
          if(t%per===0){var v=Math.floor(t/per),gap=.32+.13*(v%7),base=v*.21;
            for(k=0;k<n;k++){var a=base+TAU*k/n,d=Math.atan2(Math.sin(a-.75),Math.cos(a-.75));if(Math.abs(d)<gap)continue;
              K.spawn(s,W*.22,y,a,64,{color:K.PURPLE,size:1});K.spawn(s,W*.78,y,Math.PI-a,64,{color:K.WHITE,size:1});}}
          if(t%88===66){K.fan(s,W*.22,y,K.pick(s,2,3,3),HALF+.25,.3,104,{color:K.PURPLE,size:K.RICE});K.fan(s,W*.78,y,K.pick(s,2,3,3),HALF-.25,.3,104,{color:K.WHITE,size:K.RICE});}}},
        // 50 중간 — 악몽이 코어에 걸어 둔 속박: 같은 자리에서 반대로 휘는 두 고리가 겹쳐 사슬처럼 엮이며 천천히 풀려 나간다.
        bindChains:{name:'악몽이 걸어 둔 속박',scene:'50',fire:function(s,t){var b=s.boss,k,n=K.count(s,13);
          if(t%K.pick(s,64,54,46)===0){var base=K.rand(s)*TAU;for(k=0;k<n;k++){var a=base+TAU*k/n;K.spawn(s,b.x,b.y,a,60,{color:K.PURPLE,size:0,turn:.62,accel:14,max:130,life:600});K.spawn(s,b.x,b.y,a+Math.PI/n,60,{color:K.CYAN,size:0,turn:-.62,accel:14,max:130,life:600});}}
          if(t%120===90)K.fan(s,b.x,b.y,K.pick(s,2,3,3),K.aim(s,b.x,b.y),.36,104,{color:K.WHITE,size:K.RICE});}},
        // 50 보스 첫째 — 환도의 공명: 화면 위 왼쪽과 오른쪽 두 자리에서 파문이 함께 퍼져 한가운데에서 겹친다. 우두머리 쪽에서는 세 번 울리는 고리.
        resonance:{name:'환도의 공명',scene:'50',fire:function(s,t){var b=s.boss,k,n;
          if(t%50===0){n=K.count(s,14);var off=(t/50)%2?.5:0;for(k=0;k<n;k++){var a=.12+(Math.PI-.24)*(k+off)/n;K.spawn(s,24,-12,a,66,{color:K.WHITE,size:1});K.spawn(s,W-24,-12,Math.PI-a,66,{color:K.CYAN,size:1});}}
          var p=t%210;if(p===30||p===48||p===66)K.ring(s,b.x,b.y,K.count(s,14),58+(p-30)/3,p*.05,{color:K.PURPLE,size:0});}},
        // 50 보스 셋째 — 창기사와 창술사: 흰 창은 왼쪽에서, 보라 창은 오른쪽에서 비스듬히 찔러 와 화면 가운데에서 엇갈린다.
        // 무기(창 찌르기): 창 한 자루가 곧게 찔러 오고 그 뒤를 쌀알 자루가 한 줄로 따르며, 찌른 자리에서 느린 잔상 부채가 퍼진다. 왼쪽 흰 창과 오른쪽 보라 창이 번갈아 영웅 쪽으로 모인다.
        lancers:{name:'창기사와 창술사',scene:'50',fire:function(s,t){var b=s.boss,p=t%60,k,left=Math.floor(t/60)%2===0,sx=left?b.x-86:b.x+86,col=left?K.WHITE:K.PURPLE;
          if(p===0){var a=K.aim(s,sx,b.y),shaft=K.count(s,5);K.spawn(s,sx,b.y,a,124,{size:K.SHAPE_PROP,color:left?K.P.p6_lance:K.P.p6_spear});
            for(k=1;k<=shaft;k++)K.spawn(s,sx,b.y,a,124-k*5,{color:col,size:K.RICE});
            s.p6a=a;}
          if(p===14||p===22){var c=K.count(s,6);K.fan(s,sx,b.y,c,s.p6a,p===14?.9:1.4,p===14?62:50,{color:col,size:p===14?0:1});}
          // 양옆 창끝에서 비스듬히 엇갈리는 쌀알 줄
          if(p>=30&&p<54&&p%6===0){var lx=b.x-86,rx=b.x+86,m=K.count(s,2);for(k=0;k<m;k++){K.spawn(s,lx,b.y,HALF-.7+(k+.5)*.5/m,92,{color:K.WHITE,size:K.RICE});K.spawn(s,rx,b.y,HALF+.7-(k+.5)*.5/m,92,{color:K.PURPLE,size:K.RICE});}}
          if(t%120===90)K.ring(s,b.x,b.y,K.count(s,13),54,K.rand(s)*TAU,{color:K.YELLOW,size:1});}},
        // 50 보스 끝 — 라우렌 쌍둥이 기사: 왼쪽 위와 오른쪽 위에서 출발한 두 줄기가 거울처럼 휘어 가운데로 모였다가 서로 엇갈려 지나간다. 환도는 세 번 울린다.
        twins:{name:'라우렌 쌍둥이 기사',scene:'50',fire:function(s,t){var b=s.boss,k,p=t%150;
          if(p<96&&p%K.pick(s,8,6,4)===0){var a=HALF-.95+.3*Math.sin(t*.05);K.spawn(s,14,-10,a,82,{color:K.RED,size:1,turn:.42,life:700});K.spawn(s,W-14,-10,Math.PI-a,82,{color:K.CYAN,size:1,turn:-.42,life:700});
            if(s.difficulty!=='gentle'){K.spawn(s,70,-10,a+.2,70,{color:K.RED,size:0,turn:.42,life:700});K.spawn(s,W-70,-10,Math.PI-a-.2,70,{color:K.CYAN,size:0,turn:-.42,life:700});}}
          if(p===100||p===118||p===136)K.ring(s,b.x,b.y,K.count(s,16),64,(p-100)*.03,{color:K.WHITE,size:0});
          if(t%300===40)for(k=-1;k<=1;k+=2)K.spawn(s,b.x+k*30,b.y,K.aim(s,b.x+k*30,b.y),80,{size:K.SHAPE_PROP,color:K.P['twin-blade'],spin:.2*k});}}
      };

      /* ── 잡몹 구간 대본 ── */
      var R=K.RED,PU=K.PURPLE,CY=K.CYAN,WH=K.WHITE,YE=K.YELLOW;
      // 48-1 첫 물결: 위·왼쪽·오른쪽 세 곳을 돌아가며 악마가 밀려 들어온다. 중간에 악몽 셋이 한 줄로 내려온다.
      function w48a(s,t){
        if(t<600&&t%26===0){var i=t/26,side=i%3;
          if(side===0)K.mob(s,'p6_demon',40+K.rand(s)*280,-20,{vy:1.8,sway:.4,fire:'p6_pincer',every:60,first:40,color:R});
          else K.mob(s,'p6_demon',side===1?-16:W+16,36+K.rand(s)*110,{vx:side===1?1.9:-1.9,vy:.85,fire:'p6_pincer',every:60,first:34,color:YE});}
        if(t===320)for(var k=0;k<3;k++)K.mob(s,'nightmare',90+k*90,-20-k*10,{vy:1.3,fire:'ring',every:60,first:56,color:PU});
      }
      // 48-2 협공: 양쪽 성벽을 타고 창병이 쏟아져 들어오고, 성문지기가 가운데 선다. 마지막에 위쪽 두 귀퉁이에서 악몽이 비스듬히 들이친다.
      function w48b(s,t){
        if(t<260&&t%18===0){var l=(t/18)%2===0;K.mob(s,'p6_raider',l?28:W-28,-20,{vx:l?.55:-.55,vy:2.3,fire:'p6_pincer',first:30,color:R});}
        if(t===300)K.mob(s,'p6_keeper',W/2,-30,{stopY:118,fire:'p6_gateRing',first:20,every:72,hold:300,color:YE});
        if(t>=420&&t<680&&t%30===0){var r=(t/30)%2===0;K.mob(s,'nightmare',r?-14:W+14,-14,{vx:r?1.7:-1.7,vy:1.5,fire:'drop',first:30,every:50,color:PU});}
      }
      // 48-3 포위: 네 귀퉁이와 양옆 가운데, 여섯 곳을 돌며 떼가 성문을 향해 몰려든다. 성문지기 둘이 양쪽에서 버틴다.
      function w48c(s,t){
        if(t<640&&t%22===0){var i=t/22,c=i%6;
          if(c<2)K.mob(s,'p6_demon',c?W+16:-16,-16,{vx:c?-2.1:2.1,vy:1.25,fire:'p6_pincer',every:90,first:36,color:R});
          else if(c<4)K.mob(s,'p6_raider',c===3?W+16:-16,150+K.rand(s)*50,{vx:c===3?-2.3:2.3,vy:.25,fire:'p6_pincer',first:30,color:YE});
          else K.mob(s,'p6_demon',c===5?250:110,-20,{vy:2,sway:1.4,swayRate:.07,fire:'p6_pincer',first:40,color:R});}
        if(t===340){K.mob(s,'p6_keeper',90,-30,{stopY:110,fire:'p6_gateRing',first:20,every:84,hold:280,color:R});K.mob(s,'p6_keeper',W-90,-30,{stopY:110,fire:'p6_gateRing',first:62,every:84,hold:280,color:YE});}
      }
      // 48-4 마지막 공성: 아래를 향한 V자 대형이 줄줄이 내려오고, 양옆에서 악몽이 번갈아 가로지른다.
      function w48d(s,t){
        if(t<600&&t%64===0){var row=t/64;for(var k=-2;k<=2;k++)K.mob(s,'p6_demon',W/2+k*58+(row%2?18:-18),-20-Math.abs(k)*26,{vy:1.6,fire:'p6_pincer',first:44+Math.abs(k)*8,color:k?R:YE});}
        if(t>=120&&t<640&&t%40===20){var l=(t/40|0)%2===0;K.mob(s,'nightmare',l?-16:W+16,70+K.rand(s)*70,{vx:l?2:-2,vy:.6,fire:'drop',first:30,every:56,color:PU});}
      }
      // 49-1 거울 행렬: 성문 가운데를 사이에 두고 창병이 둘씩 짝지어 내려온다. 흔들림도 거울처럼 서로 반대.
      function w49a(s,t){
        if(t<560&&t%30===0){var i=t/30,dx=50+(i%4)*32;K.mob(s,'p6_raider',W/2-dx,-20,{vy:1.7,sway:.9,swayRate:.06,fire:'p6_mirror',every:110,first:42,color:PU});K.mob(s,'p6_raider',W/2+dx,-20,{vy:1.7,sway:-.9,swayRate:.06,fire:'p6_mirror',every:110,first:42,color:WH});}
      }
      // 49-2 양쪽 방어 지점: 왼쪽과 오른쪽 끝에서 같은 높이로 들어온 악몽이 서로 엇갈려 지나가며 곧게 아래로 쏜다.
      function w49b(s,t){
        if(t<600&&t%36===0){var i=t/36,y=40+(i%3)*44;K.mob(s,'nightmare',-16,y,{vx:1.8,vy:.55,fire:'p6_mirror',first:40,every:96,color:PU});K.mob(s,'nightmare',W+16,y,{vx:-1.8,vy:.55,fire:'p6_mirror',first:40,every:96,color:WH});}
      }
      // 49-3 봉인을 지키는 둘: 좌우에 성문지기가 하나씩 버티고, 가운데 길로 악몽이 줄지어 내려온다.
      function w49c(s,t){
        if(t===0){K.mob(s,'p6_keeper',78,-30,{stopY:112,fire:'p6_gateRing',first:20,every:80,hold:420,color:PU});K.mob(s,'p6_keeper',W-78,-30,{stopY:112,fire:'p6_gateRing',first:20,every:80,hold:420,color:WH});}
        if(t>=80&&t<620&&t%34===0)K.mob(s,'nightmare',W/2+((t/34)%2?20:-20),-20,{vy:1.5,fire:'drop',first:30,every:44,color:(t/34)%2?WH:PU});
      }
      // 49-4 엇갈려 내리꽂기: 양 끝에서 동시에 출발한 창병이 크게 흔들리며 가운데에서 엇갈린다.
      function w49d(s,t){
        if(t<580&&t%24===0){var i=t/24,y=-20-(i%2)*14;K.mob(s,'p6_raider',44,y,{vx:.9,vy:2,sway:1.6,swayRate:.08,fire:'p6_pincer',first:34,color:PU});K.mob(s,'p6_raider',W-44,y,{vx:-.9,vy:2,sway:-1.6,swayRate:.08,fire:'p6_pincer',first:34,color:WH});}
      }
      // 50-1 합류: 양옆에서 들어온 떼가 가운데로 모이며, 탄도 화면 가운데 아래로 모인다.
      function w50a(s,t){
        if(t<620&&t%28===0){var i=t/28,y=34+(i%4)*36;K.mob(s,'p6_demon',-16,y,{vx:1.5,vy:.9,fire:'p6_converge',first:36,every:70,color:R});K.mob(s,'p6_demon',W+16,y,{vx:-1.5,vy:.9,fire:'p6_converge',first:36,every:70,color:CY});}
      }
      // 50-2 코어를 지키는 둘: 좌우 성문지기의 반원이 가운데에서 겹치고, 그 사이로 창병이 곧게 내려온다.
      function w50b(s,t){
        if(t===20){K.mob(s,'p6_keeper',84,-30,{stopY:120,fire:'p6_gateRing',first:20,every:76,hold:400,color:R});K.mob(s,'p6_keeper',W-84,-30,{stopY:120,fire:'p6_gateRing',first:58,every:76,hold:400,color:CY});}
        if(t>=100&&t<640&&t%26===0)K.mob(s,'p6_raider',W/2-70+K.rand(s)*140,-20,{vy:2,fire:'p6_pincer',every:60,first:30,color:(t/26)%2?R:CY});
      }
      // 50-3 엇갈린 돌격: 위쪽 두 귀퉁이에서 출발한 줄이 X자로 엇갈리며 화면을 가로지른다.
      function w50c(s,t){
        if(t<600&&t%20===0){var l=(t/20)%2===0;K.mob(s,l?'p6_demon':'p6_raider',l?-16:W+16,-10,{vx:l?2.2:-2.2,vy:1.9,fire:l?'aim':'p6_pincer',every:60,first:26,color:l?R:CY});}
      }
      // 50-4 마지막 결집: 가운데 성문지기를 둘러싸고 양옆 떼가 모여든다.
      function w50d(s,t){
        if(t===0)K.mob(s,'p6_keeper',W/2,-30,{stopY:104,fire:'p6_gateRing',first:20,every:66,hold:460,color:WH});
        if(t>=60&&t<640&&t%30===0){var i=t/30,y=60+(i%3)*40;K.mob(s,'p6_raider',-16,y,{vx:1.7,vy:.7,fire:'p6_converge',first:30,every:64,color:R});K.mob(s,'p6_demon',W+16,y,{vx:-1.7,vy:.7,fire:'p6_converge',first:30,every:64,color:CY});}
      }

      var stages=[
        {scene:'48',theme:{bg:'p6_siege',tint:'#2a1014',fx:'embers'},cast:['p6_demon','p6_raider','nightmare','p6_keeper'],reward:{key:'p6_gate',name:'성문'},
          waves:[K.wave(w48a,700),K.wave(w48b,700),K.wave(w48c,700),K.wave(w48d,700)],
          mid:['p6_demons','demonTide'],boss:['chief','summoned','castleGate','fallenCastle','stolenCore']},
        {scene:'49',theme:{bg:'p6_hall',tint:'#141a2e',fx:'ash'},cast:['p6_raider','nightmare','p6_keeper'],reward:{key:'p6_seal',name:'양쪽 봉인'},
          waves:[K.wave(w49a,720),K.wave(w49b,720),K.wave(w49c,720),K.wave(w49d,720)],
          mid:['p6_demons','twoMasters','twinSeals']},
        {scene:'50',theme:{bg:'p6_core',tint:'#1e1030',fx:'sparks'},cast:['p6_demon','p6_raider','p6_keeper'],reward:{key:'p6_ego',name:'EGO 코어'},
          waves:[K.wave(w50a,760),K.wave(w50b,760),K.wave(w50c,760),K.wave(w50d,760)],
          mid:['p6_bind','bindChains'],boss:['chief','resonance','sharedCore','lancers','twins']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
