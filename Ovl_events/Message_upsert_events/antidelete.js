/**
 * ═══════════════════════════════════════════════════════════
 * 🗑️ HANI-MD - Anti-Delete
 * ═══════════════════════════════════════════════════════════
 * Récupère et renvoie les messages supprimés
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

// Chemin du fichier de stockage des messages
const STORE_PATH = path.join(__dirname, "../../lib/store_msg.json");

// Charger les messages stockés
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

// Sauvegarder les messages
function saveStore(store) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {}
}

/**
 * Gestionnaire anti-delete
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const msgType = Object.keys(msg.message || {})[0];
    
    // Stocker le message pour récupération future
    if (msg.message && !msg.key.fromMe) {
      const store = loadStore();
      const chatId = msg.key.remoteJid;
      
      if (!store[chatId]) {
        store[chatId] = {};
      }
      
      // Stocker avec ID du message
      store[chatId][msg.key.id] = {
        message: msg.message,
        sender: msg.key.participant || msg.key.remoteJid,
        timestamp: Date.now(),
        pushName: msg.pushName
      };
      
      // Nettoyer les anciens messages (garder les 100 derniers par chat)
      const keys = Object.keys(store[chatId]);
      if (keys.length > 100) {
        const toDelete = keys.slice(0, keys.length - 100);
        toDelete.forEach(k => delete store[chatId][k]);
      }
      
      saveStore(store);
    }
    
    // Détecter les messages de suppression (protocolMessage)
    if (msgType === "protocolMessage") {
      const protocol = msg.message.protocolMessage;
      
      if (protocol?.type === 0) { // Type 0 = suppression
        const deletedMsgId = protocol.key?.id;
        const chatId = msg.key.remoteJid;
        
        if (deletedMsgId) {
          const store = loadStore();
          const storedMsg = store[chatId]?.[deletedMsgId];
          
          if (storedMsg) {
            const sender = storedMsg.sender;
            const pushName = storedMsg.pushName || "Quelqu'un";
            
            // Renvoyer le message supprimé au chat
            let text = `🗑️ *Message Supprimé Récupéré*\n\n`;
            text += `👤 Envoyé par: @${sender.split("@")[0]}\n`;
            text += `📝 Nom: ${pushName}\n`;
            text += `⏰ Date: ${new Date(storedMsg.timestamp).toLocaleString("fr-FR")}\n\n`;
            
            // Récupérer le contenu selon le type
            const storedMsgType = Object.keys(storedMsg.message)[0];
            
            if (storedMsgType === "conversation") {
              text += `💬 Message: ${storedMsg.message.conversation}`;
            } else if (storedMsgType === "extendedTextMessage") {
              text += `💬 Message: ${storedMsg.message.extendedTextMessage.text}`;
            } else if (storedMsgType === "imageMessage") {
              text += `🖼️ Type: Image`;
              if (storedMsg.message.imageMessage.caption) {
                text += `\n📝 Légende: ${storedMsg.message.imageMessage.caption}`;
              }
            } else if (storedMsgType === "videoMessage") {
              text += `🎬 Type: Vidéo`;
              if (storedMsg.message.videoMessage.caption) {
                text += `\n📝 Légende: ${storedMsg.message.videoMessage.caption}`;
              }
            } else if (storedMsgType === "audioMessage") {
              text += `🎵 Type: Audio`;
            } else if (storedMsgType === "documentMessage") {
              text += `📄 Type: Document`;
              text += `\n📁 Fichier: ${storedMsg.message.documentMessage.fileName}`;
            } else if (storedMsgType === "stickerMessage") {
              text += `🎨 Type: Sticker`;
            } else {
              text += `📦 Type: ${storedMsgType}`;
            }
            
            await ovl.sendMessage(chatId, {
              text,
              mentions: [sender]
            });
            
            // Supprimer du store après récupération
            delete store[chatId][deletedMsgId];
            saveStore(store);
          }
        }
      }
    }
    
  } catch (error) {
    console.error("[ANTIDELETE]", error);
  }
}

module.exports = { handle };
