"use strict";
/* ================= ŞANS SALONU ================= */
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const REDS=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
/* Oyun Kulübü: yalnızca fişle oynanır. Fişler parayla alınamaz, paraya çevrilemez; her hafta en az 500'e tamamlanır.
   Ödül olarak sadece vitrin kupaları verilir. */
let BET=10;
const chips=()=>{if(S.chips==null)S.chips=1000;return S.chips};
const fis=n=>`${Math.round(n).toLocaleString("tr-TR")} fiş`;
function chipTx(a){S.chips=Math.max(0,chips()+a);if(a>0)sfx("win");
  const m=[[5000,"Kart masası ustası"],[20000,"Oyun Kulübü efsanesi"]];S.chipAw=S.chipAw||[];
  for(const[v,n]of m)if(S.chips>=v&&!S.chipAw.includes(v)){S.chipAw.push(v);S.career.trophies.push({type:"arcade",label:`${seasonLabel()} · ${n}`});toast(`Vitrine yeni kupa: ${n}`)}
  save()}

function betBar(){const bets=[10,50,100,250,500,1000].filter(b=>b<=Math.max(10,chips()));if(!bets.includes(BET))BET=bets[0];return`<div class="row between"><div class="eyebrow">Bahis</div><span class="gold disp" id="bal">${fis(chips())}</span></div><div class="opts" id="bets">${bets.map(b=>`<button class="opt ${b===BET?"on":""}" data-b="${b}">${b}</button>`).join("")}</div>`}
function bindBets(re){$$("#bets [data-b]").forEach(b=>b.onclick=()=>{BET=+b.dataset.b;re()})}
const updBal=()=>{const e=$("#bal");if(e)e.textContent=fis(chips())};
function locSans(I,game="rulet"){
  if(S.age<18){const y=18-S.age;sheet("Oyun Kulübü","18 yaş sınırı",`<div class="card"><div class="eyebrow">Kapıdaki görevli</div><div class="say">"Kimliğine bakayım... ${S.age} yaşındasın. Kusura bakma, kurallar net: 18 yaşından küçükler giremez. Git antrenmanını yap, ${y===1?"seneye":y+" yıl sonra"} gel."</div><p class="small muted">Oyun Kulübü 18 yaşından itibaren açılır. O zamana kadar eğlence merkezindeki arcade oyunlarını oynayabilirsin.</p><button class="btn pri" id="bk">Haritaya dön</button></div>`);$("#bk").onclick=()=>renderMain();return}
  const tabs=[["rulet","Rulet","wheel"],["bj","Blackjack","cards"],["slot","Slot","seven"]];
  const b=sheet(I.n,"Fişler yalnızca eğlence içindir",`${tabsHTML(tabs,game,"g")}<div id="gc" style="display:flex;flex-direction:column;gap:12px"></div>`);
  $$(".tabs button").forEach(x=>x.onclick=()=>locSans(I,x.dataset.g));
  addScene(b,"sans",{rulet:"Bahisler kapanmadan oynayın lütfen.",bj:"Kart ister misiniz?",slot:"Kolu çek, şansını dene."}[game]);
  ({rulet:roulette,bj:blackjack,slot:slots})[game](I);
  b.insertAdjacentHTML("beforeend",`<p class="small muted">Fişler gerçek ya da oyun içi parayla alınamaz, paraya çevrilemez. Her hafta bakiyen en az 500 fişe tamamlanır. 5.000 ve 20.000 fişe ulaşınca vitrine kupa eklenir.</p>`);
}
function roulette(I){
  const c=$("#gc");
  c.innerHTML=`${betBar()}<div class="felt"><div style="position:relative;width:min(280px,100%)"><canvas id="wh" style="width:100%;aspect-ratio:1"></canvas></div><div id="rmsg" class="disp" style="font-size:1.3rem">Bahsini seç</div></div>
   <div class="grid3">${[["r","Kırmızı ×2","#c62828"],["b","Siyah ×2","#212121"],["g","Yeşil 0 ×36","#2e7d32"],["odd","Tek ×2",""],["even","Çift ×2",""],["low","1–18 ×2",""]].map(([k,t,col])=>`<button class="btn" data-p="${k}" style="${col?`background:${col};border-color:${col}`:""}">${t}</button>`).join("")}</div>`;
  bindBets(()=>roulette(I));
  const cv=$("#wh"),d=Math.max(2,devicePixelRatio||1),SZ=280;cv.width=SZ*d;cv.height=SZ*d;const g=cv.getContext("2d");g.scale(d,d);
  let ang=0,ballA=0;const N=37,seg=Math.PI*2/N;
  const draw=()=>{g.clearRect(0,0,SZ,SZ);const cx=SZ/2,cy=SZ/2;g.save();g.translate(cx,cy);
    g.fillStyle="#3e2723";g.beginPath();g.arc(0,0,136,0,7);g.fill();g.fillStyle="#d8b25a";g.beginPath();g.arc(0,0,128,0,7);g.fill();
    g.rotate(ang);for(let i=0;i<N;i++){const n=WHEEL[i];g.beginPath();g.moveTo(0,0);g.arc(0,0,122,i*seg-Math.PI/2-seg/2,(i+1)*seg-Math.PI/2-seg/2);g.closePath();g.fillStyle=n===0?"#2e7d32":REDS.has(n)?"#c62828":"#1b1b1b";g.fill();
      g.save();g.rotate(i*seg);g.fillStyle="#fff";g.font='700 10px "Barlow Condensed"';g.textAlign="center";g.fillText(n,0,-106);g.restore()}
    g.fillStyle="#5d4037";g.beginPath();g.arc(0,0,70,0,7);g.fill();g.fillStyle="#d8b25a";g.beginPath();g.arc(0,0,16,0,7);g.fill();
    for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.fillStyle="#d8b25a";g.fillRect(-3,-66,6,50);g.restore()}
    g.restore();g.fillStyle="#fff";g.beginPath();g.arc(cx+Math.cos(ballA)*92,cy+Math.sin(ballA)*92,6,0,7);g.fill();g.strokeStyle="#141414";g.stroke();
    g.fillStyle="#d8b25a";g.beginPath();g.moveTo(cx-8,4);g.lineTo(cx+8,4);g.lineTo(cx,20);g.closePath();g.fill()};
  ballA=-Math.PI/2;draw();let busy=false;
  $$("[data-p]").forEach(btn=>btn.onclick=()=>{if(busy)return;if(chips()<BET){toast("Fişin yetersiz. Haftaya tamamlanacak.");return}busy=true;chipTx(-BET);updBal();
    const k=ri(0,36),n=WHEEL[k];const start=ang,TAU=Math.PI*2,target=start+TAU*5+((-k*seg-start)%TAU+TAU)%TAU;const b0=ballA,bT=b0-Math.PI*2*7;const T0=performance.now(),DUR=3800;
    $("#rmsg").textContent="Top dönüyor…";
    let lastSeg=-1;const step=t=>{const p=Math.min(1,(t-T0)/DUR),e=1-Math.pow(1-p,3);const sg=Math.floor(ang/seg);if(sg!==lastSeg){lastSeg=sg;sfx("tick")}ang=start+(target-start)*e;ballA=b0+(bT-b0)*e;if(p>=1)ballA=-Math.PI/2;draw();if(p<1)requestAnimationFrame(step);else done()};
    requestAnimationFrame(step);
    const done=()=>{sfx("clack");const col=n===0?"g":REDS.has(n)?"r":"b",bet=btn.dataset.p;const win=bet===col||(n>0&&((bet==="odd"&&n%2)||(bet==="even"&&n%2===0)||(bet==="low"&&n<=18)));const pay=win?(bet==="g"?BET*36:BET*2):0;if(pay)chipTx(pay);
      $("#rmsg").innerHTML=`<span style="color:${col==="r"?"#ff6b6b":col==="g"?"#7ee2a8":"#fff"}">${n}</span> · ${win?`<span class="good">+${fis(pay)}</span>`:`<span class="bad">−${fis(BET)}</span>`}`;norm();save();updBal();busy=false}});
}
function blackjack(I){
  const c=$("#gc");const suits=[["♠",0],["♥",1],["♦",1],["♣",0]],ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  let deck,ph=[],dh=[],over=true;
  const val=h=>{let t=0,a=0;h.forEach(cd=>{const r=cd.r;if(r==="A"){a++;t+=11}else t+=["J","Q","K"].includes(r)?10:+r});while(t>21&&a){t-=10;a--}return t};
  const cardH=(cd,hide)=>hide?`<div class="cardx back"></div>`:`<div class="cardx ${cd.red?"red":""}"><span>${cd.r}${cd.s}</span><span>${cd.r}${cd.s}</span></div>`;
  const render=(msg)=>{c.innerHTML=`${betBar()}<div class="felt"><div class="eyebrow" style="color:#cfe9da">Krupiye ${over?"· "+val(dh):""}</div><div class="hand">${dh.map((cd,i)=>cardH(cd,!over&&i===1)).join("")}</div><div class="eyebrow" style="color:#cfe9da">Sen · ${ph.length?val(ph):"–"}</div><div class="hand">${ph.map(cd=>cardH(cd)).join("")}</div><div class="disp" style="font-size:1.2rem">${msg||""}</div></div>
     ${over?`<button class="btn gold big" id="deal">Dağıt · ${BET} fiş</button>`:`<div class="grid3"><button class="btn good" id="hit">Kart</button><button class="btn" id="stand">Dur</button><button class="btn gold" id="dbl" ${ph.length>2||chips()<BET?"disabled":""}>İkiye katla</button></div>`}<p class="small muted">Blackjack ×2,5 öder. Krupiye 17'de durur.</p>`;
    bindBets(()=>{if(over)render(msg)});
    if(over)$("#deal").onclick=deal;else{$("#hit").onclick=hit;$("#stand").onclick=stand;$("#dbl").onclick=dbl}};
  let stake=0;
  const draw=()=>{sfx("card");return deck.pop()};
  const deal=()=>{if(chips()<BET){toast("Fişin yetersiz. Haftaya tamamlanacak.");return}stake=BET;chipTx(-stake);deck=shuffle(suits.flatMap(([s,red])=>ranks.map(r=>({r,s,red}))));ph=[draw(),draw()];dh=[draw(),draw()];over=false;
    if(val(ph)===21){over=true;const p=Math.round(stake*2.5);chipTx(p);save();render(`<span class="good">Blackjack! +${fis(p)}</span>`);return}render()};
  const hit=()=>{ph.push(draw());if(val(ph)>21){over=true;save();render(`<span class="bad">Battın. −${fis(stake)}</span>`)}else render()};
  const stand=()=>{over=true;while(val(dh)<17)dh.push(draw());const p=val(ph),d=val(dh);let msg;
    if(d>21||p>d){chipTx(stake*2);msg=`<span class="good">Kazandın! +${fis(stake)}</span>`}else if(p===d){chipTx(stake);msg="Berabere, bahis iade."}else msg=`<span class="bad">Krupiye kazandı. −${fis(stake)}</span>`;
    norm();save();render(msg)};
  const dbl=()=>{if(chips()<stake)return;chipTx(-stake);stake*=2;ph.push(draw());if(val(ph)>21){over=true;save();render(`<span class="bad">Battın. −${fis(stake)}</span>`)}else stand()};
  render("Bahsini seç ve dağıt");
}
function slots(I){
  const c=$("#gc");const SYM=[["ball",()=>icon("ball"),6],["sneaker",()=>icon("sneaker","#eceff1","#e53935"),4],["star",()=>icon("star"),10],["seven",()=>icon("seven"),15],["cup",()=>icon("cup"),25]];
  const W8=[30,30,20,12,8];
  const pickSym=()=>{let r=Math.random()*100;for(let i=0;i<5;i++){if(r<W8[i])return i;r-=W8[i]}return 0};
  c.innerHTML=`${betBar()}<div class="reels">${[0,1,2].map(i=>`<div class="reel" id="r${i}">${SYM[i][1]()}</div>`).join("")}</div><div id="smsg" class="disp" style="font-size:1.25rem;text-align:center">Üç kupa: ×25 · üç 7: ×15 · üç yıldız: ×10</div><button class="btn gold big" id="spin">Kolu çek · ${BET} fiş</button><p class="small muted">Aynı iki sembol bahsin 1,5 katını öder.</p>`;
  bindBets(()=>slots(I));let busy=false;
  $("#spin").onclick=async()=>{if(busy)return;if(chips()<BET){toast("Fişin yetersiz. Haftaya tamamlanacak.");return}busy=true;chipTx(-BET);updBal();$("#smsg").textContent="…";
    const res=[pickSym(),pickSym(),pickSym()];const reels=[0,1,2].map(i=>$("#r"+i));
    const ivs=reels.map((r,i)=>{r.classList.add("spin");return setInterval(()=>{r.innerHTML=SYM[ri(0,4)][1]();sfx("reel")},80)});
    for(let i=0;i<3;i++){await wait(700+i*450);clearInterval(ivs[i]);if(!reels[i].isConnected){ivs.forEach(clearInterval);busy=false;return}reels[i].classList.remove("spin");reels[i].innerHTML=SYM[res[i]][1]();buzz(10);sfx("reelStop")}
    let pay=0;if(res[0]===res[1]&&res[1]===res[2])pay=BET*SYM[res[0]][2];else if(res[0]===res[1]||res[1]===res[2]||res[0]===res[2])pay=Math.round(BET*1.5);
    if(pay)chipTx(pay);$("#smsg").innerHTML=pay?`<span class="good">+${fis(pay)}</span>`:`<span class="bad">Olmadı</span>`;norm();save();updBal();busy=false};
}
