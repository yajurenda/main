/* ========== State ========== */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";

/* ブースト実行・CT管理 */
let boostRunning = false;
let boostCooldownUntil = 0;

/* 長押し購入モード */
let holdToBuyEnabled = false;
const holdTimers = new Map(); // btn -> intervalId

/* スキン管理 */
let ownedSkins = new Set();
let currentSkin = "click.png"; // デフォルト連打画像

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
const playBuy   = () => { try{ buySE.currentTime   = 0; buySE.play(); }catch{} };

/* ========== Theme (Light/Dark) ========== */
(function initTheme(){
  const saved = localStorage.getItem("yjr_theme");
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  themeToggle.addEventListener("click", ()=> {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("yjr_theme", next);
  });
})();

/* ========== Hold-to-Buy ========== */
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

/* ========== Clicker ========== */
clicker.addEventListener("click", () => {
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  if (diff > 0) cps = 1 / diff;
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClick();
  unlockBadgesIfAny(total);
  render();
});

/* Enterでの加算は禁止 */
document.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

/* ========== Shop Items ========== */
const shopItems = [
  // オート
  { id:1,  type:"auto",  name:"24歳です", effect:1,   cost:100 },
  { id:2,  type:"auto",  name:"学生です", effect:5,   cost:500 },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20,  cost:2000 },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100, cost:10000 },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500, cost:50000 },
  { id:11, type:"auto",  name:"ｱｰｲｷｿ", effect:250, cost:25000 },
  { id:12, type:"auto",  name:"あーソレいいよ", effect:1000, cost:100000 },
  { id:13, type:"auto",  name:"頭にきますよ!!", effect:5000, cost:500000 },
  // 精力剤
  { id:6,  type:"click", name:"アイスティー", effect:1,   cost:50 },
  { id:7,  type:"click", name:"暴れんなよ", effect:3,   cost:300 },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10,  cost:2000 },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000 },
  { id:14, type:"click", name:"ありますあります", effect:100, cost:30000 },
  { id:15, type:"click", name:"いいよこいよ", effect:300, cost:100000 },
  { id:16, type:"click", name:"おかのした", effect:1000, cost:500000 },
  // ブースト
  { id:10, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000, note:"" },
  { id:17, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000, note:"" },
  { id:18, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000, note:"" },
  { id:19, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000, note:"" },
  // 着せ替え
  { id:101, type:"skin", name:"やりますねぇ！", cost:"1145141919810", img:"yarimasunele.png" },
  { id:102, type:"skin", name:"イキスギィ！", cost:"3643641919810", img:"ikisugi.png" },
  { id:103, type:"skin", name:"イキスギイイイイイイイ", cost:"1145141919810364364", img:"iii.png" },
  { id:104, type:"skin", name:"おやすみ先輩", cost:"1919191919191919191", img:"oyasumisenpai.png" },
  { id:105, type:"skin", name:"やりませんねぇ...", cost:"4545454545454545454", img:"yarimasennnele.png" },
  { id:106, type:"skin", name:"苦行先輩", cost:"8101000811919114514", img:"kugyou.png" },
  { id:107, type:"skin", name:"やじゅれんだ", cost:"81010008119191145144545191969072156858519999999", img:"yajurenda.png" },
];

/* ========== Tabs ========== */
tabs.forEach(tab=>{
  tab.addEventListener("click", ()=>{
    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

/* ========== Render Shop ========== */
function renderShop(){
  shopList.innerHTML = "";
  let items = [...shopItems];
  if(selectedCategory!=="all") items = items.filter(i=>i.type===selectedCategory);

  const now = Date.now();
  items.forEach(item=>{
    const li = document.createElement("li");
    li.className = "shop-item";
    let desc = "";
    if(item.type==="auto") desc = `※秒間+${item.effect}`;
    else if(item.type==="click") desc = `※1クリック+${item.effect}`;
    else if(item.type==="boost") desc = `※${item.durationSec || 30}秒 1クリック×${item.mult}`;
    else if(item.type==="skin") desc = `※${BigInt(item.cost).toLocaleString()}回で購入`;

    li.innerHTML = `
      <div class="meta">
        ${item.name} ${desc}
      </div>
      <div><button class="buy" data-id="${item.id}">${item.type==="skin" && ownedSkins.has(item.id) ? "切替" : "購入"}</button></div>
    `;

    const btn = li.querySelector(".buy");
    if(item.type!=="skin") btn.disabled = count < item.cost;

    btn.addEventListener("click", ()=>{
      if(item.type==="skin"){
        if(!ownedSkins.has(item.id)){
          if(BigInt(count) < BigInt(item.cost)) return;
          count = BigInt(count) - BigInt(item.cost);
          ownedSkins.add(item.id);
          makeToast(`着せ替え購入: ${item.name}`);
        }
        applySkin(item.img);
      } else buyItem(item.id);
    });

    shopList.appendChild(li);
  });
}

/* ========== Apply Skin ========== */
function applySkin(imgName){
  currentSkin = imgName;
  clicker.querySelector("img").src = imgName;
}

/* ========== Buy Item (auto/click/boost) ========== */
function buyItem(id){
  const item = shopItems.find(i=>i.id===id);
  if(!item) return;

  if(BigInt(count) < BigInt(item.cost)) return;

  count = BigInt(count) - BigInt(item.cost);

  if(item.type==="auto") autoPower += item.effect;
  else if(item.type==="click") clickPower += item.effect;
  else if(item.type==="boost") applyBoost(item);

  playBuy();
  render();
}

/* ========== Boost ========== */
function applyBoost(boost){
  boostRunning = true;
  const mult = boost.mult || 2;
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

/* ========== Auto Count ========== */
setInterval(()=>{
  if(autoPower>0){
    count += autoPower;
    total += autoPower;
    if(count>best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
},1000);

/* ========== Badges ========== */
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
  { id:"bLast", need:"1145141919810", name:"遊んでくれてありがとう❗" },
];
const LAST_BADGE_ID = 1145141919810;
const unlockedBadgeIds = new Set();

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b=>{
    const li = document.createElement("li");
    const unlocked = unlockedBadgeIds.has(b.id);
    li.className = "badge " + (unlocked ? "unlocked" : "locked");
    li.innerHTML = `<span class="label">${unlocked ? b.name : "？？？"}</span>
                    <span class="cond">${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}</span>`;
    li.addEventListener("click", ()=>{ alert(`${unlocked ? b.name : "？？？"}\n${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}`); });
    badgeList.appendChild(li);
  });

  const unlockedLast = unlockedBadgeIds.has(LAST_BADGE_ID);
  endingOpenBtn.disabled = !unlockedLast;
  endingHint.textContent = unlockedLast ? "解禁済み：いつでも視聴できます。" : "最終バッジを獲得すると解放されます。";
}

function unlockBadgesIfAny(currentTotal){
  const totalBig = BigInt(currentTotal);
  BADGES.forEach(b=>{
    const needBig = BigInt(b.need);
    if(totalBig >= needBig && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
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
  setTimeout(()=>{ div.style.opacity="0"; div.style.transform="translateY(8px)"; setTimeout(()=>div.remove(),250); },2600);
}

/* ========== Render ========== */
function render(){
  countEl.textContent = count.toLocaleString();
  bestEl.textContent  = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent   = cps.toFixed(2);
  renderShop();
}
renderBadges();
render();

/* ========== Save / Load ========== */
function getSaveData(){
  return JSON.stringify({
    count: count.toString(),
    best: best.toString(),
    total: total.toString(),
    cps,
    clickPower,
    autoPower,
    boostRunning,
    boostCooldownUntil,
    badges:[...unlockedBadgeIds],
    selectedCategory,
    holdToBuyEnabled,
    theme: document.documentElement.getAttribute("data-theme") || "light",
    ownedSkins: [...ownedSkins],
    currentSkin
  });
}

function loadSaveData(json){
  const d = JSON.parse(json||"{}");
  count = BigInt(d.count || 0);
  best = BigInt(d.best || 0);
  total = BigInt(d.total || 0);
  cps = d.cps || 0;
  clickPower = d.clickPower || 1;
  autoPower = d.autoPower || 0;
  boostRunning = false;
  boostCooldownUntil = d.boostCooldownUntil || 0;
  unlockedBadgeIds.clear();
  (d.badges||[]).forEach(id=>unlockedBadgeIds.add(id));
  selectedCategory = d.selectedCategory || "all";
  holdToBuyEnabled = !!d.holdToBuyEnabled;
  holdToBuyCheckbox.checked = holdToBuyEnabled;
  const th = d.theme || "light";
  document.documentElement.setAttribute("data-theme", th);
  localStorage.setItem("yjr_theme", th);
  localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1":"0");
  ownedSkins.clear();
  (d.ownedSkins||[]).forEach(id=>ownedSkins.add(id));
  currentSkin = d.currentSkin || "click.png";
  applySkin(currentSkin);

  tabs.forEach(t=> t.classList.toggle("active", t.dataset.category===selectedCategory));

  renderBadges();
  render();
}

const encryptData = (s)=>btoa(unescape(encodeURIComponent(s)));
const decryptData = (s)=>decodeURIComponent(escape(atob(s)));

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
      makeToast("✅ セーブを読み込みました");
    }catch(e){ alert("⚠️ 読み込みに失敗しました: "+e.message); }
  };
  reader.readAsText(file);
}

$("save-btn").addEventListener("click", downloadSave);
$("load-file").addEventListener("change", (e)=>uploadSave(e.target.files[0]));
