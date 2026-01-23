const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare tes stats avec un autre joueur')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Joueur à comparer')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const user1 = interaction.user;
    const user2 = interaction.options.getUser('joueur');

    if (user1.id === user2.id) {
      return interaction.editReply({ content: '❌ Tu ne peux pas te comparer à toi-même !' });
    }

    if (user2.bot) {
      return interaction.editReply({ content: '❌ Tu ne peux pas te comparer à un bot !' });
    }

    const data1 = economy.getUser(user1.id);
    const data2 = economy.getUser(user2.id);

    // Calculer qui est meilleur dans quoi
    const comparisons = {
      balance: data1.balance > data2.balance ? user1 : user2,
      winrate: parseFloat(data1.winRate || 0) > parseFloat(data2.winRate || 0) ? user1 : user2,
      games: data1.gamesPlayed > data2.gamesPlayed ? user1 : user2,
      achievements: (data1.achievements?.length || 0) > (data2.achievements?.length || 0) ? user1 : user2,
      totalWon: data1.totalWon > data2.totalWon ? user1 : user2,
      streak: (data1.bestWinStreak || 0) > (data2.bestWinStreak || 0) ? user1 : user2
    };

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚔️ COMPARAISON')
      .setDescription(`${user1.username} **VS** ${user2.username}`)
      .addFields(
        {
          name: '💰 Balance',
          value: `${user1.username}: **${data1.balance.toLocaleString()}** ${economy.currency}\n${user2.username}: **${data2.balance.toLocaleString()}** ${economy.currency}\n${comparisons.balance.username === user1.username ? '👑' : '👑'} ${comparisons.balance.username}`,
          inline: true
        },
        {
          name: '🎯 Winrate',
          value: `${user1.username}: **${data1.winRate}%**\n${user2.username}: **${data2.winRate}%**\n${comparisons.winrate.username === user1.username ? '👑' : '👑'} ${comparisons.winrate.username}`,
          inline: true
        },
        {
          name: '🎮 Parties',
          value: `${user1.username}: **${data1.gamesPlayed}**\n${user2.username}: **${data2.gamesPlayed}**\n${comparisons.games.username === user1.username ? '👑' : '👑'} ${comparisons.games.username}`,
          inline: true
        },
        {
          name: '🏆 Achievements',
          value: `${user1.username}: **${data1.achievements?.length || 0}**\n${user2.username}: **${data2.achievements?.length || 0}**\n${comparisons.achievements.username === user1.username ? '👑' : '👑'} ${comparisons.achievements.username}`,
          inline: true
        },
        {
          name: '📈 Total gagné',
          value: `${user1.username}: **${data1.totalWon.toLocaleString()}** ${economy.currency}\n${user2.username}: **${data2.totalWon.toLocaleString()}** ${economy.currency}\n${comparisons.totalWon.username === user1.username ? '👑' : '👑'} ${comparisons.totalWon.username}`,
          inline: true
        },
        {
          name: '🔥 Meilleure série',
          value: `${user1.username}: **${data1.bestWinStreak || 0}** victoires\n${user2.username}: **${data2.bestWinStreak || 0}** victoires\n${comparisons.streak.username === user1.username ? '👑' : '👑'} ${comparisons.streak.username}`,
          inline: true
        }
      )
      .setTimestamp();

    // Calculer score global (qui domine globalement)
    const score1 = Object.values(comparisons).filter(winner => winner.id === user1.id).length;
    const score2 = Object.values(comparisons).filter(winner => winner.id === user2.id).length;

    let verdict = '';
    if (score1 > score2) {
      verdict = `🏆 **${user1.username}** domine avec ${score1}/6 catégories !`;
    } else if (score2 > score1) {
      verdict = `🏆 **${user2.username}** domine avec ${score2}/6 catégories !`;
    } else {
      verdict = `🤝 **Égalité parfaite !** ${score1}-${score2}`;
    }

    embed.setFooter({ text: verdict });

    await interaction.editReply({ embeds: [embed] });
  }
};s