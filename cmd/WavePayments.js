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

/**
 * Helper pour extraire les bons paramètres depuis les arguments du handler
 * Les handlers reçoivent: (socket, message, options)
 */
function getContext(sock, msg, options) {
  return {
    sock: sock,
    from: msg.key?.remoteJid || options.from,
    auteur_msg: options.auteurMessage || msg.key?.participant || msg.key?.remoteJid,
    arg: options.arg || [],
    superUser: options.superUser || false,
    isGroup: options.isGroup || false,
    send: async (text) => await sock.sendMessage(msg.key?.remoteJid || options.from, { text })
  };
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
  async (sock, msg, cmd_options) => {
    const { arg, auteurMessage } = cmd_options;
    const from = msg.key.remoteJid;
    const auteur_msg = auteurMessage || msg.key.participant || from;
    
    console.log(`[ACTIVER] 🔑 Tentative d'activation par ${auteur_msg} dans ${from}`);
    
    if (!arg || arg.length === 0) {
      return await sock.sendMessage(from, {
        text: `🔑 *ACTIVATION D'ABONNEMENT*\n\n` +
              `Pour activer votre abonnement premium, utilisez:\n\n` +
              `*.activer VOTRE-CODE*\n\n` +
              `Exemple: *.activer HANI-OR-A1B2C3D4*\n\n` +
              `📱 Obtenez un code sur:\n` +
              `https://hani-md-1hanieljean1-f1e1290c.koyeb.app/subscribe.html`
      });
    }
    
    const code = arg[0].toUpperCase();
    console.log(`[ACTIVER] 🔍 Recherche du code: ${code}`);
    
    // Chercher dans tous les fichiers de codes
    let codeData = null;
    let codeSource = null;
    
    try {
      // 1. Vérifier activation_codes.json
      const activationCodesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
      if (fs.existsSync(activationCodesFile)) {
        const activationCodes = JSON.parse(fs.readFileSync(activationCodesFile, 'utf8') || '{}');
        if (activationCodes[code]) {
          codeData = activationCodes[code];
          codeSource = 'activation_codes';
          console.log(`[ACTIVER] ✅ Code trouvé dans activation_codes.json`);
        }
      }
      
      // 2. Vérifier premium_codes.json
      if (!codeData) {
        const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
        if (fs.existsSync(premiumCodesFile)) {
          const premiumCodes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8') || '{}');
          if (premiumCodes[code]) {
            codeData = premiumCodes[code];
            codeSource = 'premium_codes';
            console.log(`[ACTIVER] ✅ Code trouvé dans premium_codes.json`);
          }
        }
      }
      
      if (!codeData) {
        console.log(`[ACTIVER] ❌ Code non trouvé: ${code}`);
        return await sock.sendMessage(from, {
          text: `❌ *Code invalide*\n\n` +
                `Le code \`${code}\` n'existe pas.\n\n` +
                `Vérifiez que vous avez copié le code correctement.`
        });
      }
      
      // Vérifier si déjà utilisé
      if (codeData.used || codeData.usedBy) {
        console.log(`[ACTIVER] ⚠️ Code déjà utilisé: ${code}`);
        return await sock.sendMessage(from, {
          text: `❌ *Code déjà utilisé*\n\n` +
                `Ce code a déjà été activé.\n\n` +
                `Chaque code ne peut être utilisé qu'une seule fois.`
        });
      }
      
      // Activer le code
      const planName = codeData.plan || 'OR';
      const days = codeData.days || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      
      // Marquer comme utilisé
      codeData.used = true;
      codeData.usedBy = auteur_msg;
      codeData.usedAt = new Date().toISOString();
      
      // Sauvegarder dans le bon fichier
      if (codeSource === 'activation_codes') {
        const activationCodesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
        const codes = JSON.parse(fs.readFileSync(activationCodesFile, 'utf8') || '{}');
        codes[code] = codeData;
        fs.writeFileSync(activationCodesFile, JSON.stringify(codes, null, 2));
      } else {
        const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
        const codes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8') || '{}');
        codes[code] = codeData;
        fs.writeFileSync(premiumCodesFile, JSON.stringify(codes, null, 2));
      }
      
      // Sync avec le système premium
      try {
        if (premiumDB) {
          premiumDB.addPremium(auteur_msg, planName.toLowerCase(), days);
          console.log(`[ACTIVER] ✅ Sync premium OK pour ${auteur_msg}`);
        }
      } catch (e) {
        console.error('[ACTIVER] Erreur sync premium:', e.message);
      }
      
      // Sauvegarder dans subscribers
      try {
        const subscribersFile = path.join(__dirname, '..', 'DataBase', 'subscribers.json');
        let subscribers = { subscribers: [] };
        if (fs.existsSync(subscribersFile)) {
          subscribers = JSON.parse(fs.readFileSync(subscribersFile, 'utf8') || '{"subscribers":[]}');
        }
        
        const phone = auteur_msg.replace('@s.whatsapp.net', '').replace('@lid', '');
        const existingIndex = subscribers.subscribers.findIndex(s => s.phone === phone);
        
        const subscriberData = {
          phone: phone,
          whatsappJid: auteur_msg,
          plan: planName.toUpperCase(),
          status: 'active',
          activatedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          activationCode: code
        };
        
        if (existingIndex >= 0) {
          subscribers.subscribers[existingIndex] = { ...subscribers.subscribers[existingIndex], ...subscriberData };
        } else {
          subscribers.subscribers.push(subscriberData);
        }
        
        fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
      } catch (e) {
        console.error('[ACTIVER] Erreur subscribers:', e.message);
      }
      
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      const expireText = days >= 36500 
        ? `📅 Durée: À VIE ♾️`
        : `📅 Expire le: ${expiresAt.toLocaleDateString('fr-FR')}`;
      
      console.log(`[ACTIVER] 🎉 Activation réussie: ${planName} pour ${auteur_msg}`);
      
      return await sock.sendMessage(from, {
        text: `🎉 *ABONNEMENT ACTIVÉ !*\n\n` +
              `${planEmoji[planName.toUpperCase()] || '💎'} *Plan:* ${planName.toUpperCase()}\n` +
              `${expireText}\n\n` +
              `✅ Vous avez maintenant accès à toutes les fonctionnalités premium !\n\n` +
              `Tapez *.menu* pour voir les commandes disponibles.`
      });
      
    } catch (e) {
      console.error('[ACTIVER] Erreur:', e);
      return await sock.sendMessage(from, {
        text: `❌ *Erreur système*\n\n${e.message}\n\nContactez le support.`
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
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!wavePayments) {
      return await ctx.send("❌ Module Wave non disponible.");
    }
    
    const pending = wavePayments.getAllSubscribers('pending');
    
    if (pending.length === 0) {
      return await ctx.send(`⏳ *PAIEMENTS EN ATTENTE*\n\n` +
              `Aucun paiement en attente de validation.\n\n` +
              `Les clients doivent d'abord s'inscrire sur le site web.`);
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
    
    return await ctx.send(message);
  }
);

ovlcmd(
  {
    nom_cmd: "waveconfirm",
    classe: "Owner",
    react: "✅",
    desc: "Confirmer un paiement Wave et générer le code"
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!wavePayments) {
      return await ctx.send("❌ Module Wave non disponible.");
    }
    
    if (!ctx.arg || ctx.arg.length === 0) {
      return await ctx.send(`✅ *CONFIRMER UN PAIEMENT*\n\n` +
              `Usage: *.waveconfirm <référence>*\n\n` +
              `Exemple: *.waveconfirm HANI-A1B2C3D4*\n\n` +
              `Utilisez *.wavepending* pour voir les paiements en attente.`);
    }
    
    const ref = ctx.arg[0].toUpperCase();
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
      
      return await ctx.send(`✅ *PAIEMENT CONFIRMÉ !*\n\n` +
              `👤 *Client:* ${result.subscriber?.name}\n` +
              `📱 *Téléphone:* ${result.subscriber?.phone}\n` +
              `${planEmoji[result.subscriber?.plan] || '💎'} *Plan:* ${result.subscriber?.plan}\n` +
              `💰 *Montant:* ${result.subscriber?.amount} FCFA\n\n` +
              `🔑 *CODE D'ACTIVATION:*\n` +
              `\`\`\`${result.activationCode}\`\`\`\n\n` +
              `Le client peut maintenant activer son abonnement avec:\n` +
              `*.activer ${result.activationCode}*`);
    } else {
      return await ctx.send(`❌ *Erreur*\n\n${result.error || 'Impossible de confirmer ce paiement'}`);
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
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!wavePayments) {
      return await ctx.send("❌ Module Wave non disponible.");
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
    
    return await ctx.send(message);
  }
);

ovlcmd(
  {
    nom_cmd: "wavesearch",
    classe: "Owner",
    react: "🔍",
    desc: "Rechercher un abonné Wave"
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!wavePayments) {
      return await ctx.send("❌ Module Wave non disponible.");
    }
    
    if (!ctx.arg || ctx.arg.length === 0) {
      return await ctx.send(`🔍 *RECHERCHER UN ABONNÉ*\n\n` +
              `Usage: *.wavesearch <nom/téléphone/ref>*\n\n` +
              `Exemple:\n` +
              `*.wavesearch Jean*\n` +
              `*.wavesearch 0150252467*`);
    }
    
    const query = ctx.arg.join(' ');
    const results = wavePayments.findSubscriber(query);
    
    if (results.length === 0) {
      return await ctx.send(`🔍 *Aucun résultat pour:* "${query}"`);
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
    
    return await ctx.send(message);
  }
);

ovlcmd(
  {
    nom_cmd: "waveall",
    classe: "Owner",
    react: "📋",
    desc: "Liste tous les abonnés Wave"
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!wavePayments) {
      return await ctx.send("❌ Module Wave non disponible.");
    }
    
    const status = ctx.arg[0] || null; // pending, paid, active, expired
    const subscribers = wavePayments.getAllSubscribers(status);
    
    if (subscribers.length === 0) {
      return await ctx.send(`📋 *ABONNÉS WAVE*\n\nAucun abonné ${status ? `avec le statut "${status}"` : ''}.`);
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
    
    return await ctx.send(message);
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
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    // Vérifier si déjà abonné
    let currentPlan = null;
    if (premiumDB) {
      try {
        const status = premiumDB.getPremiumStatus(ctx.auteur_msg);
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
    
    return await ctx.send(message);
  }
);

ovlcmd(
  {
    nom_cmd: "monplan",
    classe: "Premium",
    react: "💎",
    desc: "Voir votre abonnement actuel"
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    let premiumStatus = null;
    let waveStatus = null;
    
    // Vérifier dans premium.js
    if (premiumDB) {
      try {
        premiumStatus = premiumDB.getPremiumStatus(ctx.auteur_msg);
      } catch (e) {}
    }
    
    // Vérifier dans wave_payments.js
    if (wavePayments) {
      try {
        const phone = ctx.auteur_msg.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        waveStatus = wavePayments.checkActiveSubscription(phone);
      } catch (e) {}
    }
    
    const isPremium = premiumStatus?.isPremium || waveStatus?.hasSubscription;
    
    if (!isPremium) {
      return await ctx.send(`💎 *VOTRE ABONNEMENT*\n\n` +
              `🆓 Vous êtes actuellement en mode *GRATUIT*\n\n` +
              `Limites du mode gratuit:\n` +
              `• 20 commandes par jour\n` +
              `• Fonctionnalités de base uniquement\n\n` +
              `Tapez *.abonnement* pour voir nos offres premium !`);
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
    
    return await ctx.send(`💎 *VOTRE ABONNEMENT*\n\n` +
            `${planEmoji[plan?.name?.toUpperCase()] || plan?.color || '💎'} *Plan:* ${plan?.name || 'Premium'}\n` +
            `${expiresText}\n\n` +
            `✅ Vous avez accès à toutes les fonctionnalités premium !\n\n` +
            `Tapez *.menu* pour voir les commandes.`);
  }
);
// ═══════════════════════════════════════════════════════════
// 🔒 SYSTÈME SÉCURISÉ - VALIDATION OWNER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pendingpay",
    classe: "Owner",
    react: "📋",
    desc: "Voir les paiements en attente de validation",
    alias: ["pp", "attente"]
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    try {
      const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
      let pending = [];
      
      if (fs.existsSync(pendingFile)) {
        pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
      }
      
      // Filtrer les demandes non validées
      const awaiting = pending.filter(p => p.status === 'pending_validation');
      
      if (awaiting.length === 0) {
        return await ctx.send(`📋 *PAIEMENTS EN ATTENTE*\n\n` +
                `✅ Aucun paiement en attente de validation.\n\n` +
                `Les nouvelles demandes apparaîtront ici.`);
      }
      
      let message = `📋 *PAIEMENTS EN ATTENTE* (${awaiting.length})\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      
      awaiting.forEach((req, i) => {
        message += `*${i + 1}. ${req.name}*\n`;
        message += `   🆔 ID: \`${req.id}\`\n`;
        message += `   📱 Tel: ${req.phone}\n`;
        message += `   📱 Wave: ${req.waveNumber}\n`;
        message += `   ${planEmoji[req.plan] || '💎'} Plan: ${req.plan}\n`;
        message += `   💵 Montant: ${req.amount} FCFA\n`;
        message += `   📝 Transaction: ${req.transactionId}\n`;
        message += `   ⏰ ${new Date(req.createdAt).toLocaleString('fr-FR')}\n\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `✅ Valider: *.validatepay ID*\n`;
      message += `❌ Rejeter: *.rejectpay ID*`;
      
      return await ctx.send(message);
      
    } catch (e) {
      return await ctx.send(`❌ Erreur: ${e.message}`);
    }
  }
);

ovlcmd(
  {
    nom_cmd: "validatepay",
    classe: "Owner",
    react: "✅",
    desc: "Valider un paiement et envoyer le code au client",
    alias: ["vp", "valider"]
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!ctx.arg || ctx.arg.length === 0) {
      return await ctx.send(`✅ *VALIDER UN PAIEMENT*\n\n` +
              `Usage: *.validatepay ID*\n\n` +
              `Exemple: *.validatepay A1B2C3D4E5F6*\n\n` +
              `📋 Utilisez *.pendingpay* pour voir les ID en attente.`);
    }
    
    const requestId = ctx.arg[0].toUpperCase();
    
    try {
      const crypto = require('crypto');
      const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
      let pending = [];
      
      if (fs.existsSync(pendingFile)) {
        pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
      }
      
      const reqIndex = pending.findIndex(p => p.id === requestId && p.status === 'pending_validation');
      
      if (reqIndex === -1) {
        return await ctx.send(`❌ Demande *${requestId}* non trouvée ou déjà traitée.\n\n📋 Utilisez *.pendingpay* pour voir les demandes en attente.`);
      }
      
      const request = pending[reqIndex];
      
      // Générer le code d'activation
      const planUpper = request.plan.toUpperCase();
      const codeRandom = crypto.randomBytes(4).toString('hex').toUpperCase();
      const activationCode = `HANI-${planUpper}-${codeRandom}`;
      
      // Calculer expiration
      const planDays = planUpper === 'LIFETIME' ? 36500 : 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planDays);
      
      // Sauvegarder le code d'activation
      const codesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
      let codes = {};
      if (fs.existsSync(codesFile)) {
        try { codes = JSON.parse(fs.readFileSync(codesFile, 'utf8')); } catch(e) { codes = {}; }
      }
      
      codes[activationCode] = {
        plan: planUpper,
        days: planDays,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
        usedBy: null,
        requestId: requestId,
        clientPhone: request.phone
      };
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
      
      // Aussi dans premium_codes.json
      const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
      let premiumCodes = {};
      if (fs.existsSync(premiumCodesFile)) {
        try { premiumCodes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8')); } catch(e) { premiumCodes = {}; }
      }
      premiumCodes[activationCode] = {
        plan: planUpper,
        days: planDays,
        createdAt: new Date().toISOString(),
        used: false,
        usedBy: null
      };
      fs.writeFileSync(premiumCodesFile, JSON.stringify(premiumCodes, null, 2));
      
      // Marquer comme validé
      pending[reqIndex].status = 'validated';
      pending[reqIndex].validatedAt = new Date().toISOString();
      pending[reqIndex].activationCode = activationCode;
      fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
      
      // Sauvegarder dans confirmed_payments
      const confirmedFile = path.join(__dirname, '..', 'DataBase', 'confirmed_payments.json');
      let confirmed = [];
      if (fs.existsSync(confirmedFile)) {
        try { confirmed = JSON.parse(fs.readFileSync(confirmedFile, 'utf8')); } catch(e) { confirmed = []; }
      }
      confirmed.push({
        ...request,
        activationCode,
        status: 'validated',
        validatedAt: new Date().toISOString()
      });
      fs.writeFileSync(confirmedFile, JSON.stringify(confirmed, null, 2));
      
      // Envoyer le code au client par WhatsApp
      const clientPhone = request.phone.replace(/[^0-9]/g, '');
      const clientJid = clientPhone.startsWith('225') ? `${clientPhone}@s.whatsapp.net` : `225${clientPhone}@s.whatsapp.net`;
      
      const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      
      const clientMessage = 
        `🎉 *PAIEMENT VALIDÉ !*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Bonjour ${request.name},\n\n` +
        `Votre paiement Wave a été vérifié et validé !\n\n` +
        `${planEmoji[planUpper] || '💎'} *Plan:* ${planUpper}\n` +
        `💵 *Montant:* ${request.amount} FCFA\n\n` +
        `🔑 *Votre code d'activation:*\n` +
        `\`${activationCode}\`\n\n` +
        `📱 *Pour activer:*\n` +
        `Envoyez: *.activer ${activationCode}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Merci pour votre confiance ! 🙏`;
      
      try {
        await sock.sendMessage(clientJid, { text: clientMessage });
        console.log(`[WAVE] ✅ Code envoyé au client: ${clientPhone}`);
      } catch (e) {
        console.error('[WAVE] Erreur envoi client:', e.message);
      }
      
      return await ctx.send(`✅ *PAIEMENT VALIDÉ !*\n\n` +
              `👤 Client: ${request.name}\n` +
              `📱 Tel: ${request.phone}\n` +
              `${planEmoji[planUpper] || '💎'} Plan: ${planUpper}\n` +
              `💵 Montant: ${request.amount} FCFA\n\n` +
              `🔑 Code généré: \`${activationCode}\`\n\n` +
              `📤 Le code a été envoyé au client par WhatsApp.`);
      
    } catch (e) {
      console.error('[VALIDATEPAY]', e);
      return await ctx.send(`❌ Erreur: ${e.message}`);
    }
  }
);

ovlcmd(
  {
    nom_cmd: "rejectpay",
    classe: "Owner",
    react: "❌",
    desc: "Rejeter un paiement frauduleux",
    alias: ["rp", "rejeter"]
  },
  async (sock, msg, cmd_options) => {
    const ctx = getContext(sock, msg, cmd_options);
    
    if (!ctx.superUser) {
      return await ctx.send("❌ Commande réservée à l'owner.");
    }
    
    if (!ctx.arg || ctx.arg.length === 0) {
      return await ctx.send(`❌ *REJETER UN PAIEMENT*\n\n` +
              `Usage: *.rejectpay ID [raison]*\n\n` +
              `Exemple: *.rejectpay A1B2C3 Paiement non reçu*`);
    }
    
    const requestId = ctx.arg[0].toUpperCase();
    const reason = ctx.arg.slice(1).join(' ') || 'Paiement non vérifié dans l\'historique Wave';
    
    try {
      const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
      let pending = [];
      
      if (fs.existsSync(pendingFile)) {
        pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
      }
      
      const reqIndex = pending.findIndex(p => p.id === requestId && p.status === 'pending_validation');
      
      if (reqIndex === -1) {
        return await ctx.send(`❌ Demande *${requestId}* non trouvée ou déjà traitée.`);
      }
      
      const request = pending[reqIndex];
      
      // Marquer comme rejeté
      pending[reqIndex].status = 'rejected';
      pending[reqIndex].rejectedAt = new Date().toISOString();
      pending[reqIndex].rejectReason = reason;
      fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
      
      // Informer le client
      const clientPhone = request.phone.replace(/[^0-9]/g, '');
      const clientJid = clientPhone.startsWith('225') ? `${clientPhone}@s.whatsapp.net` : `225${clientPhone}@s.whatsapp.net`;
      
      const clientMessage = 
        `❌ *DEMANDE REJETÉE*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Bonjour ${request.name},\n\n` +
        `Votre demande de paiement n'a pas pu être validée.\n\n` +
        `📝 *Raison:* ${reason}\n\n` +
        `Si vous avez effectué le paiement, veuillez:\n` +
        `1. Vérifier l'historique Wave\n` +
        `2. Contacter le support avec une capture d'écran\n\n` +
        `📞 Support: wa.me/2250150252467`;
      
      try {
        await sock.sendMessage(clientJid, { text: clientMessage });
      } catch (e) {
        console.error('[WAVE] Erreur envoi client:', e.message);
      }
      
      return await ctx.send(`❌ *PAIEMENT REJETÉ*\n\n` +
              `👤 Client: ${request.name}\n` +
              `📱 Tel: ${request.phone}\n` +
              `📝 Raison: ${reason}\n\n` +
              `Le client a été notifié.`);
      
    } catch (e) {
      return await ctx.send(`❌ Erreur: ${e.message}`);
    }
  }
);