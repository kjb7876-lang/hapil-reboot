/* 세로판 배경음악: 구간별 곡(시작 화면 · 도중 · 보스전 · 마지막 보스)을 1초 겹쳐 바꾼다(11-15 "무료 동양풍 브금").
 * 곡 목록은 media/bgm/index.json {"tracks":{"title":{"file":"title.mp3","volume":.22},"field":…,"boss":…,"final":…}}.
 * 목록이 없거나 못 읽으면 예전처럼 media/music.mp3 한 곡을 플레이 중에만 튼다(없는 곡은 그 구간만 조용).
 * 앱이 매 프레임 update(mode, state, soundOn)를 부른다. 브라우저 자동 재생 제한 때문에 첫 터치 전에는 소리가 안 날 수 있다. */
(function(global){
  'use strict';
  var DIR='media/bgm/',FADE_MS=1000,LEGACY={field:{file:'../music.mp3',volume:.2},boss:{file:'../music.mp3',volume:.2},final:{file:'../music.mp3',volume:.2}};
  var tracks=null,players={},current='',fadeFrom=null,fadeVol=0,fadeAt=0,ready=false,lastTry=0,away=false,live=false;
  function load(){
    try{global.fetch(DIR+'index.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(j){tracks=j&&j.tracks&&typeof j.tracks==='object'?j.tracks:LEGACY;warm();},function(){tracks=LEGACY;warm();});}
    catch(e){tracks=LEGACY;warm();}
  }
  /* 11-16 "보스랑 첫대면하고 몇십 초 보스 곡이 안 나옴": 보스 곡 소리 객체를 보스가 나올 때 처음 만들어
   * (1) 그제야 파일을 받기 시작했고 (2) 휴대폰 브라우저는 손가락을 뗄 때(터치 끝·클릭) 같은 사용자 동작 안에서
   * 한 번 재생된 소리만 나중에 코드로 틀 수 있게 한다. 탄막은 손가락을 댄 채 끌기만 해서 그 동작이 한참 없다.
   * → 곡 목록을 읽자마자 네 곡을 다 만들어 미리 받고, 첫 터치·클릭·키 입력 때 아직 안 풀린 곡을 소리 없이 한 번 틀었다 멈춰 풀어 둔다. */
  function warm(){ready=true;for(var k in tracks)player(k);}
  function unlock(){
    if(!ready)return;var cur=current?player(current):null;
    for(var k in players)(function(p){
      var a=p.a;if(p.unlocked)return;
      if(live&&(a===cur||a===fadeFrom)){play(a);p.unlocked=!a.paused;return;}
      try{a.muted=true;var r=a.play();var done=function(ok){if(!live||(a!==(current?player(current):null)&&a!==fadeFrom)){a.pause();}a.muted=false;if(ok)p.unlocked=true;};
        if(r&&r.then)r.then(function(){done(true);},function(){done(false);});else done(true);}catch(e){a.muted=false;}
    })(players[k]);
  }
  try{if(global.addEventListener)['pointerdown','touchstart','touchend','click','keydown'].forEach(function(t){global.addEventListener(t,unlock,{capture:true,passive:true});});}catch(e){}
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
    var want=soundOn?pick(mode,s):'';live=!!want&&mode!=='paused'&&!away&&!(global.document&&global.document.hidden);var a=want?player(want):null,cur=current?player(current):null;
    if(mode==='paused'||!soundOn||away||(global.document&&global.document.hidden)){for(var k in players)players[k].a.pause();return;} // 화면이 가려지면(탭 전환·앱 백그라운드) 시작 화면 곡도 멈춘다
    if(want!==current){if(cur&&cur!==a){if(fadeFrom&&fadeFrom!==a)fadeFrom.pause();fadeFrom=cur;fadeVol=cur.volume;fadeAt=now;}current=want;if(a&&a!==cur){a.volume=0;if(want==='boss'||want==='final')try{a.currentTime=0;}catch(e){}play(a);lastTry=now;}} // 보스 곡은 등장 순간 첫머리부터
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
  global.HapilMusic={update:update,pick:pick,suspend:suspend,unlock:unlock,_players:function(){return players;},_tracks:function(){return tracks;}};
})(typeof window!=='undefined'?window:globalThis);
