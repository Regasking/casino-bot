const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../systems/logger');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Affiche ton historique de transactions')
    .addIntegerOption(option =>
      option.setName('limite')
        .setDescription('Nombre de transactions à afficher (max 20)')
        .setMinValue(5)
        .setMaxValue(20)
    ),
  
  async execute(interaction) {
    const limit = interaction.options.getInteger('limite') || 15;
    const history = logger.getUserHistory(interaction.user.id, limit);

    if (history.length === 0) {
      return interaction.editReply({ content: '📝 Aucune transaction dans ton historique !' });
    }

    const user = economy.getUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('📜 TON HISTORIQUE')
      .setDescription(`Balance actuelle: **${user.balance.toLocaleString()}** ${economy.currency}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    const typeIcons = {
      'game_win': '✅',
      'game_loss': '❌',
      'transfer': '💸',
      'loan_received': '🏦➕',
      'loan_repaid': '🏦➖',
      'daily': '🎁',
      'welfare': '🆘',
      'interest': '💳',
      'insurance_buy': '🛡️',
      'insurance_claim': '🆘🛡️',
      'credit': '➕',
      'debit': '➖',
      'admin_edit': '👑'
    };

    const typeNames = {
      'game_win': 'Victoire',
      'game_loss': 'Défaite',
      'transfer': 'Transfert',
      'loan_received': 'Prêt reçu',
      'loan_repaid': 'Prêt remboursé',
      'daily': 'Bonus quotidien',
      'welfare': 'Aide d\'urgence',
      'interest': 'Intérêts bancaires',
      'insurance_buy': 'Assurance achetée',
      'insurance_claim': 'Assurance déclenchée',
      'credit': 'Crédit',
      'debit': 'Débit',
      'admin_edit': 'Modification admin'
    };

    const transactionText = history.map(t => {
      const icon = typeIcons[t.type] || '📝';
      const name = typeNames[t.type] || t.type;
      const amount = t.amount >= 0 ? `+${t.amount}` : t.amount;
      const game = t.details?.gameType ? ` (${t.details.gameType})` : '';
      
      return `${icon} **${name}**${game}: ${amount} ${economy.currency} • <t:${Math.floor(t.timestamp / 1000)}:R>`;
    }).join('\n');

    embed.addFields({
      name: `📊 Dernières ${history.length} transactions`,
      value: transactionText,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });
  }
};