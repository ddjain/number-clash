const DIFFICULTIES = CONFIG.difficulties;

let gameConfig = {
  difficulty: CONFIG.game.defaultDifficulty,
  max: DIFFICULTIES[CONFIG.game.defaultDifficulty].max,
  maxGuesses: DIFFICULTIES[CONFIG.game.defaultDifficulty].maxGuesses,
  limitGuesses: CONFIG.game.defaultLimitGuesses
};

function setDifficulty(mode) {
  const d = DIFFICULTIES[mode];
  if (!d) return;
  gameConfig.difficulty = mode;
  gameConfig.max = d.max;
  gameConfig.maxGuesses = d.maxGuesses;
  document.querySelectorAll('.btn-diff').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

function toggleGuessLimit(enabled) {
  gameConfig.limitGuesses = enabled;
}

function randomName() {
  const adj = CONFIG.names.adjectives;
  const noun = CONFIG.names.nouns;
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  return a + ' ' + n;
}

function resolveMyName() {
  const input = document.getElementById('player-name-input');
  const raw = input.value.trim();
  myName = raw || randomName();
  localStorage.setItem(CONFIG.storage.playerNameKey, raw);
  return myName;
}

function esc(s) {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), CONFIG.timing.toastDuration);
}

function showRules() {
  document.getElementById('rules-overlay').classList.add('open');
}

function hideRules() {
  document.getElementById('rules-overlay').classList.remove('open');
  localStorage.setItem(CONFIG.storage.rulesShownKey, '1');
}

function checkFirstLaunch() {
  if (!localStorage.getItem(CONFIG.storage.rulesShownKey)) {
    showRules();
  }
}

function toggleStatsExpand() {
  const bar = document.getElementById('stats-summary-bar');
  const content = document.getElementById('stats-content');
  bar.classList.toggle('open');
  content.classList.toggle('open');
}

function updateStatsSummary() {
  const history = getHistory();
  const el = document.getElementById('stats-summary-text');
  if (!el) return;
  if (history.length === 0) {
    el.textContent = 'No games yet';
  } else {
    const wins = history.filter(g => g.won).length;
    const rate = Math.round((wins / history.length) * 100);
    el.textContent = history.length + ' games · ' + rate + '% wins';
  }
}
