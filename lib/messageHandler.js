/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║          📨 HANI-MD - Message Handler                     ║
 * ║       Module de traitement des messages entrants          ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { findCommand, executeCommand, getCommands } = require('./ovlcmd');
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// ═══════════════════════════════════════════════════════════
// 📦 STOCKAGE EN MÉMOIRE
// ═══════════════════════════════════════════════════════════

const messageStore = new Map();
const MAX_STORED_MESSAGES = 500;

const deletedMessages = [];
const MAX_DELETED_MESSAGES = 50;

const viewOnceMessages = new Map();
const VIEW_ONCE_FILE = path.join(process.cwd(), 'DataBase', 'viewonce_cache.json');

// Charger les vues uniques depuis le cache
function loadViewOnceMessages() {
  try {
    if (fs.existsSync(VIEW_ONCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(VIEW_ONCE_FILE, 'utf8'));
      for (const [key, value] of Object.entries(data)) {
        viewOnceMessages.set(key, value);
      }
      console.log(`[MSG] ✅ ${viewOnceMessages.size} vues uniques chargées`);
    }
  } catch (e) {
    console.log(`[MSG] ⚠️ Erreur chargement cache viewonce: ${e.message}`);
  }
}

// Sauvegarder les vues uniques
function saveViewOnceMessages() {
  try {
    const obj = {};
    for (const [key, value] of viewOnceMessages) {
      obj[key] = {
        id: value.id,
        sender: value.sender,
        chat: value.chat,
        pushName: value.pushName,
        type: value.type,
        date: value.date,
        timestamp: value.timestamp,
        fromMe: value.fromMe,
        messageKey: value.message?.key,
        messageContent: value.message?.message
      };
    }
    fs.writeFileSync(VIEW_ONCE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.log(`[MSG] ⚠️ Erreur sauvegarde viewonce: ${e.message}`);
  }
}

// Initialiser
loadViewOnceMessages();

// ═══════════════════════════════════════════════════════════
// 🔧 UTILITAIRES
// ═══════════════════════════════════════════════════════════

function getMessageText(msg) {
  const type = Object.keys(msg.message || {})[0];
  if (!type) return "";
  if (type === "conversation") return msg.message.conversation || "";
  if (type === "extendedTextMessage") return msg.message.extendedTextMessage?.text || "";
  if (type === "imageMessage") return msg.message.imageMessage?.caption || "";
  if (type === "videoMessage") return msg.message.videoMessage?.caption || "";
  if (type === "documentMessage") return msg.message.documentMessage?.caption || "";
  return "";
}

function getMessageType(message) {
  if (!message) return "unknown";
  const types = Object.keys(message);
  return types[0] || "unknown";
}

function storeMessage(msg) {
  if (!msg.key?.id) return;
  
  messageStore.set(msg.key.id, {
    message: msg,
    timestamp: Date.now()
  });
  
  // Limiter la taille
  if (messageStore.size > MAX_STORED_MESSAGES) {
    const oldest = messageStore.keys().next().value;
    messageStore.delete(oldest);
  }
}

function getStoredMessage(id) {
  return messageStore.get(id)?.message;
}

// ═══════════════════════════════════════════════════════════
// 🎯 TRAITEMENT DES COMMANDES
// ═══════════════════════════════════════════════════════════

async function processCommand(sock, msg, options = {}) {
  const { db } = options;
  const from = msg.key.remoteJid;
  const body = getMessageText(msg);
  
  if (!body || !body.startsWith(config.PREFIX)) return null;
  
  const [cmdPart, ...rest] = body.slice(config.PREFIX.length).trim().split(/\s+/);
  const command = (cmdPart || "").toLowerCase();
  const args = rest;
  const argsText = rest.join(" ");
  
  if (!command) return null;
  
  // Trouver la commande
  const cmdData = findCommand(command);
  if (!cmdData) return null;
  
  // Informations sur l'expéditeur
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  const isFromMe = msg.key.fromMe;
  const pushName = msg.pushName || "Utilisateur";
  
  // Vérifier le propriétaire
  const ownerNumber = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
  const senderNumber = sender.replace(/[^0-9]/g, '').replace('@s.whatsapp.net', '');
  const isSuperUser = senderNumber === ownerNumber || 
                      senderNumber.includes(ownerNumber) || 
                      ownerNumber.includes(senderNumber);
  
  // Vérifier les permissions
  let isAdmin = false;
  let isBotAdmin = false;
  
  if (isGroup) {
    try {
      const groupMetadata = await sock.groupMetadata(from);
      const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
      const admins = groupMetadata.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id);
      isAdmin = admins.includes(sender);
      isBotAdmin = admins.includes(botJid);
    } catch (e) {}
  }
  
  // Numéro du bot
  const botNumber = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
  
  // Fonctions utilitaires
  const repondre = async (text, opts = {}) => {
    return sock.sendMessage(from, { text, ...opts }, { quoted: msg });
  };
  
  const sendPrivate = async (text) => {
    return sock.sendMessage(botNumber, { text });
  };
  
  // Contexte d'exécution
  const context = {
    arg: args,
    args: args,
    argsText,
    ms: msg,
    repondre,
    sendPrivate,
    superUser: isSuperUser,
    auteurMessage: sender,
    verif_Groupe: isGroup,
    admin_Groupe: isBotAdmin,
    verif_Admin: isAdmin,
    pushName,
    botNumber,
    from,
    db
  };
  
  // Exécuter
  try {
    console.log(`[CMD] 📥 ${command} par ${pushName}`);
    await executeCommand(command, sock, msg, context);
    return true;
  } catch (error) {
    console.error(`[CMD] ❌ Erreur ${command}:`, error.message);
    await repondre(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 👁️ VIEW ONCE HANDLER
// ═══════════════════════════════════════════════════════════

async function handleViewOnce(sock, msg) {
  const viewOnceContent = msg.message?.viewOnceMessage || 
                          msg.message?.viewOnceMessageV2 || 
                          msg.message?.viewOnceMessageV2Extension;
  
  if (!viewOnceContent) return false;
  
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const pushName = msg.pushName || "Inconnu";
  const isFromMe = msg.key.fromMe;
  const botNumber = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
  
  // Déterminer le type
  const mediaMsg = viewOnceContent.message;
  const mediaType = Object.keys(mediaMsg || {})[0];
  
  // Stocker pour récupération ultérieure
  viewOnceMessages.set(msg.key.id, {
    id: msg.key.id,
    sender,
    senderName: pushName,
    chat: from,
    pushName,
    type: mediaType?.replace("Message", "") || "media",
    date: new Date().toLocaleString('fr-FR'),
    timestamp: Date.now(),
    fromMe: isFromMe,
    message: msg
  });
  
  saveViewOnceMessages();
  
  // Si pas de moi, envoyer automatiquement
  if (!isFromMe && config.protectionState?.autoViewOnce) {
    try {
      const buffer = await downloadMediaMessage(msg, "buffer", {});
      const caption = mediaMsg?.[mediaType]?.caption || "";
      
      const infoText = `👁️ *VUE UNIQUE INTERCEPTÉE*\n\n` +
        `📤 De: ${pushName}\n` +
        `📞 Numéro: ${sender.split('@')[0]}\n` +
        `📝 Légende: ${caption || "(aucune)"}\n` +
        `📅 Date: ${new Date().toLocaleString('fr-FR')}`;
      
      if (mediaType === "imageMessage") {
        await sock.sendMessage(botNumber, { image: buffer, caption: infoText });
      } else if (mediaType === "videoMessage") {
        await sock.sendMessage(botNumber, { video: buffer, caption: infoText });
      } else if (mediaType === "audioMessage") {
        await sock.sendMessage(botNumber, { audio: buffer, mimetype: "audio/mp4", ptt: true });
        await sock.sendMessage(botNumber, { text: infoText });
      }
      
      console.log(`[VV] ✅ Vue unique de ${pushName} sauvegardée`);
    } catch (e) {
      console.log(`[VV] ⚠️ Erreur sauvegarde: ${e.message}`);
    }
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  processCommand,
  handleViewOnce,
  getMessageText,
  getMessageType,
  storeMessage,
  getStoredMessage,
  messageStore,
  viewOnceMessages,
  loadViewOnceMessages,
  saveViewOnceMessages
};

console.log("[MSG] ✅ Module de messages chargé");
