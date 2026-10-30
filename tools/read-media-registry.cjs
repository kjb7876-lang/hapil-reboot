'use strict';
// Read the real data-only media script, including versioned key additions.
// Slicing from the first to the last brace breaks once Object.assign is used.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function readMediaRegistry(){const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/media.js'),'utf8'),scope,{timeout:1000});if(!scope.window.HapilMedia||typeof scope.window.HapilMedia!=='object')throw Error('Missing media registry');return scope.window.HapilMedia;};
