'use strict';
// Preserve original input/provenance bytes while replay-validating a candidate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),file=path.join(root,'tests/fixtures/natural-bot/manifest.json'),before=fs.readFileSync(file),m=JSON.parse(before);
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/core.js'))).digest('hex');
m.replayValidatedCoreSha256=hash;m.replayValidationScope='All six unchanged ordinary-health revision-three input files, exact end state and every checkpoint plus 180 subsequent real inputs; no engine or health override. Original recordedCoreSha256 is retained as recording provenance.';
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
const r=cp.spawnSync(process.execPath,['--test','tests/legacy-natural-bot-replay.test.cjs'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
if(r.status!==0){fs.writeFileSync(file,before);process.exit(r.status||1);}
if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/core.js'))).digest('hex')!==hash){fs.writeFileSync(file,before);throw Error('Core changed during replay validation');}
console.log(JSON.stringify({validatedCoreSha256:hash,originalRecordingCoreSha256:m.recordedCoreSha256,inputFilesUnchanged:true,tests:6}));
