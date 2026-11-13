/* 합일 v43 · 제7부 — 파란불 아래의 사람들. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * 현실의 네 사람(윤하람·장민재·고서진·한이경)은 쏘지 않는다. 길목지기는 본문에 나오는 사고의 잔상·장치다:
 *   은회색 승용차(52 "왼쪽에서는 은회색 승용차가 횡단보도로 미끄러져 들어왔다", 55 "비와 전조등"),
 *   검은 그림자(55 "은회색 승용차 앞에 나타났다는 검은 그림자", 53에서 민재가 본 "떨어지는 사람"),
 *   화재경보 회로(54 "화재경보 회로는 불안정했었고"), 파란불 집행체(55 "고리를 지키는 파란불 집행체").
 * 잡몹: 기억 조각(p7_fragment) · 그림자 잔상(p7_shade) · 오래된 비상벨(p7_bell, 52 "오래된 비상벨이 끊어지기 직전 내는 … 전자음").
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:7,
    actors:{
      p7_car:{name:'은회색 승용차',c1:8,c2:4},
      p7_shadow:{name:'검은 그림자',c1:2,c2:8},
      p7_alarm:{name:'화재경보 회로',c1:0,c2:4}
    },
    mobs:{
      p7_fragment:{hp:6,r:13,score:300},
      p7_shade:{hp:8,r:15,score:300},
      p7_bell:{hp:90,r:20,score:4000,elite:true}
    },
    props:[{key:'p7_sedan',radius:13},{key:'p7_signal',radius:14,upright:true}],
    build:function(K){
      var PI=Math.PI,TAU=K.TAU,W=K.W;

      /* ── 잡몹의 사격 ── */
      var mobFire={
        // 신호에 멈췄다 다시 걷는 작은 고리
        p7stopgo:function(s,m){var n=K.count(s,7),base=K.rand(s)*TAU;
          for(var i=0;i<n;i++)K.spawn(s,m.x,m.y,base+TAU*i/n,110,{color:m.color,size:0,accel:-150,min:0,at:72,mode:K.MODE_TURN,arg:0,speed2:66});},
        // 끊어지기 직전의 낮고 얇은 전자음: 느리고 촘촘한 두 겹 고리
        p7beep:function(s,m){var n=K.count(s,14),o=m.shots*.21;
          K.ring(s,m.x,m.y,n,58,o,{color:K.WHITE,size:0});K.ring(s,m.x,m.y,n,44,o+PI/n,{color:K.CYAN,size:0});},
        // 물에 번지는 글자: 느린 거품
        p7ink:function(s,m){K.fan(s,m.x,m.y,K.pick(s,2,3,3),K.aim(s,m.x,m.y),1.4,46,{color:K.CYAN,size:4});},
        // 떨어지는 사람: 곧게 떨어지며 빨라지는 탄 한 줄
        p7fall:function(s,m){for(var k=0,n=K.pick(s,2,3,4);k<n;k++)K.spawn(s,m.x,m.y+k*10,PI/2,30,{color:K.PURPLE,size:1,accel:110,max:150});},
        // 7층 출입구 표지: 초록 종 모양 부채
        p7exit:function(s,m){K.bell(s,m.x,m.y,K.count(s,7),K.aim(s,m.x,m.y),1.2,88,.45,{color:K.GREEN,size:0});},
        // 번갈아 울리는 경보: 빨강·청록 부채
        p7siren:function(s,m){K.fan(s,m.x,m.y,K.count(s,9),PI/2,1.6,80,{color:m.shots%2?K.RED:K.CYAN,size:1});},
        // 휘어 도는 저녁: 휘어지는 작은 고리
        p7loop:function(s,m){K.ring(s,m.x,m.y,K.count(s,8),80,K.rand(s)*TAU,{color:m.color,size:0,turn:m.shots%2?.8:-.8,life:600});},
        // 전조등 빛살: 아래로 좁은 쌀알 부채
        p7cone:function(s,m){K.fan(s,m.x,m.y,K.count(s,5),PI/2,.5,100,{color:K.WHITE,size:K.RICE});}
      };

      /* ── 이름 붙은 패턴 ── */
      var spells={
        // 52 · 은회색 승용차의 무기(차 자체): 차(큰 기물)가 젖은 도로에서 휘며 미끄러지고 뒤로 물보라 구슬 꼬리가 같은 궤적을 따른다. 부딪힌 자리에서 교정지 글자(쌀알)가 흩어졌다 멈춰 천천히 가라앉는다.
        p7_wetRoad:{name:'젖은 도로',scene:'52',time:36,fire:function(s,t){var b=s.boss,phase=t%96,cyc=(t/96)|0,d=cyc%2?1:-1,n=K.pick(s,2,3,4),k,a;
          if(phase<=36&&phase%4===0)for(k=0;k<n;k++){a=PI/2-d*(.75+k*.22);
            if(phase===0)K.spawn(s,b.x,b.y,a,112,{size:K.SHAPE_PROP,color:K.P.p7_sedan,turn:d*.6,spin:d*.05});
            else K.spawn(s,b.x,b.y,a,112,{color:phase%8?K.WHITE:K.CYAN,size:phase>24?0:1,turn:d*.6});}
          if(phase===48){var m=K.count(s,17),base=K.rand(s)*TAU;
            for(k=0;k<m;k++){a=base+TAU*k/m;K.spawn(s,b.x,b.y,a,100+K.rand(s)*70,{color:K.WHITE,size:K.RICE,accel:-170,min:0,at:58,mode:K.MODE_TURN,arg:PI/2-a,speed2:30+K.rand(s)*12});}}
          if(phase===72)K.ring(s,b.x,b.y,K.count(s,16),62,K.rand(s)*TAU,{color:K.CYAN,size:1});}},
        // 53 · 검은 그림자의 힘(떨어짐): 화면 위에서 사람 하나가 세로 한 줄로 빨라지며 떨어지고, 그것을 피해 꺾인 핸들처럼 부채가 휘어 나간다.
        p7_falling:{name:'떨어지는 사람',scene:'53',time:36,fire:function(s,t){var b=s.boss,k,i;
          if(t%56===0){var n=K.pick(s,2,3,3),cell=(W-60)/n;for(i=0;i<n;i++){var x=30+cell*(i+.2+K.rand(s)*.6);for(k=0;k<4;k++)K.spawn(s,x,-12-k*10,PI/2,36,{color:K.PURPLE,size:1,accel:150,max:180});}}
          if(t%56===28){var d=(t/56|0)%2?1:-1,m=K.count(s,11);for(i=0;i<m;i++)K.spawn(s,b.x,b.y,PI/2+(i/(m-1)-.5)*1.1,96,{color:K.WHITE,size:K.RICE,at:34,mode:K.MODE_TURN,arg:d*1.05,speed2:92});}
          if(t%42===14)K.ring(s,b.x,b.y,K.count(s,18),56,K.rand(s)*TAU,{color:K.PURPLE,size:0});}},
        // 54 · 화재경보 회로의 도구(경보음): 회전하는 경보등처럼 소리 고리가 연달아 퍼지고, 불안정한 회로라 한쪽이 끊긴 채 흔들린다. 회로선(가로 광선)이 예고 뒤 켜진다.
        p7_alarmSound:{name:'경보음',scene:'54',time:36,fire:function(s,t){var b=s.boss,i;
          if(t%22===0){var n=K.count(s,22),gap=PI/2+Math.sin(t*.011)*1.15,red=(t/22|0)%2;
            for(i=0;i<n;i++){var a=TAU*i/n+t*.003,off=Math.atan2(Math.sin(a-gap),Math.cos(a-gap));if(off<.5&&off>-.5)continue;K.spawn(s,b.x,b.y,a,70,{color:red?K.RED:K.CYAN,size:i%3?0:1});}}
          if(t%300===150)K.row(s,330+K.rand(s)*170,{width:13,warn:66,active:64,color:K.RED});}},
        // 55 중간 · 은회색 승용차의 전조등: 두 불빛(광선)이 아래를 비추다 둥글게 휘어 돌고, 빗줄기(쌀알)가 휘어 내린다.
        p7_headlight:{name:'전조등',scene:'55',time:30,fire:function(s,t){var b=s.boss;
          if(t%190===0){var out=(t/190|0)%2?-1:1;K.beam(s,b.x,b.y,PI/2-.24,{width:13,warn:70,active:110,color:K.WHITE,spin:-out*.34,follow:true});K.beam(s,b.x,b.y,PI/2+.24,{width:13,warn:70,active:110,color:K.WHITE,spin:out*.34,follow:true});}
          if(t%6===0)for(var i=0,n=K.count(s,2);i<n;i++)K.spawn(s,10+K.rand(s)*(W-20),-10,PI/2+.22,104,{color:K.CYAN,size:K.RICE,turn:-.16});
          if(t%60===30)K.ring(s,b.x,b.y,K.count(s,14),64,K.rand(s)*TAU,{color:K.WHITE,size:1});}},
        // 55 보스 1 · 한 사람을 원인으로: 사방으로 흩어진 탄이 멈춘 뒤, 붉은 표식이 가 선 한 자리로 일제히 모였다가 그 너머로 흩어진다.
        p7_onecause:{name:'한 사람을 원인으로',scene:'55',time:32,fire:function(s,t){var b=s.boss,phase=t%120,rs=s.rules.speed,i;
          if(phase===0){s.p7x=60+K.rand(s)*240;s.p7y=220+K.rand(s)*70;
            var dx=s.p7x-b.x,dy=s.p7y-b.y,D=Math.sqrt(dx*dx+dy*dy)+1;K.spawn(s,b.x,b.y,Math.atan2(dy,dx),180,{color:K.RED,size:2,accel:-(180*rs)*(180*rs)/(2*D),min:0,life:230});}
          if(phase===6||phase===26){var n=K.count(s,phase===6?26:20),v=phase===6?150:118,base=K.rand(s)*TAU,stop=(v*rs)*(v*rs)/180;
            for(i=0;i<n;i++){var a=base+TAU*i/n,px=b.x+Math.cos(a)*stop,py=b.y+Math.sin(a)*stop;
              K.spawn(s,b.x,b.y,a,v,{color:phase===6?K.CYAN:K.WHITE,size:phase===6?0:1,accel:-90,min:0,at:110-phase,mode:K.MODE_TURN,arg:Math.atan2(s.p7y-py,s.p7x-px)-a,speed2:84});}}
          if(phase===66)K.fan(s,b.x,b.y,K.count(s,3),K.aim(s,b.x,b.y),.5,112,{color:K.RED,size:K.RICE});}},
        // 55 보스 3 · 인과 고정: 세 겹 고리가 차례로 퍼져 제자리에 멈춰 서고(고정), 셋이 다 서면 한꺼번에 비틀려 풀려 나간다. 그 사이 인과의 사슬처럼 느린 나선이 이어진다.
        p7_fixed:{name:'인과 고정',scene:'55',time:34,fire:function(s,t){var b=s.boss,phase=t%210,rs=s.rules.speed,k,i;
          if(phase===0||phase===40||phase===80){k=phase/40;var n=K.count(s,16+k*4),r=60+k*50,v=Math.sqrt(2*220*r)/rs,base=K.rand(s)*TAU;
            for(i=0;i<n;i++)K.spawn(s,b.x,b.y,base+TAU*i/n,v,{color:k===0?K.CYAN:k===1?K.WHITE:K.RED,size:k===1?0:1,accel:-220,min:0,at:150-phase,mode:K.MODE_TURN,arg:k%2?.35:-.35,speed2:66});}
          if(t%8===0)for(k=0,i=K.pick(s,2,3,4);k<i;k++)K.spawn(s,b.x,b.y,t*.021+TAU*k/i,56,{color:K.CYAN,size:0});}},
        // 55 보스 4 · 집행체의 도구(신호등과 ∞ 고리): 끝과 시작이 맞붙은 ∞ 고리가 빨강·청록으로 번갈아 퍼지고, 신호등(큰 기물)이 곧게 떨어지며 뒤로 파란 구슬 꼬리를 남긴다.
        p7_endstart:{name:'끝과 시작',scene:'55',time:38,fire:function(s,t){var b=s.boss,k;
          if(t%64===0)K.shape(s,b.x,b.y,K.Shapes.lissajous(1,2,K.count(s,32)),86,Math.sin(t*.01)*.3,{color:(t/64|0)%2?K.CYAN:K.RED,size:0});
          var phase=t%110,cyc=(t/110)|0,n=K.pick(s,1,2,3);
          if(phase<=42&&phase%6===0)for(k=0;k<n;k++){var x=30+((cyc*.618+k/n)%1)*300;
            if(phase===0)K.spawn(s,x,-30,PI/2,72,{size:K.SHAPE_PROP,color:K.P.p7_signal,life:900});else K.spawn(s,x,-30,PI/2,72,{color:phase%12?K.CYAN:K.GREEN,size:phase<24?1:0,life:900});}
          if(t%110===80)K.bell(s,b.x,b.y,K.count(s,11),K.aim(s,b.x,b.y),1.6,96,.45,{color:K.WHITE,size:1});}}
      };

      /* ── 잡몹 구간 대본 ── */
      var F='p7_fragment',S='p7_shade',B='p7_bell',N='nightmare';
      var stages=[
        {scene:'52',theme:{bg:'p7_crosswalk',tint:'#0a1826',fx:'drip'},cast:[F,B],reward:{key:'p7_r52',name:'교정지'},
          waves:[
            // 젖은 횡단보도: 줄무늬처럼 한 줄씩 건너오는 기억 조각. 빨강(멈춤)과 청록(출발)이 번갈아 멈췄다 가는 고리를 놓는다.
            K.wave(function(s,t){
              if(t<1150&&t%110===0){var r=t/110;for(var i=0;i<5;i++)K.mob(s,F,44+i*68+(r%2?34:0),-20,{vy:1.6,fire:'p7stopgo',first:46+i*6,every:120,color:r%2?K.CYAN:K.RED});}
              if(t>=1180&&t<1420&&t%48===0)K.mob(s,F,60+K.rand(s)*240,-20,{vy:1.7,sway:1,fire:'p7stopgo',first:40,color:K.CYAN});
            },1500),
            // 왼쪽에서 미끄러져 들어온 차: 비스듬히 미끄러지는 줄이 빗물을 떨구고, 오래된 비상벨이 얇은 전자음을 낸다.
            K.wave(function(s,t){
              if(t<700&&t%22===0){var k=t/22;K.mob(s,F,-16,30+(k%4)*22,{vx:2.6,vy:.9,fire:'drop',first:18,every:K.pick(s,26,19,14),color:K.WHITE});}
              if(t===760)K.mob(s,B,180,-30,{stopY:118,fire:'p7beep',first:20,every:K.pick(s,80,64,52),hold:420,color:K.WHITE});
              if(t>=800&&t<1400&&t%40===0){var l=(t/40)%2;K.mob(s,F,l?30:330,-20,{vx:l?1:-1,vy:1.5,fire:'p7ink',first:40,color:K.CYAN});}
            },1500),
            // 흩어진 교정지: 기울어진 글줄처럼 내려오는 조각들이 물에 번지는 거품을 남기고, 양쪽 비상벨이 울린 뒤 젖은 도로를 따라 굽이치는 줄.
            K.wave(function(s,t){
              if(t<640&&t%80===0){var r=t/80;for(var i=0;i<4;i++)K.mob(s,F,(r%2?250:110)+(i-1.5)*46,-20-(r%2?3-i:i)*18,{vy:1.4,sway:.5,fire:'p7ink',first:50+i*8,color:K.CYAN});}
              if(t===680){K.mob(s,B,90,-30,{stopY:110,fire:'p7beep',first:20,every:K.pick(s,96,76,62),hold:400,color:K.WHITE});K.mob(s,B,270,-30,{stopY:110,fire:'p7beep',first:56,every:K.pick(s,96,76,62),hold:400,color:K.WHITE});}
              if(t>=1000&&t<1420&&t%30===0)K.mob(s,F,180+130*Math.sin(t*.03),-20,{vy:2,fire:'drop',first:24,every:K.pick(s,44,34,26),color:K.WHITE});
            },1500)],
          mid:['p7_car','blueLight','p7_wetRoad']},
        {scene:'53',theme:{bg:'p7_hotel',tint:'#2a1206',fx:'ash'},cast:[S,N],reward:{key:'p7_r53',name:'파란불'},
          waves:[
            // 새빛호텔 계단: 한 단씩 낮아지는 계단 대형으로 내려오는 그림자들이 곧게 떨어지는 탄을 놓는다.
            K.wave(function(s,t){
              if(t<1250&&t%150===0){var d=(t/150)%2?1:-1;for(var i=0;i<6;i++)K.mob(s,S,180+d*(i-2.5)*56,-20-i*26,{vy:1.6,fire:'p7fall',first:40,every:K.pick(s,70,56,46),color:K.PURPLE});}
              if(t%150===75&&t<1250)K.mob(s,N,180,-20,{vy:1.4,sway:2,swayRate:.04,fire:'aim',first:50,every:60,color:K.WHITE});
            },1500),
            // 보안실·설비실 복도와 7층 출입구 표지: 좌우 두 줄 복도로 번갈아 내려오는 악몽이 초록 부채를, 한가운데 그림자가 떨어지는 탄을.
            K.wave(function(s,t){
              if(t<1300&&t%30===0){var left=(t/30)%2===0;K.mob(s,N,left?80:280,-20,{vy:1.8,sway:.4,fire:'p7exit',first:left?36:52,color:K.GREEN});}
              if(t>=200&&t<1300&&t%120===0)K.mob(s,S,180,-20,{vy:1.3,fire:'p7fall',first:30,every:60,color:K.PURPLE});
            },1500),
            // 젖은 계단과 난간: 한 칸씩 지그재그로 내려오는 그림자, 난간처럼 가로지르는 악몽이 떨군 탄.
            K.wave(function(s,t){
              if(t<1100&&t%24===0){var k=(t/24)%12,step=k<6?k:11-k;K.mob(s,S,40+step*56,-20,{vy:2,fire:'p7fall',first:30,every:K.pick(s,60,46,38),color:K.PURPLE});}
              if(t>=300&&t<1300&&t%60===30){var l=((t/60)|0)%2===0;K.mob(s,N,l?-16:W+16,50+K.rand(s)*40,{vx:l?1.8:-1.8,vy:.2,fire:'drop',first:24,every:K.pick(s,30,22,16),color:K.RED});}
            },1500)],
          mid:['p7_shadow','p7_falling','hotel']},
        {scene:'54',theme:{bg:'p7_villa',tint:'#08241f',fx:'static'},cast:[S,B],reward:{key:'p7_r54',name:'새 부품'},
          waves:[
            // 화재경보: 양쪽 벽의 경보기가 번갈아 빨강·청록으로 울리고, 그 사이 계단 한가운데로 그림자가 내려온다.
            K.wave(function(s,t){
              if(t===0){K.mob(s,B,70,-30,{stopY:104,fire:'p7siren',first:10,every:K.pick(s,84,68,56),hold:640,color:K.RED});K.mob(s,B,290,-30,{stopY:104,fire:'p7siren',first:10+K.pick(s,42,34,28),every:K.pick(s,84,68,56),hold:640,color:K.CYAN});}
              if(t>=60&&t<1300&&t%40===0)K.mob(s,S,180+((t/40)%3-1)*40,-20,{vy:1.7,fire:'drop',first:30,every:36,color:K.CYAN});
            },1500),
            // 계단 모서리: 양쪽 위 모서리에서 번갈아 비스듬히 굴러 내려오는 그림자, 가운데 경보기.
            K.wave(function(s,t){
              if(t<1200&&t%28===0){var l=(t/28)%2===0;K.mob(s,S,l?20:340,-20,{vx:l?1.3:-1.3,vy:1.6,fire:'p7fall',first:36,every:K.pick(s,60,48,40),color:K.PURPLE});}
              if(t===600)K.mob(s,B,180,-30,{stopY:110,fire:'p7siren',first:20,every:K.pick(s,80,64,52),hold:420,color:K.RED});
            },1500),
            // 7층 공실: 일곱 칸 줄 가운데 한 칸이 비어 있다(장부에 공실로 적힌 층). 빈 칸이 줄마다 옮겨 간다.
            K.wave(function(s,t){
              if(t<1200&&t%120===0){var r=t/120,gap=(r*3)%7;for(var i=0;i<7;i++)if(i!==gap)K.mob(s,S,30+i*50,-20,{vy:1.5,fire:'p7fall',first:30+i*4,every:K.pick(s,64,52,44),color:i%2?K.RED:K.WHITE});}
            },1500)],
          mid:['p7_alarm','fireDoor','p7_alarmSound']},
        {scene:'55',theme:{bg:'p7_rooftop',tint:'#0e1630',fx:'rain'},cast:[F,S,N],reward:{key:'p7_r55',name:'이경의 기억'},
          waves:[
            // 원형으로 휘는 길: 기억 조각이 한 줄로 굽이치며 내려오고, 휘어 도는 고리를 놓는다.
            K.wave(function(s,t){
              if(t<820&&t%16===0)K.mob(s,F,180,-20,{vy:2,sway:5,swayRate:.035,fire:'p7loop',first:40+((t/16)%3)*10,color:(t/16)%2?K.CYAN:K.WHITE});
            },1000),
            // 전조등: 두 개씩 짝지어 내려오는 악몽이 아래로 빛살을 비춘다. 양옆 그림자는 떨어지는 탄.
            K.wave(function(s,t){
              if(t<860&&t%45===0){var x=70+((t/45)*97)%184;K.mob(s,N,x,-20,{vy:1.5,fire:'p7cone',first:40,every:60,color:K.WHITE});K.mob(s,N,x+36,-20,{vy:1.5,fire:'p7cone',first:40,every:60,color:K.WHITE});}
              if(t%90===60&&t<860)K.mob(s,S,(t/90|0)%2?30:330,-20,{vy:1.8,fire:'p7fall',first:30,color:K.PURPLE});
            },1000),
            // 건물과 도로가 원형으로: 그림자 여덟이 고리 대형 그대로 내려와 휘어 도는 탄을 놓는다.
            K.wave(function(s,t){
              if(t<800&&t%160===0)for(var k=0;k<8;k++){var a=TAU*k/8;K.mob(s,S,180+120*Math.cos(a),-90+55*Math.sin(a),{vy:1.6,fire:'p7loop',first:120,color:k%2?K.CYAN:K.WHITE});}
              if(t%160===80&&t<800)K.mob(s,N,180,-20,{vy:1.6,sway:1.5,fire:'ring',first:50,color:K.RED});
            },1000),
            // 같은 저녁의 시작으로: 횡단보도 줄무늬가 다시 오되 이번엔 줄마다 옆으로 밀리며, 사이사이 그림자가 떨어진다.
            K.wave(function(s,t){
              if(t<860&&t%95===0){var r=t/95;for(var i=0;i<5;i++)K.mob(s,r%2?N:F,44+i*68+(r%2?34:0),-20,{vy:1.7,vx:r%2?.6:-.6,fire:'p7stopgo',first:46+i*5,color:r%2?K.CYAN:K.RED});}
              if(t%95===48&&t<860)K.mob(s,S,180,-20,{vy:2,fire:'p7fall',first:30,every:50,color:K.PURPLE});
            },1000)],
          mid:['p7_car','p7_headlight'],
          boss:['executor','p7_onecause','rooftopLoop','p7_fixed','p7_endstart']}
      ];
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
