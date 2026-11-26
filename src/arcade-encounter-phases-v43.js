/* Extra phrases for specific encounters in docs/v43/BOSS-PHASE-DESIGN.md.
 * All launch points stay in the upper field. The authored first card runs on its own clock. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HapilEncounterPhases=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  var stages=Object.create(null),kinds=[];
  function register(stage,midActor,midPhrases,mainActor,mainPhrases){
    stages[(stage-1)+'|'+midActor+'|1']=midPhrases.split(' ');
    stages[(stage-1)+'|'+mainActor+'|0']=mainPhrases.split(' ');
  }

  // 사용자 11-20 스테이지 합치기: 번호는 지금 52스테이지의 번호(10 루시퍼·27 고블린 두목·29 불면귀는 합쳐진 여섯 페이즈, 50 한리안과 백이온 → 51 교주 → 52 사몽각성 교주).
  // Stage numbers follow the selection screen. Both lists begin at P2; each word is one card.
  register(1, 'mb_01', 'phyllotaxis', 'p1_tree', 'petals braid gates');
  register(2, 'mb_02', 'branch', 'violet', 'wings rails phyllotaxis spiro lissajous mirror archimedes ripple sweep');
  register(3, 'mb_03', 'branch', 'p1_horn', 'sine rails ripple mirror phyllotaxis gates lissajous seal echo');
  register(4, 'mb_04', 'fibfan', 'p1_chaser', 'rails goldrain gates');
  register(5, 'mb_05', 'rails', 'p1_comrade', 'arch ripple echo');
  register(6, 'mb_06', 'sweep', 'p1_gate', 'columns ratchet archimedes rails gates');
  register(7, 'mb_07', 'ratchet', 'balrog', 'sweep branch sierpinski echo moire rails spiro gates ripple');
  register(8, 'mb_08', 'echo', 'mask', 'columns rails polygram gates mirror');
  register(9, 'mb_09_1', 'fixed', 'p1_staff', 'gates rails rose echo wings');
  register(10, 'mb_10', 'rails', 'lucifer', 'wings sweep goldrain seal fixed gates spiro mirror echo');
  register(11, 'mb_13', 'ratchet', 'p2_demons', 'sine ripple seal');
  register(12, 'mb_14', 'spiro', 'p2_belphegor', 'stairs gates sine goldrain fibfan rails mirror');
  register(13, 'mb_15', 'polygram', 'p2_leviathan', 'lissajous rails archimedes mirror sine branch echo');
  register(14, 'mb_16', 'gates', 'p2_beelzebub', 'sweep rails lissajous arch archimedes ratchet frame');
  register(15, 'mb_17', 'rose', 'asmodeus', 'rails mirror phyllotaxis fixed lissajous sweep archimedes spiro sine seal trail');
  register(16, 'mb_18', 'echo', 'p2_greed', 'rails ratchet ripple gates phyllotaxis mirror seal');
  register(17, 'mb_19', 'branch', 'p2_mammon', 'slant gates goldrain fixed rose ratchet echo');
  register(18, 'mb_20', 'echo', 'p2_wrath', 'gates rails spiro sweep goldrain mirror branch');
  register(19, 'mb_21', 'spiro', 'pride', 'ratchet rails moire gates spiro mirror stairs');
  register(20, 'p2_chairman', 'ratchet', 'p2_core', 'branch columns sierpinski echo seal');
  register(21, 'mb_24', 'mirror', 'p3_legion', 'columns rails polygram stairs frame');
  register(22, 'mb_25', 'fixed', 'p3_rampart', 'mirror stairs rose rails gates');
  register(23, 'p3_defense', 'fixed', 'controller', 'gates rails lissajous mirror archimedes stairs echo');
  register(24, 'mb_27', 'sweep', 'controller', 'columns fixed phyllotaxis rails mirror');
  register(25, 'mb_28', 'mirror', 'p3_body', 'echo gates ripple rails branch');
  register(26, 'controller', 'mirror', 'p3_gate', 'rails seal fibfan gates ripple columns echo');
  register(27, 'mb_32', 'spiro', 'goblin', 'wings mirror echo ripple braid archimedes sine sweep fibfan gates rose');
  register(28, 'mb_33', 'branch', 'p4_knight', 'slant rails sierpinski mirror moire fixed spiro echo goldrain stairs sweep');
  register(29, 'mb_35', 'mirror', 'insomnia', 'rails echo gates trail rose fixed polygram ripple sierpinski moire triangle');
  register(30, 'mb_37', 'ratchet', 'p5_cult', 'wings echo stairs');
  register(31, 'mb_38', 'ratchet', 'p5_archon', 'mirror rails sine');
  register(32, 'mb_39', 'columns', 'p5_common', 'ratchet ripple seal');
  register(33, 'p5_upper', 'ratchet mirror echo', 'p5_grand', 'gates columns fibfan rails stairs');
  register(34, 'mb_41', 'echo', 'p5_furnace', 'ratchet seal rails');
  register(35, 'mb_42', 'ripple', 'p5_neuron', 'branch rails columns');
  register(36, 'mb_43', 'stairs', 'p5_keeper', 'ripple echo ratchet');
  register(37, 'mb_44', 'archimedes', 'p5_rings', 'rails gates seal');
  register(38, 'mb_45', 'ratchet', 'arbelia', 'frame echo ripple rails phyllotaxis mirror lissajous wings sweep');
  register(39, 'mb_46', 'columns', 'siren', 'mirror rails goldrain sweep rose echo polygram fixed sierpinski gates ratchet');
  register(40, 'p6_demons', 'ratchet', 'chief', 'triangle echo spiro rails goldrain sweep wings');
  register(41, 'mb_49', 'sweep', 'p6_demons', 'rails echo wings');
  register(42, 'p6_nightmare_captain', 'slant', 'chief', 'sine echo sierpinski rails moire mirror branch');
  register(43, 'mb_52', 'fixed', 'p7_car', 'rails gates slant');
  register(44, 'mb_53', 'echo', 'p7_shadow', 'fixed slant columns');
  register(45, 'mb_54', 'branch', 'p7_alarm', 'mirror gates echo');
  register(46, 'p7_car', 'columns', 'executor', 'fixed echo phyllotaxis rails lissajous ratchet seal');
  register(47, 'mb_56', 'seal', 'p8_chip', 'columns rails branch');
  register(48, 'mb_57', 'wings', 'p8_collective', 'ripple echo fibfan mirror seal');
  register(49, 'mb_58', 'seal', 'p8_brainwashed_elder', 'triangle echo ratchet mirror frame');
  register(50, 'p8_ion', 'mirror', 'rian', 'fixed wings sierpinski rails moire gates triangle');
  register(51, 'mb_59', 'mirror', 'cultist', 'archimedes echo seal');
  register(52, 'mb_61', 'triangle', 'cultist', 'sine branch polygram rails sierpinski mirror moire echo spiro fixed goldrain sweep seal');

  var down=Math.PI/2,turnAfter=2; // Shared MODE_TURN in the projectile simulation.
  function add(id,name,every,emit){kinds.push({id:id,name:name,every:every,emit:emit});}
  function fire(kind,s,t,K){
    if(t%kind.every!==0)return;
    var beat=Math.floor(t/kind.every),b=s.boss;
    function shot(x,y,angle,speed,second,options){
      K.spawn(s,x,y,angle,speed,Object.assign({color:K.colors[second?1:0],size:3,formation:true},options));
    }
    kind.emit(shot,beat,b.x,b.y,K.W,s);
  }

  add('branch','갈라지는 가지',30,function(shot,beat,x,y){
    // Two roots share a stem, then bend in opposite directions 40 ticks after leaving it.
    for(var side=-1;side<=1;side+=2){
      shot(x+side*3,y,down,108,side>0,{mode:turnAfter,at:40,arg:side*Math.PI/10,speed2:108,keepShot:beat===0});
    }
  });
  add('rails','나란한 두 궤적',16,function(shot,beat,x,y,w){
    var offset=Math.floor(beat/3)%2?12:-12;
    shot(w*.32+offset,y,down,126,false);
    shot(w*.68+offset,y,down,126,true);
  });
  add('braid','엇갈려 땋는 궤적',20,function(shot,beat,x,y,w){
    // Two steady rails plus two shots that swing out and bend back, so the lanes look braided but stay readable.
    var offset=Math.floor(beat/3)%2?12:-12;
    shot(w*.32+offset,y,down,118,false);
    shot(w*.68+offset,y,down,118,true);
    for(var side=-1;side<=1;side+=2){
      shot(x+side*4,y,down+side*.55,100,side>0,{mode:turnAfter,at:26,arg:-side*.55,speed2:104});
    }
  });
  add('petals','피어나는 꽃잎',36,function(shot,beat,x,y){
    // Five-way fan; the outer pair curls inward after leaving, like petals closing.
    for(var i=-2;i<=2;i++){
      var edge=Math.abs(i)===2;
      shot(x,y,down+i*.2,edge?92:104,i%2!==0,edge?{mode:turnAfter,at:30,arg:-Math.sign(i)*.3,speed2:100}:undefined);
    }
  });
  add('slant','엇갈린 사선비',25,function(shot,beat,x,y,w){
    var tilt=Math.floor(beat/3)%2?.18:-.18;
    for(var i=1;i<=3;i++)shot(w*i/4,54,down+tilt,132,i===2);
  });
  add('gates','맞물린 두 기둥',24,function(shot,beat,x,y,w){
    var edge=[.17,.25,.33,.25][beat%4]*w;
    for(var i=0;i<2;i++){
      shot(edge-i*17,y,down,118,false);
      shot(w-edge+i*17,y,down,118,true);
    }
  });
  add('stairs','한 칸씩 열리는 문',54,function(shot,beat,x,y,w){
    // Two adjacent openings. Consecutive rows always share one clear column.
    var gap=[1,2,3,4,3,2][beat%6];
    for(var col=0;col<8;col++){
      if(col===gap||col===gap+1)continue;
      shot((col+.5)*w/8,y,down,106,col<gap);
    }
  });
  add('columns','번갈아 켜는 열',30,function(shot,beat,x,y,w){
    for(var col=beat%2;col<7;col+=2)shot((col+.5)*w/7,48,down,132,beat%2);
  });
  add('wings','두 날개의 호',40,function(shot,beat,x,y){
    for(var side=-1;side<=1;side+=2){
      for(var i=0;i<4;i++)shot(x+side*30,y+8,down+side*(.14+i*.12),96+i*10,side>0);
    }
  });
  add('mirror','거울 속의 실',18,function(shot,beat,x,y,w){
    var offset=(.08+.24*(1+Math.cos(beat*Math.PI/5))/2)*w;
    shot(w/2-offset,y,down+.055,115,false);
    shot(w/2+offset,y,down-.055,115,true);
  });
  add('echo','한 박 뒤의 잔상',32,function(shot,beat,x,y,w){
    var side=beat%2?1:-1;
    var origin=w*(.5+side*.22);
    for(var i=-2;i<=2;i++)shot(origin,y,down+side*(.25+.105*i),118,beat%2);
  });
  add('sweep','되짚는 검로',12,function(shot,beat,x,y){
    var step=beat%12,index=step<=6?step:12-step;
    shot(x,y,down+(index-3)*Math.PI/18,134,step>=6);
  });
  add('seal','홈이 열린 봉인',54,function(shot,beat,x,y){
    // Leave out one sector. The opening advances by exactly one sector each time.
    var gap=beat%5-2;
    for(var i=-5;i<=5;i++){
      if(i===gap||i===gap+1)continue;
      shot(x,y,down+i*Math.PI/18,116,i<gap);
    }
  });
  add('arch','언덕의 윤곽',52,function(shot,beat,x,y,w){
    var gap=beat%2?2:-2;
    for(var i=-4;i<=4;i++){
      if(i===gap)continue;
      shot(w/2+i*w/11,y+i*i*2,down,105,i>0);
    }
  });
  add('ratchet','걸리는 시곗니',34,function(shot,beat,x,y){
    // Each tooth travels on a fixed ray; rotate the array only between volleys.
    var rotation=beat*Math.PI/6;
    for(var i=0;i<6;i++){
      var angle=down+rotation+i*Math.PI/3;
      for(var j=0;j<2;j++)shot(x,y,angle,102+j*20,i%2);
    }
  });
  add('fixed','양끝의 조준점',34,function(shot,beat,x,y,w,s){
    var ox=beat%2?w*.73:w*.27,aim=Math.atan2(s.player.y-y,s.player.x-ox);
    for(var i=-1;i<=1;i++)shot(ox,y,aim+i*.12,128,beat%2);
  });
  add('frame','열린 액자',46,function(shot,beat,x,y){
    for(var i=-2;i<=2;i++){
      shot(x+i*18,y-18,down,110,false);
      // The bottom edge and alternate side are open.
      if(i<2)shot(x+(beat%2?-38:38),y+i*10,down,110,true);
    }
  });
  add('trail','되밟는 발자국',22,function(shot,beat,x,y,w){
    var index=[0,1,2,1][beat%4],ox=w*[.28,.5,.72][index];
    for(var i=-1;i<=1;i++)shot(ox,y+index*8,down+i*.11,121,index===1);
  });
  add('triangle','엇박의 두 삼각형',54,function(shot,beat,x,y){
    // Alternating triangles make the six-point seal without closing both of its edges at once.
    var turn=beat%2?Math.PI:0;
    for(var corner=0;corner<3;corner++){
      var a=turn-down+corner*2*Math.PI/3,b=a+2*Math.PI/3;
      for(var i=0;i<3;i++){
        var f=i/3;
        shot(x+42*((1-f)*Math.cos(a)+f*Math.cos(b)),y+36*((1-f)*Math.sin(a)+f*Math.sin(b)),down,116,beat%2);
      }
    }
  });

  return {stages:stages,kinds:kinds,fire:fire};
});
