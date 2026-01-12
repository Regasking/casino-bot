const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des joueurs'),
  
  async execute(interaction) {
    const leaderboard = economy.getLeaderboard(10);
    
    if (leaderboard.length === 0) {
      return interaction.editReply({ content: '❌ Aucun joueur dans le classement !' });
    }

    const description = leaderboard.map((entry, index) => {
      const medals = ['🥇', '🥈', '🥉'];
      const prefix = medals[index] || `**${entry.position}.**`;
      const user = `<@${entry.userId}>`;
      const balance = `${entry.balance.toLocaleString()} ${economy.currency}`;
      
      return `${prefix} ${user}\n${entry.rank} • ${balance}`;
    }).join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 CLASSEMENT DES JOUEURS')
      .setDescription(description)
      .setFooter({ text: `🎰 ${leaderboard.length} joueurs classés` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};