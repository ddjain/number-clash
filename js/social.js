let chatBubbleTimer = null;
let lastSocialSend = 0;

function socialCooldown() {
  const now = Date.now();
  if (now - lastSocialSend < 500) return true;
  lastSocialSend = now;
  return false;
}

function populateReactions() {
  const tray = document.getElementById('reaction-tray');
  if (!tray) return;
  tray.innerHTML = '';
  CONFIG.social.reactions.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'btn-reaction';
    btn.textContent = emoji;
    btn.onclick = () => sendReaction(emoji);
    tray.appendChild(btn);
  });
}

function sendReaction(emoji) {
  if (!conn || !conn.open || socialCooldown()) return;
  conn.send({ type: 'reaction', emoji: emoji });
  showFloatingReaction(emoji);
}

function showFloatingReaction(emoji) {
  const stage = document.getElementById('reaction-stage');
  if (!stage) return;
  const el = document.createElement('div');
  el.className = 'reaction-float';
  el.textContent = emoji;
  el.style.left = (30 + Math.random() * 40) + '%';
  stage.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function toggleChatPicker() {
  const picker = document.getElementById('chat-picker');
  if (picker) picker.classList.toggle('open');
}

function populateChatPicker() {
  const picker = document.getElementById('chat-picker');
  if (!picker) return;
  picker.innerHTML = '';
  const cats = CONFIG.social.quickChat;
  const labels = { greetings: 'Greetings', gameplay: 'Gameplay', endgame: 'Endgame' };
  for (const key of Object.keys(cats)) {
    const heading = document.createElement('div');
    heading.className = 'chat-category';
    heading.textContent = labels[key] || key;
    picker.appendChild(heading);
    cats[key].forEach(msg => {
      const btn = document.createElement('button');
      btn.className = 'btn-chat-msg';
      btn.textContent = msg;
      btn.onclick = () => sendChat(msg);
      picker.appendChild(btn);
    });
  }
}

function sendChat(msg) {
  if (!conn || !conn.open || socialCooldown()) return;
  conn.send({ type: 'chat', msg: msg });
  showChatBubble(msg, myName);
  const picker = document.getElementById('chat-picker');
  if (picker) picker.classList.remove('open');
}

function showChatBubble(msg, name) {
  const el = document.getElementById('chat-bubble');
  if (!el) return;
  if (chatBubbleTimer) clearTimeout(chatBubbleTimer);
  el.textContent = name + ': ' + msg;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  chatBubbleTimer = setTimeout(() => { el.classList.remove('show'); chatBubbleTimer = null; }, CONFIG.social.chatDisplayDuration);
}

function populateTaunts(isWinner) {
  const row = document.getElementById('taunt-row');
  if (!row) return;
  row.innerHTML = '';
  const list = isWinner ? CONFIG.social.postGameTaunts.winner : CONFIG.social.postGameTaunts.loser;
  list.forEach(msg => {
    const btn = document.createElement('button');
    btn.className = 'btn-taunt';
    btn.textContent = msg;
    btn.onclick = () => sendTaunt(msg, btn);
    row.appendChild(btn);
  });
}

function sendTaunt(msg, btn) {
  if (!conn || !conn.open) return;
  conn.send({ type: 'taunt', msg: msg });
  document.querySelectorAll('.btn-taunt').forEach(b => b.disabled = true);
  if (btn) btn.classList.add('sent');
}

function showOpponentTaunt(msg) {
  const el = document.getElementById('opponent-taunt');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
