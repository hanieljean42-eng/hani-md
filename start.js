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
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");

// Charger la configuration
require("dotenv").config({ override: true });

const config = {
  PREFIXE: process.env.PREFIXE || ".",
  NOM_OWNER: process.env.NOM_OWNER || "Owner",
  NUMERO_OWNER: process.env.NUMERO_OWNER || "",
  MODE: process.env.MODE || "public",
  STICKER_PACK_NAME: process.env.STICKER_PACK_NAME || "OVL-MD-V2",
  STICKER_AUTHOR_NAME: process.env.STICKER_AUTHOR_NAME || "OVL",
};

// Dossier de session
const SESSION_FOLDER = "./DataBase/session/principale";

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

// Stockage des messages à vue unique interceptés
const viewOnceMessages = new Map();

// Réponses basiques et lisibles (bypass du code obfusqué)
async function handleCommand(ovl, msg) {
  const from = msg.key.remoteJid;
  const body = getMessageText(msg);
  if (!body || !body.startsWith(config.PREFIXE)) return;

  const [cmd, ...rest] = body.slice(config.PREFIXE.length).trim().split(/\s+/);
  const command = (cmd || "").toLowerCase();
  const args = rest.join(" ");

  // Numéro du bot (pour envoyer en privé)
  const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
  
  // Fonction pour répondre en privé (à soi-même)
  const sendPrivate = (text) => ovl.sendMessage(botNumber, { text });
  
  // Fonction pour répondre dans le chat actuel
  const sendHere = (text) => ovl.sendMessage(from, { text });

  const toggle = (key) => {
    protectionState[key] = !protectionState[key];
    return protectionState[key];
  };

  // Par défaut, répondre en privé sauf si on est déjà dans notre propre chat
  const isOwnChat = from === botNumber;
  const send = isOwnChat ? sendHere : sendPrivate;

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
    const isOwner = AccessControl ? AccessControl.isOwner(jid) : (phone === '2250150252467');
    
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
          const userInfo = await getUserInfo(from);
          const category = args[0] ? args[0].toLowerCase() : null;
          
          let menuText;
          if (category && MenuSystem.CATEGORIES[category]) {
            menuText = MenuSystem.generateCategoryMenu(category, userInfo);
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
    case "vo": {
      // Récupérer le message auquel on répond
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg) {
        return send("❌ Réponds à un message à vue unique pour le récupérer.");
      }
      
      // Vérifier si c'est un message à vue unique
      const viewOnceMsg = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;
      if (!viewOnceMsg) {
        return send("❌ Ce message n'est pas un message à vue unique.");
      }
      
      try {
        const mediaMsg = viewOnceMsg.message;
        const mediaType = Object.keys(mediaMsg)[0];
        const media = mediaMsg[mediaType];
        
        // Télécharger le média
        const stream = await downloadMediaMessage(
          { message: mediaMsg, key: msg.key },
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
          return send("❌ Type de média non supporté.");
        }
        
        console.log(`👁️ Vue unique récupérée pour ${from} (envoyée en privé)`);
      } catch (e) {
        console.log("⚠️ Erreur viewonce:", e.message);
        return send("❌ Impossible de récupérer ce média à vue unique.");
      }
      return;
    }
    
    case "listvv":
    case "listviewonce": {
      if (viewOnceMessages.size === 0) {
        return send("📭 Aucun message à vue unique intercepté récemment.");
      }
      
      let list = "👁️ *Messages à vue unique interceptés :*\n\n";
      let i = 1;
      for (const [id, data] of viewOnceMessages) {
        list += `${i}. De: ${data.sender}\n   Type: ${data.type}\n   Date: ${data.date}\n\n`;
        i++;
      }
      return send(list);
    }
    
    case "antilink":
    case "antispam":
    case "antibot":
    case "anticall":
    case "antitag":
    case "antidelete": {
      const key = command;
      const param = args.toLowerCase();
      if (param === "on") protectionState[key] = true;
      else if (param === "off") protectionState[key] = false;
      else protectionState[key] = toggle(key);
      return send(`🛡️ ${key} ${protectionState[key] ? "activé" : "désactivé"}.`);
    }
    default:
      return send(`❓ Commande inconnue : ${config.PREFIXE}${command}`);
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

      // On ne charge plus les modules obfusqués pour éviter les erreurs (ex: sharp).
      console.log(
        "ℹ️ Modules obfusqués ignorés. Utilise les commandes simples intégrées (ping, menu, info, protections).",
      );
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || "Inconnue";

      console.log(`\n⚠️ Connexion fermée (code: ${statusCode}, raison: ${reason})`);

      // Reconnexion immédiate pour tous les cas sauf loggedOut explicite
      if (statusCode === DisconnectReason.loggedOut) {
        // Déconnexion manuelle - supprimer la session et redemander un QR
        console.log("❌ Déconnexion manuelle détectée depuis WhatsApp.");
        console.log("🔄 Suppression de la session et nouveau QR dans 3 secondes...");
        
        // Supprimer la session
        if (fs.existsSync(SESSION_FOLDER)) {
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
        }
        
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
        // Autres erreurs - reconnexion standard
        console.log("🔄 Reconnexion dans 2 secondes...");
        await delay(2000);
        startBot();
      }
    }
  });

  // Sauvegarder les credentials
  ovl.ev.on("creds.update", saveCreds);

  // Gérer les messages avec le handler lisible ci-dessus
  ovl.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;
      
      // Intercepter les messages à vue unique automatiquement
      const viewOnceContent = msg.message.viewOnceMessage || msg.message.viewOnceMessageV2 || msg.message.viewOnceMessageV2Extension;
      if (viewOnceContent && !msg.key.fromMe) {
        const sender = msg.key.remoteJid;
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0] || "inconnu";
        
        // Stocker le message à vue unique
        viewOnceMessages.set(msg.key.id, {
          sender: sender,
          type: mediaType.replace("Message", ""),
          date: new Date().toLocaleString("fr-FR"),
          message: msg
        });
        
        // Garder seulement les 20 derniers
        if (viewOnceMessages.size > 20) {
          const firstKey = viewOnceMessages.keys().next().value;
          viewOnceMessages.delete(firstKey);
        }
        
        console.log(`👁️ Vue unique interceptée de ${sender} (${mediaType})`);
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

// Servir les fichiers statiques (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

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
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const fs = require('fs');
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
  const subscribePath = path.join(__dirname, 'public', 'subscribe.html');
  const fs = require('fs');
  if (fs.existsSync(subscribePath)) {
    res.sendFile(subscribePath);
  } else {
    res.redirect('/');
  }
});

// Route pour la page de paiements (admin)
app.get("/payments.html", (req, res) => {
  const paymentsPath = path.join(__dirname, 'public', 'payments.html');
  const fs = require('fs');
  if (fs.existsSync(paymentsPath)) {
    res.sendFile(paymentsPath);
  } else {
    res.redirect('/');
  }
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

// Lancer le bot
startBot().catch((err) => {
  console.error("❌ Erreur de démarrage:", err.message);
});

// Gérer les erreurs non capturées
process.on("uncaughtException", (err) => {
  console.log("⚠️ Erreur non capturée:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("⚠️ Promesse rejetée:", err.message);
});
