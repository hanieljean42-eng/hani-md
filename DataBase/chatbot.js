/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Chatbot Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des paramètres chatbot par groupe/utilisateur
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "chatbot_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { groups: {}, users: {} };
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
 * Obtenir les paramètres chatbot d'un groupe
 * @param {string} groupId - ID du groupe
 */
async function getChatbotSettings(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { 
    enabled: false, 
    language: "fr",
    provider: "openai"
  };
}

/**
 * Définir les paramètres chatbot d'un groupe
 * @param {string} groupId - ID du groupe
 * @param {Object} settings - Paramètres
 */
async function setChatbotSettings(groupId, settings) {
  const db = loadDB();
  
  db.groups[groupId] = {
    ...db.groups[groupId],
    ...settings
  };
  
  saveDB(db);
  return db.groups[groupId];
}

/**
 * Activer/désactiver le chatbot
 * @param {string} groupId - ID du groupe
 * @param {boolean} enabled - Activer ou non
 */
async function toggleChatbot(groupId, enabled) {
  return setChatbotSettings(groupId, { enabled });
}

/**
 * Vérifier si le chatbot est activé pour un groupe
 * @param {string} groupId - ID du groupe
 */
async function isChatbotEnabled(groupId) {
  const settings = await getChatbotSettings(groupId);
  return settings.enabled;
}

/**
 * Définir la langue du chatbot
 * @param {string} groupId - ID du groupe
 * @param {string} language - Code langue (fr, en, etc.)
 */
async function setChatbotLanguage(groupId, language) {
  return setChatbotSettings(groupId, { language });
}

module.exports = {
  getChatbotSettings,
  setChatbotSettings,
  toggleChatbot,
  isChatbotEnabled,
  setChatbotLanguage
};

console.log("[DB] ✅ Chatbot database chargée");
