const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Guide complet du casino'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎰 GUIDE DU CASINO')
      .setDescription('Bienvenue au casino ! Voici tous les jeux disponibles :')
      .addFields(
        {
          name: '💰 COMMANDES ÉCONOMIE',
          value: '`/balance` - Voir ton solde\n`/daily` - Bonus quotidien (500-1000 coins)\n`/welfare` - 500 coins gratuits si broke (<100)\n`/leaderboard` - Top 10 joueurs\n`/stats` - Tes statistiques détaillées\n`/achievements` - Tes achievements débloqués',
          inline: false
        },
        {
          name: '💥 CRASH',
          value: '`/crash <mise>`\nLe multiplicateur monte... cash out avant le crash !\n**Gains:** Mise × Multiplicateur\n**Astuce:** Plus tu attends, plus tu risques !',
          inline: false
        },
        {
          name: '🎲 DICE',
          value: '`/dice <mise> <HAUT/BAS>`\nParie sur un dé de 1-100\n**HAUT:** 51-100 | **BAS:** 1-50\n**Gains:** x2 ta mise',
          inline: false
        },
        {
          name: '🃏 BLACKJACK',
          value: '`/blackjack <mise>`\nAtteins 21 sans dépasser !\n**HIT:** Tirer une carte\n**STAND:** Garder ta main\n**DOUBLE DOWN:** Doubler la mise (1 carte)\n**Gains:** x2 (x2.5 pour Blackjack naturel)',
          inline: false
        },
        {
          name: '🎰 ROULETTE',
          value: '`/roulette <mise> <pari>`\n**Paris x2:** Rouge, Noir, Pair, Impair, 1-18, 19-36\n**Paris x3:** Douzaines (1-12, 13-24, 25-36)\n**Astuce:** Le 0 (vert) fait tout perdre !',
          inline: false
        },
        {
          name: '🏆 SYSTÈME DE RANGS',
          value: '🥉 Bronze: 0-10k\n🥈 Silver: 10k-25k\n⭐ Gold: 25k-50k\n🏆 Platinum: 50k-100k\n💎 Diamond: 100k+',
          inline: false
        },
        {
          name: '🎯 ACHIEVEMENTS',
          value: 'Débloque des achievements en jouant pour gagner des bonus ! Utilise `/achievements` pour voir ta progression.',
          inline: false
        }
      )
      .setFooter({ text: '💡 Mise minimum : 50 coins | Joue responsable !' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};