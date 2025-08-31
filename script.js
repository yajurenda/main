let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();
let boostActive = false;
let activeCategory = "all"; // ←選択タブ保持用

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

// バッチデータ
const badges = [
  { threshold: 1, name: "千里の道も野獣から" },
  { threshold: 19, name: "王道をイク" },
  { threshold: 45, name: "試行思考(シコシコ)" },
  { threshold: 364, name: "見ろよ見ろよ" },
  { threshold: 810, name: "中々やりますねぇ" },
  { threshold: 1919, name: "⚠️あなたはイキスギました！⚠️" },
  { threshold: 4545, name: "生粋とイキスギのオナリスト" },
  { threshold: 114514, name: "Okay, come on.(いいよこいよ)" },
  { threshold: 364364, name: "ホラ、見ろよ見ろよ、ホラ" },
  { threshold: 1145141919810, name: "遊んでくれてありがとう❗" }
];
let unlockedBadges = [];

// 通知
function showBadgeToast(name) {
  const toast = document.getElementById("badge-toast");
  toast.textContent = `🏅 ${name} を獲得！`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// バッチ判定
function checkBadges() {
  badges.forEach(b => {
    if (total >= b.threshold && !unlockedBadges.includes(b.name)) {
      unlockedBadges.push(b.name);
      updateBadgePanel();
      showBadgeToast(b.name);
    }
  });
}

// バッチパネル更新
function updateBadgePanel() {
  const list = document.getElementById("badge-list");
  list.innerHTML = "";
  badges.forEach(b => {
    const li = document.createElement("li");
    if (unlockedBadges.includes(b.name)) {
      li.textContent = b.name;
      li.classList.add("unlocked");
    } else {
      li.textContent = "？？？"; // ← 未獲得は隠す
      li.classList.add("locked");
    }
    list.appendChild(li);
  });
}


// バッチパネル開閉
document.getElementById("badge-btn").addEventListener("click", () => {
  document.getElementById("badge-panel").classList.add("active");
});
document.getElementById("close-badge").addEventListener("click", () => {
  document.getElementById("badge-panel").classList.remove("active");
});

// クリック
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  playClickSound();
  checkBadges();
  render();
});

// CPS計算
setInterval(() => {
  const now = Date.now();
  cps = ((total / ((now - lastClickTime) / 1000))).toFixed(2);
  cpsEl.textContent = cps;
}, 1000);

// ショップデータ
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

// タブ切替
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    activeCategory = tab.getAttribute("data-category");
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderShop();
  });
});

// ショップ表示
function renderShop() {
  shopList.innerHTML = "";
  let filteredItems = [...shopItems];

  if (activeCategory === "auto") {
    filteredItems = shopItems.filter(item => item.type === "auto");
  } else if (activeCategory === "click") {
    filteredItems = shopItems.filter(item => item.type === "click");
  } else if (activeCategory === "boost") {
    filteredItems = shopItems.filter(item => item.type === "boost");
  } else if (activeCategory === "low") {
    filteredItems = [...shopItems].sort((a, b) => a.cost - b.cost);
  } else if (activeCategory === "high") {
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
      buyItem(i);
      playPurchaseSound();
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

// 描画
function render() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  renderShop();
  updateBadgePanel();
}

render();
