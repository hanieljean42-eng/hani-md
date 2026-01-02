/**
 * ═══════════════════════════════════════════════════════════
 * 🎭 HANI-MD - Commandes Fun
 * ═══════════════════════════════════════════════════════════
 * Blagues, jeux, divertissement
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// 🎲 DÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dice",
    classe: "Fun",
    react: "🎲",
    desc: "Lancer un dé",
    alias: ["de", "roll"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sides = parseInt(arg[0]) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      
      repondre(`🎲 *Lancer de dé*\n\n🎯 Dé à ${sides} faces\n✨ Résultat: *${result}*`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🪙 PILE OU FACE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "coinflip",
    classe: "Fun",
    react: "🪙",
    desc: "Pile ou Face",
    alias: ["flip", "coin", "pileouface"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const result = Math.random() < 0.5 ? "🪙 PILE" : "🪙 FACE";
      repondre(`🪙 *Pile ou Face*\n\n✨ Résultat: *${result}*`);
    } catch (error) {
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
    classe: "Fun",
    react: "🎱",
    desc: "Poser une question à la boule magique",
    alias: ["magic8ball", "boule"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const question = arg.join(" ");
      if (!question) {
        return repondre("❌ Pose une question!\nExemple: .8ball Vais-je réussir?");
      }

      const responses = [
        "🟢 Oui, absolument!",
        "🟢 C'est certain.",
        "🟢 Sans aucun doute.",
        "🟢 Oui, définitivement.",
        "🟡 C'est bien probable.",
        "🟡 Les perspectives sont bonnes.",
        "🟡 Les signes pointent vers oui.",
        "🟡 Concentre-toi et redemande.",
        "🟡 Difficile à dire maintenant.",
        "🟡 Mieux vaut ne pas te dire maintenant.",
        "🔴 Mes sources disent non.",
        "🔴 N'y compte pas.",
        "🔴 Ma réponse est non.",
        "🔴 Très douteux.",
        "🔴 Les perspectives ne sont pas bonnes."
      ];

      const answer = responses[Math.floor(Math.random() * responses.length)];
      repondre(`🎱 *Boule Magique*\n\n❓ Question: ${question}\n\n✨ ${answer}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❤️ COMPATIBILITÉ AMOUREUSE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "love",
    classe: "Fun",
    react: "❤️",
    desc: "Calculer la compatibilité amoureuse",
    alias: ["amour", "lovemeter"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const names = arg.join(" ").split(/[+&,]/).map(n => n.trim()).filter(n => n);
      
      if (names.length < 2) {
        return repondre("❌ Utilisation: .love Nom1 + Nom2");
      }

      const name1 = names[0];
      const name2 = names[1];
      
      // Génère un pourcentage basé sur les noms (pseudo-aléatoire mais constant)
      let hash = 0;
      for (let i = 0; i < (name1 + name2).length; i++) {
        hash = (name1 + name2).charCodeAt(i) + ((hash << 5) - hash);
      }
      const percentage = Math.abs(hash % 101);

      let message;
      let hearts;
      
      if (percentage >= 80) {
        message = "💕 Amour parfait! Vous êtes faits l'un pour l'autre!";
        hearts = "❤️❤️❤️❤️❤️";
      } else if (percentage >= 60) {
        message = "💖 Belle compatibilité! Ça peut marcher!";
        hearts = "❤️❤️❤️❤️🤍";
      } else if (percentage >= 40) {
        message = "💛 Compatibilité moyenne. Il faut travailler dessus!";
        hearts = "❤️❤️❤️🤍🤍";
      } else if (percentage >= 20) {
        message = "🧡 Compatibilité faible. Beaucoup d'efforts nécessaires.";
        hearts = "❤️❤️🤍🤍🤍";
      } else {
        message = "💔 Oups... Ce n'est peut-être pas le bon match.";
        hearts = "❤️🤍🤍🤍🤍";
      }

      repondre(`❤️ *Love Calculator*\n\n👤 ${name1}\n💕\n👤 ${name2}\n\n${hearts}\n\n📊 Compatibilité: *${percentage}%*\n\n${message}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 😂 BLAGUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blague",
    classe: "Fun",
    react: "😂",
    desc: "Obtenir une blague aléatoire",
    alias: ["joke", "rire"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const jokes = [
        "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant?\nParce que sinon ils tomberaient dans le bateau! 😂",
        "C'est l'histoire d'un pingouin qui respire par les fesses.\nUn jour il s'assoit... et il meurt! 🐧",
        "Qu'est-ce qu'un crocodile qui surveille la cour de récré?\nUn surveillant général! 🐊",
        "Quel est le comble pour un électricien?\nDe ne pas être au courant! ⚡",
        "Pourquoi les canards sont-ils toujours à l'heure?\nParce qu'ils sont dans l'étang! 🦆",
        "Que dit un informaticien quand il s'ennuie?\nJe me fichier! 💻",
        "Pourquoi les vampires sont-ils toujours malades?\nParce qu'ils ont des problèmes de circulation! 🧛",
        "Qu'est-ce qu'un canif?\nUn petit fien! 🔪",
        "Pourquoi le chat ne joue pas au poker dans la jungle?\nTrop de guépards! 🐱",
        "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël?\nUn chat peint de Noël! 🎄"
      ];

      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      repondre(`😂 *Blague du jour*\n\n${joke}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💭 CITATION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "citation",
    classe: "Fun",
    react: "💭",
    desc: "Obtenir une citation inspirante",
    alias: ["quote", "inspiration"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotes = [
        { text: "La vie est ce qui arrive quand vous êtes occupé à faire d'autres projets.", author: "John Lennon" },
        { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
        { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Gandhi" },
        { text: "L'imagination est plus importante que le savoir.", author: "Albert Einstein" },
        { text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", author: "Sénèque" },
        { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
        { text: "Dans la vie, il n'y a pas de solutions. Il y a des forces en marche.", author: "Antoine de Saint-Exupéry" },
        { text: "Le bonheur n'est pas au sommet de la montagne mais dans la façon de la gravir.", author: "Confucius" },
        { text: "N'attendez pas d'être parfait pour commencer quelque chose de bien.", author: "Abbé Pierre" },
        { text: "La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute.", author: "Nelson Mandela" }
      ];

      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      repondre(`💭 *Citation*\n\n"${quote.text}"\n\n— *${quote.author}*`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔮 HOROSCOPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "horoscope",
    classe: "Fun",
    react: "🔮",
    desc: "Horoscope du jour",
    alias: ["zodiac", "astro"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sign = arg[0]?.toLowerCase();
      
      const signs = {
        belier: "♈", taureau: "♉", gemeaux: "♊", cancer: "♋",
        lion: "♌", vierge: "♍", balance: "♎", scorpion: "♏",
        sagittaire: "♐", capricorne: "♑", verseau: "♒", poissons: "♓"
      };

      if (!sign || !signs[sign]) {
        return repondre(`❌ Signe non reconnu!\n\n🔮 Signes disponibles:\n${Object.keys(signs).join(", ")}`);
      }

      const predictions = [
        "Une belle surprise vous attend aujourd'hui! 🎁",
        "C'est le moment idéal pour prendre des décisions importantes. ✨",
        "L'amour est au rendez-vous, ouvrez les yeux! 💕",
        "Une opportunité professionnelle se profile à l'horizon. 💼",
        "Prenez soin de votre santé, votre corps vous remerciera. 🏃",
        "Les astres sont alignés en votre faveur! 🌟",
        "Un ami aura besoin de vous aujourd'hui. 🤝",
        "La créativité est votre alliée du jour. 🎨",
        "Évitez les conflits, la diplomatie sera votre force. 🕊️",
        "Une nouvelle rencontre pourrait changer votre vie. 👋"
      ];

      const prediction = predictions[Math.floor(Math.random() * predictions.length)];
      repondre(`🔮 *Horoscope du jour*\n\n${signs[sign]} *${sign.charAt(0).toUpperCase() + sign.slice(1)}*\n\n${prediction}\n\n⭐ Chance: ${Math.floor(Math.random() * 5) + 1}/5\n💕 Amour: ${Math.floor(Math.random() * 5) + 1}/5\n💼 Travail: ${Math.floor(Math.random() * 5) + 1}/5`);
    } catch (error) {
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
    classe: "Fun",
    react: "🎰",
    desc: "Jouer à la machine à sous",
    alias: ["slots", "casino"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "🍀"];
      
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols[Math.floor(Math.random() * symbols.length)];
      const s3 = symbols[Math.floor(Math.random() * symbols.length)];

      let result;
      let prize;
      
      if (s1 === s2 && s2 === s3) {
        if (s1 === "7️⃣") {
          result = "🎉 JACKPOT! TRIPLE 7!";
          prize = "💰 +10000 pièces";
        } else if (s1 === "💎") {
          result = "💎 TRIPLE DIAMANT!";
          prize = "💰 +5000 pièces";
        } else {
          result = "🎊 TRIPLE VICTOIRE!";
          prize = "💰 +1000 pièces";
        }
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        result = "✨ Double symbole!";
        prize = "💰 +100 pièces";
      } else {
        result = "😅 Pas de chance...";
        prize = "💸 -50 pièces";
      }

      repondre(`🎰 *Machine à Sous*\n\n╔════════╗\n║ ${s1} │ ${s2} │ ${s3} ║\n╚════════╝\n\n${result}\n${prize}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✊ PIERRE PAPIER CISEAUX
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ppc",
    classe: "Fun",
    react: "✊",
    desc: "Jouer à Pierre Papier Ciseaux",
    alias: ["rps", "chifoumi"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const choices = {
        pierre: "✊", papier: "✋", ciseaux: "✌️",
        p: "✊", f: "✋", c: "✌️"
      };
      
      const playerChoice = arg[0]?.toLowerCase();
      
      if (!playerChoice || !choices[playerChoice]) {
        return repondre("❌ Utilisation: .ppc [pierre/papier/ciseaux]");
      }

      const botChoices = ["pierre", "papier", "ciseaux"];
      const botChoice = botChoices[Math.floor(Math.random() * 3)];

      const playerEmoji = choices[playerChoice];
      const botEmoji = choices[botChoice];

      let result;
      const playerKey = playerChoice.length === 1 ? 
        (playerChoice === "p" ? "pierre" : playerChoice === "f" ? "papier" : "ciseaux") : 
        playerChoice;

      if (playerKey === botChoice) {
        result = "🤝 Égalité!";
      } else if (
        (playerKey === "pierre" && botChoice === "ciseaux") ||
        (playerKey === "papier" && botChoice === "pierre") ||
        (playerKey === "ciseaux" && botChoice === "papier")
      ) {
        result = "🎉 Tu as gagné!";
      } else {
        result = "😢 Tu as perdu!";
      }

      repondre(`✊ *Pierre Papier Ciseaux*\n\n👤 Toi: ${playerEmoji}\n🤖 Bot: ${botEmoji}\n\n${result}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 VÉRITÉ OU DÉFI
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "vod",
    classe: "Fun",
    react: "🎯",
    desc: "Vérité ou Défi",
    alias: ["verite", "defi", "truthordare"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const type = arg[0]?.toLowerCase();

      const verites = [
        "Quelle est la chose la plus embarrassante que tu aies faite?",
        "Quel est ton plus grand secret?",
        "As-tu déjà menti à un ami proche? Pourquoi?",
        "Quelle est ta plus grande peur?",
        "As-tu déjà triché à un examen?",
        "Quel est le dernier mensonge que tu as dit?",
        "As-tu déjà stalké quelqu'un sur les réseaux?",
        "Quelle est la chose que tu n'as jamais dit à personne?",
        "Quel est ton crush actuel?",
        "As-tu déjà regretté quelque chose que tu as fait?"
      ];

      const defis = [
        "Envoie un message bizarre à la dernière personne qui t'a écrit",
        "Change ta photo de profil en quelque chose d'embarrassant pendant 1h",
        "Fais 10 pompes maintenant",
        "Chante une chanson et envoie un vocal",
        "Imite un animal et envoie une photo",
        "Envoie une blague nulle à ton crush",
        "Fais un compliment à quelqu'un que tu n'aimes pas",
        "Mange quelque chose de piquant",
        "Fais une grimace et envoie la photo",
        "Appelle quelqu'un et raccroches après 3 secondes"
      ];

      if (type === "verite" || type === "v") {
        const verite = verites[Math.floor(Math.random() * verites.length)];
        repondre(`❓ *VÉRITÉ*\n\n${verite}`);
      } else if (type === "defi" || type === "d") {
        const defi = defis[Math.floor(Math.random() * defis.length)];
        repondre(`🎯 *DÉFI*\n\n${defi}`);
      } else {
        const isVerite = Math.random() < 0.5;
        if (isVerite) {
          const verite = verites[Math.floor(Math.random() * verites.length)];
          repondre(`❓ *VÉRITÉ*\n\n${verite}`);
        } else {
          const defi = defis[Math.floor(Math.random() * defis.length)];
          repondre(`🎯 *DÉFI*\n\n${defi}`);
        }
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Fun.js chargé - Commandes: dice, coinflip, 8ball, love, blague, citation, horoscope, slot, ppc, vod");
