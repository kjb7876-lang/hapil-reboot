(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./arcade-phase2-signatures-v43.js'),null,require('./arcade-phase2-extra-v43.js'),require('./arcade-phase2-extra-art-v43.js'),()=>require('./arcade-v43.js'),require('./arcade-phase2-source-ink-v43.js'),require('./arcade-phase2-p1-v43.js'),require('./arcade-phase2-p1-art-v43.js'),require('./arcade-phase2-sheets-v43.js'),require('./arcade-phase2-sheets-art-v43.js'));
  else root.HapilPhase2Native=factory(root.HapilPhase2Local,root.HapilPhase2Art,root.HapilPhase2Extension,root.HapilPhase2ExtraArt,()=>root.HapilArcade,root.HapilPhase2Source,root.HapilPhase2P1,root.HapilPhase2P1Art,root.HapilPhase2Sheets,root.HapilPhase2SheetsArt);
})(typeof globalThis==='undefined'?this:globalThis,function(P,art,bindExtra,extraArt,native,Source,bindP1,p1Art,bindSheets,sheetsArt){
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
  // 닷츠 CX-0191BS 11~52스테이지 보스 스킬 시트: 이미 시그니처가 있는 카드는 건너뛰고, 보스(배우)마다 예산 안에서만 붙인다.
  let sheets,sheetSlots,allSlots;
  function sheetBundle(){
    if(!sheets&&bindSheets&&sheetsArt&&native()?.SEGMENTS){
      p1Bundle();
      const counts=new Map(),taken=new Set();
      for(const e of [...bySegment.values(),...(extraSlots||[]),...(p1Slots||[])]){counts.set(e.actor,(counts.get(e.actor)||0)+e.themes.length);taken.add(e.segment);}
      sheets=bindSheets(native(),sheetsArt,{taken});
      const allowed=new Set();
      for(const e of Object.values(sheets.specs)){
        if(e.encore)continue;
        const count=(counts.get(e.actor)||0)+1;
        if(count<=({midboss:1,main:2,episode:3}[e.role]||0)){
          counts.set(e.actor,count);allowed.add(e.theme);
        }
      }
      sheetSlots=Object.values(sheets.specs).filter(e=>allowed.has(e.theme))
        .map(e=>Object.freeze({...e,segment:e.seg,themes:Object.freeze([e.theme]),sheet:true}));
    }
    return sheets;
  }
  function slotFor(segment){
    if(!allSlots){
      const A=native();
      if(!A?.SEGMENTS)return bySegment.get(segment)||null;
      extension();p1Bundle();sheetBundle();
      allSlots=new Map([...bySegment.values(),...(extraSlots||[]),...(p1Slots||[]),...(sheetSlots||[])].map(e=>[e.segment,e]));
      // Only replay an original signature on a free, named card belonging to the same stage and visible form.
      for(const slot of bySegment.values()){
        const first=A.SEGMENTS[slot.segment];
        for(let i=A.SEGMENTS.length-1;i>slot.segment;i--){
          const g=A.SEGMENTS[i];
          if(g.stage!==first.stage||g.kind!=='card'||!g.spell||g.mid||allSlots.has(i))continue;
          if(g.actor===first.actor&&A.segArt(g)===A.segArt(first)){
            allSlots.set(i,Object.freeze({...slot,segment:i,encore:true}));
            break;
          }
        }
      }
    }
    return allSlots.get(segment)||null;
  }
  const EXPANDED_OPENING_MAX=480;
  const DRAIN_LIMIT=300,REPEAT_AFTER=600;
  const expandedOpening=slot=>slot.p1&&slot.actor==='p1_staff'&&slot.stage===9&&slot.scene==='09-1'&&
    (slot.segment===103||slot.segment===105);
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
    extension();p1Bundle();sheetBundle();
    const planned=[...bySegment.values(),...(extraSlots||[]),...(p1Slots||[]),...(sheetSlots||[])].filter(s=>s.stage===stage&&s.scene===scene);
    if(!planned.length)return;
    function load(d){
      if(!d||!/^media\/(?:phase2-v43|phase2-extra|phase2-p1|phase2-sheets)\/[A-Za-z0-9._-]+\.webp\?v=[a-f0-9]{12}$/.test(d.url))return null;
      const image=new Image();
      image.decoding='async';image.addEventListener('load',()=>{void Source?.prepare(image);},{once:true});image.src=d.url; // actual HTMLImageElement is required by the native Ink wrapper.
      const spec={...d,image};
      if(d.alternateSpec){spec.alternateSpec=load(d.alternateSpec);if(!spec.alternateSpec)return null;}
      return spec;
    }
    for(const theme of new Set(planned.flatMap(slot=>slot.themes))){
      const spec=load(art[theme]||extraArt?.[theme]||p1Art?.[theme]||sheetsArt?.[theme]);if(spec)assets.set(theme,spec);
    }
  }
  function exact(s,c){
    if(!c||!s.entranceAll||s.stage!=='card'||s.cardEnding||!s.boss?.present||s.boss.leaving||s.boss.hp<=0)return null;
    const id=s.boss.actor,t=slotFor(s.seg);
    return t&&t.actor===id&&c.actor===id&&s.stageIndex+1===t.stage&&s.seg===t.segment&&c.stage===t.stage&&c.scene===t.scene&&(t.extra||t.p1||t.sheet||t.encore?Number.isInteger(c.ordinal)&&c.ordinal>=0:c.ordinal===t.ordinal)&&c.role===t.role&&!!c.mid===t.mid?t:null;
  }
  function maxRootY(difficulty){
    const r=P.defaultArena,w=r.x1-r.x0,h=r.y1-r.y0,escape=Math.max(38,Math.round(w*.113));
    // Reserve the complete player escape lane and the actual actor-mouth y offset in P.plan.
    return r.y1-Math.ceil(P.target[difficulty]*w*h/(w-escape))-12;
  }
  function phase(rec,s){
    return rec?.event&&P.phaseAt(rec.event.plan,s.tick-rec.event.start);
  }
  function stopOpening(rec,s,fallback=false){if(rec.openingStart!==undefined&&rec.openingEnd===undefined)rec.openingEnd=s.tick;if(fallback)rec.openingFallback=true;}
  function step(s,c){
    if(!P)return false;
    const slot=exact(s,c);
    if(!slot){encounters.delete(s);return false;}
    let rec=encounters.get(s);
    if(!rec||rec.seg!==s.seg){rec={seg:s.seg,index:0,event:null,settle:0,skipped:[]};encounters.set(s,rec);}
    if(rec.event){
      const img=rec.event.art,alive=visualReady(img,rec.event.plan.theme);
      if(alive&&phase(rec,s)){s.calm=false;return true;}
      rec.index++;rec.event=null;rec.settle=0;
      if(alive)rec.finishedAt=s.segTick;
      return false;
    }
    if(s.cardDown)return false; // A committed cast finishes, but a defeated card never starts a new one.
    if(rec.index>=slot.themes.length&&!rec.repeated&&rec.finishedAt!==undefined&&s.segTick-rec.finishedAt>=REPEAT_AFTER){
      rec.index=0;rec.repeated=true;
    }
    const theme=slot.themes[rec.index];
    if(!theme)return false;
    const residual=s.n>0||s.mobs?.length||s.floor?.pieces?.length||s.floor?.warns?.length||s.ripples?.length||s.brood||s.bossVolley?.queue?.length;
    // Let already-launched attacks complete before taking the field. Unloaded art never reserves a turn.
    const reserve=slot.sheet||slot.encore||rec.repeated;
    if(reserve){
      if(!visualReady((overrides.get(s)||getSpec)(theme),theme))return false;
      if(s.sp?.cur||s.formHold>s.tick||s.wrathTraverse&&!s.wrathTraverse.done)return false;
      if(c.legacyBusy||residual||s.figPend||s.calm){
        if(rec.waitSince===undefined)rec.waitSince=s.tick;
        if(s.tick-rec.waitSince>=DRAIN_LIMIT){
          rec.skipped.push(theme);rec.index++;delete rec.waitSince;
        }else rec.openingTick=s.tick;
        return false;
      }
      delete rec.waitSince;
    }
    // Other authored cards keep their exact original early admission rules.
    else if(!expandedOpening(slot)&&(c.legacyBusy||
      (slot.extra||slot.p1?((slot.p1?!c.preFire:s.segTick>2)||residual):s.segTick<48+rec.index*96)))return false;
    const provider=overrides.get(s)||getSpec, spec=provider(theme);
    if(!visualReady(spec,theme)||(theme==='falling-vehicles'&&!spec?.alternateSpec)){
      if(rec.openingStart!==undefined)stopOpening(rec,s,true); // no wait for a lost/late source
      return false;
    }
    if(expandedOpening(slot)&&!rec.repeated){
      if(rec.openingFallback||!c.preFire||s.sp?.cur){stopOpening(rec,s,true);return false;}
      if(c.legacyBusy||residual||s.calm||s.figPend?.seg===s.seg||s.formHold>s.tick){
        if(rec.openingStart===undefined)rec.openingStart=s.tick;
        if(s.tick-rec.openingStart>=EXPANDED_OPENING_MAX){stopOpening(rec,s,true);return false;}
        // This is a no-contact/no-art wait. Existing hazards still move, hit, and expire.
        rec.openingTick=s.tick;
        return false;
      }
    }
    const boss=s.boss;
    if(theme==='flame-cone'&&boss.y>maxRootY(s.difficulty)){
      // Move the actual boss up to a feasible origin before warning. No shape or danger while settling.
      if(++rec.settle>120){rec.skipped.push(theme);rec.index++;return false;}
      boss.y=Math.max(maxRootY(s.difficulty),boss.y-2);
      return true;
    }
    if(expandedOpening(slot))stopOpening(rec,s);
    if(!slot.extra&&!slot.p1&&!slot.sheet)s.calm=false;
    // Priority art is keyed to its original card ordinal. The actual performance segment is checked by exact() and recorded by make().
    const args={stage:slot.stage,scene:slot.scene,actor:c.actor,cardOrdinal:slot.encore&&!slot.sheet?slot.ordinal:c.ordinal,mid:slot.mid,themeIndex:rec.index,renderSpec:spec};
    const side=s.player.x<=180?1:-1;
    const event=slot.sheet?sheetBundle().make(s,{art:spec,side}):slot.p1?p1Bundle().make(s,{art:spec,side}):slot.extra?extension().make(s,{art:spec,side}):(P.make(s,{...args,side})||P.make(s,{...args,side:-side}));
    if(!event){rec.skipped.push(theme);rec.index++;return false;}
    rec.event=event;rec.settle=0;
    return true;
  }
  function active(s){const r=encounters.get(s);return !!r?.event&&r.seg===s.seg&&s.stage==='card'&&!s.cardEnding&&s.boss?.present&&!s.boss.leaving;}
  function holding(s){const r=encounters.get(s);return !!r&&r.seg===s.seg&&r.openingTick===s.tick&&!r.openingFallback&&!r.event&&
    s.stage==='card'&&!s.cardDown&&!s.cardEnding&&s.boss?.present&&s.boss.hp>0;}
  function eventPainter(e){return e.sheetSource?sheetBundle().paint:e.p1Native?p1Bundle().paint:e.extension?extension().paint:P.paint;}
  function hit(s){const e=encounters.get(s)?.event;return !!e&&(e.sheetSource?sheetBundle().hit(e,s):(e.stage2Source||e.stage3Source||e.stage4Source||e.stage5Source||e.stage6Source||e.stage7Source||e.stage8Source||e.stage9Source)?p1Bundle().hit(e,s):P.hit(e,s,eventPainter(e)));}
  function paint(ctx,s){
    const e=encounters.get(s)?.event;
    if(!e||!eventPainter(e)(ctx,e,s))return false;
    if(P.paintApproach&&!e.sheetSource)P.paintApproach(ctx,e,s);
    return true;
  }
  // Read-only QA/diagnostic projection of the first contact beat; never affects the live clock or collision.
  function firstContactAt(s,x,y){
    const e=encounters.get(s)?.event;if(!e)return false;
    const probe={...s,tick:e.start+e.plan.timing[0],player:{x,y}};return e.sheetSource?sheetBundle().hit(e,probe):(e.stage2Source||e.stage3Source||e.stage4Source||e.stage5Source||e.stage6Source||e.stage7Source||e.stage8Source||e.stage9Source)?p1Bundle().hit(e,probe):P.hit(e,probe,eventPainter(e));
  }
  function inspect(s){
    const r=encounters.get(s),p=r?.event?.plan,ph=phase(r,s);
    return r?{index:r.index,segment:r.seg,prep:r.settle,skipped:r.skipped.slice(),theme:p?.theme??null,phase:ph?.name??null,local:ph?.local??null,
      ...(r.openingStart===undefined?{}:{opening:{waiting:holding(s),elapsed:(r.openingEnd??s.tick)-r.openingStart,fallback:!!r.openingFallback}}),
      coverage:p?.cuts?p.coverage:null,maxClip:p&&!p.cuts?p.coverage:null,cuts:P.cutStatus(p,ph),safeLane:p?.safeLane??null,origin:p?.origin??null,timing:p?.timing??null}:null;
  }
  function fixtureAtlas(s,get){overrides.set(s,get);} // test-only injection, not a browser hook.
  const api={slots,slotFor,preload,step,holding,active,hit,paint,inspect,firstContactAt};
  if(typeof module==='object'&&module.exports){api.fixtureAtlas=fixtureAtlas;}
  return Object.freeze(api);
});
