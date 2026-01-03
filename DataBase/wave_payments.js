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

// Configuration Wave
const WAVE_CONFIG = {
  merchantNumber: process.env.WAVE_NUMBER || '2250150252467',
  merchantName: 'HANI-MD Bot',
  currency: 'XOF',
  country: 'CI' // Côte d'Ivoire
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
// 💳 GÉNÉRATION LIEN WAVE
// ═══════════════════════════════════════════════════════════

/**
 * Génère un lien de paiement Wave
 */
function generateWavePaymentLink(amount, reference) {
  const merchantNumber = WAVE_CONFIG.merchantNumber;
  
  // Lien Wave universel (fonctionne sur mobile et web)
  // Format: https://pay.wave.com/m/NUMERO?amount=MONTANT&reference=REF
  const waveLink = `https://pay.wave.com/m/${merchantNumber}?amount=${amount}&currency=XOF`;
  
  // Lien USSD pour ceux sans smartphone
  const ussdCode = `*171*1*${merchantNumber}*${amount}#`;
  
  return {
    webLink: waveLink,
    mobileLink: `wave://send?recipient=${merchantNumber}&amount=${amount}`,
    ussdCode: ussdCode,
    qrData: waveLink,
    merchantNumber: merchantNumber,
    amount: amount
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
  const activationCodes = readJSON(ACTIVATION_CODES_FILE, { codes: [] });
  
  // Trouver le code
  const codeIndex = activationCodes.codes.findIndex(c => c.code === code.toUpperCase());
  
  if (codeIndex < 0) {
    return { success: false, error: 'Code d\'activation invalide' };
  }
  
  const codeData = activationCodes.codes[codeIndex];
  
  if (codeData.used) {
    return { success: false, error: 'Ce code a déjà été utilisé' };
  }
  
  // Trouver l'abonné
  const subscriberIndex = subscribers.subscribers.findIndex(s => s.id === codeData.subscriberId);
  
  if (subscriberIndex < 0) {
    return { success: false, error: 'Abonné non trouvé' };
  }
  
  const subscriber = subscribers.subscribers[subscriberIndex];
  const planData = PLANS[subscriber.plan];
  
  // Calculer la date d'expiration
  let expiresAt = null;
  if (planData.duration > 0) {
    expiresAt = new Date(Date.now() + planData.duration * 24 * 60 * 60 * 1000).toISOString();
  }
  
  // Mettre à jour l'abonné
  subscriber.status = 'active';
  subscriber.activatedAt = new Date().toISOString();
  subscriber.expiresAt = expiresAt;
  subscriber.whatsappJid = whatsappJid;
  
  subscribers.subscribers[subscriberIndex] = subscriber;
  writeJSON(SUBSCRIBERS_FILE, subscribers);
  
  // Marquer le code comme utilisé
  activationCodes.codes[codeIndex].used = true;
  activationCodes.codes[codeIndex].usedAt = new Date().toISOString();
  activationCodes.codes[codeIndex].usedByJid = whatsappJid;
  
  writeJSON(ACTIVATION_CODES_FILE, activationCodes);
  
  console.log(`[WAVE] 🎉 Abonnement activé: ${subscriber.name} (${subscriber.plan}) via ${whatsappJid}`);
  
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
  createSubscriber,
  confirmPayment,
  activateWithCode,
  getAllSubscribers,
  getStats,
  findSubscriber,
  checkActiveSubscription,
  updateExpiredSubscriptions
};
