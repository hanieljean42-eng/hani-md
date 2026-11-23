/**
 * ═══════════════════════════════════════════════════════════
 * 🔍 HANI-MD - Recherche dans les Messages
 * ═══════════════════════════════════════════════════════════
 * Retrouvez n'importe quel message rapidement
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "../DataBase/chat_history.json");

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

// ═══════════════════════════════════════════════════════════
// 🔍 CHERCHER DANS LES MESSAGES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "chercher",
    classe: "Outils",
    react: "🔍",
    desc: "Chercher un mot dans l'historique",
    alias: ["search", "find", "grep"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const query = arg.join(" ").toLowerCase();
      if (!query) {
        return repondre("❌ Utilisation: .chercher [mot-clé]\n\n📌 Exemples:\n.chercher contrat\n.chercher @contact photo\n.chercher lien https");
      }

      const history = loadHistory();
      const currentChat = msg.key.remoteJid;
      const results = [];

      // Chercher dans tous les chats
      for (const [chatId, messages] of Object.entries(history)) {
        const found = messages.filter(m => 
          m.text.toLowerCase().includes(query)
        );

        found.forEach(m => {
          results.push({
            chatId,
            ...m
          });
        });
      }

      if (results.length === 0) {
        return repondre(`🔍 Aucun résultat pour "${query}"`);
      }

      // Limiter les résultats
      const limited = results.slice(-10);

      let text = `🔍 *Résultats pour "${query}"* (${results.length} trouvés)\n\n`;
      
      limited.forEach((r, i) => {
        const chatName = r.chatId.includes("@g.us") ? "Groupe" : r.chatId.split("@")[0];
        const time = new Date(r.time).toLocaleString("fr-FR", { 
          day: "numeric", 
          month: "short", 
          hour: "2-digit", 
          minute: "2-digit" 
        });
        const snippet = r.text.length > 60 ? r.text.substring(0, 60) + "..." : r.text;

        text += `${i + 1}. 👤 ${r.sender.split("@")[0]}\n`;
        text += `   📍 ${chatName} | ${time}\n`;
        text += `   💬 "${snippet}"\n\n`;
      });

      if (results.length > 10) {
        text += `... et ${results.length - 10} autres résultats\n\n`;
      }

      text += `💡 Résultats limités aux 10 plus récents`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 CHERCHER DES MÉDIAS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "cherchemedia",
    classe: "Outils",
    react: "📸",
    desc: "Chercher des photos/vidéos envoyées par un contact",
    alias: ["findmedia", "searchmedia"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const contact = arg[0];
      if (!contact) {
        return repondre("❌ Utilisation: .cherchemedia @contact\n\n💡 Exemple: .cherchemedia @22501234567");
      }

      const contactId = contact.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      const history = loadHistory();

      // Chercher les messages avec "image" ou "video" ou des liens médias
      const results = [];
      for (const [chatId, messages] of Object.entries(history)) {
        const found = messages.filter(m => 
          m.sender === contactId && 
          (m.text.includes("image") || m.text.includes("video") || m.text.includes("http"))
        );
        found.forEach(m => results.push({ chatId, ...m }));
      }

      if (results.length === 0) {
        return repondre(`📸 Aucun média trouvé pour ${contact.split("@")[0]}`);
      }

      let text = `📸 *Médias de ${contact.split("@")[0]}* (${results.length})\n\n`;
      results.slice(-5).forEach((r, i) => {
        const time = new Date(r.time).toLocaleString("fr-FR");
        text += `${i + 1}. 📅 ${time}\n   💬 ${r.text.substring(0, 50)}...\n\n`;
      });

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 CHERCHER DES LIENS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "chercherlien",
    classe: "Outils",
    react: "🔗",
    desc: "Trouver tous les liens partagés",
    alias: ["findlinks", "urls"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const history = loadHistory();
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const results = [];

      for (const [chatId, messages] of Object.entries(history)) {
        for (const m of messages) {
          const urls = m.text.match(urlRegex);
          if (urls) {
            results.push({
              chatId,
              urls,
              sender: m.sender,
              time: m.time,
              text: m.text
            });
          }
        }
      }

      if (results.length === 0) {
        return repondre("🔗 Aucun lien trouvé dans l'historique");
      }

      let text = `🔗 *Liens partagés* (${results.length} messages)\n\n`;
      results.slice(-8).forEach((r, i) => {
        const time = new Date(r.time).toLocaleString("fr-FR", { day: "numeric", month: "short" });
        text += `${i + 1}. 👤 ${r.sender.split("@")[0]} | ${time}\n`;
        r.urls.slice(0, 2).forEach(url => {
          text += `   🔗 ${url.substring(0, 50)}...\n`;
        });
        text += `\n`;
      });

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ SearchMessages.js chargé - Commandes: chercher, cherchemedia, chercherlien");
