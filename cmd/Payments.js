/**
 * ═══════════════════════════════════════════════════════════
 * 💰 HANI-MD - Commandes de Gestion des Paiements
 * ═══════════════════════════════════════════════════════════
 * Commandes pour valider les paiements des clients
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const PaymentSystem = require("../lib/PaymentSystem");
const MultiSession = require("../lib/MultiSession");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES PAIEMENTS EN ATTENTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pendingpays",
    classe: "Owner",
    react: "⏳",
    desc: "Voir les paiements en attente de validation",
    alias: ["paiementsattente", "waitpays", "pp"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const pending = PaymentSystem.getPendingPayments();
      
      if (pending.length === 0) {
        return repondre("📭 *Aucun paiement en attente*\n\nTous les paiements ont été traités.");
      }

      let message = `💰 *PAIEMENTS EN ATTENTE (${pending.length})*\n\n`;
      
      pending.forEach((p, i) => {
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `*${i + 1}. ${p.orderId}*\n`;
        message += `👤 Client: +${p.clientPhone}\n`;
        message += `📦 Plan: ${p.planEmoji} ${p.planName}\n`;
        message += `💵 Montant: ${p.amount.toLocaleString()} ${p.currency}\n`;
        message += `📱 Via: ${p.paymentMethodName}\n`;
        message += `📅 ${new Date(p.createdAt).toLocaleString('fr-FR')}\n`;
      });

      message += `\n━━━━━━━━━━━━━━━━━━`;
      message += `\n✅ Pour valider: .validatepay ORD-XXXXX`;
      message += `\n❌ Pour rejeter: .rejectpay ORD-XXXXX [raison]`;

      await repondre(message);

    } catch (error) {
      console.error("[PENDINGPAYS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ VALIDER UN PAIEMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "validatepay",
    classe: "Owner",
    react: "✅",
    desc: "Valider un paiement client",
    alias: ["confirmpay", "vp", "payok"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!arg[0]) {
        return repondre("❌ *Usage:* .validatepay ORD-XXXXX [transactionId]\n\n📋 Utilisez .pendingpays pour voir les paiements en attente");
      }

      const orderId = arg[0].toUpperCase();
      const transactionId = arg[1] || "";

      // Trouver le paiement par orderId
      const pending = PaymentSystem.getPendingPayments();
      const payment = pending.find(p => p.orderId === orderId);

      if (!payment) {
        return repondre(`❌ Paiement *${orderId}* non trouvé ou déjà traité`);
      }

      // Confirmer le paiement
      const result = PaymentSystem.confirmPayment(payment.paymentId, transactionId, "Validé via WhatsApp");

      if (!result.success) {
        return repondre(`❌ Erreur: ${result.error}`);
      }

      // Activer le client dans MultiSession
      const clientJid = `${payment.clientPhone}@s.whatsapp.net`;
      const activationResult = MultiSession.activateClient(clientJid, payment.plan, payment.duration);

      // Envoyer confirmation au client
      const clientConfirmation = PaymentSystem.generateClientConfirmation(result.payment);
      try {
        await ovl.sendMessage(clientJid, { text: clientConfirmation });
      } catch (e) {
        console.log("[VALIDATEPAY] Impossible d'envoyer au client:", e.message);
      }

      let response = `✅ *PAIEMENT VALIDÉ!*\n\n`;
      response += `📋 Référence: ${orderId}\n`;
      response += `👤 Client: +${payment.clientPhone}\n`;
      response += `📦 Plan: ${payment.planEmoji} ${payment.planName}\n`;
      response += `💵 Montant: ${payment.amount.toLocaleString()} ${payment.currency}\n`;
      response += `📅 Durée: ${payment.duration} jours\n\n`;
      response += `🔔 Le client a été notifié par WhatsApp.`;

      await repondre(response);

    } catch (error) {
      console.error("[VALIDATEPAY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❌ REJETER UN PAIEMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rejectpay",
    classe: "Owner",
    react: "❌",
    desc: "Rejeter un paiement client",
    alias: ["denypay", "rp", "payno"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!arg[0]) {
        return repondre("❌ *Usage:* .rejectpay ORD-XXXXX [raison]");
      }

      const orderId = arg[0].toUpperCase();
      const reason = arg.slice(1).join(" ") || "Paiement non reçu ou non conforme";

      // Trouver le paiement
      const pending = PaymentSystem.getPendingPayments();
      const payment = pending.find(p => p.orderId === orderId);

      if (!payment) {
        return repondre(`❌ Paiement *${orderId}* non trouvé ou déjà traité`);
      }

      // Rejeter le paiement
      const result = PaymentSystem.rejectPayment(payment.paymentId, reason);

      if (!result.success) {
        return repondre(`❌ Erreur: ${result.error}`);
      }

      // Informer le client du rejet
      const clientJid = `${payment.clientPhone}@s.whatsapp.net`;
      const rejectMessage = `❌ *Paiement Rejeté*\n\n📋 Référence: ${orderId}\n💵 Montant: ${payment.amount} ${payment.currency}\n\n📝 Raison: ${reason}\n\n💬 Si vous pensez qu'il s'agit d'une erreur, contactez le support.`;
      
      try {
        await ovl.sendMessage(clientJid, { text: rejectMessage });
      } catch (e) {
        console.log("[REJECTPAY] Impossible d'envoyer au client:", e.message);
      }

      await repondre(`❌ *Paiement rejeté*\n\n📋 Référence: ${orderId}\n📝 Raison: ${reason}\n\n🔔 Le client a été notifié.`);

    } catch (error) {
      console.error("[REJECTPAY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES PAIEMENTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "paymentstats",
    classe: "Owner",
    react: "📊",
    desc: "Statistiques des paiements",
    alias: ["paystats", "revenus", "chiffre"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const stats = PaymentSystem.getPaymentStats();

      let message = `📊 *STATISTIQUES PAIEMENTS*\n\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `💰 *Revenus Aujourd'hui:* ${stats.todayRevenue.toLocaleString()} ${stats.currency}\n`;
      message += `📅 *Revenus ce Mois:* ${stats.monthRevenue.toLocaleString()} ${stats.currency}\n`;
      message += `💎 *Revenus Total:* ${stats.totalRevenue.toLocaleString()} ${stats.currency}\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `✅ *Paiements Complétés:* ${stats.totalPayments}\n`;
      message += `⏳ *En Attente:* ${stats.pendingPayments}\n`;
      message += `━━━━━━━━━━━━━━━━━━\n\n`;
      message += `📈 *Par Plan:*\n`;

      Object.entries(stats.planBreakdown).forEach(([plan, data]) => {
        if (data.count > 0) {
          const emoji = plan === 'bronze' ? '🥉' : plan === 'argent' ? '🥈' : plan === 'or' ? '🥇' : plan === 'diamant' ? '💎' : '👑';
          message += `${emoji} ${plan.charAt(0).toUpperCase() + plan.slice(1)}: ${data.count} (${data.revenue.toLocaleString()} ${stats.currency})\n`;
        }
      });

      await repondre(message);

    } catch (error) {
      console.error("[PAYMENTSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📜 HISTORIQUE PAIEMENTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "payhistory",
    classe: "Owner",
    react: "📜",
    desc: "Historique des derniers paiements",
    alias: ["historiquepay", "lastpays"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const limit = parseInt(arg[0]) || 10;
      const completed = PaymentSystem.getCompletedPayments(limit);

      if (completed.length === 0) {
        return repondre("📭 Aucun paiement dans l'historique");
      }

      let message = `📜 *DERNIERS PAIEMENTS (${completed.length})*\n\n`;

      completed.forEach((p, i) => {
        message += `${i + 1}. *${p.orderId}*\n`;
        message += `   👤 +${p.clientPhone}\n`;
        message += `   💵 ${p.amount.toLocaleString()} ${p.currency} (${p.planEmoji} ${p.planName})\n`;
        message += `   📅 ${new Date(p.completedAt).toLocaleString('fr-FR')}\n\n`;
      });

      await repondre(message);

    } catch (error) {
      console.error("[PAYHISTORY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔍 RECHERCHER PAIEMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "findpay",
    classe: "Owner",
    react: "🔍",
    desc: "Rechercher un paiement par référence ou numéro",
    alias: ["searchpay", "checkpay"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!arg[0]) {
        return repondre("❌ *Usage:* .findpay ORD-XXXXX ou .findpay +225XXXXXXXXXX");
      }

      const search = arg[0].toUpperCase();
      const payment = PaymentSystem.getPaymentByOrderId(search);

      if (payment) {
        let message = `🔍 *PAIEMENT TROUVÉ*\n\n`;
        message += `📋 Référence: ${payment.orderId}\n`;
        message += `👤 Client: +${payment.clientPhone}\n`;
        message += `📦 Plan: ${payment.planEmoji} ${payment.planName}\n`;
        message += `💵 Montant: ${payment.amount.toLocaleString()} ${payment.currency}\n`;
        message += `📱 Méthode: ${payment.paymentMethodName}\n`;
        message += `📊 Statut: ${payment.status === 'completed' ? '✅ Complété' : payment.status === 'pending' ? '⏳ En attente' : '❌ Rejeté'}\n`;
        message += `📅 Créé le: ${new Date(payment.createdAt).toLocaleString('fr-FR')}\n`;
        
        if (payment.completedAt) {
          message += `✅ Complété le: ${new Date(payment.completedAt).toLocaleString('fr-FR')}\n`;
        }

        return repondre(message);
      }

      // Rechercher par numéro de téléphone
      const phone = arg[0].replace(/[^0-9]/g, '');
      const payments = PaymentSystem.getPaymentsByPhone(phone);

      if (payments.length > 0) {
        let message = `🔍 *PAIEMENTS POUR +${phone}*\n\n`;
        
        payments.forEach((p, i) => {
          const statusEmoji = p.status === 'completed' ? '✅' : p.status === 'pending' ? '⏳' : '❌';
          message += `${i + 1}. ${statusEmoji} ${p.orderId}\n`;
          message += `   📦 ${p.planEmoji} ${p.planName} - ${p.amount.toLocaleString()} ${p.currency}\n`;
          message += `   📅 ${new Date(p.createdAt).toLocaleString('fr-FR')}\n\n`;
        });

        return repondre(message);
      }

      repondre(`❌ Aucun paiement trouvé pour "${arg[0]}"`);

    } catch (error) {
      console.error("[FINDPAY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👥 LISTE DES CLIENTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "clients",
    classe: "Owner",
    react: "👥",
    desc: "Liste des clients actifs",
    alias: ["listclients", "mesclients"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const clients = MultiSession.getAllClients();
      const activeClients = clients.filter(c => c.status === 'active' || c.status === 'connected');

      if (activeClients.length === 0) {
        return repondre("📭 Aucun client actif pour le moment");
      }

      let message = `👥 *CLIENTS ACTIFS (${activeClients.length})*\n\n`;

      activeClients.forEach((c, i) => {
        const planEmoji = c.plan === 'bronze' ? '🥉' : c.plan === 'argent' ? '🥈' : c.plan === 'or' ? '🥇' : c.plan === 'diamant' ? '💎' : '👑';
        const statusEmoji = c.status === 'connected' ? '🟢' : '🟡';
        
        message += `${i + 1}. ${statusEmoji} *${c.clientId}*\n`;
        message += `   📞 +${c.phoneNumber || 'N/A'}\n`;
        message += `   ${planEmoji} ${c.plan?.charAt(0).toUpperCase() + c.plan?.slice(1) || 'N/A'}\n`;
        
        if (c.expiresAt) {
          const remaining = Math.ceil((new Date(c.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
          message += `   ⏳ ${remaining > 0 ? remaining + ' jours restants' : 'Expiré'}\n`;
        }
        message += `\n`;
      });

      await repondre(message);

    } catch (error) {
      console.error("[CLIENTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎁 OFFRIR UN ABONNEMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "giftplan",
    classe: "Owner",
    react: "🎁",
    desc: "Offrir un abonnement gratuit à un client",
    alias: ["gift", "offrir"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (arg.length < 2) {
        return repondre("❌ *Usage:* .giftplan +225XXXXXXXXXX bronze|argent|or|diamant|lifetime");
      }

      const phone = arg[0].replace(/[^0-9]/g, '');
      const plan = arg[1].toLowerCase();

      const validPlans = ['bronze', 'argent', 'or', 'diamant', 'lifetime'];
      if (!validPlans.includes(plan)) {
        return repondre(`❌ Plan invalide. Choisissez: ${validPlans.join(', ')}`);
      }

      // Durées des plans
      const durations = {
        bronze: 7,
        argent: 15,
        or: 30,
        diamant: 90,
        lifetime: 3650
      };

      // Activer le client
      const clientJid = `${phone}@s.whatsapp.net`;
      const result = MultiSession.activateClient(clientJid, plan, durations[plan]);

      // Notifier le client
      const planEmoji = plan === 'bronze' ? '🥉' : plan === 'argent' ? '🥈' : plan === 'or' ? '🥇' : plan === 'diamant' ? '💎' : '👑';
      const giftMessage = `🎁 *CADEAU SPÉCIAL!*\n\nVous avez reçu un abonnement gratuit!\n\n${planEmoji} *Plan:* ${plan.charAt(0).toUpperCase() + plan.slice(1)}\n⏳ *Durée:* ${durations[plan]} jours\n\nMerci de votre fidélité! 💖`;

      try {
        await ovl.sendMessage(clientJid, { text: giftMessage });
      } catch (e) {
        console.log("[GIFTPLAN] Impossible d'envoyer au client:", e.message);
      }

      await repondre(`🎁 *Abonnement offert!*\n\n👤 Client: +${phone}\n${planEmoji} Plan: ${plan}\n⏳ Durée: ${durations[plan]} jours\n\n🔔 Le client a été notifié.`);

    } catch (error) {
      console.error("[GIFTPLAN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Payments.js chargé - Commandes: pendingpays, validatepay, rejectpay, paymentstats, payhistory, findpay, clients, giftplan");
