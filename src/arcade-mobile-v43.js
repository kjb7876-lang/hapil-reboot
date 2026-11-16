/* 세로판 모바일 출시 도우미(11-15 "모바일 출시 준비" 스레드).
 * - 오류 기록: 잡히지 않은 오류를 기기에 최근 20개까지 남긴다(밖으로 보내지 않음).
 * - 플레이 기록: 스테이지별 시도·클리어·게임 오버·걸린 시간, 프레임 시간(평균·느린 5%)을 기기에 남긴다.
 * - 중간 저장: 스테이지 안 구간(잡몹 파도·보스 패턴)이 바뀔 때마다 체크포인트를 남겨, 앱이 꺼져도 그 구간부터 잇는다.
 * - 기기 진단: 위 내용을 글로 묶어 복사한다(사용자가 스레드에 붙여 넣는 용도).
 * - 앱 포장(Capacitor) 안에서는 안드로이드 뒤로가기 = 일시정지, 앱이 뒤로 가면 일시정지.
 * 게임 규칙은 건드리지 않는다. 저장이 막힌 브라우저에서도 조용히 넘어간다. */
(function(global){
  'use strict';
  var Safe=global.HapilSave||null;
  var ERR_KEY='hapil-arcade-errors-v43',STATS_KEY='hapil-arcade-stats-v43',CP_KEY='hapil-arcade-checkpoint-v43';
  var ERR_MAX=20,CP_MAX_AGE=30*24*3600*1000,BUCKET_MS=2,BUCKETS=60;
  function load(key,fallback){try{var t=global.localStorage.getItem(key);var v=t?JSON.parse(t):null;return v&&typeof v==='object'?v:fallback;}catch(e){return fallback;}}
  function store(key,value){try{global.localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
  function clip(text,n){text=String(text==null?'':text);return text.length>n?text.slice(0,n)+'…':text;}

  /* ── 오류 기록 ── */
  var errors=load(ERR_KEY,[]);if(!Array.isArray(errors))errors=[];
  errors=errors.filter(function(e){return e&&typeof e==='object'&&typeof e.at==='number'&&isFinite(e.at)&&e.at>=0&&e.at<=Date.now();}).slice(-ERR_MAX).map(function(e){return {kind:clip(e.kind,30),message:clip(e.message,240),where:clip(e.where,160),stack:clip(e.stack,400),at:e.at,count:counter(e.count)||1};});
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
  function record(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
  function counter(v){return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:0;}
  function freshStats(){return {v:1,since:Date.now(),stages:{},frames:{n:0,sum:0,hist:[]},playMs:0};}
  function cleanStats(raw){
    var out=freshStats();if(!record(raw)||raw.v!==1)return out;
    if(typeof raw.since==='number'&&raw.since>0&&raw.since<=Date.now())out.since=raw.since;
    out.playMs=typeof raw.playMs==='number'&&isFinite(raw.playMs)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,raw.playMs)):0;var f=record(raw.frames)?raw.frames:{},hist=Array.isArray(f.hist)?f.hist:[];
    for(var i=0;i<BUCKETS;i++){var n=counter(hist[i]);out.frames.hist[i]=n;out.frames.n+=n;}
    if(!Number.isSafeInteger(out.frames.n))out.frames={n:0,sum:0,hist:[]};
    out.frames.sum=typeof f.sum==='number'&&isFinite(f.sum)?Math.max(0,Math.min(f.sum,out.frames.n*1000)):0;
    if(record(raw.stages))Object.keys(raw.stages).forEach(function(k){
      var m=/^(gentle|normal|hell):(\d+)$/.exec(k),r=raw.stages[k],A=global.HapilArcade;
      if(!m||!A||!A.STAGES[+m[2]]||!record(r))return;
      out.stages[k]={tries:counter(r.tries),clears:counter(r.clears),losses:counter(r.losses),ms:counter(r.ms),bestMs:counter(r.bestMs)};
    });return out;
  }
  var rawStats=load(STATS_KEY,null),stats=cleanStats(rawStats),statsReadOnly=record(rawStats)&&rawStats.v!==1;
  var seen=null,seenStage=-1,seenResults=0,seenEnd='',stageMs=0,seenSeg=-1,dirty=false,lastFlush=0,cpRetryAt=0;
  function stageRow(i,difficulty){var key=difficulty+':'+i;return stats.stages[key]||(stats.stages[key]={tries:0,clears:0,losses:0,ms:0,bestMs:0});}
  function flush(force){var now=Date.now();if(!dirty||(!force&&now-lastFlush<5000))return;lastFlush=now;if(statsReadOnly)return;dirty=!store(STATS_KEY,stats);}

  /* ── 중간 저장 ── */
  function checkpointValue(c){
    var A=global.HapilArcade;if(!record(c)||c.v!==1||!A)return null;
    var integer=function(v){return typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=2147483647;};
    if(!integer(c.stage)||!integer(c.seg)||!A.STAGES[c.stage]||!A.SEGMENTS[c.seg]||A.SEGMENTS[c.seg].stage!==c.stage||!Object.prototype.hasOwnProperty.call(A.DIFFICULTY,c.difficulty))return null;
    if(typeof c.at!=='number'||!isFinite(c.at)||c.at<0||c.at>Date.now())return null;
    var out={v:1,stage:c.stage,seg:c.seg,difficulty:c.difficulty,at:c.at};
    for(var i=0,keys=['hits','bombs','exp','fills'];i<keys.length;i++){var k=keys[i];if(c[k]===undefined&&(k==='exp'||k==='fills'))continue;var v=c[k]===undefined?0:c[k];if(!integer(v))return null;out[k]=v;}
    return out;
  }
  var CP_SPEC={versionKey:'v',version:1,validate:checkpointValue};
  function readCheckpoint(){return Safe?Safe.read(CP_KEY,CP_SPEC,null):checkpointValue(load(CP_KEY,null));}
  function clearCheckpoint(){if(Safe)return Safe.remove(CP_KEY,CP_SPEC);try{global.localStorage.removeItem(CP_KEY);return true;}catch(e){return false;}}
  /* 구간 재시작: 체력/점수/탄막을 동결하는 저장이 아니다. */
  function checkpoint(stage,difficulty){
    var c=readCheckpoint(),A=global.HapilArcade;if(!c||!A)return null;
    if(c.stage!==stage||c.difficulty!==difficulty||Date.now()-c.at>=CP_MAX_AGE)return null;
    // 첫 구간도 이전 스테이지에서 얻은 성장·누적 피격 기록을 복원해야 한다.
    return c;
  }

  /* 앱이 매 프레임 부른다. s: 지금 판, mode: 화면 상태, ms: 지난 프레임 시간. */
  function tick(s,mode,ms){
    if(mode!=='playing'||!s)return;
    if(s!==seen){seen=s;seenStage=-1;seenResults=s.results.length;seenEnd='';seenSeg=-1;stageMs=0;}
    if(s.stage!=='clear'&&ms>0&&ms<1000){var b=Math.min(BUCKETS-1,Math.floor(ms/BUCKET_MS));stats.frames.hist[b]=(stats.frames.hist[b]||0)+1;stats.frames.n++;stats.frames.sum+=ms;stats.playMs+=ms;stageMs+=ms;dirty=true;} // 스테이지 시간은 실제로 그린 프레임만 더한다(일시정지·백그라운드 시간 제외)
    var now=Date.now();
    if(s.results.length>seenResults){ // 스테이지를 깼다
      seenResults=s.results.length;var r=s.results[s.results.length-1],row=stageRow(r.stage!=null?r.stage:s.stageIndex,s.difficulty),took=Math.round(stageMs);
      if(!s.bossOnly){row.clears++;row.ms+=took;row.bestMs=row.bestMs?Math.min(row.bestMs,took):took;if(!Safe||Safe.status().ok)clearCheckpoint();}dirty=true;flush(true);
    }
    // 깬 스테이지 시간을 먼저 적은 뒤(엔진이 결과와 다음 스테이지 번호를 한 프레임에 바꾼다) 새 스테이지 시계를 잰다.
    if(s.stageIndex!==seenStage){seenStage=s.stageIndex;stageMs=0;if(!s.bossOnly)stageRow(s.stageIndex,s.difficulty).tries++;dirty=true;}
    if((s.stage==='lost'||s.stage==='won')&&seenEnd!==s.stage){seenEnd=s.stage;if(s.stage==='lost'&&!s.bossOnly){var lr=stageRow(s.stageIndex,s.difficulty);lr.losses++;lr.ms+=Math.round(stageMs);}if(!s.bossOnly&&(!Safe||Safe.status().ok))clearCheckpoint();dirty=true;flush(true);return;}
    if(now>=cpRetryAt&&!s.bossOnly&&s.started&&s.seg!==seenSeg&&s.stage!=='lost'&&s.stage!=='won'&&s.stage!=='clear'){
      var A=global.HapilArcade,seg=A&&A.SEGMENTS[s.seg];
      if(seg&&seg.stage===s.stageIndex){var cp={v:1,stage:s.stageIndex,seg:s.seg,difficulty:s.difficulty,at:now,hits:s.hits-s.mark.hits,bombs:s.bombsUsed-s.mark.bombs,exp:s.exp|0,fills:s.fills|0};if(Safe?Safe.write(CP_KEY,cp,CP_SPEC):store(CP_KEY,cp)){seenSeg=s.seg;cpRetryAt=0;}else cpRetryAt=now+1000;} // 별 계산용으로 이 스테이지에서 맞은 수·폭탄 수도 남긴다
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

  global.HapilMobile={tick:tick,checkpoint:checkpoint,clearCheckpoint:clearCheckpoint,report:report,copyReport:copyReport,logError:logError,isNative:isNative,
    _stats:function(){return stats;},_errors:function(){return errors;}};
})(typeof window!=='undefined'?window:globalThis);
