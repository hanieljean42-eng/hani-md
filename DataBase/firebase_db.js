/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║      🔥 HANI-MD - BASE DE DONNÉES FIREBASE COMPLÈTE       ║
 * ║   Remplace totalement mysql.js + persistance premium      ║
 * ║   Firebase Realtime Database — gratuit 1GB / 10GB mois    ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Variables d'environnement requises:
 *   FIREBASE_URL         = https://hani-md-default-rtdb.firebaseio.com
 *   FIREBASE_CREDENTIALS = {"type":"service_account",...}  (JSON complet)
 *
 * Structure des données:
 *   /hanimd/users/{jid}          → données utilisateur
 *   /hanimd/groups/{jid}         → données groupe
 *   /hanimd/bans/{jid}           → utilisateurs bannis
 *   /hanimd/sudo/{jid}           → liste sudo
 *   /hanimd/warns/{jid}          → avertissements
 *   /hanimd/settings/{key}       → paramètres clé-valeur
 *   /hanimd/notes/{key}          → notes
 *   /hanimd/economy/{jid}        → économie
 *   /hanimd/contacts/{jid}       → contacts
 *   /hanimd/stats/global         → statistiques globales
 *   /hanimd/activity/{jid}       → activité
 *   /hanimd/surveillance/{jid}   → surveillance
 *   /hanimd/custom_commands/{t}  → commandes personnalisées
 *   /hanimd/auto_replies/{t}     → réponses automatiques
 *   /hanimd/group_protections/{jid} → protections groupe
 */

let admin = null;
let db    = null;
let _connected = false;

// ── Helper: nettoyer les clés Firebase (pas de . # $ [ ]) ──
const safeKey = k => String(k).replace(/[.#$\[\]]/g, '_');

// ── Helper: lire un chemin ──
async function _get(path) {
  if (!db) return null;
  try {
    const snap = await db.ref(path).once('value');
    return snap.val();
  } catch(e) { return null; }
}

// ── Helper: écrire à un chemin ──
async function _set(path, data) {
  if (!db) return false;
  try { await db.ref(path).set(data); return true; }
  catch(e) { return false; }
}

// ── Helper: merger (update partiel) ──
async function _update(path, data) {
  if (!db) return false;
  try { await db.ref(path).update(data); return true; }
  catch(e) { return false; }
}

// ── Helper: supprimer ──
async function _remove(path) {
  if (!db) return false;
  try { await db.ref(path).remove(); return true; }
  catch(e) { return false; }
}

// ═══════════════════════════════════════════════════════════
// 🔌 CONNEXION
// ═══════════════════════════════════════════════════════════

async function connect() {
  const url   = process.env.FIREBASE_URL;
  const creds = process.env.FIREBASE_CREDENTIALS;

  if (!url) {
    console.log('[FIREBASE] ℹ️ FIREBASE_URL non défini — Firebase désactivé');
    return false;
  }

  try {
    admin = require('firebase-admin');

    if (!admin.apps.length) {
      const appConfig = { databaseURL: url };
      if (creds) {
        try {
          const sa = typeof creds === 'string' ? JSON.parse(creds) : creds;
          appConfig.credential = admin.credential.cert(sa);
        } catch (e) {
          console.error('[FIREBASE] ❌ FIREBASE_CREDENTIALS invalide:', e.message);
          return false;
        }
      } else {
        console.log('[FIREBASE] ⚠️ Pas de FIREBASE_CREDENTIALS — règles publiques requises');
        appConfig.credential = admin.credential.applicationDefault();
      }
      admin.initializeApp(appConfig);
    }

    db = admin.database();
    await db.ref('.info/connected').once('value');
    _connected = true;
    console.log('[FIREBASE] ✅ Connecté →', url);
    return true;
  } catch (e) {
    _connected = false;
    if (e.code === 'MODULE_NOT_FOUND') {
      console.error('[FIREBASE] ❌ Lance: npm install firebase-admin');
    } else {
      console.error('[FIREBASE] ❌ Connexion échouée:', e.message);
    }
    return false;
  }
}

function disconnect() { _connected = false; db = null; }
function isConnected() { return _connected && db !== null; }

// ═══════════════════════════════════════════════════════════
// ⚙️ SETTINGS (clé-valeur — persistance premium, configs)
// ═══════════════════════════════════════════════════════════

async function getSetting(key) {
  const val = await _get(`hanimd/settings/${safeKey(key)}`);
  return val !== null && val !== undefined ? String(val) : null;
}

async function setSetting(key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  return _set(`hanimd/settings/${safeKey(key)}`, v);
}

async function deleteSetting(key) {
  return _remove(`hanimd/settings/${safeKey(key)}`);
}

// ═══════════════════════════════════════════════════════════
// 👤 UTILISATEURS
// ═══════════════════════════════════════════════════════════

async function getUser(jid) {
  const data = await _get(`hanimd/users/${safeKey(jid)}`);
  return data || { jid, messages_count: 0, commands_count: 0, created_at: new Date().toISOString() };
}

async function updateUser(jid, updates) {
  const current = await _get(`hanimd/users/${safeKey(jid)}`) || {};
  return _set(`hanimd/users/${safeKey(jid)}`, { ...current, ...updates, jid, updated_at: new Date().toISOString() });
}

async function banUser(jid, reason = '') {
  return _set(`hanimd/bans/${safeKey(jid)}`, { jid, reason, banned_at: new Date().toISOString() });
}

async function unbanUser(jid) {
  return _remove(`hanimd/bans/${safeKey(jid)}`);
}

async function isBanned(jid) {
  const data = await _get(`hanimd/bans/${safeKey(jid)}`);
  return data !== null;
}

async function getBannedUsers() {
  const data = await _get('hanimd/bans');
  return data ? Object.values(data) : [];
}

// ═══════════════════════════════════════════════════════════
// 🛡️ SUDO
// ═══════════════════════════════════════════════════════════

async function addSudo(jid) {
  return _set(`hanimd/sudo/${safeKey(jid)}`, { jid, added_at: new Date().toISOString() });
}

async function removeSudo(jid) {
  return _remove(`hanimd/sudo/${safeKey(jid)}`);
}

async function isSudo(jid) {
  const data = await _get(`hanimd/sudo/${safeKey(jid)}`);
  return data !== null;
}

async function getSudoList() {
  const data = await _get('hanimd/sudo');
  return data ? Object.values(data).map(d => d.jid) : [];
}

// ═══════════════════════════════════════════════════════════
// 👥 GROUPES
// ═══════════════════════════════════════════════════════════

async function getGroup(jid) {
  const data = await _get(`hanimd/groups/${safeKey(jid)}`);
  return data || { jid, antilink: false, antispam: false, welcome: true };
}

async function updateGroup(jid, updates) {
  const current = await _get(`hanimd/groups/${safeKey(jid)}`) || {};
  return _set(`hanimd/groups/${safeKey(jid)}`, { ...current, ...updates, jid, updated_at: new Date().toISOString() });
}

// ═══════════════════════════════════════════════════════════
// ⚠️ AVERTISSEMENTS (WARNS)
// ═══════════════════════════════════════════════════════════

async function addWarn(jid, reason = '', by = '') {
  const path  = `hanimd/warns/${safeKey(jid)}`;
  const data  = await _get(path) || { jid, warns: [] };
  if (!Array.isArray(data.warns)) data.warns = [];
  data.warns.push({ reason, by, date: new Date().toISOString() });
  await _set(path, data);
  return data.warns.length;
}

async function getWarns(jid) {
  const data = await _get(`hanimd/warns/${safeKey(jid)}`);
  return data?.warns || [];
}

async function resetWarns(jid) {
  return _remove(`hanimd/warns/${safeKey(jid)}`);
}

// ═══════════════════════════════════════════════════════════
// 📇 CONTACTS
// ═══════════════════════════════════════════════════════════

async function saveContact(jid, name, phone = '') {
  return _set(`hanimd/contacts/${safeKey(jid)}`, { jid, name, phone, saved_at: new Date().toISOString() });
}

async function getContact(jid) {
  return _get(`hanimd/contacts/${safeKey(jid)}`);
}

async function getAllContacts() {
  const data = await _get('hanimd/contacts');
  return data ? Object.values(data) : [];
}

async function searchContacts(query) {
  const all = await getAllContacts();
  const q = query.toLowerCase();
  return all.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
}

// ═══════════════════════════════════════════════════════════
// 💰 ÉCONOMIE
// ═══════════════════════════════════════════════════════════

async function getEconomy(jid) {
  const data = await _get(`hanimd/economy/${safeKey(jid)}`);
  return data || { jid, wallet: 0, bank: 0, last_daily: null };
}

async function updateBalance(jid, amount, type = 'wallet') {
  const eco = await getEconomy(jid);
  eco[type] = (eco[type] || 0) + amount;
  eco.updated_at = new Date().toISOString();
  return _set(`hanimd/economy/${safeKey(jid)}`, eco);
}

async function depositToBank(jid, amount) {
  const eco = await getEconomy(jid);
  if (eco.wallet < amount) return { success: false, msg: 'Solde insuffisant' };
  eco.wallet -= amount;
  eco.bank   += amount;
  await _set(`hanimd/economy/${safeKey(jid)}`, eco);
  return { success: true, wallet: eco.wallet, bank: eco.bank };
}

async function withdrawFromBank(jid, amount) {
  const eco = await getEconomy(jid);
  if (eco.bank < amount) return { success: false, msg: 'Banque insuffisante' };
  eco.bank   -= amount;
  eco.wallet += amount;
  await _set(`hanimd/economy/${safeKey(jid)}`, eco);
  return { success: true, wallet: eco.wallet, bank: eco.bank };
}

async function transferMoney(fromJid, toJid, amount) {
  const from = await getEconomy(fromJid);
  if (from.wallet < amount) return { success: false, msg: 'Solde insuffisant' };
  await updateBalance(fromJid, -amount, 'wallet');
  await updateBalance(toJid, amount, 'wallet');
  return { success: true };
}

async function getLeaderboard(limit = 10) {
  const data = await _get('hanimd/economy');
  if (!data) return [];
  return Object.values(data)
    .map(e => ({ jid: e.jid, total: (e.wallet || 0) + (e.bank || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// 📝 NOTES
// ═══════════════════════════════════════════════════════════

async function saveNote(key, content, by = '') {
  return _set(`hanimd/notes/${safeKey(key)}`, { key, content, by, created_at: new Date().toISOString() });
}

async function getNote(key) {
  return _get(`hanimd/notes/${safeKey(key)}`);
}

async function getAllNotes() {
  const data = await _get('hanimd/notes');
  return data ? Object.values(data) : [];
}

async function deleteNote(key) {
  return _remove(`hanimd/notes/${safeKey(key)}`);
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES
// ═══════════════════════════════════════════════════════════

async function getStats() {
  return (await _get('hanimd/stats/global')) || { messages: 0, commands: 0, users: 0, groups: 0 };
}

async function incrementStats(type) {
  const stats = await getStats();
  stats[type] = (stats[type] || 0) + 1;
  return _set('hanimd/stats/global', stats);
}

async function updateStats(data) {
  const current = await getStats();
  return _set('hanimd/stats/global', { ...current, ...data });
}

async function getDashboardStats() {
  const stats = await getStats();
  const bans  = await getBannedUsers();
  const sudos = await getSudoList();
  return { ...stats, banned: bans.length, sudo: sudos.length };
}

async function getRecentActivity(limit = 20) {
  const data = await _get('hanimd/activity_log');
  if (!data) return [];
  return Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// 👁️ SURVEILLANCE
// ═══════════════════════════════════════════════════════════

async function addToSurveillance(jid, reason = '') {
  return _set(`hanimd/surveillance/${safeKey(jid)}`, { jid, reason, added_at: new Date().toISOString() });
}

async function removeFromSurveillance(jid) {
  return _remove(`hanimd/surveillance/${safeKey(jid)}`);
}

async function getSurveillanceList() {
  const data = await _get('hanimd/surveillance');
  return data ? Object.values(data) : [];
}

async function isUnderSurveillance(jid) {
  const data = await _get(`hanimd/surveillance/${safeKey(jid)}`);
  return data !== null;
}

async function logActivity(jid, action, details = '') {
  const key = `${Date.now()}_${safeKey(jid)}`;
  return _set(`hanimd/activity_log/${key}`, { jid, action, details, date: new Date().toISOString() });
}

async function getActivity(jid, limit = 20) {
  const data = await _get('hanimd/activity_log');
  if (!data) return [];
  return Object.values(data)
    .filter(a => a.jid === jid)
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// 🤖 COMMANDES PERSONNALISÉES
// ═══════════════════════════════════════════════════════════

async function createCustomCommand(trigger, response, by = '') {
  return _set(`hanimd/custom_commands/${safeKey(trigger)}`, { trigger, response, by, created_at: new Date().toISOString() });
}

async function getCustomCommand(trigger) {
  return _get(`hanimd/custom_commands/${safeKey(trigger)}`);
}

async function getAllCustomCommands() {
  const data = await _get('hanimd/custom_commands');
  return data ? Object.values(data) : [];
}

async function deleteCustomCommand(trigger) {
  return _remove(`hanimd/custom_commands/${safeKey(trigger)}`);
}

// ═══════════════════════════════════════════════════════════
// 🔁 RÉPONSES AUTOMATIQUES
// ═══════════════════════════════════════════════════════════

async function createAutoReply(trigger, response, by = '') {
  return _set(`hanimd/auto_replies/${safeKey(trigger)}`, { trigger, response, by, created_at: new Date().toISOString() });
}

async function getAutoReplies() {
  const data = await _get('hanimd/auto_replies');
  return data ? Object.values(data) : [];
}

async function checkAutoReply(text) {
  const replies = await getAutoReplies();
  return replies.find(r => text.toLowerCase().includes(r.trigger.toLowerCase())) || null;
}

async function deleteAutoReply(trigger) {
  return _remove(`hanimd/auto_replies/${safeKey(trigger)}`);
}

// ═══════════════════════════════════════════════════════════
// 🛡️ PROTECTIONS DE GROUPE
// ═══════════════════════════════════════════════════════════

async function getGroupProtection(jid) {
  const data = await _get(`hanimd/group_protections/${safeKey(jid)}`);
  return data || { jid, antilink: false, antispam: false, antibot: false, welcome: false, goodbye: false };
}

async function setGroupProtection(jid, protection, enabled) {
  const current = await getGroupProtection(jid);
  current[protection] = enabled;
  current.updated_at  = new Date().toISOString();
  return _set(`hanimd/group_protections/${safeKey(jid)}`, current);
}

async function isProtectionEnabled(jid, protection) {
  const data = await getGroupProtection(jid);
  return data[protection] === true;
}

// ═══════════════════════════════════════════════════════════
// 📢 LISTES DE DIFFUSION
// ═══════════════════════════════════════════════════════════

async function createBroadcastList(name, members = [], by = '') {
  return _set(`hanimd/broadcast_lists/${safeKey(name)}`, { name, members, by, created_at: new Date().toISOString() });
}

async function getBroadcastList(name) {
  return _get(`hanimd/broadcast_lists/${safeKey(name)}`);
}

async function getAllBroadcastLists() {
  const data = await _get('hanimd/broadcast_lists');
  return data ? Object.values(data) : [];
}

async function deleteBroadcastList(name) {
  return _remove(`hanimd/broadcast_lists/${safeKey(name)}`);
}

// ═══════════════════════════════════════════════════════════
// 🗑️ MESSAGES / STATUTS SUPPRIMÉS
// ═══════════════════════════════════════════════════════════

async function saveDeletedMessage(jid, msgId, content, sender = '') {
  const key = `${safeKey(jid)}_${msgId}`.slice(0, 100);
  return _set(`hanimd/deleted_messages/${key}`, { jid, msgId, content, sender, deleted_at: new Date().toISOString() });
}

async function getDeletedMessages(jid, limit = 10) {
  const data = await _get('hanimd/deleted_messages');
  if (!data) return [];
  return Object.values(data)
    .filter(m => m.jid === jid)
    .sort((a,b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    .slice(0, limit);
}

async function saveDeletedStatus(jid, content, sender = '') {
  const key = `${safeKey(jid)}_${Date.now()}`;
  return _set(`hanimd/deleted_statuses/${key}`, { jid, content, sender, deleted_at: new Date().toISOString() });
}

async function getDeletedStatuses(limit = 10) {
  const data = await _get('hanimd/deleted_statuses');
  if (!data) return [];
  return Object.values(data).sort((a,b) => new Date(b.deleted_at) - new Date(a.deleted_at)).slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// ⏰ MESSAGES PROGRAMMÉS
// ═══════════════════════════════════════════════════════════

async function scheduleMessage(jid, message, scheduledAt, by = '') {
  const key = `msg_${Date.now()}`;
  return _set(`hanimd/scheduled_messages/${key}`, { key, jid, message, scheduledAt, by, status: 'pending', created_at: new Date().toISOString() });
}

async function getPendingScheduledMessages() {
  const data = await _get('hanimd/scheduled_messages');
  if (!data) return [];
  const now = new Date();
  return Object.values(data).filter(m => m.status === 'pending' && new Date(m.scheduledAt) <= now);
}

async function updateScheduledMessageStatus(key, status) {
  return _update(`hanimd/scheduled_messages/${key}`, { status, updated_at: new Date().toISOString() });
}

async function getAllScheduledMessages() {
  const data = await _get('hanimd/scheduled_messages');
  return data ? Object.values(data) : [];
}

// ═══════════════════════════════════════════════════════════
// 🧹 NETTOYAGE
// ═══════════════════════════════════════════════════════════

async function cleanOldData(daysToKeep = 30) {
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  for (const path of ['hanimd/deleted_messages', 'hanimd/deleted_statuses', 'hanimd/activity_log']) {
    const data = await _get(path);
    if (!data) continue;
    for (const [key, val] of Object.entries(data)) {
      const date = val.deleted_at || val.date;
      if (date && date < cutoff) await _remove(`${path}/${key}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🔑 PERSISTANCE DE LA SESSION WHATSAPP (auth state Baileys)
// Stocke creds + clés dans la Realtime DB → survit aux redémarrages
// (disque Render éphémère). Modèle identique à useMultiFileAuthState.
// ═══════════════════════════════════════════════════════════

// Encodage sûr d'un nom de "fichier" Baileys en clé Firebase
// (interdits dans une clé RTDB: . # $ [ ] /). base64url = déterministe.
function _authKey(file) {
  return Buffer.from(String(file)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function useFirebaseAuthState(basePath = 'wa_sessions/principale') {
  if (!db) throw new Error('Firebase non connecté');
  const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
  const root = db.ref(basePath);

  const writeData = async (data, file) => {
    await root.child(_authKey(file)).set(JSON.parse(JSON.stringify(data, BufferJSON.replacer)));
  };
  const readData = async (file) => {
    const snap = await root.child(_authKey(file)).once('value');
    const val = snap.val();
    if (val === null || val === undefined) return null;
    return JSON.parse(JSON.stringify(val), BufferJSON.reviver);
  };
  const removeData = async (file) => { await root.child(_authKey(file)).remove(); };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              const file = `${type}-${id}`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  };
}

// Effacer la session stockée (déconnexion/logout WhatsApp)
async function clearAuthState(basePath = 'wa_sessions/principale') {
  if (!db) return false;
  try { await db.ref(basePath).remove(); return true; }
  catch (e) { console.error('[FIREBASE] clearAuthState:', e.message); return false; }
}

// Vrai si une session WhatsApp existe déjà dans Firebase
async function hasAuthState(basePath = 'wa_sessions/principale') {
  if (!db) return false;
  try {
    const snap = await db.ref(basePath).child(_authKey('creds')).once('value');
    return snap.exists();
  } catch (e) { return false; }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS (interface identique à mysql.js)
// ═══════════════════════════════════════════════════════════

module.exports = {
  connect,
  disconnect,
  isConnected,
  // Session WhatsApp (auth state)
  useFirebaseAuthState,
  clearAuthState,
  hasAuthState,
  // Settings
  getSetting,
  setSetting,
  deleteSetting,
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
  // Warns
  addWarn,
  getWarns,
  resetWarns,
  // Contacts
  saveContact,
  getContact,
  searchContacts,
  getAllContacts,
  // Économie
  getEconomy,
  updateBalance,
  depositToBank,
  withdrawFromBank,
  transferMoney,
  getLeaderboard,
  // Notes
  saveNote,
  getNote,
  getAllNotes,
  deleteNote,
  // Stats
  getStats,
  updateStats,
  incrementStats,
  getDashboardStats,
  getRecentActivity,
  // Surveillance
  addToSurveillance,
  removeFromSurveillance,
  getSurveillanceList,
  isUnderSurveillance,
  logActivity,
  getActivity,
  // Commandes personnalisées
  createCustomCommand,
  getCustomCommand,
  getAllCustomCommands,
  deleteCustomCommand,
  // Réponses automatiques
  createAutoReply,
  getAutoReplies,
  checkAutoReply,
  deleteAutoReply,
  // Protections groupe
  getGroupProtection,
  setGroupProtection,
  isProtectionEnabled,
  // Listes de diffusion
  createBroadcastList,
  getBroadcastList,
  getAllBroadcastLists,
  deleteBroadcastList,
  // Messages/statuts supprimés
  saveDeletedMessage,
  getDeletedMessages,
  saveDeletedStatus,
  getDeletedStatuses,
  // Messages programmés
  scheduleMessage,
  getPendingScheduledMessages,
  updateScheduledMessageStatus,
  getAllScheduledMessages,
  // Nettoyage
  cleanOldData
};
