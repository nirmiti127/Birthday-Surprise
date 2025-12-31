// ====== SETTINGS (change these 2 only if you want) ======
const PASSWORD = "Mitthu";   // your secret password
const AGE = 27;            // number of candles
const MIC_THRESHOLD = 22;  // lower = more sensitive, higher = less sensitive

// ====== ELEMENTS ======
const loginScreen = document.getElementById("loginScreen");
const cakeScreen = document.getElementById("cakeScreen");
const memoryScreen = document.getElementById("memoryScreen");

const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

const candlesWrap = document.getElementById("candles");
const micBtn = document.getElementById("micBtn");
const tapBlowBtn = document.getElementById("tapBlowBtn");
const statusMsg = document.getElementById("statusMsg");
const birthdayBtn = document.getElementById("birthdayBtn");

// Gift + game
const openGiftBtn = document.getElementById("openGiftBtn");
const gameOverlay = document.getElementById("gameOverlay");

const gameEl = document.getElementById("game");
const basketEl = document.getElementById("basket");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");

const winPanel = document.getElementById("winPanel");
const gameOverPanel = document.getElementById("gameOverPanel");
const retryBtn = document.getElementById("retryBtn");
const closeGameBtn = document.getElementById("closeGameBtn");

// ====== LOGIN ======
loginBtn.addEventListener("click", () => {
  if (passwordInput.value === PASSWORD) {
    loginMsg.textContent = "";
    loginScreen.classList.add("hidden");
    cakeScreen.classList.remove("hidden");
  } else {
    loginMsg.textContent = "Wrong password";
  }
});

passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// ====== CANDLES ======
let audioCtx, analyser, micSource, dataArray, rafId;
let blownOut = 0;

function renderCandles() {
  candlesWrap.innerHTML = "";
  blownOut = 0;
  birthdayBtn.classList.add("hidden");
  statusMsg.textContent = "";

  for (let i = 0; i < AGE; i++) {
    const c = document.createElement("div");
    c.className = "candle";
    const f = document.createElement("div");
    f.className = "flame";
    c.appendChild(f);
    candlesWrap.appendChild(c);
  }
}
renderCandles();

function extinguishSome(count = 4) {
  const onCandles = [...document.querySelectorAll(".candle:not(.off)")];
  if (onCandles.length === 0) return;

  for (let k = 0; k < count; k++) {
    const remaining = [...document.querySelectorAll(".candle:not(.off)")];
    if (remaining.length === 0) break;

    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    pick.classList.add("off");
    blownOut++;
  }

  const left = AGE - blownOut;

  if (left <= 0) {
    statusMsg.textContent = "All candles blown out! 🎉";
    birthdayBtn.classList.remove("hidden");
    stopMic();
  } else {
    statusMsg.textContent = `Blowing… ${left} left`;
  }
}

tapBlowBtn.addEventListener("click", () => extinguishSome(6));

// ====== MIC ======
micBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startMic(stream);
    statusMsg.textContent = "Mic enabled ✅ Now blow towards your laptop mic!";
  } catch (err) {
    statusMsg.textContent = "Mic permission denied. Use Tap to blow.";
  }
});

function startMic(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  micSource = audioCtx.createMediaStreamSource(stream);
  micSource.connect(analyser);

  dataArray = new Uint8Array(analyser.fftSize);

  let lastTrigger = 0;

  const loop = () => {
    analyser.getByteTimeDomainData(dataArray);

    // RMS volume
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length) * 100;

    const now = Date.now();
    if (rms > MIC_THRESHOLD && now - lastTrigger > 450) {
      lastTrigger = now;
      extinguishSome(4);
    }

    rafId = requestAnimationFrame(loop);
  };

  loop();
}

function stopMic() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

// ====== GO TO MEMORY SCREEN ======
birthdayBtn.addEventListener("click", () => {
  cakeScreen.classList.add("hidden");
  memoryScreen.classList.remove("hidden");
});

// =====================
// GIFT GAME: Catch Hearts
// =====================
let score = 0;
let timeLeft = 30;
let running = false;

let spawnIntervalId = null;
let timerIntervalId = null;
let animationId = null;

const hearts = []; // { el, x, y, speed }
const TARGET_SCORE = 10;

function setBasketX(clientX) {
  const rect = gameEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const clamped = Math.max(0, Math.min(rect.width, x));
  basketEl.style.left = `${clamped}px`;
}

function spawnHeart() {
  const rect = gameEl.getBoundingClientRect();
  const heart = document.createElement("div");
  heart.className = "heart";
  heart.textContent = "💗";

  const x = Math.random() * (rect.width - 30);
  const speed = 2.2 + Math.random() * 2.6;

  gameEl.appendChild(heart);
  hearts.push({ el: heart, x, y: -40, speed });
}

function isCaught(heartRect, basketRect) {
  return !(
    heartRect.right < basketRect.left ||
    heartRect.left > basketRect.right ||
    heartRect.bottom < basketRect.top ||
    heartRect.top > basketRect.bottom
  );
}

function loopGame() {
  if (!running) return;

  const basketRect = basketEl.getBoundingClientRect();

  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.y += h.speed;
    h.el.style.transform = `translate(${h.x}px, ${h.y}px)`;

    const heartRect = h.el.getBoundingClientRect();

    if (isCaught(heartRect, basketRect)) {
      h.el.remove();
      hearts.splice(i, 1);

      score++;
      scoreEl.textContent = String(score);

      if (score >= TARGET_SCORE) {
        winGame();
        return;
      }
      continue;
    }

    if (h.y > window.innerHeight + 60) {
      h.el.remove();
      hearts.splice(i, 1);
    }
  }

  animationId = requestAnimationFrame(loopGame);
}

function cleanupHearts() {
  for (const h of hearts) h.el.remove();
  hearts.length = 0;
}

function startTimer() {
  timerIntervalId = setInterval(() => {
    if (!running) return;
    timeLeft--;
    timeEl.textContent = String(timeLeft);
    if (timeLeft <= 0) gameOverGame();
  }, 1000);
}

function startGame() {
  cleanupHearts();
  score = 0;
  timeLeft = 30;
  running = true;

  scoreEl.textContent = "0";
  timeEl.textContent = "30";

  winPanel.classList.add("hidden");
  gameOverPanel.classList.add("hidden");

  spawnIntervalId = setInterval(spawnHeart, 550);
  startTimer();

  animationId = requestAnimationFrame(loopGame);
}

function stopGame() {
  running = false;
  if (spawnIntervalId) clearInterval(spawnIntervalId);
  if (timerIntervalId) clearInterval(timerIntervalId);
  if (animationId) cancelAnimationFrame(animationId);

  spawnIntervalId = null;
  timerIntervalId = null;
  animationId = null;
}

function winGame() {
  stopGame();
  winPanel.classList.remove("hidden");
}

function gameOverGame() {
  stopGame();
  gameOverPanel.classList.remove("hidden");
}

// Basket movement
gameEl.addEventListener("mousemove", (e) => {
  if (!running) return;
  setBasketX(e.clientX);
});

gameEl.addEventListener("touchmove", (e) => {
  if (!running) return;
  setBasketX(e.touches[0].clientX);
}, { passive: true });

// Open gift -> start game
openGiftBtn.addEventListener("click", () => {
  gameOverlay.classList.remove("hidden");
  startGame();
});

retryBtn.addEventListener("click", startGame);

closeGameBtn.addEventListener("click", () => {
  gameOverlay.classList.add("hidden");
  stopGame();
  cleanupHearts();
});
