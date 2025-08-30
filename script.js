let count = 0;
let best = 0;
let total = 0;
let clickPower = 1;

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const clicker = document.getElementById("clicker");
const shopList = document.getElementById("shop-list");

const clickSound = new Audio("click1.mp3");  // クリック音
const purchaseSound = new Audio("buy_sound.mp3");  // 購入音

// クリック時の音を鳴らす
function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

// 購入時の音を鳴らす
function playPurchaseSound() {
  purchaseSound.currentTime = 0;
  purchaseSound.play();
}

// クリック処理
clicker.addEventListener("click", () => {
  count += clickPower;
  total += clickPower;
  if (count > best) best = count;
  
  playClickSound();  // クリック音を鳴らす
  render();  // 表示を更新
});

// ショップの商品
const shopItems = [
  { name: "オート", effect: 1, cost: 100 },
  { name: "学生", effect: 5, cost: 500 },
  { name: "じゃあオナニー", effect: 20, cost: 2000 },
];

// ショップの商品表示
function renderShop() {
  shopList.innerHTML = "";
  shopItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.name} (効果: +${item.effect}, 価格: ${item.cost}回)
      <button id="buy-${index}">購入</button>
    `;
    shopList.appendChild(li);

    // 商品購入ボタンの処理
    document.getElementById(`buy-${index}`).addEventListener("click", () => {
      if (count >= item.cost) {
        count -= item.cost;
        clickPower += item.effect;  // クリック効果を増やす
        playPurchaseSound();  // 購入音を鳴らす
        render();  // 表示更新
      }
    });
  });
}

// 描画更新
function render() {
  countEl.textContent = `${count}回`;
  bestEl.textContent = best;
  totalEl.textContent = total;
  renderShop();  // ショップの表示を更新
}

render();  // 初期描画
