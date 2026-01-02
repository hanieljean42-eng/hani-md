/**
 * ═══════════════════════════════════════════════════════════
 * 🔐 HANI-MD - Public/Private Command Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des commandes publiques/privées
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "public_private_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    disabledCommands: [], 
    privateCommands: [],
    groupSettings: {}
  };
}

// Sauvegarder la base de données
function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Désactiver une commande globalement
 * @param {string} cmd - Nom de la commande
 */
async function disableCommand(cmd) {
  const db = loadDB();
  
  if (!db.disabledCommands.includes(cmd.toLowerCase())) {
    db.disabledCommands.push(cmd.toLowerCase());
    saveDB(db);
  }
  return true;
}

/**
 * Activer une commande
 * @param {string} cmd - Nom de la commande
 */
async function enableCommand(cmd) {
  const db = loadDB();
  
  db.disabledCommands = db.disabledCommands.filter(c => c !== cmd.toLowerCase());
  saveDB(db);
  return true;
}

/**
 * Vérifier si une commande est désactivée
 * @param {string} cmd - Nom de la commande
 */
async function isCommandDisabled(cmd) {
  const db = loadDB();
  return db.disabledCommands.includes(cmd.toLowerCase());
}

/**
 * Obtenir la liste des commandes désactivées
 */
async function getDisabledCommands() {
  const db = loadDB();
  return db.disabledCommands;
}

/**
 * Rendre une commande privée (owner seulement)
 * @param {string} cmd - Nom de la commande
 */
async function makePrivate(cmd) {
  const db = loadDB();
  
  if (!db.privateCommands.includes(cmd.toLowerCase())) {
    db.privateCommands.push(cmd.toLowerCase());
    saveDB(db);
  }
  return true;
}

/**
 * Rendre une commande publique
 * @param {string} cmd - Nom de la commande
 */
async function makePublic(cmd) {
  const db = loadDB();
  
  db.privateCommands = db.privateCommands.filter(c => c !== cmd.toLowerCase());
  saveDB(db);
  return true;
}

/**
 * Vérifier si une commande est privée
 * @param {string} cmd - Nom de la commande
 */
async function isPrivate(cmd) {
  const db = loadDB();
  return db.privateCommands.includes(cmd.toLowerCase());
}

/**
 * Obtenir la liste des commandes privées
 */
async function getPrivateCommands() {
  const db = loadDB();
  return db.privateCommands;
}

/**
 * Désactiver une commande dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} cmd - Nom de la commande
 */
async function disableInGroup(groupId, cmd) {
  const db = loadDB();
  
  if (!db.groupSettings[groupId]) {
    db.groupSettings[groupId] = { disabled: [] };
  }
  
  if (!db.groupSettings[groupId].disabled.includes(cmd.toLowerCase())) {
    db.groupSettings[groupId].disabled.push(cmd.toLowerCase());
    saveDB(db);
  }
  return true;
}

/**
 * Activer une commande dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} cmd - Nom de la commande
 */
async function enableInGroup(groupId, cmd) {
  const db = loadDB();
  
  if (db.groupSettings[groupId]) {
    db.groupSettings[groupId].disabled = 
      db.groupSettings[groupId].disabled.filter(c => c !== cmd.toLowerCase());
    saveDB(db);
  }
  return true;
}

/**
 * Vérifier si une commande est désactivée dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} cmd - Nom de la commande
 */
async function isDisabledInGroup(groupId, cmd) {
  const db = loadDB();
  return db.groupSettings[groupId]?.disabled?.includes(cmd.toLowerCase()) || false;
}

module.exports = {
  disableCommand,
  enableCommand,
  isCommandDisabled,
  getDisabledCommands,
  makePrivate,
  makePublic,
  isPrivate,
  getPrivateCommands,
  disableInGroup,
  enableInGroup,
  isDisabledInGroup
};

console.log("[DB] ✅ Public/Private Command database chargée");
