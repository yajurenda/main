let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastUpdateTime = Date.now();
let boostActive = false;
let currentCategory = "all";

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clicker = document.getElementById("clicker");
const muteEl = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabs = document.querySelectorAll(".tab");
const badgeList = document.getElementById("badge-list");
const badgeNotification = document.getElementById("badge-notification");

// 音声
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

// バッジ
const badges = [
  { name: "千里の道も野獣から", clicks: 1, unlocked: false },
  { name: "王道をイク", clicks: 19, unlocked: false },
  { name: "試行思考(シコシコ)", clicks: 45, unlocked: false },
  { name: "見ろよ見ろよ", clicks: 364, unlocked: false },
  { name: "中々やりますねぇ", clicks: 810, unlocked: false },
  { name: "⚠️あなたはイキスギました！⚠️", clicks: 1919, unlocked: false },
  { name: "生粋とイキスギのオナリスト", clicks: 4545, unlocked: false },
  { name: "Okay, come on.(いいよこいよ)", clicks: 114514, unlocked: false },
  { name: "ホラ、見ろよ見ろよ、ホラ", clicks: 364364, unlocked: false },
  { name: "遊んでくれてありがとう❗", clicks: 1145141919810, unlocked: false }
];

// バッジUI
function updateBadgePanel() {
  badgeList.innerHTML = "";
  badges.forEach(b => {
    const li = document.createElement("li");
    li.textContent = b.unlocked ? b.name : "？？？";
    if (b.unlocked) li.classList.add("unlocked");
    badgeList.appendChild(li);
  });
}

// バッジ獲得チェック
function checkBadges() {
  badges.forEach(b => {
    if (!b.unlocked && total >= b.clicks) {
      b.unlocked = true;
      showBadgeNotification(b.name);
    }
  });
  updateBadgePanel();
}

// バッジ通知
function showBadgeNotification(name) {
  badgeNotification.textContent = `バッチを獲得: ${name}`;
  badgeNotification.classList.remove("hidden");
  setTimeout(() => {
    badgeNotification.classList.add("hidden");
  }, 3000);
}

// クリック
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  playClickSound();
  checkBadges();
  render();
});

// ショップ
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
    currentCategory = tab.getAttribute("data-category");
    renderShop();
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ショップ表示
function renderShop() {
  shopList.innerHTML = "";
  let filteredItems = [...shopItems];

  if (currentCategory === "auto") filteredItems = shopItems.filter(i => i.type === "auto");
  else if (currentCategory === "click") filteredItems = shopItems.filter(i => i.type === "click");
  else if (currentCategory === "boost") filteredItems = shopItems.filter(i => i.type === "boost");
  else if (currentCategory === "low") filteredItems.sort((a, b) => a.cost - b.cost);
  else if (currentCategory === "high") filteredItems.sort((a, b) => b.cost - a.cost);

  filteredItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト"}｜${item.name} 
      ${item.type === "auto" ? `※秒間+${item.effect}` : item.type === "click" ? `※1クリック+${item.effect}` : `※30秒 クリック×${item.effect}` } [${item.cost}回]</span>
      <button id="buy-${i}" ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    shopList.appendChild(li);

    document.getElementById(`buy-${i}`).addEventListener("click", () => {
      playPurchaseSound();
      buyItem(item);
    });
  });
}

// 購入処理
function buyItem(item) {
  if (count < item.cost) return;
  count -= item.cost;

  if (item.type === "auto") autoPower += item.effect;
  else if (item.type === "click") clickPower += item.effect;
  else if (item.type === "boost" && !boostActive) {
    boostActive = true;
    clickPower *= item.effect;
    setTimeout(() => {
      clickPower /= item.effect;
      boostActive = false;
    }, 30000);
  }
  checkBadges();
  render();
}

// 自動加算 & CPS
setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;
  cps = count / (elapsed > 0 ? elapsed : 1);

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
  cpsEl.textContent = (autoPower + clickPower).toFixed(2);
  renderShop();
}

render();
updateBadgePanel();
