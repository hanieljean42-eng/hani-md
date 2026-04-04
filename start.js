/**
 * OVL-MD-V2 - Connexion directe par QR Code
 * Lance ce fichier avec: node start.js
 * Scanne le QR code qui s'affiche dans le terminal avec WhatsApp
 */

const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode"); // Pour générer QR en image web

// Variable globale pour stocker le QR code actuel
let currentQR = null;
let connectionStatus = 'disconnected';
let connectionFailureCount = 0; // Compteur pour détecter les boucles de connexion échouées
const MAX_CONNECTION_FAILURES = 3; // Après 3 échecs, on supprime la session

const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
} = require("@whiskeysockets/baileys");

// Charger la configuration
require("dotenv").config({ override: true });

// ═══════════════════════════════════════════════════════════
// 📦 SYSTÈME DE COMMANDES MODULAIRES (OVLCMD)
// ═══════════════════════════════════════════════════════════

const { findCommand, executeCommand, getCommands } = require("./lib/ovlcmd");

// Charger tous les modules de commandes
const commandModules = [
  // ═══ SYSTÈME (chargé en premier) ═══
  "./cmd/Menu",
  "./cmd/Owner",
  // ═══ TÉLÉCHARGEMENT ═══
  "./cmd/Telechargement",
  // ═══ OUTILS & UTILITAIRES ═══
  "./cmd/Outils",
  "./cmd/Conversion",
  "./cmd/Reaction",
  // ═══ DIVERTISSEMENT ═══
  "./cmd/Fun",
  "./cmd/Ovl-game",
  // ═══ INTELLIGENCE ARTIFICIELLE ═══
  "./cmd/Ia",
  // ═══ RECHERCHE ═══
  "./cmd/Search",
  // ═══ GROUPES ═══
  "./cmd/Groupe",
  "./cmd/Confidentialite",
  // ═══ MÉDIAS ═══
  "./cmd/Fx_audio",
  "./cmd/Status",
  "./cmd/Image_edits",
  "./cmd/Logo",
  // ═══ PROFIL & PRO ═══
  "./cmd/ProFeatures",
  "./cmd/Contacts",
  // ═══ ÉCONOMIE ═══
  "./cmd/Ovl-economy",
  // ═══ PREMIUM & PAIEMENTS ═══
  "./cmd/Premium",
  "./cmd/WavePayments",
  // ═══ SYSTÈME AVANCÉ ═══
  "./cmd/Systeme",
  "./cmd/Advanced",
  "./cmd/Config",
  "./cmd/Autoreply",
];

let loadedModules = 0;
for (const mod of commandModules) {
  try {
    require(mod);
    loadedModules++;
  } catch (e) {
    // Ignorer silencieusement les modules non chargés
  }
}
console.log(`[CMD] ✅ ${loadedModules}/${commandModules.length} modules de commandes chargés`);
console.log(`[CMD] 📋 ${getCommands().length} commandes disponibles via ovlcmd`);

const config = {
  PREFIXE: process.env.PREFIXE || ".",
  NOM_OWNER: process.env.NOM_OWNER || "Owner",
  NUMERO_OWNER: process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || "22550252467",
  MODE: process.env.MODE || "public",
  STICKER_PACK_NAME: process.env.STICKER_PACK_NAME || "OVL-MD-V2",
  STICKER_AUTHOR_NAME: process.env.STICKER_AUTHOR_NAME || "OVL",
};

// Dossier de session
const SESSION_FOLDER = "./DataBase/session/principale"; // (sera vidé pour reconnexion)

// États simples pour activer/désactiver des protections (en mémoire)
const protectionState = {
  antilink: false,
  antispam: false,
  antibot: false,
  anticall: false,
  antitag: false,
  antidelete: true,  // Activé par défaut pour voir les messages supprimés
};

// Stockage des messages pour anti-delete (garde les 500 derniers messages)
const messageStore = new Map();
const MAX_STORED_MESSAGES = 500;

// Stockage des messages supprimés
const deletedMessages = [];
const MAX_DELETED_MESSAGES = 50;

// Extraction textuelle d'un message Baileys
function getMessageText(msg) {
  const type = Object.keys(msg.message || {})[0];
  if (!type) return "";
  if (type === "conversation") return msg.message.conversation || "";
  if (type === "extendedTextMessage") return msg.message.extendedTextMessage?.text || "";
  if (type === "imageMessage") return msg.message.imageMessage?.caption || "";
  if (type === "videoMessage") return msg.message.videoMessage?.caption || "";
  return "";
}

// ═══════════════════════════════════════════════════════════
// 👁️ STOCKAGE PERSISTANT DES VUES UNIQUES
// ═══════════════════════════════════════════════════════════
const VIEW_ONCE_FILE = path.join(__dirname, 'DataBase', 'viewonce_cache.json');

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

// Réponses basiques et lisibles (bypass du code obfusqué)
async function handleCommand(ovl, msg) {
  const from = msg.key.remoteJid;
  const body = getMessageText(msg);
  
  // ═══════════════════════════════════════════════════════════
  // 🔥 COMMANDE SPÉCIALE "C'EST QUEL WÉ ?" (sans préfixe)
  // ═══════════════════════════════════════════════════════════
  const bodyLower = (body || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (bodyLower.includes("c'est quel we") || 
      bodyLower.includes("cest quel we") || 
      bodyLower.includes("c est quel we") ||
      bodyLower.includes("quel we") ||
      bodyLower === "we" ||
      bodyLower === "wé") {
    // Traiter comme une commande vue unique
    const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const send = (text) => ovl.sendMessage(botNumber, { text });
    
    // Récupérer le message cité
    const msgType = Object.keys(msg.message || {})[0];
    const contextInfo = msg.message?.[msgType]?.contextInfo || 
                        msg.message?.extendedTextMessage?.contextInfo;
    
    if (!contextInfo?.stanzaId) {
      return send("❓ *C'est quel wé ?*\n\n👉 Réponds à une photo/vidéo vue unique avec cette phrase pour la récupérer!\n\n💡 Utilise aussi: .vv, .wé, .listvv");
    }
    
    // Chercher dans le cache des vues uniques
    const quotedId = contextInfo.stanzaId;
    let storedViewOnce = viewOnceMessages.get(quotedId);
    
    if (!storedViewOnce) {
      for (const [id, data] of viewOnceMessages) {
        if (contextInfo.participant === data.message?.key?.participant ||
            contextInfo.participant === data.sender) {
          storedViewOnce = data;
          break;
        }
      }
    }
    
    if (!storedViewOnce) {
      return send("❌ *Wé introuvable!*\n\nCette vue unique n'a pas été interceptée.\n\n💡 Les vues uniques doivent être reçues AVANT d'être ouvertes pour être sauvegardées.\n\n📋 Utilise `.listvv` pour voir les vues uniques disponibles.");
    }
    
    try {
      const originalMsg = storedViewOnce.message;
      const viewOnceContent = originalMsg.message?.viewOnceMessage || 
                              originalMsg.message?.viewOnceMessageV2 || 
                              originalMsg.message?.viewOnceMessageV2Extension;
      
      if (!viewOnceContent) {
        return send("❌ Contenu vue unique non disponible.");
      }
      
      const mediaMsg = viewOnceContent.message;
      const mediaType = Object.keys(mediaMsg || {})[0];
      const media = mediaMsg?.[mediaType];
      
      if (!media) {
        return send("❌ Média non trouvé dans la vue unique.");
      }
      
      const buffer = await downloadMediaMessage(originalMsg, "buffer", {});
      const caption = media.caption || "";
      const senderName = storedViewOnce.senderName || "Inconnu";
      
      const finalCaption = `👁️ *VUE UNIQUE RÉCUPÉRÉE*\n\n📤 De: ${senderName}\n📝 Légende: ${caption || "(aucune)"}\n\n✅ Wé récupéré avec succès!`;
      
      if (mediaType === "imageMessage") {
        await ovl.sendMessage(botNumber, { image: buffer, caption: finalCaption });
      } else if (mediaType === "videoMessage") {
        await ovl.sendMessage(botNumber, { video: buffer, caption: finalCaption });
      } else if (mediaType === "audioMessage") {
        await ovl.sendMessage(botNumber, { audio: buffer, mimetype: "audio/mp4", ptt: true });
        await send(finalCaption);
      }
      
      console.log(`[WÉ] ✅ Vue unique récupérée pour ${senderName}`);
      return;
    } catch (e) {
      console.error("[WÉ] Erreur:", e);
      return send(`❌ Erreur: ${e.message}`);
    }
  }
  
  if (!body || !body.startsWith(config.PREFIXE)) return;

  const [cmd, ...rest] = body.slice(config.PREFIXE.length).trim().split(/\s+/);
  const command = (cmd || "").toLowerCase();
  const args = rest; // Garder comme tableau pour accès par index
  const argsText = rest.join(" "); // Version texte pour les commandes qui en ont besoin

  // Numéro du bot (pour envoyer en privé)
  const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
  
  // ═══════════════════════════════════════════════════════════
  // 🗑️ SUPPRIMER AUTOMATIQUEMENT LE MESSAGE DE COMMANDE
  // ═══════════════════════════════════════════════════════════
  const isOwnChat = from === botNumber;
  
  // Supprimer le message de commande si on n'est pas dans notre propre chat
  if (!isOwnChat && msg.key.fromMe) {
    try {
      await ovl.sendMessage(from, { delete: msg.key });
      console.log(`🗑️ Commande .${command} supprimée du chat ${from}`);
    } catch (e) {
      console.log(`⚠️ Impossible de supprimer la commande: ${e.message}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // 📩 TOUJOURS RÉPONDRE EN PRIVÉ (à soi-même)
  // ═══════════════════════════════════════════════════════════
  
  // Fonction pour répondre en privé (à soi-même) - TOUJOURS utilisée
  const sendPrivate = (text) => ovl.sendMessage(botNumber, { text });
  
  // Fonction pour répondre dans le chat actuel (rarement utilisée)
  const sendHere = (text) => ovl.sendMessage(from, { text });

  const toggle = (key) => {
    protectionState[key] = !protectionState[key];
    return protectionState[key];
  };

  // TOUJOURS envoyer en privé à soi-même
  const send = sendPrivate;

  // Charger le système de menu stylisé
  let MenuSystem, AccessControl;
  try {
    MenuSystem = require('./lib/MenuSystem');
    AccessControl = require('./lib/AccessControl');
  } catch (e) {
    console.log('[START] Modules de menu non disponibles, utilisation du menu basique');
  }

  // Fonction pour obtenir les infos utilisateur
  const getUserInfo = async (jid) => {
    const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
    const ownerNum = (process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
    const isOwner = AccessControl ? AccessControl.isOwner(jid) : (
      phone === ownerNum || phone.includes(ownerNum) || ownerNum.includes(phone)
    );
    
    let plan = 'FREE';
    let dailyLimit = 30;
    let commandsToday = 0;
    
    try {
      const premiumDB = require('./DataBase/premium');
      const status = await premiumDB.getPremiumStatus(jid);
      if (status && status.plan) {
        plan = status.plan;
        dailyLimit = status.dailyLimit || 30;
        commandsToday = status.commandsToday || 0;
      }
    } catch (e) {}
    
    if (isOwner) {
      plan = 'OWNER';
      dailyLimit = -1;
    }
    
    return {
      name: msg.pushName || 'Utilisateur',
      phone: phone,
      plan: plan,
      isOwner: isOwner,
      isPremium: ['BRONZE', 'ARGENT', 'OR', 'DIAMANT', 'LIFETIME', 'OWNER'].includes(plan),
      commandsToday: commandsToday,
      dailyLimit: dailyLimit
    };
  };

  switch (command) {
    case "ping":
      return send("🏓 Pong! Le bot est en ligne.");
    case "menu":
    case "help":
    case "aide": {
      if (MenuSystem) {
        try {
          const senderForMenu = msg.key.participant || from;
          const userInfo = await getUserInfo(senderForMenu);
          const category = args[0] ? args[0].toLowerCase() : null;
          
          let menuText;
          if (category && MenuSystem.CATEGORIES[category.toLowerCase()]) {
            menuText = MenuSystem.generateCategoryMenu(category.toLowerCase(), userInfo);
          } else if (category) {
            const cats = Object.keys(MenuSystem.CATEGORIES).join(', ');
            menuText = `❌ Catégorie inconnue: *${category}*\n\nCatégories disponibles:\n${cats.split(', ').map(c => `• .menu ${c}`).join('\n')}`;
          } else {
            menuText = MenuSystem.generateMainMenu(userInfo);
          }
          return send(menuText);
        } catch (e) {
          console.log('[MENU] Erreur:', e.message);
        }
      }
      
      // Menu de fallback si MenuSystem non disponible
      const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🤖 HANI-MD V2.6.0
┃━━━━━━━━━━━━━━━━━━━━━
┃ Préfixe : ${config.PREFIXE}
┃ Mode    : ${config.MODE}
┃ Owner   : ${config.NOM_OWNER}
┃
┃ 📌 Commandes générales :
┃ ${config.PREFIXE}ping
┃ ${config.PREFIXE}info
┃
┃ 👁️ Vue unique (View Once) :
┃ ${config.PREFIXE}vv (répondre à un msg)
┃ ${config.PREFIXE}listvv
┃ 💬 "c'est quel wé ?" (sans préfixe)
┃
┃ 🗑️ Messages supprimés :
┃ ${config.PREFIXE}antidelete on/off
┃ ${config.PREFIXE}deleted (voir supprimés)
┃
┃ 🛡️ Protections :
┃ ${config.PREFIXE}antilink on/off
┃ ${config.PREFIXE}antispam on/off
┃ ${config.PREFIXE}antibot on/off
┃ ${config.PREFIXE}anticall on/off
┃ ${config.PREFIXE}antitag on/off
╰━━━━━━━━━━━━━━━━━━━━━╯`;
      return send(menuText);
    }
    case "info": {
      const infoText = `
🤖 OVL-MD-V2
• Numéro : ${ovl.user?.id?.split(":")[0] || "inconnu"}
• Owner  : ${config.NOM_OWNER}
• Mode   : ${config.MODE}
• Préfixe: ${config.PREFIXE}
• Antidelete: ${protectionState.antidelete ? "✅ Activé" : "❌ Désactivé"}
`;
      return send(infoText);
    }
    
    // === COMMANDES MESSAGES SUPPRIMÉS ===
    case "deleted":
    case "delmsg":
    case "msgdel": {
      if (deletedMessages.length === 0) {
        return send("📭 Aucun message supprimé intercepté récemment.");
      }
      
      let list = "🗑️ *Messages supprimés récents :*\n\n";
      const recent = deletedMessages.slice(-10); // Les 10 derniers
      recent.forEach((del, i) => {
        list += `${i + 1}. De: ${del.sender}\n`;
        list += `   Chat: ${del.chat}\n`;
        list += `   Type: ${del.type}\n`;
        if (del.text) list += `   Texte: "${del.text.substring(0, 100)}${del.text.length > 100 ? '...' : ''}"\n`;
        list += `   Date: ${del.date}\n\n`;
      });
      return send(list);
    }
    
    // === COMMANDES VUE UNIQUE ===
    case "vv":
    case "viewonce":
    case "vo":
    case "wé":
    case "we":
    case "quel":
    case "cestquelwe":
    case "cestquel": {
      // Récupérer les informations du message cité de plusieurs façons
      const msgType = Object.keys(msg.message || {})[0];
      const contextInfo = msg.message?.[msgType]?.contextInfo || 
                          msg.message?.extendedTextMessage?.contextInfo ||
                          msg.message?.imageMessage?.contextInfo ||
                          msg.message?.videoMessage?.contextInfo;
      
      if (!contextInfo?.stanzaId) {
        return send("❌ Réponds à un message à vue unique pour le récupérer.\n\n💡 Utilise `.listvv` pour voir les vues uniques interceptées.");
      }
      
      const quotedId = contextInfo.stanzaId;
      const quotedMsg = contextInfo.quotedMessage;
      
      console.log(`[VV] ID message cité: ${quotedId}`);
      console.log(`[VV] Type quotedMsg: ${quotedMsg ? Object.keys(quotedMsg).join(', ') : 'null'}`);
      
      // Méthode 1: Chercher dans les messages à vue unique interceptés
      let storedViewOnce = viewOnceMessages.get(quotedId);
      
      // Méthode 2: Chercher par sender + timestamp approximatif
      if (!storedViewOnce) {
        for (const [id, data] of viewOnceMessages) {
          if (contextInfo.participant === data.message?.key?.participant ||
              contextInfo.participant === data.sender) {
            storedViewOnce = data;
            break;
          }
        }
      }
      
      let viewOnceContent = null;
      let originalMsg = null;
      
      // Essayer d'obtenir le contenu à vue unique
      if (storedViewOnce) {
        // Utiliser le message stocké
        console.log(`[VV] ✅ Message trouvé dans le cache: ${storedViewOnce.type}`);
        originalMsg = storedViewOnce.message;
        viewOnceContent = originalMsg.message?.viewOnceMessage || 
                          originalMsg.message?.viewOnceMessageV2 || 
                          originalMsg.message?.viewOnceMessageV2Extension;
      } else if (quotedMsg) {
        // Essayer depuis le quotedMessage directement
        viewOnceContent = quotedMsg.viewOnceMessage || 
                          quotedMsg.viewOnceMessageV2 || 
                          quotedMsg.viewOnceMessageV2Extension;
        
        // Parfois le média est directement dans quotedMessage
        if (!viewOnceContent) {
          const quotedType = Object.keys(quotedMsg)[0];
          if (quotedType === "imageMessage" || quotedType === "videoMessage" || quotedType === "audioMessage") {
            // C'est peut-être une vue unique dont le wrapper a été retiré
            viewOnceContent = { message: quotedMsg };
            console.log(`[VV] Média direct trouvé: ${quotedType}`);
          }
        }
      }
      
      if (!viewOnceContent) {
        console.log(`[VV] ❌ Pas de vue unique trouvée. QuotedMsg keys: ${quotedMsg ? Object.keys(quotedMsg).join(', ') : 'null'}`);
        return send("❌ Ce message n'est pas un message à vue unique.\n\n💡 Astuce: Les vues uniques doivent être interceptées AVANT d'être ouvertes. Utilise `.listvv` pour voir celles déjà interceptées.");
      }
      
      try {
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0];
        const media = mediaMsg?.[mediaType];
        
        if (!mediaType || !media) {
          return send("❌ Impossible de lire le contenu du média.");
        }
        
        console.log(`[VV] Téléchargement du média: ${mediaType}`);
        
        // Télécharger le média - utiliser le bon message original
        const downloadMsg = originalMsg || { message: mediaMsg, key: { ...msg.key, id: quotedId } };
        const stream = await downloadMediaMessage(
          downloadMsg,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: ovl.updateMediaMessage }
        );
        
        // Destination : privé si pas dans son propre chat
        const dest = isOwnChat ? from : botNumber;
        
        // Renvoyer le média sans vue unique (en privé)
        if (mediaType === "imageMessage") {
          await ovl.sendMessage(dest, { 
            image: stream, 
            caption: "👁️ Vue unique récupérée :\n" + (media.caption || "") 
          });
        } else if (mediaType === "videoMessage") {
          await ovl.sendMessage(dest, { 
            video: stream, 
            caption: "👁️ Vue unique récupérée :\n" + (media.caption || "") 
          });
        } else if (mediaType === "audioMessage") {
          await ovl.sendMessage(dest, { 
            audio: stream,
            mimetype: "audio/mp4"
          });
        } else {
          return send("❌ Type de média non supporté: " + mediaType);
        }
        
        console.log(`👁️ Vue unique récupérée pour ${from} (envoyée en privé)`);
        
        // Supprimer du cache après récupération et sauvegarder
        if (storedViewOnce) {
          viewOnceMessages.delete(quotedId);
          saveViewOnceMessages(viewOnceMessages);
        }
        
      } catch (e) {
        console.log("⚠️ Erreur viewonce:", e.message, e.stack);
        return send("❌ Impossible de récupérer ce média.\n\nErreur: " + e.message);
      }
      return;
    }
    
    case "listvv":
    case "listviewonce": {
      console.log(`[LISTVV] Nombre de vues uniques en cache: ${viewOnceMessages.size}`);
      
      if (viewOnceMessages.size === 0) {
        return send("📭 Aucun message à vue unique intercepté récemment.\n\n💡 Les vues uniques sont automatiquement interceptées quand elles arrivent. Attends qu'une vue unique soit envoyée.");
      }
      
      let list = "👁️ *Messages à vue unique interceptés :*\n\n";
      let i = 1;
      for (const [id, data] of viewOnceMessages) {
        const senderName = data.pushName || data.sender?.split('@')[0] || 'Inconnu';
        list += `*${i}.* ${senderName}\n`;
        list += `   📁 Type: ${data.type}\n`;
        list += `   🕐 Date: ${data.date}\n`;
        list += `   🆔 ID: ${id.substring(0, 10)}...\n\n`;
        i++;
      }
      list += `\n💡 *Pour récupérer:* Réponds au message original avec .vv`;
      return send(list);
    }
    
    // Commande pour récupérer la dernière vue unique sans répondre
    case "lastvv":
    case "lastviewonce": {
      if (viewOnceMessages.size === 0) {
        return send("📭 Aucun message à vue unique intercepté.");
      }
      
      // Obtenir le dernier message
      const lastEntry = Array.from(viewOnceMessages.entries()).pop();
      if (!lastEntry) {
        return send("❌ Erreur lors de la récupération.");
      }
      
      const [lastId, lastData] = lastEntry;
      
      try {
        const viewOnceContent = lastData.message.message?.viewOnceMessage || 
                                lastData.message.message?.viewOnceMessageV2 || 
                                lastData.message.message?.viewOnceMessageV2Extension;
        
        if (!viewOnceContent) {
          return send("❌ Le contenu n'est plus disponible.");
        }
        
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0];
        const media = mediaMsg?.[mediaType];
        
        console.log(`[LASTVV] Téléchargement: ${mediaType}`);
        
        const stream = await downloadMediaMessage(
          lastData.message,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: ovl.updateMediaMessage }
        );
        
        const dest = isOwnChat ? from : botNumber;
        const caption = `👁️ Dernière vue unique (de ${lastData.pushName || 'Inconnu'}):\n${media?.caption || ''}`;
        
        if (mediaType === "imageMessage") {
          await ovl.sendMessage(dest, { image: stream, caption });
        } else if (mediaType === "videoMessage") {
          await ovl.sendMessage(dest, { video: stream, caption });
        } else if (mediaType === "audioMessage") {
          await ovl.sendMessage(dest, { audio: stream, mimetype: "audio/mp4" });
        }
        
        console.log(`👁️ Dernière vue unique récupérée`);
        viewOnceMessages.delete(lastId);
        saveViewOnceMessages(viewOnceMessages); // Sauvegarder après suppression
        
      } catch (e) {
        console.log("⚠️ Erreur lastvv:", e.message);
        return send("❌ Erreur: " + e.message);
      }
      return;
    }
    
    case "antilink":
    case "antispam":
    case "antibot":
    case "anticall":
    case "antitag":
    case "antidelete": {
      const key = command;
      const param = (args[0] || "").toLowerCase();
      if (param === "on") protectionState[key] = true;
      else if (param === "off") protectionState[key] = false;
      else protectionState[key] = toggle(key);
      return send(`🛡️ ${key} ${protectionState[key] ? "activé" : "désactivé"}.`);
    }
    default: {
      // ═══════════════════════════════════════════════════════════
      // 🔄 DÉLÉGUER AU SYSTÈME DE COMMANDES PRINCIPAL (OVLCMD)
      // ═══════════════════════════════════════════════════════════
      
      // Rechercher si la commande existe dans le système principal
      const cmdData = findCommand(command);
      
      if (cmdData) {
        try {
          // Préparer les options pour le handler de commande
          const isGroup = from.endsWith("@g.us");
          const sender = msg.key.participant || from;
          const senderNumber = sender.replace("@s.whatsapp.net", "").replace("@lid", "");
          const ownerNumber = (config.NUMERO_OWNER || "").replace(/[^0-9]/g, "");
          const isOwner = ownerNumber.length > 5 && (
                           senderNumber === ownerNumber || 
                           senderNumber.includes(ownerNumber) || 
                           ownerNumber.includes(senderNumber)
                         );
          
          // Fonction répondre pour les commandes - envoie dans le chat d'origine
          const repondre = async (text, opts = {}) => {
            const msgContent = { text: String(text) };
            if (opts?.mentions) msgContent.mentions = opts.mentions;
            await ovl.sendMessage(from, msgContent, { quoted: msg });
          };
          
          // Préparer le message structuré pour les commandes
          const ms = msg;
          const arg = rest;
          const texte = argsText;
          
          // Déterminer les permissions de groupe
          let isAdmin = false;
          let isBotAdmin = false;
          let groupName = null;
          if (isGroup) {
            try {
              const groupMeta = await ovl.groupMetadata(from);
              const botJid = ovl.user?.id?.split(':')[0] + '@s.whatsapp.net';
              const admins = groupMeta.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
              isAdmin = admins.includes(sender);
              isBotAdmin = admins.includes(botJid);
              groupName = groupMeta.subject;
            } catch (e) {}
          }

          // Options passées au handler
          const options = {
            repondre,
            arg,
            args: arg,
            argsText: texte,
            texte,
            ms,
            superUser: isOwner,
            auteurMessage: sender,
            isGroup,
            verif_Groupe: isGroup,
            admin_Groupe: isBotAdmin,
            verif_Ovl_Admin: isBotAdmin,
            verif_Admin: isAdmin,
            auteur_Msg: sender,
            auteurMsgRepondu: msg.message?.extendedTextMessage?.contextInfo?.participant,
            nomAuteurMessage: msg.pushName || "Utilisateur",
            msgRepondu: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
            idBot: botNumber,
            preniumUsers: [],
            superUsers: [config.NUMERO_OWNER],
            dev: [],
            prefixe: config.PREFIXE,
            from,
            nomGroupe: groupName,
            destPrivate: botNumber,
          };
          
          // Exécuter la commande
          await executeCommand(command, ovl, msg, options);
          return;
        } catch (e) {
          console.log(`[CMD] ⚠️ Erreur exécution ${command}:`, e.message);
          return sendPrivate(`❌ Erreur lors de l'exécution de la commande: ${e.message}`);
        }
      }
      
      // Si la commande n'existe vraiment pas, ne pas répondre
      // (pour ne pas spammer à chaque message)
      return;
    }
  }
}

// Variable pour stocker l'instance du bot
let ovl = null;

async function startBot() {
  console.log("\n");
  console.log("╔════════════════════════════════════════╗");
  console.log("║       🤖 OVL-MD-V2 - Bot WhatsApp      ║");
  console.log("║    Connexion directe par QR Code       ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("\n");

  // Créer le dossier de session s'il n'existe pas
  if (!fs.existsSync(SESSION_FOLDER)) {
    fs.mkdirSync(SESSION_FOLDER, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════
  // 🔑 RESTAURER SESSION DEPUIS SESSION_ID (DÉPLOIEMENT CLOUD)
  // ═══════════════════════════════════════════════════════
  const sessionId = process.env.SESSION_ID || '';
  const credsPath = path.join(SESSION_FOLDER, 'creds.json');
  const hasExistingSession = fs.existsSync(credsPath);

  if (sessionId && !hasExistingSession) {
    try {
      // Format bundle complet: HANI-MD~{base64(JSON)}  ← session-generator.js
      // Format simple ancien:  HANI-MD_{base64(creds)} ← session.js (legacy)
      if (sessionId.startsWith('HANI-MD~')) {
        const jsonStr = Buffer.from(sessionId.slice(8), 'base64').toString('utf-8');
        const bundle = JSON.parse(jsonStr);
        for (const [filename, b64content] of Object.entries(bundle)) {
          fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(b64content, 'base64'));
        }
        console.log(`[SESSION] ✅ Session restaurée depuis SESSION_ID (${Object.keys(bundle).length} fichiers)`);
      } else if (sessionId.startsWith('HANI-MD_')) {
        const decoded = Buffer.from(sessionId.slice(8), 'base64').toString('utf-8');
        fs.writeFileSync(credsPath, decoded);
        console.log('[SESSION] ✅ Session restaurée depuis SESSION_ID (format simple)');
      } else {
        console.error('[SESSION] ❌ Format SESSION_ID non reconnu (doit commencer par HANI-MD~)');
      }
    } catch (e) {
      console.error('[SESSION] ❌ Impossible de restaurer SESSION_ID:', e.message);
      console.log('[SESSION] Le bot va afficher un QR code...');
    }
  } else if (!sessionId && !hasExistingSession) {
    console.log('[SESSION] ℹ️ Aucune SESSION_ID définie — affichage du QR code...');
  } else if (hasExistingSession) {
    console.log('[SESSION] ✅ Session existante trouvée sur disque');
  }

  // Charger l'état d'authentification
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

  // Créer la connexion WhatsApp avec paramètres optimisés pour la stabilité
  ovl = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "silent" }).child({ level: "silent" }),
      ),
    },
    logger: pino({ level: "silent" }),
    browser: ["OVL-MD-V2", "Chrome", "120.0.0"],  // Browser personnalisé plus stable
    keepAliveIntervalMs: 15000,         // Ping toutes les 15s pour maintenir la connexion active
    markOnlineOnConnect: false,         // Ne pas marquer en ligne (plus discret)
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,             // Ne pas synchroniser l'historique (plus stable)
    retryRequestDelayMs: 2000,          // Délai entre les tentatives
    connectTimeoutMs: 60000,            // Timeout de connexion plus long (60s)
    defaultQueryTimeoutMs: 60000,       // Timeout des requêtes plus long
    emitOwnEvents: true,                // Recevoir ses propres messages
    fireInitQueries: true,              // Initialiser les requêtes au démarrage
  });

  // Gérer les événements de connexion
  ovl.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      connectionStatus = 'waiting_qr';
      console.log("\n📱 QR CODE DISPONIBLE !");
      console.log("═══════════════════════════════════════════════════");
      console.log("👉 Ouvre ton navigateur sur: http://localhost:" + port + "/qr");
      console.log("═══════════════════════════════════════════════════");
      console.log("   Puis scanne le QR avec WhatsApp → Appareils connectés\n");
    }

    if (connection === "connecting") {
      console.log("🔄 Connexion en cours...");
    }

    if (connection === "open") {
      currentQR = null;
      connectionStatus = 'connected';
      console.log("\n");
      console.log("╔════════════════════════════════════════╗");
      console.log("║     ✅ CONNEXION RÉUSSIE !             ║");
      console.log("╚════════════════════════════════════════╝");
      console.log("\n");
      console.log("📊 Informations du bot:");
      console.log(`   • Préfixe: ${config.PREFIXE}`);
      console.log(`   • Mode: ${config.MODE}`);
      console.log(`   • Owner: ${config.NOM_OWNER}`);
      console.log("\n");
      console.log("🛡️ Commandes de protection disponibles:");
      console.log(`   • ${config.PREFIXE}antilink on/off`);
      console.log(`   • ${config.PREFIXE}antispam on/off`);
      console.log(`   • ${config.PREFIXE}antibot on/off`);
      console.log(`   • ${config.PREFIXE}anticall on/off`);
      console.log(`   • ${config.PREFIXE}antitag on/off`);
      console.log("\n");
      console.log("💡 Tape " + config.PREFIXE + "menu sur WhatsApp pour voir toutes les commandes");
      console.log("\n");
      
      // 🔔 Envoyer les notifications de paiement en attente à l'owner
      setTimeout(async () => {
        try {
          const notifFile = path.join(__dirname, 'DataBase', 'pending_owner_notifications.json');
          if (fs.existsSync(notifFile)) {
            let notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8') || '[]');
            const pending = notifications.filter(n => !n.sent);
            
            if (pending.length > 0) {
              const ownerNumber = (process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
              const ownerJid = ownerNumber + '@s.whatsapp.net';
              
              for (const notif of pending) {
                if (notif.type === 'payment') {
                  const msg = 
                    `💰 *PAIEMENT WAVE REÇU*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `👤 *Client:* ${notif.name}\n` +
                    `📱 *Téléphone:* ${notif.phone}\n` +
                    `💎 *Plan:* ${notif.plan}\n` +
                    `💵 *Montant:* ${notif.amount} FCFA\n` +
                    `📝 *Transaction:* ${notif.transactionId}\n\n` +
                    `🔑 *Code:* \`${notif.activationCode}\`\n\n` +
                    `⏰ *Date:* ${new Date(notif.createdAt).toLocaleString('fr-FR')}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━`;
                  
                  await ovl.sendMessage(ownerJid, { text: msg });
                  notif.sent = true;
                  await delay(1000);
                }
              }
              
              fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
              console.log(`[NOTIF] ✅ ${pending.length} notification(s) envoyée(s) à l'owner`);
            }
          }
        } catch (e) {
          console.error('[NOTIF] Erreur envoi notifications:', e.message);
        }
      }, 5000); // Attendre 5 secondes après connexion

      // On ne charge plus les modules obfusqués pour éviter les erreurs (ex: sharp).
      console.log(
        "ℹ️ Modules obfusqués ignorés. Utilise les commandes simples intégrées (ping, menu, info, protections).",
      );
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || "Inconnue";

      console.log(`\n⚠️ Connexion fermée (code: ${statusCode}, raison: ${reason})`);

      // Vérifier si c'est un conflit ou erreur temporaire (NE PAS supprimer la session)
      const isConflict = reason?.toLowerCase().includes("conflict");
      const isConnectionFailure = reason?.toLowerCase().includes("connection failure");
      const isStreamError = reason?.toLowerCase().includes("stream errored");
      const isTemporaryError = isConflict || isConnectionFailure || isStreamError;
      
      // SEUL CAS de suppression de session: code 401 avec message "logged out" explicite
      const isRealLogout = statusCode === DisconnectReason.loggedOut && 
                           reason?.toLowerCase().includes("logged out");
      
      // Détecter les boucles de "Connection Failure" répétées
      if (isConnectionFailure && statusCode === 401) {
        connectionFailureCount++;
        console.log(`⚠️ Échec de connexion ${connectionFailureCount}/${MAX_CONNECTION_FAILURES}`);
        
        if (connectionFailureCount >= MAX_CONNECTION_FAILURES) {
          connectionFailureCount = 0;
          if (process.env.SESSION_ID) {
            // Sur Railway/cloud : ne pas supprimer, juste signaler
            console.error('❌ SESSION INVALIDÉE — Regénérez la SESSION_ID:');
            console.error('   1. node session-generator.js  (sur votre PC)');
            console.error('   2. Mettez à jour SESSION_ID dans Railway Variables');
            console.error('⏳ Nouvelle tentative dans 60 secondes...');
            await delay(60000);
            startBot();
          } else {
            console.log("❌ Trop d'échecs - suppression session et nouveau QR...");
            if (fs.existsSync(SESSION_FOLDER)) {
              fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
            }
            await delay(3000);
            startBot();
          }
          return;
        }
      } else {
        // Réinitialiser le compteur si c'est une autre erreur
        connectionFailureCount = 0;
      }
      
      if (isRealLogout) {
        connectionFailureCount = 0;
        if (process.env.SESSION_ID) {
          // Sur Railway/cloud : signaler sans supprimer
          console.error('❌ DÉCONNEXION WHATSAPP DÉTECTÉE');
          console.error('   → Allez dans WhatsApp > Appareils connectés > Déconnecter TOUT');
          console.error('   → Puis: node session-generator.js sur votre PC');
          console.error('   → Puis mettez à jour SESSION_ID dans Railway');
          console.error('⏳ Nouvelle tentative dans 60 secondes...');
          await delay(60000);
          startBot();
        } else {
          console.log("❌ Déconnexion manuelle - suppression session et nouveau QR...");
          if (fs.existsSync(SESSION_FOLDER)) {
            fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          }
          await delay(3000);
          startBot();
        }
      } else if (isTemporaryError) {
        // Erreur temporaire (conflit, connection failure, stream error) - garder la session
        console.log("⚡ Erreur temporaire détectée - reconnexion avec session existante...");
        await delay(3000);
        startBot();
      } else if (statusCode === DisconnectReason.connectionClosed || 
                 statusCode === DisconnectReason.connectionLost ||
                 statusCode === DisconnectReason.timedOut ||
                 statusCode === DisconnectReason.restartRequired) {
        // Reconnexion rapide pour les problèmes de connexion temporaires
        console.log("🔄 Reconnexion immédiate...");
        await delay(1000);
        startBot();
      } else {
        // Autres erreurs - reconnexion standard (garder la session)
        console.log("🔄 Reconnexion dans 3 secondes...");
        await delay(3000);
        startBot();
      }
    }

    // Réinitialiser le compteur en cas de connexion réussie
    if (connection === "open") {
      connectionFailureCount = 0;
    }
  });

  // Sauvegarder les credentials
  ovl.ev.on("creds.update", saveCreds);

  // Gérer les messages avec le handler lisible ci-dessus
  ovl.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;
      
      // ═══════════════════════════════════════════════════════════
      // 👁️ INTERCEPTER LES MESSAGES À VUE UNIQUE
      // ═══════════════════════════════════════════════════════════
      const viewOnceContent = msg.message.viewOnceMessage || msg.message.viewOnceMessageV2 || msg.message.viewOnceMessageV2Extension;
      if (viewOnceContent) {
        const chatJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0] || "inconnu";
        
        console.log(`\n══════════════════════════════════════`);
        console.log(`👁️ VUE UNIQUE DÉTECTÉE!`);
        console.log(`   ID: ${msg.key.id}`);
        console.log(`   De: ${msg.pushName || senderJid}`);
        console.log(`   Type: ${mediaType}`);
        console.log(`   Chat: ${chatJid}`);
        console.log(`══════════════════════════════════════\n`);
        
        // Stocker le message à vue unique avec plus d'infos
        viewOnceMessages.set(msg.key.id, {
          id: msg.key.id,
          sender: senderJid,
          chat: chatJid,
          pushName: msg.pushName || "Inconnu",
          type: mediaType.replace("Message", ""),
          date: new Date().toLocaleString("fr-FR"),
          timestamp: Date.now(),
          message: msg,  // Message complet pour téléchargement
          fromMe: msg.key.fromMe
        });
        
        // Garder les 50 derniers
        if (viewOnceMessages.size > 50) {
          const firstKey = viewOnceMessages.keys().next().value;
          viewOnceMessages.delete(firstKey);
        }
        
        // Sauvegarder sur le disque
        saveViewOnceMessages(viewOnceMessages);
        
        console.log(`[VV] ✅ Vue unique sauvegardée. Total: ${viewOnceMessages.size}`);
      }
      
      // Stocker tous les messages pour anti-delete
      if (!msg.key.fromMe && msg.message) {
        const msgType = Object.keys(msg.message)[0];
        messageStore.set(msg.key.id, {
          key: msg.key,
          message: msg.message,
          sender: msg.key.remoteJid,
          pushName: msg.pushName || "Inconnu",
          timestamp: new Date(),
          type: msgType,
          text: getMessageText(msg)
        });
        
        // Limiter la taille du store
        if (messageStore.size > MAX_STORED_MESSAGES) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }
      }
      
      // Log pour déboguer
      const body = getMessageText(msg);
      if (body) {
        console.log(`📩 Message reçu: "${body}" de ${msg.key.remoteJid} (fromMe: ${msg.key.fromMe})`);
      }
      
      // Traiter les commandes (même les messages envoyés par soi-même)
      await handleCommand(ovl, msg);
    } catch (e) {
      console.log("⚠️ Erreur message:", e.message);
    }
  });

  // Gérer les messages supprimés (messages.update)
  ovl.ev.on("messages.update", async (updates) => {
    if (!protectionState.antidelete) return;
    
    for (const update of updates) {
      // Détecter si le message a été supprimé
      if (update.update?.messageStubType === 1 || update.update?.message === null) {
        const msgId = update.key?.id;
        const storedMsg = messageStore.get(msgId);
        
        if (storedMsg) {
          console.log(`🗑️ Message supprimé détecté de ${storedMsg.sender}`);
          
          // Ajouter aux messages supprimés
          deletedMessages.push({
            sender: storedMsg.pushName,
            chat: storedMsg.sender,
            type: storedMsg.type?.replace("Message", "") || "texte",
            text: storedMsg.text,
            date: new Date().toLocaleString("fr-FR"),
            originalMessage: storedMsg
          });
          
          // Limiter la taille
          if (deletedMessages.length > MAX_DELETED_MESSAGES) {
            deletedMessages.shift();
          }
          
          // Envoyer le message supprimé à toi-même
          try {
            const myJid = ovl.user?.id;
            if (myJid) {
              let notifText = `🗑️ *Message supprimé détecté*\n\n`;
              notifText += `👤 De: ${storedMsg.pushName}\n`;
              notifText += `💬 Chat: ${storedMsg.sender}\n`;
              notifText += `📝 Type: ${storedMsg.type?.replace("Message", "")}\n`;
              notifText += `🕐 Date: ${new Date().toLocaleString("fr-FR")}\n`;
              if (storedMsg.text) {
                notifText += `\n📄 Contenu:\n"${storedMsg.text}"`;
              }
              
              await ovl.sendMessage(myJid, { text: notifText });
              
              // Si c'était un média, essayer de le renvoyer
              if (storedMsg.type === "imageMessage" || storedMsg.type === "videoMessage" || storedMsg.type === "audioMessage") {
                try {
                  const stream = await downloadMediaMessage(
                    { message: storedMsg.message, key: storedMsg.key },
                    "buffer",
                    {},
                    { logger: pino({ level: "silent" }), reuploadRequest: ovl.updateMediaMessage }
                  );
                  
                  if (storedMsg.type === "imageMessage") {
                    await ovl.sendMessage(myJid, { image: stream, caption: "🗑️ Image supprimée" });
                  } else if (storedMsg.type === "videoMessage") {
                    await ovl.sendMessage(myJid, { video: stream, caption: "🗑️ Vidéo supprimée" });
                  } else if (storedMsg.type === "audioMessage") {
                    await ovl.sendMessage(myJid, { audio: stream, mimetype: "audio/mp4" });
                  }
                } catch (mediaErr) {
                  console.log("⚠️ Impossible de récupérer le média supprimé");
                }
              }
            }
          } catch (e) {
            console.log("⚠️ Erreur notification antidelete:", e.message);
          }
        }
      }
    }
  });

  // Gérer les appels basiquement (bloquer si anticall actif)
  ovl.ev.on("call", async (calls) => {
    for (const call of calls || []) {
      if (call.status === "offer" && protectionState.anticall) {
        try {
          await ovl.rejectCall(call.id, call.from);
          await ovl.sendMessage(call.from, { text: "❌ Les appels sont désactivés sur ce bot." });
        } catch (e) {
          // Ignorer
        }
      }
    }
  });

  return ovl;
}

// Démarrer le serveur Express pour le site web et garder le bot actif
const express = require("express");
// path déjà importé en haut du fichier
const app = express();
const port = process.env.PORT || 3000;

// Middleware pour parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Autoriser les requêtes cross-origin pour les paiements
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Charger le serveur premium (admin APIs, codes, users...)
let premiumApp, requireAdmin;
try {
  const ps = require('./web/premium-server');
  premiumApp  = ps.app;
  requireAdmin = ps.requireAdmin;
  console.log('[PREMIUM] ✅ Routes admin chargées depuis premium-server.js');
} catch (e) {
  console.log('[PREMIUM] ⚠️ premium-server non disponible:', e.message);
  requireAdmin = (req, res, next) => next(); // fallback: pas de restriction
}

// Servir les fichiers statiques - web/public en priorité (pages HTML principales)
app.use(express.static(path.join(__dirname, 'web', 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════
// 🏥 HEALTH CHECK ENDPOINT (REQUIS PAR RENDER)
// ═══════════════════════════════════════════════════════════
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    bot: "HANI-MD",
    version: "2.6.1",
    connection: connectionStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════
// 📱 PAGE QR CODE POUR CONNEXION WHATSAPP
// ═══════════════════════════════════════════════════════════
app.get("/qr", async (req, res) => {
  if (connectionStatus === 'connected') {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HANI-MD - Connecté</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    .emoji { font-size: 6rem; margin-bottom: 20px; }
    h1 { font-size: 2.5rem; margin-bottom: 15px; }
    p { font-size: 1.2rem; opacity: 0.9; }
    .btn { display: inline-block; margin-top: 30px; padding: 15px 40px; background: white; color: #128C7E; text-decoration: none; border-radius: 50px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">✅</div>
    <h1>Bot Connecté !</h1>
    <p>HANI-MD est maintenant connecté à WhatsApp</p>
    <a href="/" class="btn">🏠 Retour à l'accueil</a>
  </div>
</body>
</html>
    `);
  } else if (currentQR) {
    try {
      const qrImageUrl = await QRCode.toDataURL(currentQR, { width: 400, margin: 2 });
      res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>HANI-MD - Scanner QR Code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    h1 { font-size: 2rem; margin-bottom: 10px; }
    .subtitle { font-size: 1rem; opacity: 0.9; margin-bottom: 30px; }
    .qr-box { 
      background: white; 
      padding: 20px; 
      border-radius: 20px; 
      display: inline-block;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .qr-box img { display: block; }
    .instructions { 
      margin-top: 30px; 
      background: rgba(255,255,255,0.1); 
      padding: 20px; 
      border-radius: 15px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    .instructions h3 { margin-bottom: 15px; }
    .instructions ol { text-align: left; padding-left: 20px; }
    .instructions li { margin: 8px 0; }
    .refresh { margin-top: 20px; font-size: 0.9rem; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 HANI-MD - Connexion WhatsApp</h1>
    <p class="subtitle">Scanne ce QR code avec ton téléphone</p>
    <div class="qr-box">
      <img src="${qrImageUrl}" alt="QR Code WhatsApp">
    </div>
    <div class="instructions">
      <h3>📱 Comment faire ?</h3>
      <ol>
        <li>Ouvre <strong>WhatsApp</strong> sur ton téléphone</li>
        <li>Va dans <strong>Menu (⋮)</strong> ou <strong>Paramètres</strong></li>
        <li>Clique sur <strong>Appareils connectés</strong></li>
        <li>Appuie sur <strong>Connecter un appareil</strong></li>
        <li>Scanne ce QR code</li>
      </ol>
    </div>
    <p class="refresh">🔄 Page rafraîchie automatiquement toutes les 30 secondes</p>
  </div>
</body>
</html>
      `);
    } catch (e) {
      res.send("Erreur génération QR: " + e.message);
    }
  } else {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="5">
  <title>HANI-MD - En attente</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    .spinner { font-size: 4rem; animation: spin 2s linear infinite; display: inline-block; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    h1 { font-size: 2rem; margin: 20px 0; }
    p { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner">⏳</div>
    <h1>En attente du QR code...</h1>
    <p>Le bot démarre, patiente quelques secondes</p>
    <p style="margin-top: 20px; font-size: 0.9rem;">🔄 Rafraîchissement automatique...</p>
  </div>
</body>
</html>
    `);
  }
});

// API pour vérifier le statut de connexion
app.get("/api/connection-status", (req, res) => {
  res.json({ status: connectionStatus, hasQR: !!currentQR });
});

// Routes pour les pages HTML
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, 'web', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HANI-MD Premium</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    h1 { font-size: 3rem; margin-bottom: 20px; }
    .emoji { font-size: 5rem; margin-bottom: 20px; }
    p { font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9; }
    .btn {
      display: inline-block;
      padding: 15px 40px;
      background: #25D366;
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-size: 1.2rem;
      font-weight: bold;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .btn:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .status { margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🤖</div>
    <h1>HANI-MD Premium</h1>
    <p>Bot WhatsApp le plus puissant de Côte d'Ivoire</p>
    <a href="/subscribe.html" class="btn">💎 S'abonner Premium</a>
    <div class="status">
      <p>✅ Bot en ligne | 🌐 Serveur actif</p>
    </div>
  </div>
</body>
</html>
    `);
  }
});

// Route pour la page d'abonnement
app.get("/subscribe.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'subscribe.html'));
});

// Route pour la page de paiements
app.get("/payments.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'payments.html'));
});

// Route pour le panel admin (sans .html)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'admin.html'));
});

// Route pour la page d'activation (code premium)
app.get("/activate", (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'activate.html'));
});

// API pour créer un paiement
app.post("/api/payment/create", async (req, res) => {
  try {
    const PaymentSystem = require('./lib/PaymentSystem');
    const { phone, plan, method } = req.body;
    
    if (!phone || !plan || !method) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants' });
    }
    
    const payment = PaymentSystem.createPaymentRequest(phone, plan, method);
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API pour obtenir les stats de paiement
app.get("/api/payment/stats", (req, res) => {
  try {
    const PaymentSystem = require('./lib/PaymentSystem');
    const stats = PaymentSystem.getPaymentStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API pour obtenir les paiements en attente
app.get("/api/payment/pending", (req, res) => {
  try {
    const PaymentSystem = require('./lib/PaymentSystem');
    const pending = PaymentSystem.getPendingPayments();
    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API pour confirmer un paiement
app.post("/api/payment/confirm", (req, res) => {
  try {
    const PaymentSystem = require('./lib/PaymentSystem');
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId manquant' });
    }
    
    const result = PaymentSystem.confirmPayment(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API pour rejeter un paiement
app.post("/api/payment/reject", (req, res) => {
  try {
    const PaymentSystem = require('./lib/PaymentSystem');
    const { orderId, reason } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId manquant' });
    }
    
    const result = PaymentSystem.rejectPayment(orderId, reason || 'Paiement non reçu');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API statut du bot
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    status: 'online',
    botName: 'HANI-MD Premium',
    version: 'V2.6.0',
    uptime: process.uptime()
  });
});

// ═══════════════════════════════════════════════════════════
// 💳 API WAVE PAYMENT - PAIEMENT AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

let wavePayments;
try {
  wavePayments = require('./DataBase/wave_payments');
  console.log('[WAVE] ✅ Module Wave Payment chargé');
} catch (e) {
  console.log('[WAVE] ⚠️ Module Wave non disponible:', e.message);
}

// Servir la page d'abonnement
app.use('/subscribe', express.static(path.join(__dirname, 'web', 'public')));
app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'subscribe.html'));
});

// Créer un nouvel abonné (système manuel sans API Wave)
app.post('/api/wave/subscribe', (req, res) => {
  try {
    const { name, phone, plan, reference } = req.body;
    
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Nom requis (min 3 caractères)' });
    }
    if (!phone || phone.length < 8) {
      return res.status(400).json({ error: 'Numéro WhatsApp invalide' });
    }
    if (!plan) {
      return res.status(400).json({ error: 'Plan requis' });
    }
    
    // Générer ou utiliser la référence fournie
    const crypto = require('crypto');
    const paymentRef = reference || 'HANI-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Sauvegarder la demande
    const requestsFile = path.join(__dirname, 'DataBase', 'pending_payments.json');
    let requests = [];
    
    if (fs.existsSync(requestsFile)) {
      try { requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8')); } catch(e) { requests = []; }
    }
    
    const request = {
      id: crypto.randomBytes(8).toString('hex'),
      reference: paymentRef,
      name,
      phone: phone.replace(/[^0-9]/g, ''),
      plan: plan.toUpperCase(),
      amount: { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[plan.toUpperCase()] || 2000,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    requests.push(request);
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    
    console.log(`[WAVE] 📝 Nouvelle demande: ${name} - ${plan} - Réf: ${paymentRef}`);
    
    res.json({
      success: true,
      requestId: request.id,
      reference: paymentRef,
      message: 'Demande enregistrée'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirmation du paiement - SYSTÈME SÉCURISÉ avec validation owner
app.post('/api/wave/confirm', async (req, res) => {
  try {
    const { transactionId, waveNumber, reference, phone, plan, amount, name } = req.body;
    const crypto = require('crypto');
    
    if (!transactionId || transactionId.length < 4) {
      return res.status(400).json({ error: 'Numéro de transaction invalide' });
    }
    if (!waveNumber || waveNumber.length < 8) {
      return res.status(400).json({ error: 'Numéro Wave invalide' });
    }
    
    const planUpper = (plan || 'OR').toUpperCase();
    const requestId = crypto.randomBytes(6).toString('hex').toUpperCase();
    
    // Sauvegarder la demande EN ATTENTE de validation owner
    const pendingFile = path.join(__dirname, 'DataBase', 'pending_validations.json');
    let pending = [];
    
    if (fs.existsSync(pendingFile)) {
      try { pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8')); } catch(e) { pending = []; }
    }
    
    const request = {
      id: requestId,
      transactionId,
      waveNumber: waveNumber.replace(/[^0-9]/g, ''),
      reference: reference || 'DIRECT',
      name: name || 'Client',
      phone: (phone || '').replace(/[^0-9]/g, ''),
      plan: planUpper,
      amount: amount || { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[planUpper] || 2000,
      status: 'pending_validation',
      createdAt: new Date().toISOString()
    };
    
    pending.push(request);
    fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    
    // Logger la demande
    console.log(`\n[WAVE] 🔔 ═══════════════════════════════════════════`);
    console.log(`[WAVE] 📝 NOUVELLE DEMANDE DE PAIEMENT (EN ATTENTE)`);
    console.log(`[WAVE]    🆔 ID: ${requestId}`);
    console.log(`[WAVE]    👤 ${name || 'Client'} (${phone || waveNumber})`);
    console.log(`[WAVE]    💎 Plan: ${planUpper} - ${request.amount} FCFA`);
    console.log(`[WAVE]    📝 Transaction Wave: ${transactionId}`);
    console.log(`[WAVE]    ⚠️ EN ATTENTE DE VALIDATION OWNER`);
    console.log(`[WAVE] ═══════════════════════════════════════════\n`);
    
    // 🔔 ENVOYER NOTIFICATION À L'OWNER
    try {
      const ownerNumber = (process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
      const ownerJid = ownerNumber + '@s.whatsapp.net';
      
      if (ovl && ovl.user) {
        const notifMessage = 
          `🔔 *NOUVELLE DEMANDE DE PAIEMENT*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🆔 *ID:* \`${requestId}\`\n` +
          `👤 *Client:* ${name || 'Non renseigné'}\n` +
          `📱 *Téléphone:* ${phone || waveNumber}\n` +
          `💎 *Plan:* ${planUpper}\n` +
          `💵 *Montant:* ${request.amount} FCFA\n` +
          `📝 *N° Transaction Wave:* ${transactionId}\n\n` +
          `⏰ *Date:* ${new Date().toLocaleString('fr-FR')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ *VÉRIFIEZ dans votre historique Wave* si vous avez reçu ce paiement !\n\n` +
          `✅ Si OK: *.validatepay ${requestId}*\n` +
          `❌ Si faux: *.rejectpay ${requestId}*\n\n` +
          `📋 Voir tout: *.pendingpay*`;
        
        await ovl.sendMessage(ownerJid, { text: notifMessage });
        console.log(`[WAVE] ✅ Notification envoyée à l'owner: ${ownerNumber}`);
      } else {
        console.log(`[WAVE] ⚠️ Bot non connecté - notification sauvegardée`);
        // Sauvegarder pour envoi ultérieur
        const notifFile = path.join(__dirname, 'DataBase', 'pending_owner_notifications.json');
        let notifications = [];
        if (fs.existsSync(notifFile)) {
          try { notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8')); } catch(e) { notifications = []; }
        }
        notifications.push({
          type: 'payment_request',
          requestId,
          name: name || 'Client',
          phone: phone || waveNumber,
          plan: planUpper,
          amount: request.amount,
          transactionId: transactionId,
          createdAt: new Date().toISOString(),
          sent: false
        });
        fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
      }
    } catch (notifError) {
      console.error('[WAVE] Erreur notification owner:', notifError.message);
    }
    
    res.json({
      success: true,
      pending: true,
      requestId: requestId,
      message: 'Demande enregistrée ! Votre paiement est en cours de vérification. Vous recevrez votre code par WhatsApp une fois validé.',
      info: 'L\'owner va vérifier votre paiement dans son historique Wave. Si tout est OK, vous recevrez votre code d\'activation par WhatsApp.'
    });
  } catch (e) {
    console.error('[WAVE] Erreur confirmation:', e);
    res.status(500).json({ error: e.message });
  }
});

// Vérifier statut d'un abonné
app.get('/api/wave/status/:id', (req, res) => {
  try {
    if (!wavePayments) {
      return res.status(500).json({ error: 'Système Wave non disponible' });
    }
    
    const subscribers = wavePayments.getAllSubscribers();
    const subscriber = subscribers.find(s => 
      s.id === req.params.id || 
      s.phone === req.params.id.replace(/[^0-9]/g, '') ||
      s.paymentRef === req.params.id
    );
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Abonné non trouvé' });
    }
    
    res.json({ success: true, subscriber });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirmer paiement et générer code AUTOMATIQUEMENT
app.post('/api/wave/confirm-payment', (req, res) => {
  try {
    if (!wavePayments) {
      return res.status(500).json({ error: 'Système Wave non disponible' });
    }
    
    const { subscriberId, transactionId, waveNumber, paymentRef } = req.body;
    
    if (!subscriberId && !paymentRef) {
      return res.status(400).json({ error: 'ID abonné ou référence requis' });
    }
    if (!transactionId) {
      return res.status(400).json({ error: 'Numéro de transaction Wave requis' });
    }
    if (!waveNumber || waveNumber.length < 8) {
      return res.status(400).json({ error: 'Numéro Wave invalide' });
    }
    
    // Rechercher l'abonné
    const subscribers = wavePayments.getAllSubscribers();
    const subscriber = subscribers.find(s => 
      s.id === subscriberId || 
      s.paymentRef === paymentRef
    );
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée' });
    }
    
    if (subscriber.status === 'active' || subscriber.status === 'paid') {
      return res.json({ 
        success: true,
        activationCode: subscriber.activationCode,
        message: 'Votre code a déjà été généré'
      });
    }
    
    // Confirmer le paiement et générer le code automatiquement
    const result = wavePayments.confirmPayment(subscriber.id, `Auto-confirmé via site. TXN: ${transactionId}, Wave: ${waveNumber}`);
    
    if (result.success) {
      // Log la transaction pour l'owner
      console.log(`\n[WAVE] 💰 ═══════════════════════════════════════════`);
      console.log(`[WAVE] 💳 NOUVEAU PAIEMENT AUTO-CONFIRMÉ !`);
      console.log(`[WAVE]    📱 ${subscriber.name} (${subscriber.phone})`);
      console.log(`[WAVE]    💎 Plan: ${subscriber.plan} - ${subscriber.amount} FCFA`);
      console.log(`[WAVE]    🔑 Code: ${result.activationCode}`);
      console.log(`[WAVE]    📝 TXN Wave: ${transactionId} depuis ${waveNumber}`);
      console.log(`[WAVE] ═══════════════════════════════════════════\n`);
      
      res.json({
        success: true,
        activationCode: result.activationCode,
        message: 'Paiement confirmé ! Voici votre code d\'activation.',
        subscriber: {
          name: result.subscriber.name,
          plan: result.subscriber.plan,
          amount: result.subscriber.amount,
          expiresAt: result.subscriber.expiresAt
        }
      });
    } else {
      res.status(400).json({ error: result.error || 'Erreur lors de la confirmation' });
    }
  } catch (e) {
    console.error('[WAVE] Erreur confirmation:', e);
    res.status(500).json({ error: e.message });
  }
});

// Activer avec un code
app.post('/api/wave/activate', (req, res) => {
  try {
    if (!wavePayments) {
      return res.status(500).json({ error: 'Système Wave non disponible' });
    }
    
    const { code, whatsappJid } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code d\'activation requis' });
    }
    
    const result = wavePayments.activateWithCode(code, whatsappJid || 'web');
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 API WAVE CHECKOUT - PAIEMENT AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

// Créer une session de paiement Wave (API officielle)
app.post('/api/wave/checkout', async (req, res) => {
  try {
    if (!wavePayments) {
      return res.status(500).json({ error: 'Système Wave non disponible' });
    }
    
    const { plan, phone, name } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan requis' });
    }
    
    // Créer d'abord l'abonné
    const subscriber = wavePayments.createSubscriber(name || 'Client', phone || '', plan);
    
    if (!subscriber.success) {
      return res.status(400).json({ error: subscriber.error });
    }
    
    const amount = subscriber.subscriber.amount;
    const reference = subscriber.subscriber.paymentRef;
    
    // Créer la session Wave
    const checkoutResult = await wavePayments.createWaveCheckoutSession(amount, reference, phone);
    
    res.json({
      success: true,
      subscriber: subscriber.subscriber,
      checkout: checkoutResult
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Page de succès après paiement Wave
app.get('/payment-success', (req, res) => {
  const ref = req.query.ref || '';
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement Réussi - HANI-MD</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: white; }
    .card { background: rgba(255,255,255,0.05); border-radius: 25px; padding: 50px 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; }
    .icon { font-size: 5rem; margin-bottom: 20px; }
    h1 { color: #25D366; margin-bottom: 15px; }
    p { opacity: 0.8; margin-bottom: 25px; }
    .ref { background: rgba(37,211,102,0.15); padding: 15px; border-radius: 10px; margin-bottom: 25px; font-family: monospace; font-size: 1.1rem; }
    .btn { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #25D366, #128C7E); color: white; text-decoration: none; border-radius: 50px; font-weight: 600; }
    .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-top: 25px; text-align: left; }
    .info h3 { margin-bottom: 15px; color: #25D366; }
    .info ol { margin-left: 20px; }
    .info li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Paiement Réussi !</h1>
    <p>Votre paiement a été reçu avec succès.</p>
    ${ref ? `<div class="ref">Référence: ${ref}</div>` : ''}
    <div class="info">
      <h3>📱 Prochaines étapes</h3>
      <ol>
        <li>Vous allez recevoir un <strong>code d'activation</strong> par WhatsApp</li>
        <li>Sur WhatsApp, tapez: <code style="background:#000;padding:3px 8px;border-radius:5px;">.activer VOTRE-CODE</code></li>
        <li>Profitez de toutes les fonctionnalités premium !</li>
      </ol>
    </div>
    <a href="/" class="btn" style="margin-top: 25px;">Retour à l'accueil</a>
  </div>
</body>
</html>
  `);
});

// Page d'erreur après paiement Wave
app.get('/payment-error', (req, res) => {
  const ref = req.query.ref || '';
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur de Paiement - HANI-MD</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: white; }
    .card { background: rgba(255,255,255,0.05); border-radius: 25px; padding: 50px 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; }
    .icon { font-size: 5rem; margin-bottom: 20px; }
    h1 { color: #ef4444; margin-bottom: 15px; }
    p { opacity: 0.8; margin-bottom: 25px; }
    .btn { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #25D366, #128C7E); color: white; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 10px; }
    .btn-secondary { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Paiement Échoué</h1>
    <p>Le paiement n'a pas pu être complété. Aucun montant n'a été débité.</p>
    <div>
      <a href="/subscribe.html" class="btn">Réessayer</a>
      <a href="https://wa.me/22550252467" class="btn btn-secondary" target="_blank">Contacter le support</a>
    </div>
  </div>
</body>
</html>
  `);
});

// ═══════════════════════════════════════════════════════════
// 👤 API CLIENTS — Bot-as-a-Service (session WhatsApp par client)
// ═══════════════════════════════════════════════════════════

let clientSessions;
try {
  clientSessions = require('./DataBase/client_sessions');
  console.log('[SESSIONS] ✅ Gestionnaire multi-sessions chargé');
} catch (e) {
  console.log('[SESSIONS] ⚠️ Gestionnaire sessions non disponible:', e.message);
}

// Vérifier si un clientId est valide (a payé)
app.get('/api/clients/verify/:id', (req, res) => {
  if (!clientSessions) return res.status(503).json({ valid: false, error: 'Service indisponible' });
  try {
    const clientId = req.params.id.trim().toUpperCase();
    const info = clientSessions.verifyClient(clientId);
    // Paiement trouvé mais pas encore approuvé par l'owner
    if (!info.valid && info.pending) {
      return res.json({ valid: false, pending: true, name: info.name, plan: info.plan, error: info.error });
    }
    if (!info.valid) return res.json({ valid: false, error: 'ID client non reconnu. Vérifiez votre référence de paiement.' });

    // Vérifier si une session existe déjà
    const session = clientSessions.getSession(clientId);
    const status = session ? session.status : 'not_connected';
    const phoneNumber = session ? session.phoneNumber : null;

    res.json({
      valid: true,
      plan: info.plan,
      name: info.name,
      status: info.status === 'expired' ? 'expired' : status,
      expiresAt: info.expiresAt,
      phoneNumber
    });
  } catch (e) {
    res.status(500).json({ valid: false, error: 'Erreur serveur: ' + e.message });
  }
});

// Initier/relancer la connexion WhatsApp pour un client
app.post('/api/clients/connect/:id', async (req, res) => {
  if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
  try {
    const clientId = req.params.id.trim().toUpperCase();
    const info = clientSessions.verifyClient(clientId);
    if (!info.valid) return res.status(403).json({ error: 'ID client invalide' });
    if (info.status === 'expired') return res.status(403).json({ error: 'Abonnement expiré' });

    const session = await clientSessions.createSession(clientId, info, true);

    res.json({
      status: session.status,
      phoneNumber: session.phoneNumber,
      plan: session.plan
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur création session: ' + e.message });
  }
});

// Récupérer le QR code et le statut de connexion d'un client
app.get('/api/clients/qr/:id', (req, res) => {
  if (!clientSessions) return res.status(503).json({ status: 'error' });
  try {
    const clientId = req.params.id.trim().toUpperCase();
    const session = clientSessions.getSession(clientId);

    if (!session) return res.json({ status: 'not_connected' });

    res.json({
      status: session.status,
      qr: session.qr || null,
      phoneNumber: session.phoneNumber,
      plan: session.plan
    });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 GESTION DES PAIEMENTS EN ATTENTE (ADMIN)
// ═══════════════════════════════════════════════════════════

const PENDING_FILE = path.join(__dirname, 'DataBase', 'pending_payments.json');

function readPendingPayments() {
  try {
    if (!fs.existsSync(PENDING_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function savePendingPayments(arr) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(arr, null, 2));
}

// Lister les paiements en attente (admin)
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const payments = readPendingPayments();
  res.json({ success: true, payments });
});

// Approuver un paiement → le client peut maintenant connecter son bot
app.post('/api/admin/payments/approve/:ref', requireAdmin, async (req, res) => {
  try {
    const ref = req.params.ref.trim().toUpperCase();
    const payments = readPendingPayments();
    const idx = payments.findIndex(p =>
      p.reference === ref || p.id === ref
    );
    if (idx === -1) return res.status(404).json({ error: 'Référence non trouvée: ' + ref });

    payments[idx].status = 'approved';
    payments[idx].approvedAt = new Date().toISOString();
    savePendingPayments(payments);

    const p = payments[idx];
    console.log(`[ADMIN] ✅ Paiement approuvé: ${p.name} - ${p.plan} - Réf: ${p.reference}`);

    // Notifier le client par WhatsApp si le bot est connecté
    if (ovl && connectionStatus === 'connected' && p.phone) {
      try {
        const siteUrl = process.env.RENDER_EXTERNAL_URL
          || process.env.SITE_URL
          || 'https://hani-md.onrender.com';
        const connectLink = `${siteUrl}/connect?id=${encodeURIComponent(p.reference)}`;
        const planIcons = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
        const icon = planIcons[p.plan?.toUpperCase()] || '💎';
        const clientJid = p.phone.replace(/\D/g, '') + '@s.whatsapp.net';
        await ovl.sendMessage(clientJid, {
          text: `✅ *HANI-MD — Paiement validé !*\n\nBonjour *${p.name}* 👋\n\nVotre paiement a été confirmé par l'owner !\n${icon} Plan: *${p.plan}*\n🔑 Référence: *${p.reference}*\n\n➡️ *Connectez votre bot maintenant :*\n${connectLink}\n\n_Cliquez sur le lien, scannez le QR Code avec WhatsApp → votre bot sera actif ! 🤖_`
        });
        console.log(`[ADMIN] 📱 Notification envoyée à ${p.phone}`);
      } catch (notifErr) {
        console.error('[ADMIN] Erreur notification WA client:', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: `Paiement approuvé pour ${p.name}`,
      client: { name: p.name, phone: p.phone, plan: p.plan, reference: p.reference }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rejeter/supprimer un paiement
app.post('/api/admin/payments/reject/:ref', requireAdmin, (req, res) => {
  try {
    const ref = req.params.ref.trim().toUpperCase();
    const payments = readPendingPayments();
    const idx = payments.findIndex(p => p.reference === ref || p.id === ref);
    if (idx === -1) return res.status(404).json({ error: 'Référence non trouvée' });
    payments[idx].status = 'rejected';
    payments[idx].rejectedAt = new Date().toISOString();
    savePendingPayments(payments);
    res.json({ success: true, message: 'Paiement rejeté' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lister toutes les sessions (admin uniquement)
app.get('/api/clients/list', requireAdmin, (req, res) => {
  if (!clientSessions) return res.status(503).json({ sessions: [] });
  res.json({ sessions: clientSessions.listSessions() });
});

// Déconnecter (kick) une session client (admin uniquement)
app.post('/api/clients/kick/:id', requireAdmin, async (req, res) => {
  if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
  try {
    const clientId = req.params.id.trim().toUpperCase();
    const session = clientSessions.getSession(clientId);
    if (session) {
      session._closing = true; // Empêcher la boucle de reconnexion
      if (session.sock) {
        try { await session.sock.logout(); } catch { try { session.sock.end(undefined); } catch {} }
      }
    }
    res.json({ success: true, message: `Session ${clientId} déconnectée` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Route pour la page de connexion client
app.get('/connect', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'connect.html'));
});

// ═══════════════════════════════════════════════════════════
// 🔌 MONTER LES ROUTES ADMIN (premium-server.js)
// Les routes /api/admin/* n'existent QUE dans premium-server
// ═══════════════════════════════════════════════════════════
if (premiumApp) {
  app.use(premiumApp);
  console.log('[PREMIUM] ✅ Routes /api/admin/* montées dans le serveur principal');
}

app.listen(port, '0.0.0.0', () => {
  console.log(`🌐 Serveur web actif sur le port ${port}`);
  console.log(`📱 Site accessible: http://localhost:${port}`);
  // Afficher l'IP locale pour l'accès depuis le téléphone
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  for (const name in networkInterfaces) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`📲 Accès depuis téléphone: http://${iface.address}:${port}`);
      }
    }
  }
});

// Connecter la base de données puis lancer le bot
// Priorité : Firebase → MySQL → JSON local (fallback automatique)
(async () => {
  let dbConnected = false;

  // 1. Essayer Firebase (si FIREBASE_URL défini)
  if (process.env.FIREBASE_URL) {
    try {
      const firebaseDB = require('./DataBase/firebase_db');
      dbConnected = await firebaseDB.connect();
      if (dbConnected) {
        console.log('[DB] 🔥 Firebase connecté — données premium sauvegardées sur Firebase');
      }
    } catch (e) {
      console.log('[DB] ⚠️ Firebase non disponible:', e.message);
    }
  }

  // 2. Sinon essayer MySQL
  if (!dbConnected) {
    try {
      const mysqlDB = require('./DataBase/mysql');
      dbConnected = await mysqlDB.connect();
      if (dbConnected) {
        console.log('[DB] ✅ MySQL connecté — données premium persistées dans la base');
      } else {
        console.log('[DB] ℹ️ Aucune base de données configurée — données sauvées en JSON local');
      }
    } catch (e) {
      console.log('[DB] ⚠️ MySQL non disponible:', e.message, '— mode JSON local');
    }
  }

  // Restaurer les sessions clients existantes (Bot-as-a-Service)
  if (clientSessions) {
    clientSessions.restorePersistedSessions().catch(e =>
      console.log('[SESSIONS] Erreur restauration:', e.message)
    );
  }

  // Lancer le bot
  startBot().catch((err) => {
    console.error("❌ Erreur de démarrage:", err.message);
  });
})();

// Gérer les erreurs non capturées
process.on("uncaughtException", (err) => {
  console.log("⚠️ Erreur non capturée:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("⚠️ Promesse rejetée:", err.message);
});
