/**
 * ═══════════════════════════════════════════════════════════
 * 🔗 HANI-MD - Anti-Link Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres anti-lien par groupe
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "antilink_data.json");

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
 * Obtenir les paramètres anti-lien d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getAntilinkSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { 
    enabled: false, 
    mode: "all", 
    maxWarnings: 3,
    warnings: {}
  };
}

/**
 * Définir les paramètres anti-lien d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setAntilinkSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver l'anti-lien
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleAntilink(groupId, enabled) {
  return setAntilinkSettings(groupId, { enabled });
}

/**
 * Définir le mode anti-lien
 * @param {string} groupId - ID du groupe
 * @param {string} mode - Mode (all, whatsapp, telegram, discord)
 */
async function setAntilinkMode(groupId, mode) {
  return setAntilinkSettings(groupId, { mode });
}

/**
 * Ajouter un avertissement
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function addWarning(groupId, jid) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    db.groups[groupId] = { enabled: false, mode: "all", maxWarnings: 3, warnings: {} };
  }
  
  if (!db.groups[groupId].warnings) {
    db.groups[groupId].warnings = {};
  }
  
  db.groups[groupId].warnings[jid] = (db.groups[groupId].warnings[jid] || 0) + 1;
  saveDB(db);
  
  return db.groups[groupId].warnings[jid];
}

/**
 * Réinitialiser les avertissements d'un utilisateur
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function resetWarnings(groupId, jid) {
  const db = loadDB();
  
  if (db.groups[groupId]?.warnings?.[jid]) {
    delete db.groups[groupId].warnings[jid];
    saveDB(db);
  }
  
  return true;
}

/**
 * Obtenir le nombre d'avertissements
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getWarnings(groupId, jid) {
  const db = loadDB();
  return db.groups[groupId]?.warnings?.[jid] || 0;
}

module.exports = {
  getAntilinkSettings,
  setAntilinkSettings,
  toggleAntilink,
  setAntilinkMode,
  addWarning,
  resetWarnings,
  getWarnings
};

console.log("[DB] ✅ Antilink database chargée");
