const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche tes statistiques détaillées'),
  
  async execute(interaction) {
    const user = economy.getUser(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`📊 Stats de ${interaction.user.username}`)
      .addFields(
        { name: '💰 Balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: true },
        { name: '🎖️ Rang', value: user.rank, inline: true },
        { name: '🎮 Parties', value: user.gamesPlayed.toString(), inline: true },
        { name: '📈 Total gagné', value: `${user.totalWon.toLocaleString()} ${economy.currency}`, inline: true },
        { name: '📉 Total perdu', value: `${user.totalLost.toLocaleString()} ${economy.currency}`, inline: true },
        { name: '🎯 Winrate', value: `${user.winRate}%`, inline: true }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};