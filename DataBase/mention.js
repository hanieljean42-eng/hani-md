/**
 * ═══════════════════════════════════════════════════════════
 * 📢 HANI-MD - Mention Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres de mention (quand le bot est tagué)
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "mention_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { settings: {}, messages: {} };
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
 * Obtenir les paramètres de mention
 * @param {string} groupId - ID du groupe (optionnel)
 */
async function getMentionSettings(groupId = "global") {
  const db = loadDB();
  return db.settings[groupId] || { 
    enabled: true, 
    message: "Salut ! Je suis HANI-MD. Tape .menu pour voir mes commandes.",
    replyOnlyInGroup: false
  };
}

/**
 * Définir les paramètres de mention
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setMentionSettings(groupId = "global", settings) {
  const db = loadDB();
  
  db.settings[groupId] = {
    ...db.settings[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.settings[groupId];
}

/**
 * Activer/désactiver la réponse aux mentions
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleMention(groupId = "global", enabled) {
  return setMentionSettings(groupId, { enabled });
}

/**
 * Définir le message de réponse aux mentions
 * @param {string} groupId - ID du groupe
 * @param {string} message - Message de réponse
 */
async function setMentionMessage(groupId = "global", message) {
  return setMentionSettings(groupId, { message });
}

/**
 * Vérifier si les mentions sont activées
 * @param {string} groupId - ID du groupe
 */
async function isMentionEnabled(groupId = "global") {
  const settings = await getMentionSettings(groupId);
  return settings.enabled;
}

module.exports = {
  getMentionSettings,
  setMentionSettings,
  toggleMention,
  setMentionMessage,
  isMentionEnabled
};

console.log("[DB] ✅ Mention database chargée");
