/* 세로판 모바일 출시 도우미(11-15 "모바일 출시 준비" 스레드).
 * - 오류 기록: 잡히지 않은 오류를 기기에 최근 20개까지 남긴다(밖으로 보내지 않음).
 * - 플레이 기록: 스테이지별 시도·클리어·게임 오버·걸린 시간, 프레임 시간(평균·느린 5%)을 기기에 남긴다.
 * - 중간 저장: 스테이지 안 구간(잡몹 파도·보스 패턴)이 바뀔 때마다 체크포인트를 남겨, 앱이 꺼져도 그 구간부터 잇는다.
 * - 기기 진단: 위 내용을 글로 묶어 복사한다(사용자가 스레드에 붙여 넣는 용도).
 * - 앱 포장(Capacitor) 안에서는 안드로이드 뒤로가기 = 일시정지, 앱이 뒤로 가면 일시정지.
 * 게임 규칙은 건드리지 않는다. 저장이 막힌 브라우저에서도 조용히 넘어간다. */
(function(global){
  'use strict';
  var ERR_KEY='hapil-arcade-errors-v43',STATS_KEY='hapil-arcade-stats-v43',CP_KEY='hapil-arcade-checkpoint-v43';
  var ERR_MAX=20,CP_MAX_AGE=30*24*3600*1000,BUCKET_MS=2,BUCKETS=60;
  function load(key,fallback){try{var t=global.localStorage.getItem(key);var v=t?JSON.parse(t):null;return v&&typeof v==='object'?v:fallback;}catch(e){return fallback;}}
  function store(key,value){try{global.localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
  function clip(text,n){text=String(text==null?'':text);return text.length>n?text.slice(0,n)+'…':text;}

  /* ── 오류 기록 ── */
  var errors=load(ERR_KEY,[]);if(!Array.isArray(errors))errors=[];
  function logError(kind,message,where,stack){
    var last=errors[errors.length-1],msg=clip(message,240);
    if(last&&last.message===msg&&last.where===where){last.count=(last.count||1)+1;last.at=Date.now();}
    else{errors.push({kind:kind,message:msg,where:clip(where,160),stack:clip(stack,400),at:Date.now(),count:1});if(errors.length>ERR_MAX)errors.splice(0,errors.length-ERR_MAX);}
    store(ERR_KEY,errors);
  }
  if(global.addEventListener){
    global.addEventListener('error',function(e){
      if(e&&e.target&&e.target!==global&&(e.target.src||e.target.href)){logError('load','불러오기 실패',e.target.src||e.target.href,'');return;}
      logError('error',e&&e.message,(e&&e.filename?String(e.filename).replace(/^.*\//,''):'')+':'+(e&&e.lineno)+':'+(e&&e.colno),e&&e.error&&e.error.stack);
    },true);
    global.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;logError('promise',r&&r.message||r,'',r&&r.stack);});
  }

  /* ── 플레이 기록 ── */
  var stats=load(STATS_KEY,null);
  if(!stats||stats.v!==1)stats={v:1,since:Date.now(),stages:{},frames:{n:0,sum:0,hist:[]},playMs:0};
  if(!Array.isArray(stats.frames.hist))stats.frames.hist=[];
  var seen=null,seenStage=-1,seenResults=0,seenEnd='',stageMs=0,seenSeg=-1,savedClear=null,dirty=false,lastFlush=0;
  function stageRow(i,difficulty){var key=difficulty+':'+i;return stats.stages[key]||(stats.stages[key]={tries:0,clears:0,losses:0,ms:0,bestMs:0});}
  function flush(force){var now=Date.now();if(!dirty||(!force&&now-lastFlush<5000))return;lastFlush=now;dirty=false;store(STATS_KEY,stats);}

  /* ── 중간 저장 ── */
  function checkpointHero(id){
    var H=global.HapilArcadeHeroes,A=global.HapilArcade,p=H&&H.get?H.get(id):A&&A.heroProfile?A.heroProfile(id):null;
    return p&&typeof p.id==='string'?p.id:(id==='seoha'||id==='seoha-b'?id:'memory');
  }
  function readCheckpoint(){var c=load(CP_KEY,null);return c&&c.v===1?c:null;}
  function clearCheckpoint(){try{global.localStorage.removeItem(CP_KEY);}catch(e){}}
  function checkpointCount(value){return typeof value==='number'&&isFinite(value)&&value>=0?Math.min(2147483647,Math.floor(value)):0;}
  function storeCheckpoint(s,index){
    store(CP_KEY,{v:1,stage:s.stageIndex,seg:index,hero:checkpointHero(s.hero),difficulty:s.difficulty,at:Date.now(),hits:checkpointCount(s.hits-s.mark.hits),bombs:checkpointCount(s.bombsUsed-s.mark.bombs),exp:checkpointCount(s.exp),fills:checkpointCount(s.fills),stock:checkpointCount(s.bombs)});
  }
  // 격파 순간 앱도 호출한다. 2초의 화면 연출 중 나가도 쓰러뜨린 보스부터 다시 싸우지 않는다.
  function commitBossClear(s){
    if(!s||s.stage!=='bossClear'||!s.bossClear)return false;
    if(s.bossOnly||savedClear===s.bossClear)return true;
    savedClear=s.bossClear;
    var A=global.HapilArcade,index=s.bossClear.nextSegment;
    if(!Number.isInteger(index)&&A&&A.nextSegmentIndex)index=A.nextSegmentIndex(s);
    var next=A&&A.SEGMENTS[index];
    if(!s.bossClear.stageCommitted&&next&&next.stage===s.stageIndex)storeCheckpoint(s,index);
    else clearCheckpoint();
    return true;
  }
  /* stage(이어할 스테이지)와 난이도가 맞고, 그 스테이지 안의 구간이며, 30일 안에 남긴 것만 쓴다. */
  function checkpoint(stage,difficulty){
    var c=readCheckpoint(),A=global.HapilArcade;if(!c||!A)return null;
    if(!Number.isInteger(stage)||!A.STAGES[stage]||!Number.isInteger(c.stage)||!Number.isInteger(c.seg)||typeof c.at!=='number'||!isFinite(c.at))return null;
    var seg=A.SEGMENTS[c.seg];
    var age=Date.now()-c.at;
    if(c.stage!==stage||c.difficulty!==difficulty||!seg||seg.stage!==stage||age<0||age>=CP_MAX_AGE)return null;
    if(A.STAGES[stage]&&A.STAGES[stage].first===c.seg)return null; // 스테이지 첫 구간이면 처음부터와 같다
    c.hero=checkpointHero(c.hero);['hits','bombs','exp','fills'].forEach(function(k){c[k]=checkpointCount(c[k]);});if(c.stock!==undefined)c.stock=checkpointCount(c.stock);return c; // stock: 남은 필살기(11-20 격파 보상). 옛 저장에는 없다
  }

  /* 앱이 매 프레임 부른다. s: 지금 판, mode: 화면 상태, ms: 지난 프레임 시간. */
  function tick(s,mode,ms){
    if(mode!=='playing'||!s)return;
    if(ms>0&&ms<1000){var b=Math.min(BUCKETS-1,Math.floor(ms/BUCKET_MS));stats.frames.hist[b]=(stats.frames.hist[b]||0)+1;stats.frames.n++;stats.frames.sum+=ms;stats.playMs+=ms;stageMs+=ms;dirty=true;} // 스테이지 시간은 실제로 그린 프레임만 더한다(일시정지·백그라운드 시간 제외)
    if(s!==seen){seen=s;seenStage=-1;seenResults=s.results.length;seenEnd='';seenSeg=-1;}
    if(s.results.length>seenResults){ // 스테이지를 깼다
      seenResults=s.results.length;var r=s.results[s.results.length-1],row=stageRow(r.stage!=null?r.stage:s.stageIndex,s.difficulty),took=Math.round(stageMs);
      if(!s.bossOnly){row.clears++;row.ms+=took;row.bestMs=row.bestMs?Math.min(row.bestMs,took):took;clearCheckpoint();}dirty=true;flush(true);
    }
    // 깬 스테이지 시간을 먼저 적은 뒤(엔진이 결과와 다음 스테이지 번호를 한 프레임에 바꾼다) 새 스테이지 시계를 잰다.
    if(s.stageIndex!==seenStage){seenStage=s.stageIndex;stageMs=0;if(!s.bossOnly)stageRow(s.stageIndex,s.difficulty).tries++;dirty=true;}
    if((s.stage==='lost'||s.stage==='won')&&seenEnd!==s.stage){seenEnd=s.stage;if(s.stage==='lost'&&!s.bossOnly){var lr=stageRow(s.stageIndex,s.difficulty);lr.losses++;lr.ms+=Math.round(stageMs);}if(!s.bossOnly)clearCheckpoint();dirty=true;flush(true);return;}
    if(commitBossClear(s)){flush(false);return;} // 화면에 남은 이전 seg를 다시 저장하지 않는다.
    if(!s.bossOnly&&s.started&&s.seg!==seenSeg&&s.stage!=='lost'&&s.stage!=='won'){
      seenSeg=s.seg;var A=global.HapilArcade,seg=A&&A.SEGMENTS[s.seg];
      if(seg&&seg.stage===s.stageIndex)storeCheckpoint(s,s.seg); // 영웅·성장과 이 스테이지의 피격·폭탄을 보존한다.
    }
    flush(false);
  }

  /* ── 기기 진단 ── */
  function percentile(hist,n,q){var want=n*q,acc=0;for(var i=0;i<hist.length;i++){acc+=hist[i]||0;if(acc>=want)return (i+1)*BUCKET_MS;}return BUCKETS*BUCKET_MS;}
  function report(){
    var nav=global.navigator||{},scr=global.screen||{},app=global.HapilArcadeApp&&global.HapilArcadeApp.getState?global.HapilArcadeApp.getState():{},f=stats.frames,lines=[];
    flush(true);
    lines.push('[합일 세로판 기기 진단] '+new Date().toISOString());
    lines.push('기기: '+clip(nav.userAgent,220));
    lines.push('화면: '+(scr.width|0)+'x'+(scr.height|0)+' 창 '+(global.innerWidth|0)+'x'+(global.innerHeight|0)+' 배율 '+(global.devicePixelRatio||1)+' 코어 '+(nav.hardwareConcurrency||'?')+' 메모리 '+(nav.deviceMemory||'?')+'GB');
    lines.push('앱: '+(isNative()?'앱('+nativePlatform()+')':'웹')+' 휴대폰모드 '+!!app.compact+' 화질배율 '+app.scale+' 저사양 '+!!app.lite+' 저장 '+(app.saveOk!==false?'됨':'안 됨'));
    if(f.n){lines.push('프레임: '+f.n+'개 평균 '+(f.sum/f.n).toFixed(1)+'ms 중앙 '+percentile(f.hist,f.n,.5)+'ms 느린5% '+percentile(f.hist,f.n,.95)+'ms 느린1% '+percentile(f.hist,f.n,.99)+'ms');}
    lines.push('플레이 '+Math.round(stats.playMs/60000)+'분 (기록 시작 '+new Date(stats.since).toISOString().slice(0,10)+')');
    var keys=Object.keys(stats.stages).sort(function(a,b){var x=a.split(':'),y=b.split(':');return x[0]<y[0]?-1:x[0]>y[0]?1:x[1]-y[1];});
    if(keys.length){lines.push('스테이지(난이도:번호 시도/클리어/게임오버 누적분 최단초):');keys.forEach(function(k){var r=stats.stages[k],p=k.split(':');lines.push(' '+p[0]+':'+(Number(p[1])+1)+' '+r.tries+'/'+r.clears+'/'+r.losses+' '+(r.ms/60000).toFixed(1)+' '+(r.bestMs?Math.round(r.bestMs/1000):'-'));});}
    var cp=readCheckpoint();if(cp)lines.push('중간 저장: STAGE '+(cp.stage+1)+' 구간 '+cp.seg+' '+cp.difficulty);
    if(errors.length){lines.push('오류 '+errors.length+'건:');errors.forEach(function(e){lines.push(' '+new Date(e.at).toISOString().slice(5,16)+' ['+e.kind+'] '+e.message+(e.where?' @'+e.where:'')+(e.count>1?' ×'+e.count:''));});}
    else lines.push('오류 없음');
    return lines.join('\n');
  }
  function copyReport(done){
    var text=report(),ok=function(){if(done)done(true,text);},fail=function(){if(done)done(false,text);};
    try{if(global.navigator.clipboard&&global.navigator.clipboard.writeText){global.navigator.clipboard.writeText(text).then(ok,function(){fallbackCopy(text)?ok():fail();});return text;}}catch(e){}
    if(fallbackCopy(text))ok();else fail();return text;
  }
  function fallbackCopy(text){try{var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();var ok=document.execCommand('copy');t.remove();return !!ok;}catch(e){return false;}}

  /* ── 앱(Capacitor) 연결 ── */
  function isNative(){var C=global.Capacitor;return !!(C&&C.isNativePlatform&&C.isNativePlatform());}
  function nativePlatform(){var C=global.Capacitor;return C&&C.getPlatform?C.getPlatform():'';}
  function bindNative(){
    if(!isNative())return;var P=global.Capacitor.Plugins||{},App=P.App;if(!App||!App.addListener)return;
    App.addListener('backButton',function(){var a=global.HapilArcadeApp;var st=a&&a.getState?a.getState():{};
      if(st.mode==='playing'&&a.pause)a.pause();else if(st.mode==='title'){if(App.minimizeApp)App.minimizeApp();}else if(a.back)a.back();});
    App.addListener('appStateChange',function(e){var a=global.HapilArcadeApp,mu=global.HapilMusic;if(mu&&mu.suspend)mu.suspend(!(e&&e.isActive));if(e&&!e.isActive){flush(true);if(a&&a.pause)a.pause();}});
  }
  if(global.document&&document.readyState!=='loading')setTimeout(bindNative,0);else if(global.addEventListener)global.addEventListener('DOMContentLoaded',bindNative);
  if(global.addEventListener)global.addEventListener('pagehide',function(){flush(true);});

  global.HapilMobile={tick:tick,checkpoint:checkpoint,clearCheckpoint:clearCheckpoint,commitBossClear:commitBossClear,report:report,copyReport:copyReport,logError:logError,isNative:isNative,
    _stats:function(){return stats;},_errors:function(){return errors;}};
})(typeof window!=='undefined'?window:globalThis);
