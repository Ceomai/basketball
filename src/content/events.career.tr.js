/* ================= KARİYER AŞAMASI OLAYLARI (Türkçe, paket 4d) =================
   Profesyonel (t3/t2, t1/euro) ve NBA aşamalarına özgü evrensel basketbol hayatı: menajer ve sözleşme, takas
   söylentisi, soyunma odası liderliği, sakatlık sonrası güven, sosyal medya, sponsor çekimi, deplasman yorgunluğu,
   genç yıldız rekabeti, yaşlanan vücut, röportaj tuzakları, hayır işleri; NBA'de draft, two-way, G League, büyük şehir
   baskısı, çaylak şakaları, back-to-back. Şehre/ülkeye özgü kültürel öğe içermez. Biçim events.tr.js ile aynı;
   İngilizcesi events.career.en.js'te aynı sırada. */
export default [
  // ---- Menajer ve sözleşme ----
  {
    id: "kr-menajer-pay",
    w: "agent",
    when: "pro",
    who: "{agent}",
    title: "Menajerin yüzdesi",
    text: '"Sana daha büyük kapılar açıyorum, bunu sen de görüyorsun. Komisyonumu biraz artırmamız lazım."',
    choices: [
      {
        t: "Kabul et, işini yapsın",
        fx: { money: "W:-0.5", buffs: { offer: 1 } },
        out: "Menajerin telefonu o hafta hiç susmadı. Sezon sonunda masada daha iyi teklifler olacak."
      },
      {
        t: "Pazarlık et",
        p: 0.5,
        pFame: 200,
        win: { fx: { moral: 4 }, out: '"Peki, eski oranda devam" dedi. Masadan kalkarken ikiniz de gülüyordunuz.' },
        lose: { fx: { moral: -3 }, out: "Kabul etti ama sesi soğudu. Bir süre teklifleri sana geç iletecek gibi." }
      },
      {
        t: "Sözleşmeyi kendin okumaya başla",
        fx: { energy: -6, moral: 3 },
        out: "Gece yarısı maddeleri tek tek okudun. Yarısını anlamadın ama artık hangi soruyu soracağını biliyorsun."
      }
    ]
  },
  {
    id: "kr-uzatma",
    w: "agent",
    when: ["top", "star"],
    who: "{agent}",
    title: "Erken uzatma teklifi",
    text: '"Kulüp, sözleşmen bitmeden uzatma istiyor. Rakam iyi ama serbest kalsan piyasa daha da iyi olabilir."',
    choices: [
      {
        t: "İmzala, içim rahat etsin",
        fx: { money: "W:2", rel: { koc: 4, taraf: 5 }, moral: 4 },
        out: 'İmza töreninde başkan seni kucakladı. Taraftar "bizim çocuk kaldı" diye pankart açtı.'
      },
      {
        t: "Bekle, piyasayı yokla",
        fx: { buffs: { offer: 1 }, rel: { taraf: -3 } },
        out: 'Menajerin keyifli, taraftar tedirgin. Tribünde biri "Kalacak mısın?" yazılı bir kâğıt salladı.'
      }
    ]
  },
  {
    id: "kr-bonus-madde",
    w: "agent",
    when: "pro",
    who: "{agent}",
    title: "Performans maddesi",
    text: '"Kulüp sabit maaş yerine maç başı sayıya bağlı bir prim maddesi öneriyor. Kendine güveniyor musun?"',
    choices: [
      {
        t: "Kendime güveniyorum",
        p: 0.45,
        pStat: ["sut", 200],
        win: {
          fx: { money: "W:1.5", moral: 5 },
          out: "Hedef rakama iki maç kala ulaştın. Prim, muhasebeden biraz buruk bir yüzle geldi."
        },
        lose: { fx: { moral: -5 }, out: "Hedefi üç sayıyla kaçırdın. Son maçta attığın o boş şutu bir süre rüyanda göreceksin." }
      },
      {
        t: "Sabit maaş kalsın",
        fx: { moral: 1 },
        out: 'Sürpriz yok, stres yok. Menajerin "Temkinlisin" dedi; övgü mü eleştiri mi anlamadın.'
      }
    ]
  },
  // ---- Takas ve kadro ----
  {
    id: "kr-takas-soylenti",
    w: "press",
    when: "top",
    who: "Muhabir",
    title: "Takas listesinde adın",
    text: "Bir spor sitesi, kulübün seni takas listesine koyduğunu yazdı. Soyunma odasında herkes telefonuna bakıyor.",
    choices: [
      {
        t: "Koça doğrudan sor",
        p: 0.6,
        win: { fx: { rel: { koc: 5 }, moral: 4 }, out: '"Haberim yok, sen benim planımdasın" dedi. Gözüne bakarak söyledi.' },
        lose: {
          fx: { rel: { koc: -3 }, moral: -4 },
          out: 'Uzun bir sessizlik oldu. "Bu işler yönetimde" dedi. İyi bir cevap değildi.'
        }
      },
      {
        t: "Sahada cevap ver",
        fx: { buffs: { motive: 1 }, energy: -4 },
        out: "Bu hafta idmanda ilk gelen, son çıkan sendin. Söylentiyi skor tabelası susturacak."
      },
      {
        t: "Paylaşımla dalga geç",
        fx: { followers: "x1.04", rel: { koc: -2 } },
        out: "Bavul emojisiyle attığın paylaşım rekor beğeni aldı. Yönetim ise hiç gülmedi."
      }
    ]
  },
  {
    id: "kr-yeni-genc",
    w: "mate",
    when: ["pro", "veteran"],
    who: "{mate}",
    title: "Yeni gelen çocuk",
    text: 'Kulüp senin pozisyonuna 19 yaşında, çok yetenekli bir oyuncu getirdi. Basın onu "geleceğin yıldızı" diye tanıtıyor.',
    choices: [
      {
        t: "Kanatlarının altına al",
        fx: { rel: { takim: 6, koc: 3 }, moral: 2 },
        out: "Ona savunmada ayak dizilimini gösterdin. Röportajında ilk teşekkürü sana etti."
      },
      {
        t: "İdmanda ona yer olmadığını göster",
        fx: { buffs: { motive: 1 }, rel: { takim: -3 } },
        out: "İlk birebirde onu iki kez bloke ettin. Çocuk iyi ama daha sıra sende."
      }
    ]
  },
  {
    id: "kr-genc-rakip",
    w: "rival",
    when: ["top", "veteran"],
    who: "{rival}",
    title: "Yeni neslin sesi",
    text: 'Ligin genç yıldızı bir yayında "Eski kuşak artık yavaş, bizim zamanımız" dedi. Seni kastettiği herkesçe malum.',
    choices: [
      {
        t: "Maçta konuş",
        fx: { buffs: { motive: 1 }, rel: { taraf: 3 } },
        out: 'Taraftar maçı "kuşak savaşı" diye pazarlıyor. Antrenmanda hiç olmadığı kadar odaklısın.'
      },
      {
        t: "Esprili cevap ver",
        fx: { followers: "x1.05", moral: 3 },
        out: '"Yavaşım ama yol bilirim" yazdın. Paylaşım genç taraftarlarda bile tuttu.'
      },
      {
        t: "Görmezden gel",
        fx: { rel: { koc: 3 }, moral: -1 },
        out: "Koç sakinliğini takdir etti. İçinde küçük bir kıvılcım yine de kaldı."
      }
    ]
  },
  // ---- Soyunma odası liderliği ----
  {
    id: "kr-soyunma-kavga",
    w: "mate",
    when: ["pro", "star"],
    who: "{mate}",
    title: "Soyunma odasında gerginlik",
    text: "Kötü bir mağlubiyetten sonra iki takım arkadaşın birbirine bağırıyor. Herkes sana bakıyor.",
    choices: [
      {
        t: "Araya gir, sözü al",
        p: 0.6,
        win: {
          fx: { rel: { takim: 8, koc: 3 } },
          out: "Kısa ve net konuştun. Kimse cevap vermedi; ertesi gün ikisi birlikte şut çalıştı."
        },
        lose: {
          fx: { rel: { takim: -3 }, moral: -3 },
          out: "Ses bir anda sana döndü. Ortalık yatıştı ama bir süre seninle de az konuştular."
        }
      },
      {
        t: "Koça bırak",
        fx: { rel: { koc: 2, takim: -2 } },
        out: "Koç kapıyı kapattı, yarım saat konuştu. Liderlik boşluğunu herkes fark etti."
      }
    ]
  },
  {
    id: "kr-takim-yemegi",
    w: "mate",
    when: ["pro", "rich"],
    who: "{mate}",
    title: "Takım yemeği",
    text: 'Seri mağlubiyetlerden sonra takımın havası yerlerde. Biri "Bir yemek ayarlasak mı?" diye sordu ve herkes sana döndü.',
    choices: [
      {
        t: "Hesap benden",
        fx: { money: "S:-30", rel: { takim: 7 }, moral: 4 },
        out: "Uzun bir masa, bol kahkaha. Sezonun ilk kez gerçekten takım gibi hissettiren gecesi."
      },
      {
        t: "Herkes kendi hesabını ödesin",
        fx: { rel: { takim: 2 } },
        out: "Yemek güzeldi, hesap kısmı biraz uzun sürdü. Yine de iyi geldi."
      }
    ]
  },
  {
    id: "kr-kaptanlik-teklif",
    w: "coach",
    when: ["pro", "veteran"],
    who: "{coach}",
    title: "Pazubandı",
    text: '"Kaptanımız sakatlandı, bu sezon pazubandını sana vermek istiyorum. Sorumluluk ağır ama sana güveniyorum."',
    choices: [
      {
        t: "Gururla kabul et",
        fx: { rel: { koc: 6, takim: 4 }, energy: -5, moral: 5 },
        out: "İlk toplantıda sesin biraz titredi. Sonra herkes ayağa kalkıp alkışladı."
      },
      {
        t: "Gençlerden birine verilsin",
        fx: { rel: { takim: 5 }, moral: 1 },
        out: "Pazubandı genç oyun kurucuya geçti. Maç öncesi yine senin yanına gelip ne yapacağını soruyor."
      }
    ]
  },
  // ---- Sakatlık sonrası güven ----
  {
    id: "kr-sakatlik-korku",
    w: "coach",
    when: ["pro", "lowMorale"],
    who: "{coach}",
    title: "O hareketten korkuyorsun",
    text: '"Fark ettim, eski sakatlığından beri o tarafa penetre etmiyorsun. Vücudun iyileşti, kafan iyileşmedi."',
    choices: [
      {
        t: "Spor psikoloğuyla çalış",
        fx: { money: "S:-20", moral: 8 },
        out: "Üç seans, bir sürü nefes egzersizi. Bu hafta ilk kez düşünmeden o tarafa sürdün."
      },
      {
        t: "İdmanda üstüne git",
        p: 0.55,
        win: {
          fx: { moral: 6, rel: { koc: 3 } },
          out: "On tekrar, yirmi tekrar... Sonunda korkudan çok yorgunluk hissettin. İşe yaradı."
        },
        lose: {
          fx: { energy: -10, moral: -2 },
          out: "Hafif bir burkulma, büyük bir panik. Neyse ki bir şey çıkmadı ama güven biraz daha geriledi."
        }
      },
      {
        t: "Oyununu değiştir",
        fx: { moral: 2, rel: { koc: -1 } },
        out: "Daha çok dışarıdan oynamaya karar verdin. Koç ikna olmadı ama şimdilik idare ediyor."
      }
    ]
  },
  {
    id: "kr-erken-donus",
    w: "coach",
    when: ["pro", "tired"],
    who: "{coach}",
    title: "Erken dönüş baskısı",
    text: '"Doktor iki hafta daha diyor ama playoff yarışındayız. Hazır hissediyorsan bu akşam on dakika lazımsın."',
    choices: [
      {
        t: "Doktoru dinle",
        fx: { energy: 12, rel: { koc: -3 } },
        out: "Kenardan izlemek zor oldu. Ama dizine teşekkür edeceğin günler gelecek."
      },
      {
        t: "Takım için oyna",
        fx: { energy: -12, rel: { koc: 5, takim: 4 }, moral: 3 },
        out: "On dakikada iki kritik savunma yaptın. Gece buz torbası, sabah kocaman bir gülümseme."
      }
    ]
  },
  // ---- Sosyal medya ve medya ----
  {
    id: "kr-eski-paylasim",
    w: "press",
    when: ["pro", "famous"],
    who: "Muhabir",
    title: "Yıllar önceki paylaşım",
    text: "Biri senin lise yıllarından kalma, bugün hiç hoş görünmeyen bir paylaşımını buldu. Etiketlenmeye başladın.",
    choices: [
      {
        t: "İçten bir özür yaz",
        fx: { followers: "x0.98", rel: { taraf: 4 }, moral: -2 },
        out: "Kısa ve samimi yazdın. Birkaç gün sonra konu kapandı; bazıları olgunluğunu takdir etti."
      },
      {
        t: "Hesabım çalındı de",
        p: 0.3,
        win: { fx: { moral: 2 }, out: "Nasıl olduysa yemlediler. Ama sen biliyorsun ve bu biraz batıyor." },
        lose: {
          fx: { followers: "x0.93", rel: { taraf: -6 } },
          out: "Paylaşımın tarihi ve konumu ortaya çıktı. Kriz ikiye katlandı."
        }
      },
      {
        t: "Bir hafta sosyal medyayı kapat",
        fx: { moral: 3, followers: "x0.97" },
        out: "Telefonsuz bir hafta. Fırtına sen yokken dindi; uykun da düzeldi."
      }
    ]
  },
  {
    id: "kr-roportaj-tuzak",
    w: "press",
    when: "top",
    who: "Muhabir",
    title: "Tuzaklı soru",
    text: '"Koçunuzun rotasyonları için takım içinde şikâyetler olduğu konuşuluyor. Siz de memnun değil misiniz?"',
    choices: [
      {
        t: 'Klişeyle geç: "Maç maç bakıyoruz"',
        fx: { rel: { koc: 3 }, followers: "x0.99" },
        out: "Muhabir hayal kırıklığına uğradı. Koç ertesi sabah sana kahve getirdi."
      },
      {
        t: "Dürüst ol, biraz",
        fx: { followers: "x1.04", rel: { koc: -6 } },
        out: '"Herkes daha çok oynamak ister" dedin. Manşet: "Yıldız oyuncudan koça ima".'
      },
      {
        t: "Soruyu muhabire çevir",
        p: 0.5,
        win: {
          fx: { followers: "x1.05", rel: { taraf: 3 } },
          out: '"Kaynağınız kim, o da gelsin oynasın" dedin. Salon güldü, klip yayıldı.'
        },
        lose: { fx: { rel: { taraf: -2 }, moral: -2 }, out: 'Espri havada kaldı. Klip "gergin anlar" başlığıyla dolaştı.' }
      }
    ]
  },
  {
    id: "kr-mikrofon-acik",
    w: "mate",
    when: "top",
    who: "{mate}",
    title: "Mikrofon açıkmış",
    text: "Mola sırasında hakem hakkında söylediğin söz, saha kenarı mikrofonuna takılmış. Klip şimdiden yayılıyor.",
    choices: [
      {
        t: "Hakemden özür dile",
        fx: { moral: -2, rel: { koc: 2 } },
        out: 'Ertesi maç hakemle tokalaştın. "Olur öyle" dedi; ceza gelmedi.'
      },
      {
        t: "Arkasında dur",
        p: 0.5,
        win: { fx: { rel: { taraf: 6 }, followers: "x1.03" }, out: "Taraftar seni sahiplendi. Tişört bile bastırmışlar." },
        lose: { fx: { money: "W:-0.6", moral: -3 }, out: "Lig para cezası kesti. Klip ise tişört olmadan da yayıldı." }
      }
    ]
  },
  // ---- Sponsor ve ticari işler ----
  {
    id: "kr-reklam-cekimi",
    w: "agent",
    when: ["pro", "famous"],
    who: "{agent}",
    title: "Reklam setinde on dördüncü çekim",
    text: "Bir enerji içeceği reklamı çekiyorsunuz. Yönetmen, smaç yapıp kameraya göz kırpmanı istiyor. On dördüncü kez.",
    choices: [
      {
        t: "Sabırla devam et",
        fx: { energy: -10, money: "W:1" },
        out: "On yedinci çekimde oldu. Yönetmen ağladı, sen de neredeyse."
      },
      {
        t: "Kendi fikrini öner",
        p: 0.5,
        win: {
          fx: { money: "W:1", followers: "x1.05" },
          out: "Arkadan gelen top, tek elle smaç, kameraya hiç bakmadan yürüyüş. Reklam her yerde."
        },
        lose: { fx: { money: "W:0.5", moral: -2 }, out: 'Ajans fikrini "cesur" buldu ve kullanmadı. Göz kırpma kaldı.' }
      },
      {
        t: "Bitti de, seti terk et",
        fx: { energy: 4, rel: { taraf: -2 }, buffs: { offer: 0 } },
        out: "Menajerin telefonda uzun uzun özür diledi. Marka bir daha arar mı, belli değil."
      }
    ]
  },
  {
    id: "kr-sponsor-celiski",
    w: "agent",
    when: ["top", "famous"],
    who: "{agent}",
    title: "Rakip marka",
    text: '"Kulübün forma sponsoru ile senin kişisel sponsorun rakip markalar. Lansmanda hangi ayakkabıyı giyeceksin?"',
    choices: [
      {
        t: "Kişisel sponsoruna sadık kal",
        fx: { money: "W:1", rel: { koc: -3 } },
        out: "Kulüp yönetimi hoşnut değil ama sözleşme sözleşmedir. Menajerin rahat."
      },
      {
        t: "Bantla logoyu kapat",
        fx: { followers: "x1.03", rel: { taraf: 2 } },
        out: "Siyah bantlı ayakkabılar bir anda moda oldu. İki marka da biraz bozuldu ama kimse kaybetmedi."
      }
    ]
  },
  {
    id: "kr-hayir-maci",
    w: "friend",
    when: ["pro", "rich"],
    who: "{friend}",
    title: "Yaz hayır maçı",
    text: '"Hastane için bir hayır maçı düzenliyoruz. Yıldızlar gelirse bilet satışı uçar. Sen gelir misin, bir de bağış?"',
    choices: [
      {
        t: "Hem oyna hem bağışla",
        fx: { money: "S:-40", rel: { taraf: 7, aile: 4 }, energy: -6, moral: 5 },
        out: "Bir çocuk hasta yatağından tezahürat videosu göndermiş. O videoyu bir süre kimseye göstermedin."
      },
      {
        t: "Sadece maça gel",
        fx: { rel: { taraf: 4 }, energy: -6, followers: "x1.02" },
        out: "Biletler tükendi. Devre arasında çocuklarla serbest atış yarışına girdin, kaybettin."
      },
      {
        t: "Programım dolu",
        fx: { energy: 4, rel: { ark: -3 } },
        out: "Arkadaşın anlayışlıydı ama sesinden kırıldığı belliydi."
      }
    ]
  },
  // ---- Deplasman ve yorgunluk ----
  {
    id: "kr-uzun-deplasman",
    w: "mate",
    when: ["pro", "tired"],
    who: "{mate}",
    title: "Beş şehir, dokuz gün",
    text: "Uzun deplasman turunun yedinci günü. Otel odaları birbirine karıştı; sabah hangi şehirde uyandığını bilmiyordun.",
    choices: [
      {
        t: "Uyku rutinine sıkı sıkıya bağlan",
        fx: { energy: 10, rel: { takim: -2 } },
        out: "Göz bandı, beyaz gürültü, saat onda ışıklar kapalı. Takım kart oynarken sen dokuz saat uyudun."
      },
      {
        t: "Takımla kart oyununa katıl",
        fx: { energy: -4, rel: { takim: 6 }, moral: 4 },
        out: "Gece yarısına kadar süren bir turnuva. Kaybettin ama bu turun en güzel anı buydu."
      }
    ]
  },
  {
    id: "kr-havalimani",
    w: "mate",
    when: "pro",
    who: "{mate}",
    title: "Rötar",
    text: "Uçağın altı saat rötar yaptı. Kapıda yere oturmuş bir grup genç forma giymiş seni fark etti.",
    choices: [
      {
        t: "Gençlerle sohbet et",
        fx: { rel: { taraf: 5 }, energy: -3, followers: "x1.02" },
        out: "İmza, fotoğraf, bir sürü soru. Altı saat beklenenden çabuk geçti."
      },
      {
        t: "Bekleme salonunda kestir",
        fx: { energy: 8 },
        out: "Uyandığında kulaklığının bir teki kaybolmuştu ama vücudun teşekkür ediyor."
      }
    ]
  },
  // ---- Yaşlanan vücut ----
  {
    id: "kr-yasli-vucut",
    w: "coach",
    when: ["pro", "veteran"],
    who: "{coach}",
    title: "Sabah dizlerin konuşuyor",
    text: '"Isınman eskiden on dakikaydı, şimdi yarım saat. Antrenman yükünü azaltalım mı?"',
    choices: [
      {
        t: "Yükü azalt, maça sakla",
        fx: { energy: 12, rel: { koc: 2 }, moral: -2 },
        out: "İdmanın yarısını kenardan izledin. Maç günü bacakların taze ama içinde bir sızı var."
      },
      {
        t: "Yoga ve esneme rutini başlat",
        fx: { energy: 6, st: { hiz: 1 }, money: "S:-12" },
        out: "İlk hafta ayaklarına uzanamadın. Üçüncü hafta takım arkadaşların sana katılmaya başladı."
      },
      {
        t: '"Ben iyiyim" de, tam devam',
        p: 0.5,
        win: {
          fx: { buffs: { motive: 1 }, moral: 3 },
          out: "Vücudun bu hafta da seni yarı yolda bırakmadı. Ama soru işareti duruyor."
        },
        lose: {
          fx: { energy: -14, moral: -4 },
          out: "Hamstring çekti. Ciddi değil ama mesaj net: yaş bir sayı ama sayı da bir şey."
        }
      }
    ]
  },
  {
    id: "kr-beslenme-uzmani",
    w: "coach",
    when: ["top", "veteran"],
    who: "{coach}",
    title: "Kariyerini uzatan tabak",
    text: "Kulübün beslenme uzmanı sana yeni bir plan hazırladı: şeker yok, gece atıştırması yok, en sevdiğin tatlı hiç yok.",
    choices: [
      {
        t: "Plana harfiyen uy",
        fx: { energy: 10, moral: -4 },
        out: "İki hafta sonra merdivenleri iki iki çıkıyorsun. Ama rüyanda hep o tatlıyı görüyorsun."
      },
      {
        t: "Hafta sonu kaçamağı koşuluyla",
        fx: { energy: 5, moral: 2 },
        out: "Uzman kaşlarını kaldırdı ama kabul etti. Pazar akşamları kutsal."
      }
    ]
  },
  {
    id: "kr-emeklilik-sorusu",
    w: "press",
    when: ["pro", "veteran"],
    who: "Muhabir",
    title: '"Ne zaman bırakıyorsunuz?"',
    text: "Bir basın toplantısında, kötü geçen bir maçın ardından genç bir muhabir emeklilik planlarını soruyor.",
    choices: [
      {
        t: '"Vücudum söyleyince"',
        fx: { rel: { taraf: 3 }, moral: 1 },
        out: "Sakin ve olgun bir cevap. Salon alkışladı; muhabir de kızardı."
      },
      {
        t: '"Sorunun cevabını sahada vereceğim"',
        fx: { buffs: { motive: 1 }, followers: "x1.03" },
        out: "Gözlerinde ateş vardı. O cümle kulübün tanıtım videosuna girdi."
      }
    ]
  },
  // ---- Alt ligler (t3/t2) ----
  {
    id: "kr-sozlesme-maddesi",
    w: "agent",
    when: "lower",
    who: "{agent}",
    title: "Küçük puntolu madde",
    text: '"Sözleşmende üst ligden teklif gelirse çıkış maddesi yok. Kulüp seni istediği kadar tutabilir. Ekletmeye çalışalım mı?"',
    choices: [
      {
        t: "Çıkış maddesi için bastır",
        p: 0.5,
        win: { fx: { buffs: { offer: 1 }, rel: { koc: -2 } }, out: "Kulüp istemeye istemeye ekledi. Artık kapı aralık." },
        lose: { fx: { rel: { koc: -5 }, moral: -2 }, out: 'Başkan "Bize güvenmiyor musun?" diye kızdı. Madde de eklenmedi.' }
      },
      {
        t: "Kulübe sadakat göster",
        fx: { rel: { koc: 4, taraf: 3 } },
        out: "Başkan seni odasına çağırıp teşekkür etti. Bu sezon sana daha çok top gelecek gibi."
      }
    ]
  },
  {
    id: "kr-ust-lig-antrenman",
    w: "agent",
    when: "lower",
    who: "{agent}",
    title: "Deneme antrenmanı",
    text: '"Üst ligden bir kulüp seni bir antrenmana çağırıyor. Ama aynı gün bizim önemli bir maçımız var."',
    choices: [
      {
        t: "Denemeye git",
        p: 0.45,
        pStat: ["hiz", 250],
        win: {
          fx: { buffs: { offer: 1 }, rel: { koc: -4 } },
          out: "Antrenman bitince koçları adını sordu ve not aldı. Bu iyiye işaret."
        },
        lose: {
          fx: { rel: { koc: -4 }, moral: -4 },
          out: "İyi oynadın ama başka bir isim seçtiler. Kendi takımın da maçı kaybetti."
        }
      },
      {
        t: "Takımınla kal",
        fx: { rel: { koc: 5, takim: 5 } },
        out: "Maçta yirmi sayı attın. Belki o gözlemci de bu maçı izlemiştir, kim bilir?"
      }
    ]
  },
  // ---- EuroLeague ----
  {
    id: "kr-euro-cift-mac",
    w: "coach",
    when: ["euro", "tired"],
    who: "{coach}",
    title: "Çift maç haftası",
    text: '"Salı Avrupa, perşembe Avrupa, pazar lig. Dakikalarını bölüşmemiz lazım. Hangi maçı istersin?"',
    choices: [
      {
        t: "Avrupa maçlarını oyna",
        fx: { energy: -8, followers: "x1.03", rel: { koc: 2 } },
        out: "Kıtanın en iyileriyle iki maç. Yorgunsun ama vitrin büyük."
      },
      {
        t: "Lig maçında dinlen",
        fx: { energy: 10, rel: { taraf: -2 } },
        out: "Taraftar seni ligde kenarda görünce biraz söylendi. Ama bacakların teşekkür ediyor."
      }
    ]
  },
  // ---- NBA ----
  {
    id: "kr-nba-rookie-saka",
    w: "mate",
    when: ["nba", "young"],
    who: "{mate}",
    title: "Pembe sırt çantası",
    text: "Takımın veteranları sana kocaman, pembe, üzerinde çizgi film karakteri olan bir sırt çantası verdi. Sezon boyunca taşıyacaksın.",
    choices: [
      {
        t: "Gururla taşı",
        fx: { rel: { takim: 7 }, followers: "x1.04", moral: 2 },
        out: "Çantayla havalimanında yürürken çekilen fotoğrafın ligin en çok paylaşılanı oldu."
      },
      {
        t: "Çantayı gizlemeye çalış",
        fx: { rel: { takim: -3 }, moral: -1 },
        out: "Bulduklarında çantanın yanına bir de uyumlu pembe şapka eklediler."
      },
      {
        t: "Herkese kahvaltı ısmarla",
        fx: { money: "S:-20", rel: { takim: 5 } },
        out: "Çaylak geleneği: sabah 6'da yirmi kişilik kahvaltı siparişi. Kimse çantayı unutmadı ama gönüller kazanıldı."
      }
    ]
  },
  {
    id: "kr-nba-back-to-back",
    w: "coach",
    when: ["nba", "tired"],
    who: "{coach}",
    title: "Back-to-back",
    text: '"Dün gece uzatmaya gittik, bu akşam iki saat uzaktaki bir şehirde yine maç var. Yük yönetimi uygulayalım mı?"',
    choices: [
      {
        t: "Yük yönetimi, dinlen",
        fx: { energy: 15, rel: { taraf: -4 } },
        out: "Bilet alıp seni görmeye gelen bir çocuğun üzgün fotoğrafı internete düştü. Bacakların taze ama vicdanın değil."
      },
      {
        t: "Oyna, taraftar seni görmeye geldi",
        fx: { energy: -12, rel: { taraf: 6 } },
        out: "Ayakta zor duruyordun ama o çocuğa maç sonu formanı verdin."
      }
    ]
  },
  {
    id: "kr-nba-two-way",
    w: "agent",
    when: ["nba", "bench"],
    who: "{agent}",
    title: "Two-way sözleşme",
    text: '"Kulüp seni two-way sözleşmeye çevirmeyi düşünüyor: haftanın yarısı G League, yarısı burası. Kadroya tutunman için iki hafta var."',
    choices: [
      {
        t: "Ekstra antrenmana gir",
        fx: { energy: -10, buffs: { motive: 1 }, rel: { koc: 5 } },
        out: "Herkes gittikten sonra salonda yalnızdın. Bir asistan koç ışıkları kapatmadan önce sana not verdi."
      },
      {
        t: "Menajerine başka kapı ara",
        fx: { buffs: { offer: 1 }, rel: { koc: -3 } },
        out: 'Menajerin üç kulübü aradı. Biri ilgilendi ama şimdilik sadece "ilgilendi".'
      },
      {
        t: "G League'i bir fırsat olarak gör",
        fx: { moral: 4, rel: { takim: 2 } },
        out: "Orada kırk dakika oynayacaksın. Dakikalar, hatalar, gelişim. Dönüş biletin bu olabilir."
      }
    ]
  },
  {
    id: "kr-nba-draft-anisi",
    w: "press",
    when: ["nba", "young"],
    who: "Muhabir",
    title: "Draft gecesi sorusu",
    text: '"Draft\'ta sizi geçen on iki takım hakkında ne düşünüyorsunuz?" Muhabir mikrofonu yüzüne dayadı.',
    choices: [
      {
        t: '"Her birine teşekkür ediyorum"',
        fx: { buffs: { motive: 1 }, followers: "x1.04" },
        out: "Gülümseyerek söyledin ama herkes ne demek istediğini anladı. Klip yayıldı."
      },
      {
        t: '"Geçmiş geçmişte kaldı"',
        fx: { rel: { koc: 3 }, moral: 2 },
        out: 'Koç basın toplantısından sonra omzuna dokundu: "Profesyonelce."'
      }
    ]
  },
  {
    id: "kr-nba-buyuk-sehir",
    w: "press",
    when: ["nba", "star"],
    who: "Muhabir",
    title: "Büyük şehir, büyük manşet",
    text: 'Mega şehrin gazeteleri üç maçlık kötü serinden sonra kapağa senin fotoğrafını "Nerede bu yıldız?" başlığıyla koydu.',
    choices: [
      {
        t: "Manşeti dolabına as",
        fx: { buffs: { motive: 1 }, moral: 2 },
        out: "Her idmandan önce o kapağa bakıyorsun. Gazeteci bunu duydu ve bir sonraki yazısında biraz yumuşadı."
      },
      {
        t: "Bir hafta medyaya kapan",
        fx: { moral: 4, rel: { taraf: -3 }, followers: "x0.98" },
        out: "Kapalı kapılar arkasında sakin bir hafta. Ama sessizlik de bir manşet oldu."
      },
      {
        t: "Taraftarla buluşma düzenle",
        fx: { energy: -6, rel: { taraf: 7 } },
        out: "Bir spor salonunda taraftarlarla şut yarışı. Ertesi gün kapakta gülümseyen bir fotoğrafın vardı."
      }
    ]
  },
  {
    id: "kr-nba-allstar-etkinlik",
    w: "agent",
    when: ["nba", "famous"],
    who: "{agent}",
    title: "Ünlüler maçı daveti",
    text: '"All-Star haftası ünlüler maçına koç olarak çağrıldın. Takımında bir şarkıcı, iki oyuncu ve bir aşçı var."',
    choices: [
      {
        t: "Ciddi bir oyun planı hazırla",
        p: 0.5,
        win: {
          fx: { followers: "x1.06", moral: 5 },
          out: "Aşçı bitiriş vuruşunu yaptı! Kenarda koç gibi kükrediğin anlar herkesin telefonunda."
        },
        lose: {
          fx: { followers: "x1.03", moral: -1 },
          out: "Şarkıcı üç kez yanlış potaya koştu. Kaybettiniz ama gülmekten karnın ağrıdı."
        }
      },
      {
        t: "Eğlenceye bak",
        fx: { followers: "x1.04", energy: -4, rel: { taraf: 3 } },
        out: "Mola sırasında taraftarlara top attın, kenarda dans ettin. Skor kimin umurunda."
      },
      {
        t: "Kibarca reddet, dinlen",
        fx: { energy: 10 },
        out: "Kanepede ünlüler maçını izledin. Aşçının şutları gerçekten kötüydü."
      }
    ]
  },
  {
    id: "kr-nba-g-league",
    w: "coach",
    when: ["nba", "bench"],
    who: "{coach}",
    title: "Aşağıya bir hafta",
    text: '"Seni bir haftalığına G League takımına gönderiyoruz. Ceza değil; dakika lazım. Ama nasıl karşılayacağın önemli."',
    choices: [
      {
        t: "Kırk dakika oyna, rakamları konuştur",
        fx: { energy: -8, buffs: { motive: 1 }, rel: { koc: 4 } },
        out: "Otuz dört sayı, on ribaund. Rapor ertesi sabah koçun masasındaydı."
      },
      {
        t: "Kırgınlığını belli et",
        fx: { moral: -4, rel: { koc: -5 }, followers: "x1.02" },
        out: 'Gizemli bir "..." paylaşımı attın. Taraftar meraklandı, koç sinirlendi.'
      }
    ]
  },
  {
    id: "kr-nba-sehir-hayati",
    w: "partner",
    when: ["nba", "partner"],
    who: "{fem}",
    title: "Hiç görmediğin şehir",
    text: '"İki yıldır bu şehirde yaşıyoruz ve sen salon, otel, havalimanı dışında hiçbir yer görmedin. Bu akşam dışarı çıkalım mı?"',
    choices: [
      {
        t: "Bu akşam her şey onun",
        fx: { rel: { partner: 8 }, energy: -5, moral: 5 },
        out: "Küçük bir restoran, uzun bir yürüyüş. Seni tanıyan garson hesabı getirmedi."
      },
      {
        t: "Yarın maç var, ertele",
        fx: { rel: { partner: -6 }, energy: 5 },
        out: '"Hep yarın maç var" dedi, gülümseyerek ama yorgun.'
      }
    ]
  },
  {
    id: "kr-nba-imza-ayakkabi",
    w: "agent",
    when: ["nba", "star", "famous"],
    who: "{agent}",
    title: "Prototip ayakkabı",
    text: '"Bir marka imza ayakkabın için prototip gönderdi. Bu akşam maçta denersen sosyal medyada patlar, ama ayağına oturmamış olabilir."',
    choices: [
      {
        t: "Maçta giy",
        p: 0.55,
        win: {
          fx: { followers: "x1.06", money: "W:0.5" },
          out: "Ayakkabılar parladı, sen de parladın. Marka ertesi sabah aradı."
        },
        lose: {
          fx: { energy: -8, moral: -3, followers: "x1.02" },
          out: "İkinci çeyrekte su topladın, devrede eski ayakkabılarına döndün."
        }
      },
      {
        t: "Önce idmanda dene",
        fx: { rel: { koc: 2 }, moral: 1 },
        out: "İki idman sonra ayakkabı ayağına oturdu. Marka sabrını takdir etti."
      }
    ]
  },
  {
    id: "kr-trade-deadline",
    w: "agent",
    when: ["nba", "star"],
    who: "{agent}",
    title: "Takas son günü",
    text: '"Son gün bugün saat 15.00\'te bitiyor. Telefonumu açık tut. Otelde oturma, eşyalarını da toplama. Ya da topla."',
    choices: [
      {
        t: "Telefonu kapat, salona git",
        fx: { moral: 3, energy: -4, rel: { koc: 2 } },
        out: 'Bir saat şut attın. Telefonu açtığında yirmi bir mesaj vardı; hepsi "bir şey olmadı" diyordu.'
      },
      {
        t: "Her saniye haberleri takip et",
        fx: { moral: -5, energy: -6 },
        out: "Saat 15.01. Hiçbir şey olmadı. Ama o altı saat ömründen bir yıl götürdü."
      }
    ]
  }
];
