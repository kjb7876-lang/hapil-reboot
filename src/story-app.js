(function(global){
  'use strict';
  var $=function(id){return document.getElementById(id);},session,gate,data,registry,renderer,encounters;
  var running=false,paused=false,last=0,accumulator=0,lastPaint=0,keys=Object.create(null),drag={id:null,x:0,y:0,dx:0,dy:0};
  var assets=Object.create(null),loadGeneration=0,currentArt=null,currentSpec=null,noticeTimer,reviewWorld=null;
  var reviewId=new URLSearchParams(global.location.search).get('review');
  var coarse=global.matchMedia&&global.matchMedia('(pointer: coarse)').matches;
  function text(id,value){$(id).textContent=value;}
  function notice(message){text('notice',message);$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(function(){$('notice').hidden=true;},6000);}
  function explain(reason){return {'asset-or-implementation-locked':'이 전투의 자산 또는 실행 검사가 아직 준비되지 않았습니다.','stale-revision':'다른 창에서 기록이 바뀌었습니다. 새로고침하여 이어 주세요.','changed-before-write':'다른 창에서 기록이 바뀌었습니다. 새로고침하여 이어 주세요.','write-failed':'기록을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.','scene-locked':'현재 구역을 마친 뒤 이어집니다.','combat-active':'진행 중인 전투를 먼저 마쳐 주세요.','ending-locked':'모든 필수 전투를 마친 뒤 최종장이 열립니다.'}[reason]||'진행할 수 없습니다: '+reason;}
  function action(result){if(!result.ok)notice(explain(result.reason));refresh();return result.ok;}
  function clearInput(){keys=Object.create(null);drag.id=null;drag.dx=drag.dy=0;}
  function scene(){var s=session.state();return data.scenes.find(function(row){return row.id===s.viewSceneId;});}
  function refresh(){
    if(!session||!session.state())return;
    var state=session.state(),row=scene(),frontier=session.frontier(),status=session.sceneStatus(row.id),complete=status==='complete';
    text('chapter',row.chapter===0?'도입':row.chapter===9?'최종장':'제'+row.chapter+'부 · '+String(row.sequence).padStart(2,'0')+' / 61');
    text('scene-title',row.title);
    text('scene-status',status==='locked'?'원문 미리보기 · 실제 진행은 '+data.scenes[frontier.sceneIndex].title+'에 남아 있습니다.':complete?'남겨진 기억 · 완료한 구역':'현재 구역 · '+(frontier.acknowledged?'전투와 후속 진행을 기다립니다.':'원문을 읽고 기억을 새겨 주세요.'));
    if($('scene-text').dataset.scene!==row.id){
      var article=$('scene-text');article.replaceChildren();
      row.text.split(/\n\s*\n/).forEach(function(chunk){if(!chunk.trim())return;var p=document.createElement('p');p.textContent=chunk;article.appendChild(p);});
      article.dataset.scene=row.id;
    }
    $('acknowledge').disabled=state.acknowledgedSceneIds.indexOf(row.id)>=0||status==='locked'||!!state.activeCombat;
    $('acknowledge').textContent=state.acknowledgedSceneIds.indexOf(row.id)>=0?'새겨진 기억':'기억을 새기기';
    $('next-scene').disabled=!complete||row.id==='ending';
    $('previous').disabled=row.sequence===0||!!(state.activeCombat&&state.activeCombat.status==='active');
    $('preview-next').disabled=row.id==='ending'||!!(state.activeCombat&&state.activeCombat.status==='active');
    var list=$('encounters');list.replaceChildren();
    (row.requiredCombatIds||[]).forEach(function(id){
      var entry=gate.entryStatus(id),done=state.clearedCombatIds.indexOf(id)>=0,can=session.availableCombats().indexOf(id)>=0;
      var box=document.createElement('div');box.className='encounter';
      var title=document.createElement('h3');title.textContent=entry.name;box.appendChild(title);
      var p=document.createElement('p');p.textContent=done?'전투 기록 완료':!entry.ready?'자산·동작 검수 대기':can?'전투 준비 완료':'앞선 기억과 전투를 마친 뒤 열립니다.';box.appendChild(p);
      if(!entry.ready&&!done){var detail=document.createElement('details'),sum=document.createElement('summary'),why=document.createElement('p');sum.textContent='대기 항목';why.textContent=entry.reasons.join(' · ');detail.append(sum,why);box.appendChild(detail);}
      var b=document.createElement('button');b.textContent=done?'기록된 전투':'전투 시작';b.disabled=done||!can||!entry.ready||!!state.activeCombat;b.addEventListener('click',function(){startBattle(id,false);});box.appendChild(b);list.appendChild(box);
    });
    if(state.activeCombat){
      var pending=document.createElement('button');pending.textContent=state.activeCombat.status==='defeated'?'전투 재도전':'저장된 구역 시작점에서 재개';
      pending.addEventListener('click',function(){if(session.world()&&session.world().status==='active'){showBattle();return;}startBattle(state.activeCombat.combatId,true);});list.appendChild(pending);
    }
    var sum=gate.summary();text('progress',state.clearedCombatIds.length+' / '+data.primaryCombatIds.length+' 전투 · '+state.acknowledgedSceneIds.length+' / '+data.scenes.length+' 기억');
    text('save-status',session.status().error?'저장 대기 · '+explain(session.status().error):'스토리 기록 저장 준비 · 구역 경계에서 자동 저장');
    text('asset-status','확인한 갱신 목록 r'+sum.indexRevision+' · 전투 준비 '+sum.readyCount+'/'+sum.primaryCount+' · 전체 자산 생성 '+(sum.generationComplete?'완료':'진행 중')+' · 필수 형태 검사 '+sum.readyFormCount+'/'+sum.requiredFormCount);
    $('portal-open').disabled=!!(state.activeCombat&&state.activeCombat.status==='active');
  }
  function fit(){
    if(!renderer)return;
    var h=Math.max(180,Math.min(640,global.innerHeight-245,(global.innerWidth-32)*640/360));
    renderer.resize(h*360/640,h,coarse?1:Math.min(1.5,global.devicePixelRatio||1));
    $('story-canvas').style.width=(h*360/640).toFixed(2)+'px';$('story-canvas').style.height=h.toFixed(2)+'px';
  }
  function showBattle(){document.body.dataset.battle='true';$('reader').hidden=true;$('battle').hidden=false;fit();$('story-canvas').focus({preventScroll:true});}
  function pause(message){if(!running)return;paused=true;clearInput();$('resume').hidden=false;text('battle-state',message||'일시정지');}
  async function loadArt(binding){
    var generation=++loadGeneration,wanted=binding.images||[],next=Object.create(null),cursor=0;
    if(!wanted.length||wanted.length>8)throw new Error('전투 이미지 계약이 없습니다.');
    function load(item){return new Promise(function(resolve,reject){
      if(!/^media\/[A-Za-z0-9_./-]+\.(png|webp|jpg|jpeg)$/.test(item.file))return reject(new Error('잘못된 자산 경로'));
      if(assets[item.key]){next[item.key]=assets[item.key];resolve();return;}
      var im=new Image(),timer=setTimeout(function(){im.onload=im.onerror=null;im.src='';reject(new Error('이미지 로딩 시간 초과'));},15000);
      im.onload=function(){clearTimeout(timer);if(generation!==loadGeneration){im.src='';reject(new Error('전투 로딩 취소'));return;}if(item.width&&im.naturalWidth!==item.width||item.height&&im.naturalHeight!==item.height){reject(new Error('자산 크기 계약 불일치'));return;}next[item.key]=im;resolve();};
      im.onerror=function(){clearTimeout(timer);reject(new Error('이미지를 불러오지 못했습니다: '+item.key));};im.src=item.file;
    });}
    async function worker(){while(cursor<wanted.length){var item=wanted[cursor++];await load(item);}}
    await Promise.all([worker(),worker()]);if(generation!==loadGeneration)throw new Error('전투 로딩 취소');assets=next;return next;
  }
  async function startBattle(id,retry,review){
    var binding=registry.bindings[id];if(!binding)return notice('해당 전투의 시각 자산이 아직 등록되지 않았습니다.');
    text('battle-state','구역의 이미지를 불러오고 있습니다.');showBattle();
    try{
      var loaded=await loadArt(binding);if(renderer)renderer.dispose();
      renderer=global.HapilStoryRenderer.create($('story-canvas'),{assets:loaded});fit();
      currentArt=binding.art;currentSpec=encounters.get(id);
      // Validate the renderer contract before persisting a started encounter.
      var candidate=global.HapilStoryCombat.create(currentSpec,{runId:'art-probe',seed:1,difficulty:'normal'});
      var rendered=renderer.render(candidate,currentSpec,currentArt);
      if(rendered&&rendered.ready===false)throw new Error('구역 배경 또는 시각 자산 검사를 마치지 못했습니다.');
      if(review){reviewWorld=candidate;}else{reviewWorld=null;if(!action(retry?session.retry({difficulty:'normal'}):session.start(id,{difficulty:'normal'}))){document.body.dataset.battle='false';$('reader').hidden=false;$('battle').hidden=true;return;}}
      clearInput();
      text('battle-name',currentSpec.name||id);running=true;paused=false;last=performance.now();accumulator=0;lastPaint=0;
      $('resume').hidden=true;$('retry').hidden=true;$('return-reader').disabled=!review;text('battle-state',review?'자산 검수 전투 · 진행·저장에 반영하지 않습니다.':'자동 공격 · 화살표/WASD · Shift 정밀 이동');
      requestAnimationFrame(frame);
    }catch(e){running=false;notice(e.message);document.body.dataset.battle='false';$('reader').hidden=false;$('battle').hidden=true;refresh();}
  }
  function frame(stamp){
    if(!running)return;
    var elapsed=stamp-last;last=stamp;
    if(!paused&&elapsed>250)pause('화면이 오래 멈춰 전투를 일시정지했습니다.');
    if(!paused){
      accumulator+=Math.min(elapsed,100);
      for(var n=0;n<6&&accumulator>=1000/60;n++){
        var dx=Math.max(-40,Math.min(40,drag.dx)),dy=Math.max(-40,Math.min(40,drag.dy));drag.dx-=dx;drag.dy-=dy;
        var input={x:(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),y:(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0),slow:!!(keys.ShiftLeft||keys.ShiftRight),skillRotation:true};
        if(dx||dy){input.dx=dx;input.dy=dy;}if(reviewWorld)global.HapilStoryCombat.step(reviewWorld,input);else session.tick(input);
        accumulator-=1000/60;
      }
    }
    if(stamp-lastPaint>=(coarse?1000/30:1000/60)||paused){
      try{renderer.render(reviewWorld||session.world(),currentSpec,currentArt);}catch(e){pause(e.message);}
      lastPaint=stamp;
    }
    var w=reviewWorld||session.world();
    if(w&&w.status!=='active'){
      running=false;paused=false;clearInput();$('resume').hidden=true;$('return-reader').disabled=false;
      $('retry').hidden=w.status!=='defeated';text('battle-state',reviewWorld?'자산 검수 종료 · 본편 진행 기록은 바뀌지 않았습니다.':w.status==='defeated'?'기억은 남아 있습니다. 구역 시작부터 다시 도전할 수 있습니다.':session.status().error?'전투 결과 저장 대기 · 다시 저장해 주세요.':'전투 완료 · 후속 기억으로 이어집니다.');refresh();return;
    }
    if(!paused)requestAnimationFrame(frame);
  }
  function portal(){
    if(!action(session.dispatch({type:'PORTAL_OPEN',open:true})))return;
    var list=$('portal-list');list.replaceChildren();
    data.scenes.forEach(function(s){var b=document.createElement('button'),status=session.sceneStatus(s.id);b.textContent=s.title;b.disabled=['locked','unknown'].indexOf(status)>=0;b.addEventListener('click',function(){if(action(session.dispatch({type:'PORTAL_ENTER',sceneId:s.id}))){$('portal').close();global.scrollTo(0,0);}});list.appendChild(b);});$('portal').showModal();
  }
  async function boot(){
    try{
      data=global.HapilStoryScope.apply(global.HapilStoryData);encounters=global.HapilStoryEncounters;
      var files=await Promise.all(['docs/story/LIVE-ASSET-INDEX-current.json','docs/story/asset-ledger.json','docs/story/runtime-assets.json'].map(function(path){return fetch(path,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('스토리 자료를 불러오지 못했습니다: '+path);return r.json();});}));
      registry=files[2];gate=global.HapilStoryAssets.create(data,files[0],files[1]);
      var combat={supports:function(id){var s=encounters.get(id);return !!s&&global.HapilStoryCombat.supports(s);},create:function(id,o){return global.HapilStoryCombat.create(encounters.get(id),o);},step:global.HapilStoryCombat.step,result:global.HapilStoryCombat.result,verifyResult:global.HapilStoryCombat.verifyResult};
      session=global.HapilStorySession.create({data:data,assets:gate,combat:combat,stateAPI:global.HapilStoryState,storageAPI:global.HapilStoryStorage,resolutionFor:function(id){var s=encounters.get(id);return s&&s.resolution;}});
      if(!session.state()){text('scene-title','스토리 기록 확인이 필요합니다');text('scene-status','기록을 덮어쓰지 않았습니다. 백업 후 처음부터 시작하거나 원본을 보존해 주세요.');text('save-status',session.status().error);return;}
      if(reviewId&&registry.bindings[reviewId]&&combat.supports(reviewId)){$('review-fight').hidden=false;$('review-fight').onclick=function(){startBattle(reviewId,false,true);};}
      refresh();
    }catch(e){text('scene-title','스토리 작업판을 열 수 없습니다');text('scene-status',e.message);notice(e.message);}
  }
  $('acknowledge').onclick=function(){action(session.dispatch({type:'ACK_SCENE',sceneId:scene().id}));};
  $('next-scene').onclick=function(){if(action(session.dispatch({type:'VIEW_NEXT'})))global.scrollTo(0,0);};
  $('previous').onclick=function(){if(action(session.dispatch({type:'VIEW_PREVIOUS'})))global.scrollTo(0,0);};
  $('preview-next').onclick=$('next-scene').onclick;
  $('portal-open').onclick=portal;$('portal-close').onclick=function(){action(session.dispatch({type:'PORTAL_OPEN',open:false}));$('portal').close();};
  $('portal').addEventListener('cancel',function(){session.dispatch({type:'PORTAL_OPEN',open:false});});
  $('reset-story').onclick=function(){if(session&&action(session.reset())){running=false;loadGeneration++;document.body.dataset.battle='false';$('reader').hidden=false;$('battle').hidden=true;refresh();}};
  $('pause').onclick=function(){pause();};$('resume').onclick=function(){if(!running)return;paused=false;last=performance.now();accumulator=0;$('resume').hidden=true;text('battle-state','전투를 이어갑니다.');requestAnimationFrame(frame);};
  $('retry').onclick=function(){if(reviewWorld){startBattle(reviewWorld.combatId,false,true);return;}var s=session.state();if(s.activeCombat)startBattle(s.activeCombat.combatId,true);};
  $('return-reader').onclick=function(){if(running&&!reviewWorld)return;if(reviewWorld){running=false;reviewWorld=null;loadGeneration++;}else session.settle();document.body.dataset.battle='false';$('reader').hidden=false;$('battle').hidden=true;refresh();};
  global.addEventListener('keydown',function(e){if(running&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].indexOf(e.code)>=0)e.preventDefault();keys[e.code]=true;if(running&&(e.code==='Escape'||e.code==='Space'))pause();});
  global.addEventListener('keyup',function(e){delete keys[e.code];});global.addEventListener('blur',function(){clearInput();pause('입력 창을 벗어나 일시정지했습니다.');});
  document.addEventListener('visibilitychange',function(){if(document.hidden){clearInput();pause('화면을 벗어나 일시정지했습니다.');}});global.addEventListener('resize',fit);
  [$('story-canvas'),$('touch-pad')].forEach(function(el){
    el.addEventListener('pointerdown',function(e){if(!running||paused||drag.id!==null)return;drag.id=e.pointerId;drag.x=e.clientX;drag.y=e.clientY;el.setPointerCapture(e.pointerId);});
    el.addEventListener('pointermove',function(e){if(e.pointerId!==drag.id)return;var scale=360/$('story-canvas').getBoundingClientRect().width;drag.dx+=(e.clientX-drag.x)*scale;drag.dy+=(e.clientY-drag.y)*scale;drag.x=e.clientX;drag.y=e.clientY;});
    el.addEventListener('pointerup',function(e){if(e.pointerId===drag.id){var scale=360/$('story-canvas').getBoundingClientRect().width;drag.dx+=(e.clientX-drag.x)*scale;drag.dy+=(e.clientY-drag.y)*scale;drag.id=null;}});
    ['pointercancel','lostpointercapture'].forEach(function(name){el.addEventListener(name,function(e){if(e.pointerId===drag.id){drag.id=null;drag.dx=drag.dy=0;}});});
  });
  boot();
}(window));
