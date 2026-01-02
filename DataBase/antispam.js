/**
 * ═══════════════════════════════════════════════════════════
 * 🚫 HANI-MD - Anti-Spam Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres anti-spam par groupe
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "antispam_data.json");

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
 * Obtenir les paramètres anti-spam d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getAntispamSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { 
    enabled: false, 
    threshold: 10,
    maxWarnings: 3,
    action: "mute"
  };
}

/**
 * Définir les paramètres anti-spam d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setAntispamSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver l'anti-spam
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleAntispam(groupId, enabled) {
  return setAntispamSettings(groupId, { enabled });
}

/**
 * Définir le seuil de spam
 * @param {string} groupId - ID du groupe
 * @param {number} threshold - Nombre de messages par minute
 */
async function setSpamThreshold(groupId, threshold) {
  return setAntispamSettings(groupId, { threshold });
}

/**
 * Définir l'action anti-spam
 * @param {string} groupId - ID du groupe
 * @param {string} action - Action (warn, mute, kick)
 */
async function setSpamAction(groupId, action) {
  return setAntispamSettings(groupId, { action });
}

module.exports = {
  getAntispamSettings,
  setAntispamSettings,
  toggleAntispam,
  setSpamThreshold,
  setSpamAction
};

console.log("[DB] ✅ Antispam database chargée");
