#!/usr/bin/env node
'use strict';
/* v43 부별 자가 점검. 실행: node tools/check-part-v43.cjs <부 번호>
 * 전체 완료 조건(tests/arcade-v43.test.cjs)을 한 부에 한정해 미리 본다. 문제를 모두 찍고, 있으면 1로 끝난다. */
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const part=Number(process.argv[2]);if(!(part>=1&&part<=8)){console.error('usage: node tools/check-part-v43.cjs <1-8>');process.exit(2);}
const a=require('../src/arcade-v43.js'),problems=[],bad=m=>problems.push(m);
const NEED_ACTORS={1:4,2:6,3:2,4:1,5:4,6:1,7:2,8:1},BOSS={1:['02','03','07','11'],2:['14','15','16','17','18','19','20','21','22'],3:['26','29'],4:['32','33','35'],5:['40','45','46'],6:['48','50'],7:['55'],8:['60','61']};
const FX=['spores','embers','ash','rain','snow','mist','dust','petals','sparks','static','bubbles','leaves','sand','paper','motes','drip'];
const mine=a.STAGES.filter(g=>g.part===part),def=require('../src/arcade-parts-v43/p'+part+'.js'),names=new Map(),rewardKeys=new Set(),art=f=>fs.existsSync(path.join(root,'media/arcade-v43',f))?fs.statSync(path.join(root,'media/arcade-v43',f)).size:-1;
a.SEGMENTS.forEach(x=>{if(x.spell){if(names.has(x.name))bad('pattern name twice: '+x.name+' ('+a.STAGES[x.stage].name+' / '+a.STAGES[names.get(x.name)].name+')');names.set(x.name,x.stage);}});
let total=0;const bgs=new Set(),fx=new Set(),actors=new Set();
mine.forEach((g,n)=>{
 const segs=a.SEGMENTS.filter(x=>x.stage===g.index),code=segs.map(x=>x.kind==='wave'?'W':x.mid?'M':'B').join(''),where=g.scene+' '+g.name+': ';
 if(g.placeholder)bad(where+'still a placeholder');
 if(BOSS[part].includes(g.scene)&&g.kind!=='boss')bad(where+'must be a boss stage');
 if(g.kind==='boss'){if(!/^W+M+W+B+$/.test(code))bad(where+'boss stage flow '+code);if(segs.filter(x=>x.spell&&!x.mid).length<3)bad(where+'a boss needs three named patterns');}
 else if(!/^W{2,}M+$/.test(code))bad(where+'road stage flow '+code);
 for(const x of segs.filter(x=>x.kind==='card')){actors.add(x.actor);if(!(x.time>0&&x.time<=40&&x.hp>0))bad(where+'card time/hp');if(x.spell&&!(x.name.length>=2&&x.name.length<=12))bad(where+'pattern name length: '+x.name);}
 for(const x of segs.filter(x=>x.kind==='wave'))if(!(x.duration>=300))bad(where+'wave duration');
 if(!(g.seconds>=70&&g.seconds<=420))bad(where+'nominal length '+Math.round(g.seconds)+'s (70 to 420)');total+=g.seconds;
 const t=g.theme||{};if(!/^#[0-9a-f]{6}$/.test(t.tint||''))bad(where+'tint');if(!FX.includes(t.fx))bad(where+'fx '+t.fx);if(!String(t.bg||'').startsWith('p'+part+'_'))bad(where+'bg key must start with p'+part+'_');
 if(bgs.has(t.bg))bad(where+'background used twice in the part');bgs.add(t.bg);fx.add(t.fx);
 if(n){const p=mine[n-1].theme;if(t.tint===p.tint&&t.fx===p.fx)bad(where+'same tint and weather as the previous stage');}
 if(art('bg-'+t.bg+'.jpg')<0)bad(where+'missing art bg-'+t.bg+'.jpg');else if(art('bg-'+t.bg+'.jpg')>=130000)bad(where+'background file too large');
 if(!g.cast.length)bad(where+'cast');
 const r=g.reward||{};if(!r.key||!String(r.key).startsWith('p'+part+'_'))bad(where+'reward key must start with p'+part+'_');if(!(r.name&&r.name.length>=2&&r.name.length<=10))bad(where+'reward name 2 to 10 characters');
 if(rewardKeys.has(r.key))bad(where+'reward key twice');rewardKeys.add(r.key);if(art('reward-'+r.key+'.webp')<0)bad(where+'missing art reward-'+r.key+'.webp');else if(art('reward-'+r.key+'.webp')>=40000)bad(where+'reward art too large');
});
if(mine[mine.length-1].kind!=='boss')bad('the part must end on a boss stage');
const avg=total/mine.length;if(!(avg>=185&&avg<=235))bad('average nominal stage length '+Math.round(avg)+'s (185 to 235 needed)');
if(fx.size<Math.min(4,mine.length))bad('weather kinds in the part: '+fx.size);
const fresh=Object.keys(def.actors||{});if(fresh.length<NEED_ACTORS[part])bad('new actors: '+fresh.length+' (need '+NEED_ACTORS[part]+')');
for(const k of fresh){if(!k.startsWith('p'+part+'_'))bad('new actor key must start with p'+part+'_: '+k);if(!actors.has(k))bad('actor never appears: '+k);}
if(Object.keys(def.mobs||{}).length<2)bad('add at least two new mob kinds');
for(const k of [...fresh,...Object.keys(def.mobs||{}),...(def.props||[]).map(p=>p.key)]){if(art(k+'.webp')<0)bad('missing art '+k+'.webp');else if(art(k+'.webp')>=90000)bad('art too large '+k);}
for(const k of Object.keys(def.mobs||{})){if(!k.startsWith('p'+part+'_'))bad('new mob key must start with p'+part+'_: '+k);if(!mine.some(g=>g.cast.includes(k)))bad('mob never in a cast: '+k);}
const table=path.join(root,'tools/arcade-art-v43/p'+part+'.json');if(!fs.existsSync(table))bad('missing tools/arcade-art-v43/p'+part+'.json');
console.log('part '+part+': '+mine.length+' stages, '+mine.filter(g=>g.kind==='boss').length+' boss stages, '+a.SEGMENTS.filter(x=>x.spell&&a.STAGES[x.stage].part===part).length+' named patterns, nominal '+Math.round(total)+'s (avg '+Math.round(avg)+'s), '+bgs.size+' backgrounds, weather '+[...fx].join(' '));
for(const p of problems)console.log('PROBLEM '+p);
process.exit(problems.length?1:0);
