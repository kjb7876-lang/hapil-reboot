#!/usr/bin/env node
'use strict';
/* 무기·기물 그림탄의 외곽 판정점(사용자 11-20 "모든 무기이미지탄들은 외곽에 탄환넣어서 무기에 맞으면 피격으로 인정되게").
 * 기물 그림(media/arcade-v43/<key>.webp)의 불투명 가장자리를 따라 RIM_GAP(그려지는 크기 기준 px) 간격으로 점을 고르고,
 * 엔진 src/arcade-v43.js 의 `var PROP_RIMS=…;` 한 줄을 다시 쓴다. 좌표는 그림 가운데 기준, 엔진이 그리는 긴 변(propRenderSpan) 크기의 px.
 * 사용: node tools/build-prop-rims-v43.cjs [--check] */
const fs=require('fs'),path=require('path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const ROOT=path.join(__dirname,'..'),ENGINE=path.join(ROOT,'src/arcade-v43.js'),ART=path.join(ROOT,'media/arcade-v43');
const RIM_GAP=6.5,ALPHA=110,MAX_PTS=44;
(async()=>{
  const src=fs.readFileSync(ENGINE,'utf8'),a=require(ENGINE),out={};
  for(const prop of a.PROPS){
    const file=path.join(ART,prop.key+'.webp');if(!fs.existsSync(file))continue;
    const img=await loadImage(fs.readFileSync(file)),w=img.width,h=img.height,c=createCanvas(w,h),g=c.getContext('2d');g.drawImage(img,0,0);
    const d=g.getImageData(0,0,w,h).data,on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&d[(y*w+x)*4+3]>ALPHA;
    const span=a.propRenderSpan(prop),k=span/Math.max(w,h),gap=RIM_GAP/k,edge=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)&&(!on(x-1,y)||!on(x+1,y)||!on(x,y-1)||!on(x,y+1)))edge.push([x,y]);
    let step=gap,pts;
    for(;;){pts=[];for(const p of edge){let ok=true;for(const q of pts){if((p[0]-q[0])**2+(p[1]-q[1])**2<step*step){ok=false;break;}}if(ok)pts.push(p);}if(pts.length<=MAX_PTS)break;step*=1.08;}
    out[prop.key]=pts.map(p=>[+((p[0]+.5-w/2)*k).toFixed(1),+((p[1]+.5-h/2)*k).toFixed(1)]);
  }
  const line='  var PROP_RIMS='+JSON.stringify(out)+'; // tools/build-prop-rims-v43.cjs 가 만든다(손대지 말 것)';
  const next=src.replace(/^  var PROP_RIMS=.*$/m,line);
  if(process.argv.includes('--check')){if(next!==src){console.error('PROP_RIMS is stale: run node tools/build-prop-rims-v43.cjs');process.exit(1);}console.log('PROP_RIMS up to date');return;}
  fs.writeFileSync(ENGINE,next);console.log(Object.keys(out).map(k=>k+':'+out[k].length).join(' '));
})();
