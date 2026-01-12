const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economy = require('../systems/economy');
const ai = require('../systems/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Lance le dé ! Parie HAUT (51-100) ou BAS (1-50)')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à miser (min 50)')
        .setRequired(true)
        .setMinValue(50)
    )
    .addStringOption(option =>
      option.setName('pari')
        .setDescription('HAUT (51-100) ou BAS (1-50)')
        .setRequired(true)
        .addChoices(
          { name: '🔼 HAUT (51-100)', value: 'high' },
          { name: '🔽 BAS (1-50)', value: 'low' }
        )
    ),
  
  async execute(interaction, activeGames) {
    const bet = interaction.options.getInteger('mise');
    const choice = interaction.options.getString('pari');
    const userId = interaction.user.id;
    const user = economy.getUser(userId);

    // Vérifications
    if (user.balance < bet) {
      return interaction.editReply({ 
        content: `❌ Balance insuffisante ! Tu as **${user.balance}** ${economy.currency}` 
      });
    }

    // Retirer la mise
    economy.removeMoney(userId, bet);

    // Attendre un peu pour le suspense
    await interaction.editReply({ 
      content: '🎲 Le dé roule...' 
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Lancer le dé
    const roll = Math.floor(Math.random() * 100) + 1; // 1-100

    // Déterminer victoire
    const won = (choice === 'high' && roll >= 51) || (choice === 'low' && roll <= 50);

    let resultEmbed;

    if (won) {
      // Victoire
      const winAmount = bet * 2;
      const profit = bet; // Profit net

      economy.addMoney(userId, winAmount);
      economy.updateStats(userId, true, profit, 'dice');

      const newBalance = economy.getUser(userId).balance;

      // Commentaire IA
      let aiComment = '';
      try {
        if (profit > bet * 5) {
          aiComment = await ai.getTrashTalk('bigwin', { amount: profit, balance: newBalance });
        } else {
          aiComment = await ai.getTrashTalk('win', { amount: profit, balance: newBalance });
        }
      } catch (e) {
        aiComment = "GG ! 💰";
      }

      resultEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ VICTOIRE !')
        .setDescription(`🎲 Le dé est tombé sur **${roll}** !`)
        .addFields(
          { name: '🎯 Ton pari', value: choice === 'high' ? '🔼 HAUT (51-100)' : '🔽 BAS (1-50)', inline: true },
          { name: '🎲 Résultat', value: `**${roll}**`, inline: true },
          { name: '💰 Gain', value: `+${profit.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💵 Nouvelle balance', value: `${newBalance.toLocaleString()} ${economy.currency}`, inline: false }
        )
        .setFooter({ text: `🤖 ${aiComment}` })
        .setTimestamp();

    } else {
      // Défaite
      economy.updateStats(userId, false, bet, 'dice');
      const newBalance = economy.getUser(userId).balance;

      // Commentaire IA
      let aiComment = '';
      try {
        if (newBalance < 100) {
          aiComment = await ai.getTrashTalk('broke', { balance: newBalance });
        } else {
          aiComment = await ai.getTrashTalk('loss', { amount: bet, balance: newBalance });
        }
      } catch (e) {
        aiComment = "Dommage ! 😢";
      }

      resultEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ DÉFAITE !')
        .setDescription(`🎲 Le dé est tombé sur **${roll}** !`)
        .addFields(
          { name: '🎯 Ton pari', value: choice === 'high' ? '🔼 HAUT (51-100)' : '🔽 BAS (1-50)', inline: true },
          { name: '🎲 Résultat', value: `**${roll}**`, inline: true },
          { name: '💸 Perdu', value: `-${bet.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💵 Nouvelle balance', value: `${newBalance.toLocaleString()} ${economy.currency}`, inline: false }
        )
        .setFooter({ text: `🤖 ${aiComment}` })
        .setTimestamp();
    }

    await interaction.editReply({ 
      content: null, 
      embeds: [resultEmbed] 
    });
  }
};