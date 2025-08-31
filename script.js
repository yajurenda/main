let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();
let boostActive = false;
let currentTab = "auto"; // ✅ 購入後もタブ保持

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clicker = document.getElementById("clicker");
const muteEl = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabs = document.querySelectorAll(".tab");
const badgeList = document.getElementById("badge-list");
const notificationEl = document.getElementById("notification");

const clickSound = new Audio("click1.mp3");
const purchaseSound = new Audio("buy_sound.mp3");

// ✅ 音再生関数
function playClickSound() {
  if (muteEl.checked) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}
function playPurchaseSound() {
  if (muteEl.checked) return;
  purchaseSound.currentTime = 0;
  purchaseSound.play().catch(() => {});
}

// ✅ クリック処理
clicker.addEventListener("click", () => {
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  if (diff > 0) {
    cps = 1 / diff;
  }
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClickSound();
  checkBadges();
  render();
});

// エンターキー無効化
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
  }
});

// ✅ ショップデータ
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

// ✅ バッジデータ
const badges = [
  { id: 1, name: "はじめの一歩", condition: () => total >= 1 },
  { id: 2, name: "百の壁", condition: () => total >= 100 },
  { id: 3, name: "一万回突破", condition: () => total >= 10000 },
  { id: 4, name: "オート購入者", condition: () => autoPower > 0 },
  { id: 5, name: "精力剤購入者", condition: () => clickPower > 1 },
];
let unlockedBadges = new Set();

// ✅ タブ切り替え
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    currentTab = tab.getAttribute("data-category");
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderShop();
  });
});

// ✅ ショップ表示
function renderShop() {
  shopList.innerHTML = "";
  let filteredItems = shopItems;

  if (currentTab === "auto") {
    filteredItems = shopItems.filter(item => item.type === "auto");
  } else if (currentTab === "click") {
    filteredItems = shopItems.filter(item => item.type === "click");
  } else if (currentTab === "boost") {
    filteredItems = shopItems.filter(item => item.type === "boost");
  } else if (currentTab === "low") {
    filteredItems = [...shopItems].sort((a, b) => a.cost - b.cost);
  } else if (currentTab === "high") {
    filteredItems = [...shopItems].sort((a, b) => b.cost - a.cost);
  }

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

// ✅ アイテム購入
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

// ✅ 自動加算
setInterval(() => {
  if (autoPower > 0) {
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    checkBadges();
    render();
  }
}, 1000);

// ✅ バッジ表示
function renderBadges() {
  badgeList.innerHTML = "";
  badges.forEach(badge => {
    const div = document.createElement("div");
    div.className = "badge";
    if (unlockedBadges.has(badge.id)) {
      div.classList.add("unlocked");
      div.textContent = badge.name;
      div.title = badge.name;
    } else {
      div.textContent = "???";
      div.title = "未獲得";
    }
    div.addEventListener("click", () => {
      if (unlockedBadges.has(badge.id)) {
        alert(`${badge.name}：${badge.condition.toString()}`);
      }
    });
    badgeList.appendChild(div);
  });
}

// ✅ バッジチェック
function checkBadges() {
  badges.forEach(badge => {
    if (!unlockedBadges.has(badge.id) && badge.condition()) {
      unlockedBadges.add(badge.id);
      showNotification(`バッジ獲得！「${badge.name}」`);
    }
  });
  renderBadges();
}

// ✅ 通知
function showNotification(text) {
  notificationEl.textContent = text;
  notificationEl.style.display = "block";
  setTimeout(() => {
    notificationEl.style.display = "none";
  }, 3000);
}

// ✅ 画面更新
function render() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  cpsEl.textContent = cps.toFixed(2);
  renderShop();
  renderBadges();
}

render();
