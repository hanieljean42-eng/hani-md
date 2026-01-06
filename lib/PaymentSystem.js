/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💰 HANI-MD - SYSTÈME DE PAIEMENT MOBILE MONEY      ║
 * ║     Gestion des paiements Orange/MTN/Wave/Moov Money      ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Fichiers de stockage
const PAYMENTS_FILE = path.join(__dirname, '..', 'DataBase', 'payments.json');
const PAYMENT_CONFIG_FILE = path.join(__dirname, '..', 'DataBase', 'payment_config.json');

// ═══════════════════════════════════════════════════════════
// 💳 CONFIGURATION DES MÉTHODES DE PAIEMENT
// ═══════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  // Numéros pour recevoir les paiements (MODIFIEZ CES NUMÉROS!)
  paymentNumbers: {
    wave: {
      name: "Wave",
      number: "+22550252467", 
      merchantName: "HANI-MD PREMIUM",
      logo: "🟢",
      instructions: "Envoyez l'argent au numéro ci-dessus via Wave"
    },
    moov: {
      name: "Moov Money",
      number: "+22550252467",
      merchantName: "HANI-MD PREMIUM", 
      logo: "🟡",
      instructions: "Envoyez l'argent au numéro ci-dessus via Moov Money"
    }
  },
  
  // Numéro WhatsApp de l'admin pour recevoir les notifications
  adminWhatsApp: "22550252467",
  
  // Plans et prix
  plans: {
    bronze: { name: "Bronze", price: 500, duration: 30, emoji: "🥉" },
    argent: { name: "Argent", price: 1000, duration: 30, emoji: "🥈" },
    or: { name: "Or", price: 2000, duration: 30, emoji: "🥇" },
    diamant: { name: "Diamant", price: 5000, duration: 30, emoji: "💎" },
    lifetime: { name: "Lifetime", price: 15000, duration: -1, emoji: "👑" }
  },
  
  currency: "FCFA"
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
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[PAYMENT] ❌ Erreur écriture:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════

function getConfig() {
  return readJSON(PAYMENT_CONFIG_FILE, DEFAULT_CONFIG);
}

function updateConfig(updates) {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  writeJSON(PAYMENT_CONFIG_FILE, newConfig);
  return newConfig;
}

function setPaymentNumber(method, number, merchantName = null) {
  const config = getConfig();
  if (config.paymentNumbers[method]) {
    config.paymentNumbers[method].number = number;
    if (merchantName) config.paymentNumbers[method].merchantName = merchantName;
    writeJSON(PAYMENT_CONFIG_FILE, config);
    return true;
  }
  return false;
}

function setAdminWhatsApp(number) {
  const config = getConfig();
  config.adminWhatsApp = number.replace(/[^0-9]/g, '');
  writeJSON(PAYMENT_CONFIG_FILE, config);
  return config.adminWhatsApp;
}

// ═══════════════════════════════════════════════════════════
// 🆔 GÉNÉRATION D'ID DE PAIEMENT
// ═══════════════════════════════════════════════════════════

function generatePaymentId() {
  const prefix = 'PAY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateOrderId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

/**
 * Génère un lien de paiement selon la méthode
 * Wave: Utilise le lien pay.wave.com
 * Moov: Utilise le format USSD
 */
function generatePaymentLink(method, phoneNumber, amount, reference) {
  // Nettoyer le numéro de téléphone (garder uniquement les chiffres)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  
  switch (method.toLowerCase()) {
    case 'wave':
      // Lien Wave - format: https://pay.wave.com/m/NUMERO/MONTANT
      // Ou l'app scheme: wave://send?phone=NUMERO&amount=MONTANT
      return {
        web: `https://pay.wave.com/m/${cleanPhone}`,
        app: `wave://send?phone=${cleanPhone}&amount=${amount}`,
        type: 'wave'
      };
      
    case 'moov':
      // Moov Money - utilise le code USSD pour déclencher le paiement
      // Format: *155*1*NUMERO*MONTANT#
      return {
        web: null, // Moov n'a pas de lien web direct
        ussd: `*155*1*${cleanPhone}*${amount}#`,
        type: 'moov'
      };
      
    default:
      return { web: null, app: null, type: 'unknown' };
  }
}

// ═══════════════════════════════════════════════════════════
// 💳 GESTION DES PAIEMENTS
// ═══════════════════════════════════════════════════════════

/**
 * Crée une nouvelle demande de paiement
 */
function createPaymentRequest(clientPhone, plan, paymentMethod, clientName = null, clientEmail = null) {
  const config = getConfig();
  const planInfo = config.plans[plan.toLowerCase()];
  
  if (!planInfo) {
    return { success: false, error: "Plan invalide" };
  }
  
  const methodInfo = config.paymentNumbers[paymentMethod.toLowerCase()];
  if (!methodInfo) {
    return { success: false, error: "Méthode de paiement invalide" };
  }
  
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  
  const payment = {
    paymentId,
    orderId,
    clientPhone: clientPhone.replace(/[^0-9]/g, ''),
    clientName: clientName || `Client ${paymentId}`,
    clientEmail,
    plan: plan.toUpperCase(),
    planName: planInfo.name,
    planEmoji: planInfo.emoji,
    amount: planInfo.price,
    currency: config.currency,
    duration: planInfo.duration,
    paymentMethod: paymentMethod.toLowerCase(),
    paymentMethodName: methodInfo.name,
    paymentNumber: methodInfo.number,
    status: 'pending', // pending, completed, rejected, expired
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expire dans 24h
    transactionId: null,
    completedAt: null,
    completedBy: null,
    notes: null
  };
  
  payments.pending.push(payment);
  writeJSON(PAYMENTS_FILE, payments);
  
  console.log(`[PAYMENT] 💳 Nouvelle demande: ${paymentId} (${planInfo.name} - ${planInfo.price} ${config.currency})`);
  
  // Générer le lien de paiement
  const paymentLink = generatePaymentLink(paymentMethod, methodInfo.number, planInfo.price, orderId);
  
  return {
    success: true,
    paymentId,
    orderId,
    amount: planInfo.price,
    currency: config.currency,
    plan: planInfo,
    paymentMethod: methodInfo,
    paymentNumber: methodInfo.number,
    paymentLink: paymentLink,
    instructions: `
📱 *INSTRUCTIONS DE PAIEMENT*

💰 Montant: *${planInfo.price} ${config.currency}*
📋 Plan: *${planInfo.emoji} ${planInfo.name}*
🆔 Référence: *${orderId}*

━━━━━━━━━━━━━━━━━━━━━
${methodInfo.logo} *${methodInfo.name}*
📞 Numéro: *${methodInfo.number}*
👤 Nom: ${methodInfo.merchantName}
━━━━━━━━━━━━━━━━━━━━━

📝 *IMPORTANT:*
1. Envoyez exactement ${planInfo.price} ${config.currency}
2. Mentionnez la référence: ${orderId}
3. Après paiement, votre compte sera activé sous 5 minutes

⏱️ Cette demande expire dans 24 heures.
    `.trim()
  };
}

/**
 * Confirme un paiement (par l'admin)
 */
function confirmPayment(paymentId, transactionId = null, adminNotes = null) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  
  const index = payments.pending.findIndex(p => p.paymentId === paymentId || p.orderId === paymentId);
  if (index === -1) {
    return { success: false, error: "Paiement non trouvé" };
  }
  
  const payment = payments.pending.splice(index, 1)[0];
  payment.status = 'completed';
  payment.transactionId = transactionId;
  payment.completedAt = new Date().toISOString();
  payment.notes = adminNotes;
  
  payments.completed.push(payment);
  writeJSON(PAYMENTS_FILE, payments);
  
  console.log(`[PAYMENT] ✅ Paiement confirmé: ${paymentId}`);
  
  return {
    success: true,
    payment,
    message: `Paiement ${payment.planEmoji} ${payment.planName} confirmé pour ${payment.clientPhone}`
  };
}

/**
 * Rejette un paiement
 */
function rejectPayment(paymentId, reason = null) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  
  const index = payments.pending.findIndex(p => p.paymentId === paymentId || p.orderId === paymentId);
  if (index === -1) {
    return { success: false, error: "Paiement non trouvé" };
  }
  
  const payment = payments.pending.splice(index, 1)[0];
  payment.status = 'rejected';
  payment.rejectedAt = new Date().toISOString();
  payment.rejectionReason = reason;
  
  payments.rejected.push(payment);
  writeJSON(PAYMENTS_FILE, payments);
  
  console.log(`[PAYMENT] ❌ Paiement rejeté: ${paymentId}`);
  
  return { success: true, payment };
}

/**
 * Liste les paiements en attente
 */
function getPendingPayments() {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  return payments.pending.filter(p => {
    // Filtrer les expiré
    if (new Date(p.expiresAt) < new Date()) {
      p.status = 'expired';
      return false;
    }
    return true;
  });
}

/**
 * Liste tous les paiements complétés
 */
function getCompletedPayments(limit = 50) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  return payments.completed.slice(-limit).reverse();
}

/**
 * Obtient un paiement par ID
 */
function getPayment(paymentId) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  
  // Chercher dans pending
  let payment = payments.pending.find(p => p.paymentId === paymentId || p.orderId === paymentId);
  if (payment) return { ...payment, found: true };
  
  // Chercher dans completed
  payment = payments.completed.find(p => p.paymentId === paymentId || p.orderId === paymentId);
  if (payment) return { ...payment, found: true };
  
  // Chercher dans rejected
  payment = payments.rejected.find(p => p.paymentId === paymentId || p.orderId === paymentId);
  if (payment) return { ...payment, found: true };
  
  return null;
}

/**
 * Obtient un paiement par Order ID
 */
function getPaymentByOrderId(orderId) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  
  // Chercher dans toutes les listes
  const allPayments = [...payments.pending, ...payments.completed, ...payments.rejected];
  return allPayments.find(p => p.orderId === orderId || p.paymentId === orderId);
}

/**
 * Obtient les paiements par numéro de téléphone
 */
function getPaymentsByPhone(phone) {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  const allPayments = [...payments.pending, ...payments.completed, ...payments.rejected];
  return allPayments.filter(p => p.clientPhone && p.clientPhone.includes(cleanPhone));
}

/**
 * Statistiques des paiements
 */
function getPaymentStats() {
  const payments = readJSON(PAYMENTS_FILE, { pending: [], completed: [], rejected: [] });
  const config = getConfig();
  
  let totalRevenue = 0;
  let todayRevenue = 0;
  let monthRevenue = 0;
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  
  const byPlan = {};
  const byMethod = {};
  const planBreakdown = {
    bronze: { count: 0, revenue: 0 },
    argent: { count: 0, revenue: 0 },
    or: { count: 0, revenue: 0 },
    diamant: { count: 0, revenue: 0 },
    lifetime: { count: 0, revenue: 0 }
  };
  
  for (const payment of payments.completed) {
    const amount = payment.amount || 0;
    totalRevenue += amount;
    
    if (payment.completedAt?.startsWith(today)) {
      todayRevenue += amount;
    }
    if (payment.completedAt?.startsWith(month)) {
      monthRevenue += amount;
    }
    
    const plan = (payment.plan || 'UNKNOWN').toLowerCase();
    byPlan[plan] = (byPlan[plan] || 0) + 1;
    
    if (planBreakdown[plan]) {
      planBreakdown[plan].count++;
      planBreakdown[plan].revenue += amount;
    }
    
    const method = payment.paymentMethodName || 'Unknown';
    byMethod[method] = (byMethod[method] || 0) + 1;
  }
  
  return {
    totalPayments: payments.completed.length,
    pendingPayments: payments.pending.length,
    rejectedPayments: payments.rejected.length,
    totalRevenue,
    todayRevenue,
    monthRevenue,
    currency: config.currency,
    byPlan,
    byMethod,
    planBreakdown
  };
}

// ═══════════════════════════════════════════════════════════
// 📱 NOTIFICATIONS WHATSAPP
// ═══════════════════════════════════════════════════════════

/**
 * Génère le message de notification pour l'admin
 */
function generateAdminNotification(payment) {
  return `
🔔 *NOUVELLE DEMANDE DE PAIEMENT*

━━━━━━━━━━━━━━━━━━━━━
💰 *Montant:* ${payment.amount} ${payment.currency}
📋 *Plan:* ${payment.planEmoji} ${payment.planName}
🆔 *Référence:* ${payment.orderId}
━━━━━━━━━━━━━━━━━━━━━

👤 *Client:*
📞 Téléphone: +${payment.clientPhone}
📧 Email: ${payment.clientEmail || 'Non fourni'}
👤 Nom: ${payment.clientName}

💳 *Méthode:* ${payment.paymentMethodName}
⏱️ *Date:* ${new Date(payment.createdAt).toLocaleString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━
📌 *Pour valider ce paiement:*
Répondez: *.validatepay ${payment.orderId}*

❌ *Pour rejeter:*
Répondez: *.rejectpay ${payment.orderId}*
━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Génère le message de confirmation pour le client
 */
function generateClientConfirmation(payment) {
  const config = getConfig();
  const planInfo = config.plans[payment.plan.toLowerCase()];
  
  let expiryText = 'À VIE';
  if (planInfo && planInfo.duration > 0) {
    const expiryDate = new Date(Date.now() + planInfo.duration * 24 * 60 * 60 * 1000);
    expiryText = expiryDate.toLocaleDateString('fr-FR');
  }
  
  return `
🎉 *PAIEMENT CONFIRMÉ!*

━━━━━━━━━━━━━━━━━━━━━
✅ Votre paiement a été reçu et validé!
━━━━━━━━━━━━━━━━━━━━━

📋 *Détails:*
💰 Montant: ${payment.amount} ${payment.currency}
📦 Plan: ${payment.planEmoji} ${payment.planName}
⏱️ Expire: ${expiryText}
🆔 Référence: ${payment.orderId}

━━━━━━━━━━━━━━━━━━━━━
🚀 *Prochaine étape:*
Connectez votre WhatsApp sur:
👉 ${process.env.BASE_URL || 'http://localhost:3000'}/connect.html

Ou envoyez: *.connect*
━━━━━━━━━━━━━━━━━━━━━

Merci d'avoir choisi HANI-MD Premium! 🙏
  `.trim();
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Config
  getConfig,
  updateConfig,
  setPaymentNumber,
  setAdminWhatsApp,
  DEFAULT_CONFIG,
  
  // Paiements
  createPaymentRequest,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  getCompletedPayments,
  getPayment,
  getPaymentByOrderId,
  getPaymentsByPhone,
  getPaymentStats,
  
  // IDs et liens
  generatePaymentId,
  generateOrderId,
  generatePaymentLink,
  
  // Notifications
  generateAdminNotification,
  generateClientConfirmation
};
