/* ========== State ========== */
let count = 0n, best = 0n, total = 0n;
let cps = 0;
let clickPower = 1n, autoPower = 0n;
let lastClickTime = Date.now();
let selectedCategory = "all";

let boostRunning = false, boostCooldownUntil = 0;
let holdToBuyEnabled = false;
const holdTimers = new Map();

// skins
let unlockedSkinIds = new Set();
let currentSkinId = null;

/* ========== Elements ========== */
const $ = id => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
let skinListEl = $("skin-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");
const modalRoot = $("modal-root");
const themeToggle = $("theme-toggle");
const endingOpenBtn = $("ending-open");
const endingHint = $("ending-hint");
const holdToBuyCheckbox = $("hold-to-buy");

/* ========== Utilities ========== */
function fmt(n){
  const s = (typeof n === "bigint") ? n.toString() : String(n);
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* ========== Audio / Volume ========== */
function applyVolume(){
  const vol = muteEl && muteEl.checked ? 0 : parseFloat((volumeEl && volumeEl.value) || "1");
  [clickSE, buySE].forEach(a=>{ if(a){ a.volume = vol; a.muted = vol === 0; }});
}
if(muteEl) muteEl.addEventListener("change", applyVolume);
if(volumeEl) volumeEl.addEventListener("input", applyVolume);
applyVolume();
const playClick = ()=>{ try{ if(clickSE){ clickSE.currentTime = 0; clickSE.play(); } }catch{} };
const playBuy   = ()=>{ try{ if(buySE){ buySE.currentTime   = 0; buySE.play(); } }catch{} };

/* ========== Theme (Light/Dark) ========== */
(function initTheme(){
  try{
    const saved = localStorage.getItem("yjr_theme");
    if(saved) document.documentElement.setAttribute("data-theme", saved);
  }catch{}
  if(themeToggle) themeToggle.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("yjr_theme", next);
  });
})();

/* ========== Ensure skin-list exists (fallback) ========== */
(function ensureSkinList(){
  if(!skinListEl){
    const grid = document.querySelector(".grid");
    if(grid){
      const aside = document.createElement("aside");
      aside.className = "card skin-selector";
      aside.innerHTML = `<h2>スキン切替</h2><ul id="skin-list" class="skin-list"></ul>`;
      grid.appendChild(aside);
      skinListEl = $("skin-list");
    }else{
      const div = document.createElement("div");
      div.innerHTML = `<ul id="skin-list" class="skin-list"></ul>`;
      document.body.appendChild(div);
      skinListEl = $("skin-list");
    }
  }
})();

/* ========== Clicker ========== */
if(clicker){
  clicker.addEventListener("click", ()=>{
    const now = Date.now();
    const diff = (now - lastClickTime) / 1000;
    if(diff > 0) cps = 1 / diff;
    lastClickTime = now;

    count += clickPower;
    total += clickPower;
    if(count > best) best = count;

    playClick();
    unlockBadgesIfAny(total);
    unlockSkinsIfAny(total);
    render();
  });
}

/* Enterでの加算は禁止 */
document.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

/* ========== Shop Items & Skins ========== */
const shopItems = [
  // auto
  { id:1,  type:"auto",  name:"24歳です", effect:1n, cost:100n },
  { id:2,  type:"auto",  name:"学生です", effect:5n, cost:500n },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20n, cost:2000n },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100n, cost:10000n },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500n, cost:50000n },
  { id:11, type:"auto",  name:"ｱｰｲｷｿ", effect:250n, cost:25000n },
  { id:12, type:"auto",  name:"あーソレいいよ", effect:1000n, cost:100000n },
  { id:13, type:"auto",  name:"頭にきますよ!!", effect:5000n, cost:500000n },

  // click
  { id:6,  type:"click", name:"アイスティー", effect:1n, cost:50n },
  { id:7,  type:"click", name:"暴れんなよ", effect:3n, cost:300n },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10n, cost:2000n },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50n, cost:15000n },
  { id:14, type:"click", name:"ありますあります", effect:100n, cost:30000n },
  { id:15, type:"click", name:"いいよこいよ", effect:300n, cost:100000n },
  { id:16, type:"click", name:"おかのした", effect:1000n, cost:500000n },

  // boost
  { id:10, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000n },
  { id:17, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000n },
  { id:18, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000n },
  { id:19, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000n },
];

const SKINS = [
  { id:"s1", need:"1145141919810", name:"やりますねぇ！", src:"yarimasunele.png" },
  { id:"s2", need:"3643641919810", name:"イキスギィ！", src:"ikisugi.png" },
  { id:"s3", need:"1145141919810364364", name:"イキスギイイイイイイイ", src:"iii.png" },
  { id:"s4", need:"1919191919191919191", name:"おやすみ先輩", src:"oyasumisenpai.png" },
  { id:"s5", need:"4545454545454545454", name:"やりませんねぇ...", src:"yarimasennnele.png" },
  { id:"s6", need:"8101000811919114514", name:"苦行先輩", src:"kugyou.png" },
  { id:"s7", need:"81010008119191145144545191969072156858519999999", name:"やじゅれんだ", src:"yajurenda.png" },
];

/* ========== Tabs wiring ========== */
tabs.forEach(tab=>{
  tab.addEventListener("click", ()=>{
    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

/* ========== Render Shop (skin対応) ========== */
function renderShop(){
  if(!shopList) return;
  shopList.innerHTML = "";

  if(selectedCategory === "skin"){
    SKINS.forEach(s=>{
      const unlocked = unlockedSkinIds.has(s.id);
      const canBuy = total >= BigInt(s.need);
      const li = document.createElement("li");
      li.className = "shop-item";
      li.innerHTML = `
        <div class="meta">
          <span class="kind skin">着せ替え</span>
          ${s.name} ${unlocked ? "(入手済み)" : `※${fmt(BigInt(s.need))}回で入手`}
        </div>
        <div>
          <button class="buy" data-id="${s.id}" ${unlocked||canBuy ? "" : "disabled"}>${unlocked ? "適用" : "購入"}</button>
        </div>
      `;
      const btn = li.querySelector(".buy");
      btn.addEventListener("click", ()=>{
        if(!unlocked && total < BigInt(s.need)){ makeToast("回数が足りません"); return; }
        // 当仕様では「回数で購入」は消費しない（到達で解禁）。必要ならtotal -= BigInt(s.need);
        unlockedSkinIds.add(s.id);
        currentSkinId = s.id;
        updateClickerSkin();
        renderSkins();
        renderShop();
        makeToast(`スキンを購入：${s.name}`);
      });
      shopList.appendChild(li);
    });
    return;
  }

  // else normal shop items
  let items = [...shopItems];
  if(selectedCategory === "auto") items = items.filter(i=>i.type==="auto");
  else if(selectedCategory === "click") items = items.filter(i=>i.type==="click");
  else if(selectedCategory === "boost") items = items.filter(i=>i.type==="boost");
  else if(selectedCategory === "low") items.sort((a,b)=> a.cost > b.cost ? 1 : -1);
  else if(selectedCategory === "high") items.sort((a,b)=> a.cost < b.cost ? 1 : -1);

  const now = Date.now();
  items.forEach(item=>{
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type==="auto" ? "オート" : item.type==="click" ? "精力剤" : "ブースト";
    const kindClass = item.type==="click" ? "click" : (item.type==="boost" ? "boost" : "");
    const desc = item.type==="auto" ? `※秒間+${item.effect}` :
                 item.type==="click" ? `※1クリック+${item.effect}` :
                 `※${item.durationSec||30}秒 1クリック×${item.mult}`;
    const inCooldown = now < boostCooldownUntil;
    const disabled = total < item.cost || (item.type==="boost" && (boostRunning || inCooldown));
    li.innerHTML = `
      <div class="meta">
        <span class="kind ${kindClass}">${kind}</span>
        ${item.name} ${desc} [${fmt(item.cost)}回]
      </div>
      <div><button class="buy" data-id="${item.id}" ${disabled ? "disabled" : ""}>購入</button></div>
    `;
    const btn = li.querySelector(".buy");
    btn.addEventListener("click", ()=>{ if(!holdToBuyEnabled) buyItem(item.id); });
    btn.addEventListener("mousedown", (e)=>startHoldBuy(e, btn, item.id));
    btn.addEventListener("touchstart", (e)=>startHoldBuy(e, btn, item.id), {passive:true});
    ["mouseup","mouseleave","touchend","touchcancel"].forEach(ev=>btn.addEventListener(ev, ()=>stopHoldBuy(btn)));
    shopList.appendChild(li);
  });
}

/* ========== Hold-to-Buy ========== */
(function initHoldToBuy(){
  try{
    const saved = localStorage.getItem("yjr_hold_to_buy");
    holdToBuyEnabled = saved === "1";
    if(holdToBuyCheckbox) holdToBuyCheckbox.checked = holdToBuyEnabled;
    if(holdToBuyCheckbox) holdToBuyCheckbox.addEventListener("change", ()=>{
      holdToBuyEnabled = holdToBuyCheckbox.checked;
      localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1" : "0");
      stopAllHoldTimers();
    });
  }catch{}
})();
function startHoldBuy(ev, btn, id){
  if(!holdToBuyEnabled || btn.disabled) return;
  buyItem(id);
  if(holdTimers.has(btn)) return;
  const iid = setInterval(()=>{
    const item = shopItems.find(i=>i.id===id);
    if(!item) return;
    const now = Date.now();
    if((item.type==="boost" && (boostRunning || now < boostCooldownUntil)) || total < item.cost){ stopHoldBuy(btn); return; }
    buyItem(id);
  }, 100);
  holdTimers.set(btn, iid);
}
function stopHoldBuy(btn){ const id = holdTimers.get(btn); if(id){ clearInterval(id); holdTimers.delete(btn); } }
function stopAllHoldTimers(){ for(const [b,i] of holdTimers.entries()){ clearInterval(i); holdTimers.delete(b); } }

/* ========== buyItem ========== */
function buyItem(id){
  const item = shopItems.find(i=>i.id===id); if(!item) return;
  if(total < item.cost){ makeToast("回数が足りません"); return; }
  if(item.type==="boost"){ const now = Date.now(); if(boostRunning || now < boostCooldownUntil){ makeToast("ブーストはまだ使えません"); return; } }
  // deduct cost
  total -= item.cost;
  if(total < 0n) total = 0n;

  if(item.type==="auto") autoPower += BigInt(item.effect || 0);
  else if(item.type==="click") clickPower += BigInt(item.effect || 0);
  else if(item.type==="boost") applyBoost(item);

  playBuy();
  render();
}

/* ========== Boost ========== */
function applyBoost(boost){
  boostRunning = true;
  const mult = BigInt(boost.mult || 2);
  const duration = (boost.durationSec || 30) * 1000;
  const cooldown = (boost.cooldownSec || 30) * 1000;

  clickPower *= mult;
  setTimeout(()=>{
    clickPower /= mult;
    boostRunning = false;
    boostCooldownUntil = Date.now() + cooldown;
    render();
  }, duration);
}

/* ========== Auto increment (1s) ========== */
setInterval(()=>{
  if(autoPower > 0n){
    count += autoPower;
    total += autoPower;
    if(count > best) best = count;
    unlockBadgesIfAny(total);
    unlockSkinsIfAny(total);
    render();
  }
}, 1000);

/* ========== Badges (BigInt-safe) ========== */
const BADGES = [
  { id:1, need:"1", name:"千里の道も野獣から" },
  { id:19, need:"19", name:"王道をイク" },
  { id:45, need:"45", name:"試行思考(シコシコ)" },
  { id:364, need:"364", name:"見ろよ見ろよ" },
  { id:810, need:"810", name:"中々やりますねぇ" },
  { id:1919, need:"1919", name:"⚠️あなたはイキスギました！⚠️" },
  { id:4545, need:"4545", name:"生粋とイキスギのオナリスト" },
  { id:114514, need:"114514", name:"Okay, come on.(いいよこいよ)" },
  { id:364364, need:"364364", name:"ホラ、見ろよ見ろよ、ホラ" },
  // 最終バッジ（IDは文字列で扱う）
  { id:"bLast", need:"1145141919810", name:"遊んでくれてありがとう❗" },

  // 新規追加（要求された長大な数は文字列で保存）
  { id:"bX1", need:"1145141919810100081", name:"新たな道" },
  { id:"bX2", need:"1145141919810364364", name:"野獣先輩" },
  { id:"bX3", need:"1919191919191919191", name:"イキマスター" },
  { id:"bX4", need:"4545454545454545454", name:"シコマスター" },
  { id:"bX5", need:"8101000811919114514", name:"ヌゥン！ヘッ！ヘッ！ア゛ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛ア゛↑ア゛↑ア゛↑ア゛↑ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛！！！！ウ゛ア゛ア゛ア゛ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛ァ゛ァ゛ァ！！！！！フ ウ゛ウ゛ウ゛ゥ゛ゥ゛ゥ゛ン！！！！フ ウ゛ゥ゛ゥ゛ゥン！！！！(大迫真)" },
  { id:"bX6", need:"81010008119191145144545191969072156858519999999", name:"やじゅれんだ" },
];
const LAST_BADGE_ID = "bLast";
const unlockedBadgeIds = new Set();

/* renderBadges: DOM 要素を一度作ったら再作成しない -> アニメーションが途切れない */
function renderBadges(){
  if(!badgeList) return;
  // create missing li elements if needed (preserve existing ones)
  BADGES.forEach(b=>{
    if(!badgeList.querySelector(`li[data-id="${b.id}"]`)){
      const li = document.createElement("li");
      li.setAttribute("data-id", b.id);
      li.className = "badge locked";
      // children placeholders
      const label = document.createElement("span"); label.className = "label"; label.textContent = "？？？";
      const cond = document.createElement("span"); cond.className = "cond"; cond.textContent = `解禁条件: ${fmt(BigInt(b.need))}クリック`;
      li.appendChild(label);
      li.appendChild(cond);
      li.addEventListener("click", ()=> {
        const unlocked = unlockedBadgeIds.has(b.id);
        alert(`${unlocked ? b.name : "？？？"}\n${unlocked ? "入手済み" : `解禁条件: ${fmt(BigInt(b.need))} クリック`}`);
      });
      badgeList.appendChild(li);
    }
  });

  // update content & classes without replacing nodes
  BADGES.forEach(b=>{
    const li = badgeList.querySelector(`li[data-id="${b.id}"]`);
    if(!li) return;
    const unlocked = unlockedBadgeIds.has(b.id);
    li.classList.toggle("unlocked", unlocked);
    li.classList.toggle("locked", !unlocked);
    const label = li.querySelector(".label");
    const cond = li.querySelector(".cond");
    if(label) label.textContent = unlocked ? b.name : "？？？";
    if(cond) cond.textContent = unlocked ? "入手済み" : `解禁条件: ${fmt(BigInt(b.need))}クリック`;
  });

  // ending UI
  const unlockedLast = unlockedBadgeIds.has(LAST_BADGE_ID);
  if(endingOpenBtn) endingOpenBtn.disabled = !unlockedLast;
  if(endingHint) endingHint.textContent = unlockedLast ? "解禁済み：いつでも視聴できますねぇ！" : "最終バッジを獲得すると解放されますねぇ！されますされます";
}

function unlockBadgesIfAny(currentTotal){
  const totalBig = BigInt(currentTotal);
  BADGES.forEach(b=>{
    const needBig = BigInt(b.need);
    if(totalBig >= needBig && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      // renderBadges will update without recreating unlocked DOM element
      renderBadges();
      if(String(b.id) === String(LAST_BADGE_ID)) showEndingOption();
    }
  });
}

/* ========== Skins: render / unlock / apply ========== */
function renderSkins(){
  if(!skinListEl) return;
  skinListEl.innerHTML = "";
  SKINS.forEach(s=>{
    const li = document.createElement("li");
    const unlocked = unlockedSkinIds.has(s.id);
    li.className = "skin " + (unlocked ? "unlocked" : "locked");
    li.textContent = unlocked ? s.name : `？？？ (解禁: ${fmt(BigInt(s.need))}回)`;
    li.addEventListener("click", ()=>{
      if(unlocked){
        currentSkinId = s.id;
        updateClickerSkin();
        renderSkins();
      }else{
        makeToast("じゃあまず、条件を満たしてくれるかな？");
      }
    });
    if(s.id === currentSkinId) li.style.fontWeight = "800";
    skinListEl.appendChild(li);
  });
}

function updateClickerSkin(){
  if(!clicker) return;
  const img = clicker.querySelector("img");
  const skin = SKINS.find(s=>s.id === currentSkinId);
  if(img) img.src = (skin && unlockedSkinIds.has(skin.id)) ? skin.src : "click.png";
}

function unlockSkinsIfAny(currentTotal){
  const totalBig = BigInt(currentTotal);
  SKINS.forEach(s=>{
    const needBig = BigInt(s.need);
    if(totalBig >= needBig && !unlockedSkinIds.has(s.id)){
      unlockedSkinIds.add(s.id);
      makeToast(`スキンを解禁: ${s.name}`);
      renderSkins();
    }
  });
}

/* ========== Toast ========== */
function makeToast(text){
  if(!toastContainer) return;
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(()=>{ div.style.opacity="0"; div.style.transform="translateY(8px)"; setTimeout(()=>div.remove(),250); }, 2600);
}

/* ========== Ending modal (音あり/なし) ========== */
if(endingOpenBtn) endingOpenBtn.addEventListener("click", ()=>{
  if(endingOpenBtn.disabled) return;
  showEndingOption();
});
function showEndingOption(){
  modalRoot.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <h2>🎉 クリアおめでとう！ 🎉</h2>
      <p>エンディングを再生しますか？</p>
      <div class="row">
        <button class="btn" id="end-sound">音ありで見る</button>
        <button class="btn" id="end-nosound">音なしで見る</button>
      </div>
      <div class="row">
        <button class="btn ghost" id="end-close">閉じる</button>
      </div>
    </div>
  `;
  modalRoot.classList.add("show");
  modalRoot.querySelector(".modal-backdrop").onclick = closeModal;
  $("end-close").onclick = closeModal;
  $("end-sound").onclick = ()=>playEnding(false);
  $("end-nosound").onclick = ()=>playEnding(true);
}
function closeModal(){ modalRoot.classList.remove("show"); modalRoot.innerHTML = ""; }
function playEnding(muted){
  modalRoot.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <video id="ending-video" src="end.mp4" ${muted ? "muted" : ""} controls autoplay style="width:100%;border-radius:12px;background:#000"></video>
      <div class="row" style="margin-top:10px">
        <button class="btn ghost" id="end-close2">閉じる</button>
      </div>
    </div>
  `;
  modalRoot.classList.add("show");
  modalRoot.querySelector(".modal-backdrop").onclick = closeModal;
  $("end-close2").onclick = closeModal;
}

/* ========== Render (UI update) ========== */
function render(){
  if(countEl) countEl.textContent = fmt(count);
  if(bestEl) bestEl.textContent = fmt(best);
  if(totalEl) totalEl.textContent = fmt(total);
  if(cpsEl) cpsEl.textContent = (typeof cps === "number") ? cps.toFixed(2) : "0.00";
  renderShop();
  renderBadges();
  renderSkins();
}
render(); // initial

/* ========== Save / Load (Base64 .yjrnd) ========== */
function getSaveData(){
  return JSON.stringify({
    count: count.toString(),
    best: best.toString(),
    total: total.toString(),
    cps,
    clickPower: clickPower.toString(),
    autoPower: autoPower.toString(),
    boostRunning,
    boostCooldownUntil,
    badges: [...unlockedBadgeIds],
    skins: [...unlockedSkinIds],
    currentSkinId,
    selectedCategory,
    holdToBuyEnabled,
    theme: document.documentElement.getAttribute("data-theme") || "light"
  });
}
function loadSaveData(json){
  try{
    const d = JSON.parse(json || "{}");
    count = d.count ? BigInt(d.count) : 0n;
    best  = d.best  ? BigInt(d.best)  : 0n;
    total = d.total ? BigInt(d.total) : 0n;
    cps = d.cps || 0;
    clickPower = d.clickPower ? BigInt(d.clickPower) : 1n;
    autoPower  = d.autoPower  ? BigInt(d.autoPower)  : 0n;
    boostRunning = false;
    boostCooldownUntil = d.boostCooldownUntil || 0;
    unlockedBadgeIds.clear();
    (d.badges || []).forEach(id=>unlockedBadgeIds.add(id));
    unlockedSkinIds.clear();
    (d.skins || []).forEach(id=>unlockedSkinIds.add(id));
    currentSkinId = d.currentSkinId || null;
    selectedCategory = d.selectedCategory || "all";
    holdToBuyEnabled = !!d.holdToBuyEnabled;
    if(holdToBuyCheckbox) holdToBuyCheckbox.checked = holdToBuyEnabled;
    const th = d.theme || "light";
    document.documentElement.setAttribute("data-theme", th);
    localStorage.setItem("yjr_theme", th);
    localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1" : "0");
    // update UI
    tabs.forEach(t=> t.classList.toggle("active", t.dataset.category === selectedCategory));
    updateClickerSkin();
    render();
    makeToast("✅ セーブを読み込みました");
  }catch(e){
    alert("ロードに失敗しました: " + e.message);
  }
}
function encryptData(s){ return btoa(unescape(encodeURIComponent(s))); }
function decryptData(s){ return decodeURIComponent(escape(atob(s))); }

function downloadSave(){
  try{
    const enc = encryptData(getSaveData());
    const blob = new Blob([enc], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "yajurenda_save.yjrnd";
    document.body.appendChild(a);
    setTimeout(()=>{ a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); makeToast("✅ セーブをダウンロードしました"); }, 30);
  }catch(e){ alert("セーブに失敗しました。バグの場合はFormまでお願いします。: " + e.message); }
}
function uploadSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const decrypted = decryptData(reader.result);
      loadSaveData(decrypted);
    }catch(e){
      alert("読み込みに失敗しました: " + e.message);
    }
  };
  reader.readAsText(file);
}
if($("save-btn")) $("save-btn").addEventListener("click", downloadSave);
if($("load-file")) $("load-file").addEventListener("change", e=>uploadSave(e.target.files[0]));

/* ========== Initial defaults ========== */
(function initDefaults(){
  // default skin: none -> click.png
  if(!currentSkinId && SKINS.length > 0) currentSkinId = null; // explicit: no skin selected -> default click.png
  unlockSkinsIfAny(total);
  renderShop();
  renderBadges();
  renderSkins();
  updateClickerSkin();
})();

/* ========== Skins: render / unlock / apply ========== */
function renderSkins(){
  if(!skinListEl) return;
  skinListEl.innerHTML = "";

  SKINS.forEach(s => {
    const li = document.createElement("li");
    const unlocked = unlockedSkinIds.has(s.id);
    li.className = "skin-item " + (unlocked ? "unlocked" : "locked"); // CSSクラスをskin-itemに変更

    let skinInfoHTML;
    if (unlocked) {
      // 解禁済みの場合
      skinInfoHTML = `<img src="${s.src}" alt="${s.name}" />`; // 画像を表示
      if (s.id === currentSkinId) {
        li.classList.add("selected"); // 現在選択中のスキンに'selected'クラスを追加
      }
    } else {
      // 未解禁の場合
      skinInfoHTML = `
        <div class="skin-locked-info">
          <span class="skin-name">？？？</span>
          <span class="skin-requirement">※${fmt(BigInt(s.need))}回</span>
        </div>
      `;
    }

    li.innerHTML = skinInfoHTML;

    // スキンのクリックイベントリスナー
    li.addEventListener("click", () => {
      if (unlocked) {
        currentSkinId = s.id;
        updateClickerSkin();
        renderSkins(); // 再描画して選択状態を更新
        makeToast(`スキンを変更: ${s.name}`);
      } else {
        makeToast("じゃあまず、条件を満たしてくれるかな？");
      }
    });

    skinListEl.appendChild(li);
  });
}

// updateClickerSkin関数も、画像ソースのパスを正しく設定するように更新
function updateClickerSkin(){
  if(!clicker) return;
  const img = clicker.querySelector("img");
  const skin = SKINS.find(s => s.id === currentSkinId);
  // スキンが適用されているか、かつ解禁されているかを確認
  if (skin && unlockedSkinIds.has(skin.id)) {
    img.src = skin.src;
  } else {
    img.src = "click.png"; // デフォルト画像に戻す
  }
}

// 初期描画時にもスキンが正しく適用されるように render() の後などに呼び出す
// (function initDefaults(){ ... })() の中で renderSkins() と updateClickerSkin() を呼び出すのが良いでしょう。
