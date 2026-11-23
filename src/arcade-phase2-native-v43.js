(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./arcade-phase2-signatures-v43.js'),null,require('./arcade-phase2-extra-v43.js'),require('./arcade-phase2-extra-art-v43.js'),()=>require('./arcade-v43.js'),require('./arcade-phase2-source-ink-v43.js'),require('./arcade-phase2-p1-v43.js'),require('./arcade-phase2-p1-art-v43.js'));
  else root.HapilPhase2Native=factory(root.HapilPhase2Local,root.HapilPhase2Art,root.HapilPhase2Extension,root.HapilPhase2ExtraArt,()=>root.HapilArcade,root.HapilPhase2Source,root.HapilPhase2P1,root.HapilPhase2P1Art);
})(typeof globalThis==='undefined'?this:globalThis,function(P,art,bindExtra,extraArt,native,Source,bindP1,p1Art){
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
  let extra,extraSlots;
  function extension(){
    if(!extra&&bindExtra&&extraArt&&native()?.SEGMENTS){
      const reserved=Object.values(art||{}).flatMap(d=>[d,d.alternateSpec]).filter(Boolean).map(d=>d.url.split('?v=')[1]);
      const bindings=Object.fromEntries(Object.values(extraArt).map(d=>{
        if(reserved.includes(d.sha256.slice(0,12)))throw Error('duplicate priority art');
        return [d.artId,{sha256:d.sha256,path:d.path,...(d.contactRuns?{contactRuns:d.contactRuns,framesByPhase:d.framesByPhase}:{})}];
      }));
      extra=bindExtra(P,native(),bindings);
      extraSlots=Object.values(extra.specs).map(e=>Object.freeze({...e,segment:e.seg,mid:false,themes:Object.freeze([e.theme]),extra:true}));
      const counts=new Map();
      for(const e of [...bySegment.values(),...extraSlots]){
        const n=(counts.get(e.actor)||0)+e.themes.length;
        if(n>({midboss:1,main:2,episode:3}[e.role]||0))throw Error('extension exceeds actor signature budget');
        counts.set(e.actor,n);
      }
    }
    return extra;
  }
  let p1,p1Slots;
  function p1Bundle(){
    if(!p1&&bindP1&&p1Art&&native()?.SEGMENTS){
      extension();
      const oldPaths=new Set(Object.values(art||{}).flatMap(d=>[d,d.alternateSpec]).filter(Boolean).map(d=>d.url.split('?v=')[1]));
      const prior=Object.values(extraArt||{}).map(d=>d.sha256);
      const assets=Object.fromEntries(Object.values(p1Art).map(d=>{
        if(oldPaths.has(d.sha256.slice(0,12)))throw Error('duplicate prior art');
        return [d.artId,{sha256:d.sha256,path:d.path,...(d.contactRuns?{contactRuns:d.contactRuns,framesByPhase:d.framesByPhase}:{})}];
      }));
      p1=bindP1(P,native(),{assets,reservedHashes:prior,nativeOnly:true,source:Source});
      p1Slots=Object.values(p1.specs).map(e=>Object.freeze({...e,segment:e.seg,role:e.role==='mid'?'midboss':e.role,mid:e.role==='mid',themes:Object.freeze([e.theme]),p1:true}));
      const counts=new Map();
      for(const e of [...bySegment.values(),...(extraSlots||[]),...p1Slots]){
        const n=(counts.get(e.actor)||0)+e.themes.length;
        if(n>({midboss:1,main:2,episode:3}[e.role]||0))throw Error('P1 exceeds actor signature budget');
        counts.set(e.actor,n);
      }
    }
    return p1;
  }
  function slotFor(segment){return bySegment.get(segment)||(extension()?.identity(segment)&&extraSlots.find(s=>s.segment===segment))||(p1Bundle()?.identity(segment)&&p1Slots.find(s=>s.segment===segment))||null;}
  const encounters=new WeakMap(),overrides=new WeakMap(); // not serialized; no save schema change.
  let stageKey='',assets=new Map();
  function getSpec(theme){
    const v=assets.get(theme);
    if(!visualReady(v,theme))return null;
    return v;
  }
  function visualReady(v,theme){
    return !!(Source&&P.atlasSpec(v,theme)&&Source.ready(v.image)&&
      (!v.alternateSpec||P.atlasSpec(v.alternateSpec,theme)&&Source.ready(v.alternateSpec.image)));
  }
  function preload(stage,scene){
    const key=stage+'|'+scene;
    if(key===stageKey||!P||!art||typeof Image!=='function')return;
    stageKey=key;assets=new Map();
    extension();p1Bundle();
    const planned=[...bySegment.values(),...(extraSlots||[]),...(p1Slots||[])].filter(s=>s.stage===stage&&s.scene===scene);
    if(!planned.length)return;
    function load(d){
      if(!d||!/^media\/(?:phase2-v43|phase2-extra|phase2-p1)\/[A-Za-z0-9.-]+\.webp\?v=[a-f0-9]{12}$/.test(d.url))return null;
      const image=new Image();
      image.decoding='async';image.addEventListener('load',()=>{void Source?.prepare(image);},{once:true});image.src=d.url; // actual HTMLImageElement is required by the native Ink wrapper.
      const spec={...d,image};
      if(d.alternateSpec){spec.alternateSpec=load(d.alternateSpec);if(!spec.alternateSpec)return null;}
      return spec;
    }
    for(const theme of new Set(planned.flatMap(slot=>slot.themes))){
      const spec=load(art[theme]||extraArt?.[theme]||p1Art?.[theme]);if(spec)assets.set(theme,spec);
    }
  }
  function exact(s,c){
    if(!c||!s.entranceAll||s.stage!=='card'||s.cardEnding||s.cardDown||!s.boss?.present||s.boss.leaving||s.boss.hp<=0)return null;
    const id=s.boss.actor,t=slotFor(s.seg);
    return t&&t.actor===id&&c.actor===id&&s.stageIndex+1===t.stage&&s.seg===t.segment&&c.stage===t.stage&&c.scene===t.scene&&(t.extra||t.p1?Number.isInteger(c.ordinal)&&c.ordinal>=0:c.ordinal===t.ordinal)&&c.role===t.role&&!!c.mid===t.mid?t:null;
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
      const img=rec.event.art,alive=visualReady(img,rec.event.plan.theme);
      if(alive&&phase(rec,s)){s.calm=false;return true;}
      rec.index++;rec.event=null;rec.settle=0;return false;
    }
    const theme=slot.themes[rec.index];
    if(!theme||c.legacyBusy)return false;
    // Later cards insert only before legacy fire starts, with no residual body, floor or bullet hazards.
    // If the clear window doesn't occur, the original card proceeds untouched.
    if(slot.extra||slot.p1?((slot.p1?!c.preFire:s.segTick>2)||s.n>0||s.mobs?.length||s.floor?.pieces?.length||s.floor?.warns?.length||s.ripples?.length||s.brood||s.bossVolley?.queue?.length):s.segTick<48+rec.index*96)return false;
    const provider=overrides.get(s)||getSpec, spec=provider(theme);
    if(!visualReady(spec,theme)||(theme==='falling-vehicles'&&!spec?.alternateSpec))return false;
    const boss=s.boss;
    if(theme==='flame-cone'&&boss.y>maxRootY(s.difficulty)){
      // Move the actual boss up to a feasible origin before warning. No shape or danger while settling.
      if(++rec.settle>120){rec.skipped.push(theme);rec.index++;return false;}
      boss.y=Math.max(maxRootY(s.difficulty),boss.y-2);
      return true;
    }
    if(!slot.extra&&!slot.p1)s.calm=false;
    const args={stage:slot.stage,scene:slot.scene,actor:c.actor,cardOrdinal:c.ordinal,mid:slot.mid,themeIndex:rec.index,renderSpec:spec};
    const side=s.player.x<=180?1:-1;
    const event=slot.p1?p1Bundle().make(s,{art:spec,side}):slot.extra?extension().make(s,{art:spec,side}):(P.make(s,{...args,side})||P.make(s,{...args,side:-side}));
    if(!event){rec.skipped.push(theme);rec.index++;return false;}
    rec.event=event;rec.settle=0;
    return true;
  }
  function eventPainter(e){return e.p1Native?p1Bundle().paint:e.extension?extension().paint:P.paint;}
  function hit(s){const e=encounters.get(s)?.event;return !!e&&((e.stage2Source||e.stage3Source||e.stage4Source)?p1Bundle().hit(e,s):P.hit(e,s,eventPainter(e)));}
  function paint(ctx,s){
    const e=encounters.get(s)?.event;
    if(!e||!eventPainter(e)(ctx,e,s))return false;
    if(P.paintApproach)P.paintApproach(ctx,e,s);
    return true;
  }
  // Read-only QA/diagnostic projection of the first contact beat; never affects the live clock or collision.
  function firstContactAt(s,x,y){
    const e=encounters.get(s)?.event;if(!e)return false;
    const probe={...s,tick:e.start+e.plan.timing[0],player:{x,y}};return (e.stage2Source||e.stage3Source||e.stage4Source)?p1Bundle().hit(e,probe):P.hit(e,probe,eventPainter(e));
  }
  function inspect(s){
    const r=encounters.get(s),p=r?.event?.plan,ph=phase(r,s);
    return r?{index:r.index,segment:r.seg,prep:r.settle,skipped:r.skipped.slice(),theme:p?.theme??null,phase:ph?.name??null,local:ph?.local??null,
      coverage:p?.cuts?p.coverage:null,maxClip:p&&!p.cuts?p.coverage:null,cuts:P.cutStatus(p,ph),safeLane:p?.safeLane??null,origin:p?.origin??null,timing:p?.timing??null}:null;
  }
  function fixtureAtlas(s,get){overrides.set(s,get);} // test-only injection, not a browser hook.
  const api={slots,slotFor,preload,step,hit,paint,inspect,firstContactAt};
  if(typeof module==='object'&&module.exports){api.fixtureAtlas=fixtureAtlas;}
  return Object.freeze(api);
});
