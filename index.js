require('dotenv').config();
console.log('Token chargé:', process.env.DISCORD_TOKEN ? '✅ OUI' : '❌ NON');
console.log('Longueur token:', process.env.DISCORD_TOKEN?.length || 0);
const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const economy = require('./systems/economy');
const ai = require('./systems/ai');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  rest: {
    timeout: 60000 // 60 secondes
  },
  ws: {
    compress: true // Compression pour connexion lente
  }
});

client.commands = new Collection();

// Stockage des parties Crash en cours
const activeGames = new Map();
const crashHistory = []; // Historique des 10 derniers crashs

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    // Vérifier que la commande est valide
    if (!command || !command.data || !command.data.name) {
      console.error(`❌ Erreur dans ${file}: structure invalide`);
      console.log('Contenu:', command);
      continue;
    }
    client.commands.set(command.data.name, command);
    console.log(`✅ Commande chargée: ${command.data.name}`);
  } catch (error) {
    console.error(`❌ Erreur chargement ${file}:`, error.message);
  }
}

// Event: Bot prêt
client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  
  // Enregistrer les slash commands
  const commands = [];
  client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log('🔄 Enregistrement des slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash commands enregistrées !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
});

  // Event: Nouveau membre
  client.on(Events.GuildMemberAdd, async member => {
    // ID du salon de bienvenue et feedback
    const welcomeChannelId = '1461862002359013396';
    const feedbackChannelId = '1460807691143483637';
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

    if (!welcomeChannel) return;

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎰 Bienvenue ${member.user.username} au Casino !`)
      .setDescription('Prêt à tenter ta chance ? Voici comment commencer :')
      .addFields(
        { 
          name: '💰 Pour démarrer', 
          value: '• Tu reçois **1000 coins** gratuits !\n• Utilise `/daily` chaque jour pour des bonus\n• `/balance` pour voir ton solde', 
          inline: false 
        },
        { 
          name: '🎮 Jeux disponibles', 
          value: '• `/crash` - Multiplicateur qui monte\n• `/dice` - Parie haut ou bas\n• `/blackjack` - Atteins 21\n• `/roulette` - Rouge ou noir', 
          inline: false 
        },
        { 
          name: '🏆 Système', 
          value: '• Gagne des achievements\n• Monte dans les rangs (Bronze → Diamond)\n• `/leaderboard` pour voir le top 10', 
          inline: false 
        },
        { 
          name: '💸 Entre joueurs', 
          value: '• `/transfer` - Envoie des coins\n• `/loan request` - Emprunte (avec intérêts !)\n• `/loan repay` - Rembourse', 
          inline: false 
        },
        { 
          name: '⚠️ BETA TEST', 
          value: `• Le casino est en phase de test\n• Des règles peuvent changer\n• **Partage tes avis dans <#${feedbackChannelId}>**`, 
          inline: false 
        },
        { 
          name: '📖 Aide', 
          value: 'Utilise `/help` pour le guide complet !', 
          inline: false 
        }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: '🎲 Joue responsable et amuse-toi bien !' })
      .setTimestamp();

    try {
      await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    } catch (error) {
      console.error('Erreur envoi bienvenue:', error);
    }
  });

// Event: Interaction (slash commands + boutons)
client.on(Events.InteractionCreate, async interaction => {
  // Gérer les slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      // RÉPONSE IMMÉDIATE (avant tout traitement)
      await interaction.reply({ 
        content: '⏳ Traitement en cours...', 
        ephemeral: false 
      }).catch(() => {});
      // Attendre un peu pour que Discord enregistre la réponse
      await new Promise(resolve => setTimeout(resolve, 500));
      // Exécuter la commande
      await command.execute(interaction, activeGames);
    } catch (error) {
      console.error('Erreur commande:', error);
      try {
        if (interaction.replied) {
          await interaction.editReply({ content: '❌ Une erreur est survenue !' });
        } else {
          await interaction.reply({ content: '❌ Une erreur est survenue !', ephemeral: true });
        }
      } catch (e) {
        console.error('Impossible de répondre:', e);
      }
    }
  }

  // Gérer les boutons
  if (interaction.isButton()) {
    // Bouton Cash Out du Crash
    if (interaction.customId.startsWith('cashout_')) {
      // RÉPONSE IMMÉDIATE
      await interaction.deferUpdate().catch(() => {});
      const userId = interaction.customId.split('_')[1];
      if (interaction.user.id !== userId) {
        return;
      }
      const game = activeGames.get(userId);
      if (!game || game.crashed || game.cashedOut) {
        return;
      }

      // NOUVEAU : Vérifier si on est trop proche du crash
      if (game.multiplier >= game.crashPoint * 0.98) { // 98% du crash point
        // Trop tard, le crash arrive
        game.crashed = true;
        const user = economy.getUser(userId);
        economy.updateStats(userId, false, game.bet);
          economy.updateStats(userId, false, game.bet, 'crash');
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💥 TROP TARD !')
          .setDescription(`Le jeu a crash à **${game.crashPoint.toFixed(2)}x** pendant ton clic !`)
          .addFields(
            { name: '💸 Perdu', value: `${game.bet.toLocaleString()} ${economy.currency}`, inline: true },
            { name: '💰 Balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: true }
          )
          .setFooter({ text: '⚠️ Connexion trop lente, essaie de cash out plus tôt !' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed], components: [] });
        activeGames.delete(userId);
        return;
      }

      // Cash out réussi (reste du code identique)
      game.cashedOut = true;
      const winAmount = Math.floor(game.bet * game.multiplier);
      const profit = winAmount - game.bet;
      economy.addMoney(userId, winAmount);
      economy.updateStats(userId, true, profit, 'crash');
      const user = economy.getUser(userId);
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ CASH OUT RÉUSSI !')
        .setDescription(`Tu as cashoué à **${game.multiplier.toFixed(2)}x** !`)
        .addFields(
          { name: '🎲 Mise', value: `${game.bet.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💰 Gain', value: `${winAmount.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '📈 Profit', value: `+${profit.toLocaleString()} ${economy.currency}`, inline: true },
          { name: '💵 Nouvelle balance', value: `${user.balance.toLocaleString()} ${economy.currency}`, inline: true }
        )
        .setTimestamp();
      // Commentaire IA
      let aiComment = '';
      try {
        if (profit > game.bet * 3) {
          aiComment = await ai.getTrashTalk('bigwin', { amount: profit, balance: user.balance });
        } else {
          aiComment = await ai.getTrashTalk('win', { amount: profit, balance: user.balance });
        }
        embed.setFooter({ text: `🤖 ${aiComment}` });
      } catch (e) {
        console.error('Erreur IA:', e);
      }
      try {
        await interaction.editReply({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('Erreur edit:', e);
      }
      activeGames.delete(userId);
    }
      // Boutons Blackjack
      if (interaction.customId.startsWith('bj_')) {
        await interaction.deferUpdate().catch(() => {});

        const [action, cmd, userId] = interaction.customId.split('_');

        if (interaction.user.id !== userId) {
          return;
        }

        const blackjack = require('./commands/blackjack');
        const game = blackjack.activeBlackjackGames.get(userId);

        if (!game || game.gameOver) {
          return;
        }

        if (cmd === 'hit') {
          // Tirer une carte
          const newCard = game.deck.pop();
          game.playerHand.push(newCard);
          const playerValue = blackjack.calculateHandValue(game.playerHand);

          if (playerValue > 21) {
            // Bust
            game.gameOver = true;
            game.playerBusted = true;
            await blackjack.handleGameEnd(interaction, userId, game, 'bust');
          } else if (playerValue === 21) {
            // Automatiquement stand à 21
            await dealerPlay(interaction, userId, game, blackjack);
          } else {
            // Continuer
            await blackjack.showGame(interaction, userId, game);
          }
        } else if (cmd === 'stand') {
          // Tour du dealer
          await dealerPlay(interaction, userId, game, blackjack);
        } else if (cmd === 'double') {
          // Double down
          const economy = require('./systems/economy');
          const user = economy.getUser(userId);
          if (user.balance >= game.bet) {
            economy.removeMoney(userId, game.bet);
            game.bet *= 2;

            const newCard = game.deck.pop();
            game.playerHand.push(newCard);
            const playerValue = blackjack.calculateHandValue(game.playerHand);

            if (playerValue > 21) {
              game.gameOver = true;
              game.playerBusted = true;
              await blackjack.handleGameEnd(interaction, userId, game, 'bust');
            } else {
              await dealerPlay(interaction, userId, game, blackjack);
            }
          }
        }
      }

      // Fonction pour le jeu du dealer
      async function dealerPlay(interaction, userId, game, blackjack) {
        game.gameOver = true;

        // Dealer tire jusqu'à 17+
        while (blackjack.calculateHandValue(game.dealerHand) < 17) {
          game.dealerHand.push(game.deck.pop());
        }

        const playerValue = blackjack.calculateHandValue(game.playerHand);
        const dealerValue = blackjack.calculateHandValue(game.dealerHand);

        let result;
        if (dealerValue > 21) {
          result = 'win'; // Dealer bust
        } else if (playerValue > dealerValue) {
          result = 'win';
        } else if (playerValue < dealerValue) {
          result = 'lose';
        } else {
          result = 'push';
        }

        await blackjack.handleGameEnd(interaction, userId, game, result);
      }
  }
});

client.login(process.env.DISCORD_TOKEN);

// Export pour partager activeGames

module.exports = { client, activeGames };
