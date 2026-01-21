const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('records')
    .setDescription('Affiche les records du casino'),
  
  async execute(interaction) {
    const users = Object.entries(economy.users);

    if (users.length === 0) {
      return interaction.editReply({ content: '❌ Aucun record pour le moment !' });
    }

    // Plus gros gain total
    const biggestWinner = users.reduce((max, [id, user]) => 
      user.totalWon > max[1].totalWon ? [id, user] : max
    , users[0]);

    // Plus grosse perte totale
    const biggestLoser = users.reduce((max, [id, user]) => 
      user.totalLost > max[1].totalLost ? [id, user] : max
    , users[0]);

    // Plus haut multiplicateur crash
    const crashKing = users.reduce((max, [id, user]) => 
      (user.highestCashout || 0) > (max[1].highestCashout || 0) ? [id, user] : max
    , users[0]);

    // Plus riche
    const richest = users.reduce((max, [id, user]) => 
      user.balance > max[1].balance ? [id, user] : max
    , users[0]);

    // Plus de parties jouées
    const mostActive = users.reduce((max, [id, user]) => 
      user.gamesPlayed > max[1].gamesPlayed ? [id, user] : max
    , users[0]);

    // Meilleur winrate (min 10 parties)
    const eligiblePlayers = users.filter(([id, user]) => user.gamesPlayed >= 10);
    let bestWinrate = eligiblePlayers.length > 0 
      ? eligiblePlayers.reduce((max, [id, user]) => 
          parseFloat(user.winRate || 0) > parseFloat(max[1].winRate || 0) ? [id, user] : max
        , eligiblePlayers[0])
      : null;

    // Plus longue série de victoires
    const longestStreak = users.reduce((max, [id, user]) => 
      (user.bestStreak || 0) > (max[1].bestStreak || 0) ? [id, user] : max
    , users[0]);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 RECORDS DU CASINO')
      .setDescription('Les champions actuels ! Peux-tu les battre ?')
      .addFields(
        { 
          name: '💰 Plus gros gains totaux', 
          value: `<@${biggestWinner[0]}>
**${biggestWinner[1].totalWon.toLocaleString()}** ${economy.currency} ${biggestWinner[1].totalWon >= 50000 ? '✅' : '🔓'}`, 
          inline: true 
        },
        { 
          name: '💸 Plus grosse perte totale', 
          value: `<@${biggestLoser[0]}>
**${biggestLoser[1].totalLost.toLocaleString()}** ${economy.currency} ${biggestLoser[1].totalLost >= 30000 ? '💀' : '🔓'}`, 
          inline: true 
        },
        { 
          name: '🚀 Plus haut cash out (Crash)', 
          value: `<@${crashKing[0]}>
**${(crashKing[1].highestCashout || 0).toFixed(2)}x** ${(crashKing[1].highestCashout || 0) >= 10 ? '🔥' : '🔓'}`, 
          inline: true 
        },
        { 
          name: '👑 Plus riche', 
          value: `<@${richest[0]}>
**${richest[1].balance.toLocaleString()}** ${economy.currency} ${richest[1].balance >= 100000 ? '💎' : '🔓'}`, 
          inline: true 
        },
        { 
          name: '🎮 Plus actif', 
          value: `<@${mostActive[0]}>
**${mostActive[1].gamesPlayed}** parties ${mostActive[1].gamesPlayed >= 100 ? '⭐' : '🔓'}`, 
          inline: true 
        }
      )
      .setFooter({ text: '🎯 Continue de jouer pour battre ces records ! | ✅ = Record battu | 🔓 = À débloquer' })
      .setTimestamp();

    // Ajouter le meilleur winrate si disponible
    if (bestWinrate) {
      embed.addFields({
        name: '🎯 Meilleur winrate (10+ parties)',
        value: `<@${bestWinrate[0]}>
**${bestWinrate[1].winRate}%** (${bestWinrate[1].gamesPlayed} parties) ${parseFloat(bestWinrate[1].winRate) >= 70 ? '🏆' : '🔓'}`,
        inline: true
      });
    }

    // Records à battre
    const challengesText = [
      `💰 Gagner 50,000+ coins au total ${biggestWinner[1].totalWon >= 50000 ? '✅' : '❌'}`,
      `🚀 Cash out à 10x+ au Crash ${(crashKing[1].highestCashout || 0) >= 10 ? '✅' : '❌'}`,
      `👑 Atteindre 100,000 coins ${richest[1].balance >= 100000 ? '✅' : '❌'}`,
      `🎮 Jouer 100+ parties ${mostActive[1].gamesPlayed >= 100 ? '✅' : '❌'}`,
      `🎯 Winrate 70%+ (10+ parties) ${bestWinrate && parseFloat(bestWinrate[1].winRate) >= 70 ? '✅' : '❌'}`
    ].join('\n');

    embed.addFields({
      name: '📊 Défis Records',
      value: challengesText,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
