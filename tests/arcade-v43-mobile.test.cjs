'use strict';
/* 모바일 출시 준비(11-15): 중간 저장, 오류·플레이 기록, 기기 진단, 다국어 준비, 난이도 설명, 숨김 버튼. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const A=require('../src/arcade-v43.js');
function sandbox(search){
  const store={},listeners={};
  const w={HapilArcade:A,location:{search:search||''},navigator:{userAgent:'test',language:'en-US'},screen:{width:390,height:844},innerWidth:390,innerHeight:844,devicePixelRatio:3,
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
    addEventListener:(k,f)=>{(listeners[k]=listeners[k]||[]).push(f);},setTimeout:()=>0};
  w.window=w;w.globalThis=w;
  const ctx=vm.createContext(w);
  vm.runInContext(read('src/arcade-i18n-v43.js'),ctx);vm.runInContext(read('src/arcade-mobile-v43.js'),ctx);
  return {w,store,listeners};
}
test('a checkpoint is left when a segment starts and resumes only in its own stage and difficulty',()=>{
  const {w,store}=sandbox(),M=w.HapilMobile,st=A.STAGES[3];
  const s=A.createRun({stage:3,difficulty:'normal',seed:3,compact:true});s.started=true;s.seg=st.first+2;s.stage='wave';
  M.tick(s,'playing',16);
  const cp=JSON.parse(store['hapil-arcade-checkpoint-v43']);assert.equal(cp.stage,3);assert.equal(cp.seg,st.first+2);
  assert.equal(M.checkpoint(3,'normal').seg,st.first+2);
  assert.equal(M.checkpoint(3,'hell'),null,'other difficulty');assert.equal(M.checkpoint(4,'normal'),null,'other stage');
  s.seg=st.first;M.tick(s,'playing',16);assert.equal(M.checkpoint(3,'normal'),null,'the first segment is the same as starting over');
});
test('checkpoints preserve the chosen hero and growth; legacy or unknown hero ids safely resume as Memory',()=>{
  const {w,store}=sandbox(),M=w.HapilMobile,st=A.STAGES[3];
  const s=A.createRun({stage:3,difficulty:'normal',hero:'seoha',seed:3});s.started=true;s.seg=st.first+1;s.stage='wave';s.exp=500;s.fills=20;M.tick(s,'playing',16);
  const saved=JSON.parse(store['hapil-arcade-checkpoint-v43']);assert.equal(saved.hero,'seoha');assert.equal(saved.exp,500);assert.equal(saved.fills,20);
  assert.equal(M.checkpoint(3,'normal').hero,'seoha');
  delete saved.hero;store['hapil-arcade-checkpoint-v43']=JSON.stringify(saved);assert.equal(M.checkpoint(3,'normal').hero,'memory','pre-selection checkpoints retain the original hero');
  saved.hero='unknown';store['hapil-arcade-checkpoint-v43']=JSON.stringify(saved);assert.equal(M.checkpoint(3,'normal').hero,'memory');
});
test('awakening is saved within the same segment and carried to the next stage',()=>{
  const {w}=sandbox(),M=w.HapilMobile,st=A.STAGES[3],next=A.STAGES[4];
  const s=A.createRun({segment:st.first,hero:'seoha',entranceAll:true,grown:{fills:21}});
  M.tick(s,'playing',16);
  assert.equal(M.checkpoint(3,'normal').fills,21);
  assert.equal(M.checkpoint(3,'normal').union,undefined);
  A.gainExp(s,Math.ceil(A.POWER_EXP[6]*100/(2*A.POWER_EXP_RATE)));
  M.tick(s,'playing',16);
  assert.equal(M.checkpoint(3,'normal').union,true);
  s.stage='bossClear';s.bossClear={nextSegment:next.first,stageCommitted:true};
  M.commitBossClear(s);s.results.push({stage:3,stars:3});M.tick(s,'playing',16);
  const saved=M.checkpoint(4,'normal');
  assert.equal(saved.union,true);
  assert.equal(saved.seg,next.first);
  assert.equal(saved.exp,s.exp);
  assert.equal(saved.fills,21);
  assert.equal(saved.expRemainder,s.expRemainder);
  assert.equal(saved.hits,0);
  assert.equal(A.createRun({segment:saved.seg,hero:saved.hero,entranceAll:true,grown:saved}).union,true);
});
test('losing or clearing a stage without earned ultimate growth drops the checkpoint and counts the attempt',()=>{
  const {w,store}=sandbox(),M=w.HapilMobile,st=A.STAGES[1];
  const s=A.createRun({stage:1,difficulty:'gentle',seed:3});s.started=true;s.seg=st.first+1;s.stage='wave';M.tick(s,'playing',16);
  assert(store['hapil-arcade-checkpoint-v43']);
  s.stage='lost';M.tick(s,'playing',16);assert.equal(store['hapil-arcade-checkpoint-v43'],undefined);
  const row=M._stats().stages['gentle:1'];assert.equal(row.tries,1);assert.equal(row.losses,1);
  const s2=A.createRun({stage:1,difficulty:'gentle',seed:4});s2.started=true;s2.seg=st.first+1;s2.stage='wave';M.tick(s2,'playing',16);
  s2.results.push({stage:1,stars:3});M.tick(s2,'playing',16);assert.equal(store['hapil-arcade-checkpoint-v43'],undefined);assert.equal(M._stats().stages['gentle:1'].clears,1);
});
test('filling the ultimate gauge saves growth even before the first segment ends, and defeat keeps that growth for a stage retry',()=>{
  for(const hero of ['memory','seoha','seoha-b'])for(const difficulty of ['gentle','normal','hell']){
    const {w}=sandbox(),M=w.HapilMobile,stage=1,st=A.STAGES[stage];
    const s=A.createRun({hero,difficulty,segment:st.first,growth:true,compact:true});
    M.tick(s,'playing',16);
    assert.equal(M.checkpoint(stage,difficulty),null);
    s.gauge=A.GAUGE_FULL*A.BOMB_FILLS[3];
    A.step(s,{});
    assert.equal(s.bombLevel,4);
    M.tick(s,'playing',16);
    const saved=M.checkpoint(stage,difficulty);
    assert.equal(saved.seg,st.first);
    assert.equal(A.createRun({hero,difficulty,stage,growth:true,grown:saved}).bombLevel,4);

    s.seg=st.first+1;s.hits=3;s.bombsUsed=2;s.bombs=0;s.stage='lost';
    M.tick(s,'playing',16);
    const retry=M.checkpoint(stage,difficulty);
    assert.equal(retry.seg,st.first);
    assert.equal(retry.hero,hero);
    assert.equal(retry.hits,0);
    assert.equal(retry.bombs,0);
    assert.equal(retry.stock,undefined);
    const resumed=A.createRun({hero,difficulty,stage,growth:true,grown:retry});
    assert.equal(resumed.bombLevel,4);
    assert.equal(resumed.bombs,A.DIFFICULTY[difficulty].bombs);
  }
});
test('the device report lists frames, stages and recorded errors',()=>{
  const {w,listeners}=sandbox(),M=w.HapilMobile;
  const s=A.createRun({stage:0,difficulty:'normal',seed:1});for(let i=0;i<100;i++)M.tick(s,'playing',i<95?16:70);
  listeners.error[0]({message:'boom',filename:'https://x/src/a.js',lineno:3,colno:9,error:{stack:'s'}});
  listeners.error[0]({message:'boom',filename:'https://x/src/a.js',lineno:3,colno:9,error:{stack:'s'}});
  const r=M.report();assert.match(r,/프레임: 100개/);assert.match(r,/느린5% \d+ms/);assert.match(r,/normal:1 1\/0\/0/);assert.match(r,/boom @a\.js:3:9 ×2/);
});
test('i18n: Korean by default, ?lang=en switches, {n} slots fill, missing keys fall back to Korean',()=>{
  const ko=sandbox().w.HapilI18n,en=sandbox('?lang=en').w.HapilI18n;
  assert.equal(ko.lang,'ko');assert.equal(en.lang,'en');
  assert.equal(ko.t('continueStage',{n:4}),'이어하기 · STAGE 4');assert.equal(en.t('continueStage',{n:4}),'Continue · STAGE 4');
  for(const k of Object.keys(ko.DICT.ko))assert(k in en.DICT.en,'English has '+k);
});
test('every data-i18n key in the page exists, and the helpers load before the app',()=>{
  const html=read('arcade.html'),dict=sandbox().w.HapilI18n.DICT.ko;
  for(const m of html.matchAll(/data-i18n(?:-html|-label)?="([^"]+)"/g))assert(m[1] in dict,'key '+m[1]);
  const order=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
  assert(order.indexOf('src/arcade-i18n-v43.js')>=0&&order.indexOf('src/arcade-i18n-v43.js')<order.indexOf('src/arcade-app-v43.js'));
  assert(order.indexOf('src/arcade-mobile-v43.js')>=0&&order.indexOf('src/arcade-mobile-v43.js')<order.indexOf('src/arcade-app-v43.js'));
  assert(order.indexOf('src/arcade-heroes-v43.js')>=0&&order.indexOf('src/arcade-heroes-v43.js')<order.indexOf('src/arcade-v43.js'),'hero profiles must exist when the engine initializes');
  assert(order.indexOf('src/arcade-hero-select-v43.js')>=0&&order.indexOf('src/arcade-hero-select-v43.js')<order.indexOf('src/arcade-app-v43.js'),'the picker must exist before app boot');
});
test('difficulty notes come from the real rules (lives and bombs)',()=>{
  const app=read('src/arcade-app-v43.js');assert.match(app,/T\(NOTES\[difficulty\],\{hp:rule\.hp,bombs:rule\.bombs,minutes:/);assert.doesNotMatch(app,/목숨 7 · 폭탄 3/);
});
test('a hidden button stays hidden (button display:flex used to override [hidden])',()=>{
  assert.match(read('arcade.html'),/button\[hidden\],a\.button\[hidden\],\.note\[hidden\]\{display:none\}/);
});
test('the app bundle has every script the page loads, the art it needs, and hides developer mode',()=>{
  const os=require('os'),cp=require('child_process'),out=fs.mkdtempSync(path.join(os.tmpdir(),'hapil-www-'));
  try{
    cp.execFileSync(process.execPath,[path.join(root,'tools/build-app-www.cjs'),out],{stdio:'pipe'});
    const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
    for(const m of html.matchAll(/<script src="([^"?]+)/g))assert(fs.existsSync(path.join(out,m[1])),m[1]);
    for(const f of ['media/arcade-v43/manifest.json','media/music.mp3','media/gunner.webp','media/combat/boss01-purple-sword-spider-angel-cutin.webp','media/arcade-v43-heroes/seoha-portrait.webp','media/arcade-v43-heroes/seoha-player.webp','media/arcade-v43-heroes/seoha-portrait-v2.webp','media/arcade-v43-heroes/seoha-player-v2.webp'])assert(fs.existsSync(path.join(out,f)),f);
    assert.equal(fs.readFileSync(path.join(out,'docs/v43/canonical-story.txt'),'utf8'),read('docs/v43/canonical-story.txt'),'offline app preserves the complete canonical text');
    assert.match(fs.readFileSync(path.join(out,'src/arcade-app-v43.js'),'utf8'),/var DEV_VISIBLE=false[;,]/);
    assert.match(read('src/arcade-app-v43.js'),/var DEV_VISIBLE=true[;,]/,'the repository copy is untouched');
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('background music picks a track for the title, the road, boss fights and the last boss',()=>{
  const w={HapilArcade:A,fetch:()=>({then:()=>({then:()=>{}})})};w.window=w;const ctx=vm.createContext(w);vm.runInContext(read('src/arcade-music-v43.js'),ctx);
  const M=w.HapilMusic,last=A.STAGES.length-1;
  assert.equal(M.pick('title',null),'title');assert.equal(M.pick('result',null),'title');
  assert.equal(M.pick('playing',{stage:'wave',stageIndex:0,boss:{present:false}}),'field');
  assert.equal(M.pick('playing',{stage:'card',stageIndex:3,boss:{present:true}}),'boss');
  assert.equal(M.pick('playing',{stage:'break',stageIndex:3,boss:{present:true}}),'boss','between two boss patterns the boss music keeps going');
  const html=read('arcade.html');assert(html.indexOf('src/arcade-music-v43.js')>0&&html.indexOf('src/arcade-music-v43.js')<html.indexOf('src/arcade-app-v43.js'));
  assert.equal(typeof last,'number');
});
test('every listed background track exists and the title screen credits the instrument samples',()=>{
  const idx=JSON.parse(read('media/bgm/index.json'));
  for(const k of ['title','field','boss','final']){assert(idx.tracks[k],k);assert(fs.existsSync(path.join(root,'media/bgm',idx.tracks[k].file)),idx.tracks[k].file);assert(idx.tracks[k].volume>0&&idx.tracks[k].volume<=.4);}
  assert.match(read('arcade.html'),/id="arcade-credit" data-i18n="credit"/);assert.match(read('media/bgm/CREDITS.txt'),/CC BY 3\.0/);
});
test('a stage cleared mid-run keeps its played time (not paused time) even though the next stage starts in the same frame',()=>{
  const {w}=sandbox(),M=w.HapilMobile,st=A.STAGES[1];
  const s=A.createRun({stage:1,difficulty:'normal',seed:5});s.started=true;s.seg=st.first+1;s.stage='wave';
  for(let i=0;i<300;i++)M.tick(s,'playing',20); // 6초 플레이
  M.tick(s,'paused',3600000); // 한 시간 일시정지
  s.results.push({stage:1,stars:3});s.stageIndex=2;M.tick(s,'playing',20);
  const row=M._stats().stages['normal:1'];assert.equal(row.clears,1);assert(row.ms>=6000&&row.ms<7000,'took '+row.ms);
});
test('boss practice never erases the campaign checkpoint',()=>{
  const {w,store}=sandbox(),M=w.HapilMobile,st=A.STAGES[2];
  const s=A.createRun({stage:2,difficulty:'normal',seed:3});s.started=true;s.seg=st.first+2;s.stage='wave';M.tick(s,'playing',16);
  const saved=store['hapil-arcade-checkpoint-v43'];assert(saved);
  const b=A.createRun({stage:5,difficulty:'normal',seed:3,bossOnly:true});b.started=true;M.tick(b,'playing',16);
  b.results.push({stage:5,stars:3});M.tick(b,'playing',16);b.stage='lost';M.tick(b,'playing',16);
  assert.equal(store['hapil-arcade-checkpoint-v43'],saved);
});
test('the checkpoint keeps hits and bombs taken earlier in the stage, and continuing carries them into the stars',()=>{
  const {w,store}=sandbox(),M=w.HapilMobile,st=A.STAGES[3];
  const s=A.createRun({stage:3,difficulty:'normal',seed:3});s.started=true;s.stage='wave';s.hits=2;s.bombsUsed=1;s.seg=st.first+1;M.tick(s,'playing',16);
  const cp=JSON.parse(store['hapil-arcade-checkpoint-v43']);assert.equal(cp.hits,2);assert.equal(cp.bombs,1);
  assert.match(read('src/arcade-app-v43.js'),/carry:\{hits:mid\.hits,bombs:mid\.bombs\}/);
  assert.match(read('src/arcade-app-v43.js'),/state\.hits\+=run\.carry\.hits\|0;state\.bombsUsed\+=run\.carry\.bombs\|0;/);
});
test('menu music stops while the page is hidden or the app is in the background, and diagnostics see real frame times',()=>{
  let vis=null;const paused=[];
  class Aud{constructor(src){this.src=src;this.paused=true;this.volume=0;}play(){this.paused=false;return {catch(){}};}pause(){this.paused=true;paused.push(this.src);}}
  const doc={hidden:false,addEventListener:(k,f)=>{if(k==='visibilitychange')vis=f;}};
  const w={HapilArcade:A,document:doc,Audio:Aud,performance:{now:()=>0}};
  w.fetch=()=>Promise.resolve({ok:true,json:()=>({tracks:{title:{file:'t.mp3',volume:.2}}})});
  w.window=w;const ctx=vm.createContext(w);vm.runInContext(read('src/arcade-music-v43.js'),ctx);
  return new Promise(r=>setTimeout(r,10)).then(()=>{
    const M=w.HapilMusic;M.update('title',null,true);const a=[...paused];assert.equal(a.length,0);
    doc.hidden=true;vis();assert(paused.length>0,'paused on hide');
    M.update('title',null,true);assert(paused.length>1,'stays paused while hidden');
    M.suspend(true);doc.hidden=false;const n=paused.length;M.update('title',null,true);assert(paused.length>n,'app background keeps it paused');
    assert.match(read('src/arcade-app-v43.js'),/Mobile\.tick\(state,mode,rawMs\)/);
  });
});

test('one music element switches to each boss without overlapping or silently playing another track',()=>{
  const made=[];let gesture=null;
  class Aud{constructor(src){this.src=src;this.paused=true;this.volume=0;this.muted=false;this.currentTime=5;made.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  const w={HapilArcade:A,document:{hidden:false,addEventListener:()=>{}},Audio:Aud,performance:{now:()=>0},addEventListener:(k,f)=>{if(k==='touchend')gesture=f;}};
  w.fetch=()=>Promise.resolve({ok:true,json:()=>({tracks:{title:{file:'title.mp3'},field:{file:'field.mp3'},boss:{file:'boss.mp3'},final:{file:'final.mp3'}}})});
  w.window=w;const ctx=vm.createContext(w);vm.runInContext(read('src/arcade-music-v43.js'),ctx);
  return new Promise(r=>setTimeout(r,10)).then(()=>{
    const M=w.HapilMusic;
    assert.equal(made.length,1);assert.equal(made[0].src,'media/bgm/title.mp3');assert.equal(made[0].preload,'auto');
    M.update('playing',{stage:'wave',stageIndex:2,boss:{present:false}},true);
    assert.equal(typeof gesture,'function','a finger lift can retry the current track');gesture();
    return new Promise(r=>setTimeout(r,10)).then(()=>{
      const player=made[0];assert.equal(player.src,'media/bgm/field.mp3');assert(!player.paused,'the road music keeps playing');
      assert.equal(made.length,1,'gesture unlock never creates or primes other music elements');
      M.update('playing',{stage:'intro',stageIndex:2,boss:{present:false}},true);
      assert.equal(player.src,'media/bgm/boss.mp3');assert(!player.paused,'boss track starts on the very frame the boss intro begins');
      assert.equal(player.currentTime,0,'from its opening bar');assert.equal(made.length,1);
      // 모든 보스(중간 보스 포함): 등장(intro)으로 바뀌는 바로 그 틱에 보스 곡을 고른다
      const s=A.createRun({difficulty:'gentle'});let intros=0;
      for(let t=0;t<200000&&s.stage!=='won';t++){s.player.invulnerableUntil=1e12;const was=s.stage;A.step(s,{dx:0,dy:0,shoot:true});
        if(s.stage==='intro'&&was!=='intro'){intros++;assert.notEqual(M.pick('playing',s),'field','stage '+s.stageIndex);}}
      assert(intros>=15,'saw every boss entrance ('+intros+')');
    });
  });
});
