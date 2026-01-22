const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../systems/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insurance')
    .setDescription('Gère ton assurance anti-broke')
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('Achète une assurance (500 coins pour 7 jours)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Vérifie ton statut d\'assurance')
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = economy.getUser(interaction.user.id);

    if (subcommand === 'buy') {
      const result = economy.buyInsurance(interaction.user.id, 7);

      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.reason}` });
      }

      const expiresTimestamp = Math.floor(result.expiresAt / 1000);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛡️ ASSURANCE ACHETÉE')
        .setDescription('Tu es maintenant protégé contre le broke !')
        .addFields(
          { name: '💰 Coût', value: `${result.cost} ${economy.currency}`, inline: true },
          { name: '⏱️ Durée', value: `${result.duration} jours`, inline: true },
          { name: '📅 Expire le', value: `<t:${expiresTimestamp}:F>`, inline: false },
          { name: '🆘 Protection', value: 'Si tu tombes à moins de 100 coins, tu recevras automatiquement **1,000 coins** (une seule fois)', inline: false }
        )
        .setFooter({ text: '💡 L\'assurance se déclenche automatiquement' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'status') {
      if (!user.insurance || !user.insurance.active) {
        return interaction.editReply({ 
          content: '❌ Tu n\'as pas d\'assurance active.\n\n💡 Utilise `/insurance buy` pour en acheter une !' 
        });
      }

      const now = Date.now();
      const expiresAt = user.insurance.expiresAt;
      
      if (expiresAt < now) {
        return interaction.editReply({ content: '❌ Ton assurance a expiré !' });
      }

      const timeLeft = expiresAt - now;
      const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
      const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      const expiresTimestamp = Math.floor(expiresAt / 1000);

      const embed = new EmbedBuilder()
        .setColor(user.insurance.used ? '#FFA500' : '#00FF00')
        .setTitle('🛡️ STATUT ASSURANCE')
        .setDescription(user.insurance.used ? '⚠️ Assurance déjà utilisée' : '✅ Assurance active')
        .addFields(
          { name: '⏱️ Temps restant', value: `${daysLeft} jour(s) et ${hoursLeft}h`, inline: true },
          { name: '📅 Expire le', value: `<t:${expiresTimestamp}:R>`, inline: true },
          { name: '🆘 Protection', value: user.insurance.used ? 'Déjà déclenchée' : 'Prête à se déclencher', inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};