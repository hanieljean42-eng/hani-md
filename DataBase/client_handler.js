/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   HANI-MD - Gestionnaire de Commandes par Client/Plan    ║
 * ║   Chaque client a des commandes selon son abonnement     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// 📊 LIMITES ET DROITS PAR PLAN
// ═══════════════════════════════════════════════════

const PLAN_CONFIG = {
  BRONZE: {
    dailyLimit: 100,
    allowedCategories: ['Général', 'Médias', 'Outils', 'Fun'],
    blockedCommands: ['ia', 'gpt', 'dalle', 'flux', 'gemini', 'chatgpt', 'imagine'],
    planLabel: '🥉 Bronze',
    upgradeMsg: '⬆️ Passez au plan Argent ou supérieur pour accéder à cette commande.'
  },
  ARGENT: {
    dailyLimit: 300,
    allowedCategories: null, // toutes catégories sauf les commandes bloquées
    blockedCommands: ['dalle', 'imagine', 'flux'],
    planLabel: '🥈 Argent',
    upgradeMsg: '⬆️ Passez au plan Or ou supérieur pour accéder à cette commande.'
  },
  OR: {
    dailyLimit: -1,
    allowedCategories: null,
    blockedCommands: [],
    planLabel: '🥇 Or',
    upgradeMsg: ''
  },
  DIAMANT: {
    dailyLimit: -1,
    allowedCategories: null,
    blockedCommands: [],
    planLabel: '💎 Diamant',
    upgradeMsg: ''
  },
  LIFETIME: {
    dailyLimit: -1,
    allowedCategories: null,
    blockedCommands: [],
    planLabel: '👑 Lifetime',
    upgradeMsg: ''
  }
};

// Fichier de comptage des commandes journalières
const USAGE_FILE = path.join(__dirname, 'client_usage.json');

// ═══════════════════════════════════════════════════
// 📈 COMPTEUR D'USAGE JOURNALIER
// ═══════════════════════════════════════════════════

function readUsage() {
  try {
    if (!fs.existsSync(USAGE_FILE)) return {};
    return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch { return {}; }
}

function saveUsage(data) {
  try { fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2)); } catch {}
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getClientUsage(clientId) {
  const usage = readUsage();
  const today = getTodayKey();
  if (!usage[clientId]) usage[clientId] = {};
  if (!usage[clientId][today]) usage[clientId][today] = 0;
  return { usage, today, count: usage[clientId][today] };
}

function incrementUsage(clientId) {
  const { usage, today } = getClientUsage(clientId);
  usage[clientId][today] = (usage[clientId][today] || 0) + 1;
  saveUsage(usage);
  return usage[clientId][today];
}

// ═══════════════════════════════════════════════════
// 🔍 VÉRIFICATION DES DROITS
// ═══════════════════════════════════════════════════

function checkCommandAllowed(clientId, plan, cmdName, cmdCategory) {
  const planKey = (plan || 'BRONZE').toUpperCase();
  const cfg = PLAN_CONFIG[planKey] || PLAN_CONFIG.BRONZE;

  // Commande explicitement bloquée
  if (cfg.blockedCommands.includes(cmdName.toLowerCase())) {
    return { allowed: false, reason: 'blocked', msg: cfg.upgradeMsg };
  }

  // Vérification par catégorie (si restriction de catégories)
  if (cfg.allowedCategories && cmdCategory) {
    const catOk = cfg.allowedCategories.some(c => c.toLowerCase() === cmdCategory.toLowerCase());
    if (!catOk) {
      return { allowed: false, reason: 'category', msg: cfg.upgradeMsg };
    }
  }

  // Vérification limite journalière
  if (cfg.dailyLimit > 0) {
    const { count } = getClientUsage(clientId);
    if (count >= cfg.dailyLimit) {
      return {
        allowed: false,
        reason: 'limit',
        msg: `⏳ Limite journalière atteinte (${cfg.dailyLimit} cmd/jour pour le plan ${cfg.planLabel}).\n\n💡 Tapez .menu pour voir votre plan ou contactez le support.`
      };
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════
// 📩 HANDLER DE MESSAGES POUR UN CLIENT
// ═══════════════════════════════════════════════════

/**
 * Attache le gestionnaire de messages à une session client.
 * @param {Object} sock - Socket Baileys du client
 * @param {string} clientId - ID du client (référence paiement)
 * @param {string} plan - Plan du client (BRONZE, ARGENT, OR, etc.)
 */
function attachMessageHandler(sock, clientId, plan) {
  const PREFIX = process.env.PREFIXE || '.';
  const planKey = (plan || 'BRONZE').toUpperCase();
  const planLabel = PLAN_CONFIG[planKey]?.planLabel || '🥉 Bronze';

  // Import ovlcmd (partagé avec le bot principal)
  let findCommand;
  try {
    findCommand = require('../lib/ovlcmd').findCommand;
  } catch (e) {
    console.error('[CLIENT_HANDLER] ovlcmd non disponible:', e.message);
    return;
  }

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      const body = getTextFromMessage(msg);
      if (!body) return;

      // Ignorer si ne commence pas par le préfixe
      if (!body.startsWith(PREFIX)) return;

      const [rawCmd, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
      const cmdName = (rawCmd || '').toLowerCase();
      const from = msg.key.remoteJid;
      const argsText = args.join(' ');

      if (!cmdName) return;

      // ── Commande spéciale : .plan ──
      if (cmdName === 'plan' || cmdName === 'abonnement') {
        const { count } = getClientUsage(clientId);
        const cfg = PLAN_CONFIG[planKey] || PLAN_CONFIG.BRONZE;
        const limitInfo = cfg.dailyLimit < 0 ? 'Illimité' : `${count}/${cfg.dailyLimit} aujourd'hui`;
        await sock.sendMessage(from, {
          text: `╭━━━━ 💎 MON PLAN HANI-MD ━━━━╮\n┃\n┃ Plan      : ${planLabel}\n┃ Commandes : ${limitInfo}\n┃ Accès     : ${cfg.dailyLimit < 0 ? 'Toutes les commandes' : 'Commandes de base'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        });
        return;
      }

      // ── Chercher la commande dans ovlcmd ──
      const cmdData = findCommand(cmdName);
      if (!cmdData) return; // Commande inconnue, ignorer

      const cmd = cmdData.command;

      // ── Vérifier les droits pour ce plan ──
      const check = checkCommandAllowed(clientId, planKey, cmdName, cmd.category);
      if (!check.allowed) {
        await sock.sendMessage(from, { text: `❌ *Commande non disponible*\n\n${check.msg}` });
        return;
      }

      // ── Incrémenter le compteur ──
      incrementUsage(clientId);

      // ── Construire l'objet hani (contexte bot) ──
      const hani = buildHaniContext(sock, msg, from, args, argsText, planKey);

      // ── Exécuter la commande ──
      await cmdData.handler(hani, msg);

    } catch (e) {
      console.error(`[CLIENT_HANDLER] Erreur client ${clientId}:`, e.message);
    }
  });

  console.log(`[CLIENT_HANDLER] ✅ Handler attaché: ${clientId} (${planLabel})`);
}

// ═══════════════════════════════════════════════════
// 🛠️ UTILITAIRES
// ═══════════════════════════════════════════════════

function getTextFromMessage(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  );
}

function buildHaniContext(sock, msg, from, args, argsText, plan) {
  const isGroup = from.endsWith('@g.us');
  const senderJid = isGroup
    ? (msg.key.participant || msg.key.remoteJid)
    : msg.key.remoteJid;
  const senderNumber = senderJid.split('@')[0];

  return {
    // Fonctions d'envoi
    reply: (text) => sock.sendMessage(from, { text: String(text) }, { quoted: msg }),
    send: (text) => sock.sendMessage(from, { text: String(text) }),
    sendMessage: (jid, content, opts) => sock.sendMessage(jid, content, opts),
    react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),

    // Contexte
    from,
    sender: senderJid,
    senderNumber,
    isGroup,
    msg,
    args,
    argsText,
    text: argsText,
    prefix: process.env.PREFIXE || '.',
    plan,
    clientMode: true, // Indique qu'on est dans une session client

    // Compat avec le système ovlcmd existant
    ovl: sock,
    nomGroupe: '',
    superUsers: [],
    preniumUsers: [],
    dev: [],
    destPrivate: senderJid,
  };
}

// ═══════════════════════════════════════════════════
// 📊 STATS D'USAGE
// ═══════════════════════════════════════════════════

function getUsageStats(clientId) {
  const { count } = getClientUsage(clientId);
  const plan = 'BRONZE'; // placeholder
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.BRONZE;
  return {
    today: count,
    limit: cfg.dailyLimit,
    unlimited: cfg.dailyLimit < 0
  };
}

module.exports = {
  attachMessageHandler,
  checkCommandAllowed,
  getUsageStats,
  PLAN_CONFIG
};
