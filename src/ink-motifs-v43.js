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
  g.InkMotifs=M;
})(window);
