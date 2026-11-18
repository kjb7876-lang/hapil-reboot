/* 보스 페이즈 수학 패턴(사용자 11-17: "페이즈마다 패턴변화가 확실하고 보스들끼리도 확실한 차별점", "수학·시각디자인 요소를 패턴화").
 * 첫 일반 카드는 원래 리듬으로 진행하고, 후속 카드에서는 원래 발사와 장면별 도형을 번갈아 사용한다.
 * arcade-encounter-phases-v43.js의 배정표가 장면 번호·인물·중간보스 여부로 각 카드의 도형을 정한다.
 * 도형에는 배우의 두 색과 구슬·쌀알탄을 사용한다. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./arcade-encounter-phases-v43.js'));
  else root.HapilArcadePhases=factory(root.HapilEncounterPhases);
})(typeof globalThis!=='undefined'?globalThis:this,function(encounters){
  'use strict';
  var TAU=Math.PI*2,GOLD=Math.PI*(3-Math.sqrt(5)),PHI=(Math.sqrt(5)+1)/2,FIB=[3,5,8,13];
  // 도형 목록. 이름은 화면 부제로도 쓴다.
  var KINDS=[
    {id:'phyllotaxis',name:'황금각 해바라기',every:5},
    {id:'rose',name:'장미 곡선 꽃잎',every:84},
    {id:'lissajous',name:'리사주 직조',every:6},
    {id:'polygram',name:'별 다각형 {n/k}',every:110},
    {id:'archimedes',name:'아르키메데스 나선',every:6},
    {id:'sierpinski',name:'시에르핀스키 낙하',every:5},
    {id:'sine',name:'사인 파도 장막',every:96},
    {id:'moire',name:'모아레 이중 고리',every:90},
    {id:'fibfan',name:'피보나치 부채',every:60},
    {id:'spiro',name:'스피로그래프 궤도',every:60},
    {id:'ripple',name:'동심 물결',every:60},
    {id:'goldrain',name:'황금비 빗줄기',every:60}
  ];
  KINDS=KINDS.concat(encounters.kinds);
  var byId=Object.fromEntries(KINDS.map(function(k){return [k.id,k];}));
  function plan(key,count){
    var ids=encounters.stages[key];
    if(!ids||ids.length!==count-1)throw new Error('Missing boss phase score for '+key+' ('+count+' cards)');
    return [null].concat(ids.map(function(id){
      if(!byId[id])throw new Error('Unknown boss phase '+id+' in '+key);
      return byId[id];
    }));
  }
  function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  function params(actor,j){var h=hash(actor+':'+j);return {arms:3+(h%4),dir:(h>>3)&1?1:-1,k:2+((h>>>4)%4),k2:1+((h>>>6)%3),speed:.9+((h>>>8)%5)*.06};}
  // Four attacks mark fixed launch geometry, then commit to it. World ticks prevent a stale
  // warning from firing late if a laser, a signature or a card change interrupted its phrase.
  var CAST_PERIOD=60,CAST_WARN=24;
  function markCast(id,s,K,P,wave){
    var W=K.W,H=K.H,previous=s.patternCue,down=Math.PI/2;
    var cue={kind:id,seg:s.seg,start:s.tick,until:s.tick+CAST_WARN,x:s.boss.x,y:s.boss.y,angle:down};
    var side=(wave%2?-1:1)*P.dir;
    if(id==='goldrain'){
      cue.x=Math.max(10,Math.min(W-10,s.player.x));
      cue.y=32;
      var span=W-20;
      cue.xs=[cue.x,10+(cue.x-10+span/PHI)%span,10+(cue.x-10+span/(PHI*PHI))%span];
    }else if(id==='fibfan'){
      var echo=wave%2===1&&previous&&previous.kind===id&&previous.seg===s.seg;
      cue.open=!!echo;
      cue.aimX=echo?previous.aimX:s.player.x;
      cue.aimY=echo?previous.aimY:s.player.y;
      cue.angle=Math.atan2(cue.aimY-cue.y,cue.aimX-cue.x);
      cue.gapAngle=.135;
    }else if(id==='spiro'){
      // Successive launch points trace a hypotrochoid. The slingshot sweeps across the
      // lower field instead of leaving the orbiting point's whole stream in one narrow column.
      var th=wave*GOLD,r=10+P.k*5,R=48,d=8+P.k2*6;
      cue.x=Math.max(26,Math.min(W-26,cue.x+(R-r)*Math.cos(th)+d*Math.cos((R-r)*th/r)));
      cue.y=Math.max(42,cue.y+(R-r)*Math.sin(th)-d*Math.sin((R-r)*th/r));
      cue.fromX=W*(.5-.34*side);cue.toX=W-cue.fromX;cue.targetY=H*.86;
      cue.angle=Math.atan2(cue.targetY-cue.y,cue.fromX-cue.x);
      cue.endAngle=Math.atan2(cue.targetY-cue.y,cue.toX-cue.x);
    }else{
      cue.x=W*(side>0?.23:.77);cue.y=H*(.22+.03*(wave%3));
      cue.targetY=H*.86;
      var exitX=W*(side>0?.65:.35);
      cue.angle=Math.atan2(cue.targetY-cue.y,exitX-cue.x);
      cue.gapAngle=.083;
    }
    s.patternCue=cue;
  }
  function castFormation(id,s,t,K,P){
    var beat=t%CAST_PERIOD,wave=Math.floor(t/CAST_PERIOD);
    if(!beat){markCast(id,s,K,P,wave);return;}
    var q=s.patternCue;
    if(!q||q.seg!==s.seg||q.kind!==id||s.tick!==q.start+beat)return;
    var c=K.colors;
    function shot(x,y,a,v,color){K.spawn(s,x,y,a,v*P.speed,{size:0,color:color,formation:true});}
    if(id==='spiro'){
      var elapsed=beat-CAST_WARN;
      if(elapsed<0||elapsed>24||elapsed%4)return;
      var aimX=q.fromX+(q.toX-q.fromX)*elapsed/24;
      shot(q.x,q.y,Math.atan2(q.targetY-q.y,aimX-q.x),150,c[(elapsed/4)%2]);
      return;
    }
    if(beat!==CAST_WARN)return;
    var i,n,a;
    if(id==='goldrain'){
      // The first shaft stamps the position shown in its cue. The other two use golden sections.
      for(i=0;i<q.xs.length;i++){
        shot(q.xs[i],q.y,q.angle,170,c[i%2]);
        shot(q.xs[i],q.y-20,q.angle,170,c[i%2]);
      }
    }else if(id==='fibfan'){
      n=FIB[wave%FIB.length];
      for(i=0;i<n;i++){
        if(q.open){
          var left=Math.floor(n/2);
          a=i<left?q.angle-q.gapAngle-(left-1-i)*.09:q.angle+q.gapAngle+(i-left)*.09;
        }else a=q.angle+(i-(n-1)/2)*.10;
        shot(q.x,q.y,a,148,c[i%2]);
      }
    }else{
      // Sample the player-facing arc by its projected positions. A full ring from a high
      // centre spent most of its bullets beyond the side walls before reaching this row.
      n=s.difficulty==='gentle'?13:s.compact?15:19;
      for(i=0;i<n;i++){
        a=Math.atan2(q.targetY-q.y,K.W*(i+.5)/n-q.x);
        if(Math.abs(a-q.angle)>=q.gapAngle)shot(q.x,q.y,a,138,c[wave%2]);
      }
      for(i=0;i<5;i++)shot(q.x,q.y,Math.PI+i*Math.PI/4,92,c[(wave+1)%2]);
    }
  }
  /* 한 틱 발사. K: 엔진이 넘기는 {spawn,count,colors:[c1,c2],W,H,density}. 난수 없이 t·페이즈 변수만으로 정해 같은 시드에서 같은 모양이다. */
  function fire(kind,s,t,K,seg){
    if(kind.emit)return encounters.fire(kind,s,t,K);
    var b=s.boss,P=params(seg.actor,seg.phaseNo||1),W=K.W,H=K.H,dens=Math.max(.5,s.density/2.6),c=K.colors,x=b.x,y=b.y,i,n,a,sp,u;
    function sp1(px,py,ang,speed,col,o){K.spawn(s,px,py,ang,speed,Object.assign({color:col,size:0,formation:true},o||{}));}
    var e=kind.every,fireNow=t%e===0;
    switch(kind.id){
      case'phyllotaxis':if(fireNow){n=t/e;sp1(x,y,n*GOLD*P.dir,76*P.speed,c[n%2]);sp1(x,y,n*GOLD*P.dir+Math.PI,76*P.speed,c[(n+1)%2]);}break;
      case'rose':if(fireNow){n=Math.round(30*dens);u=(t/e)*.35;for(i=0;i<n;i++){a=TAU*i/n+u;sp=34+120*Math.abs(Math.cos(P.k*(a-u)/2*1));sp1(x,y,a,sp*P.speed,c[i%2]);}}break;
      case'lissajous':if(fireNow){var ph=t*.045;sp1(W/2+Math.sin(ph*(P.k))*W*.36,Math.max(40,y-10)+Math.cos(ph*(P.k2+1))*28,Math.PI/2+Math.sin(ph)*.18,88*P.speed,c[(t/e)%2|0]);}break;
      case'polygram':if(fireNow){n=P.arms+4;var skip=P.k>=n/2?2:P.k,rot=(t/e)*.37*P.dir;for(var q=0;q<n;q++){var a0=-Math.PI/2+rot+TAU*q/n,a1=-Math.PI/2+rot+TAU*((q+skip)%n)/n,len=Math.round(6*dens)+2;for(i=0;i<len;i++){u=(i+.5)/len;var px=x+(Math.cos(a0)*(1-u)+Math.cos(a1)*u)*46,py=y+(Math.sin(a0)*(1-u)+Math.sin(a1)*u)*46,ang=Math.atan2(py-y,px-x);sp1(px,py,ang,62*P.speed,c[q%2]);}}}break;
      case'archimedes':if(fireNow){n=t/e;for(i=0;i<P.arms;i++)sp1(x,y,TAU*i/P.arms+n*.21*P.dir,66*P.speed+((n%8)*5),c[i%2]);}break;
      case'sierpinski':if(fireNow){var V=[[W*.18,y+24],[W*.82,y+24],[W/2,y+24+W*.5]],pt=s.__sp||(s.__sp={x:W/2,y:y+60,seed:hash(seg.actor)}),vert;pt.seed=(pt.seed*1664525+1013904223)>>>0;vert=V[pt.seed%3];pt.x=(pt.x+vert[0])/2;pt.y=(pt.y+vert[1])/2;sp1(pt.x,Math.max(30,pt.y-40),Math.PI/2,64*P.speed,c[(pt.seed>>>3)%2]);}break;
      case'sine':if(fireNow){n=Math.round(18*dens)+4;var lane=W/2+Math.sin(t/e*1.3)*W*.3;for(i=0;i<n;i++){var xx=(i+.5)*W/n;if(Math.abs(xx-lane)<34)continue;sp1(xx,Math.max(30,y-6)+Math.sin(i*.9+t*.02)*14,Math.PI/2,70*P.speed,c[i%2]);}}break;
      case'moire':if(fireNow){var n1=14+P.arms,n2=n1+2,r=(t/e)*.2;for(i=0;i<n1;i++)sp1(x,y,TAU*i/n1+r,82*P.speed,c[0]);for(i=0;i<n2;i++)sp1(x,y,TAU*i/n2-r*1.3,82*P.speed,c[1]);}break;
      case'fibfan':case'spiro':case'ripple':case'goldrain':castFormation(kind.id,s,t,K,P);break;
    }
  }
  return Object.freeze({KINDS:KINDS,plan:plan,params:params,fire:fire,TAU:TAU});
});
