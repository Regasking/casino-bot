const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Transfère des coins à un autre joueur')
    .addUserOption(option =>
      option.setName('destinataire')
        .setDescription('Joueur à qui envoyer des coins')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('montant')
        .setDescription('Montant à transférer (min 50, max 10000)')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(10000)
    ),
  
  async execute(interaction) {
    const sender = interaction.user;
    const recipient = interaction.options.getUser('destinataire');
    const amount = interaction.options.getInteger('montant');

    // Vérifications
    if (sender.id === recipient.id) {
      return interaction.editReply({ content: '❌ Tu ne peux pas te transférer des coins à toi-même !' });
    }

    if (recipient.bot) {
      return interaction.editReply({ content: '❌ Tu ne peux pas transférer des coins à un bot !' });
    }

    const senderUser = economy.getUser(sender.id);

    if (senderUser.balance < amount) {
      return interaction.editReply({ 
        content: `❌ Balance insuffisante ! Tu as **${senderUser.balance}** ${economy.currency}` 
      });
    }

    // Effectuer le transfert
    economy.removeMoney(sender.id, amount);
    economy.addMoney(recipient.id, amount);

    // Tracker pour achievement philanthrope
    const senderUser = economy.getUser(sender.id);
    if (!senderUser.totalTransferred) senderUser.totalTransferred = 0;
    senderUser.totalTransferred += amount;
    economy.saveData();
    economy.checkAchievements(sender.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('💸 VIREMENT EFFECTUÉ')
      .setDescription(`**${amount}** ${economy.currency} transférés avec succès !`)
      .addFields(
        { name: '👤 Expéditeur', value: `${sender.username}`, inline: true },
        { name: '👤 Destinataire', value: `${recipient.username}`, inline: true },
        { name: '💰 Montant', value: `${amount.toLocaleString()} ${economy.currency}`, inline: true }
      )
      .setFooter({ text: `💵 Nouvelle balance : ${economy.getUser(sender.id).balance} ${economy.currency}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
