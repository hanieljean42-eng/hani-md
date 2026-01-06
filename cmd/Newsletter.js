/**
 * ═══════════════════════════════════════════════════════════
 * 📰 HANI-MD - Système Newsletter & Engagement
 * ═══════════════════════════════════════════════════════════
 * Système de newsletter pour engager vos contacts légitimement
 * Gestion des abonnés, envoi groupé, statistiques
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { downloadMedia } = require("../lib/mediaDownloader");
const fs = require("fs");
const path = require("path");

// Base de données Newsletter
const NEWSLETTER_DB_PATH = path.join(__dirname, "../DataBase/newsletter.json");

// Charger/Sauvegarder la DB
function loadNewsletterDB() {
  try {
    if (fs.existsSync(NEWSLETTER_DB_PATH)) {
      return JSON.parse(fs.readFileSync(NEWSLETTER_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    subscribers: {}, 
    campaigns: [],
    settings: {
      welcomeMessage: "🎉 Bienvenue dans notre newsletter! Vous recevrez nos dernières actualités.",
      unsubscribeMessage: "😢 Vous avez été désabonné de la newsletter. Tapez 'subscribe' pour vous réinscrire."
    },
    stats: {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0
    }
  };
}

function saveNewsletterDB(data) {
  try {
    fs.writeFileSync(NEWSLETTER_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error("[NEWSLETTER] Erreur sauvegarde:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 📧 ENVOYER NEWSLETTER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "newsletter",
    classe: "Newsletter",
    react: "📰",
    desc: "Envoyer une newsletter à tous les abonnés",
    alias: ["nl", "sendnews", "envoiernews"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const message = arg.join(" ");
      if (!message) {
        return repondre("❌ Utilisation: .newsletter [message]\n\nExemple: .newsletter 🎉 Nouvelle mise à jour disponible!");
      }

      const db = loadNewsletterDB();
      const subscribers = Object.values(db.subscribers).filter(s => s.active);
      
      if (subscribers.length === 0) {
        return repondre("❌ Aucun abonné à la newsletter.\n\nLes utilisateurs peuvent s'abonner avec: .subscribe");
      }

      await repondre(`📰 *Envoi de la newsletter...*\n\n👥 Destinataires: ${subscribers.length} abonnés`);

      let sent = 0;
      let failed = 0;
      const campaign = {
        id: Date.now(),
        date: new Date().toISOString(),
        message: message,
        sent: 0,
        failed: 0,
        recipients: []
      };

      for (const subscriber of subscribers) {
        try {
          await ovl.sendMessage(subscriber.jid, {
            text: `📰 *NEWSLETTER*\n━━━━━━━━━━━━━━━━━\n\n${message}\n\n━━━━━━━━━━━━━━━━━\n📌 _Répondez 'stop' pour vous désabonner_\n🤖 *HANI-MD*`
          });
          sent++;
          campaign.recipients.push({ jid: subscriber.jid, status: "sent" });
          await new Promise(resolve => setTimeout(resolve, 1500)); // Anti-spam delay
        } catch (e) {
          failed++;
          campaign.recipients.push({ jid: subscriber.jid, status: "failed", error: e.message });
        }
      }

      campaign.sent = sent;
      campaign.failed = failed;
      db.campaigns.push(campaign);
      db.stats.totalSent += sent;
      db.stats.totalFailed += failed;
      saveNewsletterDB(db);

      repondre(`📰 *Newsletter envoyée!*\n\n✅ Envoyé: ${sent}\n❌ Échec: ${failed}\n📊 Total abonnés: ${subscribers.length}`);

    } catch (error) {
      console.error("[NEWSLETTER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ➕ S'ABONNER À LA NEWSLETTER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "subscribe",
    classe: "Newsletter",
    react: "✅",
    desc: "S'abonner à la newsletter",
    alias: ["abonner", "inscrire", "sub"]
  },
  async (ovl, msg, { repondre, ms }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const db = loadNewsletterDB();
      const number = sender.split("@")[0];
      
      if (db.subscribers[number] && db.subscribers[number].active) {
        return repondre("ℹ️ Vous êtes déjà abonné à la newsletter!");
      }

      db.subscribers[number] = {
        jid: sender,
        number: number,
        subscribedAt: new Date().toISOString(),
        active: true,
        name: msg.pushName || "Abonné"
      };
      
      saveNewsletterDB(db);

      repondre(`✅ *Abonnement réussi!*\n\n${db.settings.welcomeMessage}\n\n📧 Vous recevrez nos actualités directement ici.\n📌 Pour vous désabonner: .unsubscribe`);

    } catch (error) {
      console.error("[SUBSCRIBE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ➖ SE DÉSABONNER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "unsubscribe",
    classe: "Newsletter",
    react: "👋",
    desc: "Se désabonner de la newsletter",
    alias: ["desabonner", "unsub", "stop"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];
      const db = loadNewsletterDB();

      if (!db.subscribers[number] || !db.subscribers[number].active) {
        return repondre("ℹ️ Vous n'êtes pas abonné à la newsletter.");
      }

      db.subscribers[number].active = false;
      db.subscribers[number].unsubscribedAt = new Date().toISOString();
      saveNewsletterDB(db);

      repondre(`👋 *Désabonnement effectué*\n\n${db.settings.unsubscribeMessage}`);

    } catch (error) {
      console.error("[UNSUBSCRIBE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES NEWSLETTER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "nlstats",
    classe: "Newsletter",
    react: "📊",
    desc: "Voir les statistiques de la newsletter",
    alias: ["newsstats", "newsletterstats", "statnews"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadNewsletterDB();
      const activeSubscribers = Object.values(db.subscribers).filter(s => s.active).length;
      const totalSubscribers = Object.keys(db.subscribers).length;
      const totalCampaigns = db.campaigns.length;
      const lastCampaign = db.campaigns[db.campaigns.length - 1];

      let statsText = `📊 *STATISTIQUES NEWSLETTER*\n━━━━━━━━━━━━━━━━━\n\n`;
      statsText += `👥 *Abonnés actifs:* ${activeSubscribers}\n`;
      statsText += `📈 *Total inscrits:* ${totalSubscribers}\n`;
      statsText += `📤 *Campagnes envoyées:* ${totalCampaigns}\n`;
      statsText += `✅ *Messages envoyés:* ${db.stats.totalSent}\n`;
      statsText += `❌ *Échecs:* ${db.stats.totalFailed}\n`;

      if (lastCampaign) {
        const lastDate = new Date(lastCampaign.date).toLocaleDateString("fr-FR");
        statsText += `\n📅 *Dernière campagne:* ${lastDate}`;
        statsText += `\n📧 *Dernier envoi:* ${lastCampaign.sent}/${lastCampaign.sent + lastCampaign.failed}`;
      }

      repondre(statsText);

    } catch (error) {
      console.error("[NLSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👥 LISTE DES ABONNÉS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "subscribers",
    classe: "Newsletter",
    react: "👥",
    desc: "Voir la liste des abonnés",
    alias: ["abonnes", "listsub", "nllist"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadNewsletterDB();
      const activeSubscribers = Object.values(db.subscribers).filter(s => s.active);

      if (activeSubscribers.length === 0) {
        return repondre("📭 Aucun abonné pour le moment.\n\nPartagez votre lien wa.me pour gagner des abonnés!");
      }

      let listText = `👥 *LISTE DES ABONNÉS*\n━━━━━━━━━━━━━━━━━\n\n`;
      listText += `📊 Total: ${activeSubscribers.length} abonnés\n\n`;

      activeSubscribers.slice(0, 20).forEach((sub, index) => {
        const date = new Date(sub.subscribedAt).toLocaleDateString("fr-FR");
        listText += `${index + 1}. ${sub.name} (+${sub.number})\n   📅 Inscrit le: ${date}\n\n`;
      });

      if (activeSubscribers.length > 20) {
        listText += `\n... et ${activeSubscribers.length - 20} autres`;
      }

      repondre(listText);

    } catch (error) {
      console.error("[SUBSCRIBERS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📧 MESSAGE PERSONNALISÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "nlmsg",
    classe: "Newsletter",
    react: "📧",
    desc: "Configurer les messages de la newsletter",
    alias: ["nlconfig", "newsconfig"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const subCommand = arg[0]?.toLowerCase();
      const message = arg.slice(1).join(" ");

      if (!subCommand) {
        return repondre(`📧 *Configuration Newsletter*\n\n.nlmsg welcome [message] - Message de bienvenue\n.nlmsg bye [message] - Message de désinscription\n.nlmsg show - Voir la config actuelle`);
      }

      const db = loadNewsletterDB();

      if (subCommand === "welcome" && message) {
        db.settings.welcomeMessage = message;
        saveNewsletterDB(db);
        repondre(`✅ Message de bienvenue mis à jour:\n\n"${message}"`);
      } else if (subCommand === "bye" && message) {
        db.settings.unsubscribeMessage = message;
        saveNewsletterDB(db);
        repondre(`✅ Message de désinscription mis à jour:\n\n"${message}"`);
      } else if (subCommand === "show") {
        repondre(`📧 *Configuration actuelle*\n\n🎉 *Bienvenue:*\n${db.settings.welcomeMessage}\n\n👋 *Désinscription:*\n${db.settings.unsubscribeMessage}`);
      } else {
        repondre("❌ Sous-commande invalide. Utilisez: welcome, bye, ou show");
      }

    } catch (error) {
      console.error("[NLMSG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 NEWSLETTER AVEC MEDIA
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "nlmedia",
    classe: "Newsletter",
    react: "📸",
    desc: "Envoyer une newsletter avec média (image/vidéo)",
    alias: ["newsmedia", "nlimage", "nlvideo"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage && !quotedMessage?.videoMessage) {
        return repondre("❌ Répondez à une image ou vidéo avec .nlmedia [caption]");
      }

      const caption = arg.join(" ") || "📰 Nouvelle actualité!";
      const db = loadNewsletterDB();
      const subscribers = Object.values(db.subscribers).filter(s => s.active);

      if (subscribers.length === 0) {
        return repondre("❌ Aucun abonné à la newsletter.");
      }

      await repondre(`📸 *Envoi du média à ${subscribers.length} abonnés...*`);

      const mediaBuffer = await downloadMedia(quotedMessage);

      if (!mediaBuffer) {
        return repondre("❌ Impossible de télécharger le média");
      }

      let sent = 0, failed = 0;
      const isVideo = !!quotedMessage.videoMessage;

      for (const subscriber of subscribers) {
        try {
          if (isVideo) {
            await ovl.sendMessage(subscriber.jid, {
              video: mediaBuffer,
              caption: `📰 *NEWSLETTER*\n━━━━━━━━━━━━━━━━━\n\n${caption}\n\n📌 _Répondez 'stop' pour vous désabonner_`
            });
          } else {
            await ovl.sendMessage(subscriber.jid, {
              image: mediaBuffer,
              caption: `📰 *NEWSLETTER*\n━━━━━━━━━━━━━━━━━\n\n${caption}\n\n📌 _Répondez 'stop' pour vous désabonner_`
            });
          }
          sent++;
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e) {
          failed++;
        }
      }

      db.stats.totalSent += sent;
      db.stats.totalFailed += failed;
      saveNewsletterDB(db);

      repondre(`📸 *Newsletter média envoyée!*\n\n✅ Envoyé: ${sent}\n❌ Échec: ${failed}`);

    } catch (error) {
      console.error("[NLMEDIA]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ PURGER LES ABONNÉS INACTIFS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "nlpurge",
    classe: "Newsletter",
    react: "🗑️",
    desc: "Supprimer les abonnés inactifs",
    alias: ["purgenlsubscribers", "cleansubscribers"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const db = loadNewsletterDB();
      const inactiveCount = Object.values(db.subscribers).filter(s => !s.active).length;

      if (inactiveCount === 0) {
        return repondre("✅ Aucun abonné inactif à supprimer.");
      }

      // Garder uniquement les actifs
      const activeSubscribers = {};
      for (const [key, sub] of Object.entries(db.subscribers)) {
        if (sub.active) {
          activeSubscribers[key] = sub;
        }
      }
      
      db.subscribers = activeSubscribers;
      saveNewsletterDB(db);

      repondre(`🗑️ *Purge effectuée!*\n\n✅ ${inactiveCount} abonnés inactifs supprimés\n👥 Abonnés restants: ${Object.keys(activeSubscribers).length}`);

    } catch (error) {
      console.error("[NLPURGE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Newsletter.js chargé - Commandes: newsletter, subscribe, unsubscribe, nlstats, subscribers, nlmsg, nlmedia, nlpurge");
