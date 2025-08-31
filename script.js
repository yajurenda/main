let count = 0;
let totalCount = 0;
let record = 0;
let cps = 0;
let clickValue = 1;
let autoCps = 0;
let mute = false;

const clicker = document.getElementById("clicker");
const countDisplay = document.getElementById("count");
const recordDisplay = document.getElementById("record");
const cpsDisplay = document.getElementById("cps");
const muteCheckbox = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const badgeList = document.getElementById("badge-list");

const clickSound = new Audio("click1.mp3");
const buySound = new Audio("buy_sound.mp3");

// ミュート切り替え
muteCheckbox.addEventListener("change", () => {
  mute = muteCheckbox.checked;
});

// クリック処理
clicker.addEventListener("click", () => {
  count += clickValue;
  totalCount += clickValue;
  updateDisplay();
  if (!mute) clickSound.play();
});

// 自動加算処理
setInterval(() => {
  count += autoCps;
  totalCount += autoCps;
  updateDisplay();
}, 1000);

// 表示更新
function updateDisplay() {
  countDisplay.textContent = `${count}回`;
  record = Math.max(record, totalCount);
  recordDisplay.textContent = `最高: ${record} / 合計: ${totalCount}`;
  cpsDisplay.textContent = `CPS: ${(autoCps + clickValue).toFixed(2)}`;
}

// ショップ商品一覧
const shopItems = [
  { name: "オート｜24歳です", type: "auto", effect: 1, cost: 100 },
  { name: "オート｜学生です", type: "auto", effect: 5, cost: 500 },
  { name: "オート｜じゃあオナニー", type: "auto", effect: 20, cost: 2000 },
  { name: "オート｜...とかっていうのは？", type: "auto", effect: 100, cost: 10000 },
  { name: "オート｜やりますねぇ！", type: "auto", effect: 500, cost: 50000 },
  { name: "精力剤｜アイスティー", type: "click", effect: 1, cost: 50 },
  { name: "精力剤｜暴れんなよ", type: "click", effect: 3, cost: 300 },
  { name: "精力剤｜お前のことが好きだったんだよ", type: "click", effect: 10, cost: 2000 },
  { name: "精力剤｜イキスギィ！イク！イクイクイクイク…アッ……ァ...", type: "click", effect: 50, cost: 15000 },
  { name: "ブースト｜ンアッー！", type: "boost", effect: 2, cost: 1000 }
];

// ショップ描画
function renderShop(items) {
  shopList.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} [${item.cost}回]`;
    const btn = document.createElement("button");
    btn.textContent = "購入";
    btn.disabled = count < item.cost;
    btn.addEventListener("click", () => buyItem(index));
    li.appendChild(btn);
    shopList.appendChild(li);
  });
}

// 購入処理
function buyItem(index) {
  const item = shopItems[index];
  if (count >= item.cost) {
    count -= item.cost;
    if (item.type === "auto") autoCps += item.effect;
    if (item.type === "click") clickValue += item.effect;
    if (item.type === "boost") activateBoost(item.effect);
    if (!mute) buySound.play();
    updateDisplay();
    renderShop(shopItems);
  }
}

// ブースト
function activateBoost(multiplier) {
  clickValue *= multiplier;
  setTimeout(() => {
    clickValue /= multiplier;
  }, 30000); // 30秒
}

// フィルタ・ソート
document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.filter;
    if (type === "all") renderShop(shopItems);
    else renderShop(shopItems.filter(i => i.type === type));
  });
});

document.querySelectorAll("[data-sort]").forEach(btn => {
  btn.addEventListener("click", () => {
    const sorted = [...shopItems].sort((a, b) => 
      btn.dataset.sort === "asc" ? a.cost - b.cost : b.cost - a.cost
    );
    renderShop(sorted);
  });
});

// 初期描画
renderShop(shopItems);
updateDisplay();
