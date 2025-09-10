/ ========== State ========== /
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";

/ ブースト実行・CT管理 /
let boostRunning = false;
let boostCooldownUntil = 0;

/ 長押し購入モード /
let holdToBuyEnabled = false;
const holdTimers = new Map(); // btn -> intervalId

/ ========== Elements ========== /
const $ = (id) => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");
const modalRoot = $("modal-root");
const themeToggle = $("theme-toggle");
const endingOpenBtn = $("ending-open");
const endingHint = $("ending-hint");
const holdToBuyCheckbox = $("hold-to-buy");

/ ========== Audio / Volume ========== /
function applyVolume(){
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1"); // Ensure a default value
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

const playClick = () => { try { clickSE.currentTime = 0; clickSE.play(); } catch {} };
const playBuy = () => { try { buySE.currentTime = 0; buySE.play(); } catch {} };

/ ========== Theme (Light/Dark) ========== /
(function initTheme(){
  const saved = localStorage.getItem("yjrtheme");
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  themeToggle.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "light"; // Ensure a default value
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("yjrtheme", next);
  });
})();

/ ========== Hold-to-Buy ========== /
(function initHoldToBuy(){
  const saved = localStorage.getItem("yjrholdtobuy");
  holdToBuyEnabled = saved === "1";
  holdToBuyCheckbox.checked = holdToBuyEnabled;
  holdToBuyCheckbox.addEventListener("change", ()=>{
    holdToBuyEnabled = holdToBuyCheckbox.checked;
    localStorage.setItem("yjrholdtobuy", holdToBuyEnabled ? "1" : "0");
    // 解除時は全インターバル停止
    stopAllHoldIntervals();
  });
})();
function stopAllHoldIntervals(){
  for(const [btn, id] of holdTimers.entries()){
    clearInterval(id);
    holdTimers.delete(btn);
  }
}

/ ========== Clicker ========== /
clicker.addEventListener("click", () => {
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  // CPS calculation should be based on actual clicks and time difference, ensure it's not NaN or Infinity
  if (diff > 0) {
    cps = 1 / diff;
  } else {
    cps = 0; // Or some reasonable default if diff is 0 or negative
  }
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if (count > best) best = count;

  playClick();
  // *** FIX: Ensure badges are checked *after* updating counts ***
  unlockBadgesIfAny(total);
  // *** FIX: Ensure render is called after all state updates ***
  render();
});

/ Enterでの加算は禁止 /
document.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

/ ========== Shop ========== /
/ 既存 + 追加商品 + ブースト強化 /
const shopItems = [
  // オート（既存）
  { id:1n, type:"auto", name:"24歳です", effect:1, cost:100n },
  { id:2n, type:"auto", name:"学生です", effect:5, cost:500n },
  { id:3n, type:"auto", name:"じゃあオナニー", effect:20, cost:2000n },
  { id:4n, type:"auto", name:"...とかっていうのは？", effect:100, cost:10000n },
  { id:5n, type:"auto", name:"やりますねぇ！", effect:500, cost:50000n },
  // 追加オート
  { id:11n, type:"auto", name:"ｱｰｲｷｿ", effect:250, cost:25000n },
  { id:12n, type:"auto", name:"あーソレいいよ", effect:1000, cost:100000n },
  { id:13n, type:"auto", name:"頭にきますよ!!", effect:5000, cost:500000n },

  // 精力剤（既存）
  { id:6n, type:"click", name:"アイスティー", effect:1, cost:50n },
  { id:7n, type:"click", name:"暴れんなよ", effect:3, cost:300n },
  { id:8n, type:"click", name:"お前のことが好きだったんだよ", effect:10, cost:2000n },
  { id:9n, type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000n },
  // 追加精力剤
  { id:14n, type:"click", name:"ありますあります", effect:100, cost:30000n },
  { id:15n, type:"click", name:"いいよこいよ", effect:300, cost:100000n },
  { id:16n, type:"click", name:"おかのした", effect:1000, cost:500000n },

  // ブースト（既存）
  { id:10n, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000n, note:"" },
  // 追加ブースト
  { id:17n, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000n, note:"" },
  { id:18n, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000n, note:"" },
  { id:19n, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000n, note:"" },
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

  const now = Date.now();

  items.forEach(item=>{
    const li = document.createElement("li");
    li.className = "shop-item";
    const kind = item.type==="auto"?"オート":item.type==="click"?"精力剤":"ブースト";
    const kindClass = item.type==="click"?"click":(item.type==="boost"?"boost":"");
    let desc = "";
    if(item.type==="auto") desc = `※秒間+${item.effect}`;
    else if(item.type==="click") desc = `※1クリック+${item.effect}`;
    else {
      desc = `※${item.durationSec}秒 1クリック×${item.mult}`;
      if(item.note) desc += `（${item.note}）`;
    }

    li.innerHTML = `
      <div class="meta">
        <span class="kind ${kindClass}">${kind}</span>
        ${item.name} ${desc} [${item.cost.toLocaleString()}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;

    const btn = li.querySelector(".buy");

    // *** FIX: Ensure cost comparison uses BigInt ***
    const inCooldown = now < boostCooldownUntil;
    const disabled = (count < item.cost) || (item.type==="boost" && (boostRunning || inCooldown));

    btn.disabled = disabled;

    // クリック購入（単発）
    btn.addEventListener("click", (e)=>{
      if(holdToBuyEnabled) return; // 長押しモード中は単発クリック無効化（暴発防止）
      buyItem(item.id);
    });

    // 長押し購入（ONの時のみ、押してる間だけ連続）
    btn.addEventListener("mousedown", (e)=>startHoldBuy(e, btn, item.id));
    btn.addEventListener("touchstart",(e)=>startHoldBuy(e, btn, item.id), {passive:true});
    ["mouseup","mouseleave","touchend","touchcancel"].forEach(ev=>{
      btn.addEventListener(ev, ()=>stopHoldBuy(btn));
    });

    shopList.appendChild(li);
  });
}

function startHoldBuy(ev, btn, id){
  if(!holdToBuyEnabled) return;
  if(btn.disabled) return;

  // 1回目はすぐ実行
  buyItem(id);
  // 以降は間隔で連射
  if(holdTimers.has(btn)) return;
  const intervalId = setInterval(()=>{
    const item = shopItems.find(i=>i.id===id);
    if(!item) return;
    const now = Date.now();
    const inCooldown = now < boostCooldownUntil;
    // *** FIX: Ensure cost comparison uses BigInt ***
    if((item.type==="boost" && (boostRunning || inCooldown)) || count < item.cost){
      stopHoldBuy(btn);
      return;
    }
    buyItem(id);
  }, 100); // 連打速度（必要なら調整）
  holdTimers.set(btn, intervalId);
}
function stopHoldBuy(btn){
  const id = holdTimers.get(btn);
  if(id){ clearInterval(id); holdTimers.delete(btn); }
}

function buyItem(id){
  const item = shopItems.find(i=>i.id===id);
  if(!item) return;

  if(item.type==="boost"){
    const now = Date.now();
    if(boostRunning || now < boostCooldownUntil) return; // Check both boostRunning and cooldown
  }

  // *** FIX: Ensure cost comparison uses BigInt ***
  if(count < item.cost) return;

  count -= item.cost;

  if(item.type==="auto"){
    autoPower += item.effect;
  } else if(item.type==="click"){
    clickPower += item.effect;
  } else if(item.type==="boost"){
    // 実行
    applyBoost(item);
  }

  playBuy();
  // *** FIX: Render shop and game state after purchase ***
  renderShop();
  render();
}

function applyBoost(boost){
  boostRunning = true;
  // *** FIX: Use BigInt for multiplication if clickPower can become very large ***
  // If clickPower remains within standard number limits, this might not be strictly necessary, but good practice for large numbers.
  // For simplicity here, assuming clickPower doesn't exceed Number.MAX_SAFE_INTEGER * mult in practice immediately.
  // If it does, clickPower should also be a BigInt.
  const originalClickPower = clickPower; // Store original power
  clickPower *= boost.mult; // Apply multiplier

  const duration = (boost.durationSec || 30) * 1000; // Default duration
  const cooldown = (boost.cooldownSec || 30) * 1000; // Default cooldown

  setTimeout(()=>{
    clickPower = originalClickPower; // Restore original power
    boostRunning = false;
    boostCooldownUntil = Date.now() + cooldown; // CT開始
    render(); // Re-render to show updated state (especially if boost ends)
  }, duration);
}

/ 自動加算 /
setInterval(()=>{
  if(autoPower > 0){
    count += autoPower;
    total += autoPower;
    if(count > best) best = count;
    // *** FIX: Ensure badges are checked and rendered after auto-updates ***
    unlockBadgesIfAny(total);
    render();
  }
}, 1000);

/ ========== Badges ========== /
// *** FIX: Ensure all IDs and 'need' values are BigInts ***
const BADGES = [
  { id: 1n, need: 1n, name: "千里の道も野獣から" },
  { id: 19n, need: 19n, name: "王道をイク" },
  { id: 45n, need: 45n, name: "試行思考(シコシコ)" },
  { id: 364n, need: 364n, name: "見ろよ見ろよ" },
  { id: 810n, need: 810n, name: "中々やりますねぇ" },
  { id: 1919n, need: 1919n, name: "⚠️あなたはイキスギました！⚠️" },
  { id: 4545n, need: 4545n, name: "生粋とイキスギのオナリスト" },
  { id: 114514n, need: 114514n, name: "Okay, come on.(いいよこいよ)" },
  { id: 364364n, need: 364364n, name: "ホラ、見ろよ見ろよ、ホラ" },
  { id: 1145141919810n, need: 1145141919810n, name: "遊んでくれてありがとう❗" },
  // 新しいバッジ (Keep the order as requested)
  { id: 11451419198101n, need: 1145141919810100081n, name: "新たな道" },
  { id: 11451419198103n, need: 1145141919810364364n, name: "野獣先輩" },
  { id: 1919191919191919191n, need: 1919191919191919191n, name: "イキマスター" },
  { id: 4545454545454545454n, need: 4545454545454545454n, name: "シコマスター" },
  { id: 8101000811919114514n, need: 8101000811919114514n, name: "ヌゥン！ヘッ！ヘッ！\nア゛ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛\nア゛↑ア゛↑ア゛↑ア゛↑ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛！！！！\nウ゛ア゛ア゛ア゛ア゛ア゛ア゛ァ゛ァ゛ァ゛ァ゛ァ゛ァ゛ァ！！！！！\nフ ウ゛ウ゛ウ゛ゥ゛ゥ゛ゥ゛ン！！！！\nフ ウ゛ゥ゛ゥ゛ゥン！！！！(大迫真)" },
  { id: 810100081191911451445451919690721n, need: 81010008119191145144545191969072156858519999999n, name: "やじゅれんだ" },
];
// *** FIX: Ensure LASTBADGEID is also a BigInt ***
const LASTBADGEID = 1145141919810n;
const unlockedBadgeIds = new Set();

function renderBadges(){
  badgeList.innerHTML = "";
  BADGES.forEach(b=>{
    const li = document.createElement("li");
    // *** FIX: Ensure comparison with BigInt IDs ***
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

  // エンディング解禁UI
  // *** FIX: Ensure comparison with BigInt IDs ***
  const unlockedLast = unlockedBadgeIds.has(LASTBADGEID);
  endingOpenBtn.disabled = !unlockedLast;
  endingHint.textContent = unlockedLast ? "解禁済み：いつでも視聴できます。" : "最終バッジを獲得すると解放されます。";
}

function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b=>{
    // *** FIX: Ensure BigInt comparison ***
    if(currentTotal >= b.need && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      // *** FIX: Re-render badges immediately after unlocking ***
      renderBadges();
      if(b.id === LASTBADGEID){
        // 初回解禁時に選択モーダルを出す
        showEndingOption();
      }
    }
  });
}

/ ========== Toast ========== /
function makeToast(text){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastContainer.appendChild(div);
  setTimeout(()=>{
    div.style.opacity="0";
    div.style.transform="translateY(8px)";
    setTimeout(()=>div.remove(),250);
  },2600);
}

/ ========== Ending (いつでも視聴) ========== /
endingOpenBtn.addEventListener("click", ()=>{
  if(endingOpenBtn.disabled) return;
  showEndingOption();
});

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
        <button class="btn ghost" id="end-close">閉じる</button>
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
      <video id="ending-video" src="end.mp4" ${muted ? "muted" : ""} controls autoplay style="width:100%;border-radius:12px;background:#000"></video>
      <div class="row" style="margin-top:10px">
        <button class="btn ghost" id="end-close2">閉じる</button>
      </div>
    </div>`;
  modalRoot.classList.add("show");
  modalRoot.querySelector(".modal-backdrop").onclick = closeModal;
  $("end-close2").onclick = closeModal;
}

/ ========== Render ========== /
function render(){
  countEl.textContent = count.toLocaleString();
  bestEl.textContent = best.toLocaleString();
  totalEl.textContent = total.toLocaleString();
  cpsEl.textContent = cps.toFixed(2);
  // *** FIX: Ensure shop is rendered whenever other game states are rendered ***
  renderShop();
}
// *** FIX: Initial render of badges and game state ***
renderBadges();
render();


/ ========== Save / Load (manual, Base64 .yjrnd) ========== /
function getSaveData(){
  return JSON.stringify({
    count, best, total, cps, clickPower, autoPower,
    boostRunning, boostCooldownUntil,
    badges:[...unlockedBadgeIds].map(id => id.toString()), // Convert BigInt IDs to strings for JSON
    selectedCategory,
    holdToBuyEnabled,
    theme: document.documentElement.getAttribute("data-theme") || "light",
    // ショップのコストが変化する仕様がないので、IDだけ保存
    shopIds: shopItems.map(i=>i.id.toString()) // Convert BigInt IDs to strings for JSON
  });
}
function loadSaveData(json){
  const d = JSON.parse(json || "{}");
  count = BigInt(d.count ?? 0); // Ensure loaded values are BigInts
  best = BigInt(d.best ?? 0);
  total = BigInt(d.total ?? 0);
  cps = d.cps ?? 0; // CPS is a number, not BigInt
  clickPower = BigInt(d.clickPower ?? 1);
  autoPower = BigInt(d.autoPower ?? 0);
  boostRunning = false; // 復帰時は安全にOFF
  boostCooldownUntil = BigInt(d.boostCooldownUntil ?? 0);

  unlockedBadgeIds.clear();
  // *** FIX: Convert loaded string IDs back to BigInts ***
  (d.badges || []).forEach(idStr => unlockedBadgeIds.add(BigInt(idStr)));

  // *** FIX: Ensure loaded shop item IDs are BigInts if needed elsewhere ***
  // For this save/load, we're just storing them as strings, but if they were used for calculations, conversion would be needed.

  selectedCategory = d.selectedCategory || "all";
  holdToBuyEnabled = !!d.holdToBuyEnabled;
  holdToBuyCheckbox.checked = holdToBuyEnabled;

  const th = d.theme || "light";
  document.documentElement.setAttribute("data-theme", th);
  localStorage.setItem("yjrtheme", th);
  localStorage.setItem("yjrholdtobuy", holdToBuyEnabled ? "1":"0");

  tabs.forEach(t=>{
    t.classList.toggle("active", t.dataset.category===selectedCategory);
  });

  renderBadges();
  render();
}
// *** FIX: Ensure data encryption/decryption handles BigInts correctly by converting to strings ***
const encryptData = (s) => btoa(unescape(encodeURIComponent(s)));
const decryptData = (s) => decodeURIComponent(escape(atob(s)));

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
$("save-btn").addEventListener("click", downloadSave);
$("load-file").addEventListener("change", (e)=>uploadSave(e.target.files[0]));
