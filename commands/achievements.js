const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('Affiche tes achievements débloqués')
    .addBooleanOption(option =>
      option.setName('secrets')
        .setDescription('Afficher les achievements secrets débloqués')
    ),
  
  async execute(interaction) {
    const showSecrets = interaction.options.getBoolean('secrets') || false;
    const userId = interaction.user.id;
    const user = economy.getUser(userId);
    const userAchievements = user.achievements || [];

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 Achievements de ${interaction.user.username}`)
      .setTimestamp();

    // Séparer achievements normaux et secrets
    const normalAchievements = Object.entries(economy.achievements)
      .filter(([id, ach]) => !ach.secret);
    
    const secretAchievements = Object.entries(economy.achievements)
      .filter(([id, ach]) => ach.secret);

    const unlockedNormal = normalAchievements.filter(([id]) => userAchievements.includes(id));
    const unlockedSecrets = secretAchievements.filter(([id]) => userAchievements.includes(id));

    embed.setDescription(
      `**${unlockedNormal.length}/${normalAchievements.length}** normaux\n` +
      `**${unlockedSecrets.length}/${secretAchievements.length}** secrets`
    );

    // Achievements normaux débloqués
    if (unlockedNormal.length > 0) {
      const unlockedText = unlockedNormal.map(([id, ach]) => {
        const badge = ach.badge || '';
        return `${badge} **${ach.name}**\n*${ach.description}* - ${ach.reward} ${economy.currency}`;
      }).join('\n\n');

      embed.addFields({ 
        name: '✅ Débloqués', 
        value: unlockedText.substring(0, 1024), 
        inline: false 
      });
    }

    // Achievements secrets débloqués
    if (showSecrets && unlockedSecrets.length > 0) {
      const secretText = unlockedSecrets.map(([id, ach]) => {
        return `🔓 **${ach.name}**\n*${ach.hiddenDescription}* - ${ach.reward} ${economy.currency}`;
      }).join('\n\n');

      embed.addFields({
        name: '🔓 Secrets Débloqués',
        value: secretText.substring(0, 1024),
        inline: false
      });
    }

    // Quelques achievements à débloquer (non-secrets)
    const locked = normalAchievements
      .filter(([id]) => !userAchievements.includes(id))
      .slice(0, 3)
      .map(([id, ach]) => `🔒 **${ach.name}**\n*${ach.description}*`)
      .join('\n\n');

    if (locked) {
      embed.addFields({ 
        name: '🔒 À débloquer', 
        value: locked, 
        inline: false 
      });
    }

    // Hints pour secrets
    if (!showSecrets && secretAchievements.length > 0) {
      embed.addFields({
        name: '❓ Achievements Secrets',
        value: `${secretAchievements.length - unlockedSecrets.length} secrets à découvrir...\nUtilise \`/achievements secrets:true\` pour voir ceux débloqués`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
