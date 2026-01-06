/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Système Autoreply Avancé
 * ═══════════════════════════════════════════════════════════
 * Réponses automatiques intelligentes pour engager vos contacts
 * Gestion des déclencheurs, réponses multiples, statistiques
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

// Base de données Autoreply
const AUTOREPLY_DB_PATH = path.join(__dirname, "../DataBase/autoreply_advanced.json");

// Charger/Sauvegarder la DB
function loadAutoreplyDB() {
  try {
    if (fs.existsSync(AUTOREPLY_DB_PATH)) {
      return JSON.parse(fs.readFileSync(AUTOREPLY_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    replies: {},
    settings: {
      enabled: true,
      caseSensitive: false,
      partialMatch: true,
      cooldown: 5, // secondes entre réponses
      maxRepliesPerMessage: 1
    },
    stats: {
      totalTriggers: 0,
      topTriggers: {}
    },
    welcomeEnabled: false,
    welcomeMessage: "👋 Bonjour {name}! Bienvenue! Comment puis-je vous aider?",
    awayEnabled: false,
    awayMessage: "🕐 Je suis actuellement absent. Je vous répondrai dès que possible!",
    awaySchedule: { start: "22:00", end: "08:00" }
  };
}

function saveAutoreplyDB(data) {
  try {
    fs.writeFileSync(AUTOREPLY_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error("[AUTOREPLY] Erreur sauvegarde:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// ➕ AJOUTER UNE RÉPONSE AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "addreply",
    classe: "Autoreply",
    react: "➕",
    desc: "Ajouter une réponse automatique",
    alias: ["autoreply", "ar", "ajoutreponse"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      // Format: .addreply trigger|réponse
      const fullText = arg.join(" ");
      const parts = fullText.split("|");
      
      if (parts.length < 2) {
        return repondre(`❌ *Format invalide!*\n\n📝 Utilisation:\n.addreply [déclencheur]|[réponse]\n\n📌 Exemple:\n.addreply salut|Salut! Comment vas-tu? 😊\n.addreply prix|Nos prix commencent à 5000 FCFA`);
      }

      const trigger = parts[0].trim().toLowerCase();
      const response = parts.slice(1).join("|").trim();

      if (!trigger || !response) {
        return repondre("❌ Le déclencheur et la réponse ne peuvent pas être vides");
      }

      const db = loadAutoreplyDB();
      
      db.replies[trigger] = {
        response: response,
        createdAt: new Date().toISOString(),
        triggerCount: 0,
        type: "text"
      };

      saveAutoreplyDB(db);

      repondre(`✅ *Réponse automatique ajoutée!*\n\n🎯 Déclencheur: "${trigger}"\n💬 Réponse: "${response}"\n\n📌 Quand quelqu'un dit "${trigger}", le bot répondra automatiquement.`);

    } catch (error) {
      console.error("[ADDREPLY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ➖ SUPPRIMER UNE RÉPONSE AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delreply",
    classe: "Autoreply",
    react: "🗑️",
    desc: "Supprimer une réponse automatique",
    alias: ["deletereply", "removereply", "suppreponse"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const trigger = arg.join(" ").toLowerCase();
      
      if (!trigger) {
        return repondre("❌ Utilisation: .delreply [déclencheur]");
      }

      const db = loadAutoreplyDB();

      if (!db.replies[trigger]) {
        return repondre(`❌ Aucune réponse trouvée pour "${trigger}"`);
      }

      delete db.replies[trigger];
      saveAutoreplyDB(db);

      repondre(`✅ Réponse automatique "${trigger}" supprimée!`);

    } catch (error) {
      console.error("[DELREPLY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES RÉPONSES AUTOMATIQUES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "listreply",
    classe: "Autoreply",
    react: "📋",
    desc: "Voir toutes les réponses automatiques",
    alias: ["replies", "showreplies", "listreponses"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadAutoreplyDB();
      const replies = Object.entries(db.replies);

      if (replies.length === 0) {
        return repondre("📭 Aucune réponse automatique configurée.\n\nAjoutez-en avec: .addreply [trigger]|[réponse]");
      }

      let listText = `📋 *RÉPONSES AUTOMATIQUES*\n━━━━━━━━━━━━━━━━━\n\n`;
      listText += `📊 Total: ${replies.length} réponses\n`;
      listText += `⚙️ Statut: ${db.settings.enabled ? "✅ Activé" : "❌ Désactivé"}\n\n`;

      replies.forEach(([trigger, data], index) => {
        const shortResponse = data.response.length > 30 
          ? data.response.substring(0, 30) + "..." 
          : data.response;
        listText += `${index + 1}. 🎯 *"${trigger}"*\n   💬 ${shortResponse}\n   📈 Utilisé: ${data.triggerCount || 0} fois\n\n`;
      });

      repondre(listText);

    } catch (error) {
      console.error("[LISTREPLY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ⚙️ TOGGLE AUTOREPLY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "togglereply",
    classe: "Autoreply",
    react: "⚙️",
    desc: "Activer/désactiver les réponses automatiques",
    alias: ["autoreplyoff", "autoreplyon", "switchreply"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();
      const db = loadAutoreplyDB();

      if (action === "on" || action === "1") {
        db.settings.enabled = true;
        saveAutoreplyDB(db);
        repondre("✅ *Réponses automatiques activées!*");
      } else if (action === "off" || action === "0") {
        db.settings.enabled = false;
        saveAutoreplyDB(db);
        repondre("❌ *Réponses automatiques désactivées!*");
      } else {
        const status = db.settings.enabled ? "✅ Activé" : "❌ Désactivé";
        repondre(`⚙️ *Statut actuel:* ${status}\n\nUtilisation: .togglereply on/off`);
      }

    } catch (error) {
      console.error("[TOGGLEREPLY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👋 MESSAGE DE BIENVENUE AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "welcomemsg",
    classe: "Autoreply",
    react: "👋",
    desc: "Configurer le message de bienvenue automatique",
    alias: ["setwelcome", "bienvenue", "autowelcome"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();
      const message = arg.slice(1).join(" ");

      if (!subCommand) {
        return repondre(`👋 *Configuration Bienvenue*\n\n.welcomemsg on - Activer\n.welcomemsg off - Désactiver\n.welcomemsg set [message] - Définir le message\n.welcomemsg show - Voir le message actuel\n\n📌 Variables disponibles:\n{name} - Nom du contact\n{number} - Numéro\n{time} - Heure actuelle`);
      }

      const db = loadAutoreplyDB();

      if (subCommand === "on") {
        db.welcomeEnabled = true;
        saveAutoreplyDB(db);
        repondre("✅ Message de bienvenue activé!");
      } else if (subCommand === "off") {
        db.welcomeEnabled = false;
        saveAutoreplyDB(db);
        repondre("❌ Message de bienvenue désactivé!");
      } else if (subCommand === "set" && message) {
        db.welcomeMessage = message;
        saveAutoreplyDB(db);
        repondre(`✅ Message de bienvenue mis à jour:\n\n"${message}"`);
      } else if (subCommand === "show") {
        const status = db.welcomeEnabled ? "✅ Activé" : "❌ Désactivé";
        repondre(`👋 *Message de bienvenue*\n\nStatut: ${status}\n\n💬 Message:\n${db.welcomeMessage}`);
      } else {
        repondre("❌ Sous-commande invalide");
      }

    } catch (error) {
      console.error("[WELCOMEMSG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🕐 MESSAGE D'ABSENCE AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "awaymsg",
    classe: "Autoreply",
    react: "🕐",
    desc: "Configurer le message d'absence",
    alias: ["setaway", "absence", "autoaway"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();
      const value = arg.slice(1).join(" ");

      if (!subCommand) {
        return repondre(`🕐 *Configuration Absence*\n\n.awaymsg on - Activer\n.awaymsg off - Désactiver\n.awaymsg set [message] - Définir le message\n.awaymsg schedule [HH:MM-HH:MM] - Horaires\n.awaymsg show - Voir la config\n\n📌 Variables: {name}, {number}, {time}`);
      }

      const db = loadAutoreplyDB();

      if (subCommand === "on") {
        db.awayEnabled = true;
        saveAutoreplyDB(db);
        repondre("✅ Message d'absence activé!");
      } else if (subCommand === "off") {
        db.awayEnabled = false;
        saveAutoreplyDB(db);
        repondre("❌ Message d'absence désactivé!");
      } else if (subCommand === "set" && value) {
        db.awayMessage = value;
        saveAutoreplyDB(db);
        repondre(`✅ Message d'absence mis à jour:\n\n"${value}"`);
      } else if (subCommand === "schedule" && value) {
        const times = value.split("-");
        if (times.length === 2) {
          db.awaySchedule = { start: times[0].trim(), end: times[1].trim() };
          saveAutoreplyDB(db);
          repondre(`✅ Horaires d'absence: ${times[0].trim()} - ${times[1].trim()}`);
        } else {
          repondre("❌ Format: HH:MM-HH:MM (ex: 22:00-08:00)");
        }
      } else if (subCommand === "show") {
        const status = db.awayEnabled ? "✅ Activé" : "❌ Désactivé";
        repondre(`🕐 *Configuration Absence*\n\nStatut: ${status}\nHoraires: ${db.awaySchedule.start} - ${db.awaySchedule.end}\n\n💬 Message:\n${db.awayMessage}`);
      } else {
        repondre("❌ Sous-commande invalide");
      }

    } catch (error) {
      console.error("[AWAYMSG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES AUTOREPLY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "replystats",
    classe: "Autoreply",
    react: "📊",
    desc: "Voir les statistiques des réponses automatiques",
    alias: ["statreplies", "autoreplystat"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadAutoreplyDB();
      const replies = Object.entries(db.replies);
      const totalTriggers = replies.reduce((sum, [_, data]) => sum + (data.triggerCount || 0), 0);

      // Trouver les plus utilisés
      const sorted = replies
        .filter(([_, data]) => data.triggerCount > 0)
        .sort((a, b) => (b[1].triggerCount || 0) - (a[1].triggerCount || 0))
        .slice(0, 5);

      let statsText = `📊 *STATISTIQUES AUTOREPLY*\n━━━━━━━━━━━━━━━━━\n\n`;
      statsText += `📋 Total réponses: ${replies.length}\n`;
      statsText += `🎯 Total déclenchements: ${totalTriggers}\n`;
      statsText += `⚙️ Statut: ${db.settings.enabled ? "✅ Activé" : "❌ Désactivé"}\n`;
      statsText += `👋 Bienvenue: ${db.welcomeEnabled ? "✅" : "❌"}\n`;
      statsText += `🕐 Absence: ${db.awayEnabled ? "✅" : "❌"}\n\n`;

      if (sorted.length > 0) {
        statsText += `🏆 *TOP 5 DÉCLENCHEURS:*\n`;
        sorted.forEach(([trigger, data], index) => {
          statsText += `${index + 1}. "${trigger}" - ${data.triggerCount} fois\n`;
        });
      }

      repondre(statsText);

    } catch (error) {
      console.error("[REPLYSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔍 FONCTION POUR TRAITER LES MESSAGES (À INTÉGRER)
// ═══════════════════════════════════════════════════════════

/**
 * Vérifie et répond automatiquement à un message
 * Cette fonction doit être appelée dans le gestionnaire de messages
 */
async function checkAndAutoReply(ovl, msg, messageText, senderName) {
  try {
    const db = loadAutoreplyDB();
    
    if (!db.settings.enabled) return false;
    
    const lowerText = db.settings.caseSensitive ? messageText : messageText.toLowerCase();
    
    for (const [trigger, data] of Object.entries(db.replies)) {
      const matchTrigger = db.settings.caseSensitive ? trigger : trigger.toLowerCase();
      
      const matches = db.settings.partialMatch 
        ? lowerText.includes(matchTrigger)
        : lowerText === matchTrigger;
      
      if (matches) {
        // Remplacer les variables
        let response = data.response
          .replace(/{name}/g, senderName || "Ami")
          .replace(/{time}/g, new Date().toLocaleTimeString("fr-FR"))
          .replace(/{date}/g, new Date().toLocaleDateString("fr-FR"));
        
        await ovl.sendMessage(msg.key.remoteJid, { text: response });
        
        // Mettre à jour les stats
        data.triggerCount = (data.triggerCount || 0) + 1;
        saveAutoreplyDB(db);
        
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error("[AUTOREPLY-CHECK]", e);
    return false;
  }
}

module.exports = {
  checkAndAutoReply,
  loadAutoreplyDB,
  saveAutoreplyDB
};

console.log("[CMD] ✅ Autoreply.js chargé - Commandes: addreply, delreply, listreply, togglereply, welcomemsg, awaymsg, replystats");
