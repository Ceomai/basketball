"use strict";
/* ================= MİNİ OYUN ALTYAPISI ================= */
const W=360,H=480;
let CV,CX;
const lvl=()=>clamp(ORDER.indexOf(S.stage)-1,0,5); // 0..5 zorluk kademesi
function mkStage(el,title){
  el.innerHTML=`<div class="stage"><div class="mgtop"><span>${title||""}</span><span id="mgI" class="muted"></span></div><canvas id="mgcanvas"></canvas><div class="mgctrl" id="mgC"></div></div>`;
  CV=$("#mgcanvas");CX=CV.getContext("2d");const d=Math.max(2,devicePixelRatio||1),w=CV.clientWidth||360;CV.width=w*d;CV.height=w*H/W*d;CV.style.height=(w*H/W)+"px";CX.setTransform(CV.width/W,0,0,CV.height/H,0,0);
  try{el.scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}
}
function ppos(e){const r=CV.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function loop(fn){let last=performance.now(),alive=true,T=0;const cv=CV;const f=t=>{if(!alive||!cv.isConnected)return;const dt=Math.min(.033,(t-last)/1000);last=t;T+=dt;fn(dt,T);requestAnimationFrame(f)};requestAnimationFrame(f);return()=>{alive=false}}
function info(t){const e=$("#mgI");if(e)e.textContent=t}
function clearInput(){if(CV)CV.onpointerdown=CV.onpointermove=CV.onpointerup=CV.onpointercancel=null;window.onkeydown=null}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(_){}};
let CROWD=[];
function buildCrowd(home,away){CROWD=Array.from({length:84},(_,i)=>({x:(i%14)*27+6+(Math.floor(i/14)%2)*13,y:226+Math.floor(i/14)*20,c:Math.random()<.75?home:away,s:pick(SKINS),b:Math.random()*6}))}
function bigText(c,t,y=130,col="#ffffff",sz=36){c.save();c.font=`800 ${sz}px "Barlow Condensed",sans-serif`;c.textAlign="center";c.lineWidth=7;c.strokeStyle="#05080e";c.lineJoin="round";const u=t.toLocaleUpperCase("tr-TR");c.strokeText(u,W/2,y);c.fillStyle=col;c.fillText(u,W/2,y);c.restore()}
function hint(c,t,y=30){c.save();c.font='700 13px Manrope,sans-serif';c.textAlign="center";const w=c.measureText(t).width+22;rr(c,W/2-w/2,y-17,w,26,13,"rgba(5,8,14,.8)",false);c.fillStyle="#eef2f8";c.fillText(t,W/2,y+1);c.restore()}
const HOOP={x:306,y:200,r:21},BB={x:336,y1:126,y2:222},GROUND=440,BR=10,G=640,FLOOR=372;
let ARENA={home:"#c8102e",home2:"#fff",away:"#1d428a",away2:"#fff",led:""};
function drawArena(c,T,o={}){
  const g=c.createLinearGradient(0,0,0,FLOOR);g.addColorStop(0,"#070b13");g.addColorStop(1,"#16203a");c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=.07;c.fillStyle="#fff";[[60,-.2],[200,0],[320,.25]].forEach(([x,a])=>{c.beginPath();c.moveTo(x-6,0);c.lineTo(x+6,0);c.lineTo(x+60+a*200,FLOOR);c.lineTo(x-60+a*200,FLOOR);c.closePath();c.fill()});c.restore();
  c.lineWidth=1.4;c.strokeStyle="#05080e";
  CROWD.forEach(p=>{const bob=o.cheer?Math.abs(Math.sin(T*9+p.b))*5:Math.sin(T*2+p.b);ell(c,p.x,p.y+11-bob,9,6,p.c);ell(c,p.x,p.y-bob,7.5,6.5,p.s);c.fillStyle="#05080e";c.fillRect(p.x-3.5,p.y-2-bob,2,2);c.fillRect(p.x+1.5,p.y-2-bob,2,2)});
  c.fillStyle="#05080e";c.fillRect(0,FLOOR-24,W,24);
  c.save();c.beginPath();c.rect(0,FLOOR-24,W,24);c.clip();c.font='800 15px "Barlow Condensed",sans-serif';c.fillStyle=ARENA.home;const tw=Math.max(60,c.measureText(ARENA.led).width);const off=-(T*50%tw);for(let x=off;x<W;x+=tw)c.fillText(ARENA.led,x,FLOOR-7);c.restore();
  const fg=c.createLinearGradient(0,FLOOR,0,H);fg.addColorStop(0,"#b98450");fg.addColorStop(1,"#d9a066");c.fillStyle=fg;c.fillRect(0,FLOOR,W,H-FLOOR);
  c.strokeStyle="rgba(0,0,0,.12)";c.lineWidth=1;for(let x=-40;x<W+40;x+=26){c.beginPath();c.moveTo(x,FLOOR);c.lineTo(x-30,H);c.stroke()}
  c.fillStyle=ARENA.home;c.fillRect(0,H-14,W,14);
  c.strokeStyle="rgba(255,255,255,.85)";c.lineWidth=2.5;c.beginPath();c.moveTo(128,FLOOR);c.lineTo(108,H-14);c.stroke();c.beginPath();c.moveTo(232,FLOOR);c.lineTo(226,H-14);c.stroke();
  c.strokeStyle="#05080e";c.lineWidth=2;rr(c,348,180,7,H-180,2,"#4a5568");rr(c,BB.x,BB.y1,8,BB.y2-BB.y1,2,"rgba(220,235,255,.9)");
}
function drawHoopFront(c,sw=0){
  c.strokeStyle="rgba(255,255,255,.9)";c.lineWidth=1.5;const L=HOOP.x-HOOP.r,R=HOOP.x+HOOP.r;
  for(let i=0;i<=5;i++){const t=i/5;c.beginPath();c.moveTo(L+(R-L)*t,HOOP.y);c.lineTo(L+8+(R-L-16)*t+sw*Math.sin(i*2),HOOP.y+34);c.stroke()}
  c.beginPath();c.moveTo(L+3,HOOP.y+12);c.lineTo(R-3,HOOP.y+12);c.moveTo(L+6,HOOP.y+24);c.lineTo(R-6,HOOP.y+24);c.stroke();
  c.strokeStyle="#05080e";c.lineWidth=7;c.beginPath();c.moveTo(L,HOOP.y);c.lineTo(BB.x,HOOP.y);c.stroke();c.strokeStyle="#ff5a1c";c.lineWidth=4;c.stroke();
}
function stepBall(b,dt){
  let scored=false;const n=4,h=dt/n;
  for(let i=0;i<n;i++){const py=b.y;b.vy+=G*h;b.x+=b.vx*h;b.y+=b.vy*h;b.rot+=b.vx*h*.05;
    for(const px of[HOOP.x-HOOP.r,HOOP.x+HOOP.r]){const dx=b.x-px,dy=b.y-HOOP.y,d=Math.hypot(dx,dy);if(d<BR+2&&d>0){const nx=dx/d,ny=dy/d,vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.6*vn*nx;b.vy-=1.6*vn*ny;b.rim=(b.rim||0)+1}b.x=px+nx*(BR+2);b.y=HOOP.y+ny*(BR+2)}}
    if(b.x+BR>BB.x&&b.x<BB.x+8&&b.y>BB.y1&&b.y<BB.y2&&b.vx>0){b.vx=-b.vx*.55;b.x=BB.x-BR}
    if(b.y+BR>GROUND+20&&b.vy>0){b.vy=-b.vy*.5;b.vx*=.8;b.y=GROUND+20-BR;b.bounce=(b.bounce||0)+1}
    if(!b.in&&py<HOOP.y&&b.y>=HOOP.y&&b.vy>0&&b.x>HOOP.x-HOOP.r+3&&b.x<HOOP.x+HOOP.r-3){b.in=true;scored=true}}
  return scored;
}
function aimAt(b,tx,ty,T){b.vx=(tx-b.x)/T;b.vy=(ty-b.y-.5*G*T*T)/T}
const OPP_LOOK=()=>({skin:pick(SKINS),hatStyle:pick(["yok","band","yok"]),hair:pick(["#111","#2a1a10","#7a4a22"]),hat:"#ffffff"});
const oppKit=()=>({jersey:ARENA.away,trim:ARENA.away2});
const me=()=>({...jersey()});
function finish(stop,res,val){stop();clearInput();const c=$("#mgC");if(c)c.innerHTML="";res(val)}

/* ---- Şut (çek-bırak) ---- */
function mgShoot(el,{eff,shots=1,title="Şut",dist=null,def=true}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,made=0,pts=0,st;const ol=OPP_LOOK();
    const next=()=>{const sx=dist==="three"?rnd(50,100):dist==="mid"?rnd(140,200):rnd(55,200);st={sx,three:sx<118,ball:{x:sx+3,y:GROUND-122,vx:0,vy:0,rot:0},ph:"aim",drag:null,t:0,pr:def?Math.random():0,msg:"",sw:0,defX:sx+rnd(36,52)}};
    next();
    const vel=()=>{const d=st.drag;let vx=(d.x0-d.x)*4.4,vy=(d.y0-d.y)*4.4;const m=Math.hypot(vx,vy);if(m>880){vx*=880/m;vy*=880/m}return{x:vx,y:vy}};
    CV.onpointerdown=e=>{if(st.ph!=="aim")return;const p=ppos(e);st.drag={x0:p.x,y0:p.y,x:p.x,y:p.y};try{CV.setPointerCapture(e.pointerId)}catch(_){}};
    CV.onpointermove=e=>{if(!st.drag)return;const p=ppos(e);st.drag.x=p.x;st.drag.y=p.y};
    CV.onpointerup=CV.onpointercancel=()=>{if(!st.drag)return;const v=vel();st.drag=null;if(Math.hypot(v.x,v.y)<150)return;
      const nz=1-eff/100;const a=Math.atan2(v.y,v.x)+gauss()*(.006+.032*nz*(.45+st.pr*.75));const sp=Math.hypot(v.x,v.y)*(1+gauss()*.022*nz);
      st.ball.vx=Math.cos(a)*sp;st.ball.vy=Math.sin(a)*sp;st.ph="fly";st.t=0;buzz(10)};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&st.ball.in});st.t+=dt;
      if(st.ph!=="aim"){if(stepBall(st.ball,dt)){made++;pts+=st.three?3:2;st.msg=st.three?"Üçlük!":st.ball.rim?"İçeride!":"Filelerde!";st.sw=1;buzz(25)}
        if(st.ph==="fly"&&(st.t>3.2||st.ball.bounce>=2||st.ball.x<-30||st.ball.x>W+30||(st.ball.in&&st.ball.y>GROUND))){st.ph="done";st.t=0;if(!st.ball.in)st.msg=pick(["Kaçtı","Hava topu","Çemberden döndü","Olmadı"])}}
      if(def)drawKid(c,st.defX,GROUND+6,.8,ol,{...oppKit(),armsUp:true,flip:true,mood:"kizgin",look:-2});
      drawKid(c,st.sx,GROUND,.84,S.look,{...me(),armsUp:st.ph==="aim",mood:st.ph==="done"?(st.ball.in?"mutlu":"uzgun"):"",look:2});
      if(st.ph==="aim"){st.ball.x=st.sx+3;st.ball.y=GROUND-122+Math.sin(T*3)}
      drawBall(c,st.ball.x,st.ball.y,BR,st.ball.rot);drawHoopFront(c,st.sw);st.sw*=.92;
      if(st.ph==="aim"&&st.drag){const v=vel();const b={x:st.ball.x,y:st.ball.y,vx:v.x,vy:v.y};const dots=4+Math.floor(eff/7);c.fillStyle="#fff";
        for(let i=1;i<=dots;i++){for(let k=0;k<3;k++){b.vy+=G*.018;b.x+=b.vx*.018;b.y+=b.vy*.018}c.globalAlpha=1-i/(dots+2);c.beginPath();c.arc(b.x,b.y,3.4,0,7);c.fill()}c.globalAlpha=1;
        c.strokeStyle="rgba(255,255,255,.5)";c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.moveTo(st.drag.x0,st.drag.y0);c.lineTo(st.drag.x,st.drag.y);c.stroke();c.setLineDash([])}
      if(st.ph==="aim"){hint(c,"Bas, aşağı-geri çek, bırak");
        if(def){c.font='700 11px Manrope';c.fillStyle="#8c99ae";c.textAlign="left";c.fillText("SAVUNMA BASKISI",14,64);rr(c,14,70,100,6,3,"#24314a",false);rr(c,14,70,Math.max(4,100*st.pr),6,3,st.pr>.66?"#ff5468":st.pr>.33?"#ffc54d":"#36d38e",false)}
        c.font='800 15px "Barlow Condensed"';c.textAlign="right";c.fillStyle="#fff";c.fillText(st.three?"3 SAYI MESAFESİ":"2 SAYI MESAFESİ",W-14,72)}
      if(st.ph==="done"){bigText(c,st.msg,140,st.ball.in?"#ffc54d":"#ffffff");if(st.t>1.1){n++;if(n>=shots)finish(stop,res,{made,pts,shots});else next()}}
      info(`${Math.min(n+1,shots)}/${shots} · isabet ${made}`);
    });
  });
}
/* ---- Zamanlama çubuğu: serbest atış, top çalma, smaç ---- */
function mgTiming(el,{eff,title,tries=2,label="At",kind="free"}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,ok=0,st;const ol=OPP_LOOK();
    const sx=kind==="dunk"?250:150;
    const next=()=>{st={ph:"aim",zc:rnd(.3,.7),zw:(kind==="steal"?.05:kind==="dunk"?.09:.07)+eff*.0016,speed:2.4+lvl()*.35+rnd(0,.5),t:0,ball:{x:sx,y:GROUND-(kind==="dunk"?150:122),vx:0,vy:0,rot:0},msg:"",nv:.5,ok:false,jump:0}};next();
    const go=()=>{if(st.ph!=="aim")return;const good=Math.abs(st.nv-st.zc)<st.zw/2;
      if(kind==="steal"){st.ok=good;st.ph="done";st.msg=good?"Top çalındı!":"Erken çıktın, faul";if(good){ok++;buzz(25)}}
      else{const off=good?rnd(-4,4):(Math.random()<.5?-1:1)*rnd(15,26);aimAt(st.ball,HOOP.x+off,HOOP.y-8,kind==="dunk"?.42:1.05);st.ph="fly";if(kind==="dunk")st.jump=1}
      st.t=0};
    CV.onpointerdown=go;window.onkeydown=e=>{if(e.code==="Space"){e.preventDefault();go()}};
    $("#mgC").innerHTML=`<button class="btn pri" id="tb">${label}</button>`;$("#tb").onpointerdown=e=>{e.preventDefault();go()};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&(st.ball.in||st.ok)});st.t+=dt;
      if(st.ph==="aim")st.nv=.5+.5*Math.sin(st.t*st.speed);
      if(kind!=="steal"){if(st.ph!=="aim"){if(stepBall(st.ball,dt)){ok++;st.msg=kind==="dunk"?"Smaç!":"Swiş!";buzz(25)}if(st.ph==="fly"&&(st.t>2.6||st.ball.bounce>=2||st.ball.x>W+30)){st.ph="done";st.t=0;if(!st.ball.in)st.msg=kind==="dunk"?"Çembere çarptı":"Kaçtı"}}
        const jy=kind==="dunk"&&st.ph!=="aim"?Math.max(0,Math.sin(Math.min(1,st.t*1.6)*Math.PI))*90:0;
        drawKid(c,sx+(kind==="dunk"&&st.ph!=="aim"?Math.min(1,st.t*2)*30:0),GROUND-jy,.84,S.look,{...me(),armsUp:true,mood:st.ph==="done"?(st.ball.in?"mutlu":"uzgun"):""});drawBall(c,st.ball.x,st.ball.y,BR,st.ball.rot)}
      else{const bx=200+Math.sin(T*6)*6;drawKid(c,bx,GROUND,.84,ol,{...oppKit(),dribble:true,flip:true,mood:st.ph==="done"&&st.ok?"saskin":""});drawBall(c,bx-30,GROUND-26-Math.abs(Math.sin(T*10))*20,BR,T*4);
        drawKid(c,st.ph==="done"&&st.ok?190:120,GROUND,.84,S.look,{...me(),mood:st.ph==="done"?(st.ok?"mutlu":"uzgun"):"kizgin",armsUp:st.ph==="done"&&st.ok})}
      drawHoopFront(c);
      const bx=30,bw=300,by=70;rr(c,bx,by,bw,20,10,"#141d2e",false);rr(c,bx+bw*(st.zc-st.zw/2),by,bw*st.zw,20,4,"#36d38e",false);rr(c,bx+bw*st.nv-3,by-6,6,32,3,"#ffffff",false);
      if(st.ph==="aim")hint(c,kind==="steal"?"Yeşil anı yakala ve uzan":kind==="dunk"?"Yeşilde zıpla, smaçı vur":"Beyaz çizgi yeşildeyken dokun",40);
      if(st.ph==="done"){bigText(c,st.msg,170,(st.ball.in||st.ok)?"#ffc54d":"#ffffff");if(st.t>1){n++;if(n>=tries)finish(stop,res,{ok,tries});else next()}}
      info(`${Math.min(n+1,tries)}/${tries} · başarılı ${ok}`);
    });
  });
}
/* ---- Pas (kuşbakışı) ---- */
function headTop(c,x,y,L,col,r=15){c.lineWidth=1.8;c.strokeStyle="#05080e";ell(c,x,y+4,r+3,r-2,col);ell(c,x,y-4,r,r*.86,L.skin);c.beginPath();c.ellipse(x,y-7,r,r*.75,0,Math.PI,Math.PI*2);c.closePath();c.fillStyle=L.hatStyle&&!["yok","band","uzun"].includes(L.hatStyle)?L.hat:(L.hair||"#222");c.fill();c.stroke();
  ell(c,x-4,y-4,4.5,5.5,"#fff");ell(c,x+4,y-4,4.5,5.5,"#fff");c.fillStyle="#05080e";c.beginPath();c.arc(x-2.5,y-3,1.4,0,7);c.arc(x+2.5,y-3,1.4,0,7);c.fill()}
function mgPass(el,{eff,reps=1,title="Pas"}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,ok=0,st;const mp={x:180,y:430};
    const spots=[[50,270],[110,160],[180,120],[250,160],[310,270],[64,370],[296,370]];
    const next=()=>{const sp=shuffle(spots).slice(0,3).map(([x,y])=>({x:x+rnd(-8,8),y:y+rnd(-8,8)}));const nd=2+Math.min(2,Math.floor(lvl()/2))+(Math.random()<.4?1:0);
      const defs=Array.from({length:nd},(_,i)=>{const t=sp[i%3];const mx=(t.x+mp.x)/2,my=(t.y+mp.y)/2,ang=Math.atan2(t.y-mp.y,t.x-mp.x)+Math.PI/2,L=rnd(40,70);return{ax:mx-Math.cos(ang)*L,ay:my-Math.sin(ang)*L,bx:mx+Math.cos(ang)*L,by:my+Math.sin(ang)*L,ph:Math.random()*6,sp:(1.6+lvl()*.3+rnd(0,.8))*(1.25-eff/200)}});
      st={mates:sp,defs,ph:"aim",t:0,t2:0,clock:4.5,ball:{x:mp.x,y:mp.y},tgt:null,msg:"",ok:false}};next();
    const dpos=(d,t)=>{const k=.5+.5*Math.sin(t*d.sp+d.ph);return{x:d.ax+(d.bx-d.ax)*k,y:d.ay+(d.by-d.ay)*k}};
    CV.onpointerdown=e=>{if(st.ph!=="aim")return;const p=ppos(e);let best=null,bd=60;st.mates.forEach(m=>{const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<bd){bd=d;best=m}});if(best){st.tgt=best;st.ph="fly";buzz(8)}};
    const mlooks=[0,1,2].map(()=>OPP_LOOK()),dl=OPP_LOOK();
    const stop=loop((dt,T)=>{const c=CX;st.t+=dt;
      c.fillStyle="#c58d55";c.fillRect(0,0,W,H);c.strokeStyle="rgba(0,0,0,.1)";c.lineWidth=1;for(let y=0;y<H;y+=20){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
      c.globalAlpha=.85;c.fillStyle=ARENA.home;c.fillRect(130,0,100,160);c.globalAlpha=1;
      c.strokeStyle="#fff";c.lineWidth=3;c.strokeRect(130,0,100,160);c.beginPath();c.arc(180,160,50,0,Math.PI);c.stroke();c.beginPath();c.arc(180,22,190,.12,Math.PI-.12);c.stroke();
      rr(c,150,4,60,6,2,"#eef2f8",false);c.lineWidth=4;c.strokeStyle="#ff5a1c";c.beginPath();c.arc(180,24,12,0,7);c.stroke();
      st.mates.forEach((m,i)=>{if(st.ph==="aim"){c.save();c.strokeStyle="#ffc54d";c.lineWidth=3;c.setLineDash([5,5]);c.beginPath();c.arc(m.x,m.y,28+Math.sin(T*6)*2,0,7);c.stroke();c.restore()}headTop(c,m.x,m.y,mlooks[i],ARENA.home)});
      const dps=st.defs.map(d=>dpos(d,st.t));dps.forEach(p=>headTop(c,p.x,p.y,dl,ARENA.away,16));headTop(c,mp.x,mp.y,S.look,ARENA.home,17);
      if(st.ph==="aim"){st.clock-=dt;if(st.clock<=0){st.ph="done";st.t2=0;st.msg="Hücum süresi doldu";st.ok=false}}
      if(st.ph==="fly"){const sp=(300+eff*3.4)*dt,dx=st.tgt.x-st.ball.x,dy=st.tgt.y-st.ball.y,d=Math.hypot(dx,dy);
        if(d<=sp){st.ph="done";st.ok=true;st.msg=pick(["Nokta atışı pas","Mükemmel pas","Asist geliyor"]);st.t2=0}else{st.ball.x+=dx/d*sp;st.ball.y+=dy/d*sp}
        for(const p of dps)if(st.ph==="fly"&&Math.hypot(p.x-st.ball.x,p.y-st.ball.y)<17+lvl()){st.ph="done";st.ok=false;st.msg="Araya girdi";st.t2=0}}
      drawBall(c,st.ball.x,st.ball.y,8);
      if(st.ph==="aim"){hint(c,"Boştaki takım arkadaşına dokun",H-14);c.font='800 30px "Barlow Condensed"';c.textAlign="right";c.lineWidth=5;c.strokeStyle="#05080e";c.strokeText(st.clock.toFixed(1),W-12,42);c.fillStyle=st.clock<1.5?"#ff5468":"#fff";c.fillText(st.clock.toFixed(1),W-12,42)}
      if(st.ph==="done"){st.t2+=dt;bigText(c,st.msg,250,st.ok?"#ffc54d":"#ffffff");if(st.t2>1.1){if(st.ok)ok++;n++;if(n>=reps)finish(stop,res,{ok,reps});else next()}}
      info(`${Math.min(n+1,reps)}/${reps} · başarılı ${ok}`);
    });
  });
}
/* ---- Blok ---- */
function mgBlock(el,{eff,reps=1,title="Blok"}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,ok=0,st;const ol=OPP_LOOK();
    const next=()=>{st={ph:"run",t:0,ox:40,ring:95,rs:70+lvl()*12+rnd(0,15),tol:3+eff*.11,msg:"",ball:{x:0,y:0},ok:false}};next();
    const tap=()=>{if(st.ph!=="jump")return;st.ok=Math.abs(st.ring-16)<st.tol;st.msg=st.ok?pick(["Blok!","Geri gönderdi","Bu bölge yasak"]):"Zamanlama kaçtı";st.ph="done";st.t=0;st.bv={x:st.ok?-260:220,y:st.ok?-120:-200};if(st.ok)buzz(30)};
    CV.onpointerdown=tap;window.onkeydown=e=>{if(e.code==="Space"){e.preventDefault();tap()}};
    $("#mgC").innerHTML=`<button class="btn bad" id="bl">Blok</button>`;$("#bl").onpointerdown=e=>{e.preventDefault();tap()};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&st.ok});st.t+=dt;
      if(st.ph==="run"){st.ox+=150*dt;if(st.ox>=190){st.ph="jump";st.t=0}}
      let jy=0;if(st.ph==="jump"){jy=Math.min(1,st.t*2.4)*70;st.ring-=st.rs*dt;if(st.ring<=2){st.ok=false;st.msg="Çok geç";st.ph="done";st.t=0;st.bv={x:220,y:-200}}}
      if(st.ph==="done")jy=Math.max(0,70-st.t*140);
      drawKid(c,st.ox,GROUND-jy,.84,ol,{...oppKit(),armsUp:st.ph!=="run",mood:"kizgin",dribble:st.ph==="run"});
      const pj=st.ph==="jump"?Math.min(1,st.t*2)*60:st.ph==="done"?Math.max(0,60-st.t*120):0;
      drawKid(c,262,GROUND-pj,.86,S.look,{...me(),armsUp:st.ph!=="run",flip:true,mood:st.ph==="done"?(st.ok?"mutlu":"uzgun"):"saskin"});
      if(st.ph!=="done")st.ball={x:st.ox+(st.ph==="run"?28:24),y:st.ph==="run"?GROUND-26-Math.abs(Math.sin(T*10))*20:GROUND-jy-140};else{st.ball.x+=st.bv.x*dt;st.ball.y+=st.bv.y*dt;st.bv.y+=G*dt}
      drawBall(c,st.ball.x,st.ball.y,BR,T*4);drawHoopFront(c);
      if(st.ph==="jump"){c.lineWidth=4;c.strokeStyle="#36d38e";c.beginPath();c.arc(st.ball.x,st.ball.y,16,0,7);c.stroke();c.strokeStyle=Math.abs(st.ring-16)<st.tol?"#ffc54d":"#fff";c.lineWidth=3;c.beginPath();c.arc(st.ball.x,st.ball.y,Math.max(1,st.ring),0,7);c.stroke()}
      if(st.ph!=="done")hint(c,"Beyaz halka yeşile oturunca dokun");
      if(st.ph==="done"){bigText(c,st.msg,130,st.ok?"#ffc54d":"#ffffff");if(st.t>1.1){if(st.ok)ok++;n++;if(n>=reps)finish(stop,res,{ok,reps});else next()}}
      info(`${Math.min(n+1,reps)}/${reps} · blok ${ok}`);
    });
  });
}
/* ---- Çalım (kaydırma) ---- */
function mgDribble(el,{eff,reps=1,title="Çalım"}){
  mkStage(el,title);const AR={L:"←",R:"→",U:"↑",D:"↓"};
  return new Promise(res=>{
    let n=0,ok=0,st,sw=null;const ol=OPP_LOOK();
    const next=()=>{const len=4+(lvl()>=3?1:0);st={seq:Array.from({length:len},()=>pick("LRUD")),i:0,time:clamp(2.2+eff*.028-lvl()*.12,1.7,5),t:0,ph:"go",msg:"",sway:0,ok:false}};next();
    const press=k=>{if(st.ph!=="go")return;if(st.seq[st.i]===k){st.i++;st.sway=(k==="L"?-1:1)*18;buzz(8);if(st.i>=st.seq.length){st.ph="done";st.ok=true;st.t=0;st.msg=pick(["Adamını yere oturttu","Ayak bileği kırıldı","Çalım ustası"])}}else{st.ph="done";st.ok=false;st.t=0;st.msg="Top kaptırıldı"}};
    CV.onpointerdown=e=>{sw=ppos(e)};CV.onpointerup=CV.onpointercancel=e=>{if(!sw)return;const p=ppos(e),dx=p.x-sw.x,dy=p.y-sw.y;sw=null;if(Math.hypot(dx,dy)<22)return;press(Math.abs(dx)>Math.abs(dy)?(dx>0?"R":"L"):(dy>0?"D":"U"))};
    $("#mgC").innerHTML=["L","U","D","R"].map(k=>`<button class="btn" data-k="${k}" aria-label="${({L:"Sol",U:"Yukarı",D:"Aşağı",R:"Sağ"})[k]}">${AR[k]}</button>`).join("");
    $$("#mgC [data-k]").forEach(b=>b.onpointerdown=e=>{e.preventDefault();press(b.dataset.k)});
    window.onkeydown=e=>{const m={ArrowLeft:"L",ArrowRight:"R",ArrowUp:"U",ArrowDown:"D"}[e.key];if(m){e.preventDefault();press(m)}};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&st.ok});st.t+=dt;
      if(st.ph==="go"&&st.t>=st.time){st.ph="done";st.ok=false;st.t=0;st.msg="Süre bitti"}
      st.sway*=.88;const fell=st.ph==="done"&&st.ok;
      c.save();if(fell){c.translate(220,GROUND);c.rotate(Math.min(1,st.t*3)*-1.2);c.translate(-220,-GROUND)}
      drawKid(c,220-st.sway*.6,GROUND,.84,ol,{...oppKit(),flip:true,mood:fell?"saskin":"kizgin"});c.restore();
      const px=fell?120+Math.min(1,st.t)*130:120+st.sway*.4;drawKid(c,px,GROUND,.84,S.look,{...me(),dribble:true,mood:st.ph==="done"?(st.ok?"mutlu":"uzgun"):""});
      drawBall(c,px+30,GROUND-26-Math.abs(Math.sin(T*12))*22,BR,T*5);drawHoopFront(c);
      const bw=54,gap=8,tot=st.seq.length*bw+(st.seq.length-1)*gap,x0=W/2-tot/2;
      st.seq.forEach((k,i)=>{const done=i<st.i,cur=i===st.i&&st.ph==="go";rr(c,x0+i*(bw+gap),56-(cur?6:0),bw,bw,10,done?"#36d38e":cur?"#ffc54d":"rgba(20,29,46,.9)",false);c.fillStyle=done||cur?"#05080e":"#eef2f8";c.font='800 34px "Barlow Condensed"';c.textAlign="center";c.fillText(AR[k],x0+i*(bw+gap)+bw/2,56-(cur?6:0)+39)});
      if(st.ph==="go"){rr(c,30,124,300,6,3,"#141d2e",false);rr(c,30,124,Math.max(2,300*(1-st.t/st.time)),6,3,st.t/st.time>.7?"#ff5468":"#36d38e",false);hint(c,"Okların yönünde ekranı kaydır",28)}
      if(st.ph==="done"){bigText(c,st.msg,185,st.ok?"#ffc54d":"#ffffff",30);if(st.t>1.2){if(st.ok)ok++;n++;if(n>=reps)finish(stop,res,{ok,reps});else next()}}
      info(`${Math.min(n+1,reps)}/${reps} · başarılı ${ok}`);
    });
  });
}
/* ---- Post-up: it, sonra kanca ---- */
function mgPost(el,{eff,reps=1,title="Post-up"}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,ok=0,st;const ol=OPP_LOOK();
    const next=()=>{st={ph:"push",t:0,pos:.15,zc:rnd(.35,.65),nv:.5,ball:{x:0,y:0,vx:0,vy:0,rot:0},msg:"",ok:false}};next();
    const act=()=>{if(st.ph==="push"){st.pos=Math.min(1,st.pos+.055*(.6+eff/100));buzz(5)}else if(st.ph==="aim"){const zw=.06+eff*.0012+st.pos*.1,good=Math.abs(st.nv-st.zc)<zw/2;const px=150+st.pos*90;st.ball={x:px+6,y:GROUND-150,vx:0,vy:0,rot:0};aimAt(st.ball,HOOP.x+(good?rnd(-3,3):(Math.random()<.5?-1:1)*rnd(15,24)),HOOP.y-8,.75);st.ph="fly";st.t=0}};
    CV.onpointerdown=act;window.onkeydown=e=>{if(e.code==="Space"){e.preventDefault();act()}};
    $("#mgC").innerHTML=`<button class="btn bad" id="pb">İt</button>`;$("#pb").onpointerdown=e=>{e.preventDefault();act()};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&st.ok});st.t+=dt;
      if(st.ph==="push"){st.pos=Math.max(0,st.pos-dt*.16*(1+lvl()*.12));if(st.t>2.6){st.ph="aim";st.t=0;$("#pb").textContent="Kanca"}}
      if(st.ph==="aim")st.nv=.5+.5*Math.sin(st.t*(2.6+lvl()*.3));
      if(st.ph==="fly"||st.ph==="done"){if(stepBall(st.ball,dt)){st.ok=true;ok++;st.msg="Kanca içeride!";buzz(25)}if(st.ph==="fly"&&(st.t>2.4||st.ball.bounce>=2)){st.ph="done";st.t=0;if(!st.ok)st.msg="Çemberden döndü"}}
      const px=150+st.pos*90;
      drawKid(c,px+38,GROUND,.86,ol,{...oppKit(),flip:true,armsUp:st.ph!=="push",mood:"kizgin"});
      drawKid(c,px,GROUND,.88,S.look,{...me(),flip:true,dribble:st.ph==="push",armsUp:st.ph==="aim",mood:st.ph==="done"?(st.ok?"mutlu":"uzgun"):"kizgin"});
      if(st.ph==="push"||st.ph==="aim")drawBall(c,st.ph==="push"?px-30:px+6,st.ph==="push"?GROUND-26-Math.abs(Math.sin(T*8))*18:GROUND-150,BR,T*3);else drawBall(c,st.ball.x,st.ball.y,BR,st.ball.rot);
      drawHoopFront(c);
      if(st.ph==="push"){rr(c,30,70,300,14,7,"#141d2e",false);rr(c,30,70,300*st.pos,14,7,"#ff6a2b",false);hint(c,"Hızlı hızlı dokun, rakibi potaya doğru it",40);c.font='800 13px "Barlow Condensed"';c.fillStyle="#fff";c.textAlign="right";c.fillText(`${Math.max(0,2.6-st.t).toFixed(1)} SN`,W-14,104)}
      if(st.ph==="aim"){const zw=.06+eff*.0012+st.pos*.1;rr(c,30,70,300,20,10,"#141d2e",false);rr(c,30+300*(st.zc-zw/2),70,300*zw,20,4,"#36d38e",false);rr(c,30+300*st.nv-3,64,6,32,3,"#fff",false);hint(c,"Yeşilde kanca at",40)}
      if(st.ph==="done"){bigText(c,st.msg,160,st.ok?"#ffc54d":"#fff");if(st.t>1.1){n++;if(n>=reps)finish(stop,res,{ok,reps});else{next();$("#pb").textContent="İt"}}}
      info(`${Math.min(n+1,reps)}/${reps} · sayı ${ok}`);
    });
  });
}
/* ---- Ribaund: top halkanın içindeyken zıpla ---- */
function mgRebound(el,{eff,reps=1,title="Ribaund"}){
  mkStage(el,title);
  return new Promise(res=>{
    let n=0,ok=0,st;const ol=OPP_LOOK();
    const next=()=>{const b={x:60,y:GROUND-130,vx:0,vy:0,rot:0};aimAt(b,HOOP.x-HOOP.r+rnd(-6,4),HOOP.y,1);st={ph:"wait",t:0,b,kx:250,jump:0,ring:{x:250,y:GROUND-190},r:16+eff*.16,msg:"",ok:false}};next();
    const tap=()=>{if(st.ph!=="wait"||st.jump)return;st.jump=.001;const d=Math.hypot(st.b.x-st.ring.x,st.b.y-st.ring.y);st.ok=d<st.r&&st.t>.8;st.ph="done";st.t=0;st.msg=st.ok?pick(["Ribaund!","Topu kopardı","Boyalı alan senin"]):"Top elinden kaçtı";if(st.ok){ok++;buzz(25)}};
    CV.onpointerdown=tap;window.onkeydown=e=>{if(e.code==="Space"){e.preventDefault();tap()}};
    $("#mgC").innerHTML=`<button class="btn pri" id="rbb">Zıpla</button>`;$("#rbb").onpointerdown=e=>{e.preventDefault();tap()};
    const stop=loop((dt,T)=>{const c=CX;drawArena(c,T,{cheer:st.ph==="done"&&st.ok});st.t+=dt;
      if(st.ph==="wait"||!st.ok){stepBall(st.b,dt);if(st.b.in){st.b.in=false}}
      if(st.ph==="wait"){st.kx+=(clamp(st.b.x,200,320)-st.kx)*dt*2;st.ring.x=st.kx;if(st.b.bounce>=1||st.t>4){st.ph="done";st.t=0;st.msg="Rakip aldı"}}
      if(st.jump)st.jump+=dt;const jy=st.jump?Math.max(0,Math.sin(Math.min(1,st.jump*2.2)*Math.PI))*70:0;
      drawKid(c,st.kx+34,GROUND,.84,ol,{...oppKit(),flip:true,armsUp:true,mood:"kizgin"});
      drawKid(c,st.kx,GROUND-jy,.88,S.look,{...me(),armsUp:true,mood:st.ph==="done"?(st.ok?"mutlu":"uzgun"):"saskin"});
      const bx=st.ph==="done"&&st.ok?st.kx:st.b.x,by=st.ph==="done"&&st.ok?GROUND-170-jy:st.b.y;drawBall(c,bx,by,BR,st.b.rot);drawHoopFront(c);
      if(st.ph==="wait"){const inside=Math.hypot(st.b.x-st.ring.x,st.b.y-st.ring.y)<st.r&&st.t>.8;c.strokeStyle=inside?"#36d38e":"rgba(255,255,255,.6)";c.lineWidth=3;c.setLineDash([6,5]);c.beginPath();c.arc(st.ring.x,st.ring.y,st.r,0,7);c.stroke();c.setLineDash([]);hint(c,"Top yeşil halkanın içine girince zıpla")}
      if(st.ph==="done"){bigText(c,st.msg,140,st.ok?"#ffc54d":"#fff");if(st.t>1.1){n++;if(n>=reps)finish(stop,res,{ok,reps});else next()}}
      info(`${Math.min(n+1,reps)}/${reps} · ribaund ${ok}`);
    });
  });
}
/* ---- Ağırlık ---- */
function mgGym(el,{title="Ağırlık"}){
  mkStage(el,title);
  return new Promise(res=>{
    let taps=0,t=0,started=false,done=false,lift=0;
    const tap=()=>{if(done)return;started=true;taps++;lift=Math.min(1,lift+.18)};
    $("#mgC").innerHTML=`<button class="btn bad" id="tp">Kaldır</button>`;$("#tp").onpointerdown=e=>{e.preventDefault();tap()};CV.onpointerdown=tap;window.onkeydown=e=>{if(e.code==="Space"){e.preventDefault();tap()}};
    const stop=loop((dt,T)=>{const c=CX;if(started&&!done)t+=dt;lift=Math.max(0,lift-dt*1.1);
      c.fillStyle="#10182a";c.fillRect(0,0,W,H);c.fillStyle="#172238";for(let x=0;x<W;x+=60)c.fillRect(x,0,30,FLOOR);c.fillStyle="#2b2f38";c.fillRect(0,FLOOR,W,H-FLOOR);
      c.fillStyle=ARENA.home;c.font='800 22px "Barlow Condensed"';c.textAlign="center";c.fillText(`${S.team.short} PERFORMANS MERKEZİ`,W/2,70);
      drawKid(c,180,GROUND,1.05,S.look,{...me(),armsUp:lift>.5,mood:lift>.5?"kizgin":"saskin"});
      const by=lift>.5?GROUND-178:GROUND-80-lift*60;c.lineWidth=6;c.strokeStyle="#05080e";c.beginPath();c.moveTo(80,by);c.lineTo(280,by);c.stroke();c.lineWidth=2;rr(c,70,by-26,16,52,3,"#333");rr(c,274,by-26,16,52,3,"#333");rr(c,54,by-20,14,40,3,"#555");rr(c,292,by-20,14,40,3,"#555");
      if(!done){rr(c,30,96,300,6,3,"#24314a",false);rr(c,30,96,Math.max(2,300*Math.max(0,1-t/5)),6,3,"#36d38e",false)}
      bigText(c,String(taps),160,"#ffc54d",52);if(!started)hint(c,"Kaldır'a ya da ekrana hızlı hızlı dokun",H-20);
      if(t>=5&&!done){done=true;setTimeout(()=>finish(stop,res,{taps}),900)}
      if(done)bigText(c,taps>=40?"Canavar set":taps>=28?"Güçlü set":"Zayıf set",220,"#fff",30);
      info(`${Math.max(0,5-t).toFixed(1)} sn`);
    });
  });
}
/* ---- Arcade: pota makinesi ---- */
function mgArcade(el){
  mkStage(el,"Pota makinesi");
  return new Promise(res=>{
    let score=0,t=0,b={x:180,y:420,vx:0,vy:0,fly:false,s:1},sw=null,flash=0,msg="";const DUR=25;
    CV.onpointerdown=e=>{if(b.fly)return;sw={...ppos(e),t:performance.now()}};
    CV.onpointerup=CV.onpointercancel=e=>{if(!sw||b.fly)return;const p=ppos(e),dt=Math.max(60,performance.now()-sw.t)/1000,dx=p.x-sw.x,dy=p.y-sw.y;sw=null;if(dy>-40)return;b.vx=clamp(dx/dt,-500,500)*.9;b.vy=clamp(dy/dt,-1600,-500);b.fly=true;buzz(8)};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      const hx=180+Math.sin(T*(1.2+t/14))*100;
      const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1a0f33");g.addColorStop(1,"#0a0616");c.fillStyle=g;c.fillRect(0,0,W,H);
      c.save();c.shadowColor="#ff3fa4";c.shadowBlur=16;c.strokeStyle="#ff3fa4";c.lineWidth=4;c.strokeRect(10,10,W-20,H-20);c.restore();
      c.strokeStyle="rgba(120,90,255,.35)";c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(60+i*34,H-20);c.lineTo(150+i*8,140);c.stroke()}
      rr(c,hx-44,40,88,58,4,"rgba(230,240,255,.92)",false);c.strokeStyle="#ff5a1c";c.lineWidth=2;c.strokeRect(hx-16,62,32,24);
      c.strokeStyle="#ff5a1c";c.lineWidth=5;c.beginPath();c.ellipse(hx,104,26,7,0,0,7);c.stroke();c.strokeStyle="#fff";c.lineWidth=1.2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(hx+i*10,107);c.lineTo(hx+i*6,128);c.stroke()}
      if(b.fly){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=900*dt;b.s=clamp(.4+(b.y-100)/320*.6,.4,1);
        if(b.vy>0&&b.y<=120&&b.y>=96){if(Math.abs(b.x-hx)<22){score++;flash=1;msg=pick(["Swiş!","Sayı!","Ateş gibisin!"]);buzz(15)}else msg="Iska";b.fly=false;b.x=180;b.y=420;b.vx=b.vy=0;b.s=1}
        if(b.y>H||b.x<0||b.x>W){b.fly=false;b.x=180;b.y=420;b.s=1;msg="Iska"}}
      drawBall(c,b.x,b.y,16*b.s,T*4);
      rr(c,W/2-70,H-70,140,44,8,"#05020b",false);c.save();c.shadowColor="#ff3021";c.shadowBlur=10;c.fillStyle="#ff4d3a";c.font='800 32px "Barlow Condensed"';c.textAlign="center";c.fillText(String(score).padStart(2,"0"),W/2-30,H-38);c.fillStyle="#7cfc9a";c.fillText(Math.max(0,DUR-t).toFixed(0).padStart(2,"0"),W/2+34,H-38);c.restore();
      if(flash>0){c.fillStyle=`rgba(255,63,164,${flash*.2})`;c.fillRect(0,0,W,H);flash-=dt*2}
      if(msg)bigText(c,msg,200,"#ff9fd2",28);
      if(t<2.5)hint(c,"Topu yukarı doğru fırlat (kaydır)",170);
      if(t>=DUR){finish(stop,res,{score})}
      info(`Rekor ${S.rec.arcade}`);
    });
  });
}
/* ---- Arcade: refleks ---- */
function mgReflex(el){
  mkStage(el,"Refleks paneli");
  return new Promise(res=>{
    let score=0,t=0,lit=-1,litT=0,miss=0;const DUR=15;const pos=Array.from({length:9},(_,i)=>({x:70+(i%3)*110,y:150+Math.floor(i/3)*110}));
    const nextLit=()=>{let k;do k=ri(0,8);while(k===lit);lit=k;litT=0};nextLit();
    CV.onpointerdown=e=>{const p=ppos(e);const k=pos.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<46);if(k<0)return;if(k===lit){score++;buzz(8);nextLit()}else{score=Math.max(0,score-1);miss=.3}};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;litT+=dt;if(litT>Math.max(.45,1-t*.03))nextLit();
      c.fillStyle="#0c0a1c";c.fillRect(0,0,W,H);c.fillStyle="#ffd54f";c.font='800 22px "Barlow Condensed"';c.textAlign="center";c.fillText(`SKOR ${score}  ·  ${Math.max(0,DUR-t).toFixed(1)} SN`,W/2,60);
      pos.forEach((q,i)=>{c.save();if(i===lit){c.shadowColor="#29b6f6";c.shadowBlur=24}ell(c,q.x,q.y,40,40,i===lit?"#29b6f6":"#1e1a38",0,false);c.restore();c.lineWidth=3;c.strokeStyle="#3a3266";c.beginPath();c.arc(q.x,q.y,40,0,7);c.stroke()});
      if(miss>0){c.fillStyle=`rgba(255,84,104,${miss})`;c.fillRect(0,0,W,H);miss-=dt}
      if(t<2)hint(c,"Yanan düğmeye dokun",H-30);
      if(t>=DUR)finish(stop,res,{score});
      info(`Rekor ${S.rec.reflex}`);
    });
  });
}
/* ---- Medya: fotoğraf çekimi ---- */
function mgPhoto(el,{title="Çekim",bg="arena"}){
  mkStage(el,title);
  return new Promise(res=>{
    let shots=0,best=-1,bestImg=null,flash=0,t=0,last="";const pose=()=>Math.sin(t*2.3)>.55;
    const shoot=()=>{if(shots>=3)return;const x=180+Math.sin(t*1.7)*120,d=Math.abs(x-180);let sc=clamp(Math.round(100-d*.9+(pose()?18:0)),0,100);shots++;flash=1;buzz(12);last=sc>=85?"Kapak fotoğrafı!":sc>=60?"Güzel kare":"Bulanık çıktı";
      if(sc>best){best=sc;requestAnimationFrame(()=>{try{bestImg=CV.toDataURL("image/jpeg",.72)}catch(e){bestImg=null}})}};
    $("#mgC").innerHTML=`<button class="btn gold" id="sh">● Çek</button>`;$("#sh").onpointerdown=e=>{e.preventDefault();shoot()};CV.onpointerdown=shoot;
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      if(bg==="arena")drawArena(c,T,{});else{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1d2840");g.addColorStop(1,"#0d1322");c.fillStyle=g;c.fillRect(0,0,W,H);for(let i=0;i<9;i++){const h=60+(i*53)%160;c.fillStyle="#26354f";c.fillRect(i*42,H-120-h,36,h)}c.fillStyle="#3a3a3a";c.fillRect(0,H-120,W,120)}
      const x=180+Math.sin(t*1.7)*120;drawKid(c,x,GROUND,.95,S.look,{...me(),armsUp:pose(),mood:"mutlu"});if(!pose())drawBall(c,x+32,GROUND-26-Math.abs(Math.sin(T*9))*18,BR,T*4);
      c.strokeStyle="rgba(255,255,255,.85)";c.lineWidth=2;const fx=120,fy=200,fw=120,fh=250;[[fx,fy,1,1],[fx+fw,fy,-1,1],[fx,fy+fh,1,-1],[fx+fw,fy+fh,-1,-1]].forEach(([a,b,sx,sy])=>{c.beginPath();c.moveTo(a,b+22*sy);c.lineTo(a,b);c.lineTo(a+22*sx,b);c.stroke()});
      c.fillStyle="#ff5468";c.beginPath();c.arc(24,24,5,0,7);c.fill();c.fillStyle="#fff";c.font='700 12px Manrope';c.textAlign="left";c.fillText("REC",34,28);
      if(flash>0){c.fillStyle=`rgba(255,255,255,${flash})`;c.fillRect(0,0,W,H);flash-=dt*3}
      if(last)bigText(c,last,150,"#ffc54d",26);
      if(shots===0)hint(c,"Oyuncu çerçevenin ortasında ve kollar havadayken çek",H-14);
      if(shots>=3&&flash<=0){setTimeout(()=>finish(stop,res,{score:best,img:bestImg}),500);shots=99}
      info(`Kare ${Math.min(shots,3)}/3 · en iyi ${Math.max(0,best)}`);
    });
  });
}
