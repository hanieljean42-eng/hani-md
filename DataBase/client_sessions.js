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
  makeCacheableSignalKeyStore
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
    return {
      valid: true,
      plan: pendingEntry.plan || 'OR',
      name: pendingEntry.name || 'Client',
      phone: pendingEntry.phone || null,
      status: pendingEntry.status || 'pending',
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
async function createSession(clientId, clientInfo) {
  const id = clientId.toUpperCase();

  // Si session déjà active en mémoire
  if (sessions.has(id)) {
    const existing = sessions.get(id);
    if (existing.status === 'connected') return existing;
    if (existing.status === 'qr_ready')  return existing;
  }

  const sessionDir = path.join(SESSIONS_DIR, id);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers.macOS('Safari'),
    printQRInTerminal: false,
    logger,
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  const sessionData = {
    sock,
    qr: null,
    status: 'initializing',
    phoneNumber: null,
    plan: clientInfo?.plan || 'OR',
    name: clientInfo?.name || 'Client',
    createdAt: new Date().toISOString(),
    connectedAt: null
  };

  sessions.set(id, sessionData);

  // ── Événements de connexion ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        sessionData.qr     = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
        sessionData.status = 'qr_ready';
        console.log(`[SESSIONS] QR prêt pour client: ${id}`);
      } catch (e) {
        console.error('[SESSIONS] Erreur génération QR:', e.message);
      }
    }

    if (connection === 'open') {
      sessionData.status      = 'connected';
      sessionData.qr          = null;
      sessionData.phoneNumber = sock.user?.id?.split(':')[0] || null;
      sessionData.connectedAt = new Date().toISOString();
      console.log(`[SESSIONS] ✅ Client connecté: ${id} → ${sessionData.phoneNumber}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log(`[SESSIONS] 🚪 Client déconnecté (logout): ${id}`);
        sessions.delete(id);
        // Supprimer les fichiers de session
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
      } else {
        sessionData.status = 'reconnecting';
        console.log(`[SESSIONS] 🔄 Reconnexion pour: ${id}`);
        // Relancer après délai
        setTimeout(() => createSession(id, clientInfo), 5000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sessionData;
}

/**
 * Retourne la session en mémoire (sans en créer une).
 */
function getSession(clientId) {
  return sessions.get(clientId.toUpperCase()) || null;
}

/**
 * Liste toutes les sessions actives.
 */
function listSessions() {
  const result = [];
  for (const [id, s] of sessions.entries()) {
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
  listSessions,
  restorePersistedSessions
};
