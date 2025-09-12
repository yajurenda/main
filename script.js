/* ========== State ========== */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";

let boostRunning = false;
let boostCooldownUntil = 0;

let holdToBuyEnabled = false;
const holdTimers = new Map();

const unlockedBadgeIds = new Set();

/* ========== Elements ========== */
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

/* ========== Audio ========== */
function applyVolume(){
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

function playClick(){ try{ clickSE.currentTime=0; clickSE.play(); }catch{} }
function playBuy(){ try{ buySE.currentTime=0; buySE.play(); }catch{} }

/* ========== Theme ========== */
(function initTheme(){
  const saved = localStorage.getItem("yjr_theme");
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  themeToggle.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("yjr_theme", next);
  });
})();

/* ========== Hold-to-Buy ========== */
(function initHoldToBuy(){
  const saved = localStorage.getItem("yjr_hold_to_buy");
  holdToBuyEnabled = saved === "1";
  holdToBuyCheckbox.checked = holdToBuyEnabled;
  holdToBuyCheckbox.addEventListener("change", ()=>{
    holdToBuyEnabled = holdToBuyCheckbox.checked;
    localStorage.setItem("yjr_hold_to_buy", holdToBuyEnabled ? "1":"0");
    stopAllHoldIntervals();
  });
})();
function stopAllHoldIntervals(){
  for(const [btn,id] of holdTimers.entries()){
    clearInterval(id); holdTimers.delete(btn);
  }
}

/* ========== Clicker ========== */
clicker.addEventListener("click", ()=>{
  const now = Date.now();
  const diff = (now - lastClickTime)/1000;
  if(diff>0) cps = 1/diff;
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if(count>best) best = count;

  playClick();
  unlockBadgesIfAny(total);
  render();
});

/* ========== Shop ========== */
const shopItems = [
  { id:1,  type:"auto",  name:"24歳です", effect:1,   cost:100, owned:0 },
  { id:2,  type:"auto",  name:"学生です", effect:5,   cost:500, owned:0 },
  { id:3,  type:"auto",  name:"じゃあオナニー", effect:20,  cost:2000, owned:0 },
  { id:4,  type:"auto",  name:"...とかっていうのは？", effect:100, cost:10000, owned:0 },
  { id:5,  type:"auto",  name:"やりますねぇ！", effect:500, cost:50000, owned:0 },
  { id:11, type:"auto",  name:"ｱｰｲｷｿ", effect:250, cost:25000, owned:0 },
  { id:12, type:"auto",  name:"あーソレいいよ", effect:1000, cost:100000, owned:0 },
  { id:13, type:"auto",  name:"頭にきますよ!!", effect:5000, cost:500000, owned:0 },

  { id:6,  type:"click", name:"アイスティー", effect:1,   cost:50, owned:0 },
  { id:7,  type:"click", name:"暴れんなよ", effect:3,   cost:300, owned:0 },
  { id:8,  type:"click", name:"お前のことが好きだったんだよ", effect:10,  cost:2000, owned:0 },
  { id:9,  type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000, owned:0 },
  { id:14, type:"click", name:"ありますあります", effect:100, cost:30000, owned:0 },
  { id:15, type:"click", name:"いいよこいよ", effect:300, cost:100000, owned:0 },
  { id:16, type:"click", name:"おかのした", effect:1000, cost:500000, owned:0 },

  { id:10, type:"boost", name:"ンアッー！", mult:2, durationSec:30, cooldownSec:30, cost:1000, owned:0 },
  { id:17, type:"boost", name:"俺もやったんだからさ", mult:5, durationSec:30, cooldownSec:60, cost:5000, owned:0 },
  { id:18, type:"boost", name:"おまたせ", mult:10, durationSec:60, cooldownSec:120, cost:20000, owned:0 },
  { id:19, type:"boost", name:"溜まってんなあおい", mult:20, durationSec:15, cooldownSec:45, cost:100000, owned:0 },
];

function buyItem(item){
  if(count < item.cost) return;
  count -= item.cost;
  item.owned++;
  playBuy();

  if(item.type==="auto") autoPower += item.effect;
  if(item.type==="click") clickPower += item.effect;
  if(item.type==="boost") activateBoost(item);

  render();
}

function renderShop(){
  shopList.innerHTML="";
  shopItems.forEach(item=>{
    if(selectedCategory!=="all" && item.type!==selectedCategory) return;
    const li = document.createElement("li");
    li.className="shop-item";
    li.innerHTML=`
      <span>${item.name}</span>
      <span>値段:${item.cost.toLocaleString()}</span>
      <span>所持:${item.owned}</span>
      <button class="buy-btn">購入</button>
    `;
    const btn = li.querySelector("button");
    btn.addEventListener("click",()=>buyItem(item));
    if(holdToBuyEnabled){
      btn.addEventListener("mousedown",()=>{
        const id=setInterval(()=>buyItem(item),150);
        holdTimers.set(btn,id);
      });
      btn.addEventListener("mouseup",()=>{ clearInterval(holdTimers.get(btn)); holdTimers.delete(btn); });
      btn.addEventListener("mouseleave",()=>{ clearInterval(holdTimers.get(btn)); holdTimers.delete(btn); });
    }
    shopList.appendChild(li);
  });
}

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
  { id:"bLast", need:"1145141919810", name:"遊んでくれてありがとう❗" },
  { id:"bX1", need:"1145141919810100081", name:"新たな道" },
  { id:"bX2", need:"1145141919810364364", name:"野獣先輩" },
  { id:"bX3", need:"1919191919191919191", name:"イキマスター" },
  { id:"bX4", need:"4545454545454545454", name:"シコマスター" },
  { id:"bX5", need:"8101000811919114514", name:"ヌゥン！ヘッ！…(大迫真)" },
  { id:"bX6", need:"81010008119191145144545191969072156858519999999", name:"やじゅれんだ" },
];
const LAST_BADGE_ID = "bLast";

function unlockBadgesIfAny(currentTotal){
  BADGES.forEach(b=>{
    if(BigInt(currentTotal)>=BigInt(b.need) && !unlockedBadgeIds.has(b.id)){
      unlockedBadgeIds.add(b.id);
      makeToast(`バッジを獲得: ${b.name}`);
      renderBadges();
      if(b.id===LAST_BADGE_ID) showEndingOption();
    }
  });
}

function renderBadges(){
  badgeList.innerHTML="";
  BADGES.forEach(b=>{
    const li=document.createElement("li");
    const unlocked=unlockedBadgeIds.has(b.id);
    li.className="badge "+(unlocked?"unlocked":"locked");
    li.innerHTML=`<span>${unlocked?b.name:"？？？"}</span>`;
    badgeList.appendChild(li);
  });
  const unlockedLast=unlockedBadgeIds.has(LAST_BADGE_ID);
  endingOpenBtn.disabled=!unlockedLast;
  endingHint.textContent=unlockedLast?"解禁済み：いつでも視聴できます。":"最終バッジを獲得すると解放されます。";
}

/* ========== Toast ========== */
function makeToast(text){
  const div=document.createElement("div");
  div.className="toast"; div.textContent=text;
  toastContainer.appendChild(div);
  setTimeout(()=>{ div.style.opacity="0"; setTimeout(()=>div.remove(),250); },2000);
}

/* ========== Ending ========== */
endingOpenBtn.addEventListener("click", ()=>{ if(!endingOpenBtn.disabled) showEndingOption(); });
function showEndingOption(){
  modalRoot.innerHTML=`<div class="modal"><video src="end.mp4" controls autoplay style="width:100%"></video></div>`;
}

/* ========== Render ========== */
function render(){
  countEl.textContent=count.toLocaleString();
  bestEl.textContent=best.toLocaleString();
  totalEl.textContent=total.toLocaleString();
  cpsEl.textContent=cps.toFixed(2);
  renderShop();
}
renderBadges(); render();

/* ========== Save / Load ========== */
function getSaveData(){
  return JSON.stringify({
    count,best,total,cps,clickPower,autoPower,
    badges:[...unlockedBadgeIds],
    shop:shopItems.map(i=>({id:i.id,owned:i.owned})),
  });
}
function loadSaveData(json){
  const d=JSON.parse(json||"{}");
  count=d.count||0; best=d.best||0; total=d.total||0; cps=d.cps||0;
  clickPower=d.clickPower||1; autoPower=d.autoPower||0;
  unlockedBadgeIds.clear();
  (d.badges||[]).forEach(id=>unlockedBadgeIds.add(id));
  if(d.shop){ d.shop.forEach(s=>{ const item=shopItems.find(i=>i.id===s.id); if(item) item.owned=s.owned; }); }
  renderBadges(); render();
}
function encryptData(s){ return btoa(unescape(encodeURIComponent(s))); }
function decryptData(s){ return decodeURIComponent(escape(atob(s))); }
function downloadSave(){
  const enc=encryptData(getSaveData());
  const blob=new Blob([enc],{type:"application/octet-stream"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="yajurenda_save.yjrnd";
  a.click(); URL.revokeObjectURL(url);
}
function uploadSave(file){
  const r=new FileReader();
  r.onload=()=>{ try{ const d=decryptData(r.result); loadSaveData(d); }catch(e){ alert("ロード失敗"); } };
  r.readAsText(file);
}
$("save-btn").addEventListener("click", downloadSave);
$("load-file").addEventListener("change", (e)=>uploadSave(e.target.files[0]));
