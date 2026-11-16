'use strict';
// 솟는 먹 그림의 바탕은 비친다(사용자 11-16 "주사기그림도 배경처리해서 배경이 나오게 지금은 배경이 가려지네", "앵간한거 다 배경처리해").
// 한지·흰빛으로 칠한 면(주사기 몸통 등)은 투명해지고 먹 획은 그대로 남는다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'src/ink-motifs-v43.js'),'utf8'),app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
function motifs(){const g={document:{createElement(){return {getContext(){return {};}};}}};g.window=g;vm.runInNewContext(src,g);return g.InkMotifs;}
const px=(r,gr,b,a)=>new Uint8ClampedArray([r,gr,b,a]);
test('paper and white fills become see-through while ink stays',()=>{
  const M=motifs();assert.equal(typeof M.seeThrough,'function');
  const paper=px(252,249,243,237);M.seeThrough(paper);assert(paper[3]<40,'paper fill should vanish, alpha '+paper[3]);
  const hanji=px(242,233,214,255);M.seeThrough(hanji);assert(hanji[3]<60,'hanji fill should vanish, alpha '+hanji[3]);
  const ink=px(30,26,24,240);M.seeThrough(ink);assert(ink[3]>=230,'dark ink stays, alpha '+ink[3]);
  const mid=px(120,110,104,200);M.seeThrough(mid);assert(mid[3]>120,'mid ink mostly stays, alpha '+mid[3]);
});
test('every riser picture goes through the see-through pass',()=>{
  const m=/function riserSprite\(r\)\{([\s\S]*?)\n  function drawRisers/.exec(app);assert(m,'riserSprite');
  assert.match(m[1],/M\.seeThrough\(/,'riserSprite clears the paper fills');
});
test('no paper halo is laid under a risen picture (the background shows around it)',()=>{
  const app=require('fs').readFileSync(require('path').join(__dirname,'..','src','arcade-app-v43.js'),'utf8'),at=app.indexOf('function drawRisers('),b=app.slice(at,app.indexOf('function drawInkBurst(',at));
  require('node:assert/strict').doesNotMatch(b,/rgba\(242,233,214,\.62\)/);
});
