/**
 * ═══════════════════════════════════════════════════════════
 * 💾 HANI-MD - Message Store
 * ═══════════════════════════════════════════════════════════
 * Stockage et gestion des messages
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "store_msg.json");
const MAX_MESSAGES_PER_CHAT = 100;
const MAX_TOTAL_MESSAGES = 5000;

// Cache en mémoire
let messageStore = {};
let lastSaveTime = 0;
const SAVE_INTERVAL = 30000; // 30 secondes

/**
 * Charger le store depuis le fichier
 */
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf8");
      messageStore = JSON.parse(data);
    }
  } catch (error) {
    console.error("[STORE] Erreur chargement:", error);
    messageStore = {};
  }
}

/**
 * Sauvegarder le store dans le fichier
 */
function saveStore() {
  try {
    const now = Date.now();
    if (now - lastSaveTime < SAVE_INTERVAL) {
      return; // Éviter les sauvegardes trop fréquentes
    }
    
    fs.writeFileSync(STORE_PATH, JSON.stringify(messageStore, null, 2));
    lastSaveTime = now;
  } catch (error) {
    console.error("[STORE] Erreur sauvegarde:", error);
  }
}

/**
 * Stocker un message
 * @param {Object} msg - Message à stocker
 */
function storeMessage(msg) {
  try {
    if (!msg || !msg.key) return;
    
    const chatId = msg.key.remoteJid;
    const msgId = msg.key.id;
    
    if (!chatId || !msgId) return;
    
    // Initialiser le chat si nécessaire
    if (!messageStore[chatId]) {
      messageStore[chatId] = {};
    }
    
    // Stocker le message
    messageStore[chatId][msgId] = {
      message: msg.message,
      sender: msg.key.participant || msg.key.remoteJid,
      pushName: msg.pushName,
      timestamp: msg.messageTimestamp || Date.now(),
      fromMe: msg.key.fromMe
    };
    
    // Nettoyer si trop de messages dans ce chat
    const chatMsgs = Object.keys(messageStore[chatId]);
    if (chatMsgs.length > MAX_MESSAGES_PER_CHAT) {
      const toDelete = chatMsgs.slice(0, chatMsgs.length - MAX_MESSAGES_PER_CHAT);
      toDelete.forEach(id => delete messageStore[chatId][id]);
    }
    
    // Sauvegarder périodiquement
    saveStore();
    
  } catch (error) {
    console.error("[STORE] Erreur stockage:", error);
  }
}

/**
 * Récupérer un message stocké
 * @param {string} chatId - ID du chat
 * @param {string} msgId - ID du message
 */
function getMessage(chatId, msgId) {
  try {
    return messageStore[chatId]?.[msgId] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Récupérer tous les messages d'un chat
 * @param {string} chatId - ID du chat
 * @param {number} limit - Nombre maximum de messages
 */
function getChatMessages(chatId, limit = 50) {
  try {
    const chatMsgs = messageStore[chatId];
    if (!chatMsgs) return [];
    
    const msgIds = Object.keys(chatMsgs).slice(-limit);
    return msgIds.map(id => ({
      id,
      ...chatMsgs[id]
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Supprimer un message du store
 * @param {string} chatId - ID du chat
 * @param {string} msgId - ID du message
 */
function deleteMessage(chatId, msgId) {
  try {
    if (messageStore[chatId]?.[msgId]) {
      delete messageStore[chatId][msgId];
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Nettoyer les anciens messages
 * @param {number} maxAge - Âge maximum en millisecondes
 */
function cleanOldMessages(maxAge = 24 * 60 * 60 * 1000) {
  try {
    const now = Date.now();
    let deleted = 0;
    
    for (const chatId in messageStore) {
      for (const msgId in messageStore[chatId]) {
        const msg = messageStore[chatId][msgId];
        const msgTime = typeof msg.timestamp === "number" 
          ? msg.timestamp * 1000 
          : msg.timestamp;
        
        if (now - msgTime > maxAge) {
          delete messageStore[chatId][msgId];
          deleted++;
        }
      }
      
      // Supprimer les chats vides
      if (Object.keys(messageStore[chatId]).length === 0) {
        delete messageStore[chatId];
      }
    }
    
    saveStore();
    console.log(`[STORE] ${deleted} anciens messages nettoyés`);
    return deleted;
    
  } catch (error) {
    console.error("[STORE] Erreur nettoyage:", error);
    return 0;
  }
}

/**
 * Obtenir les statistiques du store
 */
function getStats() {
  try {
    let totalMessages = 0;
    let totalChats = Object.keys(messageStore).length;
    
    for (const chatId in messageStore) {
      totalMessages += Object.keys(messageStore[chatId]).length;
    }
    
    return {
      totalChats,
      totalMessages,
      maxMessagesPerChat: MAX_MESSAGES_PER_CHAT
    };
  } catch (error) {
    return { totalChats: 0, totalMessages: 0 };
  }
}

/**
 * Forcer la sauvegarde
 */
function forceSave() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(messageStore, null, 2));
    lastSaveTime = Date.now();
    return true;
  } catch (error) {
    return false;
  }
}

// Charger au démarrage
loadStore();

// Nettoyage automatique toutes les heures
setInterval(() => {
  cleanOldMessages();
}, 60 * 60 * 1000);

module.exports = {
  storeMessage,
  getMessage,
  getChatMessages,
  deleteMessage,
  cleanOldMessages,
  getStats,
  forceSave,
  loadStore
};

console.log("[LIB] ✅ Message store chargé");
