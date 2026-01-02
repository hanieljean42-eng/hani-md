/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        📋 HANI-MD - COMMANDES MENU STYLISÉ V2.0           ║
 * ║     Menu dynamique selon abonnement & permissions         ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const menuSystem = require('../lib/MenuSystem');
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
  // Vérifier si l'utilisateur est le owner
  const ownerNumber = (config.NUMERO_OWNER || '2250150252467').replace(/[^0-9]/g, '');
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  
  const userIsOwner = isOwner || cleanPhone === ownerNumber || cleanPhone.includes(ownerNumber);
  
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

  // Infos utilisateur
  const userPremium = premiumData[cleanPhone] || premiumData[phone] || null;
  const userUsage = usageData[cleanPhone] || { today: 0, total: 0, lastReset: null };
  
  // Vérifier si l'utilisateur est premium
  let isPremium = false;
  let plan = 'FREE';
  let dailyLimit = 30;

  if (userIsOwner) {
    isPremium = true;
    plan = 'OWNER';
    dailyLimit = -1;
  } else if (userPremium) {
    // Vérifier si l'abonnement est encore valide
    if (userPremium.expiresAt === -1 || new Date(userPremium.expiresAt) > new Date()) {
      isPremium = true;
      plan = userPremium.plan || 'PREMIUM';
      
      // Définir la limite selon le plan
      switch (plan.toUpperCase()) {
        case 'BRONZE': dailyLimit = 100; break;
        case 'ARGENT': dailyLimit = 200; break;
        case 'OR': dailyLimit = 500; break;
        case 'DIAMANT': 
        case 'LIFETIME': 
        case 'PREMIUM': dailyLimit = -1; break;
        default: dailyLimit = 50; break;
      }
    }
  }

  // Réinitialiser le compteur quotidien si nécessaire
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
  desc: "Afficher le menu principal ou une catégorie",
  alias: ["m", "allmenu", "commands"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage, ms }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    // Si une catégorie est spécifiée
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
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ❓ COMMANDE HELP (AIDE SPÉCIFIQUE)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "aide",
  classe: "Système",
  react: "❓",
  desc: "Obtenir de l'aide sur une commande spécifique",
  alias: ["help", "h", "?"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    if (!arg[0]) {
      // Afficher l'aide générale
      const helpMenu = `
╭────「 ❓ *AIDE HANI-MD* 」────╮
│
│  🤖 *Bot WhatsApp Multifonction*
│
│  📋 *.menu* → Menu complet
│  📋 *.menu <cat>* → Catégorie
│  ❓ *.aide <cmd>* → Aide commande
│
╰──────────────────────────────╯

📁 *CATÉGORIES DISPONIBLES:*

📥 *.menu telechargement*
🤖 *.menu ia*
🔍 *.menu recherche*
🎭 *.menu fun*
🛠️ *.menu outils*
👥 *.menu groupe*
⚙️ *.menu systeme*
💎 *.menu premium*
💵 *.menu economie*
📷 *.menu status*
${userInfo.isOwner ? '👑 *.menu owner*\n💰 *.menu paiements*' : ''}

━━━━━━━━━━━━━━━━━━━━━

💡 *EXEMPLES:*
• *.aide play* → Aide sur .play
• *.menu fun* → Commandes fun
• *.menu ia* → Commandes IA

🌐 Support: wa.me/2250150252467
⭐ Powered by HANI-MD
`;
      return repondre(helpMenu);
    }
    
    // Aide sur une commande spécifique
    const cmdName = arg[0].replace('.', '');
    const helpText = menuSystem.generateCommandHelp(cmdName, userInfo);
    repondre(helpText);

  } catch (error) {
    console.error("[HELP]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 📊 COMMANDE LISTE (LISTE RAPIDE)
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "liste",
  classe: "Système",
  react: "📊",
  desc: "Liste rapide des commandes d'une catégorie",
  alias: ["list", "cmds"]
}, async (ovl, msg, { arg, repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const categories = menuSystem.getCategories();
    
    if (!arg[0]) {
      let list = `📊 *LISTE RAPIDE*\n\n`;
      list += `Utilisation: *.liste <catégorie>*\n\n`;
      list += `Catégories:\n`;
      
      for (const [key, cat] of Object.entries(categories)) {
        if (cat.accessLevel === 'owner' && !userInfo.isOwner) continue;
        list += `• ${cat.emoji} ${key}\n`;
      }
      
      return repondre(list);
    }
    
    const catKey = arg[0].toLowerCase();
    const category = categories[catKey];
    
    if (!category) {
      return repondre(`❌ Catégorie "${catKey}" non trouvée!\n\nTapez *.liste* pour voir les catégories.`);
    }
    
    if (category.accessLevel === 'owner' && !userInfo.isOwner) {
      return repondre(`🔐 Cette catégorie est réservée au propriétaire.`);
    }
    
    let list = `${category.emoji} *${category.name.toUpperCase()}*\n\n`;
    
    category.commands.forEach(cmd => {
      if (cmd.ownerOnly && !userInfo.isOwner) return;
      const badge = cmd.premium && !userInfo.isPremium ? ' 💎' : '';
      list += `• .${cmd.cmd}${badge}\n`;
    });
    
    list += `\n💡 *.aide <cmd>* pour plus de détails`;
    
    repondre(list);

  } catch (error) {
    console.error("[LIST]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ℹ️ COMMANDE INFO BOT STYLISÉE
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "info",
  classe: "Système",
  react: "ℹ️",
  desc: "Informations détaillées sur le bot",
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
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🤖 *HANI-MD PREMIUM*       ┃
┃        Version 2.6.0           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭────「 📌 *IDENTITÉ* 」────╮
│
│  📛 Nom: *HANI-MD*
│  📌 Version: *2.6.0 SECURE*
│  👑 Créateur: *H2025*
│  🌍 Origine: *Côte d'Ivoire*
│  💎 Type: *Premium Multi-Client*
│
╰────────────────────────────╯

╭────「 ⚙️ *TECHNIQUE* 」────╮
│
│  💻 Node.js: *${process.version}*
│  📦 Baileys: *Multi-Device*
│  💾 RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*
│  ⏱️ Uptime: *${uptimeStr}*
│  🖥️ Plateforme: *${process.platform}*
│
╰────────────────────────────╯

╭────「 🔥 *FONCTIONNALITÉS* 」────╮
│
│  📥 Téléchargement médias
│  🤖 Intelligence Artificielle
│  👥 Gestion des groupes
│  🎮 Jeux & Divertissement
│  💵 Système économique
│  💎 Multi-sessions Premium
│  🔒 Sécurité avancée
│
╰──────────────────────────────────╯

╭────「 📊 *VOS INFOS* 」────╮
│
│  ${userInfo.isOwner ? '🔱' : userInfo.isPremium ? '💎' : '👤'} Statut: *${userInfo.plan}*
│  📊 Commandes: ${userInfo.dailyLimit === -1 ? '∞' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}
│  📈 Total: ${userInfo.totalCommands || 0}
│
╰────────────────────────────╯

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *Support:* wa.me/2250150252467
📱 *Site:* hani-md.glitch.me

⭐ *Powered by HANI-MD Premium*
`;

    repondre(info);

  } catch (error) {
    console.error("[INFO]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 🏓 PING STYLISÉ
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "ping2",
  classe: "Système",
  react: "🏓",
  desc: "Vérifier la latence du bot (version stylisée)",
  alias: ["p2", "latence"]
}, async (ovl, msg, { repondre }) => {
  try {
    const start = Date.now();
    await repondre("🏓 *Pinging...*");
    const latency = Date.now() - start;
    
    let status, bar;
    if (latency < 200) {
      status = "🟢 Excellent";
      bar = "████████░░";
    } else if (latency < 500) {
      status = "🟡 Bon";
      bar = "██████░░░░";
    } else if (latency < 1000) {
      status = "🟠 Moyen";
      bar = "████░░░░░░";
    } else {
      status = "🔴 Lent";
      bar = "██░░░░░░░░";
    }

    const pingResult = `
╭────「 🏓 *PONG!* 」────╮
│
│  ⚡ Latence: *${latency}ms*
│  📊 Status: *${status}*
│  📈 [${bar}]
│
╰────────────────────────╯

💡 Latence < 200ms = Optimal
⭐ Powered by HANI-MD
`;

    repondre(pingResult);

  } catch (error) {
    console.error("[PING2]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ⏱️ UPTIME STYLISÉ
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "uptime2",
  classe: "Système",
  react: "⏱️",
  desc: "Temps d'activité du bot (version stylisée)",
  alias: ["up2", "runtime2"]
}, async (ovl, msg, { repondre }) => {
  try {
    const uptime = process.uptime();
    
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeResult = `
╭────「 ⏱️ *UPTIME* 」────╮
│
│  📅 Jours: *${days}*
│  🕐 Heures: *${hours}*
│  ⏰ Minutes: *${minutes}*
│  ⏱️ Secondes: *${seconds}*
│
│  ━━━━━━━━━━━━━━━━━━
│  
│  🟢 HANI-MD fonctionne
│  parfaitement!
│
╰─────────────────────────╯

💻 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB
⭐ Powered by HANI-MD
`;

    repondre(uptimeResult);

  } catch (error) {
    console.error("[UPTIME2]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// ✅ ALIVE STYLISÉ
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "alive2",
  classe: "Système",
  react: "✅",
  desc: "Vérifier si le bot est en ligne (version stylisée)",
  alias: ["test2", "online2"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const aliveMsg = `
╔═══════════════════════════════╗
║    ✅ *HANI-MD EN LIGNE!*     ║
╠═══════════════════════════════╣
║                               ║
║  🤖 Bot Premium Actif         ║
║  ⏱️ Uptime: ${hours}h ${minutes}m            
║  💻 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB             
║                               ║
╠═══════════════════════════════╣
║  ${userInfo.isOwner ? '🔱 Mode: OWNER' : userInfo.isPremium ? '💎 Mode: PREMIUM' : '👤 Mode: FREE'}           
║  📊 Cmds: ${userInfo.dailyLimit === -1 ? '∞ Illimité' : `${userInfo.commandsToday}/${userInfo.dailyLimit}`}        
╠═══════════════════════════════╣
║                               ║
║  📋 *.menu* → Voir commandes  ║
║  ❓ *.aide* → Obtenir aide    ║
║  💎 *.premium* → S'abonner    ║
║                               ║
╚═══════════════════════════════╝

🌐 Support: wa.me/2250150252467
⭐ *HANI-MD Premium V2.6.0*
`;

    repondre(aliveMsg);

  } catch (error) {
    console.error("[ALIVE2]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👑 VCARD OWNER STYLISÉ
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "createur",
  classe: "Système",
  react: "👑",
  desc: "Contact du créateur du bot",
  alias: ["owner2", "dev", "creator"]
}, async (ovl, msg, { ms, repondre }) => {
  try {
    const ownerNumber = "2250150252467";
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:H2025 - HANI-MD Creator
ORG:HANI-MD Premium Bot
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
NOTE:Créateur de HANI-MD Premium Bot
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
╭────「 👑 *CRÉATEUR* 」────╮
│
│  📛 Nom: *H2025*
│  📱 WhatsApp: +225 01 50 25 24 67
│  🤖 Bot: *HANI-MD Premium*
│  🌍 Pays: *Côte d'Ivoire*
│
╰────────────────────────────╯

💡 *Services:*
├ 🤖 Développement de bots
├ 💎 Abonnements Premium
├ 🔧 Support technique
└ 📱 Applications mobiles

📞 N'hésitez pas à me contacter!
⭐ Powered by HANI-MD
`;

    repondre(ownerMsg);

  } catch (error) {
    console.error("[CREATOR]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES UTILISATEUR
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "mystats",
  classe: "Système",
  react: "📊",
  desc: "Voir mes statistiques d'utilisation",
  alias: ["messtats", "stats"]
}, async (ovl, msg, { repondre, superUser, auteurMessage }) => {
  try {
    const userInfo = getUserInfo(auteurMessage, superUser);
    
    // Calcul du pourcentage d'utilisation
    let usagePercent = 0;
    let usageBar = "░░░░░░░░░░";
    
    if (userInfo.dailyLimit !== -1 && userInfo.dailyLimit > 0) {
      usagePercent = Math.round((userInfo.commandsToday / userInfo.dailyLimit) * 100);
      const filled = Math.min(Math.floor(usagePercent / 10), 10);
      usageBar = "█".repeat(filled) + "░".repeat(10 - filled);
    } else {
      usageBar = "∞∞∞∞∞∞∞∞∞∞";
    }

    const statsMsg = `
╭────「 📊 *MES STATISTIQUES* 」────╮
│
│  👤 Utilisateur: *${userInfo.name}*
│  📱 Numéro: *${userInfo.phone.slice(-8)}*
│
│  ━━━━━━━━━━━━━━━━━━━━━━
│
│  ${userInfo.isOwner ? '🔱' : userInfo.isPremium ? '💎' : '👤'} Plan: *${userInfo.plan}*
│  
│  📊 *Utilisation aujourd'hui:*
│  ${userInfo.commandsToday}/${userInfo.dailyLimit === -1 ? '∞' : userInfo.dailyLimit}
│  [${usageBar}] ${userInfo.dailyLimit === -1 ? '∞' : usagePercent + '%'}
│
│  📈 Total commandes: *${userInfo.totalCommands}*
│
╰────────────────────────────────────╯

${!userInfo.isPremium ? `
💡 *Passez à Premium pour:*
├ 🔓 Commandes illimitées
├ ⚡ Accès à toutes les fonctions
└ 🤖 Votre propre bot WhatsApp

Tapez *.premium* pour en savoir plus!
` : `
✨ Merci d'être membre Premium!
💎 Vous avez accès à toutes les fonctionnalités.
`}
⭐ Powered by HANI-MD
`;

    repondre(statsMsg);

  } catch (error) {
    console.error("[MYSTATS]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 📢 REPORT BUG
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "report",
  classe: "Système",
  react: "📢",
  desc: "Signaler un bug au développeur",
  alias: ["bug", "signaler"]
}, async (ovl, msg, { arg, repondre, auteurMessage, ms }) => {
  try {
    if (!arg[0]) {
      return repondre(`
❌ *Description requise!*

📝 Utilisation: *.report <description du bug>*

💡 Exemple:
*.report La commande .play ne fonctionne pas avec les liens YouTube courts*
`);
    }

    const report = arg.join(" ");
    const ownerJid = "2250150252467@s.whatsapp.net";

    // Envoyer au développeur
    try {
      await ovl.sendMessage(ownerJid, {
        text: `
📢 *NOUVEAU RAPPORT DE BUG*

👤 De: ${auteurMessage}
📅 Date: ${new Date().toLocaleString('fr-FR')}

📝 *Description:*
${report}

━━━━━━━━━━━━━━━━━━━━━
🤖 Envoyé via HANI-MD
`
      });
    } catch (e) {
      console.log("Erreur envoi rapport:", e.message);
    }

    repondre(`
╭────「 ✅ *RAPPORT ENVOYÉ* 」────╮
│
│  Votre rapport a été transmis
│  au développeur.
│
│  📝 ${report.substring(0, 50)}${report.length > 50 ? '...' : ''}
│
│  ⏰ Réponse sous 24-48h
│
╰─────────────────────────────────╯

Merci de nous aider à améliorer HANI-MD!
⭐ Powered by HANI-MD
`);

  } catch (error) {
    console.error("[REPORT]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 💡 SUGGESTION
// ═══════════════════════════════════════════════════════════

ovlcmd({
  nom_cmd: "suggest",
  classe: "Système",
  react: "💡",
  desc: "Suggérer une fonctionnalité",
  alias: ["suggestion", "idee", "idea"]
}, async (ovl, msg, { arg, repondre, auteurMessage }) => {
  try {
    if (!arg[0]) {
      return repondre(`
❌ *Suggestion requise!*

📝 Utilisation: *.suggest <votre idée>*

💡 Exemple:
*.suggest Ajouter la possibilité de télécharger depuis Snapchat*
`);
    }

    const suggestion = arg.join(" ");
    const ownerJid = "2250150252467@s.whatsapp.net";

    // Envoyer au développeur
    try {
      await ovl.sendMessage(ownerJid, {
        text: `
💡 *NOUVELLE SUGGESTION*

👤 De: ${auteurMessage}
📅 Date: ${new Date().toLocaleString('fr-FR')}

💭 *Idée:*
${suggestion}

━━━━━━━━━━━━━━━━━━━━━
🤖 Envoyé via HANI-MD
`
      });
    } catch (e) {
      console.log("Erreur envoi suggestion:", e.message);
    }

    repondre(`
╭────「 ✅ *SUGGESTION ENVOYÉE* 」────╮
│
│  Votre suggestion a été transmise
│  au développeur.
│
│  💡 ${suggestion.substring(0, 50)}${suggestion.length > 50 ? '...' : ''}
│
│  🙏 Merci pour votre contribution!
│
╰────────────────────────────────────╯

⭐ Powered by HANI-MD
`);

  } catch (error) {
    console.error("[SUGGEST]", error);
    repondre(`❌ Erreur: ${error.message}`);
  }
});

console.log('[CMD] ✅ Menu.js chargé - Système de menu stylisé v2.0');
