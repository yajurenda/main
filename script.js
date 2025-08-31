let count = 0;
let totalCount = 0;
let maxCount = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let boostActive = false;
let boostTimeout = null;

const countEl = document.getElementById("count");
const totalEl = document.getElementById("totalCount");
const maxEl = document.getElementById("maxCount");
const cpsEl = document.getElementById("cps");
const clickBtn = document.getElementById("clickButton");
const clickSound = document.getElementById("clickSound");
const buySound = document.getElementById("buySound");
const muteCheck = document.getElementById("mute");
const shopList = document.getElementById("shopItems");
const badgesContainer = document.getElementById("badgesContainer");

const shopItems = [
  { name: "オート｜24歳です", type: "auto", effect: 1, cost: 100 },
  { name: "オート｜学生です", type: "auto", effect: 5, cost: 500 },
  { name: "オート｜じゃあオナニー", type: "auto", effect: 20, cost: 2000 },
  { name: "オート｜...とかっていうのは？", type: "auto", effect: 100, cost: 10000 },
  { name: "オート｜やりますねぇ！", type: "auto", effect: 500, cost: 50000 },

  { name: "精力剤｜アイスティー", type: "power", effect: 1, cost: 50 },
  { name: "精力剤｜暴れんなよ", type: "power", effect: 3, cost: 300 },
  { name: "精力剤｜お前のことが好きだったんだよ", type: "power", effect: 10, cost: 2000 },
  { name: "精力剤｜イキスギィ！イク！イクイクイクイク…アッ……ァ...", type: "power", effect: 50, cost: 15000 },

  { name: "ブースト｜ンアッー！", type: "boost", effect: 2, cost: 1000 }
];

const badges = [
  { condition: 10, text: "10回達成！" },
  { condition: 100, text: "100回達成！" },
  { condition: 1000, text: "1000回達成！" },
  { condition: 10000, text: "伝説のやじゅれんだ！" }
];

function updateStats() {
  countEl.textContent = count;
  totalEl.textContent = totalCount;
  maxEl.textContent = maxCount;
  cpsEl.textContent = cps.toFixed(2);
}

function addClick(amount) {
  if (boostActive) amount *= 2;
  count += amount;
  totalCount += amount;
  if (count > maxCount) maxCount = count;
  updateStats();
  checkBadges();
}

clickBtn.addEventListener("click", () => {
  addClick(clickPower);
  if (!muteCheck.checked) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});

function renderShop() {
  shopList.innerHTML = "";
  shopItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.name} ※${item.type==="auto"?"秒間":"1クリック"}+${item.effect} [${item.cost}回]</span>
      <button id="buy-${index}">購入</button>
    `;
    shopList.appendChild(li);

    const btn = document.getElementById(`buy-${index}`);
    btn.addEventListener("click", () => buyItem(index));
  });
}

function buyItem(index) {
  const item = shopItems[index];
  if (count >= item.cost) {
    count -= item.cost;
    if (item.type === "auto") autoPower += item.effect;
    if (item.type === "power") clickPower += item.effect;
    if (item.type === "boost" && !boostActive) activateBoost(item.effect);
    if (!muteCheck.checked) {
      buySound.currentTime = 0;
      buySound.play();
    }
    updateStats();
  }
}

function activateBoost(multiplier) {
  boostActive = true;
  clearTimeout(boostTimeout);
  boostTimeout = setTimeout(() => {
    boostActive = false;
  }, 30000);
}

function checkBadges() {
  badges.forEach((badge, i) => {
    if (totalCount >= badge.condition) {
      const badgeEl = document.getElementById(`badge-${i}`);
      badgeEl.textContent = badge.text;
      badgeEl.classList.add("unlocked");
    }
  });
}

function renderBadges() {
  badgesContainer.innerHTML = "";
  badges.forEach((badge, i) => {
    const div = document.createElement("div");
    div.id = `badge-${i}`;
    div.className = "badge";
    div.textContent = "???";
    badgesContainer.appendChild(div);
  });
}

setInterval(() => {
  count += autoPower;
  cps = autoPower;
  updateStats();
  checkBadges();
}, 1000);

renderShop();
renderBadges();
updateStats();
