const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsPath = path.join(__dirname, '../data/logs.json');
    this.logs = this.loadLogs();
    this.suspiciousActivities = [];
  }

  loadLogs() {
    try {
      if (!fs.existsSync(this.logsPath)) {
        fs.mkdirSync(path.dirname(this.logsPath), { recursive: true });
        fs.writeFileSync(this.logsPath, JSON.stringify({ transactions: [], suspicious: [] }, null, 2));
        return { transactions: [], suspicious: [] };
      }
      return JSON.parse(fs.readFileSync(this.logsPath, 'utf8'));
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      return { transactions: [], suspicious: [] };
    }
  }

  saveLogs() {
    try {
      // Garder seulement les 1000 dernières transactions
      if (this.logs.transactions.length > 1000) {
        this.logs.transactions = this.logs.transactions.slice(-1000);
      }
      // Garder toutes les activités suspectes
      fs.writeFileSync(this.logsPath, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde logs:', error);
    }
  }

  // Log une transaction normale
  logTransaction(userId, type, amount, details = {}) {
    const entry = {
      userId,
      type, // 'game_win', 'game_loss', 'transfer', 'loan', 'daily', 'welfare'
      amount,
      details,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    this.logs.transactions.push(entry);
    this.saveLogs();

    // Vérifier si suspect
    this.checkSuspicious(userId, type, amount, details);
  }

  // Vérifier activité suspecte
  checkSuspicious(userId, type, amount, details) {
    const flags = [];

    // FLAG 1: Grosse transaction (>10k)
    if (amount >= 10000) {
      flags.push('LARGE_AMOUNT');
    }

    // FLAG 2: Winstreak anormal
    if (type === 'game_win') {
      const recentWins = this.logs.transactions
        .filter(t => t.userId === userId && t.type === 'game_win')
        .slice(-10);
      
      if (recentWins.length === 10) {
        flags.push('SUSPICIOUS_WINSTREAK');
      }
    }

    // FLAG 3: Balance qui explose
    if (details.newBalance && details.oldBalance) {
      const ratio = details.newBalance / details.oldBalance;
      if (ratio > 10 && details.oldBalance > 1000) {
        flags.push('BALANCE_SPIKE');
      }
    }

    // FLAG 4: Transfers circulaires
    if (type === 'transfer' && details.recipientId) {
      const recentTransfers = this.logs.transactions
        .filter(t => t.type === 'transfer' && t.timestamp > Date.now() - 3600000); // 1h
      
      const circular = recentTransfers.find(t => 
        t.userId === details.recipientId && t.details.recipientId === userId
      );
      
      if (circular) {
        flags.push('CIRCULAR_TRANSFER');
      }
    }

    // Si flags détectés, logger comme suspect
    if (flags.length > 0) {
      this.logSuspicious(userId, type, amount, flags, details);
    }
  }

  // Logger activité suspecte
  logSuspicious(userId, type, amount, flags, details) {
    const entry = {
      userId,
      type,
      amount,
      flags,
      details,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      reviewed: false
    };

    this.logs.suspicious.push(entry);
    this.saveLogs();

    console.log(`⚠️ ACTIVITÉ SUSPECTE: User ${userId} - ${flags.join(', ')}`);
  }

  // Récupérer les activités suspectes non reviewées
  getSuspiciousActivities(limit = 20) {
    return this.logs.suspicious
      .filter(s => !s.reviewed)
      .slice(-limit)
      .reverse();
  }

  // Marquer comme reviewé
  markReviewed(index) {
    if (this.logs.suspicious[index]) {
      this.logs.suspicious[index].reviewed = true;
      this.saveLogs();
    }
  }

  // Récupérer l'historique d'un joueur
  getUserHistory(userId, limit = 50) {
    return this.logs.transactions
      .filter(t => t.userId === userId)
      .slice(-limit)
      .reverse();
  }

  // Stats globales
  getGlobalStats() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recent = this.logs.transactions.filter(t => t.timestamp > last24h);

    return {
      totalTransactions: this.logs.transactions.length,
      last24h: recent.length,
      suspiciousUnreviewed: this.logs.suspicious.filter(s => !s.reviewed).length,
      totalSuspicious: this.logs.suspicious.length
    };
  }
}

module.exports = new Logger();