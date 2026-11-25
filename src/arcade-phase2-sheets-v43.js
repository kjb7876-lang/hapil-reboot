(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.HapilPhase2Sheets=factory;
})(typeof globalThis!=='undefined'?globalThis:this,function bind(A,art,{taken=new Set()}={}){
 /* 닷츠 CX-0191BS 보스 스킬 시트(11~52스테이지, 사용자 11-25 "교만보스랑 연산핵등 여러보스 프레임애니메이션 이펙트 스킬패턴이 적용 안되어 있는데?").
  * 보스마다 시트 주제와 이름이 같은 스펠 카드(없으면 그 보스의 첫 스펠)를 시작할 때 한 번: 예고(0~7칸, 판정 없음) → 공격(8~15칸) → 사라짐(16~23칸).
  * 시트는 판 전체(8,40)~(352,626)에 펼친다. 가운데 세로 길(약 54px)은 24칸 내내 비어 있어 피할 수 있다.
  * 판정은 그림 알파(174 이상, 닷츠 규격)를 48×64 격자로 미리 줄인 비트표(art.mask)로 본다 → 노드·브라우저가 같은 결과.
  * 시그니처가 도는 동안 보스는 쏘지 않고 카드 시계도 멈춘다(엔진 sweeping). */
 if(!A?.SEGMENTS||!A?.STAGES)throw Error('native routes required');
 const area=Object.freeze({x0:8,x1:352,y0:40,y1:626}),AW=area.x1-area.x0,AH=area.y1-area.y0;
 const TIMING=Object.freeze({gentle:[110,46,36],easy:[110,46,36],normal:[96,48,36],hell:[84,50,36]}); // 예고·공격·사라짐 틱
 const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 function unpack(str){
  const out=new Uint8Array(Math.floor(str.replace(/=+$/,'').length*3/4));let bits=0,acc=0,j=0;
  for(const ch of str){if(ch==='=')break;const v=B64.indexOf(ch);if(v<0)throw Error('bad mask');acc=(acc<<6)|v;bits+=6;if(bits>=8){bits-=8;out[j++]=(acc>>bits)&255;}}
  return out;
 }
 const finals={};
 A.STAGES.forEach((g,i)=>{finals[g.part]=Math.max(finals[g.part]??-1,i);});
 const art2=A.segArt||(n=>n.form||n.actor);
 const specs={},masks={};
 for(const d of Object.values(art||{})){
  const si=d.stage-1,st=A.STAGES[si];if(!st||!d.mask)continue;
  const mine=[];
  A.SEGMENTS.forEach((n,i)=>{if(n.kind==='card'&&n.stage===si&&n.spell&&!n.mid&&(n.actor===d.actor||art2(n)===d.actor)&&!taken.has(i))mine.push(i);});
  if(!mine.length)continue;
  const named=mine.find(i=>A.SEGMENTS[i].name&&String(d.topic||'').includes(A.SEGMENTS[i].name));
  const seg=named??mine[0],n=A.SEGMENTS[seg];
  taken.add(seg);
  specs[seg]=Object.freeze({seg,actor:n.actor,stage:d.stage,scene:String(st.scene),theme:d.theme,role:si===finals[st.part]?'episode':'main',mid:false});
  const fr={};for(const [k,v] of Object.entries(d.mask.frames))fr[k]=unpack(v);
  masks[d.theme]=Object.freeze({w:d.mask.w,h:d.mask.h,frames:Object.freeze(fr)});
 }
 Object.freeze(specs);
 function identity(seg){
  const q=specs[seg],n=A.SEGMENTS[seg];
  return q&&n&&n.kind==='card'&&n.spell&&!n.mid&&n.actor===q.actor&&A.STAGES[n.stage]?.index+1===q.stage?q:null;
 }
 function make(s,{art:spec}={}){
  const q=identity(s.seg);if(!q||!spec||spec.theme!==q.theme||!masks[q.theme])return null;
  const t=TIMING[s.difficulty]||TIMING.normal;
  return Object.freeze({actor:q.actor,seg:q.seg,start:s.tick,art:spec,sheetSource:true,
   plan:Object.freeze({ok:true,theme:q.theme,difficulty:s.difficulty,area,timing:Object.freeze(t.slice()),
    safeLane:Object.freeze([area.x0+AW*108/256,area.x0+AW*148/256])})});
 }
 function phase(e,s){
  const p=e?.plan,age=s.tick-e.start;if(!p?.ok||age<0)return null;const [w,a,d]=p.timing;
  return age<w?{name:'telegraph',local:age,duration:w}:age<w+a?{name:'active',local:age-w,duration:a}:age<w+a+d?{name:'decay',local:age-w-a,duration:d}:null;
 }
 function frameOf(e,s){
  if(!e?.sheetSource||s?.seg!==e.seg||s.stage!=='card'||s.cardEnding||s.cardDown||!(s.boss?.hp>0)||s.boss.actor!==e.actor)return null;
  const f=phase(e,s);if(!f)return null;
  const r=e.art.framesByPhase[f.name],u=f.local/Math.max(1,f.duration-1);
  return {phase:f.name,frame:Math.min(r[1],Math.round(r[0]+u*(r[1]-r[0])))};
 }
 function at(m,frame,x,y){
  const bits=m.frames[frame];if(!bits)return false;
  const gx=Math.floor((x-area.x0)*m.w/AW),gy=Math.floor((y-area.y0)*m.h/AH);
  if(gx<0||gy<0||gx>=m.w||gy>=m.h)return false;
  const i=gy*m.w+gx;return !!(bits[i>>3]&(1<<(i&7)));
 }
 function hit(e,s){
  const f=frameOf(e,s),p=s.player;if(f?.phase!=='active'||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
  return at(masks[e.plan.theme],f.frame,p.x,p.y);
 }
 function paint(ctx,e,s){
  const f=frameOf(e,s);if(!f)return false;
  const a=e.art,k=f.frame;
  ctx.save();try{
   ctx.beginPath();ctx.rect(area.x0,area.y0,AW,AH);ctx.clip();
   if(f.phase==='decay')ctx.globalAlpha=Math.max(0,1-phase(e,s).local/phase(e,s).duration*.6);
   ctx.drawImage(a.image,(k%a.columns)*a.cellWidth,Math.floor(k/a.columns)*a.cellHeight,a.cellWidth,a.cellHeight,area.x0,area.y0,AW,AH);
  }finally{ctx.restore();}
  return true;
 }
 // 검사용: 공격 칸에서 판정이 있는 격자 비율과 가운데 길이 비었는지.
 function audit(theme){
  const m=masks[theme];if(!m)return null;const lane=[Math.floor(m.w*108/256),Math.ceil(m.w*148/256)];let laneHits=0,cover=0;
  for(const bits of Object.values(m.frames))for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){const i=y*m.w+x;if(bits[i>>3]&(1<<(i&7))){cover++;if(x>=lane[0]&&x<lane[1])laneHits++;}}
  return {coverage:cover/(m.w*m.h*Object.keys(m.frames).length),laneHits};
 }
 return Object.freeze({specs,identity,make,hit,paint,phase,frameOf,audit,area});
});
