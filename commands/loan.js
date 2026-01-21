const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economy = require('../systems/economy');
const loanSystem = require('../systems/loans');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loan')
    .setDescription('Gère les prêts entre joueurs')
    .addSubcommand(subcommand =>
      subcommand
        .setName('request')
        .setDescription('Demande un prêt à un joueur (par message privé)')
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

      // Vérifications
      if (borrower.id === lender.id) {
        return interaction.editReply({ content: '❌ Tu ne peux pas t\'emprunter à toi-même !' });
      }

      if (lender.bot) {
        return interaction.editReply({ content: '❌ Tu ne peux pas emprunter à un bot !' });
      }

      const borrowerUser = economy.getUser(borrower.id);
      const lenderUser = economy.getUser(lender.id);

      // Vérifier si l'emprunteur a déjà un prêt
      if (borrowerUser.activeLoan) {
        return interaction.editReply({ content: '❌ Tu as déjà un prêt actif ! Rembourse-le d\'abord avec `/loan repay`' });
      }

      // Vérifier si le prêteur a assez
      if (lenderUser.balance < amount) {
        return interaction.editReply({ 
          content: `❌ ${lender.username} n'a pas assez de coins !\nIl a : ${lenderUser.balance} ${economy.currency}\nIl manque : ${amount - lenderUser.balance} ${economy.currency}` 
        });
      }

      // Calculer intérêts
      const interest = Math.floor(amount * 0.10);
      const totalDue = amount + interest;

      // Créer la demande persistante
      const loanId = loanSystem.createLoanRequest(borrower.id, lender.id, amount, interest, totalDue);

      // Boutons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`loan_accept_${loanId}`)
            .setLabel('✅ ACCEPTER')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`loan_refuse_${loanId}`)
            .setLabel('❌ REFUSER')
            .setStyle(ButtonStyle.Danger)
        );

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🏦 DEMANDE DE PRÊT PRIVÉE')
        .setDescription(`**${borrower.username}** te demande un prêt confidentiel.`)
        .addFields(
          { name: '💰 Montant demandé', value: `${amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts (10%)', value: `${interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Tu recevras', value: `${totalDue.toLocaleString()} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: '⏱️ Cette demande expire dans 24h | 🔒 Message privé' })
        .setTimestamp();

      // Essayer d'envoyer en DM
      let sentViaDM = false;
      try {
        await lender.send({ 
          content: `📨 Nouvelle demande de prêt de **${borrower.username}** !`,
          embeds: [embed],
          components: [row]
        });
        sentViaDM = true;
        
        await interaction.editReply({ 
          content: `✅ Demande envoyée à **${lender.username}** par **message privé** !\n🔔 Il recevra une notification Discord.\n⏱️ Expire dans 24h.` 
        });
      } catch (error) {
        // DM fermés, envoyer en public (avec avertissement)
        await interaction.editReply({ 
          content: `⚠️ <@${lender.id}>, **${borrower.username}** te demande un prêt !\n*(Tes messages privés sont fermés, demande envoyée ici)*`,
          embeds: [embed],
          components: [row]
        });
        sentViaDM = false;
      }

      // Notifier l'emprunteur
      try {
        await borrower.send({ 
          content: sentViaDM 
            ? `✅ Ta demande de prêt a été envoyée à **${lender.username}** par message privé.\n⏱️ Tu seras notifié de sa réponse (expire dans 24h).`
            : `✅ Ta demande de prêt a été envoyée à **${lender.username}**.\n⚠️ Ses DM sont fermés, la demande a été postée publiquement.`
        });
      } catch (e) {
        // DM fermés pour l'emprunteur aussi
      }

    } else if (subcommand === 'repay') {
      const borrowerUser = economy.getUser(interaction.user.id);

      if (!borrowerUser.activeLoan) {
        return interaction.editReply({ content: '✅ Tu n\'as pas de prêt actif !' });
      }

      const loan = borrowerUser.activeLoan;
      const lender = await interaction.client.users.fetch(loan.lenderId);

      // Vérifier la balance
      if (borrowerUser.balance < loan.totalDue) {
        return interaction.editReply({ 
          content: `❌ Balance insuffisante pour rembourser !\n\n💰 Tu as : **${borrowerUser.balance}** ${economy.currency}\n💸 Il te faut : **${loan.totalDue}** ${economy.currency}\n❗ Il manque : **${loan.totalDue - borrowerUser.balance}** ${economy.currency}` 
        });
      }

      // Rembourser
      const result = economy.repayLoan(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ PRÊT REMBOURSÉ')
        .setDescription(`Tu as remboursé ton prêt à **${lender.username}** !`)
        .addFields(
          { name: '💰 Montant initial', value: `${result.amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts payés', value: `${result.interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Total payé', value: `${result.total.toLocaleString()} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: `💵 Nouvelle balance : ${economy.getUser(interaction.user.id).balance} ${economy.currency}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Notifier le prêteur par DM
      try {
        await lender.send({ 
          content: `💰 **${interaction.user.username}** vient de rembourser son prêt !\n✅ Tu as reçu **${result.total}** ${economy.currency} (incluant ${result.interest} ${economy.currency} d'intérêts)` 
        });
      } catch (e) {
        // DM fermés
      }

    } else if (subcommand === 'status') {
      const loan = economy.getLoanStatus(interaction.user.id);

      if (!loan) {
        return interaction.editReply({ content: '✅ Tu n\'as pas de prêt actif !' });
      }

      const lender = await interaction.client.users.fetch(loan.lenderId);
      const timeElapsed = Math.floor((Date.now() - loan.timestamp) / 1000 / 60);
      const hours = Math.floor(timeElapsed / 60);
      const minutes = timeElapsed % 60;

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🏦 PRÊT ACTIF')
        .setDescription(`Tu dois de l'argent à **${lender.username}**`)
        .addFields(
          { name: '💰 Montant emprunté', value: `${loan.amount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Intérêts (10%)', value: `${loan.interest.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💸 Total à rembourser', value: `${loan.totalDue.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '⏱️ Temps écoulé', value: hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutes`, inline: false },
          { name: '💵 Ta balance actuelle', value: `${economy.getUser(interaction.user.id).balance.toLocaleString()} ${economy.currency}`, inline: false }
        )
        .setFooter({ text: '💡 Utilise /loan repay pour rembourser' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};