/**
 * ═══════════════════════════════════════════════════════════
 * 🚫 HANI-MD - Ban Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des utilisateurs bannis
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "banned.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { users: [], groups: {} };
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
 * Bannir un utilisateur globalement
 * @param {string} jid - JID de l'utilisateur
 * @param {string} reason - Raison du ban
 */
async function banUser(jid, reason = "Aucune raison spécifiée") {
  const db = loadDB();
  
  const exists = db.users.find(u => u.jid === jid);
  if (!exists) {
    db.users.push({
      jid,
      reason,
      bannedAt: Date.now()
    });
    saveDB(db);
  }
  return true;
}

/**
 * Débannir un utilisateur
 * @param {string} jid - JID de l'utilisateur
 */
async function unbanUser(jid) {
  const db = loadDB();
  
  db.users = db.users.filter(u => u.jid !== jid);
  saveDB(db);
  return true;
}

/**
 * Vérifier si un utilisateur est banni
 * @param {string} jid - JID de l'utilisateur
 */
async function isBanned(jid) {
  const db = loadDB();
  return db.users.some(u => u.jid === jid);
}

/**
 * Obtenir la liste des bannis
 */
async function getBannedUsers() {
  const db = loadDB();
  return db.users;
}

/**
 * Bannir un utilisateur dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 * @param {string} reason - Raison du ban
 */
async function banInGroup(groupId, jid, reason = "Aucune raison") {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    db.groups[groupId] = [];
  }
  
  const exists = db.groups[groupId].find(u => u.jid === jid);
  if (!exists) {
    db.groups[groupId].push({
      jid,
      reason,
      bannedAt: Date.now()
    });
    saveDB(db);
  }
  return true;
}

/**
 * Débannir un utilisateur d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function unbanInGroup(groupId, jid) {
  const db = loadDB();
  
  if (db.groups[groupId]) {
    db.groups[groupId] = db.groups[groupId].filter(u => u.jid !== jid);
    saveDB(db);
  }
  return true;
}

/**
 * Vérifier si un utilisateur est banni dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function isBannedInGroup(groupId, jid) {
  const db = loadDB();
  return db.groups[groupId]?.some(u => u.jid === jid) || false;
}

module.exports = {
  banUser,
  unbanUser,
  isBanned,
  getBannedUsers,
  banInGroup,
  unbanInGroup,
  isBannedInGroup
};

console.log("[DB] ✅ Ban database chargée");
