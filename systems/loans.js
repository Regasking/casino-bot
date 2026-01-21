const fs = require('fs');
const path = require('path');

class LoanSystem {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/loans.json');
    this.pendingLoans = this.loadData();
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
      console.error('Erreur chargement prêts:', error);
      return {};
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.pendingLoans, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde prêts:', error);
    }
  }

  createLoanRequest(borrowerId, lenderId, amount, interest, totalDue) {
    const loanId = `${borrowerId}_${Date.now()}`;
    
    this.pendingLoans[loanId] = {
      borrowerId,
      lenderId,
      amount,
      interest,
      totalDue,
      timestamp: Date.now(),
      status: 'pending' // pending, accepted, refused, expired
    };

    this.saveData();
    return loanId;
  }

  getLoanRequest(loanId) {
    return this.pendingLoans[loanId] || null;
  }

  acceptLoan(loanId) {
    if (this.pendingLoans[loanId]) {
      this.pendingLoans[loanId].status = 'accepted';
      const loan = this.pendingLoans[loanId];
      delete this.pendingLoans[loanId];
      this.saveData();
      return loan;
    }
    return null;
  }

  refuseLoan(loanId) {
    if (this.pendingLoans[loanId]) {
      this.pendingLoans[loanId].status = 'refused';
      delete this.pendingLoans[loanId];
      this.saveData();
      return true;
    }
    return false;
  }

  cleanExpiredLoans() {
    const now = Date.now();
    const timeout = 24 * 60 * 60 * 1000; // 24 heures
    let cleaned = 0;

    Object.keys(this.pendingLoans).forEach(loanId => {
      const loan = this.pendingLoans[loanId];
      if (now - loan.timestamp > timeout) {
        delete this.pendingLoans[loanId];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.saveData();
      console.log(`🧹 ${cleaned} demandes de prêt expirées nettoyées`);
    }
  }
}

module.exports = new LoanSystem();