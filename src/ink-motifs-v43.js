// 수묵 소재 그리기: 아래에서 솟는 소재(arcade-v43.js MOTIFS)의 그림. 코드로만 그린다. 모든 그림은 (0,0) 중심, 크기 s(대략 높이의 절반) 기준. 색: 먹 농담만.
(function(g){
  var INK='30,26,24',PAPER='242,233,214',LIGHT='252,249,243',TAU=Math.PI*2;
  function rnd(seed){var s=seed>>>0||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  // 붓 획: 점들을 지나는 굵기 변하는 획. pts=[[x,y,w],...]
  function stroke(c,pts,a,seed){var L=[],R=[],i,n=pts.length,r=rnd(seed||7);
    for(i=0;i<n;i++){var p=pts[i],q=pts[Math.min(n-1,i+1)],o=pts[Math.max(0,i-1)],dx=q[0]-o[0],dy=q[1]-o[1],d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d,w=p[2]/2*(.92+.16*r());L.push([p[0]+nx*w,p[1]+ny*w]);R.push([p[0]-nx*w,p[1]-ny*w]);}
    c.beginPath();c.moveTo(L[0][0],L[0][1]);for(i=1;i<n;i++){var m=[(L[i-1][0]+L[i][0])/2,(L[i-1][1]+L[i][1])/2];c.quadraticCurveTo(L[i-1][0],L[i-1][1],m[0],m[1]);}c.lineTo(L[n-1][0],L[n-1][1]);
    for(i=n-1;i>0;i--){var m2=[(R[i-1][0]+R[i][0])/2,(R[i-1][1]+R[i][1])/2];c.lineTo(R[i][0],R[i][1]);c.quadraticCurveTo(R[i][0],R[i][1],m2[0],m2[1]);}c.lineTo(R[0][0],R[0][1]);c.closePath();
    c.fillStyle='rgba('+INK+','+(a==null?.9:a)+')';c.fill();}
  function curve(p0,p1,p2,n,w0,w1,w2){var o=[],i,t,u;for(i=0;i<=n;i++){t=i/n;u=1-t;var w=t<.5?w0+(w1-w0)*t*2:w1+(w2-w1)*(t-.5)*2;o.push([u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1],w]);}return o;}
  function blob(c,x,y,r,a,seed,k){var rr=rnd(seed),i,n=14;c.beginPath();for(i=0;i<=n;i++){var t=i/n*TAU,q=r*(1+(k||.18)*(rr()-.5)*2*(i<n?1:0));if(i===n)q=first;else if(i===0)var first=q;var px=x+Math.cos(t)*q,py=y+Math.sin(t)*q;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle='rgba('+INK+','+a+')';c.fill();}
  function wash(c,x,y,r,a){var gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+INK+','+a+')');gr.addColorStop(.6,'rgba('+INK+','+a*.55+')');gr.addColorStop(1,'rgba('+INK+',0)');c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  function flecks(c,x,y,w,h,n,seed){var r=rnd(seed);c.fillStyle='rgba('+PAPER+',.55)';for(var i=0;i<n;i++)c.fillRect(x+(r()-.5)*w,y+(r()-.5)*h,1+r()*3,.8+r()*.8);}
  var M={};
  // 난: 뿌리에서 뻗는 긴 잎 다섯, 꽃대 하나
  M.orchid=function(c,s){var L=[[-.9,-1.0,-.25],[.95,-.75,.2],[-.35,-1.35,-.05],[.5,-1.2,.1],[1.25,-.2,.3],[-1.2,-.3,-.3]],i;
    for(i=0;i<L.length;i++){var e=L[i];stroke(c,curve([e[2]*s*.2,s*.95],[e[0]*s*.25,-s*.2+e[1]*s*.3],[e[0]*s,e[1]*s*.7+s*.1],16,s*.045,s*.17,s*.012),i%2?.82:.95,11+i);}
    stroke(c,curve([0,s*.95],[s*.12,s*.1],[s*.3,-s*.55],10,s*.03,s*.05,s*.018),.7,31);
    [[.3,-.58],[.42,-.42],[.2,-.36]].forEach(function(p,k){for(var j=0;j<4;j++){var a=-1.9+j*.75+k;stroke(c,curve([p[0]*s,p[1]*s],[p[0]*s+Math.cos(a)*s*.09,p[1]*s+Math.sin(a)*s*.09],[p[0]*s+Math.cos(a+.4)*s*.17,p[1]*s+Math.sin(a+.4)*s*.17],6,s*.02,s*.08,s*.008),.7,40+j+k*5);}blob(c,p[0]*s,p[1]*s,s*.04,.95,50+k);});};
  // 매화: 꺾인 가지와 꽃
  M.plum=function(c,s){stroke(c,[[-s*.15,s*.98,s*.3],[-s*.05,s*.5,s*.25],[-s*.3,s*.1,s*.19],[-s*.05,-s*.3,s*.15],[-s*.3,-s*.7,s*.09],[-s*.15,-s*1.0,s*.03]],.94,3);
    stroke(c,[[-s*.28,s*.12,s*.14],[s*.2,-s*.05,s*.11],[s*.55,-s*.4,s*.07],[s*.9,-s*.5,s*.025]],.9,5);stroke(c,[[-s*.07,-s*.3,s*.1],[s*.25,-s*.62,s*.065],[s*.35,-s*.95,s*.02]],.88,6);stroke(c,[[-s*.05,s*.5,s*.11],[-s*.5,s*.3,s*.07],[-s*.85,s*.02,s*.02]],.88,8);
    flecks(c,-s*.12,s*.4,s*.14,s*.9,9,4);
    [[.55,-.42,.13],[.9,-.52,.1],[.3,-.8,.12],[-.3,-.72,.13],[-.85,0,.11],[.22,-.02,.12],[-.52,.3,.1],[.36,-1.0,.09],[-.12,-1.02,.09]].forEach(function(f,k){var x=f[0]*s,y=f[1]*s,r=f[2]*s*1.5;for(var j=0;j<5;j++){var a=j/5*TAU+k,px=x+Math.cos(a)*r*.6,py=y+Math.sin(a)*r*.6;c.beginPath();c.arc(px,py,r*.46,0,TAU);c.fillStyle='rgba('+PAPER+',.92)';c.fill();c.lineWidth=s*.028;c.strokeStyle='rgba('+INK+',.88)';c.stroke();}blob(c,x,y,r*.22,.95,90+k);for(j=0;j<6;j++){var b=j/6*TAU+k*.5;c.fillStyle='rgba('+INK+',.9)';c.fillRect(x+Math.cos(b)*r*.5-1,y+Math.sin(b)*r*.5-1,2,2);}});};
  // 산: 겹친 봉우리 셋, 아래는 안개로 흐려짐
  M.mountain=function(c,s){function peak(pts,a,seed){c.beginPath();c.moveTo(pts[0][0]*s,s);pts.forEach(function(p){c.lineTo(p[0]*s,p[1]*s);});c.lineTo(pts[pts.length-1][0]*s,s);c.closePath();var gr=c.createLinearGradient(0,-s,0,s);gr.addColorStop(0,'rgba('+INK+','+a+')');gr.addColorStop(.55,'rgba('+INK+','+a*.6+')');gr.addColorStop(1,'rgba('+INK+','+a*.12+')');c.fillStyle=gr;c.fill();
      var o=pts.map(function(p,i){return [p[0]*s,p[1]*s,s*(.035+.03*((i*7+seed)%3)/2)];});stroke(c,o,Math.min(1,a+.25),seed);}
    c.save();peak([[-1.25,.8],[-.95,.25],[-.75,.38],[-.55,-.2],[-.4,.05],[-.2,.5],[0,.8]],.62,3);peak([[.1,.85],[.35,.3],[.55,-.05],[.7,.2],[.9,-.1],[1.1,.4],[1.3,.85]],.66,5);
    peak([[-.75,.95],[-.5,.3],[-.3,-.25],[-.12,-.75],[.02,-1.0],[.12,-.7],[.3,-.45],[.42,-.1],[.62,.4],[.85,.95]],.95,9);
    for(var i=0;i<7;i++)stroke(c,curve([(-.1+i*.07)*s,(-.6+i*.2)*s],[(-.05+i*.06)*s,(-.35+i*.2)*s],[(-.18+i*.09)*s,(-.1+i*.2)*s],5,s*.01,s*.03,s*.006),.5,20+i);
    flecks(c,0,-s*.2,s*.6,s*1.1,14,6);c.restore();for(var q=0;q<3;q++)stroke(c,curve([-s*(1.3-q*.2),s*(.72+q*.1)],[0,s*(.62+q*.1)],[s*(1.3-q*.15),s*(.74+q*.1)],12,s*.01,s*.07,s*.01),.45-q*.1,40+q);};
  // 해: 구름에 걸린 둥근 해(먹 테와 옅은 속)
  M.sun=function(c,s){wash(c,0,0,s*1.05,.16);for(var ry=0;ry<12;ry++){var ra=ry/12*TAU+.2;stroke(c,[[Math.cos(ra)*s*.76,-s*.1+Math.sin(ra)*s*.76,s*.06],[Math.cos(ra)*s*(.95+.08*(ry%2)),-s*.1+Math.sin(ra)*s*(.95+.08*(ry%2)),s*.012]],.7,70+ry);}var sg=c.createRadialGradient(-s*.15,-s*.3,s*.05,0,-s*.1,s*.62);sg.addColorStop(0,'rgba('+INK+',.06)');sg.addColorStop(1,'rgba('+INK+',.3)');c.beginPath();c.arc(0,-s*.1,s*.62,0,TAU);c.fillStyle=sg;c.fill();
    var o=[],i;for(i=0;i<=26;i++){var t=-1.2+i/26*TAU*.97;o.push([Math.cos(t)*s*.62,-s*.1+Math.sin(t)*s*.62,s*(.035+.07*Math.sin(i/26*Math.PI))]);}stroke(c,o,.92,3);
    for(i=0;i<3;i++)stroke(c,curve([-s*(1.1-i*.2),s*(.25+i*.2)],[0,s*(.1+i*.22)],[s*(1.1-i*.25),s*(.3+i*.18)],12,s*.01,s*(.12-i*.02),s*.01),.75-i*.15,10+i);flecks(c,0,s*.35,s*1.6,s*.3,8,2);};
  // 달: 초승달과 걸친 구름
  M.moon=function(c,s){c.save();c.beginPath();c.arc(0,0,s*.75,0,TAU);c.arc(s*.32,-s*.12,s*.62,0,TAU,true);c.fillStyle='rgba('+INK+',.86)';c.fill('evenodd');c.restore();
    c.save();c.beginPath();c.arc(0,0,s*.75,0,TAU);c.clip();flecks(c,-s*.45,0,s*.4,s*1.2,12,5);c.restore();wash(c,0,0,s*1.1,.13);
    stroke(c,curve([-s*1.2,s*.55],[-s*.2,s*.3],[s*1.15,s*.6],12,s*.01,s*.1,s*.01),.55,4);stroke(c,curve([-s*.8,s*.8],[0,s*.62],[s*.9,s*.85],10,s*.01,s*.07,s*.01),.4,5);};
  // 대나무: 마디 진 줄기 둘과 댓잎 묶음
  M.bamboo=function(c,s){[[-.22,.11,1.0,-.95,.04],[.2,.085,1.0,-.6,-.06]].forEach(function(b,k){var n=k?4:5,i;for(i=0;i<n;i++){var y0=s*(b[2]-(b[2]-b[3])*i/n),y1=s*(b[2]-(b[2]-b[3])*(i+1)/n)+s*.03,x0=s*(b[0]+b[4]*i),x1=s*(b[0]+b[4]*(i+1));stroke(c,[[x0,y0,s*b[1]*1.15],[(x0+x1)/2,(y0+y1)/2,s*b[1]*.9],[x1,y1,s*b[1]*1.15]],k?.78:.92,3+i+k*9);c.fillStyle='rgba('+PAPER+',.5)';c.fillRect((x0+x1)/2-s*b[1]*.18,y1+s*.04,s*b[1]*.14,(y0-y1)-s*.1);stroke(c,[[x1-s*b[1]*.75,y1+s*.012,s*.03],[x1+s*b[1]*.75,y1+s*.012,s*.03]],.95,20+i+k*9);}});
    [[-.2,-.72,-1],[.24,-.42,1],[-.26,-.2,-1],[.14,-.85,1],[-.3,-.98,-1]].forEach(function(l,k){for(var j=0;j<4;j++){var a=(l[2]>0?-.15:Math.PI+.15)+(j-1.5)*.42*l[2],len=s*(.5+.1*((j+k)%3));stroke(c,curve([l[0]*s,l[1]*s],[l[0]*s+Math.cos(a)*len*.5,l[1]*s+Math.sin(a)*len*.5+s*.05],[l[0]*s+Math.cos(a)*len,l[1]*s+Math.sin(a)*len+s*.16],8,s*.015,s*.085,s*.006),k%2?.75:.93,40+k*5+j);}});};
  // 연꽃: 속 빈 꽃잎, 연밥, 줄기와 연잎
  M.lotus=function(c,s){stroke(c,curve([0,-s*.1],[s*.08,s*.5],[-s*.02,s*1.0],10,s*.05,s*.06,s*.05),.85,3);c.save();c.translate(-s*.5,s*.55);c.scale(1,.42);blob(c,0,0,s*.42,.55,5,.1);c.restore();stroke(c,curve([-s*.9,s*.55],[-s*.5,s*.42],[-s*.1,s*.56],8,s*.01,s*.05,s*.01),.9,6);stroke(c,curve([-s*.02,s*.7],[-s*.3,s*.7],[-s*.5,s*.56],6,s*.03,s*.035,s*.02),.8,7);
    [[-1.25,.62,.7],[1.25,.62,.7],[-.75,.75,.85],[.75,.75,.85],[-.3,.82,.95],[.3,.82,.95],[0,.9,1]].forEach(function(pt,k){var a=pt[0]-Math.PI/2,len=s*pt[1],w=s*.2*pt[2],ex=Math.cos(a)*len,ey=-s*.2+Math.sin(a)*len,nx=-Math.sin(a),ny=Math.cos(a),mx=ex*.5,my=-s*.2+(ey+s*.2)*.5;c.beginPath();c.moveTo(0,-s*.2);c.quadraticCurveTo(mx+nx*w,my+ny*w,ex,ey);c.quadraticCurveTo(mx-nx*w,my-ny*w,0,-s*.2);c.closePath();c.fillStyle='rgba('+LIGHT+',.93)';c.fill();var pg=c.createLinearGradient(0,-s*.2,ex,ey);pg.addColorStop(0,'rgba('+INK+',0)');pg.addColorStop(1,'rgba('+INK+',.38)');c.fillStyle=pg;c.fill();
      stroke(c,curve([0,-s*.2],[mx+nx*w,my+ny*w],[ex,ey],8,s*.012,s*.045,s*.01),.9,10+k);stroke(c,curve([0,-s*.2],[mx-nx*w,my-ny*w],[ex,ey],8,s*.012,s*.03,s*.01),.8,20+k);});
    blob(c,0,-s*.24,s*.1,.9,30,.08);};
  /* ── 움직이는 소재(사용자 11-15 "동적인것들위주로"): 파도·회오리·불길·구름. 그림은 한 장이고 앱이 돌리거나 흔든다. ── */
  // 파도: 말려 올라가는 물마루와 물보라
  M.wave=function(c,s){var i;for(i=0;i<3;i++)stroke(c,curve([-s*(1.1-i*.1),s*(.5+i*.18)],[-s*.2,s*(.2+i*.2)],[s*(1.1-i*.12),s*(.55+i*.16)],14,s*.01,s*(.14-i*.03),s*.01),.75-i*.15,3+i);
    var o=[];for(i=0;i<=34;i++){var t=i/34,a=Math.PI*.95-t*Math.PI*2.05,r=s*(.95-.62*t);o.push([s*.05+Math.cos(a)*r*.9,-s*.05-Math.sin(a)*r*.8+s*.25*t,s*(.04+.22*Math.sin(Math.min(1,t*1.25)*Math.PI))]);}stroke(c,o,.93,7);
    for(i=0;i<5;i++)stroke(c,curve([-s*(.75-i*.16),s*(.35-i*.02)],[-s*(.6-i*.2),-s*(.15+i*.05)],[-s*(.2-i*.16),-s*(.5+i*.03)],8,s*.01,s*.04,s*.006),.5,12+i);
    [[.62,-.62,.07],[.82,-.4,.05],[.45,-.82,.045],[.95,-.62,.035],[.7,-.9,.03],[1.02,-.25,.04],[.25,-.92,.03]].forEach(function(d,k){blob(c,d[0]*s,d[1]*s,d[2]*s,.8,30+k,.2);});flecks(c,0,-s*.2,s*1.2,s*.9,14,9);wash(c,0,s*.2,s*1.0,.14);};
  // 회오리: 가운데로 감겨 드는 두 갈래 붓 획(앱이 돌린다)
  M.whirl=function(c,s){wash(c,0,0,s*1.0,.2);for(var arm=0;arm<3;arm++){var o=[],i;for(i=0;i<=40;i++){var t=i/40,a=arm*Math.PI*2/3+t*Math.PI*2.3,r=s*(.96-.86*t);o.push([Math.cos(a)*r,Math.sin(a)*r,s*(.015+.2*Math.sin(Math.min(1,t*1.15)*Math.PI)*(1-.35*t))]);}stroke(c,o,arm?.8:.94,3+arm);}
    for(var k=0;k<9;k++){var a2=k*2.4,r2=s*(.55+.4*((k*7)%5)/5);blob(c,Math.cos(a2)*r2,Math.sin(a2)*r2,s*(.03+.02*(k%3)),.7,20+k,.2);}flecks(c,0,0,s*1.5,s*1.5,16,8);blob(c,0,0,s*.09,.95,40,.1);};
  // 불길: 세 갈래로 솟는 혀(앱이 세로로 일렁이게 한다)
  M.flame=function(c,s){wash(c,0,s*.5,s*.85,.28);var B=s*.9;
    [[-.36,.27,-.66,-.2,.8],[.4,.25,.6,-.42,.85],[0,.38,.1,-1.02,1]].forEach(function(f,k){var bx=f[0]*s,bw=f[1]*s,tx=f[2]*s,ty=f[3]*s,hh=B-ty;
      c.beginPath();c.moveTo(bx-bw,B);c.bezierCurveTo(bx-bw*1.5,B-hh*.45,tx-bw*.95,ty+hh*.4,tx,ty);c.bezierCurveTo(tx+bw*.25,ty+hh*.42,bx+bw*1.55,B-hh*.38,bx+bw,B);c.closePath();
      var g2=c.createLinearGradient(0,ty,0,B);g2.addColorStop(0,'rgba('+INK+',.95)');g2.addColorStop(.45,'rgba('+INK+','+(.6*f[4])+')');g2.addColorStop(1,'rgba('+INK+',.12)');c.fillStyle=g2;c.fill();
      c.beginPath();c.moveTo(bx-bw*.45,B);c.bezierCurveTo(bx-bw*.8,B-hh*.35,(bx+tx)/2-bw*.3,ty+hh*.55,(bx+tx*1.2)/2.2,ty+hh*.38);c.bezierCurveTo((bx+tx)/2+bw*.25,ty+hh*.6,bx+bw*.8,B-hh*.3,bx+bw*.45,B);c.closePath();c.fillStyle='rgba('+LIGHT+',.8)';c.fill();
      stroke(c,[[bx-bw,B,s*.04],[bx-bw*1.32,B-hh*.4,s*.11],[tx-bw*.5,ty+hh*.3,s*.07],[tx,ty,s*.01]],.94,3+k);stroke(c,[[bx+bw,B,s*.03],[bx+bw*1.3,B-hh*.36,s*.06],[tx+bw*.2,ty+hh*.34,s*.03],[tx,ty,s*.008]],.7,8+k);});
    c.save();c.translate(0,B);c.scale(1,.22);blob(c,0,0,s*.85,.7,44,.08);c.restore();
    [[-.75,-.5,.05],[.72,-.72,.045],[.3,-1.15,.035],[-.3,-.85,.03],[.85,-.2,.03]].forEach(function(d,k){blob(c,d[0]*s,d[1]*s,d[2]*s,.8,20+k,.2);});flecks(c,0,s*.3,s*.9,s*1.0,10,6);};
  // 구름: 말려 드는 뭉게구름(앱이 옆으로 흘린다)
  M.cloud=function(c,s){wash(c,0,0,s*1.1,.16);[[-.5,.15,.42],[.05,-.12,.52],[.55,.12,.4],[-.1,.3,.45]].forEach(function(b,k){c.beginPath();c.arc(b[0]*s,b[1]*s,b[2]*s,0,TAU);c.fillStyle='rgba('+LIGHT+',.9)';c.fill();});
    [[-.5,.15,.42,2.6],[.05,-.12,.52,3.4],[.55,.12,.4,-.4]].forEach(function(b,k){var o=[],i;for(i=0;i<=26;i++){var t=i/26,a=b[3]+t*Math.PI*2.4,r=b[2]*s*(1-.72*t);o.push([b[0]*s+Math.cos(a)*r,b[1]*s+Math.sin(a)*r,s*(.02+.1*Math.sin(Math.min(1,t*1.3)*Math.PI))]);}stroke(c,o,.9,3+k);});
    stroke(c,curve([-s*1.0,s*.5],[-s*.1,s*.72],[s*1.05,s*.45],12,s*.01,s*.1,s*.01),.8,10);stroke(c,curve([-s*1.25,s*.3],[-s*1.0,s*.42],[-s*.7,s*.5],6,s*.006,s*.05,s*.02),.7,11);stroke(c,curve([s*.7,s*.5],[s*1.05,s*.42],[s*1.3,s*.22],6,s*.02,s*.05,s*.006),.7,12);
    var cg=c.createLinearGradient(0,-s*.3,0,s*.6);cg.addColorStop(0,'rgba('+INK+',0)');cg.addColorStop(1,'rgba('+INK+',.3)');c.fillStyle=cg;c.beginPath();c.ellipse(0,s*.25,s*.95,s*.4,0,0,TAU);c.fill();flecks(c,0,s*.2,s*1.6,s*.5,10,7);};
  // 무기: 환도(칼)
  M.sword=function(c,s){stroke(c,[[0,-s*1.0,s*.01],[s*.04,-s*.6,s*.2],[s*.03,0,s*.23],[0,s*.42,s*.22]],.92,3);c.fillStyle='rgba('+PAPER+',.6)';c.fillRect(-s*.014,-s*.8,s*.028,s*1.15);
    stroke(c,[[-s*.3,s*.44,s*.09],[s*.3,s*.44,s*.09]],.95,4);stroke(c,[[0,s*.46,s*.1],[0,s*.92,s*.09]],.95,5);for(var i=0;i<4;i++){c.fillStyle='rgba('+PAPER+',.5)';c.fillRect(-s*.05,s*(.54+i*.09),s*.1,s*.02);}
    stroke(c,curve([0,s*.94],[s*.25,s*1.05],[s*.12,s*1.3],6,s*.02,s*.04,s*.005),.6,6);};
  // 무기: 창
  M.spear=function(c,s){stroke(c,[[0,-s*.55,s*.1],[s*.01,s*.2,s*.12],[0,s*1.0,s*.1]],.9,3);c.beginPath();c.moveTo(0,-s*1.05);c.quadraticCurveTo(s*.22,-s*.75,s*.035,-s*.52);c.lineTo(-s*.035,-s*.52);c.quadraticCurveTo(-s*.22,-s*.75,0,-s*1.05);c.fillStyle='rgba('+INK+',.94)';c.fill();c.fillStyle='rgba('+PAPER+',.6)';c.fillRect(-s*.008,-s*.98,s*.016,s*.4);
    for(var i=0;i<5;i++)stroke(c,curve([0,-s*.5],[(i-2)*s*.14,-s*.38],[(i-2)*s*.2,-s*.12-Math.abs(i-2)*s*.03],6,s*.03,s*.07,s*.008),.7,10+i);};
  // 보스 상징: 엽전(탐욕) — 네모 구멍 난 동전
  M.coin=function(c,s){c.beginPath();c.arc(0,0,s*.9,0,TAU);c.rect(s*.24,-s*.24,-s*.48,s*.48);c.fillStyle='rgba('+INK+',.34)';c.fill('evenodd');
    var o=[],i;for(i=0;i<=28;i++){var t=i/28*TAU*.985+.6;o.push([Math.cos(t)*s*.9,Math.sin(t)*s*.9,s*(.06+.07*Math.sin(i/28*Math.PI))]);}stroke(c,o,.93,3);
    stroke(c,[[-s*.26,-s*.26,s*.05],[s*.26,-s*.26,s*.06],[s*.26,s*.26,s*.05],[-s*.26,s*.26,s*.06],[-s*.26,-s*.3,s*.04]],.9,4);
    [[0,-.58],[0,.58],[-.58,0],[.58,0]].forEach(function(p,k){stroke(c,[[p[0]*s-s*.09,p[1]*s-s*.06,s*.04],[p[0]*s+s*.09,p[1]*s-s*.06,s*.04]],.8,5+k);stroke(c,[[p[0]*s,p[1]*s-s*.12,s*.04],[p[0]*s,p[1]*s+s*.12,s*.035]],.8,9+k);});flecks(c,0,0,s*1.4,s*1.4,10,8);};
  // 보스 상징: 입술(색욕) — 인주 규칙상 먹으로
  M.lips=function(c,s){c.beginPath();c.moveTo(-s,0);c.bezierCurveTo(-s*.6,-s*.5,-s*.25,-s*.62,0,-s*.34);c.bezierCurveTo(s*.25,-s*.62,s*.6,-s*.5,s,0);c.bezierCurveTo(s*.5,s*.75,-s*.5,s*.75,-s,0);c.closePath();var lg=c.createLinearGradient(0,-s*.6,0,s*.6);lg.addColorStop(0,'rgba('+INK+',.95)');lg.addColorStop(.5,'rgba('+INK+',.8)');lg.addColorStop(1,'rgba('+INK+',.6)');c.fillStyle=lg;c.fill();c.fillStyle='rgba('+PAPER+',.35)';c.beginPath();c.ellipse(s*.2,s*.3,s*.3,s*.07,-.1,0,TAU);c.fill();c.strokeStyle='rgba('+PAPER+',.85)';c.lineWidth=s*.045;c.beginPath();c.moveTo(-s*.86,0);c.quadraticCurveTo(0,s*.24,s*.86,0);c.stroke();flecks(c,0,s*.3,s*.9,s*.25,10,4);flecks(c,0,-s*.25,s*.9,s*.2,6,5);wash(c,0,0,s*1.15,.12);};
  // 보스 상징: 보스 고유 문양(엔진 GLYPHS 의 꺾은선 묶음)을 붓 획으로 쓴다. 엽전·입술이 아닌 보스는 모두 이 길로 그린다.
  M.glyph=function(c,s,polys){wash(c,0,0,s*1.15,.14);c.beginPath();c.arc(0,0,s*.93,0,TAU);c.fillStyle='rgba('+INK+',.16)';c.fill();var ring=[],j;for(j=0;j<=30;j++){var ta=j/30*TAU*.975+2.2;ring.push([Math.cos(ta)*s*.95,Math.sin(ta)*s*.95,s*(.04+.07*Math.sin(j/30*Math.PI))]);}stroke(c,ring,.9,21);(polys||[]).forEach(function(q,k){var o=[],n=q.length/2,i;for(i=0;i<n;i++){var t=n>1?i/(n-1):0;o.push([q[i*2]*s*.66,q[i*2+1]*s*.66,s*(.06+.08*Math.sin(t*Math.PI))]);}if(o.length>1)stroke(c,o,k?.8:.93,3+k);});flecks(c,0,0,s*1.5,s*1.5,10,9);};
  /* ── 서양 소재(사용자 11-15 "서양쪽 적테마와서사,보스에 맞는것도 수묵화버전으로"): 일곱 대죄·악마·교단·기계 서사에 맞춘 사물을 같은 붓 획과 먹 농담으로 그린다. 색은 먹과 한지뿐. ── */
  function ink(a){return 'rgba('+INK+','+a+')';}
  function light(a){return 'rgba('+LIGHT+','+a+')';}
  function ring(c,x,y,rx,ry,w,a,seed,from,span){var o=[],i,n=28;for(i=0;i<=n;i++){var t=(from==null?.6:from)+i/n*(span||TAU*.985);o.push([x+Math.cos(t)*rx,y+Math.sin(t)*ry,w*(.45+.7*Math.sin(i/n*Math.PI))]);}stroke(c,o,a,seed);}
  function shade(c,x0,y0,x1,y1,a0,a1){var g2=c.createLinearGradient(x0,y0,x1,y1);g2.addColorStop(0,ink(a0));g2.addColorStop(1,ink(a1));c.fillStyle=g2;c.fill();}
  function drop(c,x,y,r,a,seed){c.beginPath();c.moveTo(x,y-r*1.7);c.quadraticCurveTo(x+r*1.1,y,x,y+r);c.quadraticCurveTo(x-r*1.1,y,x,y-r*1.7);c.closePath();c.fillStyle=ink(a);c.fill();}
  // 성배: 넓은 잔, 마디 진 대, 둥근 받침. 잔에서 넘쳐 흐르는 먹
  M.chalice=function(c,s){wash(c,0,-s*.2,s*1.0,.13);
    c.beginPath();c.moveTo(-s*.6,-s*.85);c.bezierCurveTo(-s*.62,-s*.2,-s*.25,-s*.05,0,-s*.05);c.bezierCurveTo(s*.25,-s*.05,s*.62,-s*.2,s*.6,-s*.85);c.closePath();c.fillStyle=light(.93);c.fill();shade(c,-s*.6,0,s*.6,0,.6,.1);
    c.save();c.clip();for(var i=0;i<5;i++)stroke(c,curve([-s*(.5-i*.06),-s*.75],[-s*(.5-i*.08),-s*.3],[-s*(.2-i*.06),-s*.1],6,s*.01,s*.05,s*.01),.35,30+i);c.restore();
    stroke(c,curve([-s*.6,-s*.86],[-s*.66,-s*.08],[0,-s*.04],12,s*.05,s*.13,s*.08),.94,3);stroke(c,curve([s*.6,-s*.86],[s*.66,-s*.08],[0,-s*.04],12,s*.04,s*.07,s*.06),.86,4);
    c.save();c.translate(0,-s*.86);c.scale(1,.2);c.beginPath();c.arc(0,0,s*.6,0,TAU);c.fillStyle=ink(.78);c.fill();c.restore();ring(c,0,-s*.86,s*.6,s*.12,s*.06,.95,5);
    stroke(c,[[0,-s*.05,s*.14],[0,s*.14,s*.07],[0,s*.3,s*.07],[0,s*.74,s*.13]],.93,6);blob(c,0,s*.2,s*.14,.94,7,.08);
    c.save();c.translate(0,s*.88);c.scale(1,.3);blob(c,0,0,s*.5,.92,8,.05);c.restore();c.fillStyle='rgba('+PAPER+',.55)';c.fillRect(-s*.3,s*.85,s*.6,s*.02);
    stroke(c,curve([s*.42,-s*.84],[s*.5,-s*.5],[s*.44,-s*.2],6,s*.05,s*.04,s*.012),.9,9);drop(c,s*.44,-s*.08,s*.05,.9);drop(c,-s*.3,-s*.98,s*.04,.8);drop(c,s*.1,-s*1.05,s*.03,.7);flecks(c,0,-s*.45,s*.8,s*.6,8,6);};
  // 육망성(사용자 11-16: 십자가 대신): 위아래로 맞물린 두 삼각형을 굵은 붓 획으로, 꼭짓점마다 먹이 고이고 가운데는 옅은 담묵
  M.hexagram=function(c,s){wash(c,0,0,s*1.05,.15);var R=s*.92,i,k;
    c.beginPath();for(i=0;i<6;i++){var a0=-Math.PI/2+i*Math.PI/3,r0=R*.53;i?c.lineTo(Math.cos(a0)*r0,Math.sin(a0)*r0):c.moveTo(Math.cos(a0)*r0,Math.sin(a0)*r0);}c.closePath();c.fillStyle=ink(.22);c.fill();
    for(k=0;k<2;k++){var base=k?Math.PI/2:-Math.PI/2,P=[];for(i=0;i<3;i++){var a1=base+i*TAU/3;P.push([Math.cos(a1)*R,Math.sin(a1)*R]);}
      for(i=0;i<3;i++){var p0=P[i],p1=P[(i+1)%3],mx=(p0[0]+p1[0])/2,my=(p0[1]+p1[1])/2;stroke(c,curve([p0[0],p0[1]],[mx*1.03,my*1.03],[p1[0],p1[1]],10,s*.06,s*(k?.11:.14),s*.035),k?.82:.93,3+k*3+i);}
      P.forEach(function(q,n){blob(c,q[0],q[1],s*.075,.92,20+k*3+n,.2);});}
    c.beginPath();c.moveTo(-s*.26,0);c.quadraticCurveTo(0,-s*.19,s*.26,0);c.quadraticCurveTo(0,s*.19,-s*.26,0);c.closePath();c.fillStyle=ink(.9);c.fill();blob(c,0,0,s*.06,.95,33,.1); // 가운데 감긴 눈: 교단의 봉인진으로 읽히게(심사 2차)
    for(k=0;k<6;k++){var e=-Math.PI/2+k*Math.PI/3+Math.PI/6,ex=Math.cos(e)*R*.62,ey=Math.sin(e)*R*.62;stroke(c,[[ex-Math.sin(e)*s*.08,ey+Math.cos(e)*s*.08,s*.03],[ex+Math.sin(e)*s*.08,ey-Math.cos(e)*s*.08,s*.012]],.8,40+k);}
    [[.78,-.82,.04],[-.86,.7,.035],[.95,.4,.03]].forEach(function(d,n){drop(c,d[0]*s,d[1]*s,d[2]*s,.75);});flecks(c,0,0,s*1.5,s*1.5,10,8);};
  // 해골: 둥근 머리뼈, 깊은 눈구멍, 이빨
  M.skull=function(c,s){wash(c,0,0,s*1.05,.14);
    c.beginPath();c.arc(0,-s*.25,s*.66,Math.PI*.82,Math.PI*.18);c.bezierCurveTo(s*.52,s*.3,s*.36,s*.32,s*.34,s*.78);c.lineTo(-s*.34,s*.78);c.bezierCurveTo(-s*.36,s*.32,-s*.52,s*.3,-s*.53,s*.13);c.closePath();c.fillStyle=light(.95);c.fill();shade(c,-s*.6,-s*.6,s*.6,s*.7,.02,.42);
    ring(c,0,-s*.25,s*.66,s*.66,s*.11,.94,3,Math.PI*.8,Math.PI*1.42);stroke(c,[[-s*.53,s*.12,s*.09],[-s*.4,s*.36,s*.07],[-s*.35,s*.78,s*.07]],.92,4);stroke(c,[[s*.53,s*.12,s*.06],[s*.4,s*.36,s*.05],[s*.35,s*.78,s*.06]],.85,5);
    stroke(c,[[-s*.36,s*.8,s*.05],[0,s*.84,s*.07],[s*.36,s*.8,s*.05]],.92,6);
    [[-.27,-.14,1,11],[.27,-.14,-1,12]].forEach(function(e){c.save();c.translate(e[0]*s,e[1]*s);c.rotate(e[2]*.22);c.scale(1.15,.92);blob(c,0,0,s*.17,.93,e[3],.2);c.restore();wash(c,e[0]*s,e[1]*s+s*.04,s*.32,.34);stroke(c,curve([e[0]*s-e[2]*s*.2,e[1]*s-s*.2],[e[0]*s,e[1]*s-s*.27],[e[0]*s+e[2]*s*.2,e[1]*s-s*.14],5,s*.01,s*.04,s*.01),.7,e[3]+20);});
    c.beginPath();c.moveTo(0,s*.1);c.lineTo(s*.1,s*.34);c.lineTo(0,s*.3);c.lineTo(-s*.1,s*.34);c.closePath();c.fillStyle=ink(.93);c.fill();
    for(var i=-2;i<=2;i++)stroke(c,[[i*s*.13,s*.5,s*.03],[i*s*.13,s*.8,s*.022]],.85,20+i);stroke(c,[[-s*.33,s*.52,s*.03],[0,s*.56,s*.04],[s*.33,s*.52,s*.03]],.8,30);
    stroke(c,[[s*.12,-s*.9,s*.012],[s*.2,-s*.68,s*.035],[s*.1,-s*.55,s*.02],[s*.22,-s*.42,s*.008]],.8,31);flecks(c,-s*.1,-s*.5,s*.8,s*.4,8,9);};
  // 낫: 긴 자루와 초승달 날
  M.scythe=function(c,s){wash(c,-s*.3,-s*.6,s*.75,.15);
    stroke(c,[[-s*.32,s*1.02,s*.1],[-s*.16,s*.4,s*.085],[.02*s,-s*.2,s*.09],[s*.2,-s*.92,s*.08]],.93,3);
    var i;c.beginPath();c.moveTo(s*.27,-s*.83);c.bezierCurveTo(-s*.2,-s*1.26,-s*.82,-s*1.02,-s*.98,-s*.24);c.bezierCurveTo(-s*.7,-s*.52,-s*.3,-s*.6,s*.19,-s*.58);c.closePath();c.fillStyle=ink(.93);c.fill(); // 날은 자루 끝에서 왼쪽 아래로 휘는 초승달
    stroke(c,[[s*.27,-s*.83,s*.05],[-s*.2,-s*1.1,s*.1],[-s*.72,-s*.86,s*.09],[-s*.98,-s*.24,s*.012]],.95,5);
    c.strokeStyle='rgba('+PAPER+',.75)';c.lineWidth=s*.022;c.beginPath();c.moveTo(s*.14,-s*.64);c.bezierCurveTo(-s*.3,-s*.7,-s*.68,-s*.6,-s*.93,-s*.3);c.stroke();flecks(c,-s*.35,-s*.92,s*.8,s*.2,8,7);
    for(i=0;i<3;i++)stroke(c,[[s*(.1+i*.035),-s*(.8-i*.07),s*.045],[s*(.26+i*.035),-s*(.74-i*.07),s*.045]],.95,10+i);
    stroke(c,curve([s*.22,-s*.7],[s*.42,-s*.5],[s*.34,-s*.2],6,s*.03,s*.04,s*.006),.65,14);stroke(c,curve([s*.2,-s*.72],[s*.5,-s*.72],[s*.56,-s*.4],6,s*.03,s*.035,s*.006),.55,15);
    for(i=0;i<4;i++){c.fillStyle='rgba('+PAPER+',.5)';c.fillRect(-s*(.28-i*.03)-s*.04,s*(.8-i*.12),s*.09,s*.018);}drop(c,-s*.9,-s*.2,s*.04,.85);drop(c,-s*.82,s*.02,s*.028,.7);};
  // 왕관: 뾰족한 다섯 봉우리와 보석 띠
  M.crown=function(c,s){wash(c,0,0,s*1.05,.13);var P=[[-.82,.5],[-.96,-.4],[-.5,.05],[-.3,-.62],[0,0],[0,-.9],[0,0],[.3,-.62],[.5,.05],[.96,-.4],[.82,.5]];
    c.beginPath();c.moveTo(-s*.82,s*.5);[[-.96,-.4],[-.56,.02],[-.34,-.62],[-.14,-.02],[0,-.92],[.14,-.02],[.34,-.62],[.56,.02],[.96,-.4],[.82,.5]].forEach(function(p){c.lineTo(p[0]*s,p[1]*s);});c.closePath();c.fillStyle=light(.93);c.fill();shade(c,0,-s*.9,0,s*.5,.12,.72);
    stroke(c,[[-s*.82,s*.5,s*.06],[-s*.96,-s*.4,s*.05],[-s*.56,s*.02,s*.1],[-s*.34,-s*.62,s*.05],[-s*.14,-s*.02,s*.1],[0,-s*.92,s*.05],[s*.14,-s*.02,s*.1],[s*.34,-s*.62,s*.05],[s*.56,s*.02,s*.1],[s*.96,-s*.4,s*.05],[s*.82,s*.5,s*.06]],.0001,3);
    [[[-.82,.5],[-.96,-.4]],[[-.96,-.4],[-.56,.02]],[[-.56,.02],[-.34,-.62]],[[-.34,-.62],[-.14,-.02]],[[-.14,-.02],[0,-.92]],[[0,-.92],[.14,-.02]],[[.14,-.02],[.34,-.62]],[[.34,-.62],[.56,.02]],[[.56,.02],[.96,-.4]],[[.96,-.4],[.82,.5]]].forEach(function(e,k){stroke(c,[[e[0][0]*s,e[0][1]*s,s*(k%2?.09:.035)],[(e[0][0]+e[1][0])/2*s,(e[0][1]+e[1][1])/2*s,s*.075],[e[1][0]*s,e[1][1]*s,s*(k%2?.035:.09)]],.94,5+k);});
    [[-.96,-.4,.1],[-.34,-.62,.085],[0,-.92,.11],[.34,-.62,.085],[.96,-.4,.1]].forEach(function(t,k){blob(c,t[0]*s,t[1]*s-s*.04,t[2]*s,.95,20+k,.1);});
    stroke(c,curve([-s*.84,s*.5],[0,s*.66],[s*.84,s*.5],10,s*.14,s*.2,s*.14),.94,30);stroke(c,curve([-s*.86,s*.22],[0,s*.36],[s*.86,s*.22],10,s*.04,s*.06,s*.04),.85,31);
    [-.55,-.28,0,.28,.55].forEach(function(x,k){c.beginPath();c.arc(x*s,s*(.56-Math.abs(x)*.1),s*.05,0,TAU);c.fillStyle='rgba('+PAPER+',.85)';c.fill();});
    stroke(c,[[0,-s*1.08,s*.035],[0,-s*.9,s*.035]],.9,40);stroke(c,[[-s*.07,-s*1.01,s*.03],[s*.07,-s*1.01,s*.03]],.9,41);flecks(c,0,s*.1,s*1.2,s*.5,8,7);};
  // 사슬: 엇갈려 물린 고리 다섯, 끝 고리는 끊겨 벌어짐(앱이 흔든다)
  M.chain=function(c,s){wash(c,0,0,s*.7,.12);for(var i=0;i<5;i++){var y=s*(-.82+i*.4),x=s*(i%2?-.06:.06);
      if(i%2){c.beginPath();c.ellipse(x,y,s*.09,s*.27,.12,0,TAU);c.fillStyle=ink(.3);c.fill();ring(c,x,y,s*.085,s*.27,s*.1,.95,3+i,1.2);}
      else{c.beginPath();c.ellipse(x,y,s*.2,s*.25,-.1,0,TAU);c.fillStyle=light(.6);c.fill();ring(c,x,y,s*.2,s*.25,s*.105,.93,3+i,i===4?-.9:2.2,i===4?TAU*.8:TAU*.985);}}
    stroke(c,[[s*.3,s*.92,s*.05],[s*.42,s*1.02,s*.03],[s*.5,s*1.0,s*.01]],.8,20);drop(c,-s*.2,s*1.02,s*.035,.7);flecks(c,0,0,s*.5,s*1.8,10,9);};
  // 촛대: 세 갈래 촛대와 촛불, 흘러내린 촛농
  M.candle=function(c,s){wash(c,0,-s*.5,s*.95,.12);
    stroke(c,[[0,-s*.3,s*.07],[0,s*.1,s*.1],[0,s*.45,s*.07],[0,s*.8,s*.13]],.94,3);blob(c,0,s*.1,s*.13,.94,4,.08);c.save();c.translate(0,s*.9);c.scale(1,.3);blob(c,0,0,s*.48,.93,5,.05);c.restore();
    stroke(c,curve([0,s*.02],[-s*.5,s*.22],[-s*.55,-s*.2],10,s*.05,s*.085,s*.06),.92,6);stroke(c,curve([0,s*.02],[s*.5,s*.22],[s*.55,-s*.2],10,s*.05,s*.075,s*.06),.9,7);
    [[-.55,-.2,.34],[0,-.3,.42],[.55,-.2,.34]].forEach(function(k,j){var x=k[0]*s,y=k[1]*s,h=k[2]*s;stroke(c,[[x-s*.15,y,s*.05],[x+s*.15,y,s*.05]],.95,10+j);
      c.fillStyle=light(.95);c.fillRect(x-s*.075,y-h,s*.15,h);c.fillStyle=ink(.22);c.fillRect(x+s*.01,y-h,s*.065,h);stroke(c,[[x-s*.078,y-h,s*.03],[x-s*.078,y,s*.035]],.92,13+j);stroke(c,[[x+s*.078,y-h,s*.022],[x+s*.078,y,s*.028]],.85,16+j);
      stroke(c,[[x-s*.09,y-h,s*.04],[x-s*.04,y-h+s*.1,s*.05],[x-s*.045,y-h+s*.17,s*.015]],.9,19+j);stroke(c,[[x,y-h,s*.012],[x,y-h-s*.07,s*.012]],.95,22+j);
      var fy=y-h-s*.07;c.beginPath();c.moveTo(x,fy-s*.3);c.quadraticCurveTo(x+s*.15,fy-s*.06,x,fy);c.quadraticCurveTo(x-s*.15,fy-s*.06,x,fy-s*.3);c.closePath();c.fillStyle=ink(.9);c.fill();
      c.beginPath();c.moveTo(x,fy-s*.17);c.quadraticCurveTo(x+s*.06,fy-s*.04,x,fy-s*.015);c.quadraticCurveTo(x-s*.06,fy-s*.04,x,fy-s*.17);c.closePath();c.fillStyle=light(.9);c.fill();wash(c,x,fy-s*.14,s*.3,.16);});
    flecks(c,0,s*.4,s*.3,s*.9,6,8);};
  // 열쇠: 고리 머리와 긴 대, 두 갈래 이
  M.key=function(c,s){wash(c,0,-s*.5,s*.75,.13);
    c.beginPath();c.arc(0,-s*.64,s*.34,0,TAU);c.fillStyle=light(.6);c.fill();ring(c,0,-s*.64,s*.34,s*.34,s*.15,.94,3,1.3);
    [[-1,0],[1,0],[0,-1]].forEach(function(d,k){blob(c,d[0]*s*.4,-s*.64+d[1]*s*.4,s*.085,.94,5+k,.1);});ring(c,0,-s*.64,s*.13,s*.13,s*.05,.85,9);
    stroke(c,[[0,-s*.3,s*.12],[s*.01,s*.2,s*.085],[0,s*.98,s*.1]],.94,10);stroke(c,[[-s*.1,-s*.24,s*.05],[s*.1,-s*.24,s*.05]],.95,11);stroke(c,[[-s*.08,-s*.12,s*.035],[s*.08,-s*.12,s*.035]],.9,12);
    stroke(c,[[0,s*.62,s*.09],[s*.3,s*.62,s*.1]],.94,13);stroke(c,[[s*.28,s*.56,s*.08],[s*.28,s*.76,s*.07]],.94,14);stroke(c,[[0,s*.86,s*.09],[s*.24,s*.86,s*.1]],.94,15);stroke(c,[[s*.13,s*.62,s*.05],[s*.13,s*.74,s*.04]],.9,16);
    c.fillStyle='rgba('+PAPER+',.55)';c.fillRect(-s*.012,-s*.2,s*.024,s*1.1);flecks(c,0,-s*.64,s*.7,s*.7,8,7);};
  // 모래시계: 두 유리 방, 떨어지는 모래, 위아래 받침과 기둥
  M.hourglass=function(c,s){wash(c,0,0,s*1.0,.13);
    c.beginPath();c.moveTo(-s*.46,-s*.8);c.bezierCurveTo(-s*.46,-s*.3,-s*.06,-s*.2,-s*.06,0);c.bezierCurveTo(-s*.06,s*.2,-s*.46,s*.3,-s*.46,s*.8);c.lineTo(s*.46,s*.8);c.bezierCurveTo(s*.46,s*.3,s*.06,s*.2,s*.06,0);c.bezierCurveTo(s*.06,-s*.2,s*.46,-s*.3,s*.46,-s*.8);c.closePath();c.fillStyle=light(.93);c.fill();shade(c,-s*.5,0,s*.5,0,.02,.3);
    c.save();c.clip();c.beginPath();c.moveTo(-s*.5,-s*.52);c.quadraticCurveTo(0,-s*.42,s*.5,-s*.52);c.lineTo(s*.06,0);c.lineTo(-s*.06,0);c.closePath();c.fillStyle=ink(.82);c.fill();
    c.beginPath();c.moveTo(-s*.5,s*.8);c.quadraticCurveTo(-s*.3,s*.52,0,s*.34);c.quadraticCurveTo(s*.3,s*.52,s*.5,s*.8);c.closePath();c.fillStyle=ink(.86);c.fill();c.restore();
    stroke(c,[[0,0,s*.03],[0,s*.36,s*.025]],.9,3);
    stroke(c,[[-s*.46,-s*.8,s*.06],[-s*.44,-s*.4,s*.08],[-s*.07,0,s*.05],[-s*.44,s*.4,s*.08],[-s*.46,s*.8,s*.06]],.93,4);stroke(c,[[s*.46,-s*.8,s*.045],[s*.44,-s*.4,s*.06],[s*.07,0,s*.04],[s*.44,s*.4,s*.06],[s*.46,s*.8,s*.045]],.86,5);
    stroke(c,[[-s*.66,-s*.88,s*.15],[0,-s*.9,s*.17],[s*.66,-s*.88,s*.15]],.95,6);stroke(c,[[-s*.66,s*.88,s*.15],[0,s*.9,s*.18],[s*.66,s*.88,s*.15]],.95,7);
    stroke(c,[[-s*.6,-s*.8,s*.055],[-s*.62,0,s*.04],[-s*.6,s*.8,s*.055]],.88,8);stroke(c,[[s*.6,-s*.8,s*.05],[s*.62,0,s*.035],[s*.6,s*.8,s*.05]],.8,9);blob(c,-s*.61,0,s*.055,.9,10,.1);blob(c,s*.61,0,s*.05,.85,11,.1);
    flecks(c,0,s*.62,s*.6,s*.25,8,6);flecks(c,0,-s*.36,s*.5,s*.2,5,7);};
  // 날개: 어깨 관절에서 부채꼴로 퍼지는 큰 깃 일곱, 안쪽 작은 깃은 담묵 한 층(타락 천사)
  M.wing=function(c,s){wash(c,0,0,s*1.0,.12);var ox=-s*.62,oy=-s*.15,i;
    for(i=0;i<7;i++){var a=-.5+i*.33,len=s*(1.5-.085*i-(i>4?.12*(i-4):0)),ex=ox+Math.cos(a)*len,ey=oy+Math.sin(a)*len,mx=ox+Math.cos(a-.2)*len*.55,my=oy+Math.sin(a-.2)*len*.55,o=curve([ox+Math.cos(a)*s*.18,oy+Math.sin(a)*s*.18],[mx,my],[ex,ey],12,s*.05,s*.24,s*.01);
      stroke(c,o,.34,60+i);stroke(c,o.map(function(q,k){return [q[0]+Math.sin(a)*q[2]*.38,q[1]-Math.cos(a)*q[2]*.38,q[2]*.42];}),i%2?.86:.94,10+i);
      c.strokeStyle='rgba('+PAPER+',.5)';c.lineWidth=s*.012;c.beginPath();c.moveTo(o[2][0],o[2][1]);c.quadraticCurveTo(mx,my,o[10][0],o[10][1]);c.stroke();}
    for(i=0;i<6;i++){var b=-.35+i*.3,l2=s*(.62-.03*i);stroke(c,curve([ox+Math.cos(b)*s*.1,oy+Math.sin(b)*s*.1],[ox+Math.cos(b-.15)*l2*.6,oy+Math.sin(b-.15)*l2*.6],[ox+Math.cos(b)*l2,oy+Math.sin(b)*l2],7,s*.04,s*.16,s*.02),.5,30+i);}
    stroke(c,curve([ox-s*.1,oy+s*.5],[ox-s*.22,oy+s*.02],[ox+s*.12,oy-s*.28],8,s*.05,s*.2,s*.08),.95,3);stroke(c,curve([ox+s*.1,oy-s*.28],[ox+s*.7,oy-s*.62],[ox+s*1.4,oy-s*.42],10,s*.1,s*.13,s*.012),.95,4);blob(c,ox,oy-s*.02,s*.15,.9,5,.14);
    [[.3,.86,.05],[.62,.7,.04],[-.1,.96,.035]].forEach(function(d,k){stroke(c,curve([d[0]*s,d[1]*s],[d[0]*s+s*.06,d[1]*s+s*.06],[d[0]*s+s*.02,d[1]*s+s*.16],5,s*.01,d[2]*s,s*.008),.55,70+k);});};
  // 뿔: 이마뼈에서 솟아 안으로 굽는 한 쌍의 뿔
  M.horn=function(c,s){wash(c,0,s*.2,s*1.05,.14);[-1,1].forEach(function(d){var o=[],i;for(i=0;i<=18;i++){var t=i/18,a=Math.PI*(.5+.02)+t*Math.PI*.92,r=s*(.52+.1*t);o.push([d*(s*.2+s*.38-Math.cos(a-Math.PI/2)*r*.0+Math.sin(t*Math.PI*.62)*s*.52- t*t*s*.3),s*.58-t*s*1.5+Math.sin(t*Math.PI)*s*.06,s*(.36*(1-t)+.02)]);}stroke(c,o,d<0?.95:.9,3+d);
      for(i=2;i<16;i+=2){var q=o[i],n=o[i+1];c.strokeStyle='rgba('+PAPER+',.5)';c.lineWidth=s*.018;c.beginPath();c.moveTo(q[0]-q[2]*.42,q[1]+s*.02);c.lineTo(q[0]+q[2]*.42,q[1]-s*.02);c.stroke();}});
    c.beginPath();c.moveTo(-s*.5,s*.5);c.quadraticCurveTo(0,s*.28,s*.5,s*.5);c.quadraticCurveTo(s*.34,s*.98,0,s*1.0);c.quadraticCurveTo(-s*.34,s*.98,-s*.5,s*.5);c.closePath();c.fillStyle=light(.93);c.fill();shade(c,0,s*.3,0,s*1.0,.75,.25);
    stroke(c,curve([-s*.52,s*.5],[0,s*.26],[s*.52,s*.5],10,s*.06,s*.11,s*.06),.94,10);stroke(c,curve([-s*.5,s*.52],[-s*.36,s*.96],[0,s*1.0],8,s*.05,s*.07,s*.04),.9,11);stroke(c,curve([s*.5,s*.52],[s*.36,s*.96],[0,s*1.0],8,s*.04,s*.05,s*.04),.82,12);
    blob(c,-s*.2,s*.68,s*.1,.95,13,.12);blob(c,s*.2,s*.68,s*.1,.95,14,.12);flecks(c,0,s*.5,s*.7,s*.2,6,9);};
  // 거울: 금이 간 타원 손거울
  M.mirror=function(c,s){wash(c,0,-s*.2,s*1.0,.13);c.beginPath();c.ellipse(0,-s*.28,s*.52,s*.66,0,0,TAU);c.fillStyle=light(.95);c.fill();shade(c,-s*.5,-s*.9,s*.5,s*.4,.03,.36);
    c.save();c.clip();for(var i=0;i<3;i++)stroke(c,[[-s*(.5-i*.22),-s*.1+i*s*.1,s*.06],[-s*(.1-i*.22),-s*.9+i*s*.1,s*.03]],.16,30+i);
    [[[.05,-.3],[.3,-.62],[.5,-.7]],[[.05,-.3],[-.2,-.55],[-.25,-.95]],[[.05,-.3],[-.3,-.1],[-.55,-.12]],[[.05,-.3],[.2,.05],[.1,.4]],[[.05,-.3],[.42,-.2],[.55,0]],[[-.2,-.55],[-.42,-.6],[-.5,-.5]],[[.2,.05],[.4,.2],[.45,.3]]].forEach(function(l,k){stroke(c,l.map(function(p,j){return [p[0]*s,p[1]*s,s*(j===0?.035:j===1?.022:.006)];}),.85,40+k);});c.restore();
    ring(c,0,-s*.28,s*.55,s*.69,s*.17,.94,3,2.0);ring(c,0,-s*.28,s*.43,s*.57,s*.03,.6,4,.3);
    [[0,-1.0,.1],[-.58,-.28,.07],[.58,-.28,.07]].forEach(function(b,k){blob(c,b[0]*s,b[1]*s,b[2]*s,.94,6+k,.1);});stroke(c,curve([-s*.2,-s*1.02],[0,-s*1.2],[s*.2,-s*1.02],6,s*.02,s*.06,s*.02),.9,9);
    blob(c,0,s*.44,s*.11,.94,10,.08);stroke(c,[[0,s*.44,s*.12],[0,s*.7,s*.09],[0,s*.98,s*.13]],.94,11);stroke(c,[[-s*.1,s*.56,s*.035],[s*.1,s*.56,s*.035]],.9,12);
    flecks(c,0,-s*.28,s*1.2,s*1.4,8,9);};
  // 톱니바퀴: 이 여덟 개와 살(앱이 돌린다)
  M.gear=function(c,s){wash(c,0,0,s*1.05,.14);var i;for(i=0;i<8;i++){var a=i/8*TAU+.2;stroke(c,[[Math.cos(a)*s*.6,Math.sin(a)*s*.6,s*.34],[Math.cos(a)*s*.92,Math.sin(a)*s*.92,s*.24]],i%2?.6:.78,3+i);}
    c.beginPath();c.arc(0,0,s*.66,0,TAU);c.arc(0,0,s*.4,0,TAU,true);c.fillStyle=ink(.5);c.fill('evenodd');c.beginPath();c.arc(0,0,s*.4,0,TAU);c.fillStyle=light(.9);c.fill();
    ring(c,0,0,s*.66,s*.66,s*.07,.95,12,1.0);ring(c,0,0,s*.4,s*.4,s*.06,.9,13,3.0);
    for(i=0;i<4;i++){var b=i/4*TAU+.6;stroke(c,[[Math.cos(b)*s*.1,Math.sin(b)*s*.1,s*.11],[Math.cos(b)*s*.42,Math.sin(b)*s*.42,s*.08]],.92,20+i);}
    blob(c,0,0,s*.16,.95,30,.06);c.beginPath();c.arc(0,0,s*.055,0,TAU);c.fillStyle='rgba('+PAPER+',.9)';c.fill();
    for(i=0;i<8;i++){var d=i/8*TAU+.2;c.fillStyle='rgba('+PAPER+',.5)';c.fillRect(Math.cos(d)*s*.56-1.2,Math.sin(d)*s*.56-1.2,2.4,2.4);}flecks(c,0,0,s*1.2,s*1.2,10,8);};
  // 종: 나팔처럼 벌어진 몸, 추, 고리(앱이 흔든다)
  M.bell=function(c,s){wash(c,0,0,s*1.0,.13);c.beginPath();c.moveTo(-s*.18,-s*.68);c.bezierCurveTo(-s*.5,-s*.55,-s*.42,s*.1,-s*.78,s*.5);c.quadraticCurveTo(0,s*.68,s*.78,s*.5);c.bezierCurveTo(s*.42,s*.1,s*.5,-s*.55,s*.18,-s*.68);c.closePath();c.fillStyle=light(.93);c.fill();shade(c,-s*.6,0,s*.7,0,.85,.2);
    c.save();c.clip();c.fillStyle=light(.55);c.beginPath();c.ellipse(s*.2,-s*.1,s*.09,s*.4,.12,0,TAU);c.fill();stroke(c,curve([-s*.6,s*.2],[0,s*.34],[s*.6,s*.2],8,s*.02,s*.05,s*.02),.5,30);stroke(c,curve([-s*.46,-s*.2],[0,-s*.1],[s*.46,-s*.2],8,s*.02,s*.04,s*.02),.4,31);c.restore();
    stroke(c,[[-s*.18,-s*.68,s*.06],[-s*.4,-s*.4,s*.1],[-s*.48,s*.1,s*.09],[-s*.78,s*.5,s*.07]],.95,3);stroke(c,[[s*.18,-s*.68,s*.05],[s*.4,-s*.4,s*.07],[s*.48,s*.1,s*.06],[s*.78,s*.5,s*.06]],.88,4);
    stroke(c,curve([-s*.82,s*.5],[0,s*.7],[s*.82,s*.5],12,s*.1,s*.17,s*.1),.95,5);stroke(c,curve([-s*.2,-s*.68],[0,-s*.76],[s*.2,-s*.68],6,s*.05,s*.08,s*.05),.94,6);
    ring(c,0,-s*.86,s*.12,s*.13,s*.07,.94,7,1.4);stroke(c,[[0,s*.56,s*.05],[0,s*.74,s*.04]],.9,8);blob(c,0,s*.82,s*.12,.95,9,.08);
    [[-1,.0],[1,.0]].forEach(function(d,k){for(var j=0;j<2;j++)stroke(c,curve([d[0]*s*(.92+j*.14),s*(.2-j*.05)],[d[0]*s*(1.02+j*.14),s*.42],[d[0]*s*(.92+j*.14),s*(.66+j*.05)],6,s*.008,s*(.05-j*.015),s*.008),.6-j*.2,40+k*3+j);});flecks(c,-s*.2,s*.1,s*.6,s*.8,8,6);};
  // 가면: 반은 희고 반은 먹에 잠긴 얼굴 가면, 눈물 자국과 끈
  M.mask=function(c,s){wash(c,0,0,s*1.05,.13);c.beginPath();c.moveTo(0,-s*.88);c.bezierCurveTo(s*.62,-s*.9,s*.66,-s*.2,s*.5,s*.3);c.bezierCurveTo(s*.4,s*.66,s*.16,s*.9,0,s*.92);c.bezierCurveTo(-s*.16,s*.9,-s*.4,s*.66,-s*.5,s*.3);c.bezierCurveTo(-s*.66,-s*.2,-s*.62,-s*.9,0,-s*.88);c.closePath();c.fillStyle=light(.96);c.fill();
    c.save();c.clip();c.fillStyle=ink(.78);c.beginPath();c.moveTo(s*.02,-s);c.bezierCurveTo(-s*.08,-s*.4,s*.12,s*.2,-s*.02,s);c.lineTo(s,s);c.lineTo(s,-s);c.closePath();c.fill();for(var i=0;i<6;i++)stroke(c,curve([s*(.08+i*.02),-s*(.8-i*.3)],[-s*.1,-s*(.7-i*.3)],[-s*(.2+.06*(i%2)),-s*(.62-i*.3)],5,s*.03,s*.035,s*.004),.5,30+i);c.restore();
    stroke(c,[[0,-s*.88,s*.06],[-s*.5,-s*.72,s*.1],[-s*.6,-s*.2,s*.09],[-s*.5,s*.3,s*.08],[-s*.3,s*.72,s*.07],[0,s*.92,s*.05]],.94,3);stroke(c,[[0,-s*.88,s*.05],[s*.5,-s*.72,s*.07],[s*.6,-s*.2,s*.06],[s*.5,s*.3,s*.06],[s*.3,s*.72,s*.05],[0,s*.92,s*.05]],.9,4);
    c.beginPath();c.moveTo(-s*.42,-s*.2);c.quadraticCurveTo(-s*.26,-s*.4,-s*.08,-s*.2);c.quadraticCurveTo(-s*.26,-s*.1,-s*.42,-s*.2);c.closePath();c.fillStyle=ink(.95);c.fill();
    c.beginPath();c.moveTo(s*.42,-s*.2);c.quadraticCurveTo(s*.26,-s*.4,s*.08,-s*.2);c.quadraticCurveTo(s*.26,-s*.1,s*.42,-s*.2);c.closePath();c.fillStyle=light(.95);c.fill();
    stroke(c,curve([-s*.46,-s*.42],[-s*.26,-s*.56],[-s*.06,-s*.4],6,s*.015,s*.05,s*.015),.85,5);c.strokeStyle='rgba('+PAPER+',.8)';c.lineWidth=s*.035;c.beginPath();c.moveTo(s*.46,-s*.42);c.quadraticCurveTo(s*.26,-s*.56,s*.06,-s*.4);c.stroke();
    stroke(c,[[-s*.02,-s*.18,s*.02],[-s*.07,s*.2,s*.045],[s*.02,s*.24,s*.02]],.8,6);stroke(c,curve([-s*.24,s*.5],[-s*.1,s*.62],[0,s*.52],5,s*.012,s*.05,s*.03),.9,7);c.beginPath();c.moveTo(0,s*.52);c.quadraticCurveTo(s*.12,s*.44,s*.24,s*.46);c.stroke();
    stroke(c,[[-s*.25,-s*.1,s*.03],[-s*.27,s*.2,s*.04],[-s*.25,s*.42,s*.012]],.8,8);drop(c,-s*.25,s*.5,s*.035,.85);
    stroke(c,curve([-s*.58,-s*.25],[-s*.9,-s*.1],[-s*.82,s*.4],7,s*.04,s*.05,s*.008),.75,9);stroke(c,curve([s*.58,-s*.25],[s*.92,-s*.2],[s*.9,s*.3],7,s*.04,s*.045,s*.008),.7,10);};
  // 장미: 초승달 꽃잎 몇 장과 봉오리 한 점, 한 번에 그은 가시 줄기와 잎
  M.rose=function(c,s){wash(c,0,-s*.42,s*.85,.13);stroke(c,curve([0,-s*.05],[s*.14,s*.45],[-s*.04,s*1.02],12,s*.05,s*.07,s*.02),.9,3);
    [[.05,.22,1],[.06,.52,-1],[.0,.8,1]].forEach(function(t,k){stroke(c,[[t[0]*s,t[1]*s,s*.05],[t[0]*s+t[2]*s*.14,t[1]*s-s*.06,s*.006]],.9,10+k);});
    [[-1,.36,.5],[1,.62,.42]].forEach(function(l,k){var x0=s*.05,y0=l[1]*s,x1=l[0]*s*l[2],y1=y0-s*.12;stroke(c,curve([x0,y0],[(x0+x1)/2,y0-s*.2],[x1,y1],8,s*.02,s*.19,s*.008),k?.6:.8,14+k);c.strokeStyle='rgba('+PAPER+',.55)';c.lineWidth=s*.014;c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo((x0+x1)/2,y0-s*.12,x1,y1);c.stroke();});
    c.beginPath();c.arc(0,-s*.45,s*.5,0,TAU);c.fillStyle=light(.55);c.fill();
    [[2.6,.5,1.5,.2,.93],[.5,.5,1.5,.19,.88],[-1.6,.47,1.35,.17,.9],[1.5,.33,1.3,.15,.85],[-.5,.3,1.3,.14,.82],[3.6,.3,1.2,.13,.8]].forEach(function(pt,k){var o=[],i,n=14;for(i=0;i<=n;i++){var t=i/n,a=pt[0]+(t-.5)*pt[2]*2;o.push([Math.cos(a)*s*pt[1],-s*.45+Math.sin(a)*s*pt[1]*.92,s*(.015+pt[3]*Math.sin(t*Math.PI))]);}stroke(c,o,pt[4],20+k);});
    stroke(c,curve([-s*.1,-s*.5],[0,-s*.62],[s*.1,-s*.46],6,s*.02,s*.09,s*.02),.95,40);blob(c,0,-s*.45,s*.07,.95,41,.12);
    for(var i=0;i<3;i++)stroke(c,curve([(i-1)*s*.12,-s*.04],[(i-1)*s*.24,s*.08],[(i-1)*s*.36,s*.02],4,s*.05,s*.04,s*.006),.8,50+i);drop(c,s*.52,s*.12,s*.04,.7);drop(c,-s*.56,0,s*.03,.55);};
  // 거미줄: 여덟 살과 늘어진 가로줄, 줄에 매달린 거미
  M.web=function(c,s){wash(c,0,0,s*1.0,.16);var i,j,A=[];for(i=0;i<8;i++){A.push(i/8*TAU+.15+.08*Math.sin(i*2.3));stroke(c,[[0,0,s*.03],[Math.cos(A[i])*s*.5,Math.sin(A[i])*s*.5,s*.05],[Math.cos(A[i])*s*.98,Math.sin(A[i])*s*.98,s*.015]],.9,3+i);}
    for(j=1;j<=4;j++)for(i=0;i<8;i++){var a=A[i],b=A[(i+1)%8]+(i===7?TAU:0),r=s*(.2*j+.02),m=(a+b)/2;stroke(c,curve([Math.cos(a)*r,Math.sin(a)*r],[Math.cos(m)*r*.74,Math.sin(m)*r*.74],[Math.cos(b)*r,Math.sin(b)*r],6,s*.02,s*(.05-.006*j),s*.02),.92-.06*j,20+j*8+i);}
    blob(c,0,0,s*.07,.95,60,.1);[[.3,-.2,.03],[-.42,.3,.035],[.1,.62,.03],[-.2,-.6,.03],[.66,.2,.025]].forEach(function(d,k){blob(c,d[0]*s,d[1]*s,d[2]*s,.75,61+k,.1);});
    stroke(c,[[s*.38,s*.34,s*.012],[s*.4,s*.62,s*.012]],.85,70);blob(c,s*.4,s*.7,s*.085,.96,71,.08);blob(c,s*.4,s*.6,s*.05,.96,72,.08);for(i=0;i<4;i++){stroke(c,curve([s*.4,s*.66],[s*(.52+i*.02),s*(.56+i*.05)],[s*(.56+i*.015),s*(.68+i*.06)],4,s*.012,s*.016,s*.006),.9,73+i);stroke(c,curve([s*.4,s*.66],[s*(.28-i*.02),s*(.56+i*.05)],[s*(.24-i*.015),s*(.68+i*.06)],4,s*.012,s*.016,s*.006),.9,77+i);}};
  // 약병: 코르크 마개와 둥근 몸, 반쯤 찬 먹빛 약과 기포
  M.vial=function(c,s){wash(c,0,s*.2,s*.95,.13);c.beginPath();c.moveTo(-s*.14,-s*.7);c.lineTo(-s*.14,-s*.2);c.bezierCurveTo(-s*.62,-s*.05,-s*.7,s*.7,-s*.3,s*.88);c.lineTo(s*.3,s*.88);c.bezierCurveTo(s*.7,s*.7,s*.62,-s*.05,s*.14,-s*.2);c.lineTo(s*.14,-s*.7);c.closePath();c.fillStyle=light(.94);c.fill();shade(c,-s*.6,0,s*.6,0,.02,.26);
    c.save();c.clip();c.beginPath();c.moveTo(-s,s*.3);c.quadraticCurveTo(-s*.25,s*.2,0,s*.3);c.quadraticCurveTo(s*.25,s*.4,s,s*.28);c.lineTo(s,s);c.lineTo(-s,s);c.closePath();c.fillStyle=ink(.84);c.fill();
    [[-.2,.55,.07],[.14,.66,.05],[.02,.46,.04],[-.05,.1,.045],[.08,-.1,.03],[0,-.4,.025]].forEach(function(b,k){c.beginPath();c.arc(b[0]*s,b[1]*s,b[2]*s,0,TAU);if(b[1]>.3){c.fillStyle='rgba('+PAPER+',.8)';c.fill();}else{c.lineWidth=s*.02;c.strokeStyle=ink(.8);c.stroke();}});c.restore();
    stroke(c,[[-s*.14,-s*.7,s*.05],[-s*.14,-s*.2,s*.06],[-s*.52,s*.1,s*.09],[-s*.56,s*.55,s*.1],[-s*.3,s*.88,s*.07]],.94,3);stroke(c,[[s*.14,-s*.7,s*.04],[s*.14,-s*.2,s*.05],[s*.52,s*.1,s*.06],[s*.56,s*.55,s*.07],[s*.3,s*.88,s*.06]],.87,4);stroke(c,[[-s*.32,s*.89,s*.07],[0,s*.92,s*.09],[s*.32,s*.89,s*.07]],.94,5);
    stroke(c,[[-s*.24,-s*.7,s*.07],[s*.24,-s*.7,s*.07]],.95,6);c.fillStyle=ink(.9);c.fillRect(-s*.13,-s*.96,s*.26,s*.24);c.fillStyle='rgba('+PAPER+',.5)';for(var i=0;i<3;i++)c.fillRect(-s*.1,-s*(.92-i*.07),s*.2,s*.015);
    c.fillStyle=light(.6);c.beginPath();c.ellipse(-s*.36,s*.3,s*.045,s*.2,.25,0,TAU);c.fill();stroke(c,curve([s*.26,-s*.76],[s*.5,-s*.62],[s*.42,-s*.4],5,s*.02,s*.03,s*.006),.6,7);drop(c,s*.4,-s*.28,s*.03,.7);};
  // 눈: 지켜보는 큰 눈, 속눈썹과 흘러내린 먹 눈물
  M.eye=function(c,s){wash(c,0,0,s*1.05,.13);c.beginPath();c.moveTo(-s*.95,0);c.quadraticCurveTo(0,-s*.82,s*.95,0);c.quadraticCurveTo(0,s*.7,-s*.95,0);c.closePath();c.fillStyle=light(.95);c.fill();shade(c,0,-s*.5,0,s*.5,.32,.02);
    c.save();c.clip();c.beginPath();c.arc(0,-s*.02,s*.4,0,TAU);c.fillStyle=ink(.5);c.fill();for(var i=0;i<18;i++){var a=i/18*TAU;stroke(c,[[Math.cos(a)*s*.14,-s*.02+Math.sin(a)*s*.14,s*.012],[Math.cos(a)*s*.38,-s*.02+Math.sin(a)*s*.38,s*.04]],.7,30+i);}ring(c,0,-s*.02,s*.4,s*.4,s*.07,.94,3,.2);blob(c,0,-s*.02,s*.17,.97,4,.06);c.beginPath();c.arc(s*.1,-s*.14,s*.065,0,TAU);c.fillStyle=light(.95);c.fill();c.restore();
    stroke(c,curve([-s*.97,0],[0,-s*.84],[s*.97,0],16,s*.04,s*.17,s*.04),.95,5);stroke(c,curve([-s*.97,0],[0,s*.72],[s*.97,0],16,s*.03,s*.085,s*.03),.88,6);
    for(i=0;i<7;i++){var t=(i+.5)/7,x=-s*.8+t*s*1.6,y=-s*.42*Math.sin(t*Math.PI)-s*.02,dx=(t-.5)*s*.5;stroke(c,curve([x,y],[x+dx*.4,y-s*.16],[x+dx,y-s*.3-s*.08*Math.sin(t*Math.PI)],5,s*.05,s*.035,s*.006),.88,10+i);}
    stroke(c,[[-s*.05,s*.36,s*.04],[-s*.07,s*.62,s*.05],[-s*.05,s*.82,s*.015]],.85,20);drop(c,-s*.05,s*.92,s*.045,.9);stroke(c,[[s*.3,s*.3,s*.03],[s*.32,s*.5,s*.012]],.7,21);};
  // 탑: 꼭대기가 무너진 돌탑, 아래는 안개에 잠긴다
  M.tower=function(c,s){c.beginPath();c.moveTo(-s*.42,s);c.lineTo(-s*.34,-s*.55);c.lineTo(-s*.4,-s*.6);c.lineTo(-s*.4,-s*.92);c.lineTo(-s*.22,-s*.92);c.lineTo(-s*.22,-s*.78);c.lineTo(-s*.06,-s*.78);c.lineTo(-s*.04,-s*1.0);c.lineTo(s*.1,-s*.86);c.lineTo(s*.16,-s*.66);c.lineTo(s*.3,-s*.7);c.lineTo(s*.4,-s*.5);c.lineTo(s*.34,-s*.45);c.lineTo(s*.44,s);c.closePath();
    var g2=c.createLinearGradient(0,-s,0,s);g2.addColorStop(0,ink(.62));g2.addColorStop(.55,ink(.4));g2.addColorStop(1,ink(.04));c.fillStyle=g2;c.fill();
    c.save();c.clip();for(var r=0;r<9;r++){var y=-s*.5+r*s*.16;c.fillStyle='rgba('+PAPER+','+(.34-.03*r)+')';c.fillRect(-s*.5,y,s,s*.014);for(var q=0;q<4;q++)c.fillRect(-s*.36+q*s*.24+(r%2)*s*.12,y,s*.012,s*.16);}c.restore();
    stroke(c,[[-s*.42,s*.9,s*.03],[-s*.37,s*.1,s*.07],[-s*.34,-s*.55,s*.08],[-s*.4,-s*.6,s*.06],[-s*.4,-s*.92,s*.07]],.95,3);stroke(c,[[-s*.4,-s*.92,s*.07],[-s*.22,-s*.92,s*.06],[-s*.22,-s*.78,s*.05],[-s*.06,-s*.78,s*.05],[-s*.04,-s*1.0,s*.05],[s*.1,-s*.86,s*.04],[s*.16,-s*.66,s*.05],[s*.3,-s*.7,s*.04],[s*.4,-s*.5,s*.05]],.0001,4);
    [[[-.4,-.92],[-.22,-.92]],[[-.22,-.92],[-.22,-.78]],[[-.22,-.78],[-.06,-.78]],[[-.06,-.78],[-.04,-1.0]],[[-.04,-1.0],[.1,-.86]],[[.1,-.86],[.16,-.66]],[[.16,-.66],[.3,-.7]],[[.3,-.7],[.4,-.5]],[[.4,-.5],[.34,-.45]]].forEach(function(e,k){stroke(c,[[e[0][0]*s,e[0][1]*s,s*.06],[e[1][0]*s,e[1][1]*s,s*.05]],.94,10+k);});
    stroke(c,[[s*.34,-s*.45,s*.05],[s*.38,s*.1,s*.045],[s*.44,s*.9,s*.02]],.82,5);
    [[0,-.3,.1,.2],[-.14,.25,.07,.14],[.16,.3,.07,.14]].forEach(function(w){c.beginPath();c.moveTo(w[0]*s-w[2]*s,w[1]*s+w[3]*s);c.lineTo(w[0]*s-w[2]*s,w[1]*s);c.arc(w[0]*s,w[1]*s,w[2]*s,Math.PI,0);c.lineTo(w[0]*s+w[2]*s,w[1]*s+w[3]*s);c.closePath();c.fillStyle=light(.9);c.fill();c.lineWidth=s*.03;c.strokeStyle=ink(.9);c.stroke();});
    [[.42,-.9,.05],[.56,-.72,.04],[.5,-1.02,.03],[-.56,-.8,.03]].forEach(function(d,k){blob(c,d[0]*s,d[1]*s,d[2]*s,.8,30+k,.25);});
    for(var m=0;m<3;m++)stroke(c,curve([-s*(1.1-m*.15),s*(.7+m*.1)],[0,s*(.58+m*.1)],[s*(1.1-m*.2),s*(.72+m*.1)],12,s*.01,s*.08,s*.01),.5-m*.12,40+m);};
  // 책: 펼친 마도서, 한쪽엔 글줄 한쪽엔 인장, 늘어진 가름끈
  M.book=function(c,s){wash(c,0,0,s*1.05,.13);[-1,1].forEach(function(d){c.beginPath();c.moveTo(0,-s*.42);c.quadraticCurveTo(d*s*.45,-s*.66,d*s*.92,-s*.46);c.lineTo(d*s*.92,s*.44);c.quadraticCurveTo(d*s*.45,s*.24,0,s*.5);c.closePath();c.fillStyle=light(.95);c.fill();shade(c,0,0,d*s*.92,0,.34,.02);
      stroke(c,curve([0,-s*.42],[d*s*.45,-s*.68],[d*s*.92,-s*.46],8,s*.04,s*.07,s*.05),.93,3+d);stroke(c,[[d*s*.92,-s*.46,s*.06],[d*s*.93,s*.44,s*.07]],.94,5+d);stroke(c,curve([0,s*.5],[d*s*.45,s*.24],[d*s*.92,s*.44],8,s*.08,s*.1,s*.07),.95,7+d);stroke(c,curve([0,s*.6],[d*s*.45,s*.36],[d*s*.96,s*.54],8,s*.03,s*.045,s*.03),.75,9+d);});
    stroke(c,[[0,-s*.44,s*.06],[0,s*.56,s*.09]],.95,12);
    for(var i=0;i<6;i++)stroke(c,curve([-s*.8,-s*(.34-i*.11)],[-s*.45,-s*(.48-i*.11)],[-s*.12,-s*(.28-i*.11)],6,s*.012,s*(.035-(i%2)*.01),s*.012),.75,20+i);
    ring(c,s*.48,-s*.08,s*.24,s*.24,s*.045,.9,30,.8);var st=[];for(i=0;i<=5;i++){var a=-Math.PI/2+i*TAU*2/5;st.push([s*.48+Math.cos(a)*s*.2,-s*.08+Math.sin(a)*s*.2,s*.022]);}stroke(c,st,.85,31);blob(c,s*.48,-s*.08,s*.04,.95,32,.1);
    stroke(c,curve([s*.1,s*.5],[s*.2,s*.8],[s*.08,s*1.0],6,s*.05,s*.055,s*.015),.9,33);[[-.3,-.86,.04],[.2,-.92,.03],[.6,-.82,.035]].forEach(function(d,k){drop(c,d[0]*s,d[1]*s,d[2]*s,.6);});};
  // 가마솥: 세 발 달린 둥근 솥, 끓어 넘치는 기포와 김
  M.cauldron=function(c,s){wash(c,0,s*.2,s*1.0,.14);[[-.42,.82,-.52,1.0],[.42,.82,.52,1.0],[0,.9,0,1.02]].forEach(function(l,k){stroke(c,[[l[0]*s,l[1]*s,s*.12],[l[2]*s,l[3]*s,s*.07]],.94,3+k);});
    c.beginPath();c.moveTo(-s*.68,-s*.1);c.bezierCurveTo(-s*.95,s*.5,-s*.5,s*.92,0,s*.92);c.bezierCurveTo(s*.5,s*.92,s*.95,s*.5,s*.68,-s*.1);c.closePath();c.fillStyle=light(.9);c.fill();shade(c,-s*.8,0,s*.8,0,.95,.5);
    c.save();c.clip();c.fillStyle=light(.4);c.beginPath();c.ellipse(s*.38,s*.3,s*.08,s*.3,-.3,0,TAU);c.fill();flecks(c,-s*.2,s*.4,s*.8,s*.7,10,8);c.restore();
    stroke(c,[[-s*.68,-s*.1,s*.08],[-s*.84,s*.4,s*.1],[-s*.4,s*.86,s*.09],[0,s*.92,s*.08]],.95,6);stroke(c,[[s*.68,-s*.1,s*.06],[s*.84,s*.4,s*.07],[s*.4,s*.86,s*.07],[0,s*.92,s*.08]],.9,7);
    c.save();c.translate(0,-s*.12);c.scale(1,.24);c.beginPath();c.arc(0,0,s*.72,0,TAU);c.fillStyle=ink(.7);c.fill();c.restore();ring(c,0,-s*.12,s*.74,s*.17,s*.12,.95,8,.4);
    [[-.84,.1],[.84,.1]].forEach(function(h,k){ring(c,h[0]*s,h[1]*s,s*.09,s*.12,s*.05,.9,10+k,1);});
    [[-.3,-.2,.1],[.05,-.26,.13],[.34,-.18,.09],[-.08,-.12,.07]].forEach(function(b,k){c.beginPath();c.arc(b[0]*s,b[1]*s,b[2]*s,0,TAU);c.fillStyle=light(.92);c.fill();ring(c,b[0]*s,b[1]*s,b[2]*s,b[2]*s,s*.035,.9,20+k,k);});
    stroke(c,[[-s*.5,-s*.04,s*.05],[-s*.56,s*.2,s*.06],[-s*.52,s*.36,s*.015]],.9,30);drop(c,-s*.52,s*.46,s*.04,.9);
    [[-.25,1],[.2,-1],[.5,1]].forEach(function(v,k){var x=v[0]*s,o=[];for(var i=0;i<=12;i++){var t=i/12;o.push([x+Math.sin(t*Math.PI*2.2)*s*.1*v[1],-s*.42-t*s*.6,s*(.01+.07*Math.sin(t*Math.PI))]);}stroke(c,o,.5-k*.08,40+k);});};
  /* 갈필 마무리(심사 1차: 순흑 면이 스티커처럼 뜬다): 서양 소재는 따로 그린 뒤 붓 결을 따라 먹을 덜어 내고 군데군데 담묵으로 풀어 동양 소재와 농담을 맞춘다. */
  function dryBrush(q,s,seed){var r=rnd(seed),i;q.save();q.globalCompositeOperation='destination-out';
    for(i=0;i<9;i++){var x=(r()-.5)*s*1.9,y=(r()-.5)*s*2.0,rad=s*(.22+.3*r()),gr=q.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(0,0,0,'+(.2+.16*r())+')');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.beginPath();q.arc(x,y,rad,0,TAU);q.fill();}
    q.lineCap='round';for(i=0;i<150;i++){var x2=(r()-.5)*s*2.4,y2=(r()-.5)*s*2.4,a=-1.15+(r()-.5)*.5,len=s*(.1+.36*r());q.strokeStyle='rgba(0,0,0,'+(.14+.3*r())+')';q.lineWidth=s*(.006+.014*r());q.beginPath();q.moveTo(x2,y2);q.lineTo(x2+Math.cos(a)*len,y2+Math.sin(a)*len);q.stroke();}
    q.restore();}
  ['chalice','hexagram','skull','scythe','crown','chain','candle','key','hourglass','wing','horn','mirror','gear','bell','mask','rose','web','vial','eye','tower','book','cauldron'].forEach(function(k,n){var draw=M[k];
    M[k]=function(c,s){var d=g.document,px=Math.ceil(s*3*2),cv=d.createElement('canvas');cv.width=cv.height=px;var q=cv.getContext('2d');q.scale(2,2);q.translate(s*1.5,s*1.5);draw(q,s);dryBrush(q,s,97+n*13);c.drawImage(cv,-s*1.5,-s*1.5,s*3,s*3);};});
  g.InkMotifs=M;
})(window);
