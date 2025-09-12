/* ==========================
   script.js — 完全版
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
  { id:9,  type:"click", name:"イキスギィ！", effect:50, cost:15000 },
  { id:14, type:"click", name:"ありますあります", effect:100, cost:30000 },
  { id:15, type:"click", name:"いいよこいよ", effect:300, cost:100000 },
  { id:16, type:"click", name:"おかのした", effect:1000, cost:500000 },

  { id:10, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000 },
  { id:17, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000 },
  { id:18, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000 },
  { id:19, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000 },
];

/* ========== Render Shop ========== */
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
    let desc = "";
    if(item.type==="auto") desc = `※秒間+${item.effect}`;
    else if(item.type==="click") desc = `※1クリック+${item.effect}`;
    else desc = `※${item.durationSec || 30}秒 1クリック×${item.mult}`;
    li.innerHTML = `
      <div class="meta">
        <span class="kind">${kind}</span>
        ${item.name} ${desc} [${item.cost.toLocaleString()}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;
    const btn = li.querySelector("button");
    const inCooldown = now < boostCooldownUntil;
    btn.disabled = (count < item.cost) || (item.type==="boost" && (boostRunning || inCooldown));

    btn.addEventListener("click", ()=>{ if(!holdToBuyEnabled) buyItem(item.id); });
    btn.addEventListener("mousedown", ()=> startHoldBuy(btn, item.id));
    btn.addEventListener("mouseup", ()=> stopHoldBuy(btn));
    li.addEventListener("mouseleave", ()=> stopHoldBuy(btn));
    shopList.appendChild(li);
  });
}

/* 長押し購入 */
function startHoldBuy(btn, id){
  if(!holdToBuyEnabled || btn.disabled) return;
  buyItem(id);
  if(holdTimers.has(btn)) return;
  const intervalId = setInterval(()=> buyItem(id), 120);
  holdTimers.set(btn, intervalId);
}
function stopHoldBuy(btn){
  const id = holdTimers.get(btn);
  if(id){ clearInterval(id); holdTimers.delete(btn); }
}

/* ========== Buy ========== */
function buyItem(id){
  const item = shopItems.find(i=>i.id === id);
  if(!item || count < item.cost) return;
  if(item.type==="boost" && (boostRunning || Date.now()<boostCooldownUntil)) return;

  count -= item.cost;
  if(item.type==="auto") autoPower += item.effect;
  else if(item.type==="click") clickPower += item.effect;
  else if(item.type==="boost") applyBoost(item);

  playBuy();
  unlockBadgesIfAny(total);
  render();
}
function applyBoost(boost){
  boostRunning = true;
  const mult = boost.mult || 2;
  const duration = (boost.durationSec||30)*1000;
  const cooldown = (boost.cooldownSec||30)*1000;
  clickPower *= mult;
  setTimeout(()=>{
    clickPower = Math.max(1, clickPower / mult);
    boostRunning = false;
    boostCooldownUntil = Date.now() + cooldown;
    render();
  }, duration);
  render();
}

/* ========== Auto Add ========== */
setInterval(()=>{
  if(autoPower > 0){
    count += autoPower;
    total += autoPower;
    if(count > best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/* ========== Badges ========== */
const BADGES = [
  { id:1, need:1, name:"千里の道も野獣から" },
  { id:2, need:1145141919810100081, name:"新たな道" },
  { id:3, need:1145141919810364364, name:"野獣先輩" },
  { id:4, need:1919191919191919191, name:"イキマスター" },
  { id:5, need:4545454545454545454, name:"シコマスター" },
  { id:6, need:8101000811919114514, name:"ヌゥン！ヘッ！ヘッ！ ..." },
  { id:7, need:81010008119191145144545191969072156858519999999, name:"やじゅれんだ" },
];
function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b=>{
    const li = document.createElement("li");
    const unlocked = unlockedBadgeIds.has(b.id);
    li.className = "badge " + (unlocked ? "unlocked rainbow" : "locked");
    li.innerHTML = `
      <span class="label">${unlocked ? b.name : "？？？"}</span>
      <span class="cond">${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}</span>
    `;
    li.addEventListener("click", ()=>{
      alert(`${b.name}\n${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}`);
      if(unlocked) {
        li.classList.remove("rainbow");
        void li.offsetWidth;
        li.classList.add("rainbow");
      }
    });
    badgeList.appendChild(li);
  });
}
function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b=>{
    if(currentTotal >= b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジ獲得: ${b.name}`);
      renderBadges();
    }
  });
}

/* ========== Toast ========== */
function makeToast(text){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(()=>{ div.style.opacity="0"; div.style.transform="translateY(8px)"; setTimeout(()=>div.remove(),250); }, 2600);
}

/* ========== Render ========== */
function render(){
  countEl.textContent = count.toLocaleString();
  bestEl.textContent = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent = cps.toFixed(2);
  renderShop();
  renderBadges();
}
render();

/* ========== Save/Load (.yjrnd) ========== */
function getSaveData(){
  return JSON.stringify({count,best,total,cps,clickPower,autoPower,boostCooldownUntil, badges:[...unlockedBadgeIds], selectedCategory, holdToBuyEnabled});
}
const encryptData = (s)=> btoa(unescape(encodeURIComponent(s)));
const decryptData = (s)=> decodeURIComponent(escape(atob(s)));

function downloadSave(){
  const enc = encryptData(getSaveData());
  const blob = new Blob([enc], {type:"application/octet-stream"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "yajurenda_save.yjrnd";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  makeToast("✅ セーブをダウンロードしました");
}
function uploadSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ loadSaveData(decryptData(reader.result)); makeToast("✅ セーブを読み込みました"); }
    catch(e){ alert("⚠️ 読み込み失敗: "+e.message); }
  };
  reader.readAsText(file);
}
function loadSaveData(json){
  const d = JSON.parse(json||"{}");
  count=d.count??0; best=d.best??0; total=d.total??0; cps=d.cps??0;
  clickPower=d.clickPower??1; autoPower=d.autoPower??0;
  boostCooldownUntil=d.boostCooldownUntil??0;
  unlockedBadgeIds.clear(); (d.badges||[]).forEach(id=>unlockedBadgeIds.add(id));
  selectedCategory=d.selectedCategory||"all";
  holdToBuyEnabled=!!d.holdToBuyEnabled;
  holdToBuyCheckbox.checked=holdToBuyEnabled;
  render();
}

/* EOF */
