/* =========================
   Game State
========================= */
let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let clickPower = 1;
let autoPower = 0;
let lastClickTime = Date.now();

let selectedCategory = "all";
let boostActive = false; // 30s中は再購入不可

/* =========================
   Elements
========================= */
const el = (id) => document.getElementById(id);
const countEl = el("count");
const bestEl = el("best");
const totalEl = el("total");
const cpsEl = el("cps");
const clicker = el("clicker");
const shopList = el("shop-list");
const tabs = document.querySelectorAll(".tab");
const badgeList = el("badge-list");
const toastContainer = el("toast-container");

const muteEl = el("mute");
const volumeEl = el("volume");

const clickSE = el("se-click");
const buySE = el("se-buy");

/* 音量コントロール */
function applyVolume() {
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

/* =========================
   Audio helpers
========================= */
function playClick() { try { if (!muteEl.checked) { clickSE.currentTime = 0; clickSE.play(); } } catch(_) {} }
function playBuy()   { try { if (!muteEl.checked) { buySE.currentTime = 0; buySE.play(); } } catch(_) {} }

/* =========================
   Clicker
========================= */
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

/* =========================
   Shop
========================= */
const shopItems = [
  { id: 1,  type: "auto",  name: "24歳です", effect: 1,   cost: 100 },
  { id: 2,  type: "auto",  name: "学生です", effect: 5,   cost: 500 },
  { id: 3,  type: "auto",  name: "じゃあオナニー", effect: 20,  cost: 2000 },
  { id: 4,  type: "auto",  name: "...とかっていうのは？", effect: 100, cost: 10000 },
  { id: 5,  type: "auto",  name: "やりますねぇ！", effect: 500, cost: 50000 },
  { id: 6,  type: "click", name: "アイスティー", effect: 1,  cost: 50 },
  { id: 7,  type: "click", name: "暴れんなよ", effect: 3,  cost: 300 },
  { id: 8,  type: "click", name: "お前のことが好きだったんだよ", effect: 10, cost: 2000 },
  { id: 9,  type: "click", name: "イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect: 50, cost: 15000 },
  { id: 10, type: "boost", name: "ンアッー！", effect: 2,  cost: 1000 },
];

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

function renderShop(){
  shopList.innerHTML = "";
  let items = [...shopItems];
  if (selectedCategory === "auto") items = items.filter(i => i.type === "auto");
  else if (selectedCategory === "click") items = items.filter(i => i.type === "click");
  else if (selectedCategory === "boost") items = items.filter(i => i.type === "boost");
  else if (selectedCategory === "low") items.sort((a,b) => a.cost - b.cost);
  else if (selectedCategory === "high") items.sort((a,b) => b.cost - a.cost);

  for (const item of items){
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type === "auto" ? "オート" : item.type === "click" ? "精力剤" : "ブースト";
    const desc = item.type==="auto"?`※秒間+${item.effect}`:item.type==="click"?`※1クリック+${item.effect}`:`※30秒 1クリック×${item.effect}`;

    li.innerHTML = `
      <div class="meta"><span class="kind">${kind}</span> ${item.name} ${desc} [${item.cost}回]</div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;

    const btn = li.querySelector(".buy");
    btn.disabled = count < item.cost || (item.type==="boost" && boostActive);
    btn.addEventListener("click", () => buyItem(item.id));
    shopList.appendChild(li);
  }
}

function buyItem(id){
  const item = shopItems.find(i => i.id === id);
  if (!item || count < item.cost) return;
  if (item.type === "boost" && boostActive) return;
  count -= item.cost;
  if (item.type==="auto") autoPower += item.effect;
  else if (item.type==="click") clickPower += item.effect;
  else if (item.type==="boost"){
    boostActive = true;
    const mul = item.effect;
    clickPower *= mul;
    setTimeout(() => { clickPower /= mul; boostActive = false; render(); }, 30000);
  }
  playBuy();
  render();
}

setInterval(() => {
  if (autoPower > 0){
    count += autoPower;
    total += autoPower;
    if (count > best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/* =========================
   Badges
========================= */
const BADGES = [
  { id:1,   need:1, name:"千里の道も野獣から" },
  { id:19,  need:19, name:"王道をイク" },
  { id:45,  need:45, name:"試行思考(シコシコ)" },
  { id:364, need:364, name:"見ろよ見ろよ" },
  { id:810, need:810, name:"中々やりますねぇ" },
  { id:1919,need:1919,name:"⚠️あなたはイキスギました！⚠️" },
  { id:4545,need:4545,name:"生粋とイキスギのオナリスト" },
  { id:114514,need:114514,name:"Okay, come on.(いいよこいよ)" },
  { id:364364,need:364364,name:"ホラ、見ろよ見ろよ、ホラ" },
  { id:1145141919810, need:1145141919810, name:"遊んでくれてありがとう❗" },
];
let unlockedBadgeIds = new Set();

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b => {
    const unlocked = unlockedBadgeIds.has(b.id);
    const li = document.createElement("li");
    li.className = "badge " + (unlocked?"unlocked":"locked");
    li.innerHTML = `<span>${unlocked?b.name:"？？？"}</span>
      <span>${unlocked?"入手済み":`解禁条件: ${b.need}クリック`}</span>`;
    li.onclick = () => alert(`${unlocked?b.name:"？？？"}\n条件:${b.need}クリック`);
    badgeList.appendChild(li);
  });
}

function unlockBadgesIfAny(totalClicks){
  BADGES.forEach(b => {
    if (totalClicks>=b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      renderBadges();
      if (b.id===1145141919810) showEndingOption();
    }
  });
}

/* =========================
   Ending
========================= */
function showEndingOption(){
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`
    <div class="modal-content">
      <h2>🎉 クリアおめでとう！ 🎉</h2>
      <p>エンディングを再生しますか？</p>
      <button id="end-sound">音ありで見る</button>
      <button id="end-nosound">音なしで見る</button>
      <button id="end-close">閉じる</button>
    </div>`;
  document.body.appendChild(modal);
  el("end-sound").onclick=()=>playEnding(false);
  el("end-nosound").onclick=()=>playEnding(true);
  el("end-close").onclick=()=>modal.remove();
}
function playEnding(muted){
  const modal=document.querySelector(".modal");
  modal.innerHTML=`<video src="end.mp4" ${muted?"muted":""} controls autoplay></video>`;
}

/* =========================
   Save/Load
========================= */
function getSaveData(){
  return JSON.stringify({
    count,best,total,cps,clickPower,autoPower,boostActive,
    badges:[...unlockedBadgeIds],
    shop: shopItems.map(i=>({id:i.id,cost:i.cost}))
  });
}
function loadSaveData(json){
  const d=JSON.parse(json);
  count=d.count||0; best=d.best||0; total=d.total||0; cps=d.cps||0;
  clickPower=d.clickPower||1; autoPower=d.autoPower||0; boostActive=d.boostActive||false;
  unlockedBadgeIds=new Set(d.badges||[]);
  if(d.shop) d.shop.forEach(saved=>{const item=shopItems.find(i=>i.id===saved.id); if(item) item.cost=saved.cost;});
  render(); renderBadges();
  alert("✅ セーブデータを読み込みました！");
}
function encryptData(str){ return btoa(unescape(encodeURIComponent(str))); }
function decryptData(str){ return decodeURIComponent(escape(atob(str))); }
function downloadSave(){
  const encrypted=encryptData(getSaveData());
  const blob=new Blob([encrypted],{type:"application/octet-stream"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="yajurenda_save.yjrnd";
  document.body.appendChild(a); setTimeout(()=>{a.click();a.remove();URL.revokeObjectURL(url);},100);
}
function uploadSave(file){
  const reader=new FileReader();
  reader.onload=()=>{const dec=decryptData(reader.result); loadSaveData(dec);};
  reader.readAsText(file);
}
el("save-btn").onclick=downloadSave;
el("load-file").onchange=e=>uploadSave(e.target.files[0]);

/* =========================
   UI Init
========================= */
renderBadges();
render();
