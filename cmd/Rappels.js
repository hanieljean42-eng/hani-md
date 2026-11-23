/**
 * ═══════════════════════════════════════════════════════════
 * ⏰ HANI-MD - Système de Rappels
 * ═══════════════════════════════════════════════════════════
 * Ne jamais rien oublier
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const RAPPELS_FILE = path.join(__dirname, "../DataBase/rappels.json");

function loadRappels() {
  try {
    if (fs.existsSync(RAPPELS_FILE)) {
      return JSON.parse(fs.readFileSync(RAPPELS_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveRappels(data) {
  try {
    fs.writeFileSync(RAPPELS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function parseTime(input) {
  const now = new Date();
  
  // Format: 2h, 30min, 1j, demain, etc.
  if (input.includes("h")) {
    const hours = parseInt(input.replace(/[^0-9]/g, ""));
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
  if (input.includes("min") || input.includes("m")) {
    const mins = parseInt(input.replace(/[^0-9]/g, ""));
    return new Date(now.getTime() + mins * 60 * 1000);
  }
  if (input.includes("j") || input === "demain") {
    if (input === "demain") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    const days = parseInt(input.replace(/[^0-9]/g, ""));
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // Format: HH:MM (heure fixe aujourd'hui ou demain si dépassé)
  if (input.includes(":")) {
    const [hours, mins] = input.split(":").map(Number);
    let target = new Date();
    target.setHours(hours, mins, 0, 0);
    if (target < now) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════
// ⏰ CRÉER UN RAPPEL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rappel",
    classe: "Productivité",
    react: "⏰",
    desc: "Créer un rappel (2h, 30min, demain, 14:30)",
    alias: ["remind", "rappeller", "alarme"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ *Utilisation:*\n.rappel [temps] [message]\n\n📌 *Exemples:*\n.rappel 2h Appeler le client\n.rappel 30min Pause café\n.rappel demain Renouveler domaine\n.rappel 14:30 Réunion équipe");
      }

      const timeInput = arg[0];
      const message = arg.slice(1).join(" ");
      const targetTime = parseTime(timeInput);

      if (!targetTime) {
        return repondre("❌ Format de temps invalide\n\n✅ Formats acceptés:\n• 2h, 30min, 1j\n• demain\n• 14:30 (heure fixe)");
      }

      const rappels = loadRappels();
      if (!rappels[auteurMessage]) rappels[auteurMessage] = [];
      
      const rappelId = Date.now().toString();
      rappels[auteurMessage].push({
        id: rappelId,
        message: message,
        targetTime: targetTime.toISOString(),
        chatId: msg.key.remoteJid,
        createdAt: new Date().toISOString()
      });

      saveRappels(rappels);

      const timeStr = targetTime.toLocaleString("fr-FR", { 
        weekday: "short", 
        hour: "2-digit", 
        minute: "2-digit" 
      });

      repondre(`⏰ *Rappel créé!*\n\n📝 ${message}\n📅 ${timeStr}\n\n💡 Je vous enverrai un message à ce moment-là.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 VOIR LES RAPPELS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rappels",
    classe: "Productivité",
    react: "📋",
    desc: "Voir vos rappels actifs",
    alias: ["listrappels", "mesrappels"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const rappels = loadRappels();
      const userRappels = rappels[auteurMessage] || [];
      const now = new Date();

      // Filtrer les rappels futurs
      const activeRappels = userRappels.filter(r => new Date(r.targetTime) > now);

      if (activeRappels.length === 0) {
        return repondre("⏰ *Vos Rappels*\n\nAucun rappel actif.\n\n💡 Créer un rappel:\n.rappel 2h [message]");
      }

      let text = `⏰ *Rappels Actifs (${activeRappels.length})*\n\n`;
      activeRappels.forEach(r => {
        const time = new Date(r.targetTime);
        const timeStr = time.toLocaleString("fr-FR", { 
          weekday: "short", 
          hour: "2-digit", 
          minute: "2-digit" 
        });
        text += `📝 ${r.message}\n   📅 ${timeStr}\n\n`;
      });
      text += `🗑️ Pour supprimer: .delrappel [numéro]`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UN RAPPEL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delrappel",
    classe: "Productivité",
    react: "🗑️",
    desc: "Supprimer un rappel",
    alias: ["cancelrappel", "rmrappel"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const searchText = arg.join(" ").toLowerCase();
      if (!searchText) {
        return repondre("❌ Utilisation: .delrappel [mot-clé du rappel]");
      }

      const rappels = loadRappels();
      if (!rappels[auteurMessage]) {
        return repondre("❌ Aucun rappel trouvé");
      }

      const initialCount = rappels[auteurMessage].length;
      rappels[auteurMessage] = rappels[auteurMessage].filter(
        r => !r.message.toLowerCase().includes(searchText)
      );

      if (rappels[auteurMessage].length === initialCount) {
        return repondre(`❌ Aucun rappel contenant "${searchText}" trouvé`);
      }

      saveRappels(rappels);
      repondre(`✅ *Rappel(s) supprimé(s)!*`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 VÉRIFICATEUR DE RAPPELS (à exécuter périodiquement)
// ═══════════════════════════════════════════════════════════

async function checkRappels(ovl) {
  try {
    const rappels = loadRappels();
    const now = new Date();
    let modified = false;

    for (const [userId, userRappels] of Object.entries(rappels)) {
      const toTrigger = [];
      const remaining = [];

      for (const r of userRappels) {
        if (new Date(r.targetTime) <= now) {
          toTrigger.push(r);
        } else {
          remaining.push(r);
        }
      }

      // Envoyer les rappels déclenchés
      for (const r of toTrigger) {
        try {
          await ovl.sendMessage(userId, {
            text: `⏰ *RAPPEL!*\n\n📝 ${r.message}\n\n💡 Créé le ${new Date(r.createdAt).toLocaleDateString("fr-FR")}`
          });
        } catch (e) {
          console.log("[RAPPEL] Erreur envoi:", e.message);
        }
      }

      if (toTrigger.length > 0) {
        rappels[userId] = remaining;
        modified = true;
      }
    }

    if (modified) {
      saveRappels(rappels);
    }
  } catch (e) {
    console.error("[RAPPELS] Erreur check:", e);
  }
}

module.exports = { checkRappels };

console.log("[CMD] ✅ Rappels.js chargé - Commandes: rappel, rappels, delrappel");
