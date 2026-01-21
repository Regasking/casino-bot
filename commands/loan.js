const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loan')
    .setDescription('Gère les prêts entre joueurs')
    .addSubcommand(subcommand =>
      subcommand
        .setName('request')
        .setDescription('Demande un prêt à un joueur')
        .addUserOption(option =>
          option.setName('prêteur')
            .setDescription('Joueur à qui emprunter')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('montant')
            .setDescription('Montant à emprunter (min 100, max 5000)')
            .setRequired(true)
            .setMinValue(100)
            .setMaxValue(5000)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('repay')
        .setDescription('Rembourse ton prêt actif')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Vérifie ton statut de prêt')
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'request') {
      const borrower = interaction.user;
      const lender = interaction.options.getUser('prêteur');
      const amount = interaction.options.getInteger('montant');

      if (borrower.id === lender.id) {
        return interaction.editReply({ content: '❌ Tu ne peux pas t\'emprunter à toi-même !' });
      }

      if (lender.bot) {
        return interaction.editReply({ content: '❌ Tu ne peux pas emprunter à un bot !' });
      }

      const result = economy.requestLoan(borrower.id, lender.id, amount);

      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.reason}` });
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏦 PRÊT ACCORDÉ')
        .setDescription(`${lender.username} t'a prêté **${result.amount}** ${economy.currency} !`)
        .addFields(
          { name: '💰 Montant reçu', value: `${result.amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts (10%)', value: `${result.interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Total à rembourser', value: `${result.totalDue.toLocaleString()} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: '💡 Utilise /loan repay pour rembourser' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'repay') {
      const result = economy.repayLoan(interaction.user.id);

      if (!result.success) {
        if (result.needed) {
          return interaction.editReply({ 
            content: `❌ ${result.reason}\nTu as : ${result.current} ${economy.currency}\nIl te manque : ${result.needed - result.current} ${economy.currency}` 
          });
        }
        return interaction.editReply({ content: `❌ ${result.reason}` });
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ PRÊT REMBOURSÉ')
        .setDescription('Tu as remboursé ton prêt avec succès !')
        .addFields(
          { name: '💰 Montant initial', value: `${result.amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts payés', value: `${result.interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Total payé', value: `${result.total.toLocaleString()} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: `💵 Nouvelle balance : ${economy.getUser(interaction.user.id).balance} ${economy.currency}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'status') {
      const loan = economy.getLoanStatus(interaction.user.id);

      if (!loan) {
        return interaction.editReply({ content: '✅ Tu n\'as pas de prêt actif !' });
      }

      const lender = await interaction.client.users.fetch(loan.lenderId);
      const timeElapsed = Math.floor((Date.now() - loan.timestamp) / 1000 / 60); // minutes

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🏦 PRÊT ACTIF')
        .setDescription(`Tu dois de l'argent à ${lender.username}`)
        .addFields(
          { name: '💰 Montant emprunté', value: `${loan.amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts', value: `${loan.interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Total à rembourser', value: `${loan.totalDue.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '⏱️ Temps écoulé', value: `${timeElapsed} minutes`, inline: false }
        )
        .setFooter({ text: '💡 Utilise /loan repay pour rembourser' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};
