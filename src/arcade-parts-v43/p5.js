/* 합일 v43 · 제5부 — 카이로노미콘. 이 부의 스테이지(원작 장면 37~46마다 하나)와 그 내용.
 * 주제: 시간 수확, 명령, 톱니와 초침, 검은 모래. 장면마다 탄막 규칙 하나를 둔다.
 *   37 여섯 차례의 침공 파동 · 38 수확된 시간의 흐름 · 39 멈췄다 가는 탄(빼앗긴 시간) · 40 겹치는 명령 범위 · 41 불타는 검은 모래
 *   42 명령문 사이의 짧은 간격 · 43 묻혔다 가라앉는 기록 · 44 여섯 명령 고리 · 45 멈춘 회랑(정지와 유예) · 46 세 단계의 세이렌
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:5,
    actors:{
      p5_cult:{name:'크로노보로스 교단',c1:2,c2:8},
      p5_archon:{name:'아르콘 수문장',c1:4,c2:6},
      p5_common:{name:'일반 수문장',c1:5,c2:4},
      p5_upper:{name:'상급 수문장',c1:0,c2:2},
      p5_grand:{name:'대수문장',c1:2,c2:6},
      p5_furnace:{name:'동력로',c1:0,c2:6},
      p5_neuron:{name:'노이론 게이트',c1:4,c2:6},
      p5_keeper:{name:'묘지기',c1:8,c2:2},
      p5_rings:{name:'명령 고리',c1:2,c2:4}
    },
    mobs:{
      p5_acolyte:{hp:7,r:14,score:300},
      p5_reaper:{hp:8,r:15,score:300},
      p5_fragment:{hp:4,r:12,score:200}
    },
    props:[{key:'p5_hand',radius:12},{key:'p5_ring',radius:15}],
    build:function(K){
      var R=K.RED,PU=K.PURPLE,CY=K.CYAN,GR=K.GREEN,YE=K.YELLOW,WH=K.WHITE,TRI=[K.RED,K.PURPLE,K.YELLOW],RICE=K.RICE,PROP=K.SHAPE_PROP,P=K.P,PI=Math.PI,TAU=K.TAU,W=K.W;
      /* 멈춰 설 거리 d를 주면, 그 거리에서 정확히 멈추게 하는 감속값(난이도 속도 배율과 무관하게 같은 자리에서 멈춘다). */
      function brake(s,v,d){var e=v*s.rules.speed;return e*e/(2*Math.max(4,d));}
      function stopTicks(s,v,d){return Math.ceil(2*d/(v*s.rules.speed)*60);}
      /* 던지기: 큰 기물 하나가 날아가고, 그 뒤로 조금씩 느린 구슬이 꼬리를 남긴다. */
      function hurl(s,x,y,a,v,prop,spin,tail,color){K.spawn(s,x,y,a,v,{size:PROP,color:P[prop],spin:spin});for(var j=1;j<=tail;j++)K.spawn(s,x,y,a,v*(1-j*.07),{color:color,size:j<3?1:0});}

      var mobFire={
        // 37 육각 파동: 여섯 발 고리 두 겹
        p5hex:function(s,m){K.ring(s,m.x,m.y,6,60,m.shots*.5+PI/6,{color:m.color,size:1});if(s.difficulty!=='gentle')K.ring(s,m.x,m.y,6,44,m.shots*.5,{color:WH,size:0});},
        // 38 수확: 쏜 쌀알이 멈췄다가 수문장 쪽으로 되돌아간다
        p5return:function(s,m){K.fan(s,m.x,m.y,K.pick(s,3,4,5),K.aim(s,m.x,m.y),.7,104,{color:m.color,size:RICE,accel:-120,min:0,at:66,mode:K.MODE_TURN,arg:PI,speed2:76});},
        // 39 빼앗긴 시간: 멈춰 섰다가 다시 겨눠 간다
        p5halt:function(s,m){K.fan(s,m.x,m.y,K.pick(s,3,4,5),K.aim(s,m.x,m.y),.8,120,{color:m.color,size:0,accel:-210,min:0,at:46,mode:K.MODE_REAIM,arg:0,speed2:86});},
        // 40 명령 범위: 느린 고리
        p5range:function(s,m){K.ring(s,m.x,m.y,K.count(s,8),54,m.shots*.4,{color:m.color,size:1});},
        // 41 불타는 모래알: 떨어지다 불꽃 고리로 터진다
        p5ember:function(s,m){for(var k=0;k<K.pick(s,1,2,2);k++)K.spawn(s,m.x,m.y,PI/2+(k-.5)*.6,70,{color:R,size:1,at:44+k*16,mode:K.MODE_SPLIT,arg:K.pick(s,5,6,7),speed2:56});},
        // 42 명령문 한 토막: 가로로 늘어선 쌀알 다섯
        p5word:function(s,m){for(var k=-2;k<=2;k++)K.spawn(s,m.x+k*9,m.y+8,PI/2,80,{color:m.color,size:RICE});},
        // 43 묻힌 기록: 떨어져 멈췄다가 천천히 가라앉는다
        p5grave:function(s,m){K.spawn(s,m.x,m.y,PI/2,96,{color:m.color,size:1,accel:-120,min:0,at:100,mode:K.MODE_TURN,arg:0,speed2:44,life:1000});K.fan(s,m.x,m.y,K.pick(s,2,3,4),K.aim(s,m.x,m.y),.5,88,{color:WH,size:0});},
        // 44 명령 고리: 휘도는 여섯 발
        p5six:function(s,m){K.ring(s,m.x,m.y,6,62,m.shots*.3,{color:m.color,size:1,turn:.5});},
        // 45 멈춘 회랑: 느린 거품이 멈췄다가 다시 간다
        p5still:function(s,m){K.spawn(s,m.x,m.y,K.aim(s,m.x,m.y),72,{color:m.color,size:4,accel:-90,min:0,at:70,mode:K.MODE_TURN,arg:0,speed2:58});},
        // 46 시곗바늘 끝: 좁고 곧은 쌀알
        p5cut:function(s,m){K.fan(s,m.x,m.y,K.pick(s,2,3,4),K.aim(s,m.x,m.y),.35,112,{color:m.color,size:RICE});}
      };

      var spells={
        /* ── 37 최초명령의 세계 · 크로노보로스 교단 ── */
        // 코어를 둘러싼 육각 고리의 여섯 자리에서 차례로 파동이 퍼진다(여섯 차례의 침공 파동), 여섯째 뒤에 잠깐 쉰다.
        p5_invasion:{name:'침공 파동',time:30,fire:function(s,t){var b=s.boss,ph=t%280;
          if(ph<240&&ph%40===0){var k=ph/40,a=-PI/2+k*TAU/6,x=b.x+Math.cos(a)*64,y=b.y+Math.sin(a)*40;K.ring(s,x,y,K.count(s,18),60,k*.2,{color:k%2?PU:WH,size:k%2?0:1});}
          if(ph<240&&ph%40===20)K.ring(s,b.x,b.y,K.count(s,8),50,ph*.05,{color:WH,size:0});
          if(t%70===50)K.fan(s,b.x,b.y,K.pick(s,3,4,5),K.aim(s,b.x,b.y),.6,96,{color:PU,size:RICE});}},
        // 교단의 도구 = 검은 모래: 흰 육각 코어가 퍼지고, 여섯 꼭짓점에서 휘어 들어가는 보라 모래 줄기가 코어를 물들인다.
        p5_taint:{name:'최초명령 오염',time:30,fire:function(s,t){var b=s.boss,k,every=K.pick(s,9,8,6),dir=Math.floor(t/150)%2?1:-1;
          if(t%72===0)K.shape(s,b.x,b.y,K.Shapes.polygon(6,Math.max(3,K.count(s,4))),66,t*.004,{color:WH,size:1});
          if(t%every===0)for(k=0;k<6;k++){if((t/every)%7===0)continue;K.spawn(s,b.x,b.y,t*.005+TAU*k/6,84,{color:PU,size:0,turn:dir*.5});}}},
        /* ── 38 예순여섯 수문장 · 아르콘 수문장 ── */
        // 수문장의 도구 = 관문: 관문 기둥 두 줄이 흔들리며 내려오고, 거둔 시간(쌀알 고리)은 멈췄다가 관문으로 되돌아간다.
        p5_firstGate:{name:'첫 수확 관문',time:30,fire:function(s,t){var b=s.boss,k,gx=180+96*Math.sin(t*.008);
          if(t%9===0){K.spawn(s,gx-64,-10,PI/2,80,{color:CY,size:1});K.spawn(s,gx+64,-10,PI/2,80,{color:CY,size:1});}
          if(t%54===20){var n=K.count(s,18),base=K.rand(s)*TAU;for(k=0;k<n;k++)K.spawn(s,b.x,b.y,base+TAU*k/n,118,{color:YE,size:RICE,accel:-120,min:0,at:76,mode:K.MODE_TURN,arg:PI*(k%2?.82:1.18),speed2:72});}
          if(t%108===74)K.bell(s,b.x,b.y,K.count(s,9),K.aim(s,b.x,b.y),1.5,92,.45,{color:WH,size:1});}},
        // 검은 모래의 흐름: 두 갈래 모래 줄기가 굽이치며 흘러내린다. 흐름 사이와 바깥으로 길이 남는다.
        p5_sandFlow:{name:'검은 모래의 흐름',time:30,fire:function(s,t){var b=s.boss;
          if(t%4===0){var sw=Math.sin(t*.024)*.72;K.spawn(s,b.x-40,b.y,PI/2+sw,74,{color:PU,size:0});K.spawn(s,b.x+40,b.y,PI/2-sw,74,{color:PU,size:0});
            if(s.difficulty!=='gentle'&&t%8===0)K.spawn(s,b.x,b.y,PI/2+Math.sin(t*.024+1.6)*1.15,62,{color:WH,size:1});}
          if(t%80===40)K.bell(s,b.x,b.y,K.count(s,10),K.aim(s,b.x,b.y),1.7,92,.45,{color:YE,size:1});}},
        /* ── 39 빼앗긴 시간 · 일반 수문장 ── */
        // 수문장의 도구 = 연결: 네 수문장 자리에서 관문 한 점까지 줄이 뻗어 멈춘다(빼앗긴 시간). 멈춘 줄은 끝에서부터 풀려 영웅을 겨눈다.
        p5_link:{name:'수문장들의 연결',time:32,fire:function(s,t){var b=s.boss,k,j;
          if(t%96===0){var gx=b.x+(K.rand(s)-.5)*80,gy=b.y+150,n=K.count(s,5),v=150;
            for(k=0;k<4;k++){var nx=b.x+(k-1.5)*100,ny=b.y-6,a=Math.atan2(gy-ny,gx-nx),d=Math.sqrt((gx-nx)*(gx-nx)+(gy-ny)*(gy-ny));
              for(j=1;j<=n;j++){var dj=d*j/n;K.spawn(s,nx,ny,a,v,{color:k%2?GR:CY,size:j===n?1:0,accel:-brake(s,v,dj),min:0,at:stopTicks(s,v,dj)+30+(n-j)*4,mode:K.MODE_REAIM,arg:(k-1.5)*.1,speed2:80});}}}
          if(t%48===24)K.ring(s,b.x,b.y,K.count(s,14),56,K.rand(s)*TAU,{color:GR,size:1});}},
        /* ── 40 닫힌 층의 명령 · 상급 수문장 / 대수문장 ── */
        // 상급 수문장 열둘: 시계 눈금 열두 자리에서 차례로 짧은 명령(쌀알 줄)이 바깥으로 뻗는다.
        p5_twelve:{name:'상급 수문장 열둘',time:28,fire:function(s,t){var b=s.boss,k;
          if(t%12===0){var h=(t/12)%12,a=-PI/2+h*TAU/12+Math.floor(t/144)*.13,x=b.x+Math.cos(a)*50,y=b.y+Math.sin(a)*50;for(k=0;k<K.pick(s,4,5,7);k++)K.spawn(s,x,y,a+PI/6,62+k*14,{color:R,size:RICE});}
          if(t%50===25)K.ring(s,b.x,b.y,K.count(s,18),58,K.rand(s)*TAU,{color:PU,size:1});}},
        // 대수문장의 도구 = 명령 범위: 세 명령의 범위(고리)가 겹쳐 퍼진다. 한 고리를 피하면 다른 고리에 들어선다.
        p5_overlap:{name:'겹치는 명령',time:32,fire:function(s,t){var b=s.boss,k;
          if(t%120===0)for(k=0;k<3;k++){var cx=70+k*110+(K.rand(s)-.5)*40,cy=b.y+30+K.rand(s)*60;K.ring(s,cx,cy,K.count(s,15),56,K.rand(s)*TAU,{color:TRI[k],size:1});}
          if(t%120===60)for(k=0;k<6;k++)K.spawn(s,b.x,b.y,K.aim(s,b.x,b.y)+(k-2.5)*.5,70,{size:PROP,color:P.obelisk,spin:.05});
          if(t%40===20)K.ring(s,b.x,b.y,K.count(s,10),74,t*.03,{color:WH,size:0});}},
        // 짧은 틈: 두 명령의 세로줄이 번갈아 선다. 한쪽이 꺼지고 다른 쪽이 켜지기 전 짧은 틈에 옮겨 선다.
        p5_gap:{name:'짧은 틈',time:32,fire:function(s,t){var b=s.boss,ph=t%212,n=K.pick(s,4,4,5),cell=W/n,k;
          if(ph===0||ph===106)for(k=0;k<n;k++)K.column(s,cell*(k+(ph?.75:.25)),{width:14,warn:64,active:90,color:ph?YE:PU});
          if(t%30===15)K.ring(s,b.x,b.y,K.count(s,15),52,K.rand(s)*TAU,{color:ph<106?YE:PU,size:0});}},
        // 행동할 순간: 빠른 종 무늬 사이로, 제자리에 멈춰 있다 늦게 출발하는 고리가 섞인다. 움직일 순간을 고른다.
        p5_moment:{name:'행동할 순간',time:34,fire:function(s,t){var b=s.boss,k;
          if(t%84===0)K.bell(s,b.x,b.y,K.count(s,15),K.aim(s,b.x,b.y),2,104,.45,{color:YE,size:1});
          if(t%42===21){var n=K.count(s,22),base=K.rand(s)*TAU;for(k=0;k<n;k++)K.spawn(s,b.x,b.y,base+TAU*k/n,0,{color:k%2?PU:WH,size:k%2?0:1,accel:K.pick(s,30,40,46)*(k%2?1:.7),max:k%2?96:76});}}},
        /* ── 41 검은 공방 · 동력로 ── */
        // 동력로의 도구 = 용광로: 불붙은 모래알이 쏟아지다 불꽃 고리로 터지고, 톱니바퀴가 굴러 나온다.
        p5_possible:{name:'삭제된 가능성',time:32,fire:function(s,t){var b=s.boss,k;
          if(t%K.pick(s,11,9,6)===0){var a=PI/2+(K.rand(s)-.5)*2.4;K.spawn(s,b.x,b.y+10,a,58+K.rand(s)*44,{color:R,size:1,at:50+Math.floor(K.rand(s)*70),mode:K.MODE_SPLIT,arg:K.pick(s,5,6,7),speed2:52});}
          if(t%K.pick(s,16,14,10)===0)K.spawn(s,10+K.rand(s)*(W-20),-8,PI/2,46+K.rand(s)*24,{color:PU,size:0});
          if(t%100===50)for(k=0;k<K.pick(s,3,4,5);k++)hurl(s,b.x,b.y,K.aim(s,b.x,b.y)+(k-(K.pick(s,3,4,5)-1)/2)*.45,76,'gear',.1,3,YE);}},
        // 명령선: 두 줄의 명령선이 양옆에서 가운데로 조여 온다. 줄에는 이따금 끊긴 자리가 있다.
        p5_cmdLine:{name:'명령선',time:32,fire:function(s,t){var b=s.boss,ph=t%220,spread=1.25*(1-ph/220)+.2;
          if(t%6===0&&(t/6)%6!==0){K.spawn(s,b.x,b.y,PI/2-spread,90,{color:R,size:1});K.spawn(s,b.x,b.y,PI/2+spread,90,{color:R,size:1});
            K.spawn(s,b.x,b.y,PI/2-spread*.55,78,{color:YE,size:0});K.spawn(s,b.x,b.y,PI/2+spread*.55,78,{color:YE,size:0});}
          if(t%44===22)K.ring(s,b.x,b.y,K.count(s,14),60,K.rand(s)*TAU,{color:PU,size:0});}},
        /* ── 42 뉴런 게이트 · 노이론 게이트 ── */
        // 게이트의 도구 = 신경 연결: 신경 가지가 세 번 갈라지며 뇌와 아르콘을 잇고, 신경 첨탑이 꼬리를 끌며 떨어진다.
        p5_brain:{name:'뇌와 아르콘',time:34,fire:function(s,t){var b=s.boss,k;
          if(t%60===0){var n=K.pick(s,3,4,5);for(k=0;k<n;k++)K.spawn(s,b.x,b.y,PI/2+(k-(n-1)/2)*.6+(K.rand(s)-.5)*.2,84,{color:CY,size:2,at:40,mode:K.MODE_BRANCH,arg:2,gen:3,speed2:70});}
          if(t%120===90)for(k=0;k<K.pick(s,2,3,3);k++)hurl(s,60+k*120+K.rand(s)*60,-20,PI/2,70,'spire',0,4,YE);
          if(t%30===15)K.ring(s,b.x,b.y,K.count(s,10),54,K.rand(s)*TAU,{color:YE,size:0});}},
        // 강제로 입력되는 문장: 쌀알 문장(네 줄)이 위에서 연달아 입력된다. 문장 사이의 짧은 간격에 다음 빈칸으로 옮긴다.
        p5_sentence:{name:'강제로 입력되는 문장',time:34,fire:function(s,t){var b=s.boss,ph=t%84,k,rows=K.pick(s,3,3,4);
          if(ph===0){var g1=Math.floor(K.rand(s)*6);s.lane=g1*16+Math.min(14,g1+4+Math.floor(K.rand(s)*5));}
          if(ph<rows*9&&ph%9===0){var g=s.lane||0,a1=Math.floor(g/16),a2=g%16;for(k=0;k<16;k++){if(k>=a1&&k<a1+2||k>=a2&&k<a2+2)continue;K.spawn(s,W/16*(k+.5),-10,PI/2,70,{color:ph?WH:CY,size:RICE});}}
          if(t%84===50)K.ring(s,b.x,b.y,K.count(s,12),48,K.rand(s)*TAU,{color:CY,size:1});}},
        /* ── 43 망각의 묘지 · 묘지기 ── */
        // 묘지기의 도구 = 망각의 비석: 포기한 꿈의 기록이 묘비 줄로 내려와 묻힌다(멈춘다). 비석이 서고, 한참 뒤 줄째로 가라앉는다.
        p5_dream:{name:'포기한 꿈',time:34,fire:function(s,t){var b=s.boss,k;
          if(t%54===0){var row=(t/54)%4,y=170+row*44,v=150,shift=row%2?20:0;for(k=0;k<9;k++){var x=shift+20+k*40;if(x>W-10)continue;var big=k%4===1;
            K.spawn(s,x,-12,PI/2,v,{size:big?PROP:1,color:big?P.obelisk:(row%2?PU:WH),accel:-brake(s,v,y+12),min:0,at:stopTicks(s,v,y+12)+110,mode:K.MODE_TURN,arg:0,speed2:42,life:1200});}}
          if(t%40===20)K.fan(s,b.x,b.y,K.pick(s,3,4,5),K.aim(s,b.x,b.y),.7,92,{color:PU,size:RICE});
          if(t%40===30)K.ring(s,b.x,b.y,K.count(s,14),56,K.rand(s)*TAU,{color:WH,size:0});}},
        // 시계 파편: 시계 열두 눈금(큰 구슬)이 퍼져 멈추고 파편으로 부서진다. 초침 줄기가 천천히 돈다.
        p5_shard:{name:'시계 파편',time:34,fire:function(s,t){var b=s.boss,k;
          if(t%100===0){var base=K.rand(s)*TAU;for(k=0;k<12;k++)K.spawn(s,b.x,b.y,base+TAU*k/12,110,{color:k%3?WH:YE,size:2,accel:-120,min:0,at:70,mode:K.MODE_SPLIT,arg:K.pick(s,5,6,7),speed2:58});}
          if(t%7===0){var h=t*.012;K.spawn(s,b.x,b.y,h,78,{color:CY,size:RICE});K.spawn(s,b.x,b.y,h+PI,78,{color:CY,size:RICE});}
          if(t%100===50)K.fan(s,b.x,b.y,K.count(s,4),K.aim(s,b.x,b.y),.6,96,{color:PU,size:RICE});}},
        /* ── 44 붕괴 의식장 · 명령 고리 ── */
        // 검은 모래 기둥: 모래 기둥이 위에서 쏟아진다. 기둥은 이따금 자리를 옮긴다.
        p5_pillar:{name:'검은 모래 기둥',time:34,fire:function(s,t){var b=s.boss,n=K.pick(s,4,4,5),gen=Math.floor(t/240),k;
          if(t%K.pick(s,10,9,6)===0)for(k=0;k<n;k++)K.spawn(s,W/n*(k+.5)+Math.sin(gen*2.3+k*1.7)*22+(K.rand(s)-.5)*10,-10,PI/2,90,{color:PU,size:k%2?0:1});
          if(t%50===25)K.ring(s,b.x,b.y,K.count(s,14),60,K.rand(s)*TAU,{color:WH,size:1});}},
        // 명령 고리의 도구 = 고리: 문을 둘러싼 여섯 명령 고리가 맺힌 뒤 하나씩 풀려 퍼진다. 고리 한가운데의 고리 기물도 함께 날아간다.
        p5_sixRings:{name:'여섯 명령 고리',time:34,fire:function(s,t){var b=s.boss,ph=t%240,j,k;
          if(ph===0)for(j=0;j<6;j++){var a=-PI/2+j*TAU/6,cx=b.x+Math.cos(a)*86,cy=b.y+24+Math.sin(a)*62,n=K.pick(s,12,14,16),v=100;
            for(k=0;k<n;k++)K.spawn(s,cx,cy,TAU*k/n+j*.3,v,{color:j%2?PU:CY,size:1,accel:-brake(s,v,26),min:0,at:60+j*24,mode:K.MODE_TURN,arg:0,speed2:64,turn:.25});
            K.spawn(s,cx,cy,a,0,{size:PROP,color:P.p5_ring,spin:.06,accel:0,at:60+j*24,mode:K.MODE_TURN,arg:0,speed2:70});}
          if(t%48===24)K.bell(s,b.x,b.y,K.count(s,11),K.aim(s,b.x,b.y),1.8,94,.45,{color:WH,size:0});}},
        /* ── 45 아르벨리아, 유예의 수문장 ── */
        // 창밖을 바라보던 오후: 창틀(네모와 십자)이 천천히 넓어지고, 비스듬한 오후 햇살(노란 작은 탄)이 느리게 내려앉는다.
        p5_afternoon:{name:'창밖을 바라보던 오후',time:32,fire:function(s,t){var b=s.boss,k,j;
          if(t%64===0)K.shape(s,b.x,b.y,K.Shapes.polygon(4,Math.max(4,K.count(s,6))),60,PI/4,{color:WH,size:1});
          if(t%64===32)for(k=0;k<4;k++)for(j=0;j<4;j++)K.spawn(s,b.x,b.y,k*PI/2,26+j*12,{color:CY,size:0});
          if(t%K.pick(s,7,6,3)===0)K.spawn(s,10+K.rand(s)*(W+80),-8,PI/2+.45,40+K.rand(s)*20,{color:YE,size:0,life:1400});}},
        // 쓰이지 않은 편지: 빈 편지의 줄(쌀알 가로줄)이 날아오다 중간에서 지워진다.
        p5_letter:{name:'쓰이지 않은 편지',time:32,fire:function(s,t){var b=s.boss,k,j;
          if(t%36===0){var n=K.pick(s,3,4,5),c=K.aim(s,b.x,b.y)+((t/36)%2?.2:-.2);for(k=0;k<n;k++){var a=c+(k-(n-1)/2)*.42;for(j=0;j<7;j++){var o=(j-3)*9;K.spawn(s,b.x-Math.sin(a)*o,b.y+Math.cos(a)*o,a,82,{color:WH,size:RICE,life:K.pick(s,280,320,360)});}}}
          if(t%72===54)K.ring(s,b.x,b.y,K.count(s,16),52,K.rand(s)*TAU,{color:YE,size:1});}},
        // 실패 뒤의 침묵: 세 겹 고리가 퍼지다 멈춰 침묵한다. 한참 뒤 함께 다시 움직인다.
        p5_silence:{name:'실패 뒤의 침묵',time:32,fire:function(s,t){var b=s.boss,j,k;
          if(t%180===0){var v=140,rel=stopTicks(s,v,140)+40,base=K.rand(s)*TAU;for(j=0;j<3;j++){var r=60+j*40,n=K.count(s,14+j*4);for(k=0;k<n;k++)K.spawn(s,b.x,b.y,base+TAU*k/n+j*.2,v,{color:SILENT[j],size:j===1?1:0,accel:-brake(s,v,r),min:0,at:rel,mode:K.MODE_TURN,arg:0,speed2:50+j*6});}}
          if(t%180===110)K.bell(s,b.x,b.y,K.count(s,11),K.aim(s,b.x,b.y),1.6,92,.45,{color:CY,size:RICE});
          if(t%30===15)K.ring(s,b.x,b.y,K.count(s,8),46,t*.05,{color:WH,size:0});}},
        // 아르벨리아를 묶은 도구 = 실: 위에서 내려온 명령의 실(광선)이 보스로 모였다가 아래로 갈라진다. 켜질 때 실을 따라 쌀알이 흩어진다.
        p5_thread:{name:'변조된 명령의 실',time:34,fire:function(s,t){var b=s.boss,k;
          if(t%170===0){var xs=s.difficulty==='gentle'?TWO:THREE;for(k=0;k<xs.length;k++)K.beam(s,xs[k],-12,Math.atan2(b.y+12,b.x-xs[k]),{width:10,warn:70,active:84,color:CY,burst:true});}
          if(t%34===17)K.ring(s,b.x,b.y,K.count(s,14),58,K.rand(s)*TAU,{color:WH,size:1});
          if(t%68===0)hurl(s,b.x,b.y,K.aim(s,b.x,b.y),84,'crescent',.12,4,CY);}},
        /* ── 46 세이렌 모르 ── */
        // 시간 수확: 낫질처럼 쌀알 줄기가 한쪽에서 다른 쪽으로 휘둘러지며 휘어 나간다. 획이 끝날 때마다 톱니바퀴가 굴러 나온다.
        p5_harvest:{name:'시간 수확',time:30,fire:function(s,t){var b=s.boss,ph=t%80,dir=Math.floor(t/80)%2?1:-1;
          if(ph<56&&ph%K.pick(s,4,3,2)===0){var a=PI/2+dir*(ph/56-.5)*2.6;K.spawn(s,b.x,b.y,a,92,{color:R,size:RICE,turn:dir*.45});K.spawn(s,b.x,b.y,a+.1,76,{color:R,size:0,turn:dir*.45});}
          if(ph===66)K.fan(s,b.x,b.y,K.pick(s,3,4,5),K.aim(s,b.x,b.y),1.2,70,{size:PROP,color:P.gear,spin:.1});
          if(t%40===20)K.ring(s,b.x,b.y,K.count(s,12),54,K.rand(s)*TAU,{color:CY,size:0});}},
        // 세이렌의 무기 = 노이론 케이블과 시곗바늘: 케이블(광선)이 비스듬히 늘어지고, 시곗바늘이 구슬 꼬리를 끌며 날아온다.
        p5_cable:{name:'노이론 케이블',time:30,fire:function(s,t){var b=s.boss,k;
          if(t%180===0){var set=Math.floor(t/180)%2,angs=set?CABLE_A:CABLE_B;for(k=0;k<angs.length;k++)K.beam(s,b.x,b.y,PI/2+angs[k],{width:12,warn:70,active:90,color:CY,follow:true});}
          if(t%K.pick(s,8,7,6)===0){var h=t*.011;K.spawn(s,b.x,b.y,h,80,{color:YE,size:RICE});K.spawn(s,b.x,b.y,h+PI,80,{color:YE,size:RICE});}
          if(t%45===0)for(k=0;k<K.pick(s,2,3,3);k++)hurl(s,b.x,b.y,K.aim(s,b.x,b.y)+(k-1)*.5,96,'p5_hand',0,5,R);
          if(t%60===30)K.ring(s,b.x,b.y,K.count(s,14),52,K.rand(s)*TAU,{color:CY,size:1});}},
        // 최적화된 운명: 정해진 길. 바둑판처럼 어긋난 줄이 일정하게 내려온다. 정해진 칸을 따라 비스듬히 지나간다.
        p5_fate:{name:'최적화된 운명',time:32,fire:function(s,t){var b=s.boss,k;
          if(t%30===0){var odd=(t/30)%2,step=W/12;for(k=odd;k<12;k+=2)K.spawn(s,step*(k+.5),-10,PI/2,72,{color:odd?WH:PU,size:1});}
          if(t%90===45)K.bell(s,b.x,b.y,K.count(s,13),K.aim(s,b.x,b.y),1.7,90,.45,{color:R,size:1});
          if(t%60===10)for(k=0;k<2;k++)hurl(s,b.x,b.y,PI/2+(k?.6:-.6),88,'p5_hand',0,4,R);}},
        // 영원한 작업장: 생산 장치. 보스에서 좌우로 나간 탄이 일정한 자리에서 꺾여 곧게 떨어진다(컨베이어). 톱니가 그 사이를 구른다.
        p5_workshop:{name:'영원한 작업장',time:32,fire:function(s,t){var b=s.boss,k;
          if(t%5===0){var i=t/5,side=i%2?1:-1,slot=Math.floor(i/2)%4;K.spawn(s,b.x,b.y+8,side>0?0:PI,120,{color:slot%2?CY:YE,size:slot%2?0:1,at:18+slot*24,mode:K.MODE_TURN,arg:side*PI/2,speed2:70});}
          if(t%96===48)K.ring(s,b.x,b.y,K.pick(s,4,5,6),62,K.rand(s)*TAU,{size:PROP,color:P.gear,spin:.08});
          if(t%32===16)K.ring(s,b.x,b.y,K.count(s,10),50,t*.04,{color:R,size:0});}},
        // 자유의지의 시간: 정해진 운명을 베고 공간을 접는다. 퍼지던 고리가 멈췄다가 좌우 반쪽이 서로 반대로 접히고, 죽은 시간(보라)이 늦게 풀려난다. 초침이 돈다.
        p5_freewill:{name:'자유의지의 시간',time:38,fire:function(s,t){var b=s.boss,k;
          if(t%90===0){var n=K.count(s,22),base=K.aim(s,b.x,b.y);for(k=0;k<n;k++){var a=base+TAU*k/n,side=Math.sin(a-base)>0?1:-1;K.spawn(s,b.x,b.y,a,150,{color:k%2?CY:WH,size:1,accel:-170,min:0,at:66,mode:K.MODE_TURN,arg:side*1.1,speed2:80});}}
          if(t%90===45){var m=K.count(s,20),b0=K.rand(s)*TAU;for(k=0;k<m;k++)K.spawn(s,b.x,b.y,b0+TAU*k/m,8,{color:PU,size:0,accel:50,max:104});}
          if(t%6===0)for(k=0;k<K.pick(s,1,2,3);k++)K.spawn(s,b.x,b.y,-PI/2+t*TAU/480+TAU*k/K.pick(s,1,2,3),70,{color:R,size:0});
          if(t%120===100)hurl(s,b.x,b.y,K.aim(s,b.x,b.y),92,'p5_hand',0,5,R);}}
      };

      /* ── 잡몹 구간 대본 ── */
      var A=PU,THREE=[40,180,320],TWO=[40,320],CABLE_A=[-.85,0,.85],CABLE_B=[-.38,.38],SILENT=[CY,WH,PU];
      var waves={
        // 37a 여섯 번의 침공 파동: 교도 여섯이 육각 대형으로 번갈아 내려온다.
        w37a:function(s,t){if(t<=720&&t%144===0){var cx=(t/144)%2?120:240;for(var k=0;k<6;k++){var a=k*TAU/6;K.mob(s,'p5_acolyte',cx+Math.cos(a)*48,-50+Math.sin(a)*30,{vy:1.6,fire:'p5hex',first:40+k*5,every:90,color:A});}}},
        // 37b 코어 방어: 가운데 수호자 하나, 양 위 모서리에서 코어를 향해 비스듬히 들어오는 교도
        w37b:function(s,t){if(t===40)K.mob(s,'guardian',180,-30,{stopY:120,fire:'hexagon',first:20,every:56,hold:520,color:WH});
          if(t>=60&&t<780&&t%20===0){var l=(t/20)%2;K.mob(s,'p5_acolyte',l?-14:W+14,30+K.rand(s)*50,{vx:l?1.5:-1.5,vy:1.1,fire:'aim',first:30,every:70,color:A});}},
        // 37c 침공의 앞줄: 여섯 마리 가로줄이 차례로 밀려온다
        w37c:function(s,t){if(t<=720&&t%120===0)for(var k=0;k<6;k++)K.mob(s,'p5_acolyte',30+k*60,-20-(k%2)*16,{vy:1.3,sway:.3,fire:'drop',first:30,every:40,color:k%2?WH:A});},
        // 37d 마지막 파동: 수호자 둘과 고리 교도
        w37d:function(s,t){if(t===30){K.mob(s,'guardian',96,-30,{stopY:110,fire:'bell',first:20,every:80,hold:460,color:A});K.mob(s,'guardian',264,-30,{stopY:110,fire:'bell',first:60,every:80,hold:460,color:WH});}
          if(t>=200&&t<800&&t%40===0)K.mob(s,'p5_acolyte',40+K.rand(s)*280,-20,{vy:1.7,sway:.8,fire:'p5hex',first:36,color:A});},
        // 38a 관문 기둥: 두 줄 기둥을 이루며 수확자가 내려온다
        w38a:function(s,t){if(t<720&&t%22===0){var l=(t/22)%2;K.mob(s,l?'collector':'p5_reaper',l?100:260,-20,{vy:1.7,fire:'p5return',first:40,every:110,color:CY});}},
        // 38b 검은 모래의 강: 수확자가 한 줄로 굽이치며 흘러내리고, 관문 수호자가 선다
        w38b:function(s,t){if(t<640&&t%16===0)K.mob(s,'collector',180,-20,{vy:1.5,sway:3,swayRate:.03,fire:'drop',first:30,every:60,color:PU});
          if(t===300)K.mob(s,'guardian',180,-30,{stopY:110,fire:'gearRing',first:20,every:60,hold:360,color:YE});},
        // 38c 수확의 흐름: 왼쪽 위에서 오른쪽 아래로, 다음엔 반대로 흐르는 수확자 떼
        w38c:function(s,t){if(t<780&&t%12===0){var r=t<380;K.mob(s,'p5_reaper',r?-14:W+14,10+(t%60),{vx:r?1.7:-1.7,vy:1.3,fire:'p5return',first:30,every:90,color:YE});}},
        // 38d 쐐기: 수확자가 V자로 내려오고, 수호자 둘
        w38d:function(s,t){if(t<600&&t%100===0)for(var k=-3;k<=3;k++)K.mob(s,'collector',180+k*42,-20-Math.abs(k)*22,{vy:1.4,fire:'aim',first:40,every:80,color:CY});
          if(t===620){K.mob(s,'guardian',110,-30,{stopY:120,fire:'ring',first:20,every:60,hold:240,color:CY});K.mob(s,'guardian',250,-30,{stopY:120,fire:'ring',first:50,every:60,hold:240,color:PU});}},
        // 39a 시간의 숲: 수확자가 나무처럼 듬성듬성 천천히 내려와 멈췄다 가는 탄을 쏜다
        w39a:function(s,t){if(t<760&&t%30===0)K.mob(s,'p5_reaper',30+((t/30*97)%300),-20,{vy:1,fire:'p5halt',first:40,every:120,color:GR});},
        // 39b 마흔여덟의 연결: 둘씩 짝지어 사인 곡선으로 내리꽂고, 감시자가 선다
        w39b:function(s,t){if(t<600&&t%24===0){var i=t/24;K.mob(s,'collector',i%2?80:280,-20,{vy:2,sway:2,swayRate:.07,fire:'p5halt',first:34,color:CY});K.mob(s,'collector',i%2?120:240,-40,{vy:2,sway:2,swayRate:.07,fire:'drop',first:50,color:GR});}
          if(t===320)K.mob(s,'warden',180,-30,{stopY:120,fire:'ring',first:20,every:64,hold:380,color:GR});},
        // 39c 수확 통로: 양옆에서 가운데로 모여드는 수확자
        w39c:function(s,t){if(t<760&&t%26===0){var l=(t/26)%2;K.mob(s,'p5_reaper',l?-14:W+14,40+(t%80),{vx:l?1.2:-1.2,vy:1.2,fire:'p5halt',first:30,every:100,color:l?GR:CY});}},
        // 40a 겹치는 명령 층: 세 높이의 층에서 수확자가 가로로 엇갈려 지나간다
        w40a:function(s,t){if(t<780&&t%30===0){var lay=(t/30)%3,l=lay%2===0;K.mob(s,'p5_reaper',l?-14:W+14,50+lay*50,{vx:l?1.6:-1.6,vy:.25,fire:'p5range',first:40,every:90,color:TRI[lay]});}},
        // 40b 상급 수문장 열둘의 그림자: 수호자 셋이 범위를 겹쳐 쏜다
        w40b:function(s,t){if(t===20)for(var k=0;k<3;k++)K.mob(s,'guardian',70+k*110,-30-k*20,{stopY:100+k*24,fire:k===1?'bell':'ring',first:20+k*20,every:70,hold:560,color:TRI[k]});
          if(t>=200&&t<760&&t%50===0)K.mob(s,'p5_reaper',40+K.rand(s)*280,-20,{vy:1.6,fire:'aim',first:30,color:R});},
        // 40c 층계: 계단꼴로 내려오는 수확자
        w40c:function(s,t){if(t<760&&t%90===0){var right=(t/90)%2;for(var k=0;k<5;k++)K.mob(s,'p5_reaper',right?320-k*60:40+k*60,-20-k*28,{vy:1.4,fire:'p5range',first:36,every:100,color:right?PU:YE});}},
        // 40d 대수문장 여섯의 그림자: 감시자 둘과 흩어진 수확자
        w40d:function(s,t){if(t===20){K.mob(s,'warden',100,-30,{stopY:120,fire:'hexagon',first:20,every:60,hold:520,color:PU});K.mob(s,'warden',260,-30,{stopY:120,fire:'hexagon',first:50,every:60,hold:520,color:YE});}
          if(t>=240&&t<760&&t%34===0)K.mob(s,'p5_reaper',30+K.rand(s)*300,-20,{vy:1.5,sway:1,fire:'p5range',first:40,color:R});},
        // 41a 용광로 아가리: 가운데에서 불꽃처럼 흩어지며 쏟아지는 수확자
        w41a:function(s,t){if(t<760&&t%18===0)K.mob(s,'collector',180+(K.rand(s)-.5)*40,-20,{vx:(K.rand(s)-.5)*3.2,vy:2,fire:'p5ember',first:34,every:80,color:R});},
        // 41b 톱니 감시자: 감시자가 톱니 무늬를 돌리고, 양옆을 크게 흔들며 내려오는 수확자
        w41b:function(s,t){if(t===30)K.mob(s,'warden',180,-30,{stopY:116,fire:'gearRing',first:20,every:50,hold:600,color:YE});
          if(t>=120&&t<780&&t%28===0){var l=(t/28)%2;K.mob(s,'collector',l?60:300,-20,{vy:1.4,sway:1.6,swayRate:.05,fire:'drop',first:30,every:50,color:R});}},
        // 41c 컨베이어: 화면 위쪽 띠를 따라 한쪽으로 흘러가는 수확자 행렬
        w41c:function(s,t){if(t<780&&t%20===0){var band=(t/20)%2;K.mob(s,'collector',-14,40+band*44,{vx:2.2,vy:.3,fire:'p5ember',first:50,every:100,color:band?YE:R});}},
        // 41d 마지막 용광로: 감시자 둘이 양옆에서 톱니를, 가운데로 모래알이 쏟아진다
        w41d:function(s,t){if(t===20){K.mob(s,'warden',80,-30,{stopY:110,fire:'gearRing',first:20,every:96,hold:480,color:R});K.mob(s,'warden',280,-30,{stopY:110,fire:'gearRing',first:68,every:96,hold:480,color:YE});}
          if(t>=100&&t<760&&t%30===0)K.mob(s,'collector',140+K.rand(s)*80,-20,{vy:1.8,fire:'p5ember',first:30,color:R});},
        // 42a 명령문 줄: 일곱 자리 가운데 두 자리가 빈 가로줄이 차례로 내려온다
        w42a:function(s,t){if(t<760&&t%110===0){var g=Math.floor(K.rand(s)*5);for(var k=0;k<7;k++){if(k===g||k===g+2)continue;K.mob(s,'drone',36+k*48,-20,{vy:1.3,fire:'p5word',first:40,every:70,color:WH});}}},
        // 42b 신경 가지: 한 마리가 둘, 둘이 넷으로 갈라지듯 퍼져 내려온다
        w42b:function(s,t){var ph=t%100;if(t<780){if(ph===0)K.mob(s,'drone',180,-20,{vy:1.8,fire:'ring',first:30,every:40,color:CY});
          if(ph===24)for(var k=0;k<2;k++)K.mob(s,'drone',180,-20,{vx:k?1:-1,vy:1.8,fire:'aim',first:30,every:36,color:CY});
          if(ph===48)for(k=0;k<4;k++)K.mob(s,'p5_acolyte',180,-20,{vx:(k-1.5)*1.1,vy:1.8,fire:'p5word',first:30,every:40,color:YE});}},
        // 42c 관문의 연결: 교도 기둥 둘과 지그재그 드론
        w42c:function(s,t){if(t<760&&t%40===0){K.mob(s,'p5_acolyte',70,-20,{vy:1.5,fire:'p5word',first:30,every:80,color:CY});K.mob(s,'p5_acolyte',290,-20,{vy:1.5,fire:'p5word',first:70,every:80,color:CY});}
          if(t<700&&t%46===20)K.mob(s,'drone',180,-20,{vy:1.6,sway:2.6,swayRate:.12,fire:'aim',first:40,color:YE});},
        // 43a 묘비 줄: 파편이 묘지 줄처럼 다섯씩 천천히 내려와 기록을 묻는다
        w43a:function(s,t){if(t<760&&t%96===0){var off=(t/96)%2?36:0;for(var k=0;k<5;k++)K.mob(s,'p5_fragment',40+off+k*72,-20,{vy:.9,fire:'p5grave',first:50,every:140,color:PU});}},
        // 43b 수천 개의 시계 파편: 가볍고 빠른 파편이 흩날린다
        w43b:function(s,t){if(t<780&&t%9===0)K.mob(s,'p5_fragment',20+K.rand(s)*320,-20,{vy:2.4,sway:.9,swayRate:.1,fire:(t/9)%3?'drop':'ring',first:24,every:22,color:(t/9)%2?WH:PU});},
        // 43c 묘지기의 손: 수확자가 양옆에서 묘지로 들어오고 파편이 고리를 이룬다
        w43c:function(s,t){if(t<700&&t%36===0){var l=(t/36)%2;K.mob(s,'collector',l?-14:W+14,30+(t%90),{vx:l?1.3:-1.3,vy:.9,fire:'p5grave',first:40,every:120,color:WH});}
          if(t>=150&&t<760&&t%150===0)for(var k=0;k<6;k++){var a=k*TAU/6;K.mob(s,'p5_fragment',180+Math.cos(a)*60,-60+Math.sin(a)*36,{vy:1.4,fire:'ring',first:40,color:PU});}},
        // 44a 여섯 고리: 여섯 교도가 육각으로 서서 천천히 내려오며 휘도는 고리를 쏜다
        w44a:function(s,t){if(t<720&&t%120===0){var cx=t%240?110:250;for(var k=0;k<6;k++){var a=k*TAU/6;K.mob(s,'p5_acolyte',cx+Math.cos(a)*52,-50+Math.sin(a)*34,{vy:1.3,fire:'p5six',first:40,every:46,color:k%2?PU:CY});}}},
        // 44b 검은 모래 기둥: 다섯 기둥 자리에 맞춰 교도가 줄지어 떨어진다
        w44b:function(s,t){if(t<780&&t%22===0){var col=(t/22)%5;K.mob(s,'p5_acolyte',36+col*72,-20,{vy:2,fire:col%2?'p5six':'drop',first:24,every:col%2?40:14,color:PU});}},
        // 44c 의식장의 문: 수호자 셋이 삼각으로 서고 파편이 휘감는다
        w44c:function(s,t){if(t===20)for(var k=0;k<3;k++)K.mob(s,'guardian',90+k*90,-30,{stopY:k===1?90:130,fire:'hexagon',first:20+k*16,every:66,hold:520,color:k===1?CY:PU});
          if(t>=200&&t<760&&t%20===0)K.mob(s,'p5_fragment',(t/20)%2?30:330,-20,{vy:1.8,sway:1.4,swayRate:.06,fire:'p5six',first:30,color:CY});},
        // 45a 정지 회랑: 파편이 회랑 양 벽을 따라 줄지어 내려온다. 가운데는 비어 있다.
        w45a:function(s,t){if(t<780&&t%14===0){var l=(t/14)%2;K.mob(s,'p5_fragment',l?28:332,-20,{vy:1.8,fire:t%84<14?'p5still':'drop',first:30,every:t%84<14?60:24,color:CY});}},
        // 45b 멈춘 초침: 감시자 하나가 멈췄다 가는 거품을 쏘고, 파편이 느리게 떠 내려온다
        w45b:function(s,t){if(t===30)K.mob(s,'warden',180,-30,{stopY:110,fire:'p5still',first:20,every:40,hold:560,color:WH});
          if(t>=80&&t<760&&t%26===0)K.mob(s,'p5_fragment',30+K.rand(s)*300,-20,{vy:.9,fire:'ring',first:50,every:70,color:CY});},
        // 45c 좁아지는 회랑: 벽이 안으로 들어오고, 가운데로 파편이 흔들리며 지나간다
        w45c:function(s,t){if(t<780&&t%16===0){var l=(t/16)%2,inset=Math.min(80,t/10);K.mob(s,'p5_fragment',l?30+inset:330-inset,-20,{vy:1.7,fire:'drop',first:30,every:44,color:WH});}
          if(t<760&&t%60===30)K.mob(s,'p5_fragment',180,-20,{vy:1.4,sway:1.6,swayRate:.05,fire:'p5still',first:40,color:CY});},
        // 45d 회랑의 끝: 감시자 둘
        w45d:function(s,t){if(t===20){K.mob(s,'warden',100,-30,{stopY:116,fire:'bell',first:20,every:72,hold:520,color:CY});K.mob(s,'warden',260,-30,{stopY:116,fire:'bell',first:56,every:72,hold:520,color:WH});}
          if(t>=200&&t<760&&t%40===0)K.mob(s,'p5_fragment',40+K.rand(s)*280,-20,{vy:1.6,fire:'p5still',first:40,color:CY});},
        // 46a 시간 수확: 수확자가 양 위 모서리에서 호를 그리며 휩쓸고 지나간다
        w46a:function(s,t){if(t<760&&t%18===0){var l=Math.floor(t/90)%2;K.mob(s,'p5_reaper',l?-14:W+14,20,{vx:l?2.2:-2.2,vy:1.1,sway:1.2,swayRate:.03,fire:'p5cut',first:30,every:70,color:R});}},
        // 46b 생산 장치: 수확자 컨베이어 두 줄과 수호자
        w46b:function(s,t){if(t<760&&t%24===0){var band=(t/24)%2;K.mob(s,'collector',band?-14:W+14,40+band*50,{vx:band?2:-2,vy:.35,fire:'drop',first:30,every:40,color:band?CY:YE});}
          if(t===300)K.mob(s,'guardian',180,-30,{stopY:130,fire:'gearRing',first:20,every:56,hold:400,color:R});},
        // 46c 케이블: 교도가 세 줄 케이블처럼 늘어서 내려오고 감시자가 선다
        w46c:function(s,t){if(t<760&&t%30===0)for(var k=0;k<3;k++)K.mob(s,'p5_acolyte',60+k*120,-20-k*10,{vy:1.6,sway:.5,swayRate:.04,fire:k===1?'p5cut':'drop',first:30+k*8,every:60,color:k===1?R:CY});
          if(t===360)K.mob(s,'warden',180,-30,{stopY:110,fire:'bell',first:20,every:64,hold:360,color:R});},
        // 46d 영원한 작업장: 모두가 한 명령 아래 정렬되어 격자로 내려온다
        w46d:function(s,t){if(t<760&&t%60===0){var odd=(t/60)%2;for(var k=0;k<5;k++)K.mob(s,k%2?'collector':'p5_reaper',36+odd*36+k*72,-20,{vy:1.5,fire:k%2?'drop':'p5cut',first:36,every:70,color:k%2?YE:R});}},
        // 39d 끊어진 연결: 감시자 둘이 남고 수확자가 둘씩 느리게 흩어진다
        w39d:function(s,t){if(t===20){K.mob(s,'warden',110,-30,{stopY:120,fire:'bell',first:20,every:76,hold:480,color:GR});K.mob(s,'warden',250,-30,{stopY:120,fire:'bell',first:58,every:76,hold:480,color:CY});}
          if(t>=160&&t<760&&t%44===0)for(var k=0;k<2;k++)K.mob(s,'p5_reaper',180+(k?1:-1)*(30+K.rand(s)*110),-20,{vx:k?.5:-.5,vy:1.3,fire:'p5halt',first:40,color:GR});},
        // 42d 입력의 홍수: 드론이 문장처럼 줄지어 빠르게 내려오고, 빈칸이 줄마다 옮겨 간다
        w42d:function(s,t){if(t<760&&t%60===0){var g=(t/60)%6;for(var k=0;k<8;k++){if(k===g||k===g+1)continue;K.mob(s,k%2?'drone':'p5_acolyte',22+k*45,-20,{vy:2,fire:k%3?'drop':'p5word',first:30,every:50,color:k%2?CY:WH});}}},
        // 43d 봉인 풀린 묘지: 파편이 묘지 가운데에서 둘로 갈라져 양옆으로 흩어진다
        w43d:function(s,t){if(t<760&&t%16===0){var k=(t/16)%2;K.mob(s,'p5_fragment',180+(k?12:-12),-20,{vx:k?1.3:-1.3,vy:1.6,fire:'p5grave',first:30,every:100,color:k?WH:PU});}
          if(t===300)K.mob(s,'collector',180,-20,{vy:.8,fire:'ring',first:40,every:60,color:WH});},
        // 44d 회랑의 문: 교도가 문 양쪽 두 줄로 서서 내려오고, 파편이 문 한가운데로 떨어진다
        w44d:function(s,t){if(t<760&&t%30===0){K.mob(s,'p5_acolyte',100,-20,{vy:1.4,fire:'p5six',first:30,every:90,color:PU});K.mob(s,'p5_acolyte',260,-20,{vy:1.4,fire:'p5six',first:75,every:90,color:CY});}
          if(t<760&&t%45===20)K.mob(s,'p5_fragment',180,-20,{vy:2.2,fire:'drop',first:24,every:30,color:WH});}
      };
      function w(key,len){return K.wave(waves[key],len||900);}

      var stages=[
        {scene:'37',theme:{bg:'p5_academy',tint:'#1d1233',fx:'motes'},cast:['p5_acolyte','guardian'],reward:{key:'p5_core',name:'최초명령 코어'},
          waves:[w('w37a'),w('w37b'),w('w37c'),w('w37d')],mid:['p5_cult','p5_invasion','p5_taint']},
        {scene:'38',theme:{bg:'p5_outer',tint:'#141b2e',fx:'sand'},cast:['collector','p5_reaper','guardian'],reward:{key:'p5_clock',name:'시계'},
          waves:[w('w38a'),w('w38b'),w('w38c'),w('w38d')],mid:['p5_archon','p5_firstGate','p5_sandFlow']},
        {scene:'39',theme:{bg:'p5_forest',tint:'#122019',fx:'leaves'},cast:['p5_reaper','collector','warden'],reward:{key:'p5_sand',name:'검은 모래'},
          waves:[w('w39a'),w('w39b'),w('w39c'),w('w39d')],mid:['p5_common','stolenTime','p5_link']},
        {scene:'40',theme:{bg:'p5_layers',tint:'#1e1a12',fx:'static'},cast:['p5_reaper','guardian','warden'],reward:{key:'p5_gate',name:'관문'},
          waves:[w('w40a'),w('w40b'),w('w40c'),w('w40d')],mid:['p5_upper','p5_twelve','closedFloor'],boss:['p5_grand','p5_overlap','p5_gap','p5_moment']},
        {scene:'41',theme:{bg:'p5_workshop',tint:'#2a120c',fx:'embers'},cast:['collector','warden'],reward:{key:'p5_furnace',name:'용광로'},
          waves:[w('w41a',960),w('w41b',960),w('w41c',960),w('w41d',960)],mid:['p5_furnace','p5_possible','p5_cmdLine']},
        {scene:'42',theme:{bg:'p5_neural',tint:'#0f1630',fx:'sparks'},cast:['drone','p5_acolyte'],reward:{key:'p5_edict',name:'명령문'},
          waves:[w('w42a',960),w('w42b',960),w('w42c',960),w('w42d',960)],mid:['p5_neuron','p5_brain','p5_sentence']},
        {scene:'43',theme:{bg:'p5_graveyard',tint:'#151a1f',fx:'mist'},cast:['p5_fragment','collector'],reward:{key:'p5_shard',name:'시계 파편'},
          waves:[w('w43a',960),w('w43b',960),w('w43c',960),w('w43d',960)],mid:['p5_keeper','p5_dream','p5_shard']},
        {scene:'44',theme:{bg:'p5_ritual',tint:'#1f1026',fx:'ash'},cast:['p5_acolyte','p5_fragment','guardian'],reward:{key:'p5_ringkey',name:'명령 고리'},
          waves:[w('w44a',960),w('w44b',960),w('w44c',960),w('w44d',960)],mid:['p5_rings','p5_pillar','p5_sixRings']},
        {scene:'45',theme:{bg:'p5_corridor',tint:'#140e1e',fx:'dust'},cast:['p5_fragment','warden'],reward:{key:'p5_letter',name:'편지'},
          waves:[w('w45a',960),w('w45b',960),w('w45c',960),w('w45d',960)],mid:['arbelia','p5_afternoon'],boss:['arbelia','p5_letter','p5_silence','p5_thread','reprieve']},
        {scene:'46',theme:{bg:'p5_core',tint:'#2a0f1a',fx:'sand'},cast:['p5_reaper','collector','p5_acolyte','guardian','warden'],reward:{key:'p5_secondhand',name:'시곗바늘'},
          waves:[w('w46a',960),w('w46b',960),w('w46c',960),w('w46d',960)],mid:['siren','p5_harvest','p5_cable'],boss:['siren','p5_fate','p5_workshop','rewrite','p5_freewill']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
