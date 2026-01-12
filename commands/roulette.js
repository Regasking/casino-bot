const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const economy = require('../systems/economy');
const ai = require('../systems/ai');

// Types de paris
const BET_TYPES = {
  RED: { name: 'Rouge', multiplier: 2, check: (num) => [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) },
  BLACK: { name: 'Noir', multiplier: 2, check: (num) => [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(num) },
  EVEN: { name: 'Pair', multiplier: 2, check: (num) => num > 0 && num % 2 === 0 },
  ODD: { name: 'Impair', multiplier: 2, check: (num) => num > 0 && num % 2 === 1 },
  LOW: { name: '1-18', multiplier: 2, check: (num) => num >= 1 && num <= 18 },
  HIGH: { name: '19-36', multiplier: 2, check: (num) => num >= 19 && num <= 36 },
  FIRST12: { name: '1ère douzaine (1-12)', multiplier: 3, check: (num) => num >= 1 && num <= 12 },
  SECOND12: { name: '2ème douzaine (13-24)', multiplier: 3, check: (num) => num >= 13 && num <= 24 },
  THIRD12: { name: '3ème douzaine (25-36)', multiplier: 3, check: (num) => num >= 25 && num <= 36 }
};

const activeRouletteGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Joue à la roulette ! Place tes paris')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à miser (min 50)')
        .setRequired(true)
        .setMinValue(50)
    )
    .addStringOption(option =>
      option.setName('pari')
        .setDescription('Type de pari')
        .setRequired(true)
        .addChoices(
          { name: '🔴 Rouge (x2)', value: 'RED' },
          { name: '⚫ Noir (x2)', value: 'BLACK' },
          { name: '➗ Pair (x2)', value: 'EVEN' },
          { name: '🔢 Impair (x2)', value: 'ODD' },
          { name: '⬇️ 1-18 (x2)', value: 'LOW' },
          { name: '⬆️ 19-36 (x2)', value: 'HIGH' },
          { name: '1️⃣ 1ère douzaine (x3)', value: 'FIRST12' },
          { name: '2️⃣ 2ème douzaine (x3)', value: 'SECOND12' },
          { name: '3️⃣ 3ème douzaine (x3)', value: 'THIRD12' }
        )
    ),
  
  async execute(interaction, activeGames) {
    const bet = interaction.options.getInteger('mise');
    const betType = interaction.options.getString('pari');
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

    // Animation de spin
    await interaction.editReply({ 
      content: '🎰 La roulette tourne...' 
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Tirer un numéro (0-36)
    const winningNumber = Math.floor(Math.random() * 37);

    // Déterminer la couleur
    let color = '🟢'; // Vert pour 0
    if (winningNumber > 0) {
      const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      color = redNumbers.includes(winningNumber) ? '🔴' : '⚫';
    }

    // Vérifier si gagné
    const betInfo = BET_TYPES[betType];
    const won = betInfo.check(winningNumber);

    let resultEmbed;

    if (won) {
      // Victoire
      const winAmount = bet * betInfo.multiplier;
      const profit = winAmount - bet;

      economy.addMoney(userId, winAmount);
      economy.updateStats(userId, true, profit, 'roulette');

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
        aiComment = "Belle victoire ! 💰";
      }

      resultEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ VICTOIRE !')
        .setDescription(`🎰 La bille s'arrête sur ${color} **${winningNumber}** !`)
        .addFields(
          { name: '🎯 Ton pari', value: betInfo.name, inline: true },
          { name: '🎰 Résultat', value: `${color} **${winningNumber}**`, inline: true },
          { name: '💰 Gain', value: `+${profit.toLocaleString()} ${economy.currency} (x${betInfo.multiplier})`, inline: true },
          { name: '💵 Nouvelle balance', value: `${newBalance.toLocaleString()} ${economy.currency}`, inline: false }
        )
        .setFooter({ text: `🤖 ${aiComment}` })
        .setTimestamp();

    } else {
      // Défaite
      economy.updateStats(userId, false, bet, 'roulette');
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
        aiComment = "La chance tournera ! 🎲";
      }

      resultEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ DÉFAITE !')
        .setDescription(`🎰 La bille s'arrête sur ${color} **${winningNumber}** !`)
        .addFields(
          { name: '🎯 Ton pari', value: betInfo.name, inline: true },
          { name: '🎰 Résultat', value: `${color} **${winningNumber}**`, inline: true },
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

module.exports.activeRouletteGames = activeRouletteGames;