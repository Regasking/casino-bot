const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class EconomySystem {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/users.json');
    this.users = this.loadData();
    this.currency = "🪙";
    this.startBalance = 1000;
    this.achievements = {
      // Achievements simples (existants)
      FIRST_WIN: { name: '🎉 Première victoire', description: 'Gagne ta première partie', reward: 500, secret: false },
      HIGH_ROLLER: { name: '💎 High Roller', description: 'Mise 5000+ coins en une fois', reward: 1000, secret: false },
      LUCKY_STREAK: { name: '🔥 Série chanceuse', description: 'Gagne 5 parties d\'affilée', reward: 2000, secret: false },
      MILLIONAIRE: { name: '💰 Millionnaire', description: 'Atteins 100,000 coins', reward: 5000, secret: false },
      VETERAN: { name: '🎮 Vétéran', description: 'Joue 100 parties', reward: 3000, secret: false },
      COMEBACK_KID: { name: '🆙 Retour gagnant', description: 'Passe de <100 à 10,000+ coins', reward: 2500, secret: false },
      ALL_GAMES: { name: '🎯 Joueur complet', description: 'Joue à tous les jeux', reward: 1500, secret: false },
      BLACKJACK_NATURAL: { name: '🃏 Blackjack naturel', description: 'Obtiens un Blackjack (21 direct)', reward: 1000, secret: false },
      CRASH_MASTER: { name: '💥 Maître du Crash', description: 'Cash out à 10x ou plus', reward: 2000, secret: false },
      BROKE_NO_MORE: { name: '💪 Plus jamais broke', description: 'Atteins 50,000 coins sans utiliser welfare', reward: 3000, secret: false },

      // NOUVEAUX - Achievements progressifs
      CRASH_NOVICE: {
        name: '💥 Crash Novice',
        description: 'Joue 10 parties de Crash',
        reward: 500,
        requirement: 10,
        type: 'progressive',
        game: 'crash',
        secret: false
      },
      CRASH_AMATEUR: {
        name: '💥 Crash Amateur',
        description: 'Joue 50 parties de Crash',
        reward: 1500,
        requirement: 50,
        type: 'progressive',
        game: 'crash',
        secret: false
      },
      CRASH_PRO: {
        name: '💥 Crash Pro',
        description: 'Joue 100 parties de Crash',
        reward: 3000,
        requirement: 100,
        type: 'progressive',
        game: 'crash',
        secret: false
      },
      DICE_MASTER: {
        name: '🎲 Maître du Dé',
        description: 'Gagne 20 parties de Dice',
        reward: 2000,
        requirement: 20,
        type: 'progressive',
        game: 'dice',
        secret: false
      },
      BLACKJACK_ACE: {
        name: '🃏 As du Blackjack',
        description: 'Gagne 30 parties de Blackjack',
        reward: 2500,
        requirement: 30,
        type: 'progressive',
        game: 'blackjack',
        secret: false
      },
      ROULETTE_KING: {
        name: '🎰 Roi de la Roulette',
        description: 'Gagne 25 parties de Roulette',
        reward: 2200,
        requirement: 25,
        type: 'progressive',
        game: 'roulette',
        secret: false
      },

      // NOUVEAUX - Achievements secrets
      SECRET_WHALE: {
        name: '🐋 Baleine Cachée',
        description: '???',
        hiddenDescription: 'Mise 50,000 coins en une seule fois',
        reward: 10000,
        secret: true
      },
      SECRET_IMMORTAL: {
        name: '👑 Immortel',
        description: '???',
        hiddenDescription: 'Gagne 20 parties d\'affilée',
        reward: 15000,
        secret: true
      },
      SECRET_PHILANTHROPIST: {
        name: '🎁 Philanthrope',
        description: '???',
        hiddenDescription: 'Transfère un total de 50,000 coins',
        reward: 5000,
        secret: true
      },
      SECRET_INSURANCE_FRAUD: {
        name: '😈 Fraudeur',
        description: '???',
        hiddenDescription: 'Déclenche l\'assurance 3 fois',
        reward: 3000,
        secret: true
      },
      SECRET_INTEREST_BARON: {
        name: '💳 Baron des Intérêts',
        description: '???',
        hiddenDescription: 'Accumule 10,000 coins d\'intérêts bancaires',
        reward: 5000,
        secret: true
      },

      // NOUVEAUX - Achievements négatifs (fun)
      ULTIMATE_LOSER: {
        name: '💀 Roi des Loosers',
        description: 'Perds 50,000 coins au total',
        reward: 2000,
        badge: '💀',
        secret: false
      },
      BROKE_CHAMPION: {
        name: '🤡 Champion du Broke',
        description: 'Utilise welfare 10 fois',
        reward: 1000,
        badge: '🤡',
        secret: false
      },
      GAMBLING_ADDICT: {
        name: '🎰 Accro au Jeu',
        description: 'Joue 500 parties',
        reward: 5000,
        badge: '🎰',
        secret: false
      }
    };
  }

  loadData() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
        fs.writeFileSync(this.dataPath, '{}');
        return {};
      }
      return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
    } catch (error) {
      console.error('Erreur chargement données:', error);
      return {};
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde données:', error);
    }
  }

  getUser(userId) {
    if (!this.users[userId]) {
      this.users[userId] = {
        balance: this.startBalance,
        totalWon: 0,
        totalLost: 0,
        gamesPlayed: 0,
        winRate: 0,
        rank: "🥉 Bronze",
        lastDaily: 0,
        createdAt: Date.now(),
        achievements: [],
        currentStreak: 0,
        gamesPlayedByType: {},
        hasUsedWelfare: false,
        highestCashout: 0
      };
      this.saveData();
    }
    
    // Assurer la compatibilité avec anciens users
    const user = this.users[userId];
    if (!Array.isArray(user.achievements)) user.achievements = [];
    if (typeof user.currentStreak !== "number") user.currentStreak = 0;
    if (typeof user.gamesPlayedByType !== "object" || user.gamesPlayedByType === null) user.gamesPlayedByType = {};
    if (typeof user.hasUsedWelfare !== "boolean") user.hasUsedWelfare = false;
    if (typeof user.highestCashout !== "number") user.highestCashout = 0;
    
    return user;
  }

  checkAchievements(userId) {
    const user = this.getUser(userId);
    const newAchievements = [];

    // Initialiser tracking si nécessaire
    if (!user.totalTransferred) user.totalTransferred = 0;
    if (!user.totalInterestEarned) user.totalInterestEarned = 0;
    if (!user.insuranceTriggered) user.insuranceTriggered = 0;
    if (!user.welfareUsedCount) user.welfareUsedCount = 0;
    if (!user.gameWins) user.gameWins = {};
    if (!user.bestWinStreak) user.bestWinStreak = 0;

    // Mettre à jour meilleure série
    if (user.currentStreak > user.bestWinStreak) {
      user.bestWinStreak = user.currentStreak;
    }

    // Vérifier chaque achievement
    Object.entries(this.achievements).forEach(([id, ach]) => {
      // Skip si déjà débloqué
      if (user.achievements.includes(id)) return;

      let unlocked = false;

      // Achievements simples
      if (id === 'FIRST_WIN' && user.totalWon > 0) unlocked = true;
      if (id === 'MILLIONAIRE' && user.balance >= 100000) unlocked = true;
      if (id === 'VETERAN' && user.gamesPlayed >= 100) unlocked = true;
      if (id === 'LUCKY_STREAK' && user.currentStreak >= 5) unlocked = true;
      if (id === 'BROKE_NO_MORE' && user.balance >= 50000 && !user.hasUsedWelfare) unlocked = true;
      if (id === 'CRASH_MASTER' && user.highestCashout >= 10) unlocked = true;
      if (id === 'ULTIMATE_LOSER' && user.totalLost >= 50000) unlocked = true;
      if (id === 'GAMBLING_ADDICT' && user.gamesPlayed >= 500) unlocked = true;
      if (id === 'BROKE_CHAMPION' && user.welfareUsedCount >= 10) unlocked = true;

      // ALL_GAMES
      if (id === 'ALL_GAMES') {
        const allGames = ['crash', 'dice', 'blackjack', 'roulette'];
        const playedGames = Object.keys(user.gamesPlayedByType || {});
        if (allGames.every(game => playedGames.includes(game))) unlocked = true;
      }

      // Achievements progressifs par jeu
      if (ach.type === 'progressive' && ach.game) {
        const gamesPlayed = user.gamesPlayedByType?.[ach.game] || 0;
        if (gamesPlayed >= ach.requirement) unlocked = true;
      }

      // Achievements progressifs par victoires
      if (id === 'DICE_MASTER') {
        const wins = user.gameWins?.dice || 0;
        if (wins >= 20) unlocked = true;
      }
      if (id === 'BLACKJACK_ACE') {
        const wins = user.gameWins?.blackjack || 0;
        if (wins >= 30) unlocked = true;
      }
      if (id === 'ROULETTE_KING') {
        const wins = user.gameWins?.roulette || 0;
        if (wins >= 25) unlocked = true;
      }

      // Achievements secrets
      if (id === 'SECRET_IMMORTAL' && user.bestWinStreak >= 20) unlocked = true;
      if (id === 'SECRET_PHILANTHROPIST' && user.totalTransferred >= 50000) unlocked = true;
      if (id === 'SECRET_INSURANCE_FRAUD' && user.insuranceTriggered >= 3) unlocked = true;
      if (id === 'SECRET_INTEREST_BARON' && user.totalInterestEarned >= 10000) unlocked = true;

      // Si débloqué, ajouter
      if (unlocked) {
        user.achievements.push(id);
        user.balance += ach.reward;
        newAchievements.push(id);
      }
    });

    if (newAchievements.length > 0) {
      this.saveData();
    }

    return newAchievements;
  }

  addMoney(userId, amount) {
    const user = this.getUser(userId);
    const oldBalance = user.balance;
    user.balance += amount;
    user.totalWon += amount;
    this.updateRank(userId);
    this.saveData();
    // LOG
    logger.logTransaction(userId, 'credit', amount, {
      oldBalance,
      newBalance: user.balance
    });
    return user.balance;
  }

  removeMoney(userId, amount) {
    const user = this.getUser(userId);
    if (user.balance < amount) return false;
    const oldBalance = user.balance;
    user.balance -= amount;
    user.totalLost += amount;
    this.saveData();
    // LOG
    logger.logTransaction(userId, 'debit', amount, {
      oldBalance,
      newBalance: user.balance
    });
    return true;
  }

  updateRank(userId) {
    const user = this.getUser(userId);
    const balance = user.balance;
    
    if (balance >= 100000) user.rank = "💎 Diamond";
    else if (balance >= 50000) user.rank = "🏆 Platinum";
    else if (balance >= 25000) user.rank = "⭐ Gold";
    else if (balance >= 10000) user.rank = "🥈 Silver";
    else user.rank = "🥉 Bronze";
    
    this.saveData();
  }

  updateStats(userId, won, amount, gameType = 'unknown') {
    const user = this.getUser(userId);
    user.gamesPlayed++;
    // Track game type
    if (!user.gamesPlayedByType) user.gamesPlayedByType = {};
    user.gamesPlayedByType[gameType] = (user.gamesPlayedByType[gameType] || 0) + 1;
    // Track wins by game
    if (!user.gameWins) user.gameWins = {};
    if (won) {
      user.gameWins[gameType] = (user.gameWins[gameType] || 0) + 1;
    }
    if (won) {
      user.totalWon += amount;
      user.currentStreak = (user.currentStreak || 0) + 1;
      // Meilleure série
      if (!user.bestWinStreak) user.bestWinStreak = 0;
      if (user.currentStreak > user.bestWinStreak) {
        user.bestWinStreak = user.currentStreak;
      }
    } else {
      user.totalLost += amount;
      user.currentStreak = 0;
    }
    // Calcul winrate
    const totalGames = user.gamesPlayed;
    const wins = Math.round((user.totalWon / (user.totalWon + user.totalLost)) * totalGames);
    user.winRate = ((wins / totalGames) * 100).toFixed(1);
    this.saveData();
    // LOG
    const logger = require('./logger');
    logger.logTransaction(userId, won ? 'game_win' : 'game_loss', amount, {
      gameType,
      oldBalance: user.balance - (won ? amount : -amount),
      newBalance: user.balance
    });
    // Vérifier achievements
    return this.checkAchievements(userId);
  }

  getLeaderboard(limit = 10) {
    return Object.entries(this.users)
      .sort((a, b) => b[1].balance - a[1].balance)
      .slice(0, limit)
      .map(([userId, data], index) => ({
        userId,
        balance: data.balance,
        rank: data.rank,
        position: index + 1
      }));
  }

  dailyBonus(userId) {
    const user = this.getUser(userId);
    const now = Date.now();
    const lastClaim = user.lastDaily || 0;
    const cooldown = 24 * 60 * 60 * 1000; // 24h
    
    if (now - lastClaim >= cooldown) {
      const bonus = Math.floor(Math.random() * 500) + 500; // 500-1000
      user.balance += bonus;
      user.lastDaily = now;
      this.saveData();
      return { success: true, amount: bonus };
    }
    
    const timeLeft = cooldown - (now - lastClaim);
    return { success: false, timeLeft };
  }

  welfare(userId) {
    const user = this.getUser(userId);
    if (user.balance >= 100) {
      return { success: false, reason: "Tu as encore des coins" };
    }
    user.balance = 500;
    user.hasUsedWelfare = true;
    // NOUVEAU: Tracker count
    if (!user.welfareUsedCount) user.welfareUsedCount = 0;
    user.welfareUsedCount++;
    this.saveData();
    this.checkAchievements(userId); // Vérifier achievements
    return { success: true, amount: 500 };
  }

  trackHighRollerBet(userId, bet) {
    const user = this.getUser(userId);
    if (bet >= 5000 && !user.achievements.includes('HIGH_ROLLER')) {
      user.achievements.push('HIGH_ROLLER');
      user.balance += this.achievements.HIGH_ROLLER.reward;
      this.saveData();
      return 'HIGH_ROLLER';
    }
    return null;
  }

  trackCrashCashout(userId, multiplier) {
    const user = this.getUser(userId);
    if (!user.highestCashout) user.highestCashout = 0;
    if (multiplier > user.highestCashout) {
      user.highestCashout = multiplier;
      this.saveData();
    }
    return this.checkAchievements(userId);
  }

  trackBlackjackNatural(userId) {
    const user = this.getUser(userId);
    if (!user.achievements.includes('BLACKJACK_NATURAL')) {
      user.achievements.push('BLACKJACK_NATURAL');
      user.balance += this.achievements.BLACKJACK_NATURAL.reward;
      this.saveData();
      return 'BLACKJACK_NATURAL';
    }
    return null;
  }
  // Système de prêts
  requestLoan(borrowerId, lenderId, amount) {
    const borrower = this.getUser(borrowerId);
    const lender = this.getUser(lenderId);

    // Vérifications
    if (lender.balance < amount) {
      return { success: false, reason: "Le prêteur n'a pas assez de coins" };
    }

    if (amount < 100 || amount > 5000) {
      return { success: false, reason: "Montant invalide (min 100, max 5000)" };
    }

    // Vérifier si l'emprunteur a déjà un prêt actif
    if (!borrower.activeLoan) borrower.activeLoan = null;
    if (borrower.activeLoan) {
      return { success: false, reason: "Tu as déjà un prêt actif !" };
    }

    // Créer le prêt (10% d'intérêt)
    const interest = Math.floor(amount * 0.10);
    const totalDue = amount + interest;

    borrower.activeLoan = {
      lenderId,
      amount,
      interest,
      totalDue,
      timestamp: Date.now()
    };

    // Transférer l'argent
    this.removeMoney(lenderId, amount);
    this.addMoney(borrowerId, amount);

    this.saveData();

    return {
      success: true,
      amount,
      interest,
      totalDue,
      lenderName: lenderId
    };
  }

  repayLoan(borrowerId) {
    const borrower = this.getUser(borrowerId);

    if (!borrower.activeLoan) {
      return { success: false, reason: "Tu n'as pas de prêt actif" };
    }

    const loan = borrower.activeLoan;

    if (borrower.balance < loan.totalDue) {
      return {
        success: false,
        reason: `Balance insuffisante ! Il te faut ${loan.totalDue} ${this.currency}`,
        needed: loan.totalDue,
        current: borrower.balance
      };
    }

    // Rembourser
    this.removeMoney(borrowerId, loan.totalDue);
    this.addMoney(loan.lenderId, loan.totalDue);

    borrower.activeLoan = null;
    this.saveData();

    return {
      success: true,
      amount: loan.amount,
      interest: loan.interest,
      total: loan.totalDue
    };
  }

  getLoanStatus(userId) {
    const user = this.getUser(userId);
    return user.activeLoan || null;
  }
  
  // Système de prêts
  requestLoan(borrowerId, lenderId, amount) {
    const borrower = this.getUser(borrowerId);
    const lender = this.getUser(lenderId);

    // Vérifications
    if (lender.balance < amount) {
      return { success: false, reason: "Le prêteur n'a pas assez de coins" };
    }

    if (amount < 100 || amount > 5000) {
      return { success: false, reason: "Montant invalide (min 100, max 5000)" };
    }

    // Vérifier si l'emprunteur a déjà un prêt actif
    if (!borrower.activeLoan) borrower.activeLoan = null;
    if (borrower.activeLoan) {
      return { success: false, reason: "Tu as déjà un prêt actif !" };
    }

    // Créer le prêt (10% d'intérêt)
    const interest = Math.floor(amount * 0.10);
    const totalDue = amount + interest;

    borrower.activeLoan = {
      lenderId,
      amount,
      interest,
      totalDue,
      timestamp: Date.now()
    };

    // Transférer l'argent
    this.removeMoney(lenderId, amount);
    this.addMoney(borrowerId, amount);

    this.saveData();

    return { 
      success: true, 
      amount, 
      interest, 
      totalDue,
      lenderName: lenderId
    };
  }

  repayLoan(borrowerId) {
    const borrower = this.getUser(borrowerId);

    if (!borrower.activeLoan) {
      return { success: false, reason: "Tu n'as pas de prêt actif" };
    }

    const loan = borrower.activeLoan;

    if (borrower.balance < loan.totalDue) {
      return { 
        success: false, 
        reason: `Balance insuffisante ! Il te faut ${loan.totalDue} ${this.currency}`,
        needed: loan.totalDue,
        current: borrower.balance
      };
    }

    // Rembourser
    this.removeMoney(borrowerId, loan.totalDue);
    this.addMoney(loan.lenderId, loan.totalDue);

    borrower.activeLoan = null;
    this.saveData();

    return { 
      success: true, 
      amount: loan.amount,
      interest: loan.interest,
      total: loan.totalDue
    };
  }

  getLoanStatus(userId) {
    const user = this.getUser(userId);
    return user.activeLoan || null;
  }

  // Intérêts bancaires
  calculateInterest(userId) {
    const user = this.getUser(userId);
    
    // Intérêts seulement si balance >= 10,000
    if (user.balance < 10000) {
      return { eligible: false, reason: "Balance minimum 10,000 coins" };
    }

    const lastClaim = user.lastInterestClaim || user.createdAt;
    const now = Date.now();
    const timeSinceLastClaim = now - lastClaim;
    const daysElapsed = Math.floor(timeSinceLastClaim / (24 * 60 * 60 * 1000));

    if (daysElapsed < 1) {
      const timeLeft = (24 * 60 * 60 * 1000) - timeSinceLastClaim;
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      
      return { 
        eligible: false, 
        reason: "Déjà réclamé aujourd'hui",
        timeLeft: { hours: hoursLeft, minutes: minutesLeft }
      };
    }

    // Calculer intérêts : 1% par jour
    const dailyRate = 0.01;
    const interestPerDay = Math.floor(user.balance * dailyRate);
    const totalInterest = interestPerDay * daysElapsed;

    // Limiter à 7 jours max (anti-abus si quelqu'un ne claim pas pendant des mois)
    const cappedDays = Math.min(daysElapsed, 7);
    const cappedInterest = interestPerDay * cappedDays;

    user.balance += cappedInterest;
    user.lastInterestClaim = now;
    // Tracker pour achievement
    if (!user.totalInterestEarned) user.totalInterestEarned = 0;
    user.totalInterestEarned += cappedInterest;
    this.saveData();

    const logger = require('./logger');
    logger.logTransaction(userId, 'interest', cappedInterest, {
      days: cappedDays,
      rate: dailyRate,
      oldBalance: user.balance - cappedInterest,
      newBalance: user.balance
    });

    return {
      eligible: true,
      amount: cappedInterest,
      days: cappedDays,
      perDay: interestPerDay
    };
  }

  // Assurance
  buyInsurance(userId, duration = 7) {
    const user = this.getUser(userId);
    const cost = 500;

    if (user.balance < cost) {
      return { success: false, reason: "Balance insuffisante" };
    }

    // Vérifier si déjà assuré
    if (user.insurance && user.insurance.expiresAt > Date.now()) {
      return { success: false, reason: "Tu as déjà une assurance active" };
    }

    this.removeMoney(userId, cost);
    
    user.insurance = {
      active: true,
      expiresAt: Date.now() + (duration * 24 * 60 * 60 * 1000),
      used: false
    };

    this.saveData();

    const logger = require('./logger');
    logger.logTransaction(userId, 'insurance_buy', cost, {
      duration,
      expiresAt: user.insurance.expiresAt
    });

    return {
      success: true,
      cost,
      duration,
      expiresAt: user.insurance.expiresAt
    };
  }

  // Vérifier et utiliser l'assurance si broke
  checkInsurance(userId) {
    const user = this.getUser(userId);

    if (!user.insurance || !user.insurance.active) {
      return null;
    }

    // Vérifier si expirée
    if (user.insurance.expiresAt < Date.now()) {
      user.insurance.active = false;
      this.saveData();
      return null;
    }

    // Vérifier si déjà utilisée
    if (user.insurance.used) {
      return null;
    }

    // Si balance < 100, activer l'assurance
    if (user.balance < 100) {
      user.balance = 1000;
      user.insurance.used = true;
      user.insurance.active = false;
      // Tracker pour achievement
      if (!user.insuranceTriggered) user.insuranceTriggered = 0;
      user.insuranceTriggered++;
      this.saveData();

      const logger = require('./logger');
      logger.logTransaction(userId, 'insurance_claim', 1000, {
        triggered: true
      });

      return {
        triggered: true,
        amount: 1000
      };
    }

    return null;
  }

  // Score de crédit
  getCreditScore(userId) {
    const user = this.getUser(userId);
    
    // Initialiser si nécessaire
    if (typeof user.loansRepaidOnTime !== 'number') user.loansRepaidOnTime = 0;
    if (typeof user.loansDefaulted !== 'number') user.loansDefaulted = 0;
    
    let score = 100; // Score de base
    
    // Bonus pour remboursements à temps
    score += user.loansRepaidOnTime * 5;
    
    // Malus pour défauts de paiement
    score -= user.loansDefaulted * 20;
    
    // Bonus si balance élevée
    if (user.balance >= 50000) score += 10;
    else if (user.balance >= 25000) score += 5;
    
    // Malus si a utilisé welfare récemment
    if (user.hasUsedWelfare) score -= 10;
    
    // Limiter entre 0 et 100
    return Math.max(0, Math.min(100, score));
  }

  // Amélioration du système de prêt - intérêts variables
  requestLoan(borrowerId, lenderId, amount) {
    const borrower = this.getUser(borrowerId);
    const lender = this.getUser(lenderId);

    // Vérifications
    if (lender.balance < amount) {
      return { success: false, reason: "Le prêteur n'a pas assez de coins" };
    }

    if (amount < 100 || amount > 5000) {
      return { success: false, reason: "Montant invalide (min 100, max 5000)" };
    }

    if (!borrower.activeLoan) borrower.activeLoan = null;
    if (borrower.activeLoan) {
      return { success: false, reason: "Tu as déjà un prêt actif !" };
    }

    // Intérêts de base : 10%
    let interestRate = 0.10;
    
    // Bonus/malus selon credit score
    const creditScore = this.getCreditScore(borrowerId);
    if (creditScore >= 90) interestRate = 0.08; // Très bon score
    else if (creditScore >= 70) interestRate = 0.10; // Normal
    else if (creditScore >= 50) interestRate = 0.12; // Moyen
    else interestRate = 0.15; // Mauvais score

    const interest = Math.floor(amount * interestRate);
    const totalDue = amount + interest;

    borrower.activeLoan = {
      lenderId,
      amount,
      interest,
      totalDue,
      timestamp: Date.now(),
      interestRate
    };

    // Transférer l'argent
    this.removeMoney(lenderId, amount);
    this.addMoney(borrowerId, amount);

    this.saveData();

    const logger = require('./logger');
    logger.logTransaction(borrowerId, 'loan_received', amount, {
      lenderId,
      interestRate,
      creditScore
    });

    return { 
      success: true, 
      amount, 
      interest, 
      totalDue,
      interestRate,
      creditScore,
      lenderName: lenderId
    };
  }

  // Amélioration du remboursement - tracking
  repayLoan(borrowerId) {
    const borrower = this.getUser(borrowerId);

    if (!borrower.activeLoan) {
      return { success: false, reason: "Tu n'as pas de prêt actif" };
    }

    const loan = borrower.activeLoan;

    if (borrower.balance < loan.totalDue) {
      return { 
        success: false, 
        reason: `Balance insuffisante ! Il te faut ${loan.totalDue} ${this.currency}`,
        needed: loan.totalDue,
        current: borrower.balance
      };
    }

    // Calculer si remboursement à temps (< 7 jours)
    const timeSinceLoan = Date.now() - loan.timestamp;
    const daysElapsed = timeSinceLoan / (24 * 60 * 60 * 1000);
    const onTime = daysElapsed <= 7;

    // Rembourser
    this.removeMoney(borrowerId, loan.totalDue);
    this.addMoney(loan.lenderId, loan.totalDue);

    // Tracker pour credit score
    if (!borrower.loansRepaidOnTime) borrower.loansRepaidOnTime = 0;
    if (!borrower.loansDefaulted) borrower.loansDefaulted = 0;
    
    if (onTime) {
      borrower.loansRepaidOnTime++;
    } else {
      borrower.loansDefaulted++;
    }

    const lenderId = loan.lenderId;
    borrower.activeLoan = null;
    this.saveData();

    const logger = require('./logger');
    logger.logTransaction(borrowerId, 'loan_repaid', loan.totalDue, {
      lenderId,
      onTime,
      daysElapsed: Math.floor(daysElapsed)
    });

    return { 
      success: true, 
      amount: loan.amount,
      interest: loan.interest,
      total: loan.totalDue,
      onTime,
      lenderId
    };
  }
}

module.exports = new EconomySystem();