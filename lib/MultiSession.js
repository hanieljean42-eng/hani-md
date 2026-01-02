/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║     🔗 HANI-MD - SYSTÈME MULTI-SESSION PREMIUM            ║
 * ║   Permet aux clients premium d'avoir leur propre bot      ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Dossier pour stocker les sessions des clients
const SESSIONS_DIR = path.join(__dirname, '..', 'DataBase', 'client_sessions');
const CLIENTS_FILE = path.join(__dirname, '..', 'DataBase', 'premium_clients.json');

// Créer le dossier si nécessaire
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Stockage des instances actives
const activeSessions = new Map();
const pendingQRs = new Map(); // QR codes en attente de scan

/**
 * Génère un ID client unique
 */
function generateClientId() {
  const prefix = 'CLI';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Lire/Écrire le fichier clients
 */
function readClients() {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) {
      fs.writeFileSync(CLIENTS_FILE, '{}', 'utf8');
      return {};
    }
    return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function writeClients(data) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Crée une nouvelle session pour un client premium
 */
async function createClientSession(premiumCode, plan, expiresAt) {
  const clientId = generateClientId();
  const sessionPath = path.join(SESSIONS_DIR, clientId);
  
  // Créer le dossier de session
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  // Enregistrer le client
  const clients = readClients();
  clients[clientId] = {
    clientId,
    premiumCode,
    plan: plan.toUpperCase(),
    expiresAt,
    status: 'pending', // pending, connected, disconnected, expired
    createdAt: new Date().toISOString(),
    phoneNumber: null,
    lastConnected: null,
    totalMessages: 0
  };
  writeClients(clients);
  
  console.log(`[MULTI-SESSION] 📱 Nouvelle session créée: ${clientId} (${plan})`);
  
  return {
    clientId,
    qrUrl: `/connect.html?id=${clientId}`, // URL pour scanner le QR
    status: 'pending'
  };
}

/**
 * Démarre la connexion WhatsApp pour un client
 * Retourne un QR code à scanner
 */
async function startClientConnection(clientId, onQR, onConnected, onDisconnected) {
  const clients = readClients();
  const client = clients[clientId];
  
  if (!client) {
    throw new Error('Client non trouvé');
  }
  
  // Vérifier si l'abonnement est encore valide
  if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
    client.status = 'expired';
    writeClients(clients);
    throw new Error('Abonnement expiré');
  }
  
  const sessionPath = path.join(SESSIONS_DIR, clientId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['HANI-MD Premium', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    emitOwnEvents: true,
    markOnlineOnConnect: true
  });
  
  // Gérer les événements
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log(`[MULTI-SESSION] 📱 QR généré pour ${clientId}`);
      // Convertir le QR en image base64
      try {
        const qrImage = await QRCode.toDataURL(qr);
        pendingQRs.set(clientId, qrImage);
        if (onQR) onQR(qrImage, clientId);
      } catch (e) {
        console.error(`[MULTI-SESSION] Erreur QR:`, e.message);
      }
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log(`[MULTI-SESSION] ❌ Déconnexion ${clientId}: ${lastDisconnect?.error?.message}`);
      
      // Mettre à jour le statut
      const clients = readClients();
      if (clients[clientId]) {
        clients[clientId].status = 'disconnected';
        clients[clientId].lastDisconnected = new Date().toISOString();
        writeClients(clients);
      }
      
      activeSessions.delete(clientId);
      pendingQRs.delete(clientId);
      
      if (onDisconnected) onDisconnected(clientId, shouldReconnect);
      
      // Reconnecter si pas déconnecté volontairement
      if (shouldReconnect) {
        console.log(`[MULTI-SESSION] 🔄 Tentative de reconnexion ${clientId}...`);
        setTimeout(() => {
          startClientConnection(clientId, onQR, onConnected, onDisconnected).catch(console.error);
        }, 5000);
      }
    }
    
    if (connection === 'open') {
      console.log(`[MULTI-SESSION] ✅ Client connecté: ${clientId}`);
      
      // Récupérer le numéro du client
      const phoneNumber = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0];
      
      // Mettre à jour le statut
      const clients = readClients();
      if (clients[clientId]) {
        clients[clientId].status = 'connected';
        clients[clientId].phoneNumber = phoneNumber;
        clients[clientId].lastConnected = new Date().toISOString();
        writeClients(clients);
      }
      
      // Stocker la session active
      activeSessions.set(clientId, sock);
      pendingQRs.delete(clientId);
      
      if (onConnected) onConnected(sock, clientId, phoneNumber);
      
      // Envoyer un message de bienvenue
      try {
        await sock.sendMessage(sock.user.id, {
          text: `🎉 *HANI-MD PREMIUM ACTIVÉ!*

✅ Votre bot personnel est maintenant connecté!

📱 Numéro: +${phoneNumber}
💎 Plan: ${client.plan}
⏱️ Expire: ${client.expiresAt ? new Date(client.expiresAt).toLocaleDateString('fr-FR') : 'À VIE'}

Tapez *.menu* pour voir les commandes disponibles.

━━━━━━━━━━━━━━━━━━━━━
💡 Ce bot est personnel - il fonctionne sur VOTRE WhatsApp!`
        });
      } catch (e) {
        console.error(`[MULTI-SESSION] Erreur message bienvenue:`, e.message);
      }
    }
  });
  
  // Charger les événements du bot pour ce client
  loadClientEvents(sock, clientId, client.plan);
  
  return sock;
}

/**
 * Charge les événements/commandes pour un client selon son plan
 */
function loadClientEvents(sock, clientId, plan) {
  const evt = require('./ovlcmd');
  const premium = require('../DataBase/premium');
  const config = require('../set');
  
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const msg = messages[0];
    if (!msg?.message) return;
    
    // Ignorer les messages de groupe pour l'instant
    const from = msg.key.remoteJid;
    if (from.endsWith('@g.us')) return;
    
    // Extraire le texte
    const body = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 '';
    
    if (!body.startsWith(config.PREFIXE || '.')) return;
    
    const [cmd, ...args] = body.slice(1).trim().split(/\s+/);
    const command = cmd.toLowerCase();
    
    // Trouver la commande
    const cmdInfo = evt.cmd.find(c => c.nom_cmd === command || c.alias?.includes(command));
    
    if (!cmdInfo) return;
    
    // Vérifier si la commande est autorisée pour ce plan
    const allowedCommands = premium.PREMIUM_COMMANDS[plan] || premium.PREMIUM_COMMANDS.free;
    const allAllowed = [...premium.PREMIUM_COMMANDS.free];
    
    // Ajouter les commandes selon le plan
    if (['bronze', 'argent', 'or', 'diamant', 'lifetime'].includes(plan)) {
      allAllowed.push(...premium.PREMIUM_COMMANDS.bronze);
    }
    if (['argent', 'or', 'diamant', 'lifetime'].includes(plan)) {
      allAllowed.push(...premium.PREMIUM_COMMANDS.argent);
    }
    if (['or', 'diamant', 'lifetime'].includes(plan)) {
      allAllowed.push(...premium.PREMIUM_COMMANDS.or);
    }
    if (['diamant', 'lifetime'].includes(plan)) {
      allAllowed.push(...premium.PREMIUM_COMMANDS.diamant);
    }
    
    // Vérifier l'accès
    if (!allAllowed.includes(command) && plan !== 'lifetime' && plan !== 'diamant') {
      await sock.sendMessage(from, {
        text: `❌ Cette commande n'est pas disponible dans votre plan *${plan}*.\n\nPassez à un plan supérieur pour y accéder!`
      });
      return;
    }
    
    // Exécuter la commande
    try {
      await sock.sendMessage(from, { react: { text: cmdInfo.react || '🎐', key: msg.key } });
      
      const ms = {
        key: msg.key,
        message: msg.message,
        pushName: msg.pushName || 'Client',
        from,
        body,
        args: args.join(' '),
        arg: args
      };
      
      const context = {
        repondre: async (text) => await sock.sendMessage(from, { text }),
        envoyerMessage: async (jid, content) => await sock.sendMessage(jid, content),
        auteurMessage: from,
        arg: args,
        ms,
        superUser: false, // Les clients ne sont pas super users
        verifMention: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      };
      
      await cmdInfo.fonction(from, sock, context);
    } catch (e) {
      console.error(`[MULTI-SESSION] Erreur commande ${command}:`, e.message);
      await sock.sendMessage(from, { text: `❌ Erreur: ${e.message}` });
    }
  });
}

/**
 * Arrête une session client
 */
async function stopClientSession(clientId) {
  const sock = activeSessions.get(clientId);
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // Ignorer
    }
    activeSessions.delete(clientId);
  }
  pendingQRs.delete(clientId);
  
  // Mettre à jour le statut
  const clients = readClients();
  if (clients[clientId]) {
    clients[clientId].status = 'disconnected';
    writeClients(clients);
  }
  
  console.log(`[MULTI-SESSION] 🛑 Session arrêtée: ${clientId}`);
}

/**
 * Supprime complètement une session client
 */
async function deleteClientSession(clientId) {
  await stopClientSession(clientId);
  
  // Supprimer les fichiers de session
  const sessionPath = path.join(SESSIONS_DIR, clientId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
  
  // Retirer du fichier clients
  const clients = readClients();
  delete clients[clientId];
  writeClients(clients);
  
  console.log(`[MULTI-SESSION] 🗑️ Session supprimée: ${clientId}`);
}

/**
 * Obtient le QR code en attente pour un client
 */
function getPendingQR(clientId) {
  return pendingQRs.get(clientId) || null;
}

/**
 * Obtient les infos d'un client
 */
function getClientInfo(clientId) {
  const clients = readClients();
  return clients[clientId] || null;
}

/**
 * Liste tous les clients
 */
function listAllClients() {
  return readClients();
}

/**
 * Obtient tous les clients sous forme de tableau
 */
function getAllClients() {
  const clients = readClients();
  return Object.values(clients);
}

/**
 * Active un client après paiement confirmé
 */
function activateClient(clientJidOrPhone, plan, durationDays) {
  const phone = clientJidOrPhone.replace(/@s\.whatsapp\.net/g, '').replace(/[^0-9]/g, '');
  const clients = readClients();
  
  // Chercher si le client existe déjà
  let existingClientId = null;
  for (const [id, client] of Object.entries(clients)) {
    if (client.phoneNumber && client.phoneNumber.replace(/[^0-9]/g, '') === phone) {
      existingClientId = id;
      break;
    }
  }
  
  const expiresAt = durationDays > 0 
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null; // null = lifetime
  
  if (existingClientId) {
    // Mettre à jour le client existant
    clients[existingClientId].plan = plan.toUpperCase();
    clients[existingClientId].expiresAt = expiresAt;
    clients[existingClientId].status = clients[existingClientId].status === 'connected' ? 'connected' : 'active';
    clients[existingClientId].lastRenewed = new Date().toISOString();
    writeClients(clients);
    
    console.log(`[MULTI-SESSION] 🔄 Client renouvelé: ${existingClientId} (${plan})`);
    return { success: true, clientId: existingClientId, renewed: true };
  }
  
  // Créer un nouveau client
  const clientId = generateClientId();
  const sessionPath = path.join(SESSIONS_DIR, clientId);
  
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  clients[clientId] = {
    clientId,
    phoneNumber: phone,
    plan: plan.toUpperCase(),
    expiresAt,
    status: 'active', // Prêt à se connecter
    createdAt: new Date().toISOString(),
    lastConnected: null,
    totalMessages: 0,
    activatedViaPayment: true
  };
  writeClients(clients);
  
  console.log(`[MULTI-SESSION] 💳 Client activé via paiement: ${clientId} (${plan})`);
  return { success: true, clientId, renewed: false };
}

/**
 * Obtient les clients actifs
 */
function getActiveClients() {
  return Array.from(activeSessions.keys());
}

/**
 * Démarre toutes les sessions actives au boot
 */
async function startAllActiveSessions() {
  const clients = readClients();
  let started = 0;
  
  for (const [clientId, client] of Object.entries(clients)) {
    // Ne démarrer que les sessions connectées et non expirées
    if (client.status === 'connected' || client.status === 'disconnected') {
      // Vérifier expiration
      if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
        client.status = 'expired';
        writeClients(clients);
        continue;
      }
      
      try {
        await startClientConnection(clientId, null, null, null);
        started++;
        console.log(`[MULTI-SESSION] ✅ Session restaurée: ${clientId}`);
      } catch (e) {
        console.error(`[MULTI-SESSION] ❌ Erreur restauration ${clientId}:`, e.message);
      }
    }
  }
  
  console.log(`[MULTI-SESSION] 🔄 ${started} session(s) restaurée(s)`);
  return started;
}

module.exports = {
  createClientSession,
  startClientConnection,
  stopClientSession,
  deleteClientSession,
  getPendingQR,
  getClientInfo,
  listAllClients,
  getAllClients,
  activateClient,
  getActiveClients,
  startAllActiveSessions,
  activeSessions,
  pendingQRs
};
