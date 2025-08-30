const clicker = document.getElementById("clicker");
const countEl = document.getElementById("count");
const bestEl = document.getElementById("best");
const totalEl = document.getElementById("total");
const cpsEl = document.getElementById("cps");
const muteChk = document.getElementById("mute");

let count = 0;
let best = 0;
let total = 0;
let startTime = null;
const audio = new Audio("click1.mp3");

// クリック処理
clicker.addEventListener("click", () => {
  if (!startTime) startTime = Date.now();
  count++;
  total++;
  countEl.textContent = count;
  totalEl.textContent = total;

  // ハイスコア更新
  if (count > best) {
    best = count;
    bestEl.textContent = best;
  }

  // CPS計算
  const elapsed = (Date.now() - startTime) / 1000;
  cpsEl.textContent = (count / elapsed).toFixed(2);

  // 音再生
  if (!muteChk.checked) {
    audio.currentTime = 0;
    audio.play();
  }

  // アニメーション
  clicker.classList.add("clicked");
  setTimeout(() => clicker.classList.remove("clicked"), 150);
});
