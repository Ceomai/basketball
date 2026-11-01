/* ================= RASTGELE OLAYLAR · TÜRKÇE EK PAKET (kariyer evresine özel) =================
   Biçim events.tr.js ile aynı. "when" artık bir liste de olabilir (hepsi sağlanmalı).
   Koşullar: lower (3./2. lig), top (1. lig, EuroLeague, NBA), euro, nba, star (ilk beş), bench (yedek), young (≤21),
   veteran (≥30), rich, broke, famous, partner, national (milli maç oynamış), rivalAhead, lowMorale, tired, school */
export default [
  // ---- Alt ligler ----
  {
    id: "otobus",
    w: "mate",
    when: "lower",
    who: "{mate}",
    title: "Deplasman otobüsü",
    text: "Takım otobüsü otoyolda bozuldu. Maça dört saat var, kaptan kaputu açmış, yardım eden yok.",
    choices: [
      {
        t: "Kaputun başına geç",
        fx: { energy: -8, rel: { takim: 6 } },
        p: 0.5,
        win: { fx: { moral: 4 }, out: "Bir kabloyu yerine taktın, motor çalıştı. Takım seni omuzlarda taşıdı." },
        lose: { out: "Motor çalışmadı ama birlikte otostop çektiniz. Maça son anda yetiştiniz." }
      },
      {
        t: "Kulaklığı tak, uyu",
        fx: { energy: 6, rel: { takim: -3 } },
        out: "Uyandığında takım çoktan bir kamyonete binmişti. Seni son anda hatırladılar."
      }
    ]
  },
  {
    id: "maas-gecikti",
    w: "agent",
    when: "lower",
    who: "{agent}",
    title: "Maaşlar gecikti",
    text: '"Kulüp iki haftadır maaş ödemiyor. Bazı oyuncular antrenmana çıkmamayı konuşuyor. Sen ne yapacaksın?"',
    choices: [
      {
        t: "Takımla birlikte boykota katıl",
        fx: { rel: { takim: 7, koc: -6 } },
        p: 0.6,
        win: { fx: { money: "W:2" }, out: "Başkan ertesi gün tüm maaşları yatırdı. Takım arkadaşların sana sarıldı." },
        lose: { fx: { moral: -5 }, out: "Başkan inat etti, iki gün antrenman kaçtı. Sonunda yarım maaş geldi." }
      },
      {
        t: "Antrenmana çık, profesyonel ol",
        fx: { rel: { koc: 6, takim: -4 } },
        out: "Koç seni bütün takımın önünde örnek gösterdi. Soyunma odasında bazıları sana küstü."
      }
    ]
  },
  {
    id: "kucuk-salon",
    w: "press",
    when: "lower",
    who: "Yerel gazete",
    title: "Tek tribünlü salon",
    text: "Bu haftaki deplasman salonunda tek tribün var ve tavan akıtıyor. Yerel gazete seninle röportaj istiyor.",
    choices: [
      {
        t: '"Her salon bir sahne" de',
        fx: { rel: { taraf: 4 }, followers: "x1.03" },
        out: "Röportaj kasabada çok sevildi. Maçta ev sahibi taraftar bile seni alkışladı."
      },
      {
        t: '"Bu şartlar profesyonel değil" de',
        fx: { rel: { taraf: -3 }, moral: 2 },
        out: 'Haklıydın ama manşet "Kibirli yıldız adayı" oldu.'
      }
    ]
  },
  {
    id: "ikinci-is",
    w: "friend",
    when: ["lower", "broke"],
    who: "{friend}",
    title: "Hafta sonu işi",
    text: '"Bizim kafede hafta sonu garson lazım. Para fena değil. Ama antrenmanlar ne olacak?"',
    choices: [
      {
        t: "İşi al",
        fx: { money: 25, energy: -15, moral: -2 },
        out: "Hafta sonları tepsi taşıdın. Bir müşteri seni tanıyıp bahşişi ikiye katladı."
      },
      { t: "Basketbola odaklan", fx: { moral: 2, rel: { ark: -2 } }, out: "Cüzdan ince ama aklın sahada." }
    ]
  },
  {
    id: "gozlemci-geldi",
    w: "agent",
    when: "lower",
    who: "{agent}",
    title: "Tribünde bir yabancı",
    text: '"Bu akşam tribünde üst ligden bir gözlemci olacak. Normal oyna, abartma."',
    choices: [
      {
        t: "Gösteri yap",
        fx: { buffs: { motive: 1 }, rel: { koc: -2 } },
        out: "Isınmada smaç şovu yaptın. Koç kaşlarını çattı ama hırsın tavan."
      },
      {
        t: "Takım oyununa sadık kal",
        fx: { rel: { koc: 4, takim: 3 } },
        out: 'Gözlemci not defterine "takım oyuncusu" yazdı. Menajerin gülümsüyor.'
      }
    ]
  },
  // ---- Üst ligler ----
  {
    id: "forma-satisi",
    w: "agent",
    when: "top",
    who: "{agent}",
    title: "Forma satışları",
    text: '"Kulüp mağazasında en çok satan forma seninki! Kulüp imza günü istiyor."',
    choices: [
      {
        t: "İmza gününe git",
        fx: { energy: -10, rel: { taraf: 8 }, followers: "x1.05" },
        out: "Kuyruk mağazanın dışına taştı. Bir çocuk forma yerine okul defterini imzalattı."
      },
      {
        t: "Dinlenmem lazım",
        fx: { energy: 8, rel: { taraf: -3 } },
        out: 'Kulüp anlayışla karşıladı ama sosyal medyada "yıldız oldu, burnu havada" yorumları çıktı.'
      }
    ]
  },
  {
    id: "transfer-yasagi",
    w: "press",
    when: "top",
    who: "Spor muhabiri",
    title: "Yorumcunun eleştirisi",
    text: 'Televizyondaki ünlü yorumcu canlı yayında "Bu çocuk büyük maç oyuncusu değil" dedi. Klip dolaşıyor.',
    choices: [
      {
        t: "Yorumcuyu programa davet et, birlikte izleyin",
        fx: { followers: "x1.06", rel: { taraf: 4 } },
        out: 'Yayında maçını birlikte izlediniz. Yorumcu sonunda "Haksızlık etmişim" dedi.'
      },
      {
        t: "Görmezden gel",
        fx: { buffs: { motive: 1 } },
        out: "Telefonunun arka planı artık o yorumcunun ekran görüntüsü. Hırs yapıyorsun."
      }
    ]
  },
  {
    id: "sponsor-ayakkabi",
    w: "agent",
    when: "top",
    who: "{agent}",
    title: "Ayakkabı sponsoru",
    text: '"Yerli bir spor markası sana özel ayakkabı yapmak istiyor. Para büyük küresel markalar kadar değil ama tasarımı sana bırakıyorlar."',
    choices: [
      {
        t: "Yerli markayla çalış",
        fx: { money: "W:3", rel: { taraf: 6 } },
        out: "Ayakkabının tabanına mahallenin adını yazdırdın. İlk parti bir günde tükendi."
      },
      {
        t: "Büyük markayı bekle",
        p: 0.4,
        win: { fx: { money: "W:6", followers: "x1.05" }, out: "Beklemeye değdi: küresel marka kapıda." },
        lose: { fx: { moral: -3 }, out: "Büyük marka başka bir oyuncuyu seçti. Yerli marka da başkasıyla anlaştı." }
      }
    ]
  },
  {
    id: "doping-testi",
    w: "odd",
    when: "top",
    who: "Doping kontrol görevlisi",
    title: "Sürpriz test",
    text: "Sabah 6'da kapın çalındı: sürpriz doping testi. Dün gece arkadaşının doğum gününe gitmiştin.",
    choices: [
      { t: "Hemen teste gir", fx: { rel: { koc: 2 } }, out: 'Test temiz çıktı. Görevli "En sakin sporcu sizdiniz" dedi.' },
      {
        t: "Önce kahve, sonra test",
        fx: { moral: -2 },
        out: 'Görevli kapıda yarım saat bekledi ve raporuna "işbirliğine isteksiz" yazdı. Test temiz ama koç hiç memnun değil.'
      }
    ]
  },
  // ---- EuroLeague ----
  {
    id: "euro-seyahat",
    w: "mate",
    when: "euro",
    who: "{mate}",
    title: "Üç ülke, beş gün",
    text: "Bu hafta Madrid, Kaunas ve Pire. Uçakta uyuyamıyorsun.",
    choices: [
      {
        t: "Uyku ilacı yerine kitap",
        fx: { energy: -6, moral: 4 },
        out: "Uçuşlarda bir roman bitirdin. Kaunas'ta kafa çok daha rahattı."
      },
      {
        t: "Takımın oyun gecesine katıl",
        fx: { rel: { takim: 6 }, energy: -10 },
        out: "Uçakta okey turnuvası düzenlediniz. Pilot bile anons yaptı."
      }
    ]
  },
  {
    id: "euro-kaunas",
    w: "press",
    when: "euro",
    who: "Žalgiris Arena",
    title: "Kaunas cehennemi",
    text: "Kaunas'ta 15.000 kişi ıslık çalıyor. Isınmada biri sana bir kaşkol fırlattı.",
    choices: [
      {
        t: "Kaşkolu tribüne geri at",
        fx: { buffs: { motive: 1 }, rel: { taraf: 3 } },
        out: "Litvanyalılar bile güldü. Maç boyunca seni alkışlamakla yuhalamak arasında kaldılar."
      },
      {
        t: "Kaşkolu boynuna tak",
        fx: { followers: "x1.08", rel: { koc: -2 } },
        out: 'Görüntü bütün Avrupa\'da paylaşıldı. Koçun "Bu ne şimdi" dedi.'
      }
    ]
  },
  {
    id: "euro-dil",
    w: "mate",
    when: ["euro", "abroad"],
    who: "{mate}",
    title: "Dil kursu",
    text: "Takım arkadaşların aralarında kendi dillerinde konuşup gülüyor. Kulüp dil kursu öneriyor.",
    choices: [
      {
        t: "Kursa yazıl",
        fx: { energy: -6, rel: { takim: 7 } },
        out: "Üç hafta sonra ilk espriyi yerel dilde yaptın. Kimse gülmedi ama herkes alkışladı."
      },
      {
        t: "İngilizce yeter",
        fx: { rel: { takim: -2 } },
        out: "İngilizce idare ediyor ama soyunma odası şakalarını kaçırıyorsun."
      }
    ]
  },
  {
    id: "euro-final-four",
    w: "friend",
    when: "euro",
    who: "{friend}",
    title: "Final Four biletleri",
    text: '"Bütün mahalle Final Four\'a gelmek istiyor! On iki bilet bulabilir misin?"',
    choices: [
      {
        t: "Hepsini ayarla",
        fx: { money: -60, rel: { ark: 10, aile: 4 } },
        out: "Tribünün bir köşesi İstanbul'dan gelen mahallelilerle doldu. Pankartı herkes gördü."
      },
      {
        t: "Sadece aileme alabilirim",
        fx: { rel: { ark: -4, aile: 6 } },
        out: "{friend} biraz bozuldu ama maçı kahvehanede izleyip videoyla destek oldu."
      }
    ]
  },
  {
    id: "euro-turk-derbi",
    w: "press",
    when: "euro",
    who: "Spor muhabiri",
    title: "Türk takımına karşı",
    text: "Bu hafta EuroLeague'de bir Türk kulübüyle oynuyorsunuz. Herkes sana ne hissettiğini soruyor.",
    choices: [
      {
        t: '"Formama sadığım" de',
        fx: { rel: { koc: 5, taraf: -2 } },
        out: "Profesyonel cevap. Türk taraftarların bir kısmı kırıldı ama çoğu saygı duydu."
      },
      {
        t: '"Kalbim İstanbul\'da" de',
        fx: { rel: { koc: -4, taraf: 6 }, followers: "x1.05" },
        out: "Türkiye'de trend oldun. Kulübünün taraftarları ise pek sevinmedi."
      }
    ]
  },
  // ---- NBA ----
  {
    id: "nba-rookie",
    w: "mate",
    when: "nba",
    who: "{mate}",
    title: "Çaylak görevi",
    text: "NBA geleneği: çaylaklar takım uçağına donut taşır. Kıdemliler senden üç kutu istiyor.",
    choices: [
      {
        t: "Üç kutu baklava getir",
        fx: { money: -8, rel: { takim: 10 } },
        out: "Donut yerine baklava götürdün. Kıdemliler şok oldu, sonra kutuyu bitirdiler. Artık efsanesin."
      },
      { t: "Geleneğe uymam", fx: { rel: { takim: -6 }, moral: 2 }, out: "Kıdemliler oteldeki odanı plastik toplarla doldurdu." }
    ]
  },
  {
    id: "nba-podcast",
    w: "agent",
    when: "nba",
    who: "{agent}",
    title: "Ünlü podcast",
    text: "\"Amerika'nın en çok dinlenen basketbol podcast'i seni istiyor. Rahat ol ama dikkat et, her şey kayıtta.\"",
    choices: [
      {
        t: "Simit, çay ve Moda sahilini anlat",
        fx: { followers: "x1.12", rel: { taraf: 6 } },
        out: "Bölüm viral oldu. Sunucu ertesi hafta canlı yayında simit yedi."
      },
      { t: "Kısa ve profesyonel tut", fx: { rel: { koc: 3 } }, out: "Sakin bir bölüm. Kulüp memnun, internet seni sıkıcı buldu." }
    ]
  },
  {
    id: "nba-sakatlik-hile",
    w: "coach",
    when: "nba",
    who: "{coach}",
    title: "Yük yönetimi",
    text: '"Yarın sırt sırta ikinci maç. Seni dinlendirmek istiyorum ama yayıncı kuruluş seni sahada görmek istiyor."',
    choices: [
      {
        t: "Dinlen",
        fx: { energy: 20, rel: { taraf: -3 } },
        out: "Takım kazandı, sen kenardan izledin. Bilet alan çocukların hayal kırıklığı sosyal medyada."
      },
      {
        t: "Oynamak istiyorum",
        fx: { energy: -10, rel: { taraf: 5, koc: 2 } },
        out: "Yorgun ama sahadaydın. Maç sonu bir çocuğa ayakkabılarını hediye ettin."
      }
    ]
  },
  {
    id: "nba-hollywood",
    w: "partner",
    when: ["nba", "famous"],
    who: "Yapımcı",
    title: "Film teklifi",
    text: "Bir Hollywood yapımcısı basketbol filminde küçük bir rol teklif ediyor. Çekimler sezon arasında.",
    choices: [
      {
        t: "Kabul et",
        fx: { money: "W:2", followers: "x1.15", energy: -10 },
        out: "İki repliğin vardı, birini unuttun. Film yine de gişede iyi gitti."
      },
      { t: "Sezonuma odaklanırım", fx: { rel: { koc: 4 } }, out: 'Yapımcı "Bir dahakine" dedi. Koçun ise seni kucakladı.' }
    ]
  },
  {
    id: "nba-turk-gecesi",
    w: "press",
    when: "nba",
    who: "Kulüp yönetimi",
    title: "Türk Gecesi",
    text: 'Kulüp bir maçı "Türk Gecesi" ilan etmek istiyor: devre arasında halk dansları, girişte simit ikramı.',
    choices: [
      {
        t: "Organizasyona katıl",
        fx: { rel: { taraf: 8, aile: 6 }, followers: "x1.06" },
        out: "Salonda binlerce ay yıldızlı bayrak vardı. Devre arasında zeybeğe sen de katıldın."
      },
      {
        t: "Sadece maça odaklanayım",
        fx: { moral: 2 },
        out: "Gece yine güzel geçti ama Türk taraftarlar seni sahada dans ederken görmek isterdi."
      }
    ]
  },
  {
    id: "nba-trade",
    w: "agent",
    when: "nba",
    who: "{agent}",
    title: "Takas söylentisi",
    text: '"Takas son günü yaklaşıyor ve adın listede dolaşıyor. Kulübe ne mesaj verelim?"',
    choices: [
      {
        t: '"Burada kalmak istiyorum"',
        fx: { rel: { koc: 6, taraf: 4 } },
        out: 'Genel menajer seni aradı: "Hiçbir yere gitmiyorsun."'
      },
      {
        t: '"Yarışan bir takım istiyorum"',
        fx: { rel: { koc: -6 }, buffs: { offer: 1 } },
        out: "Söylentiler büyüdü. Sezon sonu teklifler daha iyi olacak ama koç soğuk."
      }
    ]
  },
  // ---- İlk beş / yedek ----
  {
    id: "yildiz-liderlik",
    w: "mate",
    when: "star",
    who: "{mate}",
    title: "Genç oyuncunun derdi",
    text: "Takımın en genç oyuncusu süre alamadığı için ağlıyor. Seni örnek alıyor.",
    choices: [
      {
        t: "Antrenmandan sonra onunla çalış",
        fx: { energy: -8, rel: { takim: 8 } },
        out: "Bir hafta sonra ilk sayısını attı ve sana doğru koştu."
      },
      { t: '"Sabırlı ol" de ve geç', fx: { rel: { takim: -2 } }, out: "Doğru ama kısa bir cevap. Genç oyuncu biraz bozuldu." }
    ]
  },
  {
    id: "yildiz-kaptan",
    w: "coach",
    when: ["star", "veteran"],
    who: "{coach}",
    title: "Soyunma odası konuşması",
    text: "Takım üç maçtır kaybediyor. Koç maç öncesi konuşmayı senin yapmanı istiyor.",
    choices: [
      {
        t: "Duygusal bir konuşma yap",
        fx: { rel: { takim: 8 }, buffs: { motive: 1 } },
        out: "Konuşmandan sonra kimse konuşmadı. Sahaya çıkarken herkes birbirine sarıldı."
      },
      {
        t: '"Konuşmak değil oynamak lazım" de',
        fx: { rel: { koc: 3 } },
        out: "Kısa ve net. Bazıları güldü, bazıları ciddiye aldı."
      }
    ]
  },
  {
    id: "yildiz-kiskanclik",
    w: "rival",
    when: "star",
    who: "Takımın eski yıldızı",
    title: "Kıskançlık",
    text: 'Senin yüzünden ilk beşten düşen takımın eski yıldızı basına "Takımda kayırma var" dedi.',
    choices: [
      {
        t: "Onunla yüz yüze konuş",
        fx: { rel: { takim: 6 }, moral: 3 },
        out: "Uzun bir konuşma. Sonunda el sıkıştınız. Basına ortak açıklama yaptınız."
      },
      {
        t: "Cevabı sahada ver",
        fx: { buffs: { motive: 1 }, rel: { takim: -4 } },
        out: "Bir sonraki maçta 30 sayı attın. Gerginlik ise sürüyor."
      }
    ]
  },
  {
    id: "yedek-sabir",
    w: "coach",
    when: "bench",
    who: "{coach}",
    title: "Kenarda sabır",
    text: 'Üç maçtır sahaya çıkamıyorsun. Koç seni odasına çağırdı: "Neden süre almadığını biliyor musun?"',
    choices: [
      {
        t: '"Bana ne yapmam gerektiğini söyle"',
        fx: { rel: { koc: 8 }, buffs: { motive: 1 } },
        out: "Koç savunma videolarını açtı. Bir saat konuştunuz. İlk kez sana bir plan çizdi."
      },
      {
        t: '"Haksızlık yapıyorsunuz"',
        fx: { rel: { koc: -8 }, moral: 3 },
        out: "Koç sessizce kapıyı gösterdi. İçin rahatladı ama süren artmayacak."
      }
    ]
  },
  {
    id: "yedek-ekstra",
    w: "mate",
    when: "bench",
    who: "{mate}",
    title: "Gece antrenmanı",
    text: "Yedeklerden oluşan küçük bir grup gece salonda ekstra antrenman yapıyor. Sen de gelir misin?",
    choices: [
      {
        t: "Gel",
        fx: { energy: -12, statUp: 1, rel: { takim: 5 } },
        out: "Gece yarısı salonda sadece toplar ve sesiniz vardı. {stat} +1."
      },
      { t: "Dinlenmeliyim", fx: { energy: 8 }, out: "Uyudun. Ertesi gün onların yorgun ama mutlu yüzlerini gördün." }
    ]
  },
  {
    id: "yedek-kiralik",
    w: "agent",
    when: "bench",
    who: "{agent}",
    title: "Kiralık teklif",
    text: '"Bir alt ligden kulüp seni sezon sonuna kadar kiralamak istiyor. Orada her maç oynarsın."',
    choices: [
      {
        t: "Burada kalıp yerimi kazanacağım",
        fx: { rel: { koc: 5 }, buffs: { motive: 1 } },
        out: "Koç kararını duyunca bir sonraki maçta sana süre verdi."
      },
      {
        t: "Sezon sonunda değerlendirelim",
        fx: { buffs: { offer: 1 } },
        out: "Menajerin not aldı. Sezon sonunda masada daha çok seçenek olacak."
      }
    ]
  },
  // ---- Genç / tecrübeli ----
  {
    id: "genc-sosyal",
    w: "friend",
    when: "young",
    who: "{friend}",
    title: "Viral dans",
    text: '"Herkes bu dansı yapıyor! Formanla bir video çekelim mi?"',
    choices: [
      {
        t: "Çekelim",
        fx: { followers: "x1.08", rel: { koc: -2 } },
        out: "Video milyonlarca izlendi. Koçun seni antrenmanda dans adımlarıyla karşıladı."
      },
      { t: "Ben dans etmem", fx: { rel: { ark: -2 } }, out: '{friend} videoyu yalnız çekti. Altına "Abim utangaç" yazdı.' }
    ]
  },
  {
    id: "genc-araba",
    w: "dad",
    when: ["young", "pro"],
    who: "{dad}",
    title: "İlk araba",
    text: '"Oğlum, ilk büyük maaşını aldın. Hemen spor araba alma. Önce bir ev düşün."',
    choices: [
      {
        t: "Babanı dinle, parayı biriktir",
        fx: { rel: { aile: 8 } },
        out: 'Baban gururla herkese "Bizim oğlan akıllı" diye anlattı.'
      },
      { t: "Bir hayat yaşıyoruz baba", fx: { moral: 6, rel: { aile: -4 } }, out: 'Baban iç çekti: "Benim de gençliğim vardı."' }
    ]
  },
  {
    id: "genc-sinav",
    w: "mom",
    when: ["young", "school"],
    who: "{mom}",
    title: "Karne günü",
    text: '"Karnen geldi. Matematik biraz düşük. Basketbol iyi de okulu bırakma, söz ver."',
    choices: [
      {
        t: "Söz veriyorum anne",
        fx: { aka: 5, rel: { aile: 5 } },
        out: "O hafta her akşam bir saat matematik çalıştın. Annen kekle ödüllendirdi."
      },
      { t: "Ben NBA'e gideceğim anne", fx: { aka: -3, moral: 3, rel: { aile: -3 } }, out: 'Annen gülümsedi: "Önce lise".' }
    ]
  },
  {
    id: "veteran-diz",
    w: "coach",
    when: "veteran",
    who: "Fizyoterapist",
    title: "Diz alarmı",
    text: '"Dizlerin yorgun. Bu hafta antrenman yükünü azaltmamız lazım, yoksa sakatlık riski artar."',
    choices: [
      { t: "Programı uygula", fx: { energy: 15, rel: { koc: 2 } }, out: "Bir hafta havuz ve bisiklet. Dizlerin teşekkür etti." },
      {
        t: "Ben her zamanki gibi çalışırım",
        fx: { energy: -10, statUp: 1 },
        out: "Antrenmanda gençleri geçtin ama akşam buz torbalarıyla uyudun."
      }
    ]
  },
  {
    id: "veteran-genc-yetenek",
    w: "mate",
    when: "veteran",
    who: "Takımın genç yeteneği",
    title: "Yer kapma",
    text: 'Takıma senin pozisyonunda 19 yaşında bir yetenek geldi. Medya "Bayrak devri" diye yazıyor.',
    choices: [
      {
        t: "Ona abilik yap",
        fx: { rel: { takim: 8, taraf: 3 } },
        out: 'Gençle birlikte sabah antrenmanlarına başladın. Medya bu sefer "Usta-çırak" yazıyor.'
      },
      {
        t: "Yerini kolay bırakma",
        fx: { buffs: { motive: 1 }, rel: { takim: -3 } },
        out: "Antrenmanlarda bire birler kızıştı. Koç memnun, genç biraz korkmuş."
      }
    ]
  },
  {
    id: "veteran-roportaj",
    w: "press",
    when: "veteran",
    who: "Belgesel ekibi",
    title: "Kariyer belgeseli",
    text: "Bir belgesel ekibi kariyerini anlatan bir film çekmek istiyor. Moda sahilinden bugüne.",
    choices: [
      {
        t: "Kabul et, ailemi de çek",
        fx: { rel: { aile: 8, taraf: 6 }, followers: "x1.06" },
        out: "Annenin çocukluk fotoğraflarını gösterdiği sahne herkesi ağlattı."
      },
      { t: "Kariyerim bitince", fx: { moral: 2 }, out: 'Ekip "O zaman daha güzel olur" dedi ve numaralarını bıraktı.' }
    ]
  },
  // ---- Para ve şöhret ----
  {
    id: "zengin-akraba",
    w: "dad",
    when: "rich",
    who: "Uzak akraba",
    title: "Uzak akrabalar",
    text: 'Hiç tanımadığın bir akraban aradı: "Yeğenim! Bir iş fikrim var, sadece biraz sermaye lazım."',
    choices: [
      { t: "Kibarca reddet", fx: { rel: { aile: -2 } }, out: 'Akraban "Unutmayacağım" dedi. Annen "İyi yaptın" diye fısıldadı.' },
      {
        t: "Biraz yardım et",
        fx: { money: -400 },
        p: 0.15,
        win: { fx: { money: 1200 }, out: "İnanılmaz ama iş tuttu! Kârından payını gönderdi." },
        lose: { out: "İş üç ayda battı. Akraban bir daha aramadı." }
      }
    ]
  },
  {
    id: "zengin-bagis",
    w: "press",
    when: "rich",
    who: "Okulun müdürü",
    title: "Eski okulun",
    text: "Mavi Martı Spor Lisesi'nin salonunun çatısı akıyor. Müdür utana sıkıla aradı.",
    choices: [
      {
        t: "Çatıyı yaptır",
        fx: { money: -300, rel: { taraf: 8, aile: 6 } },
        out: "Yeni çatının altına bir plaket asıldı. Açılışta eski koçun konuşma yaptı."
      },
      { t: "Kulübe yönlendir", fx: { rel: { taraf: -2 } }, out: "Müdür anlayışla karşıladı ama sesi hayal kırıklığıyla doluydu." }
    ]
  },
  {
    id: "batik-kredi",
    w: "agent",
    when: "broke",
    who: "{agent}",
    title: "Avans",
    text: '"Hesabın eksi. Kulüpten maaş avansı isteyebiliriz ama koç bunu sevmez."',
    choices: [
      { t: "Avans iste", fx: { money: "W:1", rel: { koc: -4 } }, out: 'Avans geldi. Koç "Hayatını düzene sok" dedi.' },
      { t: "Kemer sık, idare et", fx: { moral: -4, energy: -4 }, out: "İki hafta makarnayla yaşadın. Ama borçsuzsun." }
    ]
  },
  {
    id: "unlu-hayran",
    w: "partner",
    when: "famous",
    who: "Ünlü şarkıcı",
    title: "Ünlü hayran",
    text: "Ünlü bir şarkıcı konserinde senin adını söyledi ve sahneye davet etti.",
    choices: [
      {
        t: "Sahneye çık",
        fx: { followers: "x1.1", energy: -8 },
        out: "Nakaratı birlikte söylediniz. Sesin berbattı ama salon yıkıldı."
      },
      { t: "Seyirciden el salla", fx: { followers: "x1.03" }, out: "Kameralar sana döndü. Gülümsedin ve el salladın." }
    ]
  },
  {
    id: "unlu-sahte-hesap",
    w: "friend",
    when: "famous",
    who: "{friend}",
    title: "Sahte hesap",
    text: '"Senin adına sahte bir hesap açılmış, insanlardan para istiyor!"',
    choices: [
      {
        t: "Hemen açıklama yap",
        fx: { rel: { taraf: 4 }, energy: -4 },
        out: "Hesap kapatıldı. Açıklaman binlerce kez paylaşıldı."
      },
      { t: "Menajerime bırak", fx: { moral: -2 }, out: "Hesap üç gün açık kaldı. Birkaç taraftar dolandırıldı." }
    ]
  },
  // ---- İlişkiler ----
  {
    id: "partner-yildonumu",
    w: "partner",
    when: "partner",
    who: "Partnerin",
    title: "Yıl dönümü",
    text: "Yıl dönümünüz maç gününe denk geldi.",
    choices: [
      {
        t: "Maçtan sonra sürpriz yemek",
        fx: { rel: { partner: 10 }, energy: -6 },
        out: "Gece yarısı açık kalan tek restoranda kutladınız. Garson seni tanıyıp tatlıyı ikram etti."
      },
      { t: "Ertesi güne ertele", fx: { rel: { partner: -6 } }, out: '"Anlıyorum" dedi. Sesi anlayışlı değildi.' }
    ]
  },
  {
    id: "partner-tasinma",
    w: "partner",
    when: ["partner", "abroad"],
    who: "Partnerin",
    title: "Uzak mesafe",
    text: '"Sen başka bir ülkedesin, ben İstanbul\'dayım. Ben de oraya gelsem mi?"',
    choices: [
      {
        t: "Gel, birlikte yaşayalım",
        fx: { rel: { partner: 15 }, moral: 6 },
        out: "Havalimanında kucaklaştınız. Daire artık daha sıcak."
      },
      {
        t: "Şimdilik böyle devam edelim",
        fx: { rel: { partner: -8 } },
        out: "Görüntülü konuşmalar devam ediyor ama aranıza mesafe giriyor."
      }
    ]
  },
  {
    id: "anne-hasta",
    w: "mom",
    when: "pro",
    who: "{dad}",
    title: "Annen hastanede",
    text: '"Annen hafif bir rahatsızlıkla hastaneye kaldırıldı. Merak etme, iyi. Ama seni soruyor."',
    choices: [
      {
        t: "İlk uçakla git",
        fx: { rel: { aile: 15, koc: -3 }, energy: -10 },
        out: 'Annen seni görünce "Maçın ne olacak?" diye kızdı ama gözleri parlıyordu.'
      },
      {
        t: "Görüntülü ara, hafta sonu git",
        fx: { rel: { aile: 4 } },
        out: "Telefonda güldü. Hafta sonu yanına gittiğinde çoktan taburcu olmuştu."
      }
    ]
  },
  // ---- Milli takım / rakip ----
  {
    id: "milli-forma",
    w: "press",
    when: "national",
    who: "Federasyon",
    title: "Forma imza kampanyası",
    text: "Federasyon, milli formanın satışından gelen parayı köy okullarına spor malzemesine ayıracak. Yüz olmanı istiyorlar.",
    choices: [
      {
        t: "Yüz ol",
        fx: { rel: { taraf: 8 }, followers: "x1.05", energy: -6 },
        out: "Reklamda bir köy okulunda çocuklarla basket attın. Görüntüler herkesi duygulandırdı."
      },
      { t: "Takvimim dolu", fx: { rel: { taraf: -2 } }, out: "Federasyon başka bir oyuncuyla anlaştı." }
    ]
  },
  {
    id: "milli-marş",
    w: "mom",
    when: "national",
    who: "{mom}",
    title: "Marş anı",
    text: '"Dün milli maçta marş okunurken kamera sana döndü. Gözlerin dolmuştu. Komşular hep onu konuşuyor."',
    choices: [
      {
        t: '"Her seferinde öyle oluyor anne"',
        fx: { rel: { aile: 6, taraf: 4 } },
        out: "Annen o görüntüyü telefonunun ekranına koydu."
      },
      { t: '"Gözüme bir şey kaçtı"', fx: { moral: 2 }, out: 'Annen güldü: "Tabii tabii."' }
    ]
  },
  {
    id: "rakip-onde",
    w: "rival",
    when: "rivalAhead",
    who: "{rival}",
    title: "Rakibinden mesaj",
    text: '{rival} sosyal medyada sana yazdı: "Yukarıda görüşürüz, kardeşim." İğneleme mi, dostluk mu belli değil.',
    choices: [
      {
        t: '"Yakında oradayım" diye cevap ver',
        fx: { buffs: { motive: 1 }, followers: "x1.03" },
        out: "Mesajlaşma binlerce beğeni aldı. Antrenmanda ekstra tur attın."
      },
      { t: "Cevap verme", fx: { moral: -2 }, out: "Mesaj okundu olarak kaldı. Akşam yine aklına geldi." }
    ]
  },
  // ---- Moral / yorgunluk ----
  {
    id: "moral-dusuk",
    w: "friend",
    when: "lowMorale",
    who: "{friend}",
    title: "Eski arkadaşlar",
    text: '"Uzun zamandır görüşmedik. Moda\'da çay içelim mi? Eskisi gibi."',
    choices: [
      {
        t: "Hemen gel",
        fx: { moral: 10, rel: { ark: 8 } },
        out: "Sahilde saatlerce konuştunuz. Kimse basketbolu sormadı. Tam ihtiyacın olan buydu."
      },
      { t: "Kafam çok dolu", fx: { moral: -2, rel: { ark: -4 } }, out: "{friend} anlayışla karşıladı ama sesi üzgündü." }
    ]
  },
  {
    id: "moral-psikolog",
    w: "coach",
    when: "lowMorale",
    who: "Kulüp psikoloğu",
    title: "Kulüp psikoloğu",
    text: 'Kulübün spor psikoloğu kapını çaldı: "Son maçlarda yüzün gülmüyor. Konuşmak ister misin?"',
    choices: [
      {
        t: "Konuşalım",
        fx: { moral: 12, rel: { koc: 2 } },
        out: "Bir saatlik konuşma. Çıkarken omuzlarından bir yük kalkmış gibiydi."
      },
      { t: "İyiyim, gerek yok", fx: { moral: -1 }, out: 'Psikolog kartını bıraktı: "Kapım açık."' }
    ]
  },
  {
    id: "yorgun-uyku",
    w: "mom",
    when: "tired",
    who: "{mom}",
    title: "Uykusuz geceler",
    text: '"Sesin çok yorgun geliyor. Gece kaçta yatıyorsun sen?"',
    choices: [
      {
        t: "Bu hafta erken yatacağım",
        fx: { energy: 15, moral: 2 },
        out: "Telefonu yatak odasının dışında bıraktın. Üç gece sonra yeni bir insan gibiydin."
      },
      { t: "Oyunlar uzun sürüyor anne", fx: { moral: 2, energy: -4 }, out: "Annen derin bir iç çekti. Konsol hâlâ açık." }
    ]
  },
  {
    id: "yorgun-masaj",
    w: "mate",
    when: "tired",
    who: "{mate}",
    title: "Masaj koltuğu",
    text: '"Kulüp yeni bir masaj koltuğu almış ama sıra çok uzun. Bana yer ayırttım, istersen senin olsun."',
    choices: [
      {
        t: "Teşekkür et, kullan",
        fx: { energy: 12, rel: { takim: 3 } },
        out: "Koltukta uyuyakaldın. {mate} sana battaniye örttü."
      },
      { t: "Sen kullan, ben iyiyim", fx: { rel: { takim: 5 } }, out: '{mate} "Sen gerçek takım arkadaşısın" dedi.' }
    ]
  }
];
