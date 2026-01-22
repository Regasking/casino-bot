const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interest')
    .setDescription('Réclame tes intérêts bancaires (1% par jour si balance ≥ 10k)'),
  
  async execute(interaction) {
    const result = economy.calculateInterest(interaction.user.id);

    if (!result.eligible) {
      if (result.timeLeft) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⏰ INTÉRÊTS DÉJÀ RÉCLAMÉS')
          .setDescription(`Reviens dans **${result.timeLeft.hours}h ${result.timeLeft.minutes}m**`)
          .setFooter({ text: '💡 Les intérêts sont calculés à 1% par jour' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      return interaction.editReply({ 
        content: `❌ ${result.reason}\n\n💡 Tu dois avoir au moins **10,000 coins** pour recevoir des intérêts.` 
      });
    }

    const user = economy.getUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('💳 INTÉRÊTS BANCAIRES')
      .setDescription(`Tu as reçu **${result.amount}** ${economy.currency} d'intérêts !`)
      .addFields(
        { name: '📅 Jours accumulés', value: `${result.days} jour(s)`, inline: true },
        { name: '📈 Taux journalier', value: '1% par jour', inline: true },
        { name: '💰 Intérêts/jour', value: `${result.perDay} ${economy.currency}`, inline: true },
        { name: '💵 Nouvelle balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: false }
      )
      .setFooter({ text: '💡 Reviens demain pour plus d\'intérêts !' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};