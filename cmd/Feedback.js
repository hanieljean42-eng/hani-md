/**
 * ═══════════════════════════════════════════════════════════
 * ⭐ HANI-MD - Système de Feedback & Avis Clients
 * ═══════════════════════════════════════════════════════════
 * Recueil des avis, notes, suggestions et témoignages
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");
const config = require("../set");

// Base de données Feedback
const FEEDBACK_DB_PATH = path.join(__dirname, "../DataBase/feedback.json");

function loadFeedbackDB() {
  try {
    if (fs.existsSync(FEEDBACK_DB_PATH)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    ratings: {},
    testimonials: [],
    suggestions: [],
    bugs: [],
    stats: {
      totalRatings: 0,
      averageRating: 0,
      totalTestimonials: 0,
      totalSuggestions: 0,
      totalBugs: 0
    }
  };
}

function saveFeedbackDB(data) {
  try {
    fs.writeFileSync(FEEDBACK_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Calculer la moyenne des notes
function calculateAverageRating(db) {
  const ratings = Object.values(db.ratings);
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return (sum / ratings.length).toFixed(1);
}

// ═══════════════════════════════════════════════════════════
// ⭐ NOTER LE BOT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rate",
    classe: "Feedback",
    react: "⭐",
    desc: "Noter le bot de 1 à 5 étoiles",
    alias: ["noter", "avis", "review"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const score = parseInt(arg[0]);
      const comment = arg.slice(1).join(" ");

      if (!score || score < 1 || score > 5) {
        return repondre(`⭐ *NOTER HANI-MD*\n\n❌ Veuillez donner une note de 1 à 5\n\n📝 Utilisation:\n.rate [1-5] [commentaire optionnel]\n\n📌 Exemple:\n.rate 5 Excellent bot, très utile!\n.rate 4 Bon bot mais manque quelques fonctionnalités`);
      }

      const db = loadFeedbackDB();
      
      const previousRating = db.ratings[number];
      db.ratings[number] = {
        score: score,
        comment: comment || "",
        name: msg.pushName || "Utilisateur",
        date: new Date().toISOString(),
        jid: sender
      };

      if (!previousRating) {
        db.stats.totalRatings++;
      }
      
      db.stats.averageRating = calculateAverageRating(db);
      saveFeedbackDB(db);

      const stars = "⭐".repeat(score) + "☆".repeat(5 - score);
      
      let response = `✅ *MERCI POUR VOTRE NOTE!*\n\n`;
      response += `${stars}\n`;
      response += `📊 Votre note: ${score}/5\n`;
      if (comment) {
        response += `💬 Commentaire: "${comment}"\n`;
      }
      response += `\n📈 Moyenne générale: ${db.stats.averageRating}/5 (${db.stats.totalRatings} avis)\n`;
      response += `\n━━━━━━━━━━━━━━━━━\n`;
      response += `🙏 Votre avis nous aide à améliorer HANI-MD!`;

      repondre(response);

      // Notifier le propriétaire des notes 5 étoiles
      if (score === 5 && config.OWNER_NUMBER) {
        const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await ovl.sendMessage(ownerJid, {
          text: `⭐⭐⭐⭐⭐ *NOUVELLE NOTE 5 ÉTOILES!*\n\n👤 ${msg.pushName || "Utilisateur"}\n📱 +${number}\n💬 ${comment || "Aucun commentaire"}`
        });
      }

    } catch (error) {
      console.error("[RATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💬 TÉMOIGNAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "testimonial",
    classe: "Feedback",
    react: "💬",
    desc: "Laisser un témoignage public",
    alias: ["temoignage", "temoin", "testimony"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const testimonial = arg.join(" ");

      if (!testimonial || testimonial.length < 20) {
        return repondre(`💬 *LAISSER UN TÉMOIGNAGE*\n\n❌ Votre témoignage doit faire au moins 20 caractères\n\n📝 Utilisation:\n.testimonial [votre témoignage]\n\n📌 Exemple:\n.testimonial J'utilise HANI-MD depuis 3 mois et c'est le meilleur bot WhatsApp que j'ai testé!`);
      }

      const db = loadFeedbackDB();
      
      // Vérifier si l'utilisateur a déjà laissé un témoignage récent
      const recentTestimonial = db.testimonials.find(t => 
        t.userId === number && 
        Date.now() - new Date(t.date).getTime() < 24 * 60 * 60 * 1000
      );

      if (recentTestimonial) {
        return repondre("⏳ Vous avez déjà laissé un témoignage récemment. Réessayez demain!");
      }

      db.testimonials.push({
        id: Date.now().toString(36),
        userId: number,
        name: msg.pushName || "Utilisateur",
        content: testimonial,
        date: new Date().toISOString(),
        approved: false // Nécessite approbation du owner
      });
      
      db.stats.totalTestimonials++;
      saveFeedbackDB(db);

      repondre(`✅ *TÉMOIGNAGE ENREGISTRÉ!*\n\n💬 "${testimonial}"\n\n📌 Votre témoignage sera affiché après validation.\n\n🙏 Merci pour votre confiance!`);

      // Notifier le propriétaire
      if (config.OWNER_NUMBER) {
        const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await ovl.sendMessage(ownerJid, {
          text: `💬 *NOUVEAU TÉMOIGNAGE*\n\n👤 ${msg.pushName || "Utilisateur"}\n📱 +${number}\n\n"${testimonial}"\n\n✅ Approuver: .approvet ${db.testimonials.length - 1}`
        });
      }

    } catch (error) {
      console.error("[TESTIMONIAL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💡 SUGGESTION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "suggest",
    classe: "Feedback",
    react: "💡",
    desc: "Proposer une suggestion d'amélioration",
    alias: ["suggestion", "propose", "idea"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const suggestion = arg.join(" ");

      if (!suggestion || suggestion.length < 10) {
        return repondre(`💡 *FAIRE UNE SUGGESTION*\n\n❌ Votre suggestion doit faire au moins 10 caractères\n\n📝 Utilisation:\n.suggest [votre idée]\n\n📌 Exemple:\n.suggest Ajouter une commande pour télécharger des stories Instagram`);
      }

      const db = loadFeedbackDB();
      
      db.suggestions.push({
        id: Date.now().toString(36),
        userId: number,
        name: msg.pushName || "Utilisateur",
        content: suggestion,
        date: new Date().toISOString(),
        status: "pending", // pending, accepted, rejected, implemented
        votes: 0
      });
      
      db.stats.totalSuggestions++;
      saveFeedbackDB(db);

      repondre(`✅ *SUGGESTION ENREGISTRÉE!*\n\n💡 "${suggestion}"\n\n📌 Statut: En attente d'évaluation\n\n🙏 Merci pour votre contribution!\nNous étudions toutes les suggestions.`);

      // Notifier le propriétaire
      if (config.OWNER_NUMBER) {
        const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await ovl.sendMessage(ownerJid, {
          text: `💡 *NOUVELLE SUGGESTION*\n\n👤 ${msg.pushName || "Utilisateur"}\n📱 +${number}\n\n"${suggestion}"`
        });
      }

    } catch (error) {
      console.error("[SUGGEST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🐛 SIGNALER UN BUG
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "bug",
    classe: "Feedback",
    react: "🐛",
    desc: "Signaler un bug ou problème",
    alias: ["report", "signaler", "probleme"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const bugReport = arg.join(" ");

      if (!bugReport || bugReport.length < 15) {
        return repondre(`🐛 *SIGNALER UN BUG*\n\n❌ Décrivez le problème en détail (min 15 caractères)\n\n📝 Utilisation:\n.bug [description du problème]\n\n📌 Exemple:\n.bug La commande .youtube ne fonctionne pas, j'obtiens une erreur "timeout"`);
      }

      const db = loadFeedbackDB();
      
      const bugId = `BUG${Date.now().toString(36).toUpperCase()}`;
      db.bugs.push({
        id: bugId,
        userId: number,
        name: msg.pushName || "Utilisateur",
        description: bugReport,
        date: new Date().toISOString(),
        status: "open", // open, investigating, fixed, wontfix
        priority: "medium"
      });
      
      db.stats.totalBugs++;
      saveFeedbackDB(db);

      repondre(`🐛 *BUG SIGNALÉ!*\n\n📌 ID: ${bugId}\n📝 Description: "${bugReport}"\n📊 Statut: Ouvert\n\n━━━━━━━━━━━━━━━━━\n🔧 Notre équipe va analyser ce problème.\nMerci de nous aider à améliorer HANI-MD!`);

      // Notifier le propriétaire immédiatement
      if (config.OWNER_NUMBER) {
        const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await ovl.sendMessage(ownerJid, {
          text: `🐛 *NOUVEAU BUG SIGNALÉ!*\n\n📌 ID: ${bugId}\n👤 ${msg.pushName || "Utilisateur"}\n📱 +${number}\n\n📝 Description:\n${bugReport}`
        });
      }

    } catch (error) {
      console.error("[BUG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 VOIR LES STATISTIQUES DE FEEDBACK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "feedbackstats",
    classe: "Feedback",
    react: "📊",
    desc: "Voir les statistiques de feedback",
    alias: ["fbstats", "reviews"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const db = loadFeedbackDB();
      
      // Distribution des notes
      const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      Object.values(db.ratings).forEach(r => {
        ratingDist[r.score]++;
      });

      let statsText = `📊 *STATISTIQUES HANI-MD*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      // Note moyenne
      const avgRating = db.stats.averageRating || 0;
      const fullStars = Math.floor(avgRating);
      const hasHalf = avgRating - fullStars >= 0.5;
      const stars = "⭐".repeat(fullStars) + (hasHalf ? "✨" : "") + "☆".repeat(5 - fullStars - (hasHalf ? 1 : 0));
      
      statsText += `${stars}\n`;
      statsText += `📈 *Note moyenne:* ${avgRating}/5\n`;
      statsText += `👥 *Total d'avis:* ${db.stats.totalRatings}\n\n`;
      
      // Distribution
      statsText += `📊 *Distribution des notes:*\n`;
      for (let i = 5; i >= 1; i--) {
        const count = ratingDist[i];
        const percentage = db.stats.totalRatings > 0 
          ? Math.round((count / db.stats.totalRatings) * 100) 
          : 0;
        const bar = "█".repeat(Math.floor(percentage / 10)) + "░".repeat(10 - Math.floor(percentage / 10));
        statsText += `${"⭐".repeat(i)} ${bar} ${count} (${percentage}%)\n`;
      }
      
      statsText += `\n💬 Témoignages: ${db.stats.totalTestimonials}\n`;
      statsText += `💡 Suggestions: ${db.stats.totalSuggestions}\n`;
      statsText += `🐛 Bugs signalés: ${db.stats.totalBugs}\n\n`;
      
      statsText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      statsText += `🌟 Laissez votre avis: .rate [1-5]`;

      repondre(statsText);

    } catch (error) {
      console.error("[FEEDBACKSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📖 VOIR LES TÉMOIGNAGES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "testimonials",
    classe: "Feedback",
    react: "📖",
    desc: "Voir les témoignages approuvés",
    alias: ["temoignages", "avis"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const db = loadFeedbackDB();
      const approved = db.testimonials.filter(t => t.approved);

      if (approved.length === 0) {
        return repondre(`📖 *TÉMOIGNAGES*\n\n📭 Aucun témoignage pour le moment.\n\n💬 Soyez le premier: .testimonial [votre avis]`);
      }

      let text = `📖 *TÉMOIGNAGES CLIENTS*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      approved.slice(-5).forEach((t, i) => {
        text += `💬 _"${t.content}"_\n`;
        text += `   — ${t.name}, ${new Date(t.date).toLocaleDateString("fr-FR")}\n\n`;
      });

      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `✍️ Laissez le vôtre: .testimonial`;

      repondre(text);

    } catch (error) {
      console.error("[TESTIMONIALS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ APPROUVER UN TÉMOIGNAGE (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "approvet",
    classe: "Feedback",
    react: "✅",
    desc: "Approuver un témoignage (Owner)",
    alias: ["approvetestimonial"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const index = parseInt(arg[0]);
      const db = loadFeedbackDB();

      if (isNaN(index) || !db.testimonials[index]) {
        return repondre("❌ Index invalide. Vérifiez le numéro du témoignage.");
      }

      db.testimonials[index].approved = true;
      saveFeedbackDB(db);

      repondre(`✅ Témoignage #${index} approuvé!\n\n💬 "${db.testimonials[index].content}"`);

    } catch (error) {
      console.error("[APPROVET]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 VOIR SUGGESTIONS/BUGS (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "viewfeedback",
    classe: "Feedback",
    react: "📋",
    desc: "Voir toutes les suggestions/bugs (Owner)",
    alias: ["allfeedback", "fblist"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const type = arg[0]?.toLowerCase() || "all";
      const db = loadFeedbackDB();
      
      let text = "";

      if (type === "suggestions" || type === "all") {
        text += `💡 *SUGGESTIONS (${db.suggestions.length})*\n\n`;
        db.suggestions.slice(-10).forEach((s, i) => {
          text += `${i + 1}. [${s.status}] ${s.content.substring(0, 50)}...\n   👤 ${s.name}\n\n`;
        });
      }

      if (type === "bugs" || type === "all") {
        text += `\n🐛 *BUGS (${db.bugs.length})*\n\n`;
        db.bugs.slice(-10).forEach((b, i) => {
          text += `${b.id} [${b.status}]\n   ${b.description.substring(0, 50)}...\n   👤 ${b.name}\n\n`;
        });
      }

      if (type === "testimonials" || type === "all") {
        const pending = db.testimonials.filter(t => !t.approved);
        text += `\n💬 *TÉMOIGNAGES EN ATTENTE (${pending.length})*\n\n`;
        pending.slice(0, 5).forEach((t, i) => {
          text += `${i}. "${t.content.substring(0, 40)}..."\n   👤 ${t.name}\n   ✅ Approuver: .approvet ${db.testimonials.indexOf(t)}\n\n`;
        });
      }

      if (!text) {
        text = "📭 Aucun feedback à afficher.";
      }

      repondre(text);

    } catch (error) {
      console.error("[VIEWFEEDBACK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Feedback.js chargé - Commandes: rate, testimonial, suggest, bug, feedbackstats, testimonials, approvet, viewfeedback");
