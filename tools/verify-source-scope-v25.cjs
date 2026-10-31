'use strict';
// Source/ownership check; no game progression, browser or performance claim.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),base='945799615b35bb732ca5d6a0c48db8eebbd92a74',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p)),old=p=>cp.execFileSync('git',['show',base+':'+p],{cwd:root});
const product=['index.html','styles.css',...fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>'src/'+f)];
const mutable=new Set(['index.html','src/app.js','src/core.js','src/storage.js','src/projectiles.js','src/boss-skills.js','src/media.js']);
const unchanged=product.filter(p=>!mutable.has(p)).map(p=>{assert(read(p).equals(old(p)),p+' must remain exact');return{path:p,sha256:sha(read(p))};});
const scope=b=>{const c={window:{}};vm.runInNewContext(b.toString(),c);return c.window.HapilMedia;},before=scope(old('src/media.js')),after=scope(read('src/media.js'));
assert(read('src/media.js').subarray(0,old('src/media.js').length).equals(old('src/media.js')),'prior registry bytes preserved');
for(const[k,v]of Object.entries(before))assert.equal(after[k],v,k+' ownership changed');
const expected={h25SlothTissue:'sloth-tissue',h25GluttonKnife:'glutton-knife',h25GreedMoney:'greed-money',h25GreedTreasure:'greed-treasure'};
assert.deepEqual(Object.keys(after).filter(k=>!(k in before)).sort(),Object.keys(expected).sort());
const manifest=JSON.parse(read('docs/V25-RUNTIME-PROJECTILE-ASSETS-20261031.json'));
const added=Object.entries(expected).map(([key,name])=>{const p='media/projectiles-hapil1-v25/'+name+'.webp';assert.equal(after[key],p);const row=manifest.assets.find(a=>a.runtimePath===p);assert(row);assert.equal(sha(read(p)),row.runtimeSHA256);return{key,path:p,bytes:read(p).length,sha256:sha(read(p))};});
const oldMedia=cp.execFileSync('git',['ls-tree','-rz',base,'--','media'],{cwd:root}).toString().split('\0').filter(Boolean);for(const item of oldMedia){const[head,p]=item.split('\t'),b=read(p),blob=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');assert.equal(blob,head.split(' ')[2],p+' prior image bytes changed');}
const html=read('index.html').toString(),refs=[...html.matchAll(/(?:src|href)="(?:src\/[^"?]+\.js|styles\.css)\?v=([^"\s]+)"/g)];assert.equal(refs.length,12);assert(refs.every(m=>m[1]==='20261031-identity25'));
const report={schema:1,date:'2026-10-31',base,scope:'Working-tree source/provenance assertions; no deployment or natural/mobile performance claim.',unchanged,retainedMediaAliases:Object.keys(before).length,retainedMediaFiles:oldMedia.length,addedMedia:added,newRuntimeBytes:added.reduce((n,r)=>n+r.bytes,0),cacheReferences:refs.length,productHashes:Object.fromEntries(product.map(p=>[p,sha(read(p))])),passed:true};
fs.writeFileSync(path.join(root,'docs/V25-SOURCE-SCOPE-GUARD-20261031.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,unchanged:unchanged.length,retainedMediaAliases:report.retainedMediaAliases,retainedMediaFiles:report.retainedMediaFiles,newRuntimeBytes:report.newRuntimeBytes}));
