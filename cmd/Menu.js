/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘        ðŸ“‹ HANI-MD - COMMANDES MENU STYLISÃ‰ V2.0           â•‘
 * â•‘     Menu dynamique selon abonnement & permissions         â•‘
 * â•‘              Par H2025 - 2025                             â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

const { ovlcmd } = require('../lib/ovlcmd');
const menuSystem = require('../lib/MenuSystem');
const config = require('../set');
const fs = require('fs');
const path = require('path');

// Fichiers de donnÃ©es
const PREMIUM_USERS_FILE = path.join(__dirname, '..', 'DataBase', 'users_pro.json');
const USAGE_FILE = path.join(__dirname, '..', 'DataBase', 'command_usage.json');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”§ FONCTIONS UTILITAIRES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * RÃ©cupÃ¨re les infos utilisateur pour le menu
 */
function getUserInfo(phone, isOwner = false) {
  // VÃ©rifier si l'utilisateur est le owner
  const ownerNumber = (config.NUMERO_OWNER || '22550252467').replace(/[^0-9]/g, '');
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  
  const userIsOwner = isOwner || cleanPhone === ownerNumber || cleanPhone.includes(ownerNumber);
  
  // Charger les donnÃ©es premium
  let premiumData = {};
  try {
    if (fs.existsSync(PREMIUM_USERS_FILE)) {
      premiumData = JSON.parse(fs.readFileSync(PREMIUM_USERS_FILE, 'utf8'));
    }
  } catch (e) {}

  // Charger les donnÃ©es d'utilisation
  let usageData = {};
  try {
    if (fs.existsSync(USAGE_FILE)) {
      usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    }
  } catch (e) {}

  // Infos utilisateur
  const userPremium = premiumData[cleanPhone] || premiumData[phone] || null;
  const userUsage = usageData[cleanPhone] || { today: 0, total: 0, lastReset: null };
  
  // VÃ©rifier si l'utilisateur est premium
  let isPremium = false;
  let plan = 'FREE';
  let dailyLimit = 30;

  if (userIsOwner) {
    isPremium = true;
    plan = 'OWNER';
    dailyLimit = -1;
  } else if (userPremium) {
    // VÃ©rifier si l'abonnement est encore valide
    if (userPremium.expiresAt === -1 || new Date(userPremium.expiresAt) > new Date()) {
      isPremium = true;
      plan = userPremium.plan || 'PREMIUM';
      
      // DÃ©finir la limite selon le plan
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

  // RÃ©initialiser le compteur quotidien si nÃ©cessaire
  const today = new Date().toDateString();
  if (userUsage.lastReset !== today) {
    userUsage.today = 0;
    userUsage.lastReset = today;
  }

  return {
    phone: cleanPhone,
    name: userPremium?.name || `User_${cleanPhone.slice(-4)}`,
    plan: plan,
    isOwner: userIsOwner,
    isPremium: isPremium,
    commandsToday: userUsage.today || 0,
    dailyLimit: dailyLimit,
    totalCommands: userUsage.total || 0,
    theme: 'elegant'
  };
}

/**
 * IncrÃ©menter le compteur d'utilisation
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“‹ COMMANDE MENU PRINCIPAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "menu",
  classe: "SystÃ¨me",
  react: "ðŸ“‹",
  desc: "Afficher le menu principal ou une catÃ©gorie",
  alias: ["m", "allmenu", "commands"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage, ms }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    // Si une catÃ©gorie est spÃ©cifiÃ©e
    if (arg[0]) {
      const categoryMenu = menuSystem.generateCategoryMenu(arg[0], userInfo);
      return repondre(categoryMenu);
    }
    
    // Menu principal
    const mainMenu = menuSystem.generateMainMenu(userInfo);
    
    // Envoyer avec image si disponible
    try {
      const menuImagePath = path.join(__dirname, '..', 'assets', 'menu_banner.jpg');
      if (fs.existsSync(menuImagePath)) {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: fs.readFileSync(menuImagePath),
          caption: mainMenu
        }, { quoted: ms });
      } else {
        await repondre(mainMenu);
      }
    } catch (e) {
      await repondre(mainMenu);
    }

  } catch (error) {
    console.error("[MENU]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â“ COMMANDE HELP (AIDE SPÃ‰CIFIQUE)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "aide",
  classe: "SystÃ¨me",
  react: "â“",
  desc: "Obtenir de l'aide sur une commande spÃ©cifique",
  alias: ["help", "h", "?"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    if (!arg[0]) {
      // Afficher l'aide gÃ©nÃ©rale
      const helpMenu = `
â•­â”€â”€â”€â”€ã€Œ â“ *AIDE HANI-MD* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ¤– *Bot WhatsApp Multifonction*
â”‚
â”‚  ðŸ“‹ *.menu* â†’ Menu complet
â”‚  ðŸ“‹ *.menu <cat>* â†’ CatÃ©gorie
â”‚  â“ *.aide <cmd>* â†’ Aide commande
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

ðŸ“ *CATÃ‰GORIES DISPONIBLES:*

ðŸ“¥ *.menu telechargement*
ðŸ¤– *.menu ia*
ðŸ” *.menu recherche*
ðŸŽ­ *.menu fun*
ðŸ› ï¸ *.menu outils*
ðŸ‘¥ *.menu groupe*
âš™ï¸ *.menu systeme*
ðŸ’Ž *.menu premium*
ðŸ’µ *.menu economie*
ðŸ“· *.menu status*
ðŸŽµ *.menu audio*
ðŸŽ¨ *.menu logos*
ðŸ–¼ï¸ *.menu images*
ðŸ˜€ *.menu reactions*
${userInfo.isOwner ? 'ðŸ‘‘ *.menu owner*\nðŸ’° *.menu paiements*' : ''}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸ’¡ *EXEMPLES:*
â€¢ *.aide play* â†’ Aide sur .play
â€¢ *.menu fun* â†’ Commandes fun
â€¢ *.menu ia* â†’ Commandes IA

ðŸŒ Support: wa.me/22550252467
â­ Powered by HANI-MD
`;
      return repondre(helpMenu);
    }
    
    // Aide sur une commande spÃ©cifique
    const cmdName = arg[0].replace('.', '');
    const helpText = menuSystem.generateCommandHelp(cmdName, userInfo);
    repondre(helpText);

  } catch (error) {
    console.error("[HELP]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“Š COMMANDE LISTE (LISTE RAPIDE)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "liste",
  classe: "SystÃ¨me",
  react: "ðŸ“Š",
  desc: "Liste rapide des commandes d'une catÃ©gorie",
  alias: ["list", "cmds"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const categories = menuSystem.getCategories();
    
    if (!arg[0]) {
      let list = `ðŸ“Š *LISTE RAPIDE*\n\n`;
      list += `Utilisation: *.liste <catÃ©gorie>*\n\n`;
      list += `CatÃ©gories:\n`;
      
      for (const [key, cat] of Object.entries(categories)) {
        if (cat.accessLevel === 'owner' && !userInfo.isOwner) continue;
        list += `â€¢ ${cat.emoji} ${key}\n`;
      }
      
      return repondre(list);
    }
    
    const catKey = arg[0].toLowerCase();
    const category = categories[catKey];
    
    if (!category) {
      return repondre(`âŒ CatÃ©gorie "${catKey}" non trouvÃ©e!\n\nTapez *.liste* pour voir les catÃ©gories.`);
    }
    
    if (category.accessLevel === 'owner' && !userInfo.isOwner) {
      return repondre(`ðŸ” Cette catÃ©gorie est rÃ©servÃ©e au propriÃ©taire.`);
    }
    
    let list = `${category.emoji} *${category.name.toUpperCase()}*\n\n`;
    
    category.commands.forEach(cmd => {
      if (cmd.ownerOnly && !userInfo.isOwner) return;
      const badge = cmd.premium && !userInfo.isPremium ? ' ðŸ’Ž' : '';
      list += `â€¢ .${cmd.cmd}${badge}\n`;
    });
    
    list += `\nðŸ’¡ *.aide <cmd>* pour plus de dÃ©tails`;
    
    repondre(list);

  } catch (error) {
    console.error("[LIST]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â„¹ï¸ COMMANDE INFO BOT STYLISÃ‰E
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "info",
  classe: "SystÃ¨me",
  react: "â„¹ï¸",
  desc: "Informations dÃ©taillÃ©es sur le bot",
  alias: ["botinfo", "about", "infobot"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const uptime = process.uptime();
    
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const uptimeStr = `${days > 0 ? days + 'j ' : ''}${hours}h ${minutes}m`;
    
    const info = `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”“
â”ƒ     ðŸ¤– *HANI-MD PREMIUM*       â”ƒ
â”ƒ        Version 2.6.0           â”ƒ
â”—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”›

â•­â”€â”€â”€â”€ã€Œ ðŸ“Œ *IDENTITÃ‰* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ“› Nom: *HANI-MD*
â”‚  ðŸ“Œ Version: *2.6.0 SECURE*
â”‚  ðŸ‘‘ CrÃ©ateur: *H2025*
â”‚  ðŸŒ Origine: *CÃ´te d'Ivoire*
â”‚  ðŸ’Ž Type: *Premium Multi-Client*
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

â•­â”€â”€â”€â”€ã€Œ âš™ï¸ *TECHNIQUE* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ’» Node.js: *${process.version}*
â”‚  ðŸ“¦ Baileys: *Multi-Device*
â”‚  ðŸ’¾ RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*
â”‚  â±ï¸ Uptime: *${uptimeStr}*
â”‚  ðŸ–¥ï¸ Plateforme: *${process.platform}*
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

â•­â”€â”€â”€â”€ã€Œ ðŸ”¥ *FONCTIONNALITÃ‰S* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ“¥ TÃ©lÃ©chargement mÃ©dias
â”‚  ðŸ¤– Intelligence Artificielle
â”‚  ðŸ‘¥ Gestion des groupes
â”‚  ðŸŽ® Jeux & Divertissement
â”‚  ðŸ’µ SystÃ¨me Ã©conomique
â”‚  ðŸ’Ž Multi-sessions Premium
â”‚  ðŸ”’ SÃ©curitÃ© avancÃ©e
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

â•­â”€â”€â”€â”€ã€Œ ðŸ“Š *VOS INFOS* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ${userInfo.isOwner ? 'ðŸ”±' : userInfo.isPremium ? 'ðŸ’Ž' : 'ðŸ‘¤'} Statut: *${userInfo.plan}*
â”‚  ðŸ“Š Commandes: ${userInfo.dailyLimit === -1 ? 'âˆž' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
â”‚  ðŸ“ˆ Total: ${userInfo.totalCommands || 0}
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸŒ *Support:* wa.me/22550252467
ðŸ“± *Site:* hani-md.glitch.me

â­ *Powered by HANI-MD Premium*
`;

    repondre(info);

  } catch (error) {
    console.error("[INFO]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“ PING STYLISÃ‰
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "ping2",
  classe: "SystÃ¨me",
  react: "ðŸ“",
  desc: "VÃ©rifier la latence du bot (version stylisÃ©e)",
  alias: ["p2", "latence"]
}, async (ovl, msg, { repondre }) => {
  try {
    const start = Date.now();
    await repondre("ðŸ“ *Pinging...*");
    const latency = Date.now() - start;
    
    let status, bar;
    if (latency < 200) {
      status = "ðŸŸ¢ Excellent";
      bar = "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘";
    } else if (latency < 500) {
      status = "ðŸŸ¡ Bon";
      bar = "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘";
    } else if (latency < 1000) {
      status = "ðŸŸ  Moyen";
      bar = "â–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘";
    } else {
      status = "ðŸ”´ Lent";
      bar = "â–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘";
    }

    const pingResult = `
â•­â”€â”€â”€â”€ã€Œ ðŸ“ *PONG!* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  âš¡ Latence: *${latency}ms*
â”‚  ðŸ“Š Status: *${status}*
â”‚  ðŸ“ˆ [${bar}]
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

ðŸ’¡ Latence < 200ms = Optimal
â­ Powered by HANI-MD
`;

    repondre(pingResult);

  } catch (error) {
    console.error("[PING2]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â±ï¸ UPTIME STYLISÃ‰
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "uptime2",
  classe: "SystÃ¨me",
  react: "â±ï¸",
  desc: "Temps d'activitÃ© du bot (version stylisÃ©e)",
  alias: ["up2", "runtime2"]
}, async (ovl, msg, { repondre }) => {
  try {
    const uptime = process.uptime();
    
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeResult = `
â•­â”€â”€â”€â”€ã€Œ â±ï¸ *UPTIME* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ“… Jours: *${days}*
â”‚  ðŸ• Heures: *${hours}*
â”‚  â° Minutes: *${minutes}*
â”‚  â±ï¸ Secondes: *${seconds}*
â”‚
â”‚  â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â”‚  
â”‚  ðŸŸ¢ HANI-MD fonctionne
â”‚  parfaitement!
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

ðŸ’» RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB
â­ Powered by HANI-MD
`;

    repondre(uptimeResult);

  } catch (error) {
    console.error("[UPTIME2]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// âœ… ALIVE STYLISÃ‰
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "alive2",
  classe: "SystÃ¨me",
  react: "âœ…",
  desc: "VÃ©rifier si le bot est en ligne (version stylisÃ©e)",
  alias: ["test2", "online2"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const aliveMsg = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘    âœ… *HANI-MD EN LIGNE!*     â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘                               â•‘
â•‘  ðŸ¤– Bot Premium Actif         â•‘
â•‘  â±ï¸ Uptime: ${hours}h ${minutes}m            
â•‘  ðŸ’» RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB             
â•‘                               â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  ${userInfo.isOwner ? 'ðŸ”± Mode: OWNER' : userInfo.isPremium ? 'ðŸ’Ž Mode: PREMIUM' : 'ðŸ‘¤ Mode: FREE'}           
â•‘  ðŸ“Š Cmds: ${userInfo.dailyLimit === -1 ? 'âˆž IllimitÃ©' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}        
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘                               â•‘
â•‘  ðŸ“‹ *.menu* â†’ Voir commandes  â•‘
â•‘  â“ *.aide* â†’ Obtenir aide    â•‘
â•‘  ðŸ’Ž *.premium* â†’ S'abonner    â•‘
â•‘                               â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸŒ Support: wa.me/22550252467
â­ *HANI-MD Premium V2.6.0*
`;

    repondre(aliveMsg);

  } catch (error) {
    console.error("[ALIVE2]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ‘‘ VCARD OWNER STYLISÃ‰
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "createur",
  classe: "SystÃ¨me",
  react: "ðŸ‘‘",
  desc: "Contact du crÃ©ateur du bot",
  alias: ["owner2", "dev", "creator"]
}, async (ovl, msg, { ms, repondre }) => {
  try {
    const ownerNumber = "22550252467";
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:H2025 - HANI-MD Creator
ORG:HANI-MD Premium Bot
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
NOTE:CrÃ©ateur de HANI-MD Premium Bot
END:VCARD`;

    await ovl.sendMessage(msg.key.remoteJid, {
      contacts: {
        displayName: "H2025 - HANI-MD",
        contacts: [{
          vcard
        }]
      }
    }, { quoted: ms });

    const ownerMsg = `
â•­â”€â”€â”€â”€ã€Œ ðŸ‘‘ *CRÃ‰ATEUR* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ“› Nom: *H2025*
â”‚  ðŸ“± WhatsApp: +225 01 50 25 24 67
â”‚  ðŸ¤– Bot: *HANI-MD Premium*
â”‚  ðŸŒ Pays: *CÃ´te d'Ivoire*
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

ðŸ’¡ *Services:*
â”œ ðŸ¤– DÃ©veloppement de bots
â”œ ðŸ’Ž Abonnements Premium
â”œ ðŸ”§ Support technique
â”” ðŸ“± Applications mobiles

ðŸ“ž N'hÃ©sitez pas Ã  me contacter!
â­ Powered by HANI-MD
`;

    repondre(ownerMsg);

  } catch (error) {
    console.error("[CREATOR]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“Š STATISTIQUES UTILISATEUR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "mystats",
  classe: "SystÃ¨me",
  react: "ðŸ“Š",
  desc: "Voir mes statistiques d'utilisation",
  alias: ["messtats", "stats"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    // Calcul du pourcentage d'utilisation
    let usagePercent = 0;
    let usageBar = "â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘";
    
    if (userInfo.dailyLimit !== -1 && userInfo.dailyLimit > 0) {
      usagePercent = Math.round((userInfo.commandsToday / userInfo.dailyLimit) * 100);
      const filled = Math.min(Math.floor(usagePercent / 10), 10);
      usageBar = "â–ˆ".repeat(filled) + "â–‘".repeat(10 - filled);
    } else {
      usageBar = "âˆžâˆžâˆžâˆžâˆžâˆžâˆžâˆžâˆžâˆž";
    }

    const statsMsg = `
â•­â”€â”€â”€â”€ã€Œ ðŸ“Š *MES STATISTIQUES* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  ðŸ‘¤ Utilisateur: *${userInfo.name}*
â”‚  ðŸ“± NumÃ©ro: *${userInfo.phone.slice(-8)}*
â”‚
â”‚  â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â”‚
â”‚  ${userInfo.isOwner ? 'ðŸ”±' : userInfo.isPremium ? 'ðŸ’Ž' : 'ðŸ‘¤'} Plan: *${userInfo.plan}*
â”‚  
â”‚  ðŸ“Š *Utilisation aujourd'hui:*
â”‚  ${userInfo.commandsToday}/${userInfo.dailyLimit === -1 ? 'âˆž' : userInfo.dailyLimit}
â”‚  [${usageBar}] ${userInfo.dailyLimit === -1 ? 'âˆž' : usagePercent + '%'}
â”‚
â”‚  ðŸ“ˆ Total commandes: *${userInfo.totalCommands}*
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

${!userInfo.isPremium ? `
ðŸ’¡ *Passez Ã  Premium pour:*
â”œ ðŸ”“ Commandes illimitÃ©es
â”œ âš¡ AccÃ¨s Ã  toutes les fonctions
â”” ðŸ¤– Votre propre bot WhatsApp

Tapez *.premium* pour en savoir plus!
` : `
âœ¨ Merci d'Ãªtre membre Premium!
ðŸ’Ž Vous avez accÃ¨s Ã  toutes les fonctionnalitÃ©s.
`}
â­ Powered by HANI-MD
`;

    repondre(statsMsg);

  } catch (error) {
    console.error("[MYSTATS]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“¢ REPORT BUG
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "report",
  classe: "SystÃ¨me",
  react: "ðŸ“¢",
  desc: "Signaler un bug au dÃ©veloppeur",
  alias: ["bug", "signaler"]
}, async (ovl, msg, { arg, repondre, auteurMessage, ms }) => {
  try {
    if (!arg[0]) {
      return repondre(`
âŒ *Description requise!*

ðŸ“ Utilisation: *.report <description du bug>*

ðŸ’¡ Exemple:
*.report La commande .play ne fonctionne pas avec les liens YouTube courts*
`);
    }

    const report = arg.join(" ");
    const ownerJid = "22550252467@s.whatsapp.net";

    // Envoyer au dÃ©veloppeur
    try {
      await ovl.sendMessage(ownerJid, {
        text: `
ðŸ“¢ *NOUVEAU RAPPORT DE BUG*

ðŸ‘¤ De: ${auteurMessage}
ðŸ“… Date: ${new Date().toLocaleString('fr-FR')}

ðŸ“ *Description:*
${report}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ¤– EnvoyÃ© via HANI-MD
`
      });
    } catch (e) {
      console.log("Erreur envoi rapport:", e.message);
    }

    repondre(`
â•­â”€â”€â”€â”€ã€Œ âœ… *RAPPORT ENVOYÃ‰* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  Votre rapport a Ã©tÃ© transmis
â”‚  au dÃ©veloppeur.
â”‚
â”‚  ðŸ“ ${report.substring(0, 50)}${report.length > 50 ? '...' : ''}
â”‚
â”‚  â° RÃ©ponse sous 24-48h
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

Merci de nous aider Ã  amÃ©liorer HANI-MD!
â­ Powered by HANI-MD
`);

  } catch (error) {
    console.error("[REPORT]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ’¡ SUGGESTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ovlcmd({
  nom_cmd: "suggest",
  classe: "SystÃ¨me",
  react: "ðŸ’¡",
  desc: "SuggÃ©rer une fonctionnalitÃ©",
  alias: ["suggestion", "idee", "idea"]
}, async (ovl, msg, { arg, repondre, auteurMessage }) => {
  try {
    if (!arg[0]) {
      return repondre(`
âŒ *Suggestion requise!*

ðŸ“ Utilisation: *.suggest <votre idÃ©e>*

ðŸ’¡ Exemple:
*.suggest Ajouter la possibilitÃ© de tÃ©lÃ©charger depuis Snapchat*
`);
    }

    const suggestion = arg.join(" ");
    const ownerJid = "22550252467@s.whatsapp.net";

    // Envoyer au dÃ©veloppeur
    try {
      await ovl.sendMessage(ownerJid, {
        text: `
ðŸ’¡ *NOUVELLE SUGGESTION*

ðŸ‘¤ De: ${auteurMessage}
ðŸ“… Date: ${new Date().toLocaleString('fr-FR')}

ðŸ’­ *IdÃ©e:*
${suggestion}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ¤– EnvoyÃ© via HANI-MD
`
      });
    } catch (e) {
      console.log("Erreur envoi suggestion:", e.message);
    }

    repondre(`
â•­â”€â”€â”€â”€ã€Œ âœ… *SUGGESTION ENVOYÃ‰E* ã€â”€â”€â”€â”€â•®
â”‚
â”‚  Votre suggestion a Ã©tÃ© transmise
â”‚  au dÃ©veloppeur.
â”‚
â”‚  ðŸ’¡ ${suggestion.substring(0, 50)}${suggestion.length > 50 ? '...' : ''}
â”‚
â”‚  ðŸ™ Merci pour votre contribution!
â”‚
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

â­ Powered by HANI-MD
`);

  } catch (error) {
    console.error("[SUGGEST]", error);
    repondre(`âŒ Erreur: ${error.message}`);
  }
});

console.log('[CMD] âœ… Menu.js chargÃ© - SystÃ¨me de menu stylisÃ© v2.0');
