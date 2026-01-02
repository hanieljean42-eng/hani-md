/**
 * ═══════════════════════════════════════════════════════════
 * 🎨 HANI-MD - Stick Command Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des commandes de stickers personnalisés
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "stick_cmd_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { stickers: {}, global: {} };
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
 * Ajouter une commande sticker
 * @param {string} cmd - Nom de la commande
 * @param {string} stickerData - Données du sticker (base64 ou URL)
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function addStickerCmd(cmd, stickerData, groupId = null) {
  const db = loadDB();
  
  const sticker = {
    cmd: cmd.toLowerCase(),
    data: stickerData,
    createdAt: Date.now()
  };
  
  if (groupId) {
    if (!db.stickers[groupId]) {
      db.stickers[groupId] = {};
    }
    db.stickers[groupId][cmd.toLowerCase()] = sticker;
  } else {
    db.global[cmd.toLowerCase()] = sticker;
  }
  
  saveDB(db);
  return sticker;
}

/**
 * Supprimer une commande sticker
 * @param {string} cmd - Nom de la commande
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function removeStickerCmd(cmd, groupId = null) {
  const db = loadDB();
  
  if (groupId && db.stickers[groupId]) {
    delete db.stickers[groupId][cmd.toLowerCase()];
  } else {
    delete db.global[cmd.toLowerCase()];
  }
  
  saveDB(db);
  return true;
}

/**
 * Obtenir une commande sticker
 * @param {string} cmd - Nom de la commande
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function getStickerCmd(cmd, groupId = null) {
  const db = loadDB();
  
  // Chercher d'abord dans le groupe
  if (groupId && db.stickers[groupId]?.[cmd.toLowerCase()]) {
    return db.stickers[groupId][cmd.toLowerCase()];
  }
  
  // Sinon chercher dans les globaux
  return db.global[cmd.toLowerCase()] || null;
}

/**
 * Obtenir toutes les commandes sticker
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function getAllStickerCmds(groupId = null) {
  const db = loadDB();
  
  const global = Object.values(db.global);
  const group = groupId ? Object.values(db.stickers[groupId] || {}) : [];
  
  return [...global, ...group];
}

/**
 * Vérifier si une commande sticker existe
 * @param {string} cmd - Nom de la commande
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function stickerCmdExists(cmd, groupId = null) {
  const sticker = await getStickerCmd(cmd, groupId);
  return sticker !== null;
}

module.exports = {
  addStickerCmd,
  removeStickerCmd,
  getStickerCmd,
  getAllStickerCmds,
  stickerCmdExists
};

console.log("[DB] ✅ Stick Command database chargée");
