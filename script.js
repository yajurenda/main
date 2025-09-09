/* ==========================
   やじゅれんだ main.js
========================== */

/* --- State --- */
let count = 0, best = 0, total = 0, cps = 0;
let clickPower = 1, autoPower = 0;
let lastClickTime = Date.now();
let selectedCategory = "all";

/* ブースト管理 */
let boostRunning = false;
let boostCooldownUntil = 0;

/* 長押し購入 */
let holdToBuy = false;
const holdTimers = new Map();

/* --- Elements --- */
const $ = (id) => document.getElementById(id);
const countEl = $("count"), bestEl = $("best"), totalEl = $("total"), cpsEl = $("cps");
const clicker = $("clicker"), shopList = $("shop-list"), badgeList = $("badge-list");
const tabs = document.querySelectorAll(".tab");
const toastContainer = $("toast-container");
const muteEl = $("mute"), volumeEl = $("volume");
const clickSE = $("se-click"), buySE = $("se-buy");
const modalRoot = document.querySelector(".modal-root");
const toggleThemeBtn = $("toggle-theme");
const toggleLongpressBtn = $("toggle-longpress");

/* --- Audio --- */
function applyVolume(){
  const vol = muteEl.checked ? 0 : parseFloat(volumeEl.value || "1");
  [clickSE, buySE].forEach(a => { a.volume = vol; a.muted = vol === 0; });
}
muteEl.addEventListener("change", applyVolume);
volumeEl.addEventListener("input", applyVolume);
applyVolume();

const playClick = () => { try{ clickSE.currentTime=0; clickSE.play(); }catch{} };
const playBuy   = () => { try{ buySE.currentTime=0; buySE.play(); }catch{} };

/* --- Theme --- */
(function(){
  if(localStorage.getItem("theme")==="dark") document.body.classList.add("dark");
})();
toggleThemeBtn.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark")?"dark":"light");
});

/* --- 長押し購入 --- */
(function(){
  holdToBuy = localStorage.getItem("holdToBuy")==="1";
  updateHoldBtn();
})();
toggleLongpressBtn.addEventListener("click", ()=>{
  holdToBuy=!holdToBuy;
  localStorage.setItem("holdToBuy", holdToBuy?"1":"0");
  updateHoldBtn();
  stopAllHoldIntervals();
});
function updateHoldBtn(){
  toggleLongpressBtn.textContent = `🖱️ 長押し購入: ${holdToBuy?"ON":"OFF"}`;
}
function stopAllHoldIntervals(){
  for(const [btn,id] of holdTimers.entries()){ clearInterval(id); holdTimers.delete(btn); }
}

/* --- Clicker --- */
clicker.addEventListener("click", ()=>{
  const now = Date.now();
  const diff = (now - lastClickTime) / 1000;
  if(diff>0) cps = 1/diff;
  lastClickTime = now;

  count += clickPower;
  total += clickPower;
  if(count>best) best = count;

  playClick();
  unlockBadges(total);
  render();
});

/* --- Shop Items --- */
const shopItems = [
  // Auto
  {id:1, type:"auto", name:"24歳です", effect:1, cost:100},
  {id:2, type:"auto", name:"学生です", effect:5, cost:500},
  {id:3, type:"auto", name:"じゃあオナニー", effect:20, cost:2000},
  {id:4, type:"auto", name:"...とかっていうのは？", effect:100, cost:10000},
  {id:5, type:"auto", name:"やりますねぇ！", effect:500, cost:50000},
  {id:11,type:"auto",name:"ｱｰｲｷｿ",effect:250,cost:25000},
  {id:12,type:"auto",name:"あーソレいいよ",effect:1000,cost:100000},
  {id:13,type:"auto",name:"頭にきますよ!!",effect:5000,cost:500000},

  // Click
  {id:6, type:"click", name:"アイスティー", effect:1, cost:50},
  {id:7, type:"click", name:"暴れんなよ", effect:3, cost:300},
  {id:8, type:"click", name:"お前のことが好きだったんだよ", effect:10, cost:2000},
  {id:9, type:"click", name:"イキスギィ！イク！イクイクイクイク…アッ……ァ...", effect:50, cost:15000},
  {id:14,type:"click",name:"ありますあります",effect:100,cost:30000},
  {id:15,type:"click",name:"いいよこいよ",effect:300,cost:100000},
  {id:16,type:"click",name:"おかのした",effect:1000,cost:500000},

  // Boost
  {id:10,type:"boost",name:"ンアッー！",mult:2,durationSec:30,cooldownSec:30,cost:1000},
  {id:17,type:"boost",name:"俺もやったんだからさ",mult:5,durationSec:30,cooldownSec:60,cost:5000},
  {id:18,type:"boost",name:"おまたせ",mult:10,durationSec:60,cooldownSec:120,cost:20000},
  {id:19,type:"boost",name:"溜まってんなあおい",mult:20,durationSec:15,cooldownSec:45,cost:100000},
];

/* --- Shop Rendering --- */
tabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    selectedCategory = tab.dataset.category;
    renderShop();
  });
});

function renderShop(){
  shopList.innerHTML="";
  let items=[...shopItems];
  if(selectedCategory==="auto") items=items.filter(i=>i.type==="auto");
  else if(selectedCategory==="click") items=items.filter(i=>i.type==="click");
  else if(selectedCategory==="boost") items=items.filter(i=>i.type==="boost");
  else if(selectedCategory==="low") items.sort((a,b)=>a.cost-b.cost);
  else if(selectedCategory==="high") items.sort((a,b)=>b.cost-a.cost);

  const now=Date.now();
  items.forEach(item=>{
    const li=document.createElement("li");
    li.className="shop-item";
    let desc="";
    if(item.type==="auto") desc=`※秒間+${item.effect}`;
    else if(item.type==="click") desc=`※1クリック+${item.effect}`;
    else desc=`※${item.durationSec}s 1クリック×${item.mult}`;
    li.innerHTML=`
      <div class="meta">
        <span class="kind ${item.type}">${item.type}</span>
        ${item.name} ${desc} [${item.cost.toLocaleString()}回]
      </div>
      <div><button class="buy" data-id="${item.id}">購入</button></div>
    `;
    const btn=li.querySelector(".buy");
    const inCooldown=now<boostCooldownUntil;
    btn.disabled=(count<item.cost)||(item.type==="boost"&&(boostRunning||inCooldown));
    btn.addEventListener("click",()=>{ if(!holdToBuy) buyItem(item.id); });
    btn.addEventListener("mousedown",()=>startHoldBuy(btn,item.id));
    btn.addEventListener("touchstart",()=>startHoldBuy(btn,item.id));
    ["mouseup","mouseleave","touchend","touchcancel"].forEach(ev=>{
      btn.addEventListener(ev,()=>stopHoldBuy(btn));
    });
    shopList.appendChild(li);
  });
}

function startHoldBuy(btn,id){
  if(!holdToBuy) return;
  if(btn.disabled) return;
  buyItem(id);
  if(holdTimers.has(btn)) return;
  const intervalId=setInterval(()=>{
    const item=shopItems.find(i=>i.id===id);
    if(!item){ stopHoldBuy(btn); return; }
    const now=Date.now();
    const inCooldown=now<boostCooldownUntil;
    if((item.type==="boost"&&(boostRunning||inCooldown))||count<item.cost){
      stopHoldBuy(btn); return;
    }
    buyItem(id);
  },120);
  holdTimers.set(btn,intervalId);
}
function stopHoldBuy(btn){
  const id=holdTimers.get(btn);
  if(id){clearInterval(id);holdTimers.delete(btn);}
}

function buyItem(id){
  const item=shopItems.find(i=>i.id===id);
  if(!item) return;
  if(item.type==="boost"){
    const now=Date.now();
    if(boostRunning||now<boostCooldownUntil) return;
  }
  if(count<item.cost) return;
  count-=item.cost;
  if(item.type==="auto") autoPower+=item.effect;
  else if(item.type==="click") clickPower+=item.effect;
  else applyBoost(item);
  playBuy();
  render();
}

function applyBoost(boost){
  boostRunning=true;
  const mult=boost.mult||2;
  const duration=(boost.durationSec||30)*1000;
  const cooldown=(boost.cooldownSec||30)*1000;
  clickPower*=mult;
  setTimeout(()=>{
    clickPower/=mult;
    boostRunning=false;
    boostCooldownUntil=Date.now()+cooldown;
    render();
  },duration);
}

/* --- Auto Add --- */
setInterval(()=>{
  if(autoPower>0){
    count+=autoPower; total+=autoPower;
    if(count>best) best=count;
    unlockBadges(total);
    render();
  }
},1000);

/* --- Badges --- */
const BADGES=[
  {id:1,need:1,name:"千里の道も野獣から"},
  {id:19,need:19,name:"王道をイク"},
  {id:45,need:45,name:"試行思考(シコシコ)"},
  {id:364,need:364,name:"見ろよ見ろよ"},
  {id:810,need:810,name:"中々やりますねぇ"},
  {id:1919,need:1919,name:"⚠️あなたはイキスギました！⚠️"},
  {id:4545,need:4545,name:"生粋とイキスギのオナリスト"},
  {id:114514,need:114514,name:"Okay, come on.(いいよこいよ)"},
  {id:364364,need:364364,name:"ホラ、見ろよ見ろよ、ホラ"},
  {id:1145141919810,need:1145141919810,name:"遊んでくれてありがとう❗"},
  // 新しい追加バッジ
  {id:1145141919810100081n,need:1145141919810100081n,name:"新たな道"},
  {id:1145141919810364364n,need:1145141919810364364n,name:"野獣先輩"},
  {id:1919191919191919191n,need:1919191919191919191n,name:"イキマスター"},
  {id:4545454545454545454n,need:4545454545454545454n,name:"シコマスター"},
  {id:8101000811919114514n,need:8101000811919114514n,name:"ヌゥン！ヘッ！ヘッ！... (大迫真)"},
  {id:810100081191911451445451919690721n,need:810100081191911451445451919690721n,name:"やじゅれんだ"},
];
const unlockedBadges=new Set();
function renderBadges(){
  badgeList.innerHTML="";
  BADGES.forEach(b=>{
    const li=document.createElement("li");
    const unlocked=unlockedBadges.has(b.id.toString());
    li.className="badge "+(unlocked?"unlocked":"locked");
    li.innerHTML=`
      <span class="label">${unlocked?b.name:"？？？"}</span>
      <span class="cond">${unlocked?"入手済み":`解禁: ${b.need}`}</span>
    `;
    li.onclick=()=>alert(`${b.name}\n${unlocked?"入手済み":`解禁条件: ${b.need}クリック`}`);
    badgeList.appendChild(li);
  });
}
function unlockBadges(total){
  BADGES.forEach(b=>{
    if(BigInt(total)>=BigInt(b.need)&&!unlockedBadges.has(b.id.toString())){
      unlockedBadges.add(b.id.toString());
      makeToast(`🏆 バッジ獲得: ${b.name}`);
      renderBadges();
    }
  });
}

/* --- Toast --- */
function makeToast(text){
  const div=document.createElement("div");
  div.className="toast";
  div.textContent=text;
  toastContainer.appendChild(div);
  setTimeout(()=>{div.style.opacity="0";div.style.transform="translateY(8px)";setTimeout(()=>div.remove(),250);},2500);
}

/* --- Render --- */
function render(){
  countEl.textContent=count.toLocaleString();
  bestEl.textContent=best.toLocaleString();
  totalEl.textContent=total.toLocaleString();
  cpsEl.textContent=cps.toFixed(2);
  renderShop();
}
renderBadges(); render();

/* --- Save/Load --- */
function getSaveData(){
  return JSON.stringify({
    count,best,total,cps,clickPower,autoPower,
    boostCooldownUntil,
    badges:[...unlockedBadges],
    selectedCategory,
    holdToBuy,
    theme:document.body.classList.contains("dark")?"dark":"light"
  });
}
function loadSaveData(json){
  const d=JSON.parse(json||"{}");
  count=d.count??0; best=d.best??0; total=d.total??0; cps=d.cps??0;
  clickPower=d.clickPower??1; autoPower=d.autoPower??0;
  boostRunning=false;
  boostCooldownUntil=d.boostCooldownUntil??0;
  unlockedBadges.clear(); (d.badges||[]).forEach(id=>unlockedBadges.add(id.toString()));
  selectedCategory=d.selectedCategory||"all";
  holdToBuy=!!d.holdToBuy; updateHoldBtn();
  document.body.classList.toggle("dark",d.theme==="dark");
  renderBadges(); render();
}
const encryptData=(s)=>btoa(unescape(encodeURIComponent(s)));
const decryptData=(s)=>decodeURIComponent(escape(atob(s)));
function downloadSave(){
  try{
    const enc=encryptData(getSaveData());
    const blob=new Blob([enc],{type:"application/octet-stream"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="yajurenda_save.yjrnd";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); makeToast("💾 セーブしました");
  }catch(e){ alert("セーブ失敗:"+e.message); }
}
function uploadSave(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{const dec=decryptData(reader.result); loadSaveData(dec); makeToast("📂 読み込み完了");}
    catch(e){alert("ロード失敗:"+e.message);}
  };
  reader.readAsText(file);
}
