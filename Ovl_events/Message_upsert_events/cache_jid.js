/**
 * ═══════════════════════════════════════════════════════════
 * 📋 HANI-MD - Cache JID
 * ═══════════════════════════════════════════════════════════
 * Met en cache les JIDs des contacts pour performances
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "../../lib/cache_jid.json");

// Cache en mémoire
let jidCache = {};

/**
 * Charger le cache depuis le fichier
 */
function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      jidCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch (e) {
    jidCache = {};
  }
}

/**
 * Sauvegarder le cache
 */
function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(jidCache, null, 2));
  } catch (e) {}
}

// Charger au démarrage
loadCache();

/**
 * Gestionnaire cache JID
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const { auteur_Msg } = options;
    
    // Extraire le JID
    const jid = auteur_Msg;
    const number = jid.split("@")[0];
    
    // Récupérer le pushName
    const pushName = msg.pushName || "Utilisateur";
    
    // Mettre en cache
    if (!jidCache[number] || jidCache[number].name !== pushName) {
      jidCache[number] = {
        jid,
        name: pushName,
        lastSeen: Date.now()
      };
      
      // Sauvegarder périodiquement (toutes les 100 mises à jour)
      if (Math.random() < 0.01) {
        saveCache();
      }
    }
    
  } catch (error) {
    // Silently ignore
  }
}

/**
 * Obtenir le nom d'un JID depuis le cache
 */
function getName(jid) {
  const number = jid?.split("@")[0];
  return jidCache[number]?.name || null;
}

/**
 * Obtenir le JID depuis un numéro
 */
function getJid(number) {
  const cleanNumber = number.replace(/[^0-9]/g, "");
  return jidCache[cleanNumber]?.jid || `${cleanNumber}@s.whatsapp.net`;
}

module.exports = { 
  handle, 
  getName, 
  getJid,
  getCache: () => jidCache
};
