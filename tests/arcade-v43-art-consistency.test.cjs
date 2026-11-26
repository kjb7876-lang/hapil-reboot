'use strict';
/* 사용자 11-17: "12스테이지에 나오는 일반몹중 이미지모션간일관성이없는것, 보스,몹모두 조사해서 모든일관성있는 것들만 사용해줘".
 * 실제로 쓰이는 몹·중간보스·보스의 걷기·옆·공격 그림이 한 인물·한 화풍으로 이어지는지 본다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadImage,createCanvas}=require('@napi-rs/canvas');
const {createHash}=require('node:crypto');
const root=path.join(__dirname,'..'),A=require('../src/arcade-v43.js'),skins=require('../src/arcade-skins-v43.js');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43/manifest.json'),'utf8'));
const recast=JSON.parse(fs.readFileSync(path.join(root,'docs/v43/mob-recast.json'),'utf8'));
function used(){const keys=new Set();
 A.STAGES.forEach((g,i)=>{const list=(skins.front[g.scene]&&skins.front[g.scene].length?skins.front[g.scene]:skins.scenes[g.scene])||g.cast||[];
  list.slice(0,Math.max((g.cast||[]).length,1)).forEach(k=>keys.add(k));
  A.SEGMENTS.forEach(s=>{if(s.stage===i&&s.kind==='card')keys.add(s.actor);});});
 return [...keys];}
const strips=()=>used().flatMap(k=>['side','attack'].map(m=>k+'@'+m+'.webp')).filter(n=>manifest[n]);

test('v43 art consistency: a mob whose attack is a different creature never attacks with it',()=>{
 for(const k of Object.keys(recast.noAttack).filter(k=>k!=='*'))assert(!manifest[k+'@attack.webp']&&!(manifest[k+'.webp'].motions||[]).includes('attack'),k);
});
test('v43 art consistency: every motion strip in play has at least two frames (no single still popping in)',()=>{
 for(const n of strips())assert(manifest[n].frames>=2,n+' has '+manifest[n].frames+' frame');
});
test('v43 art consistency: no figure is cut across two cells of a strip',async()=>{
 const bad=[];
 for(const n of used().flatMap(k=>['','@side','@attack'].map(m=>k+m+'.webp')).filter(n=>manifest[n]&&manifest[n].frames>1)){
  const e=manifest[n],img=await loadImage(path.join(root,'media/arcade-v43',n)),c=createCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data,col=cx=>{let s=0;for(let y=0;y<img.height;y+=2)if(d[(y*img.width+cx)*4+3]>40)s++;return s;};
  let cross=0;for(let i=1;i<e.frames;i++){const cx=i*e.cell[0];if(col(cx-1)>3&&col(cx)>3)cross++;}
  if(cross>1)bad.push(n);
 }
 assert.deepEqual(bad,[]);
});
test('v43 art consistency: bosses with a different legacy form use attacks drawn for their current form',()=>{
 for(const k of ['p2_chairman','p2_beelzebub','p2_wrath']){
  assert.equal(manifest[k+'@attack.webp'].source,'media/boss-art-v43/'+k+'-attack.webp');
 }
 for(const k of ['lucifer','mask','balrog'])assert(/-tone\.webp$/.test(manifest[k+'@attack.webp'].source),k+' attack is colour-matched to its walk sheet');
});
test('every arcade boss can move and attack, and scene 37 has its own character art',()=>{
 const actors=new Set(A.SEGMENTS.filter(s=>s.kind==='card').map(s=>s.actor));
 for(const actor of actors){
  const base=manifest[actor+'.webp'],attack=manifest[actor+'@attack.webp'];
  assert(base.frames>=2,actor+' movement');
  assert(base.motions.includes('attack')&&attack.frames>=2,actor+' attack');
 }
 for(const action of ['','@attack']){
  const art=manifest['p5_cult'+action+'.webp'];
  assert.notEqual(art.sourceSha256,manifest['p3_rampart'+action+'.webp'].sourceSha256);
 }
});

test('the nightmare captain has distinct full-body frames for marching, orders, recoil and defeat',async()=>{
 const actor='p6_nightmare_captain',motions=manifest[actor+'.webp'].motions;
 assert.deepEqual(new Set(motions),new Set(['side','attack','hit','death']));
 assert.equal(manifest[actor+'@side.webp'].facing,'right');
 const fingerprints=new Set();
 for(const motion of ['',...motions]){
  const name=actor+(motion?'@'+motion:'')+'.webp',entry=manifest[name];
  const image=await loadImage(path.join(root,'media/arcade-v43',name));
  const [w,h]=entry.cell,ctx=createCanvas(w,h).getContext('2d');
  assert.equal(entry.frames,4,name);
  assert.deepEqual([image.width,image.height],[w*entry.frames,h],name);
  for(let frame=0;frame<entry.frames;frame++){
   ctx.clearRect(0,0,w,h);
   ctx.drawImage(image,frame*w,0,w,h,0,0,w,h);
   const pixels=ctx.getImageData(0,0,w,h).data;
   let ink=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]>64)ink++;
   assert(ink>w*h*.01,name+' frame '+frame+' contains a visible drawing');
   fingerprints.add(createHash('sha256').update(pixels).digest('hex'));
  }
 }
 assert.equal(fingerprints.size,20,'each motion has its own four drawings');
});

test('v43 art consistency: the cartoon slime is out of every scene',()=>{
 for(const [scene,list] of Object.entries(skins.front))for(const k of Object.keys(recast.style))assert(!list.includes(k),scene+' '+k);
});
test('v43 art consistency: a mob picture never shows up in a map of another theme (user 11-17)',()=>{
 const table=JSON.parse(fs.readFileSync(path.join(root,'docs/v43/m0-mobs.json'),'utf8')).scenes;
 const POOL=[['kair',/^kair/],['u2',/^u2/],['murder',/^murder/],['goblin',/^last30[45]$/]];
 const ros=s=>JSON.stringify((table[s]?table[s].mobs:[]).map(x=>x.m0Id).sort());
 const group=s=>{const mp=table[s]&&table[s].map||s;for(const [n,r] of POOL)if(r.test(mp))return n;if(!table[s]||!table[s].mobs.length)return s;return Object.keys(table).find(x=>ros(x)===ros(s));};
 const seen={},bad=[];
 A.STAGES.forEach((g,i)=>{const list=(skins.front[g.scene]&&skins.front[g.scene].length?skins.front[g.scene]:skins.scenes[g.scene])||g.cast||[];
  const keys=list.slice(0,Math.max((g.cast||[]).length,1)).concat([...new Set(A.SEGMENTS.filter(s=>s.stage===i&&s.kind==='card'&&A.ACTORS[s.actor].midboss).map(s=>s.actor))]);
  for(const k of keys){const e=manifest[k+'.webp'];if(!e)continue;const was=seen[e.source];if(was&&was.group!==group(g.scene))bad.push(k+' in '+g.scene+' and '+was.key+' in '+was.scene);seen[e.source]=seen[e.source]||{group:group(g.scene),key:k,scene:g.scene};}
 });
 assert.deepEqual(bad,[]);
 for(const [s,keys] of Object.entries(skins.scenes)){const own=new Set(table[s].mobs.map(m=>'m0_'+m.m0Id.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')));
  const lent=new Set([...(skins.borrowed[s]||[])]);for(const k of keys.slice(0,3))assert(own.has(k)||(lent.has(k)&&POOL.some(([,r])=>r.test(table[s].map))),s+': '+k+' is a mob of this map (or of its own theme pool)');}
});
