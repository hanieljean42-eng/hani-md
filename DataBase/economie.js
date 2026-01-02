/**
 * ═══════════════════════════════════════════════════════════
 * 💰 HANI-MD - Économie Database
 * ═══════════════════════════════════════════════════════════
 * Gestion des comptes économiques des utilisateurs
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "economy_data.json");

// Charger la base de données
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {}
  return { users: {} };
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
 * Obtenir un utilisateur économie
 * @param {string} jid - JID de l'utilisateur
 */
async function getEconomyUser(jid) {
  const db = loadDB();
  return db.users[jid] || null;
}

/**
 * Créer un compte bancaire
 * @param {string} jid - JID de l'utilisateur
 * @param {number} initialBalance - Solde initial
 */
async function createBankAccount(jid, initialBalance = 0) {
  const db = loadDB();
  
  db.users[jid] = {
    jid,
    wallet: initialBalance,
    bank: 0,
    lastDaily: 0,
    lastWork: 0,
    lastFish: 0,
    lastHunt: 0,
    createdAt: Date.now()
  };
  
  saveDB(db);
  return db.users[jid];
}

/**
 * Mettre à jour le solde
 * @param {string} jid - JID de l'utilisateur
 * @param {number} amount - Montant
 * @param {string} operation - "add", "remove", ou "set"
 * @param {Object} extras - Données supplémentaires à mettre à jour
 */
async function updateBalance(jid, amount, operation = "add", extras = {}) {
  const db = loadDB();
  
  if (!db.users[jid]) {
    await createBankAccount(jid, 0);
    return updateBalance(jid, amount, operation, extras);
  }
  
  switch (operation) {
    case "add":
      db.users[jid].wallet += amount;
      break;
    case "remove":
      db.users[jid].wallet = Math.max(0, db.users[jid].wallet - Math.abs(amount));
      break;
    case "set":
      db.users[jid].wallet = amount;
      break;
  }
  
  // Mettre à jour les données supplémentaires
  for (const [key, value] of Object.entries(extras)) {
    db.users[jid][key] = value;
  }
  
  saveDB(db);
  return db.users[jid].wallet;
}

/**
 * Transférer de l'argent
 * @param {string} fromJid - JID de l'expéditeur
 * @param {string} toJid - JID du destinataire
 * @param {number} amount - Montant
 */
async function transferMoney(fromJid, toJid, amount) {
  const db = loadDB();
  
  if (!db.users[fromJid] || db.users[fromJid].wallet < amount) {
    throw new Error("Solde insuffisant");
  }
  
  if (!db.users[toJid]) {
    await createBankAccount(toJid, 0);
  }
  
  db.users[fromJid].wallet -= amount;
  db.users[toJid].wallet += amount;
  
  saveDB(db);
  return true;
}

/**
 * Déposer à la banque
 * @param {string} jid - JID de l'utilisateur
 * @param {number} amount - Montant
 */
async function depositToBank(jid, amount) {
  const db = loadDB();
  
  if (!db.users[jid] || db.users[jid].wallet < amount) {
    throw new Error("Solde insuffisant");
  }
  
  db.users[jid].wallet -= amount;
  db.users[jid].bank += amount;
  
  saveDB(db);
  return db.users[jid];
}

/**
 * Retirer de la banque
 * @param {string} jid - JID de l'utilisateur
 * @param {number} amount - Montant
 */
async function withdrawFromBank(jid, amount) {
  const db = loadDB();
  
  if (!db.users[jid] || db.users[jid].bank < amount) {
    throw new Error("Solde bancaire insuffisant");
  }
  
  db.users[jid].bank -= amount;
  db.users[jid].wallet += amount;
  
  saveDB(db);
  return db.users[jid];
}

/**
 * Obtenir le top des utilisateurs les plus riches
 * @param {number} limit - Nombre d'utilisateurs
 */
async function getTopUsers(limit = 10) {
  const db = loadDB();
  
  const users = Object.values(db.users)
    .map(u => ({
      ...u,
      total: (u.wallet || 0) + (u.bank || 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
  
  return users;
}

/**
 * Supprimer un compte
 * @param {string} jid - JID de l'utilisateur
 */
async function deleteAccount(jid) {
  const db = loadDB();
  
  if (db.users[jid]) {
    delete db.users[jid];
    saveDB(db);
    return true;
  }
  
  return false;
}

/**
 * Obtenir les statistiques globales
 */
async function getGlobalStats() {
  const db = loadDB();
  
  const users = Object.values(db.users);
  const totalUsers = users.length;
  const totalWallet = users.reduce((sum, u) => sum + (u.wallet || 0), 0);
  const totalBank = users.reduce((sum, u) => sum + (u.bank || 0), 0);
  
  return {
    totalUsers,
    totalWallet,
    totalBank,
    totalMoney: totalWallet + totalBank
  };
}

module.exports = {
  getEconomyUser,
  createBankAccount,
  updateBalance,
  transferMoney,
  depositToBank,
  withdrawFromBank,
  getTopUsers,
  deleteAccount,
  getGlobalStats
};

console.log("[DB] ✅ Économie database chargée");
