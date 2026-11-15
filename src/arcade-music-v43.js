/* 세로판 배경음악: 구간별 곡(시작 화면 · 도중 · 보스전 · 마지막 보스)을 1초 겹쳐 바꾼다(11-15 "무료 동양풍 브금").
 * 곡 목록은 media/bgm/index.json {"tracks":{"title":{"file":"title.mp3","volume":.22},"field":…,"boss":…,"final":…}}.
 * 목록이 없거나 못 읽으면 예전처럼 media/music.mp3 한 곡을 플레이 중에만 튼다(없는 곡은 그 구간만 조용).
 * 앱이 매 프레임 update(mode, state, soundOn)를 부른다. 브라우저 자동 재생 제한 때문에 첫 터치 전에는 소리가 안 날 수 있다. */
(function(global){
  'use strict';
  var DIR='media/bgm/',FADE_MS=1000,LEGACY={field:{file:'../music.mp3',volume:.2},boss:{file:'../music.mp3',volume:.2},final:{file:'../music.mp3',volume:.2}};
  var tracks=null,players={},current='',fadeFrom=null,fadeVol=0,fadeAt=0,ready=false,lastTry=0,away=false;
  function load(){
    try{global.fetch(DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(j){tracks=j&&j.tracks&&typeof j.tracks==='object'?j.tracks:LEGACY;ready=true;},function(){tracks=LEGACY;ready=true;});}
    catch(e){tracks=LEGACY;ready=true;}
  }
  function player(key){
    var t=tracks&&tracks[key];if(!t||!t.file)return null;var src=DIR+t.file;
    for(var k in players)if(players[k].src===src&&k!==key)return players[k].a; // 같은 파일이면 같은 소리를 이어 쓴다
    if(!players[key]){try{var a=new Audio(src);a.loop=true;a.preload='auto';a.volume=0;players[key]={a:a,src:src,vol:Math.max(0,Math.min(1,Number(t.volume)||.2))};}catch(e){return null;}}
    return players[key].a;
  }
  function target(key){var t=tracks&&tracks[key];return t?Math.max(0,Math.min(1,Number(t.volume)||.2)):0;}
  /* 지금 화면에 맞는 곡 이름. 일시정지는 지금 곡을 멈춰 두고, 결과 화면은 시작 화면 곡. */
  function pick(mode,s){
    if(mode==='paused')return current;
    if(mode!=='playing')return 'title';
    if(!s)return 'field';
    var A=global.HapilArcade,last=A?A.STAGES.length-1:-1,bossy=s.stage==='card'||s.stage==='intro'||(s.stage==='break'&&s.boss&&s.boss.present);
    if(bossy)return s.stageIndex===last&&tracks&&tracks.final?'final':'boss';
    return 'field';
  }
  function play(a){if(!a)return;try{var p=a.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function update(mode,s,soundOn){
    if(!ready)return;var now=global.performance?global.performance.now():Date.now();
    var want=soundOn?pick(mode,s):'',a=want?player(want):null,cur=current?player(current):null;
    if(mode==='paused'||!soundOn||away||(global.document&&global.document.hidden)){for(var k in players)players[k].a.pause();return;} // 화면이 가려지면(탭 전환·앱 백그라운드) 시작 화면 곡도 멈춘다
    if(want!==current){if(cur&&cur!==a){if(fadeFrom&&fadeFrom!==a)fadeFrom.pause();fadeFrom=cur;fadeVol=cur.volume;fadeAt=now;}current=want;if(a&&a!==cur){a.volume=0;play(a);lastTry=now;}}
    if(a&&a.paused&&now-lastTry>1000){lastTry=now;play(a);} // 첫 터치 전 자동 재생이 막히면 1초마다 다시 시도
    var k2=Math.min(1,(now-fadeAt)/FADE_MS);
    if(a)a.volume=target(want)*(fadeFrom&&fadeFrom!==a?k2:1);
    if(fadeFrom){fadeFrom.volume=Math.max(0,(1-k2)*fadeVol);if(k2>=1){fadeFrom.pause();fadeFrom=null;}}
    if(!a)for(var k3 in players)if(players[k3].a!==fadeFrom)players[k3].a.pause();
  }
  /* 앱이 뒤로 가면 프레임이 멈춰 update가 안 불리므로 그 순간 바로 멈춘다. */
  function suspend(on){away=!!on;if(away)for(var k in players)players[k].a.pause();}
  try{if(global.document&&global.document.addEventListener)global.document.addEventListener('visibilitychange',function(){suspend(global.document.hidden);});}catch(e){}
  load();
  global.HapilMusic={update:update,pick:pick,suspend:suspend,_tracks:function(){return tracks;}};
})(typeof window!=='undefined'?window:globalThis);
