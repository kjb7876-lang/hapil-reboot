'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const bank=require('../src/rain-hit-bank-v43.js');globalThis.HapilRainHit=bank;
const audio=require('../src/audio-v37.js');
function ctxFactory(){const starts=[],gains=[];const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=x=>Object.assign({connect(){},disconnect(){}},x);
 const ctx={state:'running',currentTime:0,sampleRate:44100,destination:{},resume(){return Promise.resolve();},
  createGain(){const g=node({gain:param()});gains.push(g);return g;},createDynamicsCompressor(){return node({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});},
  createBuffer(c,n){const d=new Float32Array(n);return {getChannelData:()=>d};},
  createBufferSource(){const s=node({playbackRate:{value:1},start(at,off,dur){starts.push({off,dur,rate:this.playbackRate.value,gain:gains[gains.length-1].gain.value});this.onended&&this.onended();},stop(){}});return s;},
  createOscillator(){return node({frequency:param(),start(){},stop(){}});},createBiquadFilter(){return node({frequency:param(),Q:param()});},createStereoPanner(){return node({pan:param()});}};
 return {ctx,starts,Ctor:function(){return ctx;}};}
test('rain bank: 8 short clips per hero, soft peaks, small file',()=>{
 for(const n of ['memory','seoha']){const d=bank.decode(n);assert.equal(d.count,8);let m=0;for(const v of d.samples)m=Math.max(m,Math.abs(v));assert(m>.3&&m<=1);}
 assert(bank.decode('memory').len/bank.bank.rate<.1,'기억사수 조각은 짧고');assert(bank.decode('seoha').len>bank.decode('memory').len*2,'서하 조각은 더 길게');
 assert(fs.statSync(__dirname+'/../src/rain-hit-bank-v43.js').size<60000);
});
test('rain hit cues alternate clips, vary pitch/volume, and are throttled',()=>{
 for(const name of ['rainHitMemory','rainHitSeoha']){
  const f=ctxFactory();let t=0;const fx=audio.create({AudioContext:f.Ctor,now:()=>t});fx.unlock();const seen=new Set();let prev=-1;
  for(let i=0;i<40;i++){t+=200;assert(fx.play(name,0),name);const k=Math.round(f.starts[i].off/(bank.decode(name==='rainHitSeoha'?'seoha':'memory').len/bank.bank.rate));assert.notEqual(k,prev,'같은 조각 연속 금지');prev=k;seen.add(k);}
  assert(seen.size>=6,'조각 골고루');
  assert(f.starts.every(s=>s.rate>=.94&&s.rate<=1.06));assert(new Set(f.starts.map(s=>s.gain.toFixed(3))).size>5,'음량 변화');
  t+=10;assert.equal(fx.play(name),false,'최소 간격');
 }
 assert(audio.CUES.rainHitMemory.level<audio.CUES.bomb.level&&audio.CUES.rainHitMemory.rank<4,'위험음보다 작고 버려도 되는 우선순위');
});
