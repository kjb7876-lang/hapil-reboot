'use strict';
// Recertify the exact retained input bytes against a new candidate. Recording
// provenance is immutable; candidate validation is written only after six full
// ordinary-health replays and every saved boundary pass with frozen sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),file=path.join(root,'tests/fixtures/revision4-natural-bot/manifest.json'),before=fs.readFileSync(file),manifest=JSON.parse(before);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputs=Object.fromEntries(manifest.records.map(r=>[r.file,sha(fs.readFileSync(path.join(path.dirname(file),r.file)))]));
for(const r of manifest.records)if(inputs[r.file]!==r.sha256)throw Error('Retained recorded input bytes changed: '+r.file);
const hashes=Object.fromEntries(Object.keys(manifest.recordedModuleSha256).map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
manifest.replayValidatedModuleSha256=hashes;
manifest.replayValidationScope='Six unchanged ordinary-health revision-four full input files; exact end state and all105 changed boundaries/run plus180 subsequent actual inputs; no engine, health, damage, immunity, RNG or timer overrides. Original recordedModuleSha256 remains recording provenance.';
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
try{
 const result=cp.spawnSync(process.execPath,['--test','tests/revision4-natural-bot-replay-v18.test.cjs'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 if(result.status!==0)throw Error('Full revision-four recertification failed: '+result.status);
 for(const [p,hash] of Object.entries(hashes))if(sha(fs.readFileSync(path.join(root,p)))!==hash)throw Error('Source changed during recertification: '+p);
 for(const [p,hash] of Object.entries(inputs))if(sha(fs.readFileSync(path.join(path.dirname(file),p)))!==hash)throw Error('Input bytes changed during recertification: '+p);
 console.log(JSON.stringify({validatedModuleSha256:hashes,recordedModuleSha256:manifest.recordedModuleSha256,inputFilesUnchanged:true,tests:manifest.records.length,changedBoundariesPerRun:105}));
}catch(error){fs.writeFileSync(file,before);throw error;}
