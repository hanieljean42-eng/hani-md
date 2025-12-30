/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║     🔄 HANI-MD ADVANCED CONNECTION MANAGER v2.0           ║
 * ║       Connexion WhatsApp Ultra-Robuste & Moderne          ║
 * ║         Reconnexion Intelligente + Auto-Healing           ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { 
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  delay,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION AVANCÉE
// ═══════════════════════════════════════════════════════════

const CONNECTION_CONFIG = {
  // Reconnexion intelligente
  reconnect: {
    enabled: true,
    maxAttempts: 50,                    // Max tentatives avant abandon
    baseDelay: 1000,                    // Délai initial (1 sec)
    maxDelay: 300000,                   // Délai max (5 min)
    multiplier: 1.5,                    // Multiplicateur exponentiel
    jitter: 0.3,                        // Variation aléatoire (30%)
    resetAfterSuccess: 60000,           // Reset compteur après 1 min de succès
  },
  
  // Health check
  healthCheck: {
    enabled: true,
    interval: 30000,                    // Vérifier toutes les 30 sec
    timeout: 10000,                     // Timeout du ping
    maxFailedPings: 3,                  // Échecs avant reconnexion
  },
  
  // Session
  session: {
    folder: './DataBase/session/principale',
    backupFolder: './DataBase/session/backups',
    maxBackups: 5,
    encryptBackups: true,
    autoBackupInterval: 3600000,        // Backup toutes les heures
  },
  
  // Performances
  performance: {
    syncFullHistory: false,             // Pas d'historique complet
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    fireInitQueries: true,
  },
  
  // Anti-ban
  antiBan: {
    enabled: true,
    minMessageDelay: 500,               // Délai min entre messages
    maxMessageDelay: 2000,              // Délai max entre messages
    typingDuration: 1500,               // Durée "en train d'écrire"
    rateLimit: {
      messagesPerMinute: 30,
      messagesPerHour: 500,
    }
  },
  
  // Logging
  logging: {
    level: 'warn',                      // silent, error, warn, info, debug
    logFile: './logs/connection.log',
    maxLogSize: 10 * 1024 * 1024,       // 10 MB
    rotateDaily: true,
  }
};

// ═══════════════════════════════════════════════════════════
// 🔄 CLASSE DE CONNEXION AVANCÉE
// ═══════════════════════════════════════════════════════════

class AdvancedConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...CONNECTION_CONFIG, ...options };
    this.socket = null;
    this.state = 'disconnected';
    this.reconnectAttempt = 0;
    this.lastSuccessfulConnection = null;
    this.failedPings = 0;
    this.messageQueue = [];
    this.rateLimiter = {
      lastMinute: [],
      lastHour: [],
    };
    
    // Statistiques de connexion
    this.stats = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnects: 0,
      averageUptime: 0,
      lastUptime: 0,
      connectionHistory: [],
    };
    
    // Intervalles
    this.intervals = {
      healthCheck: null,
      backup: null,
      cleanup: null,
    };
    
    // Logger personnalisé
    this.logger = this.createLogger();
  }

  // ═══════════════════════════════════════════════════════════
  // 📝 LOGGING AVANCÉ
  // ═══════════════════════════════════════════════════════════

  createLogger() {
    const logDir = path.dirname(this.config.logging.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    return pino({
      level: this.config.logging.level,
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            level: 'info',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname'
            }
          }
        ]
      }
    });
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...data };
    
    // Console avec couleurs
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
      success: '\x1b[32m',
    };
    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;
    
    console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`);
    
    // Émettre l'événement de log
    this.emit('log', logEntry);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔌 CONNEXION PRINCIPALE
  // ═══════════════════════════════════════════════════════════

  async connect() {
    try {
      this.log('info', '🔌 Initialisation de la connexion WhatsApp...');
      
      // Créer le dossier de session
      if (!fs.existsSync(this.config.session.folder)) {
        fs.mkdirSync(this.config.session.folder, { recursive: true });
      }
      
      // Récupérer la dernière version de Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();
      this.log('info', `📦 Baileys version: ${version.join('.')} (${isLatest ? 'latest' : 'outdated'})`);
      
      // Charger l'état d'authentification
      const { state, saveCreds } = await useMultiFileAuthState(this.config.session.folder);
      
      // Créer le socket avec configuration optimisée
      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger)
        },
        printQRInTerminal: true,
        browser: Browsers.ubuntu('Chrome'),
        logger: this.logger,
        
        // Options de performance
        syncFullHistory: this.config.performance.syncFullHistory,
        markOnlineOnConnect: this.config.performance.markOnlineOnConnect,
        defaultQueryTimeoutMs: this.config.performance.defaultQueryTimeoutMs,
        connectTimeoutMs: this.config.performance.connectTimeoutMs,
        keepAliveIntervalMs: this.config.performance.keepAliveIntervalMs,
        retryRequestDelayMs: this.config.performance.retryRequestDelayMs,
        maxMsgRetryCount: this.config.performance.maxMsgRetryCount,
        fireInitQueries: this.config.performance.fireInitQueries,
        
        // Génération de l'ID de message optimisée
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
          // Récupérer le message depuis le store si disponible
          return { conversation: '' };
        }
      });
      
      // Configurer les gestionnaires d'événements
      this.setupEventHandlers(saveCreds);
      
      return this.socket;
      
    } catch (error) {
      this.log('error', `❌ Erreur de connexion: ${error.message}`);
      this.handleConnectionError(error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📡 GESTIONNAIRES D'ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════

  setupEventHandlers(saveCreds) {
    // Mise à jour de la connexion
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.state = 'waiting_qr';
        this.emit('qr', qr);
        this.log('info', '📱 QR Code généré - Scannez avec WhatsApp');
      }
      
      if (connection === 'connecting') {
        this.state = 'connecting';
        this.log('info', '🔄 Connexion en cours...');
        this.emit('connecting');
      }
      
      if (connection === 'open') {
        this.handleSuccessfulConnection();
      }
      
      if (connection === 'close') {
        this.handleDisconnection(lastDisconnect);
      }
    });
    
    // Sauvegarde des credentials
    this.socket.ev.on('creds.update', async () => {
      await saveCreds();
      this.log('debug', '💾 Credentials sauvegardés');
    });
    
    // Messages reçus
    this.socket.ev.on('messages.upsert', (m) => {
      this.emit('messages', m);
    });
    
    // Mise à jour de groupe
    this.socket.ev.on('group-participants.update', (update) => {
      this.emit('group-update', update);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ CONNEXION RÉUSSIE
  // ═══════════════════════════════════════════════════════════

  handleSuccessfulConnection() {
    this.state = 'connected';
    this.reconnectAttempt = 0;
    this.failedPings = 0;
    this.lastSuccessfulConnection = Date.now();
    this.stats.totalConnections++;
    
    this.log('success', '✅ Connexion WhatsApp établie avec succès!');
    
    // Démarrer le health check
    this.startHealthCheck();
    
    // Démarrer les backups automatiques
    this.startAutoBackup();
    
    // Émettre l'événement
    this.emit('connected', {
      user: this.socket.user,
      timestamp: Date.now()
    });
    
    // Reset du compteur de reconnexion après un délai
    setTimeout(() => {
      if (this.state === 'connected') {
        this.reconnectAttempt = 0;
        this.log('debug', '🔄 Compteur de reconnexion réinitialisé');
      }
    }, this.config.reconnect.resetAfterSuccess);
  }

  // ═══════════════════════════════════════════════════════════
  // ❌ GESTION DES DÉCONNEXIONS
  // ═══════════════════════════════════════════════════════════

  handleDisconnection(lastDisconnect) {
    this.state = 'disconnected';
    this.stats.totalDisconnections++;
    
    // Arrêter les intervalles
    this.stopIntervals();
    
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const reason = lastDisconnect?.error?.message || 'Unknown';
    
    this.log('warn', `⚠️ Déconnexion détectée - Code: ${statusCode}, Raison: ${reason}`);
    
    // Analyser le code d'erreur
    const shouldReconnect = this.analyzeDisconnectReason(statusCode);
    
    if (shouldReconnect && this.config.reconnect.enabled) {
      this.scheduleReconnect();
    } else {
      this.log('error', '❌ Reconnexion impossible - Session invalide');
      this.emit('session-invalid', { statusCode, reason });
    }
  }

  analyzeDisconnectReason(statusCode) {
    const disconnectReasons = {
      [DisconnectReason.loggedOut]: {
        reconnect: false,
        action: 'clear_session',
        message: 'Déconnecté - Session expirée ou logout'
      },
      [DisconnectReason.connectionClosed]: {
        reconnect: true,
        action: 'reconnect',
        message: 'Connexion fermée par le serveur'
      },
      [DisconnectReason.connectionLost]: {
        reconnect: true,
        action: 'reconnect',
        message: 'Connexion perdue (réseau)'
      },
      [DisconnectReason.connectionReplaced]: {
        reconnect: false,
        action: 'notify',
        message: 'Connexion remplacée par un autre appareil'
      },
      [DisconnectReason.timedOut]: {
        reconnect: true,
        action: 'reconnect',
        message: 'Connexion expirée (timeout)'
      },
      [DisconnectReason.restartRequired]: {
        reconnect: true,
        action: 'reconnect',
        message: 'Redémarrage requis'
      },
      [DisconnectReason.multideviceMismatch]: {
        reconnect: false,
        action: 'clear_session',
        message: 'Conflit multi-device'
      },
      [DisconnectReason.badSession]: {
        reconnect: false,
        action: 'clear_session',
        message: 'Session corrompue'
      },
      // Codes personnalisés
      401: {
        reconnect: false,
        action: 'clear_session',
        message: 'Session rejetée (conflit)'
      },
      408: {
        reconnect: true,
        action: 'reconnect',
        message: 'QR code expiré'
      },
      428: {
        reconnect: false,
        action: 'clear_session',
        message: 'Connexion terminée par le serveur'
      },
      440: {
        reconnect: false,
        action: 'clear_session',
        message: 'Conflit de connexion'
      },
      515: {
        reconnect: true,
        action: 'reconnect',
        message: 'Redémarrage du stream requis'
      }
    };
    
    const info = disconnectReasons[statusCode] || {
      reconnect: true,
      action: 'reconnect',
      message: `Code inconnu: ${statusCode}`
    };
    
    this.log('info', `📋 Analyse: ${info.message} - Action: ${info.action}`);
    
    // Exécuter l'action appropriée
    if (info.action === 'clear_session') {
      this.clearSession();
    }
    
    return info.reconnect;
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 RECONNEXION INTELLIGENTE (BACKOFF EXPONENTIEL)
  // ═══════════════════════════════════════════════════════════

  async scheduleReconnect() {
    if (this.reconnectAttempt >= this.config.reconnect.maxAttempts) {
      this.log('error', `❌ Nombre maximum de tentatives atteint (${this.config.reconnect.maxAttempts})`);
      this.emit('max-reconnect-reached');
      return;
    }
    
    this.reconnectAttempt++;
    this.stats.totalReconnects++;
    
    // Calcul du délai avec backoff exponentiel + jitter
    const baseDelay = this.config.reconnect.baseDelay;
    const maxDelay = this.config.reconnect.maxDelay;
    const multiplier = this.config.reconnect.multiplier;
    const jitter = this.config.reconnect.jitter;
    
    let delay = Math.min(
      baseDelay * Math.pow(multiplier, this.reconnectAttempt - 1),
      maxDelay
    );
    
    // Ajouter du jitter (variation aléatoire)
    const jitterRange = delay * jitter;
    delay += (Math.random() * 2 - 1) * jitterRange;
    delay = Math.round(delay);
    
    this.log('info', `🔄 Tentative ${this.reconnectAttempt}/${this.config.reconnect.maxAttempts} dans ${Math.round(delay/1000)}s...`);
    
    this.emit('reconnecting', {
      attempt: this.reconnectAttempt,
      delay,
      maxAttempts: this.config.reconnect.maxAttempts
    });
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connect();
    } catch (error) {
      this.log('error', `❌ Échec de reconnexion: ${error.message}`);
    }
  }

  handleConnectionError(error) {
    this.log('error', `🚨 Erreur de connexion: ${error.message}`);
    
    if (this.config.reconnect.enabled) {
      this.scheduleReconnect();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💓 HEALTH CHECK (SURVEILLANCE DE LA CONNEXION)
  // ═══════════════════════════════════════════════════════════

  startHealthCheck() {
    if (!this.config.healthCheck.enabled) return;
    
    this.intervals.healthCheck = setInterval(async () => {
      try {
        const isHealthy = await this.ping();
        
        if (isHealthy) {
          this.failedPings = 0;
        } else {
          this.failedPings++;
          this.log('warn', `⚠️ Ping échoué (${this.failedPings}/${this.config.healthCheck.maxFailedPings})`);
          
          if (this.failedPings >= this.config.healthCheck.maxFailedPings) {
            this.log('error', '❌ Connexion non responsive - Tentative de reconnexion');
            this.forceReconnect();
          }
        }
      } catch (error) {
        this.log('error', `❌ Erreur health check: ${error.message}`);
      }
    }, this.config.healthCheck.interval);
  }

  async ping() {
    if (!this.socket || this.state !== 'connected') {
      return false;
    }
    
    try {
      // Utiliser une requête légère pour vérifier la connexion
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ping timeout')), this.config.healthCheck.timeout)
      );
      
      const ping = this.socket.query({
        tag: 'iq',
        attrs: { type: 'get', to: '@s.whatsapp.net' },
        content: [{ tag: 'ping', attrs: {} }]
      });
      
      await Promise.race([ping, timeout]);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 BACKUP AUTOMATIQUE DES SESSIONS
  // ═══════════════════════════════════════════════════════════

  startAutoBackup() {
    if (!fs.existsSync(this.config.session.backupFolder)) {
      fs.mkdirSync(this.config.session.backupFolder, { recursive: true });
    }
    
    this.intervals.backup = setInterval(() => {
      this.createBackup();
    }, this.config.session.autoBackupInterval);
    
    // Backup initial
    this.createBackup();
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `session-backup-${timestamp}`;
      const backupPath = path.join(this.config.session.backupFolder, backupName);
      
      // Copier tous les fichiers de session
      const sessionFiles = fs.readdirSync(this.config.session.folder);
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      for (const file of sessionFiles) {
        const srcPath = path.join(this.config.session.folder, file);
        const destPath = path.join(backupPath, file);
        
        if (fs.statSync(srcPath).isFile()) {
          let content = fs.readFileSync(srcPath);
          
          // Chiffrer si configuré
          if (this.config.session.encryptBackups) {
            content = this.encryptData(content);
          }
          
          fs.writeFileSync(destPath, content);
        }
      }
      
      this.log('info', `💾 Backup créé: ${backupName}`);
      
      // Nettoyer les anciens backups
      this.cleanOldBackups();
      
    } catch (error) {
      this.log('error', `❌ Erreur backup: ${error.message}`);
    }
  }

  cleanOldBackups() {
    const backups = fs.readdirSync(this.config.session.backupFolder)
      .filter(f => f.startsWith('session-backup-'))
      .sort()
      .reverse();
    
    while (backups.length > this.config.session.maxBackups) {
      const oldBackup = backups.pop();
      const oldPath = path.join(this.config.session.backupFolder, oldBackup);
      
      try {
        fs.rmSync(oldPath, { recursive: true });
        this.log('debug', `🗑️ Ancien backup supprimé: ${oldBackup}`);
      } catch (e) {}
    }
  }

  encryptData(data) {
    const key = crypto.scryptSync(
      process.env.HANI_BACKUP_KEY || 'default-backup-key',
      'salt',
      32
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  // ═══════════════════════════════════════════════════════════
  // 🧹 UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  async clearSession() {
    this.log('warn', '🗑️ Nettoyage de la session...');
    
    try {
      // Créer un backup avant de nettoyer
      await this.createBackup();
      
      // Supprimer les fichiers de session
      const sessionFiles = fs.readdirSync(this.config.session.folder);
      for (const file of sessionFiles) {
        const filePath = path.join(this.config.session.folder, file);
        fs.unlinkSync(filePath);
      }
      
      this.log('info', '✅ Session nettoyée');
    } catch (error) {
      this.log('error', `❌ Erreur nettoyage: ${error.message}`);
    }
  }

  forceReconnect() {
    this.state = 'reconnecting';
    this.stopIntervals();
    
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    
    this.scheduleReconnect();
  }

  stopIntervals() {
    for (const [name, interval] of Object.entries(this.intervals)) {
      if (interval) {
        clearInterval(interval);
        this.intervals[name] = null;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 STATISTIQUES
  // ═══════════════════════════════════════════════════════════

  getStats() {
    return {
      ...this.stats,
      currentState: this.state,
      reconnectAttempt: this.reconnectAttempt,
      lastConnection: this.lastSuccessfulConnection,
      uptime: this.state === 'connected' 
        ? Date.now() - this.lastSuccessfulConnection 
        : 0
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔚 DÉCONNEXION PROPRE
  // ═══════════════════════════════════════════════════════════

  async disconnect() {
    this.log('info', '👋 Déconnexion propre en cours...');
    
    this.stopIntervals();
    
    if (this.socket) {
      await this.createBackup();
      this.socket.end();
      this.socket = null;
    }
    
    this.state = 'disconnected';
    this.emit('disconnected');
  }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = {
  AdvancedConnectionManager,
  CONNECTION_CONFIG
};
