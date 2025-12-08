/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║           🗄️ HANI-MD - MySQL Database Module              ║
 * ║     Base de données externe pour persistance des données  ║
 * ╚═══════════════════════════════════════════════════════════╝
 * 
 * Hébergeurs MySQL gratuits:
 * - PlanetScale: https://planetscale.com (5GB gratuit)
 * - Railway: https://railway.app (500MB gratuit)
 * - FreeSQLDatabase: https://freesqldatabase.com
 * - db4free.net: https://db4free.net
 * 
 * Format de connexion:
 * MYSQL_URL=mysql://user:password@host:port/database
 * ou variables séparées:
 * MYSQL_HOST=host
 * MYSQL_USER=user
 * MYSQL_PASSWORD=password
 * MYSQL_DATABASE=database
 */

const mysql = require('mysql2/promise');

let pool = null;
let isConnected = false;

// ═══════════════════════════════════════════════════════════
// 🔌 CONNEXION
// ═══════════════════════════════════════════════════════════

async function connect() {
  try {
    // Support pour URL complète ou variables séparées
    if (process.env.MYSQL_URL) {
      pool = mysql.createPool(process.env.MYSQL_URL);
    } else if (process.env.MYSQL_HOST) {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });
    } else {
      console.log("⚠️ MySQL non configuré - Mode local uniquement");
      return false;
    }

    // Tester la connexion
    const connection = await pool.getConnection();
    connection.release();
    
    // Créer les tables si elles n'existent pas
    await createTables();
    
    isConnected = true;
    console.log("✅ MySQL connecté avec succès!");
    return true;
  } catch (error) {
    console.log("❌ Erreur connexion MySQL:", error.message);
    isConnected = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 📋 CRÉATION DES TABLES
// ═══════════════════════════════════════════════════════════

async function createTables() {
  const tables = [
    // Table des utilisateurs
    `CREATE TABLE IF NOT EXISTS users (
      jid VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) DEFAULT '',
      xp INT DEFAULT 0,
      level INT DEFAULT 1,
      messages INT DEFAULT 0,
      last_seen BIGINT,
      is_banned BOOLEAN DEFAULT FALSE,
      is_sudo BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // Table des groupes
    `CREATE TABLE IF NOT EXISTS \`groups\` (
      jid VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) DEFAULT '',
      welcome BOOLEAN DEFAULT TRUE,
      antilink BOOLEAN DEFAULT FALSE,
      antispam BOOLEAN DEFAULT FALSE,
      antibot BOOLEAN DEFAULT FALSE,
      antitag BOOLEAN DEFAULT FALSE,
      mute BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // Table des warns
    `CREATE TABLE IF NOT EXISTS warns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_jid VARCHAR(100) NOT NULL,
      user_jid VARCHAR(100) NOT NULL,
      count INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_warn (group_jid, user_jid)
    )`,
    
    // Table des contacts
    `CREATE TABLE IF NOT EXISTS contacts (
      jid VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      push_name VARCHAR(255) DEFAULT '',
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // Table des messages supprimés
    `CREATE TABLE IF NOT EXISTS deleted_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id VARCHAR(100),
      from_jid VARCHAR(100),
      sender_jid VARCHAR(100),
      sender_name VARCHAR(255) DEFAULT '',
      group_name VARCHAR(255),
      text TEXT,
      media_type VARCHAR(50),
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_from (from_jid),
      INDEX idx_sender (sender_jid)
    )`,
    
    // Table des statuts supprimés
    `CREATE TABLE IF NOT EXISTS deleted_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_jid VARCHAR(100),
      sender_name VARCHAR(255) DEFAULT '',
      sender_phone VARCHAR(50) DEFAULT '',
      media_type VARCHAR(50),
      caption TEXT,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sender (sender_jid)
    )`,
    
    // Table des paramètres
    `CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // Table des statistiques
    `CREATE TABLE IF NOT EXISTS stats (
      id INT PRIMARY KEY DEFAULT 1,
      commands INT DEFAULT 0,
      messages INT DEFAULT 0,
      start_time BIGINT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // Table de surveillance (spy)
    `CREATE TABLE IF NOT EXISTS surveillance (
      jid VARCHAR(100) PRIMARY KEY,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_messages INT DEFAULT 0,
      last_activity TIMESTAMP
    )`,
    
    // Table d'activité
    `CREATE TABLE IF NOT EXISTS activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jid VARCHAR(100) NOT NULL,
      action_type VARCHAR(50),
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_jid (jid),
      INDEX idx_time (timestamp)
    )`
  ];

  for (const sql of tables) {
    try {
      await pool.execute(sql);
    } catch (error) {
      console.log("⚠️ Erreur création table:", error.message);
    }
  }
  
  // Initialiser les stats si vide
  await pool.execute(
    `INSERT IGNORE INTO stats (id, commands, messages, start_time) VALUES (1, 0, 0, ?)`,
    [Date.now()]
  );
}

// ═══════════════════════════════════════════════════════════
// 👤 UTILISATEURS
// ═══════════════════════════════════════════════════════════

async function getUser(jid) {
  if (!isConnected) return null;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE jid = ?', [jid]);
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function updateUser(jid, data) {
  if (!isConnected) return false;
  try {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key === 'lastSeen' ? 'last_seen' : 
                    key === 'isBanned' ? 'is_banned' : 
                    key === 'isSudo' ? 'is_sudo' : key;
      fields.push(`${dbKey} = ?`);
      values.push(value);
    }
    
    // Upsert
    await pool.execute(
      `INSERT INTO users (jid, ${Object.keys(data).map(k => 
        k === 'lastSeen' ? 'last_seen' : k === 'isBanned' ? 'is_banned' : k === 'isSudo' ? 'is_sudo' : k
      ).join(', ')}) 
       VALUES (?, ${Object.keys(data).map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${fields.join(', ')}`,
      [jid, ...Object.values(data), ...values]
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function banUser(jid) {
  return updateUser(jid, { is_banned: true });
}

async function unbanUser(jid) {
  return updateUser(jid, { is_banned: false });
}

async function isBanned(jid) {
  const user = await getUser(jid);
  return user?.is_banned || false;
}

async function addSudo(jid) {
  return updateUser(jid, { is_sudo: true });
}

async function removeSudo(jid) {
  return updateUser(jid, { is_sudo: false });
}

async function isSudo(jid) {
  const user = await getUser(jid);
  return user?.is_sudo || false;
}

// ═══════════════════════════════════════════════════════════
// 👥 GROUPES
// ═══════════════════════════════════════════════════════════

async function getGroup(jid) {
  if (!isConnected) return null;
  try {
    const [rows] = await pool.execute('SELECT * FROM `groups` WHERE jid = ?', [jid]);
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function updateGroup(jid, data) {
  if (!isConnected) return false;
  try {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const updates = Object.keys(data).map(k => `${k} = VALUES(${k})`).join(', ');
    
    await pool.execute(
      `INSERT INTO \`groups\` (jid, ${columns}) VALUES (?, ${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      [jid, ...Object.values(data)]
    );
    return true;
  } catch (error) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// ⚠️ WARNS
// ═══════════════════════════════════════════════════════════

async function addWarn(groupJid, userJid) {
  if (!isConnected) return 0;
  try {
    await pool.execute(
      `INSERT INTO warns (group_jid, user_jid, count) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
      [groupJid, userJid]
    );
    const [rows] = await pool.execute(
      'SELECT count FROM warns WHERE group_jid = ? AND user_jid = ?',
      [groupJid, userJid]
    );
    return rows[0]?.count || 1;
  } catch (error) {
    return 0;
  }
}

async function getWarns(groupJid, userJid) {
  if (!isConnected) return 0;
  try {
    const [rows] = await pool.execute(
      'SELECT count FROM warns WHERE group_jid = ? AND user_jid = ?',
      [groupJid, userJid]
    );
    return rows[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}

async function resetWarns(groupJid, userJid) {
  if (!isConnected) return;
  try {
    await pool.execute(
      'DELETE FROM warns WHERE group_jid = ? AND user_jid = ?',
      [groupJid, userJid]
    );
  } catch (error) {}
}

// ═══════════════════════════════════════════════════════════
// 📇 CONTACTS
// ═══════════════════════════════════════════════════════════

async function saveContact(jid, name, phone, pushName = '') {
  if (!isConnected) return false;
  try {
    await pool.execute(
      `INSERT INTO contacts (jid, name, phone, push_name) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = ?, phone = ?, push_name = ?`,
      [jid, name, phone, pushName, name, phone, pushName]
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function getContact(jid) {
  if (!isConnected) return null;
  try {
    const [rows] = await pool.execute('SELECT * FROM contacts WHERE jid = ?', [jid]);
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function searchContacts(query) {
  if (!isConnected) return [];
  try {
    const searchTerm = `%${query}%`;
    const [rows] = await pool.execute(
      'SELECT * FROM contacts WHERE name LIKE ? OR phone LIKE ? OR push_name LIKE ? LIMIT 50',
      [searchTerm, searchTerm, searchTerm]
    );
    return rows;
  } catch (error) {
    return [];
  }
}

async function getAllContacts() {
  if (!isConnected) return [];
  try {
    const [rows] = await pool.execute('SELECT * FROM contacts ORDER BY last_seen DESC');
    return rows;
  } catch (error) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 🗑️ MESSAGES SUPPRIMÉS
// ═══════════════════════════════════════════════════════════

async function saveDeletedMessage(data) {
  if (!isConnected) return false;
  try {
    await pool.execute(
      `INSERT INTO deleted_messages (message_id, from_jid, sender_jid, sender_name, group_name, text, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.messageId, data.from, data.sender, data.senderName || '', data.groupName, data.text || '', data.mediaType]
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function getDeletedMessages(jid = null, limit = 20) {
  if (!isConnected) return [];
  try {
    let query = 'SELECT * FROM deleted_messages';
    const params = [];
    
    if (jid) {
      query += ' WHERE from_jid = ? OR sender_jid = ?';
      params.push(jid, jid);
    }
    
    query += ' ORDER BY deleted_at DESC LIMIT ?';
    params.push(limit);
    
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 📸 STATUTS SUPPRIMÉS
// ═══════════════════════════════════════════════════════════

async function saveDeletedStatus(data) {
  if (!isConnected) return false;
  try {
    await pool.execute(
      `INSERT INTO deleted_statuses (sender_jid, sender_name, sender_phone, media_type, caption)
       VALUES (?, ?, ?, ?, ?)`,
      [data.sender, data.senderName || '', data.senderPhone || '', data.mediaType, data.caption || '']
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function getDeletedStatuses(senderJid = null, limit = 20) {
  if (!isConnected) return [];
  try {
    let query = 'SELECT * FROM deleted_statuses';
    const params = [];
    
    if (senderJid) {
      query += ' WHERE sender_jid = ?';
      params.push(senderJid);
    }
    
    query += ' ORDER BY deleted_at DESC LIMIT ?';
    params.push(limit);
    
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES
// ═══════════════════════════════════════════════════════════

async function getStats() {
  if (!isConnected) return null;
  try {
    const [rows] = await pool.execute('SELECT * FROM stats WHERE id = 1');
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function updateStats(data) {
  if (!isConnected) return false;
  try {
    const updates = [];
    const values = [];
    
    if (data.commands !== undefined) {
      updates.push('commands = ?');
      values.push(data.commands);
    }
    if (data.messages !== undefined) {
      updates.push('messages = ?');
      values.push(data.messages);
    }
    
    if (updates.length > 0) {
      await pool.execute(`UPDATE stats SET ${updates.join(', ')} WHERE id = 1`, values);
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function incrementStats(key) {
  if (!isConnected) return;
  try {
    await pool.execute(`UPDATE stats SET ${key} = ${key} + 1 WHERE id = 1`);
  } catch (error) {}
}

// ═══════════════════════════════════════════════════════════
// 🕵️ SURVEILLANCE
// ═══════════════════════════════════════════════════════════

async function addToSurveillance(jid) {
  if (!isConnected) return false;
  try {
    await pool.execute(
      `INSERT IGNORE INTO surveillance (jid) VALUES (?)`,
      [jid]
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function removeFromSurveillance(jid) {
  if (!isConnected) return false;
  try {
    await pool.execute('DELETE FROM surveillance WHERE jid = ?', [jid]);
    return true;
  } catch (error) {
    return false;
  }
}

async function getSurveillanceList() {
  if (!isConnected) return [];
  try {
    const [rows] = await pool.execute('SELECT * FROM surveillance');
    return rows;
  } catch (error) {
    return [];
  }
}

async function isUnderSurveillance(jid) {
  if (!isConnected) return false;
  try {
    const [rows] = await pool.execute('SELECT jid FROM surveillance WHERE jid = ?', [jid]);
    return rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function logActivity(jid, actionType, details) {
  if (!isConnected) return;
  try {
    await pool.execute(
      'INSERT INTO activity (jid, action_type, details) VALUES (?, ?, ?)',
      [jid, actionType, details]
    );
    // Mettre à jour last_activity
    await pool.execute(
      'UPDATE surveillance SET total_messages = total_messages + 1, last_activity = NOW() WHERE jid = ?',
      [jid]
    );
  } catch (error) {}
}

async function getActivity(jid, limit = 50) {
  if (!isConnected) return [];
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM activity WHERE jid = ? ORDER BY timestamp DESC LIMIT ?',
      [jid, limit]
    );
    return rows;
  } catch (error) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 🧹 NETTOYAGE
// ═══════════════════════════════════════════════════════════

async function cleanOldData(daysToKeep = 30) {
  if (!isConnected) return;
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
    
    await pool.execute('DELETE FROM deleted_messages WHERE deleted_at < ?', [cutoff]);
    await pool.execute('DELETE FROM deleted_statuses WHERE deleted_at < ?', [cutoff]);
    await pool.execute('DELETE FROM activity WHERE timestamp < ?', [cutoff]);
    
    console.log(`🧹 Données de plus de ${daysToKeep} jours nettoyées`);
  } catch (error) {}
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  connect,
  isConnected: () => isConnected,
  
  // Utilisateurs
  getUser,
  updateUser,
  banUser,
  unbanUser,
  isBanned,
  addSudo,
  removeSudo,
  isSudo,
  
  // Groupes
  getGroup,
  updateGroup,
  
  // Warns
  addWarn,
  getWarns,
  resetWarns,
  
  // Contacts
  saveContact,
  getContact,
  searchContacts,
  getAllContacts,
  
  // Messages supprimés
  saveDeletedMessage,
  getDeletedMessages,
  
  // Statuts supprimés
  saveDeletedStatus,
  getDeletedStatuses,
  
  // Stats
  getStats,
  updateStats,
  incrementStats,
  
  // Surveillance
  addToSurveillance,
  removeFromSurveillance,
  getSurveillanceList,
  isUnderSurveillance,
  logActivity,
  getActivity,
  
  // Nettoyage
  cleanOldData
};
