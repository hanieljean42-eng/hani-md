/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║          🗄️ HANI-MD - Database Manager                    ║
 * ║        Module unifié de gestion des données               ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const mysqlDB = require('../DataBase/mysql');
const premiumDB = require('../DataBase/premium');

// ═══════════════════════════════════════════════════════════
// 📦 CLASSE DATABASE MANAGER
// ═══════════════════════════════════════════════════════════

class DatabaseManager {
  constructor() {
    // Données en cache mémoire pour performance
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
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this;
    
    try {
      const connected = await mysqlDB.connect();
      if (connected) {
        this.mysqlConnected = true;
        console.log("[DB] ✅ MySQL connecté - Stockage en ligne");
        await this.loadFromMySQL();
      } else {
        console.log("[DB] ⚠️ MySQL non disponible - Mode local");
      }
    } catch (e) {
      console.log("[DB] ⚠️ Erreur MySQL:", e.message);
      this.mysqlConnected = false;
    }
    
    this.initialized = true;
    return this;
  }

  async loadFromMySQL() {
    try {
      // Charger les stats
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
      
      console.log("[DB] ✅ Données MySQL chargées");
    } catch (e) {
      console.log("[DB] ⚠️ Erreur chargement MySQL:", e.message);
    }
  }

  save() {
    if (this.mysqlConnected) {
      this.syncToMySQL().catch(() => {});
    }
  }

  async syncToMySQL() {
    try {
      await mysqlDB.updateStats(this.data.stats);
    } catch (e) {
      console.log("[DB] ⚠️ Erreur sync MySQL:", e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 👤 UTILISATEURS
  // ═══════════════════════════════════════════════════════════

  async getUser(jid) {
    try {
      if (this.mysqlConnected) {
        const result = await mysqlDB.query(`SELECT * FROM users WHERE jid = ?`, [jid]);
        if (result && result[0]) {
          this.data.users[jid] = result[0];
          return result[0];
        }
      }
    } catch (e) {}
    
    if (!this.data.users[jid]) {
      this.data.users[jid] = { 
        jid,
        xp: 0, 
        level: 1, 
        messages: 0, 
        lastSeen: Date.now(),
        name: ""
      };
      
      if (this.mysqlConnected) {
        try {
          await mysqlDB.query(`
            INSERT INTO users (jid, xp, level, messages, name) 
            VALUES (?, 0, 1, 0, '')
            ON DUPLICATE KEY UPDATE jid = jid
          `, [jid]);
        } catch (e) {}
      }
    }
    return this.data.users[jid];
  }

  async addXP(jid, amount = 5) {
    const user = await this.getUser(jid);
    user.xp = (user.xp || 0) + amount;
    user.messages = (user.messages || 0) + 1;
    user.lastSeen = Date.now();
    
    const xpNeeded = (user.level || 1) * 100;
    let levelUp = false;
    if (user.xp >= xpNeeded) {
      user.level = (user.level || 1) + 1;
      user.xp = 0;
      levelUp = true;
    }
    
    if (this.mysqlConnected) {
      try {
        await mysqlDB.query(`
          UPDATE users SET xp = ?, level = ?, messages = ? WHERE jid = ?
        `, [user.xp, user.level, user.messages, jid]);
      } catch (e) {}
    }
    
    this.data.users[jid] = user;
    return { levelUp, newLevel: user.level };
  }

  // ═══════════════════════════════════════════════════════════
  // 👥 GROUPES
  // ═══════════════════════════════════════════════════════════

  async getGroup(jid) {
    try {
      if (this.mysqlConnected) {
        const result = await mysqlDB.query(`SELECT * FROM \`groups\` WHERE jid = ?`, [jid]);
        if (result && result[0]) {
          this.data.groups[jid] = result[0];
          return result[0];
        }
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
      
      if (this.mysqlConnected) {
        try {
          await mysqlDB.query(`
            INSERT INTO \`groups\` (jid, welcome, antilink, antispam, antibot, antitag, muted)
            VALUES (?, 1, 0, 0, 0, 0, 0)
            ON DUPLICATE KEY UPDATE jid = jid
          `, [jid]);
        } catch (e) {}
      }
    }
    return this.data.groups[jid];
  }

  async updateGroup(jid, updates) {
    const group = await this.getGroup(jid);
    Object.assign(group, updates);
    this.data.groups[jid] = group;
    
    if (this.mysqlConnected) {
      try {
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), jid];
        await mysqlDB.query(`UPDATE \`groups\` SET ${fields} WHERE jid = ?`, values);
      } catch (e) {}
    }
    
    return group;
  }

  // ═══════════════════════════════════════════════════════════
  // ⚠️ WARNS
  // ═══════════════════════════════════════════════════════════

  async addWarn(groupJid, userJid) {
    try {
      if (this.mysqlConnected) {
        const currentWarns = await mysqlDB.getWarns(userJid, groupJid);
        await mysqlDB.addWarn(userJid, groupJid, "Avertissement");
        return currentWarns + 1;
      }
    } catch (e) {}
    
    const group = await this.getGroup(groupJid);
    if (!group.warns) group.warns = {};
    group.warns[userJid] = (group.warns[userJid] || 0) + 1;
    return group.warns[userJid];
  }

  async getWarns(groupJid, userJid) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.getWarns(userJid, groupJid);
      }
    } catch (e) {}
    
    const group = await this.getGroup(groupJid);
    return (group.warns && group.warns[userJid]) || 0;
  }

  async resetWarns(groupJid, userJid) {
    try {
      if (this.mysqlConnected) {
        await mysqlDB.resetWarns(userJid, groupJid);
      }
    } catch (e) {}
    
    const group = await this.getGroup(groupJid);
    if (group.warns) delete group.warns[userJid];
  }

  // ═══════════════════════════════════════════════════════════
  // 🚫 BAN
  // ═══════════════════════════════════════════════════════════

  async isBanned(jid) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.isUserBanned(jid);
      }
    } catch (e) {}
    return this.data.banned.includes(jid);
  }

  async ban(jid) {
    try {
      if (this.mysqlConnected) {
        await mysqlDB.banUser(jid, "Banni par le système");
      }
    } catch (e) {}
    
    if (!this.data.banned.includes(jid)) {
      this.data.banned.push(jid);
    }
  }

  async unban(jid) {
    try {
      if (this.mysqlConnected) {
        await mysqlDB.unbanUser(jid);
      }
    } catch (e) {}
    this.data.banned = this.data.banned.filter(b => b !== jid);
  }

  // ═══════════════════════════════════════════════════════════
  // 👑 SUDO
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // ✅ APPROVED USERS
  // ═══════════════════════════════════════════════════════════

  isApproved(jid) {
    if (!this.data.approved) this.data.approved = [];
    return this.data.approved.includes(jid) || 
           this.data.approved.some(n => jid.includes(n));
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
    this.data.approved = this.data.approved.filter(s => 
      s !== jid && !jid.includes(s) && !s.includes(jid.replace(/[^0-9]/g, ''))
    );
    if (this.data.approved.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  getApprovedList() {
    return this.data.approved || [];
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 STATS
  // ═══════════════════════════════════════════════════════════

  incrementStats(key) {
    this.data.stats[key] = (this.data.stats[key] || 0) + 1;
    if (this.mysqlConnected) {
      mysqlDB.incrementStats(key).catch(() => {});
    }
  }

  getStats() {
    return this.data.stats;
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 MESSAGES SUPPRIMÉS
  // ═══════════════════════════════════════════════════════════

  async saveDeletedMessage(message, from, sender, senderName = '', groupName = null) {
    try {
      if (this.mysqlConnected) {
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
      }
    } catch (e) {
      console.log("[DB] ⚠️ Erreur sauvegarde message supprimé:", e.message);
    }
  }

  async getDeletedMessages(jid = null, limit = 20) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.getDeletedMessages(jid, limit);
      }
    } catch (e) {}
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // 👁️ SURVEILLANCE
  // ═══════════════════════════════════════════════════════════

  async addToSurveillance(jid) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.addToSurveillance(jid);
      }
    } catch (e) {}
    return false;
  }

  async removeFromSurveillance(jid) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.removeFromSurveillance(jid);
      }
    } catch (e) {}
    return false;
  }

  async getSurveillanceList() {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.getSurveillanceList();
      }
    } catch (e) {}
    return [];
  }

  async isUnderSurveillance(jid) {
    try {
      if (this.mysqlConnected) {
        return await mysqlDB.isUnderSurveillance(jid);
      }
    } catch (e) {}
    return false;
  }
}

// Singleton
const dbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  db: dbManager,
  initDatabase: () => dbManager.initialize()
};
