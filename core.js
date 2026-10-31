"use strict";
/* ================= DURUM ================= */
let S=null;
const fullName=()=>`${S.first} ${S.last}`;
const jersey=()=>({jersey:S.team.c1,trim:S.team.c2,number:S.num});
const TD=()=>tdOf(S.stage,S.team.cc);
function ovr(){const w={PG:[1,1.3,1.2,.7,.8],SG:[1.4,.9,1.1,.7,.9],SF:[1.1,.9,1,1,1],PF:[.9,.7,.8,1.3,1.3],C:[.7,.7,.7,1.5,1.4]}[S.pos];let t=0,ws=0;STATS.forEach(([k],i)=>{t+=S.st[k]*w[i];ws+=w[i]});return Math.round(t/ws)}
function eff(k){return clamp(S.st[k]-TD()+(S.energy-60)/6+(S.moral-50)/10+(S.buffs.motive?4:0),3,100)}
function fame(){return clamp(Math.round(Math.log10(Math.max(10,S.followers))*16-28),0,100)}
function norm(){for(const[k]of STATS)S.st[k]=clamp(Math.round(S.st[k]),1,99);for(const[k]of RELS)S.rel[k]=clamp(Math.round(S.rel[k]),0,100);S.moral=clamp(Math.round(S.moral),0,100);S.energy=clamp(Math.round(S.energy),0,100);S.aka=clamp(Math.round(S.aka),0,100);S.followers=Math.max(0,Math.round(S.followers))}
function tx(d,a){a=Math.round(a);if(a>0&&/prim|bonus|ödül|Sponsor|Reklam|kazanc/i.test(d))sfx("coin");S.tx.unshift({w:`S${S.season}·H${S.week}`,d,a});S.tx=S.tx.slice(0,40);S.money+=a;if(a>0)S.career.earned+=a}
function news(t){S.news.unshift({w:`S${S.season} H${S.week}`,t});S.news=S.news.slice(0,8)}
const seasonLabel=()=>`${S.year}–${String(S.year+1).slice(2)}`;
const lgName=()=>leagueName(S.stage,S.team.cc,S.stageSeason);
function setTeamVars(){const t=S&&S.team;const r=document.documentElement.style;if(!t){r.setProperty("--team","#ff6a2b");r.setProperty("--team-ink","#140a04");return}
  let a=t.c1;if(luma(a)<70)a=t.c2;if(luma(a)<70)a="#ff6a2b";r.setProperty("--team",a);r.setProperty("--team-ink",luma(a)>150?"#0a0f18":"#ffffff");r.setProperty("--team2",t.c2)}
const bestCar=()=>S.items.araba3?icon("car","#d0142c","super"):S.items.araba2?icon("car","#eceff1","suv"):S.items.araba1?icon("car","#1e88e5","hatch"):null;

/* ---- Takımlar ---- */
// kind: lise | uni | pro ; pro takımlar şehir + seviye tuzuyla sabit kimlik taşır
const MY_LISE="Mavi Martı Spor Lisesi";
const MY_UNI={"İstanbul|0":"Çınaraltı Üniversitesi","İstanbul|2":"Kıyıkent Spor Akademisi","Ankara|0":"Bozkır Teknik Üniversitesi"};
function makeTeam(kind,city,salt=0){
  S.teams=S.teams||{};const key=`${kind}|${city}|${salt}`;if(S.teams[key])return S.teams[key];
  const cc=CITY_C[city]||"TR",h=hash(city+kind)+salt*7;let name,short;
  const h0=hash(city+kind);
  if(kind==="mylise"){name=MY_LISE;short="MMS"}                                        // kendi okulumuz: gerçekte olmayan isim
  else if(kind==="myuni"){name=MY_UNI[`${city}|${salt}`]||`${city} Yıldızkent Üniversitesi`;short=name.slice(0,3)}
  else if(kind==="lise"){if(city==="İstanbul"){const d=IST_DIST[(salt-1+h0+IST_DIST.length)%IST_DIST.length];name=`${d} ${IST_TYPE[(salt*2+h0)%IST_TYPE.length]}`;short=d.slice(0,3)}else{name=`${city} ${IST_TYPE[h0%IST_TYPE.length]}`}}
  else if(kind==="uni"){name=`${city} ${["Üniversitesi","Teknik Üniversitesi","Spor Akademisi"][salt%3]}`}
  else{const p=PAT[cc]||PAT.TR;name=p[(salt+(h>>2))%p.length](city)}
  short=(short||city).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-zıİ]/g,"").slice(0,3).toLocaleUpperCase("tr-TR");
  const col=COLORS[(h+salt*3)%COLORS.length];
  const t={key,name,short,city,cc,kind,c1:col[0],c2:col[1],str:+(0.88+((h*13)%25)/100).toFixed(2)};
  S.teams[key]=t;return t;
}
const saltOf=st=>({t1:0,t2:1,t3:2,euro:0,nba:0})[st]||0;
function crestSVG(t,sz=40){const id="c"+hash(t.key+sz)%99999;return`<svg width="${sz}" height="${sz}" viewBox="0 0 40 40" aria-hidden="true" style="flex-shrink:0"><defs><clipPath id="${id}"><path d="M20 2 L36 7 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V7 Z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="40" height="40" fill="${t.c1}"/><rect x="26" width="14" height="40" fill="${t.c2}"/></g><path d="M20 2 L36 7 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V7 Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/><text x="18" y="25" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="12" fill="${luma(t.c1)>150?"#111":"#fff"}" stroke="${t.c1}" stroke-width="2.5" paint-order="stroke">${esc(t.short)}</text></svg>`}
function leagueTeams(){
  const st=S.stage,own=S.team;let list=[];
  if(st==="lise"){list=S.stageSeason===1?Array.from({length:7},(_,i)=>makeTeam("lise","İstanbul",i+1)):shuffle(LEAGUES.TR.cities.filter(c=>c!=="İstanbul")).slice(0,7).map(c=>makeTeam("lise",c,0))}
  else if(st==="uni")list=shuffle(LEAGUES.TR.cities.filter(c=>c!==own.city)).slice(0,7).map(c=>makeTeam("uni",c,0));
  else list=shuffle(leaguePool(st,own.cc).filter(t=>t.key!==own.key&&t.name!==own.name)).slice(0,7);
  list.forEach((t,i)=>{if(!t.real&&(t.c1===own.c1||t.c1===own.c2)){const alt=COLORS.filter(x=>x[0]!==own.c1&&x[0]!==own.c2);const c=alt[(hash(t.key)+i)%alt.length];t.c1=c[0];t.c2=c[1]}});
  return list;
}
function newSeasonLeague(){
  const opps=leagueTeams();
  S.league=[S.team,...opps].map(t=>({key:t.key,w:0,l:0,pf:0,pa:0}));
  S.sched=shuffle(opps.map(t=>t.key)).map((k,i)=>({opp:k,home:i%2===0}));
  S.phase="regular";S.results=[];S.week=1;S.slot=3;S.playoffOpp=null;S.ss=blankSS();
}
const teamByKey=k=>S.teams[k];
function standings(){return S.league.slice().sort((a,b)=>b.w-a.w||(b.pf-b.pa)-(a.pf-a.pa))}
function fixture(){return S.phase==="regular"?S.sched[clamp(S.week,1,S.sched.length)-1]:{opp:S.playoffOpp,home:true}}
function phaseName(){const tour=S.stage==="lise"?"Turnuva":S.stage==="euro"?"Final Four":"Playoff";return S.phase==="regular"?"Normal sezon":S.phase==="semi"?`${tour} · Yarı final`:`${tour} · Final`}
const ROLE_N={star:"İlk 5",rot:"Rotasyon",bench:"Yedek"};

/* ================= PANEL SİSTEMİ ================= */
function sheet(title,sub,body,o={}){
  $("#ovl").innerHTML=`<div class="sheet-bg"><div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="sheet-h">${o.icon||""}<div style="min-width:0"><div class="eyebrow" id="shsub">${esc(sub||"")}</div><h2>${esc(title)}</h2></div>${o.noClose?"":`<button class="x" id="shx" aria-label="Kapat">✕</button>`}</div><div class="sheet-b" id="shb">${body}</div></div></div>`;
  if(!o.noClose){const cl=()=>{closeSheet();o.onClose?o.onClose():renderMain()};$("#shx").onclick=cl;$(".sheet-bg").onclick=e=>{if(e.target.classList.contains("sheet-bg"))cl()}}
  return $("#shb");
}
function closeSheet(){$("#ovl").innerHTML=""}
function fxHTML(list){return`<div class="fx">${list.map(([t,c])=>`<span class="${c||""}">${t}</span>`).join("")}</div>`}
function actHTML(a){const dis=(a.slot&&S.slot<=0)||(a.price&&S.money<a.price)||a.disabled;
  return`<div class="act">${a.ic?`<div class="ai">${a.ic}</div>`:"<span></span>"}<div style="min-width:0"><h3>${a.t}</h3><p>${a.d}</p>${fxHTML([...(a.slot?[["1 zaman dilimi","t"]]:[]),...(a.fx||[])])}</div><button class="btn ${a.cls||"team"} sm" data-act="${a.id}" ${dis?"disabled":""}>${a.btn||"Yap"}</button></div>`}
function prodHTML(p){const own=p.own,dis=own||(p.slot&&S.slot<=0)||(p.price&&S.money<p.price)||p.disabled;
  return`<div class="prod${own?" own":""}"><div class="ic">${p.ic}</div><h3>${p.t}</h3><p>${p.d}</p>${p.fx?fxHTML(p.fx):""}<button class="btn ${own?"ghost":p.cls||"team"} sm" data-act="${p.id}" ${dis?"disabled":""}>${own?"Sende":p.btn||(p.price?fmt(p.price):"Seç")}</button></div>`}
function bindActs(map){$$("[data-act]").forEach(b=>b.onclick=()=>map[b.dataset.act]&&map[b.dataset.act]())}
function resultView(title,text,fx){$("#shb").innerHTML=`<div class="say">${text}</div>${fx?fxHTML(fx):""}<button class="btn pri" id="rb">Haritaya dön</button>`;$("#rb").onclick=()=>{closeSheet();renderMain()}}
function useSlot(){S.slot=Math.max(0,S.slot-1)}
function tabsHTML(list,cur,attr="t"){return`<div class="tabs" role="tablist">${list.map(([k,n,ic])=>`<button role="tab" aria-selected="${k===cur}" class="${k===cur?"on":""}" data-${attr}="${k}">${ic?icon(ic):""}${n}</button>`).join("")}</div>`}

/* ================= YENİ KARİYER ================= */
let F={first:"",last:"",num:23,pos:"SG",look:{skin:"#f1c9a5",hair:"#2a1a10",hatStyle:"bere",hat:"#1d428a",pom:"#ffffff"}};
const HATC=["#1d428a","#c8102e","#00875a","#f0b323","#5b2a86","#ff4fa3","#222222","#e8e8e8"];
const HAIRC=["#111111","#2a1a10","#7a4a22","#e2c15a","#c2502a"];
function renderCreate(){
  S=null;setTeamVars();closeSheet();
  app.innerHTML=`
  <div style="padding-top:18px" class="row between nowrap"><div><div class="eyebrow">Basketbol kariyer simülasyonu</div><h1>Pota<br>Kariyeri</h1></div><div class="tagx" style="text-align:right">İstanbul<small>Kariyerin burada başlıyor</small></div></div>
  <div class="row between"><div class="eyebrow">Yuva ${F.slot} · yeni kariyer</div><button class="btn ghost sm" id="bkS">Yuvalara dön</button></div>
  <div class="card">
    <div class="grid2"><label class="small"><b>Ad</b><input type="text" id="fn" maxlength="14" placeholder="Ali" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" value="${esc(F.first)}"></label><label class="small"><b>Soyad</b><input type="text" id="ln" maxlength="16" placeholder="Yılmaz" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" value="${esc(F.last)}"></label></div>
    <div class="grid2"><button class="btn ghost sm" id="npick">Listeden seç</button><button class="btn ghost sm" id="nrnd">Rastgele isim</button></div>
    <div class="row nowrap" style="align-items:flex-start">
      <canvas id="pv" style="width:132px;height:160px;border-radius:12px;flex-shrink:0"></canvas>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div><div class="eyebrow" style="margin-bottom:6px">Ten</div><div class="opts" id="skin">${SKINS.map(c=>`<button class="sw ${F.look.skin===c?"on":""}" style="background:${c}" data-v="${c}" aria-label="Ten rengi"></button>`).join("")}</div></div>
        <div><div class="eyebrow" style="margin-bottom:6px">Kafa</div><div class="opts" id="hs">${[["bere","Bere"],["kep","Kep"],["kulak","Kulaklı"],["band","Saç bandı"],["yok","Saç"]].map(([v,t])=>`<button class="opt ${F.look.hatStyle===v?"on":""}" data-v="${v}">${t}</button>`).join("")}</div></div>
      </div>
    </div>
    <div><div class="eyebrow" style="margin-bottom:6px">${F.look.hatStyle==="yok"?"Saç rengi":"Aksesuar rengi"}</div><div class="opts" id="hc">${(F.look.hatStyle==="yok"?HAIRC:HATC).map(c=>`<button class="sw ${(F.look.hatStyle==="yok"?F.look.hair:F.look.hat)===c?"on":""}" style="background:${c}" data-v="${c}" aria-label="Renk"></button>`).join("")}</div></div>
    ${F.look.hatStyle==="band"?`<div><div class="eyebrow" style="margin-bottom:6px">Saç rengi</div><div class="opts" id="hc2">${HAIRC.map(c=>`<button class="sw ${F.look.hair===c?"on":""}" style="background:${c}" data-v="${c}" aria-label="Saç rengi"></button>`).join("")}</div></div>`:""}
    <div><div class="eyebrow" style="margin-bottom:6px">Pozisyon</div><div class="opts" id="pos">${Object.entries(POS).map(([k,p])=>`<button class="opt ${F.pos===k?"on":""}" data-v="${k}"><span class="cc">${k}</span>${p.n}</button>`).join("")}</div>
      <p class="small muted" style="margin-top:6px">Pozisyon; maçta karşına çıkacak anları ve yapabileceğin antrenmanları belirler. ${{PG:"Pick & roll, alley-oop pası, top çalma.",SG:"Catch & shoot, step-back, penetre.",SF:"Kanat şutu, hızlı hücum smaçı, post-up.",PF:"Pick & pop, post-up, ribaund.",C:"Kanca, alley-oop smaç, pota koruması, ribaund."}[F.pos]}</p></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Forma numarası</div><div class="opts" id="num">${[0,1,3,7,8,10,11,13,23,24,30,33,77].map(n=>`<button class="opt ${F.num===n?"on":""}" data-v="${n}">${n}</button>`).join("")}</div></div>
  </div>
  <button class="btn pri big" id="go">Kariyere başla</button>`;
  const keep=()=>{F.first=$("#fn").value.trim();F.last=$("#ln").value.trim()};
  const bind=(id,fn)=>{const el=$("#"+id);if(el)el.querySelectorAll("button").forEach(b=>b.onclick=()=>{keep();fn(b.dataset.v);renderCreate()})};
  $("#bkS").onclick=renderSlots;
  $("#fn").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("#ln").focus()}};$("#ln").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur()}};
  $("#nrnd").onclick=()=>{F.first=pick(NAME_FIRST);F.last=pick(NAME_LAST);renderCreate()};
  $("#npick").onclick=()=>{keep();namePicker()};
  const cv=$("#pv"),d=Math.max(2,devicePixelRatio||1);cv.width=132*d;cv.height=160*d;const c=cv.getContext("2d");c.scale(d,d);const g=c.createLinearGradient(0,0,0,160);g.addColorStop(0,"#2a3a58");g.addColorStop(1,"#141d2e");c.fillStyle=g;c.fillRect(0,0,132,160);
  drawKid(c,66,156,1.0,F.look,{jersey:"#c8102e",trim:"#ffffff",number:F.num,mood:"mutlu"});
  bind("skin",v=>F.look.skin=v);bind("hs",v=>F.look.hatStyle=v);bind("hc",v=>{if(F.look.hatStyle==="yok")F.look.hair=v;else F.look.hat=v});bind("hc2",v=>F.look.hair=v);bind("pos",v=>F.pos=v);bind("num",v=>F.num=+v);
  $("#go").onclick=()=>{keep();if(!F.first||!F.last){toast("Ad ve soyad gir.");return}startCareer()};
}
// Klavye açmadan isim seçmek için dokunmatik liste
const NAME_FIRST=["Ali","Emre","Can","Burak","Mert","Kerem","Arda","Yusuf","Efe","Kaan","Barış","Onur","Serkan","Tolga","Sinan","Cedi","Ömer","Furkan","Enes","Berk","Ozan","Doruk","Alper","Hakan","Deniz","Umut","Eren","Tarık"];
const NAME_LAST=["Yılmaz","Kaya","Demir","Şahin","Çelik","Aydın","Arslan","Doğan","Kurt","Öztürk","Koç","Aksoy","Erdem","Polat","Güler","Korkmaz","Yıldız","Taş","Bulut","Özkan","Ateş","Kılıç","Turan","Uçar","Karaca","Sarı","Bozkurt","Tekin"];
function namePicker(){
  const chips=(arr,cur,k)=>`<div class="opts">${arr.map(n=>`<button class="opt ${cur===n?"on":""}" data-${k}="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
  const draw=()=>{sheet("İsim seç","Klavye gerekmez",`<div class="card" style="text-align:center"><div class="eyebrow">Seçilen</div><h2 id="npv">${esc((F.first||"—")+" "+(F.last||"—"))}</h2></div>
    <div class="eyebrow">Ad</div>${chips(NAME_FIRST,F.first,"nf")}<div class="eyebrow">Soyad</div>${chips(NAME_LAST,F.last,"nl")}
    <div class="grid2"><button class="btn ghost" id="nr2">Rastgele</button><button class="btn pri" id="nok2">Tamam</button></div>`,{onClose:renderCreate});
    $$("[data-nf]").forEach(b=>b.onclick=()=>{F.first=b.dataset.nf;draw()});$$("[data-nl]").forEach(b=>b.onclick=()=>{F.last=b.dataset.nl;draw()});
    $("#nr2").onclick=()=>{F.first=pick(NAME_FIRST);F.last=pick(NAME_LAST);draw()};$("#nok2").onclick=()=>{closeSheet();renderCreate()}};
  draw();
}
function startCareer(){
  const co=LEAGUES.TR;
  const st={sut:20,pas:20,hiz:20,guc:20,sav:20};for(const[k,v]of Object.entries(POS[F.pos].b))st[k]+=v;
  S={first:F.first,last:F.last,home:"İstanbul",city:"İstanbul",pos:F.pos,num:F.num,look:{...F.look},
    age:16,year:2026,season:1,week:1,slot:3,stage:"lise",stageSeason:1,studying:true,uniYear:0,graduated:false,uni:null,role:"rot",contract:0,
    st,aka:55,energy:85,moral:65,money:30,followers:140,rel:{koc:45,takim:45,taraf:20,aile:70,ark:60,partner:0},partner:null,
    housing:"oda",items:{},buffs:{train:0,motive:0,offer:0},tx:[],wage:WAGE.lise,career:{games:0,pts:0,ast:0,reb:0,blk:0,wins:0,trophies:[],mvps:0,earned:0},hist:[],news:[],rec:{arcade:0,reflex:0},
    npc:{mom:pick(["Ayşe","Fatma","Hülya","Sevgi"]),dad:pick(["Mehmet","Ahmet","Mustafa","Hasan"]),friend:pick(co.first),rival:pick(co.first)+" "+pick(co.last),agent:pick(co.first)+" "+pick(co.last),journalist:pick(co.fem)+" "+pick(co.last),coach:pick(co.first)+" "+pick(co.last)},
    chapters:{},teams:{},studied:false,tryout:null,clubDeal:null};
  S.saveSlot=F.slot||1;
  S.team=makeTeam("mylise","İstanbul",0);
  newSeasonLeague();
  news(`${fullName()}, ${S.team.name} kadrosuna girdi.`);
  save();setTeamVars();chapter("lise1",()=>{renderMain();if(!S.tut)startTour()});
}
function migrate(){if(S.team&&S.team.key==="lise|İstanbul|0"){S.team.name=MY_LISE;S.team.short="MMS";if(S.teams[S.team.key])Object.assign(S.teams[S.team.key],{name:MY_LISE,short:"MMS"})}S.buffs=S.buffs||{train:0,motive:0,offer:0};S.rec=S.rec||{arcade:0,reflex:0};S.news=S.news||[];S.teams=S.teams||{};setTeamVars()}

/* ================= HİKAYE BÖLÜMLERİ ================= */
function chapter(id,after){
  if(!id||S.chapters[id]){after&&after();return}S.chapters[id]=1;save();sfx("fanfare");
  const ln=lgName();
  const T={
   lise1:["Bölüm 1","Moda sahili",`İstanbul, 16 yaşındasın. Her akşam Moda sahilindeki potada hava kararana kadar şut atıyorsun. Beden eğitimi öğretmenin ${S.npc.coach} seni izledi ve ${S.team.name} takımına aldı. Önünde İstanbul Liseler Ligi var. Burada yaptıkların, iki sezon sonra kariyerinin nereden başlayacağını belirleyecek.`],
   lise2:["Bölüm 2","Şampiyona yılı","Lisede ikinci yılın. Rakipler artık ülkenin dört bir yanından. Sezon sonunda gözlemciler raporlarını yazacak ve Avrupa'nın farklı liglerinden teklifler gelebilecek."],
   uni:["Bölüm 3","Kampüs",`${S.team.name} formasıyla bir yıl daha gelişim. Dersleri aksatma; ${ln} maçlarını kulüp gözlemcileri de izliyor.`],
   tryout:["Kulüp seçmeleri","Bir telefon",`${S.tryout?teamByKey(S.tryout.club).name:"Bir kulüp"} seçme yapıyor ve seni de çağırdı. Seçmelere stadyumdan katılabilirsin.`],
   pro:["Bölüm 4","İlk profesyonel imza",`${S.team.name} ile ilk profesyonel sözleşmeni imzaladın. ${S.city}, ${(LEAGUES[S.team.cc]||LEAGUES.TR).n}. Lig: ${ln}. Rolün: ${ROLE_N[S.role]}. Koçun ${S.npc.coach} seni her hafta değerlendirecek.`],
   t2:["Bölüm 5","Bir basamak yukarı",`${ln}. ${S.city}'de daha büyük salonlar, daha sert rakipler. Burada parlarsan 1. lig kapısı açılır.`],
   t1:["Bölüm 6","Birinci lig",`${ln}. Ülkenin en iyileriyle oynuyorsun. Avrupa kupaları ve EuroLeague artık hayal değil.`],
   euro:["Bölüm 7","Avrupa sahnesi",`EuroLeague. ${S.team.name} formasıyla Avrupa'nın devleriyle karşı karşıyasın. ${S.npc.mom} her maçı televizyondan izliyor.`],
   nba:["Bölüm 8","NBA",`${S.team.name}. Moda sahilinden NBA parkesine. Şimdi bu ligde kalıcı olmak gerekiyor.`],
  }[id];
  if(!T){after&&after();return}
  sheet(T[0],seasonLabel(),`<div class="chapter"><div class="hd"><div class="eyebrow" style="color:inherit;opacity:.75">${T[0]} · ${seasonLabel()}</div><h2 style="font-size:2rem">${T[1]}</h2></div><div class="bd"><p>${T[2]}</p><button class="btn pri" id="chok">Başla</button></div></div>`,{noClose:true});
  $("#chok").onclick=()=>{closeSheet();after&&after()};
}

/* ================= ANA EKRAN ================= */
const app=$("#app");
function hudHTML(){
  const rank=standings().findIndex(r=>r.key===S.team.key)+1;
  const rs=rated().slice(-3);const form=rs.length?(rs.reduce((a,r)=>a+r.rating,0)/rs.length).toFixed(1):"–";
  return`<header class="hud">
   <div class="hud-id"><div class="avatar" id="hav"></div><div style="min-width:0"><div class="nm">${esc(fullName())}</div><div class="tm">${S.age} yaş · ${POS[S.pos].n} · ${esc(S.team.name)}</div></div>
   <div class="hud-money"><span class="eyebrow">Bakiye</span><b>${fmt(S.money)}</b></div></div>
   <div class="hud-stats">
    <div class="hs"><div class="k">Enerji</div><div class="v">${S.energy}</div><div class="mt"><i style="width:${S.energy}%;background:${S.energy<30?"var(--bad)":S.energy<55?"var(--warn)":"var(--good)"}"></i></div></div>
    <div class="hs"><div class="k">Moral</div><div class="v">${S.moral}</div><div class="mt"><i style="width:${S.moral}%;background:${S.moral<35?"var(--bad)":S.moral<55?"var(--warn)":"var(--info)"}"></i></div></div>
    <div class="hs"><div class="k">Genel · Form</div><div class="v">${ovr()} <span class="muted" style="font-size:.8rem">· ${form}</span></div></div>
    <div class="hs"><div class="k">Sıra · Takipçi</div><div class="v">${S.phase==="regular"?rank+".":"PO"} <span class="muted" style="font-size:.8rem">· ${kfmt(S.followers)}</span></div></div>
   </div></header>`;
}
function mapState(){return{city:S.city,home:S.home,slot:S.slot,studying:S.studying,stage:S.stage,age:S.age,housing:S.housing,team:S.team,car:bestCar()}}
function renderMain(){
  closeSheet();norm();save();setTeamVars();window.scrollTo(0,0);
  const fx=fixture(),opp=teamByKey(fx.opp),tods=["Gece","Akşam","Öğleden sonra","Sabah"];
  app.innerHTML=`${hudHTML()}
  <div class="mapwrap"><div class="maphead"><div class="tagx">${esc(S.city)}<small>${seasonLabel()} · Hafta ${S.week} · ${tods[S.slot]}</small></div><div class="tagx" style="text-align:right">${esc(lgName())}<small>${levelName(S.stage)} · ${phaseName()}</small></div></div>${mapSVG(mapState())}</div>
  <div class="card"><div class="row between"><div class="eyebrow">Bu hafta · ${S.slot} zaman dilimi kaldı</div>${S.injury?`<span class="pill l">Sakat · ${S.injury.w} hafta</span>`:`<span class="pill g">${isPro(S.stage)?ROLE_N[S.role]:"Okul takımı"}</span>`}</div>
   <div class="timebar">${[2,1,0].map(i=>`<i class="${S.slot>i?"on":""}"></i>`).join("")}</div>
   <div class="next">${crestSVG(S.team,40)}<div style="text-align:center;min-width:0"><div class="eyebrow">${phaseName()} · ${fx.home?"İç saha":"Deplasman"}</div><div style="font-weight:800;font-size:.95rem;line-height:1.2">${esc(S.team.short)} <span class="vs">vs</span> ${esc(opp.name)}</div></div>${crestSVG(opp,40)}</div>
   <button class="btn pri" id="gostad">Stadyuma git · Maça hazırlan</button></div>
  <div class="card"><div class="eyebrow">Gündem</div><div class="news">${S.news.map(n=>`<div><time>${n.w}</time><span>${n.t}</span></div>`).join("")||'<div class="small muted">Henüz haber yok.</div>'}</div></div>
  <div class="row between small muted"><span>${S.career.games} maç · ${S.career.pts} sayı · ${S.career.trophies.length} ödül</span><div class="row" style="gap:6px"><button class="btn ghost sm" id="opt">Ayarlar</button><button class="btn ghost sm" id="rst">Kayıtlar</button></div></div>`;
  $("#hav").appendChild(portrait(S.look,{...jersey(),mood:S.moral>45?"mutlu":"uzgun"},42,42,S.team.c1));
  $$(".loc").forEach(g=>{const go=()=>openLoc(g.dataset.loc);g.onclick=go;g.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
  $("#gostad").onclick=()=>openLoc("stad","mac");
  $("#rst").onclick=renderSlots;$("#opt").onclick=settingsSheet;
}

/* ================= BAŞLAT ================= */
function start(data){if(data&&data.S){S=data.S;migrate();renderMain()}else renderSlots()}
window.addEventListener("load",()=>{
  window.claude?.hot?.snapshot?.(()=>({S}));
  window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
});
