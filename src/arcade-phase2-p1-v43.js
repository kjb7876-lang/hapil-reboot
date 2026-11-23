(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.HapilPhase2P1=factory;
})(typeof globalThis!=='undefined'?globalThis:this,function bind(B,A,{assets={},reservedHashes=[],offlineOnly=false,nativeOnly=false,source=null}={}){
 if(!B?.atlasSpec||!B?.impactIndex||!A?.SEGMENTS||!A?.STAGES)throw Error('exact base and native routes required');
 const rows=[
  {seg:13,actor:'mb_02',role:'mid',stage:2,scene:'02',plain:'cardioid',card:'',form:undefined,formNo:undefined,theme:'eggkeeper-silk',artId:'stage2-eggkeeper-silk'},
  {seg:16,actor:'violet',role:'main',stage:2,scene:'02',card:'흰 날개',form:undefined,formNo:0,theme:'violet-white-wings',artId:'stage2-violet-wings'},
  {seg:18,actor:'violet',role:'main',stage:2,scene:'02',card:'여덟 다리의 실',form:undefined,formNo:0,theme:'violet-eight-leg-silk',artId:'stage2-violet-silk'},
  {seg:3,actor:'mb_01',role:'mid',stage:1,scene:'01',plain:'hypocycloid',card:'',form:undefined,formNo:undefined,theme:'root-tracer',artId:'root-tracer-r1'},
  {seg:6,actor:'p1_tree',role:'main',stage:1,scene:'01',card:'다가오는 뿌리',form:undefined,formNo:0,theme:'sequential-rootlets',artId:'p1-approaching-roots'},
  {seg:8,actor:'p1_tree',role:'main',stage:1,scene:'01',card:'가장 굵은 뿌리',form:undefined,formNo:0,theme:'single-heavy-root',artId:'p1-thick-root'},
  {seg:115,actor:'lucifer',role:'episode',stage:10,scene:'11',card:'존재를 지우는 힘',form:'p1_seraph',formNo:0,theme:'feather-erasure',artId:'lucifer-feather-erasure'},
  {seg:119,actor:'lucifer',role:'episode',stage:10,scene:'11',card:'검은 숫자 666',form:'lucifer',formNo:1,theme:'inscription-collapse',artId:'lucifer-black-inscription'},
  {seg:123,actor:'lucifer',role:'episode',stage:10,scene:'11',card:'연단은 소망을',form:'lucifer_alt11',formNo:2,theme:'hope-mask-peel',artId:'lucifer-hope-mask-peel'}
 ];
 const specs=Object.freeze(Object.fromEntries(rows.map(r=>[r.seg,Object.freeze(r)])));
 const verified={},seen=new Set(reservedHashes), paths=new Set();
 for(const [id,v] of Object.entries(assets)){
  if(!rows.some(x=>x.artId===id)||!v||!/^[a-f0-9]{64}$/.test(v.sha256)||!/^media\/[a-zA-Z0-9/_\-.]+\.webp$/.test(v.path)||v.path.includes('..')||seen.has(v.sha256)||paths.has(v.path))throw Error('unknown or reused art '+id);
  seen.add(v.sha256); paths.add(v.path); verified[id]=Object.freeze({...v});
 }
 Object.freeze(verified);
 const area=Object.freeze({x0:8,x1:352,y0:40,y1:626});const W=344,H=586,N=W*H;
 function identity(seg){
  const q=specs[seg],n=A.SEGMENTS[seg],s=n&&A.STAGES[n.stage];if(!q||!n||n.kind!=='card'||n.actor!==q.actor||n.name!==q.card||s?.scene!==q.scene||s.index+1!==q.stage||n.form!==q.form||n.formNo!==q.formNo)return null;
  if(q.role==='mid')return n.mid===true&&n.midboss===true&&n.spell===false&&n.plain===q.plain?q:null;
  if(q.form&&A.segArt(n)!==q.form)return null;
  return !n.mid&&n.spell&&n.scene===q.scene?q:null;
 }
 const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
 const h=(u,v)=>Math.hypot(u,v);
 function rank(theme,x,y){
  switch(theme){
  case 'root-tracer':return Math.min(Math.abs(x-.44-.13*Math.sin(y*7.3)),.05+Math.abs(x-.70-.1*Math.sin(y*9-1.6)))+.026*Math.sin(y*36+x*15);
  case 'sequential-rootlets':{
   const k=Math.min(2,Math.floor(y*3)), f=y*3-k, c=[.31,.68,.48][k]+.09*Math.sin(f*5.2+k*1.8);
   return Math.min(Math.abs(x-c),.095+Math.abs(x-(1-c)*.75))+.022*Math.cos(f*9.2+x*24);
  }
  case 'single-heavy-root':return Math.abs(x-.54-.12*Math.sin(y*5.8+.42)-.10*y)+.028*Math.cos(y*29+x*18);
  case 'feather-erasure':return Math.min(Math.abs(x-.64-.32*(y-.5)+.09*Math.sin(y*8)),.065+Math.abs(x-.38-.26*(y-.5)))+.021*Math.cos(x*28-y*17);
  case 'inscription-collapse':return Math.min(Math.abs(y-.21-.19*x),Math.abs(y-.61-.19*x),.07+Math.abs(x-.66+.14*y))+.017*Math.sin(x*33+y*12);
  case 'hope-mask-peel':return Math.min(h((x-.55)*.93,(y-.42)*.84),h((x-.79)*1.05,(y-.74)*.94)+.045)+.036*(x-.48)*Math.sin(y*11);
  }
 }
 function plan(seg,tier,side=1){
  const q=identity(seg);if(!q||!Object.hasOwn(B.target,tier))return null;if(q.stage===2)return stage2Plan(q,{difficulty:tier},side);
  const easy=tier==='gentle'||tier==='easy', sequential=q.theme==='sequential-rootlets';
  side=side>=0?1:-1;
  const lane=q.stage===1&&easy?64:q.stage===1&&tier==='normal'?49:42;
  const keep=side>0?[area.x0,area.x0+lane]:[area.x1-lane,area.x1];
  const scores=new Uint16Array(N), hist=new Uint32Array(2049), wanted=Math.round(B.target[tier]*N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const k=y*W+x,a=x+area.x0;if(a>=keep[0]&&a<keep[1]){scores[k]=65535;continue;}
   const xx=(x+.5)/W,yy=(y+.5)/H;
   const t=cap(Math.round((.061+rank(q.theme,side>0?xx:1-xx,yy))*2048),0,2048);
   scores[k]=t;hist[t]++;
  }
  let edge=0,before=0;while(before+hist[edge]<wanted)before+=hist[edge++];
  let ties=wanted-before,count=0;const spans=[];
  for(let y=0;y<H;y++){
   const l=[];let st=-1;for(let x=0;x<W;x++){
    const s=scores[y*W+x],yes=s<edge||(s===edge&&ties-->0);
    if(yes){count++;if(st===-1)st=x;}else if(st>=0){l.push(area.x0+st,area.x0+x);st=-1;}
   }
   if(st>=0)l.push(area.x0+st,area.x1);spans.push(Object.freeze(l));
  }
  if(count!==wanted)throw Error('mask size mismatch');
  // P0's unchanged active-group selector acts every seven ticks. Rootlets rise in three
  // consecutive rows: warned union keeps target %, instantaneous active group is smaller.
  const blank=Object.freeze([]);
  const landings=sequential?Object.freeze([0,1,2].map(k=>Object.freeze(spans.map((l,y)=>Math.min(2,Math.floor(y*3/H))===k?l:blank)))):null;
  const warn=q.stage===1&&easy?180:easy?154:tier==='normal'?145:136;
  return Object.freeze({ok:true,theme:q.theme,difficulty:tier,area,rows:Object.freeze(spans),landings,coverage:count/N,cells:count,target:B.target[tier],safeLane:Object.freeze(keep),side,timing:Object.freeze([warn,sequential?21:easy?12:tier==='normal'?15:17,easy?33:tier==='normal'?35:36])});
 }
 function make(s,{art,side=1,priorEvent=null,blocked=false}={}){
  if((!offlineOnly&&!nativeOnly)||!s||blocked||s.stage!=='card'||s.cardEnding||s.cardDown||s.calm||s.formHold>s.tick||s.bossEntrance?.readyTick>s.tick||!(s.boss?.hp>0))return null;
  const q=identity(s.seg);if(!q||s.stageIndex!==q.stage-1||s.boss.actor!==q.actor||!Number.isInteger(s.tick)||!verified[q.artId])return null;
  if(nativeOnly&&(!s.entranceAll||!s.boss.present||s.boss.leaving||
      (q.role!=='mid'&&s.formKey!==q.stage-1+'|'+q.actor+'|'+(q.formNo||0))))return null;
  if(priorEvent&&priorEvent.seg===s.seg&&B.phaseAt(priorEvent.plan,s.tick-priorEvent.start))return null;
  const a=verified[q.artId];if(!art||art.artId!==q.artId||art.path!==a.path||art.sha256!==a.sha256||art.frameCount<20||!B.atlasSpec(art,q.theme))return null;
  const p=q.stage===2?stage2Plan(q,s,side):plan(q.seg,s.difficulty,side);if(!p)return null;
  if(q.stage===2&&(!source?.ready(art.image)||art.frameCount!==24||art.columns!==6||!art.framesByPhase||
      (q.seg===13&&(!Array.isArray(art.contact)||art.contact.length!==24||art.contact[17]?.length!==350))))return null;
  const ar=Object.freeze({...art,cells:art.cells&&Object.freeze(art.cells.map(c=>Object.freeze([...c]))),framesByPhase:art.framesByPhase&&Object.freeze(Object.fromEntries(Object.entries(art.framesByPhase).map(([k,v])=>[k,Object.freeze([...v])])))}); 
  return Object.freeze({actor:q.actor,seg:q.seg,start:s.tick,plan:p,art:ar,offlineOnly:!nativeOnly,p1Native:nativeOnly,stage2Source:q.stage===2});
 }
 const fit=(x,a,b)=>Math.max(a,Math.min(b,x));
 function stage2Plan(q,s,side){
  if(!Object.hasOwn(B.target,s.difficulty))return null;
  const clock=s.difficulty==='hell'?[64,16,24]:s.difficulty==='normal'?[74,19,27]:[86,22,31];
  const egg=q.seg===13,sw=egg?286:q.seg===16?315:312,sh=egg?303:q.seg===16?350:455;
  const x=fit(Number(s.boss?.x)||180, egg?153:167,egg?207:193)-sw/2;
  const y=egg?fit((Number(s.boss?.y)||102)-303*62/192+18,58,141):q.seg===16?58:93;
  return Object.freeze({ok:true,theme:q.theme,difficulty:s.difficulty,stage2Source:true,area,
   side:side>=0?1:-1,timing:Object.freeze(clock),draw:Object.freeze([x,y,sw,sh]),seg:q.seg});
 }
 function stage2Frame(e,s){
  if(!e?.stage2Source||s?.seg!==e.seg||s.stage!=='card'||s.cardEnding||s.cardDown||!(s.boss?.hp>0)||s.boss.actor!==e.actor)return null;
  const f=B.phaseAt(e.plan,s.tick-e.start);if(!f)return null;
  const a=e.art.framesByPhase[f.name],p=f.local/Math.max(1,f.duration-1);
  return {phase:f.name,frame:Math.round(a[0]+p*(a[1]-a[0]))};
 }
 function stage2Paint(ctx,e,s){
  const it=stage2Frame(e,s);if(!it)return false;
  const a=e.art,f=it.frame,[x,y,w,h]=e.plan.draw,{x0,y0,x1,y1}=area;
  ctx.save();try{
   ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.clip();
   if(e.plan.side<0){ctx.translate(x*2+w,0);ctx.scale(-1,1);}
   ctx.drawImage(a.image,(f%a.columns)*a.cellWidth,Math.floor(f/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight,x,y,w,h);
  }finally{ctx.restore();}
  return true;
 }
 function stage2Hit(e,s){
  const f=stage2Frame(e,s),{x,y}=s.player||{};
  if(f?.phase!=='active'||!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(e.seg===13){
   const [dx,dy,w,h]=e.plan.draw,a=e.art;
   const ix=Math.floor((e.plan.side<0?dx+w-x:x-dx)*a.cellWidth/w),iy=Math.floor((y-dy)*a.cellHeight/h);
   if(ix<0||iy<0||ix>=a.cellWidth||iy>=a.cellHeight||!a.contact[f.frame].includes(iy*a.cellWidth+ix))return false;
  }
  // Chromium DPR2 rendered the silk's fine fringe below the visible hit floor
  // even at predicted alpha 106. Keep contact in its more opaque source ink.
  const threshold=e.seg===13?158:e.seg===18?124:104;
  return !!source?.test({event:e,state:s,painter:stage2Paint,x,y,threshold});
 }
 function paint(ctx,event,s){
  if(event?.stage2Source)return stage2Paint(ctx,event,s);
  if(event?.plan.theme!=='sequential-rootlets')return B.paint(ctx,event,s);
  const ph=B.phaseAt(event.plan,s.tick-event.start),group=B.impactIndex(event.plan,ph);
  const shim=new Proxy(ctx,{
   get(o,k){
    if(k==='drawImage')return (img,sx,sy,sw,sh,dx,dy,dw,dh)=>{
     // Reproject the already approved decal inside the correct sequential burst rows.
     // Native drawImage remains the immediate call; B's exact geometry clip stays in force.
     const groups=group===null?[0,1,2]:[group], newH=dh/3;
     for(const z of groups){
      if(sw===320&&sh===320){
       // Exactly the existing roots, enlarged within each native sequential band.
       // Only transparent donor margins are cropped. Collision replays the same draw.
       const wind=ph?.name==='telegraph';
       if(ph?.name==='active'){
        // Each of the three actual bursts gets a complete source growth beat,
        // rather than beginning the later groups from the old group's fade.
        const cell=8+Math.round((ph.local%7)*7/6);
        sx=(cell%event.art.columns)*sw;sy=Math.floor(cell/event.art.columns)*sh;
       }
       o.drawImage(img,sx+24,sy+145,262,112,dx+dw*.06,dy+z*newH+newH*(wind?.24:.11),dw*.88,newH*(wind?.52:.78));
      }else o.drawImage(img,sx,sy,sw,sh,dx,dy+z*newH,dw,newH);
     }
    };
    const v=Reflect.get(o,k,o);return typeof v==='function'?v.bind(o):v;
   },
   set(o,k,v){return Reflect.set(o,k,v,o);}
  });
  return B.paint(shim,event,s);
 }
 return Object.freeze({specs,verified,identity,plan,make,hit:(e,s)=>e?.stage2Source?stage2Hit(e,s):B.hit(e,s,paint),paint,held:!nativeOnly});
});
