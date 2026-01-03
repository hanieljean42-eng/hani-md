/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💳 HANI-MD - COMMANDES WAVE PAYMENT               ║
 * ║     Gestion des paiements Wave et abonnements             ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd, cmd } = require('../lib/ovlcmd');
const path = require('path');
const fs = require('fs');

// Import du module Wave
let wavePayments;
try {
  wavePayments = require('../DataBase/wave_payments');
} catch (e) {
  console.error('[WAVE CMD] Erreur chargement module:', e.message);
}

// Import premium existant
let premiumDB;
try {
  premiumDB = require('../DataBase/premium');
} catch (e) {
  console.error('[WAVE CMD] Erreur chargement premium:', e.message);
}

// ═══════════════════════════════════════════════════════════
// 🔑 COMMANDE ACTIVATION (UTILISATEUR)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "activer",
    classe: "Premium",
    react: "🔑",
    desc: "Activer un abonnement avec un code Wave"
  },
  async (ms_org, ovl, cmd_options) => {
    const { arg, ms, auteur_msg } = cmd_options;
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, {
        text: "❌ Système de paiement non disponible."
      });
    }
    
    if (!arg || arg.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `🔑 *ACTIVATION D'ABONNEMENT*\n\n` +
              `Pour activer votre abonnement premium, utilisez:\n\n` +
              `*.activer VOTRE-CODE*\n\n` +
              `Exemple: *.activer HANI-OR-A1B2C3D4*\n\n` +
              `📱 Obtenez un code sur:\n` +
              `https://votre-site.com/subscribe`
      });
    }
    
    const code = arg[0].toUpperCase();
    
    // Activer avec le code
    const result = wavePayments.activateWithCode(code, auteur_msg);
    
    if (result.success) {
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      const expireText = result.expiresAt 
        ? `📅 Expire le: ${new Date(result.expiresAt).toLocaleDateString('fr-FR')}`
        : `📅 Durée: À VIE ♾️`;
      
      // Sync avec le système premium existant
      try {
        if (premiumDB) {
          const days = result.plan?.duration || 30;
          premiumDB.addPremium(auteur_msg, result.subscriber?.plan?.toLowerCase() || 'or', days);
        }
      } catch (e) {
        console.error('[WAVE] Erreur sync premium:', e.message);
      }
      
      return await ovl.sendMessage(ms_org, {
        text: `🎉 *ABONNEMENT ACTIVÉ !*\n\n` +
              `${planEmoji[result.subscriber?.plan] || '💎'} *Plan:* ${result.subscriber?.plan || 'Premium'}\n` +
              `👤 *Nom:* ${result.subscriber?.name || 'Utilisateur'}\n` +
              `${expireText}\n\n` +
              `✅ Vous avez maintenant accès à toutes les fonctionnalités premium !\n\n` +
              `Tapez *.menu* pour voir les commandes disponibles.`
      });
    } else {
      return await ovl.sendMessage(ms_org, {
        text: `❌ *Erreur d'activation*\n\n${result.error || 'Code invalide'}\n\n` +
              `Vérifiez votre code et réessayez.`
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👑 COMMANDES OWNER - GESTION WAVE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "wavepending",
    classe: "Owner",
    react: "⏳",
    desc: "Voir les paiements Wave en attente"
  },
  async (ms_org, ovl, cmd_options) => {
    const { superUser } = cmd_options;
    
    if (!superUser) {
      return await ovl.sendMessage(ms_org, { text: "❌ Commande réservée à l'owner." });
    }
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, { text: "❌ Module Wave non disponible." });
    }
    
    const pending = wavePayments.getAllSubscribers('pending');
    
    if (pending.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `⏳ *PAIEMENTS EN ATTENTE*\n\n` +
              `Aucun paiement en attente de validation.\n\n` +
              `Les clients doivent d'abord s'inscrire sur le site web.`
      });
    }
    
    let message = `⏳ *PAIEMENTS EN ATTENTE* (${pending.length})\n\n`;
    
    pending.forEach((sub, i) => {
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      message += `*${i + 1}. ${sub.name}*\n`;
      message += `   📱 ${sub.phone}\n`;
      message += `   ${planEmoji[sub.plan] || '💎'} ${sub.plan} - ${sub.amount} FCFA\n`;
      message += `   🆔 Réf: ${sub.paymentRef}\n`;
      message += `   📅 ${new Date(sub.createdAt).toLocaleString('fr-FR')}\n\n`;
    });
    
    message += `\n💡 Pour confirmer un paiement:\n*.waveconfirm <ref>*\n\nExemple: *.waveconfirm HANI-A1B2C3D4*`;
    
    return await ovl.sendMessage(ms_org, { text: message });
  }
);

ovlcmd(
  {
    nom_cmd: "waveconfirm",
    classe: "Owner",
    react: "✅",
    desc: "Confirmer un paiement Wave et générer le code"
  },
  async (ms_org, ovl, cmd_options) => {
    const { arg, superUser, auteur_msg } = cmd_options;
    
    if (!superUser) {
      return await ovl.sendMessage(ms_org, { text: "❌ Commande réservée à l'owner." });
    }
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, { text: "❌ Module Wave non disponible." });
    }
    
    if (!arg || arg.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `✅ *CONFIRMER UN PAIEMENT*\n\n` +
              `Usage: *.waveconfirm <référence>*\n\n` +
              `Exemple: *.waveconfirm HANI-A1B2C3D4*\n\n` +
              `Utilisez *.wavepending* pour voir les paiements en attente.`
      });
    }
    
    const ref = arg[0].toUpperCase();
    const result = wavePayments.confirmPayment(ref);
    
    if (result.success) {
      // Sync avec le système premium existant
      try {
        if (premiumDB && result.subscriber) {
          const jid = result.subscriber.phone + '@s.whatsapp.net';
          const days = result.subscriber.planDetails?.duration || 30;
          premiumDB.addPremium(jid, result.subscriber.plan.toLowerCase(), days);
        }
      } catch (e) {
        console.error('[WAVE] Erreur sync premium:', e.message);
      }
      
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      
      return await ovl.sendMessage(ms_org, {
        text: `✅ *PAIEMENT CONFIRMÉ !*\n\n` +
              `👤 *Client:* ${result.subscriber?.name}\n` +
              `📱 *Téléphone:* ${result.subscriber?.phone}\n` +
              `${planEmoji[result.subscriber?.plan] || '💎'} *Plan:* ${result.subscriber?.plan}\n` +
              `💰 *Montant:* ${result.subscriber?.amount} FCFA\n\n` +
              `🔑 *CODE D'ACTIVATION:*\n` +
              `\`\`\`${result.activationCode}\`\`\`\n\n` +
              `Le client peut maintenant activer son abonnement avec:\n` +
              `*.activer ${result.activationCode}*`
      });
    } else {
      return await ovl.sendMessage(ms_org, {
        text: `❌ *Erreur*\n\n${result.error || 'Impossible de confirmer ce paiement'}`
      });
    }
  }
);

ovlcmd(
  {
    nom_cmd: "wavestats",
    classe: "Owner",
    react: "📊",
    desc: "Statistiques des paiements Wave"
  },
  async (ms_org, ovl, cmd_options) => {
    const { superUser } = cmd_options;
    
    if (!superUser) {
      return await ovl.sendMessage(ms_org, { text: "❌ Commande réservée à l'owner." });
    }
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, { text: "❌ Module Wave non disponible." });
    }
    
    const stats = wavePayments.getStats();
    
    const message = `📊 *STATISTIQUES WAVE*\n\n` +
      `👥 *Total abonnés:* ${stats.total}\n` +
      `⏳ *En attente:* ${stats.pending}\n` +
      `✅ *Payés (code généré):* ${stats.paid}\n` +
      `🟢 *Actifs:* ${stats.active}\n` +
      `🔴 *Expirés:* ${stats.expired}\n\n` +
      `💰 *Revenus totaux:* ${stats.totalRevenue.toLocaleString('fr-FR')} FCFA\n\n` +
      `📋 *Par plan:*\n` +
      `   🥉 Bronze: ${stats.byPlan.BRONZE || 0}\n` +
      `   🥈 Argent: ${stats.byPlan.ARGENT || 0}\n` +
      `   🥇 Or: ${stats.byPlan.OR || 0}\n` +
      `   💎 Diamant: ${stats.byPlan.DIAMANT || 0}\n` +
      `   👑 Lifetime: ${stats.byPlan.LIFETIME || 0}\n\n` +
      `🔑 *Codes:* ${stats.codesUsed}/${stats.codesGenerated} utilisés`;
    
    return await ovl.sendMessage(ms_org, { text: message });
  }
);

ovlcmd(
  {
    nom_cmd: "wavesearch",
    classe: "Owner",
    react: "🔍",
    desc: "Rechercher un abonné Wave"
  },
  async (ms_org, ovl, cmd_options) => {
    const { arg, superUser } = cmd_options;
    
    if (!superUser) {
      return await ovl.sendMessage(ms_org, { text: "❌ Commande réservée à l'owner." });
    }
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, { text: "❌ Module Wave non disponible." });
    }
    
    if (!arg || arg.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `🔍 *RECHERCHER UN ABONNÉ*\n\n` +
              `Usage: *.wavesearch <nom/téléphone/ref>*\n\n` +
              `Exemple:\n` +
              `*.wavesearch Jean*\n` +
              `*.wavesearch 0150252467*`
      });
    }
    
    const query = arg.join(' ');
    const results = wavePayments.findSubscriber(query);
    
    if (results.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `🔍 *Aucun résultat pour:* "${query}"`
      });
    }
    
    let message = `🔍 *RÉSULTATS* (${results.length})\n\n`;
    
    results.slice(0, 10).forEach((sub, i) => {
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      const statusEmoji = { pending: '⏳', paid: '✅', active: '🟢', expired: '🔴' };
      
      message += `*${i + 1}. ${sub.name}*\n`;
      message += `   📱 ${sub.phone}\n`;
      message += `   ${planEmoji[sub.plan] || '💎'} ${sub.plan} - ${sub.amount} FCFA\n`;
      message += `   ${statusEmoji[sub.status] || '❓'} Status: ${sub.status}\n`;
      if (sub.activationCode) {
        message += `   🔑 Code: ${sub.activationCode}\n`;
      }
      message += `   🆔 Réf: ${sub.paymentRef}\n\n`;
    });
    
    return await ovl.sendMessage(ms_org, { text: message });
  }
);

ovlcmd(
  {
    nom_cmd: "waveall",
    classe: "Owner",
    react: "📋",
    desc: "Liste tous les abonnés Wave"
  },
  async (ms_org, ovl, cmd_options) => {
    const { arg, superUser } = cmd_options;
    
    if (!superUser) {
      return await ovl.sendMessage(ms_org, { text: "❌ Commande réservée à l'owner." });
    }
    
    if (!wavePayments) {
      return await ovl.sendMessage(ms_org, { text: "❌ Module Wave non disponible." });
    }
    
    const status = arg[0] || null; // pending, paid, active, expired
    const subscribers = wavePayments.getAllSubscribers(status);
    
    if (subscribers.length === 0) {
      return await ovl.sendMessage(ms_org, {
        text: `📋 *ABONNÉS WAVE*\n\nAucun abonné ${status ? `avec le statut "${status}"` : ''}.`
      });
    }
    
    let message = `📋 *ABONNÉS WAVE* (${subscribers.length})\n`;
    if (status) message += `Filtre: ${status}\n`;
    message += '\n';
    
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    const statusEmoji = { pending: '⏳', paid: '✅', active: '🟢', expired: '🔴' };
    
    subscribers.slice(0, 15).forEach((sub, i) => {
      message += `${i + 1}. ${statusEmoji[sub.status]} ${sub.name} - ${planEmoji[sub.plan]} ${sub.amount}F\n`;
    });
    
    if (subscribers.length > 15) {
      message += `\n... et ${subscribers.length - 15} autres`;
    }
    
    message += `\n\n💡 Filtrer par statut:\n*.waveall pending/paid/active/expired*`;
    
    return await ovl.sendMessage(ms_org, { text: message });
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 COMMANDE ABONNEMENT (UTILISATEUR)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "abonnement",
    classe: "Premium",
    react: "💳",
    desc: "Obtenir les infos pour s'abonner"
  },
  async (ms_org, ovl, cmd_options) => {
    const { auteur_msg } = cmd_options;
    
    // Vérifier si déjà abonné
    let currentPlan = null;
    if (premiumDB) {
      try {
        const status = premiumDB.getPremiumStatus(auteur_msg);
        if (status.isPremium) {
          currentPlan = status;
        }
      } catch (e) {}
    }
    
    const message = `💳 *S'ABONNER À HANI-MD PREMIUM*\n\n` +
      (currentPlan 
        ? `✅ Vous êtes actuellement: ${currentPlan.planInfo?.name || 'Premium'}\n\n` 
        : '') +
      `📋 *NOS OFFRES:*\n\n` +
      `🥉 *BRONZE* - 500 FCFA/mois\n` +
      `   ↳ 100 commandes/jour\n\n` +
      `🥈 *ARGENT* - 1 000 FCFA/mois\n` +
      `   ↳ 300 commandes/jour\n\n` +
      `🥇 *OR* - 2 000 FCFA/mois ⭐\n` +
      `   ↳ Commandes illimitées\n\n` +
      `💎 *DIAMANT* - 5 000 FCFA/mois\n` +
      `   ↳ Tout illimité + Multi-numéros\n\n` +
      `👑 *LIFETIME* - 15 000 FCFA\n` +
      `   ↳ Accès à vie !\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `📱 *PAIEMENT WAVE UNIQUEMENT*\n\n` +
      `1️⃣ Visitez notre site web\n` +
      `2️⃣ Remplissez le formulaire\n` +
      `3️⃣ Payez avec Wave\n` +
      `4️⃣ Recevez votre code\n` +
      `5️⃣ Activez avec: *.activer CODE*\n\n` +
      `📞 *Support:* wa.me/2250150252467`;
    
    return await ovl.sendMessage(ms_org, { text: message });
  }
);

ovlcmd(
  {
    nom_cmd: "monplan",
    classe: "Premium",
    react: "💎",
    desc: "Voir votre abonnement actuel"
  },
  async (ms_org, ovl, cmd_options) => {
    const { auteur_msg } = cmd_options;
    
    let premiumStatus = null;
    let waveStatus = null;
    
    // Vérifier dans premium.js
    if (premiumDB) {
      try {
        premiumStatus = premiumDB.getPremiumStatus(auteur_msg);
      } catch (e) {}
    }
    
    // Vérifier dans wave_payments.js
    if (wavePayments) {
      try {
        const phone = auteur_msg.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        waveStatus = wavePayments.checkActiveSubscription(phone);
      } catch (e) {}
    }
    
    const isPremium = premiumStatus?.isPremium || waveStatus?.hasSubscription;
    
    if (!isPremium) {
      return await ovl.sendMessage(ms_org, {
        text: `💎 *VOTRE ABONNEMENT*\n\n` +
              `🆓 Vous êtes actuellement en mode *GRATUIT*\n\n` +
              `Limites du mode gratuit:\n` +
              `• 20 commandes par jour\n` +
              `• Fonctionnalités de base uniquement\n\n` +
              `Tapez *.abonnement* pour voir nos offres premium !`
      });
    }
    
    const plan = premiumStatus?.planInfo || waveStatus?.plan;
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    
    let daysLeft = premiumStatus?.daysLeft || waveStatus?.daysLeft || 0;
    let expiresText = daysLeft === -1 
      ? '♾️ À VIE' 
      : `📅 ${daysLeft} jour(s) restant(s)`;
    
    if (premiumStatus?.expiresAt && premiumStatus.expiresAt !== 'À VIE') {
      expiresText += `\n   Expire le: ${new Date(premiumStatus.expiresAt).toLocaleDateString('fr-FR')}`;
    }
    
    return await ovl.sendMessage(ms_org, {
      text: `💎 *VOTRE ABONNEMENT*\n\n` +
            `${planEmoji[plan?.name?.toUpperCase()] || plan?.color || '💎'} *Plan:* ${plan?.name || 'Premium'}\n` +
            `${expiresText}\n\n` +
            `✅ Vous avez accès à toutes les fonctionnalités premium !\n\n` +
            `Tapez *.menu* pour voir les commandes.`
    });
  }
);
