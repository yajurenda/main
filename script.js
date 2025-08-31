// ==============================
// ゲームデータ
// ==============================
let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let autoClickers = 0;
let clickPower = 1;
let boostMultiplier = 1;

let lastClickTime = Date.now();

// ==============================
// バッジデータ
// ==============================
const badges = [
  { id: "first", name: "初めての一回", condition: () => total >= 1, unlocked: false, description: "初めてクリックしたときにもらえる" },
  { id: "hundred", name: "100回突破", condition: () => total >= 100, unlocked: false, description: "100クリック達成" },
  { id: "thousand", name: "1000回突破", condition: () => total >= 1000, unlocked: false, description: "1000クリック達成" },
  { id: "million", name: "100万回突破", condition: () => total >= 1000000, unlocked: false, description: "100万クリック達成" },
  { id: "shopper", name: "初めてのお買い物", condition: () => purchasedSomething, unlocked: false, description: "ショップで初めて購入" }
];

let purchasedSomething = false;

// ==============================
// 商品データ
// ==============================
const shopItems = [
  { id: 1, name: "バイトくん", cost: 50, type: "auto", value: 1 },
  { id: 2, name: "後輩", cost: 500, type: "auto", value: 5 },
  { id: 3, name: "先輩", cost: 5000, type: "auto", value: 50 },
  { id: 4, name: "精力剤", cost: 100, type: "click", value: 1 },
  { id: 5, name: "超精力剤", cost: 1000, type: "click", value: 5 },
  { id: 6, name: "やる気ブースト", cost: 2000, type: "boost", value: 2 },
  { id: 7, name: "根性ブースト", cost: 10000, type: "boost", value: 5 }
];

// ==============================
// サウンド
// ==============================
const clickSound = new Audio("click.mp3");
const buySound = new Audio("buy.mp3");

// ==============================
// 要素取得
// ==============================
const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clickerBtn = document.getElementById("clicker");
const muteCheckbox = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabButtons = document.querySelectorAll(".tab");
const badgesList = document.getElementById("badges-list");
const badgeNotice = document.getElementById("badge-notice");

// ==============================
// ミュート設定
// ==============================
function playSound(sound) {
  if (!muteCheckbox.checked) {
    sound.currentTime = 0;
    sound.play();
  }
}

// ==============================
// クリック処理
// ==============================
clickerBtn.addEventListener("click", () => {
  count += clickPower * boostMultiplier;
  total += clickPower * boostMultiplier;
  if (count > best) best = count;
  playSound(clickSound);
  updateStats();
  checkBadges();
});

// ==============================
// ステータス更新
// ==============================
function updateStats() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  cpsEl.textContent = cps.toFixed(2);
}

// ==============================
// ショップ更新
// ==============================
function renderShop(filter = "auto") {
  shopList.innerHTML = "";
  let items = [...shopItems];

  if (filter === "auto" || filter === "click" || filter === "boost") {
    items = items.filter(item => item.type === filter);
  } else if (filter === "low") {
    items.sort((a, b) => a.cost - b.cost);
  } else if (filter === "high") {
    items.sort((a, b) => b.cost - a.cost);
  }

  items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.name} (${item.cost}回)</span>
      <button ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    const button = li.querySelector("button");
    button.addEventListener("click", () => {
      if (count >= item.cost) {
        count -= item.cost;
        if (item.type === "auto") autoClickers += item.value;
        if (item.type === "click") clickPower += item.value;
        if (item.type === "boost") boostMultiplier *= item.value;
        playSound(buySound);
        purchasedSomething = true;
        updateStats();
        checkBadges();
        renderShop(filter); // ←タブを維持
      }
    });
    shopList.appendChild(li);
  });
}

// ==============================
// バッジ表示更新
// ==============================
function renderBadges() {
  badgesList.innerHTML = "";
  badges.forEach(badge => {
    const li = document.createElement("li");
    if (badge.unlocked) {
      li.textContent = `🏅 ${badge.name}`;
      li.classList.add("unlocked");
      li.addEventListener("click", () => {
        alert(`${badge.name}\n\n${badge.description}`);
      });
    } else {
      li.textContent = "???";
      li.classList.add("locked");
    }
    badgesList.appendChild(li);
  });
}

// ==============================
// バッジ取得チェック
// ==============================
function checkBadges() {
  badges.forEach(badge => {
    if (!badge.unlocked && badge.condition()) {
      badge.unlocked = true;
      showBadgeNotice(badge.name);
      renderBadges();
    }
  });
}

// ==============================
// バッジ通知
// ==============================
function showBadgeNotice(name) {
  badgeNotice.textContent = `🏅 ${name} を獲得しました！`;
  badgeNotice.style.display = "block";
  setTimeout(() => {
    badgeNotice.style.display = "none";
  }, 3000);
}

// ==============================
// 自動クリック処理
// ==============================
setInterval(() => {
  count += autoClickers;
  total += autoClickers;
  if (count > best) best = count;
  const now = Date.now();
  cps = (total / ((now - lastClickTime) / 1000));
  updateStats();
  checkBadges();
}, 1000);

// ==============================
// タブ切り替え
// ==============================
let currentTab = "auto";
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.category;
    renderShop(currentTab);
  });
});

// ==============================
// 初期表示
// ==============================
renderShop("auto");
renderBadges();
updateStats();
