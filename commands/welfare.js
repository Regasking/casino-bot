const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welfare')
    .setDescription('Reçois 500 coins gratuits si tu es broke (balance < 100)'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const result = economy.welfare(userId);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🆘 AIDE D\'URGENCE')
        .setDescription(`Tu as reçu **${result.amount}** ${economy.currency} !`)
        .addFields(
          { name: '💵 Nouvelle balance', value: `${result.amount} ${economy.currency}`, inline: true }
        )
        .setFooter({ text: '💡 Utilise cette chance à bon escient !' })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Aide non disponible')
        .setDescription(result.reason)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
