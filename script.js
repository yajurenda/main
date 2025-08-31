let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();
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

clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  playClickSound();
  lastClickTime = Date.now();
  render();
});

// エンターキー無効化
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
});

const shopItems = [
  { type: "auto", name: "24歳です", effect: 1, cost: 100 },
  { type: "auto", name: "学生です", effect: 5, cost: 500 },
  { type: "auto", name: "じゃあオナニー", effect: 20, cost: 2000 },
  { type: "auto", name: "...とかっていうのは？", effect: 100, cost: 10000 },
  { type: "auto", name: "やりますねぇ！", effect: 500, cost: 50000 },

  { type: "click", name: "アイスティー", effect: 1, cost: 50 },
  { type: "click", name: "暴れんなよ", effect: 3, cost: 300 },
  { type: "click", name: "お前のことが好きだったんだよ", effect: 10, cost: 2000 },
  { type: "click", name: "イキスギィ！", effect: 50, cost: 15000 },

  { type: "boost", name: "ンアッー！", effect: 2, cost: 1000 },
];

// タブ切替
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    currentCategory = tab.getAttribute("data-category");
    renderShop(currentCategory);
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ショップ表示
function renderShop(category = currentCategory) {
  shopList.innerHTML = "";
  let filteredItems = shopItems.map((item, index) => ({ ...item, id: index }));

  if (category === "auto") filteredItems = filteredItems.filter(item => item.type === "auto");
  else if (category === "click") filteredItems = filteredItems.filter(item => item.type === "click");
  else if (category === "boost") filteredItems = filteredItems.filter(item => item.type === "boost");
  else if (category === "low") filteredItems = [...filteredItems].sort((a, b) => a.cost - b.cost);
  else if (category === "high") filteredItems = [...filteredItems].sort((a, b) => b.cost - a.cost);

  filteredItems.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト"}｜${item.name} 
      ${item.type === "auto" ? `※秒間+${item.effect}` : item.type === "click" ? `※1クリック+${item.effect}` : `※30秒 クリック×${item.effect}`} [${item.cost}回]</span>
      <button id="buy-${item.id}" ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    shopList.appendChild(li);

    document.getElementById(`buy-${item.id}`).addEventListener("click", () => {
      playPurchaseSound();
      buyItem(item.id);
    });
  });
}

// アイテム購入
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

// CPS計算
setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastClickTime) / 1000;
  cps = elapsed > 1 ? 0 : (clickPower / elapsed).toFixed(2);
  cpsEl.textContent = cps;
}, 500);

// 自動加算
setInterval(() => {
  if (autoPower > 0) {
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    render();
  }
}, 1000);

// 描画
function render() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  renderShop();
}

render();
