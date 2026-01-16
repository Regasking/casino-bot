const fs = require('fs');
const path = require('path');

class EconomySystem {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/users.json');
    this.users = this.loadData();
    this.currency = "🪙";
    this.startBalance = 1000;
    this.achievements = {
      FIRST_WIN: { name: '🎉 Première victoire', description: 'Gagne ta première partie', reward: 500 },
      HIGH_ROLLER: { name: '💎 High Roller', description: 'Mise 5000+ coins en une fois', reward: 1000 },
      LUCKY_STREAK: { name: '🔥 Série chanceuse', description: 'Gagne 5 parties d\'affilée', reward: 2000 },
      MILLIONAIRE: { name: '💰 Millionnaire', description: 'Atteins 100,000 coins', reward: 5000 },
      VETERAN: { name: '🎮 Vétéran', description: 'Joue 100 parties', reward: 3000 },
      COMEBACK_KID: { name: '🆙 Retour gagnant', description: 'Passe de <100 à 10,000+ coins', reward: 2500 },
      ALL_GAMES: { name: '🎯 Joueur complet', description: 'Joue à tous les jeux', reward: 1500 },
      BLACKJACK_NATURAL: { name: '🃏 Blackjack naturel', description: 'Obtiens un Blackjack (21 direct)', reward: 1000 },
      CRASH_MASTER: { name: '💥 Maître du Crash', description: 'Cash out à 10x ou plus', reward: 2000 },
      BROKE_NO_MORE: { name: '💪 Plus jamais broke', description: 'Atteins 50,000 coins sans utiliser welfare', reward: 3000 }
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

    // Première victoire
    if (!user.achievements.includes('FIRST_WIN') && user.totalWon > 0) {
      user.achievements.push('FIRST_WIN');
      user.balance += this.achievements.FIRST_WIN.reward;
      newAchievements.push('FIRST_WIN');
    }

    // Millionnaire
    if (!user.achievements.includes('MILLIONAIRE') && user.balance >= 100000) {
      user.achievements.push('MILLIONAIRE');
      user.balance += this.achievements.MILLIONAIRE.reward;
      newAchievements.push('MILLIONAIRE');
    }

    // Vétéran
    if (!user.achievements.includes('VETERAN') && user.gamesPlayed >= 100) {
      user.achievements.push('VETERAN');
      user.balance += this.achievements.VETERAN.reward;
      newAchievements.push('VETERAN');
    }

    // Série chanceuse
    if (!user.achievements.includes('LUCKY_STREAK') && user.currentStreak >= 5) {
      user.achievements.push('LUCKY_STREAK');
      user.balance += this.achievements.LUCKY_STREAK.reward;
      newAchievements.push('LUCKY_STREAK');
    }

    // Joueur complet
    const allGames = ['crash', 'dice', 'blackjack', 'roulette'];
    const playedGames = Object.keys(user.gamesPlayedByType || {});
    if (!user.achievements.includes('ALL_GAMES') && 
        allGames.every(game => playedGames.includes(game))) {
      user.achievements.push('ALL_GAMES');
      user.balance += this.achievements.ALL_GAMES.reward;
      newAchievements.push('ALL_GAMES');
    }

    // Plus jamais broke
    if (!user.achievements.includes('BROKE_NO_MORE') && 
        user.balance >= 50000 && 
        !user.hasUsedWelfare) {
      user.achievements.push('BROKE_NO_MORE');
      user.balance += this.achievements.BROKE_NO_MORE.reward;
      newAchievements.push('BROKE_NO_MORE');
    }

    // Maître du crash
    if (!user.achievements.includes('CRASH_MASTER') && user.highestCashout >= 10) {
      user.achievements.push('CRASH_MASTER');
      user.balance += this.achievements.CRASH_MASTER.reward;
      newAchievements.push('CRASH_MASTER');
    }

    if (newAchievements.length > 0) {
      this.saveData();
    }

    return newAchievements;
  }

  addMoney(userId, amount) {
    const user = this.getUser(userId);
    user.balance += amount;
    user.totalWon += amount;
    this.updateRank(userId);
    this.saveData();
    return user.balance;
  }

  removeMoney(userId, amount) {
    const user = this.getUser(userId);
    if (user.balance < amount) return false;
    user.balance -= amount;
    user.totalLost += amount;
    this.saveData();
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
    
    if (won) {
      user.totalWon += amount;
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else {
      user.totalLost += amount;
      user.currentStreak = 0;
    }
    
    // Calcul winrate
    const totalGames = user.gamesPlayed;
    const wins = Math.round((user.totalWon / (user.totalWon + user.totalLost)) * totalGames);
    user.winRate = ((wins / totalGames) * 100).toFixed(1);
    
    this.saveData();
    
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
    this.saveData();
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
}

module.exports = new EconomySystem();