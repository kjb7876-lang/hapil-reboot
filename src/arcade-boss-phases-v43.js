/* 보스 페이즈 수학 패턴(사용자 11-17: "페이즈마다 패턴변화가 확실하고 보스들끼리도 확실한 차별점", "수학·시각디자인 요소를 패턴화").
 * 한 보스가 가진 카드(패턴)를 PHASE 1..N 으로 부르고, 2페이즈부터 카드마다 다른 수학 도형 탄막을 기존 공격 위에 한 겹 얹는다.
 * 보스마다 도형 배정표가 달라(보스 번호로 소수 간격 순환) 어느 두 보스도 같은 페이즈에 같은 도형을 쓰지 않고, 한 보스 안에서도 같은 도형이 반복되지 않는다.
 * 새 탄 재료는 만들지 않는다: 보스 자신의 색 두 가지와 둥근 탄만 쓴다(인주색 금지·십자가 금지 규칙 유지). */
(function(root,factory){
  var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HapilArcadePhases=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var TAU=Math.PI*2,GOLD=Math.PI*(3-Math.sqrt(5)),PHI=(Math.sqrt(5)+1)/2,FIB=[1,1,2,3,5,8,13];
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
    {id:'fibfan',name:'피보나치 부채',every:70},
    {id:'spiro',name:'스피로그래프 궤도',every:7},
    {id:'ripple',name:'동심 물결',every:100},
    {id:'goldrain',name:'황금비 빗줄기',every:8}
  ];
  var N=KINDS.length;
  // 보스 번호 k, 페이즈 j(0부터): 종류 = (k*5 + j*7 + floor(k/N)*3) mod N. 5와 7이 12와 서로소라서 한 보스의 인접 페이즈·같은 번호 보스끼리 겹치지 않는다.
  function kindIndex(k,j){return ((k*5+j*7+Math.floor(k/N)*3)%N+N)%N;}
  var order=[];function setOrder(list){order=list.slice();}
  function bossIndex(actor){var i=order.indexOf(actor);if(i<0){order.push(actor);i=order.length-1;}return i;}
  function plan(actor,count){var k=bossIndex(actor),out=[],used={},j,idx,guard;for(j=0;j<count;j++){idx=kindIndex(k,j);guard=0;while(used[idx]&&guard++<N)idx=(idx+1)%N;used[idx]=1;out.push(KINDS[idx]);}return out;}
  function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  function params(actor,j){var h=hash(actor+':'+j);return {arms:3+(h%4),dir:(h>>3)&1?1:-1,k:2+((h>>4)%4),k2:1+((h>>6)%3),speed:.9+((h>>8)%5)*.06};}
  /* 한 틱 발사. K: 엔진이 넘기는 {spawn,count,colors:[c1,c2],W,H,density}. 난수 없이 t·페이즈 변수만으로 정해 같은 시드에서 같은 모양이다. */
  function fire(kind,s,t,K,seg){
    var b=s.boss,P=params(seg.actor,seg.phaseNo||1),W=K.W,H=K.H,dens=Math.max(.5,s.density/2.6),c=K.colors,x=b.x,y=b.y,i,n,a,sp,u;
    function sp1(px,py,ang,speed,col,o){K.spawn(s,px,py,ang,speed,Object.assign({color:col,size:0},o||{}));}
    var e=kind.every,fireNow=t%e===0;
    switch(kind.id){
      case'phyllotaxis':if(fireNow){n=t/e;sp1(x,y,n*GOLD*P.dir,76*P.speed,c[n%2]);sp1(x,y,n*GOLD*P.dir+Math.PI,76*P.speed,c[(n+1)%2]);}break;
      case'rose':if(fireNow){n=Math.round(30*dens);u=(t/e)*.35;for(i=0;i<n;i++){a=TAU*i/n+u;sp=34+120*Math.abs(Math.cos(P.k*(a-u)/2*1));sp1(x,y,a,sp*P.speed,c[i%2]);}}break;
      case'lissajous':if(fireNow){var ph=t*.045;sp1(W/2+Math.sin(ph*(P.k))*W*.36,Math.max(40,y-10)+Math.cos(ph*(P.k2+1))*28,Math.PI/2+Math.sin(ph)*.18,88*P.speed,c[(t/e)%2|0]);}break;
      case'polygram':if(fireNow){n=P.arms+4;var skip=P.k>=n/2?2:P.k,rot=(t/e)*.37*P.dir;for(var q=0;q<n;q++){var a0=-Math.PI/2+rot+TAU*q/n,a1=-Math.PI/2+rot+TAU*((q+skip)%n)/n,len=Math.round(6*dens)+2;for(i=0;i<len;i++){u=(i+.5)/len;var px=x+(Math.cos(a0)*(1-u)+Math.cos(a1)*u)*46,py=y+(Math.sin(a0)*(1-u)+Math.sin(a1)*u)*46,ang=Math.atan2(py-y,px-x);sp1(px,py,ang,62*P.speed,c[q%2]);}}}break;
      case'archimedes':if(fireNow){n=t/e;for(i=0;i<P.arms;i++)sp1(x,y,TAU*i/P.arms+n*.21*P.dir,66*P.speed+((n%8)*5),c[i%2]);}break;
      case'sierpinski':if(fireNow){var V=[[W*.18,y+24],[W*.82,y+24],[W/2,y+24+W*.5]],pt=s.__sp||(s.__sp={x:W/2,y:y+60,seed:hash(seg.actor)}),vert;pt.seed=(pt.seed*1664525+1013904223)>>>0;vert=V[pt.seed%3];pt.x=(pt.x+vert[0])/2;pt.y=(pt.y+vert[1])/2;sp1(pt.x,Math.max(30,pt.y-40),Math.PI/2,64*P.speed,c[(pt.seed>>3)%2]);}break;
      case'sine':if(fireNow){n=Math.round(18*dens)+4;var lane=W/2+Math.sin(t/e*1.3)*W*.3;for(i=0;i<n;i++){var xx=(i+.5)*W/n;if(Math.abs(xx-lane)<34)continue;sp1(xx,Math.max(30,y-6)+Math.sin(i*.9+t*.02)*14,Math.PI/2,70*P.speed,c[i%2]);}}break;
      case'moire':if(fireNow){var n1=14+P.arms,n2=n1+2,r=(t/e)*.2;for(i=0;i<n1;i++)sp1(x,y,TAU*i/n1+r,82*P.speed,c[0]);for(i=0;i<n2;i++)sp1(x,y,TAU*i/n2-r*1.3,82*P.speed,c[1]);}break;
      case'fibfan':if(fireNow){n=FIB[(t/e|0)%FIB.length];var aim=Math.atan2(s.player.y-y,s.player.x-x);for(i=0;i<n;i++){a=aim+(n>1?(i/(n-1)-.5):0)*.16*n;sp1(x,y,a,90*P.speed,c[i%2]);}}break;
      case'spiro':if(fireNow){n=t/e;var R=48,rr=P.k*8+10,d=P.k2*10+10,th=n*.35,ex=x+(R-rr)*Math.cos(th)+d*Math.cos((R-rr)/rr*th),ey=y+Math.min(34,Math.abs((R-rr)*Math.sin(th)+d*Math.sin((R-rr)/rr*th)));sp1(ex,Math.max(36,ey),Math.PI/2+Math.sin(n*.2)*.3,86*P.speed,c[(n|0)%2]);}break;
      case'ripple':if(fireNow){var rx=W*(.2+.6*((t/e*PHI)%1)),ry=H*(.14+.12*((t/e*PHI*PHI)%1)),m=Math.round(12*dens)+6;for(i=0;i<m;i++)sp1(rx,ry,TAU*i/m,52*P.speed,c[(t/e|0)%2]);}break;
      case'goldrain':if(fireNow){var xr=((t/e)*PHI%1)*W,xs=(xr+W*.5)%W;if(Math.abs(xr-s.player.x)>26)sp1(xr,24,Math.PI/2,78*P.speed,c[0]);if(Math.abs(xs-s.player.x)>26)sp1(xs,24,Math.PI/2,78*P.speed,c[1]);}break;
    }
  }
  return Object.freeze({KINDS:KINDS,kindIndex:kindIndex,plan:plan,params:params,fire:fire,setOrder:setOrder,TAU:TAU});
});
