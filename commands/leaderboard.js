const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche les classements')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de classement')
        .setRequired(false)
        .addChoices(
          { name: '💰 Balance', value: 'balance' },
          { name: '🎯 Winrate', value: 'winrate' },
          { name: '🎮 Parties jouées', value: 'games' },
          { name: '🏆 Achievements', value: 'achievements' }
        )
    )
    .addIntegerOption(option =>
      option.setName('limite')
        .setDescription('Nombre de joueurs à afficher (max 20)')
        .setMinValue(5)
        .setMaxValue(20)
    ),
  
  async execute(interaction) {
    const type = interaction.options.getString('type') || 'balance';
    const limit = interaction.options.getInteger('limite') || 10;

    let leaderboard = [];
    let title = '';
    let color = '';
    let emoji = '';

    const users = Object.entries(economy.users);

    if (users.length === 0) {
      return interaction.editReply({ content: '❌ Aucun joueur dans le classement !' });
    }

    switch (type) {
      case 'balance':
        leaderboard = users
          .sort((a, b) => b[1].balance - a[1].balance)
          .slice(0, limit);
        title = '💰 CLASSEMENT PAR BALANCE';
        color = '#FFD700';
        emoji = '💰';
        break;

      case 'winrate':
        // Filtrer joueurs avec au moins 10 parties
        leaderboard = users
          .filter(([id, user]) => user.gamesPlayed >= 10)
          .sort((a, b) => parseFloat(b[1].winRate || 0) - parseFloat(a[1].winRate || 0))
          .slice(0, limit);
        title = '🎯 CLASSEMENT PAR WINRATE';
        color = '#00FF00';
        emoji = '🎯';
        break;

      case 'games':
        leaderboard = users
          .sort((a, b) => b[1].gamesPlayed - a[1].gamesPlayed)
          .slice(0, limit);
        title = '🎮 CLASSEMENT PAR PARTIES JOUÉES';
        color = '#9B59B6';
        emoji = '🎮';
        break;

      case 'achievements':
        leaderboard = users
          .sort((a, b) => (b[1].achievements?.length || 0) - (a[1].achievements?.length || 0))
          .slice(0, limit);
        title = '🏆 CLASSEMENT PAR ACHIEVEMENTS';
        color = '#E74C3C';
        emoji = '🏆';
        break;
    }

    if (leaderboard.length === 0) {
      return interaction.editReply({ content: '❌ Aucun joueur éligible pour ce classement !' });
    }

    const description = leaderboard.map((entry, index) => {
      const [userId, userData] = entry;
      const medals = ['🥇', '🥈', '🥉'];
      const prefix = medals[index] || `**${index + 1}.**`;
      const user = `<@${userId}>`;
      
      let stat = '';
      switch (type) {
        case 'balance':
          stat = `${userData.balance.toLocaleString()} ${economy.currency}`;
          break;
        case 'winrate':
          stat = `${userData.winRate}% (${userData.gamesPlayed} parties)`;
          break;
        case 'games':
          stat = `${userData.gamesPlayed} parties`;
          break;
        case 'achievements':
          stat = `${userData.achievements?.length || 0} achievements`;
          break;
      }
      
      return `${prefix} ${user}\n${userData.rank} • ${stat}`;
    }).join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `${emoji} ${leaderboard.length} joueurs classés` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};