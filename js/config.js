const CONFIG = {
  game: {
    codePrefix: 'nc-',
    codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    codeLength: 5,
    defaultDifficulty: 'medium',
    defaultLimitGuesses: true
  },

  difficulties: {
    easy:   { max: 50,  maxGuesses: 8,  label: 'Easy (1-50)' },
    medium: { max: 100, maxGuesses: 8,  label: 'Medium (1-100)' },
    hard:   { max: 500, maxGuesses: 12, label: 'Hard (1-500)' }
  },

  timing: {
    turnTime: 15,
    rematchCountdown: 5,
    toastDuration: 2500,
    guessRevealDelay: 1000,
    startGameDelay: 800,
    copyFeedbackDuration: 2000,
    autoJoinDelay: 300
  },

  thresholds: {
    urgentTimer: 3,
    rangeNarrow: 15,
    rangeVeryNarrow: 5,
    nearDistance: 3,
    narrowingToast: 5,
    guessWarning: 2,
    closeLossRange: 20,
    flavorDangerouslyClose: 3,
    flavorHot: 8,
    flavorWarmPct: 0.15
  },

  names: {
    adjectives: [
      'Swift','Bold','Calm','Dark','Eager','Fierce','Grand','Hazy',
      'Iron','Jade','Keen','Lone','Misty','Noble','Prime','Quick',
      'Rapid','Sly','True','Vivid'
    ],
    nouns: [
      'Falcon','Tiger','Raven','Wolf','Cobra','Eagle','Shark','Lynx',
      'Hawk','Viper','Fox','Bear','Crane','Drake','Storm','Flame',
      'Frost','Ridge','Blaze','Thorn'
    ]
  },

  messages: {
    loss: [
      'Tough break! You\'ll get them next time.',
      'So close! One more round?',
      'Every loss is a lesson. Run it back!',
      'They got lucky. Rematch?',
      'Almost had it! Next round is yours.',
      'Shake it off. Champions bounce back.',
      'Not your round, but the session isn\'t over!',
      'That was a warm-up. Let\'s go again.'
    ],
    flavorNailed: 'NAILED IT!',
    flavorDangerouslyClose: 'Dangerously close!',
    flavorHot: 'Getting hot...',
    flavorWarm: 'Getting warm...',
    flavorCold: 'Way off!'
  },

  effects: {
    confettiColors: ['#8b5cf6','#34d399','#eab308','#3b82f6','#ef4444','#f97316','#ec4899'],
    confettiColorsSecondary: ['#8b5cf6','#34d399','#eab308','#3b82f6'],
    confettiParticleCount: 80,
    confettiSpread: 70,
    confettiSecondaryCount: 50,
    confettiSecondaryDelay: 250
  },

  storage: {
    playerNameKey: 'nc_playerName',
    rulesShownKey: 'nc_rulesShown',
    historyKey: 'nc_history',
    maxHistory: 50
  },

  social: {
    reactions: ['🔥','😂','🤔','👏','😱','💀'],
    quickChat: {
      greetings: ['Hey!', 'Let\'s go!', 'Good luck!', 'Bring it on!'],
      gameplay: ['Nice guess', 'Not even close', 'You\'re warm...', 'Getting nervous?'],
      endgame: ['GG', 'One more?', 'Too easy', 'So close!']
    },
    postGameTaunts: {
      winner: ['GG', 'Too easy 😎', 'Better luck next time', 'That was fun!'],
      loser: ['GG', 'So close!', 'Rematch? 🔥', 'Lucky...']
    },
    reactionDisplayDuration: 2000,
    chatDisplayDuration: 3000
  }
};
