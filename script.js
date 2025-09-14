/* ==========================
   script.js — 完全版（貼り付け可）
   ========================== */

/* ========== State ========== */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";

let boostRunning = false;
let boostCooldownUntil = 0;

let holdToBuyEnabled = false;
const holdTimers = new Map();

const unlockedBadgeIds = new Set();

/* ========== Elements ========== */
const $ = (id) => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");
const modalRoot = $("modal-root");
const themeToggle = $("theme-toggle");
const endingOpenBtn = $("ending-open");
const endingHint = $("ending-hint");
const holdToBuyCheckbox = $("hold-to-buy");

/* ========== Audio / Volume ========== */
function applyVolume(){
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

const playClick = () => { try{ clickSE.currentTime = 0; clickSE.play(); }catch{} };
const playBuy   = () => { try{ buySE.currentTime = 0; buySE.play(); }catch{} };

/* ========== Theme (Light/Dark) ========== */
(function initTheme(){
  const saved = localStorage.getItem("yjr_theme");
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  themeToggle.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("yjr_theme", next);
  });
})();

/* ========== Hold-to-Buy ===== */
(function initHoldToBuy(){
  const saved = localStorage.getItem("yjr_hold_to_buy");
  holdToBuyEnabled = saved === "1";
  holdToBuyCheckbox.checked = holdToBuyEnabled;
  holdToBuyCheckbox.addEventListener("change", ()=>{
    holdToBuyEnabled = holdToBuyCheckbox.checked;
    localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1" : "0");
    stopAllHoldIntervals();
  });
})();
function stopAllHoldIntervals(){
  for(const [btn, id] of holdTimers.entries()){
    clearInterval(id);
    holdTimers.delete(btn);
  }
}

/* ========== Clicker ====== */
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
  render();
});

// Enterでの加算は禁止（フォーム等で誤動作しないよう）
document.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

/* ========== Shop Items ========== */
const shopItems = [
  { id:1,  type:"auto",  name:"24歳です", effect:1,   cost:100 },
  { id:2,  type:"auto",  name:"学生です", effect:5,   cost:500 },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20,  cost:2000 },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100, cost:10000 },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500, cost:50000 },
  { id:11, type:"auto",  name:"ｱｰｲｷｿ", effect:250, cost:25000 },
  { id:12, type:"auto",  name:"あーソレいいよ", effect:1000, cost:100000 },
  { id:13, type:"auto",  name:"頭にきますよ!!", effect:5000, cost:500000 },

  { id:6,  type:"click", name:"アイスティー", effect:1,   cost:50 },
  { id:7,  type:"click", name:"暴れんなよ", effect:3,   cost:300 },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10,  cost:2000 },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000 },
  { id:14, type:"click", name:"ありますあります", effect:100, cost:30000 },
  { id:15, type:"click", name:"いいよこいよ", effect:300, cost:100000 },
  { id:16, type:"click", name:"おかのした", effect:1000, cost:500000 },

  { id:10, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000, note:"" },
  { id:17, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000, note:"" },
  { id:18, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000, note:"" },
  { id:19, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000, note:"" },
];

/* ========== Render Shop (緑デザイン維持) ========== */
tabs.forEach(tab=>{
  tab.addEventListener("click", ()=>{
    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

function renderShop(){
  shopList.innerHTML = "";
  let items = [...shopItems];

  if (selectedCategory==="auto") items = items.filter(i=>i.type==="auto");
  else if (selectedCategory==="click") items = items.filter(i=>i.type==="click");
  else if (selectedCategory==="boost") items = items.filter(i=>i.type==="boost");
  else if (selectedCategory==="low") items.sort((a,b)=>a.cost-b.cost);
  else if (selectedCategory==="high") items.sort((a,b)=>b.cost-a.cost);

  const now = Date.now();

  items.forEach(item=>{
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type==="auto"?"オート": item.type==="click"?"精力剤":"ブースト";
    const kindClass = item.type==="click"?"click":(item.type==="boost"?"boost":"");
    let desc = "";
    if(item.type==="auto") desc = `※秒間+${item.effect}`;
    else if(item.type==="click") desc = `※1クリック+${item.effect}`;
    else desc = `※${item.durationSec || 30}秒 1クリック×${item.mult}`;

    // Meta left, button right — keep green background by CSS .shop-item (accent)
    li.innerHTML = `
      <div class="meta">
        <span class="kind ${kindClass}">${kind}</span>
        ${item.name} ${desc} [${item.cost.toLocaleString()}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;

    const btn = li.querySelector("button");
    const inCooldown = now < boostCooldownUntil;
    btn.disabled = (count < item.cost) || (item.type==="boost" && (boostRunning || inCooldown));

    // 単発クリック（長押しモード時は無効）
    btn.addEventListener("click", (e)=>{
      if(holdToBuyEnabled) return;
      buyItem(item.id);
    });

    // 長押し対応（有効なら発火）
    btn.addEventListener("mousedown", (e)=> startHoldBuy(e, btn, item.id));
    btn.addEventListener("touchstart", (e)=> startHoldBuy(e, btn, item.id), {passive:true});
    ["mouseup","mouseleave","touchend","touchcancel"].forEach(ev=> btn.addEventListener(ev, ()=> stopHoldBuy(btn)));

    shopList.appendChild(li);
  });
}

/* 長押し購入 */
function startHoldBuy(ev, btn, id){
  if(!holdToBuyEnabled) return;
  if(btn.disabled) return;

  // 即時1回
  buyItem(id);

  if(holdTimers.has(btn)) return;
  const intervalId = setInterval(()=>{
    const item = shopItems.find(i=>i.id===id);
    if(!item) return;
    const now = Date.now();
    const inCooldown = now < boostCooldownUntil;
    if((item.type==="boost" && (boostRunning || inCooldown)) || count < item.cost){
      stopHoldBuy(btn);
      return;
    }
    buyItem(id);
  }, 120); // 連射間隔
  holdTimers.set(btn, intervalId);
}
function stopHoldBuy(btn){
  const id = holdTimers.get(btn);
  if(id){ clearInterval(id); holdTimers.delete(btn); }
}

/* ========== Buy / Boost ====== */
function buyItem(id){
  const item = shopItems.find(i=>i.id === id);
  if(!item) return;

  if(item.type==="boost"){
    const now = Date.now();
    if(boostRunning || now < boostCooldownUntil) return;
  }

  if(count < item.cost) return;

  count -= item.cost;

  if(item.type==="auto"){
    autoPower += item.effect;
  } else if(item.type==="click"){
    clickPower += item.effect;
  } else if(item.type==="boost"){
    applyBoost(item);
  }

  playBuy();
  unlockBadgesIfAny(total);
  render();
}

function applyBoost(boost){
  boostRunning = true;
  const mult = boost.mult || 2;
  const duration = (boost.durationSec || 30) * 1000;
  const cooldown = (boost.cooldownSec || 30) * 1000;

  clickPower *= mult;

  // 終了処理
  setTimeout(()=>{
    clickPower = Math.max(1, clickPower / mult);
    boostRunning = false;
    boostCooldownUntil = Date.now() + cooldown;
    render();
  }, duration);

  render();
}

/* 自動加算（秒ごと） */
setInterval(()=>{
  if(autoPower > 0){
    count += autoPower;
    total += autoPower;
    if(count > best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/* ========== Badges (虹＆クリックで条件表示) ========== */
const BADGES = [
  { id:1, need:1, name:"千里の道も野獣から" },
  { id:19, need:19, name:"王道をイク" },
  { id:45, need:45, name:"試行思考(シコシコ)" },
  { id:364, need:364, name:"見ろよ見ろよ" },
  { id:810, need:810, name:"中々やりますねぇ" },
  { id:1919, need:1919, name:"⚠️あなたはイキスギました！⚠️" },
  { id:4545, need:4545, name:"生粋とイキスギのオナリスト" },
  { id:114514, need:114514, name:"Okay, come on.(いいよこいよ)" },
  { id:364364, need:364364, name:"ホラ、見ろよ見ろよ、ホラ" },
  { id:1145141919810, need:1145141919810, name:"遊んでくれてありがとう❗" },
];
const LAST_BADGE_ID = 1145141919810;

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b=>{
    const li = document.createElement("li");
    const unlocked = unlockedBadgeIds.has(b.id);
    li.className = "badge " + (unlocked ? "unlocked" : "locked");
    li.innerHTML = `
      <span class="label">${unlocked ? b.name : "？？？"}</span>
      <span class="cond">${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}</span>
    `;
    li.addEventListener("click", ()=>{
      alert(`${unlocked ? b.name : "？？？"}\n${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()} クリック`}`);
    });
    badgeList.appendChild(li);
  });

  const unlockedLast = unlockedBadgeIds.has(LAST_BADGE_ID);
  endingOpenBtn.disabled = !unlockedLast;
  endingHint.textContent = unlockedLast ? "解禁済み：いつでも視聴できます。" : "最終バッジを獲得すると解放されます。";
}

function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b=>{
    if(currentTotal >= b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      renderBadges();
      if(b.id === LAST_BADGE_ID){
        // 解禁時に選択モーダルを表示
        showEndingOption();
      }
    }
  });
}

/* ========== Toast ====== */
function makeToast(text){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(()=>{
    div.style.opacity = "0";
    div.style.transform = "translateY(8px)";
    setTimeout(()=>div.remove(), 250);
  }, 2600);
}

/* ========== Ending (モーダル生成を安全に行う) ========== */
endingOpenBtn.addEventListener("click", ()=>{ if(!endingOpenBtn.disabled) showEndingOption(); });

function clearModal(){
  // pause any video inside before removing
  const v = modalRoot.querySelector("video");
  if(v && !v.paused) try{ v.pause(); }catch(e){}
  modalRoot.classList.remove("show");
  modalRoot.innerHTML = "";
}

function showEndingOption(){
  // 構造をDOMで組み立て、イベントハンドラを直接接続（innerHTMLで破壊しない）
  modalRoot.innerHTML = ""; // start clean
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "modal";

  const h2 = document.createElement("h2");
  h2.textContent = "🎉 クリアおめでとう！ 🎉";
  const p = document.createElement("p");
  p.textContent = "エンディングを再生しますか？";

  const row1 = document.createElement("div");
  row1.className = "row";
  const btnSound = document.createElement("button");
  btnSound.className = "btn";
  btnSound.id = "end-sound";
  btnSound.textContent = "音ありで見る";
  const btnNoSound = document.createElement("button");
  btnNoSound.className = "btn";
  btnNoSound.id = "end-nosound";
  btnNoSound.textContent = "音なしで見る";
  row1.appendChild(btnSound);
  row1.appendChild(btnNoSound);

  const row2 = document.createElement("div");
  row2.className = "row";
  const btnClose = document.createElement("button");
  btnClose.className = "btn ghost";
  btnClose.id = "end-close";
  btnClose.textContent = "閉じる";
  row2.appendChild(btnClose);

  modal.appendChild(h2);
  modal.appendChild(p);
  modal.appendChild(row1);
  modal.appendChild(row2);

  modalRoot.appendChild(backdrop);
  modalRoot.appendChild(modal);
  modalRoot.classList.add("show");

  // イベント
  const closeAll = () => { clearModal(); };
  backdrop.addEventListener("click", closeAll);
  btnClose.addEventListener("click", closeAll);
  btnSound.addEventListener("click", ()=> playEnding(false));
  btnNoSound.addEventListener("click", ()=> playEnding(true));
}

function playEnding(muted){
  // create video modal DOM and attach handlers
  modalRoot.innerHTML = "";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "modal";

  const video = document.createElement("video");
  video.id = "ending-video";
  video.src = "end.mp4";
  if(muted) video.muted = true;
  video.controls = true;
  video.autoplay = true;
  video.style.width = "100%";
  video.style.borderRadius = "12px";
  video.style.background = "#000";

  const row = document.createElement("div");
  row.className = "row";
  row.style.marginTop = "10px";
  const btnClose2 = document.createElement("button");
  btnClose2.className = "btn ghost";
  btnClose2.id = "end-close2";
  btnClose2.textContent = "閉じる";
  row.appendChild(btnClose2);

  modal.appendChild(video);
  modal.appendChild(row);
  modalRoot.appendChild(backdrop);
  modalRoot.appendChild(modal);
  modalRoot.classList.add("show");

  const closeFunc = () => { try{ video.pause(); }catch{}; clearModal(); };
  backdrop.addEventListener("click", closeFunc);
  btnClose2.addEventListener("click", closeFunc);
}

/* ========== Render ====== */
function render(){
  // safe formatting
  countEl.textContent = count.toLocaleString();
  bestEl.textContent = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent = cps.toFixed(2);

  renderShop();
  // badges rendered separately when changed, but ensure hook:
  renderBadges();
}
renderBadges();
render();

/* ========== Save / Load (Base64 .yjrnd) ========== */
function getSaveData(){
  return JSON.stringify({
    count,best,total,cps,clickPower,autoPower,
    boostRunning, boostCooldownUntil,
    badges:[...unlockedBadgeIds],
    selectedCategory, holdToBuyEnabled,
    theme: document.documentElement.getAttribute("data-theme") || "light",
    shopIds: shopItems.map(i=>i.id)
  });
}
function loadSaveData(json){
  try{
    const d = JSON.parse(json||"{}");
    count = d.count ?? 0; best = d.best ?? 0; total = d.total ?? 0; cps = d.cps ?? 0;
    clickPower = d.clickPower ?? 1; autoPower = d.autoPower ?? 0;
    boostRunning = false;
    boostCooldownUntil = d.boostCooldownUntil ?? 0;
    unlockedBadgeIds.clear();
    (d.badges||[]).forEach(id=>unlockedBadgeIds.add(id));
    selectedCategory = d.selectedCategory || "all";
    holdToBuyEnabled = !!d.holdToBuyEnabled;
    holdToBuyCheckbox.checked = holdToBuyEnabled;

    const th = d.theme || "light";
    document.documentElement.setAttribute("data-theme", th);
    localStorage.setItem("yjr_theme", th);
    localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1":"0");

    tabs.forEach(t=> t.classList.toggle("active", t.dataset.category===selectedCategory) );

    renderBadges(); render();
    makeToast("✅ セーブを読み込みました");
  }catch(e){
    alert("⚠️ セーブの読み込みに失敗しました: " + e.message);
  }
}
const encryptData = (s)=> btoa(unescape(encodeURIComponent(s)));
const decryptData = (s)=> decodeURIComponent(escape(atob(s)));

function downloadSave(){
  try{
    const enc = encryptData(getSaveData());
    const blob = new Blob([enc], {type:"application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "yajurenda_save.yjrnd";
    document.body.appendChild(a);
    setTimeout(()=>{ a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); makeToast("✅ セーブをダウンロードしました"); }, 30);
  }catch(e){ alert("⚠️ セーブに失敗しました: "+e.message); }
}
function uploadSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const decrypted = decryptData(reader.result);
      loadSaveData(decrypted);
    }catch(e){
      alert("⚠️ 読み込みに失敗しました: "+e.message);
    }
  };
  reader.readAsText(file);
}
$("save-btn").addEventListener("click", downloadSave);
$("load-file").addEventListener("change", (e)=> uploadSave(e.target.files[0]));

/* EOF */
