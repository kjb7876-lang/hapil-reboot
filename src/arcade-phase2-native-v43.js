(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./arcade-phase2-signatures-v43.js'),null);
  else root.HapilPhase2Native=factory(root.HapilPhase2Local,root.HapilPhase2Art);
})(typeof globalThis==='undefined'?this:globalThis,function(P,art){
  'use strict';
  // Exact scene and native card, not art-source scene labels or a global phase heuristic.
  const slots=Object.freeze({
    p2_wrath:{role:'main',stage:18,scene:'20',segment:221,ordinal:1,mid:false,themes:['flame-cone']},
    p3_gate:{role:'episode',stage:26,scene:'29',segment:319,ordinal:1,mid:false,themes:['machine-tentacles']},
    asmodeus:{role:'main',stage:15,scene:'17',segment:178,ordinal:1,mid:false,themes:['giant-kiss','broken-heart']},
    balrog:{role:'main',stage:7,scene:'07',segment:77,ordinal:1,mid:false,themes:['meteor','spatial-slash']},
    siren:{role:'episode',stage:39,scene:'46',segment:487,ordinal:1,mid:false,themes:['time-acceleration','gravity']},
    executor:{role:'episode',stage:46,scene:'55',segment:570,ordinal:1,mid:false,themes:['falling-vehicles']}
  });
  const bySegment=new Map();
  for(const [actor,s] of Object.entries(slots)){
    Object.freeze(s.themes);Object.freeze(s);
    if(bySegment.has(s.segment)||s.themes.length>({midboss:1,main:2,episode:3}[s.role]||0))throw Error('invalid phase-two segment or signature budget');
    bySegment.set(s.segment,Object.freeze({actor,...s}));
  }
  function slotFor(segment){return bySegment.get(segment)||null;}
  const encounters=new WeakMap(),overrides=new WeakMap(),finishPaths=new WeakMap(); // not serialized; no save schema change.
  let stageKey='',assets=new Map();
  function getSpec(theme){
    const v=assets.get(theme);
    if(!v||!P.atlasSpec(v,theme)||(v.alternateSpec&&!P.atlasSpec(v.alternateSpec,theme)))return null;
    return v;
  }
  function preload(stage,scene){
    const key=stage+'|'+scene;
    if(key===stageKey||!P||!art||typeof Image!=='function')return;
    stageKey=key;assets=new Map();
    const planned=[...bySegment.values()].filter(s=>s.stage===stage&&s.scene===scene);
    if(!planned.length)return;
    function load(d){
      if(!d||!/^media\/phase2-v43\/[A-Za-z0-9.-]+\.webp\?v=[a-f0-9]{12}$/.test(d.url))return null;
      const image=new Image();
      image.decoding='async';image.src=d.url; // actual HTMLImageElement is required by the native Ink wrapper.
      const spec={...d,image};
      if(d.alternateSpec){spec.alternateSpec=load(d.alternateSpec);if(!spec.alternateSpec)return null;}
      return spec;
    }
    for(const theme of new Set(planned.flatMap(slot=>slot.themes))){
      const spec=load(art[theme]);if(spec)assets.set(theme,spec);
    }
  }
  function exact(s,c){
    if(!c||!s.entranceAll||s.stage!=='card'||s.cardEnding||s.cardDown||!s.boss?.present||s.boss.leaving||s.boss.hp<=0)return null;
    const id=s.boss.actor,t=slotFor(s.seg);
    return t&&t.actor===id&&c.actor===id&&s.stageIndex+1===t.stage&&s.seg===t.segment&&c.stage===t.stage&&c.scene===t.scene&&c.ordinal===t.ordinal&&c.role===t.role&&!!c.mid===t.mid?t:null;
  }
  function maxRootY(difficulty){
    const r=P.defaultArena,w=r.x1-r.x0,h=r.y1-r.y0,escape=Math.max(38,Math.round(w*.113));
    // Reserve the complete player escape lane and the actual actor-mouth y offset in P.plan.
    return r.y1-Math.ceil(P.target[difficulty]*w*h/(w-escape))-12;
  }
  function phase(rec,s){
    return rec?.event&&P.phaseAt(rec.event.plan,s.tick-rec.event.start);
  }
  function step(s,c){
    if(!P)return false;
    const slot=exact(s,c);
    if(!slot){encounters.delete(s);return false;}
    let rec=encounters.get(s);
    if(!rec||rec.seg!==s.seg){rec={seg:s.seg,index:0,event:null,settle:0,skipped:[]};encounters.set(s,rec);}
    if(rec.event){
      const img=rec.event.art,alive=P.atlasSpec(img,rec.event.plan.theme)&&(!img.alternateSpec||P.atlasSpec(img.alternateSpec,rec.event.plan.theme));
      if(alive&&phase(rec,s)){s.calm=false;return true;}
      rec.index++;rec.event=null;rec.settle=0;return false;
    }
    const theme=slot.themes[rec.index];
    if(!theme||s.segTick<48+rec.index*96||c.legacyBusy)return false;
    const provider=overrides.get(s)||getSpec, spec=provider(theme);
    if(!P.atlasSpec(spec,theme)||(theme==='falling-vehicles'&&!P.atlasSpec(spec?.alternateSpec,theme)))return false;
    const boss=s.boss;
    if(theme==='flame-cone'&&boss.y>maxRootY(s.difficulty)){
      // Move the actual boss up to a feasible origin before warning. No shape or danger while settling.
      if(++rec.settle>120){rec.skipped.push(theme);rec.index++;return false;}
      boss.y=Math.max(maxRootY(s.difficulty),boss.y-2);
      return true;
    }
    s.calm=false;
    const args={stage:slot.stage,scene:slot.scene,actor:c.actor,cardOrdinal:c.ordinal,mid:slot.mid,themeIndex:rec.index,renderSpec:spec};
    const side=s.player.x<=180?1:-1;
    const event=P.make(s,{...args,side})||P.make(s,{...args,side:-side});
    if(!event){rec.skipped.push(theme);rec.index++;return false;}
    rec.event=event;rec.settle=0;
    return true;
  }
  function hit(s){const e=encounters.get(s)?.event;return !!e&&P.hit(e,s);}
  function paint(ctx,s){
    const e=encounters.get(s)?.event;
    if(!e||!P.paint(ctx,e,s))return false;
    finish(ctx,e,s);
    if(P.paintApproach)P.paintApproach(ctx,e,s);
    const ph=P.phaseAt(e.plan,s.tick-e.start),key=e.plan.theme;
    if(ph?.name==='active'&&(key==='gravity'||key==='time-acceleration'))paintSiren(ctx,e,ph);
    return true;
  }
  function finish(ctx,e,s){
    const p=e.plan,ph=P.phaseAt(p,s.tick-e.start);
    if(ph?.name!=='active'||typeof Path2D!=='function')return;
    const group=P.impactIndex(p,ph),key=group===null?-1:group;
    let cached=finishPaths.get(p);if(!cached){cached=new Map();finishPaths.set(p,cached);}
    let q=cached.get(key);
    if(!q){
      const rows=group===null?p.rows:p.landings[group],mask=new Path2D(),edge=new Path2D();
      function rim(y,from,a,b){
        let x=a;
        for(let i=0;i<from.length&&x<b;i+=2){
          if(from[i+1]<=x)continue;if(from[i]>=b)break;
          if(from[i]>x){edge.moveTo(x,y);edge.lineTo(from[i],y);}
          x=Math.max(x,from[i+1]);
        }
        if(x<b){edge.moveTo(x,y);edge.lineTo(b,y);}
      }
      for(let y=0;y<rows.length;y++){
        const r=rows[y],yy=p.area.y0+y;
        for(let x=0;x<r.length;x+=2){
          const a=r[x],b=r[x+1];mask.rect(a,yy,b-a,1);
          edge.moveTo(a,yy);edge.lineTo(a,yy+1);edge.moveTo(b,yy);edge.lineTo(b,yy+1);
          rim(yy,rows[y-1]||[],a,b);rim(yy+1,rows[y+1]||[],a,b);
        }
      }q={mask,edge};cached.set(key,q);
    }
    const r=p.area,a=ctx.globalAlpha;
    ctx.save();try{
      // The glaze and double edge use precisely the damage footprint and the
      // existing Ink palette. Sparse highlights can't erase the marked area.
      ctx.clip(q.mask);ctx.globalCompositeOperation='multiply';ctx.globalAlpha=a*.38;ctx.fillStyle='#f2c46d';
      ctx.fillRect(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.72;ctx.lineWidth=3.2;ctx.strokeStyle='#f2e9d6';ctx.stroke(q.edge);
      ctx.globalAlpha=a*.93;ctx.lineWidth=1.35;ctx.strokeStyle='#f2c46d';ctx.stroke(q.edge);
    }finally{ctx.restore();}
  }
  function paintSiren(ctx,e,ph){
    // Event-owned visual shards only: not damage, not legacy projectiles, never forces player movement.
    const p=e.plan,r=p.area,w=r.x1-r.x0,h=r.y1-r.y0,age=ph.local,t=age/Math.max(1,ph.duration-1);
    const ease=p.theme==='time-acceleration'?(.45*t+1.10*t*t):t,gravity=p.theme==='gravity';
    ctx.save();
    try{
      ctx.globalAlpha*=.48;
      ctx.strokeStyle=gravity?'#493a67':'#5c5f81';
      ctx.lineWidth=1.45;
      for(let i=0;i<12;i++){
        const phase=((i*37)%101)/101,cy=(i%2?.68:.36)*h,cx=(i%2?.73:.24)*w;
        const x=gravity?r.x0+cx+(w*(phase-.5))*Math.pow(1-t,1.65):r.x0+w*(phase+ease*.48)%w;
        const y=gravity?r.y0+cy+Math.sin(phase*19+t*4)*h*.16*Math.pow(1-t,1.6):r.y0+h*(.18+((i*29)%61)/100+ease*.29)%h;
        if(!P.contains(p,x,y)||!P.contains(p,x-2,y+3))continue;
        ctx.beginPath();ctx.moveTo(x-2,y+3);ctx.lineTo(x,y);ctx.stroke();
      }
    }finally{ctx.restore();}
  }
  function inspect(s){
    const r=encounters.get(s),p=r?.event?.plan,ph=phase(r,s);
    return r?{index:r.index,segment:r.seg,prep:r.settle,skipped:r.skipped.slice(),theme:p?.theme??null,phase:ph?.name??null,local:ph?.local??null,
      coverage:p?.coverage??null,safeLane:p?.safeLane??null,origin:p?.origin??null,timing:p?.timing??null}:null;
  }
  function fixtureAtlas(s,get){overrides.set(s,get);} // test-only injection, not a browser hook.
  const api={slots,slotFor,preload,step,hit,paint,inspect};
  if(typeof module==='object'&&module.exports){api.fixtureAtlas=fixtureAtlas;api.fixtureFinish=finish;}
  return Object.freeze(api);
});
