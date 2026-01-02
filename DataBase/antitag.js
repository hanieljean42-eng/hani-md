/**
 * ═══════════════════════════════════════════════════════════
 * 🏷️ HANI-MD - Anti-Tag Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres anti-tag par groupe
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "antitag_data.json");

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
 * Obtenir les paramètres anti-tag d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getAntitagSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { 
    enabled: false, 
    action: "warn"
  };
}

/**
 * Définir les paramètres anti-tag d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setAntitagSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver l'anti-tag
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleAntitag(groupId, enabled) {
  return setAntitagSettings(groupId, { enabled });
}

/**
 * Définir l'action anti-tag
 * @param {string} groupId - ID du groupe
 * @param {string} action - Action (warn, kick)
 */
async function setAntitagAction(groupId, action) {
  return setAntitagSettings(groupId, { action });
}

module.exports = {
  getAntitagSettings,
  setAntitagSettings,
  toggleAntitag,
  setAntitagAction
};

console.log("[DB] ✅ Antitag database chargée");
