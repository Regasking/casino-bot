const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('halloffame')
    .setDescription('Hall of Fame - Les légendes du casino'),
  
  async execute(interaction) {
    const users = Object.entries(economy.users);

    if (users.length === 0) {
      return interaction.editReply({ content: '❌ Aucun joueur dans le Hall of Fame !' });
    }

    // Plus riche de tous les temps (balance max atteinte)
    const richest = users.reduce((max, [id, user]) => {
      const maxBalance = Math.max(user.balance, user.totalWon);
      const currentMax = Math.max(max[1].balance, max[1].totalWon);
      return maxBalance > currentMax ? [id, user] : max;
    }, users[0]);

    // Plus gros gains totaux
    const biggestWinner = users.reduce((max, [id, user]) => 
      user.totalWon > max[1].totalWon ? [id, user] : max
    , users[0]);

    // Plus de parties
    const mostActive = users.reduce((max, [id, user]) => 
      user.gamesPlayed > max[1].gamesPlayed ? [id, user] : max
    , users[0]);

    // Plus d'achievements
    const achievementKing = users.reduce((max, [id, user]) => 
      (user.achievements?.length || 0) > (max[1].achievements?.length || 0) ? [id, user] : max
    , users[0]);

    // Meilleur winrate (min 50 parties)
    const eligiblePlayers = users.filter(([id, user]) => user.gamesPlayed >= 50);
    let bestWinrate = null;
    if (eligiblePlayers.length > 0) {
      bestWinrate = eligiblePlayers.reduce((max, [id, user]) => 
        parseFloat(user.winRate || 0) > parseFloat(max[1].winRate || 0) ? [id, user] : max
      , eligiblePlayers[0]);
    }

    // Plus longue série
    const streakKing = users.reduce((max, [id, user]) => 
      (user.bestWinStreak || 0) > (max[1].bestWinStreak || 0) ? [id, user] : max
    , users[0]);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏛️ HALL OF FAME')
      .setDescription('Les légendes du casino')
      .addFields(
        {
          name: '👑 Plus riche de tous les temps',
          value: `<@${richest[0]}>\n**${Math.max(richest[1].balance, richest[1].totalWon).toLocaleString()}** ${economy.currency}`,
          inline: false
        },
        {
          name: '💰 Plus gros gains totaux',
          value: `<@${biggestWinner[0]}>\n**${biggestWinner[1].totalWon.toLocaleString()}** ${economy.currency}`,
          inline: true
        },
        {
          name: '🎮 Plus actif',
          value: `<@${mostActive[0]}>\n**${mostActive[1].gamesPlayed}** parties`,
          inline: true
        },
        {
          name: '🏆 Roi des achievements',
          value: `<@${achievementKing[0]}>\n**${achievementKing[1].achievements?.length || 0}** achievements`,
          inline: true
        }
      )
      .setTimestamp();

    if (bestWinrate) {
      embed.addFields({
        name: '🎯 Meilleur winrate (50+ parties)',
        value: `<@${bestWinrate[0]}>\n**${bestWinrate[1].winRate}%** (${bestWinrate[1].gamesPlayed} parties)`,
        inline: true
      });
    }

    embed.addFields({
      name: '🔥 Plus longue série',
      value: `<@${streakKing[0]}>\n**${streakKing[1].bestWinStreak || 0}** victoires d'affilée`,
      inline: true
    });

    embed.setFooter({ text: '🌟 Ces joueurs ont marqué l\'histoire du casino !' });

    await interaction.editReply({ embeds: [embed] });
  }
};