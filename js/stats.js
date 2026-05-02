function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storage.historyKey)) || [];
  } catch { return []; }
}

function saveGameRecord(won, oppName, myNum, oppNum, turns) {
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    myName: myName,
    opponentName: oppName,
    won: won,
    myNumber: myNum,
    opponentNumber: oppNum,
    turns: turns
  });
  if (history.length > CONFIG.storage.maxHistory) history.length = CONFIG.storage.maxHistory;
  localStorage.setItem(CONFIG.storage.historyKey, JSON.stringify(history));
}

function renderStats() {
  updateStatsSummary();
  const history = getHistory();
  const container = document.getElementById('stats-content');

  if (history.length === 0) {
    container.innerHTML = '<div class="no-games">No games played yet. Start one above!</div>';
    return;
  }

  const wins = history.filter(g => g.won).length;
  const losses = history.length - wins;
  const winRate = Math.round((wins / history.length) * 100);
  const wonGames = history.filter(g => g.won);
  const avgTurns = wonGames.length
    ? Math.round(wonGames.reduce((s, g) => s + g.turns, 0) / wonGames.length * 10) / 10
    : '-';
  const bestWin = wonGames.length ? Math.min(...wonGames.map(g => g.turns)) : '-';

  let curStreak = 0;
  for (const g of history) {
    if (g.won) curStreak++;
    else break;
  }

  let bestStreak = 0, streak = 0;
  for (const g of history) {
    if (g.won) { streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
  }

  const recent = history.slice(0, 10);
  let recentHtml = '';
  for (const g of recent) {
    const d = new Date(g.date);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const tag = g.won
      ? '<span class="recent-result win-tag">WIN</span>'
      : '<span class="recent-result loss-tag">LOSS</span>';
    recentHtml += `<div class="recent-item">
      ${tag}
      <span class="recent-detail">vs ${esc(g.opponentName || 'Unknown')} &middot; ${dateStr}</span>
      <span class="recent-turns">${g.turns} turns</span>
    </div>`;
  }

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-val stat-neutral">${history.length}</div><div class="stat-label">Games</div></div>
      <div class="stat-item"><div class="stat-val stat-win">${winRate}%</div><div class="stat-label">Win Rate</div></div>
      <div class="stat-item"><div class="stat-val stat-win">${wins}</div><div class="stat-label">Wins</div></div>
      <div class="stat-item"><div class="stat-val stat-loss">${losses}</div><div class="stat-label">Losses</div></div>
      <div class="stat-item"><div class="stat-val stat-neutral">${bestWin}</div><div class="stat-label">Fastest Win</div></div>
      <div class="stat-item"><div class="stat-val stat-neutral">${avgTurns}</div><div class="stat-label">Avg Turns (Win)</div></div>
      <div class="stat-item"><div class="stat-val stat-win">${curStreak}</div><div class="stat-label">Win Streak</div></div>
      <div class="stat-item"><div class="stat-val stat-neutral">${bestStreak}</div><div class="stat-label">Best Streak</div></div>
    </div>
    <button class="recent-toggle" onclick="toggleRecent(this)">
      <span>Recent Games (${recent.length})</span>
      <span class="arrow">&#9660;</span>
    </button>
    <div class="recent-list" id="recent-list">${recentHtml}</div>
    <div class="stats-footer">
      <button class="btn btn-danger btn-sm" onclick="clearHistory()">Clear History</button>
    </div>
  `;
}

function toggleRecent(btn) {
  btn.classList.toggle('open');
  document.getElementById('recent-list').classList.toggle('open');
}

function clearHistory() {
  localStorage.removeItem(CONFIG.storage.historyKey);
  renderStats();
  showToast('History cleared.');
}
