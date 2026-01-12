let crashHistory = [];

// Fonction pour mettre à jour l'historique
function updateCrashHistory(crashPoint) {
  crashHistory.unshift(crashPoint); // Ajoute au début
  if (crashHistory.length > 10) {
    crashHistory.pop(); // Garde seulement 10
  }
}
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economy = require('../systems/economy');
const ai = require('../systems/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('Joue au Crash Game')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à miser (min 50)')
        .setRequired(true)
        .setMinValue(50)
    ),
  
  async execute(interaction, activeGames) {

    const bet = interaction.options.getInteger('mise');
    const userId = interaction.user.id;
    const user = economy.getUser(userId);

    // Vérifications
    if (activeGames.has(userId)) {
      return interaction.editReply({ content: '❌ Tu as déjà une partie en cours !' });
    }

    if (user.balance < bet) {
      return interaction.editReply({ content: `❌ Balance insuffisante ! Tu as **${user.balance}** ${economy.currency}` });
    }

    if (bet > user.balance * 0.5) {
      const aiComment = await ai.getTrashTalk('allin', { amount: bet, balance: user.balance });
      await interaction.editReply({ content: `🎲 ${aiComment}` });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Retirer la mise
    economy.removeMoney(userId, bet);

    // Initialiser la partie
    const game = {
      bet,
      multiplier: 1.00,
      crashed: false,
      crashPoint: generateCrashPoint(),
      cashedOut: false,
      startTime: Date.now()
    };

    activeGames.set(userId, game);

    // Bouton Cash Out
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`cashout_${userId}`)
          .setLabel('💰 CASH OUT')
          .setStyle(ButtonStyle.Success)
      );

    const embed = createGameEmbed(game, bet, user.balance);
    const message = await interaction.editReply({ embeds: [embed], components: [row], fetchReply: true });

    // Démarrer le jeu
    startGame(message, userId, game, activeGames);
  }
};

// Générer le point de crash (entre 1.01x et 50x)
function generateCrashPoint() {
  const random = Math.random();
  
  if (random < 0.33) return 1.00 + Math.random() * 0.5;
  if (random < 0.60) return 1.50 + Math.random() * 1.0;
  if (random < 0.80) return 2.50 + Math.random() * 2.5;
  if (random < 0.95) return 5.00 + Math.random() * 10;
  return 15.00 + Math.random() * 35;
}

// Démarrer la partie
async function startGame(message, userId, game, activeGames) {
  const interval = setInterval(async () => {
    if (!activeGames.has(userId)) {
      clearInterval(interval);
      return;
    }

    // Vérifier IMMÉDIATEMENT si cashedOut (prioritaire)
    if (game.cashedOut) {
      clearInterval(interval);
      return;
    }

    // Incrément du multiplicateur
    const elapsed = (Date.now() - game.startTime) / 1000;
    game.multiplier = 1.00 + (elapsed * 0.3); // RÉDUIT de 0.5 à 0.3 (monte moins vite)

    // Vérifier si crash
    if (game.multiplier >= game.crashPoint && !game.crashed) {
      game.crashed = true;
      clearInterval(interval);
      await handleCrash(message, userId, game, activeGames);
      return;
    }

    // Update embed seulement toutes les 300ms pour réduire la latence
    if (!game.cashedOut && !game.crashed) {
      const user = economy.getUser(userId);
      const embed = createGameEmbed(game, game.bet, user.balance);
      try {
        await message.edit({ embeds: [embed] });
      } catch (error) {
        clearInterval(interval);
        activeGames.delete(userId);
      }
    }
  }, 300); // AUGMENTÉ de 100ms à 300ms

  // Timeout sécurité
  setTimeout(() => {
    if (activeGames.has(userId) && !game.crashed && !game.cashedOut) {
      game.crashed = true;
      clearInterval(interval);
      handleCrash(message, userId, game, activeGames);
    }
  }, 30000);
}

// Gérer le crash
async function handleCrash(message, userId, game, activeGames) {
  const user = economy.getUser(userId);
  
  economy.updateStats(userId, false, game.bet, 'crash');
  // NOUVEAU : Enregistrer dans l'historique
  updateCrashHistory(game.crashPoint);
  
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('💥 CRASH !')
    .setDescription(`Le jeu a crash à **${game.crashPoint.toFixed(2)}x** !`)
    .addFields(
      { name: '💸 Perdu', value: `${game.bet.toLocaleString()} ${economy.currency}`, inline: true },
      { name: '💰 Balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: true }
    )
    .setTimestamp();

  // NOUVEAU : Afficher l'historique
  if (crashHistory.length > 0) {
    const historyText = crashHistory
      .map((point, index) => {
        const emoji = point < 2 ? '🔴' : point < 5 ? '🟡' : '🟢';
        return `${emoji} ${point.toFixed(2)}x`;
      })
      .join(' • ');
    
    embed.addFields({ 
      name: '📊 Derniers crashs', 
      value: historyText, 
      inline: false 
    });
  }

  // Commentaire IA
  let aiComment = '';
  if (user.balance < 100) {
    aiComment = await ai.getTrashTalk('broke', { balance: user.balance });
  } else {
    aiComment = await ai.getTrashTalk('loss', { amount: game.bet, balance: user.balance });
  }

  embed.setFooter({ text: `🤖 ${aiComment}` });

  try {
    await message.edit({ embeds: [embed], components: [] });
  } catch (error) {
    console.error('Erreur update crash:', error);
  }
  
  activeGames.delete(userId);
}

// Export l'historique
module.exports.crashHistory = crashHistory;

// Créer l'embed du jeu
function createGameEmbed(game, bet, balance) {
  const color = game.multiplier < 2 ? '#00FF00' : game.multiplier < 5 ? '#FFD700' : '#FF0000';
  const potentialWin = Math.floor(bet * game.multiplier);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('💥 CRASH GAME')
    .setDescription(`**Multiplicateur : ${game.multiplier.toFixed(2)}x**`)
    .addFields(
      { name: '🎲 Mise', value: `${bet.toLocaleString()} ${economy.currency}`, inline: true },
      { name: '💰 Gain potentiel', value: `${potentialWin.toLocaleString()} ${economy.currency}`, inline: true },
      { name: '💵 Balance', value: `${balance.toLocaleString()} ${economy.currency}`, inline: true }
    )
    .setFooter({ text: '⚠️ Le jeu peut crasher à tout moment !' })
    .setTimestamp();
}