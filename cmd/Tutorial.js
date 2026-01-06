/**
 * ═══════════════════════════════════════════════════════════
 * 📚 HANI-MD - Tutoriel & Onboarding
 * ═══════════════════════════════════════════════════════════
 * Guide interactif pour les nouveaux utilisateurs
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

// Base de données Tutoriel
const TUTORIAL_DB_PATH = path.join(__dirname, "../DataBase/tutorial.json");

function loadTutorialDB() {
  try {
    if (fs.existsSync(TUTORIAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(TUTORIAL_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    usersProgress: {},
    completedUsers: []
  };
}

function saveTutorialDB(data) {
  try {
    fs.writeFileSync(TUTORIAL_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Étapes du tutoriel
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "👋 Bienvenue sur HANI-MD!",
    content: `Bienvenue sur *HANI-MD*, le bot WhatsApp le plus complet!

Je vais vous guider à travers les fonctionnalités principales en quelques étapes simples.

📌 *Ce que vous allez apprendre:*
• Les commandes de base
• Comment télécharger des médias
• Les fonctionnalités IA
• Le système premium
• Et bien plus!

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: null
  },
  {
    id: 2,
    title: "📋 Le Menu Principal",
    content: `*ÉTAPE 1: LE MENU*

Le menu est votre point de départ pour tout faire!

📝 *Commande:* .menu

Le menu affiche toutes les commandes disponibles, organisées par catégories.

🎯 *Essayez maintenant:*
Tapez .menu pour voir les commandes

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* après avoir testé`,
    action: "menu"
  },
  {
    id: 3,
    title: "📥 Téléchargement de Médias",
    content: `*ÉTAPE 2: TÉLÉCHARGEMENTS*

HANI-MD peut télécharger depuis de nombreuses plateformes!

🎵 *Musique:*
• .play [titre] - Chercher et jouer de la musique
• .ytmp3 [lien] - Télécharger audio YouTube

🎬 *Vidéos:*
• .ytmp4 [lien] - Télécharger vidéo YouTube
• .tiktok [lien] - Télécharger TikTok
• .insta [lien] - Télécharger Instagram

🎯 *Essayez:*
.play [votre chanson préférée]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: "play"
  },
  {
    id: 4,
    title: "🎨 Création de Stickers",
    content: `*ÉTAPE 3: STICKERS*

Créez des stickers personnalisés facilement!

📸 *Comment faire:*
1. Envoyez ou répondez à une image
2. Tapez .sticker

🎭 *Options avancées:*
• .sticker pack NomDuPack author Auteur
• .toimg - Convertir sticker en image

🎯 *Essayez:*
Envoyez une image puis tapez .sticker

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: "sticker"
  },
  {
    id: 5,
    title: "🤖 Intelligence Artificielle",
    content: `*ÉTAPE 4: L'IA*

HANI-MD intègre l'IA pour vous aider!

💬 *Chat IA:*
• .gpt [question] - Poser une question à l'IA
• .dalle [description] - Générer une image

📝 *Outils IA:*
• .translate [langue] [texte] - Traduction
• .resume [texte] - Résumer un texte

🎯 *Essayez:*
.gpt Explique-moi comment fonctionne WhatsApp

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: "gpt"
  },
  {
    id: 6,
    title: "👥 Gestion de Groupe",
    content: `*ÉTAPE 5: COMMANDES GROUPE*

Si vous êtes admin d'un groupe, ces commandes sont pour vous!

👮 *Administration:*
• .add [numéro] - Ajouter un membre
• .kick - Expulser (répondez au message)
• .promote / .demote - Gérer les admins

🔒 *Protection:*
• .antilink on/off - Bloquer les liens
• .antispam on/off - Limiter le spam
• .warn - Avertir un membre

📢 *Communication:*
• .tagall - Mentionner tout le monde
• .hidetag [msg] - Mention invisible

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: null
  },
  {
    id: 7,
    title: "💎 Le Système Premium",
    content: `*ÉTAPE 6: PREMIUM*

Débloquez tout le potentiel de HANI-MD!

🆓 *Plan Gratuit:*
• 20 commandes/jour
• Fonctions de base

💎 *Plans Premium:*
• Bronze (500 FCFA): 100 cmd/jour
• Argent (1000 FCFA): 500 cmd/jour
• Or (2000 FCFA): Illimité
• Diamant (5000 FCFA): Tout + API
• Lifetime (15000 FCFA): À vie!

📝 *Commandes:*
• .premium - Voir les plans
• .myplan - Voir votre abonnement
• .upgrade [code] - Activer un code

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour continuer`,
    action: "premium"
  },
  {
    id: 8,
    title: "🆘 Support & Aide",
    content: `*ÉTAPE 7: OBTENIR DE L'AIDE*

Besoin d'assistance? Nous sommes là!

📞 *Contact:*
• .contact - Contacter le propriétaire
• .ticket [problème] - Créer un ticket

❓ *Ressources:*
• .faq - Questions fréquentes
• .menu - Toutes les commandes

⭐ *Feedback:*
• .rate [1-5] - Noter le bot
• .suggest [idée] - Proposer une idée
• .bug [problème] - Signaler un bug

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.tuto next* pour terminer`,
    action: null
  },
  {
    id: 9,
    title: "🎉 Tutoriel Terminé!",
    content: `*FÉLICITATIONS!* 🎉

Vous avez terminé le tutoriel HANI-MD!

📊 *Récapitulatif:*
✅ Menu et navigation
✅ Téléchargements médias
✅ Création de stickers
✅ Intelligence artificielle
✅ Gestion de groupe
✅ Système premium
✅ Support et aide

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *Prochaines étapes:*
1. Explorez le menu (.menu)
2. Testez les commandes
3. Rejoignez notre groupe support
4. Passez au premium si vous aimez!

⭐ N'oubliez pas de nous noter: .rate 5

🤖 *Merci d'utiliser HANI-MD!*`,
    action: null
  }
];

// ═══════════════════════════════════════════════════════════
// 📚 TUTORIEL PRINCIPAL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tuto",
    classe: "Tutorial",
    react: "📚",
    desc: "Tutoriel interactif pour apprendre à utiliser le bot",
    alias: ["tutorial", "guide", "learn", "apprendre"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const subCommand = arg[0]?.toLowerCase();
      
      const db = loadTutorialDB();
      
      // Initialiser la progression si nouveau
      if (!db.usersProgress[number]) {
        db.usersProgress[number] = {
          currentStep: 0,
          startedAt: new Date().toISOString(),
          completedSteps: []
        };
      }

      const userProgress = db.usersProgress[number];

      if (!subCommand || subCommand === "start") {
        // Démarrer ou reprendre le tutoriel
        userProgress.currentStep = 1;
        saveTutorialDB(db);
        
        const step = TUTORIAL_STEPS[0];
        repondre(`📚 *${step.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${step.content}`);

      } else if (subCommand === "next") {
        // Étape suivante
        const nextStepIndex = userProgress.currentStep;
        
        if (nextStepIndex >= TUTORIAL_STEPS.length) {
          // Tutoriel terminé
          if (!db.completedUsers.includes(number)) {
            db.completedUsers.push(number);
          }
          saveTutorialDB(db);
          
          const lastStep = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
          return repondre(`📚 *${lastStep.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lastStep.content}`);
        }

        userProgress.currentStep = nextStepIndex + 1;
        userProgress.completedSteps.push(nextStepIndex);
        saveTutorialDB(db);

        const step = TUTORIAL_STEPS[nextStepIndex];
        repondre(`📚 *${step.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${step.content}`);

      } else if (subCommand === "prev" || subCommand === "back") {
        // Étape précédente
        if (userProgress.currentStep <= 1) {
          return repondre("⚠️ Vous êtes déjà à la première étape!");
        }

        userProgress.currentStep--;
        saveTutorialDB(db);

        const step = TUTORIAL_STEPS[userProgress.currentStep - 1];
        repondre(`📚 *${step.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${step.content}`);

      } else if (subCommand === "step" || subCommand === "goto") {
        // Aller à une étape spécifique
        const stepNum = parseInt(arg[1]);
        
        if (!stepNum || stepNum < 1 || stepNum > TUTORIAL_STEPS.length) {
          return repondre(`❌ Numéro d'étape invalide. (1-${TUTORIAL_STEPS.length})`);
        }

        userProgress.currentStep = stepNum;
        saveTutorialDB(db);

        const step = TUTORIAL_STEPS[stepNum - 1];
        repondre(`📚 *${step.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${step.content}`);

      } else if (subCommand === "progress" || subCommand === "status") {
        // Voir la progression
        const completed = userProgress.completedSteps.length;
        const total = TUTORIAL_STEPS.length;
        const percentage = Math.round((completed / total) * 100);
        const bar = "█".repeat(Math.floor(percentage / 10)) + "░".repeat(10 - Math.floor(percentage / 10));

        let progressText = `📊 *VOTRE PROGRESSION*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        progressText += `📈 Progression: ${completed}/${total} étapes\n`;
        progressText += `[${bar}] ${percentage}%\n\n`;
        progressText += `📍 Étape actuelle: ${userProgress.currentStep}\n`;
        progressText += `📅 Commencé le: ${new Date(userProgress.startedAt).toLocaleDateString("fr-FR")}\n\n`;
        
        progressText += `📋 *Étapes:*\n`;
        TUTORIAL_STEPS.forEach((step, i) => {
          const status = userProgress.completedSteps.includes(i + 1) ? "✅" : 
                        (i + 1 === userProgress.currentStep ? "🔵" : "⚪");
          progressText += `${status} ${i + 1}. ${step.title.replace(/[^\w\s]/g, '')}\n`;
        });

        progressText += `\n💡 Tapez .tuto next pour continuer`;
        repondre(progressText);

      } else if (subCommand === "list") {
        // Liste des étapes
        let listText = `📋 *ÉTAPES DU TUTORIEL*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        TUTORIAL_STEPS.forEach((step, i) => {
          listText += `${i + 1}. ${step.title}\n`;
        });

        listText += `\n💡 Utilisez .tuto goto [numéro] pour aller à une étape`;
        repondre(listText);

      } else if (subCommand === "reset") {
        // Réinitialiser le tutoriel
        db.usersProgress[number] = {
          currentStep: 0,
          startedAt: new Date().toISOString(),
          completedSteps: []
        };
        saveTutorialDB(db);
        repondre("🔄 Tutoriel réinitialisé! Tapez .tuto start pour recommencer.");

      } else {
        // Aide
        repondre(`📚 *TUTORIEL HANI-MD*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 *Commandes:*\n.tuto start - Démarrer/Reprendre\n.tuto next - Étape suivante\n.tuto prev - Étape précédente\n.tuto goto [n] - Aller à l'étape n\n.tuto progress - Voir votre progression\n.tuto list - Liste des étapes\n.tuto reset - Recommencer\n\n💡 Le tutoriel dure environ 5 minutes`);
      }

    } catch (error) {
      console.error("[TUTO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🆕 GUIDE RAPIDE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "quickstart",
    classe: "Tutorial",
    react: "🚀",
    desc: "Guide rapide pour bien démarrer",
    alias: ["demarrer", "quick", "debut"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quickGuide = `🚀 *GUIDE RAPIDE HANI-MD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *COMMANDES ESSENTIELLES:*

🔹 .menu - Voir toutes les commandes
🔹 .help [cmd] - Aide sur une commande
🔹 .ping - Vérifier si le bot répond

📥 *TÉLÉCHARGEMENTS:*

🔹 .play [titre] - Musique
🔹 .ytmp4 [lien] - Vidéo YouTube
🔹 .tiktok [lien] - TikTok

🎨 *MÉDIAS:*

🔹 .sticker - Créer un sticker
🔹 .toimg - Sticker → Image

🤖 *IA:*

🔹 .gpt [question] - Chat IA
🔹 .dalle [desc] - Générer image

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Tutoriel complet: .tuto start
❓ Aide: .faq | .contact`;

      repondre(quickGuide);

    } catch (error) {
      console.error("[QUICKSTART]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❓ AIDE SUR UNE COMMANDE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "cmdhelp",
    classe: "Tutorial",
    react: "❓",
    desc: "Obtenir de l'aide sur une commande spécifique",
    alias: ["helpme", "comment"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const cmdName = arg[0]?.toLowerCase();

      if (!cmdName) {
        return repondre(`❓ *AIDE COMMANDES*\n\nUtilisation: .cmdhelp [nom_commande]\n\nExemple: .cmdhelp sticker`);
      }

      // Base de données d'aide détaillée
      const helpDatabase = {
        sticker: {
          title: "🎨 Commande Sticker",
          usage: ".sticker [pack] [author]",
          examples: [
            ".sticker - Créer un sticker basique",
            ".sticker MonPack - Avec nom de pack",
            ".sticker MonPack Moi - Avec auteur"
          ],
          tips: "Répondez à une image ou envoyez-en une avec la commande",
          related: ["toimg", "steal"]
        },
        play: {
          title: "🎵 Commande Play",
          usage: ".play [titre de la chanson]",
          examples: [
            ".play Rema Calm Down",
            ".play Fally Ipupa Eloko Oyo"
          ],
          tips: "Le bot cherche et envoie l'audio automatiquement",
          related: ["ytmp3", "ytmp4"]
        },
        menu: {
          title: "📋 Commande Menu",
          usage: ".menu [catégorie]",
          examples: [
            ".menu - Menu complet",
            ".menu download - Catégorie téléchargement",
            ".menu group - Catégorie groupe"
          ],
          tips: "Utilisez les alias: m, aide, commandes",
          related: ["help", "quickstart"]
        },
        gpt: {
          title: "🤖 Commande GPT",
          usage: ".gpt [votre question]",
          examples: [
            ".gpt Comment faire un gâteau?",
            ".gpt Explique la photosynthèse"
          ],
          tips: "Soyez précis dans vos questions pour de meilleures réponses",
          related: ["dalle", "translate"]
        }
      };

      const help = helpDatabase[cmdName];

      if (!help) {
        return repondre(`❌ Pas d'aide détaillée pour "${cmdName}".\n\nCommandes avec aide: ${Object.keys(helpDatabase).join(", ")}\n\nOu utilisez .menu pour voir toutes les commandes.`);
      }

      let helpText = `${help.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      helpText += `📝 *Usage:* ${help.usage}\n\n`;
      helpText += `📌 *Exemples:*\n`;
      help.examples.forEach(ex => {
        helpText += `• ${ex}\n`;
      });
      helpText += `\n💡 *Astuce:* ${help.tips}\n`;
      
      if (help.related.length > 0) {
        helpText += `\n🔗 *Commandes similaires:* ${help.related.join(", ")}`;
      }

      repondre(helpText);

    } catch (error) {
      console.error("[CMDHELP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Tutorial.js chargé - Commandes: tuto, quickstart, cmdhelp");
