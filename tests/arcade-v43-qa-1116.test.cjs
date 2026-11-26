'use strict';
/* 11-16 세로판 실검증에서 찾은 문제:
   1) 중간 저장에서 이어 하면 그때까지 자란 공격·필살 단계가 스테이지 기본값으로 내려갔다.
   2) 필살 컷인 제목이 한글 명조 없는 기기(아이폰·헤드리스)에서 고딕으로 떨어졌다 → 명조 조각 글꼴을 싣는다.
   3) 휴대폰(칸 안 HUD)에서 '공격 Lv · 필살 Lv' 글자가 저속 버튼 밑에 깔려 가려졌다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const h=require('./helpers/arcade-v43.cjs'),{root}=h;
const A=()=>h.need();

test('a mid-stage checkpoint keeps the attack and bomb levels grown so far',()=>{
 const a=A(),exp=a.POWER_EXP[3]+5,fills=a.BOMB_FILLS[2]+1;
 const source=fs.readFileSync(path.join(root,'src/arcade-mobile-v43.js'),'utf8');
 function mobile(storage){
  const w={HapilArcade:a,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>delete storage[k]},addEventListener(){}};
  w.window=w;vm.runInNewContext(source,w);return w.HapilMobile;
 }
 for(const hero of ['memory','seoha','seoha-b']){
  const storage={},segment=a.STAGES[1].first+1;
  const s=a.createRun({difficulty:'normal',seed:3,segment,hero,growth:true,grown:{exp,fills}});
  assert.equal(s.power,4);assert.equal(s.bombLevel,3);
  mobile(storage).tick(s,'playing',16);
  const saved=JSON.parse(storage['hapil-arcade-checkpoint-v43']);
  assert.equal(saved.exp,exp,'checkpoint persists attack growth');assert.equal(saved.fills,fills,'checkpoint persists bomb growth');
  // A fresh module reads serialized storage, as after closing and reopening the game.
  s.exp=s.fills=0;
  const cp=mobile({...storage}).checkpoint(1,'normal');assert(cp,'checkpoint is accepted after reload');
  const resumed=a.createRun({difficulty:'normal',stage:cp.stage,segment:cp.seg,hero:cp.hero,growth:true,grown:{exp:cp.exp,fills:cp.fills}});
  assert.equal(resumed.seg,segment);assert.equal(resumed.hero,hero);assert.equal(resumed.power,4);assert.equal(resumed.bombLevel,3);assert.equal(resumed.exp,exp);assert.equal(resumed.fills,fills);
 }
 const floor=a.createRun({difficulty:'normal',seed:3,stage:30,growth:true,grown:{exp:0,fills:0}});
 assert(floor.power>=4,'never below the journey floor');
});

test('the cut-in serif font ships as a small woff2 with every glyph the cut-in draws',()=>{
 const f=path.join(root,'media/fonts/hapil-serif-v43.woff2');assert(fs.existsSync(f));
 const size=fs.statSync(f).size;assert(size>2000&&size<60000,'small subset, got '+size);
 assert(fs.existsSync(path.join(root,'media/fonts/LICENSE-NotoSerifKR-OFL.txt')),'OFL licence travels with the font');
 const src=fs.readFileSync(path.join(root,'src/hero-memory-v43.js'),'utf8');
 assert.match(src,/new global\.FontFace\('HapilSerif'/);
 assert(!/px "Noto Serif KR"/.test(src),'every canvas font goes through the HapilSerif stack');
});

test('phone HUD level line sits above the hearts, clear of the slow-move button',()=>{
 const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
 assert.match(app,/var lvT=stockLevels\(s\)/);
 const m=app.match(/fillText\(lvT,12,H-(\d+)\)/);
 assert(m,'level line drawn');assert(+m[1]>96,'drawn above the hearts row (H-96), got H-'+m[1]);
});

test('the app bundle (tools/build-app-www.cjs) carries every media folder the portrait game loads',()=>{
 const html=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),tool=fs.readFileSync(path.join(root,'tools/build-app-www.cjs'),'utf8');
 const media=tool.match(/const MEDIA=\[([^\]]*)\]/)[1].split(',').map(x=>x.trim().replace(/'/g,'')).concat(['media/bgm']);
 const copied=[...tool.matchAll(/copy\('([^']+)'\)/g)].map(m=>m[1]);
 for(const file of copied)if(file.startsWith('media/'))media.push(path.posix.dirname(file));
 const used=new Set();
 for(const m of html.matchAll(/<script src="([^"?]+)/g)){const code=fs.readFileSync(path.join(root,m[1]),'utf8');for(const r of code.matchAll(/media\/[A-Za-z0-9_.-]+/g))used.add(r[0]);}
 for(const r of html.matchAll(/media\/[A-Za-z0-9_.-]+/g))used.add(r[0]);
 const missing=[...used].filter(u=>!media.includes(u)&&fs.existsSync(path.join(root,u)));
 assert.deepEqual(missing,[],'not packed into the app');
});

test('no script the portrait game loads declares the same function twice at one level, and no two scripts claim the same global (11-16: a twin stroke() hid the hero shots)',()=>{
 const html=fs.readFileSync(path.join(root,'arcade.html'),'utf8'),files=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]),owners={},dups=[];
 assert(files.length>=15);
 for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8'),seen=new Set();
  for(const m of src.matchAll(/^( *)function\s+([A-Za-z_$][\w$]*)\s*\(/gm)){const key=m[1].length+':'+m[2];if(seen.has(key))dups.push(f+' '+m[2]);seen.add(key);}
  for(const m of src.matchAll(/\b(?:global|window|root)\.(Hapil\w+|Arcade\w*)\s*=(?!=)(?!\s*(?:global|window|root)\.\1\s*\|\|)/g)){(owners[m[1]]=owners[m[1]]||new Set()).add(f);}}
 assert.deepEqual(dups,[],'duplicate function declarations');
 const shared=Object.entries(owners).filter(([,s])=>s.size>1).map(([k,s])=>k+': '+[...s].join(', '));
 assert.deepEqual(shared,[],'one global, one owner');
});
