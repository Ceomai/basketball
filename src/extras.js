import { late } from "./late.js";
import { $, $$, Bus, EU_CC, LEAGUES, ORDER, STATS, cOf, esc, fmt, hash, isPro, pick, rnd, statName, toast } from "./data.js";
import { icon } from "./art.js";
import { S, bindActs, closeSheet, crestSVG, fullName, news, norm, ovr, prodHTML, renderMain, seasonLabel, setTeamVars, sheet, tabsHTML, tx } from "./core.js";
import { save } from "./save.js";
import { openLoc } from "./places.js";
import { M } from "./match.js";
import { playMatch } from "./engine.js";
/* ================= KUPA İKONLARI ================= */
export function trophyIcon(t){return({champ:["cup"],lise:["cup","#c0c7cf"],mvp:["plaque"],final:["medal"],nat_gold:["medal","#d8b25a"],nat_silver:["medal","#cfd8dc"],nat_bronze:["medal","#c47a3a"],arcade:["joystick"]})[t.type]||["cup","#c0c7cf"]}

/* ================= ARCADE SIRALAMALARI ================= */
// Sunucu olmadığı için rakipler her hafta aynı tohumla üretilir; oyuncunun haftalık ve aylık en iyi skoru listeye yerleşir.
export const ARC_GAMES={arcade:{n:"Pota makinesi",lo:6,hi:17},reflex:{n:"Refleks paneli",lo:12,hi:26},hockey:{n:"Hava hokeyi",lo:2,hi:5},rhythm:{n:"Dans ritmi",lo:20,hi:58},bowling:{n:"Bowling",lo:9,hi:27}};
export function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
export const weekId=()=>S.season*100+S.week,monthId=()=>S.season*100+Math.ceil(S.week/4);
export function arcState(){S.arc=S.arc||{w:weekId(),m:monthId(),wb:{},mb:{},won:0};return S.arc}
export function arcSubmit(g,score){const a=arcState();a.wb[g]=Math.max(a.wb[g]||0,score);a.mb[g]=Math.max(a.mb[g]||0,score);save()}
export function arcBoard(g,period){
  const a=arcState(),id=period==="w"?a.w:a.m,G=ARC_GAMES[g],rnd2=seeded(hash(g+period+id+S.city)),c=cOf(S.city);
  const bump=period==="m"?1.12:1;
  const npcs=Array.from({length:9},(_,i)=>({n:`${c.first[Math.floor(rnd2()*c.first.length)]} ${c.last[Math.floor(rnd2()*c.last.length)][0]}.`,s:Math.round((G.lo+(G.hi-G.lo)*Math.pow(rnd2(),1.4))*bump)}));
  const me=(period==="w"?a.wb:a.mb)[g]||0;
  return[...npcs,{n:fullName(),s:me,me:true}].sort((x,y)=>y.s-x.s||(y.me?1:-1));
}
export function arcRank(g,period){const b=arcBoard(g,period);return b.findIndex(r=>r.me)+1}
export function arcResolve(period){
  const a=arcState(),best=period==="w"?a.wb:a.mb,mult=1+ORDER.indexOf(S.stage),out=[];
  for(const g of Object.keys(best)){if(!best[g])continue;const r=arcRank(g,period);if(r>3)continue;
    const base=period==="w"?[25,15,8][r-1]:[120,60,30][r-1];tx(`${ARC_GAMES[g].n} ${period==="w"?"haftalık":"aylık"} ${r}.lik ödülü`,base*mult);S.moral+=period==="w"?3:6;S.followers*=period==="w"?1.02:1.05;
    if(period==="m"&&r===1)S.career.trophies.push({type:"arcade",label:`${seasonLabel()} · ${ARC_GAMES[g].n} aylık şampiyonu · ${S.city}`});
    out.push(`${ARC_GAMES[g].n}: ${r}. (${fmt(base*mult)})`)}
  if(out.length)news(`Arcade ${period==="w"?"haftalık":"aylık"} sıralama ödülü: ${out.join(", ")}.`);
  if(period==="w"){a.wb={};a.w=weekId()}else{a.mb={};a.m=monthId()}
  return out;
}
export function boardSheet(g="arcade",period="w"){
  const b=arcBoard(g,period),a=arcState();
  sheet("Arcade sıralaması",`${S.city} · ${period==="w"?"bu hafta":"bu ay"}`,`${tabsHTML([["w","Haftalık"],["m","Aylık"]],period,"p")}
   <div class="opts" id="gsel">${Object.entries(ARC_GAMES).map(([k,v])=>`<button class="opt ${k===g?"on":""}" data-g="${k}">${v.n}</button>`).join("")}</div>
   <div class="card"><div class="tbl"><table><tr><th>#</th><th>Oyuncu</th><th style="text-align:right">Skor</th></tr>${b.map((r,i)=>`<tr class="${r.me?"me":""}"><td>${i+1}</td><td>${esc(r.n)}${r.me&&!r.s?' <span class="muted small">(henüz oynamadın)</span>':""}</td><td style="text-align:right">${r.s}</td></tr>`).join("")}</table></div></div>
   <div class="card small"><div class="eyebrow">Ödüller</div><div>${period==="w"?"Hafta sonunda ilk 3: para, moral ve takipçi.":"Ay sonunda ilk 3: büyük para ödülü. Birinciye vitrin için şampiyonluk kupası."}</div><div class="muted">Sıralama her ${period==="w"?"hafta":"4 haftada bir"} sıfırlanır. Ödüller maç sonrası hafta geçişinde verilir.</div></div>
   <button class="btn pri" id="bkE">Eğlence merkezine dön</button>`);
  $$("[data-p]").forEach(x=>x.onclick=()=>boardSheet(g,x.dataset.p));$$("#gsel [data-g]").forEach(x=>x.onclick=()=>boardSheet(x.dataset.g,period));
  $("#bkE").onclick=()=>openLoc("eglence","arcade");
}
export function arcBoardCard(){arcState();
  const rows=Object.entries(ARC_GAMES).map(([k,v])=>{const r=arcRank(k,"w"),s=S.arc.wb[k]||0;return`<div class="row between small"><span>${v.n}</span><span>${s?`<b>${r}.</b> sırada · ${s}`:'<span class="muted">oynanmadı</span>'}</span></div>`}).join("");
  return`<div class="card"><div class="row between"><div><div class="eyebrow">Haftalık sıralama · ${esc(S.city)}</div><h3>Rekabet tablosu</h3></div><button class="btn gold sm" id="brd">Tabloyu aç</button></div>${rows}<div class="small muted">İlk 3'e girenler hafta sonunda para, moral ve takipçi kazanır. Aylık birinciye kupa.</div></div>`}

/* ================= MİLLİ TAKIM ================= */
export const NAT={TR:{c1:"#e30a17",c2:"#ffffff",str:1.0,s:"TÜR"},ES:{c1:"#c60b1e",c2:"#ffc400",str:1.08,s:"İSP"},IT:{c1:"#0064aa",c2:"#ffffff",str:.98,s:"İTA"},FR:{c1:"#0055a4",c2:"#ffffff",str:1.05,s:"FRA"},DE:{c1:"#f4f4f4",c2:"#141414",str:1.02,s:"ALM"},GR:{c1:"#0d5eaf",c2:"#ffffff",str:1.03,s:"YUN"},RS:{c1:"#c6363c",c2:"#0c4076",str:1.08,s:"SRB"},LT:{c1:"#fdb913",c2:"#006a44",str:1.0,s:"LİT"},US:{c1:"#0a3161",c2:"#b31942",str:1.22,s:"ABD"}};
export const CAPITAL={TR:"İstanbul",ES:"Madrid",IT:"Roma",FR:"Paris",DE:"Berlin",GR:"Atina",RS:"Belgrad",LT:"Kaunas",US:"New York"};
export function natCat(age=S.age){return age<=17?"U18":age<=19?"U20":"A"}
export function natTeam(cc,cat){const key=`nat|${cc}|${cat}`;if(S.teams[key])return S.teams[key];const n=NAT[cc];
  const t={key,name:cat==="A"?`${LEAGUES[cc].n} Milli Takımı`:`${LEAGUES[cc].n} ${cat} Milli Takımı`,short:n.s,city:CAPITAL[cc],cc,kind:"nat",c1:n.c1,c2:n.c2,str:n.str*(cat==="A"?1.05:1)};S.teams[key]=t;return t}
export function natPotential(avg){return ovr()+(avg-6)*5+Math.min(4,S.career.trophies.length)}
export function natSelected(avg,cat){const need={U18:38,U20:47,A:69}[cat];if(cat==="A"&&!isPro(S.stage))return false;return natPotential(avg)>=need}
// Milli maçı oynatmak için kulüp takımı geçici olarak milli takımla değiştirilir, maç bitince geri alınır.
export function natMatch(cat,opp,label,after){
  const club=S.team,us=natTeam("TR",cat);S._club=club;S.team=us;setTeamVars();
  const role=natPotential(late.seasonAvg())>={U18:44,U20:53,A:76}[cat]?"star":"rot";
  playMatch({opp,home:Math.random()<.5,comp:"nat",label,role,onEnd:win=>{
    const r=M.rating,line={pts:M.pts,ast:M.ast,reb:M.reb,us:M.us,them:M.them};
    S.team=club;delete S._club;setTeamVars();
    S.career.natCaps=(S.career.natCaps||0)+1;S.career.natPts=(S.career.natPts||0)+line.pts;
    S.followers+=Math.round(S.followers*(r>=7?.08:.03));S.rel.taraf+=r>=7?5:1;S.moral+=win?8:-4;S.energy-=15;norm();save();
    news(`${us.name} ${line.us}-${line.them} ${opp.name}. ${fullName()}: ${line.pts} sayı, not ${r.toFixed(1)}.`);
    sheet(win?"Milli galibiyet":"Milli mağlubiyet",label,`<div class="row between nowrap"><div class="row nowrap" style="gap:8px">${crestSVG(us,36)}<span class="big-num">${line.us}–${line.them}</span>${crestSVG(opp,36)}</div><div style="text-align:right"><div class="eyebrow">Not</div><div class="rating">${r.toFixed(1)}</div></div></div>
      <div class="box"><div><b>${line.pts}</b><span class="eyebrow">Sayı</span></div><div><b>${line.ast}</b><span class="eyebrow">Asist</span></div><div><b>${line.reb}</b><span class="eyebrow">Ribaund</span></div><div><b>${S.career.natCaps}</b><span class="eyebrow">Milli maç</span></div></div>
      <div class="say">${win?pick(["Tribünde ay yıldızlı bayraklar dalgalanıyor. Marşı söyleyen binlerce kişi var.","Soyunma odasında hep bir ağızdan marş söylendi."]):pick(["Başımız dik. Bu formayı taşımak bile gurur.","Hoca toplantıda \"Bir sonrakine bakacağız\" dedi."])}</div>
      <button class="btn pri" id="nok">Devam</button>`,{noClose:true});
    $("#nok").onclick=()=>after(win,r);
  }});
}
export function camp(cat,title,after){
  S.npc.natCoach=S.npc.natCoach||`${pick(LEAGUES.TR.first)} ${pick(LEAGUES.TR.last)}`;
  sheet("Milli takım kampı",title,`<div class="chapter"><div class="hd" style="background:#e30a17;color:#fff"><div class="eyebrow" style="color:inherit;opacity:.8">${cat==="A"?"A Milli Takım":cat+" Milli Takımı"}</div><h2 style="font-size:1.8rem">Davet geldi</h2></div><div class="bd">
   <p>Federasyondan telefon: Milli Takım Başantrenörü ${esc(S.npc.natCoach)} seni ${cat==="A"?"A Milli Takım":cat+" Milli Takımı"} kadrosuna çağırdı. ${S.npc.mom} haberi duyunca bütün akrabaları tek tek aradı. ${S.npc.dad} formanı çerçeveletmek için şimdiden yer seçti.</p>
   <div class="eyebrow">Kampta ne yapacaksın?</div><div class="pgrid">${[
    {id:"c1",ic:icon("whistle"),t:"Taktik çalışması",d:"Hocanın sistemini öğren.",fx:[["Rastgele nitelik +2","p"]],btn:"Seç"},
    {id:"c2",ic:icon("chat"),t:"Takım ruhu gecesi",d:"Oda arkadaşınla sabaha kadar sohbet.",fx:[["+10 Moral","p"]],btn:"Seç"},
    {id:"c3",ic:icon("ball"),t:"Ekstra şut seansı",d:"Herkes yattıktan sonra salonda.",fx:[["Şut +2","p"],["−8 Enerji","n"]],btn:"Seç"}].map(prodHTML).join("")}</div></div></div>`,{noClose:true});
  const go=()=>{norm();save();closeSheet();after()};
  bindActs({c1:()=>{const k=pick(STATS)[0];S.st[k]+=2;toast(`${statName(k)} +2`);go()},c2:()=>{S.moral+=10;go()},c3:()=>{S.st.sut+=2;S.energy-=8;go()}});
}
// FIBA arası: sezonun 4. haftasından sonra, yalnızca A Milli Takım
export function fibaWindow(done){
  const cat=natCat();if(S.injury||cat!=="A"||S.natWin===S.season||!natSelected(late.seasonAvg(),cat)){done();return}
  S.natWin=S.season;const opp=natTeam(pick(EU_CC.filter(c=>c!=="TR")),"A");
  camp(cat,"FIBA Dünya Kupası elemeleri · ara dönem",()=>natMatch(cat,opp,"FIBA Dünya Kupası Elemeleri",()=>{renderMain();done()}));
}
// Yaz turnuvası: sezon sonunda, gençlerde U18/U20 Avrupa Şampiyonası, büyüklerde EuroBasket / Dünya Kupası
export function summerTournament(avg,done){
  if(window.__TEST&&window.__TEST.noSummer){done();return}
  const cat=natCat(S.age-1);if(S.injury||!natSelected(avg,cat)){done();return}
  const name=cat==="U18"?"U18 Avrupa Şampiyonası":cat==="U20"?"U20 Avrupa Şampiyonası":(S.year%4===3?"FIBA Dünya Kupası":S.year%4===1?"EuroBasket":"Olimpiyat Elemeleri");
  // son turlarda güçlü rakipler
  const pool=[...EU_CC.filter(c=>c!=="TR"),...(cat==="A"&&name==="FIBA Dünya Kupası"?["US"]:[])].sort((a,b)=>NAT[a].str-NAT[b].str+rnd(-.04,.04));pool.splice(0,pool.length-4);
  const stages=["Grup maçı","Yarı final","Final"];let i=0;
  const medal=(type,lab)=>{S.career.trophies.push({type,label:`${S.year} ${name} · ${lab}`});news(`${fullName()} ${name}'nda ${lab} madalyası kazandı!`);save()};
  const nextGame=()=>{const opp=natTeam(pool[i],cat);natMatch(cat,opp,`${name} · ${stages[i]}`,win=>{
      if(i===0&&!win){news(`Türkiye ${name}'nda gruptan çıkamadı.`);done();return}
      if(i===1&&!win){const bo=natTeam(pool[3],cat);natMatch(cat,bo,`${name} · Bronz madalya maçı`,w2=>{if(w2)medal("nat_bronze","bronz");done()});return}
      if(i===2){medal(win?"nat_gold":"nat_silver",win?"altın":"gümüş");done();return}
      i++;nextGame()})};
  camp(cat,name,nextGame);
}

/* ================= HAFTA GEÇİŞ KANCALARI ================= */
// endWeek sonunda çağrılır: arcade ödülleri ve sezon ortası FIBA arası
export function weeklyHooks(){
  const got=[...arcResolve("w")];if((S.week-1)%4===0)got.push(...arcResolve("m"));
  if(got.length){save();toast(`Arcade ödülü: ${got[0]}${got.length>1?" ve fazlası":""}`)}
  if(S.chips!=null&&S.chips<500)S.chips=500;
  Bus.emit("week:start");
  Bus.first("week:sheet");// haftada en fazla bir panel; sağlayıcılar öncelik sırasıyla sorulur
}
// 8. hafta: All-Star (üst liglerde) ve ardından milli takım penceresi
Bus.offer("week:sheet",()=>{if(S.week!==8||S.phase!=="regular")return false;late.allStar(()=>fibaWindow(()=>{}));return true},10);

/* ================= YEREL HİKAYE VE MİZAH ================= */
export function EVENTS_TR(){const n=S.npc,abroad=S.city!==S.home,home=!abroad;return[
 ...(home?[
  {w:"neighbor",who:"Mahalle",title:"Sokakta düğün",text:"Alt sokakta düğün var. Davul zurna gece ikiye kadar sürecek gibi. Yarın sabah antrenman var.",choices:[
   {t:"Halaya katıl",do:()=>{S.moral+=10;S.energy-=12;S.followers*=1.03;return"Halayın başını sen çektin, mendili havada salladın. Videon mahalle gruplarında dolaşıyor."}},
   {t:"Kulak tıkacıyla uyu",do:()=>{S.energy+=4;return"Zurna kulak tıkacını deldi geçti ama yine de birkaç saat uyuyabildin."}}]},
  {w:"mom",who:n.mom,title:"Yeleğini giy",text:`"Dışarısı buz gibi! Yeleğini giymeden maça çıkma. Hasta olursan kim oynayacak?"`,choices:[
   {t:"Tamam anne, giyiyorum",do:()=>{S.rel.aile+=5;return"Yeleği giydin. Soyunma odasında çıkardın ama annen bunu bilmek zorunda değil."}},
   {t:"Anne salon kapalı, sıcak",do:()=>{S.rel.aile-=3;S.moral+=1;return`${n.mom} "Ben de bilmem mi" dedi ve çantana bir yelek daha koydu.`}}]},
  {w:"dad",who:"Dayın",title:"Dayının taktikleri",text:`Aile yemeğinde dayın masaya peçeteyle taktik çizdi: "Bak oğlum, sen topu al, hepsini geç, at. Bu kadar basit. Ben senin yaşındayken mahallede beni kimse tutamıyordu."`,choices:[
   {t:"Haklısın dayı",do:()=>{S.rel.aile+=4;S.moral+=3;return"Dayın gururlandı ve bir kez daha gençlik hikâyesini anlattı. Üçüncü kez."}},
   {t:"Dayı, basketbol öyle oynanmıyor",do:()=>{S.rel.aile-=2;return"Masada sessizlik oldu. Teyzen konuyu hemen dolmaya bağladı."}}]},
  {w:"friend",who:n.friend,title:"Halı saha daveti",text:`"Akşam halı saha var, bir kişi eksik. Gel, kaleye geçersin. Boyun uzun, kimse gol atamaz."`,choices:[
   {t:"Gel bakalım",do:()=>{S.rel.ark+=6;S.moral+=6;S.energy-=10;if(Math.random()<.2){S.energy-=10;return"Kalede harikaydın ama bir şut bileğine geldi. Enerji −20."}return"Kalede duvar gibiydin. Karşı takım seni basketbolcu diye şikâyet etti."}},
   {t:"Bileğimi riske atamam",do:()=>{S.rel.ark-=3;return`${n.friend} "Profesyonel oldun ya, tabii" diye takıldı.`}}]},
  {w:"neighbor",who:"Simitçi amca",title:"Sabah simidi",text:"Okul yolundaki simitçi seni tanıdı: \"Dün maçta gördüm seni evladım! Bu simit benden, şampiyon ol da bana da forma getir.\"",choices:[
   {t:"Söz amca, forma getireceğim",do:()=>{S.moral+=5;S.rel.taraf+=2;return"Simit hâlâ sıcaktı. Amca mahalleye seni anlatacak."}},
   {t:"Teşekkür edip ücretini ver",do:()=>{tx("Simit",-.1);S.rel.taraf+=1;return"Amca parayı almak istemedi, cebine geri sıkıştırdı."}}]},
  {w:"mom",who:"Teyzen",title:"Bayram ziyareti",text:"Bayramda teyzene el öpmeye gittin. Elini öptün, harçlık zarfı geldi. Sonra soru da geldi: \"Kız arkadaş var mı? Ne zaman evleniyorsun?\"",choices:[
   {t:"Daha çok gencim teyze",do:()=>{tx("Bayram harçlığı",8);S.moral+=3;return"Teyzen \"Senin yaşında amcan evlenmişti\" dedi. Harçlık zarfı kalın çıktı."}},
   {t:"Kariyerime odaklıyım",do:()=>{tx("Bayram harçlığı",8);S.rel.aile+=3;return"Teyzen herkese \"Bizim çocuk çok ciddi\" diye anlattı."}}]},
 ]:[
  {w:"friend",who:"Gurbetçi taraftarlar",title:"Tribünde ay yıldız",text:`${S.city}'deki maçında tribünde Türk bayraklarıyla bir grup vardı. Maç sonu seni bekliyorlar.`,choices:[
   {t:"Yanlarına git, fotoğraf çektir",do:()=>{S.rel.taraf+=5;S.moral+=8;S.followers*=1.05;return"\"Bizim çocuk!\" diye bağırdılar. Biri sana ev yapımı baklava verdi."}},
   {t:"Uzaktan el salla",do:()=>{S.rel.taraf+=1;return"Alkışladılar ama biraz buruk kaldılar."}}]},
  {w:"mom",who:n.mom,title:"Kargo kolisi",text:`"Sana kuru fasulye, çay, pul biber ve kuru dut yolladım. ${S.city}'de doğru dürüst yemek yoktur oralarda."`,choices:[
   {t:"Takım arkadaşlarına Türk yemeği pişir",do:()=>{S.rel.takim+=7;S.moral+=5;return"Pul biberi az koymanı söylemişlerdi, dinlemedin. Yine de herkes tabağını bitirdi."}},
   {t:"Hepsini kendine sakla",do:()=>{S.moral+=6;S.energy+=5;return"Akşam çayı ve kuru dut. Biraz memleket gibi oldu."}}]},
  {w:"friend",who:"Türk lokantası",title:"Memleket sofrası",text:`${S.city}'de bir Türk lokantası buldun. Sahibi seni tanıdı ve "Hesap bizden, yeter ki maçta sayı at" dedi.`,choices:[
   {t:"Kebap ve ayran",do:()=>{S.moral+=8;S.energy+=4;return"Ayran köpüklüydü. Duvara imzalı forman asılacak."}},
   {t:"Diyetteyim, sadece çorba",do:()=>{S.energy+=6;S.rel.koc+=1;return"Mercimek çorbası, limon, pul biber. Sporcu gibi."}}]},
 ]),
 {w:"press",who:"Kahvehane yorumcuları",title:"Çay ocağı analizi",text:`Mahalle kahvesinde maçın yayını açık. Masadaki amcalar seni yorumluyor: "Bu çocuk sola hiç dönmüyor. Ben söylüyorum, sağdan geçeceksin."`,choices:[
   {t:"Gidip çaylarını ısmarla",do:()=>{tx("Çaylar",1);S.rel.taraf+=4;S.moral+=4;return"Amcalar seni bağrına bastı. Okey masasına bile davet edildin."}},
   {t:"Haklılar, sola dönmeyi çalış",do:()=>{S.st.hiz+=1;return"Ertesi gün sol el çalımı çalıştın. Çeviklik +1. Amcalar haklıydı."}}]},
 {w:"neighbor",who:"Taksi şoförü",title:"Taksici tanıdı",text:"Bindiğin taksinin şoförü dikiz aynasından baktı: \"Abi sen o basketbolcu değil misin? Abi bizim takımı neden almıyorsun, bizim de pivota ihtiyacımız var!\"",choices:[
   {t:"Sohbet et, imza ver",do:()=>{S.rel.taraf+=3;S.moral+=3;return"Taksimetreyi açmadı. Yol boyunca bütün oyuncu değişikliklerini sana anlattı."}},
   {t:"Kulaklığı tak",do:()=>{S.energy+=3;return"Şoför radyonun sesini açtı. Arabesk eşliğinde vardın."}}]},
]}

