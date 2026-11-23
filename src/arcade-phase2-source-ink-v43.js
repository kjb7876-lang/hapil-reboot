(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root);
  else root.HapilPhase2Source=factory(root);
})(typeof globalThis==='undefined'?this:globalThis,function(root){
  'use strict';
  const sources=new WeakMap(),loading=new WeakMap(),replay=new WeakMap();
  const dimensions=im=>[im?.naturalWidth??im?.videoWidth??im?.width,im?.naturalHeight??im?.videoHeight??im?.height];
  const object=x=>x!=null&&(typeof x==='object'||typeof x==='function');
  function register(image,width,height,alpha){
    if(!object(image)||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||width*height>16777216||
       !ArrayBuffer.isView(alpha)||alpha.BYTES_PER_ELEMENT!==1||alpha.length!==width*height)return false;
    sources.set(image,{width,height,alpha:new Uint8Array(alpha)});
    return true;
  }
  function ready(im){return object(im)&&sources.has(im);}
  function prepare(im){
    if(!object(im))return Promise.resolve(false);
    if(ready(im))return Promise.resolve(true);
    if(loading.has(im))return loading.get(im);
    const p=Promise.resolve().then(async()=>{
      if(!dimensions(im)[0]&&typeof im.decode==='function')await im.decode();
      const [w,h]=dimensions(im);if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<=0||h<=0||w*h>16777216)return false;
      const c=typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(w,h):root.document?.createElement('canvas');
      if(!c)return false;
      c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});
      if(!ctx)return false;
      ctx.drawImage(im,0,0);
      const rgba=ctx.getImageData(0,0,w,h).data,a=new Uint8Array(w*h);
      for(let i=0;i<a.length;i++)a[i]=rgba[i*4+3];
      sources.set(im,{width:w,height:h,alpha:a});
      return true;
    }).catch(()=>false).finally(()=>loading.delete(im));
    loading.set(im,p);return p;
  }
  const unit=()=>[1,0,0,1,0,0];
  function mul([a,b,c,d,e,f],[A,B,C,D,E,F]){
    return [a*A+c*B,b*A+d*B,a*C+c*D,b*C+d*D,a*E+c*F+e,b*E+d*F+f];
  }
  const mute=()=>{};
  function createRecorder(){
    const draws=[],stack=[];let matrix=unit(),opacity=1,smooth=true,missing=false;
    return {
      draws,
      get complete(){return !missing;},
      get globalAlpha(){return opacity;},
      set globalAlpha(v){if(Number.isFinite(v)&&v>=0&&v<=1)opacity=v;},
      get imageSmoothingEnabled(){return smooth;},
      set imageSmoothingEnabled(v){smooth=!!v;},
      save(){stack.push([matrix,opacity,smooth]);},
      restore(){if(stack.length)[matrix,opacity,smooth]=stack.pop();},
      setTransform(a,b,c,d,e,f){if(object(a))({a,b,c,d,e,f}=a);if([a,b,c,d,e,f].every(Number.isFinite))matrix=[a,b,c,d,e,f];},
      resetTransform(){matrix=unit();},
      transform(a,b,c,d,e,f){if([a,b,c,d,e,f].every(Number.isFinite))matrix=mul(matrix,[a,b,c,d,e,f]);},
      translate(x,y){this.transform(1,0,0,1,x,y);},
      scale(x,y){this.transform(x,0,0,y,0,0);},
      rotate(a){const s=Math.sin(a),c=Math.cos(a);this.transform(c,s,-s,c,0,0);},
      // Collision's optional outer clip is supplied explicitly by caller. Drawing
      // paths/tints do not mark sources; no paint-only shape can accidentally hit.
      beginPath:mute,rect:mute,clip:mute,closePath:mute,moveTo:mute,lineTo:mute,quadraticCurveTo:mute,
      bezierCurveTo:mute,setLineDash:mute,stroke:mute,fill:mute,fillRect:mute,strokeRect:mute,
      fillText:mute,strokeText:mute,ellipse:mute,arc:mute,
      drawImage(im,...args){
        if(opacity<=0)return;
        const src=sources.get(im);if(!src){missing=true;return;}
        let sx=0,sy=0,sw=src.width,sh=src.height,dx,dy,dw=sw,dh=sh;
        if(args.length===8)[sx,sy,sw,sh,dx,dy,dw,dh]=args;
        else if(args.length===4)[dx,dy,dw,dh]=args;
        else if(args.length===2)[dx,dy]=args;
        else{missing=true;return;}
        if(![sx,sy,sw,sh,dx,dy,dw,dh].every(Number.isFinite)||!sw||!sh||!dw||!dh)return;
        if(sw<0){sx+=sw;sw=-sw;}if(sh<0){sy+=sh;sh=-sh;}
        if(dw<0){dx+=dw;dw=-dw;}if(dh<0){dy+=dh;dh=-dh;}
        // Coordinates are source pixel edges; retained bounds exclude bleeding from adjacent atlas cells.
        if(![sx,sy,sw,sh].every(Number.isInteger)||sx<0||sy<0||sx+sw>src.width||sy+sh>src.height){missing=true;return;}
        const [a,b,c,d,e,f]=mul(matrix,[dw/sw,0,0,dh/sh,dx,dy]),det=a*d-c*b;
        if(!Number.isFinite(det)||Math.abs(det)<1e-12)return;
        const x1=a*sw,x2=c*sh,y1=b*sw,y2=d*sh;
        const bb=[e+Math.min(0,x1,x2,x1+x2),f+Math.min(0,y1,y2,y1+y2),e+Math.max(0,x1,x2,x1+x2),f+Math.max(0,y1,y2,y1+y2)];
        draws.push({src,sx,sy,sw,sh,opacity,smooth,bb,e,f,k:[d/det,-b/det,-c/det,a/det]});
      }
    };
  }
  function sample(q,x,y){
    const {bb,k,e,f,sw,sh,sx,sy,src,opacity,smooth}=q;
    if(x<bb[0]||x>=bb[2]||y<bb[1]||y>=bb[3])return 0;
    const dx=x-e,dy=y-f,u=k[0]*dx+k[2]*dy,v=k[1]*dx+k[3]*dy;
    if(u<0||u>=sw||v<0||v>=sh)return 0;
    const {alpha,width}=src,base=sy*width+sx;
    if(!smooth)return opacity*alpha[base+Math.floor(v)*width+Math.floor(u)];
    const ix=Math.min(sw-1,Math.max(u-.5,0)),iy=Math.min(sh-1,Math.max(v-.5,0));
    const a=Math.floor(ix),b=Math.floor(iy),a1=Math.min(a+1,sw-1),b1=Math.min(b+1,sh-1),t=ix-a,p=iy-b;
    const i=base+b*width,j=base+b1*width;
    return opacity*((1-p)*((1-t)*alpha[i+a]+t*alpha[i+a1])+p*((1-t)*alpha[j+a]+t*alpha[j+a1]));
  }
  function test({event,state,painter,x,y,threshold=100,clip=true}={}){
    if(!object(event)||!Number.isFinite(state?.tick)||typeof painter!=='function'||![x,y,threshold].every(Number.isFinite)||threshold<=0||threshold>255)return false;
    const area=event.plan?.area;
    if(area&&(x<area.x0||x>=area.x1||y<area.y0||y>=area.y1))return false;
    if(!(typeof clip==='function'?clip(x,y):clip))return false;
    let cache=replay.get(event);
    if(!cache||cache.tick!==state.tick||cache.painter!==painter){
      const ctx=createRecorder();let painted=false;
      try{painted=painter(ctx,event,state)!==false;}catch{return false;}
      if(!ctx.complete||!painted)return false;
      cache={tick:state.tick,painter,draws:ctx.draws};replay.set(event,cache);
    }
    return cache.draws.some(d=>sample(d,x,y)>=threshold);
  }
  return Object.freeze({prepare,ready,register,createRecorder,sample,test});
});
