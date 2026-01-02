/**
 * ═══════════════════════════════════════════════════════════
 * 👑 HANI-MD - Sudo Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des utilisateurs sudo (super admin)
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "sudo_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { sudos: [] };
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
 * Ajouter un sudo
 * @param {string} jid - JID de l'utilisateur
 */
async function addSudo(jid) {
  const db = loadDB();
  
  if (!db.sudos.includes(jid)) {
    db.sudos.push(jid);
    saveDB(db);
  }
  return true;
}

/**
 * Supprimer un sudo
 * @param {string} jid - JID de l'utilisateur
 */
async function removeSudo(jid) {
  const db = loadDB();
  
  db.sudos = db.sudos.filter(s => s !== jid);
  saveDB(db);
  return true;
}

/**
 * Vérifier si un utilisateur est sudo
 * @param {string} jid - JID de l'utilisateur
 */
async function isSudo(jid) {
  const db = loadDB();
  return db.sudos.includes(jid);
}

/**
 * Obtenir la liste des sudos
 */
async function getSudos() {
  const db = loadDB();
  return db.sudos;
}

/**
 * Réinitialiser la liste des sudos
 */
async function clearSudos() {
  const db = loadDB();
  db.sudos = [];
  saveDB(db);
  return true;
}

module.exports = {
  addSudo,
  removeSudo,
  isSudo,
  getSudos,
  clearSudos
};

console.log("[DB] ✅ Sudo database chargée");
