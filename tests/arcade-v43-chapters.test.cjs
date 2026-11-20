'use strict';
/* 서사 챕터(정본 제1부~제8부)·챕터 기록·저장 이중화(사용자 11-20 "저장 불러오기 꼭 잘되게해야해"). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const A=require('../src/arcade-v43.js'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
global.HapilArcadeStory=require('../src/arcade-story-v43.js');
const C=require('../src/arcade-chapters-v43.js');
const canon=read('docs/v43/canonical-story.txt');

test('eight chapters follow the canonical part headers and cover all 56 stages in order',()=>{
 const list=C.list(A.STAGES);assert.equal(list.length,8);
 let next=0;
 for(const c of list){
  assert(canon.includes('제'+c.part+'부 — '+c.title+'\n'),'canon header for part '+c.part);
  assert.equal(c.first,next);assert.deepEqual(c.stages,Array.from({length:c.last-c.first+1},(_,i)=>c.first+i));next=c.last+1;
  assert(c.numeral&&c.numeral.length===1);
 }
 assert.equal(next,A.STAGES.length);
});

test('every chapter opening and the finale quote the canon verbatim with a canon speaker',()=>{
 for(let p=1;p<=8;p++){
  const op=C.opening(A.STAGES,p);assert(op&&op.lines.length>=2,'opening '+p);
  for(const l of op.lines){assert(canon.includes(l.text),p+': '+l.text);assert(canon.includes('〈'+l.speaker+'〉'),l.speaker);assert(l.text.length<=80);}
 }
 // 연결 장면은 앞 챕터의 마지막 스테이지 뒤에 있다
 assert.equal(C.opening(A.STAGES,2).title,'기억하지 못하는 사람');assert.equal(C.opening(A.STAGES,7).title,'잘못 이어진 기록');
 const f=C.finale();assert(f.lines.every(l=>canon.includes(l.text)));
});

test('chapter summary, per-difficulty completion log and merging never lose a record',()=>{
 const P=A.Progress;let p=P.fresh(),log=C.freshLog();
 const ch1=C.list(A.STAGES)[0];
 for(const i of ch1.stages){p=P.record(p,{stage:i,stars:i%3+1,score:100+i},'normal');log=C.noteClear(log,A.STAGES,p,i,i===0?'gentle':'hell',1000+i);}
 const rows=C.summary(A.STAGES,p,log,i=>P.canPlay(p,i));
 assert.equal(rows[0].complete,true);assert.equal(rows[0].cleared,ch1.stages.length);assert.equal(rows[0].levelName,'이지','the lowest difficulty across the chapter is the completion grade');
 assert.equal(rows[0].doneAt,1000+ch1.last);assert.equal(rows[1].open,true);assert.equal(rows[1].next,rows[1].first);assert.equal(rows[2].open,false);
 const other=C.noteClear(C.freshLog(),A.STAGES,p,0,'hell',5);const merged=C.mergeLog(log,other,A.STAGES);assert.equal(merged.levels[0],3);assert.equal(merged.done[1],5,'the earliest completion time is kept');
 for(const junk of [null,7,'x',[],{levels:{0:9,99:2,a:1},done:{0:5,9:5,1:-1}}]){const c=C.cleanLog(junk,A.STAGES);assert.deepEqual(Object.keys(c.done),[]);assert(Object.values(c.levels).every(v=>v>=1&&v<=3));}
});

test('a save code round-trips and rejects edits or truncation',()=>{
 const bundle={v:1,progress:{cleared:[0,1],stars:{0:3,1:2},best:{0:5,1:6}},best:99};
 const code=C.encode(bundle);assert.match(code,/^HAPIL43-/);assert.deepEqual(C.decode(code),bundle);assert.deepEqual(C.decode('  '+code.slice(0,20)+'\n'+code.slice(20)+' '),bundle,'line breaks from a messenger app are ignored');
 assert.equal(C.decode(code.slice(0,-3)),null);assert.equal(C.decode(code.replace('HAPIL43-e','HAPIL43-f')),null);assert.equal(C.decode('hello'),null);
});

/* 앱 저장 경로: 진짜 앱 코드를 작은 DOM 대역으로 돌린다(arcade-v43-controls-settings 의 하네스 그대로 + 챕터 모듈). */
function harnessSource(){
 const src=read('tests/arcade-v43-controls-settings.test.cjs');const a=src.indexOf('function harness('),b=src.indexOf('\ntest(',a);
 return src.slice(a,b).replace("vm.runInContext(read('src/arcade-story-v43.js'),sandbox);","vm.runInContext(read('src/arcade-story-v43.js'),sandbox);vm.runInContext(read('src/arcade-chapters-v43.js'),sandbox);");
}
const harness=new Function('require','A','read','path','root','fs','vm','assert',harnessSource()+';return harness;')(require,A,read,path,root,fs,vm,assert);
const SAVE='hapil-arcade-save-v43',BAK='hapil-arcade-save-v43-bak';
function cleared(n){let p=A.Progress.fresh();for(let i=0;i<n;i++)p=A.Progress.record(p,{stage:i,stars:2,score:10*(i+1)},'normal');return p;}

test('the app writes the save twice and restores it when the main key is lost or damaged',()=>{
 const one=harness({});const api=one.w.HapilArcadeApp.debugState();
 const r=api.importCode(require('../src/arcade-chapters-v43.js').encode({v:1,progress:cleared(13)}));assert.equal(r.total,13);
 const main=JSON.parse(one.storage[SAVE]),bak=JSON.parse(one.storage[BAK]);assert.equal(main.cleared.length,13);assert.equal(bak.progress.cleared.length,13);assert(bak.at>0);
 assert(one.storage[C.LOG_KEY],'chapter log saved');
 for(const broken of [undefined,'{broken',JSON.stringify(A.Progress.fresh()),JSON.stringify(cleared(4))]){
  const saved=Object.assign({},one.storage);if(broken===undefined)delete saved[SAVE];else saved[SAVE]=broken;
  const two=harness(saved);two.h.loadProgress();const p=two.w.HapilArcadeApp.debugState().progress;
  assert.equal(p.cleared.length,13,'restored from backup: '+String(broken).slice(0,20));assert.equal(p.stars[12],2);
  assert.equal(JSON.parse(two.storage[SAVE]).cleared.length,13,'main key rewritten');
 }
 // 본 키가 예비보다 앞서 있으면(예비 쓰기만 실패) 본 키가 이긴다
 const ahead=Object.assign({},one.storage,{[SAVE]:JSON.stringify(cleared(20))});const three=harness(ahead);three.h.loadProgress();assert.equal(three.w.HapilArcadeApp.debugState().progress.cleared.length,20);
});

test('importing a save code merges instead of overwriting and keeps the better stars',()=>{
 const h=harness({[SAVE]:JSON.stringify(cleared(6))});h.h.loadProgress();const api=h.w.HapilArcadeApp.debugState();
 let p=A.Progress.fresh();for(let i=0;i<3;i++)p=A.Progress.record(p,{stage:i,stars:3,score:1},'hell');
 const r=api.importCode(C.encode({v:1,progress:p,best:777}));assert.equal(r.added,0);
 const now=h.w.HapilArcadeApp.debugState().progress;assert.equal(now.cleared.length,6);assert.equal(now.stars[0],3);assert.equal(now.best[0],10);
 assert.equal(api.importCode('HAPIL43-nope-00000000'),null);
});

test('arcade.html loads the chapter module before the app and has the chapter record screen',()=>{
 const html=read('arcade.html');const a=html.indexOf('src/arcade-chapters-v43.js'),b=html.indexOf('src/arcade-app-v43.js');assert(a>0&&a<b);
 for(const id of ['arcade-chapters','arcade-chapter-screen','arcade-chapter-list','chapter-export','chapter-import','chapter-import-go','chapter-code','arcade-chapter-back'])assert(html.includes('id="'+id+'"'),id);
});

test('locked chapters never put their title in the page, only an ink veil (spoiler guard)',()=>{
 const mk=tag=>({tag,children:[],className:'',textContent:'',style:{},dataset:{},attrs:{},appendChild(c){this.children.push(c);return c;},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},set type(v){}});
 const doc={createElement:mk,createTextNode:t=>({tag:'#text',textContent:t,children:[]}),getElementById:()=>null,head:null};
 const text=n=>(n.textContent||'')+(n.children||[]).map(text).join('')+Object.values(n.attrs||{}).join(' ');
 let p=A.Progress.fresh();for(let i=0;i<12;i++)p=A.Progress.record(p,{stage:i,stars:1,score:1},'normal');
 const rows=C.summary(A.STAGES,p,null,i=>A.Progress.canPlay(p,i)),box=mk('div');C.renderList(doc,box,rows,{restart(){},resume(){}});
 const all=text(box);
 for(const r of rows){if(r.open)assert(all.includes(r.title),'open title shown '+r.part);else assert(!all.includes(r.title),'locked title hidden '+r.part);}
 assert.equal(box.children.filter(r=>r.children[1].children.some(c=>/^ch-veil\b/.test(c.className))).length,6);
});
