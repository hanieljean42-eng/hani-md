/**
 * ═══════════════════════════════════════════════════════════
 * 💾 HANI-MD - Sauvegarde Auto Médias
 * ═══════════════════════════════════════════════════════════
 * Plus jamais de photo/vidéo perdue
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const AUTOSAVE_FILE = path.join(__dirname, "../DataBase/autosave_config.json");
const SAVE_DIR = path.join(__dirname, "../Downloads/AutoSave");

function loadAutoSave() {
  try {
    if (fs.existsSync(AUTOSAVE_FILE)) {
      return JSON.parse(fs.readFileSync(AUTOSAVE_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveAutoSave(data) {
  try {
    fs.writeFileSync(AUTOSAVE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function ensureSaveDir() {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }
}

function isAutoSaveEnabled(ownerId, chatId) {
  const config = loadAutoSave();
  if (!config[ownerId]) return false;

  // Global
  if (config[ownerId].global) return true;

  // Spécifique au chat
  if (config[ownerId].chats?.includes(chatId)) return true;

  // Par contact
  if (config[ownerId].contacts?.includes(chatId)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════
// 💾 ACTIVER SAUVEGARDE AUTO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autosave",
    classe: "Outils",
    react: "💾",
    desc: "Sauvegarder automatiquement les médias reçus",
    alias: ["autodownload", "savemedia"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const target = arg[0] || "on";
      const config = loadAutoSave();
      if (!config[auteurMessage]) config[auteurMessage] = {};

      let response = "";

      if (target === "on" || target === "global") {
        config[auteurMessage].global = true;
        delete config[auteurMessage].chats;
        delete config[auteurMessage].contacts;
        response = "✅ *Sauvegarde auto GLOBALE activée!*\n\n💾 Tous les médias reçus seront sauvegardés.\n\n📁 Emplacement: Downloads/AutoSave/\n\n⚠️ Cela peut prendre beaucoup d'espace disque.";
      } else if (target === "off") {
        config[auteurMessage] = {};
        response = "🔴 *Sauvegarde auto désactivée*\n\nLes médias ne seront plus sauvegardés automatiquement.";
      } else if (target.includes("@")) {
        // Sauvegarde pour un contact spécifique
        const contactId = target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        if (!config[auteurMessage].contacts) config[auteurMessage].contacts = [];
        if (!config[auteurMessage].contacts.includes(contactId)) {
          config[auteurMessage].contacts.push(contactId);
        }
        response = `✅ *Sauvegarde activée pour ${contactId.split("@")[0]}*\n\n💾 Seuls les médias de ce contact seront sauvegardés.`;
      } else {
        // Sauvegarde pour le chat actuel
        const chatId = msg.key.remoteJid;
        if (!config[auteurMessage].chats) config[auteurMessage].chats = [];
        if (!config[auteurMessage].chats.includes(chatId)) {
          config[auteurMessage].chats.push(chatId);
        }
        response = `✅ *Sauvegarde activée pour ce chat*\n\n💾 Les médias de cette conversation seront sauvegardés.`;
      }

      saveAutoSave(config);
      ensureSaveDir();

      repondre(response);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 STATUT SAUVEGARDE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "savestatus",
    classe: "Outils",
    react: "📋",
    desc: "Voir la configuration de sauvegarde",
    alias: ["autosaveinfo"]
  },
  async (ovl, msg, { repondre, auteurMessage, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const config = loadAutoSave();
      const myConfig = config[auteurMessage];

      if (!myConfig || (!myConfig.global && !myConfig.chats && !myConfig.contacts)) {
        return repondre("💾 *Sauvegarde Auto*\n\nStatus: *DÉSACTIVÉE*\n\n💡 Activer:\n• .autosave on (global)\n• .autosave @contact (spécifique)");
      }

      let text = `💾 *Sauvegarde Auto*\n\n`;
      text += `Status: *${myConfig.global ? 'GLOBAL 🌍' : 'PARTIEL'}*\n\n`;

      if (myConfig.global) {
        text += `🌍 Tous les médias sont sauvegardés\n\n`;
      }

      if (myConfig.contacts?.length > 0) {
        text += `👤 Contacts surveillés (${myConfig.contacts.length}):\n`;
        myConfig.contacts.forEach(c => {
          text += `   • ${c.split("@")[0]}\n`;
        });
        text += `\n`;
      }

      if (myConfig.chats?.length > 0) {
        text += `👥 Groupes surveillés (${myConfig.chats.length}):\n`;
        myConfig.chats.forEach(c => {
          text += `   • ${c.includes("@g.us") ? 'Groupe' : 'Chat'}\n`;
        });
      }

      // Voir l'espace utilisé
      ensureSaveDir();
      const files = fs.readdirSync(SAVE_DIR);
      const totalFiles = files.length;

      text += `\n📁 Fichiers sauvegardés: ${totalFiles}\n`;
      text += `📂 Emplacement: Downloads/AutoSave/\n\n`;
      text += `💡 Désactiver: .autosave off`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📂 VOIR LES MÉDIAS SAUVEGARDÉS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "savedmedia",
    classe: "Outils",
    react: "📂",
    desc: "Lister les médias sauvegardés",
    alias: ["medias", "downloads"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      ensureSaveDir();
      const files = fs.readdirSync(SAVE_DIR).slice(-20).reverse();

      if (files.length === 0) {
        return repondre("📂 *Médias Sauvegardés*\n\nAucun fichier trouvé.\n\n💡 Activez la sauvegarde avec .autosave on");
      }

      let text = `📂 *Derniers Médias (${files.length})*\n\n`;
      files.slice(0, 10).forEach((f, i) => {
        text += `${i + 1}. ${f}\n`;
      });

      if (files.length > 10) {
        text += `\n... et ${files.length - 10} autres\n`;
      }

      text += `\n📁 Emplacement complet: Downloads/AutoSave/`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// Fonction helper pour sauvegarder un média
async function saveMedia(buffer, filename, type) {
  ensureSaveDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const finalName = `${type}_${timestamp}_${safeName}`;
  const filepath = path.join(SAVE_DIR, finalName);

  try {
    fs.writeFileSync(filepath, buffer);
    return finalName;
  } catch (e) {
    console.error("[AUTOSAVE] Erreur sauvegarde:", e);
    return null;
  }
}

module.exports = { isAutoSaveEnabled, saveMedia };

console.log("[CMD] ✅ AutoSave.js chargé - Commandes: autosave, savestatus, savedmedia");
