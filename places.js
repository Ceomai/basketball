"use strict";
/* ================= MEKANLAR ================= */
function openLoc(id,tab){
  const I=locInfo(id,mapState());
  ({ev:locEv,stad:locStad,okul:locOkul,medya:locMedya,aile:locAile,kafe:locKafe,eglence:locEglence,avm:locAvm,market:locMarket,sans:locSans})[id](I,tab);
}
const HOUSING={oda:{n:"Ailenin evindeki odan",rent:0,en:0},yurt:{n:"Öğrenci yurdu",rent:12,en:0},daire:{n:"Kiralık daire",rent:140,en:4},lux:{n:"Rezidans dairesi",rent:950,en:8,mo:2},villa:{n:"Villa",rent:4200,en:12,mo:4},malikane:{n:"Malikâne",rent:15000,en:15,mo:6}};
const addScene=(el,kind,bubble,opts)=>el.prepend(sceneEl(kind,bubble,opts));

/* --- Ev / yaşam alanı --- */
function locEv(I,tab="vitrin"){
  const tabs=[["vitrin","Vitrin","trophyRoom"],["genel","Genel"],["yetenek","Yetenek"],["finans","Finans"],["kariyer","Kariyer"],["ev","Taşın"]];
  sheet(I.n,`Yaşam alanı · ${S.city}`,`${tabsHTML(tabs,tab)}<div id="evc" style="display:flex;flex-direction:column;gap:10px"></div>`);
  $$(".tabs button").forEach(x=>x.onclick=()=>locEv(I,x.dataset.t));
  const c=$("#evc");
  if(tab==="vitrin"){
    c.innerHTML=`<div class="scene" id="vit" style="min-height:120px"></div><div class="small muted">Kupaların, madalyaların, oynadığın takımların formaları ve aldığın eşyalar burada sergilenir. Ev büyüdükçe oda da değişir.</div>
     <div class="card"><div class="eyebrow">Kupa dolabı</div>${S.career.trophies.length?S.career.trophies.map(t=>`<div class="row nowrap small"><span style="width:28px">${icon(...trophyIcon(t)).replace("<svg",'<svg width="28" height="28"')}</span>${esc(t.label)}</div>`).join(""):'<div class="small muted">Henüz kupa yok. Şampiyonluk, final ve MVP ödülleri burada birikir.</div>'}</div>
     ${actHTML({id:"rest",ic:icon("bed"),t:"Dinlen",d:"Evde kal, uyu, dizlerini buzla.",slot:1,fx:[["+35 Enerji","p"],["+2 Moral","p"]],btn:"Dinlen"})}`;
    vitrineCanvas().then(cv=>{const v=$("#vit");if(v){v.innerHTML="";v.appendChild(cv)}});
    bindActs({rest:restAct});
  }
  if(tab==="genel"){
    const rs=S.results;const avg=rs.length?(rs.reduce((a,r)=>a+r.rating,0)/rs.length).toFixed(2):"–";
    c.innerHTML=`<div class="card"><div class="row nowrap" style="align-items:flex-start"><div id="pp"></div><div style="flex:1;min-width:0"><div class="eyebrow">${POS[S.pos].n} · #${S.num}</div><h2>${esc(fullName())}</h2><div class="small muted">${S.age} yaş · İstanbul</div><div class="small muted">${esc(S.team.name)}</div></div><div style="text-align:right"><div class="eyebrow">Genel</div><div class="big-num">${ovr()}</div></div></div>
     <div class="kv"><span>Lig</span><b>${esc(lgName())}</b><span>Rol</span><b>${isPro(S.stage)?ROLE_N[S.role]:"Okul takımı"}</b>${S.contract?`<span>Sözleşme</span><b>${S.contract} yıl</b>`:""}<span>Sezon ortalaması</span><b>${avg}</b><span>Şöhret</span><b>${fame()}/100</b><span>Takipçi</span><b>${kfmt(S.followers)}</b>${S.studying?`<span>Akademik</span><b>${S.aka}</b>`:""}${S.graduated?`<span>Eğitim</span><b>Mezun</b>`:""}</div></div>
     <div class="card"><div class="eyebrow">Bu sezonun maçları</div>${sparkHTML()}</div>
     <div class="card"><div class="eyebrow">İlişkiler</div>${RELS.map(([k,n])=>{const v=k==="partner"&&!S.partner?0:S.rel[k];return`<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${v<30?"var(--bad)":"var(--info)"}"></i></div><b>${k==="partner"&&!S.partner?"–":v}</b></div>`}).join("")}${S.partner?`<div class="small muted">Partnerin: ${esc(S.partner)}</div>`:""}</div>`;
    $("#pp").appendChild(portrait(S.look,{...jersey(),mood:"mutlu"},84,84,S.team.c1));
  }
  if(tab==="yetenek"){
    c.innerHTML=`<div class="card"><div class="row between"><div class="eyebrow">Nitelikler</div><span class="pill">Lig zorluğu ${TD()}</span></div>${STATS.map(([k,n])=>`<div class="attr"><span>${n}</span><div class="bar"><i style="width:${S.st[k]}%"></i></div><b>${S.st[k]}</b></div>`).join("")}
     <p class="small muted">Maçtaki etkin değer: nitelik eksi lig zorluğu, artı enerji ve moral etkisi. Şu an ${STATS.map(([k,n])=>`${n} ${Math.round(eff(k))}`).join(" · ")}.</p></div>
     <div class="card"><div class="eyebrow">${POS[S.pos].n} antrenmanları</div>${[...DRILLS[S.pos],...COMMON_DRILLS].map(d=>`<div class="small">${d[1]} · <span class="muted">${statName(d[2])}</span></div>`).join("")}<p class="small muted">24 yaşına kadar her yaz doğal gelişim alırsın; 30'dan sonra çeviklik ve güç düşer.</p></div>`;
  }
  if(tab==="finans"){
    const h=HOUSING[S.housing],up=carUpkeep();
    c.innerHTML=`<div class="card"><div class="eyebrow">Bakiye</div><div class="big-num gold">${fmt(S.money)}</div>
     <div class="kv"><span>${S.stage==="lise"?"Harçlık":S.stage==="uni"?"Burs":"Maaş"} (haftalık)</span><b class="good">+${fmt(S.wage)}</b><span>Kira · ${h.n}</span><b class="${h.rent?"bad":""}">${h.rent?"−"+fmt(h.rent):fmt(0)}</b><span>Araç masrafı</span><b class="${up?"bad":""}">${up?"−"+fmt(up):fmt(0)}</b><span><b>Net haftalık</b></span><b>${fmt(S.wage-h.rent-up)}</b><span>Kariyer kazancı</span><b>${fmt(S.career.earned)}</b></div></div>
     <div class="card"><div class="eyebrow">Hesap hareketleri</div><div class="tbl"><table><tr><th>Hafta</th><th>Açıklama</th><th style="text-align:right">Tutar</th></tr>${S.tx.slice(0,15).map(t=>`<tr><td class="muted">${t.w}</td><td>${esc(t.d)}</td><td style="text-align:right" class="${t.a<0?"bad":"good"}">${t.a<0?"":"+"}${fmt(t.a)}</td></tr>`).join("")||'<tr><td colspan="3" class="muted">Henüz hareket yok.</td></tr>'}</table></div></div>`;
  }
  if(tab==="kariyer"){
    const k=S.career;
    c.innerHTML=`<div class="box"><div><b>${k.games}</b><span class="eyebrow">Maç</span></div><div><b>${k.pts}</b><span class="eyebrow">Sayı</span></div><div><b>${k.ast}</b><span class="eyebrow">Asist</span></div><div><b>${k.reb||0}</b><span class="eyebrow">Ribaund</span></div></div>
     <div class="card"><div class="eyebrow">Sezonlar</div><div class="tbl"><table><tr><th>Sezon</th><th>Takım</th><th>G-M</th><th>Ort.</th></tr>${S.hist.map(h=>`<tr><td>${h.label}</td><td>${esc(h.team)}<div class="small muted">${esc(h.league)}</div></td><td>${h.w}-${h.l}</td><td>${h.avg.toFixed(1)}</td></tr>`).join("")||'<tr><td colspan="4" class="muted">İlk sezonun devam ediyor.</td></tr>'}</table></div></div>`;
  }
  if(tab==="ev"){
    const can=S.stage!=="lise";const opts=Object.entries(HOUSING).filter(([k])=>(k!=="oda"||S.city===S.home)&&(k!=="yurt"||S.studying));
    c.innerHTML=`<div class="card"><div class="row nowrap"><div style="width:52px">${icon("house")}</div><div><div class="eyebrow">Şu anki ev</div><h3>${HOUSING[S.housing].n}</h3><p class="small muted">Haftalık kira ${fmt(HOUSING[S.housing].rent)} · haftalık +${HOUSING[S.housing].en} enerji</p></div></div></div>
     ${can?`<div class="pgrid">${opts.filter(([k])=>k!==S.housing).map(([k,h])=>prodHTML({id:"h_"+k,ic:icon("house",{yurt:"#7e57c2",daire:"#90a4ae",lux:"#3f5f8a",villa:"#efe6d2",malikane:"#d8b25a",oda:"#8d6e63"}[k]),t:h.n,d:`Haftalık kira ${fmt(h.rent)} · depozito ${fmt(h.rent*4)}`,fx:[[`+${h.en} enerji/hafta`,"p"],...(h.mo?[[`+${h.mo} moral/hafta`,"p"]]:[])],price:h.rent*4,btn:"Taşın"})).join("")}</div>`:'<p class="small muted">Lise bitene kadar ailenle yaşıyorsun.</p>'}`;
    const m={};opts.forEach(([k,h])=>m["h_"+k]=()=>{const dep=h.rent*4;if(S.money<dep)return;if(dep)tx(`${h.n} depozitosu`,-dep);S.housing=k;news(`${fullName()} yeni evine taşındı: ${h.n}.`);save();toast("Taşındın: "+h.n);locEv(I,"vitrin")});bindActs(m);
  }
}
function restAct(){useSlot();S.energy+=35;S.moral+=2;norm();save();resultView("Dinlendin",pick(["Deliksiz bir uyku çektin. Telefonu sessize almak iyi fikirdi.","Bütün gün koltuktaydın. Vücudun teşekkür ediyor.","Buz banyosu, esneme, erken yatış. Tam bir profesyonel gibi."]),[["+35 Enerji","p"]])}
function sparkHTML(){
  const rs=S.results.slice(-10);if(!rs.length)return'<p class="small muted">Bu sezon henüz maç yok.</p>';
  const w=300,h=70,n=rs.length;const xs=i=>n===1?w/2:12+i*(w-24)/(n-1),ys=v=>h-8-(v-1)/9*(h-16);
  const pts=rs.map((r,i)=>`${xs(i).toFixed(1)},${ys(r.rating).toFixed(1)}`).join(" ");
  return`<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Maç notları"><line x1="0" x2="${w}" y1="${ys(6)}" y2="${ys(6)}" stroke="#24314a" stroke-dasharray="4 4"/><text x="2" y="${ys(6)-3}" fill="#5d6b82" font-size="9">6.0</text><polygon points="${xs(0)},${h} ${pts} ${xs(n-1)},${h}" fill="var(--team)" opacity=".15"/><polyline points="${pts}" fill="none" stroke="var(--team)" stroke-width="2.5"/>${rs.map((r,i)=>`<circle cx="${xs(i)}" cy="${ys(r.rating)}" r="${i===n-1?4.5:3}" fill="${r.win?"#36d38e":"#ff5468"}"/>`).join("")}</svg><div class="row" style="gap:4px">${rs.map(r=>`<span class="pill ${r.win?"w":"l"}">${r.us}-${r.them} · ${r.rating.toFixed(1)}</span>`).join("")}</div>`;
}

/* --- Stadyum --- */
const momentCount=()=>clamp(3+Math.round(S.rel.koc/30)+(isPro(S.stage)?1:0)+(S.role==="star"?1:S.role==="bench"?-1:0),3,7);
const DRILL_IC={shoot:"ball",shootmid:"ball",pass:"chat",dribble:"sneaker",steal:"whistle",post:"dumbbell",rebound:"hoop",block:"hoop",free:"ball",gym:"dumbbell"};
function locStad(I,tab="mac"){
  const tabs=[["mac","Maç"],["idman","Antrenman"],["tablo","Puan durumu"]];
  if(S.tryout&&!S.tryout.done)tabs.push(["secme","Seçmeler"]);
  sheet(I.n,`${S.team.name} · ${S.city}`,`${tabsHTML(tabs,tab)}<div id="stc" style="display:flex;flex-direction:column;gap:10px"></div>`,{icon:crestSVG(S.team,36)});
  $$(".tabs button").forEach(x=>x.onclick=()=>locStad(I,x.dataset.t));
  const c=$("#stc");
  if(tab==="mac"){
    const fx=fixture(),opp=teamByKey(fx.opp),row=S.league.find(r=>r.key===opp.key),mr=S.league.find(r=>r.key===S.team.key);
    c.innerHTML=`<div class="card" style="text-align:center"><div class="eyebrow">${phaseName()} · Hafta ${S.week}</div>
     <div class="row nowrap" style="justify-content:space-around"><div>${crestSVG(S.team,64)}<div style="font-weight:800">${esc(S.team.short)}</div><div class="small muted">${mr.w}-${mr.l}</div></div><div class="disp" style="font-size:1.6rem;color:var(--muted)">VS</div><div>${crestSVG(opp,64)}<div style="font-weight:800">${esc(opp.short)}</div><div class="small muted">${row.w}-${row.l}</div></div></div>
     <div style="font-weight:700">${esc(opp.name)}</div><div class="small muted">${fx.home?`İç saha · ${esc(S.city)}`:`Deplasman · ${esc(opp.city)}`}</div></div>
     <div class="card"><div class="kv"><span>Enerjin</span><b class="${S.energy<35?"bad":""}">${S.energy}</b><span>Rolün</span><b>${isPro(S.stage)?ROLE_N[S.role]:"Okul takımı"}</b><span>Koçla ilişki</span><b>${S.rel.koc}</b><span>Beklenen kritik an</span><b>${momentCount()}</b></div>${S.energy<35?'<p class="small bad">Yorgunsun. Maçta isabetin düşecek.</p>':""}${S.slot>0?`<p class="small muted">Bu hafta ${S.slot} zaman dilimin daha var. Maça çıkınca hafta biter.</p>`:""}</div>
     <button class="btn pri big" id="play">Maça çık</button>`;
    $("#play").onclick=()=>{closeSheet();playMatch()};
  }
  if(tab==="idman"){
    const list=[...DRILLS[S.pos],...COMMON_DRILLS];
    c.innerHTML=`<div class="eyebrow">${POS[S.pos].n} programı</div>`+list.map(([id,n,k,g,d])=>actHTML({id,ic:icon(DRILL_IC[g]),t:n,d:`${d} ${statName(k)} şu an ${S.st[k]}.`,slot:1,fx:[["−18 Enerji","n"],[`${statName(k)} +0–5`,"p"]],btn:"Başla",disabled:S.energy<18})).join("")+
     actHTML({id:"takim",ic:icon("whistle"),t:"Takım antrenmanı",d:"Koçun taktik çalışması. Mini oyun yok, küçük ama kesin gelişim.",slot:1,fx:[["−12 Enerji","n"],["+4 Koç","p"],["+3 Takım","p"]],btn:"Katıl",disabled:S.energy<12})+
     (S.items.hoca?"":actHTML({id:"hoca",ic:icon("whistle"),t:"Kişisel antrenör tut",d:"Bütün antrenmanlarda +1 kazanç. Tek seferlik ücret.",price:6000,fx:[["Kalıcı","t"]],btn:fmt(6000),cls:"ghost"}));
    const m={};list.forEach(d=>m[d[0]]=()=>{closeSheet();runDrill(d)});
    m.takim=()=>{useSlot();S.energy-=12;S.rel.koc+=4;S.rel.takim+=3;const k=pick(STATS)[0];S.st[k]+=1;norm();save();resultView("Takım antrenmanı",`${S.npc.coach} yeni setleri anlattı, sen de dikkatle dinledin. ${statName(k)} +1.`,[["+4 Koç","p"],["+3 Takım","p"]])};
    m.hoca=()=>{if(S.money<6000)return;tx("Kişisel antrenör",-6000);S.items.hoca=1;save();toast("Antrenörün hazır.");locStad(I,"idman")};
    bindActs(m);
  }
  if(tab==="tablo"){
    c.innerHTML=`<div class="card"><div class="eyebrow">${esc(lgName())} · ${seasonLabel()}</div><div class="tbl"><table><tr><th>#</th><th>Takım</th><th>G</th><th>M</th><th>Av.</th></tr>${standings().map((r,i)=>{const t=teamByKey(r.key);return`<tr class="${t.key===S.team.key?"me":""}"><td>${i+1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${t.c1};margin-right:6px"></span>${esc(t.name)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf-r.pa>0?"+":""}${r.pf-r.pa}</td></tr>`}).join("")}</table></div><p class="small muted">İlk 4 takım ${S.stage==="lise"?"turnuvaya":"playoffa"} kalır.</p></div>`;
  }
  if(tab==="secme"){
    const t=teamByKey(S.tryout.club);
    c.innerHTML=`<div class="card"><div class="row nowrap">${crestSVG(t,48)}<div><div class="eyebrow">${esc(leagueName(S.tryout.stage,t.cc))}</div><h3>${esc(t.name)}</h3></div></div><p class="small">Seçme üç bölümden oluşur: 3 şut, 1 çalım turu, 1 blok. En az 3 başarı gerekiyor. Son tarih: hafta ${S.tryout.until}.</p></div>`+actHTML({id:"go",ic:icon("whistle"),t:"Seçmeye katıl",d:"Bütün günü alır. Dinlenmiş gel.",slot:1,fx:[["−20 Enerji","n"]],btn:"Katıl"});
    bindActs({go:()=>{closeSheet();runTryout()}});
  }
}
function arenaFor(opp){ARENA={home:S.team.c1,home2:S.team.c2,away:opp?opp.c1:"#4a5568",away2:opp?opp.c2:"#ffffff",led:`  ${S.team.name.toLocaleUpperCase("tr-TR")}  •  ${S.city.toLocaleUpperCase("tr-TR")}  •  ${lgName().toLocaleUpperCase("tr-TR")}  •`};
  if(luma(ARENA.home)<50)ARENA.home=ARENA.home2;buildCrowd(ARENA.home,ARENA.away)}
function runGame(kind,el,e,reps,title){
  if(kind==="shoot")return mgShoot(el,{eff:e,shots:reps+1,title,dist:"three",def:false}).then(r=>r.made/(reps+1));
  if(kind==="shootmid")return mgShoot(el,{eff:e,shots:reps+1,title,dist:"mid",def:false}).then(r=>r.made/(reps+1));
  if(kind==="pass")return mgPass(el,{eff:e,reps,title}).then(r=>r.ok/reps);
  if(kind==="dribble")return mgDribble(el,{eff:e,reps,title}).then(r=>r.ok/reps);
  if(kind==="steal")return mgTiming(el,{eff:e,tries:reps,title,label:"Uzan",kind:"steal"}).then(r=>r.ok/reps);
  if(kind==="post")return mgPost(el,{eff:e,reps,title}).then(r=>r.ok/reps);
  if(kind==="rebound")return mgRebound(el,{eff:e,reps,title}).then(r=>r.ok/reps);
  if(kind==="block")return mgBlock(el,{eff:e,reps,title}).then(r=>r.ok/reps);
  if(kind==="free")return mgTiming(el,{eff:e,tries:reps+1,title,label:"At"}).then(r=>r.ok/(reps+1));
  return mgGym(el,{title}).then(r=>clamp(r.taps/40,0,1));
}
async function runDrill([id,name,k,kind]){
  useSlot();S.energy-=18;save();arenaFor(null);
  app.innerHTML=`<div class="row between" style="padding-top:12px"><div><div class="eyebrow">Antrenman · ${esc(S.team.short)} · ${POS[S.pos].n}</div><h2>${name}</h2></div></div><div id="stg"></div><div id="res"></div>`;
  const ratio=await runGame(kind,$("#stg"),clamp(eff(k)+10,5,100),3,name);
  const gain=Math.max(0,Math.round(ratio*4.5*(1.3-S.st[k]/100))+(S.items.hoca?1:0)+(ratio>0?1:0)+(S.buffs.train>0?1:0));
  if(S.buffs.train>0)S.buffs.train--;
  S.st[k]+=gain;if(ratio>.6)S.rel.koc+=2;norm();save();
  $("#res").innerHTML=`<div class="card" style="margin-top:12px"><div class="row between"><div><div class="eyebrow">Sonuç · başarı %${Math.round(ratio*100)}</div><h2>${gain>=4?"Mükemmel seans":gain>=2?"Verimli seans":gain>0?"İdare eder":"Bugün olmadı"}</h2></div><div class="big-num ${gain?"good":""}">+${gain}</div></div><p class="small muted">${statName(k)} şimdi ${S.st[k]}.</p><button class="btn pri" id="bk">Haritaya dön</button></div>`;
  $("#bk").onclick=renderMain;
}
async function runTryout(){
  useSlot();S.energy-=20;save();const club=teamByKey(S.tryout.club);arenaFor(club);
  app.innerHTML=`<div style="padding-top:12px" class="row nowrap">${crestSVG(club,44)}<div><div class="eyebrow">Seçmeler</div><h2>${esc(club.name)}</h2></div></div><div class="say" id="tsay">Bölüm 1: Şut. Üç atış hakkın var.</div><div id="stg"></div><div id="res"></div>`;
  const shift=(tdOf(S.tryout.stage,club.cc)-TD())/2;
  const r1=await mgShoot($("#stg"),{eff:clamp(eff("sut")-shift,3,100),shots:3,title:"Seçme · şut",def:false});
  $("#tsay").textContent="Bölüm 2: Çalım. Gözlemciler not alıyor.";
  const r2=await mgDribble($("#stg"),{eff:clamp(eff("hiz")-shift,3,100),reps:1,title:"Seçme · çalım"});
  $("#tsay").textContent="Bölüm 3: Savunma.";
  const r3=await mgBlock($("#stg"),{eff:clamp((eff("sav")+eff("guc"))/2-shift,3,100),reps:1,title:"Seçme · blok"});
  const score=r1.made+r2.ok+r3.ok,pass=score>=3;S.tryout.done=true;
  if(pass){S.clubDeal={club:club.key,stage:S.tryout.stage};news(`${fullName()}, ${club.name} seçmelerini geçti.`);S.moral+=15;S.rel.aile+=8}else{S.moral-=8;news(`${club.name} seçmeleri sonuçlandı. Bu sefer olmadı.`)}
  norm();save();$("#stg").innerHTML="";$("#tsay").remove();
  $("#res").innerHTML=`<div class="card"><div class="eyebrow">Seçme sonucu · ${score}/5</div><h2 class="${pass?"good":"bad"}">${pass?"Kadroya alındın":"Kadroya alınmadın"}</h2><p>${pass?`${club.name} sezon sonunda sana sözleşme teklif edecek.`:`Gözlemci "Potansiyel var ama henüz hazır değil." dedi.`}</p><button class="btn pri" id="bk">Haritaya dön</button></div>`;
  $("#bk").onclick=renderMain;
}

/* --- Okul: sınıf quiz'i / menajer ofisi --- */
const TRIVIA=[["FIBA'da hücum süresi kaç saniyedir?","24",["24","30","20","35"]],["FIBA maçı toplam kaç dakikadır?","40",["40","48","36","44"]],["Sahada bir takımdan kaç oyuncu bulunur?","5",["5","6","4","7"]],["Kaç kişisel faulde oyuncu oyundan çıkar? (FIBA)","5",["5","6","4","3"]],["Topu geri sahadan çıkarmak için süre?","8 saniye","8 saniye|10 saniye|5 saniye|12 saniye".split("|")],["Üç saniye kuralı hangi bölge için geçerlidir?","Boyalı alan",["Boyalı alan","Orta saha","Köşeler","Üç sayı çizgisi"]],["Türkiye'nin başkenti neresidir?","Ankara",["Ankara","İstanbul","İzmir","Bursa"]],["İstanbul hangi iki kıtada yer alır?","Avrupa ve Asya",["Avrupa ve Asya","Asya ve Afrika","Avrupa ve Afrika","Sadece Avrupa"]],["Su deniz seviyesinde kaç derecede kaynar?","100 °C",["100 °C","90 °C","80 °C","120 °C"]],["√144 kaçtır?","12",["12","14","11","16"]],["Fotosentez bitkinin hangi bölümünde yoğun olur?","Yaprak",["Yaprak","Kök","Çiçek","Tohum"]],["EuroLeague hangi kıtanın kulüp organizasyonudur?","Avrupa",["Avrupa","Asya","Amerika","Afrika"]]];
function makeQuestion(){
  const r=Math.random();
  if(r<.35){const a=ri(2,9),b=ri(2,9),f=ri(0,6);const ans=3*a+2*b+f;const o=shuffle([ans,ans+2,ans-3,ans+5]).map(String);return{q:`Bir oyuncu ${a} üçlük, ${b} ikilik ve ${f} serbest atış soktu. Kaç sayı yaptı?`,a:String(ans),o}}
  if(r<.55){const m=ri(3,9),n=m+ri(2,8);const p=Math.round(m/n*100);const o=shuffle([p,p+7,p-9,p+15]).map(x=>`%${x}`);return{q:`${n} şutta ${m} isabet. İsabet yüzdesi kaçtır?`,a:`%${p}`,o}}
  const t=pick(TRIVIA);return{q:t[0],a:t[1],o:shuffle(t[2])};
}
function runQuiz(nq,done){
  let i=0,correct=0;
  const ask=()=>{const Q=makeQuestion();
    const b=$("#shb");if(!b)return;b.innerHTML="";addScene(b,"okul",null,{board:`SORU ${i+1}/${nq}\n${Q.q.length>34?Q.q.slice(0,34)+"…":Q.q}`});
    b.insertAdjacentHTML("beforeend",`<div class="card"><div class="eyebrow">Soru ${i+1}/${nq} · doğru ${correct}</div><h3 style="text-transform:none;font-family:var(--body);font-weight:800;font-size:1rem;letter-spacing:0">${esc(Q.q)}</h3><div class="bar"><i id="qt" style="width:100%;transition:width 8s linear;background:var(--warn)"></i></div><div class="qopts">${Q.o.map(o=>`<button class="qbtn" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`);
    requestAnimationFrame(()=>{const q=$("#qt");if(q)q.style.width="0%"});
    let over=false;const fin=pickd=>{if(over||!$("#shb"))return;over=true;clearTimeout(tm);$$(".qbtn").forEach(x=>{if(x.dataset.o===Q.a)x.classList.add("ok");else if(x.dataset.o===pickd)x.classList.add("no");x.disabled=true});if(pickd===Q.a)correct++;setTimeout(()=>{i++;i<nq?ask():done(correct)},900)};
    const tm=setTimeout(()=>fin(null),8000);
    $$(".qbtn").forEach(x=>x.onclick=()=>fin(x.dataset.o));
  };ask();
}
function locOkul(I){
  if(S.studying){
    const isL=S.stage==="lise",pr=isL?25:60;
    const b=sheet(I.n,isL?S.team.name:`${S.uni||"Üniversite"} · ${S.uniYear}. sınıf`,
     `<div class="card"><div class="attr"><span>Akademik</span><div class="bar"><i style="width:${S.aka}%;background:var(--info)"></i></div><b>${S.aka}</b></div><p class="small muted">${isL?"Lise bitince üniversite seçeneği akademik puanına bağlı. Hiç ders çalışmadığın haftalarda puan düşer.":"Sezon sonunda akademik 40'ın altındaysa sınıfı geçemezsin."}</p></div>`+
     actHTML({id:"ders",ic:icon("book"),t:"Derse gir",d:"Hoca tahtaya 3 soru yazacak. Her doğru cevap puan getirir.",slot:1,fx:[["Doğru başına +3 Akademik","p"],["−6 Enerji","n"]],btn:"Derse gir"})+
     actHTML({id:"kurs",ic:icon("pencil"),t:isL?"Sınav kursu":"Özel ders",d:"5 soruluk yoğun tekrar. Ücretli.",slot:1,price:pr,fx:[["Doğru başına +3","p"],["+4 temel","p"],[`−${fmt(pr)}`,"n"]],btn:"Yazıl"})+
     (!isL?actHTML({id:"birak",ic:icon("door"),t:"Okulu bırak",d:"Tamamen basketbola odaklan. Geri dönüşü yok.",fx:[["−10 Aile","n"],["+5 Moral","p"]],btn:"Bırak",cls:"bad"}):""));
    addScene(b,"okul","Telefonları kapatın, tahtaya bakın.",{board:isL?"BUGÜNÜN KONUSU:\nİsabet yüzdesi ve\nFIBA kuralları":"İSTATİSTİK 101\nVerimlilik ve\nolasılık"});
    bindActs({ders:()=>{useSlot();S.energy-=6;S.studied=true;runQuiz(3,c=>{S.aka+=c*3;S.moral+=c===3?3:-1;norm();save();resultView("Ders bitti",c===3?"Üçte üç! Hoca seni tahtaya kaldırıp alkışlattı.":c?`${c} doğru. Fena değil ama arka sıradaki gülüşmeler dikkatini dağıttı.`:"Hiç doğru yok. Hoca velini aramakla tehdit etti.",[[`+${c*3} Akademik`,"p"]])})},
      kurs:()=>{if(S.money<pr)return;useSlot();tx(isL?"Sınav kursu":"Özel ders",-pr);S.studied=true;runQuiz(5,c=>{S.aka+=4+c*3;norm();save();resultView("Kurs bitti",`${c}/5 doğru. Kafan dolu ama içi boş değil.`,[[`+${4+c*3} Akademik`,"p"]])})},
      birak:()=>{S.studying=false;S.rel.aile-=10;S.moral+=5;news(`${fullName()} okulu bırakıp basketbola odaklandı.`);norm();save();resultView("Karar verildi",`${S.npc.mom} telefonda bir süre sustu. Sonra "Kendi yolunu seçtin, arkandayız" dedi.`)}});
  }else{
    const sp=Math.max(50,Math.round(fame()*fame()*({nba:9,euro:4,t1:2}[S.stage]||1.2)));
    const b=sheet("Menajer Ofisi",`Menajerin ${S.npc.agent}`,`<div class="card"><div class="kv"><span>Sözleşme</span><b>${esc(S.team.name)}</b><span>Kalan süre</span><b>${S.contract||0} yıl</b><span>Haftalık maaş</span><b>${fmt(S.wage)}</b><span>Rol</span><b>${ROLE_N[S.role]}</b><span>Şöhret</span><b>${fame()}/100</b></div></div>`+
     (S.buffs.sponsorSeason===S.season?'<p class="small muted">Bu sezonun sponsorluk anlaşmasını zaten imzaladın.</p>':actHTML({id:"sp",ic:icon("handshake"),t:"Sponsorluk anlaşması",d:fame()<15?"Şöhretin henüz yetmiyor.":"Sezonda bir kez. Pazarlıkta ne kadar zorlarsan o kadar risk.",fx:[[`~${fmt(sp)}`,"p"]],btn:"Pazarlık",disabled:fame()<15}))+
     actHTML({id:"pr",ic:icon("mic"),t:"Basın toplantısı",d:"Menajerin soruları önceden ayarladı.",slot:1,fx:[["+Taraftar","p"],["+Takipçi","p"]],btn:"Düzenle"}));
    addScene(b,"ofis",fame()>40?"Telefonum susmuyor. Markalar seninle çalışmak istiyor.":"Daha çok kazan, daha çok paylaş. Sponsorlar takipçiye bakıyor.");
    bindActs({sp:()=>negotiate(sp),pr:()=>{useSlot();const g=ri(2,6);S.rel.taraf+=g;S.followers*=1.04;norm();save();resultView("Basın toplantısı",`Sakin ve kendinden emin konuştun. ${S.npc.journalist} yazısında "olgun bir profesyonel" dedi.`,[[`+${g} Taraftar`,"p"],["+%4 Takipçi","p"]])}});
  }
}
function negotiate(base){
  let offer=base,round=1;
  const show=()=>{$("#shb").innerHTML=`<div class="card"><div class="eyebrow">Pazarlık · tur ${round}/3</div><div class="big-num gold">${fmt(offer)}</div><p class="small muted">Marka temsilcisi masada. Kabul edebilir ya da daha fazlasını isteyebilirsin. Her artırma isteğinde masadan kalkma ihtimali büyür.</p></div><div class="grid2"><button class="btn good" id="ok1">Kabul et</button><button class="btn gold" id="up1" ${round>=3?"disabled":""}>%25 daha iste</button></div>`;
    $("#ok1").onclick=()=>{tx("Sponsorluk anlaşması",offer);S.buffs.sponsorSeason=S.season;news(`${fullName()} yeni bir sponsorlukla anlaştı.`);save();resultView("İmzalandı",`${fmt(offer)} hesabına geçti. Reklam çekimi gelecek ay.`)};
    $("#up1").onclick=()=>{if(Math.random()<.22*round){S.buffs.sponsorSeason=S.season;save();resultView("Masadan kalktılar","Temsilci çantasını topladı: \"Başka bir oyuncuyla devam edeceğiz.\" Bu sezon sponsorluk yok.");return}offer=Math.round(offer*1.25);round++;show()}};
  show();
}

/* --- Medya --- */
function locMedya(I){
  const pr=Math.round(30*(1+ORDER.indexOf(S.stage)*2));
  const b=sheet(I.n,`@${(S.first+S.last).toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g,"")}${S.num}`,
   `<div class="box" style="grid-template-columns:repeat(3,1fr)"><div><b>${kfmt(S.followers)}</b><span class="eyebrow">Takipçi</span></div><div><b>${fame()}</b><span class="eyebrow">Şöhret</span></div><div><b>${S.rel.taraf}</b><span class="eyebrow">Taraftar</span></div></div>
   <div class="pgrid">${[
     {id:"shoot",ic:icon("camera"),t:"Fotoğraf çekimi",d:"Stüdyoda 3 kare. En iyisi paylaşılır.",slot:1,fx:[["+Takipçi","p"]],btn:"Çekime gir"},
     {id:"vlog",ic:icon("phone"),t:"Şehir vlogu",d:`${S.city} sokaklarında video. Kare yakala.`,slot:1,fx:[["+Takipçi","p"],["+Taraftar","p"]],btn:"Çek"},
     {id:"rop",ic:icon("mic"),t:"Röportaj",d:"Gazetecinin iki sorusu. Cevapların her şeyi değiştirir.",slot:1,fx:[["Taraftar ±","t"]],btn:"Otur"},
     {id:"hayir",ic:icon("heart"),t:"Yardım kampanyası",d:"Mahalle sahası için bağış.",slot:1,price:pr,fx:[["+Taraftar","p"],[`−${fmt(pr)}`,"n"]],btn:"Başlat"},
   ].map(prodHTML).join("")}</div>`);
  addScene(b,"medya","Işıklar hazır, kamera seni bekliyor.");
  bindActs({shoot:()=>photoSession("arena"),vlog:()=>photoSession("city"),rop:interview,
    hayir:()=>{if(S.money<pr)return;useSlot();tx("Yardım bağışı",-pr);const g=ri(5,10);S.rel.taraf+=g;S.followers*=1.06;norm();save();resultView("Kampanya başladı",`Mahalle sahasının potaları yenilenecek. Çocuklar videoyu binlerce kez paylaştı.`,[[`+${g} Taraftar`,"p"],["+%6 Takipçi","p"]])}});
}
async function photoSession(bg){
  useSlot();closeSheet();arenaFor(null);
  app.innerHTML=`<div style="padding-top:12px"><div class="eyebrow">Medya Merkezi</div><h2>${bg==="arena"?"Fotoğraf çekimi":"Şehir vlogu"}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r=await mgPhoto($("#stg"),{title:bg==="arena"?"Stüdyo":"Vlog · "+S.city,bg});
  const q=Math.max(0,r.score);const add=Math.round(S.followers*(q/100)*.12*(S.items.telefon?1.5:1)+ri(5,30));const tr=q>=80?ri(2,5):q>=50?ri(0,2):-1;
  S.followers+=add;S.rel.taraf+=tr;norm();save();
  const cms=q>=70?["Formasını sipariş ettim bile 🔥","Memleketin gururu!","Bu kare kapak olur"]:q>=40?["Güzel ama daha iyisini bekliyoruz","Antrenmanlara devam","👍"]:["Fotoğrafçıyı değiştir","Bulanık olmuş","Önce maç kazan"];
  $("#stg").innerHTML="";
  $("#res").innerHTML=`<div class="post"><div class="ph"><i></i>${esc((S.first+S.last).toLocaleLowerCase("tr-TR"))}${S.num}<span style="margin-left:auto;color:#888;font-weight:600">${esc(S.city)}</span></div>${r.img?`<img src="${r.img}" alt="Paylaşılan fotoğraf">`:""}<div class="pb"><div class="lk" id="lk">0 beğeni</div><div><b>${esc((S.first+S.last).toLocaleLowerCase("tr-TR"))}</b> ${bg==="arena"?"Yeni sezon, yeni hedefler.":"Şehrimi keşfediyorum."} #${esc(S.team.short)}</div>${cms.map(x=>`<div style="color:#555">${esc(x)}</div>`).join("")}</div></div>
   <div class="card" style="margin-top:12px"><div class="kv"><span>Kare kalitesi</span><b>${q}/100</b><span>Yeni takipçi</span><b class="good">+${kfmt(add)}</b><span>Taraftar</span><b>${tr>=0?"+":""}${tr}</b></div><button class="btn pri" id="bk">Haritaya dön</button></div>`;
  const likes=Math.round(add*rnd(2.5,4));let k=0;const lk=$("#lk");const iv=setInterval(()=>{k=Math.min(likes,k+Math.ceil(likes/30));if(lk)lk.textContent=`${k.toLocaleString("tr-TR")} beğeni`;if(k>=likes)clearInterval(iv)},40);
  $("#bk").onclick=()=>{clearInterval(iv);renderMain()};
}
function interview(){
  useSlot();const j=S.npc.journalist;
  const QS=[["Bu sezon hedefin ne?",[["Takımım için her şeyi vereceğim.",{taraf:3,takim:3}],["Ligin en iyisi olmak.",{taraf:5,koc:-2,risk:1}],["Önce maç maç düşünüyoruz.",{koc:3}]]],
   [`${S.npc.rival} senin için "abartılıyor" dedi. Yorumun?`,[["Sahada cevap veririm.",{motive:1}],["Kim o? Tanımıyorum.",{taraf:4,risk:1}],["Ona saygı duyuyorum.",{taraf:1,koc:2}]]],
   ["Koçunla aran nasıl?",[["Bana çok şey öğretiyor.",{koc:6}],["Daha fazla süre hak ediyorum.",{koc:-6,taraf:3}],["Her şey yolunda.",{}]]],
   [`${S.city} hayatı nasıl gidiyor?`,[["Burayı ev gibi hissediyorum.",{taraf:5}],["Biraz memleketi özlüyorum.",{aile:4}],["Sadece basketbola odaklıyım.",{koc:2}]]]];
  const qs=shuffle(QS).slice(0,2);let i=0,log=[];
  const ask=()=>{const[q,ans]=qs[i];const b=$("#shb");b.innerHTML="";addScene(b,"medya",q,{});
    b.insertAdjacentHTML("beforeend",`<div class="eyebrow">${esc(j)} soruyor · ${i+1}/2</div><div class="choices">${ans.map((a,k)=>`<button class="choice" data-k="${k}"><span class="ct" style="font-size:1rem;text-transform:none;font-family:var(--body);font-weight:800">"${esc(a[0])}"</span></button>`).join("")}</div>`);
    $$(".choice").forEach(x=>x.onclick=()=>{const fx=ans[+x.dataset.k][1];let t="";if(fx.risk&&Math.random()<.45){S.rel.taraf-=6;t="Cevabın tepki çekti.";}else{for(const r of["taraf","takim","koc","aile"])if(fx[r])S.rel[r]+=fx[r];if(fx.motive)S.buffs.motive=1;if(fx.taraf>0)S.followers*=1+fx.taraf/100}log.push(`"${ans[+x.dataset.k][0]}" ${t}`);i++;if(i<2)ask();else{norm();save();resultView("Röportaj yayında",`${esc(j)} haberi şöyle başlıkladı: <b>"${esc(S.last)}: ${esc(ans[+x.dataset.k][0])}"</b><br><span class="muted small">${log.map(esc).join("<br>")}</span>`)}})};
  ask();
}

/* --- Aile --- */
function locAile(I){
  const away=S.city!==S.home,travel=away?Math.round(20*(1+ORDER.indexOf(S.stage))):0,gift=Math.max(50,Math.round(S.wage*.5));
  const b=sheet(I.n,away?`${S.home} · uçuş ${fmt(travel)}`:`${S.npc.mom} ve ${S.npc.dad}`,`<div class="pgrid">${[
     {id:"yemek",ic:icon("plate"),t:"Aile yemeği",d:away?"Memlekete uç, annenin yemeğini ye.":"Pazar sofrası, dayının bitmeyen hikayeleri.",slot:1,price:travel,fx:[["+12 Aile","p"],["+5 Moral","p"]],btn:"Sofraya otur"},
     {id:"baba",ic:icon("hoop"),t:`${S.npc.dad} ile birebir`,d:"Sokaktaki potada eski usul.",slot:1,price:travel,fx:[["+6 Aile","p"],["Nitelik +1","p"]],btn:"Oyna"},
     ...(isPro(S.stage)?[{id:"para",ic:icon("envelope"),t:"Ailene para gönder",d:"Evin kredisine destek ol.",price:gift,fx:[["+15 Aile","p"],["+4 Moral","p"]],btn:fmt(gift)}]:[]),
     {id:"tel",ic:icon("phone"),t:"Görüntülü ara",d:"Kısa ama iyi gelir.",fx:[["+4 Aile","p"]],btn:"Ara",disabled:S.buffs.called===S.week},
   ].map(prodHTML).join("")}</div>`);
  addScene(b,"aile",S.rel.aile>70?"Seninle gurur duyuyoruz! Yemek hazır.":S.rel.aile>40?"Bizi biraz ihmal ediyorsun gibi...":"Arada bir arasan ne olur?",{bubbleLeft:false,mom:{L:{skin:S.look.skin,hatStyle:"uzun",hair:"#5a3418"},o:{adult:true,jersey:"#3fa28a",sleeves:true,mood:"mutlu"}},dad:{L:{skin:S.look.skin,hatStyle:"yok",hair:"#2a1a10"},o:{adult:true,jersey:"#5a6b8a",sleeves:true,mustache:true,mood:"mutlu"}}});
  const pay=()=>{if(travel){tx(`${S.home} uçuşu`,-travel);S.energy-=8}};
  bindActs({yemek:()=>{if(S.money<travel)return;useSlot();pay();S.rel.aile+=12;S.moral+=5;norm();save();resultView("Aile yemeği",`${S.npc.mom} en sevdiğin yemeği yapmış. ${S.npc.dad} maç istatistiklerini bir deftere yazıyormuş, sana gösterdi.`,[["+12 Aile","p"]])},
    baba:async()=>{if(S.money<travel)return;useSlot();pay();closeSheet();arenaFor(null);app.innerHTML=`<div style="padding-top:12px"><div class="eyebrow">Sokak potası · ${esc(S.home)}</div><h2>${esc(S.npc.dad)} ile birebir</h2></div><div id="stg"></div><div id="res"></div>`;
      const r=await mgShoot($("#stg"),{eff:clamp(eff("sut")+25,5,100),shots:3,title:"İlk 3 isabet kazanır",def:false});const win=r.made>=2;S.rel.aile+=6;const k=pick(STATS)[0];S.st[k]+=1;norm();save();
      $("#stg").innerHTML="";$("#res").innerHTML=`<div class="card"><h2>${win?"Kazandın":"Baban kazandı"}</h2><p>${win?`${S.npc.dad} "Bugün dizim ağrıyordu" dedi.`:`${S.npc.dad} bütün mahalleye anlatacak.`} ${statName(k)} +1, Aile +6.</p><button class="btn pri" id="bk">Haritaya dön</button></div>`;$("#bk").onclick=renderMain},
    para:()=>{if(S.money<gift)return;tx("Aileye destek",-gift);S.rel.aile+=15;S.moral+=4;norm();save();resultView("Gönderildi",`${S.npc.mom} sesli mesajla teşekkür etti. Arkadan ${S.npc.dad} "Gerek yoktu!" diye bağırıyordu.`,[["+15 Aile","p"]])},
    tel:()=>{S.buffs.called=S.week;S.rel.aile+=4;norm();save();resultView("Görüntülü arama",`${S.npc.mom} kamerayı tavana tuttu, ${S.npc.dad} sadece alnını gösterdi. Yine de güzeldi.`,[["+4 Aile","p"]])}});
}

/* --- Kafe --- */
function locKafe(I){
  const f=S.npc.friend,dp=Math.round(12*(1+ORDER.indexOf(S.stage)));
  const b=sheet(I.n,`${f} seni bekliyor`,`<div class="pgrid">${[
     {id:"sohbet",ic:icon("coffee"),t:"Kahve ve sohbet",d:`${f} ile dertleşmek.`,slot:1,price:3,fx:[["+8 Moral","p"],["+8 Arkadaş","p"]],btn:fmt(3)},
     {id:"izle",ic:icon("tv"),t:"NBA maçı izle",d:"Oyun okumayı öğren.",slot:1,price:5,fx:[["+5 Moral","p"],["Pas +1 şansı","p"]],btn:fmt(5)},
     {id:"oyun",ic:icon("pad"),t:"Oyun gecesi",d:"Konsol turnuvası, gece yarısına kadar.",slot:1,fx:[["+12 Moral","p"],["−8 Enerji","n"]],btn:"Katıl"},
     S.partner?{id:"randevu",ic:icon("heart"),t:`${S.partner} ile buluş`,d:"Köşedeki masa sizin.",slot:1,price:dp,fx:[["+12 Partner","p"]],btn:fmt(dp)}:{id:"flort",ic:icon("heart"),t:"Biriyle tanış",d:`${f} bir arkadaşını getirdi.`,slot:1,fx:[["Partner şansı","t"]],btn:"Tanış"},
   ].map(prodHTML).join("")}</div>`);
  addScene(b,"kafe","Ne alırsın? Bugün kek tazelendi.",{friend:{L:{skin:SKINS[hash(f)%4],hatStyle:"bere",hat:"#2d8a3e",pom:"#f4c534"},o:{jersey:"#e2741f",sleeves:true,gloves:"#2d8a3e",mood:"mutlu"}}});
  bindActs({sohbet:()=>{if(S.money<3)return;useSlot();tx("Kafe",-3);S.moral+=8;S.rel.ark+=8;norm();save();resultView("Sohbet",pick([`${f} yeni bir YouTube kanalı açtığını söyledi. Bu dördüncüsü.`,`${f} ile okul, aşk, gelecek, her şeyi konuştunuz. İyi geldi.`,`${f} seninle gurur duyduğunu söyledi, sonra hemen konuyu değiştirdi.`]),[["+8 Moral","p"]])},
    izle:()=>{if(S.money<5)return;useSlot();tx("Kafe",-5);S.moral+=5;let t="Son saniye üçlüğünde ikiniz de masaya çıktınız.";if(Math.random()<.5){S.st.pas+=1;t+=" Pas açılarını izlemek sana bir şey kattı. Pas +1."}norm();save();resultView("Maç gecesi",t,[["+5 Moral","p"]])},
    oyun:()=>{useSlot();S.moral+=12;S.energy-=8;S.rel.ark+=5;norm();save();resultView("Oyun gecesi",`${f} kaybedince kumandayı fırlattı. Eve gece ikide döndün.`,[["+12 Moral","p"],["−8 Enerji","n"]])},
    flort:()=>{useSlot();if(Math.random()<.3+fame()/250+S.moral/400){S.partner=pick(cOf(S.city).fem);S.rel.partner=50;S.moral+=10;news(`${fullName()} ile ${S.partner} birlikte görüntülendi.`);norm();save();resultView("Kıvılcım",`${S.partner} ile saatlerce konuştunuz. Artık bir partnerin var.`,[["+10 Moral","p"]])}else{S.moral-=4;norm();save();resultView("Olmadı","Sohbet bir türlü açılmadı. Hava durumundan bahsettin. İki kere.",[["−4 Moral","n"]])}},
    randevu:()=>{if(S.money<dp)return;useSlot();tx("Randevu",-dp);S.rel.partner+=12;S.moral+=6;norm();save();resultView("Randevu",`${S.partner} ile güzel bir akşam. Telefona bir kez bile bakmadın.`,[["+12 Partner","p"]])}});
}

