/**
 * ═══════════════════════════════════════════════════════════
 * 📅 HANI-MD - Intégration Calendrier
 * ═══════════════════════════════════════════════════════════
 * Gérez vos rendez-vous depuis WhatsApp
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const CALENDAR_FILE = path.join(__dirname, "../DataBase/calendar_events.json");

function loadEvents() {
  try {
    if (fs.existsSync(CALENDAR_FILE)) {
      return JSON.parse(fs.readFileSync(CALENDAR_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveEvents(data) {
  try {
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function parseDateTime(dateStr, timeStr) {
  const now = new Date();
  let target = new Date();

  // Date
  if (dateStr === "demain") {
    target.setDate(target.getDate() + 1);
  } else if (dateStr === "apres-demain") {
    target.setDate(target.getDate() + 2);
  } else if (dateStr?.includes("/")) {
    const [day, month] = dateStr.split("/").map(Number);
    target.setMonth(month - 1, day);
  }

  // Heure
  if (timeStr?.includes(":")) {
    const [hours, mins] = timeStr.split(":").map(Number);
    target.setHours(hours, mins, 0, 0);
  } else {
    target.setHours(9, 0, 0, 0); // Défaut: 9h
  }

  return target;
}

// ═══════════════════════════════════════════════════════════
// 📅 CRÉER UN RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rendezvous",
    classe: "Productivité",
    react: "📅",
    desc: "Créer un rendez-vous (titre date heure)",
    alias: ["rdv", "event", "calendar"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage, superUser }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ *Utilisation:*\n.rendezvous [titre] [date] [heure]\n\n📌 *Exemples:*\n.rendezvous Réunion client demain 15h\n.rendezvous Appel 02/06 14:30\n.rendezvous Anniversaire 25/12 09:00\n\n📝 *Dates:* demain, apres-demain, ou JJ/MM");
      }

      // Parser: .rendezvous Réunion client demain 15h
      let title = "";
      let dateStr = "demain";
      let timeStr = "09:00";

      // Trouver où commence la date
      const dateKeywords = ["demain", "apres-demain"];
      const lastArg = arg[arg.length - 1];
      
      // Si le dernier arg contient h ou :
      if (lastArg?.includes("h") || lastArg?.includes(":")) {
        timeStr = lastArg.replace("h", ":");
        arg.pop();
      }

      // Chercher une date
      const dateIdx = arg.findIndex(a => 
        dateKeywords.includes(a) || a.includes("/")
      );

      if (dateIdx !== -1) {
        dateStr = arg[dateIdx];
        title = arg.slice(0, dateIdx).join(" ");
      } else {
        title = arg.join(" ");
      }

      const eventTime = parseDateTime(dateStr, timeStr);
      
      if (eventTime < new Date()) {
        return repondre("❌ La date/heure est déjà passée");
      }

      const events = loadEvents();
      if (!events[auteurMessage]) events[auteurMessage] = [];

      const eventId = Date.now().toString();
      events[auteurMessage].push({
        id: eventId,
        title: title,
        date: eventTime.toISOString(),
        createdAt: new Date().toISOString(),
        reminded: false
      });

      saveEvents(events);

      const displayDate = eventTime.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      });

      repondre(`📅 *Rendez-vous créé!*\n\n📝 ${title}\n📅 ${displayDate}\n\n⏰ Le bot vous rappellera 15 minutes avant.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 VOIR LES ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "calendrier",
    classe: "Productivité",
    react: "📋",
    desc: "Voir vos rendez-vous à venir",
    alias: ["events", "agenda", "cal"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const events = loadEvents();
      const myEvents = events[auteurMessage] || [];
      const now = new Date();

      const upcoming = myEvents.filter(e => new Date(e.date) > now).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      if (upcoming.length === 0) {
        return repondre("📅 *Calendrier*\n\nAucun rendez-vous à venir.\n\n💡 Créer un RDV:\n.rendezvous Réunion demain 15h");
      }

      let text = `📅 *Prochains Rendez-vous (${upcoming.length})*\n\n`;
      
      upcoming.forEach((e, i) => {
        const date = new Date(e.date);
        const dateStr = date.toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        });
        text += `${i + 1}. 📝 ${e.title}\n   📅 ${dateStr}\n\n`;
      });

      text += `🗑️ Pour supprimer: .delrdv [numéro]`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UN RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delrdv",
    classe: "Productivité",
    react: "🗑️",
    desc: "Supprimer un rendez-vous",
    alias: ["cancelrdv", "delevent"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const num = parseInt(arg[0]);
      if (!num) {
        return repondre("❌ Utilisation: .delrdv [numéro]\n\n💡 Voir les numéros: .calendrier");
      }

      const events = loadEvents();
      if (!events[auteurMessage]) {
        return repondre("❌ Aucun rendez-vous trouvé");
      }

      const now = new Date();
      const upcoming = events[auteurMessage].filter(e => new Date(e.date) > now);

      if (num < 1 || num > upcoming.length) {
        return repondre(`❌ Numéro invalide. Vous avez ${upcoming.length} rendez-vous à venir.`);
      }

      const toDelete = upcoming[num - 1];
      events[auteurMessage] = events[auteurMessage].filter(e => e.id !== toDelete.id);
      saveEvents(events);

      repondre(`✅ *Rendez-vous supprimé:* ${toDelete.title}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 GOOGLE CALENDAR SYNC (config)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gcalendar",
    classe: "Productivité",
    react: "🔗",
    desc: "Synchroniser avec Google Calendar (config)",
    alias: ["googlecal", "gcal"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      repondre(`🔗 *Google Calendar*\n\nCette fonctionnalité permet de synchroniser vos rendez-vous avec Google Calendar.\n\n📝 *Configuration requise:*\n1. Créer un projet sur Google Cloud Console\n2. Activer Google Calendar API\n3. Obtenir credentials OAuth2\n4. Configurer avec: .gcalconfig\n\n💡 *Sans configuration:* Les RDV restent stockés localement et fonctionnent parfaitement.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 VÉRIFICATEUR DE RAPPELS CALENDRIER
// ═══════════════════════════════════════════════════════════

async function checkCalendarReminders(ovl) {
  try {
    const events = loadEvents();
    const now = new Date();

    for (const [userId, userEvents] of Object.entries(events)) {
      for (const event of userEvents) {
        const eventTime = new Date(event.date);
        const timeDiff = eventTime - now;
        const minutesUntil = Math.floor(timeDiff / (1000 * 60));

        // Rappel 15 minutes avant
        if (minutesUntil <= 15 && minutesUntil > 0 && !event.reminded) {
          try {
            await ovl.sendMessage(userId, {
              text: `⏰ *RAPPEL RENDEZ-VOUS*\n\n📝 ${event.title}\n📅 Dans ${minutesUntil} minutes\n\n💡 Préparez-vous!`
            });
            event.reminded = true;
            saveEvents(events);
          } catch (e) {
            console.error("[CALENDAR] Erreur rappel:", e.message);
          }
        }
      }
    }
  } catch (e) {
    console.error("[CALENDAR] Erreur check:", e);
  }
}

module.exports = { checkCalendarReminders };

console.log("[CMD] ✅ Calendar.js chargé - Commandes: rendezvous, calendrier, delrdv, gcalendar");
