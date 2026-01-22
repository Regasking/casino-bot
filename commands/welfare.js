const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welfare')
    .setDescription('Reçois 500 coins gratuits si tu es broke (balance < 100)'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    // Vérifier d'abord l'assurance
    const insurance = economy.checkInsurance(userId);
    if (insurance && insurance.triggered) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛡️ ASSURANCE DÉCLENCHÉE !')
        .setDescription(`Ton assurance t'a sauvé ! Tu as reçu **${insurance.amount}** ${economy.currency}`)
        .addFields(
          { name: '💵 Nouvelle balance', value: `${economy.getUser(userId).balance} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: '💡 Ton assurance a été utilisée' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }
    // Sinon, welfare classique
    const result = economy.welfare(userId);
    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🆘 AIDE D\'URGENCE')
        .setDescription(`Tu as reçu **${result.amount}** ${economy.currency} !`)
        .addFields(
          { name: '💵 Nouvelle balance', value: `${result.amount} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: '💡 Utilise cette chance à bon escient ! Considère /insurance buy' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Aide non disponible')
        .setDescription(result.reason)
        .setFooter({ text: '💡 Astuce: Achète une assurance avec /insurance buy' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
