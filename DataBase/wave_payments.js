/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💳 HANI-MD - SYSTÈME PAIEMENT WAVE                ║
 * ║     Gestion complète des paiements Wave et abonnements    ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Fichiers de stockage
const PAYMENTS_FILE = path.join(__dirname, 'wave_transactions.json');
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const ACTIVATION_CODES_FILE = path.join(__dirname, 'activation_codes.json');

// Configuration Wave API Business
const WAVE_CONFIG = {
  apiKey: process.env.WAVE_API_KEY || '', // Clé API Wave Business
  apiUrl: 'https://api.wave.com/v1',
  // Compte Marchand Wave Business - informations sécurisées
  merchantId: process.env.WAVE_MERCHANT_ID || '',
  merchantAccount: process.env.WAVE_ACCOUNT || '',
  merchantName: 'HANI-MD Premium',
  ownerName: 'HANI-MD',
  currency: 'XOF',
  country: 'CI', // Côte d'Ivoire
  // URLs de redirection après paiement
  successUrl: process.env.WAVE_SUCCESS_URL || 'https://hani-md-1hanieljean1-f1e1290c.koyeb.app/payment-success',
  errorUrl: process.env.WAVE_ERROR_URL || 'https://hani-md-1hanieljean1-f1e1290c.koyeb.app/payment-error'
};

// Plans disponibles
const PLANS = {
  BRONZE: { name: 'Bronze', price: 500, duration: 30, emoji: '🥉', commands: 100 },
  ARGENT: { name: 'Argent', price: 1000, duration: 30, emoji: '🥈', commands: 300 },
  OR: { name: 'Or', price: 2000, duration: 30, emoji: '🥇', commands: -1 },
  DIAMANT: { name: 'Diamant', price: 5000, duration: 30, emoji: '💎', commands: -1 },
  LIFETIME: { name: 'Lifetime', price: 15000, duration: -1, emoji: '👑', commands: -1 }
};

// ═══════════════════════════════════════════════════════════
// 📁 FONCTIONS DE STOCKAGE
// ═══════════════════════════════════════════════════════════

function readJSON(file, defaultValue = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[WAVE] Erreur écriture:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 💳 API WAVE OFFICIELLE - CHECKOUT SESSION
// ═══════════════════════════════════════════════════════════

/**
 * Crée une session de paiement Wave via l'API officielle
 * Retourne une URL de paiement sécurisée
 */
async function createWaveCheckoutSession(amount, clientReference, clientPhone = null) {
  const apiKey = WAVE_CONFIG.apiKey;
  
  if (!apiKey) {
    console.log('[WAVE] ⚠️ Clé API Wave non configurée, utilisation du mode manuel');
    return {
      success: false,
      mode: 'manual',
      error: 'API Wave non configurée',
      manualInstructions: generateManualInstructions(amount, clientReference)
    };
  }
  
  try {
    const response = await fetch(`${WAVE_CONFIG.apiUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: WAVE_CONFIG.currency,
        error_url: `${WAVE_CONFIG.errorUrl}?ref=${clientReference}`,
        success_url: `${WAVE_CONFIG.successUrl}?ref=${clientReference}`,
        client_reference: clientReference
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.wave_launch_url) {
      console.log(`[WAVE] ✅ Session checkout créée: ${clientReference}`);
      return {
        success: true,
        mode: 'api',
        checkoutUrl: data.wave_launch_url,
        sessionId: data.id,
        expiresAt: data.when_expires,
        clientReference: clientReference
      };
    } else {
      console.error('[WAVE] ❌ Erreur API:', data);
      return {
        success: false,
        mode: 'manual',
        error: data.message || 'Erreur Wave API',
        manualInstructions: generateManualInstructions(amount, clientReference)
      };
    }
  } catch (error) {
    console.error('[WAVE] ❌ Erreur connexion API:', error.message);
    return {
      success: false,
      mode: 'manual',
      error: error.message,
      manualInstructions: generateManualInstructions(amount, clientReference)
    };
  }
}

/**
 * Génère les instructions de paiement manuel (fallback)
 */
function generateManualInstructions(amount, reference) {
  const merchantAccount = WAVE_CONFIG.merchantAccount;
  const merchantName = WAVE_CONFIG.merchantName;
  return {
    merchantAccount: 'HANI-MD',
    merchantName: merchantName,
    amount: amount,
    reference: reference,
    instructions: [
      `1. Cliquez sur le bouton "Payer avec Wave"`,
      `2. Vous serez redirigé vers Wave`,
      `3. Montant: ${amount} FCFA`,
      `4. Référence: HANI-MD ${reference}`
    ]
  };
}

/**
 * Génère un lien de paiement Wave (mode manuel/fallback)
 */
function generateWavePaymentLink(amount, reference) {
  const merchantAccount = WAVE_CONFIG.merchantAccount;
  
  return {
    merchantAccount: merchantAccount,
    merchantName: WAVE_CONFIG.merchantName,
    amount: amount,
    reference: reference
  };
}

// ═══════════════════════════════════════════════════════════
// 📝 GESTION DES ABONNÉS
// ═══════════════════════════════════════════════════════════

/**
 * Crée un nouvel abonné avec paiement en attente
 */
function createSubscriber(name, phone, plan) {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const planData = PLANS[plan.toUpperCase()];
  
  if (!planData) {
    return { success: false, error: 'Plan invalide' };
  }
  
  // Vérifier si l'abonné existe déjà
  const existingIndex = subscribers.subscribers.findIndex(
    s => s.phone === phone.replace(/[^0-9]/g, '')
  );
  
  const subscriberId = crypto.randomBytes(8).toString('hex').toUpperCase();
  const paymentRef = `HANI-${subscriberId.slice(0, 8)}`;
  
  const subscriber = {
    id: subscriberId,
    name: name.trim(),
    phone: phone.replace(/[^0-9]/g, ''),
    plan: plan.toUpperCase(),
    planDetails: planData,
    amount: planData.price,
    paymentRef: paymentRef,
    status: 'pending', // pending, paid, active, expired
    createdAt: new Date().toISOString(),
    paidAt: null,
    activatedAt: null,
    expiresAt: null,
    activationCode: null,
    whatsappJid: null
  };
  
  if (existingIndex >= 0) {
    // Mettre à jour l'abonné existant si le paiement est en attente
    if (subscribers.subscribers[existingIndex].status === 'pending') {
      subscribers.subscribers[existingIndex] = subscriber;
    } else {
      // Créer une nouvelle entrée pour renouvellement
      subscriber.id = crypto.randomBytes(8).toString('hex').toUpperCase();
      subscriber.paymentRef = `HANI-${subscriber.id.slice(0, 8)}`;
      subscribers.subscribers.push(subscriber);
    }
  } else {
    subscribers.subscribers.push(subscriber);
  }
  
  writeJSON(SUBSCRIBERS_FILE, subscribers);
  
  // Générer le lien de paiement Wave
  const paymentLinks = generateWavePaymentLink(planData.price, paymentRef);
  
  console.log(`[WAVE] 📝 Nouvel abonné: ${name} (${phone}) - Plan ${plan}`);
  
  return {
    success: true,
    subscriber: subscriber,
    paymentLinks: paymentLinks,
    message: `Abonnement ${planData.emoji} ${planData.name} - ${planData.price} FCFA`
  };
}

/**
 * Confirme le paiement et génère le code d'activation
 */
function confirmPayment(subscriberIdOrPhone, adminNote = '') {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const activationCodes = readJSON(ACTIVATION_CODES_FILE, { codes: [] });
  
  // Trouver l'abonné par ID ou téléphone
  const subscriberIndex = subscribers.subscribers.findIndex(
    s => s.id === subscriberIdOrPhone || 
         s.phone === subscriberIdOrPhone.replace(/[^0-9]/g, '') ||
         s.paymentRef === subscriberIdOrPhone
  );
  
  if (subscriberIndex < 0) {
    return { success: false, error: 'Abonné non trouvé' };
  }
  
  const subscriber = subscribers.subscribers[subscriberIndex];
  
  if (subscriber.status === 'active') {
    return { success: false, error: 'Cet abonnement est déjà actif' };
  }
  
  // Générer le code d'activation unique
  const activationCode = `HANI-${subscriber.plan}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  
  // Mettre à jour l'abonné
  subscriber.status = 'paid';
  subscriber.paidAt = new Date().toISOString();
  subscriber.activationCode = activationCode;
  subscriber.adminNote = adminNote;
  
  subscribers.subscribers[subscriberIndex] = subscriber;
  writeJSON(SUBSCRIBERS_FILE, subscribers);
  
  // Sauvegarder le code d'activation
  activationCodes.codes.push({
    code: activationCode,
    subscriberId: subscriber.id,
    subscriberName: subscriber.name,
    subscriberPhone: subscriber.phone,
    plan: subscriber.plan,
    amount: subscriber.amount,
    createdAt: new Date().toISOString(),
    used: false,
    usedAt: null,
    usedByJid: null
  });
  
  writeJSON(ACTIVATION_CODES_FILE, activationCodes);
  
  console.log(`[WAVE] ✅ Paiement confirmé: ${subscriber.name} - Code: ${activationCode}`);
  
  return {
    success: true,
    activationCode: activationCode,
    subscriber: subscriber,
    message: `Code d'activation généré: ${activationCode}`
  };
}

/**
 * Active l'abonnement avec le code
 */
function activateWithCode(code, whatsappJid) {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const activationCodes = readJSON(ACTIVATION_CODES_FILE, {});
  const codeUpper = code.toUpperCase();
  
  // Support des deux formats de stockage
  // Format 1: { codes: [...] } (ancien format tableau)
  // Format 2: { "HANI-OR-XXX": {...} } (nouveau format objet)
  
  let codeData = null;
  let isObjectFormat = false;
  
  // Vérifier le nouveau format (objet)
  if (activationCodes[codeUpper]) {
    codeData = activationCodes[codeUpper];
    isObjectFormat = true;
  } else if (activationCodes.codes && Array.isArray(activationCodes.codes)) {
    // Ancien format (tableau)
    const codeIndex = activationCodes.codes.findIndex(c => c.code === codeUpper);
    if (codeIndex >= 0) {
      codeData = activationCodes.codes[codeIndex];
      codeData._index = codeIndex;
    }
  }
  
  // Vérifier aussi dans le système premium standard
  if (!codeData) {
    try {
      const premiumCodesFile = path.join(__dirname, 'premium_codes.json');
      const premiumCodes = readJSON(premiumCodesFile, {});
      if (premiumCodes[codeUpper]) {
        codeData = premiumCodes[codeUpper];
        codeData._fromPremium = true;
      }
    } catch (e) {}
  }
  
  if (!codeData) {
    return { success: false, error: 'Code d\'activation invalide' };
  }
  
  // Vérifier si déjà utilisé
  if (codeData.used || codeData.usedBy) {
    return { success: false, error: 'Ce code a déjà été utilisé' };
  }
  
  // Récupérer les infos du plan
  const planName = codeData.plan || 'OR';
  const planData = PLANS[planName.toUpperCase()] || PLANS.OR;
  
  // Calculer la date d'expiration
  const days = codeData.days || planData.duration || 30;
  let expiresAt = null;
  if (days > 0) {
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  
  // Marquer le code comme utilisé
  if (isObjectFormat) {
    activationCodes[codeUpper].usedBy = whatsappJid;
    activationCodes[codeUpper].usedAt = new Date().toISOString();
    writeJSON(ACTIVATION_CODES_FILE, activationCodes);
  } else if (codeData._index !== undefined) {
    activationCodes.codes[codeData._index].used = true;
    activationCodes.codes[codeData._index].usedAt = new Date().toISOString();
    activationCodes.codes[codeData._index].usedByJid = whatsappJid;
    writeJSON(ACTIVATION_CODES_FILE, activationCodes);
  } else if (codeData._fromPremium) {
    try {
      const premiumCodesFile = path.join(__dirname, 'premium_codes.json');
      const premiumCodes = readJSON(premiumCodesFile, {});
      premiumCodes[codeUpper].used = true;
      premiumCodes[codeUpper].usedBy = whatsappJid;
      premiumCodes[codeUpper].usedAt = new Date().toISOString();
      writeJSON(premiumCodesFile, premiumCodes);
    } catch (e) {}
  }
  
  // Créer/mettre à jour l'abonné
  const phone = whatsappJid.replace('@s.whatsapp.net', '').replace('@lid', '');
  let subscriber = subscribers.subscribers.find(s => s.phone === phone);
  
  if (!subscriber) {
    subscriber = {
      id: crypto.randomBytes(8).toString('hex').toUpperCase(),
      name: 'Utilisateur',
      phone: phone,
      plan: planName.toUpperCase(),
      planDetails: planData,
      amount: planData.price,
      status: 'active',
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      expiresAt: expiresAt,
      whatsappJid: whatsappJid,
      activationCode: codeUpper
    };
    subscribers.subscribers.push(subscriber);
  } else {
    subscriber.status = 'active';
    subscriber.plan = planName.toUpperCase();
    subscriber.activatedAt = new Date().toISOString();
    subscriber.expiresAt = expiresAt;
  }
  
  writeJSON(SUBSCRIBERS_FILE, subscribers);
  
  console.log(`[WAVE] 🎉 Abonnement activé: ${subscriber.name} (${planName}) via ${whatsappJid}`);
  
  return {
    success: true,
    subscriber: subscriber,
    plan: planData,
    expiresAt: expiresAt,
    message: `${planData.emoji} Plan ${planData.name} activé avec succès!`
  };
}

// ═══════════════════════════════════════════════════════════
// 📊 FONCTIONS ADMIN/OWNER
// ═══════════════════════════════════════════════════════════

/**
 * Récupère tous les abonnés
 */
function getAllSubscribers(status = null) {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  
  if (status) {
    return subscribers.subscribers.filter(s => s.status === status);
  }
  
  return subscribers.subscribers;
}

/**
 * Récupère les statistiques
 */
function getStats() {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const activationCodes = readJSON(ACTIVATION_CODES_FILE, { codes: [] });
  
  const stats = {
    total: subscribers.subscribers.length,
    pending: subscribers.subscribers.filter(s => s.status === 'pending').length,
    paid: subscribers.subscribers.filter(s => s.status === 'paid').length,
    active: subscribers.subscribers.filter(s => s.status === 'active').length,
    expired: subscribers.subscribers.filter(s => s.status === 'expired').length,
    totalRevenue: subscribers.subscribers
      .filter(s => ['paid', 'active'].includes(s.status))
      .reduce((sum, s) => sum + s.amount, 0),
    byPlan: {},
    codesGenerated: activationCodes.codes.length,
    codesUsed: activationCodes.codes.filter(c => c.used).length
  };
  
  // Stats par plan
  for (const plan of Object.keys(PLANS)) {
    stats.byPlan[plan] = subscribers.subscribers.filter(s => s.plan === plan && s.status === 'active').length;
  }
  
  return stats;
}

/**
 * Recherche un abonné
 */
function findSubscriber(query) {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const cleanQuery = query.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
  
  return subscribers.subscribers.filter(s => 
    s.id.toLowerCase().includes(cleanQuery) ||
    s.phone.includes(cleanQuery) ||
    s.name.toLowerCase().includes(cleanQuery) ||
    s.paymentRef.toLowerCase().includes(cleanQuery) ||
    (s.activationCode && s.activationCode.toLowerCase().includes(cleanQuery))
  );
}

/**
 * Vérifie si un numéro a un abonnement actif
 */
function checkActiveSubscription(phone) {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  const activeSubscription = subscribers.subscribers.find(
    s => s.phone === cleanPhone && s.status === 'active'
  );
  
  if (!activeSubscription) {
    return { hasSubscription: false };
  }
  
  // Vérifier si expiré
  if (activeSubscription.expiresAt && new Date(activeSubscription.expiresAt) < new Date()) {
    // Marquer comme expiré
    const index = subscribers.subscribers.findIndex(s => s.id === activeSubscription.id);
    if (index >= 0) {
      subscribers.subscribers[index].status = 'expired';
      writeJSON(SUBSCRIBERS_FILE, subscribers);
    }
    return { hasSubscription: false, expired: true };
  }
  
  return {
    hasSubscription: true,
    subscription: activeSubscription,
    plan: PLANS[activeSubscription.plan],
    daysLeft: activeSubscription.expiresAt 
      ? Math.ceil((new Date(activeSubscription.expiresAt) - new Date()) / (24 * 60 * 60 * 1000))
      : -1 // Lifetime
  };
}

/**
 * Met à jour les abonnements expirés
 */
function updateExpiredSubscriptions() {
  const subscribers = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const now = new Date();
  let updated = 0;
  
  subscribers.subscribers.forEach((s, index) => {
    if (s.status === 'active' && s.expiresAt && new Date(s.expiresAt) < now) {
      subscribers.subscribers[index].status = 'expired';
      updated++;
    }
  });
  
  if (updated > 0) {
    writeJSON(SUBSCRIBERS_FILE, subscribers);
    console.log(`[WAVE] 📆 ${updated} abonnement(s) expiré(s) mis à jour`);
  }
  
  return updated;
}

// ═══════════════════════════════════════════════════════════
// 🔄 EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = {
  PLANS,
  WAVE_CONFIG,
  generateWavePaymentLink,
  generateManualInstructions,
  createWaveCheckoutSession,
  createSubscriber,
  confirmPayment,
  activateWithCode,
  getAllSubscribers,
  getStats,
  findSubscriber,
  checkActiveSubscription,
  updateExpiredSubscriptions
};
