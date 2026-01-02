/**
 * ═══════════════════════════════════════════════════════════
 * 📢 HANI-MD - Anti-Mention Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres anti-mention par groupe
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "antimention_data.json");

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
 * Obtenir les paramètres anti-mention d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getAntimentionSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { 
    enabled: false, 
    maxMentions: 5,
    action: "warn"
  };
}

/**
 * Définir les paramètres anti-mention d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setAntimentionSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver l'anti-mention
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleAntimention(groupId, enabled) {
  return setAntimentionSettings(groupId, { enabled });
}

/**
 * Définir le nombre maximum de mentions
 * @param {string} groupId - ID du groupe
 * @param {number} max - Maximum de mentions
 */
async function setMaxMentions(groupId, max) {
  return setAntimentionSettings(groupId, { maxMentions: max });
}

module.exports = {
  getAntimentionSettings,
  setAntimentionSettings,
  toggleAntimention,
  setMaxMentions
};

console.log("[DB] ✅ Antimention database chargée");
