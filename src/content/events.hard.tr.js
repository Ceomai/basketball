/* ================= ZORLU OLAYLAR (Türkçe) =================
   Oyuncuyu sınayan olaylar: moral, aile, para ve ilişkiler gerçekten anlam kazansın diye. Haftaların yaklaşık
   %10'unda bunlardan biri gelir (src/match.js → randomEvent). Biçim events.tr.js ile aynı; hard: true işaretli.
   Ek etki: partner: false → ayrılık (partner gider). */
export default [
  {
    id: "h-ayrilik",
    hard: true,
    w: "partner",
    when: "partner",
    who: "{fem}",
    title: "Konuşmamız lazım",
    text: '"Son aylarda hep antrenman, hep maç. Ben bu ilişkide yalnız gibiyim. Ayrılmak istiyorum."',
    choices: [
      {
        t: "İkna etmeye çalış",
        p: 0.45,
        win: {
          fx: { moral: -4, energy: -6 },
          out: "Uzun bir gece oldu. Sonunda bir şans daha vermeye karar verdi. Artık ona daha çok vakit ayırman lazım."
        },
        lose: { fx: { partner: false, moral: -15 }, out: "Kararı kesindi. Eve döndüğünde ev çok sessizdi." }
      },
      {
        t: "Saygı duy, yollarınızı ayırın",
        fx: { partner: false, moral: -10 },
        out: "Sakin bir vedalaşma oldu ama boşluğu birkaç hafta hissedeceksin."
      }
    ]
  },
  {
    id: "h-dede",
    hard: true,
    w: "dad",
    who: "{dad}",
    title: "Dedeni kaybettik",
    text: '"Oğlum... Deden bu sabah vefat etti. Cenaze yarın memlekette."',
    choices: [
      {
        t: "Cenazeye git",
        fx: { moral: -10, energy: -10, rel: { aile: 15, koc: -2 } },
        out: "Ailenle birlikteydin. Deden seni hep tribünden izlemek isterdi; bu sezonu ona adadın."
      },
      {
        t: "Takımın yanında kal",
        fx: { moral: -16, rel: { aile: -12, koc: 3 } },
        out: "Maça çıktın ama aklın memleketteydi. Ailen biraz kırıldı."
      }
    ]
  },
  {
    id: "h-baba-hasta",
    hard: true,
    w: "mom",
    who: "{mom}",
    title: "Baban rahatsızlandı",
    text: '"Baban birkaç hafta çalışamayacak. Bu ay geçinmek zor olacak. Sana söylemek istemezdim."',
    choices: [
      {
        t: "Masrafları sen karşıla",
        fx: { money: "S:-30", rel: { aile: 12 }, moral: -2 },
        out: "Ailenin yükünü aldın. Annen telefonda ağladı; teşekkür etmeyi bilemedi."
      },
      {
        t: "Hafta sonları yanlarında ol",
        fx: { energy: -14, rel: { aile: 10 }, moral: -6 },
        out: "Her hafta sonu yollardasın. Yorgunsun ama baban seni gördükçe toparlanıyor."
      },
      {
        t: "Şu an elimden bir şey gelmez",
        fx: { rel: { aile: -15 }, moral: -8 },
        out: "Telefonu kapattığında içinde bir ağırlık kaldı."
      }
    ]
  },
  {
    id: "h-soygun",
    hard: true,
    w: "neighbor",
    when: "pro",
    who: "Komşun",
    title: "Eve hırsız girmiş",
    text: '"Kapın açık duruyordu, polisi aradım. İçerisi darmadağın."',
    choices: [
      {
        t: "Güvenlik sistemi kur",
        fx: { money: "W:-1.2", moral: -6 },
        out: "Bir kısmı sigortadan döndü ama bir süre evde rahat uyuyamadın."
      },
      {
        t: "Boş ver, eşyalar gider",
        fx: { money: "W:-0.6", moral: -10 },
        out: "Kayıp büyük değildi ama huzurun kaçtı."
      }
    ]
  },
  {
    id: "h-sosyal",
    hard: true,
    w: "press",
    when: "pro",
    who: "Sosyal medya",
    title: "Linç kampanyası",
    text: "Kötü geçen maçın sonrası bir videon cımbızlandı. Binlerce yorum, etiket, hakaret.",
    choices: [
      {
        t: "Açıklama yap",
        p: 0.5,
        pFame: 300,
        win: { fx: { rel: { taraf: 4 } }, out: "Samimi açıklaman tersine çevirdi. Taraftar arkanda durdu." },
        lose: {
          fx: { rel: { taraf: -6 }, moral: -8 },
          out: "Açıklama yangına körükle gitti. Birkaç hafta sessiz kalman gerekecek."
        }
      },
      {
        t: "Telefonu kapat, sahaya odaklan",
        fx: { moral: -6, followers: "x0.97" },
        out: "Birkaç gün zor geçti. Sonra gündem değişti."
      }
    ]
  },
  {
    id: "h-menajer",
    hard: true,
    w: "agent",
    when: "pro",
    who: "Avukatın",
    title: "Menajer yolsuzluğu",
    text: '"{agent} son sözleşmende komisyonu gizlice şişirmiş. Belgeler elimizde."',
    choices: [
      {
        t: "Dava aç",
        p: 0.6,
        win: { fx: { money: "W:1", moral: 4 }, out: "Dava kazanıldı, para geri döndü. Menajerin özür diledi." },
        lose: { fx: { money: "W:-0.8", moral: -6 }, out: "Dava uzadı, avukat masrafları cebinden çıktı." }
      },
      {
        t: "Sessizce yolları ayır",
        fx: { money: "W:-0.5", moral: -5, buffs: { offer: 0 } },
        out: "Kayıpla kapattın. Yeni menajerin seni tanıyana kadar teklifler biraz gecikebilir."
      }
    ]
  },
  {
    id: "h-zehir",
    hard: true,
    w: "mate",
    who: "{mate}",
    title: "Gıda zehirlenmesi",
    text: "Takım yemeğinden sonra gece boyunca kustun. Sabah ayakta duramıyorsun.",
    choices: [
      {
        t: "Doktora git, dinlen",
        fx: { energy: -25, moral: -3 },
        out: "Serum aldın. İki gün yatakta geçti."
      },
      {
        t: "İlaç al, antrenmana çık",
        p: 0.5,
        win: { fx: { energy: -15, rel: { koc: 4 } }, out: "Bitkindin ama çıktın. Koç bunu not etti." },
        lose: { fx: { energy: -35, moral: -6 }, out: "Antrenmanın ortasında bayılıyordun. Koç seni eve gönderdi." }
      }
    ]
  },
  {
    id: "h-kaza",
    hard: true,
    w: "friend",
    who: "{friend}",
    title: "Trafik kazası",
    text: '"Arabana arkadan çarpan adam kaçtı. Sen iyisin ama boynun tutuldu."',
    choices: [
      {
        t: "Fizyoterapiste git",
        fx: { money: "S:-12", energy: -8 },
        out: "Erken müdahale iyi geldi. Birkaç günde toparlandın."
      },
      {
        t: "Geçer, önemli değil",
        p: 0.55,
        win: { fx: { moral: -2 }, out: "Gerçekten geçti. Şanslıydın." },
        lose: { fx: { energy: -20, moral: -6 }, out: "Ağrı haftalarca sürdü; şut atarken bile hissediyorsun." }
      }
    ]
  },
  {
    id: "h-arkadas",
    hard: true,
    w: "friend",
    who: "{friend}",
    title: "Borç isteyen dost",
    text: '"Kardeşim, işler kötü gitti. Bana biraz borç verebilir misin? Ay sonu öderim."',
    choices: [
      {
        t: "Ver",
        p: 0.5,
        fx: { money: "S:-20" },
        win: { fx: { money: "S:20", rel: { ark: 8 } }, out: "{friend} söz verdiği gün parayı getirdi. Dostluğunuz pekişti." },
        lose: { fx: { rel: { ark: -10 }, moral: -6 }, out: "Para geri gelmedi. {friend} telefonlarını açmıyor." }
      },
      {
        t: "Kibarca reddet",
        fx: { rel: { ark: -8 }, moral: -2 },
        out: '"Anlıyorum" dedi ama sesi soğuktu.'
      }
    ]
  },
  {
    id: "h-yedek",
    hard: true,
    w: "coach",
    when: "pro",
    who: "{coach}",
    title: "Kulübe kararı",
    text: '"Son haftalarda istediğim enerjiyi görmüyorum. Bir sonraki maçta kulübeden başlayacaksın."',
    choices: [
      {
        t: "Ekstra antrenmanla cevap ver",
        fx: { energy: -12, rel: { koc: 6 }, moral: -4 },
        out: "Herkesten önce gelip herkesten sonra çıktın. Koç gördü."
      },
      {
        t: "Kapısını çalıp itiraz et",
        p: 0.35,
        win: { fx: { rel: { koc: 2 } }, out: "Konuştunuz. Kararını değiştirmedi ama seni dinledi." },
        lose: { fx: { rel: { koc: -10 }, moral: -8 }, out: "Tartışma büyüdü. Soyunma odasında konuşuluyor." }
      }
    ]
  }
];
