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
// 💳 ROUTES API PAIEMENT WAVE
// ═══════════════════════════════════════════════════════════

const crypto = require('crypto');
const OWNER_NUMBER = (process.env.NUMERO_OWNER || '2250150252467').replace(/[^0-9]/g, '');
const OWNER_JID = OWNER_NUMBER + '@s.whatsapp.net';

// Souscription Wave
app.post('/api/wave/subscribe', (req, res) => {
  try {
    const { name, phone, plan, reference } = req.body;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const planUpper = (plan || 'OR').toUpperCase();
    const ref = reference || `HANI-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    
    // Sauvegarder la demande
    const subscribersFile = path.join(__dirname, 'DataBase', 'subscribers.json');
    let subscribers = { subscribers: [] };
    if (fs.existsSync(subscribersFile)) {
      try { subscribers = JSON.parse(fs.readFileSync(subscribersFile, 'utf8')); } catch(e) {}
    }
    
    subscribers.subscribers.push({
      name: name || 'Client',
      phone: cleanPhone,
      plan: planUpper,
      reference: ref,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
    
    res.json({ success: true, reference: ref, message: 'Demande enregistrée' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirmation du paiement - SYSTÈME SÉCURISÉ avec notification owner
app.post('/api/wave/confirm', async (req, res) => {
  try {
    const { transactionId, waveNumber, reference, phone, plan, amount, name } = req.body;
    
    if (!transactionId || transactionId.length < 4) {
      return res.status(400).json({ error: 'Numéro de transaction invalide' });
    }
    if (!waveNumber || waveNumber.length < 8) {
      return res.status(400).json({ error: 'Numéro Wave invalide' });
    }
    
    const planUpper = (plan || 'OR').toUpperCase();
    const requestId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const planPrices = { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 };
    
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
      amount: amount || planPrices[planUpper] || 2000,
      status: 'pending_validation',
      createdAt: new Date().toISOString()
    };
    
    pending.push(request);
    fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    
    // Logger
    console.log(`\n[WAVE] 🔔 ═══════════════════════════════════════════`);
    console.log(`[WAVE] 📝 NOUVELLE DEMANDE DE PAIEMENT (EN ATTENTE)`);
    console.log(`[WAVE]    🆔 ID: ${requestId}`);
    console.log(`[WAVE]    👤 ${name || 'Client'} (${phone || waveNumber})`);
    console.log(`[WAVE]    💎 Plan: ${planUpper} - ${request.amount} FCFA`);
    console.log(`[WAVE]    📝 Transaction Wave: ${transactionId}`);
    console.log(`[WAVE]    ⚠️ EN ATTENTE DE VALIDATION OWNER`);
    console.log(`[WAVE] ═══════════════════════════════════════════\n`);
    
    // 🔔 ENVOYER NOTIFICATION À L'OWNER VIA WHATSAPP
    try {
      if (sock && sock.user) {
        const notifMessage = 
          `🔔 *NOUVELLE DEMANDE DE PAIEMENT*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🆔 *ID:* \`${requestId}\`\n` +
          `👤 *Client:* ${name || 'Non renseigné'}\n` +
          `📱 *Téléphone:* ${phone || waveNumber}\n` +
          `📱 *Wave:* ${waveNumber}\n` +
          `💎 *Plan:* ${planUpper}\n` +
          `💵 *Montant:* ${request.amount} FCFA\n` +
          `📝 *N° Transaction Wave:* ${transactionId}\n\n` +
          `⏰ *Date:* ${new Date().toLocaleString('fr-FR')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ *VÉRIFIEZ dans votre historique Wave* si vous avez reçu ce paiement !\n\n` +
          `✅ Si OK: *.validatepay ${requestId}*\n` +
          `❌ Si faux: *.rejectpay ${requestId}*\n\n` +
          `📋 Voir tout: *.pendingpay*`;
        
        await sock.sendMessage(OWNER_JID, { text: notifMessage });
        console.log(`[WAVE] ✅ Notification envoyée à l'owner: ${OWNER_NUMBER}`);
      } else {
        console.log(`[WAVE] ⚠️ Bot non connecté - notification sauvegardée pour envoi ultérieur`);
        // Sauvegarder pour envoi ultérieur
        const notifFile = path.join(__dirname, 'DataBase', 'pending_owner_notifications.json');
        let notifications = [];
        if (fs.existsSync(notifFile)) {
          try { notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8')); } catch(e) { notifications = []; }
        }
        notifications.push({
          type: 'payment_request',
          requestId,
          ownerJid: OWNER_JID,
          name: name || 'Client',
          phone: phone || waveNumber,
          waveNumber,
          plan: planUpper,
          amount: request.amount,
          transactionId,
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
      requestId,
      message: 'Demande enregistrée ! Votre paiement est en cours de vérification. Vous recevrez votre code par WhatsApp une fois validé.'
    });
  } catch (e) {
    console.error('[WAVE] Erreur confirmation:', e);
    res.status(500).json({ error: e.message });
  }
});

// Statut d'un paiement
app.get('/api/wave/status/:id', (req, res) => {
  try {
    const pendingFile = path.join(__dirname, 'DataBase', 'pending_validations.json');
    let pending = [];
    if (fs.existsSync(pendingFile)) {
      pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    }
    
    const request = pending.find(p => p.id === req.params.id);
    if (request) {
      return res.json({ success: true, status: request.status, request });
    }
    
    res.status(404).json({ error: 'Demande non trouvée' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔗 ROUTES API MULTI-SESSION CLIENT
// ═══════════════════════════════════════════════════════════

const MultiSession = require('./lib/MultiSession');

// Page de connexion client
app.get('/connect', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'connect.html'));
});

// Récupérer infos client par ID
app.get('/api/client/:clientId', (req, res) => {
  try {
    const client = MultiSession.getClientInfo(req.params.clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client non trouvé' });
    }
    
    // Vérifier expiration
    if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
      return res.status(403).json({ success: false, error: 'Abonnement expiré' });
    }
    
    res.json({ success: true, client });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Récupérer infos client par code d'activation
app.get('/api/client/code/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    // Chercher le code
    const codesFile = path.join(__dirname, 'DataBase', 'activation_codes.json');
    let codes = {};
    if (fs.existsSync(codesFile)) {
      codes = JSON.parse(fs.readFileSync(codesFile, 'utf8') || '{}');
    }
    
    if (!codes[code]) {
      return res.status(404).json({ success: false, error: 'Code invalide' });
    }
    
    const codeData = codes[code];
    
    // Créer/récupérer session client
    let clientId = codeData.clientId;
    
    if (!clientId) {
      // Créer une nouvelle session
      const result = await MultiSession.createClientSession(code, codeData.plan, codeData.expiresAt);
      clientId = result.clientId;
      
      // Sauvegarder le clientId dans le code
      codeData.clientId = clientId;
      codes[code] = codeData;
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
    }
    
    const client = MultiSession.getClientInfo(clientId);
    res.json({ success: true, client, code: codeData });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Obtenir QR code pour un client
app.get('/api/client/:clientId/qr', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = MultiSession.getClientInfo(clientId);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client non trouvé' });
    }
    
    // Vérifier si déjà connecté
    if (client.status === 'connected') {
      return res.json({ success: true, connected: true, phoneNumber: client.phoneNumber });
    }
    
    // Récupérer QR en attente
    let qr = MultiSession.getPendingQR(clientId);
    
    // Si pas de QR, démarrer la connexion
    if (!qr && client.status !== 'connected') {
      try {
        await MultiSession.startClientConnection(
          clientId,
          (qrImage, id) => console.log(`[CLIENT] QR généré pour ${id}`),
          (socket, id, phone) => console.log(`[CLIENT] ✅ ${id} connecté: ${phone}`),
          (id, retry) => console.log(`[CLIENT] ❌ ${id} déconnecté`)
        );
        
        // Attendre un peu que le QR soit généré
        await new Promise(r => setTimeout(r, 2000));
        qr = MultiSession.getPendingQR(clientId);
      } catch (e) {
        console.log(`[CLIENT] Erreur démarrage: ${e.message}`);
      }
    }
    
    if (qr) {
      return res.json({ success: true, qr, status: client.status });
    }
    
    res.json({ success: true, qr: null, status: client.status, message: 'Génération du QR...' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// QR par code d'activation
app.get('/api/client/code/:code/qr', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    const codesFile = path.join(__dirname, 'DataBase', 'activation_codes.json');
    let codes = {};
    if (fs.existsSync(codesFile)) {
      codes = JSON.parse(fs.readFileSync(codesFile, 'utf8') || '{}');
    }
    
    if (!codes[code] || !codes[code].clientId) {
      return res.status(404).json({ success: false, error: 'Code invalide ou non initialisé' });
    }
    
    // Rediriger vers l'endpoint par clientId
    const clientId = codes[code].clientId;
    const client = MultiSession.getClientInfo(clientId);
    
    if (client?.status === 'connected') {
      return res.json({ success: true, connected: true, phoneNumber: client.phoneNumber });
    }
    
    const qr = MultiSession.getPendingQR(clientId);
    res.json({ success: true, qr, status: client?.status });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Liste des clients (owner only - protégé par header)
app.get('/api/clients', (req, res) => {
  const authKey = req.headers['x-owner-key'] || req.query.key;
  if (authKey !== process.env.OWNER_API_KEY && authKey !== 'hani-owner-2026') {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  
  try {
    const clients = MultiSession.getAllClients();
    res.json({ success: true, total: clients.length, clients });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
      
      // 🔔 ENVOYER LES NOTIFICATIONS EN ATTENTE À L'OWNER
      try {
        const notifFile = path.join(__dirname, 'DataBase', 'pending_owner_notifications.json');
        if (fs.existsSync(notifFile)) {
          let notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8') || '[]');
          const unsent = notifications.filter(n => !n.sent);
          
          if (unsent.length > 0) {
            console.log(`[WAVE] 📨 Envoi de ${unsent.length} notification(s) en attente...`);
            
            for (const notif of unsent) {
              try {
                const notifMessage = 
                  `🔔 *PAIEMENT EN ATTENTE* (différé)\n` +
                  `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `🆔 *ID:* \`${notif.requestId}\`\n` +
                  `👤 *Client:* ${notif.name}\n` +
                  `📱 *Téléphone:* ${notif.phone}\n` +
                  `📱 *Wave:* ${notif.waveNumber || notif.phone}\n` +
                  `💎 *Plan:* ${notif.plan}\n` +
                  `💵 *Montant:* ${notif.amount} FCFA\n` +
                  `📝 *Transaction:* ${notif.transactionId}\n` +
                  `⏰ *Date:* ${new Date(notif.createdAt).toLocaleString('fr-FR')}\n\n` +
                  `✅ *.validatepay ${notif.requestId}*\n` +
                  `❌ *.rejectpay ${notif.requestId}*`;
                
                await sock.sendMessage(OWNER_JID, { text: notifMessage });
                notif.sent = true;
                console.log(`[WAVE] ✅ Notification ${notif.requestId} envoyée`);
                
                // Petit délai entre les messages
                await new Promise(r => setTimeout(r, 1000));
              } catch (e) {
                console.log(`[WAVE] ❌ Erreur envoi notification: ${e.message}`);
              }
            }
            
            // Mettre à jour le fichier
            fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
          }
        }
        
        // Vérifier les paiements en attente
        const pendingFile = path.join(__dirname, 'DataBase', 'pending_validations.json');
        if (fs.existsSync(pendingFile)) {
          const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
          const awaiting = pending.filter(p => p.status === 'pending_validation');
          
          if (awaiting.length > 0) {
            const resumeMsg = `📋 *${awaiting.length} PAIEMENT(S) EN ATTENTE*\n\n` +
              `Tapez *.pendingpay* pour les voir et valider.`;
            await sock.sendMessage(OWNER_JID, { text: resumeMsg });
          }
        }
      } catch (e) {
        console.log(`[WAVE] ⚠️ Erreur notifications différées: ${e.message}`);
      }
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
