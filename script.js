// ----------------------------
// ゲームのロジック
// ----------------------------
let count = 0;
let best = 0;
let total = 0;
let startTime = null;
let audio = new Audio("click1.mp3");

const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const clicker = document.getElementById("clicker");
const resetBtn = document.getElementById("reset");
const muteChk = document.getElementById("mute");

// クリック処理
clicker.addEventListener("click", () => {
  if (!startTime) startTime = Date.now();
  count++;
  total++;
  countEl.textContent = count;
  totalEl.textContent = total;

  // 最高記録更新
  if (count > best) {
    best = count;
    bestEl.textContent = best;
  }

  // CPS計算
  const elapsed = (Date.now() - startTime) / 1000;
  cpsEl.textContent = (count / elapsed).toFixed(2);

  // 音を鳴らす
  if (!muteChk.checked) {
    audio.currentTime = 0;
    audio.play();
  }
});

// リセット
resetBtn.addEventListener("click", () => {
  count = 0;
  startTime = null;
  countEl.textContent = "0";
  cpsEl.textContent = "0.00";
});

// ----------------------------
// テーマ切り替え
// ----------------------------
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  
  if (document.body.classList.contains("light")) {
    themeToggle.textContent = "🌞 ライトモード";
  } else {
    themeToggle.textContent = "🌙 ナイトモード";
  }
});
