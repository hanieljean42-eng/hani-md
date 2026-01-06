/**
 * ═══════════════════════════════════════════════════════════
 * 🚀 HANI-MD - Outils d'Engagement & Croissance
 * ═══════════════════════════════════════════════════════════
 * Outils pour augmenter l'engagement et la croissance organique
 * Sondages, concours, rappels, et statistiques d'engagement
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

// Base de données Engagement
const ENGAGEMENT_DB_PATH = path.join(__dirname, "../DataBase/engagement.json");

function loadEngagementDB() {
  try {
    if (fs.existsSync(ENGAGEMENT_DB_PATH)) {
      return JSON.parse(fs.readFileSync(ENGAGEMENT_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    polls: {},
    contests: {},
    reminders: [],
    dailyStats: {},
    settings: {
      autoThankYou: true,
      thankYouMessage: "Merci {name} pour votre message! 🙏"
    }
  };
}

function saveEngagementDB(data) {
  try {
    fs.writeFileSync(ENGAGEMENT_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 CRÉER UN SONDAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "poll",
    classe: "Engagement",
    react: "📊",
    desc: "Créer un sondage interactif",
    alias: ["sondage", "vote", "createpoll"]
  },
  async (ovl, msg, { arg, repondre, ms }) => {
    try {
      // Format: .poll Question|Option1|Option2|Option3
      const fullText = arg.join(" ");
      const parts = fullText.split("|");

      if (parts.length < 3) {
        return repondre(`📊 *CRÉER UN SONDAGE*\n\n❌ Format invalide!\n\n📝 Utilisation:\n.poll [Question]|[Option1]|[Option2]|[Option3]...\n\n📌 Exemple:\n.poll Quel est votre fruit préféré?|🍎 Pomme|🍌 Banane|🍊 Orange`);
      }

      const question = parts[0].trim();
      const options = parts.slice(1).map(opt => opt.trim()).filter(opt => opt.length > 0);

      if (options.length < 2 || options.length > 12) {
        return repondre("❌ Un sondage doit avoir entre 2 et 12 options.");
      }

      // Créer le sondage avec l'API native WhatsApp
      await ovl.sendMessage(msg.key.remoteJid, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1
        }
      }, { quoted: ms });

      // Sauvegarder le sondage
      const db = loadEngagementDB();
      const pollId = Date.now().toString();
      db.polls[pollId] = {
        question,
        options,
        createdAt: new Date().toISOString(),
        createdBy: msg.key.participant || msg.key.remoteJid,
        chat: msg.key.remoteJid
      };
      saveEngagementDB(db);

      repondre(`✅ Sondage créé!\n\n📊 ${question}\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}`);

    } catch (error) {
      console.error("[POLL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎁 CRÉER UN CONCOURS/GIVEAWAY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "giveaway",
    classe: "Engagement",
    react: "🎁",
    desc: "Créer un concours/giveaway",
    alias: ["concours", "contest", "jeu"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();

      if (subCommand === "create") {
        // Format: .giveaway create Titre du concours|Description|Durée en heures
        const fullText = arg.slice(1).join(" ");
        const parts = fullText.split("|");

        if (parts.length < 2) {
          return repondre("❌ Format: .giveaway create [Titre]|[Description]|[Durée heures]\n\nExemple: .giveaway create Super Cadeau!|Gagnez un téléphone|24");
        }

        const title = parts[0].trim();
        const description = parts[1].trim();
        const duration = parseInt(parts[2]) || 24; // 24h par défaut

        const db = loadEngagementDB();
        const contestId = Date.now().toString();
        const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

        db.contests[contestId] = {
          title,
          description,
          duration,
          endTime: endTime.toISOString(),
          participants: [],
          winner: null,
          chat: msg.key.remoteJid,
          createdAt: new Date().toISOString(),
          active: true
        };
        saveEngagementDB(db);

        const giveawayText = `🎁 *NOUVEAU CONCOURS!*\n━━━━━━━━━━━━━━━━━\n\n🏆 *${title}*\n\n📝 ${description}\n\n⏰ *Fin:* ${endTime.toLocaleDateString("fr-FR")} à ${endTime.toLocaleTimeString("fr-FR")}\n\n📌 *Pour participer:*\nTapez: .participate ${contestId}\n\n━━━━━━━━━━━━━━━━━\n🍀 Bonne chance à tous!`;

        await ovl.sendMessage(msg.key.remoteJid, { text: giveawayText });

      } else if (subCommand === "pick") {
        // Tirer un gagnant
        const contestId = arg[1];
        
        if (!contestId) {
          return repondre("❌ Utilisation: .giveaway pick [ID du concours]");
        }

        const db = loadEngagementDB();
        const contest = db.contests[contestId];

        if (!contest) {
          return repondre("❌ Concours non trouvé.");
        }

        if (contest.participants.length === 0) {
          return repondre("❌ Aucun participant pour ce concours.");
        }

        // Sélectionner un gagnant aléatoire
        const winnerIndex = Math.floor(Math.random() * contest.participants.length);
        const winner = contest.participants[winnerIndex];

        contest.winner = winner;
        contest.active = false;
        saveEngagementDB(db);

        const winnerText = `🎉 *RÉSULTAT DU CONCOURS*\n━━━━━━━━━━━━━━━━━\n\n🏆 *${contest.title}*\n\n🥇 *GAGNANT:* @${winner.number}\n👤 Nom: ${winner.name}\n\n👥 Participants: ${contest.participants.length}\n\n━━━━━━━━━━━━━━━━━\n🎊 Félicitations!`;

        await ovl.sendMessage(contest.chat, {
          text: winnerText,
          mentions: [`${winner.number}@s.whatsapp.net`]
        });

      } else if (subCommand === "list") {
        // Lister les concours actifs
        const db = loadEngagementDB();
        const activeContests = Object.entries(db.contests).filter(([_, c]) => c.active);

        if (activeContests.length === 0) {
          return repondre("📭 Aucun concours actif.");
        }

        let listText = `🎁 *CONCOURS ACTIFS*\n━━━━━━━━━━━━━━━━━\n\n`;
        activeContests.forEach(([id, contest]) => {
          listText += `🏆 *${contest.title}*\n`;
          listText += `📌 ID: ${id}\n`;
          listText += `👥 Participants: ${contest.participants.length}\n`;
          listText += `⏰ Fin: ${new Date(contest.endTime).toLocaleDateString("fr-FR")}\n\n`;
        });

        repondre(listText);

      } else {
        repondre(`🎁 *GESTION DES CONCOURS*\n\n.giveaway create [titre]|[desc]|[heures]\n.giveaway pick [id] - Tirer un gagnant\n.giveaway list - Voir les concours actifs`);
      }

    } catch (error) {
      console.error("[GIVEAWAY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🙋 PARTICIPER À UN CONCOURS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "participate",
    classe: "Engagement",
    react: "🙋",
    desc: "Participer à un concours",
    alias: ["participer", "join", "entrer"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const contestId = arg[0];

      if (!contestId) {
        return repondre("❌ Utilisation: .participate [ID du concours]");
      }

      const db = loadEngagementDB();
      const contest = db.contests[contestId];

      if (!contest) {
        return repondre("❌ Concours non trouvé.");
      }

      if (!contest.active) {
        return repondre("❌ Ce concours est terminé.");
      }

      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];

      // Vérifier si déjà participant
      if (contest.participants.some(p => p.number === number)) {
        return repondre("ℹ️ Vous participez déjà à ce concours!");
      }

      contest.participants.push({
        jid: sender,
        number: number,
        name: msg.pushName || "Participant",
        joinedAt: new Date().toISOString()
      });
      saveEngagementDB(db);

      repondre(`✅ *Participation enregistrée!*\n\n🎁 Concours: ${contest.title}\n👥 Vous êtes le participant #${contest.participants.length}\n\n🍀 Bonne chance!`);

    } catch (error) {
      console.error("[PARTICIPATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ⏰ CRÉER UN RAPPEL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "reminder",
    classe: "Engagement",
    react: "⏰",
    desc: "Créer un rappel programmé",
    alias: ["rappel", "remind", "alert"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();

      if (subCommand === "set") {
        // Format: .reminder set 30m Message de rappel
        const timeArg = arg[1];
        const message = arg.slice(2).join(" ");

        if (!timeArg || !message) {
          return repondre("❌ Format: .reminder set [temps] [message]\n\nTemps: 10m, 1h, 2d\nm=minutes, h=heures, d=jours\n\nExemple: .reminder set 30m Vérifier les messages");
        }

        let ms = 0;
        const timeValue = parseInt(timeArg);
        const timeUnit = timeArg.slice(-1).toLowerCase();

        if (timeUnit === "m") ms = timeValue * 60 * 1000;
        else if (timeUnit === "h") ms = timeValue * 60 * 60 * 1000;
        else if (timeUnit === "d") ms = timeValue * 24 * 60 * 60 * 1000;
        else return repondre("❌ Unité de temps invalide. Utilisez m, h, ou d");

        const triggerTime = new Date(Date.now() + ms);

        const db = loadEngagementDB();
        const reminderId = Date.now().toString();
        
        db.reminders.push({
          id: reminderId,
          message,
          triggerTime: triggerTime.toISOString(),
          chat: msg.key.remoteJid,
          createdAt: new Date().toISOString(),
          triggered: false
        });
        saveEngagementDB(db);

        repondre(`⏰ *Rappel créé!*\n\n📝 Message: ${message}\n⏱️ Déclenchement: ${triggerTime.toLocaleDateString("fr-FR")} à ${triggerTime.toLocaleTimeString("fr-FR")}\n📌 ID: ${reminderId}`);

      } else if (subCommand === "list") {
        const db = loadEngagementDB();
        const pendingReminders = db.reminders.filter(r => !r.triggered);

        if (pendingReminders.length === 0) {
          return repondre("📭 Aucun rappel en attente.");
        }

        let listText = `⏰ *RAPPELS EN ATTENTE*\n━━━━━━━━━━━━━━━━━\n\n`;
        pendingReminders.forEach((r, i) => {
          const time = new Date(r.triggerTime);
          listText += `${i + 1}. ${r.message.substring(0, 30)}...\n`;
          listText += `   ⏱️ ${time.toLocaleDateString("fr-FR")} ${time.toLocaleTimeString("fr-FR")}\n\n`;
        });

        repondre(listText);

      } else if (subCommand === "clear") {
        const db = loadEngagementDB();
        db.reminders = [];
        saveEngagementDB(db);
        repondre("✅ Tous les rappels ont été supprimés.");

      } else {
        repondre(`⏰ *GESTION DES RAPPELS*\n\n.reminder set [temps] [message]\n.reminder list - Voir les rappels\n.reminder clear - Supprimer tous`);
      }

    } catch (error) {
      console.error("[REMINDER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📈 STATISTIQUES D'ENGAGEMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "engagement",
    classe: "Engagement",
    react: "📈",
    desc: "Voir les statistiques d'engagement",
    alias: ["engagementstats", "stats", "analytics"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadEngagementDB();
      const contactsPath = path.join(__dirname, "../DataBase/contacts.json");
      
      let contacts = {};
      if (fs.existsSync(contactsPath)) {
        contacts = JSON.parse(fs.readFileSync(contactsPath, "utf8"));
      }

      // Calculer les stats
      const totalContacts = Object.keys(contacts).length;
      const activeContacts = Object.values(contacts).filter(c => c.messageCount > 0).length;
      const totalMessages = Object.values(contacts).reduce((sum, c) => sum + (c.messageCount || 0), 0);
      const totalPolls = Object.keys(db.polls).length;
      const totalContests = Object.keys(db.contests).length;
      const activeContests = Object.values(db.contests).filter(c => c.active).length;
      const totalParticipants = Object.values(db.contests).reduce((sum, c) => sum + (c.participants?.length || 0), 0);

      // Engagement rate
      const engagementRate = totalContacts > 0 
        ? ((activeContacts / totalContacts) * 100).toFixed(1) 
        : 0;

      let statsText = `📈 *STATISTIQUES D'ENGAGEMENT*\n━━━━━━━━━━━━━━━━━\n\n`;
      statsText += `👥 *Contacts:*\n`;
      statsText += `   📊 Total: ${totalContacts}\n`;
      statsText += `   ✅ Actifs: ${activeContacts}\n`;
      statsText += `   📈 Taux d'engagement: ${engagementRate}%\n\n`;
      statsText += `💬 *Messages:*\n`;
      statsText += `   📨 Total reçus: ${totalMessages}\n\n`;
      statsText += `🎯 *Activités:*\n`;
      statsText += `   📊 Sondages créés: ${totalPolls}\n`;
      statsText += `   🎁 Concours: ${totalContests} (${activeContests} actifs)\n`;
      statsText += `   🙋 Participations: ${totalParticipants}\n`;
      statsText += `   ⏰ Rappels: ${db.reminders.filter(r => !r.triggered).length} en attente\n\n`;
      statsText += `💡 *Conseils:*\n`;
      statsText += `• Créez des sondages pour engager\n`;
      statsText += `• Lancez des concours réguliers\n`;
      statsText += `• Utilisez la newsletter\n`;
      statsText += `• Partagez votre QR code`;

      repondre(statsText);

    } catch (error) {
      console.error("[ENGAGEMENT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🙏 MESSAGE DE REMERCIEMENT AUTO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autothank",
    classe: "Engagement",
    react: "🙏",
    desc: "Activer le message de remerciement automatique",
    alias: ["thankyou", "merci", "remerciement"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();
      const db = loadEngagementDB();

      if (subCommand === "on") {
        db.settings.autoThankYou = true;
        saveEngagementDB(db);
        repondre("✅ Remerciement automatique activé!");
      } else if (subCommand === "off") {
        db.settings.autoThankYou = false;
        saveEngagementDB(db);
        repondre("❌ Remerciement automatique désactivé!");
      } else if (subCommand === "set") {
        const message = arg.slice(1).join(" ");
        if (!message) {
          return repondre("❌ Utilisation: .autothank set [message]\n\nVariables: {name}, {time}");
        }
        db.settings.thankYouMessage = message;
        saveEngagementDB(db);
        repondre(`✅ Message de remerciement mis à jour:\n\n"${message}"`);
      } else {
        const status = db.settings.autoThankYou ? "✅ Activé" : "❌ Désactivé";
        repondre(`🙏 *REMERCIEMENT AUTO*\n\nStatut: ${status}\n\n📝 Message:\n${db.settings.thankYouMessage}\n\n⚙️ Commandes:\n.autothank on/off\n.autothank set [message]`);
      }

    } catch (error) {
      console.error("[AUTOTHANK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📣 ANNONCE FORMATÉE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "announce",
    classe: "Engagement",
    react: "📣",
    desc: "Créer une annonce formatée",
    alias: ["annonce", "pub", "ad"]
  },
  async (ovl, msg, { arg, repondre, superUser, ms }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const fullText = arg.join(" ");
      const parts = fullText.split("|");

      if (parts.length < 2) {
        return repondre("📣 *CRÉER UNE ANNONCE*\n\n❌ Format invalide!\n\n📝 Utilisation:\n.announce [Titre]|[Contenu]|[Emoji]\n\n📌 Exemple:\n.announce Nouveau produit|Découvrez notre nouvelle collection!|🎉");
      }

      const title = parts[0].trim();
      const content = parts[1].trim();
      const emoji = parts[2]?.trim() || "📣";

      const announcement = `${emoji} *${title.toUpperCase()}* ${emoji}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${content}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📅 ${new Date().toLocaleDateString("fr-FR")}\n🤖 *HANI-MD*`;

      await ovl.sendMessage(msg.key.remoteJid, { text: announcement }, { quoted: ms });

    } catch (error) {
      console.error("[ANNOUNCE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Engagement.js chargé - Commandes: poll, giveaway, participate, reminder, engagement, autothank, announce");
