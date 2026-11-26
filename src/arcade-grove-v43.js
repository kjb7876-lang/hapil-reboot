/* 성장나무와 시공간 열매(사용자 11-25 15:25·15:28 KST).
 * 원문: "시공간왜곡을 기본7프로 확률로만두고 나머지는 성장나무에서 포인트로 강화해서 올리게하는거 어때 헬난이도에서도 적용되게 하고",
 *       "시공간 열매로해서 최대10개까지 장착가능하고 장착해지도 가능하게 개당7프로씩 확률증가 즉모두장착시77프로 확률로 시공간왜곡 발생하는거지
 *        단 성장나무에 포인트같은걸 먹여서 성장나무를 키워서 나온 열매를 바탕으로 장착할 수 있고 그열매는 단계가 올라갈수록 맺을확률이 급격히 낮아지는거지".
 *
 * 흐름: 게임 점수 SAP_SCORE(10,000)점마다 양분 1 → 시작 메뉴 '성장나무'에서 양분을 주면 꽃 게이지가 찬다 → 다 차면 꽃이 피고
 * 나무 단계(= 맺힌 열매 수 k)에 따른 확률 CHANCE[k]로 시공간 열매가 맺힌다(실패하면 꽃만 지고 게이지는 비워진다).
 * 천장: 같은 단계에서 PITY[k]번째 꽃은 반드시 맺힌다(나쁜 운이 끝없이 이어지지 않게). 열매는 최대 10개, 장착·해제는 자유.
 * 엔진에는 장착 개수만 넘긴다: createRun({fruits:n}) → 왜곡 확률 7% + 7%×n(최대 77%), 헬 포함(src/arcade-v43.js distortChance).
 * 저장: localStorage 'hapil-arcade-grove-v1'(이 기기). 기록 코드(챕터 기록 화면)에도 함께 실어 다른 기기로 옮긴다.
 */
(function(global){
  'use strict';
  var KEY='hapil-arcade-grove-v1',SLOTS=10,SAP_SCORE=10000,BASE=7,PER=7;
  // k번째 열매(나무 k단계 → k+1단계)가 맺힐 확률: 단계가 오를수록 급격히 낮아진다
  var CHANCE=[1,.7,.5,.35,.25,.17,.12,.08,.05,.03];
  // 꽃 한 번 피우는 데 드는 양분
  var COST=[100,200,300,400,500,600,700,800,900,1000];
  var PITY=CHANCE.map(function(p){return Math.ceil(2/p);}); // 2,3,4,6,8,12,17,25,40,67번째 꽃은 반드시
  function int(v,lo,hi){v=Math.floor(Number(v));if(!isFinite(v))v=lo;return Math.max(lo,Math.min(hi,v));}
  function fresh(){return {v:1,sap:0,total:0,fruits:0,grow:0,tries:0,blooms:0,on:[]};}
  function clean(raw){
    var g=fresh();if(!raw||typeof raw!=='object')return g;
    g.sap=int(raw.sap,0,1e9);g.total=Math.max(g.sap,int(raw.total,0,1e12));g.fruits=int(raw.fruits,0,SLOTS);g.blooms=int(raw.blooms,0,1e6);
    g.grow=g.fruits>=SLOTS?0:int(raw.grow,0,COST[g.fruits]-1);g.tries=g.fruits>=SLOTS?0:int(raw.tries,0,PITY[g.fruits]-1);
    var on=Array.isArray(raw.on)?raw.on:[];for(var i=0;i<g.fruits;i++)g.on[i]=on[i]===undefined?true:!!on[i]; // 처음 맺힌 열매는 끼운 채로
    return g;
  }
  function equipped(g){var n=0;for(var i=0;i<g.fruits;i++)if(g.on[i])n++;return Math.min(SLOTS,n);}
  function chancePct(g){return BASE+PER*equipped(g);}
  /* 점수로 양분 벌기. 나머지 점수는 다음에 이어서 센다(run.banked). 반환: 새로 얻은 양분 */
  function earn(g,run,score){
    if(!run)return 0;var got=Math.floor(Math.max(0,(score||0)-(run.banked||0))/SAP_SCORE);if(got<=0)return 0;
    run.banked=(run.banked||0)+got*SAP_SCORE;run.sap=(run.sap||0)+got;g.sap+=got;g.total+=got;return got;
  }
  function next(g){if(g.fruits>=SLOTS)return null;var k=g.fruits;return {stage:k,chance:CHANCE[k],cost:COST[k],pity:PITY[k],tries:g.tries,need:COST[k]-g.grow};}
  /* 양분 주기: 게이지를 채울 만큼(가진 만큼) 붓는다. 다 차면 꽃이 피고 열매를 굴린다. rng: 0~1 (기본 Math.random)
     반환 {poured, bloom:null|{ok, stage, chance, pity:bool}} */
  function feed(g,rng){
    var n=next(g);if(!n||g.sap<=0)return {poured:0,bloom:null};
    var pour=Math.min(g.sap,n.need);g.sap-=pour;g.grow+=pour;
    if(g.grow<n.cost)return {poured:pour,bloom:null};
    g.grow=0;g.blooms++;var forced=g.tries+1>=n.pity,roll=forced?0:(rng||Math.random)(),ok=forced||roll<n.chance;
    if(ok){g.on[g.fruits]=true;g.fruits++;g.tries=0;}else g.tries++;
    return {poured:pour,bloom:{ok:ok,stage:n.stage,chance:n.chance,pity:forced}};
  }
  function toggle(g,i){if(i<0||i>=g.fruits)return false;g.on[i]=!g.on[i];return true;}
  function setAll(g,v){for(var i=0;i<g.fruits;i++)g.on[i]=!!v;}
  /* 기록 코드 합치기: 더 많이 키운 쪽(누적 양분)을 남긴다 */
  function merge(a,b){a=clean(a);b=clean(b);return b.total>a.total||(b.total===a.total&&b.fruits>a.fruits)?b:a;}
  /* 기대값(보고·검사용): 열매 k개까지 드는 평균 양분 */
  function expectedSap(k){var tot=0;for(var i=0;i<Math.min(k,SLOTS);i++){var e=0,q=1;for(var t=0;t<PITY[i];t++){e+=q;q*=1-CHANCE[i];}tot+=e*COST[i];}return tot;}
  function load(){try{return clean(JSON.parse(global.localStorage.getItem(KEY)||'null'));}catch(e){return fresh();}}
  function save(g){try{global.localStorage.setItem(KEY,JSON.stringify(g));return true;}catch(e){return false;}}

  /* ── 그림: 수묵 성장나무. 바탕은 한지, 먹 줄기는 갈필 세 겹, 잎은 엷은 먹 점, 열매는 쪽빛(시공간) 구슬에 금빛 시곗바늘.
     인주색은 쓰지 않는다(사용자 11-16: 인주색은 하트·예고처럼 플레이어를 돕는 순간 전용). */
  var INK='30,26,24',FRUIT_IN='#3d5488',FRUIT_OUT='#1c2747',GOLD='#c9a85e';
  function srand(seed){var x=seed>>>0||1;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
  function layout(growth,w,h){
    var r=srand(7177),tips=[],segs=[],f=Math.min(1,.34+.066*growth),depth=Math.min(6,2+Math.floor(growth/2.2)),base={x:w*.5,y:h*.88};
    function branch(x,y,a,len,wid,d){
      var bend=(r()-.5)*.35,mx=x+Math.cos(a+bend)*len*.5,my=y+Math.sin(a+bend)*len*.5,ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len,w1=Math.max(.8,wid*.66);
      segs.push({x:x,y:y,mx:mx,my:my,ex:ex,ey:ey,w:wid,w1:w1,d:d});
      if(d>=depth){tips.push({x:ex,y:ey,d:d});return;}
      var kids=d<1?2:(r()<.35?3:2);
      for(var i=0;i<kids;i++){var spread=(.32+r()*.3)*(i===0?-1:i===1?1:(r()-.5)*.6);branch(ex,ey,a+spread+(r()-.5)*.12,len*(.7+r()*.1),w1,d+1);}
      if(d>=2)tips.push({x:ex,y:ey,d:d,inner:true});
    }
    branch(base.x,base.y,-Math.PI/2+(r()-.5)*.08,h*.3*f,6+10*f,0);
    // 자동 구도(심사 1차): 나무 꼭대기를 성장에 따라 화면 위 36%→10% 선에 맞춘다(작을 땐 당겨 보고, 클 땐 물러서 본다). 좌우도 넘치지 않게
    var top=base.y,lx=base.x,rx=base.x;segs.forEach(function(s){top=Math.min(top,s.ey-16,s.my-16);lx=Math.min(lx,s.ex-18);rx=Math.max(rx,s.ex+18);});
    var want=h*Math.max(.1,.36-.026*growth),k=Math.min(2.2,(base.y-want)/Math.max(1,base.y-top),(w*.47)/Math.max(1,base.x-lx,rx-base.x));
    var mv=function(o,a,b){o[a]=base.x+(o[a]-base.x)*k;o[b]=base.y+(o[b]-base.y)*k;};segs.forEach(function(s){mv(s,'x','y');mv(s,'mx','my');mv(s,'ex','ey');s.w*=Math.sqrt(k);s.w1*=Math.sqrt(k);});tips.forEach(function(t){mv(t,'x','y');});
    var cyTop=base.y;tips.forEach(function(t){cyTop=Math.min(cyTop,t.y);});
    // 열매 자리 10곳: 바깥 가지 끝을 먼저, 모자라면 안쪽 가지 끝, 그래도 모자라면 가지 끝 둘레로 비켜 놓는다(겹침 금지)
    var outer=tips.filter(function(t){return !t.inner;}).sort(function(a,b){return a.x-b.x;}),inner=tips.filter(function(t){return t.inner;}).sort(function(a,b){return a.y-b.y;}),cand=[],spots=[],i;
    var pick=outer.length>=SLOTS?outer.filter(function(t,j){return Math.floor(j*SLOTS/outer.length)!==Math.floor((j-1)*SLOTS/outer.length);}):outer.slice();
    cand=pick.concat(inner);for(i=0;cand.length<SLOTS;i++){var b0=cand[i%Math.max(1,pick.length)]||{x:base.x,y:top+20},an=i*2.4;cand.push({x:b0.x+Math.cos(an)*16,y:b0.y+Math.sin(an)*12});}
    var main=cand.slice(0,SLOTS).sort(function(a,b){return a.x-b.x;}),order=[0,9,4,6,2,8,1,5,7,3];for(i=0;i<SLOTS;i++)spots[order[i]]={x:main[i].x,y:main[i].y+6};
    return {segs:segs,tips:tips,spots:spots,base:base,f:f,k:k,crown:(cyTop+base.y)/2-(base.y-cyTop)*.12,span:base.y-cyTop};
  }
  /* 끝으로 갈수록 가늘어지는 붓 획 한 줄(채운 면) + 한지 색 마른 긁힘 */
  function brush(ctx,s,al){
    var nx=-(s.ey-s.y),ny=s.ex-s.x,l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;var a=s.w/2,b=s.w1/2;
    ctx.fillStyle='rgba('+INK+','+al+')';ctx.beginPath();ctx.moveTo(s.x+nx*a,s.y+ny*a);ctx.quadraticCurveTo(s.mx+nx*(a+b)/2,s.my+ny*(a+b)/2,s.ex+nx*b,s.ey+ny*b);
    ctx.lineTo(s.ex-nx*b,s.ey-ny*b);ctx.quadraticCurveTo(s.mx-nx*(a+b)/2,s.my-ny*(a+b)/2,s.x-nx*a,s.y-ny*a);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(s.ex,s.ey,b,0,6.283);ctx.fill();
    if(s.w>3.2){ctx.strokeStyle='rgba(242,233,214,.55)';ctx.lineWidth=Math.max(.6,s.w*.07);var r=srand((s.x*31+s.y*17)|0);
      for(var j=0;j<3;j++){var o=(r()-.5)*.9,f0=.15+r()*.3,f1=.6+r()*.35;ctx.beginPath();ctx.moveTo(s.x+(s.ex-s.x)*f0+nx*a*o,s.y+(s.ey-s.y)*f0+ny*a*o);ctx.quadraticCurveTo(s.mx+nx*a*o*.8,s.my+ny*a*o*.8,s.x+(s.ex-s.x)*f1+nx*b*o,s.y+(s.ey-s.y)*f1+ny*b*o);ctx.stroke();}}
  }
  function drawTree(ctx,g,w,h,t,fx){
    var growth=g.fruits+(g.fruits<SLOTS?g.grow/COST[g.fruits]*.8:0),L=layout(growth,w,h),i;t=t||0;
    // 한지 바탕·먼 산(먹 번짐 띠 두 겹)
    ctx.fillStyle='#f2e9d6';ctx.fillRect(0,0,w,h);
    var hills=[[.66,.05,1.3],[.74,.08,2.1]];hills.forEach(function(H,j){var rr=srand(77+j);ctx.fillStyle='rgba('+INK+','+H[1]+')';ctx.beginPath();ctx.moveTo(0,h);for(var x=0;x<=w;x+=w/24){var y=h*H[0]-Math.sin(x/w*3.1*H[2]+j)*h*.06-rr()*h*.025;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.fill();
      var fog=ctx.createLinearGradient(0,h*(H[0]-.08),0,h*(H[0]+.02));fog.addColorStop(0,'rgba(242,233,214,0)');fog.addColorStop(1,'rgba(242,233,214,.35)');ctx.fillStyle=fog;ctx.fillRect(0,h*(H[0]-.08),w,h*.1);});
    // 땅: 마른 붓 가로획
    ctx.lineCap='round';
    for(var k=0;k<3;k++){ctx.strokeStyle='rgba('+INK+','+(.5-k*.14)+')';ctx.lineWidth=3-k*.8;ctx.beginPath();ctx.moveTo(w*(.18+k*.03),L.base.y+2+k*3);ctx.quadraticCurveTo(w*.5,L.base.y-3+k*2,w*(.82-k*.04),L.base.y+3+k*2);ctx.stroke();}
    // 원상(圓相): 나무 뒤 한 획. 시작은 굵고 진하게, 끝은 가늘고 갈라지며 옅어진다(심사 1차). 위가 열린 고리
    var cy=L.crown,cr=Math.max(h*.2,Math.min(h*.42,L.span*.62));cr=Math.min(cr,cy-8,L.base.y-cy+4);
    var a0=-1.15,a1=4.5,N=40,base=.06+.012*g.fruits;ctx.lineCap='butt';
    for(i=0;i<N;i++){var u=i/N,aa=a0+(a1-a0)*u,ab=a0+(a1-a0)*(i+1.02)/N;ctx.strokeStyle='rgba('+INK+','+(base*(1-u*.75))+')';ctx.lineWidth=Math.max(.8,8*(1-u)+1);ctx.beginPath();ctx.arc(w*.5,cy,cr,aa,ab);ctx.stroke();
      if(u>.6){ctx.lineWidth=.8;ctx.beginPath();ctx.arc(w*.5,cy,cr+3*(1-u)+2,aa,ab);ctx.stroke();}}
    ctx.lineCap='round';
    // 잎: 엷은 먹 번짐. 겹쳐도 중간 회색까지만(심사 1차: 다 자란 나무 잎이 검은 덩어리), 열매 자리 둘레는 비운다
    var many=Math.min(1,18/Math.max(1,L.tips.length)),rr=srand(313),r=srand(991),spots=L.spots.slice(0,g.fruits+1);
    function nearFruit(x,y){for(var j=0;j<spots.length;j++){if(Math.abs(spots[j].x-x)<13&&Math.abs(spots[j].y-y)<13)return true;}return false;}
    L.tips.forEach(function(tp){if(tp.inner)return;ctx.fillStyle='rgba('+INK+','+((.03+rr()*.025)*Math.max(.55,many))+')';ctx.beginPath();ctx.ellipse(tp.x+(rr()-.5)*8,tp.y-4,12+rr()*12*L.f,8+rr()*7*L.f,(rr()-.5)*.8,0,6.283);ctx.fill();});
    L.tips.forEach(function(tp){var n=tp.inner?2:5;for(var q=0;q<n;q++){var a=r()*6.283,d=4+r()*13*L.f,x=tp.x+Math.cos(a)*d,y=tp.y+Math.sin(a)*d*.7,al=(.04+r()*.07)*many,sx=3+r()*6*L.f,sy=2+r()*4*L.f;if(nearFruit(x,y))continue;ctx.fillStyle='rgba('+INK+','+al+')';ctx.beginPath();ctx.ellipse(x,y,sx,sy,a,0,6.283);ctx.fill();}});
    // 줄기·가지: 가늘어지는 붓 획(밑은 진하고 가지 끝은 옅게), 굵은 줄기엔 한지 색 마른 긁힘
    L.segs.forEach(function(s){brush(ctx,s,Math.max(.45,.86-s.d*.07));});
    // 꽃눈(다음 열매 자리): 게이지만큼 부푼다
    var nx=g.fruits<SLOTS?L.spots[g.fruits]:null;
    if(nx){var q=g.grow/COST[g.fruits],br=3+q*7;ctx.fillStyle='rgba(242,233,214,.95)';ctx.strokeStyle='rgba('+INK+',.55)';ctx.lineWidth=1.2;
      for(var p=0;p<5;p++){var pa=p/5*6.283+t*.4;ctx.beginPath();ctx.ellipse(nx.x+Math.cos(pa)*br*.55,nx.y+Math.sin(pa)*br*.55,br*.55,br*.36,pa,0,6.283);ctx.fill();ctx.stroke();}
      ctx.fillStyle='rgba('+INK+',.6)';ctx.beginPath();ctx.arc(nx.x,nx.y,1.6,0,6.283);ctx.fill();}
    // 열매(맺힌 순간의 열매는 툭 커졌다 돌아온다)
    var R=9*Math.min(1.25,Math.max(.9,Math.sqrt(L.k)));
    for(i=0;i<g.fruits;i++){var pop=1;if(fx&&fx.ok&&fx.at===i){var e0=Math.min(1,fx.age*1.6);pop=e0<.35?e0/.35*1.45:1+.45*Math.max(0,1-(e0-.35)/.4)*Math.cos((e0-.35)*14);}
      drawFruit(ctx,L.spots[i].x,L.spots[i].y,R*pop,!!g.on[i],fx&&fx.ok&&fx.at===i?t*1.6+fx.age*6.283*1.6:t+i*.7);}
    // 꽃 핀 순간 연출(fx: {ok, age 0~1, at}) — 임시(코드 그림). 최종은 프레임 시트로 바꿀 대상
    if(fx&&fx.age<1){var sp=L.spots[Math.max(0,Math.min(SLOTS-1,fx.at))],e=fx.age;
      if(fx.ok){var wash=ctx.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,14+e*60);wash.addColorStop(0,'rgba(61,84,136,0)');wash.addColorStop(.7,'rgba(61,84,136,'+(.22*(1-e))+')');wash.addColorStop(1,'rgba(61,84,136,0)');ctx.fillStyle=wash;ctx.beginPath();ctx.arc(sp.x,sp.y,14+e*60,0,6.283);ctx.fill();
        var rs=srand(fx.at*97+5);for(var d0=0;d0<9;d0++){var an=rs()*6.283,dist=(16+rs()*26)*Math.min(1,e*2.2),sz=(1.2+rs()*2.4)*(1-e*.6);ctx.fillStyle='rgba('+INK+','+(.55*(1-e))+')';ctx.beginPath();ctx.ellipse(sp.x+Math.cos(an)*dist,sp.y+Math.sin(an)*dist,sz*1.6,sz,an,0,6.283);ctx.fill();}
        ctx.strokeStyle='rgba(201,168,94,'+(.85*(1-e))+')';ctx.lineWidth=2.2*(1-e)+.6;ctx.beginPath();ctx.arc(sp.x,sp.y,R*1.6+e*6,-1.57,-1.57+6.283*Math.min(1,e*1.4));ctx.stroke();
        ctx.save();ctx.globalAlpha=Math.min(1,(1-e)*2.2);ctx.fillStyle='#2f4577';ctx.font='600 13px "Noto Serif KR","Nanum Myeongjo",serif';ctx.textAlign='center';ctx.fillText('+'+PER+'%',sp.x,sp.y-R-12-e*14);ctx.restore();}
      else for(var pp=0;pp<6;pp++){var px=sp.x+(pp-2.5)*6+Math.sin(e*5+pp)*8,py=sp.y+e*70*(0.6+pp%3*.25);ctx.fillStyle='rgba('+INK+','+(.35*(1-e))+')';ctx.beginPath();ctx.ellipse(px,py,3.4,2,e*4+pp,0,6.283);ctx.fill();}}
    return L;
  }
  function drawFruit(ctx,x,y,R,on,t){
    ctx.save();
    if(on){var gl=ctx.createRadialGradient(x,y,R*.6,x,y,R*2.1);gl.addColorStop(0,'rgba(61,84,136,.28)');gl.addColorStop(1,'rgba(61,84,136,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,R*2.1,0,6.283);ctx.fill();}
    var gr=ctx.createRadialGradient(x-R*.35,y-R*.4,R*.15,x,y,R);gr.addColorStop(0,on?'#6f86b8':'rgba(111,134,184,.35)');gr.addColorStop(.55,on?FRUIT_IN:'rgba(61,84,136,.3)');gr.addColorStop(1,on?FRUIT_OUT:'rgba(28,39,71,.35)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,R,0,6.283);ctx.fill();
    ctx.strokeStyle=on?'rgba(28,39,71,.9)':'rgba('+INK+',.45)';ctx.lineWidth=1.3;if(!on&&ctx.setLineDash)ctx.setLineDash([3,2.5]);ctx.stroke();if(ctx.setLineDash)ctx.setLineDash([]);
    // 금빛 시곗바늘 소용돌이(장착한 열매만 돈다)
    var a=on?t*1.6:-.6;ctx.strokeStyle=on?GOLD:'rgba(201,168,94,.45)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,R*.55,a,a+3.6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a+3.6)*R*.55,y+Math.sin(a+3.6)*R*.55);ctx.stroke();
    // 꼭지
    ctx.strokeStyle='rgba('+INK+',.8)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y-R);ctx.quadraticCurveTo(x+2,y-R-5,x+5,y-R-6);ctx.stroke();
    ctx.restore();
  }

  /* ── 화면: root 안에 나무 캔버스·수치·단추·열매 칸을 만든다. hooks: {changed(g), sound(kind)} */

  function tr(source,values){
    var i18n=global.HapilI18n;
    if(i18n)return i18n.text(source,values);
    return values?source.replace(/\{(\w+)\}/g,function(slot,key){return values[key]==null?slot:String(values[key]);}):source;
  }
  function fmt(n){return Math.floor(n).toLocaleString(global.HapilI18n?global.HapilI18n.lang:'ko');}
  function mount(doc,root,g,hooks){
    hooks=hooks||{};root.innerHTML='';
    var cv=doc.createElement('canvas');cv.className='grove-tree';cv.setAttribute('role','img');root.appendChild(cv);
    var pct=doc.createElement('p');pct.className='grove-pct';root.appendChild(pct);
    var info=doc.createElement('p');info.className='note grove-info';root.appendChild(info);
    var barLbl=doc.createElement('p');barLbl.className='note grove-bar-label';root.appendChild(barLbl);var bar=doc.createElement('div');bar.className='grove-bar';var fill=doc.createElement('i');bar.appendChild(fill);root.appendChild(bar);
    var row=doc.createElement('div');row.className='row';
    var b1=doc.createElement('button');b1.type='button';b1.id='grove-feed';row.appendChild(b1);
    var b2=doc.createElement('button');b2.type='button';b2.id='grove-feed-all';b2.textContent=tr('남은 양분으로 계속 피우기');row.appendChild(b2);root.appendChild(row);
    var msg=doc.createElement('p');msg.className='note grove-msg';msg.setAttribute('aria-live','polite');root.appendChild(msg);
    var slots=doc.createElement('div');slots.className='grove-slots';slots.setAttribute('role','group');slots.setAttribute('aria-label',tr('시공간 열매 장착'));root.appendChild(slots);
    var btns=[];for(var i=0;i<SLOTS;i++){var b=doc.createElement('button');b.type='button';b.className='grove-slot';b.dataset.i=String(i);slots.appendChild(b);btns.push(b);
      b.addEventListener('click',function(){var j=Number(this.dataset.i);if(toggle(g,j)){if(hooks.sound)hooks.sound('toggle');changed();}});}
    var row2=doc.createElement('div');row2.className='row';
    var all=doc.createElement('button');all.type='button';all.id='grove-all';all.textContent=tr('모두 끼우기');row2.appendChild(all);
    var none=doc.createElement('button');none.type='button';none.id='grove-none';none.textContent=tr('모두 빼기');row2.appendChild(none);root.appendChild(row2);
    var how=doc.createElement('p');how.className='note grove-how';how.textContent=tr('점수 1만 점마다 양분 1. 꽃이 피면 열매가 맺히거나 꽃만 집니다. 여러 번 지면 꼭 맺히는 꽃이 옵니다. 열매 하나에 시공간 왜곡 +{pct}% (헬에서도).',{pct:PER});root.appendChild(how);
    var fx=null,raf=0,t0=0,alive=true;
    function changed(){paint();if(hooks.changed)hooks.changed(g);}
    function paint(){
      var n=next(g),eq=equipped(g);
      pct.innerHTML='';var s1=doc.createElement('span');s1.textContent=tr('시공간 왜곡')+' ';var b=doc.createElement('b');b.textContent=chancePct(g)+'%';var s2=doc.createElement('small');s2.textContent=' '+tr('기본 {base}% + 열매 {count}×{pct}%',{base:BASE,count:eq,pct:PER});pct.appendChild(s1);pct.appendChild(b);pct.appendChild(s2);
      var details=[tr('양분 {sap} · 열매 {fruit}/{max}',{sap:fmt(g.sap),fruit:g.fruits,max:SLOTS})];
      if(n){
        details.push(tr('이번 꽃: {n}번째 열매 확률 {pct}%',{n:n.stage+1,pct:Math.round(n.chance*100)}));
        details.push(n.pity-n.tries<=1?tr('이번엔 꼭 맺힘'):tr('늦어도 꽃 {n}번 안에',{n:n.pity-n.tries}));
      }else details.push(tr('다 자란 나무'));
      info.textContent=details.join(' · ');
      fill.style.width=(n?Math.round(g.grow/n.cost*100):100)+'%';
      bar.setAttribute('aria-label',tr('꽃 게이지 {value}',{value:n?g.grow+'/'+n.cost:tr('완성')}));
      barLbl.textContent=n?tr('다음 꽃까지 양분 {a} / {b}',{a:fmt(g.grow),b:fmt(n.cost)}):tr('열매 10개 · 다 자란 나무');
      b1.textContent=n?tr(g.sap>=n.need?'양분 주기 · 꽃 피우기':'양분 주기'):tr('다 자란 나무');
      b1.disabled=!n||g.sap<=0;b2.hidden=!n||g.sap<n.need+COST[g.fruits];
      var ord=[];for(var q=0;q<g.fruits;q++)if(g.on[q])ord.push(q);for(q=0;q<g.fruits;q++)if(!g.on[q])ord.push(q);
      btns.forEach(function(x,j){var i=j<ord.length?ord[j]:-1,own=i>=0,on=own&&!!g.on[i];x.dataset.i=String(i);x.disabled=!own;x.setAttribute('aria-pressed',String(on));x.setAttribute('aria-label',own?tr(on?'시공간 열매 {n} 장착됨':'시공간 열매 {n} 빠짐',{n:i+1}):tr('빈 자리 {n}',{n:j+1}));x.dataset.state=own?(on?'on':'off'):'empty';x.textContent=own?'時':'';});
      all.disabled=none.disabled=g.fruits===0;cv.setAttribute('aria-label',tr('성장나무 {n}단계, 시공간 열매 {n}개 중 {on}개 장착',{n:g.fruits,on:eq}));
      draw();
    }
    function draw(){
      var cw=cv.clientWidth||320,ch=cv.clientHeight||260,dpr=Math.min(2,global.devicePixelRatio||1);
      if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
      var ctx=cv.getContext&&cv.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);
      var now=(global.performance?global.performance.now():Date.now())/1000;if(fx){fx.age=(now-fx.t)/1.4;if(fx.age>=1)fx=null;}
      var Ink=global.HapilInk,hold=!!(Ink&&Ink.raw);if(hold)Ink.raw(1); // 수묵 변환층(ink-v43.js)이 색을 뒤집지 않게: 이 그림은 처음부터 한지·먹 색으로 그린다
      try{drawTree(ctx,g,cw,ch,now,fx);}finally{if(hold)Ink.raw(-1);}
    }
    function loop(){if(!alive)return;draw();raf=global.requestAnimationFrame?global.requestAnimationFrame(loop):0;}
    function feedOnce(){var at=g.fruits,r=feed(g,hooks.rng);if(r.bloom){fx={ok:r.bloom.ok,t:(global.performance?global.performance.now():Date.now())/1000,at:at,age:0};
        var odds=tr('방금 확률 {pct}%',{pct:Math.round(r.bloom.chance*100)});
        if(r.bloom.ok){
          msg.textContent=tr('{n}번째 시공간 열매가 맺혔습니다',{n:r.bloom.stage+1})+' ('+(r.bloom.pity?tr('보장'):odds)+') · '+tr('왜곡 +{pct}%',{pct:PER});
        }else{
          msg.textContent=tr('꽃만 피고 졌습니다')+' ('+odds+') · '+tr('늦어도 꽃 {n}번 안에',{n:PITY[r.bloom.stage]-g.tries});
        }
        if(hooks.sound)hooks.sound(r.bloom.ok?'fruit':'petal');}
      else if(r.poured){msg.textContent=tr('양분 {n}을 주었습니다.',{n:fmt(r.poured)});if(hooks.sound)hooks.sound('feed');}
      return r;}
    b1.addEventListener('click',function(){feedOnce();changed();});
    b2.addEventListener('click',function(){var got=0,lost=0,guard=0,last=null;while(guard++<500){var n=next(g);if(!n||g.sap<n.need)break;var r=feedOnce();if(!r.bloom)break;last=r;if(r.bloom.ok)got++;else lost++;}
      if(last&&got+lost>1)msg.textContent=tr('꽃 {n}번 · 열매 {f}개 맺힘',{n:got+lost,f:got})+(lost?' · '+tr('{n}번은 꽃만 짐',{n:lost}):'');changed();});
    all.addEventListener('click',function(){setAll(g,true);changed();});none.addEventListener('click',function(){setAll(g,false);changed();});
    paint();loop();
    return {paint:paint,stop:function(){alive=false;if(raf&&global.cancelAnimationFrame)global.cancelAnimationFrame(raf);}};
  }

  var api={KEY:KEY,SLOTS:SLOTS,SAP_SCORE:SAP_SCORE,BASE:BASE,PER:PER,CHANCE:CHANCE,COST:COST,PITY:PITY,fresh:fresh,clean:clean,equipped:equipped,chancePct:chancePct,earn:earn,next:next,feed:feed,toggle:toggle,setAll:setAll,merge:merge,expectedSap:expectedSap,load:load,save:save,drawTree:drawTree,drawFruit:drawFruit,layout:layout,mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.HapilArcadeGrove=api;
})(typeof window!=='undefined'?window:globalThis);
