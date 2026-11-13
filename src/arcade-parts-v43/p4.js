/* 합일 v43 · 제4부 — 환도 자아와 융합몽세. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * 서양의 들판과 숲(31~32) → 폭풍 성벽과 검은 바다(33) → 고려·조선풍 포구 마을과 안개(34~35).
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:4,
    // 타락천사 기사(33). 색: 2 보라, 4 청록
    actors:{p4_knight:{name:'타락천사 기사',c1:2,c2:4}},
    // 기사의 형상(33), 잠들지 못한 주민(34~35), 주민에게서 떨어져 나온 검은 안개(35)
    mobs:{p4_shade:{hp:6,r:14,score:300},p4_villager:{hp:7,r:14,score:300},p4_soul:{hp:8,r:15,score:300}},
    // 타락천사 기사의 검
    props:[{key:'p4_sword',radius:12}],
    build:function(K){
      var W=K.W,TAU=K.TAU,PI=Math.PI,DOWN=Math.PI/2,RED=K.RED,PURPLE=K.PURPLE,CYAN=K.CYAN,GREEN=K.GREEN,YELLOW=K.YELLOW,WHITE=K.WHITE,RICE=K.RICE;
      var spawn=K.spawn,mob=K.mob,rand=K.rand,count=K.count,pick=K.pick,aim=K.aim;
      // 빈칸이 한 칸씩만 옮겨 가는 줄(curtain)의 빈칸 자리
      function drift(s,most){s.lane=Math.max(0,Math.min(most,(s.lane===undefined?most>>1:s.lane)+Math.floor(rand(s)*3)-1));return s.lane;}

      var mobFire={
        // 고블린의 피리: 휘어 나가는 음표 몇 개
        p4_pipe:function(s,m){var a=aim(s,m.x,m.y),n=count(s,2.4);for(var k=0;k<n;k++)spawn(s,m.x,m.y,a+(k-(n-1)/2)*.24,80,{color:m.color,size:0,turn:k%2?.5:-.5});},
        // 기사의 형상: 가로로 그은 한 줄 검격이 그대로 내려온다
        p4_slash:function(s,m){var n=count(s,3.6);for(var k=0;k<n;k++)spawn(s,m.x+(k-(n-1)/2)*11,m.y+6,DOWN,90,{color:m.color,size:RICE});},
        // 주민: 붉은 부적 같은 쌀알 몇 개와 느린 흰 구슬
        p4_talisman:function(s,m){K.fan(s,m.x,m.y,count(s,2.2),aim(s,m.x,m.y),.6,94,{color:RED,size:RICE});spawn(s,m.x,m.y,DOWN,56,{color:WHITE,size:1});},
        // 검은 안개: 천천히 번지다 더 느려지는 고리
        p4_fog:function(s,m){K.ring(s,m.x,m.y,count(s,6),46,rand(s)*TAU,{color:m.color,size:1,accel:-14,min:22});}
      };

      var spells={
        // ── 31 중립 지역의 재각성 ──
        p4_clash:{name:'어울리지 않는 풍경',scene:'31',fire:function(s,t){var b=s.boss,n=pick(s,5,6,8),step=W/n,i;
          // 두 세계가 맞붙은 땅: 서쪽 들판의 초록 줄과 동쪽의 보라 줄이 서로 비스듬히 엇갈려 내려오며 마름모 격자를 짠다.
          if(t%64===0)for(i=0;i<n;i++){spawn(s,step*(i+.25),-10,DOWN-.5,62,{color:GREEN,size:0});spawn(s,step*(i+.25)-16,-34,DOWN-.5,62,{color:GREEN,size:0});}
          if(t%64===32)for(i=0;i<n;i++){spawn(s,step*(i+.75),-10,DOWN+.5,62,{color:PURPLE,size:0});spawn(s,step*(i+.75)+16,-34,DOWN+.5,62,{color:PURPLE,size:0});}
          if(t%128===96)K.ring(s,b.x,b.y,count(s,10),58,rand(s)*TAU,{color:YELLOW,size:1});}},
        p4_resonance:{name:'칼의 공명',scene:'31',fire:function(s,t){var b=s.boss;
          // 칼의 공명: 같은 자리에서 함께 난 두 고리가 서로 반대로 휘며 엇갈려, 울림처럼 겹무늬가 번진다.
          if(t%44===0){var n=count(s,12),o=rand(s)*TAU;K.ring(s,b.x,b.y,n,70,o,{color:CYAN,size:0,turn:.16,life:560});K.ring(s,b.x,b.y,n,70,o,{color:WHITE,size:0,turn:-.16,life:560});}
          if(t%132===88)K.fan(s,b.x,b.y,pick(s,1,2,3),aim(s,b.x,b.y),.5,96,{size:K.SHAPE_PROP,color:K.P.p4_sword,spin:.2});}},
        // ── 32 고블린 두목과 장미 인장 ──
        p4_pipe:{name:'늑대를 조종하는 피리',scene:'32',fire:function(s,t){var b=s.boss,every=Math.max(2,Math.round(6/s.density)),i;
          // 피리 가락: 좌우가 거울처럼 맞선 두 줄기 가락이 물결치며 흘러내린다.
          if(t%every===0){var w=.95*Math.sin(t*.045);spawn(s,b.x,b.y,DOWN+w,78,{color:GREEN,size:0});spawn(s,b.x,b.y,DOWN-w,78,{color:RED,size:0});}
          // 늑대의 울음: 흩어진 늑대 탄이 멈춰 섰다가 피리 소리에 맞춰 한꺼번에 영웅에게 달려든다.
          if(t%110===55){var n=count(s,9);for(i=0;i<n;i++)spawn(s,b.x,b.y,DOWN+(i/(n-1||1)-.5)*2.4,120,{color:YELLOW,size:1,accel:-160,min:0,at:50,mode:K.MODE_REAIM,arg:0,speed2:100});}}},
        p4_between:{name:'늑대들 사이',scene:'32',fire:function(s,t){var b=s.boss;
          // 늑대 떼가 양옆으로 달려 나갔다가 꺾여 내려와 두 겹 벽을 세운다. 벽 사이 길이 좌우로 흔들린다.
          if(t%Math.round(10/s.density)===0){var at=Math.round(34+16*Math.sin(t*.025));
            spawn(s,b.x,b.y,0,130,{color:RED,size:1,at:at,mode:K.MODE_TURN,arg:DOWN,speed2:70});spawn(s,b.x,b.y,PI,130,{color:RED,size:1,at:at,mode:K.MODE_TURN,arg:-DOWN,speed2:70});
            spawn(s,b.x,b.y,0,130,{color:WHITE,size:0,at:at+44,mode:K.MODE_TURN,arg:DOWN,speed2:70});spawn(s,b.x,b.y,PI,130,{color:WHITE,size:0,at:at+44,mode:K.MODE_TURN,arg:-DOWN,speed2:70});}
          if(t%90===45)K.fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),.36,104,{color:YELLOW,size:RICE});}},
        p4_skysplit:{name:'하늘이 갈라진 날',scene:'32',fire:function(s,t){var b=s.boss,phase=t%170,i;
          // 하늘이 갈라진다: 세로 균열(광선)이 서고, 균열 양쪽에서 서쪽(초록)과 동쪽(보라)의 탄이 서로 건너편으로 비껴 쏟아져 뒤섞인다.
          if(phase===0){s.p4crack=60+rand(s)*(W-120);K.column(s,s.p4crack,{width:16,warn:70,active:84,color:WHITE});}
          if(phase>=40&&phase<160&&phase%8===0)for(i=0;i<count(s,1.5);i++){
            spawn(s,rand(s)*s.p4crack,-10,DOWN-.28,66+rand(s)*20,{color:GREEN,size:0});
            spawn(s,s.p4crack+rand(s)*(W-s.p4crack),-10,DOWN+.28,66+rand(s)*20,{color:PURPLE,size:0});}
          if(t%85===40)K.ring(s,b.x,b.y,count(s,12),62,rand(s)*TAU,{color:YELLOW,size:1});}},
        p4_door:{name:'방향을 알 수 없는 문',scene:'32',fire:function(s,t){var b=s.boss,k;
          // 무너진 성에 열린 두 문: 쏟아진 고리가 멈칫하더니 한꺼번에 꺾인다. 어느 쪽으로 꺾일지는 열릴 때마다 다르다.
          if(t%76===0)for(k=0;k<2;k++){var r=Math.floor(rand(s)*4),arg=r===0?DOWN:r===1?-DOWN:r===2?2.4:-2.4;
            K.ring(s,b.x+(k?84:-84),b.y+10,count(s,17),112,rand(s)*TAU,{color:k?YELLOW:PURPLE,size:1,accel:-110,min:26,at:46,mode:K.MODE_TURN,arg:arg,speed2:72});}
          if(t%152===114)K.fan(s,b.x,b.y,pick(s,3,4,5),aim(s,b.x,b.y),.6,108,{color:GREEN,size:RICE});}},
        // ── 33 타락천사 기사 ──
        p4_storm:{name:'폭풍 속의 무너진 성',scene:'33',fire:function(s,t){var wind=.42*Math.sin(t*.012),i;
          // 폭풍: 바람 방향이 천천히 바뀌는 빗줄기(쌀알)
          if(t%3===0)for(i=0;i<count(s,1.5);i++)spawn(s,rand(s)*(W+160)-80,-10,DOWN-wind,124+rand(s)*30,{color:CYAN,size:RICE});
          // 무너지는 성벽의 돌: 큰 구슬 한 줄이 빈칸 두 개를 옮겨 가며 떨어진다
          if(t%84===0)K.curtain(s,9,drift(s,7),2,54,{color:WHITE,size:2});}},
        p4_read:{name:'자세와 검로',scene:'33',fire:function(s,t){var b=s.boss,p=s.player;
          // 기사가 검로를 읽는다: 영웅이 45틱 전에 있던 자리를 겨누는 쌀알 두 줄기, 그리고 가려는 자리를 앞질러 겨누는 종 모양 부채.
          if(!s.p4trail)s.p4trail=new Float32Array(128);
          var i=t%64;s.p4trail[i*2]=p.x;s.p4trail[i*2+1]=p.y;
          if(t>=45&&t%6===0){var j=(t-45)%64,a=Math.atan2(s.p4trail[j*2+1]-b.y,s.p4trail[j*2]-b.x),m=pick(s,1,1,2);for(var k=-m;k<=m;k++)if(k)spawn(s,b.x+k*11,b.y,a,148,{color:WHITE,size:RICE});}
          if(t>=20&&t%80===40){var q=(t-12)%64,ahead=Math.max(10,Math.min(W-10,p.x+(p.x-s.p4trail[q*2])*5));K.bell(s,b.x,b.y,count(s,12),Math.atan2(p.y-b.y,ahead-b.x),1.5,96,.45,{color:PURPLE,size:1});}
          if(t%80===0)K.ring(s,b.x,b.y,count(s,12),56,rand(s)*TAU,{color:CYAN,size:0});}},
        p4_repeat:{name:'이미 했던 움직임',scene:'33',fire:function(s,t){var b=s.boss,phase=t%240,a;
          // 이미 했던 움직임: 처음 그은 다섯 부채(흰색)가 120틱 뒤 같은 순서·같은 방향으로 더 빽빽하고 빠르게(빨강) 되풀이된다.
          if(!s.p4moves)s.p4moves=new Float32Array(5);
          if(phase===0)for(var k=0;k<5;k++)s.p4moves[k]=DOWN+(rand(s)-.5)*1.7;
          if(phase<100&&phase%20===0){a=s.p4moves[phase/20];K.fan(s,b.x,b.y,count(s,7),a,.8,100,{color:WHITE,size:1});}
          if(phase>=120&&phase<220&&phase%20===0){a=s.p4moves[(phase-120)/20];K.fan(s,b.x,b.y,count(s,10),a,.8,122,{color:RED,size:0});K.fan(s,b.x,b.y,count(s,5),a,.5,84,{color:RED,size:1});}
          if(phase===110)K.ring(s,b.x,b.y,count(s,10),54,rand(s)*TAU,{color:CYAN,size:1});}},
        p4_six:{name:'여섯 형상',scene:'33',fire:function(s,t){var b=s.boss,rot=t*.012,k,x,y;
          // 여섯 형상으로 분열: 보스를 둘러싼 육각 여섯 자리가 돌면서 차례로 영웅을 베고, 이따금 여섯 자리가 함께 고리를 연다.
          if(t%12===0){k=Math.floor(t/12)%6;x=b.x+Math.cos(rot+k*TAU/6)*74;y=b.y+Math.sin(rot+k*TAU/6)*46;K.fan(s,x,y,count(s,2),aim(s,x,y),.3,110,{color:k%2?PURPLE:CYAN,size:RICE});}
          if(t%100===50)for(k=0;k<6;k++){x=b.x+Math.cos(rot+k*TAU/6)*74;y=b.y+Math.sin(rot+k*TAU/6)*46;K.ring(s,x,y,count(s,8),56,rot+k,{color:WHITE,size:0});}}},
        p4_sixcuts:{name:'여섯 검격',scene:'33',fire:function(s,t){var b=s.boss,phase=t%210,k,j;
          // 서로 다른 여섯 방향에서 검격이 한꺼번에: 위·양옆 여섯 자리에서 영웅이 서 있던 곳을 가르는 광선 여섯 줄,
          // 이어 기사의 검 여섯 자루가 날아가며 구슬 꼬리를 끌고, 마지막으로 검을 휘두른 호(弧)가 왼쪽에서 오른쪽으로 펼쳐진다.
          if(phase===0){var px=s.player.x,py=s.player.y;for(k=0;k<6;k++){var ox=k<2?-12:k>3?W+12:90+(k-2)*180,oy=k<2||k>3?150+(k%2)*170:-12;
            K.beam(s,ox,oy,Math.atan2(py-oy,px-ox),{width:12,warn:76,active:44,color:k%2?PURPLE:CYAN});}}
          if(phase===100){var c=aim(s,b.x,b.y),spread=pick(s,2.1,1.8,1.6),tail=count(s,4);
            for(k=0;k<6;k++){var a=c+(k/5-.5)*spread;spawn(s,b.x,b.y,a,100,{size:K.SHAPE_PROP,color:K.P.p4_sword,spin:.22});
              for(j=1;j<=tail;j++)spawn(s,b.x,b.y,a,100-j*48/tail,{color:k%2?PURPLE:CYAN,size:j===1?1:0});}}
          if(phase>=150&&phase<180&&phase%2===0){var u=(phase-150)/28,sw=DOWN+1.25-u*2.5;for(j=0;j<pick(s,2,3,4);j++)spawn(s,b.x,b.y,sw,74+j*14,{color:WHITE,size:RICE});}
          if(t%60===30)K.ring(s,b.x,b.y,count(s,12),58,rand(s)*TAU,{color:PURPLE,size:1});}},
        p4_sea:{name:'성벽 밖 검은 바다',scene:'33',fire:function(s,t){var b=s.boss;
          // 성벽 밖으로 밀려나 검은 바다로: 거품 줄이 빈칸을 옮기며 내려오고, 보스 둘레로 물살이 소용돌이친다.
          if(t%84===0)K.curtain(s,9,drift(s,6),3,58,{color:PURPLE,size:4});
          if(t%Math.round(7/s.density)===0){var a=t*.05;spawn(s,b.x,b.y,a,72,{color:CYAN,size:0,turn:.3,life:520});spawn(s,b.x,b.y,a+PI,72,{color:CYAN,size:0,turn:.3,life:520});}
          if(t%60===40)K.fan(s,b.x,b.y,count(s,4),aim(s,b.x,b.y),.8,100,{color:WHITE,size:RICE});}},
        // ── 34 잠들지 못하는 마을 ──
        p4_string:{name:'보이지 않는 실',scene:'34',fire:function(s,t){var b=s.boss,phase=t%150,n=pick(s,3,4,5),k;
          // 보이지 않는 실: 위에서 늘어진 실 몇 가닥을 따라 구슬이 내려오다가, 실이 당겨지는 순간 한꺼번에 영웅에게 끌려온다.
          if(phase===0)s.p4thread=(rand(s)-.5)*50;
          if(phase<90&&phase%6===0)for(k=0;k<n;k++)spawn(s,(k+.5)*W/n+s.p4thread,-10,DOWN,70,{color:WHITE,size:1,at:110-phase,mode:K.MODE_REAIM,arg:0,speed2:92});
          if(t%75===40)K.ring(s,b.x,b.y,count(s,10),54,rand(s)*TAU,{color:PURPLE,size:0});}},
        // ── 35 한약과 불면귀 ──
        p4_medicine:{name:'한약 한 잔',scene:'35',fire:function(s,t){var b=s.boss,sp=s.rules.speed;
          // 한약 한 잔: 달려들던 탄(주민)이 약 기운에 멈춰 서서 한동안 제자리에 머물다 사라지고, 노란 약 기운이 고리로 번진다.
          if(t%36===0)K.fan(s,b.x,b.y,count(s,10),aim(s,b.x,b.y)+(rand(s)-.5)*.7,1.6,170,{color:WHITE,size:1,accel:-58*sp*sp,min:0,life:Math.round(170+170/sp)});
          if(t%110===70)K.ring(s,b.x,b.y,count(s,14),50,rand(s)*TAU,{color:YELLOW,size:0});}},
        p4_gather:{name:'하나의 형체',scene:'35',fire:function(s,t){var b=s.boss,i;
          // 검은 안개가 하나의 형체로 모인다: 화면 위 끝 곳곳에서 출발한 탄이 모두 불면귀 한 점으로 모였다가 그대로 지나쳐 아래로 퍼진다.
          if(t%50===0){var n=count(s,14),off=rand(s)*W/n;for(i=0;i<n;i++){var x=off+i*W/n;spawn(s,x,-10,Math.atan2(b.y+10,b.x-x),78,{color:PURPLE,size:0});}}
          if(t%100===75)K.ring(s,b.x,b.y,count(s,12),52,rand(s)*TAU,{color:WHITE,size:1});}},
        p4_layers:{name:'겹겹의 잔상',scene:'35',fire:function(s,t){var b=s.boss,phase=t%100;
          // 겹겹의 잔상: 같은 고리가 조금씩 늦게·조금씩 빠르게 네 번 겹쳐 두꺼운 껍질이 되고, 껍질을 꿰는 바큇살 틈이 길이 된다.
          if(phase===0)s.p4off=rand(s)*TAU;
          if(phase<32&&phase%8===0){var k=phase/8;K.ring(s,b.x+(k-1.5)*12,b.y,count(s,18),58+k*9,s.p4off,{color:k%2?PURPLE:WHITE,size:k===3?1:0});}
          if(phase===62)K.fan(s,b.x,b.y,pick(s,3,4,5),aim(s,b.x,b.y),.7,116,{color:PURPLE,size:RICE});}},
        p4_core:{name:'드러난 핵',scene:'35',fire:function(s,t){var b=s.boss,arms=pick(s,3,4,6),dir=Math.floor(t/180)%2?-1:1,k;
          // 드러난 핵: 여러 갈래 나선이 때때로 방향을 뒤집으며 돌고, 핵의 조각(큰 빨간 구슬)이 터져 고리가 된다.
          if(t%7===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,dir*t*.021+TAU*k/arms,78,{color:k%2?WHITE:PURPLE,size:0});
          if(t%90===45)K.fan(s,b.x,b.y,pick(s,2,2,3),aim(s,b.x,b.y),1.2,90,{color:RED,size:2,at:60,mode:K.MODE_SPLIT,arg:count(s,8),speed2:62});}}
      };

      /* ── 잡몹 구간 대본. 장면마다 길의 느낌이 다르다. ── */
      // 31 들판: 슬라임이 밭고랑처럼 엇갈린 줄을 지어 천천히 내려오고, 이따금 늑대가 들판을 가로지른다.
      var w31field=K.wave(function(s,t){var k;
        if(t<620&&t%96===0){var r=t/96;for(k=0;k<4;k++)mob(s,'slime',W/4*(k+.5)+(r%2?24:-24),-20,{vy:1.4,sway:.35,swayRate:.04,fire:'ring',first:56,color:GREEN});}
        if(t%150===75){var left=(t/150|0)%2===0;mob(s,'wolf',left?-16:W+16,40,{vx:left?2.6:-2.6,vy:1,fire:'aim',first:26,color:WHITE});}},760);
      // 31 숲: 늑대 셋이 한 무리로 숲 양쪽 모서리에서 비스듬히 달려 들고, 뒤이어 피리 부는 고블린이 숲 사이로 내려온다.
      var w31forest=K.wave(function(s,t){var k;
        if(t<660&&t%70===0){var left=(t/70)%2===0,x0=left?30:W-30,dir=left?1:-1;for(k=0;k<3;k++)mob(s,'wolf',x0-dir*k*22,-20-k*26,{vx:dir*1.5,vy:2.3,fire:'aim',first:30+k*6,color:YELLOW});}
        if(t>=300&&t<640&&t%40===20)mob(s,'mobgoblin',60+rand(s)*240,-20,{vy:1.2,sway:.8,fire:'p4_pipe',first:60,color:GREEN});},780);
      // 31 무너진 성: 고블린이 양쪽 성벽 자리를 따라 두 줄로 내려오고, 가운데 마당으로 슬라임 무리가 굴러온다.
      var w31ruins=K.wave(function(s,t){var k;
        if(t<640&&t%22===0){var side=(t/22)%2;mob(s,'mobgoblin',side?78:282,-20,{vy:1.8,fire:'aim',first:40,color:RED});}
        if(t>=200&&t<600&&t%100===0)for(k=0;k<3;k++)mob(s,'slime',150+k*30,-20-k*20,{vy:1.1,sway:.5,fire:'ring',first:70,color:GREEN});},780);
      // 32 늑대 떼: 피리 부는 고블린을 꼭짓점으로 한 V자 늑대 떼가 내려온다.
      var w32pack=K.wave(function(s,t){
        if(t<600&&t%120===0){var cx=110+rand(s)*140;for(var k=0;k<7;k++){var o=k-3;if(o)mob(s,'wolf',cx+o*26,-20-Math.abs(o)*22,{vy:2,fire:'aim',first:36,every:50,color:RED});else mob(s,'mobgoblin',cx,-20,{vy:2,fire:'p4_pipe',first:40,color:GREEN});}}},760);
      // 32 피리꾼: 고블린 피리꾼이 느리게 흔들리며 머물고, 그 소리에 늑대가 곧게 내리달린다.
      var w32pipers=K.wave(function(s,t){
        if(t<480&&t%80===0)mob(s,'mobgoblin',60+((t/80)*97)%240,-20,{vy:.8,sway:1.2,swayRate:.03,fire:'p4_pipe',first:50,every:70,color:GREEN});
        if(t>=120&&t<700&&t%36===0)mob(s,'wolf',30+rand(s)*300,-20,{vy:3.2,fire:'aim',first:20,every:30,color:WHITE});},780);
      // 32 늑대들 사이: 두 갈래 늑대 줄이 서로 반대로 크게 흔들리며 꼬이고, 양옆에 피리꾼이 선다.
      var w32ring=K.wave(function(s,t){
        if(t<620&&t%30===0){var i=t/30;mob(s,'wolf',i%2?130:230,-20,{vy:1.6,sway:i%2?2.4:-2.4,swayRate:.05,fire:'ring',first:40,every:70,color:YELLOW});}
        if(t===320){mob(s,'mobgoblin',40,-20,{vy:.9,fire:'p4_pipe',first:40,every:90,color:GREEN});mob(s,'mobgoblin',W-40,-20,{vy:.9,fire:'p4_pipe',first:85,every:90,color:GREEN});}},760);
      // 32 매복: 고블린이 숲 양옆에서 번갈아 가로질러 나오고, 가운데로 늑대가 세 줄로 뛰어든다.
      var w32ambush=K.wave(function(s,t){
        if(t<640&&t%48===0){var left=(t/48)%2===0;mob(s,'mobgoblin',left?-16:W+16,50+rand(s)*80,{vx:left?1.8:-1.8,vy:.5,fire:'aim',first:40,every:70,color:GREEN});}
        if(t>=200&&t<700&&t%26===0)mob(s,'wolf',150+((t/26)%3)*30,-20,{vy:2.6,fire:'aim',first:24,every:44,color:RED});},780);
      // 33 성벽: 기사의 형상이 성벽 높이 세 단을 따라 가로로 휩쓸며 한 줄 검격을 떨군다.
      var w33rampart=K.wave(function(s,t){
        if(t<660&&t%44===0){var r=(t/44)%3,left=(t/44)%2===0;mob(s,'p4_shade',left?-16:W+16,70+r*55,{vx:left?2.4:-2.4,vy:.25,fire:'p4_slash',first:40,every:50,color:PURPLE});}},780);
      // 33 돌진: 양쪽 위 모서리에서 형상 둘이 X자로 엇갈려 내리꽂고, 뒤에 기사가 선다.
      var w33dash=K.wave(function(s,t){
        if(t<640&&t%40===0){mob(s,'p4_shade',20,-20,{vx:2.2,vy:2.8,fire:'p4_slash',first:24,color:CYAN});mob(s,'p4_shade',W-20,-20,{vx:-2.2,vy:2.8,fire:'p4_slash',first:24,color:CYAN});}
        if(t===300)mob(s,'knight',180,-30,{stopY:110,fire:'sixcuts',first:20,every:100,hold:300,color:PURPLE});},760);
      // 33 성문의 기사: 기사가 가운데 버티고, 형상들이 양쪽 가장자리로 번갈아 흘러내린다.
      var w33knight=K.wave(function(s,t){
        if(t===60)mob(s,'knight',180,-30,{stopY:118,fire:'sixcuts',first:20,every:90,hold:360,color:CYAN});
        if(t>=120&&t<700&&t%30===0){var side=(t/30)%2;mob(s,'p4_shade',side?40:W-40,-20,{vy:2,sway:.8,fire:'p4_slash',first:40,color:WHITE});}},800);
      // 33 폭풍 속 두 기사: 기사 둘이 양쪽에 서고, 형상들이 비바람처럼 흩어져 비스듬히 내린다.
      var w33twin=K.wave(function(s,t){
        if(t===40){mob(s,'knight',100,-30,{stopY:104,fire:'sixcuts',first:20,every:110,hold:380,color:PURPLE});mob(s,'knight',260,-30,{stopY:104,fire:'sixcuts',first:75,every:110,hold:380,color:CYAN});}
        if(t>=200&&t<700&&t%34===0)mob(s,'p4_shade',30+rand(s)*300,-20,{vx:-.9,vy:2.4,fire:'p4_slash',first:30,color:PURPLE});},800);
      // 34 파도에 떠밀려: 주민 한 줄이 왼쪽부터 차례로 들어와, 같은 박자로 흔들리며 물결처럼 일렁인다.
      var w34tide=K.wave(function(s,t){var ph=t%150;
        if(t<620&&ph<40&&ph%5===0){var k=ph/5;mob(s,'p4_villager',24+k*44,-20,{vy:1.5,sway:1,swayRate:.045,fire:'drop',first:50+k*4,every:34,color:WHITE});}},780);
      // 34 실에 끌리듯: 주민이 영웅이 있는 쪽으로 곧장 달려든다.
      var w34pulled=K.wave(function(s,t){
        if(t<640&&t%26===0){var x=30+rand(s)*300,dx=s.player.x-x,dy=s.player.y+20,d=Math.sqrt(dx*dx+dy*dy);mob(s,'p4_villager',x,-20,{vx:dx/d*2.4,vy:dy/d*2.4,fire:'p4_talisman',first:30,every:50,color:RED});}},760);
      // 34 포구: 선창 세 줄을 따라 주민이 줄지어 내려오며 곧게 떨군다. 줄 사이가 길이다.
      var w34pier=K.wave(function(s,t){
        if(t<660&&t%18===0){var lane=(t/18)%3;mob(s,'p4_villager',90+lane*90,-20,{vy:1.6,fire:'drop',first:40,every:30,color:YELLOW});}},780);
      // 34 어긋난 몸짓: 주민이 얼굴과 따로 노는 몸처럼 빠르고 잘게 휘청이며 내려온다.
      var w34jerk=K.wave(function(s,t){
        if(t<640&&t%32===0){var i=t/32;mob(s,'p4_villager',50+((i*137)%260),-20,{vy:1.9,sway:.9,swayRate:.16,fire:'p4_talisman',first:36,every:40,color:PURPLE});}},760);
      // 35 안개: 검은 안개 조각이 크게 느릿느릿 흔들리며 내려와 느린 고리를 번진다.
      var w35fog=K.wave(function(s,t){
        if(t<600&&t%40===0)mob(s,'p4_soul',40+rand(s)*280,-20,{vy:1,sway:1.6,swayRate:.025,fire:'p4_fog',first:50,every:66,color:PURPLE});},780);
      // 35 멈춘 주민: 느릿느릿 멈춘 듯한 주민 줄 위로, 주민에게서 떨어져 나온 안개가 더 빨리 빠져나간다.
      var w35still=K.wave(function(s,t){
        if(t<=180&&t%90===0)for(var k=0;k<5;k++)mob(s,'p4_villager',40+k*70,-20,{vy:.75,fire:'drop',first:80,every:140,color:WHITE});
        if(t>=200&&t<700&&t%30===0){var j=(t/30)%5;mob(s,'p4_soul',40+j*70,-30,{vy:2,sway:.6,fire:'p4_fog',first:50,color:PURPLE});}},760);
      // 35 모여드는 안개: 양쪽 위에서 안개가 가운데로 비껴 모여들며 엇갈린다.
      var w35gather=K.wave(function(s,t){
        if(t<640&&t%30===0){var left=(t/30)%2===0;mob(s,'p4_soul',left?20:W-20,-20,{vx:left?1.3:-1.3,vy:1.5,fire:'ring',first:70,color:WHITE});}},780);
      // 35 깨어나는 마을: 주민 여섯 자리 줄에 빈자리 하나가 옮겨 다니고, 그 빈자리를 안개가 메운다.
      var w35wake=K.wave(function(s,t){
        if(t<660&&t%90===0){var gap=((t/90)*5+1)%6;for(var k=0;k<6;k++)if(k!==gap)mob(s,'p4_villager',30+k*60,-20,{vy:1.4,fire:k%2?'drop':'p4_talisman',first:50,color:RED});
          mob(s,'p4_soul',30+gap*60,-50,{vy:1.4,sway:.5,fire:'p4_fog',first:70,color:PURPLE});}},800);

      var stages=[
        {scene:'31',theme:{bg:'p4_field',tint:'#1b2a1c',fx:'leaves'},cast:['slime','wolf','mobgoblin'],reward:{key:'p4_hando',name:'환도'},
          waves:[w31field,w31forest,w31ruins],mid:['goblin','p4_clash','p4_resonance']},
        {scene:'32',theme:{bg:'p4_goblin',tint:'#21182a',fx:'spores'},cast:['wolf','mobgoblin'],reward:{key:'p4_roseseal',name:'장미 인장'},
          waves:[w32pack,w32pipers,w32ring,w32ambush],mid:['goblin','p4_pipe'],boss:['goblin','p4_between','p4_skysplit','p4_door','roseSeal']},
        {scene:'33',theme:{bg:'p4_rampart',tint:'#121a2c',fx:'rain'},cast:['p4_shade','knight'],reward:{key:'p4_sixcuts',name:'여섯 검격'},
          waves:[w33rampart,w33dash,w33knight,w33twin],mid:['p4_knight','p4_storm'],boss:['p4_knight','p4_read','p4_repeat','p4_six','p4_sixcuts','p4_sea']},
        {scene:'34',theme:{bg:'p4_harbor',tint:'#2a1616',fx:'paper'},cast:['p4_villager'],reward:{key:'p4_talisman',name:'붉은 부적'},
          waves:[w34tide,w34pulled,w34pier,w34jerk],mid:['insomnia','sleepless','p4_string']},
        {scene:'35',theme:{bg:'p4_fogvillage',tint:'#1d1a26',fx:'mist'},cast:['p4_soul','p4_villager'],reward:{key:'p4_core',name:'불면귀 핵'},
          waves:[w35fog,w35still,w35gather,w35wake],mid:['insomnia','puppetFog','p4_medicine'],boss:['insomnia','p4_gather','openEye','p4_layers','p4_core']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
