/**
 * ═══════════════════════════════════════════════════════════
 * 🎫 HANI-MD - Système de Support Client
 * ═══════════════════════════════════════════════════════════
 * Gestion des tickets de support, FAQ, et assistance
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");
const config = require("../set");

// Base de données Support
const SUPPORT_DB_PATH = path.join(__dirname, "../DataBase/support.json");

function loadSupportDB() {
  try {
    if (fs.existsSync(SUPPORT_DB_PATH)) {
      return JSON.parse(fs.readFileSync(SUPPORT_DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    tickets: {},
    faq: [
      {
        q: "Comment obtenir le premium?",
        a: "Utilisez la commande .premium pour voir les plans, puis contactez le propriétaire pour payer."
      },
      {
        q: "Quelles sont les commandes disponibles?",
        a: "Tapez .menu pour voir toutes les commandes disponibles selon votre plan."
      },
      {
        q: "Le bot ne répond pas, que faire?",
        a: "Vérifiez que vous utilisez le bon préfixe (.) et que le bot est en ligne avec .ping"
      },
      {
        q: "Comment ajouter le bot à mon groupe?",
        a: "Demandez au propriétaire le lien d'invitation ou ajoutez le numéro directement."
      },
      {
        q: "Mes commandes sont limitées, pourquoi?",
        a: "Le plan gratuit a une limite de 20 commandes/jour. Passez au premium pour plus!"
      }
    ],
    settings: {
      autoReply: true,
      notifyOwner: true,
      maxTicketsPerUser: 3
    },
    stats: {
      totalTickets: 0,
      resolved: 0,
      pending: 0
    }
  };
}

function saveSupportDB(data) {
  try {
    fs.writeFileSync(SUPPORT_DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 🎫 CRÉER UN TICKET DE SUPPORT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ticket",
    classe: "Support",
    react: "🎫",
    desc: "Créer un ticket de support",
    alias: ["support", "aide", "help"]
  },
  async (ovl, msg, { arg, repondre, ms }) => {
    try {
      const subCommand = arg[0]?.toLowerCase();
      const sender = msg.key.participant || msg.key.remoteJid;
      const number = sender.split("@")[0];

      if (!subCommand || subCommand === "new") {
        const issue = arg.slice(1).join(" ") || arg.join(" ");
        
        if (!issue || issue.length < 10) {
          return repondre(`🎫 *CRÉER UN TICKET*\n\n❌ Veuillez décrire votre problème (min 10 caractères)\n\n📝 Utilisation:\n.ticket [description du problème]\n\n📌 Exemple:\n.ticket Je n'arrive pas à télécharger les vidéos YouTube`);
        }

        const db = loadSupportDB();
        
        // Vérifier limite de tickets
        const userTickets = Object.values(db.tickets).filter(t => 
          t.userId === number && t.status !== "closed"
        ).length;

        if (userTickets >= db.settings.maxTicketsPerUser) {
          return repondre(`❌ Vous avez déjà ${userTickets} ticket(s) en cours.\nVeuillez attendre leur résolution.`);
        }

        // Créer le ticket
        const ticketId = `TK${Date.now().toString(36).toUpperCase()}`;
        db.tickets[ticketId] = {
          id: ticketId,
          userId: number,
          userJid: sender,
          userName: msg.pushName || "Utilisateur",
          issue: issue,
          status: "open",
          priority: "normal",
          createdAt: new Date().toISOString(),
          messages: [{
            from: "user",
            content: issue,
            date: new Date().toISOString()
          }],
          resolvedAt: null
        };
        
        db.stats.totalTickets++;
        db.stats.pending++;
        saveSupportDB(db);

        // Notifier le propriétaire
        if (db.settings.notifyOwner && config.OWNER_NUMBER) {
          const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
          await ovl.sendMessage(ownerJid, {
            text: `🎫 *NOUVEAU TICKET*\n━━━━━━━━━━━━━━━━━\n\n📌 ID: ${ticketId}\n👤 De: ${msg.pushName || "Utilisateur"}\n📱 Numéro: +${number}\n\n📝 Problème:\n${issue}\n\n💡 Répondez avec:\n.treply ${ticketId} [message]`
          });
        }

        repondre(`🎫 *TICKET CRÉÉ!*\n\n📌 ID: *${ticketId}*\n📊 Statut: En attente\n\n📝 Problème:\n${issue}\n\n━━━━━━━━━━━━━━━━━\n⏱️ Un membre de l'équipe vous répondra bientôt.\n\n💡 Pour suivre votre ticket:\n.ticket status ${ticketId}`);

      } else if (subCommand === "status") {
        const ticketId = arg[1]?.toUpperCase();
        
        if (!ticketId) {
          return repondre("❌ Utilisation: .ticket status [ID]\nExemple: .ticket status TK123ABC");
        }

        const db = loadSupportDB();
        const ticket = db.tickets[ticketId];

        if (!ticket) {
          return repondre(`❌ Ticket ${ticketId} introuvable.`);
        }

        // Vérifier que c'est bien le propriétaire du ticket
        if (ticket.userId !== number) {
          return repondre("❌ Ce ticket ne vous appartient pas.");
        }

        const statusEmoji = {
          open: "🟡",
          "in-progress": "🔵",
          resolved: "🟢",
          closed: "⚫"
        };

        let statusText = `🎫 *STATUT DU TICKET*\n━━━━━━━━━━━━━━━━━\n\n`;
        statusText += `📌 ID: ${ticket.id}\n`;
        statusText += `${statusEmoji[ticket.status] || "⚪"} Statut: ${ticket.status.toUpperCase()}\n`;
        statusText += `📅 Créé le: ${new Date(ticket.createdAt).toLocaleDateString("fr-FR")}\n`;
        statusText += `\n📝 Problème:\n${ticket.issue}\n`;

        if (ticket.messages.length > 1) {
          statusText += `\n💬 *RÉPONSES (${ticket.messages.length - 1}):*\n`;
          ticket.messages.slice(1, 4).forEach((m, i) => {
            const from = m.from === "support" ? "🛠️ Support" : "👤 Vous";
            statusText += `\n${from}:\n${m.content.substring(0, 100)}${m.content.length > 100 ? "..." : ""}\n`;
          });
        }

        repondre(statusText);

      } else if (subCommand === "list") {
        const db = loadSupportDB();
        const userTickets = Object.values(db.tickets).filter(t => t.userId === number);

        if (userTickets.length === 0) {
          return repondre("📭 Vous n'avez aucun ticket.");
        }

        let listText = `🎫 *VOS TICKETS*\n━━━━━━━━━━━━━━━━━\n\n`;
        userTickets.forEach(t => {
          const statusEmoji = { open: "🟡", "in-progress": "🔵", resolved: "🟢", closed: "⚫" };
          listText += `${statusEmoji[t.status] || "⚪"} *${t.id}* - ${t.status}\n`;
          listText += `   ${t.issue.substring(0, 30)}...\n\n`;
        });

        repondre(listText);

      } else {
        // C'est probablement le problème directement
        const issue = arg.join(" ");
        if (issue.length >= 10) {
          // Créer le ticket avec le message complet
          const db = loadSupportDB();
          const ticketId = `TK${Date.now().toString(36).toUpperCase()}`;
          
          db.tickets[ticketId] = {
            id: ticketId,
            userId: number,
            userJid: sender,
            userName: msg.pushName || "Utilisateur",
            issue: issue,
            status: "open",
            priority: "normal",
            createdAt: new Date().toISOString(),
            messages: [{ from: "user", content: issue, date: new Date().toISOString() }]
          };
          
          db.stats.totalTickets++;
          db.stats.pending++;
          saveSupportDB(db);

          repondre(`🎫 *TICKET CRÉÉ!*\n\n📌 ID: *${ticketId}*\n📊 Statut: En attente\n\n⏱️ Un membre de l'équipe vous répondra bientôt.`);
        } else {
          repondre(`🎫 *SUPPORT HANI-MD*\n\n📌 Commandes:\n.ticket [problème] - Créer un ticket\n.ticket status [ID] - Voir le statut\n.ticket list - Vos tickets\n.faq - Questions fréquentes`);
        }
      }

    } catch (error) {
      console.error("[TICKET]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💬 RÉPONDRE À UN TICKET (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "treply",
    classe: "Support",
    react: "💬",
    desc: "Répondre à un ticket de support (Owner)",
    alias: ["ticketreply", "replyticket"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const ticketId = arg[0]?.toUpperCase();
      const reply = arg.slice(1).join(" ");

      if (!ticketId || !reply) {
        return repondre("❌ Utilisation: .treply [ID] [message]\n\nExemple: .treply TK123ABC Votre problème a été résolu!");
      }

      const db = loadSupportDB();
      const ticket = db.tickets[ticketId];

      if (!ticket) {
        return repondre(`❌ Ticket ${ticketId} introuvable.`);
      }

      // Ajouter la réponse
      ticket.messages.push({
        from: "support",
        content: reply,
        date: new Date().toISOString()
      });
      ticket.status = "in-progress";
      saveSupportDB(db);

      // Notifier l'utilisateur
      await ovl.sendMessage(ticket.userJid, {
        text: `🛠️ *RÉPONSE DU SUPPORT*\n━━━━━━━━━━━━━━━━━\n\n📌 Ticket: ${ticketId}\n\n💬 Message:\n${reply}\n\n━━━━━━━━━━━━━━━━━\n📩 Pour répondre: .treplyuser ${ticketId} [message]\n🤖 *HANI-MD Support*`
      });

      repondre(`✅ Réponse envoyée au ticket ${ticketId}`);

    } catch (error) {
      console.error("[TREPLY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ FERMER UN TICKET (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tclose",
    classe: "Support",
    react: "✅",
    desc: "Fermer un ticket de support (Owner)",
    alias: ["closeticket", "resolveticket"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const ticketId = arg[0]?.toUpperCase();
      const resolution = arg.slice(1).join(" ") || "Ticket résolu.";

      if (!ticketId) {
        return repondre("❌ Utilisation: .tclose [ID] [message de résolution]");
      }

      const db = loadSupportDB();
      const ticket = db.tickets[ticketId];

      if (!ticket) {
        return repondre(`❌ Ticket ${ticketId} introuvable.`);
      }

      ticket.status = "closed";
      ticket.resolvedAt = new Date().toISOString();
      ticket.messages.push({
        from: "support",
        content: `[RÉSOLU] ${resolution}`,
        date: new Date().toISOString()
      });
      
      db.stats.resolved++;
      db.stats.pending--;
      saveSupportDB(db);

      // Notifier l'utilisateur
      await ovl.sendMessage(ticket.userJid, {
        text: `✅ *TICKET RÉSOLU*\n━━━━━━━━━━━━━━━━━\n\n📌 Ticket: ${ticketId}\n\n💬 Résolution:\n${resolution}\n\n━━━━━━━━━━━━━━━━━\n⭐ N'hésitez pas à noter notre support avec .rate\n🤖 *HANI-MD Support*`
      });

      repondre(`✅ Ticket ${ticketId} fermé avec succès!`);

    } catch (error) {
      console.error("[TCLOSE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES TICKETS (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tickets",
    classe: "Support",
    react: "📋",
    desc: "Voir tous les tickets (Owner)",
    alias: ["alltickets", "listtickets"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const filter = arg[0]?.toLowerCase() || "open";
      const db = loadSupportDB();
      
      let tickets;
      if (filter === "all") {
        tickets = Object.values(db.tickets);
      } else {
        tickets = Object.values(db.tickets).filter(t => t.status === filter);
      }

      if (tickets.length === 0) {
        return repondre(`📭 Aucun ticket ${filter === "all" ? "" : `avec le statut "${filter}"`}`);
      }

      let listText = `📋 *TICKETS ${filter.toUpperCase()}*\n━━━━━━━━━━━━━━━━━\n\n`;
      listText += `📊 Total: ${tickets.length} | En attente: ${db.stats.pending} | Résolus: ${db.stats.resolved}\n\n`;

      tickets.slice(0, 15).forEach(t => {
        const statusEmoji = { open: "🟡", "in-progress": "🔵", resolved: "🟢", closed: "⚫" };
        listText += `${statusEmoji[t.status] || "⚪"} *${t.id}*\n`;
        listText += `   👤 ${t.userName} (+${t.userId})\n`;
        listText += `   📝 ${t.issue.substring(0, 40)}...\n`;
        listText += `   📅 ${new Date(t.createdAt).toLocaleDateString("fr-FR")}\n\n`;
      });

      if (tickets.length > 15) {
        listText += `\n... et ${tickets.length - 15} autres tickets`;
      }

      listText += `\n\n💡 Filtres: .tickets open/in-progress/closed/all`;

      repondre(listText);

    } catch (error) {
      console.error("[TICKETS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❓ FAQ - QUESTIONS FRÉQUENTES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "faq",
    classe: "Support",
    react: "❓",
    desc: "Questions fréquemment posées",
    alias: ["questions", "aide"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const db = loadSupportDB();
      
      let faqText = `❓ *FAQ - QUESTIONS FRÉQUENTES*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      db.faq.forEach((item, index) => {
        faqText += `*${index + 1}. ${item.q}*\n`;
        faqText += `➡️ ${item.a}\n\n`;
      });

      faqText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      faqText += `📌 Problème non résolu? Créez un ticket:\n.ticket [votre problème]\n\n`;
      faqText += `🤖 *HANI-MD Support*`;

      repondre(faqText);

    } catch (error) {
      console.error("[FAQ]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ➕ AJOUTER UNE FAQ (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "addfaq",
    classe: "Support",
    react: "➕",
    desc: "Ajouter une question à la FAQ (Owner)",
    alias: ["newfaq"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const fullText = arg.join(" ");
      const parts = fullText.split("|");

      if (parts.length < 2) {
        return repondre("❌ Format: .addfaq [question]|[réponse]\n\nExemple: .addfaq Comment payer?|Vous pouvez payer via Orange Money ou Wave.");
      }

      const db = loadSupportDB();
      db.faq.push({
        q: parts[0].trim(),
        a: parts[1].trim()
      });
      saveSupportDB(db);

      repondre(`✅ FAQ ajoutée!\n\n❓ ${parts[0].trim()}\n➡️ ${parts[1].trim()}`);

    } catch (error) {
      console.error("[ADDFAQ]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📞 CONTACTER LE SUPPORT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "contact",
    classe: "Support",
    react: "📞",
    desc: "Contacter le support directement",
    alias: ["owner", "contacter", "admin"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const ownerNumber = config.OWNER_NUMBER || config.NUMERO_OWNER || "";
      const ownerName = config.OWNER_NAME || config.NOM_OWNER || "HANIEL";
      const cleanNumber = ownerNumber.replace(/[^0-9]/g, "");

      let contactText = `📞 *CONTACTER LE SUPPORT*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      contactText += `👤 *Propriétaire:* ${ownerName}\n`;
      
      if (cleanNumber) {
        contactText += `📱 *WhatsApp:* wa.me/${cleanNumber}\n`;
        contactText += `\n🔗 *Lien direct:*\nhttps://wa.me/${cleanNumber}\n`;
      }

      contactText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      contactText += `💡 Avant de contacter:\n`;
      contactText += `• Consultez la FAQ: .faq\n`;
      contactText += `• Créez un ticket: .ticket\n`;
      contactText += `\n🤖 *HANI-MD*`;

      repondre(contactText);

    } catch (error) {
      console.error("[CONTACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Support.js chargé - Commandes: ticket, treply, tclose, tickets, faq, addfaq, contact");
