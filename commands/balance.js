const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Affiche ton solde'),
  
  async execute(interaction) {
    const user = economy.getUser(interaction.user.id);
    
    // Couleur selon le rang
    const rankColors = {
      '🥉 Bronze': '#CD7F32',
      '🥈 Silver': '#C0C0C0',
      '⭐ Gold': '#FFD700',
      '🏆 Platinum': '#E5E4E2',
      '💎 Diamond': '#B9F2FF'
    };
    
    const embed = new EmbedBuilder()
      .setColor(rankColors[user.rank] || '#FFD700')
      .setAuthor({ 
        name: `${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTitle('💰 Portefeuille')
      .setDescription(`**${user.balance.toLocaleString()}** ${economy.currency}`)
      .addFields(
        { name: '🎖️ Rang', value: user.rank, inline: true },
        { name: '🎮 Parties', value: user.gamesPlayed.toString(), inline: true },
        { name: '📈 Winrate', value: `${user.winRate}%`, inline: true },
        { name: '📊 Total gagné', value: `${user.totalWon.toLocaleString()} ${economy.currency}`, inline: true },
        { name: '📉 Total perdu', value: `${user.totalLost.toLocaleString()} ${economy.currency}`, inline: true },
        { name: '🔥 Série actuelle', value: `${user.currentStreak || 0} victoires`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: `🏆 ${user.achievements?.length || 0} achievements débloqués` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};