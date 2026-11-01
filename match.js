"use strict";
/* ================= MAÇ ================= */
let M=null;
function bugHTML(){const us=S.team,op=M.opp;const L=M.home?[us,M.us,op,M.them]:[op,M.them,us,M.us];
  return`<div class="bug"><div class="side"><span class="stripe" style="background:${L[0].c1}"></span><div style="min-width:0"><div class="ab">${esc(L[0].short)}</div><div class="full">${esc(L[0].name)}</div></div><div class="sc">${L[1]}</div></div>
   <div class="mid"><div class="q">${M.q}Ç</div><div class="clk">${M.clock}</div></div>
   <div class="side r"><span class="stripe" style="background:${L[2].c1}"></span><div style="min-width:0"><div class="ab">${esc(L[2].short)}</div><div class="full">${esc(L[2].name)}</div></div><div class="sc">${L[3]}</div></div></div>`}
function updBug(){const b=$("#bug");if(b)b.innerHTML=bugHTML()}
const odds=e=>e>=55?["e","Kolay"]:e>=32?["m","Orta"]:["h","Zor"];
function oppName(){const c=cOf(M.opp.city);return`${pick(c.first)[0]}. ${pick(c.last)}`}
function addFeed(t){M.feed.unshift({t:`${M.q}Ç ${M.clock}`,x:t});const f=$("#feed");if(f)f.innerHTML=M.feed.map(x=>`<div><time>${x.t}</time><span>${x.x}</span></div>`).join("")}
const PEN={pull:6,catch:4,wing:5,step:2,pop:2,lob:-4,pnr:0,kick:-6};
async function resolvePlay(k,el,sur,dn){
  const three=["pull","catch","wing"],mid=["step","pop","mid"];
  if(three.includes(k)||mid.includes(k)){const th=three.includes(k);const r=await mgShoot(el,{eff:eff("sut")-(PEN[k]||0),shots:1,title:th?"Üçlük":"Orta mesafe",dist:th?"three":"mid"});M.pts+=r.pts;return{good:r.made>0,w:th?1.3:1,st:"sut",txt:r.made?`${sur} ${th?"üçlüğü soktu!":"orta mesafeden 2 sayı."}`:`${sur} şutu kaçırdı.`}}
  if(k==="drive"||k==="break"){const r=await mgDribble(el,{eff:eff("hiz"),reps:1,title:k==="break"?"Hızlı hücum":"Potaya giriş"});if(!r.ok)return{good:false,w:1,st:"hiz",txt:`${sur} top kaybı yaptı.`};
    if(k==="break"){M.pts+=2;return{good:true,w:1.2,st:"hiz",txt:`${sur} hızlı hücumu smaçla bitirdi!`}}
    if(Math.random()<.18){M.pts+=2;addFeed(`${sur} ${dn}'i geçti, faule rağmen bitirdi!`);const f=await mgTiming(el,{eff:eff("sut")+10,title:"And-one",tries:1,label:"At"});M.pts+=f.ok;return{good:true,w:1.2,st:"hiz",txt:f.ok?"And-one tamamlandı!":"Ek atış kaçtı."}}
    if(Math.random()<.88){M.pts+=2;return{good:true,w:1,st:"hiz",txt:`${sur} ${dn}'i geçip turnikeyle bitirdi.`}}return{good:true,w:.6,st:"hiz",txt:`${sur} adamını geçti ama turnike döndü.`}}
  if(k==="pnr"||k==="kick"||k==="lob"){const r=await mgPass(el,{eff:eff("pas")-(PEN[k]||0),reps:1,title:k==="lob"?"Alley-oop pası":k==="pnr"?"Pick & roll":"Pas"});if(!r.ok)return{good:false,w:1,st:"pas",txt:`${sur}'in pası araya girdi.`};
    const conv=(k==="lob"?.75:.58)+S.rel.takim*.003+(chemAvg()-40)*.002;if(Math.random()<conv){M.ast++;return{good:true,w:k==="lob"?1.3:1,st:"pas",txt:k==="lob"?`${sur}'den havada pas, uzun adam smaçla bitirdi!`:`${sur} boş adamı buldu. Asist!`}}return{good:true,w:.6,st:"pas",txt:`${sur} güzel pas verdi ama şut kaçtı.`}}
  if(k==="post"){const r=await mgPost(el,{eff:eff("guc"),reps:1,title:"Post-up"});if(r.ok)M.pts+=2;return{good:r.ok>0,w:1.2,st:"guc",txt:r.ok?`${sur} ${dn}'i sırtıyla itti, kancayla bitirdi.`:`${sur}'in kancası çemberden döndü.`}}
  if(k==="dunk"){const r=await mgTiming(el,{eff:eff("guc")+5,title:"Alley-oop smaç",tries:1,label:"Zıpla",kind:"dunk"});if(r.ok)M.pts+=2;return{good:r.ok>0,w:1.3,st:"guc",txt:r.ok?`${sur} alley-oop'u potaya gömdü!`:`${sur} smaçta çembere çarptı.`}}
  if(k==="putback"||k==="reb"){const r=await mgRebound(el,{eff:eff("guc"),reps:1,title:k==="reb"?"Savunma ribaundu":"Hücum ribaundu"});if(r.ok){M.reb++;if(k==="reb"){M.stops++;return{good:true,w:1,st:"guc",txt:`${sur} ribaundu aldı, rakip hücum bitti.`}}if(Math.random()<.8){M.pts+=2;return{good:true,w:1.2,st:"guc",txt:`${sur} hücum ribaundunu tamamladı!`}}return{good:true,w:.6,st:"guc",txt:`${sur} ribaundu aldı ama tamamlayamadı.`}}return{good:false,w:1,st:"guc",txt:`${dn} ribaundu kaptı.`}}
  if(k==="block"){const r=await mgBlock(el,{eff:(eff("sav")+eff("guc"))/2,reps:1,title:"Blok"});if(r.ok){M.blk++;M.stops++}return{good:r.ok>0,w:1.2,st:"sav",txt:r.ok?`${sur}'den ${dn}'e müthiş blok!`:`${dn} sayıyı buldu.`}}
  if(k==="steal"){const r=await mgTiming(el,{eff:eff("hiz")-6,title:"Top çalma",tries:1,label:"Uzan",kind:"steal"});if(r.ok)M.stl++;return{good:r.ok>0,w:1.2,st:"hiz",txt:r.ok?`${sur} topu çaldı, hızlı hücumda 2 sayı!`:`${sur} faul yaptı, ${dn} çizgide.`}}
  if(k==="charge"){const ok=Math.random()<clamp(eff("sav")/100*.6+.15,.1,.75);if(ok)M.stops++;return{good:ok,w:1.1,st:"sav",txt:ok?`${sur} yerinde durdu, hücum faulü aldı!`:`Hakem blok faulü verdi.`}}
  if(k==="safe"){const ok=Math.random()<clamp(eff(S.pos==="PF"?"guc":"sav")/100*.7+.25,.2,.9);if(ok)M.stops++;return{good:ok,w:.5,st:"sav",txt:ok?`${sur} pozisyonunu korudu, ${dn} zor şut attı ve kaçırdı.`:`${dn} sayıyı buldu.`}}
  const r=await mgTiming(el,{eff:eff("sut")+12,title:"Serbest atış",tries:2,label:"At"});M.pts+=r.ok;return{good:r.ok>0,w:.6,st:"sut",txt:`${sur} serbest atışlarda ${r.ok}/2.`};
}
function finishMatch(win){
  recordGame();sfx(win?"win":"lose");
  const r=M.rating,opp=M.opp;S.buffs.motive=0;
  const bonus=Math.round((S.stage==="lise"?2:S.stage==="uni"?6:S.wage*.12)*(r/6)*(win?1.5:1));
  tx(`Maç primi · ${opp.short}`,bonus);
  S.rel.koc+=Math.round((r-6)*3);S.rel.taraf+=Math.round((r-5.5)*2+(win?2:0));S.rel.takim+=win?3:-1;S.moral+=win?6:-6;S.energy-=22;
  S.followers+=Math.round(S.followers*(r>=8?.06:r>=7?.03:.005)*(win?1.3:1));
  S.results.push({opp:opp.key,us:M.us,them:M.them,win,rating:r,pts:M.pts});
  const k=S.career;Object.assign(k,{games:k.games+1,pts:k.pts+M.pts,ast:k.ast+M.ast,reb:(k.reb||0)+M.reb,blk:k.blk+M.blk,wins:k.wins+(win?1:0)});
  if(S.phase==="regular")updateLeague(win,opp,M.us,M.them);
  news(`${S.team.short} ${M.us}-${M.them} ${opp.short}. ${fullName()}: ${M.pts} sayı, ${M.ast} asist, ${M.reb} ribaund, not ${r.toFixed(1)}.`);
  const inj=rollInjury();
  norm();save();
  const coach=r>=8?`"Bu akşam sahadaki en iyi oyuncu sendin."`:r>=6.5?`"İyi iş. Ama savunmada daha konsantre olmalısın."`:r>=5?`"Vasattı. Antrenmanda konuşacağız."`:`"Bu performansla süren azalır. Kendine gel."`;
  sheet(win?"Galibiyet":"Mağlubiyet",`${phaseName()} · ${opp.name}`,`
   <div class="row between nowrap"><div class="row nowrap" style="gap:8px">${crestSVG(S.team,36)}<span class="big-num">${M.us}–${M.them}</span>${crestSVG(opp,36)}</div><div style="text-align:right"><div class="eyebrow">Maç notu</div><div class="rating" style="color:${r>=7?"var(--good)":r>=5?"var(--text)":"var(--bad)"}">${r.toFixed(1)}</div></div></div>
   <div class="box"><div><b>${M.pts}</b><span class="eyebrow">Sayı</span></div><div><b>${M.ast}</b><span class="eyebrow">Asist</span></div><div><b>${M.reb}</b><span class="eyebrow">Ribaund</span></div><div><b>${M.blk+M.stl}</b><span class="eyebrow">Blok+Top çalma</span></div></div>
   <div class="who"><div id="cp"></div><div><div class="eyebrow">${esc(S.npc.coach)} · Koç</div><div class="say">${coach}</div></div></div>
   <div class="kv"><span>Süre</span><b>${Math.round((M.mins||0)/60)} dk · artı/eksi ${(M.plus||0)>=0?"+":""}${M.plus||0}</b><span>Maç primi</span><b class="good">+${fmt(bonus)}</b><span>Koçla ilişki</span><b>${S.rel.koc}</b><span>Takipçi</span><b>${kfmt(S.followers)}</b></div>
   ${inj?`<div class="say" style="border-left-color:var(--bad)"><b>Sakatlık:</b> ${esc(inj.n)} · ${inj.w} hafta yoksun.</div>`:""}
   <button class="btn pri" id="nx">Devam</button>`,{noClose:true});
  const cl=LK.coach();cl[1].mood=r>=6.5?"mutlu":"kizgin";$("#cp").appendChild(portrait(cl[0],cl[1]));
  $("#nx").onclick=()=>afterMatch(win);
}
function afterMatch(win){
  let next=()=>endWeek();
  if(S.phase==="regular"&&S.week>=S.sched.length){
    const st=standings(),rank=st.findIndex(r=>r.key===S.team.key)+1;
    if(rank<=4){const oi=[3,2,1,0][rank-1];S.phase="semi";S.playoffOpp=st[oi].key;S._otherSemi=[0,1,2,3].filter(i=>i!==rank-1&&i!==oi).map(i=>st[i].key);news(`${S.team.short} normal sezonu ${rank}. sırada bitirdi ve yarı finalde!`)}
    else{news(`${S.team.short} sezonu ${rank}. sırada bitirdi.`);next=()=>seasonEnd(false,false)}
  }else if(S.phase==="semi"){
    if(win){S.phase="final";const o=S._otherSemi,a=teamByKey(o[0]),b=teamByKey(o[1]);S.playoffOpp=Math.random()<a.str/(a.str+b.str)?a.key:b.key;news(`${S.team.short} finalde! Rakip ${teamByKey(S.playoffOpp).name}.`)}
    else{news(`${S.team.short} yarı finalde elendi.`);next=()=>seasonEnd(true,false)}
  }else if(S.phase==="final"){news(win?`${S.team.name} şampiyon!`:`${S.team.name} finali kaybetti.`);next=()=>seasonEnd(true,win,true)}
  if(S.phase==="regular"&&S.week===5&&S.stage==="uni"&&!S.clubDeal&&!S.tryout){
    const avg=seasonAvg();
    if(ovr()>=32||avg>=6){const stg=ovr()>=40?"t2":"t3",cc=pick(EU_CC),club=pick(leaguePool(stg,cc));S.tryout={club:club.key,stage:stg,until:S.sched.length,done:false};news(`${club.name} (${leagueName(stg,cc)}) seni seçmelere davet etti.`);save();const go=next;return chapter("tryout",()=>maybeEvent(go))}
  }
  maybeEvent(next);
}
function maybeEvent(next){if(Math.random()<.6)randomEvent(next);else next()}
function endWeek(){
  S.week++;S.slot=3;
  tx(S.stage==="lise"?"Harçlık":S.stage==="uni"?"Burs":"Maaş",S.wage);
  const tax=BAL.tax[S.stage]||0,ag=isPro(S.stage)?BAL.agent:0,liv=BAL.living[S.stage]||0;
  if(tax+ag>0)tx(`Vergi ve menajer payı (%${Math.round((tax+ag)*100)})`,-S.wage*(tax+ag));if(liv)tx("Yaşam giderleri",-liv);
  const inc=itemWeekly("inc");if(inc)tx("Yatırım geliri",inc);
  const h=HOUSING[S.housing];if(h.rent)tx(`Kira · ${h.n}`,-h.rent);
  const up=carUpkeep();if(up)tx("Araç masrafları",-up);
  S.energy+=26+h.en+itemWeekly("en")+Math.round((S.moral-50)/10);S.moral+=(h.mo||0)+itemWeekly("mo");
  if(S.partner){S.rel.partner-=4;if(S.rel.partner<=10){news(`${fullName()} ile ${S.partner} yollarını ayırdı.`);toast(`${S.partner} ilişkiyi bitirdi.`);S.partner=null;S.rel.partner=0;S.moral-=15}}
  S.rel.aile-=2;S.rel.ark-=2;S.moral+=(S.rel.aile-50)/25+(S.rel.ark-50)/30;
  if(S.studying&&!S.studied)S.aka-=3;S.studied=false;healTick();
  if(S.money<0){S.moral-=6;toast("Hesabın ekside. Harcamalarına dikkat et.")}
  if(S.tryout&&!S.tryout.done&&S.week>S.tryout.until){S.tryout.done=true;news("Seçme tarihi kaçtı.")}
  norm();save();renderMain();weeklyHooks();
}

/* ================= OLAYLAR ================= */
const LK={
  friend:()=>[{skin:SKINS[hash(S.npc.friend)%4],hatStyle:"bere",hat:"#2d8a3e",pom:"#f4c534"},{jersey:"#e2741f",sleeves:true,gloves:"#2d8a3e",mood:"mutlu"}],
  coach:()=>[{skin:SKINS[hash(S.npc.coach)%4],hatStyle:"kep",hat:S.team.c1,hair:"#3a2a1d"},{adult:true,mustache:hash(S.npc.coach)%2===0,whistle:true,jersey:"#3a4256",sleeves:true,mood:"kizgin"}],
  mom:()=>[{skin:S.look.skin,hatStyle:"uzun",hair:"#5a3418"},{adult:true,jersey:"#3fa28a",sleeves:true,mood:"mutlu"}],
  dad:()=>[{skin:S.look.skin,hatStyle:"yok",hair:"#2a1a10"},{adult:true,jersey:"#5a6b8a",sleeves:true,mustache:true}],
  rival:()=>[{skin:SKINS[0],hatStyle:"yok",hair:"#e2c15a"},{jersey:"#5b2a86",sleeves:true,mood:"kizgin",tie:true}],
  press:()=>[{skin:SKINS[2],hatStyle:"uzun",hair:"#111111"},{adult:true,jersey:"#22304a",sleeves:true,glasses:true}],
  agent:()=>[{skin:SKINS[1],hatStyle:"yok",hair:"#333333"},{adult:true,jersey:"#22304a",sleeves:true,tie:"#d8b25a",glasses:true}],
  odd:()=>[{skin:"#b8c4a8",hatStyle:"kep",hat:"#333333"},{adult:true,jersey:"#2a2a2a",sleeves:true,glasses:true}],
  mate:()=>[{skin:SKINS[3],hatStyle:"band",hat:"#ffffff",hair:"#111111"},{jersey:S.team.c1,trim:S.team.c2,number:ri(4,55),mood:"mutlu"}],
  partner:()=>[{skin:SKINS[1],hatStyle:"bere",hat:"#e85d9a",pom:"#ffffff"},{jersey:"#7d5bd6",sleeves:true,mood:"mutlu",blush:true}],
  neighbor:()=>[{skin:"#e8c3a0",hatStyle:"kulak",hat:"#8a6b3e"},{adult:true,jersey:"#9a3b3b",sleeves:true,mood:"saskin",glasses:true}],
};
function eventSheet(ev,after){
  sheet(ev.title,ev.who,`<div class="who"><div id="ep"></div><div class="say">${ev.text}</div></div><div class="choices" id="ch">${ev.choices.map((x,i)=>`<button class="choice" data-i="${i}"><span class="ct" style="font-size:1.05rem">${x.t}</span></button>`).join("")}</div>`,{noClose:true});
  $("#ep").appendChild(portrait(ev.look[0],ev.look[1]));
  $$("#ch .choice").forEach(btn=>btn.onclick=()=>{const out=ev.choices[+btn.dataset.i].do();norm();save();$("#ch").innerHTML=`<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="ok">Devam</button>`;$("#ok").onclick=after});
}
function EVENTS(){const n=S.npc,th=cityTheme(S.city),pro=isPro(S.stage),mate=pick(roster()).n.split(" ")[0],fem=pick(cOf(S.city).fem),W=WAGE[S.stage];return[
 {w:"friend",who:n.friend,title:"Kanal fikri",text:`"Seni çeken bir basketbol kanalı açıyorum. Adı '${S.last} Günlükleri'. Var mısın?"`,choices:[
   {t:"Varım, çek",do:()=>{S.followers*=1.1;S.moral+=4;S.energy-=8;return`İlk video beklenenden çok izlendi. ${n.friend} artık kendini yönetmen sanıyor.`}},
   {t:"Odaklanmam lazım",do:()=>{S.rel.ark-=6;return`${n.friend} kırıldı ama "haklısın" dedi. Sonra kanalı kedisine çevirdi.`}}]},
 {w:"coach",who:n.coach,title:"Gizli taktik",text:`"Yeni bir set çizdim. Adı 'Kaplumbağa 3'. Herkes yavaşça hücum edecek, rakip uyuyakalınca hızlanacağız."`,choices:[
   {t:"Harika fikir hocam",do:()=>{S.rel.koc+=8;S.rel.takim-=4;return`${n.coach} sırtına vurdu. Takım arkadaşların göz devirdi.`}},
   {t:"Hocam, bu çalışmaz",do:()=>{S.rel.koc-=7;S.rel.takim+=5;return"Koç kıpkırmızı oldu ve seni 20 tur koşturdu. Ama takım sana saygı duydu."}}]},
 {w:"rival",who:n.rival,title:"Rakip sahnede",text:`${n.rival} bir röportajda "${S.last} mi? Abartılıyor" dedi. Video herkesin telefonunda.`,choices:[
   {t:"Sosyal medyadan cevap ver",do:()=>{if(Math.random()<.55){S.followers*=1.12;S.rel.taraf+=4;return"Cevabın viral oldu. Taraftar arkanda."}S.rel.taraf-=4;S.rel.koc-=3;return"Cevabın çocukça bulundu."}},
   {t:"Sahada konuşurum",do:()=>{S.buffs.motive=1;S.moral+=3;return"Hırslandın. Sonraki maçta niteliklerin daha etkili olacak."}}]},
 {w:"mom",who:n.mom,title:"Tribünde pankart",text:`"Maçına pankartla geleceğim: '${S.first.toLocaleUpperCase("tr-TR")}, ANNEN BURADA!'"`,choices:[
   {t:"Teşekkürler anne",do:()=>{S.rel.aile+=8;S.rel.taraf+=2;return"Pankart yayında üç kez gösterildi. Annen çok mutlu."}},
   {t:"Lütfen getirme",do:()=>{S.rel.aile-=9;return`${n.mom} sessizce pankartı katladı. Aile −9.`}}]},
 {w:"odd",who:"Salonun önündeki adam",title:"Mucize içecek",text:`"Pssst. 'Turbo Şampiyon'. Tamamen yasal, kesinlikle denetlenmiş. Sadece ${fmt(6)}."`,choices:[
   {t:"Bir tane al",do:()=>{if(S.money<6)return"Paran yetmedi.";tx("Şüpheli içecek",-6);S.energy+=35;if(Math.random()<.3){S.moral-=10;S.rel.taraf-=4;return"Enerji +35! Ama yüzünde mor benekler çıktı."}return"Enerji +35! Tadı pil gibiydi ama işe yaradı."}},
   {t:"Hayır, teşekkürler",do:()=>{S.rel.koc+=2;return"Adam bir duman bulutunda kayboldu."}}]},
 {w:"mate",who:mate,title:"Soyunma odası şakası",text:`"Koçun dolabına bir hafta önce balık sakladım. Kapıyı açmasını birlikte izleyelim mi?"`,choices:[
   {t:"Kesinlikle",do:()=>{S.rel.takim+=6;S.rel.koc-=5;S.moral+=5;return"Koç dolabı açınca geri geri kaçtı. Takım günlerce güldü."}},
   {t:"Bu iş kötü biter",do:()=>{S.rel.koc+=3;S.rel.takim-=5;return`${mate} tek başına yakalandı ve sana küstü.`}}]},
 ...(th.water==="s"?[{w:"friend",who:n.friend,title:"Sahil turnuvası",text:`"${S.city} sahilinde 3x3 turnuvası var! Ödül ${fmt(40*(1+ORDER.indexOf(S.stage)))}."`,choices:[
   {t:"Katılalım",do:()=>{S.energy-=12;if(Math.random()<.35+S.st.sut/200){tx("3x3 ödülü",40*(1+ORDER.indexOf(S.stage)));S.followers*=1.05;return"Turnuvayı kazandınız!"}return"Yarı finalde elendiniz ama güzel bir gündü."}},{t:"Bu hafta olmaz",do:()=>{S.rel.ark-=4;return`${n.friend} başkasıyla katıldı.`}}]}]:[]),
 ...(S.city!==S.home?[{w:"mom",who:n.mom,title:"Memleket özlemi",text:`"${S.city}'de yemek yiyor musun? Sana bir koli kurabiye yolladım. Kargocu üç kere aradı."`,choices:[
   {t:"Hemen git kargoyu al",do:()=>{S.moral+=6;S.rel.aile+=5;return"Kurabiyeleri takım arkadaşlarınla paylaştın. Herkes annene hayran."}},{t:"Sonra alırım",do:()=>{S.rel.aile-=4;return"Koli depoda bekliyor. Annen bunu duydu."}}]}]:[]),
 ...(S.stage==="lise"?[{w:"friend",who:n.friend,title:"Balon operasyonu",text:`"Müdürün arabasını balonla kaplayalım!"`,choices:[
   {t:"Ben de varım",do:()=>{S.moral+=8;if(Math.random()<.4){S.rel.koc-=8;S.rel.aile-=6;return"Yakalandınız! Bir hafta ceza."}S.rel.ark+=6;return"Fotoğraf okul yıllığına girdi."}},{t:"Antrenmana gidiyorum",do:()=>{const k=pick(STATS)[0];S.st[k]+=1;return`Ekstra çalıştın. ${statName(k)} +1.`}}]}]:[]),
 ...(S.studying?[{w:"press",who:"Okul",title:"Sınav haftası",text:"Bu hafta sınavlar var ve aynı günlerde maç hazırlığı.",choices:[
   {t:"Derslere gömül",do:()=>{S.aka+=7;S.energy-=12;return"Akademik +7."}},{t:"Basketbol önce gelir",do:()=>{S.aka-=6;S.moral+=4;return"Akademik −6."}}]}]:[]),
 ...(!S.partner&&S.age>=16?[{w:"partner",who:fem,title:"Bir mesaj",text:`${fem} yazdı: "Dünkü maçını izledim. Kahve içelim mi?"`,choices:[
   {t:"Neden olmasın",do:()=>{if(Math.random()<.5+fame()/250){S.partner=fem;S.rel.partner=55;S.moral+=12;return`${fem} ile güzel bir kahve. Artık bir partnerin var.`}S.moral-=4;return"Bütün akşam telefonuyla ilgilendi. Olmadı."}},{t:"Şu an odaklanmalıyım",do:()=>{S.rel.koc+=1;return"Mesajı kibarca cevapladın."}}]}]:[]),
 ...(pro?[{w:"agent",who:n.agent,title:"Reklam teklifi",text:`"'Pota Burger' reklam istiyor. Slogan: 'Bir ısırık, üç sayı.' Ücret ${fmt(W*1.5)}."`,choices:[
   {t:"Para paradır",do:()=>{tx("Reklam anlaşması",W*1.5);S.rel.taraf-=2;S.followers*=1.04;return"Reklam her yerde."}},{t:"Markama uymaz",do:()=>{S.rel.koc+=2;return`${n.agent}: "Peki, daha iyisini bekleriz."`}}]},
  {w:"dad",who:n.dad,title:"Babanın kamyoneti",text:`"Kamyonet yine bozuldu. Usta ${fmt(W*.6)} istiyor..."`,choices:[
   {t:"Hemen gönderiyorum",do:()=>{tx("Babaya destek",-W*.6);S.rel.aile+=12;return`${n.dad} sesinin titremesini saklamaya çalıştı.`}},{t:"Bu ay sıkışığım",do:()=>{S.rel.aile-=8;return`"Tamam, idare ederiz" dedi.`}}]},
  {w:"agent",who:n.agent,title:"Gizli görüşme",text:`"Başka bir kulübün başkanı seni istiyor. Bu hafta onunla gizlice yemek yersen sezon sonunda teklifler daha iyi olur."`,choices:[
   {t:"Görüş",do:()=>{S.buffs.offer=1;if(Math.random()<.3){S.rel.koc-=10;return"Haber sızdı! Koç kızgın. Ama teklifler daha iyi olacak."}return"Görüşme gizli kaldı. Sezon sonu teklifler daha iyi olacak."}},{t:"Kulübüme sadığım",do:()=>{S.rel.koc+=5;S.rel.taraf+=4;return"Sadakatin basına yansıdı."}}]}]:[]),
 {w:"neighbor",who:"Komşun Hayri Bey",title:"Gece yarısı",text:`"Kalk! Uzaylılar bahçemdeki basketbol topunu çaldı! Bir de inek götürdüler. Benim ineğim yok ama."`,choices:[
   {t:"Uzaylıları aramaya çık",do:()=>{S.energy-=15;S.moral+=8;if(Math.random()<.25){tx("Gizemli zarf",30*(1+ORDER.indexOf(S.stage)));return"Ormanda içinde para olan parlak bir zarf buldun."}return"Sadece bir rakun bulundu."}},{t:"Uyumaya devam",do:()=>{S.energy+=6;return"Hayri Bey sabaha kadar kapıyı çaldı."}}]},
 {w:"press",who:"Çocuk basketbol kulübü",title:"Davet",text:`${S.city}'deki bir çocuk kulübü seni antrenmanına davet etti.`,choices:[
   {t:"Git, günü onlarla geçir",do:()=>{S.energy-=10;S.rel.taraf+=6;S.followers*=1.05;S.moral+=8;return"Bir çocuk \"Senin gibi olacağım\" dedi."}},{t:"Programım dolu",do:()=>{S.rel.taraf-=2;return"Hayal kırıklığı belliydi."}}]},
]}
function randomEvent(after){const e=pick([...EVENTS(),...EVENTS_TR()]);eventSheet({...e,look:LK[e.w]()},after)}

/* ================= SEZON SONU & TEKLİFLER ================= */
function seasonEnd(playoff,champ,final){
  const res=S.results,w=res.filter(r=>r.win).length,avg=seasonAvg();
  const awards=[],tn=lgName(),label=seasonLabel();
  if(champ){awards.push(`${tn} şampiyonu`);S.career.trophies.push({type:S.stage==="lise"?"lise":"champ",label:`${label} · ${tn} şampiyonu · ${S.team.name}`});S.rel.taraf+=10;S.followers*=1.25}
  else if(final){awards.push(`${tn} finalisti`);S.career.trophies.push({type:"final",label:`${label} · ${tn} finalisti`})}
  awards.push(...seasonAwards(avg,champ));
  S.hist.push({label,team:S.team.name,league:tn,w,l:res.length-w,avg,champ,c1:S.team.c1,c2:S.team.c2,...(S.ss||blankSS())});
  const gr=BAL.grow.find(g=>S.age<=g[0]);
  for(const[k]of STATS){let g=ri(gr[1],gr[2]);if(S.age>=30&&(k==="sut"||k==="pas"))g=Math.max(g,-1);if(S.age>=30&&(k==="hiz"||k==="guc"))g-=Math.random()<.5?1:0;S.st[k]+=g}
  let schoolMsg="";
  if(S.studying&&S.stage!=="lise"){if(S.aka>=40){S.uniYear++;if(S.uniYear>4){S.studying=false;S.graduated=true;schoolMsg="Üniversiteden mezun oldun!";S.rel.aile+=15;news(`${fullName()} üniversiteden mezun oldu.`)}else schoolMsg=`Sınıfını geçtin: ${S.uniYear}. sınıf.`}else{schoolMsg="Akademik puan düşük, sınıf tekrarı.";S.moral-=6}}
  if(S.contract>0)S.contract--;
  S.age++;S.year++;S.season++;S.stageSeason++;rivalSeason();norm();save();
  const head=`<div class="card"><div class="eyebrow">${label} sezonu bitti · ${esc(tn)}</div><h2>${w} galibiyet · ${res.length-w} mağlubiyet</h2><div class="kv"><span>Ortalama not</span><b>${avg.toFixed(2)}</b><span>Sonuç</span><b>${champ?"Şampiyon":final?"Finalist":playoff?"Playoff":"Playoff dışı"}</b><span>Yeni yaşın</span><b>${S.age}</b><span>Genel</span><b>${ovr()}</b></div>${awards.length?`<div class="say">${awards.join(" · ")}</div>`:""}${schoolMsg?`<p class="small">${schoolMsg}</p>`:""}</div>${rivalCard(avg)}`;
  summerTournament(avg,()=>transition(avg,champ,head));
}
function potential(avg,champ){return ovr()+(avg-6.5)*5+(champ?2:0)+fame()*.03}
function grade(P){return P>=56?"A":P>=49?"B+":P>=43?"B":P>=38?"C+":"C"}
function genOffers(avg,champ,n=3){
  const P=potential(avg,champ),o=ovr(),cur=ORDER.indexOf(S.stage);
  const cap=cur<2?3:cur+1;const steps=["t3","t2","t1","euro","nba"].filter(st=>{if(st!=="t3"&&P<BAL.need[st])return false;if(st==="euro"&&S.stage!=="euro"&&(avg<6.8||S.age>30))return false;if(st==="nba"&&(avg<6.9||S.age>29))return false;return ORDER.indexOf(st)<=cap});
  if(!steps.length)steps.push("t3");
  const top=steps[steps.length-1],sec=steps[steps.length-2]||top;
  if(avg<5&&cur>=3)steps.unshift(ORDER[cur-1]);
  const out=[],used=new Set([S.team.key]);
  for(let i=0;i<n*3&&out.length<n;i++){
    const st=Math.random()<.6?top:sec;const cc0=st==="nba"?"US":Math.random()<.3?"TR":pick(EU_CC);
    const t=pick(leaguePool(st,cc0)),cc=t.cc;if(used.has(t.key))continue;used.add(t.key);
    const role=roleAt(o,st,cc),d=o-(tdOf(st,cc)+45);
    const wage=Math.round(WAGE[st]*(LEAGUES[cc].pr||1)*{star:1.35,rot:1,bench:.7}[role]*(1+clamp(d,-10,25)/50)*(S.buffs.offer?1.2:1));
    out.push({team:t,stage:st,role,wage,years:ri(1,3)});
  }
  return out;
}
function offerHTML(o,i){const t=o.team;const up=ORDER.indexOf(o.stage)>ORDER.indexOf(S.stage);
  const lab=o.stay?"Kal":o.uni?"Okul":up?"Üst seviye":"Teklif",cls=o.stay?"e":o.uni?"i":up?"m":"i";
  return`<button class="choice" data-o="${i}"><span class="ct" style="display:flex;align-items:center;gap:8px;font-size:1.08rem">${crestSVG(t,28)}<span>${esc(t.name)}</span></span><span class="cd">${esc(o.note||leagueName(o.stage,t.cc))} · ${esc(t.city)}${o.uni?"":`, ${(LEAGUES[t.cc]||LEAGUES.TR).n}`}${o.role?` · ${ROLE_N[o.role]}`:""}${o.wage?` · ${fmt(o.wage)}/hafta`:""}${o.years?` · ${o.years} yıl`:""}</span><span class="od ${cls}">${lab}</span></button>`}
function transition(avg,champ,head){
  let offers=[],title="Yeni sezon",intro="";
  const P=potential(avg,champ);
  if(S.stage==="lise"){
    if(S.stageSeason>2){
      const exam=clamp(Math.round(S.aka*.75+rnd(0,20)+(avg-6)*3),0,100);
      title="Kariyer değerlendirmesi";
      intro=`<div class="card"><div class="eyebrow">Gözlemci raporu</div><div class="row between nowrap"><div><h3>${esc(fullName())}</h3><div class="small muted">${POS[S.pos].n} · ${S.age} yaş · ${S.career.games} maç, ${S.career.pts} sayı</div></div><div class="big-num gold">${grade(P)}</div></div><p class="small muted">${P>=43?"2. lig kulüplerinden ciddi ilgi var.":"3. lig seviyesinde süre alarak gelişmeli."} Üniversite sınavı puanın: <b>${exam}</b>.</p></div>`;
      offers=genOffers(avg,champ,4);
      const uc=exam>65?["İstanbul","Ankara"]:exam>40?["İstanbul"]:[];uc.forEach(c=>{const t=makeTeam("myuni",c,0);offers.push({team:t,stage:"uni",wage:WAGE.uni+(avg>=6.3?20:0),note:"Üniversiteler Ligi · bir yıl gelişim",uni:true})});
      if(!uc.length)offers.push({team:makeTeam("myuni","İstanbul",2),stage:"uni",wage:WAGE.uni,note:"Spor akademisi · bir yıl gelişim",uni:true});
    }else{title="Lisede yeni yıl";offers=[{team:S.team,stage:"lise",wage:WAGE.lise,stay:true}]}
  }else if(S.stage==="uni"){
    title="Gözlemci raporu";intro=`<p>Potansiyel notun: <b class="gold">${grade(P)}</b>. Kulüplerden teklifler geldi.</p>`;
    offers=genOffers(avg,champ,3);
    if(S.clubDeal){const t=teamByKey(S.clubDeal.club);offers.unshift({team:t,stage:S.clubDeal.stage,role:roleAt(ovr(),S.clubDeal.stage,t.cc)==="bench"?"bench":"rot",wage:Math.round(WAGE[S.clubDeal.stage]*.9),years:2,note:`${leagueName(S.clubDeal.stage,t.cc)} · seçme sözü`})}
    if(S.uniYear<4)offers.push({team:S.team,stage:"uni",wage:S.wage,stay:true,note:"Okulda bir yıl daha"});
  }else{
    title="Sözleşme ve transfer";intro=`<p>Menajerin ${esc(S.npc.agent)} masaya gelen teklifleri sıraladı. Potansiyel notun: <b class="gold">${grade(P)}</b>.</p>`;
    const stayOk=S.contract>0||avg>=5||S.rel.koc>=30;
    const role=roleAt(ovr(),S.stage,S.team.cc);
    if(stayOk)offers.push({team:S.team,stage:S.stage,role,wage:S.contract>0?S.wage:Math.round(S.wage*(avg>=7?1.25:avg>=6?1.08:.92)),years:S.contract>0?S.contract:ri(1,3),stay:true,note:S.contract>0?`Sözleşmen sürüyor · ${S.contract} yıl`:"Sözleşme yenileme"});
    offers.push(...genOffers(avg,champ,S.transferReq===S.season-1?4:3));
  }
  offers=storyOffers(offers);
  S.buffs.offer=0;save();window.__lastOffers=offers;
  const retire=S.age>=34,force=S.age>=38;
  const show=()=>{
  sheet(title,`${seasonLabel()} sezonu öncesi`,`${head}${intro}${force?`<div class="say">Vücudun artık eskisi gibi değil. Emeklilik zamanı.</div><button class="btn bad" id="ret">Emeklilik törenine geç</button>`:`<div class="choices">${offers.map(offerHTML).join("")}</div>${retire?`<button class="btn ghost" id="ret">Emekli ol</button>`:""}`}`,{noClose:true});
  $$("[data-o]").forEach(x=>x.onclick=()=>negotiateOffer(offers[+x.dataset.o],sg=>sg?acceptOffer(sg):show()));
  const r=$("#ret");if(r)r.onclick=retireScreen};
  show();
}
function acceptOffer(o){
  const prevStage=S.stage,prevCity=S.city,t=o.team;
  if(o.uni&&prevStage!=="uni"){S.uni=t.name;S.uniYear=1;S.studying=true}
  if(isPro(o.stage)&&t.city!==S.city)S.studying=false;
  if(prevStage==="lise"&&!o.uni&&isPro(o.stage)&&t.city===S.city)S.studying=false;
  S.stage=o.stage;S.team=t;S.wage=o.wage||WAGE[o.stage];S.city=t.city;S.role=o.role||"rot";S.contract=o.stay?(o.years||S.contract):(o.years||0);
  if(S.stage!==prevStage)S.stageSeason=1;
  if(!o.stay){const c=cOf(t.city);S.npc.coach=pick(c.first)+" "+pick(c.last);S.rel.koc=45;S.rel.takim=45;news(`${fullName()}, ${t.name} ile ${o.years?o.years+" yıllık ":""}anlaşma imzaladı.`)}
  if(S.city!==prevCity){if(S.housing==="oda"||S.housing==="yurt")S.housing=S.stage==="uni"?"yurt":"daire";news(`${fullName()} ${S.city}'e taşındı.`)}
  if(S.city===S.home&&S.housing==="yurt")S.housing="oda";
  if(S.housing==="yurt"&&!S.studying)S.housing="daire";
  S.clubDeal=null;S.tryout=null;
  newSeasonLeague();setTeamVars();save();closeSheet();
  const ch=S.stage==="lise"?(S.stageSeason===2?"lise2":null):S.stage==="uni"?"uni":isPro(S.stage)&&!isPro(prevStage)?"pro":S.stage===prevStage?null:S.stage;
  chapter(ch,renderMain);
}
function retireScreen(){
  closeSheet();const k=S.career;const legend=Math.round((S.items.akademi?150:0)+(S.items.salon?80:0)+(k.allStars||0)*25+(k.natCaps||0)*2+k.pts*.3+k.ast*.6+(k.reb||0)*.4+k.blk*.8+k.trophies.length*40+k.mvps*30+k.wins*2);
  app.innerHTML=`<div style="padding-top:18px"><div class="eyebrow">${seasonLabel()}</div><h1>Emeklilik</h1></div>
  <div class="card"><div class="who"><div id="rp"></div><div><h2>${esc(fullName())}</h2><p class="muted">${S.age} yaşında, ${esc(S.team.name)} formasıyla kariyerini noktaladı.</p></div></div>
   <div class="box"><div><b>${k.games}</b><span class="eyebrow">Maç</span></div><div><b>${k.pts}</b><span class="eyebrow">Sayı</span></div><div><b>${k.ast}</b><span class="eyebrow">Asist</span></div><div><b>${k.trophies.length}</b><span class="eyebrow">Ödül</span></div></div>
   <div class="kv"><span>Galibiyet</span><b>${k.wins}</b><span>Kariyer kazancı</span><b>${fmt(k.earned)}</b><span>Takipçi</span><b>${kfmt(S.followers)}</b><span>Efsane puanı</span><b>${legend}</b></div>
   <p>${legend>900?"Moda sahilindeki potaya adın verildi ve yanına heykelin dikildi.":legend>350?"Kadıköy'deki mahalle sahasına adın verildi.":`Moda'daki çocuklar hâlâ ${esc(S.last)} gibi şut atmaya çalışıyor.`}</p>
   <button class="btn pri big" id="nw">Yeni kariyer</button></div>
  <div class="card"><div class="eyebrow">Kariyer</div><div class="tbl"><table><tr><th>Sezon</th><th>Takım</th><th>G-M</th><th>Ort.</th></tr>${S.hist.map(h=>`<tr><td>${h.label}</td><td>${esc(h.team)}<div class="small muted">${esc(h.league)}</div></td><td>${h.w}-${h.l}</td><td>${h.avg.toFixed(1)}</td></tr>`).join("")}</table></div>${k.trophies.map(t=>`<div class="small">${esc(t.label)}</div>`).join("")}</div>`;
  $("#rp").appendChild(portrait(S.look,{...jersey(),mood:"mutlu"},84,84,S.team.c1));
  if(!S.retired){S.retired=true;save()}
  $("#nw").onclick=renderSlots;
}
