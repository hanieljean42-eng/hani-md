/**
 * ═══════════════════════════════════════════════════════════
 * 🎭 HANI-MD - Commandes Fun
 * ═══════════════════════════════════════════════════════════
 * Blagues, divertissement, citations
 * Version nettoyée (jeux dans Ovl-game.js)
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// NOTE: dice, coinflip sont dans Ovl-game.js

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
        "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël?\nUn chat peint de Noël! 🎄",
        "Qu'est-ce qu'un cheval qui porte des lunettes?\nUn super cheval! 🐴",
        "Pourquoi les poissons détestent l'ordinateur?\nParce qu'ils ont peur du net! 🐟",
        "Que fait un abricot quand il change de ville?\nIl fait sa pruine! 🍑",
        "Quel est le fruit préféré des profs d'histoire?\nLes dattes! 📅",
        "Pourquoi les abeilles ont-elles des poils?\nPour faire des miels-ongles! 🐝",
        "Qu'est-ce qu'une tomate qui traverse la rue?\nUn ketchup! 🍅",
        "Pourquoi les girafes ont-elles un long cou?\nParce que leurs pieds sentent mauvais! 🦒",
        "Comment appelle-t-on un chien qui fait de la magie?\nUn labracadabrador! 🐕",
        "Pourquoi le livre de mathématiques est-il triste?\nParce qu'il a trop de problèmes! 📚",
        "Qu'est-ce qu'un steak qui joue de la guitare?\nUn beef heart! 🥩",
        "Pourquoi les éléphants ne prennent-ils pas l'avion?\nParce que leurs valises ne rentrent pas! 🐘",
        "Quel est le comble pour un jardinier?\nDe perdre ses plantes! 🌱",
        "Que dit un pain quand il va à la plage?\nJ'ai chaud, je vais me faire griller! 🍞",
        "Pourquoi les fantômes sont-ils mauvais menteurs?\nParce qu'on voit à travers eux! 👻",
        "Comment appelle-t-on un café qui danse?\nUn café au lait de la vie! ☕",
        "Pourquoi les squelettes ne se battent-ils jamais?\nParce qu'ils n'ont pas de courage! 💀",
        "Qu'est-ce qu'un oiseau qui fait peur?\nUn effrayon! 🐦",
        "Pourquoi la tomate rougit?\nParce qu'elle voit le saladier! 🥗",
        "Que dit un mur à un autre mur?\nOn se retrouve au coin! 🧱",
        "Pourquoi les ordinateurs ne peuvent-ils pas avoir des enfants?\nParce qu'ils ont un problème de hardware! 💾",
        "Comment appelle-t-on un chien sans pattes?\nÇa ne change rien, il ne vient pas quand on l'appelle! 🐕",
        "Pourquoi les martiens ne mangent-ils pas de clowns?\nParce qu'ils ont un goût de farce! 👽",
        "Qu'est-ce qui est jaune et qui attend?\nUn citron qui veut devenir citronnade! 🍋",
        "Pourquoi les robots ne se marient-ils pas?\nParce qu'ils craignent le divorce de circuits! 🤖",
        "Que fait une fraise sur un cheval?\nElle fait de la tagada! 🍓",
        "Comment appelle-t-on un cochon qui sait voler?\nUn aéro-porc! 🐷",
        "Pourquoi les nuages sont-ils toujours en retard?\nParce qu'ils flottent! ☁️",
        "Qu'est-ce qu'un singe qui aime les bonbons?\nUn singe friand! 🐒",
        "Pourquoi la poule a-t-elle traversé la route?\nPour aller de l'autre côté! 🐔",
        "Que dit une mère à son enfant ordinateur?\nArrête de faire des fenêtres! 🖥️",
        "Comment appelle-t-on un lion qui fait la cuisine?\nUn roi de la gastronomie! 🦁",
        "Pourquoi les pelicans sont-ils toujours contents?\nParce qu'ils ont tout sous le bec! 🦢",
        "Qu'est-ce qu'une patate qui se déplace?\nUne patate roulante! 🥔",
        "Pourquoi les tortues sont-elles toujours zen?\nParce qu'elles portent leur maison sur le dos! 🐢",
        "Que fait un fromage quand il prend une photo?\nIl dit 'cheese'! 🧀",
        "Comment appelle-t-on un requin malin?\nUn requin-cidence! 🦈",
        "Pourquoi les araignées sont-elles bonnes sur Internet?\nParce qu'elles font des sites web! 🕸️"
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
        { text: "La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute.", author: "Nelson Mandela" },
        { text: "Le pessimiste voit la difficulté dans chaque opportunité. L'optimiste voit l'opportunité dans chaque difficulté.", author: "Winston Churchill" },
        { text: "Ne juge pas chaque jour par la récolte que tu fais, mais par les graines que tu sèmes.", author: "Robert Louis Stevenson" },
        { text: "L'avenir appartient à ceux qui croient à la beauté de leurs rêves.", author: "Eleanor Roosevelt" },
        { text: "Il n'y a qu'une façon d'échouer, c'est d'abandonner avant d'avoir réussi.", author: "Georges Clemenceau" },
        { text: "Votre temps est limité, ne le gâchez pas en vivant la vie d'un autre.", author: "Steve Jobs" },
        { text: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
        { text: "Le seul véritable échec est celui de ne pas essayer.", author: "Marianne Williamson" },
        { text: "Ce qui ne nous tue pas nous rend plus forts.", author: "Friedrich Nietzsche" },
        { text: "Croyez en vos rêves et ils se réaliseront peut-être. Croyez en vous et ils se réaliseront sûrement.", author: "Martin Luther King" },
        { text: "La meilleure façon de prédire l'avenir est de le créer.", author: "Peter Drucker" },
        { text: "N'ayez pas peur d'avancer lentement, ayez peur seulement de rester immobile.", author: "Proverbe chinois" },
        { text: "Le secret du succès, c'est de se lever tôt, de travailler dur et de découvrir du pétrole.", author: "John Paul Getty" },
        { text: "La différence entre un rêveur et un visionnaire, c'est l'action.", author: "Joel Barker" },
        { text: "Si vous pensez que vous êtes trop petit pour avoir de l'impact, essayez d'aller au lit avec un moustique.", author: "Betty Reese" },
        { text: "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", author: "Winston Churchill" },
        { text: "La difficulté de réussir ne doit jamais dissuader quelqu'un d'essayer.", author: "John F. Kennedy" },
        { text: "La vie commence à la fin de votre zone de confort.", author: "Neale Donald Walsch" },
        { text: "Ne rêvez pas votre vie, vivez vos rêves.", author: "Mark Twain" },
        { text: "La persévérance n'est pas une longue course, c'est beaucoup de petites courses que l'on court chaque jour.", author: "Walter Elliot" },
        { text: "Chaque jour est une nouvelle chance de changer votre vie.", author: "Inconnu" },
        { text: "Le bonheur est un voyage, pas une destination.", author: "Alfred D'Souza" },
        { text: "Faites de votre vie un rêve, et d'un rêve une réalité.", author: "Antoine de Saint-Exupéry" },
        { text: "Les défis sont ce qui rendent la vie intéressante et les surmonter est ce qui donne du sens à la vie.", author: "Joshua J. Marine" },
        { text: "Ne comptez pas les jours, faites que les jours comptent.", author: "Muhammad Ali" },
        { text: "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.", author: "Franklin D. Roosevelt" },
        { text: "La motivation vous fait démarrer. L'habitude vous fait continuer.", author: "Jim Ryun" },
        { text: "Les deux guerriers les plus puissants sont la patience et le temps.", author: "Léon Tolstoï" },
        { text: "N'abandonnez jamais un rêve à cause du temps qu'il faudra pour l'accomplir. Le temps passera de toute façon.", author: "Earl Nightingale" },
        { text: "Celui qui déplace une montagne commence par déplacer de petites pierres.", author: "Confucius" },
        { text: "Si vous pouvez le rêver, vous pouvez le faire.", author: "Walt Disney" }
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

// NOTE: slot et ppc sont dans Ovl-game.js

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

console.log("[CMD] ✅ Fun.js chargé - Commandes: 8ball, love, blague, citation, horoscope, vod");
