/**
 * ═══════════════════════════════════════════════════════════
 * 🏆 HANI-MD - Levels Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des niveaux et de l'XP des utilisateurs
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "levels_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { groups: {}, settings: {} };
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
 * Obtenir un utilisateur de niveau
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getLevelUser(groupId, jid) {
  const db = loadDB();
  return db.groups[groupId]?.[jid] || null;
}

/**
 * Mettre à jour l'XP d'un utilisateur
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 * @param {number} xpToAdd - XP à ajouter
 */
async function updateUserXP(groupId, jid, xpToAdd) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    db.groups[groupId] = {};
  }
  
  if (!db.groups[groupId][jid]) {
    db.groups[groupId][jid] = {
      jid,
      xp: 0,
      messages: 0,
      lastMessage: 0
    };
  }
  
  db.groups[groupId][jid].xp += xpToAdd;
  db.groups[groupId][jid].messages++;
  db.groups[groupId][jid].lastMessage = Date.now();
  
  saveDB(db);
  return db.groups[groupId][jid].xp;
}

/**
 * Obtenir les paramètres de rang d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getRankSettings(groupId) {
  const db = loadDB();
  return db.settings[groupId] || { enabled: false };
}

/**
 * Définir les paramètres de rang d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setRankSettings(groupId, settings) {
  const db = loadDB();
  
  db.settings[groupId] = {
    ...db.settings[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.settings[groupId];
}

/**
 * Activer/désactiver le système de niveaux
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleRankSystem(groupId, enabled) {
  return setRankSettings(groupId, { enabled });
}

/**
 * Obtenir le classement d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {number} limit - Nombre d'utilisateurs
 */
async function getGroupLeaderboard(groupId, limit = 10) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    return [];
  }
  
  const users = Object.values(db.groups[groupId])
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
  
  return users;
}

/**
 * Obtenir le rang d'un utilisateur dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getUserRank(groupId, jid) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    return { rank: 0, total: 0 };
  }
  
  const users = Object.values(db.groups[groupId])
    .sort((a, b) => b.xp - a.xp);
  
  const rank = users.findIndex(u => u.jid === jid) + 1;
  
  return {
    rank: rank || 0,
    total: users.length
  };
}

/**
 * Réinitialiser l'XP d'un utilisateur
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function resetUserXP(groupId, jid) {
  const db = loadDB();
  
  if (db.groups[groupId]?.[jid]) {
    db.groups[groupId][jid].xp = 0;
    db.groups[groupId][jid].messages = 0;
    saveDB(db);
    return true;
  }
  
  return false;
}

/**
 * Réinitialiser tous les niveaux d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function resetGroupLevels(groupId) {
  const db = loadDB();
  
  if (db.groups[groupId]) {
    db.groups[groupId] = {};
    saveDB(db);
    return true;
  }
  
  return false;
}

/**
 * Définir l'XP d'un utilisateur
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 * @param {number} xp - XP à définir
 */
async function setUserXP(groupId, jid, xp) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    db.groups[groupId] = {};
  }
  
  if (!db.groups[groupId][jid]) {
    db.groups[groupId][jid] = {
      jid,
      xp: 0,
      messages: 0,
      lastMessage: Date.now()
    };
  }
  
  db.groups[groupId][jid].xp = xp;
  saveDB(db);
  
  return db.groups[groupId][jid];
}

module.exports = {
  getLevelUser,
  updateUserXP,
  getRankSettings,
  setRankSettings,
  toggleRankSystem,
  getGroupLeaderboard,
  getUserRank,
  resetUserXP,
  resetGroupLevels,
  setUserXP
};

console.log("[DB] ✅ Levels database chargée");
