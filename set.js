/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - Configuration Settings
 * ═══════════════════════════════════════════════════════════
 * Fichier de configuration centrale du bot
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

require("dotenv").config();

// ═══════════════════════════════════════════════════════════
// 📋 CONFIGURATION DU BOT
// ═══════════════════════════════════════════════════════════

const config = {
  // Informations du bot
  BOT_NAME: process.env.BOT_NAME || "HANI-MD",
  BOT_VERSION: "2.6.1",
  OWNER_NAME: process.env.NOM_OWNER || process.env.OWNER_NAME || "H2025",
  OWNER_NUMBER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467",
  NUMERO_OWNER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467", // alias pour compatibilité
  
  // Préfixe des commandes
  PREFIX: process.env.PREFIXE || process.env.PREFIX || ".",
  PREFIXE: process.env.PREFIXE || process.env.PREFIX || ".", // Alias
  
  // Mode du bot
  MODE: process.env.MODE || "public", // public ou private
  
  // Session - CHEMIN UNIFIÉ
  SESSION_ID: process.env.SESSION_ID || "",
  SESSION_DIR: "./DataBase/session/principale", // Chemin standardisé
  SESSION_FOLDER: "./DataBase/session/principale", // Alias
  
  // Personnalisation
  STICKER_PACK_NAME: process.env.STICKER_PACK_NAME || "HANI-MD",
  STICKER_AUTHOR_NAME: process.env.STICKER_AUTHOR_NAME || "H2025",
  
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
  PREMIUM_ENABLED: process.env.PREMIUM_ENABLED !== "false"
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
  crown: "👑",
  diamond: "💎",
  money: "💰",
  game: "🎮",
  bot: "🤖",
  phone: "📱",
  link: "🔗",
  time: "⏰",
  calendar: "📅",
  heart: "❤️",
  sparkle: "✨"
};

// ═══════════════════════════════════════════════════════════
// 📝 MESSAGES
// ═══════════════════════════════════════════════════════════

const MESSAGES = {
  // Erreurs
  OWNER_ONLY: "❌ Cette commande est réservée au propriétaire !",
  ADMIN_ONLY: "❌ Cette commande est réservée aux administrateurs !",
  GROUP_ONLY: "❌ Cette commande fonctionne uniquement dans les groupes !",
  PRIVATE_ONLY: "❌ Cette commande fonctionne uniquement en privé !",
  BOT_ADMIN_REQUIRED: "❌ Le bot doit être administrateur pour cette action !",
  PREMIUM_ONLY: "💎 Cette fonctionnalité nécessite un compte Premium !",
  COMMAND_DISABLED: "❌ Cette commande est désactivée !",
  COOLDOWN_ACTIVE: "⏳ Veuillez attendre avant de réutiliser cette commande.",
  ERROR_OCCURRED: "❌ Une erreur s'est produite. Réessayez plus tard.",
  
  // Succès
  COMMAND_SUCCESS: "✅ Commande exécutée avec succès !",
  SETTINGS_SAVED: "✅ Paramètres sauvegardés !",
  
  // Informations
  PROCESSING: "⏳ Traitement en cours...",
  DOWNLOADING: "📥 Téléchargement en cours...",
  UPLOADING: "📤 Envoi en cours..."
};

// ═══════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════

/**
 * Vérifier si un numéro est le propriétaire
 */
function isOwner(jid) {
  const ownerNumbers = config.OWNER_NUMBER.split(",").map(n => n.trim() + "@s.whatsapp.net");
  return ownerNumbers.some(owner => jid.includes(owner.split("@")[0]));
}

/**
 * Obtenir le numéro formaté
 */
function formatNumber(jid) {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
}

/**
 * Formater la durée
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Formater les bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Export
module.exports = {
  ...config,
  config,
  EMOJIS,
  MESSAGES,
  isOwner,
  formatNumber,
  formatDuration,
  formatBytes
};

console.log("[SET] ✅ Configuration chargée");
