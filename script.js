let count = 0;
let best = 0;
let total = 0;
let lastClickTime = 0;
let cps = 0;
let muted = false;

const clicker = document.getElementById("clicker");
const countSpan = document.getElementById("count");
const bestSpan = document.getElementById("best");
const totalSpan = document.getElementById("total");
const cpsSpan = document.getElementById("cps");
const muteCheckbox = document.getElementById("mute");
const resetButton = document.getElementById("reset");

// 音
const sounds = [new Audio("click1.mp3")];

function playSound() {
  if (!muted) {
    const sound = sounds[0];
    sound.currentTime = 0;
    sound.play();
  }
}

clicker.addEventListener("click", () => {
  count++;
  total++;
  countSpan.textContent = count;
  totalSpan.textContent = total;

  if (count > best) {
    best = count;
    bestSpan.textContent = best;
  }

  // CPS計算
  const now = Date.now();
  if (lastClickTime) {
    const diff = (now - lastClickTime) / 1000;
    cps = 1 / diff;
    cpsSpan.textContent = cps.toFixed(2);
  }
  lastClickTime = now;

  playSound();
});

muteCheckbox.addEventListener("change", () => {
  muted = muteCheckbox.checked;
});

resetButton.addEventListener("click", () => {
  count = 0;
  countSpan.textContent = count;
  cps = 0;
  cpsSpan.textContent = cps.toFixed(2);
});
