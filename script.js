let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();
let boostActive = false;

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clicker = document.getElementById("clicker");
const muteEl = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabs = document.querySelectorAll(".tab");

// 音声設定（click1.mp3 だけ使用）
const sound = new Audio("click1.mp3");

// 音を鳴らす関数
function playSound() {
  if (muteEl.checked) return;  // ミュートがONの場合、音を鳴らさない
  sound.currentTime = 0;  // 再生位置を最初に戻す
  sound.play();  // 音を再生
}

// クリック処理
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playSound();  // 音を鳴らす
  render();
});

// エンターキーを無効化
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault(); // エンターキーのデフォルト動作（送信や改行）を無効化
  }
});

// ショップのアイテム
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
    const category = tab.getAttribute("data-category");
    renderShop(category);
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ショップ表示
function renderShop(category = "all") {
  shopList.innerHTML = "";
  let filteredItems = shopItems;

  // カテゴリフィルタリング
  if (category === "auto") {
    filteredItems = shopItems.filter(item => item.type === "auto");
  } else if (category === "click") {
    filteredItems = shopItems.filter(item => item.type === "click");
  } else if (category === "boost") {
    filteredItems = shopItems.filter(item => item.type === "boost");
  } else if (category === "low") {
    filteredItems = shopItems.sort((a, b) => a.cost - b.cost);
  } else if (category === "high") {
    filteredItems = shopItems.sort((a, b) => b.cost - a.cost);
  }

  filteredItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト"}｜${item.name} 
      ${item.type === "auto" ? `※秒間+${item.effect}` : item.type === "click" ? `※1クリック+${item.effect}` : `※30秒 クリック×${item.effect}` } [${item.cost}回]</span>
      <button id="buy-${i}" ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    shopList.appendChild(li);

    document.getElementById(`buy-${i}`).addEventListener("click", () => buyItem(i));
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
      }, 30000); // 30秒
    }
  }
  render();
}

// クリック処理
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  playSound();  // 音を鳴らす
  render();
});

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
