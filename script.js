/* ===============================
   やじゅれんだ script.js 完全版
   =============================== */

let count = 0;
let best = 0;
let total = 0;
let cps = 0;
let autoClick = 0;
let clickPower = 1;
let boostMultiplier = 1;

let isMuted = false;
let audioClick = document.getElementById("se-click");
let audioBuy = document.getElementById("se-buy");
let volumeSlider = document.getElementById("volume");

let longPressMode = false;
let holdInterval = null;

let lastClickTime = Date.now();

/* ===============================
   ショップ商品データ
   =============================== */
const shopItems = [
  // オート
  { id:"auto1", name:"ｱｰｲｷｿ", type:"auto", effect:()=>autoClick+=250, cost:25000 },
  { id:"auto2", name:"あーソレいいよ", type:"auto", effect:()=>autoClick+=1000, cost:100000 },
  { id:"auto3", name:"頭にきますよ!!", type:"auto", effect:()=>autoClick+=5000, cost:500000 },
  // 精力剤
  { id:"click1", name:"ありますあります", type:"click", effect:()=>clickPower+=100, cost:30000 },
  { id:"click2", name:"いいよこいよ", type:"click", effect:()=>clickPower+=300, cost:100000 },
  { id:"click3", name:"おかのした", type:"click", effect:()=>clickPower+=1000, cost:500000 },
  // ブースト
  { id:"boost1", name:"俺もやったんだからさ", type:"boost", effect:()=>{
      activateBoost(5, 30);
    }, cost:5000, note:"クリック×5 / 30秒" },
  { id:"boost2", name:"おまたせ", type:"boost", effect:()=>{
      activateBoost(10, 60);
    }, cost:20000, note:"クリック×10 / 60秒" },
  { id:"boost3", name:"溜まってんなあおい", type:"boost", effect:()=>{
      activateBoost(20, 15);
    }, cost:100000, note:"クリック×20 / 15秒" }
];

/* ===============================
   バッジ
   =============================== */
const badgeConditions = [
  { id:"b1", name:"初めての連打", condition: c => c>=10 },
  { id:"b2", name:"中級者", condition: c => c>=1000 },
  { id:"b3", name:"上級者", condition: c => c>=100000 },
  { id:"b4", name:"伝説", condition: c => c>=1145141919810 }
];
let unlockedBadges = [];

/* ===============================
   エンディング
   =============================== */
function checkEndingCondition(){
  if(total >= 1145141919810){
    document.getElementById("ending-btn").style.display = "inline-block";
  }
}
function showEnding(){
  const modal = document.createElement("div");
  modal.className = "ending-modal";
  modal.innerHTML = `
    <div class="ending-content">
      <h2>クリアおめでとう！</h2>
      <p>エンディングをどう再生しますか？</p>
      <button id="end-sound">音あり</button>
      <button id="end-nosound">音なし</button>
      <video id="end-video" width="640" controls style="display:none"></video>
    </div>
  `;
  document.body.appendChild(modal);

  const video = modal.querySelector("#end-video");
  video.src = "end.mp4";

  modal.querySelector("#end-sound").onclick = () => {
    video.style.display="block"; video.muted=false; video.play();
  };
  modal.querySelector("#end-nosound").onclick = () => {
    video.style.display="block"; video.muted=true; video.play();
  };
}

/* ===============================
   ゲーム進行
   =============================== */
function updateUI(){
  document.getElementById("count").textContent = count;
  document.getElementById("best").textContent = best;
  document.getElementById("total").textContent = total;
  document.getElementById("cps").textContent = cps.toFixed(2);

  // ショップ更新
  const list = document.getElementById("shop-list");
  list.innerHTML = "";
  shopItems.forEach(item=>{
    const li = document.createElement("li");
    li.className="shop-item";
    li.innerHTML = `
      <div class="meta">
        <span class="kind ${item.type}">${item.type}</span>
        <span class="label">${item.name}</span>
        <div class="cond">${item.note||""}</div>
      </div>
      <button class="buy" ${count<item.cost?"disabled":""}>${item.cost}回</button>
    `;
    const btn = li.querySelector(".buy");

    // 長押し対応
    if(longPressMode){
      btn.addEventListener("mousedown", ()=>{
        if(count>=item.cost){
          holdInterval=setInterval(()=>{
            if(count>=item.cost){
              count-=item.cost; item.effect(); playSound(audioBuy);
              toast(`${item.name} 購入!`);
              updateUI(); saveGame();
            }
          },100);
        }
      });
      btn.addEventListener("mouseup", ()=> clearInterval(holdInterval));
      btn.addEventListener("mouseleave", ()=> clearInterval(holdInterval));
    }else{
      btn.addEventListener("click", ()=>{
        if(count>=item.cost){
          count-=item.cost; item.effect(); playSound(audioBuy);
          toast(`${item.name} 購入!`);
          updateUI(); saveGame();
        }
      });
    }
    list.appendChild(li);
  });

  // バッジ更新
  const badgeList = document.getElementById("badge-list");
  badgeList.innerHTML = "";
  badgeConditions.forEach(b=>{
    const unlocked = b.condition(total);
    if(unlocked && !unlockedBadges.includes(b.id)){
      unlockedBadges.push(b.id);
      toast(`バッジ獲得: ${b.name}`);
    }
    const li = document.createElement("li");
    li.className = "badge "+(unlocked?"unlocked":"locked");
    li.innerHTML = `<span class="label">${b.name}</span>`;
    badgeList.appendChild(li);
  });

  checkEndingCondition();
}

/* ===============================
   クリック処理
   =============================== */
document.getElementById("clicker").addEventListener("click",()=>{
  const now=Date.now();
  const diff=(now-lastClickTime)/1000;
  lastClickTime=now;
  cps=1/diff;

  count+=clickPower*boostMultiplier;
  total+=clickPower*boostMultiplier;
  if(count>best) best=count;

  playSound(audioClick);
  updateUI();
  saveGame();
});

/* ===============================
   ブースト
   =============================== */
function activateBoost(multiplier, seconds){
  boostMultiplier = multiplier;
  toast(`ブースト発動! クリック×${multiplier}`);
  setTimeout(()=>{
    boostMultiplier=1;
    toast("ブースト終了");
  }, seconds*1000);
}

/* ===============================
   音量・ミュート
   =============================== */
document.getElementById("mute").addEventListener("change",e=>{
  isMuted=e.target.checked;
});
volumeSlider.addEventListener("input",()=>{
  audioClick.volume=volumeSlider.value;
  audioBuy.volume=volumeSlider.value;
});
function playSound(audio){
  if(!isMuted){
    audio.currentTime=0;
    audio.play();
  }
}

/* ===============================
   モード切替
   =============================== */
document.getElementById("toggle-theme").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
});
document.getElementById("toggle-hold").addEventListener("click",()=>{
  longPressMode=!longPressMode;
  document.getElementById("toggle-hold").textContent=`🖱️ 長押し購入モード: ${longPressMode?"ON":"OFF"}`;
  updateUI();
});
document.getElementById("ending-btn").addEventListener("click",showEnding);

/* ===============================
   トースト通知
   =============================== */
function toast(msg){
  const container=document.getElementById("toast-container");
  const div=document.createElement("div");
  div.className="toast";
  div.textContent=msg;
  container.appendChild(div);
  setTimeout(()=>{ div.style.opacity="0"; },2000);
  setTimeout(()=>{ div.remove(); },2500);
}

/* ===============================
   セーブ / ロード
   =============================== */
function saveGame(){
  const data = { count,best,total,autoClick,clickPower,unlockedBadges };
  localStorage.setItem("yjrndSave", JSON.stringify(data));
}
function loadGame(){
  const data = JSON.parse(localStorage.getItem("yjrndSave"));
  if(data){
    count=data.count||0;
    best=data.best||0;
    total=data.total||0;
    autoClick=data.autoClick||0;
    clickPower=data.clickPower||1;
    unlockedBadges=data.unlockedBadges||[];
  }
  updateUI();
}
function downloadSave(){
  const data=localStorage.getItem("yjrndSave");
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="save.yjrnd";
  a.click();
  URL.revokeObjectURL(url);
}
function uploadSave(file){
  const reader=new FileReader();
  reader.onload=e=>{
    localStorage.setItem("yjrndSave", e.target.result);
    loadGame();
  };
  reader.readAsText(file);
}

/* ===============================
   自動クリック
   =============================== */
setInterval(()=>{
  if(autoClick>0){
    count+=autoClick;
    total+=autoClick;
    if(count>best) best=count;
    updateUI(); saveGame();
  }
},1000);

/* ===============================
   初期化
   =============================== */
window.onload = ()=>{
  loadGame();
  updateUI();
};
