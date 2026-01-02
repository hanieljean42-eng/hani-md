/**
 * ═══════════════════════════════════════════════════════════
 * ⚠️ HANI-MD - Warn Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des avertissements utilisateurs
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "warn_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { groups: {}, maxWarns: 3 };
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
 * Ajouter un avertissement
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 * @param {string} reason - Raison du warn
 */
async function addWarn(groupId, jid, reason = "Aucune raison") {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    db.groups[groupId] = {};
  }
  
  if (!db.groups[groupId][jid]) {
    db.groups[groupId][jid] = {
      count: 0,
      warnings: []
    };
  }
  
  db.groups[groupId][jid].count++;
  db.groups[groupId][jid].warnings.push({
    reason,
    date: Date.now()
  });
  
  saveDB(db);
  return db.groups[groupId][jid].count;
}

/**
 * Obtenir le nombre d'avertissements
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getWarns(groupId, jid) {
  const db = loadDB();
  return db.groups[groupId]?.[jid]?.count || 0;
}

/**
 * Obtenir les détails des avertissements
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getWarnDetails(groupId, jid) {
  const db = loadDB();
  return db.groups[groupId]?.[jid] || { count: 0, warnings: [] };
}

/**
 * Réinitialiser les avertissements
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function resetWarns(groupId, jid) {
  const db = loadDB();
  
  if (db.groups[groupId]?.[jid]) {
    delete db.groups[groupId][jid];
    saveDB(db);
  }
  return true;
}

/**
 * Définir le nombre maximum d'avertissements
 * @param {number} max - Nombre maximum
 */
async function setMaxWarns(max) {
  const db = loadDB();
  db.maxWarns = max;
  saveDB(db);
  return true;
}

/**
 * Obtenir le nombre maximum d'avertissements
 */
async function getMaxWarns() {
  const db = loadDB();
  return db.maxWarns || 3;
}

/**
 * Vérifier si l'utilisateur a atteint la limite
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function hasReachedLimit(groupId, jid) {
  const warns = await getWarns(groupId, jid);
  const max = await getMaxWarns();
  return warns >= max;
}

module.exports = {
  addWarn,
  getWarns,
  getWarnDetails,
  resetWarns,
  setMaxWarns,
  getMaxWarns,
  hasReachedLimit
};

console.log("[DB] ✅ Warn database chargée");
