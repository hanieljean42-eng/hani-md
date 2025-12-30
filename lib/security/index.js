/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        🔧 HANI-MD SECURITY INTEGRATION v2.0               ║
 * ║     Module d'Intégration des Composants de Sécurité       ║
 * ╚═══════════════════════════════════════════════════════════╝
 * 
 * Ce fichier centralise l'intégration de tous les modules de sécurité.
 * Importez-le une seule fois dans hani.js pour activer toutes les protections.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 📦 IMPORT DES MODULES DE SÉCURITÉ
// ═══════════════════════════════════════════════════════════

let SecureAuthManager, AdvancedConnectionManager, SecureSessionManager;

try {
  ({ SecureAuthManager } = require('./SecureAuth'));
  console.log('[SECURITY] ✅ SecureAuth chargé');
} catch (e) {
  console.log('[SECURITY] ⚠️ SecureAuth non disponible:', e.message);
}

try {
  ({ AdvancedConnectionManager } = require('./AdvancedConnection'));
  console.log('[SECURITY] ✅ AdvancedConnection chargé');
} catch (e) {
  console.log('[SECURITY] ⚠️ AdvancedConnection non disponible:', e.message);
}

try {
  ({ SecureSessionManager } = require('./SecureSession'));
  console.log('[SECURITY] ✅ SecureSession chargé');
} catch (e) {
  console.log('[SECURITY] ⚠️ SecureSession non disponible:', e.message);
}

// ═══════════════════════════════════════════════════════════
// 🔐 GESTIONNAIRE DE SÉCURITÉ UNIFIÉ
// ═══════════════════════════════════════════════════════════

class SecurityManager {
  constructor(options = {}) {
    this.options = {
      sessionPath: options.sessionPath || './DataBase/session/principale',
      enableAuth: options.enableAuth !== false,
      enableAdvancedConnection: options.enableAdvancedConnection !== false,
      enableSecureSession: options.enableSecureSession !== false,
      ...options
    };
    
    this.authManager = null;
    this.connectionManager = null;
    this.sessionManager = null;
    
    this.initialized = false;
  }

  async initialize() {
    console.log('[SECURITY] 🔄 Initialisation des modules de sécurité...');
    
    // Initialiser l'authentification
    if (this.options.enableAuth && SecureAuthManager) {
      try {
        this.authManager = new SecureAuthManager();
        console.log('[SECURITY] ✅ Authentification initialisée');
      } catch (e) {
        console.log('[SECURITY] ⚠️ Erreur init auth:', e.message);
      }
    }
    
    // Initialiser la gestion des sessions
    if (this.options.enableSecureSession && SecureSessionManager) {
      try {
        this.sessionManager = new SecureSessionManager({
          sessionFolder: this.options.sessionPath
        });
        console.log('[SECURITY] ✅ Sessions sécurisées initialisées');
      } catch (e) {
        console.log('[SECURITY] ⚠️ Erreur init sessions:', e.message);
      }
    }
    
    this.initialized = true;
    console.log('[SECURITY] ✅ Modules de sécurité prêts');
    
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // 🔑 AUTHENTIFICATION
  // ═══════════════════════════════════════════════════════════

  async verifyAdminAccess(code, sessionId = null) {
    // Vérifier d'abord avec le nouveau système
    if (this.authManager && sessionId) {
      const result = await this.authManager.verifySession(sessionId);
      if (result.valid) return { authorized: true, source: 'session' };
    }
    
    // Fallback sur la variable d'environnement
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && code === adminPassword) {
      return { authorized: true, source: 'password' };
    }
    
    return { authorized: false };
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 SESSIONS
  // ═══════════════════════════════════════════════════════════

  async restoreSession(sessionId) {
    if (!this.sessionManager) {
      console.log('[SECURITY] ⚠️ SecureSession non disponible, restauration standard...');
      return { success: false, fallback: true };
    }
    
    return await this.sessionManager.restoreSession(sessionId);
  }

  async saveSession() {
    if (!this.sessionManager) {
      return null;
    }
    
    return await this.sessionManager.saveSession();
  }

  async validateSession() {
    if (!this.sessionManager) {
      // Validation basique sans le module
      const credsPath = path.join(this.options.sessionPath, 'creds.json');
      return { valid: fs.existsSync(credsPath) };
    }
    
    return await this.sessionManager.validateSession();
  }

  async createBackup(name = null) {
    if (!this.sessionManager) {
      console.log('[SECURITY] ⚠️ Backup non disponible sans SecureSession');
      return null;
    }
    
    return await this.sessionManager.createBackup(name);
  }

  async restoreBackup(backupName) {
    if (!this.sessionManager) {
      return { success: false, error: 'SecureSession non disponible' };
    }
    
    return await this.sessionManager.restoreBackup(backupName);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔌 CONNEXION
  // ═══════════════════════════════════════════════════════════

  createConnectionManager(callbacks = {}) {
    if (!AdvancedConnectionManager) {
      console.log('[SECURITY] ⚠️ AdvancedConnection non disponible');
      return null;
    }
    
    this.connectionManager = new AdvancedConnectionManager({
      sessionPath: this.options.sessionPath,
      ...callbacks
    });
    
    return this.connectionManager;
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 INFORMATIONS
  // ═══════════════════════════════════════════════════════════

  async getSecurityStatus() {
    const status = {
      initialized: this.initialized,
      modules: {
        auth: !!this.authManager,
        connection: !!this.connectionManager,
        session: !!this.sessionManager
      },
      session: null,
      connection: null
    };
    
    if (this.sessionManager) {
      status.session = await this.sessionManager.getSessionInfo();
    }
    
    if (this.connectionManager) {
      status.connection = this.connectionManager.getConnectionStats();
    }
    
    return status;
  }
}

// ═══════════════════════════════════════════════════════════
// 🛡️ FONCTIONS UTILITAIRES DE SÉCURITÉ
// ═══════════════════════════════════════════════════════════

/**
 * Vérifie si les variables d'environnement de sécurité sont configurées
 */
function checkSecurityConfig() {
  const issues = [];
  
  if (!process.env.ADMIN_PASSWORD) {
    issues.push('⚠️ ADMIN_PASSWORD non défini - panel admin non sécurisé');
  }
  
  if (!process.env.HANI_AUTH_SECRET) {
    issues.push('⚠️ HANI_AUTH_SECRET non défini - utilisation d\'un secret par défaut');
  }
  
  if (!process.env.HANI_SESSION_SECRET) {
    issues.push('⚠️ HANI_SESSION_SECRET non défini - sessions moins sécurisées');
  }
  
  if (issues.length > 0) {
    console.log('\n[SECURITY] ⚠️ CONFIGURATION INCOMPLÈTE:');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('  Consultez .env.example pour les variables requises\n');
  }
  
  return issues.length === 0;
}

/**
 * Sanitise les entrées utilisateur
 */
function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') return input;
  
  let sanitized = input;
  
  // Supprimer les caractères de contrôle
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limiter la longueur
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Échapper HTML si demandé
  if (options.escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  return sanitized;
}

/**
 * Génère un token aléatoire sécurisé
 */
function generateSecureToken(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash un mot de passe avec scrypt
 */
async function hashPassword(password) {
  const crypto = require('crypto');
  const salt = crypto.randomBytes(32);
  
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Vérifie un mot de passe hashé
 */
async function verifyPassword(password, hash) {
  const crypto = require('crypto');
  const [salt, key] = hash.split(':');
  
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, Buffer.from(salt, 'hex'), 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Classes principales
  SecurityManager,
  SecureAuthManager,
  AdvancedConnectionManager,
  SecureSessionManager,
  
  // Fonctions utilitaires
  checkSecurityConfig,
  sanitizeInput,
  generateSecureToken,
  hashPassword,
  verifyPassword
};

// Vérification automatique au chargement
if (require.main !== module) {
  checkSecurityConfig();
}
