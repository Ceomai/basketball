/* ================= RASTGELE OLAYLAR · TÜRKÇE İÇERİK PAKETİ =================
   Olaylar veri olarak yazılır; kod bilgisi gerekmez. Motor: src/content/events.js
   Alanlar:
   - id: benzersiz ad (çeviri paketleri aynı id'yi kullanır)
   - w: portre (friend, coach, rival, mom, dad, agent, press, partner, mate, neighbor, odd)
   - when: koşul (home: memlekette, abroad: yurt dışında, coast: sahil şehri, lise, studying: okuyor,
           single: partneri yok, pro: profesyonel)
   - who / title / text: metinler. Yer tutucular: {friend} {coach} {rival} {mom} {dad} {agent} {mate} {fem}
           {first} {FIRST} (büyük harf) {last} {city} {stat} (rastgele seçilen nitelik)
           Para: {W:1.5} = haftalık ücretin 1,5 katı, {S:40} = 40 × kariyer basamağı, {M:6} = sabit 6
   - choices: [{ t: buton metni, fx: etkiler, out: sonuç metni }]
     Etkiler: moral, energy, aka (akademik), followers ("x1.1" çarpan), rel: { koc, takim, taraf, aile, ark },
              money (sayı ya da "W:-0.6", "S:40" biçimi), buffs: { motive, offer }, st: { hiz: 1 }, statUp: 1 (rastgele nitelik),
              partner: true ({fem} partnerin olur)
     Şans: p (temel olasılık), pStat: ["sut", 200] (+nitelik/200), pFame: 250 (+şöhret/250);
           kazanırsa win: { fx, out }, kaybederse lose: { fx, out }
     Gereksinim: need: { money: 6 }, needOut: "yetmezse çıkan metin" */
export default [
  {
    id: "kanal",
    w: "friend",
    who: "{friend}",
    title: "Kanal fikri",
    text: "\"Seni çeken bir basketbol kanalı açıyorum. Adı '{last} Günlükleri'. Var mısın?\"",
    choices: [
      {
        t: "Varım, çek",
        fx: { followers: "x1.1", moral: 4, energy: -8 },
        out: "İlk video beklenenden çok izlendi. {friend} artık kendini yönetmen sanıyor."
      },
      {
        t: "Odaklanmam lazım",
        fx: { rel: { ark: -6 } },
        out: '{friend} kırıldı ama "haklısın" dedi. Sonra kanalı kedisine çevirdi.'
      }
    ]
  },
  {
    id: "taktik",
    w: "coach",
    who: "{coach}",
    title: "Gizli taktik",
    text: "\"Yeni bir set çizdim. Adı 'Kaplumbağa 3'. Herkes yavaşça hücum edecek, rakip uyuyakalınca hızlanacağız.\"",
    choices: [
      {
        t: "Harika fikir hocam",
        fx: { rel: { koc: 8, takim: -4 } },
        out: "{coach} sırtına vurdu. Takım arkadaşların göz devirdi."
      },
      {
        t: "Hocam, bu çalışmaz",
        fx: { rel: { koc: -7, takim: 5 } },
        out: "Koç kıpkırmızı oldu ve seni 20 tur koşturdu. Ama takım sana saygı duydu."
      }
    ]
  },
  {
    id: "rakip-sahnede",
    w: "rival",
    who: "{rival}",
    title: "Rakip sahnede",
    text: '{rival} bir röportajda "{last} mi? Abartılıyor" dedi. Video herkesin telefonunda.',
    choices: [
      {
        t: "Sosyal medyadan cevap ver",
        p: 0.55,
        win: { fx: { followers: "x1.12", rel: { taraf: 4 } }, out: "Cevabın viral oldu. Taraftar arkanda." },
        lose: { fx: { rel: { taraf: -4, koc: -3 } }, out: "Cevabın çocukça bulundu." }
      },
      {
        t: "Sahada konuşurum",
        fx: { buffs: { motive: 1 }, moral: 3 },
        out: "Hırslandın. Sonraki maçta niteliklerin daha etkili olacak."
      }
    ]
  },
  {
    id: "pankart",
    w: "mom",
    who: "{mom}",
    title: "Tribünde pankart",
    text: "\"Maçına pankartla geleceğim: '{FIRST}, ANNEN BURADA!'\"",
    choices: [
      { t: "Teşekkürler anne", fx: { rel: { aile: 8, taraf: 2 } }, out: "Pankart yayında üç kez gösterildi. Annen çok mutlu." },
      { t: "Lütfen getirme", fx: { rel: { aile: -9 } }, out: "{mom} sessizce pankartı katladı. Aile −9." }
    ]
  },
  {
    id: "mucize-icecek",
    w: "odd",
    who: "Salonun önündeki adam",
    title: "Mucize içecek",
    text: "\"Pssst. 'Turbo Şampiyon'. Tamamen yasal, kesinlikle denetlenmiş. Sadece {M:6}.\"",
    choices: [
      {
        t: "Bir tane al",
        need: { money: 6 },
        needOut: "Paran yetmedi.",
        fx: { money: -6, energy: 35 },
        p: 0.3,
        win: { fx: { moral: -10, rel: { taraf: -4 } }, out: "Enerji +35! Ama yüzünde mor benekler çıktı." },
        lose: { out: "Enerji +35! Tadı pil gibiydi ama işe yaradı." }
      },
      { t: "Hayır, teşekkürler", fx: { rel: { koc: 2 } }, out: "Adam bir duman bulutunda kayboldu." }
    ]
  },
  {
    id: "balik-sakasi",
    w: "mate",
    who: "{mate}",
    title: "Soyunma odası şakası",
    text: '"Koçun dolabına bir hafta önce balık sakladım. Kapıyı açmasını birlikte izleyelim mi?"',
    choices: [
      {
        t: "Kesinlikle",
        fx: { rel: { takim: 6, koc: -5 }, moral: 5 },
        out: "Koç dolabı açınca geri geri kaçtı. Takım günlerce güldü."
      },
      { t: "Bu iş kötü biter", fx: { rel: { koc: 3, takim: -5 } }, out: "{mate} tek başına yakalandı ve sana küstü." }
    ]
  },
  {
    id: "sahil-3x3",
    w: "friend",
    when: "coast",
    who: "{friend}",
    title: "Sahil turnuvası",
    text: '"{city} sahilinde 3x3 turnuvası var! Ödül {S:40}."',
    choices: [
      {
        t: "Katılalım",
        fx: { energy: -12 },
        p: 0.35,
        pStat: ["sut", 200],
        win: { fx: { money: "S:40", followers: "x1.05" }, out: "Turnuvayı kazandınız!" },
        lose: { out: "Yarı finalde elendiniz ama güzel bir gündü." }
      },
      { t: "Bu hafta olmaz", fx: { rel: { ark: -4 } }, out: "{friend} başkasıyla katıldı." }
    ]
  },
  {
    id: "memleket-ozlemi",
    w: "mom",
    when: "abroad",
    who: "{mom}",
    title: "Memleket özlemi",
    text: '"{city}\'de yemek yiyor musun? Sana bir koli kurabiye yolladım. Kargocu üç kere aradı."',
    choices: [
      {
        t: "Hemen git kargoyu al",
        fx: { moral: 6, rel: { aile: 5 } },
        out: "Kurabiyeleri takım arkadaşlarınla paylaştın. Herkes annene hayran."
      },
      { t: "Sonra alırım", fx: { rel: { aile: -4 } }, out: "Koli depoda bekliyor. Annen bunu duydu." }
    ]
  },
  {
    id: "balon",
    w: "friend",
    when: "lise",
    who: "{friend}",
    title: "Balon operasyonu",
    text: '"Müdürün arabasını balonla kaplayalım!"',
    choices: [
      {
        t: "Ben de varım",
        fx: { moral: 8 },
        p: 0.4,
        win: { fx: { rel: { koc: -8, aile: -6 } }, out: "Yakalandınız! Bir hafta ceza." },
        lose: { fx: { rel: { ark: 6 } }, out: "Fotoğraf okul yıllığına girdi." }
      },
      { t: "Antrenmana gidiyorum", fx: { statUp: 1 }, out: "Ekstra çalıştın. {stat} +1." }
    ]
  },
  {
    id: "sinav-haftasi",
    w: "press",
    when: "studying",
    who: "Okul",
    title: "Sınav haftası",
    text: "Bu hafta sınavlar var ve aynı günlerde maç hazırlığı.",
    choices: [
      { t: "Derslere gömül", fx: { aka: 7, energy: -12 }, out: "Akademik +7." },
      { t: "Basketbol önce gelir", fx: { aka: -6, moral: 4 }, out: "Akademik −6." }
    ]
  },
  {
    id: "kahve-mesaji",
    w: "partner",
    when: "single",
    who: "{fem}",
    title: "Bir mesaj",
    text: '{fem} yazdı: "Dünkü maçını izledim. Kahve içelim mi?"',
    choices: [
      {
        t: "Neden olmasın",
        p: 0.5,
        pFame: 250,
        win: { fx: { partner: true, moral: 12 }, out: "{fem} ile güzel bir kahve. Artık bir partnerin var." },
        lose: { fx: { moral: -4 }, out: "Bütün akşam telefonuyla ilgilendi. Olmadı." }
      },
      { t: "Şu an odaklanmalıyım", fx: { rel: { koc: 1 } }, out: "Mesajı kibarca cevapladın." }
    ]
  },
  {
    id: "reklam-teklifi",
    w: "agent",
    when: "pro",
    who: "{agent}",
    title: "Reklam teklifi",
    text: "\"'Pota Burger' reklam istiyor. Slogan: 'Bir ısırık, üç sayı.' Ücret {W:1.5}.\"",
    choices: [
      { t: "Para paradır", fx: { money: "W:1.5", rel: { taraf: -2 }, followers: "x1.04" }, out: "Reklam her yerde." },
      { t: "Markama uymaz", fx: { rel: { koc: 2 } }, out: '{agent}: "Peki, daha iyisini bekleriz."' }
    ]
  },
  {
    id: "kamyonet",
    w: "dad",
    when: "pro",
    who: "{dad}",
    title: "Babanın kamyoneti",
    text: '"Kamyonet yine bozuldu. Usta {W:0.6} istiyor..."',
    choices: [
      {
        t: "Hemen gönderiyorum",
        fx: { money: "W:-0.6", rel: { aile: 12 } },
        out: "{dad} sesinin titremesini saklamaya çalıştı."
      },
      { t: "Bu ay sıkışığım", fx: { rel: { aile: -8 } }, out: '"Tamam, idare ederiz" dedi.' }
    ]
  },
  {
    id: "gizli-gorusme",
    w: "agent",
    when: "pro",
    who: "{agent}",
    title: "Gizli görüşme",
    text: '"Başka bir kulübün başkanı seni istiyor. Bu hafta onunla gizlice yemek yersen sezon sonunda teklifler daha iyi olur."',
    choices: [
      {
        t: "Görüş",
        fx: { buffs: { offer: 1 } },
        p: 0.3,
        win: { fx: { rel: { koc: -10 } }, out: "Haber sızdı! Koç kızgın. Ama teklifler daha iyi olacak." },
        lose: { out: "Görüşme gizli kaldı. Sezon sonu teklifler daha iyi olacak." }
      },
      { t: "Kulübüme sadığım", fx: { rel: { koc: 5, taraf: 4 } }, out: "Sadakatin basına yansıdı." }
    ]
  },
  {
    id: "uzaylilar",
    w: "neighbor",
    who: "Komşun Hayri Bey",
    title: "Gece yarısı",
    text: '"Kalk! Uzaylılar bahçemdeki basketbol topunu çaldı! Bir de inek götürdüler. Benim ineğim yok ama."',
    choices: [
      {
        t: "Uzaylıları aramaya çık",
        fx: { energy: -15, moral: 8 },
        p: 0.25,
        win: { fx: { money: "S:30" }, out: "Ormanda içinde para olan parlak bir zarf buldun." },
        lose: { out: "Sadece bir rakun bulundu." }
      },
      { t: "Uyumaya devam", fx: { energy: 6 }, out: "Hayri Bey sabaha kadar kapıyı çaldı." }
    ]
  },
  {
    id: "cocuk-kulubu",
    w: "press",
    who: "Çocuk basketbol kulübü",
    title: "Davet",
    text: "{city}'deki bir çocuk kulübü seni antrenmanına davet etti.",
    choices: [
      {
        t: "Git, günü onlarla geçir",
        fx: { energy: -10, rel: { taraf: 6 }, followers: "x1.05", moral: 8 },
        out: 'Bir çocuk "Senin gibi olacağım" dedi.'
      },
      { t: "Programım dolu", fx: { rel: { taraf: -2 } }, out: "Hayal kırıklığı belliydi." }
    ]
  },
  // ---- Yerel hikâye ve mizah ----
  {
    id: "dugun",
    w: "neighbor",
    when: "home",
    who: "Mahalle",
    title: "Sokakta düğün",
    text: "Alt sokakta düğün var. Davul zurna gece ikiye kadar sürecek gibi. Yarın sabah antrenman var.",
    choices: [
      {
        t: "Halaya katıl",
        fx: { moral: 10, energy: -12, followers: "x1.03" },
        out: "Halayın başını sen çektin, mendili havada salladın. Videon mahalle gruplarında dolaşıyor."
      },
      {
        t: "Kulak tıkacıyla uyu",
        fx: { energy: 4 },
        out: "Zurna kulak tıkacını deldi geçti ama yine de birkaç saat uyuyabildin."
      }
    ]
  },
  {
    id: "yelek",
    w: "mom",
    when: "home",
    who: "{mom}",
    title: "Yeleğini giy",
    text: '"Dışarısı buz gibi! Yeleğini giymeden maça çıkma. Hasta olursan kim oynayacak?"',
    choices: [
      {
        t: "Tamam anne, giyiyorum",
        fx: { rel: { aile: 5 } },
        out: "Yeleği giydin. Soyunma odasında çıkardın ama annen bunu bilmek zorunda değil."
      },
      {
        t: "Anne salon kapalı, sıcak",
        fx: { rel: { aile: -3 }, moral: 1 },
        out: '{mom} "Ben de bilmem mi" dedi ve çantana bir yelek daha koydu.'
      }
    ]
  },
  {
    id: "dayi",
    w: "dad",
    when: "home",
    who: "Dayın",
    title: "Dayının taktikleri",
    text: 'Aile yemeğinde dayın masaya peçeteyle taktik çizdi: "Bak oğlum, sen topu al, hepsini geç, at. Bu kadar basit. Ben senin yaşındayken mahallede beni kimse tutamıyordu."',
    choices: [
      {
        t: "Haklısın dayı",
        fx: { rel: { aile: 4 }, moral: 3 },
        out: "Dayın gururlandı ve bir kez daha gençlik hikâyesini anlattı. Üçüncü kez."
      },
      {
        t: "Dayı, basketbol öyle oynanmıyor",
        fx: { rel: { aile: -2 } },
        out: "Masada sessizlik oldu. Teyzen konuyu hemen dolmaya bağladı."
      }
    ]
  },
  {
    id: "hali-saha",
    w: "friend",
    when: "home",
    who: "{friend}",
    title: "Halı saha daveti",
    text: '"Akşam halı saha var, bir kişi eksik. Gel, kaleye geçersin. Boyun uzun, kimse gol atamaz."',
    choices: [
      {
        t: "Gel bakalım",
        fx: { rel: { ark: 6 }, moral: 6, energy: -10 },
        p: 0.2,
        win: { fx: { energy: -10 }, out: "Kalede harikaydın ama bir şut bileğine geldi. Enerji −20." },
        lose: { out: "Kalede duvar gibiydin. Karşı takım seni basketbolcu diye şikâyet etti." }
      },
      { t: "Bileğimi riske atamam", fx: { rel: { ark: -3 } }, out: '{friend} "Profesyonel oldun ya, tabii" diye takıldı.' }
    ]
  },
  {
    id: "simitci",
    w: "neighbor",
    when: "home",
    who: "Simitçi amca",
    title: "Sabah simidi",
    text: 'Okul yolundaki simitçi seni tanıdı: "Dün maçta gördüm seni evladım! Bu simit benden, şampiyon ol da bana da forma getir."',
    choices: [
      {
        t: "Söz amca, forma getireceğim",
        fx: { moral: 5, rel: { taraf: 2 } },
        out: "Simit hâlâ sıcaktı. Amca mahalleye seni anlatacak."
      },
      {
        t: "Teşekkür edip ücretini ver",
        fx: { money: -0.1, rel: { taraf: 1 } },
        out: "Amca parayı almak istemedi, cebine geri sıkıştırdı."
      }
    ]
  },
  {
    id: "bayram",
    w: "mom",
    when: "home",
    who: "Teyzen",
    title: "Bayram ziyareti",
    text: 'Bayramda teyzene el öpmeye gittin. Elini öptün, harçlık zarfı geldi. Sonra soru da geldi: "Kız arkadaş var mı? Ne zaman evleniyorsun?"',
    choices: [
      {
        t: "Daha çok gencim teyze",
        fx: { money: 8, moral: 3 },
        out: 'Teyzen "Senin yaşında amcan evlenmişti" dedi. Harçlık zarfı kalın çıktı.'
      },
      {
        t: "Kariyerime odaklıyım",
        fx: { money: 8, rel: { aile: 3 } },
        out: 'Teyzen herkese "Bizim çocuk çok ciddi" diye anlattı.'
      }
    ]
  },
  {
    id: "gurbetci",
    w: "friend",
    when: "foreign",
    who: "Gurbetçi taraftarlar",
    title: "Tribünde ay yıldız",
    text: "{city}'deki maçında tribünde Türk bayraklarıyla bir grup vardı. Maç sonu seni bekliyorlar.",
    choices: [
      {
        t: "Yanlarına git, fotoğraf çektir",
        fx: { rel: { taraf: 5 }, moral: 8, followers: "x1.05" },
        out: '"Bizim çocuk!" diye bağırdılar. Biri sana ev yapımı baklava verdi.'
      },
      { t: "Uzaktan el salla", fx: { rel: { taraf: 1 } }, out: "Alkışladılar ama biraz buruk kaldılar." }
    ]
  },
  {
    id: "kargo",
    w: "mom",
    when: "foreign",
    who: "{mom}",
    title: "Kargo kolisi",
    text: '"Sana kuru fasulye, çay, pul biber ve kuru dut yolladım. {city}\'de doğru dürüst yemek yoktur oralarda."',
    choices: [
      {
        t: "Takım arkadaşlarına Türk yemeği pişir",
        fx: { rel: { takim: 7 }, moral: 5 },
        out: "Pul biberi az koymanı söylemişlerdi, dinlemedin. Yine de herkes tabağını bitirdi."
      },
      { t: "Hepsini kendine sakla", fx: { moral: 6, energy: 5 }, out: "Akşam çayı ve kuru dut. Biraz memleket gibi oldu." }
    ]
  },
  {
    id: "lokanta",
    w: "friend",
    when: "foreign",
    who: "Türk lokantası",
    title: "Memleket sofrası",
    text: '{city}\'de bir Türk lokantası buldun. Sahibi seni tanıdı ve "Hesap bizden, yeter ki maçta sayı at" dedi.',
    choices: [
      { t: "Kebap ve ayran", fx: { moral: 8, energy: 4 }, out: "Ayran köpüklüydü. Duvara imzalı forman asılacak." },
      {
        t: "Diyetteyim, sadece çorba",
        fx: { energy: 6, rel: { koc: 1 } },
        out: "Mercimek çorbası, limon, pul biber. Sporcu gibi."
      }
    ]
  },
  {
    id: "kahvehane",
    w: "press",
    when: "tr", // Türkiye'ye özgü (src/culture.js)
    who: "Kahvehane yorumcuları",
    title: "Çay ocağı analizi",
    text: 'Mahalle kahvesinde maçın yayını açık. Masadaki amcalar seni yorumluyor: "Bu çocuk sola hiç dönmüyor. Ben söylüyorum, sağdan geçeceksin."',
    choices: [
      {
        t: "Gidip çaylarını ısmarla",
        fx: { money: -1, rel: { taraf: 4 }, moral: 4 },
        out: "Amcalar seni bağrına bastı. Okey masasına bile davet edildin."
      },
      {
        t: "Haklılar, sola dönmeyi çalış",
        fx: { st: { hiz: 1 } },
        out: "Ertesi gün sol el çalımı çalıştın. Çeviklik +1. Amcalar haklıydı."
      }
    ]
  },
  {
    id: "taksici",
    w: "neighbor",
    when: "tr", // Türkiye'ye özgü (src/culture.js)
    who: "Taksi şoförü",
    title: "Taksici tanıdı",
    text: 'Bindiğin taksinin şoförü dikiz aynasından baktı: "Abi sen o basketbolcu değil misin? Abi bizim takımı neden almıyorsun, bizim de pivota ihtiyacımız var!"',
    choices: [
      {
        t: "Sohbet et, imza ver",
        fx: { rel: { taraf: 3 }, moral: 3 },
        out: "Taksimetreyi açmadı. Yol boyunca bütün oyuncu değişikliklerini sana anlattı."
      },
      { t: "Kulaklığı tak", fx: { energy: 3 }, out: "Şoför radyonun sesini açtı. Arabesk eşliğinde vardın." }
    ]
  }
];
