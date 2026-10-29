'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('storage and app load the same cache revision so a stale API cannot disable saved progress',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 function revision(script){const re=new RegExp('src="src/'+script+'\\.js\\?v=([^"&]+)"');const match=html.match(re);assert(match,`${script} has a cache revision`);return match[1];}
 assert.equal(revision('storage'),revision('app'));
});
