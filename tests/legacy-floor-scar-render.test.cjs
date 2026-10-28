'use strict';
// Native CPU pixels for the existing floor-scar warning. No mobile/GPU certification.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const core=require('../src/core.js');
require('../src/render.js');
function fixture(){
 const previous=global.document;
 global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 const images={};for(const key of ['forest','ruins','cave']){const c=createCanvas(720,904);c.getContext('2d').fillStyle='#c7bda5';c.getContext('2d').fillRect(0,0,720,904);c.complete=true;c.naturalWidth=720;c.naturalHeight=904;images[key]=c;}
 const canvas=createCanvas(360,640);canvas.style={};const renderer=global.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
 const world=core.createRun({campaign:true,practiceBoss:true,bossIndex:2,seed:19});world.autoAttack=false;world.skillRotation=false;world.phaseTime=4;world.bullets=[];
 const hazard={id:5,phase:'warning',x1:180,y1:250,x2:180,y2:550,width:10,progress:.5};world.hazards=[hazard];
 function draw(low){renderer.draw(world,0,1,low);return canvas.getContext('2d').getImageData(0,0,360,640).data;}
 return{world,hazard,draw,close(){renderer.destroy();global.document=previous;}};
}
test('floor-scar keeps a visible warning in both render qualities and stays inside the original footprint',()=>{
 const f=fixture();try{for(const low of [false,true]){
  delete f.hazard.telegraphKind;const before=f.draw(low);f.hazard.telegraphKind='floor-scar';const after=f.draw(low);let changed=0,darker=0;
  for(let y=0;y<640;y++)for(let x=0;x<360;x++){const p=(y*360+x)*4;let different=false;for(let k=0;k<4;k++)if(before[p+k]!==after[p+k])different=true;if(!different)continue;
   changed++;assert(x>=175&&x<=185&&y>=245&&y<=555,'contrast changes must remain within the original damaging capsule');
   if(after[p]+after[p+1]+after[p+2]<before[p]+before[p+1]+before[p+2]-20)darker++;
  }
  assert(changed>100,'warning has a visible floor trace');assert(darker>50,'dark bed provides contrast on a lit map');
 }}finally{f.close();}
});
test('floor-scar metadata cannot change the active beam or harmless fade pixels',()=>{
 const f=fixture();try{for(const phase of ['active','fade'])for(const low of [false,true]){f.hazard.phase=phase;delete f.hazard.telegraphKind;const original=Array.from(f.draw(low));f.hazard.telegraphKind='floor-scar';assert.deepEqual(Array.from(f.draw(low)),original);}}finally{f.close();}
});
