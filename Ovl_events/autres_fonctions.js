/**
 * ═══════════════════════════════════════════════════════════
 * 📦 HANI-MD - Fonctions Utilitaires
 * ═══════════════════════════════════════════════════════════
 * Fonctions d'aide pour le traitement des messages
 * Version désobfusquée et optimisée
 */

const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// Stockage des messages pour récupération
const messageStore = new Map();
const MAX_MESSAGES = 1000;

/**
 * Stocke un message pour récupération ultérieure
 * @param {Object} msg - Message à stocker
 */
function storeMessage(msg) {
  if (!msg?.key?.id) return;
  
  messageStore.set(msg.key.id, {
    message: msg.message,
    key: msg.key,
    timestamp: Date.now()
  });
  
  // Nettoyer les anciens messages
  if (messageStore.size > MAX_MESSAGES) {
    const oldest = [...messageStore.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 100);
    oldest.forEach(([id]) => messageStore.delete(id));
  }
}

/**
 * Récupère un message stocké par son ID
 * @param {string} msgId - ID du message
 * @returns {Object|null} Message trouvé ou null
 */
function getMessage(msgId) {
  return messageStore.get(msgId) || null;
}

/**
 * Récupère les informations d'un message pour reply
 * @param {Object} options - Options
 * @returns {Object} Informations du message
 */
function recup_msg(options = {}) {
  const { ovl, msg } = options;
  
  if (!msg) return {};
  
  const message = msg.message;
  const from = msg.key?.remoteJid;
  const sender = msg.key?.participant || msg.key?.remoteJid;
  const isGroup = from?.endsWith("@g.us");
  const pushName = msg.pushName || "Utilisateur";
  
  // Extraire le texte du message
  let body = "";
  if (message?.conversation) {
    body = message.conversation;
  } else if (message?.extendedTextMessage?.text) {
    body = message.extendedTextMessage.text;
  } else if (message?.imageMessage?.caption) {
    body = message.imageMessage.caption;
  } else if (message?.videoMessage?.caption) {
    body = message.videoMessage.caption;
  } else if (message?.documentMessage?.caption) {
    body = message.documentMessage.caption;
  }
  
  // Message cité
  const quotedMsg = message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  return {
    from,
    sender,
    isGroup,
    pushName,
    body,
    message,
    quotedMsg,
    msg
  };
}

/**
 * Télécharge et sauvegarde un média
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message contenant le média
 * @param {string} filename - Nom du fichier (optionnel)
 * @param {boolean} saveToFile - Sauvegarder sur le disque
 * @param {string} downloadPath - Chemin de sauvegarde
 * @returns {Buffer|string} Buffer du média ou chemin du fichier
 */
async function dl_save_media_ms(ovl, msg, filename = "", saveToFile = true, downloadPath = "./downloads") {
  try {
    // Télécharger le média
    const buffer = await downloadMediaMessage(msg, "buffer", {});
    
    if (!buffer) {
      throw new Error("Impossible de télécharger le média");
    }
    
    if (!saveToFile) {
      return buffer;
    }
    
    // Créer le dossier si nécessaire
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    // Déterminer l'extension
    let ext = ".bin";
    const message = msg.message;
    
    if (message?.imageMessage) {
      ext = ".jpg";
    } else if (message?.videoMessage) {
      ext = ".mp4";
    } else if (message?.audioMessage) {
      ext = message.audioMessage.ptt ? ".ogg" : ".mp3";
    } else if (message?.stickerMessage) {
      ext = message.stickerMessage.isAnimated ? ".webp" : ".webp";
    } else if (message?.documentMessage) {
      ext = path.extname(message.documentMessage.fileName || "") || ".bin";
    }
    
    // Nom du fichier
    const finalFilename = filename || `media_${Date.now()}${ext}`;
    const filePath = path.join(downloadPath, finalFilename);
    
    // Sauvegarder
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  } catch (error) {
    console.error("[DL_MEDIA] Erreur:", error.message);
    throw error;
  }
}

/**
 * Extrait le type de contenu d'un message
 * @param {Object} message - Message à analyser
 * @returns {string|null} Type de contenu
 */
function getContentType(message) {
  if (!message) return null;
  
  const types = [
    "conversation",
    "extendedTextMessage",
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "stickerMessage",
    "documentMessage",
    "contactMessage",
    "locationMessage",
    "reactionMessage",
    "pollCreationMessage",
    "pollUpdateMessage"
  ];
  
  for (const type of types) {
    if (message[type]) return type;
  }
  
  return null;
}

module.exports = {
  storeMessage,
  getMessage,
  recup_msg,
  dl_save_media_ms,
  getContentType
};
