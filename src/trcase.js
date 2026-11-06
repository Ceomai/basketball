/* ================= TÜRKÇE ÖZEL ADLARDA BÜYÜK HARF =================
   İngilizce arayüzde CSS `text-transform: uppercase` İngilizce kurallarıyla çalışır: "Şahin" → "ŞAHIN",
   "Lisesi" → "LISESI" olur (doğrusu ŞAHİN, LİSESİ). İngilizce kelimeler ("Win") etkilenmemeli; bu yüzden
   yalnızca büyük harfli alanlardaki Türkçe özel adlar (oyuncu/koç adları, Türk şehirleri, Türk takım adları)
   <span lang="tr"> içine alınır ve tarayıcı onları Türkçe kurallarıyla büyütür. Türkçe arayüzde hiçbir şey yapılmaz. */
import { LANG } from "./i18n/index.js";
import { LEAGUES } from "./data.js";
import { S, NAME_FIRST, NAME_LAST, fullName } from "./core.js";
import { late } from "./late.js";

// büyük harfe çevrilen alanlar (index.html'deki text-transform:uppercase seçicileri)
const SEL = "h1,h2,h3,.disp,.eyebrow,.btn,.hud-id,.nm,.hs,.k,.tagx,.tabs button,th,.pill,.choice .ct,.mgtop,.venue,.vlab b";
const WORD = /[\p{L}]+/gu;
let vocab = null,
  vkey = "";

const addWords = (set, s) => {
  for (const w of String(s || "").match(WORD) || []) if (w.includes("i")) set.add(w); // yalnız "i" farklı büyür
};
/** Türkçe özel ad sözlüğü (kariyer değiştikçe yenilenir) */
export function trcVocab() {
  const key = S ? `${S.season}|${S.team && S.team.key}|${S.first}|${S.last}` : "-";
  if (vocab && key === vkey) return vocab;
  vkey = key;
  const v = new Set();
  const tr = LEAGUES.TR || {};
  for (const list of [tr.cities, tr.first, tr.last, NAME_FIRST, NAME_LAST]) for (const w of list || []) addWords(v, w);
  if (S) {
    addWords(v, fullName());
    for (const n of Object.values(S.npc || {})) if (typeof n === "string") addWords(v, n);
    if (S.partner) addWords(v, S.partner);
    for (const t of Object.values(S.teams || {})) if (t && t.cc === "TR") addWords(v, `${t.name} ${t.city || ""}`);
  }
  for (const st of ["lise", "uni", "t3", "t2", "t1"])
    try {
      for (const t of (late.leaguePool && late.leaguePool(st, "TR")) || []) addWords(v, `${t.name} ${t.city || ""}`);
    } catch (e) {
      /* lig havuzu hazır değil */
    }
  vocab = v;
  return v;
}
/** Bir öğenin metin düğümlerinde Türkçe özel adları <span lang="tr"> ile sarar */
export function trcWrap(el) {
  const v = trcVocab();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!(n.parentElement && n.parentElement.closest('[lang="tr"]'))) nodes.push(n);
  let changed = 0;
  for (const n of nodes) {
    const s = n.nodeValue;
    if (!s || !s.includes("i")) continue;
    let last = 0,
      frag = null;
    for (const m of s.matchAll(WORD)) {
      if (!v.has(m[0])) continue;
      frag = frag || document.createDocumentFragment();
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const sp = document.createElement("span");
      sp.lang = "tr";
      sp.textContent = m[0];
      frag.appendChild(sp);
      last = m.index + m[0].length;
    }
    if (!frag) continue;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    n.parentNode.replaceChild(frag, n);
    changed++;
  }
  return changed;
}
let queued = false;
function scan() {
  queued = false;
  if (LANG !== "en" || !document.body) return;
  for (const el of document.querySelectorAll(SEL)) {
    if (el.closest("svg")) continue;
    const t = el.textContent;
    if (el.__trc === t) continue; // değişmemiş
    trcWrap(el);
    el.__trc = el.textContent;
  }
}
if (typeof window !== "undefined" && typeof MutationObserver !== "undefined" && LANG === "en") {
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    setTimeout(scan, 120); // maç animasyonu gibi sık değişimlerde seyrek tarama
  });
  const start = () => {
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    scan();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
}
