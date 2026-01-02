/**
 * ═══════════════════════════════════════════════════════════
 * 🎮 HANI-MD - Jeux et Divertissements
 * ═══════════════════════════════════════════════════════════
 * Collection de mini-jeux interactifs
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");

// Stockage temporaire des jeux en cours
const activeGames = new Map();

// ═══════════════════════════════════════════════════════════
// 🎲 DEVINER LE NOMBRE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "guess",
    classe: "Games",
    react: "🎲",
    desc: "Devinez un nombre entre 1 et 100",
    alias: ["deviner", "guessnum"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const gameKey = `guess_${chatId}_${auteur_Msg}`;

      // Vérifier si partie en cours
      if (activeGames.has(gameKey)) {
        const game = activeGames.get(gameKey);
        const guess = parseInt(arg[0]);

        if (!guess) {
          return repondre("❌ Entrez un nombre! Ex: .guess 50");
        }

        game.attempts++;

        if (guess === game.number) {
          activeGames.delete(gameKey);
          return repondre(`🎉 *BRAVO!*\n\n✅ Le nombre était bien ${game.number}!\n🎯 Trouvé en ${game.attempts} tentatives!\n\n✨ HANI-MD Games`);
        } else if (guess < game.number) {
          return repondre(`⬆️ C'est plus grand! (Tentative ${game.attempts})`);
        } else {
          return repondre(`⬇️ C'est plus petit! (Tentative ${game.attempts})`);
        }
      }

      // Nouvelle partie
      const number = Math.floor(Math.random() * 100) + 1;
      activeGames.set(gameKey, {
        number,
        attempts: 0,
        startTime: Date.now()
      });

      // Nettoyer après 5 minutes
      setTimeout(() => activeGames.delete(gameKey), 300000);

      repondre(`🎲 *Devinez le nombre!*\n\nJ'ai choisi un nombre entre 1 et 100.\nTapez .guess [nombre] pour deviner!\n\n⏱️ Vous avez 5 minutes.\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[GUESS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❓ QUIZ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "quiz",
    classe: "Games",
    react: "❓",
    desc: "Répondre à des questions de culture générale",
    alias: ["trivia", "question"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const gameKey = `quiz_${chatId}`;

      // Répondre à un quiz en cours
      if (activeGames.has(gameKey) && arg[0]) {
        const game = activeGames.get(gameKey);
        const answer = arg[0].toUpperCase();

        if (!["A", "B", "C", "D"].includes(answer)) {
          return repondre("❌ Répondez par A, B, C ou D");
        }

        const correctIndex = game.correctIndex;
        const correctLetter = ["A", "B", "C", "D"][correctIndex];

        if (answer === correctLetter) {
          activeGames.delete(gameKey);
          return repondre(`✅ *CORRECT!*\n\n🎉 La réponse était bien: ${correctLetter}. ${game.options[correctIndex]}\n\n✨ HANI-MD Games`);
        } else {
          activeGames.delete(gameKey);
          return repondre(`❌ *FAUX!*\n\n📚 La bonne réponse était: ${correctLetter}. ${game.options[correctIndex]}\n\n✨ HANI-MD Games`);
        }
      }

      const questions = [
        {
          question: "Quelle est la capitale de la France?",
          options: ["Londres", "Paris", "Berlin", "Madrid"],
          correct: 1
        },
        {
          question: "Combien y a-t-il de continents?",
          options: ["5", "6", "7", "8"],
          correct: 2
        },
        {
          question: "Qui a peint la Joconde?",
          options: ["Picasso", "Van Gogh", "Michel-Ange", "Léonard de Vinci"],
          correct: 3
        },
        {
          question: "Quel est le plus grand océan?",
          options: ["Atlantique", "Indien", "Pacifique", "Arctique"],
          correct: 2
        },
        {
          question: "En quelle année l'homme a-t-il marché sur la Lune?",
          options: ["1965", "1969", "1972", "1980"],
          correct: 1
        },
        {
          question: "Quelle est la planète la plus proche du Soleil?",
          options: ["Vénus", "Mercure", "Mars", "Terre"],
          correct: 1
        },
        {
          question: "Combien y a-t-il de couleurs dans un arc-en-ciel?",
          options: ["5", "6", "7", "8"],
          correct: 2
        },
        {
          question: "Quel est le symbole chimique de l'or?",
          options: ["Ag", "Au", "Fe", "Cu"],
          correct: 1
        },
        {
          question: "Quelle est la plus longue rivière du monde?",
          options: ["Amazone", "Nil", "Mississippi", "Yangtsé"],
          correct: 1
        },
        {
          question: "Combien de joueurs y a-t-il dans une équipe de football?",
          options: ["9", "10", "11", "12"],
          correct: 2
        }
      ];

      const q = questions[Math.floor(Math.random() * questions.length)];

      activeGames.set(gameKey, {
        question: q.question,
        options: q.options,
        correctIndex: q.correct,
        startTime: Date.now()
      });

      // Nettoyer après 2 minutes
      setTimeout(() => activeGames.delete(gameKey), 120000);

      let quizText = `❓ *QUIZ TIME!*\n\n📝 ${q.question}\n\n`;
      q.options.forEach((opt, i) => {
        quizText += `${["A", "B", "C", "D"][i]}. ${opt}\n`;
      });
      quizText += `\n💬 Répondez avec .quiz A/B/C/D\n⏱️ 2 minutes pour répondre\n\n✨ HANI-MD Games`;

      repondre(quizText);

    } catch (error) {
      console.error("[QUIZ]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✊ PIERRE PAPIER CISEAUX
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rps",
    classe: "Games",
    react: "✊",
    desc: "Pierre, papier, ciseaux",
    alias: ["ppc", "chifoumi"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const choices = ["pierre", "papier", "ciseaux"];
      const emojis = { pierre: "🪨", papier: "📄", ciseaux: "✂️" };
      
      const userChoice = arg[0]?.toLowerCase();
      
      if (!userChoice || !choices.includes(userChoice)) {
        return repondre("✊ *Pierre Papier Ciseaux*\n\n📝 Utilisation: .rps [pierre/papier/ciseaux]\n\n✨ HANI-MD Games");
      }

      const botChoice = choices[Math.floor(Math.random() * 3)];
      
      let result;
      if (userChoice === botChoice) {
        result = "🤝 *ÉGALITÉ!*";
      } else if (
        (userChoice === "pierre" && botChoice === "ciseaux") ||
        (userChoice === "papier" && botChoice === "pierre") ||
        (userChoice === "ciseaux" && botChoice === "papier")
      ) {
        result = "🎉 *VOUS AVEZ GAGNÉ!*";
      } else {
        result = "😢 *VOUS AVEZ PERDU!*";
      }

      repondre(`✊ *Pierre Papier Ciseaux*\n\n${emojis[userChoice]} Vous: ${userChoice}\n${emojis[botChoice]} Bot: ${botChoice}\n\n${result}\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[RPS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🃏 BLACKJACK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blackjack",
    classe: "Games",
    react: "🃏",
    desc: "Jouer au Blackjack",
    alias: ["bj", "21"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const gameKey = `bj_${chatId}_${auteur_Msg}`;

      // Cartes et valeurs
      const suits = ["♠️", "♥️", "♦️", "♣️"];
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      
      const getCardValue = (card) => {
        const value = card.slice(0, -2);
        if (["J", "Q", "K"].includes(value)) return 10;
        if (value === "A") return 11;
        return parseInt(value);
      };

      const calculateHand = (hand) => {
        let total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
        let aces = hand.filter(card => card.startsWith("A")).length;
        while (total > 21 && aces > 0) {
          total -= 10;
          aces--;
        }
        return total;
      };

      const drawCard = (deck) => {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const value = values[Math.floor(Math.random() * values.length)];
        return value + suit;
      };

      // Hit ou Stand sur partie en cours
      if (activeGames.has(gameKey)) {
        const game = activeGames.get(gameKey);
        const action = arg[0]?.toLowerCase();

        if (action === "hit" || action === "h") {
          game.playerHand.push(drawCard());
          const playerTotal = calculateHand(game.playerHand);

          if (playerTotal > 21) {
            activeGames.delete(gameKey);
            return repondre(`🃏 *BLACKJACK - PERDU!*\n\n🎴 Vos cartes: ${game.playerHand.join(" ")}\n📊 Total: ${playerTotal}\n\n💥 BUST! Vous dépassez 21!\n\n✨ HANI-MD Games`);
          }

          return repondre(`🃏 *BLACKJACK*\n\n🎴 Vos cartes: ${game.playerHand.join(" ")}\n📊 Total: ${playerTotal}\n\n🃏 Dealer: ${game.dealerHand[0]} ??\n\n💬 .blackjack hit/stand\n\n✨ HANI-MD Games`);

        } else if (action === "stand" || action === "s") {
          // Tour du dealer
          while (calculateHand(game.dealerHand) < 17) {
            game.dealerHand.push(drawCard());
          }

          const playerTotal = calculateHand(game.playerHand);
          const dealerTotal = calculateHand(game.dealerHand);

          activeGames.delete(gameKey);

          let result;
          if (dealerTotal > 21) {
            result = "🎉 *VOUS AVEZ GAGNÉ!* Le dealer bust!";
          } else if (playerTotal > dealerTotal) {
            result = "🎉 *VOUS AVEZ GAGNÉ!*";
          } else if (playerTotal < dealerTotal) {
            result = "😢 *VOUS AVEZ PERDU!*";
          } else {
            result = "🤝 *ÉGALITÉ!*";
          }

          return repondre(`🃏 *BLACKJACK - RÉSULTAT*\n\n🎴 Vos cartes: ${game.playerHand.join(" ")} (${playerTotal})\n🃏 Dealer: ${game.dealerHand.join(" ")} (${dealerTotal})\n\n${result}\n\n✨ HANI-MD Games`);
        }

        return repondre(`❌ Action invalide. Utilisez .blackjack hit ou .blackjack stand`);
      }

      // Nouvelle partie
      const playerHand = [drawCard(), drawCard()];
      const dealerHand = [drawCard(), drawCard()];

      activeGames.set(gameKey, {
        playerHand,
        dealerHand,
        startTime: Date.now()
      });

      // Nettoyer après 5 minutes
      setTimeout(() => activeGames.delete(gameKey), 300000);

      const playerTotal = calculateHand(playerHand);

      // Vérifier blackjack naturel
      if (playerTotal === 21) {
        activeGames.delete(gameKey);
        return repondre(`🃏 *BLACKJACK NATUREL!*\n\n🎴 Vos cartes: ${playerHand.join(" ")}\n📊 Total: 21\n\n🎉 VOUS AVEZ GAGNÉ!\n\n✨ HANI-MD Games`);
      }

      repondre(`🃏 *BLACKJACK*\n\n🎴 Vos cartes: ${playerHand.join(" ")}\n📊 Total: ${playerTotal}\n\n🃏 Dealer: ${dealerHand[0]} ??\n\n💬 Commandes:\n• .blackjack hit (tirer)\n• .blackjack stand (rester)\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[BLACKJACK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎰 SLOT MACHINE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "slot",
    classe: "Games",
    react: "🎰",
    desc: "Machine à sous",
    alias: ["slots", "machine"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "7️⃣", "💎"];
      
      const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

      let result;
      let winnings = 0;

      if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === "💎") {
          result = "💰 JACKPOT! Triple diamant!";
          winnings = 1000;
        } else if (reel1 === "7️⃣") {
          result = "🎉 MEGA WIN! Triple 7!";
          winnings = 500;
        } else {
          result = "🎊 TRIPLE! Vous gagnez!";
          winnings = 100;
        }
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        result = "✨ Double! Petit gain!";
        winnings = 25;
      } else {
        result = "😢 Perdu! Retentez votre chance!";
      }

      let slotDisplay = `🎰 *MACHINE À SOUS*\n\n`;
      slotDisplay += `┌─────────────┐\n`;
      slotDisplay += `│ ${reel1} │ ${reel2} │ ${reel3} │\n`;
      slotDisplay += `└─────────────┘\n\n`;
      slotDisplay += `${result}\n`;
      if (winnings > 0) {
        slotDisplay += `💰 +${winnings} coins\n`;
      }
      slotDisplay += `\n✨ HANI-MD Games`;

      repondre(slotDisplay);

    } catch (error) {
      console.error("[SLOT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎱 MAGIC 8 BALL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "8ball",
    classe: "Games",
    react: "🎱",
    desc: "Posez une question à la boule magique",
    alias: ["magic", "boule"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (!arg[0]) {
        return repondre("🎱 Posez une question! Ex: .8ball Vais-je réussir?");
      }

      const responses = [
        // Positif
        "🟢 Oui, absolument!",
        "🟢 C'est certain!",
        "🟢 Sans aucun doute!",
        "🟢 Définitivement oui!",
        "🟢 Vous pouvez compter dessus!",
        "🟢 Les signes sont favorables!",
        // Neutre
        "🟡 Peut-être...",
        "🟡 Demandez plus tard",
        "🟡 Je ne peux pas prédire ça maintenant",
        "🟡 Concentrez-vous et redemandez",
        "🟡 La réponse n'est pas claire",
        // Négatif
        "🔴 Non!",
        "🔴 Mes sources disent non",
        "🔴 Très douteux",
        "🔴 N'y comptez pas",
        "🔴 Peu probable"
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];
      const question = arg.join(" ");

      repondre(`🎱 *Boule Magique*\n\n❓ Question: ${question}\n\n${response}\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[8BALL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎯 DUEL - Affrontement entre joueurs
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "duel",
    classe: "Games",
    react: "⚔️",
    desc: "Défier quelqu'un en duel",
    alias: ["fight", "combat"]
  },
  async (ovl, msg, { repondre, auteur_Msg }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid;

      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else {
        return repondre("⚔️ Répondez à un message pour défier quelqu'un en duel!");
      }

      if (targetJid === auteur_Msg) {
        return repondre("❌ Vous ne pouvez pas vous combattre vous-même!");
      }

      const player1Score = Math.floor(Math.random() * 100);
      const player2Score = Math.floor(Math.random() * 100);

      const player1Name = `@${auteur_Msg.split("@")[0]}`;
      const player2Name = `@${targetJid.split("@")[0]}`;

      let result;
      let winner;
      if (player1Score > player2Score) {
        result = `🏆 ${player1Name} remporte le duel!`;
        winner = auteur_Msg;
      } else if (player2Score > player1Score) {
        result = `🏆 ${player2Name} remporte le duel!`;
        winner = targetJid;
      } else {
        result = "🤝 Égalité parfaite!";
      }

      let duelText = `⚔️ *DUEL*\n\n`;
      duelText += `🥊 ${player1Name}: ${player1Score} points\n`;
      duelText += `🥊 ${player2Name}: ${player2Score} points\n\n`;
      duelText += `${result}\n\n`;
      duelText += `✨ HANI-MD Games`;

      await ovl.sendMessage(msg.key.remoteJid, {
        text: duelText,
        mentions: [auteur_Msg, targetJid]
      });

    } catch (error) {
      console.error("[DUEL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔤 WORD SCRAMBLE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "scramble",
    classe: "Games",
    react: "🔤",
    desc: "Devinez le mot mélangé",
    alias: ["anagram", "motmelange"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const chatId = msg.key.remoteJid;
      const gameKey = `scramble_${chatId}`;

      // Vérifier réponse
      if (activeGames.has(gameKey) && arg[0]) {
        const game = activeGames.get(gameKey);
        const answer = arg.join(" ").toLowerCase();

        if (answer === game.word.toLowerCase()) {
          activeGames.delete(gameKey);
          return repondre(`✅ *CORRECT!*\n\n🎉 Le mot était: ${game.word}\n\n✨ HANI-MD Games`);
        } else {
          return repondre(`❌ Ce n'est pas ça! Réessayez avec .scramble [votre réponse]`);
        }
      }

      const words = [
        "BONJOUR", "MUSIQUE", "CHOCOLAT", "ORDINATEUR", "TELEPHONE",
        "MONTAGNE", "SOLEIL", "ETOILE", "PAPILLON", "AVENTURE",
        "VOYAGE", "AMITIE", "BONHEUR", "LIBERTE", "SILENCE",
        "JARDIN", "CUISINE", "FAMILLE", "VACANCES", "MAISON"
      ];

      const word = words[Math.floor(Math.random() * words.length)];
      const scrambled = word.split("").sort(() => Math.random() - 0.5).join("");

      activeGames.set(gameKey, {
        word,
        scrambled,
        startTime: Date.now()
      });

      // Nettoyer après 2 minutes
      setTimeout(() => activeGames.delete(gameKey), 120000);

      repondre(`🔤 *MOT MÉLANGÉ*\n\n📝 ${scrambled}\n\n💬 Devinez le mot avec .scramble [réponse]\n⏱️ 2 minutes\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[SCRAMBLE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎲 DÉS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dice",
    classe: "Games",
    react: "🎲",
    desc: "Lancer un ou plusieurs dés",
    alias: ["de", "roll"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      let numDice = parseInt(arg[0]) || 1;
      if (numDice < 1) numDice = 1;
      if (numDice > 10) numDice = 10;

      const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
      const results = [];
      let total = 0;

      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        results.push(`${diceEmojis[roll - 1]} ${roll}`);
        total += roll;
      }

      let response = `🎲 *Lancé de dés*\n\n`;
      response += results.join("\n");
      response += `\n\n📊 Total: ${total}`;
      response += `\n\n✨ HANI-MD Games`;

      repondre(response);

    } catch (error) {
      console.error("[DICE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💰 COINFLIP
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "coinflip",
    classe: "Games",
    react: "🪙",
    desc: "Pile ou Face",
    alias: ["flip", "coin", "pileouface"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const result = Math.random() < 0.5 ? "pile" : "face";
      const emoji = result === "pile" ? "🪙" : "💿";
      
      const userChoice = arg[0]?.toLowerCase();
      let message = `🪙 *Pile ou Face*\n\n${emoji} Résultat: ${result.toUpperCase()}\n`;

      if (userChoice === "pile" || userChoice === "face") {
        if (userChoice === result) {
          message += `\n🎉 Vous aviez choisi ${userChoice} - GAGNÉ!`;
        } else {
          message += `\n😢 Vous aviez choisi ${userChoice} - PERDU!`;
        }
      }

      message += `\n\n✨ HANI-MD Games`;
      repondre(message);

    } catch (error) {
      console.error("[COINFLIP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❌⭕ TIC TAC TOE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tictactoe",
    classe: "Games",
    react: "⭕",
    desc: "Jouer au morpion",
    alias: ["ttt", "morpion"]
  },
  async (ovl, msg, { arg, repondre, auteur_Msg }) => {
    try {
      const chatId = msg.key.remoteJid;
      const gameKey = `ttt_${chatId}_${auteur_Msg}`;

      const displayBoard = (board) => {
        let display = "";
        for (let i = 0; i < 9; i++) {
          display += board[i] === "" ? `${i + 1}️⃣` : board[i];
          if ((i + 1) % 3 === 0) display += "\n";
          else display += " │ ";
        }
        return display;
      };

      const checkWin = (board, player) => {
        const wins = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8], // lignes
          [0, 3, 6], [1, 4, 7], [2, 5, 8], // colonnes
          [0, 4, 8], [2, 4, 6] // diagonales
        ];
        return wins.some(combo => 
          combo.every(i => board[i] === player)
        );
      };

      const botMove = (board) => {
        const available = board.map((cell, i) => cell === "" ? i : -1).filter(i => i !== -1);
        return available[Math.floor(Math.random() * available.length)];
      };

      // Jouer sur partie en cours
      if (activeGames.has(gameKey)) {
        const game = activeGames.get(gameKey);
        const position = parseInt(arg[0]) - 1;

        if (isNaN(position) || position < 0 || position > 8) {
          return repondre("❌ Entrez un numéro de 1 à 9!");
        }

        if (game.board[position] !== "") {
          return repondre("❌ Cette case est déjà prise!");
        }

        // Tour du joueur
        game.board[position] = "❌";

        if (checkWin(game.board, "❌")) {
          activeGames.delete(gameKey);
          return repondre(`⭕❌ *TIC TAC TOE - GAGNÉ!*\n\n${displayBoard(game.board)}\n\n🎉 Vous avez gagné!\n\n✨ HANI-MD Games`);
        }

        // Vérifier égalité
        if (!game.board.includes("")) {
          activeGames.delete(gameKey);
          return repondre(`⭕❌ *TIC TAC TOE - ÉGALITÉ!*\n\n${displayBoard(game.board)}\n\n🤝 Match nul!\n\n✨ HANI-MD Games`);
        }

        // Tour du bot
        const botPos = botMove(game.board);
        game.board[botPos] = "⭕";

        if (checkWin(game.board, "⭕")) {
          activeGames.delete(gameKey);
          return repondre(`⭕❌ *TIC TAC TOE - PERDU!*\n\n${displayBoard(game.board)}\n\n😢 Le bot a gagné!\n\n✨ HANI-MD Games`);
        }

        // Vérifier égalité après tour bot
        if (!game.board.includes("")) {
          activeGames.delete(gameKey);
          return repondre(`⭕❌ *TIC TAC TOE - ÉGALITÉ!*\n\n${displayBoard(game.board)}\n\n🤝 Match nul!\n\n✨ HANI-MD Games`);
        }

        return repondre(`⭕❌ *TIC TAC TOE*\n\n${displayBoard(game.board)}\n\n💬 .tictactoe [1-9]\n\n✨ HANI-MD Games`);
      }

      // Nouvelle partie
      const board = ["", "", "", "", "", "", "", "", ""];
      
      activeGames.set(gameKey, {
        board,
        startTime: Date.now()
      });

      // Nettoyer après 5 minutes
      setTimeout(() => activeGames.delete(gameKey), 300000);

      repondre(`⭕❌ *TIC TAC TOE*\n\n${displayBoard(board)}\n\n📝 Vous êtes ❌\n💬 Tapez .tictactoe [1-9] pour jouer\n\n✨ HANI-MD Games`);

    } catch (error) {
      console.error("[TICTACTOE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Ovl-game.js chargé - Commandes: guess, quiz, rps, blackjack, slot, 8ball, duel, scramble, dice, coinflip, tictactoe");
