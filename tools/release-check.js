// Yayın kapısı: mağazaya gidecek paketten ÖNCE çalışır (CI'da imzalı AAB adımı; elle: npm run release:check).
// Test reklam kimliği, gerçek marka adı bayrağı, gizlilik sayfasındaki yer tutucular gibi "sonradan sorun" çıkaracak
// her şeyi yakalar. Sorun varsa çıkış kodu 1. Kapalı test için bilerek test reklamı: ALLOW_TEST_ADS=1.
// Kullanım: node tools/release-check.js [--dist]   (--dist: derlenmiş dist/ içinde test kimliği arar)
const fs = require("fs"),
  path = require("path");

const ROOT = path.resolve(__dirname, "..");
const env = process.env;
const TEST = /ca-app-pub-3940256099942544/;
const problems = [],
  notes = [];
const allowTest = env.ALLOW_TEST_ADS === "1";

// 1) AdMob: uygulama kimliği + 2 Android reklam birimi (iOS paketlenirken iOS kimlikleri)
const need = [
  ["ADMOB_APP_ID", /^ca-app-pub-\d+~\d+$/],
  ["VITE_ADMOB_REWARDED_ANDROID", /^ca-app-pub-\d+\/\d+$/],
  ["VITE_ADMOB_INTERSTITIAL_ANDROID", /^ca-app-pub-\d+\/\d+$/]
];
if (env.RELEASE_IOS === "1")
  need.push(["VITE_ADMOB_REWARDED_IOS", /^ca-app-pub-\d+\/\d+$/], ["VITE_ADMOB_INTERSTITIAL_IOS", /^ca-app-pub-\d+\/\d+$/]);
for (const [k, rx] of need) {
  const v = (env[k] || "").trim();
  const bad = !v ? "tanımlı değil" : !rx.test(v) ? "biçimi yanlış" : TEST.test(v) ? "Google TEST kimliği" : "";
  if (bad) (allowTest ? notes : problems).push(`${k}: ${bad}`);
}
// 2) Marka: gerçek adlarla derleme mağazaya gitmez
if (env.VITE_REAL_NAMES === "1")
  problems.push("VITE_REAL_NAMES=1: gerçek kulüp/lig adları açık (src/brand.js). Mağaza derlemesinde kaldır.");
// 3) Gizlilik ve veri silme sayfaları: yer tutucu kalmasın
for (const f of ["public/privacy.html", "public/delete-data.html"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    problems.push(`${f} yok`);
    continue;
  }
  const s = fs.readFileSync(p, "utf8");
  if (/\[(iletişim e-postası|contact email)\]/.test(s)) problems.push(`${f}: iletişim e-postası yer tutucusu duruyor`);
}
// 4) Derlenmiş paket: test kimliği gömülü mü?
if (process.argv.includes("--dist")) {
  const dir = path.join(ROOT, "dist");
  const walk = d =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  if (!fs.existsSync(dir)) problems.push("dist/ yok: önce npm run build");
  else {
    const hit = walk(dir).filter(f => /\.(js|html)$/.test(f) && TEST.test(fs.readFileSync(f, "utf8")));
    // test kimlikleri yedek olarak koda gömülüdür; ortam kimlikleri verildiyse derleme onları kullanır
    if (hit.length && need.some(([k]) => !env[k]))
      (allowTest ? notes : problems).push("dist/ test reklam kimlikleriyle derlenmiş");
  }
}
if (notes.length) console.log("Uyarı (ALLOW_TEST_ADS=1):\n- " + notes.join("\n- "));
if (problems.length) {
  console.error("YAYIN KAPISI KAPALI:\n- " + problems.join("\n- ") + "\nAyrıntı: docs/YAYIN_KONTROL.md");
  process.exit(1);
}
console.log("Yayın kapısı: tamam.");
