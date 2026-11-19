// 탄막 규칙 전수조사(docs/v43/danmaku-rules.md): 보스 카드마다 정지 봇·회피 봇으로 돌려 첫 피격, 빈 화면 최장, 발밑 생성, 10초 구간별 탄 수, 발사 지점 수를 잰다.
// usage: node tools/audit-danmaku-rules-v43.cjs <repo> <gentle|normal|hell> <out.json> [from] [to]
const fs=require('fs'),path=require('path');const repo=process.argv[2],d=process.argv[3],out=process.argv[4];
const src=fs.readFileSync(path.join(repo,'src/arcade-v43.js'),'utf8').replace('function spawn(s,x,y,angle,speed,o){','function spawn(s,x,y,angle,speed,o){if(global.__AUD)global.__AUD(s,x,y,o);');
const tmp=path.join(repo,'src','_aud_'+d+'.js');fs.writeFileSync(tmp,src);const A=require(tmp);fs.unlinkSync(tmp);
const HELP=/\b(spawn|ring|fan|bell|curtain|emit|shape|wheel|lattice|aimed|stream|burst|spray|row|column|beam|fireVolley|volley|mirrorVolley|K\.\w+)\b/;
function site(){const st=new Error().stack.split('\n').slice(3,12);for(const f of st){const m=/at (?:Object\.)?([\w$.]+)? ?\(?(.*?):(\d+):\d+\)?$/.exec(f.trim());if(!m)continue;const fn=m[1]||'anon';if(HELP.test(fn))continue;return path.basename(m[2])+':'+m[3]+'('+fn+')';}return '?';}
function dodge(s){const p=s.player;let best=null,bs=1e18;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=Math.max(8,Math.min(352,p.x+dx*12)),ny=Math.max(300,Math.min(630,p.y+dy*12));let v=0;
 for(let i=0;i<s.n;i++){if(s.bexit[i])continue;for(const t of [4,10]){const bx=s.bx[i]+Math.cos(s.ba[i])*s.bs[i]*t/60,by=s.by[i]+Math.sin(s.ba[i])*s.bs[i]*t/60;v+=1/((bx-nx)**2+(by-ny)**2+20);}}
 for(const l of s.lasers){if(l.age<l.warn-30)continue;const c=Math.cos(l.angle),sn=Math.sin(l.angle),px=nx-l.x,py=ny-l.y,dist=Math.abs(px*sn-py*c);if(dist<l.width*.5+14)v+=.05;}
 v+=((nx-180)**2)*1e-7+((ny-560)**2)*1e-7;if(v<bs){bs=v;best={dx,dy};}}return {dx:best.dx*4,dy:best.dy*4};}
const segs=A.SEGMENTS.map((g,i)=>[g,i]).filter(([g])=>g.kind==='card');const from=+(process.argv[5]||0),to=+(process.argv[6]||segs.length);const res=[];
const T=3600;
for(const [g,i] of segs.slice(from,to)){const r={seg:i,stage:g.stage,name:g.name,actor:g.actor,mid:!!g.mid,spell:!!g.spell};
 for(const mode of ['still','dodge']){const s=A.createRun({segment:i,seed:31+i,difficulty:d,entranceAll:true,rhythm:true,compact:true});const sites={},born=new Array(Math.ceil(T/600)).fill(0);let firstHit=-1,hits=0,near=0,k=0,t0=-1,dur=0,quiet=0,maxQuiet=0,gap=0,maxGap=0;
  global.__AUD=(st,x,y,o)=>{if(t0<0||(o&&o.fragment))return;const key=site();sites[key]=(sites[key]||0)+1;const w=Math.floor((st.tick-t0)/600);if(w<born.length)born[w]++;const dx=x-st.player.x,dy=y-st.player.y;if(dx*dx+dy*dy<60*60)near++;};
  for(;k<T+2400;k++){if(s.stage!=='card'&&t0>=0)break;const h0=s.hits;A.step(s,mode==='still'?{}:dodge(s));if(s.stage==='card'&&t0<0)t0=s.tick;if(t0<0)continue;if(s.tick-t0>=T)break;dur=s.tick-t0;s.player.hp=9;const live=s.n>0||s.lasers.length||s.figures.length||(s.risers&&s.risers.length)||(s.mobs&&s.mobs.length)||(s.floor&&s.floor.pieces&&s.floor.pieces.length)||(s.floor&&s.floor.goal&&s.floor.goal.some(v=>v>0));quiet=live?0:quiet+1;{let th=false;for(let i=0;i<s.n;i++){if(s.bexit[i])continue;const dx=s.bx[i]-s.player.x,dy=s.by[i]-s.player.y;if(dx*dx+dy*dy<900){th=true;break;}}if(!th)for(const l of s.lasers){if(l.age<l.warn)continue;const c=Math.cos(l.angle),sn=Math.sin(l.angle),px=s.player.x-l.x,py=s.player.y-l.y;if(Math.abs(px*sn-py*c)<l.width*.5+30){th=true;break;}}gap=th?0:gap+1;if(gap>maxGap)maxGap=gap;}if(quiet>maxQuiet)maxQuiet=quiet;if(s.hits>h0){hits++;if(firstHit<0)firstHit=s.tick-t0;}s.events.length=0;}
  global.__AUD=null;
  if(mode==='still'){r.stillFirstHit=firstHit;r.stillHits=hits;r.stillDur=dur;r.stillGap=maxGap;}else{r.hits=hits;r.near=near;r.dur=dur;r.maxQuiet=maxQuiet;r.born=born;r.sites=Object.keys(sites).length;r.top=Object.entries(sites).sort((a,b)=>b[1]-a[1]).slice(0,6);}}
 res.push(r);}
fs.writeFileSync(out,JSON.stringify(res));console.log('done',res.length);
