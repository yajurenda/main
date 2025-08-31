let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();
let boostActive = false;
let currentTab = "all"; // ← 現在のタブ状態を保持

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clicker = document.getElementById("clicker");
const muteEl = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabs = document.querySelectorAll(".tab");

// 音
const clickSound = new Audio("click1.mp3");
const purchaseSound = new Audio("buy_sound.mp3");

// 音制御
function playClickSound() {
  if (muteEl.checked) return;
  clickSound.currentTime = 0;
  clickSound.play();
}
function playPurchaseSound() {
  if (muteEl.checked) return;
  purchaseSound.currentTime = 0;
  purchaseSound.play();
}

// クリック処理
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  playClickSound();
  checkBadges();
  render();
});

// エンター無効化
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.preventDefault();
});

// ショップアイテム
const shopItems = [
  { type: "auto", name: "24歳です", effect: 1, cost: 100 },
  { type: "auto", name: "学生です", effect: 5, cost: 500 },
  { type: "auto", name: "じゃあオナニー", effect: 20, cost: 2000 },
  { type: "auto", name: "...とかっていうのは？", effect: 100, cost: 10000 },
  { type: "auto", name: "やりますねぇ！", effect: 500, cost: 50000 },

  { type: "click", name: "アイスティー", effect: 1, cost: 50 },
  { type: "click", name: "暴れんなよ", effect: 3, cost: 300 },
  { type: "click", name: "お前のことが好きだったんだよ", effect: 10, cost: 2000 },
  { type: "click", name: "イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect: 50, cost: 15000 },

  { type: "boost", name: "ンアッー！", effect: 2, cost: 1000 },
];

// タブ切り替え
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    currentTab = tab.getAttribute("data-category"); // ← 選択したタブを記憶
    renderShop();
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ショップ表示
function renderShop() {
  shopList.innerHTML = "";
  let filteredItems = [...shopItems];

  if (currentTab === "auto") filteredItems = shopItems.filter(i => i.type === "auto");
  else if (currentTab === "click") filteredItems = shopItems.filter(i => i.type === "click");
  else if (currentTab === "boost") filteredItems = shopItems.filter(i => i.type === "boost");
  else if (currentTab === "low") filteredItems.sort((a, b) => a.cost - b.cost);
  else if (currentTab === "high") filteredItems.sort((a, b) => b.cost - a.cost);

  filteredItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト"}｜${item.name} 
      ${item.type === "auto" ? `※秒間+${item.effect}` : item.type === "click" ? `※1クリック+${item.effect}` : `※30秒 クリック×${item.effect}`} [${item.cost}回]</span>
      <button id="buy-${i}" ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    shopList.appendChild(li);

    document.getElementById(`buy-${i}`).addEventListener("click", () => {
      playPurchaseSound();
      buyItem(i);
    });
  });
}

// 購入処理
function buyItem(index) {
  const item = shopItems[index];
  if (count < item.cost) return;
  count -= item.cost;

  if (item.type === "auto") {
    autoPower += item.effect;
  } else if (item.type === "click") {
    clickPower += item.effect;
  } else if (item.type === "boost") {
    if (!boostActive) {
      boostActive = true;
      clickPower *= item.effect;
      setTimeout(() => {
        clickPower /= item.effect;
        boostActive = false;
      }, 30000);
    }
  }
  checkBadges();
  render();
}

// 自動加算
setInterval(() => {
  if (autoPower > 0) {
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    checkBadges();
    render();
  }
}, 1000);

// CPS計算
setInterval(() => {
  const now = Date.now();
  cps = 1000 / (now - lastClickTime);
  lastClickTime = now;
  cpsEl.textContent = cps.toFixed(2);
}, 1000);

// バッジ
const badges = [
  { name: "初クリック", condition: () => total >= 1 },
  { name: "100回突破", condition: () => total >= 100 },
  { name: "1000回突破", condition: () => total >= 1000 },
  { name: "精力的！", condition: () => clickPower >= 10 },
  { name: "放置の達人", condition: () => autoPower >= 50 },
];
let unlockedBadges = [];

function checkBadges() {
  badges.forEach(b => {
    if (b.condition() && !unlockedBadges.includes(b.name)) {
      unlockedBadges.push(b.name);
      updateBadgePanel();
    }
  });
}

function updateBadgePanel() {
  const list = document.getElementById("badge-list");
  list.innerHTML = "";
  badges.forEach(b => {
    const li = document.createElement("li");
    if (unlockedBadges.includes(b.name)) {
      li.textContent = b.name;
      li.classList.add("unlocked");
    } else {
      li.textContent = "？？？";
      li.classList.add("locked");
    }
    list.appendChild(li);
  });
}

// 描画
function render() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  renderShop();
  updateBadgePanel();
}

render();
