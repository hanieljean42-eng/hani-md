/**
 * ═══════════════════════════════════════════════════════════
 * 🏆 HANI-MD - Rank Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des rangs et classements
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "rank_data.json");

// Définition des rangs
const RANKS = [
  { name: "Débutant", minXp: 0, emoji: "🌱" },
  { name: "Amateur", minXp: 100, emoji: "🌿" },
  { name: "Apprenti", minXp: 500, emoji: "🍀" },
  { name: "Confirmé", minXp: 1000, emoji: "⭐" },
  { name: "Expert", minXp: 2500, emoji: "🌟" },
  { name: "Maître", minXp: 5000, emoji: "💫" },
  { name: "Grand Maître", minXp: 10000, emoji: "✨" },
  { name: "Légende", minXp: 25000, emoji: "👑" },
  { name: "Mythique", minXp: 50000, emoji: "🏆" },
  { name: "Divin", minXp: 100000, emoji: "⚡" }
];

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
 * Obtenir le rang d'un utilisateur selon son XP
 * @param {number} xp - Points d'expérience
 */
function getRankFromXP(xp) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) {
      rank = r;
    }
  }
  return rank;
}

/**
 * Obtenir le classement d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {number} limit - Limite de résultats
 */
async function getLeaderboard(groupId, limit = 10) {
  const db = loadDB();
  
  if (!db.groups[groupId]) {
    return [];
  }
  
  const users = Object.entries(db.groups[groupId])
    .map(([jid, data]) => ({ jid, ...data }))
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, limit);
  
  return users.map((u, index) => ({
    ...u,
    rank: getRankFromXP(u.xp || 0),
    position: index + 1
  }));
}

/**
 * Obtenir le rang d'un utilisateur dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {string} jid - JID de l'utilisateur
 */
async function getUserRank(groupId, jid) {
  const db = loadDB();
  
  if (!db.groups[groupId]?.[jid]) {
    return null;
  }
  
  const userData = db.groups[groupId][jid];
  const rank = getRankFromXP(userData.xp || 0);
  
  // Calculer la position
  const allUsers = Object.entries(db.groups[groupId])
    .map(([id, data]) => ({ jid: id, xp: data.xp || 0 }))
    .sort((a, b) => b.xp - a.xp);
  
  const position = allUsers.findIndex(u => u.jid === jid) + 1;
  
  return {
    ...userData,
    rank,
    position,
    total: allUsers.length
  };
}

/**
 * Activer/désactiver le système de rang dans un groupe
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleRankSystem(groupId, enabled) {
  const db = loadDB();
  
  if (!db.settings[groupId]) {
    db.settings[groupId] = {};
  }
  
  db.settings[groupId].enabled = enabled;
  saveDB(db);
  return true;
}

/**
 * Vérifier si le système de rang est activé
 * @param {string} groupId - ID du groupe
 */
async function isRankEnabled(groupId) {
  const db = loadDB();
  return db.settings[groupId]?.enabled ?? true;
}

/**
 * Obtenir tous les rangs disponibles
 */
function getAllRanks() {
  return RANKS;
}

module.exports = {
  getRankFromXP,
  getLeaderboard,
  getUserRank,
  toggleRankSystem,
  isRankEnabled,
  getAllRanks,
  RANKS
};

console.log("[DB] ✅ Rank database chargée");
