'use strict';
// 큰 육망성 2차(7전문가 심사 5.81): 철사 도형이 아니라 마법진으로 읽히게 하되, 맞는 것은 육망성 선뿐이다.
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const app=h.read('src/arcade-app-v43.js');
test('big hexagram is framed as a magic circle: rune rings on the vertex circle and the inner circle, vertex nodes',()=>{
  assert(/function drawSigilFrame\(/.test(app),'frame helper');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];
  assert(/runeRings|buildRuneRing/.test(fr),'reuses the rune ring art');
  assert(/Math\.sqrt\(3\)/.test(fr),'inner circle through the inner hexagon');
  assert(/SIGIL_NODE/.test(fr),'vertex nodes');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/drawSigilFrame\(/.test(fig),'frame drawn with the sigil');
});
test('live hexagram reads as a hazard: flowing energy, heavy dark underlay, fades under the top HUD',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/lineDashOffset/.test(fig),'energy flows along the lines');
  assert(+/SIGIL_UNDER=([\d.]+)/.exec(app)[1]>=2.2,'underlay at least 2.2x the line');
  assert(+/SIGIL_UNDER_ALPHA=([\d.]+)/.exec(app)[1]>=.6,'underlay opaque enough');
  assert(/sigilFade\(/.test(fig)&&/function sigilFade\(c\)\{var g=ctx\.createLinearGradient\(0,0,0,SIGIL_TOP_FADE\)/.test(app),'fades near the top HUD');
});
test('big hexagram takes the boss colour, glows wider, and other lasers step back while it is live (round 2 review 6.13)',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/bossTint\(s\)/.test(fig),'boss colour, not one pink for every boss');
  assert(/SIGIL_BLOOM/.test(fig),'wide soft bloom under the live lines');
  const las=/function drawLasers\(s\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/LASER_UNDER_SIGIL/.test(las),'other lasers dim while the hexagram is live');
  assert(+/LASER_UNDER_SIGIL=([\d.]+)/.exec(app)[1]>=.3,'dimmed lasers stay readable');
});
test('gold or white bosses turn the hexagram glow cool so it parts from same-coloured bullets; it flashes as it goes live (round 3 review 6.36)',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/cool=paleOf\(color\);[^\n]*if\(cool\)color=[^\n]*mix\(color,SIGIL_COOL/.test(fig),'pale boss colour shifted cool');
  assert(/SIGIL_IGNITE/.test(fig),'ignite flash when the lines go live');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];
  assert(/f\.r\/Math\.sqrt\(3\)[\s\S]*for\(q=0;q<6;q\+\+\)/.test(fr),'nodes on the inner hexagon too');
});
test('round 4 review 6.43: boss stays the focus over the live hexagram, field edges soften, rays step further back',()=>{
  assert(/function hushSigil\(s\)/.test(app),'darkens around the boss and the field edges over the live hexagram');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/if\(sigils\)hushSigil\(s\)/.test(fig),'only after the sigil layer, which is under the boss');
  assert(+/SIGIL_CORE=([\d.]+)/.exec(app)[1]<=.85,'core no longer the brightest thing on screen');
  assert(+/LASER_UNDER_SIGIL=([\d.]+)/.exec(app)[1]<=.5,'rays step back further');
});
test('round 5 review 6.47: every live layer (underlay, core, flow, ignite) fades toward the top HUD, not just the glow',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert((fig.match(/sigilFade\(/g)||[]).length>=5,'underlay, glow, core, flow and ignite all fade');
});
test('round 6 review 6.49: light falls off away from the boss, decoration rings step back, pale bosses get a tinted core',()=>{
  const mask=/function maskSigil\(f\)[\s\S]*?\n  \}/.exec(app)[0]; // 10차부터 바깥 감쇠는 배경을 덮지 않고 선 자체에서 뺀다
  assert(/createRadialGradient\(f\.cx,f\.cy,R\*\.5,f\.cx,f\.cy,R\)/.test(mask),'outer falloff');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];
  assert(+/live\?([\d.]+):/.exec(fr)[1]<=.4,'rune rings quieter than the lines');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/cool\?\.45:/.test(fig),'pale bosses: tinted core so white bullets stay apart');
});
test('round 9 review 6.60: the hexagram turns its hue away from the boss bullets, inner star brighter, pool tinted',()=>{
  const src=/function sigilHue\(c\)[\s\S]*?\n/.exec(app);assert(src,'sigilHue helper');
  const sigilHue=new Function(src[0]+';return sigilHue;')();
  const hue=c=>{const n=parseInt(c.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;if(!d)return 0;
    let h=M===r?((g-b)/d)%6:M===g?(b-r)/d+2:(r-g)/d+4;return (h*60+360)%360;};
  const gap=(a,b)=>{const d=Math.abs(hue(a)-hue(b))%360;return Math.min(d,360-d);};
  for(const c of ['#ff3b4e','#3fdc82','#a45cff','#2fd0ff'])assert(gap(sigilHue(c),c)>=30,c+' -> '+sigilHue(c)+' still the bullet hue');
  assert(hue(sigilHue('#3fdc82'))>70&&hue(sigilHue('#3fdc82'))<120,'green boss -> lime, away from the hero\'s cyan (round 14: teal read as the hero colour)');
  assert(hue(sigilHue('#ff3b4e'))>290&&hue(sigilHue('#ff3b4e'))<340,'red boss -> magenta');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];assert(/sigilHue\(/.test(fig),'used for the live hexagram');
  assert(+/SIGIL_NODE=([\d.]+)/.exec(app)[1]>=8,'bigger nodes so the star reads when clipped');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];assert(/q\?SIGIL_INNER:1/.test(fr),'inner ring brighter');
  const hush=/function hushSigil\(s\)[\s\S]*?\n  \}/.exec(app)[0];assert(/bossTint\(s\)/.test(hush),'pool tinted with the boss colour');
});
test('round 10 review 6.60: light falls off on the lines themselves (not a black veil over the stage), lines fade out at the field edges, pale bosses get a clean ice blue',()=>{
  const mask=/function maskSigil\(f\)[\s\S]*?\n  \}/.exec(app)[0];
  assert((mask.match(/destination-in/g)||[]).length>=1,'mask is applied to the sigil layer only');
  assert(/createLinearGradient\(0,0,W,0\)/.test(mask),'left/right edge fade on the lines');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/sigLayer/.test(fig)&&/maskSigil\(/.test(fig),'sigil drawn on its own layer, then masked');
  const hush=/function hushSigil\(s\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(!/fillRect\(0,0,W,H\)/.test(hush),'no full-field darkening: the stage stays visible');
  const n=parseInt(/SIGIL_COOL='#([0-9a-f]{6})'/.exec(app)[1],16),r=n>>16&255,g=n>>8&255,b=n&255;
  assert(Math.max(r,g,b)-Math.min(r,g,b)>=170,'ice blue is saturated, not grey-green');
  assert(/mix\(color,SIGIL_COOL,\.9/.test(fig),'pale bosses: almost pure ice blue');
});
test('round 11 review 6.66: the damaging core stays visible everywhere (glow fades, core does not), pale-white bosses go violet, inner hexagon faintly filled',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/SIGIL_SAFE_CORE/.test(fig),'unmasked core pass after the masked layer');
  assert(+/SIGIL_SAFE_CORE=([\d.]+)/.exec(app)[1]>=.7,'core at least 70% even where the glow fades');
  assert(fig.indexOf('SIGIL_SAFE_CORE')>fig.indexOf('drawImage(sigLayer'),'core drawn after the masked layer');
  assert(/SIGIL_VIOLET/.test(fig),'white bosses get violet, gold bosses ice blue');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];assert(/SIGIL_FILL/.test(fr)&&/\.fill\(\)/.test(fr),'inner hexagon fill');
  assert(+/SIGIL_FILL=([\d.]+)/.exec(app)[1]<=.15,'fill stays faint (12% after round 12)');
});
test('round 12 review 6.70: inner shape reads, edges fade wider, nodes stay out of the HUD band, flow visible',()=>{
  assert(+/SIGIL_FILL=([\d.]+)/.exec(app)[1]>=.1,'inner hexagon fill visible');
  assert(+/SIGIL_EDGE_W=([\d.]+)/.exec(app)[1]>=60,'wider edge fade');
  assert(+/SIGIL_INNER=([\d.]+)/.exec(app)[1]>=1.5,'inner ring brighter');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];assert(/SIGIL_HUD_Y/.test(fr),'nodes fade under the HUD band');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];assert(/SIGIL_FLOW/.test(fig)&&+/SIGIL_FLOW=([\d.]+)/.exec(app)[1]>=.38,'flow pulse visible');
});
test('round 13 review 6.70: crossings no longer the brightest spot, core thins at the field edges, inner hexagon drawn as a dashed decoration, clean violet',()=>{
  const mask=/function maskSigil\(f\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/destination-out/.test(mask)&&/SIGIL_KNOT/.test(mask),'glow pulled back at the inner-hexagon crossings');
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/SIGIL_CORE_EDGE/.test(fig),'damaging core dims (not vanishes) at the field edges');
  const e=+/SIGIL_CORE_EDGE=([\d.]+)/.exec(app)[1];assert(e>=.45&&e<1,'edge core stays visible');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];assert(/setLineDash\(\[/.test(fr),'dashed inner hexagon outline (decoration, unlike the solid damaging lines)');
  assert(/mix\(c0,SIGIL_VIOLET,\.9[5-9]/.test(fig),'violet not muddied by gold');
});
test('round 14 review 6.70: gold bosses keep a wide gold rim, inner outline is dotted runes (not the dashed warning look)',()=>{
  const fig=/function drawFigures\(s,sigils\)[\s\S]*?\n  \}/.exec(app)[0];
  assert(/SIGIL_RIM_W/.test(fig)&&+/SIGIL_RIM_W=([\d.]+)/.exec(app)[1]>=2,'wide boss-colour rim on pale bosses');
  const fr=/function drawSigilFrame\([\s\S]*?\n  \}/.exec(app)[0];assert(/setLineDash\(\[1,/.test(fr),'dotted inner outline');
});
