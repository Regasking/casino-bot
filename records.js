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

    // Plus gros gain
    const biggestWin = users.reduce((max, [id, user]) => 
      user.totalWon > max.totalWon ? user : max
    , users[0][1]);

    // Plus grosse perte
    const biggestLoss = users.reduce((max, [id, user]) => 
      user.totalLost > max.totalLost ? user : max
    , users[0][1]);

    // Plus haut multiplicateur crash
    const highestCashout = users.reduce((max, [id, user]) => 
      (user.highestCashout || 0) > (max.highestCashout || 0) ? user : max
    , users[0][1]);

    // Plus riche
    const richest = users.reduce((max, [id, user]) => 
      user.balance > max.balance ? user : max
    , users[0][1]);

    // Plus de parties jouées
    const mostGames = users.reduce((max, [id, user]) => 
      user.gamesPlayed > max.gamesPlayed ? user : max
    , users[0][1]);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 RECORDS DU CASINO')
      .setDescription('Les meilleurs (et pires) performances !')
      .addFields(
        { 
          name: '💰 Plus gros gains totaux', 
          value: `${biggestWin.totalWon.toLocaleString()} ${economy.currency}`, 
          inline: true 
        },
        { 
          name: '💸 Plus grosse perte totale', 
          value: `${biggestLoss.totalLost.toLocaleString()} ${economy.currency}`, 
          inline: true 
        },
        { 
          name: '🚀 Plus haut cash out (Crash)', 
          value: `${(highestCashout.highestCashout || 0).toFixed(2)}x`, 
          inline: true 
        },
        { 
          name: '👑 Plus riche', 
          value: `${richest.balance.toLocaleString()} ${economy.currency}`, 
          inline: true 
        },
        { 
          name: '🎮 Plus de parties', 
          value: `${mostGames.gamesPlayed} parties`, 
          inline: true 
        }
      )
      .setFooter({ text: '🎯 Continue de jouer pour battre ces records !' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
