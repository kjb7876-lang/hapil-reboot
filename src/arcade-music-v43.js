/* 세로판 배경음악: 구간별 곡을 1초 겹쳐 바꾼다.
 * 목록이 없으면 media/music.mp3을 사용한다. 음량은 곡의 믹스 × 사용자 음량.
 * 재생·잠금 해제의 비동기 완료가 일시정지/음소거 뒤 소리를 되살리지 않게 관리한다. */
(function(global){
  'use strict';
  var DIR='media/bgm/',FADE_MS=1000,LEGACY={field:{file:'../music.mp3',volume:.2},boss:{file:'../music.mp3',volume:.2},final:{file:'../music.mp3',volume:.2}};
  var tracks=null,players={},current='',fadeFrom=null,fadeVol=0,fadeAt=0,ready=false,away=false,pageAway=false,live=false,enabled=true,volume=1;
  function now(){return global.performance?global.performance.now():Date.now();}
  function hidden(){return pageAway||!!(global.document&&global.document.hidden);}
  function clamp(value,fallback){var n=Number(value);return value===undefined||value===null||!isFinite(n)?fallback:Math.max(0,Math.min(1,n));}
  function load(){
    try{global.fetch(DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(j){tracks=j&&j.tracks&&typeof j.tracks==='object'?j.tracks:LEGACY;warm();},function(){tracks=LEGACY;warm();});}
    catch(e){tracks=LEGACY;warm();}
  }
  function warm(){ready=true;for(var k in tracks)player(k);}
  function player(key){
    var t=tracks&&tracks[key];if(!t||typeof t.file!=='string'||!t.file)return null;var src=DIR+t.file;
    for(var k in players)if(players[k].src===src)return players[k].a; // 같은 파일을 쓰는 구간은 이어 재생
    try{
      var a=new global.Audio(src),p={a:a,src:src,unlocked:false,pending:false,priming:false,generation:0,lastTry:-Infinity,failed:false};
      a.loop=true;a.preload='auto';a.volume=0;players[key]=p;
      if(a.addEventListener)a.addEventListener('error',function(){p.failed=true;p.pending=false;p.priming=false;a.muted=false;a.pause();});
      return a;
    }catch(e){return null;}
  }
  function entry(a){for(var k in players)if(players[k].a===a)return players[k];return null;}
  function target(key){var t=tracks&&tracks[key];return t?clamp(t.volume,.2)*volume:0;}
  function wanted(a){return !!a&&live&&enabled&&volume>0&&!away&&!hidden()&&(a===(current?player(current):null)||a===fadeFrom);}
  function play(a,prime){
    var p=entry(a);if(!p||p.failed||p.pending)return;
    p.pending=true;p.priming=!!prime;p.lastTry=now();var token=++p.generation;
    if(prime)a.muted=true;
    function done(ok,error){
      if(token!==p.generation){if(!wanted(a)&&!p.pending)a.pause();return;}
      p.pending=false;p.priming=false;a.muted=false;
      if(ok)p.unlocked=true;
      else if(error&&error.name==='NotSupportedError')p.failed=true;
      if(!ok||!wanted(a))a.pause();
    }
    try{var result=a.play();if(result&&result.then)result.then(function(){done(true);},function(e){done(false,e);});else done(true);}
    catch(e){done(false,e);}
  }
  function pauseAll(){
    for(var k in players){var p=players[k];p.generation++;p.pending=false;p.priming=false;p.a.pause();p.a.muted=false;}
  }
  /* 첫 사용자 동작에서 모든 곡을 무음으로 풀어 두어 보스 등장 때 새 터치를 요구하지 않는다. */
  function unlock(){
    if(!ready||!enabled||volume===0||away||hidden())return;
    for(var k in players){var p=players[k];if(wanted(p.a)){if(p.a.paused||!p.unlocked)play(p.a,false);}else if(!p.unlocked)play(p.a,true);}
  }
  try{if(global.addEventListener)['pointerdown','touchstart','touchend','click','keydown'].forEach(function(t){global.addEventListener(t,unlock,{capture:true,passive:true});});}catch(e){}
  function pick(mode,s){
    if(mode==='paused')return current;
    if(mode!=='playing')return 'title';
    if(!s)return 'field';
    if(s.stage==='won'||s.stage==='lost')return 'title'; // 결과 연출 동안 도중 곡을 잠깐 끼워 넣지 않는다
    var A=global.HapilArcade,last=A?A.STAGES.length-1:-1,bossy=s.stage==='card'||s.stage==='intro'||(s.stage==='break'&&s.boss&&s.boss.present);
    if(bossy)return s.stageIndex===last&&tracks&&tracks.final?'final':'boss';
    return 'field';
  }
  function mix(time){
    var a=current?player(current):null,k=Math.max(0,Math.min(1,(time-fadeAt)/FADE_MS));
    if(a)a.volume=target(current)*(fadeFrom&&fadeFrom!==a?k:1);
    if(fadeFrom){fadeFrom.volume=Math.max(0,(1-k)*fadeVol);if(k>=1){fadeFrom.pause();fadeFrom=null;}}
  }
  function update(mode,s,soundOn){
    if(typeof soundOn==='boolean')enabled=soundOn;
    if(!ready)return;
    var time=now(),wasLive=live,want=pick(mode,s);
    live=enabled&&volume>0&&mode!=='paused'&&!away&&!hidden();
    if(!live){pauseAll();fadeFrom=null;return;}
    var a=want?player(want):null,cur=current?player(current):null;
    if(want!==current){
      if(cur&&cur!==a){if(fadeFrom&&fadeFrom!==a)fadeFrom.pause();fadeFrom=cur;fadeVol=cur.volume;fadeAt=time;}
      current=want;
      if(a&&a!==cur){a.volume=0;if(want==='boss'||want==='final')try{a.currentTime=0;}catch(e){}play(a,false);}
    }
    var p=entry(a);
    // 일시정지·음소거 복귀는 즉시 재개. 자동재생 거절만 간격을 두고 재시도한다.
    if(a&&a.paused&&p&&(!wasLive||time-p.lastTry>=1000))play(a,false);
    mix(time);
    if(!a)for(var k in players)if(players[k].a!==fadeFrom)players[k].a.pause();
  }
  function suspend(on){away=!!on;if(away){live=false;pauseAll();fadeFrom=null;}}
  function setEnabled(on){enabled=!!on;if(!enabled){live=false;pauseAll();fadeFrom=null;}}
  function setVolume(value){
    volume=clamp(value,volume);
    if(volume===0){live=false;pauseAll();fadeFrom=null;}
    else if(live){if(fadeFrom){fadeFrom.pause();fadeFrom=null;}mix(now());}
  }
  try{
    if(global.document&&global.document.addEventListener)global.document.addEventListener('visibilitychange',function(){if(hidden()){live=false;pauseAll();fadeFrom=null;}});
    if(global.addEventListener){global.addEventListener('pagehide',function(){pageAway=true;live=false;pauseAll();fadeFrom=null;});global.addEventListener('pageshow',function(){pageAway=false;});}
  }catch(e){}
  load();
  global.HapilMusic={update:update,pick:pick,suspend:suspend,unlock:unlock,setEnabled:setEnabled,setVolume:setVolume,_players:function(){return players;},_tracks:function(){return tracks;},stats:function(){return {enabled:enabled,volume:volume,current:current,live:live};}};
})(typeof window!=='undefined'?window:globalThis);
