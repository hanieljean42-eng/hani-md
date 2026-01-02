/**
 * ═══════════════════════════════════════════════════════════
 * 🔑 HANI-MD - Session Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des sessions du bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "session_data.json");
const SESSION_DIR = path.join(process.cwd(), "session_principale");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { sessions: {}, current: null };
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
 * Obtenir la session actuelle
 */
async function getCurrentSession() {
  const db = loadDB();
  return db.current;
}

/**
 * Définir la session actuelle
 * @param {string} sessionId - ID de la session
 */
async function setCurrentSession(sessionId) {
  const db = loadDB();
  db.current = sessionId;
  saveDB(db);
  return true;
}

/**
 * Enregistrer une session
 * @param {string} sessionId - ID de la session
 * @param {Object} info - Informations de session
 */
async function saveSession(sessionId, info) {
  const db = loadDB();
  
  db.sessions[sessionId] = {
    id: sessionId,
    createdAt: Date.now(),
    ...info
  };
  
  saveDB(db);
  return db.sessions[sessionId];
}

/**
 * Obtenir toutes les sessions
 */
async function getAllSessions() {
  const db = loadDB();
  return Object.values(db.sessions);
}

/**
 * Supprimer une session
 * @param {string} sessionId - ID de la session
 */
async function deleteSession(sessionId) {
  const db = loadDB();
  
  if (db.sessions[sessionId]) {
    delete db.sessions[sessionId];
    saveDB(db);
  }
  return true;
}

/**
 * Vérifier si la session existe
 */
async function sessionExists() {
  try {
    const credsPath = path.join(SESSION_DIR, "creds.json");
    return fs.existsSync(credsPath);
  } catch (e) {
    return false;
  }
}

/**
 * Obtenir le chemin de la session
 */
function getSessionPath() {
  return SESSION_DIR;
}

module.exports = {
  getCurrentSession,
  setCurrentSession,
  saveSession,
  getAllSessions,
  deleteSession,
  sessionExists,
  getSessionPath
};

console.log("[DB] ✅ Session database chargée");
