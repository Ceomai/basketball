"use strict";
/* ================= KAYIT SİSTEMİ =================
   5 kariyer yuvası. Her yazımda bir önceki sağlam kayıt yedeğe alınır; ana kayıt bozulursa yedekten açılır.
   Tarayıcı kaydı kapalıysa ya da depolama doluysa oyuncu uyarılır ve kayıt kodu ile ilerlemesini taşıyabilir. */
const SLOT_N=5,SAVE_V=4,LEGACY_KEY="pota-kariyeri-v3";
const slotKey=i=>`pota-slot-${i}`;
let storageOK=true,storageWarned=false;
try{const k="__pota_test";localStorage.setItem(k,"1");localStorage.removeItem(k)}catch(e){storageOK=false}
function validSave(o){return o&&typeof o==="object"&&o.first&&o.team&&o.team.key&&o.st&&o.league&&Array.isArray(o.league)&&o.rel}
function readKey(k){try{const raw=localStorage.getItem(k);if(!raw)return null;const o=JSON.parse(raw);const s=o&&o.v?o.S:o;return validSave(s)?s:null}catch(e){return null}}
function save(){
  if(!S||!S.saveSlot)return;
  if(!storageOK){if(!storageWarned){storageWarned=true;toast("Tarayıcı kaydı kapalı. İlerlemeni korumak için Kayıtlar ekranından kayıt kodunu kopyala.")}return}
  const k=slotKey(S.saveSlot),data=JSON.stringify({v:SAVE_V,ts:Date.now(),S});
  const write=()=>{const prev=localStorage.getItem(k);if(prev){try{const p=JSON.parse(prev);if(validSave(p.v?p.S:p))localStorage.setItem(k+"-bak",prev)}catch(_){}}localStorage.setItem(k,data)};
  try{write()}catch(e){
    // yer açmak için diğer yuvaların yedeklerini silip tekrar dene
    try{for(let i=1;i<=SLOT_N;i++)if(i!==S.saveSlot)localStorage.removeItem(slotKey(i)+"-bak");write()}
    catch(e2){if(!storageWarned){storageWarned=true;toast("Kayıt yapılamadı: tarayıcı depolaması dolu. Kayıtlar ekranından kayıt kodunu kopyala.")}}
  }
}
function loadSlot(i){
  const main=readKey(slotKey(i));if(main){main.saveSlot=i;return{S:main,from:"main"}}
  const bak=readKey(slotKey(i)+"-bak");if(bak){bak.saveSlot=i;return{S:bak,from:"backup"}}
  let corrupt=false;try{corrupt=!!localStorage.getItem(slotKey(i))}catch(e){}
  return corrupt?{S:null,from:"corrupt"}:null;
}
function deleteSlot(i){try{localStorage.removeItem(slotKey(i));localStorage.removeItem(slotKey(i)+"-bak")}catch(e){}}
function migrateLegacy(){try{const old=readKey(LEGACY_KEY);if(old&&!localStorage.getItem(slotKey(1))){old.saveSlot=1;localStorage.setItem(slotKey(1),JSON.stringify({v:SAVE_V,ts:Date.now(),S:old}));localStorage.removeItem(LEGACY_KEY)}}catch(e){}}
// kayıt kodu: cihazlar arası taşıma ve depolama kapalıyken yedek
const encodeSave=s=>btoa(unescape(encodeURIComponent(JSON.stringify({v:SAVE_V,S:s}))));
function decodeSave(code){try{const o=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));const s=o.v?o.S:o;return validSave(s)?s:null}catch(e){return null}}

/* ================= KAYIT EKRANI ================= */
function slotSummary(s){return`${s.age} yaş · ${esc(s.team.name)} · ${s.retired?"Emekli":`${s.year}–${String(s.year+1).slice(2)} sezonu`}`}
function renderSlots(){
  if(S)save();S=null;setTeamVars();closeSheet();window.scrollTo(0,0);migrateLegacy();
  const rows=[];for(let i=1;i<=SLOT_N;i++)rows.push([i,loadSlot(i)]);
  app.innerHTML=`<div style="padding-top:18px" class="row between nowrap"><div><div class="eyebrow">Basketbol kariyer simülasyonu</div><h1>Pota<br>Kariyeri</h1></div><button class="btn ghost sm" id="help0">Kılavuz</button></div>
   ${storageOK?"":`<div class="say" style="border-left-color:var(--bad)">Tarayıcı kaydı kapalı (gizli sekme ya da engellenmiş site verisi). Oynayabilirsin ama sayfa kapanınca ilerleme kaybolur. Oyun içinden kayıt kodunu kopyalayarak saklayabilirsin.</div>`}
   <div class="eyebrow">Kariyer yuvaları · en fazla ${SLOT_N}</div>
   <div class="choices">${rows.map(([i,r])=>!r?`<div class="act"><div class="ai">${icon("plus")}</div><div><h3>Yuva ${i} · boş</h3><p>Yeni bir kariyer başlat.</p></div><button class="btn pri sm" data-new="${i}">Yeni kariyer</button></div>`
     :r.from==="corrupt"?`<div class="act"><div class="ai">${icon("door")}</div><div><h3>Yuva ${i} · okunamadı</h3><p>Kayıt bozulmuş ve yedek bulunamadı.</p></div><button class="btn bad sm" data-del="${i}">Yuvayı temizle</button></div>`
     :`<div class="act"><div class="ai" data-pp="${i}"></div><div><h3>${esc(r.S.first+" "+r.S.last)}</h3><p>${slotSummary(r.S)}${r.from==="backup"?' · <span class="warn">yedekten açılacak</span>':""}</p></div><div class="grid2" style="grid-column:1/-1"><button class="btn ghost sm" data-del="${i}">Sil</button><button class="btn team sm" data-go="${i}">${r.S.retired?"Görüntüle":"Devam et"}</button></div></div>`).join("")}</div>
   <div class="card"><div class="eyebrow">Kayıt kodu</div><p class="small muted">Başka bir cihazdan getirdiğin kayıt kodunu buraya yapıştır. Kod ilk boş yuvaya yüklenir.</p><textarea id="imp" rows="3" style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:10px;font-family:monospace;font-size:16px" placeholder="Kayıt kodunu yapıştır" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><div class="grid2"><button class="btn ghost sm" id="pst">Panodan yapıştır</button><button class="btn sm" id="impb">Kodu yükle</button></div></div>`;
  rows.forEach(([i,r])=>{if(r&&r.S){const el=$(`[data-pp="${i}"]`);if(el){el.innerHTML="";el.appendChild(portrait(r.S.look,{jersey:r.S.team.c1,trim:r.S.team.c2,number:r.S.num,mood:"mutlu"},52,52,r.S.team.c1))}}});
  $$("[data-new]").forEach(b=>b.onclick=()=>{F.slot=+b.dataset.new;renderCreate()});
  $$("[data-go]").forEach(b=>b.onclick=()=>{const r=loadSlot(+b.dataset.go);if(!r||!r.S)return;S=r.S;migrate();if(r.from==="backup"){save();toast("Ana kayıt bozuktu, son yedekten açıldı.")}S.retired?retireScreen():renderMain()});
  $$("[data-del]").forEach(b=>b.onclick=()=>{const i=+b.dataset.del;sheet("Yuvayı sil",`Yuva ${i}`,`<p>Bu kariyer ve yedeği kalıcı olarak silinecek.</p><div class="grid2"><button class="btn ghost" id="n1">Vazgeç</button><button class="btn bad" id="y1">Sil</button></div>`,{onClose:renderSlots});$("#n1").onclick=renderSlots;$("#y1").onclick=()=>{deleteSlot(i);renderSlots()}});
  $("#impb").onclick=()=>{const s=decodeSave($("#imp").value);if(!s){toast("Kod okunamadı. Tamamını kopyaladığından emin ol.");return}
    const free=rows.find(([,r])=>!r);if(!free){toast("Boş yuva yok. Önce bir yuvayı sil.");return}S=s;S.saveSlot=free[0];migrate();save();toast(`Kayıt Yuva ${free[0]}'e yüklendi.`);renderMain()};
  $("#pst").onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t)throw 0;$("#imp").value=t.trim();toast("Kod yapıştırıldı. Şimdi Kodu yükle'ye bas.")}catch(e){$("#imp").focus();toast("Pano okunamadı. Kutuya basılı tutup Yapıştır'ı seç.")}};
  $("#help0").onclick=()=>guideSheet();
}
function exportSheet(){
  const code=encodeSave(S);
  sheet("Kayıt kodu","Yedek ve cihaz taşıma",`<p class="small muted">Bu kod kariyerinin tamamını içerir. Bir yere kaydet ya da diğer cihazda Kayıtlar ekranına yapıştır.</p><textarea id="exp" rows="6" readonly style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:10px;font-family:monospace;font-size:.7rem;-webkit-user-select:all;user-select:all">${code}</textarea><button class="btn pri" id="cpy">Kopyala</button>`);
  $("#cpy").onclick=async()=>{try{await navigator.clipboard.writeText(code);toast("Kayıt kodu kopyalandı.")}catch(e){const t=$("#exp");t.focus();t.select();toast("Kod seçildi, kopyalamak için basılı tut.")}};
}
