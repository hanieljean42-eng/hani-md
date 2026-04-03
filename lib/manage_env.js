/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - Environment Manager
 * ═══════════════════════════════════════════════════════════
 * Gestion des variables d'environnement
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ENV_PATH = path.join(__dirname, "../.env");

// Configuration par défaut
const DEFAULT_CONFIG = {
  // Bot
  SESSION_ID: "",
  BOT_NAME: "HANI-MD",
  PREFIX: ".",
  OWNER_NAME: "Owner",
  NUMERO_OWNER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467",
  
  // Fonctionnalités
  AUTO_READ: "false",
  AUTO_REACT: "false",
  AUTO_VIEW_STATUS: "false",
  AUTO_REACT_STATUS: "false",
  STATUS_REACTION: "❤️",
  PRESENCE_MODE: "composing",
  
  // Téléchargement
  DL_STATUS: "false",
  
  // Base de données
  DATABASE_URL: "",
  
  // API Keys
  OPENAI_API_KEY: "",
  
  // Web
  PORT: "3000"
};

/**
 * Obtenir une variable d'environnement
 * @param {string} key - Clé de la variable
 * @param {any} defaultValue - Valeur par défaut
 * @returns {string} - Valeur de la variable
 */
function getEnv(key, defaultValue = "") {
  return process.env[key] || DEFAULT_CONFIG[key] || defaultValue;
}

/**
 * Définir une variable d'environnement
 * @param {string} key - Clé de la variable
 * @param {string} value - Valeur
 */
function setEnv(key, value) {
  process.env[key] = value;
}

/**
 * Charger les variables depuis le fichier .env
 */
function loadEnv() {
  try {
    if (fs.existsSync(ENV_PATH)) {
      const envContent = fs.readFileSync(ENV_PATH, "utf8");
      const lines = envContent.split("\n");
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key, ...valueParts] = trimmedLine.split("=");
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          if (key) {
            process.env[key.trim()] = value.trim();
          }
        }
      }
      
      console.log("[ENV] ✅ Variables d'environnement chargées");
    }
  } catch (error) {
    console.error("[ENV] Erreur chargement:", error);
  }
}

/**
 * Sauvegarder les variables dans le fichier .env
 * @param {Object} vars - Variables à sauvegarder
 */
function saveEnv(vars = {}) {
  try {
    let envContent = "";
    
    // Combiner avec les valeurs existantes
    const allVars = { ...DEFAULT_CONFIG, ...vars };
    
    for (const [key, value] of Object.entries(allVars)) {
      if (value !== undefined && value !== null) {
        envContent += `${key}=${value}\n`;
        process.env[key] = value;
      }
    }
    
    fs.writeFileSync(ENV_PATH, envContent);
    console.log("[ENV] ✅ Variables d'environnement sauvegardées");
    
    return true;
  } catch (error) {
    console.error("[ENV] Erreur sauvegarde:", error);
    return false;
  }
}

/**
 * Mettre à jour une variable d'environnement
 * @param {string} key - Clé de la variable
 * @param {string} value - Nouvelle valeur
 */
function updateEnv(key, value) {
  try {
    let envContent = "";
    let updated = false;
    
    if (fs.existsSync(ENV_PATH)) {
      const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith(`${key}=`)) {
          envContent += `${key}=${value}\n`;
          updated = true;
        } else if (trimmedLine) {
          envContent += `${line}\n`;
        }
      }
    }
    
    if (!updated) {
      envContent += `${key}=${value}\n`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim() + "\n");
    process.env[key] = value;
    
    return true;
  } catch (error) {
    console.error("[ENV] Erreur mise à jour:", error);
    return false;
  }
}

/**
 * Obtenir toutes les variables d'environnement du bot
 * @returns {Object} - Variables d'environnement
 */
function getAllEnv() {
  const result = {};
  
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    result[key] = getEnv(key);
  }
  
  return result;
}

/**
 * Supprimer une variable d'environnement
 * @param {string} key - Clé de la variable
 */
function deleteEnv(key) {
  try {
    delete process.env[key];
    
    if (fs.existsSync(ENV_PATH)) {
      const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
      const newLines = lines.filter(line => !line.trim().startsWith(`${key}=`));
      fs.writeFileSync(ENV_PATH, newLines.join("\n"));
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Valider la configuration requise
 * @returns {Object} - Résultat de la validation
 */
function validateConfig() {
  const required = ["SESSION_ID", "NUMERO_OWNER"];
  const missing = [];
  const warnings = [];
  
  for (const key of required) {
    if (!getEnv(key)) {
      missing.push(key);
    }
  }
  
  if (!getEnv("BOT_NAME")) {
    warnings.push("BOT_NAME non défini, utilisation de 'HANI-MD'");
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Obtenir la configuration formatée
 * @returns {string} - Configuration formatée
 */
function getFormattedConfig() {
  let config = "⚙️ *Configuration HANI-MD*\n\n";
  
  config += `🤖 Nom: ${getEnv("BOT_NAME", "HANI-MD")}\n`;
  config += `📌 Préfixe: ${getEnv("PREFIX", ".")}\n`;
  config += `👤 Owner: ${getEnv("OWNER_NAME", "Non défini")}\n`;
  config += `📱 Numéro: ${getEnv("NUMERO_OWNER", "Non défini")}\n\n`;
  
  config += `📖 Auto-Read: ${getEnv("AUTO_READ", "false")}\n`;
  config += `👀 Auto-View Status: ${getEnv("AUTO_VIEW_STATUS", "false")}\n`;
  config += `❤️ Auto-React Status: ${getEnv("AUTO_REACT_STATUS", "false")}\n`;
  config += `💬 Présence: ${getEnv("PRESENCE_MODE", "composing")}\n`;
  
  return config;
}

// Charger au démarrage
loadEnv();

module.exports = {
  getEnv,
  setEnv,
  loadEnv,
  saveEnv,
  updateEnv,
  getAllEnv,
  deleteEnv,
  validateConfig,
  getFormattedConfig,
  DEFAULT_CONFIG
};

console.log("[LIB] ✅ Environment manager chargé");
