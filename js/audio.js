let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type, gain) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playGuessSound() { playTone(600, 0.08, 'square', 0.08); }

function playWinSound() {
  playTone(523, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 150);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.15), 300);
}

function playLoseSound() {
  playTone(400, 0.2, 'sine', 0.1);
  setTimeout(() => playTone(300, 0.3, 'sine', 0.1), 200);
}

function playNearSound() {
  playTone(880, 0.06, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.1), 100);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.1), 200);
}

function playTurnSwitchSound() {
  playTone(440, 0.05, 'sine', 0.06);
  setTimeout(() => playTone(550, 0.05, 'sine', 0.06), 60);
}

function playTimerUrgentSound() {
  playTone(800, 0.04, 'square', 0.05);
}

function playLockSound() {
  playTone(660, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.15, 'sine', 0.12), 100);
}
