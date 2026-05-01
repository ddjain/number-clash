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
const TURN_TIME = 12;

let opponentBestDist = Infinity;
let opponentClosestGuess = null;
let myExhausted = false;
let opponentExhausted = false;
let opponentExhaustedData = null;

// ===== Secret Number Display =====
function showSecretNumber() {
  const display = document.getElementById('secret-display');
  const btn = document.getElementById('btn-toggle-secret');
  if (secretVisible) {
    display.textContent = myNumber;
    btn.textContent = 'Hide';
  } else {
    display.textContent = '\u2022\u2022\u2022';
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
  const gameEl = document.getElementById('session-score-game');
  const overEl = document.getElementById('session-score-gameover');
  gameEl.style.display = show ? 'block' : 'none';
  overEl.style.display = show ? 'block' : 'none';

  if (show) {
    const txt = `${esc(myName)} ${sessionMyWins} \u2014 ${sessionOpponentWins} ${esc(opponentName)}`;
    document.getElementById('score-game-text').innerHTML = txt;
    document.getElementById('score-gameover-text').innerHTML = txt;
  }
}

// ===== Game Code Generator =====
const CODE_PREFIX = 'nc-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGameCode() {
  let code = '';
  for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// ===== Lobby: Create Game =====
function createGame() {
  resolveMyName();

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.textContent = 'Connecting\u2026';

  const gameCode = generateGameCode();
  peer = new Peer(CODE_PREFIX + gameCode);
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
      peer = new Peer(CODE_PREFIX + retryCode);
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
  navigator.clipboard.writeText(getShareUrl()).then(() => showToast('Share link copied!'));
}

function shareWhatsApp() {
  const code = document.getElementById('game-id-text').textContent;
  const url = getShareUrl();
  const msg = `Think you can crack my number? Let\u2019s find out.\n\nI started a Number Clash game. Join with one tap:\n${url}\n\nGame code: ${code}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareGame() {
  const url = getShareUrl();
  if (navigator.share) {
    navigator.share({
      title: 'Number Clash',
      text: 'Think you can crack my number? Let\u2019s find out!',
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
  const peerId = CODE_PREFIX + code;

  errorEl.textContent = '';
  const btn = document.getElementById('btn-join');
  btn.disabled = true;
  btn.textContent = 'Joining\u2026';

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
  document.getElementById('setup-opponent-name').textContent = 'Waiting\u2026';

  showToast('Connected! Waiting for introductions\u2026');
}

function applyConfigToSetup() {
  const max = gameConfig.max;
  const mid = Math.ceil(max / 2);
  const slider = document.getElementById('number-slider');
  slider.max = max;
  slider.value = mid;
  slider.disabled = false;
  document.getElementById('picked-number').textContent = mid;
  document.getElementById('setup-range-label').textContent = '1 \u2013 ' + max;
  document.getElementById('setup-range-max').textContent = max;
  const d = DIFFICULTIES[gameConfig.difficulty];
  const badge = document.getElementById('setup-difficulty-badge');
  if (d) {
    let txt = d.label;
    if (gameConfig.limitGuesses) txt += ' \u00B7 ' + gameConfig.maxGuesses + ' guesses';
    else txt += ' \u00B7 Unlimited guesses';
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
      document.getElementById('opponent-check').textContent = '\u2713';
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

  document.getElementById('btn-lock').disabled = true;
  document.getElementById('btn-lock').textContent = 'Locked \u2713';
  document.getElementById('number-slider').disabled = true;

  document.getElementById('self-check').textContent = '\u2713';
  document.getElementById('self-check').className = 'check done';

  conn.send({ type: 'numberLocked' });
  checkBothLocked();
}

function checkBothLocked() {
  if (myNumberLocked && opponentNumberLocked) {
    showToast('Numbers locked. Let the clash begin!');
    setTimeout(startGame, 800);
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

  secretVisible = true;

  const gi = document.getElementById('guess-input');
  gi.max = gameConfig.max;
  gi.placeholder = 'Guess (1-' + gameConfig.max + ')';

  showScreen('game');
  showSecretNumber();
  updateTurnUI();
  updateRangeUI();
  updateGuessCountLabel();
  updateSessionScoreUI();
  document.getElementById('history').innerHTML = '';
  document.getElementById('guess-error').textContent = '';
  document.getElementById('btn-guess').textContent = 'Guess #1';

  if (isMyTurn) {
    gi.focus();
  }
}

// ===== Turn UI =====
function updateTurnUI() {
  const indicator = document.getElementById('turn-indicator');
  const guessInput = document.getElementById('guess-input');
  const guessBtn = document.getElementById('btn-guess');

  startTurnTimer();

  if (isMyTurn) {
    indicator.textContent = 'Your move \u2014 take a shot!';
    indicator.className = 'turn-indicator turn-yours';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    guessInput.focus();
  } else {
    indicator.textContent = opponentName + ' is thinking\u2026';
    indicator.className = 'turn-indicator turn-theirs';
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }
}

function startTurnTimer() {
  stopTurnTimer();
  turnTimeLeft = TURN_TIME;
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
  const pct = Math.max(0, (turnTimeLeft / TURN_TIME) * 100);
  fill.style.width = pct + '%';
  fill.classList.toggle('urgent', turnTimeLeft <= 2);
  text.textContent = Math.ceil(Math.max(0, turnTimeLeft)) + 's';
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
  if (count <= 5) {
    fill.classList.add('very-narrow');
    info.classList.add('very-hot');
  } else if (count <= 15) {
    fill.classList.add('narrow');
    info.classList.add('hot');
  }
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
  el.classList.toggle('warn', left <= 2);
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

  const near = result !== 'correct' && dist <= 3;
  conn.send({
    type: 'feedback',
    result: result,
    guess: val,
    myNumber: result === 'correct' ? myNumber : undefined,
    near: near
  });

  turnCount++;
  addHistoryItem('opponent', val, result, turnCount);

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
}

function handleFeedback(data) {
  const { result, guess, myNumber: theirNumber, near } = data;

  turnCount++;
  addHistoryItem('you', guess, result, turnCount);

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
    if (range <= 5 && range > 0) {
      showToast('Narrowing in! Only ' + (range + 1) + ' numbers left.');
      playNearSound();
    }

    if (gameConfig.limitGuesses && myGuessCount >= gameConfig.maxGuesses) {
      myExhausted = true;
      conn.send({ type: 'guessesExhausted', closestGuess: guess, closestDist: knownHigh - knownLow });
      if (opponentExhausted) {
        resolveTie();
      } else {
        showToast('No guesses left! Waiting for ' + opponentName + '\u2026');
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
function addHistoryItem(who, guess, result, turn) {
  const container = document.getElementById('history');
  const item = document.createElement('div');
  item.className = 'history-item ' + who;

  const label = who === 'you' ? myName : opponentName;

  item.innerHTML = `
    <span class="turn-num">${turn}</span>
    <span>${esc(label)} guessed</span>
    <span class="guess-val">${guess}</span>
    <span class="result-badge result-${result}">${result === 'higher' ? '\u2191 Higher' : result === 'lower' ? '\u2193 Lower' : '\u2713 Correct'}</span>
  `;

  container.prepend(item);
}

// ===== Game Over =====
function endGame(iWon, winningGuess, tieType) {
  stopTurnTimer();
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

  document.getElementById('reveal-yours-label').textContent = myName + "'s Number";
  document.getElementById('reveal-opponent-label').textContent = opponentName + "'s Number";
  closestEl.textContent = '';

  if (isDraw) {
    emojiEl.textContent = '\u2694\uFE0F';
    textEl.textContent = 'It\u2019s a Draw!';
    textEl.className = 'winner-text draw';
    subEl.textContent = 'Both ran out of guesses \u2014 equally close!';
    playLoseSound();
    document.getElementById('confetti-container').innerHTML = '';
  } else if (iWon) {
    emojiEl.textContent = '\uD83C\uDFC6';
    textEl.textContent = 'You Win!';
    textEl.className = 'winner-text win';
    if (tieType === 'tie-win') {
      subEl.textContent = 'Both out of guesses \u2014 but your guess was closer!';
    } else if (winningGuess != null) {
      subEl.textContent = 'Nailed it! ' + winningGuess + ' in just ' + myGuessCount + ' guesses.';
      opponentNumber = winningGuess;
    } else {
      subEl.textContent = opponentName + ' ran out of guesses!';
    }
    playWinSound();
    spawnConfetti();
  } else {
    emojiEl.textContent = '\uD83D\uDE14';
    textEl.textContent = 'You Lose';
    textEl.className = 'winner-text lose';
    if (tieType === 'tie-lose') {
      subEl.textContent = 'Both out of guesses \u2014 ' + opponentName + ' was closer!';
    } else if (winningGuess != null) {
      subEl.textContent = opponentName + ' cracked your number ' + winningGuess + ' in ' + turnCount + ' turns.';
    } else {
      subEl.textContent = 'You ran out of guesses!';
    }
    opponentNumber = null;
    playLoseSound();
    document.getElementById('confetti-container').innerHTML = '';

    const myRange = knownHigh - knownLow;
    if (myRange <= 20) {
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
  startAutoRematch();
}

// ===== Auto Rematch =====
let countdownTimer = null;
const REMATCH_TIME = 5;

function startAutoRematch() {
  stopAutoRematch();
  let timeLeft = REMATCH_TIME;
  updateRematchUI(timeLeft);

  countdownTimer = setInterval(() => {
    timeLeft -= 0.25;
    updateRematchUI(timeLeft);
    if (timeLeft <= 0) {
      stopAutoRematch();
      playAgainSent = true;
      conn.send({ type: 'playAgain' });
      document.getElementById('play-again-status').textContent = 'Waiting for ' + opponentName + '\u2026';
      if (playAgainReceived) {
        startNewRound();
      }
    }
  }, 250);
}

function stopAutoRematch() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function updateRematchUI(timeLeft) {
  const pct = Math.max(0, ((REMATCH_TIME - timeLeft) / REMATCH_TIME) * 100);
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

  document.getElementById('btn-lock').disabled = false;
  document.getElementById('btn-lock').textContent = 'Lock It In';
  document.getElementById('self-check').textContent = '\u2026';
  document.getElementById('self-check').className = 'check pending';
  document.getElementById('opponent-check').textContent = '\u2026';
  document.getElementById('opponent-check').className = 'check pending';

  document.getElementById('setup-self-name').textContent = myName;
  document.getElementById('setup-opponent-name').textContent = opponentName;

  applyConfigToSetup();
  showScreen('setup');
  showToast('Fresh round. New number. Let\u2019s go!');
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
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (turnTimerId) { clearInterval(turnTimerId); turnTimerId = null; }
}

// ===== Init =====
(function init() {
  const saved = localStorage.getItem('nc_playerName');
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

  const params = new URLSearchParams(window.location.search);
  const autoJoinCode = params.get('g');
  if (autoJoinCode) {
    window.history.replaceState({}, '', window.location.pathname);
    document.getElementById('join-id-input').value = autoJoinCode.toUpperCase();
    setTimeout(() => joinGame(), 300);
  }
})();
