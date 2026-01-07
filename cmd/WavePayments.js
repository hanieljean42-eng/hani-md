/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💳 HANI-MD - COMMANDES WAVE PAYMENT               ║
 * ║     Gestion des paiements Wave et abonnements             ║
 * ║              Par H2025 - 2025                             ║
 * ║                                                           ║
 * ║  FORMAT: async (ovl, msg, { repondre, ... }) => { }      ║
 * ║  - ovl = socket WhatsApp (instance du bot)                ║
 * ║  - msg = objet message                                    ║
 * ║  - repondre = fonction pour répondre à l'expéditeur      ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const path = require('path');
const fs = require('fs');
const config = require('../set');

// Import du module Wave
let wavePayments;
try {
  wavePayments = require('../DataBase/wave_payments');
} catch (e) {
  console.error('[WAVE CMD] Module wave_payments non disponible');
}

// Import premium existant
let premiumDB;
try {
  premiumDB = require('../DataBase/premium');
} catch (e) {
  console.error('[WAVE CMD] Module premium non disponible');
}

// Numéro du owner pour les notifications
const OWNER_NUMBER = (config.NUMERO_OWNER || '2250150252467').replace(/[^0-9]/g, '');
const OWNER_JID = OWNER_NUMBER + '@s.whatsapp.net';

// ═══════════════════════════════════════════════════════════
// 🔑 COMMANDE ACTIVATION (UTILISATEUR)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "activer",
  classe: "Premium",
  react: "🔑",
  desc: "Activer un abonnement avec un code Wave"
}, async (ovl, msg, { arg, repondre, sender, auteurMessage }) => {
  const userJid = sender || auteurMessage || msg.key.participant || msg.key.remoteJid;
  
  console.log(`[ACTIVER] 🔑 Tentative par ${userJid}`);
  
  if (!arg || arg.length === 0) {
    return repondre(`🔑 *ACTIVATION D'ABONNEMENT*\n\n` +
      `Pour activer votre abonnement premium:\n\n` +
      `*.activer VOTRE-CODE*\n\n` +
      `Exemple: *.activer HANI-OR-A1B2C3D4*\n\n` +
      `📱 Obtenez un code:\n` +
      `https://hani-md-1hanieljean1-f1e1290c.koyeb.app/subscribe.html`);
  }
  
  const code = arg[0].toUpperCase();
  console.log(`[ACTIVER] 🔍 Code: ${code}`);
  
  try {
    // Chercher le code dans les fichiers
    let codeData = null;
    let codeSource = null;
    
    // 1. activation_codes.json
    const activationCodesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
    if (fs.existsSync(activationCodesFile)) {
      const codes = JSON.parse(fs.readFileSync(activationCodesFile, 'utf8') || '{}');
      if (codes[code]) {
        codeData = codes[code];
        codeSource = 'activation_codes';
      }
    }
    
    // 2. premium_codes.json
    if (!codeData) {
      const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
      if (fs.existsSync(premiumCodesFile)) {
        const codes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8') || '{}');
        if (codes[code]) {
          codeData = codes[code];
          codeSource = 'premium_codes';
        }
      }
    }
    
    if (!codeData) {
      return repondre(`❌ *Code invalide*\n\nLe code \`${code}\` n'existe pas.`);
    }
    
    if (codeData.used || codeData.usedBy) {
      return repondre(`❌ *Code déjà utilisé*\n\nCe code a déjà été activé.`);
    }
    
    // Activer le code
    const planName = codeData.plan || 'OR';
    const days = codeData.days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // Marquer comme utilisé
    codeData.used = true;
    codeData.usedBy = userJid;
    codeData.usedAt = new Date().toISOString();
    
    // Sauvegarder
    const targetFile = path.join(__dirname, '..', 'DataBase', `${codeSource}.json`);
    const allCodes = JSON.parse(fs.readFileSync(targetFile, 'utf8') || '{}');
    allCodes[code] = codeData;
    fs.writeFileSync(targetFile, JSON.stringify(allCodes, null, 2));
    
    // Sync avec premium
    if (premiumDB) {
      try {
        premiumDB.addPremium(userJid, planName.toLowerCase(), days);
      } catch (e) {}
    }
    
    // Sauvegarder dans subscribers
    try {
      const subscribersFile = path.join(__dirname, '..', 'DataBase', 'subscribers.json');
      let subscribers = { subscribers: [] };
      if (fs.existsSync(subscribersFile)) {
        subscribers = JSON.parse(fs.readFileSync(subscribersFile, 'utf8') || '{"subscribers":[]}');
      }
      
      const phone = userJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const idx = subscribers.subscribers.findIndex(s => s.phone === phone);
      
      const data = {
        phone,
        whatsappJid: userJid,
        plan: planName.toUpperCase(),
        status: 'active',
        activatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        activationCode: code
      };
      
      if (idx >= 0) {
        subscribers.subscribers[idx] = { ...subscribers.subscribers[idx], ...data };
      } else {
        subscribers.subscribers.push(data);
      }
      
      fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
    } catch (e) {}
    
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    const expireText = days >= 36500 ? '♾️ À VIE' : `Expire le: ${expiresAt.toLocaleDateString('fr-FR')}`;
    
    console.log(`[ACTIVER] ✅ Succès: ${planName} pour ${userJid}`);
    
    return repondre(`🎉 *ABONNEMENT ACTIVÉ !*\n\n` +
      `${planEmoji[planName.toUpperCase()] || '💎'} *Plan:* ${planName.toUpperCase()}\n` +
      `📅 ${expireText}\n\n` +
      `✅ Accès premium activé !\n\n` +
      `Tapez *.menu* pour les commandes.`);
    
  } catch (e) {
    console.error('[ACTIVER] Erreur:', e);
    return repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 📋 PAIEMENTS EN ATTENTE (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "pendingpay",
  classe: "Owner",
  react: "📋",
  desc: "Voir les paiements en attente",
  alias: ["pp", "attente"]
}, async (ovl, msg, { repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Commande réservée à l'owner.");
  }
  
  try {
    const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
    let pending = [];
    
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
    
    const awaiting = pending.filter(p => p.status === 'pending_validation');
    
    if (awaiting.length === 0) {
      return repondre(`📋 *PAIEMENTS EN ATTENTE*\n\n✅ Aucun paiement en attente.`);
    }
    
    let message = `📋 *PAIEMENTS EN ATTENTE* (${awaiting.length})\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    
    awaiting.forEach((req, i) => {
      message += `*${i + 1}. ${req.name}*\n`;
      message += `   🆔 ID: \`${req.id}\`\n`;
      message += `   📱 Tel: ${req.phone}\n`;
      message += `   📱 Wave: ${req.waveNumber}\n`;
      message += `   ${planEmoji[req.plan] || '💎'} Plan: ${req.plan}\n`;
      message += `   💵 ${req.amount} FCFA\n`;
      message += `   📝 Trans: ${req.transactionId}\n`;
      message += `   ⏰ ${new Date(req.createdAt).toLocaleString('fr-FR')}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ *.validatepay ID*\n`;
    message += `❌ *.rejectpay ID*`;
    
    return repondre(message);
    
  } catch (e) {
    return repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ✅ VALIDER UN PAIEMENT (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "validatepay",
  classe: "Owner",
  react: "✅",
  desc: "Valider un paiement et envoyer le code",
  alias: ["vp", "valider"]
}, async (ovl, msg, { arg, repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Commande réservée à l'owner.");
  }
  
  if (!arg || arg.length === 0) {
    return repondre(`✅ *VALIDER UN PAIEMENT*\n\n` +
      `Usage: *.validatepay ID*\n\n` +
      `📋 Utilisez *.pendingpay* pour voir les ID.`);
  }
  
  const requestId = arg[0].toUpperCase();
  
  try {
    const crypto = require('crypto');
    const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
    let pending = [];
    
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
    
    const reqIndex = pending.findIndex(p => p.id === requestId && p.status === 'pending_validation');
    
    if (reqIndex === -1) {
      return repondre(`❌ Demande *${requestId}* non trouvée.`);
    }
    
    const request = pending[reqIndex];
    
    // Générer code
    const planUpper = request.plan.toUpperCase();
    const codeRandom = crypto.randomBytes(4).toString('hex').toUpperCase();
    const activationCode = `HANI-${planUpper}-${codeRandom}`;
    const planDays = planUpper === 'LIFETIME' ? 36500 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);
    
    // Sauvegarder le code
    const codesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
    let codes = {};
    if (fs.existsSync(codesFile)) {
      try { codes = JSON.parse(fs.readFileSync(codesFile, 'utf8')); } catch(e) {}
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
    
    // Aussi premium_codes.json
    const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
    let premiumCodes = {};
    if (fs.existsSync(premiumCodesFile)) {
      try { premiumCodes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8')); } catch(e) {}
    }
    premiumCodes[activationCode] = {
      plan: planUpper,
      days: planDays,
      createdAt: new Date().toISOString(),
      used: false
    };
    fs.writeFileSync(premiumCodesFile, JSON.stringify(premiumCodes, null, 2));
    
    // Marquer validé
    pending[reqIndex].status = 'validated';
    pending[reqIndex].validatedAt = new Date().toISOString();
    pending[reqIndex].activationCode = activationCode;
    fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    
    // Envoyer au client
    const clientPhone = request.phone.replace(/[^0-9]/g, '');
    const clientJid = clientPhone.startsWith('225') ? `${clientPhone}@s.whatsapp.net` : `225${clientPhone}@s.whatsapp.net`;
    
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    
    const clientMsg = 
      `🎉 *PAIEMENT VALIDÉ !*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Bonjour ${request.name},\n\n` +
      `Votre paiement Wave est validé !\n\n` +
      `${planEmoji[planUpper] || '💎'} *Plan:* ${planUpper}\n` +
      `💵 *Montant:* ${request.amount} FCFA\n\n` +
      `🔑 *Code d'activation:*\n` +
      `\`${activationCode}\`\n\n` +
      `📱 *Pour activer:*\n` +
      `Envoyez: *.activer ${activationCode}*\n\n` +
      `Merci ! 🙏`;
    
    // IMPORTANT: Envoyer DIRECTEMENT au client (pas via repondre)
    try {
      await ovl.sendMessage(clientJid, { text: clientMsg });
      console.log(`[VALIDATEPAY] ✅ Code envoyé à ${clientPhone}`);
    } catch (e) {
      console.error('[VALIDATEPAY] Erreur envoi:', e.message);
    }
    
    return repondre(`✅ *PAIEMENT VALIDÉ !*\n\n` +
      `👤 ${request.name}\n` +
      `📱 ${request.phone}\n` +
      `${planEmoji[planUpper] || '💎'} ${planUpper}\n` +
      `💵 ${request.amount} FCFA\n\n` +
      `🔑 Code: \`${activationCode}\`\n\n` +
      `📤 Envoyé au client !`);
    
  } catch (e) {
    console.error('[VALIDATEPAY]', e);
    return repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ❌ REJETER UN PAIEMENT (OWNER)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "rejectpay",
  classe: "Owner",
  react: "❌",
  desc: "Rejeter un paiement",
  alias: ["rp", "rejeter"]
}, async (ovl, msg, { arg, repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Commande réservée à l'owner.");
  }
  
  if (!arg || arg.length === 0) {
    return repondre(`❌ *REJETER UN PAIEMENT*\n\n` +
      `Usage: *.rejectpay ID [raison]*\n\n` +
      `Exemple: *.rejectpay A1B2C3 Paiement non reçu*`);
  }
  
  const requestId = arg[0].toUpperCase();
  const reason = arg.slice(1).join(' ') || 'Paiement non vérifié';
  
  try {
    const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
    let pending = [];
    
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
    
    const reqIndex = pending.findIndex(p => p.id === requestId && p.status === 'pending_validation');
    
    if (reqIndex === -1) {
      return repondre(`❌ Demande *${requestId}* non trouvée.`);
    }
    
    const request = pending[reqIndex];
    
    // Marquer rejeté
    pending[reqIndex].status = 'rejected';
    pending[reqIndex].rejectedAt = new Date().toISOString();
    pending[reqIndex].rejectReason = reason;
    fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    
    // Informer le client
    const clientPhone = request.phone.replace(/[^0-9]/g, '');
    const clientJid = clientPhone.startsWith('225') ? `${clientPhone}@s.whatsapp.net` : `225${clientPhone}@s.whatsapp.net`;
    
    const clientMsg = 
      `❌ *DEMANDE REJETÉE*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Bonjour ${request.name},\n\n` +
      `Votre demande n'a pas pu être validée.\n\n` +
      `📝 *Raison:* ${reason}\n\n` +
      `Si vous avez payé, contactez:\n` +
      `📞 wa.me/2250150252467`;
    
    try {
      await ovl.sendMessage(clientJid, { text: clientMsg });
    } catch (e) {}
    
    return repondre(`❌ *REJETÉ*\n\n` +
      `👤 ${request.name}\n` +
      `📱 ${request.phone}\n` +
      `📝 ${reason}\n\n` +
      `Client notifié.`);
    
  } catch (e) {
    return repondre(`❌ Erreur: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 ABONNEMENT (INFO UTILISATEUR)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "abonnement",
  classe: "Premium",
  react: "💳",
  desc: "Infos pour s'abonner"
}, async (ovl, msg, { repondre, sender, auteurMessage }) => {
  const userJid = sender || auteurMessage || msg.key.participant || msg.key.remoteJid;
  
  // Vérifier si déjà abonné
  let currentPlan = null;
  if (premiumDB) {
    try {
      const status = premiumDB.getPremiumStatus(userJid);
      if (status.isPremium) currentPlan = status;
    } catch (e) {}
  }
  
  const message = `💳 *S'ABONNER À HANI-MD*\n\n` +
    (currentPlan ? `✅ Actuellement: ${currentPlan.planInfo?.name || 'Premium'}\n\n` : '') +
    `📋 *NOS OFFRES:*\n\n` +
    `🥉 *BRONZE* - 500 FCFA/mois\n` +
    `   ↳ 100 commandes/jour\n\n` +
    `🥈 *ARGENT* - 1 000 FCFA/mois\n` +
    `   ↳ 300 commandes/jour\n\n` +
    `🥇 *OR* - 2 000 FCFA/mois ⭐\n` +
    `   ↳ Illimité\n\n` +
    `💎 *DIAMANT* - 5 000 FCFA/mois\n` +
    `   ↳ Tout illimité\n\n` +
    `👑 *LIFETIME* - 15 000 FCFA\n` +
    `   ↳ À vie !\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📱 *PAIEMENT WAVE*\n\n` +
    `1️⃣ Visitez le site\n` +
    `2️⃣ Remplissez le formulaire\n` +
    `3️⃣ Payez avec Wave\n` +
    `4️⃣ Recevez votre code\n` +
    `5️⃣ *.activer CODE*\n\n` +
    `📞 Support: wa.me/2250150252467`;
  
  return repondre(message);
});

// ═══════════════════════════════════════════════════════════
// 💎 MON PLAN (UTILISATEUR)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "monplan",
  classe: "Premium",
  react: "💎",
  desc: "Voir votre abonnement"
}, async (ovl, msg, { repondre, sender, auteurMessage }) => {
  const userJid = sender || auteurMessage || msg.key.participant || msg.key.remoteJid;
  
  let premiumStatus = null;
  if (premiumDB) {
    try {
      premiumStatus = premiumDB.getPremiumStatus(userJid);
    } catch (e) {}
  }
  
  if (!premiumStatus?.isPremium) {
    return repondre(`💎 *VOTRE ABONNEMENT*\n\n` +
      `🆓 Mode *GRATUIT*\n\n` +
      `• 20 commandes/jour\n` +
      `• Fonctionnalités basiques\n\n` +
      `Tapez *.abonnement* pour les offres !`);
  }
  
  const plan = premiumStatus.planInfo;
  const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
  const daysLeft = premiumStatus.daysLeft;
  const expiresText = daysLeft === -1 ? '♾️ À VIE' : `📅 ${daysLeft} jour(s) restant(s)`;
  
  return repondre(`💎 *VOTRE ABONNEMENT*\n\n` +
    `${planEmoji[plan?.name?.toUpperCase()] || '💎'} *Plan:* ${plan?.name || 'Premium'}\n` +
    `${expiresText}\n\n` +
    `✅ Accès premium actif !`);
});

// ═══════════════════════════════════════════════════════════
// 📊 TARIFS (ALIAS)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "tarifs",
  classe: "Premium",
  react: "💰",
  desc: "Voir les tarifs",
  alias: ["plans", "prix", "offres"]
}, async (ovl, msg, { repondre }) => {
  return repondre(`💰 *TARIFS HANI-MD PREMIUM*\n\n` +
    `🥉 BRONZE - *500 FCFA*/mois\n` +
    `🥈 ARGENT - *1 000 FCFA*/mois\n` +
    `🥇 OR - *2 000 FCFA*/mois ⭐\n` +
    `💎 DIAMANT - *5 000 FCFA*/mois\n` +
    `👑 LIFETIME - *15 000 FCFA* (à vie)\n\n` +
    `📱 Paiement Wave uniquement\n` +
    `Tapez *.abonnement* pour plus d'infos`);
});

console.log('[WAVE] ✅ Module WavePayments chargé');
