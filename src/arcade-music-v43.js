/* 세로판 배경음악: HTMLAudioElement 하나만 사용하며, 곡은 정지 후 교체한다.
 * 목록이 없으면 media/music.mp3을 사용한다. 음량은 곡의 믹스 × 사용자 음량.
 * 이전 play()의 늦은 완료가 현재 곡·일시정지·음소거 상태를 바꾸지 않게 관리한다. */
(function(global){
  'use strict';
  if(global.HapilMusic&&global.HapilMusic.singlePlayer===true)return;
  var DIR='media/bgm/',LEGACY={field:{file:'../music.mp3',volume:.2},boss:{file:'../music.mp3',volume:.2},final:{file:'../music.mp3',volume:.2}};
  var tracks=null,players={},main=null,current='',ready=false,away=false,pageAway=false,live=false,enabled=true,volume=1;
  var positions=Object.create(null),failedSources=Object.create(null),lastMode='title',lastState=null,hasUpdate=false;
  function now(){return global.performance?global.performance.now():Date.now();}
  function hidden(){return pageAway||!!(global.document&&global.document.hidden);}
  function clamp(value,fallback){var n=Number(value);return value===undefined||value===null||!isFinite(n)?fallback:Math.max(0,Math.min(1,n));}
  function track(key){return tracks&&Object.prototype.hasOwnProperty.call(tracks,key)?tracks[key]:null;}
  function source(key){var t=track(key);return t&&typeof t.file==='string'&&t.file?DIR+t.file:'';}
  function target(key){var t=track(key);return t?clamp(t.volume,.2)*volume:0;}
  function load(){
    try{global.fetch(DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(j){tracks=j&&j.tracks&&typeof j.tracks==='object'?j.tracks:LEGACY;warm();},function(){tracks=LEGACY;warm();});}
    catch(e){tracks=LEGACY;warm();}
  }
  function warm(){
    ready=true;var keys=Object.keys(tracks),first=source('title')?'title':keys.find(function(k){return source(k);});
    if(first)ensure(source(first));
    if(hasUpdate)update(lastMode,lastState);
  }
  function wanted(){return !!main&&live&&enabled&&volume>0&&!away&&!hidden()&&target(current)>0&&source(current)===main.src;}
  function pauseAll(){
    if(!main)return;main.generation++;main.pending=false;main.a.pause();main.a.muted=false;main.a.volume=0;
  }
  function seek(){if(main&&main.seek!==null)try{main.a.currentTime=main.seek;main.seek=null;}catch(e){}}
  function ensure(src){
    if(main)return main;
    try{
      var a=new global.Audio(src),p={a:a,src:src,pending:false,generation:0,lastTry:-Infinity,failed:false,seek:null};
      a.loop=true;a.preload='auto';a.volume=0;main=p;players.main=p;
      if(a.addEventListener){
        a.addEventListener('loadedmetadata',seek);
        a.addEventListener('error',function(){if(!a.error)return;failedSources[p.src]=true;p.failed=true;pauseAll();});
      }
      return p;
    }catch(e){return null;}
  }
  function select(key){
    var src=source(key);if(!src){pauseAll();return false;}
    var p=ensure(src);if(!p)return false;if(p.src===src)return false;
    var time=Number(p.a.currentTime);if(isFinite(time)&&time>=0)positions[p.src]=time;
    // One physical player: cancel the old request before changing its source.
    pauseAll();p.src=src;p.a.src=src;p.lastTry=-Infinity;p.failed=!!failedSources[src];
    p.seek=key==='boss'||key==='final'?0:positions[src]||0;seek();return true;
  }
  function play(){
    var p=main;if(!p||!wanted()||p.failed||p.pending||!p.a.paused)return;
    p.pending=true;p.lastTry=now();var token=++p.generation,src=p.src;p.a.muted=false;p.a.volume=target(current);seek();
    function done(ok,error){
      if(token!==p.generation||src!==p.src){if(!wanted())pauseAll();return;}
      p.pending=false;
      if(!ok&&error&&error.name==='NotSupportedError'){failedSources[src]=true;p.failed=true;}
      if(!ok||!wanted()){p.a.pause();p.a.volume=0;}else p.a.volume=target(current);
    }
    try{var result=p.a.play();if(result&&result.then)result.then(function(){done(true);},function(e){done(false,e);});else done(true);}
    catch(e){done(false,e);}
  }
  // A gesture retries only the selected track. Muted pre-playing of other songs is never used.
  function unlock(){if(ready&&wanted())play();}
  try{if(global.addEventListener)['pointerdown','touchstart','touchend','click','keydown'].forEach(function(t){global.addEventListener(t,unlock,{capture:true,passive:true});});}catch(e){}
  function pick(mode,s){
    if(mode==='paused')return current;
    if(mode!=='playing')return 'title';
    if(!s)return 'field';
    if(s.stage==='won'||s.stage==='lost')return 'title';
    var A=global.HapilArcade,last=A?A.STAGES.length-1:-1,bossy=s.stage==='card'||s.stage==='intro'||s.stage==='bossClear'||(s.stage==='break'&&s.boss&&s.boss.present);
    if(bossy)return s.stageIndex===last&&tracks&&tracks.final?'final':'boss';
    return 'field';
  }
  function update(mode,s,soundOn){
    lastMode=mode;lastState=s;hasUpdate=true;if(typeof soundOn==='boolean')enabled=soundOn;
    if(!ready)return;
    var wasLive=live,want=pick(mode,s);current=want;var changed=select(want);
    live=enabled&&volume>0&&target(want)>0&&!!source(want)&&mode!=='paused'&&!away&&!hidden();
    if(!live){pauseAll();return;}
    if(!main)return;main.a.volume=target(current);seek();
    // Only rejected autoplay attempts are throttled; a real resume starts immediately.
    if(changed||!wasLive||now()-main.lastTry>=1000)play();
  }
  function suspend(on){away=!!on;if(away){live=false;pauseAll();}}
  function setEnabled(on){enabled=!!on;if(!enabled){live=false;pauseAll();}}
  function setVolume(value){volume=clamp(value,volume);if(volume===0){live=false;pauseAll();}else if(live&&main)main.a.volume=target(current);}
  try{
    if(global.document&&global.document.addEventListener)global.document.addEventListener('visibilitychange',function(){if(hidden()){live=false;pauseAll();}});
    if(global.addEventListener){global.addEventListener('pagehide',function(){pageAway=true;live=false;pauseAll();});global.addEventListener('pageshow',function(){pageAway=false;});}
  }catch(e){}
  load();
  global.HapilMusic={singlePlayer:true,update:update,pick:pick,suspend:suspend,unlock:unlock,setEnabled:setEnabled,setVolume:setVolume,_players:function(){return players;},_tracks:function(){return tracks;},stats:function(){return {enabled:enabled,volume:volume,current:current,live:live};}};
})(typeof window!=='undefined'?window:globalThis);
