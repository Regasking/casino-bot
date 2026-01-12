const axios = require('axios');
require('dotenv').config();

class AISystem {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.endpoint = 'https://api.mistral.ai/v1/chat/completions';
  }

  async getTrashTalk(situation, playerData) {
    const prompts = {
      win: `Le joueur vient de gagner ${playerData.amount} coins. Son solde est maintenant de ${playerData.balance} coins. Fais un commentaire court et fun (max 50 mots).`,
      loss: `Le joueur vient de perdre ${playerData.amount} coins. Il lui reste ${playerData.balance} coins. Fais un commentaire trash-talk léger et drôle (max 50 mots).`,
      bigwin: `GROS GAIN ! Le joueur a gagné ${playerData.amount} coins d'un coup ! Fais un commentaire impressionné et hype (max 50 mots).`,
      broke: `Le joueur est broke (${playerData.balance} coins). Fais un commentaire moqueur mais encourageant (max 50 mots).`,
      allin: `Le joueur mise ALL-IN (${playerData.amount} coins) ! Commente cette folie (max 50 mots).`
    };

    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'system',
              content: 'Tu es un commentateur de casino drôle et sarcastique. Réponds en français, sois bref et percutant.'
            },
            {
              role: 'user',
              content: prompts[situation] || prompts.win
            }
          ],
          temperature: 0.9,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Erreur API Mistral:', error.message);
      // Fallback messages
      const fallbacks = {
        win: "GG EZ ! 💰",
        loss: "F dans le chat 😂",
        bigwin: "JACKPOT BABY ! 🎰🔥",
        broke: "Rip ton wallet 💀",
        allin: "Téméraire ou stupide ? On va voir... 🎲"
      };
      return fallbacks[situation] || fallbacks.win;
    }
  }
}

module.exports = new AISystem();