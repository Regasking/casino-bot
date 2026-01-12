const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economy = require('../systems/economy');
const ai = require('../systems/ai');

// Stockage des parties en cours (sera géré par index.js)
let activeBlackjackGames = new Map();

// Deck de cartes
const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardValue(card, currentTotal) {
  if (card.value === 'A') {
    return (currentTotal + 11 > 21) ? 1 : 11;
  }
  if (['J', 'Q', 'K'].includes(card.value)) {
    return 10;
  }
  return parseInt(card.value);
}

function calculateHandValue(hand) {
  let total = 0;
  let aces = 0;
  
  for (let card of hand) {
    if (card.value === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value);
    }
  }
  
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  
  return total;
}

function formatHand(hand, hideFirst = false) {
  return hand.map((card, index) => {
    if (hideFirst && index === 0) {
      return '🂠'; // Carte cachée
    }
    return `${card.value}${card.suit}`;
  }).join(' ');
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Joue au Blackjack contre le dealer')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à miser (min 50)')
        .setRequired(true)
        .setMinValue(50)
    ),
  
  async execute(interaction, activeGames) {
    const bet = interaction.options.getInteger('mise');
    const userId = interaction.user.id;
    const user = economy.getUser(userId);

    // Vérifications
    if (activeBlackjackGames.has(userId)) {
      return interaction.editReply({ content: '❌ Tu as déjà une partie de Blackjack en cours !' });
    }

    if (user.balance < bet) {
      return interaction.editReply({ 
        content: `❌ Balance insuffisante ! Tu as **${user.balance}** ${economy.currency}` 
      });
    }

    // Retirer la mise
    economy.removeMoney(userId, bet);

    // Créer le deck et distribuer
    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const game = {
      bet,
      deck,
      playerHand,
      dealerHand,
      gameOver: false,
      playerBusted: false,
      dealerBusted: false
    };

    activeBlackjackGames.set(userId, game);

    // Vérifier Blackjack naturel
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    if (isBlackjack(playerHand)) {
      // Blackjack joueur !
      if (isBlackjack(dealerHand)) {
        // Égalité
        return handleGameEnd(interaction, userId, game, 'push');
      } else {
        // Blackjack gagnant
        return handleGameEnd(interaction, userId, game, 'blackjack');
      }
    }

    // Afficher la partie
    await showGame(interaction, userId, game);
  }
};

async function showGame(interaction, userId, game) {
  const playerValue = calculateHandValue(game.playerHand);
  const dealerVisibleCard = game.dealerHand[1];
  const dealerVisibleValue = getCardValue(dealerVisibleCard, 0);

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🃏 BLACKJACK')
    .addFields(
      { 
        name: '🎰 Dealer', 
        value: `${formatHand(game.dealerHand, true)} (${dealerVisibleValue}+ visible)`, 
        inline: false 
      },
      { 
        name: '👤 Toi', 
        value: `${formatHand(game.playerHand)} (**${playerValue}**)`, 
        inline: false 
      },
      { 
        name: '💰 Mise', 
        value: `${game.bet.toLocaleString()} ${economy.currency}`, 
        inline: true 
      }
    )
    .setTimestamp();

  // Boutons d'action
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_hit_${userId}`)
        .setLabel('🎴 HIT')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bj_stand_${userId}`)
        .setLabel('✋ STAND')
        .setStyle(ButtonStyle.Success)
    );

  // Double Down si possible
  const user = economy.getUser(userId);
  if (game.playerHand.length === 2 && user.balance >= game.bet) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_double_${userId}`)
        .setLabel('💎 DOUBLE DOWN')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameEnd(interaction, userId, game, result) {
  const user = economy.getUser(userId);
  let winAmount = 0;
  let title = '';
  let color = '';
  let aiSituation = '';

  activeBlackjackGames.delete(userId);

  const playerValue = calculateHandValue(game.playerHand);
  const dealerValue = calculateHandValue(game.dealerHand);

  switch (result) {
    case 'blackjack':
      winAmount = Math.floor(game.bet * 2.5); // 2.5x pour blackjack
      economy.addMoney(userId, winAmount);
      const blackjackAch = economy.trackBlackjackNatural(userId); // NOUVEAU
      economy.updateStats(userId, true, winAmount - game.bet, 'blackjack');
      title = '🎉 BLACKJACK !';
      color = '#FFD700';
      aiSituation = 'bigwin';
      // NOUVEAU : Afficher achievement si débloqué
      if (blackjackAch) {
        const ach = economy.achievements[blackjackAch];
        // Ajouter au message plus tard
      }
      break;

    case 'win':
      winAmount = game.bet * 2;
      economy.addMoney(userId, winAmount);
      economy.updateStats(userId, true, game.bet, 'blackjack');
      title = '✅ VICTOIRE !';
      color = '#00FF00';
      aiSituation = 'win';
      break;

    case 'push':
      economy.addMoney(userId, game.bet); // Remboursement
      title = '🤝 ÉGALITÉ !';
      color = '#FFA500';
      winAmount = game.bet;
      break;

    case 'lose':
    case 'bust':
      economy.updateStats(userId, false, game.bet, 'blackjack');
      title = '❌ DÉFAITE !';
      color = '#FF0000';
      aiSituation = user.balance < 100 ? 'broke' : 'loss';
      break;
    case 'lose':
      economy.updateStats(userId, false, game.bet, 'blackjack');
      title = '❌ DÉFAITE !';
      color = '#FF0000';
      aiSituation = user.balance < 100 ? 'broke' : 'loss';
      break;
  }

  const newBalance = economy.getUser(userId).balance;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(
      { name: '🎰 Dealer', value: `${formatHand(game.dealerHand)} (**${dealerValue}**)`, inline: false },
      { name: '👤 Toi', value: `${formatHand(game.playerHand)} (**${playerValue}**)`, inline: false }
    );

  if (result !== 'push') {
    embed.addFields({ 
      name: result === 'lose' || result === 'bust' ? '💸 Perdu' : '💰 Gain', 
      value: result === 'lose' || result === 'bust' 
        ? `-${game.bet.toLocaleString()} ${economy.currency}` 
        : `+${(winAmount - game.bet).toLocaleString()} ${economy.currency}`,
      inline: true 
    });
  }

  embed.addFields({ 
    name: '💵 Balance', 
    value: `${newBalance.toLocaleString()} ${economy.currency}`, 
    inline: true 
  });

  // Commentaire IA
  if (aiSituation) {
    try {
      const aiComment = await ai.getTrashTalk(aiSituation, { 
        amount: result === 'lose' || result === 'bust' ? game.bet : winAmount - game.bet, 
        balance: newBalance 
      });
      embed.setFooter({ text: `🤖 ${aiComment}` });
    } catch (e) {
      // Pas grave si ça échoue
    }
  }

  embed.setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [] });
}

// Exporter pour les boutons
module.exports.activeBlackjackGames = activeBlackjackGames;
module.exports.showGame = showGame;
module.exports.handleGameEnd = handleGameEnd;
module.exports.calculateHandValue = calculateHandValue;
