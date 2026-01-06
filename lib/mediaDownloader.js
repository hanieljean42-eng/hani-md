/**
 * ═══════════════════════════════════════════════════════════
 * 📥 HANI-MD - Utilitaires de téléchargement média
 * ═══════════════════════════════════════════════════════════
 * Fonctions pour télécharger les médias WhatsApp
 * ═══════════════════════════════════════════════════════════
 */

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

/**
 * Télécharger un média depuis un message cité
 * @param {Object} quotedMessage - Le message cité contenant le média
 * @param {string} mediaType - Type: 'image', 'video', 'audio', 'sticker', 'document'
 * @returns {Buffer|null} - Buffer du média ou null si erreur
 */
async function downloadMedia(quotedMessage, mediaType = null) {
  try {
    // Détecter automatiquement le type de média
    let type = mediaType;
    let mediaMessage = null;
    
    if (quotedMessage.imageMessage) {
      type = type || 'image';
      mediaMessage = quotedMessage.imageMessage;
    } else if (quotedMessage.videoMessage) {
      type = type || 'video';
      mediaMessage = quotedMessage.videoMessage;
    } else if (quotedMessage.audioMessage) {
      type = type || 'audio';
      mediaMessage = quotedMessage.audioMessage;
    } else if (quotedMessage.stickerMessage) {
      type = type || 'sticker';
      mediaMessage = quotedMessage.stickerMessage;
    } else if (quotedMessage.documentMessage) {
      type = type || 'document';
      mediaMessage = quotedMessage.documentMessage;
    } else if (quotedMessage.documentWithCaptionMessage) {
      type = type || 'document';
      mediaMessage = quotedMessage.documentWithCaptionMessage.message?.documentMessage;
    }
    
    if (!mediaMessage || !type) {
      console.error("[MEDIA] Type de média non détecté");
      return null;
    }
    
    const stream = await downloadContentFromMessage(mediaMessage, type);
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (e) {
    console.error("[MEDIA] Erreur téléchargement:", e.message);
    return null;
  }
}

/**
 * Télécharger une image depuis un message cité
 */
async function downloadImage(quotedMessage) {
  return downloadMedia(quotedMessage, 'image');
}

/**
 * Télécharger une vidéo depuis un message cité
 */
async function downloadVideo(quotedMessage) {
  return downloadMedia(quotedMessage, 'video');
}

/**
 * Télécharger un audio depuis un message cité
 */
async function downloadAudio(quotedMessage) {
  return downloadMedia(quotedMessage, 'audio');
}

/**
 * Télécharger un sticker depuis un message cité
 */
async function downloadSticker(quotedMessage) {
  return downloadMedia(quotedMessage, 'sticker');
}

/**
 * Télécharger un document depuis un message cité
 */
async function downloadDocument(quotedMessage) {
  return downloadMedia(quotedMessage, 'document');
}

module.exports = {
  downloadMedia,
  downloadImage,
  downloadVideo,
  downloadAudio,
  downloadSticker,
  downloadDocument
};
