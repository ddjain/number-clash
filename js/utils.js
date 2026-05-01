const DIFFICULTIES = {
  easy:   { max: 50,  maxGuesses: 8,  label: 'Easy (1-50)' },
  medium: { max: 100, maxGuesses: 8,  label: 'Medium (1-100)' },
  hard:   { max: 500, maxGuesses: 12, label: 'Hard (1-500)' }
};

let gameConfig = { difficulty: 'medium', max: 100, maxGuesses: 8, limitGuesses: true };

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

const ADJ = [
  'Swift','Bold','Calm','Dark','Eager','Fierce','Grand','Hazy',
  'Iron','Jade','Keen','Lone','Misty','Noble','Prime','Quick',
  'Rapid','Sly','True','Vivid'
];
const NOUN = [
  'Falcon','Tiger','Raven','Wolf','Cobra','Eagle','Shark','Lynx',
  'Hawk','Viper','Fox','Bear','Crane','Drake','Storm','Flame',
  'Frost','Ridge','Blaze','Thorn'
];

function randomName() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return a + ' ' + n;
}

function resolveMyName() {
  const input = document.getElementById('player-name-input');
  const raw = input.value.trim();
  myName = raw || randomName();
  localStorage.setItem('nc_playerName', raw);
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
  setTimeout(() => el.classList.remove('show'), 2500);
}

function showRules() {
  document.getElementById('rules-overlay').classList.add('open');
}

function hideRules() {
  document.getElementById('rules-overlay').classList.remove('open');
  localStorage.setItem('nc_rulesShown', '1');
}

function checkFirstLaunch() {
  if (!localStorage.getItem('nc_rulesShown')) {
    showRules();
  }
}
