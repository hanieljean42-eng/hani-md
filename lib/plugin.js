/**
 * ═══════════════════════════════════════════════════════════
 * 🔌 HANI-MD - Plugin Manager
 * ═══════════════════════════════════════════════════════════
 * Gestion dynamique des plugins externes
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getPluginDB, addPlugin, removePlugin, listPlugins } = require("../DataBase/plugin");

// Dossier des plugins
const PLUGINS_DIR = path.join(__dirname, "../plugins");

// Créer le dossier si nécessaire
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

// Cache des plugins chargés
const loadedPlugins = new Map();

/**
 * Charger un plugin depuis un fichier
 * @param {string} filename - Nom du fichier plugin
 */
async function loadPlugin(filename) {
  try {
    const pluginPath = path.join(PLUGINS_DIR, filename);
    
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin non trouvé: ${filename}`);
    }
    
    // Supprimer du cache require
    delete require.cache[require.resolve(pluginPath)];
    
    // Charger le plugin
    const plugin = require(pluginPath);
    
    // Valider le plugin
    if (!plugin.name || !plugin.execute) {
      throw new Error(`Plugin invalide: doit avoir 'name' et 'execute'`);
    }
    
    loadedPlugins.set(plugin.name, plugin);
    console.log(`[PLUGIN] ✅ ${plugin.name} chargé`);
    
    return plugin;
    
  } catch (error) {
    console.error(`[PLUGIN] ❌ Erreur chargement ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Charger tous les plugins du dossier
 */
async function loadAllPlugins() {
  try {
    const files = fs.readdirSync(PLUGINS_DIR)
      .filter(f => f.endsWith(".js"));
    
    let loaded = 0;
    let failed = 0;
    
    for (const file of files) {
      try {
        await loadPlugin(file);
        loaded++;
      } catch (e) {
        failed++;
      }
    }
    
    console.log(`[PLUGIN] ${loaded} plugins chargés, ${failed} échoués`);
    return { loaded, failed };
    
  } catch (error) {
    console.error("[PLUGIN] Erreur chargement plugins:", error);
    return { loaded: 0, failed: 0 };
  }
}

/**
 * Installer un plugin depuis une URL
 * @param {string} url - URL du plugin
 * @param {string} name - Nom à donner au plugin
 */
async function installPlugin(url, name) {
  try {
    // Télécharger le plugin
    const response = await axios.get(url, { timeout: 30000 });
    const code = response.data;
    
    // Valider le code (basique)
    if (typeof code !== "string" || !code.includes("module.exports")) {
      throw new Error("Code de plugin invalide");
    }
    
    // Nom de fichier sécurisé
    const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.js`;
    const pluginPath = path.join(PLUGINS_DIR, filename);
    
    // Sauvegarder
    fs.writeFileSync(pluginPath, code);
    
    // Charger le plugin
    const plugin = await loadPlugin(filename);
    
    // Ajouter à la base de données
    await addPlugin({
      name: plugin.name,
      filename,
      url,
      installedAt: Date.now()
    });
    
    return plugin;
    
  } catch (error) {
    console.error("[PLUGIN] Erreur installation:", error);
    throw error;
  }
}

/**
 * Désinstaller un plugin
 * @param {string} name - Nom du plugin
 */
async function uninstallPlugin(name) {
  try {
    // Trouver le plugin
    const plugins = await listPlugins();
    const plugin = plugins.find(p => p.name === name);
    
    if (!plugin) {
      throw new Error(`Plugin non trouvé: ${name}`);
    }
    
    // Supprimer le fichier
    const pluginPath = path.join(PLUGINS_DIR, plugin.filename);
    if (fs.existsSync(pluginPath)) {
      fs.unlinkSync(pluginPath);
    }
    
    // Supprimer du cache
    loadedPlugins.delete(name);
    
    // Supprimer de la base de données
    await removePlugin(name);
    
    console.log(`[PLUGIN] 🗑️ ${name} désinstallé`);
    return true;
    
  } catch (error) {
    console.error("[PLUGIN] Erreur désinstallation:", error);
    throw error;
  }
}

/**
 * Exécuter un plugin
 * @param {string} name - Nom du plugin
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message
 * @param {Object} options - Options
 */
async function executePlugin(name, ovl, msg, options) {
  try {
    const plugin = loadedPlugins.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin non chargé: ${name}`);
    }
    
    return await plugin.execute(ovl, msg, options);
    
  } catch (error) {
    console.error(`[PLUGIN] Erreur exécution ${name}:`, error);
    throw error;
  }
}

/**
 * Obtenir la liste des plugins chargés
 */
function getLoadedPlugins() {
  return Array.from(loadedPlugins.values()).map(p => ({
    name: p.name,
    description: p.description || "Pas de description",
    commands: p.commands || []
  }));
}

/**
 * Vérifier si un plugin gère une commande
 * @param {string} command - Commande à vérifier
 */
function findPluginForCommand(command) {
  for (const [name, plugin] of loadedPlugins) {
    if (plugin.commands && plugin.commands.includes(command)) {
      return plugin;
    }
  }
  return null;
}

module.exports = {
  loadPlugin,
  loadAllPlugins,
  installPlugin,
  uninstallPlugin,
  executePlugin,
  getLoadedPlugins,
  findPluginForCommand,
  PLUGINS_DIR
};

console.log("[LIB] ✅ Plugin manager chargé");
