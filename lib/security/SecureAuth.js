/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║     🔐 HANI-MD SECURE AUTHENTICATION SYSTEM v2.0          ║
 * ║        Authentification Multi-Facteurs Moderne            ║
 * ║              Chiffrement AES-256-GCM + TOTP               ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 🔑 CONFIGURATION SÉCURISÉE
// ═══════════════════════════════════════════════════════════

const SECURITY_CONFIG = {
  // Algorithmes de chiffrement
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  HASH_ALGORITHM: 'sha512',
  KEY_DERIVATION: 'argon2id', // Argon2id pour le hachage de mots de passe
  
  // Paramètres de sécurité
  SALT_LENGTH: 32,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  KEY_LENGTH: 32,
  
  // TOTP (Time-based One-Time Password)
  TOTP_DIGITS: 6,
  TOTP_PERIOD: 30, // secondes
  TOTP_WINDOW: 1,  // fenêtre de tolérance
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Tokens JWT
  TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  
  // Fichiers sécurisés
  SECURE_STORAGE_PATH: './DataBase/secure/',
  CREDENTIALS_FILE: 'credentials.enc',
  SESSIONS_FILE: 'sessions.enc',
};

// ═══════════════════════════════════════════════════════════
// 🔐 CLASSE D'AUTHENTIFICATION SÉCURISÉE
// ═══════════════════════════════════════════════════════════

class SecureAuth {
  constructor() {
    this.masterKey = null;
    this.sessions = new Map();
    this.loginAttempts = new Map();
    this.blockedIPs = new Map();
    
    // Créer le dossier sécurisé
    if (!fs.existsSync(SECURITY_CONFIG.SECURE_STORAGE_PATH)) {
      fs.mkdirSync(SECURITY_CONFIG.SECURE_STORAGE_PATH, { recursive: true });
    }
    
    this.initializeMasterKey();
  }

  // ═══════════════════════════════════════════════════════════
  // 🔑 GÉNÉRATION ET GESTION DE LA CLÉ MAÎTRE
  // ═══════════════════════════════════════════════════════════

  initializeMasterKey() {
    const keyPath = path.join(SECURITY_CONFIG.SECURE_STORAGE_PATH, '.master.key');
    
    if (fs.existsSync(keyPath)) {
      // Charger la clé existante (devrait être chiffrée avec une clé d'environnement)
      const encryptedKey = fs.readFileSync(keyPath);
      const envKey = this.deriveKeyFromEnv();
      this.masterKey = this.decryptWithKey(encryptedKey, envKey);
    } else {
      // Générer une nouvelle clé maître
      this.masterKey = crypto.randomBytes(SECURITY_CONFIG.KEY_LENGTH);
      const envKey = this.deriveKeyFromEnv();
      const encryptedKey = this.encryptWithKey(this.masterKey, envKey);
      fs.writeFileSync(keyPath, encryptedKey);
      
      // Permissions restrictives (Linux/Mac)
      try {
        fs.chmodSync(keyPath, 0o600);
      } catch (e) {}
    }
  }

  deriveKeyFromEnv() {
    // Dériver une clé à partir de variables d'environnement
    const secret = process.env.HANI_MASTER_SECRET || 
                   process.env.SESSION_SECRET || 
                   'HANI-MD-DEFAULT-KEY-CHANGE-ME';
    
    return crypto.pbkdf2Sync(
      secret,
      'HANI-MD-SALT-2025',
      100000,
      SECURITY_CONFIG.KEY_LENGTH,
      'sha512'
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🔒 CHIFFREMENT AES-256-GCM
  // ═══════════════════════════════════════════════════════════

  encrypt(data) {
    return this.encryptWithKey(Buffer.from(JSON.stringify(data)), this.masterKey);
  }

  decrypt(encryptedData) {
    const decrypted = this.decryptWithKey(encryptedData, this.masterKey);
    return JSON.parse(decrypted.toString());
  }

  encryptWithKey(data, key) {
    const iv = crypto.randomBytes(SECURITY_CONFIG.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
      key,
      iv,
      { authTagLength: SECURITY_CONFIG.AUTH_TAG_LENGTH }
    );
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Format: IV (16) + AuthTag (16) + EncryptedData
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decryptWithKey(encryptedData, key) {
    const iv = encryptedData.slice(0, SECURITY_CONFIG.IV_LENGTH);
    const authTag = encryptedData.slice(
      SECURITY_CONFIG.IV_LENGTH,
      SECURITY_CONFIG.IV_LENGTH + SECURITY_CONFIG.AUTH_TAG_LENGTH
    );
    const data = encryptedData.slice(
      SECURITY_CONFIG.IV_LENGTH + SECURITY_CONFIG.AUTH_TAG_LENGTH
    );
    
    const decipher = crypto.createDecipheriv(
      SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
      key,
      iv,
      { authTagLength: SECURITY_CONFIG.AUTH_TAG_LENGTH }
    );
    
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔐 HACHAGE SÉCURISÉ DES MOTS DE PASSE (Argon2-style avec scrypt)
  // ═══════════════════════════════════════════════════════════

  async hashPassword(password) {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(SECURITY_CONFIG.SALT_LENGTH);
      
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        // Format: salt:hash
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
  }

  async verifyPassword(password, storedHash) {
    return new Promise((resolve, reject) => {
      const [saltHex, hashHex] = storedHash.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const storedHashBuffer = Buffer.from(hashHex, 'hex');
      
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        // Comparaison à temps constant pour éviter les timing attacks
        resolve(crypto.timingSafeEqual(derivedKey, storedHashBuffer));
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🔢 TOTP (Time-based One-Time Password) - 2FA
  // ═══════════════════════════════════════════════════════════

  generateTOTPSecret() {
    // Générer un secret TOTP de 20 bytes (compatible Google Authenticator)
    const secret = crypto.randomBytes(20);
    return this.base32Encode(secret);
  }

  generateTOTP(secret, time = Date.now()) {
    const counter = Math.floor(time / 1000 / SECURITY_CONFIG.TOTP_PERIOD);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    
    const secretBuffer = this.base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0xf;
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    
    const otp = binary % Math.pow(10, SECURITY_CONFIG.TOTP_DIGITS);
    return otp.toString().padStart(SECURITY_CONFIG.TOTP_DIGITS, '0');
  }

  verifyTOTP(secret, token, window = SECURITY_CONFIG.TOTP_WINDOW) {
    const now = Date.now();
    
    for (let i = -window; i <= window; i++) {
      const time = now + (i * SECURITY_CONFIG.TOTP_PERIOD * 1000);
      if (this.generateTOTP(secret, time) === token) {
        return true;
      }
    }
    return false;
  }

  base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }

  base32Decode(encoded) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = [];
    let bits = 0;
    let value = 0;
    
    for (const char of encoded.toUpperCase()) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      
      value = (value << 5) | index;
      bits += 5;
      
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return Buffer.from(bytes);
  }

  // ═══════════════════════════════════════════════════════════
  // 🛡️ RATE LIMITING & PROTECTION ANTI-BRUTEFORCE
  // ═══════════════════════════════════════════════════════════

  checkRateLimit(identifier) {
    const now = Date.now();
    
    // Vérifier si bloqué
    const blockedUntil = this.blockedIPs.get(identifier);
    if (blockedUntil && now < blockedUntil) {
      const remainingTime = Math.ceil((blockedUntil - now) / 1000 / 60);
      return {
        allowed: false,
        message: `Bloqué pendant encore ${remainingTime} minutes`,
        remainingTime
      };
    }
    
    // Nettoyer le blocage expiré
    if (blockedUntil) {
      this.blockedIPs.delete(identifier);
    }
    
    return { allowed: true };
  }

  recordLoginAttempt(identifier, success) {
    const now = Date.now();
    
    if (success) {
      // Réinitialiser les tentatives en cas de succès
      this.loginAttempts.delete(identifier);
      return;
    }
    
    // Enregistrer l'échec
    const attempts = this.loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Vérifier si on doit bloquer
    if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      this.blockedIPs.set(identifier, now + SECURITY_CONFIG.LOCKOUT_DURATION);
      this.loginAttempts.delete(identifier);
      
      console.log(`🚫 [SECURITY] ${identifier} bloqué pour ${SECURITY_CONFIG.LOCKOUT_DURATION / 60000} minutes`);
    } else {
      this.loginAttempts.set(identifier, attempts);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🎫 GESTION DES SESSIONS SÉCURISÉES
  // ═══════════════════════════════════════════════════════════

  createSession(userId, metadata = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    
    const session = {
      id: sessionId,
      userId,
      createdAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000), // 24 heures
      lastActivity: now,
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || 'Unknown',
        ip: metadata.ip || 'Unknown'
      }
    };
    
    this.sessions.set(sessionId, session);
    this.saveSecureSessions();
    
    return sessionId;
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session inexistante' };
    }
    
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session expirée' };
    }
    
    // Mettre à jour la dernière activité
    session.lastActivity = Date.now();
    
    return { valid: true, session };
  }

  revokeSession(sessionId) {
    this.sessions.delete(sessionId);
    this.saveSecureSessions();
  }

  revokeAllSessions(userId) {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    }
    this.saveSecureSessions();
  }

  saveSecureSessions() {
    const sessionsPath = path.join(
      SECURITY_CONFIG.SECURE_STORAGE_PATH,
      SECURITY_CONFIG.SESSIONS_FILE
    );
    
    const sessionsData = Object.fromEntries(this.sessions);
    const encrypted = this.encrypt(sessionsData);
    fs.writeFileSync(sessionsPath, encrypted);
  }

  loadSecureSessions() {
    const sessionsPath = path.join(
      SECURITY_CONFIG.SECURE_STORAGE_PATH,
      SECURITY_CONFIG.SESSIONS_FILE
    );
    
    try {
      if (fs.existsSync(sessionsPath)) {
        const encrypted = fs.readFileSync(sessionsPath);
        const sessionsData = this.decrypt(encrypted);
        this.sessions = new Map(Object.entries(sessionsData));
      }
    } catch (e) {
      console.log('[SECURITY] Impossible de charger les sessions:', e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔐 AUTHENTIFICATION COMPLÈTE
  // ═══════════════════════════════════════════════════════════

  async authenticate(credentials, options = {}) {
    const { userId, password, totpToken } = credentials;
    const { ip = 'unknown', userAgent = 'unknown' } = options;
    
    // 1. Vérifier le rate limiting
    const rateCheck = this.checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.message };
    }
    
    // 2. Charger les credentials stockés
    const storedCredentials = await this.getStoredCredentials(userId);
    if (!storedCredentials) {
      this.recordLoginAttempt(ip, false);
      return { success: false, error: 'Utilisateur non trouvé' };
    }
    
    // 3. Vérifier le mot de passe
    const passwordValid = await this.verifyPassword(password, storedCredentials.passwordHash);
    if (!passwordValid) {
      this.recordLoginAttempt(ip, false);
      return { success: false, error: 'Mot de passe incorrect' };
    }
    
    // 4. Vérifier le 2FA si activé
    if (storedCredentials.totpEnabled) {
      if (!totpToken) {
        return { success: false, error: 'Code 2FA requis', requires2FA: true };
      }
      
      if (!this.verifyTOTP(storedCredentials.totpSecret, totpToken)) {
        this.recordLoginAttempt(ip, false);
        return { success: false, error: 'Code 2FA invalide' };
      }
    }
    
    // 5. Succès - créer une session
    this.recordLoginAttempt(ip, true);
    const sessionId = this.createSession(userId, { ip, userAgent });
    
    return {
      success: true,
      sessionId,
      user: {
        id: userId,
        role: storedCredentials.role,
        permissions: storedCredentials.permissions
      }
    };
  }

  async getStoredCredentials(userId) {
    const credentialsPath = path.join(
      SECURITY_CONFIG.SECURE_STORAGE_PATH,
      SECURITY_CONFIG.CREDENTIALS_FILE
    );
    
    try {
      if (fs.existsSync(credentialsPath)) {
        const encrypted = fs.readFileSync(credentialsPath);
        const credentials = this.decrypt(encrypted);
        return credentials[userId] || null;
      }
    } catch (e) {
      console.log('[SECURITY] Erreur lecture credentials:', e.message);
    }
    
    return null;
  }

  async saveCredentials(userId, credentials) {
    const credentialsPath = path.join(
      SECURITY_CONFIG.SECURE_STORAGE_PATH,
      SECURITY_CONFIG.CREDENTIALS_FILE
    );
    
    let allCredentials = {};
    
    try {
      if (fs.existsSync(credentialsPath)) {
        const encrypted = fs.readFileSync(credentialsPath);
        allCredentials = this.decrypt(encrypted);
      }
    } catch (e) {}
    
    allCredentials[userId] = {
      ...credentials,
      updatedAt: Date.now()
    };
    
    const encrypted = this.encrypt(allCredentials);
    fs.writeFileSync(credentialsPath, encrypted);
  }

  // ═══════════════════════════════════════════════════════════
  // 👤 CRÉATION D'UTILISATEUR ADMIN
  // ═══════════════════════════════════════════════════════════

  async createAdminUser(userId, password, options = {}) {
    const passwordHash = await this.hashPassword(password);
    
    const credentials = {
      passwordHash,
      role: options.role || 'admin',
      permissions: options.permissions || ['*'],
      totpEnabled: false,
      totpSecret: null,
      createdAt: Date.now()
    };
    
    await this.saveCredentials(userId, credentials);
    
    return { success: true, userId };
  }

  async enable2FA(userId) {
    const credentials = await this.getStoredCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }
    
    const totpSecret = this.generateTOTPSecret();
    credentials.totpSecret = totpSecret;
    credentials.totpEnabled = true;
    
    await this.saveCredentials(userId, credentials);
    
    // Générer l'URL pour Google Authenticator
    const otpAuthUrl = `otpauth://totp/HANI-MD:${userId}?secret=${totpSecret}&issuer=HANI-MD`;
    
    return {
      success: true,
      secret: totpSecret,
      otpAuthUrl,
      message: 'Scannez le QR code avec Google Authenticator'
    };
  }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = {
  SecureAuth,
  SECURITY_CONFIG
};
