/**
 * ═══════════════════════════════════════════════════════════
 * 📅 HANI-MD - Planification de Messages
 * ═══════════════════════════════════════════════════════════
 * Écrire maintenant, envoyer plus tard
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const SCHEDULED_FILE = path.join(__dirname, "../DataBase/scheduled_messages.json");

function loadScheduled() {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULED_FILE, "utf8"));
    }
  } catch (e) {}
  return [];
}

function saveScheduled(data) {
  try {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function parseScheduleTime(timeStr, dateStr) {
  const now = new Date();
  let target = new Date();

  // Format: 14:30
  if (timeStr.includes(":")) {
    const [hours, mins] = timeStr.split(":").map(Number);
    target.setHours(hours, mins, 0, 0);

    if (dateStr) {
      // Format: demain, apres-demain, ou JJ/MM
      if (dateStr === "demain") {
        target.setDate(target.getDate() + 1);
      } else if (dateStr === "apres-demain") {
        target.setDate(target.getDate() + 2);
      } else if (dateStr.includes("/")) {
        const [day, month] = dateStr.split("/").map(Number);
        target.setMonth(month - 1, day);
      }
    } else if (target < now) {
      target.setDate(target.getDate() + 1);
    }
  } else {
    // Relative: 2h, 30min
    if (timeStr.includes("h")) {
      const hours = parseInt(timeStr.replace(/[^0-9]/g, ""));
      target = new Date(now.getTime() + hours * 60 * 60 * 1000);
    } else if (timeStr.includes("min")) {
      const mins = parseInt(timeStr.replace(/[^0-9]/g, ""));
      target = new Date(now.getTime() + mins * 60 * 1000);
    }
  }

  return target;
}

// ═══════════════════════════════════════════════════════════
// 📅 PLANIFIER UN MESSAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "planifier",
    classe: "Productivité",
    react: "📅",
    desc: "Planifier un message (14:30 / 2h / demain 9h)",
    alias: ["schedule", "planif", "later"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      // Format: .planifier 14:30 Salut tout le monde
      // Format: .planifier demain 9h Rappel réunion
      // Format: .planifier 2h Message dans 2 heures

      if (arg.length < 2) {
        return repondre("❌ *Utilisation:*\n.planifier [heure] [message]\n\n📌 *Exemples:*\n.planifier 14:30 Bonjour!\n.planifier demain 9h Rappel réunion\n.planifier 2h Message plus tard");
      }

      let timeStr, message;
      let dateStr = null;

      // Détecter le format
      if (arg[0] === "demain" || arg[0] === "apres-demain") {
        dateStr = arg[0];
        timeStr = arg[1];
        message = arg.slice(2).join(" ");
      } else if (arg[0].includes("h") && !arg[0].includes(":")) {
        // Format relatif: 2h, 30min
        timeStr = arg[0];
        message = arg.slice(1).join(" ");
      } else {
        // Format absolu: 14:30
        timeStr = arg[0];
        message = arg.slice(1).join(" ");
      }

      if (!message) {
        return repondre("❌ Message vide. Ajoutez du texte après l'heure.");
      }

      const targetTime = parseScheduleTime(timeStr, dateStr);
      if (!targetTime || targetTime <= new Date()) {
        return repondre("❌ Heure invalide ou déjà passée");
      }

      const scheduled = loadScheduled();
      const scheduleId = Date.now().toString();

      scheduled.push({
        id: scheduleId,
        userId: auteurMessage,
        chatId: msg.key.remoteJid,
        message: message,
        targetTime: targetTime.toISOString(),
        createdAt: new Date().toISOString()
      });

      saveScheduled(scheduled);

      const timeDisplay = targetTime.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      });

      repondre(`📅 *Message planifié!*\n\n📝 "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"\n\n📅 Envoi prévu: *${timeDisplay}*\n\n💡 Le message sera envoyé automatiquement à l'heure indiquée.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 VOIR LES MESSAGES PLANIFIÉS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "planifies",
    classe: "Productivité",
    react: "📋",
    desc: "Voir vos messages planifiés",
    alias: ["scheduled", "listplanif"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const scheduled = loadScheduled();
      const userScheduled = scheduled.filter(
        s => s.userId === auteurMessage && new Date(s.targetTime) > new Date()
      );

      if (userScheduled.length === 0) {
        return repondre("📅 *Messages Planifiés*\n\nAucun message en attente.\n\n💡 Planifier un message:\n.planifier 14:30 Bonjour!");
      }

      let text = `📅 *Messages Planifiés (${userScheduled.length})*\n\n`;
      userScheduled.forEach((s, idx) => {
        const time = new Date(s.targetTime);
        const timeStr = time.toLocaleString("fr-FR", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit"
        });
        text += `${idx + 1}. 📝 ${s.message.substring(0, 40)}${s.message.length > 40 ? '...' : ''}\n   📅 ${timeStr}\n\n`;
      });

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ ANNULER UN MESSAGE PLANIFIÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "cancelplanif",
    classe: "Productivité",
    react: "🗑️",
    desc: "Annuler un message planifié",
    alias: ["delplanif", "unschedule"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const searchText = arg.join(" ").toLowerCase();
      if (!searchText) {
        return repondre("❌ Utilisation: .cancelplanif [mot-clé du message]");
      }

      const scheduled = loadScheduled();
      const initialCount = scheduled.length;

      const filtered = scheduled.filter(s => {
        if (s.userId !== auteurMessage) return true;
        if (new Date(s.targetTime) <= new Date()) return true;
        return !s.message.toLowerCase().includes(searchText);
      });

      if (filtered.length === initialCount) {
        return repondre(`❌ Aucun message planifié contenant "${searchText}" trouvé`);
      }

      saveScheduled(filtered);
      repondre(`✅ *Message(s) planifié(s) annulé(s)!*`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 PROCESSEUR DE MESSAGES PLANIFIÉS
// ═══════════════════════════════════════════════════════════

async function processScheduledMessages(ovl) {
  try {
    const scheduled = loadScheduled();
    const now = new Date();
    let modified = false;

    for (const item of scheduled) {
      if (new Date(item.targetTime) <= now) {
        try {
          await ovl.sendMessage(item.chatId, {
            text: `📅 *Message Planifié*\n\n${item.message}\n\n_Programmé par ${item.userId.split("@")[0]}_`
          });
          console.log(`[PLANIF] Message envoyé à ${item.chatId}`);
        } catch (e) {
          console.error("[PLANIF] Erreur envoi:", e.message);
        }
        modified = true;
      }
    }

    if (modified) {
      const remaining = scheduled.filter(s => new Date(s.targetTime) > now);
      saveScheduled(remaining);
    }
  } catch (e) {
    console.error("[PLANIF] Erreur process:", e);
  }
}

module.exports = { processScheduledMessages };

console.log("[CMD] ✅ Planificateur.js chargé - Commandes: planifier, planifies, cancelplanif");
