(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HapilPhase2Local = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
  'use strict';
  const limits=Object.freeze({mid:1,main:2,episode:3});
  const authored={
    p2_wrath: { stage:18, scene:'20', themes:['flame-cone'] },
    p3_gate: { stage:26, scene:'29', themes:['machine-tentacles'] },
    asmodeus: { stage:15, scene:'17', themes:['giant-kiss','broken-heart'] },
    balrog: { stage:7, scene:'07', themes:['meteor','spatial-slash'] },
    siren: { stage:39, scene:'46', themes:['time-acceleration','gravity'] },
    executor: { stage:46, scene:'55', themes:['falling-vehicles'] }
  };
  const roster=Object.freeze(Object.fromEntries(Object.entries(authored).map(([k,v])=>[k,Object.freeze({...v,role:v.role||'main',cardOrdinals:Object.freeze(v.cardOrdinals||[1]),themes:Object.freeze(v.themes)})])));
  const target = Object.freeze({ gentle:.50, easy:.50, normal:.60, hell:.70 });
  const atlasKeys = Object.freeze(Object.values(roster).flatMap(x=>x.themes));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const dt = Object.freeze(Object.fromEntries(Object.entries({gentle:[154,12,33],easy:[154,12,33],normal:[145,15,35],hell:[136,17,36]}).map(([k,v])=>[k,Object.freeze(v)])));
  const defaultArena = Object.freeze({ x0:8,x1:352,y0:40,y1:626 });
  const coords=(r)=>{ let a={...defaultArena,...r}; if (![a.x0,a.x1,a.y0,a.y1].every(Number.isInteger)||a.x1-a.x0<100||a.y1-a.y0<160||a.x1-a.x0>2048||a.y1-a.y0>2048) throw Error('invalid logical arena'); return a; };
  const truckCenters=[[.24,.23],[.66,.28],[.43,.55],[.25,.81],[.69,.80]];
  function vehicleMetric(u,v,side) {
    let out=[Infinity,0];
    for(let i=0;i<truckCenters.length;i++) {
      let [x,y]=truckCenters[i];if(side<0)x=1-x;
      const d=Math.pow(Math.abs(u-x)/.255,3.8)+Math.pow(Math.abs(v-y)/.205,3.8);
      if(d<out[0])out=[d,i];
    }return out;
  }
  function profile(key,w,h,core,side,x,y) {
    const u=x/w, v=y/h;
    const dist=(xx,yy)=>Math.hypot(u-xx,(v-yy)*.95);
    if (key==='flame-cone') {
      const dy=y-core.y;
      if (dy<0) return Infinity;
      const step=clamp(dy/(h-core.y-1),0,1);
      const drift=side*w*(.14*step+.045*Math.sin(5*step));
      const edge=((x-core.x-drift)/(Math.sign(x-core.x-drift)===side?1.22:.88));
      // Immediate broad shoulder rather than global radial burst; one continuous diagonal sweep.
      const grow=Math.pow(Math.min(1,dy/Math.max(18,h*.065)),.79);
      if (dy<2 && Math.abs(edge)>14) return Infinity;
      return Math.max(0,Math.abs(edge)-w*(.015+grow*.03)+w*grow*.009*Math.sin(29*step+u*13))/(grow+.05);
    }
    if (key==='machine-tentacles') {
      const p = [.16,.35,.56,.80]; let d=Infinity;
      for (let k=0;k<4;k++) d=Math.min(d, Math.abs(u-(p[k]+.07*Math.sin(v*9+k*1.8)+side*.13*(v-.5)))*w+(Math.max(0,.13-v))*35);
      return d;
    }
    if (key==='giant-kiss') return Math.sqrt(Math.pow((u-.50-.13*side*(v-.46))/.68,2)+Math.pow((v-.48-.055*Math.cos((u-.5)*Math.PI*2))/.65,2));
    if (key==='broken-heart') {
      const a=dist(.30,.42),b=dist(.68,.48);
      return Math.min(a,b)+.05*Math.abs(u-.48+Math.sin(v*17)*.065)+.09*Math.max(v-.62,0);
    }
    if (key==='meteor') return Math.min(dist(.27,.50),dist(.65,.70),dist(.62,.21)+.045);
    if (key==='spatial-slash') return Math.abs(u-(.51+side*(v-.45)*.74)+.045*Math.sin(7*v));
    if (key==='time-acceleration') return Math.abs(v-(.4+.29*u*side))*.65 + Math.abs(Math.sin(u*15+v*8))*.10;
    if (key==='falling-vehicles') return vehicleMetric(u,v,side)[0];
    if (key==='gravity') return Math.min(dist(.24,.36),dist(.73,.68));
    throw Error('unknown phase 2 theme');
  }
  // Explicit on-screen center path for a conservative escape corridor. The reserved stripe
  // is part of the topology, never glow/particle art nor a second collider shape.
  function safeBounds(w,side) {
    const dw=Math.max(38,Math.round(w*.113)); return side>0?[0,dw]:[w-dw,w];
  }
  function plan({theme,difficulty='normal', arena, boss, side=1}) {
    if (!atlasKeys.includes(theme)||!Object.hasOwn(target,difficulty)) throw Error('unknown target');
    if (boss&&(!Number.isFinite(boss.x)||!Number.isFinite(boss.y)))return {ok:false,reason:'invalid boss origin',theme};
    side=side>=0?1:-1;
    const r=coords(arena),w=r.x1-r.x0,h=r.y1-r.y0,N=w*h;
    const a=safeBounds(w,side);
    const core={x:clamp(Math.round((boss?.x??(r.x0+r.x1)/2)-r.x0),0,w-1),
      y:clamp(Math.round((boss?.y??118)+10-r.y0),0,h-1)};
    if(theme==='flame-cone'&&core.x>=a[0]&&core.x<a[1])return {ok:false,reason:'root occupies safe corridor',theme};
    const rank=new Float32Array(N);const wanted=Math.round(target[difficulty]*N);
    let possible=0, max=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const q=x>=a[0]&&x<a[1]?Infinity:profile(theme,w,h,core,side,x+.5,y+.5);rank[y*w+x]=q;
      if(Number.isFinite(q)){possible++;max=Math.max(q,max);}
    }
    if(possible<wanted)return {ok:false,reason:'origin/safe-lane capacity',theme,maxCoverage:possible/N,wanted:target[difficulty]};
    const M=4096, bins=new Uint32Array(M+1);
    const code=q=>Math.round(q/max*M);
    for(const q of rank)if(Number.isFinite(q))bins[code(q)]++;
    let q=0,count=0;
    while(count+bins[q]<wanted)count+=bins[q++];
    const rows=[], vehicleRows=theme==='falling-vehicles'?truckCenters.map(()=>[]):null; let ties=wanted-count, marked=0;
    for(let y=0;y<h;y++){
      let line=[],start=-1;
      if(vehicleRows)for(const l of vehicleRows)l.push([]);
      let lastVehicle=-1,vehicleStart=-1;
      for(let x=0;x<w;x++){
        const v=rank[y*w+x], c=code(v), hit=Number.isFinite(v)&&(c<q||(c===q&&ties-->0));
        if(vehicleRows){
          const group=hit?vehicleMetric((x+.5)/w,(y+.5)/h,side)[1]:-1;
          if(lastVehicle!==group){if(lastVehicle>=0)vehicleRows[lastVehicle][y].push(r.x0+vehicleStart,r.x0+x);lastVehicle=group;vehicleStart=x;}
        }
        if(hit){marked++;if(start<0)start=x;}
        else if(start>=0){line.push(r.x0+start,r.x0+x);start=-1;}
      }
      if(vehicleRows){if(lastVehicle>=0)vehicleRows[lastVehicle][y].push(r.x0+vehicleStart,r.x1);for(const l of vehicleRows)Object.freeze(l[y]);}
      if(start>=0)line.push(r.x0+start,r.x1);rows.push(Object.freeze(line));
    }
    if(marked!==wanted)throw Error('mask accounting');
    return Object.freeze({ok:true,theme,difficulty,area:Object.freeze(r),rows:Object.freeze(rows),
      coverage:marked/N,target:target[difficulty],cells:marked,safeLane:Object.freeze([r.x0+a[0],r.x0+a[1]]),
      origin:Object.freeze({x:r.x0+core.x,y:r.y0+core.y}),side,
      landings:vehicleRows&&Object.freeze(vehicleRows.map(Object.freeze)),
      timing:vehicleRows?Object.freeze([dt[difficulty][0],35,dt[difficulty][2]]):dt[difficulty]});
  }
  // Same integer cell union is exported for both paint clipping and center point collisions.
  function contains(p,x,y,landing=null) {
    if (!p?.ok||!Number.isFinite(x)||!Number.isFinite(y)) return false;
    const rows=landing===null?p.rows:p.landings?.[landing];const line=rows?.[Math.floor(y)-p.area.y0]; if(!line)return false;
    for(let i=0;i<line.length;i+=2)if(x>=line[i]&&x<line[i+1])return true;return false;
  }
  function phaseAt(p,age) {
    if(!p?.ok||age<0)return null;
    const [w,a,d]=p.timing;
    if(age<w)return {name:'telegraph',local:age,duration:w};
    if(age<w+a)return {name:'active',local:age-w,duration:a};
    if(age<w+a+d)return {name:'decay',local:age-w-a,duration:d};return null;
  }
  function atlasSpec(spec,theme) {
    const styles={'flame-cone':'coneFan','machine-tentacles':'cableFan',meteor:'impactTile','falling-vehicles':'vehicleLand'};
    if(spec?.style&&spec.style!==styles[theme]&&spec.style!=='arena')return false;
    if(!spec||spec.theme!==theme||!spec.image||!spec.image.complete||!Number.isInteger(spec.frameCount)||(spec.frameCount<20&&!(theme==='flame-cone'&&spec.style==='coneFan'&&spec.frameCount>=12&&spec.presentationSteps>=24))||!Number.isInteger(spec.cellWidth)||!Number.isInteger(spec.cellHeight)||spec.cellWidth<1||spec.cellHeight<1||!Number.isInteger(spec.columns)||spec.columns<1||spec.columns>spec.frameCount)return false;
    if ((spec.style==='coneFan'||spec.style==='impactTile'||spec.style==='cableFan'||spec.style==='vehicleLand')&&(!Array.isArray(spec.anchor)||spec.anchor.length!==2||!spec.anchor.every(Number.isFinite)||spec.anchor[0]<0||spec.anchor[1]<0||spec.anchor[0]>=spec.cellWidth||spec.anchor[1]>=spec.cellHeight))return false;
    if (spec.framesByPhase!==undefined&&(!Object.keys(spec.framesByPhase).every(n=>['telegraph','active','decay'].includes(n))||!Object.values(spec.framesByPhase).every(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isInteger)&&r[0]>=0&&r[1]<spec.frameCount&&r[0]<=r[1])))return false;
    if (spec.cells!==undefined) {
      if(!Array.isArray(spec.cells)||spec.cells.length!==spec.frameCount)return false;
      return spec.cells.every(c=>Array.isArray(c)&&c.length===4&&c.every(Number.isInteger)&&c[0]>=0&&c[1]>=0&&c[2]===spec.cellWidth&&c[3]===spec.cellHeight&&c[0]+c[2]<=spec.image.naturalWidth&&c[1]+c[3]<=spec.image.naturalHeight)
        &&spec.cells.every((a,i)=>spec.cells.slice(i+1).every(b=>a[0]+a[2]<=b[0]||b[0]+b[2]<=a[0]||a[1]+a[3]<=b[1]||b[1]+b[3]<=a[1]));
    }
    return spec.image.naturalWidth===spec.columns*spec.cellWidth&&spec.image.naturalHeight===Math.ceil(spec.frameCount/spec.columns)*spec.cellHeight;
  }
  function make(runtimeState,{stage,scene,actor,cardOrdinal,mid=false,role=mid?'mid':'main',themeIndex=0,renderSpec,arena,side=1}={}) {
    if(!runtimeState||!Object.hasOwn(roster,actor)||!Number.isInteger(themeIndex))return null;
    const b=roster[actor];
    if(!b||stage!==b.stage||scene!==b.scene||role!==b.role||!!mid!==(role==='mid')||!b.cardOrdinals.includes(cardOrdinal)||runtimeState.stage!=='card'||runtimeState.cardEnding||runtimeState.cardDown||runtimeState.calm||runtimeState.boss?.actor!==actor||!(runtimeState.boss?.hp>0))return null;
    const theme=b.themes[((themeIndex%b.themes.length)+b.themes.length)%b.themes.length|0];
    if(!atlasSpec(renderSpec,theme)||(theme==='falling-vehicles'&&(renderSpec.style!=='vehicleLand'||renderSpec.alternateSpec?.style!=='vehicleLand'||!atlasSpec(renderSpec.alternateSpec,theme))))return null; // don't create invisible hitboxes / don't imply art exists
    const p=plan({theme,difficulty:runtimeState.difficulty,arena,boss:runtimeState.boss,side});
    function freezeArt(spec) {
      return Object.freeze({...spec,anchor:spec.anchor&&Object.freeze([...spec.anchor]),cells:spec.cells&&Object.freeze(spec.cells.map(c=>Object.freeze([...c]))),
        framesByPhase:spec.framesByPhase&&Object.freeze(Object.fromEntries(Object.entries(spec.framesByPhase).map(([k,v])=>[k,Object.freeze([...v])]))),
        alternateSpec:spec.alternateSpec&&freezeArt({...spec.alternateSpec,alternateSpec:undefined})});
    }
    return p.ok?Object.freeze({plan:p,art:freezeArt(renderSpec),actor,seg:runtimeState.seg,start:runtimeState.tick}):null;
  }
  function live(event,s) {
    return event&&s&&s.stage==='card'&&!s.cardEnding&&!s.cardDown&&!s.calm&&s.boss?.actor===event.actor&&s.boss.hp>0&&s.seg===event.seg&&event.art.image.complete&&event.art.image.naturalWidth>0&&(!event.art.alternateSpec||event.art.alternateSpec.image.complete&&event.art.alternateSpec.image.naturalWidth>0)&&phaseAt(event.plan,s.tick-event.start);
  }
  const impactIndex=(p,ph)=>p.landings&&ph?.name==='active'?Math.min(p.landings.length-1,Math.floor(ph.local/7)):null;
  function hit(event,s) {
    const ph=live(event,s);
    return !!(ph&&ph.name==='active'&&contains(event.plan,s.player?.x,s.player?.y,impactIndex(event.plan,ph)));
  }
  function paint(ctx,event,s) {
    const ph=live(event,s); if(!ph)return false;
    const [range,tint]=ph.name==='telegraph'?[[0,.29],.27]:ph.name==='active'?[[.30,.70],.78]:[[.71,1],.25*(1-ph.local/ph.duration)];
    const p=event.plan,a=event.art,r=p.area;
    const progress=ph.local/Math.max(1,ph.duration-1);
    const rate=localEffects(event,s).phaseTextureRate;
    const u=ph.name==='active'?1-Math.pow(1-progress, (p.theme==='time-acceleration'?rate:1)*1.85):progress;
    const span=a.style==='impactTile'?(ph.name==='telegraph'?[0,.49]:ph.name==='active'?[.50,.77]:[.78,1]):range;
    const fspan=a.framesByPhase?.[ph.name]||span.map(v=>v*(a.frameCount-1));
    const frame=Math.min(a.frameCount-1,Math.round(fspan[0]+(fspan[1]-fspan[0])*u));
    function src(f,...to){f=clamp(f,0,a.frameCount-1);const cell=a.cells?a.cells[f]:[(f%a.columns)*a.cellWidth,Math.floor(f/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight];ctx.drawImage(a.image,...cell,...to);}
    function tile(x,y,angle,sx,sy,f){ctx.save();try{ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx/a.cellWidth,sy/a.cellHeight);src(f,-a.anchor[0],-a.anchor[1],a.cellWidth,a.cellHeight);}finally{ctx.restore();}}
    ctx.save();try{
      ctx.beginPath();
      const group=impactIndex(p,ph),rows=group===null?p.rows:p.landings[group];
      for(let y=0;y<rows.length;y++) {const l=rows[y];for(let i=0;i<l.length;i+=2)ctx.rect(l[i],r.y0+y,l[i+1]-l[i],1);}
      ctx.clip();
      // A constant low backing is the exact threatened ground, even through transparent authored texture;
      // visible emergency boundary/underlay is not an extra damage region outside the mask.
      ctx.globalAlpha*=tint;ctx.fillStyle=globalThis.HapilInk?.on?(ph.name==='telegraph'?'#c2362a':'#f2c46d'):(a.boundaryTint||'#aa343b');ctx.fillRect(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0);
      ctx.globalAlpha=Math.min(1,ctx.globalAlpha*1.17);
      const W=r.x1-r.x0,H=r.y1-r.y0;
      if(a.style==='vehicleLand'&&ph.name!=='telegraph'){
        const group=impactIndex(p,ph), set=group===null?[0,1,2,3,4]:[group];
        for(const i of set){
          let [x,y]=truckCenters[i];if(p.side<0)x=1-x;
          const spec=i%2?a.alternateSpec:a;const fspan=spec.framesByPhase?.[ph.name]|| (ph.name==='telegraph'?[0,10]:ph.name==='active'?[16,20]:[21,23]);
          const z=ph.name==='active'?1-Math.pow(1-(ph.local%7)/6,1.85):clamp(progress-i*.036,0,1);
          const k=clamp(Math.round(fspan[0]+(fspan[1]-fspan[0])*z),0,spec.frameCount-1);
          const c=spec.cells?spec.cells[k]:[(k%spec.columns)*spec.cellWidth,Math.floor(k/spec.columns)*spec.cellHeight,spec.cellWidth,spec.cellHeight];
          const w=W*.52,hh=w*spec.cellHeight/spec.cellWidth;
          ctx.drawImage(spec.image,...c,r.x0+W*x-spec.anchor[0]*w/spec.cellWidth,r.y0+H*y-spec.anchor[1]*hh/spec.cellHeight,w,hh);
        }
      } else if(a.style==='vehicleLand'){
        // Ground warning only; the visibly descending vehicles are a separate non-hit overlay.
      } else if(a.style==='coneFan'){
        // Stock plume grows left→right from the cell's declared mouth. Rotate each toward a point
        // along the projected bottom; all three share a real common root and frame-offset layered cadence.
        const beat=Math.floor(progress*28);
        const angles=[-.48,-.30,-.085,.19,.45];
        for(let i=0;i<angles.length;i++){
          const tx=r.x0+W*(.5+p.side*.12+angles[i]),ty=r.y1,dx=tx-p.origin.x,dy=ty-p.origin.y;
          const offset=ph.name==='active'?Math.floor((beat+i*3)%6/3):0;
          ctx.save();try{
            // Two edge echoes and three clear main plumes. Spinner decor cannot modify mask.
            ctx.globalAlpha*=i===0||i===angles.length-1?.68:1;
            tile(p.origin.x,p.origin.y,Math.atan2(dy,dx),Math.hypot(dx,dy)*(1.25+.03*(i%3)),W*(.37+(i%3)*.06),frame+offset);
          }finally{ctx.restore();}
        }
      }else if(a.style==='cableFan') {
        [.16,.35,.56,.80].forEach((u,i)=>{
          const x=r.x0+W*u,y=r.y0+(i%2)*H*.15,tx=r.x0+W*(u+p.side*.11),ty=r.y1;
          tile(x,y,Math.atan2(ty-y,tx-x),Math.hypot(tx-x,ty-y)*1.18,W*.43,frame);
        });
      }else if(a.style==='impactTile') {
        const lobes=[[.27,.50],[.65,.70],[.62,.21]];
        lobes.forEach(([x,y],i)=>tile(r.x0+W*x,r.y0+H*y,0,W*(1.37-.20*i),W*(1.37-.20*i),frame));
      }else if(p.theme==='spatial-slash'&&p.side>0) {
        // Authored upper-right→lower-left. Positive side places slash centre on a positive X slope.
        ctx.save();try{ctx.translate(r.x0+r.x1,0);ctx.scale(-1,1);src(frame,r.x0,r.y0,W,H);}finally{ctx.restore();}
      }else src(frame,r.x0,r.y0,W,H);
    }finally{ctx.restore();}
    return true;
  }
  function paintApproach(ctx,event,s) {
    const ph=live(event,s);const art=event?.art,p=event?.plan;
    if(!ph||art.style!=='vehicleLand'||ph.name==='decay')return false;
    const r=p.area,W=r.x1-r.x0,H=r.y1-r.y0, age=s.tick-event.start;
    let drew=false;
    ctx.save();try {
      ctx.beginPath();ctx.rect(r.x0,r.y0,W,H);ctx.clip();
      for(let i=0;i<truckCenters.length;i++){
        const impact=p.timing[0]+i*7, t=1+(age-impact)/38;
        if(t<0||t>=1)continue;
        let [u,v]=truckCenters[i];if(p.side<0)u=1-u;
        const a=i%2?art.alternateSpec:art, sw=W*.44,sh=sw*a.cellHeight/a.cellWidth;
        const index=Math.round(6+9*t), cell=a.cells?a.cells[index]:[(index%a.columns)*a.cellWidth,Math.floor(index/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight];
        const y=r.y0-10+(v*H+10)*Math.pow(t,1.56);
        ctx.drawImage(a.image,...cell,r.x0+u*W-a.anchor[0]*sw/a.cellWidth,y-a.anchor[1]*sh/a.cellHeight,sw,sh);
        drew=true;
      }
    }finally {ctx.restore();}
    return drew;
  }
  // Optional themed adapter metadata, intentionally not applied to legacy mechanics here.
  function localEffects(event,s) {
    const ph=live(event,s);
    if(!ph||ph.name!=='active')return Object.freeze({phaseTextureRate:1,gravityVisual:0});
    if(event.plan.theme==='time-acceleration')return Object.freeze({phaseTextureRate:1.45,gravityVisual:0});
    if(event.plan.theme==='gravity')return Object.freeze({phaseTextureRate:1,gravityVisual:.24});
    return Object.freeze({phaseTextureRate:1,gravityVisual:0});
  }
  return Object.freeze({roster,limits,target,atlasKeys,defaultArena,plan,contains,phaseAt,make,hit,paint,paintApproach,impactIndex,localEffects,atlasSpec});
});
