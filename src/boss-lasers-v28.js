/* Finite, committed boss laser salvos. This describes collision capsules and
 * their clocks; the owner's existing beam material supplies every pixel.
 * A sweep is successive locked rays, never a live beam tracking the pilot.
 */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilBossLasersV28=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var DOWN=Math.PI/2,TAU=Math.PI*2,BOUNDS=Object.freeze({left:8,right:352,top:48,bottom:638});
  // id, retained ownership role, phase shapes, native width, inter-ray beat,
  // extra cooldown. Shape names are gameplay motifs, not canon quotations.
  var ROWS=[
    ['violet-scissor-sweep','wing-weave',['sweep','cross','spokes'],5.4,7,0],
    ['horn-reed-breath','bog-drag',['parallel','stairs','cross'],9.2,10,18],
    ['balrog-guillotine-salvo','sword-rake',['diagonal','cross','triads'],10.8,5,6],
    ['mask-reflected-feathers','feather-fork',['reflect','sweep','reflect'],5.0,8,12],
    ['lucifer-constellation-nodes','constellation-orbit',['spokes','reticle','spokes'],6.2,6,6],
    ['sloth-late-broad-pulses','late-pulse',['parallel','triads','stairs'],11.4,11,30],
    ['envy-opposed-mirrors','mirror-reflection',['reflect','cross','reflect'],6.4,7,0],
    ['glutton-jaw-crossfire','hungry-jaw',['cross','diagonal','fork'],10.2,6,18],
    ['lust-stage-spotlights','red-stage',['piano','sweep','triads'],6.8,6,6],
    ['mammon-vault-keys','vault-branch',['piano','stairs','parallel'],7.4,9,18],
    ['wrath-ignition-whips','fire-fuse',['sweep','triads','cross'],5.8,4,0],
    ['pride-keyboard-verdict','calculation-column',['piano','triads','piano'],7.8,5,6],
    ['defense-relay-battery','defense-relay',['relay','parallel','relay'],5.2,7,6],
    ['mercy-closing-limits','mercy-boundary',['cross','fork','parallel'],8.8,9,24],
    ['veto-locked-sights','veto-packet',['reticle','stairs','reticle'],5.6,10,12],
    ['feedback-returning-light','feedback-return',['reflect','sweep','reflect'],6.6,8,12],
    ['migration-gate-forks','migration-fork',['fork','relay','fork'],7.2,8,18],
    ['memory-separated-bars','repeat-disconnect',['bars','piano','bars'],5.0,10,24],
    ['goblin-flute-arpeggio','flute-phrase',['piano','sweep','piano'],4.8,5,6],
    ['knight-six-sword-rays','six-swords',['spokes','diagonal','spokes'],8.4,5,0],
    ['insomnia-mist-pulses','insomnia-veil',['parallel','bars','parallel'],10.4,11,30],
    ['academy-turret-relay','defense-intercept',['relay','reticle','relay'],6.0,6,0],
    ['harvest-descending-steps','harvest-tier',['stairs','parallel','stairs'],8.0,9,18],
    ['upper-crossed-orders','command-alternation',['cross','bars','cross'],6.2,6,12],
    ['furnace-reflected-pipes','furnace-junction',['reflect','diagonal','reflect'],9.0,8,18],
    ['neural-cable-zigzags','neural-packet',['diagonal','relay','fork'],5.2,5,6],
    ['grave-command-seal-rays','deletion-seal',['spokes','bars','spokes'],7.6,10,24],
    ['collapse-two-ray-triads','six-command-rings',['triads','spokes','triads'],7.0,6,18],
    ['arbelia-deferred-threads','tampered-thread',['bars','parallel','fork'],4.6,12,36],
    ['siren-locked-clockhands','time-hand',['spokes','piano','spokes'],6.6,7,6],
    ['castle-dual-boundaries','castle-boundary',['cross','reflect','cross'],8.2,8,12],
    ['causal-three-sight-locks','causal-lock',['reticle','triads','reticle'],7.2,9,18],
    ['cult-reversed-relay','reverse-domination',['relay','diagonal','relay'],6.4,5,6],
    ['circuit-cross-and-wall','circuit-duet',['fork','cross','parallel'],8.6,7,18],
    ['authority-fold-stitch-impact','authority-fold',['diagonal','reflect','piano'],10.0,4,0]
  ];
  var profiles=Object.freeze(ROWS.map(function(r,index){return Object.freeze({index:index,id:r[0],role:r[1],modes:Object.freeze(r[2]),width:r[3],stepTicks:r[4],cadenceAdd:r[5]});}));
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function phaseFor(w,opts){return clamp(Math.floor(opts&&finite(opts.phase)?opts.phase:w&&finite(w.phase)?w.phase:0),0,2);}
  function profileFor(w){var index=w&&w.finalPractice?34:w&&w.bossIndex;return Number.isInteger(index)&&profiles[index]||null;}
  function cadenceFor(w){var p=profileFor(w);return p?(w.difficulty==='hell'?162:w.difficulty==='gentle'?208:182)+p.cadenceAdd:208;}
  function limitFor(w,opts){var cap=w.difficulty==='hell'?8:w.difficulty==='gentle'?4:6;return opts&&opts.copy?Math.min(cap,4):cap;}
  function point(x,y){return{x:clamp(x,BOUNDS.left,BOUNDS.right),y:clamp(y,BOUNDS.top,BOUNDS.bottom)};}
  function clipRay(x,y,angle){
    var dx=Math.cos(angle),dy=Math.sin(angle),candidates=[];
    if(dx>1e-9)candidates.push((BOUNDS.right-x)/dx);else if(dx< -1e-9)candidates.push((BOUNDS.left-x)/dx);
    if(dy>1e-9)candidates.push((BOUNDS.bottom-y)/dy);else if(dy< -1e-9)candidates.push((BOUNDS.top-y)/dy);
    var length=Math.min.apply(null,candidates.filter(function(t){return t>1e-7;}));
    if(!finite(length))return point(x,y);
    return point(x+dx*length,y+dy*length);
  }
  function routeFor(w,opts){
    var route=opts.escapeRoute||opts.route;
    if(!route&&w._pressurePlan&&(!finite(w._pressurePlan.expireAt)||!finite(w.tick)||w.tick<w._pressurePlan.expireAt))route=w._pressurePlan.route;
    return route&&[route.x1,route.y1,route.x2,route.y2,route.halfWidth].every(finite)&&route.halfWidth>=0?route:null;
  }
  function pointSegmentSquared(x,y,ax,ay,bx,by){
    var dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den?clamp(((x-ax)*dx+(y-ay)*dy)/den,0,1):0;
    var px=x-ax-dx*t,py=y-ay-dy*t;return px*px+py*py;
  }
  function routeEntry(s,route,radius){
    var ax=s.x,ay=s.y,dx=s.x2-ax,dy=s.y2-ay,den=dx*dx+dy*dy;
    if(pointSegmentSquared(ax,ay,route.x1,route.y1,route.x2,route.y2)<=radius*radius)return 0;
    if(!den)return null;
    var candidates=[],rx=route.x2-route.x1,ry=route.y2-route.y1,len=Math.hypot(rx,ry);
    function accept(t){if(finite(t)&&t>=0&&t<=1)candidates.push(t);}
    // Transform the ray into the route's local frame. A capsule is the union
    // of a finite strip and its two circular endcaps, not an infinite line.
    if(len){
      var ux=rx/len,uy=ry/len,p=(ax-route.x1)*ux+(ay-route.y1)*uy,q=-(ax-route.x1)*uy+(ay-route.y1)*ux;
      var dp=dx*ux+dy*uy,dq=-dx*uy+dy*ux;
      if(Math.abs(dq)>1e-12)[-radius,radius].forEach(function(edge){var t=(edge-q)/dq,along=p+dp*t;if(along>=0&&along<=len)accept(t);});
    }
    [[route.x1,route.y1],[route.x2,route.y2]].forEach(function(c){
      var ox=ax-c[0],oy=ay-c[1],linear=2*(ox*dx+oy*dy),constant=ox*ox+oy*oy-radius*radius,disc=linear*linear-4*den*constant;
      if(disc>=-1e-8){var root=Math.sqrt(Math.max(0,disc));accept((-linear-root)/(2*den));accept((-linear+root)/(2*den));}
    });
    return candidates.length?Math.min.apply(null,candidates):null;
  }
  function fitRoute(specs,route,playerRadius){
    if(!route)return specs;
    var chains=Object.create(null),out=[];
    specs.forEach(function(s){(chains[s.chainId]||(chains[s.chainId]=[])).push(s);});
    Object.keys(chains).forEach(function(key){
      var chain=chains[key],fitted=[],invalid=false;
      chain.forEach(function(s){
        var entry=routeEntry(s,route,route.halfWidth+s.width/2+playerRadius+2);
        if(entry===null){fitted.push(s);return;}
        // A real reflected first leg must still touch its actual wall. Only
        // its final leg may stop before the protected passage. Reject the
        // complete pair if there is no honest, meaningful reflected segment.
        if(s.v28Reflected&&s.v28Segment===0){invalid=true;return;}
        var length=Math.max(0,s.length*entry-2),minimum=Math.max(24,3*s.width);
        if(length<minimum){invalid=true;return;}
        var fraction=length/s.length,shortened=Object.assign({},s,{x2:s.x+(s.x2-s.x)*fraction,y2:s.y+(s.y2-s.y)*fraction,length:length,v28RouteClipped:true,v28UnclippedLength:s.length});
        fitted.push(shortened);
      });
      if(!invalid&&fitted.length===chain.length)out=out.concat(fitted);
    });
    return out;
  }
  function makeBarrage(w,emitter,beat,opts){
    var p=profileFor(w);if(!p||!w.boss||!emitter||![emitter.x,emitter.y].every(finite))return[];
    opts=opts||{};beat=Number.isInteger(beat)?Math.max(0,beat):0;
    var phase=phaseFor(w,opts),mode=p.modes[phase],cap=limitFor(w,opts),count=cap-(phase===0?2:phase===1?1:0),out=[];
    var shield=p.index===33&&(emitter.modelActorId==='baek-ion'||emitter.sourceActorId==='baek-ion');
    if(p.index===33)mode=shield?'parallel':'fork';
    if(mode==='reflect')count=Math.max(1,Math.floor(cap/2));else count=Math.max(2,count);
    var origin=point(emitter.x,emitter.y),target=point(w.player&&w.player.x||180,w.player&&w.player.y||550);
    var width=clamp(p.width*(w.difficulty==='hell'?1.08:w.difficulty==='gentle'?.86:1)*(phase===2?1.15:phase===1?1.05:1),3.6,14.5);
    var warning=w.difficulty==='gentle'?66:54,active=8+((p.index+phase)%5)*2,fade=8+(p.index%3)*2;
    var keyCount=w.difficulty==='hell'?12:w.difficulty==='gentle'?8:10,rest=(beat*(p.index%3+1)+phase*2+p.index)%keyCount;
    var reverse=(beat+phase+p.index)%2?1:-1,pattern=p.id+'-p'+phase,initialDelay=(p.index%3)*3;
    function append(a,b,ordinal,group,segment,reflected,chain,extra){
      var dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<12)return;
      var stagger=mode==='triads'?Math.floor(ordinal/3)*(p.stepTicks+5):ordinal*p.stepTicks;
      var s={x:a.x,y:a.y,x2:b.x,y2:b.y,angle:Math.atan2(dy,dx),length:length,width:width,
        warningTicks:warning,staggerTicks:clamp(initialDelay+stagger,0,55),activeTicks:active,fadeTicks:fade,
        ownerId:w.boss.id,sourcePhase:phase,kind:'laser',color:'#ffffff',paletteSlot:(ordinal+phase)%2,
        patternId:'barrage-'+p.id+'-v28',v28Pattern:pattern,v28Mode:mode,v28RayGroup:group,v28Segment:segment,
        v28Reflected:!!reflected,chainId:chain,identityRole:p.index===33?(shield?'circuit-shield':'circuit-cross'):p.index===34?['authority-fold','authority-stitch','authority-impact'][phase]:p.role};
      if(emitter.sourceActorId)s.sourceActorId=emitter.sourceActorId;if(emitter.modelActorId)s.modelActorId=emitter.modelActorId;
      if(extra)Object.keys(extra).forEach(function(k){s[k]=extra[k];});out.push(s);
    }
    // Scan past resting keys so a small gentle salvo cannot consist entirely
    // of its two rests. The admitted ray count still obeys the same budget.
    var attempts=mode==='piano'?Math.min(keyCount,count+2):count;
    for(var i=0;i<attempts;i++){
      if(mode==='piano'&&out.length>=count)break;
      var order=reverse>0?i:count-1-i,u=order-(count-1)/2,side=i%2?1:-1;
      var a=point(origin.x,origin.y),b,angle=DOWN,chain='laser-'+p.index+'-'+phase+'-'+beat+'-'+i;
      if(mode==='reflect'){
        // The actual first capsule stops at the side wall. Its second capsule
        // flips horizontal direction and stops at the next outer boundary.
        // Both receive the exact same warning/activation clocks and chain id.
        a=point(origin.x+side*(8+(p.index%3)*4),origin.y+(i%2)*7);
        var reflectionAngle=.84+phase*.025+Math.min(i,3)*.02;
        angle=side<0?Math.PI-reflectionAngle:reflectionAngle;
        var wallX=side<0?BOUNDS.left:BOUNDS.right,dx=Math.cos(angle),dy=Math.sin(angle),distance=(wallX-a.x)/dx;
        var hitY=a.y+dy*distance;if(hitY<BOUNDS.top||hitY>BOUNDS.bottom-12)continue;
        var hit=point(wallX,hitY),next=clipRay(hit.x,hit.y,Math.atan2(dy,-dx));
        if(Math.hypot(hit.x-a.x,hit.y-a.y)<12||Math.hypot(next.x-hit.x,next.y-hit.y)<12)continue;
        append(a,hit,i,i,0,true,chain);append(hit,next,i,i,1,true,chain);continue;
      }
      if(mode==='sweep'){
        a=point(origin.x+side*(8+(p.index%4)*3),origin.y+(i%2)*5);
        angle=DOWN+u*(.14+(p.index%4)*.018)+Math.sin(beat*.6+p.index)*.11+phase*reverse*.035;
        b=clipRay(a.x,a.y,angle);
      }else if(mode==='parallel'){
        a=point(origin.x+u*(17+(p.index%4)*3),origin.y+(i%2)*7);
        angle=DOWN+reverse*(.055+(p.index%3)*.032)+phase*.025;b=clipRay(a.x,a.y,angle);
      }else if(mode==='cross'){
        a=point(side<0?18+(p.index%4)*5:342-(p.index%4)*5,92+phase*13+Math.floor(i/2)*(12+(p.index%3)*3));
        b=point(side<0?260-u*5:100-u*5,598-(i%3)*20-phase*8);
      }else if(mode==='diagonal'){
        a=point(origin.x+u*19,origin.y-Math.abs(u)*5);
        angle=DOWN+side*(.29+(p.index%4)*.065)+u*.045+reverse*phase*.025;b=clipRay(a.x,a.y,angle);
      }else if(mode==='spokes'){
        var spoke=order*TAU/count+beat*(.18+(p.index%3)*.04)+phase*.22;
        a=point(origin.x+Math.cos(spoke)*(24+(p.index%4)*5),origin.y+Math.sin(spoke)*17);
        angle=DOWN+Math.cos(spoke)*(.47+phase*.10)+Math.sin(spoke)*.17;b=clipRay(a.x,a.y,angle);
      }else if(mode==='piano'){
        var lane=(i+beat+phase)%keyCount;if(lane===rest||lane===(rest+1)%keyCount)continue;
        a=point(24+lane*312/(keyCount-1),70+(p.index%3)*5);
        b=point(a.x+(p.index===18?Math.sin(beat*.7)*30:phase===2?reverse*12:0),BOUNDS.bottom);
        append(a,b,i,i,0,false,chain,{v28LaneIndex:lane,v28RestLane:rest,v28KeyCount:keyCount});continue;
      }else if(mode==='relay'){
        var slot=(order+beat*(p.index%2+1)+phase)%6;
        if(p.index===32)slot=5-slot;
        a=point(35+slot*58,76+(slot%2)*14);
        b=point(a.x+reverse*(20+(i%2)*13),BOUNDS.bottom-(i%3)*14);
      }else if(mode==='stairs'){
        a=point(36+order*288/Math.max(1,count-1),80+(i%3)*14);
        b=point(a.x+reverse*(8+phase*5),462+(order%3)*70+phase*10);
      }else if(mode==='reticle'){
        // Aim is sampled once now. Neither later pilot movement nor caster
        // movement changes these committed endpoints during the barrage.
        a=point(origin.x+u*(11+(p.index%3)*3),origin.y+(i%2)*6);
        b=point(target.x+u*(15+(p.index%4)*3),target.y+50+(i%2)*14);
      }else if(mode==='fork'){
        a=point(origin.x+side*(18+(p.index%3)*7),origin.y+Math.floor(i/2)*3);
        b=point(side<0?46+Math.floor(i/2)*16:314-Math.floor(i/2)*16,BOUNDS.bottom-(i%2)*15);
      }else if(mode==='bars'){
        // A finite bar does not pretend to continue beyond its visible end.
        // Alternating sides leave a broad open pocket between the two halves.
        var y=304+(order%4)*66+(p.index%3)*6+phase*8;
        a=point(side<0?BOUNDS.left:BOUNDS.right,y);
        b=point(side<0?142-(p.index%3)*8:218+(p.index%3)*8,y+reverse*(8+phase*7));
      }else if(mode==='triads'){
        var group=Math.floor(i/3),note=i%3;
        a=point(origin.x+(note-1)*(22+(p.index%4)*4)+reverse*group*18,origin.y-group*9);
        // Outside notes open away from the centre. A converging three-note
        // chord can otherwise disappear entirely into a reserved central gate.
        angle=DOWN-(note-1)*(.18+(p.index%3)*.04)+reverse*group*.075;b=clipRay(a.x,a.y,angle);
      }
      if(b)append(a,b,i,i,0,false,chain);
    }
    return fitRoute(out,routeFor(w,opts),Math.max(0,finite(opts.playerRadius)?opts.playerRadius:w.player&&finite(w.player.r)?w.player.r:2));
  }
  return Object.freeze({profiles:profiles,profileFor:profileFor,cadenceFor:cadenceFor,makeBarrage:makeBarrage,bounds:BOUNDS});
});
