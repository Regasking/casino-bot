const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('Affiche tes achievements débloqués'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId);
    const userAchievements = user.achievements || [];

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 Achievements de ${interaction.user.username}`)
      .setDescription(`**${userAchievements.length}/${Object.keys(economy.achievements).length}** débloqués`)
      .setTimestamp();

    // Achievements débloqués
    const unlockedText = userAchievements.length > 0
      ? userAchievements.map(id => {
          const ach = economy.achievements[id];
          return `${ach.name}\n*${ach.description}* - Récompense: ${ach.reward} ${economy.currency}`;
        }).join('\n\n')
      : 'Aucun achievement débloqué pour le moment !';

    embed.addFields({ 
      name: '✅ Débloqués', 
      value: unlockedText.substring(0, 1024), 
      inline: false 
    });

    // Achievements verrouillés (quelques exemples)
    const locked = Object.entries(economy.achievements)
      .filter(([id]) => !userAchievements.includes(id))
      .slice(0, 3)
      .map(([id, ach]) => `🔒 ${ach.name}\n*${ach.description}*`)
      .join('\n\n');

    if (locked) {
      embed.addFields({ 
        name: '🔒 À débloquer', 
        value: locked, 
        inline: false 
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
