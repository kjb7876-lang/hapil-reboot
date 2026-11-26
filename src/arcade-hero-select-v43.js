/* 새 여정의 주인공 선택. 프로필의 설명만 표시하며 서사 정본에 대사를 덧붙이지 않는다. */
(function (global) {
  'use strict';
  var STYLE_ID = 'arcade-hero-select-style';
  var CSS = `
#arcade-hero-select,html.ink #arcade-hero-select{--hs-accent:#a7d2df;position:fixed;inset:0;z-index:20;isolation:isolate;display:flex;align-items:center;justify-content:center;width:100%;height:100dvh;overflow:auto;overscroll-behavior:contain;padding:max(24px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left));background:radial-gradient(ellipse at 25% 36%,#17343b 0,transparent 53%),linear-gradient(125deg,#070c10 0,#101b1b 52%,#070a0c 100%);color:#f1ead9;text-align:left;font:15px/1.5 system-ui,"Apple SD Gothic Neo",sans-serif;touch-action:pan-y}
#arcade-hero-select[hidden],html.ink #arcade-hero-select[hidden]{display:none}
#arcade-hero-select[data-hero^="seoha"],html.ink #arcade-hero-select[data-hero^="seoha"]{--hs-accent:#98dec6;background:radial-gradient(ellipse at 25% 36%,#183c35 0,transparent 53%),linear-gradient(125deg,#070c10 0,#14201b 52%,#070a0c 100%)}
#arcade-hero-select:before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;background:repeating-linear-gradient(115deg,transparent 0 112px,#bda36a0a 113px 114px,transparent 115px 220px);border-top:8px solid #050809;border-bottom:8px solid #050809}
#arcade-hero-select *{box-sizing:border-box}
#arcade-hero-select .hs-shell{width:min(100%,1080px);min-height:0;display:flex;flex-direction:column;gap:18px}
#arcade-hero-select .hs-heading{position:relative;z-index:2;display:flex;align-items:baseline;justify-content:space-between;gap:14px;border-bottom:1px solid #bba16c52;padding-bottom:12px}
#arcade-hero-select .hs-kicker{margin:0;font:10px/1.5 system-ui,sans-serif;letter-spacing:.32em;color:#c7ae7b}
#arcade-hero-select h1{margin:0;font:600 23px/1.25 "HapilSerif","Noto Serif KR","Nanum Myeongjo",serif;color:#eee2ca;letter-spacing:.12em;text-shadow:none}
#arcade-hero-select .hs-stage{min-height:300px;height:clamp(300px,54dvh,560px);display:grid;grid-template-columns:1.05fr 1fr;gap:42px;align-items:center;position:relative}
#arcade-hero-select .hs-art{align-self:stretch;min-width:0;min-height:0;position:relative;isolation:isolate;overflow:hidden}
#arcade-hero-select .hs-art:before{content:"";position:absolute;inset:22% -40% 10%;z-index:-1;transform:rotate(-13deg);background:linear-gradient(180deg,transparent 1%,#cbb0787a 2%,#020708 3% 94%,#9e815368 95%,transparent 97%);clip-path:polygon(8% 0,100% 7%,90% 100%,0 91%)}
#arcade-hero-select .hs-dial{position:absolute;width:76%;aspect-ratio:1;left:12%;top:10%;border:1px solid #bda36a45;border-radius:50%;background:repeating-conic-gradient(from 0deg,transparent 0deg 29deg,#bda36a70 29deg 30deg);mask-image:radial-gradient(circle,transparent 63%,#000 64% 71%,transparent 72%);opacity:.65}
#arcade-hero-select .hs-dial:after{content:"";position:absolute;inset:12%;border:1px solid #bda36a80;border-radius:50%}
#arcade-hero-select .hs-glyph{position:absolute;left:1%;bottom:6%;font:800 clamp(100px,14vw,170px)/1 "HapilSerif","Noto Serif KR",serif;color:#b7a17112;pointer-events:none}
#hero-select-portrait{display:block;position:relative;width:100%;height:100%;object-fit:contain;object-position:center top;filter:drop-shadow(0 12px 18px #000a);mask-image:linear-gradient(180deg,#000 88%,transparent 100%)}
#hero-select-portrait[hidden]{display:none}
#arcade-hero-select .hs-image-state{position:absolute;inset:40% 10% auto;margin:0;text-align:center;font-size:12px;color:#b6b2a4}
#arcade-hero-select .hs-image-state[hidden]{display:none}
#arcade-hero-select .hs-details{position:relative;z-index:2;min-width:0;padding:10px 0}
#arcade-hero-select .hs-number{margin:0 0 20px;color:#c7ae7b;font:10px/1.4 ui-monospace,monospace;letter-spacing:.3em}
#hero-select-title{margin:0 0 8px;color:var(--hs-accent);font-size:13px;letter-spacing:.12em}
#hero-select-name{margin:0;color:#fff1d5;font:700 clamp(42px,5vw,62px)/1.15 "HapilSerif","Noto Serif KR","Nanum Myeongjo",serif;letter-spacing:.055em;text-shadow:0 3px 20px #0008;word-break:keep-all}
#hero-select-description{max-width:390px;margin:20px 0 16px;color:#d2cdbf;font-size:14px;line-height:1.85;word-break:keep-all;overflow-wrap:anywhere}
#hero-select-abilities{list-style:none;margin:0;padding:0;display:grid;gap:7px;color:#e5ddc9;font-size:13px}
#hero-select-abilities li{position:relative;padding-left:17px;line-height:1.65;word-break:keep-all}
#hero-select-abilities li:before{content:"";position:absolute;left:1px;top:8px;width:5px;height:5px;border:1px solid #d0b882;transform:rotate(45deg)}
#arcade-hero-select .hs-loadout{margin:18px 0 0;padding-top:12px;border-top:1px solid #bda36a33;display:flex;gap:12px;flex-wrap:wrap;color:#bdb7a7;font-size:11px;line-height:1.6}
#arcade-hero-select .hs-loadout b{color:#d7c39a;font-weight:500;margin-right:6px}
#arcade-hero-select .hs-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;width:100%}
#arcade-hero-select .hs-choice,html.ink #arcade-hero-select .hs-choice{position:relative;display:flex;align-items:center;justify-content:flex-start;gap:12px;min-width:0;min-height:86px;border:1px solid #6a645455;border-radius:3px;background:#101817cc;color:#b4b7ad;padding:12px 18px;text-align:left;font:inherit;overflow:hidden;cursor:pointer;transition:border-color .2s,background .2s}
#arcade-hero-select .hs-choice[aria-pressed="true"],html.ink #arcade-hero-select .hs-choice[aria-pressed="true"]{border-color:#d7bd83;background:linear-gradient(110deg,#31423a,#13221f);color:#f0e4ca;box-shadow:inset 3px 0 #d7bd83,0 0 20px #8bc5ab0b}
#arcade-hero-select .hs-choice img{width:44px;height:58px;object-fit:cover;object-position:center top;flex-shrink:0;mask-image:linear-gradient(90deg,#000 75%,transparent)}
#arcade-hero-select .hs-choice img[hidden]{display:none}
#arcade-hero-select .hs-choice-copy{min-width:0;flex:1}
#arcade-hero-select .hs-choice-name{display:block;font:600 19px/1.25 "HapilSerif","Noto Serif KR",serif;letter-spacing:.04em}
#arcade-hero-select .hs-choice-title{display:block;overflow-wrap:anywhere;margin-top:5px;font-size:11px;line-height:1.4;color:#bcb5a4;word-break:keep-all}
#arcade-hero-select .hs-choice-mark{font:9px/1 system-ui,sans-serif;letter-spacing:.1em;color:#d8c393;opacity:0}
#arcade-hero-select .hs-choice[aria-pressed="true"] .hs-choice-mark{opacity:1}
#arcade-hero-select .hs-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:2px}
#arcade-hero-select .hs-hint{margin:0;color:#9c9f93;font-size:10px;letter-spacing:.03em;line-height:1.6}
#arcade-hero-select .hs-actions{display:flex;gap:10px;flex-shrink:0}
#arcade-hero-select .hs-action,html.ink #arcade-hero-select .hs-action{min-width:90px;min-height:48px;border:1px solid #817761;border-radius:3px;background:#111b19;color:#d4ccba;font:14px/1.4 system-ui,"Apple SD Gothic Neo",sans-serif;padding:10px 18px;cursor:pointer}
#arcade-hero-select #hero-select-confirm,html.ink #arcade-hero-select #hero-select-confirm{min-width:170px;border-color:#e3cd9d;background:linear-gradient(120deg,#dec99f,#b89b62);color:#16231e;font-weight:700;letter-spacing:.04em}
#arcade-hero-select button:focus-visible{outline:3px solid var(--hs-accent);outline-offset:4px}
#arcade-hero-select .is-revealing .hs-art{animation:hs-art .7s cubic-bezier(.12,.7,.2,1) both}
#arcade-hero-select .is-revealing .hs-details{animation:hs-copy .55s ease-out .1s both}
#arcade-hero-select .is-revealing .hs-dial{animation:hs-dial 1.6s ease-out both}
@keyframes hs-art{from{opacity:0;transform:translateX(-18px);clip-path:polygon(0 0,0 0,0 100%,0 100%)}to{opacity:1;transform:none;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}}
@keyframes hs-copy{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes hs-dial{from{rotate:-28deg;opacity:0}to{rotate:0deg;opacity:.65}}
#arcade-hero-select[data-lite="true"] *,#arcade-hero-select[data-lite="true"] *:before,#arcade-hero-select[data-lite="true"] *:after{animation:none!important;transition:none!important}
#arcade-hero-select[data-lite="true"] #hero-select-portrait{filter:none}
/* A translated profile can be taller than its portrait. Let it set the row height and keep controls in normal flow. */
@media(min-width:601px) and (min-height:501px){
#arcade-hero-select,html.ink #arcade-hero-select{align-items:flex-start}
#arcade-hero-select .hs-shell{margin-block:auto}
#arcade-hero-select .hs-stage{height:auto;min-height:clamp(300px,54dvh,560px)}
#hero-select-portrait{position:absolute;inset:0}
}
@media(max-width:600px){
#arcade-hero-select,html.ink #arcade-hero-select{padding:max(20px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom));align-items:flex-start}
#arcade-hero-select .hs-shell{gap:10px;height:calc(100dvh - max(20px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));min-height:0}
#arcade-hero-select .hs-heading,#arcade-hero-select .hs-choices,#arcade-hero-select .hs-footer{flex-shrink:0}
#arcade-hero-select .hs-heading{padding-bottom:10px;gap:8px}#arcade-hero-select h1{font-size:19px}#arcade-hero-select .hs-kicker{font-size:8px;letter-spacing:.2em}
#arcade-hero-select .hs-stage{display:flex;flex-direction:column;gap:0;height:auto;min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;scroll-padding:8px}
#arcade-hero-select .hs-art{width:100%;height:clamp(140px,25dvh,250px);min-height:140px;flex-shrink:0}
#arcade-hero-select .hs-dial{width:56%;left:22%;top:5%}#arcade-hero-select .hs-glyph{font-size:120px;left:5%}
#arcade-hero-select .hs-details{width:100%;padding:0;flex-shrink:0}#arcade-hero-select .hs-number{display:none}#hero-select-title{margin-bottom:4px;font-size:11px}#hero-select-name{font-size:34px;line-height:1.15}
#hero-select-description{margin:10px 0;font-size:12px;line-height:1.7;max-width:none}#hero-select-abilities{gap:3px;font-size:11px}#hero-select-abilities li{line-height:1.6}#hero-select-abilities li:before{top:6px}
#arcade-hero-select .hs-loadout{display:none}#arcade-hero-select .hs-choices{gap:8px}
#arcade-hero-select .hs-choice,html.ink #arcade-hero-select .hs-choice{min-height:74px;padding:8px 4px;gap:4px;flex-direction:column;justify-content:center}#arcade-hero-select .hs-choice img{display:none}#arcade-hero-select .hs-choice-name{font-size:14px;line-height:1.4;overflow-wrap:anywhere}#arcade-hero-select .hs-choice-title{font-size:9px;margin-top:3px;line-height:1.4}#arcade-hero-select .hs-choice-mark{display:none}
#arcade-hero-select .hs-footer{flex-direction:column-reverse;gap:7px}#arcade-hero-select .hs-actions{width:100%;gap:8px}#arcade-hero-select .hs-action,html.ink #arcade-hero-select .hs-action{min-width:84px;min-height:46px;padding:10px 14px}#arcade-hero-select #hero-select-confirm,html.ink #arcade-hero-select #hero-select-confirm{flex:1;min-width:0}#arcade-hero-select .hs-hint{font-size:9px;text-align:center}#arcade-hero-select .hs-hint br{display:none}
}
@media(max-width:380px) and (min-height:501px){#arcade-hero-select .hs-art{height:clamp(130px,23dvh,200px);min-height:130px}#hero-select-description{font-size:11px}#arcade-hero-select .hs-choice-title{font-size:8px}#arcade-hero-select .hs-choice-name{font-size:12px;letter-spacing:0}#arcade-hero-select .hs-choice,html.ink #arcade-hero-select .hs-choice{padding:8px 6px}#arcade-hero-select .hs-choice-copy{width:100%;text-align:center}}
@media(max-height:500px) and (orientation:landscape){
#arcade-hero-select,html.ink #arcade-hero-select{padding:16px max(22px,env(safe-area-inset-left)) 14px;align-items:flex-start}
#arcade-hero-select .hs-shell{height:calc(100dvh - 30px);min-height:300px;display:grid;grid-template-columns:minmax(225px,1fr) minmax(265px,1.05fr);grid-template-rows:auto minmax(0,1fr) auto;gap:10px 26px}
#arcade-hero-select .hs-heading{grid-column:2;grid-row:1;padding-bottom:7px}#arcade-hero-select h1{font-size:18px}#arcade-hero-select .hs-kicker{font-size:8px}
#arcade-hero-select .hs-stage{display:contents;height:auto;min-height:0}#arcade-hero-select .hs-art{grid-column:1;grid-row:1/4;width:100%;height:100%;min-height:0}#arcade-hero-select .hs-details{grid-column:2;grid-row:2;align-self:center;padding:0;max-height:100%;overflow-y:auto}
#arcade-hero-select .hs-number,#arcade-hero-select .hs-loadout{display:none}#hero-select-title{font-size:10px;margin:0 0 3px}#hero-select-name{font-size:31px}#hero-select-description{font-size:11px;line-height:1.55;margin:8px 0}#hero-select-abilities{font-size:10px;gap:2px}#hero-select-abilities li{line-height:1.5}#hero-select-abilities li:before{top:5px}
#arcade-hero-select .hs-choices{grid-column:1;grid-row:3;z-index:3;gap:7px;align-self:end}#arcade-hero-select .hs-choice,html.ink #arcade-hero-select .hs-choice{min-height:54px;padding:8px 3px;background:#0a1615ed}#arcade-hero-select .hs-choice img,#arcade-hero-select .hs-choice-title,#arcade-hero-select .hs-choice-mark{display:none}#arcade-hero-select .hs-choice-name{font-size:13px;white-space:nowrap}
#arcade-hero-select .hs-footer{grid-column:2;grid-row:3;display:block;padding:0}#arcade-hero-select .hs-actions{width:100%;gap:8px}#arcade-hero-select .hs-action,html.ink #arcade-hero-select .hs-action{min-width:80px;min-height:45px;padding:8px 12px;font-size:12px}#arcade-hero-select #hero-select-confirm,html.ink #arcade-hero-select #hero-select-confirm{min-width:0;flex:1}#arcade-hero-select .hs-hint{display:none}
}
@media(min-width:601px) and (max-width:950px) and (min-height:501px){#arcade-hero-select .hs-choice{padding:10px;gap:8px}#arcade-hero-select .hs-choice-mark{display:none}#arcade-hero-select .hs-choice-name{font-size:17px}}
@media(prefers-reduced-motion:reduce){#arcade-hero-select *,#arcade-hero-select *:before,#arcade-hero-select *:after{animation:none!important;transition:none!important}#hero-select-portrait{filter:none}}
html.ink #arcade-hero-select,html.ink #arcade-hero-select[data-hero^="seoha"]{--hs-accent:#5a5048;--hs-ink:#1e1a18;--hs-paper:#f2e9d6;background:radial-gradient(120% 70% at 50% 18%,rgba(120,104,84,.26),rgba(242,233,214,.94) 62%),#f2e9d6;color:#2a2420;font-family:"Noto Serif KR","Nanum Myeongjo","AppleMyungjo","Batang",serif}
html.ink #arcade-hero-select[data-hero^="seoha"]{--hs-accent:#3f5552}
html.ink #arcade-hero-select:before{background:repeating-linear-gradient(115deg,transparent 0 112px,rgba(42,36,32,.05) 113px 114px,transparent 115px 220px);border-top:3px solid #1e1a18;border-bottom:3px solid #1e1a18}
html.ink #arcade-hero-select .hs-heading{border-bottom:1.5px solid rgba(30,26,24,.55)}
html.ink #arcade-hero-select .hs-kicker,html.ink #arcade-hero-select .hs-number{color:#6f6354}
html.ink #arcade-hero-select h1{color:#1e1a18;font-family:inherit}
html.ink #arcade-hero-select .hs-art:before{background:linear-gradient(180deg,transparent 1%,rgba(30,26,24,.32) 2%,rgba(60,50,40,.13) 3% 94%,rgba(30,26,24,.18) 95%,transparent 97%)}
html.ink #arcade-hero-select .hs-glyph{color:rgba(30,26,24,.07)}
html.ink #hero-select-portrait{filter:drop-shadow(0 6px 10px rgba(30,26,24,.22));mask-image:linear-gradient(180deg,#000 90%,transparent 100%)}
html.ink #hero-select-name{color:#1e1a18;text-shadow:none;font-family:inherit}
html.ink #hero-select-title{color:var(--hs-accent)}
html.ink #hero-select-description{color:#3c332b}
html.ink #hero-select-abilities{color:#2a2420}
html.ink #hero-select-abilities li:before{border-color:#1e1a18;background:#1e1a18;border-radius:50% 10% 50% 10%}
html.ink #arcade-hero-select .hs-loadout{border-top:1px solid rgba(30,26,24,.3);color:#5a5048}
html.ink #arcade-hero-select .hs-loadout b{color:#1e1a18}
html.ink #arcade-hero-select .hs-image-state{color:#5a5048}
html.ink #arcade-hero-select .hs-hint{color:#6f6354}
html.ink #arcade-hero-select .hs-choice{background:#ebe0c8;border:1.5px solid #8a7c68;border-radius:13px 9px 12px 8px/9px 12px 8px 13px;color:#4a4036}
html.ink #arcade-hero-select .hs-choice[aria-pressed="true"]{background:#d9cbae;border-color:#1e1a18;color:#1e1a18;box-shadow:inset 4px 0 #1e1a18}
html.ink #arcade-hero-select .hs-choice-title{color:#6f6354}
html.ink #arcade-hero-select .hs-choice-mark{color:#1e1a18}
html.ink #arcade-hero-select .hs-choice img{mask-image:linear-gradient(90deg,#000 75%,transparent)}
html.ink #arcade-hero-select .hs-action{background:#ebe0c8;border:1.5px solid #8a7c68;border-radius:13px 9px 12px 8px/9px 12px 8px 13px;color:#2a2420;font-family:inherit}
html.ink #arcade-hero-select #hero-select-confirm{background:#1e1a18;border-color:#1e1a18;color:#f2e9d6}
html.ink #arcade-hero-select button:focus-visible{outline:3px solid #1e1a18;outline-offset:3px}
html.ink #arcade-hero-select .hs-dial{background:none;border:0;mask-image:none;opacity:1;color:#1e1a18}
html.ink #arcade-hero-select .hs-dial:after{display:none}
#arcade-hero-select .hs-svg{display:none}
html.ink #arcade-hero-select .hs-svg{display:block;width:100%;height:100%;overflow:visible}
html.ink #arcade-hero-select .hs-wheel{transform:rotate(var(--hs-turn,270deg));transform-origin:110px 110px;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
html.ink #arcade-hero-select .hs-enso{fill:none;stroke:#1e1a18;stroke-width:7;stroke-linecap:round;opacity:.82}
html.ink #arcade-hero-select .hs-enso2{fill:none;stroke:#1e1a18;stroke-width:2.6;stroke-linecap:round;opacity:.5}
html.ink #arcade-hero-select .hs-enso3{fill:none;stroke:#1e1a18;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:9 4 2 5 14 3;opacity:.42}
html.ink #arcade-hero-select .hs-mark-dot{fill:#f2e9d6;stroke:#1e1a18;stroke-width:1.4;opacity:.55}
html.ink #arcade-hero-select .hs-mark.is-on .hs-mark-dot{fill:#1e1a18;opacity:1}
html.ink #arcade-hero-select .hs-mark-glyph{font:700 13px "Noto Serif KR","Nanum Myeongjo",serif;fill:#3c332b;opacity:.7;transform-box:fill-box;transform-origin:center;transform:rotate(calc(var(--hs-turn,270deg) * -1 - var(--a,0deg)));transition:transform .9s cubic-bezier(.2,.8,.2,1)}
html.ink #arcade-hero-select .hs-mark.is-on .hs-mark-glyph{fill:#f2e9d6;opacity:1}
html.ink #arcade-hero-select .hs-dial{height:94%;width:auto;max-width:96%;aspect-ratio:1;left:50%;top:3%;translate:-50% 0}
html.ink #arcade-hero-select[data-lite="true"] .hs-wheel,html.ink #arcade-hero-select[data-lite="true"] .hs-mark-glyph{transition:none!important}
@media(max-height:500px) and (orientation:landscape){html.ink #arcade-hero-select .hs-choice{background:#ebe0c8}}
@media(prefers-reduced-motion:reduce){html.ink #arcade-hero-select .hs-wheel,html.ink #arcade-hero-select .hs-mark-glyph{transition:none!important}}
`;
  function localText(source,params) {
    if(global.HapilI18n && global.HapilI18n.text) return global.HapilI18n.text(source,params);
    return params ? source.replace(/\{(\w+)\}/g,function(mark,key){return params[key] == null ? mark : params[key];}) : source;
  }
  function mount(host) {
    var doc = global.document, heroes = global.HapilArcadeHeroes;
    if (!heroes || !heroes.list) throw new Error('HapilArcadeHeroes must load before hero selection.');
    var IDS = heroes.list().map(function (p) { return p.id; });
    if (!doc || !host || !host.appendChild) throw new Error('Hero selection requires a DOM host.');
    if (host.__hapilHeroSelect) return host.__hapilHeroSelect;
    if (!doc.getElementById(STYLE_ID)) {
      var style = doc.createElement('style'); style.id = STYLE_ID; style.textContent = CSS;
      (doc.head || host).appendChild(style);
    }
    var root = doc.createElement('section'); root.id = 'arcade-hero-select'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'hero-select-heading'); root.dataset.lite = 'false';
    root.innerHTML = '<div class="hs-shell"><header class="hs-heading"><h1 id="hero-select-heading">주인공 선택</h1><p class="hs-kicker">SELECT YOUR HERO</p></header><div class="hs-stage"><div class="hs-art"><div class="hs-dial" aria-hidden="true"><svg class="hs-svg" viewBox="0 0 220 220" focusable="false"><defs><filter id="hs-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter></defs><g class="hs-wheel"><path class="hs-enso" d="M173.9 52.5A86 86 0 1 1 98.0 24.8" filter="url(#hs-rough)"/><path class="hs-enso2" d="M186.6 154.2A88.5 88.5 0 1 1 76.8 27.9" filter="url(#hs-rough)"/><path class="hs-enso3" d="M46.0 163.7A83.5 83.5 0 0 1 174.0 56.3" filter="url(#hs-rough)"/><g class="hs-marks"></g></g></svg></div><span class="hs-glyph" aria-hidden="true">憶</span><img id="hero-select-portrait" alt="" decoding="async"><p class="hs-image-state" hidden>초상을 불러오지 못했습니다.</p></div><div class="hs-details" aria-live="polite"><p class="hs-number"><span class="hs-player-label">PLAYER</span> / <span id="hero-select-number">01</span></p><p id="hero-select-title"></p><h2 id="hero-select-name"></h2><p id="hero-select-description"></p><ul id="hero-select-abilities"></ul><p class="hs-loadout"><span><b class="hs-shot-label">사격</b><span id="hero-select-shot"></span></span><span><b class="hs-ultimate-label">필살</b><span id="hero-select-bomb"></span></span></p></div></div><div class="hs-choices" role="group" aria-label="주인공"></div><footer class="hs-footer"><p class="hs-hint"><span class="hs-keys-hint">방향키로 선택 · Enter로 시작 · Esc로 돌아가기</span> <br><span class="hs-touch-hint">터치 화면에서는 주인공을 누른 뒤 선택 확정</span></p><div class="hs-actions"><button id="hero-select-cancel" class="hs-action" type="button">돌아가기</button><button id="hero-select-confirm" class="hs-action" type="button">선택 확정 · 시작</button></div></footer></div>';
    host.appendChild(root);
    var wheelMarks = [];
    (function buildWheel() { // 수묵 휠: 영웅 수만큼 먹 낙점(憶·時·覺)을 원 둘레에 놓고, 고른 영웅이 왼쪽 자리로 오게 돌린다.
      var g = root.querySelector('.hs-marks'), glyphs = ['憶', '時', '覺'], ns = 'http://www.w3.org/2000/svg';
      if (!g || !doc.createElementNS) return;
      IDS.forEach(function (id, i) {
        var a = i * (360 / IDS.length), m = doc.createElementNS(ns, 'g'), dot = doc.createElementNS(ns, 'circle'), t = doc.createElementNS(ns, 'text');
        m.setAttribute('class', 'hs-mark'); m.setAttribute('data-hero', id);
        m.setAttribute('transform', 'translate(110 110) rotate(' + a + ') translate(0 -99)');
        m.style.setProperty('--a', a + 'deg');
        dot.setAttribute('r', '11'); dot.setAttribute('class', 'hs-mark-dot');
        t.setAttribute('class', 'hs-mark-glyph'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central'); t.textContent = glyphs[i] || '';
        m.appendChild(dot); m.appendChild(t); g.appendChild(m); wheelMarks.push(m);
      });
    })();
    var choices = root.querySelector('.hs-choices');
    IDS.forEach(function (id) {
      var button = doc.createElement('button'); button.id = 'hero-select-' + id; button.className = 'hs-choice'; button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<img alt="" decoding="async"><span class="hs-choice-copy"><span class="hs-choice-name"></span><span class="hs-choice-title"></span></span><span class="hs-choice-mark" aria-hidden="true">SELECTED</span>';
      choices.appendChild(button);
    });
    var wheel = { idx: null, turn: null };
    var visible = false, selected = 'memory', onConfirm = null, onCancel = null, previousFocus = null;
    var preloadImages = {}, stage = root.querySelector('.hs-stage'), portrait = root.querySelector('#hero-select-portrait');
    function el(id) { return root.querySelector('#' + id); }
    function profile(id) {
      var data = global.HapilArcadeHeroes;
      if (!data) throw new Error('HapilArcadeHeroes must load before hero selection.');
      if (data.get) return data.get(id);
      var profiles = data.profiles || {};
      return Array.isArray(profiles) ? profiles.find(function (p) { return p.id === id; }) : profiles[id];
    }
    function inkArt(p) {
      var cl = doc.documentElement && doc.documentElement.classList;
      return cl && cl.contains('ink') && p.cutin ? p.cutin : p.portrait;
    }
    function preload(p) {
      if (!p || !p.portrait || preloadImages[p.id] || !global.Image) return;
      var im = new global.Image(); im.decoding = 'async'; im.src = inkArt(p); preloadImages[p.id] = im;
    }
    function paintLabels() {
      [
        ['#hero-select-heading','주인공 선택'], ['.hs-kicker','SELECT YOUR HERO'],
        ['.hs-image-state','초상을 불러오지 못했습니다.'], ['.hs-player-label','PLAYER'],
        ['.hs-shot-label','사격'], ['.hs-ultimate-label','필살'],
        ['.hs-keys-hint','방향키로 선택 · Enter로 시작 · Esc로 돌아가기'],
        ['.hs-touch-hint','터치 화면에서는 주인공을 누른 뒤 선택 확정'],
        ['#hero-select-cancel','돌아가기'], ['#hero-select-confirm','선택 확정 · 시작']
      ].forEach(function(label){root.querySelector(label[0]).textContent=localText(label[1]);});
      choices.setAttribute('aria-label',localText('주인공'));
    }
    function populateChoices() {
      IDS.forEach(function (id) {
        var p = profile(id), button = el('hero-select-' + id), thumb = button.querySelector('img');
        button.querySelector('.hs-choice-name').textContent = localText(p.name);
        button.querySelector('.hs-choice-title').textContent = localText(p.title || p.summary || '');
        button.querySelector('.hs-choice-mark').textContent = localText('SELECTED');
        button.setAttribute('aria-label', localText(p.name) + (p.title ? ' · ' + localText(p.title) : ''));
        thumb.src = p.portrait || ''; thumb.hidden = !p.portrait; preload(p);
      });
    }
    function select(id) {
      if (IDS.indexOf(id) < 0) id = (global.HapilArcadeHeroes && global.HapilArcadeHeroes.DEFAULT_ID) || 'memory';
      var p = profile(id); selected = p.id; root.dataset.hero = selected;
      el('hero-select-name').textContent = localText(p.name);
      el('hero-select-title').textContent = localText(p.title || '');
      el('hero-select-description').textContent = localText(p.description || p.summary || '');
      el('hero-select-number').textContent = String(IDS.indexOf(selected) + 1).padStart(2, '0');
      el('hero-select-shot').textContent = localText(p.shotLabel || '');
      el('hero-select-bomb').textContent = localText(p.bombLabel || '');
      root.querySelector('.hs-glyph').textContent = p.shot && p.shot.style === 'clock-hands' ? '時' : '憶';
      var abilities = el('hero-select-abilities'); abilities.textContent = '';
      (p.abilities || []).forEach(function (text) { var li = doc.createElement('li'); li.textContent = localText(text); abilities.appendChild(li); });
      portrait.alt = localText('{name} 초상',{name:localText(p.name)}); portrait.hidden = !p.portrait;
      root.querySelector('.hs-image-state').hidden = true;
      if (p.portrait) portrait.src = inkArt(p); // 수묵 화면에서는 먹빛 컷인(없으면 원래 초상)
      IDS.forEach(function (heroId) { el('hero-select-' + heroId).setAttribute('aria-pressed', String(heroId === selected)); });
      (function spinWheel() {
        var n = IDS.length, idx = IDS.indexOf(selected), step = 360 / n, delta = 0;
        if (wheel.idx != null) { delta = ((idx - wheel.idx) % n + n) % n; if (delta > n / 2) delta -= n; }
        wheel.idx = idx; wheel.turn = wheel.turn == null ? 270 - idx * step : wheel.turn - delta * step;
        if (root.style && root.style.setProperty) root.style.setProperty('--hs-turn', wheel.turn + 'deg');
        wheelMarks.forEach(function (m) { if (m.classList) m.classList.toggle('is-on', m.getAttribute('data-hero') === selected); });
      })();
      stage.classList.remove('is-revealing');
      if (visible) { void stage.offsetWidth; stage.classList.add('is-revealing'); }
      return selected;
    }
    function hide() {
      if (!visible) return;
      visible = false; root.hidden = true; stage.classList.remove('is-revealing');
      doc.removeEventListener('keydown', keydown, true);
      onConfirm = null; onCancel = null;
      if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    function confirm() { if (!visible) return; var callback = onConfirm, id = selected; hide(); if (callback) callback(id); }
    function cancel() { if (!visible) return; var callback = onCancel; hide(); if (callback) callback(); }
    function keydown(event) {
      if (!visible || event.altKey || event.ctrlKey || event.metaKey) return;
      var key = event.key;
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault(); event.stopImmediatePropagation();
        var direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
        select(IDS[(IDS.indexOf(selected) + direction + IDS.length) % IDS.length]);
        el('hero-select-' + selected).focus({ preventScroll: true });
      } else if (key === 'Enter') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.repeat) return;
        if (event.target === el('hero-select-cancel')) cancel(); else confirm();
      } else if (key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); cancel();
      } else if (key === ' ' || key === 'Spacebar') {
        event.stopImmediatePropagation(); // Preserve native button activation without forwarding to gameplay.
      } else if (key === 'Tab') {
        var buttons = IDS.map(function (id) { return el('hero-select-' + id); }).concat([el('hero-select-cancel'), el('hero-select-confirm')]);
        var index = buttons.indexOf(doc.activeElement), next = event.shiftKey ? index - 1 : index + 1;
        if (index < 0 || next < 0 || next >= buttons.length) {
          event.preventDefault(); buttons[event.shiftKey ? buttons.length - 1 : 0].focus({ preventScroll: true });
        }
        event.stopImmediatePropagation();
      }
    }
    function show(id, confirmCallback, cancelCallback) {
      if (visible) hide();
      populateChoices(); previousFocus = doc.activeElement; onConfirm = confirmCallback; onCancel = cancelCallback;
      visible = true; root.hidden = false; select(id);
      doc.addEventListener('keydown', keydown, true);
      el('hero-select-' + selected).focus({ preventScroll: true });
    }
    IDS.forEach(function (id) {
      el('hero-select-' + id).addEventListener('click', function () { select(id); });
      el('hero-select-' + id).querySelector('img').addEventListener('error', function (event) { event.target.hidden = true; });
    });
    portrait.addEventListener('load', function () { portrait.hidden = false; root.querySelector('.hs-image-state').hidden = true; });
    portrait.addEventListener('error', function () { portrait.hidden = true; root.querySelector('.hs-image-state').hidden = false; });
    el('hero-select-confirm').addEventListener('click', confirm);
    el('hero-select-cancel').addEventListener('click', cancel);
    function refreshLanguage() {
      paintLabels();populateChoices();if(visible)select(selected);
    }
    refreshLanguage();
    var controller = { show: show, hide: hide, select: select, refreshLanguage: refreshLanguage };
    host.__hapilHeroSelect = controller;
    return controller;
  }
  var api = { mount: mount };
  global.HapilHeroSelect = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
