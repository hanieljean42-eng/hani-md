/**
 * 🗃️ HANI-MD - État partagé et helpers de base
 * (extrait de start.js — ne pas dupliquer)
 */

const fs = require("fs");
const path = require("path");
const ROOT_DIR = path.join(__dirname, '..');

// ── État mutable de connexion (partagé entre connexion et serveur web) ──
const S = {
  currentQR: null,
  connectionStatus: 'disconnected',
  connectionFailureCount: 0,
  ovl: null,
  isReconnecting: false,
};
const MAX_CONNECTION_FAILURES = 1; // Après 1 échec 401, on supprime la session et regen QR immédiatement

const config = {
  PREFIXE: process.env.PREFIXE || ".",
  NOM_OWNER: process.env.NOM_OWNER || "Owner",
  NUMERO_OWNER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467",
  MODE: process.env.MODE || "public",
  STICKER_PACK_NAME: process.env.STICKER_PACK_NAME || "OVL-MD-V2",
  STICKER_AUTHOR_NAME: process.env.STICKER_AUTHOR_NAME || "OVL",
};

// Backend d'authentification WhatsApp: 'auto' | 'disk' | 'firebase'
const AUTH_BACKEND = (process.env.WHATSAPP_AUTH_BACKEND || process.env.WA_AUTH_BACKEND || 'auto').toLowerCase();

// Dossier de session
const SESSION_FOLDER = "./DataBase/session/principale"; // (sera vidé pour reconnexion)
const SESSION_FB_PATH = "wa_sessions/principale"; // chemin Realtime DB pour la session WhatsApp persistante

// ═══════════════════════════════════════════════════════════
// 🔐 CONTRÔLE D'ACCÈS PAR PLAN (BOT PRINCIPAL)
// ═══════════════════════════════════════════════════════════
const MAIN_PLAN_CONFIG = {
  // 🆓 Gratuit — commandes de base uniquement
  FREE: {
    dailyLimit: 30,
    allowedCategories: ['Système', 'Fun', 'Games', 'Réaction', 'Support', 'Tutorial', 'Premium'],
    blockedCommands: [
      'gpt','gemini','chatgpt','dalle','imagine','flux',        // IA
      'removebg','blur','grayscale','invert','enhance','carto', // Image editing
      'ytaudio','ytvideo','tiktokdl','fbvideo','igdownload',    // Téléchargements
      'spotifydownload','pinterestdl','twitterdl',
    ],
    upgradeMsg: '⬆️ Abonnez-vous pour débloquer cette commande.\n💎 Tapez *.premium* pour voir les offres.'
  },
  // 🥉 Bronze — stickers + téléchargements + fun (entrée de gamme)
  BRONZE: {
    dailyLimit: 50,
    allowedCategories: ['Système', 'Fun', 'Games', 'Réaction', 'Premium', 'Conversion', 'Téléchargement'],
    blockedCommands: ['gpt','gemini','chatgpt','dalle','imagine','flux','removebg','enhance',
                      'google','wikipedia','lyrics','ytsearch',
                      'statustext','statusimg','statusvid','autoview','autoreact','dlstatus'],
    upgradeMsg: '⬆️ Passez au plan Argent pour débloquer IA, recherche, groupes et plus.'
  },
  // 🥈 Argent — + recherche, groupes, statuts, outils
  ARGENT: {
    dailyLimit: 200,
    allowedCategories: ['Système', 'Fun', 'Games', 'Réaction', 'Support', 'Tutorial', 'Premium',
                        'Téléchargement', 'Outils', 'Recherche', 'Status', 'Confidentialité',
                        'Conversion', 'Groupe', 'Pro', 'Audio FX', 'Contacts', 'Economy'],
    blockedCommands: ['gpt','gemini','chatgpt','dalle','imagine','flux'],
    upgradeMsg: '⬆️ Passez au plan Or pour un accès total illimité.'
  },
  // 🥇 Or — tout illimité
  OR:       { dailyLimit: -1, allowedCategories: null, blockedCommands: [], upgradeMsg: '' },
  DIAMANT:  { dailyLimit: -1, allowedCategories: null, blockedCommands: [], upgradeMsg: '' },
  LIFETIME: { dailyLimit: -1, allowedCategories: null, blockedCommands: [], upgradeMsg: '' },
  OWNER:    { dailyLimit: -1, allowedCategories: null, blockedCommands: [], upgradeMsg: '' },
};

// Commandes toujours autorisées (gratuites pour tous + owner)
const FREE_COMMANDS = new Set(['menu','aide','help','m','ping','info','owner','start','bot','allmenu','commands',
  // Commandes owner toujours accessibles
  'addreply','delreply','listreply','togglereply','welcomemsg','awaymsg',
  'ghost','hide','unhide','unghost','spy','spyoff','spyon','ghostlist',
  'broadcast','bc','leave','addsudo','delsudo','listsudo','restart','shutdown','shell','stats'
]);

// ═══════════════════════════════════════════════════════════
// 👁️ SURVEILLANCE PRÉSENCE - partagé avec les commandes
// ═══════════════════════════════════════════════════════════
// Map<jid, { addedAt, lastSeen, lastOnline, lastReceipt }>
global.presenceSpyList = global.presenceSpyList || new Map();
// ─── WATCHLIST SIMPLE (Set de numéros purs, comme hani.js) ───
global._watchList = global._watchList || new Set();
// ─── Contacts connus (pour statusJidList) ────────────────────
global._knownContactJids = global._knownContactJids || new Set();
// Mode auto-surveillance : ajouter automatiquement les viewers de statut
global.autoSpyEnabled = global.autoSpyEnabled || false;

// ─── 👻 CONTACTS FANTÔMES ─────────────────────────────────
// Initialisés automatiquement par cmd/GhostContact.js au require()
// global._ghostContacts = Map<numéro, { addedAt, pushName, reason }>
// global._ghostMessages = Map<numéro, [ { text, type, date, ... } ]>
let _ghostHelpers;
try { _ghostHelpers = require('../cmd/GhostContact'); } catch(e) { _ghostHelpers = null; }
const isGhostJid = _ghostHelpers?.isGhostJid || (() => false);
const findGhostKey = _ghostHelpers?.findGhostKey || (() => null);
const saveGhostState = _ghostHelpers?.saveGhostState || (() => {});

// ─── 📇 MAPPING JID ↔ CONTACT (auto-rempli par chaque message reçu) ───
// global._jidMap = Map<JID, { phone, pushName, lastSeen, chatJid }>
const JID_MAP_FILE = path.join(ROOT_DIR, 'DataBase', 'jid_map.json');
function _loadJidMap() {
  try {
    if (fs.existsSync(JID_MAP_FILE)) {
      const data = JSON.parse(fs.readFileSync(JID_MAP_FILE, 'utf8'));
      return new Map(Object.entries(data));
    }
  } catch(e) {}
  return new Map();
}
function _saveJidMap() {
  try {
    if (!global._jidMap) return;
    const obj = Object.fromEntries(global._jidMap);
    fs.writeFileSync(JID_MAP_FILE, JSON.stringify(obj, null, 2));
  } catch(e) {}
}
global._jidMap = global._jidMap || _loadJidMap();
let _jidMapDirty = 0;

// Enregistrer un JID à partir d'un message
function registerJid(msg) {
  if (!msg || msg.key.fromMe) return;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  if (!senderJid || senderJid === 'status@broadcast') return;
  const chatJid = msg.key.remoteJid;
  const isGroup = chatJid?.endsWith('@g.us');
  
  const existing = global._jidMap.get(senderJid) || {};
  const updated = {
    pushName: msg.pushName || existing.pushName || null,
    chatJid: isGroup ? (existing.chatJid || null) : chatJid,
    lastSeen: new Date().toISOString(),
    msgCount: (existing.msgCount || 0) + 1
  };
  global._jidMap.set(senderJid, updated);
  
  // Sauvegarder toutes les 10 entrées modifiées
  _jidMapDirty++;
  if (_jidMapDirty >= 10) { _saveJidMap(); _jidMapDirty = 0; }
}
console.log(`[JID-MAP] 📇 ${global._jidMap.size} contacts connus chargés`);

// Compteur d'usage journalier pour le bot principal
const MAIN_USAGE_FILE = path.join(ROOT_DIR, 'DataBase', 'main_usage.json');
function _readMainUsage() { try { return JSON.parse(fs.readFileSync(MAIN_USAGE_FILE,'utf8')); } catch { return {}; } }
function _saveMainUsage(d) { try { fs.writeFileSync(MAIN_USAGE_FILE, JSON.stringify(d,null,2)); } catch {} }
function getMainBotUsage(phone) {
  const today = new Date().toISOString().split('T')[0];
  const d = _readMainUsage();
  return (d[phone]?.[today]) || 0;
}
function incrementMainBotUsage(phone) {
  const today = new Date().toISOString().split('T')[0];
  const d = _readMainUsage();
  if (!d[phone]) d[phone] = {};
  d[phone][today] = (d[phone][today] || 0) + 1;
  _saveMainUsage(d);
}

// États simples pour activer/désactiver des protections (en mémoire)
const protectionState = {
  antilink: false,
  antispam: false,
  antibot: false,
  anticall: false,
  antitag: false,
  antidelete: true,  // Activé par défaut pour voir les messages supprimés
  ghostMode: false,  // Désactivé par défaut — présence WhatsApp naturelle (en ligne quand actif, 'vu à' hors ligne)
};
// Respecte GHOST_MODE défini dans l'environnement, sinon désactivé par défaut
process.env.GHOST_MODE = process.env.GHOST_MODE === "true" ? "true" : "false";
global._botProtectionState = protectionState; // Partagé avec cmd/Protection.js

// Stockage des messages pour anti-delete (garde les 500 derniers messages)
const messageStore = new Map();
const MAX_STORED_MESSAGES = 500;

// Stockage des messages supprimés — PERSISTANT sur disque
const DELETED_MSGS_FILE = path.join(ROOT_DIR, 'DataBase', 'deleted_messages.json');
const MAX_DELETED_MESSAGES = 200;

function loadDeletedMessages() {
  try {
    if (fs.existsSync(DELETED_MSGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_MSGS_FILE, 'utf8'));
      console.log(`[ANTIDELETE] ✅ ${data.length} messages supprimés chargés depuis le cache`);
      return data;
    }
  } catch (e) {
    console.log(`[ANTIDELETE] ⚠️ Erreur chargement: ${e.message}`);
  }
  return [];
}

function saveDeletedMessages(arr) {
  try {
    fs.writeFileSync(DELETED_MSGS_FILE, JSON.stringify(arr.slice(-MAX_DELETED_MESSAGES), null, 2), 'utf8');
  } catch (e) {
    console.log(`[ANTIDELETE] ⚠️ Erreur sauvegarde: ${e.message}`);
  }
}

const deletedMessages = loadDeletedMessages();
global._deletedMessages = deletedMessages; // Partagé avec cmd/VueUnique.js
global._saveDeletedMessages = saveDeletedMessages;

// Extraction textuelle d'un message Baileys (tous types couverts)
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    m.buttonsMessage?.contentText ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listMessage?.description ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateMessage?.hydratedTemplate?.hydratedContentText ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    m.reactionMessage?.text ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.viewOnceMessage?.message?.imageMessage?.caption ||
    m.viewOnceMessage?.message?.videoMessage?.caption ||
    m.viewOnceMessageV2?.message?.imageMessage?.caption ||
    m.viewOnceMessageV2?.message?.videoMessage?.caption ||
    ""
  );
}

// ═══════════════════════════════════════════════════════════
// 👁️ STOCKAGE PERSISTANT DES VUES UNIQUES
// ═══════════════════════════════════════════════════════════
const VIEW_ONCE_FILE = path.join(ROOT_DIR, 'DataBase', 'viewonce_cache.json');

// Charger les vues uniques depuis le fichier
function loadViewOnceMessages() {
  try {
    if (fs.existsSync(VIEW_ONCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(VIEW_ONCE_FILE, 'utf8'));
      const map = new Map();
      for (const [key, value] of Object.entries(data)) {
        map.set(key, value);
      }
      console.log(`[VV] ✅ ${map.size} vues uniques chargées depuis le cache`);
      return map;
    }
  } catch (e) {
    console.log(`[VV] ⚠️ Erreur chargement cache: ${e.message}`);
  }
  return new Map();
}

// Sauvegarder les vues uniques dans le fichier
function saveViewOnceMessages(map) {
  try {
    const obj = {};
    for (const [key, value] of map) {
      // Ne pas sauvegarder le message complet (trop lourd), juste les métadonnées
      obj[key] = {
        id: value.id,
        sender: value.sender,
        chat: value.chat,
        pushName: value.pushName,
        type: value.type,
        date: value.date,
        timestamp: value.timestamp,
        fromMe: value.fromMe,
        // Sauvegarder la structure du message pour pouvoir le télécharger
        messageKey: value.message?.key,
        messageContent: value.message?.message
      };
    }
    fs.writeFileSync(VIEW_ONCE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.log(`[VV] ⚠️ Erreur sauvegarde cache: ${e.message}`);
  }
}

// Stockage des messages à vue unique interceptés (persistant)
const viewOnceMessages = loadViewOnceMessages();
global._viewOnceMessages = viewOnceMessages; // Partagé avec cmd/VueUnique.js
global._saveViewOnceMessages = saveViewOnceMessages;


module.exports = {
  S,
  MAX_CONNECTION_FAILURES,
  config,
  AUTH_BACKEND,
  SESSION_FOLDER,
  SESSION_FB_PATH,
  MAIN_PLAN_CONFIG,
  FREE_COMMANDS,
  isGhostJid,
  findGhostKey,
  saveGhostState,
  JID_MAP_FILE,
  registerJid,
  getMainBotUsage,
  incrementMainBotUsage,
  protectionState,
  messageStore,
  MAX_STORED_MESSAGES,
  DELETED_MSGS_FILE,
  MAX_DELETED_MESSAGES,
  deletedMessages,
  saveDeletedMessages,
  getMessageText,
  VIEW_ONCE_FILE,
  viewOnceMessages,
  saveViewOnceMessages,
};
