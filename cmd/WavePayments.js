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
let writeJSONPersisted = null;
try {
  premiumDB = require('../DataBase/premium');
  // writeJSON avec backup MySQL automatique
  writeJSONPersisted = premiumDB.writeJSON;
} catch (e) {
  console.error('[WAVE CMD] Module premium non disponible');
}

// Sauvegarde Firebase des fichiers non couverts par premium.writeJSON
let _jsonStore = null;
try { _jsonStore = require('../DataBase/jsonStore'); } catch (e) { _jsonStore = null; }

// Fallback si writeJSONPersisted non disponible
function savePersisted(file, data) {
  let ok;
  if (writeJSONPersisted) {
    ok = writeJSONPersisted(file, data);
  } else {
    try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); ok = true; }
    catch (e) { ok = false; }
  }
  // Write-through Firebase (codes d'activation & autres non gérés par premium.js)
  if (ok && _jsonStore) { _jsonStore.backupFile(file).catch(() => {}); }
  return ok;
}

// Numéro du owner pour les notifications
const OWNER_NUMBER = (config.NUMERO_OWNER || '22550252467').replace(/[^0-9]/g, '');
const OWNER_JID = OWNER_NUMBER + '@s.whatsapp.net';

// Lien de paiement Jeko (configurable via .env)
const JEKO_BASE_LINK = process.env.JEKO_PAYMENT_LINK || 'https://pay.jeko.africa/pl/2a5354be-710e-454e-8741-1b3d6beb5890';

// Prix des plans (doit correspondre exactement au paiement)
const PLANS_PRIX = {
  bronze:  { prix: 500,   emoji: '🥉', label: 'BRONZE'  },
  argent:  { prix: 1000,  emoji: '🥈', label: 'ARGENT'  },
  or:      { prix: 2000,  emoji: '🥇', label: 'OR'      },
  diamant: { prix: 5000,  emoji: '💎', label: 'DIAMANT' },
  lifetime:{ prix: 15000, emoji: '👑', label: 'LIFETIME'}
};

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
      `${process.env.BOT_URL || 'http://localhost:3000'}/subscribe.html`);
  }
  
  const code = arg[0].toUpperCase();
  console.log(`[ACTIVER] 🔍 Code: ${code}`);
  
  try {
    // ── 1. Chercher le code dans activation_codes.json ou premium_codes.json ──
    let codeData = null;
    let codeSource = null;

    const activationCodesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
    if (fs.existsSync(activationCodesFile)) {
      const codes = JSON.parse(fs.readFileSync(activationCodesFile, 'utf8') || '{}');
      if (codes[code]) { codeData = codes[code]; codeSource = 'activation_codes'; }
    }

    if (!codeData) {
      const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
      if (fs.existsSync(premiumCodesFile)) {
        const codes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8') || '{}');
        if (codes[code]) { codeData = codes[code]; codeSource = 'premium_codes'; }
      }
    }

    if (!codeData) {
      return repondre(`❌ *Code invalide*\n\nLe code \`${code}\` n'existe pas.\nVérifiez le code reçu ou contactez: wa.me/${OWNER_NUMBER}`);
    }

    if (codeData.used || codeData.usedBy) {
      return repondre(`❌ *Code déjà utilisé*\n\nCe code a déjà été activé par un autre utilisateur.`);
    }

    // ── 2. Lire les infos du plan ──
    const planName = codeData.plan || 'OR';
    const planUpper = planName.toUpperCase();
    const days = codeData.days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // ── 3. Marquer le code comme utilisé ──
    codeData.used = true;
    codeData.usedBy = userJid;
    codeData.usedAt = new Date().toISOString();
    codeData.expiresAt = expiresAt.toISOString();

    const targetFile = path.join(__dirname, '..', 'DataBase', `${codeSource}.json`);
    const allCodes = JSON.parse(fs.readFileSync(targetFile, 'utf8') || '{}');
    allCodes[code] = codeData;
    savePersisted(targetFile, allCodes);

    // ── 4. Activer le premium dans la base de données (débloque les fonctionnalités) ──
    if (premiumDB) {
      try {
        premiumDB.addPremium(userJid, planName.toLowerCase(), days);
      } catch (e) {
        console.error('[ACTIVER] Erreur addPremium:', e.message);
      }
    }

    // ── 5. Sauvegarder dans subscribers.json ──
    try {
      const subscribersFile = path.join(__dirname, '..', 'DataBase', 'subscribers.json');
      let subscribers = { subscribers: [] };
      if (fs.existsSync(subscribersFile)) {
        subscribers = JSON.parse(fs.readFileSync(subscribersFile, 'utf8') || '{"subscribers":[]}');
      }
      const phone = userJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const idx = subscribers.subscribers.findIndex(s => s.phone === phone);
      const data = {
        phone, whatsappJid: userJid,
        plan: planUpper, status: 'active',
        activatedAt: new Date().toISOString(),
        expiresAt: days >= 36500 ? null : expiresAt.toISOString(),
        activationCode: code
      };
      if (idx >= 0) {
        subscribers.subscribers[idx] = { ...subscribers.subscribers[idx], ...data };
      } else {
        subscribers.subscribers.push(data);
      }
      savePersisted(subscribersFile, subscribers);
    } catch (e) {}

    // ── 6. Notifier l'owner ──
    const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
    try {
      await ovl.sendMessage(OWNER_JID, {
        text: `🎉 *NOUVEAU ABONNÉ ACTIVÉ*\n\n` +
          `👤 ${msg.pushName || userJid.replace('@s.whatsapp.net','')}\n` +
          `📱 ${userJid.replace('@s.whatsapp.net','')}\n` +
          `${planEmoji[planUpper] || '💎'} Plan: ${planUpper}\n` +
          `📅 Expire: ${days >= 36500 ? 'LIFETIME' : expiresAt.toLocaleDateString('fr-FR')}\n` +
          `🔑 Code: ${code}`
      });
    } catch (e) {}

    // ── 7. Message de succès au client ──
    const planFeatures = {
      BRONZE:  '✅ 100 commandes/jour\n✅ Téléchargements audio/vidéo\n✅ Stickers avancés',
      ARGENT:  '✅ 300 commandes/jour\n✅ Téléchargements HD\n✅ IA complète (GPT)\n✅ Gestion de groupe',
      OR:      '✅ Commandes ILLIMITÉES\n✅ Toutes les fonctionnalités\n✅ IA sans limite\n✅ Support VIP',
      DIAMANT: '✅ TOUT ILLIMITÉ\n✅ Support personnel\n✅ Fonctionnalités exclusives',
      LIFETIME:'✅ ACCÈS À VIE\n✅ Toutes les fonctionnalités\n✅ Mises à jour gratuites'
    };
    const expireText = days >= 36500 ? '♾️ *À VIE*' : `📅 Expire le: *${expiresAt.toLocaleDateString('fr-FR')}*`;

    console.log(`[ACTIVER] ✅ ${planUpper} activé pour ${userJid}`);

    return repondre(
      `🎉 *ABONNEMENT ACTIVÉ !*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${planEmoji[planUpper] || '💎'} Plan: *${planUpper}*\n` +
      `${expireText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${planFeatures[planUpper] || '✅ Accès premium activé'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ Vos fonctionnalités premium sont\n` +
      `   *immédiatement disponibles* sur ce chat.\n\n` +
      `📋 Tapez *.menu* pour voir vos commandes\n` +
      `💎 Tapez *.monplan* pour voir votre abonnement\n\n` +
      `💬 Support: wa.me/${OWNER_NUMBER}\n` +
      `⭐ Merci d'avoir choisi HANI-MD !`
    );

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
    savePersisted(codesFile, codes);
    
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
    savePersisted(premiumCodesFile, premiumCodes);
    
    // Marquer validé
    pending[reqIndex].status = 'validated';
    pending[reqIndex].validatedAt = new Date().toISOString();
    pending[reqIndex].activationCode = activationCode;
    savePersisted(pendingFile, pending);
    
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
    savePersisted(pendingFile, pending);
    
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
      `📞 wa.me/22550252467`;
    
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
    `   ↳ Commandes illimitées\n\n` +
    `💎 *DIAMANT* - 5 000 FCFA/mois\n` +
    `   ↳ Tout illimité + bot dédié\n\n` +
    `👑 *LIFETIME* - 15 000 FCFA\n` +
    `   ↳ Accès à vie !\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `� *COMMENT PAYER (Wave):*\n\n` +
    `1️⃣ Tapez *.payer <plan>*\n` +
    `   Ex: *.payer or*\n\n` +
    `2️⃣ Cliquez le lien Wave reçu\n` +
    `3️⃣ Payez le montant EXACT\n` +
    `4️⃣ Tapez *.confirmer REF MONTANT*\n` +
    `5️⃣ Recevez votre code d'activation\n` +
    `6️⃣ Tapez *.activer CODE*\n\n` +
    `📞 Support: wa.me/${OWNER_NUMBER}`;
  
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

// ═══════════════════════════════════════════════════════════
// 💳 .payer <plan> — GÉNÈRE LE LIEN JEKO AVEC LE BON MONTANT
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "payer",
  classe: "Premium",
  react: "💳",
  desc: "Obtenir le lien de paiement Wave pour un plan",
  alias: ["pay", "acheter", "subscribe"]
}, async (ovl, msg, { arg, repondre, sender, auteurMessage }) => {
  const userJid = sender || auteurMessage || msg.key.participant || msg.key.remoteJid;
  const userPhone = userJid.replace('@s.whatsapp.net', '').replace('@lid', '');

  // Afficher les plans si aucun argument
  if (!arg || arg.length === 0) {
    return repondre(
      `💳 *PAIEMENT HANI-MD PREMIUM*\n\n` +
      `Choisissez votre plan:\n\n` +
      `🥉 *.payer bronze*  → 500 FCFA/mois\n` +
      `🥈 *.payer argent*  → 1 000 FCFA/mois\n` +
      `🥇 *.payer or*      → 2 000 FCFA/mois ⭐\n` +
      `💎 *.payer diamant* → 5 000 FCFA/mois\n` +
      `👑 *.payer lifetime*→ 15 000 FCFA (à vie)\n\n` +
      `_Exemple: .payer or_`
    );
  }

  const planKey = arg[0].toLowerCase();
  const plan = PLANS_PRIX[planKey];

  if (!plan) {
    return repondre(
      `❌ *Plan invalide:* \`${arg[0]}\`\n\n` +
      `Plans disponibles: bronze, argent, or, diamant, lifetime`
    );
  }

  // Générer une référence unique pour ce paiement
  const crypto = require('crypto');
  const refId = crypto.randomBytes(4).toString('hex').toUpperCase();
  const reference = `HANI-${plan.label}-${refId}`;

  // Construire le lien Jeko avec le montant exact
  const jekoLink = `${JEKO_BASE_LINK}?amount=${plan.prix}&reference=${reference}`;

  // Sauvegarder la demande en attente avec le montant attendu
  const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
  let pending = [];
  try {
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
  } catch (e) {}

  pending.push({
    id: reference,
    phone: userPhone,
    whatsappJid: userJid,
    plan: plan.label,
    amount: plan.prix,           // ← montant ATTENDU (référence pour la vérification)
    status: 'awaiting_payment',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // expire dans 24h
  });

  savePersisted(pendingFile, pending);

  const durationText = plan.label === 'LIFETIME' ? 'À VIE' : '30 jours';

  return repondre(
    `${plan.emoji} *PAIEMENT ${plan.label}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💵 *Montant exact:* ${plan.prix} FCFA\n` +
    `📅 *Durée:* ${durationText}\n` +
    `🆔 *Référence:* \`${reference}\`\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Cliquez pour payer:*\n` +
    `${jekoLink}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *IMPORTANT:*\n` +
    `• Payez EXACTEMENT *${plan.prix} FCFA*\n` +
    `• Tout autre montant sera *rejeté automatiquement*\n\n` +
    `✅ *Après paiement, envoyez:*\n` +
    `*.confirmer ${reference} ${plan.prix}*\n\n` +
    `⏳ Cette référence expire dans 24h`
  );
});

// ═══════════════════════════════════════════════════════════
// ✅ .confirmer <ref> <montant> — VÉRIFICATION AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "confirmer",
  classe: "Premium",
  react: "🔄",
  desc: "Confirmer votre paiement Wave après avoir payé",
  alias: ["confirm", "paie"]
}, async (ovl, msg, { arg, repondre, sender, auteurMessage }) => {
  const userJid = sender || auteurMessage || msg.key.participant || msg.key.remoteJid;
  const userPhone = userJid.replace('@s.whatsapp.net', '').replace('@lid', '');

  if (!arg || arg.length < 2) {
    return repondre(
      `🔄 *CONFIRMER UN PAIEMENT*\n\n` +
      `Usage:\n` +
      `*.confirmer REFERENCE MONTANT_PAYÉ*\n\n` +
      `Exemple:\n` +
      `*.confirmer HANI-OR-A1B2C3D4 2000*\n\n` +
      `💡 La référence vous a été donnée lors de votre commande *.payer*`
    );
  }

  const reference = arg[0].toUpperCase();
  const montantSoumis = parseInt(arg[1], 10);

  // Vérifier que le montant soumis est un nombre valide
  if (isNaN(montantSoumis) || montantSoumis <= 0) {
    return repondre(`❌ *Montant invalide:* \`${arg[1]}\`\n\nEntrez le montant que vous avez payé en chiffres.\nExemple: *.confirmer HANI-OR-A1B2 2000*`);
  }

  // Charger les paiements en attente
  const pendingFile = path.join(__dirname, '..', 'DataBase', 'pending_validations.json');
  let pending = [];
  try {
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
  } catch (e) {
    return repondre(`❌ Erreur système. Contactez: wa.me/${OWNER_NUMBER}`);
  }

  // Trouver la demande par référence
  const reqIndex = pending.findIndex(p => p.id === reference);

  if (reqIndex === -1) {
    return repondre(
      `❌ *Référence introuvable:* \`${reference}\`\n\n` +
      `• Vérifiez la référence reçue lors de *.payer*\n` +
      `• La référence expire après 24h\n` +
      `• Recommencez avec *.payer <plan>*`
    );
  }

  const demande = pending[reqIndex];

  // Vérifier si déjà traité
  if (demande.status === 'validated' || demande.status === 'active') {
    return repondre(`✅ Ce paiement a déjà été validé.\nTapez *.activer ${demande.activationCode || 'VOTRE-CODE'}* pour activer.`);
  }

  if (demande.status === 'rejected') {
    return repondre(`❌ Cette demande a déjà été rejetée.\nFaites *.payer ${demande.plan.toLowerCase()}* pour recommencer.`);
  }

  // Vérifier si expiré
  if (demande.expiresAt && new Date(demande.expiresAt) < new Date()) {
    pending[reqIndex].status = 'expired';
    savePersisted(pendingFile, pending);
    return repondre(`⏰ *Référence expirée*\n\nFaites *.payer ${demande.plan.toLowerCase()}* pour obtenir un nouveau lien.`);
  }

  // ═══════════════════════════════════════════════
  // 🔍 VÉRIFICATION AUTOMATIQUE DU MONTANT
  // ═══════════════════════════════════════════════
  const montantAttendu = demande.amount;

  if (montantSoumis !== montantAttendu) {
    // ❌ REJET AUTOMATIQUE — montant incorrect
    pending[reqIndex].status = 'rejected';
    pending[reqIndex].rejectReason = `Montant incorrect: soumis ${montantSoumis} FCFA, attendu ${montantAttendu} FCFA`;
    pending[reqIndex].rejectedAt = new Date().toISOString();
    savePersisted(pendingFile, pending);

    // Notifier l'owner du rejet automatique
    try {
      await ovl.sendMessage(OWNER_JID, {
        text: `⚠️ *REJET AUTOMATIQUE*\n\n` +
          `👤 ${userPhone}\n` +
          `🆔 Réf: ${reference}\n` +
          `${demande.plan} — Attendu: ${montantAttendu} FCFA\n` +
          `❌ Soumis: ${montantSoumis} FCFA\n` +
          `📅 ${new Date().toLocaleString('fr-FR')}`
      });
    } catch (e) {}

    return repondre(
      `❌ *PAIEMENT REJETÉ AUTOMATIQUEMENT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆔 Référence: \`${reference}\`\n` +
      `💵 Montant attendu: *${montantAttendu} FCFA*\n` +
      `💸 Montant soumis: *${montantSoumis} FCFA*\n\n` +
      `⚠️ *Le montant ne correspond pas au plan.*\n\n` +
      `📌 Solutions:\n` +
      `• Si vous avez payé *${montantAttendu} FCFA*, re-soumettez avec le bon montant\n` +
      `• Si vous avez payé un autre montant, contactez:\n` +
      `  📞 wa.me/${OWNER_NUMBER}`
    );
  }

  // ✅ MONTANT CORRECT — marquer comme pending_validation pour l'owner
  pending[reqIndex].status = 'pending_validation';
  pending[reqIndex].confirmedAt = new Date().toISOString();
  pending[reqIndex].amountConfirmed = montantSoumis;
  pending[reqIndex].name = msg.pushName || userPhone;
  pending[reqIndex].waveNumber = userPhone;
  pending[reqIndex].transactionId = `AUTO-${Date.now()}`;
  savePersisted(pendingFile, pending);

  // Notifier l'owner pour validation finale
  const planEmoji = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
  try {
    await ovl.sendMessage(OWNER_JID, {
      text: `💰 *NOUVEAU PAIEMENT À VALIDER*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Nom:* ${msg.pushName || userPhone}\n` +
        `📱 *Tel:* ${userPhone}\n` +
        `🆔 *Réf:* \`${reference}\`\n` +
        `${planEmoji[demande.plan] || '💎'} *Plan:* ${demande.plan}\n` +
        `✅ *Montant vérifié:* ${montantSoumis} FCFA\n` +
        `📅 ${new Date().toLocaleString('fr-FR')}\n\n` +
        `▶️ Pour valider: *.validatepay ${reference}*\n` +
        `▶️ Pour rejeter: *.rejectpay ${reference}*`
    });
  } catch (e) {}

  return repondre(
    `✅ *PAIEMENT REÇU ET VÉRIFIÉ !*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🆔 Référence: \`${reference}\`\n` +
    `${planEmoji[demande.plan] || '💎'} Plan: *${demande.plan}*\n` +
    `💵 Montant: *${montantSoumis} FCFA* ✅\n\n` +
    `⏳ *Validation en cours...*\n` +
    `Vous recevrez votre code d'activation\n` +
    `dans les prochaines minutes.\n\n` +
    `💬 Support: wa.me/${OWNER_NUMBER}`
  );
});

console.log('[WAVE] ✅ Module WavePayments chargé');

