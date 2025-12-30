/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║       🔒 HANI-MD SECURE SESSION MANAGER v2.0              ║
 * ║     Gestion des Sessions WhatsApp Ultra-Sécurisée         ║
 * ║      Chiffrement AES-256 + Backup Cloud + Recovery        ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════

const SESSION_CONFIG = {
  // Chemins
  sessionFolder: './DataBase/session/principale',
  backupFolder: './DataBase/session/backups',
  encryptedFolder: './DataBase/session/encrypted',
  tempFolder: './DataBase/session/temp',
  
  // Chiffrement
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    authTagLength: 16,
    saltLength: 64,
    iterations: 100000, // PBKDF2 iterations
  },
  
  // Compression
  compression: {
    enabled: true,
    level: 9, // Maximum compression
  },
  
  // Backups
  backup: {
    maxLocal: 10,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    autoInterval: 60 * 60 * 1000,    // Toutes les heures
  },
  
  // Validation
  validation: {
    requiredFiles: ['creds.json'],
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    checkIntegrity: true,
  }
};

// ═══════════════════════════════════════════════════════════
// 🔐 CLASSE DE GESTION SÉCURISÉE DES SESSIONS
// ═══════════════════════════════════════════════════════════

class SecureSessionManager {
  constructor(options = {}) {
    this.config = { ...SESSION_CONFIG, ...options };
    this.masterKey = null;
    this.sessionId = null;
    this.metadata = {};
    
    // Créer les dossiers nécessaires
    this.initializeFolders();
    
    // Initialiser la clé de chiffrement
    this.initializeEncryption();
  }

  // ═══════════════════════════════════════════════════════════
  // 📁 INITIALISATION
  // ═══════════════════════════════════════════════════════════

  initializeFolders() {
    const folders = [
      this.config.sessionFolder,
      this.config.backupFolder,
      this.config.encryptedFolder,
      this.config.tempFolder,
    ];
    
    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    }
  }

  initializeEncryption() {
    // Dériver la clé maître depuis les variables d'environnement
    const secret = process.env.HANI_SESSION_SECRET || 
                   process.env.SESSION_SECRET ||
                   this.generateDefaultSecret();
    
    const salt = Buffer.from(
      process.env.HANI_SESSION_SALT || 
      'HANI-MD-SESSION-SALT-2025',
      'utf-8'
    );
    
    this.masterKey = crypto.pbkdf2Sync(
      secret,
      salt,
      this.config.encryption.iterations,
      this.config.encryption.keyLength,
      'sha512'
    );
  }

  generateDefaultSecret() {
    // Générer un secret basé sur des données machine
    const machineData = [
      process.platform,
      process.arch,
      require('os').hostname(),
      require('os').cpus()[0]?.model || 'unknown'
    ].join('-');
    
    return crypto.createHash('sha256').update(machineData).digest('hex');
  }

  // ═══════════════════════════════════════════════════════════
  // 🔒 CHIFFREMENT / DÉCHIFFREMENT
  // ═══════════════════════════════════════════════════════════

  encrypt(data) {
    const iv = crypto.randomBytes(this.config.encryption.ivLength);
    
    const cipher = crypto.createCipheriv(
      this.config.encryption.algorithm,
      this.masterKey,
      iv,
      { authTagLength: this.config.encryption.authTagLength }
    );
    
    let processedData = data;
    
    // Compression si activée
    if (this.config.compression.enabled) {
      processedData = zlib.gzipSync(data, { level: this.config.compression.level });
    }
    
    const encrypted = Buffer.concat([
      cipher.update(processedData),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV (16) + AuthTag (16) + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decrypt(encryptedData) {
    const iv = encryptedData.slice(0, this.config.encryption.ivLength);
    const authTag = encryptedData.slice(
      this.config.encryption.ivLength,
      this.config.encryption.ivLength + this.config.encryption.authTagLength
    );
    const data = encryptedData.slice(
      this.config.encryption.ivLength + this.config.encryption.authTagLength
    );
    
    const decipher = crypto.createDecipheriv(
      this.config.encryption.algorithm,
      this.masterKey,
      iv,
      { authTagLength: this.config.encryption.authTagLength }
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);
    
    // Décompression si les données sont compressées
    if (this.config.compression.enabled) {
      try {
        decrypted = zlib.gunzipSync(decrypted);
      } catch (e) {
        // Les données n'étaient peut-être pas compressées
      }
    }
    
    return decrypted;
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 SAUVEGARDE DE SESSION
  // ═══════════════════════════════════════════════════════════

  async saveSession(sessionData = null) {
    try {
      const timestamp = Date.now();
      
      // Collecter tous les fichiers de session
      const sessionBundle = await this.collectSessionFiles();
      
      if (Object.keys(sessionBundle).length === 0) {
        console.log('[SESSION] Aucun fichier de session à sauvegarder');
        return null;
      }
      
      // Ajouter les métadonnées
      const bundle = {
        version: '2.0',
        timestamp,
        checksum: this.calculateChecksum(sessionBundle),
        botNumber: this.extractBotNumber(sessionBundle),
        files: sessionBundle,
        metadata: {
          platform: process.platform,
          nodeVersion: process.version,
          createdAt: new Date().toISOString()
        }
      };
      
      // Sérialiser et chiffrer
      const serialized = Buffer.from(JSON.stringify(bundle));
      const encrypted = this.encrypt(serialized);
      
      // Générer l'ID de session (format moderne)
      const sessionId = this.generateSessionId(encrypted);
      
      // Sauvegarder localement (chiffré)
      const encryptedPath = path.join(
        this.config.encryptedFolder,
        `session-${timestamp}.enc`
      );
      fs.writeFileSync(encryptedPath, encrypted);
      
      console.log(`[SESSION] ✅ Session sauvegardée: ${sessionId.slice(0, 20)}...`);
      
      return sessionId;
      
    } catch (error) {
      console.error('[SESSION] ❌ Erreur sauvegarde:', error.message);
      throw error;
    }
  }

  async collectSessionFiles() {
    const files = {};
    
    if (!fs.existsSync(this.config.sessionFolder)) {
      return files;
    }
    
    const entries = fs.readdirSync(this.config.sessionFolder);
    
    for (const entry of entries) {
      const filePath = path.join(this.config.sessionFolder, entry);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && stat.size <= this.config.validation.maxFileSize) {
        const content = fs.readFileSync(filePath);
        files[entry] = content.toString('base64');
      }
    }
    
    return files;
  }

  generateSessionId(encryptedData) {
    // Format: HANI-MD-V2~{base64_encoded_encrypted_data}
    const base64 = encryptedData.toString('base64');
    
    // Utiliser URL-safe base64
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return `HANI-MD-V2~${urlSafe}`;
  }

  // ═══════════════════════════════════════════════════════════
  // 📥 RESTAURATION DE SESSION
  // ═══════════════════════════════════════════════════════════

  async restoreSession(sessionId) {
    try {
      console.log('[SESSION] 🔄 Restauration de session...');
      
      // Valider le format
      if (!sessionId || !this.validateSessionIdFormat(sessionId)) {
        throw new Error('Format de SESSION_ID invalide');
      }
      
      // Extraire et décoder
      const encrypted = this.extractEncryptedData(sessionId);
      
      // Déchiffrer
      const decrypted = this.decrypt(encrypted);
      const bundle = JSON.parse(decrypted.toString());
      
      // Valider l'intégrité
      if (this.config.validation.checkIntegrity) {
        const checksum = this.calculateChecksum(bundle.files);
        if (checksum !== bundle.checksum) {
          throw new Error('Checksum invalide - Session corrompue');
        }
      }
      
      // Vérifier les fichiers requis
      for (const required of this.config.validation.requiredFiles) {
        if (!bundle.files[required]) {
          throw new Error(`Fichier requis manquant: ${required}`);
        }
      }
      
      // Nettoyer le dossier de session existant
      await this.clearSessionFolder();
      
      // Restaurer les fichiers
      for (const [filename, base64Content] of Object.entries(bundle.files)) {
        const filePath = path.join(this.config.sessionFolder, filename);
        const content = Buffer.from(base64Content, 'base64');
        fs.writeFileSync(filePath, content);
      }
      
      console.log(`[SESSION] ✅ Session restaurée (créée le ${bundle.metadata?.createdAt || 'inconnu'})`);
      console.log(`[SESSION] 📱 Bot: ${bundle.botNumber || 'inconnu'}`);
      
      return {
        success: true,
        botNumber: bundle.botNumber,
        createdAt: bundle.metadata?.createdAt,
        version: bundle.version
      };
      
    } catch (error) {
      console.error('[SESSION] ❌ Erreur restauration:', error.message);
      return { success: false, error: error.message };
    }
  }

  validateSessionIdFormat(sessionId) {
    // V2: HANI-MD-V2~{data}
    // V1 (legacy): HANI-MD~{data}
    return sessionId.startsWith('HANI-MD-V2~') || sessionId.startsWith('HANI-MD~');
  }

  extractEncryptedData(sessionId) {
    let base64Data;
    
    if (sessionId.startsWith('HANI-MD-V2~')) {
      base64Data = sessionId.replace('HANI-MD-V2~', '');
    } else if (sessionId.startsWith('HANI-MD~')) {
      // Legacy format - pas chiffré, juste base64
      base64Data = sessionId.replace('HANI-MD~', '');
      // Convertir legacy en nouveau format
      return this.convertLegacySession(base64Data);
    }
    
    // Convertir URL-safe base64 en standard
    const standardBase64 = base64Data
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Ajouter le padding
    const padding = standardBase64.length % 4;
    const paddedBase64 = padding ? standardBase64 + '='.repeat(4 - padding) : standardBase64;
    
    return Buffer.from(paddedBase64, 'base64');
  }

  convertLegacySession(base64Data) {
    // Décoder l'ancien format (pas chiffré)
    const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const legacyBundle = JSON.parse(jsonString);
    
    // Créer un nouveau bundle au format V2
    const newBundle = {
      version: '2.0',
      timestamp: Date.now(),
      checksum: this.calculateChecksum(legacyBundle),
      files: legacyBundle,
      metadata: {
        convertedFrom: 'V1',
        convertedAt: new Date().toISOString()
      }
    };
    
    // Retourner comme si c'était décrypté (car legacy n'est pas chiffré)
    return Buffer.from(JSON.stringify(newBundle));
  }

  // ═══════════════════════════════════════════════════════════
  // 🔍 VALIDATION ET INTÉGRITÉ
  // ═══════════════════════════════════════════════════════════

  calculateChecksum(files) {
    const hash = crypto.createHash('sha256');
    
    // Trier les clés pour avoir un ordre déterministe
    const sortedKeys = Object.keys(files).sort();
    
    for (const key of sortedKeys) {
      hash.update(key);
      hash.update(files[key]);
    }
    
    return hash.digest('hex');
  }

  extractBotNumber(files) {
    try {
      if (files['creds.json']) {
        const creds = JSON.parse(
          Buffer.from(files['creds.json'], 'base64').toString()
        );
        return creds.me?.id?.split(':')[0] || null;
      }
    } catch (e) {}
    return null;
  }

  async validateSession() {
    try {
      // Vérifier que le dossier existe
      if (!fs.existsSync(this.config.sessionFolder)) {
        return { valid: false, reason: 'Dossier de session inexistant' };
      }
      
      // Vérifier les fichiers requis
      for (const required of this.config.validation.requiredFiles) {
        const filePath = path.join(this.config.sessionFolder, required);
        if (!fs.existsSync(filePath)) {
          return { valid: false, reason: `Fichier manquant: ${required}` };
        }
      }
      
      // Vérifier l'intégrité de creds.json
      const credsPath = path.join(this.config.sessionFolder, 'creds.json');
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        if (!creds.me || !creds.noiseKey || !creds.signedIdentityKey) {
          return { valid: false, reason: 'Credentials incomplets' };
        }
      } catch (e) {
        return { valid: false, reason: 'Credentials corrompus' };
      }
      
      return { valid: true };
      
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 BACKUP LOCAL
  // ═══════════════════════════════════════════════════════════

  async createBackup(name = null) {
    try {
      const timestamp = Date.now();
      const backupName = name || `backup-${timestamp}`;
      const backupPath = path.join(this.config.backupFolder, backupName);
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      const sessionFiles = fs.readdirSync(this.config.sessionFolder);
      
      for (const file of sessionFiles) {
        const srcPath = path.join(this.config.sessionFolder, file);
        
        if (fs.statSync(srcPath).isFile()) {
          const content = fs.readFileSync(srcPath);
          const encrypted = this.encrypt(content);
          const destPath = path.join(backupPath, `${file}.enc`);
          fs.writeFileSync(destPath, encrypted);
        }
      }
      
      // Sauvegarder les métadonnées
      const metadata = {
        timestamp,
        name: backupName,
        files: sessionFiles.length,
        checksum: this.calculateChecksum(
          await this.collectSessionFiles()
        )
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`[BACKUP] ✅ Backup créé: ${backupName}`);
      
      // Nettoyer les anciens backups
      await this.cleanOldBackups();
      
      return backupName;
      
    } catch (error) {
      console.error('[BACKUP] ❌ Erreur:', error.message);
      throw error;
    }
  }

  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.config.backupFolder, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup inexistant');
      }
      
      // Lire les métadonnées
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // Nettoyer le dossier de session
      await this.clearSessionFolder();
      
      // Restaurer les fichiers
      const files = fs.readdirSync(backupPath)
        .filter(f => f.endsWith('.enc'));
      
      for (const encFile of files) {
        const encPath = path.join(backupPath, encFile);
        const encrypted = fs.readFileSync(encPath);
        const decrypted = this.decrypt(encrypted);
        
        const originalName = encFile.replace('.enc', '');
        const destPath = path.join(this.config.sessionFolder, originalName);
        fs.writeFileSync(destPath, decrypted);
      }
      
      console.log(`[BACKUP] ✅ Backup restauré: ${backupName}`);
      
      return { success: true, metadata };
      
    } catch (error) {
      console.error('[BACKUP] ❌ Erreur restauration:', error.message);
      return { success: false, error: error.message };
    }
  }

  async cleanOldBackups() {
    try {
      const backups = fs.readdirSync(this.config.backupFolder)
        .filter(f => fs.statSync(path.join(this.config.backupFolder, f)).isDirectory())
        .map(name => {
          const metaPath = path.join(this.config.backupFolder, name, 'metadata.json');
          let timestamp = 0;
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            timestamp = meta.timestamp || 0;
          } catch (e) {}
          return { name, timestamp };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Supprimer les backups excédentaires
      while (backups.length > this.config.backup.maxLocal) {
        const old = backups.pop();
        const oldPath = path.join(this.config.backupFolder, old.name);
        fs.rmSync(oldPath, { recursive: true });
        console.log(`[BACKUP] 🗑️ Ancien backup supprimé: ${old.name}`);
      }
      
      // Supprimer les backups trop vieux
      const maxAge = Date.now() - this.config.backup.maxAge;
      for (const backup of backups) {
        if (backup.timestamp < maxAge) {
          const oldPath = path.join(this.config.backupFolder, backup.name);
          fs.rmSync(oldPath, { recursive: true });
          console.log(`[BACKUP] 🗑️ Backup expiré supprimé: ${backup.name}`);
        }
      }
      
    } catch (error) {
      console.error('[BACKUP] ⚠️ Erreur nettoyage:', error.message);
    }
  }

  async listBackups() {
    try {
      const backups = fs.readdirSync(this.config.backupFolder)
        .filter(f => fs.statSync(path.join(this.config.backupFolder, f)).isDirectory())
        .map(name => {
          const metaPath = path.join(this.config.backupFolder, name, 'metadata.json');
          try {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          } catch (e) {
            return { name, timestamp: 0, error: 'Métadonnées manquantes' };
          }
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      
      return backups;
      
    } catch (error) {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🧹 NETTOYAGE
  // ═══════════════════════════════════════════════════════════

  async clearSessionFolder() {
    try {
      if (fs.existsSync(this.config.sessionFolder)) {
        const files = fs.readdirSync(this.config.sessionFolder);
        for (const file of files) {
          const filePath = path.join(this.config.sessionFolder, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error('[SESSION] ⚠️ Erreur nettoyage:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 INFORMATIONS
  // ═══════════════════════════════════════════════════════════

  async getSessionInfo() {
    try {
      const validation = await this.validateSession();
      
      if (!validation.valid) {
        return { valid: false, reason: validation.reason };
      }
      
      const credsPath = path.join(this.config.sessionFolder, 'creds.json');
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      
      const files = fs.readdirSync(this.config.sessionFolder);
      let totalSize = 0;
      for (const file of files) {
        totalSize += fs.statSync(path.join(this.config.sessionFolder, file)).size;
      }
      
      return {
        valid: true,
        botNumber: creds.me?.id?.split(':')[0],
        filesCount: files.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        createdAt: creds.creds?.registered ? new Date(creds.creds.registered).toISOString() : null,
        backups: await this.listBackups()
      };
      
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = {
  SecureSessionManager,
  SESSION_CONFIG
};
