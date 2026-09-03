/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        📋 HANI-MD - MENU DYNAMIQUE V3.0                   ║
 * ║   Lit toutes les commandes réelles, groupées par catégorie║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd, getCommands } = require('../lib/ovlcmd');
const config = require('../set');
const fs = require('fs');
const path = require('path');

// Fichiers de données
const PREMIUM_USERS_FILE = path.join(__dirname, '..', 'DataBase', 'users_pro.json');
const USAGE_FILE = path.join(__dirname, '..', 'DataBase', 'command_usage.json');

// ═══════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════

/**
 * Récupère les infos utilisateur pour le menu
 */
function getUserInfo(phone, isOwner = false, planOverride = null) {
  const ownerNumber = (config.NUMERO_OWNER || config.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  
  const userIsOwner = isOwner || cleanPhone === ownerNumber || 
                      ownerNumber.includes(cleanPhone) || 
                      cleanPhone.includes(ownerNumber);

  // Si le plan est explicitement fourni (sessions client), l'utiliser directement
  if (planOverride || userIsOwner) {
    let plan = userIsOwner ? 'OWNER' : planOverride.toUpperCase();
    const LIMITS = { OWNER: -1, LIFETIME: -1, DIAMANT: -1, OR: -1, ARGENT: 300, BRONZE: 100, FREE: 30 };
    const dailyLimit = LIMITS[plan] ?? 30;
    return {
      phone: cleanPhone,
      name: `User_${cleanPhone.slice(-4)}`,
      plan,
      isOwner: userIsOwner,
      isPremium: plan !== 'FREE',
      commandsToday: 0,
      dailyLimit,
      totalCommands: 0
    };
  }

  // Sinon : lire depuis users_pro.json (bot principal)
  let premiumData = {};
  try {
    if (fs.existsSync(PREMIUM_USERS_FILE)) {
      premiumData = JSON.parse(fs.readFileSync(PREMIUM_USERS_FILE, 'utf8'));
    }
  } catch (e) {}

  let usageData = {};
  try {
    if (fs.existsSync(USAGE_FILE)) {
      usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    }
  } catch (e) {}

  const userPremium = premiumData[cleanPhone] || premiumData[phone] || null;
  const userUsage = usageData[cleanPhone] || { today: 0, total: 0, lastReset: null };
  
  let isPremium = false;
  let plan = 'FREE';
  let dailyLimit = 30;

  if (userPremium && (userPremium.expiresAt === -1 || new Date(userPremium.expiresAt) > new Date())) {
    isPremium = true;
    plan = (userPremium.plan || 'PREMIUM').toUpperCase();
    const LIMITS = { LIFETIME: -1, DIAMANT: -1, OR: -1, PREMIUM: -1, ARGENT: 300, BRONZE: 100 };
    dailyLimit = LIMITS[plan] ?? 50;
  }

  const today = new Date().toDateString();
  if (userUsage.lastReset !== today) { userUsage.today = 0; userUsage.lastReset = today; }

  return {
    phone: cleanPhone,
    name: userPremium?.name || `User_${cleanPhone.slice(-4)}`,
    plan,
    isOwner: false,
    isPremium,
    commandsToday: userUsage.today || 0,
    dailyLimit,
    totalCommands: userUsage.total || 0
  };
}

/**
 * Incrémenter le compteur d'utilisation
 */
function incrementUsage(phone) {
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  
  let usageData = {};
  try {
    if (fs.existsSync(USAGE_FILE)) {
      usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    }
  } catch (e) {}

  const today = new Date().toDateString();
  
  if (!usageData[cleanPhone]) {
    usageData[cleanPhone] = { today: 0, total: 0, lastReset: today };
  }

  if (usageData[cleanPhone].lastReset !== today) {
    usageData[cleanPhone].today = 0;
    usageData[cleanPhone].lastReset = today;
  }

  usageData[cleanPhone].today++;
  usageData[cleanPhone].total++;

  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usageData, null, 2), 'utf8');
  } catch (e) {}

  return usageData[cleanPhone];
}

// ═══════════════════════════════════════════════════════════
// 📋 GROUPES DE COMMANDES — mappe clé → classes réelles
// ═══════════════════════════════════════════════════════════

const GROUPS = {
  telechargement: {
    emoji: '📥', name: 'Téléchargement',
    desc: 'YouTube, TikTok, Instagram, Facebook, Spotify...',
    classes: ['Téléchargement'],
    minPlan: 'BRONZE'
  },
  ia: {
    emoji: '🤖', name: 'Intelligence Artificielle',
    desc: 'GPT, Gemini, Code, Résumé, Histoire, Quiz IA...',
    classes: ['IA'],
    minPlan: 'ARGENT'
  },
  image: {
    emoji: '🖼️', name: 'Image & Logos',
    desc: 'Blur, Grayscale, Enhance, 23 styles de logos...',
    classes: ['Image', 'Logo'],
    minPlan: 'ARGENT'
  },
  fun: {
    emoji: '🎭', name: 'Fun & Jeux',
    desc: 'Blackjack, Quiz, 8Ball, Blagues, Réactions...',
    classes: ['Fun', 'Games', 'Réaction'],
    minPlan: 'FREE'
  },
  outils: {
    emoji: '🛠️', name: 'Outils & Conversion',
    desc: 'Sticker, QR, Traducteur, Calculatrice, Base64...',
    classes: ['Outils', 'Conversion', 'Pro'],
    minPlan: 'BRONZE'
  },
  contacts: {
    emoji: '📇', name: 'Contacts',
    desc: 'VCard, QR, Lien, Mass PM, Invitations...',
    classes: ['Contacts'],
    minPlan: 'BRONZE'
  },
  audio: {
    emoji: '🎵', name: 'Audio FX',
    desc: 'Bass, Reverb, 8D, Robot, Slow, Fast, Chipmunk...',
    classes: ['Audio FX'],
    minPlan: 'BRONZE'
  },
  status: {
    emoji: '📷', name: 'Statuts',
    desc: 'Poster statuts texte/image/vidéo, Auto-vue...',
    classes: ['Status'],
    minPlan: 'BRONZE'
  },
  groupe: {
    emoji: '👥', name: 'Gestion Groupe',
    desc: 'Kick, Add, Tagall, Antilink, Promote, Demote...',
    classes: ['Groupe'],
    minPlan: 'BRONZE'
  },
  recherche: {
    emoji: '🔍', name: 'Recherche',
    desc: 'Google, Wikipedia, Météo, Paroles, Films...',
    classes: ['Recherche'],
    minPlan: 'BRONZE'
  },
  economie: {
    emoji: '💰', name: 'Économie & Parrainage',
    desc: 'Daily, Balance, Gamble, Shop, Parrainage...',
    classes: ['Economy', '💰 Économie', 'Parrainage'],
    minPlan: 'BRONZE'
  },
  confidentialite: {
    emoji: '🔒', name: 'Confidentialité',
    desc: 'Ghost, Block, Typing, ReadReceipts, Privacy...',
    classes: ['Confidentialité', '🔒 Confidentialité', '🔒 Sécurité'],
    minPlan: 'BRONZE'
  },
  espionnage: {
    emoji: '🕵️', name: 'Espionnage & Surveillance',
    desc: 'ViewBlocked, AutoSpy, VueUnique (.haniel/.mounira), Spy...',
    classes: ['🕵️ Espionnage', 'Espionnage'],
    minPlan: 'OWNER'
  },
  systeme: {
    emoji: '⚙️', name: 'Système & Support',
    desc: 'Ping, Uptime, Info, Ticket, FAQ, Tutorial...',
    classes: ['Système', 'Tutorial', 'Support'],
    minPlan: 'FREE'
  },
  premium: {
    emoji: '💎', name: 'Abonnements',
    desc: 'Activer, Tarifs, MonPlan, Payer, Confirmer...',
    classes: ['Premium', '💎 Premium'],
    minPlan: 'FREE'
  },
  avance: {
    emoji: '🚀', name: 'Fonctions Avancées',
    desc: 'Autoreply, Newsletter, Notes, Feedback, Sondage...',
    classes: ['Autoreply', '🎯 Automatisation', 'Configuration', 'Engagement',
              'Feedback', 'Newsletter', '📝 Notes', '📊 Analytics',
              '📢 Diffusion', '🔍 Info', '🔧 Utilitaires'],
    minPlan: 'ARGENT'
  },
  owner: {
    emoji: '👑', name: 'Administration Owner',
    desc: 'Broadcast, Shell, Restart, Clients, Codes, Sudo...',
    classes: ['Owner', '👮 Modération', '👤 Profil'],
    minPlan: 'OWNER'
  }
};

const PLAN_ORDER = ['FREE', 'BRONZE', 'ARGENT', 'OR', 'DIAMANT', 'LIFETIME', 'OWNER'];
const PLAN_BADGES = {
  FREE: '🆓 GRATUIT', BRONZE: '🥉 BRONZE', ARGENT: '🥈 ARGENT',
  OR: '🥇 OR', DIAMANT: '💎 DIAMANT', LIFETIME: '♾️ LIFETIME', OWNER: '🔱 PROPRIÉTAIRE'
};

function planAllows(userPlan, minPlan) {
  const ui = PLAN_ORDER.indexOf(userPlan);
  const mi = PLAN_ORDER.indexOf(minPlan);
  return ui >= mi;
}

// ─── Obtenir les commandes d'un groupe ──────────────────────
function getCmdsForGroup(groupKey) {
  const group = GROUPS[groupKey];
  if (!group) return [];
  const all = getCommands();
  return all.filter(c => group.classes.includes(c.category));
}

// ─── Construire le texte d'un sous-menu ─────────────────────
function buildSubMenu(groupKey, prefix) {
  const group = GROUPS[groupKey];
  const cmds = getCmdsForGroup(groupKey);
  if (!cmds.length) return null;

  let txt = `╭─────「 ${group.emoji} *${group.name.toUpperCase()}* 」─────╮\n│\n`;
  for (const c of cmds) {
    const aliases = c.aliases?.length ? ` _(${c.aliases.slice(0,2).join(', ')})_` : '';
    txt += `│ ${c.reaction || '▸'} *${prefix}${c.name}*${aliases}\n│   └ ${c.description}\n│\n`;
  }
  txt += `╰─────────────────────────────╯\n`;
  txt += `_Total: ${cmds.length} commandes_`;
  return txt;
}

// ═══════════════════════════════════════════════════════════
// 📋 COMMANDE MENU PRINCIPAL
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "menu",
  classe: "Système",
  react: "📋",
  desc: "Afficher le menu principal ou un sous-menu de catégorie",
  alias: ["m", "allmenu", "commands"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage, clientPlan, plan: optPlan, isOwner } = {}) => {
  try {
    const planOverride = clientPlan || optPlan || null;
    const ownerOverride = isOwner || superUser || false;
    const userInfo = getUserInfo(auteurMessage, ownerOverride, planOverride);
    const prefix = config.PREFIX || config.PREFIXE || ".";
    const plan = userInfo.plan.toUpperCase();

    // ── Sous-menu : .menu <groupe> ──────────────────────────
    if (arg[0]) {
      const key = arg[0].toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a');
      // Recherche flexible (telechargement, ia, fun, etc.)
      const match = Object.keys(GROUPS).find(k =>
        k === key || k.startsWith(key) || GROUPS[k].name.toLowerCase().includes(key)
      );
      if (!match) {
        const list = Object.keys(GROUPS).map(k => `*${prefix}menu ${k}*`).join(' • ');
        return repondre(`❌ Groupe "${arg[0]}" introuvable.\n\n📋 Groupes disponibles:\n${list}`);
      }
      const subTxt = buildSubMenu(match, prefix);
      if (!subTxt) return repondre(`❌ Aucune commande dans ce groupe.`);
      return repondre(subTxt);
    }

    // ── Menu principal ──────────────────────────────────────
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600), mn = Math.floor((uptime % 3600) / 60);
    const totalCmds = getCommands().length;

    let groupLines = '';
    for (const [key, grp] of Object.entries(GROUPS)) {
      const allowed = userInfo.isOwner || planAllows(plan, grp.minPlan);
      const count = getCmdsForGroup(key).length;
      if (allowed) {
        groupLines += `│ ${grp.emoji} *${prefix}menu ${key}* (${count} cmds)\n│    └ _${grp.desc}_\n│\n`;
      } else {
        groupLines += `│ 🔒 ${grp.emoji} ${grp.name} — _Plan ${grp.minPlan} requis_\n│\n`;
      }
    }

    const mainMenu =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    🌟 *HANI-MD V2.6.1* 🌟    
┃  Bot WhatsApp Intelligent    
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─────「 👤 *PROFIL* 」─────╮
│ 🏷️ Plan: *${PLAN_BADGES[plan] || plan}*
│ 📊 Cmds: ${userInfo.dailyLimit === -1 ? '∞ Illimité' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
│ 🗂️ Total bot: *${totalCmds} commandes*
│ ⏱️ Uptime: ${h}h ${mn}m
╰─────────────────────────────╯

╭─────「 📋 *CATÉGORIES* 」─────╮
│
${groupLines}╰─────────────────────────────╯

╭─────「 ℹ️ *INFO* 」─────╮
│ 💡 *${prefix}menu <groupe>* → voir les cmds
│ ❓ *${prefix}aide <cmd>* → aide d'une commande
│ 💳 *${prefix}tarifs* → plans & prix
│ 📞 Support: wa.me/22550252467
╰─────────────────────────────╯

⭐ _Powered by HANI-MD_`;

    await repondre(mainMenu);

  } catch (error) {
    console.error("[MENU]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ❓ COMMANDE AIDE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "aide",
  classe: "Système",
  react: "❓",
  desc: "Obtenir de l'aide sur une commande",
  alias: ["help", "h"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const prefix = config.PREFIX || config.PREFIXE || ".";
    
    if (!arg[0]) {
      const helpMenu = `
╭────「 ❓ *AIDE HANI-MD* 」────╮
│
│  🤖 *Bot WhatsApp Multifonction*
│
│  📋 *${prefix}menu* → Menu complet
│  ❓ *${prefix}aide <cmd>* → Aide commande
│
╰─────────────────────────────╯

🔍 *CATÉGORIES:*
• ${prefix}menu download → Téléchargement
• ${prefix}menu ia → Intelligence Artificielle
• ${prefix}menu fun → Divertissement
• ${prefix}menu outils → Outils
• ${prefix}menu groupe → Gestion groupes
• ${prefix}menu systeme → Système

💡 *Exemple:* ${prefix}aide play

🌐 Support: wa.me/22550252467
`;
      return repondre(helpMenu);
    }
    
    const cmdName = arg[0].replace('.', '').toLowerCase();
    
    // Chercher dans les commandes enregistrées
    const { getCommands } = require('../lib/ovlcmd');
    const commands = getCommands();
    const cmd = commands.find(c => 
      c.name.toLowerCase() === cmdName || 
      (c.aliases && c.aliases.includes(cmdName))
    );
    
    if (!cmd) {
      return repondre(`❌ Commande "${cmdName}" non trouvée.\n\nTapez *${prefix}menu* pour voir les commandes.`);
    }
    
    const helpText = `
╭────「 ❓ *AIDE* 」────╮
│
│ 📌 Commande: *${prefix}${cmd.name}*
│ 📁 Catégorie: *${cmd.category}*
│ 📝 Description: ${cmd.description}
│ ${cmd.aliases?.length ? `📎 Alias: ${cmd.aliases.map(a => prefix + a).join(', ')}` : ''}
│ ${cmd.usage ? `💡 Usage: ${cmd.usage}` : ''}
│
╰─────────────────────╯

⭐ Powered by HANI-MD
`;
    
    repondre(helpText);

  } catch (error) {
    console.error("[HELP]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ℹ️ COMMANDE INFO BOT
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "info",
  classe: "Système",
  react: "ℹ️",
  desc: "Informations sur le bot",
  alias: ["botinfo", "about"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const uptime = process.uptime();
    
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${days > 0 ? days + 'j ' : ''}${hours}h ${minutes}m`;
    
    const { getCommands } = require('../lib/ovlcmd');
    
    const info = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🤖 *HANI-MD PREMIUM*       
┃        Version 2.6.1           
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭────「 📌 *IDENTITÉ* 」────╮
│
│  📛 Nom: *HANI-MD*
│  📌 Version: *2.6.1*
│  👑 Créateur: *H2025*
│  🌍 Origine: *Côte d'Ivoire*
│  💎 Type: *Premium*
│
╰─────────────────────────────╯

╭────「 ⚙️ *TECHNIQUE* 」────╮
│
│  💻 Node.js: *${process.version}*
│  📦 Baileys: *Multi-Device*
│  💾 RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*
│  ⏱️ Uptime: *${uptimeStr}*
│  📋 Commandes: *${getCommands().length}*
│
╰─────────────────────────────╯

╭────「 📊 *VOS INFOS* 」────╮
│
│  ${userInfo.isOwner ? '👑' : userInfo.isPremium ? '💎' : '👤'} Statut: *${userInfo.plan}*
│  📊 Cmds: ${userInfo.dailyLimit === -1 ? '∞' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
│
╰─────────────────────────────╯

🌐 Support: wa.me/22550252467
⭐ Powered by HANI-MD
`;

    repondre(info);

  } catch (error) {
    console.error("[INFO]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 🏓 COMMANDE PING
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "ping",
  classe: "Système",
  react: "🏓",
  desc: "Vérifier la latence du bot",
  alias: ["p", "latency"]
}, async (ovl, msg, { repondre }) => {
  try {
    const start = Date.now();
    await repondre("🏓 Pong!");
    const latency = Date.now() - start;
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const pingResult = `
╭────「 🏓 *PING* 」────╮
│
│  📶 Latence: *${latency}ms*
│  ⏱️ Uptime: *${hours}h ${minutes}m*
│  💾 RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*
│  ⚡ Status: *En ligne*
│
╰─────────────────────╯
`;
    
    await repondre(pingResult);

  } catch (error) {
    console.error("[PING]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👑 COMMANDE OWNER
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "owner",
  classe: "Système",
  react: "👑",
  desc: "Afficher les infos du propriétaire",
  alias: ["dev", "creator"]
}, async (ovl, msg, { repondre }) => {
  try {
    const ownerNumber = config.NUMERO_OWNER || config.OWNER_NUMBER || "";
    const ownerName = config.NOM_OWNER || config.OWNER_NAME || "H2025";
    
    const ownerInfo = `
╭────「 👑 *PROPRIÉTAIRE* 」────╮
│
│  📛 Nom: *${ownerName}*
│  📱 Numéro: wa.me/${ownerNumber}
│  🤖 Bot: *HANI-MD V2.6.1*
│
│  💬 Contactez pour:
│  • Signaler des bugs
│  • Demander des fonctionnalités
│  • Acheter Premium
│
╰─────────────────────────────╯

⭐ Powered by HANI-MD
`;

    repondre(ownerInfo);

  } catch (error) {
    console.error("[OWNER]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

console.log("[CMD] ✅ Module Menu chargé");

