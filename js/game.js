// ===== Game State =====
let peer = null;
let conn = null;
let isCreator = false;

let myNumber = null;
let myNumberLocked = false;
let opponentNumberLocked = false;
let opponentNumber = null;

let isMyTurn = false;
let turnCount = 0;
let myGuessCount = 0;
let guessHistory = [];

let knownLow = 1;
let knownHigh = 100;

let myName = '';
let opponentName = '';

let sessionMyWins = 0;
let sessionOpponentWins = 0;
let sessionRounds = 0;

let secretVisible = true;

let playAgainSent = false;
let playAgainReceived = false;

let turnTimerId = null;
let turnTimeLeft = 0;

let opponentBestDist = Infinity;
let opponentClosestGuess = null;
let myExhausted = false;
let opponentExhausted = false;
let opponentExhaustedData = null;

let opponentKnownLow = 1;
let opponentKnownHigh = 100;

let pendingGuessValue = null;
let pendingGuessResult = null;
let awaitingFeedback = false;

let myHistoryCount = 0;
let opponentHistoryCount = 0;
let activeHistoryTab = 'you';

// ===== Secret Number Display =====
function showSecretNumber() {
  const display = document.getElementById('secret-display');
  const btn = document.getElementById('btn-toggle-secret');
  if (secretVisible) {
    display.textContent = myNumber;
    btn.textContent = 'Hide';
  } else {
    display.textContent = '•••';
    btn.textContent = 'Show';
  }
}

function toggleSecret() {
  secretVisible = !secretVisible;
  showSecretNumber();
}

// ===== Session Score =====
function updateSessionScoreUI() {
  const show = sessionRounds > 0;
  const gameEl = document.getElementById('top-bar-score');
  const overEl = document.getElementById('session-score-gameover');
  if (gameEl) gameEl.style.display = show ? '' : 'none';
  overEl.style.display = show ? 'block' : 'none';

  if (show) {
    const txt = `${esc(myName)} ${sessionMyWins} — ${sessionOpponentWins} ${esc(opponentName)}`;
    document.getElementById('score-game-text').innerHTML = txt;
    document.getElementById('score-gameover-text').innerHTML = txt;
  }
}

// ===== Game Code Generator =====
function generateGameCode() {
  const chars = CONFIG.game.codeChars;
  const len = CONFIG.game.codeLength;
  let code = '';
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ===== Lobby: Create Game =====
function createGame() {
  resolveMyName();

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.textContent = 'Connecting…';

  const prefix = CONFIG.game.codePrefix;
  const gameCode = generateGameCode();
  peer = new Peer(prefix + gameCode);
  isCreator = true;

  peer.on('open', () => {
    document.getElementById('game-id-text').textContent = gameCode;
    document.getElementById('game-id-box').style.display = 'flex';
    document.getElementById('create-status').style.display = 'block';
    btn.textContent = 'Game Created';
  });

  peer.on('connection', incoming => {
    conn = incoming;
    conn.on('open', () => setupConnection());
  });

  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      const retryCode = generateGameCode();
      peer = new Peer(prefix + retryCode);
      peer.on('open', () => {
        document.getElementById('game-id-text').textContent = retryCode;
        document.getElementById('game-id-box').style.display = 'flex';
        document.getElementById('create-status').style.display = 'block';
        btn.textContent = 'Game Created';
      });
      peer.on('connection', incoming => {
        conn = incoming;
        conn.on('open', () => setupConnection());
      });
      peer.on('error', e2 => {
        btn.disabled = false;
        btn.textContent = 'Generate Game ID';
        showToast('Connection error: ' + e2.type);
      });
      return;
    }
    btn.disabled = false;
    btn.textContent = 'Generate Game ID';
    showToast('Connection error: ' + err.type);
  });
}

function getShareUrl() {
  const code = document.getElementById('game-id-text').textContent;
  return window.location.origin + window.location.pathname + '?g=' + code;
}

function copyGameId() {
  const btn = document.getElementById('btn-copy');
  navigator.clipboard.writeText(getShareUrl()).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.borderColor = 'var(--accent2)';
    btn.style.color = 'var(--accent2)';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, CONFIG.timing.copyFeedbackDuration);
    showToast('Share link copied!');
  });
}

function shareWhatsApp() {
  const code = document.getElementById('game-id-text').textContent;
  const url = getShareUrl();
  const msg = `Think you can crack my number? Let's find out.\n\nI started a Number Clash game. Join with one tap:\n${url}\n\nGame code: ${code}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareGame() {
  const url = getShareUrl();
  if (navigator.share) {
    navigator.share({
      title: 'Number Clash',
      text: 'Think you can crack my number? Let\'s find out!',
      url: url
    });
  } else {
    copyGameId();
  }
}

// ===== Lobby: Join Game =====
function joinGame() {
  resolveMyName();

  const input = document.getElementById('join-id-input');
  const errorEl = document.getElementById('join-error');
  const rawId = input.value.trim().toUpperCase();

  if (!rawId) {
    errorEl.textContent = 'Please enter a game ID.';
    return;
  }

  const code = rawId.replace(/^NC-/i, '');
  const peerId = CONFIG.game.codePrefix + code;

  errorEl.textContent = '';
  const btn = document.getElementById('btn-join');
  btn.disabled = true;
  btn.textContent = 'Joining…';

  peer = new Peer();
  isCreator = false;

  peer.on('open', () => {
    conn = peer.connect(peerId, { reliable: true });
    conn.on('open', () => setupConnection());
    conn.on('error', () => {
      errorEl.textContent = 'Could not connect. Check the game ID.';
      btn.disabled = false;
      btn.textContent = 'Join';
    });
  });

  peer.on('error', err => {
    if (err.type === 'peer-unavailable') {
      errorEl.textContent = 'Game not found. Check the ID and try again.';
    } else {
      errorEl.textContent = 'Connection error: ' + err.type;
    }
    btn.disabled = false;
    btn.textContent = 'Join';
  });
}

// ===== Connection Setup =====
function setupConnection() {
  conn.on('data', handleMessage);
  conn.on('close', handleDisconnect);
  conn.on('error', () => handleDisconnect());

  conn.send({ type: 'hello', name: myName, config: isCreator ? gameConfig : undefined });

  showScreen('setup');
  applyConfigToSetup();
  document.getElementById('setup-self-name').textContent = myName;
  document.getElementById('setup-opponent-name').textContent = 'Waiting…';

  showToast('Connected! Waiting for introductions…');
}

function applyConfigToSetup() {
  const max = gameConfig.max;
  const mid = Math.ceil(max / 2);
  const slider = document.getElementById('number-slider');
  slider.max = max;
  slider.value = mid;
  slider.disabled = false;
  document.getElementById('picked-number').textContent = mid;
  document.getElementById('setup-range-label').textContent = '1 – ' + max;
  document.getElementById('setup-range-max').textContent = max;
  const d = DIFFICULTIES[gameConfig.difficulty];
  const badge = document.getElementById('setup-difficulty-badge');
  if (d) {
    let txt = d.label;
    if (gameConfig.limitGuesses) txt += ' · ' + gameConfig.maxGuesses + ' guesses';
    else txt += ' · Unlimited guesses';
    badge.textContent = txt;
    badge.style.display = 'block';
  }
}

function handleDisconnect() {
  showToast('Opponent disconnected.');
  resetState();
  showScreen('lobby');
  resetLobbyUI();
  renderStats();
}

function resetLobbyUI() {
  const btnCreate = document.getElementById('btn-create');
  btnCreate.disabled = false;
  btnCreate.textContent = 'Generate Game ID';
  document.getElementById('game-id-box').style.display = 'none';
  document.getElementById('create-status').style.display = 'none';

  const btnJoin = document.getElementById('btn-join');
  btnJoin.disabled = false;
  btnJoin.textContent = 'Join';
  document.getElementById('join-id-input').value = '';
  document.getElementById('join-error').textContent = '';
}

// ===== Message Handler =====
function handleMessage(data) {
  switch (data.type) {
    case 'hello':
      opponentName = data.name || 'Opponent';
      document.getElementById('setup-opponent-name').textContent = opponentName;
      if (data.config) {
        gameConfig = { ...gameConfig, ...data.config };
        applyConfigToSetup();
      }
      showToast(opponentName + ' joined the clash!');
      break;

    case 'numberLocked':
      opponentNumberLocked = true;
      document.getElementById('opponent-check').textContent = '✓';
      document.getElementById('opponent-check').className = 'check done';
      checkBothLocked();
      break;

    case 'guess':
      handleIncomingGuess(data.value);
      break;

    case 'feedback':
      handleFeedback(data);
      break;

    case 'reveal':
      opponentNumber = data.number;
      document.getElementById('reveal-opponent').textContent = opponentNumber;
      break;

    case 'playAgain':
      handlePlayAgainRequest();
      break;

    case 'timeout':
      showToast('Too slow! ' + opponentName + ' loses their turn.');
      isMyTurn = true;
      updateTurnUI();
      break;

    case 'guessesExhausted':
      opponentExhausted = true;
      opponentExhaustedData = data;
      if (myExhausted) {
        resolveTie();
      } else {
        showToast(opponentName + ' is out of guesses! Keep playing.');
        isMyTurn = true;
        updateTurnUI();
      }
      break;

    case 'reaction':
      showFloatingReaction(data.emoji);
      break;

    case 'chat':
      showChatBubble(data.msg, opponentName);
      break;

    case 'taunt':
      showOpponentTaunt(data.msg);
      break;
  }
}

// ===== Setup: Number Picker =====
function updatePicker(val) {
  document.getElementById('picked-number').textContent = val;
}

function lockNumber() {
  if (myNumberLocked) return;

  myNumber = parseInt(document.getElementById('number-slider').value, 10);
  myNumberLocked = true;

  const btn = document.getElementById('btn-lock');
  btn.disabled = true;
  btn.textContent = 'Locked ✓';
  btn.style.background = 'linear-gradient(135deg, var(--accent2), #059669)';
  btn.style.transition = 'background 0.3s ease';
  document.getElementById('number-slider').disabled = true;

  document.getElementById('self-check').textContent = '✓';
  document.getElementById('self-check').className = 'check done';

  playLockSound();
  conn.send({ type: 'numberLocked' });
  checkBothLocked();
}

function checkBothLocked() {
  if (myNumberLocked && opponentNumberLocked) {
    showToast('Numbers locked. Let the clash begin!');
    setTimeout(startGame, CONFIG.timing.startGameDelay);
  }
}

// ===== Game Start =====
function startGame() {
  turnCount = 0;
  myGuessCount = 0;
  guessHistory = [];
  knownLow = 1;
  knownHigh = gameConfig.max;
  isMyTurn = isCreator;
  opponentBestDist = Infinity;
  opponentClosestGuess = null;
  myExhausted = false;
  opponentExhausted = false;
  opponentExhaustedData = null;

  opponentKnownLow = 1;
  opponentKnownHigh = gameConfig.max;
  pendingGuessValue = null;
  pendingGuessResult = null;
  awaitingFeedback = false;
  myHistoryCount = 0;
  opponentHistoryCount = 0;
  activeHistoryTab = 'you';

  secretVisible = true;

  const gi = document.getElementById('guess-input');
  gi.max = gameConfig.max;
  gi.placeholder = 'Guess (1-' + gameConfig.max + ')';

  showScreen('game');
  showSecretNumber();
  updateTurnUI();
  updateRangeUI();
  updateOpponentRangeUI();
  updateGuessCountLabel();
  updateSessionScoreUI();
  populateReactions();
  populateChatPicker();
  document.getElementById('history-you').innerHTML = '';
  document.getElementById('history-them').innerHTML = '';
  document.getElementById('guess-error').textContent = '';
  document.getElementById('btn-guess').textContent = 'Guess #1';
  document.getElementById('opponent-range-name').textContent = opponentName;
  document.getElementById('feedback-panel').classList.remove('show');
  document.getElementById('guess-reveal-overlay').classList.remove('show');
  switchHistoryTab('you');

  if (isMyTurn) {
    gi.focus();
  }
}

// ===== Turn UI =====
function updateTurnUI() {
  const indicator = document.getElementById('turn-indicator');
  const guessInput = document.getElementById('guess-input');
  const guessBtn = document.getElementById('btn-guess');

  if (isMyTurn) {
    startTurnTimer();
    indicator.textContent = 'Your move — take a shot!';
    indicator.className = 'turn-indicator turn-yours';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    guessInput.focus();
  } else {
    stopTurnTimer();
    indicator.textContent = opponentName + ' is thinking…';
    indicator.className = 'turn-indicator turn-theirs';
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }

  indicator.classList.remove('slide-in-left', 'slide-in-right');
  void indicator.offsetWidth;
  indicator.classList.add(isMyTurn ? 'slide-in-left' : 'slide-in-right');
  playTurnSwitchSound();
}

function setFeedbackIndicator() {
  const indicator = document.getElementById('turn-indicator');
  indicator.textContent = 'Respond to ' + opponentName + '’s guess!';
  indicator.className = 'turn-indicator turn-yours';
}

function startTurnTimer() {
  stopTurnTimer();
  turnTimeLeft = CONFIG.timing.turnTime;
  updateTimerUI();
  turnTimerId = setInterval(() => {
    turnTimeLeft -= 0.25;
    updateTimerUI();
    if (turnTimeLeft <= 0) {
      stopTurnTimer();
      onTurnTimeout();
    }
  }, 250);
}

function stopTurnTimer() {
  if (turnTimerId) { clearInterval(turnTimerId); turnTimerId = null; }
}

function updateTimerUI() {
  const fill = document.getElementById('timer-bar-fill');
  const text = document.getElementById('timer-text');
  const container = document.getElementById('timer-bar-container');
  const pct = Math.max(0, (turnTimeLeft / CONFIG.timing.turnTime) * 100);
  fill.style.width = pct + '%';

  const isUrgent = turnTimeLeft <= CONFIG.thresholds.urgentTimer;
  fill.classList.toggle('urgent', isUrgent);
  container.classList.toggle('urgent', isUrgent);
  text.textContent = Math.ceil(Math.max(0, turnTimeLeft)) + 's';

  if (isUrgent && turnTimeLeft > 0 && turnTimeLeft % 1 < 0.25) {
    playTimerUrgentSound();
  }
}

function onTurnTimeout() {
  if (isMyTurn) {
    showToast('Too slow! ' + opponentName + ' steals the turn.');
    conn.send({ type: 'timeout' });
    isMyTurn = false;
    updateTurnUI();
  }
}

function updateRangeUI() {
  document.getElementById('range-low').textContent = knownLow;
  document.getElementById('range-high').textContent = knownHigh;

  const total = gameConfig.max - 1;
  const leftPct = ((knownLow - 1) / total) * 100;
  const widthPct = ((knownHigh - knownLow) / total) * 100;
  const fill = document.getElementById('range-bar-fill');
  fill.style.left = leftPct + '%';
  fill.style.width = Math.max(widthPct, 1) + '%';

  const count = knownHigh - knownLow + 1;
  const info = document.getElementById('range-info');
  info.textContent = count + ' number' + (count !== 1 ? 's' : '') + ' left';

  fill.classList.remove('narrow', 'very-narrow');
  info.classList.remove('hot', 'very-hot');
  if (count <= CONFIG.thresholds.rangeVeryNarrow) {
    fill.classList.add('very-narrow');
    info.classList.add('very-hot');
  } else if (count <= CONFIG.thresholds.rangeNarrow) {
    fill.classList.add('narrow');
    info.classList.add('hot');
  }
}

function updateOpponentRangeUI() {
  document.getElementById('opp-range-low').textContent = opponentKnownLow;
  document.getElementById('opp-range-high').textContent = opponentKnownHigh;

  const total = gameConfig.max - 1;
  const leftPct = ((opponentKnownLow - 1) / total) * 100;
  const widthPct = ((opponentKnownHigh - opponentKnownLow) / total) * 100;
  const fill = document.getElementById('opp-range-bar-fill');
  fill.style.left = leftPct + '%';
  fill.style.width = Math.max(widthPct, 1) + '%';

  const count = opponentKnownHigh - opponentKnownLow + 1;
  const info = document.getElementById('opp-range-info');
  info.textContent = count + ' number' + (count !== 1 ? 's' : '') + ' left';

  fill.classList.remove('narrow', 'very-narrow');
  info.classList.remove('hot', 'very-hot');
  if (count <= CONFIG.thresholds.rangeVeryNarrow) {
    fill.classList.add('very-narrow');
    info.classList.add('very-hot');
  } else if (count <= CONFIG.thresholds.rangeNarrow) {
    fill.classList.add('narrow');
    info.classList.add('hot');
  }
}

function switchHistoryTab(tab) {
  activeHistoryTab = tab;
  const youList = document.getElementById('history-you');
  const themList = document.getElementById('history-them');
  const tabYou = document.getElementById('tab-you');
  const tabThem = document.getElementById('tab-them');

  if (tab === 'you') {
    youList.style.display = '';
    themList.style.display = 'none';
    tabYou.classList.add('active');
    tabThem.classList.remove('active');
  } else {
    youList.style.display = 'none';
    themList.style.display = '';
    tabThem.classList.add('active');
    tabYou.classList.remove('active');
  }
}

function updateHistoryTabLabels() {
  document.getElementById('tab-you').textContent = 'You (' + myHistoryCount + ')';
  document.getElementById('tab-them').textContent = 'Them (' + opponentHistoryCount + ')';
}

function updateGuessCountLabel() {
  const el = document.getElementById('guess-count-label');
  if (!gameConfig.limitGuesses) {
    el.textContent = 'Guesses used: ' + myGuessCount;
    el.classList.remove('warn');
    return;
  }
  const left = gameConfig.maxGuesses - myGuessCount;
  el.textContent = 'Guesses: ' + myGuessCount + ' / ' + gameConfig.maxGuesses;
  el.classList.toggle('warn', left <= CONFIG.thresholds.guessWarning);
}

// ===== Guessing =====
function submitGuess() {
  if (!isMyTurn) return;

  const input = document.getElementById('guess-input');
  const errorEl = document.getElementById('guess-error');
  const val = parseInt(input.value, 10);

  if (isNaN(val) || val < 1 || val > gameConfig.max) {
    errorEl.textContent = `Enter a number between 1 and ${gameConfig.max}.`;
    return;
  }

  errorEl.textContent = '';
  input.value = '';
  myGuessCount++;

  playGuessSound();
  conn.send({ type: 'guess', value: val });
  updateGuessCountLabel();

  isMyTurn = false;
  updateTurnUI();
}

function handleIncomingGuess(val) {
  let result;
  if (val === myNumber) {
    result = 'correct';
  } else if (val < myNumber) {
    result = 'higher';
  } else {
    result = 'lower';
  }

  const dist = Math.abs(val - myNumber);
  if (dist < opponentBestDist) {
    opponentBestDist = dist;
    opponentClosestGuess = val;
  }

  pendingGuessValue = val;
  pendingGuessResult = result;
  awaitingFeedback = true;

  stopTurnTimer();
  showGuessReveal(val, dist);
}

function getFlavorText(dist, max) {
  const pct = dist / max;
  const msg = CONFIG.messages;
  const t = CONFIG.thresholds;
  if (dist === 0) return { text: msg.flavorNailed, cls: 'flavor-fire' };
  if (dist <= t.flavorDangerouslyClose) return { text: msg.flavorDangerouslyClose, cls: 'flavor-fire' };
  if (dist <= t.flavorHot) return { text: msg.flavorHot, cls: 'flavor-hot' };
  if (pct <= t.flavorWarmPct) return { text: msg.flavorWarm, cls: 'flavor-warm' };
  return { text: msg.flavorCold, cls: 'flavor-cold' };
}

function showGuessReveal(val, dist) {
  const overlay = document.getElementById('guess-reveal-overlay');
  document.getElementById('guess-reveal-label').textContent = opponentName + ' guessed';
  document.getElementById('guess-reveal-number').textContent = val;

  const flavor = getFlavorText(dist, gameConfig.max);
  const flavorEl = document.getElementById('guess-reveal-flavor');
  flavorEl.textContent = flavor.text;
  flavorEl.className = 'guess-reveal-flavor ' + flavor.cls;

  overlay.classList.add('show');

  setTimeout(() => {
    overlay.classList.remove('show');
    showFeedbackPanel();
  }, CONFIG.timing.guessRevealDelay);
}

function showFeedbackPanel() {
  const panel = document.getElementById('feedback-panel');
  document.getElementById('feedback-guess-text').textContent =
    opponentName + ' guessed ' + pendingGuessValue;
  document.getElementById('feedback-secret-text').textContent =
    'Your secret is ' + myNumber;
  document.getElementById('feedback-error').textContent = '';
  panel.classList.add('show');

  setFeedbackIndicator();
}

function sendManualFeedback(chosen) {
  if (!awaitingFeedback) return;

  const correctResult = pendingGuessResult;
  if (chosen !== correctResult) {
    const hint = correctResult === 'correct' ? 'They got it right!'
      : 'Your number is ' + myNumber + ', so the answer is ' + correctResult.charAt(0).toUpperCase() + correctResult.slice(1) + '.';
    document.getElementById('feedback-error').textContent = hint;
    return;
  }

  awaitingFeedback = false;
  document.getElementById('feedback-panel').classList.remove('show');
  stopTurnTimer();

  const val = pendingGuessValue;
  const result = pendingGuessResult;
  const dist = Math.abs(val - myNumber);
  const near = result !== 'correct' && dist <= CONFIG.thresholds.nearDistance;

  if (result === 'higher') {
    opponentKnownLow = Math.max(opponentKnownLow, val + 1);
  } else if (result === 'lower') {
    opponentKnownHigh = Math.min(opponentKnownHigh, val - 1);
  }
  updateOpponentRangeUI();

  conn.send({
    type: 'feedback',
    result: result,
    guess: val,
    myNumber: result === 'correct' ? myNumber : undefined,
    near: near
  });

  turnCount++;
  addHistoryItem('opponent', val, result);

  if (near) {
    showToast(opponentName + ' is breathing down your neck!');
  }

  if (result === 'correct') {
    opponentNumber = null;
    setTimeout(() => endGame(false, val), 600);
  } else {
    isMyTurn = true;
    updateTurnUI();
  }

  pendingGuessValue = null;
  pendingGuessResult = null;
}

function handleFeedback(data) {
  const { result, guess, myNumber: theirNumber, near } = data;

  turnCount++;
  addHistoryItem('you', guess, result);

  if (near) playNearSound();

  if (result === 'correct') {
    opponentNumber = theirNumber || guess;
    setTimeout(() => endGame(true, guess), 600);
  } else {
    if (result === 'higher') {
      knownLow = Math.max(knownLow, guess + 1);
    } else {
      knownHigh = Math.min(knownHigh, guess - 1);
    }
    updateRangeUI();

    const range = knownHigh - knownLow;
    if (range <= CONFIG.thresholds.narrowingToast && range > 0) {
      showToast('Narrowing in! Only ' + (range + 1) + ' numbers left.');
      playNearSound();
    }

    if (gameConfig.limitGuesses && myGuessCount >= gameConfig.maxGuesses) {
      myExhausted = true;
      conn.send({ type: 'guessesExhausted', closestGuess: guess, closestDist: knownHigh - knownLow });
      if (opponentExhausted) {
        resolveTie();
      } else {
        showToast('No guesses left! Waiting for ' + opponentName + '…');
        stopTurnTimer();
      }
    } else {
      document.getElementById('btn-guess').textContent = 'Guess #' + (myGuessCount + 1);
    }
  }
}

// ===== Tie Resolution =====
function resolveTie() {
  stopTurnTimer();
  const myDist = knownHigh - knownLow;
  const theirDist = opponentBestDist;

  if (myDist < theirDist) {
    setTimeout(() => endGame(true, null, 'tie-win'), 600);
  } else if (theirDist < myDist) {
    setTimeout(() => endGame(false, null, 'tie-lose'), 600);
  } else {
    setTimeout(() => endGame(null, null, 'draw'), 600);
  }
}

// ===== History =====
function addHistoryItem(who, guess, result) {
  const containerId = who === 'you' ? 'history-you' : 'history-them';
  const container = document.getElementById(containerId);
  const item = document.createElement('div');
  item.className = 'history-item';

  item.innerHTML = `
    <span class="guess-val">${guess}</span>
    <span class="result-badge result-${result}">${result === 'higher' ? '↑ Higher' : result === 'lower' ? '↓ Lower' : '✓ Correct'}</span>
  `;

  container.prepend(item);

  if (who === 'you') myHistoryCount++;
  else opponentHistoryCount++;
  updateHistoryTabLabels();
}

// ===== Game Over =====
function endGame(iWon, winningGuess, tieType) {
  stopTurnTimer();
  awaitingFeedback = false;
  document.getElementById('feedback-panel').classList.remove('show');
  document.getElementById('guess-reveal-overlay').classList.remove('show');
  const isDraw = tieType === 'draw';

  if (!isDraw) {
    sessionRounds++;
    if (iWon) sessionMyWins++;
    else sessionOpponentWins++;
  } else {
    sessionRounds++;
  }

  const emojiEl = document.getElementById('gameover-emoji');
  const textEl = document.getElementById('gameover-text');
  const subEl = document.getElementById('gameover-sub');
  const closestEl = document.getElementById('gameover-closest');
  const revealYours = document.getElementById('reveal-yours');
  const revealOpponent = document.getElementById('reveal-opponent');
  const playAgainStatus = document.getElementById('play-again-status');
  const encourageEl = document.getElementById('gameover-encouragement');
  const statLineEl = document.getElementById('gameover-stat-line');

  document.getElementById('reveal-yours-label').textContent = myName + "'s Number";
  document.getElementById('reveal-opponent-label').textContent = opponentName + "'s Number";
  closestEl.textContent = '';
  encourageEl.textContent = '';
  statLineEl.textContent = '';
  emojiEl.classList.remove('shake');

  const opponentTauntEl = document.getElementById('opponent-taunt');
  if (opponentTauntEl) opponentTauntEl.textContent = '';

  if (isDraw) {
    emojiEl.textContent = '⚔️';
    textEl.textContent = 'It’s a Draw!';
    textEl.className = 'winner-text draw';
    subEl.textContent = 'Both ran out of guesses — equally close!';
    playLoseSound();
  } else if (iWon) {
    emojiEl.textContent = '🏆';
    textEl.textContent = 'You Win!';
    textEl.className = 'winner-text win';
    if (tieType === 'tie-win') {
      subEl.textContent = 'Both out of guesses — but your guess was closer!';
    } else if (winningGuess != null) {
      subEl.textContent = 'Nailed it! ' + winningGuess + ' in just ' + myGuessCount + ' guesses.';
      opponentNumber = winningGuess;
    } else {
      subEl.textContent = opponentName + ' ran out of guesses!';
    }
    statLineEl.textContent = 'Session: ' + sessionMyWins + 'W - ' + sessionOpponentWins + 'L';
    playWinSound();
    spawnConfetti();
  } else {
    emojiEl.textContent = '😔';
    emojiEl.classList.add('shake');
    textEl.textContent = 'You Lose';
    textEl.className = 'winner-text lose';
    if (tieType === 'tie-lose') {
      subEl.textContent = 'Both out of guesses — ' + opponentName + ' was closer!';
    } else if (winningGuess != null) {
      subEl.textContent = opponentName + ' cracked your number ' + winningGuess + ' in ' + turnCount + ' turns.';
    } else {
      subEl.textContent = 'You ran out of guesses!';
    }
    opponentNumber = null;
    const lossMessages = CONFIG.messages.loss;
    encourageEl.textContent = lossMessages[Math.floor(Math.random() * lossMessages.length)];
    playLoseSound();

    const myRange = knownHigh - knownLow;
    if (myRange <= CONFIG.thresholds.closeLossRange) {
      closestEl.textContent = 'You were close! Your range was down to just ' + (myRange + 1) + ' numbers.';
    }
  }

  conn.send({ type: 'reveal', number: myNumber });

  saveGameRecord(iWon === true, opponentName, myNumber, opponentNumber, iWon ? myGuessCount : turnCount);

  revealYours.textContent = myNumber;
  revealOpponent.textContent = opponentNumber != null ? opponentNumber : '?';
  playAgainStatus.textContent = '';

  updateSessionScoreUI();
  showScreen('gameover');
  populateTaunts(iWon === true);
  startAutoRematch();
}

// ===== Auto Rematch =====
let countdownTimer = null;

function startAutoRematch() {
  stopAutoRematch();
  let timeLeft = CONFIG.timing.rematchCountdown;
  updateRematchUI(timeLeft);
  document.getElementById('btn-cancel-rematch').disabled = false;

  countdownTimer = setInterval(() => {
    timeLeft -= 0.25;
    updateRematchUI(timeLeft);
    if (timeLeft <= 0) {
      stopAutoRematch();
      playAgainSent = true;
      conn.send({ type: 'playAgain' });
      document.getElementById('play-again-status').textContent = 'Waiting for ' + opponentName + '…';
      if (playAgainReceived) {
        startNewRound();
      }
    }
  }, 250);
}

function stopAutoRematch() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function cancelRematch() {
  stopAutoRematch();
  document.getElementById('auto-rematch-text').textContent = 'Auto-rematch cancelled';
  document.getElementById('auto-rematch-fill').style.width = '0%';
  document.getElementById('btn-cancel-rematch').disabled = true;
}

function updateRematchUI(timeLeft) {
  const total = CONFIG.timing.rematchCountdown;
  const pct = Math.max(0, ((total - timeLeft) / total) * 100);
  document.getElementById('auto-rematch-fill').style.width = pct + '%';
  const sec = Math.ceil(Math.max(0, timeLeft));
  document.getElementById('auto-rematch-text').textContent = 'Next round in ' + sec + 's';
}

function handlePlayAgainRequest() {
  playAgainReceived = true;

  if (playAgainSent) {
    startNewRound();
  } else {
    document.getElementById('play-again-status').textContent = opponentName + ' is ready!';
  }
}

function requestPlayAgain() {
  playAgainSent = true;
  conn.send({ type: 'playAgain' });
  if (playAgainReceived) startNewRound();
}

function startNewRound() {
  playAgainSent = false;
  playAgainReceived = false;
  myNumber = null;
  myNumberLocked = false;
  opponentNumberLocked = false;
  opponentNumber = null;
  isCreator = !isCreator;
  opponentBestDist = Infinity;
  opponentClosestGuess = null;
  myExhausted = false;
  opponentExhausted = false;
  opponentExhaustedData = null;
  opponentKnownLow = 1;
  opponentKnownHigh = gameConfig.max;
  pendingGuessValue = null;
  pendingGuessResult = null;
  awaitingFeedback = false;
  myHistoryCount = 0;
  opponentHistoryCount = 0;

  const btn = document.getElementById('btn-lock');
  btn.disabled = false;
  btn.textContent = 'Lock It In';
  btn.style.background = '';
  document.getElementById('self-check').textContent = '…';
  document.getElementById('self-check').className = 'check pending';
  document.getElementById('opponent-check').textContent = '…';
  document.getElementById('opponent-check').className = 'check pending';

  document.getElementById('setup-self-name').textContent = myName;
  document.getElementById('setup-opponent-name').textContent = opponentName;

  applyConfigToSetup();
  showScreen('setup');
  showToast('Fresh round. New number. Let’s go!');
}

// ===== Leave / Reset =====
function leaveGame() {
  stopAutoRematch();
  if (conn) conn.close();
  if (peer) peer.destroy();
  resetState();
  showScreen('lobby');
  resetLobbyUI();
  renderStats();
}

function resetState() {
  peer = null;
  conn = null;
  myNumber = null;
  myNumberLocked = false;
  opponentNumberLocked = false;
  opponentNumber = null;
  isMyTurn = false;
  turnCount = 0;
  myGuessCount = 0;
  guessHistory = [];
  knownLow = 1;
  knownHigh = gameConfig.max;
  playAgainSent = false;
  playAgainReceived = false;
  opponentName = '';
  sessionMyWins = 0;
  sessionOpponentWins = 0;
  sessionRounds = 0;
  opponentBestDist = Infinity;
  opponentClosestGuess = null;
  myExhausted = false;
  opponentExhausted = false;
  opponentExhaustedData = null;
  opponentKnownLow = 1;
  opponentKnownHigh = gameConfig.max;
  pendingGuessValue = null;
  pendingGuessResult = null;
  awaitingFeedback = false;
  myHistoryCount = 0;
  opponentHistoryCount = 0;
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (turnTimerId) { clearInterval(turnTimerId); turnTimerId = null; }
}

// ===== Init =====
(function init() {
  const saved = localStorage.getItem(CONFIG.storage.playerNameKey);
  if (saved) {
    document.getElementById('player-name-input').value = saved;
  }

  renderStats();
  checkFirstLaunch();

  document.getElementById('guess-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitGuess();
  });

  document.getElementById('join-id-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') joinGame();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const guessInput = document.getElementById('guess-input');
      if (document.activeElement === guessInput) {
        setTimeout(() => guessInput.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  const autoJoinCode = params.get('g');
  if (autoJoinCode) {
    window.history.replaceState({}, '', window.location.pathname);
    document.getElementById('join-id-input').value = autoJoinCode.toUpperCase();
    setTimeout(() => joinGame(), CONFIG.timing.autoJoinDelay);
  }
})();
