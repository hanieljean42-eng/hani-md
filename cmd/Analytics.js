/**
 * ═══════════════════════════════════════════════════════════
 * 📊 HANI-MD - Statistiques & Analytics
 * ═══════════════════════════════════════════════════════════
 * Analysez votre activité WhatsApp
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const STATS_FILE = path.join(__dirname, "../DataBase/message_stats.json");

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
    }
  } catch (e) {}
  return { users: {}, daily: {}, hourly: {} };
}

function saveStats(data) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function trackMessage(userId, isGroup = false) {
  const stats = loadStats();
  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getHours();

  if (!stats.users[userId]) {
    stats.users[userId] = { count: 0, firstSeen: new Date().toISOString(), isGroup };
  }
  stats.users[userId].count++;
  stats.users[userId].lastMessage = new Date().toISOString();

  stats.daily[today] = (stats.daily[today] || 0) + 1;
  stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;

  saveStats(stats);
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statscontacts",
    classe: "Analytiques",
    react: "📊",
    desc: "Qui vous contacte le plus",
    alias: ["contactstats", "topcontacts"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const stats = loadStats();
      const users = Object.entries(stats.users)
        .filter(([id]) => !id.includes("@g.us"))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      if (users.length === 0) {
        return repondre("📊 *Statistiques*\n\nAucune donnée encore.\n\n💡 Les statistiques se construisent au fur et à mesure des conversations.");
      }

      let text = `📊 *Top Contacts (${users.length})*\n\n`;
      users.forEach(([id, data], idx) => {
        const num = id.split("@")[0];
        text += `${idx + 1}. 📱 ${num}\n   💬 ${data.count} messages\n\n`;
      });

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📈 STATISTIQUES GLOBALES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statsmsg",
    classe: "Analytiques",
    react: "📈",
    desc: "Statistiques de vos messages",
    alias: ["msgstats", "mystats"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const stats = loadStats();
      
      const totalMsgs = Object.values(stats.daily).reduce((a, b) => a + b, 0);
      const totalContacts = Object.keys(stats.users).filter(id => !id.includes("@g.us")).length;
      const totalGroups = Object.keys(stats.users).filter(id => id.includes("@g.us")).length;

      // Trouver l'heure la plus active
      const peakHour = Object.entries(stats.hourly).sort((a, b) => b[1] - a[1])[0];

      // Messages aujourd'hui
      const today = new Date().toISOString().split("T")[0];
      const todayMsgs = stats.daily[today] || 0;

      let text = `📈 *Vos Statistiques WhatsApp*\n\n`;
      text += `💬 Total messages: *${totalMsgs}*\n`;
      text += `👥 Contacts: *${totalContacts}*\n`;
      text += `👥 Groupes: *${totalGroups}*\n`;
      text += `📅 Aujourd'hui: *${todayMsgs}* messages\n\n`;

      if (peakHour) {
        text += `🔥 Heure la plus active: *${peakHour[0]}h* (${peakHour[1]} msgs)\n\n`;
      }

      // Top 3 jours
      const topDays = Object.entries(stats.daily)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topDays.length > 0) {
        text += `📅 *Jours les plus actifs:*\n`;
        topDays.forEach(([day, count]) => {
          const date = new Date(day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          text += `   • ${date}: ${count} msgs\n`;
        });
      }

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ⏰ HEURES D'ACTIVITÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "actifhours",
    classe: "Analytiques",
    react: "⏰",
    desc: "Heures de forte activité",
    alias: ["peakhours", "heuresactives"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const stats = loadStats();
      const hourly = Object.entries(stats.hourly).sort((a, b) => b[1] - a[1]);

      if (hourly.length === 0) {
        return repondre("⏰ Pas assez de données");
      }

      let text = `⏰ *Heures d'Activité*\n\n`;
      text += `🔥 *Top 5 heures:*\n\n`;
      
      hourly.slice(0, 5).forEach(([hour, count], idx) => {
        const bar = "█".repeat(Math.min(10, Math.floor(count / 5)));
        text += `${hour}h ${bar} ${count}\n`;
      });

      text += `\n💡 Utilisez ces données pour optimiser vos heures de réponse.`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 EXPORT STATS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "exportstats",
    classe: "Analytiques",
    react: "📤",
    desc: "Exporter vos statistiques (JSON/CSV)",
    alias: ["statsdownload"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const stats = loadStats();
      
      // Format CSV simple
      let csv = "Date,Messages\n";
      Object.entries(stats.daily).forEach(([date, count]) => {
        csv += `${date},${count}\n`;
      });

      repondre(`📤 *Export Statistiques*\n\n📈 *Résumé:*\n• Période: ${Object.keys(stats.daily).length} jours\n• Total: ${Object.values(stats.daily).reduce((a,b)=>a+b,0)} messages\n\n📋 *Données brutes:*\n\`\`\`\n${csv}\n\`\`\``);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

module.exports = { trackMessage };

console.log("[CMD] ✅ Analytics.js chargé - Commandes: statscontacts, statsmsg, actifhours, exportstats");
