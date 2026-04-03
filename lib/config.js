/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║           ⚙️ HANI-MD - Configuration Centrale             ║
 * ║        Module de configuration unifié pour le bot         ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

require("dotenv").config({ override: true });

// ═══════════════════════════════════════════════════════════
// 📋 CONFIGURATION DU BOT
// ═══════════════════════════════════════════════════════════

const config = {
  // Informations du bot
  BOT_NAME: process.env.BOT_NAME || "HANI-MD",
  BOT_VERSION: "2.6.1",
  OWNER_NAME: process.env.NOM_OWNER || process.env.OWNER_NAME || "H2025",
  OWNER_NUMBER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467",
  NUMERO_OWNER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467", // alias compatibilité
  
  // Préfixe des commandes
  PREFIX: process.env.PREFIXE || process.env.PREFIX || ".",
  PREFIXE: process.env.PREFIXE || process.env.PREFIX || ".", // Alias pour compatibilité
  
  // Mode du bot
  MODE: process.env.MODE || "public", // public ou private
  
  // Session - CHEMIN UNIFIÉ
  SESSION_ID: process.env.SESSION_ID || "",
  SESSION_DIR: "./DataBase/session/principale", // Chemin unique standardisé
  SESSION_FOLDER: "./DataBase/session/principale", // Alias
  
  // Personnalisation
  STICKER_PACK_NAME: process.env.STICKER_PACK_NAME || "HANI-MD",
  STICKER_AUTHOR_NAME: process.env.STICKER_AUTHOR_NAME || "H2025",
  STICKER_PACK: process.env.STICKER_PACK_NAME || "HANI-MD",
  STICKER_AUTHOR: process.env.STICKER_AUTHOR_NAME || "H2025",
  
  // Fonctionnalités auto
  AUTO_READ: process.env.AUTO_READ === "true",
  AUTO_TYPING: process.env.AUTO_TYPING === "true",
  AUTO_RECORDING: process.env.AUTO_RECORDING === "true",
  AUTO_BIO: process.env.AUTO_BIO === "true",
  AUTO_REACT: process.env.AUTO_REACT === "true",
  
  // Présence
  PRESENCE: process.env.PRESENCE || "online", // online, offline, composing, recording
  
  // Anti-features
  ANTI_CALL: process.env.ANTI_CALL !== "false",
  ANTI_DELETE: process.env.ANTI_DELETE === "true",
  ANTI_LINK: process.env.ANTI_LINK === "true",
  ANTI_SPAM: process.env.ANTI_SPAM === "true",
  
  // Messages d'accueil
  WELCOME_MESSAGE: process.env.WELCOME_MESSAGE !== "false",
  GOODBYE_MESSAGE: process.env.GOODBYE_MESSAGE !== "false",
  
  // Limites
  MAX_DOWNLOAD_SIZE: parseInt(process.env.MAX_DOWNLOAD_SIZE) || 100, // MB
  COMMAND_COOLDOWN: parseInt(process.env.COMMAND_COOLDOWN) || 3, // secondes
  
  // Base de données
  DATABASE_URL: process.env.DATABASE_URL || process.env.MYSQL_URL || "",
  USE_MYSQL: process.env.USE_MYSQL === "true",
  
  // API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  REMOVEBG_API_KEY: process.env.REMOVEBG_API_KEY || "",
  
  // Timezone
  TIMEZONE: process.env.TIMEZONE || "Africa/Abidjan",
  LANGUAGE: process.env.LANGUAGE || "fr",
  
  // Premium
  PREMIUM_ENABLED: process.env.PREMIUM_ENABLED !== "false",
  
  // Wave Payments
  WAVE_NUMBER: process.env.WAVE_NUMBER || "",
  
  // Notification
  NOTIFICATION_NUMBER: process.env.NOTIFICATION_NUMBER || null
};

// ═══════════════════════════════════════════════════════════
// 🎨 EMOJIS
// ═══════════════════════════════════════════════════════════

const EMOJIS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: "⏳",
  done: "✔️",
  star: "⭐",
  fire: "🔥",
  music: "🎵",
  video: "🎬",
  image: "🖼️",
  document: "📄",
  sticker: "🎨",
  download: "📥",
  upload: "📤",
  search: "🔍",
  settings: "⚙️",
  lock: "🔐",
  unlock: "🔓",
  user: "👤",
  group: "👥",
  admin: "👑",
  bot: "🤖",
  menu: "📋",
  help: "❓"
};

// ═══════════════════════════════════════════════════════════
// 🛡️ ÉTATS DES PROTECTIONS
// ═══════════════════════════════════════════════════════════

const protectionState = {
  antidelete: true,           // Messages supprimés → envoyés à Moi-même
  anticall: false,            // Rejeter les appels
  antideletestatus: true,     // Statuts supprimés → envoyés à Moi-même
  autoViewOnce: true,         // Photos/Vidéos vue unique → envoyées à Moi-même
  autoViewOnceAudio: true,    // Vocaux écoute unique → envoyés à Moi-même
  autoSaveStatus: true,       // Tous les statuts → sauvegardés automatiquement
  spyStatusViews: true,       // 👁️ Voir qui regarde mes statuts
  spyReadReceipts: true,      // 📖 Notifications lecture messages
  spyReplies: true,           // 🔔 Notifier quand quelqu'un répond
  spyPresence: true,          // 👀 Détecter qui ouvre ma discussion
  autoSendViewOnce: true,     // 📸 Envoyer automatiquement viewonce
};

// ═══════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  ...config,
  config,
  EMOJIS,
  protectionState,
  
  // Helpers
  getSessionPath: () => config.SESSION_DIR,
  isOwner: (jid) => {
    if (!jid) return false;
    const cleanJid = jid.replace(/[^0-9]/g, '');
    const cleanOwner = (config.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
    if (!cleanOwner || cleanOwner.length < 5) return false;
    return cleanJid === cleanOwner || cleanJid.includes(cleanOwner) || cleanOwner.includes(cleanJid);
  }
};

console.log("[CONFIG] ✅ Configuration centralisée chargée");
