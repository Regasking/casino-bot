const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche tes statistiques')
    .addStringOption(option =>
      option.setName('jeu')
        .setDescription('Voir les stats d\'un jeu spécifique')
        .addChoices(
          { name: '💥 Crash', value: 'crash' },
          { name: '🎲 Dice', value: 'dice' },
          { name: '🃏 Blackjack', value: 'blackjack' },
          { name: '🎰 Roulette', value: 'roulette' }
        )
    ),
  
  async execute(interaction) {
    const game = interaction.options.getString('jeu');
    const user = economy.getUser(interaction.user.id);

    if (!game) {
      // Stats générales
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`📊 Stats de ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: '💰 Balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '🎖️ Rang', value: user.rank, inline: true },
          { name: '💳 Credit Score', value: `${economy.getCreditScore(interaction.user.id)}/100`, inline: true },
          { name: '🎮 Parties', value: user.gamesPlayed.toString(), inline: true },
          { name: '🎯 Winrate', value: `${user.winRate}%`, inline: true },
          { name: '🔥 Meilleure série', value: `${user.bestWinStreak || 0} victoires`, inline: true },
          { name: '📈 Total gagné', value: `${user.totalWon.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📉 Total perdu', value: `${user.totalLost.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '🏆 Achievements', value: `${user.achievements?.length || 0}/${Object.keys(economy.achievements).length}`, inline: true }
        )
        .setFooter({ text: '💡 Utilise /stats <jeu> pour voir les stats par jeu' })
        .setTimestamp();

      // Stats par jeu
      const gamesPlayed = user.gamesPlayedByType || {};
      const gameWins = user.gameWins || {};
      
      if (Object.keys(gamesPlayed).length > 0) {
        const gameStats = Object.entries(gamesPlayed)
          .map(([game, count]) => {
            const wins = gameWins[game] || 0;
            const winrate = count > 0 ? ((wins / count) * 100).toFixed(1) : 0;
            const gameEmojis = { crash: '💥', dice: '🎲', blackjack: '🃏', roulette: '🎰' };
            return `${gameEmojis[game] || '🎮'} **${game}**: ${count} parties (${winrate}% winrate)`;
          })
          .join('\n');
        
        embed.addFields({
          name: '🎯 Stats par jeu',
          value: gameStats,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } else {
      // Stats d'un jeu spécifique
      const gamesPlayed = user.gamesPlayedByType?.[game] || 0;
      const wins = user.gameWins?.[game] || 0;
      const losses = gamesPlayed - wins;
      const winrate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;

      if (gamesPlayed === 0) {
        return interaction.editReply({ 
          content: `❌ Tu n'as jamais joué à ${game} !` 
        });
      }

      const gameNames = {
        crash: '💥 CRASH',
        dice: '🎲 DICE',
        blackjack: '🃏 BLACKJACK',
        roulette: '🎰 ROULETTE'
      };

      const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle(`${gameNames[game]} - Stats de ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: '🎮 Parties jouées', value: gamesPlayed.toString(), inline: true },
          { name: '✅ Victoires', value: wins.toString(), inline: true },
          { name: '❌ Défaites', value: losses.toString(), inline: true },
          { name: '🎯 Winrate', value: `${winrate}%`, inline: true }
        )
        .setTimestamp();

      // Stats spécifiques par jeu
      if (game === 'crash') {
        embed.addFields({
          name: '🚀 Meilleur cash-out',
          value: `${(user.highestCashout || 0).toFixed(2)}x`,
          inline: true
        });
      }

      embed.setFooter({ text: '💡 Continue de jouer pour améliorer tes stats !' });

      await interaction.editReply({ embeds: [embed] });
    }
  }
};