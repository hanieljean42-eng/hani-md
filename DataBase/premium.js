/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💎 HANI-MD - SYSTÈME PREMIUM V1.0                  ║
 * ║     Gestion des abonnements et codes d'activation         ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Fichiers de stockage
const PREMIUM_FILE = path.join(__dirname, 'premium_users.json');
const CODES_FILE = path.join(__dirname, 'premium_codes.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');

const PENDING_FILE = path.join(__dirname, 'pending_validations.json');
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

// ── Clés MySQL settings pour chaque fichier ──
const MYSQL_KEYS = {
  [PREMIUM_FILE]: 'hani_premium_users',
  [CODES_FILE]: 'hani_premium_codes',
  [TRANSACTIONS_FILE]: 'hani_transactions',
  [PENDING_FILE]: 'hani_pending_validations',
  [SUBSCRIBERS_FILE]: 'hani_subscribers'
};

// ── Persistance : Firebase → MySQL → JSON local (via proxy db.js) ──
const mysqlDB = require('./db');

/**
 * Restaure les fichiers JSON depuis MySQL au démarrage.
 * Appelé une fois au chargement du module.
 */
async function restoreFromMySQL() {
  if (!mysqlDB || !mysqlDB.isConnected()) return;
  for (const [file, key] of Object.entries(MYSQL_KEYS)) {
    try {
      const val = await mysqlDB.getSetting(key);
      if (val) {
        const parsed = JSON.parse(val);
        fs.writeFileSync(file, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`[PREMIUM] ✅ Restauré depuis DB: ${path.basename(file)}`);
      }
    } catch(e) {
      console.log(`[PREMIUM] ⚠️ Restauration DB ${key}: ${e.message}`);
    }
  }
}

// Lancer la restauration dès que le module est chargé
restoreFromMySQL().catch(() => {});

// ═══════════════════════════════════════════════════════════
// 📋 PLANS DISPONIBLES
// ═══════════════════════════════════════════════════════════

const PLANS = {
  gratuit: {
    name: "🆓 Gratuit",
    price: 0,
    dailyLimit: 20,
    features: [
      "✅ Commandes de base",
      "✅ 20 commandes/jour",
      "✅ Stickers simples",
      "❌ Téléchargements limités",
      "❌ IA basique uniquement",
      "❌ Pas de support prioritaire"
    ],
    color: "⚪"
  },
  bronze: {
    name: "🥉 Bronze",
    price: 500,
    dailyLimit: 100,
    duration: 30, // jours
    features: [
      "✅ 100 commandes/jour",
      "✅ Téléchargements audio/vidéo",
      "✅ Stickers avancés",
      "✅ Conversion de fichiers",
      "❌ IA limitée",
      "❌ Support standard"
    ],
    color: "🟤"
  },
  argent: {
    name: "🥈 Argent",
    price: 1000,
    dailyLimit: 300,
    duration: 30,
    features: [
      "✅ 300 commandes/jour",
      "✅ Tous les téléchargements HD",
      "✅ IA complète (GPT, DALL-E)",
      "✅ Gestion de groupe",
      "✅ Anti-spam & protections",
      "✅ Support prioritaire"
    ],
    color: "⚪"
  },
  or: {
    name: "🥇 Or",
    price: 2000,
    dailyLimit: -1, // illimité
    duration: 30,
    features: [
      "✅ Commandes ILLIMITÉES",
      "✅ Toutes les fonctionnalités",
      "✅ IA sans limite",
      "✅ Priorité maximale",
      "✅ Support VIP 24/7",
      "✅ Fonctionnalités bêta"
    ],
    color: "🟡"
  },
  diamant: {
    name: "💎 Diamant",
    price: 5000,
    dailyLimit: -1,
    duration: 30,
    features: [
      "✅ TOUT ILLIMITÉ",
      "✅ Multi-numéros (3 max)",
      "✅ API Access",
      "✅ Bot dédié possible",
      "✅ Support personnel",
      "✅ Fonctionnalités exclusives"
    ],
    color: "💠"
  },
  lifetime: {
    name: "👑 Lifetime",
    price: 15000,
    dailyLimit: -1,
    duration: -1, // à vie
    features: [
      "✅ ACCÈS À VIE",
      "✅ Toutes les fonctionnalités",
      "✅ Mises à jour gratuites",
      "✅ Support VIP permanent",
      "✅ Badge exclusif 👑",
      "✅ Priorité absolue"
    ],
    color: "👑"
  }
};

// Liste des commandes premium par catégorie
const PREMIUM_COMMANDS = {
  free: ['menu', 'ping', 'info', 'help', 'premium', 'myplan', 'owner'],
  bronze: ['play', 'video', 'sticker', 'toimg', 'tts', 'translate'],
  argent: ['gpt', 'dalle', 'imagine', 'antilink', 'antispam', 'welcome', 'goodbye', 'warn', 'kick', 'add'],
  or: ['broadcast', 'eval', 'exec', 'restart', 'update', 'backup'],
  diamant: ['api', 'multibot', 'clone', 'export']
};

// ═══════════════════════════════════════════════════════════
// 📁 FONCTIONS DE STOCKAGE
// ═══════════════════════════════════════════════════════════

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '{}', 'utf8');
      return {};
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    // Backup async vers MySQL si connecté
    const mysqlKey = MYSQL_KEYS[file];
    if (mysqlKey && mysqlDB && mysqlDB.isConnected()) {
      mysqlDB.setSetting(mysqlKey, JSON.stringify(data)).catch(() => {});
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 🔑 GESTION DES CODES D'ACTIVATION
// ═══════════════════════════════════════════════════════════

/**
 * Génère un code d'activation unique
 */
function generateCode(plan, days, createdBy) {
  const codes = readJSON(CODES_FILE);
  const planUpper = (plan || 'BRONZE').toUpperCase();
  const planData = PLANS[planUpper.toLowerCase()] || PLANS.bronze;
  const duration = days || planData?.duration || 30;
  const code = `HANI-${planUpper}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  
  codes[code] = {
    plan: planUpper,
    days: duration,
    createdAt: new Date().toISOString(),
    createdBy,
    used: false,
    usedBy: null,
    usedAt: null
  };
  
  writeJSON(CODES_FILE, codes);
  console.log(`[PREMIUM] ✅ Code généré: ${code} (${planUpper}, ${duration} jours)`);
  
  return {
    success: true,
    code,
    plan: planUpper,
    duration: planUpper === 'LIFETIME' ? 'LIFETIME' : duration
  };
}

/**
 * Vérifie et utilise un code d'activation
 */
function redeemCode(code, userJid) {
  const codes = readJSON(CODES_FILE);
  
  if (!codes[code]) {
    return { success: false, message: "Code invalide ou inexistant." };
  }
  
  if (codes[code].used) {
    return { success: false, message: "Ce code a déjà été utilisé." };
  }
  
  const { plan, days } = codes[code];
  
  // Marquer le code comme utilisé
  codes[code].used = true;
  codes[code].usedBy = userJid;
  codes[code].usedAt = new Date().toISOString();
  writeJSON(CODES_FILE, codes);
  
  // Activer le premium pour l'utilisateur
  const result = activatePremium(userJid, plan.toLowerCase(), days);
  
  if (result.success) {
    // Enregistrer la transaction
    logTransaction(userJid, plan, days, code, 'code_redemption');
    
    return {
      success: true,
      plan: plan.toUpperCase(),
      duration: days,
      expiresAt: result.expiresAt,
      message: `Plan ${plan} activé avec succès!`
    };
  }
  
  return result;
}

/**
 * Liste tous les codes (pour l'owner)
 */
function listCodes(onlyUnused = false) {
  const codes = readJSON(CODES_FILE);
  const result = [];
  
  for (const [code, data] of Object.entries(codes)) {
    if (onlyUnused && data.used) continue;
    result.push({ code, ...data });
  }
  
  return result;
}

/**
 * Supprime un code
 */
function deleteCode(code) {
  const codes = readJSON(CODES_FILE);
  if (codes[code]) {
    delete codes[code];
    writeJSON(CODES_FILE, codes);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 👤 GESTION DES UTILISATEURS PREMIUM
// ═══════════════════════════════════════════════════════════

/**
 * Active le premium pour un utilisateur
 */
function activatePremium(userJid, plan, days) {
  if (!PLANS[plan]) {
    return { success: false, error: "❌ Plan invalide." };
  }
  
  const users = readJSON(PREMIUM_FILE);
  const now = new Date();
  let expiresAt;
  
  if (days === -1 || plan === 'lifetime') {
    expiresAt = null; // À vie
  } else {
    // Si l'utilisateur a déjà un abonnement actif, prolonger
    if (users[userJid] && users[userJid].expiresAt) {
      const currentExpiry = new Date(users[userJid].expiresAt);
      if (currentExpiry > now) {
        expiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }
    } else {
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  
  users[userJid] = {
    plan,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    dailyUsage: 0,
    lastUsageReset: now.toISOString(),
    totalCommands: users[userJid]?.totalCommands || 0,
    badges: users[userJid]?.badges || [],
    extraNumbers: users[userJid]?.extraNumbers || []
  };
  
  // Ajouter badge si lifetime
  if (plan === 'lifetime' && !users[userJid].badges.includes('👑')) {
    users[userJid].badges.push('👑');
  }
  
  writeJSON(PREMIUM_FILE, users);
  
  console.log(`[PREMIUM] ✅ ${userJid} → Plan ${plan} activé (${days === -1 ? 'À VIE' : days + ' jours'})`);
  
  return { 
    success: true, 
    plan: PLANS[plan],
    expiresAt: expiresAt ? expiresAt.toISOString() : 'À VIE',
    message: `✅ Plan ${PLANS[plan].name} activé avec succès!`
  };
}

/**
 * Vérifie le statut premium d'un utilisateur
 */
function getPremiumStatus(userJid) {
  // Normaliser JID multi-device: "2256XXXXXXX:0@s.whatsapp.net" → "2256XXXXXXX@s.whatsapp.net"
  const normalizedJid = (userJid || '').replace(/:\d+@/, '@');
  const users = readJSON(PREMIUM_FILE);
  const user = users[normalizedJid] || users[userJid];
  
  if (!user) {
    return {
      isPremium: false,
      plan: 'FREE',
      planInfo: PLANS.gratuit,
      daysLeft: 0,
      dailyCommands: 0,
      dailyUsage: 0,
      dailyLimit: PLANS.gratuit.dailyLimit,
      expiresAt: null
    };
  }
  
  // Vérifier l'expiration
  if (user.expiresAt) {
    const expiryDate = new Date(user.expiresAt);
    const now = new Date();
    
    if (expiryDate < now) {
      // Abonnement expiré
      return {
        isPremium: false,
        plan: 'FREE',
        planInfo: PLANS.gratuit,
        daysLeft: 0,
        expired: true,
        expiredPlan: user.plan?.toUpperCase(),
        dailyCommands: 0,
        dailyUsage: 0,
        dailyLimit: PLANS.gratuit.dailyLimit,
        expiresAt: null
      };
    }
    
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    const planKey = user.plan?.toLowerCase() || 'gratuit';
    const planData = PLANS[planKey] || PLANS.gratuit;
    
    return {
      isPremium: true,
      plan: user.plan?.toUpperCase() || 'FREE',
      planInfo: planData,
      daysLeft,
      expiresAt: user.expiresAt,
      dailyCommands: user.dailyUsage || 0,
      dailyUsage: user.dailyUsage || 0,
      dailyLimit: planData?.dailyLimit === -1 ? Infinity : (planData?.dailyLimit || 20),
      badges: user.badges || [],
      totalCommands: user.totalCommands || 0
    };
  }
  
  // Lifetime (pas d'expiration)
  const planKey = user.plan?.toLowerCase() || 'lifetime';
  const planData = PLANS[planKey] || PLANS.lifetime;
  
  return {
    isPremium: true,
    plan: user.plan?.toUpperCase() || 'LIFETIME',
    planInfo: planData,
    daysLeft: -1, // À vie
    expiresAt: null,
    dailyCommands: user.dailyUsage || 0,
    dailyUsage: user.dailyUsage || 0,
    dailyLimit: Infinity,
    badges: user.badges || [],
    totalCommands: user.totalCommands || 0
  };
}

/**
 * Vérifie si un utilisateur peut exécuter une commande
 */
function canExecuteCommand(userJid, commandName) {
  const status = getPremiumStatus(userJid);
  const users = readJSON(PREMIUM_FILE);
  
  // Réinitialiser le compteur quotidien si nécessaire
  if (users[userJid]) {
    const lastReset = new Date(users[userJid].lastUsageReset || 0);
    const now = new Date();
    if (lastReset.toDateString() !== now.toDateString()) {
      users[userJid].dailyUsage = 0;
      users[userJid].lastUsageReset = now.toISOString();
      writeJSON(PREMIUM_FILE, users);
    }
  }
  
  // Commandes gratuites accessibles à tous
  if (PREMIUM_COMMANDS.free.includes(commandName.toLowerCase())) {
    return { allowed: true, reason: "free" };
  }
  
  // Vérifier le niveau de plan requis pour la commande
  let requiredPlan = 'gratuit';
  for (const [plan, commands] of Object.entries(PREMIUM_COMMANDS)) {
    if (commands.includes(commandName.toLowerCase())) {
      requiredPlan = plan;
      break;
    }
  }
  
  // Hiérarchie des plans
  const planHierarchy = ['gratuit', 'bronze', 'argent', 'or', 'diamant', 'lifetime'];
  const userPlanIndex = planHierarchy.indexOf(status.plan);
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
  
  if (userPlanIndex < requiredPlanIndex) {
    return { 
      allowed: false, 
      reason: "plan_insufficient",
      requiredPlan,
      currentPlan: status.plan,
      message: `❌ Cette commande nécessite le plan ${PLANS[requiredPlan]?.name || requiredPlan}.\nVotre plan actuel: ${status.planInfo.name}\n\n💡 Utilisez .upgrade pour améliorer votre plan!`
    };
  }
  
  // Vérifier la limite quotidienne
  if (status.dailyLimit !== -1 && status.dailyUsage >= status.dailyLimit) {
    return {
      allowed: false,
      reason: "daily_limit",
      message: `❌ Limite quotidienne atteinte (${status.dailyUsage}/${status.dailyLimit}).\n\n💡 Passez au plan supérieur pour plus de commandes!\nUtilisez .premium pour voir les plans.`
    };
  }
  
  return { allowed: true, reason: "allowed" };
}

/**
 * Incrémente le compteur d'utilisation
 */
function incrementUsage(userJid) {
  const users = readJSON(PREMIUM_FILE);
  
  if (!users[userJid]) {
    users[userJid] = {
      plan: 'gratuit',
      dailyUsage: 1,
      lastUsageReset: new Date().toISOString(),
      totalCommands: 1
    };
  } else {
    users[userJid].dailyUsage = (users[userJid].dailyUsage || 0) + 1;
    users[userJid].totalCommands = (users[userJid].totalCommands || 0) + 1;
  }
  
  writeJSON(PREMIUM_FILE, users);
}

/**
 * Liste tous les utilisateurs premium
 */
function listPremiumUsers() {
  const users = readJSON(PREMIUM_FILE);
  const result = [];
  
  for (const [jid, data] of Object.entries(users)) {
    const planLower = (data.plan || '').toLowerCase();
    if (planLower !== 'gratuit' && planLower !== 'free' && planLower !== '') {
      result.push({
        jid,
        plan: (data.plan || 'FREE').toUpperCase(),
        expiresAt: data.expiresAt,
        activatedAt: data.activatedAt,
        dailyUsage: data.dailyUsage || 0,
        totalCommands: data.totalCommands || 0,
        badges: data.badges || []
      });
    }
  }
  
  return result;
}

/**
 * Révoque le premium d'un utilisateur
 */
function revokePremium(userJid) {
  const users = readJSON(PREMIUM_FILE);
  
  if (users[userJid]) {
    users[userJid].plan = 'gratuit';
    users[userJid].expiresAt = null;
    writeJSON(PREMIUM_FILE, users);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 💰 TRANSACTIONS
// ═══════════════════════════════════════════════════════════

function logTransaction(userJid, plan, days, code, type) {
  const transactions = readJSON(TRANSACTIONS_FILE);
  const id = `TXN-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  
  transactions[id] = {
    userJid,
    plan,
    days,
    code,
    type,
    amount: PLANS[plan]?.price || 0,
    createdAt: new Date().toISOString()
  };
  
  writeJSON(TRANSACTIONS_FILE, transactions);
  return id;
}

function getTransactions(userJid = null) {
  const transactions = readJSON(TRANSACTIONS_FILE);
  
  if (userJid) {
    return Object.entries(transactions)
      .filter(([_, t]) => t.userJid === userJid)
      .map(([id, t]) => ({ id, ...t }));
  }
  
  return Object.entries(transactions).map(([id, t]) => ({ id, ...t }));
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES
// ═══════════════════════════════════════════════════════════

function getStats() {
  const users = readJSON(PREMIUM_FILE);
  const codes = readJSON(CODES_FILE);
  const transactions = readJSON(TRANSACTIONS_FILE);
  
  const stats = {
    totalUsers: Object.keys(users).length,
    totalPremium: 0,
    premiumUsers: 0,
    byPlan: {},
    planDistribution: {},
    totalRevenue: 0,
    totalCodes: Object.keys(codes).length,
    unusedCodes: 0,
    usedCodes: 0
  };
  
  // Compter les utilisateurs par plan
  for (const [jid, user] of Object.entries(users)) {
    if (user.plan && user.plan.toLowerCase() !== 'gratuit' && user.plan.toUpperCase() !== 'FREE') {
      const planUpper = user.plan.toUpperCase();
      stats.totalPremium++;
      stats.premiumUsers++;
      stats.byPlan[planUpper] = (stats.byPlan[planUpper] || 0) + 1;
      stats.planDistribution[planUpper] = (stats.planDistribution[planUpper] || 0) + 1;
    }
  }
  
  // Compter les codes
  for (const code of Object.values(codes)) {
    if (code.used) {
      stats.usedCodes++;
    } else {
      stats.unusedCodes++;
    }
  }
  
  // Calculer les revenus
  for (const txn of Object.values(transactions)) {
    stats.totalRevenue += txn.amount || 0;
  }
  
  return stats;
}

// ═══════════════════════════════════════════════════════════
// 🔧 FONCTIONS SUPPLÉMENTAIRES / ALIAS
// ═══════════════════════════════════════════════════════════

/**
 * Alias de getPremiumStatus pour compatibilité
 */
function getPremiumInfo(userJid) {
  return getPremiumStatus(userJid);
}

/**
 * Alias de listPremiumUsers pour compatibilité
 */
function getAllPremiumUsers() {
  return listPremiumUsers();
}

/**
 * Retourne uniquement les codes non utilisés
 */
function getUnusedCodes() {
  return listCodes(true);
}

/**
 * Alias de activatePremium pour compatibilité
 */
function addPremium(userJid, plan, days) {
  const planLower = plan.toLowerCase();
  return activatePremium(userJid, planLower, days);
}

/**
 * Alias de revokePremium pour compatibilité
 */
function removePremium(userJid) {
  const result = revokePremium(userJid);
  return { success: result, message: result ? "✅ Premium révoqué" : "❌ Utilisateur non trouvé" };
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Plans
  PLANS,
  PREMIUM_COMMANDS,
  
  // Codes
  generateCode,
  redeemCode,
  listCodes,
  deleteCode,
  getUnusedCodes,
  
  // Utilisateurs
  activatePremium,
  addPremium,
  getPremiumStatus,
  getPremiumInfo,
  canExecuteCommand,
  incrementUsage,
  listPremiumUsers,
  getAllPremiumUsers,
  revokePremium,
  removePremium,
  
  // Transactions
  logTransaction,
  getTransactions,
  
  // Stats
  getStats,

  // Utilitaires MySQL persistence (pour autres modules)
  writeJSON,
  restoreFromMySQL,
  MYSQL_KEYS
};
