/* Local managed preview only; never registers or publishes a Site. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const [from,to] of [['story.html','index.html'],['story.html','story.html'],['story.css','story.css']])fs.copyFileSync(path.join(root,from),path.join(out,to));
for(const directory of ['src','media','docs/story']){
  const source=path.join(root,directory),destination=path.join(out,directory);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.cpSync(source,destination,{recursive:true});
}
fs.mkdirSync(path.join(root,'.openai'),{recursive:true});
const config=path.join(root,'.openai/hosting.json');
if(fs.existsSync(config)){
  const prior=JSON.parse(fs.readFileSync(config,'utf8'));
  if(prior.project_id)throw new Error('Preview setup must not alter a registered Site');
}
fs.writeFileSync(config,JSON.stringify({static:{directory:'dist'}},null,2)+'\n');
console.log(JSON.stringify({localOnly:true,publication:false,directory:out}));
