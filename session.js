/**
 * ═══════════════════════════════════════════════════════════
 * 🔑 HANI-MD - Session Manager (Root)
 * ═══════════════════════════════════════════════════════════
 * Gestionnaire de session WhatsApp principal
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");

// Chemins de session
const SESSION_DIR = process.env.SESSION_DIR || "./session_principale";
const BACKUP_DIR = "./session_backup";

/**
 * Initialiser le dossier de session
 */
function initSessionDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    console.log("[SESSION] 📁 Dossier de session créé:", SESSION_DIR);
  }
  return SESSION_DIR;
}

/**
 * Vérifier si une session existe
 */
function hasSession() {
  const credsPath = path.join(SESSION_DIR, "creds.json");
  return fs.existsSync(credsPath);
}

/**
 * Obtenir l'état d'authentification
 */
async function getAuthState() {
  initSessionDir();
  return useMultiFileAuthState(SESSION_DIR);
}

/**
 * Sauvegarder la session (backup)
 */
function backupSession() {
  try {
    if (!hasSession()) {
      console.log("[SESSION] ⚠️ Aucune session à sauvegarder");
      return false;
    }
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
    
    // Copier tous les fichiers de session
    fs.mkdirSync(backupPath, { recursive: true });
    
    const files = fs.readdirSync(SESSION_DIR);
    for (const file of files) {
      const src = path.join(SESSION_DIR, file);
      const dest = path.join(backupPath, file);
      
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
      }
    }
    
    console.log("[SESSION] 💾 Backup créé:", backupPath);
    return backupPath;
  } catch (e) {
    console.error("[SESSION] ❌ Erreur backup:", e.message);
    return false;
  }
}

/**
 * Restaurer une session depuis un backup
 */
function restoreSession(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      console.log("[SESSION] ❌ Backup introuvable:", backupPath);
      return false;
    }
    
    initSessionDir();
    
    const files = fs.readdirSync(backupPath);
    for (const file of files) {
      const src = path.join(backupPath, file);
      const dest = path.join(SESSION_DIR, file);
      
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
      }
    }
    
    console.log("[SESSION] ✅ Session restaurée depuis:", backupPath);
    return true;
  } catch (e) {
    console.error("[SESSION] ❌ Erreur restauration:", e.message);
    return false;
  }
}

/**
 * Supprimer la session actuelle
 */
function deleteSession() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true });
      console.log("[SESSION] 🗑️ Session supprimée");
      return true;
    }
  } catch (e) {
    console.error("[SESSION] ❌ Erreur suppression:", e.message);
  }
  return false;
}

/**
 * Obtenir les informations de session
 */
function getSessionInfo() {
  try {
    const credsPath = path.join(SESSION_DIR, "creds.json");
    
    if (!fs.existsSync(credsPath)) {
      return null;
    }
    
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    const stats = fs.statSync(credsPath);
    
    return {
      exists: true,
      phone: creds.me?.id?.split(":")[0] || "Inconnu",
      name: creds.me?.name || "Inconnu",
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      size: stats.size
    };
  } catch (e) {
    return null;
  }
}

/**
 * Générer un SESSION_ID encodé
 */
function generateSessionId() {
  try {
    if (!hasSession()) {
      return null;
    }
    
    const credsPath = path.join(SESSION_DIR, "creds.json");
    const creds = fs.readFileSync(credsPath, "utf8");
    
    // Encoder en base64
    const encoded = Buffer.from(creds).toString("base64");
    
    return `HANI-MD_${encoded}`;
  } catch (e) {
    console.error("[SESSION] ❌ Erreur génération ID:", e.message);
    return null;
  }
}

/**
 * Décoder et restaurer depuis SESSION_ID
 */
function restoreFromSessionId(sessionId) {
  try {
    if (!sessionId.startsWith("HANI-MD_")) {
      console.log("[SESSION] ❌ Format SESSION_ID invalide");
      return false;
    }
    
    const encoded = sessionId.replace("HANI-MD_", "");
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    
    // Valider le JSON
    JSON.parse(decoded);
    
    initSessionDir();
    fs.writeFileSync(path.join(SESSION_DIR, "creds.json"), decoded);
    
    console.log("[SESSION] ✅ Session restaurée depuis SESSION_ID");
    return true;
  } catch (e) {
    console.error("[SESSION] ❌ Erreur restauration:", e.message);
    return false;
  }
}

/**
 * Lister les backups disponibles
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    
    const dirs = fs.readdirSync(BACKUP_DIR);
    return dirs
      .filter(d => d.startsWith("backup_"))
      .map(d => ({
        name: d,
        path: path.join(BACKUP_DIR, d),
        timestamp: parseInt(d.replace("backup_", ""))
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    return [];
  }
}

module.exports = {
  SESSION_DIR,
  BACKUP_DIR,
  initSessionDir,
  hasSession,
  getAuthState,
  backupSession,
  restoreSession,
  deleteSession,
  getSessionInfo,
  generateSessionId,
  restoreFromSessionId,
  listBackups
};

console.log("[SESSION] ✅ Session Manager chargé");
