/* ========== State ========== */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";
let boostActive = false;
let holdBuyMode = false; // ★ 長押し購入モード

/* ========== Elements ========== */
const $ = (id) => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");

/* 動的モーダル(rootを動的生成) */
let modalRoot = document.querySelector(".modal-root");
if(!modalRoot){
  modalRoot = document.createElement("div");
  modalRoot.className = "modal-root";
  document.body.appendChild(modalRoot);
}

/* ========== Audio / Volume ========== */
function applyVolume(){
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

const playClick = () => { try{ clickSE.currentTime = 0; clickSE.play(); }catch{} };
const playBuy   = () => { try{ buySE.currentTime   = 0; buySE.play(); }catch{} };

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

/* ========== Shop ========== */
const shopItems = [
  { id:1,  type:"auto",  name:"24歳です", effect:1,   cost:100 },
  { id:2,  type:"auto",  name:"学生です", effect:5,   cost:500 },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20,  cost:2000 },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100, cost:10000 },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500, cost:50000 },

  { id:6,  type:"click", name:"アイスティー", effect:1,   cost:50 },
  { id:7,  type:"click", name:"暴れんなよ", effect:3,   cost:300 },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10,  cost:2000 },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000 },

  { id:10, type:"boost", name:"ンアッー！", effect:2,   cost:1000 },
  { id:11, type:"boost", name:"アン！アン！アン！アン！アン！アン！アン！アン！アン！アッーンン！！", effect:3, cost:2000 },
];

tabs.forEach(tab=>{
  tab.addEventListener("click", ()=>{
    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

function renderShop(){
  shopList.innerHTML = "";
  let items = [...shopItems];
  if (selectedCategory==="auto") items = items.filter(i=>i.type==="auto");
  else if (selectedCategory==="click") items = items.filter(i=>i.type==="click");
  else if (selectedCategory==="boost") items = items.filter(i=>i.type==="boost");
  else if (selectedCategory==="low") items.sort((a,b)=>a.cost-b.cost);
  else if (selectedCategory==="high") items.sort((a,b)=>b.cost-a.cost);

  items.forEach(item=>{
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type==="auto"?"オート":item.type==="click"?"精力剤":"ブースト";
    const kindClass = item.type==="click"?"click":(item.type==="boost"?"boost":"");
    const desc = item.type==="auto" ? `※秒間+${item.effect}`
               : item.type==="click" ? `※1クリック+${item.effect}`
               : `※30秒 1クリック×${item.effect}`;

    li.innerHTML = `
      <div class="meta">
        <span class="kind ${kindClass}">${kind}</span>
        ${item.name} ${desc} [${item.cost}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;

    const btn = li.querySelector(".buy");
    btn.disabled = count < item.cost || (item.type==="boost" && boostActive);

    // 通常購入 or 長押し購入
    let holdInterval;
    btn.addEventListener("mousedown", ()=>{
      if(!holdBuyMode) return;
      holdInterval = setInterval(()=>buyItem(item.id), 150);
    });
    btn.addEventListener("mouseup", ()=>{ if(holdInterval) clearInterval(holdInterval); });
    btn.addEventListener("mouseleave", ()=>{ if(holdInterval) clearInterval(holdInterval); });

    if(!holdBuyMode){
      btn.addEventListener("click", ()=>buyItem(item.id));
    }

    shopList.appendChild(li);
  });
}

function buyItem(id){
  const item = shopItems.find(i=>i.id===id);
  if(!item) return;
  if(item.type==="boost" && boostActive) return;
  if(count < item.cost) return;

  count -= item.cost;
  if(item.type==="auto") autoPower += item.effect;
  else if(item.type==="click") clickPower += item.effect;
  else if(item.type==="boost"){
    boostActive = true;
    const mul = item.effect;
    clickPower *= mul;
    setTimeout(()=>{ clickPower /= mul; boostActive = false; render(); }, 30000);
  }
  playBuy();
  render();
}

/* 自動加算 */
setInterval(()=>{
  if(autoPower>0){
    count += autoPower;
    total += autoPower;
    if(count>best) best = count;
    unlockBadgesIfAny(total);
    render();
  }
},1000);

/* ========== Badges ========== */
const BADGES = [
  { id:1, need:1, name:"千里の道も野獣から" },
  { id:19, need:19, name:"王道をイク" },
  { id:45, need:45, name:"試行思考(シコシコ)" },
  { id:364, need:364, name:"見ろよ見ろよ" },
  { id:810, need:810, name:"中々やりますねぇ" },
  { id:1919, need:1919, name:"⚠️あなたはイキスギました！⚠️" },
  { id:4545, need:4545, name:"生粋とイキスギのオナリスト" },
  { id:114514, need:114514, name:"Okay, come on.(いいよこいよ)" },
  { id:364364, need:364364, name:"ホラ、見ろよ見ろよ、ホラ" },
  { id:1145141919810, need:1145141919810, name:"遊んでくれてありがとう❗" },
];
const unlockedBadgeIds = new Set();

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b=>{
    const li = document.createElement("li");
    const unlocked = unlockedBadgeIds.has(b.id);
    li.className = "badge " + (unlocked ? "unlocked" : "locked");
    li.innerHTML = `
      <span class="label">${unlocked ? b.name : "？？？"}</span>
      <span class="cond">${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()}クリック`}</span>
    `;
    li.addEventListener("click", ()=>{
      alert(`${unlocked ? b.name : "？？？"}\n${unlocked ? "入手済み" : `解禁条件: ${b.need.toLocaleString()} クリック`}`);
    });
    badgeList.appendChild(li);
  });
}

function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b=>{
    if(currentTotal>=b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      renderBadges();

      if(b.id===1145141919810) showEndingOption();
    }
  });
}

/* ========== Toast ========== */
function makeToast(text){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(()=>{ div.style.opacity="0"; div.style.transform="translateY(8px)"; setTimeout(()=>div.remove(),250); },2600);
}

/* ========== Ending ========== */
function showEndingOption(){
  modalRoot.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <h2>🎉 クリアおめでとう！ 🎉</h2>
      <p>エンディングを再生しますか？</p>
      <div class="row">
        <button class="btn" id="end-sound">音ありで見る</button>
        <button class="btn" id="end-nosound">音なしで見る</button>
      </div>
      <div class="row">
        <button class="btn" id="end-close" style="background:#64748b">閉じる</button>
      </div>
    </div>`;
  modalRoot.classList.add("show");
  modalRoot.querySelector(".modal-backdrop").onclick = closeModal;
  $("end-close").onclick = closeModal;
  $("end-sound").onclick = ()=>playEnding(false);
  $("end-nosound").onclick = ()=>playEnding(true);
}
function closeModal(){ modalRoot.classList.remove("show"); modalRoot.innerHTML=""; }
function playEnding(muted){
  modalRoot.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <video id="ending-video" src="end.mp4" ${muted ? "muted" : ""} controls autoplay></video>
      <div class="row" style="margin-top:10px">
        <button class="btn" id="end-close2" style="background:#64748b">閉じる</button>
      </div>
    </div>`;
  modalRoot.classList.add("show");
  modalRoot.querySelector(".modal-backdrop").onclick = closeModal;
  $("end-close2").onclick = closeModal;
}

/* ========== Render ========== */
function render(){
  countEl.textContent = count.toLocaleString();
  bestEl.textContent  = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent   = cps.toFixed(2);
  renderShop();
}
renderBadges();
render();

/* ========== Save / Load ========== */
function getSaveData(){
  return JSON.stringify({
    count, best, total, cps, clickPower, autoPower, boostActive,
    badges:[...unlockedBadgeIds],
    shop: shopItems.map(i=>({id:i.id, cost:i.cost}))
  });
}
function loadSaveData(json){
  const d = JSON.parse(json||"{}");
  count = d.count ?? 0; best = d.best ?? 0; total = d.total ?? 0; cps = d.cps ?? 0;
  clickPower = d.clickPower ?? 1; autoPower = d.autoPower ?? 0; boostActive = d.boostActive ?? false;

  unlockedBadgeIds.clear();
  (d.badges||[]).forEach(id=>unlockedBadgeIds.add(id));
  if(Array.isArray(d.shop)){
    d.shop.forEach(s=>{
      const it = shopItems.find(i=>i.id===s.id);
      if(it && typeof s.cost==="number") it.cost = s.cost;
    });
  }
  renderBadges(); render();
}
const encryptData = (s)=>btoa(unescape(encodeURIComponent(s)));
const decryptData = (s)=>decodeURIComponent(escape(atob(s)));

function downloadSave(){
  try{
    const enc = encryptData(getSaveData());
    const blob = new Blob([enc], {type:"application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "yajurenda_save.yjrnd";
    document.body.appendChild(a);
    setTimeout(()=>{ a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); makeToast("✅ セーブをダウンロードしました"); }, 30);
  }catch(e){ alert("⚠️ セーブに失敗しました: "+e.message); }
}
function uploadSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ const decrypted = decryptData(reader.result); loadSaveData(decrypted); makeToast("✅ セーブを読み込みました"); }
    catch(e){ alert("⚠️ 読み込みに失敗しました: "+e.message); }
  };
  reader.readAsText(file);
}

/* ========== Footer Extra Buttons ========== */
// ダークモード切替
const footer = document.querySelector(".site-footer");
const themeBtn = document.createElement("button");
themeBtn.textContent = "🌙/☀️";
themeBtn.style.marginLeft = "12px";
themeBtn.onclick = ()=>{
  document.body.classList.toggle("dark");
};
footer.appendChild(themeBtn);

// 長押し購入モード切替
const holdBtn = document.createElement("button");
holdBtn.textContent = "長押し購入モード:OFF";
holdBtn.style.marginLeft = "12px";
holdBtn.onclick = ()=>{
  holdBuyMode = !holdBuyMode;
  holdBtn.textContent = `長押し購入モード:${holdBuyMode?"ON":"OFF"}`;
  render();
};
footer.appendChild(holdBtn);

// エンディング再視聴（バッジ獲得済みなら有効）
const endingBtn = document.createElement("button");
endingBtn.textContent = "🎬 エンディング";
endingBtn.style.marginLeft = "12px";
endingBtn.onclick = ()=>{
  if(unlockedBadgeIds.has(1145141919810)) showEndingOption();
  else makeToast("⚠️ 条件未達成です");
};
footer.appendChild(endingBtn);
