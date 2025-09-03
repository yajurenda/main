/* =========================
   Game State
========================= */
let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();

let selectedCategory = "all";
let boostActive = false; // 30s中は再購入不可

/* =========================
   Elements
========================= */
const el = (id) => document.getElementById(id);
const countEl = el("count");
const bestEl = el("best");
const totalEl = el("total");
const cpsEl = el("cps");
const clicker = el("clicker");
const shopList = el("shop-list");
const tabs = document.querySelectorAll(".tab");
const badgeList = el("badge-list");
const toastContainer = el("toast-container");

const muteEl = el("mute");
const volumeEl = el("volume");

const clickSE = el("se-click");
const buySE = el("se-buy");

/* 音量コントロール（全体） */
function applyVolume() {
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

/* =========================
   Audio helpers
========================= */
function playClick() {
  if (muteEl.checked) return;
  try { clickSE.currentTime = 0; clickSE.play(); } catch(_) {}
}
function playBuy() {
  if (muteEl.checked) return;
  try { buySE.currentTime = 0; buySE.play(); } catch(_) {}
}

/* =========================
   Clicker
========================= */
clicker.addEventListener("click", () => {
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  if (diff > 0) cps = 1 / diff;
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClick();
  unlockBadgesIfAny(total); // クリック達成は合計ベースで判定（連打回数）
  render();
});

/* Enterキーでの増加は禁止 */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.preventDefault();
});

/* =========================
   Shop
========================= */
const shopItems = [
  // オート
  { id: 1,  type: "auto",  name: "24歳です", effect: 1,   cost: 100 },
  { id: 2,  type: "auto",  name: "学生です", effect: 5,   cost: 500 },
  { id: 3,  type: "auto",  name: "じゃあオナニー", effect: 20,  cost: 2000 },
  { id: 4,  type: "auto",  name: "...とかっていうのは？", effect: 100, cost: 10000 },
  { id: 5,  type: "auto",  name: "やりますねぇ！", effect: 500, cost: 50000 },
  // 精力剤
  { id: 6,  type: "click", name: "アイスティー", effect: 1,  cost: 50 },
  { id: 7,  type: "click", name: "暴れんなよ", effect: 3,  cost: 300 },
  { id: 8,  type: "click", name: "お前のことが好きだったんだよ", effect: 10, cost: 2000 },
  { id: 9,  type: "click", name: "イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect: 50, cost: 15000 },
  // ブースト
  { id: 10, type: "boost", name: "ンアッー！", effect: 2,  cost: 1000 }, // 30s x2
];

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop(); // 選択タブ保持
  });
});

function renderShop(){
  shopList.innerHTML = "";
  let items = [...shopItems];

  if (selectedCategory === "auto") {
    items = items.filter(i => i.type === "auto");
  } else if (selectedCategory === "click") {
    items = items.filter(i => i.type === "click");
  } else if (selectedCategory === "boost") {
    items = items.filter(i => i.type === "boost");
  } else if (selectedCategory === "low") {
    items.sort((a,b) => a.cost - b.cost);
  } else if (selectedCategory === "high") {
    items.sort((a,b) => b.cost - a.cost);
  } // "all" は順番そのまま

  for (const item of items){
    const li = document.createElement("li");
    li.className = "shop-item";

    const kind = item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト";
    const kindClass = item.type === "click" ? "click" : (item.type === "boost" ? "boost" : "");
    const desc =
      item.type === "auto" ? `※秒間+${item.effect}` :
      item.type === "click" ? `※1クリック+${item.effect}` :
      `※30秒 1クリック×${item.effect}`;

    li.innerHTML = `
      <div class="meta">
        <span class="kind ${kindClass}">${kind}</span>
        ${item.name} ${desc} [${item.cost}回]
      </div>
      <div>
        <button class="buy" data-id="${item.id}">購入</button>
      </div>
    `;

    const btn = li.querySelector(".buy");
    const enough = count >= item.cost;
    let disabled = !enough;

    if (item.type === "boost" && boostActive) disabled = true; // クールタイム(発動中不可)

    btn.disabled = disabled;
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      buyItem(item.id);
    });

    shopList.appendChild(li);
  }
}

function buyItem(id){
  const item = shopItems.find(i => i.id === id);
  if (!item) return;
  if (item.type === "boost" && boostActive) return;
  if (count < item.cost) return;

  count -= item.cost;

  if (item.type === "auto"){
    autoPower += item.effect;
  } else if (item.type === "click"){
    clickPower += item.effect;
  } else if (item.type === "boost"){
    boostActive = true;
    const mul = item.effect; // 2倍
    clickPower *= mul;
    setTimeout(() => {
      clickPower /= mul;
      boostActive = false;
      render(); // ボタン復帰
    }, 30000);
  }

  playBuy();
  render(); // ボタンの活性/非活性更新
}

/* 自動加算（毎秒） */
setInterval(() => {
  if (autoPower > 0){
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/* =========================
   Badges
========================= */
const BADGES = [
  { id:1,   need:1,           name:"千里の道も野獣から" },
  { id:19,  need:19,          name:"王道をイク" },
  { id:45,  need:45,          name:"試行思考(シコシコ)" },
  { id:364, need:364,         name:"見ろよ見ろよ" },
  { id:810, need:810,         name:"中々やりますねぇ" },
  { id:1919,need:1919,        name:"⚠️あなたはイキスギました！⚠️" },
  { id:4545,need:4545,        name:"生粋とイキスギのオナリスト" },
  { id:114514,need:114514,    name:"Okay, come on.(いいよこいよ)" },
  { id:364364,need:364364,    name:"ホラ、見ろよ見ろよ、ホラ" },
  { id:1145141919810, need:1145141919810, name:"遊んでくれてありがとう❗" },
];
const unlockedBadgeIds = new Set();

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b => {
    const li = document.createElement("li");
    const unlocked = unlockedBadgeIds.has(b.id);
    li.className = "badge " + (unlocked ? "unlocked" : "locked");
    li.innerHTML = `
      <span class="label">${unlocked ? b.name : "？？？"}</span>
      <span class="cond">${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}</span>
    `;
    li.addEventListener("click", () => {
      if (unlocked) {
        alert(`${b.name}\n入手条件: ${b.need.toLocaleString()} クリック`);
      } else {
        alert(`？？？\n解禁条件: ${b.need.toLocaleString()} クリック`);
      }
    });
    badgeList.appendChild(li);
  });
}

function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b => {
    if (currentTotal >= b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      renderBadges();
    }
  });
}

/* =========================
   Toast
========================= */
function makeToast(text){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(8px)";
    setTimeout(() => div.remove(), 250);
  }, 2600);
}

/* =========================
   Render
========================= */
function render(){
  countEl.textContent = count.toLocaleString();
  bestEl.textContent  = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent   = cps.toFixed(2);
  renderShop();       // 選んだタブを維持
}

/* 初期化 */
renderBadges();
render();

// 既存のバッジ処理の中に追加
function unlockBadge(badge) {
  if (badge.unlocked) return;
  badge.unlocked = true;
  showToast(`バッジ解除！ ${badge.name}`);

  // 特殊処理: エンディングバッジ
  if (badge.clicks === 1145141919810) {
    showEndingOption();
  }
}

function showEndingOption() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🎉 クリアおめでとう！ 🎉</h2>
      <p>エンディングを再生しますか？</p>
      <button id="end-sound">音ありで見る</button>
      <button id="end-nosound">音なしで見る</button>
      <button id="end-close">閉じる</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("end-sound").onclick = () => playEnding(false);
  document.getElementById("end-nosound").onclick = () => playEnding(true);
  document.getElementById("end-close").onclick = () => modal.remove();
}

function playEnding(muted) {
  const modal = document.querySelector(".modal");
  modal.innerHTML = `
    <video id="ending-video" src="end.mp4" ${muted ? "muted" : ""} controls autoplay></video>
  `;
}

// 🔽 データをまとめる
function getSaveData() {
  const data = {
    count,
    best,
    total,
    cps,
    clickPower,
    autoPower,
    boostActive,
    badges: badges.map(b => b.unlocked),   // バッジの解除状態
    shopItems: shopItems.map(i => ({ ...i })) // 各商品（購入状況やコストも保存）
  };
  return data;
}

// 🔽 簡易暗号化（XOR + Base64）
function encryptData(data) {
  const json = JSON.stringify(data);
  const key = 1919; // 暗号キー
  const encrypted = Array.from(json).map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join("");
  return btoa(encrypted);
}

function decryptData(encoded) {
  const key = 1919;
  const decrypted = atob(encoded).split("").map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join("");
  return JSON.parse(decrypted);
}

// 🔽 保存（ダウンロード）
function downloadSave() {
  const encrypted = encryptData(getSaveData());
  const blob = new Blob([encrypted], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "yajurenda_save.yjrnd"; // 独自拡張子
  a.click();
  URL.revokeObjectURL(url);
}

// 🔽 読み込み
function uploadSave(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = decryptData(reader.result);
      loadSaveData(data);
      render();
      alert("✅ セーブデータを読み込みました！");
    } catch {
      alert("⚠️ セーブデータが壊れています。");
    }
  };
  reader.readAsText(file);
}

// 🔽 保存データをゲームに反映
function loadSaveData(data) {
  count = data.count;
  best = data.best;
  total = data.total;
  cps = data.cps;
  clickPower = data.clickPower;
  autoPower = data.autoPower;
  boostActive = data.boostActive;

  // バッジを復元
  if (data.badges) {
    badges.forEach((b, i) => b.unlocked = data.badges[i]);
  }

  // ショップを復元
  if (data.shopItems) {
    shopItems = data.shopItems.map(i => ({ ...i }));
  }
}
