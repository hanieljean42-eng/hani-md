/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║      🔄 HANI-MD - MODULE BASE DE DONNÉES UNIFIÉ           ║
 * ║   Redirige automatiquement vers Firebase ou MySQL         ║
 * ║   Priorité: Firebase → MySQL → null (fallback JSON)       ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Usage dans tous les modules:
 *   const db = require('../DataBase/db');
 *   await db.banUser(jid, 'raison');
 *   await db.getSetting('ma_cle');
 */

let _provider = null;

/**
 * Retourne le provider de base de données actif (Firebase ou MySQL).
 * Évalue à chaque appel pour prendre en compte la connexion tardive.
 */
function getProvider() {
  // Firebase en priorité (si FIREBASE_URL configuré)
  if (process.env.FIREBASE_URL) {
    try {
      const fb = require('./firebase_db');
      if (fb.isConnected()) return fb;
    } catch(e) {}
  }
  // MySQL en fallback
  try {
    const mysql = require('./mysql');
    if (mysql.isConnected()) return mysql;
  } catch(e) {}
  return null;
}

/**
 * Proxy dynamique — redirige chaque appel vers le provider actif.
 * Si aucun provider n'est connecté, retourne des valeurs par défaut
 * sûres (null / false / []) pour ne pas crasher le bot.
 */
const db = new Proxy({}, {
  get(target, prop) {
    if (prop === 'isConnected') {
      return () => getProvider() !== null;
    }
    if (prop === 'getProvider') {
      return getProvider;
    }
    const provider = getProvider();
    if (!provider) {
      // Fallback silencieux — retourne une fonction no-op
      return async (...args) => {
        if (typeof args[0] === 'string') return null;
        return null;
      };
    }
    const fn = provider[prop];
    if (typeof fn === 'function') return fn.bind(provider);
    return fn;
  }
});

module.exports = db;
