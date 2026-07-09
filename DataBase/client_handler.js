/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   HANI-MD - Gestionnaire de Commandes par Client/Plan    ║
 * ║   Chaque client a des commandes selon son abonnement     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const fs   = require('fs');
const path = require('path');
const { getSelfJid, makeSelfSock, deleteCommandMessage } = require('../lib/selfRedirect');

// Numéro du propriétaire du bot (accès illimité total)
const OWNER_NUMBER = (process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/\D/g, '');

// ═══════════════════════════════════════════════════
// 📊 LIMITES ET DROITS PAR PLAN
// ═══════════════════════════════════════════════════

const PLAN_CONFIG = {
  OWNER: {
    dailyLimit: -1,
    allowedCategories: null,
    blockedCommands: [],
    planLabel: '👑 Owner',
    upgradeMsg: ''
  },
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

function isOwnerNumber(number) {
  return (number || '').replace(/\D/g, '') === OWNER_NUMBER;
}

function checkCommandAllowed(clientId, plan, cmdName, cmdCategory, senderNumber) {
  // L'owner a toujours accès à tout
  if (isOwnerNumber(senderNumber)) return { allowed: true };

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
  const cfg = PLAN_CONFIG[planKey] || PLAN_CONFIG.BRONZE;
  const planLabel = cfg.planLabel || '🥉 Bronze';
  console.log(`[CLIENT_HANDLER] 📋 Plan actif pour ${clientId}: ${planKey} (${planLabel})`);  

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
      const selfJid = getSelfJid(sock);

      if (!cmdName) return;

      // ── Commande spéciale : .plan ──
      if (cmdName === 'plan' || cmdName === 'abonnement') {
        await deleteCommandMessage(sock, msg);
        const { count } = getClientUsage(clientId);
        const cfg = PLAN_CONFIG[planKey] || PLAN_CONFIG.BRONZE;
        const limitInfo = cfg.dailyLimit < 0 ? 'Illimité' : `${count}/${cfg.dailyLimit} aujourd'hui`;
        await sock.sendMessage(selfJid, {
          text: `╭━━━━ 💎 MON PLAN HANI-MD ━━━━╮\n┃\n┃ Plan      : ${planLabel}\n┃ Commandes : ${limitInfo}\n┃ Accès     : ${cfg.dailyLimit < 0 ? 'Toutes les commandes' : 'Commandes de base'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        });
        return;
      }

      // ── Chercher la commande dans ovlcmd ──
      const cmdData = findCommand(cmdName);
      if (!cmdData) return; // Commande inconnue, ignorer

      const cmd = cmdData.command;

      // ── Supprimer le message de commande dans le chat d'origine ──
      await deleteCommandMessage(sock, msg);

      // ── Vérifier les droits pour ce plan ──
      const isGroup = from.endsWith('@g.us');
      const senderJid = isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid;
      const senderNum = senderJid.split('@')[0];

      const check = checkCommandAllowed(clientId, planKey, cmdName, cmd.category, senderNum);
      if (!check.allowed) {
        await sock.sendMessage(selfJid, { text: `❌ *Commande non disponible*\n\n${check.msg}` });
        return;
      }

      // ── Incrémenter le compteur (sauf owner) ──
      if (!isOwnerNumber(senderNum)) incrementUsage(clientId);

      // ── Construire les options (même format que start.js) ──
      const ownerJid = OWNER_NUMBER + '@s.whatsapp.net';
      const isOwner_ = isOwnerNumber(senderNum);
      const effectivePlan = isOwner_ ? 'OWNER' : planKey;

      let isAdmin = false;
      let isBotAdmin = false;
      let groupName = null;
      if (isGroup) {
        try {
          const meta = await sock.groupMetadata(from);
          const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
          const admins = meta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);
          isAdmin = admins.includes(senderJid);
          isBotAdmin = admins.includes(botJid);
          groupName = meta.subject;
        } catch {}
      }

      const repondre = (text) => sock.sendMessage(selfJid, { text: String(text) });

      const options = {
        repondre,
        arg: args,
        args,
        texte: argsText,
        argsText,
        ms: msg,
        superUser: isOwner_,
        isOwner: isOwner_,
        auteurMessage: senderJid,
        auteur_Msg: senderJid,
        from,
        isGroup,
        verif_Groupe: isGroup,
        admin_Groupe: isBotAdmin,
        verif_Ovl_Admin: isBotAdmin,
        verif_Admin: isAdmin,
        nomGroupe: groupName,
        nomAuteurMessage: msg.pushName || senderNum,
        msgRepondu: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
        auteurMsgRepondu: msg.message?.extendedTextMessage?.contextInfo?.participant,
        idBot: sock.user?.id?.split(':')[0],
        superUsers: [ownerJid],
        preniumUsers: [ownerJid],
        dev: [ownerJid],
        prefixe: PREFIX,
        destPrivate: senderJid,
        // Champs spécifiques client sessions
        clientPlan: effectivePlan,
        plan: effectivePlan,
        clientMode: true,
      };

      // ── Exécuter la commande (socket redirigé : réponses → discussion avec soi-même) ──
      await cmdData.handler(makeSelfSock(sock, from), msg, options);

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

function buildHaniContext(sock, msg, from, args, argsText, plan, senderNum) {
  const isGroup = from.endsWith('@g.us');
  const senderJid = isGroup
    ? (msg.key.participant || msg.key.remoteJid)
    : msg.key.remoteJid;
  const senderNumber = senderNum || senderJid.split('@')[0];
  const ownerJid = OWNER_NUMBER + '@s.whatsapp.net';
  const isOwner = isOwnerNumber(senderNumber);

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
    isOwner,
    msg,
    args,
    argsText,
    text: argsText,
    prefix: process.env.PREFIXE || '.',
    plan: isOwner ? 'OWNER' : plan,
    clientMode: true,

    // Compat avec le système ovlcmd existant
    ovl: sock,
    nomGroupe: '',
    superUsers: [ownerJid],
    preniumUsers: [ownerJid],
    dev: [ownerJid],
    destPrivate: senderJid,
  };
}

// ═══════════════════════════════════════════════════
// 📊 STATS D'USAGE
// ═══════════════════════════════════════════════════

function getUsageStats(clientId, plan) {
  const { count } = getClientUsage(clientId);
  const planKey = (plan || 'BRONZE').toUpperCase();
  const cfg = PLAN_CONFIG[planKey] || PLAN_CONFIG.BRONZE;
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
