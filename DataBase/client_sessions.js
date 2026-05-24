/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║     HANI-MD - Gestionnaire de Sessions Multi-Clients     ║
 * ║     Chaque client connecte son propre WhatsApp via QR    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const fs   = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

// Dossier de stockage des sessions clients
const SESSIONS_DIR = path.join(__dirname, 'client_sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Fichiers de vérification des paiements
const PENDING_FILE     = path.join(__dirname, 'pending_payments.json');
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const CODES_FILE       = path.join(__dirname, 'activation_codes.json');

// Map en mémoire : clientId → sessionData
const sessions = new Map();

// Gestionnaire de commandes par plan
let clientHandler;
try {
  clientHandler = require('./client_handler');
} catch (e) {
  console.error('[SESSIONS] client_handler non disponible:', e.message);
}

// ═══════════════════════════════════════════════════
// 📋 VÉRIFICATION CLIENT
// ═══════════════════════════════════════════════════

function readJSON(file, def = {}) {
  try {
    if (!fs.existsSync(file)) return def;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return def; }
}

/**
 * Vérifie si un clientId correspond à un paiement valide.
 * Le clientId est la référence de paiement (ex: HANI-AB12CD)
 * ou un ID d'abonné.
 */
function verifyClient(clientId) {
  const id = clientId.trim().toUpperCase();

  // 1. Chercher dans les paiements en attente
  const pending = readJSON(PENDING_FILE, []);
  const pendingArr = Array.isArray(pending) ? pending : (pending.requests || []);
  const pendingEntry = pendingArr.find(
    p => p.reference === id || p.id === id || p.paymentRef === id
  );
  if (pendingEntry) {
    // ✅ SÉCURITÉ : seuls les paiements APPROUVÉS peuvent connecter le bot
    if (pendingEntry.status !== 'approved') {
      return {
        valid: false,
        pending: true,
        name: pendingEntry.name || 'Client',
        plan: pendingEntry.plan || 'OR',
        status: pendingEntry.status || 'pending',
        error: 'Paiement en attente de validation. L\'owner va confirmer votre paiement sous 30 min.'
      };
    }
    return {
      valid: true,
      plan: pendingEntry.plan || 'OR',
      name: pendingEntry.name || 'Client',
      phone: pendingEntry.phone || null,
      status: 'approved',
      expiresAt: null
    };
  }

  // 2. Chercher dans les abonnés actifs
  const subData = readJSON(SUBSCRIBERS_FILE, { subscribers: [] });
  const subs = Array.isArray(subData) ? subData : (subData.subscribers || []);
  const sub = subs.find(
    s => s.id === id || s.paymentRef === id || s.reference === id
  );
  if (sub) {
    const expired = sub.expiresAt && new Date(sub.expiresAt) < new Date();
    return {
      valid: true,
      plan: sub.plan || 'OR',
      name: sub.name || 'Client',
      phone: sub.phone || null,
      status: expired ? 'expired' : (sub.status || 'active'),
      expiresAt: sub.expiresAt || null
    };
  }

  // 3. Chercher dans les codes d'activation
  const codes = readJSON(CODES_FILE, {});
  const codeArr = Array.isArray(codes) ? codes : (codes.codes || []);
  const codeEntry = codeArr.find(c => c.subscriberId === id || c.code === id);
  if (codeEntry) {
    return {
      valid: true,
      plan: codeEntry.plan || 'OR',
      name: codeEntry.subscriberName || 'Client',
      phone: codeEntry.subscriberPhone || null,
      status: 'active',
      expiresAt: null
    };
  }

  return { valid: false };
}

// ═══════════════════════════════════════════════════
// 🔌 GESTION DES SESSIONS WHATSAPP
// ═══════════════════════════════════════════════════

/**
 * Crée ou récupère une session WhatsApp pour un client.
 * Retourne la sessionData.
 */
const MAX_CONCURRENT_SESSIONS = 3; // Limite pour ne pas surcharger le serveur

async function createSession(clientId, clientInfo, forceNewQR = false) {
  const id = clientId.toUpperCase();

  // Vérifier la limite de sessions actives (hors celle qu'on recrée)
  const activeSessions = [...sessions.values()].filter(
    s => s.status === 'connected' || s.status === 'qr_ready' || s.status === 'initializing'
  );
  if (!sessions.has(id) && activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    throw new Error(`Limite atteinte (${MAX_CONCURRENT_SESSIONS} sessions max). Réessayez plus tard.`);
  }

  // Si session déjà active en mémoire
  if (sessions.has(id)) {
    const existing = sessions.get(id);
    if (existing.status === 'connected') return existing;
    if (existing.status === 'qr_ready' && !forceNewQR) return existing;
    // Si initialisation récente (< 60s) et pas de force, attendre le QR
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (existing.status === 'initializing' && age < 60000 && !forceNewQR) {
      return existing;
    }
    // Fermer l'ancien socket avant de recréer
    if (existing.sock) {
      existing._closing = true;
      try { existing.sock.end(undefined); } catch {}
    }
    sessions.delete(id);
    console.log(`[SESSIONS] 🔄 Recréation session: ${id}`);
  }

  const sessionDir = path.join(SESSIONS_DIR, id);

  // ✅ Supprimer les fichiers de session existants pour forcer un nouveau QR
  // (empêche Baileys de tenter une reconnexion silencieuse avec des creds périmés)
  if (forceNewQR && fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[SESSIONS] 🗑️ Ancien dossier session supprimé → nouveau QR: ${id}`);
    } catch (e) {
      console.error(`[SESSIONS] Erreur suppression session dir:`, e.message);
    }
  }

  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Récupérer la dernière version Baileys acceptée par WhatsApp
  let waVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    waVersion = version;
    console.log(`[SESSIONS] 🔌 [${id}] Baileys version: ${version.join('.')}`);
  } catch (e) {
    waVersion = [2, 3000, 1020394028];
    console.log(`[SESSIONS] ⚠️ [${id}] Version fallback: ${waVersion.join('.')}`);
  }

  const logger = pino({ level: 'silent' }).child({ level: 'silent' });

  const sock = makeWASocket({
    version: waVersion,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: Browsers.ubuntu('Chrome'),
    keepAliveIntervalMs: 15000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 2000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    printQRInTerminal: false,
    getMessage: async () => ({ conversation: '' })
  });

  const sessionData = {
    sock,
    qr: null,
    pairingCode: null,
    status: 'initializing',
    phoneNumber: null,
    plan: clientInfo?.plan || 'OR',
    name: clientInfo?.name || 'Client',
    createdAt: new Date().toISOString(),
    connectedAt: null,
    _closing: false   // Prevents reconnect loop when closing intentionally
  };

  sessions.set(id, sessionData);

  // Timeout: si pas de QR après 70s (> connectTimeoutMs:60s), marquer comme failed
  // Utilise sockRef pour éviter la race condition avec une nouvelle session créée entre-temps
  const sockRef = sock;
  setTimeout(() => {
    const s = sessions.get(id);
    if (s && s.sock === sockRef && (s.status === 'initializing' || s.status === 'reconnecting')) {
      s._closing = true;
      s.status = 'failed';
      console.log(`[SESSIONS] ⏰ Timeout 70s: ${id} — QR non reçu`);
      try { sockRef.end(undefined); } catch {}
    }
  }, 70000);

  // ── Événements de connexion ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Logging détaillé pour diagnostic
    console.log(`[SESSIONS] 📡 [${id}] connection=${connection || '-'} | qr=${!!qr} | code=${lastDisconnect?.error?.output?.statusCode || '-'} | msg=${(lastDisconnect?.error?.message || '').slice(0,80)}`);

    if (qr) {
      try {
        sessionData.qr     = await QRCode.toDataURL(qr, { margin: 2, width: 300 });
        sessionData.status = 'qr_ready';
        sessionData._closing = false;
        console.log(`[SESSIONS] ✅ QR prêt: ${id}`);
      } catch (e) {
        console.error('[SESSIONS] ❌ Erreur QRCode.toDataURL:', e.message);
      }
    }

    if (connection === 'open') {
      sessionData.status      = 'connected';
      sessionData.qr          = null;
      sessionData.phoneNumber = sock.user?.id?.split(':')[0] || null;
      sessionData.connectedAt = new Date().toISOString();
      console.log(`[SESSIONS] ✅ Connecté: ${id} → ${sessionData.phoneNumber}`);
      if (clientHandler) {
        clientHandler.attachMessageHandler(sock, id, sessionData.plan);
      }
    }

    if (connection === 'close') {
      const errMsg     = lastDisconnect?.error?.message || 'unknown';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`[SESSIONS] 🔌 Fermé: ${id} | code=${statusCode} | msg=${errMsg}`);

      // Fermeture intentionnelle (timer 70s ou kick admin)
      if (sessionData._closing) {
        console.log(`[SESSIONS] 🔴 Arrêt intentionnel: ${id}`);
        return;
      }

      // Déconnexion définitive : supprimer la session
      if (statusCode === DisconnectReason.loggedOut
          || statusCode === DisconnectReason.forbidden) {
        console.log(`[SESSIONS] 🚪 Déconnexion définitive (${statusCode}): ${id}`);
        sessions.delete(id);
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
        return;
      }

      // Pour TOUS les autres cas (y compris le restart après scan QR = code 515)
      // → reconnect avec les credentials existants (le scan a créé les creds)
      sessionData.status = 'reconnecting';
      console.log(`[SESSIONS] 🔄 Reconnexion après close (code=${statusCode}): ${id}`);
      setTimeout(() => createSession(id, clientInfo), 3000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sessionData;
}

/**
 * Demande un code d'appairage (pairing code) pour un client.
 * Alternative au QR code : l'utilisateur entre ce code dans WhatsApp.
 */
async function requestPairingCode(clientId, phoneNumber) {
  const id = clientId.toUpperCase();
  const session = sessions.get(id);
  if (!session || !session.sock) {
    throw new Error('Session non trouvée. Créez d\'abord la session.');
  }
  if (session.status === 'connected') {
    return { alreadyConnected: true, phoneNumber: session.phoneNumber };
  }

  // Nettoyer le numéro (garder uniquement les chiffres)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (cleanPhone.length < 8) {
    throw new Error('Numéro de téléphone invalide');
  }

  try {
    // Attendre que le socket soit prêt (initializing → qr_ready ou au moins ws ouvert)
    let retries = 0;
    const maxRetries = 20; // max 10 secondes
    while (session.status === 'initializing' && retries < maxRetries) {
      await new Promise(r => setTimeout(r, 500));
      retries++;
    }
    console.log(`[SESSIONS] 🔢 [${id}] Requesting pairing code (status=${session.status}, retries=${retries}, phone=${cleanPhone})`);

    if (!session.sock.ws || session.sock.ws.readyState !== 1) {
      // WebSocket pas encore ouvert, attendre encore
      let wsRetries = 0;
      while ((!session.sock.ws || session.sock.ws.readyState !== 1) && wsRetries < 10) {
        await new Promise(r => setTimeout(r, 1000));
        wsRetries++;
      }
      if (!session.sock.ws || session.sock.ws.readyState !== 1) {
        throw new Error('WebSocket non connecté. Réessayez dans quelques secondes.');
      }
    }

    const code = await session.sock.requestPairingCode(cleanPhone);
    session.pairingCode = code;
    session.status = 'pairing_code';
    console.log(`[SESSIONS] ✅ Pairing code pour ${id}: ${code}`);
    return { code, phoneNumber: cleanPhone };
  } catch (e) {
    console.error(`[SESSIONS] ❌ Erreur pairing code ${id}:`, e.message);
    throw new Error('Impossible de générer le code: ' + e.message);
  }
}

/**
 * Retourne la session en mémoire (sans en créer une).
 */
function getSession(clientId) {
  return sessions.get(clientId.toUpperCase()) || null;
}

/**
 * Supprime une session de la mémoire.
 */
function removeSession(clientId) {
  sessions.delete(clientId.toUpperCase());
}

/**
 * Liste toutes les sessions (actives en RAM + persistées sur disque).
 */
function listSessions() {
  const result = [];
  const seen = new Set();

  // 1. Sessions actives en mémoire
  for (const [id, s] of sessions.entries()) {
    seen.add(id);
    result.push({
      clientId: id,
      status: s.status,
      plan: s.plan,
      name: s.name,
      phoneNumber: s.phoneNumber,
      createdAt: s.createdAt,
      connectedAt: s.connectedAt
    });
  }

  // 2. Sessions persistées sur disque (pas actives en RAM)
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      const dirs = fs.readdirSync(SESSIONS_DIR);
      for (const clientId of dirs) {
        if (seen.has(clientId.toUpperCase())) continue;
        const dir = path.join(SESSIONS_DIR, clientId);
        if (!fs.statSync(dir).isDirectory()) continue;
        if (!fs.existsSync(path.join(dir, 'creds.json'))) continue;
        // Chercher les infos dans pending_payments
        const info = verifyClient(clientId);
        result.push({
          clientId: clientId.toUpperCase(),
          status: 'disconnected',
          plan: info.plan || 'OR',
          name: info.name || clientId,
          phoneNumber: info.phone || null,
          createdAt: null,
          connectedAt: null
        });
      }
    }
  } catch (e) {
    console.error('[SESSIONS] Erreur lecture disque:', e.message);
  }

  return result;
}

/**
 * Recharge les sessions persistées sur disque au démarrage.
 */
async function restorePersistedSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR);
  let restored = 0;
  for (const clientId of dirs) {
    const dir = path.join(SESSIONS_DIR, clientId);
    if (!fs.statSync(dir).isDirectory()) continue;
    const credsFile = path.join(dir, 'creds.json');
    if (!fs.existsSync(credsFile)) continue;
    try {
      const clientInfo = verifyClient(clientId);
      await createSession(clientId, clientInfo.valid ? clientInfo : { plan: 'OR' });
      restored++;
    } catch (e) {
      console.error(`[SESSIONS] Erreur restauration ${clientId}:`, e.message);
    }
  }
  if (restored > 0) console.log(`[SESSIONS] ♻️ ${restored} session(s) restaurée(s)`);
}

module.exports = {
  verifyClient,
  createSession,
  getSession,
  removeSession,
  requestPairingCode,
  listSessions,
  restorePersistedSessions
};
