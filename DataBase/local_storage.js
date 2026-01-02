/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💾 HANI-MD - Local Storage Module v1.0             ║
 * ║     Stockage local JSON quand MySQL n'est pas configuré   ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers de stockage
const STORAGE_DIR = path.join(__dirname);
const FILES = {
  autoreply: path.join(STORAGE_DIR, 'autoreply.json'),
  notes: path.join(STORAGE_DIR, 'notes.json'),
  users: path.join(STORAGE_DIR, 'users_local.json'),
  groups: path.join(STORAGE_DIR, 'groups_local.json'),
  protections: path.join(STORAGE_DIR, 'protections.json'),
  economy: path.join(STORAGE_DIR, 'economy.json'),
  warns: path.join(STORAGE_DIR, 'warns.json'),
  commands: path.join(STORAGE_DIR, 'commands.json'),
  broadcast: path.join(STORAGE_DIR, 'broadcast.json')
};

// Initialisation des fichiers si inexistants
function initFiles() {
  for (const [key, filePath] of Object.entries(FILES)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '{}', 'utf8');
      console.log(`[LOCAL-DB] ✅ Fichier créé: ${key}`);
    }
  }
}

// Lecture sécurisée d'un fichier JSON
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '{}', 'utf8');
      return {};
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data) || {};
  } catch (e) {
    console.log(`[LOCAL-DB] ⚠️ Erreur lecture ${file}:`, e.message);
    return {};
  }
}

// Écriture sécurisée d'un fichier JSON
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.log(`[LOCAL-DB] ⚠️ Erreur écriture ${file}:`, e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 📝 RÉPONSES AUTOMATIQUES
// ═══════════════════════════════════════════════════════════

function createAutoReply(trigger, response, triggerType = 'contains', options = {}) {
  const data = readJSON(FILES.autoreply);
  const id = Date.now();
  data[id] = {
    id,
    trigger_word: trigger.toLowerCase(),
    trigger_type: triggerType,
    response,
    media_url: options.mediaUrl || null,
    media_type: options.mediaType || null,
    is_active: true,
    group_only: options.groupOnly || false,
    private_only: options.privateOnly || false,
    usage_count: 0,
    created_at: new Date().toISOString()
  };
  const success = writeJSON(FILES.autoreply, data);
  if (success) console.log(`[LOCAL-DB] ✅ AutoReply créé: "${trigger}" -> "${response.substring(0, 30)}..."`);
  return success;
}

function getAutoReplies(isGroup = false) {
  const data = readJSON(FILES.autoreply);
  return Object.values(data).filter(ar => {
    if (!ar.is_active) return false;
    if (isGroup && ar.private_only) return false;
    if (!isGroup && ar.group_only) return false;
    return true;
  });
}

function checkAutoReply(text, isGroup = false) {
  const autoReplies = getAutoReplies(isGroup);
  const lowerText = text.toLowerCase();
  
  for (const ar of autoReplies) {
    let match = false;
    switch (ar.trigger_type) {
      case 'exact':
        match = lowerText === ar.trigger_word;
        break;
      case 'contains':
        match = lowerText.includes(ar.trigger_word);
        break;
      case 'startswith':
        match = lowerText.startsWith(ar.trigger_word);
        break;
      case 'regex':
        try {
          match = new RegExp(ar.trigger_word, 'i').test(text);
        } catch (e) {
          match = false;
        }
        break;
    }
    if (match) return ar;
  }
  return null;
}

function deleteAutoReply(id) {
  const data = readJSON(FILES.autoreply);
  const idStr = String(id);
  if (data[idStr]) {
    delete data[idStr];
    const success = writeJSON(FILES.autoreply, data);
    if (success) console.log(`[LOCAL-DB] ✅ AutoReply supprimé: ID ${id}`);
    return success;
  }
  // Chercher par ID numérique dans les objets
  for (const [key, value] of Object.entries(data)) {
    if (value.id === parseInt(id)) {
      delete data[key];
      const success = writeJSON(FILES.autoreply, data);
      if (success) console.log(`[LOCAL-DB] ✅ AutoReply supprimé: ID ${id}`);
      return success;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 📝 NOTES
// ═══════════════════════════════════════════════════════════

function saveNote(userJid, name, content) {
  const data = readJSON(FILES.notes);
  if (!data[userJid]) data[userJid] = {};
  data[userJid][name.toLowerCase()] = {
    name: name.toLowerCase(),
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const success = writeJSON(FILES.notes, data);
  if (success) console.log(`[LOCAL-DB] ✅ Note sauvée: "${name}" pour ${userJid}`);
  return success;
}

function getNote(userJid, name) {
  const data = readJSON(FILES.notes);
  return data[userJid]?.[name.toLowerCase()] || null;
}

function getAllNotes(userJid) {
  const data = readJSON(FILES.notes);
  return Object.values(data[userJid] || {});
}

function deleteNote(userJid, name) {
  const data = readJSON(FILES.notes);
  if (data[userJid] && data[userJid][name.toLowerCase()]) {
    delete data[userJid][name.toLowerCase()];
    const success = writeJSON(FILES.notes, data);
    if (success) console.log(`[LOCAL-DB] ✅ Note supprimée: "${name}"`);
    return success;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 👤 UTILISATEURS
// ═══════════════════════════════════════════════════════════

function getUser(jid) {
  const data = readJSON(FILES.users);
  return data[jid] || null;
}

function updateUser(jid, updates) {
  const data = readJSON(FILES.users);
  if (!data[jid]) {
    data[jid] = {
      jid,
      name: '',
      xp: 0,
      level: 1,
      messages: 0,
      is_banned: false,
      is_sudo: false,
      created_at: new Date().toISOString()
    };
  }
  data[jid] = { ...data[jid], ...updates, updated_at: new Date().toISOString() };
  return writeJSON(FILES.users, data);
}

function banUser(jid) {
  return updateUser(jid, { is_banned: true });
}

function unbanUser(jid) {
  return updateUser(jid, { is_banned: false });
}

function isBanned(jid) {
  const user = getUser(jid);
  return user?.is_banned || false;
}

function getBannedUsers() {
  const data = readJSON(FILES.users);
  return Object.values(data).filter(u => u.is_banned).map(u => u.jid);
}

function addSudo(jid) {
  return updateUser(jid, { is_sudo: true });
}

function removeSudo(jid) {
  return updateUser(jid, { is_sudo: false });
}

function isSudo(jid) {
  const user = getUser(jid);
  return user?.is_sudo || false;
}

function getSudoList() {
  const data = readJSON(FILES.users);
  return Object.values(data).filter(u => u.is_sudo).map(u => u.jid);
}

// ═══════════════════════════════════════════════════════════
// 👥 GROUPES
// ═══════════════════════════════════════════════════════════

function getGroup(jid) {
  const data = readJSON(FILES.groups);
  return data[jid] || null;
}

function updateGroup(jid, updates) {
  const data = readJSON(FILES.groups);
  if (!data[jid]) {
    data[jid] = {
      jid,
      name: '',
      welcome: true,
      antilink: false,
      antispam: false,
      antibot: false,
      antitag: false,
      mute: false,
      created_at: new Date().toISOString()
    };
  }
  data[jid] = { ...data[jid], ...updates, updated_at: new Date().toISOString() };
  return writeJSON(FILES.groups, data);
}

// ═══════════════════════════════════════════════════════════
// 🛡️ PROTECTIONS
// ═══════════════════════════════════════════════════════════

function getGroupProtection(groupJid) {
  const data = readJSON(FILES.protections);
  return data[groupJid] || null;
}

function setGroupProtection(groupJid, settings) {
  const data = readJSON(FILES.protections);
  data[groupJid] = {
    ...data[groupJid],
    ...settings,
    updated_at: new Date().toISOString()
  };
  const success = writeJSON(FILES.protections, data);
  if (success) console.log(`[LOCAL-DB] ✅ Protections mises à jour pour ${groupJid}`);
  return success;
}

function isProtectionEnabled(groupJid, protectionType) {
  const protection = getGroupProtection(groupJid);
  return protection?.[protectionType] || false;
}

// ═══════════════════════════════════════════════════════════
// ⚠️ WARNS
// ═══════════════════════════════════════════════════════════

function addWarn(groupJid, userJid) {
  const data = readJSON(FILES.warns);
  const key = `${groupJid}:${userJid}`;
  if (!data[key]) {
    data[key] = { groupJid, userJid, count: 0, warns: [] };
  }
  data[key].count++;
  data[key].warns.push({ date: new Date().toISOString() });
  writeJSON(FILES.warns, data);
  return data[key].count;
}

function getWarns(groupJid, userJid) {
  const data = readJSON(FILES.warns);
  const key = `${groupJid}:${userJid}`;
  return data[key]?.count || 0;
}

function resetWarns(groupJid, userJid) {
  const data = readJSON(FILES.warns);
  const key = `${groupJid}:${userJid}`;
  if (data[key]) {
    delete data[key];
    return writeJSON(FILES.warns, data);
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// 💰 ÉCONOMIE
// ═══════════════════════════════════════════════════════════

function getEconomy(jid) {
  const data = readJSON(FILES.economy);
  if (!data[jid]) {
    data[jid] = { jid, balance: 0, bank: 0, last_daily: null, last_work: null };
    writeJSON(FILES.economy, data);
  }
  return data[jid];
}

function updateBalance(jid, amount, type = 'add') {
  const data = readJSON(FILES.economy);
  if (!data[jid]) {
    data[jid] = { jid, balance: 0, bank: 0, last_daily: null, last_work: null };
  }
  if (type === 'add') {
    data[jid].balance += amount;
  } else if (type === 'subtract') {
    data[jid].balance -= amount;
  } else if (type === 'set') {
    data[jid].balance = amount;
  }
  return writeJSON(FILES.economy, data);
}

function transferMoney(fromJid, toJid, amount) {
  const data = readJSON(FILES.economy);
  if (!data[fromJid]) data[fromJid] = { jid: fromJid, balance: 0, bank: 0 };
  if (!data[toJid]) data[toJid] = { jid: toJid, balance: 0, bank: 0 };
  
  if (data[fromJid].balance < amount) return false;
  
  data[fromJid].balance -= amount;
  data[toJid].balance += amount;
  return writeJSON(FILES.economy, data);
}

function depositToBank(jid, amount) {
  const data = readJSON(FILES.economy);
  if (!data[jid]) return false;
  if (data[jid].balance < amount) return false;
  
  data[jid].balance -= amount;
  data[jid].bank += amount;
  return writeJSON(FILES.economy, data);
}

function withdrawFromBank(jid, amount) {
  const data = readJSON(FILES.economy);
  if (!data[jid]) return false;
  if (data[jid].bank < amount) return false;
  
  data[jid].bank -= amount;
  data[jid].balance += amount;
  return writeJSON(FILES.economy, data);
}

function getLeaderboard(limit = 10) {
  const data = readJSON(FILES.economy);
  return Object.values(data)
    .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// 🎮 COMMANDES PERSONNALISÉES
// ═══════════════════════════════════════════════════════════

function createCustomCommand(name, response, mediaUrl = null, mediaType = null, createdBy = null) {
  const data = readJSON(FILES.commands);
  data[name.toLowerCase()] = {
    name: name.toLowerCase(),
    response,
    media_url: mediaUrl,
    media_type: mediaType,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };
  const success = writeJSON(FILES.commands, data);
  if (success) console.log(`[LOCAL-DB] ✅ Commande créée: ${name}`);
  return success;
}

function getCustomCommand(name) {
  const data = readJSON(FILES.commands);
  return data[name.toLowerCase()] || null;
}

function getAllCustomCommands() {
  const data = readJSON(FILES.commands);
  return Object.values(data);
}

function deleteCustomCommand(name) {
  const data = readJSON(FILES.commands);
  if (data[name.toLowerCase()]) {
    delete data[name.toLowerCase()];
    const success = writeJSON(FILES.commands, data);
    if (success) console.log(`[LOCAL-DB] ✅ Commande supprimée: ${name}`);
    return success;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 📢 LISTES DE DIFFUSION
// ═══════════════════════════════════════════════════════════

function createBroadcastList(name, jids, createdBy) {
  const data = readJSON(FILES.broadcast);
  data[name.toLowerCase()] = {
    name: name.toLowerCase(),
    jids,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };
  return writeJSON(FILES.broadcast, data);
}

function getBroadcastList(name) {
  const data = readJSON(FILES.broadcast);
  return data[name.toLowerCase()] || null;
}

function getAllBroadcastLists() {
  const data = readJSON(FILES.broadcast);
  return Object.values(data);
}

function deleteBroadcastList(name) {
  const data = readJSON(FILES.broadcast);
  if (data[name.toLowerCase()]) {
    delete data[name.toLowerCase()];
    return writeJSON(FILES.broadcast, data);
  }
  return false;
}

// Initialiser les fichiers au démarrage
initFiles();

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Réponses automatiques
  createAutoReply,
  getAutoReplies,
  checkAutoReply,
  deleteAutoReply,
  
  // Notes
  saveNote,
  getNote,
  getAllNotes,
  deleteNote,
  
  // Utilisateurs
  getUser,
  updateUser,
  banUser,
  unbanUser,
  isBanned,
  getBannedUsers,
  addSudo,
  removeSudo,
  isSudo,
  getSudoList,
  
  // Groupes
  getGroup,
  updateGroup,
  
  // Protections
  getGroupProtection,
  setGroupProtection,
  isProtectionEnabled,
  
  // Warns
  addWarn,
  getWarns,
  resetWarns,
  
  // Économie
  getEconomy,
  updateBalance,
  transferMoney,
  depositToBank,
  withdrawFromBank,
  getLeaderboard,
  
  // Commandes personnalisées
  createCustomCommand,
  getCustomCommand,
  getAllCustomCommands,
  deleteCustomCommand,
  
  // Listes de diffusion
  createBroadcastList,
  getBroadcastList,
  getAllBroadcastLists,
  deleteBroadcastList,
  
  // Utilitaires
  readJSON,
  writeJSON,
  FILES
};
