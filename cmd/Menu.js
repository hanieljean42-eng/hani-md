/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        📋 HANI-MD - COMMANDES MENU STYLISÉ V2.1           ║
 * ║     Menu dynamique selon abonnement & permissions         ║
 * ║              Par H2025 - 2026                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
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
// 📋 COMMANDE MENU PRINCIPAL
// ═══════════════════════════════════════════════════════════

// Catégories par plan
const PLAN_CATEGORIES = {
  FREE: ['download', 'search', 'fun', 'outils', 'systeme'],
  BRONZE: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'systeme'],
  ARGENT: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'ia', 'groupe', 'logo', 'economie', 'systeme'],
  OR: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'ia', 'groupe', 'logo', 'economie', 'premium', 'systeme'],
  DIAMANT: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'ia', 'groupe', 'logo', 'economie', 'premium', 'systeme'],
  LIFETIME: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'ia', 'groupe', 'logo', 'economie', 'premium', 'systeme'],
  OWNER: ['download', 'search', 'fun', 'outils', 'audio', 'status', 'ia', 'groupe', 'logo', 'economie', 'premium', 'systeme', 'owner']
};

// Info des catégories
const CATEGORY_INFO = {
  download: { emoji: '📥', name: 'Download', desc: 'YouTube, TikTok, Instagram' },
  search: { emoji: '🔍', name: 'Search', desc: 'Google, YouTube, Wikipedia' },
  fun: { emoji: '🎭', name: 'Fun', desc: 'Jeux, Blagues, Quiz' },
  outils: { emoji: '🛠️', name: 'Outils', desc: 'Stickers, Conversion, QR' },
  audio: { emoji: '🎵', name: 'Audio', desc: 'Effets audio, TTS' },
  status: { emoji: '📷', name: 'Status', desc: 'Statuts WhatsApp' },
  ia: { emoji: '🤖', name: 'IA', desc: 'GPT, Gemini, DALL-E' },
  groupe: { emoji: '👥', name: 'Groupe', desc: 'Gestion des groupes' },
  logo: { emoji: '🎨', name: 'Logo', desc: 'Création de logos' },
  economie: { emoji: '💰', name: 'Economie', desc: 'Banque, Daily, Shop' },
  premium: { emoji: '💎', name: 'Premium', desc: 'Fonctionnalités VIP' },
  systeme: { emoji: '⚙️', name: 'Systeme', desc: 'Bot, Ping, Info' },
  owner: { emoji: '👑', name: 'Owner', desc: 'Commandes admin' }
};

ovlcmd({
  nom_cmd: "menu",
  classe: "Système",
  react: "📋",
  desc: "Afficher le menu principal",
  alias: ["m", "allmenu", "commands"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage, ms, clientPlan, plan: optPlan, isOwner } = {}) => {
  try {
    // Utiliser clientPlan (session client) ou déterminer depuis users_pro.json (bot principal)
    const planOverride = clientPlan || optPlan || null;
    const ownerOverride = isOwner || superUser || false;
    const userInfo = getUserInfo(auteurMessage, ownerOverride, planOverride);
    const prefix = config.PREFIX || config.PREFIXE || ".";
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    // Déterminer les catégories disponibles selon le plan
    const plan = userInfo.plan.toUpperCase();
    const availableCategories = PLAN_CATEGORIES[plan] || PLAN_CATEGORIES['FREE'];
    const allCategories = PLAN_CATEGORIES['OWNER'];
    
    // Construire le menu des catégories
    let categoriesMenu = '';
    for (const cat of allCategories) {
      const info = CATEGORY_INFO[cat];
      const isAvailable = availableCategories.includes(cat) || userInfo.isOwner;
      
      if (isAvailable) {
        categoriesMenu += `│ ${info.emoji} *${prefix}menu ${cat}*\n│    └ ${info.desc}\n│\n`;
      } else {
        categoriesMenu += `│ 🔒 ~~${prefix}menu ${cat}~~ *(${info.name})*\n│    └ _Requiert plan supérieur_\n│\n`;
      }
    }
    
    // Badge du plan
    const planBadges = {
      FREE: '🆓 GRATUIT',
      BRONZE: '🥉 BRONZE',
      ARGENT: '🥈 ARGENT',
      OR: '🥇 OR',
      DIAMANT: '💎 DIAMANT',
      LIFETIME: '👑 LIFETIME',
      OWNER: '👑 OWNER'
    };
    
    const mainMenu = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🌟 *HANI-MD V2.6.1* 🌟    
┃  Bot WhatsApp Intelligent      
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─────「 👤 *PROFIL* 」─────╮
│ 🏷️ Plan: *${planBadges[plan] || plan}*
│ 📊 Cmds: ${userInfo.dailyLimit === -1 ? '∞ Illimité' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
│ ⏱️ Uptime: ${hours}h ${minutes}m
╰─────────────────────────────╯

╭─────「 📋 *CATÉGORIES* 」─────╮
│
${categoriesMenu}╰─────────────────────────────╯

╭─────「 ℹ️ *INFO* 」─────╮
│ 💡 *${prefix}aide <cmd>* - Aide commande
│ 💳 *${prefix}upgrade* - Améliorer plan
│ 📊 *${prefix}myplan* - Mon abonnement
│ 📞 Support: wa.me/22550252467
╰─────────────────────────────╯

⭐ Powered by HANI-MD
`;

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

