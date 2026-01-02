/**
 * ═══════════════════════════════════════════════════════════
 * 🔌 HANI-MD - Connect Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des connexions et authentification
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "connect_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { 
    connections: [], 
    stats: { 
      totalConnections: 0, 
      lastConnection: null 
    } 
  };
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
 * Enregistrer une nouvelle connexion
 * @param {Object} info - Informations de connexion
 */
async function logConnection(info) {
  const db = loadDB();
  
  const connection = {
    id: Date.now().toString(36),
    timestamp: Date.now(),
    ...info
  };
  
  db.connections.push(connection);
  db.stats.totalConnections++;
  db.stats.lastConnection = Date.now();
  
  // Garder seulement les 100 dernières connexions
  if (db.connections.length > 100) {
    db.connections = db.connections.slice(-100);
  }
  
  saveDB(db);
  return connection;
}

/**
 * Obtenir les statistiques de connexion
 */
async function getConnectionStats() {
  const db = loadDB();
  return db.stats;
}

/**
 * Obtenir l'historique des connexions
 * @param {number} limit - Limite de résultats
 */
async function getConnectionHistory(limit = 20) {
  const db = loadDB();
  return db.connections.slice(-limit).reverse();
}

/**
 * Vérifier si une connexion est active
 */
async function isConnected() {
  const db = loadDB();
  const lastConn = db.stats.lastConnection;
  
  if (!lastConn) return false;
  
  // Considérer actif si dernière connexion < 5 min
  const fiveMinutes = 5 * 60 * 1000;
  return (Date.now() - lastConn) < fiveMinutes;
}

/**
 * Mettre à jour le statut de connexion
 * @param {string} status - Statut (online, offline, connecting)
 */
async function updateStatus(status) {
  const db = loadDB();
  db.stats.status = status;
  db.stats.statusUpdatedAt = Date.now();
  saveDB(db);
  return true;
}

/**
 * Obtenir le statut actuel
 */
async function getStatus() {
  const db = loadDB();
  return db.stats.status || "offline";
}

module.exports = {
  logConnection,
  getConnectionStats,
  getConnectionHistory,
  isConnected,
  updateStatus,
  getStatus
};

console.log("[DB] ✅ Connect database chargée");
