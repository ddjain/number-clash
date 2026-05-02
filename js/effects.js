function spawnConfetti() {
  if (typeof confetti !== 'function') return;

  const cfg = CONFIG.effects;

  confetti({
    particleCount: cfg.confettiParticleCount,
    spread: cfg.confettiSpread,
    origin: { y: 0.6 },
    colors: cfg.confettiColors
  });

  setTimeout(() => {
    confetti({
      particleCount: cfg.confettiSecondaryCount,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: cfg.confettiColorsSecondary
    });
    confetti({
      particleCount: cfg.confettiSecondaryCount,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: cfg.confettiColorsSecondary
    });
  }, cfg.confettiSecondaryDelay);
}
