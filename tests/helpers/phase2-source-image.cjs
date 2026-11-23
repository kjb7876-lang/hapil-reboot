'use strict';
const fs=require('node:fs'),{loadImage,createCanvas}=require('@napi-rs/canvas'),S=require('../../src/arcade-phase2-source-ink-v43.js');
const cache=new Map();
async function prepareAtlas(spec){
 if(!spec)return null;
 if(!cache.has(spec.url)){
  const image=await loadImage(fs.readFileSync(spec.url.split('?')[0]));
  const w=image.naturalWidth,h=image.naturalHeight,ctx=createCanvas(w,h).getContext('2d');ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,w,h).data,alpha=new Uint8Array(w*h);
  for(let i=0;i<alpha.length;i++)alpha[i]=data[4*i+3];
  if(!S.register(image,w,h,alpha))throw Error('could not register exact atlas '+spec.url);
  cache.set(spec.url,{...spec,image,alternateSpec:spec.alternateSpec&&await prepareAtlas(spec.alternateSpec)});
 }
 return cache.get(spec.url);
}
function atlas(spec){return spec&&cache.get(spec.url);}
function contact(probe, yStart=100, yEnd=605){
 for(let y=yStart;y<yEnd;y+=3)for(let x=53;x<310;x+=3)if(probe(x+.5,y+.5))return [x+.5,y+.5];
 return null;
}
module.exports={atlas,prepareAtlas,contact};
