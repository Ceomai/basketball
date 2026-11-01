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
  idbPut(k,data);askPersist();
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
function deleteSlot(i){try{localStorage.removeItem(slotKey(i));localStorage.removeItem(slotKey(i)+"-bak")}catch(e){}idbDel(slotKey(i))}
function migrateLegacy(){try{const old=readKey(LEGACY_KEY);if(old&&!localStorage.getItem(slotKey(1))){old.saveSlot=1;localStorage.setItem(slotKey(1),JSON.stringify({v:SAVE_V,ts:Date.now(),S:old}));localStorage.removeItem(LEGACY_KEY)}}catch(e){}}
// kayıt kodu: cihazlar arası taşıma ve depolama kapalıyken yedek
const encodeSave=s=>btoa(unescape(encodeURIComponent(JSON.stringify({v:SAVE_V,S:s}))));
function decodeSave(code){try{const o=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));const s=o.v?o.S:o;return validSave(s)?s:null}catch(e){return null}}

/* ---- İkinci kopya: IndexedDB ----
   Her kayıt IndexedDB'ye de yazılır. Açılışta tarayıcı hafızasındaki kayıt eksik, bozuk ya da daha eskiyse
   IndexedDB'deki kopya geri yüklenir. (Telefon tarayıcısının site verisini tamamen silmesine karşı asıl çare
   oyunu ana ekrana kurmak ve yedek dosyası almaktır.) */
const IDB={db:null};
function idbOpen(){return new Promise(res=>{try{const r=indexedDB.open("pota-kariyeri",1);r.onupgradeneeded=()=>r.result.createObjectStore("slots");r.onsuccess=()=>{IDB.db=r.result;res(r.result)};r.onerror=r.onblocked=()=>res(null)}catch(e){res(null)}})}
function idbPut(k,v){if(!IDB.db)return;try{IDB.db.transaction("slots","readwrite").objectStore("slots").put(v,k)}catch(e){}}
function idbDel(k){if(!IDB.db)return;try{IDB.db.transaction("slots","readwrite").objectStore("slots").delete(k)}catch(e){}}
function idbAll(){return new Promise(res=>{const out={};if(!IDB.db)return res(out);try{const rq=IDB.db.transaction("slots").objectStore("slots").openCursor();rq.onsuccess=()=>{const c=rq.result;if(c){out[c.key]=c.value;c.continue()}else res(out)};rq.onerror=()=>res(out)}catch(e){res(out)}})}
const parseSave=raw=>{try{const o=typeof raw==="string"?JSON.parse(raw):raw;return o&&validSave(o.v?o.S:o)?o:null}catch(e){return null}};
async function storageRestore(){
  if(!window.indexedDB)return 0;await Promise.race([idbOpen(),new Promise(r=>setTimeout(r,1500))]);
  const all=await idbAll();let n=0;
  for(let i=1;i<=SLOT_N;i++){const k=slotKey(i),db=parseSave(all[k]);if(!db)continue;let cur=null;try{cur=parseSave(localStorage.getItem(k))}catch(e){}
    if(!cur||(db.ts||0)>(cur.ts||0)){try{localStorage.setItem(k,typeof all[k]==="string"?all[k]:JSON.stringify(all[k]));n++}catch(e){}}
    else if(cur&&(cur.ts||0)>(db.ts||0))idbPut(k,localStorage.getItem(k))}
  if(n)setTimeout(()=>toast(`${n} kariyer yedek kopyadan geri yüklendi.`),600);
  return n;
}
// Tarayıcıdan "kalıcı depolama" izni iste: verilirse site verisi yer darlığında silinmez
function askPersist(){if(askPersist.done)return;askPersist.done=1;try{navigator.storage&&navigator.storage.persist&&navigator.storage.persisted().then(p=>p||navigator.storage.persist()).catch(()=>{})}catch(e){}}
const isInstalled=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};

/* ---- Yedek dosyası ---- */
const saveFileName=s=>`pota-kariyeri-${(s.first+"-"+s.last).toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9-]/g,"")}-${s.age}yas.pota`;
function markBackup(){if(!S)return;S.bk={season:S.season,week:S.week,ts:Date.now()};save()}
async function downloadSave(){
  const name=saveFileName(S),blob=new Blob([encodeSave(S)],{type:"text/plain"});
  try{const file=new File([blob],name,{type:"text/plain"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Pota Kariyeri yedeği"});markBackup();toast("Yedek paylaşıldı.");return}}
  catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);markBackup();toast("Yedek dosyası indirildi.");
}
function readFileText(input){return new Promise(res=>{const f=input.files&&input.files[0];if(!f)return res("");const r=new FileReader();r.onload=()=>res(String(r.result||""));r.onerror=()=>res("");r.readAsText(f)})}
function importCode(code){
  const s=decodeSave(code||"");if(!s){toast("Kayıt okunamadı. Dosyanın ya da kodun tamamı olduğundan emin ol.");return false}
  let free=0;for(let i=1;i<=SLOT_N;i++)if(!loadSlot(i)){free=i;break}
  if(!free){toast("Boş yuva yok. Önce bir yuvayı sil.");return false}
  S=s;S.saveSlot=free;migrate();save();toast(`Kayıt Yuva ${free}'e yüklendi.`);renderMain();return true;
}
// Yedek hatırlatması: kurulu değilse 2 sezonda, kuruluysa 4 sezonda bir
function backupNudge(){
  if(!S||SETTINGS.backupNag===false||S.week!==3||S.phase!=="regular"||S.season<2)return;
  const gap=S.season-((S.bk&&S.bk.season)||0);if(gap<(isInstalled()?4:2))return;
  sheet("Kariyerini yedekle","Bir dakika sürer",`<div class="card"><div class="eyebrow">Neden?</div><p>Kariyerin bu cihazın tarayıcı hafızasında duruyor. Telefon tarayıcıları uzun süre açılmayan sitelerin verisini silebiliyor, cihaz da kaybolabilir. Bir yedek dosyası alırsan kariyerini her zaman geri yükleyebilirsin.</p>${isInstalled()?"":`<p class="small muted">En güvenli yol: oyunu ana ekrana ekle. Ayarlar'da nasıl yapılacağı yazıyor.</p>`}</div>
   <button class="btn pri" id="bn-dl">Yedek dosyası al</button><div class="grid2"><button class="btn ghost" id="bn-later">Sonra hatırlat</button><button class="btn ghost" id="bn-off">Bir daha sorma</button></div>`);
  $("#bn-dl").onclick=async()=>{await downloadSave();closeSheet()};
  $("#bn-later").onclick=()=>{S.bk={...(S.bk||{}),season:S.season-1};save();closeSheet()};
  $("#bn-off").onclick=()=>{SETTINGS.backupNag=false;saveSettings();closeSheet();toast("Hatırlatma kapatıldı. Yedeği Ayarlar'dan alabilirsin.")};
}

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
   <div class="card"><div class="eyebrow">Kayıt kodu</div><p class="small muted">Başka bir cihazdan getirdiğin kayıt kodunu buraya yapıştır. Kod ilk boş yuvaya yüklenir.</p><textarea id="imp" rows="3" style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:10px;font-family:monospace;font-size:16px" placeholder="Kayıt kodunu yapıştır" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><div class="grid2"><button class="btn ghost sm" id="pst">Panodan yapıştır</button><button class="btn sm" id="impb">Kodu yükle</button></div><label class="btn team sm" style="text-align:center">Yedek dosyasından yükle<input type="file" id="impf" accept=".pota,.txt,text/plain" hidden></label></div>
   ${isInstalled()?"":`<div class="card"><div class="eyebrow">İpucu</div><p class="small">Oyunu telefonunda ana ekrana eklersen uygulama gibi açılır, internetsiz çalışır ve kayıtların daha güvende olur. Ayarlar → Ana ekrana ekle.</p></div>`}`;
  rows.forEach(([i,r])=>{if(r&&r.S){const el=$(`[data-pp="${i}"]`);if(el){el.innerHTML="";el.appendChild(portrait(r.S.look,{jersey:r.S.team.c1,trim:r.S.team.c2,number:r.S.num,mood:"mutlu"},52,52,r.S.team.c1))}}});
  $$("[data-new]").forEach(b=>b.onclick=()=>{F.slot=+b.dataset.new;renderCreate()});
  $$("[data-go]").forEach(b=>b.onclick=()=>{const r=loadSlot(+b.dataset.go);if(!r||!r.S)return;S=r.S;migrate();if(r.from==="backup"){save();toast("Ana kayıt bozuktu, son yedekten açıldı.")}S.retired?retireScreen():renderMain()});
  $$("[data-del]").forEach(b=>b.onclick=()=>{const i=+b.dataset.del;sheet("Yuvayı sil",`Yuva ${i}`,`<p>Bu kariyer ve yedeği kalıcı olarak silinecek.</p><div class="grid2"><button class="btn ghost" id="n1">Vazgeç</button><button class="btn bad" id="y1">Sil</button></div>`,{onClose:renderSlots});$("#n1").onclick=renderSlots;$("#y1").onclick=()=>{deleteSlot(i);renderSlots()}});
  $("#impb").onclick=()=>importCode($("#imp").value);
  $("#impf").onchange=async e=>{const t=await readFileText(e.target);e.target.value="";importCode(t)};
  $("#pst").onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t)throw 0;$("#imp").value=t.trim();toast("Kod yapıştırıldı. Şimdi Kodu yükle'ye bas.")}catch(e){$("#imp").focus();toast("Pano okunamadı. Kutuya basılı tutup Yapıştır'ı seç.")}};
  $("#help0").onclick=()=>guideSheet();
}
function exportSheet(){
  const code=encodeSave(S);
  sheet("Kayıt kodu","Yedek ve cihaz taşıma",`<p class="small muted">Bu kod kariyerinin tamamını içerir. Bir yere kaydet ya da diğer cihazda Kayıtlar ekranına yapıştır.</p><textarea id="exp" rows="6" readonly style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:10px;font-family:monospace;font-size:.7rem;-webkit-user-select:all;user-select:all">${code}</textarea><div class="grid2"><button class="btn" id="cpy">Kodu kopyala</button><button class="btn pri" id="dlf">Dosya olarak kaydet</button></div>${S.bk&&S.bk.ts?`<p class="small muted">Son yedek: ${new Date(S.bk.ts).toLocaleDateString("tr-TR")}</p>`:""}`);
  $("#dlf").onclick=()=>downloadSave();
  $("#cpy").onclick=async()=>{try{await navigator.clipboard.writeText(code);markBackup();toast("Kayıt kodu kopyalandı.")}catch(e){const t=$("#exp");t.focus();t.select();toast("Kod seçildi, kopyalamak için basılı tut.")}};
}
