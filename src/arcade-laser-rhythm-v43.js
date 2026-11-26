/* 세로판 리듬 레이저(사용자 11-20 "보스페이즈가 보통 5인데 3개는 레이져 패턴이 꼭 있도록 … 마치 리듬게임을 레이져 패턴으로 구현한 느낌").
 *  화면을 여섯 줄(건반)로 나누고, 광선을 음표처럼 박에 맞춰 켠다. 음표는 예고(인주색)로 먼저 보이고 정확히 박에 켜진다.
 *  이 파일은 두 가지를 맡는다.
 *   1) 채보(판정과 같은 결정적 계산): MOTIFS·play(name,c). 엔진(src/arcade-v43.js spAct)이 박마다 부른다.
 *      c = {W,H,lvl(0 이지·1 노멀·2 헬),WB(예고 박 수),BEAT(한 박 틱),pos(마디 안 박 0~7),bar,px,py,mem(마디 기억, 값만 담는다),
 *           lane(x0,x1,at,hold,o) 세로 음표, band(y0,y1,at,hold,o) 가로 음표}  — at: 지금부터 켜질 때까지 박 수, hold: 켜진 틱, o:{color:0|1,tone}
 *      다른 곳(영웅별 적 공격 비중 등)에서 가져다 쓸 때도 같은 c 를 만들어 play 를 부르면 된다.
 *   2) 화면(판정과 무관): draw(ctx,s,opt) 음표 줄·내려오는 음표머리·장단 점, sounds(s,play) 켜지는 순간의 북·가야금 소리.
 *  규칙(docs/v43/danmaku-rules.md 17~22): 모든 음표는 맵 끝에서 끝까지, 예고 2박(이지 3박), 한 박에 건너야 하는 거리는 한 줄(60px) 이하,
 *  좌우를 바꿔야 하는 음표 사이는 한 박 이상, 화면을 다 덮지 않는다. */
(function(root,factory){var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;root.HapilLaserRhythm=api;})(typeof globalThis!=='undefined'?globalThis:this,function(global){
  'use strict';
  var LANES=6,BAND=64,TOP=120;
  var INFO={
    trill:{name:'좌우 교차',why:'박마다 반대편이 켜진다 · 가운데 금을 박에 맞춰 넘는다'},
    jangdan:{name:'덩 쿵 덕',why:'쿵은 왼쪽, 덕은 오른쪽, 덩은 양 끝 · 엇박이 섞인다'},
    climb:{name:'차오르는 박',why:'아래부터 한 줄씩 차올라 위로 이끌고, 위에서 다시 내려 민다'},
    slide:{name:'길 따라가기',why:'열린 길이 박마다 한 줄씩 옮겨 간다'},
    squeeze:{name:'조였다 풀기',why:'양옆에서 조여 가운데로 모은 뒤, 풀리는 박에 가운데를 친다'},
    swing:{name:'엇박 술래',why:'가락은 건너뛰며 울리고, 엇박은 영웅이 선 줄을 짚는다'}
  };
  var MOTIFS=Object.keys(INFO);
  var LABEL={comb:'빗살',fan:'부채',square:'사각 틀',piano:'건반',cover:'덮기'}; // 옛 무늬의 짧은 이름(장단 점 옆 표시)
  function label(name){return INFO[name]?INFO[name].name:LABEL[name]||'';}
  // 장단(8분음 16칸): D 덩(양 끝 1/3), K 쿵(왼쪽 반), T 덕(오른쪽 반). 좌우가 바뀌는 음표 사이는 한 박(2칸) 이상 — 이지·노멀은 두 박
  var JANGDAN=['D...K...T...D...','D..DK...T.D.K...','D..KK.T.D.DT..K.'];
  var ZIG=[0,3,1,4,2,5];
  var M={};
  M.trill=function(c){var m=c.mem,L=c.W/LANES,hits=[3,6,7][c.lvl],every=c.lvl===0?2:1;
    var easyTouch=c.compact&&c.lvl===0,edge=easyTouch?L:2*L;
    if(c.pos===0){m.split=Math.max(edge,Math.min(c.W-edge,Math.round(c.px/L)*L));m.side=c.px<m.split?0:1;m.k=0;}
    if(m.split===undefined||c.pos%every||m.k>=hits)return;
    // 휴대폰 이지는 가장 가까운 칸 경계를 고정하고 그 양쪽 두 칸까지만 번갈아 켠다.
    var left=(m.side+m.k)%2===0,reach=easyTouch?2*L:c.W;m.k++;
    c.lane(left?Math.max(0,m.split-reach):m.split,left?m.split:Math.min(c.W,m.split+reach),c.WB,[8,8,10][c.lvl],{color:left?0:1,tone:left?'k':'t'});
  };
  M.jangdan=function(c){var p=JANGDAN[c.lvl],h=c.W/2,o=c.W/3;
    for(var e=0;e<2;e++){var ch=p[c.pos*2+e],at=c.WB+e*.5;
      if(ch==='K')c.lane(0,h,at,6,{color:0,tone:'k'});
      else if(ch==='T')c.lane(h,c.W,at,6,{color:1,tone:'t'});
      else if(ch==='D'){c.lane(0,o,at,8,{color:0,tone:'d'});c.lane(c.W-o,c.W,at,8,{color:0,tone:'d',mute:1});}}
  };
  M.climb=function(c){var n=[2,3,4][c.lvl],n2=[1,2,3][c.lvl],k;
    if(c.pos===0)for(k=0;k<n;k++)c.band(c.H-BAND*(k+1),c.H-BAND*k,c.WB+k,(n+1-k)*c.BEAT-10,{color:k%2,tone:k}); // 아래부터 한 박에 한 줄, 함께 꺼진다. 예고는 처음부터 모두 보인다
    k=c.pos-(n+1);if(k>=0&&k<n2)c.band(TOP+BAND*k,TOP+BAND*(k+1),c.WB,(n2-k-.5)*c.BEAT-8,{color:(k+1)%2,tone:4-k}); // 사다리가 꺼지는 박부터 위에서 한 줄씩 내려 민다
  };
  M.slide=function(c){var m=c.mem,L=c.W/LANES,w=c.compact?4:3,sb=c.lvl===0?2:1,S=[2,4,5][c.lvl],i,j;
    if(c.pos===0){var hl=Math.max(0,Math.min(LANES-1,Math.floor(c.px/L))),c0=Math.max(0,Math.min(LANES-w,hl-(w>2?1:0))),dir=LANES-w-c0>=c0?1:-1,path=[c0],plan=[];
      for(i=1;i<=S;i++){var nx=path[i-1]+dir;if(nx<0||nx>LANES-w){dir=-dir;nx=path[i-1]+dir;}path.push(nx);}
      for(j=0;j<LANES;j++){var from=-1;for(i=0;i<=S+1;i++){var shut=i<=S&&(j<path[i]||j>=path[i]+w);if(shut&&from<0)from=i;if(!shut&&from>=0){plan.push([from*sb,j,j+1,(i-from)*sb]);from=-1;}}}
      for(i=plan.length-1;i>0;i--)for(j=0;j<i;j++)if(plan[j][0]===plan[i][0]&&plan[j][3]===plan[i][3]&&plan[j][2]===plan[i][1]){plan[j][2]=plan[i][2];plan.splice(i,1);break;} // 같은 박에 같은 길이로 켜지는 이웃 줄은 한 덩이로
      m.plan=plan;}
    if(!m.plan)return;
    for(i=0;i<m.plan.length;i++){var q=m.plan[i];if(q[0]===c.pos)c.lane(q[1]*L,q[2]*L,c.WB,q[3]*c.BEAT,{color:q[1]%2,tone:q[1]%5});}
  };
  M.squeeze=function(c){var L=c.W/LANES,B=c.BEAT;
    if(c.pos===0){c.lane(0,L,c.WB,3.5*B,{color:0,tone:'d'});c.lane(c.W-L,c.W,c.WB,3.5*B,{color:0,tone:'d',mute:1});}
    else if(c.pos===1){c.lane(L,2*L,c.WB,2.5*B,{color:1,tone:'k'});c.lane(c.W-2*L,c.W-L,c.WB,2.5*B,{color:1,tone:'t'});}
    else if(c.pos===(c.lvl===0?6:5))c.lane(2*L,4*L,c.WB,12,{color:0,tone:'d'}); // 벽이 풀린 뒤 반 박 더 여유를 두고 가운데를 친다
    else if(c.lvl===2&&c.pos===6){c.lane(0,2*L,c.WB,12,{color:1,tone:'k'});c.lane(4*L,c.W,c.WB,12,{color:1,tone:'t'});}
  };
  M.swing=function(c){var L=c.W/LANES;if(c.pos>5)return;
    var j=ZIG[c.pos];if(c.bar%2)j=LANES-1-j;
    c.lane(L*j,L*(j+1),c.WB,8,{color:0,tone:j%5});
    var chase=c.lvl===0?c.pos===2||c.pos===4:c.lvl===1?c.pos%2===1:c.pos!==0&&c.pos!==3;
    if(chase){var hl=Math.max(0,Math.min(LANES-1,Math.floor(c.px/L)));c.lane(L*hl,L*(hl+1),c.WB+.5,7,{color:1,tone:(hl+2)%5});} // 엇박(반 박 뒤)은 영웅이 선 줄
  };
  function play(name,c){var f=M[name];if(!f)return false;f(c);return true;}

  /* ── 화면 ── */
  var VERMILION='#c9406e',HANJI='#f3e3bd',TAU=Math.PI*2;
  function isNote(l){return l&&l.role==='note';}
  function span(l){var v=Math.abs(l.angle-Math.PI/2)<.01,mid=v?l.x:l.y;return {v:v,lo:mid-l.width/2,hi:mid+l.width/2};}
  // opt: {COLORS,W,H,fade(BEAM_FADE),lite,phase('under' 탄 아래: 켜진 음표 · 'over' 탄 위: 예고와 음표머리)}
  function draw(ctx,s,opt){
    var L=s.lasers,W=opt.W,H=opt.H,i,any=false;for(i=0;i<L.length;i++)if(isNote(L[i])){any=true;break;}
    if(!any)return;
    ctx.save();ctx.setLineDash([]);
    for(i=0;i<L.length;i++){var l=L[i];if(!isNote(l))continue;var g=span(l),lo=g.lo,hi=g.hi,wd=hi-lo,color=opt.COLORS[l.color]||'#ffffff';
      if(l.age<l.warn){ if(opt.phase!=='over')continue;
        var t=l.age/l.warn,near=Math.max(0,1-(l.warn-l.age)/30); // 마지막 한 박에 짙어진다
        ctx.globalCompositeOperation='source-over';
        // 이미 켜진 음표가 같은 자리를 덮고 있으면 붉은 물·테를 얹지 않는다(먹과 인주가 섞여 탁해지고 예고인지 켜진 것인지 헷갈린다). 음표머리만 남긴다
        var under=false,j;for(j=0;j<L.length&&!under;j++){var m=L[j];if(m===l||!isNote(m)||m.age<m.warn||m.age>=m.warn+m.active)continue;var gm=span(m);under=gm.v===g.v&&gm.lo<=lo+.5&&gm.hi>=hi-.5;}
        if(under){var hw0=Math.max(3,Math.min(9,wd*.09));if(g.v)head(ctx,lo+3,H*t-hw0,wd-6,hw0*2,.55+.45*t,true);else{head(ctx,W/2*t-hw0*2,lo+3,hw0*2,wd-6,.55+.45*t,false);head(ctx,W-W/2*t,lo+3,hw0*2,wd-6,.55+.45*t,false);}continue;}
        ctx.globalAlpha=.02+.035*t+.075*near;ctx.fillStyle=VERMILION;if(g.v)ctx.fillRect(lo,0,wd,H);else ctx.fillRect(0,lo,W,wd);
        // 가장자리: 인주색 가는 끊긴 선(돕는 예고)
        ctx.globalAlpha=.5+.4*t;ctx.strokeStyle=VERMILION;ctx.lineWidth=1.4;ctx.setLineDash([9,7]);ctx.lineDashOffset=-s.tick*.7;ctx.beginPath();
        if(g.v){ctx.moveTo(lo+.7,0);ctx.lineTo(lo+.7,H);ctx.moveTo(hi-.7,0);ctx.lineTo(hi-.7,H);}else{ctx.moveTo(0,lo+.7);ctx.lineTo(W,lo+.7);ctx.moveTo(0,hi-.7);ctx.lineTo(W,hi-.7);}
        ctx.stroke();ctx.setLineDash([]);
        // 음표머리: 박이 다가오는 만큼 줄을 따라 내려와(가로줄은 양 끝에서 모여) 닿는 순간 켜진다
        var hw=Math.max(3,Math.min(9,wd*.09)),a=.55+.45*t;
        // 도착선: 음표머리가 닿으면 켜지는 자리(세로줄은 바닥, 가로줄은 한가운데)
        ctx.globalAlpha=.55+.45*near;ctx.fillStyle=VERMILION;if(g.v)ctx.fillRect(lo+4,H-5,wd-8,3);else ctx.fillRect(W/2-1.5,lo+4,3,wd-8);
        if(g.v){var y=H*t,x0=lo+3,x1=hi-3;head(ctx,x0,y-hw,x1-x0,hw*2,a,true);}
        else{var reach=W/2*t;head(ctx,reach-hw*2,lo+3,hw*2,wd-6,a,false);head(ctx,W-reach,lo+3,hw*2,wd-6,a,false);}
      }else{ if(opt.phase!=='under')continue;
        var over=l.age-l.warn-l.active,k=over>0?Math.max(0,1-over/opt.fade):Math.min(1,(l.age-l.warn+1)/3),born=l.age-l.warn;
        if(k<=0)continue;
        // 몸: 보스 색 띠(가장자리가 짙고 가운데는 비친다) + 띠를 따라 흐르는 붓 줄기 + 가장자리 심. 넓은 음표를 흰 판으로 칠하지 않는다
        var grad=g.v?ctx.createLinearGradient(lo,0,hi,0):ctx.createLinearGradient(0,lo,0,hi),edge=Math.min(.45,12/Math.max(24,wd));
        grad.addColorStop(0,color+'ff');grad.addColorStop(edge,color+'e6');grad.addColorStop(.5,color+'c8');grad.addColorStop(1-edge,color+'e6');grad.addColorStop(1,color+'ff');
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.94*k;ctx.fillStyle=grad;if(g.v)ctx.fillRect(lo,0,wd,H);else ctx.fillRect(0,lo,W,wd);
        // 먹 번짐: 띠 바깥으로 엷게 스미고, 가장자리에 붓끝 삐침이 불규칙하게 돋는다(자로 그은 선이 되지 않게)
        var bl=7,bg,sd;for(sd=0;sd<2;sd++){var e0=sd?hi:lo,e1=sd?hi+bl:lo-bl;bg=g.v?ctx.createLinearGradient(e0,0,e1,0):ctx.createLinearGradient(0,e0,0,e1);bg.addColorStop(0,color+'90');bg.addColorStop(1,color+'00');ctx.globalAlpha=k;ctx.fillStyle=bg;
          if(g.v)ctx.fillRect(Math.min(e0,e1),0,bl,H);else ctx.fillRect(0,Math.min(e0,e1),W,bl);
          if(!opt.lite){ctx.fillStyle=color;ctx.globalAlpha=.7*k;var len=g.v?H:W,fq;for(fq=0;fq<len;fq+=23){var hsh=Math.sin((fq+1)*12.9898+i*78.233+sd*37.7)*43758.5453;hsh-=Math.floor(hsh);if(hsh<.45)continue;var fl=4+hsh*9,fw=8+hsh*22,fo=fq+hsh*11;
            ctx.beginPath();if(g.v){ctx.moveTo(e0,fo);ctx.quadraticCurveTo(e0+(sd?fl:-fl),fo+fw*.5,e0,fo+fw);}else{ctx.moveTo(fo,e0);ctx.quadraticCurveTo(fo+fw*.5,e0+(sd?fl:-fl),fo+fw,e0);}ctx.fill();}}}
        if(!opt.lite){var ns=Math.max(2,Math.min(7,Math.round(wd/26))),q;ctx.globalCompositeOperation='lighter';ctx.strokeStyle=color;
          for(q=0;q<ns;q++){var u=(q+.5)/ns+.5*Math.sin(i*7.3+q*2.1)/ns*.7,at=lo+wd*u,sw=2+((i+q)%3),ph=((s.tick*(9+q*2)+q*97+i*31)%(g.v?H:W));
            ctx.globalAlpha=.42*k;ctx.lineWidth=sw+((q*5+i)%4);ctx.setLineDash([90+q*37+(i%3)*22,18+q*13]);ctx.lineDashOffset=-ph;ctx.beginPath();if(g.v){ctx.moveTo(at,0);ctx.lineTo(at,H);}else{ctx.moveTo(0,at);ctx.lineTo(W,at);}ctx.stroke();}
          ctx.setLineDash([]);}
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k;ctx.strokeStyle='#ffffff';ctx.lineWidth=2.6;ctx.beginPath();
        if(g.v){ctx.moveTo(lo+1.3,0);ctx.lineTo(lo+1.3,H);ctx.moveTo(hi-1.3,0);ctx.lineTo(hi-1.3,H);}else{ctx.moveTo(0,lo+1.3);ctx.lineTo(W,lo+1.3);ctx.moveTo(0,hi-1.3);ctx.lineTo(W,hi-1.3);}
        ctx.stroke();
        if(born<6){ctx.globalAlpha=(1-born/6)*.5;ctx.fillStyle='#ffffff';if(g.v)ctx.fillRect(lo,0,wd,H);else ctx.fillRect(0,lo,W,wd);} // 켜지는 박의 섬광
      }
    }
    ctx.restore();
  }
  // 음표머리: 붓으로 눌러 찍은 먹 점(가운데가 도톰하고 끝이 가는 획) + 인주색 가는 테
  function head(ctx,x,y,w,h,a,v){var cx=x+w/2,cy=y+h/2,rx=w/2,ry=h/2;ctx.beginPath();
    if(v){ctx.moveTo(x,cy);ctx.quadraticCurveTo(cx-rx*.3,cy-ry*1.5,x+w,cy-ry*.25);ctx.quadraticCurveTo(cx+rx*.2,cy+ry*1.6,x,cy);}
    else{ctx.moveTo(cx,y);ctx.quadraticCurveTo(cx+rx*1.5,cy-ry*.3,cx+rx*.25,y+h);ctx.quadraticCurveTo(cx-rx*1.6,cy+ry*.2,cx,y);}
    ctx.globalAlpha=a;ctx.fillStyle='#ffffff';ctx.fill();ctx.globalAlpha=a*.9;ctx.strokeStyle=VERMILION;ctx.lineWidth=1.2;ctx.stroke();}
  /* 장단 점: 레이저 장단 구간 동안 화면 아래 가운데에 8박을 점으로 보인다(센박은 크게). 지금 박이 인주색으로 찬다. */
  function drawBeats(ctx,s,opt){
    var sp=s.special,b=s.beat;if(!sp||sp.kind!=='laser'||!b)return;
    var y=opt.y||31,n=b.n%8,since=s.tick-b.tick,i,gap=14,x0=opt.x||20,acc=opt.accent||[1,0,.5,0,1,0,.5,.5];
    ctx.save();ctx.globalCompositeOperation='source-over';
    // 받침: 켜진 띠 위에서도 읽히게 종이색 판을 깐다
    var motif=label(sp.motif),nm=global.HapilI18n&&global.HapilI18n.text?global.HapilI18n.text(motif):motif;ctx.font='700 12px '+(opt.font||'sans-serif');var pw=gap*8+(nm?((ctx.measureText&&ctx.measureText(nm)||{width:nm.length*12}).width||nm.length*12)+8:0)+8,px=x0-10,py=y-11,ph=22,pr=11;
    ctx.globalAlpha=.84;ctx.fillStyle=opt.plate||'#14100e';ctx.beginPath();ctx.moveTo(px+pr,py);ctx.lineTo(px+pw-pr,py);ctx.arc(px+pw-pr,py+pr,pr,-Math.PI/2,Math.PI/2);ctx.lineTo(px+pr,py+ph);ctx.arc(px+pr,py+pr,pr,Math.PI/2,Math.PI*1.5);ctx.fill();
    for(i=0;i<8;i++){var r=acc[i]>=1?4.4:acc[i]>0?3.4:2.8,on=i===n,pulse=on?Math.max(0,1-since/14):0;
      ctx.globalAlpha=on?1:.6;ctx.fillStyle=on?VERMILION:HANJI;ctx.beginPath();ctx.arc(x0+gap*i,y,r+pulse*2.2,0,TAU);ctx.fill();
      ctx.globalAlpha=on?.9:.5;ctx.strokeStyle='#14100e';ctx.lineWidth=1;ctx.stroke();}
    if(nm){ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=1;ctx.fillStyle='#ffffff';ctx.fillText(nm,x0+gap*8,y+.5);}
    ctx.restore();
  }
  /* 소리: 음표가 켜지는 틱에 한 번. 쿵(왼손 북)·덕(오른손 채)·덩(양손)·가야금 다섯 음. 한 틱에 같은 소리는 한 번만 */
  var PLUCK=['notePluck0','notePluck1','notePluck2','notePluck3','notePluck4'];
  function cueOf(l){return l.tone==='k'?'noteKung':l.tone==='t'?'noteDeok':l.tone==='d'?'noteDung':PLUCK[((l.tone|0)%5+5)%5];}
  function sounds(s,play){var L=s.lasers,done={},n=0;
    for(var i=0;i<L.length;i++){var l=L[i];if(!isNote(l)||l.mute||l.age!==l.warn)continue;var cue=cueOf(l);if(done[cue])continue;done[cue]=1;var g=span(l);play(cue,g.v?(g.lo+g.hi)/2:undefined);n++;}
    return n;
  }
  return {label:label,LANES:LANES,BAND:BAND,TOP:TOP,MOTIFS:MOTIFS,INFO:INFO,JANGDAN:JANGDAN,play:play,isNote:isNote,span:span,draw:draw,drawBeats:drawBeats,sounds:sounds,cueOf:cueOf};
});
