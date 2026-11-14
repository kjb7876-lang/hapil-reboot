'use strict';
/* 7전문가 심사 11-14(6.31·6.33): 문양 레이저·같은 색 탄·보스가 한 층에 겹쳐 보스 윤곽이 묻힌다.
   문양은 보스 뒤 층에 그리고, 판정 있는 다른 레이저보다 채도를 한 단계 낮춘다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

test('v43 sigils are drawn behind the boss, other figures stay above it',()=>{
 const app=h.read('src/arcade-app-v43.js'),line=/drawBackground\(s\);[^\n]*/.exec(app)[0];
 const sig=line.indexOf('drawFigures(s,true)'),boss=line.indexOf('drawBoss(s)'),rest=line.indexOf('drawFigures(s);');
 assert(sig>=0&&sig<boss,'sigils before the boss');assert(rest>boss,'zigzags and sprays after the boss');
});

test('v43 sigil lasers use a muted version of their colour',()=>{
 const app=h.read('src/arcade-app-v43.js'),fn=/function drawFigures[\s\S]*?\n  \}/.exec(app)[0];
 assert(/SIGIL_MUTE/.test(fn),'muted colour for sigils');assert(/f\.sigil/.test(fn),'sigils are told apart');
});

test('v43 gold bullets count as pale too: dark outer rim and weak halo (greed boss gold over-exposure, review 11-14)',()=>{
 const app=h.read('src/arcade-app-v43.js'),fn=/function paleOf[\s\S]*?\}/.exec(app)[0],cut=+/\)>(\d+);/.exec(fn)[1];
 const gold=0xffd23e,lum=((gold>>16)&255)*.299+((gold>>8)&255)*.587+(gold&255)*.114;assert(lum>cut,'gold '+lum.toFixed(0)+' > '+cut);
 const red=0xff3b4e,rl=((red>>16)&255)*.299+((red>>8)&255)*.587+(red&255)*.114;assert(rl<=cut,'red stays a bright-rim colour');
});

test('v43 boss backlight is gentler behind bright (gold/white) themes so the boss does not sit in a white-hot disc',()=>{
 const app=h.read('src/arcade-app-v43.js'),fn=/function drawBoss\(s\)[\s\S]*?\n  \}/.exec(app)[0];
 assert(/BACKLIGHT_BRIGHT/.test(fn),'bright themes use a weaker backlight');
});

test('v43 retry (review 6.36): gold/white beam lasers glow less, and the hero sits on a dark halo so it never vanishes between beams',()=>{
 const app=h.read('src/arcade-app-v43.js'),las=/function drawLasers[\s\S]*?\n  \}/.exec(app)[0],pl=/function drawPlayer[\s\S]*?\n  \}/.exec(app)[0];
 assert(/PALE_BEAM_DIM/.test(las),'pale beams are dimmed');assert(/PLAYER_SHADE/.test(pl),'hero has a dark halo behind it');
});

test('v43 retry 2 (review 6.36 again): every beam colour is toned down, every orb gets a dark outer rim, sigils are faint, the hero is marked',()=>{
 const app=h.read('src/arcade-app-v43.js'),las=/function drawLasers[\s\S]*?\n  \}/.exec(app)[0],orb=/function buildOrb[\s\S]*?\n  \}/.exec(app)[0],fig=/function drawFigures[\s\S]*?\n  \}/.exec(app)[0],pl=/function drawPlayer[\s\S]*?\n  \}/.exec(app)[0];
 assert(/BEAM_DIM/.test(las.replace(/PALE_BEAM_DIM/g,'')),'all beams dimmed');
 assert(/OUTER_RIM/.test(orb),'all orbs get a dark outer rim');
 assert(/SIGIL_ALPHA/.test(fig),'sigils drawn faint');
 assert(/HERO_RING/.test(pl),'hero has a bright marker ring');
});

test('v43 retry 3 (review 6.44): warm beams as calm as gold ones, bright boss art dimmed during spells, hero marker bolder',()=>{
 const app=h.read('src/arcade-app-v43.js');
 assert(+/BEAM_DIM=([\d.]+)/.exec(app.replace(/PALE_BEAM_DIM=[\d.]+/,''))[1]<=.5,'every beam at half glow');
 const boss=/function drawBoss\(s\)[\s\S]*?\n  \}/.exec(app)[0];assert(/BRIGHT_ART_DIM/.test(boss),'bright boss art is dimmed during spells');
 assert(+/HERO_RING_WIDTH=([\d.]+)/.exec(app)[1]>=2,'hero ring at least 2px');
});
