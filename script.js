/* ========== State ========== */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";
let boostActive = false;
let longPressMode = false; // ← 長押しモード OFF がデフォルト

/* ========== Elements ========== */
const $ = (id) => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");
const themeToggle = $("theme-toggle");
const longpressToggle = $("longpress-toggle");

/* 動的モーダル(rootを動的生成) */
let modalRoot = document.querySelector(".modal-root");
if (!modalRoot) {
  modalRoot = document.createElement("div");
  modalRoot.className = "modal-root";
  document.body.appendChild(modalRoot);
}

/* ========== Audio / Volume ========== */
function applyVolume() {
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

const playClick = () => { try { clickSE.currentTime = 0; clickSE.play(); } catch {} };
const playBuy   = () => { try { buySE.currentTime   = 0; buySE.play(); } catch {} };

/* ========== Clicker ========== */
clicker.addEventListener("click", () => {
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  if (diff > 0) cps = 1 / diff;
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClick();
  unlockBadgesIfAny(total);
  render();
});

/* Enterでの加算は禁止 */
document.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

/* ========== Shop Items ========== */
const shopItems = [
  { id:1,  type:"auto",  name:"24歳です", effect:1, cost:100 },
  { id:2,  type:"auto",  name:"学生です", effect:5, cost:500 },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20, cost:2000 },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100, cost:10000 },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500, cost:50000 },
  { id:11, type:"auto",  name:"ｱｰｲｷｿ", effect:250, cost:25000 },
  { id:12, type:"auto",  name:"あーソレいいよ", effect:1000, cost:100000 },
  { id:13, type:"auto",  name:"頭にきますよ!!", effect:5000, cost:500000 },

  { id:6,  type:"click", name:"アイスティー", effect:1, cost:50 },
  { id:7,  type:"click", name:"暴れんなよ", effect:3, cost:300 },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10, cost:2000 },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000 },
  { id:14, type:"click", name:"ありますあります", effect:100, cost:30000 },
  { id:15, type:"click", name:"いいよこいよ", effect:300, cost:100000 },
  { id:16, type:"click", name:"おかのした", effect:1000, cost:500000 },

  { id:10, type:"boost", name:"ンアッー！", effect:2, cost:1000, duration:30000 },
  { id:17, type:"boost", name:"俺もやったんだからさ", effect:5, cost:5000, duration:30000 },
  { id:18, type:"boost", name:"おまたせ", effect:10, cost:20000, duration:60000 },
  { id:19, type:"boost", name:"溜まってんなあおい", effect:20, cost:100000, duration:15000 },
];

/* タブ切替 */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

/* ショップ描画 */
function renderShop() {
  shopList.innerHTML = "";
  let items = [...shopItems];
  if (selectedCategory === "auto") items = items.filter(i => i.type === "auto");
  else if (selectedCategory === "click") items = items.filter(i => i.type === "click");
  else if (selectedCategory === "boost") items = items.filter(i => i.type === "boost");

  items.forEach(item => {
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type==="auto"?"オート":item.type==="click"?"精力剤":"ブースト";
    const desc = item.type==="auto" ? `※秒間+${item.effect}`
               : item.type==="click" ? `※1クリック+${item.effect}`
               : `※${(item.duration/1000)}秒 1クリック×${item.effect}`;

    li.innerHTML = `
      <div class="meta">
        <span class="kind">${kind}</span>
        ${item.name} ${desc} [${item.cost}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;

    const btn = li.querySelector(".buy");
    btn.disabled = count < item.cost || (item.type==="boost" && boostActive);

    if (longPressMode) {
      // 長押し専用
      let interval;
      btn.addEventListener("mousedown", () => {
        interval = setInterval(() => buyItem(item.id), 150);
      });
      btn.addEventListener("mouseup", () => clearInterval(interval));
      btn.addEventListener("mouseleave", () => clearInterval(interval));
    } else {
      // 通常購入
      btn.addEventListener("click", () => buyItem(item.id));
    }

    shopList.appendChild(li);
  });
}

/* 購入処理 */
function buyItem(id) {
  const item = shopItems.find(i => i.id === id);
  if (!item) return;
  if (item.type === "boost" && boostActive) return;
  if (count < item.cost) return;

  count -= item.cost;
  if (item.type === "auto") autoPower += item.effect;
  else if (item.type === "click") clickPower += item.effect;
  else if (item.type === "boost") {
    boostActive = true;
    const mul = item.effect;
    clickPower *= mul;
    setTimeout(() => {
      clickPower /= mul;
      boostActive = false;
      render();
    }, item.duration);
  }
  playBuy();
  render();
}

/* 自動加算 */
setInterval(() => {
  if (autoPower > 0) {
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/* ========== Badges ========== */
// （省略：バッジ部分は前と同じ）

/* ========== Save / Load / Toast / Ending ========== */
// （省略：前と同じ処理を保持）

/* ========== Theme / Longpress Mode ========== */
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
longpressToggle.addEventListener("click", () => {
  longPressMode = !longPressMode;
  longpressToggle.classList.toggle("active", longPressMode);
  renderShop(); // 再描画でイベント切り替え
});

/* ========== Render ========== */
function render() {
  countEl.textContent = count.toLocaleString();
  bestEl.textContent  = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent   = cps.toFixed(2);
  renderShop();
}
renderBadges();
render();
