/* Boss entrance rhythm: a game adaptation, not timings reconstructed from a video.
 * Replaces the first ordinary attack of each cinematic boss. Named spells retain
 * their authored attacks and blinking glyphs. No bullets are erased for a lane.
 * 8 seconds: three short fans, fixed laser warnings, two short beams, then rest.
 */
(function(root,factory){
  var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HapilArcadeBossRhythm=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var CYCLE=480,FAN_AT=[0,18,36],LASER_AT=84,LASER_WARN=60,LASER_ACTIVE=24;
  var FAMILIES=['cross','fork','parallel','gate','offset-cross','slant'];
  // Existing props and narrative motifs only. A blank prop uses the actor's own
  // two bullet colours; it does not invent a new canonical weapon or character.
  var DEFINITIONS={
    p1_tree:['가지 갈라짐','',1],violet:['보라검 교차','sword-violet',0],p1_horn:['좌우 뿔','',1],p1_chaser:['핏빛 추격','',4],p1_comrade:['엇박자 잔상','',2],p1_gate:['문기둥','',3],
    balrog:['대검 화염','sword-balrog',0],mask:['가면의 깃털','feather',4],p1_staff:['주사기 병렬','p1_syringe',2],lucifer:['타락의 파편','p1_shard',5],
    p2_demons:['악마의 무리','',4],p2_belphegor:['미룬 시간','tissue,p2_sofa',3],p2_leviathan:['갈라진 유리칼','p2_knife',4],p2_beelzebub:['주방의 탐식','p2_pan,cleaver',1],asmodeus:['붉은 매혹','heel',0],
    p2_greed:['수렴하는 거래','money',0],p2_mammon:['금화 눈보라','p2_goldcoin',5],p2_wrath:['불을 지른 분노','p2_flame',1],pride:['전극과 신호','p2_electrode',2],p2_chairman:['기계다리의 박자','',5],p2_core:['일곱 기억의 예측','tissue,p2_knife,p2_pan,heel,money,p2_flame,p2_electrode',4],
    p3_legion:['강철 분대','p3_casing',2],p3_rampart:['성벽의 틈','',3],controller:['명령의 창','p3_lance',5],p3_body:['육체의 코어','p3_core',1],p3_gate:['기억파편의 문','p3_shard',3],
    goblin:['두목의 칼','p4_sword,cleaver',4],p4_knight:['엇갈린 검','p4_sword',0],insomnia:['잠들지 않는 눈','',2],
    p5_cult:['순환의 교단','',5],p5_archon:['육각 수문','',0],p5_common:['톱니 점사','gear',2],p5_grand:['오벨리스크','obelisk',3],p5_furnace:['열기와 톱니','gear',1],p5_neuron:['첨탑의 신경','spire',5],p5_keeper:['망각의 비석','obelisk',4],p5_rings:['명령 고리','p5_ring',2],arbelia:['초승달 꽃잎','crescent',1],siren:['초승달 음파','p5_hand,crescent',5],
    chief:['쌍날과 창','twin-blade,p6_lance,p6_spear',0],p6_demons:['성 밖의 불씨','',4],p7_car:['두 전조등','p7_sedan',2],p7_shadow:['뒤늦은 그림자','',4],p7_alarm:['세 번의 경보','',3],executor:['파란 신호','p7_signal,crescent',5],
    p8_chip:['회로 점군','',3],p8_collective:['분산된 자아','',1],p8_brainwashed_elder:['교주의 명령','',0],cultist:['봉합과 회귀','p8_stitch,sword-balrog,cleaver,gear,crescent,sword-violet,twin-blade,heel',4],rian:['황청의 합일','hexagram',0]
  };
  var IDS=Object.keys(DEFINITIONS),firstCache=typeof WeakMap==='function'?new WeakMap():null;
  function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function key(g){return g.stage+'|'+g.actor+'|'+(g.mid?1:0);}
  function firstCards(A){
    var segments=A.SEGMENTS,cached=firstCache&&firstCache.get(segments);if(cached)return cached;
    var out=Object.create(null);segments.forEach(function(g,i){if(g.kind==='card'&&!g.spell&&own(DEFINITIONS,g.actor)&&(!A.isCinematicBoss||A.isCinematicBoss(g.actor,g.mid))&&!own(out,key(g)))out[key(g)]=i;});
    if(firstCache)firstCache.set(segments,out);return out;
  }
  function handles(s,seg,A){
    if(!s||s.rhythm!==true||!seg||seg.kind!=='card'||seg.spell||!own(DEFINITIONS,seg.actor)||!A||!A.SEGMENTS)return false;
    if(A.isCinematicBoss&&!A.isCinematicBoss(seg.actor,seg.mid))return false;
    return firstCards(A)[key(seg)]===s.seg;
  }
  function describe(actor,A){
    if(!own(DEFINITIONS,actor)||!A||!A.ACTORS||!own(A.ACTORS,actor))return null;
    var d=DEFINITIONS[actor],a=A.ACTORS[actor],sig=A.SIGNATURES&&A.SIGNATURES[actor]||{},props=[],missing=[];
    if(d[1])d[1].split(',').forEach(function(k){var found=false;for(var i=0;i<A.PROPS.length;i++)if(A.PROPS[i].key===k){props.push(i);found=true;break;}if(!found)missing.push(k);});
    return {actor:actor,name:a.name,motif:d[0],family:FAMILIES[d[2]],familyIndex:d[2],glyph:sig.glyph||'ring',colors:[a.c1,a.c2],props:props,propKeys:props.map(function(i){return A.PROPS[i].key;}),missingProps:missing,direction:sig.spin||1,index:IDS.indexOf(actor),cycleTicks:CYCLE};
  }
  function phase(t,s){
    var local=((t%CYCLE)+CYCLE)%CYCLE,warn=Math.round(LASER_WARN*(s&&s.rules?s.rules.warn:1));
    return local<=FAN_AT[2]?'fan':local<LASER_AT?'settle':local<LASER_AT+warn?'warn':local<LASER_AT+warn+LASER_ACTIVE?'beam':'rest';
  }
  function laserLines(s,p,K,cycle){
    var W=K.WIDTH||K.W||360,H=K.HEIGHT||K.H||640,b=s.boss,px=clamp(s.player.x,42,W-42),py=clamp(s.player.y,H*.62,H*.88),bx=clamp(b.x,80,W-80),by=clamp(b.y,72,240),dir=p.direction*(cycle%2?-1:1),a=Math.atan2(py-by,px-bx),lines=[];
    function line(x,y,tx,ty){lines.push({x:x,y:y,angle:Math.atan2(ty-y,tx-x)});}
    if(p.family==='cross'){line(bx-64,by,px+28,py);line(bx+64,by,px-28,py);}
    else if(p.family==='fork'){line(bx-16,by,px-106,py);line(bx+16,by,px+106,py);}
    else if(p.family==='parallel'){lines.push({x:bx-48,y:by,angle:a},{x:bx+48,y:by,angle:a});}
    else if(p.family==='gate'){line(28,by,70+dir*18,py);line(W-28,by,W-70+dir*18,py);}
    else if(p.family==='offset-cross'){line(bx-72,by-18,px+52*dir,py);line(bx+72,by+18,px-52*dir,py);}
    else {lines.push({x:bx-52,y:by,angle:Math.PI/2+dir*.26},{x:bx+52,y:by,angle:Math.PI/2+dir*.26});}
    return lines;
  }
  function fire(s,t,K){
    var local=((t%CYCLE)+CYCLE)%CYCLE,cycle=Math.floor(t/CYCLE),out={phase:phase(t,s),emitted:0,lasers:0},burst=FAN_AT.indexOf(local);
    if(burst<0&&local!==LASER_AT)return out;
    var p=describe(s.boss.actor,K),easy=s.difficulty==='gentle';if(!p)return out;
    if(burst>=0){
      var prop=p.props.length?p.props[(cycle*3+burst)%p.props.length]:-1,n=prop>=0?(easy?3:5):(easy?4:7),b=s.boss,
        center=Math.atan2(s.player.y-b.y,s.player.x-b.x)+p.direction*(burst-1)*.08,spread=prop>=0?1.8:1.65,speed=64+(p.index%4)*4,
        ox=(p.family==='parallel'||p.family==='offset-cross')?(burst-1)*20:0;
      // Every later volley has the same speed: it cannot overtake and close the
      // preceding fan's opening. Aim is sampled once at launch, never tracked.
      for(var i=0;i<n;i++){
        K.spawn(s,b.x+ox,b.y,center+(i/(n-1)-.5)*spread,speed,{size:prop>=0?5:(p.familyIndex%2?0:3),color:prop>=0?prop:p.colors[(i+burst)%2],spin:prop>=0?p.direction*.018:0,life:600});out.emitted++;
      }
    }
    if(local===LASER_AT){
      var lines=laserLines(s,p,K,cycle),before=s.lasers?s.lasers.length:0;
      lines.forEach(function(l,i){K.beam(s,l.x,l.y,l.angle,{width:8,warn:LASER_WARN,active:LASER_ACTIVE,color:p.colors[i%2],spin:0,follow:false,burst:false});});
      out.lasers=s.lasers?s.lasers.length-before:lines.length;
    }
    return out;
  }
  return {ids:IDS.slice(),families:FAMILIES.slice(),CYCLE_TICKS:CYCLE,FAN_AT:FAN_AT.slice(),LASER_AT:LASER_AT,LASER_WARN:LASER_WARN,LASER_ACTIVE:LASER_ACTIVE,describe:describe,handles:handles,fire:fire,phase:phase};
});
