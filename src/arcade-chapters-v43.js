/* 서사 챕터(부) — 사용자 11-20 "서사텍스트에 맞게 큰챕터(에피소드)나눠서 시작메뉴에서 어디까지 클리어했는지 기록 볼 수 있게 혹은 재도전 같은거 하기 용이하게,
 * 그리고 하나의 챕터 끝나면 다음 챕터로 들어갈때 뭔가 확실하게 각인되도록 연출", "저장 불러오기 꼭 잘되게해야해".
 * 챕터 = 정본(docs/v43/canonical-story.txt)의 제1부~제8부. 스테이지의 part 값이 이미 같은 구획이다.
 * 챕터 제목은 정본 머리글 그대로, 전환 장면의 문장은 정본 문장 그대로(HapilArcadeStory 의 연결 장면·프롤로그·최종장, 제8부만 정본 원문에서 발췌).
 * 이 파일은 표시층이다: 엔진(arcade-v43.js)·진행 기록 형식(Progress)은 바꾸지 않는다. 앱은 HapilArcadeChapters 가 없어도 예전처럼 돈다. */
(function(root,factory){
  var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.HapilArcadeChapters=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  var NUMERALS=['','壹','貳','參','肆','伍','陸','柒','捌'];
  // 정본 머리글 "제N부 — 제목" 그대로.
  var TITLES=['','마지막 수호자 EGO','일곱 개의 귀와 하이테크 축귀','통제자의 열일곱 단계','환도 자아와 융합몽세','카이로노미콘','두 사람의 성','파란불 아래의 사람들','사이비 합일몽세'];
  // 앞 챕터 마지막 스테이지 뒤의 정본 연결 장면(arcade-story-v43.js TRANSITIONS.afterStage)이 다음 챕터의 문을 연다. 제7부→제8부 사이에는 연결 장면이 없어 [하나로 묶인 악몽] 원문에서 두 문장을 그대로 옮긴다.
  var PART8={title:'하나로 묶인 악몽',speaker:'환도의 기억',lines:[
    {speaker:'환도의 기억',text:'그 보이지 않는 끝을 따라가자 다시 ‘흑장미단’의 흔적이 드러났다.'},
    {speaker:'환도의 기억',text:'더 깊은 안쪽으로 들어가자 수많은 이의 몽세가 거미줄처럼 한데 묶여 있었다.'}]};
  var RANK={gentle:1,normal:2,hell:3},RANK_NAME=['','이지','노멀','헬'];
  var LOG_KEY='hapil-arcade-chapters-v43';

  function story(){return root&&root.HapilArcadeStory||null;}
  function count(){return TITLES.length-1;}
  /* 챕터 목록: STAGES(엔진)의 part 로 범위를 잡는다. */
  function list(stages){
    var out=[];for(var p=1;p<=count();p++)out.push({part:p,title:TITLES[p],numeral:NUMERALS[p],first:-1,last:-1,stages:[]});
    (stages||[]).forEach(function(g){var c=out[g.part-1];if(!c)return;if(c.first<0)c.first=g.index;c.last=g.index;c.stages.push(g.index);});
    return out;
  }
  function of(stages,index){var g=stages&&stages[index];return g?list(stages)[g.part-1]||null:null;}
  /* 챕터를 여는 정본 문장 */
  function opening(stages,part){
    var S=story();
    if(part===1)return S&&S.PROLOGUE?S.PROLOGUE:null;
    if(part===8)return PART8;
    var prev=list(stages)[part-2];if(!prev||!S||!S.getTransition)return null;
    return S.getTransition(prev.last);
  }
  function finale(){var S=story();return S&&S.FINALE?S.FINALE:null;}

  /* ── 챕터 기록(난이도별 완주) ── 진행 기록(Progress)과 따로: 스테이지마다 깬 가장 높은 난이도, 챕터를 처음 다 깬 시각. */
  function freshLog(){return {v:2,levels:{},done:{}};}
  /* 옛 챕터 기록(v:1, 56스테이지 번호) → 지금 번호(엔진 LAYOUT). 합쳐진 스테이지의 난이도는 합쳐진 옛 스테이지 가운데 가장 낮은 값(하나라도 없으면 기록 없음). */
  function layout(){var A=root&&root.HapilArcade;if(!A&&typeof module==='object'&&module.exports&&typeof require==='function'){try{A=require('./arcade-v43.js');}catch(e){A=null;}}return A&&A.LAYOUT||null;}
  function migrateLog(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.v!==1)return raw;var L=layout();if(!L)return raw;
    var lv=raw.levels&&typeof raw.levels==='object'?raw.levels:{},out={v:2,levels:{},done:raw.done};
    L.NEW_FROM.forEach(function(from,n){var low=3;from.forEach(function(o){var r=Number(lv[o]);low=Math.min(low,whole(r)&&r>=1&&r<=3?r:0);});if(low>0)out.levels[n]=low;});
    return out;
  }
  function whole(v){return typeof v==='number'&&isFinite(v)&&Math.floor(v)===v;}
  function cleanLog(raw,stages){
    var log=freshLog(),n=(stages||[]).length;raw=migrateLog(raw);if(!raw||typeof raw!=='object'||Array.isArray(raw))return log;
    var lv=raw.levels&&typeof raw.levels==='object'?raw.levels:{};Object.keys(lv).forEach(function(k){var i=Number(k),r=Number(lv[k]);if(whole(i)&&i>=0&&i<n&&whole(r)&&r>=1&&r<=3)log.levels[i]=r;});
    var dn=raw.done&&typeof raw.done==='object'?raw.done:{};Object.keys(dn).forEach(function(k){var p=Number(k),t=Number(dn[k]);if(whole(p)&&p>=1&&p<=count()&&isFinite(t)&&t>0)log.done[p]=Math.floor(t);});
    return log;
  }
  function noteClear(log,stages,progress,stage,difficulty,now){
    log=cleanLog(log,stages);var r=RANK[difficulty]||0;if(whole(stage)&&r&&(log.levels[stage]||0)<r)log.levels[stage]=r;
    var c=of(stages,stage);if(c&&!log.done[c.part]&&c.stages.every(function(i){return progress.cleared.indexOf(i)>=0;}))log.done[c.part]=now||Date.now();
    return log;
  }
  function mergeLog(a,b,stages){
    a=cleanLog(a,stages);b=cleanLog(b,stages);
    Object.keys(b.levels).forEach(function(k){if((a.levels[k]||0)<b.levels[k])a.levels[k]=b.levels[k];});
    Object.keys(b.done).forEach(function(k){if(!a.done[k]||b.done[k]<a.done[k])a.done[k]=b.done[k];});
    return a;
  }
  /* 챕터별 요약: 깬 스테이지 수·별·점수 합·모든 스테이지를 깬 가장 낮은 난이도(=그 난이도로 챕터 완주), 열렸는지, 이어갈 스테이지 */
  function summary(stages,progress,log,canPlay){
    log=cleanLog(log,stages);
    return list(stages).map(function(c){
      var cleared=0,stars=0,score=0,level=3;
      c.stages.forEach(function(i){if(progress.cleared.indexOf(i)>=0){cleared++;stars+=progress.stars[i]||1;score+=progress.best[i]||0;}level=Math.min(level,log.levels[i]||0);});
      var next=-1;for(var k=0;k<c.stages.length;k++)if(progress.cleared.indexOf(c.stages[k])<0){next=c.stages[k];break;}
      return {part:c.part,title:c.title,numeral:c.numeral,first:c.first,last:c.last,total:c.stages.length,cleared:cleared,stars:stars,maxStars:c.stages.length*3,score:score,
        complete:cleared===c.stages.length,level:cleared===c.stages.length?level:0,levelName:cleared===c.stages.length?RANK_NAME[level]||'':'',
        open:canPlay?canPlay(c.first):cleared>0,next:next,doneAt:log.done[c.part]||0};
    });
  }

  /* ── 기록 코드(내보내기·불러오기) ── 다른 기기로 옮기거나 브라우저 기록이 지워졌을 때 되살린다. 형식: HAPIL43-<base64(JSON)>-<검사값> */
  function hash(s){var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}
  // UTF-8 ↔ base64 를 직접 한다(btoa·Buffer 가 없는 곳에서도 같은 코드).
  var B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function utf8(s){var out=[];for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c>=0xd800&&c<0xdc00&&i+1<s.length){c=0x10000+((c-0xd800)<<10)+(s.charCodeAt(++i)-0xdc00);}
    if(c<0x80)out.push(c);else if(c<0x800)out.push(0xc0|c>>6,0x80|c&63);else if(c<0x10000)out.push(0xe0|c>>12,0x80|c>>6&63,0x80|c&63);else out.push(0xf0|c>>18,0x80|c>>12&63,0x80|c>>6&63,0x80|c&63);}return out;}
  function b64(s){var b=utf8(s),o='';for(var i=0;i<b.length;i+=3){var n=b[i]<<16|(b[i+1]||0)<<8|(b[i+2]||0);o+=B64[n>>18&63]+B64[n>>12&63]+(i+1<b.length?B64[n>>6&63]:'=')+(i+2<b.length?B64[n&63]:'=');}return o;}
  function unb64(t){
    var b=[],i,n;t=t.replace(/=+$/,'');for(i=0;i<t.length;i+=4){n=0;for(var k=0;k<4;k++){var v=i+k<t.length?B64.indexOf(t[i+k]):0;if(v<0)throw new Error('b64');n=n<<6|v;}b.push(n>>16&255);if(i+2<t.length)b.push(n>>8&255);if(i+3<t.length)b.push(n&255);}
    var s='';for(i=0;i<b.length;){var c=b[i++];if(c>=0xf0){c=(c&7)<<18|(b[i++]&63)<<12|(b[i++]&63)<<6|b[i++]&63;c-=0x10000;s+=String.fromCharCode(0xd800+(c>>10),0xdc00+(c&1023));continue;}
      if(c>=0xe0)c=(c&15)<<12|(b[i++]&63)<<6|b[i++]&63;else if(c>=0xc0)c=(c&31)<<6|b[i++]&63;s+=String.fromCharCode(c);}
    return s;
  }
  function encode(bundle){var body=b64(JSON.stringify(bundle));return 'HAPIL43-'+body+'-'+hash(body);}
  function decode(code){
    var m=/HAPIL43-([A-Za-z0-9+/=]+)-([0-9a-f]{8})/.exec(String(code||'').replace(/\s+/g,''));if(!m||hash(m[1])!==m[2])return null;
    try{var v=JSON.parse(unb64(m[1]));return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch(e){return null;}
  }

  /* ── 표시층(브라우저 전용) ── */
  var CSS=[
    '#arcade-chapter-card{position:fixed;inset:0;z-index:7;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#2a221c;background:#efe6d2;font-family:"Noto Serif KR","Nanum Myeongjo","AppleMyungjo","Batang",serif;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}',
    '#arcade-chapter-card[hidden]{display:none}',
    '#arcade-chapter-card .cc-paper{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 40%,rgba(255,250,236,.55),rgba(214,200,172,.5) 70%,rgba(150,130,104,.55)),repeating-linear-gradient(97deg,rgba(120,100,70,.05) 0 2px,transparent 2px 7px)}',
    /* 먹 번짐: 가운데에서 화면 끝까지 퍼지는 먹. 가장자리는 들쭉날쭉한 붓 끝(겹친 원 세 개) */
    '#arcade-chapter-card .cc-wash{position:absolute;left:50%;top:44%;width:190vmax;height:190vmax;margin:-95vmax 0 0 -95vmax;border-radius:47% 53% 45% 55%/52% 46% 54% 48%;background:radial-gradient(circle,#16120f 0 52%,#211a15 60%,rgba(33,26,21,.85) 64%,rgba(33,26,21,0) 70.5%);transform:scale(0);opacity:0}',
    '#arcade-chapter-card .cc-wash.b{border-radius:55% 45% 52% 48%/46% 55% 45% 54%;transform:scale(0) rotate(40deg)}',
    '#arcade-chapter-card[data-phase="begin"] .cc-wash{animation:cc-wash 1.7s cubic-bezier(.35,.1,.3,1) forwards}',
    '#arcade-chapter-card[data-phase="begin"] .cc-wash.b{animation:cc-wash-b 2s cubic-bezier(.35,.1,.3,1) .1s forwards}',
    /* 먹 면의 결: 번진 얼룩·종이 섬유가 먹 위에 남는다(단색 암전이 아니게) */
    '#arcade-chapter-card .cc-grain{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;background:radial-gradient(60% 40% at 22% 30%,rgba(90,74,58,.28),transparent 70%),radial-gradient(50% 36% at 80% 72%,rgba(80,64,50,.24),transparent 70%),radial-gradient(30% 24% at 64% 18%,rgba(120,96,70,.16),transparent 70%)}',
    '#arcade-chapter-card[data-phase="begin"] .cc-grain{animation:cc-fade 1.2s ease-out 1.1s forwards}',
    '#arcade-chapter-card .cc-place{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;background-size:cover;background-position:center;filter:grayscale(.85) sepia(.35) brightness(.5) contrast(1.1);mask-image:radial-gradient(70% 55% at 50% 52%,#000 0,rgba(0,0,0,.4) 55%,transparent 80%);-webkit-mask-image:radial-gradient(70% 55% at 50% 52%,#000 0,rgba(0,0,0,.4) 55%,transparent 80%)}',
    '#arcade-chapter-card[data-phase="begin"] .cc-place{animation:cc-place 4s ease-out 1.2s forwards}',
    '@keyframes cc-place{0%{opacity:0;transform:scale(1.08)}100%{opacity:.5;transform:scale(1)}}',
    '@keyframes cc-fade{to{opacity:1}}',
    '@keyframes cc-wash{0%{transform:scale(.02);opacity:.95}35%{transform:scale(.3)}100%{transform:scale(1);opacity:1}}',
    '@keyframes cc-wash-b{0%{transform:scale(0) rotate(40deg);opacity:.7}100%{transform:scale(.98) rotate(40deg);opacity:1}}',
    '#arcade-chapter-card .cc-end,#arcade-chapter-card .cc-begin{position:relative;z-index:2;width:min(92vw,560px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:0 6px}',
    '#arcade-chapter-card .cc-end[hidden],#arcade-chapter-card .cc-begin[hidden]{display:none}',
    '#arcade-chapter-card .cc-kicker{font-size:12px;letter-spacing:.42em;color:#7a2a22;margin:0}',
    '#arcade-chapter-card .cc-name{margin:0;color:#221b16;font-weight:700;font-size:clamp(24px,7.4vw,40px);line-height:1.25;letter-spacing:.06em;word-break:keep-all}',
    '#arcade-chapter-card .cc-stats{margin:4px 0 0;font-size:14px;line-height:1.7;color:#4a3d32;word-break:keep-all}',
    '#arcade-chapter-card .cc-refill{margin:8px 0 4px;font-size:17px;font-weight:700;color:#2a1d16;letter-spacing:.05em;opacity:0;animation:cc-refill .5s .8s ease-out forwards}',
    '#arcade-chapter-card .cc-level{margin:0 0 6px;font-size:14px;color:#33281a;letter-spacing:.05em;opacity:0;animation:cc-refill .7s 1.3s ease-out forwards}',
    '#arcade-chapter-card .cc-hearts{color:#b8322a;letter-spacing:.18em;font-size:17px;text-shadow:0 0 8px rgba(184,50,42,.35)}',
    '#arcade-chapter-card .cc-hearts i{font-style:normal;display:inline-block;opacity:0;animation:cc-stamp .32s ease-out forwards}',
    '@keyframes cc-stamp{0%{opacity:0;transform:scale(1.9) rotate(-8deg)}70%{opacity:1;transform:scale(.92)}100%{opacity:1;transform:none}}',
    '#arcade-chapter-card .cc-level b{color:#1e1915;font-weight:700}',
    '@keyframes cc-refill{0%{opacity:0;transform:translateY(6px) scale(.96)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}',
    '#arcade-chapter-card .cc-saved{margin:6px 0 0;font-size:13px;color:#3a4d2a;letter-spacing:.06em}',
    /* 끝 낙관: 챕터를 마친 순간에만 찍히는 붉은 도장(플레이어가 해낸 순간) */
    '#arcade-chapter-card .cc-seal{width:74px;height:74px;margin:10px 0 2px;display:flex;align-items:center;justify-content:center;font:700 44px/1 "Noto Serif KR","Nanum Myeongjo",serif;color:#f4ead6;background:#a8352a;border-radius:6px 4px 7px 3px;box-shadow:inset 0 0 0 3px #a8352a,inset 0 0 0 5px rgba(244,234,214,.75);transform:scale(2.6) rotate(-14deg);opacity:0}',
    '#arcade-chapter-card[data-phase="end"] .cc-seal{animation:cc-stamp .42s cubic-bezier(.3,1.6,.5,1) .55s forwards}',
    '@keyframes cc-stamp{0%{transform:scale(2.6) rotate(-14deg);opacity:0}60%{opacity:1}100%{transform:scale(1) rotate(-6deg);opacity:1}}',
    '#arcade-chapter-card[data-phase="end"] .cc-end>*:not(.cc-seal):not(.cc-sealbox){animation:cc-rise .6s ease-out both}',
    '#arcade-chapter-card .cc-sealbox{position:relative;margin-bottom:6px;display:flex;align-items:center;justify-content:center}',
    '#arcade-chapter-card .cc-splash{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;overflow:hidden;clip-path:circle(50%);background:radial-gradient(circle,rgba(168,53,42,.0) 38%,rgba(168,53,42,.38) 41%,rgba(168,53,42,0) 47%),radial-gradient(circle at 18% 30%,rgba(168,53,42,.55) 0 3px,transparent 4px),radial-gradient(circle at 84% 22%,rgba(168,53,42,.5) 0 2px,transparent 3px),radial-gradient(circle at 76% 86%,rgba(168,53,42,.5) 0 3px,transparent 4px),radial-gradient(circle at 12% 78%,rgba(168,53,42,.45) 0 2px,transparent 3px);opacity:0;transform:scale(.5)}',
    '#arcade-chapter-card[data-phase="end"] .cc-splash{animation:cc-splash .7s ease-out .9s forwards}',
    '@keyframes cc-splash{0%{opacity:0;transform:scale(.5)}20%{opacity:1}100%{opacity:.55;transform:scale(1.15)}}',
    '#arcade-chapter-card[data-phase="end"] .cc-end{animation:cc-jolt .3s ease-out .92s both}',
    '@keyframes cc-jolt{0%{transform:none}30%{transform:translateY(3px) scale(.995)}100%{transform:none}}',
    /* 시작: 먹 위에 큰 한자 숫자가 붓으로 스미고, 제목이 그 앞에 선다 */
    '#arcade-chapter-card[data-phase="begin"]{color:#f1e7d1}',
    '#arcade-chapter-card .cc-numeral{position:absolute;z-index:1;left:50%;top:44%;transform:translate(-50%,-50%) scale(1.25);font:700 min(64vh,92vw)/1 "Noto Serif KR","Nanum Myeongjo",serif;color:rgba(241,231,209,.085);filter:blur(6px);opacity:0;pointer-events:none;white-space:nowrap}',
    '#arcade-chapter-card[data-phase="begin"] .cc-numeral{animation:cc-numeral 2s cubic-bezier(.2,.7,.2,1) .9s forwards,cc-drift 14s linear 2.9s forwards}',
    '@keyframes cc-drift{from{transform:translate(-50%,-50%) scale(1)}to{transform:translate(-50%,-50%) scale(1.08)}}',
    '@keyframes cc-numeral{0%{opacity:0;filter:blur(10px);transform:translate(-50%,-50%) scale(1.3)}100%{opacity:1;filter:blur(.6px);transform:translate(-50%,-50%) scale(1)}}',
    '#arcade-chapter-card .cc-begin .cc-kicker{color:#d9b778}',
    '#arcade-chapter-card .cc-part{margin:0;font-size:clamp(15px,4.4vw,20px);letter-spacing:.5em;color:#d9b778;padding-left:.5em}',
    '#arcade-chapter-card .cc-title{margin:0;color:#f4ead4;font-weight:700;font-size:clamp(30px,9.6vw,54px);line-height:1.2;letter-spacing:.06em;word-break:keep-all;text-shadow:0 2px 12px rgba(0,0,0,.8)}',
    '#arcade-chapter-card .cc-rule{width:min(70vw,360px);height:5px;border-radius:50%;background:linear-gradient(90deg,transparent,#c8a66a 12%,#ead3a0 50%,#c8a66a 88%,transparent);transform:scaleX(0)}',
    '#arcade-chapter-card[data-phase="begin"] .cc-part{animation:cc-rise .6s ease-out 1.15s both}',
    '#arcade-chapter-card[data-phase="begin"] .cc-title{animation:cc-title .9s cubic-bezier(.2,.8,.2,1) 1.3s both}',
    '#arcade-chapter-card[data-phase="begin"] .cc-firststage{animation:cc-rise .6s ease-out 2s both}',
    '#arcade-chapter-card[data-phase="begin"] .cc-rule{animation:cc-rule .8s ease-out 1.8s forwards}',
    '@keyframes cc-title{0%{opacity:0;letter-spacing:.4em;filter:blur(4px)}100%{opacity:1;letter-spacing:.06em;filter:none}}',
    '@keyframes cc-rule{to{transform:scaleX(1)}}',
    '@keyframes cc-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '#arcade-chapter-card .cc-memory{min-height:116px;width:100%;max-width:520px;margin-top:18px;text-align:center;padding:4px 6px;opacity:0}',
    '#arcade-chapter-card .cc-memory:before{content:"";display:block;width:6px;height:6px;margin:0 auto 12px;border-radius:50%;background:#d9b778;box-shadow:-18px 0 0 -1px rgba(217,183,120,.5),18px 0 0 -1px rgba(217,183,120,.5)}',
    '#arcade-chapter-card .cc-firststage{margin:2px 0 0;font-size:14px;letter-spacing:.14em;color:rgba(241,231,209,.82)}',
    '#arcade-chapter-card .cc-begin{transform:translateY(4vh)}',
    '@media (min-width:900px){#arcade-chapter-card .cc-end,#arcade-chapter-card .cc-begin{width:min(80vw,760px)}#arcade-chapter-card .cc-title{font-size:72px}#arcade-chapter-card .cc-name{font-size:52px}#arcade-chapter-card .cc-seal{width:104px;height:104px;font-size:62px}#arcade-chapter-card .cc-stats{font-size:18px}#arcade-chapter-card .cc-line{font-size:21px}#arcade-chapter-card .cc-part{font-size:22px}#arcade-chapter-card .cc-speaker{font-size:14px}}',
    '#arcade-chapter-card .cc-memory.on{animation:cc-rise .7s ease-out forwards}',
    '#arcade-chapter-card .cc-speaker{margin:0 0 6px;font-size:12.5px;letter-spacing:.12em;color:#d9b778}',
    '#arcade-chapter-card .cc-line{margin:0;font-size:16.5px;line-height:1.8;word-break:keep-all;overflow-wrap:anywhere}',
    '#arcade-chapter-card .cc-foot{position:absolute;z-index:3;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));display:flex;justify-content:center;gap:10px;align-items:center;font-size:12px;opacity:.75}',
    '#arcade-chapter-card .cc-foot button{min-height:40px;min-width:0;padding:8px 16px;font-size:12.5px;background:transparent;border:1px solid currentColor;color:inherit;border-radius:12px 8px 11px 9px}',
    '#arcade-chapter-card[data-final="true"] .cc-numeral{color:rgba(217,183,120,.16)}',
    '#arcade-chapter-card[data-final="true"] .cc-wash{background:radial-gradient(circle,#16120f 0 50%,#3a2a16 58%,rgba(120,88,40,.7) 63%,rgba(33,26,21,0) 70.5%)}',
    '#arcade-chapter-card[data-final="true"] .cc-title{color:#ecd39a}',
    '#arcade-chapter-card[data-lite="true"] *{animation-duration:.01s!important;animation-delay:0s!important}',
    '@media (prefers-reduced-motion:reduce){#arcade-chapter-card *{animation-duration:.01s!important;animation-delay:0s!important}}',
    /* 챕터 기록 화면 */
    '#arcade-chapter-screen{justify-content:flex-start;gap:10px;padding-top:max(22px,env(safe-area-inset-top))}',
    '#arcade-chapter-screen>*{flex-shrink:0}',
    '.ch-list{width:100%;max-width:520px;display:flex;flex-direction:column;gap:9px}',
    '.ch-row{position:relative;display:grid;grid-template-columns:52px 1fr;gap:4px 12px;align-items:center;text-align:left;padding:10px 12px;border:1px solid #4a4666;border-radius:10px;background:#15152a;overflow:hidden}',
    'html.ink .ch-row{background:#ebe0c8;border-color:#8a7c68;border-radius:13px 9px 12px 8px/9px 12px 8px 13px}',
    '.ch-row.locked{opacity:.72}',
    /* 잠긴 제목 먹칠: 길이는 고정 두 가지(제목 길이가 드러나지 않게), 붓 모양 세 가지, 끝은 갈필(빗살 마스크). 다음에 열릴 챕터는 더 진하다 */
    '.ch-veil{display:block;width:11.5em;max-width:100%;height:1.2em;margin:2px 0 6px;opacity:.6;background:radial-gradient(90% 120% at 6% 55%,#1e1915 0 45%,transparent 46%),linear-gradient(94deg,#1e1915,#241e19 30%,#2c241e 62%,rgba(44,36,30,.7) 84%,rgba(44,36,30,0));border-radius:48% 52% 38% 62%/66% 40% 60% 34%;-webkit-mask-image:linear-gradient(90deg,#000 56%,transparent 70%),repeating-linear-gradient(176deg,rgba(0,0,0,.9) 0 1.6px,transparent 1.6px 2.6px,rgba(0,0,0,.6) 2.6px 3.4px,transparent 3.4px 4.6px);-webkit-mask-size:100% 100%,93% 100%;-webkit-mask-repeat:no-repeat;mask-image:linear-gradient(90deg,#000 56%,transparent 70%),repeating-linear-gradient(176deg,rgba(0,0,0,.9) 0 1.6px,transparent 1.6px 2.6px,rgba(0,0,0,.6) 2.6px 3.4px,transparent 3.4px 4.6px);mask-size:100% 100%,93% 100%;mask-repeat:no-repeat}',
    '.ch-veil.v1{width:9.5em;border-radius:40% 60% 52% 48%/52% 62% 38% 48%;transform:rotate(-1.2deg)}',
    '.ch-veil.v2{border-radius:56% 44% 44% 56%/40% 58% 42% 60%;transform:rotate(.8deg)}',
    '.ch-veil.next{opacity:1;filter:contrast(1.2)}',
    '@media (min-width:900px){.ch-veil{height:1.45em}}',
    '#arcade-chapter-screen .kicker{color:#9a7a44}html.ink #arcade-chapter-screen .kicker{color:#6b5636}',
    '#chapter-summary{word-break:keep-all;max-width:520px}',
    '.ch-save textarea::selection{background:rgba(168,140,90,.45);color:inherit}',
    '.ch-stars{letter-spacing:1px;color:#d8c49a}html.ink .ch-stars{color:#6b5636}',
    '.ch-row.current{border-width:2px;border-color:#d8c49a;box-shadow:0 4px 14px rgba(0,0,0,.25)}html.ink .ch-row.current{border-color:#2a2420;box-shadow:0 4px 14px rgba(60,44,30,.18)}',
    '.ch-num{grid-row:1/4;font:700 38px/1 "Noto Serif KR","Nanum Myeongjo",serif;text-align:center;color:#d8c49a}html.ink .ch-num{color:#2a2420}',
    '.ch-row.complete .ch-num{color:#a8352a}',
    '.ch-head{font-size:15px;font-weight:700;line-height:1.35;word-break:keep-all}.ch-head small{display:block;font-size:11px;font-weight:400;letter-spacing:.18em;opacity:.75}',
    '.ch-bar{display:flex;gap:2px;height:7px}.ch-bar i{flex:1;border-radius:2px;background:rgba(127,120,140,.3)}.ch-bar i.on{background:#d8c49a}html.ink .ch-bar i{background:rgba(60,50,40,.16)}html.ink .ch-bar i.on{background:#2a2420}',
    '.ch-meta{font-size:12px;line-height:1.5;opacity:.85;word-break:keep-all}',
    '.ch-badge{display:inline-block;margin-left:6px;padding:0 7px;border:1px solid #a8352a;border-radius:4px;color:#a8352a;font-size:11px;font-weight:700;letter-spacing:.06em}',
    '.ch-actions{grid-column:1/3;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.ch-actions button{flex:1 1 130px;min-height:42px;padding:8px 10px;font-size:13px;min-width:0}',
    '.ch-save{width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px;align-items:stretch;padding:10px 12px;border:1px dashed #6b6480;border-radius:10px;font-size:12.5px;text-align:left}html.ink .ch-save{border-color:#8a7c68}',
    '.ch-save .row{display:flex;gap:8px;flex-wrap:wrap}.ch-save .row button{flex:1 1 120px;min-height:42px;font-size:13px;min-width:0;padding:8px 10px}',
    '.ch-save textarea{width:100%;box-sizing:border-box;min-height:64px;font:12px/1.4 ui-monospace,Menlo,monospace;border-radius:8px;border:1px solid #6b6480;background:rgba(0,0,0,.2);color:inherit;padding:8px;resize:vertical}html.ink .ch-save textarea{background:#f6efdf;border-color:#8a7c68}',
    '.ch-save textarea[hidden]{display:none}'
  ].join('\n');
  function injectCss(doc){if(!doc||doc.getElementById('arcade-chapters-css')||!doc.head)return;var st=doc.createElement('style');st.id='arcade-chapters-css';st.textContent=CSS;doc.head.appendChild(st);}

  function el(doc,tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  /* 챕터 전환 카드. spec: {end:{part,title,stats,saved}, begin:{part,title,numeral,lines,speaker}, lite} → 끝 낙관(2.4초) → 먹 번짐·제목(2.6초) → 정본 문장 한 줄씩(3.2초).
     탭·Enter 로 다음, [건너뛰기] 로 끝. 시간은 앱이 tick(ms) 으로 준다(백그라운드·일시정지에는 멈춘다). */
  var END_MS=2600,TITLE_MS=3400,LINE_MS=3400;
  function mountCard(doc,sound){
    injectCss(doc);var host=doc.getElementById('arcade-chapter-card');
    if(!host){host=el(doc,'div');host.id='arcade-chapter-card';host.hidden=true;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-live','polite');(doc.getElementById('arcade-stage')||doc.body).appendChild(host);}
    var cur=null;
    function build(){
      host.textContent='';
      host.appendChild(el(doc,'div','cc-paper'));var w1=el(doc,'div','cc-wash'),w2=el(doc,'div','cc-wash b');host.appendChild(w2);host.appendChild(w1);
      var place=el(doc,'div','cc-place');host.appendChild(place);host.appendChild(el(doc,'div','cc-grain'));
      var num=el(doc,'div','cc-numeral');host.appendChild(num);
      var end=el(doc,'div','cc-end'),begin=el(doc,'div','cc-begin');host.appendChild(end);host.appendChild(begin);
      var foot=el(doc,'div','cc-foot'),hint=el(doc,'span','cc-hint','화면을 누르면 다음'),skip=el(doc,'button','cc-skip','건너뛰기');skip.type='button';foot.appendChild(hint);foot.appendChild(skip);host.appendChild(foot);
      return {num:num,place:place,end:end,begin:begin,skip:skip,hint:hint};
    }
    var parts=null;
    function paintEnd(e){
      var box=parts.end;box.textContent='';box.hidden=false;parts.begin.hidden=true;
      box.appendChild(el(doc,'p','cc-kicker','제'+e.part+'부 · 終'));box.appendChild(el(doc,'h2','cc-name',e.title));
      var sb=el(doc,'div','cc-sealbox'),seal=el(doc,'div','cc-seal',e.final?'完':'終');sb.setAttribute('aria-hidden','true');sb.appendChild(el(doc,'div','cc-splash'));sb.appendChild(seal);box.appendChild(sb);
      if(e.stats)box.appendChild(el(doc,'p','cc-stats',e.stats));
      if(e.refill){var rf=el(doc,'p','cc-refill');var hs=el(doc,'span','cc-hearts');for(var hi=0;hi<Math.max(0,Math.min(12,e.refill.max|0));hi++){var hh=el(doc,'i','','♥');hh.style.animationDelay=(1+hi*.12).toFixed(2)+'s';hs.appendChild(hh);}rf.appendChild(hs);rf.appendChild(doc.createTextNode(' 목숨이 모두 회복되었습니다'));rf.setAttribute('aria-label','목숨 '+e.refill.hp+'/'+e.refill.max+' 모두 회복');box.appendChild(rf);
        if(e.refill.power){var lv=el(doc,'p','cc-level','영웅 레벨 이어짐 · 공격 ');lv.appendChild(el(doc,'b','','Lv.'+e.refill.power));lv.appendChild(doc.createTextNode(' · 필살 '));lv.appendChild(el(doc,'b','','Lv.'+(e.refill.bomb||e.refill.power)));box.appendChild(lv);}}
      box.appendChild(el(doc,'p','cc-saved',e.saved===false?'이 브라우저에 기록을 남기지 못했습니다 — 챕터 기록 화면에서 기록 코드를 복사해 두세요':'✓ 진행이 저장되었습니다'));
      host.setAttribute('aria-label','제'+e.part+'부 '+e.title+' 끝');
    }
    function paintBegin(b){
      var box=parts.begin;box.textContent='';box.hidden=false;parts.end.hidden=true;parts.num.textContent=b.numeral||'';
      box.appendChild(el(doc,'p','cc-part',b.kicker||'제'+b.part+'부'));box.appendChild(el(doc,'h2','cc-title',b.title));box.appendChild(el(doc,'div','cc-rule'));if(b.firstStage)box.appendChild(el(doc,'p','cc-firststage','첫 무대 · '+b.firstStage));
      parts.place.style.backgroundImage=b.place?'url("'+String(b.place).replace(/["\\]/g,'')+'")':'';host.dataset.final=String(!!b.final);
      var mem=el(doc,'div','cc-memory');mem.appendChild(el(doc,'p','cc-speaker',''));mem.appendChild(el(doc,'p','cc-line',''));box.appendChild(mem);
      host.setAttribute('aria-label','제'+b.part+'부 '+b.title);
    }
    function paintLine(){
      var b=cur.spec.begin,line=b.lines[cur.line],mem=parts.begin.querySelector('.cc-memory');if(!mem||!line)return;
      mem.classList.remove('on');void mem.offsetWidth;mem.querySelector('.cc-speaker').textContent=(line.speaker||b.speaker||'')+' · '+(cur.line+1)+'/'+b.lines.length;mem.querySelector('.cc-line').textContent=line.text;mem.classList.add('on');
    }
    function go(phase){
      cur.phase=phase;cur.t=0;host.dataset.phase=phase;
      if(phase==='end'){paintEnd(cur.spec.end);if(sound)sound('end');}
      else if(phase==='begin'){paintBegin(cur.spec.begin);if(sound)sound('begin');}
      else if(phase==='line'){host.dataset.phase='begin';paintLine();}
    }
    function finish(){if(!cur)return;var done=cur.done;cur=null;host.hidden=true;host.textContent='';parts=null;if(done)done();}
    function advance(){
      if(!cur)return;var b=cur.spec.begin;
      if(cur.phase==='end'){if(b)go('begin');else finish();return;}
      if(cur.phase==='begin'){if(b.lines&&b.lines.length){cur.line=0;go('line');}else finish();return;}
      if(cur.phase==='line'){if(++cur.line<b.lines.length)go('line');else finish();}
    }
    host.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.cc-skip'))return;if(cur&&cur.t>350)advance();});
    return {
      show:function(spec,done){
        if(!spec||(!spec.end&&!spec.begin)){if(done)done();return false;}
        parts=build();parts.skip.addEventListener('click',function(e){e.stopPropagation();finish();});
        cur={spec:spec,done:done,phase:'',t:0,line:0};host.dataset.lite=String(!!spec.lite);host.hidden=false;go(spec.end?'end':'begin');return true;
      },
      tick:function(ms){if(!cur)return;cur.t+=ms;var limit=cur.phase==='end'?END_MS:cur.phase==='begin'?TITLE_MS:LINE_MS;if(cur.t>=limit)advance();},
      next:function(){if(cur&&cur.t>200)advance();},skip:finish,active:function(){return !!cur;},
      state:function(){return cur?{phase:cur.phase,t:cur.t,line:cur.line,end:cur.spec.end?cur.spec.end.part:0,begin:cur.spec.begin?cur.spec.begin.part:0,lines:cur.spec.begin&&cur.spec.begin.lines?cur.spec.begin.lines.length:0}:null;}
    };
  }

  /* 챕터 기록 화면 그리기. rows = summary(); on: {restart(part), resume(stage), exportCode(), importCode(text)->string} */
  function renderList(doc,box,rows,on){
    injectCss(doc);box.textContent='';var current=rows.filter(function(r){return r.open&&!r.complete;})[0];
    rows.forEach(function(r){
      var row=el(doc,'div','ch-row'+(r.complete?' complete':'')+(r.open?'':' locked')+(r===current?' current':''));row.dataset.part=String(r.part);
      var num=el(doc,'div','ch-num',r.numeral);num.setAttribute('aria-hidden','true');row.appendChild(num);
      var head=el(doc,'div','ch-head');head.appendChild(el(doc,'small',null,'제'+r.part+'부 · STAGE '+(r.first+1)+'–'+(r.last+1)));if(r.open)head.appendChild(doc.createTextNode(r.title));else{var veil=el(doc,'span','ch-veil v'+(r.part%3)+(rows[r.part-2]&&rows[r.part-2].open?' next':''));veil.setAttribute('role','img');veil.setAttribute('aria-label','잠긴 챕터 · 먹으로 가린 제목');head.appendChild(veil);} /* 사용자 11-20 "해금전에 챕터 제목 묵색으로 가려서 스포방지": 잠긴 챕터는 제목 글자를 화면에 아예 넣지 않고 먹 획으로 덮는다 */
      if(r.complete){var bd=el(doc,'span','ch-badge',(r.levelName?r.levelName+' ':'')+'완주');head.appendChild(bd);}row.appendChild(head);
      var bar=el(doc,'div','ch-bar');bar.setAttribute('role','img');bar.setAttribute('aria-label',r.cleared+' / '+r.total+' 스테이지');for(var i=0;i<r.total;i++)bar.appendChild(el(doc,'i',i<r.cleared?'on':''));row.appendChild(bar);
      row.appendChild(el(doc,'div','ch-meta',r.open?('스테이지 '+r.cleared+'/'+r.total+' · 별 '+r.stars+'/'+r.maxStars+(r.score?' · 점수 합 '+r.score.toLocaleString('ko-KR'):'')):'잠김 — 제'+(r.part-1)+'부를 마치면 열립니다'));
      if(r.open){
        var act=el(doc,'div','ch-actions'),a=el(doc,'button','ch-restart',r.complete?'이 챕터 다시':'처음부터');a.type='button';a.addEventListener('click',function(){on.restart(r.part);});act.appendChild(a);
        if(r.next>=0&&r.cleared>0){var b=el(doc,'button','ch-resume primary-lite','이어서 · STAGE '+(r.next+1));b.type='button';b.addEventListener('click',function(){on.resume(r.next);});act.appendChild(b);}
        row.appendChild(act);
      }
      box.appendChild(row);
    });
  }

  return {LOG_KEY:LOG_KEY,TITLES:TITLES,NUMERALS:NUMERALS,PART8:PART8,RANK:RANK,count:count,list:list,of:of,opening:opening,finale:finale,
    freshLog:freshLog,cleanLog:cleanLog,noteClear:noteClear,mergeLog:mergeLog,summary:summary,encode:encode,decode:decode,hash:hash,
    mountCard:mountCard,renderList:renderList,CSS:CSS,END_MS:END_MS,TITLE_MS:TITLE_MS,LINE_MS:LINE_MS};
});
