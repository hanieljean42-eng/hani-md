/**
 * ═══════════════════════════════════════════════════════════
 * 📤 HANI-MD - Export de Conversations
 * ═══════════════════════════════════════════════════════════
 * Archivez vos conversations importantes
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "../DataBase/chat_history.json");
const EXPORT_DIR = path.join(__dirname, "../Exports");

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTER EN TXT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "export",
    classe: "Outils",
    react: "📤",
    desc: "Exporter ce chat (txt, json)",
    alias: ["exportchat", "backupchat"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const format = arg[0] || "txt";
      const chatId = msg.key.remoteJid;

      if (!["txt", "json"].includes(format)) {
        return repondre("❌ Formats supportés: txt, json\n\n💡 Utilisation: .export txt");
      }

      const history = loadHistory();
      const chatHistory = history[chatId] || [];

      if (chatHistory.length === 0) {
        return repondre("📤 *Export*\n\nAucun historique disponible pour ce chat.");
      }

      ensureExportDir();
      const timestamp = new Date().toISOString().split("T")[0];
      const chatName = chatId.includes("@g.us") ? "Groupe" : chatId.split("@")[0];
      const filename = `${chatName}_${timestamp}.${format}`;
      const filepath = path.join(EXPORT_DIR, filename);

      if (format === "txt") {
        let content = `📤 EXPORT WHATSAPP\n`;
        content += `═══════════════════════════════════════\n\n`;
        content += `Chat: ${chatName}\n`;
        content += `Date export: ${new Date().toLocaleString("fr-FR")}\n`;
        content += `Messages: ${chatHistory.length}\n\n`;
        content += `═══════════════════════════════════════\n\n`;

        chatHistory.forEach(m => {
          const time = new Date(m.time).toLocaleString("fr-FR");
          const sender = m.sender.split("@")[0];
          content += `[${time}] ${sender}:\n${m.text}\n\n`;
        });

        fs.writeFileSync(filepath, content, "utf8");
      } else {
        const exportData = {
          chatId,
          chatName,
          exportDate: new Date().toISOString(),
          messageCount: chatHistory.length,
          messages: chatHistory
        };
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), "utf8");
      }

      // Envoyer le fichier
      await ovl.sendMessage(msg.key.remoteJid, {
        document: fs.readFileSync(filepath),
        fileName: filename,
        mimetype: format === "txt" ? "text/plain" : "application/json",
        caption: `📤 Export ${format.toUpperCase()} de ${chatHistory.length} messages`
      });

      repondre(`✅ *Export réussi!*\n\n📁 Fichier: ${filename}\n💬 Messages: ${chatHistory.length}\n📂 Format: ${format.toUpperCase()}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTER LES EXPORTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "exports",
    classe: "Outils",
    react: "📋",
    desc: "Voir vos exports disponibles",
    alias: ["myexports", "listexports"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      ensureExportDir();
      const files = fs.readdirSync(EXPORT_DIR);

      if (files.length === 0) {
        return repondre("📋 *Vos Exports*\n\nAucun export trouvé.\n\n💡 Créer un export: .export txt");
      }

      let text = `📋 *Vos Exports (${files.length})*\n\n`;
      files.forEach((f, i) => {
        const stats = fs.statSync(path.join(EXPORT_DIR, f));
        const size = (stats.size / 1024).toFixed(1);
        text += `${i + 1}. 📄 ${f}\n   📦 ${size} KB\n\n`;
      });

      text += `💡 Télécharger: Envoyez le numéro de l'export`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UN EXPORT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delexport",
    classe: "Outils",
    react: "🗑️",
    desc: "Supprimer un fichier d'export",
    alias: ["deleteexport"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const filename = arg[0];
      if (!filename) {
        return repondre("❌ Utilisation: .delexport [nom_du_fichier]");
      }

      ensureExportDir();
      const filepath = path.join(EXPORT_DIR, filename);

      if (!fs.existsSync(filepath)) {
        return repondre(`❌ Fichier "${filename}" introuvable\n\n💡 Voir les exports: .exports`);
      }

      fs.unlinkSync(filepath);
      repondre(`✅ *Export supprimé:* ${filename}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ ExportChat.js chargé - Commandes: export, exports, delexport");
