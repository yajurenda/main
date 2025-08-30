let count = 0;
let best = 0;
let total = 0;
let clickPower = 1;  // 初期クリックごとの増加量を1に設定
let autoPower = 0;
let boostActive = false;

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const clicker = document.getElementById("clicker");
const muteEl = document.getElementById("mute");
const shopList = document.getElementById("shop-list");
const tabs = document.querySelectorAll(".tab");
const leaderboardEl = document.getElementById("leaderboard"); // ランキング表示用

// 音声設定（クリック音と購入音）
const clickSound = new Audio("click1.mp3");  // クリック時の音声
const purchaseSound = new Audio("buy_sound.mp3");  // 購入時の音声

// バッジのデータ
const badges = [
  { id: 1, name: "千里の道も野獣から", description: "1クリックで獲得", condition: (count) => count >= 1 },
  { id: 2, name: "王道をイク", description: "19クリックで獲得", condition: (count) => count >= 19 },
  { id: 3, name: "試行思考(シコシコ)", description: "45クリックで獲得", condition: (count) => count >= 45 },
  { id: 4, name: "見ろよ見ろよ", description: "364クリックで獲得", condition: (count) => count >= 364 },
  { id: 5, name: "中々やりますねぇ", description: "810クリックで獲得", condition: (count) => count >= 810 },
  { id: 6, name: "⚠️あなたはイキスギました！⚠️", description: "1919クリックで獲得", condition: (count) => count >= 1919 },
  { id: 7, name: "生粋とイキスギのオナリスト", description: "4545クリックで獲得", condition: (count) => count >= 4545 },
  { id: 8, name: "Okay, come on.(いいよこいよ)", description: "114514クリックで獲得", condition: (count) => count >= 114514 },
  { id: 9, name: "ホラ、見ろよ見ろよ、ホラ", description: "364364クリックで獲得", condition: (count) => count >= 364364 },
  { id: 10, name: "遊んでくれてありがとう❗", description: "1145141919810クリックで獲得", condition: (count) => count >= 1145141919810 }
];

let acquiredBadges = [];

// バッジの状態を確認して更新
function checkBadges() {
  badges.forEach(badge => {
    if (badge.condition(count) && !acquiredBadges.includes(badge.id)) {
      acquiredBadges.push(badge.id);
      showBadgeNotification(badge);  // バッジ獲得時の通知表示
      renderBadges();  // バッジを画面に表示
    }
  });
}

// バッジの通知を表示
function showBadgeNotification(badge) {
  const notification = document.createElement("div");
  notification.classList.add("badge-notification");
  notification.innerHTML = `バッジ獲得: <span style="color: rainbow;">${badge.name}</span>`;
  document.body.appendChild(notification);

  // 通知表示後、5秒後に自動で消える
  setTimeout(() => {
    notification.style.display = "none";
  }, 5000);
}

// バッジの表示
function renderBadges() {
  const badgeList = document.getElementById("badge-list");
  badgeList.innerHTML = '';

  acquiredBadges.forEach(badgeId => {
    const badge = badges.find(b => b.id === badgeId);
    const badgeElement = document.createElement("li");
    badgeElement.textContent = `${badge.name}: ${badge.description}`;
    badgeList.appendChild(badgeElement);
  });
}

// バッジリストを表示・非表示にする
document.getElementById("toggle-badge-list").addEventListener("click", () => {
  const badgeListContainer = document.getElementById("badge-list-container");
  const isVisible = badgeListContainer.style.display === "block";
  badgeListContainer.style.display = isVisible ? "none" : "block";
});

// クリック処理
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClickSound();  // クリック時に音を鳴らす
  render();

  checkBadges();  // バッジ確認
});

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

// ショップ表示
function renderShop(category = "all") {
  shopList.innerHTML = "";  // まずリストを空にしてから描画

  let filteredItems = shopItems;

  // カテゴリフィルタリング
  if (category === "auto") {
    filteredItems = shopItems.filter(item => item.type === "auto");
  } else if (category === "click") {
    filteredItems = shopItems.filter(item => item.type === "click");
  } else if (category === "boost") {
    filteredItems = shopItems.filter(item => item.type === "boost");
  }

  filteredItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト"}｜${item.name} 
      ${item.type === "auto" ? `※秒間+${item.effect}` : item.type === "click" ? `※1クリック+${item.effect}` : `※30秒 クリック×${item.effect}` } [${item.cost}回]</span>
      <button id="buy-${i}" ${count < item.cost ? "disabled" : ""}>購入</button>
    `;
    shopList.appendChild(li);

    document.getElementById(`buy-${i}`).addEventListener("click", () => {
      playPurchaseSound();  // 購入時に音を鳴らす
      buyItem(i);
    });
 
