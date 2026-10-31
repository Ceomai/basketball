"use strict";
/* ================= YENİ İKONLAR ================= */
Object.assign(ICON,{
 banana:()=>sv(`<path d="M12 18 C14 40 30 54 52 50 C56 49 56 45 52 45 C36 46 24 36 20 18Z" fill="#ffd54f" ${ST}/><path d="M12 18 L10 12 L16 14Z" fill="#6d4c41" ${ST}/><path d="M22 26 C26 38 34 44 46 46" stroke="#f9a825" stroke-width="2" fill="none"/>`),
 water:()=>sv(`<rect x="22" y="14" width="20" height="44" rx="6" fill="#b3e5fc" ${ST}/><rect x="25" y="6" width="14" height="9" rx="2" fill="#1e88e5" ${ST}/><rect x="22" y="28" width="20" height="12" fill="#29b6f6" ${ST}/><path d="M26 18 V54" stroke="#fff" stroke-width="2.5" opacity=".6"/>`),
 oats:()=>sv(`<path d="M8 30 H56 C56 46 46 56 32 56 C18 56 8 46 8 30Z" fill="#fafafa" ${ST}/><ellipse cx="32" cy="30" rx="24" ry="6" fill="#d7b98a" ${ST}/>${[[22,29],[30,27],[38,30],[44,28]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="#5e35b1"/>`).join("")}<circle cx="27" cy="31" r="3" fill="#e53935"/>`),
 fruit:()=>sv(`<path d="M8 34 H56 L50 56 H14Z" fill="#a1887f" ${ST}/><circle cx="22" cy="28" r="9" fill="#e53935" ${ST}/><circle cx="40" cy="28" r="9" fill="#ff9800" ${ST}/><circle cx="31" cy="20" r="8" fill="#7cb342" ${ST}/><path d="M14 42 H50 M16 48 H48" stroke="#6d4c41" stroke-width="1.5"/>`),
 choco:()=>sv(`<rect x="14" y="8" width="36" height="48" rx="3" fill="#5d4037" ${ST}/><path d="M14 22 H50 M14 36 H50 M32 8 V56" stroke="#3e2723" stroke-width="2"/><path d="M14 40 L50 30 V56 H14Z" fill="#c62828" ${ST}/><text x="32" y="50" font-family="Barlow Condensed" font-weight="800" font-size="10" text-anchor="middle" fill="#fff">ÇİKO</text>`),
 sandwich:()=>sv(`<path d="M6 30 L32 14 L58 30Z" fill="#e0b56b" ${ST}/><path d="M6 32 H58 L56 36 H8Z" fill="#7cb342" ${ST}/><rect x="8" y="36" width="48" height="6" fill="#e57373" ${ST}/><rect x="8" y="42" width="48" height="5" fill="#ffd54f" ${ST}/><path d="M6 48 H58 L54 54 H10Z" fill="#e0b56b" ${ST}/>`),
 nuts:()=>sv(`<path d="M10 24 H54 L48 56 H16Z" fill="#8d6e63" ${ST}/>${[[20,22],[30,18],[40,21],[26,26],[36,26],[46,25]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="${i%2?"#d7a86e":"#a1663b"}" ${ST}/>`).join("")}<rect x="20" y="34" width="24" height="10" rx="2" fill="#fff" opacity=".7"/>`),
 gel:()=>sv(`<path d="M20 6 H44 V44 L32 58 L20 44Z" fill="#ff7043" ${ST}/><rect x="24" y="16" width="16" height="20" rx="2" fill="#fff" ${ST}/><path d="M34 19 L28 27 H32 L30 33 L36 25 H32Z" fill="#ff7043"/>`),
 ice:()=>sv(`<path d="M10 20 C10 12 54 12 54 20 L50 54 H14Z" fill="#e1f5fe" ${ST}/>${[[22,30],[36,28],[28,42],[42,42]].map(([x,y])=>`<rect x="${x-6}" y="${y-6}" width="12" height="12" rx="2" fill="#81d4fa" ${ST}/>`).join("")}<path d="M18 14 Q32 6 46 14" fill="none" ${ST}/>`),
 wrist:()=>sv(`<ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="#141414" stroke-width="12"/><ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="#e53935" stroke-width="9"/><path d="M14 28 Q32 22 50 28" stroke="#fff" stroke-width="2.5" fill="none"/>`),
 knee:()=>sv(`<path d="M18 6 H46 V58 H18Z" fill="#212121" ${ST}/><ellipse cx="32" cy="32" rx="12" ry="10" fill="#37474f" ${ST}/><path d="M18 14 H46 M18 50 H46" stroke="#e53935" stroke-width="3"/>`),
 weights:()=>sv(`<rect x="6" y="40" width="52" height="8" rx="2" fill="#5d4037" ${ST}/><circle cx="18" cy="30" r="10" fill="#37474f" ${ST}/><circle cx="46" cy="30" r="10" fill="#37474f" ${ST}/><circle cx="18" cy="30" r="3" fill="#b0bec5"/><circle cx="46" cy="30" r="3" fill="#b0bec5"/><rect x="8" y="48" width="4" height="8" fill="#5d4037"/><rect x="52" y="48" width="4" height="8" fill="#5d4037"/>`),
 tshirt:(c="#c8102e")=>sv(`<path d="M20 8 L12 12 L4 24 L12 30 L16 26 V56 H48 V26 L52 30 L60 24 L52 12 L44 8 C40 14 24 14 20 8Z" fill="${c}" ${ST}/><text x="32" y="44" font-family="Barlow Condensed" font-weight="800" font-size="16" text-anchor="middle" fill="#fff" stroke="#141414" stroke-width=".8">23</text>`),
 tablet:()=>sv(`<rect x="8" y="10" width="48" height="44" rx="5" fill="#263238" ${ST}/><rect x="12" y="14" width="40" height="36" fill="#d79a5c"/><path d="M32 14 V50 M12 32 H52" stroke="#fff" stroke-width="1.2"/><path d="M18 40 Q28 22 44 24" stroke="#ffd54f" stroke-width="2" fill="none" stroke-dasharray="3 2"/><circle cx="44" cy="24" r="3" fill="#e53935"/>`),
 laptop:()=>sv(`<rect x="12" y="12" width="40" height="28" rx="2" fill="#37474f" ${ST}/><rect x="15" y="15" width="34" height="22" fill="#4fc3f7"/><path d="M4 44 H60 L56 50 H8Z" fill="#b0bec5" ${ST}/><path d="M19 30 H30 M19 25 H40 M19 20 H34" stroke="#fff" stroke-width="2"/>`),
 swatch:()=>sv(`<rect x="24" y="2" width="16" height="16" rx="3" fill="#212121" ${ST}/><rect x="24" y="46" width="16" height="16" rx="3" fill="#212121" ${ST}/><rect x="16" y="16" width="32" height="32" rx="8" fill="#141414" ${ST}/><path d="M22 34 H27 L30 26 L34 40 L37 32 H42" stroke="#36d38e" stroke-width="2.5" fill="none"/>`),
 vr:()=>sv(`<rect x="6" y="20" width="52" height="24" rx="10" fill="#eceff1" ${ST}/><rect x="12" y="25" width="18" height="14" rx="5" fill="#263238"/><rect x="34" y="25" width="18" height="14" rx="5" fill="#263238"/><path d="M6 30 H2 M58 30 H62" ${ST}/><circle cx="20" cy="31" r="2" fill="#4fc3f7"/><circle cx="42" cy="31" r="2" fill="#4fc3f7"/>`),
 jacket:()=>sv(`<path d="M22 6 L32 14 L42 6 L56 14 L60 56 H44 V30 H20 V56 H4 L8 14Z" fill="#3e2723" ${ST}/><path d="M32 14 V56" ${ST}/><path d="M22 6 L28 24 L32 14 L36 24 L42 6" fill="#5d4037" ${ST}/><circle cx="36" cy="34" r="1.5" fill="#d8b25a"/><circle cx="36" cy="42" r="1.5" fill="#d8b25a"/>`),
 glasses:()=>sv(`<path d="M4 24 H60" ${ST}/><path d="M6 24 H28 C28 36 24 40 16 40 C8 40 6 34 6 24Z" fill="#141414" ${ST}/><path d="M36 24 H58 C58 34 56 40 48 40 C40 40 36 36 36 24Z" fill="#141414" ${ST}/><path d="M10 28 L16 34 M40 28 L46 34" stroke="#fff" stroke-width="2" opacity=".6"/>`),
 chain:()=>sv(`<path d="M10 8 C10 40 54 40 54 8" fill="none" stroke="#141414" stroke-width="7"/><path d="M10 8 C10 40 54 40 54 8" fill="none" stroke="#d8b25a" stroke-width="4" stroke-dasharray="4 2"/><circle cx="32" cy="44" r="12" fill="#d8b25a" ${ST}/><circle cx="32" cy="44" r="8" fill="#ee7a2c" ${ST}/>`),
 perfume:()=>sv(`<rect x="14" y="22" width="36" height="34" rx="6" fill="#ce93d8" ${ST}/><rect x="26" y="12" width="12" height="11" fill="#d8b25a" ${ST}/><rect x="22" y="6" width="20" height="7" rx="2" fill="#141414" ${ST}/><rect x="20" y="32" width="24" height="12" rx="2" fill="#fff" opacity=".7"/>`),
 scooter:()=>sv(`<circle cx="14" cy="48" r="7" fill="#212121" ${ST}/><circle cx="50" cy="48" r="7" fill="#212121" ${ST}/><path d="M14 48 H44 L50 48 M44 48 L40 12 H48" stroke="#141414" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 46 H44" stroke="#26a69a" stroke-width="5"/>`),
 moto:()=>sv(`<circle cx="14" cy="46" r="9" fill="#212121" ${ST}/><circle cx="50" cy="46" r="9" fill="#212121" ${ST}/><path d="M14 46 L26 30 H40 L50 46" fill="none" ${ST}/><path d="M22 30 C24 22 40 20 44 28 L40 34 H26Z" fill="#141414" ${ST}/><path d="M28 24 C32 20 38 20 40 24 L36 30 H28Z" fill="#e53935" ${ST}/><path d="M44 28 L50 18" ${ST}/>`),
 sofa:()=>sv(`<rect x="10" y="18" width="44" height="20" rx="6" fill="#5c6bc0" ${ST}/><rect x="4" y="28" width="12" height="20" rx="4" fill="#3f51b5" ${ST}/><rect x="48" y="28" width="12" height="20" rx="4" fill="#3f51b5" ${ST}/><rect x="14" y="34" width="36" height="14" rx="3" fill="#7986cb" ${ST}/><path d="M10 48 V54 M54 48 V54" ${ST}/>`),
 chair:()=>sv(`<path d="M20 4 H44 L42 36 H22Z" fill="#e53935" ${ST}/><path d="M26 8 H38 L37 28 H27Z" fill="#141414"/><rect x="16" y="34" width="32" height="8" rx="3" fill="#212121" ${ST}/><path d="M32 42 V52 M20 56 L32 52 L44 56" ${ST}/>`),
 cinema:()=>sv(`<rect x="4" y="10" width="56" height="34" rx="3" fill="#212121" ${ST}/><rect x="8" y="14" width="48" height="26" fill="#1565c0"/><path d="M22 24 L34 30 L22 36Z" fill="#fff"/><rect x="6" y="48" width="10" height="12" fill="#424242" ${ST}/><rect x="48" y="48" width="10" height="12" fill="#424242" ${ST}/>`),
 tub:ICON.tub,
 robot:()=>sv(`<ellipse cx="32" cy="40" rx="26" ry="12" fill="#cfd8dc" ${ST}/><ellipse cx="32" cy="36" rx="26" ry="12" fill="#eceff1" ${ST}/><circle cx="32" cy="34" r="5" fill="#36d38e" ${ST}/><path d="M14 36 h6 M44 36 h6" stroke="#90a4ae" stroke-width="2"/>`),
 kryo:()=>sv(`<path d="M6 26 H58 L54 52 H10Z" fill="#eceff1" ${ST}/><path d="M10 30 H54 L52 40 H12Z" fill="#81d4fa"/>${[[20,32],[32,30],[44,33]].map(([x,y])=>`<rect x="${x-4}" y="${y-4}" width="8" height="8" rx="1" fill="#e1f5fe" ${ST}/>`).join("")}<path d="M48 26 V14 H40" ${ST}/>`),
 bowling:()=>sv(`<path d="M40 6 C46 6 46 16 44 20 C50 28 50 50 44 58 H36 C30 50 30 28 36 20 C34 16 34 6 40 6Z" fill="#fff" ${ST}/><path d="M35 22 H45 M34 26 H46" stroke="#e53935" stroke-width="2.5"/><circle cx="20" cy="44" r="14" fill="#3949ab" ${ST}/><circle cx="16" cy="40" r="2" fill="#141414"/><circle cx="22" cy="38" r="2" fill="#141414"/><circle cx="20" cy="44" r="2" fill="#141414"/>`),
 puck:()=>sv(`<ellipse cx="32" cy="40" rx="26" ry="14" fill="#1b5e20" ${ST}/><circle cx="20" cy="38" r="9" fill="#e53935" ${ST}/><circle cx="20" cy="38" r="4" fill="#b71c1c"/><circle cx="42" cy="40" r="5" fill="#141414"/><path d="M6 40 H58" stroke="#fff" stroke-width="1" opacity=".5"/>`),
 note:()=>sv(`<path d="M24 46 V12 L52 6 V40" fill="none" stroke="#141414" stroke-width="4"/><ellipse cx="18" cy="46" rx="8" ry="6" fill="#ff3fa4" ${ST}/><ellipse cx="46" cy="40" rx="8" ry="6" fill="#29b6f6" ${ST}/><path d="M24 18 L52 12" stroke="#141414" stroke-width="4"/>`),
 karaoke:()=>sv(`<circle cx="22" cy="20" r="12" fill="#b0bec5" ${ST}/><path d="M14 14 L30 26" stroke="#78909c" stroke-width="2"/><path d="M30 28 L50 54" stroke="#141414" stroke-width="7" stroke-linecap="round"/><path d="M30 28 L50 54" stroke="#ff3fa4" stroke-width="4" stroke-linecap="round"/><path d="M44 10 l4 4 M50 18 l6 0 M40 6 l0 -4" stroke="#ffd54f" stroke-width="2.5" stroke-linecap="round"/>`),
});

/* ================= EŞYA ETKİLERİ ================= */
// en: haftalık enerji, mo: haftalık moral, up: haftalık masraf
const itemWeekly=k=>SHOP.reduce((a,it)=>a+(S.items[it.id]&&it[k]?it[k]:0),0);
const carUpkeep=()=>itemWeekly("up");

/* ================= AVM: MAĞAZALAR ================= */
const STORES=[
 {id:"sneaker",n:"Sneaker Lab",wall:"#20242c",acc:"#ff6a2b",disp:"shoes",say:"Yeni sezon modelleri geldi. Numaran kaç?",seller:{skin:SKINS[3],hatStyle:"kep",hat:"#ff6a2b"},kit:{jersey:"#141414",sleeves:true,mood:"mutlu"}},
 {id:"spor",n:"Pro Spor",wall:"#123a2a",acc:"#36d38e",disp:"sport",say:"Profesyoneller buradan alışveriş yapar.",seller:{skin:SKINS[1],hatStyle:"band",hat:"#36d38e",hair:"#111"},kit:{jersey:"#1b5e20",sleeves:true,mood:"mutlu",whistle:true}},
 {id:"tekno",n:"Tekno Merkez",wall:"#141b2e",acc:"#58a6ff",disp:"tech",say:"Hepsinin garantisi iki yıl. Kutusunu atma.",seller:{skin:SKINS[0],hatStyle:"yok",hair:"#e2c15a"},kit:{jersey:"#1e3a8a",sleeves:true,glasses:true,mood:"mutlu"}},
 {id:"moda",n:"Moda Butik",wall:"#2a1f26",acc:"#d8b25a",disp:"fashion",say:"Bu ceket tam sana göre. Fotoğrafçılar bayılacak.",seller:{skin:SKINS[2],hatStyle:"uzun",hair:"#111"},kit:{adult:true,jersey:"#141414",sleeves:true,tie:"#d8b25a",mood:"mutlu"}},
 {id:"galeri",n:"Oto Galeri",wall:"#1a1f26",acc:"#ff5468",disp:"cars",say:"Test sürüşü ücretsiz. Kaza yapmazsan.",seller:{skin:SKINS[1],hatStyle:"yok",hair:"#333"},kit:{adult:true,jersey:"#37474f",sleeves:true,tie:"#ff5468",mustache:true,mood:"mutlu"}},
 {id:"yatirim",n:"Yatırım & Miras",wall:"#1b2330",acc:"#d8b25a",disp:"invest",say:"Paranı çalıştır. Basketbol bir gün biter, mülk kalır.",seller:{skin:SKINS[1],hatStyle:"yok",hair:"#9e9e9e"},kit:{adult:true,jersey:"#22304a",sleeves:true,tie:"#d8b25a",glasses:true,mood:"mutlu"}},
 {id:"ev",n:"Ev & Yaşam",wall:"#2b2620",acc:"#ffc54d",disp:"home",say:"İyi uyuyan iyi oynar. Bilimsel gerçek.",seller:{skin:SKINS[4],hatStyle:"bere",hat:"#ffc54d",pom:"#fff"},kit:{jersey:"#6d4c41",sleeves:true,apron:"#ffc54d",mood:"mutlu"}},
];
const SHOP=[
 {id:"ayak1",st:"sneaker",n:"Antrenman ayakkabısı",d:"+2 Çeviklik",p:60,ic:()=>icon("sneaker","#cfd8dc","#1e88e5"),fx:()=>S.st.hiz+=2},
 {id:"ayak2",st:"sneaker",n:"İmza serisi ayakkabı",d:"+3 Çeviklik, +1 Şut",p:260,ic:()=>icon("sneaker",S.team.c1,"#141414"),fx:()=>{S.st.hiz+=3;S.st.sut+=1}},
 {id:"ayak3",st:"sneaker",n:"Retro koleksiyon",d:"+1 Çeviklik, +6 Taraftar",p:900,ic:()=>icon("sneaker","#fafafa","#c8102e"),fx:()=>{S.st.hiz+=1;S.rel.taraf+=6}},
 {id:"ayak4",st:"sneaker",n:"Altın sınırlı seri",d:"+2 Çeviklik, +12 Taraftar",p:6000,ic:()=>icon("sneaker","#d8b25a","#141414"),fx:()=>{S.st.hiz+=2;S.rel.taraf+=12}},
 {id:"top",st:"spor",n:"Maç topu",d:"+2 Şut",p:140,ic:()=>icon("ball"),fx:()=>S.st.sut+=2},
 {id:"bileklik",st:"spor",n:"Şutör bilekliği",d:"+1 Şut",p:40,ic:()=>icon("wrist"),fx:()=>S.st.sut+=1},
 {id:"dizlik",st:"spor",n:"Profesyonel dizlik",d:"+2 Savunma",p:90,ic:()=>icon("knee"),fx:()=>S.st.sav+=2},
 {id:"agirlik",st:"spor",n:"Ev ağırlık seti",d:"+2 Güç",p:400,ic:()=>icon("weights"),fx:()=>S.st.guc+=2},
 {id:"forma",st:"spor",n:"Takım forması",d:"+4 Taraftar",p:120,ic:()=>icon("tshirt",S.team.c1),fx:()=>S.rel.taraf+=4},
 {id:"kulaklik",st:"spor",n:"Stüdyo kulaklık",d:"+8 Moral",p:180,ic:()=>icon("headphones"),fx:()=>S.moral+=8},
 {id:"telefon",st:"tekno",n:"Yeni nesil telefon",d:"Paylaşım etkisi ×1,5",p:380,ic:()=>icon("phone")},
 {id:"konsol",st:"tekno",n:"Oyun konsolu",d:"+15 Moral",p:220,ic:()=>icon("console"),fx:()=>S.moral+=15},
 {id:"tablet",st:"tekno",n:"Maç analizi tableti",d:"+2 Pas",p:300,ic:()=>icon("tablet"),fx:()=>S.st.pas+=2},
 {id:"laptop",st:"tekno",n:"Dizüstü bilgisayar",d:"+8 Akademik",p:700,ic:()=>icon("laptop"),fx:()=>S.aka+=8},
 {id:"swatch",st:"tekno",n:"Akıllı saat",d:"Uyku takibi: +3 enerji/hafta",p:250,en:3,ic:()=>icon("swatch")},
 {id:"vr",st:"tekno",n:"VR seti",d:"+10 Moral, +1 Çeviklik",p:900,ic:()=>icon("vr"),fx:()=>{S.moral+=10;S.st.hiz+=1}},
 {id:"kiyafet",st:"moda",n:"Sokak giyimi seti",d:"+6 Taraftar, +5 Moral",p:420,ic:()=>icon("hoodie","#37474f"),fx:()=>{S.rel.taraf+=6;S.moral+=5}},
 {id:"gozluk",st:"moda",n:"Güneş gözlüğü",d:"+4 Taraftar",p:300,ic:()=>icon("glasses"),fx:()=>S.rel.taraf+=4},
 {id:"parfum",st:"moda",n:"İmza parfüm",d:"+6 Moral, +5 Partner",p:250,ic:()=>icon("perfume"),fx:()=>{S.moral+=6;S.rel.partner+=5}},
 {id:"ceket",st:"moda",n:"Deri ceket",d:"+8 Taraftar",p:1200,ic:()=>icon("jacket"),fx:()=>S.rel.taraf+=8},
 {id:"zincir",st:"moda",n:"Altın zincir",d:"+10 Taraftar, −3 Koç",p:3000,ic:()=>icon("chain"),fx:()=>{S.rel.taraf+=10;S.rel.koc-=3}},
 {id:"saat",st:"moda",n:"İsviçre saati",d:"+10 Taraftar",p:4500,ic:()=>icon("watch"),fx:()=>S.rel.taraf+=10},
 {id:"scooter",st:"galeri",n:"Elektrikli scooter",d:"+2 enerji/hafta",p:900,en:2,up:3,ic:()=>icon("scooter")},
 {id:"araba1",st:"galeri",n:"Hatchback",d:"+4 enerji/hafta",p:5200,en:4,up:15,ic:()=>icon("car","#1e88e5","hatch")},
 {id:"moto",st:"galeri",n:"Motosiklet",d:"+5 enerji/hafta, +6 Taraftar",p:14000,en:5,up:30,ic:()=>icon("moto"),fx:()=>S.rel.taraf+=6},
 {id:"araba2",st:"galeri",n:"Elektrikli SUV",d:"+7 enerji/hafta, +8 Taraftar",p:42000,en:7,up:60,ic:()=>icon("car","#eceff1","suv"),fx:()=>S.rel.taraf+=8},
 {id:"araba3",st:"galeri",n:"İtalyan süper otomobil",d:"+10 enerji/hafta, +15 Taraftar",p:260000,en:10,up:240,ic:()=>icon("car","#d0142c","super"),fx:()=>{S.rel.taraf+=15;S.moral+=12}},
 {id:"yatak",st:"ev",n:"Ortopedik yatak",d:"+4 enerji/hafta",p:300,en:4,ic:()=>icon("bed")},
 {id:"koltuk",st:"ev",n:"Rahat koltuk takımı",d:"+1 moral/hafta",p:500,mo:1,ic:()=>icon("sofa")},
 {id:"oyunkoltugu",st:"ev",n:"Oyuncu koltuğu",d:"+5 Moral",p:350,ic:()=>icon("chair"),fx:()=>S.moral+=5},
 {id:"robot",st:"ev",n:"Robot süpürge",d:"+3 Moral, ev hep temiz",p:400,ic:()=>icon("robot"),fx:()=>S.moral+=3},
 {id:"sinema",st:"ev",n:"Ev sineması",d:"+2 moral/hafta",p:1500,mo:2,ic:()=>icon("cinema")},
 {id:"fizyo",st:"ev",n:"Kişisel fizyoterapist",d:"Sakatlık riski belirgin azalır",p:9000,ic:()=>icon("whistle")},
 {id:"kryo",st:"ev",n:"Buz banyosu küveti",d:"+5 enerji/hafta",p:2500,en:5,ic:()=>icon("kryo")},

 {id:"kiradaire",st:"yatirim",n:"Kiralık daire yatırımı",d:"Her hafta kira geliri",p:60000,inc:150,ic:()=>icon("house","#90a4ae")},
 {id:"dukkan",st:"yatirim",n:"Dükkân yatırımı",d:"Her hafta kira geliri",p:250000,inc:650,ic:()=>icon("house","#c96f4a")},
 {id:"plaza",st:"yatirim",n:"Plazada ofis katı",d:"Her hafta kira geliri",p:1200000,inc:3200,ic:()=>icon("house","#3f5f8a")},
 {id:"salon",st:"yatirim",n:"Memlekete spor salonu",d:"İstanbul'daki mahallene bağış. +20 Aile, +15 Taraftar, efsane puanı",p:900000,ic:()=>icon("hoop"),fx:()=>{S.rel.aile+=20;S.rel.taraf+=15;S.followers*=1.1;news(`${fullName()} memleketine spor salonu yaptırdı.`)}},
 {id:"yat",st:"yatirim",n:"Yat",d:"+3 moral/hafta, +15 Taraftar",p:1500000,mo:3,up:2500,ic:()=>icon("car","#eceff1","suv"),fx:()=>S.rel.taraf+=15},
 {id:"akademi",st:"yatirim",n:"Basketbol akademisi",d:"Gençlere kendi akademin. Takipçi ve büyük efsane puanı",p:4000000,ic:()=>icon("trophyRoom"),fx:()=>{S.followers*=1.2;S.career.trophies.push({type:"award",label:`${seasonLabel()} · ${S.last} Basketbol Akademisi kurucusu`});news(`${fullName()} kendi basketbol akademisini kurdu.`)}},
 {id:"jet",st:"yatirim",n:"Özel jet",d:"+8 enerji/hafta, +20 Taraftar",p:7000000,en:8,up:9000,ic:()=>icon("car","#ffffff","super"),fx:()=>S.rel.taraf+=20},
];
function locAvm(I,store="sneaker"){
  const S0=STORES.find(s=>s.id===store);
  const b=sheet(I.n,`${S0.n} · bakiye ${fmt(S.money)}`,`${tabsHTML(STORES.map(s=>[s.id,s.n]),store,"s")}<div id="avc" style="display:flex;flex-direction:column;gap:10px"></div>`);
  $$(".tabs button").forEach(x=>x.onclick=()=>locAvm(I,x.dataset.s));
  const c=$("#avc");c.appendChild(sceneEl("store",S0.say,{store:S0}));
  const items=SHOP.filter(it=>it.st===store);
  c.insertAdjacentHTML("beforeend",`<div class="pgrid">${items.map(it=>prodHTML({id:it.id,ic:it.ic(),t:it.n,d:it.d+(it.up?` · masraf ${fmt(it.up)}/hafta`:""),price:it.p,own:!!S.items[it.id]})).join("")}</div><p class="small muted">Aldığın her eşya evindeki vitrinde sergilenir.</p>`);
  const m={};items.forEach(it=>m[it.id]=()=>{if(S.money<it.p||S.items[it.id])return;tx(it.n,-it.p);S.items[it.id]=1;it.fx&&it.fx();norm();save();toast(`${it.n} alındı. Vitrine eklendi.`);locAvm(I,store)});bindActs(m);
}
function drawStoreScene(c,o){
  const s=o.store,W=360;c.lineJoin="round";c.strokeStyle=INK;c.lineWidth=2;
  let g=c.createLinearGradient(0,0,0,150);g.addColorStop(0,shade(s.wall,20));g.addColorStop(1,s.wall);c.fillStyle=g;c.fillRect(0,0,W,150);
  c.fillStyle=shade(s.wall,-15);c.fillRect(0,150,W,40);c.fillStyle="rgba(255,255,255,.05)";for(let x=0;x<W;x+=40)c.fillRect(x,150,20,40);
  c.save();c.fillStyle=s.acc;c.font='800 18px "Barlow Condensed"';c.textAlign="left";c.fillText(s.n.toLocaleUpperCase("tr-TR"),16,26);c.restore();
  c.fillStyle=s.acc;c.fillRect(16,32,90,3);
  const shelf=(y)=>{rr(c,12,y,196,5,1,shade(s.wall,-35))};
  const D=s.disp;
  if(D==="shoes"){[62,102,142].forEach((y,r)=>{shelf(y);for(let k=0;k<5;k++){const col=["#e53935","#fafafa","#1e88e5","#d8b25a","#36d38e"][(k+r)%5];c.save();c.translate(20+k*38,y-18);c.beginPath();c.moveTo(0,16);c.quadraticCurveTo(0,8,8,7);c.lineTo(14,2);c.lineTo(26,10);c.lineTo(30,16);c.closePath();c.fillStyle=col;c.fill();c.stroke();c.restore()}})}
  if(D==="sport"){[70,120].forEach(y=>shelf(y));for(let k=0;k<5;k++){drawBall(c,26+k*38,58,10,k)}for(let k=0;k<4;k++){rr(c,20+k*46,84,34,34,4,["#c8102e","#1d428a","#00875a","#f0b323"][k]);c.fillStyle="#fff";c.font='800 14px "Barlow Condensed"';c.textAlign="center";c.fillText(String(7+k*4),37+k*46,107)}c.textAlign="left"}
  if(D==="tech"){for(let k=0;k<3;k++){rr(c,16+k*64,48,56,40,3,"#0b1220");c.fillStyle=["#1565c0","#36d38e","#ff3fa4"][k];c.fillRect(20+k*64,52,48,32)}shelf(100);for(let k=0;k<5;k++){rr(c,20+k*38,104,20,34,4,"#212121");c.fillStyle="#4fc3f7";c.fillRect(23+k*38,108,14,24)}}
  if(D==="fashion"){c.beginPath();c.moveTo(14,50);c.lineTo(206,50);c.stroke();for(let k=0;k<6;k++){const col=["#3e2723","#141414","#c8102e","#37474f","#d8b25a","#5b2a86"][k];c.beginPath();c.moveTo(24+k*30,50);c.lineTo(24+k*30,58);c.stroke();c.beginPath();c.moveTo(14+k*30,58);c.lineTo(34+k*30,58);c.lineTo(36+k*30,104);c.lineTo(12+k*30,104);c.closePath();c.fillStyle=col;c.fill();c.stroke()}rr(c,20,116,180,20,3,"#1a1416");for(let k=0;k<5;k++){ell(c,40+k*34,126,8,5,"#d8b25a")}}
  if(D==="cars"){rr(c,12,44,200,96,6,"#0b0f16");c.fillStyle="rgba(255,255,255,.06)";c.fillRect(12,44,200,40);c.save();c.translate(112,118);c.scale(1.4,1.4);c.beginPath();c.moveTo(-60,0);c.quadraticCurveTo(-58,-10,-44,-12);c.lineTo(-24,-26);c.quadraticCurveTo(4,-32,24,-20);c.lineTo(52,-14);c.quadraticCurveTo(62,-10,60,0);c.closePath();c.fillStyle="#d0142c";c.fill();c.stroke();ell(c,-34,2,10,10,"#212121");ell(c,36,2,10,10,"#212121");c.restore()}
  if(D==="home"){rr(c,16,90,120,40,10,"#5c6bc0");rr(c,10,100,20,36,6,"#3f51b5");rr(c,126,100,20,36,6,"#3f51b5");rr(c,150,48,60,40,3,"#212121");c.fillStyle="#1565c0";c.fillRect(154,52,52,32);rr(c,30,40,50,36,2,"#5d4037");c.fillStyle="#90caf9";c.fillRect(34,44,42,28)}
  drawKid(c,282,176,.95,s.seller,s.kit);
  rr(c,224,126,128,32,4,shade(s.wall,30));c.fillStyle=s.acc;c.fillRect(224,126,128,4);
};

/* ================= MARKET ================= */
const MARKET=[
 {id:"enerji",cat:"İçecekler",n:"Enerji içeceği",d:"+15 Enerji",p:3,ic:()=>icon("can"),fx:()=>{S.energy+=15}},
 {id:"izotonik",cat:"İçecekler",n:"İzotonik içecek",d:"+6 Enerji, +2 Moral",p:4,ic:()=>icon("can","#43a047"),fx:()=>{S.energy+=6;S.moral+=2}},
 {id:"su",cat:"İçecekler",n:"Maden suyu",d:"+3 Enerji",p:1,ic:()=>icon("water"),fx:()=>{S.energy+=3}},
 {id:"kahve",cat:"İçecekler",n:"Soğuk kahve",d:"+7 Enerji",p:3,ic:()=>icon("coffee"),fx:()=>{S.energy+=7}},
 {id:"muz",cat:"Atıştırmalık",n:"Muz",d:"+4 Enerji",p:1,ic:()=>icon("banana"),fx:()=>{S.energy+=4}},
 {id:"kuruyemis",cat:"Atıştırmalık",n:"Kuruyemiş",d:"+4 Enerji, +1 Moral",p:3,ic:()=>icon("nuts"),fx:()=>{S.energy+=4;S.moral+=1}},
 {id:"cikolata",cat:"Atıştırmalık",n:"Çikolata",d:"+5 Moral, −1 Enerji",p:2,ic:()=>icon("choco"),fx:()=>{S.moral+=5;S.energy-=1}},
 {id:"sandvic",cat:"Atıştırmalık",n:"Tavuklu sandviç",d:"+6 Enerji",p:4,ic:()=>icon("sandwich"),fx:()=>{S.energy+=6}},
 {id:"pizza",cat:"Atıştırmalık",n:"Aile boyu pizza",d:"+8 Moral, −4 Enerji",p:9,ic:()=>icon("pizza"),fx:()=>{S.moral+=8;S.energy-=4}},
 {id:"protein",cat:"Sporcu gıdası",n:"Protein tozu",d:"Sonraki 3 antrenmanda +1",p:35,ic:()=>icon("tub"),fx:()=>{S.buffs.train=3}},
 {id:"jel",cat:"Sporcu gıdası",n:"Enerji jeli",d:"+12 Enerji",p:6,ic:()=>icon("gel"),fx:()=>{S.energy+=12}},
 {id:"vitamin",cat:"Sporcu gıdası",n:"Vitamin ve elektrolit",d:"+10 Enerji",p:7,ic:()=>icon("bottle"),fx:()=>{S.energy+=10}},
 {id:"yulaf",cat:"Sporcu gıdası",n:"Yulaf ve meyve kasesi",d:"+6 Enerji, +2 Moral",p:5,ic:()=>icon("oats"),fx:()=>{S.energy+=6;S.moral+=2}},
 {id:"saglik",cat:"Haftalık",n:"Sağlıklı market alışverişi",d:"+8 Enerji, +4 Moral",p:12,ic:()=>icon("bag"),fx:()=>{S.energy+=8;S.moral+=4}},
 {id:"meyve",cat:"Haftalık",n:"Meyve sepeti",d:"+5 Enerji, +3 Moral",p:6,ic:()=>icon("fruit"),fx:()=>{S.energy+=5;S.moral+=3}},
 {id:"buz",cat:"Haftalık",n:"Buz torbası",d:"Kas ağrısına: +8 Enerji",p:5,ic:()=>icon("ice"),fx:()=>{S.energy+=8}},
];
function locMarket(I){
  const cats=[...new Set(MARKET.map(m=>m.cat))];
  const b=sheet(I.n,`Bakiye ${fmt(S.money)}`,cats.map(ct=>`<div class="eyebrow" style="margin-top:4px">${ct}</div><div class="pgrid">${MARKET.filter(m=>m.cat===ct).map(it=>prodHTML({id:it.id,ic:it.ic(),t:it.n,d:it.d,price:it.p})).join("")}</div>`).join("")+(S.buffs.train?`<p class="small good">Protein etkisi: ${S.buffs.train} antrenman kaldı.</p>`:""));
  addScene(b,"market",pick(["Taze geldi hepsi, buyur!","Sporcuya indirim var, kimseye söyleme.","Muzlar bugün sabah geldi."]));
  const m={};MARKET.forEach(it=>m[it.id]=()=>{if(S.money<it.p)return;tx(it.n,-it.p);it.fx();norm();save();toast(`${it.n} alındı · Enerji ${S.energy}, Moral ${S.moral}`);$("#shsub").textContent=`Bakiye ${fmt(S.money)}`;$$("[data-act]").forEach(x=>{const p=MARKET.find(q=>q.id===x.dataset.act);if(p)x.disabled=S.money<p.p})});bindActs(m);
}

/* ================= EĞLENCE MERKEZİ ================= */
const ARCADE=[
 {id:"hoop",n:"Pota makinesi",d:"30 saniyede kaç basket? Geriye çek, bırak.",ic:"hoop",rec:"arcade"},
 {id:"ref",n:"Refleks paneli",d:"20 saniye, yanan düğmeler.",ic:"joystick",rec:"reflex"},
 {id:"hockey",n:"Hava hokeyi",d:"Bilgisayara karşı, 5 gole kadar.",ic:"puck",rec:"hockey"},
 {id:"rhythm",n:"Dans ritmi",d:"Düşen notalara zamanında dokun.",ic:"note",rec:"rhythm"},
 {id:"bowling",n:"Bowling",d:"3 atış, nişan al ve gücü ayarla.",ic:"bowling",rec:"bowling"},
];
function venueCard(id,title,sub,kind,on){const w=document.createElement("button");w.className="venue"+(on?" on":"");w.dataset.v=id;const[cv,c]=hiCanvas(360,190);drawScene(c,kind,{});w.appendChild(cv);w.insertAdjacentHTML("beforeend",`<span class="vlab"><b>${title}</b><small>${sub}</small></span>`);return w}
function locEglence(I,tab="arcade"){
  S.rec=Object.assign({arcade:0,reflex:0,hockey:0,rhythm:0,bowling:0},S.rec);
  const b=sheet(I.n,"Nereye gidiyorsun?",`<div class="venues" id="vn"></div><div id="egc" style="display:flex;flex-direction:column;gap:10px"></div>`);
  const vn=$("#vn");vn.appendChild(venueCard("arcade","Arcade salonu",`${ARCADE.length} oyun · jeton ${fmt(1)}`,"arcade",tab==="arcade"));vn.appendChild(venueCard("kulup","Gece kulübü",S.age<18?"18 yaş ve üstü":"Parti, karaoke, VIP","club",tab==="kulup"));
  $$(".venue").forEach(x=>x.onclick=()=>locEglence(I,x.dataset.v));
  const c=$("#egc");
  if(tab==="arcade"){
    c.insertAdjacentHTML("beforeend",arcBoardCard());$("#brd").onclick=()=>boardSheet("arcade","w");
    c.insertAdjacentHTML("beforeend",`<div class="eyebrow">Arcade oyunları</div><div class="pgrid">${ARCADE.map(g=>prodHTML({id:g.id,ic:icon(g.ic),t:g.n,d:`${g.d} Rekor: ${S.rec[g.rec]}`,price:1,fx:[["+Moral","p"]],btn:"Oyna · "+fmt(1)})).join("")}</div>`);
    const m={};ARCADE.forEach(g=>m[g.id]=()=>arcadeRun(g.id));bindActs(m);
  }else{
    if(S.age<18){c.insertAdjacentHTML("beforeend",`<div class="say">Kapıdaki görevli kimliğine baktı: "18 yaş altı giremez." ${18-S.age} yıl sonra gel.</div>`);return}
    const ix=ORDER.indexOf(S.stage),pp=Math.round(15*(1+ix)),vp=Math.round(120*(1+ix*2)),kp=Math.round(8*(1+ix));
    c.insertAdjacentHTML("beforeend",`<div class="eyebrow">Gece kulübü</div><div class="pgrid">${[
      {id:"parti",ic:icon("disco"),t:"Parti",d:"Sabaha karşı eve dönüş.",slot:1,price:pp,fx:[["+16 Moral","p"],["−22 Enerji","n"],["Skandal riski","t"]],btn:fmt(pp)},
      {id:"karaoke",ic:icon("karaoke"),t:"Karaoke",d:"Sahneye çık, ritmi tuttur.",slot:1,price:kp,fx:[["+Moral","p"],["+Takipçi şansı","p"]],btn:fmt(kp)},
      {id:"vip",ic:icon("star"),t:"VIP masa",d:fame()<30?"Şöhret 30 olunca açılır.":"Fotoğraflar kesin çıkar.",slot:1,price:vp,fx:[["+%8 Takipçi","p"],["−4 Koç","n"]],btn:fmt(vp),disabled:fame()<30},
      ...(!S.partner?[{id:"dans",ic:icon("heart"),t:"Dans pistinde tanış",d:"Cesaretini topla.",slot:1,fx:[["Partner şansı","t"]],btn:"Dene"}]:[{id:"dans2",ic:icon("heart"),t:`${S.partner} ile dans`,d:"Pistin ortasında.",slot:1,fx:[["+10 Partner","p"]],btn:"Dans et"}])].map(prodHTML).join("")}</div>`);
    bindActs({parti:()=>{if(S.money<pp)return;useSlot();tx("Gece kulübü",-pp);S.moral+=16;S.energy-=22;let t="Harika bir geceydi. Sabah alarmı duymadın.";if(Math.random()<.2){S.rel.koc-=8;S.rel.taraf-=4;t+=` Ama biri video çekmiş. ${S.npc.coach} hiç memnun değil.`;news(`${fullName()} gece kulübü görüntüleriyle gündemde.`)}norm();save();resultView("Parti",t,[["+16 Moral","p"],["−22 Enerji","n"]])},
      karaoke:()=>{if(S.money<kp)return;useSlot();tx("Karaoke",-kp);arcadeRun("karaoke",true)},
      vip:()=>{if(S.money<vp)return;useSlot();tx("VIP masa",-vp);S.followers*=1.08;S.moral+=12;S.rel.koc-=4;norm();save();resultView("VIP gece","Ünlü bir şarkıcıyla fotoğrafın sabah magazin sitelerindeydi.",[["+%8 Takipçi","p"],["−4 Koç","n"]])},
      dans:()=>{useSlot();S.energy-=6;if(Math.random()<.28+fame()/200){S.partner=pick(cOf(S.city).fem);S.rel.partner=45;S.moral+=10;news(`${fullName()} yeni bir ilişkiye başladı.`);norm();save();resultView("Kıvılcım",`${S.partner} ile dans pistinde tanıştınız.`)}else{S.moral-=3;norm();save();resultView("Olmadı","Ritim duygun pota başında kalmış.")}},
      dans2:()=>{useSlot();S.rel.partner+=10;S.moral+=6;S.energy-=6;norm();save();resultView("Dans",`${S.partner} ile pistin ortasında döndünüz. Herkes size bakıyordu.`,[["+10 Partner","p"]])}});
  }
}
async function arcadeRun(kind,paid){
  if(!paid){if(S.money<1)return;tx("Arcade jetonu",-1)}closeSheet();arenaFor(null);
  const meta=ARCADE.find(g=>g.id===kind)||{n:"Karaoke",rec:"rhythm"};
  app.innerHTML=`<div style="padding-top:12px"><div class="eyebrow">Eğlence Merkezi</div><h2>${meta.n}</h2></div><div id="stg"></div><div id="res"></div>`;
  const el=$("#stg");let r;
  if(kind==="hoop")r=await mgArcade(el);else if(kind==="ref")r=await mgReflex(el);else if(kind==="hockey")r=await mgHockey(el);else if(kind==="bowling")r=await mgBowling(el);else r=await mgRhythm(el,{title:kind==="karaoke"?"Karaoke":"Dans ritmi",karaoke:kind==="karaoke"});
  const key=meta.rec,rec=r.score>(S.rec[key]||0);if(kind!=="karaoke")arcSubmit(key,r.score);if(rec&&kind!=="karaoke")S.rec[key]=r.score;
  let extra="";S.moral+=Math.min(12,3+Math.floor(r.score/4));
  if(kind==="hockey"&&r.win){S.moral+=4;extra="Bilgisayarı yendin!"}
  if(kind==="ref"&&r.score>=18&&Math.random()<.4){S.st.hiz+=1;extra="Çeviklik +1."}
  if(kind==="karaoke"&&r.score>=20){S.followers*=1.05;extra="Videon paylaşıldı: +%5 takipçi."}
  norm();save();$("#stg").innerHTML="";
  $("#res").innerHTML=`<div class="card"><div class="eyebrow">Skor</div><div class="big-num">${r.label||r.score}</div><p>${kind!=="karaoke"?(rec?"Yeni rekor!":`Rekor: ${S.rec[key]}`):""} ${extra}</p><div class="grid2"><button class="btn ghost" id="bk">Haritaya dön</button>${kind==="karaoke"?"":`<button class="btn pri" id="again">Bir jeton daha</button>`}</div></div>`;
  $("#bk").onclick=renderMain;const ag=$("#again");if(ag)ag.onclick=()=>arcadeRun(kind);
}

