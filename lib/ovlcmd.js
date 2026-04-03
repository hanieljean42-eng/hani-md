/**
 * ═══════════════════════════════════════════════════════════
 * 📦 HANI-MD - Système de Commandes
 * ═══════════════════════════════════════════════════════════
 * Gestionnaire de commandes pour le bot HANI-MD
 * Version désobfusquée et optimisée
 */

// Stockage des commandes enregistrées
const commands = [];
const commandFunctions = [];

/**
 * Enregistre une nouvelle commande
 * @param {Object} info - Informations de la commande
 * @param {Function} handler - Fonction de traitement
 */
function ovlcmd(info, handler) {
  // Valider les paramètres
  if (!info || !info.nom_cmd) {
    console.error("[OVLCMD] Erreur: nom_cmd requis");
    return;
  }

  // Structure de la commande
  const command = {
    name: info.nom_cmd,
    aliases: info.alias || [],
    category: info.classe || "Général",
    description: info.desc || "Aucune description",
    reaction: info.react || "⚙️",
    fromMe: info.fromMe !== undefined ? info.fromMe : false,
    onlyGroup: info.onlyGroup || false,
    onlyPrivate: info.onlyPrivate || false,
    onlyOwner: info.onlyOwner || false,
    onlySudo: info.onlySudo || false,
    cooldown: info.cooldown || 0,
    usage: info.usage || "",
  };

  // Ajouter la commande et son handler
  commands.push(command);
  commandFunctions.push({
    command: command,
    handler: handler
  });
}

/**
 * Récupère toutes les commandes enregistrées
 * @returns {Array} Liste des commandes
 */
function getCommands() {
  return commands;
}

/**
 * Récupère les handlers des commandes
 * @returns {Array} Liste des handlers
 */
function getCommandHandlers() {
  return commandFunctions;
}

/**
 * Recherche une commande par nom ou alias
 * @param {string} name - Nom de la commande
 * @returns {Object|null} La commande trouvée ou null
 */
function findCommand(name) {
  const lowerName = name.toLowerCase();
  
  for (const cmdData of commandFunctions) {
    const cmd = cmdData.command;
    if (cmd.name.toLowerCase() === lowerName) {
      return cmdData;
    }
    if (cmd.aliases && cmd.aliases.some(a => a.toLowerCase() === lowerName)) {
      return cmdData;
    }
  }
  
  return null;
}

/**
 * Exécute une commande
 * @param {string} cmdName - Nom de la commande
 * @param {Object} hani - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options supplémentaires
 */
async function executeCommand(cmdName, hani, msg, options = {}) {
  const cmdData = findCommand(cmdName);
  
  if (!cmdData) {
    console.log(`[OVLCMD] ⚠️ Commande "${cmdName}" non trouvée`);
    return null;
  }
  
  console.log(`[OVLCMD] ✅ Exécution de "${cmdData.command.name}"...`);
  
  try {
    // Envoyer la réaction si définie
    if (cmdData.command.reaction && msg.key) {
      try {
        await hani.sendMessage(msg.key.remoteJid, {
          react: { text: cmdData.command.reaction, key: msg.key }
        });
        console.log(`[OVLCMD] 👍 Réaction envoyée: ${cmdData.command.reaction}`);
      } catch (e) {
        console.log(`[OVLCMD] ⚠️ Erreur réaction: ${e.message}`);
      }
    }
    
    // Ajouter le JID de destination et le socket aux options pour faciliter l'accès
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const enhancedOptions = {
      ...options,
      from: msg.key.remoteJid,
      sock: hani,
      auteur_msg: options.auteurMessage || senderJid,
      auteur_Msg: options.auteur_Msg || options.auteurMessage || senderJid,
    };
    
    console.log(`[OVLCMD] 🔧 Appel du handler pour "${cmdName}"...`);
    
    // Exécuter le handler avec les paramètres corrects
    // Premier param: socket (hani), Deuxième param: message (msg), Troisième param: options
    await cmdData.handler(hani, msg, enhancedOptions);
    
    console.log(`[OVLCMD] ✅ Handler exécuté avec succès`);
    return true;
  } catch (error) {
    console.error(`[OVLCMD] ❌ Erreur commande ${cmdName}:`, error.message);
    console.error(`[OVLCMD] Stack:`, error.stack);
    return false;
  }
}

/**
 * Récupère les commandes par catégorie
 * @returns {Object} Commandes groupées par catégorie
 */
function getCommandsByCategory() {
  const categories = {};
  
  for (const cmd of commands) {
    const cat = cmd.category || "Général";
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(cmd);
  }
  
  return categories;
}

/**
 * Génère un menu des commandes
 * @param {string} prefix - Préfixe des commandes
 * @returns {string} Menu formaté
 */
function generateMenu(prefix = ".") {
  const categories = getCommandsByCategory();
  let menu = `╭━━━ 📋 *MENU COMMANDES* ━━━╮\n\n`;
  
  for (const [category, cmds] of Object.entries(categories)) {
    menu += `┌───「 ${category} 」───┐\n`;
    for (const cmd of cmds) {
      menu += `│ ${prefix}${cmd.name}\n`;
      if (cmd.description) {
        menu += `│   ↳ ${cmd.description}\n`;
      }
    }
    menu += `└────────────────────┘\n\n`;
  }
  
  menu += `╰━━━━━━━━━━━━━━━━━━━━━━╯`;
  return menu;
}

// Exports
module.exports = {
  ovlcmd,
  getCommands,
  getCommandHandlers,
  findCommand,
  executeCommand,
  getCommandsByCategory,
  generateMenu,
  cmd: commands,
  func: commandFunctions
};
