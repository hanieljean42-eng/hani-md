/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║                  🌟 HANI-MD V2.6.1 🌟                     ║
 * ║          Bot WhatsApp Intelligent & Performant            ║
 * ║                    Créé par H2025                         ║
 * ║              🔒 Version Refactorisée                      ║
 * ╚═══════════════════════════════════════════════════════════╝
 * 
 * Point d'entrée UNIQUE du bot
 * Lancer avec: node index.js
 * 
 * 📄 BUILD: 2026-01-10 - v2.6.1 - REFACTORISATION COMPLETE
 */

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// ═══════════════════════════════════════════════════════════
// 📦 MODULES INTERNES
// ═══════════════════════════════════════════════════════════

const config = require("./lib/config");
const { createConnection, connectionState, getQRDataURL } = require("./lib/connection");
const { db, initDatabase } = require("./lib/database");
const { processCommand, handleViewOnce, storeMessage, getMessageText } = require("./lib/messageHandler");
const { findCommand, executeCommand, getCommands, getCommandsByCategory } = require("./lib/ovlcmd");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// ═══════════════════════════════════════════════════════════
// 📦 CHARGEMENT DES MODULES DE COMMANDES
// ═══════════════════════════════════════════════════════════

const commandModules = [
  "./cmd/Telechargement",
  "./cmd/Outils",
  "./cmd/Fun",
  "./cmd/Groupe",
  "./cmd/Owner",
  "./cmd/Systeme",
  "./cmd/Search",
  "./cmd/Ia",
  "./cmd/Conversion",
  "./cmd/Fx_audio",
  "./cmd/Status",
  "./cmd/Image_edits",
  "./cmd/Logo",
  "./cmd/Reaction",
  "./cmd/Confidentialite",
  "./cmd/ProFeatures",
  "./cmd/Premium",
  "./cmd/Ovl-economy",
  "./cmd/Ovl-game",
  "./cmd/Advanced",
  "./cmd/Menu",
  "./cmd/Payments",
  "./cmd/WavePayments",
  "./cmd/Newsletter",
  "./cmd/Contacts",
  "./cmd/Engagement",
  "./cmd/Feedback",
  "./cmd/Referral",
  "./cmd/Support",
  "./cmd/Tutorial",
  "./cmd/Config",
  "./cmd/Autoreply"
];

let loadedModules = 0;
for (const mod of commandModules) {
  try {
    require(mod);
    loadedModules++;
  } catch (e) {
    // Ignorer silencieusement les modules non disponibles
  }
}
console.log(`[CMD] ✅ ${loadedModules}/${commandModules.length} modules de commandes chargés`);
console.log(`[CMD] 📋 ${getCommands().length} commandes disponibles`);

// ═══════════════════════════════════════════════════════════
// 🌐 SERVEUR EXPRESS
// ═══════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    bot: config.BOT_NAME,
    version: config.BOT_VERSION,
    connected: connectionState.isConnected,
    uptime: process.uptime()
  });
});

app.get('/qr', (req, res) => {
  const qrDataURL = getQRDataURL();
  if (qrDataURL) {
    res.json({ 
      success: true, 
      qr: qrDataURL,
      status: connectionState.connectionStatus
    });
  } else if (connectionState.isConnected) {
    res.json({ 
      success: true, 
      connected: true, 
      user: connectionState.botInfo?.id 
    });
  } else {
    res.json({ 
      success: false, 
      message: 'En attente de QR code...',
      status: connectionState.connectionStatus
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    connected: connectionState.isConnected,
    status: connectionState.connectionStatus,
    bot: connectionState.botInfo,
    commands: getCommands().length,
    uptime: process.uptime()
  });
});

app.get('/commands', (req, res) => {
  res.json({
    total: getCommands().length,
    categories: getCommandsByCategory()
  });
});

// Page QR pour le owner
app.get('/qr-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════════════════
// 🔌 CONNEXION WHATSAPP
// ═══════════════════════════════════════════════════════════

let sock = null;

async function startBot() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  🌟 HANI-MD V2.6.1 🌟                     ║
║          Bot WhatsApp Intelligent & Performant            ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Initialiser la base de données
  await initDatabase();
  
  // Démarrer le serveur Express
  app.listen(PORT, () => {
    console.log(`[WEB] 🌐 Serveur démarré sur le port ${PORT}`);
    console.log(`[WEB] 📱 Interface: http://localhost:${PORT}`);
  });
  
  // Connexion WhatsApp
  sock = await createConnection({
    sessionFolder: config.SESSION_DIR,
    printQRInTerminal: true,
    
    onQR: (qr) => {
      console.log("[QR] 📱 Scannez le QR code avec WhatsApp");
    },
    
    onConnected: async (socket) => {
      sock = socket;
      const botNumber = sock.user?.id?.split(":")[0];
      console.log(`[BOT] ✅ Connecté en tant que: ${botNumber}`);
      
      // Message de démarrage (optionnel)
      try {
        const startMsg = `🌟 *${config.BOT_NAME} V${config.BOT_VERSION}*\n\n` +
          `✅ Bot démarré avec succès!\n` +
          `📋 ${getCommands().length} commandes disponibles\n` +
          `⚡ Préfixe: ${config.PREFIX}\n\n` +
          `_Tapez ${config.PREFIX}menu pour voir les commandes_`;
        
        await sock.sendMessage(sock.user?.id, { text: startMsg });
      } catch (e) {}
    },
    
    onDisconnected: (error, wasLoggedOut) => {
      console.log(`[BOT] ${wasLoggedOut ? '⚠️ Déconnecté' : '❌ Erreur connexion'}`);
    },
    
    onMessage: async (socket, msgUpdate) => {
      await handleMessages(socket, msgUpdate);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// 📨 GESTION DES MESSAGES
// ═══════════════════════════════════════════════════════════

async function handleMessages(socket, msgUpdate) {
  try {
    const { messages, type } = msgUpdate;
    
    if (type !== "notify") return;
    
    for (const msg of messages) {
      // Ignorer les messages de protocole
      if (!msg.message) continue;
      if (msg.key?.remoteJid === "status@broadcast") continue;
      
      // Stocker le message
      storeMessage(msg);
      
      const from = msg.key.remoteJid;
      const sender = msg.key.participant || from;
      const isFromMe = msg.key.fromMe;
      const pushName = msg.pushName || "Utilisateur";
      const body = getMessageText(msg);
      
      // Traiter les vues uniques
      const hasViewOnce = msg.message?.viewOnceMessage || 
                          msg.message?.viewOnceMessageV2 || 
                          msg.message?.viewOnceMessageV2Extension;
      if (hasViewOnce) {
        await handleViewOnce(socket, msg);
      }
      
      // Traiter les commandes
      if (body && body.startsWith(config.PREFIX)) {
        await processCommand(socket, msg, { db });
      }
      
      // Log des messages (optionnel)
      if (!isFromMe) {
        const msgType = Object.keys(msg.message || {})[0];
        console.log(`📩 ${pushName}: ${body?.substring(0, 50) || `[${msgType}]`}`);
      }
    }
  } catch (error) {
    console.error("[MSG] ❌ Erreur traitement:", error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// 🚀 DÉMARRAGE
// ═══════════════════════════════════════════════════════════

startBot().catch(console.error);

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Erreur non capturée:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promise rejetée:', reason);
});

module.exports = { app, sock, config };
