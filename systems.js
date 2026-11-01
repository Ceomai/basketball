"use strict";
/* ================= AYARLAR ================= */
// Ayarlar kariyer yuvalarından bağımsız tutulur.
const SETTINGS=(()=>{try{return Object.assign({sound:true,vol:.7,haptic:true,crowd:true,backupNag:true,music:true,lowfx:false},JSON.parse(localStorage.getItem("pota-settings")||"{}"))}catch(e){return{sound:true,vol:.7,haptic:true,crowd:true}}})();
const saveSettings=()=>{try{localStorage.setItem("pota-settings",JSON.stringify(SETTINGS))}catch(e){}};
function settingsSheet(){
  const tog=(k,label,desc)=>`<div class="act"><div><h3>${label}</h3><p>${desc}</p></div><button class="btn ${SETTINGS[k]?"team":"ghost"} sm" data-tg="${k}">${SETTINGS[k]?"Açık":"Kapalı"}</button></div>`;
  sheet("Ayarlar","Ses, grafik ve kayıt",`${tog("sound","Ses efektleri","Top, file, düdük, tribün ve arayüz sesleri.")}${tog("music","Müzik","Haritada sakin bir tema, eğlence merkezinde 8-bit tema.")}${tog("crowd","Tribün uğultusu","Maç boyunca arka planda seyirci sesi.")}${tog("haptic","Titreşim","Destekleyen telefonlarda kısa titreşimler.")}${tog("lowfx","Düşük grafik modu","Eski ya da yavaş telefonlar için: daha düşük çözünürlük, animasyonsuz arayüz.")}${tog("backupNag","Yedek hatırlatması","Birkaç sezonda bir yedek dosyası almanı hatırlatır.")}
   ${isInstalled()?"":`<div class="act"><div><h3>Ana ekrana ekle</h3><p>Uygulama gibi açılır, internetsiz çalışır, kayıtlar daha güvende olur.</p></div><button class="btn team sm" id="st-inst">Nasıl?</button></div>`}
   <div class="act"><div><h3>Ses düzeyi</h3><p>Efektlerin yüksekliği.</p></div><div class="opts" style="grid-column:1/-1">${[[.35,"Kısık"],[.7,"Orta"],[1,"Yüksek"]].map(([v,n])=>`<button class="opt ${SETTINGS.vol===v?"on":""}" data-vol="${v}">${n}</button>`).join("")}</div></div>
   ${adsSettingsHTML()}
   <div class="grid2"><button class="btn" id="st-exp">Yedek al</button><button class="btn" id="st-help">Kılavuz</button></div>
   <button class="btn ghost" id="st-tour">Tanıtım turunu tekrar göster</button>`);
  $$("[data-tg]").forEach(b=>b.onclick=()=>{SETTINGS[b.dataset.tg]=!SETTINGS[b.dataset.tg];saveSettings();if(!SETTINGS.crowd)crowd(false);applyLowFx();musicFor(MUS.want||"menu");settingsSheet()});
  $$("[data-vol]").forEach(b=>b.onclick=()=>{SETTINGS.vol=+b.dataset.vol;saveSettings();sfx("click");musicVolume();settingsSheet()});
  bindAdsSettings(settingsSheet);$("#st-exp").onclick=exportSheet;const ib=$("#st-inst");if(ib)ib.onclick=installSheet;$("#st-help").onclick=()=>guideSheet();$("#st-tour").onclick=()=>{S.tut=0;closeSheet();renderMain();startTour()};
}

/* ================= İSTATİSTİK GEÇMİŞİ ================= */
const blankSS=()=>({g:0,min:0,pts:0,ast:0,reb:0,blk:0,stl:0,rs:0,dnp:0});
const rated=()=>S.results.filter(r=>r.rating!=null);
const seasonAvg=()=>{const r=rated();return r.length?r.reduce((a,x)=>a+x.rating,0)/r.length:6};
function recordGame(){
  S.ss=S.ss||blankSS();const s=S.ss,mins=Math.round((M.mins||0)/60);
  Object.assign(s,{g:s.g+1,min:s.min+mins,pts:s.pts+M.pts,ast:s.ast+M.ast,reb:s.reb+M.reb,blk:s.blk+M.blk,stl:s.stl+M.stl,rs:s.rs+M.rating});
  const h=S.career.high=S.career.high||{pts:0,ast:0,reb:0};
  for(const k of["pts","ast","reb"])if(M[k]>h[k]){h[k]=M[k];h[k+"Vs"]=`${M.opp.name} · ${seasonLabel()}`}
  S.career.min=(S.career.min||0)+mins;S.career.stl=(S.career.stl||0)+M.stl;
}
const per=(v,g)=>g?(v/g).toFixed(1):"–";
function statsTab(c){
  const s=S.ss||blankSS(),k=S.career,h=k.high||{};
  const rows=[...S.hist.map(x=>({...x,live:false})),{label:seasonLabel(),team:S.team.name,league:lgName(),...(S.ss||blankSS()),live:true}];
  c.innerHTML=`<div class="card"><div class="eyebrow">Bu sezon · maç başına</div><div class="box"><div><b>${per(s.pts,s.g)}</b><span class="eyebrow">Sayı</span></div><div><b>${per(s.ast,s.g)}</b><span class="eyebrow">Asist</span></div><div><b>${per(s.reb,s.g)}</b><span class="eyebrow">Ribaund</span></div><div><b>${per(s.min,s.g)}</b><span class="eyebrow">Dakika</span></div></div><div class="small muted">${s.g} maç${s.dnp?` · ${s.dnp} maç sakat`:""} · not ortalaması ${s.g?(s.rs/s.g).toFixed(2):"–"} · blok ${s.blk} · top çalma ${s.stl}</div></div>
   <div class="card"><div class="eyebrow">Sezon sezon</div><div class="tbl"><table><tr><th>Sezon</th><th>Takım</th><th>M</th><th>DK</th><th>SAY</th><th>AST</th><th>RİB</th><th>Not</th></tr>${rows.map(r=>`<tr class="${r.live?"me":""}"><td>${r.label}</td><td>${esc(r.team)}<div class="small muted">${esc(r.league||"")}</div></td><td>${r.g??"–"}</td><td>${per(r.min,r.g)}</td><td>${per(r.pts,r.g)}</td><td>${per(r.ast,r.g)}</td><td>${per(r.reb,r.g)}</td><td>${r.g?(r.rs/r.g).toFixed(1):r.avg!=null?r.avg.toFixed(1):"–"}</td></tr>`).join("")}</table></div></div>
   <div class="card"><div class="eyebrow">Kariyer toplamı</div><div class="kv"><span>Maç</span><b>${k.games}</b><span>Dakika</span><b>${k.min||0}</b><span>Sayı</span><b>${k.pts} (${per(k.pts,k.games)})</b><span>Asist</span><b>${k.ast} (${per(k.ast,k.games)})</b><span>Ribaund</span><b>${k.reb||0} (${per(k.reb||0,k.games)})</b><span>Blok · top çalma</span><b>${k.blk} · ${k.stl||0}</b><span>Galibiyet</span><b>${k.wins}</b><span>Milli maç</span><b>${k.natCaps||0}</b></div></div>
   <div class="card"><div class="eyebrow">Kariyer rekorları</div><div class="kv"><span>Sayı</span><b>${h.pts||0}</b>${h.ptsVs?`<span class="small muted" style="grid-column:1/-1;margin-top:-4px">${esc(h.ptsVs)}</span>`:""}<span>Asist</span><b>${h.ast||0}</b><span>Ribaund</span><b>${h.reb||0}</b></div></div>`;
  if(S.rival)c.insertAdjacentHTML("beforeend",rivalInfo());
}

/* ================= ÖDÜLLER ================= */
// eşikler denge simülasyonuyla ayarlandı (bkz. balance notları)
const AWARD_T={mvp:8.0,ppg:22,apg:7,rpg:10,dpg:3,roy:7.3,fmvp:7.8,allstar:7.5};
// ligdeki üstünlük: genel reyting ile lig seviyesinin farkı; ödüller bu farka da bakar
function dominance(){return ovr()-(tdOf(S.stage,S.team.cc)+45)}
function award(type,label){S.career.trophies.push({type,label:`${seasonLabel()} · ${label}`});S.followers*=1.04;return label}
function seasonAwards(avg,champ){
  const s=S.ss||blankSS(),g=Math.max(1,s.g),ln=lgName(),out=[];if(s.g<7)return out;
  const wr=S.results.length?S.results.filter(r=>r.win).length/S.results.length:0;
  if(avg>=AWARD_T.mvp&&dominance()>=10&&wr>=.65){out.push(award("mvp",`${ln} MVP`));S.career.mvps++}
  const dm=dominance(),lead=dm>=6;
  if(lead&&s.pts/g>=AWARD_T.ppg)out.push(award("award",`${ln} sayı kralı (${per(s.pts,g)})`));
  if(lead&&s.ast/g>=AWARD_T.apg)out.push(award("award",`${ln} asist kralı (${per(s.ast,g)})`));
  if(lead&&s.reb/g>=AWARD_T.rpg)out.push(award("award",`${ln} ribaund kralı (${per(s.reb,g)})`));
  if(dm>=6&&(s.blk+s.stl)/g>=AWARD_T.dpg)out.push(award("award",`${ln} yılın savunmacısı`));
  if(isPro(S.stage)&&S.stageSeason===1&&!S.career.roy&&avg>=AWARD_T.roy){S.career.roy=1;out.push(award("award",`${ln} yılın çaylağı`))}
  if(champ&&S.role==="star"&&S.results.length&&S.results[S.results.length-1].rating>=AWARD_T.fmvp)out.push(award("mvp",`${ln} final MVP`));
  return out;
}
// All-Star: sezonun ortasında, not ortalaması yüksekse; üçlük yarışması mini oyunu
function allStar(done){
  if(!["t1","euro","nba"].includes(S.stage)||S.allStar===S.season||S.injury||rated().length<3||seasonAvg()<AWARD_T.allstar||dominance()<3){done();return}
  S.allStar=S.season;S.career.allStars=(S.career.allStars||0)+1;award("allstar",`${lgName()} All-Star`);save();sfx("fanfare");
  sheet("All-Star seçildin",lgName(),`<div class="chapter"><div class="hd"><div class="eyebrow" style="color:inherit;opacity:.8">All-Star hafta sonu</div><h2 style="font-size:1.8rem">${esc(fullName())}</h2></div><div class="bd"><p>Taraftar oylamasında ligin en iyileri arasına girdin. Hafta sonu üçlük yarışması var: 7 atış, en az 4 isabet şampiyon yapar.</p><div class="grid2"><button class="btn ghost" id="as-no">Yarışmaya katılma</button><button class="btn pri" id="as-go">Yarışmaya katıl</button></div></div></div>`,{noClose:true});
  $("#as-no").onclick=()=>{closeSheet();renderMain();done()};
  $("#as-go").onclick=async()=>{closeSheet();arenaFor(null);app.innerHTML=`<div style="padding-top:12px"><div class="eyebrow">All-Star · üçlük yarışması</div><h2>7 atış</h2></div><div id="stg"></div><div id="res"></div>`;
    const r=await mgShoot($("#stg"),{eff:clamp(eff("sut")+15,5,100),shots:7,title:"Üçlük yarışması",dist:"three",def:false});const won=r.made>=4;
    if(won){award("award",`${lgName()} All-Star üçlük yarışması şampiyonu`);S.followers*=1.08;sfx("fanfare")}S.moral+=won?10:3;norm();save();
    $("#stg").innerHTML="";$("#res").innerHTML=`<div class="card"><div class="eyebrow">Sonuç</div><h2 class="${won?"good":""}">${r.made}/7 isabet${won?" · şampiyon":""}</h2><p>${won?"Kupayı kaldırdın, salon ayakta.":"Bu sefer olmadı ama All-Star olmak bile büyük başarı."}</p><button class="btn pri" id="bk">Haritaya dön</button></div>`;$("#bk").onclick=()=>{renderMain();done()}};
}

/* ================= SAKATLIKLAR ================= */
const INJ=[["Ayak bileği burkulması",1,2,.5],["Hamstring zorlanması",2,3,.24],["Kasık sakatlığı",2,4,.12],["Parmak kırığı",1,3,.08],["Diz bağı yırtığı",6,9,.06]];
function injuryRisk(){const mul=S.buffs&&S.buffs.injWk>0?(S.buffs.injMul||1):1;return clamp((.009+Math.max(0,50-S.energy)/1100+(S.age>29?(S.age-29)*.0025:0)-(S.items.kryo?.0035:0)-(S.items.fizyo?.0045:0))*mul,.0025,.1)}
function rollInjury(){
  if(S.injury||Math.random()>=injuryRisk())return null;
  let r=Math.random(),pick2=INJ[0];for(const x of INJ){if(r<x[3]){pick2=x;break}r-=x[3]}
  const w=ri(pick2[1],pick2[2]);S.injury={n:pick2[0],w,total:w};
  if(pick2[0].startsWith("Diz")){S.st.hiz-=2;S.st.guc-=1}
  S.moral-=8;news(`${fullName()} sakatlandı: ${pick2[0]}, ${w} hafta yok.`);sfx("whistle");return S.injury;
}
function healTick(){if(!S.injury)return;S.injury.w--;if(S.injury.w<=0){const inj=S.injury;news(`${fullName()} sakatlığını atlattı ve kadroya döndü.`);toast("Sakatlık bitti, maçlara dönebilirsin.");S.injury=null;Bus.emit("injury:healed",inj)}}
// sakatken maç: oyuncu olmadan simüle edilir, tribünden izlenir
function simWithoutMe(){
  const fx=fixture(),opp=teamByKey(fx.opp),k=SC[S.stage];
  let us=Math.round(k*S.team.str*rnd(.86,1.08)*(fx.home?1.03:1)*.96),them=Math.round(k*opp.str*rnd(.86,1.1));if(us===them)us+=Math.random()<.5?2:-2;
  M={opp,home:fx.home,us,them,pts:0,ast:0,reb:0,blk:0,stl:0,stops:0,rating:null,mins:0,plus:0};
  const win=us>them;S.results.push({opp:opp.key,us,them,win,rating:null,pts:0,dnp:true});S.ss=S.ss||blankSS();S.ss.dnp++;
  if(S.phase==="regular")updateLeague(win,opp,us,them);
  news(`${S.team.short} ${us}-${them} ${opp.short}. ${fullName()} sakatlığı nedeniyle tribündeydi.`);S.moral+=win?2:-2;norm();save();
  sheet(win?"Takımın kazandı":"Takımın kaybetti",`${phaseName()} · tribünden izledin`,`<div class="row nowrap" style="gap:8px">${crestSVG(S.team,36)}<span class="big-num">${us}–${them}</span>${crestSVG(opp,36)}</div><div class="say">${win?"Takım arkadaşların galibiyeti sana adadı.":"Kenardan izlemek zor. Bir an önce dönmek istiyorsun."}</div><p class="small muted">Sakatlık: ${esc(S.injury.n)} · ${S.injury.w} hafta kaldı.</p><button class="btn pri" id="nx">Devam</button>`,{noClose:true});
  $("#nx").onclick=()=>afterMatch(win);
}
function updateLeague(win,opp,us,them){
  const mr=S.league.find(x=>x.key===S.team.key),ro=S.league.find(x=>x.key===opp.key);
  mr.pf+=us;mr.pa+=them;ro.pf+=them;ro.pa+=us;if(win){mr.w++;ro.l++}else{mr.l++;ro.w++}
  const others=shuffle(S.league.filter(x=>x!==mr&&x!==ro));for(let i=0;i+1<others.length;i+=2){const a=others[i],b=others[i+1];let sa=Math.round(SC[S.stage]*teamByKey(a.key).str*rnd(.86,1.1)),sb=Math.round(SC[S.stage]*teamByKey(b.key).str*rnd(.86,1.1));if(sa===sb)sa++;a.pf+=sa;a.pa+=sb;b.pf+=sb;b.pa+=sa;if(sa>sb){a.w++;b.l++}else{b.w++;a.l++}}
}
function physioAct(){useSlot();const fast=Math.random()<.5;if(fast&&S.injury.w>1)S.injury.w--;S.energy+=10;norm();save();resultView("Fizyoterapi",fast?"Fizyoterapist iyileşmenin hızlandığını söyledi. Bir hafta erken dönebilirsin.":"Seans iyi geçti, iyileşme planlandığı gibi ilerliyor.",[["+10 Enerji","p"],...(fast?[["İyileşme −1 hafta","p"]]:[])])}

/* ================= TAKIM KADROSU ================= */
const POS_L=["PG","SG","SF","PF","C"];
function roster(){
  S.rosters=S.rosters||{};const t=S.team,key=t.key;if(S.rosters[key])return S.rosters[key];
  const c=cOf(t.city),base=TD()+28*t.str,seen=new Set([S.last]);const list=[];
  for(let i=0;i<11;i++){let n,tries=0;do n=`${pick(c.first)} ${pick(c.last)}`;while(seen.has(n)&&++tries<40);seen.add(n);
    list.push({n,pos:POS_L[i%5],age:S.stage==="lise"?ri(15,18):S.stage==="uni"?ri(18,23):ri(19,34),ovr:clamp(Math.round(base+rnd(-10,8)-i*1.2),20,97),chem:ri(25,55)})}
  list.sort((a,b)=>b.ovr-a.ovr);list.reduce((a,b)=>b.age>a.age?b:a).cap=true;
  S.rosters[key]=list;return list;
}
const mateNames=n=>roster().slice(0,n).map(p=>`${p.n.split(" ")[0][0]}. ${p.n.split(" ").slice(1).join(" ")}`);
const chemAvg=()=>{const r=roster();return r.reduce((a,p)=>a+p.chem,0)/r.length};
function rosterTab(c){
  const r=roster(),best=r.reduce((a,b)=>b.chem>a.chem?b:a);
  c.innerHTML=`<div class="card"><div class="row between"><div><div class="eyebrow">${esc(S.team.name)} kadrosu</div><h3>Takım uyumu ${Math.round(chemAvg())}/100</h3></div><span class="pill ${chemAvg()>=60?"w":""}">${chemAvg()>=60?"Uyumlu":"Gelişiyor"}</span></div><p class="small muted">Takım uyumu yüksekse verdiğin paslar daha sık asiste dönüşür ve takım ilişkin daha hızlı artar. En yakın olduğun oyuncu: <b>${esc(best.n)}</b>.</p>
   <div class="tbl"><table><tr><th>Oyuncu</th><th>Poz.</th><th>Yaş</th><th>Genel</th><th>Uyum</th></tr><tr class="me"><td>${esc(fullName())}</td><td>${S.pos}</td><td>${S.age}</td><td>${ovr()}</td><td>–</td></tr>${r.map(p=>`<tr><td>${esc(p.n)}${p.cap?' <span class="pill g">K</span>':""}</td><td>${p.pos}</td><td>${p.age}</td><td>${p.ovr}</td><td><div class="bar" style="width:60px"><i style="width:${p.chem}%;background:var(--info)"></i></div></td></tr>`).join("")}</table></div></div>`+
   actHTML({id:"yemek",ic:icon("plate"),t:"Takım yemeği",d:"Herkesi yemeğe çıkar. Hesap senden.",slot:1,price:Math.round(10*(1+ORDER.indexOf(S.stage)*2)),fx:[["Tüm kadro uyum +6","p"],["+3 Takım","p"]],btn:"Ismarla"})+
   actHTML({id:"ikili",ic:icon("ball"),t:"Ekstra antrenman",d:`${r[0].n} ile pas ve perde çalışması.`,slot:1,fx:[["Uyum +12","p"],["Pas +1","p"],["−10 Enerji","n"]],btn:"Çalış",disabled:S.energy<10});
  bindActs({yemek:()=>{const p=Math.round(10*(1+ORDER.indexOf(S.stage)*2));if(S.money<p)return;useSlot();tx("Takım yemeği",-p);r.forEach(x=>x.chem=Math.min(100,x.chem+6));S.rel.takim+=3;norm();save();resultView("Takım yemeği",`${r.find(x=>x.cap).n} kadeh kaldırdı: "Bu sezon bizim!" Herkes çok eğlendi.`,[["Uyum +6","p"]])},
    ikili:()=>{useSlot();r[0].chem=Math.min(100,r[0].chem+12);S.st.pas+=1;S.energy-=10;norm();save();resultView("Ekstra antrenman",`${r[0].n} ile perde sonrası ezberlediğiniz bir set var artık.`,[["Uyum +12","p"],["Pas +1","p"]])}});
}

/* ================= SÖZLEŞME PAZARLIĞI ================= */
function negotiateOffer(o,done){
  if(!isPro(o.stage)||o.uni){done(o);return}
  const P=potential(seasonAvgOf(),false),need=o.stage==="t3"?40:BAL.need[o.stage];
  let interest=clamp(.55+(P-need)/18,.25,.95),asks=0,offer={...o};
  const view=msg=>{
    sheet("Sözleşme görüşmesi",offer.team.name,`<div class="row nowrap">${crestSVG(offer.team,48)}<div><div class="eyebrow">${esc(leagueName(offer.stage,offer.team.cc))}</div><h3>${esc(offer.team.name)}</h3><div class="small muted">${esc(offer.team.city)} · menajerin ${esc(S.npc.agent)} masada</div></div></div>
      <div class="card"><div class="kv"><span>Haftalık maaş</span><b class="gold">${fmt(offer.wage)}</b><span>Süre</span><b>${offer.years} yıl</b><span>Rol</span><b>${ROLE_N[offer.role]}</b><span>İmza bonusu</span><b>${fmt(offer.bonus||0)}</b><span>Kulübün ilgisi</span><b>${interest>.75?"Çok yüksek":interest>.55?"Yüksek":interest>.4?"Orta":"Düşük"}</b></div></div>
      ${msg?`<div class="say">${msg}</div>`:""}
      <div class="eyebrow">Talep · ${3-asks} hakkın kaldı</div>
      <div class="grid2"><button class="btn ghost sm" data-ask="wage" ${asks>=3?"disabled":""}>Maaş +%15</button><button class="btn ghost sm" data-ask="years" ${asks>=3||offer.years>=4?"disabled":""}>Süre +1 yıl</button><button class="btn ghost sm" data-ask="role" ${asks>=3||offer.role==="star"?"disabled":""}>Daha büyük rol</button><button class="btn ghost sm" data-ask="bonus" ${asks>=3||offer.bonus?"disabled":""}>İmza bonusu</button></div>
      <div class="grid2"><button class="btn ghost" id="ng-back">Tekliflere dön</button><button class="btn good" id="ng-ok">İmzala</button></div>`,{noClose:true});
    $$("[data-ask]").forEach(b=>b.onclick=()=>{asks++;const k=b.dataset.ask,ok=Math.random()<interest-(k==="role"?.2:0)-asks*.06;
      if(!ok){interest-=.12;if(interest<.25){sfx("lose");sheet("Görüşme bitti",offer.team.name,`<div class="say">${esc(offer.team.name)} masadan kalktı: "Taleplerinizi karşılayamıyoruz."</div><button class="btn pri" id="ng-x">Tekliflere dön</button>`,{noClose:true});$("#ng-x").onclick=()=>done(null,o);return}
        view("Kulüp bu talebi reddetti. Sabırları azalıyor.");return}
      sfx("coin");if(k==="wage")offer.wage=Math.round(offer.wage*1.15);if(k==="years")offer.years++;if(k==="role")offer.role=offer.role==="bench"?"rot":"star";if(k==="bonus")offer.bonus=Math.round(offer.wage*rnd(2,4));
      interest-=.05;view("Kulüp talebini kabul etti.")});
    $("#ng-back").onclick=()=>done(null,o);$("#ng-ok").onclick=()=>{sfx("levelup");if(offer.bonus)tx(`${offer.team.short} imza bonusu`,offer.bonus);done(offer)};
  };
  view(interest>.75?`${S.npc.agent}: "Seni çok istiyorlar, zorlayabiliriz."`:interest<.45?`${S.npc.agent}: "Fazla zorlarsak teklifi geri çekebilirler."`:"");
}
const seasonAvgOf=()=>S.hist.length?S.hist[S.hist.length-1].avg:6;

/* ================= KILAVUZ ================= */
const GUIDE=[
 ["Başlangıç","İstanbul'da 16 yaşında Mavi Martı Spor Lisesi'nde başlıyorsun. Amacın liseden profesyonel kulüplere, oradan EuroLeague ve NBA'e yükselmek. Her hafta 3 zaman dilimin var (sabah, öğleden sonra, akşam); bunları antrenmana, derse, sosyal hayata ya da dinlenmeye harcarsın. Hafta maçla biter."],
 ["Harita","Ana menü bulunduğun şehrin haritası. Binalara dokunarak mekanlara girersin. Altın noktalı etiketler zaman dilimi harcar. Stadyumda maç, antrenman, puan durumu ve kadro; evde vitrin, istatistikler ve finans; menajer ofisinde sözleşme ve sponsorluk var. Takım değiştirip başka şehre taşındığında harita da değişir."],
 ["Maç","Maç dört çeyrek akar. Rotasyona göre oyuna girip çıkarsın; sahadayken kritik anlarda bir seçim yaparsın ve mini oyunu oynarsın. 'Tüm maçı oyna' modunda akışı izlersin, 'Sadece önemli anlar' modunda kenar dakikaları atlanır. Çeyrek aralarında taktik seçebilirsin. Seçeneklerdeki Kolay/Orta/Zor etiketi niteliklerine göre başarı şansını gösterir."],
 ["Mini oyunlar","Şut: ekrana bas, geriye çek; ok ve güç göstergesi yeşilken bırak. Çalım: okların yönünde ekranı kaydır. Pas: boştaki arkadaşına dokun. Blok, top çalma, serbest atış: zamanlama, yeşil anda dokun. Post-up: önce hızlı dokunarak it, sonra kancayı zamanla. Ribaund: top yeşil halkaya girince zıpla."],
 ["Gelişim","Antrenman niteliklerini artırır; nitelik yükseldikçe kazanç azalır. Enerji ve moral maçtaki etkinliğini doğrudan etkiler; yorgun oynamak sakatlık riskini artırır. 24 yaşına kadar her yaz doğal gelişim alırsın, 30'dan sonra fiziksel düşüş başlar."],
 ["Kariyer","Sezon sonunda performansına göre teklifler gelir. Bir teklifi seçince sözleşme görüşmesi açılır: maaş, süre, rol ve imza bonusu isteyebilirsin ama kulübün sabrı sınırlıdır. Menajer ofisinden transfer talebinde bulunursan sezon sonu daha fazla teklif gelir. İyi oynarsan All-Star, ödüller ve milli takım daveti gelir."],
 ["Para ve eşya","Maaş, maç primi ve sponsorluklarla para kazanırsın. Kira ve araç masrafları her hafta düşer. AVM'den aldığın eşyalar kalıcı bonus verir ve evdeki vitrinde sergilenir. Oyun Kulübü'ndeki fişlerin parayla bağlantısı yoktur."],
];
function guideSheet(i=0){
  sheet("Kılavuz","Nasıl oynanır",`${tabsHTML(GUIDE.map((g,k)=>[String(k),g[0]]),String(i),"g")}<div class="card"><h3>${GUIDE[i][0]}</h3><p style="line-height:1.6">${GUIDE[i][1]}</p></div><div class="grid2"><button class="btn ghost" id="gd-p" ${i===0?"disabled":""}>Önceki</button><button class="btn pri" id="gd-n">${i===GUIDE.length-1?"Kapat":"Sonraki"}</button></div>`,{onClose:()=>S?renderMain():renderSlots()});
  $$("[data-g]").forEach(b=>b.onclick=()=>guideSheet(+b.dataset.g));$("#gd-p").onclick=()=>guideSheet(i-1);$("#gd-n").onclick=()=>i===GUIDE.length-1?(closeSheet(),S?renderMain():renderSlots()):guideSheet(i+1);
}
// ilk açılışta adım adım tanıtım: hedef öğe ışıklandırılır
const TOUR=[[".hud","Oyuncu şeridi","Bakiye, enerji, moral, genel puan, form ve lig sıran burada. Enerji ve moral düşükse maçta zorlanırsın."],
 [".mapwrap","Şehir haritası","Ana menü burası. Binalara dokunarak mekanlara gir. Takım değiştirince başka bir şehrin haritasına taşınırsın."],
 [".timebar","Zaman dilimleri","Her hafta 3 zaman dilimin var. Antrenman, ders, aile, arkadaşlar ve medya birer dilim harcar. AVM, market ve ev ücretsiz."],
 ["#gostad","Maç günü","Hazır olduğunda stadyuma git ve maça çık. Maç haftayı bitirir. Stadyumda antrenman, kadro ve puan durumu da var."],
 ["#opt","Ayarlar ve kılavuz","Ses, titreşim, kayıt kodu ve ayrıntılı kılavuz burada. İyi şanslar!"]];
function startTour(step=0){
  $$(".tour").forEach(x=>x.remove());if(step>=TOUR.length){S.tut=1;save();return}
  const[sel,title,text]=TOUR[step],el=$(sel);if(!el){startTour(step+1);return}
  el.scrollIntoView({block:"center"});
  setTimeout(()=>{const r=el.getBoundingClientRect(),pad=6;
    const ring=document.createElement("div");ring.className="tour";ring.style.cssText=`position:fixed;left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;border-radius:14px;box-shadow:0 0 0 2px var(--gold),0 0 0 9999px rgba(3,6,12,.72);z-index:45;pointer-events:none`;
    const card=document.createElement("div");card.className="tour card";const below=r.bottom<innerHeight*.55;
    card.style.cssText=`position:fixed;left:50%;transform:translateX(-50%);${below?`top:${Math.min(innerHeight-200,r.bottom+14)}px`:`bottom:${Math.min(innerHeight-200,innerHeight-r.top+14)}px`};width:min(420px,calc(100% - 32px));z-index:46;border-color:var(--gold)`;
    card.innerHTML=`<div class="eyebrow">Tanıtım · ${step+1}/${TOUR.length}</div><h3>${title}</h3><p class="small">${text}</p><div class="grid2"><button class="btn ghost sm" id="tr-skip">Turu geç</button><button class="btn pri sm" id="tr-next">${step===TOUR.length-1?"Bitir":"İleri"}</button></div>`;
    document.body.append(ring,card);sfx("notify");
    $("#tr-next").onclick=()=>startTour(step+1);$("#tr-skip").onclick=()=>startTour(TOUR.length);
  },250);
}

/* Çift dokunuş koruması: aynı butona 450 ms içinde gelen ikinci tıklama yutulur.
   Aksi halde "Devam" gibi ilerleme butonları iki kez çalışıp sezonu ikiye katlayabiliyordu. */
const tapGuard=new WeakMap();
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".btn,.choice");if(!b)return;const now=performance.now(),t=tapGuard.get(b);
  if(t&&now-t<450){e.stopImmediatePropagation();e.preventDefault();return}tapGuard.set(b,now)},true);

/* ================= UYGULAMA OLARAK KURULUM (PWA) =================
   GitHub Pages gibi https üzerinden açıldığında service worker oyunu önbelleğe alır: internetsiz açılır,
   ana ekrana eklenebilir. Ana ekrana eklenen site, tarayıcının veri temizliğinden de korunur. */
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e});
function registerPWA(){
  if(!("serviceWorker" in navigator)||(location.protocol!=="https:"&&location.hostname!=="localhost")||window.top!==window)return;
  try{navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}
}
function installSheet(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet("Ana ekrana ekle","Uygulama gibi oyna",`${installEvt?`<p>Tek dokunuşla kurabilirsin.</p><button class="btn pri" id="in-go">Şimdi kur</button>`:ios?`<div class="card"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>Safari'de alttaki <b>Paylaş</b> simgesine dokun (yukarı ok olan kare).</li><li>Listeyi kaydırıp <b>Ana Ekrana Ekle</b>'yi seç.</li><li>Sağ üstte <b>Ekle</b>'ye dokun.</li></ol></div>`:`<div class="card"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>Tarayıcının menüsünü aç (sağ üstteki üç nokta).</li><li><b>Ana ekrana ekle</b> ya da <b>Uygulamayı yükle</b>'yi seç.</li></ol></div>`}
   <p class="small muted">Not: Kurulum, oyun bir web adresinden (ör. GitHub Pages) açıldığında çalışır. Önizleme pencerelerinde bu seçenek görünmeyebilir.</p>`);
  const g=$("#in-go");if(g)g.onclick=async()=>{installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")toast("Oyun ana ekrana eklendi.")}catch(e){}installEvt=null;closeSheet()};
}
