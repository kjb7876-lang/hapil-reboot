#!/usr/bin/env node
'use strict';
/* 홍보용 세로 영상(쇼츠·릴스·틱톡 1080×1920)을 게임 화면에서 뽑는다.
 * 헤드리스 브라우저는 실제보다 느리게 그려서 그냥 녹화하면 느린 화면이 된다. 그래서 시계를 멈춘 채
 * 한 장씩(기본 30fps) 시간을 밀고 캔버스를 찍은 뒤 ffmpeg로 묶는다 → 기기 성능과 상관없이 실제 속도의 영상.
 * 영웅은 무적(개발자 모드 저장값)이고 보스·몹 아래로 부드럽게 따라가며 쏜다. 개발자 배지·버튼은 영상에서 숨긴다.
 * 사용: node tools/record-promo-v43.cjs --url http://localhost:4420/arcade.html --stage 11 --boss --seconds 20 --out promo.mp4
 * 필요: playwright(Chromium), ffmpeg. 소리는 넣지 않는다(편집 때 음악을 깐다). */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true);};
const URL_=arg('url','http://localhost:4420/arcade.html'),STAGE=Number(arg('stage',0)),BOSS=!!arg('boss',false),SECONDS=Number(arg('seconds',15)),FPS=Number(arg('fps',30));
const OUT=path.resolve(arg('out','promo-stage'+(STAGE+1)+'.mp4')),WARM=Number(arg('warm',BOSS?4:2)),DIFF=arg('difficulty','normal');
(async()=>{
  const {chromium}=require('playwright');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hapil-promo-'));
  const b=await chromium.launch();
  const pg=await b.newPage({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await pg.addInitScript(d=>{try{localStorage.setItem('hapil-arcade-dev-v43','1');localStorage.setItem('hapil-arcade-save-v43',JSON.stringify({version:43,cleared:[],stars:{},best:{},rewards:[],difficulty:d}));}catch(e){}},DIFF);
  await pg.clock.install();
  await pg.goto(URL_);
  for(let i=0;i<40&&await pg.evaluate(()=>document.getElementById('arcade-start').disabled);i++)await pg.clock.runFor(200);
  await pg.addStyleTag({content:'#arcade-dev-badge,#arcade-pause-button{display:none!important}'});
  await pg.evaluate(([i,boss])=>HapilArcadeApp.debugState().jumpStage(i,boss),[STAGE,BOSS]);
  // 그림을 받을 시간을 준다(실제 시간). 시계는 멈춰 둔다.
  await pg.waitForTimeout(1500);
  const steer=()=>pg.evaluate(()=>{const d=HapilArcadeApp.debugState(),s=d.state;if(!s)return;const p=s.player;
    let tx=180;if(s.stage==='card'||s.stage==='intro')tx=s.boss.x;else if(s.mobs.length){let m=null;for(const o of s.mobs)if(o.y>0&&o.y<460&&(!m||o.y>m.y))m=o;if(m)tx=m.x;}
    const t=s.tick/60;tx+=Math.sin(t*1.7)*26;const ty=520+Math.sin(t*.9)*30;p.x+=Math.max(-3.2,Math.min(3.2,tx-p.x));p.y+=Math.max(-2.4,Math.min(2.4,ty-p.y));});
  for(let i=0;i<WARM*FPS;i++){await steer();await pg.clock.runFor(1000/FPS);}
  const canvas=await pg.$('#arcade-canvas'),n=Math.round(SECONDS*FPS);
  for(let i=0;i<n;i++){await steer();await pg.clock.runFor(1000/FPS);await canvas.screenshot({path:path.join(tmp,'f'+String(i).padStart(5,'0')+'.png')});
    if(i%FPS===0)process.stdout.write('.');}
  await b.close();
  cp.execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(tmp,'f%05d.png'),
    '-vf','scale=1080:1920:flags=lanczos,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-movflags','+faststart',OUT],{stdio:'inherit'});
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log('\n'+OUT+' '+(fs.statSync(OUT).size/1048576).toFixed(1)+'MB '+SECONDS+'s');
})().catch(e=>{console.error(e);process.exit(1);});
