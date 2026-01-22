const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../systems/logger');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Commandes administrateur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('suspicious')
        .setDescription('Voir les activités suspectes')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('Historique d\'un joueur')
        .addUserOption(option =>
          option.setName('joueur')
            .setDescription('Joueur à vérifier')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Statistiques globales du système')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setbalance')
        .setDescription('Modifier la balance d\'un joueur')
        .addUserOption(option =>
          option.setName('joueur')
            .setDescription('Joueur à modifier')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('montant')
            .setDescription('Nouveau montant')
            .setRequired(true)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'suspicious') {
      const suspicious = logger.getSuspiciousActivities(10);

      if (suspicious.length === 0) {
        return interaction.editReply({ content: '✅ Aucune activité suspecte détectée !' });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ ACTIVITÉS SUSPECTES')
        .setDescription(`${suspicious.length} activités non reviewées`)
        .setTimestamp();

      suspicious.forEach((s, index) => {
        const user = `<@${s.userId}>`;
        const flags = s.flags.map(f => {
          switch(f) {
            case 'LARGE_AMOUNT': return '💰 Grosse transaction';
            case 'SUSPICIOUS_WINSTREAK': return '🎰 Winstreak anormal';
            case 'BALANCE_SPIKE': return '📈 Balance qui explose';
            case 'CIRCULAR_TRANSFER': return '🔄 Transfer circulaire';
            default: return f;
          }
        }).join(', ');

        embed.addFields({
          name: `#${index + 1} - ${user}`,
          value: `**Type:** ${s.type}\n**Montant:** ${s.amount} 🪙\n**Flags:** ${flags}\n**Date:** <t:${Math.floor(s.timestamp / 1000)}:R>`,
          inline: false
        });
      });

      embed.setFooter({ text: '💡 Utilise /admin history pour voir le détail' });

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'history') {
      const target = interaction.options.getUser('joueur');
      const history = logger.getUserHistory(target.id, 20);

      if (history.length === 0) {
        return interaction.editReply({ content: `❌ Aucun historique pour ${target.username}` });
      }

      const user = economy.getUser(target.id);

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`📜 Historique de ${target.username}`)
        .setDescription(`Balance actuelle: **${user.balance}** 🪙`)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      const transactionText = history.slice(0, 15).map(t => {
        const icon = {
          'game_win': '✅',
          'game_loss': '❌',
          'transfer': '💸',
          'loan': '🏦',
          'daily': '🎁',
          'welfare': '🆘',
          'credit': '➕',
          'debit': '➖'
        }[t.type] || '📝';

        return `${icon} **${t.type}** - ${t.amount > 0 ? '+' : ''}${t.amount} 🪙 (<t:${Math.floor(t.timestamp / 1000)}:R>)`;
      }).join('\n');

      embed.addFields({
        name: '📊 Dernières transactions',
        value: transactionText || 'Aucune',
        inline: false
      });

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'stats') {
      const stats = logger.getGlobalStats();

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📊 STATISTIQUES SYSTÈME')
        .addFields(
          { name: '📝 Transactions totales', value: stats.totalTransactions.toString(), inline: true },
          { name: '🕐 Dernières 24h', value: stats.last24h.toString(), inline: true },
          { name: '⚠️ Activités suspectes', value: `${stats.suspiciousUnreviewed} non reviewées\n${stats.totalSuspicious} au total`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'setbalance') {
      const target = interaction.options.getUser('joueur');
      const amount = interaction.options.getInteger('montant');

      const user = economy.getUser(target.id);
      const oldBalance = user.balance;
      user.balance = amount;
      economy.updateRank(target.id);
      economy.saveData();

      logger.logTransaction(target.id, 'admin_edit', amount - oldBalance, {
        adminId: interaction.user.id,
        oldBalance,
        newBalance: amount
      });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('✅ BALANCE MODIFIÉE')
        .setDescription(`Balance de **${target.username}** modifiée par admin`)
        .addFields(
          { name: 'Ancienne balance', value: `${oldBalance} 🪙`, inline: true },
          { name: 'Nouvelle balance', value: `${amount} 🪙`, inline: true }
        )
        .setFooter({ text: `Admin: ${interaction.user.username}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};