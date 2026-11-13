'use strict';
/* v43 지역별 몹 그림: 장면마다 m0 지역표의 몹이 나오고, 조형물을 잡몹으로 쓰지 않으며, 점수 아이템은 하트다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),{root}=h;
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));

test('v43 skins: most scenes draw the mobs of their own m0 map, every picture exists and stays small',()=>{
 const a=h.need(),skins=require(path.join(root,'src/arcade-skins-v43.js')),manifest=json('media/arcade-v43/manifest.json'),table=json('docs/v43/m0-mobs.json');
 const scenes=new Set(a.STAGES.map(g=>g.scene));
 for(const s of Object.keys(skins.scenes))assert(scenes.has(s),'scene '+s);
 assert(Object.keys(skins.scenes).length>=50,'scenes with map mobs: '+Object.keys(skins.scenes).length);
 const used=new Set(Object.values(skins.scenes).flat());assert(used.size>=90,'distinct map mobs: '+used.size);
 for(const key of used){
  const e=manifest[key+'.webp'];assert(e,'art '+key);assert.equal(e.group,'mobs');assert(e.frames>=2,key+' moves');assert(e.bytes<90000,key+' stays small');
  for(const m of e.motions||[]){const x=manifest[key+'@'+m+'.webp'];assert(x&&x.frames>=1&&x.bytes<90000,key+'@'+m);assert(fs.existsSync(path.join(root,'media/arcade-v43',key+'@'+m+'.webp')));}
  assert(skins.names[key],'name of '+key);
 }
 assert([...used].filter(k=>(manifest[k+'.webp'].motions||[]).includes('attack')).length>=60,'mobs with an attack motion');
 // 빌린 그림이 아니면 그 장면의 m0 지도에 있는 몹이어야 한다.
 const slug=id=>'m0_'+id.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
 for(const [s,keys] of Object.entries(skins.scenes)){const own=new Set(table.scenes[s].mobs.map(m=>slug(m.m0Id))),lent=new Set(skins.borrowed[s]||[]);for(const k of keys)assert(own.has(k)||lent.has(k),s+': '+k+' belongs to this map');}
});

test('v43 skins: no structure or scenery picture stands in for a mob, and side-facing strips say which way they look',()=>{
 const manifest=json('media/arcade-v43/manifest.json');
 for(const [name,e] of Object.entries(manifest)){
  if(e.group!=='mobs')continue;
  assert(!/drive-v43\/00|oak|tile|structure/.test(e.source),name+' uses '+e.source);
  if(/media\/m0-v43\/[^/]+-(move|attack)\.webp$/.test(e.source))assert.equal(e.facing,'right',name);
 }
 for(const f of fs.readdirSync(path.join(root,'media/m0-v43')))assert(/^[A-Za-z0-9_.-]+$/.test(f),'plain file name: '+f);
});

test('v43 skins: the page loads the skin table, bosses have attack poses, score items are hearts',()=>{
 const page=read('arcade.html'),app=read('src/arcade-app-v43.js'),manifest=json('media/arcade-v43/manifest.json');
 assert(page.indexOf('src/arcade-skins-v43.js')>page.indexOf('src/arcade-v43.js')&&page.indexOf('src/arcade-skins-v43.js')<page.indexOf('src/arcade-app-v43.js'));
 assert(/ArcadeSkins/.test(app)&&/skinOf\(/.test(app)&&/facesRight\(/.test(app));
 const bosses=Object.entries(manifest).filter(([n,e])=>e.group==='actors'&&(e.motions||[]).includes('attack'));
 assert(bosses.length>=20,'bosses with an attack motion: '+bosses.length);
 for(const [n] of bosses){const x=manifest[n.replace('.webp','@attack.webp')];assert(x&&x.frames===4&&x.bytes<90000,n);}
 assert(/heart/i.test(app),'heart items');
});
