/**
 * ═══════════════════════════════════════════════════════════
 * 📨 HANI-MD - Gestionnaire de Messages (message_upsert)
 * ═══════════════════════════════════════════════════════════
 * Gère les messages entrants et exécute les commandes
 * Version désobfusquée et optimisée
 * 
 * NOTE: Ce fichier est un gestionnaire secondaire.
 * Le gestionnaire principal est dans hani.js
 * ═══════════════════════════════════════════════════════════
 */

const config = require("../set");
const { ovlcmd, findCommand, executeCommand } = require("../lib/ovlcmd");
const { storeMessage, getMessage, recup_msg } = require("./autres_fonctions");

// Cache pour anti-spam
const messageCache = new Map();
const SPAM_THRESHOLD = 5; // messages
const SPAM_WINDOW = 10000; // 10 secondes

/**
 * Gestionnaire principal des messages entrants
 * @param {Object} msgUpdate - Mise à jour des messages
 * @param {Object} ovl - Instance du bot
 */
async function handleMessageUpsert(msgUpdate, ovl) {
  try {
    const { messages, type } = msgUpdate;
    
    // Ignorer les historiques
    if (type === "notify") {
      for (const msg of messages) {
        await processMessage(msg, ovl);
      }
    }
  } catch (error) {
    console.error("[MSG-UPSERT] Erreur:", error.message);
  }
}

/**
 * Traite un message individuel
 * @param {Object} msg - Message à traiter
 * @param {Object} ovl - Instance du bot
 */
async function processMessage(msg, ovl) {
  try {
    // Ignorer les messages de protocole
    if (!msg.message) return;
    if (msg.key?.remoteJid === "status@broadcast") return;
    
    // Stocker le message pour récupération
    storeMessage(msg);
    
    // Extraire les informations
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const isGroup = from.endsWith("@g.us");
    const isFromMe = msg.key.fromMe;
    const pushName = msg.pushName || "Utilisateur";
    
    // Extraire le texte
    const body = extractMessageText(msg);
    
    // Vérifier si c'est une commande (déléguer à hani.js)
    // Ce gestionnaire ne traite que les événements secondaires
    
    // Anti-spam basique
    if (!isFromMe) {
      const spamCheck = checkSpam(sender);
      if (spamCheck.isSpam) {
        console.log(`[SPAM] ${sender} - ${spamCheck.count} messages en ${SPAM_WINDOW/1000}s`);
        return;
      }
    }
    
    // Log pour debug
    const messageType = getMessageType(msg.message);
    console.log(`📩 [MSG] ${isFromMe ? "ENVOYÉ" : "REÇU"} | ${pushName} | Type: ${messageType}`);
    
  } catch (error) {
    console.error("[PROCESS-MSG] Erreur:", error.message);
  }
}

/**
 * Extrait le texte d'un message
 * @param {Object} msg - Message
 * @returns {string} Texte extrait
 */
function extractMessageText(msg) {
  const message = msg.message;
  if (!message) return "";
  
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
  if (message.listResponseMessage?.singleSelectReply?.selectedRowId) return message.listResponseMessage.singleSelectReply.selectedRowId;
  if (message.templateButtonReplyMessage?.selectedId) return message.templateButtonReplyMessage.selectedId;
  
  return "";
}

/**
 * Détermine le type de message
 * @param {Object} message - Contenu du message
 * @returns {string} Type de message
 */
function getMessageType(message) {
  if (!message) return "unknown";
  
  if (message.conversation || message.extendedTextMessage) return "text";
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return message.audioMessage.ptt ? "ptt" : "audio";
  if (message.stickerMessage) return "sticker";
  if (message.documentMessage) return "document";
  if (message.contactMessage || message.contactsArrayMessage) return "contact";
  if (message.locationMessage) return "location";
  if (message.reactionMessage) return "reaction";
  if (message.pollCreationMessage) return "poll";
  if (message.viewOnceMessage || message.viewOnceMessageV2) return "viewonce";
  
  return "other";
}

/**
 * Vérifie si un utilisateur spam
 * @param {string} sender - JID de l'expéditeur
 * @returns {Object} Résultat du check
 */
function checkSpam(sender) {
  const now = Date.now();
  const senderData = messageCache.get(sender) || { messages: [], warned: false };
  
  // Nettoyer les anciens messages
  senderData.messages = senderData.messages.filter(t => now - t < SPAM_WINDOW);
  
  // Ajouter ce message
  senderData.messages.push(now);
  messageCache.set(sender, senderData);
  
  // Vérifier le spam
  if (senderData.messages.length >= SPAM_THRESHOLD) {
    return { isSpam: true, count: senderData.messages.length };
  }
  
  return { isSpam: false, count: senderData.messages.length };
}

/**
 * Réinitialise le cache anti-spam
 */
function clearSpamCache() {
  messageCache.clear();
}

/**
 * Réinitialise le compteur d'un utilisateur
 * @param {string} sender - JID de l'utilisateur
 */
function resetUserSpam(sender) {
  messageCache.delete(sender);
}

module.exports = handleMessageUpsert;
module.exports.extractMessageText = extractMessageText;
module.exports.getMessageType = getMessageType;
module.exports.checkSpam = checkSpam;
module.exports.clearSpamCache = clearSpamCache;
module.exports.resetUserSpam = resetUserSpam;
