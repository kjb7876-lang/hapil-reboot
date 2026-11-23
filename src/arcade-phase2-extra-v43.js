(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.HapilPhase2Extension=factory;
})(typeof globalThis==='undefined'?this:globalThis,function bind(base,Native,assetBindings={},reservedHashes=[]){
  if(!base?.atlasSpec||!base?.phaseAt||!base?.paint||!Array.isArray(Native?.SEGMENTS)||!Array.isArray(Native?.STAGES))throw Error('exact phase2 and native tables required');
  const def=[
    [227,'p2_wrath','20',18,'불길 한가운데','split-fire-corridor','wrath-ash-corridor','main'],
    [321,'p3_gate','29',26,'기억의 문','asymmetric-memory-gates','p3-gate-memory-wings','episode'],
    [325,'p3_gate','29',26,'귀환 좌표','return-coordinate-grid','p3-gate-return-grid','episode'],
    [489,'siren','46',39,'노이론 케이블','asymmetric-noiron-cables','siren-noiron-cables','episode'],
    [572,'executor','55',46,'옥상의 순환','reversing-rooftop-route','executor-rooftop-reversal','episode'],
    [574,'executor','55',46,'인과 고정','cause-lock-shutters','executor-cause-lock','episode']
  ];
  const specs=Object.freeze(Object.fromEntries(def.map(([seg,actor,scene,stage,card,theme,artId,role])=>
    [seg,Object.freeze({seg,actor,scene,stage,card,theme,artId,role,eligibleKind:'spell'})])));
  const shaOK=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
  const owned={};
  for(const [id,v] of Object.entries(assetBindings)) {
    if(!Object.values(specs).some(s=>s.artId===id)||!v||!shaOK(v.sha256)||typeof v.path!=='string'||!v.path||/^(?:https?:|data:|blob:)/.test(v.path))throw Error('unknown or unpinned art binding '+id);
    if(reservedHashes.includes(v.sha256)||Object.values(owned).some(k=>k.sha256===v.sha256||k.path===v.path))throw Error('one distinct art asset per move');
    owned[id]=Object.freeze({...v});
  }
  Object.freeze(owned);
  const r=Object.freeze({x0:8,y0:40,x1:352,y1:626}),w=r.x1-r.x0,h=r.y1-r.y0,N=w*h;
  const TIMES=Object.freeze(Object.fromEntries(Object.entries({gentle:[154,12,33],easy:[154,12,33],normal:[145,15,35],hell:[136,17,36]}).map(([d,a])=>[d,Object.freeze(a)])));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const fract=x=>x-Math.floor(x);
  const lane=(v,u)=>Math.abs(v-u);
  function rank(theme,u,v) {
    if(theme==='split-fire-corridor'){
      const braid=.057*Math.sin(v*8.2)+.019*Math.sin(v*39);
      return Math.min(lane(u,.31+braid+.07*v),lane(u,.80+.6*braid-.08*v))+.035*Math.max(.33-v,0);
    }
    if(theme==='asymmetric-memory-gates'){
      const lh=Math.max(lane(u,.30+.08*(v-.4))*.88,lane(v,.35)*.80);
      const rh=Math.max(lane(u,.80-.05*(v-.7))*1.10,lane(v,.65)*.92);
      return Math.min(lh,rh)+.012*Math.sin(v*27+u*7);
    }
    if(theme==='return-coordinate-grid'){
      const tx=fract(u*4+v*.51+.12),ty=fract(v*5-u*.28+.11);
      return .56*Math.min(tx,1-tx)+.38*Math.min(ty,1-ty)+.04*v;
    }
    if(theme==='asymmetric-noiron-cables'){
      let m=Infinity;
      for(let k=0;k<4;k++){
        const c=[.24,.44,.65,.83][k]+(.022+.017*k)*Math.sin(v*(6+k)+k*1.4)+(k===1?-.13:v*.04)*(v-.3);
        m=Math.min(m,lane(u,c)*(1.15-.11*k)+Math.max(.15-.03*k-v,0)*.34);
      }
      return m;
    }
    if(theme==='reversing-rooftop-route'){
      const kink=u-.51-.19*Math.sin(v*6.3+.22)-.13*(v-.5);
      const top=Math.abs(v-.26+.075*Math.sin(u*11))*1.5,bot=Math.abs(v-.76+.085*Math.sin(u*12+1))*1.55;
      return Math.min(Math.abs(kink),Math.min(top,bot))+.025*((Math.floor(v*9)%2)?1:0);
    }
    if(theme==='cause-lock-shutters'){
      const a=fract(v*4.7-u*.26+.09); const c=lane(a,.32)+.09*lane(u,.77);
      const b=fract(v*3.8+u*.22+.35); const f=lane(b,.66)+.12*lane(u,.23);
      return Math.min(c,f);
    }
    throw Error('unknown extension pattern');
  }
  function plan(seg,difficulty,side=1){
    const p=specs[seg];if(!p||!Object.hasOwn(TIMES,difficulty))return null;
    side=side>=0?1:-1;
    // A fully connected 42px side strip survives at all rows, including mobile bottom bounds.
    const cab=42, safe=side>0?[r.x0,r.x0+cab]:[r.x1-cab,r.x1];
    const center=p.theme==='split-fire-corridor'?[154,206]:null;
    const v=new Uint16Array(N),den=2048,buckets=new Uint32Array(den+1);
    const wanted=Math.round(base.target[difficulty]*N);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const cell=y*w+x;if(r.x0+x>=safe[0]&&r.x0+x<safe[1]){v[cell]=65535;continue;}
      let u=(x+.5)/w; if(side<0)u=1-u;
      if(center&&x+r.x0>=center[0]&&x+r.x0<center[1]){v[cell]=65535;continue;}
      const n=clamp(Math.round((rank(p.theme,u,(y+.5)/h)+.04)*den),0,den);v[cell]=n;buckets[n]++;
    }
    let limit=0,under=0;
    while(limit<=den&&under+buckets[limit]<wanted)under+=buckets[limit++];
    if(limit>den)return null;
    let ties=wanted-under,seen=0; const rows=[];
    for(let y=0;y<h;y++) {
      const list=[];let start=-1;
      for(let x=0;x<w;x++) {
        const hit=v[y*w+x]<limit||(v[y*w+x]===limit&&ties-->0);
        if(hit){seen++;if(start<0)start=x;}
        else if(start>=0){list.push(start+r.x0,x+r.x0);start=-1;}
      }
      if(start>=0)list.push(start+r.x0,r.x1);rows.push(Object.freeze(list));
    }
    if(seen!==wanted)throw Error('mask size mismatch');
    return Object.freeze({ok:true,theme:p.theme,difficulty,area:r,rows:Object.freeze(rows),
      coverage:seen/N,target:base.target[difficulty],cells:seen,safeLane:Object.freeze(safe),interiorSafeLane:center&&Object.freeze(center),
      origin:Object.freeze({x:180,y:116}),side,timing:TIMES[difficulty]});
  }
  function identity(seg) {
    if(!Number.isInteger(seg)||!Object.hasOwn(specs,seg))return null;
    const p=specs[seg],n=Native.SEGMENTS[seg],stage=n&&Native.STAGES[n.stage];
    return n&&n.spell===true&&!n.mid&&n.kind==='card'&&n.actor===p.actor&&n.scene===p.scene&&n.name===p.card&&stage?.scene===p.scene&&stage.index+1===p.stage?p:null;
  }
  // Locked sources are admitted only when pack tooling has matched their delivered byte hash.
  // An image element alone is not identity proof; adapter must provide manifest-verified provenance.
  function make(s,{art,side=1,priorEvent=null,blocked=false}={}){
    if(!s||blocked||s.stage!=='card'||s.cardDown||s.cardEnding||s.calm||s.wrathTraverse&&!s.wrathTraverse.done||s.formHold>s.tick||s.bossEntrance?.readyTick>s.tick||!Number.isFinite(s.tick)||!(s.boss?.hp>0))return null;
    const p=identity(s.seg);
    if(!p||p.actor!==s.boss.actor||s.stageIndex!==p.stage-1||!owned[p.artId])return null;
    if(priorEvent&&priorEvent.seg===s.seg&&base.phaseAt(priorEvent.plan,s.tick-priorEvent.start))return null;
    const b=owned[p.artId];
    if(!art||art.artId!==p.artId||art.sha256!==b.sha256||art.path!==b.path||
        art.frameCount<20||!base.atlasSpec(art,p.theme)||(p.theme==='split-fire-corridor'&&(!Array.isArray(art.clearSourceX)||art.clearSourceX.length!==2||!art.clearSourceX.every(Number.isInteger)||art.clearSourceX[0]<=0||art.clearSourceX[1]>=art.cellWidth||art.clearSourceX[0]>=art.clearSourceX[1])))return null;
    const h=plan(s.seg,s.difficulty,side);if(!h)return null;
    // Reusable core draws the unmodified Image via native Ink and uses its own live hit gate.
    const a=Object.freeze({...art,clearSourceX:art.clearSourceX&&Object.freeze([...art.clearSourceX]),cells:art.cells&&Object.freeze(art.cells.map(c=>Object.freeze([...c]))),
      framesByPhase:art.framesByPhase&&Object.freeze(Object.fromEntries(Object.entries(art.framesByPhase).map(([key,val])=>[key,Object.freeze([...val])])))});
    return Object.freeze({plan:h,art:a,actor:p.actor,seg:s.seg,start:s.tick,extension:p.theme});
  }
  function paint(ctx,event,s){
    const gap=event?.plan.interiorSafeLane;
    if(!gap)return base.paint(ctx,event,s);
    // The verified donor already has an alpha-clear central strip. Preserve both source
    // banks and compress only the invisible gap during this draw, not the donor itself.
    // Both bank calls reach the exact target Canvas's native Ink wrapper, inside base clip.
    const shim=new Proxy(ctx,{
      get(o,k){
        if(k==='drawImage')return (img,sx,sy,sw,sh,dx,dy,dw,dh)=>{
          const [a,b]=event.art.clearSourceX;
          o.drawImage(img,sx,sy,a,sh,dx,dy,gap[0]-dx,dh);
          o.drawImage(img,sx+b,sy,sw-b,sh,gap[1],dy,dx+dw-gap[1],dh);
        };
        const v=Reflect.get(o,k,o);return typeof v==='function'?v.bind(o):v;
      },
      set(o,k,v){return Reflect.set(o,k,v,o);}
    });
    return base.paint(shim,event,s);
  }
  const parkedMidboss=Object.freeze({activation:false,id:'midboss-study-one-move',seg:317,actor:'controller',stage:26,scene:'29',card:'기억의 문에 빙의',proposal:'Native identity must be chosen and signed off first; two offset brush-stamped cables sketch opposite lanes while leaving one ≥42px corridor. Pre-mark before any hit; never reuse a main atlas just to count.'});
  return Object.freeze({specs,owned,identity,plan,make,parkedMidboss,hit:base.hit,paint});
});
