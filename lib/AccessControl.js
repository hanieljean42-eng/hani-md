/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║      🔒 HANI-MD - SYSTÈME DE CONTRÔLE D'ACCÈS V2.0        ║
 * ║   Middleware pour vérifier les permissions des commandes  ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const config = require('../set');
const menuSystem = require('./MenuSystem');

// Fichiers
const SUDO_FILE = path.join(__dirname, '..', 'DataBase', 'sudo.json');
const BAN_FILE = path.join(__dirname, '..', 'DataBase', 'banned.json');
const PREMIUM_FILE = path.join(__dirname, '..', 'DataBase', 'premium_users.json');

// ═══════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════

function readJSON(file, defaultValue = {}) {
  try {
    if (!fs.existsSync(file)) {
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
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 👑 VÉRIFICATION OWNER
// ═══════════════════════════════════════════════════════════

/**
 * Liste des numéros Owner (peuvent tout faire)
 */
const OWNER_NUMBERS = [
  '22550252467',
  config.NUMERO_OWNER?.replace(/[^0-9]/g, '') || '22550252467'
].filter(Boolean);

/**
 * Vérifie si un numéro est le owner
 */
function isOwner(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '').replace('@lid', '');
  return OWNER_NUMBERS.some(owner => cleanJid.includes(owner) || owner.includes(cleanJid));
}

/**
 * Vérifie si un numéro est sudo (admin du bot)
 */
function isSudo(jid) {
  if (isOwner(jid)) return true;
  
  const cleanJid = jid.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '').replace('@lid', '');
  const sudoData = readJSON(SUDO_FILE, { users: [] });
  
  return sudoData.users?.some(sudo => {
    const cleanSudo = sudo.replace(/[^0-9]/g, '');
    return cleanSudo === cleanJid || cleanSudo.includes(cleanJid);
  }) || false;
}

// ═══════════════════════════════════════════════════════════
// 💎 VÉRIFICATION PREMIUM
// ═══════════════════════════════════════════════════════════

/**
 * Vérifie le statut premium d'un utilisateur
 */
function getPremiumStatus(jid) {
  if (isOwner(jid)) {
    return {
      isPremium: true,
      isOwner: true,
      plan: 'OWNER',
      dailyLimit: -1,
      commandsToday: 0,
      expiresAt: null
    };
  }
  
  const cleanJid = jid.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  const premiumData = readJSON(PREMIUM_FILE, {});
  const user = premiumData[cleanJid] || premiumData[jid];
  
  if (!user) {
    return {
      isPremium: false,
      isOwner: false,
      plan: 'FREE',
      dailyLimit: 30,
      commandsToday: 0,
      expiresAt: null
    };
  }
  
  // Vérifier expiration
  if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
    return {
      isPremium: false,
      isOwner: false,
      plan: 'FREE',
      dailyLimit: 30,
      commandsToday: user.dailyUsage || 0,
      expired: true,
      expiredPlan: user.plan
    };
  }
  
  // Définir limite selon plan
  let dailyLimit = 30;
  switch (user.plan?.toUpperCase()) {
    case 'BRONZE': dailyLimit = 100; break;
    case 'ARGENT': dailyLimit = 300; break;
    case 'OR': dailyLimit = -1; break;
    case 'DIAMANT':
    case 'LIFETIME': dailyLimit = -1; break;
    default: dailyLimit = 50;
  }
  
  return {
    isPremium: true,
    isOwner: false,
    plan: user.plan?.toUpperCase() || 'PREMIUM',
    dailyLimit,
    commandsToday: user.dailyUsage || 0,
    expiresAt: user.expiresAt
  };
}

// ═══════════════════════════════════════════════════════════
// 🚫 COMMANDES OWNER ONLY (SENSIBLES)
// ═══════════════════════════════════════════════════════════

/**
 * Commandes réservées au owner uniquement
 */
const OWNER_ONLY_COMMANDS = [
  // Contrôle du bot
  'restart', 'shutdown', 'reboot', 'stop', 'off', 'redemarrer', 'eteindre',
  
  // Administration système
  'broadcast', 'bc', 'diffuser',
  'eval', 'ev', 'evaluate',
  'exec', 'execute', 'shell', 'sh', 'terminal',
  
  // Gestion des utilisateurs
  'ban', 'bannir', 'unban', 'debannir',
  'sudo', 'addsudo', 'rmsudo', 'delsudo',
  'block', 'unblock', 'bloquer', 'debloquer',
  
  // Configuration bot
  'setprefix', 'prefix',
  'setbotname', 'botname', 'setname',
  'setbio', 'bio',
  'setbotpp', 'setpp', 'setpic',
  'mode', 'setmode', 'public', 'private',
  
  // Groupes (certaines actions)
  'leave', 'quit', 'partir', 'leaveall',
  'join', 'rejoindre',
  'allgroups', 'listgroups', 'grouplist',
  
  // Paiements et codes
  'gencode', 'generatecode', 'createcode',
  'activecodes', 'listcodes', 'codes',
  'deletecode', 'rmcode', 'delcode',
  'paiements', 'payments', 'pendingpay',
  'confirmpay', 'validatepay', 'approvepay',
  'rejectpay', 'refusepay', 'denypay',
  'paystats', 'paymentstats', 'revenues',
  'setpaynum', 'setpayment',
  'clients', 'premiumclients', 'clientlist',
  
  // Base de données
  'backup', 'restore', 'resetdb',
  'clearsessions', 'clearcache', 'cleanup',
  'exportdb', 'importdb',
  
  // Debug
  'debug', 'logs', 'errorlog',
  'update', 'gitpull', 'upgrade'
];

/**
 * Commandes premium uniquement (non accessibles aux gratuits)
 */
const PREMIUM_ONLY_COMMANDS = [
  // Téléchargements avancés
  'spotify', 'apk', 'doc', 'mediafire',
  
  // IA avancée
  'imagine', 'dalle', 'gpt4', 'transcribe', 'vision',
  
  // Groupe avancé
  'hidetag', 'antilink', 'antispam', 'antibot', 'antitag',
  'antimention', 'welcome', 'goodbye', 'autorole',
  
  // Premium
  'connect', 'disconnect', 'mysession', 'qrcode',
  
  // Logos et effets
  'logo', 'textpro', 'photooxy', 'ephoto', 'quotly',
  
  // Status
  'autostatus', 'antiviewonce', 'autoview',
  
  // OCR et avancé
  'ocr', 'translate2', 'summarize',
  
  // IMDB et recherche avancée
  'imdb', 'anime', 'manga'
];

/**
 * Commandes toujours accessibles à tous
 */
const FREE_COMMANDS = [
  'menu', 'help', 'aide', 'commands', 'cmd', 'm', 'allmenu', 'liste', 'list', 'cmds',
  'ping', 'p', 'latency', 'ping2', 'p2', 'latence',
  'uptime', 'up', 'runtime', 'uptime2', 'up2', 'runtime2',
  'info', 'botinfo', 'about', 'infobot',
  'alive', 'test', 'online', 'alive2', 'test2', 'online2',
  'speed', 'speedtest',
  'owner', 'dev', 'creator', 'createur', 'owner2',
  'premium', 'myplan', 'monplan', 'plan', 'subscription', 'upgrade', 'redeem', 'activer', 'code',
  'mystats', 'messtats', 'stats',
  'report', 'bug', 'signaler',
  'suggest', 'suggestion', 'idee', 'idea'
];

// ═══════════════════════════════════════════════════════════
// 🔐 VÉRIFICATION D'ACCÈS PRINCIPALE
// ═══════════════════════════════════════════════════════════

/**
 * Vérifie si un utilisateur peut exécuter une commande
 * @param {string} command - Nom de la commande
 * @param {string} jid - JID de l'utilisateur
 * @param {Object} context - Contexte supplémentaire (isAdmin, isGroup, etc.)
 * @returns {Object} { allowed: boolean, reason: string, message: string }
 */
function checkCommandAccess(command, jid, context = {}) {
  const {
    isGroupAdmin = false,
    isGroup = false,
    isBotAdmin = false
  } = context;
  
  const cmdLower = command.toLowerCase().trim();
  
  // 1. Vérifier si l'utilisateur est owner (accès total)
  if (isOwner(jid)) {
    return {
      allowed: true,
      reason: 'owner',
      level: 'owner',
      message: null
    };
  }
  
  // 2. Vérifier si c'est une commande owner-only
  if (OWNER_ONLY_COMMANDS.includes(cmdLower)) {
    return {
      allowed: false,
      reason: 'owner_only',
      level: 'blocked',
      message: `
╭────「 🔐 *ACCÈS REFUSÉ* 」────╮
│
│  ⚠️ Cette commande est
│  réservée au *propriétaire*
│  du bot uniquement.
│
│  📋 Commande: *.${command}*
│
│  💡 Tapez *.menu* pour voir
│  les commandes disponibles.
│
╰──────────────────────────────╯

📞 Contact owner: wa.me/22550252467
⭐ Powered by HANI-MD
`
    };
  }
  
  // 3. Vérifier si c'est une commande gratuite (toujours accessible)
  if (FREE_COMMANDS.includes(cmdLower)) {
    return {
      allowed: true,
      reason: 'free_command',
      level: 'free',
      message: null
    };
  }
  
  // 4. Vérifier le statut premium
  const premiumStatus = getPremiumStatus(jid);
  
  // 5. Vérifier si c'est une commande premium-only
  if (PREMIUM_ONLY_COMMANDS.includes(cmdLower)) {
    if (!premiumStatus.isPremium) {
      return {
        allowed: false,
        reason: 'premium_only',
        level: 'premium',
        message: `
╭────「 💎 *PREMIUM REQUIS* 」────╮
│
│  ⚠️ Cette commande nécessite
│  un abonnement *Premium*.
│
│  📋 Commande: *.${command}*
│
│  ━━━━━━━━━━━━━━━━━━━━━
│
│  🎁 *Nos offres Premium:*
│
│  🥉 Bronze: 500 FCFA/mois
│  🥈 Argent: 1000 FCFA/mois
│  🥇 Or: 2000 FCFA/mois
│  💎 Diamant: 5000 FCFA/mois
│  👑 Lifetime: 15000 FCFA
│
│  ━━━━━━━━━━━━━━━━━━━━━
│
│  💡 Tapez *.premium* pour
│  plus de détails!
│
╰─────────────────────────────────╯

📞 Contact: wa.me/22550252467
⭐ Powered by HANI-MD
`
      };
    }
  }
  
  // 6. Vérifier la limite quotidienne
  if (premiumStatus.dailyLimit !== -1) {
    if (premiumStatus.commandsToday >= premiumStatus.dailyLimit) {
      return {
        allowed: false,
        reason: 'daily_limit',
        level: 'limited',
        message: `
╭────「 ⚠️ *LIMITE ATTEINTE* 」────╮
│
│  Vous avez atteint votre
│  limite quotidienne de commandes.
│
│  📊 ${premiumStatus.commandsToday}/${premiumStatus.dailyLimit} utilisées
│
│  ⏰ Réinitialisation à minuit
│
│  ━━━━━━━━━━━━━━━━━━━━━
│
│  💎 *Passez Premium* pour un
│  accès ILLIMITÉ aux commandes!
│
│  Tapez *.premium*
│
╰──────────────────────────────────╯

⭐ Powered by HANI-MD
`
      };
    }
  }
  
  // 7. Accès autorisé
  return {
    allowed: true,
    reason: 'allowed',
    level: premiumStatus.isPremium ? 'premium' : 'free',
    plan: premiumStatus.plan,
    message: null
  };
}

/**
 * Génère un message de blocage stylisé
 */
function generateBlockMessage(type, details = {}) {
  return menuSystem.generateErrorResponse(type, details);
}

/**
 * Vérifie si un utilisateur est banni
 */
function isBanned(jid) {
  const cleanJid = jid.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  const banData = readJSON(BAN_FILE, { users: [] });
  
  return banData.users?.some(banned => {
    const cleanBanned = typeof banned === 'string' ? 
      banned.replace(/[^0-9]/g, '') : 
      banned.jid?.replace(/[^0-9]/g, '');
    return cleanBanned === cleanJid;
  }) || false;
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Vérifications
  checkCommandAccess,
  isOwner,
  isSudo,
  isBanned,
  getPremiumStatus,
  
  // Listes
  OWNER_ONLY_COMMANDS,
  PREMIUM_ONLY_COMMANDS,
  FREE_COMMANDS,
  OWNER_NUMBERS,
  
  // Utilitaires
  generateBlockMessage
};

console.log('[ACCESS] ✅ AccessControl.js chargé - Contrôle d\'accès v2.0');
