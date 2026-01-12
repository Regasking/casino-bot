const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Récupère ton bonus quotidien'),
  
  async execute(interaction) {
    const result = economy.dailyBonus(interaction.user.id);
    
    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎁 BONUS QUOTIDIEN')
        .setDescription(`**+${result.amount}** ${economy.currency}`)
        .setThumbnail('https://em-content.zobj.net/thumbs/160/google/350/gift_1f381.png')
        .setFooter({ text: '💡 Reviens demain pour un nouveau bonus !' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      const hours = Math.floor(result.timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((result.timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ BONUS DÉJÀ RÉCLAMÉ')
        .setDescription(`Reviens dans **${hours}h ${minutes}m**`)
        .setFooter({ text: '⏳ Patience...' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};