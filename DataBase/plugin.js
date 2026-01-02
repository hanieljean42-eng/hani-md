/**
 * ═══════════════════════════════════════════════════════════
 * 🔌 HANI-MD - Plugin Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des plugins externes du bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "plugin_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { plugins: {}, disabled: [] };
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
 * Ajouter un plugin
 * @param {string} name - Nom du plugin
 * @param {Object} info - Informations du plugin
 */
async function addPlugin(name, info) {
  const db = loadDB();
  
  db.plugins[name] = {
    name,
    url: info.url || "",
    createdAt: Date.now(),
    ...info
  };
  
  saveDB(db);
  return db.plugins[name];
}

/**
 * Supprimer un plugin
 * @param {string} name - Nom du plugin
 */
async function removePlugin(name) {
  const db = loadDB();
  
  if (db.plugins[name]) {
    delete db.plugins[name];
    saveDB(db);
    return true;
  }
  return false;
}

/**
 * Obtenir tous les plugins
 */
async function getAllPlugins() {
  const db = loadDB();
  return Object.values(db.plugins);
}

/**
 * Obtenir un plugin par nom
 * @param {string} name - Nom du plugin
 */
async function getPlugin(name) {
  const db = loadDB();
  return db.plugins[name] || null;
}

/**
 * Désactiver un plugin
 * @param {string} name - Nom du plugin
 */
async function disablePlugin(name) {
  const db = loadDB();
  
  if (!db.disabled.includes(name)) {
    db.disabled.push(name);
    saveDB(db);
  }
  return true;
}

/**
 * Activer un plugin
 * @param {string} name - Nom du plugin
 */
async function enablePlugin(name) {
  const db = loadDB();
  
  db.disabled = db.disabled.filter(p => p !== name);
  saveDB(db);
  return true;
}

/**
 * Vérifier si un plugin est désactivé
 * @param {string} name - Nom du plugin
 */
async function isPluginDisabled(name) {
  const db = loadDB();
  return db.disabled.includes(name);
}

module.exports = {
  addPlugin,
  removePlugin,
  getAllPlugins,
  getPlugin,
  disablePlugin,
  enablePlugin,
  isPluginDisabled
};

console.log("[DB] ✅ Plugin database chargée");
