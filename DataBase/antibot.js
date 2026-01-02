/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Anti-Bot Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres anti-bot par groupe
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "antibot_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { groups: {} };
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
 * Obtenir les paramètres anti-bot d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getAntibotSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { enabled: false, action: "warn" };
}

/**
 * Définir les paramètres anti-bot d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setAntibotSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver l'anti-bot
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleAntibot(groupId, enabled) {
  return setAntibotSettings(groupId, { enabled });
}

/**
 * Définir l'action anti-bot
 * @param {string} groupId - ID du groupe
 * @param {string} action - Action (warn, kick)
 */
async function setAntibotAction(groupId, action) {
  return setAntibotSettings(groupId, { action });
}

/**
 * Obtenir tous les groupes avec anti-bot activé
 */
async function getActiveAntibotGroups() {
  const db = loadDB();
  
  return Object.entries(db.groups)
    .filter(([_, settings]) => settings.enabled)
    .map(([groupId, settings]) => ({ groupId, ...settings }));
}

/**
 * Réinitialiser les paramètres anti-bot d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function resetAntibotSettings(groupId) {
  const db = loadDB();
  
  if (db.groups[groupId]) {
    delete db.groups[groupId];
    saveDB(db);
    return true;
  }
  
  return false;
}

module.exports = {
  getAntibotSettings,
  setAntibotSettings,
  toggleAntibot,
  setAntibotAction,
  getActiveAntibotGroups,
  resetAntibotSettings
};

console.log("[DB] ✅ Antibot database chargée");
