/* 합일 v43 · 제8부 — 사이비 합일몽세. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다.
 * 마지막 부라 게임에서 가장 어렵다. 56~59는 길, 60은 배신자 둘, 61은 최종 보스 교주.
 * 61의 교주 패턴은 앞선 부 보스들의 힘(실·시계·신호등·불·광선)을 한 사람의 뜻 아래에서 하나씩 되부른다. */
(function(root){
  'use strict';
  var part={part:8,
    actors:{
      p8_chip:{name:'전자 칩',c1:4,c2:0},
      p8_collective:{name:'집단 자아',c1:2,c2:8},
      p8_lauren:{name:'라우렌 쌍둥이 기사',c1:8,c2:0},
      p8_ion:{name:'백이온',c1:4,c2:8}
    },
    mobs:{
      p8_believer:{hp:7,r:14,score:300},
      p8_rose:{hp:6,r:13,score:300},
      p8_priest:{hp:100,r:22,score:5000,elite:true}
    },
    props:[{key:'p8_shield',radius:16,upright:true},{key:'p8_stitch',radius:12}],
    build:function(K){
      var W=K.W,TAU=K.TAU,PI=Math.PI,RED=K.RED,PURPLE=K.PURPLE,CYAN=K.CYAN,GREEN=K.GREEN,YELLOW=K.YELLOW,WHITE=K.WHITE;
      var rand=K.rand,count=K.count,pick=K.pick,aim=K.aim,spawn=K.spawn,ring=K.ring,fan=K.fan,bell=K.bell,shape=K.shape,Shapes=K.Shapes,beam=K.beam,column=K.column,slots=K.slots,mob=K.mob,wave=K.wave;
      // 거꾸로 선 십자가: 긴 쪽이 위, 가로대가 아래쪽에 있다(단위 좌표, +y가 아래). 한 번만 만든다.
      var INVERTED=[0,-1,0,-.8,0,-.6,0,-.4,0,-.2,0,.15,0,.45,0,.75,-.6,.45,-.4,.45,-.2,.45,.2,.45,.4,.45,.6,.45];
      // 지나온 보스들의 무기(망령). 61에서 되불러 온다.
      var GHOSTS=[K.P['sword-balrog'],K.P.cleaver,K.P.gear,K.P.crescent,K.P['sword-violet'],K.P['twin-blade'],K.P.heel];
      var LANES5=[52,116,180,244,308];

      var mobFire={
        // 전자 칩: 작은 네모 하나
        p8chip:function(s,m){shape(s,m.x,m.y,Shapes.polygon(4,2),70,m.shots*.4+PI/4,{color:m.color,size:0});},
        // 흑장미: 세 잎 장미
        p8petal:function(s,m){shape(s,m.x,m.y,Shapes.rose(3,count(s,9)),64,aim(s,m.x,m.y),{color:m.color,size:0});},
        // 삼중자아: 세 갈래 쌀알
        p8trio:function(s,m){fan(s,m.x,m.y,3,aim(s,m.x,m.y),pick(s,1.1,.9,.8),92,{color:m.color,size:K.RICE});},
        // 교단 사제: 거꾸로 선 십자가 무늬와 종 모양 부채꼴을 번갈아
        p8sermon:function(s,m){if(m.shots%2===0)shape(s,m.x,m.y,INVERTED,74,0,{color:m.color,size:1});else bell(s,m.x,m.y,count(s,9),aim(s,m.x,m.y),1.5,90,.45,{color:m.color,size:0});}
      };

      var spells={
        // 56 — 하나로 묶인 악몽
        p8_neuralNet:{name:'거대한 신경망',scene:'56',fire:function(s,t){var b=s.boss,k;
          // 신경망: 칩에서 뻗은 신경 줄기가 두세 번 갈라지며 그물처럼 퍼진다.
          if(t%96===0){var n=count(s,3),base=PI/2+(rand(s)-.5)*.5;for(k=0;k<n;k++)spawn(s,b.x,b.y,base+(k-(n-1)/2)*.7,96,{color:CYAN,size:1,at:36,mode:K.MODE_BRANCH,arg:2,gen:pick(s,2,3,3),speed2:66});}
          if(t%96===48)ring(s,b.x,b.y,count(s,14),56,rand(s)*TAU,{color:RED,size:0});
          // 전자 칩(도구): 네모난 칩 무늬가 영웅 쪽으로 던져져 커진다.
          if(t%48===24)shape(s,b.x,b.y+10,Shapes.polygon(4,Math.max(2,count(s,2))),58,aim(s,b.x,b.y)+PI/4,{color:CYAN,size:0});}},
        // 57 — 교주가 기다리는 전쟁
        p8_antichrist:{name:'적그리스도 소환',scene:'57',fire:function(s,t){var b=s.boss,k;
          // 소환진: 꼭짓점이 아래를 향한 거꾸로 선 별이 퍼지고, 별의 다섯 끝에서 큰 탄이 터진다.
          if(t%100===0){shape(s,b.x,b.y,Shapes.star(5,.38,Math.max(2,count(s,2))),70,PI,{color:RED,size:0});
            for(k=0;k<5;k++)spawn(s,b.x,b.y,PI/2+TAU*k/5,70,{color:PURPLE,size:2,at:80,mode:K.MODE_SPLIT,arg:count(s,5),speed2:54});}
          if(t%100===50)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.5,90,.45,{color:WHITE,size:1});}},
        p8_armageddon:{name:'아마겟돈',scene:'57',fire:function(s,t){var b=s.boss,k,phase=t%130;
          // 최후의 전쟁: 좌우 두 진영의 탄 줄이 옆으로 나갔다가 일제히 꺾여 한가운데에서 엇갈린다.
          if(phase<48&&phase%12===0){var n=count(s,4);for(k=0;k<n;k++){var turn=2.1+k*.06;
            spawn(s,b.x,b.y,-.12,118,{color:RED,size:0,at:14+k*9,mode:K.MODE_TURN,arg:turn,speed2:70});
            spawn(s,b.x,b.y,PI+.12,118,{color:YELLOW,size:0,at:14+k*9,mode:K.MODE_TURN,arg:-turn,speed2:70});}}
          if(t%130===90)ring(s,b.x,b.y,count(s,12),52,rand(s)*TAU,{color:PURPLE,size:1});}},
        p8_greaterOne:{name:'더 큰 하나',scene:'57',fire:function(s,t){var b=s.boss,k;
          // 개인이 하나로: 보스를 둘러싼 자리마다 작은 탄이 한 점을 향해 모였다가 그대로 지나쳐 흩어진다.
          if(t%56===0){var n=count(s,13),cx=b.x,cy=b.y+150,off=t*.013;
            for(k=0;k<n;k++){var a=off+TAU*k/n,x=b.x+Math.cos(a)*86,y=b.y+Math.sin(a)*70;spawn(s,x,y,Math.atan2(cy-y,cx-x),82,{color:WHITE,size:0});}}
          if(t%112===84)ring(s,b.x,b.y,count(s,10),60,rand(s)*TAU,{color:PURPLE,size:2});}},
        // 58 — 돌아오는 현실의 기억
        p8_rearranged:{name:'다시 배열한 전장',scene:'58',fire:function(s,t){var b=s.boss,q=Shapes.polygon(4,Math.max(2,count(s,3)));
          // 두 성벽: 쌍둥이 자리에서 거울처럼 돈 네모가 퍼지다가, 한꺼번에 직각으로 꺾여 다시 배열된다.
          if(t%96===0){var turn=t*.004;shape(s,b.x-70,b.y,q,66,turn,{color:WHITE,size:1,at:64,mode:K.MODE_TURN,arg:PI/2,speed2:62});shape(s,b.x+70,b.y,q,66,-turn,{color:RED,size:1,at:64,mode:K.MODE_TURN,arg:-PI/2,speed2:62});}
          // 성가퀴: 톱니 모양 성벽 한 줄이 위에서 내려온다. 빈 문은 한 칸씩만 옮겨 간다.
          if(t%96===48){s.lane=Math.max(0,Math.min(13,(s.lane===undefined?7:s.lane)+Math.floor(rand(s)*3)-1));for(var i=0;i<16;i++){if(i>=s.lane&&i<s.lane+3)continue;spawn(s,W/16*(i+.5),i%2?-10:-30,PI/2,58,{color:i%2?WHITE:RED,size:i%2?0:1});}}}},
        p8_straightStory:{name:'하나의 직선 서사',scene:'58',fire:function(s,t){var b=s.boss,k;
          // 흩어진 기억: 사방으로 흩어진 고리가 멈춘 뒤, 모두 같은 방향(아래)으로 줄지어 이어진다.
          if(t%110===0){var n=count(s,12),base=rand(s)*TAU;
            for(k=0;k<n;k++){var a=base+TAU*k/n;spawn(s,b.x,b.y,a,130,{color:YELLOW,size:1,accel:-120,min:0,at:84,mode:K.MODE_TURN,arg:PI/2-a,speed2:60});spawn(s,b.x,b.y,a+PI/n,80,{color:WHITE,size:0,accel:-74,min:0,at:84,mode:K.MODE_TURN,arg:PI/2-a-PI/n,speed2:60});}}
          if(t%110===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,104,{color:RED,size:K.RICE});}},
        // 59 — 처음 세웠던 목표
        p8_pastFuture:{name:'과거와 미래',scene:'59',fire:function(s,t){var b=s.boss,k;
          // 뒤섞인 시간: 시계 방향과 반대 방향으로 휘는 두 줄기가 서로 꼬이며 퍼진다.
          if(t%9===0){var arms=pick(s,2,2,3);for(k=0;k<arms;k++){var a=t*.02+TAU*k/arms;spawn(s,b.x,b.y,a,76,{color:RED,size:0,turn:.5});spawn(s,b.x,b.y,-a+PI,76,{color:WHITE,size:0,turn:-.5});}}
          if(t%120===60)bell(s,b.x,b.y,count(s,12),aim(s,b.x,b.y),1.6,92,.45,{color:YELLOW,size:1});}},
        // 60 — 사몽의 문턱
        p8_orderWall:{name:'질서의 방벽',scene:'60',fire:function(s,t){var b=s.boss,i;
          // 질서의 방벽: 방패 벽이 칸을 맞춰 줄지어 내려온다. 빈 칸은 한 줄에 한 칸씩만 옮겨 간다.
          if(t%72===0){s.lane=Math.max(0,Math.min(6,(s.lane===undefined?3:s.lane)+Math.floor(rand(s)*3)-1));for(i=0;i<7;i++){if(i===s.lane)continue;spawn(s,W/7*(i+.5),-30,PI/2,56,{size:K.SHAPE_PROP,color:K.P.p8_shield,life:900});}}
          if(t%72===36)bell(s,b.x,b.y,count(s,13),aim(s,b.x,b.y),1.5,88,.45,{color:CYAN,size:1});
          if(t%72===60)ring(s,b.x,b.y,count(s,14),50,rand(s)*TAU,{color:WHITE,size:0});}},
        p8_wholeDeath:{name:'온전한 죽음',scene:'60',fire:function(s,t){var b=s.boss,phase=t%260,i;
          // 멎는 심장: 맥박이 뛰는 줄이 내려오다가, 줄마다 맥이 낮아지고 끝내 평평한 줄이 된다.
          if(phase<200&&phase%40===0){var beat=phase/40,amp=(4-beat)*9,step=pick(s,24,20,18),cells=Math.floor(W/step),peak=4+Math.floor(rand(s)*(cells-8));
            s.lane=Math.max(0,Math.min(cells-3,(s.lane===undefined?Math.floor(cells/2):s.lane)+Math.floor(rand(s)*5)-2));
            for(i=0;i<cells;i++){if(i>=s.lane&&i<s.lane+3)continue;var d=i-peak,lag=d===0?amp:d===1?-amp*.6:d===-1?amp*.35:0;
              spawn(s,step*(i+.5),-12,PI/2,60-lag,{color:beat<4?YELLOW:WHITE,size:0,at:60,mode:K.MODE_TURN,arg:0,speed2:60});}}
          if(t%130===65){ring(s,b.x,b.y,count(s,8),58,rand(s)*TAU,{color:CYAN,size:1});ring(s,W-b.x,b.y,count(s,8),58,rand(s)*TAU,{color:YELLOW,size:1});}}},
        p8_threshold:{name:'사몽의 문턱',scene:'60',fire:function(s,t){var b=s.boss,phase=t%150,k;
          // 문턱: 퍼지던 고리가 멈춰 둥근 벽이 되고, 잠시 뒤 바깥으로 한꺼번에 흩어진다. 그 사이 두 사람이 겨눈다.
          if(phase===0||phase===20){var n=count(s,22),base=rand(s)*TAU;for(k=0;k<n;k++)spawn(s,b.x,b.y,base+TAU*k/n,phase?120:170,{color:(t/150)%2?CYAN:YELLOW,size:1,accel:-130,min:0,at:120,mode:K.MODE_TURN,arg:0,speed2:74});}
          if(phase>=40&&phase<110&&phase%14===0){fan(s,b.x,b.y,pick(s,1,2,2),aim(s,b.x,b.y),.18,112,{color:YELLOW,size:K.RICE});fan(s,W-b.x,b.y,pick(s,1,2,2),aim(s,W-b.x,b.y),.18,112,{color:CYAN,size:K.RICE});}}},
        p8_goldenCross:{name:'황금 역십자가',scene:'60',fire:function(s,t){var b=s.boss,i;
          // 황금 역십자가: 십자가가 줄지어 똑바로 내려오고, 보스에게서 거꾸로 선 금빛 십자가 무늬가 커진다.
          if(t%96===0){s.lane=Math.max(0,Math.min(5,(s.lane===undefined?2:s.lane)+Math.floor(rand(s)*3)-1));for(i=0;i<6;i++){if(i===s.lane)continue;spawn(s,W/6*(i+.5),-30,PI/2,62,{size:K.SHAPE_PROP,color:K.P.cross,life:900});}}
          if(t%48===24){shape(s,b.x-44,b.y,INVERTED,70,0,{color:YELLOW,size:1});if(s.difficulty==='hell'||t%96===24)shape(s,b.x+44,b.y,INVERTED,58,0,{color:WHITE,size:0});}
          if(t%pick(s,24,20,12)===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,PI/2,64+rand(s)*30,{color:YELLOW,size:K.RICE});}},
        // 61 — 교주의 사몽. 중간: 공간과 시간. 보스: 부활 → 세쌍둥이의 기록 → 사망의 글자 → 망령 → 사몽
        p8_warpSpace:{name:'공간을 왜곡',scene:'61',fire:function(s,t){var b=s.boss,k;
          // 공간 왜곡: 고리의 탄마다 다른 세기로 휘어, 둥근 고리가 일그러진 꽃처럼 퍼진다.
          if(t%60===0){var n=count(s,20),base=rand(s)*TAU,sign=(t/60)%2?1:-1;for(k=0;k<n;k++)spawn(s,b.x,b.y,base+TAU*k/n,84,{color:sign>0?RED:WHITE,size:1,turn:Math.sin(k*TAU*3/n)*.9*sign});}
          if(t%60===30)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.4,108,{color:PURPLE,size:K.RICE});}},
        p8_stopTime:{name:'시간을 멈추며',scene:'61',fire:function(s,t){var b=s.boss,phase=t%260,k,j;
          // 시간 정지(시계): 열두 눈금 방향으로 퍼지던 탄이 한꺼번에 멈추고, 바늘(광선)이 지나간 뒤 다시 움직인다.
          if(phase===0){var m=pick(s,2,3,3),base=-PI/2+rand(s)*.3;for(k=0;k<12;k++)for(j=0;j<m;j++){var v=60+j*34;spawn(s,b.x,b.y,base+TAU*k/12,v,{color:j%2?WHITE:CYAN,size:j?0:1,accel:-v*s.rules.speed/.9,min:0,at:150,mode:K.MODE_TURN,arg:0,speed2:56});}}
          if(phase===40){var a=aim(s,b.x,b.y)+1.1,dir=(t/260)%2?-1:1;beam(s,b.x,b.y,dir>0?a:a-2.2,{width:12,warn:70,active:110,color:CYAN,spin:dir*.42,follow:true});}
          if(phase===200)ring(s,b.x,b.y,count(s,14),62,rand(s)*TAU,{color:RED,size:1});
          // 초 눈금: 작은 고리가 쉬지 않고 째깍거리며 퍼진다.
          if(t%26===13)ring(s,b.x,b.y,count(s,9),48,t*.05,{color:WHITE,size:0});}},
        p8_blackNerve:{name:'검은 신경선',scene:'61',fire:function(s,t){var b=s.boss,phase=t%200,k;
          // 부활(실): 교주에게서 아래로 늘어진 검은 신경선(광선)과, 실을 따라 미끄러지는 구슬, 꿰매는 바늘땀.
          if(phase===0||phase===100){var off=phase?.27:0,n=pick(s,2,3,3);for(k=0;k<n;k++){var a=PI/2+(k-(n-1)/2)*.62+off*((t/200)%2?1:-1);beam(s,b.x,b.y,a,{width:10,warn:70,active:80,color:PURPLE,follow:false});
            for(var j=0;j<count(s,4);j++)spawn(s,b.x,b.y,a,44+j*12,{color:PURPLE,size:0,life:640});}}
          if(t%70===35)fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),1.2,84,{size:K.SHAPE_PROP,color:K.P.p8_stitch,spin:.14,turn:(t/70)%2?.3:-.3});
          if(t%50===10)ring(s,b.x,b.y,count(s,12),54,rand(s)*TAU,{color:RED,size:0});}},
        p8_triplets:{name:'세쌍둥이의 기록',scene:'61',fire:function(s,t){var b=s.boss,k;
          // 세 번: 세모 꼭짓점 세 자리에서 세 빛깔 고리가 차례로 피어나 서로 겹친다(둘이 아니라 셋).
          if(t%30===0){var i=(t/30)%3,a=-PI/2+TAU*i/3+t*.004,x=b.x+Math.cos(a)*54,y=b.y+Math.sin(a)*40;ring(s,x,y,count(s,14),70,t*.02,{color:[RED,WHITE,CYAN][i],size:i===1?1:0});}
          if(t%90===75)fan(s,b.x,b.y,3,aim(s,b.x,b.y),.6,100,{color:YELLOW,size:K.RICE});}},
        p8_deathText:{name:'사망의 글자',scene:'61',fire:function(s,t){var b=s.boss,k;
          // 신호등: 붉은 큰 탄이 멈췄다가 둘로 갈라지고, 갈라진 조각이 다시 갈라진다(사망이 사몽으로). 푸른 고리가 출발 신호.
          if(t%110===0){var n=count(s,3);for(k=0;k<n;k++)spawn(s,b.x,b.y,PI/2+(k-(n-1)/2)*.55,150,{color:RED,size:2,accel:-150,min:0,at:70,mode:K.MODE_BRANCH,arg:2,gen:pick(s,2,3,3),speed2:72});}
          if(t%110===55)ring(s,b.x,b.y,count(s,17),64,rand(s)*TAU,{color:GREEN,size:1});
          if(t%110===85)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.4,110,{color:CYAN,size:K.RICE});}},
        p8_ghosts:{name:'코스믹 보스들의 망령',scene:'61',fire:function(s,t){var b=s.boss,k;
          // 망령(불): 지나온 보스들의 무기가 실에 매달린 듯 위에서 떨어지고, 교주는 불씨 부채꼴을 뿌린다.
          if(t%56===0){var xs=slots(s,pick(s,2,3,4),W,24);for(k=0;k<xs.length;k++)spawn(s,xs[k],-30,PI/2+(rand(s)-.5)*.3,66,{size:K.SHAPE_PROP,color:GHOSTS[(t/56+k)%GHOSTS.length],spin:.08,life:900});}
          if(t%56===28)bell(s,b.x,b.y,count(s,14),aim(s,b.x,b.y),1.8,96,.45,{color:RED,size:1});
          if(t%6===0)for(k=0;k<count(s,1);k++)spawn(s,b.x+(rand(s)-.5)*60,b.y,PI/2+(rand(s)-.5)*1.6,46+rand(s)*30,{color:YELLOW,size:0});}}
      };

      /* ── 잡몹 구간 대본. 장면의 길 느낌에 맞춰 스테이지마다 다르게. ── */
      // 56 회로 줄기: 다섯 회로선을 따라 신호처럼 이어 내려오고, 양 모서리에서 45° 사선으로 끼어든다.
      function circuitTrace(s,t){
        if(t<600&&t%18===0){var i=t/18,lane=[0,1,2,3,4,3,2,1][i%8];mob(s,'p8_believer',LANES5[lane],-20,{vy:1.8,fire:'p8chip',first:44,color:CYAN});}
        if(t>=120&&t<720&&t%120===0){mob(s,'leech',-16,30,{vx:1.6,vy:1.6,fire:'aim',first:40,color:RED});mob(s,'leech',W+16,30,{vx:-1.6,vy:1.6,fire:'aim',first:40,color:RED});}
      }
      // 56 칩 격자: 엇갈린 다섯 줄 격자가 천천히 내려오며 네모를 뿌린다.
      function chipGrid(s,t){
        if(t<600&&t%100===0){var odd=(t/100)%2;for(var k=0;k<(odd?4:5);k++)mob(s,'p8_believer',(odd?76:40)+k*70,-20,{vy:1.1,fire:'p8chip',first:50,every:pick(s,120,100,90),color:odd?RED:CYAN});}
      }
      // 57 합쳐지는 줄: 양쪽 위 모서리에서 짝지어 들어와 한가운데에서 엇갈린다.
      function mergingPairs(s,t){
        if(t<660&&t%30===0){var v=1.2+(t%90)/90;mob(s,'p8_rose',20,-20,{vx:v,vy:1.5,fire:'p8petal',first:46,color:PURPLE});mob(s,'p8_rose',W-20,-20,{vx:-v,vy:1.5,fire:'p8petal',first:46,color:WHITE});}
      }
      // 57 고리 대형: 여덟 신도가 둥근 고리 모양 그대로 내려온다(여럿이 하나의 고리).
      function circleFormation(s,t){
        if(t<720&&t%180===0)for(var k=0;k<8;k++){var a=TAU*k/8;mob(s,'p8_believer',180+Math.cos(a)*112,-20-(1+Math.sin(a))*52,{vy:1.3,fire:'ring',first:70+k*4,every:90,color:k%2?WHITE:PURPLE});}
        if(t===380)mob(s,'p8_priest',180,-30,{stopY:110,fire:'p8sermon',first:20,every:96,hold:300,color:PURPLE});
      }
      // 58 계단 대형: 성의 계단처럼 한 칸씩 옆으로 비켜 내려오고, 여덟 칸마다 방향을 바꾼다.
      function staircase(s,t){
        if(t<640&&t%14===0){var i=t/14,k=i%8,up=Math.floor(i/8)%2;mob(s,'nightmare',up?W-40-k*40:40+k*40,-20,{vy:1.5,fire:k%4===3?'aim':'drop',first:32,every:k%4===3?0:36,color:up?RED:WHITE});}
      }
      // 58 거울 쌍: 겹친 성. 좌우가 거울처럼 같은 길을 흔들리며 내려온다.
      function mirrorPairs(s,t){
        if(t<680&&t%40===0){var x=50+rand(s)*100;mob(s,'p8_believer',x,-20,{vy:1.6,sway:1.2,swayRate:.05,fire:'p8trio',first:48,every:72,color:WHITE});mob(s,'p8_believer',W-x,-20,{vy:1.6,sway:-1.2,swayRate:.05,fire:'p8trio',first:48,every:72,color:RED});}
      }
      // 58 두 겹의 성: 왼쪽 성과 오른쪽 성의 줄이 서로 다른 빠르기로 겹쳐 내려온다.
      function twoLayers(s,t){
        if(t<660&&t%26===0)mob(s,'nightmare',90+(rand(s)-.5)*50,-20,{vy:1.2,fire:'ring',first:60,color:WHITE});
        if(t<660&&t%26===13)mob(s,'p8_believer',270+(rand(s)-.5)*50,-20,{vy:2.1,fire:'aim',first:34,color:RED});
      }
      // 59 좁은 접근로: 좌우 벽을 따라 번갈아 빠르게 내려온다.
      function corridor(s,t){
        if(t<680&&t%22===0){var left=(t/22)%2===0;mob(s,'leech',left?26:W-26,-20,{vx:left?.3:-.3,vy:2,fire:'aim',first:36,every:50,color:left?RED:YELLOW});}
        if(t>=200&&t<600&&t%100===0)mob(s,'p8_rose',180,-20,{vy:1.4,sway:1.6,swayRate:.04,fire:'p8petal',first:50,every:80,color:YELLOW});
      }
      // 59 V자 대형: 코어를 향한 쐐기 모양 대열.
      function chevrons(s,t){
        if(t<720&&t%120===0)for(var k=-3;k<=3;k++)mob(s,'p8_rose',180+k*42,-20-Math.abs(k)*26,{vy:1.6,fire:'p8petal',first:50+Math.abs(k)*6,color:k?YELLOW:RED});
      }
      // 59 코어 수호: 가운데 사제 둘이 서고, 그 양옆으로 신도가 이어 내려온다.
      function coreGuard(s,t){
        if(t===40){mob(s,'p8_priest',110,-30,{stopY:104,fire:'p8sermon',first:20,every:104,hold:320,color:RED});mob(s,'p8_priest',250,-30,{stopY:104,fire:'p8sermon',first:72,every:104,hold:320,color:WHITE});}
        if(t>=60&&t<700&&t%34===0){var left=(t/34)%2===0;mob(s,'p8_believer',left?30+rand(s)*40:W-30-rand(s)*40,-20,{vy:1.8,fire:'p8trio',first:40,color:CYAN});}
      }
      // 60 셋씩: 신도가 세모꼴 셋씩 짝지어 내려온다(삼중자아).
      function trios(s,t){
        if(t<720&&t%60===0){var x=60+rand(s)*240;mob(s,'p8_believer',x,-20,{vy:1.5,fire:'p8trio',first:40,color:YELLOW});mob(s,'p8_believer',x-26,-46,{vy:1.5,fire:'drop',first:40,every:40,color:YELLOW});mob(s,'p8_believer',x+26,-46,{vy:1.5,fire:'drop',first:40,every:40,color:YELLOW});}
      }
      // 60 세 수확자: 사제 셋이 나란히 서서 번갈아 쏘고, 그 뒤로 거머리가 떨어진다.
      function threeHarvesters(s,t){
        if(t===0)for(var k=0;k<3;k++)mob(s,'p8_priest',70+k*110,-30-k*10,{stopY:k===1?128:100,fire:'p8sermon',first:20+k*36,every:pick(s,132,120,112),hold:360,color:[YELLOW,WHITE,CYAN][k]});
        if(t>=440&&t<820&&t%40===0)mob(s,'leech',30+rand(s)*300,-20,{vy:1.7,fire:'drop',first:30,every:50,color:CYAN});
      }
      // 60 삼중 고리: 세 줄의 흑장미가 흔들리며 함께 내려온다.
      function tripleRoses(s,t){
        if(t<720&&t%90===0)for(var k=0;k<3;k++)mob(s,'p8_rose',60+k*120,-20,{vy:1.4,sway:k===1?-1:1,swayRate:.045,fire:'p8petal',first:44+k*8,every:70,color:[YELLOW,RED,YELLOW][k]});
      }
      // 60 수확 행렬: 왼쪽 위에서 오른쪽 아래로, 그다음 반대로 비스듬히 가로지른다.
      function harvestSweep(s,t){
        if(t<400&&t%22===0)mob(s,'p8_believer',-16,20+rand(s)*60,{vx:1.5,vy:1.3,fire:'aim',first:30,every:60,color:CYAN});
        if(t>=430&&t<830&&t%22===0)mob(s,'p8_believer',W+16,20+rand(s)*60,{vx:-1.5,vy:1.3,fire:'aim',first:30,every:60,color:YELLOW});
      }
      // 61 나선 진입: 이 부의 모든 잡몹이 황금각 자리로 번갈아 들어온다.
      function spiralEntry(s,t){
        if(t<700&&t%20===0){var i=t/20,kind=['p8_rose','p8_believer','leech'][i%3];mob(s,kind,180+150*Math.sin(i*K.GOLDEN_ANGLE),-20,{vy:1.8,sway:.5,fire:['p8petal','p8trio','aim'][i%3],first:44,color:[RED,WHITE,PURPLE][i%3]});}
      }
      // 61 코어 방벽: 신도 여섯이 한 줄 벽을 이뤄 내려온다. 벽의 빈 칸은 한 칸씩만 옮겨 간다.
      function coreWall(s,t){
        if(t<720&&t%110===0){s.lane=Math.max(0,Math.min(5,(s.lane===undefined?2:s.lane)+Math.floor(rand(s)*3)-1));for(var k=0;k<6;k++){if(k===s.lane)continue;mob(s,'p8_believer',30+k*60,-20,{vy:1,fire:'drop',first:40,every:70,color:RED});}}
        if(t===480)mob(s,'p8_priest',180,-30,{stopY:96,fire:'p8sermon',first:20,every:100,hold:300,color:RED});
      }
      // 61 망령의 행렬: 지나온 길의 잡몹들이 하얗게 바랜 채 다시 내려온다.
      function ghostParade(s,t){
        if(t<720&&t%26===0){var i=t/26,kind=['spider','ember','drone','mobgoblin','wolf','collector','slime','nightmare'][i%8];mob(s,kind,40+((i*97)%280),-20,{vy:1.6,sway:.8,swayRate:.05,fire:i%4===3?'ring':'aim',first:42,every:64,color:WHITE});}
      }
      // 61 마지막 돌격: 뱀처럼 굽이치는 줄과, 양옆에 서는 사제 둘.
      function lastCharge(s,t){
        if(t<720&&t%16===0)mob(s,'leech',180+Math.sin(t*.045)*140,-20,{vy:2.2,fire:t%48===0?'aim':'drop',first:30,color:PURPLE});
        if(t===300){mob(s,'p8_priest',80,-30,{stopY:112,fire:'p8sermon',first:20,every:110,hold:280,color:WHITE});mob(s,'p8_priest',280,-30,{stopY:112,fire:'p8sermon',first:75,every:110,hold:280,color:RED});}
      }

      var stages=[
        {scene:'56',theme:{bg:'p8_circuit',tint:'#0a1a2e',fx:'static'},cast:['p8_believer','leech','p8_priest'],reward:{key:'p8_egochip',name:'전자 칩'},
          waves:[wave(circuitTrace,900),wave(chipGrid,840),K.waveDives({kind:'leech',fire:'p8chip',color:K.CYAN},{kind:'p8_priest',fire:'p8sermon',color:K.RED},860)],
          mid:['p8_chip','p8_neuralNet','boundNightmare']},
        {scene:'57',theme:{bg:'p8_collective',tint:'#1c0f26',fx:'motes'},cast:['p8_rose','p8_believer','p8_priest'],reward:{key:'p8_trace',name:'자아 흔적'},
          waves:[wave(mergingPairs,860),wave(circleFormation,900),K.waveColumns({kind:'p8_rose',fire:'p8petal',color:K.PURPLE},{kind:'p8_priest',fire:'p8sermon',color:K.WHITE},860)],
          mid:['p8_collective','p8_antichrist','p8_armageddon','p8_greaterOne']},
        {scene:'58',theme:{bg:'p8_castle',tint:'#2a1420',fx:'ash'},cast:['nightmare','p8_believer'],reward:{key:'p8_hando',name:'환도'},
          waves:[wave(staircase,900),wave(mirrorPairs,900),wave(twoLayers,860)],
          mid:['p8_lauren','p8_rearranged','returning','p8_straightStory']},
        {scene:'59',theme:{bg:'p8_approach',tint:'#200a1e',fx:'sparks'},cast:['leech','p8_rose','p8_believer','p8_priest'],reward:{key:'p8_union',name:'합일 회로'},
          waves:[wave(corridor,860),wave(chevrons,900),wave(coreGuard,900),wave(trios,840)],
          mid:['cultist','twoGoals','p8_pastFuture']},
        {scene:'60',theme:{bg:'p8_harvest',tint:'#1f1a08',fx:'dust'},cast:['p8_believer','p8_priest','leech','p8_rose'],reward:{key:'p8_goldcross',name:'황금 역십자가'},
          waves:[wave(threeHarvesters,900),wave(tripleRoses,860),wave(harvestSweep,900),wave(circleFormation,900)],
          mid:['p8_ion','p8_orderWall'],boss:['rian','traitors','p8_wholeDeath','p8_threshold','p8_goldenCross']},
        {scene:'61',theme:{bg:'p8_core',tint:'#2a0808',fx:'embers'},cast:['p8_rose','p8_believer','leech','p8_priest','spider','ember','drone','mobgoblin','wolf','collector','slime','nightmare'],reward:{key:'p8_triplets',name:'세쌍둥이의 기록'},
          waves:[wave(spiralEntry,900),wave(coreWall,900),wave(ghostParade,900),wave(lastCharge,900)],
          mid:['cultist','p8_warpSpace','p8_stopTime'],boss:['cultist','p8_blackNerve','p8_triplets','p8_deathText','p8_ghosts','samong']}
      ];
      // 시간: 뒤로 갈수록 길게. 최종 보스는 마지막 패턴까지 버틸 시간을 넉넉히.
      spells.p8_orderWall.time=28;
      spells.p8_wholeDeath.time=32;spells.p8_threshold.time=32;spells.p8_goldenCross.time=36;
      spells.p8_warpSpace.time=30;spells.p8_stopTime.time=30;
      spells.p8_blackNerve.time=34;spells.p8_triplets.time=34;spells.p8_deathText.time=36;spells.p8_ghosts.time=36;
      return {spells:spells,mobFire:mobFire,stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
