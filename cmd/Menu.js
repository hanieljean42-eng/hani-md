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
function getUserInfo(phone, isOwner = false) {
  const ownerNumber = (config.NUMERO_OWNER || config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  
  const userIsOwner = isOwner || cleanPhone === ownerNumber || 
                      cleanPhone.includes(ownerNumber) || 
                      ownerNumber.includes(cleanPhone);
  
  // Charger les données premium
  let premiumData = {};
  try {
    if (fs.existsSync(PREMIUM_USERS_FILE)) {
      premiumData = JSON.parse(fs.readFileSync(PREMIUM_USERS_FILE, 'utf8'));
    }
  } catch (e) {}

  // Charger les données d'utilisation
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

  if (userIsOwner) {
    isPremium = true;
    plan = 'OWNER';
    dailyLimit = -1;
  } else if (userPremium) {
    if (userPremium.expiresAt === -1 || new Date(userPremium.expiresAt) > new Date()) {
      isPremium = true;
      plan = userPremium.plan || 'PREMIUM';
      
      switch (plan.toUpperCase()) {
        case 'BRONZE': dailyLimit = 100; break;
        case 'ARGENT': dailyLimit = 300; break;
        case 'OR': dailyLimit = -1; break;
        case 'DIAMANT': 
        case 'LIFETIME': 
        case 'PREMIUM': dailyLimit = -1; break;
        default: dailyLimit = 50; break;
      }
    }
  }

  const today = new Date().toDateString();
  if (userUsage.lastReset !== today) {
    userUsage.today = 0;
    userUsage.lastReset = today;
  }

  return {
    phone: cleanPhone,
    name: userPremium?.name || `User_${cleanPhone.slice(-4)}`,
    plan,
    isOwner: userIsOwner,
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

ovlcmd({
  nom_cmd: "menu",
  classe: "Système",
  react: "📋",
  desc: "Afficher le menu principal",
  alias: ["m", "allmenu", "commands"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage, ms }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const prefix = config.PREFIX || config.PREFIXE || ".";
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const mainMenu = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🌟 *HANI-MD V2.6.1* 🌟    
┃  Bot WhatsApp Intelligent      
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─────「 👤 *PROFIL* 」─────╮
│ 📱 Plan: *${userInfo.plan}*
│ 📊 Cmds: ${userInfo.dailyLimit === -1 ? '∞' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
│ ⏱️ Uptime: ${hours}h ${minutes}m
╰─────────────────────────────╯

╭─────「 📋 *CATÉGORIES* 」─────╮
│
│ 📥 *${prefix}menu download* 
│    └ YouTube, TikTok, Instagram
│
│ 🤖 *${prefix}menu ia*
│    └ GPT, Gemini, DALL-E
│
│ 🔍 *${prefix}menu search*
│    └ Google, YouTube, Wikipedia
│
│ 🎭 *${prefix}menu fun*
│    └ Jeux, Blagues, Quiz
│
│ 🛠️ *${prefix}menu outils*
│    └ Stickers, Conversion, QR
│
│ 👥 *${prefix}menu groupe*
│    └ Gestion des groupes
│
│ 📷 *${prefix}menu status*
│    └ Statuts WhatsApp
│
│ 🎵 *${prefix}menu audio*
│    └ Effets audio, TTS
│
│ 🎨 *${prefix}menu logo*
│    └ Création de logos
│
│ 💎 *${prefix}menu premium*
│    └ Fonctionnalités VIP
│
│ 💰 *${prefix}menu economie*
│    └ Banque, Daily, Shop
│
│ ⚙️ *${prefix}menu systeme*
│    └ Bot, Ping, Info
${userInfo.isOwner ? `│\n│ 👑 *${prefix}menu owner*\n│    └ Commandes admin` : ''}
│
╰─────────────────────────────╯

💡 *${prefix}aide <cmd>* pour l'aide
📞 Support: wa.me/22550252467

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
