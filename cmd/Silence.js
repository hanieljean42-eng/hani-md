/**
 * ═══════════════════════════════════════════════════════════
 * 🔇 HANI-MD - Mode Silence
 * ═══════════════════════════════════════════════════════════
 * Pause sélective sans bloquer
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const SILENCE_FILE = path.join(__dirname, "../DataBase/silence_mode.json");

function loadSilence() {
  try {
    if (fs.existsSync(SILENCE_FILE)) {
      return JSON.parse(fs.readFileSync(SILENCE_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveSilence(data) {
  try {
    fs.writeFileSync(SILENCE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function isSilenced(userId, chatId) {
  const silence = loadSilence();
  if (!silence[userId]) return false;

  const now = new Date();
  const userSilence = silence[userId];

  // Vérifier silence global
  if (userSilence.global && new Date(userSilence.global.until) > now) {
    return true;
  }

  // Vérifier silence spécifique au chat
  if (userSilence.chats && userSilence.chats[chatId]) {
    if (new Date(userSilence.chats[chatId].until) > now) {
      return true;
    }
  }

  // Vérifier silence par contact
  const contactId = chatId.includes("@g.us") ? chatId : chatId;
  if (userSilence.contacts && userSilence.contacts[contactId]) {
    if (new Date(userSilence.contacts[contactId].until) > now) {
      return true;
    }
  }

  return false;
}

function parseDuration(input) {
  const now = new Date();

  if (input.includes("h")) {
    const hours = parseInt(input.replace(/[^0-9]/g, "")) || 1;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
  if (input.includes("min") || input === "m") {
    const mins = parseInt(input.replace(/[^0-9]/g, "")) || 30;
    return new Date(now.getTime() + mins * 60 * 1000);
  }
  if (input.includes("j")) {
    const days = parseInt(input.replace(/[^0-9]/g, "")) || 1;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Défaut: 1 heure
  return new Date(now.getTime() + 60 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════════
// 🔇 ACTIVER MODE SILENCE POUR UN CONTACT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "silence",
    classe: "Confidentialité",
    react: "🔇",
    desc: "Ignorer un contact temporairement",
    alias: ["mute", "dnd", "busy"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage, superUser }) => {
    try {
      // Format: .silence @contact 2h
      // Format: .silence 2h (pour le chat actuel)
      // Format: .silence @contact (défaut 1h)

      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      let targetId, duration;

      // Détecter le format
      const mentionMatch = arg.join(" ").match(/@(\d+)/);
      
      if (mentionMatch) {
        targetId = mentionMatch[1] + "@s.whatsapp.net";
        const remaining = arg.filter(a => !a.includes("@")).join(" ");
        duration = remaining || "1h";
      } else if (arg[0]?.includes("h") || arg[0]?.includes("min") || arg[0]?.includes("j")) {
        duration = arg[0];
        targetId = msg.key.remoteJid;
      } else {
        targetId = msg.key.remoteJid;
        duration = "1h";
      }

      const until = parseDuration(duration);
      const untilStr = until.toLocaleString("fr-FR", { 
        hour: "2-digit", 
        minute: "2-digit",
        day: "numeric",
        month: "short"
      });

      const silence = loadSilence();
      if (!silence[auteurMessage]) silence[auteurMessage] = {};
      if (!silence[auteurMessage].contacts) silence[auteurMessage].contacts = {};
      if (!silence[auteurMessage].chats) silence[auteurMessage].chats = {};

      // Déterminer si c'est un groupe ou un contact
      if (targetId.includes("@g.us")) {
        silence[auteurMessage].chats[targetId] = { until: until.toISOString(), setAt: new Date().toISOString() };
      } else {
        silence[auteurMessage].contacts[targetId] = { until: until.toISOString(), setAt: new Date().toISOString() };
      }

      saveSilence(silence);

      const targetName = targetId.includes("@g.us") ? "ce groupe" : targetId.split("@")[0];
      repondre(`🔇 *Mode Silence activé*\n\n👤 Cible: ${targetName}\n⏱️ Jusqu'à: ${untilStr}\n\n💡 Le bot ignorera les messages de cette conversation jusqu'à la fin du silence.\n\n📋 Voir les silences actifs: .silencestatus`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔕 SILENCE GLOBAL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "silenceall",
    classe: "Confidentialité",
    react: "🔕",
    desc: "Ignorer tous les messages (mode DND global)",
    alias: ["dndall", "muteglobal"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const duration = arg[0] || "2h";
      const until = parseDuration(duration);
      const untilStr = until.toLocaleString("fr-FR", { 
        hour: "2-digit", 
        minute: "2-digit",
        day: "numeric",
        month: "short"
      });

      const silence = loadSilence();
      if (!silence[auteurMessage]) silence[auteurMessage] = {};

      silence[auteurMessage].global = {
        until: until.toISOString(),
        setAt: new Date().toISOString()
      };

      saveSilence(silence);

      repondre(`🔕 *Silence Global activé*\n\n⏱️ Jusqu'à: ${untilStr}\n\n🔇 Le bot ignorera TOUTES les conversations jusqu'à cette heure.\n\n⚠️ Seules les commandes owner resteront actives.\n\n📋 Vérifier: .silencestatus\n❌ Désactiver: .unsilenceall`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔊 DÉSACTIVER SILENCE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "unsilence",
    classe: "Confidentialité",
    react: "🔊",
    desc: "Désactiver le mode silence",
    alias: ["unmute", "canceldnd"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const target = arg[0];
      const silence = loadSilence();

      if (!silence[auteurMessage]) {
        return repondre("🔊 Aucun silence actif");
      }

      let removed = false;

      // Désactiver tout
      if (!target) {
        silence[auteurMessage] = {};
        removed = true;
      } else if (target === "all") {
        silence[auteurMessage] = {};
        removed = true;
      } else if (target.includes("@")) {
        // Désactiver pour un contact spécifique
        const targetId = target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        if (silence[auteurMessage].contacts?.[targetId]) {
          delete silence[auteurMessage].contacts[targetId];
          removed = true;
        }
      }

      saveSilence(silence);

      if (removed) {
        repondre(`🔊 *Silence désactivé!*\n\n✅ Le bot répondra normalement aux messages.`);
      } else {
        repondre(`❌ Aucun silence trouvé pour "${target}"`);
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 STATUT SILENCE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "silencestatus",
    classe: "Confidentialité",
    react: "📋",
    desc: "Voir les silences actifs",
    alias: ["silenceinfo", "dndstatus"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const silence = loadSilence();
      const mySilence = silence[auteurMessage];

      if (!mySilence) {
        return repondre("📋 *Mode Silence*\n\nAucun silence actif.\n\n💡 Utilisez:\n• .silence @contact 2h\n• .silenceall 3h");
      }

      const now = new Date();
      let text = `📋 *Silences Actifs*\n\n`;
      let hasActive = false;

      // Silence global
      if (mySilence.global && new Date(mySilence.global.until) > now) {
        const until = new Date(mySilence.global.until);
        text += `🔕 *GLOBAL*\n   Jusqu'à: ${until.toLocaleString("fr-FR")}\n\n`;
        hasActive = true;
      }

      // Silences par contact
      if (mySilence.contacts) {
        for (const [id, data] of Object.entries(mySilence.contacts)) {
          if (new Date(data.until) > now) {
            const until = new Date(data.until);
            text += `👤 ${id.split("@")[0]}\n   Jusqu'à: ${until.toLocaleTimeString("fr-FR")}\n\n`;
            hasActive = true;
          }
        }
      }

      // Silences par groupe
      if (mySilence.chats) {
        for (const [id, data] of Object.entries(mySilence.chats)) {
          if (new Date(data.until) > now) {
            const until = new Date(data.until);
            text += `👥 Groupe\n   Jusqu'à: ${until.toLocaleTimeString("fr-FR")}\n\n`;
            hasActive = true;
          }
        }
      }

      if (!hasActive) {
        text += `Aucun silence actif actuellement.\n\n`;
      }

      text += `💡 Désactiver: .unsilence`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

module.exports = { isSilenced };

console.log("[CMD] ✅ Silence.js chargé - Commandes: silence, silenceall, unsilence, silencestatus");
