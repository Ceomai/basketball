"use strict";
/* ================= ARCADE OYUNLARI =================
   Her karede gölge/ışıma (shadowBlur) yok: mobilde takılmanın ana sebebiydi.
   Parlama efekti yarı saydam halkalarla veriliyor. */
const halo=(c,x,y,r,col,a=.25)=>{c.globalAlpha=a;ell(c,x,y,r,r,col,0,false);c.globalAlpha=1};

/* ---- Pota makinesi: yukarı kaydır, fırlat ---- */
function mgArcade(el){
  mkStage(el,"Pota makinesi");
  return new Promise(res=>{
    const DUR=30,HY=112,BY=345;let score=0,shots=0,t=0,phase=0,flash=0,msg="",mt=0,start=null,ball=null,cool=0;
    CV.onpointerdown=e=>{if(ball||cool>0)return;start={...ppos(e)};try{CV.setPointerCapture(e.pointerId)}catch(_){}};
    CV.onpointermove=e=>{if(!start||ball)return;const p=ppos(e),dx=p.x-start.x,dy=p.y-start.y;start.cx=p.x;start.cy=p.y;
      if(-dy>30){const k=(BY-HY)/Math.max(30,-dy);ball={x0:180,tx:clamp(180+dx*k*.9,30,330),t:0,dur:.48};shots++;start=null;buzz(6)}};
    CV.onpointerup=CV.onpointercancel=()=>{start=null};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;cool-=dt;
      phase+=dt*(1+Math.min(score,20)*.06);const hx=180+Math.sin(phase)*95;
      // kabin
      const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1a0f33");g.addColorStop(1,"#0a0616");c.fillStyle=g;c.fillRect(0,0,W,H);
      c.strokeStyle="#ff3fa4";c.lineWidth=4;c.strokeRect(10,10,W-20,H-20);c.globalAlpha=.25;c.lineWidth=10;c.strokeRect(10,10,W-20,H-20);c.globalAlpha=1;
      c.strokeStyle="rgba(120,90,255,.3)";c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(60+i*34,H-20);c.lineTo(150+i*8,150);c.stroke()}
      // pota
      rr(c,hx-44,38,88,56,4,"rgba(230,240,255,.92)",false);c.strokeStyle="#ff5a1c";c.lineWidth=2;c.strokeRect(hx-15,58,30,22);
      c.lineWidth=1.2;c.strokeStyle="#fff";for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(hx+i*10,HY+2);c.lineTo(hx+i*6,HY+22);c.stroke()}
      c.strokeStyle="#ff5a1c";c.lineWidth=5;c.beginPath();c.ellipse(hx,HY,26,7,0,0,7);c.stroke();
      // top
      if(ball){ball.t+=dt;const p=Math.min(1,ball.t/ball.dur),x=ball.x0+(ball.tx-ball.x0)*p,y=BY+(HY-BY)*p-Math.sin(p*Math.PI)*70,s=1-p*.55;
        drawBall(c,x,y,16*s,T*6);
        if(p>=1){const made=Math.abs(ball.tx-hx)<25;if(made){score++;flash=.6;msg="Sayı";buzz(15)}else msg="Iska";mt=.6;ball=null;cool=.12}}
      else{drawBall(c,180,BY,16,0);if(start&&start.cy!=null){c.strokeStyle="rgba(255,255,255,.35)";c.setLineDash([5,6]);c.beginPath();c.moveTo(180,BY);c.lineTo(180+(start.cx-start.x)*3,BY-140);c.stroke();c.setLineDash([])}}
      // skor tabelası
      rr(c,W/2-78,H-72,156,46,8,"#05020b",false);c.font='800 30px "Barlow Condensed"';c.textAlign="center";c.textBaseline="alphabetic";c.fillStyle="#ff4d3a";c.fillText(String(score).padStart(2,"0"),W/2-34,H-38);c.fillStyle="#7cfc9a";c.fillText(String(Math.max(0,Math.ceil(DUR-t))).padStart(2,"0"),W/2+36,H-38);
      c.font='600 9px Manrope';c.fillStyle="#8c99ae";c.fillText("SAYI",W/2-34,H-28);c.fillText("SÜRE",W/2+36,H-28);
      if(flash>0){c.fillStyle=`rgba(255,63,164,${flash*.18})`;c.fillRect(0,0,W,H);flash-=dt*2}
      if(mt>0){bigText(c,msg,230,msg==="Sayı"?"#ffc54d":"#ffffff");mt-=dt}
      if(t<3)hint(c,"Parmağını topun üstünden yukarı kaydır",180);
      if(t>=DUR&&!ball)finish(stop,res,{score,label:`${score} sayı · ${shots} atış`});
      info(`Rekor ${S.rec.arcade}`);
    });
  });
}
/* ---- Refleks paneli ---- */
function mgReflex(el){
  mkStage(el,"Refleks paneli");
  return new Promise(res=>{
    const DUR=20;let score=0,t=0,lit=[],miss=0,pulse={};const pos=Array.from({length:9},(_,i)=>({x:70+(i%3)*110,y:150+Math.floor(i/3)*110}));
    const add=()=>{let k;do k=ri(0,8);while(lit.some(l=>l.k===k));lit.push({k,life:Math.max(.55,1.1-t*.025)})};add();
    CV.onpointerdown=e=>{const p=ppos(e);const k=pos.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<48);if(k<0)return;const i=lit.findIndex(l=>l.k===k);pulse[k]=.25;if(i>=0){lit.splice(i,1);score++;buzz(6);if(!lit.length)add()}else{score=Math.max(0,score-1);miss=.25}};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      lit.forEach(l=>l.life-=dt);if(lit.some(l=>l.life<=0)){lit=lit.filter(l=>l.life>0);if(!lit.length)add()}
      if(t>8&&lit.length<2&&Math.random()<dt*.8)add();
      c.fillStyle="#0c0a1c";c.fillRect(0,0,W,H);
      c.fillStyle="#ffd54f";c.font='800 22px "Barlow Condensed"';c.textAlign="center";c.textBaseline="alphabetic";c.fillText(`SKOR ${score}  ·  ${Math.max(0,DUR-t).toFixed(1)} SN`,W/2,60);
      pos.forEach((q,i)=>{const on=lit.some(l=>l.k===i);if(on)halo(c,q.x,q.y,54,"#29b6f6",.22);ell(c,q.x,q.y,40,40,on?"#29b6f6":"#1e1a38",0,false);c.lineWidth=3;c.strokeStyle=pulse[i]>0?"#fff":"#3a3266";c.beginPath();c.arc(q.x,q.y,40,0,7);c.stroke();if(pulse[i]>0)pulse[i]-=dt});
      if(miss>0){c.fillStyle=`rgba(255,84,104,${miss})`;c.fillRect(0,0,W,H);miss-=dt}
      if(t<2.5)hint(c,"Yanan düğmelere dokun",H-30);
      if(t>=DUR)finish(stop,res,{score});
      info(`Rekor ${S.rec.reflex}`);
    });
  });
}
/* ---- Hava hokeyi ---- */
function mgHockey(el){
  mkStage(el,"Hava hokeyi");
  return new Promise(res=>{
    const R=26,PR=12,GW=64,MAXV=720;
    const P={x:180,y:410,tx:180,ty:410,vx:0,vy:0},A={x:180,y:80,vx:0,vy:0},pk={x:180,y:240,vx:0,vy:0};
    let me=0,ai=0,t=0,msg="",mt=0,pause=.8,idle=0;
    const reset=dir=>{pk.x=180;pk.y=dir>0?280:200;pk.vx=0;pk.vy=0;pause=.8};
    const setT=e=>{const p=ppos(e);P.tx=clamp(p.x,R+12,W-R-12);P.ty=clamp(p.y,252+R,H-R-12)};
    CV.onpointerdown=e=>{setT(e);try{CV.setPointerCapture(e.pointerId)}catch(_){}};CV.onpointermove=e=>{if(e.buttons||e.pointerType==="touch")setT(e)};
    const collide=m=>{const dx=pk.x-m.x,dy=pk.y-m.y,d=Math.hypot(dx,dy),min=R+PR;if(d<min&&d>0){const nx=dx/d,ny=dy/d;pk.x=m.x+nx*min;pk.y=m.y+ny*min;
      const rvx=pk.vx-m.vx,rvy=pk.vy-m.vy,vn=rvx*nx+rvy*ny;if(vn<0){pk.vx-=1.9*vn*nx;pk.vy-=1.9*vn*ny}pk.vx+=nx*60;pk.vy+=ny*60;buzz(5)}};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      // oyuncu raketi parmağı yumuşakça takip eder
      const nx=P.x+(P.tx-P.x)*Math.min(1,dt*22),ny=P.y+(P.ty-P.y)*Math.min(1,dt*22);P.vx=(nx-P.x)/dt;P.vy=(ny-P.y)/dt;P.x=nx;P.y=ny;
      // yapay zekâ
      const sp=170+lvl()*20;let gx,gy;if(pk.y<250){gx=pk.x;gy=pk.y-18}else{gx=180+(pk.x-180)*.4;gy=70}
      const ax=clamp(gx-A.x,-sp*dt,sp*dt),ay=clamp(gy-A.y,-sp*dt,sp*dt);A.vx=ax/dt;A.vy=ay/dt;A.x=clamp(A.x+ax,R+12,W-R-12);A.y=clamp(A.y+ay,R+12,228-R);
      if(pause>0)pause-=dt;else{
        const steps=3;for(let s=0;s<steps;s++){const h=dt/steps;pk.x+=pk.vx*h;pk.y+=pk.vy*h;
          if(pk.x<12+PR){pk.x=12+PR;pk.vx=Math.abs(pk.vx)*.9}if(pk.x>W-12-PR){pk.x=W-12-PR;pk.vx=-Math.abs(pk.vx)*.9}
          if(pk.y<12+PR){if(Math.abs(pk.x-180)<GW){me++;msg="Gol";mt=1;buzz(30);reset(-1);break}pk.y=12+PR;pk.vy=Math.abs(pk.vy)*.9}
          if(pk.y>H-12-PR){if(Math.abs(pk.x-180)<GW){ai++;msg="Rakip golü";mt=1;reset(1);break}pk.y=H-12-PR;pk.vy=-Math.abs(pk.vy)*.9}
          collide(P);collide(A)}
        pk.vx*=1-dt*.35;pk.vy*=1-dt*.35;const m=Math.hypot(pk.vx,pk.vy);if(m>MAXV){pk.vx*=MAXV/m;pk.vy*=MAXV/m}
        idle=m<25?idle+dt:0;if(idle>2.5){pk.vx=rnd(-80,80);pk.vy=pk.y<240?160:-160;idle=0}}
      // masa
      c.fillStyle="#0b3b2a";c.fillRect(0,0,W,H);c.strokeStyle="rgba(232,245,238,.9)";c.lineWidth=3;c.strokeRect(12,12,W-24,H-24);c.beginPath();c.moveTo(12,240);c.lineTo(W-12,240);c.stroke();c.beginPath();c.arc(180,240,46,0,7);c.stroke();
      c.fillStyle="#05080e";c.fillRect(180-GW,4,GW*2,10);c.fillRect(180-GW,H-14,GW*2,10);
      halo(c,A.x,A.y,R+8,"#29b6f6",.18);ell(c,A.x,A.y,R,R,"#29b6f6",0,false);ell(c,A.x,A.y,11,11,"#0277bd",0,false);
      halo(c,P.x,P.y,R+8,ARENA.home,.18);ell(c,P.x,P.y,R,R,ARENA.home,0,false);ell(c,P.x,P.y,11,11,shade(ARENA.home,-50),0,false);
      ell(c,pk.x,pk.y,PR,PR,"#141414",0,false);c.strokeStyle="#555";c.lineWidth=2;c.beginPath();c.arc(pk.x,pk.y,PR-3,0,7);c.stroke();
      c.fillStyle="#fff";c.font='800 34px "Barlow Condensed"';c.textAlign="right";c.textBaseline="alphabetic";c.fillText(ai,W-26,226);c.fillText(me,W-26,284);
      if(mt>0){bigText(c,msg,256,msg==="Gol"?"#ffc54d":"#ffffff");mt-=dt}
      if(t<3)hint(c,"Raketi parmağınla sürükle, pakı rakip kaleye vur",H-44);
      if(me>=5||ai>=5||t>=75)finish(stop,res,{score:me,win:me>ai,label:`${me}–${ai}`});
      info(`${Math.max(0,75-t).toFixed(0)} sn`);
    });
  });
}
/* ---- Dans ritmi / karaoke ---- */
function mgRhythm(el,{title,karaoke}){
  mkStage(el,title);
  return new Promise(res=>{
    const lanes=[54,138,222,306],cols=["#ff3fa4","#29b6f6","#ffd54f","#66bb6a"],HY=400,DUR=24,SPEED=250;
    let notes=[],t=0,score=0,combo=0,best=0,fb="",ft=0,hits=0,total=0;const flashL=[0,0,0,0];
    // sabit tempolu desen: notalar 4 vuruşluk ölçülere oturur
    const beat=.5;for(let k=2;k<DUR/beat-3;k++){if(k%8===7)continue;const l=(k*3+Math.floor(k/4))%4;notes.push({l,at:k*beat});if(k>16&&k%4===0)notes.push({l:(l+2)%4,at:k*beat});total++}
    total=notes.length;
    const press=l=>{flashL[l]=.15;const yOf=n=>HY-(n.at-t)*SPEED;const cand=notes.filter(n=>n.l===l&&!n.hit&&!n.miss).sort((a,b)=>Math.abs(yOf(a)-HY)-Math.abs(yOf(b)-HY))[0];
      if(cand&&Math.abs(yOf(cand)-HY)<46){cand.hit=true;hits++;const pf=Math.abs(yOf(cand)-HY)<20;score+=pf?2:1;combo++;best=Math.max(best,combo);fb=pf?"Tam zamanında":"İyi";ft=.35;buzz(5)}else{combo=0;fb="Erken";ft=.25}};
    $("#mgC").innerHTML=lanes.map((_,i)=>`<button class="btn" data-l="${i}" style="background:${cols[i]};border-color:${cols[i]};color:#141414" aria-label="Şerit ${i+1}">●</button>`).join("");
    $$("#mgC [data-l]").forEach(b=>b.onpointerdown=e=>{e.preventDefault();press(+b.dataset.l)});
    CV.onpointerdown=e=>{const p=ppos(e);press(clamp(Math.floor(p.x/90),0,3))};
    window.onkeydown=e=>{const k={ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3,d:0,f:1,j:2,k:3}[e.key];if(k!=null){e.preventDefault();press(k)}};
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      notes.forEach(n=>{if(!n.hit&&!n.miss&&HY-(n.at-t)*SPEED>HY+50){n.miss=true;combo=0}});
      const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,karaoke?"#2a0a2e":"#110a2a");g.addColorStop(1,"#05030c");c.fillStyle=g;c.fillRect(0,0,W,H);
      if(karaoke)drawKid(c,180,250,.7,S.look,{...jersey(),armsUp:Math.floor(t/beat)%2===0,mood:"mutlu"});
      lanes.forEach((x,i)=>{c.fillStyle=`rgba(255,255,255,${.035+flashL[i]})`;c.fillRect(x-38,0,76,H);flashL[i]=Math.max(0,flashL[i]-dt);c.strokeStyle=cols[i];c.lineWidth=3;c.beginPath();c.arc(x,HY,26,0,7);c.stroke();c.globalAlpha=.25;c.lineWidth=9;c.stroke();c.globalAlpha=1});
      notes.forEach(n=>{if(n.hit)return;const y=HY-(n.at-t)*SPEED;if(y<-30||y>H+30)return;c.globalAlpha=n.miss?.25:1;halo(c,lanes[n.l],y,30,cols[n.l],n.miss?.05:.2);c.globalAlpha=n.miss?.25:1;ell(c,lanes[n.l],y,22,22,cols[n.l],0,false);c.globalAlpha=1});
      c.fillStyle="#fff";c.font='800 22px "Barlow Condensed"';c.textBaseline="alphabetic";c.textAlign="left";c.fillText(`SKOR ${score}`,16,36);c.textAlign="right";c.fillText(`KOMBO ${combo}`,W-16,36);
      if(ft>0){bigText(c,fb,330,fb==="Erken"?"#ff5468":"#ffc54d",28);ft-=dt}
      if(t<2.2)hint(c,"Nota halkaya gelince o şeride dokun",H-14);
      if(t>=DUR)finish(stop,res,{score,label:`${hits}/${total} nota · kombo ${best}`});
      info(`${Math.max(0,DUR-t).toFixed(0)} sn`);
    });
  });
}
/* ---- Bowling ---- */
function mgBowling(el){
  mkStage(el,"Bowling");
  return new Promise(res=>{
    const ROLLS=3;let roll=0,total=0,ph="aim",t=0,aim=0,pow=0,ball=null,pins=[],msg="",mt=0;
    const setPins=()=>{pins=[];[[180],[166,194],[152,180,208],[138,166,194,222]].forEach((r,k)=>r.forEach(x=>pins.push({x,y:120-k*16,up:true,fall:0,dir:Math.random()<.5?-1:1})))};setPins();
    const lab=()=>{const b=$("#bw");if(b)b.textContent=ph==="aim"?"Nişanı sabitle":ph==="power"?"Atışı yap":"…"};
    const act=()=>{if(ph==="aim"){ph="power";t=0}else if(ph==="power"){ph="roll";ball={x:180+aim*80,y:430,s:1}}lab()};
    $("#mgC").innerHTML=`<button class="btn pri" id="bw">Nişanı sabitle</button>`;$("#bw").onpointerdown=e=>{e.preventDefault();act()};CV.onpointerdown=act;
    const stop=loop((dt,T)=>{const c=CX;t+=dt;
      if(ph==="aim")aim=Math.sin(t*1.8);if(ph==="power")pow=.5+.5*Math.sin(t*2.6-Math.PI/2);
      if(ph==="roll"){ball.y-=(360+pow*420)*dt;ball.x+=(180-ball.x)*dt*.15;ball.s=clamp(.45+(ball.y-80)/350*.55,.45,1);
        if(ball.y<140){let knocked=0;const acc=1-Math.abs(ball.x-180)/90;pins.forEach(p=>{const d=Math.abs(p.x-ball.x);const ch=clamp((1-d/(60+pow*40))*(.5+pow*.7)+acc*.25,0,1);if(Math.random()<ch){p.up=false;knocked++}});
          total+=knocked;msg=knocked===10?"Strike · 10 lobut":knocked?`${knocked} lobut`:"Oluk";mt=1.3;ph="show";t=0;buzz(knocked>5?25:8);lab()}}
      pins.forEach(p=>{if(!p.up&&p.fall<1)p.fall=Math.min(1,p.fall+dt*4)});
      if(ph==="show"&&t>1.5){roll++;if(roll>=ROLLS){finish(stop,res,{score:total,label:`${total} lobut`});return}setPins();ball=null;ph="aim";t=0;lab()}
      c.fillStyle="#140d08";c.fillRect(0,0,W,H);
      c.beginPath();c.moveTo(120,60);c.lineTo(240,60);c.lineTo(330,H);c.lineTo(30,H);c.closePath();const g=c.createLinearGradient(0,60,0,H);g.addColorStop(0,"#c08a52");g.addColorStop(1,"#e2b27a");c.fillStyle=g;c.fill();
      c.strokeStyle="rgba(0,0,0,.15)";c.lineWidth=1;for(let i=1;i<8;i++){c.beginPath();c.moveTo(120+i*15,60);c.lineTo(30+i*37.5,H);c.stroke()}
      c.fillStyle="#2a1c12";c.beginPath();c.moveTo(108,60);c.lineTo(120,60);c.lineTo(30,H);c.lineTo(8,H);c.closePath();c.fill();c.beginPath();c.moveTo(240,60);c.lineTo(252,60);c.lineTo(352,H);c.lineTo(330,H);c.closePath();c.fill();
      pins.forEach(p=>{c.save();c.translate(p.x,p.y+11);c.rotate(p.fall*1.3*p.dir);c.globalAlpha=1-p.fall*.4;c.lineWidth=1.5;c.strokeStyle=INK;ell(c,0,-11,5,11,"#fff");c.fillStyle="#e53935";c.fillRect(-5,-16,10,2);c.restore()});
      if(ball){c.lineWidth=2;c.strokeStyle=INK;ell(c,ball.x,ball.y,16*ball.s,16*ball.s,"#3949ab")}
      if(ph==="aim"){const ax=180+aim*80;c.fillStyle="#ffc54d";c.beginPath();c.moveTo(ax,362);c.lineTo(ax-10,386);c.lineTo(ax+10,386);c.closePath();c.fill();c.setLineDash([6,6]);c.strokeStyle="rgba(255,255,255,.6)";c.beginPath();c.moveTo(ax,362);c.lineTo(180+(ax-180)*.3,140);c.stroke();c.setLineDash([]);hint(c,"Ok ortaya geldiğinde dokun",40)}
      if(ph==="power"){rr(c,30,40,300,14,7,"#24314a",false);rr(c,30,40,Math.max(4,300*pow),14,7,pow>.8?"#36d38e":pow>.5?"#ffc54d":"#ff5468",false);hint(c,"Çubuk yeşildeyken dokun",80)}
      if(mt>0){bigText(c,msg,250,"#ffc54d");mt-=dt}
      c.fillStyle="#fff";c.font='800 20px "Barlow Condensed"';c.textAlign="left";c.textBaseline="alphabetic";c.fillText(`ATIŞ ${Math.min(roll+1,ROLLS)}/${ROLLS} · ${total} LOBUT`,16,H-16);
      info(`Rekor ${S.rec.bowling||0}`);
    });
  });
}
