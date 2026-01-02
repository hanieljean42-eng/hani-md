/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - WA Config Database
 * ═══════════════════════════════════════════════════════════
 * Gestion de la configuration WhatsApp du bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "wa_config_data.json");

// Configuration par défaut
const DEFAULT_CONFIG = {
  prefix: ".",
  botName: "HANI-MD",
  ownerNumber: "",
  ownerName: "HANIEL",
  mode: "public", // public ou private
  autoRead: false,
  autoTyping: false,
  autoRecording: false,
  presence: "online", // online, offline, composing, recording
  language: "fr",
  timezone: "Africa/Abidjan",
  antiCall: true,
  antiSpam: true,
  welcomeMessage: true,
  goodbyeMessage: true
};

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { config: { ...DEFAULT_CONFIG } };
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
 * Obtenir la configuration complète
 */
async function getConfig() {
  const db = loadDB();
  return { ...DEFAULT_CONFIG, ...db.config };
}

/**
 * Obtenir une valeur de configuration
 * @param {string} key - Clé de configuration
 */
async function getConfigValue(key) {
  const config = await getConfig();
  return config[key];
}

/**
 * Définir une valeur de configuration
 * @param {string} key - Clé de configuration
 * @param {any} value - Valeur
 */
async function setConfigValue(key, value) {
  const db = loadDB();
  db.config[key] = value;
  saveDB(db);
  return true;
}

/**
 * Mettre à jour plusieurs valeurs
 * @param {Object} values - Valeurs à mettre à jour
 */
async function updateConfig(values) {
  const db = loadDB();
  db.config = { ...db.config, ...values };
  saveDB(db);
  return db.config;
}

/**
 * Réinitialiser la configuration
 */
async function resetConfig() {
  const db = { config: { ...DEFAULT_CONFIG } };
  saveDB(db);
  return db.config;
}

/**
 * Obtenir le préfixe
 */
async function getPrefix() {
  const config = await getConfig();
  return config.prefix || ".";
}

/**
 * Définir le préfixe
 * @param {string} prefix - Nouveau préfixe
 */
async function setPrefix(prefix) {
  return setConfigValue("prefix", prefix);
}

/**
 * Obtenir le mode du bot
 */
async function getMode() {
  const config = await getConfig();
  return config.mode || "public";
}

/**
 * Définir le mode du bot
 * @param {string} mode - Mode (public/private)
 */
async function setMode(mode) {
  return setConfigValue("mode", mode);
}

/**
 * Vérifier si le bot est en mode public
 */
async function isPublic() {
  const mode = await getMode();
  return mode === "public";
}

module.exports = {
  getConfig,
  getConfigValue,
  setConfigValue,
  updateConfig,
  resetConfig,
  getPrefix,
  setPrefix,
  getMode,
  setMode,
  isPublic,
  DEFAULT_CONFIG
};

console.log("[DB] ✅ WA Config database chargée");
