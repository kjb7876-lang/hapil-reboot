(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./arcade-phase2-source-ink-v43.js'));
  else root.HapilPhase2Local = factory(root.HapilPhase2Source);
})(typeof globalThis === 'undefined' ? this : globalThis, function(Source) {
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
    if(theme==='spatial-slash')return slashPlan(difficulty,r,a,side);
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
  function hit(event,s,painter=paint) {
    const ph=live(event,s),x=s?.player?.x,y=s?.player?.y;
    if(!ph||ph.name!=='active'||(event.plan.cuts&&ph.local!==0)||
       !contains(event.plan,x,y,impactIndex(event.plan,ph)))return false;
    return !!Source?.test({event,state:s,painter,x,y,threshold:104});
  }
  // Original unmodified atlas 21a67888ee3e…, frame 7: alpha≥120,
  // a packed run per source row. No rectangular or padded contact envelope.
  const slashDonorAlpha='//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////7f.7h/7d.7f/79.7d/76.7a/6l.6o.70.71.73.78/6j.6n.6z.77/6k.6m.6y.75/6j.6m.6s.74/5i.5m.6i.6n.6q.72/5b.5c.5f.5i.6i.6z/59.5e.6i.6x/58.5c.6h.6w/56.5b.6f.6v/55.5a.68.6c.6d.6u/53.59.66.6u/52.59.69.6p/4s.4t.50.57.5i.5j.68.6n/4s.4u.4x.56.5g.5k.67.6m/4t.55.5b.5h.66.6l/4t.5f.64.6k/4t.5e.5t.5w.62.6j/4u.5e.5r.5u.60.6i/4u.5k.5o.5u.5v.6i.6q.6r/4u.6h.6o.6p/4t.6h.6m.6n/4s.6h.6k.6m/4r.6k/4q.6j/4o.6g/4m.6d/4m.4o.4t.6c/4s.6b/4s.5x.61.6a/4r.5w.60.6a/45.46.4q.5q.5w.5y.61.63.65.6a/44.45.4p.5n.60.62.65.69/44.45.4h.4i.4o.5k.65.68/43.45.4d.4h.4m.5i.64.67/43.45.4b.4f.4k.5g.64.67/42.45.4a.4e.4g.5f.63.66/42.44.46.5e.61.65/41.44.45.5d.60.61.63.65/40.5c.63.64/3z.5c.62.64/3y.5a.62.64/3w.59.61.62/3v.3y.40.58.60.61/3u.3w.3z.57/31.32.3z.57/2z.30.3y.5b/2x.2z.3x.50.51.58.59.5a/2t.2y.3w.4y.51.56/2s.2x.3r.3s.3u.4x.50.54/2r.2u.3q.4x.4y.53/2p.2t.3p.4v/2m.2s.3o.4u/2k.2q.3n.4t/2j.2o.3l.4t/2i.2m.3a.4s/2e.2l.3d.4r/2d.2l.3b.4r/2b.2k.2r.2t.30.32.36.4g.4l.4x/27.28.2a.2c.2d.2k.2p.4e.4m.4p.4u.4w/26.28.2d.2j.2n.4c.4m.4n/2c.2j.2l.41.44.49.4l.4m/2b.2j.2k.3z.45.47.4j.4l/2e.3v.44.46.4k.4l/2e.3q.43.44/2e.3o/2d.3m/2d.3k/2d.3j/2d.3c.3e.3i/2c.38.3e.3h/2c.36.3f.3j/2b.35.3f.3g.3h.3i/2a.34/29.33/1r.1s.27.32/26.31/1l.1o.1x.1y.24.30.31.32/1i.1l.1t.1y.1z.21.22.31/1e.1g.1h.1j.1t.2i.2m.2z/1d.1e.1u.2f.2n.2o.2u.2y/1b.1c.1t.2d.2u.2x/1a.1b.1s.2b.2t.2v/19.1a.1s.2d.2s.2u/18.19.1q.2a.2r.2s/17.18.1p.27/1n.26/1j.23.2n.2p/1a.1b.1h.22.2m.2n/14.15.1a.20/1b.1z/1b.1q.1u.1y/1a.1m.1u.1w/19.1k.1t.1v/17.1d.1g.1i.1s.1t/16.1a.1g.1h/13.18/z.16.1d.1e/z.14.1c.1d/x.10/v.y/t.w/r.t//m.o/k.m/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////';
  const slashDonorRows=Object.freeze(slashDonorAlpha.split('/').map(r=>Object.freeze(r?r.split('.').map(v=>parseInt(v,36)):[])));
  const slashWarnPose=[null,null,[232.918,155.324,-.438,41],[210.594,164.192,-.318,80],
    [185.766,176.198,-.416,134],[168.314,184.372,-.409,184],[154.566,190.495,-.402,241]];
  const slashImpactPoses=[[152.935,191.625,-.404,278],[153.456,191.689,-.401,282],
    [153.461,192.087,-.402,282],[152.849,192.686,-.400,282],[153.744,192.503,-.402,280]];
  const slashFadePoses=[[153.657,192.552,-.401],[152.969,192.855,-.399],[153.127,192.484,-.399],
    [152.888,192.572,-.398],[152.554,192.504,-.398],[153.475,192.120,-.396],[154.205,191.786,-.395],
    [155.707,191.420,-.394],[157.903,191.141,-.388],[166.387,188.940,-.399],[170.972,187.624,-.457],
    [170.469,187.463,-.505]].map(p=>[...p,280]);
  const slashTiming={gentle:[24,10,10,30,.70],easy:[24,10,10,30,.70],normal:[19,9,11,29,.89],hell:[16,8,11,28,1.07]};
  function slashTransform(line,src,width,fraction=1){
    const [x0,y0,x1,y1]=line,[sx,sy,angle,span]=src;
    const dx=(x1-x0)*fraction,dy=(y1-y0)*fraction,t=Math.atan2(-dy,-dx);
    return [x0+dx*.5,y0+dy*.5,Math.cos(t),Math.sin(t),Math.hypot(dx,dy)*.965/span,width,sx,sy,Math.cos(angle),Math.sin(angle)];
  }
  function slashMaskAt(t,x,y){
    const [cx,cy,c,s,length,width,sx,sy,co,si]=t,dx=x-cx,dy=y-cy;
    const along=(dx*c+dy*s)/length,cross=(-dx*s+dy*c)/width;
    const u=Math.floor(sx+co*along-si*cross),v=Math.floor(sy+si*along+co*cross);
    const row=slashDonorRows[v];if(!row)return false;
    for(let i=0;i<row.length;i+=2)if(u>=row[i]&&u<row[i+1])return true;
    return false;
  }
  function slashPlan(difficulty,r,a,side){
    const w=r.x1-r.x0,h=r.y1-r.y0,off=(u)=>r.x0+w*(side>0?u:1-u);
    const cuts=[[.19,.22,.42,.86],[.38,.15,.63,.92],[.61,.20,.86,.81]].map(([u,v,x,y])=>Object.freeze([off(u),r.y0+h*v,off(x),r.y0+h*y]));
    const [beat,reveal,impact,decay,width]=slashTiming[difficulty];
    const transforms=cuts.map(line=>slashTransform(line,slashImpactPoses[0],width));
    const rows=[],byCut=cuts.map(()=>[]),countByCut=[0,0,0];let cells=0;
    // Logical pixel-center sampling of the exact same affine donor transform used at the hit beat.
    for(let y=r.y0;y<r.y1;y++){
      const rr=[],per=[[],[],[]],starts=[-1,-1,-1];let start=-1;
      for(let x=r.x0;x<r.x1;x++){
        const safe=x>=r.x0+a[0]&&x<r.x0+a[1];let marked=false;
        for(let k=0;k<3;k++){
          const on=!safe&&slashMaskAt(transforms[k],x+.5,y+.5);
          if(on){marked=true;countByCut[k]++;if(starts[k]<0)starts[k]=x;}
          else if(starts[k]>=0){per[k].push(starts[k],x);starts[k]=-1;}
        }
        if(marked){cells++;if(start<0)start=x;}
        else if(start>=0){rr.push(start,x);start=-1;}
      }
      for(let k=0;k<3;k++){if(starts[k]>=0)per[k].push(starts[k],r.x1);byCut[k].push(Object.freeze(per[k]));}
      if(start>=0)rr.push(start,r.x1);rows.push(Object.freeze(rr));
    }
    const coverage=cells/(w*h);
    return Object.freeze({ok:true,theme:'spatial-slash',difficulty,area:Object.freeze(r),rows:Object.freeze(rows),
      cuts:Object.freeze(cuts),cutRows:Object.freeze(byCut.map(Object.freeze)),countByCut:Object.freeze(countByCut),coverage,target:coverage,cells,
      safeLane:Object.freeze([r.x0+a[0],r.x0+a[1]]),origin:null,side,landings:null,
      revealBeat:beat,reveal,width,timing:Object.freeze([beat*2+reveal,impact,decay])});
  }
  function cutStatus(p,ph){
    if(!p?.cuts||!ph)return null;
    if(ph.name==='telegraph')return {visible:Math.max(0,Math.min(3,1+Math.floor(ph.local/p.revealBeat))),
      full:Math.max(0,Math.min(3,1+Math.floor((ph.local-p.reveal)/p.revealBeat))),armed:false};
    return {visible:3,full:3,armed:ph.name==='active'&&ph.local===0};
  }
  const exactCutPaths=new WeakMap();
  function clipCutRows(ctx,rows,r){
    if(typeof Path2D==='function'){
      let path=exactCutPaths.get(rows);
      if(!path){path=new Path2D();for(let y=0;y<rows.length;y++)for(let i=0;i<rows[y].length;i+=2)path.rect(rows[y][i],r.y0+y,rows[y][i+1]-rows[y][i],1);exactCutPaths.set(rows,path);}
      ctx.clip(path);
    }else{
      ctx.beginPath();for(let y=0;y<rows.length;y++)for(let i=0;i<rows[y].length;i+=2)ctx.rect(rows[y][i],r.y0+y,rows[y][i+1]-rows[y][i],1);ctx.clip();
    }
  }
  function paintSlash(ctx,p,ph,src) {
    const hitBeat=ph.name==='active'&&ph.local===0, r=p.area, age=ph.local;
    ctx.save();try{
      // No separate telegraph, boxing, broad fill, or graphic outside the permitted arena.
      ctx.beginPath();const lo=p.side>0?p.safeLane[1]:r.x0,hi=p.side>0?r.x1:p.safeLane[0];
      ctx.rect(lo,r.y0,hi-lo,r.y1-r.y0);ctx.clip();
      for(let i=0;i<3;i++){
        let frame,fraction=1,opacity=1,pose;
        if(ph.name==='telegraph'){
          const u=(age-i*p.revealBeat)/p.reveal;
          if(u<0)continue;
          if(u>=1){frame=7;pose=slashImpactPoses[0];opacity=.86;}
          else{frame=2+Math.min(4,Math.floor(u*5));pose=slashWarnPose[frame];fraction=.17+.82*u;opacity=.55+.31*u;}
        }else if(ph.name==='active'){
          frame=7+Math.min(4,Math.floor(age*5/ph.duration));pose=slashImpactPoses[frame-7];opacity=hitBeat?1:.90;
        }else{
          frame=12+Math.min(11,Math.floor(age*12/ph.duration));pose=slashFadePoses[frame-12];opacity=.57*(1-age/ph.duration);
        }
        const [cx,cy,c,s,len,w,sx,sy,co,si]=slashTransform(p.cuts[i],pose,p.width,fraction);
        ctx.save();try{
          if(hitBeat)clipCutRows(ctx,p.cutRows[i],r);
          ctx.globalAlpha*=opacity;
          if(hitBeat)ctx.imageSmoothingEnabled=false; // matches the source-alpha sample exactly on the logical grid.
          ctx.transform(c*len,s*len,-s*w,c*w,cx,cy);ctx.transform(co,-si,si,co,0,0);ctx.translate(-sx,-sy);
          src(frame,0,0,288,384);
        }finally{ctx.restore();}
      }
    }finally{ctx.restore();}
    return true;
  }
  function paint(ctx,event,s) {
    const ph=live(event,s); if(!ph)return false;
    const [range,tint]=ph.name==='telegraph'?[[0,.29],.71]:ph.name==='active'?[[.30,.70],.78]:[[.71,1],.25*(1-ph.local/ph.duration)];
    const p=event.plan,a=event.art,r=p.area;
    const progress=ph.local/Math.max(1,ph.duration-1);
    const rate=localEffects(event,s).phaseTextureRate;
    const u=ph.name==='active'?1-Math.pow(1-progress, (p.theme==='time-acceleration'?rate:1)*1.85):progress;
    const span=a.style==='impactTile'?(ph.name==='telegraph'?[0,.49]:ph.name==='active'?[.50,.77]:[.78,1]):range;
    const fspan=a.framesByPhase?.[ph.name]||span.map(v=>v*(a.frameCount-1));
    const frame=Math.min(a.frameCount-1,Math.round(fspan[0]+(fspan[1]-fspan[0])*u));
    function src(f,...to){f=clamp(f,0,a.frameCount-1);const cell=a.cells?a.cells[f]:[(f%a.columns)*a.cellWidth,Math.floor(f/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight];ctx.drawImage(a.image,...cell,...to);}
    if(p.cuts)return paintSlash(ctx,p,ph,src);
    function tile(x,y,angle,sx,sy,f){ctx.save();try{ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx/a.cellWidth,sy/a.cellHeight);src(f,-a.anchor[0],-a.anchor[1],a.cellWidth,a.cellHeight);}finally{ctx.restore();}}
    ctx.save();try{
      ctx.beginPath();
      const group=impactIndex(p,ph),rows=group===null?p.rows:p.landings[group];
      for(let y=0;y<rows.length;y++) {const l=rows[y];for(let i=0;i<l.length;i+=2)ctx.rect(l[i],r.y0+y,l[i+1]-l[i],1);}
      ctx.clip();
      // The actual inked atlas is the only visible attack footprint; no blanket underlay.
      ctx.globalAlpha*=tint;
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
        // Cues are the real approaching vehicles, painted separately without a hit overlay.
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
            const stretch=ph.name==='telegraph'?.77+.36*Math.sqrt(progress):1;
            tile(p.origin.x,p.origin.y,Math.atan2(dy,dx),Math.hypot(dx,dy)*stretch*(1.25+.03*(i%3)),W*(.37+(i%3)*.06),frame+offset);
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
        const impact=p.timing[0]+i*7, span=Math.max(38,Math.round(p.timing[0]*.79)),t=1+(age-impact)/span;
        if(t<0||t>=1)continue;
        let [u,v]=truckCenters[i];if(p.side<0)u=1-u;
        const a=i%2?art.alternateSpec:art, sw=W*.44,sh=sw*a.cellHeight/a.cellWidth;
        const cell=f=>a.cells?a.cells[f]:[(f%a.columns)*a.cellWidth,Math.floor(f/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight];
        const x=r.x0+u*W,ground=r.y0+v*H,y=r.y0-10+(v*H+10)*Math.pow(t,1.56);
        const shadow=cell(15),shadowW=sw*(.36+.18*t),shadowH=sh*.12;
        ctx.save();try{
          // A squash of this exact sedan/truck silhouette gives a faint natural landing shadow.
          // It is never collision criteria and has no ornamental boxes, numbers or strokes.
          ctx.globalAlpha*=.15+.13*t;
          ctx.drawImage(a.image,...shadow,x-a.anchor[0]*shadowW/a.cellWidth,ground-a.anchor[1]*shadowH/a.cellHeight,shadowW,shadowH);
        }finally{ctx.restore();}
        ctx.save();try{
          ctx.globalAlpha*=.45+.55*t;
          ctx.drawImage(a.image,...cell(Math.round(6+9*t)),x-a.anchor[0]*sw/a.cellWidth,y-a.anchor[1]*sh/a.cellHeight,sw,sh);
        }finally{ctx.restore();}
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
  return Object.freeze({roster,limits,target,atlasKeys,defaultArena,plan,contains,phaseAt,make,hit,paint,paintApproach,impactIndex,localEffects,atlasSpec,cutStatus});
});
