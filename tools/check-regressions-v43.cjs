'use strict';
// Disjoint CI shards keep the existing suite intact; the eight long route
// audits run in their own jobs. Run with TEST_SHARD=0 TEST_SHARDS=4, etc.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
const shards=Number(process.env.TEST_SHARDS||1),shard=Number(process.env.TEST_SHARD||0);
if(!Number.isInteger(shards)||shards<1||!Number.isInteger(shard)||shard<0||shard>=shards)throw new Error('Invalid test shard');
const all=fs.readdirSync('tests').filter(f=>f.endsWith('.test.cjs')&&!/^arcade-v43-part[1-8]\.test\.cjs$/.test(f)).sort();
const files=all.filter((_,i)=>i%shards===shard).map(f=>'tests/'+f);
console.log(`Regression shard ${shard+1}/${shards}: ${files.length} of ${all.length} files`);
const result=cp.spawnSync(process.execPath,['--test','--test-concurrency=2',...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status===null?1:result.status;
